// Card balance sweep (analysis only). Run: node scripts/balance/simulate.mjs
// Uses the real engine (previewCardRow) and the Deck screen's own Trigger table (ui/chain-model.mjs).
// Writes outputs/balance/cards.json and outputs/balance/cards.md. Changes nothing in the game.
import {writeFileSync, mkdirSync} from 'node:fs';
import {LIVE_CARDS as RELEASED_CARDS, SKILL_CARDS, getCardRowRule, makeSkillCard, previewCardRow, hasCardRowEvent} from '../../dist/skill-cards.mjs';
import {TRIGGERS, solveTrigger, START_FLAME, METER_MAX, shortName} from '../../dist/ui/chain-model.mjs';

// Engine mode (v1.0-engine): a clock, engine Chains of 3 to 5 cards, Sparks per 10 s -> outputs/balance/engines.md.
if (process.argv.includes('--engine')) { await import('./engine-sweep.mjs'); process.exit(0); }

// ---------------------------------------------------------------- firing model
// One flight = 30 seconds. Each Trigger fires a fixed number of times per flight (assumption, not measured).
// The events below are a fixed, repeating schedule: they vary the pickup kind, meter level and Collector state so
// conditional cards (Cluster, Cache, Dusk, "meter 1/3 or less", reeling) get a fair, plain share of firings.
// Limited-Use cards run down across the flight exactly as in the engine (Uses carry from one firing to the next).
const L = .2, H = .75; // meter fraction: low (<= 1/3) or high
const e = (o = {}) => ({pickupKind: 'light', meterFraction: H, availableRecovery: 0, availableReel: 0, ...o});
const SCHEDULE = {
  'body-spark': [ // Collect: 10 per flight. 6 plain Sparks, 2 Clusters, 1 Cache, 1 Dusk Spark; meter low 3 of 10
    e({meterFraction: L, availableRecovery: 6}), e(), e({collectorReeling: true, availableReel: 8, availableRecovery: 8}), e({availableRecovery: 6}),
    e({meterFraction: L}), e({guardRecovering: true, availableRecovery: 8}), e({pickupKind: 'cluster'}),
    e({pickupKind: 'cluster', collectorReeling: true, availableReel: 8, availableRecovery: 8}), e({pickupKind: 'cache'}),
    e({pickupKind: 'dusk', meterFraction: L})],
  'collector-delivery': [e(), e({pickupKind: 'cache'}), e(), e()], // Delivery: 4 per flight, 1 a Cache
  'collector-attach': [e({availableReel: 8, availableRecovery: 8, collectorReeling: true}), e({availableReel: 8, availableRecovery: 8, collectorReeling: true, pickupKind: 'cluster'}), e({availableReel: 8, availableRecovery: 8, collectorReeling: true})], // Latch: 3, 1 a Cluster
  'wave-crossing': [e({firstCrossing: true}), e({firstCrossing: false}), e({firstCrossing: false}), e({firstCrossing: true}), e({firstCrossing: false}), e({firstCrossing: false})], // Pulse: 6, 2 first Sparks
  'flash-pickup': [e({meterFraction: L, availableRecovery: 6}), e({availableRecovery: 6}), e({availableRecovery: 6})], // Flash: 3
  'flash-expiry': [e(), e(), e()], // Flash ends: 3
  'downbeat-lift': Array.from({length: 8}, (_, i) => e({direction: 'down', availableRecovery: i % 2 ? 6 : 0})), // Falling Lift: 8
  'natural-overfill': [e({availableRecovery: 6}), e({availableRecovery: 6})], // Overfill: 2
  'rhythm-phrase': Array.from({length: 4}, () => e({availableRecovery: 6})), // Rhythm: 4
  'guard-rescue': [e({meterFraction: L, availableRecovery: 6})], // Save: 1
  'flight-clear': [e()], // Clear: 1
};
const TRIG = TRIGGERS.filter(t => SCHEDULE[t.kind]).map(t => ({kind: t.kind, name: t.name, firings: SCHEDULE[t.kind].length}));
const noListeners = TRIGGERS.filter(t => !SCHEDULE[t.kind]).map(t => t.name);

// ---------------------------------------------------------------- card classes
const probe = id => makeSkillCard(id, 'x');
const ruleOf = c => getCardRowRule(c, probe(c.id)) || null;
function groupOf(c) {
  const op = ruleOf(c)?.operation;
  if (['add-sparks', 'add-last-payout', 'multiply'].includes(op) || ['echo', 'chameleon', 'refrain'].includes(c.kind)) return 'sparks';
  if (['shorten-recovery', 'shorten-reel'].includes(op)) return 'time';
  if (['add-future-capacity', 'add-cruising-speed', 'add-stored', 'carried-interest'].includes(op)) return 'permanent';
  return 'other'; // always-on, Rest, Luminance, hearts, Collector range, slots...
}
// --include-unreleased adds the unreleased cards to the pool and writes cards-unreleased.json / .md instead, so the default output is untouched.
const INCLUDE_UNRELEASED = process.argv.includes('--include-unreleased'), OUT_SUFFIX = INCLUDE_UNRELEASED ? '-unreleased' : '';
const LIVE_CARDS = INCLUDE_UNRELEASED ? Object.values(SKILL_CARDS).filter(d => !d.retired) : RELEASED_CARDS;
const RARITY = {common: 0, rare: 1, legendary: 2};
const cards = LIVE_CARDS.map(c => ({
  id: c.id, name: shortName({cardId: c.id}), rarity: c.rarity, group: groupOf(c), op: ruleOf(c)?.operation || null,
  event: ruleOf(c)?.event || null, uses: c.charges || null, evolvesTo: c.evolvesTo || null,
  text: (c.ruleBands || []).map(b => b.text).filter(Boolean).join(' | '),
}));
{const dup = new Set(cards.filter((c, i) => cards.some((x, j) => j !== i && x.name === c.name)).map(c => c.id));for (const c of cards) if (dup.has(c.id)) c.name += ` (${c.rarity})`;}
const byId = Object.fromEntries(cards.map(c => [c.id, c]));
const sparkPool = cards.filter(c => c.group === 'sparks');
const isEnabler = c => ['echo', 'chameleon', 'refrain'].includes(LIVE_CARDS.find(x => x.id === c.id).kind);
const isAnyTrigger = c => c.event === '*' || isEnabler(c);
const relevantTo = (c, T) => c.event === T || isAnyTrigger(c);

// ---------------------------------------------------------------- one flight of one chain
const cache = new Map();
function flight(ids, T) {
  const key = ids.join('>') + '@' + T;
  if (cache.has(key)) return cache.get(key);
  let row = ids.map((id, i) => makeSkillCard(id, `c${i}`));
  const tot = {raw: 0, sparks: 0, seconds: 0, stored: 0, perm: 0, maxFiring: 0};
  for (const ev of SCHEDULE[T]) {
    const listens = hasCardRowEvent(row, T);
    const r = previewCardRow({cards: row}, listens ? {kind: T, ...ev} : {kind: T, ...ev, eligible: false});
    tot.sparks += Math.min(r.sparks, 100); tot.raw += r.sparks; tot.seconds += r.recoverySeconds + r.reelSeconds; tot.stored += r.stored;
    tot.perm += r.futureCapacity + r.cruisingSpeed; tot.maxFiring = Math.max(tot.maxFiring, r.sparks);
    row = row.map(c => c.charges != null ? {...c, charges: r.charges[c.instanceId] ?? c.charges} : c);
  }
  tot.seconds = Math.round(tot.seconds * 100) / 100;
  cache.set(key, tot);
  return tot;
}
// Ranking value: Sparks per flight with each firing capped at the Spark Meter's 100, plus a tiny raw tie-break.
const val = (ids, T) => {const f = flight(ids, T);return f.sparks + f.raw / 1e6;};

// Sanity check against the Deck screen's own evaluator: same first firing, plain event.
let checkOk = 0, checkN = 0;
{
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (const t of TRIG) {
    const pool = sparkPool.filter(c => relevantTo(c, t.kind));
    if (pool.length < 3) continue;
    for (let i = 0; i < 40; i++) {
      const ids = []; while (ids.length < 3) {const c = pool[Math.floor(rnd() * pool.length)].id; if (!ids.includes(c)) ids.push(c);}
      const row = ids.map((id, k) => makeSkillCard(id, `v${k}`));
      const mine = hasCardRowEvent(row, t.kind)
        ? previewCardRow({cards: row}, {kind: t.kind, pickupKind: 'light', meterFraction: START_FLAME / METER_MAX}).sparks : 0;
      checkN++; if (mine === solveTrigger(row, t.kind).sparks) checkOk++;
    }
  }
}

// ---------------------------------------------------------------- per Trigger sweep (exhaustive pairs and triples, distinct cards)
const out = Object.fromEntries(cards.map(c => [c.id, {
  ...c, solo: {}, bestPair: null, bestTriple: null, bestFlight: 0, topShare: {}, rankInRarity: {}, avgSlot: {}, dominatedBy: {}, dominatedOn: [], rolesOn: [], lift: {},
}]));
const topChains = []; // {T, ids, value, ...}
const perTrigger = {};
for (const t of TRIG) {
  const T = t.kind;
  const pool = sparkPool.filter(c => relevantTo(c, T));
  const adders = pool.filter(c => c.event === T || (c.event === '*' && c.op !== 'multiply'));
  const isAdder = c => c.event === T && c.op === 'add-sparks';
  const info = {name: t.name, firings: t.firings, pool: pool.map(c => c.id), listeners: pool.filter(c => c.event === T).map(c => c.id), chains3: 0};
  perTrigger[t.name] = info;
  if (!pool.some(isAdder)) {info.note = 'no card adds Sparks on this Trigger';continue;}
  const ids = pool.map(c => c.id);
  const V = new Map(); // chain key -> value
  const record = (chain) => {const v = val(chain, T);V.set(chain.join('>'), v);return v;};
  const triples = [];
  for (const a of ids) for (const b of ids) {
    if (b === a) continue;
    const vp = record([a, b]);
    for (const c of [a, b]) {const o = out[c]; if (!o.bestPair || vp > o.bestPair.value) o.bestPair = {value: vp, trigger: t.name, chain: [a, b]};}
    for (const c of ids) {
      if (c === a || c === b) continue;
      const ch = [a, b, c], v = record(ch);
      triples.push({ch, v});
      for (const x of ch) {const o = out[x]; if (!o.bestTriple || v > o.bestTriple.value) o.bestTriple = {value: v, trigger: t.name, chain: ch};}
    }
  }
  info.chains3 = triples.length;
  // top 5% of triples
  const sorted = triples.map(x => x.v).sort((x, y) => y - x);
  const cut = sorted[Math.max(0, Math.ceil(sorted.length * .05) - 1)];
  const top = triples.filter(x => x.v >= cut && x.v > 0);
  info.top5Threshold = Math.round(cut); info.top5Count = top.length;
  for (const c of ids) {out[c].topShare[t.name] = top.length ? top.filter(x => x.ch.includes(c)).length / top.length : 0;out[c].lift[t.name] = Math.round(out[c].topShare[t.name] / (3 / ids.length) * 100) / 100;}
  triples.sort((x, y) => y.v - x.v).slice(0, 25).forEach(x => topChains.push({T, trigger: t.name, ids: x.ch, ...flight(x.ch, T)}));
  // holes: card h placed in position p of a background of 1 or 2 other cards
  const holes = Object.fromEntries(ids.map(id => [id, new Map()]));
  const adds = new Set(ids.filter(id => isAdder(byId[id])));
  for (const x of ids) {
    if (adds.has(x)) for (const h of ids) if (h !== x) for (const p of [0, 1]) {const ch = p ? [x, h] : [h, x];holes[h].set(`${x}|${p}`, V.get(ch.join('>')));}
    for (const y of ids) if (y !== x && (adds.has(x) || adds.has(y))) for (const h of ids) if (h !== x && h !== y) for (const p of [0, 1, 2]) {
      const ch = p === 0 ? [h, x, y] : p === 1 ? [x, h, y] : [x, y, h];
      holes[h].set(`${x}|${y}|${p}`, V.get(ch.join('>')));
    }
  }
  const avg = Object.fromEntries(ids.map(id => {const v = [...holes[id].values()];return [id, v.reduce((s, n) => s + n, 0) / (v.length || 1)];}));
  for (const c of ids) {out[c].avgSlot[t.name] = avg[c]; out[c].rolesOn.push(t.name);}
  for (const r of Object.keys(RARITY)) {
    const grp = ids.filter(id => byId[id].rarity === r);
    for (const c of grp) out[c].rankInRarity[t.name] = grp.length > 1 ? grp.filter(o => avg[o] < avg[c]).length / (grp.length - 1) : 1;
  }
  // dominance: B (same or lower rarity) is never worse in any background and better in at least one
  for (const A of ids) {
    for (const B of ids) {
      if (A === B || RARITY[byId[B].rarity] > RARITY[byId[A].rarity]) continue;
      let ge = true, gt = false, n = 0;
      for (const [k, va] of holes[A]) {
        const vb = holes[B].get(k); if (vb === undefined) continue;
        n++; if (vb < va) {ge = false;break;} if (vb > va) gt = true;
      }
      if (ge && gt && n > 20) (out[A].dominatedBy[t.name] ||= []).push(B);
    }
  }
}
for (const c of Object.values(out)) c.dominatedOn = Object.keys(c.dominatedBy);

for (const o of Object.values(out)) {if (o.bestPair) o.bestPair.value = Math.round(o.bestPair.value);if (o.bestTriple) o.bestTriple.value = Math.round(o.bestTriple.value);for (const k in o.avgSlot) o.avgSlot[k] = Math.round(o.avgSlot[k] * 10) / 10;}
// ---------------------------------------------------------------- solo values for every card (all groups)
for (const c of cards) {
  const T = c.event && c.event !== '*' ? c.event : null;
  if (T && SCHEDULE[T]) {const f = flight([c.id], T);const name = TRIG.find(x => x.kind === T).name;out[c.id].solo[name] = {sparks: f.sparks, seconds: f.seconds, stored: f.stored, permanent: f.perm};}
}
for (const c of sparkPool) {
  const o = out[c.id];
  let best = 0;
  for (const x of [...Object.values(o.solo).map(s => s.sparks), o.bestPair?.value || 0, o.bestTriple?.value || 0]) best = Math.max(best, x);
  o.bestFlight = best; o.maxTopShare = Math.max(0, ...Object.values(o.topShare));
}

// ---------------------------------------------------------------- longer Chains: beam search to 5 slots (the Deck allows 5)
function beam(T, allowDup) {
  const pool = sparkPool.filter(c => relevantTo(c, T)).map(c => c.id);
  let level = topChains.filter(x => x.T === T).slice(0, 25).map(x => x.ids);
  let best = level.map(ch => ({ch, v: val(ch, T)}));
  for (let len = 4; len <= 5; len++) {
    const next = new Map();
    for (const ch of level) for (const c of pool) {
      if (!allowDup && ch.includes(c)) continue;
      for (let p = 0; p <= ch.length; p++) {const n = [...ch.slice(0, p), c, ...ch.slice(p)];next.set(n.join('>'), n);}
    }
    best = [...next.values()].map(ch => ({ch, v: val(ch, T)})).sort((a, b) => b.v - a.v);
    level = best.slice(0, 25).map(x => x.ch);
  }
  return best.slice(0, 5).map(x => ({T, trigger: TRIG.find(t => t.kind === T).name, ids: x.ch, ...flight(x.ch, T), dup: allowDup}));
}
const longChains = [], longDup = [];
for (const t of TRIG) {
  if (!perTrigger[t.name].listeners.some(id => byId[id].op === 'add-sparks')) continue;
  longChains.push(...beam(t.kind, false)); longDup.push(...beam(t.kind, true));
}
const describe = ch => ch.map(id => byId[id].name).join(' > ');
const rankChains = list => {
  const seen = new Set(), res = [];
  for (const x of [...list].sort((a, b) => b.sparks - a.sparks)) {const k = x.trigger + [...x.ids].sort().join();if (seen.has(k)) continue;seen.add(k);res.push(x);}
  return res;
};
const top10 = rankChains(longChains).slice(0, 10);
const top10dup = rankChains(longDup.filter(x => new Set(x.ids).size < x.ids.length)).slice(0, 5);
const best3 = rankChains(topChains).slice(0, 10);
const allBestByTrigger = TRIG.map(t => {const x = rankChains(longChains.filter(c => c.T === t.kind))[0];return x && {trigger: t.name, chain: describe(x.ids), sparks: x.sparks, firings: t.firings, largestFiring: x.maxFiring, saturated: x.sparks === t.firings * 100};}).filter(Boolean);

// ---------------------------------------------------------------- classification (thresholds are simple and stated)
// lift = a card's share of the top-5% 3-card Chains divided by the share it would have by chance (3 / cards that can act).
// Weak: lift under 0.8 on every Trigger it can use, AND (dominated on at least half of the Triggers it can use, OR in
//   the lower half of its own rarity on every Trigger it can use).
// Watch: dominated on at least half of its Triggers but not weak.
// Strong everywhere: it can act on 4 or more Triggers with Spark payoff, and it sits in at least 1 of the 5 best 5-slot
//   Chains on at least 75% of them.
const weak = [], strong = [], watch = [], bestTop5 = {};
for (const t of TRIG) {
  const list = rankChains(longChains.filter(c => c.T === t.kind).map(c => ({...c, trigger: t.name}))).slice(0, 5);
  for (const c of cards) bestTop5[c.id + '@' + t.name] = list.filter(x => x.ids.includes(c.id)).length;
}
for (const c of sparkPool) {
  const o = out[c.id], roles = o.rolesOn.length;
  o.dominatedEverywhere = roles > 0 && o.dominatedOn.length === roles;
  const lowEverywhere = roles > 0 && Object.values(o.rankInRarity).every(r => r < .5);
  o.maxLift = Math.max(0, ...Object.values(o.lift || {}));
  o.inBest5 = Object.fromEntries(o.rolesOn.map(n => [n, bestTop5[c.id + '@' + n]]));
  const domHalf = roles > 0 && o.dominatedOn.length * 2 >= roles;
  if (roles > 0 && o.maxLift < .8 && (domHalf || lowEverywhere)) weak.push(c.id);
  else if (domHalf) watch.push(c.id);
  if (roles >= 4 && Object.values(o.inBest5).filter(n => n >= 1).length / roles >= .75) strong.push(c.id);
  o.weak = weak.includes(c.id); o.strongEverywhere = strong.includes(c.id);
}
// Best in their own Trigger: share of the top 5% at least 80%, on a Trigger they listen to by name.
const bestInOwn = sparkPool.filter(c => c.event !== '*' && out[c.id].topShare[TRIG.find(t => t.kind === c.event)?.name] >= .8).map(c => c.id);

// ---------------------------------------------------------------- archetypes by Trigger
const arche = TRIG.map(t => {
  const T = t.kind;
  const own = cards.filter(c => c.event === T);
  return {
    trigger: t.name, firings: t.firings,
    adders: own.filter(c => c.op === 'add-sparks').map(c => c.name),
    boosts: own.filter(c => c.op === 'multiply').map(c => c.name),
    time: own.filter(c => c.group === 'time').map(c => c.name),
    cards: own.length,
  };
});
const anyCards = cards.filter(c => isAnyTrigger(c)).map(c => c.name);

// ---------------------------------------------------------------- write
mkdirSync(new URL('../../outputs/balance/', import.meta.url), {recursive: true});
const summary = {
  model: {flight: '30 seconds', firings: Object.fromEntries(TRIG.map(t => [t.name, t.firings])), noListeners, sparkValuesPerFlight: true,
    engineCheck: `${checkOk}/${checkN} first-firing totals equal the Deck screen's solveTrigger`},
  counts: {live: cards.length, sparks: sparkPool.length, time: cards.filter(c => c.group === 'time').length, permanent: cards.filter(c => c.group === 'permanent').length,
    other: cards.filter(c => c.group === 'other').length, weak: weak.length, watch: watch.length, strong: strong.length, bestInOwn: bestInOwn.length},
  weak, watch, strong, bestInOwn, perTrigger, archetypes: arche, anyCards,
  top10Chains5Slots: top10.map(x => ({...x, names: describe(x.ids)})),
  top5WithRepeatedCards: top10dup.map(x => ({...x, names: describe(x.ids)})),
  top10Chains3Slots: best3.map(x => ({...x, names: describe(x.ids)})),
  bestPerTrigger5Slots: allBestByTrigger,
};
writeFileSync(new URL('../../outputs/balance/cards'+OUT_SUFFIX+'.json', import.meta.url), JSON.stringify({summary, cards: out}, null, 1));

const f1 = n => (Math.round(n * 10) / 10).toString();
let md = `# Card balance sweep\n\nGenerated by scripts/balance/simulate.mjs. Engine check: ${summary.model.engineCheck}.\n\n## Firing model (assumption)\n\n`;
md += `One flight is 30 seconds. Firings per flight: ${TRIG.map(t => `${t.name} ${t.firings}`).join(', ')}. No card listens to: ${noListeners.join(', ')}.\n`;
md += `Each firing uses a fixed repeating mix of pickups (Collect: 6 plain Sparks, 2 Clusters, 1 Cache, 1 Dusk Spark; meter low on 3 of 10), so conditional cards get a plain share. Limited-Use cards run down across the flight like the engine. Chains hold distinct cards, rank 1, all pairs and all ordered triples of cards that can act on the Trigger. Values are Sparks per flight (each firing rounded down) with every firing capped at 100, the Spark Meter's size; a chain that reaches 100 on every firing is marked saturated.\n\n`;
md += `## Sparks cards (${sparkPool.length})\n\n| Card | Rarity | Solo/flight | Best pair | Best triple | Top 5% share (best Trigger) | Dominated on | Flags |\n|---|---|---|---|---|---|---|---|\n`;
for (const c of [...sparkPool].sort((a, b) => out[b.id].bestFlight - out[a.id].bestFlight)) {
  const o = out[c.id];
  const solo = Object.entries(o.solo).map(([k, s]) => `${s.sparks} ${k}`).join('; ') || '0 (needs partner)';
  const share = Object.entries(o.topShare).sort((a, b) => b[1] - a[1])[0];
  const lift = o.maxLift?.toFixed(1);
  md += `| ${o.name} | ${o.rarity} | ${solo} | ${o.bestPair ? `${o.bestPair.value} (${o.bestPair.trigger})` : '-'} | ${o.bestTriple ? `${o.bestTriple.value} (${o.bestTriple.trigger})` : '-'} | ${share ? `${Math.round(share[1] * 100)}% ${share[0]} (lift ${lift})` : '-'} | ${o.dominatedOn.length}/${o.rolesOn.length} | ${[o.weak && 'WEAK', watch.includes(c.id) && 'watch', o.strongEverywhere && 'STRONG'].filter(Boolean).join(' ')} |\n`;
}
md += `\n## Other cards (not comparable in Sparks)\n\n| Card | Rarity | Group | What it does | Solo per flight |\n|---|---|---|---|---|\n`;
for (const c of cards.filter(c => c.group !== 'sparks')) {
  const s = Object.entries(out[c.id].solo).map(([k, v]) => `${v.seconds ? v.seconds + ' s saved' : ''}${v.stored ? v.stored + ' Stored' : ''}${v.permanent ? '+' + v.permanent + ' permanent' : ''} (${k})`).join('; ');
  md += `| ${c.name} | ${c.rarity} | ${c.group} | ${c.text.replace(/\|/g, '/')} | ${s || 'always on or at Rest'} |\n`;
}
md += `\n## Strongest Chains found (up to 5 slots, distinct cards)\n\n`;
top10.forEach((x, i) => {md += `${i + 1}. ${x.trigger}: ${describe(x.ids)} = ${x.sparks} Sparks per flight (largest single firing ${x.maxFiring})\n`;});
md += `\n## Strongest Chains with repeated copies of a card\n\n`;
top10dup.forEach((x, i) => {md += `${i + 1}. ${x.trigger}: ${describe(x.ids)} = ${x.sparks} Sparks per flight (largest single firing ${x.maxFiring})\n`;});
md += `\n## Best 3-card Chains\n\n`;
best3.forEach((x, i) => {md += `${i + 1}. ${x.trigger}: ${describe(x.ids)} = ${x.sparks}\n`;});
md += `\n## Best Chain per Trigger (5 slots)\n\n`;
allBestByTrigger.forEach(x => {md += `- ${x.trigger}: ${x.chain} = ${x.sparks} of ${x.firings * 100} possible${x.saturated ? ' (SATURATED: the meter is full on every firing)' : ''}, largest firing ${x.largestFiring}\n`;});
md += `\n## Watch list (${watch.length})

${watch.map(id => byId[id].name).join(', ')}

## Weak (${weak.length})\n\n${weak.map(id => byId[id].name).join(', ')}\n\n## Strong everywhere (${strong.length})\n\n${strong.map(id => byId[id].name).join(', ')}\n`;
md += `\n## Why the weak and watch cards lose (who beats them)\n\n`;
for (const id of [...weak, ...watch]) {const o = out[id];md += `- ${o.name} (${o.rarity}${o.evolvesTo ? ', upgrades to ' + byId[o.evolvesTo]?.name : ''}): can act on ${o.rolesOn.length} Triggers; best lift ${o.maxLift}; dominated on ${o.dominatedOn.length}: ${o.dominatedOn.map(k => k + ' by ' + o.dominatedBy[k].map(b => byId[b].name).join('/')).join('; ') || 'none'}; best 3-card ${o.bestTriple?.value} on ${o.bestTriple?.trigger}\n`;}
md += `\n## Best in their own Trigger (share of top 5% at least 80%)\n\n${bestInOwn.map(id => byId[id].name).join(', ')}\n`;
md += `\n## Archetypes by Trigger (cards that name the Trigger)\n\n`;
for (const a of arche) md += `- ${a.trigger} (${a.firings}/flight): adds Sparks: ${a.adders.join(', ') || 'none'}; Boosts: ${a.boosts.join(', ') || 'none'}; Collector time: ${a.time.join(', ') || 'none'}\n`;
md += `- Work on any Trigger: ${anyCards.join(', ')}\n`;
md += `- Triggers with no card that adds Sparks: ${Object.entries(perTrigger).filter(([, v]) => v.note).map(([k]) => k).join(', ')}; no card listens at all: ${noListeners.join(', ')}\n`;
writeFileSync(new URL('../../outputs/balance/cards'+OUT_SUFFIX+'.md', import.meta.url), md);

console.log(JSON.stringify({counts: summary.counts, model: summary.model, weak: weak.map(i => byId[i].name), watch: watch.map(i => byId[i].name), bestInOwn: bestInOwn.map(i => byId[i].name), strong: strong.map(i => byId[i].name)}, null, 1));
console.log('PER TRIGGER'); for (const [k, v] of Object.entries(perTrigger)) console.log(k, v.firings, 'pool', v.pool.length, 'triples', v.chains3, 'top5 cut', v.top5Threshold, v.note || '');
console.log('TOP10 5-slot'); top10.forEach(x => console.log(x.trigger, describe(x.ids), x.sparks, x.maxFiring));
console.log('TOP dup'); top10dup.forEach(x => console.log(x.trigger, describe(x.ids), x.sparks, x.maxFiring));
console.log('BEST3'); best3.forEach(x => console.log(x.trigger, describe(x.ids), x.sparks));
console.log('BEST per trigger'); allBestByTrigger.forEach(x => console.log(x.trigger, x.chain, x.sparks));

if (process.env.DEBUG_TABLE) for (const c of sparkPool) {const o = out[c.id];console.log(c.id.padEnd(18), c.rarity.slice(0,3), o.weak?'WEAK':'', o.strongEverywhere?'STRONG':'', 'best', String(o.bestFlight).padStart(5), 'top%', Object.entries(o.topShare).map(([k,v])=>k.slice(0,4)+Math.round(v*100)).join(' '), 'rank', Object.entries(o.rankInRarity).map(([k,v])=>k.slice(0,4)+Math.round(v*100)).join(' '), 'dom', o.dominatedOn.map(k=>k.slice(0,4)+':'+o.dominatedBy[k].slice(0,2).join('/')).join(' '));}
