// v2.0-icons generator. Draws every icon from a tiny pixel DSL, shades it, outlines it and writes one SVG per icon
// plus manifest.json. Run: node dist/design-lab/assets/icons2/build.mjs   (design lab only, nothing in the game imports this)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = '#2a1d12';
// Families are auto-lit from the top left: [highlight rim, body, shade rim].
const FAM = {
  F: ['#f6ebcc', '#f0c86a', '#d39a3a'],   // Spark gold
  C: ['#fffdf1', '#f6ebcc', '#d8c98a'],   // cream
  N: ['#fffdf1', '#f6ebcc', '#d8c98a'],   // cream, second family so neighbours keep their own rims
  M: ['#8a9a4a', '#536430', '#3e4a24'],   // moss
  R: ['#b8574a', '#7a2f2a', '#5a2220'],   // wine
  S: ['#8fb8c8', '#42768f', '#2f5668'],   // night blue-green (cold subjects)
  L: ['#8a6d44', '#5a4632', '#3d2e1f'],   // leather
  B: ['#a58c57', '#8a6d44', '#5a4632']    // wood
};
const EXP = {G: '#f0c86a', D: '#d39a3a', W: '#fffdf1', O: OUT, Y: '#f6ebcc', c: '#d8c98a', b: '#8a6d44', l: '#5a4632', m: '#8a9a4a', r: '#b8574a', s: '#8fb8c8', n: '#42768f'};

const T = n => {
  const g = Array.from({length: n}, () => Array(n).fill('.'));
  const o = {n, g,
    px(x, y, ch) {x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < n && y < n) g[y][x] = ch; return o;},
    rect(x, y, w, h, ch) {for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.px(x + i, y + j, ch); return o;},
    ell(cx, cy, rx, ry, ch, k = 1) {for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= k) o.px(x, y, ch);} return o;},
    rows(y0, rs, x0 = 0) {rs.forEach((r, j) => [...r].forEach((ch, i) => {if (ch !== '.') o.px(x0 + i, y0 + j, ch);})); return o;},
    cap(x0, y0, x1, y1, r, ch) {for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {const px = x + .5, py = y + .5, dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy))); if (Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)) <= r) o.px(x, y, ch);} return o;},
    sym(y, l, r, ch) {o.rect(l, y, r - l + 1, 1, ch); o.rect(n - 1 - r, y, r - l + 1, 1, ch); return o;},
    erode(from, to) {const s = g.map(r => [...r]); const at = (x, y) => (s[y] && s[y][x]) || '.'; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (s[y][x] === from && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => at(x + a, y + b) === from)) g[y][x] = to; return o;},
    rot() {const s = g.map(r => [...r]); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) g[y][x] = s[n - 1 - x][y]; return o;}
  };
  return o;
};

const I = {}, META = {};
const def = (id, group, name, grid, fn, sizes, note = '') => {I[id] = {fn, grid}; META[id] = {id, group, name, grid, sizes, note};};

// ---------- Menu and controls ----------
def('back-a', 'Menu and controls', 'back (a) block arrow', 16, () => T(16).rows(2, [
  '......FF........', '.....FFF........', '....FFFF........', '...FFFFF........', '..FFFFFFFFFFFF..', '.FFFFFFFFFFFFF..', '.FFFFFFFFFFFFF..', '..FFFFFFFFFFFF..', '...FFFFF........', '....FFFF........', '.....FFF........', '......FF........']), [16, 32], 'blunt two-pixel tip');
def('back-b', 'Menu and controls', 'back (b) chunky chevron', 16, () => {const c = T(16); for (let y = 2; y <= 7; y++) c.rect(9 - (y - 2), y, 4, 1, 'F'); for (let y = 8; y <= 13; y++) c.rect(4 + (y - 8), y, 4, 1, 'F'); return c;}, [16, 32], 'two-pixel flat apex');
def('menu', 'Menu and controls', 'menu (2x2 tiles)', 16, () => T(16).rect(1, 1, 6, 6, 'F').rect(9, 1, 6, 6, 'C').rect(1, 9, 6, 6, 'C').rect(9, 9, 6, 6, 'F'), [16, 32]);
def('settings', 'Menu and controls', 'settings (tune)', 16, () => T(16)
  .rect(1, 2, 14, 2, 'B').rect(9, 1, 4, 4, 'F').rect(1, 7, 14, 2, 'B').rect(3, 6, 4, 4, 'F').rect(1, 12, 14, 2, 'B').rect(7, 11, 4, 4, 'F'), [16, 32]);
def('pause', 'Menu and controls', 'pause', 16, () => T(16).rect(2, 2, 5, 12, 'F').rect(9, 2, 5, 12, 'F'), [16, 32]);
def('play', 'Menu and controls', 'play / resume', 16, () => {const c = T(16); [2, 4, 5, 7, 8, 10, 10, 8, 7, 5, 4, 2].forEach((w, i) => c.rect(3, 2 + i, w, 1, 'F')); return c;}, [16, 32]);
def('info', 'Menu and controls', 'info / help', 16, () => T(16).ell(8, 8, 7, 7, 'S').rect(7, 4, 2, 2, 'W').rect(7, 7, 2, 4, 'W').rect(6, 11, 4, 1, 'W').px(6, 7, 'W'), [16, 32]);
def('glossary', 'Menu and controls', 'glossary (open book)', 16, () => T(16).rect(1, 3, 14, 10, 'R').rect(2, 4, 5, 8, 'C').rect(9, 4, 5, 8, 'C')
  .rect(3, 6, 3, 1, 'b').rect(3, 8, 3, 1, 'b').rect(3, 10, 2, 1, 'b').rect(10, 6, 3, 1, 'b').rect(10, 8, 3, 1, 'b').rect(10, 10, 2, 1, 'b').rect(7, 13, 2, 2, 'F'), [16, 32]);
const speaker = () => T(16).rows(3, ['.....C..........', '....CC..........', '...CCC..........', '.CCCCC..........', '.CCCCC..........', '.CCCCC..........', '.CCCCC..........', '...CCC..........', '....CC..........', '.....C..........']);
def('sound', 'Menu and controls', 'sound on', 16, () => {const c = speaker(); c.rect(8, 6, 2, 4, 'F').rect(12, 3, 2, 10, 'F'); return c;}, [16, 32]);
def('mute', 'Menu and controls', 'sound off / mute', 16, () => {const c = speaker(); for (let i = 0; i < 6; i++) {c.px(8 + i, 5 + i, 'R').px(9 + i, 5 + i, 'R').px(14 - i, 5 + i, 'R').px(13 - i, 5 + i, 'R');} return c;}, [16, 32]);
def('music', 'Menu and controls', 'music', 16, () => T(16).rect(5, 2, 10, 2, 'F').rect(5, 4, 2, 7, 'F').rect(13, 4, 2, 6, 'F').ell(4, 12, 3, 2, 'F').ell(12, 11, 3, 2, 'F'), [16, 32]);
def('check', 'Menu and controls', 'check', 16, () => T(16).rows(3, ['.............MM.', '............MMM.', '...........MMM..', '..........MMM...', '.MM......MMM....', '.MMM....MMM.....', '..MMM..MMM......', '...MMMMMM.......', '....MMMM........', '.....MM.........']), [16, 32]);
def('close', 'Menu and controls', 'close (x)', 16, () => {const c = T(16); for (let i = 0; i < 12; i++) c.px(2 + i, 2 + i, 'C').px(3 + i, 2 + i, 'C').px(13 - i, 2 + i, 'C').px(12 - i, 2 + i, 'C'); return c;}, [16, 32]);
const card = (c, x, y, w, h, f) => c.rect(x, y, w, h, 'O').rect(x + 1, y + 1, w - 2, h - 2, f);
def('deck', 'Menu and controls', 'deck (card stack)', 16, () => {const c = T(16); card(c, 1, 1, 8, 10, 'B'); card(c, 3, 3, 8, 10, 'R'); card(c, 6, 5, 8, 10, 'C'); c.rows(8, ['..GG..', '.GWWG.', '.GWDG.', '..GG..'], 7); return c;}, [16, 32]);
def('collection', 'Menu and controls', 'collection (reliquary shelf)', 16, () => T(16).rect(1, 1, 14, 14, 'B').rect(2, 2, 12, 12, 'L').rect(2, 8, 12, 1, 'B')
  .rows(5, ['.F.', 'FFF', '.F.'], 3).rect(9, 5, 4, 3, 'C').rect(10, 4, 2, 1, 'C').ell(5, 11.5, 2.5, 2, 'R').ell(11, 11.5, 2, 2, 'F'), [16, 32]);
def('map', 'Menu and controls', 'map (folded chart)', 16, () => {const c = T(16).rect(1, 3, 4, 12, 'C').rect(5, 2, 6, 12, 'N').rect(11, 3, 4, 12, 'C'); [[3, 12], [5, 11], [6, 9], [8, 8], [10, 7]].forEach(([x, y]) => c.px(x, y, 'M')); [[12, 5], [14, 5], [13, 6], [12, 7], [14, 7]].forEach(([x, y]) => c.px(x, y, 'R')); return c;}, [16, 32]);
def('tutorial', 'Menu and controls', 'tutorial (lantern)', 16, () => T(16).rows(1, ['.....BBBBBB.....', '.....B....B.....']).rect(4, 3, 8, 1, 'B').rect(3, 4, 10, 1, 'B')
  .rect(3, 5, 10, 7, 'B').rect(5, 5, 6, 7, 'F').rect(7, 7, 2, 3, 'W').rect(3, 12, 10, 1, 'B').rect(4, 13, 8, 1, 'B'), [16, 32]);
def('new-game', 'Menu and controls', 'new game (quill)', 16, () => {const c = T(16).rows(1, ['............FF..', '..........FFFFF.', '.........FFFFFF.', '........FFFFFF..', '.......FFFFFF...', '......FFFFFF....', '.....FFFFFF.....', '....FFFFFF......', '...FFFFF........']); [[12, 2], [11, 3], [10, 4], [9, 5], [8, 6], [7, 7], [6, 8], [5, 9], [4, 10], [3, 11], [2, 12], [1, 13]].forEach(([x, y]) => c.px(x, y, 'b')); c.px(1, 14, 'O'); return c;}, [16, 32]);
def('abandon', 'Menu and controls', 'abandon (broken wisp)', 16, () => {const c = T(16), d = T(16).ell(8, 8, 6, 6, 'S'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (d.g[y][x] === 'S') {if (x + y < 15) c.px(x - 1, y - 1, 'S'); else c.px(x + 1, y + 1, 'S');} c.px(3, 3, 'W').px(3, 4, 'W').px(4, 3, 'W').px(12, 12, 'G').px(11, 13, 'D'); return c;}, [16, 32], 'cold, split disc; must not read as close');

// ---------- Status ----------
const heartA = (c, x0 = 0, y0 = 0, f = 'R') => c.rows(2 + y0, ['..RRRRR..RRRRR..', '.RRRRRRRRRRRRRR.', '.RRRRRRRRRRRRRR.', '.RRRRRRRRRRRRRR.', '.RRRRRRRRRRRRRR.', '..RRRRRRRRRRRR..', '...RRRRRRRRRR...', '....RRRRRRRR....', '.....RRRRRR.....', '......RRRR......', '.......RR.......'].map(r => r.replaceAll('R', f)), x0);
def('heart-full-a', 'Status', 'heart full (a) round', 16, () => heartA(T(16)).px(3, 4, 'W').px(4, 3, 'W').px(3, 5, 'W'), [16, 32, 48]);
def('heart-full-b', 'Status', 'heart full (b) compact', 16, () => T(16).rows(3, ['...RRRR..RRRR...', '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..', '...RRRRRRRRRR...', '....RRRRRRRR....', '.....RRRRRR.....', '......RRRR......', '.......RR.......']).px(4, 5, 'W').px(5, 4, 'W').px(4, 6, 'W'), [16, 32, 48]);
def('heart-empty', 'Status', 'heart empty', 16, () => heartA(T(16), 0, 0, 'L'), [16, 32, 48]);
def('heart-shield', 'Status', 'heart shielded', 16, () => {const c = T(16).rows(1, ['...RRRR..RRRR...', '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..', '...RRRRRRRRRR...', '....RRRRRRRR....', '.....RRRRRR.....'], -1);
  c.px(3, 3, 'W').px(4, 2, 'W').rows(7, ['.......OOOOOOO.', '.......OSSSSSO.', '.......OSSSSSO.', '.......OSSSSSO.', '........OSSSO..', '.........OSO...', '..........O....']); c.px(9, 8, 'W').px(9, 9, 'W'); return c;}, [16, 32, 48]);
def('stored-a', 'Status', 'Stored Sparks (a) chest', 16, () => T(16).rect(3, 3, 10, 1, 'B').rect(2, 4, 12, 1, 'B').rect(1, 5, 14, 3, 'B').rect(1, 9, 14, 5, 'L').rect(3, 4, 2, 10, 'F').rect(11, 4, 2, 10, 'F').rect(1, 8, 14, 1, 'O').rect(6, 7, 4, 4, 'F').px(7, 8, 'O').px(7, 9, 'O'), [16, 32, 48], 'chest: also the map treasure stop, so a/b trade distinctness');
def('stored-b', 'Status', 'Stored Sparks (b) jar', 16, () => T(16).rect(5, 1, 6, 2, 'B').rect(5, 3, 6, 2, 'S').ell(8, 9.5, 6, 5, 'S')
  .rows(6, ['.......GG.......', '.......GG.......', '.....GGWWGG.....', '.....GGWWGG.....', '.......GG.......', '.......GG.......']), [16, 32, 48], 'glass jar holding a Spark');
def('meter-cap', 'Status', 'Spark Meter cap', 16, () => T(16).rect(1, 5, 14, 6, 'L').rect(2, 6, 8, 4, 'F').rect(12, 2, 2, 12, 'R').px(12, 2, 'W'), [16, 32, 48]);
def('luminance', 'Status', 'Luminance (light radius)', 16, () => {const c = T(16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {const dx = x + .5 - 8, dy = y + .5 - 8, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), s = Math.floor((a + Math.PI) / (Math.PI / 6)); if (r >= 5.4 && r <= 7.2) c.px(x, y, 'F');} c.ell(8, 8, 2.8, 2.8, 'F').rect(7, 7, 2, 2, 'W'); return c;}, [16, 32, 48]);
def('collector', 'Status', 'Collector (orb and ring)', 16, () => {const c = T(16), ring = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {const dx = (x + .5 - 8) / 7.2, dy = (y + .5 - 8) / 3.4, k = dx * dx + dy * dy; if (k <= 1 && k >= .5) {c.px(x, y, 'F'); if (y >= 8) ring.push([x, y]);}} c.ell(8, 8, 4, 4, 'S'); ring.forEach(([x, y]) => c.px(x, y, 'F')); c.px(6, 6, 'W').px(7, 6, 'W').px(6, 7, 'W'); return c;}, [16, 32, 48]);
def('slot', 'Status', 'slot (empty card slot)', 16, () => {const c = T(16).rect(3, 1, 10, 14, 'L'); for (let x = 4; x <= 11; x++) for (let y = 2; y <= 13; y++) if (((x === 4 || x === 11) && y % 2 === 0 || (y === 2 || y === 13) && x % 2 === 0)) c.px(x, y, 'c'); return c;}, [16, 32, 48]);
def('locked', 'Status', 'locked', 16, () => T(16).rows(1, ['.....CCCCCC.....', '....CCCCCCCC....', '....CC....CC....', '....CC....CC....', '....CC....CC....', '....CC....CC....']).rect(2, 7, 12, 7, 'F').rect(7, 9, 2, 2, 'O').rect(7, 11, 2, 2, 'O'), [16, 32, 48]);

// ---------- Map stops (24 grid) ----------
def('stop-flight-a', 'Map stops', 'flight (a) wisp and trail', 24, () => {const c = T(24); for (let x = 2; x <= 15; x++) {const cy = 12 + 1.6 * Math.sin((x - 2) / 2.3), t = 1 + (x - 2) / 13 * 4.5; for (let y = 0; y < 24; y++) if (Math.abs(y + .5 - cy) <= t / 2) c.px(x, y, 'C');}
  c.ell(17.5, 11.5, 4.8, 4.8, 'F').rect(16, 9, 3, 3, 'W'); [[4, 5], [3, 5], [5, 5], [4, 4], [4, 6], [9, 19], [8, 19], [10, 19], [9, 18], [9, 20]].forEach(([x, y]) => c.px(x, y, 'G')); return c;}, [24, 48, 72], 'a course: wisp pulling a ribbon of light');
def('stop-flight-b', 'Map stops', 'flight (b) wing', 24, () => T(24).cap(5, 18, 18, 16, 2.6, 'N').cap(5, 18, 20, 10, 2.6, 'C').cap(5, 18, 19, 5, 2.6, 'N').ell(5.5, 18, 3.4, 3, 'F'), [24, 48, 72], 'three-feather wing');
def('stop-elite', 'Map stops', 'elite (wolf)', 24, () => {const c = T(24); [[2, 2, 3], [3, 2, 4], [4, 2, 5], [5, 2, 7]].forEach(([y, l, r]) => c.sym(y, l, r, 'R')); for (let y = 6; y <= 11; y++) c.sym(y, 2, 11, 'R');
  [[12, 3], [13, 5], [14, 7], [15, 8], [16, 8], [17, 9], [18, 9]].forEach(([y, l]) => c.sym(y, l, 11, 'R'));
  c.sym(5, 2, 2, 'r'); c.rect(4, 8, 5, 2, 'G').rect(15, 8, 5, 2, 'G').rect(4, 7, 5, 1, 'O').rect(15, 7, 5, 1, 'O').px(8, 8, 'O').px(8, 9, 'O').px(15, 8, 'O').px(15, 9, 'O').rect(10, 15, 4, 2, 'O').rect(9, 19, 1, 2, 'W').rect(14, 19, 1, 2, 'W'); return c;}, [24, 48, 72]);
def('stop-boss', 'Map stops', 'boss / guardian (horned crown)', 24, () => {const c = T(24); c.sym(9, 5, 11, 'S'); for (let y = 10; y <= 16; y++) c.sym(y, 4, 11, 'S'); [[17, 5], [18, 6], [19, 7], [20, 8], [21, 9]].forEach(([y, l]) => c.sym(y, l, 11, 'S'));
  c.rect(4, 7, 16, 3, 'F').rect(5, 4, 3, 3, 'F').rect(10, 3, 4, 4, 'F').rect(16, 4, 3, 3, 'F');
  [[4, 8, 2, 5.5], [2, 5.5, 3.5, 3]].forEach(([x0, y0, x1, y1]) => {c.cap(x0, y0, x1, y1, 1.6, 'C'); c.cap(23 - x0, y0, 23 - x1, y1, 1.6, 'C');});
  c.rect(6, 12, 4, 3, 'O').rect(14, 12, 4, 3, 'O').rect(7, 13, 2, 1, 'G').rect(15, 13, 2, 1, 'G').rect(11, 15, 2, 2, 'O').rect(8, 19, 8, 1, 'O').rect(9, 18, 1, 1, 'W').rect(14, 18, 1, 1, 'W'); return c;}, [24, 48, 72]);
def('stop-encounter', 'Map stops', 'encounter / event (hooded figure)', 24, () => {const c = T(24); [[1, 10, 11], [2, 8, 11], [3, 7, 11], [4, 6, 11], [5, 5, 11], [6, 5, 11], [7, 5, 11], [8, 5, 11], [9, 5, 11], [10, 5, 11], [11, 4, 11], [12, 4, 11], [13, 3, 11], [14, 3, 11], [15, 3, 11], [16, 2, 11], [17, 2, 11], [18, 2, 11], [19, 2, 11], [20, 2, 11], [21, 2, 11]].forEach(([y, l, r]) => c.sym(y, l, r, 'M'));
  c.ell(11.5, 8, 3.6, 3.9, 'O').rect(9, 8, 2, 1, 'G').rect(13, 8, 2, 1, 'G').rect(11, 13, 2, 2, 'F').rect(8, 17, 1, 4, 'O').rect(15, 17, 1, 4, 'O'); return c;}, [24, 48, 72]);
def('stop-rest', 'Map stops', 'rest (campfire)', 24, () => {const c = T(24).cap(3, 18, 20, 20.5, 1.7, 'B').cap(3, 20.5, 20, 18, 1.7, 'L'); [[2, 11, 11], [3, 10, 11], [4, 10, 11], [5, 9, 11], [6, 9, 11], [7, 8, 11], [8, 8, 11], [9, 7, 11], [10, 7, 11], [11, 6, 11], [12, 6, 11], [13, 6, 11], [14, 6, 11], [15, 7, 11], [16, 8, 11]].forEach(([y, l, r]) => c.sym(y, l, r, 'R'));
  c.erode('R', 'D').erode('D', 'G').erode('G', 'W'); return c;}, [24, 48, 72]);
def('stop-chest', 'Map stops', 'chest / treasure', 24, () => T(24).rect(4, 4, 16, 1, 'B').rect(3, 5, 18, 1, 'B').rect(2, 6, 20, 5, 'B').rect(2, 12, 20, 9, 'L').rect(5, 5, 3, 16, 'F').rect(16, 5, 3, 16, 'F').rect(2, 11, 20, 1, 'O').rect(10, 9, 4, 5, 'F').rect(11, 10, 2, 2, 'O').rect(11, 12, 2, 1, 'O'), [24, 48, 72]);
def('stop-workshop', 'Map stops', 'workshop / forge (anvil)', 24, () => {const c = T(24).rect(4, 18, 16, 4, 'B'); [[7, 4, 21], [8, 2, 21], [9, 2, 21], [10, 4, 20], [11, 8, 17], [12, 9, 16], [13, 9, 16], [14, 8, 17], [15, 6, 19], [16, 5, 20], [17, 5, 20]].forEach(([y, l, r]) => c.rect(l, y, r - l + 1, 1, 'S')); [[12, 2], [16, 4], [9, 4]].forEach(([x, y]) => c.rect(x, y, 2, 2, 'G')); c.px(12, 2, 'W'); return c;}, [24, 48, 72]);
def('stop-unknown', 'Map stops', 'unknown (?)', 24, () => T(24).rows(2, ['........FFFFFFFF........', '......FFFFFFFFFFFF......', '.....FFFFF....FFFFF.....', '.....FFFF......FFFF.....', '.....FFFF......FFFF.....', '..............FFFF......', '.............FFFF.......', '............FFFF........', '...........FFFF.........', '..........FFFF..........', '..........FFFF..........', '..........FFFF..........']).rect(10, 16, 4, 4, 'F'), [24, 48, 72]);

// ---------- Rest actions ----------
def('rest-recover', 'Rest actions', 'recover (heart +)', 16, () => T(16).rows(6, ['.RRR..RRR.', 'RRRRRRRRRR', 'RRRRRRRRRR', 'RRRRRRRRRR', '.RRRRRRRR.', '..RRRRRR..', '...RRRR...', '....RR....'], 1).rect(11, 1, 2, 6, 'F').rect(9, 3, 6, 2, 'F'), [16, 32]);
def('rest-add-slot', 'Rest actions', 'add slot (slot +)', 16, () => {const c = T(16).rect(2, 2, 9, 12, 'L'); for (let x = 3; x <= 9; x++) for (let y = 3; y <= 12; y++) if (((x === 3 || x === 9) && y % 2 === 1 || (y === 3 || y === 12) && x % 2 === 1)) c.px(x, y, 'c'); return c.rect(11, 8, 2, 6, 'F').rect(9, 10, 6, 2, 'F');}, [16, 32]);
def('rest-grow', 'Rest actions', 'grow (sprout)', 16, () => T(16).ell(8, 13, 6.5, 2, 'B').rect(7, 6, 2, 6, 'M').cap(7, 8, 3, 4.5, 1.8, 'M').cap(8.5, 6.5, 13, 3, 1.8, 'M'), [16, 32]);
def('rest-improve', 'Rest actions', 'improve (arrow up)', 16, () => I['back-a'].fn().rot(), [16, 32]);
def('rest-refill', 'Rest actions', 'refill (goblet)', 16, () => {const c = T(16).rect(7, 1, 2, 3, 'F').rect(3, 5, 10, 3, 'C').rect(4, 8, 8, 1, 'C').rect(5, 9, 6, 1, 'C').rect(6, 10, 4, 1, 'C').rect(7, 11, 2, 2, 'C').rect(4, 13, 8, 2, 'C'); return c.rect(4, 6, 8, 2, 'F');}, [16, 32]);
def('rest-forge', 'Rest actions', 'forge (hammer)', 16, () => T(16).cap(3, 13, 10.5, 6.5, 1.1, 'B').cap(9, 3.5, 12.5, 7.5, 2.1, 'S').rect(2, 5, 1, 1, 'G').rect(4, 3, 1, 1, 'G').rect(2, 2, 1, 1, 'G'), [16, 32]);
def('rest-melt', 'Rest actions', 'melt (card into gold)', 16, () => T(16).rect(3, 1, 10, 7, 'C').rect(5, 3, 4, 1, 'b').rect(5, 5, 6, 1, 'b').rect(3, 6, 10, 2, 'F').rect(4, 8, 2, 5, 'F').rect(8, 8, 2, 3, 'F').rect(11, 8, 2, 4, 'F').rect(8, 12, 2, 2, 'F'), [16, 32]);

// ---------- Long Flash ----------
def('long-flash', 'Long Flash', 'Long Flash / sight', 16, () => T(16).rows(4, ['.....CCCCCC.....', '...CCCCCCCCCC...', '.CCCCCCCCCCCCCC.', '.CCCCCCCCCCCCCC.', '.CCCCCCCCCCCCCC.', '.CCCCCCCCCCCCCC.', '...CCCCCCCCCC...', '.....CCCCCC.....']).ell(8, 8, 3, 3, 'F').rect(7, 7, 2, 2, 'O').px(6, 6, 'W'), [16, 32, 48], 'a Spark-gold eye; replaces the flat white triangle');

// ---------- Write ----------
function finish(c) {
  const n = c.n, g = c.g, same = (x, y, ch) => g[y] && g[y][x] === ch;
  const out = Array.from({length: n}, () => Array(n).fill(null));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ch = g[y][x];
    if (ch === '.') continue;
    if (FAM[ch]) {const hi = !same(x, y - 1, ch) || !same(x - 1, y, ch), lo = !same(x, y + 1, ch) || !same(x + 1, y, ch); out[y][x] = hi && lo ? FAM[ch][1] : hi ? FAM[ch][0] : lo ? FAM[ch][2] : FAM[ch][1];}
    else if (EXP[ch]) out[y][x] = EXP[ch]; else throw Error('unknown letter ' + ch);
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g[y + b] && g[y + b][x + a] && g[y + b][x + a] !== '.' && g[y + b][x + a] !== 'O')) out[y][x] = OUT;
  return out;
}
const svg = (px, n) => {const by = {}; px.forEach((row, y) => row.forEach((col, x) => {if (col) (by[col] ||= []).push(`M${x} ${y}h1v1h-1z`);}));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${Object.entries(by).map(([col, d]) => `<path fill="${col}" d="${d.join('')}"/>`).join('')}</svg>`;};
const manifest = [];
for (const id of Object.keys(I)) {
  const c = I[id].fn(); const px = finish(c);
  if (c.n !== I[id].grid) throw Error(id + ' grid');
  let edge = 0; const chk = v => v && v !== OUT && edge++; px[0].forEach(chk); px[c.n - 1].forEach(chk); px.forEach(r => {chk(r[0]); chk(r[c.n - 1]);});
  if (edge) console.warn('touches the canvas edge:', id, edge);
  fs.writeFileSync(path.join(dir, id + '.svg'), svg(px, c.n));
  manifest.push(META[id]);
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(manifest.length + ' icons written');
