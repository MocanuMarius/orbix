// v1.0-cardart-B shared kit: the ONE definition of the palette, the pixel toolkit, every shared sprite and
// every shared object (Spark, wisp, Collector, Spark Meter, Stored-Sparks jar, Cache chest, Flash bolt,
// Pulse ring, hourglass, bell, candle, glass, chevron, moon...). art.mjs (the six approved anchors),
// art-common.mjs, art-rare.mjs and art-engine.mjs all draw with these, so the same thing is always drawn
// the same way. Design lab only; nothing in the game imports this. Browser-safe (no Node imports).

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

// ── Pixel toolkit ─────────────────────────────────────────────────────────────
export const S = 48;
export const grid = (bg = 'K') => Array.from({length: S}, () => Array(S).fill(bg));
export const inb = (x, y) => x >= 0 && y >= 0 && x < S && y < S;
export const px = (g, x, y, ch) => { if (inb(x, y)) g[y][x] = ch; };
export const rect = (g, x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(g, i, j, ch); };
export const inDisc = (x, y, cx, cy, r) => (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r;
export const disc = (g, cx, cy, r, ch, keep) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inDisc(x, y, cx, cy, r) && (!keep || keep(x, y))) px(g, x, y, ch); };
export const ring = (g, cx, cy, r, w, ch, keep) => disc(g, cx, cy, r, ch, (x, y) => !inDisc(x, y, cx, cy, r - w) && (!keep || keep(x, y)));
export const inEll = (x, y, cx, cy, rx, ry) => ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1;
export const ell = (g, cx, cy, rx, ry, ch, keep) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inEll(x, y, cx, cy, rx, ry) && (!keep || keep(x, y))) px(g, x, y, ch); };
export const ellRing = (g, cx, cy, rx, ry, ch) => ell(g, cx, cy, rx, ry, ch, (x, y) => !inEll(x, y, cx, cy, rx - 1, ry - 1));
export function line(g, x0, y0, x1, y1, ch) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) { px(g, x0, y0, ch); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
// Stamp a hand-drawn sprite ('.' is transparent).
export const stamp = (g, rows, x, y) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(g, x + i, y + j, ch); }));
export const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] ?? ch).join(''));
export const flip = rows => rows.map(r => [...r].reverse().join(''));
// Draw a filled shape on a scratch layer, then lay it down with a 1px warm-dark outline around it.
export function shape(g, draw, {outline = 'O', diag = false} = {}) {
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
// Write a grid as crispEdges SVG: one <path> per colour, one 1x1 square per pixel.
export function toSvg(g, {title = ''} = {}) {
  const paths = {};
  g.forEach((row, y) => row.forEach((ch, x) => { if (PAL[ch]) (paths[ch] ||= []).push(`M${x} ${y}h1v1h-1z`); }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">${title ? `<title>${title}</title>` : ''}${Object.entries(paths).map(([ch, d]) => `<path fill="${PAL[ch][0]}" d="${d.join('')}"/>`).join('')}</svg>`;
}

// ── The Spark ─────────────────────────────────────────────────────────────────
// The approved Spark (dist/assets/ui/spark.svg), cell for cell, and the same star at 11 and 7 pixels.
export const SPARK16 = [
  '.......OO.......', '......ODDO......', '......OGGO......', '......OGGO......', '.....OGGGGO.....', '....OOGWWGOO....',
  '.OOOGGWWWWGGOOO.', 'ODGGWWWWWWWWGGDO', 'ODGGWWWWWWWWGGDO', '.OOOGGWWWWGGOOO.', '....OOGWWGOO....', '.....OGGGGO.....',
  '......OGGO......', '......OGGO......', '......ODDO......', '.......OO.......'];
export const SPARK11 = ['.....O.....', '....ODO....', '....OGO....', '...OGWGO...', '.OOGWWWGOO.', 'ODGWWWWWGDO', '.OOGWWWGOO.', '...OGWGO...', '....OGO....', '....ODO....', '.....O.....'];
export const SPARK7 = ['...O...', '..OGO..', '.OGWGO.', 'OGWWWGO', '.OGWGO.', '..OGO..', '...O...'];
export const SPARKS = {16: SPARK16, 11: SPARK11, 7: SPARK7};
export const GLINT = ['.G.', 'GWG', '.G.'];
// Colour maps for the star: a dark Dusk Spark (the pickup that drains), a dim Spark not yet reached,
// and the Echo family's fading copies (a gold outline round a dark body, each one fainter).
export const DUSK = {G: 'R', W: 'E', D: 'L'};
export const DIM = {G: 'B', W: 'P', D: 'L'};
export const FADE1 = {O: 'G', G: 'T', W: 'C', D: 'T'};
export const FADE2 = {O: 'D', G: 'N', W: 'T', D: 'N'};
export const FADE3 = {O: 'B', G: 'N', W: 'N', D: 'N'};
export const SPARK11_DIM = recolor(SPARK11, DIM);
export function sparkAt(g, size, cx, cy, map) {
  let sp = SPARKS[size];
  if (map) sp = recolor(sp, map);
  stamp(g, sp, Math.round(cx - sp.length / 2), Math.round(cy - sp.length / 2));
}
// A short dotted trail of gold pixels from (x0,y0) toward (x1,y1).
export function trail(g, x0, y0, x1, y1, n, ch = 'D') {
  for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1); px(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), ch); }
}

// ── Wisp and Collector ────────────────────────────────────────────────────────
// A round glowing orb: outline, shaded rim, body, hot core, light from top left.
export function orb(g, cx, cy, r, {rim, body, core, hot = 'W'}) {
  disc(g, cx, cy, r + 1, 'O');
  disc(g, cx, cy, r, rim);
  disc(g, cx - 1, cy - 1, r - 1.6, body);
  disc(g, cx - 2, cy - 2, r * .52, core);
  disc(g, cx - 3, cy - 3, Math.max(1.2, r * .22), hot);
}
export const wisp = (g, cx, cy, r) => orb(g, cx, cy, r, {rim: 'P', body: 'Y', core: 'W'});
export const collector = (g, cx, cy, r) => orb(g, cx, cy, r, {rim: 'C', body: 'C', core: 'c', hot: 'W'});
// Collector speed streaks (from the approved Courier Tip), drawn left of an arriving Collector.
export const streaks = (g, x, y) => [[x - 1, y - 5, 6], [x + 1, y, 8], [x - 1, y + 5, 5]].forEach(([sx, sy, w]) => rect(g, sx, sy, w, 2, 'T'));

// ── Light ─────────────────────────────────────────────────────────────────────
// Stepped light rings (no gradient): each band is one flat colour.
export function glow(g, cx, cy, bands) { bands.forEach(([r, ch]) => disc(g, cx, cy, r, ch)); }
export const WARM = [[17, 'N'], [13, 'L'], [9, 'B']];
export const COOL = [[15, 'T'], [11, 'C']];
// Legendary: a one-pixel gold key-line inside the frame, with stepped corners.
export function keyline(g) {
  for (let i = 3; i < S - 3; i++) { px(g, i, 1, 'D'); px(g, i, S - 2, 'D'); px(g, 1, i, 'D'); px(g, S - 2, i, 'D'); }
  [[2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]].forEach(([x, y]) => px(g, x, y, 'G'));
}
// Sunburst rays: 8 stepped spokes from the centre.
export function rays(g, cx, cy, r0, r1, ch) {
  for (let a = 0; a < 16; a++) {
    if (a % 2) continue;
    const t = a * Math.PI / 8, w = a % 4 === 0 ? 1 : 0;
    for (let r = r0; r <= r1; r++) {
      const x = Math.round(cx - .5 + Math.cos(t) * r), y = Math.round(cy - .5 + Math.sin(t) * r);
      px(g, x, y, ch); if (w) { px(g, x + Math.round(Math.sin(t)), y - Math.round(Math.cos(t)), ch); }
    }
  }
}
export const goldRing = (g, cx, cy, r, keep) => ring(g, cx, cy, r, 1, 'D', keep);
// The moon is always a crescent (lit on the left), so it never reads as the wisp.
export function moon(g, x, y, sky = 'K') { disc(g, x, y, 4.2, 'O'); disc(g, x, y, 3.6, 'P'); disc(g, x - 1, y - 1, 2.6, 'Y'); disc(g, x + 2, y - 1, 3.4, sky); }

// ── Scenes, one per rarity ────────────────────────────────────────────────────
// Common: night sky band, night air, earth ground with a moss lip. Flat: no second layer, no light.
export function scene(g, {gy = 39, sky = 14, tufts = [3, 11, 20, 30, 41]} = {}) {
  rect(g, 0, 0, S, sky, 'K');
  rect(g, 0, gy, S, S - gy, 'L'); rect(g, 0, gy, S, 2, 'M');
  tufts.forEach(x => px(g, x, gy - 1, 'M'));
}
// Rare: night sky, the moon top left (the light source), far teal hills (the second layer), ground.
export function rareScene(g, {ground = 40, hill = 34, base = 5, amp = 3, freq = 5, ph = 1, moon: mo = [6, 7], sky = 26, groundCh = 'L', top = 'M'} = {}) {
  rect(g, 0, sky, S, S - sky, 'N');
  if (mo) moon(g, mo[0], mo[1]);
  for (let x = 0; x < S; x++) { const h = Math.round(base + amp * Math.sin(x / freq + ph)); rect(g, x, hill - h, 1, h, 'T'); }
  rect(g, 0, ground, S, S - ground, groundCh); rect(g, 0, ground, S, 1, top);
}
// Legendary: glints in the sky, low hills, a stepped glow behind the subject, a field. Key-line is added last.
export function legScene(g, {ground = 37, hill = 27, glints = [[5, 4], [14, 9], [30, 3], [43, 7]], glowAt = null, bands = [[15, 'T'], [11, 'C']], groundCh = 'M', top = 'm'} = {}) {
  rect(g, 0, 18, S, 30, 'N');
  glints.forEach(([x, y]) => stamp(g, GLINT, x, y));
  for (let x = 0; x < S; x++) { const h = Math.round(4 + 2 * Math.sin(x / 4)); rect(g, x, hill - h, 1, h, 'T'); }
  if (glowAt) glow(g, glowAt[0], glowAt[1], bands);
  rect(g, 0, ground, S, S - ground, groundCh); rect(g, 0, ground, S, 1, top);
}

// ── Pulse ─────────────────────────────────────────────────────────────────────
// The Pulse ring: one pale line with a dark line outside it, so it reads on any ground.
export function pulseRing(g, cx, cy, r, keep) {
  ring(g, cx, cy, r + 1, 1, 'O', keep);
  ring(g, cx, cy, r, 1.4, 'Y', keep);
}

// ── Growing things, fire, heart ───────────────────────────────────────────────
// One grain ear (kernels alternate pale and gold, shade on the right).
export const EAR = ['..O..', '.OYO.', 'OYGDO', 'OGYDO', 'OYGDO', 'OGYDO', 'OYGDO', '.ODO.', '..O..'];
// Sprout: two leaves on a stem. Left half drawn by hand, mirrored; column 12 is the stem.
const SPROUT_HALF = [
  ['OOO.........', '.'], ['OmmOO.......', '.'], ['OmmmmOO.....', '.'], ['.OmmmmmOO...', '.'], ['.OMmmmmmmOO.', '.'],
  ['..OMMmmmmmmO', '.'], ['...OMMMmmmmm', 'O'], ['....OOMMMMMM', 'm'], ['......OOOOOO', 'M'], ...Array(4).fill(['...........O', 'M'])];
export const SPROUT = SPROUT_HALF.map(([half, mid]) => half + mid + [...half].reverse().join(''));
// The seed it grows from, split at the top (column 5 meets the stem).
export const SEED = ['....OMO....', '...OEMEO...', '..OEERREO..', '.OEGRRRRRO.', 'OEGRRRRRRRO', 'OERRRRRRRRO', 'ORRRRRRRRLO', 'ORRRRRRRLLO', '.ORRRRRLLO.', '..ORRRLLO..', '...OOOOO...'];
export function seedSprout(g, cx, base) { stamp(g, SPROUT, cx - 12, base - 23); stamp(g, SEED, cx - 5, base - 10); }
export const LEAF = ['.OO..', 'OmmO.', 'OmmmO', '.OMmO', '..OMO', '...O.'];
// The game's campfire (dist/ui/trigger-icons.mjs CAMPFIRE), the Rest light source.
export const CAMPFIRE = [
  '.......O........', '......OEO.......', '......OEEO......', '.....OEGEO......', '.....OEGGEO.....', '....OEGWGEO.....', '....OEGWWGEO....',
  '....OEGGWGEO....', '...OOOEGGEOOO...', '..OBBOOOOOOBBO..', '.OBBBBBBBBBBBBO.', '..OOBBOOOOBBOO..', '....OO....OO....'];
// A held flame, tip leaning right (10x14), plus a small (5x7), a candle-size (7x10) and a big (13x19) one.
export const FLAME = [
  '.....O....', '....OEO...', '...OEEO...', '...OEGEO..', '..OEGGEO..', '..OEGWGEO.', '.OEGWWGEO.',
  '.OEGWWWGEO', 'OEGWWWWGEO', 'OEGWWWWGEO', 'OEGGWWGGEO', '.OEGGGGEO.', '..OEEEEO..', '...OOOO...'];
export const SMALL_FLAME = ['..O..', '.OEO.', '.OEO.', 'OEGEO', 'OGWGO', 'OGWGO', '.OOO.'];
export const FLAME7 = ['...O...', '..OEO..', '..OEO..', '.OEGEO.', '.OEGEO.', 'OEGWGEO', 'OEGWGEO', 'OGWWWGO', '.OGWGO.', '..OOO..'];
export const FLAME_XL = [
  '......O......', '.....OEO.....', '.....OEEO....', '....OEEEO....', '....OEGEEO...', '...OEEGGEO...', '...OEGGGEEO..',
  '..OEGGWGGEO..', '..OEGWWWGEEO.', '.OEGGWWWWGEO.', '.OEGWWWWWGEEO', 'OEGGWWWWWWGEO', 'OEGWWWWWWWGEO', 'OEGWWWWWWWGEO',
  'OEGGWWWWWGGEO', '.OEGGWWWGGEO.', '.OEEGGGGGEEO.', '..OOEEEEEOO..', '....OOOOO....'];
// Left half of the Save heart (mirrored for the right); the cleft sits between columns 10 and 11.
const HEART_HALF = [
  '...OOOO....', '.OOEEEEOO..', 'OEEERRRRRO.', 'OEERRRRRRRO', 'OERRRRRRRRR', 'ORRRRRRRRRR', 'ORRRRRRRRRR', 'ORRRRRRRRRR', '.ORRRRRRRRR', '.ORRRRRRRRR',
  '..ORRRRRRRR', '...ORRRRRRR', '....ORRRRRR', '.....ORRRRR', '......ORRRR', '.......ORRR', '........ORR', '.........OR', '..........O'];
export const HEART = HEART_HALF.map(row => {
  const right = [...row].reverse().map(ch => ch === 'E' ? 'R' : ch);
  for (let i = right.length - 1; i > 0; i--) if (right[i] === 'O' && right[i - 1] === 'R') { right[i - 1] = 'L'; break; }
  return row + right.join('');
});
export const HEART9 = ['.OOO.OOO.', 'OEERORRRO', 'OERRRRRLO', 'ORRRRRRLO', '.ORRRRLO.', '..ORRLO..', '...OLO...', '....O....'];
export function heartFlame(g, cx, top) {
  // cx = the heart's cleft; the flame stands in the cleft, in front of the heart.
  stamp(g, HEART, cx - 11, top);
  stamp(g, FLAME, cx - 5, top - 9);
}
export function sheaf(g, cx, base, {tall = 26} = {}) {
  // A bound sheaf: five long ears fanned in a V from the binding, pointed tips, stalks splayed below.
  const waist = base - 11, wx = cx + .5;
  shape(g, l => {
    for (let k = -3; k <= 3; k++) line(l, cx + Math.round(k / 3), waist + 2, cx + k * 2, base, k < 0 ? 'G' : 'D');
    [-40, -20, 0, 20, 40].forEach(deg => {
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
export function logs(g, cx, y, w) {
  shape(g, l => { line(l, cx - w, y + 3, cx + w, y - 1, 'B'); line(l, cx - w, y + 4, cx + w, y, 'B'); line(l, cx - w, y - 1, cx + w, y + 3, 'B'); line(l, cx - w, y, cx + w, y + 4, 'L'); });
}
// A growth stake: wooden post with notches, a gold notch above the old top (from the approved Growth Seed).
export function stake(g, x, top, h, goldY) {
  shape(g, l => rect(l, x, top, 4, h, 'B')); rect(g, x, top, 1, h, 'P');
  for (let y = top + 6; y < top + h - 2; y += 6) rect(g, x, y, 3, 1, 'O');
  shape(g, l => rect(l, x - 2, goldY, 8, 2, 'G'));
}

// ── Rhythm and Timers ─────────────────────────────────────────────────────────
export function metronome(g, cx, base, {lit = false} = {}) {
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
export function pendulum(g, cx, base, tipX, tipY) {
  line(g, cx, base - 7, tipX, tipY, 'G');
  line(g, cx - 1, base - 7, tipX - 1, tipY, 'D');
  const wx = Math.round(cx + (tipX - cx) * .55), wy = Math.round(base - 7 + (tipY - base + 7) * .55);
  rect(g, wx - 2, wy - 2, 5, 4, 'O'); rect(g, wx - 1, wy - 1, 3, 2, 'G'); px(g, wx - 1, wy - 1, 'W');
  rect(g, cx - 2, base - 8, 4, 3, 'O'); rect(g, cx - 1, base - 7, 2, 1, 'D');
}
// The Timer dial: a round clock face with one hand and a gold wedge for the time already waited.
export function dial(g, cx, cy, r, {frac = .33, rim = 'B'} = {}) {
  disc(g, cx, cy, r + 1, 'O'); disc(g, cx, cy, r, rim); disc(g, cx, cy, r - 1.4, 'Y');
  const a0 = -Math.PI / 2, a1 = a0 + frac * 2 * Math.PI;
  disc(g, cx, cy, r - 2.2, 'G', (x, y) => { let a = Math.atan2(y + .5 - cy, x + .5 - cx); if (a < a0) a += 2 * Math.PI; return a <= a1; });
  const hx = Math.round(cx - .5 + Math.cos(a1) * (r - 2)), hy = Math.round(cy - .5 + Math.sin(a1) * (r - 2));
  line(g, Math.round(cx - .5), Math.round(cy - .5), hx, hy, 'O');
  px(g, Math.round(cx - .5), Math.round(cy - .5), 'O');
}
// A lit fuse: a cord path with a burnt (dark) part behind the spark and unburnt (wood) part ahead.
export function fuse(g, pts, burnt, {cordCh = 'B', ashCh = 'L'} = {}) {
  pts.forEach(([x, y], i) => { px(g, x, y + 1, 'O'); px(g, x, y, i < burnt ? ashCh : cordCh); });
}
// Hourglass: the "Collector ready sooner" device. Wood caps, pale glass, gold sand mostly run to the bottom.
export const HOURGLASS = [
  'OOOOOOOOOOO', 'OPBBBBBBBLO', 'OOOOOOOOOOO', '.OYYYYYYYO.', '.OYYYYYYYO.', '..OYYYYYO..', '...OYGYO...', '....OGO....',
  '...OYGYO...', '..OYYGYYO..', '.OYYGGGYYO.', '.OGGGGGGGO.', 'OOOOOOOOOOO', 'OPBBBBBBBLO', 'OOOOOOOOOOO'];
export const HOURGLASS_S = ['OOOOOOO', 'OBBBBBO', '.OYYYO.', '..OGO..', '.OYGYO.', '.OGGGO.', 'OBBBBBO', 'OOOOOOO'];
// Parametric hourglass for a large subject: sand mostly run down (ready soon).
export function hourglass(g, cx, top, w, h, {topSand = 2} = {}) {
  const x = cx - Math.floor(w / 2), gt = top + 3, gb = top + h - 3, mid = Math.floor((gt + gb) / 2), hw = Math.floor(w / 2) - 2;
  const half = y => Math.max(1, Math.round(hw * Math.abs(y - mid) / (mid - gt)));
  shape(g, l => { for (let y = gt; y < gb; y++) { const k = half(y); rect(l, cx - k, y, k * 2 + 1, 1, 'Y'); } });
  for (let y = gt; y < gb; y++) { const k = half(y); if (k > 1) px(g, cx - k, y, 'W'); }
  for (let y = gb - 1, n = 0; n < Math.round((gb - mid) * .7); y--, n++) { const k = half(y); rect(g, cx - k + (k > 1 ? 1 : 0), y, k * 2 + (k > 1 ? 0 : 1), 1, 'G'); px(g, cx + k, y, 'D'); }
  for (let y = mid - 1, n = 0; n < topSand; y--, n++) { const k = half(y); rect(g, cx - k + 1, y, Math.max(1, k * 2 - 1), 1, 'G'); }
  rect(g, cx, mid, 1, Math.round((gb - mid) * .3) + 1, 'G');
  shape(g, l => { rect(l, x, top, w, 3, 'B'); rect(l, x, gb, w, 3, 'B'); });
  rect(g, x, top, w, 1, 'P'); rect(g, x, gb, w, 1, 'P'); rect(g, x + w - 1, top, 1, 3, 'L'); rect(g, x + w - 1, gb, 1, 3, 'L');
}
// A cast bell. cx = centre column (the bell spans cx-half .. cx+half-1), top = crown row, h = body height.
export function bell(g, cx, top, h, {body = 'G', hi = 'W', hi2 = 'Y', shade = 'D', lip = 'D', clap = 'B'} = {}) {
  shape(g, l => {
    const dome = Math.max(2, Math.round(h * .3)), maxDome = Math.round(h * .26);
    for (let i = 0; i < h; i++) {
      let half = i < dome ? Math.round(2 + maxDome * Math.sqrt((i + 1) / dome)) : Math.round(2 + maxDome + (i - dome) * .22);
      if (i >= h - 2) half += 2;
      const y = top + i;
      rect(l, cx - half, y, half * 2, 1, i >= h - 2 ? lip : body);
      if (i < h - 2) { px(l, cx - half, y, hi2); px(l, cx - half + 1, y, i > 1 && i < h - 4 ? hi : body); px(l, cx + half - 1, y, shade); px(l, cx + half - 2, y, shade); }
    }
    rect(l, cx - 1, top - 2, 2, 2, shade); // crown
  });
  shape(g, l => disc(l, cx, top + h + 1, 1.6, clap));
}
export const DIM_BELL = {body: 'B', hi: 'D', hi2: 'D', shade: 'L', lip: 'L', clap: 'L'};

// ── The Spark Meter: always the segmented stack of the game's Overfill icon ───
// frac = how full, from the bottom. Leather frame, dark inside, outline seams every 5 rows.
export function meterStack(g, x, y, w, h, frac) {
  shape(g, l => rect(l, x, y, w, h, 'L'));
  rect(g, x + 1, y + 1, w - 2, h - 2, 'K');
  const fh = Math.round((h - 2) * frac), fy = y + h - 1 - fh;
  rect(g, x + 1, fy, w - 2, fh, 'G'); rect(g, x + 1, fy, 1, fh, 'Y'); rect(g, x + w - 2, fy, 1, fh, 'D'); rect(g, x + 1, fy, w - 2, 1, 'W');
  for (let j = y + 5; j < y + h - 2; j += 5) rect(g, x + 1, j, w - 2, 1, 'O');
  for (let j = 1; j < 3; j++) rect(g, x + w, y + Math.round(h * j / 3), 2, 1, 'O');
}
// A full Spark Meter spilling at the top (Overfill): a Spark bursting out and gold drops running down.
export function spillMeter(g, x, y, h, {drops = 2, spark = true} = {}) {
  const w = 9;
  shape(g, l => rect(l, x, y, w, h, 'L'));
  rect(g, x + 1, y + 1, w - 2, h - 2, 'G'); rect(g, x + 1, y + 1, 1, h - 2, 'Y'); rect(g, x + w - 2, y + 1, 1, h - 2, 'D');
  for (let j = y + 5; j < y + h - 2; j += 5) { rect(g, x + 1, j, w - 2, 1, 'O'); rect(g, x - 2, j, 2, 1, 'O'); }
  // the brim: gold welling over the top and running down both sides
  shape(g, l => {
    rect(l, x - 1, y - 2, w + 2, 3, 'G'); rect(l, x + 1, y - 3, w - 2, 1, 'G'); rect(l, x + 1, y - 3, w - 3, 1, 'W'); rect(l, x, y - 2, 3, 1, 'W');
    rect(l, x - 2, y, 1, 3, 'G'); px(l, x - 2, y + 2, 'D');
    rect(l, x + w + 1, y, 1, 6, 'G'); px(l, x + w + 1, y + 5, 'D');
    if (drops > 1) { rect(l, x + w + 1, y + 8, 1, 2, 'G'); }
  });
  if (spark) sparkAt(g, 11, x + w / 2, y - 8);
}
// The approved Growth Seed A meter (anchor direction A only).
export function meter(g, x, y, h, {fill = 'G'} = {}) {
  shape(g, l => { rect(l, x, y, 7, h, 'L'); });
  rect(g, x + 1, y + 1, 5, h - 2, fill); rect(g, x + 1, y + 1, 1, h - 2, 'Y'); rect(g, x + 5, y + 1, 1, h - 2, 'D');
  rect(g, x + 1, y + 1, 4, 8, 'W');
  rect(g, x - 2, y + 9, 11, 2, 'O');
}

// ── Stored Sparks (glass jar holding a Spark) and the Cache (chest) ───────────
export function jar(g, cx, top, w, h, lidW, {strap = false} = {}) {
  const x0 = cx - (w >> 1);
  shape(g, l => {
    rect(l, x0 + 2, top, w - 4, h, 'T'); rect(l, x0, top + 2, w, h - 4, 'T'); rect(l, x0 + 1, top + 1, w - 2, h - 2, 'T');
    rect(l, x0 + 2, top + 3, 1, h - 6, 'c'); rect(l, x0 + 3, top + 3, 1, 4, 'c');
    rect(l, x0 + w - 3, top + 3, 1, h - 6, 'N');
  });
  const lx = cx - (lidW >> 1);
  shape(g, l => {
    rect(l, lx, top - 4, lidW, 4, 'B'); rect(l, lx + 1, top - 6, lidW - 2, 2, 'B'); rect(l, lx + 3, top - 7, lidW - 6, 1, 'B');
    rect(l, lx, top - 4, lidW, 1, 'D'); rect(l, lx + 1, top - 6, lidW - 2, 1, 'D'); rect(l, lx, top - 1, lidW, 1, 'L');
    if (strap) { rect(l, cx - 2, top - 7, 4, 8, 'R'); rect(l, cx - 2, top - 7, 1, 8, 'E'); }
  });
}
// An open jar (no lid) for Sparks being poured in.
export function openJar(g, cx, top, w, h) {
  const x0 = cx - (w >> 1);
  shape(g, l => {
    rect(l, x0 + 2, top, w - 4, h, 'T'); rect(l, x0, top + 2, w, h - 4, 'T'); rect(l, x0 + 1, top + 1, w - 2, h - 2, 'T');
    rect(l, x0 + 2, top + 3, 1, h - 6, 'c'); rect(l, x0 + 3, top + 3, 1, 4, 'c');
    rect(l, x0 + w - 3, top + 3, 1, h - 6, 'N');
  });
  shape(g, l => { rect(l, x0 + 1, top - 2, w - 2, 2, 'c'); rect(l, x0 + 1, top - 2, w - 2, 1, 'W'); });
}
// The Cache: a banded wooden chest with a Spark on its lid.
export function chest(g, x, y, w = 18) {
  shape(g, l => {
    rect(l, x + 1, y, w - 2, 1, 'D'); rect(l, x, y + 1, w, 4, 'B'); rect(l, x, y + 1, w, 1, 'D');
    rect(l, x, y + 5, w, 1, 'O');
    rect(l, x, y + 6, w, 8, 'L'); rect(l, x, y + 6, w, 1, 'B'); rect(l, x, y + 9, w, 1, 'B');
    rect(l, x + 2, y, 2, 14, 'O'); rect(l, x + w - 4, y, 2, 14, 'O');
  });
  stamp(g, SPARK7, x + (w >> 1) - 3, y + 2);
}
// Leather satchel with a stitched border and flap (Pocket Sparks).
export function satchel(g, x, y, w, h) {
  const cx = x + w / 2;
  shape(g, l => { rect(l, x, y, w, h - 6, 'L'); for (let y2 = 0; y2 < S; y2++) for (let x2 = 0; x2 < S; x2++) if (inEll(x2, y2, cx, y + h - 7, w / 2, 7) && y2 >= y + h - 7) l[y2][x2] = 'L'; });
  rect(g, x, y, 1, h - 6, 'B'); rect(g, x + 1, y + h - 6, 1, 3, 'B');
  shape(g, l => { for (let y2 = 0; y2 < S; y2++) for (let x2 = 0; x2 < S; x2++) if ((inEll(x2, y2, cx, y + 3, w / 2 + 1, 8) && y2 >= y + 3) || (y2 >= y - 1 && y2 < y + 3 && x2 >= x - 1 && x2 <= x + w)) l[y2][x2] = 'B'; });
  rect(g, x - 1, y - 1, w + 2, 1, 'P');
  for (let x2 = x + 1; x2 < x + w - 1; x2 += 2) { for (let y2 = y + 10; y2 > y; y2--) if (inEll(x2, y2, cx, y + 3, w / 2 - 1, 6.4)) { px(g, x2, y2, 'P'); break; } }
  shape(g, l => { rect(l, Math.floor(cx) - 2, y + 8, 4, 3, 'G'); px(l, Math.floor(cx) - 2, y + 8, 'W'); });
}

// ── Collector reel ────────────────────────────────────────────────────────────
// Spool: two wooden flanges and a gold-thread core, standing upright ("reels in sooner").
export function spool(g, cx, top, w, h) {
  const x = cx - Math.floor(w / 2);
  shape(g, l => {
    rect(l, x, top, w, 3, 'B'); rect(l, x, top + h - 3, w, 3, 'B');
    rect(l, x + 2, top + 3, w - 4, h - 6, 'G');
  });
  rect(g, x, top, w, 1, 'P'); rect(g, x, top + h - 3, w, 1, 'P');
  rect(g, x + 2, top + 3, 1, h - 6, 'Y'); rect(g, x + w - 3, top + 3, 1, h - 6, 'D');
  for (let j = top + 4; j < top + h - 3; j += 2) rect(g, x + 3, j, w - 6, 1, 'D');
}
// A small hook (latch device), opening right.
export const HOOK = ['OOOO.', 'OBBO.', '.OBO.', '.OBOO', '.OBBO', '..OO.'];
export function spring(g, x, base, w, top, coils) {
  shape(g, l => { rect(l, x, base - 1, w, 2, 'L'); rect(l, x, base - 1, w, 1, 'B'); });
  const step = (base - 2 - (top + 2)) / (coils * 2);
  for (let i = 0; i < coils * 2; i++) {
    const y0 = Math.round(base - 2 - i * step), y1 = Math.round(base - 2 - (i + 1) * step);
    const [a, b] = i % 2 ? [x + w - 3, x + 2] : [x + 2, x + w - 3];
    line(g, a, y0, b, y1, 'O'); line(g, a, y0 - 1, b, y1 - 1, i % 2 ? 'D' : 'G');
  }
  shape(g, l => { rect(l, x, top, w, 2, 'B'); rect(l, x, top, w, 1, 'D'); });
}

// ── Flash: the game's lightning bolt (ui/trigger-icons.mjs 'flash-pickup') ────
export const BOLT = [
  '......OOOOOO', '.....OGGGGGO', '.....OGWGGO.', '....OGWGGO..', '....OGWGO...', '...OGWGGO...', '...OGWGOOOOO', '..OGWGGGGGDO',
  '..OGGGGGGDO.', '..OOOOOGGDO.', '......OGDO..', '.....OGDO...', '.....OGDO...', '....OGDO....', '....ODO.....', '...ODO......', '...OO.......'];
// Flash ends ('flash-expiry'): the same bolt spent to paper and broken in the middle.
export const BOLT_SPENT = recolor(BOLT, {G: 'P', W: 'c', D: 'B'}).map((r, j) => j === 9 ? '............' : j === 8 ? r.replace(/[^.]/g, 'O') : r);
// A small bolt (8x12) for a Flash beside another subject.
export const BOLT_S = ['....OOOO', '...OGGGO', '..OGWGO.', '..OGWGOO', '.OGWGGDO', '.OGGGGO.', '.OOOGDO.', '...OGO..', '..OGDO..', '..ODO...', '.ODO....', '.OO.....'];

// ── Lift: the game's chevron ──────────────────────────────────────────────────
export const CHEV = ['....O....', '...OGO...', '..OGWGO..', '.OGGOGGO.', 'OGGO.OGGO', 'OOO...OOO'];
export const CHEV_WHITE = CHEV.map(r => r.replace(/G/g, 'Y'));
export const CHEV_DIM = recolor(CHEV, {G: 'B', W: 'P'});
export const ARROW_UP = ['.....O.....', '....OGO....', '...OGWGO...', '..OGWWWGO..', '.OGGWWWGGO.', 'OGGGWWWGGDO', 'OOOOGWGDOOO', '...OGWGDO..', '...OGWGDO..', '...OGWGDO..', '...OGGGDO..', '...OGGGDO..', '...ODDDDO..', '...OOOOOO..'];
// Falling Lift: a dotted fall (paper) that turns at the bottom into a gold rise; a chevron marks the turn.
export function dipPath(g, x0, y0, xb, yb, x1, y1) {
  for (let i = 0; i <= 6; i++) { const t = i / 6; rect(g, Math.round(x0 + (xb - x0) * t), Math.round(y0 + (yb - y0) * t * t), 2, 1, 'P'); }
  for (let i = 1; i <= 5; i++) { const t = i / 5; rect(g, Math.round(xb + (x1 - xb) * t), Math.round(yb + (y1 - yb) * Math.sqrt(t)), 2, 1, 'G'); }
}

// ── Glass that multiplies: the prism (one Spark in, more out) and the magnifier ──
// A glass prism (triangle). apex row `top`, base row `top+h-1`, centred on cx.
export function prismTri(g, cx, top, h) {
  shape(g, l => {
    for (let i = 0; i < h; i++) {
      const half = Math.max(1, Math.round(i * .62)), y = top + i;
      for (let x = cx - half; x < cx + half; x++) {
        const u = (x - (cx - half)) / (half * 2);
        px(l, x, y, u < .34 ? 'c' : u < .67 ? 'C' : 'T');
      }
      px(l, cx - half, y, 'W');
    }
    rect(l, cx - Math.round((h - 1) * .62), top + h - 1, Math.round((h - 1) * .62) * 2, 1, 'T');
  });
}
// A gold beam line with its shadow.
export const beam = (g, a, b, c, d) => { line(g, a, b, c, d, 'G'); line(g, a, b + 1, c, d + 1, 'D'); };
// The magnifying glass: gold rim, teal glass, a highlight, and a wooden handle to the lower right.
export function magnifier(g, cx, cy, r, {handle = true} = {}) {
  if (handle) shape(g, l => { const hx = Math.round(cx + r * .7), hy = Math.round(cy + r * .7); line(l, hx, hy, hx + 7, hy + 7, 'L'); line(l, hx + 1, hy, hx + 8, hy + 7, 'B'); line(l, hx, hy + 1, hx + 7, hy + 8, 'L'); });
  disc(g, cx, cy, r + 1, 'O'); disc(g, cx, cy, r, 'D'); disc(g, cx, cy, r, 'G', (x, y) => x + y < cx + cy - 1);
  disc(g, cx, cy, r - 2, 'O'); disc(g, cx, cy, r - 3, 'T');
  px(g, cx - r + 4, cy - r + 5, 'W'); px(g, cx - r + 3, cy - r + 6, 'W'); px(g, cx - r + 3, cy - r + 7, 'c');
}
// A cut crystal (diamond), cx centre, cy middle row.
export function crystal(g, cx, cy, hw, hh) {
  shape(g, l => {
    for (let y = cy - hh; y <= cy + hh; y++) {
      const half = Math.round(hw * (1 - Math.abs(y - cy) / (hh + 1)));
      for (let x = cx - half; x < cx + half; x++) {
        const left = x < cx, upper = y < cy;
        px(l, x, y, upper ? (left ? 'W' : 'c') : (left ? 'C' : 'T'));
      }
    }
  });
}

// ── Cards and beads ───────────────────────────────────────────────────────────
// A small playing card (11x15): paper, a rarity jewel in teal, two rule lines.
export const CARD = [
  'OOOOOOOOOOO', 'OYPPPPPPPPO', 'OYPPPPPPPBO', 'OYPPOOOPPBO', 'OYPOTCTOPBO', 'OYPOCcCOPBO', 'OYPOTCTOPBO', 'OYPPOOOPPBO',
  'OYPPPPPPPBO', 'OYPLLLLLPBO', 'OYPPPPPPPBO', 'OYPLLLLPPBO', 'OYPPPPPPPBO', 'OBBBBBBBBBO', 'OOOOOOOOOOO'];
// A tiny chain card: paper with a dark rim and a mark in the middle.
export function miniCard(g, x, y, w, h, mark) {
  shape(g, l => { rect(l, x, y, w, h, 'P'); });
  rect(g, x, y, w, 1, 'Y'); rect(g, x + w - 1, y + 1, 1, h - 1, 'B');
  if (mark) stamp(g, mark, x + Math.floor((w - mark[0].length) / 2), y + Math.floor((h - mark.length) / 2));
}
// A bead threaded on a cord: a wide oval with a dark hole showing the cord at both ends.
export function bead(g, cx, cy, rx, ry, {rim = 'D', body = 'G', core = 'Y', hot = 'W'} = {}) {
  ell(g, cx, cy, rx + 1, ry + 1, 'O'); ell(g, cx, cy, rx, ry, rim); ell(g, cx - .7, cy - .7, rx - 1.2, ry - 1.2, body);
  ell(g, cx - 1.6, cy - 1.6, rx * .5, ry * .45, core); px(g, Math.round(cx - rx * .5), Math.round(cy - ry * .55), hot); px(g, Math.round(cx - rx * .5) + 1, Math.round(cy - ry * .55), hot);
  rect(g, Math.round(cx) - 1, Math.round(cy) - 1, 2, 2, 'O');
}
export function cord(g, x0, y0, x1, y1) { line(g, x0, y0 - 1, x1, y1 - 1, 'O'); line(g, x0, y0, x1, y1, 'B'); line(g, x0, y0 + 1, x1, y1 + 1, 'L'); line(g, x0, y0 + 2, x1, y1 + 2, 'O'); }

// ── Odds and ends ─────────────────────────────────────────────────────────────
// The Clear flag (from the Clear Trigger icon): wooden pole, moss pennant.
export const FLAG = ['OO.......', 'OBOOOOOO.', 'OBOmmmmmO', 'OBOmMMMMO', 'OBOMMMMO.', 'OBOOOOO..', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OOO......'];
// The open hairpin of a crescendo: two thick gold strokes from a point opening to the right.
export function hairpin(g, x0, y0, x1, yTop, yBot) {
  shape(g, l => {
    line(l, x0, y0, x1, yTop, 'G'); line(l, x0, y0 + 1, x1, yTop + 1, 'Y');
    line(l, x0, y0, x1, yBot, 'D'); line(l, x0, y0 + 1, x1, yBot + 1, 'D');
  });
}
// A sun: gold disc with outlined spokes (eight long, eight short), so it never reads as the pale wisp.
export function sun(g, cx, cy, r, len) {
  shape(g, l => {
    for (let a = 0; a < 16; a++) {
      const t = a * Math.PI / 8, n = a % 2 ? Math.max(1, len - 2) : len;
      for (let k = r + 2; k <= r + 1 + n; k++) px(l, Math.round(cx - .5 + Math.cos(t) * k), Math.round(cy - .5 + Math.sin(t) * k), a % 2 ? 'D' : 'G');
    }
  });
  disc(g, cx, cy, r + 1, 'O'); disc(g, cx, cy, r, 'E'); disc(g, cx - .6, cy - .6, r - 1.2, 'D'); disc(g, cx - 1.2, cy - 1.2, r - 2.4, 'G');
  disc(g, cx - r * .3, cy - r * .3, r * .38, 'Y'); disc(g, cx - r * .4, cy - r * .4, Math.max(1, r * .16), 'W');
}
// A candle on its dish: pale wax with a lit left edge, wood shade on the right, a dark wick.
export function candle(g, cx, top, h, w) {
  shape(g, l => {
    rect(l, cx - (w >> 1), top, w, h, 'P');
    rect(l, cx - (w >> 1), top, 1, h, 'Y'); rect(l, cx - (w >> 1) + 1, top, 1, h, 'W');
    rect(l, cx + (w >> 1) - 2, top, 2, h, 'B');
    rect(l, cx - (w >> 1) + 2, top + 1, 2, 4, 'Y'); rect(l, cx + 1, top + 1, 2, 2, 'Y');
  });
  shape(g, l => { rect(l, cx - (w >> 1) - 3, top + h, w + 6, 2, 'B'); rect(l, cx - (w >> 1) - 3, top + h, w + 6, 1, 'D'); rect(l, cx - (w >> 1) - 1, top + h + 2, w + 2, 1, 'L'); });
  line(g, cx - 1, top - 1, cx - 1, top - 3, 'O');
}
// The spill: a pool on the ground.
export function pool(g, cx, cy, rx, ry, rings) {
  ell(g, cx, cy, rx + 1, ry + 1, 'O'); ell(g, cx, cy, rx, ry, 'N'); ell(g, cx, cy - .5, rx - 1, ry - 1, 'T');
  rings.forEach(([r, ch]) => ellRing(g, cx, cy, r, r * ry / rx, ch));
  rect(g, Math.round(cx) - 1, Math.round(cy) - 1, 2, 1, 'W');
}
export function spillStream(g, x0, y0, x1, y1) {
  for (let t = 0; t <= 1.0001; t += 1 / 24) { const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t * t); px(g, x, y, 'G'); px(g, x, y + 1, 'D'); }
}

// ── Shared line and family devices ────────────────────────────────────────────
// Echo copies: hollow ghost Sparks (pale outline, dark body), each one fainter. Index 0, 1, 2.
export const FADE_A = [{O: 'Y', G: 'N', W: 'T', D: 'N'}, {O: 'P', G: 'N', W: 'N', D: 'N'}, {O: 'B', G: 'N', W: 'N', D: 'N'}];
// A horizontal coil spring from x0 along `len`, centred on row cy, half-height r.
export function coilSpring(g, x0, cy, len, r, coils) {
  const step = len / coils;
  shape(g, l => {
    for (let k = 0; k < coils; k++) { const xa = Math.round(x0 + k * step), xm = Math.round(x0 + (k + .5) * step), xb = Math.round(x0 + (k + 1) * step); line(l, xm, cy + r, xb, cy - r, 'D'); line(l, xm + 1, cy + r, xb + 1, cy - r, 'D'); }
    for (let k = 0; k < coils; k++) { const xa = Math.round(x0 + k * step), xm = Math.round(x0 + (k + .5) * step); line(l, xa, cy - r, xm, cy + r, 'G'); line(l, xa + 1, cy - r, xm + 1, cy + r, 'Y'); }
  });
}
// A winch: a rope drum lying between two posts, rope wound on it, a crank on the right. (x, y) = drum centre top.
export function winch(g, x, y, {ground = 41} = {}) {
  shape(g, l => { rect(l, x - 11, y - 2, 3, ground - y + 2, 'B'); rect(l, x + 9, y - 2, 3, ground - y + 2, 'B'); });
  rect(g, x - 11, y - 2, 1, ground - y + 2, 'P'); rect(g, x + 9, y - 2, 1, ground - y + 2, 'P');
  shape(g, l => rect(l, x - 8, y, 17, 9, 'G'));
  rect(g, x - 8, y, 17, 1, 'Y'); rect(g, x - 8, y + 8, 17, 1, 'D');
  for (let i = x - 7; i < x + 9; i += 2) rect(g, i, y + 1, 1, 7, 'D');
  shape(g, l => { rect(l, x + 12, y + 3, 4, 2, 'B'); rect(l, x + 15, y + 3, 2, 8, 'B'); rect(l, x + 14, y + 10, 4, 3, 'E'); });
  rect(g, x + 14, y + 10, 4, 1, 'G');
}
// A Cluster: one pickup that is a bound bunch of Sparks (gold band round them).
export function cluster(g, cx, cy, r) {
  ring(g, cx, cy, r + 1, 1, 'O'); ring(g, cx, cy, r, 1, 'D');
  sparkAt(g, 11, cx, cy); sparkAt(g, 7, cx - r + 3, cy - r + 3); sparkAt(g, 7, cx + r - 2, cy + r - 3);
}
// A woven nest bowl centred on cx, rim row `top`.
export function nest(g, cx, top, rx = 17) {
  shape(g, l => { ell(l, cx, top + 3, rx, 7, 'B', (x, y) => y >= top); rect(l, cx - rx + 1, top, rx * 2 - 1, 2, 'B'); });
  for (let x = cx - rx + 2; x < cx + rx - 1; x += 3) line(g, x, top + 1, x + 2, top + 7, 'L');
  rect(g, cx - rx + 1, top, rx * 2 - 1, 1, 'P');
}
// Kindling Bead line: a Spark on the cord kindles the ember bead; it flares and pops Sparks.
export function kindling(g, {by, big = false, out}) {
  cord(g, 0, by - 2, 47, by + 2);
  sparkAt(g, 11, 11, by - 1);
  bead(g, 31, by + 1, big ? 7 : 6, big ? 7 : 6, {rim: 'R', body: 'E', core: 'G', hot: 'W'});
  if (big) stamp(g, FLAME_XL, 25, by - 23); else stamp(g, FLAME, 27, by - 18);
  trail(g, 17, by - 5, 23, by - 8, 3, 'G');
  out.forEach(([x, y]) => sparkAt(g, 7, x, y));
}
// Echo line: a bright Spark and n hollow copies following it to the right.
export function echoRow(g, y, n) {
  const xs = n === 1 ? [14, 33] : n === 2 ? [10, 25, 39] : [9, 22, 33, 42];
  const sizes = n === 3 ? [16, 16, 11, 7] : n === 2 ? [16, 16, 11] : [16, 16];
  for (let i = n; i >= 1; i--) sparkAt(g, sizes[i], xs[i], y, FADE_A[i - 1]);
  sparkAt(g, 16, xs[0], y);
}
