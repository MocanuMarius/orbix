import {drawPickup} from './pickup-art.mjs?v=spark-field-guide-1';
import {pickupKind} from './pickups.mjs?v=spark-field-guide-1';
import {sparkArtScale, sparkBodyRadius, sparkMass} from './spark-size.mjs?v=spark-field-guide-1';
import {lightVisibility} from './light-field.mjs?v=spark-field-guide-1';

export function glowSenseCues(e, {
  distance = e.renderDistance ?? e.distance,
  playerY = e.renderPlayerY ?? e.player.y,
  light = e.getLightState?.() || {}
} = {}) {
  if (!e.mod?.glowSense || e.dying || e.completionProgress > 0) return [];
  const cues = [];
  for (const packet of e.getNearbyPickups()) {
    if (packet.collected || packet.carried) continue;
    const x = packet.x - distance, y = packet.y;
    const radius = sparkBodyRadius(packet, e.height);
    if (x + radius < 0 || x - radius >= e.width || y + radius < 0 || y - radius >= e.height) continue;
    const visibility = lightVisibility(e, light, x, y, playerY);
    if (visibility >= .30) continue;
    const hidden = 1 - visibility / .30;
    cues.push({ x, y, packet, strength: .33 * hidden * hidden * (3 - 2 * hidden) });
  }
  return cues;
}

export function drawGlowSense(ctx, engine, {scale = 1, ...options} = {}) {
  const time = engine.captureTime ?? engine.visualTime ?? engine.time;
  for (const {x, y, packet, strength} of glowSenseCues(engine, options)) {
    drawPickup(ctx, x * scale, y * scale, {
      kind: pickupKind(packet), phase: packet.phase || 0, time, reducedMotion: engine.reducedMotion,
      massTier: sparkMass(packet), scale: scale * sparkArtScale(packet, engine.height), alpha: strength
    });
  }
}
