/** Small, serializable skills-as-cards pilot. Printed Sparks use the existing .3 display scale. */
export const CARD_SYSTEM = "cards-v1";
export const CARD_UNIT = 10 / 3;
export const CARD_ECONOMY = Object.freeze({
  melt: { common: 10, rare: 20, legendary: 40 },
  forge: { rare: 30, legendary: 60 },
  improve: { common: 15, rare: 25, legendary: 40 },
  maxSlots: 5,
});
const definition = (id, name, rarity, kind, amount = 0, extra = {}) =>
  Object.freeze({
    id,
    name,
    rarity,
    kind,
    amount,
    maxRank:
      kind === "body" || kind === "capacity" || kind === "harvest" ? 3 : 1,
    ...extra,
  });
export const SKILL_CARDS = Object.freeze({
  "body-spark": definition("body-spark", "Body Spark +2", "common", "body", 2, {
    copyable: true,
  }),
  "spark-cache": definition(
    "spark-cache",
    "Pocket Sparks",
    "common",
    "body",
    4,
    { copyable: true, charges: 6 },
  ),
  "deep-vessel": definition(
    "deep-vessel",
    "Deep Vessel",
    "common",
    "capacity",
    3,
    { copyable: true },
  ),
  "tight-packing": definition(
    "tight-packing", "Tight Packing", "common", "packing", 25,
    { copyable: true },
  ),
  echo: definition("echo", "Echo", "common", "echo"),
  chameleon: definition("chameleon", "Chameleon", "rare", "chameleon"),
  "field-impulse": definition(
    "field-impulse",
    "Field Impulse",
    "common",
    "field",
  ),
  "lift-guide": definition("lift-guide", "Lift Guide", "common", "guide", 0, {
    starterOnly: true,
  }),
  rhythm: definition("rhythm", "Rhythm", "rare", "rhythm"),
  "harvest-common": definition(
    "harvest-common",
    "Resonant Harvest",
    "common",
    "harvest",
    1,
    { copyable: true },
  ),
  "harvest-rare": definition(
    "harvest-rare",
    "Resonant Harvest",
    "rare",
    "harvest",
    2,
    { copyable: true },
  ),
  "harvest-legendary": definition(
    "harvest-legendary",
    "Resonant Harvest",
    "legendary",
    "harvest",
    2,
    { copyable: true, stored: 1 },
  ),
  "camp-kit": definition(
    "camp-kit",
    "Second Ember",
    "common",
    "camp-extra",
    0,
    { charges: 1 },
  ),
  "growth-seed": definition("growth-seed", "Growth Seed", "rare", "camp-grow"),
  "cache-handling": definition(
    "cache-handling",
    "Cache Handling",
    "rare",
    "cache-handling",
  ),
  "flash-handling": definition(
    "flash-handling",
    "Flash Handling",
    "rare",
    "flash-handling",
  ),
});
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
export function cleanCardRun(run) {
  if (!isCardRun(run)) return;
  run.cardSlots = Math.max(
    3,
    integer(run.cardSlots || 3, CARD_ECONOMY.maxSlots),
  );
  const seen = new Set();
  run.mountedCards = Array.from({ length: run.cardSlots }, (_, i) => {
    const card = run.mountedCards?.[i],
      def = SKILL_CARDS[card?.cardId];
    if (!def || !card.instanceId || seen.has(card.instanceId)) return null;
    if (def.charges && card.charges === 0) return null;
    seen.add(card.instanceId);
    return {
      instanceId: String(card.instanceId),
      cardId: card.cardId,
      rank: Math.max(1, integer(card.rank || 1, def.maxRank)),
      ...(def.charges
        ? {
            charges: Number.isFinite(card.charges)
              ? integer(card.charges, def.charges)
              : def.charges,
          }
        : {}),
    };
  });
  run.cardHistory = Array.isArray(run.cardHistory) ? run.cardHistory : [];
  run.cardRewardedNodes = Array.isArray(run.cardRewardedNodes)
    ? run.cardRewardedNodes
    : [];
  run.cardSlotMaps = Array.isArray(run.cardSlotMaps) ? run.cardSlotMaps : [];
  run.cardPackingRemainder = integer(run.cardPackingRemainder, 3);
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
      effect = `Direct natural body Spark pickups add +${amount} Sparks to the meter. Bonus cannot be packed.`;
      break;
    case "capacity":
      effect = `+${amount} maximum Sparks while mounted. Mounting never refills.`;
      break;
    case "packing":
      effect = "Pack 25% more Stored Sparks. Every 4 you pack earns 1 extra.";
      break;
    case "echo":
      effect =
        "Repeats the compatible printed action immediately right; shared source uses.";
      break;
    case "chameleon":
      effect =
        "Borrows the compatible printed ability immediately right; shared source uses.";
      break;
    case "field":
      effect =
        "Swipe up, down or right to spend the recovering Collector ring. Cannot be copied or repeated.";
      break;
    case "guide":
      effect =
        "An amber chevron suggests a safe, fuel-efficient manual Lift window. Starter-only.";
      break;
    case "rhythm":
      effect =
        "Three successful manual Lifts with even gaps release one terrain-revealing Luminance wave.";
      break;
    case "harvest":
      effect = `Each wave crossing a natural, uncollected map Spark restores +${amount} Sparks.`;
      if (d.stored)
        effect +=
          " First qualifying crossing also grants +1 Stored Spark per wave.";
      break;
    case "cache-handling":
      effect =
        "While mounted, Collector can fetch dense Cache Sparks. Deliveries restore 12 Sparks and fully recharge its search ring. Direct touch always works.";
      break;
    case "flash-handling":
      effect =
        "While mounted, Collector can fetch missed Flash Powerups. Flash pickups by you or Collector also restore up to 6 missing Sparks. Direct touch always works.";
      break;
    case "camp-extra":
      effect =
        "Take two different actions at one Rest. Spends its charge only when the second action succeeds.";
      break;
    case "camp-grow":
      effect =
        "Unlock Grow at Rest: +3 maximum Sparks and full refill, without healing. Three Grow actions per run.";
      break;
    default:
      effect = "";
  }
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
  };
}
function targetAbility(cards, index) {
  const source = cards?.[index + 1],
    def = SKILL_CARDS[source?.cardId];
  return source && def?.copyable && (!def.charges || source.charges > 0)
    ? { source, def }
    : null;
}
export function getMountedCards(run) {
  return (run?.mountedCards || []).map((card, index) => {
    const printed = describeSkillCard(card);
    if (!printed) return null;
    const d = SKILL_CARDS[card.cardId],
      target = targetAbility(run.mountedCards, index);
    if (["echo", "chameleon"].includes(d.kind))
      printed.copyPreview = target
        ? d.kind === "echo" && ["capacity", "packing"].includes(target.def.kind)
          ? "No activation to repeat"
          : `${d.kind === "echo" ? "Repeats" : "Borrows"} ${target.def.kind === "body" ? "+" + cardAmount(target.source) + " Sparks" : describeSkillCard(target.source).name}${target.def.charges ? " · shared charges" : ""}`
        : run.mountedCards[index + 1]
          ? `Cannot ${d.kind === "echo" ? "repeat" : "borrow"} ${SKILL_CARDS[run.mountedCards[index + 1].cardId]?.name || "this card"}`
          : "No card to the right";
    return printed;
  });
}
export function getCardCapacityBonus(run) {
  if (!isCardRun(run)) return 0;
  let total = 0;
  for (const [index, card] of (run.mountedCards || []).entries()) {
    const d = SKILL_CARDS[card?.cardId];
    if (d?.kind === "capacity") total += cardAmount(card);
    if (d?.kind === "chameleon") {
      const target = targetAbility(run.mountedCards, index);
      if (target?.def.kind === "capacity") total += cardAmount(target.source);
    }
  }
  return total * CARD_UNIT;
}
/** Integer quarters preserve earned fractions without multiplying wallet grants. */
export function getCardPackingBonus(packed, sources = 0, remainder = 0) {
  const quarters = integer(packed) * integer(sources, CARD_ECONOMY.maxSlots)
    + integer(remainder, 3);
  return { amount: Math.floor(quarters / 4), remainder: quarters % 4 };
}
export function getCardStarterOffers(run) {
  const pool = Object.values(SKILL_CARDS).filter((d) => d.rarity === "common"),
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
  const roll = draw(),
    tier =
      rarity ||
      (roll < (node?.boss ? 0.35 : node?.elite ? 0.22 : 0.1)
        ? "rare"
        : roll > (node?.boss ? 0.94 : node?.elite ? 0.98 : 0.995)
          ? "legendary"
          : "common");
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
  };
}
export function getCardCharges(runtime) {
  return Object.fromEntries(
    (runtime?.cards || [])
      .filter((c) => c && Number.isFinite(c.charges))
      .map((c) => [c.instanceId, integer(c.charges)]),
  );
}
export function executeCardBodyPickup(runtime) {
  let bonus = 0,
    executions = 0;
  const cards = runtime?.cards || [];
  const execute = (source) => {
    const d = SKILL_CARDS[source?.cardId];
    if (d?.kind !== "body" || (d.charges && source.charges <= 0)) return;
    if (d.charges) source.charges--;
    bonus += cardAmount(source) * CARD_UNIT;
    executions++;
  };
  for (const [index, card] of cards.entries()) {
    const d = SKILL_CARDS[card?.cardId];
    if (!d) continue;
    if (d.kind === "body") execute(card);
    else if (d.kind === "echo" || d.kind === "chameleon") {
      const target = targetAbility(cards, index);
      if (target?.def.kind === "body") execute(target.source);
    }
  }
  runtime.executions = (runtime.executions || 0) + executions;
  return { bonus, executions, charges: getCardCharges(runtime) };
}
export function commitCardCharges(run, charges) {
  if (!isCardRun(run) || !charges) return [];
  const exhausted = [];
  run.mountedCards = (run.mountedCards || []).map((card) => {
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
  });
  return exhausted;
}
export function getCardModifiers(run) {
  const m = {
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
    cardCacheHandling: false,
    cardFlashHandling: false,
    cardPackingSources: 0,
    cardPackingRemainder: 0,
  };
  if (!isCardRun(run)) return m;
  m.cardPackingRemainder = integer(run.cardPackingRemainder, 3);
  m.cardExecution = { cards: clone(run.mountedCards || []) };
  for (const [index, card] of (run.mountedCards || []).entries()) {
    let d = SKILL_CARDS[card?.cardId],
      source = card;
    if (!d) continue;
    if (d.kind === "chameleon") {
      const target = targetAbility(run.mountedCards, index);
      if (!target) continue;
      d = target.def;
      source = target.source;
    } else if (d.kind === "echo") {
      const target = targetAbility(run.mountedCards, index);
      if (target?.def.kind === "harvest") {
        d = target.def;
        source = target.source;
      } else if (target?.def.kind === "body" && !target.def.charges)
        m.cardBodyBonus += cardAmount(target.source) * CARD_UNIT;
      else continue;
    }
    if (d.kind === "rhythm") m.cardRhythm = true;
    if (d.kind === "guide") m.cardLiftGuide = true;
    if (d.kind === "field") m.cardFieldImpulse = true;
    if (d.kind === "cache-handling") m.cardCacheHandling = true;
    if (d.kind === "flash-handling") m.cardFlashHandling = true;
    if (d.kind === "packing") m.cardPackingSources++;
    if (d.kind === "body" && !d.charges)
      m.cardBodyBonus += cardAmount(source) * CARD_UNIT;
    if (d.kind === "harvest") {
      m.cardHarvestMeter += cardAmount(source) * CARD_UNIT;
      m.cardHarvestStoredPerWave += d.stored || 0;
    }
  }
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
