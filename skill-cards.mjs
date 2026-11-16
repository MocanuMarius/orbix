/** Small, serializable skills-as-cards pilot. Printed Sparks use the existing .3 display scale. */
export const CARD_SYSTEM = "cards-v1";
export const CARD_UNIT = 10 / 3;
import {CARD_CATALOG,CARD_DROP_WEIGHTS} from './card-catalog.mjs?v=deck-flow-1';
const maximumGrowthAmount = Math.max(...Object.values(CARD_CATALOG)
  .filter(card => card.kind === 'camp-grow').map(card => card.amount + card.maxRank - 1));
export const CARD_ECONOMY = Object.freeze({
  melt: { common: 10, rare: 20, legendary: 40 },
  forge: { rare: 30, legendary: 60 },
  improve: { common: 15, rare: 25, legendary: 40 },
  evolve: { rare: 25, legendary: 40 },
  maxSlots: 5,
  maxEffectiveSources: 9,
  maxPackingWeight: 36,
  maxGrowPerAction: maximumGrowthAmount * 9,
});
export const SKILL_CARDS = CARD_CATALOG;
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
      }
    : null;
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
      ? integer(card.charges, def.charges)
      : def.charges
    : null;
  if (charges === 0) return null;
  seen.add(id);
  return {
    instanceId: id,
    cardId: card.cardId,
    rank: Math.max(1, integer(card.rank || 1, def.maxRank)),
    ...(charges === null ? {} : { charges }),
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
  run.cardTwinWickUnlocked = run.cardTwinWickUnlocked === true;
  run.cardFutureCapacity = cleanCardFutureCapacity(run.cardFutureCapacity);
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
  run.cardHistory = Array.isArray(run.cardHistory) ? run.cardHistory : [];
  run.cardRewardedNodes = Array.isArray(run.cardRewardedNodes)
    ? run.cardRewardedNodes
    : [];
  run.cardSlotMaps = Array.isArray(run.cardSlotMaps) ? run.cardSlotMaps : [];
  run.cardPackingRemainder = integer(run.cardPackingRemainder, 3);
  run.cardForgeCounts = Object.fromEntries(["rare", "legendary"].map((rarity) => [rarity, integer(run.cardForgeCounts?.[rarity])]));
  if (run.cardReward?.card) {
    const receiptCard = cleanCard(run.cardReward.card, new Set());
    if (receiptCard) run.cardReward.card = receiptCard;
  }
  settleCardReward(run);
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
      effect = `When your wisp absorbs a Spark: +${amount} Sparks. Touch a fuel pickup already in the passage; Collector deliveries, waves and pickups created by powers do not count. The bonus cannot be packed.`;
      break;
    case "capacity":
      effect = `Your meter holds ${amount} more Sparks while equipped. Equipping this card does not refill it.`;
      break;
    case "packing":
      effect = `For every 4 Stored Sparks naturally packed, gain ${d.packingWeight} extra. Progress carries forward; bonuses do not earn more bonuses.`;
      break;
    case "echo":
      effect =
        "Repeat the action on the card to the right. Use that card’s remaining uses. Cannot repeat Deep Vessel or another copying card.";
      break;
    case "chameleon":
      effect =
        "Borrow the ability on the card to the right. Use that card’s remaining uses. Cannot borrow another copying card.";
      break;
    case "field":
      effect =
        "Spend Collector’s ring. Swipe up to float for up to 0.8s, down to dive, or right for up to 48% more speed. Collector must be home with its ring at least ¼ full. Extra equipped or copied cards add half the base strength; one swipe spends the ring once.";
      break;
    case "guide":
      effect =
        "An amber upward arrow shows a safe, efficient moment to Lift. You choose when to Lift. Extra copies keep one arrow.";
      break;
    case "rhythm":
      effect =
        "Lift 3 times at an even pace to send out a wave that reveals the passage. All 3 Lifts must succeed. Extra copies still send one wave.";
      break;
    case "harvest":
      effect = `When a wave crosses an uncollected Spark: +${amount} Sparks. It must be a fuel pickup already in the passage. This refills the meter without collecting the pickup.`;
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
        "Collector can fetch Flash. When either of you picks one up, restore up to 6 missing Sparks per equipped or copied Flash Handling. Your wisp can always touch Flash directly.";
      break;
    case "camp-extra":
      effect =
        "Take 2 different actions at one Rest. Spend 1 use after the second action succeeds. Extra copies do not add a third action or spend another use.";
      break;
    case "camp-grow":
      effect =
        `At Rest, Grow adds ${amount} maximum Sparks per equipped or copied source and refills your meter once. It does not heal hearts. All Growth Seeds share 3 Grow actions per journey.`;
      break;
    case "prism":
      effect = "Multiply the flight Sparks already earned by earlier slots in this pass by 1.25. Stored Sparks and recovery time are unchanged.";
      break;
    case "crescendo":
      effect = "If at least 2 earlier slot actions paid Sparks in this pass, double this pass’s flight Sparks so far. Copied actions count; multipliers do not.";
      break;
    case "refrain":
      effect = "After a productive flight event, replay the equipped row once from slot 1. All Refrains share one replay. Uses stay shared; no extra pickups, waves or Stored Sparks.";
      break;
    case "downbeat":
      effect = "Gain 2 flight Sparks when a paid manual Lift succeeds while descending, at least 0.75 seconds after the previous successful Lift. The first, free and Dream Lifts do not count.";
      break;
    case "ring-spring":
      effect = "Each passage Spark overfill shortens Collector’s current recovery by 1 second, including recovery after a save. Requires missing recovery.";
      break;
    case "watchlight":
      effect = "Once per flight, a full Collector ring catches a fatal impact while Collector is home. Bounce clear and emit one light wave, then recover for 4 normal recovery cycles. All copies share the save.";
      break;
    default:
      effect = "";
  }
  const interpolate=(text)=>String(text).replace(/\{(amount|charges|name)\}/g,(_,key)=>key==='amount'?amount:key==='charges'?(card.charges??d.charges??''):d.name);
  const ruleBands=Array.isArray(d.ruleBands)?d.ruleBands.map((band)=>({...band,text:interpolate(band.text)})):undefined;
  if((!effect||d.excludeStarter)&&ruleBands)effect=ruleBands.map((band)=>band.text).join(' ');
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
    limited: Number.isFinite(card.charges),
    ...(ruleBands?{ruleBands}:{}),
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
    if (!def || (def.charges && !(card.charges > 0))) continue;
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
export const getFieldImpulseMultiplier = (sources = 0) =>
  integer(sources, CARD_ECONOMY.maxEffectiveSources);
export function getCardGrowthUses(run) {
  return isCardRun(run) ? integer(run.cardGrowUses, 3) : 0;
}
export function getCardGrowthBonus(run) {
  return isCardRun(run) ? boundedGrowth(run.cardGrowCapacity, getCardGrowthUses(run)) : 0;
}
const decimal = (value) => String(Math.round(value * 100) / 100);
function effectiveCardSummary(kind, sources, cards) {
  const matching = sources.filter((entry) => entry.def.kind === kind), count = matching.length;
  const total = matching.reduce((sum, entry) => sum + cardAmount(entry.source), 0);
  if (kind === "field") {
    const multiplier = getFieldImpulseMultiplier(count);
    return { effectiveSources: count, effectiveMultiplier: multiplier,
      effectiveSummary: `${count} effective ${count===1?'source':'sources'} · ${decimal(multiplier)}× duration: up, down or right lasts up to ${decimal(.8 * multiplier)}s with a full ring. Ring radius scales duration and native strength; right adds up to 48% speed. One swipe spends the ring once.` };
  }
  const packingWeight=matching.reduce((sum,entry)=>sum+Math.max(1,Number(entry.def.packingWeight)||1),0);
  const summaries = {
    capacity: `+${total} maximum Sparks while equipped. Equipping does not refill the meter.`,
    proximity: 'One shared terrain meter enables revealing Proximity waves at normal reach, without Collector. Extra Proximity cards keep one meter; Echo has no passive action to repeat.',
    springboard: 'One free half-Lift bounce per direct passage Spark absorbed while falling. Extra Springboards do not increase the bounce. Cannot be copied.',
    'heart-stitch': 'Each real Heart Stitch counts direct passage Sparks while a heart is missing. Three in one flight restore one heart and spend one use. Full hearts spend no use; this card cannot be copied.',
    'prism-wick': 'When a passage Flash expires, send one final wave. Each equipped or copied action pays 3 Sparks from the same three shared uses; copies and replay keep one physical final wave.',
    "proximity-range": `Proximity waves enabled. +${50 * count}% of normal reach from ${count} effective ${count === 1 ? "source" : "sources"}. Chameleon can borrow this passive; Echo has no action to repeat.`,
    packing: `+${25 * packingWeight}% packing: every 4 Stored Sparks naturally packed earns +${packingWeight} extra. Progress carries forward; bonuses do not earn more bonuses.`,
    "flash-handling": `Restore up to ${total} missing Sparks when your wisp or Collector picks up Flash. Collector makes one pickup.`,
    "camp-grow": `Grow adds +${total} maximum Sparks and refills the meter once. All cards share 3 Grow actions per journey.`,
    harvest: `+${total} Sparks when a wave crosses an uncollected fuel pickup already in the passage${matching.some((entry) => entry.def.stored) ? `; +${matching.reduce((sum, entry) => sum + (entry.def.stored || 0), 0)} Stored Sparks at the first crossing per wave` : ""}.`,
    guide: "One amber arrow shows when to Lift, even with extra copies.",
    rhythm: "3 successful Lifts at an even pace send one wave, even with extra copies.",
    "cache-handling": "Collector can fetch Caches. A delivered Cache gives 12 Sparks. Extra cards keep that same delivery.",
    "twin-orbit": "Two Collectors fetch and reel independently while equipped. Maximum 2; the first keeps Field Impulse and saves.",
    "twin-wick": "One use unlocks a second Collector for this expedition, even after unequipping. Maximum 2; redundant Twin Orbit does not spend this use.",
    "collector-range": "Only extra catches beyond normal reach spend a use. The shortest sufficient extension pays once; copies share uses and extensions do not stack.",
    "camp-extra": "Take 2 different actions at one Rest. The second successful action spends 1 use from one Second Ember.",
  };
  if (kind === "body") {
    // A nearly spent Pocket Sparks may fund fewer executions than copy positions.
    const next = executeCardBodyPickup(createCardExecution(cards));
    return { effectiveSources: next.executions, effectiveSummary: `Next Spark your wisp absorbs: up to +${decimal(next.bonus / CARD_UNIT)} extra Sparks. Touch a fuel pickup already in the passage. Copied cards share the original card’s uses; the bonus cannot be packed.` };
  }
  return { effectiveSources: count, effectiveSummary: summaries[kind] || "" };
}
export function getMountedCards(run) {
  const sources = getEffectiveCardSources(run);
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
    if (d.kind === 'devourer') {
      const neighbor=run.mountedCards[index+1],neighborDef=SKILL_CARDS[neighbor?.cardId];
      printed.effectiveSummary=neighborDef?.rarity==='rare'
        ? `After a successful clear with a missing heart, consume ${describeSkillCard(neighbor).name} in slot ${index+2} to restore 1 heart. At full hearts it is spared. Devourers resolve left to right, after Heart Stitch.`
        : 'No Rare target immediately right. Place a Rare in the next slot to consume it after a successful clear with a missing heart. Full hearts spare the target.';
    }
    if (effective?.copiedBy) {
      const repeats=d.kind==='echo'?(d.repeatCount||1):1;
      if (effective.def.kind === "field") printed.copyPreview = `Adds ${repeats} Field Impulse ${repeats===1?'source':'sources'} · ${decimal(.8*repeats)}s extra with a full ring · one ring spend`;
      if (effective.def.kind === "flash-handling") printed.copyPreview = `Adds +${cardAmount(effective.source)*repeats} missing Sparks per Flash · one pickup`;
      if (effective.def.kind === "camp-grow") printed.copyPreview = `Adds +${cardAmount(effective.source)*repeats} maximum Sparks per Grow · shared actions`;
      if (effective.def.kind === "packing") printed.copyPreview = `${d.kind === "echo" ? "Repeats" : "Borrows"} +${25*(effective.def.packingWeight||1)*repeats}% packing · extras do not earn extras`;
    }
    return printed;
  });
}
/** Individual duplicate definitions remain separate; only mounted cards act. */
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
  return getEffectiveCardSources(run).filter(({ def }) => def.kind === "capacity")
    .reduce((sum, { source }) => sum + cardAmount(source) * CARD_UNIT, 0);
}
/** Integer quarters preserve earned fractions without multiplying wallet grants. */
export function getCardPackingBonus(packed, sources = 0, remainder = 0) {
  const quarters = integer(packed) * integer(sources, CARD_ECONOMY.maxPackingWeight)
    + integer(remainder, 3);
  return { amount: Math.floor(quarters / 4), remainder: quarters % 4 };
}
export function getCardStarterOffers(run, { legacy = false } = {}) {
  const pool = Object.values(SKILL_CARDS).filter((d) => d.rarity === "common" && !d.excludeStarter && (legacy || d.id !== "lift-guide")),
    draw = random(`${run.campaignSeed || run.seed}:card-starter:v1`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const soloKinds = ["body", "capacity", "guide", "field"];
  if (!pool.slice(0, 2).some((d) => soloKinds.includes(d.kind))) {
    const index = pool.findIndex((d) => soloKinds.includes(d.kind));
    [pool[0], pool[index]] = [pool[index], pool[0]];
  }
  return pool.slice(0, 2).map((d) => {
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
    if (earned && SKILL_CARDS[earned.cardId]) return {
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
  const pool = Object.values(SKILL_CARDS).filter(
      (d) => d.rarity === tier && !d.starterOnly,
    );
  let ticket = draw() * pool.reduce((sum, def) => sum + (def.dropWeight || 1), 0),
    d = pool.at(-1);
  for (const def of pool) {
    ticket -= def.dropWeight || 1;
    if (ticket < 0) { d = def; break; }
  }
  return makeSkillCard(d.id, identity);
}
/** Flight-local runtime. All executions share the real source card, never recursive modifiers. */
export function createCardExecution(snapshot) {
  return {
    cards: clone(
      Array.isArray(snapshot)
        ? snapshot
        : snapshot?.cards || snapshot?.mountedCards || [],
    ),
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
  lift: "downbeat-lift", overfill: "natural-overfill",
  delivery: "collector-delivery", rhythm: "rhythm-phrase", field: "field-swipe", guard: "guard-rescue",
  victory: "expedition-victory",
  clear: "flight-clear",
  attach: "collector-attach",
});
export const CARD_ROW_LIMITS = Object.freeze({ slots: 5, passes: 2, repeats: 3, slotVisits: 10, traceSteps: 40 });
const rowEventKinds = new Set(Object.values(CARD_ROW_EVENTS));
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
    crescendo: { event: "*", operation: "multiply", amount, minimumEarlierPayers: 2 },
  };
  return rules[def?.kind] || null;
}
export function hasCardRowEvent(runtime, kind) {
  return getEffectiveCardSources(runtime).some(({def,source}) => {
    const row=getCardRowRule(def,source);
    return row && (row.event===kind || (row.event==='*' && row.operation==='add-sparks'));
  });
}
function matchesRowCondition(when = {}, event, pass, slot, lastOccupied) {
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
const freezeReceipt = (receipt) => {
  for (const step of receipt.steps) Object.freeze(step);
  Object.freeze(receipt.steps);Object.freeze(receipt.event);Object.freeze(receipt.charges);
  return Object.freeze(receipt);
};
/** The numeric row is the same for flight and preview. Units here are printed Sparks.
 * Topology is fixed for this event; every action reads and spends its real source.
 * Physical actions (waves, collection, ring spend, rescue) never enter this walker.
 */
export function resolveCardRow(runtime, event = {}) {
  const kind = event.kind || event.type;
  const sequence = (runtime?.eventSequence || 0) + 1;
  if (runtime) runtime.eventSequence = sequence;
  const receipt = { event: { id: event.id ?? sequence, sequence, kind,
    firstCrossing: !!event.firstCrossing, pickupKind: event.pickupKind ?? null,
    meterFraction: event.meterFraction ?? null, direction: event.direction ?? null,
    guardRecovering: !!event.guardRecovering, collectorReeling: !!event.collectorReeling,
    availableReel: Math.max(0,Number(event.availableReel)||0),
    availableRecovery: Math.max(0,Number(event.availableRecovery)||0), carriedStored: integer(event.carriedStored),
    cruisingSpeedRoom:event.cruisingSpeedRoom==null?6:cleanCardCruisingSpeed(event.cruisingSpeedRoom) }, passes: 0, slotVisits: 0, sparks: 0, stored: 0,
    futureCapacity: 0, cruisingSpeed: 0, recoverySeconds: 0, reelSeconds: 0, executions: 0, payerActions: 0, steps: [], charges: {} };
  if (!runtime || !rowEventKinds.has(kind) || event.eligible === false) {
    receipt.charges = getCardCharges(runtime);return freezeReceipt(receipt);
  }
  const cards = (runtime.cards || []).slice(0, CARD_ECONOMY.maxSlots);
  const topology = cards.map((card) => card ? { ...card } : null);
  const live = new Map(cards.filter(Boolean).map((card) => [card.instanceId, card]));
  const lastOccupied = topology.findLastIndex((card) => !!card);
  let recoveryLeft = Math.max(0, Number(event.availableRecovery) || 0);
  let cruisingSpeedRoom=receipt.event.cruisingSpeedRoom;
  let reelLeft = Math.max(0, Number(event.availableReel) || 0);
  let replayRequested = false, productive = false;
  for (let pass = 1; pass <= (replayRequested && productive ? 2 : 1); pass++) {
    let subtotal = 0, futureSubtotal = 0, payers = 0, lastPayout = 0;
    receipt.passes = pass;
    for (let slot = 0; slot < topology.length; slot++) {
      const acting = topology[slot], ownDef = SKILL_CARDS[acting?.cardId];
      const copy = ownDef?.kind === "echo" || ownDef?.kind === "chameleon";
      const target = copy ? topology[slot + 1] : acting;
      const def = SKILL_CARDS[target?.cardId];
      const source = live.get(target?.instanceId);
      receipt.slotVisits++;
      const repeats = copy && ownDef.kind === "echo" ? Math.max(1,integer(ownDef.repeatCount || 1,CARD_ROW_LIMITS.repeats)) : 1;
      for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex++) {
      const step = { eventId: receipt.event.id, eventKind: kind, pass, slot, repeatIndex,
        actingInstanceId: acting?.instanceId ?? null, actingCardId: acting?.cardId ?? null,
        sourceInstanceId: source?.instanceId ?? null, sourceCardId: source?.cardId ?? null,
        copiedBy: copy ? ownDef.kind : null, operation: "skip", before: subtotal, after: subtotal,
        amount: 0, stored: 0, recoverySeconds: 0, recoveryBefore: recoveryLeft, recoveryAfter: recoveryLeft,
        futureCapacity: 0, futureCapacityBefore: futureSubtotal, futureCapacityAfter: futureSubtotal, cruisingSpeed: 0,
        reelSeconds: 0, reelBefore: reelLeft, reelAfter: reelLeft,
        chargesBefore: Number.isFinite(source?.charges)?source.charges:null,
        chargesAfter: Number.isFinite(source?.charges)?source.charges:null,
        success: false, skipReason: null };
      receipt.steps.push(step);
      if (!ownDef) { step.skipReason = "empty-slot";continue; }
      if (!def || (copy && (!def.copyable || (ownDef.kind === "echo" && (def.kind === "capacity" || def.passive))))) {
        step.skipReason = "incompatible-neighbor";continue;
      }
      if (!source || (def.charges && !(source.charges > 0))) {
        step.skipReason = "exhausted-source";continue;
      }
      const rule = getCardRowRule(def, source);
      if (rule && (rule.event === kind || rule.event === "*" && ![CARD_ROW_EVENTS.victory,CARD_ROW_EVENTS.clear,CARD_ROW_EVENTS.attach].includes(kind)) && matchesRowCondition(rule.when,event,pass,slot,lastOccupied)) {
      const operation = rule.operation;
      const amount = Math.max(0,Number(pass === 2 && rule.replayAmount !== undefined ? rule.replayAmount : rule.amount) || 0);
      const payout = operation === "add-last-payout" ? lastPayout : amount;
      if ((operation === "add-sparks" || operation === "add-last-payout") && payout > 0 && payers >= (Number(rule.minimumEarlierPayers)||0)) {
        if (def.charges) source.charges--;
        subtotal += payout;lastPayout = payout;payers++;receipt.payerActions++;receipt.executions++;productive = true;
        step.operation = operation;step.amount = payout;step.success = true;
        if (pass === 1 && event.firstCrossing && rule.storedFirstCrossing) {
          step.stored = Math.max(0,Number(rule.storedFirstCrossing)||0);receipt.stored += step.stored;
        }
      } else if (operation === "multiply") {
        step.operation = "multiply";step.multiplier = amount;
        if (subtotal > 0 && amount > 1 && payers >= (Number(rule.minimumEarlierPayers)||0)) {
          if (def.charges) source.charges--;
          subtotal *= amount;step.amount = subtotal - step.before;step.success = true;
          receipt.executions++;productive = true;
        } else step.skipReason = subtotal <= 0 ? "empty-subtotal" : "needs-two-earlier-payers";
      } else if (operation === "add-future-capacity" || operation === "multiply-future-capacity") {
        step.operation = operation;
        const increase = operation === "add-future-capacity" ? cleanCardFutureCapacity(amount) : futureSubtotal * Math.max(0, cleanCardFutureCapacity(amount) - 1);
        if (increase > 0) {
          if (def.charges) source.charges--;
          futureSubtotal += increase;step.futureCapacity = increase;step.success = true;
          receipt.executions++;productive = true;
        } else step.skipReason = "empty-future-capacity";
      } else if (operation === "add-stored" || operation === "carried-interest" || operation === "add-cruising-speed") {
        step.operation = operation;
        const gain = operation === "carried-interest" ? Math.min(10, Math.floor(integer(event.carriedStored) / 10)) * amount
          : operation === "add-cruising-speed" ? Math.min(amount,cruisingSpeedRoom) : amount;
        if (gain > 0) {
          if (def.charges) source.charges--;
          if (operation === "add-cruising-speed") { step.cruisingSpeed = gain;receipt.cruisingSpeed += gain;cruisingSpeedRoom-=gain; }
          else { step.stored = gain;receipt.stored += gain; }
          receipt.executions++;productive = true;step.success = true;
        } else step.skipReason = operation === "add-cruising-speed" ? "cruising-speed-cap" : "no-carried-interest";
      } else if (operation === "shorten-reel") {
        step.operation = operation;step.reelSeconds = Math.min(amount, reelLeft, recoveryLeft);
        if (step.reelSeconds > 0) {
          if (def.charges) source.charges--;
          reelLeft -= step.reelSeconds;recoveryLeft -= step.reelSeconds;receipt.reelSeconds += step.reelSeconds;
          receipt.executions++;productive = true;step.success = true;
        } else step.skipReason = "no-active-reel";
      } else if (operation === "shorten-recovery") {
        step.operation = operation;
        step.recoverySeconds = Math.min(amount, recoveryLeft);
        if (step.recoverySeconds > 0) {
          if (def.charges) source.charges--;
          recoveryLeft -= step.recoverySeconds;receipt.recoverySeconds += step.recoverySeconds;
          reelLeft = Math.min(reelLeft, recoveryLeft);
          receipt.executions++;productive = true;step.success = true;
        } else step.skipReason = "no-recovery";
      } else step.skipReason = operation === "add-last-payout" ? "no-earlier-payout" : operation === "add-sparks" ? "needs-earlier-payer" : "unsupported-operation";
      } else if (def.kind === "refrain") {
        step.operation = "replay-row";
        if (pass === 1 && !replayRequested) { replayRequested = true;step.success = true; }
        else step.skipReason = "replay-limit";
      } else step.skipReason = rule ? "event-or-condition-not-met" : "different-event-or-passive";
      step.after = subtotal;
      step.futureCapacityAfter = futureSubtotal;
      step.reelAfter = reelLeft;
      step.recoveryAfter = recoveryLeft;
      step.chargesAfter = Number.isFinite(source?.charges)?source.charges:null;
      }
    }
    receipt.sparks += subtotal;
    receipt.futureCapacity += futureSubtotal;
    // A Refrain by itself cannot schedule a meaningless second walk.
    if (pass === 1 && !productive) for (const step of receipt.steps) {
      if (step.operation === "replay-row" && step.success) {
        step.success = false;step.skipReason = "no-productive-action";
      }
    }
  }
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
export function getCardModifiers(run) {
  const m = {
    cardProximitySources: 0,
    cardProximityUnlocked: false,
    cardRhythm: false,
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
    cardTwinWickUnlocked: false,
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
    cardWaveLoom: false,
    cardOverfillEvery: 3,
  };
  if (!isCardRun(run)) return m;
  m.cardTwinWickUnlocked = run.cardTwinWickUnlocked === true;
  m.cardPackingRemainder = integer(run.cardPackingRemainder, 3);
  m.cardExecution = { cards: clone(run.mountedCards || []) };
  for (const { def: d, source } of getEffectiveCardSources(run)) {
    if (d.kind === "proximity") m.cardProximityUnlocked = true;
    if (d.kind === "proximity-range") m.cardProximitySources++;
    if (d.kind === "rhythm") m.cardRhythm = true;
    if (d.kind === "guide") m.cardLiftGuide = true;
    if (d.kind === "field") { m.cardFieldImpulse = true; m.cardFieldSources++; }
    if (d.kind === "cache-handling") m.cardCacheHandling = true;
    if (d.kind === "twin-orbit") m.cardTwinOrbit = true;
    if (d.kind === "twin-wick") m.cardTwinWick = true;
    if (d.kind === "flash-handling") { m.cardFlashHandling = true; m.cardFlashSources++; m.cardFlashMeter += cardAmount(source) * CARD_UNIT; }
    if (d.kind === "camp-grow") { m.cardGrowSources++; m.cardGrowAmount += cardAmount(source) * CARD_UNIT; }
    if (d.kind === "packing") m.cardPackingSources+=Math.max(1,Number(d.packingWeight)||1);
    if (d.kind === "downbeat") m.cardDownbeat = true;
    if (d.kind === "ring-spring") m.cardRingSpring = true;
    if (d.kind === "watchlight") m.cardWatchlight = true;
    if (d.kind === "wave-loom") m.cardWaveLoom = true;
    if (d.kind === "spillway") m.cardOverfillEvery=Math.min(m.cardOverfillEvery,Math.max(1,Number(d.pulseCadence)||3));
    if (d.kind === "body" && !d.charges)
      m.cardBodyBonus += cardAmount(source) * CARD_UNIT;
    if (d.kind === "harvest") {
      m.cardHarvestMeter += cardAmount(source) * CARD_UNIT;
      m.cardHarvestStoredPerWave += d.stored || 0;
    }
  }
  m.cardFieldMultiplier = getFieldImpulseMultiplier(m.cardFieldSources);
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
