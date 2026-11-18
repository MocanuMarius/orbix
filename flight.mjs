import {prepareEnvironmentArt,drawNearLandscape,drawTerrainForeground,releaseTerrainForeground} from './authored-environment.mjs?v=finish-1';
import {castTerrainLight,releaseTerrainLight} from './terrain-light.mjs?v=finish-1';
import {drawTerrainEcology,drawHabitatBackdrop} from './terrain-ecology.mjs?v=finish-1';
import {drawCourseArt} from './authored-environment.mjs?v=finish-1';
import {drawTerrainBoundary,beginTerrainBoundaryFrame,endTerrainBoundaryFrame,releaseTerrainBoundaryFrame} from './terrain-boundary.mjs?v=finish-1';
import {getContactEdgePalette} from './contact-edge-palettes.mjs?v=finish-1';
import {prepareAtlasFlight,resizeAtlasFlight,ringBellwind,bellwindAcceleration,moonLightScale,drawAtlasFlight} from './atlas-flight.mjs?v=finish-1';
import {canShowFlightHint} from './flight-hint-safety.mjs?v=finish-1';
import {updateGlideRegeneration} from './glide-regeneration.mjs?v=finish-1';
import {applyDirectPickupCards,updatePrismWick} from './card-standalone.mjs?v=finish-1';
import {drawGuardianPresence} from './guardian-presence.mjs?v=finish-1';
import { updateGuardian, resizeGuardian, placeGuardianFuel } from './guardian-effects.mjs?v=finish-1';
import { drawGuardianWarnings } from './guardian-art.mjs?v=finish-1';
import { drawShutters, resizeShutters } from './shutter-cone.mjs?v=finish-1';
import { inLanternRoom, installPassageLanterns, lanternField } from './lantern-layout.mjs?v=finish-1';
import {drawProximityMeter} from './proximity-meter.mjs?v=finish-1';
import {drawStarterCues} from './starter-cues.mjs?v=finish-1';
import {drawFourthBeat} from './fourth-beat-art.mjs?v=finish-1';
import {drawCollectorField} from './collector-field-art.mjs?v=finish-1';
import {activateFieldImpulse,fieldImpulseSpeed,fieldImpulseGravity,fieldImpulseVelocity,fieldImpulseStrength} from './collector-impulse.mjs?v=finish-1';
import {buildObjectivePlan,createFlightObjective,drawObjectiveMarks} from './flight-objectives.mjs?v=finish-1';
import {FlightProjection,LiftGuide,drawFlightProjection,drawLiftGuide} from './flight-projection.mjs?v=finish-1';
import {drawGlowSense} from './glow-sense.mjs?v=finish-1';
import {formatGlow} from './vitality.mjs?v=finish-1';
import {installRiskChains} from './risk-chains.mjs?v=finish-1';
import {installSparkField} from './spark-fields.mjs?v=finish-1';
import {drawFallWarning} from './fall-chain-art.mjs?v=finish-1';
import {EXTRA_COURSES} from './world-expansion.mjs?v=finish-1';
import {BIOME_COURSES} from './biome-courses.mjs?v=finish-1';
import {BiomeDynamics} from './biome-dynamics.mjs?v=finish-1';
import {condenseGlow,packExitReserve} from './condensed-glow.mjs?v=finish-1';
import {chainView,collectReceiptFires,appendFires,emptyMarks} from './chain-strip.mjs?v=finish-1';
import {syncFlightEngine,raiseFlightEngine,stepFlightEngine,stepFlightInscriptions,noteFlightFlash,packFlightEngine} from './card-engine-flight.mjs?v=finish-1';
import {ensureGlowBudget,shapeExpeditionSupply,trimSurplusFuel} from './glow-budget.mjs?v=finish-1';
import {balanceSparkSupply} from './spark-supply.mjs?v=finish-1';
import {installDuskSparks} from './dusk-sparks.mjs?v=finish-1';
import {EdgingPulse} from './edging-pulse.mjs?v=finish-1';
import {SpacetimeTerrain} from './spacetime.mjs?v=finish-1';
import {isVowBodyPickup} from './contextual-events.mjs?v=finish-1';
import {FlightBoon} from './flight-boons.mjs?v=finish-1';
import {BlackHoles} from './black-holes.mjs?v=finish-1';
import {createFlightFX} from './reactive-fx.mjs?v=finish-1';
import {musicReactivity} from './music.mjs?v=finish-1';
import {liftGuideAudioPhase} from './lift-guide-audio.mjs?v=finish-1';
import {LuminanceWaves,revealLuminanceWaves} from './luminance-waves.mjs?v=finish-1';
import {CardRhythm} from './card-rhythm.mjs?v=finish-1';
import {CARD_UNIT,CARD_ROW_EVENTS,createCardExecution,resolveCardRow,hasCardRowEvent,getCardCharges,getCardTallies,getCardPackingBonus,getEffectiveCardSources,getCardBoostFactors} from './skill-cards.mjs?v=finish-1';
import {drawWispBody,makeWispSprite,makeCompanionSprite,WISP_ART} from './companion-art.mjs?v=finish-1';
import {drawBlackHoles} from './black-hole-art.mjs?v=finish-1';
import {drawCapture, drawShellPuff, drawCarriedSpark,drawCollectorGrip} from './capture-art.mjs?v=finish-1';
import {drawShellArcs} from './shell-arcs.mjs?v=finish-1';
import {WispWake,drawWispWake} from './wisp-wake.mjs?v=finish-1';
import {sparkBodyRadius,sparkArtScale,sparkMass} from './spark-size.mjs?v=finish-1';
import {captureMassDuration} from './tidal-light.mjs?v=finish-1';
import {readCaptureStyle} from './capture-styles.mjs?v=finish-1';
/* Emberwing's self-contained canvas flight simulation and renderer. */
import { glowPoints, FLAME_TUNING, LIGHT_PACKET_TUNING } from './vitality.mjs?v=finish-1';
import { flightEndDistance } from './flight-end.mjs?v=finish-1';
import {getExitLandmarkState,drawExitLandmark} from './exit-landmark.mjs?v=finish-1';
import { WispCompanion, wispHome } from './wisp.mjs?v=finish-1';
import { getAscentInfo } from './ascent.mjs?v=finish-1';
import { LEVEL_LENGTH, getLevelLengthScale } from './level-length.mjs?v=finish-1';
import { resolveLevelIdentity } from './level-catalog.mjs?v=finish-1';
import { DraftField, DRAFT_TUNING } from './drafts.mjs?v=finish-1';
import { normalizeCompanionRole, normalizeCompanionFleet, getCompanionAbility } from './companion-abilities.mjs?v=finish-1';
import { populateSceneProps, scenePropPolygons } from './scene-props.mjs?v=finish-1';
import { buildLandformCourse, landformFlashSites } from './course-landforms.mjs?v=finish-1';
import { pickupKind, getPickupSpec, pickupContactRadius, canCompanionCollect, flashPowerupDuration, FLASH_LUMINANCE_BONUS } from './pickups.mjs?v=finish-1';
import { createFlashTether, stepFlashTether, drawFlashTether, flashLightGlow, FLASH_PULSE_INTERVAL } from './flash-tether.mjs?v=finish-1';
import { drawPickup, drawSparkSymbol } from './pickup-art.mjs?v=finish-1';
import {pickupHookAnchor} from './pickup-handling-cue.mjs?v=finish-1';
import { buildBossLayout, getBossState as bossState, drawBoss } from './boss.mjs?v=finish-1';
import { getAuthoredChallenge, finalizeFlightChallenges, installAuthoredDraftCrossings, FlightChallengeDirector } from './flight-challenges.mjs?v=finish-1';
import { installEncounterFamily } from './encounter-families.mjs?v=finish-1';
import { installFlightForks, resizeFlightForks } from './flight-forks.mjs?v=finish-1';
import { ArtifactEffects } from './artifact-effects.mjs?v=finish-1';
import {ActivationEvents} from './activation-events.mjs?v=finish-1';
import {fatalFlightPosition,drawLastGlimmer} from './last-glimmer.mjs?v=finish-1';
import { LIGHT_EXTENT,lightAttenuation,lightVisibility,createLightMaskCanvas,castFlightFlashLights,revealLanternWake,sceneRevealStrength,flashRangeStrength,pickupRevealHold,pickupRevealAt,renderLightState,lightDreamScenery,companionTerrainLight } from './light-field.mjs?v=finish-1';
import { createTutorialState, buildTutorialLayout, recordTutorialPickup,
  updateTutorial, updateTutorialCompanion, getTutorialHint, tuneTutorialGuardian, configureTutorialScene } from './tutorial.mjs?v=finish-1';
export { FLAME_TUNING } from './vitality.mjs?v=finish-1';
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const FALLBACK_WISP_RADIUS = WISP_ART.worldRadius/.85;
const WISP_BODY_SCALE = .85;
const COMPANION_ORBIT_SPEED = {protector:1.3,leveler:1.7,swift:3.4,seer:.8,kindler:2.2};
const RENDER_INTERVAL_MS = 1000 / 120;
const RESUME_RAMP_SECONDS = 3;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
export const FLIGHT_TUNING = Object.freeze({ gravity: 300, flapImpulse: 205,
  forwardSpeed: 154, terminalFall: 245, pickupRadius: LIGHT_PACKET_TUNING.pickupRadius });
export { DRAFT_TUNING } from './drafts.mjs?v=finish-1';
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

/** Fewest Flare pickups a landform flight carries after row 0; raise to guarantee more. */
export const FLASH_MIN_PER_FLIGHT = 1;
/** Clearance (px at 620 height) a placed Flare keeps from any terrain; the old authored courses never went under 103. */
export const FLASH_TERRAIN_CLEARANCE = 100;

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

function sampleTerrainContour(xs, depths, bedding = 0) {
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
      // Bedrock exposes planar faces; carve toward them without raising rock
      // into the established passage. Root-bound earth keeps softer curves.
      const carved=Math.max(depth,lerp(depth,lerp(depths[i],depths[i+1],t),bedding));
      points.push([lerp(xs[i], xs[i + 1], t), clamp(carved, Math.min(depths[i], depths[i + 1]), Math.max(depths[i], depths[i + 1]))]);
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
  const bedding=terrain==='storm'?.72:terrain==='ruins'?.48:0;
  const surface = sampleTerrainContour(roof ? VAULT_X : RIDGE_X, depths,bedding);
  if (!top && ERODED_GROUND_DEPTHS[terrain]) {
    const erosion = ERODED_GROUND_DEPTHS[terrain];
    const carved = sampleTerrainContour(RIDGE_X, erosion[variant % erosion.length],bedding);
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
    // Let the rock descend out of frame at each shoulder. A vertical
    // closing edge at the old endpoint could show as an unfinished cliff.
    const apron=clamp(Math.max((-.44-nx)/.36,(nx-2.09)/.36),0,1);
    depth+=(900*scale-depth)*apron*apron*(3-2*apron);
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
  levelId, stage = 0, difficulty = 1, mapIndex = 0, lengthScale = 1, encounterFamily = null, gentleOpening = false,
  fallPhysics,allowFall=true,mapTheme=null,landforms=true } = {}) {
  const ascent = getAscentInfo({ row: stage, difficulty,mapIndex });
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
      const gap = hard ? Math.max(84, baseGap * ascent.hardGapScale) : baseGap;
      const obstacle = {
        id: index, x, width, center,
        gap:gentleOpening?Math.min(height*.64,gap*1.15):gap, phase: rng() * TAU, pattern: `${identity.scene}-${form}`,
        motion: 0, // Ordinary land is fixed; explicit actors and guardian gates own motion.
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
  const starterPacing = mapIndex === 0 && stage <= 2 && !elite;
  // a landform recipe (the default; ?courses=1 opts out) replaces this slot's authored cells.
  const landform = !landforms ? null : buildLandformCourse({ levelId: identity.id, seed, height, duration, speed, identity, ascent,
    legs, requestedWindows, legCount, elite, rng });
  if (landform) { obstacles.push(...landform.obstacles); sections.push(...landform.sections); embers.push(...landform.embers); index = obstacles.length; }
  else if (legCount === 1 && starterPacing) {
    // Bare starters retain their tested fuel approaches and gentle opening.
    // Progressed courses use the full-distance authored pacing below too;
    // flightLengthScale=1 must not reduce them to one early obstacle cluster.
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
  const lanternEncounter = mapTheme === 'darkness-lanterns' ? installPassageLanterns({obstacles,sections,embers},
    {height,speed,row:stage,elite,hit:circleHitsObstacle}) : null;
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
      .filter(({ obstacle }) => obstacle.cacheEligible && !obstacle.reservedLantern && (obstacle.bottomShape || obstacle.topShape)).map(({ anchor }) => anchor);
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
  // ordinary flight introduces three after the opening; practice has its
  // own authored layout. Existing fuel opportunities are never replaced.
  const introductoryDark = stage === 0 && !elite;
  const darkPerLeg = elite || stage >= 6 ? 5 : 4;
  const darkCount = introductoryDark ? 3 : darkPerLeg * legCount;
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
        if (lanternEncounter && inLanternRoom({lanternEncounter}, ex, 70)) continue;
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
      const fraction = introductoryDark ? .28+i*.22
        : (Math.floor(i/darkPerLeg)+.22+(i%darkPerLeg)*(.58/Math.max(1,darkPerLeg-1)))/legCount;
      const target = duration * speed * fraction;
      const available = candidates.filter(site => selected.every(other => Math.abs(other.x - site.x) > 480));
      available.sort((a, b) => Math.abs(a.x - target) - Math.abs(b.x - target));
      if (!available.length) continue;
      const site = available[0]; selected.push(site);
      embers.push({ ...site, id: `dark-${i}`, kind: 'dark', harmful: true, manualOnly: true,
        value: 0, fuel: false, feature: 'dark-side-lane',
        collected: false, attracted: false, phase: darkRng() * TAU });
    }
    // A separate, swept-clear lane gives players scouting light before the next approach.
    const flashRng = seededRandom(`${seed}:${identity.id}:flash-powerup`);
    const flashRolled = flashRng() < .58;
    // Landform courses guarantee a floor of Flare pickups on every flight after the first row.
    const flashMinimum = landform && stage >= 1 && !gentleOpening ? FLASH_MIN_PER_FLIGHT : 0;
    const flashCount = introductoryDark ? 0 : Math.max(flashMinimum, flashRolled ? 1 : 0);
    const flashes = [];
    // Open air only: Flare keeps this much clear of terrain on every side.
    const flashClear = FLASH_TERRAIN_CLEARANCE * scale;
    const flashSiteOk = (x, y) => {
      if (x < Math.min(1000, duration * speed * .25) || x > duration * speed - 650 || hardNear(x)) return false;
      if (lanternEncounter && inLanternRoom({ lanternEncounter }, x, 70)) return false;
      if (selected.some(other => Math.abs(other.x - x) < speed * 1.25)) return false;
      if (flashes.some(other => Math.abs(other.x - x) < 480)) return false;
      if (embers.some(ember => Math.hypot(ember.x - x, ember.y - y) < 100 * scale)) return false;
      return obstacles.every(other => x + flashClear < other.x - other.width * .8 || x - flashClear > other.x + other.width * 2.45
        || [-1, 1].every(sign => obstaclePolygons({ ...other, motion: 0, center: other.center + sign * Math.abs(other.motion || 0) })
          .every(polygon => !circleHitsPolygon(x, y, flashClear, polygon))));
    };
    for (let k = 0; k < flashCount; k++) {
      const targetX = duration * speed * ((.32 + .26 * flashRng() + k / flashCount) % 1);
      let site;
      for (const candidate of candidates) {
        if (selected.some(other => Math.abs(other.x - candidate.x) < speed * 1.25)) continue;
        if (flashes.some(other => Math.abs(other.x - candidate.x) < 480)) continue;
        if (!site || Math.abs(candidate.x-targetX) < Math.abs(site.x-targetX)) site = candidate;
      }
      // Landform ground leaves few wide-open side lanes, so search the terrain profile itself for open air.
      if (!site && landform) {
        const found = landformFlashSites(landform.meta.profile, { height, clearance: FLASH_TERRAIN_CLEARANCE })
          .filter(candidate => flashSiteOk(candidate.x, candidate.y));
        for (const candidate of found) if (!site || Math.abs(candidate.x-targetX) < Math.abs(site.x-targetX)) site = candidate;
      }
      if (!site) continue;
      flashes.push(site);
      embers.push({...site,id:k?`flash-powerup-${k}`:'flash-powerup',kind:'sight',value:0,fuel:false,
        feature:'sight-niche',collected:false,attracted:false,phase:flashRng()*TAU});
    }
  }
  // Keep these encounters harmful. Converting most Dark Sparks into fuel
  // previously made later flights both richer and less hazardous.
  const sceneProps = populateSceneProps({ obstacles: landform ? [] : obstacles, embers, terrain, height, seed,
    totalDistance: duration * speed, scene: identity.scene, circleHitsPolygon });
  // Both renderers and the collection broad phase rely on world-X ordering.
  embers.sort((a, b) => a.x - b.x);
  const layout = { obstacles, embers, sections, sceneProps, levelIdentity: identity, ascent, lengthScale: legCount,
    legs: legs.map(leg => ({ ...leg, hardWindows: sections.filter(section => section.hard && section.leg === leg.index).length })),
    requestedHardWindowsPerLeg: requestedWindows, requestedHardWindows: requestedWindows * legCount,
    hardWindows: sections.filter(section => section.hard).length };
  if (lanternEncounter) layout.lanternEncounter = lanternEncounter;
  if (landform) layout.landformCourse = landform.meta;
  finalizeFlightChallenges(layout,{terrain,basic:stage===0&&!elite&&mapIndex===0&&difficulty<=1});
  addAccessibleGlow(layout,{duration,speed,height,elite,difficulty,stage,passage});
  installRiskChains(layout,{duration,speed,height,elite,difficulty,stage,mapIndex,fallPhysics,allowFall},(x,y,radius)=>
    y>radius+12&&y<height-radius-12&&obstacles.every(o=>x+radius<o.x-o.width*.8||x-radius>o.x+o.width*2.45
      ||[-1,1].every(sign=>!circleHitsObstacle(x,y,radius,o,0,o.center+sign*Math.abs(o.motion||0)))));
  return layout;
}

// Extra recovery lights sit in generous, swept-clear air, away from warning pickups.
function addAccessibleGlow(layout,{duration,speed,height,elite,difficulty,stage,passage}){
  if(duration<30)return;
  const fuel=layout.embers.filter(p=>getPickupSpec(p).fuel>0&&!p.generated&&pickupKind(p)!=='dusk');
  const gentle=!elite&&difficulty===1, easy=gentle&&(stage<=2||passage==='open');
  const wanted=Math.min(Math.ceil(fuel.length*(elite?.10:easy?.45:gentle?.32:.20)),Math.max(1,Math.floor(duration/(easy?5:gentle?8:12))));
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
    this.boundaryStyle=['moon','living','danger','carved','spectral','roots','fracture'].includes(options.boundaryStyle)?options.boundaryStyle:'spectral';
    const route = options.node || options;
    this.lengthScale = getLevelLengthScale(route);
    this.duration = clamp(Number(options.duration) || LEVEL_LENGTH.defaultDuration, 15, LEVEL_LENGTH.maximumDuration);
    this.levelIdentity = resolveLevelIdentity(route.levelId, this.terrain, this.seed);
    this.contactEdgePalette=getContactEdgePalette(this);
    this.locationName = route.locationName || this.levelIdentity.name;
    this.tutorial = createTutorialState(route);
    this.bossEncounter = route.boss === true && (!this.tutorial || this.tutorial.lesson === 'guardian');
    this.ascentInfo = getAscentInfo(route, Boolean(this.tutorial));
    this.openingSpeedScale=1;
    this.easyOpening=!this.tutorial&&!this.bossEncounter&&!this.elite&&this.ascentInfo.difficulty===1&&Number(route.mapIndex||0)===0&&Number(route.row||0)<=2;
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
    this.cardExecution=(this.mod.cardExecution?.cards?.some(Boolean)||this.mod.cardExecution?.inscriptions?.some(Boolean))?createCardExecution(this.mod.cardExecution):null;
    this.cardChargeLedger={...getCardCharges(this.cardExecution)};
    this.cardExecutions=0;this.cardFiredIds=new Set();
    this.cardRowTrace=null;this.cardRowSequence=0;this.cardFires=emptyMarks();this.cardFireSeq=0;this.cardFireListener=null;this.cardChain=chainView(this.cardExecution);this.cardReelCredit=0;this.cardRecoveryCredit=0;this.cardWatchlightUsed=false;this.cardLastAcceptedLift=null;
    // Engine cards (card-engine-flight.mjs): built only when the Chain holds one.
    this.cardEngine=null;this.cardEngineStored=0;this.cardEngineFlash=null;this.cardEngineLastFiring=null;this.cardPack=null;this.cardEngineLuminance=0;syncFlightEngine(this);
    this.flightBoon = new FlightBoon(this, this.mod.flightBoon);
    this.onboardingPlan=this.mod.onboardingPlan?.enabled?{...this.mod.onboardingPlan}:null;
    // Intro difficulty belongs to the route, not tutorial memory or TEST state.
    const firstA2Flight=!this.tutorial&&!this.bossEncounter&&!this.elite&&this.ascentInfo.difficulty===2&&Number(route.mapIndex||0)===0&&Number(route.row||0)===0;
    if(this.easyOpening||firstA2Flight)this.onboardingPlan={...(this.onboardingPlan||{}),enabled:true,blackHoles:false};
    this.fleet = [{role:this.companionRole,remaining:0,cooldown:0,startedAt:-1000}];
    this.hasActiveCompanions = !this.companionAbility.passive;
    this.shield = { charges: this.hasCompanion('protector') ? clamp(Math.round(Number(this.mod.protectorLayers) || 1), 1, 2) : 0,
      layers: this.hasCompanion('protector') ? clamp(Math.round(Number(this.mod.protectorLayers) || 1), 1, 2) : 0,
      recovery: 0, recoveryTotal: clamp(Number(this.mod.protectorRecovery) || 7, 2, 30) * (this.mod.treasureRecoveryScale || 1), hitFlash: 0, protection: 0 };
    this.levelTargetY = null; this.levelDive = 0; this.purifyCooldown = 0;
    this.levelCharge = this.roleDuration('leveler'); this.liftHeld = false; this.liftHeldAt = 0; this.levelExhausted = false; this.levelUseCredit = 0; this.kindlerPulse = 0;
    this.dying = false; this.dyingAge = 0; this.dyingDuration = .6; this.deathCause = null;
    this._obstacleCursor = 0; this._pickupCursor = 0; this._pickupCount = 0;
    this._nearbyPackets = []; this._nearbyPacketsUntil = -1; this._auraUntil = -1; this._collectorAura = null;
    this.alive = true;
    this.flame = clamp(Number.isFinite(options.flame) ? options.flame : FLAME_TUNING.starting, 0, this.maxFlame);
    this.condensedStart=Math.max(0,Math.floor(Number(options.condensedGlow)||0));
    this.condensedGlow=0;this.condensedRemainder=clamp(Number(options.condensedRemainder)||0,0,.999999999);
    this.storageBonus=0;this.storageAwards=0;this.resonanceStored=0;
    this.cardPackingEligible=0;this.cardPackingBonus=0;
    this.cardPackingRemainder=Math.max(0,Math.min(3,Math.floor(this.mod.cardPackingRemainder||0)));
    this.pickupOverflow=0;this.condensationFlow={amount:0,rawAmount:0,time:-Infinity,count:0,total:0};
    this.nightGardenCount=0; this.dreamCompleted=false; this.secondDawnUsed=false;
    this.flaps = 0; this.effortSpent = 0; this.flameRestored = 0; this.bodyFuelCollected = 0;this.bodyPickups=0;this.collectorPickups=0;
    this.maxLives=Math.max(1,Math.floor(Number(options.maxLives)||3));
    this.lives=Math.max(0,Math.min(this.maxLives,Math.floor(Number.isFinite(options.lives)?options.lives:this.maxLives)));
    this.cardHeartsRestored=0;this.cardHeartProgress={};this.cardFlashExpiryPending=false;
    this.burdenLiftsRemaining=Math.max(0,Math.floor(this.mod.burdenLifts||0));
    this.lastFlapTime = -1000;
    this.fourthBeatTaps = [];
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
    this.wispWake = new WispWake();
    this.absorptionEffects = []; this.absorptionSequence = 0;
    this.captureStyle = readCaptureStyle();
    this.lightPenalties = []; this.lightDimming = 0; this.sightUntil = 0; this.flashTether = null;
    this.mainSeerStartedAt=-Infinity;this.mainSeerUntil=0;this.mainSeerReadyAt=0;
    this.pickupRevealStartedAt = -Infinity; this.pickupRevealHoldUntil = -Infinity; this.pickupRevealFrom = 0;
    this.wispBoost = 0;
    this.cosmeticRng = seededRandom(`${this.seed}:cosmetics`);
    this.activationEvents=new ActivationEvents();
    this.artifactEffects=new ArtifactEffects(this);
    this.edgingPulse=new EdgingPulse(this);
    this.spacetime=this.mod.spacetime?new SpacetimeTerrain(this):null;
    this.luminanceWaves=new LuminanceWaves(this);
    this.cardSecondWindUntil=0;this.cardTributaryFired={};this.cardTithePaid=0;this.overfillWave={charge:0,waves:0,every:3};this.overfillWaveSeen=new WeakSet();
    this.cardRhythm=this.mod.cardRhythm?new CardRhythm(this):null;
    this.rigImage = null; this.background = null;
    this.fx = createFlightFX(); this.muted = false;
    this.getAudioTransport = typeof options.getAudioTransport === 'function' ? options.getAudioTransport : null;
    this.reducedMotion = options.reducedMotion === true || typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    this.collectors=[this.wisp];
    this.twinWickSource=null;this.twinWickLastUse=false;
    this.syncCollectors();
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    this.visualBank = 0; this.wingPhase = 0;
    // First Light Edition 4 flies the real catalog course; the practice hooks
    // in practice-course.mjs calm it and place the lesson's element afterwards.
    const practiceCourse=this.tutorial?.course===true;
    this.layout = this.tutorial && !this.bossEncounter && !practiceCourse
      ? buildTutorialLayout({ lesson: this.tutorial.lesson, duration: this.duration,
        height: this.height, speed: FLIGHT_TUNING.forwardSpeed })
      : this.bossEncounter ? buildBossLayout({ seed: this.seed, terrain: this.terrain,
        elite: this.elite, duration: this.duration, speed: FLIGHT_TUNING.forwardSpeed,
        height: this.height, gapScale: this.ascentInfo.hardGapScale,
        difficulty: this.ascentInfo.difficulty, mapIndex:route.mapIndex, levelIdentity: this.levelIdentity, circleHitsPolygon,bossId:route.bossId })
      : buildFlightLayout({ seed: this.seed, terrain: this.terrain, mapTheme: route.mapTheme,
        elite: this.elite, duration: this.duration, speed: FLIGHT_TUNING.forwardSpeed, height: this.height,
        passage: this.passage, fuelCadence: this.fuelCadence,allowFall:this.onboardingPlan?.badSparks!==false && this.onboardingPlan?.specialSparks!==false,
        fallPhysics:{speed:this.baseSpeed,gravity:FLIGHT_TUNING.gravity*this.scaleY*clamp(Number(this.mod.gravity)||1,.8,1.2),
          lift:FLIGHT_TUNING.flapImpulse*this.scaleY*clamp(Number(this.mod.flap)||1,.8,1.2),
          terminal:FLIGHT_TUNING.terminalFall*this.scaleY*clamp(Number(this.mod.terminalFall)||1,1,1.15)},
        levelId: this.levelIdentity.id, stage: this.ascentInfo.row,
        difficulty: this.ascentInfo.difficulty, mapIndex:Number(route.mapIndex)||0, lengthScale: this.lengthScale,encounterFamily:this.onboardingPlan?.gentleOpening||practiceCourse?null:route.encounterFamily,gentleOpening:!!this.onboardingPlan?.gentleOpening||practiceCourse,landforms:!practiceCourse });
    if(this.tutorial?.lesson==='guardian')tuneTutorialGuardian(this.layout,this.height);
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
    if(this.layout.lanternEncounter)this.drafts.zones=this.drafts.zones.filter(zone=>!inLanternRoom(this.layout,zone.x,zone.rx));
    const bodyClear=(x,y,r)=>y>r+28&&y<this.height-r-28&&this.layout.obstacles.every(o=>o.destroyed
      ||x+r<o.x-o.width||x-r>o.x+o.width*2.5
      ||[-1,1].every(sign=>!circleHitsObstacle(x,y,r,o,0,o.center+sign*Math.abs(o.motion||0))));
    ensureGlowBudget(this.layout,{duration:(this.totalDistance-this.distanceOrigin)/(FLIGHT_TUNING.forwardSpeed*(this.openingSpeedScale||1)),height:this.height,
      difficulty:this.ascentInfo.difficulty,mapIndex:Number(route.mapIndex)||0,row:this.ascentInfo.row,
      endX:this.totalDistance+this.player.x,tutorial:!!this.tutorial,drafts:this.drafts.zones,
      clear:bodyClear});
    placeGuardianFuel(this.layout,bodyClear);
    installFlightForks(this.layout,{height:this.height,seed:this.seed,terrain:this.terrain,
      endX:this.totalDistance+this.player.x,tutorial:!!this.tutorial,boss:this.bossEncounter,
      drafts:this.drafts.zones,circleHitsObstacle});
    this.biomeDynamics = new BiomeDynamics(this);
    this.blackHoles = new BlackHoles(this);
    if(this.tutorial)configureTutorialScene(this);
    if(this.onboardingPlan){
      const plan=this.onboardingPlan;
      this.layout.embers=this.layout.embers.filter(packet=>{
        const spec=getPickupSpec(packet);
        if(plan.badSparks===false&&spec.dim>0)return false;
        if(plan.specialSparks===false&&packet.feature!=='lantern-flash'&&!(spec.fuel>0&&spec.dim===0))return false;
        return true;
      });
      if(plan.badSparks===false)this.layout.riskChains=[];
      if(plan.interactiveScenery===false)this.biomeDynamics.items=[];
      if(plan.drafts===false)this.drafts.zones=this.drafts.zones.filter(zone=>zone.guardian);
      if(plan.blackHoles===false&&!(route.blackHoleEncounter==='giant'&&!this.tutorial))this.blackHoles.items=[];
    }
    this.objectiveBodyClear=bodyClear;
    this.atlas=prepareAtlasFlight(this);
    this.routeObjective=null;
    if(!this.tutorial)installSparkField(this.layout,{height:this.height,opening:this.ascentInfo.difficulty<=2&&Number(route.mapIndex||0)===0,random:seededRandom(`${this.seed}:spark-masses`),
      clear:bodyClear,targets:this.routeObjective?.targets,protectedSites:[...(this.blackHoles.items||[]),...(lanternField(this.layout)?.shutters||[])]});
    if(!this.tutorial)shapeExpeditionSupply(this.layout,{mapIndex:Number(route.mapIndex)||0,height:this.height,speed:FLIGHT_TUNING.forwardSpeed,
      endX:this.totalDistance+this.player.x,clear:bodyClear,targets:this.routeObjective?.targets,
      hazards:[...this.blackHoles.items,...this.biomeDynamics.items],drafts:this.drafts.zones});
    if(!this.tutorial)trimSurplusFuel(this.layout,{speed:FLIGHT_TUNING.forwardSpeed,height:this.height,endX:this.totalDistance+this.player.x,
      opening:this.ascentInfo.difficulty<=2&&Number(route.mapIndex||0)===0,targets:this.routeObjective?.targets,
      hazards:[...this.blackHoles.items,...(lanternField(this.layout)?.shutters||[])]});
    if(!this.tutorial)balanceSparkSupply(this.layout,{duration:(this.totalDistance-this.distanceOrigin)/
      (FLIGHT_TUNING.forwardSpeed*(this.openingSpeedScale||1)),height:this.height,speed:FLIGHT_TUNING.forwardSpeed,
      endX:this.totalDistance+this.player.x,mapIndex:Number(route.mapIndex)||0,stage:this.ascentInfo.row,
      difficulty:this.ascentInfo.difficulty,elite:this.elite,boss:this.bossEncounter,
      clear:bodyClear,hazards:[...this.blackHoles.items,...(lanternField(this.layout)?.shutters||[])],drafts:this.drafts.zones,actors:this.biomeDynamics.items,
      physics:{gravity:FLIGHT_TUNING.gravity,impulse:FLIGHT_TUNING.flapImpulse}});
    if(!this.tutorial&&!this.bossEncounter&&this.onboardingPlan?.badSparks!==false&&this.onboardingPlan?.specialSparks!==false)
      installDuskSparks(this.layout,{seed:this.seed,height:this.height,speed:FLIGHT_TUNING.forwardSpeed,
        startX:this.distanceOrigin+this.player.x,endX:this.totalDistance+this.player.x,clear:bodyClear,
        hazards:[...this.blackHoles.items,...(lanternField(this.layout)?.shutters||[]),...this.biomeDynamics.items],drafts:this.drafts.zones});
    // Mark the actual funded inventory, just as route preflight does. Planning
    // against the richer construction inventory and protecting those marks
    // could silently force an optional challenge above the final fuel cap.
    this.routeObjective=createFlightObjective(this,route.bonusId);
    this.challengeDirector=new FlightChallengeDirector(this.layout);
    this.flashProps=this.layout.embers.filter(packet=>pickupKind(packet)==='sight');
    this.flightChallenge=null;this.caveDimming=0;
    this.challengeIndex = Math.floor(seededRandom(`${this.seed}:challenge`)() * 3);
    this.challengeId = options.challengeId || options.node?.challengeId || ['wisps', 'clean', 'boosts'][this.challengeIndex];
    this.challengeTarget = Number(options.challengeTarget ?? options.node?.challengeTarget) || (this.challengeId === 'wisps' ? 7 : this.challengeId === 'boosts' ? 2 : 0);
    this.challengeText = this.challengeId === 'wisps' || this.challengeId === 'boosts' && !this.hasActiveCompanions
      ? `Collect ${this.challengeTarget} light packets`
      : this.challengeId === 'boosts' ? `Use your ability ${this.challengeTarget} times` : 'Finish without a hit';
    if(this.routeObjective)this.challengeText=this.routeObjective.condition;
    // Layout inspection uses the production generator without creating visual resources or listeners.
    if(options.preflight)return;
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
      const { WispFlightView } = await import('./wisp-renderer.mjs?v=finish-1');
      if (this.destroyed) return;
      this.pixiView = new WispFlightView(this);
      const initialized = await this.pixiView.init();
      if (this.destroyed) { this.pixiView.destroy(); return; }
      this.pixiReady = initialized !== false && this.pixiView.ready !== false;
      this.pixiView.resize();
      this.sizeEngineCanvas();
      this.render(); this.notify();
    } catch (error) {
      this.rendererError = error?.message || 'Pixel renderer unavailable';
      this.pixiReady = false;
      this.pixiView?.destroy();
      this.pixiView = null;
    }
  }

  applySkillUpgrade(modifiers, bankedSparks) {
    const role=this.companionRole;
    const duration=this.roleDuration(role);
    const cooldown=this.roleCooldown(role);
    const previousBeatRank=this.fourthBeat.rank;
    const previousFlashDuration=flashPowerupDuration(this.mod);
    Object.assign(this.mod,modifiers);
    if(this.mod.spacetime&&!this.spacetime)this.spacetime=new SpacetimeTerrain(this);
    const extraFlashTime=flashPowerupDuration(this.mod)-previousFlashDuration;
    if(extraFlashTime>0 && this.flashTether && this.time<this.sightUntil){
      this.flashTether.expires+=extraFlashTime;
      this.sightUntil=this.flashTether.expires;
      if(this.routeObjective?.id==='flash-relay' && this.time<this.routeObjective.flashUntil){
        this.routeObjective.flashUntil+=extraFlashTime;
      }
    }
    if(this.flashTether&&this.time<this.sightUntil)this.radiateLight({id:'flash',sourceKind:'pickup',follow:'flash',
      duration:this.sightUntil-this.time,radius:this.getLightState().radius,color:'#f0f7ff',interval:FLASH_PULSE_INTERVAL,reveal:true});
    if(previousBeatRank!==this.fourthBeat.rank)this.fourthBeatTaps.length=0;
    this.options.modifiers={...this.options.modifiers,...modifiers};
    this.condensedStart=bankedSparks;
    this.flame=Math.min(this.flame,this.maxFlame);
    this._auraUntil=-1;
    const member=this.fleet[0];
    if(duration>0)member.remaining*=this.roleDuration(role)/duration;
    if(cooldown>0)member.cooldown*=this.roleCooldown(role)/cooldown;
    if(role==='leveler'&&duration>0)this.levelCharge*=this.roleDuration(role)/duration;
    if(role==='collector')for(const wisp of this.collectors){
      if(!(wisp.cooldownMax>0))continue;
      const progress=wisp.cooldown/wisp.cooldownMax;
      wisp.cooldownMax=wisp.recoveryDuration(this,wisp.cargo)*(wisp.phase==='guard-recovery'?4:1);
      wisp.cooldown=progress*wisp.cooldownMax;
    }
    if(role==='protector'){
      const shield=this.shield;
      const recoveryRatio=shield.recovery/shield.recoveryTotal;
      const layers=clamp(Math.round(this.mod.protectorLayers||1),1,2);
      shield.charges=clamp(shield.charges+layers-shield.layers,0,layers);
      shield.layers=layers;
      shield.recoveryTotal=clamp(this.mod.protectorRecovery||7,2,30)*(this.mod.treasureRecoveryScale||1);
      shield.recovery=shield.charges<layers?recoveryRatio*shield.recoveryTotal:0;
    }
    this.syncFleetTimers();
    this.dream?.onBuildChanged?.();
    this.notify();
    this.render();
  }

  planRouteObjective(id) { return buildObjectivePlan(this,id); }

  get scaleY() { return this.height / 620; }
  get baseSpeed() { return FLIGHT_TUNING.forwardSpeed * (this.openingSpeedScale||1) * clamp(Number(this.mod.speed) || 1, .80, 1.25) * (this.elite ? 1.045 : 1); }
  hasCompanion(role) { return this.companionRole===role; }
  roleDuration(role) {
    const key = `${role}Duration`, value = Number(this.mod[key]);
    return Number.isFinite(value) ? clamp(value, 0, 15) : getCompanionAbility(role).duration * clamp(Number(this.mod.boostDuration) || 1, .5, 2.5);
  }
  roleCooldown(role) {
    const key = `${role}Recovery`, value = Number(this.mod[key]);
    const base = Number.isFinite(value) ? clamp(value, 1, 40) : getCompanionAbility(role).cooldown * clamp(Number(this.mod.boostCooldown) || 1, .35, 2);
    return base * (this.mod.treasureRecoveryScale || 1) / this.flightBoon.recoveryRate;
  }
  get abilityDuration() { return Math.max(0, ...this.fleet.map(item => this.roleDuration(item.role))); }
  get abilityCooldown() { return Math.max(0, ...this.fleet.filter(item => !getCompanionAbility(item.role).passive).map(item => this.roleCooldown(item.role))); }
  get boostDuration() { return this.abilityDuration; }
  get boostCooldown() { return this.abilityCooldown; }
  get maxFlame() { return Math.max(100, Number(this.mod.maxGlow) || 100); }
  // Keep the rehearsal and playback ledgers identical for pickups and hazards.
  // Dream supplies the flight's usable reserves until control passes back.
  get availableGlow() { return this.dream?.active ? this.maxFlame : this.flame; }
  get visibleGlow() { return this.dream?.mode==='record' ? this.maxFlame : this.completing ? this.flame*(1-clamp(this.completionAge/.7,0,1)) : this.flame; }
  get condensedTotal() { return this.condensedStart+this.condensedGlow+this.storageBonus+this.resonanceStored+this.cardPackingBonus+(this.exitPacking?.amount||0)+(this.cardEngineStored||0); }
  spendGlow(amount) { this.flame=Math.max(0,this.flame-Math.max(0,amount)); }

  get flapCost() { return ((Number.isFinite(this.mod.liftCostPoints)?Math.max(1,Math.round(this.mod.liftCostPoints)):Math.max(1,Math.round(3*(Number(this.mod.flapCost)||1))))+Number(this.burdenLiftsRemaining>0||(this.flightBoon?.awake&&this.flightBoon.extraCostLifts>0)))/.3; }
  get completionProgress() { return clamp(this.completionAge / 1.5,0,1); }

  get dyingProgress() { return clamp(this.dyingAge / this.dyingDuration,0,1); }
  // This is a gesture window. Resuming in slow motion still takes one real second.
  fourthBeatNow() { return performance.now() / 1000; }

  fourthBeatAt(now,taps=this.fourthBeatTaps) {
    const rank=clamp(Math.max(Math.trunc(this.mod.fourthBeatRank)||0,Math.trunc(this.mod.cardRapidLiftRank)||0),0,2);
    const needed=rank===2?3:rank===1?2:0;
    // Keep the phrase anchored to its first Lift: a free second Lift cannot
    // become a fresh anchor and extend Climb into an endless free chain.
    if(taps.length && now-taps[0]>1)taps.length=0;
    return {rank,needed,count:taps.length,ready:needed>0 && taps.length>0,pulseReady:rank===2 && taps.length===2};
  }

  recordRapidLift(beat,at,taps=this.fourthBeatTaps) {
    if(!beat.rank)return;
    if(beat.count===beat.needed-1)taps.length=0;
    else taps.push(at);
  }

  get fourthBeat() { return this.fourthBeatAt(this.fourthBeatNow()); }

  liftCostForBeat(beatReady) {
    if (this.dream?.freeGlow || beatReady || this.artifactEffects.freeLift) return 0;
    return this.flapCost - this.flightBoon.liftSaving(this.flapCost);
  }
  get nextLiftCost() { return this.liftCostForBeat(this.fourthBeat.ready); }
  get wingRate() { return this.boostTime > 0 ? 9 : this.availableGlow + 1e-7 < this.nextLiftCost ? .45 : 5.8; }

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
    if (this._canvasSized && this._backingWidth === pixelWidth && this._backingHeight === pixelHeight
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
        for(const wisp of this.collectors||[])wisp.shiftX(shift);
        for(const effect of [...this.particles,...this.pickupEffects])effect.x+=shift;
        this._auraUntil=-1;this._collectorAura=null;
      }
    }
    this._nearbyPacketsUntil = -1;
    if(this.projection)this.projection.nextAt=-Infinity;
    this.pixelRatio = pixelRatio;
    this._backingWidth = pixelWidth; this._backingHeight = pixelHeight;
    this.sizeEngineCanvas(true);
    if (this.player && oldHeight !== this.height) {
      const factor = this.height / oldHeight;
      this.player.y *= factor; this.player.vy *= factor;
      if (this.levelTargetY !== null) this.levelTargetY *= factor;
      this._auraUntil = -1; this._collectorAura = null;
      this.previousPlayerY = this.player.y;
      this.spacetime?.resizeY(factor);
      this.layout.obstacles.forEach(o => {
        o.center *= factor; o.gap *= factor; o.motion *= factor;
        for (const shape of [o.topShape, o.bottomShape]) if (shape) shape.forEach(point => { point[1] *= factor; });
        for (const prop of o.sceneProps || []) for (const part of prop.parts)
          for (const point of part.polygon) point[1] *= factor;
      });
      this.layout.embers.forEach(e => {
        e.y *= factor;
        if(e.sparkMass)e.sparkWorldHeight=this.height;
        if (e.pullY !== undefined) e.pullY *= factor;
        if (Number.isFinite(e.gravityVy)) e.gravityVy *= factor;
      });
      for(const chain of this.layout.riskChains||[]) {
        chain.y*=factor;
        if(chain.launch)chain.launch.y*=factor;
      }
      if(this.flashTether){
        this.flashTether.y*=factor; this.flashTether.py*=factor;
        this.flashTether.anchorY*=factor; this.flashTether.vy*=factor;
      }
      this.drafts?.resize(factor);
      resizeGuardian(this.layout,factor);
      if(this.layout.lanternEncounter){
        this.layout.lanternEncounter.scale*=factor;
        resizeShutters(this.layout.lanternEncounter,factor);
      }
      resizeFlightForks(this.layout,factor);
      this.biomeDynamics?.rescale(factor);
      this.blackHoles?.resize(factor);
      resizeAtlasFlight(this.atlas,factor);
      this.routeObjective?.resize(factor);
      this.stars.forEach(s => { s.y *= factor; });
      this.particles.length = 0;
      this.wispWake.clear();
      for(const wisp of this.collectors)wisp.resizeY(factor);
      this.pickupEffects.length = 0;
      this.absorptionEffects.length = 0;
      this.trail.length = 0;
    }
    if (this.player && (!this.running || this.paused)) this.render();
    this.pixiView?.resize();
  }

  // Once the pixel renderer draws its own canvas, this canvas only carries
  // layout and pointer input (at opacity 0) and its bitmap is never drawn, so
  // it is kept at 1x1. The fallback renderer gets the full backing size back
  // whenever it runs. If the host lets the bitmap size decide the element's
  // CSS size, shrinking would move the layout: then the full size is kept.
  sizeEngineCanvas(resized = false) {
    const full = !(this.pixiReady && this.pixiView) || this._engineCanvasKeepsSize;
    if (full) {
      // A resize always reassigned (and so cleared) the bitmap; keep that.
      if (!resized && this.canvas.width === this._backingWidth && this.canvas.height === this._backingHeight) return;
      this.canvas.width = this._backingWidth; this.canvas.height = this._backingHeight;
    } else {
      if (this.canvas.width === 1 && this.canvas.height === 1) return;
      const before = this.canvas.getBoundingClientRect();
      this.canvas.width = 1; this.canvas.height = 1;
      const after = this.canvas.getBoundingClientRect();
      if (after.width !== before.width || after.height !== before.height) {
        this._engineCanvasKeepsSize = true;
        this.canvas.width = this._backingWidth; this.canvas.height = this._backingHeight;
      }
    }
    this.ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
  }

  start({paused = false} = {}) {
    if (this.destroyed || this.finished || this.running) return;
    this.running = true; this.paused = paused; this.lastFrame = 0; this.nextRenderAt = null;
    this.blackHoles.update(0);
    if (!paused) this.flightBoon.survey = false;
    this.artifactEffects.onStart();
    this.notify();
    if (!paused) this.raf = requestAnimationFrame(t => this.tick(t));
    else this.render();
  }

  flap() {
    this.lastHintInputTime=this.time;
    if (!this.running || this.paused || this.finished || !this.alive || this.dying || this.completing) return false;
    const beatTime=this.fourthBeatNow();
    const beat=this.fourthBeatAt(beatTime);
    if (this.availableGlow + 1e-7 < this.liftCostForBeat(beat.ready)) {
      this.setEvent('Not enough Sparks · find a Spark'); this.notify();
      return false;
    }
    if(this.mod.nightmare && !this.dream?.active && !(this.fieldImpulse?.until>this.time) && this.nightmareAvailable?.()){
      this.hintProjection??=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle);
      const lifted=this.hintProjection.predict(this,1,[0]);
      const glide=lifted.contact&&!lifted.uncertain?this.hintProjection.predict(this,1,[]):null;
      if(glide&&!glide.contact&&!glide.uncertain){
        this.onNightmare(this,lifted);
        return false;
      }
    }
    const descendingBeforeLift = this.player.vy > 0;
    // Lift Guide: a Lift tapped while its arrow is open (its own cue window, not Rhythm's 3-Lift phrase).
    const guideCue=this.mod.cardLiftGuide?this.getLiftGuide():null,guideBeat=!!guideCue&&!guideCue.loan&&guideCue.phase==='open'&&!guideCue.late;
    const sincePreviousLift = this.cardLastAcceptedLift === null ? -Infinity : this.time-this.cardLastAcceptedLift;
    const cardLiftContext={meterFraction:this.flame/this.maxFlame,guardRecovering:this.wisp.phase==='guard-recovery'};
    this.cancelLeveler(true); this.levelDive = 0;
    if(['up','down'].includes(this.fieldImpulse?.direction))this.fieldImpulse=null;
    // A quick free Lift expires first, so spend it before a stored Lift or route boon.
    const freeLift=this.dream?.freeGlow || beat.ready || this.artifactEffects.consumeLift();
    const effort = freeLift ? 0 : this.flightBoon.spendLift(this.flapCost);
    if(beat.ready&&!this.dream?.freeGlow)this.activation(beat.rank===2?'main-fourth-beat-2':'main-fourth-beat',{outcome:{usedLift:true}});
    if(beat.rank && !this.dream?.freeGlow) {
      this.recordRapidLift(beat,beatTime);
      if(beat.pulseReady)this.radiateLight({once:true,reveal:true,source:'card-climb',sourceKind:'card',color:'#d9f0dc'});
    }
    this.spendGlow(effort);
    if(effort>0&&this.burdenLiftsRemaining>0)this.burdenLiftsRemaining--;
    if(effort>0&&this.flightBoon.awake&&this.flightBoon.extraCostLifts>0)this.flightBoon.extraCostLifts--;
    this.artifactEffects.onFlap(effort>0);
    this.flaps++; this.effortSpent += effort;
    this.cardLastAcceptedLift=this.time;
    if(effort>0&&descendingBeforeLift&&sincePreviousLift>=.75-1e-9){
      this.resolveCardRowEvent(CARD_ROW_EVENTS.lift,cardLiftContext);
      this.undertowCollect(cardLiftContext);
    }else this.resolveCardRowEvent(CARD_ROW_EVENTS.plainLift,cardLiftContext);
    if(guideBeat)this.resolveCardRowEvent(CARD_ROW_EVENTS.guideLift,cardLiftContext);
    this.lastFlapTime = this.time;
    this.liftGuide?.clear();
    this.cardRhythm?.lift(this.time,cardLiftContext);
    if(this.cardEngine)raiseFlightEngine(this,'lift',{meterFraction:cardLiftContext.meterFraction});
    this.player.vy = -FLIGHT_TUNING.flapImpulse * this.scaleY * clamp(Number(this.mod.flap) || 1, .80, 1.20);
    this.routeObjective?.lift();
    if (this.tutorialAwaitingLift) {
      this.tutorialAwaitingLift = false;
      this.accumulator = 0; this.lastFrame = 0; this.nextRenderAt = null;
    }
    this.wispWake?.lift(this);
    this.sound('flap');
    this.notify();
    return true;
  }

  beginLiftInput() {
    if (!this.running || this.paused || this.finished || this.dying || this.completing || this.liftHeld) return false;
    const lifted = this.flap();
    if(this.paused)return false;
    this.liftHeld = true; this.liftHeldAt = this.time; this.levelExhausted = false;
    return lifted;
  }

  activateFieldImpulse(direction) {
    const context={direction,meterFraction:this.flame/this.maxFlame,guardRecovering:this.wisp.phase==='guard-recovery'};
    if(!activateFieldImpulse(this,direction))return false;
    this.resolveCardRowEvent(CARD_ROW_EVENTS.field,context);
    if(this.mod.cardWaveLoom&&(!this.dream||this.dream.phase==='done'))this.radiateLight({once:true,reveal:true,source:'card-wave-loom',sourceKind:'card',color:'#d9f0dc'});
    this.notify();return true;
  }

  endLiftInput(cancelled = false) {
    const rhythmPending=cancelled&&this.cardRhythm?.phase!=='idle'&&!!this.cardRhythm;
    if(cancelled){this.fourthBeatTaps.length=0;this.cardRhythm?.clear();this.liftGuide?.clear();}
    this.liftHeld = false; this.levelExhausted = false;
    this.cancelLeveler(cancelled); this.syncFleetTimers();
    if(rhythmPending)this.notify();
  }

  updateLeveler(dt) {
    const item = this.fleet.find(item => item.role === 'leveler');
    if (!item) return;
    const capacity = this.roleDuration('leveler');
    const held = this.liftHeld && this.time - this.liftHeldAt >= .18 && !this.levelExhausted;
    if (held && item.remaining <= 0 && this.levelCharge > .08) {
      this.fourthBeatTaps.length=0;
      this.levelTargetY = this.player.y; this.player.vy *= .25;
      this.levelRecovery = 0; this.levelDive = 0; item.startedAt = this.time;
      item.remaining = this.levelCharge;
      this.activation('leveler',{kind:'companion',outcome:{duration:this.levelCharge}});
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
    this.lastHintInputTime=this.time;
    if (!this.running || this.paused || this.finished || !this.alive || this.dying || this.completing || this.tutorialAwaitingLift) return false;
    const item=this.fleet[0];
    if(item.role==='leveler'||this.companionAbility.passive||item.cooldown>.001||item.remaining>0)return false;
    item.remaining=this.roleDuration(item.role);item.cooldown=this.roleCooldown(item.role);item.startedAt=this.time;
    if(item.role==='swift'){this.player.vy*=.65;this.artifactEffects.notice('storm-knot','passive');}
    this.abilityStartedAt=this.time;this.boosts++;this.syncFleetTimers();
    this.activation(item.role,{kind:'companion',outcome:{duration:item.remaining}});
    this.artifactEffects.onWork();this.setEvent(this.companionAbility.name);
    this.burst(this.player.x - 10, this.player.y, 8, '#e6e4d3');
    this.sound('boost');
    this.notify();
    return true;
  }

  boost() { return this.activateAbility(); }

  pause(fromSystem = false) {
    if (!this.running || this.paused || this.finished || this.destroyed || this.dying) return;
    this.inputEpoch=(this.inputEpoch||0)+1;
    this.pointerControls?.cancel();
    this.endLiftInput(true); this.paused = true; this.lastFrame = 0; this.nextRenderAt = null;
    this.blackHoles.stop();
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null; this.notify(); this.onPause({ fromSystem });
  }

  getCardChargeLedger() {
    for (const [id, remaining] of Object.entries(getCardCharges(this.cardExecution))) {
      this.cardChargeLedger[id] = Math.min(this.cardChargeLedger[id] ?? remaining, remaining);
    }
    return { ...this.cardChargeLedger };
  }

  /** Resolve one real event synchronously. Its receipt survives pause and deck edits. */
  onCollectorAttach(packet, collector = this.wisp) {
    if (!packet || packet.generated || packet.fetchedInDream || packet.harmful || !(getPickupSpec(packet).fuel > 0)) return null;
    // A banked reel credit (Haul Winch) shortens this new reel once, never below 0.5 s (the Collector floor), and is then spent.
    if (this.cardReelCredit > 0) {
      const credit = this.cardReelCredit; this.cardReelCredit = 0;
      collector.shortenReel(Math.min(credit, Math.max(0, collector.activeReelSeconds() - 0.5)));
    }
    // Ring Spring: seconds banked by an Overfill come off the recovery this reel starts (never below the 0.5 s Collector floor), then are spent.
    if (this.cardRecoveryCredit > 0 && collector.cooldown > 0.5) {
      const cut = Math.min(this.cardRecoveryCredit, collector.cooldown - 0.5);
      collector.cooldown -= cut; this.cardRecoveryCredit = Math.max(0, this.cardRecoveryCredit - cut);
      if (this.cardRecoveryCredit < 1e-6) this.cardRecoveryCredit = 0;
      this.syncRingSpringBank();
    }
    return this.resolveCardRowEvent(CARD_ROW_EVENTS.attach, {pickupKind:pickupKind(packet)},collector);
  }

  /** The banked Ring Spring seconds are shown on the first Ring Spring card (a transient field, never saved). */
  syncRingSpringBank() {
    let shown = false;
    for (const card of this.cardExecution?.cards || []) {
      if (!card) continue;
      if (!/^ring-spring/.test(card.cardId || '')) { delete card.banked; continue; }
      if (!shown && this.cardRecoveryCredit > 0) { card.banked = Math.round(this.cardRecoveryCredit * 10) / 10; shown = true; } else delete card.banked;
    }
  }

  /** Second Wind (batch 3): a Save, with the card mounted, opens a 5 s window on this flight. */
  startSecondWind() {
    if(this.cardExecution?.cards.some(card=>card?.cardId==='second-wind'))this.cardSecondWindUntil=this.time+5;
  }
  /** Undertow (batch 3): one Falling Lift is one Collect for the cards to the right of the first Undertow. Only the flight's Lift handler calls this, once per Lift, and a Collect never makes a Lift, so it cannot loop. */
  undertowCollect(context) {
    const slot=this.cardExecution?.cards.findIndex(card=>card?.cardId==='undertow')??-1;
    if(slot<0)return;
    const action=this.resolveCardRowEvent(CARD_ROW_EVENTS.body,{...context,pickupKind:'light',fromSlot:slot});
    if(action)this.tributaryDelivery(context);
  }
  /** Tributary (batch 3): its count (kept by the row walker) reaching a multiple of 3 fires the Delivery cards to its right, once. A Delivery is not a Collect, so this cannot repeat itself. */
  tributaryDelivery(context) {
    const cards=this.cardExecution?.cards||[];
    for(let slot=0;slot<cards.length;slot++){
      const card=cards[slot];
      if(card?.cardId==='tributary'&&card.tally>0&&card.tally%3===0&&this.cardTributaryFired[card.instanceId]!==card.tally){
        this.cardTributaryFired[card.instanceId]=card.tally;
        this.resolveCardRowEvent(CARD_ROW_EVENTS.delivery,{...context,pickupKind:context.pickupKind||'light',fromSlot:slot});
      }
    }
  }

  resolveCardRowEvent(kind, detail = {}, collector = null, {engine = false} = {}) {
    if(!this.cardExecution||!this.running||this.paused||!this.alive||this.finished||this.destroyed||this.dying||this.completing
      ||this.tutorial&&!this.mod.practiceCards||(this.dream&&this.dream.phase!=='done'))return null;
    // Second Wind (batch 3): for 5 s after a Save every Trigger fires the Chain. The time is a field of this flight only, and only counts while the card is mounted.
    if(kind===CARD_ROW_EVENTS.delivery&&this.mod.cardCourierCord)this.courierFlashAt=this.time;
    const wind=this.cardSecondWindUntil>this.time&&this.cardExecution.cards.some(card=>card?.cardId==='second-wind');
    if(!wind&&!hasCardRowEvent(this.cardExecution,kind))return null;
    // One event shortens one Collector, so its recovery and reel budgets agree.
    // Attachments act on their owner; ordinary events prefer the longest reel.
    const w=collector||([CARD_ROW_EVENTS.field,CARD_ROW_EVENTS.guard].includes(kind)?this.wisp:
      this.collectors.reduce((best,item)=>item.activeReelSeconds()>best.activeReelSeconds()?item:best,this.wisp));
    const receipt=resolveCardRow(this.cardExecution,{meterFraction:this.flame/this.maxFlame,heartsLeft:this.lives,lastHeart:this.lives===1,...detail,...(wind?{secondWind:true}:{}),
      availableRecovery:w.enabled(this)?w.cooldown:0,availableReel:w.activeReelSeconds(),collectorReeling:w.activeReelSeconds()>0,
      guardRecovering:w.phase==='guard-recovery',kind,id:++this.cardRowSequence});
    // Victory Lap: remember every mounted card that fired at least once this flight.
    for(const card of receipt.cards)if(card&&card.fired>0)this.cardFiredIds.add(card.instanceId);
    const fireMarks=collectReceiptFires(receipt,this.cardExecution.inscriptions);appendFires(this,fireMarks);
    // Practice lessons about the Chain strip stop the flight the instant a shape turns white (practice-course.mjs).
    if(this.tutorial&&fireMarks.length){this.tutorial.fireAt=this.time;if(fireMarks.some(m=>m.kind==='bar'))this.tutorial.barAt=this.time;}
    const gain=Math.min(receipt.sparks*CARD_UNIT,Math.max(0,this.maxFlame-this.flame));
    const liveReceipt=Object.freeze({...receipt,restoredSparks:gain/CARD_UNIT});
    if(receipt.steps.some(step=>step.success&&step.operation!=='replay-row'))this.cardRowTrace=liveReceipt;
    this.flame+=gain;this.flameRestored+=gain;
    // Brimful: Sparks a Brimful card gained above the Meter become Stored Sparks (never boosted again).
    if(receipt.brimful>0){const over=Math.floor(Math.min(receipt.brimful,Math.max(0,receipt.sparks-gain/CARD_UNIT))+1e-9);if(over>0)this.resonanceStored+=over;}
    if(this.tutorial&&this.mod.practiceCards&&kind==='wave-crossing'&&gain>0)this.tutorial.harvestPaid=true;
    if(this.tutorial&&kind==='wave-crossing'&&receipt.sparks>0)this.tutorial.pulsePaidAt=this.time;
    this.resonanceStored+=receipt.stored;
    if(receipt.recoverySeconds>0){
      const before=w.cooldown;
      w.cooldown=Math.max(0,w.cooldown-receipt.recoverySeconds);
      const granted=Math.max(0,before-w.cooldown);
      // Dawn Loom observes recovery granted by a real pickup, never a Lift,
      // Rhythm phrase, ordinary countdown, or an already-ready Collector.
      if(granted>0&&[CARD_ROW_EVENTS.body,CARD_ROW_EVENTS.flash,CARD_ROW_EVENTS.delivery,CARD_ROW_EVENTS.overfill].includes(kind))
        this.artifactEffects.onRecharge(granted);
    }
    if(receipt.reelSeconds>0)w.shortenReel(receipt.reelSeconds);
    // Haul Winch: seconds banked by a Delivery come off the NEXT reel (see onCollectorAttach).
    if(receipt.nextReelSeconds>0)this.cardReelCredit=(this.cardReelCredit||0)+receipt.nextReelSeconds;
    // Ring Spring: seconds banked by an Overfill come off the NEXT Collector recovery (see onCollectorAttach).
    if(receipt.nextRecoverySeconds>0){this.cardRecoveryCredit=(this.cardRecoveryCredit||0)+receipt.nextRecoverySeconds;this.syncRingSpringBank();}
    if(kind===CARD_ROW_EVENTS.body)this.cardExecutions+=receipt.executions;
    if(this.cardEngine&&!engine){
      // Engine cards hear the Chain's Sparks on a Trigger from flying (whole Chain); Long Fuse repeats this firing.
      if(receipt.steps.some(step=>step.success))this.cardEngineLastFiring={kind,detail:{...detail}};
      const origin=Number.isInteger(detail.fromSlot)&&detail.fromSlot>=0?{fromSlot:detail.fromSlot}:{};
      if(gain>0)raiseFlightEngine(this,'gain',{amount:gain/CARD_UNIT,...origin});
      const spill=receipt.sparks-gain/CARD_UNIT;
      if(spill>1e-9)raiseFlightEngine(this,'overfill',{spill,...origin});
    }
    return {receipt:liveReceipt,gain};
  }

  canWatchlightGuard() {
    const w=this.wisp;
    return !!(this.mod.cardWatchlight&&!this.cardWatchlightUsed&&w?.enabled(this)&&w.phase==='ready'
      &&w.cooldown<=0&&!w.cargo&&!w.target&&!w.leg);
  }

  /** Replace cards in the existing paused world; timers and earned rewards stay put. */
  reconcileCardLoadout({ modifiers, condensedGlow, flightEntry = false } = {}) {
    if (!this.running || !this.paused || !this.alive || this.finished || this.destroyed ||
      this.dying || this.completing || !modifiers || !Number.isFinite(condensedGlow) ||
      flightEntry && this.cardFlightEntrySettled) return false;
    // Only the committed one-shot at real entry may raise the prebuilt snapshot.
    // Every later pause/edit reconciliation keeps the monotone use ledger.
    const charges = flightEntry ? {} : this.getCardChargeLedger(), executions = this.cardExecution?.executions || 0;
    if (flightEntry) { this.cardChargeLedger = {}; this.cardFlightEntrySettled = true; }
    const next = createCardExecution(modifiers.cardExecution);
    for (const card of next.cards) {
      if (!card || !Number.isFinite(card.charges)) continue;
      card.charges = Math.min(card.charges, charges[card.instanceId] ?? card.charges);
      this.cardChargeLedger[card.instanceId] = card.charges;
    }
    for (const card of next.cards) { // counts only grow, so a rebuilt row never loses what the flight has counted
      const was = this.cardExecution?.cards?.find(old => old?.instanceId === card?.instanceId)?.tally;
      if (card && Number(was) > (Number(card.tally) || 0)) card.tally = Math.floor(was);
    }
    next.executions = executions;
    next.eventSequence=this.cardExecution?.eventSequence||this.cardRowSequence;
    next.lastTrace=this.cardRowTrace;
    this.cardExecution = (next.cards.some(Boolean)||next.inscriptions?.some(Boolean)) ? next : null;
    this.cardChain = chainView(this.cardExecution);
    syncFlightEngine(this);
    this.mod = { ...this.mod, ...modifiers };
    this.syncCollectors();
    if(!this.mod.collectorFieldImpulse)this.fieldImpulse=null;
    this.condensedStart = Math.max(0, Math.floor(condensedGlow));
    this.flame = Math.min(this.flame, this.maxFlame);
    if (this.mod.cardRhythm) this.cardRhythm ??= new CardRhythm(this);
    else { this.cardRhythm?.destroy(); this.cardRhythm = null; }
    this.liftGuide?.clear();
    this._nearbyPacketsUntil = -1; this._auraUntil = -1;
    this.notify();
    return true;
  }

  creditCardPacking(packed) {
    const quote = getCardPackingBonus(packed, this.mod.cardPackingSources, this.cardPackingRemainder);
    this.cardPackingBonus += quote.amount;
    this.cardPackingRemainder = quote.remainder;
    return quote.amount;
  }

  resume() {
    if (!this.running || !this.paused || this.finished || this.destroyed) return;
    this.cardRhythm?.clear();
    this.flightBoon.survey = false;
    this.paused = false; this.lastFrame = 0; this.accumulator = 0; this.nextRenderAt = null;
    this.resumeElapsed = 0; this.resumeHudClock = 0;
    this.blackHoles.update(0);
    this.raf = requestAnimationFrame(t => this.tick(t));
    this.notify();
  }

  get resumeRemaining() { return Math.max(0, this.resumeRampSeconds - this.resumeElapsed); }

  get resumeScale() {
    const progress = clamp(this.resumeElapsed / this.resumeRampSeconds, 0, 1);
    return .1 + .9 * progress;
  }

  get worldRate() {
    if (!this.running || this.paused || this.destroyed || this.finished || !this.alive || this.dying || this.completing || this.tutorialAwaitingLift) return 0;
    return Math.min(this.resumeScale, this.blackHoles?.timeScale ?? 1);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.fx?.setMuted(this.muted);
  }

  // Player FX level (0-4) mapped to a gain by sound-level.mjs; level 0 also mutes.
  setFxGain(gain) {
    this.fx?.setVolume?.(gain);
  }

  // Called by the input surface, never by a simulation or ambient update.
  unlockAudio() { if (!this.muted && !this.destroyed) return this.fx?.unlock(); }

  destroy() {
    this.destroyed = true; this.running = false;
    this.blackHoles?.stop();
    this.cardRhythm?.destroy();
    this.pointerControls?.destroy();this.pointerControls=null;
    this.spacetime?.clear();
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
    this.fx?.destroy();
    this.luminanceWaves?.clear();
    this.pixiView?.destroy();
    releaseTerrainLight(this);releaseTerrainForeground(this);releaseTerrainBoundaryFrame(this);
    this.pixiView = null;
    for(const canvas of [this.fallbackFog,this.fallbackMask])if(canvas)canvas.width=canvas.height=1;
    this.fallbackFog=this.fallbackMask=null;
    for(const sprites of [this.fallbackWispSprites,this.fallbackCompanionSprites]){
      if(sprites)for(const canvas of sprites.values())canvas.width=canvas.height=1;
      sprites?.clear();
    }
    this.particles.length = 0;
    for(const wisp of this.collectors||[])wisp.clear(this);
    this.wispWake?.clear();
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
    const terminal = this.dying || this.completing;
    const resumeRate = resuming ? (previousScale + this.resumeScale) * .5 : 1;
    // Apply time dilation once, before the unchanged 1/60-world-second steps.
    // Terminal visual settling continues after the flight/music clock stops.
    const scaledElapsed = elapsed * (terminal ? 1 : Math.min(resumeRate, this.blackHoles.timeScale));
    if (resuming) this.resumeHudClock += realElapsed;
    const updateResumeHud = resuming && (this.resumeHudClock >= .1 || this.resumeRemaining === 0);
    if (this.tutorialAwaitingLift) {
      this.blackHoles.stop();this.cardRhythm?.clear();
      this.accumulator = 0;
      this.renderScheduledFrame(timestamp);
      if (updateResumeHud) { this.resumeHudClock %= .1; this.notify(); }
      this.raf = requestAnimationFrame(t => this.tick(t));
      return;
    }
    const rhythmVersion = this.cardRhythm?.version;
    this.accumulator = Math.min(this.accumulator + scaledElapsed, STEP * 6);
    while (this.accumulator >= STEP && !this.finished && !this.paused) {
      this.step(STEP); this.accumulator -= STEP;
    }
    if (this.finished || this.destroyed) return;
    this.renderScheduledFrame(timestamp);
    const updateWorldHud = Math.abs(this.worldRate - (this.lastNotifiedWorldRate ?? 1)) >= .01 || this.cardRhythm?.version !== rhythmVersion;
    if (updateResumeHud) this.resumeHudClock %= .1;
    if (updateWorldHud || updateResumeHud) this.notify();
    if (!this.finished && !this.destroyed && !this.paused) this.raf = requestAnimationFrame(t => this.tick(t));
  }

  renderScheduledFrame(timestamp) {
    // Interpolate the unchanged 60Hz simulation at up to 120 paints per second.
    // Preserve the deadline phase on slower/faster displays and after late
    // frames; a late callback paints once rather than queuing catch-up work.
    if (this.nextRenderAt === null) this.nextRenderAt = timestamp;
    // RAF timestamps may be rounded to tenths of a millisecond. A small fixed
    // allowance also tolerates refresh jitter without skipping alternate 120Hz
    // callbacks, while remaining well below one paint interval.
    const tolerance = .75;
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

  getWispState(y = this.player.y, time = this.time, renderBlend) {
    return this.wisp.state(this, y, time, renderBlend);
  }

  syncCollectors(activate = false) {
    if(!this.collectors)return;
    const cards=this.cardExecution?.cards||[];
    const source=cards.find(card=>card?.cardId==='twin-wick'&&card.charges>0);
    const waking=!this.tutorial&&!this.options.practice&&!this.options.preview&&(!this.dream||this.dream.phase==='done');
    if(activate&&waking&&this.running&&!this.paused&&this.hasCompanion('collector')&&
      !this.mod.cardTwinOrbit&&!this.twinWickSource&&source){
      // One use per flight: spend it now and remember which mounted card pays for the 2nd Collector.
      source.charges--;this.twinWickSource=source.instanceId;this.twinWickLastUse=source.charges===0;
      this.getCardChargeLedger();
      this.activation('card-twin-wick',{label:'Twin Wick',outcome:{collectors:2}});
    }
    // The effect lives on the card: it ends if the spending Twin Wick is no longer mounted.
    // The final use is exhausted (and the card removed from the Chain) at once, yet still covers this whole flight.
    if(this.twinWickSource&&!this.twinWickLastUse&&!cards.some(card=>card?.instanceId===this.twinWickSource))this.twinWickSource=null;
    const count=this.hasCompanion('collector')&&(this.mod.cardTwinOrbit||this.twinWickSource||source)?2:1;
    while(this.collectors.length>count)this.collectors.pop().clear(this);
    while(this.collectors.length<count)this.collectors.push(new WispCompanion(wispHome(this.player),this.collectors.length));
  }

  collectorRangeSources(collector) {
    const unique=new Map(),boost=getCardBoostFactors(this.cardExecution||[]);
    for(const {def,source,index} of getEffectiveCardSources(this.cardExecution||[])){
      if(def.kind!=='collector-range'||unique.has(source.instanceId))continue;
      const reserved=this.collectors.filter(item=>item!==collector&&item.targetExtension?.instanceId===source.instanceId).length;
      // A Boost to the card's right multiplies only the extra reach (+35% x2 = +70%).
      if(source.charges>reserved)unique.set(source.instanceId,{instanceId:source.instanceId,multiplier:1+(def.rangeMultiplier-1)*(boost[index]?.multiplier||1)});
    }
    return [...unique.values()].sort((a,b)=>a.multiplier-b.multiplier);
  }

  collectorFetchRange(collector = this.wisp) {
    return collector.currentRange(this)*Math.max(1,...this.collectorRangeSources(collector).map(source=>source.multiplier));
  }

  collectorExtensionFor(collector, distance) {
    const range=collector.currentRange(this);
    return this.collectorRangeSources(collector).find(source=>distance<=range*source.multiplier)||null;
  }

  spendCollectorExtension(extension) {
    const source=this.cardExecution?.cards.find(card=>card?.instanceId===extension.instanceId&&card.charges>0);
    if(!source)return false;
    if(!this.tutorial&&!this.options.practice&&!this.options.preview&&(!this.dream||this.dream.phase==='done')){
      source.charges--;this.getCardChargeLedger();
    }
    return true;
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

  getCompanionStates(y = this.player.y, time = this.time, renderBlend) {
    if (!this._companionViews) this._companionViews = this.fleet.map(() => ({}));
    this._companionViews.length=this.fleet.length;
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
      if(item.role==='collector') Object.assign(view,this.getWispState(y,time,renderBlend));
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
    if(this.hasCompanion('collector'))for(let i=1;i<this.collectors.length;i++){
      const config=getCompanionAbility('collector');
      this._companionViews.push({id:`collector:${i}`,role:'collector',name:config.name,label:config.label,passive:true,active:live,
        ...this.collectors[i].state(this,y,time,renderBlend)});
    }
    return this._companionViews;
  }

  getShieldState() { return { ...this.shield, lightAegis:(this.proximityShieldRemaining||0)>0 || this.flightBoon.wardReady&&!this.hasCompanion('protector'),
    enabled:this.hasCompanion('protector')||(this.proximityShieldRemaining||0)>0||this.flightBoon.wardReady,
    cost:this.flightBoon.wardReady ? 0 : clamp(Number(this.mod.protectorCost)||12,1,40) }; }
  getLevelerState() {
    const item=this.fleet.find(state=>state.role==='leveler');
    return {active:(item?.remaining||0)>0,remaining:item?.remaining||0,charge:this.levelCharge,capacity:this.roleDuration('leveler'),held:this.liftHeld,targetY:this.levelTargetY,
      bob:12*this.scaleY*(1-clamp(Number(this.mod.levelerSteadiness)||0,0,1)),dive:this.levelDive>0,diveRemaining:this.levelDive};
  }

  canShowContextHint() {
    this.hintProjection??=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle);
    return canShowFlightHint(this);
  }

  getFlightProjection() {
    if(!this.mod.driftSense)return null;
    this.projection??=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle);
    return this.projection.read(this);
  }

  getLiftGuide(){
    const loan=(this.options.cardPilot||this.mod.cardPilot)&&this.tutorial?.lesson==='glide';
    if(!this.mod.cardLiftGuide&&!loan)return null;
    this.liftGuide??=new LiftGuide(FLIGHT_TUNING,circleHitsObstacle);
    return this.liftGuide.read(this,{loan});
  }

  pulseRevealsAllowed({sourceKind}) {
    return !(this.mod.closedEye && sourceKind==='card');
  }

  /** Total Luminance percent a reader sees (cards, Momentum, and a running Flare). */
  getLuminancePercent() {
    const {baseRadius,sightBonus}=this.getLightState();
    const nominal=Number(this.mod.lightRadius)||LIGHT_PACKET_TUNING.baseRadius;
    return (baseRadius+sightBonus)/nominal*100-100;
  }

  getLightState() {
    // Luminance is one additive percent: cards + Momentum (capped as before at 180) plus a Flare's temporary bonus.
    // The Flare bonus is read live from the Flare's own timer, so it ends on the frame the Flare (and its Pulses) end.
    const flashStrength=flashRangeStrength(Math.max(0,(this.sightUntil||0)-this.time));
    const flashLuminance=FLASH_LUMINANCE_BONUS*flashStrength;
    const lightRadius=Number(this.mod.lightRadius)||LIGHT_PACKET_TUNING.baseRadius;
    // Closed Eye blocks card light only; a Flare adds the same pixels it always did. The Flare percent is of the
    // nominal base radius (145 px), so skills and relics that grow the radius do not also stretch the Flare.
    const cardLuminance=this.mod.closedEye?0:clamp((Number(this.mod.cardLuminancePercent)||0)+(Number(this.cardEngineLuminance)||0),0,180);
    const boon=this.mod.closedEye?1:this.flightBoon.luminanceScale;
    const baseRadius = lightRadius * (1+cardLuminance/100) * boon;
    const sightBonus = LIGHT_PACKET_TUNING.baseRadius * flashLuminance/100;
    const reduction=clamp(this.lightDimming*(1-clamp(this.mod.darkResistance||0,0,.6)),0,1-LIGHT_PACKET_TUNING.minimumLight);
    const sightRemaining=Math.max(0,(this.sightUntil||0)-this.time);
    const dream=this.dream;
    // Thaw hazards react to simulated light, even while the rehearsal view
    // shows the entire scene. Use the same radius for recording and playback.
    const lucidSight=this.mod.dreamSight&&dream&&(dream.active||dream.phase==='awakening'||this.time<dream.wokeAt+3);
    const revealedRadius=baseRadius+sightBonus+(lucidSight?70:0),dyingFade=this.dying?Math.max(0,1-this.dyingProgress**1.7):1;
    const caveReduction=clamp(this.caveDimming||0,0,.18),caveScale=(1-caveReduction)*moonLightScale(this);
    const seer=this.fleet.find(item=>item.role==='seer');
    const traitRemaining=this.mod.mainSeer?Math.max(0,this.mainSeerUntil-this.time):0;
    const artifactRemaining=Math.max(0,this.artifactEffects.sightUntil-this.time);
    const remaining=Math.max(seer?.remaining||0,traitRemaining,artifactRemaining);
    const startedAt=Math.min(traitRemaining>0?this.mainSeerStartedAt:Infinity,
      artifactRemaining>0?this.artifactEffects.sightStartedAt:Infinity,seer?.remaining>0?seer.startedAt:Infinity);
    const onset=Number.isFinite(startedAt)?clamp((this.time-startedAt)/.25,0,1):0;
    const strength=Math.max(flashStrength,remaining>0?Math.min(onset,clamp(remaining/.4,0,1)):0);
    const forwardLight={active:strength>0,x:this.player.x+160,y:this.player.y,
      radius:clamp(Number(this.mod.seerRadius)||230,120,420)*caveScale,intensity:strength*(1-reduction*.65)*dyingFade};
    const reveal=this.completionProgress*this.completionProgress*(3-2*this.completionProgress);
    const radius=Math.max(baseRadius*.5,revealedRadius*(1-reduction)*caveScale)
      +(this.reducedMotion?0:Math.hypot(this.width,this.height)*reveal);
    const refuge=this.getExitLandmark(),landmarkLight=refuge?{x:refuge.x-10,y:refuge.y+9,
      radius:clamp(refuge.groundY-refuge.y+9,80,138),intensity:.62*lightAttenuation(((refuge.x-this.player.x)**2+(refuge.y-this.player.y)**2)/(radius*radius))}:null;

    return {baseRadius,revealedRadius,revealBonus:0,pickupReveal:this.pickupRevealStrength*dyingFade,
      tetherReveal:flashLightGlow(this.flashTether,this.time)*.08*dyingFade,
      edgingReveal:this.mod.closedEye&&this.edgingPulse.sourceKind==='card'?0:this.edgingPulse.strength,caveReduction,caveActive:caveReduction>.005,
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
    this.radiateLight({id:'seer',source:'main-seer',sourceKind:'ability',duration:this.mainSeerUntil-this.time,
      radius:(Number(this.mod.lightRadius)||LIGHT_PACKET_TUNING.baseRadius)+120,follow:'wisp'});
    this.artifactEffects.notice('dawn-thread','passive');
    this.activation('main-echo-sight',{outcome:{reveal:this.mainSeerUntil-this.time}});
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
    if(source&&granted>0){this.setEvent(`${source} · companion recovery −${Math.round(granted*10)/10}s`);this.activation('kindled-spirit',{label:source,outcome:{recovery:granted}});}
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
    const reach=Math.max(480,...(this.collectors||[]).map(wisp=>this.collectorFetchRange(wisp)*1.7)),left=this.distance-reach,right=this.distance+this.width+reach;
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
    aura.radius=aura.maxRadius=this.wisp.currentRange(this);aura.baseRadius=range;aura.maximumReach=range;
    aura.guardRecovering=this.wisp.phase==='guard-recovery';aura.guardReady=this.wisp.canGuard(this);
    aura.guardElapsed=this.wisp.cooldownMax-this.wisp.cooldown;
    aura.growth=growth;aura.active=!this.dying;aura.areaRatio=1;aura.coordinateSpace='world';
    return aura;
  }

  collectorContains(packet, collector = this.wisp, reach = this.collectorFetchRange(collector)) {
    return this.hasCompanion('collector')&&reach>0&&Math.hypot(packet.x-this.distance-this.player.x,packet.y-this.player.y)<=reach+sparkBodyRadius(packet,this.height);
  }

  beginDying(cause = 'collision') {
    if(this.dying||this.completing||this.finished||this.destroyed)return;
    this.deathPosition=fatalFlightPosition(this);
    for(const wisp of this.collectors||[])wisp.clear(this);
    this.edgingPulse.reset();
    this.luminanceWaves?.clear();
    this.blackHoles.stop();
    this.deathCause=cause;this.dyingDuration=2;
    this.dying=true;this.dyingAge=0;this.tutorialAwaitingLift=false;
    this.cardRhythm?.clear();
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

  shatterPickupRing(packet,delivery) {
    const kind = pickupKind(packet);
    if(kind==='sight')return;
    // The intact towed shell breaks only when its cargo reaches the main wisp.
    const worldX=delivery?.worldX??packet.x,y=delivery?.y??packet.y;
    this.particles.push({type:'shell-puff',worldX,x:worldX-this.distance,y,
      vx:0,vy:0,life:1,maxLife:1,bornAt:this.time,kind,phase:packet.phase||0,
      radius:sparkBodyRadius(packet,this.height)*(delivery?.scale??1)});
  }

  absorbPacket(ember, kind, delivery) {
    const origin = { x: (delivery?.worldX ?? ember.x) - this.distance, y: delivery?.y ?? ember.y };
    const dx = origin.x - this.player.x, dy = origin.y - this.player.y;
    // Measure the cargo or stationary field Spark in the moving wisp's frame.
    const interval = delivery?.interval || STEP;
    const playerStepX = this.distance - this.previousDistance;
    const playerStepY = this.player.y - this.previousPlayerY;
    const approachX = ((delivery ? delivery.worldX - delivery.previousWorldX : 0) - playerStepX) / interval;
    const approachY = ((delivery ? delivery.y - delivery.previousY : 0) - playerStepY) / interval;
    const radius = Math.hypot(dx,dy);
    const angle = radius > .15 ? Math.atan2(dy,dx) : Math.atan2(-approachY || 0,-approachX || 0);
    const massTier = sparkMass(ember);
    const fieldScale = sparkArtScale(ember,this.height);
    const duration = captureMassDuration(LIGHT_PACKET_TUNING.absorptionDuration,massTier);
    this.absorptionEffects.push({ id: `absorb:${this.absorptionSequence++}`, kind,
      pickupKind: pickupKind(ember), pickupId: ember.id, style:this.captureStyle,
      phase: ember.phase || 0,
      initialScale: delivery?.scale ?? fieldScale, delivery, massTier,
      shellRadius:sparkBodyRadius(ember,this.height),
      capturePlayerY: this.player.y, captureDistance: this.distance,
      startX: origin.x, startY: origin.y, initialAngle: angle, startRadius: radius,
      approachX, approachY, bornAt: this.time, duration, life: duration });
    while (this.absorptionEffects.length > LIGHT_PACKET_TUNING.absorptionLimit) this.absorptionEffects.shift();
  }

  getNearbyPickup(seenKinds = new Set()) {
    if(this.dying||this.completing||this.finished||this.destroyed)return null;
    const light = this.getLightState();
    const seen = kind => seenKinds?.has?.(kind) === true || Array.isArray(seenKinds) && seenKinds.includes(kind);
    for (const packet of this.getNearbyPickups()) {
      if (packet.collected || packet.carried || packet.generated) continue;
      const kind = pickupKind(packet), spec = getPickupSpec(packet), x = packet.x - this.distance, y = packet.y;
      if (seen(kind) || x <= this.player.x + pickupContactRadius(packet)
        || x < 18 || x > this.width - 18 || y < 18 || y > this.height - 18
        || lightVisibility(this,light,x+spec.radius,y)<.32) continue;
      return { id: kind, kind, packet, x, y, radius: Math.max(18,sparkBodyRadius(packet,this.height)) };
    }
    return null;
  }

  dimLight(duration) {
    if (this.lightPenalties.length >= LIGHT_PACKET_TUNING.darkMaximumStacks) this.lightPenalties.shift();
    this.lightPenalties.push(this.time + duration);
  }

  storeNaturalOverflow(packet,spec,surplus,naturalSurplus,cardContext={}){
    if(packet.generated||packet.harmful||!(spec.fuel>0)||!(surplus>0))return 0;
    if(naturalSurplus>1e-7&&!packet.fetchedInDream){
      this.resolveCardRowEvent(CARD_ROW_EVENTS.overfill,{...cardContext,pickupKind:packet.collectorOriginalKind||pickupKind(packet)});
      if(this.cardEngine)raiseFlightEngine(this,'overfill',{natural:true});
    }
    if((this.options.cardPilot||this.mod.cardPilot)&&naturalSurplus>1e-7&&!this.tutorial&&!packet.fetchedInDream
      &&(!this.dream||this.dream.phase==='done')&&this.running&&this.alive&&!this.paused&&!this.dying&&!this.completing
      &&!this.finished&&!this.destroyed&&!this.overfillWaveSeen.has(packet)){
      this.overfillWaveSeen.add(packet);this.overfillWave.charge++;
      this.overfillWave.every=Math.max(1,Number(this.mod.cardOverfillEvery)||3);
      if(this.overfillWave.charge>=this.overfillWave.every){
        this.overfillWave.charge=0;this.overfillWave.waves++;
        this.radiateLight({once:true,reveal:true,source:'card-overfill',sourceKind:'card',color:'#d9f0dc'});
        this.sound('luminance',{strength:.35});
        this.activation('card-overfill',{label:'Overfill',outcome:{wave:1}});
        this.setEvent('Overfill · Pulse');
      }
    }
    const gain=condenseGlow(surplus,{rules:this.mod.condensationRules,wallet:this.condensedTotal,remainder:this.condensedRemainder,limit:this.mod.packingLimit??20,packed:this.condensedGlow});
    this.routeObjective?.recordPacking(packet,gain);
    this.pickupOverflow+=surplus;this.condensedGlow+=gain.amount;this.condensedRemainder=gain.remainder;
    const previousCardBonus=this.cardPackingBonus;
    if(!this.tutorial&&!packet.fetchedInDream&&(!this.dream||this.dream.phase==='done')){
      this.cardPackingEligible+=gain.amount;
      this.creditCardPacking(gain.amount);
    }
    let bonus=0;
    if (naturalSurplus>1e-7 && spec.plasma && this.storageAwards<2 && !this.tutorial
      && !packet.fetchedInDream && (!this.dream || this.dream.phase==='done')) {
      if (this.mod.handSeal && !packet.deliveredByWisp) bonus=1;
      else if (this.mod.deepCache && sparkMass(packet)>=3) bonus=2;
    }
    if(bonus){this.storageAwards++;this.storageBonus+=bonus;}
    const cardBonus=this.cardPackingBonus-previousCardBonus;
    if(cardBonus>0)this.activation('card-tight-packing',{label:'Tight Packing',outcome:{stored:cardBonus}});
    if(gain.amount+bonus+cardBonus>0)this.condensationFlow={amount:gain.amount+bonus+cardBonus,cardPackingBonus:cardBonus,rawAmount:surplus,time:this.time,count:this.condensationFlow.count+1,total:this.condensedGlow+this.storageBonus+this.resonanceStored+this.cardPackingBonus,multiplier:gain.multiplier};
    return surplus;
  }

  get pickupRevealStrength() {
    return pickupRevealAt(this.time,this.pickupRevealStartedAt,this.pickupRevealHoldUntil,this.pickupRevealFrom,this.reducedMotion);
  }

  /** An Inscription acted (Hollow, Lodestone...): the Chain strip flashes the bar of the slot that carries it. */
  inscriptionActed(id){
    const slot=this.cardExecution?.inscriptions?.findIndex(entry=>entry?.id===id)??-1;
    if(slot>=0)appendFires(this,[{slot,kind:'bar'}]);
  }

  radiateLight({id='reveal',x=this.distance+this.player.x,y=this.player.y,
    radius=Math.hypot(this.width,this.height),duration=1.5,color='#c5ecff',follow=null,interval=1,reveal=true,once=false,
    source=id,sourceKind='ability'}={}) {
    if(once)return this.luminanceWaves?.emit({x,y,radius,color,reveal,source,sourceKind});
    return this.luminanceWaves?.addSource({id,x,y,radius,duration,color,follow,interval,reveal,source,sourceKind});
  }

  revealFromPickup(force=false,source=null,emitWave=true) {
    if(!this.mod.pickupReveal&&!force)return;
    const from=this.pickupRevealStrength;
    this.pickupRevealFrom=from;this.pickupRevealStartedAt=this.time;
    // Refresh from current illumination; never blink dark or stack exposure.
    this.pickupRevealHoldUntil=pickupRevealHold(this.time,from,this.reducedMotion);
    if(emitWave)this.radiateLight(source?{id:source.id,x:source.x,y:source.y,color:source.color,duration:1.5,
      follow:source.follow??null,source:source.source??source.id,sourceKind:source.sourceKind??'map'}
      :{id:'pickup-reveal',sourceKind:'pickup',follow:'wisp',duration:1.5});
  }

  step(dt) {
    if (this.destroyed || this.finished || this.paused || !this.alive || this.tutorialAwaitingLift) return;
    if(this.dream&&this.dream.phase!=='done')this.cardRhythm?.clear();
    this.previousPlayerY = this.player.y; this.previousDistance = this.distance;
    if(this.completing){
      const duration=this.completionDuration||1.5;
      this.time+=dt;this.completionAge=Math.min(duration,this.completionAge+dt);
      this.wispWake?.update(this,dt);
      this.wingPhase+=dt*2;
      for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
      this.particles=this.particles.filter(p=>p.life>0);
      this.updateClock+=dt;if(this.updateClock>=.1){this.updateClock=0;this.notify();}
      if(this.completionAge>=duration){this.render();this.finish(true);}
      return;
    }
    if(this.dying){
      this.time+=dt;this.dyingAge=Math.min(this.dyingDuration,this.dyingAge+dt);
      this.wispWake?.update(this,dt);
      this.player.vy*=Math.exp(-dt*7);this.player.y=clamp(this.player.y+this.player.vy*dt*.15,28,this.height-29);
      this.flash=Math.max(0,this.flash-dt);this.shake*=Math.exp(-dt*12);
      for(const particle of this.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;}
      this.particles=this.particles.filter(particle=>particle.life>0);
      this.updateClock+=dt;if(this.updateClock>=.1){this.updateClock=0;if(this.resumeRemaining===0)this.notify();}
      if(this.dyingAge>=this.dyingDuration)this.finish(false);return;
    }
    this.time += dt;
    this.cardRhythm?.advance();
    this.flightBoon.tryReserve();
    updateGlideRegeneration(this,dt);
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
    this.proximityShieldRemaining=Math.max(0,(this.proximityShieldRemaining||0)-dt);this.shield.protection=Math.max(0,this.shield.protection-dt);this.shield.hitFlash=Math.max(0,this.shield.hitFlash-dt);
    if(this.shield.charges<this.shield.layers){
      this.shield.recovery=Math.max(0,this.shield.recovery-dt*this.flightBoon.recoveryRate);
      if(this.shield.recovery<=0){this.shield.charges++;this.shield.recovery=this.shield.charges<this.shield.layers?this.shield.recoveryTotal:0;}
    }
    const wispTarget=this.hasCompanion('collector')&&this.isCompanionWorking()&&this.cards.has('hungry-wisp')?1:0;
    this.wispBoost+=clamp(wispTarget-this.wispBoost,-dt*5,dt*5);
    this.exitProtection = Math.max(0, this.exitProtection - dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt * 18);
    if (oldBoost > 0 && this.boostTime === 0) this.exitProtection = .45;
    const motionSpeed=this.baseSpeed*(this.boostTime>0?1.48:fieldImpulseSpeed(this));
    this.distance += motionSpeed * dt;
    const encounter=this.challengeDirector.update({time:this.time,worldX:this.distance+this.player.x,
      speed:motionSpeed,maximumSpeed:this.baseSpeed*1.48});
    this.flightChallenge=encounter.state;
    this.caveDimming+=(encounter.darkness-this.caveDimming)*(1-Math.exp(-dt*3));
    if(encounter.event)this.setEvent(encounter.event);

    this.drafts.update(this.time, this.distance + this.player.x,
      motionSpeed);
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
    gravity=fieldImpulseGravity(this,gravity);
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
    if(this.atlas?.bells){ringBellwind(this);gravity+=bellwindAcceleration(this);}
    const terminal=FLIGHT_TUNING.terminalFall*clamp(Number(this.mod.terminalFall)||1,1,1.15);
    const downwardWind=gust.guardian&&gust.direction>0?65*gust.strength*(this.boostTime>0?.28:1):0;
    this.player.vy = clamp(fieldImpulseVelocity(this,this.player.vy + gravity * dt), -520 * this.scaleY,(terminal+downwardWind)*this.scaleY);
    this.player.y += this.player.vy * dt;
    updatePrismWick(this);
    if(this.flashTether && !stepFlashTether(this.flashTether,this.distance+this.player.x,this.player.y,this.time,dt)) this.flashTether=null;
    updateGuardian(this,dt,gust);
    this.blackHoles.update(dt);
    this.biomeDynamics?.update(dt);
    if (this.dying || !this.alive) return;
    const nearbyObstacles = this.getNearbyObstacles();
    this.spacetime?.update(dt,nearbyObstacles);
    const engineSkims=this.cardEngine?this.edgingPulse.triggerCount:null;
    this.edgingPulse.update(dt, nearbyObstacles);
    if(this.cardEngine)stepFlightEngine(this,engineSkims);
    stepFlightInscriptions(this);
    // Sense and passive sight widen steady light; they do not secretly emit
    // harvesting fronts. Explicit relic flashes enter through revealFromPickup.
    this.luminanceWaves.update(dt);
    this.routeObjective?.update(dt,gust);
    const breathingBank = Math.sin(this.wingPhase * TAU / 6) * .012;
    this.visualBank = lerp(this.visualBank, clamp(this.player.vy / (690 * this.scaleY), -.30, .35) + breathingBank, 1 - Math.exp(-dt * 9));

    // A charged shell catches the ground/ceiling edge before the body exits.
    // Without a shield, open sky still allows partial visibility.
    const edgeShield = this.hasCompanion('protector') ? this.shield.charges > 0
      && (this.flightBoon.wardReady || this.availableGlow >= clamp(Number(this.mod.protectorCost) || 12, 1, 40))
      : this.flightBoon.wardReady;
    if (edgeShield && this.shield.protection <= 0 &&
      ((this.player.y + this.player.radius >= this.height && this.player.vy > 0) ||
       (this.player.y - this.player.radius <= 0 && this.player.vy < 0))) {
      this.hit(null);
      return;
    }
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
      const rim=pickupContactRadius(ember,this.height);
      if (x < -rim-20 || x > this.width+rim+20) continue;
      const gap=Math.hypot(this.player.x-x,this.player.y-ember.y);
      if(this.mod.nightGarden&&!ember.generated&&this.nightGardenCount<5&&pickupKind(ember)==='dark'&&!ember.gardenPassed
        &&x<this.player.x&&gap>rim&&gap<=rim+Math.min(rim*3,53)){
        ember.gardenPassed=true;
        const gain=Math.min(this.mod.nightGarden,this.maxFlame-this.flame);
        if(gain>0){
          this.nightGardenCount++;this.flame+=gain;this.flameRestored+=gain;
          this.burst(x,ember.y,6,'#bdcea3');
          this.setEvent(`Safe skim · +${formatGlow(gain,this.maxFlame)} Sparks`);this.artifactEffects.notice('night-gardener');this.artifactEffects.notice('hollow-covenant');
          for(const id of ['night-gardener','hollow-covenant'])this.artifactEffects.activate(id,{fuel:gain});
        }
      }
      if (gap < rim) this.collect(ember);
    }
    if (this.tutorial) {
      updateTutorialCompanion(this, dt);
      updateTutorial(this, dt, gust);
    } else {
      this.syncCollectors(true);
      for(const wisp of this.collectors)wisp.update(this,dt);
    }

    this.wispWake?.update(this,dt);
    for (const effect of this.pickupEffects) effect.life -= dt;
    this.pickupEffects = this.pickupEffects.filter(effect => effect.life > 0);
    // Retain the last interpolation interval so a fast render never clips the merge.
    for (const effect of this.absorptionEffects) effect.life = effect.bornAt + effect.duration - this.time;
    this.absorptionEffects = this.absorptionEffects.filter(effect => effect.life > -STEP);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if(p.type!=='shell-puff'){
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 8 * dt;
        p.rotation = Math.atan2(p.vy, p.vx);
      }
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    this.updateClock += dt;
    // The HUD can stay at 10 Hz, but the audible Guide must share the actual
    // physics boundary of the chevron and its balanced-height target.
    const guidePhase=liftGuideAudioPhase({liftGuide:this.getLiftGuide(),worldRate:this.worldRate});
    if (guidePhase!==this.lastNotifiedGuidePhase || this.updateClock >= .10) {
      this.updateClock = 0; if(this.resumeRemaining===0)this.notify();
    }
    if (!this.finished && !this.dying && !this.completing && this.distance >= this.totalDistance) this.finish(true);
  }

  hit(obstacle) {
    if(!this.alive||this.finished||this.destroyed||this.dying||this.completing)return;
    const cardGuardContext={meterFraction:this.flame/this.maxFlame,guardRecovering:this.wisp.phase==='guard-recovery'};
    this.edgingPulse.impact();
    if(this.shield.protection>0)return;
    if(obstacle)obstacle.hit=true;
    this.collisions++;
    const rewardWard = this.flightBoon.wardReady;
    const cost = rewardWard ? 0 : clamp(Number(this.mod.protectorCost)||12,1,40);
    const lightAegis=(this.proximityShieldRemaining||0)>0;
    const bonusOnly = rewardWard && !this.hasCompanion('protector');
    const shellReady=this.hasCompanion('protector')&&this.shield.charges>0&&this.availableGlow>=cost;
    const watchlight=this.canWatchlightGuard();
    const lastOrbit=!lightAegis&&!rewardWard&&!shellReady&&(this.wisp.canGuard(this)||watchlight);
    if(lightAegis||bonusOnly||shellReady||lastOrbit){
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
        const previous = this.player.y;
        if(lightAegis) this.proximityShieldRemaining = 0;
        else if(!lastOrbit) {
          this.flightBoon.ward = false;
          if(!bonusOnly) { this.spendGlow(cost); this.shield.charges--; }
        }
        if(!lastOrbit&&this.shield.recovery<=0)this.shield.recovery=this.shield.recoveryTotal;
        this.shield.protection=Number(this.mod.protectorProtection)||.4;this.shield.hitFlash=.45;this.flash=.14;
        this.player.y=this.previousPlayerY=safe;this.player.vy=(safe>=previous?1:-1)*180*this.scaleY;
        if(lastOrbit){
          this.wisp.spendGuard(this);
          this.burst(this.player.x,safe,10,'#b9dfa0');
          if(watchlight){
            this.cardWatchlightUsed=true;
            this.radiateLight({once:true,reveal:true,source:'card-watchlight',sourceKind:'card',color:'#d9f0dc'});
          }
          this.resolveCardRowEvent(CARD_ROW_EVENTS.guard,cardGuardContext);
          this.startSecondWind();
        }
        if(this.projection)this.projection.nextAt=-Infinity;
        this.cancelLeveler(true);this.levelDive=0;this._auraUntil=-1;
        if(!lastOrbit&&(!bonusOnly || lightAegis)) {
          this.artifactEffects.onWork();
          this.artifactEffects.notice('iron-petal','passive');
        }
        this.setEvent(lightAegis?'Light Aegis · shield spent':rewardWard?'Collision ward spent':lastOrbit?(watchlight?'Watchlight · ring spent':'Last Orbit · ring spent'):`Protector · shell spent, −${formatGlow(cost,this.maxFlame)} Sparks`);this.sound('shield');
        this.activation(lightAegis?'proximity-light-shield':rewardWard?'edgeweaver':lastOrbit?(watchlight?'card-watchlight':'collector-last-orbit'):'protector',
          {label:lastOrbit&&watchlight?'Watchlight':undefined,kind:!lightAegis&&!rewardWard&&!lastOrbit?'companion':'skill',priority:10,outcome:{saved:1}});
        this.notify();return;
      }
    }
    this.flash=.22;this.shake=this.reducedMotion?0:4;
    this.burst(this.player.x,this.player.y,18,'#e6edda');this.sound('hit');
    this.beginDying('collision');
  }

  collect(ember, delivery) {
    if (ember.collected || !this.alive || this.finished || this.destroyed || this.dying) return;
    const kind = pickupKind(ember), spec = getPickupSpec(ember), harmful = kind === 'dark';
    const fuelBefore=this.flame,storedBefore=this.condensedTotal;
    const fallingBeforePickup=this.player.vy>0;
    const cardPickupContext={pickupKind:ember.deliveredByWisp?(ember.collectorOriginalKind||kind):kind,meterFraction:fuelBefore/this.maxFlame,
      guardRecovering:this.wisp.phase==='guard-recovery'};
    if (ember.deliveredByWisp && !canCompanionCollect(ember)) return;
    this.routeObjective?.collect(ember);
    if (kind === 'dusk') {
      // One manual warning contact: debit first, then resolve its single row
      // event. Dusk has no native fuel, packing, cleansing or refill hooks.
      ember.collected=true;
      const drained=Math.min(Math.max(0,this.flame),spec.drain);
      this.spendGlow(drained);
      this.absorbPacket(ember,'dusk');
      this.dimLight(spec.dimDuration);
      const action=!ember.generated&&!ember.fetchedInDream
        ?this.resolveCardRowEvent(CARD_ROW_EVENTS.body,cardPickupContext):null;
      if(action)this.tributaryDelivery(cardPickupContext);
      if(!ember.generated&&!ember.fetchedInDream)applyDirectPickupCards(this,ember,{falling:fallingBeforePickup,impulse:FLIGHT_TUNING.flapImpulse});
      if(this.cardEngine&&!ember.generated&&!ember.fetchedInDream)raiseFlightEngine(this,'collect',{pickupKind:'dusk'});
      const restored=action?.gain||0;
      if(restored>0)this.activation('card-dusk-wick',{outcome:{fuel:restored}});
      if(!ember.generated&&!(this.dream&&this.dream.phase!=='done'))this.bodyPickups++;
      const cost=drained>0?`−${formatGlow(drained)} Sparks`:'No Sparks to drain',
        gain=restored>0?` · +${formatGlow(restored)} Sparks`:'',
        text=`${cost}${gain} · Luminance −${Math.round(spec.dim*100)}% (${spec.dimDuration}s)`;
      this.pickupEffects.push({x:this.player.x,y:this.player.y,pickupKind:'dusk',restored,drained,text,life:.9});
      if(this.pickupEffects.length>12)this.pickupEffects.shift();
      this.setEvent(`${spec.name} · ${text}`);this.sound('dark');
      return;
    }
    if(ember.deliveredByWisp&&!ember.generated){this.artifactEffects.onWork();this.artifactEffects.notice('wayfinder-seed','passive');}
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
        this.activation('main-purifying-touch',{outcome:{fuel:restored,reveal:1.5}});
        this.setEvent(`Purifying Touch · ${text}`);this.sound('collect');return;
      }
      this.absorbPacket(ember, 'dark');
      this.dimLight(spec.dimDuration);
      this.pickupEffects.push({ x:this.player.x,y:this.player.y,pickupKind:'dark',
        text:`SIGHT -${Math.round(spec.dim*100)}%`,color:'#c5b1cf',restored:0,value:0,life:.72 });
      if(this.pickupEffects.length>12)this.pickupEffects.shift();
      this.setEvent(`${spec.name} · Luminance -${Math.round(spec.dim*100)}%`);
      this.sound('dark');
      return;
    }
    if (kind === 'sight') {
      ember.collected=true;
      this.flashTether=createFlashTether({x:delivery?.worldX ?? ember.x,y:delivery?.y ?? ember.y,
        playerX:this.distance+this.player.x,playerY:this.player.y,time:this.time,
        duration:flashPowerupDuration(this.mod),initialScale:delivery?.scale??1,phase:ember.phase,reducedMotion:this.reducedMotion});
      this.sightUntil=this.flashTether.expires;
      this.cardFlashExpiryPending=!ember.generated&&!ember.fetchedInDream&&(!this.dream||this.dream.phase==='done');
      if(this.cardFlashExpiryPending)noteFlightFlash(this);
      // A replacement prism starts a new local beat; upgrading a live prism
      // still upserts its source without restarting that beat.
      this.luminanceWaves.removeSource('flash');
      this.radiateLight({id:'flash',x:this.flashTether.x,y:this.flashTether.y,follow:'flash',
        sourceKind:'pickup',duration:flashPowerupDuration(this.mod),radius:this.getLightState().radius,color:'#f0f7ff',interval:FLASH_PULSE_INTERVAL,reveal:true});
      this.revealFromPickup(true,null,false);
      let restored = 0;
      const cardFlash=!ember.generated&&!ember.fetchedInDream?this.resolveCardRowEvent(CARD_ROW_EVENTS.flash,cardPickupContext):null;
      if(cardFlash)restored=cardFlash.gain;
      if (this.mod.collectorFlashFetch && (!this.cardExecution || !this.mod.cardFlashHandling)) {
        const nativeRestored = Math.min(Math.max(FLAME_TUNING.emberFuel, Number(this.mod.cardFlashMeter) || 0), Math.max(0, this.maxFlame - this.flame));
        restored += nativeRestored;this.flame += nativeRestored;
        this.flameRestored += nativeRestored;
      }
      const refill = glowPoints(restored);
      this.setEvent(`${spec.name} · Passage revealed${refill ? ' · +' + refill + ' Sparks' : ''}`);
      if(ember.deliveredByWisp)this.activation('collector',{kind:'companion',outcome:{fuel:restored,reveal:flashPowerupDuration(this.mod)}});
      this.sound('flash');
      return;
    }
    if (this.tutorial) recordTutorialPickup(this, ember);
    ember.collected = true;
    this.absorbPacket(ember, 'light', delivery);
    if(!ember.generated){
      this.revealFromPickup();
      if(!spec.dim)this.triggerMainSight();
      if(!spec.dim&&this.mod.dreamRecharge&&this.dream?.active){
        const restored=this.quickenCompanionRecovery(null,clamp(Number(this.mod.dreamRecharge)||0,0,4));
        if(restored>0){this.artifactEffects.notice('dreamcatcher');this.artifactEffects.notice('dream-sovereign');for(const id of ['dreamcatcher','dream-sovereign'])this.artifactEffects.activate(id,{recovery:restored});}
      }
      if(!spec.dim&&this.mod.secondDawn&&this.dreamCompleted&&!this.secondDawnUsed){this.secondDawnUsed=true;this.revealFromPickup(true,{id:'second-dawn',sourceKind:'relic',follow:'wisp'});this.artifactEffects.notice('second-dawn');this.artifactEffects.notice('dream-sovereign');for(const id of ['second-dawn','dream-sovereign'])this.artifactEffects.activate(id,{reveal:1.5});}
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
    const capacityLeft=this.maxFlame-this.flame;
    let restored = Math.min(fuel, capacityLeft);
    this.flame += restored; this.flameRestored += restored;
    const surplus=this.storeNaturalOverflow(ember,spec,Math.max(0,fuel-restored),spec.fuel-capacityLeft,cardPickupContext);
    restored+=this.artifactEffects.applyConsumables(ember,spec);
    if(!ember.generated&&!spec.dim){
      if(surplus>0)this.artifactEffects.notice('echo-vessel','passive');
      if(restored>0){
        this.artifactEffects.notice('glass-lantern','passive');this.artifactEffects.notice('sunheart-engine');
        if(!ember.deliveredByWisp&&(this.mod.mainKindler||this.hasCompanion('kindler')))this.artifactEffects.notice('moss-heart','passive');
      }
    }
    restored+=this.artifactEffects.onFuel(ember,spec,surplus,cleansed);
    restored += this.flightBoon.fuelPickup(ember,spec);
    if(!ember.generated&&!ember.fetchedInDream&&spec.fuel>0){
      const action=this.resolveCardRowEvent(ember.deliveredByWisp?CARD_ROW_EVENTS.delivery:CARD_ROW_EVENTS.body,cardPickupContext);
      if(action){restored+=action.gain;if(action.gain>0)this.activation('card-body-spark',{outcome:{fuel:action.gain}});}
      if(action&&!ember.deliveredByWisp)this.tributaryDelivery(cardPickupContext);
      applyDirectPickupCards(this,ember,{falling:fallingBeforePickup,impulse:FLIGHT_TUNING.flapImpulse});
      if(this.cardEngine)raiseFlightEngine(this,ember.deliveredByWisp?'delivery':'collect',{pickupKind:kind});
    }
    if (spec.dim) this.dimLight(spec.dimDuration);
    const origin = ember.deliveredByWisp ? this.getWispState() : this.player;
    this.pickupEffects.push({ x: origin.x, y: origin.y,
      pickupKind: kind, restored,
      text:surplus>0&&restored<=0?'OVERFLOW':undefined,life: .72 });
    if (this.pickupEffects.length > 12) this.pickupEffects.shift();
    // Generated fuel helps flight only. It never mints Stored Sparks or
    // recursively pays pickup-triggered effects.
    if (ember.generated) {
      this.score += 5;
      this.sound('collect');
      return;
    }
    this.baseEmbers++;
    if(!(this.dream&&this.dream.phase!=='done')){
      if(ember.deliveredByWisp)this.collectorPickups++;else this.bodyPickups++;
    }
    if(isVowBodyPickup(this,ember,spec)){this.bodyFuelCollected++;this.wisp.repairGuard(this);}
    const value = ember.value === 3 ? 3 : 1;
    this.bonusEmbers += value - 1;
    this.score += value * ((ember.boostedPickup ?? this.isCompanionWorking()) && this.cards.has('golden-wake') ? 20 : 10);
    if (surplus>0&&this.condensationFlow.amount>0) this.setEvent(`Stored · +${this.condensationFlow.amount} Stored Sparks`);
    else if (kind === 'cache') this.setEvent(restored > 0 ? `${spec.name} · +${formatGlow(restored,this.maxFlame)} Sparks` : 'Sparks full');
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
      this.activation('warm-core',{outcome:{fuel:bonus}});
    }
    if (cleansed) this.setEvent('Light restored · dark packet cleansed');
    if(ember.deliveredByWisp)this.activation('collector',{kind:'companion',outcome:{fuel:this.flame-fuelBefore,stored:Math.max(0,this.condensedTotal-storedBefore)}});
    this.sound('collect',{tier:spec.plasma||1,via:ember.deliveredByWisp?'collector':'body',strength:cleansed?1:.85});
  }

  challengeComplete() {
    if (this.routeObjective) return this.routeObjective.complete;
    return this.challengeId === 'wisps' ? this.baseEmbers >= this.challengeTarget
      : this.challengeId === 'boosts' ? (!this.hasActiveCompanions ? this.baseEmbers : this.boosts) >= this.challengeTarget : this.collisions === 0;
  }

  getBossState() { return bossState(this); }
  getFlightChallengeState() { return this.flightChallenge; }

  activation(source,detail={}){
    this.activationEvents??=new ActivationEvents();
    return this.activationEvents.emit(this.time,source,detail);
  }

  getState() {
    const boss = this.getBossState(), ability=this.getAbilityState(),artifacts=this.artifactEffects.state;
    const fourthBeat=this.fourthBeat, nextLiftCost=this.liftCostForBeat(fourthBeat.ready);
    const canAffordFlap=this.availableGlow+1e-7>=nextLiftCost;
    return { alive: this.alive, score: Math.floor(this.score), condensedGlow:this.condensedGlow+this.storageBonus+this.resonanceStored+this.cardPackingBonus+(this.exitPacking?.amount||0)+(this.cardEngineStored||0),storageBonus:this.storageBonus,resonanceStored:this.resonanceStored,cardPackingBonus:this.cardPackingBonus,cardPackingEligible:this.cardPackingEligible,condensedTotal:this.condensedTotal,condensedRemainder:this.condensedRemainder,exitPacking:this.exitPacking||null,
      ascent: this.ascentInfo,
      lives:this.lives,maxLives:this.maxLives,cardHeartsRestored:this.cardHeartsRestored,cardHeartProgress:{...this.cardHeartProgress},
      boss, bossPhase: boss ? `${boss.phase}/3 · ${boss.phaseName}` : '',
      bossWarning: boss?.warning || '',
      routeBonus:this.routeObjective?.state || null,
      flightChallenge:this.flightChallenge,challengeCue:this.flightChallenge
        ?this.flightChallenge.phase==='warning'?`${this.flightChallenge.name} ahead · ${this.flightChallenge.instruction}`
          :this.flightChallenge.phase==='active'?`${this.flightChallenge.name} · ${this.flightChallenge.instruction}`:'' :'',
      flame: this.visibleGlow,pickupOverflow:this.pickupOverflow,condensationFlow:{...this.condensationFlow},
      dream:this.dream?.state||null, maxFlame: this.maxFlame, paidFlapCost:this.flapCost, flapCost:nextLiftCost, fourthBeat,
      canFlap: this.alive && !this.finished && !this.dying && !this.completing && canAffordFlap,
      canAffordFlap, flaps: this.flaps,
      artifactEffects:artifacts,artifactProc:artifacts.proc,artifactCharges:artifacts.charges,artifactNotices:artifacts.notices,
      cardCharges:this.getCardChargeLedger(),cardTallies:getCardTallies(this.cardExecution),cardExecutions:this.cardExecutions,cardRhythm:this.cardRhythm?.state||null,
      cardRowTrace:this.cardRowTrace,cardRowSequence:this.cardRowSequence,cardChain:this.cardChain,cardFires:this.cardFires,cardWatchlightUsed:this.cardWatchlightUsed,
      cardPackingLedger:1,cardPackingRemainder:this.cardPackingRemainder,
      ...(this.cardEngine?{cardEngine:{...this.cardEngine.state,stored:this.cardEngineStored,pack:this.cardPack}}:{}),
      overfillWave:this.options.cardPilot||this.mod.cardPilot?{...this.overfillWave}:null,
      activationEvents:this.activationEvents.snapshot(this.time),activationSequence:this.activationEvents.sequence,
      wisp: this.getWispState(),
      ability, companions:this.getCompanionStates().map(item=>({...item})),shield:this.getShieldState(),leveler:this.getLevelerState(),
      completing:this.completing,completionProgress:this.completionProgress,collectorAura:this.getCollectorAuraState(),dying:this.dying,dyingProgress:this.dyingProgress,deathCause:this.deathCause,
      light: this.getLightState(),cardMeterMark:!!this.mod.cardMeterMark,cardFinishFlag:!!this.mod.cardFinishFlag,edgingPulse:this.edgingPulse.state,luminanceWaves:this.luminanceWaves.getState(),
      audioFocus:this.fx?.getFocus?.()||0,
      liftGuide:this.getLiftGuide(),
      blackHole:this.blackHoles.state,
      mainTraits:{seer:!!this.mod.mainSeer,seerRemaining:Math.max(0,this.mainSeerUntil-this.time),seerCooldown:Math.max(0,this.mainSeerReadyAt-this.time),kindler:!!this.mod.mainKindler,kindlerPulse:this.kindlerPulse,purifyCooldown:this.purifyCooldown},
      collected: this.baseEmbers, boostCooldown: this.cooldown,
      boostCooldownTotal: this.boostCooldown, boostDurationTotal: this.boostDuration,
      boostReady: ability.ready,
      fieldImpulse:this.mod.collectorFieldImpulse?{...this.fieldImpulse,available:fieldImpulseStrength(this)>0}:null,
      boostActive: this.boostTime > 0,
      boostTime: this.boostTime, progress: clamp((this.distance-this.distanceOrigin) / (this.totalDistance-this.distanceOrigin), 0, 1),
      event: this.time < this.eventUntil ? this.event : '',
      renderer: this.pixiReady ? 'pixel-canvas' : 'canvas',
      paused: this.paused, finished: this.finished, reducedMotion: this.reducedMotion,
      resumeScale: this.resumeScale, resumeRemaining: this.resumeRemaining, worldRate: this.worldRate,
      tutorialHintState: getTutorialHint(this), tutorialAwaitingLift: this.tutorialAwaitingLift,
      time: this.time, remaining: Math.max(0, (this.totalDistance - this.distance) / this.baseSpeed),
      challenge: this.challengeText, challengeComplete: this.challengeComplete() };
  }

  notify() {
    if(this.destroyed)return;
    const state=this.getState(),reaction=musicReactivity(state);
    this.lastNotifiedWorldRate=state.worldRate;
    this.lastNotifiedGuidePhase=liftGuideAudioPhase(state);
    const nearest=this.blackHoles?.items.find(item=>item.id===state.blackHole?.nearest?.id);
    this.fx?.setState({...reaction,dream:state.dream?.mode==='record'?1:0,
      paused:state.paused||state.finished||state.worldRate===0,
      proximity:state.edgingPulse.charge,
      proximityContact:state.edgingPulse.nearEdge&&!state.edgingPulse.active&&!state.edgingPulse.recovering
        &&!state.dying&&!state.completing&&Number.isFinite(this.edgingPulse.surface?.clearance),
      proximityRecovery:state.edgingPulse.active||state.edgingPulse.recovering,
      pan:nearest?clamp((nearest.x-this.distance-this.player.x)/(this.width*.5),-.7,.7):0,
      transport:{...(this.getAudioTransport?.()||{time:this.time,bpm:88}),rate:state.worldRate}});
    this.onUpdate(state);
  }

  setEvent(value) { this.event = value; this.eventUntil = this.time + 2.2; }

  finish(success) {
    if (this.finished || this.destroyed) return;
    this.routeObjective?.finish(success);
    this.cardRhythm?.clear();
    this.edgingPulse.reset();
    this.luminanceWaves?.clear();
    this.blackHoles.stop();
    if(success&&!this.completing){
      // Pack Trigger: Pack cards fire once, before the meter is packed (engine Chains only).
      if(this.cardEngine)packFlightEngine(this);
      this.completing=true;this.completionAge=0;
      this.exitPacking=packExitReserve(this.flame,{rules:this.mod.condensationRules,remainder:this.condensedRemainder});
      const previousCardBonus=this.cardPackingBonus;
      if(!this.tutorial&&(!this.dream||this.dream.phase==='done'))this.creditCardPacking(this.exitPacking.amount);
      const cardBonus=this.cardPackingBonus-previousCardBonus;
      if(cardBonus>0)this.activation('card-tight-packing',{label:'Tight Packing',outcome:{stored:cardBonus}});
      this.completionDuration=this.exitPacking.amount>0?2.25:1.5;
      if(this.exitPacking.reserve>0)this.condensationFlow={amount:this.exitPacking.amount+cardBonus,cardPackingBonus:cardBonus,rawAmount:this.exitPacking.reserve,time:this.time,
        count:this.condensationFlow.count+1,total:this.condensedGlow+this.storageBonus+this.resonanceStored+this.cardPackingBonus+this.exitPacking.amount,source:'exit'};
      this.distance=this.previousDistance=this.totalDistance;
      this.previousPlayerY=this.player.y;this.player.vy=0;this.resumeElapsed=this.resumeRampSeconds;
      this.setEvent('PASSAGE CLEARED');this.burst(this.player.x,this.player.y,28,'#f3e4af');this.sound('clear');this.notify();return;
    }
    if(success&&this.completionProgress<1)return;
    this.finished = true; this.running = false;
    this.alive = Boolean(success) && this.alive;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    const result = { success: Boolean(success) && this.alive, alive: this.alive, condensedGlow:this.condensedGlow,storageBonus:success&&this.alive?this.storageBonus:0,resonanceStored:success&&this.alive?this.resonanceStored:0,cardPackingEligible:this.cardPackingEligible,cardPackingBonus:success&&this.alive?this.cardPackingBonus:0,cardPackingLedger:1,cardPackingRemainder:this.cardPackingRemainder,dreamAttempt:!!(this.dream&&this.dream.phase!=='done'),condensedRemainder:this.condensedRemainder,pickupOverflow:this.pickupOverflow,
      boss: this.bossEncounter ? { id:this.layout.boss?.id||'hollow-warden', defeated: Boolean(success) && this.alive } : null,
      ...(this.cardEngine?{cardEngineTurns:this.cardEngine.turn,cardEngineStored:success&&this.alive?this.cardEngineStored:0,cardPack:success&&this.alive&&this.cardPack?{...this.cardPack}:null,...(this.cardTithePaid&&success&&this.alive?{cardTithePaid:this.cardTithePaid}:{})}:{}),
      lives:this.lives,cardHeartsRestored:this.cardHeartsRestored,
      artifactActivations: {...this.artifactEffects.activationCounts},
      flame: this.flame,artifactCharges:{...this.artifactEffects.charges},cardCharges:this.getCardChargeLedger(),cardTallies:getCardTallies(this.cardExecution),cardExecutions:this.cardExecutions,cardFiredIds:[...this.cardFiredIds],deathPosition:!success?this.deathPosition||null:null,
      score: Math.floor(this.score), collected: this.baseEmbers, bodyFuelCollected: this.bodyFuelCollected,bodyPickups:this.bodyPickups,collectorPickups:this.collectorPickups, collisions: this.collisions,
      boosts: this.boosts,
      routeBonus:this.routeObjective?.state || null,
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

  sound(type,detail) { this.fx?.play(type,detail); }

  render() {
    if (this.destroyed) return;
    const blend = clamp(this.accumulator / STEP, 0, 1);
    this.renderBlend = blend;
    if(this.canvas.ownerDocument&&!this.environmentArtReady){
      this.environmentArtReady=prepareEnvironmentArt(this.canvas.ownerDocument);
      this.environmentArtReady.then(()=>{if(!this.destroyed&&this.paused)this.render();});
    }
    this.renderDistance = lerp(this.previousDistance ?? this.distance, this.distance, blend);
    this.renderPlayerY = lerp(this.previousPlayerY ?? this.player.y, this.player.y, blend);
    this.captureTime = Math.max(0, this.time - (1 - blend) * STEP);
    this.visualTime = this.time + blend * STEP;
    if (this.pixiReady && this.pixiView) { this.pixiView.render(this); return; }
    if (this.canvas.width !== this._backingWidth || this.canvas.height !== this._backingHeight) this.sizeEngineCanvas();
    const c = this.ctx, W = this.width, H = this.height;
    beginTerrainBoundaryFrame(this,this.visualTime,this.renderDistance);
    try {
    const light = renderLightState(this);
    c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.drawBackground(c, W, H);
    drawHabitatBackdrop(c,this);
    drawCourseArt(c,this);
    drawCourseArt(c,this,{pass:'near'});
    drawNearLandscape(c,this);
    drawGuardianPresence(c,{engine:this,width:W,height:H,distance:this.renderDistance,time:this.visualTime});
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
    drawTerrainEcology(c,this);
    drawTerrainBoundary(c,this);
    this.biomeDynamics?.draw(c,{distance:this.renderDistance,scale:1,height:H});
    this.drawPortal(c,W,H);
    if(light.rehearsing)lightDreamScenery(c,W,H);
    this.drawEmbers(c,light);
    this.drawExitApproachGlow(c,W,H);
    this.luminanceWaves?.draw(c,{distance:this.renderDistance,time:this.visualTime});
    if(!light.rehearsing)this.drawFallbackLight(c,light);
    drawWispWake(c,this);
    drawFallWarning(c,this,{light});
    this.drawWayfinder(c);
    drawGuardianWarnings(c,{engine:this,distance:this.renderDistance,time:this.visualTime});
    this.biomeDynamics?.drawHighlights(c,{distance:this.renderDistance,light,playerY:this.renderPlayerY});
    drawAtlasFlight(c,this);
    drawObjectiveMarks(c,this);
    drawFlightProjection(c,this);
    if(!light.rehearsing)drawGlowSense(c,this);
    if(!light.rehearsing)drawLastGlimmer(c,this,{light});
    this.drawFlightTrail(c);
    this.drawParticles(c);
    if(!light.rehearsing){
      const vignette = c.createRadialGradient(W / 2, H * .43, W * .3, W / 2, H * .45, H * .8);
      vignette.addColorStop(0, 'rgba(5,12,24,0)'); vignette.addColorStop(1, 'rgba(5,12,24,.36)');
      c.fillStyle = vignette; c.fillRect(0, 0, W, H);
    }
    drawShutters(c,this,{light});
    drawCollectorField(c,this);
    const fleet=this.getCompanionStates(this.renderPlayerY??this.player.y,this.visualTime??this.time,this.renderBlend);
    this.drawWisp(c,fleet,false);
    this.drawPhoenix(c);
    this.drawWisp(c,fleet,true);
    if(!light.rehearsing)this.drawPickups(c);
    if(this.flashTether)drawFlashTether(c,this.flashTether,{time:this.captureTime,distance:this.renderDistance,
      playerX:this.renderDistance+this.player.x,playerY:this.renderPlayerY});
    for (const effect of this.absorptionEffects) {
      drawCapture(c,effect,this.captureTime,this.player.x,this.renderPlayerY,this.renderDistance,1,this.reducedMotion,FALLBACK_WISP_RADIUS*WISP_BODY_SCALE);
    }
    drawBlackHoles(c,this);
    if(!light.rehearsing){drawLiftGuide(c,this,{playerY:this.renderPlayerY});drawStarterCues(c,this,{playerY:this.renderPlayerY});}
    c.restore();
    if (this.flash > 0) { c.fillStyle = `rgba(255,196,149,${this.flash * .36})`; c.fillRect(0, 0, W, H); }
    // Keep the nearest plane in front of the complete world, including Flare,
    // with the same camera shake that was applied to its backing terrain.
    c.save();
    if (this.shake > 0) c.translate(Math.sin(this.time * 77) * this.shake, Math.cos(this.time * 63) * this.shake * .5);
    drawTerrainForeground(c,this);
    c.restore();
    if (light.rehearsing) return;
    drawProximityMeter(c,this);
    } finally { endTerrainBoundaryFrame(this); }
  }

  drawWayfinder(c,scale=1){ this.flightBoon.drawSurvey(c,scale,obstaclePolygons); }

  drawFallbackLight(c,light=this.getLightState()){
    const doc=this.canvas.ownerDocument||(typeof document!=='undefined'?document:null);
    if(!doc?.createElement)return;
    this.fallbackFog??=doc.createElement('canvas');this.fallbackMask??=createLightMaskCanvas(doc);
    const fog=this.fallbackFog,w=Math.ceil(this.width),h=Math.ceil(this.height);
    if(fog.width!==w||fog.height!==h){fog.width=w;fog.height=h;}
    const f=fog.getContext('2d'),y=this.renderPlayerY??this.player.y;
    f.globalAlpha=1;f.globalCompositeOperation='source-over';f.clearRect(0,0,w,h);f.fillStyle='#000000';f.fillRect(0,0,w,h);
    f.globalCompositeOperation='destination-out';
    let channel=0;
    const cast=(x,y,r,alpha)=>castTerrainLight(f,this.fallbackMask,this,{x,y,radius:r,alpha,channel:`fallback${channel++}`});
    cast(this.player.x,y,light.radius,light.intensity);
    const forward=light.forwardLight;
    if(forward.active)cast(forward.x,forward.y+y-this.player.y,forward.radius,forward.intensity*light.intensity);
    if(light.landmarkLight){const source=light.landmarkLight;cast(source.x,source.y,source.radius,source.intensity);}
    castFlightFlashLights(f,this.fallbackMask,this,light,1,this.renderDistance??this.distance,y);
    revealLuminanceWaves(f,this);
    revealLanternWake(f,this,{distance:this.renderDistance??this.distance,playerY:y,light});
    const dim=clamp(light.radius/light.baseRadius,.6,1);
    for(const orb of this.getCompanionStates(y,this.visualTime??this.time,this.renderBlend)){
      const glow=companionTerrainLight(orb,dim,light.intensity);
      cast(orb.x,orb.y,glow.radius,glow.alpha);
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
    // The shared exposed-terrain pass outlines the union after every piece.
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

  drawEmbers(c,light=renderLightState(this)) {
    for (const ember of this.layout.embers) {
      if (ember.carried || ember.collected) continue;
      const x = ember.x - (this.renderDistance ?? this.distance);
      if (x > this.width + this.height*.4 + 32) break;
      const margin = sparkBodyRadius(ember,this.height)*1.5 + 8;
      if (x < -margin || x > this.width + margin) continue;
      const hook=pickupHookAnchor(ember,x,ember.y);
      const handling=this.hasCompanion('collector')&&lightVisibility(this,light,hook.x,hook.y,this.renderPlayerY??this.player.y)>0
        ?{packet:ember,modifiers:this.mod,collector:true}:null;
      drawPickup(c,x,ember.y,{kind:pickupKind(ember),time:this.captureTime,phase:ember.phase,
        scale:sparkArtScale(ember,this.height),massTier:sparkMass(ember),reducedMotion:this.reducedMotion,
        handling});
      if(ember.harvestFlashUntil>this.time){
        c.save();c.strokeStyle='#edffd0';c.globalAlpha=Math.min(1,(ember.harvestFlashUntil-this.time)*3);c.lineWidth=3;
        c.beginPath();c.arc(x,ember.y,margin+5,0,Math.PI*2);c.stroke();c.restore();
      }
    }
  }

  drawPickups(c) {
    c.save();
    for (const effect of this.pickupEffects) {
      const t = 1 - effect.life / .72;
      c.fillStyle=getPickupSpec(effect.pickupKind).color;
      c.globalAlpha = Math.min(1, (1 - t) * 3); c.font = 'bold 18px system-ui'; c.textAlign = 'center';
      c.font = effect.restored > 0 ? 'bold 13px system-ui' : 'bold 18px system-ui';
      const gain=effect.restored>0&&!effect.text;
      const y=effect.y-22-(this.reducedMotion?0:t*32);
      if(gain)drawSparkSymbol(c,effect.x-4,y-5,{size:13,time:this.visualTime,reducedMotion:this.reducedMotion});
      c.fillText(effect.text || (gain ? `+${formatGlow(effect.restored)}` : 'FULL'),effect.x+15,y);
    }
    c.restore();
  }

  drawParticles(c) {
    c.save(); c.globalCompositeOperation = 'screen';
    for (const p of this.particles) {
      if (p.type === 'shell-puff') {
        const age=this.captureTime-p.bornAt;
        c.globalAlpha=1;
        drawShellPuff(c,p.worldX-this.renderDistance,p.y,p.radius,age,p.kind,p.phase,this.reducedMotion);
        drawShellArcs(c,this.player.x,this.renderPlayerY,1,age,p.kind,p.phase,this.reducedMotion,FALLBACK_WISP_RADIUS*WISP_BODY_SCALE);
        continue;
      }
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

  drawWisp(c,fleet,front) {
    const palettes={collector:'#b9dfa0',protector:'#8fbfe8',leveler:'#a7e8df',swift:'#f2d48e',seer:'#d3b1f2',kindler:'#e4a3b5'};
    c.save();
    const towLight={engine:this,light:renderLightState(this),playerY:this.renderPlayerY??this.player.y};
    if(!front)for(const state of fleet)if(state.role==='collector'&&state.carrying)drawCollectorGrip(c,state,1,towLight);
    for(const state of fleet){
      const collector=state.role==='collector',depth=collector?(state.depth||0):0;
      if ((collector&&depth>0)!==front) continue;
      const color=palettes[state.role],cooling=collector&&(state.phase==='cooldown'||state.phase==='guard-recovery');
      const power=(cooling?.7+.25*state.recovery:1)*(collector?.82+depth*.18:1);
      const radius=collector?6.5*(.95+depth*.25):7;
      c.globalAlpha=power*.19;c.fillStyle=color;c.beginPath();c.arc(state.x,state.y,radius*2.25,0,TAU);c.fill();
      c.globalAlpha=power;
      const doc=this.canvas.ownerDocument||globalThis.document;
      if(doc?.createElement){
        this.fallbackCompanionSprites??=new Map();let sprite=this.fallbackCompanionSprites.get(state.role);
        if(!sprite){sprite=makeCompanionSprite(doc,state.role);this.fallbackCompanionSprites.set(state.role,sprite);}
        c.imageSmoothingEnabled=false;c.drawImage(sprite,state.x-radius,state.y-radius,radius*2,radius*2);
      }else{c.beginPath();c.arc(state.x,state.y,radius,0,TAU);c.fill();}
    }
    if(!front)for(const state of fleet)if(state.role==='collector'&&state.carrying)drawCarriedSpark(c,state,this.captureTime,1,this.reducedMotion,this.captureStyle,towLight);
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
    c.scale(pulse*fade*WISP_BODY_SCALE, pulse*fade*WISP_BODY_SCALE);
    const band=Math.round(clamp(this.visibleGlow/this.maxFlame,0,1)*32),doc=this.canvas.ownerDocument||globalThis.document;
    c.save();
    if(this.dream?.mode==='record')c.globalAlpha*=this.reducedMotion?.48:.46+.09*Math.sin(t*3);
    if(doc?.createElement){
      this.fallbackWispSprites??=new Map();
      let sprite=this.fallbackWispSprites.get(band);
      if(!sprite){sprite=makeWispSprite(doc,band);this.fallbackWispSprites.set(band,sprite);}
      const size=WISP_ART.size*FALLBACK_WISP_RADIUS/WISP_ART.radius;
      c.imageSmoothingEnabled=false;c.drawImage(sprite,-size/2,-size/2,size,size);
    }else drawWispBody(c,band,0,0,FALLBACK_WISP_RADIUS);
    c.restore();
    const aegis = this.proximityShieldRemaining > 0 || this.flightBoon.wardReady && !this.hasCompanion('protector');
    if(aegis || this.hasCompanion('protector')){
      const charged = aegis || this.shield.charges > 0;
      c.strokeStyle = aegis ? '#e6f8ff' : charged ? '#8fbfe8' : '#4a6171';
      c.lineWidth = 1.5; c.globalAlpha = charged ? .65 : .22;
      c.beginPath(); c.arc(0,0,22,0,TAU*(charged ? 1 : .65)); c.stroke(); c.globalAlpha = 1;
    }
    c.restore();
    drawFourthBeat(c,this,p.x,y);
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

  drawExitApproachGlow(c, W, H) {
    const progress = clamp(this.time / this.duration, 0, 1);
    if (progress > .86 && !lanternField(this.layout)?.shutters?.length) {
      const x = W + 100 - (progress - .86) / .14 * 100;
      const glow = c.createRadialGradient(x, H / 2, 0, x, H / 2, H * .45);
      glow.addColorStop(0, 'rgba(255,222,160,.30)'); glow.addColorStop(1, 'rgba(255,222,160,0)');
      c.fillStyle = glow; c.fillRect(0, 0, W, H);
    }
  }
}

// Preserve the simulation API used by existing saves and development tools.
export { WispFlight as PhoenixFlight };
