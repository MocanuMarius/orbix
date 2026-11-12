import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceHeight, makeLandformField, bakeLandform } from '../dist/landform-material.mjs';

const GROUND = [[-100, 900], [400, 900], [400, 110], [350, 65], [300, 25],
  [250, 0], [200, 20], [150, 55], [100, 35], [50, 5], [0, 25], [-100, 120]];
const pointsFor = top => top ? GROUND.map(([x, y]) => [x, -y]) : GROUND.map(point => [...point]);

function channelRange(data, channel) {
  let min = 255, max = 0;
  for (let offset = channel; offset < data.length; offset += 4) {
    min = Math.min(min, data[offset]); max = Math.max(max, data[offset]);
  }
  return [min, max];
}

test('macro relief follows the actual ground or roof profile, with its lip at zero height', () => {
  const simple = [[0, 10], [100, 30], [200, 0]];
  assert.equal(surfaceHeight(simple, -10), 10);
  assert.equal(surfaceHeight(simple, 50), 20);
  assert.equal(surfaceHeight(simple, 250), 0);
  for (const top of [false, true]) {
    const field = makeLandformField({ points: pointsFor(top), top, seed: 7 });
    for (const x of [-50, 50, 125, 225, 325]) {
      const edge = surfaceHeight(field.profile, x), inward = top ? -1 : 1;
      assert.ok(Math.abs(field.depthAt(x, edge)) < 1e-9);
      assert.equal(field.heightAt(x, edge), 0);
      assert.equal(field.heightAt(x, edge - inward * 10), 0, 'open air has no geological relief');
      assert.ok(field.heightAt(x, edge + inward * 30) > 1, 'the solid face gains real relief below its lip');
    }
    const moved = pointsFor(top).map(([x, y], index) => [x, y + (index < 2 ? 0 : (top ? -80 : 80))]);
    const other = makeLandformField({ points: moved, top, seed: 7 });
    const x = 125, sample = surfaceHeight(field.profile, x) + (top ? -30 : 30);
    assert.ok(field.heightAt(x, sample) > 1);
    assert.equal(other.heightAt(x, sample), 0, 'moving geometry moves the relief boundary independently of any albedo image');
  }
});

test('packed material maps have finite bounded relief, varied macro normals and bounded AO/wear', () => {
  for (const terrain of ['ruins', 'canopy', 'storm']) for (const top of [false, true]) {
    const bake = bakeLandform({ points: pointsFor(top), terrain, top, seed: 7, maxSize: 128 });
    assert.ok(bake.form instanceof Uint8ClampedArray);
    assert.ok(bake.weather instanceof Uint8ClampedArray);
    assert.equal(bake.form.length, bake.width * bake.height * 4);
    assert.equal(bake.weather.length, bake.form.length);
    assert.ok(bake.width >= 2 && bake.height >= 2 && bake.width <= 129 && bake.height <= 129);
    assert.ok([bake.minX, bake.minY, bake.sizeX, bake.sizeY].every(Number.isFinite));
    const r = channelRange(bake.form, 0), g = channelRange(bake.form, 1);
    const height = channelRange(bake.form, 2), ao = channelRange(bake.form, 3);
    assert.ok(r[1] - r[0] > 20 && g[1] - g[0] > 20, 'large faces have genuinely varied normal directions');
    assert.ok(height[1] - height[0] > 50 && height[1] <= 234, 'height uses its documented 0–88 world-unit range');
    assert.ok(ao[0] >= 132 && ao[1] <= 255 && ao[1] > ao[0], 'AO remains a bounded material quantity');
    assert.ok(channelRange(bake.weather, 3)[1] <= 179, 'weathering does not become an opaque paint layer');
    for (let offset = 0; offset < bake.form.length; offset += 4) {
      const nx = bake.form[offset] / 255 * 2 - 1, ny = bake.form[offset + 1] / 255 * 2 - 1;
      assert.ok(nx * nx + ny * ny <= 1.02, 'packed XY encodes a valid forward-facing macro normal');
    }
  }
});

test('visible-region baking preserves the same profile coordinates and height samples', () => {
  for (const top of [false, true]) {
    const points = pointsFor(top), clipY = top ? [-180, 0] : [0, 180];
    const field = makeLandformField({ points, top, terrain: 'storm', seed: 9 });
    const bake = bakeLandform({ points, top, terrain: 'storm', seed: 9, maxSize: 128, clipY });
    assert.equal(bake.minY, clipY[0]);
    assert.equal(bake.sizeY, 180);
    for (let iy = 1; iy < bake.height - 1; iy += 7) for (let ix = 1; ix < bake.width - 1; ix += 11) {
      const x = bake.minX + (ix + .5) * bake.sizeX / bake.width;
      const y = bake.minY + (iy + .5) * bake.sizeY / bake.height;
      const packed = bake.form[(iy * bake.width + ix) * 4 + 2];
      assert.ok(Math.abs(packed - field.heightAt(x, y) / 96 * 255) <= 1,
        'cropping the texture does not shift or rescale the geological field');
    }
  }
});

test('landform baking is deterministic, seed-sensitive and leaves collision vertices untouched', () => {
  const points = Object.freeze(GROUND.map(point => Object.freeze([...point])));
  const options = { points, terrain: 'canopy', seed: 12, maxSize: 96, clipY: [0, 220] };
  const before = JSON.stringify(points);
  const first = bakeLandform(options), second = bakeLandform(options);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first.form, bakeLandform({ ...options, seed: 13 }).form);
  assert.equal(JSON.stringify(points), before, 'baking cannot alter the collider used by gameplay');
});
