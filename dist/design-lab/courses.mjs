// v2.0-courses lab: whole-course silhouette strips from the real layout code.
// New course = buildFlightLayout with the landform switch on for that slot;
// existing = the same slot with the switch off. Pilot numbers come from
// courses-data.mjs (scripts/course-design/lab-data.mjs).
import { buildFlightLayout, obstaclePolygons } from '../flight.mjs?v=guide-clarity-1';
import { BIOMES, BIOME_LEVELS } from '../biomes.mjs?v=guide-clarity-1';
import * as L from '../course-landforms.mjs?v=guide-clarity-1';
import { COURSES, PLAN, PILOT_SETUP } from './courses-data.mjs?v=1';

const K = 5, FRAME = 620, H = Math.round(FRAME / K);
const status = document.querySelector('#status');
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter(k => k != null)); return n; };
const ROLE = { intro: '#7f9bb5', challenge: '#c8573a', rest: '#7fa36a', outro: '#7f9bb5' };

function layoutFor(level, generation) {
  L.overrideCourseGeneration(generation);
  try { return buildFlightLayout({ seed: 17, terrain: level.terrain, levelId: level.id, duration: 90, speed: 154, height: FRAME, stage: 2, difficulty: 1, lengthScale: 1 }); }
  finally { L.overrideCourseGeneration(null); }
}
function canvasFor(width) { const c = el('canvas'); c.width = Math.ceil(width / K) + 2; c.height = H + 22; c.style.width = c.width + 'px'; c.style.height = c.height + 'px'; return c; }
function sky(c) { const g = c.getContext('2d'); g.fillStyle = '#0d1420'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#3a4a66'; g.fillRect(0, 22, c.width, 1); return g; }
function pickups(g, layout) {
  for (const p of layout.embers || []) { g.fillStyle = p.harmful ? '#a070ff' : '#ffd36a'; g.fillRect(Math.round(p.x / K) - 1, 22 + Math.round(p.y / K) - 1, 2, 2); }
}

function drawLandform(layout) {
  const prof = layout.landformCourse.profile, end = prof.x0 + prof.dx * prof.floor.length;
  const c = canvasFor(end), g = sky(c);
  for (let px = 0; px < c.width; px++) {
    const x = px * K, i = Math.round((x - prof.x0) / prof.dx); if (i < 0 || i >= prof.floor.length) continue;
    const soft = prof.soft[i], rock = prof.rock[i];
    g.fillStyle = L.MATERIALS[prof.groundMat[i]]?.color || '#777'; g.fillRect(px, 22 + Math.round(soft / K), 1, H);
    if (rock !== null && rock < soft) { g.fillStyle = L.MATERIALS[prof.floorMat[i]]?.color || '#59545a'; g.fillRect(px, 22 + Math.round(rock / K), 1, Math.max(1, Math.round((soft - rock) / K) + 1)); }
    if (prof.ceil[i] !== null) { g.fillStyle = L.MATERIALS[prof.ceilMat[i]]?.color || '#59545a'; g.fillRect(px, 22, 1, Math.max(1, Math.round(prof.ceil[i] / K))); }
  }
  pickups(g, layout);
  // Landform labels along the top, coloured by role.
  g.font = '11px Pixelify, monospace'; g.textBaseline = 'top';
  let lastEnd = -1;
  for (const p of prof.pieces) {
    const x0 = Math.max(0, p.x0 / K), x1 = p.x1 / K;
    g.fillStyle = ROLE[p.role] || '#999'; g.fillRect(x0, 0, Math.max(1, x1 - x0 - 1), 3);
    if (x0 > lastEnd + 4) { g.fillStyle = '#e8dcb8'; g.fillText(p.label, x0 + 2, 6); lastEnd = x0 + g.measureText(p.label).width; }
  }
  return c;
}

function drawExisting(layout) {
  const end = Math.max(...layout.obstacles.map(o => o.x + o.width * 2.45));
  const c = canvasFor(end + 100), g = sky(c);
  g.save(); g.translate(0, 22); g.scale(1 / K, 1 / K);
  for (const o of layout.obstacles) {
    const polys = obstaclePolygons(o, 0), sides = [o.topShape ? -1 : null, o.bottomShape ? 1 : null].filter(Boolean);
    polys.forEach((poly, n) => {
      g.fillStyle = n < sides.length ? (sides[n] < 0 ? '#6d7390' : (o.exitFoundation ? '#55606a' : '#8a7b63')) : '#c0683a';
      g.beginPath(); poly.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    });
  }
  g.restore();
  pickups(g, layout);
  g.font = '11px Pixelify, monospace'; g.textBaseline = 'top'; g.fillStyle = '#e8dcb8';
  let lastEnd = -1;
  for (const s of layout.sections || []) {
    const x0 = Math.max(0, s.start / K), x1 = s.end / K;
    g.fillStyle = ROLE[s.hard ? 'challenge' : s.kind === 'intro' || s.kind === 'outro' ? 'intro' : 'rest']; g.fillRect(x0, 0, Math.max(1, x1 - x0 - 1), 3);
    const label = s.hard ? 'challenge' : s.kind;
    if (x0 > lastEnd + 4) { g.fillStyle = '#e8dcb8'; g.fillText(label, x0 + 2, 6); lastEnd = x0 + g.measureText(label).width; }
  }
  return c;
}

const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
function pilotCard(title, s) {
  const deaths = Object.entries(s.deaths).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => el('li', {}, `${v}× ${k}`));
  const cls = s.clears / s.runs >= .9 ? 'good' : 'warn';
  return el('div', { className: 'cl-card' },
    el('b', {}, title), el('div', {}, 'Clears ', el('span', { className: cls }, `${s.clears}/${s.runs} (${pct(s.clears, s.runs)})`),
      ' · ', Object.entries(s.byStyle).map(([k, v]) => `${k} ${v.clears}/${v.runs}`).join(', ')),
    el('div', {}, Object.entries(s.byRow).map(([k, v]) => `${k}: ${v.clears}/${v.runs}`).join(' · ')),
    el('div', {}, `Lifts ${s.liftsPerMinute}/min · Sparks spent ${s.sparksSpent} vs collected ${s.sparksCollected} · lowest meter ${s.minFuel}`),
    deaths.length ? el('ul', {}, ...deaths) : el('div', {}, 'No failures.'));
}

function legend() {
  const box = document.querySelector('#legend');
  for (const [name, m] of Object.entries(L.MATERIALS)) box.append(el('span', {}, Object.assign(el('i'), { style: `background:${m.color}` }), name));
  box.append(el('span', {}, Object.assign(el('i'), { style: 'background:#8a7b63' }), 'old ground'), el('span', {}, Object.assign(el('i'), { style: 'background:#6d7390' }), 'old ceiling'),
    el('span', {}, Object.assign(el('i'), { style: 'background:#c0683a' }), 'old solid prop'), el('span', {}, Object.assign(el('i'), { style: 'background:#ffd36a' }), 'Spark'));
}

function courses() {
  document.querySelector('#pilot-note').textContent = `Pilots: ${PILOT_SETUP.styles.join(' and ')} (delayed-input human models), ${PILOT_SETUP.seeds} seeds × rows ${PILOT_SETUP.rows.join(', ')}, same seeds for old and new. ${PILOT_SETUP.note}`;
  const list = document.querySelector('#course-list');
  for (const c of COURSES) {
    const level = BIOME_LEVELS.find(l => l.id === c.levelId), biome = BIOMES.find(b => b.id === c.biome);
    const v2 = layoutFor(level, 2), old = layoutFor(level, 1);
    const play = `../game.html?mock=boundary&cards=1&biome=${c.biome}&course=${c.slot + 1}`;
    const h = c.hardest;
    list.append(el('article', { className: 'cl-course' },
      el('h3', {}, `${biome.name} · ${c.recipe.name}`, el('span', { className: 'cl-type' }, c.recipe.type), el('span', { className: 'cl-type' }, `replaces slot ${c.slot + 1}: ${c.existingName}`)),
      el('p', { className: 'cl-does' }, c.recipe.summary),
      el('div', { className: 'cl-row' },
        el('figure', { className: 'cl-strip' }, el('figcaption', {}, 'New · materials coloured, landforms labelled (red bar = challenge)'), el('div', { className: 'cl-scroll' }, drawLandform(v2))),
        el('figure', { className: 'cl-strip' }, el('figcaption', {}, `Existing · ${c.existingName}`), el('div', { className: 'cl-scroll' }, drawExisting(old)))),
      el('div', { className: 'cl-stats' }, pilotCard('New course, pilots', c.pilots.v2), pilotCard('Existing course, same pilots', c.pilots.existing),
        el('div', { className: 'cl-card' }, el('b', {}, 'Hardest moment'),
          el('div', {}, `Least room: ${h.room} units at ${h.roomAt} (one Lift rises 70).`),
          el('div', {}, `Steepest rise ahead: ${h.leadSlack} s to spare after a 0.25 s reaction, at ${h.leadAt}.`),
          el('div', {}, h.gap ? `Lowest overhead gap ${h.gap}; ` : 'No overhead; ', h.band ? `open sky above ground at least ${h.band}.` : ''))),
      el('div', { className: 'cl-play' }, el('a', { href: `${play}&courses=2` }, 'Play new course'), el('a', { className: 'old', href: `${play}&courses=1` }, 'Play existing'))));
  }
}

function key() {
  const grid = document.querySelector('#key-grid');
  const items = [
    ['hills', { len: 900, level: 520, amp: 50 }, 'soil', 'Rolling hills', 'Long smooth slopes; glide down, one Lift up.'],
    ['dunes', { len: 900, level: 520, amp: 70, wave: 520 }, 'sand', 'Dunes', 'Gentle windward ramp, steep slip face; skim the crest.'],
    ['terraces', { len: 900, steps: 3, to: 430 }, 'soil', 'Eroded terraces', 'Level strata with rounded lips; a stair to climb.'],
    ['basin', { len: 900, depth: 50 }, 'soil', 'Lake basin', 'Low wide dip with a flat water line; a rest.'],
    ['climb', { len: 900, to: 380 }, 'scree', 'Scree climb', 'A long rise at the angle of repose; steady Lifts.'],
    ['cliff', { len: 700, h: 100, dir: 'down' }, 'soil', 'Cliff with talus', 'Rock face, debris heaped at its foot; drop and glide.'],
    ['mesa', { len: 900, h: 170 }, 'sand', 'Mesa', 'Caprock over a broken slope, flat top; one big hop.'],
    ['rugged', { len: 1200, band: 360, amp: 34, to: 520 }, 'scree', 'Rugged mountain', 'Summits and saddles crowned with rock teeth; hop along.'],
    ['outcrops', { len: 900, count: 2, size: [70, 110], level: 520 }, 'soil', 'Rock outcrops', 'Hard, angular boulders half-buried in soft ground.'],
    ['stacks', { len: 900, count: 2, h: 150 }, 'sand', 'Sea stacks', 'Broad rock pillars standing in water.'],
    ['log', { len: 800, h: 50 }, 'soil', 'Fallen giant', 'A straight trunk on the ground with its root plate.'],
    ['cave', { len: 1200, gap: 230, level: 520 }, 'soil', 'Cave', 'Roof with drip lines, stalagmite mounds below; mouths descend from the mountain.'],
    ['arch', { len: 900, clear: 245, span: 520 }, 'sand', 'Natural arch', 'Underside of a span whose deck is above the frame.'],
    ['canopy', { len: 900, depth: 120 }, 'soil', 'Boughs', 'Rounded foliage from trees above the frame.'],
    ['shelf', { len: 900, depth: 130 }, 'snow', 'Ice shelf', 'Flat hanging ice with short icicles.'],
  ];
  for (const [kind, params, ground, name, meaning] of items) {
    const recipe = { id: `key-${kind}`, name, ground, start: 540, intro: [['plain', { len: 300, level: 540 }]], challenge: [[[kind, params]]], rest: [], outro: [['plain', { len: 300, level: 540 }]] };
    const course = L.composeCourse(recipe, { seed: 5, extent: 300 + (params.len || 600) + 100, windows: 1 });
    const c = el('canvas'); const k = 3; c.width = Math.round((course.xs.at(-1) - course.xs[0]) / k); c.height = Math.round(FRAME / k);
    const g = c.getContext('2d'); g.fillStyle = '#0d1420'; g.fillRect(0, 0, c.width, c.height);
    for (let px = 0; px < c.width; px++) {
      const i = Math.min(course.xs.length - 1, Math.round(px * k / L.DX)), soft = course.soft[i], rock = course.rock[i];
      g.fillStyle = L.MATERIALS[course.groundMat[i]]?.color || '#777'; g.fillRect(px, Math.round(soft / k), 1, c.height);
      if (rock < soft) { g.fillStyle = L.MATERIALS[course.floorMat[i]]?.color; g.fillRect(px, Math.round(rock / k), 1, Math.round((soft - rock) / k) + 1); }
      if (Number.isFinite(course.ceil[i])) { g.fillStyle = L.MATERIALS[course.ceilMat[i]]?.color || '#59545a'; g.fillRect(px, 0, 1, Math.round(course.ceil[i] / k)); }
    }
    grid.append(el('figure', {}, c, el('figcaption', {}, el('b', {}, name), meaning)));
  }
}

function plan() {
  const table = document.querySelector('#plan-table');
  table.append(el('thead', {}, el('tr', {}, el('th', {}, 'Biome'), el('th', {}, 'Slot 1'), el('th', {}, 'Slot 2'), el('th', {}, 'Slot 3'), el('th', {}, 'Slot 4'))));
  const body = el('tbody');
  for (const row of PLAN) {
    const biome = BIOMES.find(b => b.id === row.biome);
    body.append(el('tr', {}, el('th', {}, biome?.name || row.biome), ...row.rows.map(r => el('td', { className: r.built ? 'built' : '' },
      el('b', {}, `${r.name}${r.built ? ' · built' : ''}`), el('span', {}, `${r.type} · ${r.built ? 'see above' : r.recipe}`)))));
  }
  table.append(body);
}

try { legend(); courses(); key(); plan(); status.textContent = `${COURSES.length} courses built from recipes; all strips are drawn from the real layout code.`; }
catch (error) { status.textContent = 'Error: ' + error.message; console.error(error); }
