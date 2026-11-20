import {cardArt} from './card-art.mjs?v=tidy-1';
import {cardTermTextMarkup} from './card-terms.mjs?v=tidy-1';
import {eventCardOptions} from './model.mjs?v=tidy-1';

// Event card pick (pick 1 of 2, 2026-11-18): after the player taps "Improve a card" or "Refill a card" the SAME screen swaps its two
// big options for the eligible cards, as tiles. Back returns to the two options. Pure markup; the handlers live in app.mjs.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
/** Tiles that fit one screen at 890x400 (two rows of five); the Chain's cards come first. */
export const EVENT_PICK_LIMIT = 10;
export const eventPickKind = offer => offer?.effect?.improveCard ? 'improve' : offer?.effect?.refillCard ? 'refill' : null;

/** The right-hand panel of the event screen while the player chooses a card. */
export function eventPickMarkup(run, kind) {
  const cards = eventCardOptions(run, kind).slice(0, EVENT_PICK_LIMIT), improve = kind === 'improve';
  const tiles = cards.map(c => `<button class="event-pick-card boon-choice" data-tap-pick data-action="event-card" data-id="${esc(c.instanceId)}" aria-label="${esc(c.name)}: ${esc(c.change)}">
 <span class="event-pick-art" aria-hidden="true">${cardArt({...c.card, cardId: c.cardId}, {compact: true})}</span>
 <b>${esc(c.name)}</b><small class="event-pick-change">${esc(c.change)}</small><i>${c.slot === null ? 'Deck' : 'Slot ' + (c.slot + 1)}</i></button>`).join('');
  return `<div class="support-offers event-pick" data-event-pick="${kind}">
 <div class="event-pick-head"><button class="secondary event-pick-back" data-action="event-pick-back">Back</button><div><h2>${improve ? 'Which card rises?' : 'Which card refills?'}</h2>
 <p class="event-pick-hint">${cardTermTextMarkup(improve ? 'Tap a card, tap again to take it. It gains a rank or evolves. Free.' : 'Tap a card, tap again to take it. Its uses return. Free.')}</p></div></div>
 <div class="event-pick-cards">${tiles}</div></div>`;
}
