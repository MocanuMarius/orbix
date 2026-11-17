// Challenge and fullness of a course, measured the same way on the old authored
// layouts (landforms:false) and on landform courses (landforms:true), from the
// finished obstacle polygons only. Seeded; all 48 courses; three row bands.
//
//   node scripts/course-design/challenge.mjs [--seeds=3] [--duration=90] [--levels=id,id] [--detail] [--undressed]
//
// Per course and row band: ceiling share, mean/min gap where both exist, steer
// features per 10 s, longest dead stretch (s), vertical travel of the best line
// per 10 s, and Spark detours. Definitions (620-unit frame, 6-unit samples):
//   floor(x)/ceil(x): from the union of obstacle polygons (motion 0).
//   feature: a floor bump of prominence >= 30 within +-150, a floor step >= 45 in 150,
//            a hanging ceiling drop of prominence >= 30 (a cave mouth counts), a gap pinch
//            of prominence >= 40 below 300; features within 100 units merge.
//   best line: minimum total vertical travel path through the corridor (ceil+R+m .. floor-R-m;
//            open sky is capped 240 above the local floor, the lit band a pilot works in).
//   dead stretch: flight between two consecutive features; the course start and end count.
//   squeeze: a run where floor-to-ceiling gap < 255 (not counting cave mouths) of >= 120 units.
import { pathToFileURL } from 'node:url';
import { buildFlightLayout, obstaclePolygons } from '../../dist/flight.mjs';
import { BIOME_LEVELS } from '../../dist/biomes.mjs';
import { steerFeatures, DRESS, overrideCourseDressing } from '../../dist/course-landforms.mjs';

export const BANDS = [{ name: 'row1-2', stages: [0, 1] }, { name: 'row3-5', stages: [3] }, { name: 'row6-7', stages: [6] }];
const PROM = Number(process.env.PROM || 45);
const DX = 6, R = 9.35, MARGIN = 30, SPEED = 154, FRAME = 620;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Blocked intervals at x from a list of polygons (as in the pilots' safeBands). */
function cuts(poly, x) {
  const c = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i];
    if ((a[0] > x) !== (b[0] > x)) c.push(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]));
  }
  return c.sort((p, q) => p - q);
}

/** floor/ceil height fields over [x0, x1) from a layout. */
export function fields(layout, x0, x1) {
  const n = Math.floor((x1 - x0) / DX), floor = new Float64Array(n).fill(FRAME + 200), ceil = new Float64Array(n).fill(NaN);
  const items = layout.obstacles.map(o => ({ o, polys: obstaclePolygons({ ...o, motion: 0 }, 0), a: o.x - o.width * .8 - 5, b: o.x + o.width * 2.45 + 5 }));
  for (const { polys, a, b } of items) {
    const i0 = Math.max(0, Math.floor((a - x0) / DX)), i1 = Math.min(n - 1, Math.ceil((b - x0) / DX));
    for (let i = i0; i <= i1; i++) {
      const x = x0 + i * DX;
      for (const poly of polys) {
        const c = cuts(poly, x); if (!c.length) continue;
        const top = poly.some(p => p[1] <= -800), bottom = poly.some(p => p[1] >= 800);
        for (let k = 0; k + 1 < c.length; k += 2) {
          const lo = c[k], hi = c[k + 1];
          if (top && !bottom) { if (hi > 4 && !(ceil[i] >= hi)) ceil[i] = hi; }
          else if (bottom && !top) floor[i] = Math.min(floor[i], lo);
          else if (hi < FRAME * .55 || lo < FRAME * .4) { if (hi > 4 && !(ceil[i] >= hi)) ceil[i] = hi; }   // detached prop high up
          else floor[i] = Math.min(floor[i], lo);
        }
      }
    }
  }
  return { floor, ceil, n, x0 };
}

const features = (floor, ceil) => steerFeatures(floor, ceil, PROM);

function bestLine(floor, ceil, n, pickups, x0) {
  const step = 2, m = Math.ceil(n / step), L = 100, y0 = 40, dy = 6;
  const lo = [], hi = [];
  for (let k = 0; k < m; k++) {
    const i = k * step, f = floor[i], c = Number.isFinite(ceil[i]) ? ceil[i] : 0;
    const fc = Math.min(f, FRAME); let h = fc - R - MARGIN, l = Math.max(c, fc - 240) + R + MARGIN;
    if (l > h) l = h;
    lo.push(l); hi.push(h);
  }
  const forced = new Map();
  for (const p of pickups) { const k = Math.round((p.x - x0) / DX / step); if (k >= 0 && k < m) forced.set(k, [Math.max(lo[k], Math.min(hi[k], p.y - 14)), Math.max(lo[k], Math.min(hi[k], p.y + 14))]); }
  const run = (withPickups) => {
    let cost = new Float64Array(L).fill(0);
    for (let k = 0; k < m; k++) {
      const a = lo[k], b = hi[k], fa = withPickups && forced.has(k) ? forced.get(k) : null;
      for (let q = 1; q < L; q++) cost[q] = Math.min(cost[q], cost[q - 1] + dy);
      for (let q = L - 2; q >= 0; q--) cost[q] = Math.min(cost[q], cost[q + 1] + dy);
      const ylo = fa ? Math.max(a, fa[0]) : a, yhi = fa ? Math.min(b, fa[1]) : b, saved = Float64Array.from(cost);
      let feasible = false;
      for (let q = 0; q < L; q++) {
        const y = y0 + q * dy;
        if (y < ylo - dy / 2 || y > yhi + dy / 2) cost[q] = Infinity; else feasible = true;
      }
      if (!feasible) cost.set(saved);
    }
    return Math.min(...cost);
  };
  return { free: run(false), withPickups: run(true) };
}

/** All metrics for one layout. */
export function measureLayout(layout, { x0 = 300, tail = 700 } = {}) {
  const x1 = layout.obstacles.at(-1).x - tail, { floor, ceil, n } = fields(layout, x0, x1);
  const secs = n * DX / SPEED;
  let ceilN = 0, gapSum = 0, gapN = 0, gapMin = Infinity, squeeze = 0, run = 0;
  for (let i = 0; i < n; i++) {
    if (floor[i] >= FRAME - 6) continue;
    if (Number.isFinite(ceil[i])) { ceilN++; const g = floor[i] - ceil[i]; gapSum += g; gapN++; gapMin = Math.min(gapMin, g); }
    const tight = Number.isFinite(ceil[i]) && floor[i] - ceil[i] < DRESS.squeezeBelow && ceil[i] > 40;
    if (tight) run += DX; else { if (run >= 120) squeeze++; run = 0; }
  }
  if (run >= 120) squeeze++;
  const f = features(floor, ceil), marks = [0, ...f, n - 1], dead = [];
  for (let k = 1; k < marks.length; k++) dead.push((marks[k] - marks[k - 1]) * DX / SPEED);
  const pickups = layout.embers.filter(e => e.kind === 'light' && e.x > x0 && e.x < x1).map(e => ({ x: e.x, y: e.y }));
  const bl = bestLine(floor, ceil, n, pickups, x0);
  return { seconds: secs, ceilShare: ceilN / n, gapMean: gapN ? gapSum / gapN : null, gapMin: gapN ? gapMin : null, squeezes: squeeze,
    featuresPer10: f.length / secs * 10, longestDead: Math.max(...dead), deadOver4: dead.filter(d => d > 4).reduce((s, d) => s + d, 0) / secs,
    travelPer10: bl.free / secs * 10, detourPer10: Math.max(0, bl.withPickups - bl.free) / secs * 10, pickups: pickups.length };
}

const KEYS = ['ceilShare', 'gapMean', 'gapMin', 'squeezes', 'featuresPer10', 'longestDead', 'deadOver4', 'travelPer10', 'detourPer10'];
const mean = a => { const v = a.filter(Number.isFinite); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
export function run({ seeds = 3, duration = 90, levels = BIOME_LEVELS, gens = [false, true] } = {}) {
  const rows = [];
  for (const level of levels) for (const landforms of gens) for (const band of BANDS) {
    const acc = [];
    for (const stage of band.stages) for (let s = 1; s <= seeds; s++) {
      const layout = buildFlightLayout({ seed: `challenge:${s}`, terrain: level.terrain, levelId: level.id, duration, speed: SPEED, height: FRAME, stage, difficulty: 1, landforms });
      acc.push(measureLayout(layout));
    }
    rows.push({ id: level.id, biome: level.biomeId, landforms, band: band.name, ...Object.fromEntries(KEYS.map(k => [k, mean(acc.map(r => r[k]))])), maxDead: Math.max(...acc.map(r => r.longestDead)) });
  }
  return rows;
}
const f2 = v => v == null ? '-' : v.toFixed(2).padStart(7);
function table(rows) {
  const out = [];
  for (const landforms of [false, true]) for (const band of BANDS) {
    const r = rows.filter(x => x.landforms === landforms && x.band === band.name);
    out.push(`${landforms ? 'landform' : 'old     '} ${band.name.padEnd(7)} ` + KEYS.map(k => `${k}=${(mean(r.map(x => x[k])) ?? NaN).toFixed(2)}`).join('  '));
  }
  return out.join('\n');
}
/** Landform courses ranked emptiest/easiest: lowest features per 10 s plus ceiling share plus travel. */
export function easiest(rows, count = 10) {
  const ids = [...new Set(rows.map(r => r.id))];
  const oldAvg = Object.fromEntries(KEYS.map(k => [k, mean(rows.filter(r => !r.landforms).map(r => r[k]))]));
  const score = id => {
    const r = rows.filter(x => x.landforms && x.id === id);
    const z = k => (mean(r.map(x => x[k])) ?? 0) / (oldAvg[k] || 1);
    return z('featuresPer10') + z('travelPer10') + z('squeezes') * .5 + z('ceilShare') * .5 - z('longestDead') * .5 - z('deadOver4');
  };
  return ids.map(id => ({ id, score: score(id) })).sort((a, b) => a.score - b.score).slice(0, count);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = Object.fromEntries(process.argv.slice(2).map(x => { const [k, ...v] = x.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
  if (a.undressed) overrideCourseDressing(false);   // the recipes alone, before the dressing pass
  const levels = a.levels ? BIOME_LEVELS.filter(l => String(a.levels).split(',').includes(l.id)) : BIOME_LEVELS;
  const rows = run({ seeds: Number(a.seeds || 3), duration: Number(a.duration || 90), levels });
  console.log(table(rows));
  console.log('easiest landform courses:', easiest(rows).map(e => `${e.id}(${e.score.toFixed(2)})`).join(', '));
  if (a.detail) for (const r of rows.filter(x => x.landforms)) console.log(r.id.padEnd(28), r.band.padEnd(7), KEYS.map(k => `${k}=${(r[k] ?? NaN).toFixed(2)}`).join(' '), `maxDead=${r.maxDead.toFixed(1)}`);
}
