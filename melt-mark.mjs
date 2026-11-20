// Melt mark (owner's work order 14): a reminder flag on a card instance ("melt this later"). Melt itself is not Rest-only in this
// game (the Deck melts any card whenever it can be managed, model.mjs › meltOwnedCards, same price and rule), so the mark only
// remembers the player's wish: it never melts anything by itself, never changes a card's numbers, and is shown as a small badge
// wherever the Deck shows the card. It is stored as an optional `meltMark: true` on the card instance in the run (absent when clear),
// which old saves simply do not have.
const owned = run => [...(run?.mountedCards || []), ...(run?.reserveCards || [])].filter(Boolean);
export const isMeltMarked = card => card?.meltMark === true;
/** Toggle the mark on one owned card. Returns the new state (true/false) or null when the card is not in the run. */
export function toggleMeltMark(run, instanceId) {
  const card = owned(run).find(c => c.instanceId === instanceId);
  if (!card) return null;
  if (card.meltMark === true) {delete card.meltMark;return false;}
  card.meltMark = true;
  return true;
}
/** Instance ids currently marked, mounted cards first: what a multi-select melt opens with. */
export const meltMarkedIds = run => owned(run).filter(isMeltMarked).map(c => c.instanceId);
/** Small badge for a card face or tile; empty when the card is not marked. Whole-pixel, the word is for readers and screen readers. */
export const meltMarkBadge = (card, cls = 'card-melt-mark') => isMeltMarked(card) ? `<span class="${cls}" role="img" aria-label="Marked to melt"><b>Melt</b></span>` : '';
