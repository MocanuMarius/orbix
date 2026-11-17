// Landform course generator (v2.1-courses-all): the default for all 48 biome courses; `?courses=1` gives the old authored cells.
//
// A course is composed from a short recipe: a seeded sequence of landform
// pieces (hills, dunes, mesas, cliffs, outcrops, caves, arches...). The pieces
// write one continuous ground profile, an optional ceiling profile, and a
// material per sample. Material decides the edge treatment: soil, sand and
// snow are smoothed and held under their angle of repose; rock and ice stay
// angular. The finished profiles are cut into ordinary flight obstacles
// (center, gap, topShape, bottomShape) so collision, pickups, light and the
// renderer consume them unchanged. Everything is measured in the 620-unit
// reference frame and scaled to the engine height on output.
//
// Engine contract kept: every terrain polygon is a height field (two closing
// points far off-frame, then the visible surface right-to-left), because the
// contact-edge union in terrain-boundary.mjs treats a floor as solid below its
// surface and a ceiling as solid above it. Floating bodies (islands, slabs with
// a lit underside and top) are therefore not expressible; see
// docs/course-design.md.

const URL_COURSES = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('courses'); } catch { return null; } })();
// Landform courses are the default for everyone; ?courses=1 brings back the old authored cells.
const URL_GENERATION = Number(URL_COURSES) === 1 ? 1 : 2;
// Tooling override lives on globalThis so every module instance (the game
// imports this file with a cache-busting query) sees the same value.
const OVERRIDE = Symbol.for('orbix.courseGeneration');
/** 2 = landform courses (default), 1 = the old authored cell courses (?courses=1). */
export function courseGeneration() { return globalThis[OVERRIDE] ?? URL_GENERATION; }
/** Test and pilot tooling only; the game reads the URL once. Pass null to clear. */
export function overrideCourseGeneration(value) { globalThis[OVERRIDE] = value == null ? undefined : Number(value) === 1 ? 1 : 2; }

export const FRAME = 620;
export const DX = 6;
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// Flight facts in 620 units (flight.mjs FLIGHT_TUNING, human-flight-planner).
export const FLIGHT_FACTS = Object.freeze({
  speed: 154, gravity: 300, lift: 205, terminal: 245, radius: 9.35,
  liftRise: 205 * 205 / 600,            // 70 units gained by one Lift from rest
  liftApexSeconds: 205 / 300,           // .68 s to the apex
  maxClimbSlope: 160 / 154,             // Lift every .30 s (pilot touch floor): 160 u/s
  steadyClimbSlope: .66,                // Lift at every apex: ~102 u/s
  reaction: { human150: .15, human250: .25 }, horizon: 1.65,
});

/** Rules a recipe must satisfy; validator thresholds in 620 units. */
export const RULES = Object.freeze({
  minGap: 205,          // ceiling to ground, ordinary stretch
  minGapHard: 175,      // ceiling to ground inside a challenge, after row scaling (pilot evidence)
  minBand: 225,         // ground to frame top in open sky, ordinary stretch
  minBandHard: 235,     // ground to frame top inside a sustained open-sky squeeze, after row scaling (pilot evidence)
  topMargin: 0,         // the kill plane is the frame top (body fully out = fall)
  roomNormal: 70, roomHard: 46,           // vertical room left in the slope-limited corridor
  climb: .66, climbHard: .92, descend: 1.25,
  cruise: 52,           // assumed height above ground while cruising
  maxStraight: 186,     // longest straight soft run (units), water/ruin/wood exempt
  rockAspect: .75,      // exposed rock width >= aspect * height (no needles)
  rockTop: 10,          // exposed rock crest at least this wide
});

export const MATERIALS = Object.freeze({
  soil:  { soft: true, repose: .70, sigma: 16, noise: 4.5, color: '#6f5a3f' },
  sand:  { soft: true, repose: .60, sigma: 13, noise: 3.0, color: '#c9a66b' },
  snow:  { soft: true, repose: .66, sigma: 16, noise: 3.2, color: '#dfe8ee' },
  scree: { soft: true, repose: .72, sigma: 12, noise: 5.5, color: '#857c72' },
  canopy:{ soft: true, repose: 1.8, sigma: 18, noise: 6.0, color: '#3f6b44' },
  water: { flat: true, color: '#3f7f9a' },
  rock:  { hard: true, color: '#59545a' },
  ice:   { hard: true, color: '#9fd3e6' },
  wood:  { firm: true, color: '#7a4f2c' },
  ruin:  { hard: true, straight: true, color: '#8f8a7a' },
});
const isSoft = m => !!MATERIALS[m]?.soft;

function hashSeed(seed) {
  let state = 2166136261;
  for (const char of String(seed)) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
  return state >>> 0;
}
export function landformRandom(seed) {
  let value = hashSeed(seed);
  return () => {
    value += 0x6d2b79f5; let n = value;
    n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
function valueNoise(seed) {
  const cache = new Map(), base = hashSeed(seed);
  const at = k => {
    if (!cache.has(k)) { let n = Math.imul(base ^ (k * 374761393), 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); cache.set(k, ((n ^ n >>> 16) >>> 0) / 4294967296 * 2 - 1); }
    return cache.get(k);
  };
  return (x, wave) => { const u = x / wave, k = Math.floor(u), t = u - k, s = t * t * (3 - 2 * t); return lerp(at(k), at(k + 1), s); };
}

// ---------------------------------------------------------------- field ----
class Field {
  constructor(x0, x1) {
    this.x0 = x0; this.n = Math.ceil((x1 - x0) / DX) + 1;
    const n = this.n;
    this.soft = new Float64Array(n).fill(NaN);
    this.rock = new Float64Array(n).fill(NaN);
    this.ceil = new Float64Array(n).fill(NaN);
    this.groundMat = new Array(n).fill('soil');
    this.rockMat = new Array(n).fill(null);
    this.ceilMat = new Array(n).fill(null);
    this.label = new Array(n).fill(null);
    this.ceilLabel = new Array(n).fill(null);
    this.piece = new Int32Array(n).fill(-1);
    this.water = new Float64Array(n).fill(NaN);
    this.ceilSpecs = [];
  }
  x(i) { return this.x0 + i * DX; }
  index(x) { return clamp(Math.round((x - this.x0) / DX), 0, this.n - 1); }
  setRock(i, y, mat = 'rock') { if (i < 0 || i >= this.n) return; if (!(this.rock[i] <= y)) { this.rock[i] = y; this.rockMat[i] = mat; } }
}

// Piecewise-linear profile through local vertices [u, v] (u in units from the
// feature origin, v negative = up), used for angular rock bodies.
function polyline(vertices, u) {
  if (u <= vertices[0][0] || u >= vertices.at(-1)[0]) return NaN;
  for (let k = 1; k < vertices.length; k++) if (u <= vertices[k][0]) {
    const a = vertices[k - 1], b = vertices[k];
    return lerp(a[1], b[1], (u - a[0]) / (b[0] - a[0] || 1));
  }
  return NaN;
}

// Angular rock body with a broad base, blunt crest and a buried skirt.
function rockBody(rng, w, h, { lean = 0 } = {}) {
  // A broad, faceted boulder: skirt buried below the soil line, two shoulders,
  // a blunt crest set off-centre (the side facing the weather is steeper).
  const half = w / 2, crest = clamp(.5 + lean * .3 + (rng() - .5) * .12, .3, .7), topW = w * (.18 + rng() * .14);
  const verts = [[-half, h * .25],
    [-half + w * (.08 + rng() * .06), -h * (.42 + rng() * .16)],
    [-half + w * crest - topW * .5 - w * (.06 + rng() * .06), -h * (.82 + rng() * .1)],
    [-half + w * crest - topW * .5, -h],
    [-half + w * crest + topW * .5, -h * (.93 + rng() * .07)],
    [-half + w * crest + topW * .5 + w * (.05 + rng() * .07), -h * (.7 + rng() * .14)],
    [half - w * (.07 + rng() * .06), -h * (.3 + rng() * .16)],
    [half, h * .25]];
  return verts.sort((a, b) => a[0] - b[0]);
}

// ---------------------------------------------------------------- pieces ---
// Each piece writes samples [i0, i1) and returns the ground level it leaves.
// `ctx.level` is the landmass level (y, down positive) the piece starts from.
function ramp(from, to, t, ease = smooth) { return lerp(from, to, ease(t)); }
const PIECES = {
  plain(f, i0, i1, ctx, p) {
    const to = p.level ?? ctx.level, n = i1 - i0, rampN = Math.min(n, Math.ceil(Math.max(240, Math.abs(to - ctx.level) / .38) / DX));
    for (let i = i0; i < i1; i++) f.soft[i] = ramp(ctx.level, to, (i - i0) / rampN);
    return to;
  },
  hills(f, i0, i1, ctx, p, rng) {
    const to = p.level ?? ctx.level, amp = p.amp ?? 40, wave = p.wave ?? 720, n = i1 - i0;
    const ph1 = rng() * TAU, ph2 = rng() * TAU, rampN = Math.min(n, Math.ceil(Math.max(300, Math.abs(to - ctx.level) / .36) / DX));
    for (let i = i0; i < i1; i++) {
      const x = f.x(i), t = (i - i0) / n, env = smooth(t / .18) * smooth((1 - t) / .18);
      const shape = .5 + .32 * Math.sin(TAU * x / wave + ph1) + .18 * Math.sin(TAU * x / (wave * .47) + ph2);
      f.soft[i] = ramp(ctx.level, to, (i - i0) / rampN) - amp * env * clamp(shape, 0, 1);
    }
    return to;
  },
  dunes(f, i0, i1, ctx, p, rng) {
    // Wind from the left: long windward ramps, short slip faces at repose.
    const to = p.level ?? ctx.level, amp = p.amp ?? 54, wave = p.wave ?? 520, n = i1 - i0;
    const rampN = Math.min(n, Math.ceil(Math.max(300, Math.abs(to - ctx.level) / .36) / DX));
    let start = f.x(i0) + wave * (.2 + rng() * .3); const dunes = [];
    while (start < f.x(i1 - 1)) { const w = wave * (.75 + rng() * .5); dunes.push({ start, w, a: Math.min(amp * (.65 + rng() * .5), w * .26 * .6) }); start += w * (.82 + rng() * .3); }
    for (let i = i0; i < i1; i++) {
      const x = f.x(i), t = (i - i0) / n, env = smooth(t / .12) * smooth((1 - t) / .12);
      let lift = 0;
      for (const d of dunes) {
        const u = (x - d.start) / d.w; if (u <= 0 || u >= 1) continue;
        const crest = .74, prof = u < crest ? Math.pow(u / crest, 1.35) : 1 - smooth((u - crest) / (1 - crest));
        lift = Math.max(lift, d.a * prof);
      }
      f.soft[i] = ramp(ctx.level, to, (i - i0) / rampN) - lift * env;
    }
    return to;
  },
  climb(f, i0, i1, ctx, p, rng) {
    // A long rise of the landmass with a few benches; soft, under repose.
    const to = p.to, n = i1 - i0, ph = rng() * TAU;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / n;
      const bench = .06 * Math.sin(TAU * t * (p.benches ?? 2) + ph) * Math.sin(Math.PI * t);
      f.soft[i] = lerp(ctx.level, to, clamp(smooth(t) + bench, 0, 1));
    }
    return to;
  },
  terraces(f, i0, i1, ctx, p, rng) {
    // Level strata: equal risers, rounded (soil) or angular (rock) lips.
    const steps = p.steps ?? 3, n = i1 - i0, to = p.to ?? ctx.level - (p.rise ?? -40) * steps;
    const rise = (to - ctx.level) / steps, rock = p.material === 'rock';
    const riserW = Math.abs(rise) / (rock ? 1.5 : .55), tread = (n * DX - riserW * steps) / (steps + .5);
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) * DX; let y = ctx.level;
      for (let k = 0; k < steps; k++) {
        const s0 = tread * (k + .5) + riserW * k, t = (u - s0) / riserW;
        if (t > 0) y += rise * (rock ? clamp(t, 0, 1) : smooth(t));
      }
      f.soft[i] = y;
      if (rock) {
        // Bedrock shows in each riser and along its lip; drifted ground covers the treads.
        let lip = Infinity;
        for (let k = 0; k < steps; k++) { const s0 = tread * (k + .5) + riserW * k; lip = Math.min(lip, Math.abs(u - (s0 + riserW * .5)) - riserW * .5); }
        if (lip < 46) f.setRock(i, y - 3 - 2.5 * Math.abs(Math.sin(u / 19)) - (lip < 0 ? 0 : 4 * (1 - lip / 46)), 'rock');
      }
    }
    return to;
  },
  basin(f, i0, i1, ctx, p) {
    // A low wide dip; the flat middle is a water line.
    const n = i1 - i0, depth = p.depth ?? 70, bank = Math.max(p.bank ?? 240, depth / .42), level = ctx.level;
    const waterY = level + depth;
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) * DX, L = n * DX;
      const t = Math.min(u / bank, (L - u) / bank);
      f.soft[i] = level + depth * smooth(t);
      if (p.water !== false && t >= 1) { f.water[i] = waterY; f.groundMat[i] = 'water'; }
    }
    return level;
  },
  mesa(f, i0, i1, ctx, p, rng) {
    // A caprock band (near-vertical) over a broken slope, with a slightly
    // uneven flat top; talus heaps form at the feet afterwards.
    const n = i1 - i0, h = p.h ?? 140, L = n * DX, inset = p.inset ?? 60, ph = rng() * TAU;
    const cap = h * (.32 + rng() * .1), capW = cap / 3.6, bench = 8 + rng() * 10, slopeW = (h - cap) / (p.steep ?? 1.9);
    const face = slopeW + bench + capW, top = ctx.level - h;
    // Big mesas show a second, eroded shoulder on one flank.
    const shoulderSide = rng() < .5 ? -1 : 1, shoulderW = h > 150 ? 50 + rng() * 40 : 0, shoulderH = h * (.42 + rng() * .12);
    const profile = e => e < slopeW ? (e / slopeW) * (h - cap) : e < slopeW + bench ? h - cap + 3 * ((e - slopeW) / bench)
      : e < face ? h - cap + 3 + (cap - 3) * ((e - slopeW - bench) / capW) : h;
    for (let i = i0; i < i1; i++) {
      f.soft[i] = ctx.level;
      const u = (i - i0) * DX;
      if (u < inset || u > L - inset) continue;
      let e = Math.min(u - inset, L - inset - u);
      const onShoulder = shoulderW && ((shoulderSide < 0) === (u - inset < L - inset - u));
      if (onShoulder) {
        const sw = shoulderW, lowFace = shoulderH / 1.7;
        if (e < lowFace) { f.setRock(i, ctx.level - shoulderH * e / lowFace, p.material || 'rock'); continue; }
        if (e < lowFace + sw) { f.setRock(i, ctx.level - shoulderH - 3 * Math.sin(u / 13), p.material || 'rock'); continue; }
        e -= lowFace + sw - (h - cap) / (p.steep ?? 1.9) * shoulderH / (h - cap);
      }
      const y = e < face ? ctx.level - profile(e) : top + 2.5 * Math.sin(u / 37 + ph) + 1.5 * Math.sin(u / 11 + 1.3) - 3 * Math.sin(Math.PI * (u - inset - face) / Math.max(1, L - 2 * inset - 2 * face));
      f.setRock(i, y, p.material || 'rock');
    }
    return ctx.level;
  },
  cliff(f, i0, i1, ctx, p, rng) {
    // A rock step between two ground levels; talus heaps at its foot.
    const n = i1 - i0, h = p.h ?? 110, up = p.dir !== 'down', to = ctx.level + (up ? -h : h);
    const face = h / (p.steep ?? 2.6), L = n * DX, at = p.at ?? (up ? .45 : .4), cap = p.cap ?? 180;
    const xc = L * at;
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) * DX;
      if (up) {
        const t = (u - (xc - face)) / face; // face rises toward the right
        f.soft[i] = u < xc ? lerp(ctx.level, to, smooth((u - (xc - face * 2.2)) / (face * 2.6))) : to;
        if (u > xc - face && u < xc + cap) f.setRock(i, u < xc ? lerp(ctx.level, to, clamp(t, 0, 1)) - 2 : to - 3 - 2 * Math.sin(u / 17 + 2), 'rock');
      } else {
        const t = (u - xc) / face;
        f.soft[i] = u > xc ? lerp(ctx.level, to, smooth((u - xc + face * .2) / (face * 2.8))) : ctx.level;
        if (u > xc - cap && u < xc + face) f.setRock(i, u > xc ? lerp(ctx.level, to, clamp(t, 0, 1)) - 2 : ctx.level - 3 - 2 * Math.sin(u / 19 + 1), 'rock');
      }
    }
    void rng;
    return to;
  },
  highland(f, i0, i1, ctx, p, rng) {
    // The landmass climbs until the open sky above it is a narrow band, holds,
    // then falls away: an open-sky squeeze with no ceiling at all.
    const n = i1 - i0, L = n * DX, top = p.band, climbLen = Math.max(p.climb ?? 520, Math.abs(ctx.level - top) / .48);
    const fall = Math.max(p.fall ?? 420, Math.abs((p.to ?? ctx.level) - top) / .62), to = p.to ?? ctx.level;
    const ph = rng() * TAU;
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) * DX; let y;
      if (u < climbLen) y = lerp(ctx.level, top, smooth(u / climbLen));
      else if (u > L - fall) y = lerp(top, to, smooth((u - (L - fall)) / fall));
      else y = top + (p.undulate ?? 10) * (.5 + .5 * Math.sin(TAU * u / 380 + ph));
      f.soft[i] = y;
    }
    return to;
  },
  rugged(f, i0, i1, ctx, p, rng) {
    // A mountain mass of scree/snow: several summits with saddles between,
    // each summit crowned with small blunt rock teeth. `band` is the highest
    // summit's ground line; saddles sit `relief` lower.
    const n = i1 - i0, L = n * DX, top = p.band ?? ctx.level - (p.h ?? 150), relief = p.relief ?? 52;
    const climbLen = Math.max(p.climb ?? 520, Math.abs(ctx.level - top) / .5), to = p.to ?? ctx.level;
    const fall = Math.max(p.fall ?? 460, Math.abs(to - top) / .6), mass = p.material || 'scree';
    const mid = Math.max(1, L - climbLen - fall), summits = Math.max(2, Math.round(mid / (p.wave ?? 420)) + 1);
    const crest = Array.from({ length: summits }, (_, k) => ({ c: climbLen + mid * k / (summits - 1), h: k === 0 || rng() < .5 ? 1 : .7 + rng() * .25 }));
    const summitAt = x => { let best = 0; for (const c of crest) best = Math.max(best, c.h * Math.max(0, 1 - ((x - c.c) / (mid / (summits - 1) * .62)) ** 2)); return best; };
    const peaks = []; let u = climbLen * .6;
    while (u < L - fall * .4) { const w = 60 + rng() * 80; peaks.push({ c: u + w / 2, w, h: (p.amp ?? 34) * (.4 + rng() * .7) }); u += w * (.7 + rng() * .5); }
    for (let i = i0; i < i1; i++) {
      const x = (i - i0) * DX;
      const ridge = top + relief * (1 - summitAt(x));
      let y;
      if (x < climbLen) y = lerp(ctx.level, ridge, smooth(x / climbLen));
      else if (x > L - fall) y = lerp(ridge, to, smooth((x - (L - fall)) / fall));
      else y = ridge;
      f.soft[i] = y; f.groundMat[i] = mass;
      let peak = 0;
      const crown = .35 + .65 * summitAt(x);
      for (const k of peaks) {
        const d = Math.abs(x - k.c) / (k.w / 2); if (d >= 1) continue;
        // Blunt triangular tooth with a broken flank, larger on the summits.
        const tooth = d < .16 ? 1 - d * .4 : (1 - d) / .84 * .936;
        peak = Math.max(peak, k.h * crown * tooth * (1 + .08 * Math.sin(x / 7 + k.c)));
      }
      if (peak > 3) f.setRock(i, y + 6 - peak, p.rock || 'rock');
    }
    return to;
  },
  outcrops(f, i0, i1, ctx, p, rng) {
    // Hard angular boulders standing out of round soft ground.
    const to = p.level ?? ctx.level, n = i1 - i0, L = n * DX;
    const rampN = Math.min(n, Math.ceil(Math.max(240, Math.abs(to - ctx.level) / .38) / DX));
    for (let i = i0; i < i1; i++) f.soft[i] = ramp(ctx.level, to, (i - i0) / rampN) - (p.swell ?? 14) * Math.sin(Math.PI * (i - i0) / n) ** 2;
    const count = p.count ?? 3, sizes = p.size ?? [50, 90];
    const slots = Array.from({ length: count }, (_, k) => L * (k + .5 + (rng() - .5) * .5) / count);
    for (const c of slots) {
      const h = lerp(sizes[0], sizes[1], rng()), w = h * (1.7 + rng() * .8);
      const body = rockBody(rng, w, h, { lean: rng() - .5 });
      const ic = i0 + Math.round(c / DX), base = f.soft[clamp(ic, i0, i1 - 1)];
      for (let i = Math.max(i0, ic - Math.ceil(w / DX)); i < Math.min(i1, ic + Math.ceil(w / DX)); i++) {
        const v = polyline(body, (i - ic) * DX); if (Number.isFinite(v)) f.setRock(i, base + v, p.material || 'rock');
      }
    }
    return to;
  },
  stacks(f, i0, i1, ctx, p, rng) {
    // Sea stacks: broad-based rock pillars standing in a flat water basin.
    const n = i1 - i0, L = n * DX, depth = p.depth ?? 60, bank = Math.max(220, depth / .4);
    const waterY = ctx.level + depth;
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) * DX, t = Math.min(u / bank, (L - u) / bank);
      f.soft[i] = ctx.level + depth * smooth(t);
      if (t >= 1) { f.water[i] = waterY; f.groundMat[i] = 'water'; }
    }
    const count = p.count ?? 2;
    for (let k = 0; k < count; k++) {
      const c = bank + (L - 2 * bank) * (k + .5) / count + (rng() - .5) * 60;
      const h = (p.h ?? 150) * (.7 + rng() * .45), w = Math.max(h * 1.0, 80);
      const verts = [[-w / 2, 30], [-w * .42, -h * .55], [-w * .3, -h * .93], [-w * .05, -h], [w * .22, -h * .96], [w * .36, -h * .6], [w / 2, 30]];
      const ic = i0 + Math.round(c / DX);
      for (let i = ic - Math.ceil(w / DX); i <= ic + Math.ceil(w / DX); i++) {
        if (i < i0 || i >= i1) continue;
        const v = polyline(verts, (i - ic) * DX); if (Number.isFinite(v)) f.setRock(i, waterY + v, p.material || 'rock');
      }
    }
    return ctx.level;
  },
  log(f, i0, i1, ctx, p, rng) {
    // A fallen giant lying along the ground: straight trunk, root plate.
    const to = p.level ?? ctx.level, n = i1 - i0, L = n * DX;
    for (let i = i0; i < i1; i++) f.soft[i] = ramp(ctx.level, to, (i - i0) / n);
    const len = Math.min(L * .7, p.len ?? 420), h = p.h ?? 46, a = L * .18, b = a + len;
    const ya = f.soft[i0 + Math.round(a / DX)], yb = f.soft[i0 + Math.round(b / DX)];
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) * DX; if (u < a - h * .9 || u > b + h * .4) continue;
      const t = clamp((u - a) / len, 0, 1), base = lerp(ya, yb, t) + h * .25;
      let top;
      if (u < a) { const d = (a - u) / (h * .9); top = base - h * 1.75 * Math.sqrt(Math.max(0, 1 - d * d)) - 4 * Math.sin(u / 5); }
      else if (u > b) { const d = (u - b) / (h * .4); top = base - h * Math.sqrt(Math.max(0, 1 - d * d)); }
      else top = base - h * (1 - .08 * t) - 1.2 * Math.sin(u / 13 + rng() * 0);
      f.setRock(i, top, 'wood');
    }
    return to;
  },
  ruin(f, i0, i1, ctx, p) {
    const n = i1 - i0, L = n * DX, w = p.w ?? 120, h = p.h ?? 80, c = L * (p.at ?? .5);
    for (let i = i0; i < i1; i++) {
      f.soft[i] = ctx.level;
      const u = (i - i0) * DX - c; if (Math.abs(u) > w / 2) continue;
      const broken = u > w * .1 ? h * (.62 + .1 * ((Math.floor(u / 12) % 2))) : h;
      f.setRock(i, ctx.level + 12 - broken, 'ruin');
    }
    return ctx.level;
  },
  // ---- overhead forms: evaluated after the ground is final (relative to it).
  cave(f, i0, i1, ctx, p, rng) {
    // A passage through a hillside. The roof rises and falls on its own,
    // stalactites hang in clusters at a few drip lines, and each drip line
    // has a low stalagmite mound below it. The mouths are angular rock faces
    // descending from the mountain mass beyond the frame top.
    const gap = p.gap ?? 230, mouth = p.mouth ?? 260, n = i1 - i0, L = n * DX;
    const level = p.level ?? ctx.level, wobble = valueNoise(`${rng()}:cave-roof`);
    const drips = [];
    for (let u = mouth + 160 + rng() * 140; u < L - mouth - 120; u += 340 + rng() * 300) {
      const cones = []; let c = u - 40;
      const count = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < count; k++) { const len = (p.stal ?? 40) * (.45 + rng() * .65); cones.push({ c, len, w: Math.max(18, len * (.8 + rng() * .5)) }); c += 22 + rng() * 26; }
      drips.push({ u, cones, mound: 10 + rng() * 14, moundW: 60 + rng() * 40 });
    }
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) * DX;
      let y = ramp(ctx.level, level, (i - i0) / Math.min(n, 50)) - (p.swell ?? 10) * Math.sin(Math.PI * (i - i0) / n);
      for (const d of drips) { const t = Math.abs(u - d.u) / d.moundW; if (t < 1) y -= d.mound * (1 - t * t) ** 2; }
      f.soft[i] = y;
    }
    // Roof vertices every ~44 units: angular, irregular, independent of the floor.
    const verts = []; for (let u = 0; u <= L + 44; u += 34 + rng() * 20) verts.push([u, (p.vary ?? 46) * (wobble(u, 260) * .7 + (rng() - .5) * .3)]);
    // Mouth faces as fractions of the drop from beyond the frame to the roof.
    const face = () => [[-.01, 0], [.2, .16 + rng() * .14], [.4, .4 + rng() * .14], [.58, .6 + rng() * .12], [.76, .82 + rng() * .08], [.9, .94], [1.01, 1]];
    const mouthL = face(), mouthR = face();
    f.ceilSpecs.push({ i0, i1, label: p.label || 'cave', material: p.material || 'rock', fn(floorSm, i) {
      const u = (i - i0) * DX, edge = Math.min(u, L - u);
      const roof = floorSm - gap - (p.vary ?? 46) * .5 + polyline(verts, u);
      if (edge < mouth) {
        // A faceted face: steep upper rock, a broken brow over the entry.
        const side = u < L / 2 ? mouthL : mouthR;
        return lerp(-60, roof, polyline(side, edge / mouth));
      }
      let y = roof;
      for (const d of drips) for (const c of d.cones) {
        const off = Math.abs(u - c.c);
        if (off > c.w / 2) continue;
        const k = off / (c.w / 2), tip = k < .14 ? 1 : (1 - k) / .86; // blunt tip
        y = Math.max(y, roof + c.len * tip);
      }
      return y;
    } });
    return level;
  },
  arch(f, i0, i1, ctx, p) {
    // A natural bridge or arch whose deck lies beyond the frame top: its
    // underside springs low at both ends and rises to a crown.
    const n = i1 - i0, L = n * DX, level = p.level ?? ctx.level, span = Math.min(L * .8, p.span ?? 420);
    const clear = (p.clear ?? 240) + 28, rise = p.rise ?? 70, a = (L - span) / 2;
    for (let i = i0; i < i1; i++) f.soft[i] = ramp(ctx.level, level, (i - i0) / Math.min(n, 60)) - (p.swell ?? 12) * Math.sin(Math.PI * (i - i0) / n) ** 2;
    f.ceilSpecs.push({ i0: i0 + Math.floor(a / DX) - 20, i1: i0 + Math.ceil((a + span) / DX) + 20, label: p.label || 'arch', material: p.material || 'rock', fn(floorSm, i) {
      const u = (i - i0) * DX - a, t = u / span;
      const spring = floorSm - clear;
      // Beyond each springer the abutment curves up and away out of frame.
      if (t < 0 || t > 1) { const d = clamp((t < 0 ? -u : u - span) / 110, 0, 1); return spring - (spring + 80) * d ** 1.7; }
      return spring - rise * Math.sin(Math.PI * t) ** .8 - 3 * Math.sin(u / 23) - 6 * Math.sin(Math.PI * t * 3 + 1) * Math.sin(Math.PI * t);
    } });
    return level;
  },
  canopy(f, i0, i1, ctx, p, rng) {
    // Boughs of trees whose crowns are beyond the frame top: rounded lobes.
    const n = i1 - i0, L = n * DX, level = p.level ?? ctx.level;
    for (let i = i0; i < i1; i++) f.soft[i] = ramp(ctx.level, level, (i - i0) / Math.min(n, 60)) - (p.swell ?? 18) * Math.sin(Math.PI * (i - i0) / n) ** 2;
    const lobes = []; for (let u = 60; u < L - 260;) { const w = 150 + rng() * 120; if (u + w > L - 50) break; lobes.push({ c: u + w / 2, w, d: (p.depth ?? 120) * (.55 + rng() * .5) }); u += w * (.6 + rng() * .25); }
    f.ceilSpecs.push({ i0, i1, label: p.label || 'canopy', material: 'canopy', absolute: true, fn(floorSm, i) {
      const u = (i - i0) * DX; let y = -90;
      for (const l of lobes) { const d = (u - l.c) / (l.w / 2); if (Math.abs(d) < 1) y = Math.max(y, -30 + (l.d + 30) * Math.sqrt(1 - d * d)); }
      void floorSm; return y;
    } });
    return level;
  },
  shelf(f, i0, i1, ctx, p, rng) {
    // Hanging ice shelves: flat, slightly tilted undersides with short icicles.
    const n = i1 - i0, L = n * DX, level = p.level ?? ctx.level;
    for (let i = i0; i < i1; i++) f.soft[i] = ramp(ctx.level, level, (i - i0) / Math.min(n, 60)) - (p.swell ?? 12) * Math.sin(Math.PI * (i - i0) / n) ** 2;
    const depth = p.depth ?? 130, tilt = (rng() - .5) * .08;
    f.ceilSpecs.push({ i0, i1, label: p.label || 'ice shelf', material: 'ice', absolute: true, fn(floorSm, i) {
      const u = (i - i0) * DX, edge = Math.min(u, L - u);
      if (edge < 70) return lerp(-60, depth, clamp(edge / 70, 0, 1) ** .7);
      const icicle = (u % 47) < 14 ? 12 * (1 - Math.abs((u % 47) - 7) / 7) : 0;
      void floorSm; return depth + tilt * (u - L / 2) + icicle;
    } });
    return level;
  },
};
export const LANDFORM_KINDS = Object.freeze(Object.keys(PIECES));

// ------------------------------------------------------------ finishing ----
function gaussian(values, sigmaAt, mask) {
  const out = Float64Array.from(values), n = values.length;
  for (let i = 0; i < n; i++) {
    if (!mask(i)) continue;
    const s = sigmaAt(i) / DX; if (!(s > .3)) continue;
    const r = Math.ceil(s * 2.5); let sum = 0, w = 0;
    for (let k = -r; k <= r; k++) { const j = i + k; if (j < 0 || j >= n || !Number.isFinite(values[j])) continue; const g = Math.exp(-(k * k) / (2 * s * s)); sum += values[j] * g; w += g; }
    if (w) out[i] = sum / w;
  }
  return out;
}
// Angle of repose: soft ground cannot stand steeper; the excess slumps away.
function repose(values, slopeAt) {
  const n = values.length;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < n; i++) values[i] = Math.max(values[i], values[i - 1] - slopeAt(i) * DX);
    for (let i = n - 2; i >= 0; i--) values[i] = Math.max(values[i], values[i + 1] - slopeAt(i) * DX);
  }
}

function finishGround(f, seed) {
  const n = f.n, noise = valueNoise(`${seed}:ground-noise`);
  for (let i = 0; i < n; i++) {
    const m = MATERIALS[f.groundMat[i]];
    if (m?.soft) f.soft[i] += (m.noise ?? 3) * (.6 * noise(f.x(i), 150) + .4 * noise(f.x(i) + 999, 57));
  }
  // Natural slopes vary a little around the angle of repose, so a slumped
  // face is never a ruler-straight line.
  const vary = valueNoise(`${seed}:repose`);
  const slopeAt = i => (MATERIALS[f.groundMat[i]]?.repose ?? .7) * (.86 + .1 * vary(f.x(i), 90));
  repose(f.soft, slopeAt);
  f.soft = gaussian(f.soft, i => MATERIALS[f.groundMat[i]]?.sigma ?? 30, () => true);
  repose(f.soft, slopeAt);
  // Water lies flat at its line.
  for (let i = 0; i < n; i++) if (Number.isFinite(f.water[i])) f.soft[i] = f.water[i];
  // Talus: soft material heaps against the foot of each exposed rock body,
  // up to a third of that body's height, at its own angle of repose.
  const heap = Float64Array.from(f.soft);
  for (let i = 0; i < n;) {
    if (!(f.rock[i] < f.soft[i])) { i++; continue; }
    let j = i, H = 0; while (j < n && f.rock[j] < f.soft[j]) { H = Math.max(H, f.soft[j] - f.rock[j]); j++; }
    if (f.rockMat[i] === 'ruin' && H < 30) { i = j; continue; }
    for (const [foot, dir] of [[i, -1], [j - 1, 1]]) {
      if (f.groundMat[foot] === 'water') continue;
      const rep = MATERIALS[f.groundMat[foot]]?.repose ?? .7, cap = f.soft[foot] - H * .3;
      // A cone peaked at the foot, run outward until it meets the ground;
      // inward (under the rock) it is hidden and only needs a short reach.
      for (let k = 0, inward = Math.ceil(H * .3 / rep / DX) + 1; k <= inward; k++) {
        const q = foot - k * dir; if (q < 0 || q >= n || f.groundMat[q] === 'water') continue;
        heap[q] = Math.min(heap[q], cap + k * DX * rep);
      }
      for (let k = 1; ; k++) {
        const q = foot + k * dir; if (q < 0 || q >= n || f.groundMat[q] === 'water') break;
        const cone = cap + k * DX * rep; if (cone >= f.soft[q]) break;
        heap[q] = Math.min(heap[q], cone);
      }
    }
    i = j;
  }
  // Round the heaps: sand and soil never keep a knife-edge crest.
  f.soft = gaussian(heap, i => Math.max(9, (MATERIALS[f.groundMat[i]]?.sigma ?? 12) * 1.1), q => !(f.rock[q] < heap[q]) && f.groundMat[q] !== 'water');
  for (let i = 0; i < n; i++) if (Number.isFinite(f.water[i])) f.soft[i] = Math.min(f.soft[i], f.water[i]);
  // Rock texture: a fine jagged edge, never smoothed.
  const rough = valueNoise(`${seed}:rock-noise`);
  for (let i = 0; i < n; i++) if (Number.isFinite(f.rock[i]) && f.rockMat[i] !== 'ruin' && f.rockMat[i] !== 'wood')
    f.rock[i] += 1.6 * rough(f.x(i), 13) + .9 * rough(f.x(i) + 77, 5);
  const floor = new Float64Array(n), mat = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = f.rock[i];
    if (Number.isFinite(r) && r < f.soft[i] - .5) { floor[i] = r; mat[i] = f.rockMat[i]; } else { floor[i] = f.soft[i]; mat[i] = f.groundMat[i]; }
  }
  return { floor, mat };
}

function finishCeiling(f, floor, seed) {
  const n = f.n, ceil = new Float64Array(n).fill(NaN), mat = new Array(n).fill(null), label = new Array(n).fill(null), off = new Array(n).fill(false);
  // Overheads follow the landmass, not every pebble.
  const broad = gaussian(floor, () => 90, () => true);
  for (const spec of f.ceilSpecs) for (let i = Math.max(0, spec.i0); i < Math.min(n, spec.i1); i++) {
    const y = spec.fn(broad[i], i, floor[i]);
    if (!Number.isFinite(y)) continue;
    if (!(ceil[i] >= y)) { ceil[i] = y; mat[i] = spec.material; label[i] = spec.label; }
  }
  const rough = valueNoise(`${seed}:ceil-noise`);
  for (let i = 0; i < n; i++) if (Number.isFinite(ceil[i]) && mat[i] !== 'canopy') ceil[i] += 1.4 * rough(f.x(i), 11);
  const soft = gaussian(ceil, () => 14, i => mat[i] === 'canopy' && Number.isFinite(ceil[i]));
  for (let i = 0; i < n; i++) if (mat[i] === 'canopy') ceil[i] = soft[i];
  // Anything above the frame top is the overhead's unseen support.
  for (let i = 0; i < n; i++) if (Number.isFinite(ceil[i]) && ceil[i] < -2) { ceil[i] = NaN; mat[i] = null; label[i] = null; off[i] = true; }
  return { ceil, mat, label, off };
}

// --------------------------------------------------------------- pacing ----
/** Lay out the recipe's phrases along the course: intro, challenge windows
 * spaced evenly with rest phrases between, and an outro that settles to the
 * low exit landing. Returns placed pieces with absolute [x0, x1). */
export function paceRecipe(recipe, { extent, windows, rng, start = -260 }) {
  const placed = [], phrases = recipe.challenge, rest = recipe.rest;
  let x = start;
  const put = (piece, role, phrase, len = piece[1].len ?? 600) => { placed.push({ kind: piece[0], params: piece[1], role, phrase, x0: x, x1: x + len }); x += len; };
  const phraseLen = list => list.reduce((s, [, q]) => s + (q.len ?? 600), 0);
  for (const piece of recipe.intro) put(piece, 'intro', 'intro');
  const outroLen = phraseLen(recipe.outro), end = extent + 160, introEnd = x;
  // Fit as many challenge windows as the length allows, evenly spaced.
  let count = windows, lens = [];
  for (; count > 0; count--) { lens = Array.from({ length: count }, (_, w) => phraseLen(phrases[w % phrases.length])); if (lens.reduce((a, b) => a + b, 0) + (rest.length ? 900 : 0) * count <= end - outroLen - introEnd) break; }
  const spare = end - outroLen - introEnd - lens.reduce((a, b) => a + b, 0);
  let restCursor = Math.floor(rng() * Math.max(1, rest.length)), before = 0;
  for (let w = 0; w < count; w++) {
    const target = introEnd + spare * (w + .62) / (count + .24) + before;
    while (rest.length && x + phraseLen([rest[restCursor % rest.length]]) * .5 < target) { put(rest[restCursor % rest.length], 'rest', `rest-${w}`); restCursor++; }
    for (const piece of phrases[w % phrases.length]) put(piece, 'challenge', `challenge-${w}`);
    before += lens[w];
  }
  while (rest.length && x + phraseLen([rest[restCursor % rest.length]]) <= end - outroLen) { put(rest[restCursor % rest.length], 'rest', 'rest-tail'); restCursor++; }
  // Stretch or add the final rest piece to meet the outro exactly.
  const gapLeft = end - outroLen - x;
  if (gapLeft > 0) put(gapLeft > 260 ? ['hills', { len: gapLeft, amp: 12, wave: 600 }] : ['plain', { len: gapLeft }], 'rest', 'rest-tail', gapLeft);
  for (const piece of recipe.outro) put(piece, 'outro', 'outro');
  return placed;
}

// --------------------------------------------------------------- compose ---
/** Compose the full course profile. Deterministic for (recipe, seed, options). */
export function composeCourse(recipe, { seed = 1, extent = 13500, windows = 2, hardGapScale = 1 } = {}) {
  const rng = landformRandom(`${seed}:${recipe.id}:landforms`);
  const placed = paceRecipe(recipe, { extent, windows, rng });
  const x0 = placed[0].x0, x1 = placed.at(-1).x1;
  const f = new Field(x0, x1);
  let level = recipe.start ?? 560;
  placed.forEach((piece, k) => {
    const i0 = f.index(piece.x0), i1 = Math.max(i0 + 2, f.index(piece.x1));
    const params = { ...piece.params };
    if (piece.role === 'challenge') {
      // Row pressure tightens squeezes; the validator holds the hard floor.
      for (const key of ['gap', 'clear']) if (params[key]) params[key] = Math.max(RULES.minGapHard + 6, params[key] * hardGapScale);
      // Open-sky squeezes do not tighten with row: in the dark a high ground
      // line is only seen within the wisp's light (pilot evidence, see docs).
      if (params.band) params.band = Math.max(RULES.minBandHard + 4, params.band);
    }
    const material = params.material || recipe.ground || 'soil';
    for (let i = i0; i < i1; i++) { f.groundMat[i] = piece.kind === 'rugged' ? (params.material || 'scree') : material; f.label[i] = params.label || piece.kind; f.piece[i] = k; }
    const before = f.ceilSpecs.length;
    level = PIECES[piece.kind](f, i0, i1, { level }, params, rng);
    for (let s = before; s < f.ceilSpecs.length; s++) f.ceilSpecs[s].piece = k;
    piece.i0 = i0; piece.i1 = i1; piece.levelOut = level;
  });
  for (let i = 0; i < f.n; i++) if (!Number.isFinite(f.soft[i])) f.soft[i] = level;
  const ground = finishGround(f, `${seed}:${recipe.id}`);
  const overhead = finishCeiling(f, ground.floor, `${seed}:${recipe.id}`);
  // Hard guarantee: an overhead never closes below the minimum gap; this is
  // reported, and the validator rejects a recipe that leans on it heavily.
  let ceilingTrim = 0;
  for (let i = 0; i < f.n; i++) {
    if (!Number.isFinite(overhead.ceil[i])) continue;
    const hard = placed[f.piece[i]]?.role === 'challenge', min = hard ? RULES.minGapHard : RULES.minGap;
    const limit = ground.floor[i] - min;
    if (overhead.ceil[i] > limit) { ceilingTrim = Math.max(ceilingTrim, overhead.ceil[i] - limit); overhead.ceil[i] = limit; }
  }
  const xs = Array.from({ length: f.n }, (_, i) => f.x(i));
  return { recipe, seed, xs, floor: ground.floor, floorMat: ground.mat, ceil: overhead.ceil, ceilMat: overhead.mat, ceilLabel: overhead.label, ceilOff: overhead.off,
    label: f.label, piece: Array.from(f.piece), placed, ceilingTrim, hardGapScale, soft: f.soft, rock: f.rock, groundMat: f.groundMat };
}

// -------------------------------------------------------------- validate ---
/** Plausibility and fairness checks. Returns { ok, errors, metrics }. */
export function validateCourse(course) {
  const { xs, floor, floorMat, ceil, placed, piece } = course, n = xs.length, errors = [];
  const R = FLIGHT_FACTS.radius, hardAt = i => placed[piece[i]]?.role === 'challenge';
  const top = i => Number.isFinite(ceil[i]) ? ceil[i] : RULES.topMargin;
  let minGap = Infinity, minGapX = 0, minBand = Infinity, minBandX = 0, tightestHard = Infinity;
  for (let i = 0; i < n; i++) {
    const gap = floor[i] - top(i), hard = hardAt(i), playing = xs[i] > 300 && floor[i] < FRAME - 4;
    if (!playing) continue;
    if (Number.isFinite(ceil[i])) { if (gap < minGap) { minGap = gap; minGapX = xs[i]; } if (gap < (hard ? RULES.minGapHard : RULES.minGap) - .5) errors.push({ rule: 'min-gap', x: xs[i], gap: +gap.toFixed(1) }); }
    else { if (gap < minBand) { minBand = gap; minBandX = xs[i]; } if (gap < (hard ? RULES.minBandHard : RULES.minBand) - .5) errors.push({ rule: 'min-band', x: xs[i], band: +gap.toFixed(1) }); }
    if (hard) tightestHard = Math.min(tightestHard, gap);
  }
  // Soft ground stays under its angle of repose.
  let maxSoftSlope = 0, maxRockSlope = 0;
  for (let i = 1; i < n; i++) {
    const s = Math.abs(floor[i] - floor[i - 1]) / DX, m = floorMat[i], mp = floorMat[i - 1];
    // Where a heap meets a rock face the corner belongs to the rock.
    const nearHard = [i - 2, i + 1].some(q => q >= 0 && q < n && !isSoft(floorMat[q]));
    if (isSoft(m) && isSoft(mp) && !nearHard) { maxSoftSlope = Math.max(maxSoftSlope, s); if (s > (MATERIALS[m].repose + .06)) errors.push({ rule: 'repose', x: xs[i], slope: +s.toFixed(2), material: m }); }
    else maxRockSlope = Math.max(maxRockSlope, s);
  }
  // No perfectly straight soft runs (only water, ruins and timber are straight).
  let run = 0;
  for (let i = 2; i < n; i++) {
    const m = floorMat[i], curve = Math.abs(floor[i] - 2 * floor[i - 1] + floor[i - 2]);
    if (isSoft(m) && curve < .004) run += DX; else run = 0;
    if (run > RULES.maxStraight) { errors.push({ rule: 'straight', x: xs[i] }); run = -1e9; }
  }
  // Exposed rock: broad base, blunt crest (no needles from flat soil).
  for (let i = 0; i < n;) {
    if (!MATERIALS[floorMat[i]]?.hard || floorMat[i] === 'ruin') { i++; continue; }
    let j = i; while (j < n && MATERIALS[floorMat[j]]?.hard) j++;
    const seg = floor.slice(i, j), crest = Math.min(...seg), base = Math.max(floor[Math.max(0, i - 1)], floor[Math.min(n - 1, j)]);
    const h = base - crest, w = (j - i) * DX, topW = seg.filter(y => y <= crest + 3).length * DX;
    if (h > 24 && w < RULES.rockAspect * h) errors.push({ rule: 'needle', x: xs[i], width: w, height: +h.toFixed(1) });
    if (h > 24 && topW < RULES.rockTop - DX) errors.push({ rule: 'sharp-crest', x: xs[i], top: topW });
    i = j;
  }
  // An overhead hangs from something: every ceiling run begins and ends
  // beyond the frame top (cave mouth, bridge abutment, bough, shelf root).
  for (let i = 0; i < n;) {
    if (!Number.isFinite(ceil[i])) { i++; continue; }
    let j = i; while (j < n && Number.isFinite(ceil[j])) j++;
    if (!course.ceilOff[i - 1] || !course.ceilOff[j]) errors.push({ rule: 'unsupported-ceiling', x: xs[i], start: +ceil[i].toFixed(1), end: +ceil[j - 1].toFixed(1) });
    i = j;
  }
  // Slope-limited corridor: a path exists whose climb and descent rates a
  // delayed human can fly, with vertical room left for an imprecise hop.
  const U = new Float64Array(n).fill(Infinity), D = new Float64Array(n).fill(-Infinity);
  const climb = i => (hardAt(i) ? RULES.climbHard : RULES.climb) * DX, fall = RULES.descend * DX;
  for (let i = n - 1; i >= 0; i--) {
    const fl = floor[i] - R - 10, cl = top(i) + R + 10;
    U[i] = Math.min(fl, i < n - 1 ? U[i + 1] + climb(i) : Infinity);
    D[i] = Math.max(cl, i < n - 1 ? D[i + 1] - fall : -Infinity);
  }
  let minRoom = Infinity, minRoomX = 0;
  for (let i = 0; i < n; i++) {
    if (xs[i] < 300 || floor[i] >= FRAME - 4) continue;
    const room = U[i] - D[i];
    if (room < minRoom) { minRoom = room; minRoomX = xs[i]; }
    if (room < (hardAt(i) ? RULES.roomHard : RULES.roomNormal)) errors.push({ rule: 'corridor', x: xs[i], room: +room.toFixed(1) });
  }
  // Lead-in: a crest first seen one human horizon ahead must be climbable
  // from a cruise height above the ground the player is over at that moment,
  // after a reaction delay, at 80% of the fastest Lift cadence.
  const H = Math.round(FLIGHT_FACTS.horizon * FLIGHT_FACTS.speed / DX), react = FLIGHT_FACTS.reaction.human250 * FLIGHT_FACTS.speed;
  const budget = RULES.cruise + FLIGHT_FACTS.maxClimbSlope * (H * DX - react) * .8;
  let minSlack = Infinity, minSlackX = 0;
  for (let j = H; j < n; j++) {
    if (xs[j] < 300 + H * DX || floor[j] >= FRAME - 4) continue;
    let low = -Infinity; for (let k = j - H; k < j; k++) low = Math.max(low, floor[k]);
    const rise = floor[j - H] - floor[j];
    const slack = (budget - rise) / FLIGHT_FACTS.speed / FLIGHT_FACTS.maxClimbSlope;
    if (slack < minSlack) { minSlack = slack; minSlackX = xs[j]; }
    if (rise > budget) errors.push({ rule: 'lead-in', x: xs[j], rise: +rise.toFixed(1) });
    void low;
  }
  if (course.ceilingTrim > 40) errors.push({ rule: 'ceiling-trim', amount: +course.ceilingTrim.toFixed(1) });
  const line = Array.from({ length: n }, (_, i) => clamp((U[i] + D[i]) / 2, top(i) + 50, floor[i] - 50));
  // Collapse repeated errors to the first few per rule.
  const byRule = {}; const kept = [];
  for (const e of errors) { byRule[e.rule] = (byRule[e.rule] || 0) + 1; if (byRule[e.rule] <= 3) kept.push(e); }
  return { ok: errors.length === 0, errors: kept, errorCounts: byRule,
    metrics: { minGap: Number.isFinite(minGap) ? +minGap.toFixed(1) : null, minGapX, minBand: Number.isFinite(minBand) ? +minBand.toFixed(1) : null, minBandX,
      tightestHard: Number.isFinite(tightestHard) ? +tightestHard.toFixed(1) : null, maxSoftSlope: +maxSoftSlope.toFixed(2), maxRockSlope: +maxRockSlope.toFixed(2),
      minRoom: +minRoom.toFixed(1), minRoomX, leadInSlackSeconds: +minSlack.toFixed(2), leadInSlackX: minSlackX, ceilingTrim: +course.ceilingTrim.toFixed(1),
      openSkyShare: +(Array.from(ceil).filter(v => !Number.isFinite(v)).length / n).toFixed(2) }, line };
}

// ------------------------------------------------------------- obstacles ---
function sliceBreaks(course) {
  const { xs, ceil, floor } = course, n = xs.length, breaks = [0];
  const target = Math.round(500 / DX), minLen = Math.round(150 / DX);
  let last = 0;
  for (let i = 1; i < n; i++) {
    const edge = Number.isFinite(ceil[i]) !== Number.isFinite(ceil[i - 1]);
    if ((edge && i - last >= 4) || i - last >= target) { breaks.push(i); last = i; }
  }
  if (n - 1 - last < minLen && breaks.length > 1 && !(Number.isFinite(ceil[n - 1]) !== Number.isFinite(ceil[last]))) breaks.pop();
  breaks.push(n - 1);
  // Refine until each slice's floor crest stays below its lowest ceiling.
  const out = [breaks[0]];
  for (let k = 1; k < breaks.length; k++) {
    const stack = [[out.at(-1), breaks[k]]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let fMin = Infinity, cMax = -Infinity;
      for (let i = a; i <= b; i++) { fMin = Math.min(fMin, floor[i]); if (Number.isFinite(ceil[i])) cMax = Math.max(cMax, ceil[i]); }
      if (fMin - cMax < 60 && b - a > 3) { const m = (a + b) >> 1; stack.push([m, b], [a, m]); continue; }
      out.push(b);
    }
  }
  return out;
}

/** Cut the finished profile into ordinary flight obstacles. */
export function courseObstacles(course, validation, { height = FRAME, identity = {}, ascent = {}, legs = [], rng = Math.random, firstId = 0 } = {}) {
  const s = height / FRAME, { xs, floor, ceil, floorMat, ceilMat, label, ceilLabel, placed, piece } = course;
  const line = validation.line, breaks = sliceBreaks(course), obstacles = [];
  for (let k = 1; k < breaks.length; k++) {
    const a = Math.max(0, breaks[k - 1] - 1), b = Math.min(xs.length - 1, breaks[k] + 1);
    const start = xs[a], end = xs[b], w = (end - start) / 3.25, ox = start + .8 * w;
    let fMin = Infinity, cMax = -Infinity, hasCeil = false, lineSum = 0, hard = false;
    for (let i = a; i <= b; i++) {
      fMin = Math.min(fMin, floor[i]); lineSum += line[i];
      if (Number.isFinite(ceil[i])) { hasCeil = true; cMax = Math.max(cMax, ceil[i]); }
      if (placed[piece[i]]?.role === 'challenge') hard = true;
    }
    const ceilCover = hasCeil ? Array.from({ length: b - a + 1 }, (_, j) => Number.isFinite(ceil[a + j])).filter(Boolean).length / (b - a + 1) : 0;
    const useCeil = hasCeil && ceilCover > .5;
    let center, gap;
    if (useCeil && fMin - cMax >= 24) { center = (fMin + cMax) / 2; gap = fMin - cMax; }
    else if (useCeil) { center = lineSum / (b - a + 1); gap = 24; }
    else { center = clamp(lineSum / (b - a + 1), 40, fMin - 40); gap = 2 * (fMin - center); }
    const bottomAnchor = center + gap / 2, topAnchor = center - gap / 2;
    const surface = [], roof = [], mats = [], roofMats = [];
    for (let i = b; i >= a; i--) {
      surface.push([(xs[i] - ox), (floor[i] - bottomAnchor) * s]);
      if (useCeil) roof.push([(xs[i] - ox), ((Number.isFinite(ceil[i]) ? ceil[i] : -80) - topAnchor) * s]);
    }
    for (let i = a; i <= b; i++) {
      const m = floorMat[i]; if (!mats.length || mats.at(-1)[2] !== m) mats.push([xs[i] - ox, xs[i] - ox, m]); else mats.at(-1)[1] = xs[i] - ox;
      if (useCeil) { const c = ceilMat[i] || 'rock'; if (!roofMats.length || roofMats.at(-1)[2] !== c) roofMats.push([xs[i] - ox, xs[i] - ox, c]); else roofMats.at(-1)[1] = xs[i] - ox; }
    }
    const mid = Math.round((a + b) / 2), role = placed[piece[mid]]?.role || 'rest';
    const landform = label[mid] || 'plain', leg = Math.max(0, legs.findIndex(l => ox >= l.start && ox < l.end));
    const dominant = mats.slice().sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0][2];
    const obstacle = {
      id: firstId + obstacles.length, x: ox, width: w, center: center * s, gap: gap * s, phase: rng() * TAU,
      pattern: `${identity.scene || 'landform'}-${landform}`, motion: 0, soft: false, destroyed: false, hit: false, passed: false,
      variation: obstacles.length % 4, levelId: identity.id, sectionId: null, hard, setpiece: landform, leg,
      ascentLevel: ascent.level, hardGapScale: hard ? ascent.hardGapScale ?? 1 : 1, landmark: `${identity.scene || 'landform'}-${landform}`,
      // No carved cache niches: a bowl cut into a continuous slope reads as a
      // notch. Landform courses carry their own lane pickups instead.
      cacheEligible: false, windShelter: hard && useCeil ? .32 : 1, shelterStart: ox - w * .15, shelterEnd: ox + w * 1.5,
      topShape: useCeil ? [[-.8 * w, -900 * s], [2.45 * w, -900 * s], ...roof] : null,
      bottomShape: [[-.8 * w, 900 * s], [2.45 * w, 900 * s], ...surface],
      // Optional metadata for scenery: what the ground is made of, per local span.
      courseGeneration: 2, landform, ceilingLandform: useCeil ? ceilLabel[mid] || null : null, role,
      terrainMaterial: { bottom: dominant, top: useCeil ? (roofMats[0]?.[2] || 'rock') : null },
      surfaceMaterials: { bottom: mats, top: useCeil ? roofMats : null },
    };
    obstacles.push(obstacle);
  }
  return obstacles;
}

/** Fuel along a good line through the landforms: low over open ground (a
 * reward for skimming the terrain), centred in squeezes, a richer light at the
 * exit of each challenge phrase. Same pickup format as the old cache lights. */
export function courseLanePickups(course, validation, obstacles, { height = FRAME, seed = 1, spacing = 560, start = 900, end = Infinity } = {}) {
  const s = height / FRAME, rng = landformRandom(`${seed}:${course.recipe.id}:lane`), { xs, floor, ceil, placed, piece } = course;
  const at = x => clamp(Math.round((x - xs[0]) / DX), 0, xs.length - 1), out = [];
  const exits = new Set(placed.filter((p, k) => p.role === 'challenge' && placed[k + 1]?.role !== 'challenge').map(p => Math.round(p.x1)));
  const clearAt = (x, y, r) => { for (let d = -r; d <= r; d += DX) { const i = at(x + d); if (floor[i] - y < r + 8) return false; const top = Number.isFinite(ceil[i]) ? ceil[i] : 0; if (y - top < r + 8) return false; } return true; };
  const add = (x, value, feature) => {
    const i = at(x), top = Number.isFinite(ceil[i]) ? ceil[i] : 0, open = !Number.isFinite(ceil[i]);
    const skim = floor[i] - 58 - rng() * 22, mid = validation.line[i];
    let y = open && floor[i] - top > 260 ? skim : mid;
    y = clamp(y, top + 42, floor[i] - 40);
    if (!clearAt(x, y, 22)) return;
    const owner = obstacles.find(o => x >= o.x - o.width * .8 && x <= o.x + o.width * 2.45);
    // Climb repayment is part of the landform, so the supply trimmers keep it
    // (challengeLandmark is the shared "authored, do not trim" marker).
    const keep = feature === 'landform-climb' || feature === 'landform-summit' ? { challengeLandmark: feature } : {};
    out.push({ id: `lane-${out.length}`, kind: 'light', x, y: y * s, value, feature, ...keep, fuel: true, anchor: owner?.id ?? null, pocket: false,
      laneRole: placed[piece[i]]?.role || 'rest', collected: false, attracted: false, phase: rng() * TAU });
  };
  for (let x = start + rng() * 120; x < Math.min(end, xs.at(-1) - 700); x += spacing * (.85 + rng() * .3)) add(x, 1, 'landform-lane');
  for (const x of exits) if (x > start && x < Math.min(end, xs.at(-1) - 700) && !out.some(p => Math.abs(p.x - (x + 90)) < 120)) add(x + 90, 3, 'landform-exit');
  // Climbing costs Lifts: one extra light for every 140 units the good line
  // rises inside a piece, spread along that piece.
  for (const p of placed) {
    let ascent = 0; const a0 = at(p.x0), a1 = at(p.x1);
    for (let i = a0 + 1; i <= a1; i++) ascent += Math.max(0, validation.line[i - 1] - validation.line[i]);
    const extra = Math.floor(ascent / 140);
    for (let k = 0; k < extra; k++) {
      const x = p.x0 + (p.x1 - p.x0) * (k + .5) / extra;
      if (x > start && x < Math.min(end, xs.at(-1) - 700) && !out.some(q => Math.abs(q.x - x) < 150)) add(x, 1, 'landform-climb');
    }
  }
  out.sort((a, b) => a.x - b.x);
  // A long climb is repaid at its top: a rich light where the ground levels out.
  for (const p of placed) {
    const x = p.kind === 'climb' ? p.x1 - 60 : ['highland', 'rugged'].includes(p.kind) ? p.x0 + Math.min(700, (p.x1 - p.x0) * .45) : null;
    if (x && x > start && x < Math.min(end, xs.at(-1) - 700) && !out.some(q => Math.abs(q.x - x) < 140)) add(x, 3, 'landform-summit');
  }
  return out.sort((a, b) => a.x - b.x);
}

/** Flight sections (intro / challenge / breather / outro) from placed phrases. */
export function courseSections(course, obstacles, { identity = {}, ascent = {}, elite = false, legs = [] } = {}) {
  const groups = [];
  for (const p of course.placed) { const g = groups.at(-1); if (g && g.phrase === p.phrase) g.x1 = p.x1; else groups.push({ phrase: p.phrase, role: p.role, x0: p.x0, x1: p.x1, kinds: [] }); groups.at(-1).kinds.push(p.params.label || p.kind); }
  const sections = [];
  for (const g of groups) {
    const kind = g.role === 'challenge' ? 'challenge' : g.role === 'intro' ? 'intro' : g.role === 'outro' ? 'outro' : 'breather';
    const hard = kind === 'challenge', id = `${identity.id}:landform:${kind}:${sections.length}`;
    const members = obstacles.filter(o => o.x >= g.x0 && o.x < g.x1);
    if (!members.length) continue;
    for (const o of members) o.sectionId = id;
    const leg = Math.max(0, legs.findIndex(l => g.x0 >= l.start && g.x0 < l.end));
    sections.push({ id, name: hard ? course.recipe.name : kind === 'intro' ? `${identity.name || ''} approach` : `${identity.name || ''} breathing room`,
      start: members[0].x - members[0].width * .8, end: members.at(-1).x + members.at(-1).width * 2.45, kind, hard,
      difficulty: hard ? elite ? 3 : Math.min(3, 2 + ((ascent.level || 1) - 1) * .25) : 0, ascentLevel: ascent.level,
      hardGapScale: hard ? ascent.hardGapScale ?? 1 : 1, leg, setpiece: identity.motif, landmark: identity.scene,
      warningStart: members[0].x - members[0].width * .8 - 180, windShelter: Math.min(...members.map(o => o.windShelter)),
      landforms: [...new Set(g.kinds)] });
  }
  return sections;
}

// ---------------------------------------------------------------- recipes --
// Each recipe replaces the geometry of one existing course slot (same identity,
// scenery and biome rule) unless ?courses=1 is set. The first eight are hand-tuned
// prototypes; the other forty follow below.
const HAND_RECIPES = Object.freeze({
  // ---- Glasswind Dunes (desert): sand, sandstone mesas, arches, open sky.
  'desert-dune-trough': {
    id: 'v2-dune-sea', biome: 'desert', type: 'open-sky', name: 'The Dune Sea', ground: 'sand', start: 560,
    summary: 'Open sky over dunes: skim long windward ramps, drop off slip faces, then hop a flat-topped mesa.',
    intro: [['plain', { len: 520, level: 545 }], ['dunes', { len: 1300, level: 530, amp: 52, wave: 560 }]],
    challenge: [
      [['dunes', { len: 600, level: 505, amp: 60, wave: 520 }], ['mesa', { len: 900, h: 180, label: 'mesa' }], ['dunes', { len: 500, level: 520, amp: 46 }]],
      [['mesa', { len: 640, h: 140, label: 'butte' }], ['dunes', { len: 520, level: 515, amp: 56 }], ['mesa', { len: 1000, h: 190, label: 'mesa' }]],
    ],
    rest: [['dunes', { len: 1200, level: 535, amp: 48, wave: 600 }], ['plain', { len: 520, level: 548 }], ['dunes', { len: 1000, level: 525, amp: 56, wave: 500 }]],
    outro: [['dunes', { len: 700, level: 560, amp: 30 }], ['plain', { len: 520, level: 650 }]],
  },
  'desert-sand-temple': {
    id: 'v2-arch-gorge', biome: 'desert', type: 'gorge', name: 'The Arch Gorge', ground: 'sand', start: 560,
    summary: 'A sandstone gorge with open sky: thread under two natural arches between rock benches.',
    intro: [['plain', { len: 520, level: 540 }], ['terraces', { len: 900, steps: 2, to: 500, material: 'rock', label: 'rock benches' }]],
    challenge: [
      [['arch', { len: 760, clear: 245, rise: 60, span: 470, label: 'natural arch' }], ['dunes', { len: 520, level: 510, amp: 40 }], ['arch', { len: 680, clear: 240, rise: 55, span: 400, label: 'natural arch' }]],
      [['terraces', { len: 700, steps: 2, to: 450, material: 'rock', label: 'rock benches' }], ['arch', { len: 760, clear: 245, rise: 70, span: 460, label: 'natural arch' }], ['terraces', { len: 700, steps: 2, to: 520, material: 'rock', label: 'rock benches' }]],
    ],
    rest: [['dunes', { len: 1100, level: 525, amp: 44, wave: 560 }], ['outcrops', { len: 800, count: 2, size: [36, 60], level: 530 }], ['plain', { len: 500, level: 540 }]],
    outro: [['plain', { len: 520, level: 560 }], ['plain', { len: 520, level: 650 }]],
  },
  'desert-obelisk-walk': {
    id: 'v2-hoodoo-field', biome: 'desert', type: 'open-sky', name: 'The Hoodoo Field', ground: 'sand', start: 560,
    summary: 'Hard dark sandstone boulders and hoodoos stand out of soft sand; hop each one, glide between.',
    intro: [['plain', { len: 520, level: 545 }], ['outcrops', { len: 900, count: 2, size: [40, 70], level: 535 }]],
    challenge: [
      [['outcrops', { len: 1100, count: 3, size: [70, 120], level: 520 }], ['dunes', { len: 500, level: 520, amp: 40 }], ['outcrops', { len: 900, count: 2, size: [90, 130], level: 515 }]],
      [['outcrops', { len: 900, count: 3, size: [70, 130], level: 500 }], ['mesa', { len: 620, h: 175, label: 'butte' }], ['outcrops', { len: 700, count: 2, size: [80, 120], level: 520 }]],
    ],
    rest: [['dunes', { len: 1000, level: 535, amp: 46 }], ['outcrops', { len: 900, count: 2, size: [30, 55], level: 540 }], ['hills', { len: 500, level: 545, amp: 16 }]],
    outro: [['plain', { len: 520, level: 560 }], ['plain', { len: 520, level: 650 }]],
  },
  'desert-oasis-arch': {
    id: 'v2-escarpment-climb', biome: 'desert', type: 'climb', name: 'The Escarpment Climb', ground: 'sand', start: 575,
    summary: 'The land rises toward the sky until only a thin band of air is left above a rocky plateau; hug it with short Lifts, then drop to an oasis.',
    intro: [['plain', { len: 520, level: 560 }], ['basin', { len: 900, depth: 34, water: true, label: 'oasis' }]],
    challenge: [
      [['climb', { len: 1100, to: 420, label: 'scree climb' }], ['highland', { len: 1500, band: 365, climb: 560, fall: 620, to: 470, undulate: 12, label: 'plateau squeeze' }], ['cliff', { len: 520, h: 70, dir: 'down', label: 'escarpment' }]],
      [['climb', { len: 900, to: 420, label: 'scree climb' }], ['rugged', { len: 1500, band: 370, amp: 22, to: 480, material: 'scree', label: 'rugged crest' }]],
    ],
    rest: [['basin', { len: 900, depth: 30, water: true, label: 'oasis' }], ['dunes', { len: 1000, level: 548, amp: 40 }], ['plain', { len: 520, level: 555 }]],
    outro: [['plain', { len: 520, level: 565 }], ['plain', { len: 520, level: 650 }]],
  },
  // ---- Oldgrowth Pines (pinewood): soil hills, boulders, mountains, cave.
  'pinewood-timber-run': {
    id: 'v2-boulder-hills', biome: 'pinewood', type: 'open-sky', name: 'The Boulder Hills', ground: 'soil', start: 560,
    summary: 'Rolling forest hills under open sky with glacial boulders sitting in the soil and a fallen giant across a slope.',
    intro: [['plain', { len: 520, level: 545 }], ['hills', { len: 1200, level: 530, amp: 50, wave: 760 }]],
    challenge: [
      [['hills', { len: 700, level: 500, amp: 60, wave: 700 }], ['outcrops', { len: 1000, count: 3, size: [70, 130], level: 495 }], ['log', { len: 900, h: 52, level: 520, label: 'fallen giant' }]],
      [['outcrops', { len: 900, count: 2, size: [90, 150], level: 505 }], ['hills', { len: 900, level: 470, amp: 70, wave: 800 }], ['outcrops', { len: 800, count: 2, size: [80, 120], level: 520 }]],
    ],
    rest: [['hills', { len: 1300, level: 530, amp: 46, wave: 820 }], ['plain', { len: 520, level: 545 }], ['outcrops', { len: 800, count: 1, size: [40, 60], level: 535 }]],
    outro: [['hills', { len: 700, level: 560, amp: 26 }], ['plain', { len: 520, level: 650 }]],
  },
  'pinewood-bark-switchback': {
    id: 'v2-crag-ridge', biome: 'pinewood', type: 'open-sky', name: 'The Crag Ridge', ground: 'soil', start: 565,
    summary: 'The forest floor climbs into a rugged mountain patch; hop along a crest of small rock teeth with the open sky close above.',
    intro: [['plain', { len: 520, level: 550 }], ['hills', { len: 1000, level: 525, amp: 44, wave: 720 }]],
    challenge: [
      [['rugged', { len: 2000, band: 352, amp: 34, to: 500, material: 'scree', label: 'rugged mountain' }], ['hills', { len: 600, level: 520, amp: 36 }]],
      [['climb', { len: 800, to: 430, label: 'forest climb' }], ['rugged', { len: 1700, band: 348, amp: 32, to: 510, material: 'scree', label: 'rugged mountain' }]],
    ],
    rest: [['hills', { len: 1200, level: 535, amp: 48, wave: 760 }], ['terraces', { len: 900, steps: 2, to: 545, label: 'eroded terraces' }], ['plain', { len: 520, level: 550 }]],
    outro: [['hills', { len: 700, level: 565, amp: 24 }], ['plain', { len: 520, level: 650 }]],
  },
  'pinewood-fallen-giant': {
    id: 'v2-bridge-valley', biome: 'pinewood', type: 'valley', name: 'The Bridge Valley', ground: 'soil', start: 520,
    summary: 'From the forest upland, drop over a rock edge into a river valley, pass under a natural bridge, climb out between boulders.',
    intro: [['plain', { len: 520, level: 490 }], ['hills', { len: 900, level: 470, amp: 40 }]],
    challenge: [
      [['cliff', { len: 560, h: 80, dir: 'down', label: 'valley side' }], ['basin', { len: 800, depth: 26, water: true, label: 'river' }], ['arch', { len: 800, clear: 250, rise: 70, span: 480, label: 'natural bridge' }], ['climb', { len: 1000, to: 470, label: 'valley side' }]],
      [['log', { len: 800, h: 48, level: 470, label: 'fallen giant' }], ['cliff', { len: 560, h: 76, dir: 'down', label: 'valley side' }], ['arch', { len: 760, clear: 245, rise: 60, span: 440, label: 'natural bridge' }], ['climb', { len: 900, to: 480, label: 'valley side' }], ['outcrops', { len: 800, count: 2, size: [60, 100], level: 475 }]],
    ],
    rest: [['hills', { len: 1100, level: 480, amp: 44, wave: 760 }], ['basin', { len: 800, depth: 30, water: true, label: 'pond' }], ['plain', { len: 500, level: 485 }]],
    outro: [['hills', { len: 620, level: 560, amp: 12, wave: 520 }], ['plain', { len: 520, level: 650 }]],
  },
  'pinewood-high-boughs': {
    id: 'v2-root-cave', biome: 'pinewood', type: 'cave', name: 'The Root Cave', ground: 'soil', start: 555,
    summary: 'Under the boughs and into a hillside cave: stalactites hang in drip lines over matching floor bumps.',
    intro: [['plain', { len: 520, level: 545 }], ['canopy', { len: 1100, depth: 110, level: 530, label: 'boughs' }]],
    challenge: [
      [['cave', { len: 2200, gap: 225, stal: 34, level: 520, label: 'cave' }]],
      [['canopy', { len: 900, depth: 140, level: 525, label: 'boughs' }], ['cave', { len: 1800, gap: 215, stal: 30, level: 515, label: 'cave' }]],
    ],
    rest: [['hills', { len: 1200, level: 530, amp: 44 }], ['canopy', { len: 900, depth: 90, level: 535, label: 'boughs' }], ['plain', { len: 500, level: 540 }]],
    outro: [['plain', { len: 520, level: 560 }], ['plain', { len: 520, level: 650 }]],
  },
});

// ---- The other forty courses (v2.1-courses-all). Same recipe vocabulary as
// the eight above, written with short piece builders. Each course keeps its
// biome's materials (soil/sand/snow/scree ground, rock only where the biome
// has stone, ice only in frost, water only where the biome has it) and a
// layout shape no sibling in the biome repeats (tests/course-landforms-all).
const pl = (level, len = 520) => ['plain', { len, level }];
const hl = (len, level, amp, wave) => ['hills', { len, level, amp, ...(wave ? { wave } : {}) }];
const dn = (len, level, amp, wave) => ['dunes', { len, level, amp, ...(wave ? { wave } : {}) }];
const tr = (len, steps, to, label, material) => ['terraces', { len, steps, to, label, ...(material ? { material } : {}) }];
const bs = (len, depth, label, water = true) => ['basin', { len, depth, water, label }];
const ms = (len, h, label, material) => ['mesa', { len, h, label, ...(material ? { material } : {}) }];
const cf = (len, h, label, steep) => ['cliff', { len, h, dir: 'down', label, ...(steep ? { steep } : {}) }];
const hg = (len, band, to, label, extra = {}) => ['highland', { len, band, climb: 560, fall: 620, to, undulate: 12, label, ...extra }];
const rg = (len, band, to, label, amp = 30, material = 'scree') => ['rugged', { len, band, amp, to, material, label }];
const oc = (len, count, size, level, material) => ['outcrops', { len, count, size, level, ...(material ? { material } : {}) }];
const st = (len, count, h, depth, label, material) => ['stacks', { len, count, h, depth, label, ...(material ? { material } : {}) }];
const lg = (len, h, level, label) => ['log', { len, h, level, label }];
const rn = (len, w, h, label, at) => ['ruin', { len, w, h, label, ...(at ? { at } : {}) }];
const cv = (len, gap, stal, level, label, material) => ['cave', { len, gap, stal, level, label, ...(material ? { material } : {}) }];
const ar = (len, clear, rise, span, label, material) => ['arch', { len, clear, rise, span, label, ...(material ? { material } : {}) }];
const cn = (len, depth, level, label) => ['canopy', { len, depth, level, label }];
const sh = (len, depth, level, label) => ['shelf', { len, depth, level, label }];
const cl = (len, to, label) => ['climb', { len, to, label }];
const recipe = (id, biome, type, name, ground, start, summary, intro, challenge, rest, outro = [hl(520, 560, 12, 520), pl(650)]) =>
  ({ id, biome, type, name, ground, start, summary, intro, challenge, rest, outro });

const TABLE_RECIPES = Object.freeze({
  // ---- Moonruins (soil, masonry): aqueduct arches, stair, open courtyard, drowned chapel.
  'moonruins-low-aqueduct': recipe('v2-aqueduct-arches', 'moonruins', 'arches', 'The Low Aqueduct', 'soil', 555,
    'Fly under the arches of a broken aqueduct that strides across low grassy ground.',
    [pl(545), hl(1000, 530, 34, 760)],
    [[ar(760, 245, 60, 470, 'aqueduct arch', 'ruin'), hl(520, 520, 30), ar(700, 240, 55, 420, 'aqueduct arch', 'ruin')],
     [rn(700, 150, 90, 'fallen pier'), ar(760, 245, 66, 470, 'aqueduct arch', 'ruin'), rn(600, 130, 70, 'broken pier', .4)]],
    [hl(1200, 535, 40, 800), pl(540), rn(700, 120, 60, 'wall stub')]),
  'moonruins-bell-stair': recipe('v2-bell-stair', 'moonruins', 'stair', 'The Broken Bell Stair', 'soil', 565,
    'Worn terraces of an old bell tower stair: climb the steps, glide down the far side.',
    [pl(555), hl(900, 540, 30, 700)],
    [[tr(1000, 3, 440, 'worn stair'), pl(450, 400), cf(520, 70, 'tumbled wall')],
     [cl(800, 450, 'ramp of rubble'), rn(600, 140, 80, 'bell base', .6), hl(800, 500, 40)]],
    [hl(1100, 535, 36, 740), tr(900, 2, 520, 'low steps'), pl(540)]),
  'moonruins-courtyard': recipe('v2-courtyard-walls', 'moonruins', 'open-sky', 'The Roofless Courtyard', 'soil', 550,
    'Open sky over a courtyard of wall stubs and fallen blocks: hop each wall, glide the lawn between.',
    [pl(545), oc(900, 2, [36, 60], 535)],
    [[rn(700, 130, 80, 'wall'), pl(520, 400), rn(700, 120, 100, 'tall wall', .45), hl(600, 520, 30)],
     [oc(1000, 3, [50, 90], 515), rn(600, 140, 90, 'gatehouse'), pl(525, 400)]],
    [hl(1000, 535, 32, 780), rn(700, 110, 55, 'low wall'), pl(540)]),
  'moonruins-moon-chapel': recipe('v2-drowned-chapel', 'moonruins', 'flooded', 'The Drowned Moon Chapel', 'soil', 540,
    'A chapel half under still water: cross the flooded nave, pass under the broken vault, climb out.',
    [pl(535), bs(900, 34, 'flooded nave')],
    [[bs(800, 40, 'flooded nave'), ar(760, 245, 60, 440, 'broken vault', 'ruin'), cl(800, 490, 'chapel steps')],
     [rn(640, 140, 80, 'chancel wall'), bs(900, 36, 'moonlit pool'), tr(800, 2, 500, 'altar steps'), rn(600, 120, 70, 'pillar base')]],
    [hl(1000, 535, 32, 760), bs(800, 28, 'rain pool'), pl(540)]),

  // ---- Frost (snow ground, glacial ice, rock erratics).
  'frost-glacier-gate': recipe('v2-glacier-gate', 'frost', 'ice-gate', 'The Glacier Gate', 'snow', 555,
    'Rolling snowfield with two ice gateways; slip under the hanging glacier shelves.',
    [pl(545), hl(1000, 530, 36, 800)],
    [[sh(800, 135, 520, 'glacier shelf'), hl(500, 520, 30), ar(720, 245, 60, 440, 'ice gateway', 'ice')],
     [ar(700, 245, 55, 420, 'ice gateway', 'ice'), pl(520, 400), sh(900, 140, 515, 'glacier shelf')]],
    [hl(1200, 535, 40, 820), pl(545), oc(700, 1, [34, 50], 540)]),
  'frost-iceberg-field': recipe('v2-iceberg-field', 'frost', 'open-sky', 'The Drifting Icebergs', 'snow', 540,
    'Open sky over a frozen bay: weave between broad icebergs standing in dark water.',
    [pl(535), bs(900, 34, 'frozen bay')],
    [[st(1200, 2, 110, 54, 'iceberg', 'ice'), hl(500, 520, 30), st(1100, 2, 100, 50, 'iceberg', 'ice')],
     [oc(900, 3, [60, 100], 515, 'ice'), bs(800, 40, 'open lead'), st(1100, 2, 105, 54, 'iceberg', 'ice')]],
    [hl(1000, 535, 34, 780), bs(800, 30, 'open lead'), pl(540)]),
  'frost-thaw-vault': recipe('v2-thaw-vault', 'frost', 'ice-cave', 'The Thawing Vault', 'snow', 555,
    'Through a glacier tongue: a meltwater cave with ice drips over snow-drifted floor.',
    [pl(545), hl(900, 535, 30, 760)],
    [[cv(2200, 225, 34, 520, 'ice cave', 'ice')],
     [sh(800, 130, 525, 'ice lip'), cv(1800, 215, 30, 515, 'ice cave', 'ice')]],
    [hl(1200, 535, 40, 820), pl(540), oc(700, 1, [30, 46], 540)]),
  'frost-frozen-falls': recipe('v2-frozen-falls', 'frost', 'falls', 'The Frozen Falls', 'snow', 470,
    'A frozen cascade: drop down icy rock steps in the headwall, then glide the snowy valley.',
    [pl(465), hl(900, 455, 28, 700)],
    [[cf(560, 80, 'icefall step'), pl(540, 360), tr(900, 2, 520, 'frozen steps', 'rock'), cf(520, 70, 'icefall step')],
     [tr(800, 3, 430, 'frozen steps', 'rock'), sh(800, 135, 440, 'ice curtain'), cf(560, 80, 'icefall step')]],
    [hl(1100, 480, 36, 760), bs(800, 26, 'frozen pool', false), pl(485)],
    [hl(520, 560, 12, 520), pl(650)]),

  // ---- Marsh (soil, peat, water).
  'marsh-reed-channel': recipe('v2-reed-channels', 'marsh', 'open-sky', 'The Reed Channel', 'soil', 550,
    'Open sky over flat wet ground: skim across still channels and low reed banks.',
    [pl(545), bs(900, 30, 'reed channel')],
    [[bs(900, 38, 'channel'), pl(530, 380), bs(800, 40, 'channel'), hl(600, 525, 24)],
     [hl(800, 520, 34, 640), bs(1000, 42, 'wide channel'), pl(535, 400)]],
    [hl(1000, 540, 26, 700), bs(800, 28, 'pool'), pl(545)]),
  'marsh-willow-veil': recipe('v2-willow-veil', 'marsh', 'canopy', 'The Willow Veil', 'soil', 555,
    'Pass beneath hanging willow boughs, over low peat hummocks and still pools.',
    [pl(545), cn(1000, 100, 535, 'willow boughs')],
    [[cn(1000, 140, 530, 'willow boughs'), bs(800, 34, 'black pool'), cn(900, 130, 530, 'willow boughs')],
     [hl(700, 520, 30, 620), cn(1200, 150, 525, 'willow veil')]],
    [hl(1000, 540, 28, 700), cn(800, 90, 540, 'low boughs'), pl(545)]),
  'marsh-sunken-walk': recipe('v2-sunken-boardwalk', 'marsh', 'timber', 'The Sunken Boardwalk', 'soil', 555,
    'A rotten boardwalk and sunk timber across the mire: hop the logs, cross the pools.',
    [pl(545), lg(900, 40, 540, 'sunk log')],
    [[lg(900, 52, 525, 'sunk timber'), bs(700, 36, 'mire pool'), lg(900, 56, 525, 'sunk timber'), pl(530, 400)],
     [bs(900, 40, 'mire pool'), lg(800, 48, 530, 'sunk timber'), hl(700, 520, 30), lg(800, 52, 525, 'sunk timber')]],
    [hl(1000, 540, 26, 720), lg(700, 36, 545, 'old sleeper'), pl(545)]),
  'marsh-mire-bells': recipe('v2-mire-bells', 'marsh', 'canopy', 'The Mire Bells', 'soil', 550,
    'Hummocks and bog bells under a low hanging cover; each rise is a short Lift.',
    [pl(545), hl(1000, 530, 40, 560)],
    [[hl(900, 505, 50, 520), cn(1000, 120, 520, 'sagging boughs'), hl(700, 520, 40, 560)],
     [cn(900, 110, 530, 'sagging boughs'), lg(700, 44, 520, 'bog log'), hl(900, 510, 46, 540)]],
    [hl(1100, 535, 34, 600), pl(540), cn(700, 80, 540, 'low boughs')]),

  // ---- Fungal (loam, mycelium).
  'fungal-cap-canopy': recipe('v2-cap-canopy', 'fungal', 'canopy', 'The Cap Canopy', 'soil', 555,
    'Beneath great mushroom caps: rounded canopies hang over loamy rises.',
    [pl(545), cn(1000, 110, 535, 'mushroom caps')],
    [[cn(1000, 150, 525, 'giant caps'), hl(600, 515, 36, 620), cn(900, 140, 525, 'giant caps')],
     [hl(800, 510, 44, 600), cn(1200, 150, 520, 'giant caps')]],
    [hl(1000, 540, 30, 680), cn(800, 90, 540, 'small caps'), pl(545)]),
  'fungal-spore-stair': recipe('v2-spore-stair', 'fungal', 'stair', 'The Spore Stair', 'soil', 565,
    'Layered shelf fungi form a stair up through the loam; spores drift in the glades between.',
    [pl(555), hl(900, 540, 32, 700)],
    [[tr(1000, 3, 450, 'shelf stair'), cn(900, 100, 460, 'cap roof'), hl(700, 520, 32)],
     [cl(900, 460, 'loam slope'), tr(800, 2, 430, 'shelf stair'), cf(520, 70, 'spore ledge')]],
    [hl(1100, 535, 34, 720), tr(800, 2, 520, 'low shelves'), pl(540)]),
  'fungal-gilled-arch': recipe('v2-gilled-arch', 'fungal', 'arches', 'The Gilled Arch', 'soil', 555,
    'Thread through great gilled arches, with loam rises between them.',
    [pl(545), hl(1000, 535, 34, 720)],
    [[ar(760, 245, 62, 460, 'gilled arch', 'canopy'), hl(520, 520, 34), ar(700, 240, 56, 420, 'gilled arch', 'canopy')],
     [hl(700, 510, 40, 600), ar(800, 250, 70, 480, 'gilled arch', 'canopy'), pl(525, 400), ar(700, 245, 60, 420, 'gilled arch', 'canopy')]],
    [hl(1000, 540, 30, 700), pl(545), oc(700, 1, [30, 50], 540)]),
  'fungal-mycelium-run': recipe('v2-mycelium-run', 'fungal', 'open-sky', 'The Mycelium Run', 'soil', 550,
    'Open loam glades webbed with mycelium: low rises, a fallen trunk, soft dips.',
    [pl(545), hl(1000, 530, 36, 640)],
    [[hl(800, 510, 52, 560), lg(800, 48, 520, 'fallen trunk'), bs(700, 28, 'spore pool', false), hl(700, 520, 36)],
     [bs(800, 30, 'spore pool', false), hl(900, 500, 54, 600), lg(700, 44, 515, 'fallen trunk')]],
    [hl(1100, 535, 34, 680), pl(540), bs(700, 24, 'dip', false)]),

  // ---- Basalt (scree, columns, cinder).
  'basalt-column-stair': recipe('v2-column-stair', 'basalt', 'stair', 'The Column Stair', 'scree', 565,
    'Hexagonal column tops step up the hillside; leap tread to tread, then glide off.',
    [pl(555), hl(900, 540, 26, 700)],
    [[tr(1000, 3, 440, 'column stair', 'rock'), pl(450, 400), cf(560, 80, 'column edge')],
     [tr(900, 2, 470, 'column stair', 'rock'), hl(700, 500, 36), tr(900, 3, 420, 'column stair', 'rock')]],
    [hl(1100, 535, 30, 720), tr(700, 2, 520, 'low columns', 'rock'), pl(540)]),
  'basalt-smoke-flue': recipe('v2-smoke-flue', 'basalt', 'cave', 'The Smoke Flue', 'scree', 555,
    'A lava tube through the cinder cone: stalactites of cooled lava drip from the flue roof.',
    [pl(545), hl(900, 535, 26, 700)],
    [[cv(2200, 225, 30, 520, 'lava tube'), hl(500, 520, 26)],
     [cv(1700, 215, 28, 515, 'lava tube'), oc(800, 2, [50, 80], 515)]],
    [hl(1100, 535, 28, 720), pl(540), oc(700, 1, [34, 54], 540)]),
  'basalt-lava-lip': recipe('v2-cinder-spillway', 'basalt', 'falls', 'The Cinder Spillway', 'scree', 480,
    'An old lava spillway: drop down rock lips and glide the cinder channel below.',
    [pl(475), hl(900, 465, 26, 700)],
    [[cf(560, 90, 'spillway lip'), pl(555, 420), cf(520, 70, 'spillway lip'), bs(700, 24, 'cinder channel', false)],
     [oc(900, 2, [50, 90], 465), cf(560, 80, 'spillway lip'), hl(800, 540, 30), cf(520, 60, 'spillway lip')]],
    [hl(1100, 490, 30, 720), bs(700, 22, 'cinder channel', false), pl(495)],
    [hl(520, 560, 12, 520), pl(650)]),
  'basalt-scoria-crown': recipe('v2-scoria-crown', 'basalt', 'open-sky', 'The Scoria Crown', 'scree', 570,
    'The cone climbs under open sky to a crown of dark scoria teeth; hop the rim, then drop away.',
    [pl(560), hl(1000, 545, 28, 720)],
    [[cl(1000, 440, 'cinder slope'), rg(1800, 360, 500, 'scoria crown', 28)],
     [rg(1700, 366, 510, 'scoria crown', 30), hl(600, 520, 30), cf(520, 70, 'crater lip')]],
    [hl(1100, 540, 30, 720), pl(545), oc(700, 1, [34, 50], 540)]),

  // ---- Coral (sand, coral rock, tide pools).
  'coral-reef-pass': recipe('v2-reef-pass', 'coral', 'open-sky', 'The Reef Pass', 'sand', 550,
    'Open water above a reef flat: hop porous coral heads standing out of the sand.',
    [pl(545), dn(900, 535, 34, 600)],
    [[oc(1000, 3, [60, 110], 520), dn(500, 520, 36), oc(900, 2, [80, 120], 515)],
     [oc(900, 3, [60, 120], 505), bs(700, 36, 'tide pool'), oc(800, 2, [70, 110], 520)]],
    [dn(1000, 540, 34, 640), oc(800, 2, [30, 50], 540), pl(545)]),
  'coral-tidal-gully': recipe('v2-tidal-gully', 'coral', 'gully', 'The Tidal Gully', 'sand', 520,
    'A tidal cut through the reef: drop to the gully, weave sea stacks in the water, climb out.',
    [pl(515), dn(900, 505, 30, 600)],
    [[pl(515, 400), cf(560, 80, 'reef edge', 1.2), st(1100, 2, 120, 54, 'sea stack'), cl(900, 500, 'gully bank')],
     [bs(900, 40, 'tidal pool'), st(1000, 2, 110, 50, 'sea stack'), pl(520, 400), cf(560, 70, 'reef edge', 1.2), pl(540, 400)]],
    [dn(1000, 520, 34, 640), bs(800, 28, 'tide pool'), pl(525)]),
  'coral-wreck-canopy': recipe('v2-wreck-hull', 'coral', 'wreck', 'The Wreck Canopy', 'sand', 555,
    'A sunken ship lies across the sand; fly over the keel and under its fallen mast and hull arches.',
    [pl(545), dn(900, 535, 30, 600)],
    [[lg(900, 56, 525, 'ship keel'), ar(760, 245, 60, 440, 'hull ribs', 'rock'), lg(800, 48, 525, 'broken mast')],
     [ar(700, 245, 55, 420, 'hull ribs', 'rock'), dn(600, 515, 36), lg(900, 54, 520, 'ship keel')]],
    [dn(1000, 540, 32, 640), oc(700, 1, [34, 50], 540), pl(545)]),
  'coral-coral-lattice': recipe('v2-coral-lattice', 'coral', 'arches', 'The Coral Lattice', 'sand', 555,
    'A lattice of coral arches rising from the sand, with heads of rock between.',
    [pl(545), oc(900, 2, [36, 56], 535)],
    [[ar(740, 245, 60, 440, 'coral arch', 'rock'), oc(700, 2, [50, 80], 520), ar(700, 240, 56, 410, 'coral arch', 'rock')],
     [tr(800, 2, 480, 'coral terraces', 'rock'), ar(760, 245, 66, 450, 'coral arch', 'rock'), tr(700, 2, 530, 'coral terraces', 'rock')]],
    [dn(1000, 540, 30, 640), pl(545), oc(800, 2, [30, 46], 540)]),

  // ---- Crystal (dark rock and scree, mirror pools, veined caves).
  'crystal-prism-teeth': recipe('v2-prism-teeth', 'crystal', 'ridge', 'The Prism Teeth', 'scree', 565,
    'A scree slope climbs into a ridge of crystal teeth under open sky; hop the crest.',
    [pl(555), hl(1000, 540, 26, 720)],
    [[rg(2000, 376, 510, 'prism ridge', 26), hl(600, 520, 30)],
     [cl(800, 440, 'scree slope'), rg(1700, 374, 515, 'prism ridge', 26)]],
    [hl(1100, 540, 28, 720), tr(800, 2, 525, 'low ledges', 'rock'), pl(545)]),
  'crystal-mirror-well': recipe('v2-mirror-well', 'crystal', 'basin', 'The Mirror Well', 'scree', 545,
    'Dark pools like mirrors between crystal outcrops; hop the stones, pass the dripping vault.',
    [pl(540), bs(900, 30, 'mirror pool')],
    [[oc(900, 2, [60, 100], 520), bs(800, 38, 'mirror pool'), cv(1500, 225, 30, 520, 'crystal vault')],
     [bs(800, 40, 'mirror pool'), oc(1000, 3, [60, 110], 510), pl(525, 360)]],
    [hl(1000, 535, 28, 720), bs(700, 26, 'small pool'), pl(540)]),
  'crystal-wedge-run': recipe('v2-wedge-run', 'crystal', 'wedges', 'The Wedge Run', 'scree', 480,
    'A fractured shelf of wedge-shaped rock: drop down rock faces and cross a dark mesa.',
    [pl(475), hl(900, 465, 24, 700)],
    [[cf(560, 90, 'fault scarp'), ms(800, 150, 'wedge mesa'), cf(520, 70, 'fault scarp')],
     [ms(700, 130, 'wedge butte'), pl(500, 380), cf(560, 80, 'fault scarp'), tr(800, 2, 540, 'wedge steps', 'rock')]],
    [hl(1100, 490, 28, 720), pl(495), oc(700, 1, [34, 50], 490)],
    [hl(520, 560, 12, 520), pl(650)]),
  'crystal-chime-stair': recipe('v2-chime-stair', 'crystal', 'stair', 'The Chime Stair', 'scree', 565,
    'Rock steps ring up toward a crystal grotto; climb the stair, then pass through the cave.',
    [pl(555), hl(900, 540, 24, 700)],
    [[tr(1000, 3, 450, 'chime steps', 'rock'), cv(1500, 225, 28, 450, 'crystal grotto')],
     [cl(800, 450, 'scree ramp'), tr(800, 2, 430, 'chime steps', 'rock'), cf(520, 70, 'grotto lip')]],
    [hl(1100, 535, 28, 720), tr(700, 2, 520, 'low steps', 'rock'), pl(540)]),

  // ---- Cloud (grassy soil, grey rock). Sky Islands want floating rock: nearest landforms used.
  'cloud-sky-islands': recipe('v2-island-steps', 'cloud', 'islands', 'The Sky Islands', 'soil', 540,
    'Stand-in for floating islands: flat-topped grassy mesas with rock edges, hop from island to island.',
    [pl(535), hl(900, 525, 30, 700)],
    [[ms(800, 150, 'island'), pl(520, 360), ms(800, 170, 'island'), cf(520, 70, 'island edge')],
     [oc(900, 2, [60, 100], 515), ms(700, 130, 'island'), hl(600, 520, 30), ms(800, 160, 'island')]],
    [hl(1000, 535, 30, 740), pl(540), oc(700, 1, [30, 50], 540)]),
  'cloud-broken-span': recipe('v2-broken-span', 'cloud', 'arches', 'The Broken Span', 'soil', 525,
    'Passes beneath the broken spans of a sky bridge, with rock edges to drop over.',
    [pl(520), hl(900, 510, 28, 700)],
    [[ar(760, 245, 62, 460, 'broken span', 'rock'), cf(560, 80, 'bridge footing'), ar(700, 245, 56, 420, 'broken span', 'rock')],
     [cf(560, 70, 'bridge footing'), pl(540, 360), ar(800, 250, 70, 480, 'broken span', 'rock'), hl(600, 520, 28)]],
    [hl(1000, 530, 30, 740), pl(535), oc(700, 1, [30, 46], 530)]),
  'cloud-wind-stair': recipe('v2-wind-stair', 'cloud', 'stair', 'The Wind Stair', 'soil', 570,
    'A long stair of grassy ledges climbs the wind; each ledge is one short Lift, then a long glide.',
    [pl(560), hl(900, 545, 28, 700)],
    [[tr(1100, 4, 420, 'wind ledges'), hg(1300, 370, 480, 'high ledge', { climb: 460 })],
     [cl(900, 450, 'grassy ramp'), tr(900, 2, 420, 'wind ledges'), cf(520, 80, 'ledge drop')]],
    [hl(1100, 540, 30, 740), tr(800, 2, 520, 'low ledges'), pl(545)]),
  'cloud-cloud-vault': recipe('v2-cloud-vault', 'cloud', 'cave', 'The Cloud Vault', 'soil', 555,
    'Through the rooted underside of a great island: a vault of grey rock with dangling stones.',
    [pl(545), hl(900, 535, 28, 700)],
    [[cv(2000, 225, 30, 525, 'island vault'), hl(500, 520, 28)],
     [hl(700, 515, 34, 640), cv(1700, 220, 28, 520, 'island vault')]],
    [hl(1100, 535, 30, 740), pl(540), oc(700, 1, [30, 50], 540)]),

  // ---- Thorn (dark soil, briar, stone ribs).
  'thorn-briar-tunnel': recipe('v2-briar-tunnel', 'thorn', 'canopy', 'The Briar Tunnel', 'soil', 555,
    'A tunnel of arching briar over root-bound earth: stay low, weave the root rises.',
    [pl(545), cn(1000, 100, 535, 'briar arches')],
    [[cn(1100, 150, 525, 'briar tunnel'), hl(600, 515, 36, 600), cn(900, 140, 525, 'briar tunnel')],
     [hl(700, 510, 42, 560), cn(1300, 150, 520, 'briar tunnel')]],
    [hl(1000, 540, 30, 680), cn(800, 90, 540, 'low briars'), pl(545)]),
  'thorn-seedpod-roof': recipe('v2-seedpod-roof', 'thorn', 'canopy', 'The Seedpod Roof', 'soil', 535,
    'Heavy pods hang from a roof that sinks lower as you go; dip beneath each cluster.',
    [pl(530), hl(900, 520, 30, 700)],
    [[cn(900, 120, 530, 'seedpods'), lg(700, 44, 525, 'root bar'), cn(1000, 160, 530, 'heavy pods')],
     [cn(800, 130, 525, 'seedpods'), hl(700, 505, 40, 600), cn(1000, 160, 530, 'heavy pods')]],
    [hl(1000, 535, 28, 700), pl(540), cn(700, 80, 540, 'light pods')]),
  'thorn-thicket-run': recipe('v2-thicket-run', 'thorn', 'open-sky', 'The Thicket Run', 'soil', 550,
    'Open sky over broken low hedges and stone ribs: short hops over each, light-filled glades between.',
    [pl(545), hl(1000, 530, 36, 640)],
    [[lg(700, 44, 520, 'hedge bank'), hl(700, 515, 40, 560), oc(900, 2, [40, 70], 515), lg(700, 48, 520, 'hedge bank')],
     [oc(1000, 3, [50, 90], 510), lg(700, 44, 520, 'hedge bank'), hl(800, 500, 50, 600)]],
    [hl(1100, 535, 32, 680), pl(540), oc(700, 1, [30, 46], 540)]),
  'thorn-thorn-steeple': recipe('v2-thorn-steeple', 'thorn', 'climb', 'The Thorn Steeple', 'soil', 570,
    'Twisted root steps climb to a high steeple of earth under open sky; a short squeeze, then a long fall to the exit.',
    [pl(560), hl(900, 545, 28, 700)],
    [[tr(1000, 3, 450, 'root steps'), hg(1500, 366, 500, 'steeple crest')],
     [cl(900, 440, 'root ramp'), hg(1400, 370, 510, 'steeple crest', { climb: 480 }), cf(520, 70, 'root drop')]],
    [hl(1100, 540, 30, 700), tr(700, 2, 525, 'low roots'), pl(545)]),

  // ---- Cemetery (dark soil, grass, leaning stones).
  'cemetery-grave-road': recipe('v2-grave-road', 'cemetery', 'rising-road', 'The Grave Road', 'soil', 565,
    'An open road of grave mounds that climbs slowly; markers and old walls stand beside the track.',
    [pl(555), hl(1000, 540, 30, 640)],
    [[hl(900, 510, 44, 560), rn(600, 80, 70, 'grave marker', .4), cl(900, 460, 'rising road'), rn(600, 120, 80, 'mausoleum wall')],
     [cl(800, 470, 'rising road'), hl(900, 480, 48, 600), rn(600, 90, 60, 'grave marker')]],
    [hl(1000, 535, 32, 700), pl(540), rn(600, 80, 50, 'low marker')]),
  'cemetery-crypt-pass': recipe('v2-crypt-pass', 'cemetery', 'arches', 'The Crypt Pass', 'soil', 555,
    'Low crypt lintels span the path: pass under each stone lintel, with soft mounds between.',
    [pl(545), hl(900, 535, 30, 700)],
    [[ar(740, 245, 55, 430, 'crypt lintel', 'ruin'), hl(500, 520, 30), ar(720, 240, 50, 400, 'crypt lintel', 'ruin'), rn(600, 110, 70, 'tomb')],
     [rn(600, 130, 80, 'tomb'), ar(760, 245, 60, 450, 'crypt lintel', 'ruin'), tr(800, 2, 500, 'crypt steps')]],
    [hl(1000, 535, 32, 700), rn(600, 90, 55, 'low tomb'), pl(540)]),
  'cemetery-bell-garden': recipe('v2-bell-garden', 'cemetery', 'garden', 'The Bell Garden', 'soil', 550,
    'A garden of mounds and old yews: root-hung bells low overhead, walls to hop.',
    [pl(545), hl(1000, 530, 36, 620)],
    [[cn(900, 110, 525, 'yew boughs'), rn(600, 120, 80, 'garden wall'), hl(800, 515, 38, 600), cn(900, 120, 525, 'yew boughs')],
     [hl(800, 505, 46, 560), cn(1100, 130, 520, 'yew boughs'), rn(600, 100, 70, 'garden wall')]],
    [hl(1000, 535, 30, 680), cn(700, 80, 540, 'low yew'), pl(545)]),
  'cemetery-sepulchre-stair': recipe('v2-sepulchre-stair', 'cemetery', 'descent', 'The Sepulchre Stair', 'soil', 470,
    'A burial hillside descends in stone shelves: step down tomb by tomb to the valley floor.',
    [pl(465), hl(900, 455, 26, 700)],
    [[tr(1000, 3, 540, 'burial shelves'), cf(560, 70, 'terrace edge'), rn(600, 110, 70, 'tomb')],
     [rn(600, 120, 80, 'tomb'), tr(900, 2, 520, 'burial shelves'), cf(520, 60, 'terrace edge'), hl(600, 540, 30)]],
    [hl(1100, 480, 32, 700), pl(485), rn(600, 80, 50, 'low marker')],
    [hl(520, 560, 12, 520), pl(650)]),
});

export const LANDFORM_RECIPES = Object.freeze({ ...HAND_RECIPES, ...TABLE_RECIPES });

/** Compact per-sample profile (620 units) for scenery, labs and probes:
 * ground/rock/ceiling heights, materials, landform labels and roles. */
export function courseProfile(course, validation) {
  const r = v => Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
  return { x0: course.xs[0], dx: DX, frame: FRAME, floor: Array.from(course.floor, r), soft: Array.from(course.soft, r), rock: Array.from(course.rock, r),
    ceil: Array.from(course.ceil, r), floorMat: course.floorMat.slice(), groundMat: course.groundMat.slice(), ceilMat: course.ceilMat.slice(), label: course.label.slice(), ceilLabel: course.ceilLabel.slice(),
    role: course.piece.map(k => course.placed[k]?.role || 'rest'), line: validation ? Array.from(validation.line, r) : null,
    pieces: course.placed.map(p => ({ kind: p.kind, label: p.params.label || p.kind, role: p.role, x0: Math.round(p.x0), x1: Math.round(p.x1) })) };
}

/** The recipe that replaces `levelId` under the current switch, or null. */
export function landformRecipeFor(levelId, gen = courseGeneration()) {
  return gen === 2 ? LANDFORM_RECIPES[levelId] || null : null;
}

/** Full build used by flight.mjs: obstacles + sections + metadata, or null. */
export function buildLandformCourse({ levelId, seed = 1, height = FRAME, duration = 90, speed = 154, identity = {}, ascent = {},
  legs = [], requestedWindows = 1, legCount = 1, elite = false, rng = Math.random, generation: gen = courseGeneration() } = {}) {
  const recipe = landformRecipeFor(levelId, gen);
  if (!recipe) return null;
  const extent = (Math.max(15, duration) - 2.8) * speed + 98;
  const course = composeCourse(recipe, { seed, extent, windows: Math.max(1, requestedWindows * legCount), hardGapScale: ascent.hardGapScale ?? 1 });
  const validation = validateCourse(course);
  const obstacles = courseObstacles(course, validation, { height, identity, ascent, legs, rng });
  const sections = courseSections(course, obstacles, { identity, ascent, elite, legs });
  const embers = courseLanePickups(course, validation, obstacles, { height, seed, end: extent - 500 });
  return { obstacles, sections, embers, meta: { generation: 2, recipeId: recipe.id, type: recipe.type, name: recipe.name, valid: validation.ok,
    errors: validation.errors, metrics: validation.metrics, profile: courseProfile(course, validation) } };
}

/** Open-air spots for a Flash pickup along a landform profile: well clear of floor and
 * ceiling over a window as wide as the clearance, on level ground (no cliff or blind
 * drop within the window) and near the validated flight line so it is reachable and
 * seen from the approach. Returns { x, y } in world units at `height`, best first. */
export function landformFlashSites(profile, { height = FRAME, clearance = 100, step = 60 } = {}) {
  if (!profile?.line) return [];
  const s = height / FRAME, { x0, dx, floor, ceil, line } = profile, out = [];
  const at = i => Math.max(0, Math.min(floor.length - 1, i)), reach = Math.ceil(clearance / dx), span = Math.ceil(240 / dx);
  const ceilAt = i => Number.isFinite(ceil[at(i)]) ? ceil[at(i)] : 0;
  for (let i = 0; i < floor.length; i += Math.round(step / dx)) {
    if (!Number.isFinite(line[i]) || !Number.isFinite(floor[i])) continue;
    let lo = Infinity, hi = -Infinity;
    for (let d = -span; d <= span; d++) { const f = floor[at(i + d)]; lo = Math.min(lo, f); hi = Math.max(hi, f); }
    if (hi - lo > 200) continue;                       // slope, cliff or blind drop in view
    for (const offset of [0, -40, 40, -80, 80]) {
      const y = line[i] + offset;
      let ok = y >= 80;
      for (let d = -reach; ok && d <= reach; d++) ok = floor[at(i + d)] - y >= clearance && y - ceilAt(i + d) >= clearance;
      if (ok) { out.push({ x: x0 + i * dx, y: y * s, rank: Math.abs(offset) }); break; }
    }
  }
  return out.sort((a, b) => a.rank - b.rank || a.x - b.x).map(({ x, y }) => ({ x, y, anchor: null, pocket: false, sideLane: true }));
}
