// Fly the landform prototype courses (?courses=2) and the existing course in
// the same slot with the repository's delayed-input human pilots
// (balance-current-flight.mjs `simulate`, human150 / human250), same seeds,
// same rows, same build, and report clears, Lifts, Sparks and failure spots.
//
//   node scripts/course-design/pilot-courses.mjs [--seeds=5] [--rows=0,3] [--styles=human150,human250]
//        [--levels=id,id] [--gens=1,2] [--out=outputs/course-design/pilot-results.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
process.argv.push('--importOnly');
const { simulate, buildCase } = await import('../balance-current-flight.mjs');
const { BIOME_LEVELS } = await import('../../dist/biomes.mjs');
const L = await import('../../dist/course-landforms.mjs');

const seeds = Number(args.seeds || 5), rows = String(args.rows || '0,3').split(',').map(Number);
const styles = String(args.styles || 'human150,human250').split(','), gens = String(args.gens || '1,2').split(',').map(Number);
const levels = args.levels ? String(args.levels).split(',') : Object.keys(L.LANDFORM_RECIPES);
const out = path.resolve(root, String(args.out || 'outputs/course-design/pilot-results.json'));
const rowsOut = [], started = Date.now();

function labelAt(layout, worldX) {
  const prof = layout?.landformCourse?.profile;
  if (prof) { const i = Math.max(0, Math.min(prof.label.length - 1, Math.round((worldX - prof.x0) / prof.dx))); return `${prof.label[i]}${prof.ceilLabel[i] ? '+' + prof.ceilLabel[i] : ''} (${prof.role[i]})`; }
  const o = layout?.obstacles?.find(o => worldX >= o.x - o.width * .8 && worldX <= o.x + o.width * 2.45);
  return o ? `${o.setpiece || 'cell'} (${o.hard ? 'challenge' : 'rest'})` : 'open';
}

for (const levelId of levels) {
  const level = BIOME_LEVELS.find(l => l.id === levelId);
  for (const gen of gens) for (const stage of rows) for (const style of styles) for (let seedIndex = 0; seedIndex < seeds; seedIndex++) {
    const config = buildCase({ terrain: level.terrain, difficulty: 1, stage, role: 'collector', style, seedIndex, profile: stage === 0 ? 'refuge' : 'cavern', skills: { 'main-efficiency': 1 } });
    config.seed += `:${level.id}`;
    Object.assign(config.node, { levelId: level.id, biomeId: level.biomeId, locationName: level.name });
    let engine = null;
    config.prepareEngine = e => { engine = e; };
    L.overrideCourseGeneration(gen);
    let record;
    try { record = simulate(config); } finally { L.overrideCourseGeneration(null); }
    const layout = engine.layout, s = engine.height / 620;
    const deathX = record.success ? null : record.distance + engine.player.x;
    const hits = record.hitLog.map(h => { const o = layout.obstacles.find(o => o.id === h.obstacle); return { t: h.time, where: o ? labelAt(layout, o.x + o.width * .8) : 'boundary', saved: h.saved }; });
    rowsOut.push({ levelId, gen, recipe: gen === 2 ? L.LANDFORM_RECIPES[levelId]?.id : null, stage, style, seedIndex, duration: config.duration,
      success: record.success, progress: record.progress, time: record.time, lifts: record.flaps, liftInputs: record.liftInputs,
      startFuel: record.startFuel, endFuel: record.endFuel, minFuel: record.minFuel, fuelRestored: record.fuelRestored, effortSpent: record.effortSpent,
      flapCost: record.flapCost, maxAvailableFuel: record.maxAvailableFuel, pickups: record.direct + record.collector, fatalCause: record.fatalCause,
      lowFuelAtDeath: record.lowFuelAtDeath, deathAt: deathX === null ? null : { x: Math.round(deathX), where: labelAt(layout, deathX), y: Math.round(engine.player.y / s) }, hits,
      valid: layout.landformCourse?.valid ?? null });
    if (rowsOut.length % 10 === 0) console.log(JSON.stringify({ done: rowsOut.length, seconds: Math.round((Date.now() - started) / 1000) }));
  }
}

const groups = {};
for (const r of rowsOut) (groups[`${r.levelId}|gen${r.gen}|row${r.stage}|${r.style}`] ||= []).push(r);
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, round = v => v === null ? null : Math.round(v * 100) / 100;
const summary = Object.fromEntries(Object.entries(groups).map(([k, items]) => [k, {
  n: items.length, clears: items.filter(r => r.success).length, clearRate: round(items.filter(r => r.success).length / items.length),
  meanProgress: round(mean(items.map(r => r.progress))), meanLifts: round(mean(items.map(r => r.lifts))), meanTime: round(mean(items.map(r => r.time))),
  meanSpent: round(mean(items.map(r => r.effortSpent))), meanCollected: round(mean(items.map(r => r.fuelRestored))), meanMinFuel: round(mean(items.map(r => r.minFuel))),
  fuelDeaths: items.filter(r => r.fatalCause === 'fuel').length, collisionDeaths: items.filter(r => r.fatalCause === 'collision').length,
  deaths: items.filter(r => !r.success).map(r => r.deathAt?.where + ' @' + r.deathAt?.x + ' ' + r.fatalCause) }]));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ createdAt: new Date().toISOString(), seconds: (Date.now() - started) / 1000, seeds, rows, styles, gens, levels, summary, rows: rowsOut }, null, 1));
console.log(JSON.stringify(summary, null, 1));
