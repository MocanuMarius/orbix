// Work order 5: a Skim charge fades fast once the player leaves the wall (0.5 s grace, a full meter empties in about 1 s).
import test from 'node:test';
import assert from 'node:assert/strict';
import {EdgingPulse, EDGING_PULSE_TUNING} from '../dist/edging-pulse.mjs';

const floor = {x: 0, width: 500, center: 385, gap: 0, bottomShape: [[0, 0], [500, 0], [500, 80], [0, 80]]};
const make = (mod = {}) => {
  const e = {mod: {proximityUnlocked: true, ...mod}, running: true, alive: true, height: 400, width: 900, time: 0, distance: 0,
    player: {x: 180, y: 350, radius: 10}, obstacleCenter: o => o.center};
  e.edgingPulse = new EdgingPulse(e);
  return e;
};
const step = (e, seconds, obstacles) => {for (let i = 0; i < Math.round(seconds * 60); i++) e.edgingPulse.update(1 / 60, obstacles);};
const leave = e => {e.player.y = 120;};   // far from every wall

test('constants: 0.5 s grace, a full meter empties in 1 s', () => {
  assert.equal(EDGING_PULSE_TUNING.graceSeconds, 0.5);
  assert.equal(EDGING_PULSE_TUNING.decayPerSecond, 1);
});

test('charge is held for the grace, then is gone about one second later', () => {
  const e = make(), p = e.edgingPulse;
  step(e, 1.6, [floor]);
  const held = p.charge;
  assert.ok(held > 0.5 && held < 1, `charging at the wall: ${held}`);
  leave(e);
  step(e, 0.45, [floor]);
  assert.ok(Math.abs(p.charge - held) < 1e-6, 'held during the 0.5 s grace');
  step(e, 0.05 + held, [floor]);                 // grace ends, then `held` seconds of decay at 1 per second
  assert.ok(p.charge < 0.03, `empty about ${held.toFixed(2)} s after grace: ${p.charge}`);
  step(e, 0.2, [floor]);
  assert.equal(p.charge, 0);
});

test('a card that slows the fade (Regenerative Pulse, 0.5) still works on the new scale, and a longer grace mod still extends it', () => {
  const slow = make({edgingDecayRate: 0.5}), fast = make();
  for (const e of [slow, fast]) {step(e, 1.6, [floor]);leave(e);step(e, 1.0, [floor]);}
  assert.ok(slow.edgingPulse.charge > fast.edgingPulse.charge);
  const long = make({edgingGrace: 2});
  step(long, 1.6, [floor]);leave(long);const c = long.edgingPulse.charge;step(long, 1.9, [floor]);
  assert.ok(Math.abs(long.edgingPulse.charge - c) < 1e-6, 'a 2 s grace is kept (the clamp no longer forces 1.25 s)');
});
