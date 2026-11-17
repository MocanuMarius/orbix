import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as L from '../dist/course-landforms.mjs';
import { buildFlightLayout } from '../dist/flight.mjs';
import { BIOME_LEVELS } from '../dist/biomes.mjs';

const EXTENT = (90 - 2.8) * 154 + 98;
const compose = (id, seed = 17, extra = {}) => L.composeCourse(L.LANDFORM_RECIPES[id], { seed, extent: EXTENT, windows: 2, ...extra });
const layout = (level, generation, extra = {}) => {
  L.overrideCourseGeneration(generation);
  try { return buildFlightLayout({ seed: 'landform-test', terrain: level.terrain, levelId: level.id, duration: 90, speed: 154, height: 620, stage: 2, difficulty: 1, ...extra }); }
  finally { L.overrideCourseGeneration(null); }
};
const fingerprint = value => createHash('sha256').update(JSON.stringify(value, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)).digest('hex');

test('a recipe and seed always give the same course; a new seed gives a new one', () => {
  for (const id of Object.keys(L.LANDFORM_RECIPES)) {
    const a = compose(id), b = compose(id), c = compose(id, 18);
    assert.deepEqual(Array.from(a.floor), Array.from(b.floor), id);
    assert.deepEqual(Array.from(a.ceil), Array.from(b.ceil), id);
    assert.deepEqual(a.floorMat, b.floorMat, id);
    assert.notDeepEqual(Array.from(a.floor), Array.from(c.floor), id);
  }
  const level = BIOME_LEVELS.find(l => l.id === 'desert-obelisk-walk');
  assert.equal(fingerprint(layout(level, 2).obstacles.map(o => [o.x, o.center, o.gap, o.bottomShape])),
    fingerprint(layout(level, 2).obstacles.map(o => [o.x, o.center, o.gap, o.bottomShape])));
});

test('every recipe passes the plausibility and fairness validator across seeds and rows', () => {
  for (const id of Object.keys(L.LANDFORM_RECIPES)) for (const seed of [1, 2, 3, 4, 5]) for (const hardGapScale of [1, .91, .88]) {
    const course = compose(id, seed, { hardGapScale, windows: hardGapScale < 1 ? 3 : 2 });
    const result = L.validateCourse(course);
    assert.ok(result.ok, `${id} seed ${seed} scale ${hardGapScale}: ${JSON.stringify(result.errors)}`);
  }
});

test('the validator rejects recipes that break the rules', () => {
  const base = { id: 'bad', name: 'Bad', ground: 'soil', start: 560, undressed: true,   // raw recipes: the dressing pass would hide what is being tested
    intro: [['plain', { len: 500, level: 540 }]], rest: [['hills', { len: 900, level: 530, amp: 30 }]], outro: [['plain', { len: 500, level: 650 }]] };
  const rules = recipe => Object.keys(L.validateCourse(L.composeCourse({ ...base, ...recipe }, { seed: 3, extent: 6000, windows: 1 })).errorCounts);
  const lowCave = rules({ challenge: [[['plain', { len: 600 }]]], rest: [['cave', { len: 1400, gap: 120, level: 520 }]] });
  assert.ok(lowCave.includes('ceiling-trim') || lowCave.includes('min-gap'), 'a cave too low to fly');
  assert.ok(rules({ challenge: [[['plain', { len: 600 }]]], rest: [['highland', { len: 1500, band: 120, to: 520 }]] }).includes('min-band'), 'open sky squeezed to nothing');
  assert.ok(rules({ challenge: [[['cliff', { len: 600, h: 260, dir: 'up' }]]] }).includes('lead-in'), 'a wall too tall to climb after seeing it');
  // A hand-made needle of rock on flat soil.
  const needle = L.composeCourse({ ...base, challenge: [[['plain', { len: 1200, level: 540 }]]] }, { seed: 3, extent: 6000, windows: 1 });
  const i = needle.xs.findIndex(x => x > 2000);
  for (let k = 0; k < 3; k++) { needle.floor[i + k] = 400; needle.floorMat[i + k] = 'rock'; }
  assert.ok(Object.keys(L.validateCourse(needle).errorCounts).includes('needle'));
  // A ceiling that starts in mid-air with nothing to hang from.
  const floating = L.composeCourse({ ...base, challenge: [[['plain', { len: 1200, level: 540 }]]] }, { seed: 3, extent: 6000, windows: 1 });
  for (let k = 0; k < 40; k++) floating.ceil[i + k] = 200;
  assert.ok(Object.keys(L.validateCourse(floating).errorCounts).includes('unsupported-ceiling'));
});

test('soft ground stays under its angle of repose and rock keeps its edges', () => {
  for (const id of Object.keys(L.LANDFORM_RECIPES)) {
    const { metrics } = L.validateCourse(compose(id));
    assert.ok(metrics.maxSoftSlope <= .78, `${id} soft slope ${metrics.maxSoftSlope}`);
  }
  const hoodoo = compose('desert-obelisk-walk');
  assert.ok(hoodoo.floorMat.includes('rock') && hoodoo.floorMat.includes('sand'));
  const { metrics } = L.validateCourse(hoodoo);
  assert.ok(metrics.maxRockSlope > metrics.maxSoftSlope, 'rock is allowed to be steeper than sand');
});

test('landform obstacles carry material tags and ordinary course data', () => {
  for (const id of Object.keys(L.LANDFORM_RECIPES)) {
    const level = BIOME_LEVELS.find(l => l.id === id), out = layout(level, 2);
    assert.equal(out.landformCourse?.generation, 2, id);
    assert.equal(out.landformCourse.recipeId, L.LANDFORM_RECIPES[id].id);
    const ground = out.obstacles.filter(o => o.courseGeneration === 2);
    assert.ok(ground.length > 10, id);
    for (const o of ground) {
      assert.ok(L.MATERIALS[o.terrainMaterial.bottom], `${id} material ${o.terrainMaterial.bottom}`);
      assert.ok(o.surfaceMaterials.bottom.length >= 1 && o.surfaceMaterials.bottom.every(([a, b, m]) => b >= a && L.MATERIALS[m]));
      assert.ok(o.gap > 0 && Number.isFinite(o.center), `${id} anchors`);
      assert.equal(o.bottomShape[0][1], 900, 'renderer contract: closing points far below');
      if (o.topShape) assert.equal(o.topShape[0][1], -900);
      assert.equal(o.cacheEligible, false, 'no notches carved into continuous ground');
    }
    assert.equal(out.sceneProps.length, 0, 'landforms replace the solid prop pass');
    const profile = out.landformCourse.profile;
    assert.equal(profile.floor.length, profile.floorMat.length);
    assert.ok(profile.floorMat.every(m => L.MATERIALS[m]));
  }
});

test('open-sky courses keep their sky: little ceiling, hanging features only; caves and gorges have real cave tops', () => {
  const share = id => { const out = layout(BIOME_LEVELS.find(l => l.id === id), 2); return out.landformCourse.metrics.openSkyShare; };
  for (const id of ['desert-dune-trough', 'pinewood-timber-run', 'thorn-thicket-run', 'moonruins-courtyard']) {
    assert.ok(L.LANDFORM_RECIPES[id].type === 'open-sky', id);
    assert.ok(share(id) >= .6 && share(id) < 1, `${id}: open sky share ${share(id)}`);
  }
  // Courses that are no longer tagged open-sky carry cave tops and overhangs.
  for (const id of ['desert-obelisk-walk', 'pinewood-bark-switchback', 'desert-oasis-arch']) assert.ok(share(id) <= .85, `${id}: ${share(id)}`);
  const cave = layout(BIOME_LEVELS.find(l => l.id === 'pinewood-high-boughs'), 2);
  assert.ok(cave.obstacles.some(o => o.topShape && o.ceilingLandform === 'cave'));
});

test('with ?courses=1 (override 1) every course is the old authored course, untouched', () => {
  assert.equal(L.courseGeneration(), 2, 'landform courses are the default');
  L.overrideCourseGeneration(1);
  try {
    assert.equal(L.courseGeneration(), 1);
    assert.equal(L.landformRecipeFor('desert-dune-trough'), null);
    assert.equal(L.buildLandformCourse({ levelId: 'desert-dune-trough' }), null);
    for (const level of BIOME_LEVELS) {
      const old = buildFlightLayout({ seed: 'landform-test', terrain: level.terrain, levelId: level.id, duration: 90, speed: 154, height: 620, stage: 2, difficulty: 1 });
      assert.equal(old.landformCourse, undefined, level.id);
      assert.ok(old.obstacles.every(o => o.courseGeneration === undefined), level.id);
    }
  } finally { L.overrideCourseGeneration(null); }
  assert.equal(L.courseGeneration(), 2);
  // Ids without a recipe (tutorial, unknown) ignore the switch entirely.
  assert.equal(L.buildLandformCourse({ levelId: 'practice-first-light' }), null);
});
