// Chain sweep (analysis only). Run: node scripts/balance/chain-sweep.mjs [--quick] [--only=order,pairs,runs,hidden]
// Drives the REAL card rules (dist/skill-cards.mjs resolveCardRow = the Chain walker, dist/card-engine.mjs CardEngine = the
// engine cards, dist/card-black-hole.mjs previewBlackHoleMeals) with an invented, repeatable flight script. The glue below
// copies what dist/flight.mjs does around those functions (resolveCardRowEvent, collect, Lift, tributaryDelivery,
// undertowCollect, startSecondWind, raiseFlightEngine); it re-implements NO card rule. Writes outputs/balance/chain-sweep-*.json/.md.
// Changes nothing in the game. The assumptions are printed at the top of every .md and in docs/chain-sweep.md.
import {writeFileSync, mkdirSync} from 'node:fs';
import {SKILL_CARDS, CARD_UNIT, makeSkillCard, getCardRowRule, hasCardRowEvent, resolveCardRow, createCardExecution, getCardTallies,
  getUseDoublerTarget, isInventoryOnlyCard} from '../../dist/skill-cards.mjs';
import {CardEngine, createMeterHost, hasEngineCards} from '../../dist/card-engine.mjs';
import {previewBlackHoleMeals} from '../../dist/card-black-hole.mjs';

const ARGS = process.argv.slice(2);
const QUICK = ARGS.includes('--quick');
const ONLY = (ARGS.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const OUT = new URL('../../outputs/balance/', import.meta.url);
mkdirSync(OUT, {recursive: true});
const T0 = Date.now(), lap = msg => console.error(`[${((Date.now() - T0) / 1000).toFixed(0)}s] ${msg}`);

// ================================================================ assumptions (the table printed in every report)
export const FLIGHT_SECONDS = 30;
const METER = {base: 30, cap: 100, start: 15, fuel: 6}; // printed Sparks; drain per second stands in for Lift and flying
const FLASH = {at: 8, seconds: 8, interval: 2};                      // 1 natural Flash per flight, lasts 8 s, a Pulse every 2 s = 4 Pulses
const PULSE_CROSSINGS = [1, 2];                                      // a world Pulse crosses 1 then 2 then 1... uncollected Sparks (avg 1.5)
const COLLECT_KINDS = ['light', 'light', 'cluster', 'light', 'cache', 'light', 'dusk', 'light', 'light', 'cluster', 'light', 'dusk', 'light'];
const PROFILES = {
  careful: {drain: 2.0, collects: 8, overfills: 1, lifts: 16, falling: 4, rhythm: 2, climb: 2, skims: 2, deliveries: 3, latches: 2, saves: 1, savePlay: false},
  greedy:  {drain: 2.6, collects: 13, overfills: 5, lifts: 22, falling: 4, rhythm: 1, climb: 1, skims: 1, deliveries: 4, latches: 3, saves: 1, savePlay: true},
  stylish: {drain: 2.3, collects: 9, overfills: 2, lifts: 26, falling: 11, rhythm: 4, climb: 3, skims: 6, deliveries: 3, latches: 2, saves: 1, savePlay: true},
};
const PNAMES = Object.keys(PROFILES);
// Value of one flight = Sparks asked from the Chain (each firing capped at the meter's 100) + Stored Sparks + 5 per permanent
// max Spark + 2 per second of Collector time saved + 2 per cruising-speed point. The exchange rates are assumptions so that a card
// paying in another currency is not judged dead; Sparks-only numbers are reported next to it.
const RATE = {stored: 1, perm: 5, secs: 1, speed: 2};
const CARRIED_STORED = 40;   // Stored Sparks the run carries into a Finish (Nest Egg's Carried Interest reads it)
const MAX_SLOTS = 5;

// ================================================================ catalogue
const ALL = Object.values(SKILL_CARDS).filter(d => !d.retired && !isInventoryOnlyCard({cardId: d.id}));
const LIVE = ALL.filter(d => !d.unreleased);
const HIDDEN = ALL.filter(d => d.unreleased);
const dupNames = new Set(ALL.map(d => d.name).filter((n, i, a) => a.indexOf(n) !== i));
const nm = id => { const d = SKILL_CARDS[id]; if (!d) throw new Error('unknown card ' + id); if (id === 'chameleon-two') return 'Chameleon (new)'; return d.name.replace(/ [+]\d+$/, '') + (dupNames.has(d.name) || /^(dusk-wick|harvest|echo|spillway|ring-spring|courier-tip|kindling|tight-packing|growth-seed|prism-lens|downbeat)/.test(id) ? ` [${d.rarity[0].toUpperCase()}]` : ''); };
const names = ids => ids.map(nm).join(' > ');
const kindOf = id => SKILL_CARDS[id].kind;

// Cards whose effect the harness cannot see (hearts, light, vision, Collector reach, practice, physical meter); they are never
// called "partnerless", only "not measurable". Everything else is judged on what the real rules paid in the script.
const NOT_MEASURABLE = new Set(['lift-guide', 'dream', 'lantern-lens', 'springboard', 'cache-handling', 'twin-orbit', 'twin-wick', 'long-spool', 'cast-line',
  'tailwind', 'devourer', 'ember-feeder', 'deep-vessel', 'tight-packing', 'tight-packing-ii', 'tight-packing-iii', 'slip-feather', 'edge-reach', 'double-lift',
  'wind-feather', 'glass-spool', 'fast-spool', 'mending-moss', 'return-spring', 'haul-winch', 'pacesetter', 'counterweight', 'flash-thread', 'ring-spring', 'ring-spring-ii',
  'wave-loom', 'second-wind', 'watchlight', 'rhythm', 'climb', 'spillway', 'spillway-ii', 'black-hole', 'use-doubler']);
// Enablers: they pay nothing themselves but switch an event source on in the flight (the harness models each one explicitly).
const ENABLERS = new Set(['watchlight', 'rhythm', 'climb', 'spillway', 'spillway-ii', 'slip-feather', 'edge-reach', 'use-doubler', 'black-hole', 'wave-loom', 'second-wind', 'deep-vessel']);
const EATERS = new Set(['black-hole', 'dream']); // destroy the card to their right at take-off: a pair with one in front is a meal, not a partnership
const isNotMeasurable = id => NOT_MEASURABLE.has(id) && !ENABLERS.has(id) || ['lift-guide', 'dream', 'lantern-lens', 'springboard', 'cache-handling', 'twin-orbit', 'twin-wick', 'tailwind', 'devourer', 'ember-feeder'].includes(id);

// ================================================================ one flight
const spaced = (n, from, to, phase = 0) => Array.from({length: n}, (_, i) => Math.round((from + (i + 0.5 + phase) * (to - from) / n) * 1000) / 1000);
const hasKind = (cards, k) => cards.some(c => c && SKILL_CARDS[c.cardId]?.kind === k);
const kindRank = (cards, k) => cards.reduce((m, c) => c && SKILL_CARDS[c.cardId]?.kind === k ? Math.max(m, SKILL_CARDS[c.cardId].rapidRank || 1) : m, 0);

/** cards: persistent card objects {instanceId, cardId, tally?, eaten?, eatenGrowth?} (null = empty Slot). st: {stored, perm}. */
function runFlight(cards, prof, st = {stored: 0, perm: 0}, opts = {}) {
  const P = PROFILES[prof];
  const row = cards.slice(0, MAX_SLOTS).map(c => c ? {...c, ...(SKILL_CARDS[c.cardId].charges ? {charges: SKILL_CARDS[c.cardId].charges} : {})} : null);
  const tallyStart = Object.fromEntries(row.filter(Boolean).map(c => [c.instanceId, Number(c.tally) || 0]));
  // take-off: Black Hole eats (the real rule picks the meal), Use Doubler doubles the uses of its right neighbour
  let bhGrowth = 0;
  for (const meal of previewBlackHoleMeals(row)) { const hole = row[meal.holeSlot]; row[meal.slot] = null; hole.eaten = (hole.eaten || 0) + 1; hole.eatenGrowth = (hole.eatenGrowth || 0) + meal.growth; if (SKILL_CARDS[hole.cardId].kind === 'black-hole') bhGrowth += meal.growth; }
  for (let s = 0; s < row.length; s++) {
    const src = row[s], target = getUseDoublerTarget(row, s);
    if (src?.cardId === 'use-doubler' && src.charges > 0 && target) { target.charges = target.charges * 2; src.charges--; }
  }
  const rt = createCardExecution(row);
  const cardsNow = rt.cards;
  const engineOn = hasEngineCards(cardsNow);
  const hasWatch = hasKind(cardsNow, 'watchlight'), hasProx = hasKind(cardsNow, 'proximity') || hasKind(cardsNow, 'proximity-range');
  const hasRhythm = hasKind(cardsNow, 'rhythm'), climb = kindRank(cardsNow, 'rapid-lift') >= 2;
  const spillEvery = cardsNow.reduce((m, c) => c && SKILL_CARDS[c.cardId].kind === 'spillway' ? Math.min(m, SKILL_CARDS[c.cardId].pulseCadence || 3) : m, Infinity);
  const hasPrismWick = hasKind(cardsNow, 'prism-wick');
  const capSum = cardsNow.reduce((s, c) => c && SKILL_CARDS[c.cardId].kind === 'capacity' ? s + (SKILL_CARDS[c.cardId].amount || 0) : s, 0);
  const tallyCap = cardsNow.reduce((s, c) => c && ['gilded-rim', 'tithe'].includes(SKILL_CARDS[c.cardId].kind) ? s + (Number(c.tally) || 0) : s, 0);
  const maxMeter = Math.min(METER.cap, METER.base + capSum + st.perm + tallyCap + (row.reduce((s, c) => c && SKILL_CARDS[c.cardId].kind === 'black-hole' ? s + (Math.floor(c.eatenGrowth) || 0) : s, 0)));
  const host = createMeterHost({start: Math.min(METER.start, maxMeter), max: maxMeter, collectorRecovery: 6});
  host.runtime = rt;
  const S = {t: 0, seq: 0, windUntil: -1, asked: 0, real: 0, stored: 0, perm: 0, speed: 0, secs: 0, firings: 0, pulses: 0, queue: [], lastFiring: null,
    handled: 0, counted: true, overfillsNatural: 0, homingPending: 0, flashActive: false, tithes: 0, saved: 0};
  const realGain = host.gain; host.gain = n => { const g = realGain(n); S.real += g; return g; };
  const realShort = host.shortenRecovery; host.shortenRecovery = s => { const g = realShort(s); S.secs += g; return g; };
  host.worldPulse = () => { addPulse(S.t); return true; };
  host.setLuminance = () => {};
  // Homing Thread: the Collector must be ready (flight.mjs requires phase 'ready' and no recovery), so one fetch per 6 s of recovery
  host.homingFetch = () => { if (S.t < (S.homingReady ?? 0)) return false; S.homingReady = S.t + 6; push(S.t + 1.5, 'delivery', {pickupKind: 'light', homed: true}); return true; };
  host.tithe = cost => { if (st.stored - S.tithes * cost < cost) return false; S.tithes++; return true; };
  host.repeatLastFiring = () => {
    if (!S.lastFiring) return null;
    S.counted = false; const r = fire(S.lastFiring.kind, {...S.lastFiring.detail}, true); S.counted = true;
    return r && r.receipt.sparks > 0 ? {asked: r.receipt.sparks, real: r.gain, spill: Math.max(0, r.receipt.sparks - r.gain)} : null;
  };
  let engine = null;
  if (engineOn) {
    engine = new CardEngine(rt, host, {log: false});
    engine.t = 0;
  }
  let warned = false; const warn0 = console.warn; console.warn = () => { warned = true; };
  const push = (t, kind, detail = {}, order = 5) => { S.queue.push({t, kind, detail, order, n: S.queue.length}); };
  const addPulse = t => { // a real light Pulse in the world: it crosses uncollected Sparks, each crossing is a Pulse trigger
    S.pulses++;
    const n = PULSE_CROSSINGS[(S.pulses - 1) % PULSE_CROSSINGS.length];
    for (let i = 0; i < n; i++) push(t + 0.2 + i * 0.05, 'cross', {firstCrossing: !((S.pulses + i) % 3 === 0)}, 4);
  };
  function fire(kind, detail = {}, isRepeat = false) {
    const wind = S.windUntil > S.t && hasKind(rt.cards, 'second-wind');
    if (!wind && !hasCardRowEvent(rt, kind)) return null;
    const receipt = resolveCardRow(rt, {meterFraction: host.meterFraction(), ...detail, ...(wind ? {secondWind: true} : {}),
      availableRecovery: host.recovery, availableReel: kind === 'collector-attach' || kind === 'collector-delivery' ? 4 : 0, collectorReeling: kind === 'collector-attach',
      guardRecovering: S.t < (S.guardUntil ?? -1), kind, id: ++S.seq});
    const asked = Math.min(receipt.sparks, 100), real = asked > 0 ? host.gain(asked) : 0;
    if (S.counted) {
      S.asked += asked; S.stored += receipt.stored; S.perm += receipt.futureCapacity; S.speed += receipt.cruisingSpeed; S.secs += receipt.recoverySeconds + receipt.reelSeconds;
      if (receipt.steps.some(s => s.success && s.operation !== 'replay-row')) S.firings++;
    }
    if (kind === 'collector-delivery' || kind === 'body-spark') host.recovery = Math.max(0, host.recovery - receipt.recoverySeconds);
    if (engine && !isRepeat) {
      if (receipt.steps.some(s => s.success)) S.lastFiring = {kind, detail: {...detail}};
      if (real > 0) engine.raise('gain', {amount: real}, S.t);
      const spill = receipt.sparks - real; if (spill > 1e-9) engine.raise('overfill', {spill}, S.t);
    }
    return {receipt, gain: real};
  }
  // flight.mjs tributaryDelivery / undertowCollect, same conditions
  const tributary = ctx => rt.cards.forEach((c, slot) => {
    if (c?.cardId === 'tributary' && c.tally > 0 && c.tally % 3 === 0 && S.tribFired?.[c.instanceId] !== c.tally) {
      (S.tribFired ||= {})[c.instanceId] = c.tally; fire('collector-delivery', {...ctx, pickupKind: ctx.pickupKind || 'light', fromSlot: slot});
    }
  });
  const undertow = ctx => { const slot = rt.cards.findIndex(c => c?.cardId === 'undertow'); if (slot < 0) return; if (fire('body-spark', {...ctx, pickupKind: 'light', fromSlot: slot})) tributary(ctx); };

  // ---- the script
  const kinds = (n, tag) => Array.from({length: n}, (_, i) => COLLECT_KINDS[(i + (tag || 0)) % COLLECT_KINDS.length]);
  spaced(P.collects, 2, 28, 0).forEach((t, i) => push(t, 'collect', {pickupKind: kinds(P.collects)[i], overfill: Math.floor((i + 1) * P.overfills / P.collects) > Math.floor(i * P.overfills / P.collects)}, 3));
  spaced(P.deliveries, 3, 27, 0.31).forEach((t, i) => push(t, 'delivery', {pickupKind: i === 1 ? 'cache' : 'light'}, 3));
  spaced(P.latches, 4, 26, 0.17).forEach(t => push(t, 'latch', {pickupKind: 'light'}, 3));
  spaced(P.lifts, 1, 29, 0.42).forEach((t, i) => push(t, 'lift', {falling: Math.floor((i + 1) * P.falling / P.lifts) > Math.floor(i * P.falling / P.lifts)}, 2));
  if (hasProx) spaced(P.skims, 3, 28, 0.55).forEach(t => push(t, 'skim', {}, 2));
  if (hasRhythm) spaced(P.rhythm, 3, 27, 0.23).forEach(t => push(t, 'rhythm', {}, 2));
  if (climb) spaced(P.climb, 3, 27, 0.71).forEach(t => push(t, 'climb', {}, 2));
  push(FLASH.at, 'flash', {}, 1);
  if (hasWatch && P.savePlay) push(21.5, 'save', {}, 1);
  push(29.5, 'finish', {}, 6);

  const flashEndsAt = () => host.flashes.filter(f => !f.done).reduce((m, f) => Math.min(m, f.until), Infinity);
  let nextBurn = 1, guard = 0, overGuard = false;
  const handle = ev => {
    S.handled++;
    const t = S.t = ev.t; host.now = t;
    if (engine) engine.advance(t);
    const d = ev.detail;
    if (ev.kind === 'collect') {
      host.recovery = 6; const mf = host.meterFraction();
      if (d.pickupKind !== 'dusk') {
        const room = host.room(), fuel = METER.fuel + (d.pickupKind === 'cluster' ? 6 : d.pickupKind === 'cache' ? 6 : 0);
        host.gain(Math.min(fuel, room));
        if (d.overfill) { // storeNaturalOverflow: a natural Overfill, heard by the Overfill cards and the engine
          S.overfillsNatural++;
          fire('natural-overfill', {pickupKind: d.pickupKind});
          if (engine) engine.raise('overfill', {natural: true}, t);
          if (Number.isFinite(spillEvery) && S.overfillsNatural % spillEvery === 0) addPulse(t);
        }
      }
      const a = fire('body-spark', {pickupKind: d.pickupKind, meterFraction: mf});
      if (a) tributary({pickupKind: d.pickupKind});
      if (engine) engine.raise('collect', {pickupKind: d.pickupKind}, t);
    } else if (ev.kind === 'delivery') {
      host.recovery = 6; const mf = host.meterFraction(); host.gain(Math.min(METER.fuel, host.room()));
      fire('collector-delivery', {pickupKind: d.pickupKind, meterFraction: mf});
      if (engine) engine.raise('delivery', {pickupKind: d.pickupKind}, t);
    } else if (ev.kind === 'latch') fire('collector-attach', {pickupKind: d.pickupKind});
    else if (ev.kind === 'lift') {
      if (d.falling) { fire('downbeat-lift', {direction: 'down'}); undertow({direction: 'down'}); }
      if (engine) engine.raise('lift', {meterFraction: host.meterFraction()}, t);
    } else if (ev.kind === 'skim') { if (engine) engine.raise('skim', {}, t); addPulse(t); }
    else if (ev.kind === 'rhythm') { fire('rhythm-phrase', {}); addPulse(t); }
    else if (ev.kind === 'climb') addPulse(t);
    else if (ev.kind === 'cross') fire('wave-crossing', {firstCrossing: d.firstCrossing, pickupKind: 'light'});
    else if (ev.kind === 'flash') {
      host.flashes.push({until: t + FLASH.seconds, slot: -1, natural: true});
      fire('flash-pickup', {pickupKind: 'sight'});
      for (let k = 1; k <= Math.floor(FLASH.seconds / FLASH.interval); k++) push(t + k * FLASH.interval, 'flash-pulse', {}, 1);
    } else if (ev.kind === 'flash-pulse') addPulse(t);
    else if (ev.kind === 'save') {
      fire('guard-rescue', {meterFraction: 0.25}); S.saved++; S.guardUntil = t + 8; // Mending Moss: the Collector recovers from the save for 8 s
      if (hasKind(rt.cards, 'second-wind')) S.windUntil = t + 5;
    } else if (ev.kind === 'finish') {
      if (engine) engine.raise('pack', {}, t);
      fire('flight-clear', {carriedStored: CARRIED_STORED});
    }
  };
  try {
    for (; guard < 20000; guard++) {
      S.queue.sort((a, b) => a.t - b.t || a.order - b.order || a.n - b.n);
      const tEvent = S.queue.length ? S.queue[0].t : Infinity, tTimer = engine ? engine.nextAt() : Infinity, tFlash = flashEndsAt();
      const t = Math.min(tEvent, tTimer, nextBurn, tFlash);
      if (!(t <= FLIGHT_SECONDS + 1e-9)) break;
      host.now = t; S.t = t;
      if (t === tTimer) { engine.advance(t); continue; }
      if (t === tFlash) {
        if (engine) engine.advance(t);
        const f = host.flashes.find(x => !x.done && x.until === t); f.done = true;
        if (f.natural) { // Prism Wick's final Pulse, then the Flash's end for the engine
          const r = hasPrismWick ? fire('flash-expiry', {pickupKind: 'sight'}) : null;
          if (r?.receipt.steps.some(s => s.success && s.sourceCardId === 'diving-bell')) addPulse(t);
        }
        if (engine) engine.flashEnded(f.slot ?? -1, t);
        continue;
      }
      if (t === nextBurn) { if (engine) engine.advance(t); host.meter = Math.max(0, host.meter - P.drain); nextBurn += 1; continue; }
      handle(S.queue.shift());
    }
    if (guard >= 20000) overGuard = true;
    if (engine) engine.advance(FLIGHT_SECONDS);
  } finally { console.warn = warn0; }
  // persist tallies and growth onto the persistent cards (counts only grow, as commitCardTallies does)
  const tallies = getCardTallies(rt);
  const out = {asked: S.asked + (engine ? engine.asked : 0), real: S.real, stored: S.stored + host.storedTotal, perm: S.perm, speed: S.speed, secs: S.secs,
    firings: S.firings, pulses: S.pulses, turns: engine ? engine.turns : 0, stops: engine ? engine.stops : 0, engineLog: engine ? engine.logged : 0,
    warned: warned || !!engine?.warned, overGuard, handled: S.handled, maxMeter, saved: S.saved};
  const tallyGain = rt.cards.reduce((s, c) => c && ['gilded-rim', 'tithe'].includes(SKILL_CARDS[c.cardId].kind) ? s + ((tallies[c.instanceId] || 0) - (tallyStart[c.instanceId] || 0)) : s, 0);
  out.perm += bhGrowth + tallyGain;
  out.tithes = S.tithes;
  out.value = out.asked + RATE.stored * out.stored + RATE.perm * out.perm + RATE.secs * out.secs + RATE.speed * out.speed;
  out.round = x => x;
  if (opts.commit) { // carry the counts of this flight to the next one
    for (const c of rt.cards) if (c) { const p = cards.find(x => x && x.instanceId === c.instanceId); if (p) { if (c.tally) p.tally = c.tally; if (c.eaten) { p.eaten = c.eaten; p.eatenGrowth = c.eatenGrowth; } } }
    st.perm += S.perm; st.stored += out.stored + S.tithes * -5;
    for (const c of row) if (c === null) { /* eaten card: removed by the caller */ }
    out.eatenSlots = row.map((c, i) => c === null && cards[i] ? i : -1).filter(i => i >= 0);
  }
  return out;
}

// ================================================================ evaluation with caching
const cache = new Map();
const BOUND = {events: 6000, turns: 400};
const flags = new Map(); // chain key -> flag text (explosion and loop guard)
function evalChain(ids) {
  const key = ids.join('>');
  if (cache.has(key)) return cache.get(key);
  const cards = ids.map((id, i) => id ? makeSkillCard(id, `c${i}`) : null);
  const by = {}; let V = 0, A = 0;
  for (const p of PNAMES) {
    const r = runFlight(cards, p);
    by[p] = {asked: r.asked, real: Math.round(r.real * 10) / 10, stored: r.stored, perm: r.perm, secs: Math.round(r.secs * 10) / 10, speed: r.speed, value: Math.round(r.value * 10) / 10,
      turns: r.turns, stops: r.stops, pulses: r.pulses};
    V += r.value; A += r.asked;
    if (r.warned || r.overGuard || r.turns > BOUND.turns || r.engineLog > BOUND.events) flags.set(key, `loop: ${p} flight: turns ${r.turns}, engine events ${r.engineLog}${r.warned ? ', engine safety stop' : ''}${r.overGuard ? ', loop guard hit' : ''}`);
  }
  const res = {ids, V: Math.round(V / PNAMES.length * 100) / 100, asked: Math.round(A / PNAMES.length * 100) / 100, by};
  cache.set(key, res);
  return res;
}
const Vof = ids => evalChain(ids).V;
// synergy = V(chain) / sum of the cards alone, with the denominator floored at 1 so that a card that pays nothing alone cannot give an infinite ratio
const FLOOR = 1;
// "Alone" is the best of: the card by itself, behind a dead filler card, in front of one (so a card that pays for having any card beside it,
// like Ladder, does not count as partnered with everything).
const FILLER = 'lift-guide', soloMemo = new Map();
const soloP = id => { if (!soloMemo.has(id)) soloMemo.set(id, Math.max(Vof([id]), Vof([FILLER, id]), Vof([id, FILLER]))); return soloMemo.get(id); };
const synergy = (ids, v = Vof(ids)) => v / Math.max(FLOOR, ids.reduce((s, id) => s + soloP(id), 0));

// ================================================================ helpers
const generic = id => { const d = SKILL_CARDS[id], r = getCardRowRule(d, makeSkillCard(id, 'x')); return r?.event === '*' || ['echo', 'chameleon', 'chameleon-two', 'refrain', 'keystone'].includes(d.kind); };
function* permutations(a) {
  if (a.length <= 1) { yield a.slice(); return; }
  for (let i = 0; i < a.length; i++) { const rest = a.slice(0, i).concat(a.slice(i + 1)); for (const p of permutations(rest)) yield [a[i], ...p]; }
}
const fmt = (x, d = 0) => Number(x).toFixed(d);
const profLine = r => PNAMES.map(p => `${p[0]}${fmt(r.by[p].asked)}`).join(' / ');
const ASSUMPTIONS_MD = [
  '| Item | Value | Where it comes from |', '| --- | --- | --- |',
  `| Flight length | ${FLIGHT_SECONDS} s | Same as scripts/balance/simulate.mjs |`,
  `| Meter | base ${METER.base}, +Deep Vessel, +permanent growth, cap ${METER.cap}; starts at ${METER.start}; drains 2.0 (careful), 2.6 (greedy), 2.3 (stylish) Sparks/s; a plain pickup gives ${METER.fuel} (+6 for Cluster and Cache) | Assumed; engine-sweep uses a base meter of 30 |`,
  `| Flash | 1 natural Flash per flight at ${FLASH.at} s (rows 1+), lasts ${FLASH.seconds} s, a Pulse every ${FLASH.interval} s = ${FLASH.seconds / FLASH.interval} Pulses; Collect-a-Flash fires once; the end of the Flash fires once | Owner brief and dist/flash-tether.mjs |`,
  `| Pulse crossings | each world Pulse crosses 1, then 2, then 1... uncollected Sparks (average 1.5), 2 of 3 are first crossings | Assumed |`,
  ...PNAMES.map(p => { const P = PROFILES[p]; return `| Profile **${p}** | ${P.collects} Collects (${P.overfills} overfill), ${P.deliveries} Deliveries, ${P.latches} Latches, ${P.lifts} Lifts (${P.falling} while falling), ${P.rhythm} Rhythm phrases, ${P.climb} Climb trios, ${P.skims} Skims, Save ${P.savePlay ? 'once' : 'never'}, 1 Finish, 1 Pack | Assumed (no flight telemetry exists) |`; }),
  '| Save | happens at 21.5 s when the Chain holds a Watchlight and the profile crashes; the meter counts as one quarter full (so Last Light can pay); the Collector recovers from it for 8 s | Assumed |',
  '| Sources that need a card | Skims only with Proximity or Edge Reach; Saves only with Watchlight; Rhythm phrases only with Rhythm; Climb Pulses only with Climb; Spillway Pulse every 2nd (I) or every Overfill (II) | dist/skill-cards.mjs getCardModifiers, dist/flight.mjs |',
  `| Collect kinds | repeating light, light, cluster, light, cache, light, dusk... | Assumed |`,
  `| Collector | always has 6 s of recovery to cut; reel 4 s on Delivery/Latch | Assumed |`,
  `| Value | Sparks asked (each firing capped at 100) + ${RATE.stored}/Stored Spark + ${RATE.perm}/permanent max Spark + ${RATE.secs}/s Collector time + ${RATE.speed}/speed point | Assumed exchange rates |`,
  `| Carried Stored | ${CARRIED_STORED} at Finish | Assumed |`,
  '| Uses | reset every flight (a use lasts one flight, ruling of 17 Nov) | Rule |', '| Tallies | persist across flights in a run, start at 0 | dist/skill-cards.mjs |',
].join('\n');
const MEASURED_MD = [
  '**Measured by the real code:** every Spark, Stored Spark, permanent gain and Collector second a card pays (`resolveCardRow`, with its Boost, Echo, Refrain, Keystone, position and tally rules); every engine card (`CardEngine`: Turns, Timers, Pulses, Flash Tinder, Spill Jar, Pack, Overflow Bell); what Black Hole eats and grows (`previewBlackHoleMeals`); Tributary and Undertow glue copied from flight.mjs.',
  '**Assumed:** how often each Trigger happens (table above), the meter, what a Pulse crosses, the exchange rates in Value, that uses reset every flight, which cards switch on an event source (Watchlight, Rhythm, Climb, Spillway, Proximity).',
].join('\n\n');
const bar = ids => ids.map(nm).join(' > ');
function mdTable(head, rows) { return ['| ' + head.join(' | ') + ' |', '| ' + head.map(() => '---').join(' | ') + ' |', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n'); }
const writeOut = (name, json, md) => { writeFileSync(new URL(name + '.json', OUT), JSON.stringify(json, null, 1)); writeFileSync(new URL(name + '.md', OUT), md); };

// ================================================================ hands (Sweep 1, runs)
const HANDS = [
  // -- archetypes of docs/archetype-gaps.md section 2 (A = live cards, B = a second hand, some with hidden cards)
  ['Collect flood A', 'collect-flood', ['body-spark', 'dusk-wick-ii', 'cluster-heart', 'echo-ii', 'crescendo']],
  ['Collect flood B', 'collect-flood', ['low-wick', 'spark-cache', 'wick-doubler', 'dusk-wick', 'closing-chord']],
  ['Boost core A', 'boost-core', ['dusk-wick-iii', 'echo-iii', 'prism-lens-ii', 'crescendo', 'closing-chord']],
  ['Boost core B', 'boost-core', ['body-spark', 'kindling-bead-iii', 'refrain', 'crescendo', 'second-sun']],
  ['Lift and Rhythm A', 'lift-rhythm', ['rhythm', 'downbeat-iii', 'toll-bell', 'glide-prism', 'pacesetter']],
  ['Lift and Rhythm B', 'lift-rhythm', ['downbeat', 'downbeat-iii', 'counterweight', 'glide-prism', 'echo-ii']],
  ['Pulse engine A', 'pulse-engine', ['rhythm', 'harvest-legendary', 'far-shore', 'first-ripple', 'ripple-glass']],
  ['Pulse engine B', 'pulse-engine', ['climb', 'slip-feather', 'harvest-legendary', 'first-ripple', 'ripple-glass']],
  ['Collector and Delivery A', 'collector-delivery', ['courier-tip-iii', 'crate-lining', 'courier-glass', 'courier-tip', 'return-spring']],
  ['Collector and Delivery B', 'collector-delivery', ['cache-handling', 'courier-tip-iii', 'crate-lining', 'courier-glass', 'echo-ii']],
  ['Finish and Stored A', 'finish-stored', ['growth-ring', 'wayfarers-purse', 'nest-egg', 'tight-packing-iii', 'wind-feather']],
  ['Finish and Stored B', 'finish-stored', ['tight-packing-ii', 'wayfarers-purse', 'nest-egg', 'growth-ring', 'deep-vessel']],
  ['Overfill A', 'overfill', ['spillway', 'ring-spring-ii', 'dusk-wick-iii', 'ring-spring', 'tight-packing-iii']],
  ['Overfill B (hidden)', 'overfill', ['dusk-wick-iii', 'spill-jar', 'overflow-bell', 'gilded-rim', 'spillway-ii']],
  ['Save and survival A', 'save', ['watchlight', 'home-beacon', 'last-light', 'tailwind', 'mending-moss']],
  ['Save and survival B', 'save', ['watchlight', 'last-light', 'home-beacon', 'kindling-bead-iii', 'echo-iii']],
  ['Flash A', 'flash', ['flash-handling', 'flash-bank', 'clear-prism', 'flash-thread', 'diving-bell']],
  ['Flash B (hidden)', 'flash', ['flash-tinder', 'diving-bell', 'afterglow', 'clear-prism', 'closing-chord']],
  ['Skim A', 'skim', ['slip-feather', 'edge-reach', 'harvest-legendary', 'far-shore', 'ripple-glass']],
  ['Skim B (hidden)', 'skim', ['slip-feather', 'close-call', 'harvest-rare', 'far-shore', 'ripple-glass']],
  ['Timers engine A (hidden)', 'timers', ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick', 'crescendo']],
  ['Timers engine B (hidden)', 'timers', ['slip-feather', 'close-call', 'metronome', 'downbeat-iii', 'heartbeat']],
  ['Devour growth A', 'devour', ['devourer', 'ember-feeder', 'body-spark', 'courier-tip', 'dusk-wick']],
  ['Devour growth B (hidden)', 'devour', ['dusk-wick-ii', 'crescendo', 'black-hole', 'low-wick']],
  ['Position A', 'position', ['echo-iii', 'chameleon', 'closing-chord', 'body-spark', 'dusk-wick-ii']],
  ['Position B (hidden)', 'position', ['vanguard', 'ladder', 'dusk-wick-ii', 'twin-flame', 'keystone']],
  ['Position C (hidden)', 'position', ['keystone', 'dusk-wick-ii', 'body-spark', 'empty-chair']],
  ['Position D (hidden)', 'position', ['chameleon-two', 'dusk-wick-ii', 'growth-ring', 'wayfarers-purse']],
  ['Limited-use A', 'limited', ['use-doubler', 'spark-cache', 'cluster-heart', 'wick-doubler', 'low-wick']],
  ['Limited-use B', 'limited', ['use-doubler', 'courier-glass', 'crate-lining', 'courier-tip', 'home-beacon']],
  ['Light and dark (hidden)', 'light', ['lantern-lens', 'momentum', 'metronome', 'body-spark']],
  // -- the five paper builds of section 6 (* = unreleased)
  ['Paper 1: Collect into Delivery', 'paper', ['dusk-wick-ii', 'tributary', 'courier-tip-iii', 'courier-glass', 'closing-chord']],
  ['Paper 2: Skim into Pulse', 'paper', ['slip-feather', 'close-call', 'harvest-legendary', 'far-shore', 'ripple-glass']],
  ['Paper 3: Overfill and the bigger meter', 'paper', ['dusk-wick-iii', 'overflow-bell', 'spill-jar', 'gilded-rim', 'tight-packing-iii']],
  ['Paper 4: Crash and comeback', 'paper', ['watchlight', 'home-beacon', 'last-light', 'second-wind', 'scar-tissue']],
  ['Paper 5: Player-made Flash', 'paper', ['flash-tinder', 'diving-bell', 'afterglow', 'clear-prism', 'closing-chord']],
  // -- extra hands: mixed Triggers, tally and engine cards
  ['Mixed Collect + Lift', 'mixed', ['downbeat-iii', 'dusk-wick-ii', 'echo-ii', 'crescendo', 'body-spark']],
  ['Mixed Pulse + Collect', 'mixed', ['rhythm', 'harvest-legendary', 'dusk-wick-ii', 'echo-ii', 'prism-lens-ii']],
  ['Tally: Old Friend + Boosts', 'tally', ['body-spark', 'old-friend', 'kindling-bead-iii', 'echo-iii', 'crescendo']],
  ['Tally: Ledger and Tributary', 'tally', ['tributary', 'courier-tip-iii', 'collectors-ledger', 'crate-lining', 'courier-glass']],
  ['Engine: Overflow mill', 'timers', ['close-call', 'metronome', 'body-spark', 'overflow-bell', 'heartbeat']],
  ['Pack: Harvest Home', 'pack', ['dusk-wick-ii', 'low-wick', 'harvest-home', 'full-satchel', 'last-round']],
  ['Undertow + Lift', 'mixed', ['undertow', 'dusk-wick-ii', 'cluster-heart', 'echo-ii', 'crescendo']],
  ['Second Wind chaos', 'mixed', ['watchlight', 'second-wind', 'home-beacon', 'kindling-bead-iii', 'crescendo']],
];
for (const [, , ids] of HANDS) ids.forEach(nm); // fails fast on a wrong id

// ================================================================ Sweep 1: ORDER
function analyseHand(name, arch, ids) {
    const res = [];
    for (const p of permutations(ids)) res.push(evalChain(p));
    res.sort((a, b) => b.V - a.V);
    const best = res[0], worst = res[res.length - 1];
    const ratio = best.V / Math.max(worst.V, 1);
    // adjacency analysis: ordered adjacent pair (x directly left of y), and precedence (x anywhere left of y)
    const mean = f => { let s = 0, n = 0; for (const r of res) if (f(r.ids)) { s += r.V; n++; } return n ? s / n : 0; };
    const adj = [], pre = [];
    for (const x of ids) for (const y of ids) if (x !== y) {
      const w = mean(c => c.indexOf(x) + 1 === c.indexOf(y)), o = mean(c => c.indexOf(x) + 1 !== c.indexOf(y));
      adj.push({x, y, w, o, effect: w / Math.max(o, 1)});
      const w2 = mean(c => c.indexOf(x) < c.indexOf(y)), o2 = mean(c => c.indexOf(x) > c.indexOf(y));
      pre.push({x, y, w: w2, o: o2, effect: w2 / Math.max(o2, 1)});
    }
    const topAdj = adj.sort((a, b) => b.effect - a.effect)[0], lowAdj = adj.sort((a, b) => a.effect - b.effect)[0];
    const topPre = pre.sort((a, b) => Math.abs(Math.log(b.effect)) - Math.abs(Math.log(a.effect)))[0];
    const distinctV = new Set(res.map(r => r.V)).size;
    return ({name, archetype: arch, cards: ids, perms: res.length, best: best.ids, worst: worst.ids, bestV: best.V, worstV: worst.V, ratio: Math.round(ratio * 100) / 100,
      bestBy: best.by, worstBy: worst.by, medianV: res[Math.floor(res.length / 2)].V, distinctValues: distinctV,
      orderMatters: ratio >= 1.05, dead: best.V < 1,
      adjacency: topAdj && {text: `${nm(topAdj.x)} directly left of ${nm(topAdj.y)}`, meanWith: Math.round(topAdj.w), meanWithout: Math.round(topAdj.o), effect: Math.round(topAdj.effect * 100) / 100},
      worstAdjacency: lowAdj && {text: `${nm(lowAdj.x)} directly left of ${nm(lowAdj.y)}`, effect: Math.round(lowAdj.effect * 100) / 100},
      precedence: topPre && {text: `${nm(topPre.x)} somewhere ${topPre.effect >= 1 ? 'left' : 'right'} of ${nm(topPre.y)}`, effect: Math.round((topPre.effect >= 1 ? topPre.effect : 1 / topPre.effect) * 100) / 100}});
}
function sweepOrder() { return HANDS.map(([name, arch, ids]) => analyseHand(name, arch, ids)); }

// ================================================================ Sweep 2: PAIRS, TRIPLES (and a beam to 5 cards)
function sweepPairs(pool, label, seedN = 300) {
  const ids = pool.map(d => d.id);
  const solo = Object.fromEntries(ids.map(id => [id, Vof([id])]));
  const bestSpec = Object.fromEntries(ids.map(id => [id, {syn: 0, with: null, V: 0}]));
  const pairs = [];
  for (const a of ids) for (const b of ids) if (a !== b) { const v = Vof([a, b]); pairs.push({ids: [a, b], V: v, syn: EATERS.has(kindOf(a)) ? 0 : synergy([a, b], v)}); }
  lap(`${label}: ${pairs.length} pairs done`);
  const eligible = pairs.filter(p => p.V >= 15).sort((a, b) => b.syn - a.syn);
  const topPairs = eligible.slice(0, seedN);
  // triples seeded from the top 300 pairs: a third card in front, between, or behind
  const triples = new Map();
  for (const p of topPairs) for (const c of ids) {
    if (p.ids.includes(c)) continue;
    for (const t of [[c, p.ids[0], p.ids[1]], [p.ids[0], c, p.ids[1]], [p.ids[0], p.ids[1], c]]) {
      const k = t.join('>'); if (triples.has(k)) continue;
      const v = Vof(t); triples.set(k, {ids: t, V: v, syn: synergy(t, v)});
    }
  }
  lap(`${label}: ${triples.size} triples done`);
  const tripleList = [...triples.values()].filter(t => t.V >= 15);
  // best partner per card: best synergy over every pair and seeded triple that contains it
  const bestSyn = Object.fromEntries(ids.map(id => [id, {syn: 0, with: null, V: 0}]));
  for (const p of pairs) for (const id of p.ids) {
    if (p.V >= 3 && p.syn > bestSyn[id].syn) bestSyn[id] = {syn: p.syn, with: p.ids, V: p.V};
    if (p.V >= 3 && !p.ids.some(generic) && p.syn > bestSpec[id].syn) bestSpec[id] = {syn: p.syn, with: p.ids, V: p.V};
  }
  // beam: top 40 triples by V -> quads -> quints (best order of a 4th/5th card in every position)
  const beam = (list, size, keep) => {
    const out = new Map();
    for (const c of list) for (const id of ids) {
      if (c.ids.includes(id)) continue;
      for (let pos = 0; pos <= c.ids.length; pos++) {
        const t = c.ids.slice(0, pos).concat(id, c.ids.slice(pos)); const k = t.join('>');
        if (!out.has(k)) out.set(k, {ids: t, V: Vof(t)});
      }
    }
    return [...out.values()].sort((a, b) => b.V - a.V).slice(0, keep);
  };
  const seed3 = tripleList.sort((a, b) => b.V - a.V).slice(0, QUICK ? 10 : 30);
  const quads = beam(seed3, 4, QUICK ? 10 : 30);
  const quints = beam(quads, 5, 60);
  lap(`${label}: beam done`);
  return {label, count: ids.length, bestSpec, solo, pairs, topPairs: eligible.slice(0, 60), eligibleCount: eligible.length, triples: tripleList.sort((a, b) => b.syn - a.syn).slice(0, 60),
    tripleCount: tripleList.length, bestSyn, quads, quints, topTriplesByV: seed3};
}

// ================================================================ Sweep 3: RUNS (8 flights, draft order)
const FODDER = ['low-wick', 'body-spark', 'spark-cache', 'mending-moss', 'glass-spool', 'fast-spool', 'cluster-heart', 'body-spark'];
function runBuild(spec, prof, flights = 8) {
  // spec: {ids (final order), draft (acquisition order), fodder?}. Two cards at flight 1, one more each flight.
  const inst = Object.fromEntries(spec.ids.map((id, i) => [i, makeSkillCard(id, `b${i}`)]));
  const st = {stored: 0, perm: 0};
  const per = [];
  for (let f = 0; f < flights; f++) {
    const have = new Set(spec.draft.slice(0, Math.min(spec.draft.length, 2 + f)));
    const row = spec.ids.map((id, i) => have.has(id) ? inst[i] : null).filter(Boolean);
    if (spec.fodder) { const hole = row.findIndex(c => c.cardId === 'black-hole'); if (hole >= 0) row.splice(hole + 1, 0, makeSkillCard(FODDER[f % FODDER.length], `f${f}`)); }
    const r = runFlight(row.slice(0, MAX_SLOTS), prof, st, {commit: true});
    per.push({asked: r.asked, real: Math.round(r.real * 10) / 10, value: Math.round(r.value * 10) / 10, stored: r.stored, perm: r.perm, secs: Math.round(r.secs), maxMeter: r.maxMeter, cards: row.length,
      tally: row.map(c => c.tally ? `${nm(c.cardId)}:${c.tally}` : null).filter(Boolean).concat(row.map(c => c.eatenGrowth ? `${nm(c.cardId)}:grown ${c.eatenGrowth}` : null).filter(Boolean))});
    // a flight cleared with the Chain adds one to Old Friend style counts (flight-clear fires inside runFlight already)
  }
  return per;
}
function buildSpecs(orderRows, ids2best) {
  const paper = HANDS.filter(h => h[1] === 'paper').map(([name, , ids]) => ({name, ids, draft: ids.slice().sort((a, b) => 0), kind: 'paper'}));
  // draft order: core engine first (enablers and payoffs), boosts last
  const rank = id => { const k = kindOf(id), op = getCardRowRule(SKILL_CARDS[id], makeSkillCard(id, 'x'))?.operation; return op === 'multiply' || ['echo', 'chameleon', 'refrain'].includes(k) ? 2 : ENABLERS.has(id) ? 0 : 1; };
  for (const s of paper) s.draft = s.ids.slice().sort((a, b) => rank(a) - rank(b));
  const best4 = orderRows.filter(r => !/^Paper/.test(r.name)).sort((a, b) => b.bestV - a.bestV).slice(0, 4)
    .map(r => ({name: `Best of sweep 1: ${r.name}`, ids: r.best, draft: r.best.slice().sort((a, b) => rank(a) - rank(b)), kind: 'best'}));
  const tally = [
    {name: 'Tally: Ledger + Tributary (Delivery)', ids: ['tributary', 'courier-tip-iii', 'collectors-ledger', 'crate-lining', 'courier-glass'], kind: 'tally'},
    {name: 'Tally: Old Friend + Boosts', ids: ['body-spark', 'old-friend', 'kindling-bead-iii', 'echo-iii', 'crescendo'], kind: 'tally'},
    {name: 'Devour: Black Hole eats a Common each flight', ids: ['dusk-wick-ii', 'crescendo', 'black-hole'], fodder: true, kind: 'tally'},
    {name: 'Tally: Gilded Rim and Spill Jar', ids: ['dusk-wick-iii', 'spill-jar', 'gilded-rim', 'spillway-ii', 'echo-ii'], kind: 'tally'},
    {name: 'Tally: Tithe with Stored income', ids: ['wayfarers-purse', 'nest-egg', 'spill-jar', 'tithe', 'dusk-wick-iii'], kind: 'tally'},
    {name: 'Tally: Scar Tissue and Saves', ids: ['watchlight', 'home-beacon', 'scar-tissue', 'dusk-wick-ii', 'crescendo'], kind: 'tally'},
  ];
  for (const s of tally) s.draft = s.draft || s.ids.slice().sort((a, b) => rank(a) - rank(b));
  return [...paper, ...best4, ...tally];
}

// ================================================================ main
const PROBE = (ARGS.find(a => a.startsWith('--probe=')) || '').slice(8);
if (PROBE) { // debugging aid: node chain-sweep.mjs --probe=metronome,body-spark
  for (const p of PNAMES) { const t = Date.now(); const r = runFlight(PROBE.split(',').map((id, i) => makeSkillCard(id, 'p' + i)), p); console.log(p, JSON.stringify({...r, round: undefined}), Date.now() - t, 'ms'); }
  process.exit(0);
}
if (ARGS.includes('--slowscan')) { // debugging aid: the slowest pairs
  const ids = ALL.map(d => d.id), out = [];
  for (const a of ids) for (const b of ids) if (a !== b) { const t = Date.now(); runFlight([makeSkillCard(a, 'a'), makeSkillCard(b, 'b')], 'greedy'); out.push([Date.now() - t, a, b]); }
  out.sort((x, y) => y[0] - x[0]); console.log(out.slice(0, 15).map(x => x.join(' ')).join(String.fromCharCode(10))); console.log('total ms', out.reduce((s, x) => s + x[0], 0)); process.exit(0);
}
const result = {meta: {generated: new Date().toISOString(), quick: QUICK, profiles: PROFILES, meter: METER, flash: FLASH, rate: RATE}};
let orderRows = [];
if (want('order') || want('runs')) { orderRows = sweepOrder(); lap(`order: ${orderRows.length} hands`); }
if (want('order')) {
  result.order = orderRows;
  const md = ['# Chain sweep 1: order of a hand', '', ASSUMPTIONS_MD, '', MEASURED_MD, '',
    'Every permutation of each hand was run through all three profiles. Value is the mean over the profiles. Ratio = best / max(worst, 1). `a/c/d` columns are Sparks asked per flight (careful / greedy / stylish).', '',
    mdTable(['Hand', 'Archetype', 'Perms', 'Best order', 'Best V', 'Worst order', 'Worst V', 'Ratio', 'Best c/g/s', 'What made the difference'],
      orderRows.map(r => [r.name, r.archetype, r.perms, bar(r.best), r.bestV, bar(r.worst), r.worstV, r.dead ? 'dead' : r.ratio, profLine({by: r.bestBy}),
        r.dead ? 'no card pays in this script' : !r.orderMatters ? 'order does not matter' : `${r.adjacency.text} (x${r.adjacency.effect}); ${r.precedence.text} (x${r.precedence.effect})`]))].join('\n');
  writeOut('chain-sweep-order', orderRows, md);
}
let pairsLive, pairsAll;
if (want('pairs')) {
  pairsLive = sweepPairs(LIVE, 'live', 220);
  result.pairsLive = {topPairs: pairsLive.topPairs, triples: pairsLive.triples, bestSyn: pairsLive.bestSyn, quints: pairsLive.quints.slice(0, 20)};
}
if (want('hidden')) {
  pairsAll = sweepPairs(ALL, "all", 150);
  result.pairsAll = {topPairs: pairsAll.topPairs, triples: pairsAll.triples, bestSyn: pairsAll.bestSyn, quints: pairsAll.quints.slice(0, 20)};
}
const runs = [];
if (want('runs')) {
  const specs = buildSpecs(orderRows);
  for (const s of specs) { const by = {}; for (const p of PNAMES) by[p] = runBuild(s, p); runs.push({name: s.name, kind: s.kind, ids: s.ids, draft: s.draft, by}); }
  result.runs = runs;
  const md = ['# Chain sweep 3: 8-flight runs', '', ASSUMPTIONS_MD, '', MEASURED_MD, '',
    'Draft order: two cards at flight 1 (enablers and payoffs first, Boosts last), one more at each later flight. Black Hole eats a fresh Common each flight. Sparks asked per flight.', '',
    ...runs.map(r => ['## ' + r.name, '', 'Chain: ' + bar(r.ids), '', 'Drafted in this order: ' + bar(r.draft), '',
      mdTable(['Profile', ...Array.from({length: 8}, (_, i) => 'F' + (i + 1)), 'Total', 'Max meter F8', 'Counts F8'],
        PNAMES.map(p => [p, ...r.by[p].map(f => f.asked), r.by[p].reduce((s, f) => s + f.asked, 0), r.by[p][7].maxMeter, r.by[p][7].tally.join('; ') || '-'])), ''].join('\n'))].join('\n');
  writeOut('chain-sweep-runs', runs, md);
}
// ---- guard
const med5 = (() => {
  let seed = 99, rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const vs = [], n = QUICK ? 150 : 600;
  for (let i = 0; i < n; i++) { const ids = []; while (ids.length < 5) { const id = LIVE[Math.floor(rnd() * LIVE.length)].id; if (!ids.includes(id)) ids.push(id); } vs.push(Vof(ids)); }
  vs.sort((a, b) => a - b); return {median: vs[Math.floor(vs.length / 2)], p90: vs[Math.floor(vs.length * .9)], max: vs[vs.length - 1], n};
})();
lap(`median random 5-chain V = ${med5.median}`);
// ---- the most fun chains, and the hidden cards
const funRows = [], hiddenRows = [];
if (orderRows.length && (pairsLive || pairsAll)) {
  const cand = new Map(), addC = (ids, src) => { const k = ids.join('>'); if (!cand.has(k)) cand.set(k, {ids, src}); };
  orderRows.forEach(r => addC(r.best, 'hand ' + r.name));
  for (const P of [pairsLive, pairsAll]) if (P) { P.quints.slice(0, 45).forEach(q => addC(q.ids, 'beam ' + P.label)); P.quads.slice(0, 20).forEach(q => addC(q.ids, 'beam ' + P.label)); P.triples.slice(0, 30).forEach(q => addC(q.ids, 'triple ' + P.label)); P.topTriplesByV.forEach(q => addC(q.ids, 'triple ' + P.label)); }
  const thr = 20 * Math.max(med5.median, 1);
  const list = [...cand.values()].map(c => { const r = evalChain(c.ids); return {...c, V: r.V, syn: synergy(c.ids, r.V), by: r.by, exploding: r.V > thr,
    pulls: c.ids.every((id, i) => Vof(c.ids.filter((_, j) => j !== i)) < 0.9 * r.V), eater: c.ids.some(id => EATERS.has(kindOf(id)))}; });
  const ok = list.filter(c => c.pulls && c.syn >= 1.5 && c.V >= 30 && !c.exploding && !c.eater).sort((a, b) => b.V - a.V);
  const picked = [];
  for (const c of ok) { if (picked.every(p => p.ids.filter(id => c.ids.includes(id)).length < 3)) picked.push(c); if (picked.length === 12) break; }
  for (const c of picked) funRows.push({...c, analysis: analyseHand('fun', 'fun', c.ids.length <= 5 ? c.ids : c.ids.slice(0, 5)), hidden: c.ids.filter(id => SKILL_CARDS[id].unreleased)});
  funRows.sort((a, b) => b.V - a.V);
  writeOut('chain-sweep-fun', {candidates: list.length, passed: ok.length, picked: funRows, rejectedExploding: list.filter(c => c.exploding).length}, ['# Chain sweep: the most fun chains', '',
    'Candidates: best orders of every hand, the beam-search 4 and 5 card chains and the best triples (live and all cards). A chain qualifies when every card pulls weight (removing any one costs it at least 10% of its value), its synergy is at least 1.5, its value at least 30, it is not over the explosion threshold and it has no card that eats another. The 12 highest-value chains that share fewer than 3 cards with a higher one are listed.', '',
    mdTable(['#', 'Chain', 'Hidden cards', 'Value', 'Synergy', 'c/g/s asked', 'Order ratio best/worst'], funRows.map((c, i) => [i + 1, bar(c.ids), c.hidden.map(nm).join(', ') || '-', fmt(c.V, 1), fmt(c.syn, 2), profLine(c), c.analysis.dead ? '-' : c.analysis.ratio]))].join(String.fromCharCode(10)));
  if (pairsAll) {
    // Beam search per hidden card over cards that are not wildcard Boosts, Echo, Keystone or eaters (those make every chain look good):
    // start from the card, add one card at a time in every position, keep the best 4, up to 4 cards. Marginal = the chain minus the card, same order.
    const bpool = ALL.map(d => d.id).filter(x => !generic(x) && !EATERS.has(kindOf(x)) && (!isNotMeasurable(x) || ENABLERS.has(x)) && (soloP(x) > 0 || ENABLERS.has(x) || SKILL_CARDS[x].engine || SKILL_CARDS[x].tallyEvent || SKILL_CARDS[x].unreleased));
    const score = (ids, id) => { const r = evalChain(ids), without = ids.filter(x => x !== id), vo = without.length ? Vof(without) : 0; return (r.V - vo) + 0.3 * PNAMES.reduce((t, p) => t + r.by[p].turns, 0) / PNAMES.length + 0.001 * r.V; };
    const beamFor = id => {
      let layer = [[id]], best = null;
      for (let len = 1; len < 4; len++) {
        const seen = new Map();
        for (const base of layer) for (const p of bpool) { if (base.includes(p)) continue; for (let pos = 0; pos <= base.length; pos++) { const ch = base.slice(0, pos).concat(p, base.slice(pos)), k = ch.join('>'); if (!seen.has(k)) seen.set(k, {ids: ch, sc: score(ch, id)}); } }
        const arr = [...seen.values()].sort((x, y) => y.sc - x.sc); layer = arr.slice(0, 4).map(x => x.ids); if (!best || arr[0].sc > best.sc) best = arr[0];
      }
      return best;
    };
    for (const d of HIDDEN) {
      const id = d.id, b = beamFor(id), sp = pairsAll.bestSpec[id], sy = pairsAll.bestSyn[id];
      const without = b.ids.filter(x => x !== id), vWith = Vof(b.ids), vWithout = without.length ? Vof(without) : 0;
      // the same card in the best hand that contains it (hands are 4 to 5 cards): what it adds over the hand's other cards in their best order
      let hand = null;
      for (const r of orderRows) if (r.cards.includes(id)) { const others = r.cards.filter(x => x !== id); let bo = 0; for (const p of permutations(others)) bo = Math.max(bo, Vof(p)); const add = r.bestV - bo; if (!hand || add > hand.add) hand = {name: r.name, with: r.bestV, without: Math.round(bo * 100) / 100, add: Math.round(add * 100) / 100}; }
      hiddenRows.push({id, name: nm(id), rarity: d.rarity, kind: d.kind, soloP: soloP(id), bestSyn: Math.round(sy.syn * 100) / 100, bestSynWith: sy.with && bar(sy.with),
        bestSpec: Math.round(sp.syn * 100) / 100, bestSpecWith: sp.with && bar(sp.with), beam: bar(b.ids), beamV: vWith, beamAdds: Math.round((vWith - vWithout) * 100) / 100, hand,
        eater: EATERS.has(kindOf(id)), notMeasurable: isNotMeasurable(id)});
    }
    hiddenRows.sort((a, b) => b.bestSpec - a.bestSpec);
    writeOut('chain-sweep-hidden', hiddenRows, ['# Chain sweep 4: hidden cards', '', 'Per hidden card: value alone (best of alone or beside a dead filler), best synergy with any partner and with a specific (non-wildcard) partner, the best chain of up to 4 non-wildcard cards found by beam search that contains it (and what the card adds to that chain), and what it adds to the best hand that contains it (4 to 5 cards, best order with and without it).', '',
      mdTable(['Card', 'R', 'Alone V', 'Best syn (any)', 'Best syn (specific)', 'Best specific partner', 'Beam chain', 'Beam V', 'Card adds', 'Best hand', 'Hand adds'],
        hiddenRows.map(h => [h.name + (h.eater ? ' (eats)' : ''), h.rarity[0], fmt(h.soloP, 1), h.bestSyn, h.bestSpec, h.bestSpecWith || '-', h.beam, fmt(h.beamV, 0), fmt(h.beamAdds, 0), h.hand ? h.hand.name : '-', h.hand ? fmt(h.hand.add, 0) : '-']))].join(String.fromCharCode(10)));
  }
  lap('fun chains and hidden cards done');
}
const explosions = [];
for (const r of cache.values()) if (r.V > 20 * Math.max(med5.median, 1)) explosions.push({ids: r.ids, V: r.V, by: r.by, x: Math.round(r.V / med5.median * 10) / 10});
explosions.sort((a, b) => b.V - a.V);
const explosionSets = new Map(), explosionFreq = {};
for (const e of explosions) { const k = e.ids.slice().sort().join('+'); if (!explosionSets.has(k)) explosionSets.set(k, {...e, orders: 0}); explosionSets.get(k).orders++; for (const id of e.ids) explosionFreq[id] = (explosionFreq[id] || 0) + 1; }
const distinctExplosions = [...explosionSets.values()].sort((a, b) => b.V - a.V);
const freqList = Object.entries(explosionFreq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, n]) => ({id, name: nm(id), n, share: Math.round(n / explosions.length * 100)}));
const loops = [...flags.entries()].map(([k, why]) => ({chain: k.split('>'), why}));
result.guard = {median5: med5, threshold: 20 * med5.median, explosions: explosions.slice(0, 40), explosionCount: explosions.length, distinctSets: distinctExplosions.length, distinct: distinctExplosions.slice(0, 40), freq: freqList, loops: loops.slice(0, 40), loopCount: loops.length, evaluated: cache.size};
{
  const md = ['# Chain sweep: guard', '', `Median value of ${med5.n} random 5-card live chains: ${fmt(med5.median, 1)} (90th percentile ${fmt(med5.p90, 1)}). Explosion threshold: 20x = ${fmt(20 * med5.median, 0)}.`, '',
    `Chains evaluated: ${cache.size}. Over the threshold: ${explosions.length} (${distinctExplosions.length} distinct card sets). Loop or event-count flags: ${loops.length}.`, '',
    '## Cards most often in an exploding chain', '', mdTable(['Card', 'Chains', 'Share'], freqList.map(f => [f.name, f.n, f.share + '%'])), '',
    '## Explosions: best order of each of the top 40 distinct card sets (possible bug rather than fun)', '', mdTable(['Chain', 'Orders over threshold', 'V', 'x median', 'Sparks c/g/s'], distinctExplosions.slice(0, 40).map(e => [bar(e.ids), e.orders, fmt(e.V, 0), e.x, profLine(e)])), '',
    '## Loops', '', loops.length ? mdTable(['Chain', 'Why'], loops.slice(0, 40).map(l => [bar(l.chain), l.why])) : 'None.'].join('\n');
  writeOut('chain-sweep-guard', result.guard, md);
}
if (pairsLive || pairsAll) {
  for (const [P, tag] of [[pairsLive, ''], [pairsAll, '-unreleased']]) {
    if (!P) continue;
    const specific = P.pairs.filter(p => p.V >= 15 && !p.ids.some(generic)).sort((a, b) => b.syn - a.syn).slice(0, 40);
    const noPartner = Object.entries(P.bestSyn).filter(([id, b]) => b.syn < 1.1).map(([id, b]) => ({id, name: nm(id), best: Math.round(b.syn * 100) / 100, hidden: !!SKILL_CARDS[id].unreleased, notMeasurable: isNotMeasurable(id), soloV: P.solo[id]}));
    const noSpecific = Object.entries(P.bestSpec).filter(([id, b]) => b.syn < 1.1 && !generic(id)).map(([id, b]) => ({id, name: nm(id), best: Math.round(b.syn * 100) / 100, with: b.with && bar(b.with), hidden: !!SKILL_CARDS[id].unreleased, notMeasurable: isNotMeasurable(id) || EATERS.has(kindOf(id)), soloV: P.solo[id]}));
    const md = [`# Chain sweep 2${tag ? ' and 4' : ''}: pairs and triples, ${P.label} pool (${P.count} cards)`, '', ASSUMPTIONS_MD, '', MEASURED_MD, '',
      `Synergy = value of the combination / sum of the cards alone (alone = best of the card by itself or beside a dead filler card; denominator at least ${FLOOR}). Pairs: ${P.pairs.length} ordered; ${P.eligibleCount} with value >= 15. Triples: ${P.tripleCount} seeded from the top 300 pairs.`, '',
      '## Top 40 pairs by synergy', '', mdTable(['#', 'Pair (left > right)', 'Value', 'Synergy', 'c/g/s asked'], P.topPairs.slice(0, 40).map((p, i) => [i + 1, bar(p.ids), fmt(p.V, 1), fmt(p.syn, 2), profLine(evalChain(p.ids))])), '',
      '## Top 40 specific pairs (neither card is a wildcard Boost, Echo, Chameleon, Refrain or Keystone)', '', mdTable(['#', 'Pair (left > right)', 'Value', 'Synergy', 'c/g/s asked'], specific.map((p, i) => [i + 1, bar(p.ids), fmt(p.V, 1), fmt(p.syn, 2), profLine(evalChain(p.ids))])), '',
      '## Top 40 triples by synergy', '', mdTable(['#', 'Triple', 'Value', 'Synergy', 'c/g/s asked'], P.triples.slice(0, 40).map((p, i) => [i + 1, bar(p.ids), fmt(p.V, 1), fmt(p.syn, 2), profLine(evalChain(p.ids))])), '',
      '## Best 5-card chains found by beam search', '', mdTable(['#', 'Chain', 'Value', 'c/g/s asked'], P.quints.slice(0, 20).map((p, i) => [i + 1, bar(p.ids), fmt(p.V, 1), profLine(evalChain(p.ids))])), '',
      `## Cards whose best synergy is under 1.1 (${noPartner.length})`, '', mdTable(['Card', 'Hidden', 'Not measurable', 'Alone V', 'Best synergy'], noPartner.map(c => [c.name, c.hidden ? 'yes' : '', c.notMeasurable ? 'yes' : '', fmt(c.soloV, 1), c.best])), '',
      `## Cards with no specific partner (best synergy with a non-wildcard card under 1.1; Echo, Chameleon, Refrain, Keystone and wildcard Boosts excluded) (${noSpecific.length})`, '',
      mdTable(['Card', 'Hidden', 'Not measurable', 'Alone V', 'Best specific synergy', 'Best specific partner'], noSpecific.map(c => [c.name, c.hidden ? 'yes' : '', c.notMeasurable ? 'yes' : '', fmt(c.soloV, 1), c.best, c.with || '-'])), ''].join('\n');
    writeOut('chain-sweep-pairs' + tag, {label: P.label, specific, topPairs: P.topPairs, triples: P.triples, quints: P.quints, noPartner, noSpecific, bestSyn: P.bestSyn, bestSpec: P.bestSpec, solo: P.solo}, md);
  }
}
if (pairsAll) {
  const rows = ALL.map(d => { const r = evalChain([d.id]), b = pairsAll.bestSyn[d.id]; const text = (d.ruleBands || []).map(x => x.text).filter(Boolean).join(' | ');
    return {id: d.id, name: nm(d.id), rarity: d.rarity, hidden: !!d.unreleased, solo: r.by, soloV: r.V, bestSyn: Math.round(b.syn * 100) / 100, partner: b.with && bar(b.with), text, notMeasurable: isNotMeasurable(d.id)}; });
  writeOut('chain-sweep-cards', rows, ['# Chain sweep: every card alone, and its best partner', '', 'Asked Sparks per flight when the card is alone (careful / greedy / stylish), value, best synergy and the best chain it was found in (all cards).', '',
    mdTable(['Card', 'Rarity', 'Hidden', 'Alone c/g/s', 'Alone V', 'Best synergy', 'Best partner chain', 'Card text'], rows.map(r => [r.name, r.rarity[0], r.hidden ? 'yes' : '', PNAMES.map(p => r.solo[p].asked).join(' / '), r.soloV, r.bestSyn, r.partner || '-', r.text.split('|').join('/')]))].join(String.fromCharCode(10)));
}
writeOut('chain-sweep-all', result, `# Chain sweep: all raw results are in chain-sweep-*.json\n\nGenerated ${result.meta.generated}. Run time ${((Date.now() - T0) / 1000).toFixed(0)} s. Evaluated ${cache.size} distinct chains.\n`);
lap(`finished; ${cache.size} chains`);
