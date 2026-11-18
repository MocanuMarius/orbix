// Wordless in-flight cues for the starter cards (Skim Line, Pulse Reader, Courier Cord, Finish Flag). Each is a few whole-pixel
// rects per frame, read from state the engine already keeps; nothing is allocated and no canvas is created. The Meter Mark notch
// is HUD markup (dist/glow-ui.mjs). A cue is drawn only while its card is mounted (e.mod flag).
import {getProximityClearance} from './edging-pulse.mjs?v=starter-1';
const r = Math.round, clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const px = (c, x, y, w, h) => c.fillRect(r(x), r(y), Math.max(1, r(w)), Math.max(1, r(h)));

/** Skim Line: a thin band at the edge of the zone where a Skim counts, in line with the terrain nearest the wisp. */
export function drawSkimLine(c, e, {scale = 1, distance = e.renderDistance ?? e.distance, playerY = e.renderPlayerY ?? e.player.y} = {}) {
  const p = e.edgingPulse, s = p?.surface;
  if (!e.mod?.cardSkimLine || !p?.live || !s || !Number.isFinite(s.clearance)) return;
  const reach = getProximityClearance(e.mod), radius = e.player.radius || 10;
  if (s.clearance > reach * 2.4) return;
  const wx = e.player.x, wy = playerY, sx = s.x - distance, sy = s.y, dx = wx - sx, dy = wy - sy;
  const gap = reach + radius, inside = s.clearance <= reach + 1e-6, horizontal = Math.abs(dy) >= Math.abs(dx);
  const t = e.visualTime ?? e.time ?? 0, glow = inside ? .9 + (e.reducedMotion ? 0 : .1 * Math.sin(t * 9)) : .4;
  const along = 90, line = horizontal ? sy + Math.sign(dy || 1) * gap : sx + Math.sign(dx || 1) * gap, from = (horizontal ? wx : wy) - along;
  const lit = inside ? along * 2 * clamp(p.charge) : 0;
  c.save();
  const box = (a, b, thick, alpha, color) => { c.globalAlpha = alpha; c.fillStyle = color;
    if (horizontal) px(c, a * scale, (line - thick / 2) * scale, b * scale, thick * scale); else px(c, (line - thick / 2) * scale, a * scale, thick * scale, b * scale); };
  box(from, along * 2, 6, .26 * glow, '#d39a3a');
  box(from, along * 2, 2, glow * .8, '#f0c86a');
  if (lit > 0) box(from, lit, 2, 1, '#fffdf1');
  c.restore();
}

/** Pulse Reader: a soft ring of eight dots on the wisp that tightens as a Pulse front closes on a Spark (lead = px still to go). */
export function drawPulseRing(c, e, {scale = 1, playerY = e.renderPlayerY ?? e.player.y} = {}) {
  const lead = e.luminanceWaves?.cue?.lead, near = Number.isFinite(lead) ? 1 - clamp(lead / 190) : 0;
  const radius = 24 - 10 * near, cx = e.player.x, cy = playerY, dot = Math.max(3, r(3 * scale));
  c.save();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8, x = r((cx + Math.cos(a) * radius) * scale) - (dot >> 1), y = r((cy + Math.sin(a) * radius) * scale) - (dot >> 1);
    c.globalAlpha = .75; c.fillStyle = '#2a1d12'; c.fillRect(x - 1, y - 1, dot + 2, dot + 2); c.globalAlpha = .55 + .45 * near; c.fillStyle = near > .5 ? '#fffdf1' : '#f0c86a'; c.fillRect(x, y, dot, dot); }
  c.restore();
}

/** Courier Cord: one plus-shaped flash on the wisp for 0.35 s after each drop-off (the cord itself is drawn brighter in capture-art.mjs). */
export function drawCourierFlash(c, e, {scale = 1, playerY = e.renderPlayerY ?? e.player.y} = {}) {
  const age = (e.time ?? 0) - (e.courierFlashAt ?? -9);
  if (!(age >= 0 && age < .35)) return;
  const t = age / .35, reach = 8 + 14 * t, x = e.player.x, y = playerY;
  c.save(); c.globalAlpha = 1 - t; c.fillStyle = '#fffdf1';
  px(c, (x - reach) * scale, (y - 1) * scale, reach * 2 * scale, 2 * scale); px(c, (x - 1) * scale, (y - reach) * scale, 2 * scale, reach * 2 * scale);
  c.fillStyle = '#f0c86a'; c.globalAlpha = (1 - t) * .6; px(c, (x - reach) * scale, (y - 3) * scale, reach * 2 * scale, 6 * scale);
  c.restore();
}

/** Finish Flag: a thin gold bar under the top edge that fills toward the finish, with a small flag at its far end. No text. */
export function drawFinishBar(c, e, {scale = 1} = {}) {
  const span = e.totalDistance - e.distanceOrigin, p = span > 0 ? clamp((e.distance - e.distanceOrigin) / span) : 0, w = e.width * scale, y = 5 * scale;
  c.save(); c.globalAlpha = .55; c.fillStyle = '#2a1d12'; px(c, 0, y, w, 4 * scale);
  c.globalAlpha = .95; c.fillStyle = '#f0c86a'; px(c, 1 * scale, y + scale, Math.max(0, w * p - 2 * scale), 2 * scale);
  c.fillStyle = '#fffdf1'; px(c, 1 * scale, y + scale, Math.max(0, w * p - 2 * scale), 1 * scale);
  c.fillStyle = '#f0c86a'; px(c, w - 9 * scale, y - 2 * scale, 7 * scale, 5 * scale); c.fillStyle = '#dcc693'; px(c, w - 10 * scale, y - 3 * scale, 1 * scale, 9 * scale);
  c.restore();
}

export function drawStarterCues(c, e, opts = {}) {
  const m = e.mod;
  if (!m) return;
  if (m.cardSkimLine) drawSkimLine(c, e, opts);
  if (m.cardPulseReader) drawPulseRing(c, e, opts);
  if (m.cardCourierCord) drawCourierFlash(c, e, opts);
  if (m.cardFinishFlag) drawFinishBar(c, e, opts);
}
