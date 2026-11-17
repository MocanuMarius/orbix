// Batch 1 of the approved v1.0-cards proposals: Keystone, Vanguard, Bookends, Empty Chair, Ladder, Twin Flame, Spill Jar.
// One focused rule test per card: fires in the right position or condition, not otherwise, and stops when unmounted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS, LIVE_CARDS, makeSkillCard, createCardExecution, resolveCardRow, isUnofferedCard} from '../dist/skill-cards.mjs';
import {createMeterHost, CardEngine, playerEvent} from '../dist/card-engine.mjs';

const ids = ['keystone', 'vanguard', 'bookends', 'empty-chair', 'ladder', 'twin-flame', 'spill-jar'];
const row = list => list.map((id, i) => id ? makeSkillCard(id, `b${i}`) : null);
const EVENT = {kind: 'body-spark', pickupKind: 'light', meterFraction: 0.1, firstCrossing: true};
const fire = list => resolveCardRow(createCardExecution(row(list)), EVENT).sparks;
const BS = fire(['body-spark']); // one Body Spark's Sparks

test('the batch is in the catalog, unreleased and never offered', () => {
  assert.equal(BS, 2);
  for (const id of ids) {
    assert.equal(SKILL_CARDS[id].unreleased, true, id);
    assert.ok(isUnofferedCard(id) && !LIVE_CARDS.includes(SKILL_CARDS[id]), id);
  }
  assert.deepEqual(ids.map(id => SKILL_CARDS[id].rarity), ['rare', 'common', 'rare', 'common', 'rare', 'rare', 'common']);
});

test('Vanguard: +3 in Slot 1, +1 in any other Slot, nothing when unmounted', () => {
  assert.equal(fire(['vanguard', null, null]), 3);
  assert.equal(fire([null, 'vanguard', null]), 1);
  assert.equal(fire([null, null, 'vanguard']), 1);
  assert.equal(fire(['body-spark', null, null]), BS);
});

test('Empty Chair: +2 Sparks for each empty Slot, none when full, nothing when unmounted', () => {
  assert.equal(fire(['empty-chair', null, null]), 4);
  assert.equal(fire(['empty-chair', null, null, null, null]), 8);
  assert.equal(fire(['empty-chair', 'body-spark', null]), BS + 2);
  assert.equal(fire(['empty-chair', 'body-spark', 'body-spark']), 2 * BS, 'a full Chain gives nothing');
  assert.equal(fire(['body-spark', null, null]), BS);
});

test('Ladder: +1 Spark for each card to its left, nothing alone, nothing when unmounted', () => {
  assert.equal(fire(['body-spark', 'body-spark', 'ladder']), 2 * BS + 2);
  assert.equal(fire(['body-spark', 'ladder', null]), BS + 1);
  assert.equal(fire(['ladder', null, null]), 0);
  assert.equal(fire(['body-spark', null, 'ladder']), BS + 1, 'only cards count, not empty Slots');
  assert.equal(fire(['body-spark', 'body-spark', null]), 2 * BS);
});

test('Twin Flame: every card before it x3 only with exactly 2 cards before it', () => {
  assert.equal(fire(['body-spark', 'body-spark', 'twin-flame']), 3 * 2 * BS);
  assert.equal(fire(['body-spark', 'twin-flame', null]), BS, 'one card before it');
  assert.equal(fire(['body-spark', 'body-spark', 'body-spark', 'twin-flame']), 3 * BS, 'three cards before it');
  assert.equal(fire(['body-spark', null, 'body-spark', 'twin-flame']), 3 * 2 * BS, 'empty Slots do not count');
  assert.equal(fire(['body-spark', 'body-spark', null]), 2 * BS);
});

test('Bookends: every card before it x2 when the first and last other cards share a Trigger', () => {
  assert.equal(fire(['body-spark', 'body-spark', 'bookends']), 2 * 2 * BS, 'Collect at both ends');
  assert.equal(fire(['body-spark', 'bookends', 'body-spark']), 2 * BS + BS, 'multiplies only what is before it');
  assert.equal(fire(['toll-bell', 'body-spark', 'bookends']), BS, 'Rhythm first, Collect last: no x2');
  assert.equal(fire(['body-spark', 'bookends', null]), BS, 'needs two other cards to compare');
  assert.equal(fire(['body-spark', 'body-spark', null]), 2 * BS);
});

test('Keystone: the cards on both sides fire twice, not itself, no stacking, uses spent each time, nothing when unmounted', () => {
  assert.equal(fire(['body-spark', 'keystone', 'body-spark']), 4 * BS);
  assert.equal(fire(['body-spark', null, 'body-spark']), 2 * BS);
  assert.equal(fire(['body-spark', 'body-spark', 'keystone']), BS + 2 * BS, 'only the neighbour on its left is doubled');
  assert.equal(fire(['body-spark', 'keystone', 'body-spark', 'keystone']), 4 * BS, 'two Keystones do not make it three');
  const runtime = createCardExecution(row(['low-wick', 'keystone', null])), before = runtime.cards[0].charges;
  assert.equal(resolveCardRow(runtime, EVENT).sparks, 10, 'Low Wick +5 twice');
  assert.equal(runtime.cards[0].charges, before - 2, 'each firing spends a use');
});

test('Spill Jar: half of a spill (rounded down) becomes Stored Sparks while mounted', () => {
  const run = list => {
    const runtime = createCardExecution(row(list)), host = createMeterHost({start: 10, max: 10}); host.runtime = runtime;
    const engine = new CardEngine(runtime, host);
    playerEvent(engine, host, 'collect', {}, 0);
    return host.storedTotal;
  };
  assert.equal(run(['body-spark', 'spill-jar']), 1, 'a 2-Spark spill keeps 1');
  assert.equal(run(['vanguard', 'body-spark', 'spill-jar']), 2, 'the whole chain spills 5; half rounded down is 2');
  assert.equal(run(['body-spark', null]), 0, 'nothing kept when unmounted');
});
