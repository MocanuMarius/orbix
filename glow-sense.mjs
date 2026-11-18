import {drawPickup} from './pickup-art.mjs?v=rates-1';
import {pickupKind} from './pickups.mjs?v=rates-1';
import {sparkArtScale, sparkBodyRadius, sparkMass} from './spark-size.mjs?v=rates-1';
import {lightVisibility} from './light-field.mjs?v=rates-1';

export function glowSenseCues(e, {
  distance = e.renderDistance ?? e.distance,
  playerY = e.renderPlayerY ?? e.player.y,
  light = e.getLightState?.() || {}
} = {}) {
  if (!e.mod?.glowSense || e.dying || e.completionProgress > 0) return [];
  const cues = [];
  const reach = Math.min((light.radius || 145) * 1.85, e.width * .42);
  const rightLimit = e.width * .80;
  const fade = value => {
    const t = Math.max(0, Math.min(1, value));
    return t*t*(3-2*t);
  };
  for (const packet of e.getNearbyPickups()) {
    if (packet.collected || packet.carried) continue;
    const x = packet.x - distance, y = packet.y;
    const radius = sparkBodyRadius(packet, e.height);
    if (x + radius < 0 || x - radius >= e.width || y + radius < 0 || y - radius >= e.height) continue;
    const separation = Math.hypot(x-e.player.x, y-playerY);
    // Include the shell and its halo so even a Giant cannot leak into the unseen edge.
    const outerEdge = x + radius + Math.max(8, radius * .18);
    if (separation >= reach || outerEdge >= rightLimit) continue;
    const rangeFade = fade((reach-separation)/(reach*.35));
    const edgeFade = fade((rightLimit-outerEdge)/(e.width*.12));
    const visibility = lightVisibility(e, light, x, y, playerY);
    if (visibility >= .30) continue;
    const hidden = 1 - visibility / .30;
    cues.push({ x, y, packet, strength: .33 * rangeFade * edgeFade * hidden * hidden * (3 - 2 * hidden) });
  }
  return cues;
}

export function drawGlowSense(ctx, engine, {scale = 1, ...options} = {}) {
  const time = engine.captureTime ?? engine.visualTime ?? engine.time;
  for (const {x, y, packet, strength} of glowSenseCues(engine, options)) {
    drawPickup(ctx, x * scale, y * scale, {
      kind: pickupKind(packet), phase: packet.phase || 0, time, reducedMotion: engine.reducedMotion,
      massTier: sparkMass(packet), scale: scale * sparkArtScale(packet, engine.height), alpha: strength,
      handling:{packet,modifiers:engine.mod,collector:engine.hasCompanion?.('collector')===true}
    });
  }
}
