// Final flight summary: the Overfill line (work order 7). Sparks that a pickup brought past a full Spark Meter spill; the code packs
// them into Stored Sparks at the run's rate (condensed-glow.mjs › condenseGlow: displayed Sparks x multiplier, 1 per 6 without
// packing perks, rounded down with the fraction carried to the next flight). Shown only when something spilled.
import {glowPoints} from './vitality.mjs?v=chance-1';
const whole = v => Math.max(0, Math.floor(Number(v) || 0));
/** {sparks, stored, per, text, long} for lastFlight, or null when nothing spilled. `rules` is condensationRules (multiplier). */
export function overfillSummary(flight, rules = {}) {
  const sparks = glowPoints(Math.max(0, Number(flight?.pickupOverflow) || 0));
  if (!(sparks > 0)) return null;
  const stored = whole(flight?.pickupCondensedGlow), m = Number(rules?.multiplier);
  const per = m > 0 ? Math.max(1, Math.round(1 / m)) : 6;
  return {sparks, stored, per, // short enough for the narrow Recorded effects column (about 40 characters); the detail sheet gives the full sentence
    text: `Overfill · ${sparks} → +${stored} Stored (1 per ${per})`,
    long: `${sparks} Spark${sparks === 1 ? '' : 's'} spilled past a full meter and became +${stored} Stored Sparks, 1 per ${per}.`};
}
