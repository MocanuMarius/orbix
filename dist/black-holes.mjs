import { obstacleEdgeClearance } from './edging-pulse.mjs?v=guardian-overflow-1';

// Rates are internal flight Sparks. The HUD displays 0.3 of these units: a
// 40-unit pass costs about 10 Sparks/s, a 100-unit pass about 1.6 Sparks/s.
// Softening and the cap make direct core contact finite, never a collision.
export const BLACK_HOLE_TUNING = Object.freeze({ coreRadius: 16, influence: 220,
  softening: 22, coefficient: 72000, maximumRate: 80, minimumBypass: 135,
  corridorHalfWidth: 270, laneRadius: 18, sampleSpacing: 24,
  minimumStart: 1150, exitClearance: 650, referenceHeight: 430 });
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hash = value => { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };

export function blackHoleDrainRate(distance, influence = BLACK_HOLE_TUNING.influence) {
  if (!Number.isFinite(distance) || distance >= influence || influence <= 0) return 0;
  const t = BLACK_HOLE_TUNING, d = Math.max(0, distance), soft = t.softening ** 2;
  return clamp(t.coefficient * (1 / (d * d + soft) - 1 / (influence * influence + soft)), 0, t.maximumRate);
}

// Placement is validated at the shortest supported viewport. Resizing only
// stretches Y from this reference, so it cannot squeeze the checked lane.
// Inflation by the whole motion amplitude includes EVERY sway phase (and
// solid prop), rather than checking only the two sway endpoints.
function referenceGeometry(engine) {
  const factor = BLACK_HOLE_TUNING.referenceHeight / engine.height;
  const shape = points => points?.map(([x, y]) => [x, y * factor]);
  return (engine.layout?.obstacles || []).filter(o => !o.destroyed).map(o => ({ ...o,
    center: o.center * factor, gap: o.gap * factor, motion: (o.motion || 0) * factor,
    topShape: shape(o.topShape), bottomShape: shape(o.bottomShape),
    sceneProps: (o.sceneProps || []).map(prop => ({ ...prop,
      parts: prop.parts.map(part => ({ ...part, polygon: shape(part.polygon) })) })) }));
}

function clearAt(obstacles, x, y, radius, height) {
  if (y - radius <= 27 || y + radius >= height - 28) return false;
  return obstacles.every(o => x + radius + Math.abs(o.motion) < o.x - o.width
    || x - radius - Math.abs(o.motion) > o.x + o.width * 2.5
    || obstacleEdgeClearance(x, y, radius + Math.abs(o.motion), o, 0, 0, o.center) > 0);
}

function quietAt(engine, x) {
  const reach = BLACK_HOLE_TUNING.influence + 50;
  return !(engine.layout?.flightForks || []).some(f=>x+reach>f.approachStart&&x-reach<f.exitEnd)
    && !(engine.layout?.sections || []).some(s => (s.hard || s.authoredChallenge)
      && x + reach > s.start && x - reach < s.end)
    && !(engine.layout?.obstacles || []).some(o => (o.hard || o.reservedDraft)
      && x + reach > o.x - o.width && x - reach < o.x + o.width * 2.5)
    && !(engine.layout?.riskChains || []).some(s => x + reach > s.start && x - reach < s.end)
    && !(engine.drafts?.zones || []).some(z => Math.abs(x - z.x) < reach + z.rx)
    && !(engine.biomeDynamics?.items || []).some(item => Math.abs(x - item.x) < reach + (item.radius || 14));
}

/** A continuous straight bypass, including solid scenery and all sway phases.
 * The extra half-sample radius covers every point BETWEEN the sample centres. */
export function blackHoleLaneClear(engine, item) {
  const lane = item.bypass;
  if (!lane) return false;
  const t = BLACK_HOLE_TUNING, step = t.sampleSpacing;
  const radius = t.laneRadius + step / 2, obstacles = engine.layout?.obstacles || [];
  const count = Math.ceil((lane.endX - lane.startX) / step);
  for (let i = 0; i <= count; i++) {
    const x = lane.startX + (lane.endX - lane.startX) * i / count;
    if (!clearAt(obstacles, x, lane.y, radius, engine.height)) return false;
  }
  return Math.abs(lane.y - item.y) >= t.minimumBypass;
}

/** One persistent hazard per ordinary map, with a quiet approach fallback.
 * Only the final practice flight introduces this hazard.
 * A synthetic fully blocked map fails safely rather than punching a new trap. */
export function createBlackHoles(engine) {
  if (engine.tutorial && engine.tutorial.lesson !== 'hazards') return [];
  const t = BLACK_HOLE_TUNING, height = t.referenceHeight, geometry = referenceGeometry(engine);
  const seed = hash(`${engine.seed}:${engine.levelIdentity?.id || ''}:black-hole`);
  const last = engine.totalDistance + engine.player.x - t.exitClearance;
  const target = t.minimumStart + Math.max(0, last - t.minimumStart) * (.28 + (seed % 1000) / 2500);
  const candidates = [];
  for (let x = t.minimumStart + seed % 43; x <= last; x += 68) if (quietAt(engine, x)) candidates.push(x);
  candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
  // The entrance already has open flight space, before normal drafts, chains
  // and hard windows. It remains subject to the same full geometry checks.
  const fallback = [410, 378, 442].filter(x => x < last && quietAt(engine, x));
  const yValues = [];
  for (let y = 58; y <= height - 58; y += 14) yValues.push(y);
  if (seed & 1) yValues.reverse();
  const find = (xs, minimumSeparation, placement) => {
    for (const x of xs) {
      const nearby = geometry.filter(o => x + t.corridorHalfWidth + 50 > o.x - o.width
        && x - t.corridorHalfWidth - 50 < o.x + o.width * 2.5);
      const laneYs = yValues.filter(y => blackHoleLaneClear({ height, layout: { obstacles: nearby } }, {
        y: y < height / 2 ? height : 0,
        bypass: { startX: x - t.corridorHalfWidth, endX: x + t.corridorHalfWidth, y } }));
      for (const y of yValues) {
        if (!clearAt(nearby, x, y, t.coreRadius + 12, height)) continue;
        const laneY = laneYs.find(ly => Math.abs(ly - y) >= minimumSeparation);
        if (laneY === undefined) continue;
        const factor = engine.height / height;
        return [{ id: 'black-hole:0', x, y: y * factor, coreRadius: t.coreRadius,
          influence: t.influence, seed, placement,
          bypass: { startX: x - t.corridorHalfWidth, endX: x + t.corridorHalfWidth, y: laneY * factor },
          rate: 0, potentialRate: 0, frameDrained: 0, drained: 0, lastDrainAt: -Infinity,
          drainSequence: 0, sourceX: null, sourceY: null }];
      }
    }
    return null;
  };
  return find(candidates, t.influence + t.laneRadius, 'room')
    || find(candidates, t.minimumBypass, 'room')
    || find(fallback, t.influence + t.laneRadius, 'approach')
    || find(fallback, t.minimumBypass, 'approach') || [];
}

export class BlackHoles {
  constructor(engine) {
    this.engine = engine; this.items = createBlackHoles(engine); this.cursor = 0;
    this.active = false; this.rate = 0; this.potentialRate = 0; this.drained = 0; this.nearest = null;
    this._activeItems = [];
  }
  get live() {
    const e = this.engine;
    return e.running && e.alive && !e.finished && !e.destroyed && !e.dying && !e.completing && !e.tutorialAwaitingLift;
  }
  get state() {
    return { active: this.live && this.active, rate: this.live ? this.rate : 0,
      potentialRate: this.live ? this.potentialRate : 0, drained: this.drained,
      nearest: this.nearest ? { ...this.nearest } : null };
  }
  stop() {
    for (const item of this._activeItems) item.rate = item.potentialRate = item.frameDrained = 0;
    this._activeItems.length = 0; this.active = false; this.rate = this.potentialRate = 0; this.nearest = null;
  }
  resize(factor) {
    for (const item of this.items) {
      item.y *= factor; item.bypass.y *= factor;
      if (item.sourceY !== null) item.sourceY *= factor;
    }
    this.stop();
  }
  update(dt) {
    const e = this.engine;
    if (e.paused || !(dt > 0) || !Number.isFinite(dt)) return;
    this.stop();
    if (!this.live) return;
    const worldX = e.distance + e.player.x;
    // Sorted X and a monotonic cursor avoid scanning the rest of a long map.
    while (this.cursor < this.items.length && this.items[this.cursor].x + this.items[this.cursor].influence < worldX) this.cursor++;
    for (let i = this.cursor; i < this.items.length; i++) {
      const item = this.items[i], dx = item.x - worldX;
      if (dx > item.influence) break;
      const distance = Math.hypot(dx, item.y - e.player.y);
      if (!this.nearest || distance < this.nearest.distance) this.nearest = { id: item.id, distance };
      item.potentialRate = blackHoleDrainRate(distance, item.influence);
      if (!(item.potentialRate > 0)) continue;
      this._activeItems.push(item); this.active = true; this.potentialRate += item.potentialRate;
      // Dream makes Lift free, not environmental drain. Both recording and
      // replay run this identical fixed-step debit. Shields confer no immunity.
      // Direct flight-fuel debit cannot touch currency or artifact income hooks.
      const amount = Math.min(Math.max(0, e.flame), item.potentialRate * dt);
      e.flame = Math.max(0, e.flame - amount);
      item.frameDrained = amount; item.rate = amount / dt; this.rate += item.rate;
      if (!(amount > 0)) continue;
      item.drained += amount; this.drained += amount; item.lastDrainAt = e.time;
      item.sourceX = worldX; item.sourceY = e.player.y; item.drainSequence++;
    }
  }
}
