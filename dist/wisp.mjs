const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export const WISP_TUNING = Object.freeze({ range: 100, cooldown: 1.8, outboundSpeed: 500, returnSpeed: 620 });

export function wispHome(player, time) {
  return { x: player.x - 29 + Math.sin(time * 3) * 3,
    y: player.y + 19 + Math.cos(time * 2.4) * 5 };
}

// A single fetch owns one ember until delivery. No reward or card trigger is
// issued at interception, and the recovery timer begins only after returning.
export class WispCompanion {
  constructor(home) {
    this.x = this.previousX = home.x; this.y = this.previousY = home.y;
    this.phase = 'ready'; this.target = null; this.cargo = null;
    this.cooldown = 0; this.cooldownMax = WISP_TUNING.cooldown;
    this.vx = 0; this.vy = 0;
    this.history = []; this.clock = 0;
  }

  range(engine) {
    return WISP_TUNING.range * clamp(Number(engine.mod.attract) || 1, .5, 4) * (1 + engine.wispBoost * .6);
  }

  state(engine, y = engine.player.y, time = engine.time) {
    const home = wispHome({ ...engine.player, y }, time);
    const blend = time === engine.time ? 1 : clamp(engine.accumulator * 60, 0, 1);
    const recovery = this.phase === 'ready' ? 1 : this.phase === 'cooldown' ? 1 - this.cooldown / this.cooldownMax : 0;
    return { x: this.previousX + (this.x - this.previousX) * blend,
      y: this.previousY + (this.y - this.previousY) * blend,
      homeX: home.x, homeY: home.y, radius: this.range(engine), recovery,
      phase: this.phase, cooldown: this.cooldown, cooldownMax: this.cooldownMax,
      carrying: Boolean(this.cargo), cargoValue: this.cargo?.value || 1 };
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
    const home = wispHome(engine.player, engine.time);
    if (this.phase === 'ready' || this.phase === 'cooldown') {
      const follow = 1 - Math.exp(-dt * 16);
      this.x += (home.x - this.x) * follow; this.y += (home.y - this.y) * follow;
      this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
      if (this.phase === 'cooldown') {
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.cooldown === 0) this.phase = 'ready';
      }
      if (this.phase === 'ready') {
        let nearest = null, nearestDistance = this.range(engine);
        for (const ember of engine.layout.embers) {
          if (ember.collected || ember.carried || ember.attracted) continue;
          const x = ember.x - engine.distance;
          if (x < -20 || x > engine.width + 20) continue;
          const distance = Math.hypot(x - home.x, ember.y - home.y);
          if (distance < nearestDistance) { nearest = ember; nearestDistance = distance; }
        }
        if (nearest) {
          this.target = nearest; nearest.attracted = true; this.phase = 'outbound';
        }
      }
    } else if (this.phase === 'outbound') {
      const target = this.target;
      if (!target || target.collected || target.x - engine.distance < -100) {
        this.releaseTarget(); this.phase = 'returning';
      } else if (this.moveTo(target.x - engine.distance, target.y, WISP_TUNING.outboundSpeed, dt)) {
        target.carried = true; target.boostedPickup = engine.boostTime > 0;
        this.cargo = target; this.target = null; this.phase = 'returning';
      }
    } else if (this.phase === 'returning') {
      if (this.moveTo(home.x, home.y, WISP_TUNING.returnSpeed, dt)) {
        if (this.cargo) {
          const delivered = this.cargo; this.cargo = null; delivered.carried = false;
          delivered.deliveredByWisp = true;
          engine.collect(delivered);
        }
        this.cooldownMax = WISP_TUNING.cooldown * clamp(Number(engine.mod.wispCooldown) || 1, .4, 1.5);
        this.cooldown = this.cooldownMax; this.phase = 'cooldown';
      }
    }
    if (this.cargo) {
      this.cargo.x = engine.distance + this.x; this.cargo.y = this.y;
    }
    this.history.push({ x: engine.distance + this.x, y: this.y, time: engine.time });
    while (this.history.length > 32 || (this.history[0] && engine.time - this.history[0].time > .45)) this.history.shift();
  }
}
