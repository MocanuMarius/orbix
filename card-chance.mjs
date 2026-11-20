// Chance (owner rule, 20 November 2026): a card or Inscription that should pay less often uses a percentage chance per
// firing (a coin toss), never a counter and never "once per X seconds". One shared mechanic:
//
//   rollChance(runtime, percent)  ->  true when the roll succeeds.
//
// The roll comes from a seeded stream owned by the flight's card execution (`runtime.chanceRng`, built lazily from
// `runtime.chanceSeed`; the flight sets that seed from its own seed, see WispFlight). Draws happen in firing order, never
// per frame, so the same seed and the same events replay the same flight. A runtime with no seed (the Chain-tab simulator,
// tests) uses one fixed seed. A preview runtime (`runtime.preview`) always succeeds: previews and plates show the
// expected value in plain words ("50%: +1 Spark"), never a rolled result.
// A failed roll is not a firing: nothing pays, the card does not light, and nothing that depends on it firing happens.

export const LIFT_GUIDE_CHANCE = 50;
export const METER_MARK_CHANCE = 50;
export const GILDED_CHANCE = 50;
export const COURIER_COLLECT_CHANCE = 33;
export const THIRD_BEAT_CHANCE = 33;
export const FIXED_CHANCE_SEED = 'chain-chance';

/** Same generator as the flight's seededRandom (FNV-1a seed, mulberry32 stream), kept here so this module imports nothing. */
export function chanceStream(seed = FIXED_CHANCE_SEED) {
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

/** Give a runtime its chance seed (the flight calls this with a seed derived from its own). Keeps an existing stream. */
export function seedChance(runtime, seed) {
  if (runtime && !runtime.chanceRng) runtime.chanceSeed = seed;
  return runtime;
}

/** Test hook only: set `globalThis[CHANCE_FORCE] = true` (every roll succeeds) or `false` (every roll fails); delete it to restore the stream.
 * A symbol on globalThis, so every copy of this module (the game imports it with a cache-busting query) sees it. */
export const CHANCE_FORCE = Symbol.for('orbix.chanceForce');

/** One independent roll of `percent` (0 to 100). 0 never succeeds, 100 or more always does and uses no draw. */
export function rollChance(runtime, percent) {
  const p = Number(percent);
  if (!(p > 0)) return false;
  const forced = globalThis[CHANCE_FORCE];
  if (typeof forced === 'boolean') return forced;
  if (p >= 100 || runtime?.preview) return true;
  if (!runtime) return chanceStream(FIXED_CHANCE_SEED)() * 100 < p;
  runtime.chanceRng ??= chanceStream(runtime.chanceSeed ?? FIXED_CHANCE_SEED);
  return runtime.chanceRng() * 100 < p;
}
