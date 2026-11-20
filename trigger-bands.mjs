// Trigger colour band (owner's work order 15): a thin band on every card face in its Trigger's colour, so a Deck reads by colour.
// Pure and DOM-free. The seven Triggers and the Timer get a colour; Passive, Boost, Repeat and cards with no Trigger share one
// neutral. Colours are the parchment kit's own inks (the rarity rims, the wisp's blue, the Spark gold, the heart red), kept apart
// from the three rarity tones so a band is never mistaken for a rarity.
import {SKILL_CARDS} from './skill-cards.mjs?v=ring-1';
import {getCardTrigger} from './card-rule-bands.mjs?v=ring-1';

export const BAND_COLOURS = Object.freeze({
  collect: '#e0a83a', lift: '#6fb0d8', pulse: '#3fb59f', delivery: '#9a7fc2',
  overfill: '#dd7a3c', finish: '#c8443c', skim: '#86bd4f', timer: '#d98aa8', neutral: '#8f897a'});
export const BAND_NAMES = Object.freeze({
  collect: 'Collect', lift: 'Lift', pulse: 'Pulse', delivery: 'Delivery', overfill: 'Overfill',
  finish: 'Finish', skim: 'Skim', timer: 'Timer', neutral: 'Passive, Boost or Repeat'});

/** {id, colour, name} for a card instance or definition. A Timer card (engine timer) is "timer" whatever its chip says. */
export function bandOf(card) {
  const def = SKILL_CARDS[card?.cardId || card?.id] || {};
  let id = 'neutral';
  if (def.engine?.timer || card?.engine?.timer) id = 'timer';
  else {
    const chip = getCardTrigger(card || {}, def);
    if (chip.kind === 'trigger' && BAND_COLOURS[chip.group]) id = chip.group;
  }
  return {id, colour: BAND_COLOURS[id], name: BAND_NAMES[id]};
}
/** The band as markup: one decorative element carrying its colour. */
export const bandMarkup = (card, cls = 'card-band') => {const b = bandOf(card);return `<i class="${cls}" data-band="${b.id}" style="--band:${b.colour}" aria-hidden="true"></i>`;};
