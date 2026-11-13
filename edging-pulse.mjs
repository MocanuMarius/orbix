// Risk-earned sight, or bounded fuel recovery when the Regenerative Falling
// branch is chosen. Neither outcome is a pickup or invokes artifact hooks.
import { GLOW_DISPLAY_SCALE } from './vitality.mjs?v=clear-paths-2';
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const smooth = n => n * n * (3 - 2 * n);
const EPSILON = 1e-9;
export const EDGING_PULSE_TUNING = Object.freeze({ clearance: 48, chargeSeconds: 2,
  graceSeconds: 1.25, decayPerSecond: .08, duration: 5, recovery: 2, waves: 3 });
export const EDGING_REGEN_TUNING = Object.freeze({ glow: 1 / GLOW_DISPLAY_SCALE, grants: 8, feedback: 1 });
const number = (value, fallback, lo, hi) => Number.isFinite(Number(value))
  ? clamp(Number(value), lo, hi) : fallback;

// Local X never changes when the viewport rescales Y. Keep the actual polygon
// references: sway and resized Y are read live, with no transformed vertices.
const xBounds = new WeakMap();
function polygonClearance(x, y, radius, polygon, reach) {
  if (!polygon?.length) return Infinity;
  let bounds = xBounds.get(polygon);
  if (!bounds || bounds.length !== polygon.length) {
    let min = Infinity, max = -Infinity;
    for (const point of polygon) { min = Math.min(min, point[0]); max = Math.max(max, point[0]); }
    bounds = { min, max, length: polygon.length }; xBounds.set(polygon, bounds);
  }
  if (x + radius + reach < bounds.min || x - radius - reach > bounds.max) return Infinity;
  let inside = false, squaredDistance = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    squaredDistance = Math.min(squaredDistance, (x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2);
  }
  return (inside ? -1 : 1) * Math.sqrt(squaredDistance) - radius;
}

/** Signed body clearance from the same solid terrain/prop parts as collision. */
export function obstacleEdgeClearance(x, y, radius, obstacle, time = 0, reach = Infinity, center) {
  if (obstacle.destroyed) return Infinity;
  const originY = center ?? obstacle.center + Math.sin(time * .9 + (obstacle.phase || 0)) * (obstacle.motion || 0);
  const localX = x - obstacle.x, localY = y - originY;
  let clearance = Math.min(
    polygonClearance(localX, localY + obstacle.gap / 2, radius, obstacle.topShape, reach),
    polygonClearance(localX, localY - obstacle.gap / 2, radius, obstacle.bottomShape, reach));
  for (const prop of obstacle.sceneProps || []) for (const part of prop.parts) {
    clearance = Math.min(clearance, polygonClearance(localX, localY - prop.side * obstacle.gap / 2, radius, part.polygon, reach));
  }
  return clearance;
}

export class EdgingPulse {
  constructor(engine) {
    this.engine = engine;
    this.charge = 0; this.nearEdge = false; this.remaining = 0; this.recoveryRemaining = 0; this.graceRemaining = 0;
    this.duration = number(engine.mod?.edgingDuration, EDGING_PULSE_TUNING.duration, 1, 12);
    this.triggerCount = 0; this.regenGrants = 0; this.regenFeedbackRemaining = 0; this.regenGain = 0;
  }

  get regenerative() { return !!this.engine.mod?.edgingRegen; }
  get exhausted() { return this.regenerative && this.regenGrants >= EDGING_REGEN_TUNING.grants; }
  get dreaming() { return !!this.engine.dream && this.engine.dream.phase !== 'done'; }
  get live() {
    const e = this.engine;
    return e.running && e.alive && !e.finished && !e.destroyed && !e.dying && !e.completing && !e.tutorialAwaitingLift;
  }
  get protected() {
    const e = this.engine;
    // Runner's burst/exit guard resist wind, not terrain contact.
    return e.shield?.protection > 0
      || e.invulnerable === true || e.invulnerability > 0 || e.invulnerabilityTime > 0;
  }
  get strength() {
    if (this.regenerative || !this.live || this.dreaming || this.remaining <= 0) return 0;
    const elapsed = this.duration - this.remaining;
    const onset = smooth(clamp(elapsed / (this.engine.reducedMotion ? .45 : .4), 0, 1));
    const fade = smooth(clamp(this.remaining / this.duration, 0, 1));
    const wave = this.engine.reducedMotion ? 1
      : .65 + .35 * Math.cos(Math.max(0, elapsed - .4) / this.duration * Math.PI * 2 * EDGING_PULSE_TUNING.waves);
    return clamp(onset * fade * wave, 0, 1);
  }
  get state() {
    const visible = this.live && !this.dreaming;
    return { charge: visible ? this.charge : 0,
      nearEdge: visible && !this.engine.paused && !this.protected && this.nearEdge,
      holding: visible && !this.nearEdge && !this.protected && this.charge > 0 && this.graceRemaining > EPSILON,
      active: visible && this.remaining > 0, remaining: visible ? this.remaining : 0,
      duration: this.duration, strength: this.strength,
      recovering: visible && this.recoveryRemaining > 0, triggerCount: this.triggerCount,
      mode: this.regenerative ? 'regen' : 'pulse', exhausted: this.exhausted,
      regenGrants: this.regenGrants, grantsRemaining: Math.max(0, EDGING_REGEN_TUNING.grants - this.regenGrants),
      regenFeedback: visible && this.regenFeedbackRemaining > 0, regenGain: this.regenGain };
  }

  reset() { this.charge = 0; this.nearEdge = false; this.remaining = 0; this.recoveryRemaining = 0; this.graceRemaining = 0; this.regenFeedbackRemaining = 0; }
  impact() { this.charge = 0; this.nearEdge = false; this.graceRemaining = 0; }

  update(dt, obstacles) {
    const e = this.engine;
    if (e.paused || !(dt > 0) || !Number.isFinite(dt)) return;
    if (!this.live || this.dreaming) { this.reset(); return; }
    this.nearEdge = false;
    this.regenFeedbackRemaining = Math.max(0, this.regenFeedbackRemaining - dt);
    if (this.remaining > 0) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining < EPSILON) {
        this.remaining = 0;
        this.recoveryRemaining = number(e.mod?.edgingRecovery, EDGING_PULSE_TUNING.recovery, 0, 10);
      }
      return;
    }
    if (this.recoveryRemaining > 0) {
      this.recoveryRemaining = Math.max(0, this.recoveryRemaining - dt);
      if (this.recoveryRemaining < EPSILON) this.recoveryRemaining = 0;
      return;
    }
    if (this.exhausted) { this.charge = 0; this.graceRemaining = 0; return; }
    if (!this.protected) {
      // Boundary collisions use the orb's center at these exact thresholds;
      // this is the remaining safe margin, not the decorative screen border.
      let clearance = Math.min(e.player.y - 27, e.height - 28 - e.player.y);
      const worldX = e.distance + e.player.x, radius = e.player.radius;
      for (const obstacle of obstacles) {
        // Broadphase is identical to the flight collider's terrain footprint.
        if (obstacle.destroyed || worldX + radius + EDGING_PULSE_TUNING.clearance < obstacle.x - obstacle.width
          || worldX - radius - EDGING_PULSE_TUNING.clearance > obstacle.x + obstacle.width * 2.5) continue;
        clearance = Math.min(clearance, obstacleEdgeClearance(worldX, e.player.y, radius, obstacle,
          e.time, EDGING_PULSE_TUNING.clearance, e.obstacleCenter(obstacle)));
      }
      if (clearance <= EPSILON) { this.impact(); return; }
      this.nearEdge = clearance <= EDGING_PULSE_TUNING.clearance;
    }
    const rate = number(e.mod?.edgingChargeRate, 1, .25, 4);
    const decay = number(e.mod?.edgingDecayRate, 1, 0, 4);
    if (this.nearEdge) {
      this.graceRemaining = EDGING_PULSE_TUNING.graceSeconds;
      this.charge = clamp(this.charge + dt * rate / EDGING_PULSE_TUNING.chargeSeconds, 0, 1);
    } else {
      // Ordinary flap arcs and short gaps preserve earned progress, but never
      // add charge. Only the portion of this step after grace expires decays.
      if (this.protected) this.graceRemaining = 0;
      const decayTime = Math.max(0, dt - this.graceRemaining);
      this.graceRemaining = Math.max(0, this.graceRemaining - dt);
      this.charge = clamp(this.charge - decayTime * EDGING_PULSE_TUNING.decayPerSecond * decay, 0, 1);
    }
    if (!this.protected && this.charge >= 1 - EPSILON) {
      this.charge = 0; this.nearEdge = false; this.graceRemaining = 0; this.triggerCount++;
      if (this.regenerative) {
        // This is recovery, not a collectible. Only the missing fuel is added;
        // it cannot overflow, create Packed Light, or proc pickup artifacts.
        const missing = Math.max(0, (Number(e.maxFlame) || 0) - (Number(e.flame) || 0));
        this.regenGain = Math.min(EDGING_REGEN_TUNING.glow, missing);
        if (this.regenGain > EPSILON) {
          e.flame += this.regenGain;
          e.flameRestored = (Number(e.flameRestored) || 0) + this.regenGain;
          this.regenGrants++;
        }
        this.regenFeedbackRemaining = EDGING_REGEN_TUNING.feedback;
        this.recoveryRemaining = EDGING_PULSE_TUNING.recovery;
        const result = this.regenGain >= EDGING_REGEN_TUNING.glow - EPSILON ? '+1 Sparks'
          : this.regenGain > EPSILON ? 'Sparks topped up' : 'Sparks already full';
        e.setEvent?.(`Regenerative Falling · ${result}${this.exhausted ? ' · spent for this flight' : ''}`);
        return;
      }
      this.duration = number(e.mod?.edgingDuration, EDGING_PULSE_TUNING.duration, 1, 12);
      this.remaining = this.duration;
      e.setEvent?.('Edging Pulse · the way is revealed');
    }
  }
}
