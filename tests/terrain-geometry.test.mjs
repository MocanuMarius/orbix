import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildFlightLayout, obstaclePolygons, circleHitsPolygon } from '../dist/flight.mjs';

const TERRAIN = ['ruins', 'canopy', 'storm'];
// Captured before the visual-profile replacement. Geometry must not change the
// established encounter timing, random stream, or the promised pickup budget.
const BASELINES = {
  'ruins:2': { hash: '6f21c5c778cff370132ee55ecf26b0fa46b80aa694b6333636d1bc0fc5e235cd', budget: [14, 12, 10, 2] },
  'ruins:7': { hash: '80eca40d41fd46330dc9c2b674323013fd7562b0d1adb3a52c8f9f0238ffcb9c', budget: [15, 14, 11, 3] },
  'canopy:2': { hash: 'fee996c1f5979f847c818512d8ef596cfa72c4b5b9120038dae8436717690bfb', budget: [14, 15, 10, 5] },
  'canopy:7': { hash: 'd9603880544c5b0acef1df763558ae716c09b657b7358cf7f36c073c32dbcbff', budget: [14, 16, 10, 6] },
  'storm:2': { hash: '88de316fd5079a2b0d38de98b5b5108ef43102804d428e40d17484fe080157fa', budget: [14, 12, 10, 2] },
  'storm:7': { hash: '8105f72e3295450d554c53cc990444137b0b70cf70e1acf7a685112ec30dccaf', budget: [14, 13, 10, 3] },
};

function surface(shape) { return shape.slice(2).reverse(); }
function surfaceY(shape, x) {
  if (!shape) return null;
  const points = surface(shape);
  if (x < points[0][0] || x > points.at(-1)[0]) return null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (x < a[0] || x > b[0]) continue;
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  return null;
}

test('terrain profiles are curved, biome-specific grounded surfaces with a stable polygon contract', () => {
  const silhouettes = new Set();
  for (const terrain of TERRAIN) {
    const obstacle = buildFlightLayout({ terrain, seed: 2, passage: 'cavern' }).obstacles[0];
    for (const [shape, top] of [[obstacle.topShape, true], [obstacle.bottomShape, false]]) {
      const boundary = surface(shape);
      assert.ok(boundary.length >= 24, 'curves have enough samples for smooth outlines rather than a few wedge vertices');
      assert.ok(shape.every(point => point.every(Number.isFinite)));
      assert.ok(shape.every(([, y]) => top ? y <= 1e-8 : y >= -1e-8), 'authored relief does not intrude into its opening');
      assert.ok(Math.abs(boundary[0][0] / obstacle.width + .8) < 1e-8);
      assert.ok(Math.abs(boundary.at(-1)[0] / obstacle.width - 2.45) < 1e-8);
      const slopes = new Set();
      for (let i = 1; i < boundary.length; i++) {
        const a = boundary[i - 1], b = boundary[i];
        assert.ok(b[0] > a[0], 'surface samples are ordered without folded/self-crossing edges');
        slopes.add(Math.round((b[1] - a[1]) / (b[0] - a[0]) * 100));
      }
      assert.ok(slopes.size >= 8, 'curvature is distributed along the silhouette');
    }
    silhouettes.add(JSON.stringify(surface(obstacle.bottomShape).map(([x, y]) =>
      [Math.round(x / obstacle.width * 1e4), Math.round(y * 1e4)])));
  }
  assert.equal(silhouettes.size, 3, 'each biome has its own terrain shape, not just a different tint');
});

test('authored curves preserve encounter randomness and every pre-change pickup budget', () => {
  for (const terrain of TERRAIN) for (const seed of [2, 7]) {
    const baseline = BASELINES[`${terrain}:${seed}`];
    const standard = buildFlightLayout({ terrain, seed });
    const schedule = standard.obstacles.map(o => [o.x, o.width, o.center, o.gap, o.phase, o.motion, o.pattern]);
    assert.equal(createHash('sha256').update(JSON.stringify(schedule)).digest('hex'), baseline.hash,
      `${terrain}/${seed}: profile sampling must not consume extra random values`);
    for (const height of [480, 620, 844]) for (const passage of ['open', 'cavern']) {
      const layout = buildFlightLayout({ terrain, seed, height, passage });
      const actual = [layout.obstacles.length, layout.embers.length,
        layout.embers.filter(e => e.fuel).length, layout.embers.filter(e => e.value === 3).length];
      assert.deepEqual(actual, baseline.budget, `${terrain}/${seed}/${height}/${passage}: clearance repair cannot silently drop rewards`);
    }
  }
});

test('joined mountain floors and cave roofs retain a clear corridor at the full sway envelope', () => {
  for (const height of [480, 620, 844]) for (const terrain of TERRAIN) for (const seed of [2, 7]) {
    const layout = buildFlightLayout({ terrain, seed, height, passage: 'cavern', elite: true });
    for (let index = 0; index < layout.obstacles.length; index++) {
      const obstacle = layout.obstacles[index], boundary = surface(obstacle.bottomShape);
      assert.ok(obstacle.center + obstacle.gap / 2 + Math.max(...obstacle.bottomShape.map(point => point[1])) > height + 100);
      if (index) {
        const previous = layout.obstacles[index - 1];
        assert.ok(previous.x + surface(previous.bottomShape).at(-1)[0] >= obstacle.x + boundary[0][0],
          'adjacent grounded pieces overlap rather than leaving floating gaps');
      }
    }
    const start = layout.obstacles[0].x + surface(layout.obstacles[0].bottomShape)[0][0];
    const end = layout.obstacles.at(-1).x + surface(layout.obstacles.at(-1).bottomShape).at(-1)[0];
    for (let x = start + 1; x < end; x += 18) {
      let ceiling = 28, floor = height - 28;
      for (const obstacle of layout.obstacles) {
        const top = surfaceY(obstacle.topShape, x - obstacle.x);
        const bottom = surfaceY(obstacle.bottomShape, x - obstacle.x);
        if (top !== null) ceiling = Math.max(ceiling, obstacle.center + obstacle.motion - obstacle.gap / 2 + top);
        if (bottom !== null) floor = Math.min(floor, obstacle.center - obstacle.motion + obstacle.gap / 2 + bottom);
      }
      assert.ok(floor - ceiling >= height * .10,
        `${terrain}/${seed}/${height} at ${x}: adjacent profiles leave a body-wide navigable interval`);
    }
  }
});

test('every collectible stays clear of all overlapping terrain at either sway extreme', () => {
  for (const height of [480, 620, 844]) for (const terrain of TERRAIN) for (const seed of [2, 7]) {
    const layout = buildFlightLayout({ terrain, seed, height, passage: 'cavern', elite: true });
    for (const ember of layout.embers) for (const obstacle of layout.obstacles) {
      for (const sign of [-1, 1]) {
        const extreme = { ...obstacle, motion: 0, center: obstacle.center + sign * obstacle.motion };
        for (const polygon of obstaclePolygons(extreme)) assert.equal(
          circleHitsPolygon(ember.x, ember.y, 21, polygon), false,
          `${terrain}/${seed}/${height}: ${ember.id} intersects a neighbouring curve`);
      }
    }
  }
});

test('ruins include a broad visible mesa cap instead of only pointed mounds', () => {
  for (const height of [480, 620, 844]) {
    const scale = height / 620;
    const layout = buildFlightLayout({ terrain: 'ruins', seed: 2, height });
    let widestCap = 0;
    for (const obstacle of layout.obstacles) {
      const boundary = surface(obstacle.bottomShape);
      for (let start = 0; start < boundary.length - 1; start++) {
        const depth = boundary[start][1];
        if (depth < 10 * scale || depth > 90 * scale) continue;
        for (let end = start + 1; end < boundary.length; end++) {
          if (Math.abs(boundary[end][1] - depth) > .5 * scale) break;
          widestCap = Math.max(widestCap, (boundary[end][0] - boundary[start][0]) / obstacle.width);
        }
      }
    }
    assert.ok(widestCap > .5, `${height}px ruins retain a wide, genuinely flat shelf in the visible skyline`);
  }
});

test('storm ridges include two distinct summits separated by a deep wind saddle', () => {
  for (const height of [480, 620, 844]) {
    const scale = height / 620;
    const layout = buildFlightLayout({ terrain: 'storm', seed: 2, height });
    let foundTwinSummit = false;
    for (const obstacle of layout.obstacles) {
      const boundary = surface(obstacle.bottomShape), summits = [];
      for (let index = 1; index < boundary.length - 1; index++) {
        const depth = boundary[index][1];
        if (boundary[index - 1][1] > depth + .1 * scale && boundary[index + 1][1] > depth + .1 * scale)
          summits.push(index);
      }
      for (let a = 0; a < summits.length; a++) for (let b = a + 1; b < summits.length; b++) {
        const first = summits[a], second = summits[b];
        if (boundary[second][0] - boundary[first][0] < obstacle.width * .5) continue;
        const saddle = Math.max(...boundary.slice(first + 1, second).map(point => point[1]));
        if (saddle - Math.max(boundary[first][1], boundary[second][1]) >= 20 * scale) foundTwinSummit = true;
      }
    }
    assert.ok(foundTwinSummit, `${height}px storm terrain has an actual twin-peak silhouette with a 20-unit saddle`);
  }
});
