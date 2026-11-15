const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const coordinate = (p, axis) => Number(Array.isArray(p) ? p[axis] : p[axis ? 'y' : 'x']) || 0;

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const ax = coordinate(points[i], 0), ay = coordinate(points[i], 1);
    const bx = coordinate(points[j], 0), by = coordinate(points[j], 1);
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

// Clip a segment to an angular sector, then measure its nearest point. Using
// sector minima rather than isolated rays also catches a narrow wall between
// rays: every triangle of the resulting fan remains in unobstructed space.
function sectorDistance(ax, ay, bx, by, ux, uy, vx, vy, limit) {
  const dx = bx - ax, dy = by - ay;
  let lo = 0, hi = 1;
  let f = ux * ay - uy * ax, d = ux * dy - uy * dx;
  if (Math.abs(d) < 1e-10) { if (f < 0) return limit; }
  else if (d > 0) lo = Math.max(lo, -f / d); else hi = Math.min(hi, -f / d);
  f = vy * ax - vx * ay; d = vy * dx - vx * dy;
  if (Math.abs(d) < 1e-10) { if (f < 0) return limit; }
  else if (d > 0) lo = Math.max(lo, -f / d); else hi = Math.min(hi, -f / d);
  if (lo > hi || hi < 0 || lo > 1) return limit;
  lo = Math.max(0, lo); hi = Math.min(1, hi);
  const length2 = dx * dx + dy * dy;
  const t = length2 > 1e-12 ? clamp(-(ax * dx + ay * dy) / length2, lo, hi) : lo;
  return Math.min(limit, Math.hypot(ax + dx * t, ay + dy * t));
}

export function collectorAuraContains(aura, x, y) {
  if (!aura || !Number.isFinite(x) || !Number.isFinite(y) || !aura.vertices?.length) return false;
  return insidePolygon(x, y, aura.vertices);
}

/** Pure geometry, in whichever coordinate system the caller supplies. */
export function computeCollectorAura({ x = 0, y = 0, radius = 0, polygons = [], rays = 48, maxExpansion = 1.6 } = {}) {
  x = Number(x) || 0; y = Number(y) || 0; radius = Math.max(0, Number(radius) || 0);
  const count = clamp(Math.round(rays) || 48, 24, 96), step = TAU / count;
  const maximum = radius * clamp(Number(maxExpansion) || 1.6, 1, 1.6);
  const caps = new Float64Array(count), sectorCaps = new Float64Array(count);
  const cosine = new Float64Array(count), sine = new Float64Array(count);
  const segments = [];
  let blockedOrigin = false;
  for (const entry of polygons) {
    const polygon = entry?.polygon || entry?.points || entry;
    if (!Array.isArray(polygon) || polygon.length < 3) continue;
    if (insidePolygon(x, y, polygon)) { blockedOrigin = true; break; }
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const ax = coordinate(polygon[j], 0) - x, ay = coordinate(polygon[j], 1) - y;
      const bx = coordinate(polygon[i], 0) - x, by = coordinate(polygon[i], 1) - y;
      if (Math.min(ax, bx) > maximum || Math.max(ax, bx) < -maximum || Math.min(ay, by) > maximum || Math.max(ay, by) < -maximum) continue;
      segments.push(ax, ay, bx, by);
    }
  }
  for (let i = 0; i < count; i++) { cosine[i] = Math.cos(i * step); sine[i] = Math.sin(i * step); }
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    let distance = blockedOrigin ? 0 : maximum;
    for (let j = 0; j < segments.length && distance > .01; j += 4) {
      distance = sectorDistance(segments[j], segments[j + 1], segments[j + 2], segments[j + 3], cosine[i], sine[i], cosine[next], sine[next], distance);
    }
    sectorCaps[i] = Math.max(0, distance - (distance < maximum - .01 ? .65 : 0));
  }
  for (let i = 0; i < count; i++) caps[i] = Math.min(sectorCaps[i], sectorCaps[(i + count - 1) % count]);
  const areaAt = level => {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += Math.min(caps[i], level) * Math.min(caps[(i + 1) % count], level);
    return sum * Math.sin(step) * .5;
  };
  const target = Math.PI * radius * radius;
  let lo = 0, hi = maximum;
  for (let i = 0; i < 17; i++) { const middle = (lo + hi) * .5; if (areaAt(middle) < target) lo = middle; else hi = middle; }
  const vertices = new Array(count), distances = new Float64Array(count), level = (lo + hi) * .5;
  for (let i = 0; i < count; i++) {
    const distance = Math.min(level, caps[i]); distances[i] = distance;
    vertices[i] = { x: x + cosine[i] * distance, y: y + sine[i] * distance };
  }
  const area = areaAt(level);
  const aura = { x, y, worldX: x, radius, vertices, distances, area, areaRatio: target > .001 ? area / target : 0, maxRadius: maximum, coordinateSpace: 'world' };
  aura.contains = (px, py) => collectorAuraContains(aura, px, py);
  return aura;
}
