// Build dist/design-lab/courses-data.mjs for the v2.0-courses lab page:
// pilot summaries (new course vs the existing course in the same slot),
// validator metrics, the hardest moment, and the 12 x 4 layout plan.
//
//   node scripts/course-design/lab-data.mjs [--pilots=outputs/course-design/pilot-results.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const L = await import('../../dist/course-landforms.mjs');
const { BIOME_LEVELS } = await import('../../dist/biomes.mjs');
const pilots = JSON.parse(fs.readFileSync(path.resolve(root, String(args.pilots || 'outputs/course-design/pilot-results.json')), 'utf8'));
const EXTENT = (90 - 2.8) * 154 + 98;

function pilotSummary(levelId, gen) {
  const rows = pilots.rows.filter(r => r.levelId === levelId && r.gen === gen);
  const ok = rows.filter(r => r.success), mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const byRow = {};
  for (const r of rows) { const k = `row ${r.stage}`; byRow[k] ||= { runs: 0, clears: 0 }; byRow[k].runs++; if (r.success) byRow[k].clears++; }
  const byStyle = {};
  for (const r of rows) { byStyle[r.style] ||= { runs: 0, clears: 0 }; byStyle[r.style].runs++; if (r.success) byStyle[r.style].clears++; }
  const deaths = {};
  for (const r of rows.filter(r => !r.success)) { const k = `${(r.deathAt?.where || 'unknown').replace(/ \((challenge|rest|intro|outro)\)/, '')} (${r.fatalCause})`; deaths[k] = (deaths[k] || 0) + 1; }
  return { runs: rows.length, clears: ok.length, byRow, byStyle,
    liftsPerMinute: +mean(ok.map(r => r.lifts / r.time * 60)).toFixed(1), meanTime: +mean(ok.map(r => r.time)).toFixed(1),
    sparksSpent: Math.round(mean(ok.map(r => r.effortSpent))), sparksCollected: Math.round(mean(ok.map(r => r.fuelRestored))),
    minFuel: Math.round(mean(rows.map(r => r.minFuel))), fuelDeaths: rows.filter(r => r.lowFuelAtDeath).length, deaths };
}

const courses = Object.entries(L.LANDFORM_RECIPES).map(([levelId, recipe]) => {
  const level = BIOME_LEVELS.find(l => l.id === levelId), slot = BIOME_LEVELS.filter(l => l.biomeId === level.biomeId).indexOf(level);
  const course = L.composeCourse(recipe, { seed: 17, extent: EXTENT, windows: 2 });
  const v = L.validateCourse(course);
  const at = x => Math.max(0, Math.min(course.xs.length - 1, Math.round((x - course.xs[0]) / L.DX)));
  const where = x => course.label[at(x)] + (course.ceilLabel[at(x)] ? ' under ' + course.ceilLabel[at(x)] : '');
  const m = v.metrics;
  const hardest = { roomAt: where(m.minRoomX), room: m.minRoom, roomSeconds: +(m.minRoom / L.FLIGHT_FACTS.liftRise * L.FLIGHT_FACTS.liftApexSeconds).toFixed(2),
    leadAt: where(m.leadInSlackX), leadSlack: m.leadInSlackSeconds, gap: m.minGap, band: m.minBand };
  return { levelId, biome: level.biomeId, slot, existingName: level.name, recipe: { id: recipe.id, name: recipe.name, type: recipe.type, summary: recipe.summary, ground: recipe.ground },
    valid: v.ok, metrics: m, hardest, pilots: { v2: pilotSummary(levelId, 2), existing: pilotSummary(levelId, 1) } };
});

// The 12 x 4 plan: every slot gets a landform layout. Built = the eight above.
const P = (slot, name, type, recipe) => ({ slot, name, type, recipe });
const PLAN = {
  moonruins: [P('low-aqueduct', 'Aqueduct Flats', 'valley', 'plain · basin(flooded) · ruin stubs · arch(ruin aqueduct span) · basin'),
    P('bell-stair', 'Fallen Bell Tower', 'climb', 'terraces(ruin, 3) · ruin · climb · highland(band 360) · cliff down'),
    P('courtyard', 'Roofless Courtyard', 'open sky', 'plain · ruin(low walls) · outcrops(rubble, small) · hills'),
    P('moon-chapel', 'Drowned Crypt', 'cave', 'basin(water) · cave(ruin vaults, gap 230) · basin · cave')],
  frost: [P('glacier-gate', 'Glacier Valley', 'valley', 'hills(snow) · cliff down · basin(meltwater) · shelf(ice) · climb'),
    P('iceberg-field', 'Iceberg Shore', 'shoreline', 'plain(snow) · stacks(ice, 3) · basin · stacks(ice, 2)'),
    P('thaw-vault', 'Thawing Ice Cave', 'cave', 'shelf(ice) · cave(ice, icicle drip lines) · plain · cave'),
    P('frozen-falls', 'Crevasse Climb', 'climb', 'terraces(ice) · rugged(snow, band 350) · basin(crevasse, no water) · climb')],
  pinewood: [P('timber-run', 'The Boulder Hills', 'open sky', 'built'), P('high-boughs', 'The Root Cave', 'cave', 'built'),
    P('fallen-giant', 'The Bridge Valley', 'valley', 'built'), P('bark-switchback', 'The Crag Ridge', 'open sky', 'built')],
  marsh: [P('reed-channel', 'Reed Islands', 'shoreline', 'basin(water) · hills(low islands, amp 20) · basin · outcrops(soil hummocks)'),
    P('willow-veil', 'Willow Water', 'canopy', 'basin(water) · canopy(willow, depth 140) · plain · canopy'),
    P('sunken-walk', 'Sunken Boardwalk', 'valley', 'basin · log(fallen trunk) · ruin(posts) · basin · climb'),
    P('mire-bells', 'Mangrove Hollow', 'cave', 'canopy · cave(soil, root drip lines) · basin')],
  fungal: [P('cap-canopy', 'Cap Canopy', 'canopy', 'hills · canopy(caps, depth 150) · hills · canopy'),
    P('spore-stair', 'Spore Terraces', 'climb', 'terraces(soil, 3) · climb · hills · terraces down'),
    P('gilled-arch', 'Gilled Arches', 'gorge', 'hills · arch(cap, clear 245) · outcrops(puffballs) · arch'),
    P('mycelium-run', 'Mycelium Downs', 'open sky', 'hills · outcrops(soft, 2) · basin(stream) · hills')],
  basalt: [P('column-stair', 'Column Stair', 'climb', 'terraces(rock columns, 3) · cliff · highland(band 360) · cliff down'),
    P('smoke-flue', 'Lava Tube', 'cave', 'cave(rock, gap 230, few drips) · plain(cinder) · cave'),
    P('lava-lip', 'Cinder Spillway', 'descent', 'highland start · cliff down · scree · cliff down · basin(cooled lava)'),
    P('scoria-crown', 'Scoria Crown', 'open sky', 'hills(scree) · rugged(rock, band 350) · outcrops(bombs)')],
  desert: [P('dune-trough', 'The Dune Sea', 'open sky', 'built'), P('sand-temple', 'The Arch Gorge', 'gorge', 'built'),
    P('obelisk-walk', 'The Hoodoo Field', 'open sky', 'built'), P('oasis-arch', 'The Escarpment Climb', 'climb', 'built')],
  coral: [P('reef-pass', 'Reef Arches', 'gorge', 'basin(dry) · arch(coral) · outcrops(brain coral) · arch'),
    P('tidal-gully', 'Tidal Stacks', 'shoreline', 'plain · stacks(rock, 2) · basin(tide pools) · stacks'),
    P('wreck-canopy', 'Wreck Ribs', 'cave', 'plain · cave(wood ribs, gap 240) · outcrops · plain'),
    P('coral-lattice', 'Lattice Climb', 'climb', 'terraces(rock) · climb · outcrops · highland(band 360)')],
  crystal: [P('prism-teeth', 'Prism Cave', 'cave', 'cave(crystal drip lines) · plain · cave'),
    P('mirror-well', 'Mirror Basin', 'valley', 'cliff down · basin(still pool) · cliff · climb'),
    P('wedge-run', 'Crystal Ridge', 'open sky', 'hills(scree) · rugged(crystal teeth, band 350) · hills'),
    P('chime-stair', 'Chime Terraces', 'climb', 'terraces(rock, 3) · climb · terraces down')],
  cloud: [P('sky-islands', 'Sky Islands', 'archipelago', 'needs floating bodies (engine): islands with lit tops and undersides over an open drop'),
    P('broken-span', 'Broken Span', 'gorge', 'needs floating bodies for the span; interim: arch(cloud) · cliff · arch'),
    P('wind-stair', 'Wind Stair', 'climb', 'terraces(rock) · climb · highland(band 360) · cliff down'),
    P('cloud-vault', 'Cloudbank Vault', 'canopy', 'hills · canopy(cloud banks, soft) · plain · canopy')],
  thorn: [P('briar-tunnel', 'Briar Tunnel', 'cave', 'canopy(briar) · cave(soft bramble walls) · hills'),
    P('seedpod-roof', 'Seedpod Roof', 'canopy', 'hills · canopy(pods, depth 140) · plain'),
    P('thicket-run', 'Hedge Downs', 'open sky', 'hills · outcrops(hedge mounds, soft) · log · hills'),
    P('thorn-steeple', 'Thorn Steeple', 'climb', 'climb · terraces(soil) · rugged(roots, band 360) · descent')],
  cemetery: [P('grave-road', 'Grave Road', 'open sky', 'hills · ruin(grave markers, small) · outcrops · hills'),
    P('crypt-pass', 'Crypt Pass', 'cave', 'ruin · cave(ruin vault) · plain · cave'),
    P('bell-garden', 'Bell Garden', 'gorge', 'plain · arch(ruin bell gate) · hills · arch'),
    P('sepulchre-stair', 'Sepulchre Descent', 'descent', 'highland start · terraces(ruin, down) · cliff down · basin')],
};
const plan = Object.entries(PLAN).map(([biome, rows]) => ({ biome, rows: rows.map(r => ({ ...r, built: r.recipe === 'built', levelId: `${biome}-${r.slot}` })) }));

const out = path.join(root, 'dist/design-lab/courses-data.mjs');
fs.writeFileSync(out, `// Generated by scripts/course-design/lab-data.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.\n`
  + `export const PILOT_SETUP = ${JSON.stringify({ seeds: pilots.seeds, rows: pilots.rows ? [...new Set(pilots.rows.map(r => r.stage))] : [], styles: pilots.styles, note: 'human150/human250 delayed-input pilots from scripts/balance-current-flight.mjs; collector companion; difficulty 1, map 1; same seeds for both columns.' })};\n`
  + `export const COURSES = ${JSON.stringify(courses, null, 1)};\n`
  + `export const PLAN = ${JSON.stringify(plan, null, 1)};\n`);
console.log(JSON.stringify(courses.map(c => ({ id: c.recipe.id, v2: `${c.pilots.v2.clears}/${c.pilots.v2.runs}`, existing: `${c.pilots.existing.clears}/${c.pilots.existing.runs}`, hardest: c.hardest })), null, 1));
