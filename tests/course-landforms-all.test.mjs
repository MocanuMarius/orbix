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

// ---- Challenge floor (v2.2-challenge): the landform courses must be as demanding as the old authored layouts.
// Measured with scripts/course-design/challenge.mjs; old figures are the old layouts' averages per biome (ceiling share).
const OLD_CEILING = { moonruins: .16, frost: .15, pinewood: .33, marsh: .19, fungal: .20, basalt: .22, desert: .19, coral: .19, crystal: .27, cloud: .05, thorn: .21, cemetery: .17 };
const EXTENT = (90 - 2.8) * 154 + 98;
const PRESSURE = [{ hardGapScale: 1, windows: 1 }, { hardGapScale: .88, windows: 3 }];
const challengeRuns = id => {
  const out = [];
  for (const seed of [1, 2, 3]) for (const row of PRESSURE) out.push({ seed, row, ...L.courseChallenge(L.composeCourse(L.LANDFORM_RECIPES[id], { seed, extent: EXTENT, ...row })) });
  return out;
};
const challengeCache = new Map();
const runsFor = id => { if (!challengeCache.has(id)) challengeCache.set(id, challengeRuns(id)); return challengeCache.get(id); };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

test('each biome has at most one open-sky course; the other courses have cave tops, overhangs or boughs', () => {
  const sky = {};
  for (const level of BIOME_LEVELS) if (L.LANDFORM_RECIPES[level.id].type === 'open-sky') (sky[level.biomeId] ||= []).push(level.id);
  for (const [biome, ids] of Object.entries(sky)) assert.ok(ids.length <= 1, `${biome} has ${ids.length} open-sky courses: ${ids}`);
  for (const level of BIOME_LEVELS) {
    const share = mean(runsFor(level.id).map(r => r.ceilShare)), isSky = L.LANDFORM_RECIPES[level.id].type === 'open-sky';
    if (isSky) assert.ok(share > .02 && share < .4, `${level.id} (open sky) still needs hanging features, not a roof: ${share.toFixed(2)}`);
    else assert.ok(share >= .14, `${level.id}: only ${(share * 100).toFixed(0)}% of its length has a ceiling`);
  }
  // Per biome, the landform courses cover at least what the old layouts of that biome did (small allowance for the sampling).
  for (const biome of new Set(BIOME_LEVELS.map(l => l.biomeId))) {
    const mine = mean(BIOME_LEVELS.filter(l => l.biomeId === biome).map(l => mean(runsFor(l.id).map(r => r.ceilShare))));
    assert.ok(mine >= OLD_CEILING[biome] - .03, `${biome}: ${mine.toFixed(2)} ceiling share against ${OLD_CEILING[biome]} on the old layouts`);
  }
});

test('no dead air: something to steer around every few seconds (rest hills may run longer)', () => {
  const worst = [];
  for (const level of BIOME_LEVELS) for (const r of runsFor(level.id)) {
    if (r.longestDeadActive > 9.5 || r.longestDead > 11) worst.push(`${level.id} seed ${r.seed}: ${r.longestDeadActive.toFixed(1)} s (${r.longestDead.toFixed(1)} s with rests)`);
  }
  assert.deepEqual(worst, []);
  // On average a course keeps its longest empty stretch short, and has something to steer around about every 1.6 s.
  const all = BIOME_LEVELS.flatMap(l => runsFor(l.id));
  assert.ok(mean(all.map(r => r.longestDeadActive)) <= 5.5, `mean longest stretch ${mean(all.map(r => r.longestDeadActive)).toFixed(2)} s`);
  assert.ok(mean(all.map(r => r.featuresPer10)) >= 5.5, `features per 10 s ${mean(all.map(r => r.featuresPer10)).toFixed(2)}`);
});

test('every course has at least two squeezes where floor and ceiling close in', () => {
  let low = 0, total = 0;
  for (const level of BIOME_LEVELS) for (const r of runsFor(level.id)) {
    total++;
    if (r.row.windows >= 2) assert.ok(r.squeezes >= 2, `${level.id} seed ${r.seed} rows 2+: ${r.squeezes} squeezes`);
    else { assert.ok(r.squeezes >= 1, `${level.id} seed ${r.seed} row 1: ${r.squeezes} squeezes`); if (r.squeezes < 2) low++; }
    assert.ok(r.gapMin === null || r.gapMin >= L.RULES.minGapHard - 1, `${level.id}: closes below the fair minimum (${r.gapMin})`);
  }
  assert.ok(low <= total * .08, `${low} of ${total} flights have a single squeeze (a short row-1 window holds only one)`);
});

test('difficulty rises with the row: the tightest squeeze narrows from the gentle row to the deep rows', () => {
  const gap = hgs => mean(BIOME_LEVELS.map(level => mean([1, 2, 3].map(seed => L.courseChallenge(L.composeCourse(L.LANDFORM_RECIPES[level.id], { seed, extent: EXTENT, hardGapScale: hgs, windows: 2 })).gapMin ?? 400))));
  const gentle = gap(1), mid = gap(.94), hard = gap(.88);
  assert.ok(gentle > mid && mid > hard, `${gentle.toFixed(0)} > ${mid.toFixed(0)} > ${hard.toFixed(0)}`);
  assert.ok(hard >= L.RULES.minGapHard && hard < 215, `deep rows land near the old layouts' tight passages (${hard.toFixed(0)})`);
});
