// v1.0-level: scenery showcase for Frostbound Reach (frost) and Oldgrowth Pines
// (pinewood). Off by default; the owner approves it by code before it becomes
// the default. Switched on by `?scenery=2` (read once when this module loads) or
// by the WispFlight option `{scenery:2}`; `{scenery:1}` forces it off.
//
// Rules kept here:
// - Whole native-buffer pixels, flat colours, stepped alpha bands. No blur,
//   no shadowBlur, no gradients.
// - Static art is baked once: background layers once per level and buffer size,
//   ground texture and surface growth once per terrain chunk (inside the
//   renderer's existing terrain cache). Per frame: a few drawImage calls and a
//   capped, allocation-free particle pass.
// - Decoration never touches collision, pickups or hazards. Growth that rises
//   into open air is drawn in a back layer before the terrain, darker than the
//   ground, sized to a fraction of the open space above it, and only where the
//   surface is actually exposed.
// - Everything here is drawn before the renderer's darkness/light fog, so it
//   dims exactly like terrain does.

export const SCENERY_TWO_CODE = 'v1.0-level';
export const SCENERY_TWO_BIOMES = Object.freeze(['frost', 'pinewood']);
const URL_SCENERY = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('scenery'); } catch { return null; } })();
// Counters let tests prove the flag-off path never reaches decoration code.
export const sceneryTwoStats = { created: 0, backgrounds: 0, materials: 0, growth: 0, particles: 0, skippedParticles: 0, materialMs: 0, growthMs: 0 };
const now = () => globalThis.performance?.now?.() ?? 0;

export function sceneryVersion(engine) {
  const option = engine?.options?.scenery;
  if (option !== undefined && option !== null && option !== '') return Number(option) === 2 ? 2 : 1;
  return Number(URL_SCENERY) === 2 ? 2 : 1;
}

export function createLevelSceneryTwo(engine, identity) {
  if (sceneryVersion(engine) !== 2) return null;
  const biome = identity?.biomeId;
  if (!SCENERY_TWO_BIOMES.includes(biome)) return null;
  sceneryTwoStats.created++;
  return new LevelSceneryTwo(engine, identity, biome);
}

// Limited palettes, one per biome. Every colour drawn by this module is listed.
export const SCENERY_TWO_PALETTES = Object.freeze({
  frost: {
    sky: ['#0c1724', '#111f30', '#17293d', '#1f354c', '#29425a'],
    star: '#7f97aa', starBright: '#c7d9e4',
    aurora: ['#34a088', '#47bb93', '#6378c4'],
    far: { body: '#101e2d', face: '#1d3a55', snow: '#6d8ea4', snowShade: '#46637a' },
    mid: { body: '#14243a', face: '#1c3149', rim: '#35546b', ground: '#111e2e' },
    ground: { seam: '#26404f', blocks: ['#2b4656', '#30505f', '#283f4e'], blockLit: '#375a6b', glint: '#557f92', bubble: '#1f3444', deep: '#08111b', crack: '#13253a', crackLit: '#5f899e', face: '#43697c' },
    snow: { body: '#9bb7c6', top: '#bcd2dd', shade: '#6a8a9d' },
    rim: '#86b9ce',
    icicle: { body: '#4f7489', lit: '#8db5c8' },
    shard: { body: '#3f667b', lit: '#7fa9bc' },
    shrub: '#1f262e',
    particle: '#a9c0cd',
  },
  pinewood: {
    sky: ['#0d1815', '#111f1a', '#162720', '#1c3028', '#233a30'],
    star: '#7b8a79', starBright: '#b8c2a6', moon: '#a9b195', moonShade: '#111f1a', halo: '#5d6b58',
    ridges: ['#223830', '#1b2f28', '#152620'],
    trunk: { body: '#0c1612', bark: '#121e19', edge: '#1b2a22', moss: '#182819' },
    shaft: '#a3b594',
    ground: { base: '#3f3727', lumps: ['#483e2b', '#332c20'], humus: '#262117', stone: '#4c4a3b', stoneLit: '#625f4b', stoneDark: '#1f1b14', root: '#2a2116', rootLit: '#55462f', deep: '#0b0d09' },
    moss: { body: '#557740', top: '#6a8a4c' },
    pine: { body: '#1b3027', dark: '#14251d', lit: '#2b4733', trunk: '#271f17' },
    fern: ['#2f4a2c', '#46663b'],
    log: { bark: '#33281c', end: '#5f5034', ring: '#463a26', moss: '#3f5a33' },
    mushroom: { cap: '#7d563b', spot: '#b9a682', stem: '#a69c84' },
    hanging: { root: '#2e2418', lichen: '#56664a' },
    particle: '#b2bd7c',
  },
});

const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hash = (x, y = 0, seed = 0) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
const seedOf = text => { let h = 2166136261; for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

function rect(c, x, y, w, h, ink) {
  w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return;
  c.fillStyle = ink; c.fillRect(Math.round(x), Math.round(y), w, h);
}
function line(c, x0, y0, x1, y1, ink, size = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy; c.fillStyle = ink;
  for (let guard = 0; guard < 512; guard++) {
    c.fillRect(x0, y0, size, size);
    if (x0 === x1 && y0 === y1) break;
    const next = error * 2;
    if (next >= dy) { error += dy; x0 += sx; }
    if (next <= dx) { error += dx; y0 += sy; }
  }
}
function sampler(surface, width = 0) {
  // Surface points are sorted by x (canvas pixels). Clamp beyond the ends.
  const slow = x => {
    if (!surface.length) return 0;
    if (x <= surface[0][0]) return surface[0][1];
    for (let i = 1; i < surface.length; i++) {
      const a = surface[i - 1], b = surface[i];
      if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1);
    }
    return surface.at(-1)[1];
  };
  if (!(width > 0) || !surface.length) return slow;
  // One pass fills a per-column table so per-pixel lookups are O(1).
  const pad = 32, table = new Float32Array(Math.ceil(width) + pad * 2);
  for (let i = 0, k = 0; i < table.length; i++) {
    const x = i - pad;
    if (x <= surface[0][0]) { table[i] = surface[0][1]; continue; }
    while (k < surface.length - 1 && surface[k + 1][0] < x) k++;
    if (k >= surface.length - 1) { table[i] = surface.at(-1)[1]; continue; }
    const a = surface[k], b = surface[k + 1];
    table[i] = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1);
  }
  return x => { const i = Math.round(x) + pad; return i >= 0 && i < table.length ? table[i] : slow(x); };
}
function makeCanvas(document, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width); canvas.height = Math.max(1, height);
  const c = canvas.getContext('2d', { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  return { canvas, c };
}

// --- Background bakes -------------------------------------------------------

function skyBands(c, W, H, colours) {
  // Stepped bands, darkest overhead, with a one-row checker dither at each step.
  const n = colours.length;
  for (let i = 0; i < n; i++) {
    const y0 = Math.round(H * i / n * .82), y1 = i === n - 1 ? H : Math.round(H * (i + 1) / n * .82);
    rect(c, 0, y0, W, y1 - y0, colours[i]);
    if (i) { c.fillStyle = colours[i - 1]; for (let x = 0; x < W; x += 2) c.fillRect(x, y0, 1, 1); }
  }
}
function starField(c, W, H, seed, p, count, maxY) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, 4, seed) * W), y = Math.floor(hash(i, 7, seed) * maxY), bright = hash(i, 9, seed) > .9;
    c.globalAlpha = bright ? .9 : .35 + hash(i, 5, seed) * .4;
    rect(c, x, y, 1, 1, bright ? p.starBright : p.star);
    if (bright && hash(i, 6, seed) > .5) { c.globalAlpha = .35; rect(c, x - 1, y, 3, 1, p.star); rect(c, x, y - 1, 1, 3, p.star); }
  }
  c.globalAlpha = 1;
}
// Periodic ridge height (period P) from integer-spaced control points.
function periodicRidge(P, spacing, seed, fn) {
  const n = Math.max(2, Math.round(P / spacing)), heights = Array.from({ length: n }, (_, i) => fn(i, hash(i, 31, seed), hash(i, 37, seed)));
  return x => {
    const u = ((x % P) + P) % P / P * n, i = Math.floor(u), f = u - i;
    return heights[i % n] * (1 - f) + heights[(i + 1) % n] * f;
  };
}
// Draw `fn(x)` at x and its wrapped copies so a layer tiles seamlessly.
function wrapped(P, x, extent, fn) {
  fn(x);
  if (x - extent < 0) fn(x + P);
  if (x + extent > P) fn(x - P);
}
function steppedPine(c, x, baseY, h, ink, opts = {}) {
  // Layered, stepped boughs: each tier widens downwards and steps in.
  h = Math.max(4, Math.round(h)); x = Math.round(x); baseY = Math.round(baseY);
  const trunkH = Math.max(1, Math.round(h * .14)), crownH = h - trunkH;
  const tiers = Math.max(2, Math.round(crownH / 7)), tierH = crownH / tiers, spread = crownH * .34;
  const trunkW = h > 34 ? 3 : h > 16 ? 2 : 1;
  rect(c, x - (trunkW >> 1), baseY - trunkH, trunkW, trunkH + (opts.root || 0), opts.trunk || ink);
  for (let r = 0; r < crownH; r++) {
    const y = baseY - trunkH - r, tier = Math.floor(r / tierH), within = (r - tier * tierH) / tierH;
    const hw = Math.max(0, Math.round(spread * (1 - tier / (tiers + .35)) * (1 - within * .62)));
    rect(c, x - hw, y, hw * 2 + 1, 1, ink);
    if (opts.dark && hw > 1) rect(c, x - hw, y, hw, 1, opts.dark);
    if (opts.lit && hw > 0 && within < .34) rect(c, x + hw, y, 1, 1, opts.lit);
  }
  rect(c, x, baseY - h - 1, 1, 2, ink);
}

function bakeFrostLayers(document, W, H, seed, p) {
  const P = Math.ceil(W * 2 / 16) * 16;
  const sky = makeCanvas(document, W, H);
  skyBands(sky.c, W, H, p.sky);
  starField(sky.c, W, H, seed, p, Math.round(W * H / 650), H * .6);
  // Aurora: three flat ribbons, each a hanging curtain of three alpha steps.
  const AH = Math.round(H * .56), aurora = makeCanvas(document, P, AH), a = aurora.c;
  for (let i = 0; i < 3; i++) {
    const ink = p.aurora[i], base = AH * (.13 + .12 * i), amp = AH * (.07 + .025 * i), k1 = 1 + i, k2 = 3 + 2 * i;
    const ph = hash(i, 1, seed) * TAU, ph2 = hash(i, 2, seed) * TAU;
    for (let x = 0; x < P; x += 2) {
      const curl = Math.sin(TAU * k1 * x / P + ph) + .4 * Math.sin(TAU * (k1 + 4) * x / P + ph2);
      const y = Math.round(base + amp * curl), fade = .5 + .5 * Math.sin(TAU * k2 * x / P + ph * 3);
      if (fade < .12) continue;
      const len = Math.round(AH * (.06 + .15 * fade));
      a.globalAlpha = .52; rect(a, x, y, 2, 2, ink);
      a.globalAlpha = .26; rect(a, x, y + 2, 2, Math.round(len * .45), ink);
      a.globalAlpha = .11; rect(a, x, y + 2 + Math.round(len * .45), 2, Math.round(len * .55), ink);
    }
  }
  a.globalAlpha = 1;
  // Far: jagged glacier range with a snow line and lit west faces.
  const far = makeCanvas(document, P, H), f = far.c;
  const ridge = periodicRidge(P, 13, seed + 3, (i, r1, r2) => H * (.24 + r1 * .1) + (i % 2 ? 0 : H * (.06 + r2 * .17)) + (r1 > .88 ? H * .1 : 0));
  const snowLine = H * .58;
  for (let x = 0; x < P; x++) {
    const y = Math.round(H - ridge(x)), ahead = H - ridge(x + 2), lit = ahead < y;
    rect(f, x, y, 1, H - y, p.far.body);
    if (lit) rect(f, x, y, 1, Math.round(3 + (H - y) * .18), p.far.face);
    const jag = Math.floor(hash(x >> 1, 41, seed) * 4);
    if (y < snowLine + jag) rect(f, x, y, 1, Math.min(snowLine + jag - y, 3 + (snowLine - y) * .7), lit ? p.far.snow : p.far.snowShade);
  }
  // Mid: clusters of ice spires on a low frozen shelf.
  const mid = makeCanvas(document, P, H), m = mid.c;
  const shelf = x => H - H * .06 - H * .022 * (1 + Math.sin(TAU * 3 * x / P + seed % 7));
  for (let x = 0; x < P; x++) { const y = Math.round(shelf(x)); rect(m, x, y, 1, H - y, p.mid.ground); }
  // Broad, low spires (about a third of the screen at most) in stepped
  // segments, so they read as distant ice rather than spikes or streaks.
  const clusters = Math.max(3, Math.round(P / 110));
  for (let j = 0; j < clusters; j++) {
    const x0 = Math.round((j + hash(j, 51, seed) * .6) * P / clusters), count = 2 + Math.floor(hash(j, 52, seed) * 3);
    for (let k = 0; k < count; k++) {
      const sx = x0 + k * (9 + Math.floor(hash(j, k + 60, seed) * 9)), sh = Math.round(H * (.09 + hash(j, k + 70, seed) * (k ? .07 : .14)));
      const sw = 6 + Math.floor(hash(j, k + 80, seed) * 7), steps = 3 + Math.floor(hash(j, k + 90, seed) * 2);
      wrapped(P, sx, sw + 1, xx => {
        const base = Math.round(shelf(xx)) + 1;
        for (let r = 0; r < sh; r++) {
          const stepped = Math.floor(r / sh * steps) / steps, hw = Math.max(0, Math.round(sw * (1 - stepped) * (1 - (r / sh - stepped) * 1.6))), y = base - r;
          rect(m, xx - hw, y, hw * 2 + 1, 1, p.mid.body);
          if (hw > 1) rect(m, xx - hw, y, Math.round(hw * .8), 1, p.mid.face);
          if (r > sh * .5) rect(m, xx - hw, y, 1, 1, p.mid.rim);
        }
      });
    }
  }
  return { sky, aurora, far, mid };
}

function bakeForestLayers(document, W, H, seed, p) {
  const P = Math.ceil(W * 2 / 16) * 16;
  const sky = makeCanvas(document, W, H), s = sky.c;
  skyBands(s, W, H, p.sky);
  starField(s, W, H, seed, p, Math.round(W * H / 2400), H * .36);
  // Moon with two flat halo steps; the shafts below fall from its side.
  const mx = Math.round(W * .8), my = Math.round(H * .14), mr = Math.max(5, Math.round(H * .032));
  const disc = (r, ink, alpha) => { s.globalAlpha = alpha; s.fillStyle = ink; for (let row = -r; row <= r; row++) { const half = Math.floor(Math.sqrt(r * r - row * row)); s.fillRect(mx - half, my + row, half * 2 + 1, 1); } };
  disc(mr + 7, p.halo, .06); disc(mr + 3, p.halo, .08); disc(mr, p.moon, .85);
  s.globalAlpha = .85; s.fillStyle = p.moonShade;
  for (let row = -mr; row <= mr; row++) { const half = Math.floor(Math.sqrt(mr * mr - row * row) * .55); s.fillRect(mx - mr + 1, my + row, Math.max(0, half - 1), 1); }
  s.globalAlpha = 1;
  // Three pine ridges, lighter with distance.
  const ridges = [0, 1, 2].map(d => {
    const layer = makeCanvas(document, P, H), c = layer.c, ink = p.ridges[d];
    const ph = hash(d, 3, seed) * TAU, ph2 = hash(d, 4, seed) * TAU;
    const hill = x => H * (.52 + .115 * d) + H * .03 * Math.sin(TAU * (2 + d) * x / P + ph) + H * .018 * Math.sin(TAU * (5 + d) * x / P + ph2);
    for (let x = 0; x < P; x++) { const y = Math.round(hill(x)); rect(c, x, y, 1, H - y, ink); }
    const count = Math.round(P / (6 + d * 4));
    for (let j = 0; j < count; j++) {
      const px = Math.round((j + hash(j, 10 + d, seed) * .8) * P / count);
      const h = Math.round((H * (.035 + d * .03)) * (.7 + hash(j, 20 + d, seed) * .9));
      wrapped(P, px, h, xx => steppedPine(c, xx, hill(xx) + 2, h, ink));
    }
    return layer;
  });
  // Mid: giant trunks passing behind the play space, moonlight shafts between.
  const trunks = makeCanvas(document, P, H), t = trunks.c;
  for (let i = 0; i < 3; i++) {
    const x0 = Math.round((i + hash(i, 90, seed) * .7) * P / 3), w = 7 + Math.floor(hash(i, 91, seed) * 9), slant = .42;
    for (let y = 0; y < H; y++) {
      const x = x0 - y * slant;
      t.globalAlpha = .07; wrapped(P, x, w + 2, xx => rect(t, xx, y, w, 1, p.shaft));
      t.globalAlpha = .06; wrapped(P, x, w + 2, xx => rect(t, xx + Math.round(w * .3), y, Math.round(w * .4), 1, p.shaft));
    }
  }
  t.globalAlpha = 1;
  for (let x = 6 + Math.floor(hash(1, 95, seed) * 20), i = 0; x < P - 30; i++) {
    const w = 9 + Math.floor(hash(i, 96, seed) * 13);
    rect(t, x, 0, w, H, p.trunk.body);
    for (let r = 0; r < 12; r++) rect(t, x - Math.floor(r * .7), H - 12 + r, w + Math.floor(r * 1.4), 1, p.trunk.body);
    for (let bx = x + 2; bx < x + w - 2; bx += 3) {
      for (let y = Math.floor(hash(i, bx, seed) * 10); y < H; ) {
        const len = 6 + Math.floor(hash(bx, y, seed) * 16); rect(t, bx, y, 1, len, p.trunk.bark); y += len + 2 + Math.floor(hash(y, bx, seed) * 7);
      }
    }
    rect(t, x + w - 1, 0, 1, H - 10, p.trunk.edge);
    for (let k = 0; k < 3; k++) { const y = Math.floor(hash(i, k + 97, seed) * H * .8); rect(t, x, y, 2 + Math.floor(hash(k, i, seed) * 3), 6 + Math.floor(hash(i, k, seed) * 10), p.trunk.moss); }
    const by = Math.round(H * (.2 + hash(i, 98, seed) * .4)), side = hash(i, 99, seed) > .5 ? 1 : -1, bx = side > 0 ? x + w : x;
    line(t, bx, by, bx + side * 9, by - 6, p.trunk.body, 2); line(t, bx + side * 9, by - 6, bx + side * 13, by - 13, p.trunk.body);
    x += w + 46 + Math.floor(hash(i, 100, seed) * 64);
  }
  return { sky, ridges, trunks };
}

function tile(c, layer, offset, W, y = 0) {
  const P = layer.canvas.width;
  let x = -Math.round(((offset % P) + P) % P);
  for (; x < W; x += P) c.drawImage(layer.canvas, x, y);
}

// --- Ground texture (inside the clipped terrain bake) ------------------------

// Seamless material tiles, baked once per level; each chunk fills from them
// with a pattern at a chunk-dependent offset, then adds face-aware detail.
const TILE_W = 128, TILE_H = 96;
function bakeFrostTile(document, seed, p) {
  const g = p.ground, { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  rect(c, 0, 0, TILE_W, TILE_H, g.seam);
  // Packed ice slabs: irregular courses, wide slabs, low-contrast seams.
  for (let y = 0, row = 0; y < TILE_H; row++) {
    let rh = 10 + Math.floor(hash(row, 1, seed) * 9);
    if (TILE_H - (y + rh) < 10) rh = TILE_H - y;
    for (let x = Math.floor(hash(row, 2, seed) * 30), k = 0, start = x; x < start + TILE_W; k++) {
      const bw = Math.min(16 + Math.floor(hash(row, k, seed + 7) * 26), start + TILE_W - x), v = hash(row, k, seed + 11), ink = g.blocks[v < .4 ? 0 : v < .8 ? 1 : 2];
      wrapped(TILE_W, x % TILE_W, bw, xx => {
        rect(c, xx + 1, y + 1, bw - 1, rh - 1, ink);
        if (v > .55) rect(c, xx + 1, y + 1, bw - 2, 1, g.blockLit);
        if (v > .3 && v < .75) {
          // A pair of diagonal glints reads as polished ice.
          const gx = xx + 3 + Math.floor(hash(row, k, seed + 13) * Math.max(1, bw - 10)), gy = y + 3 + Math.floor(hash(row, k, seed + 17) * Math.max(1, rh - 8));
          line(c, gx, gy + 4, gx + 4, gy, g.glint); line(c, gx + 3, gy + 5, gx + 5, gy + 3, g.glint);
        }
        for (let b = 0; b < 2; b++) if (hash(row, k * 3 + b, seed + 19) > .6) rect(c, xx + 2 + Math.floor(hash(row, k + b, seed + 23) * Math.max(1, bw - 4)), y + 2 + Math.floor(hash(k, row + b, seed + 29) * Math.max(1, rh - 4)), 1, 1, g.bubble);
      });
      x += bw;
    }
    y += rh;
  }
  // Buried fractures crossing several slabs.
  for (let i = 0; i < 4; i++) {
    let x = hash(i, 41, seed) * TILE_W, y = 8 + hash(i, 42, seed) * (TILE_H - 40);
    for (let k = 0; k < 4; k++) {
      const nx = x + (hash(i, k + 43, seed) - .5) * 16, ny = y + 4 + hash(i, k + 47, seed) * 6;
      wrapped(TILE_W, x, 20, xx => { line(c, xx + 1, y, xx + 1 + nx - x, ny, g.crackLit); line(c, xx, y, xx + nx - x, ny, g.crack); });
      x = nx; y = ny;
    }
  }
  return canvas;
}
function bakeForestTile(document, seed, p) {
  const g = p.ground, { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  rect(c, 0, 0, TILE_W, TILE_H, g.base);
  // Soil lumps rather than stripes, and buried stones.
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(hash(i, 1, seed) * TILE_W), y = Math.floor(hash(i, 2, seed) * TILE_H), lw = 3 + Math.floor(hash(i, 3, seed) * 9), lh = 1 + Math.floor(hash(i, 4, seed) * 2.5);
    wrapped(TILE_W, x, lw, xx => { rect(c, xx, y, lw, lh, g.lumps[i & 1]); if (y + lh > TILE_H) rect(c, xx, y - TILE_H, lw, lh, g.lumps[i & 1]); });
  }
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(i, 5, seed) * TILE_W), y = 6 + Math.floor(hash(i, 6, seed) * (TILE_H - 12)), r = 2 + Math.floor(hash(i, 7, seed) * 3);
    wrapped(TILE_W, x, r * 2, xx => {
      for (let row = -r; row <= r; row++) {
        const hw = Math.floor(Math.sqrt(r * r - row * row) * 1.3);
        rect(c, xx - hw, y + row, hw * 2 + 1, 1, row === -r ? g.stoneLit : row === r ? g.stoneDark : g.stone);
      }
      rect(c, xx - 1, y - r + 1, 2, 1, g.stoneLit);
    });
  }
  // Buried root fragments.
  for (let i = 0; i < 5; i++) {
    let x = hash(i, 61, seed) * TILE_W, y = 6 + hash(i, 62, seed) * (TILE_H - 40);
    for (let k = 0; k < 4; k++) {
      const nx = x + (hash(i, k + 63, seed) - .5) * 18, ny = y + 3 + hash(i, k + 67, seed) * 6;
      wrapped(TILE_W, x, 20, xx => { line(c, xx + 1, y, xx + 1 + nx - x, ny, g.rootLit); line(c, xx, y, xx + nx - x, ny, g.root); });
      x = nx; y = ny;
    }
  }
  return canvas;
}
function fillTile(c, tile, w, h, seed) {
  const pattern = tile && c.createPattern?.(tile, 'repeat');
  if (!pattern) return false;
  const sx = Math.floor(hash(seed, 1) * TILE_W), sy = Math.floor(hash(seed, 2) * TILE_H);
  c.save(); c.translate(-sx, -sy); c.fillStyle = pattern; c.fillRect(sx, sy, w, h); c.restore();
  return true;
}

// Collects pixel rects per colour, merging horizontal neighbours with the same
// row span, then paints each colour once. Insertion order of colours is paint order.
function rectBatch() {
  const lists = new Map();
  return {
    add(ink, x, y, w, h) {
      if (w <= 0 || h <= 0) return;
      let list = lists.get(ink); if (!list) lists.set(ink, list = []);
      const n = list.length;
      if (n && list[n - 3] === y && list[n - 1] === h && list[n - 4] + list[n - 2] === x) { list[n - 2] += w; return; }
      list.push(x, y, w, h);
    },
    size() { return lists.size; },
    flush(c) {
      for (const [ink, list] of lists) { c.fillStyle = ink; for (let i = 0; i < list.length; i += 4) c.fillRect(list[i], list[i + 1], list[i + 2], list[i + 3]); }
      lists.clear();
    },
  };
}
function recorderFor(batch) { return { fillStyle: '', fillRect(x, y, w, h) { batch.add(this.fillStyle, x, y, w, h); } }; }
function depthBands(c, at, w, h, inward, seed, ink, alpha, spacing) {
  // Three non-overlapping flat steps (each pixel is darkened once), so the
  // deep body costs one blend instead of three.
  const steps = [rectBatch(), rectBatch(), rectBatch()];
  for (let x = 0; x < w; x += 4) {
    const sy = at(x + 2), edges = [1, 2, 3].map(k => Math.round(sy + inward * (spacing * k + Math.floor(hash(x >> 3, k, seed) * 5))));
    for (let k = 0; k < 3; k++) {
      let y0, y1;
      if (inward > 0) { y0 = edges[k]; y1 = k < 2 ? edges[k + 1] : h; }
      else { y1 = edges[k]; y0 = k < 2 ? edges[k + 1] : 0; }
      y0 = Math.max(0, y0); y1 = Math.min(h, y1);
      if (y1 > y0) steps[k].add(ink, x, y0, 4, y1 - y0);
    }
  }
  for (let k = 0; k < 3; k++) { c.globalAlpha = 1 - Math.pow(1 - alpha, k + 1); steps[k].flush(c); }
  c.globalAlpha = 1;
}

function frostMaterial(c, { surface, top, width: w, height: h, seed, p, tile }) {
  const g = p.ground, inward = top ? -1 : 1, at = sampler(surface, w);
  if (!fillTile(c, tile, w, h, seed)) rect(c, 0, 0, w, h, g.blocks[0]);
  // Fracture lines run in from the exposed face.
  const cracks = Math.ceil(w / 80), lines = rectBatch(), lc = recorderFor(lines);
  for (let i = 0; i < cracks; i++) {
    let x = 4 + hash(i, 3, seed) * Math.max(1, w - 8), y = at(x) + inward * (3 + hash(i, 4, seed) * 6);
    const len = 2 + Math.floor(hash(i, 5, seed) * 3);
    for (let k = 0; k < len; k++) {
      const nx = x + (hash(i, k + 10, seed) - .5) * 14, ny = y + inward * (5 + hash(i, k + 20, seed) * 8);
      if (k < 2) line(lc, x + 1, y, nx + 1, ny, g.crackLit);
      line(lc, x, y, nx, ny, g.crack);
      if (hash(i, k + 30, seed) > .72) line(lc, nx, ny, nx + (hash(i, k + 40, seed) - .5) * 14, ny + inward * 6, g.crack);
      x = nx; y = ny;
    }
  }
  lines.flush(c);
  // Depth: three flat darker steps away from the exposed face.
  depthBands(c, at, w, h, inward, seed, g.deep, .22, 16);
  // Exposed face: snow caps and drifts on upward faces; a pale blue rim light
  // on undersides and steep faces.
  const batch = rectBatch();
  for (let x = 0; x < w; x++) {
    const sy = Math.round(at(x)); if (sy < -12 || sy > h + 12) continue;
    const slope = Math.abs(at(x + 2) - at(x - 2)) / 4;
    if (top) { batch.add(g.face, x, sy - 5, 1, 5); batch.add(p.rim, x, sy - 2, 1, 2); continue; }
    if (slope < 1.1) {
      let depth = (2 + Math.floor(hash(x >> 3, 7, seed) * 3)) * (1 - slope / 1.1);
      const hollow = at(x) - (at(x - 14) + at(x + 14)) / 2;
      if (hollow > 0) depth += Math.min(8, hollow * .7);
      depth = Math.round(depth);
      if (depth >= 1) {
        // The contact edge covers the top pixel, so the cap is body + shade.
        batch.add(p.snow.body, x, sy, 1, depth);
        if (depth >= 3) batch.add(p.snow.shade, x, sy + depth - 1, 1, 1);
        continue;
      }
    }
    batch.add(g.face, x, sy + 1, 1, 2);
  }
  batch.flush(c);
}

function forestMaterial(c, { surface, top, width: w, height: h, seed, p, tile }) {
  const g = p.ground, inward = top ? -1 : 1, at = sampler(surface, w);
  if (!fillTile(c, tile, w, h, seed)) rect(c, 0, 0, w, h, g.base);
  // Roots wander in from the face and branch.
  const roots = Math.ceil(w / 90), lines = rectBatch(), lc = recorderFor(lines);
  for (let i = 0; i < roots; i++) {
    let x = hash(i, 8, seed) * w, y = at(x) + inward * 3;
    const len = 3 + Math.floor(hash(i, 9, seed) * 3);
    for (let k = 0; k < len; k++) {
      const nx = x + (hash(i, k + 10, seed) - .5) * 11, ny = y + inward * (4 + hash(i, k + 20, seed) * 6);
      if (k < 2) line(lc, x + 1, y, nx + 1, ny, g.rootLit);
      line(lc, x, y, nx, ny, g.root, k < 1 ? 2 : 1);
      if (k === 1 && hash(i, k + 30, seed) > .5) line(lc, nx, ny, nx + (hash(i, k + 40, seed) - .5) * 16, ny + inward * 5, g.root);
      x = nx; y = ny;
    }
  }
  lines.flush(c);
  depthBands(c, at, w, h, inward, seed, g.deep, .2, 18);
  const batch = rectBatch();
  for (let x = 0; x < w; x++) {
    const sy = Math.round(at(x)); if (sy < -12 || sy > h + 12) continue;
    const slope = Math.abs(at(x + 2) - at(x - 2)) / 4;
    if (top) {
      batch.add(g.humus, x, sy - 4, 1, 4);
      if (hash(x, 13, seed) > .8) batch.add(p.hanging.lichen, x, sy - 1 - Math.floor(hash(x, 14, seed) * 3), 1, 1);
      continue;
    }
    if (slope < 1.3) {
      const depth = Math.round((2 + Math.floor(hash(x >> 2, 9, seed) * 2.6)) * (1 - slope / 1.3));
      if (depth >= 1) {
        // The contact edge covers the top pixel; the cap is one flat run.
        batch.add(p.moss.body, x, sy, 1, depth);
        continue;
      }
    }
    batch.add(g.humus, x, sy, 1, 2);
  }
  batch.flush(c);
}

// --- Surface growth (back layer, outside the clip) ----------------------------

function frostShrub(c, x, y, h, p, r) {
  const lean = Math.round((r - .5) * 4);
  line(c, x, y + 2, x + lean, y - h, p.shrub);
  for (let k = 0; k < 3; k++) {
    const t = .35 + k * .22, bx = x + lean * t, by = y - h * t, side = k % 2 ? -1 : 1, len = 2 + (3 - k) * 1.3;
    line(c, bx, by, bx + side * len, by - len, p.shrub);
    rect(c, bx + side * len - (side < 0 ? 1 : 0), by - len - 1, 2, 1, p.snow.body);
  }
  rect(c, x + lean - 1, y - h - 1, 2, 1, p.snow.top);
}
function frostShards(c, x, y, h, p, seed) {
  for (let k = 0; k < 3; k++) {
    const sx = x + k * 3 - 3, sh = Math.max(2, Math.round(h * (.55 + hash(k, 1, seed) * .5))), lean = (hash(k, 2, seed) - .5) * 4;
    for (let r = 0; r < sh; r++) {
      const wr = Math.max(1, Math.round(2.2 * (1 - r / sh))), xx = sx + Math.round(lean * r / sh);
      rect(c, xx, y - r, wr, 1, p.shard.body); rect(c, xx, y - r, 1, 1, p.shard.lit);
    }
  }
}
function icicle(c, x, y, len, p) {
  const bw = len > 8 ? 3 : len > 4 ? 2 : 1;
  for (let r = 0; r < len; r++) {
    const wr = Math.max(1, Math.round(bw * (1 - r / len)));
    rect(c, x, y + r, wr, 1, p.icicle.body);
    if (wr > 1 || r < 2) rect(c, x, y + r, 1, 1, p.icicle.lit);
  }
}
function fern(c, x, y, size, p, r) {
  for (let f = -2; f <= 2; f++) {
    const ink = (f + 2 + Math.floor(r * 4)) % 2 ? p.fern[0] : p.fern[1];
    const mx = x + f * size * .35, my = y - size * (.85 - Math.abs(f) * .12), ex = x + f * size * .85, ey = y - size * (.55 - Math.abs(f) * .1);
    line(c, x, y, mx, my, ink); line(c, mx, my, ex, ey, ink);
  }
}
function tuft(c, x, y, p, r) {
  for (let k = 0; k < 3; k++) rect(c, x + k * 2 - 2, y - 2 - Math.floor(hash(k, 3, r * 1e6) * 3), 1, 4, k % 2 ? p.moss.top : p.fern[1]);
}
function mushrooms(c, x, y, p, r) {
  const n = 1 + Math.floor(r * 3);
  for (let k = 0; k < n; k++) {
    const mx = x + k * 3, big = k === 0 && r > .5;
    rect(c, mx, y - (big ? 3 : 2), 1, big ? 4 : 3, p.mushroom.stem);
    rect(c, mx - (big ? 2 : 1), y - (big ? 5 : 3), big ? 5 : 3, big ? 2 : 1, p.mushroom.cap);
    if (big) rect(c, mx, y - 5, 1, 1, p.mushroom.spot);
  }
}
function fallenLog(c, x, bottom, len, p) {
  rect(c, x, bottom - 4, len, 4, p.log.bark);
  rect(c, x + len - 2, bottom - 4, 2, 4, p.log.end);
  rect(c, x + 2, bottom - 5, len - 6, 1, p.log.moss);
  rect(c, x + 3, bottom - 2, len - 7, 1, p.log.ring); rect(c, x + len - 2, bottom - 3, 1, 2, p.log.ring);
}
function hangingRoot(c, x, y, len, p, r) {
  let xx = x;
  for (let k = 0; k < len; k += 3) {
    const nx = xx + (hash(k, 5, r * 1e6) > .5 ? 1 : -1) * (hash(k, 6, r * 1e6) > .55 ? 1 : 0);
    line(c, xx, y + k, nx, y + Math.min(len, k + 3), p.hanging.root); xx = nx;
  }
}

function sprite(document, w, h, ax, ay, draw) {
  const { canvas, c } = makeCanvas(document, w, h);
  draw(c);
  return { canvas, ax, ay, h: 0 };
}
function bakeSprites(document, biome, p, seed) {
  if (biome === 'frost') return {
    icicles: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(len => ({ ...sprite(document, 3, len, 0, 0, c => icicle(c, 0, 0, len, p)), h: len })),
    shrubs: [5, 7, 9, 12].map((h, k) => ({ ...sprite(document, 18, h + 5, 9, h + 2, c => frostShrub(c, 9, h + 2, h, p, hash(k, 3, seed))), h })),
    shards: [3, 5, 7, 9].map((h, k) => ({ ...sprite(document, 15, h + 3, 7, h + 1, c => frostShards(c, 7, h + 1, h, p, seed + k * 31)), h })),
  };
  const pine = h => ({ ...sprite(document, 37, h + 7, 18, h + 1, c => steppedPine(c, 18, h + 1, h, p.pine.body, { dark: p.pine.dark, lit: p.pine.lit, trunk: p.pine.trunk, root: 4 })), h });
  return {
    pines: [[11, 13, 15], [20, 24, 28], [34, 40, 46]].map(sizes => sizes.map(pine)),
    ferns: [3, 4, 5, 6].map((size, k) => ({ ...sprite(document, 13, 8, 6, 7, c => fern(c, 6, 7, size, p, hash(k, 5, seed))), h: size })),
    tufts: [0, 1].map(k => ({ ...sprite(document, 7, 7, 3, 6, c => tuft(c, 3, 6, p, hash(k, 6, seed))), h: 4 })),
    mushrooms: [.2, .55, .9].map(r => ({ ...sprite(document, 12, 7, 3, 6, c => mushrooms(c, 3, 6, p, r)), h: 5 })),
    roots: [4, 6, 8, 10, 12, 14, 16].map((len, k) => ({ ...sprite(document, 5, len + 2, 2, 0, c => hangingRoot(c, 2, 0, len, p, hash(k, 7, seed))), h: len })),
  };
}

class LevelSceneryTwo {
  constructor(engine, identity, biome) {
    this.engine = engine; this.identity = identity; this.biome = biome;
    this.palette = SCENERY_TWO_PALETTES[biome];
    this.seed = seedOf(identity.id || biome);
    this.layers = null; this.layerKey = '';
    this.frameCost = 0; this.solids = null; this.solidsSource = null;
    // The shared course tableaux and the cut-out near strip repeat the old pack.
    this.hidesCourseArt = true;
  }
  reset() {
    const layers = this.layers;
    if (layers) for (const layer of [layers.sky, layers.aurora, layers.far, layers.mid, layers.trunks, ...(layers.ridges || [])]) if (layer) layer.canvas.width = layer.canvas.height = 1;
    this.layers = null; this.layerKey = '';
  }
  destroy() { this.reset(); if (this.tile) this.tile.width = this.tile.height = 1; this.tile = null; if (this.sprites) for (const list of Object.values(this.sprites)) for (const item of list.flat()) item.canvas.width = item.canvas.height = 1; this.sprites = null; this.solids = null; this.solidsSource = null; }
  noteFrame(ms) { this.frameCost = this.frameCost ? this.frameCost * .9 + ms * .1 : ms; }
  ensureLayers(f) {
    const key = f.width + 'x' + f.height;
    if (this.layerKey === key && this.layers) return this.layers;
    this.reset(); sceneryTwoStats.backgrounds++;
    this.layers = (this.biome === 'frost' ? bakeFrostLayers : bakeForestLayers)(f.document, f.width, f.height, this.seed, this.palette);
    this.layerKey = key;
    return this.layers;
  }
  drawSky(c, f) {
    const L = this.ensureLayers(f), W = f.width, px = f.distance * f.scale;
    c.drawImage(L.sky.canvas, 0, 0);
    if (this.biome === 'frost') {
      tile(c, L.aurora, px * .006 + (f.reducedMotion ? 0 : f.time * 1.6), W, 0);
      tile(c, L.far, px * .03, W);
    } else {
      tile(c, L.ridges[0], px * .02, W);
      tile(c, L.ridges[1], px * .045, W);
      tile(c, L.ridges[2], px * .08, W);
    }
  }
  drawBackdrop(c, f) {
    const L = this.ensureLayers(f), W = f.width, px = f.distance * f.scale;
    if (this.biome === 'frost') tile(c, L.mid, px * .11, W);
    else tile(c, L.trunks, px * .17, W);
  }
  drawParticles(c, f) {
    // Allocation-free, capped weather; skipped while recent frames run long.
    if (this.frameCost > 13) { sceneryTwoStats.skippedParticles++; return; }
    sceneryTwoStats.particles++;
    const W = f.width, H = f.height, px = f.distance * f.scale, t = f.reducedMotion ? 0 : f.time, seed = this.seed, ink = this.palette.particle;
    c.fillStyle = ink;
    if (this.biome === 'frost') {
      const count = Math.min(48, Math.round(W / 11));
      for (let i = 0; i < count; i++) {
        const depth = i % 3, speed = 5 + depth * 4 + hash(i, 1, seed) * 3;
        const x = ((hash(i, 2, seed) * (W + 8) - px * (.12 + depth * .1) - t * (2 + depth)) % (W + 8) + W + 8) % (W + 8) - 4;
        const y = ((hash(i, 3, seed) * (H + 8) + t * speed) % (H + 8)) - 4 + Math.sin(t * .8 + i) * 1.5;
        c.globalAlpha = .28 + depth * .14;
        c.fillRect(Math.round(x), Math.round(y), depth === 2 ? 2 : 1, depth === 2 ? 2 : 1);
      }
    } else {
      const count = Math.min(22, Math.round(W / 24));
      for (let i = 0; i < count; i++) {
        const x = ((hash(i, 2, seed) * (W + 8) - px * .3 + Math.sin(t * .6 + i * 1.7) * 7) % (W + 8) + W + 8) % (W + 8) - 4;
        const y = H * (.3 + hash(i, 3, seed) * .55) + Math.sin(t * .9 + i * 2.3) * 5;
        c.globalAlpha = Math.sin(t * 1.4 + i * 2.1) > .35 ? .7 : .18;
        c.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    c.globalAlpha = 1;
  }
  bakeMaterial(c, options) {
    sceneryTwoStats.materials++;
    const seed = this.seed ^ Math.imul((options.obstacle?.id | 0) + 1, 2654435761) ^ (options.top ? 0x5bd1e995 : 0);
    this.tile ??= options.document ? (this.biome === "frost" ? bakeFrostTile : bakeForestTile)(options.document, this.seed, this.palette) : null;
    const started = now();
    (this.biome === "frost" ? frostMaterial : forestMaterial)(c, { ...options, seed, p: this.palette, tile: this.tile });
    sceneryTwoStats.materialMs += now() - started;
  }
  // World-space terrain profiles (each solid is everything below a floor's
  // surface or above a roof's), used only to decide where growth is exposed.
  solidsFor(engine) {
    const obstacles = engine.layout?.obstacles || [];
    if (this.solidsSource === obstacles && this.solids) return this.solids;
    const solids = [];
    for (const o of obstacles) for (const top of [true, false]) {
      const shape = top ? o.topShape : o.bottomShape; if (!shape?.length || shape.length < 4) continue;
      const anchor = o.center + (top ? -1 : 1) * o.gap / 2, points = shape.slice(2).map(([x, y]) => [o.x + x, anchor + y]).sort((m, n) => m[0] - n[0]);
      const xs = new Float64Array(points.map(point => point[0])), ys = new Float64Array(points.map(point => point[1]));
      solids.push({ owner: o, top, xs, ys, minX: xs[0], maxX: xs[xs.length - 1] });
    }
    this.solids = solids; this.solidsSource = obstacles;
    return solids;
  }
  bakeGrowth(document, options) {
    sceneryTwoStats.growth++;
    const started = now(), result = this.bakeGrowthLayer(document, options);
    sceneryTwoStats.growthMs += now() - started;
    return result;
  }
  bakeGrowthLayer(document, { surface, top, width, obstacle, engine, ox, oy, scale }) {
    if (!surface?.length || !engine) return null;
    const p = this.palette, s = scale, inward = top ? -1 : 1, at = sampler(surface, width);
    const seed = this.seed ^ Math.imul((obstacle.id | 0) + 1, 2246822519) ^ (top ? 0x27d4eb2f : 0);
    let sMin = Infinity, sMax = -Infinity;
    for (const [, y] of surface) { sMin = Math.min(sMin, y); sMax = Math.max(sMax, y); }
    const pad = 8, G = 62, H = engine.height;
    // Ignore the deep aprons where a face leaves the screen.
    sMin = Math.max(sMin, oy - 2 - (obstacle.center + inward * obstacle.gap / 2) * s - pad);
    sMax = Math.min(sMax, oy - 2 + (H - (obstacle.center + inward * obstacle.gap / 2)) * s + pad);
    if (!(sMax > sMin)) return null;
    const dx = -pad, dy = top ? Math.floor(sMin) - pad : Math.floor(sMin) - G;
    const gw = width + pad * 2, gh = Math.ceil(sMax - sMin) + G + pad * 2;
    if (gh > 2048 || gw > 4096) return null;
    const anchor = obstacle.center + inward * obstacle.gap / 2, left = obstacle.x + (-pad - ox) / s, right = obstacle.x + (width + pad - ox) / s;
    const solids = this.solidsFor(engine).filter(solid => solid.maxX >= left && solid.minX <= right && solid.owner !== obstacle || solid.owner === obstacle && solid.top !== top);
    const heightAt = (solid, x) => {
      const xs = solid.xs; let lo = 0, hi = xs.length - 1;
      while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
      return solid.ys[lo] + (solid.ys[hi] - solid.ys[lo]) * (x - xs[lo]) / (xs[hi] - xs[lo] || 1);
    };
    const covered = (x, y) => {
      for (const solid of solids) {
        if (x < solid.minX || x > solid.maxX) continue;
        const h = heightAt(solid, x);
        if (solid.top ? y <= h : y >= h) return true;
      }
      return false;
    };
    // Open distance (world units) from a surface point into the air, capped.
    const freeAbove = (wx, wy) => {
      const probe = wy - inward * 2;
      let limit = inward > 0 ? Math.max(0, wy - 160) : Math.min(H, wy + 160);
      for (const solid of solids) {
        if (wx < solid.minX || wx > solid.maxX) continue;
        const h = heightAt(solid, wx);
        if (solid.top ? probe <= h : probe >= h) return 0;
        // The nearest opposite face bounds the open air.
        if (inward > 0 && solid.top) limit = Math.max(limit, h);
        if (inward < 0 && !solid.top) limit = Math.min(limit, h);
      }
      return Math.min(160, Math.abs(wy - limit));
    };
    // Plants are prebaked sprites (once per level); a chunk only places them.
    const sprites = this.sprites ??= bakeSprites(document, this.biome, p, this.seed);
    const placed = [], batch = rectBatch();
    const put = (sprite, gx, gy) => { if (sprite) placed.push(sprite, gx - sprite.ax, gy - sprite.ay); };
    const pick = (list, limit, r) => { let best = null; for (const sprite of list) if (sprite.h <= limit && (!best || sprite.h > best.h || sprite.h === best.h && r > .5)) best = sprite; return best; };
    let lastTall = -99;
    for (let x = 3 + Math.floor(hash(1, 2, seed) * 5); x < width - 3; ) {
      const r = hash(x, 11, seed), r2 = hash(x, 12, seed), sy = at(x), slope = Math.abs(at(x + 3) - at(x - 3)) / 6;
      const wx = obstacle.x + (x - ox) / s, wy = anchor + (sy - oy) / s;
      let step = 3 + Math.floor(hash(x, 13, seed) * 6);
      if (wy < 2 || wy > H - 2) { x += step; continue; }
      // Only candidates that could place something pay for the exposure test.
      const wanted = this.biome === 'frost' ? (top ? slope < .9 && hash(x >> 4, 14, seed) > .28 : r < .28 && slope < 1.2) : (top ? r < .78 : r < .79);
      if (!wanted) { x += step; continue; }
      const free = freeAbove(wx, wy) * s, gx = x - dx, gy = Math.round(sy) - dy;
      if (free < 6) { x += step; continue; }
      if (this.biome === 'frost') {
        if (top) {
          put(pick(sprites.icicles, Math.min(2 + r * r * 11, free * .24), r2), gx, gy - 1);
          step = 3 + Math.floor(r2 * 3);
        } else if (slope < .9 && r < .1 && free > 26 && x - lastTall > 12) {
          put(pick(sprites.shrubs, Math.min(5 + r2 * 8, free * .3), r), gx, gy); lastTall = x;
        } else if (slope < 1.2 && r < .28 && free > 14) {
          put(pick(sprites.shards, Math.min(3 + r2 * 6, free * .28), r), gx, gy + 1);
        }
      } else if (top) {
        const patch = hash(x >> 4, 14, seed);
        if (patch > .3 && r < .5) { put(pick(sprites.roots, Math.min(4 + r2 * 12, free * .28), r), gx, gy - 1); step = 2 + Math.floor(r2 * 4); }
        else if (r < .78) { const len = Math.round(Math.min(2 + r2 * 5, free * .2)); if (len >= 2) batch.add(p.hanging.lichen, gx, gy - 1, 1, len); }
      } else if (slope < 1 && r < .38 && free > 20 && x - lastTall > 12) {
        const size = free > 95 && r2 < .3 ? 2 : free > 55 && r2 < .68 ? 1 : 0;
        const sprite = pick(sprites.pines[size], free * .42, r) || pick(sprites.pines[0], free * .42, r);
        if (sprite) { put(sprite, gx, gy + 1); lastTall = x; step = 6 + Math.floor(r * 10); }
      } else if (r < .6 && free > 9) put(sprites.ferns[Math.floor(r2 * sprites.ferns.length)], gx, gy + 1);
      else if (r < .71 && free > 6) put(sprites.tufts[Math.floor(r2 * sprites.tufts.length)], gx, gy + 1);
      else if (r < .75 && slope < .4 && free > 8) put(sprites.mushrooms[Math.floor(r2 * sprites.mushrooms.length)], gx, gy + 1);
      else if (r < .79 && free > 12) {
        const len = 18 + Math.round(r2 * 10), end = Math.min(width - 2, x + len);
        let hi = Infinity, lo = -Infinity;
        for (let xx = x; xx <= end; xx += 2) { const yy = at(xx); hi = Math.min(hi, yy); lo = Math.max(lo, yy); }
        if (lo - hi < 3 && !covered(obstacle.x + (end - ox) / s, anchor + (at(end) - oy) / s - 2)) {
          const recorder = { fillStyle: '', fillRect(x0, y0, w0, h0) { batch.add(this.fillStyle, x0, y0, w0, h0); } };
          fallenLog(recorder, gx, Math.round(hi) - dy + 2, end - x, p); step = end - x + 4;
        }
      }
      x += step;
    }
    if (!placed.length && !batch.size()) return null;
    const { canvas, c } = makeCanvas(document, gw, gh);
    batch.flush(c);
    for (let i = 0; i < placed.length; i += 3) c.drawImage(placed[i].canvas, placed[i + 1], placed[i + 2]);
    return { canvas, dx, dy };
  }
}
