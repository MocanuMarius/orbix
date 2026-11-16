export { installShutters } from './lantern-layout.mjs?v=deck-flow-1';
import { lanternField } from './lantern-layout.mjs?v=deck-flow-1';
import { LIGHT_PACKET_TUNING } from './vitality.mjs?v=deck-flow-1';
import { lightAttenuation } from './light-attenuation.mjs?v=deck-flow-1';

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);
// World units, measured from each lantern's lens. This does not change with
// camera position, distance to the opposite wall, or preview zoom.
const projectedRadius = 470;
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

function openingStrength(shutter, playerX, speed) {
  return smooth(clamp01((playerX - shutter.openX) / (.4 * (speed || 154))));
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

// The middle half receives the lens's full strength at this distance. The
// outer quarters feather it into twilight, including beyond the opposite wall.
function shadowDensity(geometry, dx, distance) {
  if (distance <= 0 || dx <= geometry.left * distance || dx >= geometry.right * distance) return 0;
  const angle = (Math.atan(dx / distance) - geometry.leftAngle) / geometry.angleWidth;
  const edge = smooth(Math.min(1, 4 * Math.min(angle, 1 - angle)));
  return edge * lightAttenuation((dx * dx + distance * distance) / (projectedRadius * projectedRadius));
}

export function shutterDensityAt(shutter, x, y, playerX, speed) {
  if (playerX <= shutter.openX) return 0;
  return openingStrength(shutter, playerX, speed) * shadowDensity(coneGeometry(shutter), x - shutter.x, (shutter.y - y) * shutter.side);
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

// Project the silhouette along rays from the lens through the wisp. The
// penumbra scales with its apparent size seen by this particular lantern.
function projectedBody(shutter, px, py, bodyRadius) {
  const geometry = coneGeometry(shutter);
  const cached = geometry.body;
  if (cached && cached.px === px && cached.py === py && cached.radius === bodyRadius) return cached;
  const body = cached || {};
  body.px = px; body.py = py; body.radius = bodyRadius;
  const dx = px - shutter.x, dy = py - shutter.y, distance = Math.hypot(dx, dy);
  const radius = bodyRadius * 1.55;
  body.strength = shadowDensity(geometry, dx, -shutter.side * dy);
  if (body.strength > 0 && distance > radius) {
    body.ux = dx / distance; body.uy = dy / distance;
    body.slope = radius / Math.sqrt(distance * distance - radius * radius);
    body.offset = distance;
  } else body.strength = 0;
  geometry.body = body;
  return body;
}

function blockedFraction(shutter, body, x, y) {
  if (!body.strength) return 0;
  const dx = x - shutter.x, dy = y - shutter.y;
  const along = dx * body.ux + dy * body.uy;
  if (along <= body.offset) return 0;
  const across = Math.abs(dx * body.uy - dy * body.ux);
  const fraction = across / (along * body.slope);
  return body.strength * smooth(clamp01((1.25 - fraction) / .53));
}

function fieldAt(boss, x, y, playerX, playerY, light, radius, wake) {
  let ambient = 1;
  for (const shutter of boss?.shutters || []) {
    const density = shutterDensityAt(shutter, x, y, playerX, boss.speed);
    if (!density) continue;
    const blocked = blockedFraction(shutter, projectedBody(shutter, playerX, playerY, radius), x, y);
    ambient *= 1 - density * (wake ? blocked : 1 - blocked);
    if (ambient === 0) break;
  }
  if (ambient === 1) return wake ? 0 : 1;
  const local = pocketTransmission(Math.hypot(x - playerX, y - playerY), lightReach(light));
  const darkness = (1 - ambient) * (1 - local);
  return wake ? darkness : 1 - darkness;
}

export function shutterLightFactor(boss, x, y, playerX, playerY, light = {}, radius = 9.35) {
  return fieldAt(boss, x, y, playerX, playerY, light, radius, false);
}

// Fog can reveal the scenery rescued by the wisp, even when its ordinary
// Luminance falls short. Other lanterns still darken it in the shadow pass.
export function shutterWakeAt(boss, x, y, playerX, playerY, radius = 9.35, light = {}) {
  return fieldAt(boss, x, y, playerX, playerY, light, radius, true);
}

// A fixed lantern has one reusable alpha texture. The camera only translates
// and scales it. Two shadows share a single local opening around the wisp.
function shadowStamp(doc, geometry, depth) {
  if (geometry.stamp && geometry.stampDepth === depth) return geometry.stamp;
  const canvas = doc.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(canvas.width, canvas.height);
  const left = Math.min(0, geometry.left), width = Math.max(0, geometry.right) - left;
  for (let y = 0; y < canvas.height; y++) {
    const distance = depth * (y + .5) / canvas.height;
    for (let x = 0; x < canvas.width; x++) {
      const dx = depth * (left + (x + .5) * width / canvas.width);
      pixels.data[(y * canvas.width + x) * 4 + 3] = Math.round(255 * shadowDensity(geometry, dx, distance));
    }
  }
  context.putImageData(pixels, 0, 0);
  geometry.stamp = canvas;
  geometry.stampDepth = depth;
  return canvas;
}

function makeSurface(doc, w, h) {
  const canvas = doc.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return canvas.getContext('2d');
}

// Transverse opacity of the projected body. Sampled once in normalized
// coordinates, then oriented and clipped behind the wisp for each lamp.
function bodyStamp(doc) {
  const ctx = makeSurface(doc, 128, 128), {width, height} = ctx.canvas;
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const across = Math.abs((y + .5) / height * 2 - 1) * 1.25;
    const fraction = across / ((x + .5) / width);
    image.data[(y * width + x) * 4 + 3] = 255 * smooth(clamp01((1.25 - fraction) / .53));
  }
  ctx.putImageData(image, 0, 0);
  return ctx.canvas;
}

function drawLamp(ctx, doc, shutter, geometry, distance, depth, strength) {
  const left = Math.min(0, geometry.left) * depth, right = Math.max(0, geometry.right) * depth;
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.translate(shutter.x - distance, shutter.y);
  ctx.scale(1, -shutter.side);
  ctx.drawImage(shadowStamp(doc, geometry, depth), left, 0, right - left, depth);
  ctx.restore();
}

function drawBodyMask(ctx, stamp, body, shutter, distance, length) {
  ctx.save();
  ctx.globalAlpha = body.strength;
  ctx.translate(shutter.x - distance, shutter.y);
  ctx.transform(body.ux, body.uy, -body.uy, body.ux, 0, 0);
  const halfWidth = length * body.slope * 1.25;
  ctx.beginPath(); ctx.rect(body.offset, -halfWidth, length - body.offset, 2 * halfWidth); ctx.clip();
  ctx.drawImage(stamp, 0, -halfWidth, length, 2 * halfWidth); ctx.restore();
}

function openPocket(ctx, px, py, reach) {
  const aperture = ctx.createRadialGradient(px, py, 0, px, py, reach);
  for (let i = 0; i < transmission.length; i++) {
    aperture.addColorStop(i / (transmission.length - 1), 'rgba(0,0,0,' + transmission[i] + ')');
  }
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = aperture; ctx.fillRect(px - reach, py - reach, 2 * reach, 2 * reach); ctx.restore();
}

function shadowMasks(engine, distance, playerY, light) {
  const boss = lanternField(engine.layout);
  if (!boss?.shutters?.length || engine.dream?.mode === 'record') return null;
  const sx = engine.player.x, px = distance + sx, radius = engine.player.radius ?? 9.35;
  if (!boss.shutters.some(shutter => px > shutter.openX)) return null;
  const w = engine.width, h = engine.height, reach = lightReach(light || engine.getLightState?.() || {});
  let layer = shadowLayers.get(engine);
  if (layer && layer.shutters === boss.shutters && layer.distance === distance && layer.px === px &&
    layer.py === playerY && layer.reach === reach && layer.width === w && layer.height === h && layer.radius === radius) {
    return layer;
  }
  if (!layer || layer.width !== w || layer.height !== h) {
    const doc = engine.canvas.ownerDocument || globalThis.document;
    if (!doc) return null;
    const iw = Math.ceil(w / 2), ih = Math.ceil(h / 2);
    layer = { doc, width:w, height:h, shadow:makeSurface(doc,iw,ih), wake:makeSurface(doc,iw,ih),
      lamp:makeSurface(doc,iw,ih), occluded:makeSurface(doc,iw,ih), body:bodyStamp(doc) };
    for (const ctx of [layer.shadow,layer.wake,layer.lamp,layer.occluded]) {
      ctx.setTransform(iw / w, 0, 0, ih / h, 0, 0);
    }
    shadowLayers.set(engine, layer);
  }
  layer.shutters = boss.shutters; layer.distance = distance; layer.px = px; layer.py = playerY;
  layer.reach = reach; layer.radius = radius;
  layer.hasShadow = false; layer.hasWake = false;
  const {shadow, wake, lamp, occluded} = layer;
  for (const shutter of boss.shutters) {
    if (px <= shutter.openX) continue;
    const geometry = coneGeometry(shutter);
    const depth = shutter.side < 0 ? h - shutter.y : shutter.y;
    const x = shutter.x - distance;
    if (depth <= 0 || x + Math.max(0, geometry.right) * depth < 0 || x + Math.min(0, geometry.left) * depth > w) continue;
    if (!layer.hasShadow) {
      shadow.clearRect(0,0,w,h);
      layer.hasShadow = true;
    }
    const strength = openingStrength(shutter, px, boss.speed), body = projectedBody(shutter, px, playerY, radius);
    if (!body.strength) {
      drawLamp(shadow, layer.doc, shutter, geometry, distance, depth, strength);
      continue;
    }
    if (!layer.hasWake) {
      wake.clearRect(0,0,w,h);
      layer.hasWake = true;
    }
    lamp.clearRect(0,0,w,h);
    drawLamp(lamp, layer.doc, shutter, geometry, distance, depth, strength);
    // A separate copy of this lamp's mask isolates its rescued light. Other
    // lanterns then composite normally over any sector this wisp uncovers.
    const length = body.offset + Math.hypot(w,h) + 2;
    occluded.clearRect(0,0,w,h);
    drawBodyMask(occluded, layer.body, body, shutter, distance, length);
    lamp.save(); lamp.globalCompositeOperation = 'destination-out';
    lamp.drawImage(occluded.canvas,0,0,w,h); lamp.restore();
    shadow.drawImage(lamp.canvas,0,0,w,h);
    occluded.save(); occluded.globalCompositeOperation = 'source-in';
    drawLamp(occluded, layer.doc, shutter, geometry, distance, depth, strength);
    occluded.restore();
    wake.drawImage(occluded.canvas,0,0,w,h);
  }
  if (layer.hasShadow) openPocket(shadow, sx, playerY, reach);
  if (layer.hasWake) openPocket(wake, sx, playerY, reach);
  return layer;
}

export function drawShutterWake(ctx, engine, {
  distance = engine.renderDistance ?? engine.distance, playerY = engine.renderPlayerY ?? engine.player.y,
  scale = 1, light
} = {}) {
  const layer = shadowMasks(engine, distance, playerY, light);
  if (!layer?.hasWake) return;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layer.wake.canvas, 0, 0, engine.width * scale, engine.height * scale);
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
  if (phase === 1) {
    // A widening pool of light on the lens telegraphs the opening in-world.
    const radius = 14 + 12 * aim;
    const halo = c.createRadialGradient(0, 9, 1, 0, 9, radius);
    halo.addColorStop(0, 'rgba(255,230,166,.88)');
    halo.addColorStop(.35, 'rgba(244,204,145,.36)');
    halo.addColorStop(1, 'rgba(240,202,145,0)');
    c.fillStyle = halo;
    c.fillRect(-radius, 9-radius, radius*2, radius*2);
  }
  c.restore();
}

export function drawShutters(c, engine, {
  distance = engine.renderDistance ?? engine.distance, playerY = engine.renderPlayerY ?? engine.player.y,
  scale = 1, light
} = {}) {
  const boss = lanternField(engine.layout);
  if (!boss?.shutters?.length) return;
  const playerX = distance + engine.player.x;
  const layer = shadowMasks(engine, distance, playerY, light);
  c.save(); c.scale(scale, scale);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  if (layer?.hasShadow) {
    c.imageSmoothingEnabled = true;
    c.drawImage(layer.shadow.canvas, 0, 0, engine.width, engine.height);
  }
  c.translate(-distance, 0);
  for (const shutter of boss.shutters) {
    const phase = shutterPhase(shutter, playerX);
    if (!phase) continue;
    const aim = clamp01((playerX - shutter.warningX) / (shutter.openX - shutter.warningX));
    if (shutter.x >= distance - 24 && shutter.x <= distance + engine.width + 24) {
      drawProjector(c, shutter, phase, aim, boss.scale, engine.reducedMotion);
    }
  }
  c.restore();
}
