// Real flight: Wind Feather fires on the real Finish and keeps its +1% on the card (2026-11-18, owner: "nothing changed").
import test from 'node:test';
import assert from 'node:assert/strict';
import { flyRealNode, M } from '../scripts/balance/real-flight-check.mjs';
import { cardTallyLine } from '../dist/skill-cards.mjs';

const speed = run => M.getRunModifiers(run).speed;

test('a real cleared flight with Wind Feather mounted puts +1% on the card and speeds the next flight', () => {
  const r = flyRealNode({ ids: ['wind-feather'] });
  assert.ok(r.record.success && r.finished);
  const rc = r.run.lastFlight.cardClearReceipt;
  assert.equal(rc.cruisingSpeed, 1);
  assert.ok(rc.steps.some(step => step.sourceCardId === 'wind-feather' && step.success), 'the card fired on Finish');
  assert.equal(r.run.mountedCards[0].tally, 1);
  assert.equal(cardTallyLine(r.run.mountedCards[0]), '+1% speed · now +1%');
  assert.ok(Math.abs(speed(r.run) - 1.01) < 1e-9);
});

test('not mounted: no growth, no speed. At +10% it stops. Unmounting removes the bonus', () => {
  const none = flyRealNode({ ids: ['body-spark'] });
  assert.equal(none.run.lastFlight.cardClearReceipt.cruisingSpeed, 0);
  assert.ok(Math.abs(speed(none.run) - 1) < 1e-9);
  const full = flyRealNode({ ids: ['wind-feather'], mutate: run => { run.mountedCards[0].tally = 10; } });
  assert.equal(full.run.mountedCards[0].tally, 10);
  assert.equal(full.run.lastFlight.cardClearReceipt.cruisingSpeed, 0);
  assert.ok(Math.abs(speed(full.run) - 1.1) < 1e-9);
  full.run.mountedCards[0] = null;
  assert.ok(Math.abs(speed(full.run) - 1) < 1e-9);
});
