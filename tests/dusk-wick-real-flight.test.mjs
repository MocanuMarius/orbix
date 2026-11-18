// Dusk Wick (all ranks) in real flights. The owner saw "no effect on Collect" on a mounted Dusk Wick II. The card works:
// it fires and pays on every Dusk Spark the wisp touches. Dusk Sparks are optional side-lane pickups: 2 to 4 per course
// (dist/dusk-sparks.mjs), and the repository pilot only takes one when its meter is under 40%, so these flights add a
// steering assist (like seekFlare) that flies the wisp through each Dusk Spark.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, sum, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';

/** Assist: steer toward the next uncollected Dusk Spark ahead, the way a player who wants it would. */
function seekDusk(e) {
  const step = e.step.bind(e);
  e.step = dt => {
    const d = e.layout.embers.find(p => p.kind === 'dusk' && !p.collected);
    const dx = d ? d.x - (e.distance + e.player.x) : 1e9;
    if (d && dx > -20 && dx < 420) { const dy = d.y - e.player.y; e.player.y += Math.max(-3, Math.min(3, dy)); if (e.player.vy * dy < 0) e.player.vy *= .5; }
    return step(dt);
  };
}
const slotSum = (fl, slot, key) => sum(fl, f => f.log.slots[slot]?.[key] || 0);
const dusk = f => f.log.occurred.body.dusk || 0;
const levels = [BIOME_LEVELS[0], BIOME_LEVELS[4], BIOME_LEVELS[8], BIOME_LEVELS[12], BIOME_LEVELS[16], BIOME_LEVELS[20]].filter(Boolean);
const flights = (ids, opts = {}) => levels.flatMap((l, i) => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, hook: seekDusk, ...opts })));

test('Dusk Sparks: every course places 2 to 4', () => {
  const a = levels.flatMap(l => [0, 1, 2].map(seedIndex => fly({ ids: ['body-spark'], levelId: l.id, seedIndex })));
  const placed = a.map(f => f.log.engine.layout.embers.filter(p => p.kind === 'dusk').length);
  assert.ok(placed.every(n => n >= 2 && n <= 4), placed.join());
});

test('Dusk Wick I, II, III: fire once per Dusk Spark touched and pay 20 / 30 / 40', () => {
  for (const [id, pay] of [['dusk-wick', 20], ['dusk-wick-ii', 30], ['dusk-wick-iii', 40]]) {
    const a = flights([id]);
    const touched = sum(a, dusk);
    assert.ok(touched >= 20, `${id}: ${touched} Dusk Sparks touched`);
    assert.equal(slotSum(a, 0, 'fired'), touched, `${id} fires once per Dusk Spark`);
    assert.equal(slotSum(a, 0, 'sparks'), pay * touched, `${id} pays ${pay} each`);
  }
});

test('Dusk Wick II in Slot 3 behind other cards pays 30 per Dusk Spark; Echo to its left doubles, a Boost to its right doubles', () => {
  const behind = flights(['body-spark', 'lift-guide', 'dusk-wick-ii']);
  const n = sum(behind, dusk);
  assert.ok(n >= 20);
  assert.equal(slotSum(behind, 2, 'fired'), n); assert.equal(slotSum(behind, 2, 'sparks'), 30 * n);
  const echo = flights(['echo', 'dusk-wick-ii']);
  const ne = sum(echo, dusk);
  assert.equal(slotSum(echo, 1, 'fired') + slotSum(echo, 0, 'fired'), 2 * ne, 'Echo repeats it: two firings per Dusk Spark');
  assert.equal(slotSum(echo, 1, 'sparks') + slotSum(echo, 0, 'sparks'), 60 * ne);
  const boost = flights(['dusk-wick-ii', 'crescendo']);
  const nb = sum(boost, dusk);
  assert.equal(slotSum(boost, 0, 'fired'), nb); assert.equal(slotSum(boost, 0, 'sparks'), 60 * nb, 'Crescendo (x2) to its right doubles the 30');
});

test('the pilot alone, left to itself, takes few Dusk Sparks: the card is alive but conditional (numbers for the report)', () => {
  const a = levels.flatMap((l, i) => [0, 1, 2].map(seedIndex => fly({ ids: ['dusk-wick-ii'], levelId: l.id, seedIndex })));
  const placed = sum(a, f => f.log.engine.layout.embers.filter(p => p.kind === 'dusk').length), taken = sum(a, dusk);
  assert.ok(taken < placed, `${taken} of ${placed} taken by the pilot`);
  if (process.env.DUSK_REPORT) console.log(`Dusk Sparks: ${placed} placed in ${a.length} flights (${(placed / a.length).toFixed(2)} each), pilot took ${taken} (${(taken / a.length).toFixed(2)} each)`);
});
