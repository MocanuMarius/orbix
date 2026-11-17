// Course silhouette strips: the whole course length at true aspect, wrapped
// into rows. Terrain outline only (plus scene props for the old courses), so
// the shapes can be judged as geography.
//
//   node scripts/course-design/silhouettes.mjs [--set=existing|v2|all] [--duration=90] [--row=2]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Raster, stripLayout, hex } from './png.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const { buildFlightLayout, obstaclePolygons } = await import('../../dist/flight.mjs');
const { BIOME_LEVELS } = await import('../../dist/biomes.mjs');
const L = await import('../../dist/course-landforms.mjs');

export function layoutFor(level, { generation = 1, duration = 90, row = 2, seed = 17, mapIndex = 0, difficulty = 1 } = {}) {
  L.overrideCourseGeneration(generation);
  try {
    return buildFlightLayout({ seed, terrain: level.terrain, levelId: level.id, duration, speed: 154, height: 620, stage: row, difficulty, mapIndex, lengthScale: 1 });
  } finally { L.overrideCourseGeneration(null); }
}

const SKY = '#0d1420', TOPLINE = '#3a4a66', OLD_FLOOR = '#8a7b63', OLD_ROOF = '#6d7390', PROP = '#c0683a';
function tint(rgb, f) { return rgb.map(v => Math.round(v * f)); }

/** Draw one layout into a strip PNG. Materials colour landform courses. */
export function drawStrip(layout, file, { k = 4, rowLength = 4600 } = {}) {
  const obstacles = layout.obstacles.filter(o => !o.exitFoundation);
  const end = Math.max(...layout.obstacles.map(o => o.x + o.width * 2.45));
  const strip = stripLayout(end + 200, { k, rowLength });
  const r = new Raster(strip.w, strip.h, '#05080d');
  for (let row = 0; row < strip.rows; row++) {
    const ox = strip.pad, oy = strip.pad + row * (strip.rowH + strip.pad), wx0 = row * rowLength;
    r.rect(ox, oy, Math.round(rowLength / k), strip.rowH, SKY);
    r.rect(ox, oy, Math.round(rowLength / k), 1, TOPLINE);
    for (let t = Math.ceil(wx0 / 1000) * 1000; t < wx0 + rowLength; t += 1000) r.rect(ox + Math.round((t - wx0) / k), oy + strip.rowH - 3, 1, 3, '#2a3550');
    const clip = [ox, oy, ox + Math.round(rowLength / k), oy + strip.rowH];
    const toPx = ([x, y]) => [ox + (x - wx0) / k, oy + y / k];
    const prof = layout.landformCourse?.profile;
    if (prof) {
      // Landform course: soft ground, exposed rock over it, water, overheads.
      const at = x => Math.max(0, Math.min(prof.floor.length - 1, Math.round((x - prof.x0) / prof.dx)));
      for (let px = clip[0]; px < clip[2]; px++) {
        const wx = wx0 + (px + .5 - ox) * k, i = at(wx);
        if (wx < prof.x0 || wx > prof.x0 + prof.dx * prof.floor.length) continue;
        const soft = prof.soft[i], rock = prof.rock[i], fm = prof.floorMat[i];
        const softMat = prof.groundMat[i];
        r.rect(px, Math.round(oy + soft / k), 1, clip[3] - Math.round(oy + soft / k), hex(L.MATERIALS[softMat]?.color || '#777777'));
        if (rock !== null && rock < soft) r.rect(px, Math.round(oy + rock / k), 1, Math.max(1, Math.round((soft - rock) / k) + 1), hex(L.MATERIALS[fm]?.color || '#59545a'));
        const c = prof.ceil[i]; if (c !== null) r.rect(px, clip[1], 1, Math.round(c / k), hex(L.MATERIALS[prof.ceilMat[i]]?.color || '#59545a'));
      }
    }
    for (const o of prof ? [] : layout.obstacles) {
      if (o.x + o.width * 2.45 < wx0 - 50 || o.x - o.width * .8 > wx0 + rowLength + 50) continue;
      const center = o.center;
      for (const side of [-1, 1]) {
        const shape = side < 0 ? o.topShape : o.bottomShape; if (!shape) continue;
        const anchor = center + side * o.gap / 2;
        const world = shape.map(([x, y]) => [o.x + x, anchor + y]);
        const spans = o.surfaceMaterials?.[side < 0 ? 'top' : 'bottom'];
        if (!spans) { r.polygon(world.map(toPx), side < 0 ? OLD_ROOF : (o.exitFoundation ? '#55606a' : OLD_FLOOR), clip); continue; }
        // Landform: paint each material span column by column with its colour.
        const surface = world.slice(2).slice().reverse();
        const yAt = x => { for (let i = 1; i < surface.length; i++) if (x <= surface[i][0]) { const p = surface[i - 1], q = surface[i]; return p[1] + (q[1] - p[1]) * (x - p[0]) / ((q[0] - p[0]) || 1); } return surface.at(-1)[1]; };
        for (const [a, b, m] of spans) {
          const rgb = hex(L.MATERIALS[m]?.color || '#888888');
          for (let px = Math.floor(toPx([o.x + a, 0])[0]); px <= Math.ceil(toPx([o.x + b, 0])[0]); px++) {
            if (px < clip[0] || px >= clip[2]) continue;
            const wx = wx0 + (px + .5 - ox) * k; if (wx < o.x + a - k || wx > o.x + b + k) continue;
            const py = oy + yAt(wx) / k;
            if (side > 0) r.rect(px, Math.round(py), 1, clip[3] - Math.round(py), rgb); else r.rect(px, clip[1], 1, Math.round(py) - clip[1], rgb);
          }
        }
      }
      for (const poly of (o.sceneProps || []).length ? obstaclePolygons(o).slice((o.topShape ? 1 : 0) + (o.bottomShape ? 1 : 0)) : []) r.polygon(poly.map(toPx), PROP, clip);
    }
    // Pickups as dots for context (fuel = warm, dark = violet).
    for (const e of layout.embers || []) {
      if (e.x < wx0 || e.x > wx0 + rowLength) continue;
      const [px, py] = toPx([e.x, e.y]); const c = hex(e.harmful ? '#a070ff' : '#ffd36a');
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) < 2) r.set(Math.round(px) + dx, Math.round(py) + dy, c);
    }
  }
  r.write(file);
  return { file, width: strip.w, height: strip.h, length: Math.round(end) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const set = String(args.set || 'all'), duration = Number(args.duration || 90), row = Number(args.row || 2);
  const out = [];
  if (set === 'existing' || set === 'all') {
    const dir = path.join(root, 'outputs/course-design/existing'); fs.mkdirSync(dir, { recursive: true });
    for (const level of BIOME_LEVELS) {
      const slug = level.id.slice(level.biomeId.length + 1);
      out.push(drawStrip(layoutFor(level, { duration, row }), path.join(dir, `${level.biomeId}-${slug}.png`)));
    }
  }
  if (set === 'v2' || set === 'all') {
    const dir = path.join(root, String(args.out || 'outputs/course-design/v2.0')); fs.mkdirSync(dir, { recursive: true });
    for (const id of Object.keys(L.LANDFORM_RECIPES)) {
      const level = BIOME_LEVELS.find(l => l.id === id), recipe = L.LANDFORM_RECIPES[id];
      const layout = layoutFor(level, { generation: 2, duration, row });
      out.push({ ...drawStrip(layout, path.join(dir, `${level.biomeId}-${recipe.id}.png`)), valid: layout.landformCourse?.valid, errors: layout.landformCourse?.errors });
    }
  }
  console.log(JSON.stringify(out.map(o => ({ file: path.relative(root, o.file), w: o.width, h: o.height, length: o.length, valid: o.valid, errors: o.errors?.length ? o.errors : undefined })), null, 1));
}
