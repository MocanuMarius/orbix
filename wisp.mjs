import { LIGHT_PACKET_TUNING } from './vitality.mjs?v=living-choices-2';
import { getCompanionAbility } from './companion-abilities.mjs?v=living-choices-2';
import { pickupKind, pickupContactRadius, canCompanionCollect } from './pickups.mjs?v=living-choices-2';

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export const WISP_TUNING = Object.freeze({ range: 105, cooldown: 5, lightRadius: 175,
  outboundSpeed: 520, returnSpeed: 620, orbitPeriod: 1.8 });

export function wispHome(player) {
  return { x: player.x, y: player.y };
}

export function wispOrbit(player, time = 0, index = 0, total = 1) {
  const t = Number.isFinite(time) ? time : 0;
  const angle = t * Math.PI * 2 / WISP_TUNING.orbitPeriod + Math.PI + index * Math.PI * 2 / Math.max(1,total);
  const breath = Math.sin(t * 2.1) * 3;
  return { x: player.x + Math.cos(angle) * (44 + breath),
    y: player.y + Math.sin(angle) * (34 + breath * .6) };
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
    this.orbitHome = {x:home.x,y:home.y};
    this.leg = null; this.lastDistance = null; this.scrollSpeed = 0;
    this.history = []; this.clock = 0;
    this.contacts = []; this.contactTimes = new Map();
  }

  range(engine) {
    if (!this.enabled(engine)) return 0;
    return WISP_TUNING.range * clamp(Number(engine.mod.attract) || 1, .5, 4) * (1 + engine.wispBoost * .6);
  }

  recoveryFraction() {
    return this.cooldownMax > 0 ? clamp(1 - this.cooldown / this.cooldownMax, 0, 1) : 1;
  }

  currentRange(engine) {
    const maximum = this.range(engine), minimum = Math.min(18+(Number(engine.mod.collectorMinimum)||0), maximum);
    return minimum + (maximum - minimum) * this.recoveryFraction();
  }

  enabled(engine) { return engine.hasCompanion ? engine.hasCompanion('collector')
    : getCompanionAbility(engine.companionRole || engine.options?.companionRole).collects === true; }

  state(engine, y = engine.player.y, time = engine.time) {
    const enabled = this.enabled(engine);
    const home = wispHome({ ...engine.player, y });
    const blend = time === engine.time ? 1 : clamp(engine.accumulator * 60, 0, 1);
    const recovery = this.recoveryFraction();
    return { x: this.previousX + (this.x - this.previousX) * blend,
      y: this.previousY + (this.y - this.previousY) * blend,
      homeX: home.x, homeY: home.y, enabled, collects: enabled,
      radius: enabled ? this.range(engine) : 0, recovery: enabled ? recovery : 0,
      currentRange: enabled ? this.currentRange(engine) : 0,
      recovering: enabled && this.cooldown > 0,
      canFetch: enabled && (this.phase === 'ready' || this.phase === 'cooldown'),
      phase: enabled ? this.phase : 'orbiting', cooldown: enabled ? this.cooldown : 0,
      cooldownMax: enabled ? this.cooldownMax : 0,
      carrying: enabled && Boolean(this.cargo), cargoValue: enabled ? this.cargo?.value || 1 : 0,
      cargoKind: enabled && this.cargo ? pickupKind(this.cargo) : null };
  }

  beginLeg(engine, x, y, returning = false) {
    const distance = Math.hypot(x - this.x, y - this.y);
    const speed = returning ? WISP_TUNING.returnSpeed : WISP_TUNING.outboundSpeed;
    const duration = clamp((returning ? .14 : .12) + distance / speed, .16, 1.2);
    // World coordinates keep a fixed pickup fixed while the landscape scrolls.
    // The tangent at interception bends around the pickup, into the return arc.
    const rx = x - engine.player.x, ry = y - engine.player.y, length = Math.max(1, Math.hypot(rx, ry));
    const turn = returning ? 0 : clamp(distance / duration * .65, 55, 190);
    this.leg = {x:this.x + engine.distance,y:this.y,age:0,duration,
      vx:this.vx + this.scrollSpeed,vy:this.vy,
      endVX:-ry / length * turn,endVY:rx / length * turn};
  }

  advanceLeg(engine, x, y, dt) {
    const leg = this.leg;
    leg.age = Math.min(leg.duration, leg.age + dt);
    const u = leg.age / leg.duration, u2 = u * u, u3 = u2 * u;
    const a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u;
    const c = -2 * u3 + 3 * u2, d = u3 - u2;
    // Cubic Hermite legs retain the incoming velocity. A zero relative end
    // tangent rejoins the moving orbit smoothly, even while the player flaps.
    this.x = a * leg.x + b * leg.duration * leg.vx + c * (x + engine.distance)
      + d * leg.duration * leg.endVX - engine.distance;
    this.y = a * leg.y + b * leg.duration * leg.vy + c * y + d * leg.duration * leg.endVY;
    this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
    return leg.age >= leg.duration;
  }

  returnToOrbit(engine, orbit) {
    this.phase = 'returning'; this.beginLeg(engine, orbit.x, orbit.y, true);
  }

  resizeY(factor) {
    this.y *= factor; this.previousY = this.y; this.vy *= factor;
    this.orbitHome.y *= factor;
    if (this.leg) { this.leg.y *= factor; this.leg.vy *= factor; this.leg.endVY *= factor; }
    this.history.length = 0;
  }

  releaseTarget() {
    if (this.target && !this.target.collected) this.target.attracted = false;
    this.target = null;
  }

  update(engine, dt) {
    if (!(dt > 0)) return;
    const firstUpdate = this.lastDistance === null;
    this.previousX = this.x; this.previousY = this.y; this.clock += dt;
    this.scrollSpeed = this.lastDistance === null ? Number(engine.baseSpeed) || 0 : (engine.distance - this.lastDistance) / dt;
    this.lastDistance = engine.distance;
    const home = wispHome(engine.player);
    const follow = 1 - Math.exp(-dt * 18);
    this.orbitHome.x += (home.x - this.orbitHome.x) * follow;
    this.orbitHome.y += (home.y - this.orbitHome.y) * follow;
    const fleet = engine.companions || [engine.companionRole];
    const orbit = wispOrbit(this.orbitHome, engine.reducedMotion ? 0 : engine.time,
      Math.max(0,fleet.indexOf('collector')),fleet.length);
    if (firstUpdate && ['ready','cooldown','orbiting'].includes(this.phase)) {
      const before = wispOrbit(this.orbitHome, engine.reducedMotion ? 0 : engine.time - dt,
        Math.max(0,fleet.indexOf('collector')),fleet.length);
      this.previousX = before.x; this.previousY = before.y;
    }
    if (!this.enabled(engine)) {
      this.contacts.length = 0; this.contactTimes.clear();
      this.releaseTarget();
      if (this.cargo) { this.cargo.carried = false; this.cargo.attracted = false; this.cargo = null; }
      this.phase = 'orbiting'; this.cooldown = 0; this.cooldownMax = 0; this.leg = null;
      this.x = orbit.x; this.y = orbit.y;
      this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
      this.history.length = 0;
      return;
    }
    if (this.phase === 'orbiting') { this.phase = 'ready'; this.cooldownMax = WISP_TUNING.cooldown; }
    // Recovery grows the search boundary; it is not a lock on another fetch.
    // It keeps progressing during a trip and restarts only after delivery.
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown === 0 && this.phase === 'cooldown') this.phase = 'ready';
    // The visible boundary touches the pickup's contact ring, not its centre.
    // Detection is shown even while body priority or another delivery delays a fetch.
    const reach = this.currentRange(engine), packets = engine.getNearbyPickups?.() || engine.layout.embers;
    this.contacts.length = 0;
    for (const packet of packets) {
      if (!canCompanionCollect(packet) || packet.collected || packet.carried) continue;
      if (Math.hypot(packet.x-engine.distance-home.x,packet.y-home.y)>reach+pickupContactRadius(packet)) continue;
      if (!this.contactTimes.has(packet)) this.contactTimes.set(packet,engine.time);
      this.contacts.push({packet,since:this.contactTimes.get(packet)});
      if (this.contacts.length===8) break;
    }
    for (const packet of this.contactTimes.keys()) if (!this.contacts.some(c=>c.packet===packet)) this.contactTimes.delete(packet);
    if (this.phase === 'ready' || this.phase === 'cooldown') {
      this.x = orbit.x; this.y = orbit.y;
      this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
      {
        let nearest = null, nearestDistance = reach;
        for (const ember of packets) {
          if (!canCompanionCollect(ember) || ember.collected || ember.carried || ember.attracted) continue;
          const x = ember.x - engine.distance;
          if (x < home.x - reach - pickupContactRadius(ember)) continue;
          // Leave the entire approach and body-contact window to the player.
          // Once a packet passes behind this edge, forward flight cannot touch
          // it directly; only then may the carrier rescue it within its range.
          if (x >= home.x - pickupContactRadius(ember)) continue;
          if (engine.collectorContains && !engine.collectorContains(ember)) continue;
          const distance = Math.hypot(x - home.x, ember.y - home.y)-pickupContactRadius(ember);
          if (distance <= nearestDistance) { nearest = ember; nearestDistance = distance; }
        }
        if (nearest) {
          this.target = nearest; nearest.attracted = true; this.phase = 'outbound';
          this.beginLeg(engine, nearest.x - engine.distance, nearest.y);
        }
      }
    } else if (this.phase === 'outbound') {
      const target = this.target;
      if (!target || !canCompanionCollect(target) || target.collected) {
        this.releaseTarget(); this.returnToOrbit(engine, orbit);
      } else {
        if (!this.leg) this.beginLeg(engine, target.x - engine.distance, target.y);
        if (this.advanceLeg(engine, target.x - engine.distance, target.y, dt)) {
          engine.shatterPickupRing?.(target);
          target.carried = true;
          target.boostedPickup = engine.isCompanionWorking?.() ?? ((engine.abilityTime ?? engine.boostTime) > 0);
          this.vx = this.leg.endVX - this.scrollSpeed; this.vy = this.leg.endVY;
          this.cargo = target; this.target = null; this.returnToOrbit(engine, orbit);
        }
      }
    } else if (this.phase === 'returning') {
      // A harmful item can never become delivery cargo, even if a live item
      // was replaced or reclassified after the companion chose its target.
      if (this.cargo && !canCompanionCollect(this.cargo)) {
        this.cargo.carried = false; this.cargo.attracted = false; this.cargo = null;
      }
      if (!this.leg) this.beginLeg(engine, orbit.x, orbit.y, true);
      if (this.advanceLeg(engine, orbit.x, orbit.y, dt)) {
        // Delivery-triggered cards can shorten this trip's recovery immediately.
        this.cooldownMax = WISP_TUNING.cooldown * clamp(Number(engine.mod.wispCooldown) || 1, .4, 1.5);
        // An empty rescue trip must not spend a full successful-pickup recovery.
        if (this.cargo) this.cooldown = this.cooldownMax;
        this.phase = this.cooldown > 0 ? 'cooldown' : 'ready';
        this.leg = null;
        engine._auraUntil = -1;
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
    this.history.length = 0;
  }
}
