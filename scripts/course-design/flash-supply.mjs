// Flash pickups per flight, share of flights with none, and the closest a placed
// Flash sits to terrain. Seeded, integer difficulty, all courses, rows 1-7.
//   node scripts/course-design/flash-supply.mjs [--seeds=8] [--difficulty=1]
import { pathToFileURL } from 'node:url';
import { buildFlightLayout, obstaclePolygons, circleHitsPolygon } from '../../dist/flight.mjs';
import { BIOME_LEVELS } from '../../dist/biomes.mjs';

export const ROWS = [1, 2, 3, 4, 5, 6, 7];
const segDist = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
};
/** Closest distance from a point to terrain (0 when inside), across each obstacle's sway extremes. */
export function terrainClearance(layout, x, y) {
  let best = Infinity;
  for (const o of layout.obstacles) {
    if (x < o.x - o.width * .8 - 120 || x > o.x + o.width * 2.45 + 120) continue;
    for (const sign of [-1, 1]) {
      const polys = obstaclePolygons({ ...o, motion: 0, center: o.center + sign * Math.abs(o.motion || 0) });
      for (const p of polys) {
        if (circleHitsPolygon(x, y, 0, p)) return 0;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
          if (p[j][1] >= 850 || p[i][1] >= 850 || p[j][1] <= -850 || p[i][1] <= -850) continue; // skip sentinel edges
          best = Math.min(best, segDist(x, y, p[j], p[i]));
        }
      }
    }
  }
  return best;
}
export function measure({ seeds = 8, difficulty = 1, landforms = true, levels = BIOME_LEVELS } = {}) {
  const out = {};
  for (const elite of [false, true]) {
    let flights = 0, flashes = 0, zero = 0, minClear = Infinity, sumClear = 0;
    for (const level of levels) for (const stage of ROWS) for (let s = 1; s <= seeds; s++) {
      const layout = buildFlightLayout({ seed: `flash-supply:${s}`, terrain: level.terrain, levelId: level.id, duration: 90, speed: 154,
        height: 620, stage, difficulty, elite, landforms });
      const f = layout.embers.filter(e => e.id === 'flash-powerup' || e.kind === 'sight');
      flights++; flashes += f.length; if (!f.length) zero++;
      for (const e of f) { const c = terrainClearance(layout, e.x, e.y); minClear = Math.min(minClear, c); sumClear += c; }
    }
    out[elite ? 'elite' : 'normal'] = { flights, perFlight: +(flashes / flights).toFixed(3), zeroShare: +(zero / flights).toFixed(3),
      minClearance: +minClear.toFixed(1), meanClearance: flashes ? +(sumClear / flashes).toFixed(1) : null };
  }
  return out;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = Object.fromEntries(process.argv.slice(2).map(x => x.replace(/^--/, '').split('=')));
  const seeds = Number(a.seeds || 8), difficulty = Number(a.difficulty || 1);
  console.log('old layouts (landforms:false)', JSON.stringify(measure({ seeds, difficulty, landforms: false })));
  console.log('landform courses            ', JSON.stringify(measure({ seeds, difficulty, landforms: true })));
}
