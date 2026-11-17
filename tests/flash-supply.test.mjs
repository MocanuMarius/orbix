import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFlightLayout, FLASH_MIN_PER_FLIGHT, FLASH_TERRAIN_CLEARANCE } from '../dist/flight.mjs';
import { BIOME_LEVELS } from '../dist/biomes.mjs';
import { terrainClearance } from '../scripts/course-design/flash-supply.mjs';

const build = (level, stage, seed, extra = {}) => buildFlightLayout({ seed: `flash-test:${seed}`, terrain: level.terrain, levelId: level.id,
  duration: 90, speed: 154, height: 620, stage, difficulty: 1, ...extra });
const flashes = layout => layout.embers.filter(e => e.kind === 'sight');

test('landform flights on rows 1-7 carry at least FLASH_MIN_PER_FLIGHT Flare pickups, in open air', () => {
  assert.ok(FLASH_MIN_PER_FLIGHT >= 1);
  let checked = 0;
  for (const level of BIOME_LEVELS) for (const stage of [1, 2, 3, 4, 5, 6, 7]) for (const seed of [1, 2]) {
    const layout = build(level, stage, seed, { elite: stage % 2 === 0 });
    const found = flashes(layout);
    assert.ok(found.length >= FLASH_MIN_PER_FLIGHT, `${level.id} row ${stage} seed ${seed}: ${found.length} Flare`);
    for (const e of found) assert.ok(terrainClearance(layout, e.x, e.y) >= FLASH_TERRAIN_CLEARANCE - 1, `${level.id} row ${stage}: Flare hugs terrain`);
    checked++;
  }
  assert.equal(checked, 48 * 7 * 2);
});

test('old layouts keep the rolled Flare count (at most one) and row 0 stays unchanged', () => {
  for (const level of BIOME_LEVELS.slice(0, 12)) for (const seed of [1, 2, 3]) {
    assert.ok(flashes(build(level, 3, seed, { landforms: false })).length <= 1);
    assert.equal(flashes(build(level, 0, seed)).length, 0, `${level.id} row 0`);
  }
});
