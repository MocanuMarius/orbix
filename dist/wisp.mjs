import { LIGHT_PACKET_TUNING } from './vitality.mjs';
import { getCompanionAbility } from './companion-abilities.mjs';

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export const WISP_TUNING = Object.freeze({ range: 100, cooldown: 5.5, lightRadius: 175, outboundSpeed: 500, returnSpeed: 620 });

export function wispHome(player) {
  return { x: player.x, y: player.y };
}

export function wispOrbit(player, time = 0) {
  const angle = (Number.isFinite(time) ? time : 0) * Math.PI * 2 / 2.5 + Math.PI;
  return { x: player.x + Math.cos(angle) * 44,
    y: player.y + Math.sin(angle) * 34 };
}

// A single fetch owns one ember until delivery. No reward or card trigger is
// issued at interception, and the recovery timer begins only after returning.
export class WispCompanion {
  constructor(home) {
    const orbit = wispOrbit(home, 0);
    this.x = this.previousX = orbit.x; this.y = this.previousY = orbit.y;
    this.phase = 'ready'; this.target = null; this.cargo = null;
    this.cooldown = 0; this.cooldownMax = WISP_TUNING.cooldown;
    this.vx = 0; this.vy = 0;
    this.history = []; this.clock = 0;
  }

  range(engine) {
    if (!this.enabled(engine)) return 0;
    return WISP_TUNING.range * clamp(Number(engine.mod.attract) || 1, .5, 4) * (1 + engine.wispBoost * .6);
  }

  enabled(engine) { return getCompanionAbility(engine.companionRole || engine.options?.companionRole).collects === true; }

  state(engine, y = engine.player.y, time = engine.time) {
    const enabled = this.enabled(engine);
    const home = wispHome({ ...engine.player, y });
    const blend = time === engine.time ? 1 : clamp(engine.accumulator * 60, 0, 1);
    const recovery = this.phase === 'ready' ? 1 : this.phase === 'cooldown' ? 1 - this.cooldown / this.cooldownMax : 0;
    return { x: this.previousX + (this.x - this.previousX) * blend,
      y: this.previousY + (this.y - this.previousY) * blend,
      homeX: home.x, homeY: home.y, enabled, collects: enabled,
      radius: enabled ? this.range(engine) : 0, recovery: enabled ? recovery : 0,
      phase: enabled ? this.phase : 'orbiting', cooldown: enabled ? this.cooldown : 0,
      cooldownMax: enabled ? this.cooldownMax : 0,
      carrying: enabled && Boolean(this.cargo), cargoValue: enabled ? this.cargo?.value || 1 : 0 };
  }

  moveTo(x, y, speed, dt) {
    const dx = x - this.x, dy = y - this.y, distance = Math.hypot(dx, dy);
    if (distance <= speed * dt + 4) { this.x = x; this.y = y; return true; }
    const steer = 1 - Math.exp(-dt * 18);
    this.vx += (dx / distance * speed - this.vx) * steer;
    this.vy += (dy / distance * speed - this.vy) * steer;
    // A small lateral curl gives the spirit a fluid flight path; zero at arrival.
    const curl = Math.sin(this.clock * 7) * Math.min(18, distance * .12) * dt;
    this.x += this.vx * dt - dy / distance * curl;
    this.y += this.vy * dt + dx / distance * curl;
    return false;
  }

  releaseTarget() {
    if (this.target && !this.target.collected) this.target.attracted = false;
    this.target = null;
  }

  update(engine, dt) {
    this.previousX = this.x; this.previousY = this.y; this.clock += dt;
    const home = wispHome(engine.player);
    const orbit = wispOrbit(engine.player, engine.reducedMotion ? 0 : engine.time);
    if (!this.enabled(engine)) {
      this.releaseTarget();
      if (this.cargo) { this.cargo.carried = false; this.cargo.attracted = false; this.cargo = null; }
      this.phase = 'orbiting'; this.cooldown = 0; this.cooldownMax = 0;
      const follow = 1 - Math.exp(-dt * 16);
      this.x += (orbit.x - this.x) * follow; this.y += (orbit.y - this.y) * follow;
      this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
      this.history.length = 0;
      return;
    }
    if (this.phase === 'orbiting') { this.phase = 'ready'; this.cooldownMax = WISP_TUNING.cooldown; }
    if (this.phase === 'ready' || this.phase === 'cooldown') {
      const follow = 1 - Math.exp(-dt * 16);
      this.x += (orbit.x - this.x) * follow; this.y += (orbit.y - this.y) * follow;
      this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
      if (this.phase === 'cooldown') {
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.cooldown === 0) this.phase = 'ready';
      }
      if (this.phase === 'ready') {
        const reach = this.range(engine);
        let nearest = null, nearestDistance = reach;
        for (const ember of engine.layout.embers) {
          if (ember.harmful || ember.kind === 'dark' || ember.collected || ember.carried || ember.attracted) continue;
          const x = ember.x - engine.distance;
          if (x < home.x - reach) continue;
          // Leave the entire approach and body-contact window to the player.
          // Once a packet passes behind this edge, forward flight cannot touch
          // it directly; only then may the carrier rescue it within its range.
          if (x >= home.x - LIGHT_PACKET_TUNING.pickupRadius) continue;
          const distance = Math.hypot(x - home.x, ember.y - home.y);
          if (distance < nearestDistance) { nearest = ember; nearestDistance = distance; }
        }
        if (nearest) {
          this.target = nearest; nearest.attracted = true; this.phase = 'outbound';
        }
      }
    } else if (this.phase === 'outbound') {
      const target = this.target;
      if (!target || target.harmful || target.kind === 'dark' || target.collected || target.x - engine.distance < -100) {
        this.releaseTarget(); this.phase = 'returning';
      } else if (this.moveTo(target.x - engine.distance, target.y, WISP_TUNING.outboundSpeed, dt)) {
        target.carried = true;
        target.boostedPickup = engine.isCompanionWorking?.() ?? ((engine.abilityTime ?? engine.boostTime) > 0);
        this.cargo = target; this.target = null; this.phase = 'returning';
      }
    } else if (this.phase === 'returning') {
      // A harmful item can never become delivery cargo, even if a live item
      // was replaced or reclassified after the companion chose its target.
      if (this.cargo?.harmful || this.cargo?.kind === 'dark') {
        this.cargo.carried = false; this.cargo.attracted = false; this.cargo = null;
      }
      if (this.moveTo(orbit.x, orbit.y, WISP_TUNING.returnSpeed, dt)) {
        // Delivery-triggered cards can shorten this trip's recovery immediately.
        this.cooldownMax = WISP_TUNING.cooldown * clamp(Number(engine.mod.wispCooldown) || 1, .4, 1.5);
        this.cooldown = this.cooldownMax; this.phase = 'cooldown';
        if (this.cargo) {
          const delivered = this.cargo; this.cargo = null; delivered.carried = false;
          delivered.deliveredByWisp = true;
          engine.collect(delivered);
        }
      }
    }
    if (this.cargo) {
      this.cargo.x = engine.distance + this.x; this.cargo.y = this.y;
    }
    this.history.push({ x: engine.distance + this.x, y: this.y, time: engine.time });
    while (this.history.length > 32 || (this.history[0] && engine.time - this.history[0].time > .45)) this.history.shift();
  }
}
