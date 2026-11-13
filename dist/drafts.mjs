// One-shot, world-anchored air pockets. Reading a puff never advances it.
import { LEVEL_LENGTH } from './level-length.mjs?v=skill-forge-1';
import { scenePropBounds } from './scene-props.mjs?v=skill-forge-1';
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
export const DRAFT_TUNING = Object.freeze({ warning: 1.15, duration: 1.65, fade: .35,
  ramp: .20, boostResistance: .72, spacing: 1100, maximumForce: 620,
  ruins: Object.freeze({ force: 380 }), canopy: Object.freeze({ force: 450 }),
  storm: Object.freeze({ force: 520 }) });

function randomFor(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => { state += 0x6d2b79f5; let n = state;
    n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}

function surfaceAt(shape, localX, ceiling) {
  if (!shape) return null;
  let edge = ceiling ? -Infinity : Infinity;
  for (let i = 2; i < shape.length - 1; i++) {
    const a = shape[i], b = shape[i + 1];
    if (localX < Math.min(a[0], b[0]) || localX > Math.max(a[0], b[0])) continue;
    const t = a[0] === b[0] ? 0 : (localX - a[0]) / (b[0] - a[0]);
    const y = a[1] + (b[1] - a[1]) * t;
    edge = ceiling ? Math.max(edge, y) : Math.min(edge, y);
  }
  return Number.isFinite(edge) ? edge : null;
}

function openBand(obstacles, x, rx, height) {
  let top = 32, bottom = height - 34;
  // Use the actual visible collider surfaces, including the full canopy sway.
  // An entire puff fits its room; it cannot protrude into a nearby choke.
  for (let sample = 0; sample <= 8; sample++) {
    const sx = x - rx + rx * 2 * sample / 8;
    for (const obstacle of obstacles) {
      if (obstacle.destroyed) continue;
      const localX = sx - obstacle.x, motion = Math.abs(obstacle.motion || 0);
      const roof = surfaceAt(obstacle.topShape, localX, true);
      const floor = surfaceAt(obstacle.bottomShape, localX, false);
      if (roof !== null) top = Math.max(top, obstacle.center - obstacle.gap / 2 + roof + motion);
      if (floor !== null) bottom = Math.min(bottom, obstacle.center + obstacle.gap / 2 + floor - motion);
    }
  }
  return { top, bottom };
}

export function createDraftZones({ seed = 1, terrain = 'ruins', elite = false,
  duration = 38, height = 620, totalDistance = duration * 154, layout = {}, lesson = null, lengthScale = 1 } = {}) {
  if (lesson === 'glide') return [];
  const rng = randomFor(`${seed}:local-puffs`), scale = height / 620;
  const sections = layout.sections || [], hard = sections.filter(section => section.hard);
  const propBounds = (layout.obstacles || []).flatMap(scenePropBounds);
  const first = lesson ? 940 : 850;
  const last = totalDistance - 620;
  if (last <= first) return [];
  const legs = !lesson && lengthScale === LEVEL_LENGTH.multiplier ? LEVEL_LENGTH.multiplier : 1;
  const perLeg = lesson ? 1 : elite && totalDistance / legs >= 6100 ? 3
    : terrain === 'storm' || terrain === 'canopy' && duration / legs >= 34 ? 2 : 1;
  const desired = perLeg * legs;
  const candidates = [];
  for (let x = first; x <= last; x += 68) {
    const rx = 94 + rng() * 14, ry = (64 + rng() * 13) * scale;
    if (!lesson && (hard.some(section => x + rx + 54 > section.start && x - rx - 54 < section.end)
      || !sections.some(section => !section.hard && x >= section.start && x <= section.end))) continue;
    const band = openBand(layout.obstacles || [], x, rx + 16, height);
    // At least one body-wide bypass remains above and below the footprint.
    if (band.bottom - band.top < ry * 2 + 104 * scale) continue;
    const low = band.top + ry + 44 * scale, high = band.bottom - ry - 44 * scale;
    const y = low + (high - low) * (.25 + rng() * .5);
    // Lowered rock is not an empty draft room: exclude the entire actual prop
    // footprint, its sway envelope, and a body-wide bypass margin.
    if (propBounds.some(bounds => x + rx + 28 > bounds.minX && x - rx - 28 < bounds.maxX
      && y + ry + 44 * scale > bounds.minY && y - ry - 44 * scale < bounds.maxY)) continue;
    candidates.push({ x, y, rx, ry });
  }
  const selected = [];
  for (let i = 0; i < desired; i++) {
    const leg = Math.floor(i / perLeg);
    const legStart = first + (last - first) * leg / legs;
    const legEnd = first + (last - first) * (leg + 1) / legs;
    const target = legs === 1 ? lesson ? 1380 : i === 0 ? first + 30 : first + (last - first) * i / desired
      : legStart + (legEnd - legStart) * ((i % perLeg) + .5) / perLeg;
    const eligible = candidates.filter(zone => (legs === 1 || zone.x >= legStart && zone.x <= legEnd)
      && selected.every(other => Math.abs(other.x - zone.x) >= DRAFT_TUNING.spacing));
    eligible.sort((a, b) => Math.abs(a.x - target) - Math.abs(b.x - target));
    if (eligible[0]) selected.push(eligible[0]);
  }
  return selected.sort((a, b) => a.x - b.x).map((zone, i) => ({ ...zone,
    id: `draft:${i}`, direction: (rng() < .5 ? -1 : 1) * (i % 2 ? -1 : 1),
    force: lesson ? 90 : (DRAFT_TUNING[terrain] || DRAFT_TUNING.ruins).force,
    triggeredAt: null }));
}

function puffAt(zone, time) {
  if (zone.triggeredAt === null) return null;
  const age = time - zone.triggeredAt;
  if (age < 0) return null;
  let phase, progress, strength, opacity;
  if (age < DRAFT_TUNING.warning) {
    phase = 'gather'; progress = age / DRAFT_TUNING.warning; strength = 0;
    opacity = .28 + .45 * smooth(progress);
  } else if (age < DRAFT_TUNING.warning + DRAFT_TUNING.duration) {
    const activeAge = age - DRAFT_TUNING.warning;
    phase = 'active'; progress = activeAge / DRAFT_TUNING.duration;
    strength = smooth(activeAge / DRAFT_TUNING.ramp); opacity = .73 + strength * .27;
  } else if (age < DRAFT_TUNING.warning + DRAFT_TUNING.duration + DRAFT_TUNING.fade) {
    phase = 'fade'; progress = (age - DRAFT_TUNING.warning - DRAFT_TUNING.duration) / DRAFT_TUNING.fade;
    strength = 1 - smooth(progress); opacity = strength;
  } else return null;
  return { id: zone.id, x: zone.x, y: zone.y, rx: zone.rx, ry: zone.ry,
    direction: zone.direction, force: zone.force, phase, progress, strength, opacity };
}

export class DraftField {
  constructor(options) { this.zones = createDraftZones(options); }

  update(time, worldX, speed) {
    const lead = Math.max(1, speed) * DRAFT_TUNING.warning;
    for (const zone of this.zones) {
      if (zone.triggeredAt === null && worldX >= zone.x - zone.rx - lead) zone.triggeredAt = time;
    }
  }

  visible(time) { return this.zones.map(zone => puffAt(zone, time)).filter(Boolean); }

  sample(time, worldX, y, sensitivity = 1) {
    const quiet = { active: false, warning: false, direction: 0, strength: 0,
      force: 0, intensity: 0, warningProgress: 0, shelter: 1, puffId: null };
    let warning = null;
    for (const zone of this.zones) {
      const puff = puffAt(zone, time);
      if (!puff) continue;
      if (puff.phase === 'gather' && worldX <= zone.x + zone.rx) warning ||= puff;
      if (puff.phase === 'gather') continue;
      const radiusSquared = ((worldX - zone.x) / zone.rx) ** 2 + ((y - zone.y) / zone.ry) ** 2;
      if (radiusSquared >= 1) continue;
      const strength = puff.strength * smooth((1 - radiusSquared) / .55);
      if (strength <= 0) continue;
      const force = Math.min(DRAFT_TUNING.maximumForce, zone.force * clamp(Number(sensitivity) || 1, .5, 2)) * strength;
      return { ...quiet, active: true, direction: zone.direction, strength, force,
        intensity: force / DRAFT_TUNING.storm.force, puffId: zone.id,
        phase: puff.phase, x: zone.x, y: zone.y, rx: zone.rx, ry: zone.ry };
    }
    return warning ? { ...quiet, warning: true, direction: warning.direction,
      warningProgress: warning.progress, puffId: warning.id,
      x: warning.x, y: warning.y, rx: warning.rx, ry: warning.ry } : quiet;
  }

  resize(factor) { for (const zone of this.zones) { zone.y *= factor; zone.ry *= factor; } }
}
