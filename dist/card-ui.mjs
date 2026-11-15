import { skillPortrait } from "./skill-art.mjs?v=skills-cards-2";
import { pickupArtSvg } from "./pickup-art.mjs?v=skills-cards-2";
import { cardArt } from "./card-art.mjs?v=skills-cards-2";
import {
  getMountedCards,
  getCardReward,
  getCardImprovePreview,
  getCardForgePreview,
  getSkillWallet,
} from "./model.mjs?v=skills-cards-2";
import { resourceSymbol } from "./game-symbols.mjs?v=skills-cards-2";
import { choiceScene } from "./choice-art.mjs?v=skills-cards-2";
import { livesMarkup } from "./lives.mjs?v=skills-cards-2";
import { getGlowCapacity, formatGlow } from "./vitality.mjs?v=skills-cards-2";
import { mapStopIconMarkup } from "./map-guide.mjs?v=skills-cards-2";
import {
  createCardExecution,
  executeCardBodyPickup,
} from "./skill-cards.mjs?v=skills-cards-2";

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
    body: `Touch a natural Spark: +${card?.amount || 0} extra Sparks. This bonus cannot be packed.`,
    capacity: `+${card?.amount || 0} maximum Sparks while mounted. No refill.`,
    packing: "Pack 25% more Stored Sparks. Every 4 you pack earns 1 extra.",
    echo: "Repeat the compatible action in the next slot →. Share its remaining uses.",
    chameleon: "Borrow the compatible ability in the next slot →. Share its remaining uses.",
    field: "Swipe to spend Collector’s recovering ring. Cannot be copied.",
    guide:
      "Amber chevron: a good manual Lift window. Advice, not automatic flight.",
    rhythm: "Three evenly spaced manual Lifts release one Luminance wave.",
    harvest: `Wave crosses a natural Spark: +${card?.amount || 0} to meter.${card?.rarity === "legendary" ? " First crossing: +1 Stored Spark per wave." : ""}`,
    "camp-extra":
      "Take 2 different actions at one Rest. Spent when the second action succeeds.",
    "camp-grow": "Unlock Grow at Rest: +3 maximum Sparks and a full refill. No healing. Up to 3 times per run.",
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
export { cardArt } from "./card-art.mjs?v=skills-cards-2";
export function effectMarkup(text) {
  return esc(text).replace(/([+−]?\d+(?:\.\d+)?%?)/g, '<b class="card-number">$1</b>');
}
function mechanicIcon(kind) {
  if (kind === 'swipe') return '<span class="card-mechanic-icon"><svg class="resource-symbol" viewBox="0 0 24 24" role="img" aria-label="Swipe up, down or right" shape-rendering="crispEdges"><path fill="#96c7ae" d="M4 6h2V4h2V2h2v2h2v2h2v2h-4v4H6V8H2V6ZM6 12h4v4h4v2h-2v2h-2v2H8v-2H6v-2H4v-2h2ZM10 10h6V6h2v2h2v2h2v4h-2v2h-2v2h-2v-4h-6Z"/><path fill="#e8f0c5" d="M8 4h2v6H8ZM18 10h2v4h-2ZM8 16h2v4H8Z"/></svg></span>';

  if (kind === 'wave') return `<span class="card-mechanic-icon" role="img" aria-label="Luminance wave">${skillPortrait({ id: 'main-resonant-harvest' })}</span>`;
  if (kind === 'flash' || kind === 'cache') return `<span class="card-mechanic-icon">${pickupArtSvg(kind)}</span>`;
  return `<span class="card-mechanic-icon">${resourceSymbol(kind)}</span>`;
}
export function cardMechanicMarkup(card, { details = false } = {}) {
  const spark = mechanicIcon('energy'), packed = mechanicIcon('packed'), wave = mechanicIcon('wave');
  let main = '', note = '';
  switch (card?.kind) {
    case 'body': main = `Direct pickup <b>+${card.amount}</b> ${spark}`; note = 'Natural Sparks · no packing'; break;
    case 'capacity': main = `<b>+${card.amount}</b> ${spark} capacity`; note = 'No refill'; break;
    case 'packing': main = `Pack <b>+25%</b> ${packed}`; note = '4 packed → +1 extra'; break;
    case 'echo': case 'chameleon':
      main = `${mechanicIcon('auto')} ${card.kind === 'echo' ? 'Repeat' : 'Borrow'} next card →`;
      note = card.copyPreview ? esc(card.copyPreview.replace(/^(Repeats|Borrows) /, 'Next: ').replace('shared charges', 'shared uses')).replace(/Sparks/g, spark) : 'Compatible cards · shared uses';
      break;
    case 'field': main = `${mechanicIcon('swipe')} Swipe: Collector burst`; note = 'Spends recovery ring'; break;
    case 'guide': main = `${mechanicIcon('up')} Amber mark = Lift window`; note = 'You choose when to Lift'; break;
    case 'rhythm': main = `<b>3</b> even ${mechanicIcon('up')} Lifts → ${wave}`; break;
    case 'harvest': main = `${wave} Wave: <b>+${card.amount}</b> ${spark}`; note = `Per crossed natural Spark${card.rarity === 'legendary' ? ` · first: +1 ${packed} / wave` : ''}`; break;
    case 'camp-extra': main = `<b>2</b> different Rest actions`; break;
    case 'camp-grow': main = `Grow: <b>+3</b> ${spark} + refill`; note = 'At Rest · 3 per run · no healing'; break;
    case 'cache-handling': main = `Collector fetches ${mechanicIcon('cache')} Caches`; note = `12 ${spark} + ring refill`; break;
    case 'flash-handling': main = `Collector fetches ${mechanicIcon('flash')} Flash`; note = `Flash pickup: up to +6 ${spark}`; break;
    default: main = effectMarkup(cardSummary(card));
  }
  return `<span class="card-mechanics" title="${esc(printed(card))}" aria-label="${esc(printed(card))}"><span class="card-mechanic-main">${main}</span>${note || card?.charges != null ? `<span class="card-mechanic-detail">${note ? `<span class="card-mechanic-note">${note.includes('<span') ? note : esc(note)}</span>` : ''}${card?.charges != null ? `<span class="card-mechanic-uses">${mechanicIcon('uses')} <b>${amount(card.charges)}</b> uses</span>` : ''}</span>` : ''}</span>${details ? `<details class="card-rules"><summary>Details</summary><p>${esc(printed(card))}</p></details>` : ''}`;
}
const lifetime = (card) => card.charges == null ? 'While mounted' : `${amount(card.charges)} ${amount(card.charges) === 1 ? 'use' : 'uses'} left`;
const walletMarkup = (wallet) => `<span class="card-bench-wallet">${resourceSymbol('packed')}<b>${amount(wallet)}</b><small>Stored Sparks</small></span>`;
function slotMarkup(card, i, { selected = false, action = 'card-select', empty = 'Empty slot' } = {}) {
  return `<button class="card-slot-pick ${selected ? 'selected' : ''} ${!card ? 'empty-slot' : ''}" data-action="${action}" data-index="${i}" aria-pressed="${selected}" aria-label="Slot ${i + 1}: ${card ? esc(cardName(card)) : esc(empty)}"><b class="card-slot-number">${i + 1}</b>${card ? cardArt(card, { compact: true }) : '<span class="card-slot-open">+</span>'}<span class="card-slot-copy"><strong>${card ? esc(cardName(card)) : esc(empty)}</strong><small>${card ? `${card.charges == null ? card.maxRank > 1 ? `Rank ${card.rank || 1}` : lifetime(card) : lifetime(card)}` : 'Ready for a card'}</small></span></button>`;
}
export function cardFace(card, { compact = false, slot = null, selected = false } = {}) {
  if (!card) return `<article class="skill-card empty-card"><div class="card-empty-art">+</div><h3>Empty slot${slot === null ? '' : ` ${slot + 1}`}</h3></article>`;
  return `<article class="skill-card card-${rarity(card)} ${compact ? 'compact-card' : ''} ${selected ? 'card-selected' : ''}" data-card-instance="${esc(card.instanceId || '')}" aria-label="${esc(cardName(card))}, ${esc(rarity(card))}${card.maxRank > 1 ? `, rank ${card.rank || 1}` : ''}"><div class="card-illustration">${cardArt(card, { compact })}</div><div class="card-face-copy"><h3>${esc(cardName(card))}</h3><small class="card-rarity">${esc(rarity(card))}${card.maxRank > 1 ? ` · ${card.rank || 1}/${card.maxRank}` : ''}</small></div></article>`;
}
export function starterCardsMarkup(run, gifts, existing) {
  return `<section class="card-starter"><header class="card-heading"><div><h2>Choose your first card</h2></div><button class="secondary" data-action="close-sheet">Back</button></header><div class="card-starter-pair">${gifts.map(gift => { const card = gift.card || { ...gift, effect: gift.description, rarity: 'common' }; return `<button class="card-pick" data-action="${existing ? 'existing-gift' : 'new-gift'}" data-id="${esc(gift.id)}">${cardFace(card)}<span class="card-pick-copy">${cardMechanicMarkup(card)}<span class="card-pick-label">Mount card →</span></span></button>`; }).join('')}</div></section>`;
}
export function cardRewardMarkup(run, { replaceIndex = null } = {}) {
  const reward = getCardReward(run), card = reward?.card;
  if (!card) return '';
  const cards = getMountedCards(run), full = cards.every(Boolean), old = replaceIndex === null ? null : cards[replaceIndex], empty = cards.findIndex(c => !c);
  return `<section class="card-reward-screen"><header class="card-heading"><div><small>${reward.source === 'forge' ? 'FORGED AT REST' : 'FLIGHT REWARD'}${flightPackingReceipt(run, reward)}</small><h1>A new card</h1></div>${walletMarkup(run.condensedGlow)}<button class="secondary" data-action="cards">Your hand</button><button class="secondary" data-action="menu">Menu</button></header><div class="card-reward-body"><div class="card-reward-new">${cardFace(card)}<div class="card-reward-description">${cardMechanicMarkup(card)}</div></div><div class="card-reward-choice"><h2>${full ? 'Choose a card to replace' : `Mount in open slot ${empty + 1}`}</h2><div class="card-slot-row card-replace-slots" aria-label="Your mounted cards">${cards.map((c, i) => slotMarkup(c, i, { selected: replaceIndex === i, action: full ? 'card-select-replacement' : 'card-inspect-reward-slot' })).join('')}</div>${full ? old ? `<div class="card-loss-preview"><span>LOSE FROM SLOT ${replaceIndex + 1}</span>${cardMechanicMarkup(old)}<small>Melt <b>+${amount(old.meltValue)}</b> ${resourceSymbol('packed')}</small></div>` : '<p class="card-reward-prompt">Your hand is full. Tap a mounted card to compare.</p>' : `<p class="card-reward-prompt">Other cards stay mounted.</p>`}<div class="card-reward-actions"><button class="primary" data-action="${full ? 'card-preview-replace' : 'card-equip-reward'}" ${full && !old ? 'disabled' : ''}>${full ? `Replace ${old ? esc(cardName(old)) : 'a card'}…` : `Mount in slot ${empty + 1} →`}</button><button class="secondary card-danger" data-action="card-preview-reward-melt">Melt incoming · +${amount(card.meltValue)}</button></div></div></div><footer class="card-footnote">${run.flightReward && !run.flightReward.claimed ? 'Your relic choice follows.' : ''}</footer></section>`;
}
export function cardReplacementMarkup(run, index) {
  const incoming = getCardReward(run)?.card, old = getMountedCards(run)[index];
  if (!incoming || !old) return '';
  return `<section class="card-exchange card-replacement-confirm"><header class="card-heading"><div><small>REPLACE · SLOT ${index + 1}</small><h2>Make room for ${esc(cardName(incoming))}?</h2></div></header><div class="card-exchange-body"><div class="card-outgoing">${cardFace(old, { showEffect: false })}<span class="card-exchange-tag">${old.charges == null ? 'OUT · MELTED' : `OUT · ${amount(old.charges)} USES LOST`} · +${amount(old.meltValue)}</span></div><div class="card-incoming">${cardFace(incoming, { showEffect: false })}<span class="card-exchange-tag">IN · MOUNTED IN SLOT ${index + 1}</span></div></div><footer class="card-dialog-actions"><p>Lose ${esc(cardName(old))} and its ability. +${amount(old.meltValue)} Stored Sparks.</p><button class="secondary" data-action="card-back-reward">Back to compare</button><button class="primary card-danger" data-action="card-confirm-replace">Replace & Melt old card</button></footer></section>`;
}
export function cardsBenchMarkup(state, { selected = 0, locked = false, previewDirection = null, demo = false } = {}) {
  const run = state.run, cards = getMountedCards(run), card = cards[selected], preview = card ? getCardImprovePreview(run, selected) : null;
  let orderPreview = '';
  if (card && previewDirection !== null) {
    const target = selected + previewDirection;
    if (target >= 0 && target < cards.length) {
      const copy = structuredClone(run);
      [copy.mountedCards[selected], copy.mountedCards[target]] = [copy.mountedCards[target], copy.mountedCards[selected]];
      const after = getMountedCards(copy), capacity = getGlowCapacity(copy), before = getGlowCapacity(run), oldPayout = bodyPickupPreview(run), newPayout = bodyPickupPreview(copy);
      orderPreview = `<div class="card-order-preview" role="status"><h3>Move slot ${selected + 1} → ${target + 1}</h3><p>${after.filter(c => c?.copyPreview).map(c => `<b>${esc(cardName(c))}:</b> ${esc(c.copyPreview).replace(/Sparks/g, resourceSymbol('energy')).replace('shared charges', 'shared uses')}`).join(' · ') || 'No copy partners in this hand.'}</p><p>${resourceSymbol('energy')} Pickup 12: <b class="card-number">${oldPayout.total} → ${newPayout.total}</b> ${resourceSymbol('energy')}${capacity !== before ? ` · Capacity ${formatGlow(before)} → ${formatGlow(capacity)}` : ''}.</p><div class="card-order-actions"><button class="secondary" data-action="card-cancel-move">Cancel move</button><button class="primary" data-action="card-confirm-move" data-index="${selected}" data-to="${target}" ${locked ? 'disabled' : ''}>Move to slot ${target + 1} →</button></div></div>`;
    }
  }
  return `<section class="card-bench"><header class="card-heading"><div><small>${locked ? 'FLIGHT PAUSED · INSPECT' : demo ? 'SAMPLE HAND · CHANGES RESET ON RELOAD' : 'CHECKPOINT · YOUR MOUNTED HAND'}</small><h2>Cards <span>${cards.filter(Boolean).length}/${run.cardSlots || 3}</span></h2></div>${demo ? `<button class="secondary card-demo-reward" data-action="card-demo-reward">Try a new reward →</button>` : ''}${walletMarkup(getSkillWallet(state).condensedGlow)}<button class="secondary card-close" data-action="close-sheet">Done</button></header><div class="card-slot-row" aria-label="Mounted cards, from left to right">${cards.map((c, i) => slotMarkup(c, i, { selected: selected === i })).join('')}</div><div class="card-bench-body">${card ? `<div class="card-selected-face">${cardFace(card, { showEffect: false })}</div><div class="card-inspector">${orderPreview || `<div class="card-inspector-copy">${cardMechanicMarkup(card, { details: true })}</div><div class="card-edit-actions"><button class="secondary" data-action="card-preview-move" data-index="${selected}" data-direction="-1" ${locked || selected === 0 ? 'disabled' : ''}>← Move left</button><button class="secondary" data-action="card-preview-move" data-index="${selected}" data-direction="1" ${locked || selected === cards.length - 1 ? 'disabled' : ''}>Move right →</button>${card.maxRank > 1 ? `<button class="primary" data-action="card-preview-improve" data-index="${selected}" ${locked || card.rank >= card.maxRank ? 'disabled' : ''}>${card.rank >= card.maxRank ? 'Fully improved' : `Improve · ${amount(preview?.price)}`}</button>` : ''}<button class="secondary card-danger" data-action="card-preview-melt" data-index="${selected}" ${locked || card.charges === 0 ? 'disabled' : ''}>Melt card · +${amount(card.meltValue)}</button></div>${preview?.reason && card.rank < card.maxRank ? `<p class="card-footnote">${esc(preview.reason)}</p>` : ''}`}</div>` : `<div class="card-empty-detail"><span class="card-empty-art">+</span><h3>Slot ${selected + 1} is open</h3><p>Your next flight reward can be mounted here.</p></div>`}</div><footer class="card-footnote">${locked ? 'Changes become available at the next checkpoint.' : 'Moves and improvements keep remaining uses.'}</footer></section>`;
}
export function cardExchangeMarkup(card, { kind = 'melt', preview = null, index = null, source = 'mounted', wallet = 0 } = {}) {
  const improve = kind === 'improve';
  return `<section class="card-exchange ${improve ? 'card-improve-confirm' : 'card-melt-confirm'}"><header class="card-heading"><div><small>${improve ? 'IMPROVE A MOUNTED CARD' : 'PERMANENTLY DESTROY THIS CARD'}</small><h2>${improve ? 'Improve' : 'Melt'} ${esc(cardName(card))}?</h2></div>${walletMarkup(wallet)}</header><div class="card-exchange-body">${cardFace(card)}<div class="card-exchange-result">${improve ? `<h3>Rank ${card.rank || 1} → ${preview.after?.rank || Number(card.rank || 1) + 1}</h3>${cardMechanicMarkup(preview.after)}<p class="card-kept-uses">Remaining uses unchanged</p><strong>−${amount(preview.price)} Stored Sparks</strong><small>${preview.eligible ? `Wallet ${amount(wallet)} → ${amount(wallet) - amount(preview.price)}` : esc(preview.reason || `Need ${Math.max(0, amount(preview.price) - amount(wallet))} more Stored Sparks`)}</small>` : `<div class="card-melt-art">${choiceScene('forge')}</div><h3>Destroy this card</h3><p>${card.charges == null ? 'Its ability ends.' : `${amount(card.charges)} remaining uses will be lost.`}</p><strong>+${amount(card.meltValue)} Stored Sparks</strong><small>Wallet ${amount(wallet)} → ${amount(wallet) + amount(card.meltValue)}</small>`}</div></div><footer class="card-dialog-actions"><button class="secondary" data-action="${source === 'reward' ? 'card-back-reward' : 'cards'}">${improve ? 'Back to card' : 'Keep card'}</button><button class="primary ${improve ? '' : 'card-danger'}" data-action="${improve ? 'card-confirm-improve' : source === 'reward' ? 'card-confirm-reward-melt' : 'card-confirm-melt'}" data-index="${index ?? ''}" data-rank="${card.rank || 1}" ${improve && !preview.eligible ? 'disabled' : ''}>${improve ? `Improve for ${amount(preview.price)}` : `Melt card for +${amount(card.meltValue)}`} →</button></footer></section>`;
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
  return `<section class="card-forge-preview"><header class="card-heading"><div><small>EXACT RESULT · FIXED FOR THIS REST</small><h2>Forge ${esc(cardName(preview.card))}</h2></div><nav class="card-forge-tiers" aria-label="Forge rarity"><button class="secondary ${!legendary ? "selected" : ""}" data-action="card-preview-forge" data-index="${rareIndex}">Rare · 30</button><button class="secondary ${legendary ? "selected" : ""}" data-action="card-preview-forge" data-index="${rareIndex + 1}">Legendary · 60</button></nav></header><div class="card-exchange-body">${cardFace(preview.card)}<div class="card-exchange-result">${cardMechanicMarkup(preview.card)}<strong>−${amount(preview.price)} Stored Sparks</strong><p>Uses one camp action. No refill or healing.</p><span>${esc(preview.reason || "Choose Equip or Melt after forging.")}</span></div></div><footer class="card-dialog-actions"><button class="secondary" data-action="close-sheet">Back</button><button class="primary" data-action="card-confirm-forge" data-index="${index}" ${!preview.eligible ? "disabled" : ""}>Forge · ${amount(preview.price)} + 1 action →</button></footer></section>`;
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
