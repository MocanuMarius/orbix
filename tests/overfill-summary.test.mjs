// Work order 7: the final flight summary names how many Sparks spilled and what they became.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {overfillSummary} from '../dist/overfill-summary.mjs';
import {flightRewardCeremonyReceipt} from '../dist/flight-reward-ceremony.mjs';
import {getCondensationRules, condenseGlow} from '../dist/condensed-glow.mjs';

test('summary line: displayed Sparks spilled, Stored Sparks made, and the real rate', () => {
  const rules = getCondensationRules({});
  const s = overfillSummary({pickupOverflow: 200, pickupCondensedGlow: 10}, rules);
  assert.equal(s.sparks, 60);          // internal 200 shows as 60 Sparks
  assert.equal(s.per, 6);
  assert.equal(s.stored, 10);
  assert.equal(s.text, 'Overfill · 60 → +10 Stored (1 per 6)');
  assert.equal(s.long, '60 Sparks spilled past a full meter and became +10 Stored Sparks, 1 per 6.');
  // The rate printed is the one condenseGlow applies.
  assert.equal(condenseGlow(200, {rules}).amount, 10);
  assert.match(overfillSummary({pickupOverflow: 4, pickupCondensedGlow: 0}, rules).long, /^1 Spark spilled/);
  assert.equal(overfillSummary({pickupOverflow: 0}, rules), null, 'nothing spilled, no line');
  assert.equal(overfillSummary({}, rules), null);
  assert.equal(overfillSummary(null, rules), null);
});

test('a better packing rate is printed as it is', () => {
  const rules = getCondensationRules({'main-afterglow': 1});
  const s = overfillSummary({pickupOverflow: 200, pickupCondensedGlow: 20}, rules);
  assert.equal(s.per, 3);
  assert.match(s.text, /\(1 per 3\)$/);
});

test('the ceremony receipt carries the line only when something spilled', () => {
  const s = M.newState(), r = s.run = M.createRun(s.profile, 'spill-line');
  assert.ok(M.selectNode(r, M.getChoices(r)[0].id));assert.ok(M.beginFlightAttempt(r));
  assert.ok(M.finishFlight(r, {success: true, flame: 40, condensedGlow: 20, pickupOverflow: 200}));M.settleCheckpoint(s);
  const withSpill = flightRewardCeremonyReceipt(r);
  assert.ok(withSpill.notes.some(t => /^Overfill · 60 → \+\d+ Stored \(1 per 6\)$/.test(t)), withSpill.notes.join(' / '));
  const t = M.newState(), q = t.run = M.createRun(t.profile, 'no-spill');
  assert.ok(M.selectNode(q, M.getChoices(q)[0].id));assert.ok(M.beginFlightAttempt(q));
  assert.ok(M.finishFlight(q, {success: true, flame: 40, condensedGlow: 0, pickupOverflow: 0}));M.settleCheckpoint(t);
  assert.ok(!flightRewardCeremonyReceipt(q).notes.some(x => /^Overfill/.test(x)));
});
