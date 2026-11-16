/** Small, serializable skills-as-cards pilot. Printed Sparks use the existing .3 display scale. */
export const CARD_SYSTEM = "cards-v1";
export const CARD_UNIT = 10 / 3;
export const CARD_ECONOMY = Object.freeze({
  melt: { common: 10, rare: 20, legendary: 40 },
  forge: { rare: 30, legendary: 60 },
  improve: { common: 15, rare: 25, legendary: 40 },
  evolve: { rare: 25, legendary: 40 },
  maxSlots: 5,
  maxEffectiveSources: 9,
  maxPackingWeight: 27,
  maxGrowPerAction: 27,
});
import {CARD_CATALOG,CARD_DROP_WEIGHTS} from './card-catalog.mjs?v=skills-cards-3';
export const SKILL_CARDS = CARD_CATALOG;
const clone = (value) => JSON.parse(JSON.stringify(value));
const integer = (n, max = 1e9) =>
  Math.max(0, Math.min(max, Number.isFinite(n) ? Math.floor(n) : 0));
export const isCardRun = (run) =>
  run?.skillSystem === CARD_SYSTEM && !run?.isTutorial;
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
    owner.cardGrowCapacity = integer(owner.cardGrowCapacity, owner.cardGrowUses * CARD_ECONOMY.maxGrowPerAction * CARD_UNIT);
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
  settleCardReward(run);
}
export function cardAmount(card) {
  const def = SKILL_CARDS[card?.cardId];
  return def ? def.amount + (Math.max(1, integer(card.rank || 1)) - 1) : 0;
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
      effect = "For every 4 Stored Sparks you pack, gain 1 extra. Progress carries forward; the extras do not earn more extras.";
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
        "Collector can fetch Caches. Each delivery gives 12 Sparks and refills its ring. Extra copies keep one delivery. Your wisp can always touch a Cache for 18 Sparks.";
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
        "At Rest, Grow adds 3 maximum Sparks per equipped or copied Growth Seed and refills your meter once. It does not heal hearts. All copies share 3 Grow actions per journey.";
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
      effect = "Each natural Spark overfill shortens Collector’s current recovery by 1 second, including recovery after a save. Requires missing recovery.";
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
  return isCardRun(run) ? integer(run.cardGrowCapacity, getCardGrowthUses(run) * CARD_ECONOMY.maxGrowPerAction * CARD_UNIT) : 0;
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
    "proximity-range": `Proximity waves enabled. +${50 * count}% of normal reach from ${count} effective ${count === 1 ? "source" : "sources"}. Chameleon can borrow this passive; Echo has no action to repeat.`,
    packing: `+${25 * packingWeight}% packing: every 4 Stored Sparks packed earns +${packingWeight} extra. Progress carries forward; extras do not earn more extras.`,
    "flash-handling": `Restore up to ${total} missing Sparks when your wisp or Collector picks up Flash. Collector makes one pickup.`,
    "camp-grow": `Grow adds +${total} maximum Sparks and refills the meter once. All cards share 3 Grow actions per journey.`,
    harvest: `+${total} Sparks when a wave crosses an uncollected fuel pickup already in the passage${matching.some((entry) => entry.def.stored) ? `; +${matching.reduce((sum, entry) => sum + (entry.def.stored || 0), 0)} Stored Sparks at the first crossing per wave` : ""}.`,
    guide: "One amber arrow shows when to Lift, even with extra copies.",
    rhythm: "3 successful Lifts at an even pace send one wave, even with extra copies.",
    "cache-handling": "Collector can fetch Caches for 12 Sparks and a full ring. Extra cards keep that same delivery.",
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
  const roll = draw()*100, weights=CARD_DROP_WEIGHTS[node?.boss?'boss':node?.elite?'elite':'normal'],
    tier = rarity || (roll<weights.common?'common':roll<weights.common+weights.rare?'rare':'legendary');
  const pool = Object.values(SKILL_CARDS).filter(
      (d) => d.rarity === tier && !d.starterOnly,
    ),
    d = pool[Math.floor(draw() * pool.length)];
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
  lift: "downbeat-lift", overfill: "natural-overfill",
  delivery: "collector-delivery", rhythm: "rhythm-phrase", field: "field-swipe", guard: "guard-rescue",
});
export const CARD_ROW_LIMITS = Object.freeze({ slots: 5, passes: 2, repeats: 3, slotVisits: 10, traceSteps: 40 });
const rowEventKinds = new Set(Object.values(CARD_ROW_EVENTS));
export function getCardRowRule(def, card) {
  if (def?.row) return { ...def.row, amount: def.row.amount ?? cardAmount(card) };
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
    guardRecovering: !!event.guardRecovering, availableRecovery: Math.max(0,Number(event.availableRecovery)||0) }, passes: 0, slotVisits: 0, sparks: 0, stored: 0,
    recoverySeconds: 0, executions: 0, payerActions: 0, steps: [], charges: {} };
  if (!runtime || !rowEventKinds.has(kind) || event.eligible === false) {
    receipt.charges = getCardCharges(runtime);return freezeReceipt(receipt);
  }
  const cards = (runtime.cards || []).slice(0, CARD_ECONOMY.maxSlots);
  const topology = cards.map((card) => card ? { ...card } : null);
  const live = new Map(cards.filter(Boolean).map((card) => [card.instanceId, card]));
  const lastOccupied = topology.findLastIndex((card) => !!card);
  let recoveryLeft = Math.max(0, Number(event.availableRecovery) || 0);
  let replayRequested = false, productive = false;
  for (let pass = 1; pass <= (replayRequested && productive ? 2 : 1); pass++) {
    let subtotal = 0, payers = 0, lastPayout = 0;
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
      if (rule && (rule.event === "*" || rule.event === kind) && matchesRowCondition(rule.when,event,pass,slot,lastOccupied)) {
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
        if (subtotal > 0 && payers >= (Number(rule.minimumEarlierPayers)||0)) {
          subtotal *= amount;step.amount = subtotal - step.before;step.success = true;
        } else step.skipReason = subtotal <= 0 ? "empty-subtotal" : "needs-two-earlier-payers";
      } else if (operation === "shorten-recovery") {
        step.operation = operation;
        step.recoverySeconds = Math.min(amount, recoveryLeft);
        if (step.recoverySeconds > 0) {
          if (def.charges) source.charges--;
          recoveryLeft -= step.recoverySeconds;receipt.recoverySeconds += step.recoverySeconds;
          receipt.executions++;productive = true;step.success = true;
        } else step.skipReason = "no-recovery";
      } else step.skipReason = operation === "add-last-payout" ? "no-earlier-payout" : operation === "add-sparks" ? "needs-earlier-payer" : "unsupported-operation";
      } else if (def.kind === "refrain") {
        step.operation = "replay-row";
        if (pass === 1 && !replayRequested) { replayRequested = true;step.success = true; }
        else step.skipReason = "replay-limit";
      } else step.skipReason = rule ? "event-or-condition-not-met" : "different-event-or-passive";
      step.after = subtotal;
      step.recoveryAfter = recoveryLeft;
      step.chargesAfter = Number.isFinite(source?.charges)?source.charges:null;
      }
    }
    receipt.sparks += subtotal;
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
  m.cardPackingRemainder = integer(run.cardPackingRemainder, 3);
  m.cardExecution = { cards: clone(run.mountedCards || []) };
  for (const { def: d, source } of getEffectiveCardSources(run)) {
    if (d.kind === "proximity-range") m.cardProximitySources++;
    if (d.kind === "rhythm") m.cardRhythm = true;
    if (d.kind === "guide") m.cardLiftGuide = true;
    if (d.kind === "field") { m.cardFieldImpulse = true; m.cardFieldSources++; }
    if (d.kind === "cache-handling") m.cardCacheHandling = true;
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
