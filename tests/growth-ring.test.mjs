// Real flight: Growth Ring keeps its +1 max Spark on the card (2026-11-18, "effect lives on the card"), like Wind Feather.
import test from 'node:test';
import assert from 'node:assert/strict';
import { flyRealNode, M } from '../scripts/balance/real-flight-check.mjs';
import { cardTallyLine, getCardTallyCapacity, CARD_UNIT } from '../dist/skill-cards.mjs';
import { getGlowCapacity, GLOW_CAPACITY_LIMIT_UNITS } from '../dist/vitality.mjs';

test('a real cleared flight puts +1 max Spark on the mounted ring; nothing goes to the run or profile bank', () => {
  const r = flyRealNode({ ids: ['growth-ring'] });
  assert.ok(r.record.success && r.finished);
  const rc = r.run.lastFlight.cardClearReceipt;
  assert.equal(rc.futureCapacity, 0); assert.equal(rc.tallyCapacity, 1);
  assert.equal(r.run.mountedCards[0].tally, 1);
  assert.equal(r.run.cardFutureCapacity, 0);
  assert.equal(cardTallyLine(r.run.mountedCards[0]), '+1 max Spark · now +1');
  assert.equal(getCardTallyCapacity(r.run), CARD_UNIT);
});

test('not mounted: no growth, and the capacity leaves with the card; old banked capacity is kept; cap 100 holds', () => {
  const none = flyRealNode({ ids: ['body-spark'] });
  assert.equal(none.run.lastFlight.cardClearReceipt.tallyCapacity, 0);
  const ring = flyRealNode({ ids: ['growth-ring'], mutate: run => { run.mountedCards[0].tally = 4; run.cardFutureCapacity = 7; } });
  assert.equal(ring.run.mountedCards[0].tally, 5); assert.equal(ring.run.cardFutureCapacity, 7, 'banked by an old save: kept, not added to');
  const withRing = getGlowCapacity(ring.run);
  ring.run.mountedCards[0] = null;
  assert.ok(Math.abs(withRing - getGlowCapacity(ring.run) - 5 * CARD_UNIT) < 1e-9);
  const huge = flyRealNode({ ids: ['growth-ring'], mutate: run => { run.mountedCards[0].tally = 900; } });
  assert.ok(getGlowCapacity(huge.run) <= GLOW_CAPACITY_LIMIT_UNITS + 1e-9);
});
