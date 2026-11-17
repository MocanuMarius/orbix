// v1.0-cardart-B ("Vignette"), Common cards. Design lab only; nothing in the game imports this.
// Same toolkit and sprites as ./art.mjs (which keeps its helpers private, so they are copied here cell for
// cell and must stay identical), plus the new sprites the Common cards need. Rarity rule for Commons:
// the subject on plain ground under a simple two-band sky; flat, no second depth layer, no glow, no key-line.
import {PAL, toSvg} from './art.mjs';
export {PAL};

const S = 48;
const grid = (bg = 'N') => Array.from({length: S}, () => Array(S).fill(bg));
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
const stamp = (g, rows, x, y) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(g, x + i, y + j, ch); }));
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
const flip = rows => rows.map(r => [...r].reverse().join(''));

// ── Sprites copied from art.mjs (identical) ───────────────────────────────────
const SPARK16 = [
  '.......OO.......', '......ODDO......', '......OGGO......', '......OGGO......', '.....OGGGGO.....', '....OOGWWGOO....',
  '.OOOGGWWWWGGOOO.', 'ODGGWWWWWWWWGGDO', 'ODGGWWWWWWWWGGDO', '.OOOGGWWWWGGOOO.', '....OOGWWGOO....', '.....OGGGGO.....',
  '......OGGO......', '......OGGO......', '......ODDO......', '.......OO.......'];
const SPARK11 = ['.....O.....', '....ODO....', '....OGO....', '...OGWGO...', '.OOGWWWGOO.', 'ODGWWWWWGDO', '.OOGWWWGOO.', '...OGWGO...', '....OGO....', '....ODO....', '.....O.....'];
const SPARK7 = ['...O...', '..OGO..', '.OGWGO.', 'OGWWWGO', '.OGWGO.', '..OGO..', '...O...'];
const GLINT = ['.G.', 'GWG', '.G.'];
const SPROUT_HALF = [
  ['OOO.........', '.'], ['OmmOO.......', '.'], ['OmmmmOO.....', '.'], ['.OmmmmmOO...', '.'], ['.OMmmmmmmOO.', '.'],
  ['..OMMmmmmmmO', '.'], ['...OMMMmmmmm', 'O'], ['....OOMMMMMM', 'm'], ['......OOOOOO', 'M'], ...Array(4).fill(['...........O', 'M'])];
const SPROUT = SPROUT_HALF.map(([half, mid]) => half + mid + [...half].reverse().join(''));
const SEED = ['....OMO....', '...OEMEO...', '..OEERREO..', '.OEGRRRRRO.', 'OEGRRRRRRRO', 'OERRRRRRRRO', 'ORRRRRRRRLO', 'ORRRRRRRLLO', '.ORRRRRLLO.', '..ORRRLLO..', '...OOOOO...'];
const CAMPFIRE = [
  '.......O........', '......OEO.......', '......OEEO......', '.....OEGEO......', '.....OEGGEO.....', '....OEGWGEO.....', '....OEGWWGEO....',
  '....OEGGWGEO....', '...OOOEGGEOOO...', '..OBBOOOOOOBBO..', '.OBBBBBBBBBBBBO.', '..OOBBOOOOBBOO..', '....OO....OO....'];
const HEART_HALF = [
  '...OOOO....', '.OOEEEEOO..', 'OEEERRRRRO.', 'OEERRRRRRRO', 'OERRRRRRRRR', 'ORRRRRRRRRR', 'ORRRRRRRRRR', 'ORRRRRRRRRR', '.ORRRRRRRRR', '.ORRRRRRRRR',
  '..ORRRRRRRR', '...ORRRRRRR', '....ORRRRRR', '.....ORRRRR', '......ORRRR', '.......ORRR', '........ORR', '.........OR', '..........O'];
const HEART = HEART_HALF.map(row => {
  const right = [...row].reverse().map(ch => ch === 'E' ? 'R' : ch);
  for (let i = right.length - 1; i > 0; i--) if (right[i] === 'O' && right[i - 1] === 'R') { right[i - 1] = 'L'; break; }
  return row + right.join('');
});
function sparkAt(g, size, cx, cy) {
  const sp = size === 16 ? SPARK16 : size === 11 ? SPARK11 : SPARK7;
  stamp(g, sp, Math.round(cx - sp.length / 2), Math.round(cy - sp.length / 2));
}
function orb(g, cx, cy, r, {rim, body, core, hot = 'W'}) {
  disc(g, cx, cy, r + 1, 'O');
  disc(g, cx, cy, r, rim);
  disc(g, cx - 1, cy - 1, r - 1.6, body);
  disc(g, cx - 2, cy - 2, r * .52, core);
  disc(g, cx - 3, cy - 3, Math.max(1.2, r * .22), hot);
}
const wisp = (g, cx, cy, r) => orb(g, cx, cy, r, {rim: 'P', body: 'Y', core: 'W'});
const collector = (g, cx, cy, r) => orb(g, cx, cy, r, {rim: 'C', body: 'C', core: 'c', hot: 'W'});
function trail(g, x0, y0, x1, y1, n, ch = 'D') {
  for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1); px(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), ch); }
}
function sheaf(g, cx, base, {tall = 26} = {}) {
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
function seedSprout(g, cx, base) { stamp(g, SPROUT, cx - 12, base - 23); stamp(g, SEED, cx - 5, base - 10); }

// ── Common scene: night sky band, night air, earth ground with a moss lip ──────
function scene(g, {gy = 39, sky = 14, tufts = [3, 11, 20, 30, 41]} = {}) {
  rect(g, 0, 0, S, sky, 'K');
  rect(g, 0, gy, S, S - gy, 'L'); rect(g, 0, gy, S, 2, 'M');
  tufts.forEach(x => px(g, x, gy - 1, 'M'));
}
const base = opts => { const g = grid('N'); scene(g, opts); return g; };
// Collector speed streaks (from the approved Courier Tip), drawn left of an arriving Collector.
const streaks = (g, x, y) => [[x - 1, y - 5, 6], [x + 1, y, 8], [x - 1, y + 5, 5]].forEach(([sx, sy, w]) => rect(g, sx, sy, w, 2, 'T'));
// A thin Pulse ring: one pale pixel line with a dark line inside it so it reads on any ground.
function pulseRing(g, cx, cy, r, keep) {
  ring(g, cx, cy, r + 1, 1, 'O', keep);
  ring(g, cx, cy, r, 1.4, 'Y', keep);
}

// ── New sprites (Common) ──────────────────────────────────────────────────────
// Hourglass: "ready sooner" device. Wood caps, pale glass, gold sand mostly run to the bottom.
const HOURGLASS = [
  'OOOOOOOOOOO',
  'OPBBBBBBBLO',
  'OOOOOOOOOOO',
  '.OYYYYYYYO.',
  '.OYYYYYYYO.',
  '..OYYYYYO..',
  '...OYGYO...',
  '....OGO....',
  '...OYGYO...',
  '..OYYGYYO..',
  '.OYYGGGYYO.',
  '.OGGGGGGGO.',
  'OOOOOOOOOOO',
  'OPBBBBBBBLO',
  'OOOOOOOOOOO'];
// Parametric hourglass for a large subject: sand mostly run down (ready soon).
function hourglass(g, cx, top, w, h, {topSand = 2} = {}) {
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
const HOURGLASS_S = ['OOOOOOO', 'OBBBBBO', '.OYYYO.', '..OGO..', '.OYGYO.', '.OGGGO.', 'OBBBBBO', 'OOOOOOO'];

// Spark Meter (Common form): leather frame, dark interior, notched segments, gold fill from the bottom.
function meterBar(g, x, y, w, h, fillRows, {notch = 5} = {}) {
  shape(g, l => rect(l, x, y, w, h, 'L'));
  rect(g, x, y, 1, h, 'B');
  rect(g, x + 1, y + 1, w - 2, h - 2, 'K');
  const fy = y + h - 1 - fillRows;
  rect(g, x + 1, fy, w - 2, fillRows, 'G'); rect(g, x + 1, fy, 1, fillRows, 'Y'); rect(g, x + w - 2, fy, 1, fillRows, 'D');
  for (let j = y + h - 1 - notch; j > y; j -= notch) { if (j >= fy) rect(g, x + 1, j, w - 2, 1, 'D'); else { rect(g, x + 1, j, 2, 1, 'N'); rect(g, x + w - 3, j, 2, 1, 'N'); } }
}

// A rose Dusk crescent (wine body, ember lit rim), opening to the upper right.
function crescent(g, cx, cy, r, ox, oy) {
  shape(g, l => {
    disc(l, cx, cy, r, 'R', (x, y) => !inDisc(x, y, cx + ox, cy + oy, r * .82));
    disc(l, cx - 1, cy - 1, r - 1.5, 'E', (x, y) => !inDisc(x, y, cx + ox - 1, cy + oy - 1, r * .82) && inDisc(x, y, cx - 2, cy - 2, r - 1) && x + y < cx + cy - 2);
  });
}

// Candle stub: pale wax with a lit left edge, two drips, a dark wick.
function candle(g, cx, top, w, h) {
  const x = cx - Math.floor(w / 2);
  shape(g, l => { rect(l, x, top, w, h, 'P'); rect(l, x, top, 2, 6, 'Y'); rect(l, x + w - 2, top + 2, 1, 4, 'Y'); });
  rect(g, x + 1, top + 1, 1, h - 2, 'Y'); rect(g, x + w - 1, top, 1, h, 'B'); rect(g, x, top + h - 1, w, 1, 'B');
  rect(g, cx, top - 3, 1, 3, 'O');
}
const SMALL_FLAME = ['..O..', '.OEO.', '.OEO.', 'OEGEO', 'OGWGO', 'OGWGO', '.OOO.'];
const FLAME7 = ['...O...', '..OEO..', '..OEO..', '.OEGEO.', '.OEGEO.', 'OEGWGEO', 'OEGWGEO', 'OGWWWGO', '.OGWGO.', '..OOO..'];
const LEAF = ['.OO..', 'OmmO.', 'OmmmO', '.OMmO', '..OMO', '...O.'];

// Leather satchel with a stitched border and flap (Pocket Sparks).
function satchel(g, x, y, w, h) {
  // a soft pouch: straight top, round belly, a round-bottomed flap with stitching along its edge
  const cx = x + w / 2;
  shape(g, l => { rect(l, x, y, w, h - 6, 'L'); for (let y2 = 0; y2 < S; y2++) for (let x2 = 0; x2 < S; x2++) if (inEll(x2, y2, cx, y + h - 7, w / 2, 7) && y2 >= y + h - 7) l[y2][x2] = 'L'; });
  rect(g, x, y, 1, h - 6, 'B'); rect(g, x + 1, y + h - 6, 1, 3, 'B');
  shape(g, l => { for (let y2 = 0; y2 < S; y2++) for (let x2 = 0; x2 < S; x2++) if ((inEll(x2, y2, cx, y + 3, w / 2 + 1, 8) && y2 >= y + 3) || (y2 >= y - 1 && y2 < y + 3 && x2 >= x - 1 && x2 <= x + w)) l[y2][x2] = 'B'; });
  rect(g, x - 1, y - 1, w + 2, 1, 'P');
  for (let x2 = x + 1; x2 < x + w - 1; x2 += 2) { for (let y2 = y + 10; y2 > y; y2--) if (inEll(x2, y2, cx, y + 3, w / 2 - 1, 6.4)) { px(g, x2, y2, 'P'); break; } }
  shape(g, l => { rect(l, Math.floor(cx) - 2, y + 8, 4, 3, 'G'); px(l, Math.floor(cx) - 2, y + 8, 'W'); });
}

// Spool: two wooden flanges and a gold-thread core, standing upright.
function spool(g, cx, top, w, h) {
  const x = cx - Math.floor(w / 2);
  shape(g, l => {
    rect(l, x, top, w, 3, 'B'); rect(l, x, top + h - 3, w, 3, 'B');
    rect(l, x + 2, top + 3, w - 4, h - 6, 'G');
  });
  rect(g, x, top, w, 1, 'P'); rect(g, x, top + h - 3, w, 1, 'P');
  rect(g, x + 2, top + 3, 1, h - 6, 'Y'); rect(g, x + w - 3, top + 3, 1, h - 6, 'D');
  for (let j = top + 4; j < top + h - 3; j += 2) rect(g, x + 3, j, w - 6, 1, 'D');
}

// ── Pictures ──────────────────────────────────────────────────────────────────
const P = {};

// COLLECT ──────────────────────────────────────────────────────────────────────
// Body Spark +2: the approved B picture, unchanged.
P['body-spark'] = () => { const g = base();
  wisp(g, 24, 29, 8);
  trail(g, 14, 14, 18, 21, 3); trail(g, 34, 14, 30, 21, 3);
  sparkAt(g, 11, 10, 10); sparkAt(g, 11, 38, 10);
  return g; };

// Pocket Sparks: a stitched satchel full of Sparks; one flies out into a small wisp.
P['spark-cache'] = () => { const g = base({gy: 40, tufts: [2, 30, 37, 44]});
  sparkAt(g, 7, 10, 19); sparkAt(g, 7, 22, 18); sparkAt(g, 11, 16, 17);
  satchel(g, 6, 22, 22, 17);
  trail(g, 24, 14, 32, 10, 4);
  wisp(g, 38, 9, 5);
  sparkAt(g, 7, 28, 15);
  return g; };

// Dusk Wick: the wisp takes a rose Dusk crescent and three gold Sparks burst back out.
P['dusk-wick'] = () => { const g = base();
  crescent(g, 15, 18, 11, 5, -4);
  trail(g, 21, 26, 26, 29, 3, 'E');
  wisp(g, 33, 32, 7);
  sparkAt(g, 7, 42, 22); sparkAt(g, 7, 30, 20); sparkAt(g, 7, 44, 34);
  return g; };

// Cluster Heart: a bound bunch of Sparks (one pickup) streaming into the wisp.
P['cluster-heart'] = () => { const g = base();
  ring(g, 14, 15, 12, 1, 'D');
  sparkAt(g, 11, 14, 15); sparkAt(g, 7, 8, 9); sparkAt(g, 7, 21, 9); sparkAt(g, 7, 8, 21); sparkAt(g, 7, 20, 22);
  trail(g, 25, 24, 28, 27, 3);
  wisp(g, 33, 31, 8);
  return g; };

// Low Wick: a nearly empty Spark Meter; a Spark streaks into the wisp beside it.
P['low-wick'] = () => { const g = base();
  meterBar(g, 8, 8, 10, 31, 8);
  sparkAt(g, 11, 38, 9);
  trail(g, 35, 15, 33, 20, 3);
  wisp(g, 31, 28, 7);
  return g; };

// Wick Doubler: one Spark goes into a candle's flame and two come out.
P['wick-doubler'] = () => { const g = base();
  candle(g, 17, 25, 12, 15);
  stamp(g, FLAME7, 14, 12);
  sparkAt(g, 7, 5, 6); trail(g, 8, 9, 12, 13, 3);
  trail(g, 22, 15, 28, 12, 3); trail(g, 22, 19, 31, 22, 4);
  sparkAt(g, 11, 34, 9); sparkAt(g, 11, 38, 24);
  return g; };

// Glass Spool: a Spark drops into an hourglass that has nearly run out; the Collector waits beside it.
P['glass-spool'] = () => { const g = base();
  hourglass(g, 17, 12, 17, 27);
  sparkAt(g, 7, 7, 5); trail(g, 10, 8, 13, 10, 2);
  collector(g, 34, 30, 7);
  return g; };

// Mending Moss: the Collector, dimmed after a save, mends on a moss bed while a Spark is taken in.
P['mending-moss'] = () => { const g = base({gy: 40, tufts: [3, 44]});
  // a low clumped moss cushion: a row of round tufts, lit on top
  const tufts = [[9, 36, 4], [15, 34, 5], [22, 33, 5], [29, 33, 5], [35, 34, 5], [40, 36, 4]];
  shape(g, l => { tufts.forEach(([x, y, r]) => disc(l, x, y, r, 'M')); rect(l, 6, 36, 37, 4, 'M'); });
  tufts.forEach(([x, y, r]) => disc(g, x - 1, y - 1, r - 1.6, 'm', (px2, py2) => py2 < y));
  [[12, 37], [19, 36], [27, 37], [33, 36], [38, 38]].forEach(([x, y]) => px(g, x, y, 'L'));
  stamp(g, LEAF, 10, 21); stamp(g, flip(LEAF), 33, 21);
  orb(g, 24, 24, 7, {rim: 'T', body: 'C', core: 'C', hot: 'c'});
  sparkAt(g, 11, 38, 9); trail(g, 35, 14, 31, 18, 3);
  return g; };

// Fast Spool: a spinning spool reels the Collector in fast along its gold thread.
P['fast-spool'] = () => { const g = base();
  spool(g, 13, 14, 14, 25);
  [[4, 10], [3, 12], [22, 10], [23, 12]].forEach(([x, y]) => px(g, x, y, 'Y'));
  line(g, 20, 26, 31, 26, 'G');
  collector(g, 36, 26, 6);
  rect(g, 43, 21, 4, 1, 'T'); rect(g, 44, 26, 3, 1, 'T'); rect(g, 43, 31, 4, 1, 'T');
  sparkAt(g, 7, 36, 9); trail(g, 33, 13, 31, 15, 2);
  return g; };


// DELIVERY ─────────────────────────────────────────────────────────────────────
// Courier Tip: the approved B picture, unchanged.
P['courier-tip'] = () => { const g = base({gy: 40, tufts: [5, 17, 26, 38]});
  [[1, 22, 6], [3, 27, 8], [1, 32, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 18, 27, 7);
  sparkAt(g, 16, 31, 23);
  sparkAt(g, 7, 38, 8); sparkAt(g, 7, 44, 15);
  rect(g, 12, 43, 14, 1, 'O');
  return g; };

// Courier Glass: the Collector delivers a Spark into a magnifying glass, which shows it twice.
P['courier-glass'] = () => { const g = base({gy: 41, tufts: [4, 15, 25]});
  [[0, 21, 3], [0, 26, 5], [0, 31, 3]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 11, 26, 6);
  shape(g, l => { for (let i = 0; i < 9; i++) rect(l, 37 + i, 31 + i, 3, 2, 'L'); });
  for (let i = 0; i < 9; i++) px(g, 37 + i, 31 + i, 'B');
  ring(g, 31, 21, 13, 1, 'O'); ring(g, 31, 21, 12, 3, 'B'); ring(g, 31, 21, 12, 1, 'D', (x, y) => x + y < 50);
  disc(g, 31, 21, 9, 'T'); disc(g, 28, 18, 3, 'C', (x, y) => x + y < 45);
  sparkAt(g, 11, 26, 21); sparkAt(g, 11, 36, 21);
  rect(g, 18, 26, 3, 1, 'D');
  return g; };

// Crate Lining: the Collector tows a lined crate of Sparks home.
P['crate-lining'] = () => { const g = base({gy: 40, tufts: [3, 40, 45]});
  [[0, 27, 4], [1, 31, 6], [0, 35, 4]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  sparkAt(g, 7, 15, 22); sparkAt(g, 11, 21, 21); sparkAt(g, 7, 27, 23);
  shape(g, l => { rect(l, 9, 25, 24, 14, 'B'); });
  rect(g, 9, 25, 24, 2, 'P'); rect(g, 9, 25, 1, 14, 'P');
  [30, 34].forEach(y => rect(g, 10, y, 22, 1, 'L'));
  line(g, 11, 37, 30, 28, 'L'); rect(g, 31, 26, 1, 13, 'L');
  rect(g, 9, 40, 25, 1, 'O');
  line(g, 33, 27, 37, 22, 'P');
  collector(g, 40, 19, 5);
  return g; };

// LATCH ────────────────────────────────────────────────────────────────────────
// A small hook (latch device), opening right.
const HOOK = ['OOOO.', 'OBBO.', '.OBO.', '.OBOO', '.OBBO', '..OO.'];
// Return Spring: the Collector latches a Spark at the end of a coiled spring, about to snap back.
P['return-spring'] = () => { const g = base();
  shape(g, l => { for (let x = 2; x <= 26; x++) { const y = Math.round(24 + 6 * Math.sin((x - 2) * Math.PI / 4)); px(l, x, y, x % 8 < 4 ? 'G' : 'D'); px(l, x, y + 1, 'D'); } });
  shape(g, l => rect(l, 0, 18, 3, 14, 'B')); rect(g, 0, 18, 1, 14, 'P');
  collector(g, 32, 25, 6);
  sparkAt(g, 11, 42, 25);
  [[20, 15], [24, 13], [28, 15]].forEach(([x, y]) => px(g, x, y, 'Y'));
  return g; };

// Haul Winch: a cranked winch on the ground hauls a hooked Cluster down to it.
P['haul-winch'] = () => { const g = base({gy: 40, tufts: [3, 12, 22]});
  // two wooden legs, a rope drum between them, and a crank handle on the right
  shape(g, l => { rect(l, 24, 26, 3, 14, 'B'); rect(l, 42, 26, 3, 14, 'B'); });
  rect(g, 24, 26, 1, 14, 'P'); rect(g, 42, 26, 1, 14, 'P');
  shape(g, l => { rect(l, 27, 26, 15, 10, 'P'); });
  rect(g, 27, 26, 15, 1, 'Y'); rect(g, 27, 35, 15, 1, 'B');
  for (let x = 28; x < 41; x += 2) rect(g, x, 27, 1, 8, 'B');
  shape(g, l => { rect(l, 45, 30, 2, 1, 'D'); rect(l, 46, 30, 1, 7, 'D'); rect(l, 45, 36, 3, 2, 'G'); });
  line(g, 27, 27, 15, 13, 'P'); line(g, 28, 27, 16, 13, 'O');
  stamp(g, HOOK, 12, 10);
  sparkAt(g, 7, 9, 19); sparkAt(g, 7, 19, 20); sparkAt(g, 11, 13, 22);
  return g; };

// PULSE ────────────────────────────────────────────────────────────────────────
// Resonant Harvest: a golden sheaf on the field sends out one Pulse ring.
P['harvest-common'] = () => { const g = base();
  pulseRing(g, 24, 28, 18, (x, y) => y < 39);
  sheaf(g, 24, 41, {tall: 28});
  sparkAt(g, 7, 41, 12);
  return g; };

// A Spark not yet reached by the ring: wood and paper instead of gold and white.
const SPARK11_DIM = SPARK11.map(r => r.replace(/G/g, 'B').replace(/W/g, 'P').replace(/D/g, 'L'));
// First Ripple: a fresh ring just leaving the wisp lights the nearest Spark; the farther ones wait.
P['first-ripple'] = () => { const g = base();
  wisp(g, 10, 28, 4);
  pulseRing(g, 10, 28, 11, (x, y) => y < 39);
  sparkAt(g, 16, 22, 21);
  stamp(g, SPARK11_DIM, 31, 25); stamp(g, SPARK11_DIM, 39, 13);
  return g; };

// Far Shore: a wide old ring has crossed the near Spark (spent) and lights two Sparks on the far shore.
P['far-shore'] = () => { const g = base({gy: 39, tufts: [33, 40, 45]});
  rect(g, 0, 39, 30, 9, 'T'); rect(g, 0, 39, 30, 1, 'C'); [[3, 42, 5], [14, 44, 6], [22, 41, 4]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'c'));
  pulseRing(g, -6, 30, 41, (x, y) => y < 39);
  pulseRing(g, -6, 30, 27, (x, y) => y < 39 && x < 20);
  stamp(g, SPARK11_DIM, 7, 17);
  sparkAt(g, 11, 38, 15); sparkAt(g, 11, 40, 31);
  return g; };

// FLASH ────────────────────────────────────────────────────────────────────────
// The Flash pickup: an upright white triangle, lit left edge, paper shade on the right and base.
function flashTri(g, cx, top, h, {body = 'W', lit = 'W', shade = 'P', base: bc = 'Y'} = {}) {
  shape(g, l => { for (let i = 0; i < h; i++) { const k = Math.floor(i * .62); rect(l, cx - k, top + i, k * 2 + 1, 1, body); px(l, cx - k, top + i, lit); px(l, cx + k, top + i, shade); } rect(l, cx - Math.floor((h - 1) * .62), top + h - 1, Math.floor((h - 1) * .62) * 2 + 1, 1, bc); });
}
// Burst: eight short rays of light around a point (the Flash device; rays, not a glow).
function burst(g, cx, cy, r0, r1, {ray = 'Y', tip = 'W'} = {}) {
  for (let a = 0; a < 8; a++) {
    const t = a * Math.PI / 4 - Math.PI / 2, dx = Math.cos(t), dy = Math.sin(t), long = a % 2 === 0;
    const end = long ? r1 : Math.round(r0 + (r1 - r0) * .6);
    for (let r = r0; r <= end; r++) px(g, Math.round(cx + dx * r), Math.round(cy + dy * r), r === end ? tip : ray);
  }
}
// Clear Prism: a Flash's beam enters a glass prism and comes out as two beams, each a Spark.
P['clear-prism'] = () => { const g = base();
  burst(g, 7, 9, 5, 8); flashTri(g, 7, 5, 8);
  line(g, 10, 14, 19, 24, 'W'); line(g, 10, 15, 19, 25, 'Y');
  shape(g, l => { for (let i = 0; i < 20; i++) { const k = Math.floor(i * .6); rect(l, 25 - k, 18 + i, k * 2 + 1, 1, 'c'); px(l, 25 - k, 18 + i, 'W'); for (let j = 1; j <= k; j++) px(l, 25 + j, 18 + i, j > k - 2 ? 'C' : 'c'); } });
  rect(g, 15, 37, 22, 1, 'C');
  line(g, 31, 25, 38, 17, 'Y'); line(g, 31, 30, 38, 33, 'Y');
  sparkAt(g, 11, 41, 13); sparkAt(g, 11, 42, 34);
  return g; };

// Flash Thread: a gold thread from a Flash triangle snaps the Collector back sooner.
P['flash-thread'] = () => { const g = base();
  burst(g, 13, 15, 9, 13); flashTri(g, 13, 7, 14);
  for (let x = 19; x <= 29; x++) { const y = Math.round(21 + (x - 19) * (x - 19) * .06); px(g, x, y, 'G'); px(g, x, y + 1, 'D'); }
  collector(g, 34, 28, 7);
  stamp(g, HOURGLASS, 35, 3);
  return g; };

// FLASH ENDS ───────────────────────────────────────────────────────────────────
// Prism Wick: a spent, paper-grey Flash triangle sends one last Pulse ring, three Sparks in it.
P['diving-bell'] = () => { const g = base();
  pulseRing(g, 24, 26, 17, (x, y) => y < 39);
  flashTri(g, 24, 16, 18, {body: 'P', lit: 'Y', shade: 'B', base: 'B'});
  sparkAt(g, 7, 9, 13); sparkAt(g, 7, 40, 14); sparkAt(g, 7, 41, 33);
  return g; };

// RHYTHM ───────────────────────────────────────────────────────────────────────
// A hanging bell: gold body lit on the left, darker lip, clapper below.
function bell(g, cx, top, h) {
  shape(g, l => {
    for (let i = 0; i < h; i++) { const k = i < 3 ? 2 + i : Math.round(4 + (i - 3) * .45 + (i > h - 4 ? (i - (h - 4)) * 1.2 : 0)); rect(l, cx - k, top + i, k * 2 + 1, 1, 'G'); px(l, cx - k, top + i, 'Y'); px(l, cx - k + 1, top + i, 'Y'); px(l, cx + k, top + i, 'D'); px(l, cx + k - 1, top + i, 'D'); }
    const k = Math.round(4 + (h - 4) * .45 + 3.6); rect(l, cx - k, top + h - 1, k * 2 + 1, 2, 'D');
  });
  shape(g, l => { rect(l, cx - 1, top + h + 1, 3, 2, 'L'); });
}
// Toll Bell: a bell rings under three evenly spaced beat Sparks.
P['toll-bell'] = () => { const g = base();
  shape(g, l => rect(l, 6, 14, 36, 3, 'B')); rect(g, 6, 14, 36, 1, 'P');
  shape(g, l => { rect(l, 8, 17, 3, 22, 'B'); rect(l, 37, 17, 3, 22, 'B'); }); rect(g, 8, 17, 1, 22, 'P'); rect(g, 37, 17, 1, 22, 'P');
  rect(g, 23, 17, 2, 2, 'O');
  bell(g, 24, 19, 14);
  [12, 24, 36].forEach(x => sparkAt(g, 7, x, 6));
  return g; };

// Pacesetter: the Collector dashes over three evenly spaced beat posts, a small hourglass running out.
P['pacesetter'] = () => { const g = base();
  [10, 22, 34].forEach(x => { shape(g, l => rect(l, x - 2, 33, 5, 6, 'B')); rect(g, x - 2, 33, 5, 1, 'P'); rect(g, x - 2, 33, 1, 6, 'P'); sparkAt(g, 7, x, 26); });
  [[3, 9, 6], [5, 14, 8], [3, 19, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 21, 14, 6);
  stamp(g, HOURGLASS_S, 39, 4);
  return g; };

// FALLING LIFT ─────────────────────────────────────────────────────────────────
// Lift chevron (the wisp's up-beat).
const CHEV = ['....O....', '...OGO...', '..OGWGO..', '.OGGOGGO.', 'OGGO.OGGO', 'OOO...OOO'];
const CHEV_WHITE = CHEV.map(r => r.replace(/G/g, 'Y'));
// Downbeat: the wisp falls, then Lifts back up at the bottom of the drop; two Sparks pay out.
P['downbeat'] = () => { const g = base();
  trail(g, 5, 4, 14, 21, 7, 'P');
  wisp(g, 20, 29, 7);
  trail(g, 27, 21, 33, 13, 4, 'G');
  stamp(g, CHEV, 32, 6);
  sparkAt(g, 7, 41, 21); sparkAt(g, 7, 9, 33);
  return g; };

// Counterweight: a brass weight drops past a pulley and hoists the Collector up quickly.
P['counterweight'] = () => { const g = base();
  shape(g, l => rect(l, 6, 4, 36, 2, 'B')); rect(g, 6, 4, 36, 1, 'P');
  rect(g, 23, 6, 2, 3, 'O');
  shape(g, l => disc(l, 24, 12, 5, 'B')); disc(g, 24, 12, 3.4, 'L'); disc(g, 24, 12, 1.2, 'O'); px(g, 21, 10, 'P'); px(g, 22, 9, 'P');
  rect(g, 18, 12, 1, 18, 'P'); rect(g, 30, 12, 1, 9, 'P');
  // a brass weight, lit top-left, dark on the right
  shape(g, l => { rect(l, 12, 28, 13, 10, 'B'); rect(l, 14, 26, 9, 2, 'B'); });
  rect(g, 12, 28, 13, 1, 'P'); rect(g, 14, 26, 9, 1, 'P'); rect(g, 12, 28, 1, 10, 'P'); rect(g, 24, 28, 1, 10, 'L'); rect(g, 12, 37, 13, 1, 'L');
  rect(g, 15, 31, 7, 4, 'L'); rect(g, 16, 32, 5, 2, 'D'); rect(g, 17, 24, 3, 2, 'O');
  [[12, 19], [15, 21], [22, 20], [25, 22]].forEach(([x, y]) => rect(g, x, y, 1, 4, 'T'));
  collector(g, 30, 25, 5);
  trail(g, 30, 36, 30, 33, 3, 'G');
  stamp(g, HOURGLASS_S, 39, 31);
  return g; };

// LIFT ─────────────────────────────────────────────────────────────────────────
// Double Lift: the wisp rises under two quick stacked chevrons; the second one is pale (free).
P['double-lift'] = () => { const g = base();
  trail(g, 24, 38, 24, 34, 3, 'P');
  wisp(g, 24, 26, 7);
  stamp(g, CHEV, 20, 10); stamp(g, CHEV_WHITE, 20, 3);
  return g; };

// SAVE ─────────────────────────────────────────────────────────────────────────
// Home Beacon: the Save heart burns on top of a beacon post; Sparks rain from it.
P['home-beacon'] = () => { const g = base();
  shape(g, l => { rect(l, 21, 26, 6, 13, 'B'); rect(l, 18, 24, 12, 3, 'L'); }); rect(g, 21, 26, 1, 13, 'P'); rect(g, 18, 24, 12, 1, 'B');
  stamp(g, HEART, 13, 5);
  [[9, 6], [38, 6], [6, 16], [42, 16]].forEach(([x, y], i) => { line(g, x, y, x + (x < 24 ? -2 : 2), y - (i < 2 ? 2 : 0), 'Y'); });
  sparkAt(g, 7, 8, 30); sparkAt(g, 7, 40, 30); sparkAt(g, 7, 36, 37);
  return g; };

// CLEAR ────────────────────────────────────────────────────────────────────────
// The Clear flag (from the Clear Trigger icon): wooden pole, moss pennant.
const FLAG = ['OO.......', 'OBOOOOOO.', 'OBOmmmmmO', 'OBOmMMMMO', 'OBOMMMMO.', 'OBOOOOO..', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OBO......', 'OOO......'];
const inEll = (x, y, cx, cy, rx, ry) => ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1;
const ell = (g, cx, cy, rx, ry, ch, keep) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inEll(x, y, cx, cy, rx, ry) && (!keep || keep(x, y))) px(g, x, y, ch); };
// Growth Ring: a cut stump shows its year rings, the newest one gold.
P['growth-ring'] = () => { const g = base({gy: 40, tufts: [3, 44]});
  shape(g, l => { rect(l, 8, 26, 30, 13, 'B'); ell(l, 23, 39, 15, 2, 'B'); rect(l, 5, 37, 6, 3, 'B'); rect(l, 35, 37, 7, 3, 'B'); });
  for (let x = 9; x < 38; x += 4) rect(g, x, 30, 1, 9, 'L');
  rect(g, 8, 26, 1, 13, 'P');
  shape(g, l => ell(l, 23, 26, 15, 7, 'G'));
  ell(g, 23, 26, 12.6, 5, 'P'); ell(g, 23, 26, 10, 4.3, 'B'); ell(g, 23, 26, 9, 3.6, 'P'); ell(g, 23, 26, 6, 2.5, 'B'); ell(g, 23, 26, 5, 1.8, 'P'); rect(g, 22, 26, 2, 1, 'L');
  stamp(g, FLAG, 37, 4);
  return g; };

// Wind Feather: a pale feather rides streaks of wind past the Clear flag.
P['wind-feather'] = () => { const g = base();
  [[2, 10, 10], [26, 6, 8], [30, 36, 9], [4, 22, 6]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'T'));
  shape(g, l => {
    const x0 = 9, y0 = 38, x1 = 38, y1 = 8, L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const vx = x + .5 - x0, vy = y + .5 - y0, t = (vx * ux + vy * uy) / L, d = vx * -uy + vy * ux;
      if (t < 0 || t > 1) continue;
      const w = t < .2 ? .6 : 7 * Math.sin(Math.PI * Math.min(1, (t - .2) / .8)) ** .6;
      if (Math.abs(d) <= w) l[y][x] = Math.abs(d) < .8 ? 'B' : d > w - 1.6 ? 'P' : 'Y';
    }
  });
  [[22, 26, 26, 30], [28, 19, 32, 22]].forEach(([a, b, c, d]) => line(g, a, b, c, d, 'O'));
  stamp(g, FLAG, 2, 23);
  return g; };

// Wayfarer's Purse: a drawstring leather purse of Stored Sparks beside the Clear flag.
P['wayfarers-purse'] = () => { const g = base({gy: 40, tufts: [4, 40]});
  // sack body, pinched neck, flared ruffle above the cord
  shape(g, l => {
    ell(l, 22, 31, 13, 9, 'L', (x, y) => y < 40); rect(l, 10, 37, 24, 3, 'L');
    for (let y = 20; y < 25; y++) { const k = 3 + (y - 20); rect(l, 22 - k, y, k * 2, 1, 'L'); }
    for (let y = 13; y < 20; y++) { const k = 3 + Math.round((19 - y) * .9); rect(l, 22 - k, y, k * 2, 1, 'L'); }
  });
  ell(g, 19, 29, 8, 6, 'B', (x, y) => x + y < 45 && y > 23);
  for (let x = 14; x < 30; x += 3) { px(g, x, 12, 'O'); px(g, x + 1, 12, 'N'); }
  rect(g, 17, 13, 3, 1, 'B'); rect(g, 15, 14, 2, 1, 'B');
  shape(g, l => { rect(l, 18, 20, 8, 2, 'D'); rect(l, 18, 20, 8, 1, 'G'); line(l, 26, 21, 30, 26, 'D'); line(l, 25, 22, 27, 27, 'D'); });
  sparkAt(g, 11, 23, 31);
  stamp(g, FLAG, 36, 8);
  return g; };

// Nest Egg: a woven nest holds pale eggs and one gold Spark egg; the Clear flag stands beside it.
P['nest-egg'] = () => { const g = base({gy: 40, tufts: [3, 9, 44]});
  ell(g, 15, 27, 4, 5.5, 'O'); ell(g, 15, 27, 3, 4.5, 'Y'); px(g, 14, 25, 'W'); px(g, 16, 28, 'P'); px(g, 17, 29, 'P');
  ell(g, 31, 27, 4, 5.5, 'O'); ell(g, 31, 27, 3, 4.5, 'Y'); px(g, 30, 25, 'W'); px(g, 32, 28, 'P'); px(g, 33, 29, 'P');
  ell(g, 23, 24, 5, 7, 'O'); ell(g, 23, 24, 4, 6, 'G'); ell(g, 22, 22, 2, 3, 'W'); ell(g, 25, 27, 1.5, 2.5, 'D');
  shape(g, l => { ell(l, 23, 32, 17, 7, 'B', (x, y) => y >= 29); rect(l, 6, 29, 35, 2, 'B'); });
  for (let x = 7; x < 40; x += 3) { line(g, x, 30, x + 2, 36, 'L'); }
  rect(g, 6, 29, 35, 1, 'P');
  stamp(g, FLAG, 38, 4);
  return g; };

// REST ─────────────────────────────────────────────────────────────────────────
const BIGFLAME = ['.....O....', '....OEO...', '...OEEO...', '...OEGEO..', '..OEGGEO..', '..OEGWGEO.', '.OEGWWGEO.', '.OEGWWWGEO', 'OEGWWWWGEO', 'OEGWWWWGEO', 'OEGGWWGGEO', '.OEGGGGEO.', '..OEEEEO..', '...OOOO...'];
function logs(g, cx, y, w) {
  shape(g, l => { line(l, cx - w, y + 3, cx + w, y - 1, 'B'); line(l, cx - w, y + 4, cx + w, y, 'B'); line(l, cx - w, y - 1, cx + w, y + 3, 'B'); line(l, cx - w, y, cx + w, y + 4, 'L'); });
}
// Second Ember: the Rest campfire, and a second small ember kindled from it on its own stones.
P['camp-kit'] = () => { const g = base({gy: 40, tufts: [3, 26, 44]});
  logs(g, 16, 35, 10);
  stamp(g, BIGFLAME, 11, 20);
  trail(g, 22, 22, 30, 24, 3, 'E');
  shape(g, l => { rect(l, 30, 37, 3, 2, 'B'); rect(l, 34, 37, 3, 2, 'B'); rect(l, 38, 37, 3, 2, 'B'); });
  stamp(g, FLAME7, 32, 27);
  return g; };

// Growth Seed: a seed sprouting beside the Rest campfire.
P['growth-seed-common'] = () => { const g = base({gy: 40, tufts: [44]});
  shape(g, l => { rect(l, 4, 38, 26, 3, 'L'); rect(l, 7, 37, 20, 1, 'L'); }); rect(g, 7, 37, 20, 1, 'B');
  seedSprout(g, 17, 41);
  stamp(g, CAMPFIRE, 31, 27);
  return g; };

// ANY TRIGGER ──────────────────────────────────────────────────────────────────
// A tiny chain card: paper with a dark rim and a mark in the middle.
function miniCard(g, x, y, w, h, mark) {
  shape(g, l => { rect(l, x, y, w, h, 'P'); });
  rect(g, x, y, w, 1, 'Y'); rect(g, x + w - 1, y + 1, 1, h - 1, 'B');
  if (mark) stamp(g, mark, x + Math.floor((w - mark[0].length) / 2), y + Math.floor((h - mark.length) / 2));
}
// Prism Lens: a faceted lens throws its light back over the row of cards before it.
P['prism-lens'] = () => { const g = base();
  [[3, 26], [12, 26], [21, 26]].forEach(([x, y]) => miniCard(g, x, y, 8, 11, GLINT));
  line(g, 30, 23, 6, 17, 'Y'); line(g, 30, 33, 6, 40, 'Y');
  shape(g, l => {
    for (let i = 0; i < 17; i++) { const k = 8 - Math.abs(8 - i); const w = 4 + Math.round(k * .7); rect(l, 37 - w, 20 + i, w * 2, 1, 'c'); }
  });
  for (let i = 0; i < 17; i++) { const k = 8 - Math.abs(8 - i); const w = 4 + Math.round(k * .7); px(g, 37 - w, 20 + i, 'W'); if (i < 8) px(g, 37 - w + 1, 20 + i, 'W'); px(g, 36 + w, 20 + i, 'C'); px(g, 35 + w, 20 + i, i > 8 ? 'C' : 'c'); }
  line(g, 37, 21, 37, 35, 'C'); rect(g, 33, 26, 2, 3, 'W');
  return g; };

// Kindling Bead: on a string after a Spark, an ember bead catches and lights.
P['kindling-bead'] = () => { const g = base();
  for (let x = 0; x < S; x++) px(g, x, Math.round(20 + (x - 24) * (x - 24) * .012), 'P');
  [[4, 19], [43, 22]].forEach(([x, y]) => { shape(g, l => disc(l, x, y, 2.6, 'B')); px(g, x - 1, y - 1, 'P'); });
  sparkAt(g, 11, 14, 22);
  shape(g, l => disc(l, 31, 24, 7, 'E'));
  disc(g, 30, 23, 5, 'G', (x, y) => x + y < 55); disc(g, 28, 21, 2, 'W'); rect(g, 31, 30, 3, 1, 'R'); px(g, 37, 26, 'R');
  stamp(g, SMALL_FLAME, 29, 10);
  trail(g, 19, 19, 24, 18, 3);
  return g; };

// NEXT CARD ────────────────────────────────────────────────────────────────────
// Echo: sound rings roll from the left into a card, and its echo copy stands behind it.
P['echo'] = () => { const g = base({gy: 41, tufts: [5, 44]});
  for (let y = 6; y < 30; y++) { if (y % 2 === 0) { px(g, 26, y, 'T'); px(g, 44, y, 'T'); } }
  for (let x = 26; x <= 44; x++) { if (x % 2 === 0) { px(g, x, 6, 'T'); px(g, x, 30, 'T'); } }
  miniCard(g, 18, 12, 18, 25, SPARK11);
  rect(g, 20, 14, 14, 1, 'B'); rect(g, 20, 34, 14, 1, 'B');
  [6, 10].forEach(r => ring(g, 6, 25, r, 1, 'Y', (x, y) => x > 7 && Math.abs(y - 25) < r * .75));
  return g; };

// ALWAYS ON ────────────────────────────────────────────────────────────────────
// Deep Vessel: the Spark Meter grows taller; the new segments on top are fresh wood and still empty.
P['deep-vessel'] = () => { const g = base();
  meterBar(g, 17, 15, 13, 25, 23);
  shape(g, l => rect(l, 17, 3, 13, 12, 'P')); rect(g, 18, 4, 11, 11, 'K'); rect(g, 17, 3, 1, 12, 'Y');
  [7, 11].forEach(y => rect(g, 18, y, 11, 1, 'T'));
  rect(g, 14, 15, 19, 1, 'O');
  stamp(g, CHEV, 35, 4); stamp(g, CHEV, 35, 10);
  return g; };

// Tight Packing: a glass jar crammed with Stored Sparks, its lid strapped down.
P['tight-packing'] = () => { const g = base({gy: 40, tufts: [3, 9, 40]});
  // a round-shouldered glass jar: dark glass, a pale highlight down the left, Sparks crammed to the neck
  shape(g, l => { rect(l, 11, 20, 26, 20, 'T'); ell(l, 24, 21, 13, 6, 'T'); rect(l, 16, 12, 16, 5, 'T'); });
  rect(g, 12, 20, 1, 18, 'c'); rect(g, 13, 18, 1, 6, 'c'); rect(g, 35, 21, 1, 18, 'N');
  [[17, 34], [26, 35], [33, 31], [21, 27], [30, 24], [15, 24]].forEach(([x, y]) => sparkAt(g, 11, x, y));
  sparkAt(g, 7, 24, 17); sparkAt(g, 7, 19, 15); sparkAt(g, 7, 29, 15);
  shape(g, l => rect(l, 14, 7, 20, 5, 'B')); rect(g, 14, 7, 20, 1, 'P'); rect(g, 14, 7, 1, 5, 'P'); rect(g, 14, 11, 20, 1, 'L');
  shape(g, l => rect(l, 15, 12, 18, 2, 'R')); rect(g, 15, 12, 18, 1, 'E'); shape(g, l => { line(l, 32, 13, 35, 17, 'R'); line(l, 31, 14, 33, 18, 'R'); });
  return g; };

// Lift Guide: the wisp glides toward rising ground; a gold arrow marks where to Lift.
const ARROW_UP = ['.....O.....', '....OGO....', '...OGWGO...', '..OGWWWGO..', '.OGGWWWGGO.', 'OGGGWWWGGDO', 'OOOOGWGDOOO', '...OGWGDO..', '...OGWGDO..', '...OGWGDO..', '...OGGGDO..', '...OGGGDO..', '...ODDDDO..', '...OOOOOO..'].map(r => r.slice(0, 11));
P['lift-guide'] = () => { const g = base({gy: 40, tufts: [3, 11]});
  shape(g, l => { for (let x = 22; x < S; x++) { const h = Math.min(20, Math.round((x - 22) * .9)); rect(l, x, 40 - h, 1, h, 'L'); } });
  for (let x = 22; x < S; x++) { const h = Math.min(20, Math.round((x - 22) * .9)); px(g, x, 40 - h, 'M'); px(g, x, 41 - h, 'M'); }
  wisp(g, 11, 25, 6);
  trail(g, 1, 25, 3, 25, 2, 'P');
  for (let x = 19; x <= 29; x += 2) px(g, x, Math.round(25 - (x - 19) * (x - 19) * .1), 'Y');
  stamp(g, ARROW_UP, 24, 2);
  return g; };

// Lantern Lens: a lantern's round lens throws its light ring wider over the dark.
P['lantern-lens'] = () => { const g = base();
  ring(g, 24, 24, 21, 1, 'T', (x, y) => (x + y) % 3 !== 0 && y < 39);
  ring(g, 24, 24, 15, 1, 'T', (x, y) => (x + y) % 4 === 0 && y < 39);
  [[24, 2, 24, 5], [4, 24, 7, 24], [41, 24, 44, 24], [9, 9, 11, 11], [39, 9, 37, 11]].forEach(([a, b, c, d]) => line(g, a, b, c, d, 'Y'));
  shape(g, l => { rect(l, 22, 8, 4, 2, 'L'); rect(l, 18, 10, 12, 3, 'L'); rect(l, 17, 31, 14, 3, 'L'); rect(l, 18, 13, 12, 18, 'Y'); });
  rect(g, 18, 10, 12, 1, 'B'); rect(g, 17, 31, 14, 1, 'B'); rect(g, 18, 13, 1, 18, 'L'); rect(g, 29, 13, 1, 18, 'L');
  ring(g, 24, 22, 6, 1.5, 'B'); disc(g, 24, 22, 4.6, 'W'); disc(g, 25, 23, 2, 'G');
  rect(g, 23, 6, 2, 2, 'O');
  return g; };

// Proximity: the wisp skims low over the ground, sparks crackle between, a revealing ring spreads.
P['slip-feather'] = () => { const g = base({gy: 39, tufts: [5, 30, 41]});
  pulseRing(g, 26, 32, 15, (x, y) => y < 38 && x > 14);
  [[3, 27, 7], [1, 31, 9], [4, 35, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'P'));
  wisp(g, 20, 31, 6);
  [[16, 38], [21, 38], [25, 37]].forEach(([x, y]) => stamp(g, GLINT, x - 1, y - 1));
  return g; };

// Heart Stitch: a needle stitches a torn heart closed; three Sparks count the Collects.
P['tailwind'] = () => { const g = base({gy: 41, tufts: [3, 44]});
  stamp(g, HEART, 13, 15);
  for (let y = 18; y < 32; y += 3) { line(g, 23, y, 25, y + 1, 'P'); px(g, 24, y + 2, 'O'); }
  line(g, 32, 18, 42, 6, 'W'); line(g, 33, 18, 43, 6, 'P'); px(g, 41, 7, 'O');
  for (let x = 26; x < 33; x++) px(g, x, Math.round(17 - (x - 29) * (x - 29) * -.12 - 1), 'D');
  [6, 12, 18].forEach(x => sparkAt(g, 7, x, 8));
  return g; };

// Springboard: after a Spark, the wisp bounces up off a sprung plank.
P['springboard'] = () => { const g = base({gy: 40, tufts: [3, 44]});
  shape(g, l => { for (let i = 0; i < 4; i++) { rect(l, 15 + (i % 2) * 2, 35 + i, 14, 1, i % 2 ? 'D' : 'G'); } });
  shape(g, l => rect(l, 9, 32, 30, 3, 'B')); rect(g, 9, 32, 30, 1, 'P');
  wisp(g, 24, 16, 7);
  [[17, 26, 15, 29], [31, 26, 33, 29]].forEach(([a, b, c, d]) => line(g, a, b, c, d, 'Y'));
  trail(g, 24, 30, 24, 26, 3, 'P');
  sparkAt(g, 7, 37, 9); trail(g, 34, 11, 31, 13, 2);
  return g; };

// Use Doubler: a card's three use pips become six on the card beside it.
P['use-doubler'] = () => { const g = base({gy: 41, tufts: [3, 44]});
  miniCard(g, 3, 17, 13, 18);
  [6, 9, 12].forEach(x => rect(g, x, 30, 2, 2, 'B'));
  rect(g, 6, 21, 7, 1, 'B'); rect(g, 6, 23, 5, 1, 'B');
  shape(g, l => { rect(l, 18, 25, 5, 2, 'G'); rect(l, 23, 23, 1, 6, 'G'); rect(l, 24, 24, 1, 4, 'G'); rect(l, 25, 25, 1, 2, 'G'); });
  miniCard(g, 28, 10, 17, 27);
  rect(g, 31, 14, 9, 1, 'B'); rect(g, 31, 16, 7, 1, 'B');
  [[31, 25], [35, 25], [39, 25], [31, 30], [35, 30], [39, 30]].forEach(([x, y]) => { rect(g, x, y, 3, 3, 'O'); px(g, x + 1, y + 1, 'G'); });
  [[31, 25], [35, 25], [39, 25], [31, 30], [35, 30], [39, 30]].forEach(([x, y]) => { rect(g, x, y, 3, 3, 'D'); px(g, x, y, 'W'); });
  return g; };

// Twin Wick: the wisp with two Collectors sharing one orbit.
P['twin-wick'] = () => { const g = base();
  ell(g, 24, 25, 19, 8, 'T', (x, y) => !inEll(x, y, 24, 25, 18, 7));
  wisp(g, 24, 25, 7);
  ell(g, 24, 25, 19, 8, 'T', (x, y) => !inEll(x, y, 24, 25, 18, 7) && y > 26);
  collector(g, 7, 26, 4); collector(g, 41, 24, 4);
  return g; };

// Long Spool: the Collector's line runs past its usual reach ring to catch a far Spark.
P['long-spool'] = () => { const g = base();
  ring(g, 10, 26, 14, 1.3, 'C', (x, y) => Math.floor((Math.atan2(y + .5 - 26, x + .5 - 10) + Math.PI) / (Math.PI / 10)) % 2 === 0 && y < 39);
  wisp(g, 10, 26, 5);
  line(g, 16, 25, 32, 21, 'P'); line(g, 16, 26, 32, 22, 'B');
  collector(g, 36, 20, 4);
  sparkAt(g, 11, 41, 10);
  return g; };

// Cast Line: a rod casts the Collector far out on a long arc to a Spark.
P['cast-line'] = () => { const g = base({gy: 40, tufts: [20, 30, 44]});
  shape(g, l => { line(l, 3, 39, 14, 12, 'B'); line(l, 4, 39, 15, 12, 'B'); }); line(g, 3, 39, 14, 12, 'P');
  shape(g, l => { disc(l, 8, 32, 2.6, 'L'); }); px(g, 7, 31, 'B');
  for (let x = 15; x <= 37; x++) px(g, x, Math.round(12 - (x - 15) * .35 + (x - 15) * (x - 15) * .03), 'P');
  collector(g, 38, 16, 4);
  sparkAt(g, 11, 39, 29);
  trail(g, 38, 21, 39, 23, 2);
  return g; };

// Dream: the wisp sleeps in the curve of a pale moon; a gold practice path runs ahead.
P['dream'] = () => { const g = base();
  shape(g, l => {
    disc(l, 17, 23, 14, 'P', (x, y) => !inDisc(x, y, 23, 18, 12));
    disc(l, 16, 22, 13, 'Y', (x, y) => !inDisc(x, y, 23, 18, 12) && x + y < 40);
  });
  wisp(g, 20, 27, 4);
  for (let x = 28; x <= 45; x += 2) px(g, x, Math.round(26 - Math.sin((x - 28) / 5) * 8), 'G');
  [[36, 6], [43, 12], [29, 4]].forEach(([x, y]) => stamp(g, GLINT, x, y));
  return g; };

// ── Metadata: family, 8-word idea, and the cards that continue the idea ────────
export const COMMON_META = {
  'body-spark': {family: 'Collect', idea: 'Two Sparks drop into the wisp over grass', line: ['body-spark']},
  'spark-cache': {family: 'Collect', idea: 'Stitched pouch of Sparks, one flies to wisp', line: ['spark-cache']},
  'dusk-wick': {family: 'Collect', idea: 'Wisp takes rose Dusk crescent, gold bursts out', line: ['dusk-wick', 'dusk-wick-ii', 'dusk-wick-iii']},
  'cluster-heart': {family: 'Collect', idea: 'A bound bunch of Sparks streams into wisp', line: ['cluster-heart']},
  'low-wick': {family: 'Collect', idea: 'Nearly empty meter, a Spark streaks into wisp', line: ['low-wick']},
  'wick-doubler': {family: 'Collect', idea: 'One Spark enters candle flame, two come out', line: ['wick-doubler']},
  'glass-spool': {family: 'Collect', idea: 'Spark drops into hourglass, Collector waits beside it', line: ['glass-spool']},
  'mending-moss': {family: 'Collect', idea: 'Dimmed Collector mends on moss, Spark comes in', line: ['mending-moss']},
  'fast-spool': {family: 'Collect', idea: 'A spinning spool reels the Collector in fast', line: ['fast-spool']},
  'courier-tip': {family: 'Delivery', idea: 'Collector rushes in with a Spark, tips pop', line: ['courier-tip', 'courier-tip-iii']},
  'courier-glass': {family: 'Delivery', idea: 'Collector delivers into a lens showing two Sparks', line: ['courier-glass']},
  'crate-lining': {family: 'Delivery', idea: 'Collector tows a lined crate of Sparks home', line: ['crate-lining']},
  'return-spring': {family: 'Latch', idea: 'Collector latches a Spark on a coiled spring', line: ['return-spring']},
  'haul-winch': {family: 'Latch', idea: 'Cranked winch hauls a hooked Cluster down fast', line: ['haul-winch']},
  'harvest-common': {family: 'Pulse', idea: 'Golden sheaf on the field sends one ring', line: ['harvest-common', 'harvest-rare', 'harvest-legendary']},
  'first-ripple': {family: 'Pulse', idea: 'Fresh ring lights the nearest Spark, others wait', line: ['first-ripple']},
  'far-shore': {family: 'Pulse', idea: 'Wide ring passes spent Spark, lights far shore', line: ['far-shore']},
  'clear-prism': {family: 'Flash', idea: 'Flash beam enters prism, leaves as two Sparks', line: ['clear-prism']},
  'flash-thread': {family: 'Flash', idea: 'Flash triangle threads Collector back, hourglass running out', line: ['flash-thread']},
  'diving-bell': {family: 'Flash ends', idea: 'Spent grey Flash triangle sends one last ring', line: ['diving-bell']},
  'toll-bell': {family: 'Rhythm', idea: 'Bell rings under three evenly spaced beat Sparks', line: ['toll-bell']},
  'pacesetter': {family: 'Rhythm', idea: 'Collector dashes over three evenly spaced beat posts', line: ['pacesetter']},
  'downbeat': {family: 'Falling Lift', idea: 'Wisp falls, then Lifts back up; Sparks pay', line: ['downbeat', 'downbeat-iii']},
  'counterweight': {family: 'Falling Lift', idea: 'Dropping brass weight hoists the Collector up fast', line: ['counterweight']},
  'double-lift': {family: 'Lift', idea: 'Wisp rises under two stacked chevrons, second free', line: ['double-lift', 'climb']},
  'home-beacon': {family: 'Save', idea: 'Save heart burns atop a beacon post, Sparks', line: ['home-beacon']},
  'growth-ring': {family: 'Clear', idea: 'Cut stump shows year rings, newest one gold', line: ['growth-ring']},
  'wind-feather': {family: 'Clear', idea: 'Pale feather rides wind streaks past the flag', line: ['wind-feather']},
  'wayfarers-purse': {family: 'Clear', idea: 'Drawstring purse of Stored Sparks beside the flag', line: ['wayfarers-purse']},
  'nest-egg': {family: 'Clear', idea: 'Woven nest of pale eggs, one gold egg', line: ['nest-egg']},
  'camp-kit': {family: 'Rest', idea: 'Rest campfire kindles a second small ember beside', line: ['camp-kit']},
  'growth-seed-common': {family: 'Rest', idea: 'Seed sprouting on soil beside the Rest campfire', line: ['growth-seed-common', 'growth-seed', 'growth-seed-legendary']},
  'prism-lens': {family: 'Any Trigger', idea: 'Faceted lens casts light over cards before it', line: ['prism-lens', 'prism-lens-ii']},
  'kindling-bead': {family: 'Any Trigger', idea: 'Ember bead lights on a string after Spark', line: ['kindling-bead', 'kindling-bead-ii', 'kindling-bead-iii']},
  'echo': {family: 'Next card', idea: 'Sound rings reach a card, echo copy behind', line: ['echo', 'echo-ii', 'echo-iii']},
  'deep-vessel': {family: 'Always on', idea: 'Spark Meter grows taller, new top segments empty', line: ['deep-vessel']},
  'tight-packing': {family: 'Always on', idea: 'Glass jar crammed with Sparks, cord tied tight', line: ['tight-packing', 'tight-packing-ii', 'tight-packing-iii']},
  'lift-guide': {family: 'Always on', idea: 'Gold arrow marks where the wisp should Lift', line: ['lift-guide']},
  'lantern-lens': {family: 'Always on', idea: 'Lantern lens throws its light ring wider out', line: ['lantern-lens']},
  'slip-feather': {family: 'Always on', idea: 'Wisp skims ground, sparks crackle, revealing ring spreads', line: ['slip-feather', 'edge-reach']},
  'tailwind': {family: 'Always on', idea: 'Needle stitches a heart; three Sparks count Collects', line: ['tailwind']},
  'springboard': {family: 'Always on', idea: 'After a Spark, wisp bounces off sprung plank', line: ['springboard']},
  'use-doubler': {family: 'Always on', idea: 'Three use pips on a card become six', line: ['use-doubler']},
  'twin-wick': {family: 'Always on', idea: 'The wisp with two Collectors sharing one orbit', line: ['twin-wick', 'twin-orbit']},
  'long-spool': {family: 'Always on', idea: 'Collector line runs past its usual reach ring', line: ['long-spool']},
  'cast-line': {family: 'Always on', idea: 'Rod casts the Collector far to a Spark', line: ['cast-line']},
  'dream': {family: 'Always on', idea: 'Wisp sleeps in a pale moon, gold path', line: ['dream']},
};
export const COMMON_IDS = Object.keys(COMMON_META);
export function commonGrid(id) { return P[id](); }
export const commonSvg = (id, opts) => toSvg(commonGrid(id), opts);
