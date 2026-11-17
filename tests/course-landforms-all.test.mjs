import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as L from '../dist/course-landforms.mjs';
import { buildFlightLayout } from '../dist/flight.mjs';
import { BIOME_LEVELS } from '../dist/biomes.mjs';
import { summarise } from '../scripts/course-design/validate-all.mjs';

const fingerprint = value => createHash('sha256').update(JSON.stringify(value, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)).digest('hex');
const layout = (level, extra = {}) => buildFlightLayout({ seed: 'all-courses', terrain: level.terrain, levelId: level.id, duration: 90, speed: 154, height: 620, stage: 2, difficulty: 1, ...extra });
const kinds = recipe => [...recipe.intro, ...recipe.challenge.flat()].map(([k]) => k).join('>');

test('all 48 biome courses have a landform recipe that passes the validator (one line each)', t => {
  const results = summarise();
  assert.equal(results.length, 48);
  for (const r of results) { t.diagnostic(r.line); }
  const failed = results.filter(r => !r.ok);
  assert.deepEqual(failed.map(r => `${r.id}: ${JSON.stringify(r.failures.slice(0, 2))}`), []);
});

test('every level has exactly one recipe, tagged with its own biome, and nothing else is converted', () => {
  const ids = new Set(BIOME_LEVELS.map(l => l.id));
  assert.deepEqual([...Object.keys(L.LANDFORM_RECIPES)].filter(id => !ids.has(id)), [], 'no recipe for tutorial or practice slots');
  assert.equal(new Set(Object.values(L.LANDFORM_RECIPES).map(r => r.id)).size, 48, 'recipe ids are unique');
  for (const level of BIOME_LEVELS) assert.equal(L.LANDFORM_RECIPES[level.id]?.biome, level.biomeId, level.id);
});

test('no two courses in a biome share a layout shape, and each biome keeps to its own materials', () => {
  for (const biome of new Set(BIOME_LEVELS.map(l => l.biomeId))) {
    const shapes = BIOME_LEVELS.filter(l => l.biomeId === biome).map(l => kinds(L.LANDFORM_RECIPES[l.id]));
    assert.equal(new Set(shapes).size, shapes.length, `${biome} repeats a recipe shape: ${shapes.join(' | ')}`);
  }
  const mats = recipe => { const out = new Set([recipe.ground]); for (const [, p] of [...recipe.intro, ...recipe.challenge.flat(), ...recipe.rest, ...recipe.outro]) if (p.material) out.add(p.material); return out; };
  const only = { ice: ['frost'], snow: ['frost'], sand: ['desert', 'coral'], scree: ['desert', 'basalt', 'crystal', 'pinewood', 'cloud'], ruin: ['moonruins', 'cemetery'], canopy: ['fungal'] };
  for (const recipe of Object.values(L.LANDFORM_RECIPES)) for (const m of mats(recipe)) {
    if (only[m]) assert.ok(only[m].includes(recipe.biome), `${recipe.id}: ${m} does not belong in ${recipe.biome}`);
  }
  for (const recipe of Object.values(L.LANDFORM_RECIPES)) if (recipe.ground === 'soil' || recipe.ground === 'sand') {
    assert.ok(!['frost', 'basalt', 'crystal'].includes(recipe.biome) || recipe.ground !== 'soil', `${recipe.id}: no grassy soil in ${recipe.biome}`);
  }
});

test('landform courses are the default; ?courses=1 and the override give the old layouts; practice stays authored', () => {
  assert.equal(L.courseGeneration(), 2);
  const level = BIOME_LEVELS.find(l => l.id === 'frost-glacier-gate');
  assert.equal(layout(level).landformCourse?.generation, 2);
  L.overrideCourseGeneration(1);
  try { assert.equal(layout(level).landformCourse, undefined); } finally { L.overrideCourseGeneration(null); }
  // Practice and First Light fly real catalog levels with landforms:false: the same layout as the old generation.
  const practice = BIOME_LEVELS.find(l => l.id === 'moonruins-courtyard');
  const keep = out => fingerprint(out.obstacles.map(o => [o.x, o.center, o.gap, o.topShape, o.bottomShape]));
  const calm = keep(layout(practice, { landforms: false }));
  L.overrideCourseGeneration(1);
  try { assert.equal(keep(layout(practice)), calm); } finally { L.overrideCourseGeneration(null); }
  assert.notEqual(keep(layout(practice)), calm);
});

test('every level builds a valid landform layout through the flight at several rows', () => {
  for (const level of BIOME_LEVELS) for (const stage of [0, 3, 5]) {
    const out = layout(level, { stage, difficulty: stage ? 2 : 1 });
    assert.equal(out.landformCourse?.valid, true, `${level.id} row ${stage}: ${JSON.stringify(out.landformCourse?.errors)}`);
    assert.ok(out.obstacles.length > 10 && out.embers.length > 5, level.id);
  }
});
