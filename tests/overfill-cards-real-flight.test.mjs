// Overfill cards in real flights (2026-11-20 check, "Overfill does not work with cards, maybe?"): every released Overfill card
// answers the Overfills the pilot really makes by collecting at a full Meter, alone and behind Body Spark, and a delivered Spark counts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, sum, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';

const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
const flights = (ids, opts = {}) => levels.flatMap(l => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, engineOptions: { cardPilot: true }, ...opts })));
const hits = (fl, slot) => sum(fl, f => (f.log.engine.cardEngine?.log || []).filter(x => x.k === 'hit' && x.type === 'overfill' && x.slot === slot).length);
const natural = fl => sum(fl, f => f.log.engine.__natural || 0);
const countNatural = e => { e.__natural = 0; const o = e.storeNaturalOverflow.bind(e); e.storeNaturalOverflow = (p, s, a, n, c) => { if (n > 1e-7) e.__natural++; return o(p, s, a, n, c); }; };

test('Engine Overfill cards (Ember Bell, Overflow Bell, Pressure Valve, Floodgate) answer every natural Overfill', () => {
  for (const id of ['ember-bell', 'overflow-bell', 'pressure-valve', 'floodgate']) {
    const a = flights([id], { hook: countNatural });
    assert.ok(natural(a) >= 5, `${id}: the pilot overfills`);
    if (id === 'floodgate') assert.ok(hits(a, 0) >= 1); else assert.equal(hits(a, 0), natural(a), `${id} hears each natural Overfill`);
  }
});

test('One Overfill rule: Sparks a card makes at a full Meter are Overfills for engine cards AND row cards (Meter Mark, Ring Spring, Spillway)', () => {
  const alone = flights(['ember-bell'], { hook: countNatural }), behind = flights(['body-spark', 'ember-bell'], { hook: countNatural });
  assert.ok(hits(behind, 1) > natural(behind), 'Body Spark’s own spilled Sparks reach Ember Bell too');
  assert.ok(alone.length && hits(alone, 0) > 0);
  // Meter Mark alone only ever hears pickups (no card makes Sparks), so it fires once per natural Overfill; behind Body Spark it also hears Body Spark’s spill.
  const lone = flights(['meter-mark'], { hook: countNatural });
  assert.equal(sum(lone, f => f.log.slots[0]?.fired || 0), natural(lone), 'alone: once per natural Overfill');
  const mark = flights(['body-spark', 'meter-mark'], { hook: countNatural });
  const fired = sum(mark, f => f.log.slots[1]?.fired || 0);
  assert.ok(fired > natural(mark), `Meter Mark hears card-made spill: ${fired} > ${natural(mark)} natural`);
  assert.equal(sum(mark, f => f.log.slots[1]?.stored || 0), fired, 'it keeps 1 Stored Spark per Overfill');
  // Events flow right only: Meter Mark to the LEFT of the maker does not hear the maker’s spill.
  const left = flights(['meter-mark', 'body-spark'], { hook: countNatural });
  assert.equal(sum(left, f => f.log.slots[0]?.fired || 0), natural(left), 'a Meter Mark left of Body Spark hears pickups only');
  // Ring Spring banks seconds for each card-made Overfill too.
  const spring = flights(['body-spark', 'ring-spring'], { hook: countNatural });
  assert.ok(sum(spring, f => f.log.slots[1]?.fired || 0) > natural(spring), 'Ring Spring hears card-made spill');
  // Spillway counts card-made Overfills toward its Pulse.
  const wayCounts = (ids, hook) => flights(ids, { hook }).map(f => f.log.engine.overfillWave?.waves || 0);
  const plain = sum(wayCounts(['spillway-ii'], () => {}), x => x), cardless = sum(wayCounts(['spillway-ii'], e => { e.cardSpillHeard = () => {}; }), x => x);
  const withMaker = sum(wayCounts(['body-spark', 'spillway-ii'], () => {}), x => x), makerBefore = sum(wayCounts(['body-spark', 'spillway-ii'], e => { e.cardSpillHeard = () => {}; }), x => x);
  assert.ok(withMaker > makerBefore, `Spillway II behind Body Spark: ${makerBefore} -> ${withMaker} Pulses`);
  assert.equal(plain, cardless, 'with no maker there is no card-made spill');
});

test('One Overfill rule never loops: no safety limit, and the engine stays within its Sparks', () => {
  for (const ids of [['body-spark', 'meter-mark', 'ring-spring'], ['body-spark', 'ember-bell', 'meter-mark', 'floodgate'], ['courier-cord', 'meter-mark', 'pressure-valve'], ['lift-guide', 'echo', 'body-spark', 'meter-mark', 'spillway-ii']]) {
    for (const f of flights(ids)) assert.ok(!f.log.engine.cardEngine?.warned, `${ids.join('+')}: safety limit reached`);
  }
});

test('Courier Cord: a dripped Spark that finds the Meter full is an Overfill (Overfill cards to its right hear it)', () => {
  const run = ids => fly({ ids, levelId: BIOME_LEVELS[0].id, seedIndex: 0, duration: 90, engineOptions: { cardPilot: true },
    hook: e => { const st = e.step.bind(e); e.step = dt => { e.flame = e.maxFlame; return st(dt); }; } });
  const bell = run(['courier-cord', 'ember-bell']), mark = run(['courier-cord', 'meter-mark']);
  const drips = f => f.log.engine.cardEngine?.log || [];
  assert.ok(drips(bell).filter(x => x.k === 'hit' && x.type === 'overfill' && x.from === 0).length >= 1, 'Ember Bell hears a dripped Spark that spilled');
  assert.ok((mark.log.slots[1]?.fired || 0) >= 1, 'Meter Mark hears it');
  assert.ok((mark.log.slots[1]?.stored || 0) === (mark.log.slots[1]?.fired || 0));
});

test('Spillway and Spillway II send more Pulses than the plain every-third-Overfill Pulse (the flight needs cardPilot, which the app sets)', () => {
  const base = sum(flights(['ember-bell']), f => f.log.engine.overfillWave?.waves || 0);
  const s1 = sum(flights(['spillway']), f => f.log.engine.overfillWave?.waves || 0), s2 = sum(flights(['spillway-ii']), f => f.log.engine.overfillWave?.waves || 0);
  assert.ok(s1 > base && s2 > s1, `${base} < ${s1} < ${s2}`);
});

test('A Spark the Collector delivers to a full Meter is an Overfill for Overfill cards', () => {
  let d = 0;
  const f = fly({ ids: ['ember-bell'], levelId: BIOME_LEVELS[0].id, seedIndex: 0, duration: 90, engineOptions: { cardPilot: true },
    hook: e => { const o = e.storeNaturalOverflow.bind(e); e.storeNaturalOverflow = (p, s, a, n, c) => { if (n > 1e-7 && p.deliveredByWisp) d++; return o(p, s, a, n, c); };
      const st = e.step.bind(e); e.step = dt => { e.flame = e.maxFlame; return st(dt); }; } });
  assert.ok(d >= 1, 'a delivery overfilled');
  const bell = (f.log.engine.cardEngine?.log || []).filter(x => x.k === 'hit' && x.type === 'overfill').length;
  assert.ok(bell >= d);
});
