import test from 'node:test';
import assert from 'node:assert/strict';
import {createCord, stepCord, cordPoints, cordVariant, cordFor, CORD_POINTS} from '../dist/collector-cord.mjs';

const run = (variant, frames, dt, fn, reach = 100) => {
  const c = createCord();
  for (let i = 0; i <= frames; i++) { const t = i * dt, p = fn(t); stepCord(c, variant, p.ax, p.ay, p.bx, p.by, reach, t); }
  return c;
};
const finite = c => [...c.x, ...c.y].every(Number.isFinite);
const segLen = (c, i) => Math.hypot(c.x[i + 1] - c.x[i], c.y[i + 1] - c.y[i]);

test('the URL parameter picks the variant and defaults to a', () => {
  assert.equal(cordVariant(''), 'a'); assert.equal(cordVariant('?cord=b'), 'b'); assert.equal(cordVariant('?x=1&cord=D'), 'd'); assert.equal(cordVariant('?cord=zzz'), 'a');
});

for (const variant of ['b', 'c', 'd']) {
  test(`variant ${variant}: ends stay pinned, no NaN, at 30, 60 and 120 FPS with Lifts`, () => {
    for (const fps of [30, 60, 120]) {
      const c = run(variant, fps * 4, 1 / fps, t => ({ax: 110, ay: 200 + 40 * Math.sin(t * 6), bx: 40 + 60 * Math.sin(t), by: 230 + 20 * Math.cos(t * 3)}));
      assert.ok(finite(c));
      const pts = cordPoints(c, variant, 4);
      assert.ok([...pts].every(Number.isFinite));
      assert.equal(pts[0], c.ax); assert.equal(pts[1], c.ay); assert.equal(pts[(CORD_POINTS - 1) * 2], c.bx); assert.equal(pts[(CORD_POINTS - 1) * 2 + 1], c.by);
    }
  });
}

test('rope: a near catch hangs slack below the chord; pulled to its length it is straight and taut', () => {
  const near = run('b', 120, 1 / 60, () => ({ax: 150, ay: 200, bx: 110, by: 200}));
  assert.ok(near.y[6] > 205, 'slack sags'); assert.ok(near.taut < .1);
  // Caught at 100 px (the cord is that long), then the Wisp pulls away to 112 px: straight and taut.
  const c = createCord();
  for (let i = 0; i <= 120; i++) stepCord(c, 'b', 150, 200, i < 30 ? 50 : 38, 200, 100, i / 60);
  assert.ok(Math.abs(c.y[6] - 200) < 1.5, 'taut is straight'); assert.ok(c.taut > .9);
  // Segments never stretch beyond the rest length by more than a pixel.
  for (let i = 0; i < CORD_POINTS - 1; i++) assert.ok(segLen(near, i) <= 40 * 1.26 / 12 + 1);
});

test('a teleport of the endpoints resets the chain instead of stretching it', () => {
  const c = run('b', 60, 1 / 60, () => ({ax: 150, ay: 200, bx: 100, by: 200}));
  stepCord(c, 'b', 650, 90, 700, 90, 100, 1.1);
  assert.ok(finite(c)); assert.ok(Math.abs(c.x[0] - 650) < 1e-9 && Math.abs(c.x[6] - 675) < 8, 'rebuilt along the new chord');
  // A long pause (the cord was not drawn) also starts fresh.
  stepCord(c, 'b', 150, 200, 100, 200, 100, 9);
  assert.ok(Math.abs(c.y[1] - 200) < 10 && finite(c));
});

test('whip: waves move the middle of the cord sideways after launch, and settle', () => {
  const bx = i => i < 5 ? 50 : 40;
  const c = createCord();
  for (let i = 0; i <= 5; i++) stepCord(c, 'c', 150, 200, 50, 200, 100, i / 60);
  const early = cordPoints(c, 'c', 5 / 60), mid = Math.max(...Array.from({length: CORD_POINTS}, (_, i) => Math.abs(early[i * 2 + 1] - 200)));
  assert.ok(mid > 3, 'S-curve visible at launch');
  for (let i = 6; i <= 120; i++) stepCord(c, 'c', 150, 200, 40, 200, 100, i / 60);
  const late = cordPoints(c, 'c', 2), calm = Math.max(...Array.from({length: CORD_POINTS}, (_, i) => Math.abs(late[i * 2 + 1] - 200)));
  assert.ok(calm < 1.5, 'straight again when taut');
});

test('elastic: tension rises with stretch, overshoots, settles', () => {
  const c = createCord(); let peak = 0;
  for (let i = 0; i <= 240; i++) { stepCord(c, 'd', 150, 200, i < 30 ? 50 : 10, 200, 100, i / 60); if (i > 30) peak = Math.max(peak, c.tension); }
  assert.ok(peak > 1, 'overshoot'); assert.ok(c.tension <= 1.05 && c.tension > .9, 'settles at full stretch');
});

test('one cord per Collector index', () => {
  const e = {}; assert.notEqual(cordFor(e, 0), cordFor(e, 1)); assert.equal(cordFor(e, 0), cordFor(e, 0));
});
