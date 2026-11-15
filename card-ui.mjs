import {
  getMountedCards,
  getCardReward,
  getCardImprovePreview,
  getCardForgePreview,
  getSkillWallet,
} from "./model.mjs?v=skills-cards-1";
import { resourceSymbol } from "./game-symbols.mjs?v=skills-cards-1";
import { choiceScene } from "./choice-art.mjs?v=skills-cards-1";
import { livesMarkup } from "./lives.mjs?v=skills-cards-1";
import { getGlowCapacity, formatGlow } from "./vitality.mjs?v=skills-cards-1";
import { mapStopIconMarkup } from "./map-guide.mjs?v=skills-cards-1";
import {
  createCardExecution,
  executeCardBodyPickup,
} from "./skill-cards.mjs?v=skills-cards-1";

const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const amount = (v) => Math.floor(Number(v) || 0);
const rarity = (c) => String(c?.rarity || "common").toLowerCase();
const printed = (c) =>
  typeof c === "string" ? c : c?.effect || c?.description || "";
function cardSummary(card) {
  const summaries = {
    body: `+${card?.amount || 0} Sparks when your wisp touches a fuel Spark. Bonus cannot pack.`,
    capacity: `+${card?.amount || 0} maximum Sparks while mounted. No refill.`,
    packing: "Pack 25% more Stored Sparks. Every 4 you pack earns 1 extra.",
    echo: "Repeat the compatible card immediately right. Share its uses.",
    chameleon: "Borrow the compatible card immediately right. Share its uses.",
    field: "Swipe to spend Collector’s recovering ring. Cannot be copied.",
    guide:
      "Amber chevron: a good manual Lift window. Advice, not automatic flight.",
    rhythm: "Three evenly spaced manual Lifts release one Luminance wave.",
    harvest: `Wave crosses a natural Spark: +${card?.amount || 0} to meter.${card?.rarity === "legendary" ? " First crossing: +1 Stored Spark per wave." : ""}`,
    "camp-extra":
      "One second, different action at one Rest. Spend after success.",
    "camp-grow": "Unlock Grow at Rest: +3 maximum Sparks + refill. No healing.",
    "cache-handling":
      "Collector fetches Caches: 12 Sparks + full search-ring recharge.",
    "flash-handling":
      "Collector fetches Flash. Any Flash pickup restores up to 6 Sparks.",
  };
  return summaries[card?.kind] || printed(card);
}
function bodyPickupPreview(run) {
  const runtime = createCardExecution({ cards: run.mountedCards }),
    result = executeCardBodyPickup(runtime);
  const spent = runtime.cards
    .filter((c) => c && Number.isFinite(c.charges))
    .map((c) => {
      const original = run.mountedCards.find(
        (v) => v?.instanceId === c.instanceId,
      );
      return original && original.charges !== c.charges
        ? `${cardName(getMountedCards(run).find((v) => v?.instanceId === c.instanceId))}: ${original.charges} → ${c.charges} uses`
        : "";
    })
    .filter(Boolean)
    .join(" · ");
  return { total: formatGlow(40 + result.bonus), spent };
}
export const cardName = (c) => c?.name || c?.cardId || "Card";
function flightPackingReceipt(run, reward) {
  const flight = run?.lastFlight,
    bonus = amount(flight?.cardPackingBonus);
  return bonus > 0 &&
    flight?.success &&
    reward?.source === "flight" &&
    reward.id &&
    reward.id === flight.cardDrop?.id
    ? ` · Tight Packing +${bonus} Stored Sparks`
    : "";
}
export function cardArt(card = {}) {
  const id = String(card.cardId || card.id || "");
  const types = {
    echo: "echo",
    chameleon: "chameleon",
    rhythm: "rhythm",
    "growth-seed": "seed",
    "deep-vessel": "vessel",
    "camp-kit": "camp",
    "field-impulse": "field",
    "spark-cache": "cache",
    "lift-guide": "lift",
    "cache-handling": "cache-fetch",
    "flash-handling": "flash-fetch",
    "tight-packing": "packing",
  };
  const type = types[id] || (id.startsWith("harvest-") ? "harvest" : "spark");
  const glyphs = {
    spark: "M14 7h4v4h4v4h3v4h-5v5h-4v3h-4v-6H8v-4h4v-5h2Z",
    lift: "M5 21h5v-5h5v-5h4v5h5v5h5v4h-8v-5h-4v-4h-1v4h-4v5H5Z",
    copy: "M5 8h15v4H9v12H5ZM13 14h15v15H13Zm4 4v7h7v-7Z",
    camp: "M5 26h6l3-5h-4v-4h5v-7h3v4h5v7h-3l4 5h5v3H5Zm10-1h5v-4h-5Z",
    shield: "M6 8h21v13h-4v5h-5v4h-4v-4H9v-5H6Zm5 5v7h4v4h4v-4h3v-7Z",
  };
  Object.assign(glyphs, {
    "cache-fetch":
      "M7 10h18v18H7Zm4 4v10h10V14ZM3 5h7v3H6v5H3Zm23 0h7v8h-3V8h-4Z",
    "flash-fetch":
      "M15 8h4v5h3v5h4v6H8v-6h4v-5h3ZM3 4h6v3H6v5H3Zm23 0h6v8h-3V7h-3Z",
    echo: "M8 5h12v3h4v12h-4v4h-3v4h-3v-7H8v-3H5V8h3Zm2 4v8h10V9Zm12 12h4v9h-4Z",
    chameleon:
      "M6 14h7v-4h13v4h4v9h-4v7H14v-4h-4v-8h4v-3h9v8h-5v-4h-3v6h8v-8h-9v-1H6Zm17-6h3v3h-3Z",
    rhythm:
      "M4 14h3v-4h6v3H8v8h5v3H7v-4H4Zm10-5h3V5h6v3h-5v8h5v3h-6v-4h-3Zm10 13h3v-4h6v3h-5v8h5v3h-6v-4h-3Z",
    seed: "M15 20h3v-7h-7v-3H6v7h4v3h5Zm3-8h4V8h8v8h-4v3h-8Zm-3 8h5v8h-5Zm-5 8h15v3H10Z",
    vessel: "M7 10h4v13h4v4h8v-4h4V10h4v16h-4v5H11v-5H7Zm8 3h8v4h-8Z",
    field:
      "M15 5h5v5h4v4h-4v8h6v-4h4v11H19v-4h4v-7h-8v9h-4v4H7V20h4v3h4V14h-4v-4h4Z",
    cache: "M5 13h4v-4h13v4h4v16H5Zm4 4v8h13v-8Zm19-9h4v15h-4ZM12 5h12v3H12Z",
    harvest:
      "M6 13h4V9h16v4h4v13h-4v4H10v-4H6Zm5 2v9h3v3h9v-3h3v-9h-3v-3h-9v3Zm4 3h7v4h-7Z",
    packing:
      "M4 7h3v17h23V7h3v20H4Zm9-2h3v3h3v3h-3v3h-3v-3h-3V8h3Zm11 0h3v3h3v3h-3v3h-3v-3h-3V8h3Zm-11 11h3v3h3v3h-3v3h-3v-3h-3v-3h3Zm11 0h3v3h3v3h-3v3h-3v-3h-3v-3h3Z",
  });
  const color =
    type === "lift"
      ? "#e5b45e"
      : type === "chameleon"
        ? "#9acb82"
        : "currentColor";
  return `<svg class="skill-card-art" viewBox="0 0 40 40" aria-hidden="true" shape-rendering="crispEdges"><path fill="#071811" d="M5 0h30v4h4v32h-4v4H5v-4H1V4h4Z"/><path class="card-art-frame" d="M5 2h30v3h3v30h-3v3H5v-3H2V5h3Zm2 4v28h26V6Z" fill="currentColor"/><path fill="#243d31" d="M7 6h26v28H7Z"/><path fill="${color}" d="${glyphs[type]}" transform="translate(3 1) scale(.87)"/>${type === "packing" ? '<text x="20" y="32" fill="#edf2c2" font-family="monospace" font-size="6" font-weight="bold" text-anchor="middle">+25%</text>' : '<path fill="#edf2c2" d="M27 7h3v3h-3ZM9 29h3v3H9Z"/>'}</svg>`;
}
export function cardFace(
  card,
  { compact = false, slot = null, selected = false } = {},
) {
  if (!card)
    return `<article class="skill-card empty-card"><span class="card-slot-number">${slot === null ? "" : slot + 1}</span><div class="card-empty-art">+</div><h3>Empty slot</h3><p>Equip a flight reward</p></article>`;
  const uses =
    card.charges == null
      ? "While mounted"
      : `${amount(card.charges)} ${amount(card.charges) === 1 ? "use" : "uses"} left`;
  return `<article class="skill-card card-${rarity(card)} ${compact ? "compact-card" : ""} ${selected ? "card-selected" : ""}" data-card-instance="${esc(card.instanceId || "")}">${slot !== null ? `<span class="card-slot-number">${slot + 1}</span>` : ""}<div class="card-face-top">${cardArt(card)}<div><small class="card-rarity">${esc(rarity(card))}</small><h3>${esc(cardName(card))}</h3><span class="card-rank">Rank ${amount(card.rank) || 1}</span></div></div><p class="card-effect">${esc(cardSummary(card))}</p><div class="card-lifetime">${esc(uses)}${card.temporaryModifier ? ` · ${esc(card.temporaryModifier)}` : ""}</div>${card.copyPreview ? `<div class="card-compatibility">${esc(card.copyPreview)}</div>` : ""}</article>`;
}
export function starterCardsMarkup(run, gifts, existing) {
  return `<section class="card-starter"><header class="card-heading"><div><small>NEW EXPEDITION · THREE SLOTS</small><h2>Choose your first card</h2></div><button class="secondary" data-action="close-sheet">Back</button></header><div class="card-starter-pair">${gifts.map((gift) => `<button class="card-pick" data-action="${existing ? "existing-gift" : "new-gift"}" data-id="${esc(gift.id)}">${cardFace(gift.card || { ...gift, effect: gift.description, rarity: "common" })}<span class="card-pick-label">Equip free →</span></button>`).join("")}</div><footer class="card-footnote">One card mounted · two empty slots. Each cleared flight offers another card.</footer></section>`;
}
export function cardRewardMarkup(run, { replaceIndex = null } = {}) {
  const reward = getCardReward(run),
    card = reward?.card;
  if (!card) return "";
  const slots = getMountedCards(run),
    full = slots.filter(Boolean).length >= (run.cardSlots || 3),
    old = replaceIndex === null ? null : slots[replaceIndex];
  return `<section class="card-reward-screen"><header class="card-heading"><div><small>${reward.source === "forge" ? "FORGE COMPLETE" : `${run.lastFlight?.boss ? "GUARDIAN" : run.lastFlight?.elite ? "ELITE" : "FLIGHT"} CLEARED`}${flightPackingReceipt(run, reward)}</small><h1>A card for your journey</h1></div><span class="card-wallet">${resourceSymbol("packed")} ${amount(run.condensedGlow)}<small>Stored Sparks</small></span></header><div class="card-reward-body"><div class="card-reward-new">${cardFace(card)}<p class="card-footnote">Free to mount. Skills work while mounted.</p></div><div class="card-reward-choice">${full ? `<h2>Choose a slot to replace</h2><div class="card-replace-slots">${slots.map((c, i) => `<button class="card-replace-choice ${replaceIndex === i ? "selected" : ""}" data-action="card-select-replacement" data-index="${i}" aria-pressed="${replaceIndex === i}"><b>${i + 1}</b>${cardArt(c)}<span>${esc(cardName(c))}</span></button>`).join("")}</div>${old ? `<p class="card-loss-preview">Lose <b>${esc(cardName(old))}</b> · ${esc(cardSummary(old))}<br>${old.charges == null ? "While mounted" : `${amount(old.charges)} uses left`} · Melt return <b>+${amount(old.meltValue)} Stored Sparks</b></p>` : '<p class="card-footnote">Your slots are full. Preview the card and Melt value before replacing.</p>'}` : `<h2>Build your hand</h2><p class="card-footnote">${slots.filter(Boolean).length} / ${run.cardSlots || 3} mounted. Equip into the first empty slot.</p>`}<button class="primary" data-action="card-equip-reward" ${full && replaceIndex === null ? "disabled" : ""}>${full ? "Replace & Melt old card" : "Equip card"} →</button><button class="secondary card-melt-button" data-action="card-preview-reward-melt">Melt · +${amount(card.meltValue)} Stored Sparks</button></div></div><footer class="card-footnote">${run.flightReward && !run.flightReward.claimed ? "A separate relic choice follows. Relics stay passive." : "Reorder and improve your cards at the next checkpoint."}</footer></section>`;
}
export function cardsBenchMarkup(
  state,
  { selected = 0, locked = false, previewDirection = null } = {},
) {
  const run = state.run,
    cards = getMountedCards(run),
    card = cards[selected],
    preview = card ? getCardImprovePreview(run, selected) : null;
  let orderPreview = "";
  if (card && previewDirection !== null) {
    const target = selected + previewDirection;
    if (target >= 0 && target < cards.length) {
      const copy = structuredClone(run);
      [copy.mountedCards[selected], copy.mountedCards[target]] = [
        copy.mountedCards[target],
        copy.mountedCards[selected],
      ];
      const after = getMountedCards(copy),
        capacity = getGlowCapacity(copy),
        before = getGlowCapacity(run),
        oldPayout = bodyPickupPreview(run),
        newPayout = bodyPickupPreview(copy);
      orderPreview = `<div class="card-order-preview" role="status"><b>After moving ${previewDirection < 0 ? "left" : "right"}</b><span>${after
        .filter(Boolean)
        .map((c) => esc(cardName(c)))
        .join(" → ")}</span><p>${
        after
          .filter((c) => c?.copyPreview)
          .map((c) => esc(c.copyPreview))
          .join(" · ") || "No copy target changes."
      }</p><p>12-Spark direct pickup: ${oldPayout.total} → ${newPayout.total} to meter, with room. ${esc(newPayout.spent)}${capacity !== before ? ` · Maximum Sparks ${formatGlow(before)} → ${formatGlow(capacity)}. No refill.` : ""}</p><button class="primary" data-action="card-confirm-move" data-index="${selected}" data-to="${target}" ${locked ? "disabled" : ""}>Move ${previewDirection < 0 ? "left" : "right"}</button></div>`;
    }
  }
  return `<section class="card-bench"><header class="card-heading"><div><small>${locked ? "FLIGHT PAUSED · VIEW ONLY" : "CHECKPOINT · FREE TO REORDER"}</small><h2>Your Cards <span>${cards.filter(Boolean).length}/${run.cardSlots || 3}</span></h2></div><div class="card-bench-wallet">${resourceSymbol("packed")}<b>${amount(getSkillWallet(state).condensedGlow)}</b><small>Stored Sparks</small></div><button class="secondary card-close" data-action="close-sheet" aria-label="Close Cards">×</button></header><div class="card-bench-body"><div class="card-slot-row">${cards.map((c, i) => `<button class="card-slot-pick ${selected === i ? "selected" : ""}" data-action="card-select" data-index="${i}" aria-label="Slot ${i + 1}: ${c ? esc(cardName(c)) : "empty"}" aria-pressed="${selected === i}">${cardFace(c, { compact: true, slot: i, selected: selected === i })}</button>`).join("")}</div><div class="card-inspector">${card ? `<div class="card-inspector-copy"><h3>${esc(cardName(card))}</h3><p>${esc(printed(card))}</p><span>${card.copyPreview ? esc(card.copyPreview) : "Works while mounted. Removing it removes this ability."}</span></div><div class="card-edit-actions"><button class="secondary" data-action="card-preview-move" data-index="${selected}" data-direction="-1" ${locked || selected === 0 ? "disabled" : ""}>← Move left</button><button class="secondary" data-action="card-preview-move" data-index="${selected}" data-direction="1" ${locked || selected === cards.length - 1 ? "disabled" : ""}>Move right →</button><button class="primary" data-action="card-preview-improve" data-index="${selected}" ${locked || card.rank >= card.maxRank ? "disabled" : ""}>Improve · ${amount(preview?.price)} ${resourceSymbol("packed")}</button><button class="secondary" data-action="card-preview-melt" data-index="${selected}" ${locked || card.charges === 0 ? "disabled" : ""}>Melt · +${amount(card.meltValue)}</button></div>${!preview?.eligible ? `<p class="card-footnote">${esc(preview?.reason || "No further ranks.")}</p>` : ""}${orderPreview}` : `<div class="card-empty-detail">${cardArt({})}<h3>An open possibility</h3><p>Clear a flight, then Equip its card here.</p></div>`}</div></div><footer class="card-footnote">${locked ? "Equip, reorder and improve after flight." : "Charges belong to the real card. Reordering and improving never refill them."} · Forge only at Rest.</footer></section>`;
}
export function cardExchangeMarkup(
  card,
  {
    kind = "melt",
    preview = null,
    index = null,
    source = "mounted",
    wallet = 0,
  } = {},
) {
  const improve = kind === "improve";
  return `<section class="card-exchange"><header class="card-heading"><div><small>${improve ? "SPEND STORED SPARKS" : "DESTROY THIS CARD"}</small><h2>${improve ? "Improve" : "Melt"} ${esc(cardName(card))}?</h2></div></header><div class="card-exchange-body">${cardFace(card)}<div class="card-exchange-result">${improve ? `<b>Rank ${card.rank || 1} → ${preview.after?.rank || Number(card.rank || 1) + 1}</b><p>${esc(printed(preview.after))}</p><span>Charges stay at ${card.charges == null ? "run-long" : amount(card.charges)}.</span><strong>−${amount(preview.price)} Stored Sparks</strong><small>${preview.eligible ? `${amount(wallet)} → ${amount(wallet) - amount(preview.price)} in your wallet` : `Need ${Math.max(0, amount(preview.price) - amount(wallet))} more Stored Sparks`}</small>` : `${choiceScene("forge")}<p>Lose this ability and ${card.charges == null ? "its run-long effect" : `${amount(card.charges)} remaining uses`}.</p><strong>+${amount(card.meltValue)} Stored Sparks</strong><small>${amount(wallet)} → ${amount(wallet) + amount(card.meltValue)} in your wallet</small>`}</div></div><footer class="card-dialog-actions"><button class="secondary" data-action="${source === "reward" ? "card-back-reward" : "cards"}">Keep card</button><button class="primary" data-action="${improve ? "card-confirm-improve" : source === "reward" ? "card-confirm-reward-melt" : "card-confirm-melt"}" data-index="${index ?? ""}" data-rank="${card.rank || 1}" ${improve && !preview.eligible ? "disabled" : ""}>${improve ? `Improve for ${amount(preview.price)}` : `Melt for +${amount(card.meltValue)}`} →</button></footer></section>`;
}
export function cardRestMarkup(run, node, choices) {
  const camp = run.cardRest || {},
    done = camp.actions || [],
    used = done.length;
  const eligible = choices.map((c, index) => ({ ...c, index }));
  const actions = eligible.filter(
    (c) => !c.effect?.restContinue && c.effect?.cardForge !== "legendary",
  );
  const leave = eligible.find((c) => c.effect?.restContinue);
  const forge = getCardForgePreview(run);
  const title =
    camp.extraSourceId && !camp.closed
      ? used
        ? "One different action remains"
        : "Two different actions available"
      : used
        ? "Camp action complete"
        : "Choose one action";
  return `<section class="card-rest-screen"><aside class="card-rest-rail">${mapStopIconMarkup(node)}<small>REST · MAP ${run.mapIndex + 1}/3</small><h1>${esc(node.name)}</h1><div class="card-rest-vitals">${livesMarkup(run)}<span>${resourceSymbol("glow")}${formatGlow(run.flame)}/${formatGlow(getGlowCapacity(run))}</span></div><button class="secondary" data-action="cards">Cards · reorder / improve</button><p>${esc(title)}</p>${used ? `<span class="card-camp-receipt">✓ ${done.map((action) => esc({ recover: "Recover", slot: "Add slot", forge: "Forge", grow: "Grow" }[action] || action)).join(" + ")}</span>` : ""}</aside><div class="card-camp-main"><header class="card-heading"><div><small>${used ? "PREPARE OR CONTINUE" : "REST ACTIONS"}</small><h2>${esc(title)}</h2></div></header>${
    actions.length
      ? `<div class="card-camp-choices">${actions
          .map((c) => {
            const kind = c.effect.rest || "",
              grow = kind === "grow",
              slot = kind === "slot",
              forging = kind === "forge",
              art = forging
                ? "forge"
                : grow
                  ? "refillGlow"
                  : slot
                    ? "skills"
                    : "hearts";
            const description = forging
              ? "Rare 30 · Legendary 60. Preview the exact card."
              : c.disabled
                ? c.disabledReason
                : grow
                  ? "+3 maximum Sparks + full refill. No hearts."
                  : slot
                    ? "One empty slot. No refill. Once per map."
                    : "All hearts + full Spark Meter.";
            return `<button class="card-camp-choice ${c.disabled ? "unavailable" : ""}" data-action="${forging ? "card-preview-forge" : "support"}" data-index="${c.index}" ${c.disabled && !forging ? "disabled" : ""}>${choiceScene(art)}<h3>${forging ? "Forge" : esc(c.title)}</h3><p>${esc(description)}</p>${forging && forge?.card ? `<span class="card-forge-name">${esc(cardName(forge.card))} · Rare</span>` : ""}<span class="card-camp-action-cost">${forging ? "Wallet + " : ""}1 camp action</span></button>`;
          })
          .join("")}</div>`
      : `<div class="card-camp-finished">${choiceScene("refillGlow")}<h3>Ready for the next passage</h3><p>Reorder or improve Cards, then choose your route.</p></div>`
  }<footer class="card-camp-footer"><p>${camp.extraSourceId && !camp.closed ? "Second Ember spends its charge only after a successful second, different action." : used ? "Stored Sparks and your chosen changes are saved." : "Add slot and Forge restore no hearts or Sparks."}</p>${leave ? `<button class="primary" data-action="support" data-index="${leave.index}">Leave Rest →</button>` : '<button class="primary" data-action="view-route">Choose next route →</button>'}</footer></div></section>`;
}
export function cardForgeMarkup(run, preview, index) {
  const rareIndex = index - (preview.rarity === "legendary" ? 1 : 0),
    legendary = preview.rarity === "legendary";
  return `<section class="card-forge-preview"><header class="card-heading"><div><small>EXACT RESULT · FIXED FOR THIS REST</small><h2>Forge ${esc(cardName(preview.card))}</h2></div><nav class="card-forge-tiers" aria-label="Forge rarity"><button class="secondary ${!legendary ? "selected" : ""}" data-action="card-preview-forge" data-index="${rareIndex}">Rare · 30</button><button class="secondary ${legendary ? "selected" : ""}" data-action="card-preview-forge" data-index="${rareIndex + 1}">Legendary · 60</button></nav></header><div class="card-exchange-body">${cardFace(preview.card)}<div class="card-exchange-result">${choiceScene("forge")}<strong>−${amount(preview.price)} Stored Sparks</strong><p>Uses one camp action. No refill or healing.</p><span>${esc(preview.reason || "Choose Equip or Melt after forging.")}</span></div></div><footer class="card-dialog-actions"><button class="secondary" data-action="close-sheet">Back</button><button class="primary" data-action="card-confirm-forge" data-index="${index}" ${!preview.eligible ? "disabled" : ""}>Forge · ${amount(preview.price)} + 1 action →</button></footer></section>`;
}
export function cardVictoryRecap(run) {
  const reward = getCardReward(run),
    trophy =
      reward?.card ||
      run.finalCardReward?.card ||
      run.finalCardTrophy;
  return `<section class="card-victory-recap"><header class="card-heading"><div><small>THREE GUARDIANS · RUN COMPLETE${flightPackingReceipt(run, reward)}</small><h1>The light returns</h1></div></header><div class="card-winning-hand"><div><h2>Your winning hand</h2><div class="card-recap-row">${getMountedCards(
    run,
  )
    .filter(Boolean)
    .map((c) => cardFace(c, { compact: true }))
    .join(
      "",
    )}</div></div>${trophy ? `<aside><h2>Final trophy</h2>${cardFace(trophy, { compact: true })}<p>A record of this victory.</p></aside>` : ""}</div><p class="card-footnote">Ascension ${run.difficulty} conquered. Cards and Stored Sparks belong to this completed run.</p><footer class="card-dialog-actions"><button class="secondary" data-action="artifacts">Relic almanac</button><button class="primary" data-action="exit-menu">Main menu →</button></footer></section>`;
}
