// Devour cards (Black Hole, Dream, Devourer, Ember Feeder) eat cards for good. The player is told before (departure screen) and after (flight rewards notes).
// Pure helpers, no DOM.
import {previewBlackHoleMeals} from './card-black-hole.mjs?v=cards-3';
import {SKILL_CARDS, getEmberFeederTargets, getEmberSnackTarget, isCardRun} from './skill-cards.mjs?v=cards-3';
import {getLifeCapacity} from './vitality.mjs?v=cards-3';

const nameOf = id => SKILL_CARDS[id]?.name || id;
const join = names => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] || '';
/** Cards eaten by this flight, from the flight record: [{cardId, name, by}]. */
export function flightDevoured(flight) {
  const out = [];
  for (const meal of flight?.cardBlackHoleMeals || []) out.push({cardId: meal.victimCardId, name: meal.victimName || nameOf(meal.victimCardId), by: meal.holeName});
  for (const feed of flight?.emberFeederSacrifices || []) for (const target of feed.targets || []) out.push({cardId: target.cardId, name: target.name || nameOf(target.cardId), by: 'Ember Feeder'});
  for (const meal of flight?.emberSnackMeals || []) out.push({cardId: meal.target.cardId, name: meal.target.name || nameOf(meal.target.cardId), by: 'Ember Snack'});
  for (const eat of flight?.devourerSacrifices || []) out.push({cardId: eat.cardId, name: nameOf(eat.cardId), by: 'Devourer'});
  return out;
}
export const devouredLine = items => items.length ? `Devoured: ${join(items.map(item => item.name))}` : '';

/** Warnings for the departure screen: what a mounted Devour card will eat in the flight about to start. [{text, cardIds}] */
export function departureDevourWarnings(run) {
  if (!isCardRun(run) || run.isTutorial || run.attemptEntry?.started) return [];
  const cards = run.mountedCards || [], out = [];
  for (const meal of previewBlackHoleMeals(cards)) out.push({text: `${meal.holeName} will devour ${meal.victimName}`, cardIds: [meal.victimCardId]});
  cards.forEach((card, slot) => {
    if (card?.cardId === 'ember-snack') {
      const hit = getEmberSnackTarget(cards, slot);
      if (hit) out.push({text: `Ember Snack will devour ${nameOf(hit.card.cardId)} at the Finish`, cardIds: [hit.card.cardId]});
    }
    if (card?.cardId === 'ember-feeder') {
      const targets = getEmberFeederTargets(cards, slot);
      if (targets.length >= 1) out.push({text: `Ember Feeder will devour ${join(targets.map(t => nameOf(t.card.cardId)))} at the Finish`, cardIds: targets.map(t => t.card.cardId)});
    }
    if (card?.cardId === 'devourer' && run.lives < getLifeCapacity(run) && SKILL_CARDS[cards[slot + 1]?.cardId]?.rarity === 'rare')
      out.push({text: `Devourer will devour ${nameOf(cards[slot + 1].cardId)} at the Finish if you clear`, cardIds: [cards[slot + 1].cardId]});
  });
  return out;
}
