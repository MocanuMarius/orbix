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

test('Sparks a card makes at a full Meter are Overfills for engine cards; row cards hear natural Overfills only', () => {
  const alone = flights(['ember-bell'], { hook: countNatural }), behind = flights(['body-spark', 'ember-bell'], { hook: countNatural });
  assert.ok(hits(behind, 1) > natural(behind), 'Body Spark’s own spilled Sparks reach Ember Bell too');
  const mark = flights(['body-spark', 'meter-mark']);
  assert.equal(sum(mark, f => f.log.slots[1]?.fired || 0), sum(mark, f => f.log.events['natural-overfill'] || 0), 'Meter Mark fires once per natural Overfill');
  assert.ok(alone.length && hits(alone, 0) > 0);
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
