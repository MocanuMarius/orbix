import test from 'node:test';
import assert from 'node:assert/strict';
import { WispFlight, FLIGHT_TUNING } from '../dist/flight.mjs';
import { LiftGuide, LIFT_GUIDE_TUNING } from '../dist/flight-projection.mjs';

function flight(modifiers = {}) {
  const e = new WispFlight({
    canvas: { getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 900, height: 430 }) },
    preflight: true, seed: 'guide-physical-cadence', modifiers: { cardLiftGuide: true, ...modifiers },
  });
  Object.assign(e, { running: true, tutorialAwaitingLift: false, biomeDynamics: null, spacetime: null, atlas: null, flame: 100 });
  e.resumeElapsed = e.resumeRampSeconds;
  e.layout.obstacles = [];
  e.layout.boss = null;
  e.layout.embers = [];
  e.drafts.zones = [];
  e.blackHoles = { update() {}, stop() {}, items: [] };
  e.player.y = 300;
  return e;
}

test('Guide reads present velocity without accessing terrain, light, altitude or route predictions', () => {
  const e = { running: true, alive: true, time: 1, scaleY: 1, mod: { cardLiftGuide: true }, player: { vy: 205 }, nextLiftCost: 3, availableGlow: 50 };
  for (const key of ['layout', 'blackHoles', 'atlas', 'getLightState', 'distance', 'height'])
    Object.defineProperty(e, key, { get() { throw Error(`Guide read ${key}`); } });
  Object.defineProperty(e.player, 'y', { get() { throw Error('Guide read altitude'); } });
  const guide = new LiftGuide(FLIGHT_TUNING);
  assert.equal(guide.read(e).phase, 'open');
  assert.equal(e.player.vy, 205); assert.equal(e.availableGlow, 50);
  e.player.vy = 245;
  assert.equal(guide.read(e).late, true, 'a late cue remains subtly actionable');
  assert.equal(guide.projections, 0);
});

test('actual Lift resets descent and returns to its starting altitude at about 1.37s, before terminal fall', () => {
  for (const initialDescent of [0, 100, 245]) {
    const e = flight();
    try {
      e.player.vy = initialDescent;
      assert.ok(e.flap());
      assert.equal(e.player.vy, -205 * e.scaleY);
      assert.equal(e.getLiftGuide(), null, 'no immediate repeat after a manual Lift');
      let apex = null, returned = null;
      for (let i = 0; i < 180; i++) {
        e.step(1 / 120);
        if (!apex && e.player.vy >= 0) apex = e.time;
        if (apex && e.player.y >= 300) { returned = { time: e.time, vy: e.player.vy }; break; }
      }
      assert.ok(apex > .67 && apex < .70);
      assert.ok(returned.time > 1.34 && returned.time < 1.39);
      assert.ok(returned.vy / e.scaleY > 195 && returned.vy / e.scaleY < 215);
      assert.ok(returned.vy < FLIGHT_TUNING.terminalFall * e.scaleY);
      assert.equal(e.getLiftGuide().phase, 'open');
    } finally { e.destroy(); }
  }
});

test('ordinary flight offers repeated early cadence cues at actual velocity and never supplies input', () => {
  const e = flight();
  try {
    assert.ok(e.flap());
    const periods = [], cueTimes = []; let last = e.time;
    for (let i = 0; i < 840 && periods.length < 4; i++) {
      e.step(1 / 120);
      const cue = e.getLiftGuide();
      if (cue?.phase === 'soon' && (!cueTimes.length || cueTimes.at(-1) < last)) {
        cueTimes.push(e.time);
        assert.ok(cue.opensIn <= LIFT_GUIDE_TUNING.lead);
      }
      if (e.player.vy >= 205 * e.scaleY) {
        assert.equal(cue.phase, 'open');
        periods.push(e.time - last); last = e.time;
        const flaps = e.flaps;
        e.getLiftGuide(); assert.equal(e.flaps, flaps);
        assert.ok(e.flap()); assert.equal(e.getLiftGuide(), null);
      }
    }
    assert.equal(periods.length, 4);
    assert.equal(cueTimes.length, 4);
    assert.ok(periods.every(period => period > 1.35 && period < 1.39));
    assert.equal(e.dying, false);
  } finally { e.destroy(); }
});

test('modified impulse/gravity scale the cue and unavailable input or fuel keeps it quiet', () => {
  const e = flight({ flap: .8, gravity: 1.2 });
  try {
    e.player.vy = 164 * e.scaleY;
    assert.equal(e.getLiftGuide().phase, 'open');
    e.player.vy = (164 - 360 * .25) * e.scaleY;
    assert.equal(e.getLiftGuide().phase, 'soon');
    for (const [key, value] of [['paused', true], ['running', false], ['liftHeld', true], ['dying', true], ['flame', 0]]) {
      const previous = e[key]; e[key] = value;
      assert.equal(e.getLiftGuide(), null, key); e[key] = previous;
    }
    e.mod.cardLiftGuide = false;
    assert.equal(e.getLiftGuide(), null);
  } finally { e.destroy(); }
});
