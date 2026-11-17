/** Small, serializable skills-as-cards pilot. Printed Sparks use the existing .3 display scale. */
import {getInscription, slotInscriptionId, hollowBonus, lodestoneBonus, emberBedStored, cleanSlotInscriptions, countInscription} from "./inscriptions.mjs?v=rest-2";
export const CARD_SYSTEM = "cards-v1";
export const CARD_UNIT = 10 / 3;
import {CARD_CATALOG,CARD_DROP_WEIGHTS} from './card-catalog.mjs?v=rest-2';
import {cardOfferMultiplier} from './card-offer-context.mjs?v=rest-2';
import {interpolateCardText,getCardTrigger,cardRuleSentence} from './card-rule-bands.mjs?v=rest-2';
const maximumGrowthAmount = Math.max(...Object.values(CARD_CATALOG)
  .filter(card => card.kind === 'camp-grow').map(card => card.amount + card.maxRank - 1));
export const CARD_ECONOMY = Object.freeze({
  melt: { common: 10, rare: 20, legendary: 40 },
  // Forge (approved 2026-11-17): first price per rarity; each forge of that rarity at the
  // same Rest multiplies the next price by forgeGrowth (rounded up); a new Rest starts over.
  // The forged card stays hidden until paid.
  forge: { common: 15, rare: 40, legendary: 150 },
  forgeGrowth: 1.5,
  improve: { common: 15, rare: 25, legendary: 40 },
  // Evolving into a Legendary costs the first Legendary forge (2026-11-17), so a Common
  // Prism Lens is no cheap road to Prism Lens II.
  evolve: { rare: 25, legendary: 150 },
  maxSlots: 5,
  maxEffectiveSources: 9,
  maxPackingWeight: 36,
  maxGrowPerAction: maximumGrowthAmount * 9,
});
export const SKILL_CARDS = CARD_CATALOG;
/** Every pool a player can draw from (starters, rewards, Rest, Forge, drafts) uses this, never the raw catalog.
 * Unreleased cards (catalog flag unreleased: true, the engine cards of docs/engine-cards.md) are left out exactly
 * like retired ones, but a run that holds one (tests, the card inspector's engine scenario) keeps and uses it. */
export const LIVE_CARDS = Object.freeze(Object.values(SKILL_CARDS).filter(d => !d.retired && !d.unreleased));
/** Not offered anywhere: retired or not yet released. */
export const isUnofferedCard = id => !SKILL_CARDS[id] || SKILL_CARDS[id].retired === true || SKILL_CARDS[id].unreleased === true;
/** A held copy that is retired: the whole card, or an old copy of a card that came back with new rules
 * (`retiredBefore`: copies without that `edition` are the old card, paid out on load). */
export const isRetiredCopy = card => { const def = SKILL_CARDS[card?.cardId]; return !!def && (def.retired === true || Number.isFinite(def.retiredBefore) && !(Number(card.edition) >= def.retiredBefore)); };
/** Rest cards live in the Deck; limited flight cards still need an active slot. */
export const isInventoryOnlyCard = card => ['camp-grow', 'camp-extra'].includes(SKILL_CARDS[card?.cardId || card?.id]?.kind || card?.kind);
export function getInventoryCampCards(run, kind) {
  const seen = new Set();
  return [...(run?.mountedCards || []), ...(run?.reserveCards || [])].filter(card => {
    const def = SKILL_CARDS[card?.cardId];
    if (!card || !def || !isInventoryOnlyCard(card) || (kind && def.kind !== kind) || seen.has(card.instanceId) || (def.charges && !(card.charges > 0))) return false;
    seen.add(card.instanceId); return true;
  });
}
const clone = (value) => JSON.parse(JSON.stringify(value));
const integer = (n, max = 1e9) =>
  Math.max(0, Math.min(max, Number.isFinite(n) ? Math.floor(n) : 0));
const boundedGrowth = (amount, uses) => Math.max(0, Math.min(
  integer(uses, 3) * CARD_ECONOMY.maxGrowPerAction * CARD_UNIT,
  Number.isFinite(amount) ? amount : 0,
));
export const isCardRun = (run) =>
  run?.skillSystem === CARD_SYSTEM && !run?.isTutorial;
/** Permanent capacity is stored in printed Spark units, never rounded simulation fuel. */
export const cleanCardFutureCapacity = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export const cleanCardCruisingSpeed = value => integer(value, 6);
export function getCardFutureCapacityBonus(run) {
  return isCardRun(run) ? cleanCardFutureCapacity(run.cardFutureCapacity) * CARD_UNIT : 0;
}
/** Black Hole growth (printed max Sparks, whole): stored on each Black Hole card, counted only while it is mounted. */
export function getCardBlackHoleBonus(run) {
  if (!isCardRun(run)) return 0;
  let total = 0;
  for (const card of run.mountedCards || []) if (SKILL_CARDS[card?.cardId]?.kind === 'black-hole') total += cleanCardFutureCapacity(Math.floor(Number(card.eatenGrowth)));
  return total * CARD_UNIT;
}
/** Gilded Rim and Tithe (batch 3): +1 max Sparks per count, stored on each card, counted only while it is mounted. 0 without them. */
export function getCardTallyCapacity(run) {
  if (!isCardRun(run)) return 0;
  let total = 0;
  for (const card of run.mountedCards || []) if (['gilded-rim', 'tithe'].includes(SKILL_CARDS[card?.cardId]?.kind)) total += cleanCardFutureCapacity(integer(card.tally));
  return total * CARD_UNIT;
}
/** Dream's Devour growth in seconds (0 to 32), from the best mounted Dream (extra Dreams keep one). */
export const DREAM_BASE_SECONDS = 8, DREAM_MAX_BONUS_SECONDS = 32;
export function getCardDreamBonus(run) {
  let best = 0;
  for (const card of run?.mountedCards || []) if (SKILL_CARDS[card?.cardId]?.kind === 'dream') best = Math.max(best, Number(card.eatenGrowth) || 0);
  return Math.min(DREAM_MAX_BONUS_SECONDS, Math.max(0, best));
}
function random(seed) {
  let s = 2166136261;
  for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
  return () => {
    s += 0x6d2b79f5;
    let n = s;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeSkillCard(cardId, instanceId) {
  const def = SKILL_CARDS[cardId];
  return def
    ? {
        instanceId: String(instanceId),
        cardId,
        rank: 1,
        ...(def.charges ? { charges: def.charges } : {}),
        ...(def.edition ? { edition: def.edition } : {}),
      }
    : null;
}
/** A doubled card keeps its actual ceiling through saves, swaps and paid refills. */
export function getCardChargeCapacity(card) {
  const base = SKILL_CARDS[card?.cardId || card?.id]?.charges;
  return Number.isFinite(base) ? Math.max(base, integer(card?.chargeCapacity)) : 0;
}
export const getCardFeederCapacity = card =>
  SKILL_CARDS[card?.cardId || card?.id]?.kind === 'ember-feeder' ? integer(card?.fedCapacity) : 0;
const livePhysicalCard = card => {
  const def = SKILL_CARDS[card?.cardId];
  return !!def && !isInventoryOnlyCard(card) && (!def.charges || card.charges > 0);
};
export function getUseDoublerTarget(cards, slot) {
  const target = cards?.[slot + 1], def = SKILL_CARDS[target?.cardId];
  return livePhysicalCard(target) && def.charges && def.kind !== 'use-doubler' ? target : null;
}
/** Physical targets keep their slots and instance identities; holes are skipped. */
export function getEmberFeederTargets(cards, slot) {
  const targets = [];
  for (let index = slot + 1; index < (cards?.length || 0) && targets.length < 2; index++) {
    if (livePhysicalCard(cards[index])) targets.push({ card: cards[index], slot: index });
  }
  return targets.length === 2 ? targets : [];
}
/** Called only once when the real attempt starts, never by a build quote. */
export function consumeCardUseDoublers(run) {
  if (!isCardRun(run)) return [];
  const grants = [], cards = run.mountedCards || [];
  for (let slot = 0; slot < cards.length; slot++) {
    const source = cards[slot], target = getUseDoublerTarget(cards, slot);
    if (source?.cardId !== 'use-doubler' || !(source.charges > 0) || !target) continue;
    const before = integer(target.charges), after = integer(before * 2);
    if (after <= before) continue;
    target.charges = after;
    const capacity = Math.max(getCardChargeCapacity(target), after);
    if (capacity > SKILL_CARDS[target.cardId].charges) target.chargeCapacity = capacity;
    const grant = { sourceInstanceId: source.instanceId, sourceCardId: source.cardId,
      targetInstanceId: target.instanceId, cardId: target.cardId, name: SKILL_CARDS[target.cardId].name,
      slot: slot + 1, before, after, chargeCapacity: capacity };
    cards[slot] = null;
    run.reserveCards = (run.reserveCards || []).filter(card => card.instanceId !== source.instanceId);
    grants.push(grant); recordCardEvent(run, 'use-doubler', grant);
  }
  return grants;
}
function cleanCard(card, seen) {
  if (['courier-tip-ii','downbeat-ii','toll-bell-ii'].includes(card?.cardId)) card = {...card,cardId:card.cardId.slice(0,-3),rank:2};
  if (card?.cardId === 'trail-vessel') card = {...card, cardId: 'growth-ring'};
  if (card?.cardId === 'bellows-seal') card = {...card, cardId: 'wind-feather'};
  const def = SKILL_CARDS[card?.cardId],
    id = card?.instanceId == null ? "" : String(card.instanceId);
  if (!def || !id || seen.has(id)) return null;
  const charges = def.charges
    ? Number.isFinite(card.charges)
      ? integer(card.charges, getCardChargeCapacity(card))
      : def.charges
    : null;
  if (charges === 0) return null;
  seen.add(id);
  return {
    instanceId: id,
    cardId: card.cardId,
    rank: Math.max(1, integer(card.rank || 1, def.maxRank)),
    ...(charges === null ? {} : { charges }),
    ...(def.charges && getCardChargeCapacity(card) > def.charges ? { chargeCapacity: getCardChargeCapacity(card) } : {}),
    ...(def.kind === 'ember-feeder' && getCardFeederCapacity(card) ? { fedCapacity: getCardFeederCapacity(card) } : {}),
    // A Devour card's running total (Black Hole, Dream), written only once it has eaten something.
    ...(def.kind === 'black-hole' && integer(card.eaten) ? { eaten: integer(card.eaten), eatenGrowth: integer(card.eatenGrowth) } : {}),
    ...(def.kind === 'dream' && integer(card.eaten) ? { eaten: integer(card.eaten), eatenGrowth: Math.min(DREAM_MAX_BONUS_SECONDS, Math.max(0, Math.round(Number(card.eatenGrowth) * 2) / 2 || 0)) } : {}),
    // Scar Tissue, Collector's Ledger, Old Friend: what the card has counted (batch 2).
    ...((def.tallyEvent || def.tallied) && integer(card.tally) ? { tally: integer(card.tally) } : {}),
    ...(def.edition && integer(card.edition) ? { edition: integer(card.edition) } : {}),
  };
}
/** Rewards are receipts. The actual card enters the reserve before progression. */
export function settleCardReward(run) {
  const reward = run?.cardReward;
  if (!isCardRun(run) || !reward || reward.claimed) return false;
  const existing = [...(run.mountedCards || []), ...(run.reserveCards || [])],
    seen = new Set(existing.filter(Boolean).map((card) => String(card.instanceId))),
    card = cleanCard(reward.card, new Set());
  if (!card) return false;
  if (!seen.has(card.instanceId)) (run.reserveCards ??= []).push(card);
  reward.claimed = true;
  reward.choice = "deck";
  reward.slot = null;
  recordCardEvent(run, "store", {
    rewardId: reward.id,
    card: describeSkillCard(card),
  });
  return true;
}
export function cleanCardRun(run) {
  if (!isCardRun(run)) return;
  // Old saves: Twin Wick once unlocked a run-wide second Collector. Trade the flag for a full card.
  if ('cardTwinWickUnlocked' in run) {
    delete run.cardTwinWickUnlocked;
    for (const card of [...(run.mountedCards || []), ...(run.reserveCards || [])]) if (card?.cardId === 'twin-wick') card.charges = 4;
  }
  run.cardFutureCapacity = cleanCardFutureCapacity(run.cardFutureCapacity);
  // Old saves: Black Hole growth was run-wide. It now lives on a mounted Black Hole (the first one), else it is dropped.
  if ('cardBlackHoleGrowth' in run) {
    const old = cleanCardFutureCapacity(run.cardBlackHoleGrowth), hole = (run.mountedCards || []).find(card => SKILL_CARDS[card?.cardId]?.kind === 'black-hole');
    if (hole && old > (Number(hole.eatenGrowth) || 0)) { hole.eatenGrowth = old; hole.eaten = Math.max(1, Math.floor(Number(hole.eaten)) || 0); }
    delete run.cardBlackHoleGrowth;
  }
  run.cardCruisingSpeed = cleanCardCruisingSpeed(run.cardCruisingSpeed);
  run.cardCruisingSpeedUnlocked = cleanCardCruisingSpeed(run.cardCruisingSpeedUnlocked ?? run.cardCruisingSpeed);
  run.cardClearReceipts = (Array.isArray(run.cardClearReceipts) ? run.cardClearReceipts : []).filter(receipt =>
    receipt?.version === 2 && receipt.runId === run.id && typeof receipt.nodeId === 'string' &&
    receipt.event?.kind === 'flight-clear' && Number.isSafeInteger(receipt.futureCapacity) && receipt.futureCapacity >= 0 &&
    Number.isSafeInteger(receipt.cruisingSpeed) && receipt.cruisingSpeed >= 0 && Array.isArray(receipt.steps) &&
    Array.isArray(receipt.sources) && receipt.charges && typeof receipt.charges === 'object').map(receipt => {
      receipt.sources.forEach(Object.freeze);Object.freeze(receipt.sources);return freezeReceipt(receipt);
    });
  // Old saves without a generated final receipt never synthesize an award.
  if (run.cardVictoryReceipt?.version === 1 && run.cardVictoryReceipt.runId === run.id &&
      run.cardVictoryReceipt.event?.kind === 'expedition-victory' &&
      Number.isSafeInteger(run.cardVictoryReceipt.futureCapacity) && run.cardVictoryReceipt.futureCapacity >= 0 &&
      Array.isArray(run.cardVictoryReceipt.sources) && Array.isArray(run.cardVictoryReceipt.steps) &&
      run.cardVictoryReceipt.charges && typeof run.cardVictoryReceipt.charges === 'object') {
    for (const source of run.cardVictoryReceipt.sources) Object.freeze(source);
    Object.freeze(run.cardVictoryReceipt.sources);
    freezeReceipt(run.cardVictoryReceipt);
  } else delete run.cardVictoryReceipt;
  // Only recorded card Grow actions migrate: unrelated Rest capacity stays put.
  const grewAt = new Set([
    ...(run.cardHistory || []).filter((event) => event.type === "camp" && event.action === "grow")
      .map((event) => `${event.mapIndex}:${event.nodeId}`),
    ...(run.restVisits || []).filter((visit) => visit.actions?.includes("grow"))
      .map((visit) => visit.key || `${visit.mapIndex}:${visit.nodeId}`),
  ]);
  const migrateGrowth = (owner) => {
    if (!owner) return;
    if (!Number.isFinite(owner.cardGrowUses)) {
      owner.cardGrowUses = integer(grewAt.size, 3);
      const legacy = Math.min(integer(owner.restGlowCapacity, 30), owner.cardGrowUses * 10);
      owner.cardGrowCapacity = legacy;
      owner.restGlowCapacity = Math.max(0, (Number(owner.restGlowCapacity) || 0) - legacy);
    }
    owner.cardGrowUses = integer(owner.cardGrowUses, 3);
    owner.cardGrowCapacity = boundedGrowth(owner.cardGrowCapacity, owner.cardGrowUses);
  };
  migrateGrowth(run);
  migrateGrowth(run.attemptEntry);
  run.cardSlots = Math.max(
    3,
    integer(run.cardSlots || 3, CARD_ECONOMY.maxSlots),
  );
  const seen = new Set(),
    mounted = Array.isArray(run.mountedCards) ? run.mountedCards : [];
  run.mountedCards = Array.from({ length: run.cardSlots }, (_, i) =>
    cleanCard(mounted[i], seen),
  );
  // A legacy malformed slot count must never silently discard a valid instance.
  run.reserveCards = [
    ...mounted.slice(run.cardSlots),
    ...(Array.isArray(run.reserveCards) ? run.reserveCards : []),
  ].map((card) => cleanCard(card, seen)).filter(Boolean);
  // Older saves mounted Rest cards. Return the same instances without spending uses.
  for (const [index, card] of run.mountedCards.entries()) {
    if (!isInventoryOnlyCard(card)) continue;
    run.reserveCards.push(card);
    run.mountedCards[index] = null;
  }
  run.cardHistory = Array.isArray(run.cardHistory) ? run.cardHistory : [];
  run.cardRewardedNodes = Array.isArray(run.cardRewardedNodes)
    ? run.cardRewardedNodes
    : [];
  run.cardSlotMaps = Array.isArray(run.cardSlotMaps) ? run.cardSlotMaps : [];
  run.cardPackingRemainder = integer(run.cardPackingRemainder, 3);
  run.cardForgeCounts = Object.fromEntries(["rare", "legendary"].map((rarity) => [rarity, integer(run.cardForgeCounts?.[rarity])]));
  // Forges paid this run, per rarity: it seeds the surprise card. Older runs start at zero.
  run.cardForgeTally = Object.fromEntries(CARD_FORGE_RARITIES.map(rarity => [rarity, integer(run.cardForgeTally?.[rarity])]));
  // Per-Rest price counts (×1.5 per forge at that Rest); older saves keep theirs.
  if (run.cardForgePricing && typeof run.cardForgePricing.key === 'string') {
    run.cardForgePricing = { key: run.cardForgePricing.key,
      counts: Object.fromEntries(CARD_FORGE_RARITIES.map(rarity => [rarity, integer(run.cardForgePricing.counts?.[rarity])])) };
  } else delete run.cardForgePricing;
  if (run.cardReward?.card) {
    const receiptCard = cleanCard(run.cardReward.card, new Set());
    if (receiptCard) run.cardReward.card = receiptCard;
  }
  if (run.cardDraft) {
    const draft = run.cardDraft, seenOffers = new Set(),
      offers = Array.isArray(draft.offers) ? draft.offers.map(card => cleanCard(card, seenOffers)).filter(Boolean) : [];
    if (draft.version === 1 && draft.runId === run.id && typeof draft.id === 'string' &&
        typeof draft.nodeId === 'string' && Number.isSafeInteger(draft.mapIndex) &&
        offers.length === 3 && new Set(offers.map(card => card.cardId)).size === 3) {
      draft.offers = offers;
      draft.claimed = draft.claimed === true;
    } else delete run.cardDraft;
  }
  settleCardReward(run);
  retireHeldCards(run);
}
/** Retired cards (catalog flag retired: true) are taken out of a loaded run and paid as a melt would
 * pay: the card's own getCardMeltValue, once per card instance, into the same Stored Sparks fields
 * as melting. Idempotent: once the copies are gone nothing is paid again. An unclaimed draft that
 * offers one swaps it for the first live card of its rarity that the draft does not already show. */
function retireHeldCards(run) {
  const paid = new Set();
  let amount = 0;
  const take = card => {
    if (!card || !isRetiredCopy(card)) return card;
    const key = String(card.instanceId);
    if (!paid.has(key)) { paid.add(key); amount += getCardMeltValue(card); }
    return null;
  };
  run.mountedCards = run.mountedCards.map(take);
  run.reserveCards = run.reserveCards.filter(card => take(card));
  const entry = run.attemptEntry;
  if (Array.isArray(entry?.mountedCards)) entry.mountedCards = entry.mountedCards.map(take);
  if (amount > 0) {
    run.condensedGlow = integer(run.condensedGlow) + amount;
    run.securedCondensedGlow = integer(run.securedCondensedGlow) + amount;
    run.condensedEarned = integer(run.condensedEarned) + amount;
    if (entry && Number.isFinite(entry.condensedGlow)) entry.condensedGlow += amount;
  }
  const offers = run.cardDraft?.offers;
  if (Array.isArray(offers) && offers.some(isRetiredCopy)) {
    run.cardDraft.offers = offers.map(card => {
      if (!isRetiredCopy(card)) return card;
      const rarity = SKILL_CARDS[card.cardId].rarity,
        swap = LIVE_CARDS.find(def => def.rarity === rarity && !def.starterOnly && !offers.some(other => other.cardId === def.id));
      return swap ? makeSkillCard(swap.id, card.instanceId) : card;
    });
  }
}
export function cardAmount(card) {
  const def = SKILL_CARDS[card?.cardId];
  return def ? def.amount + (Math.max(1, integer(card.rank || 1)) - 1) * (def.rankStep || 1) : 0;
}
export function getCardMeltValue(card) {
  const def = SKILL_CARDS[card?.cardId];
  return !def || (def.charges && integer(card.charges) === 0)
    ? 0
    : CARD_ECONOMY.melt[def.rarity];
}
export function describeSkillCard(card) {
  const d = SKILL_CARDS[card?.cardId];
  if (!d) return null;
  const amount = cardAmount(card);
  let effect;
  switch (d.kind) {
    case "body":
      effect = `Collect: +${amount} Sparks each time your wisp touches a Spark, Cluster, Cache or Dusk Spark already in the passage. Dusk drains up to 3 Sparks first. Collector deliveries, Pulses and pickups made by powers are not Collect. Card Sparks cannot be packed.`;
      break;
    case "capacity":
      effect = `Passive: your meter holds ${amount} more Sparks while this card is in your chain. It does not refill the meter. Boosts to its right strengthen it; the meter never holds more than 100.`;
      break;
    case "packing":
      effect = "";
      break;
    case "echo":
      effect =
        "Repeat the action on the card to the right. Share its uses. Cannot repeat Deep Vessel or another copying card.";
      break;
    case "chameleon":
      effect =
        "Borrow the ability on the card to the right. Share its uses. Cannot borrow another copying card.";
      break;
    case "chameleon-two":
      effect = "Fires the card to its right on any Trigger. Spends its uses. Cannot fire engine or copying cards.";
      break;
    case "field":
      effect =
        "Spend Collector charge. Swipe up to float, down to dive, or right to speed up. Collector must be beside you with at least ¼ charge. Each Field Impulse in your chain, or copy of one, adds up to 0.8 seconds at full charge. Extra copies extend the time at the same force; one swipe spends charge once.";
      break;
    case "guide":
      effect =
        "An amber upward arrow shows a safe, efficient moment to Lift. You choose when to Lift. Extra copies keep one arrow.";
      break;
    case "rhythm":
      effect =
        "Lift 3 times at an even pace to send out a Pulse that reveals the passage. All 3 Lifts must succeed. Extra copies still send one Pulse.";
      break;
    case "rapid-lift":
      effect = d.rapidRank === 2
        ? "Lift 3 times within 1 second. The second and third successful manual Lifts are free; the third sends one shared light pulse. Dream and automatic bounces do not count. Extra cards keep one trio."
        : "Lift twice within 1 second. The second successful manual Lift is free. Dream and automatic bounces do not count. Extra cards keep one pair. Evolves into Climb.";
      break;
    case "harvest":
      effect = `When a Pulse crosses an uncollected Spark: +${amount} Sparks. It must be a fuel pickup already in the passage. This refills the meter without collecting the pickup.`;
      if (d.stored)
        effect +=
          " First crossing per wave: +1 Stored Spark, even if the meter is full.";
      break;
    case "cache-handling":
      effect =
        "Allows Collector to fetch Caches. A delivered Cache gives 12 Sparks. Extra copies keep one delivery. Your wisp can always touch a Cache for 18 Sparks.";
      break;
    case "flash-handling":
      effect =
        "Collect a Flare: +6 Sparks for each Flare Handling in your chain (or copy of one) when either of you picks up Flare, and Collector can fetch Flare. Your wisp can always touch Flare directly.";
      break;
    case "camp-extra":
      effect =
        "Take 2 different actions at one Rest. Spend 1 use after the second action succeeds. Extra copies do not add a third action or spend another use.";
      break;
    case "camp-grow":
      effect =
        `At Rest: Grow adds +${amount} max Sparks for this Growth Seed (each one you own adds its amount, up to +90 per Grow) and refills your meter once. It does not heal hearts. All Growth Seeds share 3 Grows per journey, and the meter never holds more than 100.`;
      break;
    case "prism":
      effect = `Boost: every card to its left gives ×${amount} Sparks and Collector time (never Stored Sparks or forever gains). Passive cards to its left get ×${amount} on their bonus too.`;
      break;
    case "crescendo":
      effect = "Boost: doubles the Sparks and Collector time of every card to its left (never Stored Sparks or forever gains). Passive cards to its left get double their bonus too.";
      break;
    case "refrain":
      effect = "Boost: Encore. After your chain fires and something worked, it fires once more from Slot 1 for the same Trigger. One Encore per Trigger, however many Refrains. Uses spent stay spent. No extra pickup or Pulse; a first-crossing Stored Spark comes only once.";
      break;
    case "downbeat":
      effect = "Gain 2 flight Sparks when a paid manual Lift succeeds while descending, at least 0.75 seconds after the previous successful Lift. The first, free and Dream Lifts do not count.";
      break;
    case "ring-spring":
      effect = "Each passage Spark overfill shortens Collector’s current recovery by 1 second, including recovery after a save. Requires missing recovery.";
      break;
    case "watchlight":
      effect = "Once per flight, Collector at full charge beside your wisp blocks a fatal impact. Bounce clear and send one Pulse, then recover for 4 normal cycles. All Watchlights share the save.";
      break;
    default:
      effect = "";
  }
  const interpolate=(text)=>interpolateCardText(text,{...d,...card,amount,charges:card.charges??d.charges??'',fedCapacity:getCardFeederCapacity(card),name:d.name});
  const ruleBands=Array.isArray(d.ruleBands)?d.ruleBands.map((band)=>({...band,text:interpolate(band.text)})):undefined;
  // The face is short; the description adds the fine print the face leaves to the inspector.
  if((!effect||d.excludeStarter)&&ruleBands)effect=cardRuleSentence(ruleBands)+(d.help?` ${d.help}`:'');
  return {
    ...clone(card),
    id: d.id,
    name: d.id === "body-spark" ? `Body Spark +${amount}` : d.name,
    rarity: d.rarity,
    rarityLabel: d.rarity[0].toUpperCase() + d.rarity.slice(1),
    kind: d.kind,
    amount,
    effect,
    description: effect,
    maxRank: d.maxRank,
    meltValue: getCardMeltValue(card),
    copyable: d.copyable === true,
    inventoryOnly: isInventoryOnlyCard(card),
    limited: Number.isFinite(card.charges),
    ...(d.kind === 'ember-feeder' ? { fedCapacity: getCardFeederCapacity(card) } : {}),
    ...(ruleBands?{ruleBands}:{}),
    trigger: getCardTrigger(card, d),
    ...(d.help?{help:d.help}:{}),
    ...(d.artFamily?{artFamily:d.artFamily}:{}),
    ...(d.evolvesTo?{evolvesTo:d.evolvesTo}:{}),
    ...(d.repeatCount?{repeatCount:d.repeatCount}:{}),
  };
}
function targetAbility(cards, index) {
  const source = cards?.[index + 1],
    def = SKILL_CARDS[source?.cardId];
  return source && def?.copyable && (!def.charges || source.charges > 0)
    ? { source, def }
    : null;
}
/** One ordered source list for live actions, passive totals and Deck previews.
 * Modifiers see only the real card immediately right, never another modifier.
 * Capacity is passive: Chameleon borrows it, Echo has no activation to repeat.
 */
export function getEffectiveCardSources(snapshot) {
  const cards = (Array.isArray(snapshot) ? snapshot : snapshot?.cards || snapshot?.mountedCards || []).slice(0,CARD_ECONOMY.maxSlots);
  const sources = [];
  for (const [index, card] of cards.entries()) {
    const def = SKILL_CARDS[card?.cardId];
    if (!def || isInventoryOnlyCard(card) || (def.charges && !(card.charges > 0))) continue;
    if (def.kind === "echo" || def.kind === "chameleon") {
      const target = targetAbility(cards, index);
      if (!target || (def.kind === "echo" && (target.def.kind === "capacity" || target.def.passive))) continue;
      const repeatCount=def.kind==='echo'?Math.max(1,integer(def.repeatCount||1,3)):1;
      for(let repeatIndex=0;repeatIndex<repeatCount;repeatIndex++)
        sources.push({ index, card, source: target.source, def: target.def, copiedBy: def.kind, repeatIndex });
    } else sources.push({ index, card, source: card, def, copiedBy: null });
  }
  return sources;
}
/** Boosts that also strengthen always-on cards (Boost rules, details A and B): wildcard
 * multipliers with no Trigger of their own and no limited Uses, marked `boostsAlwaysOn`
 * in the catalog (Prism Lens, Prism Lens II, Crescendo, Closing Chord as the last card).
 * Returns, per slot, the product of every such Boost to its right and the Boosts used. */
export function getCardBoostFactors(snapshot) {
  const cards = (Array.isArray(snapshot) ? snapshot : snapshot?.cards || snapshot?.mountedCards || []).slice(0, CARD_ECONOMY.maxSlots);
  const lastOccupied = cards.findLastIndex(Boolean);
  const boosts = cards.map((card, slot) => {
    const def = SKILL_CARDS[card?.cardId], rule = def?.row;
    if (!def?.boostsAlwaysOn || rule?.operation !== 'multiply' || def.charges || isInventoryOnlyCard(card)) return null;
    if (rule.when?.lastOccupied && slot !== lastOccupied) return null;
    const multiplier = Math.max(1, Number(rule.amount) || 1);
    return multiplier > 1 ? { slot, instanceId: card.instanceId, cardId: card.cardId, name: def.name, multiplier } : null;
  });
  return cards.map((_, slot) => {
    const boostedBy = boosts.filter(boost => boost && boost.slot > slot);
    return { multiplier: boostedBy.reduce((product, boost) => product * boost.multiplier, 1), boostedBy };
  });
}
/** Always-on cards with a numeric bonus part. A Boost multiplies the bonus part only
 * (detail D: +20% ×2 = +40%; flat amounts ×N). An Encore never re-applies them (detail E). */
const ALWAYS_ON_BONUS = Object.freeze({
  capacity: { unit: 'max Sparks', base: source => cardAmount(source) },
  'ember-feeder': { unit: 'max Sparks', base: source => getCardFeederCapacity(source) },
  luminance: { unit: '% Luminance', base: source => cardAmount(source) },
  'proximity-range': { unit: '% Pulse reach', base: (source, def) => Number(def.amount) || 50 },
  'collector-range': { unit: '% Collector reach', base: (source, def) => Math.round(((Number(def.rangeMultiplier) || 1) - 1) * 100) },
  packing: { unit: '% Stored Sparks from packing', base: (source, def) => 25 * Math.max(1, Number(def.packingWeight) || 1) },
});
/** Detail G: base and boosted bonus of each always-on source, and the Boosts behind it.
 * A copy (Chameleon borrow, Echo repeat of Tight Packing) is boosted from its own slot. */
export function getAlwaysOnCardBoosts(snapshot) {
  const factors = getCardBoostFactors(snapshot);
  return getEffectiveCardSources(snapshot).filter(entry => ALWAYS_ON_BONUS[entry.def.kind]).map(entry => {
    const spec = ALWAYS_ON_BONUS[entry.def.kind], base = spec.base(entry.source, entry.def),
      factor = factors[entry.index] || { multiplier: 1, boostedBy: [] };
    return { slot: entry.index, instanceId: entry.card.instanceId, cardId: entry.card.cardId,
      sourceInstanceId: entry.source.instanceId, sourceCardId: entry.source.cardId, kind: entry.def.kind,
      copiedBy: entry.copiedBy, repeatIndex: entry.repeatIndex ?? 0, base, boosted: base * factor.multiplier,
      multiplier: factor.multiplier, unit: spec.unit,
      boostedBy: factor.boostedBy.map(({ slot, cardId, name, multiplier }) => ({ slot, cardId, name, multiplier })) };
  });
}
export const getFieldImpulseMultiplier = (sources = 0) =>
  integer(sources, CARD_ECONOMY.maxEffectiveSources);
export function getCardGrowthUses(run) {
  return isCardRun(run) ? integer(run.cardGrowUses, 3) : 0;
}
export function getCardGrowthBonus(run) {
  return isCardRun(run) ? boundedGrowth(run.cardGrowCapacity, getCardGrowthUses(run)) : 0;
}
const decimal = (value) => String(Math.round(value * 100) / 100);
const packingOutcome = weight => `+${decimal(25 * weight)}% Stored Sparks from packing`;
function effectiveCardSummary(kind, sources, cards) {
  const matching = sources.filter((entry) => entry.def.kind === kind), count = matching.length;
  // Always-on totals include Boosts to the right of each source (Boost rules, detail G).
  const boosts = getAlwaysOnCardBoosts(cards), boostOf = entry => boosts.find(b => b.slot === entry.index && b.sourceInstanceId === entry.source.instanceId && b.repeatIndex === (entry.repeatIndex ?? 0));
  const total = decimal(matching.reduce((sum, entry) => sum + (boostOf(entry)?.boosted ?? cardAmount(entry.source)), 0));
  if (kind === "field") {
    const multiplier = getFieldImpulseMultiplier(count);
    return { effectiveSources: count, effectiveMultiplier: multiplier,
      effectiveSummary: `${count} effective ${count===1?'source':'sources'} · ${decimal(multiplier)}× duration: up, down or right lasts up to ${decimal(.8 * multiplier)}s at full Collector charge. Collector charge scales duration and native strength; right adds up to 48% speed. One swipe spends the ring once.` };
  }
  const packingWeight=matching.reduce((sum,entry)=>sum+Math.max(1,Number(entry.def.packingWeight)||1)*(boostOf(entry)?.multiplier||1),0),
    reach=matching.reduce((sum,entry)=>sum+50*(boostOf(entry)?.multiplier||1),0);
  const summaries = {
    capacity: `+${total} max Sparks while in your chain. It does not refill the meter, and the meter never holds more than 100.`,
    luminance: `+${total}% Luminance while in your chain. Copies add together; Chameleon can copy it, Echo cannot.`,
    proximity: 'One shared terrain meter sends revealing Proximity Pulses at normal reach, without Collector. Extra Proximity cards share that meter; Echo cannot repeat it.',
    springboard: 'One free half-Lift bounce per direct passage Spark absorbed while falling. Extra Springboards do not increase the bounce. Cannot be copied.',
    'heart-stitch': 'Each real Heart Stitch counts direct passage Sparks while a heart is missing. Three in one flight restore one heart and spend one use. Full hearts spend no use; this card cannot be copied.',
    'prism-wick': 'When a Flare’s light runs out, send one final Pulse. Each copy gives +3 Sparks from the same three uses; copies and Encores keep one final Pulse.',
    "proximity-range": `Proximity Pulses on. +${decimal(reach)}% of normal reach from ${count} ${count === 1 ? "card" : "cards"}. Chameleon can copy it; Echo cannot.`,
    packing: packingOutcome(packingWeight),
    "flash-handling": `Collect a Flare: +${total} Sparks when your wisp or Collector picks up Flare. Collector makes one pickup.`,
    "camp-grow": `Grow adds +${total} max Sparks and refills the meter once. All Growth Seeds share 3 Grows per journey.`,
    harvest: `+${total} Sparks when a Pulse crosses an uncollected fuel pickup already in the passage${matching.some((entry) => entry.def.stored) ? `; +${matching.reduce((sum, entry) => sum + (entry.def.stored || 0), 0)} Stored Sparks at the first crossing per Pulse` : ""}.`,
    guide: "One amber arrow shows when to Lift, even with extra copies.",
    rhythm: "3 successful Lifts at an even pace send one Pulse, even with extra copies.",
    "rapid-lift": matching.some(entry => entry.def.rapidRank === 2)
      ? "Climb: within 1 second, the second and third successful manual Lifts are free. The third sends one shared light pulse; extra cards keep one trio."
      : "Double Lift: within 1 second, the second successful manual Lift is free. Extra cards keep one pair.",
    dream: "After a committed Rest, or before an Elite or Guardian: rehearse 8 seconds in full light with free Lifts. Wake at the opening’s end, paused. Devour: at take-off it destroys the card to its right and grows by 0.5 s for a Common, 1 s for a Rare, 3 s for a Legendary, up to 40 s in all. Extra cards keep the longest Dream; copying cards cannot copy it.",
    "cache-handling": "Collector can fetch Caches. A delivered Cache gives 12 Sparks. Extra cards keep that same delivery.",
    "twin-orbit": "Two Collectors fetch and reel independently while equipped. Maximum 2; only the first keeps fatal-impact saves.",
    "twin-wick": "4 uses. Each flight with this mounted spends one: fly with 2 Collectors. At most 2; no use is spent while Twin Orbit already gives the second.",
    "collector-range": "Only extra catches beyond normal reach spend a use. The shortest sufficient extension pays once; copies share uses and extensions do not stack.",
    "camp-extra": "Take 2 different Rest actions at one Rest. The second one spends 1 use from one Second Ember.",
  };
  if (kind === "body") {
    // A nearly spent Pocket Sparks may fund fewer executions than copy positions.
    const next = executeCardBodyPickup(createCardExecution(cards));
    return { effectiveSources: next.executions, effectiveSummary: `Next Collect: up to +${decimal(next.bonus / CARD_UNIT)} Sparks from your chain. Touch a Spark or Dusk Spark already in the passage; Dusk drains first. Copies share the real card’s uses; card Sparks cannot be packed.` };
  }
  return { effectiveSources: count, effectiveSummary: summaries[kind] || "" };
}
export function getMountedCards(run) {
  const sources = getEffectiveCardSources(run), alwaysOn = getAlwaysOnCardBoosts(run);
  return (run?.mountedCards || []).map((card, index) => {
    const printed = describeSkillCard(card);
    if (!printed) return null;
    const d = SKILL_CARDS[card.cardId],
      target = targetAbility(run.mountedCards, index);
    if (["echo", "chameleon"].includes(d.kind))
      printed.copyPreview = target
        ? d.kind === "echo" && (target.def.kind === "capacity" || target.def.passive)
          ? `${target.def.name} has no action to repeat`
          : `${d.kind === "echo" ? "Repeats" : "Borrows"} ${target.def.kind === "body" ? "+" + cardAmount(target.source) + " Sparks" : describeSkillCard(target.source).name}${d.repeatCount>1?` ×${d.repeatCount}`:''}${target.def.charges ? " · shared uses" : ""}`
        : run.mountedCards[index + 1]
          ? `Cannot ${d.kind === "echo" ? "repeat" : "borrow"} ${SKILL_CARDS[run.mountedCards[index + 1].cardId]?.name || "this card"}`
          : "No card to the right";
    const effective = sources.find((entry) => entry.index === index);
    if (effective) Object.assign(printed, effectiveCardSummary(effective.def.kind, sources, run.mountedCards));
    // Detail G: base and boosted always-on bonus, and the Boosts behind it.
    const boosted = alwaysOn.filter(entry => entry.slot === index);
    if (boosted.length) printed.alwaysOnBoost = { kind: boosted[0].kind, unit: boosted[0].unit,
      base: boosted.reduce((sum, entry) => sum + entry.base, 0), boosted: boosted.reduce((sum, entry) => sum + entry.boosted, 0),
      multiplier: boosted[0].multiplier, boostedBy: boosted[0].boostedBy };
    if (d.kind === 'devourer') {
      const neighbor=run.mountedCards[index+1],neighborDef=SKILL_CARDS[neighbor?.cardId];
      printed.effectiveSummary=neighborDef?.rarity==='rare'
        ? `After a successful clear with a missing heart, consume ${describeSkillCard(neighbor).name} in slot ${index+2} to restore 1 heart. At full hearts it is spared. Devourers resolve left to right, after Heart Stitch.`
        : 'No Rare target immediately right. Place a Rare in the next slot to consume it after a successful clear with a missing heart. Full hearts spare the target.';
    }
    if (d.kind === 'use-doubler') {
      const neighbor = getUseDoublerTarget(run.mountedCards, index);
      printed.effectiveSummary = neighbor
        ? `At real flight entry, consume Use Doubler to give ${SKILL_CARDS[neighbor.cardId].name} in slot ${index + 2} ${neighbor.charges} → ${integer(neighbor.charges * 2)} remaining uses. The added uses stay with that card. Preview and Dream do nothing.`
        : 'No eligible consumable immediately right. Place a card with remaining uses in the next slot. Use Doubler cannot target another Use Doubler; an invalid target keeps this card.';
    }
    if (d.kind === 'ember-feeder') {
      const targets = getEmberFeederTargets(run.mountedCards, index), growth = getCardFeederCapacity(card);
      printed.effectiveSummary = `Stored growth +${growth} maximum Sparks while equipped. ` + (targets.length
        ? `After a successful flight, permanently consume ${targets.map(({card: target, slot}) => `${SKILL_CARDS[target.cardId].name} in slot ${slot + 1}`).join(' and ')} together for +1 more maximum Spark on this Ember Feeder. Physical consumers resolve left to right; targets must still be present. No refill.`
        : 'Needs two occupied cards anywhere to its right. Fewer than two consumes neither. Failed flights and Dream consume nothing. Equipping does not refill.');
    }
    if (effective?.copiedBy) {
      const repeats=d.kind==='echo'?(d.repeatCount||1):1;
      if (effective.def.kind === "field") printed.copyPreview = `Adds ${repeats} Field Impulse ${repeats===1?'source':'sources'} · ${decimal(.8*repeats)}s extra at full Collector charge · one ring spend`;
      if (effective.def.kind === "flash-handling") printed.copyPreview = `Adds +${cardAmount(effective.source)*repeats} missing Sparks per Flare · one pickup`;
      if (effective.def.kind === "camp-grow") printed.copyPreview = `Adds +${cardAmount(effective.source)*repeats} maximum Sparks per Grow · shared actions`;
      if (effective.def.kind === "packing") printed.copyPreview = `${d.kind === "echo" ? "Repeats" : "Borrows"} ${packingOutcome((effective.def.packingWeight||1)*repeats)}`;
    }
    return printed;
  });
}
/** Individual duplicates remain separate; Rest cards act directly from the Deck. */
export function getOwnedCards(run) {
  if (!isCardRun(run)) return [];
  settleCardReward(run);
  return [
    ...getMountedCards(run).map((card, slot) =>
      card ? { ...card, mounted: true, slot } : null,
    ).filter(Boolean),
    ...(run.reserveCards || []).map((card) => {
      const described = describeSkillCard(card);
      return described ? { ...described, mounted: false, slot: null } : null;
    }).filter(Boolean),
  ];
}
export function getReserveCards(run) {
  return getOwnedCards(run).filter((card) => !card.mounted);
}
export function getCardCapacityBonus(run) {
  if (!isCardRun(run)) return 0;
  // Boosted always-on capacity (Deep Vessel, Ember Feeder's stored growth); the
  // 100-Spark ceiling is applied once, in vitality.mjs › getGlowCapacity.
  return getAlwaysOnCardBoosts(run).filter(({ kind }) => kind === "capacity" || kind === "ember-feeder")
    .reduce((sum, { boosted }) => sum + boosted * CARD_UNIT, 0);
}
/** Integer quarters preserve earned fractions without multiplying wallet grants.
 * Boosted packing weights may be fractional (Tight Packing ×1.25 = 2.5 quarters per
 * Spark); the total weight stays capped at maxPackingWeight and quarters round down. */
export function getCardPackingBonus(packed, sources = 0, remainder = 0) {
  const weight = Math.max(0, Math.min(CARD_ECONOMY.maxPackingWeight, Number.isFinite(Number(sources)) ? Number(sources) : 0));
  const quarters = Math.floor(integer(packed) * weight + 1e-9)
    + integer(remainder, 3);
  return { amount: Math.floor(quarters / 4), remainder: quarters % 4 };
}
export const CARD_STARTER_RARE_CHANCE = .20;
const starterCommonIds = ['body-spark', 'spark-cache', 'deep-vessel', 'tight-packing', 'harvest-common', 'dream'];
const starterRareIds = ['rhythm', 'cache-handling', 'flash-handling'];
export function getCardStarterOffers(run, { legacy = false } = {}) {
  const oldPair = legacy || isCardRun(run) && run.cardStarterVersion !== 3,
    draw = random(`${run.campaignSeed || run.seed}:card-starter:${oldPair ? 'v1' : 'v3'}`),
    shuffle = pool => {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(draw() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    };
  let pool;
  if (oldPair) {
    // Keep unpicked v1/v2 saves and already-open legacy confirmations stable.
    pool = shuffle(LIVE_CARDS.filter(d => d.rarity === 'common' && !d.excludeStarter && (legacy || d.id !== 'lift-guide')));
    const soloKinds = ['body', 'capacity', 'guide', 'field'];
    if (!pool.slice(0, 2).some(d => soloKinds.includes(d.kind))) {
      const index = pool.findIndex(d => soloKinds.includes(d.kind));
      [pool[0], pool[index]] = [pool[index], pool[0]];
    }
    pool = pool.slice(0, 2);
  } else if (Array.isArray(run.cardStarterOfferIds) && run.cardStarterOfferIds.length === 3 &&
      new Set(run.cardStarterOfferIds).size === 3 && run.cardStarterOfferIds.every(id => !isUnofferedCard(id) && id !== 'lift-guide')) {
    pool = run.cardStarterOfferIds.map(id => SKILL_CARDS[id]);
  } else {
    pool = shuffle(starterCommonIds.map(id => SKILL_CARDS[id]).filter(Boolean));
    // At least one of the two retained Commons works without another card.
    const soloKinds = ['body', 'capacity', 'field'];
    if (!pool.slice(0, 2).some(d => soloKinds.includes(d.kind))) {
      const index = pool.findIndex(d => soloKinds.includes(d.kind));
      [pool[0], pool[index]] = [pool[index], pool[0]];
    }
    pool = pool.slice(0, 3);
    // One lineup roll at every Ascension: 80% three Commons, 20% one Rare.
    if (draw() < CARD_STARTER_RARE_CHANCE) {
      const rares = starterRareIds.map(id => SKILL_CARDS[id]).filter(Boolean);
      pool[2] = rares[Math.floor(draw() * rares.length)];
    }
    shuffle(pool);
  }
  return pool.map((d) => {
    const card = describeSkillCard(makeSkillCard(d.id, `starter:${d.id}`));
    return {
      id: `card:${d.id}`,
      cardId: d.id,
      name: d.name,
      description: card.effect,
      rarity: d.rarity,
      card,
      artifactIds: [],
    };
  });
}
export function drawSkillCard(run, source, node = run.current, rarity = null) {
  const identity = `${run.campaignSeed || run.seed}:${run.mapIndex}:${node?.id || "none"}:${source}`,
    draw = random(identity + ":cards:v1");
  // A completed flight's generated receipt wins over later inventory changes.
  // Looking at it again must never replace a settled or pending earned card.
  if (source === 'flight' && !rarity) {
    const earned = run.cardReward?.card?.instanceId === identity ? run.cardReward.card
      : (run.cardHistory || []).find(event => event.type === 'drop' && event.card?.instanceId === identity)?.card;
    if (earned && !isUnofferedCard(earned.cardId)) return {
      instanceId: earned.instanceId, cardId: earned.cardId, rank: earned.rank || 1,
      ...(Number.isFinite(earned.charges) ? { charges: earned.charges } : {}),
    };
  }
  const roll = draw()*100, weights=CARD_DROP_WEIGHTS[node?.boss?'boss':node?.elite?'elite':'normal'],
    tier = rarity || (roll<weights.common?'common':roll<weights.common+weights.rare?'rare':'legendary');
  if (source === 'flight' && !rarity && tier === 'common') {
    const history = run.cardHistory || [],
      isGrowth = card => card?.kind === 'camp-grow' || SKILL_CARDS[card?.cardId]?.kind === 'camp-grow',
      acquiredGrowth = [...(run.mountedCards || []), ...(run.reserveCards || [])].some(isGrowth)
        || history.some(event => ['store', 'drop', 'forge'].includes(event.type) && isGrowth(event.card)),
      commonFlightDrops = history.filter(event => event.type === 'drop' && event.card?.rarity === 'common'
        && (event.mapIndex !== run.mapIndex || event.nodeId !== node?.id)).length;
    // One early safeguard, earned on an actual clear. Rarity odds stay intact;
    // neither previews, Forge nor later melting can restart the safeguard.
    if (!acquiredGrowth && commonFlightDrops >= 1) return makeSkillCard('growth-seed-common', identity);
  }
  const pool = LIVE_CARDS.filter(
      (d) => d.rarity === tier && !d.starterOnly,
    );
  const weight = def => (def.dropWeight || 1) * (rarity && source.startsWith('forge:v2:')
    ? cardOfferMultiplier({def, rule: getCardRowRule(def, {cardId:def.id, rank:1})}, [], {mode:'forge'}) : 1);
  let ticket = draw() * pool.reduce((sum, def) => sum + weight(def), 0),
    d = pool.at(-1);
  for (const def of pool) {
    ticket -= weight(def);
    if (ticket < 0) { d = def; break; }
  }
  return makeSkillCard(d.id, identity);
}
export const CARD_FORGE_RARITIES = Object.freeze(["common", "rare", "legendary"]);
/** Forge v3: the one hidden card the next forge of `rarity` gives, seeded by the run and
 * how many cards of that rarity it has forged, so reload, Back or another quote cannot
 * reroll it. The pool is the reward drafts' pool for that rarity (never starter-only
 * cards), weighted as Forge always was, and it skips cards already owned unless every
 * card of that rarity is owned. Nothing here changes the run. */
export function drawForgeCard(run, rarity, count = 0) {
  const pool = LIVE_CARDS.filter(def => def.rarity === rarity && !def.starterOnly);
  if (!run || !pool.length) return null;
  const identity = `${run.campaignSeed || run.seed}:forge:v3:${rarity}:${integer(count)}`, draw = random(identity);
  const weight = def => (def.dropWeight || 1) * cardOfferMultiplier({def, rule: getCardRowRule(def, {cardId: def.id, rank: 1})}, [], {mode: 'forge'});
  // Seeded weighted order without replacement (keys u^(1/w)); the first unowned card wins.
  const order = pool.map((def, index) => ({ def, index, key: Math.pow(Math.max(draw(), 1e-12), 1 / weight(def)) }))
    .sort((a, b) => b.key - a.key || a.index - b.index);
  const held = [...(run.mountedCards || []), ...(run.reserveCards || [])].filter(card => card && SKILL_CARDS[card.cardId]);
  const owned = new Set(held.map(card => card.cardId)), ids = new Set(held.map(card => String(card.instanceId)));
  const chosen = (order.find(entry => !owned.has(entry.def.id)) || order[0]).def;
  let instanceId = identity;
  for (let suffix = 2; ids.has(instanceId); suffix++) instanceId = `${identity}:${suffix}`;
  return makeSkillCard(chosen.id, instanceId);
}
/** Three seeded alternatives, without granting ownership or advancing history.
 * The first offer preserves the flight rarity roll and early Seed safeguard.
 * Further offers keep their own tier roll, then sample that tier without names
 * already on the table (including same-name evolved variants).
 */
export function drawSkillCardDraft(run, node = run.current) {
  const offers = [drawSkillCard(run, 'flight', node)], names = new Set([SKILL_CARDS[offers[0].cardId].name]),
    seenOwned = new Set(),
    owned = [...(run.mountedCards || []), ...(run.reserveCards || [])].filter(card => {
      const def = SKILL_CARDS[card?.cardId];
      if (!def || seenOwned.has(card.instanceId) || (def.charges && !(card.charges > 0))) return false;
      seenOwned.add(card.instanceId);return true;
    }).map(card => ({def:SKILL_CARDS[card.cardId], rule:getCardRowRule(SKILL_CARDS[card.cardId], card)})),
    contextSlot = random(`${run.campaignSeed || run.seed}:${run.mapIndex}:${node?.id}:chain-opportunity:v1`)() < .5 ? 1 : 2;
  for (let index = 1; index < 3; index++) {
    const source = `flight-draft:${index}`, rolled = drawSkillCard(run, source, node),
      tier = SKILL_CARDS[rolled.cardId].rarity,
      pool = LIVE_CARDS.filter(def => def.rarity === tier && !def.starterOnly && !names.has(def.name)),
      draw = random(`${run.campaignSeed || run.seed}:${run.mapIndex}:${node?.id}:draft:${index}:distinct:v1`),
      weight = def => (def.dropWeight || 1) * (index === contextSlot
        ? cardOfferMultiplier({def,rule:getCardRowRule(def,{cardId:def.id,rank:1})}, owned, {slots:run.cardSlots || 3}) : 1);
    let ticket = draw() * pool.reduce((sum, def) => sum + weight(def), 0), selected = pool.at(-1);
    for (const def of pool) { ticket -= weight(def); if (ticket < 0) { selected = def; break; } }
    const card = makeSkillCard(selected.id, rolled.instanceId);
    offers.push(card); names.add(selected.name);
  }
  // Offer a sustained radius choice early, without changing any rarity roll,
  // the first slot's Growth Seed safeguard, or the established starter pool.
  // Saved declined offers count, so the pity stops after the player saw it.
  if (Number(run.mapIndex || 0) < 2 && !offers.some(card => SKILL_CARDS[card.cardId].kind === 'luminance')) {
    const history = run.cardHistory || [],
      isLens = card => SKILL_CARDS[card?.cardId]?.kind === 'luminance',
      acquired = [...(run.mountedCards || []), ...(run.reserveCards || [])].some(isLens)
        || history.some(event => ['drop','store','forge'].includes(event.type) && isLens(event.card)),
      drops = history.filter(event => event.type === 'drop'),
      seen = drops.some(event => event.offeredCardIds?.includes('lantern-lens')),
      prior = drops.filter(event => event.mapIndex === run.mapIndex && event.nodeId !== node?.id).length,
      chance = seen ? .2 : prior >= 2 ? 1 : prior === 1 ? (run.mapIndex === 1 ? .9 : .8) : (run.mapIndex === 1 ? .65 : .4),
      draw = random(`${run.campaignSeed || run.seed}:${run.mapIndex}:${node?.id}:luminance-opportunity:v1`),
      spare = [1,2].filter(index => SKILL_CARDS[offers[index].cardId].rarity === 'common');
    if (!acquired && spare.length && draw() < chance) {
      const index = spare[Math.floor(draw() * spare.length)];
      offers[index] = makeSkillCard('lantern-lens', offers[index].instanceId);
    }
  }
  return offers;
}
/** Flight-local runtime. All executions share the real source card, never recursive modifiers. */
export function createCardExecution(snapshot) {
  return {
    cards: clone(
      Array.isArray(snapshot)
        ? snapshot
        : snapshot?.cards || snapshot?.mountedCards || [],
    ),
    ...(Array.isArray(snapshot?.inscriptions) ? { inscriptions: clone(snapshot.inscriptions) } : {}),
    executions: 0,
    eventSequence: 0,
  };
}
export function getCardCharges(runtime) {
  return Object.fromEntries(
    (runtime?.cards || [])
      .filter((c) => c && Number.isFinite(c.charges))
      .map((c) => [c.instanceId, integer(c.charges)]),
  );
}
export const CARD_ROW_EVENTS = Object.freeze({
  body: "body-spark", wave: "wave-crossing", flash: "flash-pickup",
  flashExpiry: "flash-expiry",
  lift: "downbeat-lift", plainLift: "plain-lift", overfill: "natural-overfill",
  delivery: "collector-delivery", rhythm: "rhythm-phrase", field: "field-swipe", guard: "guard-rescue",
  victory: "expedition-victory",
  clear: "flight-clear",
  attach: "collector-attach",
});
/** collectorFloor: seconds added by a Boost never bring Collector recovery or reel time below this. */
export const CARD_ROW_LIMITS = Object.freeze({ slots: 5, passes: 2, repeats: 3, slotVisits: 10, traceSteps: 40, collectorFloor: 0.5 });
/** Every reward kind a chain can pay, in the order a Boost strengthens them. */
export const CARD_REWARD_KINDS = Object.freeze(["sparks", "stored", "futureCapacity", "cruisingSpeed", "reelSeconds", "recoverySeconds", "nextReelSeconds"]);
/** What a Boost strengthens: Sparks and Collector time. Never Stored Sparks or permanent gains. */
export const CARD_BOOSTED_REWARDS = Object.freeze(["sparks", "reelSeconds", "recoverySeconds", "nextReelSeconds"]);
/** Stored Sparks, permanent max Sparks and speed percentage points are whole units. */
const WHOLE_REWARDS = new Set(["stored", "futureCapacity", "cruisingSpeed"]);
const STEP_REWARD_FIELD = Object.freeze({ sparks: "amount", stored: "stored", futureCapacity: "futureCapacity",
  cruisingSpeed: "cruisingSpeed", reelSeconds: "reelSeconds", recoverySeconds: "recoverySeconds", nextReelSeconds: "nextReelSeconds" });
const zeroRewards = () => ({ sparks: 0, stored: 0, futureCapacity: 0, cruisingSpeed: 0, recoverySeconds: 0, reelSeconds: 0, nextReelSeconds: 0 });
/** Split `total` in proportion to `weights`. Fractional rewards split exactly; whole
 * rewards split into whole units by largest remainder (ties go to the leftmost). */
function apportion(weights, total, whole) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!(sum > 0) || !(total > 0)) return weights.map(() => 0);
  const exact = weights.map(weight => weight * total / sum);
  if (!whole) return exact;
  const floors = exact.map(value => Math.floor(value + 1e-9));
  let left = Math.round(total) - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((value, index) => [value - floors[index], index]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, index] of order) { if (left <= 0) break; floors[index]++; left--; }
  return floors;
}
const rowEventKinds = new Set(Object.values(CARD_ROW_EVENTS));
/** Kindled ("also fires on a Lift") hears every Lift: a falling Lift and a plain one (a Lift that is not falling, or comes under 0.75 s after the last). */
const inscriptionHears = (ins, kind) => !!ins && (ins.also === kind || (ins.id === 'kindled' && kind === CARD_ROW_EVENTS.plainLift));
export function getCardRowRule(def, card) {
  if (def?.row) return { ...def.row, amount: def.rankStep ? cardAmount(card) : def.row.amount ?? cardAmount(card) };
  const amount = cardAmount(card);
  const rules = {
    body: { event: CARD_ROW_EVENTS.body, operation: "add-sparks", amount },
    harvest: { event: CARD_ROW_EVENTS.wave, operation: "add-sparks", amount, storedFirstCrossing: def?.stored || 0 },
    "flash-handling": { event: CARD_ROW_EVENTS.flash, operation: "add-sparks", amount: amount || 6 },
    downbeat: { event: CARD_ROW_EVENTS.lift, operation: "add-sparks", amount },
    "ring-spring": { event: CARD_ROW_EVENTS.overfill, operation: "shorten-recovery", amount },
    prism: { event: "*", operation: "multiply", amount },
    crescendo: { event: "*", operation: "multiply", amount },
  };
  return rules[def?.kind] || null;
}
/** A card whose effect is a permanent gain, a Finish or Rest moment growth, or a tally: Chameleon (two) never fires it, because
 * firing it on every Trigger would multiply what must happen once. */
export function isGrowthEffectCard(def, rule = getCardRowRule(def, def)) {
  return !!def?.tallyEvent || ['add-future-capacity', 'add-cruising-speed'].includes(rule?.operation)
    || [CARD_ROW_EVENTS.clear, CARD_ROW_EVENTS.victory].includes(rule?.event);
}
export function hasCardRowEvent(runtime, kind) {
  if (runtime?.inscriptions && inscriptionHearsEvent(runtime, kind)) return true;
  return getEffectiveCardSources(runtime).some(({def,source,index}) => {
    const row=getCardRowRule(def,source);
    if (def.kind === 'chameleon-two') { const nextCard = (runtime.cards || runtime.mountedCards || [])[index + 1], next = SKILL_CARDS[nextCard?.cardId]; return !!(next && getCardRowRule(next, nextCard) && !next.engine && next.copyable && !isGrowthEffectCard(next, getCardRowRule(next, nextCard)) && ![CARD_ROW_EVENTS.victory, CARD_ROW_EVENTS.clear, CARD_ROW_EVENTS.attach].includes(kind)); }
    return def.tallyEvent === kind || (row && (row.event===kind || row.alsoEvents?.includes(kind) || (row.event==='*' && row.operation==='add-sparks')));
  });
}
/** Inscriptions that make a slot answer an event: "also fires on ..." (card here) and Hollow's Collect (empty slot). */
function inscriptionHearsEvent(runtime, kind) {
  const cards = runtime.cards || [];
  return runtime.inscriptions.some((entry, slot) => { const ins = getInscription(entry?.id);
    if (!ins) return false;
    if (inscriptionHears(ins, kind)) return !!cards[slot];
    return ins.id === 'hollow' && kind === CARD_ROW_EVENTS.body && !cards[slot];
  });
}
export function matchesRowCondition(when = {}, event, pass, slot, lastOccupied) {
  if (when.pickupKind !== undefined && event.pickupKind !== when.pickupKind) return false;
  if (when.meterAtMost !== undefined && !(Number.isFinite(event.meterFraction) && event.meterFraction <= when.meterAtMost + 1e-9)) return false;
  if (when.firstCrossing !== undefined && !!event.firstCrossing !== when.firstCrossing) return false;
  if (when.direction !== undefined && event.direction !== when.direction) return false;
  if (when.guardRecovering !== undefined && !!event.guardRecovering !== when.guardRecovering) return false;
  if (when.collectorReeling !== undefined && !!event.collectorReeling !== when.collectorReeling) return false;
  if (when.lastOccupied !== undefined && (slot === lastOccupied) !== when.lastOccupied) return false;
  if (when.pass !== undefined && pass !== when.pass) return false;
  return true;
}
/** Position rules (docs/card-proposals.md section 1, batch 1): `when.exactlyEarlier` (Twin Flame) and `when.endsShareTrigger`
 * (Bookends: the first and last OTHER cards wait for the same Trigger, at least two of them) read the Chain's shape. */
export function matchesRowShape(when = {}, cards = [], slot = 0) {
  if (when.exactlyEarlier !== undefined && cards.slice(0, slot).filter(Boolean).length !== when.exactlyEarlier) return false;
  if (when.endsShareTrigger) {
    const others = cards.filter((card, index) => card && index !== slot);
    if (others.length < 2 || SKILL_CARDS[others[0].cardId]?.trigger !== SKILL_CARDS[others[others.length - 1].cardId]?.trigger) return false;
  }
  return true;
}
/** Amount of a position adder: Vanguard (`firstSlotAmount`), Empty Chair (`perEmptySlot`), Ladder (`perCardLeft`). */
export function positionAmount(rule, cards, slot, amount) {
  if (rule.firstSlotAmount !== undefined && slot === 0) amount = Number(rule.firstSlotAmount) || 0;
  if (rule.perEmptySlot) amount = rule.perEmptySlot * cards.filter(card => !card).length;
  if (rule.perCardLeft) amount = rule.perCardLeft * cards.slice(0, slot).filter(Boolean).length;
  const tally = integer(cards[slot]?.tally);
  if (rule.perTally) amount = rule.perTally * tally;
  if (rule.growEvery) amount += Math.floor(tally / rule.growEvery);
  return amount;
}
/** Keystone: a card next to one fires twice. */
export const isNextToKeystone = (cards, slot) => [cards[slot - 1], cards[slot + 1]].some(card => SKILL_CARDS[card?.cardId]?.kind === 'keystone');
const freezeReceipt = (receipt) => {
  for (const step of receipt.steps) Object.freeze(step);
  Object.freeze(receipt.steps);Object.freeze(receipt.event);Object.freeze(receipt.charges);
  if (Array.isArray(receipt.cards)) {
    for (const card of receipt.cards) if (card) {
      Object.freeze(card.base);Object.freeze(card.effective);Object.freeze(card.boostedBy);
      if (card.boostedByKind) { for (const list of Object.values(card.boostedByKind)) Object.freeze(list); Object.freeze(card.boostedByKind); }
      Object.freeze(card);
    }
    Object.freeze(receipt.cards);
  }
  if (Array.isArray(receipt.firings)) { for (const firing of receipt.firings) Object.freeze(firing); Object.freeze(receipt.firings); }
  return Object.freeze(receipt);
};
/** The base reward of one firing of a card's own rule, before repeats, Encore and Boosts. */
function baseRewards(def, card, rule, event) {
  const base = zeroRewards();
  if (!rule || def?.kind === "echo" || def?.kind === "chameleon" || def?.kind === "chameleon-two") return base;
  const amount = Math.max(0, Number(rule.amount) || 0);
  if (rule.operation === "add-sparks") base.sparks = amount;
  if (rule.storedFirstCrossing) base.stored = Math.max(0, Number(rule.storedFirstCrossing) || 0);
  if (rule.operation === "add-stored") base.stored = amount;
  if (rule.operation === "carried-interest") base.stored = Math.min(10, Math.floor(integer(event.carriedStored) / 10)) * amount;
  if (rule.operation === "add-cruising-speed") base.cruisingSpeed = amount;
  if (rule.operation === "add-future-capacity") base.futureCapacity = cleanCardFutureCapacity(amount);
  if (rule.operation === "shorten-recovery") base.recoverySeconds = amount;
  if (rule.operation === "shorten-reel") base.reelSeconds = amount;
  if (rule.operation === "bank-reel") base.nextReelSeconds = amount;
  return base;
}
/** The numeric chain is the same for flight and preview. Units here are printed Sparks.
 * Topology is fixed for this event; every action reads and spends its real source.
 * Physical actions (Pulses, collection, ring spend, rescue) never enter this walker.
 *
 * Boost rules (docs/boost-rules.md, approved 2026-11-17, point 3 revised the same day).
 * A `multiply` card (a Boost) strengthens the Sparks and the Collector time saved by every
 * card to its LEFT in the same firing (pass): CARD_BOOSTED_REWARDS. It NEVER strengthens
 * Stored Sparks rewards or permanent gains (max Sparks forever, cruising speed): those pay
 * their base amount per firing whatever Boosts are in the chain (Echo repeats and the
 * Encore are firings, not Boosts, and still count). Several Boosts multiply together. The
 * seconds a Boost adds never bring Collector recovery or reel time below
 * CARD_ROW_LIMITS.collectorFloor (a card's own unboosted saving is limited only by the
 * time left, as before). The whole-unit rounding below is kept for any whole reward that
 * a future rule lets a Boost touch; today none does. Wildcard
 * Boosts act on every Trigger, including Clear and Latch (where only time savings can
 * grow); wildcard + cards still skip
 * Clear, Latch and victory. A Boost succeeds (and spends a use) only when it raises
 * something. Always-on cards are boosted outside this walker: see getAlwaysOnCardBoosts.
 *
 * Receipt fields (all earlier fields keep their meaning):
 * - sparks, stored, futureCapacity, cruisingSpeed, recoverySeconds, reelSeconds: totals.
 *   Each total equals the sum of `cards[*].effective[kind]` exactly.
 * - cards[slot] (null for an empty slot): { slot, instanceId, cardId,
 *   base: one firing of this card's own printed reward, per kind (zero for copy cards
 *   and Boosts), effective: what this card really contributed after repeats (Echo,
 *   Chameleon and Encore firings are credited to the real card they copy) and Boosts,
 *   per kind, fired: successful firings credited to this card, multiplier: the Boost's
 *   own factor in pass 1 (Boost cards only), boostedBy: slots of the Boosts that raised
 *   this card's rewards, boostedByKind: the same per reward kind (always empty for stored,
 *   futureCapacity and cruisingSpeed, which Boosts never touch) }.
 * - Whole Sparks: each firing's Spark total rounds UP at its end. `sparks` and every
 *   cards[*].effective.sparks are whole-number results (the loss comes off the last card
 *   that changed the total); `sparksExact` (receipt and per card) keeps the unrounded value,
 *   and firings[] lists {pass, sparksExact, sparks} per firing. Steps keep exact amounts,
 *   so they sum to sparksExact. Collector seconds keep their decimals.
 * - steps[*].creditSlot: the slot whose card is credited with this step's reward.
 * - For a multiply step, amount/stored/futureCapacity/cruisingSpeed/recoverySeconds/
 *   reelSeconds hold the INCREASE it gave, so the steps of a receipt also sum to its
 *   totals, and steps[*].boosted lists the slots it raised.
 */
export function resolveCardRow(runtime, event = {}) {
  const kind = event.kind || event.type;
  // Batch 3: `fromSlot` (Undertow, Tributary) lets only the cards to the right of that Slot hear a card-made event; `secondWind` makes
  // every rule hear every Trigger. Both are only ever set by the flight while the matching card is mounted.
  const fromSlot = Number.isInteger(event.fromSlot) ? event.fromSlot : -1;
  const windOn = event.secondWind === true && (runtime?.cards || []).some(card => SKILL_CARDS[card?.cardId]?.kind === 'second-wind');
  const sequence = (runtime?.eventSequence || 0) + 1;
  if (runtime) runtime.eventSequence = sequence;
  const receipt = { event: { id: event.id ?? sequence, sequence, kind,
    firstCrossing: !!event.firstCrossing, pickupKind: event.pickupKind ?? null,
    ...(kind===CARD_ROW_EVENTS.wave?{waveId:event.waveId??null,
      pulseSource:event.pulseSource??null,pulseSourceKind:event.pulseSourceKind??null}:{}),
    meterFraction: event.meterFraction ?? null, direction: event.direction ?? null,
    guardRecovering: !!event.guardRecovering, collectorReeling: !!event.collectorReeling,
    availableReel: Math.max(0,Number(event.availableReel)||0),
    availableRecovery: Math.max(0,Number(event.availableRecovery)||0), carriedStored: integer(event.carriedStored),
    cruisingSpeedRoom:event.cruisingSpeedRoom==null?6:cleanCardCruisingSpeed(event.cruisingSpeedRoom) }, passes: 0, slotVisits: 0, sparks: 0, stored: 0,
    futureCapacity: 0, cruisingSpeed: 0, recoverySeconds: 0, reelSeconds: 0, nextReelSeconds: 0, executions: 0, payerActions: 0, steps: [], charges: {}, cards: [], sparksExact: 0, sparksUnboosted: 0, firings: [] };
  if (!runtime || !rowEventKinds.has(kind) || event.eligible === false) {
    receipt.charges = getCardCharges(runtime);return freezeReceipt(receipt);
  }
  const cards = (runtime.cards || []).slice(0, CARD_ECONOMY.maxSlots);
  const topology = cards.map((card) => card ? { ...card } : null);
  const live = new Map(cards.filter(Boolean).map((card) => [card.instanceId, card]));
  const lastOccupied = topology.findLastIndex((card) => !!card);
  const floor = CARD_ROW_LIMITS.collectorFloor;
  const ledgerCards = topology.map((card, slot) => {
    const def = SKILL_CARDS[card?.cardId];
    if (!def) return null;
    const rule = getCardRowRule(def, card);
    return { slot, instanceId: card.instanceId, cardId: card.cardId, base: baseRewards(def, card, rule, receipt.event),
      effective: zeroRewards(), fired: 0, ...(rule?.operation === "multiply" ? { multiplier: Number(rule.amount) || 1 } : {}), boostedBy: [],
      boostedByKind: Object.fromEntries(CARD_REWARD_KINDS.map(rewardKind => [rewardKind, []])) };
  });
  // Every reward paid in this event, one entry per paying firing: {pass, slot, kind, value, cap}.
  const entries = [];
  const total = (rewardKind, pass = null) => entries.reduce((sum, entry) =>
    entry.kind === rewardKind && (pass === null || entry.pass === pass) ? sum + entry.value : sum, 0);
  const recoveryLeft = () => Math.max(0, receipt.event.availableRecovery - total("recoverySeconds") - total("reelSeconds"));
  const reelLeft = () => Math.max(0, Math.min(receipt.event.availableReel - total("reelSeconds"), recoveryLeft()));
  // Detail C: seconds a Boost adds never bring Collector below `floor`; a card's own
  // printed saving keeps today's rule (limited only by the time left).
  const budget = (rewardKind, boosting = false) => rewardKind === "recoverySeconds" ? Math.max(0, recoveryLeft() - (boosting ? floor : 0))
    : rewardKind === "reelSeconds" ? Math.max(0, reelLeft() - (boosting ? floor : 0))
    : rewardKind === "cruisingSpeed" ? Math.max(0, receipt.event.cruisingSpeedRoom - total("cruisingSpeed")) : Infinity;
  /** One Boost: raise every earlier entry of this pass by `multiplier`, within caps and budgets. */
  const applyBoost = (pass, multiplier, kinds) => {
    const increase = zeroRewards(), boosted = new Set(), byKind = [];
    for (const rewardKind of kinds) {
      const own = entries.filter(entry => entry.pass === pass && entry.kind === rewardKind && entry.value > 0);
      if (!own.length) continue;
      const targets = own.map(entry => Math.min(entry.cap ?? Infinity, entry.value * multiplier));
      const desired = own.map((entry, index) => Math.max(0, targets[index] - entry.value));
      const wanted = desired.reduce((a, b) => a + b, 0);
      if (!(wanted > 0)) continue;
      const whole = WHOLE_REWARDS.has(rewardKind);
      const before = own.reduce((sum, entry) => sum + entry.value, 0);
      let allowed = whole ? Math.max(0, Math.round(before + wanted) - before) : wanted;
      allowed = Math.min(allowed, budget(rewardKind, true));
      if (whole) allowed = Math.floor(allowed + 1e-9);
      if (!(allowed > 0)) continue;
      const shares = !whole && allowed === wanted ? null : apportion(desired, allowed, whole);
      own.forEach((entry, index) => {
        const next = shares ? entry.value + shares[index] : targets[index];
        if (next > entry.value) { increase[rewardKind] += next - entry.value; entry.value = next; boosted.add(entry.slot); byKind.push([entry.slot, rewardKind]); }
      });
    }
    return { increase, boosted: [...boosted].sort((a, b) => a - b), byKind, any: Object.values(increase).some(value => value > 0) };
  };
  const firedSlots = new Set(), brimfulSlots = new Set(), standalone = { sparks: 0, stored: 0 };
  let replayRequested = false, productive = false;
  for (let pass = 1; pass <= (replayRequested && productive ? 2 : 1); pass++) {
    let payers = 0, lastPayout = 0, lastSparkSlot = null;
    receipt.passes = pass;
    for (let slot = 0; slot < topology.length; slot++) {
      if (slot <= fromSlot) continue;
      const acting = topology[slot], ownDef = SKILL_CARDS[acting?.cardId];
      const copy = ownDef?.kind === "echo" || ownDef?.kind === "chameleon" || ownDef?.kind === "chameleon-two";
      const target = copy ? topology[slot + 1] : acting;
      const def = SKILL_CARDS[target?.cardId];
      const source = live.get(target?.instanceId);
      const creditSlot = copy ? slot + 1 : slot;
      receipt.slotVisits++;
      const repeats = (copy && ownDef.kind === "echo" ? Math.max(1,integer(ownDef.repeatCount || 1,CARD_ROW_LIMITS.repeats)) : 1) * (isNextToKeystone(topology, slot) ? 2 : 1) * (slotInscriptionId(runtime, creditSlot) === "twin-mark" ? 2 : 1);
      for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex++) {
      const subtotal = total("sparks", pass), futureSubtotal = total("futureCapacity", pass);
      const step = { eventId: receipt.event.id, eventKind: kind, pass, slot, repeatIndex, creditSlot,
        actingInstanceId: acting?.instanceId ?? null, actingCardId: acting?.cardId ?? null,
        sourceInstanceId: source?.instanceId ?? null, sourceCardId: source?.cardId ?? null,
        copiedBy: copy ? ownDef.kind : null, operation: "skip", before: subtotal, after: subtotal,
        amount: 0, stored: 0, recoverySeconds: 0, recoveryBefore: recoveryLeft(), recoveryAfter: recoveryLeft(),
        futureCapacity: 0, futureCapacityBefore: futureSubtotal, futureCapacityAfter: futureSubtotal, cruisingSpeed: 0,
        reelSeconds: 0, nextReelSeconds: 0, reelBefore: reelLeft(), reelAfter: reelLeft(),
        chargesBefore: Number.isFinite(source?.charges)?source.charges:null,
        chargesAfter: Number.isFinite(source?.charges)?source.charges:null,
        success: false, skipReason: null };
      receipt.steps.push(step);
      if (!ownDef) {
        step.skipReason = "empty-slot";
        const hollow = kind === CARD_ROW_EVENTS.body ? hollowBonus(runtime, slot, false) : 0;
        if (hollow > 0) { standalone.sparks += hollow; step.amount += hollow; step.skipReason = null; step.operation = "inscription"; step.success = true; receipt.executions++; }
        continue;
      }
      if (!def || (copy && (!def.copyable || (ownDef.kind === "echo" && (def.kind === "capacity" || def.passive)) || (ownDef.kind === "chameleon-two" && (def.engine || isGrowthEffectCard(def, getCardRowRule(def, target)))))) ) {
        step.skipReason = "incompatible-neighbor";continue;
      }
      if (!source || (def.charges && !(source.charges > 0))) {
        step.skipReason = "exhausted-source";continue;
      }
      const rule = getCardRowRule(def, source);
      const pay = (rewardKind, value, cap) => {
        if (rewardKind === "sparks") lastSparkSlot = creditSlot;
        entries.push({ pass, slot: creditSlot, kind: rewardKind, value, base: value, ...(cap === undefined ? {} : { cap }) });
        step[STEP_REWARD_FIELD[rewardKind]] += value;
      };
      const succeed = () => {
        if (def.charges) source.charges--;
        receipt.executions++;productive = true;step.success = true;
        if (ledgerCards[creditSlot]) ledgerCards[creditSlot].fired++;
        firedSlots.add(creditSlot);if (insId === "brimful") brimfulSlots.add(creditSlot);
      };
      // Chameleon (two) makes the card to its right answer ANY Trigger; like Second Wind it never answers Finish, victory or a Collector grab.
      const anyTrigger = windOn || ownDef?.kind === "chameleon-two";
      const wildcard = (rule?.event === "*" || (anyTrigger && rule)) && (rule.operation === "multiply"
        ? kind !== CARD_ROW_EVENTS.victory
        : ![CARD_ROW_EVENTS.victory,CARD_ROW_EVENTS.clear,CARD_ROW_EVENTS.attach].includes(kind));
      const insId = slotInscriptionId(runtime, creditSlot), insDef = getInscription(insId);
      const alsoHeard = !!rule && rule.operation !== "multiply" && inscriptionHears(insDef, kind);
      const mirrored = !!rule && rule.operation !== "multiply" && insId === "mirror" && firedSlots.has(creditSlot - 1);
      if (rule && (rule.event === kind || rule.alsoEvents?.includes(kind) || wildcard || alsoHeard || mirrored) && matchesRowCondition(rule.when,event,pass,slot,lastOccupied) && matchesRowShape(rule.when,topology,slot)) {
      const operation = rule.operation;
      const amount = Math.max(0,positionAmount(rule,topology,slot,Number(pass === 2 && rule.replayAmount !== undefined ? rule.replayAmount : rule.amount) || 0));
      const payout = operation === "add-last-payout" ? lastPayout : amount;
      if ((operation === "add-sparks" || operation === "add-last-payout") && payout > 0 && payers >= (Number(rule.minimumEarlierPayers)||0)) {
        step.operation = operation;succeed();
        pay("sparks", payout);lastPayout = payout;payers++;receipt.payerActions++;
        // Inscriptions: Gilded (+2 each firing on this slot) and Lodestone on a neighbouring slot (+1 each). Boosts to the right see them.
        const extra = (insDef?.id === "gilded" ? insDef.bonus : 0) + lodestoneBonus(runtime, creditSlot);
        if (extra > 0) pay("sparks", extra);
        if (pass === 1 && event.firstCrossing && rule.storedFirstCrossing) {
          const stored = Math.max(0,Number(rule.storedFirstCrossing)||0);
          if (stored > 0) pay("stored", stored);
        }
      } else if (operation === "multiply" || operation === "multiply-future-capacity") {
        step.operation = operation;step.multiplier = amount;
        // Never Stored Sparks or permanent gains, so the legacy future-capacity multiplier boosts nothing.
        const boost = amount > 1 ? applyBoost(pass, amount, operation === "multiply" ? CARD_BOOSTED_REWARDS : []) : null;
        if (boost?.any) {
          succeed();
          for (const rewardKind of CARD_REWARD_KINDS) step[STEP_REWARD_FIELD[rewardKind]] = boost.increase[rewardKind];
          step.boosted = boost.boosted;
          for (const boostedSlot of boost.boosted) ledgerCards[boostedSlot]?.boostedBy.push(slot);
          for (const [boostedSlot, rewardKind] of boost.byKind) {
            ledgerCards[boostedSlot]?.boostedByKind[rewardKind].push(slot);
            if (rewardKind === "sparks") lastSparkSlot = Math.max(lastSparkSlot ?? -1, boostedSlot);
          }
        } else step.skipReason = operation === "multiply-future-capacity" ? "empty-future-capacity"
          : entries.some(entry => entry.pass === pass && entry.value > 0 && CARD_BOOSTED_REWARDS.includes(entry.kind)) ? "boost-capped"
          : entries.some(entry => entry.pass === pass && entry.value > 0) ? "not-boostable" : "empty-subtotal";
      } else if (operation === "add-future-capacity") {
        step.operation = operation;
        const increase = cleanCardFutureCapacity(amount);
        if (increase > 0) { succeed();pay("futureCapacity", increase); }
        else step.skipReason = "empty-future-capacity";
      } else if (operation === "add-stored" || operation === "carried-interest" || operation === "add-cruising-speed") {
        step.operation = operation;
        const gain = operation === "carried-interest" ? Math.min(10, Math.floor(integer(event.carriedStored) / 10)) * amount
          : operation === "add-cruising-speed" ? Math.min(amount, budget("cruisingSpeed")) : amount;
        if (gain > 0) {
          succeed();
          if (operation === "add-cruising-speed") pay("cruisingSpeed", gain);
          else pay("stored", gain, operation === "carried-interest" ? 10 * amount : undefined);
        } else step.skipReason = operation === "add-cruising-speed" ? "cruising-speed-cap" : "no-carried-interest";
      } else if (operation === "shorten-reel") {
        step.operation = operation;
        const seconds = Math.min(amount, budget("reelSeconds"));
        if (seconds > 0) { succeed();pay("reelSeconds", seconds); }
        else step.skipReason = "no-active-reel";
      } else if (operation === "bank-reel") {
        // Haul Winch: the seconds are banked on the flight and taken off the NEXT reel (no active reel needed). A Boost to its right strengthens them like any reel time.
        step.operation = operation;
        if (amount > 0) { succeed();pay("nextReelSeconds", amount); }
        else step.skipReason = "no-reel-credit";
      } else if (operation === "shorten-recovery") {
        step.operation = operation;
        const seconds = Math.min(amount, budget("recoverySeconds"));
        if (seconds > 0) { succeed();pay("recoverySeconds", seconds); }
        else step.skipReason = "no-recovery";
      } else step.skipReason = operation === "add-last-payout" ? "no-earlier-payout" : operation === "add-sparks" ? "needs-earlier-payer" : "unsupported-operation";
      } else if (def.kind === "refrain") {
        step.operation = "replay-row";
        if (pass === 1 && !replayRequested) { replayRequested = true;step.success = true; }
        else step.skipReason = "replay-limit";
      } else step.skipReason = rule ? "event-or-condition-not-met" : "different-event-or-passive";
      step.after = total("sparks", pass);
      step.futureCapacityAfter = total("futureCapacity", pass);
      step.reelAfter = reelLeft();
      step.recoveryAfter = recoveryLeft();
      step.chargesAfter = Number.isFinite(source?.charges)?source.charges:null;
      }
    }
    if (pass === 1 && kind === CARD_ROW_EVENTS.clear) standalone.stored += emberBedStored(runtime, topology);
    // Whole Sparks (2026-11-17, owner: "always round up"): each firing's Spark total rounds UP once, at its end
    // (an exact whole number stays; zero stays zero). The rounding gain goes onto the last card that changed that
    // total, so the per-card effective amounts still add up; the unrounded figures stay in sparksExact.
    const exact = total("sparks", pass), whole = Math.max(0, Math.ceil(exact - 1e-9)), loss = exact - whole;
    for (const entry of entries) if (entry.pass === pass && entry.kind === "sparks" && ledgerCards[entry.slot])
      ledgerCards[entry.slot].sparksExact = (ledgerCards[entry.slot].sparksExact || 0) + entry.value;
    if (Math.abs(loss) > 1e-9 && lastSparkSlot !== null) {
      const own = entries.filter(entry => entry.pass === pass && entry.kind === "sparks" && entry.slot === lastSparkSlot)
        .sort((a, b) => b.value - a.value)[0];
      if (own) own.value -= loss;
    }
    if (Math.abs(loss) > 1e-9 && Math.abs(total("sparks", pass) - whole) > 1e-9) // safety: never leave a fraction behind
      for (const entry of entries.filter(entry => entry.pass === pass && entry.kind === "sparks").reverse()) {
        const cut = Math.min(entry.value, total("sparks", pass) - whole); entry.value -= cut; if (total("sparks", pass) - whole <= 1e-9) break;
      }
    for (const entry of entries) if (entry.pass === pass && entry.kind === "sparks") entry.value = Math.round(entry.value * 1e6) / 1e6;
    // What the same firing gives with no Boost (rounded up once): Spill Jar keeps from this, never from the Boosted amount.
    receipt.sparksUnboosted += Math.max(0, Math.ceil(entries.filter(entry => entry.pass === pass && entry.kind === "sparks").reduce((sum, entry) => sum + entry.base, 0) - 1e-9));
    receipt.firings.push({ pass, sparksExact: exact, sparks: whole });
    receipt.sparksExact += exact;
    // A Refrain by itself cannot schedule a meaningless second walk.
    if (pass === 1 && !productive) for (const step of receipt.steps) {
      if (step.operation === "replay-row" && step.success) {
        step.success = false;step.skipReason = "no-productive-action";
      }
    }
  }
  for (const entry of entries) if (ledgerCards[entry.slot]) ledgerCards[entry.slot].effective[entry.kind] += entry.value;
  // Totals are the sum of the per-card effective amounts, so the two always agree exactly.
  for (const rewardKind of CARD_REWARD_KINDS)
    receipt[rewardKind] = ledgerCards.reduce((sum, card) => sum + (card ? card.effective[rewardKind] : 0), 0);
  for (const card of ledgerCards) if (card) {
    card.sparksExact = card.sparksExact || 0;
    card.boostedBy = [...new Set(card.boostedBy)];
    for (const rewardKind of CARD_REWARD_KINDS) card.boostedByKind[rewardKind] = [...new Set(card.boostedByKind[rewardKind])];
  }
  // Standalone Inscriptions on empty slots (Hollow, Ember Bed) have no card to credit: they join the totals here.
  receipt.sparks += standalone.sparks;receipt.sparksExact += standalone.sparks;receipt.sparksUnboosted += standalone.sparks;receipt.stored += standalone.stored;
  receipt.brimful = [...brimfulSlots].reduce((sum, slot) => sum + (ledgerCards[slot]?.effective.sparks || 0), 0);
  // Counting cards (batch 2) count the event once it is resolved, so a payout never includes its own event.
  for (let slot = 0; slot < cards.length; slot++) if (cards[slot] && SKILL_CARDS[cards[slot].cardId]?.tallyEvent === kind && !(fromSlot >= 0 && slot <= fromSlot)) cards[slot].tally = integer(cards[slot].tally) + 1;
  receipt.cards = ledgerCards;
  runtime.executions = (runtime.executions || 0) + receipt.executions;
  receipt.charges = getCardCharges(runtime);
  const result = freezeReceipt(receipt);runtime.lastTrace = result;return result;
}
export const executeCardRowEvent = resolveCardRow;
export function previewCardRow(snapshot, event = {}) {
  const runtime = createCardExecution(snapshot);
  if (Number.isFinite(snapshot?.eventSequence)) runtime.eventSequence = snapshot.eventSequence;
  return resolveCardRow(runtime, event);
}
export const previewCardRowEvent = previewCardRow;
export function executeCardBodyPickup(runtime) {
  const receipt = resolveCardRow(runtime, { kind: CARD_ROW_EVENTS.body });
  return { bonus: receipt.sparks * CARD_UNIT, executions: receipt.executions, charges: receipt.charges, trace: receipt };
}
/** The count a counting card shows on its face, like Black Hole's "Devoured N": '' for any other card. */
export function cardTallyLine(card) {
  const def = SKILL_CARDS[card?.cardId || card?.id];
  if (!def?.tallyEvent && !def?.tallied) return '';
  const n = integer(card.tally);
  if (def.kind === 'scar-tissue') return `Saves ${n} · +${n} per Collect`;
  if (def.kind === 'collectors-ledger') return `Deliveries ${n} · +${1 + Math.floor(n / 10)} now`;
  if (def.kind === 'old-friend') return `Flights ${n} · +${n} now`;
  if (def.kind === 'gilded-rim') return `Overfills ${n} · +${n} max Sparks`;
  if (def.kind === 'tithe') return `Tithes ${n} · +${n} max Sparks`;
  if (def.kind === 'tributary') return `Collects ${n} · Delivery in ${3 - n % 3}`;
  return '';
}
/** What each counting card has counted so far, by instance (flight results carry it back to the run). */
export const getCardTallies = runtime => Object.fromEntries((runtime?.cards || []).filter(card => card && integer(card.tally)).map(card => [card.instanceId, integer(card.tally)]));
/** Write counts back onto the mounted run cards. Counts only grow, and only cards still in the Chain keep one. */
export function commitCardTallies(run, tallies) {
  if (!isCardRun(run) || !tallies) return;
  for (const card of run.mountedCards || []) if (card && (SKILL_CARDS[card.cardId]?.tallyEvent || SKILL_CARDS[card.cardId]?.tallied) && integer(tallies[card.instanceId]) > integer(card.tally)) card.tally = integer(tallies[card.instanceId]);
}
export function commitCardCharges(run, charges) {
  if (!isCardRun(run) || !charges) return [];
  const exhausted = [];
  const commit = (card) => {
    if (
      !card ||
      !Number.isFinite(card.charges) ||
      !Number.isFinite(charges[card.instanceId])
    )
      return card;
    card.charges = Math.min(card.charges, integer(charges[card.instanceId]));
    if (card.charges) return card;
    exhausted.push(card.instanceId);
    return null;
  };
  run.mountedCards = (run.mountedCards || []).map(commit);
  run.reserveCards = (run.reserveCards || []).map(commit).filter(Boolean);
  return exhausted;
}
/** Route eligibility is independent of attemptActive/restReady: both change on Wake. */
export function isCardDreamRoute(run, node = run?.current) {
  if (!node || node.type === 'support') return false;
  if (node.elite || node.boss || node.kind === 'elite' || node.kind === 'finale' || node.type === 'finale') return true;
  const rest = run?.lastRest;
  if (!rest || rest.mapIndex !== run.mapIndex || rest.row !== node.row - 1 || !run.path?.includes(rest.nodeId)) return false;
  const camp = run.map?.[rest.row]?.find(site => site.id === rest.nodeId && site.kind === 'camp');
  return camp?.nextIds?.length === 1 && camp.nextIds[0] === node.id;
}
export function getCardModifiers(run) {
  const m = {
    cardRapidLiftRank: 0,
    cardProximitySources: 0,
    cardProximityUnlocked: false,
    cardRhythm: false,
    cardDream: false,
    cardLiftGuide:
      run?.isTutorial &&
      (run.cardPilot === true || run.cardPilotTutorial === true) &&
      run.current?.tutorialLesson === "glide",
    cardHarvestMeter: 0,
    cardHarvestStoredPerWave: 0,
    cardBodyBonus: 0,
    cardExecution: { cards: [] },
    cardFieldImpulse: false,
    cardFieldSources: 0,
    cardFieldMultiplier: 0,
    cardCacheHandling: false,
    cardTwinOrbit: false,
    cardTwinWick: false,
    cardFlashHandling: false,
    cardFlashSources: 0,
    cardFlashMeter: 0,
    cardGrowSources: 0,
    cardGrowAmount: 0,
    cardPackingSources: 0,
    cardPackingRemainder: 0,
    cardDownbeat: false,
    cardRingSpring: false,
    cardWatchlight: false,
    cardLuminancePercent: 0,
    cardWaveLoom: false,
    cardOverfillEvery: 3,
  };
  if (!isCardRun(run)) return m;
  m.dreamDuration = 0;
  m.dreamWake = 3;
  m.dreamSight = false;
  m.cardPackingRemainder = integer(run.cardPackingRemainder, 3);
  m.cardExecution = { cards: clone(run.mountedCards || []), inscriptions: clone(cleanSlotInscriptions({ mountedCards: run.mountedCards || [], slotInscriptions: run.slotInscriptions })) };
  // Whetted: the card here starts every flight with 1 extra use (the flight's ledger only ever lowers a card's uses, so it is free and never kept).
  m.cardExecution.cards.forEach((card, slot) => { if (card && Number.isFinite(card.charges) && slotInscriptionId(m.cardExecution, slot) === "whetted") card.charges = Math.min(getCardChargeCapacity(card) + 1, integer(card.charges) + 1); });
  m.cardLuminancePercent += countInscription(m.cardExecution, "lantern") * (getInscription("lantern").percent || 0);
  // Always-on bonuses are strengthened by Boosts to their right (Boost rules, details A–F).
  const boost = getCardBoostFactors(run);
  for (const { def: d, source, index } of getEffectiveCardSources(run)) {
    const factor = boost[index]?.multiplier || 1;
    if (d.kind === "luminance") m.cardLuminancePercent += cardAmount(source) * factor;
    if (d.kind === "proximity") m.cardProximityUnlocked = true;
    // One source adds 50% of normal reach; a boosted source counts as `factor` sources.
    if (d.kind === "proximity-range") m.cardProximitySources += factor;
    if (d.kind === "rhythm") m.cardRhythm = true;
    if (d.kind === "rapid-lift") m.cardRapidLiftRank = Math.max(m.cardRapidLiftRank, d.rapidRank || 1);
    if (d.kind === "dream") m.cardDream = true;
    if (d.kind === "guide") m.cardLiftGuide = true;
    if (d.kind === "field") { m.cardFieldImpulse = true; m.cardFieldSources++; }
    if (d.kind === "cache-handling") m.cardCacheHandling = true;
    if (d.kind === "twin-orbit") m.cardTwinOrbit = true;
    if (d.kind === "twin-wick") m.cardTwinWick = true;
    if (d.kind === "flash-handling") { m.cardFlashHandling = true; m.cardFlashSources++; m.cardFlashMeter += cardAmount(source) * CARD_UNIT; }
    if (d.kind === "packing") m.cardPackingSources += Math.max(1,Number(d.packingWeight)||1) * factor;
    if (d.kind === "downbeat") m.cardDownbeat = true;
    if (d.kind === "ring-spring") m.cardRingSpring = true;
    if (d.kind === "watchlight") m.cardWatchlight = true;
    if (d.kind === "spillway") m.cardOverfillEvery=Math.min(m.cardOverfillEvery,Math.max(1,Number(d.pulseCadence)||3));
    if (d.kind === "body" && !d.charges)
      m.cardBodyBonus += cardAmount(source) * CARD_UNIT;
    if (d.kind === "harvest") {
      m.cardHarvestMeter += cardAmount(source) * CARD_UNIT;
      m.cardHarvestStoredPerWave += d.stored || 0;
    }
  }
  const seeds = getInventoryCampCards(run, 'camp-grow');
  m.cardGrowSources = seeds.length;
  m.cardGrowAmount = Math.min(CARD_ECONOMY.maxGrowPerAction, seeds.reduce((total, seed) => total + cardAmount(seed), 0)) * CARD_UNIT;
  m.cardFieldMultiplier = getFieldImpulseMultiplier(m.cardFieldSources);
  if (m.cardDream && isCardDreamRoute(run)) m.dreamDuration = DREAM_BASE_SECONDS + getCardDreamBonus(run);
  return m;
}
export function recordCardEvent(run, type, detail = {}) {
  (run.cardHistory ??= []).push({
    type,
    mapIndex: run.mapIndex,
    nodeId: run.current?.id || null,
    ...clone(detail),
  });
}
