/* Emberwing's self-contained canvas flight simulation and renderer. */
import { FLAME_TUNING, LIGHT_PACKET_TUNING } from './vitality.mjs';
import { WispCompanion, wispHome } from './wisp.mjs';
import { getAscentInfo } from './ascent.mjs';
import { LEVEL_LENGTH, getLevelLengthScale } from './level-length.mjs';
import { resolveLevelIdentity } from './level-catalog.mjs';
import { DraftField, DRAFT_TUNING } from './drafts.mjs';
import { normalizeCompanionRole, getCompanionAbility } from './companion-abilities.mjs';
import { GRAVITY_TUNING, gravityRadius, updateGravityPackets } from './gravity.mjs';
import { populateSceneProps, scenePropPolygons } from './scene-props.mjs';
import { createTutorialState, buildTutorialLayout, recordTutorialPickup,
  updateTutorial, updateTutorialCompanion, getTutorialHint } from './tutorial.mjs';
export { FLAME_TUNING } from './vitality.mjs';
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
export const FLIGHT_TUNING = Object.freeze({ gravity: 300, flapImpulse: 205,
  forwardSpeed: 154, terminalFall: 245, pickupRadius: LIGHT_PACKET_TUNING.pickupRadius });
export { DRAFT_TUNING } from './drafts.mjs';
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
  levelId, stage = 0, lengthScale = 1 } = {}) {
  const ascent = getAscentInfo(stage);
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
  const appendSection = (kind, cells, repetition = 0, limit = extent, leg = 0) => {
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
        gap, phase: rng() * TAU, pattern: `${identity.scene}-${form}`,
        motion: terrain === 'canopy' ? height * (tight ? .003 : .008) : 0,
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
      // Keep the authored cells and center-change limits. Only their placement
      // in three paced legs changes; no new random passage geometry is added.
      for (let window = 0; window < requestedWindows; window++) {
        const target = lerp(leg.start, leg.end, (window + .35) / requestedWindows);
        const remaining = [];
        for (let next = window; next < requestedWindows; next++) {
          if (next > window) remaining.push(...course.rest);
          remaining.push(...course.hard);
        }
        // Spend spare room on recovery before each hard window, reserving
        // space for the remaining authored challenges whenever they fit.
        while (x < target && fits([...course.rest, ...remaining], leg.end)) {
          if (!appendSection('breather', course.rest, recovery++, leg.end, leg.index)) break;
        }
        if (!fits(course.hard, leg.end)) break;
        appendSection('challenge', course.hard, leg.index * requestedWindows + window, leg.end, leg.index);
        if (window < requestedWindows - 1) {
          if (!fits([...course.rest, ...course.hard], leg.end)) break;
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
      let clearance = pocket.first ? 28 : pocket.rich ? 22 : 21;
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
  // Optional dark niches are added after the complete food budget. They use
  // the same real surfaces and never occupy a compulsory challenge passage.
  const darkPerLeg = stage > 0 || elite ? (elite || stage >= 6 ? 2 : 1) : 0;
  const darkCount = darkPerLeg * legCount;
  if (darkCount) {
    const darkRng = seededRandom(`${seed}:${identity.id}:dark-packets`);
    const candidates = [], scale = height / 620;
    for (const obstacle of obstacles) {
      if (obstacle.hard || obstacle.gap < height * .38) continue;
      for (const side of [1, -1]) {
        const shape = side > 0 ? obstacle.bottomShape : obstacle.topShape;
        if (!shape) continue;
        const localX = obstacle.width * (.28 + darkRng() * .8), ex = obstacle.x + localX;
        if (ex < 1450 || ex > duration * speed - 650
          || sections.some(section => section.hard && ex > section.start - 110 && ex < section.end + 110)) continue;
        const edge = terrainEdgeY(shape, localX);
        if (!Number.isFinite(edge)) continue;
        const ey = obstacle.center + side * obstacle.gap / 2 + edge
          - side * (31 * scale + Math.abs(obstacle.motion));
        if (ey < 45 || ey > height - 45 || Math.abs(ey - obstacle.center) < 82 * scale) continue;
        if (embers.some(ember => Math.hypot(ember.x - ex, ember.y - ey) < 190)) continue;
        const clear = obstacles.every(other => [-1, 1].every(sign =>
          obstaclePolygons({ ...other, motion: 0, center: other.center + sign * Math.abs(other.motion) })
            .every(polygon => !circleHitsPolygon(ex, ey, 22, polygon))));
        if (clear) candidates.push({ x: ex, y: ey, anchor: obstacle.id,
          pocketSide: side > 0 ? 'ground' : 'ceiling' });
      }
    }
    const selected = [];
    for (let i = 0; i < darkCount; i++) {
      const fraction = legCount === 1 ? darkCount === 1 ? .56 : .40 + i * .32
        : (Math.floor(i / darkPerLeg) + (darkPerLeg === 1 ? .56 : .40 + (i % darkPerLeg) * .32)) / legCount;
      const target = duration * speed * fraction;
      const available = candidates.filter(site => selected.every(other => Math.abs(other.x - site.x) > 850));
      available.sort((a, b) => Math.abs(a.x - target) - Math.abs(b.x - target));
      if (!available.length) continue;
      const site = available[0]; selected.push(site);
      embers.push({ ...site, id: `dark-${i}`, kind: 'dark', harmful: true,
        value: 0, fuel: false, feature: 'dark-niche', pocket: true,
        collected: false, attracted: false, phase: darkRng() * TAU });
    }
  }
  const sceneProps = populateSceneProps({ obstacles, embers, terrain, height, seed,
    totalDistance: duration * speed, scene: identity.scene, circleHitsPolygon });
  // Both renderers and the collection broad phase rely on world-X ordering.
  embers.sort((a, b) => a.x - b.x);
  return { obstacles, embers, sections, sceneProps, levelIdentity: identity, ascent, lengthScale: legCount,
    legs: legs.map(leg => ({ ...leg, hardWindows: sections.filter(section => section.hard && section.leg === leg.index).length })),
    requestedHardWindowsPerLeg: requestedWindows, requestedHardWindows: requestedWindows * legCount,
    hardWindows: sections.filter(section => section.hard).length };
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
    this.options = options;
    this.companionRole = normalizeCompanionRole(options.companionRole);
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
    this.ascentInfo = getAscentInfo(route, Boolean(this.tutorial));
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
      warmCore: false, windSensitivity: 1, gravityPull: 1, steady: false, ...options.modifiers };
    this.alive = true;
    this.flame = clamp(Number.isFinite(options.flame) ? options.flame : FLAME_TUNING.starting, 0, FLAME_TUNING.maximum);
    this.flaps = 0; this.effortSpent = 0; this.flameRestored = 0;
    this.lastFlapTime = -1000;
    this.onUpdate = options.onUpdate || (() => {});
    this.onFinish = options.onFinish || (() => {});
    this.onPause = options.onPause || (() => {});
    this.width = 390; this.height = 620; this.pixelRatio = 1;
    this.time = 0; this.distance = 0; this.accumulator = 0; this.lastFrame = 0;
    this.running = false; this.paused = false; this.finished = false; this.destroyed = false;
    this.raf = null; this.score = 0; this.baseEmbers = 0; this.bonusEmbers = 0; this.collisions = 0;
    this.boosts = 0; this.boostTime = 0; this.cooldown = 0;
    this.abilityTime = 0; this.abilityStartedAt = -1000; this.levelRecovery = 0;
    this.exitProtection = 0; this.flash = 0; this.shake = 0;
    this.event = ''; this.eventUntil = 0; this.updateClock = 0;
    this.nearMisses = 0; this.destroyedThorns = 0; this.gustSeconds = 0;
    this.stormFeedClock = 0; this.warmCoreUsed = false;
    this.particles = []; this.trail = []; this.pickupEffects = []; this.emitClock = 0;
    this.absorptionEffects = []; this.absorptionSequence = 0;
    this.lightPenalties = []; this.lightDimming = 0;
    this.wispBoost = 0;
    this.cosmeticRng = seededRandom(`${this.seed}:cosmetics`);
    this.rigImage = null; this.background = null;
    this.audio = null; this.muted = false; this.lastFlapSound = 0;
    this.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._resize = this.resize.bind(this);
    this._visibility = () => {
      if (typeof document !== 'undefined' && document.hidden && this.running && !this.paused) this.pause(true);
    };
    this._orientation = () => { if (this.running && !this.paused) this.pause(true); this.resize(); };
    this.resize();
    this.player = { x: 98, y: this.height * .5, vy: 0, radius: 11 };
    this.wisp = new WispCompanion(wispHome(this.player, this.time));
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    this.visualBank = 0; this.wingPhase = 0;
    this.layout = this.tutorial
      ? buildTutorialLayout({ lesson: this.tutorial.lesson, duration: this.duration,
        height: this.height, speed: FLIGHT_TUNING.forwardSpeed })
      : buildFlightLayout({ seed: this.seed, terrain: this.terrain,
        elite: this.elite, duration: this.duration, speed: FLIGHT_TUNING.forwardSpeed, height: this.height,
        passage: this.passage, fuelCadence: this.fuelCadence,
        levelId: this.levelIdentity.id, stage: this.ascentInfo.row, lengthScale: this.lengthScale });
    this.drafts = new DraftField({ seed: this.seed, terrain: this.terrain, elite: this.elite,
      duration: this.duration, height: this.height, totalDistance: this.totalDistance,
      layout: this.layout, lesson: this.tutorial?.lesson || null, lengthScale: this.lengthScale });
    this.challengeIndex = Math.floor(seededRandom(`${this.seed}:challenge`)() * 3);
    this.challengeId = options.challengeId || options.node?.challengeId || ['wisps', 'clean', 'boosts'][this.challengeIndex];
    this.challengeTarget = Number(options.challengeTarget ?? options.node?.challengeTarget) || (this.challengeId === 'wisps' ? 7 : this.challengeId === 'boosts' ? 2 : 0);
    this.challengeText = this.challengeId === 'wisps' || this.challengeId === 'boosts' && this.companionAbility.passive
      ? `Collect ${this.challengeTarget} light packets`
      : this.challengeId === 'boosts' ? `Use your ability ${this.challengeTarget} times` : 'Finish without a hit';
    this.stars = Array.from({ length: 45 }, () => ({ x: this.cosmeticRng() * 390,
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
    if (typeof window !== 'undefined' && this.canvas.ownerDocument) this.initPixelView();
  }

  async initPixelView() {
    try {
      const { WispFlightView } = await import('./wisp-renderer.mjs');
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
  get baseSpeed() { return FLIGHT_TUNING.forwardSpeed * clamp(Number(this.mod.speed) || 1, .80, 1.25) * (this.elite ? 1.045 : 1); }
  get abilityDuration() { return this.companionAbility.duration * clamp(Number(this.mod.boostDuration) || 1, .5, 2.5); }
  get abilityCooldown() { return this.companionAbility.cooldown * clamp(Number(this.mod.boostCooldown) || 1, .35, 2); }
  get boostDuration() { return this.abilityDuration; }
  get boostCooldown() { return this.abilityCooldown; }
  get flapCost() { return Math.round(FLAME_TUNING.flapCost * this.flameDrain); }
  get wingRate() { return this.boostTime > 0 ? 9 : this.flame < this.flapCost ? .45 : 5.8; }
  get embers() { return Math.floor((this.baseEmbers + this.bonusEmbers) * Math.max(0, Number(this.mod.reward) || 1) * this.routeReward); }

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
    const oldHeight = this.height;
    this.height = clamp(390 * cssHeight / cssWidth, 430, 850);
    this.pixelRatio = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    this.canvas.width = Math.round(cssWidth * this.pixelRatio);
    this.canvas.height = Math.round(cssHeight * this.pixelRatio);
    this.ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
    if (this.player && oldHeight !== this.height) {
      const factor = this.height / oldHeight;
      this.player.y *= factor; this.player.vy *= factor;
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
      this.stars.forEach(s => { s.y *= factor; });
      this.particles.length = 0;
      this.wisp.y *= factor; this.wisp.previousY = this.wisp.y; this.wisp.history.length = 0;
      this.pickupEffects.length = 0;
      this.absorptionEffects.length = 0;
      this.trail.length = 0;
    }
    if (this.player && (!this.running || this.paused)) this.render();
    this.pixiView?.resize();
  }

  start() {
    if (this.destroyed || this.finished || this.running) return;
    this.running = true; this.paused = false; this.lastFrame = 0;
    if (this.tutorial) this.notify();
    this.raf = requestAnimationFrame(t => this.tick(t));
  }

  flap() {
    if (!this.running || this.paused || this.finished || !this.alive) return false;
    if (this.companionRole === 'anchor' && this.abilityTime > 0) {
      this.abilityTime = 0;
      this.levelRecovery = .25;
    }
    if (this.flame < this.flapCost) {
      this.setEvent('Flame exhausted · glide toward an ember'); this.notify();
      return false;
    }
    this.flame -= this.flapCost;
    this.flaps++; this.effortSpent += this.flapCost;
    this.lastFlapTime = this.time;
    this.player.vy = -FLIGHT_TUNING.flapImpulse * this.scaleY * clamp(Number(this.mod.flap) || 1, .80, 1.20);
    if (this.tutorialAwaitingLift) {
      this.tutorialAwaitingLift = false;
      this.accumulator = 0; this.lastFrame = 0;
    }
    this.burst(this.player.x - 10, this.player.y + 7, 5, '#ffbd53');
    this.sound('flap');
    this.notify();
    return true;
  }

  activateAbility() {
    if (this.companionAbility.passive) return false;
    if (!this.running || this.paused || this.finished || !this.alive || this.cooldown > .001 || this.abilityTime > 0) return false;
    if (this.tutorialAwaitingLift) return false;
    this.abilityTime = this.abilityDuration;
    this.abilityStartedAt = this.time;
    this.boostTime = this.companionRole === 'swift' ? this.abilityTime : 0;
    this.cooldown = this.abilityCooldown;
    this.boosts++;
    if (this.companionRole === 'swift') this.player.vy *= .65;
    if (this.companionRole === 'anchor') this.levelRecovery = 0;
    this.setEvent(`${this.companionAbility.name} · ${this.companionAbility.label}`);
    this.burst(this.player.x - 10, this.player.y, this.companionRole === 'swift' ? 23 : 10, '#e6e4d3');
    this.sound('boost');
    this.notify();
    return true;
  }

  boost() { return this.activateAbility(); }

  pause(fromSystem = false) {
    if (!this.running || this.paused || this.finished || this.destroyed) return;
    this.paused = true; this.lastFrame = 0;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null; this.notify(); this.onPause({ fromSystem });
  }

  resume() {
    if (!this.running || !this.paused || this.finished || this.destroyed) return;
    this.paused = false; this.lastFrame = 0; this.accumulator = 0;
    this.raf = requestAnimationFrame(t => this.tick(t));
    this.notify();
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.muted && this.audio?.state === 'running') this.audio.suspend().catch(() => {});
  }

  destroy() {
    this.destroyed = true; this.running = false;
    this.absorptionEffects.length = 0;
    this.lightPenalties.length = 0;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._resize);
      window.removeEventListener('orientationchange', this._orientation);
      document.removeEventListener('visibilitychange', this._visibility);
    }
    if (this.audio) this.audio.close().catch(() => {});
    this.pixiView?.destroy();
    this.pixiView = null;
    this.particles.length = 0;
    this.trail.length = 0;
  }

  tick(timestamp) {
    if (!this.running || this.paused || this.destroyed || this.finished) return;
    if (this.tutorialAwaitingLift) {
      this.lastFrame = timestamp; this.accumulator = 0;
      this.render();
      this.raf = requestAnimationFrame(t => this.tick(t));
      return;
    }
    if (!this.lastFrame) this.lastFrame = timestamp;
    const elapsed = Math.min(.10, Math.max(0, (timestamp - this.lastFrame) / 1000));
    this.lastFrame = timestamp;
    this.accumulator = Math.min(this.accumulator + elapsed, STEP * 6);
    while (this.accumulator >= STEP && !this.finished) {
      this.step(STEP); this.accumulator -= STEP;
    }
    if (this.finished || this.destroyed) return;
    this.render();
    if (!this.finished && !this.destroyed) this.raf = requestAnimationFrame(t => this.tick(t));
  }

  getDraftPuffs(time = this.time) { return this.drafts?.visible(time) || []; }

  gustState() {
    return this.drafts.sample(this.time, this.distance + this.player.x,
      this.player.y, this.mod.windSensitivity);
  }

  obstacleCenter(obstacle) {
    return obstacle.center + Math.sin(this.time * .9 + obstacle.phase) * obstacle.motion;
  }

  getWispState(y = this.player.y, time = this.time) {
    return this.wisp.state(this, y, time);
  }

  getAbilityState() {
    if (this.companionAbility.passive) return {
      id: this.companionRole, role: this.companionRole, action: this.companionAbility.action,
      label: this.companionAbility.label, passive: true, active: this.isCompanionWorking(),
      remaining: 0, duration: 0, cooldown: 0, cooldownTotal: 0, ready: false, progress: 1 };
    const active = this.abilityTime > 0;
    return { id: this.companionRole, role: this.companionRole,
      action: this.companionAbility.action, label: this.companionAbility.label,
      passive: false,
      active, remaining: this.abilityTime, duration: this.abilityDuration,
      cooldown: this.cooldown, cooldownTotal: this.abilityCooldown,
      ready: this.alive && !this.finished && !this.destroyed && !this.tutorialAwaitingLift
        && this.cooldown <= .001 && !active,
      progress: clamp(active ? 1 - this.abilityTime / this.abilityDuration : 1 - this.cooldown / this.abilityCooldown, 0, 1) };
  }

  getLightState() {
    const configured = Number(this.mod.lightRadius);
    const baseRadius = Number.isFinite(configured) && configured > 0 ? configured : LIGHT_PACKET_TUNING.baseRadius;
    const reduction = clamp(this.lightDimming, 0, 1 - LIGHT_PACKET_TUNING.minimumLight);
    const revealBonus = 0, revealedRadius = baseRadius;
    return { baseRadius, revealedRadius, revealBonus, radius: revealedRadius * (1 - reduction),
      intensity: 1 - reduction * .65, dimmed: reduction > .005,
      stacks: this.lightPenalties.length,
      remaining: Math.max(0, ...this.lightPenalties.map(until => until - this.time)),
      maximumStacks: LIGHT_PACKET_TUNING.darkMaximumStacks,
      penaltyPerStack: LIGHT_PACKET_TUNING.darkPenalty };
  }

  getGravityState() {
    const active = this.companionRole === 'gravity' && this.isCompanionWorking();
    return { active, radius: gravityRadius(this.mod.attract), maxRadius: GRAVITY_TUNING.maxRange,
      passive: true, strength: active ? 1 : 0,
      pullMultiplier: clamp(Number(this.mod.gravityPull) || 1, 1, 2),
      x: this.player.x, y: this.player.y, worldX: this.distance + this.player.x,
      remaining: 0, duration: 0 };
  }

  isCompanionWorking() {
    return this.companionAbility.passive
      ? this.running && this.alive && !this.paused && !this.finished && !this.destroyed && !this.tutorialAwaitingLift
      : this.abilityTime > 0;
  }

  quickenCompanionRecovery(source) {
    if (this.companionAbility.passive) {
      const before = this.wisp.cooldown;
      this.wisp.cooldown = Math.max(0, before - 1);
      this.setEvent(`${source} · Collector recovery${before > 0 ? ' −1s' : ' ready'}`);
    } else {
      this.cooldown = Math.max(0, this.cooldown - 1);
      this.setEvent(`${source} · ${this.companionAbility.label} −1s`);
    }
  }

  packetPositionClear(worldX, y) {
    if (y < 31 || y > this.height - 32) return false;
    for (const obstacle of this.layout.obstacles) {
      if (obstacle.destroyed || worldX + 4 < obstacle.x - obstacle.width * .8
        || worldX - 4 > obstacle.x + obstacle.width * 2.5) continue;
      if (obstaclePolygons(obstacle, this.time).some(polygon => circleHitsPolygon(worldX, y, 4, polygon))) return false;
    }
    return true;
  }

  absorbPacket(ember, kind) {
    const origin = ember.deliveredByWisp ? this.getWispState()
      : { x: ember.x - this.distance, y: ember.y };
    const dx = origin.x - this.player.x, dy = origin.y - this.player.y;
    const duration = LIGHT_PACKET_TUNING.absorptionDuration;
    this.absorptionEffects.push({ id: `absorb:${this.absorptionSequence++}`, kind,
      startX: origin.x, startY: origin.y, initialAngle: Math.atan2(dy, dx),
      startRadius: Math.hypot(dx, dy), bornAt: this.time, duration, life: duration });
    while (this.absorptionEffects.length > LIGHT_PACKET_TUNING.absorptionLimit) this.absorptionEffects.shift();
  }

  step(dt) {
    if (this.destroyed || this.finished || !this.alive || this.tutorialAwaitingLift) return;
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    this.time += dt;
    this.lightPenalties = this.lightPenalties.filter(until => until > this.time);
    const dimTarget = this.lightPenalties.reduce((sum, until) => {
      const fade = clamp((until - this.time) / LIGHT_PACKET_TUNING.recoveryFade, 0, 1);
      return sum + LIGHT_PACKET_TUNING.darkPenalty * fade * fade * (3 - 2 * fade);
    }, 0);
    this.lightDimming = lerp(this.lightDimming, dimTarget, 1 - Math.exp(-dt * LIGHT_PACKET_TUNING.dimResponse));
    this.wingPhase += dt * this.wingRate;
    const oldBoost = this.boostTime, oldAbility = this.abilityTime;
    this.abilityTime = Math.max(0, this.abilityTime - dt);
    this.boostTime = this.companionRole === 'swift' ? this.abilityTime : 0;
    this.levelRecovery = Math.max(0, this.levelRecovery - dt);
    if (this.companionRole === 'anchor' && oldAbility > 0 && this.abilityTime === 0) this.levelRecovery = .25;
    const wispTarget = this.isCompanionWorking() && this.cards.has('hungry-wisp') ? 1 : 0;
    this.wispBoost += clamp(wispTarget - this.wispBoost, -dt * 5, dt * 5);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.exitProtection = Math.max(0, this.exitProtection - dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt * 18);
    if (oldBoost > 0 && this.boostTime === 0) this.exitProtection = .45;
    this.distance += this.baseSpeed * (this.boostTime > 0 ? 1.48 : 1) * dt;

    this.drafts.update(this.time, this.distance + this.player.x,
      this.baseSpeed * (this.boostTime > 0 ? 1.48 : 1));
    const gust = this.gustState();
    const leveling = this.companionRole === 'anchor' && this.abilityTime > 0;
    let gravityBlend = leveling ? 0 : 1;
    if (!leveling && this.levelRecovery > 0) {
      const t = 1 - this.levelRecovery / .25;
      gravityBlend = t * t * (3 - 2 * t);
    }
    if (leveling) this.player.vy *= Math.exp(-dt * 12);
    let gravity = FLIGHT_TUNING.gravity * this.scaleY * clamp(Number(this.mod.gravity) || 1, .80, 1.20) * gravityBlend;
    if (gust.active) {
      this.gustSeconds += dt;
      // Boost can break through a downdraft or arrest an unwanted updraft.
      // Wind resistance fades out briefly after the burst. It gives no
      // immunity to terrain or the playfield boundary.
      const windGuard = this.boostTime > 0 ? 1 - WIND_TUNING.boostResistance
        : 1 - WIND_TUNING.boostResistance * clamp(this.exitProtection / .45, 0, 1);
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
    this.player.vy = clamp(this.player.vy + gravity * dt, -520 * this.scaleY, FLIGHT_TUNING.terminalFall * this.scaleY);
    this.player.y += this.player.vy * dt;
    const breathingBank = Math.sin(this.wingPhase * TAU / 6) * .012;
    this.visualBank = lerp(this.visualBank, clamp(this.player.vy / (690 * this.scaleY), -.30, .35) + breathingBank, 1 - Math.exp(-dt * 9));

    if (this.player.y < 27 || this.player.y > this.height - 28) {
      this.hit(null);
      return;
    }

    for (const obstacle of this.layout.obstacles) {
      const x = obstacle.x - this.distance;
      if (x > this.width + 250) break;
      if (x + obstacle.width * 2.5 < -30 || obstacle.destroyed) continue;
      const center = this.obstacleCenter(obstacle);
      const top = center - obstacle.gap / 2, bottom = center + obstacle.gap / 2;
      const polygons = obstaclePolygons(obstacle, this.time);
      const colliding = polygons.some(polygon => circleHitsPolygon(this.distance + this.player.x, this.player.y, this.player.radius, polygon));
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

    const gravityField = this.getGravityState();
    if (updateGravityPackets(this.layout.embers, { ...gravityField, dt, time: this.time,
      positionClear: (worldX, y) => this.packetPositionClear(worldX, y) }))
      this.layout.embers.sort((a, b) => a.x - b.x);

    for (const ember of this.layout.embers) {
      if (ember.collected || ember.carried) continue;
      const x = ember.x - this.distance;
      if (x < -40 || x > this.width + 20) continue;
      if (Math.hypot(this.player.x - x, this.player.y - ember.y) < FLIGHT_TUNING.pickupRadius) this.collect(ember);
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
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 8 * dt;
      p.rotation = Math.atan2(p.vy, p.vx);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    this.updateClock += dt;
    if (this.updateClock >= .10) { this.updateClock = 0; this.notify(); }
    if (!this.finished && this.distance >= this.totalDistance) this.finish(true);
  }

  hit(obstacle) {
    if (!this.alive || this.finished || this.destroyed) return;
    if (obstacle) obstacle.hit = true;
    this.collisions++;
    this.alive = false;
    this.flash = .22; this.shake = this.reducedMotion ? 0 : 4;
    this.setEvent('Collision · attempt ended');
    this.burst(this.player.x, this.player.y, 18, '#ff9b77'); this.sound('hit');
    this.finish(false);
  }

  collect(ember) {
    if (ember.collected || !this.alive || this.finished || this.destroyed) return;
    const harmful = ember.harmful || ember.kind === 'dark';
    if (harmful) {
      // Body-only hazard: never turn a stale carrier reservation into a hit.
      if (ember.deliveredByWisp) return;
      ember.collected = true;
      this.absorbPacket(ember, 'dark');
      if (this.lightPenalties.length >= LIGHT_PACKET_TUNING.darkMaximumStacks) this.lightPenalties.shift();
      this.lightPenalties.push(this.time + LIGHT_PACKET_TUNING.darkDuration);
      this.setEvent('Light dimmed');
      return;
    }
    if (this.tutorial) recordTutorialPickup(this, ember);
    ember.collected = true;
    this.absorbPacket(ember, 'light');
    const cleansed = !ember.generated && this.lightPenalties.length > 0;
    if (cleansed) this.lightPenalties.pop();
    const fuel = ember.generated ? FLAME_TUNING.generatedFuel
      : (ember.value === 3 ? FLAME_TUNING.heartFuel : FLAME_TUNING.emberFuel)
        + this.fuelBonus + clamp(Number(this.mod.cacheFuelBonus) || 0, 0, 32);
    const restored = Math.min(fuel, FLAME_TUNING.maximum - this.flame);
    this.flame += restored; this.flameRestored += restored;
    const origin = ember.deliveredByWisp ? this.getWispState() : this.player;
    this.pickupEffects.push({ x: origin.x, y: origin.y,
      value: ember.value === 3 ? 3 : 1, restored, life: .72 });
    if (this.pickupEffects.length > 12) this.pickupEffects.shift();
    // Converted thorns earn currency, but cannot feed pickup-triggered cards
    // and create an unbounded collection / boost / conversion loop.
    if (ember.generated) {
      this.bonusEmbers++; this.score += 5;
      this.burst(this.player.x - 9, this.player.y + 7, 3, '#ffd5a1');
      this.sound('collect');
      return;
    }
    this.baseEmbers++;
    const value = ember.value === 3 ? 3 : 1;
    this.bonusEmbers += value - 1;
    this.score += value * ((ember.boostedPickup ?? this.isCompanionWorking()) && this.cards.has('golden-wake') ? 20 : 10);
    this.burst(this.player.x - 9, this.player.y + 7, value === 3 ? 14 : 5, value === 3 ? '#fff2c4' : '#ffe4a2');
    if (value === 3) this.setEvent(restored > 0 ? `Glow cache · +${restored} Glow` : 'Glow full');
    else if (restored > 0 && this.flame <= 45) this.setEvent(`Glow rekindled · +${restored}`);
    if (this.cards.has('kindled-spirit') && this.baseEmbers % 3 === 0) {
      this.quickenCompanionRecovery('Kindled Spirit');
    }
    if ((this.mod.warmCore || this.cards.has('warm-heart')) && this.baseEmbers >= (FLAME_TUNING.warmCorePickups || 4) && !this.warmCoreUsed) {
      this.warmCoreUsed = true;
      const bonus = Math.min(12, FLAME_TUNING.maximum - this.flame);
      this.flame += bonus; this.flameRestored += bonus;
      this.pickupEffects.at(-1).restored += bonus;
      this.setEvent(bonus > 0 ? `Warm Core · +${bonus} Glow` : 'Warm Core · Glow full');
      this.burst(this.player.x, this.player.y, 12, '#ffd79a');
    }
    if (cleansed) this.setEvent('Light restored · dark packet cleansed');
    this.sound('collect');
  }

  challengeComplete() {
    return this.challengeId === 'wisps' ? this.baseEmbers >= this.challengeTarget
      : this.challengeId === 'boosts' ? (this.companionAbility.passive ? this.baseEmbers : this.boosts) >= this.challengeTarget : this.collisions === 0;
  }

  getState() {
    return { alive: this.alive, score: Math.floor(this.score), embers: this.embers,
      ascent: this.ascentInfo,
      flame: this.flame, maxFlame: FLAME_TUNING.maximum, flapCost: this.flapCost,
      canFlap: this.alive && !this.finished && this.flame >= this.flapCost, flaps: this.flaps,
      wisp: this.getWispState(),
      ability: this.getAbilityState(),
      light: this.getLightState(),
      gravityField: this.getGravityState(),
      collected: this.baseEmbers, boostCooldown: this.cooldown,
      boostCooldownTotal: this.boostCooldown, boostDurationTotal: this.boostDuration,
      boostReady: this.getAbilityState().ready,
      boostActive: this.boostTime > 0,
      boostTime: this.boostTime, progress: clamp(this.distance / this.totalDistance, 0, 1),
      event: this.time < this.eventUntil ? this.event : '',
      renderer: this.pixiReady ? 'pixel-canvas' : 'canvas',
      paused: this.paused, finished: this.finished, reducedMotion: this.reducedMotion,
      tutorialHintState: getTutorialHint(this), tutorialAwaitingLift: this.tutorialAwaitingLift,
      time: this.time, remaining: Math.max(0, (this.totalDistance - this.distance) / this.baseSpeed),
      challenge: this.challengeText, challengeComplete: this.challengeComplete() };
  }

  notify() { if (!this.destroyed) this.onUpdate(this.getState()); }

  setEvent(value) { this.event = value; this.eventUntil = this.time + 2.2; }

  finish(success) {
    if (this.finished || this.destroyed) return;
    this.finished = true; this.running = false;
    this.alive = Boolean(success) && this.alive;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    const result = { success: Boolean(success) && this.alive, alive: this.alive, embers: this.embers,
      flame: this.flame,
      score: Math.floor(this.score), collected: this.baseEmbers, collisions: this.collisions,
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
    c.save();
    if (this.shake > 0) c.translate(Math.sin(this.time * 77) * this.shake, Math.cos(this.time * 63) * this.shake * .5);
    this.drawWind(c, W, H);
    for (const o of this.layout.obstacles) {
      const x = o.x - this.renderDistance;
      if (x > W + 250) break;
      if (x + o.width * 2.5 < -70 || o.destroyed) continue;
      this.drawObstacle(c, o, x, H);
    }
    this.drawEmbers(c);
    this.drawFlightTrail(c);
    this.drawParticles(c);
    this.drawWisp(c);
    this.drawPhoenix(c);
    this.drawPickups(c);
    this.drawPortal(c, W, H);
    this.drawForeground(c, W, H);
    c.restore();
    if (this.flash > 0) { c.fillStyle = `rgba(255,196,149,${this.flash * .36})`; c.fillRect(0, 0, W, H); }
    const vignette = c.createRadialGradient(W / 2, H * .43, W * .3, W / 2, H * .45, H * .8);
    vignette.addColorStop(0, 'rgba(5,12,24,0)'); vignette.addColorStop(1, 'rgba(5,12,24,.36)');
    c.fillStyle = vignette; c.fillRect(0, 0, W, H);
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
      if (ember.harmful || ember.kind === 'dark') {
        c.save(); c.fillStyle = '#0a0911'; c.strokeStyle = '#776881'; c.lineWidth = 1;
        c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#afa5bb'; c.fillRect(Math.round(x - 2), Math.round(y - 3), 1, 1);
        c.restore(); continue;
      }
      const rich = ember.value === 3;
      c.save(); c.translate(x, y);
      c.fillStyle = 'rgba(255,161,62,.20)'; c.beginPath();
      c.ellipse(-10, 0, rich ? 26 : 17, rich ? 6 : 3, 0, 0, TAU); c.fill();
      if (rich) {
        c.fillStyle = 'rgba(255,156,68,.17)'; c.beginPath(); c.arc(0, 0, 23, 0, TAU); c.fill();
        c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff0c9';
        c.fillText('3', 0, 26);
      }
      for (let j = 0; j < (rich ? 3 : 1); j++) {
        const angle = animation * 2 + ember.phase + j * TAU / 3;
        c.fillStyle = '#ffdf8f'; c.beginPath();
        c.arc(Math.cos(angle) * (rich ? 17 : 10), Math.sin(angle) * (rich ? 11 : 6), 1.3, 0, TAU); c.fill();
      }
      if (rich) c.scale(1.65, 1.65);
      c.translate(-x, -y);
      c.fillStyle = 'rgba(255,201,111,.10)'; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,215,139,.21)'; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill();
      c.fillStyle = '#ffdca0'; c.beginPath(); c.moveTo(x, y - 5); c.quadraticCurveTo(x + 6, y - 1, x + 2, y + 5);
      c.quadraticCurveTo(x - 5, y + 6, x - 4, y); c.quadraticCurveTo(x - 2, y - 2, x, y - 5); c.fill();
      c.fillStyle = '#fff4d1'; c.beginPath(); c.ellipse(x, y + 1, 1.5, 2.5, .4, 0, TAU); c.fill();
      c.restore();
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
      c.fillText(effect.restored > 0 ? `+${effect.restored} GLOW` : `+${effect.value}`, effect.x + 15, effect.y - 22 - (this.reducedMotion ? 0 : t * 32));
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
    const state = this.getWispState(this.renderPlayerY ?? this.player.y, this.visualTime ?? this.time);
    const { x, y, homeX, homeY, radius: reach, recovery, phase, carrying } = state;
    c.save();
    const field = c.createRadialGradient(homeX, homeY, 0, homeX, homeY, reach);
    field.addColorStop(0, phase === 'ready' ? 'rgba(119,245,214,.08)' : 'rgba(119,245,214,.025)');
    field.addColorStop(1, 'rgba(119,245,214,0)');
    c.fillStyle = field; c.fillRect(homeX - reach, homeY - reach, reach * 2, reach * 2);
    c.strokeStyle = phase === 'ready' ? 'rgba(151,246,220,.18)' : 'rgba(151,246,220,.05)'; c.lineWidth = .8;
    c.beginPath(); c.arc(homeX, homeY, reach, 0, TAU); c.stroke();
    if (phase === 'cooldown') {
      c.strokeStyle = 'rgba(151,246,220,.7)'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(homeX, homeY, 13, -Math.PI / 2, -Math.PI / 2 + TAU * recovery); c.stroke();
    }
    const history = this.wisp.history;
    c.strokeStyle = carrying ? '#ffdc99' : '#e9efff'; c.lineWidth = 1.4;
    for (let i = 1; i < history.length; i++) {
      c.globalAlpha = i / history.length * .6; c.beginPath();
      c.moveTo(history[i - 1].x - (this.renderDistance ?? this.distance), history[i - 1].y);
      c.lineTo(history[i].x - (this.renderDistance ?? this.distance), history[i].y); c.stroke();
    }
    c.globalAlpha = 1;
    const glow = c.createRadialGradient(x, y, 0, x, y, 28);
    glow.addColorStop(0, 'rgba(250,252,255,.8)');
    glow.addColorStop(.35, 'rgba(230,240,255,.25)'); glow.addColorStop(1, 'rgba(230,240,255,0)');
    c.fillStyle = glow; c.fillRect(x - 28, y - 28, 56, 56);
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
    if (carrying) { c.fillStyle = '#ffd38a'; c.beginPath(); c.ellipse(x + 8, y + 3, 3, 5, 0, 0, TAU); c.fill(); }
    c.restore();
  }

  drawPhoenix(c) {
    const t = this.visualTime ?? this.time;
    const p = this.player, y = this.renderPlayerY ?? p.y;
    c.save(); c.translate(Math.round(p.x), Math.round(y));
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(t * 4) * .035;
    c.scale(pulse, pulse);
    for (const [radius, ink] of [[19, '#688d80'], [17, '#c6d8c6'], [13, '#f3f6e6']]) {
      c.fillStyle = ink; c.beginPath(); c.arc(0, 0, radius, 0, TAU); c.fill();
    }
    c.fillStyle = '#fffff1'; c.beginPath(); c.arc(-4, -4, 5, 0, TAU); c.fill(); c.restore();
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
    const remaining = (this.totalDistance - this.distance) / this.baseSpeed;
    if (remaining > 2.5) return null;
    const progress = clamp(1 - remaining / 2.5, 0, 1);
    return { x: this.player.x + this.totalDistance - (this.renderDistance ?? this.distance),
      y: this.height * .5, progress };
  }

  // Retain the old renderer hook for development tools; this is a refuge light.
  getExitPortal() { return this.getExitLandmark(); }

  drawPortal(c, W, H) {
    const refuge = this.getExitLandmark();
    if (!refuge) return;
    c.save(); c.translate(refuge.x, refuge.y);
    const glow = c.createRadialGradient(0, 0, 2, 0, 0, 60);
    glow.addColorStop(0, 'rgba(231,235,202,.20)'); glow.addColorStop(1, 'rgba(174,199,168,0)');
    c.fillStyle = glow; c.fillRect(-60, -60, 120, 120);
    c.fillStyle = '#434a3e'; c.fillRect(-21, 23, 42, 8); c.fillRect(-15, 17, 30, 7);
    c.fillStyle = '#6d7460'; c.fillRect(-16, 23, 19, 2); c.fillRect(-11, 17, 18, 2);
    c.strokeStyle = '#515443'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-12, 18); c.lineTo(-14, -24); c.lineTo(5, -28); c.stroke();
    c.strokeStyle = '#85846b'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, -27); c.lineTo(3, -13); c.stroke();
    c.fillStyle = '#777d66'; c.fillRect(-5, -14, 16, 3); c.fillRect(-5, 7, 16, 3);
    c.fillStyle = '#c9cfaa'; c.fillRect(-2, -10, 10, 16);
    c.fillStyle = '#f0efd2'; c.fillRect(1, -7, 4, 10);
    c.restore();
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
      c.strokeStyle = `rgba(184,207,205,${puff.opacity * .34})`; c.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const phase = this.reducedMotion ? .5 : (puff.progress + i * .137) % 1;
        const px = x + (i % 3 - 1) * puff.rx * .48;
        const py = puff.y + (phase - .5) * puff.ry * 1.6 * -puff.direction;
        c.beginPath(); c.moveTo(px - 11, py + puff.direction * 8);
        c.quadraticCurveTo(px + 10, py, px + 4, py - puff.direction * 13); c.stroke();
      }
      c.beginPath(); c.moveTo(x - 4, puff.y + puff.direction * 3);
      c.lineTo(x, puff.y - puff.direction * 3); c.lineTo(x + 4, puff.y + puff.direction * 3); c.stroke();
      c.restore();
    }
  }

  drawForeground(c, W, H) {
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
