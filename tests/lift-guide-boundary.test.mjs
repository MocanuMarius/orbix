import test from 'node:test';
import assert from 'node:assert/strict';
import { WispFlight } from '../dist/flight.mjs';
import { LIFT_GUIDE_TUNING } from '../dist/flight-projection.mjs';

function flight() {
  const e = new WispFlight({
    canvas: { getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 900, height: 430 }) },
    preflight: true, seed: 'guide-boundary', modifiers: { cardLiftGuide: true },
  });
  Object.assign(e, { running: true, tutorialAwaitingLift: false, biomeDynamics: null, spacetime: null, atlas: null, blackHoles: null, flame: 100 });
  e.resumeElapsed = e.resumeRampSeconds;
  e.layout.obstacles = [];
  e.layout.boss = null;
  e.drafts.zones = [];
  e.getLightState = () => ({ rehearsing: true });
  e.player.y = 300;
  e.player.vy = 50;
  e.getLiftGuide();
  e.liftGuide.clear();
  return e;
}

test('a visible lower-screen fall gets a paid late safe window without automatic input', () => {
  const e = flight(), guide = e.liftGuide;
  try {
    const before = { y: e.player.y, vy: e.player.vy, flame: e.flame, flaps: e.flaps };
    const coast = guide.forecast(e, null), plan = guide.search(e, e.getLightState());
    assert.equal(coast.contactKind, 'lower-boundary');
    assert.equal(guide.visible(e, coast, e.getLightState()), false, 'the terminal point itself leaves the screen');
    assert.ok(plan, 'the visible approach to the known boundary still permits advice');
    assert.equal(plan.cost, e.flapCost);
    assert.equal(plan.at, .8, 'equally useful paid routes prefer the later safe input');
    for (const delay of [.32, plan.start, plan.at, plan.end]) {
      const path = guide.forecast(e, delay);
      assert.equal(path.contact, false);
      assert.equal(guide.visible(e, path, e.getLightState()), true);
    }
    assert.ok(Math.abs(plan.end - plan.start - LIFT_GUIDE_TUNING.window) < 1e-9);
    assert.deepEqual({ y: e.player.y, vy: e.player.vy, flame: e.flame, flaps: e.flaps }, before);
  } finally { e.destroy(); }
});

test('the Guide keeps dark approaches, upper-edge risk and successful route exits quiet', () => {
  const e = flight(), guide = e.liftGuide;
  try {
    assert.equal(guide.search(e, { radius: 1, intensity: 0 }), null);
    e.totalDistance = e.distance + 40;
    const finish = guide.forecast(e, null);
    assert.equal(finish.exit, true);
    assert.equal(guide.search(e, e.getLightState()), null);
    e.totalDistance = 10000;
    e.player.y = e.player.radius + 6;
    e.player.vy = -50;
    assert.equal(guide.search(e, e.getLightState()), null);
    assert.equal(guide.visible(e, guide.forecast(e, 0), e.getLightState()), false);
  } finally { e.destroy(); }
});

test('the real predictor returns to its Lift altitude after about 1.37 seconds regardless of prior descent', () => {
  const e = flight();
  try {
    const distances = [];
    for (const descent of [0, 100]) {
      e.player.vy = descent;
      const path = e.liftGuide.projection.predict(e, 3, [0]);
      const apex = path.points.reduce((best, point) => point.y < best.y ? point : best);
      const returned = path.points.find(point => point.time > apex.time && point.y >= e.player.y);
      assert.ok(returned.time >= 1.3 && returned.time <= 1.4);
      assert.ok(apex.time >= .6 && apex.time <= .75);
      distances.push(returned.x - path.points[0].x);
    }
    assert.equal(distances[0], distances[1], 'Lift resets velocity rather than adding to descent');
    assert.ok(distances[0] > 195 && distances[0] < 220);
  } finally { e.destroy(); }
});
