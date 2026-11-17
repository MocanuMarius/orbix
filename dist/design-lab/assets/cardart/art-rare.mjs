// v1.0-cardart-B (Vignette), Rare and Legendary cards. Design lab only; nothing in the game imports this.
// Same toolkit and rules as ./art.mjs (48x48 letter grid, the 17-colour palette, outline #2a1d12, light
// from the top left, whole-pixel crispEdges SVG). art.mjs exports only the palette, the SVG writer and the
// approved pictures, so the drawing toolkit and the sprites are copied here cell for cell; new sprites are
// added below them. The four approved B pictures (Growth Seed, Rhythm, Resonant Harvest, Last Light) are
// taken straight from art.mjs so they stay the anchors.
import {PAL, toSvg, pictureGrid as approvedGrid} from './art.mjs';
export {PAL};

const S = 48;
const grid = (bg = 'K') => Array.from({length: S}, () => Array(S).fill(bg));
const inb = (x, y) => x >= 0 && y >= 0 && x < S && y < S;
const px = (g, x, y, ch) => { if (inb(x, y)) g[y][x] = ch; };
const rect = (g, x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(g, i, j, ch); };
const inDisc = (x, y, cx, cy, r) => (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r;
const disc = (g, cx, cy, r, ch, keep) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inDisc(x, y, cx, cy, r) && (!keep || keep(x, y))) px(g, x, y, ch); };
const ring = (g, cx, cy, r, w, ch, keep) => disc(g, cx, cy, r, ch, (x, y) => !inDisc(x, y, cx, cy, r - w) && (!keep || keep(x, y)));
const inEll = (x, y, cx, cy, rx, ry) => ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1;
const ell = (g, cx, cy, rx, ry, ch, keep) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inEll(x, y, cx, cy, rx, ry) && (!keep || keep(x, y))) px(g, x, y, ch); };
function line(g, x0, y0, x1, y1, ch) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) { px(g, x0, y0, ch); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
const stamp = (g, rows, x, y) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(g, x + i, y + j, ch); }));
const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] ?? ch).join(''));
const mirrorX = rows => rows.map(r => [...r].reverse().join(''));
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

// ── Sprites copied from art.mjs ───────────────────────────────────────────────
const SPARK16 = [
  '.......OO.......', '......ODDO......', '......OGGO......', '......OGGO......', '.....OGGGGO.....', '....OOGWWGOO....',
  '.OOOGGWWWWGGOOO.', 'ODGGWWWWWWWWGGDO', 'ODGGWWWWWWWWGGDO', '.OOOGGWWWWGGOOO.', '....OOGWWGOO....', '.....OGGGGO.....',
  '......OGGO......', '......OGGO......', '......ODDO......', '.......OO.......'];
const SPARK11 = ['.....O.....', '....ODO....', '....OGO....', '...OGWGO...', '.OOGWWWGOO.', 'ODGWWWWWGDO', '.OOGWWWGOO.', '...OGWGO...', '....OGO....', '....ODO....', '.....O.....'];
const SPARK7 = ['...O...', '..OGO..', '.OGWGO.', 'OGWWWGO', '.OGWGO.', '..OGO..', '...O...'];
const GLINT = ['.G.', 'GWG', '.G.'];
const CAMPFIRE = [
  '.......O........', '......OEO.......', '......OEEO......', '.....OEGEO......', '.....OEGGEO.....', '....OEGWGEO.....',
  '....OEGWWGEO....', '....OEGGWGEO....', '...OOOEGGEOOO...', '..OBBOOOOOOBBO..', '.OBBBBBBBBBBBBO.', '..OOBBOOOOBBOO..', '....OO....OO....'];
const SPROUT_HALF = [
  ['OOO.........', '.'], ['OmmOO.......', '.'], ['OmmmmOO.....', '.'], ['.OmmmmmOO...', '.'], ['.OMmmmmmmOO.', '.'],
  ['..OMMmmmmmmO', '.'], ['...OMMMmmmmm', 'O'], ['....OOMMMMMM', 'm'], ['......OOOOOO', 'M'], ...Array(4).fill(['...........O', 'M'])];
const SPROUT = SPROUT_HALF.map(([half, mid]) => half + mid + [...half].reverse().join(''));
const SEED = ['....OMO....', '...OEMEO...', '..OEERREO..', '.OEGRRRRRO.', 'OEGRRRRRRRO', 'OERRRRRRRRO', 'ORRRRRRRRLO', 'ORRRRRRRLLO', '.ORRRRRLLO.', '..ORRRLLO..', '...OOOOO...'];
const HEART_HALF = [
  '...OOOO....', '.OOEEEEOO..', 'OEEERRRRRO.', 'OEERRRRRRRO', 'OERRRRRRRRR', 'ORRRRRRRRRR', 'ORRRRRRRRRR', 'ORRRRRRRRRR',
  '.ORRRRRRRRR', '.ORRRRRRRRR', '..ORRRRRRRR', '...ORRRRRRR', '....ORRRRRR', '.....ORRRRR', '......ORRRR', '.......ORRR',
  '........ORR', '.........OR', '..........O'];
const HEART = HEART_HALF.map(row => {
  const right = [...row].reverse().map(ch => ch === 'E' ? 'R' : ch);
  for (let i = right.length - 1; i > 0; i--) if (right[i] === 'O' && right[i - 1] === 'R') { right[i - 1] = 'L'; break; }
  return row + right.join('');
});
const FLAME = [
  '.....O....', '....OEO...', '...OEEO...', '...OEGEO..', '..OEGGEO..', '..OEGWGEO.', '.OEGWWGEO.',
  '.OEGWWWGEO', 'OEGWWWWGEO', 'OEGWWWWGEO', 'OEGGWWGGEO', '.OEGGGGEO.', '..OEEEEO..', '...OOOO...'];

const SPARKS = {16: SPARK16, 11: SPARK11, 7: SPARK7};
function sparkAt(g, size, cx, cy, map) {
  let sp = SPARKS[size];
  if (map) sp = recolor(sp, map);
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
function glow(g, cx, cy, bands) { bands.forEach(([r, ch]) => disc(g, cx, cy, r, ch)); }
function keyline(g) {
  for (let i = 3; i < S - 3; i++) { px(g, i, 1, 'D'); px(g, i, S - 2, 'D'); px(g, 1, i, 'D'); px(g, S - 2, i, 'D'); }
  [[2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]].forEach(([x, y]) => px(g, x, y, 'G'));
}
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
function trail(g, x0, y0, x1, y1, n, ch = 'D') {
  for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1); px(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), ch); }
}
function sheaf(g, cx, base, {tall = 26} = {}) {
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
function seedSprout(g, cx, base) { stamp(g, SPROUT, cx - 12, base - 23); stamp(g, SEED, cx - 5, base - 10); }

// ── New sprites (Rare / Legendary set) ────────────────────────────────────────
// Dusk Spark: the Spark's own star drawn dark (wine body, ember core): the pickup that drains.
const DUSK = {G: 'R', W: 'E', D: 'L'};
// Echo doubles: the Spark star in two steps fainter.
// Echo doubles: ghost copies of the Spark, a gold outline round a dark body, each one fainter.
const FADE1 = {O: 'G', G: 'T', W: 'C', D: 'T'};
const FADE2 = {O: 'D', G: 'N', W: 'T', D: 'N'};
const FADE3 = {O: 'B', G: 'N', W: 'N', D: 'N'};
// Flash: the game's lightning bolt (ui/trigger-icons.mjs 'flash-pickup'), redrawn at 18 rows.
const BOLT = [
  '......OOOOOO',
  '.....OGGGGGO',
  '.....OGWGGO.',
  '....OGWGGO..',
  '....OGWGO...',
  '...OGWGGO...',
  '...OGWGOOOOO',
  '..OGWGGGGGDO',
  '..OGGGGGGDO.',
  '..OOOOOGGDO.',
  '......OGDO..',
  '.....OGDO...',
  '.....OGDO...',
  '....OGDO....',
  '....ODO.....',
  '...ODO......',
  '...OO.......'];
// A big flame (13x19) for Legendary fires, same shading as FLAME.
const BIGFLAME = [
  '......O......',
  '.....OEO.....',
  '.....OEEO....',
  '....OEEEO....',
  '....OEGEEO...',
  '...OEEGGEO...',
  '...OEGGGEEO..',
  '..OEGGWGGEO..',
  '..OEGWWWGEEO.',
  '.OEGGWWWWGEO.',
  '.OEGWWWWWGEEO',
  'OEGGWWWWWWGEO',
  'OEGWWWWWWWGEO',
  'OEGWWWWWWWGEO',
  'OEGGWWWWWGGEO',
  '.OEGGWWWGGEO.',
  '.OEEGGGGGEEO.',
  '..OOEEEEEOO..',
  '....OOOOO....'];
// A small playing card (11x15): paper, a rarity jewel in teal, two rule lines.
const CARD = [
  'OOOOOOOOOOO',
  'OYPPPPPPPPO',
  'OYPPPPPPPBO',
  'OYPPOOOPPBO',
  'OYPOTCTOPBO',
  'OYPOCcCOPBO',
  'OYPOTCTOPBO',
  'OYPPOOOPPBO',
  'OYPPPPPPPBO',
  'OYPLLLLLPBO',
  'OYPPPPPPPBO',
  'OYPLLLLPPBO',
  'OYPPPPPPPBO',
  'OBBBBBBBBBO',
  'OOOOOOOOOOO'];

// ── Scenes ────────────────────────────────────────────────────────────────────
// A crescent moon (lit on the left), so it never reads as the wisp.
function crescent(g, x, y, sky = 'K') { disc(g, x, y, 4.2, 'O'); disc(g, x, y, 3.6, 'P'); disc(g, x - 1, y - 1, 2.6, 'Y'); disc(g, x + 2, y - 1, 3.4, sky); }
// Rare: night sky, the moon top left (the light source), far teal hills (the second layer), ground.
function rareScene(g, {ground = 40, hill = 34, base = 5, amp = 3, freq = 5, ph = 1, moon = [6, 7], sky = 26, groundCh = 'L', top = 'M'} = {}) {
  rect(g, 0, sky, S, S - sky, 'N');
  if (moon) crescent(g, moon[0], moon[1]);
  for (let x = 0; x < S; x++) { const h = Math.round(base + amp * Math.sin(x / freq + ph)); rect(g, x, hill - h, 1, h, 'T'); }
  rect(g, 0, ground, S, S - ground, groundCh); rect(g, 0, ground, S, 1, top);
}
// Legendary: glints in the sky, low hills, a stepped glow behind the subject, a field. Key-line is added last.
function legScene(g, {ground = 37, hill = 27, glints = [[5, 4], [14, 9], [30, 3], [43, 7]], glowAt = null, bands = [[15, 'T'], [11, 'C']], groundCh = 'M', top = 'm', clipGlow = true} = {}) {
  rect(g, 0, 18, S, 30, 'N');
  glints.forEach(([x, y]) => stamp(g, GLINT, x, y));
  for (let x = 0; x < S; x++) { const h = Math.round(4 + 2 * Math.sin(x / 4)); rect(g, x, hill - h, 1, h, 'T'); }
  if (glowAt) glow(g, glowAt[0], glowAt[1], bands);
  rect(g, 0, ground, S, S - ground, groundCh); rect(g, 0, ground, S, 1, top);
}
const WARM = [[17, 'N'], [13, 'L'], [9, 'B']];
const COOL = [[15, 'T'], [11, 'C']];
const goldRing = (g, cx, cy, r, keep) => ring(g, cx, cy, r, 1, 'D', keep);

// ── Subject helpers ───────────────────────────────────────────────────────────
// A cast bell. cx = centre column (the bell spans cx-half .. cx+half-1), top = crown row, h = body height.
function bell(g, cx, top, h, {body = 'G', hi = 'W', hi2 = 'Y', shade = 'D', lip = 'D', clap = 'B'} = {}) {
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
// A glass prism (triangle). apex row `top`, base row `top+h-1`, centred on cx.
function prismTri(g, cx, top, h) {
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
// A cut crystal (diamond), cx centre, cy middle row.
function crystal(g, cx, cy, hw, hh) {
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
// The open hairpin of a crescendo: two thick gold strokes from a point opening to the right.
function hairpin(g, x0, y0, x1, yTop, yBot) {
  shape(g, l => {
    line(l, x0, y0, x1, yTop, 'G'); line(l, x0, y0 + 1, x1, yTop + 1, 'Y');
    line(l, x0, y0, x1, yBot, 'D'); line(l, x0, y0 + 1, x1, yBot + 1, 'D');
  });
}
// A bead on a cord.
// A sun: gold disc with outlined spokes (eight long, eight short), so it never reads as the pale wisp.
function sun(g, cx, cy, r, len) {
  shape(g, l => {
    for (let a = 0; a < 16; a++) {
      const t = a * Math.PI / 8, n = a % 2 ? Math.max(1, len - 2) : len;
      for (let k = r + 2; k <= r + 1 + n; k++) px(l, Math.round(cx - .5 + Math.cos(t) * k), Math.round(cy - .5 + Math.sin(t) * k), a % 2 ? 'D' : 'G');
    }
  });
  disc(g, cx, cy, r + 1, 'O'); disc(g, cx, cy, r, 'E'); disc(g, cx - .6, cy - .6, r - 1.2, 'D'); disc(g, cx - 1.2, cy - 1.2, r - 2.4, 'G');
  disc(g, cx - r * .3, cy - r * .3, r * .38, 'Y'); disc(g, cx - r * .4, cy - r * .4, Math.max(1, r * .16), 'W');
}
// A bead threaded on a cord: a wide oval with a dark hole showing the cord at both ends.
function bead(g, cx, cy, rx, ry, {rim = 'D', body = 'G', core = 'Y', hot = 'W'} = {}) {
  ell(g, cx, cy, rx + 1, ry + 1, 'O'); ell(g, cx, cy, rx, ry, rim); ell(g, cx - .7, cy - .7, rx - 1.2, ry - 1.2, body);
  ell(g, cx - 1.6, cy - 1.6, rx * .5, ry * .45, core); px(g, Math.round(cx - rx * .5), Math.round(cy - ry * .55), hot); px(g, Math.round(cx - rx * .5) + 1, Math.round(cy - ry * .55), hot);
  rect(g, Math.round(cx) - 1, Math.round(cy) - 1, 2, 2, 'O');
}
function cord(g, x0, y0, x1, y1) { line(g, x0, y0 - 1, x1, y1 - 1, 'O'); line(g, x0, y0, x1, y1, 'B'); line(g, x0, y0 + 1, x1, y1 + 1, 'L'); line(g, x0, y0 + 2, x1, y1 + 2, 'O'); }

// ── Pictures ──────────────────────────────────────────────────────────────────
const P = {};
// Anchors: the approved B pictures, unchanged.
P['growth-seed'] = () => approvedGrid('growth-seed', 'B');
P['rhythm'] = () => approvedGrid('rhythm', 'B');
P['harvest-legendary'] = () => approvedGrid('harvest-legendary', 'B');
P['last-light'] = () => approvedGrid('last-light', 'B');

// ─ Boost: multiply ─
// Crescendo (R): an opening hairpin; a small Spark at its point grows into two big ones at its mouth.
P['crescendo'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  hairpin(g, 5, 27, 42, 11, 41);
  sparkAt(g, 7, 12, 27);
  sparkAt(g, 11, 33, 21); sparkAt(g, 11, 33, 33);
  return g; };
// Prism Lens II (L): one Spark goes into a glass prism, three come out.
P['prism-lens-ii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [22, 25], bands: COOL, ground: 39});
  line(g, 7, 27, 15, 27, 'G'); line(g, 7, 28, 15, 28, 'D');
  [[29, 21, 37, 13], [30, 26, 37, 26], [29, 31, 37, 38]].forEach(([a, b, c, d]) => { line(g, a, b, c, d, 'G'); line(g, a, b + 1, c, d + 1, 'D'); });
  prismTri(g, 22, 12, 23);
  sparkAt(g, 7, 6, 27);
  sparkAt(g, 11, 40, 11); sparkAt(g, 11, 40, 26); sparkAt(g, 11, 40, 40);
  keyline(g);
  return g; };
// Closing Chord (R): a row of bells on a beam; the last and biggest is struck and rings out Sparks.
P['closing-chord'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37});
  shape(g, l => { rect(l, 3, 6, 42, 3, 'B'); rect(l, 3, 6, 42, 1, 'P'); rect(l, 3, 8, 42, 1, 'L'); });
  shape(g, l => { rect(l, 4, 9, 2, 34, 'B'); rect(l, 4, 9, 1, 34, 'P'); });
  [[11, 10, 8], [18, 10, 9]].forEach(([x, y, h]) => { line(g, x - 1, 9, x - 1, y - 1, 'L'); bell(g, x, y + 1, h, {body: 'B', hi: 'D', hi2: 'D', shade: 'L', lip: 'L', clap: 'L'}); });
  line(g, 32, 9, 32, 11, 'D');
  bell(g, 33, 13, 20);
  ring(g, 33, 26, 16, 1, 'G', (x, y) => x > 43 && y > 14 && y < 38);
  ring(g, 33, 26, 16, 1, 'G', (x, y) => x < 23 && x > 19 && y > 18 && y < 36);
  sparkAt(g, 7, 22, 30); sparkAt(g, 7, 43, 38);
  return g; };
// Second Sun (L): two suns rise together over the field, the ground shining twice.
P['second-sun'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 32], bands: [[22, 'N'], [17, 'T']], ground: 36, glints: [[4, 4], [20, 3]]});
  sun(g, 35, 13, 5.5, 3);
  sun(g, 19, 36, 10, 5);
  rect(g, 0, 36, S, 12, 'M'); rect(g, 0, 36, S, 1, 'm');
  rect(g, 8, 37, 22, 1, 'G'); rect(g, 10, 39, 18, 1, 'D'); rect(g, 13, 41, 12, 1, 'D'); rect(g, 16, 43, 6, 1, 'D');
  rect(g, 31, 37, 9, 1, 'D'); rect(g, 33, 39, 5, 1, 'D');
  keyline(g);
  return g; };
// Ripple Glass (R): a magnifying glass over a Pulse; inside the lens the Spark it crosses is doubled.
P['ripple-glass'] = () => { const g = grid('K');
  rareScene(g, {ground: 42, hill: 35});
  [9, 15, 21].forEach(r => ring(g, 4, 40, r, 1, 'C', (x, y) => y < 42));
  shape(g, l => { line(l, 36, 33, 43, 41, 'L'); line(l, 37, 33, 44, 41, 'B'); line(l, 36, 34, 43, 42, 'L'); });
  disc(g, 28, 24, 12, 'O'); disc(g, 28, 24, 11, 'D'); disc(g, 28, 24, 11, 'G', (x, y) => x + y < 51);
  disc(g, 28, 24, 9, 'O'); disc(g, 28, 24, 8, 'T'); disc(g, 27, 23, 6, 'T');
  ring(g, 4, 40, 27, 1, 'c', (x, y) => inDisc(x, y, 28, 24, 8));
  px(g, 23, 18, 'W'); px(g, 22, 19, 'W'); px(g, 22, 20, 'c');
  sparkAt(g, 7, 25, 23); sparkAt(g, 7, 32, 28);
  sparkAt(g, 7, 12, 31);
  return g; };
// Glide Prism (R): the wisp's falling Lift dips through a cut crystal and comes out doubled.
P['glide-prism'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  trail(g, 13, 6, 21, 24, 7, 'P'); trail(g, 14, 6, 22, 24, 7, 'Y'); trail(g, 28, 24, 35, 14, 5, 'G'); trail(g, 29, 24, 36, 14, 5, 'D');
  crystal(g, 24, 31, 8, 9);
  wisp(g, 39, 10, 5);
  sparkAt(g, 7, 35, 24); sparkAt(g, 7, 41, 30);
  return g; };
// Kindling Bead II (R): a gold bead on the cord kindles the next bead; it flares and pops two Sparks.
P['kindling-bead-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  cord(g, 0, 30, 47, 34);
  bead(g, 12, 31, 5, 5);
  bead(g, 31, 33, 6, 6, {rim: 'R', body: 'E', core: 'G', hot: 'W'});
  stamp(g, FLAME, 27, 14);
  trail(g, 19, 26, 24, 23, 3, 'G');
  sparkAt(g, 7, 22, 12); sparkAt(g, 7, 42, 16);
  return g; };
// Kindling Bead III (L): the same kindling, bigger flame in a warm glow, four Sparks.
P['kindling-bead-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [31, 24], bands: WARM, ground: 41});
  cord(g, 0, 31, 47, 35);
  bead(g, 11, 32, 5, 5);
  bead(g, 31, 34, 7, 7, {rim: 'R', body: 'E', core: 'G', hot: 'W'});
  stamp(g, BIGFLAME, 25, 11);
  trail(g, 18, 27, 23, 25, 3, 'G');
  sparkAt(g, 7, 20, 11); sparkAt(g, 7, 42, 13); sparkAt(g, 7, 14, 20); sparkAt(g, 7, 41, 23);
  keyline(g);
  return g; };

// ─ Repeat ─
// Echo II (R): the bright Spark and two fainter, smaller doubles trailing behind it.
P['echo-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 41, hill: 35});
  sparkAt(g, 11, 38, 25, FADE2);
  sparkAt(g, 16, 27, 25, FADE1);
  sparkAt(g, 16, 13, 25);
  rect(g, 8, 42, 12, 1, 'B'); rect(g, 22, 42, 10, 1, 'L');
  return g; };
// Echo III (L): the same, three doubles, in a glow.
P['echo-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [12, 24], bands: COOL, ground: 39});
  sparkAt(g, 7, 41, 24, FADE3);
  sparkAt(g, 11, 33, 24, FADE2);
  sparkAt(g, 16, 23, 24, FADE1);
  sparkAt(g, 16, 11, 24);
  rect(g, 5, 40, 13, 1, 'G'); rect(g, 18, 40, 10, 1, 'D');
  keyline(g);
  return g; };
// Refrain (L): a looping gold arrow carries the Spark round to fire once more.
P['refrain'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 23], bands: COOL, ground: 39});
  const cx = 24, cy = 23, r = 14;
  const ang = (x, y) => { let a = Math.atan2(y + .5 - cy, x + .5 - cx) * 180 / Math.PI; return a; };
  shape(g, l => {
    ring(l, cx, cy, r, 3, 'G', (x, y) => { const a = ang(x, y); return !(a > -78 && a < -22); });
    ring(l, cx, cy, r - 2, 1, 'D', (x, y) => { const a = ang(x, y); return !(a > -78 && a < -22) && (x + y > 47); });
    ring(l, cx, cy, r, 1, 'Y', (x, y) => { const a = ang(x, y); return !(a > -78 && a < -22) && (x + y < 44); });
    for (let i = 0; i < 6; i++) rect(l, 28 + i, 10 - (5 - i), 1, (5 - i) * 2 + 1, i < 2 ? 'Y' : 'G');
  });
  sparkAt(g, 16, 24, 23);
  keyline(g);
  return g; };
// Chameleon (R): a chameleon on a branch, its front half turning Spark-gold toward the Spark it copies.
P['chameleon'] = () => { const g = grid('K');
  rareScene(g, {ground: 44, hill: 37});
  shape(g, l => { line(l, 0, 38, 47, 32, 'B'); line(l, 0, 37, 47, 31, 'P'); line(l, 0, 39, 47, 33, 'L'); line(l, 0, 40, 47, 34, 'L'); });
  const SPLIT = 23;
  shape(g, l => {
    ring(l, 9, 33, 4.6, 2, 'M'); px(l, 9, 33, 'M');
    rect(l, 12, 27, 3, 5, 'M');
    ell(l, 22, 26, 10, 6, 'M'); ell(l, 21, 24, 8, 3, 'm');
    for (let x = 14; x < 31; x += 3) px(l, x, 20 + Math.round(Math.abs(x - 22) / 4), 'm');
    ell(l, 33, 25, 5.5, 4.5, 'M'); ell(l, 32, 24, 4, 2.5, 'm');
    rect(l, 16, 31, 2, 4, 'M'); rect(l, 26, 31, 2, 3, 'M');
  });
  for (let y = 0; y < S; y++) for (let x = SPLIT; x < S; x++) { if (g[y][x] === 'M') g[y][x] = 'D'; else if (g[y][x] === 'm') g[y][x] = 'G'; }
  [[SPLIT - 2, 22], [SPLIT - 2, 26], [SPLIT - 1, 29]].forEach(([x, y]) => { px(g, x, y, 'G'); });
  disc(g, 34, 24, 2.4, 'O'); disc(g, 34, 24, 1.6, 'Y'); px(g, 34, 24, 'O');
  line(g, 35, 28, 38, 27, 'O');
  trail(g, 39, 19, 38, 23, 3, 'G');
  sparkAt(g, 11, 41, 13);
  return g; };
// Mirror Grain (R): a hand mirror gives back the Spark held up to it.
P['mirror-grain'] = () => { const g = grid('K');
  rareScene(g, {ground: 42, hill: 35});
  shape(g, l => { rect(l, 30, 30, 3, 11, 'B'); rect(l, 30, 30, 1, 11, 'P'); rect(l, 25, 40, 13, 2, 'L'); rect(l, 25, 40, 13, 1, 'B'); });
  ell(g, 31.5, 19, 10, 12.5, 'O'); ell(g, 31.5, 19, 9, 11.5, 'D'); ell(g, 31.5, 19, 9, 11.5, 'G', (x, y) => x + y < 50);
  ell(g, 31.5, 19, 7, 9.5, 'O'); ell(g, 31.5, 19, 6, 8.5, 'T');
  line(g, 27, 13, 29, 11, 'c'); line(g, 27, 15, 30, 12, 'c');
  sparkAt(g, 11, 32, 21, FADE1);
  sparkAt(g, 11, 11, 21);
  trail(g, 17, 18, 22, 18, 3, 'G');
  return g; };
// ─ Collect ─
function candle(g, cx, top, h, w) {
  shape(g, l => {
    rect(l, cx - (w >> 1), top, w, h, 'P');
    rect(l, cx - (w >> 1), top, 1, h, 'Y'); rect(l, cx - (w >> 1) + 1, top, 1, h, 'W');
    rect(l, cx + (w >> 1) - 2, top, 2, h, 'B');
    rect(l, cx - (w >> 1) + 2, top + 1, 2, 4, 'Y'); rect(l, cx + 1, top + 1, 2, 2, 'Y');
  });
  shape(g, l => { rect(l, cx - (w >> 1) - 3, top + h, w + 6, 2, 'B'); rect(l, cx - (w >> 1) - 3, top + h, w + 6, 1, 'D'); rect(l, cx - (w >> 1) - 1, top + h + 2, w + 2, 1, 'L'); });
  line(g, cx - 1, top - 1, cx - 1, top - 3, 'O');
}
// Dusk Wick II (R): a candle whose flame feeds on a dark Dusk Spark and throws off gold.
P['dusk-wick-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  candle(g, 25, 24, 16, 10);
  stamp(g, FLAME, 20, 8);
  sparkAt(g, 11, 9, 21, DUSK);
  trail(g, 14, 18, 18, 16, 3, 'R');
  sparkAt(g, 7, 38, 9); sparkAt(g, 7, 41, 19);
  return g; };
// Dusk Wick III (L): a taller candle blazing on the Dusk Spark in a warm glow, gold all round.
P['dusk-wick-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [25, 17], bands: WARM, ground: 42});
  candle(g, 25, 22, 18, 12);
  stamp(g, BIGFLAME, 18, 3);
  sparkAt(g, 11, 9, 24, DUSK);
  trail(g, 14, 20, 18, 17, 3, 'R');
  sparkAt(g, 7, 38, 7); sparkAt(g, 7, 41, 17); sparkAt(g, 7, 39, 27); sparkAt(g, 7, 11, 9);
  keyline(g);
  return g; };
// ─ Stored ─
function jar(g, cx, top, w, h, lidW, {strap = false} = {}) {
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
// Tight Packing II (R): a glass jar crammed with three Sparks, its lid bulging.
P['tight-packing-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 42, hill: 35});
  jar(g, 24, 17, 22, 25, 18);
  sparkAt(g, 11, 19, 25); sparkAt(g, 11, 29, 27); sparkAt(g, 11, 22, 35);
  sparkAt(g, 7, 30, 36);
  rect(g, 12, 42, 24, 1, 'O');
  return g; };
// Tight Packing III (L): a bigger jar bursting with Sparks, the lid strapped down, in a warm glow.
P['tight-packing-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 26], bands: WARM, ground: 41});
  jar(g, 24, 14, 26, 27, 22, {strap: true});
  sparkAt(g, 11, 18, 21); sparkAt(g, 11, 29, 21); sparkAt(g, 11, 23, 30); sparkAt(g, 11, 31, 33);
  sparkAt(g, 7, 17, 34); sparkAt(g, 7, 30, 13); sparkAt(g, 7, 12, 10); sparkAt(g, 7, 39, 9);
  keyline(g);
  return g; };

// ─ Collector ─
// Courier Tip III (L): the Collector delivers its Spark and five tip Sparks fan out, in a glow.
P['courier-tip-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [20, 25], bands: [[17, 'N'], [13, 'T']], ground: 40});
  [[1, 21, 6], [3, 26, 7], [1, 31, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 17, 26, 8);
  sparkAt(g, 16, 31, 23);
  [[24, 8], [32, 5], [40, 9], [43, 18], [42, 30]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  rect(g, 10, 42, 16, 1, 'O');
  keyline(g);
  return g; };
function chest(g, x, y, w = 18) {
  shape(g, l => {
    rect(l, x + 1, y, w - 2, 1, 'D'); rect(l, x, y + 1, w, 4, 'B'); rect(l, x, y + 1, w, 1, 'D');
    rect(l, x, y + 5, w, 1, 'O');
    rect(l, x, y + 6, w, 8, 'L'); rect(l, x, y + 6, w, 1, 'B'); rect(l, x, y + 9, w, 1, 'B');
    rect(l, x + 2, y, 2, 14, 'O'); rect(l, x + w - 4, y, 2, 14, 'O');
  });
  stamp(g, SPARK7, x + (w >> 1) - 3, y + 2);
}
// Cache Handling (R): the Collector carries a Spark chest home on its line.
P['cache-handling'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  line(g, 29, 16, 20, 24, 'P'); line(g, 30, 17, 21, 25, 'O');
  collector(g, 34, 12, 7);
  [[42, 20, 4], [44, 24, 3]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'T'));
  chest(g, 7, 24, 20);
  rect(g, 9, 44, 16, 1, 'O');
  return g; };
// Twin Orbit (R): two Collectors circle the wisp on one shared orbit.
P['twin-orbit'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37});
  ell(g, 24, 25, 19, 8.5, 'C', (x, y) => !inEll(x, y, 24, 25, 18, 7.5) && y >= 25);
  ell(g, 24, 25, 19, 8.5, 'T', (x, y) => !inEll(x, y, 24, 25, 18, 7.5) && y < 25);
  wisp(g, 24, 24, 7);
  ell(g, 24, 25, 19, 8.5, 'C', (x, y) => !inEll(x, y, 24, 25, 18, 7.5) && y >= 27 && Math.abs(x - 24) < 10);
  collector(g, 8, 29, 5); collector(g, 40, 20, 5);
  trail(g, 14, 33, 18, 33, 3, 'c'); trail(g, 34, 17, 30, 17, 3, 'c');
  return g; };
// Watchlight (R): the Collector catches the falling wisp just above the rocks and rings out a Pulse.
P['watchlight'] = () => { const g = grid('K');
  rareScene(g, {ground: 46, hill: 33});
  [[22, 9, 4], [26, 6, 3], [30, 8, 2]].forEach(([x, y, h]) => rect(g, x, y, 1, h, 'P'));
  [14, 19].forEach((r, i) => ring(g, 24, 29, r, 1, i ? 'T' : 'c', (x, y) => y < 36 && y > 20 && Math.abs(x + .5 - 24) > 9));
  shape(g, l => {
    [[0, 9], [8, 13], [17, 8], [27, 12], [36, 9], [44, 11]].forEach(([x0, h]) => {
      for (let i = 0; i < h; i++) { const half = Math.round(i * .55); rect(l, x0 + 4 - half, 47 - h + i, half * 2 + 1, 1, 'L'); px(l, x0 + 4 - half, 47 - h + i, 'B'); }
    });
  });
  wisp(g, 24, 16, 6);
  collector(g, 24, 30, 7);
  return g; };
// ─ Overfill ─
// A full Spark meter spilling at the top: a Spark bursting out and gold drops running down.
function spillMeter(g, x, y, h, {drops = 2} = {}) {
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
  sparkAt(g, 11, x + w / 2, y - 8);
}
function spring(g, x, base, w, top, coils) {
  shape(g, l => { rect(l, x, base - 1, w, 2, 'L'); rect(l, x, base - 1, w, 1, 'B'); });
  const step = (base - 2 - (top + 2)) / (coils * 2);
  for (let i = 0; i < coils * 2; i++) {
    const y0 = Math.round(base - 2 - i * step), y1 = Math.round(base - 2 - (i + 1) * step);
    const [a, b] = i % 2 ? [x + w - 3, x + 2] : [x + 2, x + w - 3];
    line(g, a, y0, b, y1, 'O'); line(g, a, y0 - 1, b, y1 - 1, i % 2 ? 'D' : 'G');
  }
  shape(g, l => { rect(l, x, top, w, 2, 'B'); rect(l, x, top, w, 1, 'D'); });
}
// Ring Spring (R): the meter overfills, and a spring flings the Collector back into play.
P['ring-spring'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  spillMeter(g, 35, 16, 27);
  spring(g, 9, 43, 18, 32, 2);
  [[14, 25], [18, 24], [22, 25]].forEach(([x, y]) => rect(g, x, y, 1, 3, 'c'));
  collector(g, 18, 16, 7);
  return g; };
// Ring Spring II (L): the same, a taller double spring flinging the Collector high, in a glow.
P['ring-spring-ii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [17, 13], bands: WARM, ground: 42, glints: [[5, 4], [28, 3], [43, 30]]});
  spillMeter(g, 35, 16, 27, {drops: 2});
  sparkAt(g, 7, 29, 8);
  spring(g, 8, 43, 18, 28, 3);
  [[13, 20], [17, 19], [21, 20]].forEach(([x, y]) => rect(g, x, y, 1, 4, 'c'));
  collector(g, 17, 11, 7);
  keyline(g);
  return g; };
// ─ Flash ─
// Flash Handling (R): the Collector carries a lightning Flash; its light bursts out and pushes the dark back.
P['flash-handling'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37, moon: null});
  glow(g, 30, 16, [[13, 'N'], [10, 'L']]);
  rays(g, 30, 16, 11, 16, 'G');
  stamp(g, BOLT, 24, 7);
  line(g, 25, 24, 19, 29, 'P'); line(g, 26, 24, 20, 29, 'O');
  collector(g, 14, 32, 7);
  [[3, 30, 4], [1, 34, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'T'));
  return g; };
// A Spark meter showing how full it is (frac of its height, from the bottom).
function levelMeter(g, x, y, w, h, frac) {
  shape(g, l => rect(l, x, y, w, h, 'L'));
  rect(g, x + 1, y + 1, w - 2, h - 2, 'K');
  const fh = Math.round((h - 2) * frac), fy = y + h - 1 - fh;
  rect(g, x + 1, fy, w - 2, fh, 'G'); rect(g, x + 1, fy, 1, fh, 'Y'); rect(g, x + w - 2, fy, 1, fh, 'D'); rect(g, x + 1, fy, w - 2, 1, 'W');
  for (let j = y + 5; j < y + h - 2; j += 5) rect(g, x + 1, j, w - 2, 1, 'O');
  for (let j = 1; j < 3; j++) rect(g, x + w, y + Math.round(h * j / 3), 2, 1, 'O');
}
// Flash Bank (R): a lightning Flash strikes a nearly empty meter and fills it with Sparks.
P['flash-bank'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  levelMeter(g, 15, 14, 11, 29, 1 / 3.5);
  rays(g, 21, 13, 4, 7, 'G');
  stamp(g, BOLT, 19, -3);
  sparkAt(g, 7, 8, 22); sparkAt(g, 7, 34, 25); sparkAt(g, 7, 37, 34);
  return g; };

// ─ Pulse ─
// Resonant Harvest (R): the bound sheaf in a moonlit field, one Pulse ring passing over two Sparks.
P['harvest-rare'] = () => { const g = grid('K');
  rareScene(g, {ground: 38, hill: 31, groundCh: 'M', top: 'm'});
  for (let x = 1; x < S; x += 4) px(g, x, 37, 'D');
  ring(g, 24, 30, 19, 1, 'C', (x, y) => y < 38);
  sheaf(g, 24, 43, {tall: 27});
  sparkAt(g, 7, 7, 22); sparkAt(g, 7, 41, 22);
  return g; };
// The spill: a pool on the ground with flat ripple rings (a Pulse spreading on water).
const ellRing = (g, cx, cy, rx, ry, ch) => ell(g, cx, cy, rx, ry, ch, (x, y) => !inEll(x, y, cx, cy, rx - 1, ry - 1));
function pool(g, cx, cy, rx, ry, rings) {
  ell(g, cx, cy, rx + 1, ry + 1, 'O'); ell(g, cx, cy, rx, ry, 'N'); ell(g, cx, cy - .5, rx - 1, ry - 1, 'T');
  rings.forEach(([r, ch]) => ellRing(g, cx, cy, r, r * ry / rx, ch));
  rect(g, Math.round(cx) - 1, Math.round(cy) - 1, 2, 1, 'W');
}
function spillStream(g, x0, y0, x1, y1) {
  for (let t = 0; t <= 1.0001; t += 1 / 24) { const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t * t); px(g, x, y, 'G'); px(g, x, y + 1, 'D'); }
}
// Spillway (R): the meter spills into a pool; one drop in two rings out a Pulse.
P['spillway'] = () => { const g = grid('K');
  rareScene(g, {ground: 37, hill: 31});
  pool(g, 17, 41, 15, 5, [[9, 'C']]);
  spillMeter(g, 35, 15, 28, {drops: 1});
  spillStream(g, 33, 13, 18, 38);
  [[25, 18, 'G'], [20, 27, 'W']].forEach(([x, y, ch]) => { rect(g, x, y, 2, 3, 'O'); rect(g, x, y, 1, 2, ch); });
  return g; };
// Spillway II (L): every drop rings: three ripples spreading wide, in a glow.
P['spillway-ii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [18, 34], bands: COOL, ground: 36, glints: [[5, 4], [16, 9], [27, 3]]});
  pool(g, 18, 41, 16, 5.5, [[6, 'c'], [10, 'C'], [14, 'c']]);
  spillMeter(g, 35, 15, 28, {drops: 2});
  spillStream(g, 33, 13, 19, 38);
  [[26, 18], [21, 27]].forEach(([x, y]) => { rect(g, x, y, 2, 3, 'O'); rect(g, x, y, 1, 2, 'W'); });
  keyline(g);
  return g; };
// Edge Reach (R): the wisp skims low over the ground; its Pulse reaches half as far again.
P['edge-reach'] = () => { const g = grid('K');
  rareScene(g, {ground: 42, hill: 33});
  ring(g, 15, 37, 13, 1, 'c', (x, y) => y < 42 && (x + y) % 3 === 0);
  ring(g, 15, 37, 25, 2, 'C', (x, y) => y < 42);
  shape(g, l => { for (let i = 0; i < 4; i++) rect(l, 38 + i, 14 + i, 1, 7 - i * 2, 'c'); });
  [[2, 35, 4], [1, 38, 3]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'P'));
  wisp(g, 14, 36, 5);
  rect(g, 9, 42, 11, 1, 'O');
  return g; };
// ─ Lift ─
function chevron(g, cx, y, ch, hi) {
  shape(g, l => { for (let i = 0; i < 5; i++) { rect(l, cx - 1 - i * 1.4 | 0, y + i, 2, 2, ch); rect(l, (cx + i * 1.4) | 0, y + i, 2, 2, ch); px(l, cx - 1 - i * 1.4 | 0, y + i, hi); } });
}
// Climb (R): three quick Lifts stack up under the wisp; the third rings a Pulse.
P['climb'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37});
  ring(g, 29, 11, 10, 1, 'C', (x, y) => y < 22);
  chevron(g, 29, 35, 'L', 'B'); chevron(g, 29, 28, 'D', 'G'); chevron(g, 29, 21, 'G', 'W');
  wisp(g, 29, 11, 6);
  return g; };
// Downbeat III (L): the wisp falls, Lifts at the bottom of the dip, and five Sparks burst round it.
P['downbeat-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [21, 30], bands: COOL, ground: 41, glints: [[30, 3], [43, 7]]});
  for (let t = 0; t <= 1.0001; t += 1 / 10) { const x = Math.round(4 + t * 10), y = Math.round(5 + t * t * 0 + t * 18); rect(g, x, y, 2, 1, t < .5 ? 'P' : 'Y'); }
  [[17, 38, 4], [21, 39, 5], [25, 38, 4]].forEach(([x, y, h]) => rect(g, x, y, 1, h, 'W'));
  wisp(g, 21, 29, 7);
  [[33, 9], [40, 17], [42, 28], [37, 37], [27, 13]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  keyline(g);
  return g; };
// ─ Rest ─
// Growth Seed (L): the sapling by the campfire towers past the top of its stake, in a warm glow.
P['growth-seed-legendary'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 21], bands: [[18, 'N'], [14, 'T']], ground: 36, groundCh: 'L', top: 'M', glints: [[4, 3], [15, 6], [30, 2]]});
  rect(g, 0, 37, 26, 3, 'B'); rect(g, 0, 37, 15, 1, 'D');
  stamp(g, CAMPFIRE, -2, 25);
  shape(g, l => rect(l, 39, 12, 4, 28, 'B')); rect(g, 39, 12, 1, 28, 'P');
  [18, 24, 30, 36].forEach(y => rect(g, 39, y, 3, 1, 'O'));
  shape(g, l => rect(l, 37, 14, 8, 2, 'D'));
  shape(g, l => rect(l, 37, 5, 8, 2, 'G'));
  stamp(g, SPROUT, 12, 7); stamp(g, SPROUT, 12, 19);
  stamp(g, SEED, 19, 32);
  keyline(g);
  return g; };
// ─ Eater ─
const HEART9 = ['.OOO.OOO.', 'OEERORRRO', 'OERRRRRLO', 'ORRRRRRLO', '.ORRRRLO.', '..ORRLO..', '...OLO...', '....O....'];
// Devourer (R): great jaws bite down on a Rare card, and a heart comes free.
P['devourer'] = () => { const g = grid('K');
  rareScene(g, {ground: 44, hill: 37});
  const top = x => Math.round(4 + (x / 31) ** 2 * 9), lipU = x => Math.round(17 + x * .16), lipL = x => Math.round(34 - x * .12), bot = x => Math.round(44 - (x / 31) ** 2 * 7);
  for (let x = 0; x <= 30; x++) rect(g, x, lipU(x), 1, lipL(x) - lipU(x), x < 8 ? 'K' : 'R');
  stamp(g, CARD, 27, 18);
  shape(g, l => {
    for (let x = 0; x <= 31; x++) { rect(l, x, top(x), 1, lipU(x) - top(x), 'R'); px(l, x, top(x), 'E'); px(l, x, top(x) + 1, 'E'); }
    for (let x = 0; x <= 31; x++) { rect(l, x, lipL(x), 1, bot(x) - lipL(x), 'R'); px(l, x, bot(x) - 1, 'L'); }
  });
  for (let x = 3; x < 30; x += 6) { const u = lipU(x), d = lipL(x); stamp(g, ['OWWO', '.OPO', '.OO.'], x, u); stamp(g, ['.OO.', '.OYO', 'OWWO'], x, d - 3); }
  disc(g, 9, 11, 2.6, 'O'); disc(g, 9, 11, 1.8, 'G'); px(g, 8, 10, 'W');
  stamp(g, HEART9, 37, 6);
  trail(g, 38, 16, 36, 19, 2, 'E');
  return g; };
// Ember Feeder (R): a little stove eats two cards; a Spark rises from it with an up arrow (+1 max).
P['ember-feeder'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  shape(g, l => { rect(l, 20, 6, 5, 14, 'L'); rect(l, 20, 6, 1, 14, 'B'); });
  shape(g, l => {
    ell(l, 22, 30, 11, 10, 'L'); ell(l, 21, 28, 8, 6, 'B', (x, y) => x < 21); rect(l, 11, 39, 23, 2, 'L');
    rect(l, 13, 40, 3, 3, 'L'); rect(l, 28, 40, 3, 3, 'L'); rect(l, 10, 21, 25, 2, 'B');
  });
  shape(g, l => { rect(l, 16, 27, 12, 8, 'E'); rect(l, 17, 30, 10, 5, 'G'); rect(l, 19, 32, 5, 3, 'W'); });
  stamp(g, recolor(CARD, {}), 36, 22); stamp(g, CARD, 30, 28);
  sparkAt(g, 7, 22, 2 + 0);
  shape(g, l => { for (let i = 0; i < 4; i++) rect(l, 30 - i, 4 + i, 1 + i * 2, 1, 'G'); rect(l, 29, 8, 3, 6, 'G'); });
  return g; };

// Family (sheet grouping) and the picture idea in about 8 words, for manifest-rare.json.
export const FAMILIES = ['Boost', 'Repeat', 'Collect', 'Collector', 'Overfill', 'Flash', 'Pulse', 'Lift', 'Rest & Save', 'Stored', 'Eater'];
export const META = {
  'crescendo': {family: 'Boost', idea: 'Opening hairpin: one small Spark grows into two'},
  'prism-lens-ii': {family: 'Boost', idea: 'Glass prism splits one Spark into three Sparks'},
  'closing-chord': {family: 'Boost', idea: 'Row of bells; the last, biggest bell rings'},
  'second-sun': {family: 'Boost', idea: 'Two suns rise together over a shining field'},
  'ripple-glass': {family: 'Boost', idea: 'Magnifying glass over Pulse rings doubles the Spark'},
  'glide-prism': {family: 'Boost', idea: 'Falling-Lift dip passes through crystal, Sparks doubled'},
  'kindling-bead-ii': {family: 'Boost', idea: 'Gold bead kindles next bead; it pops two Sparks'},
  'kindling-bead-iii': {family: 'Boost', idea: 'Kindled bead flares big in glow, four Sparks'},
  'echo-ii': {family: 'Repeat', idea: 'Bright Spark followed by two fading echo copies'},
  'echo-iii': {family: 'Repeat', idea: 'Bright Spark followed by three fading echo copies'},
  'refrain': {family: 'Repeat', idea: 'Looping arrow carries the Spark round once more'},
  'chameleon': {family: 'Repeat', idea: 'Chameleon on branch turning Spark-gold toward a Spark'},
  'mirror-grain': {family: 'Repeat', idea: 'Hand mirror reflects a Spark, giving it again'},
  'dusk-wick-ii': {family: 'Collect', idea: 'Candle flame feeds on a dark Dusk Spark'},
  'dusk-wick-iii': {family: 'Collect', idea: 'Tall candle blazes on Dusk Spark, glowing, many Sparks'},
  'courier-tip-iii': {family: 'Collector', idea: 'Collector delivers a Spark, five tip Sparks fanning'},
  'cache-handling': {family: 'Collector', idea: 'Collector carries a Spark chest home on a line'},
  'twin-orbit': {family: 'Collector', idea: 'Two Collectors orbit the wisp on one ring'},
  'watchlight': {family: 'Collector', idea: 'Collector cushions the falling wisp above sharp rocks'},
  'ring-spring': {family: 'Overfill', idea: 'Spilling meter beside a spring launching the Collector'},
  'ring-spring-ii': {family: 'Overfill', idea: 'Spilling meter, double spring flings Collector high, glowing'},
  'spillway': {family: 'Overfill', idea: 'Meter spills into a pool; one ripple rings out'},
  'spillway-ii': {family: 'Overfill', idea: 'Meter spills into a glowing pool; three ripples'},
  'flash-handling': {family: 'Flash', idea: 'Collector carries a lightning Flash, light bursting out'},
  'flash-bank': {family: 'Flash', idea: 'Lightning Flash strikes a nearly empty Spark meter'},
  'harvest-rare': {family: 'Pulse', idea: 'Golden sheaf in moonlit field, Pulse ring passing'},
  'harvest-legendary': {family: 'Pulse', idea: 'Struck sheaf in glowing field rings Sparks outward'},
  'rhythm': {family: 'Pulse', idea: 'Metronome on night hill, three even Spark beats'},
  'edge-reach': {family: 'Pulse', idea: 'Wisp skims the ground; a wide Pulse reaches far'},
  'climb': {family: 'Lift', idea: 'Wisp rises three steps; a Pulse at the top'},
  'downbeat-iii': {family: 'Lift', idea: 'Wisp falls, Lifts at bottom, five Sparks burst'},
  'growth-seed': {family: 'Rest & Save', idea: 'Sprout by campfire outgrows the stake notch'},
  'growth-seed-legendary': {family: 'Rest & Save', idea: 'Tall sapling by campfire towers past stake, glowing'},
  'last-light': {family: 'Rest & Save', idea: 'Small flame held in the Save heart'},
  'tight-packing-ii': {family: 'Stored', idea: 'Glass jar crammed with three Sparks, lid bulging'},
  'tight-packing-iii': {family: 'Stored', idea: 'Big jar bursting with Sparks, lid strapped, glowing'},
  'devourer': {family: 'Eater', idea: 'Jaws bite a Rare card; a heart rises'},
  'ember-feeder': {family: 'Eater', idea: 'Stove eats two cards; the meter grows a notch'},
};

export const RARE_IDS = Object.keys(P);
export function pictureGrid(id) { return P[id](); }
export const pictureSvg = (id, opts) => toSvg(pictureGrid(id), opts);
