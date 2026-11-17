// v1.0-cardart: hand-placed 48x48 card pictures for the design lab. Nothing in the game imports this.
// Every picture is a 48x48 letter grid painted with a tiny pixel toolkit (whole-pixel rects, discs,
// lines and hand-drawn sprites), then written out as crispEdges SVG paths: one <path> per colour,
// one 1x1 square per pixel. No gradients, filters or bitmaps.

export const PAL = Object.freeze({
  O: ['#2a1d12', 'Outline (warm dark)'],
  L: ['#5a4632', 'Leather'],
  B: ['#8a6d44', 'Wood'],
  P: ['#dcc693', 'Paper'],
  Y: ['#f3e6b9', 'Pale (wisp body)'],
  W: ['#fffdf1', 'White-hot core'],
  G: ['#f0c86a', 'Spark gold'],
  D: ['#d39a3a', 'Spark deep gold'],
  E: ['#c8642e', 'Ember'],
  R: ['#7a2f2a', 'Wine'],
  M: ['#536430', 'Moss'],
  m: ['#8a9a4a', 'Moss light'],
  K: ['#14241e', 'Night deep'],
  N: ['#1f3a33', 'Night'],
  T: ['#2f5a4c', 'Night teal'],
  C: ['#5f9f86', 'Collector mint'],
  c: ['#b4dcc0', 'Collector light'],
});

const S = 48;
const grid = (bg = 'K') => Array.from({length: S}, () => Array(S).fill(bg));
const inb = (x, y) => x >= 0 && y >= 0 && x < S && y < S;
const px = (g, x, y, ch) => { if (inb(x, y)) g[y][x] = ch; };
const rect = (g, x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(g, i, j, ch); };
const inDisc = (x, y, cx, cy, r) => (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r;
const disc = (g, cx, cy, r, ch, keep) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inDisc(x, y, cx, cy, r) && (!keep || keep(x, y))) px(g, x, y, ch); };
const ring = (g, cx, cy, r, w, ch, keep) => disc(g, cx, cy, r, ch, (x, y) => !inDisc(x, y, cx, cy, r - w) && (!keep || keep(x, y)));
function line(g, x0, y0, x1, y1, ch) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) { px(g, x0, y0, ch); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
// Stamp a hand-drawn sprite ('.' is transparent).
const stamp = (g, rows, x, y) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(g, x + i, y + j, ch); }));
// Draw a filled shape on a scratch layer, then lay it down with a 1px warm-dark outline around it.
function shape(g, draw, {outline = 'O', diag = false} = {}) {
  const layer = Array.from({length: S}, () => Array(S).fill(null));
  draw(layer);
  const has = (x, y) => inb(x, y) && layer[y][x] !== null;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (has(x, y)) continue;
    const n4 = has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1);
    const n8 = diag && (has(x - 1, y - 1) || has(x + 1, y - 1) || has(x - 1, y + 1) || has(x + 1, y + 1));
    if (n4 || n8) px(g, x, y, outline);
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (has(x, y)) g[y][x] = layer[y][x];
}
const L_ = {px, rect, disc, ring, line, stamp};

// ── Hand-drawn sprites ────────────────────────────────────────────────────────
// The approved Spark (dist/assets/ui/spark.svg), cell for cell.
const SPARK16 = [
  '.......OO.......',
  '......ODDO......',
  '......OGGO......',
  '......OGGO......',
  '.....OGGGGO.....',
  '....OOGWWGOO....',
  '.OOOGGWWWWGGOOO.',
  'ODGGWWWWWWWWGGDO',
  'ODGGWWWWWWWWGGDO',
  '.OOOGGWWWWGGOOO.',
  '....OOGWWGOO....',
  '.....OGGGGO.....',
  '......OGGO......',
  '......OGGO......',
  '......ODDO......',
  '.......OO.......'];
// The same four-point star at 11 and 7 pixels, for smaller Sparks in a scene.
const SPARK11 = [
  '.....O.....',
  '....ODO....',
  '....OGO....',
  '...OGWGO...',
  '.OOGWWWGOO.',
  'ODGWWWWWGDO',
  '.OOGWWWGOO.',
  '...OGWGO...',
  '....OGO....',
  '....ODO....',
  '.....O.....'];
const SPARK7 = [
  '...O...',
  '..OGO..',
  '.OGWGO.',
  'OGWWWGO',
  '.OGWGO.',
  '..OGO..',
  '...O...'];
const GLINT = ['.G.', 'GWG', '.G.'];
// One grain ear (kernels alternate pale and gold, shade on the right).
const EAR = [
  '..O..',
  '.OYO.',
  'OYGDO',
  'OGYDO',
  'OYGDO',
  'OGYDO',
  'OYGDO',
  '.ODO.',
  '..O..'];
// Sprout: two leaves on a stem. Left half drawn by hand, mirrored; column 12 is the stem.
const SPROUT_HALF = [
  ['OOO.........', '.'],
  ['OmmOO.......', '.'],
  ['OmmmmOO.....', '.'],
  ['.OmmmmmOO...', '.'],
  ['.OMmmmmmmOO.', '.'],
  ['..OMMmmmmmmO', '.'],
  ['...OMMMmmmmm', 'O'],
  ['....OOMMMMMM', 'm'],
  ['......OOOOOO', 'M'],
  ...Array(4).fill(['...........O', 'M'])];
const SPROUT = SPROUT_HALF.map(([half, mid]) => half + mid + [...half].reverse().join(''));
// The seed it grows from, split at the top (column 5 meets the stem).
const SEED = [
  '....OMO....',
  '...OEMEO...',
  '..OEERREO..',
  '.OEGRRRRRO.',
  'OEGRRRRRRRO',
  'OERRRRRRRRO',
  'ORRRRRRRRLO',
  'ORRRRRRRLLO',
  '.ORRRRRLLO.',
  '..ORRRLLO..',
  '...OOOOO...'];
// The game's campfire (dist/ui/trigger-icons.mjs CAMPFIRE), the Rest light source.
const CAMPFIRE = [
  '.......O........',
  '......OEO.......',
  '......OEEO......',
  '.....OEGEO......',
  '.....OEGGEO.....',
  '....OEGWGEO.....',
  '....OEGWWGEO....',
  '....OEGGWGEO....',
  '...OOOEGGEOOO...',
  '..OBBOOOOOOBBO..',
  '.OBBBBBBBBBBBBO.',
  '..OOBBOOOOBBOO..',
  '....OO....OO....'];

function sparkAt(g, size, cx, cy) {
  const sp = size === 16 ? SPARK16 : size === 11 ? SPARK11 : SPARK7;
  stamp(g, sp, Math.round(cx - sp.length / 2), Math.round(cy - sp.length / 2));
}
// A round glowing orb (wisp or Collector): outline, shaded rim, body, hot core, light from top left.
function orb(g, cx, cy, r, {rim, body, core, hot = 'W'}) {
  disc(g, cx, cy, r + 1, 'O');
  disc(g, cx, cy, r, rim);
  disc(g, cx - 1, cy - 1, r - 1.6, body);
  disc(g, cx - 2, cy - 2, r * .52, core);
  disc(g, cx - 3, cy - 3, Math.max(1.2, r * .22), hot);
}
const wisp = (g, cx, cy, r) => orb(g, cx, cy, r, {rim: 'P', body: 'Y', core: 'W'});
const collector = (g, cx, cy, r) => orb(g, cx, cy, r, {rim: 'C', body: 'C', core: 'c', hot: 'W'});
// Stepped light rings (no gradient): each band is one flat colour.
function glow(g, cx, cy, bands) { bands.forEach(([r, ch]) => disc(g, cx, cy, r, ch)); }
// Legendary: a one-pixel gold key-line inside the frame, with stepped corners.
function keyline(g) {
  for (let i = 3; i < S - 3; i++) { px(g, i, 1, 'D'); px(g, i, S - 2, 'D'); px(g, 1, i, 'D'); px(g, S - 2, i, 'D'); }
  [[2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]].forEach(([x, y]) => px(g, x, y, 'G'));
}
// Sunburst rays for Legendary emblems: 8 stepped spokes from the centre.
function rays(g, cx, cy, r0, r1, ch) {
  for (let a = 0; a < 16; a++) {
    if (a % 2) continue;
    const t = a * Math.PI / 8, w = a % 4 === 0 ? 1 : 0;
    for (let r = r0; r <= r1; r++) {
      const x = Math.round(cx - .5 + Math.cos(t) * r), y = Math.round(cy - .5 + Math.sin(t) * r);
      px(g, x, y, ch); if (w) { px(g, x + Math.round(Math.sin(t)), y - Math.round(Math.cos(t)), ch); }
    }
  }
}
// A short dotted trail of gold pixels from (x0,y0) toward (x1,y1).
function trail(g, x0, y0, x1, y1, n, ch = 'D') {
  for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1); px(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), ch); }
}

// ── Subjects (shared by both directions so the comparison is about treatment) ──
function sheaf(g, cx, base, {tall = 26} = {}) {
  // A bound sheaf: five long ears fanned in a V from the binding, pointed tips, stalks splayed below.
  const waist = base - 11, wx = cx + .5;
  const angles = [-40, -20, 0, 20, 40];
  shape(g, l => {
    for (let k = -3; k <= 3; k++) line(l, cx + Math.round(k / 3), waist + 2, cx + k * 2, base, k < 0 ? 'G' : 'D');
    angles.forEach(deg => {
      const a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = tall - 11;
      for (let t = 0; t <= len; t += .5) {
        const x = Math.floor(wx + dx * t), y = Math.floor(waist + dy * t);
        const ear = t >= len - 9, w = ear && t > len - 8.5 && t < len - .5 ? 1 : 0;
        px(l, x, y, ear ? 'G' : 'D');
        if (w) { px(l, x - 1, y, (Math.floor(t) % 2) ? 'Y' : 'G'); px(l, x + 1, y, 'D'); }
      }
    });
  });
  shape(g, l => { rect(l, cx - 3, waist, 7, 3, 'R'); rect(l, cx - 3, waist, 7, 1, 'E'); });
}
function metronome(g, cx, base, {lit = false} = {}) {
  shape(g, l => {
    for (let y = base - 28, i = 0; y <= base; y++, i++) {
      const half = 4 + Math.floor(i * 9 / 28);
      rect(l, cx - half, y, half * 2, 1, 'B');
      px(l, cx - half, y, lit ? 'P' : 'D'); // lit left edge
      px(l, cx + half - 1, y, 'L');
    }
    rect(l, cx - 15, base - 3, 30, 4, 'L');
    rect(l, cx - 15, base - 3, 30, 1, 'B');
    // face window
    for (let y = base - 24, i = 0; y <= base - 6; y++, i++) { const h = 2 + Math.floor(i * 5 / 19); rect(l, cx - h, y, h * 2, 1, 'O'); }
  });
}
function pendulum(g, cx, base, tipX, tipY) {
  line(g, cx, base - 7, tipX, tipY, 'G');
  line(g, cx - 1, base - 7, tipX - 1, tipY, 'D');
  const wx = Math.round(cx + (tipX - cx) * .55), wy = Math.round(base - 7 + (tipY - base + 7) * .55);
  rect(g, wx - 2, wy - 2, 5, 4, 'O'); rect(g, wx - 1, wy - 1, 3, 2, 'G'); px(g, wx - 1, wy - 1, 'W');
  rect(g, cx - 2, base - 8, 4, 3, 'O'); rect(g, cx - 1, base - 7, 2, 1, 'D');
}
function seedSprout(g, cx, base) {
  // cx = stem column; base = bottom row of the seed.
  stamp(g, SPROUT, cx - 12, base - 23);
  stamp(g, SEED, cx - 5, base - 10);
}
// Left half of the Save heart (mirrored for the right); the cleft sits between columns 10 and 11.
const HEART_HALF = [
  '...OOOO....',
  '.OOEEEEOO..',
  'OEEERRRRRO.',
  'OEERRRRRRRO',
  'OERRRRRRRRR',
  'ORRRRRRRRRR',
  'ORRRRRRRRRR',
  'ORRRRRRRRRR',
  '.ORRRRRRRRR',
  '.ORRRRRRRRR',
  '..ORRRRRRRR',
  '...ORRRRRRR',
  '....ORRRRRR',
  '.....ORRRRR',
  '......ORRRR',
  '.......ORRR',
  '........ORR',
  '.........OR',
  '..........O'];
const HEART = HEART_HALF.map(row => {
  const right = [...row].reverse().map(ch => ch === 'E' ? 'R' : ch);
  for (let i = right.length - 1; i > 0; i--) if (right[i] === 'O' && right[i - 1] === 'R') { right[i - 1] = 'L'; break; }
  return row + right.join('');
});
// A held flame, tip leaning right.
const FLAME = [
  '.....O....',
  '....OEO...',
  '...OEEO...',
  '...OEGEO..',
  '..OEGGEO..',
  '..OEGWGEO.',
  '.OEGWWGEO.',
  '.OEGWWWGEO',
  'OEGWWWWGEO',
  'OEGWWWWGEO',
  'OEGGWWGGEO',
  '.OEGGGGEO.',
  '..OEEEEO..',
  '...OOOO...'];
function heartFlame(g, cx, top) {
  // cx = the heart's cleft; the flame stands in the cleft, in front of the heart.
  stamp(g, HEART, cx - 11, top);
  stamp(g, FLAME, cx - 5, top - 9);
}
function meter(g, x, y, h, {fill = 'G'} = {}) {
  // A vertical Spark meter: frame, full gold fill, a new top segment above the old cap with an up arrow.
  shape(g, l => { rect(l, x, y, 7, h, 'L'); });
  rect(g, x + 1, y + 1, 5, h - 2, fill); rect(g, x + 1, y + 1, 1, h - 2, 'Y'); rect(g, x + 5, y + 1, 1, h - 2, 'D');
  rect(g, x + 1, y + 1, 4, 8, 'W'); // the new top, white-hot
  rect(g, x - 2, y + 9, 11, 2, 'O'); // the old maximum notch, wider than the meter
}

// ── Pictures ──────────────────────────────────────────────────────────────────
const P = {};
// Body Spark +2 (Common): the wisp with two Sparks flying into it.
P['body-spark/A'] = () => { const g = grid('K');
  wisp(g, 24, 32, 9);
  trail(g, 15, 18, 19, 23, 3); trail(g, 33, 18, 29, 23, 3);
  sparkAt(g, 11, 11, 13); sparkAt(g, 11, 37, 13);
  return g; };
P['body-spark/B'] = () => { const g = grid('N');
  rect(g, 0, 0, S, 14, 'K');
  rect(g, 0, 39, S, 9, 'L'); rect(g, 0, 39, S, 2, 'M'); [3, 11, 20, 30, 41].forEach(x => px(g, x, 38, 'M'));
  wisp(g, 24, 29, 8);
  trail(g, 14, 14, 18, 21, 3); trail(g, 34, 14, 30, 21, 3);
  sparkAt(g, 11, 10, 10); sparkAt(g, 11, 38, 10);
  return g; };
// Courier Tip (Common): the Collector delivering a Spark, two small tip Sparks popping off.
P['courier-tip/A'] = () => { const g = grid('K');
  [[2, 24, 7], [4, 29, 9], [2, 34, 6]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 20, 29, 8);
  sparkAt(g, 16, 33, 25);
  sparkAt(g, 7, 39, 9); sparkAt(g, 7, 45, 16);
  return g; };
P['courier-tip/B'] = () => { const g = grid('N');
  rect(g, 0, 0, S, 14, 'K');
  rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 2, 'M'); [5, 17, 26, 38].forEach(x => px(g, x, 39, 'M'));
  [[1, 22, 6], [3, 27, 8], [1, 32, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 18, 27, 7);
  sparkAt(g, 16, 31, 23);
  sparkAt(g, 7, 38, 8); sparkAt(g, 7, 44, 15);
  rect(g, 12, 43, 14, 1, 'O'); // shadow on the ground
  return g; };
// Growth Seed (Rare): a sprouting seed beside a meter whose top has grown past its old notch.
P['growth-seed/A'] = () => { const g = grid('K');
  disc(g, 22, 25, 19, 'N'); ring(g, 22, 25, 19, 2, 'T', (x, y) => x + y < 40); // second layer, lit from top left
  shape(g, l => { rect(l, 7, 38, 24, 5, 'L'); rect(l, 9, 37, 20, 1, 'L'); }); rect(g, 9, 37, 20, 1, 'B'); // soil mound
  seedSprout(g, 18, 41);
  meter(g, 36, 9, 34);
  shape(g, l => { for (let i = 0; i < 4; i++) rect(l, 39 - i, 2 + i, 1 + i * 2, 1, i ? 'G' : 'W'); }); // up arrow over the meter
  return g; };
P['growth-seed/B'] = () => { const g = grid('K');
  rect(g, 0, 22, S, 26, 'N');
  // far hills (second layer)
  for (let x = 0; x < S; x++) { const h = Math.round(4 + 3 * Math.sin(x / 6) + 2 * Math.sin(x / 2.7)); rect(g, x, 30 - h, 1, h, 'T'); }
  // campfire light from the left: warm stepped pool on the ground
  rect(g, 0, 36, S, 12, 'L'); rect(g, 0, 36, S, 1, 'M');
  rect(g, 0, 37, 24, 3, 'B'); rect(g, 0, 37, 14, 1, 'D'); // firelight on the ground, stepped
  stamp(g, CAMPFIRE, -2, 26);
  // growth stake: wooden post with notches, a gold notch above the old top
  shape(g, l => rect(l, 39, 8, 4, 32, 'B')); rect(g, 39, 8, 1, 32, 'P');
  [16, 22, 28, 34].forEach(y => rect(g, 39, y, 3, 1, 'O'));
  shape(g, l => rect(l, 37, 10, 8, 2, 'G'));
  seedSprout(g, 24, 42);
  return g; };
// Rhythm (Rare): a metronome whose arm marks three even beats, shown as three gold pips on an arc.
P['rhythm/A'] = () => { const g = grid('K');
  disc(g, 24, 26, 20, 'N'); ring(g, 24, 26, 20, 2, 'T', (x, y) => x + y < 44);
  metronome(g, 24, 44, {lit: true});
  pendulum(g, 24, 44, 33, 15);
  [[10, 12], [24, 5], [38, 12]].forEach(([x, y], i) => sparkAt(g, 7, x, y));
  return g; };
P['rhythm/B'] = () => { const g = grid('K');
  rect(g, 0, 26, S, 22, 'N');
  disc(g, 6, 7, 4, 'P'); disc(g, 5, 6, 3, 'Y'); // moon: the light source
  for (let x = 0; x < S; x++) { const h = Math.round(5 + 3 * Math.sin(x / 5 + 1)); rect(g, x, 34 - h, 1, h, 'T'); }
  rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 1, 'M');
  metronome(g, 26, 44, {lit: true});
  pendulum(g, 26, 44, 35, 16);
  [[14, 11], [26, 5], [38, 11]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  return g; };
// Resonant Harvest (Legendary): a struck sheaf ringing Sparks outward.
P['harvest-legendary/A'] = () => { const g = grid('K');
  disc(g, 24, 24, 21, 'N');
  rays(g, 24, 24, 12, 21, 'T');
  glow(g, 24, 24, [[13, 'T'], [10, 'C']]);
  ring(g, 24, 24, 18, 1, 'D');
  sheaf(g, 24, 41, {tall: 29});
  [[24, 5], [41, 14], [41, 34], [7, 14], [7, 34]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  keyline(g);
  return g; };
P['harvest-legendary/B'] = () => { const g = grid('K');
  rect(g, 0, 18, S, 30, 'N');
  [[5, 4], [14, 9], [30, 3], [43, 7]].forEach(([x, y]) => stamp(g, GLINT, x, y));
  for (let x = 0; x < S; x++) { const h = Math.round(4 + 2 * Math.sin(x / 4)); rect(g, x, 27 - h, 1, h, 'T'); }
  glow(g, 24, 28, [[15, 'T'], [11, 'C']]);
  rect(g, 0, 37, S, 11, 'M'); rect(g, 0, 37, S, 1, 'm');
  for (let x = 1; x < S; x += 3) { px(g, x, 36, 'D'); px(g, x + 1, 38 + (x % 2), 'D'); }
  ring(g, 24, 28, 19, 1, 'D', (x, y) => y < 37);
  sheaf(g, 24, 43, {tall: 29});
  [[8, 18], [40, 18], [24, 3]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  sparkAt(g, 11, 6, 30); sparkAt(g, 11, 42, 30);
  keyline(g);
  return g; };
// Last Light (Legendary): one small flame held safe in cupped, heart-shaped hands.
P['last-light/A'] = () => { const g = grid('K');
  glow(g, 24, 22, [[17, 'N'], [12, 'L'], [8, 'B']]);
  heartFlame(g, 24, 22);
  sparkAt(g, 7, 12, 8); sparkAt(g, 7, 37, 6); stamp(g, GLINT, 29, 3);
  keyline(g);
  return g; };
P['last-light/B'] = () => { const g = grid('K');
  for (let x = 0; x < S; x++) { const h = Math.round(6 + 4 * Math.sin(x / 7 + 2)); rect(g, x, 38 - h, 1, h, 'N'); }
  glow(g, 24, 28, [[16, 'N'], [12, 'L'], [8, 'B']]);
  rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 1, 'M');
  rect(g, 10, 41, 28, 2, 'B'); rect(g, 16, 41, 16, 1, 'D'); // the flame's light on the ground
  heartFlame(g, 24, 21);
  rect(g, 15, 40, 18, 1, 'O'); rect(g, 19, 41, 10, 1, 'O'); // its shadow
  sparkAt(g, 7, 13, 10); sparkAt(g, 7, 36, 8); stamp(g, GLINT, 26, 4);
  keyline(g);
  return g; };

export const CARD_IDS = ['body-spark', 'courier-tip', 'growth-seed', 'rhythm', 'harvest-legendary', 'last-light'];
export const DIRECTIONS = ['A', 'B'];
export function pictureGrid(id, dir) { return P[`${id}/${dir}`](); }
export function toSvg(g, {title = ''} = {}) {
  const paths = {};
  g.forEach((row, y) => row.forEach((ch, x) => { if (PAL[ch]) (paths[ch] ||= []).push(`M${x} ${y}h1v1h-1z`); }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">${title ? `<title>${title}</title>` : ''}${Object.entries(paths).map(([ch, d]) => `<path fill="${PAL[ch][0]}" d="${d.join('')}"/>`).join('')}</svg>`;
}
export const pictureSvg = (id, dir, opts) => toSvg(pictureGrid(id, dir), opts);
