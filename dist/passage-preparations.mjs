// Lasting preparations now live on the Chain as temporary Inscriptions (dist/temporary-inscriptions.mjs, docs/inscriptions.md).
// This file keeps the read side the flight rules use: which boon ids and event favor keys are active, and the spend on a cleared flight.
import {activeBoonIds,activeFavorKeys,spendTemporaryFlights,idsFromEntry} from './temporary-inscriptions.mjs?v=guide-clarity-1';
export const PREPARATION_CLEARS=3;
export const activePassageBoons=run=>activeBoonIds(run);
export const activeEventFavors=run=>activeFavorKeys(run);
// A failed or interrupted attempt never spends a successful-flight reward. Earning the same effect again moves it and refreshes its count;
// magnitudes never stack. `attempt` is the entry snapshot taken when the flight began.
export function spendPreparationClear(run,attempt){
 return spendTemporaryFlights(run,idsFromEntry(attempt));
}
