// Black Hole, the card (the owner's design; docs/engine-cards.md). At the start of each real flight it destroys the
// card in the Slot to its right and grows for the rest of the run: +1 max Sparks for a Common eaten, +2 for a Rare,
// +3 for a Legendary. The running total lives on the Black Hole instance (eaten, eatenGrowth) for its face; the
// growth itself is run.cardBlackHoleGrowth, added to the meter through vitality.mjs › getRawGlowCapacity (so the
// 100-Spark ceiling applies and Boosts never touch it). The eaten card leaves the run for good and is recorded in
// run.cardHistory. Practice and tutorial runs are not card runs, so Black Hole is inert there; it never eats a loaned
// practice card in any case. Resolved left to right with the Use Doubler at real flight entry (model.mjs ›
// markFlightAttemptStarted), never by a preview, a Dream rehearsal or a retry of the same attempt.
import {SKILL_CARDS, CARD_ECONOMY, isCardRun, describeSkillCard, recordCardEvent, cleanCardFutureCapacity} from './skill-cards.mjs?v=guide-clarity-1';

export const BLACK_HOLE_GROWTH = Object.freeze({ common: 1, rare: 2, legendary: 3 });
const isBlackHole = card => SKILL_CARDS[card?.cardId]?.kind === 'black-hole';
/** Loaned practice cards carry `<run>:practice:<card>` instance ids (practice-route.mjs › loanPracticeCards). */
export const isLoanedPracticeCard = card => typeof card?.instanceId === 'string' && /:practice:/.test(card.instanceId);

/** Pure: what each Black Hole in this Chain would eat at take-off, left to right, without changing anything.
 * For the Chain screen's "Eaten at take-off" plate and the confirmation dialog (Phase 2). */
export function previewBlackHoleMeals(cards) {
  const row = (Array.isArray(cards) ? cards : cards?.mountedCards || cards?.cards || []).slice(0, CARD_ECONOMY.maxSlots);
  const gone = new Set(), meals = [];
  for (let slot = 0; slot < row.length; slot++) {
    const hole = row[slot];
    if (!isBlackHole(hole) || gone.has(slot)) continue;
    const victim = row[slot + 1], def = SKILL_CARDS[victim?.cardId];
    if (!victim || !def || gone.has(slot + 1) || isLoanedPracticeCard(victim)) continue;
    const growth = BLACK_HOLE_GROWTH[def.rarity] || 0;
    gone.add(slot + 1);
    meals.push({ slot: slot + 1, holeSlot: slot, holeInstanceId: hole.instanceId, victimInstanceId: victim.instanceId,
      victimCardId: victim.cardId, victimName: describeSkillCard(victim)?.name || def.name, rarity: def.rarity, growth });
  }
  return meals;
}

/** At real flight entry: eat, grow, record. Returns the meals (empty outside card runs). */
export function consumeBlackHoles(run) {
  if (!isCardRun(run)) return [];
  const meals = previewBlackHoleMeals(run.mountedCards || []);
  for (const meal of meals) {
    const hole = run.mountedCards[meal.holeSlot], victim = run.mountedCards[meal.slot];
    if (!hole || !victim || victim.instanceId !== meal.victimInstanceId) continue;
    run.mountedCards[meal.slot] = null;
    run.reserveCards = (run.reserveCards || []).filter(card => card?.instanceId !== victim.instanceId);
    hole.eaten = (Math.floor(Number(hole.eaten)) || 0) + 1;
    hole.eatenGrowth = (Math.floor(Number(hole.eatenGrowth)) || 0) + meal.growth;
    run.cardBlackHoleGrowth = cleanCardFutureCapacity(run.cardBlackHoleGrowth) + meal.growth;
    meal.eaten = hole.eaten; meal.eatenGrowth = hole.eatenGrowth;
    recordCardEvent(run, 'black-hole', { holeInstanceId: hole.instanceId, card: describeSkillCard(victim), growth: meal.growth,
      eaten: hole.eaten, eatenGrowth: hole.eatenGrowth });
  }
  return meals;
}

/** "Eaten 4 · +7 max Sparks" for the card face (Phase 2 shows it). */
export const blackHoleTally = card => ({ eaten: Math.floor(Number(card?.eaten)) || 0, growth: Math.floor(Number(card?.eatenGrowth)) || 0 });
