// Wordless in-flight cues for the starter cards (Skim Line, Pulse Reader, Courier Cord, Finish Flag). Each is a few whole-pixel
// rects per frame, read from state the engine already keeps; nothing is allocated and no canvas is created. The Meter Mark notch
// is HUD markup (dist/glow-ui.mjs). A cue is drawn only while its card is mounted (e.mod flag).
import {getProximityClearance} from './edging-pulse.mjs?v=clear-1';
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

export function drawStarterCues(c, e, opts = {}) {
  const m = e.mod;
  if (!m) return;
  if (m.cardSkimLine) drawSkimLine(c, e, opts);
}
