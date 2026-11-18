import test from 'node:test';
import assert from 'node:assert/strict';
import {createCord, stepCord, cordPoints, cordLook, straightPoints, cordFor, CORD_POINTS} from '../dist/collector-cord.mjs';

const run = (frames, dt, fn) => { const c = createCord(); for (let i = 0; i <= frames; i++) { const t = i * dt, p = fn(t); stepCord(c, p.ax, p.ay, p.bx, p.by, 100, t); } return c; };

test('ends stay pinned and nothing is NaN at 30, 60 and 120 FPS with Lifts', () => {
  for (const fps of [30, 60, 120]) {
    const c = run(fps * 4, 1 / fps, t => ({ax: 110, ay: 200 + 40 * Math.sin(t * 6), bx: 40 + 60 * Math.sin(t), by: 230 + 20 * Math.cos(t * 3)}));
    assert.ok(Number.isFinite(c.tension) && Number.isFinite(c.tv));
    const pts = cordPoints(c, 4, 0);
    assert.ok([...pts].every(Number.isFinite));
    assert.deepEqual([pts[0], pts[1], pts[(CORD_POINTS - 1) * 2], pts[(CORD_POINTS - 1) * 2 + 1]], [c.ax, c.ay, c.bx, c.by]);
  }
});

test('thickness is 3 px slack, 2 px, 1 px at full stretch, in whole pixels', () => {
  const c = createCord();
  for (const [tension, width] of [[0, 3], [.29, 3], [.45, 2], [.64, 2], [.7, 1], [1.3, 1], [-.2, 3]]) { c.tension = tension; assert.equal(cordLook(c).width, width); }
});

test('a cord pulled tight stretches to 1 px, a cord let go returns to 3 px, with a bounce past the target', () => {
  const c = createCord(); let peak = 0;
  for (let i = 0; i <= 240; i++) { stepCord(c, 150, 200, i < 60 ? 100 : -70, 200, 100, i / 60); if (i > 60) peak = Math.max(peak, c.tension); }
  assert.equal(cordLook(c).width, 1); assert.ok(peak > 1, 'overshoot');
  for (let i = 241; i <= 420; i++) stepCord(c, 150, 200, 110, 200, 100, i / 60);
  assert.equal(cordLook(c).width, 3);
});

test('a new tow starts slack with a snap, a teleport or a long pause resets it', () => {
  const c = run(60, 1 / 60, () => ({ax: 150, ay: 200, bx: 100, by: 200}));
  stepCord(c, 650, 90, 700, 90, 100, 1.1);
  assert.equal(c.d0, 50); assert.equal(c.tension, 0);
  stepCord(c, 150, 200, 100, 200, 100, 9);
  assert.equal(c.t, 9); assert.equal(c.tension, 0);
});

test('drop-off bounce moves the middle sideways for several frames; reduced motion is a plain straight line', () => {
  const c = run(30, 1 / 60, () => ({ax: 150, ay: 200, bx: 50, by: 200}));
  let moved = 0;
  for (let k = 1; k <= 10; k++) { const p = cordPoints(c, 1, k / 10 * .8); if (Math.abs(p[13] - 200) > 3) moved++; }
  assert.ok(moved >= 6, 'visible on most of the drop-off frames');
  const s = straightPoints(c); for (let i = 0; i < CORD_POINTS; i++) assert.ok(Math.abs(s[i * 2 + 1] - 200) < 1e-9);
});

test('one cord per Collector index', () => {
  const e = {}; assert.notEqual(cordFor(e, 0), cordFor(e, 1)); assert.equal(cordFor(e, 0), cordFor(e, 0));
});
