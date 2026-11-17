// Validate every biome course's landform recipe and print one line per course.
// Usage: node scripts/course-design/validate-all.mjs   (exit code 1 if any course fails)
import { pathToFileURL } from 'node:url';
import * as L from '../../dist/course-landforms.mjs';
import { BIOME_LEVELS } from '../../dist/biomes.mjs';

export const SEEDS = [1, 2, 3, 4, 5];
export const DURATIONS = [45, 90, 150];                       // seconds: the length range of real flights
export const ROWS = [{ hardGapScale: 1, windows: 2 }, { hardGapScale: .91, windows: 3 }, { hardGapScale: .88, windows: 3 }];

/** One summary per course: failures across seeds, lengths and row pressure plus the tightest metrics seen. */
export function summarise({ seeds = SEEDS, durations = DURATIONS, rows = ROWS } = {}) {
  return BIOME_LEVELS.map(level => {
    const recipe = L.LANDFORM_RECIPES[level.id];
    if (!recipe) return { id: level.id, biome: level.biomeId, ok: false, runs: 0, failures: [{ rule: 'no-recipe' }], line: `FAIL ${level.id}: no recipe` };
    const failures = []; let runs = 0, minRoom = Infinity, minSlack = Infinity, minGap = Infinity, minBand = Infinity, maxSoft = 0;
    for (const duration of durations) for (const seed of seeds) for (const { hardGapScale, windows } of rows) {
      const extent = (duration - 2.8) * 154 + 98, v = L.validateCourse(L.composeCourse(recipe, { seed, extent, windows, hardGapScale }));
      runs++; minRoom = Math.min(minRoom, v.metrics.minRoom); minSlack = Math.min(minSlack, v.metrics.leadInSlackSeconds);
      if (v.metrics.minGap != null) minGap = Math.min(minGap, v.metrics.minGap);
      if (v.metrics.minBand != null) minBand = Math.min(minBand, v.metrics.minBand);
      maxSoft = Math.max(maxSoft, v.metrics.maxSoftSlope);
      for (const e of v.errors) failures.push({ rule: e.rule, duration, seed, hardGapScale, x: e.x });
    }
    const ok = failures.length === 0, f = n => Number.isFinite(n) ? n : '-';
    return { id: level.id, biome: level.biomeId, recipe: recipe.id, ok, runs, failures,
      line: `${ok ? 'ok  ' : 'FAIL'} ${level.id.padEnd(28)} ${recipe.id.padEnd(22)} ${recipe.type.padEnd(11)} runs=${runs} minGap=${f(minGap)} minBand=${f(minBand)} minRoom=${f(minRoom)} leadInSlack=${f(minSlack)}s maxSoftSlope=${maxSoft}`
        + (ok ? '' : ` errors=${[...new Set(failures.map(e => e.rule))].join(',')}`) };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = summarise();
  for (const r of results) console.log(r.line);
  const bad = results.filter(r => !r.ok).length;
  console.log(`${results.length - bad}/${results.length} courses pass`);
  process.exit(bad ? 1 : 0);
}
