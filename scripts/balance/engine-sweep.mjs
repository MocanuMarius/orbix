// Engine sweep (analysis only, Phase 1 of v1.0-engine). Run: node scripts/balance/simulate.mjs --engine
// Uses the game's own engine rules (dist/card-engine.mjs) on a clock. Writes outputs/balance/engines.md and
// outputs/balance/engines.json. Changes nothing in the game and does not rebalance anything.
import {writeFileSync, mkdirSync} from 'node:fs';
import {SKILL_CARDS, LIVE_CARDS, makeSkillCard, getCardRowRule} from '../../dist/skill-cards.mjs';
import {simulateEngineChain, engineMetrics, findEngineLoop} from '../../dist/card-engine.mjs';

// ---------------------------------------------------------------- flight model (assumptions, stated in the report)
const HORIZON = 60;           // seconds of flight
const METER = {start: 15, max: 30}; // printed Sparks: the base meter of 30, half full
const BURN = 1;               // Sparks per second spent on Lift (ruling 6 stands in for flying)
const FUEL = 6;               // a natural Spark's fuel in printed Sparks (20 internal units)
function schedule(seed) {
  let s = seed >>> 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const events = [];
  for (let t = 3; t < HORIZON; t += 5 + rnd() * 2) events.push({t: Math.round(t * 100) / 100, kind: 'pickup', detail: {fuel: FUEL}}); // ~10 Spark pickups
  for (let t = 9; t < HORIZON; t += 12 + rnd() * 6) events.push({t: Math.round(t * 100) / 100, kind: 'skim'});                       // ~4 skims
  for (let t = 1; t < HORIZON; t += 1) events.push({t: t + .5, kind: 'lift', detail: {meterFraction: null}});                        // a Lift a second
  return events;
}
const EVENTS = schedule(20261117);
// Lifts read the live meter: fill the fraction in at run time through a tiny wrapper.
const liveEvents = () => EVENTS.map(e => e.kind === 'lift' ? {...e, detail: {}} : e);
// "Unlosable" test: only the first pickup and skim, then nothing but Lift.
const DRY = [{t: 0, kind: 'pickup', detail: {fuel: FUEL}}, {t: 0, kind: 'skim'}];

// ---------------------------------------------------------------- pools
const engineIds = Object.values(SKILL_CARDS).filter(d => d.engine).map(d => d.id);
const sparkIds = LIVE_CARDS.filter(d => {
  const r = getCardRowRule(d, makeSkillCard(d.id, 'x'));
  return ['add-sparks', 'multiply', 'add-last-payout'].includes(r?.operation) || ['echo', 'refrain'].includes(d.kind);
}).map(d => d.id);
const pool = [...engineIds, ...sparkIds];
const name = id => SKILL_CARDS[id].name;

const results = new Map();
function evaluate(ids) {
  const key = ids.join('>');
  if (results.has(key)) return results.get(key);
  const cards = ids.map((id, i) => makeSkillCard(id, `s${i}`));
  const run = simulateEngineChain(cards, {horizon: HORIZON, events: liveEvents(), meter: METER, burn: BURN, log: false});
  const dry = simulateEngineChain(cards, {horizon: HORIZON, events: DRY, meter: METER, burn: BURN, log: false});
  const dryLong = simulateEngineChain(cards, {horizon: 2 * HORIZON, events: DRY, meter: METER, burn: BURN, log: false});
  const loop = findEngineLoop(cards);
  const r = {ids, sparksPer10: run.sparks / HORIZON * 10, turnsPer10: run.turns / HORIZON * 10, stored: run.stored, turns: run.turns,
    stops: run.stops, runningAtEnd: run.running, minMeter: run.minMeter, dryEmptyAt: dry.emptyAt, dryRunning: dry.running,
    drySparksPer10: (dryLong.sparks - dry.sparks) / HORIZON * 10, dryLongEmptyAt: dryLong.emptyAt, runsOnce: loop.runsOnce};
  r.neverStops = r.turns > 0 && r.stops === 0 && r.runningAtEnd;
  // With one pickup and no more, the engine alone kept the meter above zero for 120 s and, in its second minute,
  // made at least as many Sparks as Lift spent: it pays for flying by itself.
  r.unlosable = dryLong.emptyAt === null && r.drySparksPer10 >= BURN * 10 - 1e-9;
  results.set(key, r);
  return r;
}

// Exhaustive: every ordered 3-card Chain of distinct engine cards. Sampled: Chains of 3 to 5 distinct cards from
// engine cards plus every live Spark card, at least one engine card in each (fixed seed).
for (const a of engineIds) for (const b of engineIds) for (const c of engineIds) if (a !== b && b !== c && a !== c) evaluate([a, b, c]);
// Exhaustive short Chains around the Metronome (tempo is the dial): every Chain of 1 to 3 distinct cards from the
// whole pool that holds a Metronome, in every order.
const others = pool.filter(id => id !== 'metronome');
evaluate(['metronome']);
for (const a of others) { evaluate(['metronome', a]); evaluate([a, 'metronome']); }
for (const a of others) for (const b of others) if (a !== b) { evaluate(['metronome', a, b]); evaluate([a, 'metronome', b]); evaluate([a, b, 'metronome']); }
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const SAMPLE = 40000;
for (let n = 0; n < SAMPLE; n++) {
  const len = 3 + Math.floor(rnd() * 3), ids = [];
  ids.push(engineIds[Math.floor(rnd() * engineIds.length)]);
  while (ids.length < len) { const id = pool[Math.floor(rnd() * pool.length)]; if (!ids.includes(id)) ids.push(id); }
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  evaluate(ids);
}
// Hand-built engines from the proposal, so they are always in the table.
const named = {
  'Chime loop': ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick'],
  'Chime loop + Crescendo': ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick', 'crescendo'],
  'Chime loop + Heartbeat': ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick', 'heartbeat'],
  'Overflow mill': ['close-call', 'metronome', 'body-spark', 'overflow-bell'],
  'Overflow mill + Heartbeat': ['close-call', 'metronome', 'body-spark', 'overflow-bell', 'heartbeat'],
};
const namedRows = Object.entries(named).map(([label, ids]) => ({label, ...evaluate(ids), metrics: engineMetrics(ids.map((id, i) => makeSkillCard(id, `m${i}`)))}));

const all = [...results.values()];
const top = [...all].sort((a, b) => b.sparksPer10 - a.sparksPer10 || a.ids.length - b.ids.length).slice(0, 20);
const never = all.filter(r => r.neverStops).sort((a, b) => b.sparksPer10 - a.sparksPer10);
const unlosable = all.filter(r => r.unlosable).sort((a, b) => b.drySparksPer10 - a.drySparksPer10);
const shortUnlosable = unlosable.filter(r => r.ids.length <= 3), twoUnlosable = unlosable.filter(r => r.ids.length <= 2);
const metronomeWait = SKILL_CARDS.metronome?.engine?.wait;
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const chain = r => r.ids.map(name).join(' > ');

mkdirSync(new URL('../../outputs/balance/', import.meta.url), {recursive: true});
writeFileSync(new URL('../../outputs/balance/engines.json', import.meta.url), JSON.stringify({model: {HORIZON, METER, BURN, FUEL, events: EVENTS.length, sample: SAMPLE},
  chains: all.length, top, named: namedRows, neverStops: never.slice(0, 200), unlosable: unlosable.slice(0, 200)}, null, 1));

let md = `# Engine sweep (v1.0-engine)\n\nGenerated by \`node scripts/balance/simulate.mjs --engine\` (scripts/balance/engine-sweep.mjs) with the game's own engine rules (dist/card-engine.mjs). Report only: nothing was rebalanced.\n\n`;
md += `## Model (assumptions)\n\n- One flight: ${HORIZON} s. Spark Meter ${METER.max} Sparks, starting at ${METER.start}. Lift spends ${BURN} Spark a second (applied once a second), which is what lets "stop when full" engines restart (ruling 6).\n`;
md += `- Flying (fixed seed): a natural Spark every 5 to 7 s (${FUEL} Sparks of fuel each; it fires the Chain's Collect cards and First Catch / Flash Tinder), a skim (Proximity fills) every 12 to 18 s, and a Lift every second (Low Ember reads the live meter).\n`;
md += `- "Sparks per 10 s" counts only Sparks made by cards through the engine (engine gains and Long Fuse repeats that reached the meter), not natural fuel and not ordinary Collect payouts.\n`;
md += `- Chains: every ordered 3-card Chain of distinct engine cards (${engineIds.length}×${engineIds.length - 1}×${engineIds.length - 2}), plus ${SAMPLE} sampled Chains of 3 to 5 distinct cards drawn from the ${engineIds.length} engine cards and the ${sparkIds.length} live cards that add, multiply or repeat Sparks, each with at least one engine card (fixed seed). ${all.length} distinct Chains in all. Black Hole, Homing Thread and Momentum are not in the pool.\n`;
md += `- "Never stops": the engine turned, never logged a stop and still had a Timer running at 60 s. "Trivially unlosable": with only one pickup and one skim at the start and nothing else, the meter never emptied in 120 s and the engine alone made at least ${BURN * 10} Sparks per 10 s in the second minute, so it pays for all the Lift by itself.\n\n`;
md += `## The proposal's engines\n\n| Engine | Sparks per 10 s (flight) | Turns per 10 s (flight) | Medallion: Sparks per Turn | Medallion: Turns per 10 s | Never stops | Unlosable |\n|---|---|---|---|---|---|---|\n`;
for (const r of namedRows) md += `| ${r.label} | ${f1(r.sparksPer10)} | ${f1(r.turnsPer10)} | ${r.metrics.sparksPerTurn ?? '-'} | ${r.metrics.turnsPer10s === null ? '-' : f1(r.metrics.turnsPer10s)} | ${r.neverStops ? 'yes' : 'no'} | ${r.unlosable ? 'YES' : 'no'} |\n`;
md += `\n## Top 20 Chains by engine Sparks per 10 s\n\n| # | Chain | Sparks per 10 s | Turns per 10 s | Stored kept | Never stops | Unlosable |\n|---|---|---|---|---|---|---|\n`;
top.forEach((r, i) => { md += `| ${i + 1} | ${chain(r)} | ${f1(r.sparksPer10)} | ${f1(r.turnsPer10)} | ${r.stored} | ${r.neverStops ? 'yes' : 'no'} | ${r.unlosable ? 'YES' : 'no'} |\n`; });
md += `\n## Engines that never stop (${never.length} of ${all.length})\n\n`;
md += never.length ? never.slice(0, 20).map(r => `- ${chain(r)}: ${f1(r.sparksPer10)} Sparks per 10 s, ${f1(r.turnsPer10)} Turns per 10 s`).join('\n') + (never.length > 20 ? `\n- ... ${never.length - 20} more in engines.json` : '') + '\n' : 'None.\n';
md += `\n## Trivially unlosable (${unlosable.length} of ${all.length})\n\n`;
md += unlosable.length ? unlosable.slice(0, 20).map(r => `- ${chain(r)}: ${f1(r.drySparksPer10)} engine Sparks per 10 s in the second minute with no pickups after the first`).join('\n') + (unlosable.length > 20 ? `\n- ... ${unlosable.length - 20} more in engines.json` : '') + '\n' : 'None: no Chain kept the meter above zero on its own against one Spark a second of Lift.\n';
const byCard = Object.fromEntries(engineIds.map(id => [id, top.filter(r => r.ids.includes(id)).length]));
md += `\n## Engine cards in the top 20\n\n${engineIds.map(id => `${name(id)} ${byCard[id]}`).join(', ')}\n`;
writeFileSync(new URL('../../outputs/balance/engines.md', import.meta.url), md);
console.log(`metronome ${metronomeWait} s: unlosable <=3 cards ${shortUnlosable.length}, <=2 cards ${twoUnlosable.length}`);
console.log(`engine sweep: ${all.length} chains; top ${f1(top[0]?.sparksPer10 || 0)} Sparks/10 s; never stop ${never.length}; unlosable ${unlosable.length}`);
for (const r of namedRows) console.log(r.label, f1(r.sparksPer10), f1(r.turnsPer10), JSON.stringify(r.metrics));
top.slice(0, 10).forEach((r, i) => console.log(i + 1, chain(r), f1(r.sparksPer10), r.neverStops ? 'never-stops' : '', r.unlosable ? 'UNLOSABLE' : ''));
