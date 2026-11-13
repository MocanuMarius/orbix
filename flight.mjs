import { updateGuardian, drawGuardianWarnings } from './guardian-effects.mjs?v=gentler-opening-1';
import {drawProximityMeter} from './proximity-meter.mjs?v=gentler-opening-1';
import {FlightProjection,drawFlightProjection} from './flight-projection.mjs?v=gentler-opening-1';
import {drawGlowSense} from './glow-sense.mjs?v=gentler-opening-1';
import {formatGlow} from './vitality.mjs?v=gentler-opening-1';
import {installRiskChains} from './risk-chains.mjs?v=gentler-opening-1';
import {EXTRA_COURSES} from './world-expansion.mjs?v=gentler-opening-1';
import {BIOME_COURSES} from './biome-courses.mjs?v=gentler-opening-1';
import {BiomeDynamics} from './biome-dynamics.mjs?v=gentler-opening-1';
import {condenseGlow} from './condensed-glow.mjs?v=gentler-opening-1';
import {ensureGlowBudget} from './glow-budget.mjs?v=gentler-opening-1';
import {EdgingPulse} from './edging-pulse.mjs?v=gentler-opening-1';
import {isVowBodyPickup} from './contextual-events.mjs?v=gentler-opening-1';
import {BlackHoles} from './black-holes.mjs?v=gentler-opening-1';
import {drawBlackHoles} from './black-hole-art.mjs?v=gentler-opening-1';
/* Emberwing's self-contained canvas flight simulation and renderer. */
import { FLAME_TUNING, LIGHT_PACKET_TUNING } from './vitality.mjs?v=gentler-opening-1';
import { flightEndDistance } from './flight-end.mjs?v=gentler-opening-1';
import {getExitLandmarkState,drawExitLandmark} from './exit-landmark.mjs?v=gentler-opening-1';
import { WispCompanion, wispHome } from './wisp.mjs?v=gentler-opening-1';
import { getAscentInfo } from './ascent.mjs?v=gentler-opening-1';
import { LEVEL_LENGTH, getLevelLengthScale } from './level-length.mjs?v=gentler-opening-1';
import { resolveLevelIdentity } from './level-catalog.mjs?v=gentler-opening-1';
import { DraftField, DRAFT_TUNING } from './drafts.mjs?v=gentler-opening-1';
import { normalizeCompanionRole, normalizeCompanionFleet, getCompanionAbility } from './companion-abilities.mjs?v=gentler-opening-1';
import { populateSceneProps, scenePropPolygons } from './scene-props.mjs?v=gentler-opening-1';
import { pickupKind, getPickupSpec, pickupContactRadius, isFuelPickup, canCompanionCollect } from './pickups.mjs?v=gentler-opening-1';
import { drawPickup } from './pickup-art.mjs?v=gentler-opening-1';
import { buildBossLayout, getBossState as bossState, drawBoss } from './boss.mjs?v=gentler-opening-1';
import { getAuthoredChallenge, finalizeFlightChallenges, installAuthoredDraftCrossings, FlightChallengeDirector } from './flight-challenges.mjs?v=gentler-opening-1';
import { installEncounterFamily } from './encounter-families.mjs?v=gentler-opening-1';
import { installFlightForks, resizeFlightForks } from './flight-forks.mjs?v=gentler-opening-1';
import { ArtifactEffects } from './artifact-effects.mjs?v=gentler-opening-1';
import { LIGHT_EXTENT,lightAttenuation,lightVisibility,createLightMaskCanvas,sceneRevealStrength } from './light-field.mjs?v=gentler-opening-1';
import { createTutorialState, buildTutorialLayout, recordTutorialPickup,
  updateTutorial, updateTutorialCompanion, getTutorialHint } from './tutorial.mjs?v=gentler-opening-1';
export { FLAME_TUNING } from './vitality.mjs?v=gentler-opening-1';
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const COMPANION_ORBIT_SPEED = {protector:1.3,leveler:1.7,swift:3.4,seer:.8,kindler:2.2};
const RENDER_INTERVAL_MS = 1000 / 60;
const RESUME_RAMP_SECONDS = 3;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
export const FLIGHT_TUNING = Object.freeze({ gravity: 300, flapImpulse: 205,
  forwardSpeed: 154, terminalFall: 245, pickupRadius: LIGHT_PACKET_TUNING.pickupRadius });
export { DRAFT_TUNING } from './drafts.mjs?v=gentler-opening-1';
// Retain the public tuning name for consumers; wind now has no global cycle.
export const WIND_TUNING = DRAFT_TUNING;

export function seededRandom(seed = 1) {
  let state = 2166136261;
  for (const char of String(seed)) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Four authored patterns per terrain. The generator joins these motifs rather
// than inventing arbitrary gaps, and limits the vertical movement at joins.
export const FLIGHT_PATTERNS = Object.freeze({
  ruins: [
    { id: 'sun-gates', centers: [.50, .46, .51, .55], gap: 1.08, spacing: 1.04 },
    { id: 'rising-arches', centers: [.57, .49, .42, .46], gap: 1.00, spacing: 1.02 },
    { id: 'broken-stair', centers: [.43, .52, .58, .50], gap: 1.02, spacing: 1.06 },
    { id: 'temple-rhythm', centers: [.47, .55, .47, .53], gap: .98, spacing: 1.10 },
  ],
  canopy: [
    { id: 'leaf-cradle', centers: [.49, .45, .50, .55], gap: 1.13, spacing: 1.09 },
    { id: 'vine-waltz', centers: [.57, .49, .44, .49], gap: 1.08, spacing: 1.12 },
    { id: 'hollow-grove', centers: [.43, .48, .57, .53], gap: 1.10, spacing: 1.05 },
    { id: 'swaying-boughs', centers: [.48, .55, .51, .44], gap: 1.11, spacing: 1.10 },
  ],
  storm: [
    { id: 'cloud-pillars', centers: [.50, .47, .53, .55], gap: 1.14, spacing: 1.12 },
    { id: 'silver-crossing', centers: [.55, .48, .43, .50], gap: 1.12, spacing: 1.15 },
    { id: 'thunder-steps', centers: [.44, .51, .56, .49], gap: 1.10, spacing: 1.13 },
    { id: 'calm-between', centers: [.49, .54, .50, .45], gap: 1.16, spacing: 1.08 },
  ],
});

// center, opening, width, next spacing, occupancy, landform. These are macro
// phrases with a deliberate entry, hard maneuver and recovery, not gap rolls.
const MACRO_COURSES = Object.freeze({
  ...BIOME_COURSES,
  ...EXTRA_COURSES,
  'ruins-aqueduct': { name: 'The low aqueduct',
    entry: [[.50,232,142,330,'floor','terrace'],[.56,258,166,320,'both','underpass']],
    hard: [[.58,148,154,290,'both','underpass'],[.51,136,132,285,'both','underpass'],[.44,154,148,320,'both','terrace']],
    rest: [[.43,286,170,350,'floor','terrace'],[.48,300,152,360,'floor','terrace']] },
  'ruins-belfry': { name: 'The fallen bell stair',
    entry: [[.50,232,142,330,'floor','terrace'],[.54,280,110,350,'roof','shelf']],
    hard: [[.57,184,116,280,'floor','shelf'],[.50,144,108,285,'both','shelf'],[.43,132,128,320,'both','shelf']],
    rest: [[.44,280,176,360,'floor','terrace'],[.49,310,148,355,'floor','shelf']] },
  'ruins-ossuary': { name: 'The ossuary neck',
    entry: [[.50,232,142,330,'floor','terrace'],[.49,270,170,320,'both','vault']],
    hard: [[.49,160,164,290,'both','vault'],[.48,124,118,280,'both','vault'],[.45,148,140,320,'both','vault']],
    rest: [[.43,278,174,350,'both','vault'],[.48,300,160,370,'floor','terrace']] },
  'canopy-elder': { name: 'The elder root bend',
    entry: [[.50,232,142,330,'floor','root'],[.55,280,168,330,'both','root']],
    hard: [[.55,160,164,285,'both','root'],[.48,142,146,290,'both','root'],[.43,152,150,330,'both','root']],
    rest: [[.46,292,172,355,'floor','root'],[.51,310,160,365,'both','root']] },
  'canopy-fen': { name: 'The thorn hollow',
    entry: [[.50,232,142,330,'floor','root'],[.57,292,172,340,'floor','hollow']],
    hard: [[.58,196,160,285,'floor','hollow'],[.53,144,140,290,'both','thorn'],[.47,158,152,320,'both','root']],
    rest: [[.48,300,178,355,'floor','hollow'],[.53,318,164,375,'floor','root']] },
  'canopy-hanging': { name: 'The hanging root dip',
    entry: [[.50,232,142,330,'floor','root'],[.44,282,170,340,'both','hanging']],
    hard: [[.43,184,152,300,'roof','hanging'],[.50,138,144,290,'both','hanging'],[.56,150,160,330,'both','root']],
    rest: [[.54,300,166,370,'floor','root'],[.49,316,152,365,'both','hanging']] },
  'storm-ridge': { name: 'The razor saddle climb',
    entry: [[.50,232,142,330,'floor','ridge'],[.57,280,168,330,'floor','ridge']],
    hard: [[.58,176,154,285,'floor','ridge'],[.51,148,142,290,'both','razor'],[.44,132,126,320,'both','razor']],
    rest: [[.42,294,174,370,'floor','ridge'],[.48,316,162,365,'floor','ridge']] },
  'storm-chasm': { name: 'The chasm landing',
    entry: [[.50,232,142,330,'floor','cliff'],[.45,282,164,350,'floor','cliff']],
    hard: [[.44,220,162,320,'floor','cliff'],[.50,282,144,400,'roof','overhang'],[.56,164,170,300,'floor','landing'],[.51,138,128,330,'both','cliff']],
    rest: [[.49,312,162,365,'floor','landing'],[.45,300,174,375,'floor','cliff']] },
  'storm-glass': { name: 'The crystal tooth squeeze',
    entry: [[.50,232,142,330,'floor','ridge'],[.50,282,166,330,'both','tooth']],
    hard: [[.50,154,146,285,'both','tooth'],[.47,128,120,285,'both','tooth'],[.53,136,136,325,'both','tooth']],
    rest: [[.52,294,172,355,'both','vault'],[.48,318,164,375,'floor','ridge']] },
});

export function circleHitsPolygon(x, y, radius, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    if ((x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2 <= radius ** 2) return true;
  }
  return inside;
}

export function obstaclePolygons(obstacle, time = 0) {
  const center = obstacle.center + Math.sin(time * .9 + obstacle.phase) * obstacle.motion;
  const polygons = [];
  if (obstacle.topShape) polygons.push(obstacle.topShape.map(([x, y]) => [obstacle.x + x, center - obstacle.gap / 2 + y]));
  if (obstacle.bottomShape) polygons.push(obstacle.bottomShape.map(([x, y]) => [obstacle.x + x, center + obstacle.gap / 2 + y]));
  polygons.push(...scenePropPolygons(obstacle, time));
  return polygons;
}

// Flight shapes keep their local X coordinates for their entire lifetime;
// resizing scales Y only. Cache these bounds without retaining old levels.
const collisionXBounds = new WeakMap();
function localPolygonHit(x, y, radius, polygon) {
  if (!polygon?.length) return false;
  let bounds = collisionXBounds.get(polygon);
  if (!bounds || bounds.length !== polygon.length) {
    let min = Infinity, max = -Infinity;
    for (const point of polygon) { min = Math.min(min, point[0]); max = Math.max(max, point[0]); }
    bounds = { min, max, length: polygon.length }; collisionXBounds.set(polygon, bounds);
  }
  return x + radius >= bounds.min && x - radius <= bounds.max
    && circleHitsPolygon(x, y, radius, polygon);
}

/** Same solid geometry as obstaclePolygons, with no transformed vertex arrays. */
export function circleHitsObstacle(x, y, radius, obstacle, time = 0, center = undefined) {
  const originY = center ?? obstacle.center + Math.sin(time * .9 + obstacle.phase) * obstacle.motion;
  const localX = x - obstacle.x, localY = y - originY;
  if (localPolygonHit(localX, localY + obstacle.gap / 2, radius, obstacle.topShape)
    || localPolygonHit(localX, localY - obstacle.gap / 2, radius, obstacle.bottomShape)) return true;
  for (const prop of obstacle.sceneProps || []) for (const part of prop.parts) {
    if (localPolygonHit(localX, localY - prop.side * obstacle.gap / 2, radius, part.polygon)) return true;
  }
  return false;
}

// Deliberate landform families share a safe footprint, rather than repeating a
// noisy triangle under different textures. Depths are measured away from the
// playable opening, so erosion and vaults can never nibble into its clearance.
const RIDGE_X = [-.80, -.46, -.12, .15, .39, .62, .83, 1.08, 1.39, 1.74, 2.10, 2.45];
const VAULT_X = [-.80, -.46, -.12, .24, .57, .76, .96, 1.20, 1.42, 1.62, 1.82, 2.02, 2.20, 2.45];
const TERRAIN_CONTOURS = Object.freeze({
  ruins: {
    // A weathered massif, a worn terrace, a steep escarpment, a folded ridge.
    ground: [
      [190, 133, 82, 46, 19, 0, 8, 37, 61, 88, 132, 190],
      [185, 137, 91, 49, 17, 3, 0, 15, 24, 72, 128, 190],
      [192, 148, 101, 58, 34, 9, 0, 21, 63, 109, 150, 192],
      [185, 139, 86, 51, 28, 0, 6, 32, 39, 79, 137, 188],
    ],
    vault: [
      [195, 145, 85, 48, 6, 18, 52, 83, 94, 76, 54, 38, 68, 185],
      [195, 145, 85, 48, 6, 24, 60, 76, 82, 64, 48, 36, 65, 190],
    ],
  },
  canopy: {
    // Buttress roots grow into broad, rounded banks with shallow hollows.
    ground: [
      [185, 112, 65, 29, 7, 0, 5, 18, 48, 91, 136, 185],
      [183, 120, 59, 20, 0, 4, 10, 29, 37, 78, 131, 185],
      [190, 129, 73, 38, 15, 0, 4, 13, 37, 75, 132, 189],
      [185, 123, 76, 33, 5, 0, 9, 20, 55, 96, 139, 190],
    ],
    vault: [
      [185, 116, 55, 14, 0, 10, 38, 65, 74, 60, 28, 4, 38, 185],
      [190, 124, 58, 11, 0, 17, 47, 70, 81, 56, 21, 7, 43, 189],
    ],
  },
  storm: {
    // Alpine faces rise into asymmetrical summits and eroded wind saddles.
    ground: [
      [200, 151, 104, 62, 27, 0, 19, 43, 60, 103, 161, 200],
      [195, 141, 94, 55, 17, 0, 12, 49, 72, 83, 143, 198],
      [200, 150, 97, 49, 15, 0, 24, 31, 66, 117, 154, 200],
      [198, 143, 107, 67, 32, 8, 0, 29, 55, 96, 155, 200],
    ],
    vault: [
      [200, 145, 79, 28, 0, 23, 62, 97, 104, 82, 40, 8, 51, 200],
      [200, 147, 74, 19, 0, 32, 68, 91, 108, 87, 31, 5, 45, 200],
    ],
  },
});

// Large-scale erosion must change the skyline, not merely add samples to an
// apex. These lower formations carve broad caps, benches and saddles out of
// the established clearance envelope; no new ground can rise into the route.
const ERODED_GROUND_DEPTHS = Object.freeze({
  ruins: [
    // A long weathered mesa; a stepped cliff; an escarpment; a broken shelf.
    [195, 146, 100, 52, 52, 52, 52, 52, 72, 118, 152, 198],
    [195, 146, 108, 68, 38, 38, 38, 66, 105, 106, 154, 198],
    [200, 160, 118, 79, 45, 45, 45, 45, 80, 146, 166, 200],
    [195, 147, 109, 66, 48, 48, 73, 73, 73, 115, 156, 195],
  ],
  storm: [
    // Twin summit with a deep saddle; a wind-cut bench; forked ridge; arete.
    [206, 164, 123, 72, 94, 114, 92, 58, 78, 120, 167, 206],
    [202, 156, 112, 69, 52, 52, 52, 76, 102, 117, 160, 204],
    [205, 161, 119, 68, 84, 100, 89, 56, 79, 132, 174, 206],
    [204, 159, 124, 84, 56, 48, 48, 56, 82, 124, 171, 205],
  ],
});

function sampleTerrainContour(xs, depths) {
  const secants = depths.slice(1).map((value, i) => (value - depths[i]) / (xs[i + 1] - xs[i]));
  const slopes = depths.map((_, i) => i === 0 ? secants[0] : i === depths.length - 1 ? secants.at(-1)
    : secants[i - 1] * secants[i] <= 0 ? 0 : (secants[i - 1] + secants[i]) * .5);
  // Monotone Hermite tangents preserve authored shelves and peaks without
  // overshoot, while making the whole silhouette continuously curved.
  for (let i = 0; i < secants.length; i++) {
    if (secants[i] === 0) { slopes[i] = slopes[i + 1] = 0; continue; }
    const a = slopes[i] / secants[i], b = slopes[i + 1] / secants[i];
    const magnitude = Math.hypot(a, b);
    if (magnitude > 3) {
      slopes[i] = a * 3 / magnitude * secants[i];
      slopes[i + 1] = b * 3 / magnitude * secants[i];
    }
  }
  const points = [];
  for (let i = 0; i < secants.length; i++) {
    const width = xs[i + 1] - xs[i];
    for (let sample = 0; sample < 6; sample++) {
      const t = sample / 6, t2 = t * t, t3 = t2 * t;
      const depth = (2 * t3 - 3 * t2 + 1) * depths[i]
        + (t3 - 2 * t2 + t) * width * slopes[i]
        + (-2 * t3 + 3 * t2) * depths[i + 1]
        + (t3 - t2) * width * slopes[i + 1];
      points.push([lerp(xs[i], xs[i + 1], t), clamp(depth, Math.min(depths[i], depths[i + 1]), Math.max(depths[i], depths[i + 1]))]);
    }
  }
  points.push([xs.at(-1), depths.at(-1)]);
  return points;
}

function makeTerrainShape(width, scale, top, variant, terrain, passage) {
  const family = TERRAIN_CONTOURS[terrain] || TERRAIN_CONTOURS.ruins;
  const roof = top && (passage === 'cavern' || terrain === 'canopy');
  const profiles = roof ? family.vault : family.ground;
  const depths = profiles[variant % profiles.length];
  const surface = sampleTerrainContour(roof ? VAULT_X : RIDGE_X, depths);
  if (!top && ERODED_GROUND_DEPTHS[terrain]) {
    const erosion = ERODED_GROUND_DEPTHS[terrain];
    const carved = sampleTerrainContour(RIDGE_X, erosion[variant % erosion.length]);
    for (let i = 0; i < surface.length; i++) surface[i][1] = Math.max(surface[i][1], carved[i][1]);
  }
  const sign = top ? -1 : 1;
  // Broad rounded vaults expose more roof for longer than the former sharp
  // wedges. Erode their sandstone lip upward to preserve forgiving headroom.
  const vaultHeadroom = roof && terrain === 'ruins' ? 20 : 0;
  // Renderer contract: two offscreen closure points, then the entire visible
  // surface RIGHT-to-LEFT. Neighbours overlap below their eroded shoulders.
  return [[-.80 * width, sign * 900 * scale], [2.45 * width, sign * 900 * scale],
    ...surface.reverse().map(([x, depth]) => [x * width, sign * (depth + vaultHeadroom) * scale])];
}

function makeCourseLandform(width, scale, top, variant, terrain, passage, form, tight) {
  const shape = makeTerrainShape(width, scale, top, variant, terrain, passage);
  const side = top ? -1 : 1;
  for (const point of shape.slice(2)) {
    const nx = point[0] / width;
    let depth = side * point[1];
    if (form === 'shelf' && nx > -.1 && nx < 1.45) depth = Math.round(depth / (18 * scale)) * 18 * scale;
    if ((form === 'cliff' || form === 'landing') && !top && nx > -.1 && nx < 1.6) {
      const drop = clamp((nx - .78) / .55, 0, 1);
      depth = Math.min(depth, (22 + 150 * drop * drop * (3 - 2 * drop)) * scale);
    }
    if (tight) {
      // The two grounded faces share an authored aperture. This removes the
      // old incidental extra headroom from deep mesas/valleys at hard spots.
      const distance = Math.abs(nx - .58);
      const blend = 1 - clamp((distance - .20) / .62, 0, 1);
      depth *= 1 - blend * blend * (3 - 2 * blend);
    }
    point[1] = side * Math.max(0, depth);
  }
  return shape;
}

function referenceEncounterCount(seed, terrain, extent) {
  const rng = seededRandom(`${seed}:layout`), motifs = FLIGHT_PATTERNS[terrain] || FLIGHT_PATTERNS.ruins;
  let x = 690, count = 0;
  while (x < extent) {
    const pattern = motifs[Math.floor(rng() * motifs.length)];
    for (const unused of pattern.centers) {
      rng();
      const width = 132 + rng() * 35;
      if (x + width * 2.5 + 35 > extent) return count;
      rng(); rng();
      for (let j = 0; j < 4; j++) rng();
      x += (286 + rng() * 27) * pattern.spacing;
      count++;
    }
  }
  return count;
}

function terrainEdgeY(shape, localX) {
  const surface = shape.slice(2);
  for (let i = 1; i < surface.length; i++) {
    const a = surface[i - 1], b = surface[i];
    if (localX >= Math.min(a[0], b[0]) && localX <= Math.max(a[0], b[0])) {
      return lerp(a[1], b[1], (localX - a[0]) / (b[0] - a[0] || 1));
    }
  }
  return surface[0]?.[1] || 0;
}

function cachePocketX(obstacle, side, first) {
  const shape = side < 0 ? obstacle.topShape : obstacle.bottomShape;
  const surface = shape.slice(2);
  const depths = surface.map(point => side * point[1]);
  const crest = Math.min(...depths);
  const crown = surface.filter((point, index) => depths[index] <= crest + 2);
  const preferredX = first ? -obstacle.width * .25 : crown.reduce((sum, point) => sum + point[0], 0) / crown.length;
  return surface.reduce((best, point) => Math.abs(point[0] - preferredX) < Math.abs(best[0] - preferredX) ? point : best, surface[0])[0];
}

function carveCachePocket(obstacle, side, first, rich, height) {
  const shape = side < 0 ? obstacle.topShape : obstacle.bottomShape;
  const surface = shape.slice(2), scale = height / 620;
  const localX = cachePocketX(obstacle, side, first), halfWidth = first ? 50 : rich ? 54 : 49;
  const depth = (first ? 26 : rich ? 42 : 34) * scale;
  for (const point of surface) {
    const dx = Math.abs(point[0] - localX);
    if (first && dx < halfWidth * 1.85) {
      // An attached leading shelf introduces edge collection before the first
      // main ridge. It stays outside the established central flight opening.
      const blend = 1 - clamp((dx - halfWidth * .82) / (halfWidth * 1.03), 0, 1);
      const eased = blend * blend * (3 - 2 * blend);
      point[1] = lerp(point[1], 0, eased);
    }
    if (dx < halfWidth) {
      const bowl = (1 - (dx / halfWidth) ** 2) ** 2;
      point[1] += side * depth * bowl;
    }
  }
  return { localX, side, mouth: halfWidth * 2, depth, first, rich };
}

export function buildFlightLayout({ seed = 1, terrain = 'ruins', elite = false,
  duration = 38, speed = 154, height = 620, passage = 'open', fuelCadence = 3,
  levelId, stage = 0, difficulty = 1, mapIndex = 0, lengthScale = 1, encounterFamily = null, gentleOpening = false } = {}) {
  const ascent = getAscentInfo({ row: stage, difficulty });
  const legCount = lengthScale === LEVEL_LENGTH.multiplier ? LEVEL_LENGTH.multiplier : 1;
  const identity = resolveLevelIdentity(levelId, terrain, seed);
  const course = MACRO_COURSES[identity.id] || MACRO_COURSES['ruins-aqueduct'];
  const rng = seededRandom(`${seed}:${identity.id}:macro-course`);
  const obstacles = [], embers = [], sections = [];
  let x = 690, previous = height * .5, index = 0;
  const extent = (Math.max(15, duration) - 2.8) * speed + 98;
  const legStart = x;
  const legs = Array.from({ length: legCount }, (_, leg) => ({ index: leg,
    start: lerp(legStart, extent, leg / legCount), end: lerp(legStart, extent, (leg + 1) / legCount) }));
  const spacingScale = elite ? .96 : 1;
  const fits = (cells, limit = extent) => {
    let cursor = x;
    for (const cell of cells) {
      if (cursor + cell[2] * 2.5 + 35 > limit) return false;
      cursor += cell[3] * spacingScale;
    }
    return true;
  };
  const appendSection = (kind, cells, repetition = 0, limit = extent, leg = 0, authored = null) => {
    const hard = kind === 'challenge', first = obstacles.length;
    const sectionId = `${identity.id}:${kind}:${sections.length}`;
    for (const cell of cells) {
      const [flow, opening, width, spacing, occupancy, form] = cell;
      if (x + width * 2.5 + 35 > limit) break;
      const shift = Math.min(48, height * .075);
      const center = clamp(height * (flow + (repetition % 2 ? .012 : 0)), previous - shift, previous + shift);
      const tight = hard && occupancy === 'both' && opening <= 184;
      const baseGap = tight ? clamp(opening * height / 620 * (elite ? .88 : 1), elite ? 104 : 120, elite ? 148 : 164)
        : clamp(opening * height / 620 * (passage === 'cavern' ? .96 : 1), height * .28, height * .58);
      // Scale the finished authored aperture, so capped openings also tighten
      // visibly with depth. Intro and recovery sections retain their full gap.
      const gap = hard ? Math.max(tight ? elite ? 104 : 120 : height * .28,
        baseGap * ascent.hardGapScale) : baseGap;
      const obstacle = {
        id: index, x, width, center,
        gap:gentleOpening?Math.min(height*.72,Math.max(height*.40,gap*1.35)):Math.min(height*.68,gap*(!elite&&difficulty===1?(mapIndex===0?1.20:1.10):1)), phase: rng() * TAU, pattern: `${identity.scene}-${form}`,
        motion: terrain === 'canopy' && !gentleOpening ? height * (tight ? .003 : .008) : 0,
        soft: terrain === 'canopy' && form === 'thorn',
        destroyed: false, hit: false, passed: false,
        variation: (index + identity.variant + repetition) % 4,
        levelId: identity.id, sectionId, hard, setpiece: form, leg,
        ascentLevel: ascent.level, hardGapScale: hard ? ascent.hardGapScale : 1,
        landmark: `${identity.scene}-${form}`, cacheEligible: occupancy !== 'roof',
        windShelter: tight ? .32 : 1,
        shelterStart: x - width * .15, shelterEnd: x + width * 1.5,
      };
      obstacle.topShape = occupancy !== 'floor' ? makeCourseLandform(width, height / 620, true, index, terrain,
        form === 'vault' || form === 'root' || form === 'hanging' ? 'cavern' : passage, form, tight) : null;
      obstacle.bottomShape = occupancy !== 'roof' ? makeCourseLandform(width, height / 620, false, index + 1, terrain, passage, form, tight) : null;
      if(authored){
        obstacle.challengeKind=authored.type;obstacle.challengeName=authored.name;
        obstacle.challengeLandmark=authored.landmark;
        // Reserve an open crossing room against later decorative solid props.
        // The section stays non-hard so only a safe local puff can occupy it.
        if(authored.type==='draft-crossing'){obstacle.hard=true;obstacle.reservedDraft=true;}
      }
      obstacles.push(obstacle);
      previous = center;
      x += spacing * spacingScale;
      index++;
    }
    if (obstacles.length === first) return false;
    const members = obstacles.slice(first), firstMember = members[0], last = members.at(-1);
    sections.push({ id: sectionId, name: hard ? course.name : kind === 'intro' ? `${identity.name} approach` : `${identity.name} breathing room`,
      start: firstMember.x - firstMember.width * .8, end: last.x + last.width * 2.45,
      kind, hard, difficulty: hard ? elite ? 3 : Math.min(3, 2 + (ascent.level - 1) * .25) : 0,
      ascentLevel: ascent.level, hardGapScale: hard ? ascent.hardGapScale : 1, leg,
      setpiece: identity.motif,
      landmark: identity.scene, warningStart: firstMember.x - firstMember.width * .8 - 180,
      windShelter: Math.min(...members.map(obstacle => obstacle.windShelter)) });
    if(authored)Object.assign(sections.at(-1),{name:authored.name,setpiece:authored.type,landmark:authored.landmark,
      authoredChallenge:{type:authored.type,name:authored.name,instruction:authored.instruction,
        landmark:authored.landmark,darkness:authored.darkness,family:authored.family}});
    return true;
  };
  const requestedWindows = Math.max(ascent.requestedHardWindows, elite ? 2 : 1);
  if (legCount === 1) {
    // Preserve the original seeded course for old attempts and short fixtures.
    appendSection('intro', course.entry);
    for (let window = 0; window < requestedWindows; window++) {
      if (!fits(course.hard)) break;
      appendSection('challenge', course.hard, window);
      if (window < requestedWindows - 1 && !appendSection('breather', course.rest, window)) break;
    }
    let recovery = 0;
    while (x < extent && appendSection(extent - x < 1100 ? 'outro' : 'breather', course.rest, recovery++)) { /* authored recovery phrases */ }
  } else {
    appendSection('intro', course.entry, 0, legs[0].end, 0);
    let recovery = 0;
    for (const leg of legs) {
      const plans=Array.from({length:requestedWindows},(_,window)=>getAuthoredChallenge({
        course,terrain,stage,difficulty,mapIndex,levelId:identity.id,elite,leg:leg.index,window,encounterFamily}));
      // Keep the authored cells and center-change limits. Only their placement
      // in three paced legs changes; no new random passage geometry is added.
      for (let window = 0; window < requestedWindows; window++) {
        const target = lerp(leg.start, leg.end, (window + .35) / requestedWindows);
        const remaining = [];
        for (let next = window; next < requestedWindows; next++) {
          if (next > window) remaining.push(...course.rest);
          remaining.push(...plans[next].cells);
        }
        // Spend spare room on recovery before each hard window, reserving
        // space for the remaining authored challenges whenever they fit.
        while (x < target && fits([...course.rest, ...remaining], leg.end)) {
          if (!appendSection('breather', course.rest, recovery++, leg.end, leg.index)) break;
        }
        const plan=plans[window];
        if (!fits(plan.cells, leg.end)) break;
        appendSection(plan.sectionKind, plan.cells, leg.index * requestedWindows + window, leg.end, leg.index, plan);
        if (window < requestedWindows - 1) {
          if (!fits([...course.rest, ...plans[window+1].cells], leg.end)) break;
          appendSection('breather', course.rest, recovery++, leg.end, leg.index);
        }
      }
      while (x < leg.end && appendSection(leg.index === legCount - 1 && extent - x < 1100 ? 'outro' : 'breather',
        course.rest, recovery++, leg.end, leg.index)) { /* recover to the next leg */ }
    }
  }
  const loot = seededRandom(`${seed}:ember-routes`);
  const cadence = clamp(Math.round(fuelCadence), 2, 4);
  const quietSection = Math.floor(loot() * cadence);
  if (obstacles.length) {
    // Preserve the route-density ordering while removing roughly two fifths
    // of the old pickup budget. Every remaining object is a deliberate cache.
    let formerBudget = 1;
    const referenceCount = referenceEncounterCount(seed, terrain, extent);
    for (let i = 0; i < referenceCount; i++) {
      const quiet = cadence === 2 ? i % 4 === quietSection
        : i % cadence === quietSection || (cadence === 4 && i % 4 === (quietSection + 1) % 4);
      if (!quiet) formerBudget += 1 + ((terrain === 'canopy' && i % 3 === 2) || i % 4 === 1 ? 1 : 0);
    }
    const usable = obstacles.map((obstacle, anchor) => ({ obstacle, anchor }))
      .filter(({ obstacle }) => obstacle.cacheEligible && (obstacle.bottomShape || obstacle.topShape)).map(({ anchor }) => anchor);
    const cacheCount = clamp(Math.round(formerBudget * .62), Math.min(2, usable.length), usable.length);
    const sites = Array.from({ length: cacheCount }, (_, i) => usable[Math.round(i * (usable.length - 1) / Math.max(1, cacheCount - 1))]);
    let heart = Math.max(1, Math.floor(cacheCount * .43));
    while (heart > 1 && sites[heart] - sites[heart - 1] < 2) heart--;
    const richOrders = new Set();
    if (legCount === 1) {
      if (cacheCount >= 4) richOrders.add(heart);
      if (cacheCount >= 9) richOrders.add(cacheCount - 2);
    } else for (let leg = 0; leg < legCount; leg++) {
      const orders = sites.map((anchor, order) => ({ anchor, order }))
        .filter(item => obstacles[item.anchor].leg === leg).map(item => item.order);
      if (orders.length < 4) continue;
      let middle = Math.max(1, Math.floor(orders.length * .43));
      while (middle > 1 && sites[orders[middle]] - sites[orders[middle - 1]] < 2) middle--;
      richOrders.add(orders[middle]);
      if (orders.length >= 9) richOrders.add(orders.at(-2));
    }
    const plans = sites.map((anchor, order) => {
      const obstacle = obstacles[anchor];
      const sides = [1, -1].filter(side => (side > 0 ? obstacle.bottomShape : obstacle.topShape) && (order !== 0 || side > 0));
      const positions = sides.map(side => obstacle.x + cachePocketX(obstacle, side, order === 0));
      return { anchor, order, obstacle, minX: Math.min(...positions), maxX: Math.max(...positions), side: 1, group: 0 };
    });
    const groups = [];
    for (const plan of plans) {
      const previous = plans[plan.order - 1];
      // Any plausible crest placement less than three nominal seconds away
      // belongs to one collection encounter. Its pickups share an edge, so
      // the player never needs an instant roof-to-ground reversal.
      const common = groups.at(-1)?.reduce((sides, member) => sides.filter(side => side > 0 ? member.obstacle.bottomShape : member.obstacle.topShape), [1, -1]) || [];
      if (!previous || (plan.minX - previous.maxX) / speed >= 3
        || !common.some(side => side > 0 ? plan.obstacle.bottomShape : plan.obstacle.topShape)) groups.push([]);
      groups.at(-1).push(plan);
    }
    let previousSide = -1;
    for (const [group, members] of groups.entries()) {
      const common = [1, -1].filter(side => members.every(plan => side > 0 ? plan.obstacle.bottomShape : plan.obstacle.topShape));
      const side = group === 0 && common.includes(1) ? 1 : common.includes(-previousSide) ? -previousSide : common[0];
      for (const plan of members) { plan.side = side; plan.group = group; }
      previousSide = side;
    }
    const pockets = sites.map((anchor, order) => {
      const obstacle = obstacles[anchor];
      const { side, group } = plans[order];
      const rich = richOrders.has(order);
      const pocket = carveCachePocket(obstacle, side, order === 0, rich, height);
      obstacle.cachePocket = { ...pocket, anchor, group };
      return { obstacle, anchor, order, pocket, group };
    });
    for (const { obstacle, anchor, order, pocket, group } of pockets) {
      const shape = pocket.side < 0 ? obstacle.topShape : obstacle.bottomShape;
      const ex = obstacle.x + pocket.localX;
      const edgeY = obstacle.center + pocket.side * obstacle.gap / 2 + terrainEdgeY(shape, pocket.localX);
      // Ordinary fuel teaches a safer approach; rich caches keep the precise niche.
      let clearance = pocket.rich ? 22 : !elite && difficulty === 1 ? 32 : 28;
      let ey;
      const clear = y => obstacles.every(other => ex + 18 < other.x - other.width * .8
        || ex - 18 > other.x + other.width * 2.45 || [-1, 1].every(sign =>
        obstaclePolygons({ ...other, motion: 0, center: other.center + sign * other.motion }).every(polygon => !circleHitsPolygon(ex, y, 18, polygon))));
      for (; clearance <= 37; clearance += 2) {
        ey = clamp(edgeY - pocket.side * (clearance + obstacle.motion), 37, height - 37);
        if (clear(ey)) break;
      }
      // Never slide a failed placement to the centerline. An unusable niche
      // stays empty instead of silently turning into a free floating reward.
      if (!clear(ey)) continue;
      const feature = terrain === 'ruins' ? 'arch-relic' : terrain === 'canopy'
        ? obstacle.soft ? 'thorn-heart' : 'branch-dew' : 'spire-shelter';
      embers.push({ id: `cache-${anchor}`, kind: 'light', x: ex, y: ey, value: pocket.rich ? 3 : 1,
        feature, fuel: true, anchor, pocket: true, pocketSide: pocket.side < 0 ? 'ceiling' : 'ground',
        pocketMouth: pocket.mouth, pocketDepth: pocket.depth, clearance, cacheGroup: group,
        intro: order === 0, collected: false, attracted: false, phase: loot() * TAU });
    }
  }
  // Harmful seeds are extra, optional side-lane encounters. The first
  // ordinary flight introduces exactly one near its middle; practice has its
  // own authored layout. Existing fuel opportunities are never replaced.
  const introductoryDark = stage === 0 && !elite;
  const darkPerLeg = elite || stage >= 6 ? 2 : 1;
  const darkCount = introductoryDark ? 1 : darkPerLeg * legCount;
  if (darkCount) {
    const darkRng = seededRandom(`${seed}:${identity.id}:dark-packets`);
    const candidates = [], scale = height / 620;
    const hardNear = ex => sections.some(section => section.hard
      && ex > section.start - 70 && ex < section.end + 70);
    const bandAt = worldX => {
      let top = 34, bottom = height - 35;
      for (const other of obstacles) {
        const localX = worldX - other.x;
        if (localX < -other.width * .8 || localX > other.width * 2.45) continue;
        // Remain inside the original broad opening, including its complete
        // sway. Later scenery props cannot enter this protected air band.
        const sway = Math.abs(other.motion || 0);
        if (other.topShape) top = Math.max(top, other.center - other.gap / 2 + sway);
        if (other.bottomShape) bottom = Math.min(bottom, other.center + other.gap / 2 - sway);
      }
      return { top, bottom };
    };
    for (const obstacle of obstacles) {
      if (obstacle.hard || obstacle.gap < Math.max(180, height * .35)) continue;
      for (const fraction of [.25, .70, 1.15]) {
        const ex = obstacle.x + obstacle.width * fraction;
        if (ex < Math.min(1000, duration * speed * .25) || ex > duration * speed - 650 || hardNear(ex)) continue;
        const bands = [bandAt(ex - 40), bandAt(ex), bandAt(ex + 40)];
        const top = Math.max(...bands.map(band => band.top)), bottom = Math.min(...bands.map(band => band.bottom));
        if (bottom - top < Math.max(180, 228 * scale)) continue;
        const center = clamp(obstacle.center, top + 74 * scale, bottom - 74 * scale);
        const neighbors = obstacles.filter(other => ex + 24 >= other.x - other.width * .8
          && ex - 24 <= other.x + other.width * 2.45);
        const clear = y => neighbors.every(other => [-1, 1].every(sign =>
          obstaclePolygons({ ...other, motion: 0, center: other.center + sign * Math.abs(other.motion || 0) })
            .every(polygon => !circleHitsPolygon(ex, y, 22, polygon))));
        if (!clear(center)) continue;
        for (const side of [-1, 1]) {
          const ey = center + side * 58 * scale;
          if (ey < top + 31 * scale || ey > bottom - 31 * scale || !clear(ey)) continue;
          // A separate, readable lane: no Dark Spark on a compulsory fuel
          // pickup or its immediate horizontal approach, even in a wide room.
          if (embers.some(ember => Math.hypot(ember.x - ex, ember.y - ey) < 76 * scale
            || Math.abs(ember.x - ex) < 140 && Math.abs(ember.y - ey) < 46 * scale)) continue;
          candidates.push({ x: ex, y: ey, anchor: obstacle.id, pocket: false,
            pocketSide: side > 0 ? 'ground' : 'ceiling', sideLane: true });
        }
      }
    }
    const selected = [];
    for (let i = 0; i < darkCount; i++) {
      const fraction = introductoryDark ? .50 : legCount === 1
        ? darkCount === 1 ? .56 : .40 + i * .32
        : (Math.floor(i / darkPerLeg) + (darkPerLeg === 1 ? .56 : .40 + (i % darkPerLeg) * .32)) / legCount;
      const target = duration * speed * fraction;
      const available = candidates.filter(site => selected.every(other => Math.abs(other.x - site.x) > 480));
      available.sort((a, b) => Math.abs(a.x - target) - Math.abs(b.x - target));
      if (!available.length) continue;
      const site = available[0]; selected.push(site);
      embers.push({ ...site, id: `dark-${i}`, kind: 'dark', harmful: true, manualOnly: true,
        value: 0, fuel: false, feature: 'dark-side-lane',
        collected: false, attracted: false, phase: darkRng() * TAU });
    }
  }
  // Reuse optional side-lane slots, never the route's existing fuel opportunities.
  const niches = embers.filter(packet => pickupKind(packet) === 'dark');
  if (niches.length > 1 && ascent.level > 1) {
    const utilityRng = seededRandom(`${seed}:${terrain}:${stage}:niche-kinds`);
    const keepDark = Math.floor(utilityRng() * niches.length);
    const darkSlots = new Set([keepDark]);
    const retained = Math.min(niches.length,elite?3:2);
    for(let i=1;i<retained;i++)darkSlots.add((keepDark+Math.floor(i*niches.length/retained))%niches.length);
    const pool = ascent.level >= 4 ? ['cluster', 'charge', 'sight', 'dusk']
      : ascent.level >= 3 ? ['cluster', 'charge', 'sight'] : ['cluster', 'charge'];
    const offset = Math.floor(utilityRng() * pool.length) + ['ruins', 'canopy', 'storm'].indexOf(terrain);
    let utilityIndex = 0;
    niches.forEach((packet, i) => {
      if (darkSlots.has(i)) return;
      const kind = pool[(offset + utilityIndex++) % pool.length], spec = getPickupSpec(kind);
      Object.assign(packet, { kind, harmful: false, manualOnly: spec.manualOnly,
        value: 0, fuel: spec.fuel > 0, feature: `${kind}-niche` });
    });
  }
  const sceneProps = populateSceneProps({ obstacles, embers, terrain, height, seed,
    totalDistance: duration * speed, scene: identity.scene, circleHitsPolygon });
  // Both renderers and the collection broad phase rely on world-X ordering.
  embers.sort((a, b) => a.x - b.x);
  const layout = { obstacles, embers, sections, sceneProps, levelIdentity: identity, ascent, lengthScale: legCount,
    legs: legs.map(leg => ({ ...leg, hardWindows: sections.filter(section => section.hard && section.leg === leg.index).length })),
    requestedHardWindowsPerLeg: requestedWindows, requestedHardWindows: requestedWindows * legCount,
    hardWindows: sections.filter(section => section.hard).length };
  finalizeFlightChallenges(layout,{terrain,basic:stage===0&&!elite&&mapIndex===0&&difficulty<=1});
  addAccessibleGlow(layout,{duration,speed,height,elite,difficulty,stage,passage});
  installRiskChains(layout,{duration,speed,height,elite,difficulty,stage,mapIndex},(x,y,radius)=>
    y>radius+12&&y<height-radius-12&&obstacles.every(o=>x+radius<o.x-o.width*.8||x-radius>o.x+o.width*2.45
      ||[-1,1].every(sign=>!circleHitsObstacle(x,y,radius,o,0,o.center+sign*Math.abs(o.motion||0)))));
  return layout;
}

// Extra recovery lights sit in generous, swept-clear air, away from warning pickups.
function addAccessibleGlow(layout,{duration,speed,height,elite,difficulty,stage,passage}){
  if(duration<30)return;
  const fuel=layout.embers.filter(p=>getPickupSpec(p).fuel>0&&!p.generated&&pickupKind(p)!=='dusk');
  const gentle=!elite&&difficulty===1, easy=gentle&&(stage<=2||passage==='open');
  const wanted=Math.min(Math.ceil(fuel.length*(elite?.15:easy?.70:gentle?.50:.30)),Math.max(1,Math.floor(duration/(easy?5:gentle?8:12))));
  let placed=0;
  for(let i=0;i<wanted;i++){
    const target=800+(duration*speed-1400)*(i/Math.max(1,wanted-1));
    let found=false;
    for(const offset of [0,80,-80,160,-160,240,-240]){
      const x=target+offset;if(x<720||x>duration*speed-500)continue;
      if(layout.embers.some(p=>getPickupSpec(p).fuel>0&&Math.abs(p.x-x)<speed*(easy?.9:1.5)))continue;
      const near=layout.obstacles.filter(o=>x+50>=o.x-o.width&&x-50<=o.x+o.width*2.5);
      const heights=gentle?[height*.5,height*.47,height*.53,...near.map(o=>Math.max(height*.34,Math.min(height*.66,o.center)))]:[height*.5,...near.map(o=>o.center),height*.42,height*.58];
      for(const y of heights){
        if(y<65||y>height-65||layout.embers.some(p=>getPickupSpec(p).dim>0&&Math.hypot(p.x-x,p.y-y)<160))continue;
        const clear=near.every(o=>[-1,1].every(side=>!circleHitsObstacle(x,y,48,o,0,o.center+side*Math.abs(o.motion||0))));
        if(!clear)continue;
        layout.embers.push({id:'sheltered-glow-'+placed++,kind:'light',x,y,value:1,fuel:true,feature:'sheltered-glow',accessible:true,clearance:48,collected:false,attracted:false,phase:i*1.7});found=true;break;
      }
      if(found)break;
    }
  }
  layout.embers.sort((a,b)=>a.x-b.x);layout.accessibleGlowAdded=placed;
}

function roundedRect(ctx, x, y, w, h, r = 8) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y); ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius); ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export class WispFlight {
  constructor(options = {}) {
    if (!options.canvas) throw new Error('WispFlight needs a canvas.');
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('A Canvas 2D context is unavailable.');
    this.companions = Object.freeze(normalizeCompanionFleet(options.companions, options.companionRole));
    this.companionRole = this.companions[0];
    this.options = {...options,companions:this.companions,companionRole:this.companionRole};
    this.companionAbility = getCompanionAbility(this.companionRole);
    this.terrain = ['ruins', 'canopy', 'storm'].includes(options.terrain) ? options.terrain : 'ruins';
    this.elite = Boolean(options.elite);
    this.seed = options.seed ?? 1;
    const route = options.node || options;
    this.lengthScale = getLevelLengthScale(route);
    this.duration = clamp(Number(options.duration) || LEVEL_LENGTH.defaultDuration, 15, LEVEL_LENGTH.maximumDuration);
    this.levelIdentity = resolveLevelIdentity(route.levelId, this.terrain, this.seed);
    this.locationName = route.locationName || this.levelIdentity.name;
    this.tutorial = createTutorialState(route);
    this.bossEncounter = !this.tutorial && route.boss === true;
    this.ascentInfo = getAscentInfo(route, Boolean(this.tutorial));
    this.openingSpeedScale=!this.tutorial&&!this.bossEncounter&&!this.elite&&this.ascentInfo.difficulty===1&&Number(route.mapIndex||0)===0?.92:1;
    this.easyOpening=!this.tutorial&&!this.bossEncounter&&!this.elite&&this.ascentInfo.difficulty===1&&Number(route.mapIndex||0)===0&&Number(route.row||0)<=2;
    if(this.easyOpening){this.duration=Math.max(30,this.duration*.65);this.openingSpeedScale=.85;}
    this.tutorialAwaitingLift = Boolean(this.tutorial);
    this.passage = ['open', 'cavern', 'gauntlet'].includes(route.passage) ? route.passage : 'open';
    this.fuelCadence = clamp(Number(route.fuelCadence) || 3, 2, 4);
    this.fuelBonus = clamp(Number(route.fuelBonus) || 0, 0, 10);
    this.flameDrain = clamp(Number(route.flameDrain) || 1, .8, 1.2);
    this.routeReward = clamp(Number(route.routeReward) || 1, 1, 1.5);
    this.totalDistance = this.duration * FLIGHT_TUNING.forwardSpeed;
    this.cards = new Set(options.cards || []);
    this.mod = { gravity: 1, flap: 1, speed: 1, attract: 1,
      boostCooldown: 1, boostDuration: 1, reward: 1, cacheFuelBonus: 0,
      warmCore: false, windSensitivity: 1, flapCost: 1, steady: false, ...options.modifiers };
    this.onboardingPlan=this.mod.onboardingPlan?.enabled?{...this.mod.onboardingPlan}:null;
    // Intro difficulty belongs to the route, not tutorial memory or TEST state.
    if(this.easyOpening)this.onboardingPlan={...(this.onboardingPlan||{}),enabled:true,gentleOpening:true,drafts:false,interactiveScenery:false,specialSparks:false,badSparks:false,blackHoles:false};
    this.fleet = [{role:this.companionRole,remaining:0,cooldown:0,startedAt:-1000}];
    this.hasActiveCompanions = !this.companionAbility.passive;
    this.shield = { charges: this.hasCompanion('protector') ? clamp(Math.round(Number(this.mod.protectorLayers) || 1), 1, 2) : 0,
      layers: this.hasCompanion('protector') ? clamp(Math.round(Number(this.mod.protectorLayers) || 1), 1, 2) : 0,
      recovery: 0, recoveryTotal: clamp(Number(this.mod.protectorRecovery) || 14, 4, 30), hitFlash: 0, protection: 0 };
    this.levelTargetY = null; this.levelDive = 0; this.purifyCooldown = 0;
    this.levelCharge = this.roleDuration('leveler'); this.liftHeld = false; this.liftHeldAt = 0; this.levelExhausted = false; this.levelUseCredit = 0; this.kindlerPulse = 0;
    this.dying = false; this.dyingAge = 0; this.dyingDuration = .6; this.deathCause = null;
    this._obstacleCursor = 0; this._pickupCursor = 0; this._pickupCount = 0;
    this._nearbyPackets = []; this._nearbyPacketsUntil = -1; this._auraUntil = -1; this._collectorAura = null;
    this.alive = true;
    this.flame = clamp(Number.isFinite(options.flame) ? options.flame : FLAME_TUNING.starting, 0, this.maxFlame);
    this.condensedStart=Math.max(0,Math.floor(Number(options.condensedGlow)||0));
    this.condensedGlow=0;this.condensedRemainder=clamp(Number(options.condensedRemainder)||0,0,.999999999);
    this.pickupOverflow=0;this.condensationFlow={amount:0,rawAmount:0,time:-Infinity,count:0,total:0};
    this.nightGardenCount=0; this.dreamCompleted=false; this.secondDawnUsed=false;
    this.flaps = 0; this.effortSpent = 0; this.flameRestored = 0; this.bodyFuelCollected = 0;
    this.burdenLiftsRemaining=Math.max(0,Math.floor(this.mod.burdenLifts||0));
    this.lastFlapTime = -1000;
    this.onUpdate = options.onUpdate || (() => {});
    this.onFinish = options.onFinish || (() => {});
    this.onPause = options.onPause || (() => {});
    this.width = 390; this.height = 620; this.pixelRatio = 1;
    this.time = 0; this.distance = 0; this.accumulator = 0; this.lastFrame = 0; this.nextRenderAt = null;
    this.resumeRampSeconds=RESUME_RAMP_SECONDS; this.resumeElapsed = RESUME_RAMP_SECONDS; this.resumeHudClock = 0;
    this.running = false; this.paused = false; this.finished = false; this.destroyed = false;
    this.completing=false;this.completionAge=0;
    this.raf = null; this.score = 0; this.baseEmbers = 0; this.bonusEmbers = 0; this.collisions = 0;
    this.boosts = 0; this.boostTime = 0; this.cooldown = 0;
    this.abilityTime = 0; this.abilityStartedAt = -1000; this.levelRecovery = 0;
    this.exitProtection = 0; this.flash = 0; this.shake = 0;
    this.event = ''; this.eventUntil = 0; this.updateClock = 0;
    this.nearMisses = 0; this.destroyedThorns = 0; this.gustSeconds = 0;
    this.stormFeedClock = 0; this.warmCoreUsed = false;
    this.particles = []; this.trail = []; this.pickupEffects = []; this.emitClock = 0;
    this.absorptionEffects = []; this.absorptionSequence = 0;
    this.lightPenalties = []; this.lightDimming = 0; this.sightUntil = 0;
    this.mainSeerStartedAt=-Infinity;this.mainSeerUntil=0;this.mainSeerReadyAt=0;
    this.pickupRevealStartedAt = -Infinity; this.pickupRevealHoldUntil = -Infinity; this.pickupRevealFrom = 0;
    this.wispBoost = 0;
    this.cosmeticRng = seededRandom(`${this.seed}:cosmetics`);
    this.artifactEffects=new ArtifactEffects(this);
    this.edgingPulse=new EdgingPulse(this);
    this.rigImage = null; this.background = null;
    this.audio = null; this.muted = false; this.lastFlapSound = 0;
    this.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._resizeRaf = null;
    this._resize = () => {
      if (this.destroyed || this._resizeRaf !== null) return;
      this._resizeRaf = requestAnimationFrame(() => {
        this._resizeRaf = null;
        if (!this.destroyed) this.resize();
      });
    };
    this._visibility = () => {
      if (typeof document !== 'undefined' && document.hidden && this.running && !this.paused) this.pause(true);
    };
    this._orientation = () => { if (this.running && !this.paused) this.pause(true); this._resize(); };
    this.resize();
    this.player = { x: this.playerScreenX, y: this.height * .5, vy: 0, radius: 11 * .85 };
    // Reframe the same world position. Arrival times and the authored course
    // stay identical while the orb clears the landscape HUD and safe inset.
    this.distanceOrigin=98-this.player.x;this.distance=this.distanceOrigin;
    this.wisp = new WispCompanion(wispHome(this.player, this.time));
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    this.visualBank = 0; this.wingPhase = 0;
    this.layout = this.tutorial
      ? buildTutorialLayout({ lesson: this.tutorial.lesson, duration: this.duration,
        height: this.height, speed: FLIGHT_TUNING.forwardSpeed })
      : this.bossEncounter ? buildBossLayout({ seed: this.seed, terrain: this.terrain,
        elite: this.elite, duration: this.duration, speed: FLIGHT_TUNING.forwardSpeed,
        height: this.height, gapScale: this.ascentInfo.hardGapScale,
        difficulty: this.ascentInfo.difficulty, levelIdentity: this.levelIdentity, circleHitsPolygon,bossId:route.bossId })
      : buildFlightLayout({ seed: this.seed, terrain: this.terrain,
        elite: this.elite, duration: this.duration, speed: FLIGHT_TUNING.forwardSpeed, height: this.height,
        passage: this.passage, fuelCadence: this.fuelCadence,
        levelId: this.levelIdentity.id, stage: this.ascentInfo.row,
        difficulty: this.ascentInfo.difficulty, mapIndex:Number(route.mapIndex)||0, lengthScale: this.lengthScale,encounterFamily:this.onboardingPlan?.gentleOpening?null:route.encounterFamily,gentleOpening:!!this.onboardingPlan?.gentleOpening });
    this.totalDistance = flightEndDistance(this.layout, this.player.x, this.totalDistance,{height:this.height});
    this.layout.embers = this.layout.embers.filter(packet => packet.x <= this.totalDistance + this.player.x - 24);
    if(this.layout.boss)this.layout.boss.exitStart=this.totalDistance+this.player.x-FLIGHT_TUNING.forwardSpeed;
    this.drafts = new DraftField({ seed: this.seed, terrain: this.terrain, elite: this.elite,
      duration: this.duration, height: this.height, totalDistance: this.totalDistance,
      layout: this.layout, lesson: this.tutorial?.lesson || null, lengthScale: this.lengthScale });
    if(!this.tutorial&&!this.bossEncounter&&this.onboardingPlan?.drafts!==false)installAuthoredDraftCrossings(this.layout,this.drafts,{
      seed:this.seed,terrain:this.terrain,elite:this.elite,duration:this.duration,height:this.height,totalDistance:this.totalDistance});
    if(!this.tutorial&&!this.bossEncounter&&!this.onboardingPlan?.gentleOpening)installEncounterFamily(this.layout,this.drafts,{
      node:route,height:this.height,seed:this.seed,speed:FLIGHT_TUNING.forwardSpeed,circleHitsObstacle,circleHitsPolygon});
    // A snare is a readable steering choice, not a forced gust into its seed.
    if(this.layout.riskChains?.length)this.drafts.zones=this.drafts.zones.filter(zone=>
      this.layout.riskChains.every(chain=>zone.x+zone.rx<chain.start-140||zone.x-zone.rx>chain.end+140));
    ensureGlowBudget(this.layout,{duration:(this.totalDistance-this.distanceOrigin)/(FLIGHT_TUNING.forwardSpeed*(this.openingSpeedScale||1)),height:this.height,
      difficulty:this.ascentInfo.difficulty,mapIndex:Number(route.mapIndex)||0,
      endX:this.totalDistance+this.player.x,tutorial:!!this.tutorial,drafts:this.drafts.zones,
      clear:(x,y,r)=>y>r+28&&y<this.height-r-28&&this.layout.obstacles.every(o=>o.destroyed
        ||x+r<o.x-o.width||x-r>o.x+o.width*2.5
        ||[-1,1].every(sign=>!circleHitsObstacle(x,y,r,o,0,o.center+sign*Math.abs(o.motion||0))))});
    installFlightForks(this.layout,{height:this.height,seed:this.seed,terrain:this.terrain,
      endX:this.totalDistance+this.player.x,tutorial:!!this.tutorial,boss:this.bossEncounter,
      drafts:this.drafts.zones,circleHitsObstacle});
    this.biomeDynamics = new BiomeDynamics(this);
    this.blackHoles = new BlackHoles(this);
    if(this.onboardingPlan){
      const plan=this.onboardingPlan;
      this.layout.embers=this.layout.embers.filter(packet=>{
        const spec=getPickupSpec(packet);
        if(plan.badSparks===false&&spec.dim>0)return false;
        if(plan.specialSparks===false&&!(spec.fuel>0&&spec.dim===0))return false;
        return true;
      });
      if(plan.badSparks===false)this.layout.riskChains=[];
      if(plan.interactiveScenery===false)this.biomeDynamics.items=[];
      if(plan.drafts===false)this.drafts.zones=[];
      if(plan.blackHoles===false)this.blackHoles.items=[];
    }
    this.challengeDirector=new FlightChallengeDirector(this.layout);
    this.flightChallenge=null;this.caveDimming=0;
    this.challengeIndex = Math.floor(seededRandom(`${this.seed}:challenge`)() * 3);
    this.challengeId = options.challengeId || options.node?.challengeId || ['wisps', 'clean', 'boosts'][this.challengeIndex];
    this.challengeTarget = Number(options.challengeTarget ?? options.node?.challengeTarget) || (this.challengeId === 'wisps' ? 7 : this.challengeId === 'boosts' ? 2 : 0);
    this.challengeText = this.challengeId === 'wisps' || this.challengeId === 'boosts' && !this.hasActiveCompanions
      ? `Collect ${this.challengeTarget} light packets`
      : this.challengeId === 'boosts' ? `Use your ability ${this.challengeTarget} times` : 'Finish without a hit';
    this.stars = Array.from({ length: 45 }, () => ({ x: this.cosmeticRng() * this.width,
      y: this.cosmeticRng() * this.height * .57, size: .4 + this.cosmeticRng() * 1.1,
      phase: this.cosmeticRng() * TAU }));
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._resize);
      window.addEventListener('orientationchange', this._orientation);
      document.addEventListener('visibilitychange', this._visibility);
    }
    this.loadImage(options.assets?.phoenixRig, 'rigImage');
    this.loadImage(options.assets?.background, 'background');
    this.render();
    this.notify();
    this.ready = typeof window !== 'undefined' && this.canvas.ownerDocument ? this.initPixelView() : Promise.resolve(false);
  }

  async initPixelView() {
    try {
      const { WispFlightView } = await import('./wisp-renderer.mjs?v=gentler-opening-1');
      if (this.destroyed) return;
      this.pixiView = new WispFlightView(this);
      const initialized = await this.pixiView.init();
      if (this.destroyed) { this.pixiView.destroy(); return; }
      this.pixiReady = initialized !== false && this.pixiView.ready !== false;
      this.pixiView.resize();
      this.render(); this.notify();
    } catch (error) {
      this.rendererError = error?.message || 'Pixel renderer unavailable';
      this.pixiReady = false;
      this.pixiView?.destroy();
      this.pixiView = null;
    }
  }

  get scaleY() { return this.height / 620; }
  get baseSpeed() { return FLIGHT_TUNING.forwardSpeed * (this.openingSpeedScale||1) * clamp(Number(this.mod.speed) || 1, .80, 1.25) * (this.elite ? 1.045 : 1); }
  hasCompanion(role) { return this.companionRole===role; }
  roleDuration(role) {
    const key = `${role}Duration`, value = Number(this.mod[key]);
    return Number.isFinite(value) ? clamp(value, 0, 15) : getCompanionAbility(role).duration * clamp(Number(this.mod.boostDuration) || 1, .5, 2.5);
  }
  roleCooldown(role) {
    const key = `${role}Recovery`, value = Number(this.mod[key]);
    return Number.isFinite(value) ? clamp(value, 1, 40) : getCompanionAbility(role).cooldown * clamp(Number(this.mod.boostCooldown) || 1, .35, 2);
  }
  get abilityDuration() { return Math.max(0, ...this.fleet.map(item => this.roleDuration(item.role))); }
  get abilityCooldown() { return Math.max(0, ...this.fleet.filter(item => !getCompanionAbility(item.role).passive).map(item => this.roleCooldown(item.role))); }
  get boostDuration() { return this.abilityDuration; }
  get boostCooldown() { return this.abilityCooldown; }
  get maxFlame() { return clamp(Number(this.mod.maxGlow)||100,100,200); }
  get availableGlow() { return this.flame; }
  get condensedTotal() { return this.condensedStart+this.condensedGlow; }
  spendGlow(amount) { this.flame=Math.max(0,this.flame-Math.max(0,amount)); }

  get flapCost() { return ((Number.isFinite(this.mod.liftCostPoints)?Math.max(1,Math.round(this.mod.liftCostPoints)):Math.max(1,Math.round(3*(Number(this.mod.flapCost)||1))))+Number(this.burdenLiftsRemaining>0))/.3; }
  get completionProgress() { return clamp(this.completionAge / 1.5,0,1); }

  get dyingProgress() { return clamp(this.dyingAge / this.dyingDuration,0,1); }
  get wingRate() { return this.boostTime > 0 ? 9 : this.availableGlow + 1e-7 < this.flapCost && !this.dream?.freeGlow && !this.artifactEffects.freeLift ? .45 : 5.8; }

  loadImage(url, property) {
    if (!url || typeof Image === 'undefined') return;
    const img = new Image();
    img.onload = () => { if (!this.destroyed) { this[property] = img; if (!this.running || this.paused) this.render(); } };
    img.onerror = () => {};
    img.src = url;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || 390), cssHeight = Math.max(1, rect.height || 620);
    const pixelRatio = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    // Keep the same short-screen vertical physics while revealing more world
    // horizontally. The old fixed 390-unit width stretched every object on a
    // landscape canvas and made collision rings disagree with visible shapes.
    const landscape = cssWidth > cssHeight;
    const height = landscape ? 430 : clamp(390 * cssHeight / cssWidth, 430, 850);
    const width = landscape ? height * cssWidth / cssHeight : 390;
    // Reserve the entire light HUD rail, including the adjacent Edging meter.
    const gauges=this.canvas.ownerDocument?.querySelectorAll?.('.glow-side-gauge,.edging-pulse-gauge')||[];
    let gaugeRight=0;for(const gauge of gauges){const box=gauge.getBoundingClientRect?.();if(box?.width>0)gaugeRight=Math.max(gaugeRight,box.right-(rect.left||0));}
    const gaugeClearance=gaugeRight>0?(gaugeRight+32)*width/cssWidth:0;
    const playerScreenX=landscape?Math.min(width*.38,Math.max(190,gaugeClearance)):98;
    const pixelWidth = Math.round(cssWidth * pixelRatio), pixelHeight = Math.round(cssHeight * pixelRatio);
    if (this._canvasSized && this.canvas.width === pixelWidth && this.canvas.height === pixelHeight
      && this.width === width && this.height === height && this.pixelRatio === pixelRatio&&this.playerScreenX===playerScreenX) return;
    // Mobile address bars can move by a few pixels while flying. Keep one
    // committed world/backing size through those height-only changes; the
    // canvas and pixel overlay both scale to their container in CSS. Compare
    // against the committed height, so repeated small changes cannot drift.
    if (this._canvasSized && this.running && !this.paused && !this.finished
      && cssWidth === this._committedCssWidth && pixelRatio === this.pixelRatio&&this.playerScreenX===playerScreenX
      && Math.abs(cssHeight - this._committedCssHeight) <= Math.min(64, this._committedCssHeight * .1)) {
      this.viewportJitterSkips = (this.viewportJitterSkips || 0) + 1;
      return;
    }
    this._canvasSized = true;
    this._committedCssWidth = cssWidth; this._committedCssHeight = cssHeight;
    const oldHeight = this.height;
    this.width = width; this.height = height; this.landscape = landscape;
    this.playerScreenX=playerScreenX;
    if(this.player){
      const nextX=this.playerScreenX,shift=nextX-this.player.x;
      if(shift){
        this.player.x=nextX;this.distance-=shift;this.previousDistance-=shift;this.distanceOrigin-=shift;this.totalDistance-=shift;
        if(Number.isFinite(this.renderDistance))this.renderDistance-=shift;
        if(this.wisp){this.wisp.x+=shift;this.wisp.previousX+=shift;this.wisp.orbitHome.x+=shift;if(this.wisp.lastDistance!==null)this.wisp.lastDistance-=shift;}
        for(const effect of [...this.particles,...this.pickupEffects])effect.x+=shift;
        this._auraUntil=-1;this._collectorAura=null;
      }
    }
    this._nearbyPacketsUntil = -1;
    if(this.projection)this.projection.nextAt=-Infinity;
    this.pixelRatio = pixelRatio;
    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    this.ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
    if (this.player && oldHeight !== this.height) {
      const factor = this.height / oldHeight;
      this.player.y *= factor; this.player.vy *= factor;
      if (this.levelTargetY !== null) this.levelTargetY *= factor;
      this._auraUntil = -1; this._collectorAura = null;
      this.previousPlayerY = this.player.y;
      this.layout.obstacles.forEach(o => {
        o.center *= factor; o.gap *= factor; o.motion *= factor;
        for (const shape of [o.topShape, o.bottomShape]) if (shape) shape.forEach(point => { point[1] *= factor; });
        for (const prop of o.sceneProps || []) for (const part of prop.parts)
          for (const point of part.polygon) point[1] *= factor;
      });
      this.layout.embers.forEach(e => {
        e.y *= factor;
        if (e.pullY !== undefined) e.pullY *= factor;
        if (Number.isFinite(e.gravityVy)) e.gravityVy *= factor;
      });
      this.drafts?.resize(factor);
      resizeFlightForks(this.layout,factor);
      this.biomeDynamics?.rescale(factor);
      this.blackHoles?.resize(factor);
      this.stars.forEach(s => { s.y *= factor; });
      this.particles.length = 0;
      this.wisp.resizeY(factor);
      this.pickupEffects.length = 0;
      this.absorptionEffects.length = 0;
      this.trail.length = 0;
    }
    if (this.player && (!this.running || this.paused)) this.render();
    this.pixiView?.resize();
  }

  start({paused = false} = {}) {
    if (this.destroyed || this.finished || this.running) return;
    this.running = true; this.paused = paused; this.lastFrame = 0; this.nextRenderAt = null;
    this.artifactEffects.onStart();
    this.notify();
    if (!paused) this.raf = requestAnimationFrame(t => this.tick(t));
    else this.render();
  }

  flap() {
    if (!this.running || this.paused || this.finished || !this.alive || this.dying || this.completing) return false;
    if (!this.dream?.freeGlow && !this.artifactEffects.freeLift && this.availableGlow + 1e-7 < this.flapCost) {
      this.setEvent('Not enough Sparks · find a Spark'); this.notify();
      return false;
    }
    this.cancelLeveler(true); this.levelDive = 0;
    // Dream inputs already cost nothing; preserve the stored Lift for waking.
    const freeLift=!this.dream?.freeGlow&&this.artifactEffects.consumeLift();
    const effort=this.dream?.freeGlow||freeLift?0:this.flapCost;this.spendGlow(effort);
    if(effort>0&&this.burdenLiftsRemaining>0)this.burdenLiftsRemaining--;
    this.artifactEffects.onFlap(effort>0);
    this.flaps++; this.effortSpent += effort;
    this.lastFlapTime = this.time;
    this.player.vy = -FLIGHT_TUNING.flapImpulse * this.scaleY * clamp(Number(this.mod.flap) || 1, .80, 1.20);
    if (this.tutorialAwaitingLift) {
      this.tutorialAwaitingLift = false;
      this.accumulator = 0; this.lastFrame = 0; this.nextRenderAt = null;
    }
    this.burst(this.player.x - 10, this.player.y + 7, 5, '#ffbd53');
    this.sound('flap');
    this.notify();
    return true;
  }

  beginLiftInput() {
    if (!this.running || this.paused || this.finished || this.dying || this.completing || this.liftHeld) return false;
    const lifted = this.flap();
    this.liftHeld = true; this.liftHeldAt = this.time; this.levelExhausted = false;
    return lifted;
  }

  endLiftInput(cancelled = false) {
    this.liftHeld = false; this.levelExhausted = false;
    this.cancelLeveler(cancelled); this.syncFleetTimers();
  }

  updateLeveler(dt) {
    const item = this.fleet.find(item => item.role === 'leveler');
    if (!item) return;
    const capacity = this.roleDuration('leveler');
    const held = this.liftHeld && this.time - this.liftHeldAt >= .18 && !this.levelExhausted;
    if (held && item.remaining <= 0 && this.levelCharge > .08) {
      this.levelTargetY = this.player.y; this.player.vy *= .25;
      this.levelRecovery = 0; this.levelDive = 0; item.startedAt = this.time;
      item.remaining = this.levelCharge;
      this.artifactEffects.onWork();
      this.artifactEffects.notice('hollow-bell','passive');
    }
    if (held && item.remaining > 0) {
      const spent=Math.min(this.levelCharge,dt);this.levelUseCredit+=spent;
      if(this.levelUseCredit>=capacity-.00001){this.boosts++;this.levelUseCredit=Math.max(0,this.levelUseCredit-capacity);}
      this.levelCharge = Math.max(0, this.levelCharge - dt);
      if (this.levelCharge <= 0) { this.cancelLeveler(false); this.levelExhausted = true; }
      else item.remaining = this.levelCharge;
    } else if (!this.liftHeld) {
      this.levelCharge = Math.min(capacity, this.levelCharge + dt * capacity / this.roleCooldown('leveler'));
    }
    item.cooldown = (1 - this.levelCharge / Math.max(.001, capacity)) * this.roleCooldown('leveler');
  }

  activateAbility() {
    if (!this.running || this.paused || this.finished || !this.alive || this.dying || this.completing || this.tutorialAwaitingLift) return false;
    const item=this.fleet[0];
    if(item.role==='leveler'||this.companionAbility.passive||item.cooldown>.001||item.remaining>0)return false;
    item.remaining=this.roleDuration(item.role);item.cooldown=this.roleCooldown(item.role);item.startedAt=this.time;
    if(item.role==='swift'){this.player.vy*=.65;this.artifactEffects.notice('storm-knot','passive');}
    this.abilityStartedAt=this.time;this.boosts++;this.syncFleetTimers();
    this.artifactEffects.onWork();this.setEvent(this.companionAbility.name);
    this.burst(this.player.x - 10, this.player.y, 8, '#e6e4d3');
    this.sound('boost');
    this.notify();
    return true;
  }

  boost() { return this.activateAbility(); }

  pause(fromSystem = false) {
    if (!this.running || this.paused || this.finished || this.destroyed || this.dying) return;
    this.endLiftInput(true); this.paused = true; this.lastFrame = 0; this.nextRenderAt = null;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null; this.notify(); this.onPause({ fromSystem });
  }

  resume() {
    if (!this.running || !this.paused || this.finished || this.destroyed) return;
    this.paused = false; this.lastFrame = 0; this.accumulator = 0; this.nextRenderAt = null;
    this.resumeElapsed = 0; this.resumeHudClock = 0;
    this.raf = requestAnimationFrame(t => this.tick(t));
    this.notify();
  }

  get resumeRemaining() { return Math.max(0, this.resumeRampSeconds - this.resumeElapsed); }

  get resumeScale() {
    const progress = clamp(this.resumeElapsed / this.resumeRampSeconds, 0, 1);
    return .1 + .9 * progress;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.muted && this.audio?.state === 'running') this.audio.suspend().catch(() => {});
  }

  destroy() {
    this.destroyed = true; this.running = false;
    this.projection = null;
    this.absorptionEffects.length = 0;
    this.lightPenalties.length = 0;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    if (this._resizeRaf !== null) { cancelAnimationFrame(this._resizeRaf); this._resizeRaf = null; }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._resize);
      window.removeEventListener('orientationchange', this._orientation);
      document.removeEventListener('visibilitychange', this._visibility);
    }
    if (this.audio) this.audio.close().catch(() => {});
    this.pixiView?.destroy();
    this.pixiView = null;
    for(const canvas of [this.fallbackFog,this.fallbackMask])if(canvas)canvas.width=canvas.height=1;
    this.fallbackFog=this.fallbackMask=null;
    this.particles.length = 0;
    this.trail.length = 0;
  }

  tick(timestamp) {
    if (!this.running || this.paused || this.destroyed || this.finished) return;
    if (!this.lastFrame) this.lastFrame = timestamp;
    const realElapsed = Math.max(0, (timestamp - this.lastFrame) / 1000);
    const elapsed = Math.min(.10, realElapsed);
    this.lastFrame = timestamp;
    const resuming = this.resumeRemaining > 0, previousScale = this.resumeScale;
    if (resuming) this.resumeElapsed = Math.min(this.resumeRampSeconds, this.resumeElapsed + realElapsed);
    // The ramp follows wall time; a late frame can never queue more than the
    // existing six fixed physics steps. Average scale avoids an abrupt first step.
    const scaledElapsed = elapsed * (resuming ? (previousScale + this.resumeScale) * .5 : 1);
    if (resuming) this.resumeHudClock += realElapsed;
    const updateResumeHud = resuming && (this.resumeHudClock >= .1 || this.resumeRemaining === 0);
    if (this.tutorialAwaitingLift) {
      this.accumulator = 0;
      this.renderScheduledFrame(timestamp);
      if (updateResumeHud) { this.resumeHudClock %= .1; this.notify(); }
      this.raf = requestAnimationFrame(t => this.tick(t));
      return;
    }
    this.accumulator = Math.min(this.accumulator + scaledElapsed, STEP * 6);
    while (this.accumulator >= STEP && !this.finished && !this.paused) {
      this.step(STEP); this.accumulator -= STEP;
    }
    if (this.finished || this.destroyed) return;
    this.renderScheduledFrame(timestamp);
    if (updateResumeHud) { this.resumeHudClock %= .1; this.notify(); }
    if (!this.finished && !this.destroyed && !this.paused) this.raf = requestAnimationFrame(t => this.tick(t));
  }

  renderScheduledFrame(timestamp) {
    // Keep physics/input on every RAF, but do not repaint the same 60Hz game
    // four times on a 240Hz display. Preserve the deadline phase on 90/120Hz
    // displays and after late frames, rather than accumulating interval drift.
    if (this.nextRenderAt === null) this.nextRenderAt = timestamp;
    const tolerance = .01;
    if (timestamp + tolerance < this.nextRenderAt) return false;
    const intervals = Math.floor((Math.max(0, timestamp - this.nextRenderAt) + tolerance) / RENDER_INTERVAL_MS) + 1;
    this.nextRenderAt += intervals * RENDER_INTERVAL_MS;
    this.render();
    return true;
  }

  getDraftPuffs(time = this.time) { return this.drafts?.visible(time) || []; }

  gustState() {
    return this.drafts.sample(this.time, this.distance + this.player.x,
      this.player.y, (Number(this.mod.windSensitivity) || 1) * (this.ascentInfo.draftForceScale || 1));
  }

  obstacleCenter(obstacle) {
    return obstacle.center + Math.sin(this.time * .9 + obstacle.phase) * obstacle.motion;
  }

  getWispState(y = this.player.y, time = this.time) {
    return this.wisp.state(this, y, time);
  }

  syncFleetTimers() {
    this.abilityTime = Math.max(0, ...this.fleet.map(item => item.remaining));
    this.boostTime = this.fleet.find(item => item.role === 'swift')?.remaining || 0;
    const active = this.fleet.filter(item => !getCompanionAbility(item.role).passive);
    this.cooldown = active.length ? Math.min(...active.map(item => item.cooldown)) : 0;
  }

  cancelLeveler(fromLift = false) {
    const leveler = this.fleet.find(item => item.role === 'leveler');
    if (!leveler || leveler.remaining <= 0) return;
    leveler.remaining = 0; this.levelRecovery = .25;
    this.levelDive = !fromLift && Number(this.mod.levelerDive) > 0 ? .5 : 0;
    this.syncFleetTimers();
  }

  getAbilityState() {
    const records = this.fleet.filter(item => item.role !== 'leveler' && !getCompanionAbility(item.role).passive);
    const release = false;
    const usable = this.running && this.alive && !this.paused && !this.finished && !this.destroyed && !this.dying && !this.completing && !this.tutorialAwaitingLift;
    const ready = usable && (release || records.some(item => item.cooldown <= .001 && item.remaining <= 0));
    const next = records.reduce((best,item) => !best || item.cooldown < best.cooldown ? item : best, null);
    const remaining = Math.max(0,...records.map(item => item.remaining));
    const duration = Math.max(0,...records.map(item => this.roleDuration(item.role)));
    const cooldown = next?.cooldown || 0, cooldownTotal = next ? this.roleCooldown(next.role) : 0;
    const label=this.companionAbility.label;
    return { id: this.companionRole, role: this.companionRole, roles: this.companions,
      label, action: 'power', passive: !records.length, collects: this.hasCompanion('collector'),
      active: remaining > 0, ready, release, remaining, duration, cooldown, cooldownTotal,
      progress: !records.length || ready ? 1 : clamp(1 - cooldown / Math.max(.001,cooldownTotal),0,1) };
  }

  getCompanionStates(y = this.player.y, time = this.time) {
    if (!this._companionViews) this._companionViews = this.fleet.map(() => ({}));
    const live = this.running && this.alive && !this.paused && !this.finished && !this.dying && !this.completing && !this.tutorialAwaitingLift;
    for (let i=0;i<this.fleet.length;i++) {
      const item=this.fleet[i], config=getCompanionAbility(item.role), view=this._companionViews[i];
      const angle=(this.reducedMotion?0:time)*TAU/2.5 + Math.PI + i*TAU/this.fleet.length;
      Object.assign(view,{ id:item.role,role:item.role,name:config.name,label:config.label,
        x:this.player.x+Math.cos(angle)*44,y:y+Math.sin(angle)*34,homeX:this.player.x,homeY:y,
        enabled:false,collects:false,passive:config.passive,active:config.passive?live:item.remaining>0,
        ready:live&&!config.passive&&item.cooldown<=.001&&item.remaining<=0,
        remaining:item.remaining,duration:this.roleDuration(item.role),cooldown:item.cooldown,
        cooldownTotal:config.passive?0:this.roleCooldown(item.role),radius:0,recovery:0,
        weldAngle:null,phase:item.remaining>0?'active':item.cooldown>0?'cooldown':'orbiting',carrying:false,cargoKind:null });
      if(item.role==='collector') Object.assign(view,this.getWispState(y,time));
      if(item.role==='protector') Object.assign(view,{charges:this.shield.charges,layers:this.shield.layers,
        recovery:this.shield.recovery,recoveryTotal:this.shield.recoveryTotal});
      if(!this.reducedMotion&&item.role!=='collector'){
        const a=time*COMPANION_ORBIT_SPEED[item.role]+i*TAU/this.fleet.length;
        view.x=this.player.x+Math.cos(a)*40;view.y=y+Math.sin(a*1.13)*27;
        if(item.role==='protector'&&this.shield.charges<this.shield.layers){
          const progress=clamp(1-this.shield.recovery/this.shield.recoveryTotal,0,1);view.weldAngle=-Math.PI/2+progress*TAU;
          const radius=(22.5+this.shield.charges*2)*390/240;view.x=this.player.x+Math.cos(view.weldAngle)*radius;view.y=y+Math.sin(view.weldAngle)*radius;
        }
        if(item.role==='leveler'&&item.remaining>0){view.x=this.player.x+Math.sin(time*3)*12;view.y=y+32+Math.sin(time*5)*3;}
        if(item.role==='swift'&&item.remaining>0){view.x=this.player.x+36+Math.sin(time*13)*5;view.y=y+Math.sin(time*9)*15;}
        if(item.role==='seer'&&item.remaining>0){view.x=this.player.x+43+Math.sin(time*2)*5;view.y=y+Math.sin(time*3)*20;}
        const response=1-Math.exp(-Math.max(0,time-(view.motionTime??time-.1))*12);
        view.motionX=lerp(view.motionX??view.x-this.player.x,view.x-this.player.x,response);
        view.motionY=lerp(view.motionY??view.y-y,view.y-y,response);view.motionTime=time;
        view.x=this.player.x+view.motionX;view.y=y+view.motionY;
      }
      if(item.role==='kindler'){view.procFlash=this.kindlerPulse;view.purifyCooldown=this.purifyCooldown;view.purifyCooldownTotal=Number(this.mod.purifyCooldown)||10;}
    }
    return this._companionViews;
  }

  getShieldState() { return { ...this.shield, enabled:this.hasCompanion('protector'),
    cost:clamp(Number(this.mod.protectorCost)||12,1,40) }; }
  getLevelerState() {
    const item=this.fleet.find(state=>state.role==='leveler');
    return {active:(item?.remaining||0)>0,remaining:item?.remaining||0,charge:this.levelCharge,capacity:this.roleDuration('leveler'),held:this.liftHeld,targetY:this.levelTargetY,
      bob:12*this.scaleY*(1-clamp(Number(this.mod.levelerSteadiness)||0,0,1)),dive:this.levelDive>0,diveRemaining:this.levelDive};
  }

  getFlightProjection() {
    if(!this.mod.driftSense)return null;
    this.projection??=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle);
    return this.projection.read(this);
  }

  getLightState() {
    const baseRadius = Number(this.mod.lightRadius)>0 ? Number(this.mod.lightRadius) : LIGHT_PACKET_TUNING.baseRadius;
    const reduction=clamp(this.lightDimming*(1-clamp(this.mod.darkResistance||0,0,.6)),0,1-LIGHT_PACKET_TUNING.minimumLight);
    const sightRemaining=Math.max(0,this.sightUntil-this.time),sightBonus=sightRemaining>0?50:0;
    const revealedRadius=baseRadius+sightBonus+(this.dream?.phase==='recording'&&this.mod.dreamSight?70:0),dyingFade=this.dying?Math.max(0,1-this.dyingProgress**1.7):1;
    const caveReduction=clamp(this.caveDimming||0,0,.18),caveScale=1-caveReduction;
    const seer=this.fleet.find(item=>item.role==='seer');
    const traitRemaining=this.mod.mainSeer?Math.max(0,this.mainSeerUntil-this.time):0;
    const artifactRemaining=Math.max(0,this.artifactEffects.sightUntil-this.time);
    const remaining=Math.max(seer?.remaining||0,traitRemaining,artifactRemaining);
    const startedAt=Math.min(traitRemaining>0?this.mainSeerStartedAt:Infinity,
      artifactRemaining>0?this.artifactEffects.sightStartedAt:Infinity,seer?.remaining>0?seer.startedAt:Infinity);
    const onset=Number.isFinite(startedAt)?clamp((this.time-startedAt)/.25,0,1):0;
    const strength=remaining>0?Math.min(onset,clamp(remaining/.4,0,1)):0;
    const forwardLight={active:strength>0,x:this.player.x+160,y:this.player.y,
      radius:clamp(Number(this.mod.seerRadius)||230,120,420)*caveScale,intensity:strength*(1-reduction*.65)*dyingFade};
    const reveal=this.completionProgress*this.completionProgress*(3-2*this.completionProgress);
    const radius=Math.max(baseRadius*.5,revealedRadius*(1-reduction)*caveScale)
      +(this.reducedMotion?0:Math.hypot(this.width,this.height)*reveal);
    const refuge=this.getExitLandmark(),landmarkLight=refuge?{x:refuge.x-10,y:refuge.y+9,
      radius:clamp(refuge.groundY-refuge.y+9,80,138),intensity:.62*lightAttenuation(((refuge.x-this.player.x)**2+(refuge.y-this.player.y)**2)/(radius*radius))}:null;

    return {baseRadius,revealedRadius,revealBonus:0,pickupReveal:this.pickupRevealStrength*dyingFade,
      edgingReveal:this.edgingPulse.strength,caveReduction,caveActive:caveReduction>.005,
      radius,forwardRadius:radius,verticalRadius:radius,rearRadius:radius,
      intensity:(1-reduction*.65)*dyingFade,dimmed:reduction>.005,sightBonus,sightRemaining,
      forwardLight,forward:forwardLight,landmarkLight,stacks:this.lightPenalties.length,
      remaining:Math.max(0,...this.lightPenalties.map(until=>until-this.time)),
      maximumStacks:LIGHT_PACKET_TUNING.darkMaximumStacks,penaltyPerStack:LIGHT_PACKET_TUNING.darkPenalty};
  }

  triggerMainSight() {
    if(!this.mod.mainSeer||this.time<this.mainSeerReadyAt)return false;
    this.mainSeerStartedAt=this.time;
    this.mainSeerUntil=this.time+clamp(Number(this.mod.seerDuration)||2,.5,8);
    this.mainSeerReadyAt=this.time+clamp(Number(this.mod.seerRecovery)||8,2,30);
    this.artifactEffects.notice('dawn-thread','passive');
    return true;
  }

  getGravityState() { return {active:false,radius:0,strength:0}; }

  isCompanionWorking() {
    return this.running&&this.alive&&!this.paused&&!this.finished&&!this.destroyed&&!this.dying&&!this.tutorialAwaitingLift
      && (this.fleet.some(item=>item.remaining>0)||this.companions.some(role=>getCompanionAbility(role).passive));
  }

  quickenCompanionRecovery(source, amount = 1) {
    amount=Math.max(0,Number(amount)||0);
    const missing=Math.max(0,...this.fleet.map(item=>item.cooldown),
      this.hasCompanion('collector')?this.wisp.cooldown:0,
      this.hasCompanion('protector')&&this.shield.charges<this.shield.layers?this.shield.recovery:0,
      this.hasCompanion('leveler')?(1-this.levelCharge/Math.max(.001,this.roleDuration('leveler')))*this.roleCooldown('leveler'):0);
    const granted=Math.min(amount,missing);
    for(const item of this.fleet) item.cooldown=Math.max(0,item.cooldown-amount);
    if(this.hasCompanion('leveler'))this.levelCharge=Math.min(this.roleDuration('leveler'),this.levelCharge+amount*this.roleDuration('leveler')/this.roleCooldown('leveler'));
    if(this.hasCompanion('collector')) this.wisp.cooldown=Math.max(0,this.wisp.cooldown-amount);
    if(this.hasCompanion('protector')&&this.shield.charges<this.shield.layers)
      this.shield.recovery=Math.max(0,this.shield.recovery-amount);
    this.syncFleetTimers();
    if(granted>0)this.artifactEffects.onRecharge(granted);
    if(source&&granted>0) this.setEvent(`${source} · companion recovery −${Math.round(granted*10)/10}s`);
    return granted;
  }

  getNearbyObstacles(padding = 420) {
    const list=this.layout?.obstacles||[],left=this.distance-padding,right=this.distance+this.width+padding;
    while(this._obstacleCursor<list.length&&list[this._obstacleCursor].x+list[this._obstacleCursor].width*2.5<this.distance-Math.max(1200,padding)) this._obstacleCursor++;
    const nearby=[];
    for(let i=this._obstacleCursor;i<list.length;i++) {
      const obstacle=list[i];if(obstacle.x-obstacle.width>right)break;
      if(!obstacle.destroyed&&obstacle.x+obstacle.width*2.5>=left)nearby.push(obstacle);
    }
    return nearby;
  }

  getNearbyPickups() {
    const list=this.layout?.embers||[];
    if(this._pickupCount!==list.length){this._pickupCount=list.length;this._pickupCursor=0;this._nearbyPacketsUntil=-1;}
    if(this.time<this._nearbyPacketsUntil)return this._nearbyPackets;
    const reach=Math.max(480,this.wisp?.range(this)*1.7||0),left=this.distance-reach,right=this.distance+this.width+reach;
    while(this._pickupCursor<list.length&&list[this._pickupCursor].x<left&&!list[this._pickupCursor].carried)this._pickupCursor++;
    this._nearbyPackets.length=0;
    for(let i=this._pickupCursor;i<list.length;i++){
      const packet=list[i];if(packet.x>right)break;
      if(!packet.collected)this._nearbyPackets.push(packet);
    }
    this._nearbyPacketsUntil=this.time+.06;return this._nearbyPackets;
  }

  getCollectorAuraState() {
    if(!this.hasCompanion('collector')||!this.layout||!this.wisp)return null;
    const range=this.wisp.range(this);
    const growth=clamp(1-this.wisp.cooldown/Math.max(.01,this.wisp.cooldownMax),0,1);
    if(!this._collectorAura)this._collectorAura={shape:'circle',vertices:[],contains(x,y){return Math.hypot(x-this.x,y-this.y)<=this.radius;}};
    const aura=this._collectorAura;
    aura.x=aura.worldX=this.distance+this.player.x;aura.y=this.player.y;
    aura.radius=aura.maxRadius=Math.min(18+(Number(this.mod.collectorMinimum)||0),range)+(range-Math.min(18+(Number(this.mod.collectorMinimum)||0),range))*growth;aura.baseRadius=range;aura.maximumReach=range;
    aura.growth=growth;aura.active=!this.dying;aura.areaRatio=1;aura.coordinateSpace='world';
    return aura;
  }

  collectorContains(packet) {
    const aura=this.getCollectorAuraState();return Boolean(aura&&aura.radius>0&&Math.hypot(packet.x-aura.x,packet.y-aura.y)<=aura.radius+pickupContactRadius(packet));
  }

  beginDying(cause = 'collision') {
    if(this.dying||this.completing||this.finished||this.destroyed)return;
    this.edgingPulse.reset();
    this.blackHoles.stop();
    this.deathCause=cause;this.dyingDuration=2;
    this.dying=true;this.dyingAge=0;this.tutorialAwaitingLift=false;
    for(const item of this.fleet)item.remaining=0;this.syncFleetTimers();
    this.levelDive=0;this.setEvent('The light scatters…');
    this.burst(this.player.x,this.player.y,8,'#e1d7ba');this.notify();
  }

  packetPositionClear(worldX, y) {
    if (y < 31 || y > this.height - 32) return false;
    for (const obstacle of this.getNearbyObstacles()) {
      if (obstacle.destroyed || worldX + 4 < obstacle.x - obstacle.width * .8
        || worldX - 4 > obstacle.x + obstacle.width * 2.5) continue;
      if (circleHitsObstacle(worldX, y, 4, obstacle, this.time)) return false;
    }
    return true;
  }

  shatterPickupRing(packet) {
    const radius=pickupContactRadius(packet),x=packet.x-this.distance,y=packet.y;
    const color=getPickupSpec(packet).dim>0?'#f58b79':'#e4f2ca';
    const count=this.reducedMotion?6:12;
    for(let i=0;i<count&&this.particles.length<150;i++){
      const angle=i/count*TAU;
      this.particles.push({type:'ring-shard',x,y,worldX:packet.x,radius,shardAngle:angle,
        vx:0,vy:0,life:.34,maxLife:.34,size:1,length:radius*TAU/count*.58,rotation:angle,glow:0,color});
    }
  }

  absorbPacket(ember, kind) {
    const origin = ember.deliveredByWisp ? this.getWispState()
      : { x: ember.x - this.distance, y: ember.y };
    const dx = origin.x - this.player.x, dy = origin.y - this.player.y;
    const duration = LIGHT_PACKET_TUNING.absorptionDuration;
    this.absorptionEffects.push({ id: `absorb:${this.absorptionSequence++}`, kind,
      pickupKind: pickupKind(ember), pickupId: ember.id,
      startX: origin.x, startY: origin.y, initialAngle: Math.atan2(dy, dx),
      startRadius: Math.hypot(dx, dy), bornAt: this.time, duration, life: duration });
    while (this.absorptionEffects.length > LIGHT_PACKET_TUNING.absorptionLimit) this.absorptionEffects.shift();
  }

  getNearbyPickup(seenKinds = new Set()) {
    if(this.dying||this.completing||this.finished||this.destroyed)return null;
    const light = this.getLightState();
    const seen = kind => seenKinds?.has?.(kind) === true || Array.isArray(seenKinds) && seenKinds.includes(kind);
    for (const packet of this.getNearbyPickups()) {
      if (packet.collected || packet.carried) continue;
      const kind = pickupKind(packet), spec = getPickupSpec(packet), x = packet.x - this.distance, y = packet.y;
      if (seen(kind) || x <= this.player.x + pickupContactRadius(packet)
        || x < 18 || x > this.width - 18 || y < 18 || y > this.height - 18
        || lightVisibility(this,light,x+spec.radius,y)<.32) continue;
      return { id: kind, kind, x, y, radius: Math.max(18, spec.radius * 3) };
    }
    return null;
  }

  dimLight(duration) {
    if (this.lightPenalties.length >= LIGHT_PACKET_TUNING.darkMaximumStacks) this.lightPenalties.shift();
    this.lightPenalties.push(this.time + duration);
  }

  storeNaturalOverflow(packet,spec,surplus){
    if(packet.generated||packet.harmful||!(spec.fuel>0)||!(surplus>0))return 0;
    const gain=condenseGlow(surplus,{rules:this.mod.condensationRules,wallet:this.condensedTotal,remainder:this.condensedRemainder});
    this.pickupOverflow+=surplus;this.condensedGlow+=gain.amount;this.condensedRemainder=gain.remainder;
    this.condensationFlow={amount:gain.amount,rawAmount:surplus,time:this.time,count:this.condensationFlow.count+1,total:this.condensedGlow,multiplier:gain.multiplier};
    return surplus;
  }

  get pickupRevealStrength() {
    if(!Number.isFinite(this.pickupRevealStartedAt))return 0;
    const smooth=t=>t*t*(3-2*t);
    if(this.time<=this.pickupRevealHoldUntil){
      const rise=this.reducedMotion?.35:.12;
      return lerp(this.pickupRevealFrom,1,smooth(clamp((this.time-this.pickupRevealStartedAt)/rise,0,1)));
    }
    return 1-smooth(clamp((this.time-this.pickupRevealHoldUntil)/1.2,0,1));
  }

  revealFromPickup(force=false) {
    if(!this.mod.pickupReveal&&!force)return;
    const from=this.pickupRevealStrength;
    this.pickupRevealFrom=from;this.pickupRevealStartedAt=this.time;
    // Refresh from current illumination; never blink dark or stack exposure.
    this.pickupRevealHoldUntil=this.time+1.5+(from<1?(this.reducedMotion?.35:.12):0);
  }

  step(dt) {
    if (this.destroyed || this.finished || this.paused || !this.alive || this.tutorialAwaitingLift) return;
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    if(this.completing){
      this.time+=dt;this.completionAge=Math.min(1.5,this.completionAge+dt);
      this.wingPhase+=dt*2;
      for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
      this.particles=this.particles.filter(p=>p.life>0);
      if(this.completionAge>=1.5){this.render();this.finish(true);}
      return;
    }
    if(this.dying){
      this.time+=dt;this.dyingAge=Math.min(this.dyingDuration,this.dyingAge+dt);
      this.player.vy*=Math.exp(-dt*7);this.player.y=clamp(this.player.y+this.player.vy*dt*.15,28,this.height-29);
      this.flash=Math.max(0,this.flash-dt);this.shake*=Math.exp(-dt*12);
      for(const particle of this.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;}
      this.particles=this.particles.filter(particle=>particle.life>0);
      this.updateClock+=dt;if(this.updateClock>=.1){this.updateClock=0;if(this.resumeRemaining===0)this.notify();}
      if(this.dyingAge>=this.dyingDuration)this.finish(false);return;
    }
    this.time += dt;
    this.lightPenalties = this.lightPenalties.filter(until => until > this.time);
    const dimTarget = this.lightPenalties.reduce((sum, until) => {
      const fade = clamp((until - this.time) / LIGHT_PACKET_TUNING.recoveryFade, 0, 1);
      return sum + LIGHT_PACKET_TUNING.darkPenalty * fade * fade * (3 - 2 * fade);
    }, 0);
    this.lightDimming = lerp(this.lightDimming, dimTarget, 1 - Math.exp(-dt * LIGHT_PACKET_TUNING.dimResponse));
    this.wingPhase += dt * this.wingRate;
    const oldBoost=this.boostTime;
    for(const item of this.fleet){
      if(item.role==='leveler')continue;
      item.remaining=Math.max(0,item.remaining-dt);item.cooldown=Math.max(0,item.cooldown-dt);
    }
    this.updateLeveler(dt); this.kindlerPulse=Math.max(0,this.kindlerPulse-dt);
    this.syncFleetTimers();
    this.levelRecovery=Math.max(0,this.levelRecovery-dt);this.levelDive=Math.max(0,this.levelDive-dt);
    this.purifyCooldown=Math.max(0,this.purifyCooldown-dt);
    this.shield.protection=Math.max(0,this.shield.protection-dt);this.shield.hitFlash=Math.max(0,this.shield.hitFlash-dt);
    if(this.shield.charges<this.shield.layers){
      this.shield.recovery=Math.max(0,this.shield.recovery-dt);
      if(this.shield.recovery<=0){this.shield.charges++;this.shield.recovery=this.shield.charges<this.shield.layers?this.shield.recoveryTotal:0;}
    }
    const wispTarget=this.hasCompanion('collector')&&this.isCompanionWorking()&&this.cards.has('hungry-wisp')?1:0;
    this.wispBoost+=clamp(wispTarget-this.wispBoost,-dt*5,dt*5);
    this.exitProtection = Math.max(0, this.exitProtection - dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt * 18);
    if (oldBoost > 0 && this.boostTime === 0) this.exitProtection = .45;
    this.distance += this.baseSpeed * (this.boostTime > 0 ? 1.48 : 1) * dt;
    const encounter=this.challengeDirector.update({time:this.time,worldX:this.distance+this.player.x,
      speed:this.baseSpeed*(this.boostTime>0?1.48:1),maximumSpeed:this.baseSpeed*1.48});
    this.flightChallenge=encounter.state;
    this.caveDimming+=(encounter.darkness-this.caveDimming)*(1-Math.exp(-dt*3));
    if(encounter.event)this.setEvent(encounter.event);

    this.drafts.update(this.time, this.distance + this.player.x,
      this.baseSpeed * (this.boostTime > 0 ? 1.48 : 1));
    const gust = this.gustState();
    const leveling = (this.fleet.find(item=>item.role==='leveler')?.remaining||0)>0;
    let gravityBlend = leveling ? 0 : 1;
    if (!leveling && this.levelRecovery > 0) {
      const t = 1 - this.levelRecovery / .25;
      gravityBlend = t * t * (3 - 2 * t);
    }
    let gravity = FLIGHT_TUNING.gravity * this.scaleY * clamp(Number(this.mod.gravity) || 1, .80, 1.20) * gravityBlend;
    if(leveling){
      const leveler=this.fleet.find(item=>item.role==='leveler');
      const bob=Math.sin((this.time-leveler.startedAt)*2.8)*12*this.scaleY*(1-clamp(Number(this.mod.levelerSteadiness)||0,0,1));
      const target=clamp((this.levelTargetY??this.player.y)+bob,40,this.height-40);
      gravity=clamp((target-this.player.y)*26-this.player.vy*9,-350*this.scaleY,350*this.scaleY);
    } else if(this.levelDive>0) gravity+=180*this.scaleY*clamp(Number(this.mod.levelerDive)||1,1,2);
    if (gust.active) {
      this.gustSeconds += dt;
      // Boost can break through a downdraft or arrest an unwanted updraft.
      // Wind resistance fades out briefly after the burst. It gives no
      // immunity to terrain or the playfield boundary.
      const resistance=clamp(Number(this.mod.swiftResistance)||WIND_TUNING.boostResistance,0,.95);
      const windGuard=this.boostTime>0?1-resistance:1-resistance*clamp(this.exitProtection/.45,0,1);
      gravity += gust.direction * gust.force * this.scaleY * (this.mod.steady ? .45 : 1) * windGuard;
      if (this.cards.has('storm-feeder')) {
        this.stormFeedClock += dt;
        if (this.stormFeedClock >= 1) {
          this.stormFeedClock -= 1;
          this.quickenCompanionRecovery('Draft Feeder');
          this.burst(this.player.x, this.player.y, 4, '#88e5ef');
        }
      }
    }
    this.player.vy = clamp(this.player.vy + gravity * dt, -520 * this.scaleY, FLIGHT_TUNING.terminalFall * this.scaleY * clamp(Number(this.mod.terminalFall)||1,1,1.15));
    this.player.y += this.player.vy * dt;
    updateGuardian(this, dt);
    this.blackHoles.update(dt);
    this.biomeDynamics?.update(dt);
    if (this.dying || !this.alive) return;
    const nearbyObstacles = this.getNearbyObstacles();
    this.edgingPulse.update(dt, nearbyObstacles);
    const breathingBank = Math.sin(this.wingPhase * TAU / 6) * .012;
    this.visualBank = lerp(this.visualBank, clamp(this.player.vy / (690 * this.scaleY), -.30, .35) + breathingBank, 1 - Math.exp(-dt * 9));

    // Open sky allows partial visibility until the whole body exits.
    if (this.player.y + this.player.radius < 0 || this.player.y - this.player.radius > this.height) {
      this.hit(null);
      return;
    }

    for (const obstacle of nearbyObstacles) {
      const x = obstacle.x - this.distance;
      if (x > this.width + 250) break;
      if (x + obstacle.width * 2.5 < -30 || obstacle.destroyed) continue;
      const center = this.obstacleCenter(obstacle);
      const top = center - obstacle.gap / 2, bottom = center + obstacle.gap / 2;
      const colliding = circleHitsObstacle(this.distance + this.player.x, this.player.y, this.player.radius, obstacle, this.time, center);
      if (colliding) {
        if (this.isCompanionWorking() && obstacle.soft && this.cards.has('fire-wake')) {
          obstacle.destroyed = true; this.destroyedThorns++;
          for (let i = 0; i < 3; i++) {
            this.layout.embers.push({ id: `thorn:${obstacle.id}:${i}`, kind: 'light', generated: true,
              x: this.distance + this.player.x + 12 + i * 14,
              y: this.player.y + (i - 1) * 10, collected: false, attracted: false,
              phase: i * 1.7 });
          }
          this.layout.embers.sort((a, b) => a.x - b.x);
          this.burst(x + obstacle.width / 2, this.player.y, 25, '#ffc478');
          this.setEvent('Shatter Wake · thorns cleared');
        } else {
          this.hit(obstacle);
          return;
        }
      }
      if (!obstacle.passed && x + obstacle.width * 2.5 < this.player.x - this.player.radius) {
        obstacle.passed = true; this.score += 25;
        const edge = Math.min(Math.abs(this.player.y - top), Math.abs(bottom - this.player.y));
        if (edge < 36 && !obstacle.hit) {
          this.nearMisses++; this.score += 15;
          this.burst(this.player.x - 10, this.player.y, 5, '#b8e9dc');
        }
      }
    }

    for (const ember of this.getNearbyPickups()) {
      if (ember.collected || ember.carried) continue;
      const x = ember.x - this.distance;
      if (x < -40 || x > this.width + 20) continue;
      if(this.mod.nightGarden&&!ember.generated&&this.nightGardenCount<5&&pickupKind(ember)==='dark'&&!ember.gardenPassed
        &&x<this.player.x&&Math.hypot(this.player.x-x,this.player.y-ember.y)<60
        &&Math.hypot(this.player.x-x,this.player.y-ember.y)>pickupContactRadius(ember)+8){
        ember.gardenPassed=true;this.nightGardenCount++;
        const gain=Math.min(clamp(Number(this.mod.nightGarden)||0,0,10),this.maxFlame-this.flame);this.flame+=gain;this.flameRestored+=gain;
        this.burst(this.player.x,this.player.y,4,'#bdcea3');
        if(gain>0){this.setEvent(`Night Gardener · +${formatGlow(gain,this.maxFlame)} Sparks`);this.artifactEffects.notice('night-gardener');this.artifactEffects.notice('hollow-covenant');}
      }
      if (Math.hypot(this.player.x - x, this.player.y - ember.y) < pickupContactRadius(ember)) this.collect(ember);
    }
    if (this.tutorial) {
      updateTutorialCompanion(this, dt);
      updateTutorial(this, dt, gust);
    } else this.wisp.update(this, dt);

    // Wisps pulse in place; only discrete pickup/hit bursts leave particles.
    for (const effect of this.pickupEffects) effect.life -= dt;
    this.pickupEffects = this.pickupEffects.filter(effect => effect.life > 0);
    for (const effect of this.absorptionEffects) effect.life -= dt;
    this.absorptionEffects = this.absorptionEffects.filter(effect => effect.life > 0);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if(p.type!=='ring-shard'){
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 8 * dt;
        p.rotation = Math.atan2(p.vy, p.vx);
      }
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    this.updateClock += dt;
    if (this.updateClock >= .10) { this.updateClock = 0; if(this.resumeRemaining===0)this.notify(); }
    if (!this.finished && !this.dying && !this.completing && this.distance >= this.totalDistance) this.finish(true);
  }

  hit(obstacle) {
    if(!this.alive||this.finished||this.destroyed||this.dying||this.completing)return;
    this.edgingPulse.impact();
    if(this.shield.protection>0)return;
    if(obstacle)obstacle.hit=true;
    this.collisions++;
    const cost=clamp(Number(this.mod.protectorCost)||12,1,40);
    if(this.hasCompanion('protector')&&this.shield.charges>0&&this.availableGlow>=cost){
      const obstacles=this.getNearbyObstacles();
      const worldX=this.distance+this.player.x,radius=this.player.radius+4;
      const clear=y=>y>=34&&y<=this.height-35&&!obstacles.some(item=>circleHitsObstacle(worldX,y,radius,item,this.time));
      let safe=null;
      for(let offset=0;offset<this.height;offset+=6){
        for(const side of [-1,1]){const candidate=clamp(this.player.y+offset*side,35,this.height-36);
          if(clear(candidate)){safe=candidate;break;}}
        if(safe!==null)break;
      }
      if(safe!==null){
        const previous=this.player.y;this.spendGlow(cost);this.shield.charges--;
        if(this.shield.recovery<=0)this.shield.recovery=this.shield.recoveryTotal;
        this.shield.protection=Number(this.mod.protectorProtection)||.4;this.shield.hitFlash=.45;this.flash=.14;
        this.player.y=this.previousPlayerY=safe;this.player.vy=(safe>=previous?1:-1)*65*this.scaleY;
        if(this.projection)this.projection.nextAt=-Infinity;
        this.cancelLeveler(true);this.levelDive=0;this._auraUntil=-1;
        this.artifactEffects.onWork();
        this.artifactEffects.notice('iron-petal','passive');
        this.setEvent(`Protector · shell spent, −${formatGlow(cost,this.maxFlame)} Sparks`);this.sound('hit');
        this.notify();return;
      }
    }
    this.flash=.22;this.shake=this.reducedMotion?0:4;
    this.burst(this.player.x,this.player.y,18,'#e6edda');this.sound('hit');
    this.beginDying('collision');
  }

  collect(ember) {
    if (ember.collected || !this.alive || this.finished || this.destroyed || this.dying) return;
    const kind = pickupKind(ember), spec = getPickupSpec(ember), harmful = kind === 'dark';
    if (ember.deliveredByWisp && !canCompanionCollect(ember)) return;
    if(ember.deliveredByWisp&&!ember.generated){this.artifactEffects.onWork();this.artifactEffects.notice('wayfinder-seed','passive');}
    if(!ember.deliveredByWisp)this.shatterPickupRing(ember);
    if (harmful) {
      // Body-only hazard: never turn a stale carrier reservation into a hit.
      if (ember.deliveredByWisp) return;
      ember.collected = true;
      if((this.mod.mainKindler||this.hasCompanion('kindler'))&&this.mod.kindlerPurify&&this.purifyCooldown<=0){
        const restored=Math.min(Number(this.mod.purifyFuel)||12,this.maxFlame-this.flame);
        this.kindlerPulse=.9;this.flame+=restored;this.flameRestored+=restored;this.purifyCooldown=Number(this.mod.purifyCooldown)||10;
        this.revealFromPickup();
        this.absorbPacket({...ember,kind:'light',harmful:false},'light');
        const text=restored>0?`Purified · +${formatGlow(restored,this.maxFlame)} Sparks`:'Purified · Sparks full';
        this.pickupEffects.push({x:this.player.x,y:this.player.y,pickupKind:'light',text,restored,life:.72});
        if(this.pickupEffects.length>12)this.pickupEffects.shift();
        this.setEvent(`Purifying Touch · ${text}`);this.sound('collect');return;
      }
      this.absorbPacket(ember, 'dark');
      this.dimLight(spec.dimDuration);
      this.pickupEffects.push({ x:this.player.x,y:this.player.y,pickupKind:'dark',
        text:`SIGHT -${Math.round(spec.dim*100)}%`,color:'#c5b1cf',restored:0,value:0,life:.72 });
      if(this.pickupEffects.length>12)this.pickupEffects.shift();
      this.setEvent(`${spec.name} · Luminance -${Math.round(spec.dim*100)}%`);
      return;
    }
    if (!ember.generated && !isFuelPickup(ember)) {
      ember.collected = true;
      this.absorbPacket(ember, 'light');
      let text = '';
      if (spec.recharge) {
        const recovering=this.fleet.some(item=>item.cooldown>0)||this.hasCompanion('collector')&&this.wisp.cooldown>0
          ||this.shield.charges<this.shield.layers&&this.shield.recovery>0;
        this.quickenCompanionRecovery(null,spec.recharge);
        text=recovering?`Companion recovery −${spec.recharge}s`:'Companion ready';
      } else if (spec.sightBonus) {
        this.sightUntil = Math.max(this.sightUntil, this.time + spec.sightDuration);
        text = `+${spec.sightBonus} Luminance · ${spec.sightDuration}s`;
      }
      const origin = ember.deliveredByWisp ? this.getWispState() : this.player;
      this.pickupEffects.push({ x: origin.x, y: origin.y, pickupKind: kind, text, value: 0, restored: 0, life: .72 });
      if (this.pickupEffects.length > 12) this.pickupEffects.shift();
      this.setEvent(`${spec.name} · ${text}`);
      this.sound('collect');
      return;
    }
    if (this.tutorial) recordTutorialPickup(this, ember);
    ember.collected = true;
    this.absorbPacket(ember, 'light');
    if(!ember.generated){
      this.revealFromPickup();
      if(!spec.dim)this.triggerMainSight();
      if(!spec.dim&&this.mod.dreamRecharge&&this.dream?.active){
        const restored=this.quickenCompanionRecovery(null,clamp(Number(this.mod.dreamRecharge)||0,0,4));
        if(restored>0){this.artifactEffects.notice('dreamcatcher');this.artifactEffects.notice('dream-sovereign');}
      }
      if(!spec.dim&&this.mod.secondDawn&&this.dreamCompleted&&!this.secondDawnUsed){this.secondDawnUsed=true;this.revealFromPickup(true);this.artifactEffects.notice('second-dawn');this.artifactEffects.notice('dream-sovereign');}
    }
    const cleansed = !ember.generated && this.lightPenalties.length > 0;
    if (cleansed) this.lightPenalties.pop();
    const rawFuel = ember.generated ? FLAME_TUNING.generatedFuel
      : spec.fuel
        + (kind==='cache'?(Number(this.mod.richFuelBonus)||0):0) + this.fuelBonus + clamp(Number(this.mod.cacheFuelBonus) || 0, 0, 32)
        + (ember.deliveredByWisp?(Number(this.mod.collectorFuelBonus)||0):0)
        + (!ember.deliveredByWisp&&(this.mod.mainKindler||this.hasCompanion('kindler'))?clamp(Number(this.mod.kindlerBonus)||(this.mod.mainKindler?6:10),0,30):0)
        + this.artifactEffects.fuelBonus(ember,spec);
    const fuel=Math.round(rawFuel*.3)/.3;
    if(!ember.generated&&!ember.deliveredByWisp&&(this.mod.mainKindler||this.hasCompanion('kindler')))this.kindlerPulse=.9;
    let restored = Math.min(fuel, this.maxFlame - this.flame);
    this.flame += restored; this.flameRestored += restored;
    const surplus=this.storeNaturalOverflow(ember,spec,Math.max(0,fuel-restored));
    restored+=this.artifactEffects.applyConsumables(ember,spec);
    if(!ember.generated&&!spec.dim){
      if(surplus>0)this.artifactEffects.notice('echo-vessel','passive');
      if(restored>0){
        this.artifactEffects.notice('glass-lantern','passive');this.artifactEffects.notice('sunheart-engine');
        if(!ember.deliveredByWisp&&(this.mod.mainKindler||this.hasCompanion('kindler')))this.artifactEffects.notice('moss-heart','passive');
      }
    }
    this.artifactEffects.onFuel(ember,spec,surplus);
    if (spec.dim) this.dimLight(spec.dimDuration);
    const origin = ember.deliveredByWisp ? this.getWispState() : this.player;
    this.pickupEffects.push({ x: origin.x, y: origin.y,
      pickupKind: kind, value: ember.value === 3 ? 3 : 1, restored,
      text:surplus>0&&restored<=0?'OVERFLOW':undefined,life: .72 });
    if (this.pickupEffects.length > 12) this.pickupEffects.shift();
    // Generated fuel helps flight only. It never mints Packed Sparks or
    // recursively pays pickup-triggered effects.
    if (ember.generated) {
      this.score += 5;
      this.burst(this.player.x - 9, this.player.y + 7, 3, '#ffd5a1');
      this.sound('collect');
      return;
    }
    this.baseEmbers++;
    if(isVowBodyPickup(this,ember,spec))this.bodyFuelCollected++;
    const value = ember.value === 3 ? 3 : 1;
    this.bonusEmbers += value - 1;
    this.score += value * ((ember.boostedPickup ?? this.isCompanionWorking()) && this.cards.has('golden-wake') ? 20 : 10);
    this.burst(this.player.x - 9, this.player.y + 7, value === 3 ? 14 : 5, value === 3 ? '#fff2c4' : '#ffe4a2');
    if (surplus>0&&this.condensationFlow.amount>0) this.setEvent(`Overflow · +${this.condensationFlow.amount} Packed Sparks`);
    else if (value === 3) this.setEvent(restored > 0 ? `Sparks cache · +${formatGlow(restored,this.maxFlame)} Sparks` : 'Sparks full');
    else if (restored > 0 && this.flame <= this.maxFlame*.45) this.setEvent(`Sparks rekindled · +${formatGlow(restored,this.maxFlame)}`);
    if (this.cards.has('kindled-spirit') && this.baseEmbers % 3 === 0) {
      this.quickenCompanionRecovery('Kindled Spirit');
    }
    if ((this.mod.warmCore || this.cards.has('warm-heart')) && this.baseEmbers >= (FLAME_TUNING.warmCorePickups || 4) && !this.warmCoreUsed) {
      this.warmCoreUsed = true;
      const bonus = Math.min(12, this.maxFlame - this.flame);
      this.flame += bonus; this.flameRestored += bonus;
      this.pickupEffects.at(-1).restored += bonus;
      this.setEvent(bonus > 0 ? `Warm Core · +${formatGlow(bonus,this.maxFlame)} Sparks` : 'Warm Core · Sparks full');
      this.burst(this.player.x, this.player.y, 12, '#ffd79a');
    }
    if (kind === 'dusk') {
      const totalRestored = this.pickupEffects.at(-1).restored;
      const gain = totalRestored > 0 ? `+${formatGlow(totalRestored,this.maxFlame)} Sparks` : 'Sparks full';
      const text = `${gain} · Luminance −${Math.round(spec.dim * 100)}% (${spec.dimDuration}s)`;
      this.pickupEffects.at(-1).text = text;
      this.setEvent(`${spec.name} · ${text}`);
    }
    else if (cleansed) this.setEvent('Light restored · dark packet cleansed');
    this.sound('collect');
  }

  challengeComplete() {
    return this.challengeId === 'wisps' ? this.baseEmbers >= this.challengeTarget
      : this.challengeId === 'boosts' ? (!this.hasActiveCompanions ? this.baseEmbers : this.boosts) >= this.challengeTarget : this.collisions === 0;
  }

  getBossState() { return bossState(this); }
  getFlightChallengeState() { return this.flightChallenge; }

  getState() {
    const boss = this.getBossState(), ability=this.getAbilityState(),artifacts=this.artifactEffects.state;
    return { alive: this.alive, score: Math.floor(this.score), condensedGlow:this.condensedGlow,condensedTotal:this.condensedTotal,condensedRemainder:this.condensedRemainder,
      ascent: this.ascentInfo,
      boss, bossPhase: boss ? `${boss.phase}/3 · ${boss.phaseName}` : '',
      bossWarning: boss?.warning || '',
      flightChallenge:this.flightChallenge,challengeCue:this.flightChallenge
        ?this.flightChallenge.phase==='warning'?`${this.flightChallenge.name} ahead · ${this.flightChallenge.instruction}`
          :this.flightChallenge.phase==='active'?`${this.flightChallenge.name} · ${this.flightChallenge.instruction}`:'' :'',
      flame: this.flame,pickupOverflow:this.pickupOverflow,condensationFlow:{...this.condensationFlow},
      dream:this.dream?.state||null, maxFlame: this.maxFlame, paidFlapCost:this.flapCost, flapCost: this.dream?.freeGlow||this.artifactEffects.freeLift?0:this.flapCost,
      canFlap: this.alive && !this.finished && !this.dying && !this.completing && (this.dream?.freeGlow||this.artifactEffects.freeLift||this.availableGlow + 1e-7 >= this.flapCost),
      canAffordFlap:this.dream?.freeGlow||this.artifactEffects.freeLift||this.availableGlow+1e-7>=this.flapCost, flaps: this.flaps,
      artifactEffects:artifacts,artifactProc:artifacts.proc,artifactCharges:artifacts.charges,artifactNotices:artifacts.notices,
      wisp: this.getWispState(),
      ability, companions:this.getCompanionStates().map(item=>({...item})),shield:this.getShieldState(),leveler:this.getLevelerState(),
      completing:this.completing,completionProgress:this.completionProgress,collectorAura:this.getCollectorAuraState(),dying:this.dying,dyingProgress:this.dyingProgress,deathCause:this.deathCause,
      light: this.getLightState(),edgingPulse:this.edgingPulse.state,
      blackHole:this.blackHoles.state,
      mainTraits:{seer:!!this.mod.mainSeer,seerRemaining:Math.max(0,this.mainSeerUntil-this.time),seerCooldown:Math.max(0,this.mainSeerReadyAt-this.time),kindler:!!this.mod.mainKindler,kindlerPulse:this.kindlerPulse,purifyCooldown:this.purifyCooldown},
      collected: this.baseEmbers, boostCooldown: this.cooldown,
      boostCooldownTotal: this.boostCooldown, boostDurationTotal: this.boostDuration,
      boostReady: ability.ready,
      boostActive: this.boostTime > 0,
      boostTime: this.boostTime, progress: clamp((this.distance-this.distanceOrigin) / (this.totalDistance-this.distanceOrigin), 0, 1),
      event: this.time < this.eventUntil ? this.event : '',
      renderer: this.pixiReady ? 'pixel-canvas' : 'canvas',
      paused: this.paused, finished: this.finished, reducedMotion: this.reducedMotion,
      resumeScale: this.resumeScale, resumeRemaining: this.resumeRemaining,
      tutorialHintState: getTutorialHint(this), tutorialAwaitingLift: this.tutorialAwaitingLift,
      time: this.time, remaining: Math.max(0, (this.totalDistance - this.distance) / this.baseSpeed),
      challenge: this.challengeText, challengeComplete: this.challengeComplete() };
  }

  notify() { if (!this.destroyed) this.onUpdate(this.getState()); }

  setEvent(value) { this.event = value; this.eventUntil = this.time + 2.2; }

  finish(success) {
    if (this.finished || this.destroyed) return;
    this.edgingPulse.reset();
    this.blackHoles.stop();
    if(success&&!this.completing){
      this.completing=true;this.completionAge=0;
      this.distance=this.previousDistance=this.totalDistance;
      this.previousPlayerY=this.player.y;this.player.vy=0;this.resumeElapsed=this.resumeRampSeconds;
      this.setEvent('PASSAGE CLEARED');this.burst(this.player.x,this.player.y,28,'#f3e4af');this.sound('collect');this.notify();return;
    }
    if(success&&this.completionProgress<1)return;
    this.finished = true; this.running = false;
    this.alive = Boolean(success) && this.alive;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    const result = { success: Boolean(success) && this.alive, alive: this.alive, condensedGlow:this.condensedGlow,condensedRemainder:this.condensedRemainder,pickupOverflow:this.pickupOverflow,
      boss: this.bossEncounter ? { id:this.layout.boss?.id||'hollow-warden', defeated: Boolean(success) && this.alive } : null,
      flame: this.flame,artifactCharges:{...this.artifactEffects.charges},
      score: Math.floor(this.score), collected: this.baseEmbers, bodyFuelCollected: this.bodyFuelCollected, collisions: this.collisions,
      boosts: this.boosts,
      challengeComplete: success && this.challengeComplete(),
      stats: { baseEmbers: this.baseEmbers, bonusEmbers: this.bonusEmbers, nearMisses: this.nearMisses,
        flaps: this.flaps, effortSpent: this.effortSpent, flameRestored: this.flameRestored,
        destroyedThorns: this.destroyedThorns, gustSeconds: Math.round(this.gustSeconds),
        flightSeconds: Math.round(this.time), challenge: this.challengeText } };
    this.notify(); this.onFinish(result);
  }

  emitFlame() {
    if (this.particles.length >= (this.reducedMotion ? 45 : 150)) return;
    const rng = this.cosmeticRng;
    const boosted = this.boostTime > 0, type = rng() > .32 ? 'spark' : 'ember';
    const life = .32 + rng() * (boosted ? .58 : .43);
    const vx = -(boosted ? 220 : 117) - rng() * 56;
    const vy = -this.player.vy * .12 + (rng() - .5) * (boosted ? 24 : 15);
    this.particles.push({ type, x: this.player.x - 25, y: this.player.y + 6 + (rng() - .5) * 6,
      vx, vy, rotation: Math.atan2(vy, vx), life, maxLife: life,
      size: type === 'spark' ? .55 + rng() * .85 : .8 + rng() * 1.25,
      length: type === 'spark' ? (boosted ? 9 : 4) + rng() * (boosted ? 12 : 6) : 1.5,
      glow: type === 'spark' ? .28 : .46,
      color: rng() > .68 ? '#fff1d0' : rng() > .45 ? '#e6ac5f' : '#c56b3c' });
  }

  burst(x, y, count, color) {
    const amount = this.reducedMotion ? Math.ceil(count * .4) : count;
    for (let i = 0; i < amount && this.particles.length < 150; i++) {
      const angle = this.cosmeticRng() * TAU, speed = 15 + this.cosmeticRng() * 70;
      const vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
      this.particles.push({ type: i % 3 === 0 ? 'spark' : 'ember', x, y, vx, vy,
        life: .25 + this.cosmeticRng() * .45, maxLife: .7,
        size: .7 + this.cosmeticRng() * 1.5, length: i % 3 === 0 ? 5 : 1.5,
        rotation: Math.atan2(vy, vx), glow: .36, color });
    }
  }

  sound(type) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audio) this.audio = new AudioContext();
      if (this.audio.state === 'suspended') this.audio.resume().catch(() => {});
      const now = this.audio.currentTime;
      if (type === 'flap' && now - this.lastFlapSound < .10) return;
      if (type === 'flap') this.lastFlapSound = now;
      const tones = { flap: [220, 150, .06, .018], collect: [780, 1280, .075, .025],
        boost: [120, 610, .26, .045], hit: [130, 65, .16, .035] };
      const [from, to, length, volume] = tones[type] || tones.flap;
      const oscillator = this.audio.createOscillator(), gain = this.audio.createGain();
      oscillator.type = type === 'hit' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(to, now + length);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + length);
      oscillator.connect(gain); gain.connect(this.audio.destination);
      oscillator.start(now); oscillator.stop(now + length + .02);
    } catch { /* Audio is optional and never affects play. */ }
  }

  render() {
    if (this.destroyed) return;
    const blend = clamp(this.accumulator / STEP, 0, 1);
    this.renderDistance = lerp(this.previousDistance ?? this.distance, this.distance, blend);
    this.renderPlayerY = lerp(this.previousPlayerY ?? this.player.y, this.player.y, blend);
    this.visualTime = this.time + blend * STEP;
    if (this.pixiReady && this.pixiView) { this.pixiView.render(this); return; }
    const c = this.ctx, W = this.width, H = this.height;
    c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.drawBackground(c, W, H);
    drawBoss(c, { engine: this, width: W, height: H, distance: this.renderDistance,
      time: this.visualTime, pass: 'silhouette' });
    c.save();
    if (this.shake > 0) c.translate(Math.sin(this.time * 77) * this.shake, Math.cos(this.time * 63) * this.shake * .5);
    this.drawWind(c, W, H);
    for (const o of this.layout.obstacles) {
      const x = o.x - this.renderDistance;
      if (x > W + 250) break;
      if (x + o.width * 2.5 < -70 || o.destroyed) continue;
      this.drawObstacle(c, o, x, H);
    }
    drawBoss(c, { engine: this, width: W, height: H, distance: this.renderDistance,
      time: this.visualTime, pass: 'hands' });
    this.biomeDynamics?.draw(c,{distance:this.renderDistance,scale:1,height:H});
    this.drawPortal(c,W,H);
    this.drawEmbers(c);
    this.drawFallbackLight(c);
    this.biomeDynamics?.drawHighlights(c,{distance:this.renderDistance,light:this.getLightState(),playerY:this.renderPlayerY});
    drawFlightProjection(c,this);
    drawGlowSense(c,this);
    this.drawFlightTrail(c);
    this.drawParticles(c);
    this.drawWisp(c);
    this.drawPhoenix(c);
    this.drawPickups(c);
    drawBlackHoles(c,this);
    this.drawForeground(c, W, H);
    c.restore();
    drawProximityMeter(c,this);
    if (this.flash > 0) { c.fillStyle = `rgba(255,196,149,${this.flash * .36})`; c.fillRect(0, 0, W, H); }
    const vignette = c.createRadialGradient(W / 2, H * .43, W * .3, W / 2, H * .45, H * .8);
    vignette.addColorStop(0, 'rgba(5,12,24,0)'); vignette.addColorStop(1, 'rgba(5,12,24,.36)');
    c.fillStyle = vignette; c.fillRect(0, 0, W, H);
  }

  drawFallbackLight(c){
    const doc=this.canvas.ownerDocument||(typeof document!=='undefined'?document:null);
    if(!doc?.createElement)return;
    this.fallbackFog??=doc.createElement('canvas');this.fallbackMask??=createLightMaskCanvas(doc);
    const fog=this.fallbackFog,w=Math.ceil(this.width),h=Math.ceil(this.height);
    if(fog.width!==w||fog.height!==h){fog.width=w;fog.height=h;}
    const f=fog.getContext('2d'),light=this.getLightState(),y=this.renderPlayerY??this.player.y;
    f.globalAlpha=1;f.globalCompositeOperation='source-over';f.clearRect(0,0,w,h);f.fillStyle='#000000';f.fillRect(0,0,w,h);
    f.globalCompositeOperation='destination-out';
    const cast=(x,y,r,alpha)=>{r*=LIGHT_EXTENT;f.globalAlpha=alpha;f.drawImage(this.fallbackMask,x-r,y-r,r*2,r*2);};
    cast(this.player.x,y,light.radius,light.intensity);
    const forward=light.forwardLight;
    if(forward.active)cast(forward.x,forward.y+y-this.player.y,forward.radius,forward.intensity*light.intensity);
    if(light.landmarkLight){const source=light.landmarkLight;cast(source.x,source.y,source.radius,source.intensity);}
    const dim=clamp(light.radius/light.baseRadius,.6,1);
    for(const orb of this.getCompanionStates(y,this.visualTime??this.time)){
      const collector=orb.role==='collector',r=(collector?orb.phase==='cooldown'?17+orb.recovery*10:31:19)*dim;
      cast(orb.x,orb.y,r,light.intensity*(collector?.82:.45));
    }
    c.save();c.globalAlpha=(1-this.completionProgress)*(1-sceneRevealStrength(light));c.drawImage(fog,0,0);c.restore();
  }

  drawBackground(c, W, H) {
    const palettes = { ruins: ['#111d35', '#5c3b54', '#e4a16e'],
      canopy: ['#102c32', '#40555a', '#cfaa76'], storm: ['#101c35', '#384b72', '#c59488'] };
    const colors = palettes[this.terrain];
    const gradient = c.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.56, colors[1]); gradient.addColorStop(1, colors[2]);
    c.fillStyle = gradient; c.fillRect(0, 0, W, H);
    if (this.background) {
      const scale = Math.max(W / this.background.width, H / this.background.height);
      const iw = this.background.width * scale, ih = this.background.height * scale;
      c.globalAlpha = this.terrain === 'storm' ? .53 : .68;
      c.drawImage(this.background, -(iw - W) / 2 + Math.sin(this.distance * .0004) * 8, -(ih - H) / 2, iw, ih);
      c.globalAlpha = 1;
      c.fillStyle = this.terrain === 'canopy' ? 'rgba(5,39,39,.17)' : this.terrain === 'storm' ? 'rgba(9,24,52,.26)' : 'rgba(32,20,42,.09)';
      c.fillRect(0, 0, W, H);
    }
    const sunX = W * .74 - Math.sin(this.distance * .0001) * 8, sunY = H * .28;
    const halo = c.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
    halo.addColorStop(0, 'rgba(255,220,157,.30)'); halo.addColorStop(1, 'rgba(255,175,115,0)');
    c.fillStyle = halo; c.fillRect(sunX - 120, sunY - 120, 240, 240);
    c.fillStyle = this.terrain === 'storm' ? 'rgba(228,213,193,.36)' : 'rgba(255,223,162,.68)';
    c.beginPath(); c.arc(sunX, sunY, 24, 0, TAU); c.fill();
    if (this.stars) for (const star of this.stars) {
      c.globalAlpha = .2 + (Math.sin(this.time * .8 + star.phase) + 1) * .17;
      c.fillStyle = '#eae8d8'; c.fillRect(star.x, star.y, star.size, star.size);
    }
    c.globalAlpha = 1;
    for (let layer = 0; layer < 3; layer++) {
      const parallax = (this.renderDistance ?? this.distance) * (.045 + layer * .06);
      c.fillStyle = ['rgba(29,34,57,.26)', 'rgba(24,36,52,.37)', 'rgba(17,33,44,.57)'][layer];
      c.beginPath(); c.moveTo(-30, H + 10);
      for (let i = -1; i < 12; i++) {
        const x = i * 64 - (parallax % 64);
        const peak = H * (.62 + layer * .095) + Math.sin(i * 1.9 + Math.floor(parallax / 64) * 1.9 + layer) * (34 - layer * 6);
        c.lineTo(x, peak); c.lineTo(x + 28, peak - 26 - Math.sin(i * 2.3) * 14);
      }
      c.lineTo(W + 50, H + 10); c.closePath(); c.fill();
    }
    // Distant floating temples remain low contrast behind the playable lanes.
    c.fillStyle = 'rgba(25,33,50,.33)';
    for (let i = -1; i < 5; i++) {
      const x = i * 142 - (((this.renderDistance ?? this.distance) * .09) % 142), y = H * .57 + Math.sin(i * 2.7) * H * .13;
      c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x + 48, y); c.lineTo(x + 16, y + 29); c.closePath(); c.fill();
      c.fillRect(x - 5, y - 41, 7, 41); c.fillRect(x + 29, y - 41, 7, 41); c.fillRect(x - 9, y - 46, 49, 7);
    }
    const mist = c.createLinearGradient(0, H * .65, 0, H);
    mist.addColorStop(0, 'rgba(208,164,137,0)'); mist.addColorStop(1, 'rgba(173,154,137,.16)');
    c.fillStyle = mist; c.fillRect(0, H * .65, W, H * .35);
  }

  drawObstacle(c, o, x, H) {
    const offset = this.renderDistance ?? this.distance;
    const time = this.visualTime ?? this.time;
    const terrainCount = (o.topShape ? 1 : 0) + (o.bottomShape ? 1 : 0);
    for (const polygon of obstaclePolygons(o, time).slice(0, terrainCount)) {
      const points = polygon.map(([px, py]) => [px - offset, py]);
      this.drawLandform(c, points, o);
    }
    // The fallback uses these exact collider parts too: no invisible scenery
    // if the production pixel-art renderer cannot load.
    const colors = { bark: '#514a3c', foliage: '#535d43', wood: '#71604b', stone: '#77756a', roof: '#4b4642' };
    const center = o.center + Math.sin(time * .9 + o.phase) * o.motion;
    for (const prop of o.sceneProps || []) for (const part of prop.parts) {
      c.beginPath();
      part.polygon.forEach(([px, py], i) => {
        const sx = o.x + px - offset, sy = center + prop.side * o.gap / 2 + py;
        if (i) c.lineTo(sx, sy); else c.moveTo(sx, sy);
      });
      c.closePath(); c.fillStyle = colors[part.material] || colors.stone; c.fill();
      c.strokeStyle = 'rgba(181,179,145,.24)'; c.lineWidth = .8; c.stroke();
    }
  }

  drawLandform(c, points, o) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const width = right - left, height = bottom - top;
    const path = () => { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
    const palettes = { ruins: ['#b9a18a', '#68646c', '#303b50', '#172c3d'],
      canopy: ['#99a277', '#596c53', '#2d4d43', '#102f37'], storm: ['#a2c5ca', '#6589a0', '#344c6b', '#142b45'] };
    const colors = palettes[this.terrain];
    const gradient = c.createLinearGradient(left, top, right, bottom);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.27, colors[1]); gradient.addColorStop(.66, colors[2]); gradient.addColorStop(1, colors[3]);
    path(); c.fillStyle = gradient; c.fill();
    c.save(); path(); c.clip();
    if (this.terrain === 'ruins') {
      // Shattered masonry follows the island's curved profile; there are no
      // infinite pillars or rectangular tube faces in either draw or physics.
      for (let row = 0; row < 5; row++) for (let col = -1; col < 7; col++) {
        const bx = left + col * 33 + (row % 2) * 16, by = top + row * 24;
        c.fillStyle = (col + row + o.id) % 3 ? 'rgba(194,167,138,.10)' : 'rgba(18,33,51,.18)';
        c.beginPath(); c.moveTo(bx + 2, by + 3); c.lineTo(bx + 30, by + 1); c.lineTo(bx + 34, by + 20); c.lineTo(bx + 3, by + 23); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(220,192,153,.17)'; c.lineWidth = .9; c.stroke();
      }
      c.strokeStyle = 'rgba(230,205,165,.32)'; c.lineWidth = 12;
      c.beginPath(); c.ellipse(left + width * .56, top + height * .79, width * .34, height * .6, -.18, Math.PI * 1.02, Math.PI * 1.95); c.stroke();
      c.strokeStyle = 'rgba(25,42,54,.45)'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(left + width * .22, top - 3); c.lineTo(left + width * .4, top + height * .44); c.lineTo(left + width * .34, bottom + 5); c.stroke();
    } else if (this.terrain === 'canopy') {
      for (let i = 0; i < 7; i++) {
        const yy = top + height * .1 + i * 16;
        c.strokeStyle = i % 2 ? 'rgba(180,176,117,.28)' : 'rgba(21,52,45,.45)'; c.lineWidth = 4 + i % 3;
        c.beginPath(); c.moveTo(left - 10, yy); c.bezierCurveTo(left + width * .28, yy - 39, left + width * .64, yy + 34, right + 8, yy - 5); c.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const xx = left + ((i * 43 + o.id * 17) % Math.max(1, width));
        const yy = top + ((i * 29 + o.id * 11) % Math.max(1, height));
        c.fillStyle = i % 2 ? 'rgba(146,169,112,.4)' : 'rgba(42,91,67,.54)';
        c.beginPath(); c.ellipse(xx, yy, 23, 10, -.5 + i * .7, 0, TAU); c.fill();
      }
      if (o.soft) { c.strokeStyle = '#c9ac75'; c.lineWidth = 3; c.beginPath(); c.moveTo(left, top + height * .4); c.bezierCurveTo(left + width * .4, bottom, left + width * .6, top - 15, right, top + height * .5); c.stroke(); }
    } else {
      for (let i = 0; i < 6; i++) {
        const xx = left + width * i / 5;
        c.fillStyle = i % 2 ? 'rgba(160,212,221,.20)' : 'rgba(20,44,70,.30)';
        c.beginPath(); c.moveTo(xx, top - 4); c.lineTo(xx + 34, top + height * .38); c.lineTo(xx + 14, bottom + 2); c.lineTo(xx - 16, top + height * .61); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(178,232,233,.28)'; c.lineWidth = 1; c.stroke();
      }
    }
    const rim = c.createLinearGradient(0, top, 0, bottom);
    rim.addColorStop(0, 'rgba(218,219,158,.48)'); rim.addColorStop(.27, 'rgba(120,160,121,.28)'); rim.addColorStop(1, 'rgba(20,36,45,0)');
    c.fillStyle = rim; c.fillRect(left, top, width, 19);
    const wisp = this.getWispState(this.renderPlayerY ?? this.player.y);
    c.globalCompositeOperation = 'screen';
    for (const source of [
      { x: this.player.x, y: this.renderPlayerY ?? this.player.y, radius: 235,
        color: this.boostTime > 0 ? 'rgba(255,141,56,.38)' : 'rgba(255,141,56,.24)' },
      { x: wisp.x, y: wisp.y, radius: 95 + wisp.radius, color: 'rgba(245,248,255,.34)' },
    ]) {
      const light = c.createRadialGradient(source.x, source.y, 0, source.x, source.y, source.radius);
      light.addColorStop(0, source.color); light.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = light; c.fillRect(left, top, width, height);
    }
    c.restore();
    path(); c.strokeStyle = this.terrain === 'storm' ? 'rgba(173,225,230,.43)' : 'rgba(234,204,154,.31)'; c.lineWidth = 1.15; c.stroke();
    // Hairline roots and moss are decorative; the large shaded silhouette is
    // exactly the polygon used by circle collisions.
    if (this.terrain !== 'storm') {
      for (let i = 0; i < 3; i++) {
        const xx = left + width * (.3 + i * .21), yy = bottom - 7 - i * 4;
        c.strokeStyle = 'rgba(70,99,69,.59)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx - 9, yy + 18, xx + Math.sin(o.id + i) * 9, yy + 27); c.stroke();
      }
    }
  }

  drawEmbers(c) {
    for (const ember of this.layout.embers) {
      if (ember.carried || ember.collected) continue;
      const x = ember.x - (this.renderDistance ?? this.distance);
      if (x > this.width + 30) break;
      if (ember.collected || x < -20) continue;
      const animation = this.reducedMotion ? 0 : this.time;
      const y = ember.y + (ember.attracted ? 0 : Math.sin(animation * 2.8 + ember.phase) * 2);
      drawPickup(c, x, y, { kind: pickupKind(ember), time: animation, reducedMotion: this.reducedMotion });
    }
  }

  drawPickups(c) {
    c.save();
    for (const effect of this.pickupEffects) {
      const t = 1 - effect.life / .72;
      c.globalAlpha = (1 - t) * .8; c.strokeStyle = '#ffdc86'; c.lineWidth = 2;
      c.beginPath(); c.arc(effect.x, effect.y, this.reducedMotion ? 18 : 8 + t * 44, 0, TAU); c.stroke();
      c.globalAlpha = Math.max(0, 1 - t * 3) * .35; c.fillStyle = '#ffe6a5';
      c.beginPath(); c.arc(effect.x, effect.y, 23, 0, TAU); c.fill();
      c.globalAlpha = Math.min(1, (1 - t) * 3); c.font = 'bold 18px system-ui'; c.textAlign = 'center';
      c.font = effect.restored > 0 ? 'bold 13px system-ui' : 'bold 18px system-ui';
      c.fillText(effect.text || (effect.restored > 0 ? `+${formatGlow(effect.restored,this.maxFlame)} SPARKS` : `+${effect.value}`), effect.x + 15, effect.y - 22 - (this.reducedMotion ? 0 : t * 32));
    }
    c.restore();
  }

  drawParticles(c) {
    c.save(); c.globalCompositeOperation = 'screen';
    for (const p of this.particles) {
      const life = clamp(p.life / p.maxLife, 0, 1);
      c.globalAlpha = life * .63;
      const length = p.type === 'spark' ? (p.length || 5) * (.4 + life * .6) : p.size;
      c.fillStyle = p.color; c.beginPath(); c.ellipse(p.x, p.y, length, p.size * (.4 + life * .5), p.rotation || 0, 0, TAU); c.fill();
      if (p.type === 'spark' && life > .35) {
        c.globalAlpha = life * .5; c.fillStyle = '#fff4d9';
        c.beginPath(); c.ellipse(p.x, p.y, length * .7, p.size * .24, p.rotation || 0, 0, TAU); c.fill();
      }
    }
    c.restore();
  }

  drawFlightTrail(c) {
    if (this.trail.length < 2) return;
    const distance = this.renderDistance ?? this.distance;
    c.save(); c.globalCompositeOperation = 'screen'; c.lineCap = 'round';
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1], b = this.trail[i];
        const age = clamp((this.time - b.time) / 1.15, 0, 1);
        const taper = Math.pow(1 - age, 1.7);
        c.strokeStyle = ['#b66b3c', '#e3ad63', '#fff1ca'][layer];
        c.globalAlpha = taper * [.08, .20, .41][layer];
        c.lineWidth = Math.max(.15, b.width * taper * [2.4, 1, .24][layer]);
        c.beginPath(); c.moveTo(a.worldX - distance, a.y); c.lineTo(b.worldX - distance, b.y); c.stroke();
      }
    }
    c.restore();
  }

  drawWisp(c) {
    const distance=this.renderDistance??this.distance,aura=this.getCollectorAuraState();
    c.save();
    if(aura?.active&&aura.radius>0){
      c.beginPath();
      for(let i=0;i<=72;i++){const a=i/72*TAU,r=aura.radius+(this.reducedMotion?0:Math.sin(a*7+this.time*3.8)*1.1);
        const x=this.player.x+Math.cos(a)*r,y=(this.renderPlayerY??this.player.y)+Math.sin(a)*r;
        if(i)c.lineTo(x,y);else c.moveTo(x,y);}
      c.closePath();c.strokeStyle='rgba(169,205,149,.15)';c.lineWidth=4;c.stroke();
      c.strokeStyle='rgba(169,205,149,.55)';c.lineWidth=1.5;c.stroke();
    }
    const palettes={collector:'#b9dfa0',protector:'#8fbfe8',leveler:'#a7e8df',swift:'#f2d48e',seer:'#d3b1f2',kindler:'#e4a3b5'};
    for(const state of this.getCompanionStates(this.renderPlayerY??this.player.y,this.visualTime??this.time)){
      const color=palettes[state.role],power=state.role==='collector'&&state.phase==='cooldown' ? .35+.65*state.recovery : 1;
      c.globalAlpha=power*.2;c.fillStyle=color;c.beginPath();c.arc(state.x,state.y,17,0,TAU);c.fill();
      c.globalAlpha=power;c.beginPath();c.arc(state.x,state.y,7,0,TAU);c.fill();
      c.fillStyle='#ffffe9';c.globalAlpha=power*.9;c.beginPath();c.arc(state.x-2,state.y-2,2,0,TAU);c.fill();
      if(state.carrying)drawPickup(c,state.x+9,state.y+6,{kind:state.cargoKind,time:this.time,tiny:true,reducedMotion:this.reducedMotion});
    }
    c.restore();
  }

  drawPhoenix(c) {
    const t = this.visualTime ?? this.time;
    const p = this.player, y = this.renderPlayerY ?? p.y;
    c.save(); c.translate(Math.round(p.x), Math.round(y));
    if(this.dying&&this.deathCause==='collision'){
      const progress=this.dyingProgress;c.fillStyle='#dce8d1';c.globalAlpha=1-progress;
      for(let i=0;i<24;i++){const a=i*2.39996,r=(i%5+1)*2+progress*(this.reducedMotion?3:20+i%7*4);
        c.fillRect(Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r+progress*progress*14),Math.max(1,4-Math.floor(progress*3)),Math.max(1,4-Math.floor(progress*3)));}
      c.restore();return;
    }
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(t * 4) * .035;
    const fade=this.dying?Math.max(.02,1-this.dyingProgress):1;
    c.scale(pulse*fade*.85, pulse*fade*.85);
    const core=13*Math.sqrt(clamp(this.flame/this.maxFlame,0,1));
    for(let yy=-17;yy<17;yy+=2)for(let xx=-17;xx<17;xx+=2){
      const radius=Math.hypot(xx+1,yy+1);if(radius>17)continue;
      const light=Math.round(clamp((core+3-radius)/5,0,1)*5)/5;
      c.fillStyle=radius>15?'#ccd9c5':`rgb(${44+Math.round(light*199)},${52+Math.round(light*191)},${54+Math.round(light*166)})`;
      c.fillRect(xx,yy,2,2);
    }
    if(this.hasCompanion('protector')){c.strokeStyle=this.shield.charges>0?'#8fbfe8':'#4a6171';c.lineWidth=1.5;c.globalAlpha=this.shield.charges>0?.6:.22;c.beginPath();c.arc(0,0,22,0,TAU*(this.shield.charges>0?1:.65));c.stroke();c.globalAlpha=1;}
    c.restore();
  }

  drawFireRibbons(c, boosted) {
    const phase = this.visualTime ?? this.time;
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const wave = Math.sin(phase * 9 + i * .9) * (boosted ? 9 : 5);
      c.strokeStyle = ['rgba(255,199,89,.62)', 'rgba(255,113,57,.45)', 'rgba(255,225,145,.48)', 'rgba(246,78,57,.36)'][i];
      c.lineWidth = (boosted ? 3.2 : 1.8) - i * .3;
      c.beginPath(); c.moveTo(-20, 5 + i * 2);
      c.bezierCurveTo(-38, 20 + wave, -53, -4 + wave, -(boosted ? 94 : 67) - i * 3, 11 + wave + i * 2); c.stroke();
    }
    c.restore();
  }

  getExitLandmark() {
    return getExitLandmarkState(this.layout,{distance:this.renderDistance??this.distance,
      width:this.width,height:this.height,playerX:this.player.x});
  }

  getExitPortal() { return this.getExitLandmark(); }

  drawPortal(c) {
    drawExitLandmark(c,{refuge:this.getExitLandmark(),terrain:this.terrain,
      time:this.visualTime??this.time,reducedMotion:this.reducedMotion});
  }

  drawProceduralPhoenix(c, boosted) {
    const flap = Math.sin(this.wingPhase * TAU / 6);
    const wingY = -21 - flap * 13;
    // Long individual tail feathers move independently from the wingbeat.
    for (let i = 0; i < 5; i++) {
      const wave = Math.sin(this.time * 5 + i * .7) * 5;
      c.strokeStyle = ['#ffb646', '#f26336', '#ffd46d', '#db4834', '#ff963f'][i];
      c.lineWidth = 4 - i * .45; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-12, 5 + i);
      c.bezierCurveTo(-25, 18 + wave, -34 - i * 3, 3 + wave, -48 - i * 4, 22 - i * 2 + wave); c.stroke();
    }
    const farWing = c.createLinearGradient(-22, wingY, 4, 8);
    farWing.addColorStop(0, '#ffc15c'); farWing.addColorStop(1, '#c84332');
    c.fillStyle = farWing; c.beginPath(); c.moveTo(-3, -5); c.quadraticCurveTo(-18, wingY - 8, -34, wingY + 4);
    c.lineTo(-25, wingY + 6); c.lineTo(-30, wingY + 14); c.lineTo(-19, wingY + 13); c.lineTo(-21, wingY + 23);
    c.quadraticCurveTo(-10, 12, 2, 6); c.closePath(); c.fill();
    const body = c.createLinearGradient(0, -13, 0, 14);
    body.addColorStop(0, '#ffe1a0'); body.addColorStop(.45, '#f29e42'); body.addColorStop(1, '#bd3e2b');
    c.fillStyle = body; c.beginPath(); c.ellipse(-2, 1, 21, 11, -.2, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(15, -8, 10, 9, -.25, 0, TAU); c.fill();
    const nearWing = c.createLinearGradient(0, wingY - 10, 0, 13);
    nearWing.addColorStop(0, '#ffe39a'); nearWing.addColorStop(.35, '#ffb348'); nearWing.addColorStop(1, '#dc5531');
    c.fillStyle = nearWing; c.beginPath(); c.moveTo(3, 5); c.quadraticCurveTo(-1, wingY - 4, -16, wingY - 15);
    c.lineTo(-14, wingY - 2); c.lineTo(-24, wingY - 8); c.lineTo(-19, wingY + 6); c.lineTo(-29, wingY + 3);
    c.quadraticCurveTo(-24, 5, -7, 9); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,235,178,.55)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 3); c.quadraticCurveTo(-4, wingY, -16, wingY - 9); c.stroke();
    c.fillStyle = '#ffe9af'; c.beginPath(); c.moveTo(22, -10); c.lineTo(32, -7); c.lineTo(22, -4); c.fill();
    c.fillStyle = '#f4bd53'; c.beginPath(); c.moveTo(11, -14); c.lineTo(4, -25); c.lineTo(16, -18); c.lineTo(16, -26); c.lineTo(22, -14); c.fill();
    c.fillStyle = '#172338'; c.beginPath(); c.arc(19, -10, 1.7, 0, TAU); c.fill();
    c.fillStyle = '#fff6d5'; c.beginPath(); c.arc(19.6, -10.5, .55, 0, TAU); c.fill();
  }

  drawWind(c, W, H) {
    for (const puff of this.getDraftPuffs(this.renderTime ?? this.time)) {
      const x = puff.x - (this.renderDistance ?? this.distance);
      if (x + puff.rx < 0 || x - puff.rx > W) continue;
      c.save(); c.beginPath(); c.ellipse(x, puff.y, puff.rx, puff.ry, 0, 0, TAU); c.clip();
      const direction = puff.direction < 0 ? -1 : 1;
      const warning = puff.phase === 'gather' || puff.phase === 'warning';
      const power = clamp(Number(puff.strength) || 0, 0, 1);
      c.strokeStyle = warning ? '#bcc7af' : '#c1d9d0';
      c.lineWidth = warning ? 1.5 : 2.2;
      for (let i = 0; i < 7; i++) {
        const phase = this.reducedMotion ? .18 + i * .105
          : (puff.progress * (warning ? .35 : 1.35) + i * .137) % 1;
        const px = x + (i % 3 - 1) * puff.rx * .48;
        const py = puff.y + (phase - .5) * puff.ry * 1.55 * direction;
        const edge = clamp((1 - ((px - x) / puff.rx) ** 2 - ((py - puff.y) / puff.ry) ** 2) / .5, 0, 1);
        c.globalAlpha = puff.opacity * edge * (warning ? .38 : .45 + power * .25);
        c.beginPath(); c.moveTo(px - 10, py - direction * 10);
        c.quadraticCurveTo(px + 11, py, px + 3, py + direction * 14); c.stroke();
      }
      c.globalAlpha = puff.opacity * (warning ? .62 : .84);
      for (let i = 0; i < (warning ? 1 : 2); i++) {
        const yy = puff.y + direction * (i * 12 - 5);
        c.beginPath(); c.moveTo(x, yy - direction * 8); c.lineTo(x, yy + direction * 4);
        c.moveTo(x - 6, yy - direction * 2); c.lineTo(x, yy + direction * 4);
        c.lineTo(x + 6, yy - direction * 2); c.stroke();
      }
      c.restore();
    }
  }

  drawForeground(c, W, H) {
    drawGuardianWarnings(c,{engine:this,distance:this.renderDistance});
    c.fillStyle = 'rgba(12,29,35,.8)';
    for (let i = -1; i < 14; i++) {
      const x = i * 39 - (((this.renderDistance ?? this.distance) * .8) % 39), y = H + 7;
      c.beginPath(); c.moveTo(x - 13, y); c.quadraticCurveTo(x + 4, y - 15 - Math.sin(i * 2.1) * 4, x + 17, y); c.fill();
    }
    const progress = clamp(this.time / this.duration, 0, 1);
    if (progress > .86) {
      const x = W + 100 - (progress - .86) / .14 * 100;
      const glow = c.createRadialGradient(x, H / 2, 0, x, H / 2, H * .45);
      glow.addColorStop(0, 'rgba(255,222,160,.30)'); glow.addColorStop(1, 'rgba(255,222,160,0)');
      c.fillStyle = glow; c.fillRect(0, 0, W, H);
    }
  }
}

// Preserve the simulation API used by existing saves and development tools.
export { WispFlight as PhoenixFlight };
