// One-flight wagers (the old "oaths"). Accepted at an event or chest, the condition applies to the NEXT flight only (run.pendingOath = {id}).
// Condition met on that flight: a strong immediate payout of Stored Sparks. Not met: nothing. Either way it is gone after that one flight.
// Pure data and text, no DOM. Rules (Luminance, reach, body pickups, holding Sparks) live where they always did: flight-pacts.mjs,
// contextual-events.mjs (Pilgrim's Vow) and treasure.mjs (Sealed Purse).
import {objectiveSparks} from './route-bonuses.mjs?v=fast-3';

export const OATHS = Object.freeze({
  'night-ledger': Object.freeze({id: 'night-ledger', short: 'Fly at 55% Luminance.', name: 'Night’s Ledger', pact: 'night-ledger', multiple: 3, rule: 'Fly the next flight with 55% Luminance. Clear it to win.'}),
  'closed-eye': Object.freeze({id: 'closed-eye', short: 'Sight 38%, card light blocked.', name: 'The Closed Eye', pact: 'blind-pilgrim', multiple: 5, rule: 'Sight stays at 38% of starting Luminance and card light is blocked; Flares and passage lights still work. Clear the next flight to win.'}),
  'silent-orbit': Object.freeze({id: 'silent-orbit', short: 'Collector reach 45% shorter.', name: 'The Silent Orbit', pact: 'silent-orbit', multiple: 3, rule: 'Collector reach is 45% shorter on the next flight. Clear it to win.'}),
  'pilgrim-vow': Object.freeze({id: 'pilgrim-vow', short: 'Collect 4 body Sparks yourself.', name: 'Pilgrim’s Vow', multiple: 3, rule: 'Clear the next flight with 4 body Spark pickups.'}),
  'sealed-purse': Object.freeze({id: 'sealed-purse', short: 'Finish holding 12 Sparks.', name: 'Sealed Purse', multiple: 3, rule: 'Clear the next flight holding 12 Sparks.'})
});
export const OATH_IDS = Object.freeze(Object.keys(OATHS));
export const getOath = id => (typeof id === 'string' && Object.hasOwn(OATHS, id)) ? OATHS[id] : null;
/** The oath that drives a Flight Pact id (night-ledger, blind-pilgrim, silent-orbit). */
export const oathOfPact = pact => OATH_IDS.map(id => OATHS[id]).find(oath => oath.pact === pact) || null;
/** The oath waiting for the next flight (or being flown) on a run, or null. */
export const pendingOathId = run => getOath(run?.pendingOath?.id)?.id || (run?.attemptActive && getOath(run.attemptEntry?.oath?.id)?.id) || null;
/** Stored Sparks a won wager pays: a multiple of the objective payout of the current map. */
export const oathReward = (run, id) => objectiveSparks(run) * (getOath(id)?.multiple || 0);
/** The one plain line stop pages and the paused departure panel use. */
export function oathLine(run, id) {
  const oath = getOath(id);
  return oath ? `Wager, next flight only: ${oath.rule} Won: +${oathReward(run, id)} Stored Sparks. Not met: nothing.` : '';
}
/** The short form the paused departure panel has room for. */
export const oathShort = (run, id) => { const oath = getOath(id); return oath ? `${oath.short} Win: +${oathReward(run, id)} Stored Sparks. Miss: nothing.` : ''; };
/** Old saves: one pending wager survives only if it is still a known oath. Everything else the old oath system stored is dropped. */
export function cleanPendingOath(run) {
  if (!run || typeof run !== 'object') return;
  if (run.pendingOath && !getOath(run.pendingOath.id)) delete run.pendingOath;
  else if (run.pendingOath) run.pendingOath = {id: run.pendingOath.id};
}
