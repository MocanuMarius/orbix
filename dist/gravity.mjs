// Gentle packet motion only. This field never collects or reserves an item.
import { canCompanionCollect } from './pickups.mjs';
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const GRAVITY_TUNING = Object.freeze({ range: 120, maxRange: 220,
  G: 27000, softening: 24, maxAcceleration: 36, maxSpeed: 24, drag: 3.5 });

export function gravityRadius(attract = 1) {
  return Math.min(GRAVITY_TUNING.maxRange, GRAVITY_TUNING.range * clamp(Number(attract) || 1, .5, 4));
}

export function updateGravityPackets(packets, { dt, time, active, worldX, y,
  radius, strength = 0, pullMultiplier = 1, positionClear = () => true } = {}) {
  const step = clamp(Number(dt) || 0, 0, .1);
  const multiplier = clamp(Number(pullMultiplier) || 1, 1, 2);
  let dirty = false;
  for (const packet of packets) {
    const dx = worldX - packet.x, dy = y - packet.y;
    const r2 = dx * dx + dy * dy;
    if (!active || strength <= 0 || step <= 0 || !canCompanionCollect(packet)
      || packet.collected || packet.carried || packet.attracted || r2 >= radius * radius || r2 < .0001) {
      // Leaving the field stops motion; there is no lingering auto-collection.
      packet.gravityVx = 0; packet.gravityVy = 0;
      continue;
    }
    const r = Math.sqrt(r2);
    const acceleration = Math.min(GRAVITY_TUNING.maxAcceleration * multiplier,
      GRAVITY_TUNING.G * multiplier / Math.max(r2, GRAVITY_TUNING.softening ** 2)) * clamp(strength, 0, 1);
    const drag = Math.exp(-GRAVITY_TUNING.drag * step);
    let vx = ((Number(packet.gravityVx) || 0) + dx / r * acceleration * step) * drag;
    let vy = ((Number(packet.gravityVy) || 0) + dy / r * acceleration * step) * drag;
    const speed = Math.hypot(vx, vy);
    if (speed > GRAVITY_TUNING.maxSpeed) {
      vx *= GRAVITY_TUNING.maxSpeed / speed; vy *= GRAVITY_TUNING.maxSpeed / speed;
    }
    const moveX = vx * step, moveY = vy * step;
    const checks = Math.max(1, Math.ceil(Math.hypot(moveX, moveY) / 2));
    let clear = true;
    for (let i = 0; i <= checks; i++) {
      if (!positionClear(packet.x + moveX * i / checks, packet.y + moveY * i / checks)) { clear = false; break; }
    }
    if (!clear) { packet.gravityVx = 0; packet.gravityVy = 0; continue; }
    packet.gravityVx = vx; packet.gravityVy = vy;
    packet.x += moveX; packet.y += moveY;
    if (Math.abs(moveX) + Math.abs(moveY) > .00001) {
      packet.gravityPulledAt = time;
      packet.gravityPullStrength = clamp(acceleration / GRAVITY_TUNING.maxAcceleration, 0, 1);
      dirty = true;
    }
  }
  return dirty;
}
