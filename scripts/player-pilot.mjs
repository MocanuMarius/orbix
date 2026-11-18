// Pure helpers for the "player-*" simulated pilots (2026-11-18): Lift physics, the Lift Guide cue window, Lift classification and the skill profiles.
// Numbers mirror dist/flight.mjs (FLIGHT_TUNING: gravity 300, flapImpulse 205, terminalFall 245; a Lift costs 3 Sparks = 10 Meter units)
// and dist/flight-projection.mjs (LIFT_GUIDE_TUNING: window 0.2 s, lead 0.22 s). Nothing here reads dist/ so tests stay pure.
export const LIFT_PHYSICS = Object.freeze({ gravity: 300, impulse: 205, terminal: 245, windowSec: .2, leadSec: .22, costUnits: 10, sparkUnits: 10 / 3 });
export const SPARK_UNITS = LIFT_PHYSICS.sparkUnits;
export const SPAM_SECONDS = .75; // the game's own "Lift" trigger needs >= 0.75 s since the previous accepted Lift (and a falling Wisp)

/** Seconds until the Wisp's fall speed reaches the Lift's own launch speed (the "same altitude" moment the arrow marks), and the arrow phase. */
export function cueTiming({ vy, scale = 1, gravity = LIFT_PHYSICS.gravity, impulse = LIFT_PHYSICS.impulse, terminal = LIFT_PHYSICS.terminal } = {}) {
  const g = gravity * scale, target = Math.min(impulse * scale, terminal * scale), until = (target - vy) / g, half = LIFT_PHYSICS.windowSec / 2;
  const opensIn = Math.max(0, until - half);
  return { until, opensIn, open: Math.abs(until) <= half, late: until < -half, visible: opensIn <= LIFT_PHYSICS.leadSec };
}

/** Altitude gained by a Lift pressed tau seconds after the previous one (previous Lift launches at -impulse): 205 t - 150 t^2 in design units. Zero at t = 1.367 s. */
export function liftHeight(tau, { gravity = LIFT_PHYSICS.gravity, impulse = LIFT_PHYSICS.impulse, terminal = LIFT_PHYSICS.terminal } = {}) {
  const tt = (terminal + impulse) / gravity; // time to reach terminal fall speed after a Lift
  if (tau <= tt) return impulse * tau - .5 * gravity * tau * tau;
  const atT = impulse * tt - .5 * gravity * tt * tt; return atT - terminal * (tau - tt) + 0; // past terminal the Wisp falls at constant speed
}

export function classifyLift({ vy, scale = 1, since = Infinity }) {
  const c = cueTiming({ vy, scale });
  return { onCue: c.open, spam75: since < SPAM_SECONDS, spam50: since < .5, falling: vy > 0 };
}

/** Skill profiles. The old human150/250/350 stay in human-flight-planner.mjs; these add playing sense on top of the same human limits.
 *  reaction: seconds from seeing to touching; jitter: uniform +- on every press; cadence: how often the scene is sampled;
 *  cueSigma: standard deviation (s) of the press time around the efficient moment WITH a Lift Guide arrow (x noGuideFactor without it);
 *  slip: chance a planned Lift is late by .15-.45 s; waste: chance of an extra "insurance" tap .15-.4 s after a Lift;
 *  greed: willingness to detour for Sparks (1 = normal), riskTol: how much collision risk is accepted for a Spark; learn: error shrink on a retried stop. */
export const PLAYER_PROFILES = Object.freeze({
  'player-beginner': { reaction: .35, jitter: .10, cadence: .18, horizon: 1.4, drop: .40, cueSigma: .11, noGuideFactor: 2, slip: .12, waste: .10, greed: .8, riskTol: .6, learn: .6, panic: .06 },
  'player-average': { reaction: .25, jitter: .07, cadence: .14, horizon: 1.65, drop: .30, cueSigma: .07, noGuideFactor: 1.8, slip: .06, waste: .04, greed: 1.0, riskTol: .8, learn: .6, panic: .03 },
  'player-good': { reaction: .15, jitter: .04, cadence: .10, horizon: 1.8, drop: .20, cueSigma: .04, noGuideFactor: 1.6, slip: .02, waste: .01, greed: 1.2, riskTol: 1.0, learn: .7, panic: .01 }
});
export function playerProfile(style) { const base = String(style); return PLAYER_PROFILES[base] ? { ...PLAYER_PROFILES[base], player: true, name: base, seekTerrainHelp: false } : null; }

/** Standard normal via Box-Muller from a uniform source. */
export function gaussian(random) { const u = Math.max(1e-9, random()), v = random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/** Skill after context: retrying a stop shrinks errors (the player remembers where they fell); the last heart makes them safer, not better. */
export function effectiveSkill(profile, { retry = false, lastHeart = false, guide = true } = {}) {
  const k = retry ? profile.learn : 1;
  return { sigma: profile.cueSigma * (guide ? 1 : profile.noGuideFactor) * k, slip: profile.slip * k, waste: profile.waste * k, panic: profile.panic * k,
    riskTol: profile.riskTol * (lastHeart ? .6 : 1), greed: profile.greed * (lastHeart ? .8 : 1), horizon: profile.horizon * (retry ? 1.1 : 1) };
}

/** Penalty (in planner score units) for one Lift: its Spark cost weighted by how empty the Meter is, plus a distance-from-cue term. fuelFrac in 0..1. */
export function liftPenalty({ fuelFrac, pressAt, cueAt, sigma }) {
  const scarcity = 1 + 4 * Math.max(0, .55 - fuelFrac) / .55;
  const off = Math.min(1.6, Math.abs(pressAt - cueAt) / (LIFT_PHYSICS.windowSec / 2 + 1e-9)) ;
  return 5 * scarcity + 6 * Math.max(0, off - 1) + 2 * Math.min(1, off);
}

/** Press time with the human timing error: Gaussian around the intended moment, never earlier than the reaction floor. */
export function pressTime({ now, intended, reactionFloor, sigma, random, slip = 0 }) {
  let t = intended + gaussian(random) * sigma;
  if (random() < slip) t += .15 + random() * .3;
  return Math.max(now + reactionFloor, t);
}
