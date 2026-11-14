export { installShutters } from './lantern-layout.mjs?v=chapter-pressure-1';
import { LIGHT_PACKET_TUNING } from './vitality.mjs?v=chapter-pressure-1';

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);
const geometryCache = new WeakMap();
const shadowLayers = new WeakMap();

export function resizeShutters(boss, factor) {
  for (const shutter of boss.shutters || []) {
    shutter.y *= factor;
    shutter.depth *= factor;
    shutter.pocket *= factor;
  }
}

export function shutterPhase(shutter, playerX) {
  if (playerX < shutter.warningX) return 0;
  if (playerX < shutter.openX) return 1;
  return 2;
}

function coneGeometry(shutter) {
  const { depth, spread, shift } = shutter;
  let geometry = geometryCache.get(shutter);
  if (!geometry || geometry.depth !== depth || geometry.spread !== spread || geometry.shift !== shift) {
    const left = (shift - spread) / depth, right = (shift + spread) / depth;
    const leftAngle = Math.atan(left), rightAngle = Math.atan(right);
    geometry = { depth, spread, shift, left, right, leftAngle, angleWidth: rightAngle - leftAngle };
    geometryCache.set(shutter, geometry);
  }
  return geometry;
}

export function insideShutter(shutter, x, y) {
  const distance = (shutter.y - y) * shutter.side;
  if (distance <= 0) return false;
  const dx = x - shutter.x, geometry = coneGeometry(shutter);
  return dx >= distance * geometry.left && dx <= distance * geometry.right;
}

// The shutter keeps projecting past the opposite wall. Only the viewport
// crops it. The middle half of its angular field blocks all ambient light.
function shadowDensity(geometry, dx, distance) {
  if (distance <= 0 || dx <= geometry.left * distance || dx >= geometry.right * distance) return 0;
  const angle = (Math.atan(dx / distance) - geometry.leftAngle) / geometry.angleWidth;
  return smooth(Math.min(1, 4 * Math.min(angle, 1 - angle)));
}

function lightReach(light) {
  const baseline = LIGHT_PACKET_TUNING.baseRadius;
  const luminance = light.baseRadius ?? baseline;
  const flash = light.sightBonus || 0;
  const available = clamp01((light.radius ?? luminance) / (light.revealedRadius || (luminance + flash)));
  // World units. A full Flash also reaches past five visible wisp radii on
  // the landscape renderer, including while crossing two active beams.
  return Math.max(16, 48 + 1.52 * (luminance - baseline) + .97 * flash) * available;
}

// Both canvas gradients and visibility queries interpolate the same profile.
const transmission = [1, .97, .85, .60, .32, .10, 0];
function pocketTransmission(distance, reach) {
  if (distance >= reach) return 0;
  const band = distance / reach * (transmission.length - 1);
  const index = Math.floor(band);
  return transmission[index] + (transmission[index + 1] - transmission[index]) * (band - index);
}

export function shutterLightFactor(boss, x, y, playerX, playerY, light = {}) {
  let ambient = 1;
  for (const shutter of boss?.shutters || []) {
    if (playerX < shutter.openX) continue;
    ambient *= 1 - shadowDensity(coneGeometry(shutter), x - shutter.x, (shutter.y - y) * shutter.side);
    if (ambient === 0) break;
  }
  if (ambient === 1) return 1;
  const local = pocketTransmission(Math.hypot(x - playerX, y - playerY), lightReach(light));
  return ambient + (1 - ambient) * local;
}

// A fixed lantern has one reusable alpha texture. The camera only translates
// and scales it. Two shadows share a single local opening around the wisp.
function shadowStamp(doc, geometry) {
  if (geometry.stamp) return geometry.stamp;
  const canvas = doc.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(canvas.width, canvas.height);
  const left = Math.min(0, geometry.left), width = Math.max(0, geometry.right) - left;
  for (let y = 0; y < canvas.height; y++) {
    const distance = (y + .5) / canvas.height;
    for (let x = 0; x < canvas.width; x++) {
      const dx = left + (x + .5) * width / canvas.width;
      pixels.data[(y * canvas.width + x) * 4 + 3] = Math.round(255 * shadowDensity(geometry, dx, distance));
    }
  }
  context.putImageData(pixels, 0, 0);
  geometry.stamp = canvas;
  return canvas;
}

function getShadowLayer(context, engine) {
  let layer = shadowLayers.get(context);
  if (!layer) {
    const doc = engine.canvas.ownerDocument || globalThis.document;
    if (!doc) return null;
    const canvas = doc.createElement('canvas');
    layer = { doc, canvas, ctx: canvas.getContext('2d') };
    shadowLayers.set(context, layer);
  }
  // The shadows vary smoothly even on the full-resolution fallback renderer.
  const width = Math.ceil(engine.width * .5), height = Math.ceil(engine.height * .5);
  if (layer.canvas.width !== width || layer.canvas.height !== height) {
    layer.canvas.width = width;
    layer.canvas.height = height;
  }
  const ctx = layer.ctx;
  ctx.setTransform(width / engine.width, 0, 0, height / engine.height, 0, 0);
  ctx.clearRect(0, 0, engine.width, engine.height);
  return layer;
}

function drawShadow(layer, shutter, geometry, distance, depth) {
  const ctx = layer.ctx;
  const left = Math.min(0, geometry.left) * depth, right = Math.max(0, geometry.right) * depth;
  ctx.save();
  ctx.translate(shutter.x - distance, shutter.y);
  ctx.scale(1, -shutter.side);
  ctx.drawImage(shadowStamp(layer.doc, geometry), left, 0, right - left, depth);
  ctx.restore();
}

function drawProjector(c, shutter, phase, aim, scale, quiet) {
  c.save();
  c.translate(shutter.x, shutter.y);
  c.scale(scale, -shutter.side * scale);
  c.fillStyle = '#393342'; c.fillRect(-16, -8, 32, 8);
  c.fillStyle = '#756b78'; c.fillRect(-13, -6, 26, 3);
  const geometry = coneGeometry(shutter);
  const aimAngle = geometry.leftAngle + geometry.angleWidth * .5;
  c.rotate(-aimAngle + (phase === 1 && !quiet ? (1 - aim) * .24 : 0));
  const aperture = phase === 1 ? 2 + aim * 3 : 5;
  c.fillStyle = '#322e39';
  c.beginPath(); c.moveTo(-12, -4); c.lineTo(-10, 7); c.lineTo(-4, 12);
  c.lineTo(6, 12); c.lineTo(11, 6); c.lineTo(12, -4); c.closePath(); c.fill();
  c.fillStyle = '#b7a387'; c.fillRect(-10, 4, 3, 5); c.fillRect(6, 5, 3, 4);
  c.fillStyle = '#f0dcb5'; c.fillRect(-aperture, 9, 2 * aperture, 2);
  if (phase === 1 && !quiet) {
    c.globalAlpha = .45 + .45 * aim; c.fillRect(-2, 13, 4, 2 + aim * 4);
  }
  c.restore();
}

export function drawShutters(c, engine, {
  distance = engine.renderDistance ?? engine.distance, playerY = engine.renderPlayerY ?? engine.player.y,
  scale = 1, light
} = {}) {
  const boss = engine.layout?.boss;
  if (!boss?.shutters?.length) return;
  const playerX = distance + engine.player.x;
  let layer;
  c.save();
  c.scale(scale, scale);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  for (const shutter of boss.shutters) {
    if (playerX < shutter.openX || engine.dream?.mode === 'record') continue;
    const geometry = coneGeometry(shutter);
    const depth = shutter.side < 0 ? engine.height - shutter.y : shutter.y;
    const x = shutter.x - distance;
    if (depth <= 0 || x + Math.max(0, geometry.right) * depth < 0 || x + Math.min(0, geometry.left) * depth > engine.width) continue;
    layer ??= getShadowLayer(c, engine);
    if (layer) drawShadow(layer, shutter, geometry, distance, depth);
  }
  if (layer) {
    const ctx = layer.ctx, reach = lightReach(light || engine.getLightState?.() || {});
    const px = engine.player.x;
    const aperture = ctx.createRadialGradient(px, playerY, 0, px, playerY, reach);
    for (let i = 0; i < transmission.length; i++) {
      aperture.addColorStop(i / (transmission.length - 1), 'rgba(0,0,0,' + transmission[i] + ')');
    }
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = aperture; ctx.fillRect(px - reach, playerY - reach, 2 * reach, 2 * reach); ctx.restore();
    c.imageSmoothingEnabled = true;
    c.drawImage(layer.canvas, 0, 0, engine.width, engine.height);
  }
  c.translate(-distance, 0);
  for (const shutter of boss.shutters) {
    const phase = shutterPhase(shutter, playerX);
    if (!phase) continue;
    const aim = clamp01((playerX - shutter.warningX) / (shutter.openX - shutter.warningX));
    if (phase === 1) {
      c.save();
      c.strokeStyle = '#dac3a3'; c.globalAlpha = .3 + .48 * aim;
      c.lineWidth = Math.max(1, boss.scale * 1.5);
      for (const side of [-1, 1]) {
        const dx = shutter.shift + side * shutter.spread, dy = -shutter.side * shutter.depth;
        c.beginPath();
        for (let k = 0; k < Math.ceil(2 + aim * 6); k++) {
          const u = .09 + k * .116, v = u + .041;
          c.moveTo(shutter.x + dx * u, shutter.y + dy * u); c.lineTo(shutter.x + dx * v, shutter.y + dy * v);
        }
        c.stroke();
      }
      c.restore();
    }
    if (shutter.x >= distance - 24 && shutter.x <= distance + engine.width + 24) {
      drawProjector(c, shutter, phase, aim, boss.scale, engine.reducedMotion);
    }
  }
  c.restore();
}
