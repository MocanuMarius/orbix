// Temporary Inscriptions (docs/inscriptions.md, "Events and objectives"): what events, optional objectives and oaths give. They live on a
// Chain slot like any Inscription (run.slotInscriptions[slot]); nothing lasting floats loose in the run. Pure run helpers, no DOM.
//   {id, temporary: true, flightsLeft: N, covers: {id}|null}      N cleared flights, then it ends
//   {id, temporary: true, until: 'fulfilled', covers: {id}|null}  an oath: stays until a cleared flight fulfils it
// `covers` is the permanent Inscription the temporary one hides. It is suspended (no rule sees it) and returns when this one ends.
// A temporary Inscription written over another temporary one replaces it and keeps whatever that one covered.
import {getTemporary, getPermanentInscription, writeInscription, TEMPORARY_INSCRIPTIONS, TEMPORARY_BY_BOON, TEMPORARY_BY_FAVOR, cleanSlotInscriptions, permanentOnSlot, migrateChestGifts} from './inscriptions.mjs?v=pulse-2';

const lower = text => /^Black Holes/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
const flightsWord = n => `${n} ${n === 1 ? 'flight' : 'flights'}`;
/** "3 flights" / "Stays until fulfilled". */
export const durationWords = (id, left) => { const t = getTemporary(id); return !t ? '' : t.until ? 'Stays until fulfilled' : flightsWord(left ?? t.flights); };
/** The one line stop pages, offers and receipts use: "Temporary Inscription: Mending — below 6 Sparks, restore up to 6 missing Sparks once per flight. 3 flights." */
export function temporaryLine(id, flights) {
  const t = getTemporary(id);
  if (!t) return '';
  const body = lower(t.text).replace(/\.$/, '');
  return `${t.until ? 'Oath Inscription' : 'Temporary Inscription'}: ${t.name} — ${body}. ${durationWords(id, flights)}.`;
}
/** Counter wording for the inspector: "Temporary: 3 flights left" or "Oath: stays until fulfilled". */
export const temporaryStatus = (id, left) => { const t = getTemporary(id); return !t ? '' : t.until ? 'Oath: stays until fulfilled' : `Temporary: ${flightsWord(left ?? t.flights)} left`; };

/** Every temporary Inscription on the Chain: [{slot, id, def, flightsLeft, until, covers}]. */
export function temporaryEntries(run) {
  const list = Array.isArray(run?.slotInscriptions) ? run.slotInscriptions : [];
  return list.map((entry, slot) => entry?.temporary && getTemporary(entry.id) ? {slot, id: entry.id, def: getTemporary(entry.id), flightsLeft: entry.flightsLeft ?? null, until: entry.until || null, covers: entry.covers?.id || null} : null).filter(Boolean);
}
export const activeTemporaryIds = run => temporaryEntries(run).map(e => e.id);
export const hasTemporary = (run, id) => temporaryEntries(run).some(e => e.id === id);
/** Old passage boon ids (drive FlightBoon) and event favor keys of the temporary Inscriptions on the Chain. */
export const activeBoonIds = run => [...new Set(temporaryEntries(run).map(e => e.def.boon).filter(Boolean))];
export const activeFavorKeys = run => [...new Set(temporaryEntries(run).map(e => e.def.favor).filter(Boolean))];
/** The id of the Flight Pact oath on the Chain (night-ledger, blind-pilgrim, silent-orbit) or null. */
export const activePactId = run => temporaryEntries(run).find(e => e.def.oath === 'pact')?.def.pact || null;
/** Oaths on the Chain (ids), for the flight entry snapshot. */
export const activeOathIds = run => temporaryEntries(run).filter(e => e.def.oath).map(e => e.id);

const slotsOf = run => cleanSlotInscriptions(run);
/** What writing `id` on `slot` would do. needsConfirm when it covers a permanent Inscription or replaces a temporary one. */
export function previewTemporaryWrite(run, id, slot) {
  if (getPermanentInscription(id)) return previewPermanentWrite(run, id, slot);
  const def = getTemporary(id);
  if (!def || !run || !Number.isInteger(slot) || slot < 0 || slot >= slotsOf(run).length) return null;
  const here = run.slotInscriptions[slot];
  const replacesTemporary = here?.temporary ? here.id : null;
  const covers = permanentOnSlot(run, slot);
  const movesFrom = temporaryEntries(run).find(e => e.id === id && e.slot !== slot)?.slot ?? null;
  return {id, slot, covers, replacesTemporary, movesFrom, needsConfirm: !!(covers || replacesTemporary)};
}
/** The same slot screen also writes a PERMANENT chest gift (Far Lens ...): it replaces a permanent Inscription on the slot (confirm), and under a
 * temporary one it is written beneath it. Nothing else changes. */
function previewPermanentWrite(run, id, slot) {
  if (!run || !Number.isInteger(slot) || slot < 0 || slot >= slotsOf(run).length) return null;
  const replaces = permanentOnSlot(run, slot);
  return {id, slot, permanent: true, replaces: replaces === id ? null : replaces, covers: null, replacesTemporary: null, movesFrom: null, beneath: run.slotInscriptions[slot]?.temporary ? run.slotInscriptions[slot].id : null, needsConfirm: !!replaces && replaces !== id};
}
/** Write a temporary Inscription. The same one elsewhere moves here (earning it again refreshes its count). Returns the preview, or false. */
export function writeTemporary(run, slot, id, {flights} = {}) {
  const preview = previewTemporaryWrite(run, id, slot);
  if (!preview) return false;
  const def = getTemporary(id), list = run.slotInscriptions, here = list[slot];
  const covers = here ? (here.temporary ? here.covers : {id: here.id}) : null;
  if (preview.movesFrom !== null) endSlot(run, preview.movesFrom);
  const left = Math.max(1, Math.min(9, Math.floor(Number(flights ?? def.flights ?? 3))));
  list[slot] = def.until ? {id, temporary: true, until: def.until, covers: covers || null} : {id, temporary: true, flightsLeft: left, covers: covers || null};
  return preview;
}
/** End the temporary Inscription on a slot: what it covered comes back. */
function endSlot(run, slot) {
  const entry = run.slotInscriptions?.[slot];
  if (entry?.temporary) run.slotInscriptions[slot] = entry.covers?.id ? {id: entry.covers.id} : null;
}
export const endTemporary = (run, id) => { const e = temporaryEntries(run).find(item => item.id === id); if (!e) return false; endSlot(run, e.slot); return true; };
/** A cleared flight spends one flight of each listed temporary Inscription (by id). Returns the ids that ended. */
export function spendTemporaryFlights(run, ids) {
  const ended = [];
  for (const id of new Set(ids || [])) {
    const e = temporaryEntries(run).find(item => item.id === id);
    if (!e || e.until) continue;
    const entry = run.slotInscriptions[e.slot];
    entry.flightsLeft = (entry.flightsLeft || 1) - 1;
    if (entry.flightsLeft <= 0) { endSlot(run, e.slot); ended.push(id); }
  }
  return ended;
}
/** The temporary ids a flight entry carries, from the old modifier ids it was snapshotted with. */
export const idsFromEntry = entry => [...(entry?.flightBoons || []).map(id => TEMPORARY_BY_BOON[id]), ...(entry?.eventFavors || []).map(id => TEMPORARY_BY_FAVOR[id])].filter(Boolean);

/** First slot without a temporary Inscription (a bare one first), or -1. For scripts, tests and migration; screens ask the player. */
export function firstOpenSlot(run) {
  const list = slotsOf(run);
  const free = list.map((entry, slot) => ({entry, slot})).filter(item => !item.entry?.temporary);
  return (free.find(item => !item.entry) || free[0])?.slot ?? -1;
}
/** Earn a temporary Inscription: the player writes it on a slot of their choice (run.pendingTemporary, resolved on its own screen).
 * Nothing is pending afterwards. Returns false when there is no slot to write on (a run without a Chain drops the effect). */
/** Earn a PERMANENT chest-gift Inscription: the player writes it on a slot on the same screen as a temporary one. False when the run has no
 * Chain (the gift is dropped) or the Inscription is already written. */
export function queueInscriptionWrite(run, id, {source = 'chest', label = ''} = {}) {
  if (!getPermanentInscription(id) || !slotsOf(run).length || (run.slotInscriptions || []).some((entry, slot) => permanentOnSlot(run, slot) === id)) return false;
  if (run.pendingTemporary) writePendingTemporary(run, undefined, {confirm: true});
  run.pendingTemporary = {id, permanent: true, flights: null, source, label};
  return true;
}
export function queueTemporary(run, id, {flights, source = 'event', label = ''} = {}) {
  if (!getTemporary(id) || !slotsOf(run).length) return false;
  if (run.pendingTemporary) writePendingTemporary(run, undefined, {confirm: true});
  run.pendingTemporary = {id, flights: flights ?? getTemporary(id).flights ?? 3, source, label};
  return true;
}
export const previewPendingTemporary = (run, slot) => run?.pendingTemporary ? previewTemporaryWrite(run, run.pendingTemporary.id, slot) : null;
/** Write the pending one. Needs `confirm: true` when it covers or replaces something (the screen asks first). Omit the slot: first open slot. */
export function writePendingTemporary(run, slot, {confirm = false} = {}) {
  const pending = run?.pendingTemporary;
  if (!pending) return false;
  if (slot === undefined) { slot = pending.permanent ? Math.max(0, slotsOf(run).findIndex((entry, i) => !permanentOnSlot(run, i))) : firstOpenSlot(run); confirm = true; }
  const preview = previewTemporaryWrite(run, pending.id, slot);
  if (!preview || preview.needsConfirm && !confirm) return false;
  if (pending.permanent) writeInscription(run, slot, pending.id);
  else writeTemporary(run, slot, pending.id, {flights: pending.flights});
  run.lastTemporaryWrite = {...preview, flights: pending.flights, source: pending.source};
  delete run.pendingTemporary;
  return preview;
}

const OLD_FIELDS = ['passageBoons', 'favorClears', 'eventFavors', 'nextFlightBoon', 'nextFlightPact', 'pilgrimVow'];
/** Old saves: lasting effects that used to float in the run move onto the Chain (first slot without a temporary Inscription, covering if
 * needed) with their remaining count. No slot: dropped. Unrelated fields (routePreparation, treasure gifts) stay. Returns what moved. */
export function migrateLooseEffects(run) {
  if (!run || typeof run !== 'object') return [];
  migrateChestGifts(run);
  const had = OLD_FIELDS.some(key => key in run) || run.treasurePact === 'wager';
  if (!had) return [];
  const found = [];
  const add = (id, flights) => { if (getTemporary(id) && !found.some(f => f.id === id)) found.push({id, flights}); };
  for (const [boon, n] of Object.entries(run.passageBoons || {})) if (Number(n) > 0) add(TEMPORARY_BY_BOON[boon], Math.min(9, Math.floor(Number(n))));
  if (run.nextFlightBoon) add(TEMPORARY_BY_BOON[run.nextFlightBoon], 1);
  for (const [favor, n] of Object.entries(run.favorClears || {})) if (Number(n) > 0) add(TEMPORARY_BY_FAVOR[favor], Math.min(9, Math.floor(Number(n))));
  for (const favor of run.eventFavors || []) add(TEMPORARY_BY_FAVOR[favor], 1);
  if (run.nextFlightPact) add(Object.values(TEMPORARY_INSCRIPTIONS).find(t => t.pact === run.nextFlightPact)?.id, 3);
  if (run.pilgrimVow) add('pilgrim-vow', 1);
  if (run.treasurePact === 'wager') add('sealed-purse', 1);
  for (const key of OLD_FIELDS) delete run[key];
  if (run.treasurePact === 'wager') delete run.treasurePact;
  const moved = [];
  for (const item of found) {
    const slot = slotsOf(run).findIndex(entry => !entry?.temporary);
    if (slot < 0) continue;
    writeTemporary(run, slot, item.id, {flights: item.flights});
    moved.push({...item, slot});
  }
  return moved;
}
