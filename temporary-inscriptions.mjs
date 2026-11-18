// Writing a chest find (docs/inscriptions.md, "Chest gifts"): the player writes the permanent Inscription on a slot of the Chain on its own screen
// (run.pendingTemporary, kept under this old name; it only ever holds a permanent chest find). Temporary Inscriptions no longer exist: events,
// objectives and oaths pay at once (dist/route-bonuses.mjs, dist/event-choices.mjs, dist/oaths.mjs). Pure run helpers, no DOM.
import {getPermanentInscription, writeInscription, cleanSlotInscriptions, permanentOnSlot, migrateChestGifts} from './inscriptions.mjs?v=starter-1';

const slotsOf = run => cleanSlotInscriptions(run);

/** What writing the chest find `id` on `slot` would do: it replaces the Inscription of the slot (confirm), nothing else changes. */
export function previewFindWrite(run, id, slot) {
  if (!run || !getPermanentInscription(id) || !Number.isInteger(slot) || slot < 0 || slot >= slotsOf(run).length) return null;
  const replaces = permanentOnSlot(run, slot);
  return {id, slot, permanent: true, replaces: replaces === id ? null : replaces, needsConfirm: !!replaces && replaces !== id};
}
/** Earn a chest-find Inscription: the player writes it on a slot of their choice. False when the run has no Chain (the find is dropped) or it is
 * already written. */
export function queueInscriptionWrite(run, id, {source = 'chest', label = ''} = {}) {
  if (!getPermanentInscription(id) || !slotsOf(run).length || (run.slotInscriptions || []).some((entry, slot) => permanentOnSlot(run, slot) === id)) return false;
  if (run.pendingTemporary) writePendingTemporary(run, undefined, {confirm: true});
  run.pendingTemporary = {id, permanent: true, flights: null, source, label};
  return true;
}
export const previewPendingTemporary = (run, slot) => run?.pendingTemporary ? previewFindWrite(run, run.pendingTemporary.id, slot) : null;
/** Write the pending find. Needs `confirm: true` when it replaces something (the screen asks first). Omit the slot: first slot without an Inscription. */
export function writePendingTemporary(run, slot, {confirm = false} = {}) {
  const pending = run?.pendingTemporary;
  if (!pending) return false;
  if (slot === undefined) { slot = Math.max(0, slotsOf(run).findIndex((entry, i) => !permanentOnSlot(run, i))); confirm = true; }
  const preview = previewFindWrite(run, pending.id, slot);
  if (!preview || preview.needsConfirm && !confirm) return false;
  writeInscription(run, slot, pending.id);
  run.lastTemporaryWrite = {...preview, source: pending.source};
  delete run.pendingTemporary;
  return preview;
}

const OLD_FIELDS = ['passageBoons', 'favorClears', 'eventFavors', 'nextFlightBoon', 'nextFlightPact', 'pilgrimVow', 'lastVow'];
/** Old saves, once, on every load: temporary Inscriptions and everything that fed them are dropped.
 *  - a slot entry that was temporary is replaced by the permanent Inscription it covered (cleanSlotInscriptions does this);
 *  - a pending temporary choice is skipped (only a pending permanent chest find survives);
 *  - loose fields (passageBoons, favorClears, eventFavors, nextFlightBoon, nextFlightPact, pilgrimVow) and an old sealed-purse wager go;
 *  - an attempt entry's boons, favors and old oaths are dropped.
 * Chest gifts held loose (run.treasureGifts) still move onto the Chain. */
export function dropTemporaryRemnants(run) {
  if (!run || typeof run !== 'object') return;
  migrateChestGifts(run);
  for (const key of OLD_FIELDS) delete run[key];
  if (run.treasurePact === 'wager') delete run.treasurePact;
  delete run.lastTemporaryWrite;
  if (run.pendingTemporary && !run.pendingTemporary.permanent) delete run.pendingTemporary;
  if (Array.isArray(run.slotInscriptions)) cleanSlotInscriptions(run);
  const entry = run.attemptEntry;
  if (entry && typeof entry === 'object') {
    delete entry.flightBoons; delete entry.eventFavors; delete entry.flightBoon;
    if (!entry.started && !entry.oath) { entry.flightPact = null; }
    if (Array.isArray(entry.slotInscriptions)) entry.slotInscriptions = entry.slotInscriptions.map(item => item?.temporary ? (item.covers?.id ? {id: item.covers.id} : null) : item);
  }
}
