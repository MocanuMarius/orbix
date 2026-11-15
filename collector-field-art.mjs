import {pickupKind} from './pickups.mjs?v=bold-edge-ideas-1';
import {sparkBodyRadius} from './spark-size.mjs?v=bold-edge-ideas-1';
import {drawCollectorGuard} from './collector-guard-art.mjs?v=bold-edge-ideas-1';
import {companionPalette} from './companion-art.mjs?v=bold-edge-ideas-1';

const TAU = 2 * Math.PI;
const green = companionPalette('collector');

export function drawCollectorField(ctx, engine, {
  scale = 1,
  distance = engine.renderDistance ?? engine.distance,
  playerY = engine.renderPlayerY ?? engine.player.y,
  time = engine.visualTime ?? engine.time
} = {}) {
  const aura = engine.getCollectorAuraState?.();
  if (!aura?.active) return;

  const x = engine.player.x * scale;
  const y = playerY * scale;
  const radius = aura.radius * scale;
  drawCollectorGuard(ctx, aura, x, y, scale, engine.reducedMotion);
  if (radius < 1) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = green.mid;
  ctx.beginPath();
  // Near the body, avoid drawing a second edge around the wisp. Use actual
  // reach so Close Orbit's larger recovering field still reads immediately.
  const bodyRim = (engine.player.radius ?? 9.35) * 1.85;
  const clearance = Math.min(1, Math.max(0, (aura.radius - bodyRim) / 26));
  const visible = clearance * clearance * (3 - 2 * clearance);
  const strength = (.08 + .055 * aura.growth) * (.04 + .96 * visible)
    * (1 - (engine.completionProgress || 0));
  for (let i = 0; i <= 72; i++) {
    const angle = i / 72 * TAU;
    const ripple = engine.reducedMotion ? 0
      : Math.sin(angle * 7 + time * 3.8) * .65 + Math.sin(angle * 13 - time * 5.1) * .35;
    const rim = radius + ripple * Math.min(1.5, radius * .035);
    const px = x + Math.cos(angle) * rim;
    const py = y + Math.sin(angle) * rim;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.globalAlpha = strength * .18;
  ctx.lineWidth = 2.25;
  ctx.stroke();
  ctx.globalAlpha = strength;
  ctx.lineWidth = .95;
  ctx.stroke();

  ctx.strokeStyle = green.core;
  for (const contact of engine.wisp?.contacts || []) {
    const packet = contact.packet;
    if (packet.collected || packet.carried) continue;
    const px = (packet.x - distance) * scale;
    const py = packet.y * scale;
    const shell = sparkBodyRadius(packet, engine.height) * scale;
    const flash = pickupKind(packet) === 'sight';
    const age = Math.max(0, time - contact.since);
    const wave = engine.reducedMotion ? 1 : Math.min(1, age / .42);

    ctx.globalAlpha = (packet === engine.wisp.target ? .50 : .20) + (1 - wave) * .40;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (flash) {
      ctx.moveTo(px, py - shell);
      ctx.lineTo(px + shell, py + shell * .7);
      ctx.lineTo(px - shell, py + shell * .7);
      ctx.closePath();
    } else {
      ctx.arc(px, py, shell, 0, TAU);
    }
    ctx.stroke();
    if (wave < 1 && !flash) {
      const angle = Math.atan2(y - py, x - px);
      ctx.globalAlpha = (1 - wave) * .52;
      ctx.beginPath();
      ctx.arc(px, py, shell + wave * 5 * scale, angle - .75, angle + .75);
      ctx.stroke();
    }
  }
  ctx.restore();
}
