/* Emberwing's self-contained canvas flight simulation and renderer. */
import { FLAME_TUNING } from './vitality.mjs';
import { WispCompanion, wispHome } from './wisp.mjs';
export { FLAME_TUNING } from './vitality.mjs';
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
export const FLIGHT_TUNING = Object.freeze({ gravity: 300, flapImpulse: 205,
  forwardSpeed: 154, terminalFall: 245, pickupRadius: 24 });

export function seededRandom(seed = 1) {
  let state = 2166136261;
  for (const char of String(seed)) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Four authored patterns per terrain. The generator joins these motifs rather
// than inventing arbitrary gaps, and limits the vertical movement at joins.
export const FLIGHT_PATTERNS = Object.freeze({
  ruins: [
    { id: 'sun-gates', centers: [.50, .46, .51, .55], gap: 1.08, spacing: 1.04 },
    { id: 'rising-arches', centers: [.57, .49, .42, .46], gap: 1.00, spacing: 1.02 },
    { id: 'broken-stair', centers: [.43, .52, .58, .50], gap: 1.02, spacing: 1.06 },
    { id: 'temple-rhythm', centers: [.47, .55, .47, .53], gap: .98, spacing: 1.10 },
  ],
  canopy: [
    { id: 'leaf-cradle', centers: [.49, .45, .50, .55], gap: 1.13, spacing: 1.09 },
    { id: 'vine-waltz', centers: [.57, .49, .44, .49], gap: 1.08, spacing: 1.12 },
    { id: 'hollow-grove', centers: [.43, .48, .57, .53], gap: 1.10, spacing: 1.05 },
    { id: 'swaying-boughs', centers: [.48, .55, .51, .44], gap: 1.11, spacing: 1.10 },
  ],
  storm: [
    { id: 'cloud-pillars', centers: [.50, .47, .53, .55], gap: 1.14, spacing: 1.12 },
    { id: 'silver-crossing', centers: [.55, .48, .43, .50], gap: 1.12, spacing: 1.15 },
    { id: 'thunder-steps', centers: [.44, .51, .56, .49], gap: 1.10, spacing: 1.13 },
    { id: 'calm-between', centers: [.49, .54, .50, .45], gap: 1.16, spacing: 1.08 },
  ],
});

export function circleHitsPolygon(x, y, radius, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    if ((x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2 <= radius ** 2) return true;
  }
  return inside;
}

export function obstaclePolygons(obstacle, time = 0) {
  const center = obstacle.center + Math.sin(time * .9 + obstacle.phase) * obstacle.motion;
  const polygons = [];
  if (obstacle.topShape) polygons.push(obstacle.topShape.map(([x, y]) => [obstacle.x + x, center - obstacle.gap / 2 + y]));
  if (obstacle.bottomShape) polygons.push(obstacle.bottomShape.map(([x, y]) => [obstacle.x + x, center + obstacle.gap / 2 + y]));
  return polygons;
}

// Deliberate landform families share a safe footprint, rather than repeating a
// noisy triangle under different textures. Depths are measured away from the
// playable opening, so erosion and vaults can never nibble into its clearance.
const RIDGE_X = [-.80, -.46, -.12, .15, .39, .62, .83, 1.08, 1.39, 1.74, 2.10, 2.45];
const VAULT_X = [-.80, -.46, -.12, .24, .57, .76, .96, 1.20, 1.42, 1.62, 1.82, 2.02, 2.20, 2.45];
const TERRAIN_CONTOURS = Object.freeze({
  ruins: {
    // A weathered massif, a worn terrace, a steep escarpment, a folded ridge.
    ground: [
      [190, 133, 82, 46, 19, 0, 8, 37, 61, 88, 132, 190],
      [185, 137, 91, 49, 17, 3, 0, 15, 24, 72, 128, 190],
      [192, 148, 101, 58, 34, 9, 0, 21, 63, 109, 150, 192],
      [185, 139, 86, 51, 28, 0, 6, 32, 39, 79, 137, 188],
    ],
    vault: [
      [195, 145, 85, 48, 6, 18, 52, 83, 94, 76, 54, 38, 68, 185],
      [195, 145, 85, 48, 6, 24, 60, 76, 82, 64, 48, 36, 65, 190],
    ],
  },
  canopy: {
    // Buttress roots grow into broad, rounded banks with shallow hollows.
    ground: [
      [185, 112, 65, 29, 7, 0, 5, 18, 48, 91, 136, 185],
      [183, 120, 59, 20, 0, 4, 10, 29, 37, 78, 131, 185],
      [190, 129, 73, 38, 15, 0, 4, 13, 37, 75, 132, 189],
      [185, 123, 76, 33, 5, 0, 9, 20, 55, 96, 139, 190],
    ],
    vault: [
      [185, 116, 55, 14, 0, 10, 38, 65, 74, 60, 28, 4, 38, 185],
      [190, 124, 58, 11, 0, 17, 47, 70, 81, 56, 21, 7, 43, 189],
    ],
  },
  storm: {
    // Alpine faces rise into asymmetrical summits and eroded wind saddles.
    ground: [
      [200, 151, 104, 62, 27, 0, 19, 43, 60, 103, 161, 200],
      [195, 141, 94, 55, 17, 0, 12, 49, 72, 83, 143, 198],
      [200, 150, 97, 49, 15, 0, 24, 31, 66, 117, 154, 200],
      [198, 143, 107, 67, 32, 8, 0, 29, 55, 96, 155, 200],
    ],
    vault: [
      [200, 145, 79, 28, 0, 23, 62, 97, 104, 82, 40, 8, 51, 200],
      [200, 147, 74, 19, 0, 32, 68, 91, 108, 87, 31, 5, 45, 200],
    ],
  },
});

// Large-scale erosion must change the skyline, not merely add samples to an
// apex. These lower formations carve broad caps, benches and saddles out of
// the established clearance envelope; no new ground can rise into the route.
const ERODED_GROUND_DEPTHS = Object.freeze({
  ruins: [
    // A long weathered mesa; a stepped cliff; an escarpment; a broken shelf.
    [195, 146, 100, 52, 52, 52, 52, 52, 72, 118, 152, 198],
    [195, 146, 108, 68, 38, 38, 38, 66, 105, 106, 154, 198],
    [200, 160, 118, 79, 45, 45, 45, 45, 80, 146, 166, 200],
    [195, 147, 109, 66, 48, 48, 73, 73, 73, 115, 156, 195],
  ],
  storm: [
    // Twin summit with a deep saddle; a wind-cut bench; forked ridge; arete.
    [206, 164, 123, 72, 94, 114, 92, 58, 78, 120, 167, 206],
    [202, 156, 112, 69, 52, 52, 52, 76, 102, 117, 160, 204],
    [205, 161, 119, 68, 84, 100, 89, 56, 79, 132, 174, 206],
    [204, 159, 124, 84, 56, 48, 48, 56, 82, 124, 171, 205],
  ],
});

function sampleTerrainContour(xs, depths) {
  const secants = depths.slice(1).map((value, i) => (value - depths[i]) / (xs[i + 1] - xs[i]));
  const slopes = depths.map((_, i) => i === 0 ? secants[0] : i === depths.length - 1 ? secants.at(-1)
    : secants[i - 1] * secants[i] <= 0 ? 0 : (secants[i - 1] + secants[i]) * .5);
  // Monotone Hermite tangents preserve authored shelves and peaks without
  // overshoot, while making the whole silhouette continuously curved.
  for (let i = 0; i < secants.length; i++) {
    if (secants[i] === 0) { slopes[i] = slopes[i + 1] = 0; continue; }
    const a = slopes[i] / secants[i], b = slopes[i + 1] / secants[i];
    const magnitude = Math.hypot(a, b);
    if (magnitude > 3) {
      slopes[i] = a * 3 / magnitude * secants[i];
      slopes[i + 1] = b * 3 / magnitude * secants[i];
    }
  }
  const points = [];
  for (let i = 0; i < secants.length; i++) {
    const width = xs[i + 1] - xs[i];
    for (let sample = 0; sample < 6; sample++) {
      const t = sample / 6, t2 = t * t, t3 = t2 * t;
      const depth = (2 * t3 - 3 * t2 + 1) * depths[i]
        + (t3 - 2 * t2 + t) * width * slopes[i]
        + (-2 * t3 + 3 * t2) * depths[i + 1]
        + (t3 - t2) * width * slopes[i + 1];
      points.push([lerp(xs[i], xs[i + 1], t), clamp(depth, Math.min(depths[i], depths[i + 1]), Math.max(depths[i], depths[i + 1]))]);
    }
  }
  points.push([xs.at(-1), depths.at(-1)]);
  return points;
}

function makeTerrainShape(width, scale, top, variant, terrain, passage) {
  const family = TERRAIN_CONTOURS[terrain] || TERRAIN_CONTOURS.ruins;
  const roof = top && (passage === 'cavern' || terrain === 'canopy');
  const profiles = roof ? family.vault : family.ground;
  const depths = profiles[variant % profiles.length];
  const surface = sampleTerrainContour(roof ? VAULT_X : RIDGE_X, depths);
  if (!top && ERODED_GROUND_DEPTHS[terrain]) {
    const erosion = ERODED_GROUND_DEPTHS[terrain];
    const carved = sampleTerrainContour(RIDGE_X, erosion[variant % erosion.length]);
    for (let i = 0; i < surface.length; i++) surface[i][1] = Math.max(surface[i][1], carved[i][1]);
  }
  const sign = top ? -1 : 1;
  // Broad rounded vaults expose more roof for longer than the former sharp
  // wedges. Erode their sandstone lip upward to preserve forgiving headroom.
  const vaultHeadroom = roof && terrain === 'ruins' ? 20 : 0;
  // Renderer contract: two offscreen closure points, then the entire visible
  // surface RIGHT-to-LEFT. Neighbours overlap below their eroded shoulders.
  return [[-.80 * width, sign * 900 * scale], [2.45 * width, sign * 900 * scale],
    ...surface.reverse().map(([x, depth]) => [x * width, sign * (depth + vaultHeadroom) * scale])];
}

export function buildFlightLayout({ seed = 1, terrain = 'ruins', elite = false,
  duration = 38, speed = 154, height = 620, passage = 'open', fuelCadence = 3 } = {}) {
  const rng = seededRandom(`${seed}:layout`);
  const motifs = FLIGHT_PATTERNS[terrain] || FLIGHT_PATTERNS.ruins;
  const obstacles = [], embers = [];
  let x = 690, previous = height * .5, index = 0;
  const extent = (Math.max(15, duration) - 2.8) * speed + 98;
  sections: while (x < extent) {
    const pattern = motifs[Math.floor(rng() * motifs.length)];
    for (const normalized of pattern.centers) {
      const center = clamp(height * normalized + (rng() - .5) * height * .025,
        previous - height * .115, previous + height * .115);
      const gap = height * (elite ? .315 : passage === 'cavern' ? .33 : .37) * pattern.gap;
      const width = 132 + rng() * 35;
      if (x + width * 2.5 + 35 > extent) break sections;
      const obstacle = {
        id: index, x, width, center,
        gap, phase: rng() * TAU, pattern: pattern.id,
        motion: terrain === 'canopy' ? height * .008 : 0,
        soft: terrain === 'canopy' && index % 3 === 2,
        destroyed: false, hit: false, passed: false,
        variation: Math.floor(rng() * 4),
      };
      obstacle.landmark = passage === 'cavern' ? ['cave-mouth', 'crystal-vault', 'stone-arch', 'skylight'][index % 4]
        : terrain === 'storm' ? ['mountain-pass', 'spire-ridge', 'wind-saddle'][index % 3]
        : terrain === 'canopy' ? ['root-hollow', 'moon-grove', 'branch-arch'][index % 3]
        : ['temple-slope', 'fallen-arch', 'moon-terrace'][index % 3];
      const ceiling = passage === 'cavern' ? index % 6 !== 5 : terrain === 'canopy' ? index % 3 === 2 : index % 4 === 2;
      obstacle.topShape = ceiling ? makeTerrainShape(width, height / 620, true, index, terrain, passage) : null;
      obstacle.bottomShape = makeTerrainShape(width, height / 620, false, index + 1, terrain, passage);
      obstacles.push(obstacle);
      // Preserve terrain seeds independently of the collectible design.
      for (let j = 0; j < 4; j++) rng();
      previous = center;
      x += (286 + rng() * 27) * pattern.spacing;
      index++;
    }
  }
  const loot = seededRandom(`${seed}:ember-routes`);
  const cadence = clamp(Math.round(fuelCadence), 2, 4);
  const quietSection = Math.floor(loot() * cadence);
  for (const [i, obstacle] of obstacles.entries()) {
    // Long empty stretches make each discovery count. Rewards belong to a
    // particular piece of scenery, rather than a repeating mid-air coin trail.
    if (cadence === 2 ? i % 4 === quietSection : i % cadence === quietSection || (cadence === 4 && i % 4 === (quietSection + 1) % 4)) continue;
    let side = terrain === 'ruins' ? -1 : terrain === 'canopy' ? 1 : loot() < .5 ? -1 : 1;
    if (!obstacle.topShape) side = 1;
    if (!obstacle.bottomShape) side = -1;
    const shape = side < 0 ? obstacle.topShape : obstacle.bottomShape;
    const inward = [...shape].sort((a, b) => side * (a[1] - b[1]))[0];
    const feature = terrain === 'ruins' ? 'arch-relic' : terrain === 'canopy'
      ? obstacle.soft ? 'thorn-heart' : 'branch-dew' : 'spire-shelter';
    const rich = obstacle.soft || i % 4 === 1;
    const add = (dx, value = 1, fuel = false) => {
      const ex = obstacle.x + (fuel ? clamp(inward[0] + dx, 0, 28) : inward[0] + dx);
      let ey = clamp(obstacle.center + side * obstacle.gap / 2 + inward[1]
        - side * (obstacle.motion + 34), 42, height - 42);
      // Fuel sits inward from its landform so a deliberate, gentle approach
      // can sustain flight. Larger relics stay beside the actual terrain edge.
      if (fuel) ey = lerp(ey, obstacle.center, .60);
      // Adjacent scenery also participates, including every possible sway.
      const clear = () => obstacles.every(other =>
        Math.abs(other.x - ex) > 460 || obstaclePolygons({ ...other, motion: 0 }).every(p =>
          !circleHitsPolygon(ex, ey, 23 + other.motion, p)));
      for (let attempt = 0; !clear() && attempt < 12; attempt++) ey = lerp(ey, obstacle.center, .2);
      if (!clear()) return;
      embers.push({ id: `${i}:${embers.length}`, x: ex, y: ey, value, feature,
        fuel, anchor: i, collected: false, attracted: false, phase: loot() * TAU });
    };
    // Ruins: relic below an arch. Canopy: dew along a branch, richer at thorns.
    // Storm: a reward tucked behind the trailing face of a spire.
    const dx = terrain === 'storm' ? obstacle.width * .30 : 0;
    add(dx - 48, 1, true);
    if (rich) add(dx + 25, 3);
  }
  if (obstacles.length) {
    const first = obstacles[0];
    embers.push({ id: 'approach-flame', x: first.x - 270, y: height * .5 + 12,
      value: 1, feature: 'approach', fuel: true, anchor: 0,
      collected: false, attracted: false, phase: loot() * TAU });
  }
  // Both renderers and the collection broad phase rely on world-X ordering.
  embers.sort((a, b) => a.x - b.x);
  return { obstacles, embers };
}

function roundedRect(ctx, x, y, w, h, r = 8) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y); ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius); ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export class WispFlight {
  constructor(options = {}) {
    if (!options.canvas) throw new Error('WispFlight needs a canvas.');
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('A Canvas 2D context is unavailable.');
    this.options = options;
    this.terrain = ['ruins', 'canopy', 'storm'].includes(options.terrain) ? options.terrain : 'ruins';
    this.elite = Boolean(options.elite);
    this.seed = options.seed ?? 1;
    this.duration = clamp(Number(options.duration) || 38, 15, 120);
    const route = options.node || options;
    this.passage = ['open', 'cavern', 'gauntlet'].includes(route.passage) ? route.passage : 'open';
    this.fuelCadence = clamp(Number(route.fuelCadence) || 3, 2, 4);
    this.fuelBonus = clamp(Number(route.fuelBonus) || 0, 0, 10);
    this.flameDrain = clamp(Number(route.flameDrain) || 1, .8, 1.2);
    this.routeReward = clamp(Number(route.routeReward) || 1, 1, 1.5);
    this.totalDistance = this.duration * FLIGHT_TUNING.forwardSpeed;
    this.cards = new Set(options.cards || []);
    this.mod = { gravity: 1, flap: 1, speed: 1, attract: 1,
      boostCooldown: 1, boostDuration: 1, reward: 1, maxHp: 3,
      rebirth: false, rebirthHp: 2, ward: 0, steady: false, ...options.modifiers };
    this.maxHp = Math.max(1, Number(options.maxHp ?? this.mod.maxHp) || 3);
    this.hp = clamp(Number(options.hp ?? this.maxHp), 1, this.maxHp);
    this.flame = clamp(Number.isFinite(options.flame) ? options.flame : FLAME_TUNING.maximum, 0, FLAME_TUNING.maximum);
    this.flaps = 0; this.effortSpent = 0; this.flameRestored = 0;
    this.lastFlapTime = -1000;
    this.shield = Math.max(0, Number(options.shield || 0)) + Math.max(0, Number(this.mod.ward || 0));
    this.rebirthAvailable = Boolean(options.rebirthAvailable ?? this.mod.rebirth);
    this.rebirthUsed = false;
    this.onUpdate = options.onUpdate || (() => {});
    this.onFinish = options.onFinish || (() => {});
    this.onPause = options.onPause || (() => {});
    this.width = 390; this.height = 620; this.pixelRatio = 1;
    this.time = 0; this.distance = 0; this.accumulator = 0; this.lastFrame = 0;
    this.running = false; this.paused = false; this.finished = false; this.destroyed = false;
    this.raf = null; this.score = 0; this.baseEmbers = 0; this.bonusEmbers = 0; this.collisions = 0;
    this.boosts = 0; this.boostTime = 0; this.cooldown = 0; this.invincible = 0;
    this.exitProtection = 0; this.flash = 0; this.shake = 0;
    this.event = ''; this.eventUntil = 0; this.updateClock = 0;
    this.nearMisses = 0; this.destroyedThorns = 0; this.gustSeconds = 0;
    this.stormFeedClock = 0; this.healedFromWarmHeart = false;
    this.particles = []; this.trail = []; this.pickupEffects = []; this.emitClock = 0;
    this.wispBoost = 0;
    this.cosmeticRng = seededRandom(`${this.seed}:cosmetics`);
    this.rigImage = null; this.background = null;
    this.audio = null; this.muted = false; this.lastFlapSound = 0;
    this.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._resize = this.resize.bind(this);
    this._visibility = () => {
      if (typeof document !== 'undefined' && document.hidden && this.running && !this.paused) this.pause(true);
    };
    this._orientation = () => { if (this.running && !this.paused) this.pause(true); this.resize(); };
    this.resize();
    this.player = { x: 98, y: this.height * .5, vy: 0, radius: 11 };
    this.wisp = new WispCompanion(wispHome(this.player, this.time));
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    this.visualBank = 0; this.wingPhase = 0;
    this.layout = buildFlightLayout({ seed: this.seed, terrain: this.terrain,
      elite: this.elite, duration: this.duration, speed: FLIGHT_TUNING.forwardSpeed, height: this.height,
      passage: this.passage, fuelCadence: this.fuelCadence });
    this.challengeIndex = Math.floor(seededRandom(`${this.seed}:challenge`)() * 3);
    this.challengeId = options.challengeId || options.node?.challengeId || ['wisps', 'clean', 'boosts'][this.challengeIndex];
    this.challengeTarget = Number(options.challengeTarget ?? options.node?.challengeTarget) || (this.challengeId === 'wisps' ? 7 : this.challengeId === 'boosts' ? 3 : 0);
    this.challengeText = this.challengeId === 'wisps' ? `Gather ${this.challengeTarget} sparks`
      : this.challengeId === 'boosts' ? `Use Boost ${this.challengeTarget} times` : 'Finish without a hit';
    this.stars = Array.from({ length: 45 }, () => ({ x: this.cosmeticRng() * 390,
      y: this.cosmeticRng() * this.height * .57, size: .4 + this.cosmeticRng() * 1.1,
      phase: this.cosmeticRng() * TAU }));
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._resize);
      window.addEventListener('orientationchange', this._orientation);
      document.addEventListener('visibilitychange', this._visibility);
    }
    this.loadImage(options.assets?.phoenixRig, 'rigImage');
    this.loadImage(options.assets?.background, 'background');
    this.render();
    this.notify();
    if (typeof window !== 'undefined' && this.canvas.ownerDocument) this.initPixelView();
  }

  async initPixelView() {
    try {
      const { WispFlightView } = await import('./wisp-renderer.mjs');
      if (this.destroyed) return;
      this.pixiView = new WispFlightView(this);
      const initialized = await this.pixiView.init();
      if (this.destroyed) { this.pixiView.destroy(); return; }
      this.pixiReady = initialized !== false && this.pixiView.ready !== false;
      this.pixiView.resize();
      this.render(); this.notify();
    } catch (error) {
      this.rendererError = error?.message || 'Pixel renderer unavailable';
      this.pixiReady = false;
      this.pixiView?.destroy();
      this.pixiView = null;
    }
  }

  get scaleY() { return this.height / 620; }
  get baseSpeed() { return FLIGHT_TUNING.forwardSpeed * clamp(Number(this.mod.speed) || 1, .80, 1.25) * (this.elite ? 1.045 : 1); }
  get boostDuration() { return .9 * clamp(Number(this.mod.boostDuration) || 1, .5, 2.5); }
  get boostCooldown() { return 9 * clamp(Number(this.mod.boostCooldown) || 1, .35, 2); }
  get flapCost() { return Math.round(FLAME_TUNING.flapCost * this.flameDrain); }
  get wingRate() { return this.boostTime > 0 ? 9 : this.flame < this.flapCost ? .45 : 5.8; }
  get embers() { return Math.floor((this.baseEmbers + this.bonusEmbers) * Math.max(0, Number(this.mod.reward) || 1) * this.routeReward); }

  loadImage(url, property) {
    if (!url || typeof Image === 'undefined') return;
    const img = new Image();
    img.onload = () => { if (!this.destroyed) { this[property] = img; if (!this.running || this.paused) this.render(); } };
    img.onerror = () => {};
    img.src = url;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || 390), cssHeight = Math.max(1, rect.height || 620);
    const oldHeight = this.height;
    this.height = clamp(390 * cssHeight / cssWidth, 430, 850);
    this.pixelRatio = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    this.canvas.width = Math.round(cssWidth * this.pixelRatio);
    this.canvas.height = Math.round(cssHeight * this.pixelRatio);
    this.ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
    if (this.player && oldHeight !== this.height) {
      const factor = this.height / oldHeight;
      this.player.y *= factor; this.player.vy *= factor;
      this.previousPlayerY = this.player.y;
      this.layout.obstacles.forEach(o => {
        o.center *= factor; o.gap *= factor; o.motion *= factor;
        for (const shape of [o.topShape, o.bottomShape]) if (shape) shape.forEach(point => { point[1] *= factor; });
      });
      this.layout.embers.forEach(e => { e.y *= factor; if (e.pullY !== undefined) e.pullY *= factor; });
      this.stars.forEach(s => { s.y *= factor; });
      this.particles.length = 0;
      this.wisp.y *= factor; this.wisp.previousY = this.wisp.y; this.wisp.history.length = 0;
      this.pickupEffects.length = 0;
      this.trail.length = 0;
    }
    if (this.player && (!this.running || this.paused)) this.render();
    this.pixiView?.resize();
  }

  start() {
    if (this.destroyed || this.finished || this.running) return;
    this.running = true; this.paused = false; this.lastFrame = 0;
    this.raf = requestAnimationFrame(t => this.tick(t));
  }

  flap() {
    if (!this.running || this.paused || this.finished) return false;
    if (this.flame < this.flapCost) {
      this.setEvent('Flame exhausted · glide toward an ember'); this.notify();
      return false;
    }
    this.flame -= this.flapCost;
    this.flaps++; this.effortSpent += this.flapCost;
    this.lastFlapTime = this.time;
    this.player.vy = -FLIGHT_TUNING.flapImpulse * this.scaleY * clamp(Number(this.mod.flap) || 1, .80, 1.20);
    this.burst(this.player.x - 10, this.player.y + 7, 5, '#ffbd53');
    this.sound('flap');
    this.notify();
    return true;
  }

  boost() {
    if (!this.running || this.paused || this.finished || this.cooldown > .001 || this.boostTime > 0) return false;
    this.boostTime = this.boostDuration;
    this.cooldown = this.boostCooldown;
    this.boosts++;
    this.player.vy *= .65;
    this.setEvent('Flame Boost');
    this.burst(this.player.x - 10, this.player.y, 23, '#fff1b5');
    this.sound('boost');
    this.notify();
    return true;
  }

  pause(fromSystem = false) {
    if (!this.running || this.paused || this.finished || this.destroyed) return;
    this.paused = true; this.lastFrame = 0;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null; this.notify(); this.onPause({ fromSystem });
  }

  resume() {
    if (!this.running || !this.paused || this.finished || this.destroyed) return;
    this.paused = false; this.lastFrame = 0; this.accumulator = 0;
    this.raf = requestAnimationFrame(t => this.tick(t));
    this.notify();
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.muted && this.audio?.state === 'running') this.audio.suspend().catch(() => {});
  }

  destroy() {
    this.destroyed = true; this.running = false;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._resize);
      window.removeEventListener('orientationchange', this._orientation);
      document.removeEventListener('visibilitychange', this._visibility);
    }
    if (this.audio) this.audio.close().catch(() => {});
    this.pixiView?.destroy();
    this.pixiView = null;
    this.particles.length = 0;
    this.trail.length = 0;
  }

  tick(timestamp) {
    if (!this.running || this.paused || this.destroyed || this.finished) return;
    if (!this.lastFrame) this.lastFrame = timestamp;
    const elapsed = Math.min(.10, Math.max(0, (timestamp - this.lastFrame) / 1000));
    this.lastFrame = timestamp;
    this.accumulator = Math.min(this.accumulator + elapsed, STEP * 6);
    while (this.accumulator >= STEP && !this.finished) {
      this.step(STEP); this.accumulator -= STEP;
    }
    this.render();
    if (!this.finished && !this.destroyed) this.raf = requestAnimationFrame(t => this.tick(t));
  }

  gustState() {
    if (this.terrain !== 'storm') return { active: false, warning: false, direction: 0, strength: 0 };
    const phase = (this.time + 2) % 8.5;
    const direction = Math.floor((this.time + 2) / 8.5) % 2 ? -1 : 1;
    return { active: phase >= 5.2 && phase < 7.8, warning: phase >= 4.1 && phase < 5.2,
      direction, strength: Math.sin(clamp((phase - 5.2) / 2.6, 0, 1) * Math.PI) };
  }

  obstacleCenter(obstacle) {
    return obstacle.center + Math.sin(this.time * .9 + obstacle.phase) * obstacle.motion;
  }

  clearTerrainY(desiredY) {
    const worldX = this.distance + this.player.x;
    const polygons = this.layout.obstacles.filter(o => !o.destroyed && worldX > o.x - o.width && worldX < o.x + o.width * 2.6)
      .flatMap(o => obstaclePolygons(o, this.time));
    const clear = y => y >= 28 && y <= this.height - 29 &&
      polygons.every(polygon => !circleHitsPolygon(worldX, y, this.player.radius + 5, polygon));
    if (clear(desiredY)) return desiredY;
    for (let offset = 4; offset < this.height; offset += 4) {
      if (clear(desiredY - offset)) return desiredY - offset;
      if (clear(desiredY + offset)) return desiredY + offset;
    }
    return clamp(desiredY, 28, this.height - 29);
  }

  getWispState(y = this.player.y, time = this.time) {
    return this.wisp.state(this, y, time);
  }

  step(dt) {
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    this.time += dt;
    this.wingPhase += dt * this.wingRate;
    const oldBoost = this.boostTime;
    this.boostTime = Math.max(0, this.boostTime - dt);
    const wispTarget = this.boostTime > 0 && this.cards.has('hungry-wisp') ? 1 : 0;
    this.wispBoost += clamp(wispTarget - this.wispBoost, -dt * 5, dt * 5);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.exitProtection = Math.max(0, this.exitProtection - dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt * 18);
    if (oldBoost > 0 && this.boostTime === 0) this.exitProtection = .45;
    this.distance += this.baseSpeed * (this.boostTime > 0 ? 1.48 : 1) * dt;

    const gust = this.gustState();
    let gravity = FLIGHT_TUNING.gravity * this.scaleY * clamp(Number(this.mod.gravity) || 1, .80, 1.20);
    if (gust.active) {
      this.gustSeconds += dt;
      gravity += gust.direction * 54 * this.scaleY * gust.strength * (this.mod.steady ? .45 : 1);
      if (this.cards.has('storm-feeder')) {
        this.stormFeedClock += dt;
        if (this.stormFeedClock >= 1) {
          this.stormFeedClock -= 1;
          this.cooldown = Math.max(0, this.cooldown - 1);
          this.setEvent('Storm Feeder · Boost charged');
          this.burst(this.player.x, this.player.y, 4, '#88e5ef');
        }
      }
    }
    this.player.vy = clamp(this.player.vy + gravity * dt, -520 * this.scaleY, FLIGHT_TUNING.terminalFall * this.scaleY);
    this.player.y += this.player.vy * dt;
    const breathingBank = Math.sin(this.wingPhase * TAU / 6) * .012;
    this.visualBank = lerp(this.visualBank, clamp(this.player.vy / (690 * this.scaleY), -.30, .35) + breathingBank, 1 - Math.exp(-dt * 9));

    if (this.player.y < 27 || this.player.y > this.height - 28) {
      this.player.y = clamp(this.player.y, 28, this.height - 29);
      this.player.vy = this.player.y < 50 ? 70 : -150 * this.scaleY;
      this.hit(null);
    }

    for (const obstacle of this.layout.obstacles) {
      const x = obstacle.x - this.distance;
      if (x > this.width + 250) break;
      if (x + obstacle.width * 2.5 < -30 || obstacle.destroyed) continue;
      const center = this.obstacleCenter(obstacle);
      const top = center - obstacle.gap / 2, bottom = center + obstacle.gap / 2;
      const polygons = obstaclePolygons(obstacle, this.time);
      const colliding = polygons.some(polygon => circleHitsPolygon(this.distance + this.player.x, this.player.y, this.player.radius, polygon));
      if (colliding) {
        if (this.boostTime > 0 && obstacle.soft && this.cards.has('fire-wake')) {
          obstacle.destroyed = true; this.destroyedThorns++;
          for (let i = 0; i < 3; i++) {
            this.layout.embers.push({ id: `thorn:${obstacle.id}:${i}`, generated: true,
              x: this.distance + this.player.x + 12 + i * 14,
              y: this.player.y + (i - 1) * 10, collected: false, attracted: false,
              phase: i * 1.7 });
          }
          this.layout.embers.sort((a, b) => a.x - b.x);
          this.burst(x + obstacle.width / 2, this.player.y, 25, '#ffc478');
          this.setEvent('Shatter Wake · thorns cleared');
        } else if (this.boostTime > 0 || this.exitProtection > 0) {
          // Returning from a protected burst always places the body inside the
          // opening, so the next unprotected frame cannot be an unavoidable hit.
          if (this.boostTime === 0) {
            this.player.y = this.clearTerrainY(clamp(this.player.y, top + 20, bottom - 20));
            this.player.vy *= .6;
          }
        } else if (!obstacle.hit) {
          this.hit(obstacle);
          this.player.y = this.clearTerrainY(clamp(this.player.y, top + 23, bottom - 23));
          this.player.vy *= .25;
        }
      }
      if (!obstacle.passed && x + obstacle.width * 2.5 < this.player.x - this.player.radius) {
        obstacle.passed = true; this.score += 25;
        const edge = Math.min(Math.abs(this.player.y - top), Math.abs(bottom - this.player.y));
        if (edge < 36 && !obstacle.hit) {
          this.nearMisses++; this.score += 15;
          this.burst(this.player.x - 10, this.player.y, 5, '#b8e9dc');
        }
      }
    }

    for (const ember of this.layout.embers) {
      if (ember.collected || ember.carried) continue;
      const x = ember.x - this.distance;
      if (x < -40 || x > this.width + 20) continue;
      if (Math.hypot(this.player.x - x, this.player.y - ember.y) < FLIGHT_TUNING.pickupRadius) this.collect(ember);
    }
    this.wisp.update(this, dt);

    this.trail.push({ worldX: this.distance + this.player.x - 23,
      y: this.player.y + 6, time: this.time, width: this.boostTime > 0 ? 9 : 4.6,
      boost: this.boostTime > 0 });
    while (this.trail.length && (this.trail.length > 72 || this.time - this.trail[0].time > 1.15)) this.trail.shift();
    for (const effect of this.pickupEffects) effect.life -= dt;
    this.pickupEffects = this.pickupEffects.filter(effect => effect.life > 0);
    this.emitClock += dt * (this.boostTime > 0 ? 84 : 20 + 25 * this.flame / FLAME_TUNING.maximum);
    while (this.emitClock >= 1) { this.emitClock--; this.emitFlame(); }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 8 * dt;
      p.rotation = Math.atan2(p.vy, p.vx);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    this.updateClock += dt;
    if (this.updateClock >= .10) { this.updateClock = 0; this.notify(); }
    if (!this.finished && this.distance >= this.totalDistance) this.finish(true);
  }

  hit(obstacle) {
    if (this.invincible > 0 || this.boostTime > 0 || this.exitProtection > 0 || this.finished) return;
    if (obstacle) obstacle.hit = true;
    this.collisions++;
    this.invincible = 1.35; this.flash = .22; this.shake = this.reducedMotion ? 0 : 4;
    if (this.shield > 0) {
      this.shield--; this.setEvent('Ash Ward · protected');
      this.burst(this.player.x, this.player.y, 22, '#a0e6ed'); this.sound('shield');
    } else {
      this.hp--; this.setEvent('One heart lost');
      this.burst(this.player.x, this.player.y, 18, '#ff9b77'); this.sound('hit');
      if (this.hp <= 0) {
        if (this.rebirthAvailable && !this.rebirthUsed) {
          this.rebirthUsed = true; this.rebirthAvailable = false;
          this.hp = Math.min(this.maxHp, Math.max(1, Number(this.mod.rebirthHp) || 1));
          this.flame = Math.max(this.flame, FLAME_TUNING.checkpointMinimum);
          this.invincible = 2.3;
          this.player.vy = -90 * this.scaleY;
          this.trail.length = 0;
          this.setEvent('Rebirth · rise again');
          this.burst(this.player.x, this.player.y, 42, '#fff0bd'); this.sound('rebirth');
        } else {
          this.finish(false);
        }
      }
    }
    this.notify();
  }

  collect(ember) {
    if (ember.collected || this.finished) return;
    ember.collected = true;
    const fuel = ember.generated ? FLAME_TUNING.generatedFuel : (ember.value === 3 ? FLAME_TUNING.heartFuel : FLAME_TUNING.emberFuel) + this.fuelBonus;
    const restored = Math.min(fuel, FLAME_TUNING.maximum - this.flame);
    this.flame += restored; this.flameRestored += restored;
    const origin = ember.deliveredByWisp ? this.getWispState() : this.player;
    this.pickupEffects.push({ x: origin.x, y: origin.y,
      value: ember.value === 3 ? 3 : 1, restored, life: .72 });
    if (this.pickupEffects.length > 12) this.pickupEffects.shift();
    // Converted thorns earn currency, but cannot feed pickup-triggered cards
    // and create an unbounded collection / boost / conversion loop.
    if (ember.generated) {
      this.bonusEmbers++; this.score += 5;
      this.burst(this.player.x - 9, this.player.y + 7, 3, '#ffd5a1');
      this.sound('collect');
      return;
    }
    this.baseEmbers++;
    const value = ember.value === 3 ? 3 : 1;
    this.bonusEmbers += value - 1;
    this.score += value * ((ember.boostedPickup ?? this.boostTime > 0) && this.cards.has('golden-wake') ? 20 : 10);
    this.burst(this.player.x - 9, this.player.y + 7, value === 3 ? 14 : 5, value === 3 ? '#fff2c4' : '#ffe4a2');
    if (value === 3) this.setEvent(`Heart ember · +${restored} Glow`);
    else if (restored > 0 && this.flame <= 45) this.setEvent(`Glow rekindled · +${restored}`);
    if (this.cards.has('kindled-spirit') && this.baseEmbers % 3 === 0) {
      this.cooldown = Math.max(0, this.cooldown - 1);
      this.setEvent('Kindled Spirit · Boost charged');
    }
    if (this.cards.has('warm-heart') && this.baseEmbers >= 8 && !this.healedFromWarmHeart) {
      this.healedFromWarmHeart = true;
      this.hp = Math.min(this.maxHp, this.hp + 1);
      this.setEvent('Warm Heart · restored');
      this.burst(this.player.x, this.player.y, 12, '#bde9b5');
    }
    this.sound('collect');
  }

  challengeComplete() {
    return this.challengeId === 'wisps' ? this.baseEmbers >= this.challengeTarget
      : this.challengeId === 'boosts' ? this.boosts >= this.challengeTarget : this.collisions === 0;
  }

  getState() {
    return { hp: this.hp, maxHp: this.maxHp, score: Math.floor(this.score), embers: this.embers,
      flame: this.flame, maxFlame: FLAME_TUNING.maximum, flapCost: this.flapCost,
      canFlap: this.flame >= this.flapCost, flaps: this.flaps,
      wisp: this.getWispState(),
      collected: this.baseEmbers, boostCooldown: this.cooldown,
      boostReady: this.cooldown <= .001 && this.boostTime <= 0,
      boostTime: this.boostTime, progress: clamp(this.distance / this.totalDistance, 0, 1),
      shield: this.shield, event: this.time < this.eventUntil ? this.event : '',
      renderer: this.pixiReady ? 'pixel-canvas' : 'canvas',
      paused: this.paused, finished: this.finished, rebirthUsed: this.rebirthUsed,
      time: this.time, remaining: Math.max(0, (this.totalDistance - this.distance) / this.baseSpeed),
      challenge: this.challengeText, challengeComplete: this.challengeComplete() };
  }

  notify() { if (!this.destroyed) this.onUpdate(this.getState()); }

  setEvent(value) { this.event = value; this.eventUntil = this.time + 2.2; }

  finish(success) {
    if (this.finished || this.destroyed) return;
    this.finished = true; this.running = false;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    const result = { success, hp: Math.max(0, this.hp), embers: this.embers,
      flame: this.flame,
      score: Math.floor(this.score), collected: this.baseEmbers, collisions: this.collisions,
      boosts: this.boosts, rebirthUsed: this.rebirthUsed,
      challengeComplete: success && this.challengeComplete(),
      stats: { baseEmbers: this.baseEmbers, bonusEmbers: this.bonusEmbers, nearMisses: this.nearMisses,
        flaps: this.flaps, effortSpent: this.effortSpent, flameRestored: this.flameRestored,
        destroyedThorns: this.destroyedThorns, gustSeconds: Math.round(this.gustSeconds),
        flightSeconds: Math.round(this.time), challenge: this.challengeText } };
    this.notify(); this.onFinish(result);
  }

  emitFlame() {
    if (this.particles.length >= (this.reducedMotion ? 45 : 150)) return;
    const rng = this.cosmeticRng;
    const boosted = this.boostTime > 0, type = rng() > .32 ? 'spark' : 'ember';
    const life = .32 + rng() * (boosted ? .58 : .43);
    const vx = -(boosted ? 220 : 117) - rng() * 56;
    const vy = -this.player.vy * .12 + (rng() - .5) * (boosted ? 24 : 15);
    this.particles.push({ type, x: this.player.x - 25, y: this.player.y + 6 + (rng() - .5) * 6,
      vx, vy, rotation: Math.atan2(vy, vx), life, maxLife: life,
      size: type === 'spark' ? .55 + rng() * .85 : .8 + rng() * 1.25,
      length: type === 'spark' ? (boosted ? 9 : 4) + rng() * (boosted ? 12 : 6) : 1.5,
      glow: type === 'spark' ? .28 : .46,
      color: rng() > .68 ? '#fff1d0' : rng() > .45 ? '#e6ac5f' : '#c56b3c' });
  }

  burst(x, y, count, color) {
    const amount = this.reducedMotion ? Math.ceil(count * .4) : count;
    for (let i = 0; i < amount && this.particles.length < 150; i++) {
      const angle = this.cosmeticRng() * TAU, speed = 15 + this.cosmeticRng() * 70;
      const vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
      this.particles.push({ type: i % 3 === 0 ? 'spark' : 'ember', x, y, vx, vy,
        life: .25 + this.cosmeticRng() * .45, maxLife: .7,
        size: .7 + this.cosmeticRng() * 1.5, length: i % 3 === 0 ? 5 : 1.5,
        rotation: Math.atan2(vy, vx), glow: .36, color });
    }
  }

  sound(type) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audio) this.audio = new AudioContext();
      if (this.audio.state === 'suspended') this.audio.resume().catch(() => {});
      const now = this.audio.currentTime;
      if (type === 'flap' && now - this.lastFlapSound < .10) return;
      if (type === 'flap') this.lastFlapSound = now;
      const tones = { flap: [220, 150, .06, .018], collect: [780, 1280, .075, .025],
        boost: [120, 610, .26, .045], hit: [130, 65, .16, .035],
        shield: [500, 900, .2, .035], rebirth: [280, 1120, .48, .04] };
      const [from, to, length, volume] = tones[type] || tones.flap;
      const oscillator = this.audio.createOscillator(), gain = this.audio.createGain();
      oscillator.type = type === 'hit' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(to, now + length);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + length);
      oscillator.connect(gain); gain.connect(this.audio.destination);
      oscillator.start(now); oscillator.stop(now + length + .02);
    } catch { /* Audio is optional and never affects play. */ }
  }

  render() {
    if (this.destroyed) return;
    const blend = clamp(this.accumulator / STEP, 0, 1);
    this.renderDistance = lerp(this.previousDistance ?? this.distance, this.distance, blend);
    this.renderPlayerY = lerp(this.previousPlayerY ?? this.player.y, this.player.y, blend);
    this.visualTime = this.time + blend * STEP;
    if (this.pixiReady && this.pixiView) { this.pixiView.render(this); return; }
    const c = this.ctx, W = this.width, H = this.height;
    c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.drawBackground(c, W, H);
    c.save();
    if (this.shake > 0) c.translate(Math.sin(this.time * 77) * this.shake, Math.cos(this.time * 63) * this.shake * .5);
    this.drawWind(c, W, H);
    for (const o of this.layout.obstacles) {
      const x = o.x - this.renderDistance;
      if (x > W + 250) break;
      if (x + o.width * 2.5 < -70 || o.destroyed) continue;
      this.drawObstacle(c, o, x, H);
    }
    this.drawEmbers(c);
    this.drawFlightTrail(c);
    this.drawParticles(c);
    this.drawWisp(c);
    this.drawPhoenix(c);
    this.drawPickups(c);
    this.drawPortal(c, W, H);
    this.drawForeground(c, W, H);
    c.restore();
    if (this.flash > 0) { c.fillStyle = `rgba(255,196,149,${this.flash * .36})`; c.fillRect(0, 0, W, H); }
    const vignette = c.createRadialGradient(W / 2, H * .43, W * .3, W / 2, H * .45, H * .8);
    vignette.addColorStop(0, 'rgba(5,12,24,0)'); vignette.addColorStop(1, 'rgba(5,12,24,.36)');
    c.fillStyle = vignette; c.fillRect(0, 0, W, H);
  }

  drawBackground(c, W, H) {
    const palettes = { ruins: ['#111d35', '#5c3b54', '#e4a16e'],
      canopy: ['#102c32', '#40555a', '#cfaa76'], storm: ['#101c35', '#384b72', '#c59488'] };
    const colors = palettes[this.terrain];
    const gradient = c.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.56, colors[1]); gradient.addColorStop(1, colors[2]);
    c.fillStyle = gradient; c.fillRect(0, 0, W, H);
    if (this.background) {
      const scale = Math.max(W / this.background.width, H / this.background.height);
      const iw = this.background.width * scale, ih = this.background.height * scale;
      c.globalAlpha = this.terrain === 'storm' ? .53 : .68;
      c.drawImage(this.background, -(iw - W) / 2 + Math.sin(this.distance * .0004) * 8, -(ih - H) / 2, iw, ih);
      c.globalAlpha = 1;
      c.fillStyle = this.terrain === 'canopy' ? 'rgba(5,39,39,.17)' : this.terrain === 'storm' ? 'rgba(9,24,52,.26)' : 'rgba(32,20,42,.09)';
      c.fillRect(0, 0, W, H);
    }
    const sunX = W * .74 - Math.sin(this.distance * .0001) * 8, sunY = H * .28;
    const halo = c.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
    halo.addColorStop(0, 'rgba(255,220,157,.30)'); halo.addColorStop(1, 'rgba(255,175,115,0)');
    c.fillStyle = halo; c.fillRect(sunX - 120, sunY - 120, 240, 240);
    c.fillStyle = this.terrain === 'storm' ? 'rgba(228,213,193,.36)' : 'rgba(255,223,162,.68)';
    c.beginPath(); c.arc(sunX, sunY, 24, 0, TAU); c.fill();
    if (this.stars) for (const star of this.stars) {
      c.globalAlpha = .2 + (Math.sin(this.time * .8 + star.phase) + 1) * .17;
      c.fillStyle = '#eae8d8'; c.fillRect(star.x, star.y, star.size, star.size);
    }
    c.globalAlpha = 1;
    for (let layer = 0; layer < 3; layer++) {
      const parallax = (this.renderDistance ?? this.distance) * (.045 + layer * .06);
      c.fillStyle = ['rgba(29,34,57,.26)', 'rgba(24,36,52,.37)', 'rgba(17,33,44,.57)'][layer];
      c.beginPath(); c.moveTo(-30, H + 10);
      for (let i = -1; i < 12; i++) {
        const x = i * 64 - (parallax % 64);
        const peak = H * (.62 + layer * .095) + Math.sin(i * 1.9 + Math.floor(parallax / 64) * 1.9 + layer) * (34 - layer * 6);
        c.lineTo(x, peak); c.lineTo(x + 28, peak - 26 - Math.sin(i * 2.3) * 14);
      }
      c.lineTo(W + 50, H + 10); c.closePath(); c.fill();
    }
    // Distant floating temples remain low contrast behind the playable lanes.
    c.fillStyle = 'rgba(25,33,50,.33)';
    for (let i = -1; i < 5; i++) {
      const x = i * 142 - (((this.renderDistance ?? this.distance) * .09) % 142), y = H * .57 + Math.sin(i * 2.7) * H * .13;
      c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x + 48, y); c.lineTo(x + 16, y + 29); c.closePath(); c.fill();
      c.fillRect(x - 5, y - 41, 7, 41); c.fillRect(x + 29, y - 41, 7, 41); c.fillRect(x - 9, y - 46, 49, 7);
    }
    const mist = c.createLinearGradient(0, H * .65, 0, H);
    mist.addColorStop(0, 'rgba(208,164,137,0)'); mist.addColorStop(1, 'rgba(173,154,137,.16)');
    c.fillStyle = mist; c.fillRect(0, H * .65, W, H * .35);
  }

  drawObstacle(c, o, x, H) {
    const offset = this.renderDistance ?? this.distance;
    for (const polygon of obstaclePolygons(o, this.visualTime ?? this.time)) {
      const points = polygon.map(([px, py]) => [px - offset, py]);
      this.drawLandform(c, points, o);
    }
  }

  drawLandform(c, points, o) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const width = right - left, height = bottom - top;
    const path = () => { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
    const palettes = { ruins: ['#b9a18a', '#68646c', '#303b50', '#172c3d'],
      canopy: ['#99a277', '#596c53', '#2d4d43', '#102f37'], storm: ['#a2c5ca', '#6589a0', '#344c6b', '#142b45'] };
    const colors = palettes[this.terrain];
    const gradient = c.createLinearGradient(left, top, right, bottom);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.27, colors[1]); gradient.addColorStop(.66, colors[2]); gradient.addColorStop(1, colors[3]);
    path(); c.fillStyle = gradient; c.fill();
    c.save(); path(); c.clip();
    if (this.terrain === 'ruins') {
      // Shattered masonry follows the island's curved profile; there are no
      // infinite pillars or rectangular tube faces in either draw or physics.
      for (let row = 0; row < 5; row++) for (let col = -1; col < 7; col++) {
        const bx = left + col * 33 + (row % 2) * 16, by = top + row * 24;
        c.fillStyle = (col + row + o.id) % 3 ? 'rgba(194,167,138,.10)' : 'rgba(18,33,51,.18)';
        c.beginPath(); c.moveTo(bx + 2, by + 3); c.lineTo(bx + 30, by + 1); c.lineTo(bx + 34, by + 20); c.lineTo(bx + 3, by + 23); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(220,192,153,.17)'; c.lineWidth = .9; c.stroke();
      }
      c.strokeStyle = 'rgba(230,205,165,.32)'; c.lineWidth = 12;
      c.beginPath(); c.ellipse(left + width * .56, top + height * .79, width * .34, height * .6, -.18, Math.PI * 1.02, Math.PI * 1.95); c.stroke();
      c.strokeStyle = 'rgba(25,42,54,.45)'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(left + width * .22, top - 3); c.lineTo(left + width * .4, top + height * .44); c.lineTo(left + width * .34, bottom + 5); c.stroke();
    } else if (this.terrain === 'canopy') {
      for (let i = 0; i < 7; i++) {
        const yy = top + height * .1 + i * 16;
        c.strokeStyle = i % 2 ? 'rgba(180,176,117,.28)' : 'rgba(21,52,45,.45)'; c.lineWidth = 4 + i % 3;
        c.beginPath(); c.moveTo(left - 10, yy); c.bezierCurveTo(left + width * .28, yy - 39, left + width * .64, yy + 34, right + 8, yy - 5); c.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const xx = left + ((i * 43 + o.id * 17) % Math.max(1, width));
        const yy = top + ((i * 29 + o.id * 11) % Math.max(1, height));
        c.fillStyle = i % 2 ? 'rgba(146,169,112,.4)' : 'rgba(42,91,67,.54)';
        c.beginPath(); c.ellipse(xx, yy, 23, 10, -.5 + i * .7, 0, TAU); c.fill();
      }
      if (o.soft) { c.strokeStyle = '#c9ac75'; c.lineWidth = 3; c.beginPath(); c.moveTo(left, top + height * .4); c.bezierCurveTo(left + width * .4, bottom, left + width * .6, top - 15, right, top + height * .5); c.stroke(); }
    } else {
      for (let i = 0; i < 6; i++) {
        const xx = left + width * i / 5;
        c.fillStyle = i % 2 ? 'rgba(160,212,221,.20)' : 'rgba(20,44,70,.30)';
        c.beginPath(); c.moveTo(xx, top - 4); c.lineTo(xx + 34, top + height * .38); c.lineTo(xx + 14, bottom + 2); c.lineTo(xx - 16, top + height * .61); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(178,232,233,.28)'; c.lineWidth = 1; c.stroke();
      }
    }
    const rim = c.createLinearGradient(0, top, 0, bottom);
    rim.addColorStop(0, 'rgba(218,219,158,.48)'); rim.addColorStop(.27, 'rgba(120,160,121,.28)'); rim.addColorStop(1, 'rgba(20,36,45,0)');
    c.fillStyle = rim; c.fillRect(left, top, width, 19);
    const wisp = this.getWispState(this.renderPlayerY ?? this.player.y);
    c.globalCompositeOperation = 'screen';
    for (const source of [
      { x: this.player.x, y: this.renderPlayerY ?? this.player.y, radius: 235,
        color: this.boostTime > 0 ? 'rgba(255,141,56,.38)' : 'rgba(255,141,56,.24)' },
      { x: wisp.x, y: wisp.y, radius: 95 + wisp.radius, color: 'rgba(245,248,255,.34)' },
    ]) {
      const light = c.createRadialGradient(source.x, source.y, 0, source.x, source.y, source.radius);
      light.addColorStop(0, source.color); light.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = light; c.fillRect(left, top, width, height);
    }
    c.restore();
    path(); c.strokeStyle = this.terrain === 'storm' ? 'rgba(173,225,230,.43)' : 'rgba(234,204,154,.31)'; c.lineWidth = 1.15; c.stroke();
    // Hairline roots and moss are decorative; the large shaded silhouette is
    // exactly the polygon used by circle collisions.
    if (this.terrain !== 'storm') {
      for (let i = 0; i < 3; i++) {
        const xx = left + width * (.3 + i * .21), yy = bottom - 7 - i * 4;
        c.strokeStyle = 'rgba(70,99,69,.59)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx - 9, yy + 18, xx + Math.sin(o.id + i) * 9, yy + 27); c.stroke();
      }
    }
  }

  drawEmbers(c) {
    for (const ember of this.layout.embers) {
      if (ember.carried || ember.collected) continue;
      const x = ember.x - (this.renderDistance ?? this.distance);
      if (x > this.width + 30) break;
      if (ember.collected || x < -20) continue;
      const animation = this.reducedMotion ? 0 : this.time;
      const y = ember.y + (ember.attracted ? 0 : Math.sin(animation * 2.8 + ember.phase) * 2);
      const rich = ember.value === 3;
      c.save(); c.translate(x, y);
      c.fillStyle = 'rgba(255,161,62,.20)'; c.beginPath();
      c.ellipse(-10, 0, rich ? 26 : 17, rich ? 6 : 3, 0, 0, TAU); c.fill();
      if (rich) {
        c.fillStyle = 'rgba(255,156,68,.17)'; c.beginPath(); c.arc(0, 0, 23, 0, TAU); c.fill();
        c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff0c9';
        c.fillText('3', 0, 26);
      }
      for (let j = 0; j < (rich ? 3 : 1); j++) {
        const angle = animation * 2 + ember.phase + j * TAU / 3;
        c.fillStyle = '#ffdf8f'; c.beginPath();
        c.arc(Math.cos(angle) * (rich ? 17 : 10), Math.sin(angle) * (rich ? 11 : 6), 1.3, 0, TAU); c.fill();
      }
      if (rich) c.scale(1.65, 1.65);
      c.translate(-x, -y);
      c.fillStyle = 'rgba(255,201,111,.10)'; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,215,139,.21)'; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill();
      c.fillStyle = '#ffdca0'; c.beginPath(); c.moveTo(x, y - 5); c.quadraticCurveTo(x + 6, y - 1, x + 2, y + 5);
      c.quadraticCurveTo(x - 5, y + 6, x - 4, y); c.quadraticCurveTo(x - 2, y - 2, x, y - 5); c.fill();
      c.fillStyle = '#fff4d1'; c.beginPath(); c.ellipse(x, y + 1, 1.5, 2.5, .4, 0, TAU); c.fill();
      c.restore();
    }
  }

  drawPickups(c) {
    c.save();
    for (const effect of this.pickupEffects) {
      const t = 1 - effect.life / .72;
      c.globalAlpha = (1 - t) * .8; c.strokeStyle = '#ffdc86'; c.lineWidth = 2;
      c.beginPath(); c.arc(effect.x, effect.y, this.reducedMotion ? 18 : 8 + t * 44, 0, TAU); c.stroke();
      c.globalAlpha = Math.max(0, 1 - t * 3) * .35; c.fillStyle = '#ffe6a5';
      c.beginPath(); c.arc(effect.x, effect.y, 23, 0, TAU); c.fill();
      c.globalAlpha = Math.min(1, (1 - t) * 3); c.font = 'bold 18px system-ui'; c.textAlign = 'center';
      c.font = effect.restored > 0 ? 'bold 13px system-ui' : 'bold 18px system-ui';
      c.fillText(effect.restored > 0 ? `+${effect.restored} FLAME` : `+${effect.value}`, effect.x + 15, effect.y - 22 - (this.reducedMotion ? 0 : t * 32));
    }
    c.restore();
  }

  drawParticles(c) {
    c.save(); c.globalCompositeOperation = 'screen';
    for (const p of this.particles) {
      const life = clamp(p.life / p.maxLife, 0, 1);
      c.globalAlpha = life * .63;
      const length = p.type === 'spark' ? (p.length || 5) * (.4 + life * .6) : p.size;
      c.fillStyle = p.color; c.beginPath(); c.ellipse(p.x, p.y, length, p.size * (.4 + life * .5), p.rotation || 0, 0, TAU); c.fill();
      if (p.type === 'spark' && life > .35) {
        c.globalAlpha = life * .5; c.fillStyle = '#fff4d9';
        c.beginPath(); c.ellipse(p.x, p.y, length * .7, p.size * .24, p.rotation || 0, 0, TAU); c.fill();
      }
    }
    c.restore();
  }

  drawFlightTrail(c) {
    if (this.trail.length < 2) return;
    const distance = this.renderDistance ?? this.distance;
    c.save(); c.globalCompositeOperation = 'screen'; c.lineCap = 'round';
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1], b = this.trail[i];
        const age = clamp((this.time - b.time) / 1.15, 0, 1);
        const taper = Math.pow(1 - age, 1.7);
        c.strokeStyle = ['#b66b3c', '#e3ad63', '#fff1ca'][layer];
        c.globalAlpha = taper * [.08, .20, .41][layer];
        c.lineWidth = Math.max(.15, b.width * taper * [2.4, 1, .24][layer]);
        c.beginPath(); c.moveTo(a.worldX - distance, a.y); c.lineTo(b.worldX - distance, b.y); c.stroke();
      }
    }
    c.restore();
  }

  drawWisp(c) {
    const state = this.getWispState(this.renderPlayerY ?? this.player.y, this.visualTime ?? this.time);
    const { x, y, homeX, homeY, radius: reach, recovery, phase, carrying } = state;
    c.save();
    const field = c.createRadialGradient(homeX, homeY, 0, homeX, homeY, reach);
    field.addColorStop(0, phase === 'ready' ? 'rgba(119,245,214,.08)' : 'rgba(119,245,214,.025)');
    field.addColorStop(1, 'rgba(119,245,214,0)');
    c.fillStyle = field; c.fillRect(homeX - reach, homeY - reach, reach * 2, reach * 2);
    c.strokeStyle = phase === 'ready' ? 'rgba(151,246,220,.18)' : 'rgba(151,246,220,.05)'; c.lineWidth = .8;
    c.beginPath(); c.arc(homeX, homeY, reach, 0, TAU); c.stroke();
    if (phase === 'cooldown') {
      c.strokeStyle = 'rgba(151,246,220,.7)'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(homeX, homeY, 13, -Math.PI / 2, -Math.PI / 2 + TAU * recovery); c.stroke();
    }
    const history = this.wisp.history;
    c.strokeStyle = carrying ? '#ffdc99' : '#e9efff'; c.lineWidth = 1.4;
    for (let i = 1; i < history.length; i++) {
      c.globalAlpha = i / history.length * .6; c.beginPath();
      c.moveTo(history[i - 1].x - (this.renderDistance ?? this.distance), history[i - 1].y);
      c.lineTo(history[i].x - (this.renderDistance ?? this.distance), history[i].y); c.stroke();
    }
    c.globalAlpha = 1;
    const glow = c.createRadialGradient(x, y, 0, x, y, 28);
    glow.addColorStop(0, 'rgba(250,252,255,.8)');
    glow.addColorStop(.35, 'rgba(230,240,255,.25)'); glow.addColorStop(1, 'rgba(230,240,255,0)');
    c.fillStyle = glow; c.fillRect(x - 28, y - 28, 56, 56);
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
    if (carrying) { c.fillStyle = '#ffd38a'; c.beginPath(); c.ellipse(x + 8, y + 3, 3, 5, 0, 0, TAU); c.fill(); }
    c.restore();
  }

  drawPhoenix(c) {
    const ice = this.options.element === 'ice', t = this.visualTime ?? this.time;
    const p = this.player, y = this.renderPlayerY ?? p.y;
    c.save(); c.translate(Math.round(p.x), Math.round(y));
    c.fillStyle = ice ? '#4f8590' : '#a35436';
    c.fillRect(-10, -8, 18, 18); c.fillRect(-6, -15, 10, 7);
    c.fillRect(-17 - Math.round(Math.sin(t * 14) * 3), 4, 10, 5);
    c.fillStyle = ice ? '#b0d7d8' : '#edb26b'; c.fillRect(-6, -5, 12, 13);
    c.fillStyle = '#eee7ca'; c.fillRect(-2, -1, 6, 7); c.restore();
  }

  drawFireRibbons(c, boosted) {
    const phase = this.visualTime ?? this.time;
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const wave = Math.sin(phase * 9 + i * .9) * (boosted ? 9 : 5);
      c.strokeStyle = ['rgba(255,199,89,.62)', 'rgba(255,113,57,.45)', 'rgba(255,225,145,.48)', 'rgba(246,78,57,.36)'][i];
      c.lineWidth = (boosted ? 3.2 : 1.8) - i * .3;
      c.beginPath(); c.moveTo(-20, 5 + i * 2);
      c.bezierCurveTo(-38, 20 + wave, -53, -4 + wave, -(boosted ? 94 : 67) - i * 3, 11 + wave + i * 2); c.stroke();
    }
    c.restore();
  }

  getExitPortal() {
    const remaining = (this.totalDistance - this.distance) / this.baseSpeed;
    if (remaining > 2.5) return null;
    const progress = clamp(1 - remaining / 2.5, 0, 1);
    return { x: lerp(this.width + 55, this.player.x, progress),
      y: lerp(this.height * .5, this.renderPlayerY ?? this.player.y, progress * progress), progress };
  }

  drawPortal(c, W, H) {
    const portal = this.getExitPortal();
    if (!portal) return;
    const t = this.visualTime ?? this.time;
    c.save(); c.translate(portal.x, portal.y);
    const glow = c.createRadialGradient(0, 0, 10, 0, 0, 130);
    glow.addColorStop(0, 'rgba(235,249,201,.31)'); glow.addColorStop(.45, 'rgba(183,237,201,.15)'); glow.addColorStop(1, 'rgba(174,221,197,0)');
    c.fillStyle = glow; c.fillRect(-140, -150, 280, 300);
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = ['rgba(242,224,156,.85)', 'rgba(187,239,210,.75)', 'rgba(255,247,199,.47)', 'rgba(137,201,185,.38)'][i];
      c.lineWidth = 2.5 - i * .4;
      c.beginPath(); c.ellipse(0, 0, 30 + i * 6 + Math.sin(t * 2 + i) * 2, 106 + i * 4, Math.sin(t + i) * .035, 0, TAU); c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const angle = t * .5 + i * TAU / 12;
      c.fillStyle = '#ffedb4'; c.beginPath(); c.arc(Math.cos(angle) * 38, Math.sin(angle) * 113, 1.6, 0, TAU); c.fill();
    }
    c.restore();
  }

  drawProceduralPhoenix(c, boosted) {
    const flap = Math.sin(this.wingPhase * TAU / 6);
    const wingY = -21 - flap * 13;
    // Long individual tail feathers move independently from the wingbeat.
    for (let i = 0; i < 5; i++) {
      const wave = Math.sin(this.time * 5 + i * .7) * 5;
      c.strokeStyle = ['#ffb646', '#f26336', '#ffd46d', '#db4834', '#ff963f'][i];
      c.lineWidth = 4 - i * .45; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-12, 5 + i);
      c.bezierCurveTo(-25, 18 + wave, -34 - i * 3, 3 + wave, -48 - i * 4, 22 - i * 2 + wave); c.stroke();
    }
    const farWing = c.createLinearGradient(-22, wingY, 4, 8);
    farWing.addColorStop(0, '#ffc15c'); farWing.addColorStop(1, '#c84332');
    c.fillStyle = farWing; c.beginPath(); c.moveTo(-3, -5); c.quadraticCurveTo(-18, wingY - 8, -34, wingY + 4);
    c.lineTo(-25, wingY + 6); c.lineTo(-30, wingY + 14); c.lineTo(-19, wingY + 13); c.lineTo(-21, wingY + 23);
    c.quadraticCurveTo(-10, 12, 2, 6); c.closePath(); c.fill();
    const body = c.createLinearGradient(0, -13, 0, 14);
    body.addColorStop(0, '#ffe1a0'); body.addColorStop(.45, '#f29e42'); body.addColorStop(1, '#bd3e2b');
    c.fillStyle = body; c.beginPath(); c.ellipse(-2, 1, 21, 11, -.2, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(15, -8, 10, 9, -.25, 0, TAU); c.fill();
    const nearWing = c.createLinearGradient(0, wingY - 10, 0, 13);
    nearWing.addColorStop(0, '#ffe39a'); nearWing.addColorStop(.35, '#ffb348'); nearWing.addColorStop(1, '#dc5531');
    c.fillStyle = nearWing; c.beginPath(); c.moveTo(3, 5); c.quadraticCurveTo(-1, wingY - 4, -16, wingY - 15);
    c.lineTo(-14, wingY - 2); c.lineTo(-24, wingY - 8); c.lineTo(-19, wingY + 6); c.lineTo(-29, wingY + 3);
    c.quadraticCurveTo(-24, 5, -7, 9); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,235,178,.55)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 3); c.quadraticCurveTo(-4, wingY, -16, wingY - 9); c.stroke();
    c.fillStyle = '#ffe9af'; c.beginPath(); c.moveTo(22, -10); c.lineTo(32, -7); c.lineTo(22, -4); c.fill();
    c.fillStyle = '#f4bd53'; c.beginPath(); c.moveTo(11, -14); c.lineTo(4, -25); c.lineTo(16, -18); c.lineTo(16, -26); c.lineTo(22, -14); c.fill();
    c.fillStyle = '#172338'; c.beginPath(); c.arc(19, -10, 1.7, 0, TAU); c.fill();
    c.fillStyle = '#fff6d5'; c.beginPath(); c.arc(19.6, -10.5, .55, 0, TAU); c.fill();
  }

  drawWind(c, W, H) {
    const gust = this.gustState();
    if (!gust.active && !gust.warning) return;
    c.save(); c.strokeStyle = gust.warning ? 'rgba(184,227,232,.15)' : 'rgba(184,227,232,.29)';
    c.lineWidth = 1;
    for (let i = 0; i < 13; i++) {
      const x = ((i * 73 + this.time * 46) % (W + 100)) - 50;
      const y = ((i * 91 - this.time * gust.direction * 52) % H + H) % H;
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 8, y - gust.direction * 15, x + 18, y - gust.direction * 31, x + 28, y - gust.direction * 47); c.stroke();
    }
    c.font = '600 9px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillStyle = 'rgba(207,239,236,.78)';
    c.fillText(gust.warning ? 'WIND APPROACHING' : (gust.direction < 0 ? 'RISING WIND' : 'FALLING WIND'), W / 2, 28);
    c.restore();
  }

  drawForeground(c, W, H) {
    c.fillStyle = 'rgba(12,29,35,.8)';
    for (let i = -1; i < 14; i++) {
      const x = i * 39 - (((this.renderDistance ?? this.distance) * .8) % 39), y = H + 7;
      c.beginPath(); c.moveTo(x - 13, y); c.quadraticCurveTo(x + 4, y - 15 - Math.sin(i * 2.1) * 4, x + 17, y); c.fill();
    }
    const progress = clamp(this.time / this.duration, 0, 1);
    if (progress > .86) {
      const x = W + 100 - (progress - .86) / .14 * 100;
      const glow = c.createRadialGradient(x, H / 2, 0, x, H / 2, H * .45);
      glow.addColorStop(0, 'rgba(255,222,160,.30)'); glow.addColorStop(1, 'rgba(255,222,160,0)');
      c.fillStyle = glow; c.fillRect(0, 0, W, H);
    }
  }
}

// Preserve the simulation API used by existing saves and development tools.
export { WispFlight as PhoenixFlight };
