import { flightDevoured, devouredLine } from "./devour-notes.mjs?v=record-1";
import { wispChipText } from "./start-bonus.mjs?v=record-1";
import { cardTermTextMarkup, cardTermMarkup } from "./card-terms.mjs?v=record-1";
import { faceTrigger, faceEffect, faceFinePrint } from "./card-face-lines.mjs?v=record-1";
import { uiIcon } from "./ui-icons.mjs?v=record-1";
import { getCardRuleBands, getCardTrigger } from "./card-rule-bands.mjs?v=record-1";
import { chipBadge, chipIcon, rarityPips } from "./ui/trigger-icons.mjs?v=record-1";
import { devourTally, isDevourCard } from "./card-black-hole.mjs?v=record-1";
import { getEquippedCardStatuses, cardStatusText } from "./card-status.mjs?v=record-1";
import { activeFlightPact } from './flight-pacts.mjs?v=record-1';
import { cardArt } from "./card-art.mjs?v=record-1";
import { cardTileLine } from "./card-tile-lines.mjs?v=record-1";
import { slotInscriptionId } from "./inscriptions.mjs?v=record-1";
import { inscriptionGlyph } from "./inscription-glyphs.mjs?v=record-1";
import {deckRelicShelfMarkup,deckContextMarkup,deckLinkedCardFace,deckSwapComboMarkup,deckCardExplanationMarkup} from './deck-combos.mjs?v=record-1';
import {
  getMountedCards,
  getOwnedCards,
  getCardMeltPreview,
  getCardReward,
  getCardDraft,
  getCardImprovePreview,
  getCardForgePreview,
  getCardRefillPreview,
  getCardForgePrice,
  getCardCampPreview,
  getChoices,
  canUseCardCampServices,
  getSkillWallet,
  equipOwnedCard,
  canRerollCardDraft,
} from "./model.mjs?v=record-1";
import { resourceSymbol } from "./game-symbols.mjs?v=record-1";
import { choiceScene } from "./choice-art.mjs?v=record-1";
import { livesMarkup } from "./lives.mjs?v=record-1";
import { getGlowCapacity, getLifeCapacity, formatGlow } from "./vitality.mjs?v=record-1";
import { mapStopIconMarkup } from "./map-guide.mjs?v=record-1";
import {canDreamAt, dreamConfig} from './dream.mjs?v=record-1';
import {
  getEffectiveCardSources,
  createCardExecution,
  executeCardBodyPickup,
  describeSkillCard,
  makeSkillCard,
  getCardGrowthUses,
  getCardChargeCapacity,
  getCardFeederCapacity,
  isInventoryOnlyCard,
  SKILL_CARDS,
  cardTallyLine,
  cardAmount,
} from "./skill-cards.mjs?v=record-1";

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
export function flightCardChangesMarkup(run){
  const flight=run?.lastFlight;if(!flight)return '';
  const fed=flight.emberFeederSacrifices||[],doubled=flight.cardUseDoublings||[],eaten=flightDevoured(flight);
  if(!fed.length&&!doubled.length&&!eaten.length)return '';
  return `<details class="card-flight-changes"><summary>Card changes this flight · ${fed.length+doubled.length+(eaten.length?1:0)}</summary>${eaten.length?`<p><strong>${esc(devouredLine(eaten))}.</strong> Gone for good.</p>`:''}${doubled.map(change=>`<p><strong>Use Doubler consumed.</strong> ${esc(change.name)} · ${change.before} → ${change.after} remaining uses.</p>`).join('')}${fed.map(change=>`<p><strong>Ember Feeder · +${amount(change.totalCapacity)} maximum Sparks while equipped.</strong> Permanently consumed ${change.targets.map(target=>`${esc(target.name)} (slot ${target.slot+1})`).join(' and ')}. No meter refill.</p>`).join('')}</details>`;
}
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
export { cardArt } from "./card-art.mjs?v=record-1";
export function effectMarkup(text) {
  return esc(text).replace(/([+−]?\d+(?:\.\d+)?%?)/g, '<b class="card-number">$1</b>');
}
const cardTerms = card => {
  const bands = getCardRuleBands(card, SKILL_CARDS[card?.cardId || card?.id]);
  const markup = bands.map(item => cardTermTextMarkup(item.text)).join('');
  return [...new Set([...markup.matchAll(/data-card-term="([^"]+)"/g)].map(match => match[1]))];
};
export function cardMechanicMarkup(card, { details = false } = {}) {
  // Two lines, never more (card-face-lines.mjs): the Trigger as one word with its icon, then the effect in a few words.
  const def = SKILL_CARDS[card?.cardId || card?.id];
  const trigger = faceTrigger(card, def), effect = faceEffect(card, def);
  const icon = chipIcon(trigger.iconId === 'timers' ? 'engine-any' : trigger.iconId, 16);
  const main = `<span class="card-rule-stripe card-rule-condition" data-rule-type="condition"><span class="card-rule-text"><i class="card-trigger-icon" aria-hidden="true">${icon}</i>${cardTermMarkup(trigger.term, trigger.word, { icon: false })}</span></span>`
    + `<span class="card-rule-stripe card-rule-effect" data-rule-type="effect"><span class="card-rule-text">${cardTermTextMarkup(effect)}</span></span>`;
  return `<span class="card-mechanics"><span class="card-mechanic-main">${main}</span></span>${details ? `<details class="card-rules"><summary>Details</summary><p>${esc(printed(card))}</p></details>` : ''}`;
}
/** The "?" window's rules: the printed text plus the caps and fine print the face leaves out. */
const cardHelpDescription = card => {
  const text = printed(card), extra = faceFinePrint(card, SKILL_CARDS[card?.cardId || card?.id]).filter(note => !text.includes(note));
  return [text, ...extra.map(note => `${note}.`)].join(' ');
};
const lifetime = (card) => card.charges == null ? 'While equipped' : `${amount(card.charges)} ${amount(card.charges) === 1 ? 'use' : 'uses'} left`;
const walletMarkup = (wallet) => `<span class="card-bench-wallet">${resourceSymbol('packed')}<b>${amount(wallet)}</b><small>Stored Sparks</small></span>`;
function slotMarkup(card, i, { selected = false, action = 'card-select', empty = 'Empty slot' } = {}) {
  return `<button class="card-slot-pick ${selected ? 'selected' : ''} ${!card ? 'empty-slot' : ''}" data-action="${action}" data-index="${i}" aria-pressed="${selected}" aria-label="Slot ${i + 1}: ${card ? esc(cardName(card)) : esc(empty)}"><b class="card-slot-number">${i + 1}</b>${card ? cardArt(card, { compact: true }) : '<span class="card-slot-open">+</span>'}<span class="card-slot-copy"><strong>${card ? esc(cardName(card)) : esc(empty)}</strong><small>${card ? `${card.charges == null ? card.maxRank > 1 ? `Rank ${card.rank || 1}` : lifetime(card) : lifetime(card)}` : 'Ready for a card'}</small></span></button>`;
}
function rarityInlay(card) {
  // Carved caps belong to the frame, leaving the illustration unobscured.
  if (rarity(card) === 'legendary') return '<span class="card-rarity-inlay card-inlay-jewels" aria-hidden="true"><i></i><i></i><i></i></span>';
  if (rarity(card) === 'rare') return '<span class="card-rarity-inlay card-inlay-gold" aria-hidden="true"><i></i></span>';
  return '';
}
export function cardStatusMarkup(status, { compact = false, slot = null } = {}) {
  if (!status) return '';
  const content = `${Number.isInteger(slot) ? `<b class="card-config-slot" aria-hidden="true">${slot + 1}</b>` : ''}<span class="card-config-symbol" aria-hidden="true">${esc(status.symbol)}</span>${compact ? '' : `<span class="card-config-label">${esc(status.label)}</span>`}`;
  const label = esc(`${Number.isInteger(slot) ? `Slot ${slot + 1}, ` : ''}${cardStatusText(status)}`);
  return compact ? `<span class="card-config-status card-config-${status.state} card-config-compact" role="img" aria-label="${label}" title="${label}">${content}</span>` : `<button type="button" class="card-config-status card-config-${status.state}" data-card-status-help data-card-status-title="${esc(status.label)}" data-card-status-description="${esc(status.reason)}" data-card-status-fix="${esc(status.fix)}" aria-haspopup="dialog" aria-label="${label} Open status help.">${content}</button>`;
}
const cardPulseKinds = new Set(['rhythm','wave-loom','proximity','proximity-range','prism-wick','spillway','watchlight']);
function closedEyeCardWarning(def) {
  if(def?.kind==='luminance')return 'Luminance blocked by The Closed Eye';
  if(cardPulseKinds.has(def?.kind)||def?.id==='climb')return 'Pulse light blocked by The Closed Eye. Spark crossings still work.';
  return '';
}
/** Presentation state shared by the live Deck and future card renderers.
 * `blocked` means no usable effect; `partial` keeps the card's other effects visible.
 * This never changes execution, ownership, uses, or whether the card can be moved.
 */
export function getCardFaceAvailability(run, card, status = null) {
  if (!card) return { state: 'active', reason: '', sightWarning: '', status: null };
  const context = run || {};
  const mounted = Array.isArray(context) ? context : context.mountedCards || context.cards || [];
  const hasIdentity = card.instanceId != null && card.instanceId !== '';
  const slot = hasIdentity ? mounted.findIndex(entry => entry?.instanceId === card.instanceId) : -1;
  status ??= slot >= 0 ? getEquippedCardStatuses(context)[slot] : null;
  const effective = hasIdentity ? getEffectiveCardSources(context).find(source => source.card.instanceId === card.instanceId) : null;
  const def = effective?.def || SKILL_CARDS[card.cardId || card.id];
  const sightWarning = activeFlightPact(context)?.id === 'blind-pilgrim' ? closedEyeCardWarning(def) : '';
  // Ember Feeder still contributes its accumulated capacity without two targets.
  const partlyConfigured = status?.code === 'needs-two-right' && getCardFeederCapacity(card) > 0;
  const state = status?.state === 'blocked' && !partlyConfigured || sightWarning && def?.kind === 'luminance'
    ? 'blocked' : sightWarning || partlyConfigured ? 'partial' : 'active';
  let presentedStatus = status;
  if (status && sightWarning) {
    if (status.state === 'blocked') {
      // Keep actionable placement help, while also explaining the current pact.
      presentedStatus = status.reason.includes(sightWarning) ? status : { ...status, reason: `${status.reason} ${sightWarning}` };
    } else {
      const full = state === 'blocked';
      presentedStatus = {
        state: full ? 'blocked' : 'partial', symbol: full ? '×' : '≈',
        label: full ? 'Luminance blocked' : 'Light blocked', code: full ? 'closed-eye-luminance' : 'closed-eye-light',
        reason: sightWarning + (status.state === 'shared' ? ` ${status.reason}` : ''),
        fix: 'The Closed Eye lasts for this flight attempt. Changing slots does not restore card light.',
      };
    }
  }
  return { state, reason: state !== 'active' ? presentedStatus?.reason || sightWarning : '', sightWarning, status: presentedStatus };
}
/** The Trigger badge (read first, top left of the picture), the rarity gems (bottom right; 1, 2 or 3, no words)
 * and, for Black Hole, its running total. Same on every face: Deck, Chain, rewards, Forge, Workshop, drafts. */
/** The current bonus of a growth card, shown like the uses badge ("4/4") on the picture: Wind Feather +3%, Growth Ring +3, Growth Seed +8,
 * a Devourer its grown amount. '' for every other card. JOB I, 2026-11-18. */
export function cardGrowthBadge(card) {
  const def = SKILL_CARDS[card?.cardId || card?.id];
  if (!def) return null;
  const n = Math.max(0, Math.floor(Number(card.tally) || 0));
  if (def.kind === 'wind-feather') return { text: `+${n}%`, label: `Now +${n}% flight speed from this card` };
  if (def.kind === 'growth-ring') return { text: `+${n}`, label: `Now +${n} max Sparks from this card` };
  if (def.kind === 'camp-grow') { const v = cardAmount(card); return { text: `+${v}`, label: `Grows +${v} max Sparks at Rest` }; }
  if (def.kind === 'ring-spring' && Number(card.banked) > 0) { const b = Number(card.banked); return { text: `${b} s`, label: `${b} seconds banked: they come off the next Collector recovery` }; }
  if (def.kind === 'pressure-valve' && Number(card.armed) > 0) return { text: 'Free', label: 'Armed: your next Lift is free' };
  if (isDevourCard(card)) { const t = devourTally(card); return { text: `+${t.growth}`, label: `Now +${t.growth} max Sparks from this card` }; }
  return null;
}
function faceBadges(card, compact) {
  const def = SKILL_CARDS[card.cardId || card.id] || {};
  const chip = getCardTrigger(card, def);
  const tally = isDevourCard(card) ? devourTally(card) : null, dreamTally = def.kind === 'dream';
  return `${compact ? `<span class="card-tbadge-row">${chipBadge(chip, { cls: 'card-tbadge' })}</span>` : ''}${rarityPips(rarity(card))}${cardTallyLine(card) && !cardGrowthBadge(card) ? `<span class="card-bh-tally"><b>${cardTallyLine(card)}</b></span>` : ''}${tally && tally.eaten ? `<span class="card-bh-tally"><b>Devoured ${tally.eaten}</b> · ${dreamTally ? `Dream ${8 + tally.growth} s` : `+${tally.growth}${compact ? '' : ' max Sparks'}`}</span>` : ''}`;
}
export function cardFace(card, { compact = false, fitted = false, slot = null, selected = false, status = null, sightWarning = '', availability = null } = {}) {
  if (!card) return `<article class="skill-card empty-card"><div class="card-empty-art">+</div><h3>Empty slot${slot === null ? '' : ` ${slot + 1}`}</h3></article>`;
  status = availability?.status || status;
  const effectState = availability?.state || (status?.state === 'blocked' ? status.code === 'needs-two-right' && getCardFeederCapacity(card) > 0 ? 'partial' : 'blocked' : 'active');
  sightWarning = availability?.sightWarning || sightWarning;
  const effectReason = availability?.reason || '';
  const maximum = getCardChargeCapacity(card);
  const finite = Number.isFinite(card.charges) && Number.isFinite(maximum);
  const uses = finite ? `${amount(card.charges)}/${amount(maximum)}` : '';
  const usesLabel = `${amount(card.charges)} of ${amount(maximum)} uses remaining`;
  const bands = [], verbose = false; // a face is always two short lines (card-face-lines.mjs), so no density variants
  const dense = status && verbose;
  const growth = finite ? null : cardGrowthBadge(card);
  const badge = growth ? `<span class="card-use-counter card-growth-badge" role="img" aria-label="${esc(growth.label)}">${esc(growth.text)}</span>` : finite ? compact ? `<span class="card-use-counter" role="img" aria-label="${usesLabel}">${uses}</span>` : `<button type="button" class="card-use-counter" data-card-term="uses" aria-haspopup="dialog" aria-label="${usesLabel}: help">${uses}</button>` : '';
  return `<article class="skill-card card-${rarity(card)} card-effect-${effectState} ${compact ? 'compact-card card-thumbnail' : 'card-readable'} ${fitted ? 'card-fitted' : ''} ${finite || growth ? 'card-has-uses' : ''} ${status ? 'card-has-status' : ''} ${dense || fitted && status ? 'card-status-dense' : ''} ${verbose ? 'card-rules-dense' : ''} ${bands.length >= 4 ? 'card-rules-long' : ''} ${selected ? 'card-selected' : ''}" data-card-effect-state="${effectState}" data-card-instance="${esc(card.instanceId || '')}" data-card-help="${esc(card.cardId || card.id)}" data-card-rank="${card.rank || 1}"${Number.isFinite(card.charges) ? ` data-card-charges="${card.charges}"` : ''} data-card-name="${esc(cardName(card))}" data-card-description="${esc(cardHelpDescription(card))}" aria-label="${esc(cardName(card))}, ${esc(rarity(card))}${status ? `, ${esc(cardStatusText(status))}` : ''}${effectReason && effectReason !== status?.reason ? `, ${esc(effectReason)}` : ''}"><header class="card-face-heading"><h3>${esc(cardName(card))}</h3>${compact ? '' : `<button type="button" class="card-help" data-card-term-trigger="${esc(card.cardId || card.id)}" data-card-terms="${cardTerms(card).join(' ')}" aria-haspopup="dialog" aria-label="Help with ${esc(cardName(card))}">?</button>`}</header><div class="card-illustration">${cardArt(card, { compact })}${rarityInlay(card)}${faceBadges(card, compact)}${compact ? '' : badge}${sightWarning ? `<span class="card-sight-warning" role="img" title="${esc(sightWarning)}" aria-label="${esc(sightWarning)}">${effectState === 'partial' ? '≈' : '×'} <small>${effectState === 'partial' ? 'Light blocked' : 'Sight blocked'}</small></span>` : ''}</div>${compact ? '' : `<div class="card-rule-band" role="group" aria-label="Rules for ${esc(cardName(card))}">${cardMechanicMarkup(card,{fitted})}</div>`}${cardStatusMarkup(status, {compact, slot})}${compact ? badge : ''}</article>`;
}
/** Wisp stat picture: the wisp orb with one stat mark (whole pixels, 24x24). */
const WISP_MARKS = {
  radius: '<path fill="#6fb0d8" d="M8 1h8v1H8zM5 2h3v1H5zM16 2h3v1h-3zM3 4h2v2H3zM19 4h2v2h-2zM1 8h1v8H1zM22 8h1v8h-1zM3 18h2v2H3zM19 18h2v2h-2zM5 21h3v1H5zM16 21h3v1h-3zM8 22h8v1H8z"/>',
  meter: '<path fill="#5a4632" d="M18 3h4v18h-4z"/><path fill="#f0c86a" d="M19 9h2v11h-2z"/>',
  heart: '<path fill="#c8443c" d="M15 2h2v1h-2zM19 2h2v1h-2zM14 3h4v1h-4zM18 3h4v1h-4zM14 4h8v2h-8zM15 6h6v1h-6zM16 7h4v1h-4zM17 8h2v1h-2z"/>',
  light: '<path fill="#fffdf1" d="M11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4 4h2v2H4zM18 4h2v2h-2zM4 18h2v2H4zM18 18h2v2h-2z"/>',
  stored: '<path fill="#5a4632" d="M15 13h7v8h-7z"/><path fill="#dcc693" d="M16 14h5v6h-5z"/><path fill="#f0c86a" d="M17 15h3v2h-3z"/>',
  recovery: '<path fill="#6fb0d8" d="M15 3h2v1h-2zM17 4h2v1h-2zM19 5h1v2h-1zM19 7h-2v1h2zM17 8h-1v-1h1zM4 18h2v1H4zM6 19h2v1H6zM4 17h-1v-2h1z"/>'
};
const wispArt = id => `<svg class="start-wisp-art" viewBox="0 0 24 24" shape-rendering="crispEdges" role="img" aria-label="Wisp"><path fill="#14241e" d="M0 0h24v24H0z"/><path fill="#d39a3a" d="M8 8h8v8H8z"/><path fill="#f0c86a" d="M9 7h6v10H9zM7 9h10v6H7z"/><path fill="#fffdf1" d="M10 10h3v3h-3z"/>${WISP_MARKS[id] || ''}</svg>`;
/** One start-bonus tile that is not a card: an Inscription on Chain slot 1, or a Wisp stat. Same frame size as a card face; the header colour names the kind. */
export function startBonusTileMarkup(gift, { fitted = false } = {}) {
  const ins = gift.kind === 'inscription';
  const art = ins ? `<span class="start-slot-plate" aria-hidden="true">${inscriptionGlyph(gift.glyph, { size: 48, role: 'presentation' })}<small>Slot 1</small></span>` : wispArt(gift.wispId);
  const word = ins ? 'Inscription' : 'Wisp stat', text = ins ? `Slot 1: ${gift.description}` : gift.description;
  return `<article class="skill-card card-readable card-common start-tile start-tile-${gift.kind} ${fitted ? 'card-fitted' : ''}" data-start-kind="${gift.kind}" data-card-name="${esc(gift.name)}"><header class="card-face-heading"><h3>${esc(gift.name)}</h3></header><div class="card-illustration">${art}</div><div class="card-rule-band" role="group" aria-label="${esc(gift.name)}"><span class="card-mechanics"><span class="card-mechanic-main"><span class="card-rule-stripe card-rule-condition"><span class="card-rule-text"><strong>${word}</strong></span></span><span class="card-rule-stripe card-rule-effect"><span class="card-rule-text">${esc(text)}</span></span></span></span></div></article>`;
}
export function starterCardsMarkup(run, gifts, existing) {
  const guide=describeSkillCard(makeSkillCard('lift-guide','included-starter-guide'));
  const capacity=run.cardFutureCapacity>0?`<small>+${run.cardFutureCapacity} permanent maximum Sparks · starting full at ${formatGlow(run.flame)}/${formatGlow(getGlowCapacity(run))}.</small>`:'';
  return `<section class="card-starter"><header class="card-heading"><div><h2>${run.cardStarterVersion === 4 ? 'Choose your start' : 'Choose one starting card'}</h2><small>Pick 1 of ${gifts.length}. ${DRAFT_HINT}</small>${capacity}</div><div class="card-starter-included">${cardArt(guide,{compact:true})}<span><strong>Lift Guide included</strong><small>You can keep it or Melt it</small></span></div><button class="secondary" data-action="close-sheet">Back</button></header><div class="card-starter-pair${gifts.length===3?' card-starter-trio':''}" data-tap-pick-group>${gifts.map(gift => { const card = gift.card || { ...gift, effect: gift.description, rarity: 'common' }, face = gift.kind === 'inscription' || gift.kind === 'wisp' ? startBonusTileMarkup(gift, {fitted:gifts.length===3}) : cardFace(card,{fitted:gifts.length===3}); return `<div role="button" tabindex="0" class="card-pick" data-tap-pick aria-pressed="false" data-action="${existing ? 'existing-gift' : 'new-gift'}" data-id="${esc(gift.id)}" aria-label="${esc(cardName(card))}. Tap to select, tap again to start with it.">${face}</div>`; }).join('')}</div></section>`;
}
export function starterGiftConfirmationMarkup(run, preview, existing) {
  const gift=preview.gift, card=gift.card || {...gift,effect:gift.description,rarity:'common'};
  const placement=isInventoryOnlyCard(card) ? `${esc(cardName(card))} stays in your Deck, ready at Rest. Lift Guide starts equipped, with two free slots.` : 'Both cards start equipped, with one free slot.';
  return `<section class="card-starter-confirm"><header class="card-heading"><div><h2>Are you sure?</h2><small>Start with ${esc(cardName(card))}</small></div></header><div class="card-starter-confirm-body"><div class="card-starter-confirm-face">${cardFace(card)}</div><div><h3>${esc(cardName(card))} + Lift Guide</h3><p>${placement}</p><p>Lift Guide is yours. Keep it, move it to reserve, or Melt it for Stored Sparks.</p></div></div><footer class="card-dialog-actions"><button class="secondary" data-action="cancel-starting-gift" data-existing="${!!existing}">No</button><button class="primary" data-action="confirm-starting-gift" data-id="${esc(gift.id)}" data-token="${esc(preview.token)}" data-existing="${!!existing}">Yes</button></footer></section>`;
}
export const deckIcon = (kind = 'deck') => `<svg class="card-nav-art" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true"><path fill="#746a54" d="${kind === 'swap' ? 'M2 5h14V2l6 6-6 6v-3H2zm20 14H8v3l-6-6 6-6v3h14z' : kind === 'slot' ? 'M2 2h20v20H2z' : 'M1 6h4v16H1zM6 3h4v19H6zM11 1h12v21H11z'}"/><path fill="#d5c693" d="${kind === 'swap' ? 'M3 6h14V5l3 3-3 3V9H3zm18 10H7v-2l-3 3 3 3v-2h14z' : kind === 'slot' ? 'M4 4h16v16H4z' : 'M2 8h2v12H2zM7 5h2v15H7zM13 3h8v17h-8z'}"/><path fill="#fff4c5" d="${kind === 'slot' ? 'M6 6h12v2H8v10H6z' : kind === 'swap' ? 'M3 6h10v1H3zm8 10h10v1H11z' : 'M14 4h6v2h-6z'}"/></svg>`;
export const furnaceIcon = () => '<svg class="card-furnace-icon" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true"><path fill="#927769" d="M5 2h4v5h6V2h4v7h2v13H3V9h2z"/><path fill="#41271f" d="M7 10h10v9H7z"/><path fill="#ee8744" d="M9 17v-4h2v-3h2v4h2v4H9z"/><path fill="#ffe0a0" d="M11 16h2v3h-2z"/><path fill="#c0a08a" d="M5 20h14v2H5zM3 9h18v2H3z"/></svg>';
const dragGrip = card => isInventoryOnlyCard(card) ? '' : `<span class="card-drag-grip" data-deck-drag-id="${esc(card.instanceId)}" aria-hidden="true"><svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M4 3h3v3H4zm5 0h3v3H9zM4 8h3v3H4zm5 0h3v3H9zM4 13h3v2H4zm5 0h3v2H9z"/></svg></span>`;
export function cardDraftMarkup(run) {
  const draft = getCardDraft(run);
  if (!draft) return '';
  return `<section class="card-reward-screen card-draft-screen"><header class="card-heading"><div><small>${draft.boss ? 'GUARDIAN' : draft.elite ? 'ELITE ROUND' : 'ROUND CLEARED'}</small><h1>Choose 1 card</h1></div><p>${DRAFT_HINT}</p><div class="card-heading-actions">${cardDraftRerollMarkup(run, draft)}<button class="secondary" data-action="menu">Menu</button></div></header>${cardDraftOffersMarkup(draft)}</section>`;
}
/** Second Look: the Re-roll button for a pack screen (top bar, never over the cards). Empty unless a Second Look is mounted; shows "used" once spent. */
export function cardDraftRerollMarkup(run, draft = run?.cardDraft) {
  if (!draft || draft.claimed || draft.trophyOnly) return '';
  if (draft.reroll?.used) return `<button type="button" class="secondary card-reroll is-used" disabled aria-disabled="true"><span>Re-rolled</span></button>`;
  if (!canRerollCardDraft(run)) return '';
  return `<button type="button" class="secondary card-reroll is-dim" data-action="card-draft-reroll" data-draft-id="${esc(draft.id)}" aria-disabled="true" aria-label="Re-roll the selected card. Select a card first."><span>Re-roll</span><small>Select a card first</small></button>`;
}
/** Dim or light the Re-roll button from the current tap-pick selection (DOM only). */
export function syncDraftReroll(root = document) {
  const button = root.querySelector('.card-reroll[data-action]');
  if (!button) return;
  const selected = !!root.querySelector('.card-draft-option.tp-selected');
  button.classList.toggle('is-dim', !selected);
  button.setAttribute('aria-disabled', String(!selected));
}
export const DRAFT_HINT = 'Tap a card, tap again to take it.';
/** Three offers. Each is one tap-to-pick item (tap-pick.mjs): the first tap raises it, the second takes it. */
export function cardDraftOffersMarkup(draft,{className=''}={}) {
  if (!draft?.offers?.length) return '';
  return `<div class="card-draft-offers${className?` ${esc(className)}`:''}" data-tap-pick-group role="group" aria-label="Choose one of three cards. ${DRAFT_HINT}">${draft.offers.map(card => `<div class="card-draft-option" data-tap-pick role="button" tabindex="0" aria-pressed="false" data-action="card-draft-pick" data-draft-id="${esc(draft.id)}" data-id="${esc(card.instanceId)}" aria-label="${esc(cardName(card))}, ${esc(rarity(card))}. Tap to select, tap again to take."><div class="card-draft-face">${cardFace(card)}</div></div>`).join('')}</div>`;
}
export function cardRewardMarkup(run, { equipping = false, notice = '', forceReceipt = false } = {}) {
  const reward = getCardReward(run), card = reward?.card;
  if (!card) return '';
  if (reward.trophy) return `<section class="card-reward-screen card-draft-trophy"><header class="card-heading"><div><small>FINAL GUARDIAN · GAME COMPLETE</small><h1>Your chosen card</h1></div></header><div class="card-reward-body"><div class="card-reward-new">${cardFace(card)}</div><div class="card-reward-choice"><h2>Added to your collection</h2><p>Your winning cards are recorded as they were when the Round ended.</p><button class="primary" data-action="card-reward-continue">Continue</button></div></div></section>`;
  const owned = getOwnedCards(run).find(c => c.instanceId === card.instanceId), slots = getMountedCards(run), statuses = getEquippedCardStatuses(run).map((status,i)=>getCardFaceAvailability(run,slots[i],status).status);
  const equipped = !!owned?.mounted;
  if (isInventoryOnlyCard(card) || forceReceipt) {
    const availability = !isInventoryOnlyCard(card) ? 'Equip it any time from the Deck.' : card.kind === 'camp-grow' ? `${3 - getCardGrowthUses(run)}/3 shared Grow actions remaining this journey.` : 'Its use is spent only after your second different Rest action succeeds.';
    return `<section data-deck-surface="reward" data-deck-editable="false" class="card-reward-screen card-deck-receipt card-reward-inventory"><header class="card-heading"><div><small>${reward.source === 'forge' ? 'FORGED CARD' : 'FLIGHT REWARD'}${flightPackingReceipt(run, reward)}</small><h1>New card</h1></div><button class="secondary" data-action="menu">Menu</button></header><div class="card-reward-body"><div class="card-reward-new">${cardFace(owned || card)}</div><div class="card-reward-choice">${flightCardChangesMarkup(run)}<h2>${deckIcon()} In your Deck</h2>${isInventoryOnlyCard(card) ? '<p>Available at Rest directly from your Deck.</p>' : ''}<p>${availability}</p><div class="card-reward-actions"><button class="primary" data-action="card-reward-continue">Add to collection</button>${owned ? `<button class="secondary card-danger card-melt-action" data-action="card-preview-reward-melt" ${!getCardMeltPreview(run, [card.instanceId]).eligible ? 'disabled' : ''}>${furnaceIcon()} Melt…</button>` : ''}</div></div></div></section>`;
  }
  // A won card is taken straight into the Deck (claimDraftedCard in model.mjs); there is no equip step to draw.
  return cardRewardMarkup(run, {equipping: false, notice, forceReceipt: true});
}
// Kept as a harmless compatibility export for older inspector links.
export function cardReplacementMarkup() { return ''; }

export function cardSwapMarkup(run, pending) {
  const incoming = getOwnedCards(run).find(c => c.instanceId === pending.id), outgoing = getMountedCards(run)[pending.slot];
  if (!incoming || !outgoing) return '';
  const proposed = structuredClone(run), before = getEquippedCardStatuses(run);
  equipOwnedCard(proposed, incoming.instanceId, pending.slot, outgoing.instanceId);
  const after = getEquippedCardStatuses(proposed), next = getMountedCards(proposed);
  const changes = deckSwapComboMarkup(run,proposed,incoming) + after.map((status,i) => status && (status.state !== before[i]?.state || status.state !== 'ready' && status.reason !== before[i]?.reason || next[i]?.kind === 'devourer' || ['echo','chameleon'].includes(next[i]?.kind)) ? `<p><strong>Slot ${i+1} · ${esc(cardName(next[i]))}: ${esc(status.label)}</strong> ${esc(status.reason)} ${status.state==='blocked' ? esc(status.fix) : ''}</p>` : '').join('');
  return `<section class="card-exchange card-swap-review"><header class="card-heading"><div><small>${deckIcon('swap')} REVIEW BEFORE EQUIPPING</small><h2>${incoming.mounted ? `Swap slots ${incoming.slot+1} and ${pending.slot+1}` : `Equip in slot ${pending.slot+1}`}</h2></div></header><div class="card-swap-scroll" tabindex="0" aria-label="Compare full card rules; scroll for all details"><div class="card-swap-pair"><div class="card-swap-column"><h3>${incoming.mounted ? `Slot ${pending.slot+1} → slot ${incoming.slot+1}` : 'Equipped now → Deck'} <small>· ${lifetime(outgoing)}</small></h3><div class="card-swap-face">${cardFace(outgoing)}</div><p>${esc(cardName(outgoing))} · ${lifetime(outgoing)}</p></div><div class="card-swap-column"><h3>Equip here · slot ${pending.slot+1} <small>· ${lifetime(incoming)}</small></h3><div class="card-swap-face">${cardFace(incoming)}</div><p>${esc(cardName(incoming))} · ${lifetime(incoming)}</p></div></div><div class="card-swap-effects">${incoming.mounted ? '<p>Both cards stay equipped. Their new neighbors can change how they work.</p>' : `<p>${esc(cardName(outgoing))} stays in Deck with its uses.</p>`}${changes}</div></div><footer class="card-dialog-actions"><button class="secondary" data-action="card-swap-back">Back · keep current</button><button class="primary card-equip-positive" data-action="card-swap-confirm">Equip ${esc(cardName(incoming))}</button></footer></section>`;
}

const deckHelpMarkup = () => `<details class="card-deck-help"><summary><span class="card-deck-help-open">How to use</span><span class="card-deck-help-close">Close help</span></summary><div class="card-deck-help-panel"><h3>Your cards, your choice</h3><dl><div><dt>Equip & move</dt><dd>Tap a card, then a numbered slot. The outgoing card returns to Deck. Drag a grip to a slot or the Deck target. Equipped cards swap safely. The left and right arrows also reorder cards.</dd></div><div><dt>Rest cards</dt><dd>Growth Seed and Second Ember work directly from your Deck at Rest. Select them to inspect; they use no active slot.</dd></div><div><dt>Inspect</dt><dd>Select a card, then choose Inspect for its full rules, help and Improve.</dd></div><div><dt>Melt</dt><dd>Review the Stored Sparks returned, then confirm. Melting permanently destroys those cards and their uses.</dd></div><div><dt>Improve & Forge</dt><dd>Available at Rest. These services use no Rest action.</dd></div></dl><p>Equip, reorder and Melt anytime; a flight stays paused.</p></div></details>`;

export function cardsBenchMarkup(state, { selectedId = null, selected = 0, locked = false, paused = false, demo = false, browsing = false, inspecting = false, equip = false, targetSlot = null, readerBack = 'Deck', meltMode = false, meltIds = [], notice = '' } = {}) {
  const run = state.run, cards = getMountedCards(run), owned = getOwnedCards(run);
  const benchFace = (card, options={}) => cardFace(card, {
    ...options, availability: getCardFaceAvailability(run, card, options.status),
  });
  const statuses = getEquippedCardStatuses(run).map((status,i)=>getCardFaceAvailability(run,cards[i],status).status);
  const card = owned.find(c => c.instanceId === selectedId) || null;
  const reserve = owned.filter(c => !c.mounted), choosingReserve = Number.isInteger(targetSlot);
  const preview = card ? getCardImprovePreview(run, card.instanceId) : null;
  const canReviewImprove = !!preview && (preview.kind === 'evolution' || preview.kind === 'rank' || (preview.kind === undefined && card.rank < card.maxRank));
  const inventoryCard = isInventoryOnlyCard(card);
  const equippableReserve = reserve.filter(c => !isInventoryOnlyCard(c));
  equip = equip && !inventoryCard;
  const visible = reserve;
  const selectedIds = new Set(meltIds), melt = getCardMeltPreview(run, meltIds);
  const equippedCount = cards.filter(Boolean).length, atRest = canUseCardCampServices(run);
  const draggable = !locked && !meltMode;
  const copyHint = card && ['echo','chameleon'].includes(card.kind) ? `<p class="card-neighbor-hint">${card.mounted ? `Slot ${card.slot + 1} → ${cards[card.slot + 1] ? esc(cardName(cards[card.slot + 1])) : 'empty slot'} · immediate right.` : 'Equip immediately left of the card to copy.'} ${card.kind === 'echo' ? 'Echo repeats compatible triggered actions.' : 'Chameleon copies compatible passives and triggered actions.'}</p>` : '';
  const slotButton = (c, i) => {
    const same = c?.instanceId === card?.instanceId && !!c;
    const consequence = same ? 'Current slot' : !c ? 'Empty · equip here' : card?.mounted ? `${cardName(c)} → slot ${card.slot + 1}` : `${cardName(c)} → Deck`;
    const meltCopy = c ? `${selectedIds.has(c.instanceId) ? '✓ ' : ''}+${amount(c.meltValue)} Stored Sparks` : 'Empty';
    const availability = getCardFaceAvailability(run, c, statuses[i]);
    const disabled = (locked && equip) || (equip && same) || (!c && (meltMode || (!equip && !equippableReserve.length)));
    return `<button class="card-slot-pick card-effect-${availability.state} ${same && !meltMode ? 'selected' : ''} ${equip || choosingReserve && i === targetSlot ? 'card-slot-target' : ''} ${selectedIds.has(c?.instanceId) ? 'card-slot-melting' : ''}" data-action="card-slot" data-index="${i}" data-card-effect-state="${availability.state}" data-deck-slot-id="${esc(c?.instanceId || '')}"${draggable ? ` data-deck-drop="slot" data-deck-slot-name="${c ? esc(cardName(c)) : ''}"` : ''} ${meltMode && c ? `aria-pressed="${selectedIds.has(c.instanceId)}"` : ''} aria-label="${equip ? `Equip ${esc(cardName(card))} in ` : ''}slot ${i + 1}${c ? `: ${esc(cardName(c))}, ${esc(cardStatusText(statuses[i]))}${availability.sightWarning ? `, ${esc(availability.sightWarning)}` : ''}` : ': empty'}${meltMode && c ? `, returns ${amount(c.meltValue)} Stored Sparks, ${selectedIds.has(c.instanceId) ? 'selected to melt' : 'tap to select'}` : equip ? `, ${esc(consequence)}` : !c && !equippableReserve.length ? ', no flight cards to equip' : ''}" ${disabled ? 'disabled' : ''}><b class="card-slot-number">${i + 1}</b>${c ? cardArt(c, { compact: true }) : '<span class="card-slot-open">+</span>'}<span class="card-slot-copy"><strong>${c ? esc(cardName(c)) : 'Empty'}</strong><small>${meltMode ? meltCopy : equip ? consequence : c ? lifetime(c) : equippableReserve.length ? 'Tap to equip' : 'No flight cards'}</small></span>${c ? cardStatusMarkup(statuses[i], {compact:true}) : ''}</button>`;
  };
  if (!browsing && !inspecting && !meltMode) {
    const foreground = cards.map((c, i) => `<div class="card-equipped-mount" data-deck-mounted-slot="${i}"><div role="button" tabindex="0" class="card-equipped-face ${c ? '' : 'card-equipped-empty'}" data-action="card-slot" data-index="${i}" data-deck-slot-id="${esc(c?.instanceId || '')}"${draggable ? ` data-deck-drop="slot" data-deck-slot-name="${c ? esc(cardName(c)) : ''}"` : ''} aria-label="Slot ${i + 1}: ${c ? `${esc(cardName(c))}, ${esc(cardStatusText(statuses[i]))}, select to move or inspect` : 'empty, open Deck to choose a card'}"><b class="card-foreground-number" aria-hidden="true">${i + 1}</b>${deckLinkedCardFace(benchFace(c, { fitted: true, slot: i, status: statuses[i], selected:card?.instanceId===c?.instanceId }),run,i)}${!c ? '<span class="card-empty-prompt">Choose from Deck</span>' : ''}</div>${c && draggable ? `<nav class="card-move-controls" aria-label="Move ${esc(cardName(c))}">${[-1,1].map(direction=>`<button type="button" data-action="card-move-one" data-index="${i}" data-id="${esc(c.instanceId)}" data-direction="${direction}" data-expected-id="${esc(cards[i+direction]?.instanceId || '')}" aria-label="Move ${esc(cardName(c))} one slot ${direction<0?'left':'right'}" ${i+direction<0||i+direction>=cards.length?'disabled':''}>${direction<0?'←':'→'}</button>${direction<0?`${dragGrip(c)}`:''}`).join('')}</nav>` : '<span class="card-move-spacer" aria-hidden="true"></span>'}</div>`).join('');
    return `<section data-deck-editable="${draggable}" class="card-bench card-deck card-equipped-foreground ${card?.mounted ? 'deck-context-open' : ''} ${equip?'deck-tap-moving':''}"><header class="card-heading"><div>${paused ? '<small>FLIGHT PAUSED</small>' : ''}<h2>Equipped</h2></div>${deckRelicShelfMarkup(run)}<button class="primary card-try-row" data-action="card-try-row" aria-haspopup="dialog">▶ Try row</button><button class="secondary card-open-collection" data-action="card-open-collection">${deckIcon()} Deck</button><button class="secondary card-glossary-link" data-card-glossary>Glossary</button><button class="secondary card-close" data-action="close-sheet">Done</button></header><div class="deck-equipped-stage"><div class="card-foreground-row" style="--deck-slots:${cards.length}" aria-label="Equipped cards in slot order" tabindex="0">${foreground}</div>${deckContextMarkup(run,{card,locked,moving:equip,cardStatus:card?.mounted?statuses[card.slot]:null})}</div><p class="card-deck-status" role="status">${esc(notice||(equip?`${cardName(card)} selected · tap any destination slot`:'Tap a card, then a destination slot · or drag its grip'))}</p></section>`;
  }
  const gallery = visible.map(c => `<div role="button" tabindex="0" data-deck-card class="card-deck-pick ${meltMode ? 'card-melt-pick' : 'card-collection-face'} ${selectedIds.has(c.instanceId) ? 'melt-selected' : ''} ${card?.instanceId===c.instanceId && !meltMode ? 'card-reserve-selected' : ''}" data-action="card-select" data-id="${esc(c.instanceId)}" aria-pressed="${meltMode ? selectedIds.has(c.instanceId) : card?.instanceId===c.instanceId}" aria-label="${esc(cardName(c))}, ${esc(rarity(c))}, in Deck${meltMode ? `, returns ${amount(c.meltValue)} Stored Sparks, ${selectedIds.has(c.instanceId) ? 'selected to melt' : 'tap to select for melting'}` : isInventoryOnlyCard(c) ? ', available at Rest, inspect card' : ', select then tap a slot'}">${benchFace(c, { compact: true })}${!meltMode && isInventoryOnlyCard(c) ? '<span class="card-deck-badge">Rest · from Deck</span>' : ''}${meltMode ? `<span class="card-deck-badge">${selectedIds.has(c.instanceId) ? '✓ ' : ''}+${amount(c.meltValue)} Stored Sparks</span>` : dragGrip(c)}</div>`).join('');
  const controls = card ? `<div class="card-deck-actions">${!inventoryCard ? `<button class="primary card-equip-positive" data-action="card-equip" ${locked ? 'disabled' : ''}>${card.mounted ? 'Move to slot' : 'Equip'}</button>` : ''}${card.mounted ? `<button class="secondary" data-action="card-unequip" data-index="${card.slot}" data-id="${esc(card.instanceId)}" title="Keep this card in reserve; its ability stops" ${locked ? 'disabled' : ''}>Unequip</button>` : ''}${card.maxRank > 1 || preview?.kind === 'evolution' ? `<button class="secondary" data-action="card-preview-improve" data-id="${esc(card.instanceId)}" title="${!atRest ? 'Improve and Evolve are available at Rest' : !canReviewImprove ? 'This card is at its highest tier and rank' : `Preview ${cardName(card)} → ${cardName(preview.after)} for ${amount(preview.price)} Stored Sparks; remaining uses stay the same`}" ${locked || !canReviewImprove || !atRest ? 'disabled' : ''}>${!atRest ? 'Improve · Rest' : !canReviewImprove ? 'Max rank' : `${preview.kind === 'evolution' ? 'Evolve' : 'Improve'} · ${amount(preview.price)}`}</button>` : ''}</div>` : '';
  if (inspecting && card && !meltMode) {
    const status = card.mounted ? statuses[card.slot] : null;
    const normalReader = `<div class="card-read-location">${card.mounted ? `Equipped · slot ${card.slot + 1} · ${esc(status?.label || 'equipped')}` : inventoryCard ? `In Deck · available at Rest${card.kind === 'camp-grow' ? ` · ${3 - getCardGrowthUses(run)}/3 shared Grow actions remaining` : ''}` : 'In reserve · equip to activate'}${status ? `<p class="card-read-config card-read-config-${status.state}"><strong>${esc(status.symbol)} ${esc(status.label)}</strong> ${esc(status.reason)}${status.state !== 'ready' ? `<br>${esc(status.fix)}` : ''}</p>` : ''}${card.mounted ? deckCardExplanationMarkup(run,card,{status}) : ''}</div>${controls}${!atRest && canReviewImprove ? '<p class="card-camp-service-hint">Improve and Evolve at Rest.</p>' : ''}${copyHint}${notice ? `<p class="card-deck-status" role="status">${esc(notice)}</p>` : ''}<div class="card-read-footer"><details class="card-reading-details"><summary>Details</summary><p>${esc(printed(card))}</p></details><button class="secondary card-danger card-read-melt card-melt-action" data-action="card-melt-this" data-id="${esc(card.instanceId)}" ${locked ? 'disabled' : ''}>${furnaceIcon()} Melt this card…</button></div>`;
    const chooser = `<div class="card-equip-instruction"><h3>Choose a slot for ${esc(cardName(card))}</h3><p>${card.mounted ? 'Occupied slots swap cards.' : 'An occupied card moves to reserve.'}</p></div><div class="card-equipped card-read-equipped"><div class="card-slot-row" aria-label="Choose equipped slot">${cards.map(slotButton).join('')}</div></div>`;
    return `<section data-deck-editable="${draggable}" class="card-bench card-deck card-deck-reading ${equip ? 'card-deck-equipping' : ''}"><header class="card-heading"><button class="secondary" data-action="${equip ? 'card-cancel-equip' : 'card-reading-back'}">${equip ? 'Cancel' : `← ${esc(readerBack)}`}</button><div><small>${paused ? 'FLIGHT PAUSED' : ''}</small></div><button class="secondary card-glossary-link" data-card-glossary>Glossary</button>${walletMarkup(getSkillWallet(state).condensedGlow)}</header><div class="card-reading-body"><div class="card-read-face">${benchFace(card, {status, slot: card.mounted ? card.slot : null})}</div><div class="card-read-controls">${equip ? chooser : normalReader}</div></div></section>`;
  }
  const meltSummary = `<div class="card-deck-melt-summary"><h3>You’ll receive</h3><p><b>${melt.cards.length}</b> selected · <strong>+${amount(melt.amount)}</strong></p><span class="card-melt-currency">${resourceSymbol('packed')} Stored Sparks</span><small>${melt.cards.length ? 'Confirming destroys these cards and their uses.' : 'Tap equipped or reserve cards to select.'}</small><small class="card-melt-warning" role="status">${melt.mountedCount ? `${melt.mountedCount} equipped ${melt.mountedCount === 1 ? 'slot will' : 'slots will'} become empty.` : melt.reason ? esc(melt.reason) : 'Equipped slots stay as they are.'}</small><div class="card-deck-actions"><button class="primary card-danger" data-action="card-preview-melt-selected" ${locked || !melt.eligible ? 'disabled' : ''}>${furnaceIcon()} Review Melt</button></div></div>`;
  const heading = meltMode ? `<div><small>1 · SELECT · 2 · REVIEW · 3 · CONFIRM</small><h2>Melt cards</h2></div>${walletMarkup(getSkillWallet(state).condensedGlow)}<button class="secondary" data-action="card-cancel-melt">Cancel</button>` : `<div>${paused ? '<small>FLIGHT PAUSED</small>' : ''}<h2>Deck <span>${reserve.length} in reserve</span></h2></div><button class="secondary" data-action="card-collection-back">← Equipped</button>${deckHelpMarkup()}<button class="secondary card-glossary-link" data-card-glossary>Glossary</button><button class="secondary card-danger card-melt-action" data-action="card-melt-mode" ${locked || !owned.length ? 'disabled' : ''}>${furnaceIcon()} Melt cards…</button><button class="secondary card-open-forge" data-action="card-preview-forge" data-rarity="rare" title="${atRest ? 'Forge a card at this Rest' : 'Forge is available at Rest'}" ${locked || !atRest ? 'disabled' : ''}>${atRest ? 'Forge' : 'Forge · Rest'}</button>${walletMarkup(getSkillWallet(state).condensedGlow)}`;
  const collectionHeading = `<div class="card-deck-collection-heading"><h3>Reserve</h3><small ${notice ? 'role="status"' : ''}>${esc(notice || (meltMode ? 'Values in Stored Sparks' : choosingReserve ? `Choose a card for slot ${targetSlot + 1}` : 'Scroll to browse · select a card, then tap a slot'))}</small></div>`;
  const empty = `<div class="card-deck-empty"><strong>${meltMode ? 'No reserve cards to melt' : 'No cards in reserve'}</strong><span>${meltMode ? 'You can select equipped cards above.' : equippedCount ? 'Every owned card is equipped. Clear flights or Forge to add more.' : 'Clear flights to earn cards, or open Forge to create one.'}</span></div>`;
  const slotStrip = `<div class="card-equipped card-collection-slots"><div class="card-slot-row" aria-label="Equipped slots">${cards.map((c,i)=>`<div class="card-compact-mount" data-deck-card>${slotButton(c,i)}${c && draggable ? dragGrip(c) : ''}</div>`).join('')}${!meltMode ? `<button class="secondary card-deck-return" data-action="card-return-selected" data-deck-drop="return" ${!card?.mounted || locked ? 'aria-disabled="true"' : ''} aria-label="${card?.mounted ? `Return ${esc(cardName(card))} to Deck` : 'Drag an equipped card here to return it to Deck'}">${deckIcon()}<span>Deck</span></button>` : ''}</div></div>`;
  const selectionBar = !meltMode ? `<div class="card-deck-selection" role="status"><span>${card ? inventoryCard ? `<strong>${esc(cardName(card))}</strong> · available at Rest` : `${deckIcon('swap')} <strong>${esc(cardName(card))}</strong> · tap a slot` : 'Select a card to equip · drag a grip to move'}</span>${card ? `<button class="secondary" data-action="card-inspect" data-id="${esc(card.instanceId)}">Inspect</button><button class="secondary" data-action="card-cancel-equip">Cancel</button>` : ''}</div>` : '';
  return `<section data-deck-editable="${draggable}" class="card-bench card-deck ${meltMode ? 'card-deck-melt-mode' : 'card-deck-browser'}"><header class="card-heading">${heading}</header>${slotStrip}<div class="card-deck-body"><div class="card-deck-collection">${collectionHeading}<div class="card-deck-gallery" tabindex="0" aria-label="Reserve cards, scroll to browse">${gallery || empty}</div></div>${meltMode ? `<aside class="card-inspector card-deck-inspector" aria-label="Melt selection">${meltSummary}</aside>` : ''}</div>${selectionBar}</section>`;
}
export function cardMeltSelectionMarkup(run, ids, wallet = 0, { single = false, receipt = null } = {}) {
  const preview = getCardMeltPreview(run, ids), slots = preview.cards.filter(c => c.mounted).map(c => c.slot + 1);
  return `<section class="card-exchange card-melt-confirm card-batch-melt"><header class="card-heading"><div><small>${single ? '' : '3 · '}CONFIRM PERMANENT DESTRUCTION</small><h2>${furnaceIcon()} Melt ${single ? esc(cardName(preview.cards[0])) : `${preview.cards.length} ${preview.cards.length === 1 ? 'card' : 'cards'}`}?</h2></div>${walletMarkup(wallet)}</header><div class="card-batch-melt-body"><div class="card-batch-melt-list" aria-label="Cards that will be destroyed">${preview.cards.map(c => `<div>${cardArt(c, { compact: true })}<span><strong>${esc(cardName(c))}</strong><small>${c.mounted ? `Equipped slot ${c.slot + 1}` : 'In reserve'} · ${lifetime(c)}</small></span><b aria-label="${amount(c.meltValue)} Stored Sparks returned">+${amount(c.meltValue)}</b></div>`).join('')}</div><div class="card-exchange-result"><strong class="card-melt-payout">${resourceSymbol('packed')} +${amount(preview.amount)} Stored Sparks</strong><small class="card-melt-wallet">Banked wallet ${amount(wallet)} → ${amount(wallet) + amount(preview.amount)}</small><p>${slots.length ? `Equipped ${slots.length === 1 ? 'slot' : 'slots'} ${slots.join(', ')} will become empty.` : 'Your equipped slots stay as they are.'}</p><p>${single ? 'This card and its remaining uses will be lost.' : 'These cards and their remaining uses will be lost.'}</p></div></div><footer class="card-dialog-actions">${single ? '' : '<button class="secondary" data-action="card-back-melt">← Edit selection</button>'}<button class="secondary" data-action="card-cancel-melt">Cancel · keep ${single ? 'card' : 'cards'}</button><button class="primary card-danger" data-action="card-confirm-melt-selected" data-token="${esc(preview.token)}" data-reward-id="${esc(receipt?.rewardId || '')}" data-reward-instance="${esc(receipt?.instanceId || '')}" ${!preview.eligible ? 'disabled' : ''}>${furnaceIcon()} Melt ${preview.cards.length} ${preview.cards.length === 1 ? 'card' : 'cards'} · +${amount(preview.amount)}</button></footer></section>`;
}
export function cardExchangeMarkup(card, { kind = 'melt', preview = null, index = null, source = 'mounted', wallet = 0, backLabel = 'Back to card' } = {}) {
  const improve = kind === 'improve';
  if(improve) {
    const before = preview.before || card, after = preview.after;
    return `<section class="card-exchange card-improve-confirm"><header class="card-heading"><div><small>${preview.kind === 'evolution' ? 'EVOLVE' : 'IMPROVE'} · USES PRESERVED</small><h2>${esc(cardName(before))} → ${esc(cardName(after))}</h2></div>${walletMarkup(wallet)}</header><div class="card-improve-pair"><div class="card-improve-version"><small>Before · ${esc(rarity(before))} · rank ${before.rank || 1}</small><div class="card-improve-face">${cardFace(before)}</div></div><div class="card-improve-version"><small>After · ${esc(rarity(after))} · rank ${after.rank || 1}</small><div class="card-improve-face">${cardFace(after)}</div></div></div><footer class="card-dialog-actions"><button class="secondary" data-action="card-back-improve">${esc(backLabel)}</button><p class="card-improve-wallet" role="status">${preview.eligible ? `Costs ${amount(preview.price)} Stored Sparks` : esc(preview.reason || `Needs ${Math.max(0,amount(preview.price)-amount(wallet))} more Stored Sparks`)}</p><button class="primary" data-action="card-confirm-improve" data-id="${esc(card.instanceId)}" data-rank="${card.rank || 1}" data-token="${esc(preview.token || '')}" ${!preview.eligible ? 'disabled' : ''}>${preview.kind === 'evolution' ? 'Evolve' : 'Improve'} · ${amount(preview.price)}</button></footer></section>`;
  }
  return `<section class="card-exchange ${improve ? 'card-improve-confirm' : 'card-melt-confirm'}"><header class="card-heading"><div><small>${improve ? 'IMPROVE A DECK CARD' : 'PERMANENTLY DESTROY THIS CARD'}</small><h2>${improve ? 'Improve' : 'Melt'} ${esc(cardName(card))}?</h2></div>${walletMarkup(wallet)}</header><div class="card-exchange-body">${cardFace(card)}<div class="card-exchange-result">${improve ? `<h3>${esc(cardName(preview.before || card))} → ${esc(cardName(preview.after))}</h3><small class="card-improve-tier">${esc(rarity(preview.before || card))} · rank ${card.rank || 1} → ${esc(rarity(preview.after))} · rank ${preview.after?.rank || Number(card.rank || 1) + 1}</small>${Number.isFinite(card.amount) && preview.after?.amount !== card.amount ? `<p class="card-improve-amount">Bonus +${card.amount} → +${preview.after.amount}</p>` : ''}${cardMechanicMarkup(preview.after)}<p class="card-kept-uses">Uses unchanged</p><strong>Costs ${amount(preview.price)} Stored Sparks</strong>${preview.eligible ? '' : `<small>${esc(preview.reason || `Needs ${Math.max(0, amount(preview.price) - amount(wallet))} more Stored Sparks`)}</small>`}` : `<div class="card-melt-art">${choiceScene('forge')}</div><h3>Destroy this card</h3><p>${card.charges == null ? 'Its ability ends.' : `${amount(card.charges)} remaining uses will be lost.`}</p><strong>+${amount(card.meltValue)} Stored Sparks</strong><small>Wallet ${amount(wallet)} → ${amount(wallet) + amount(card.meltValue)}</small>`}</div></div><footer class="card-dialog-actions"><button class="secondary" data-action="${improve ? 'card-back-improve' : source === 'reward' ? 'card-back-reward' : 'cards'}">${improve ? esc(backLabel) : 'Keep card'}</button><button class="primary ${improve ? '' : 'card-danger'}" data-action="${improve ? 'card-confirm-improve' : source === 'reward' ? 'card-confirm-reward-melt' : 'card-confirm-melt'}" data-id="${esc(card.instanceId)}" data-index="${index ?? ''}" data-rank="${card.rank || 1}" data-token="${esc(preview?.token || '')}" ${improve && !preview.eligible ? 'disabled' : ''}>${improve ? `${preview.kind === 'evolution' ? 'Evolve' : 'Improve'} for ${amount(preview.price)}` : `Melt card for +${amount(card.meltValue)}`}</button></footer></section>`;
}
export function cardGrowConfirmationMarkup(run, camp, grow) {
  return `<section class="card-exchange card-grow-confirm"><header class="card-heading"><h2>Grow at this Rest?</h2></header><div class="card-exchange-body">${choiceScene('refillGlow')}<div class="card-exchange-result"><h3>Max Sparks ${formatGlow(grow.before.maxMeter)} → ${formatGlow(grow.after.maxMeter)}</h3><p>Refill Sparks to ${formatGlow(grow.after.maxMeter)}. Hearts stay ${grow.before.hearts}/${grow.before.maxHearts}.</p><p>Uses 1 Rest action and 1 shared Grow action.</p><strong>${3 - getCardGrowthUses(run)} → ${2 - getCardGrowthUses(run)} of 3 Grow actions left</strong>${camp.used.length === 1 && camp.extraAvailable ? '<p>Spends 1 Second Ember use after Grow succeeds.</p>' : ''}</div></div><footer class="card-dialog-actions"><button class="secondary" data-action="card-cancel-grow">Cancel</button><button class="primary" data-action="card-confirm-grow" data-index="${grow.index}" data-token="${esc(grow.token)}">Confirm Grow</button></footer></section>`;
}
const change = (pair, fmt = amount) => pair && pair[0] !== pair[1] ? `${fmt(pair[0])} → ${fmt(pair[1])}` : null;
/** What a taken Rest action did, in numbers. Falls back to the cumulative totals of older saves. */
export function restResultLine(key, result, last = {}) {
  if (key === 'recover') {
    const hearts = result ? change(result.hearts) : last.heartsRestored ? `+${last.heartsRestored}` : null,
      sparks = result ? change(result.meter, formatGlow) : last.sparksRestored ? `+${formatGlow(last.sparksRestored)}` : null;
    return [hearts ? `Hearts <b>${hearts}</b>` : 'Hearts already full', sparks ? `Sparks <b>${sparks}</b>` : 'Sparks already full'].join(' · ');
  }
  if (key === 'slot') return result ? `Equipped slots <b>${change(result.slots) || result.slots?.[1]}</b>` : 'One more equipped slot';
  if (key === 'grow') return result ? `Max Sparks <b>${change(result.maxMeter, formatGlow) || formatGlow(result.maxMeter?.[1])}</b> · meter refilled` : 'Max Sparks increased · meter refilled';
  return '';
}
/** Forge as a Rest option: how many Forge prices the banked Stored Sparks cover, and why not if none. */
export function forgeOption(run) {
  const previews = ['common', 'rare', 'legendary'].map(rarity => getCardForgePreview(run, rarity)),
    possible = previews.filter(p => p.eligible), pool = possible.length ? possible : previews,
    cheapest = pool.reduce((a, b) => (b.price < a.price ? b : a)), wallet = amount(run.condensedGlow);
  return { ready: possible.length > 0, possible: possible.length, rarity: cheapest.rarity, price: amount(cheapest.price), wallet, need: Math.max(0, amount(cheapest.price) - wallet) };
}
const REST_KEYS = {
  recover: { title: 'Recover', icon: 'rest-recover' },
  grow: { title: 'Grow', icon: 'rest-grow' },
  slot: { title: 'Add slot', icon: 'rest-add-slot' },
};
const REST_REASONS = {
  'Hearts and Sparks are already full.': 'Hearts and Sparks full',
  'Maximum five slots': 'All 5 slots unlocked',
  'One slot already added on this map': 'Already added this map',
  'Find a Growth Seed to Grow': 'Needs a Growth Seed',
  'Maximum growth reached (3/3)': 'All 3 Grow uses spent',
  'No Rest action remaining': 'No action left',
};
const plain = html => String(html).replace(/<[^>]+>/g, '');
/** The numbers a Rest card shows: `main` is the result line, `more` an optional second line, `now` the current value when it is unavailable. */
function restCardFacts(run, c) {
  const b = c.before, a = c.after;
  if (c.key === 'slot') return { main: `Slots <b>${b.slots} → ${a.slots}</b>`, more: 'Once per map', now: `Slots <b>${b.slots}/5</b>`, aria: `Slots ${b.slots} to ${a.slots}` };
  if (c.key === 'grow') return { main: `Max Sparks <b>${formatGlow(b.maxMeter)} → ${formatGlow(a.maxMeter)}</b>`, more: `Grow uses <b>${getCardGrowthUses(run)}/3</b>`, now: `Max Sparks <b>${formatGlow(b.maxMeter)}</b>`, aria: `Max Sparks ${formatGlow(b.maxMeter)} to ${formatGlow(a.maxMeter)}` };
  const hearts = b.hearts !== a.hearts, meter = b.meter !== a.meter;
  const hText = `Hearts <b>${b.hearts} → ${a.hearts}</b>`, sText = `Sparks <b>${formatGlow(b.meter)} → ${formatGlow(a.meter)}</b>`;
  return { main: hearts ? hText : sText, more: hearts && meter ? sText : '', now: `Hearts <b>${b.hearts}/${b.maxHearts}</b>`,
    aria: [hearts ? `Hearts ${b.hearts} to ${a.hearts}` : '', meter ? `Sparks ${formatGlow(b.meter)} to ${formatGlow(a.meter)}` : ''].filter(Boolean).join(', ') || 'already full' };
}
function restDoneFacts(run, key) {
  const result = run.lastRest?.results?.[key], last = run.lastRest || {};
  if (key === 'recover' && result) {
    const h = change(result.hearts), m = change(result.meter, formatGlow);
    return h ? `Hearts <b>${h}</b>` : m ? `Sparks <b>${m}</b>` : 'Hearts and Sparks <b>full</b>';
  }
  if (key === 'slot' && result) return `Slots <b>${change(result.slots) || result.slots?.[1]}</b>`;
  if (key === 'grow' && result) return `Max Sparks <b>${change(result.maxMeter, formatGlow) || formatGlow(result.maxMeter?.[1])}</b>`;
  return restResultLine(key, result, last).split(' · ')[0];
}
/** Spend-Stored-Sparks tiles: price, one short line, and the reason when unavailable. They never use up the Rest choice. */
export function restServiceTiles(run) {
  const wallet = amount(run.condensedGlow), services = canUseCardCampServices(run);
  const f = forgeOption(run), owned = services ? getOwnedCards(run) : [];
  const improve = owned.map(card => getCardImprovePreview(run, card.instanceId)).filter(p => p.kind && !/remaining uses/i.test(p.reason || '')),
    refill = owned.map(card => getCardRefillPreview(run, card.instanceId)).filter(p => p.supported && p.missing > 0 && p.before?.charges > 0);
  const cheapest = list => list.reduce((a, b) => (b.price < a.price ? b : a), list[0]);
  const tile = (id, icon, title, line, list, none) => {
    const best = list.length ? cheapest(list) : null, ok = !!(services && best && wallet >= best.price);
    return { id, icon, title, line, price: best ? best.price : null, ok, reason: !services ? 'Not available now' : !best ? none : ok ? '' : `Needs ${best.price - wallet} more` };
  };
  return [
    { id: 'forge', icon: 'rest-forge', title: 'Forge', line: 'Surprise card', price: f.price, ok: services && f.ready, reason: !services ? 'Not available now' : f.ready ? '' : `Needs ${f.need} more`, rarity: f.rarity },
    tile('improve', 'rest-improve', 'Improve', 'Rank up a card', improve, 'All cards at top rank'),
    tile('refill', 'rest-refill', 'Refill', 'Restore missing uses', refill, 'No card needs refilling'),
  ];
}
function restTileMarkup(t) {
  const label = `${t.title}${t.price != null ? `, from ${t.price} Stored Sparks` : ''}: ${t.ok ? t.line : t.reason}`;
  const data = t.id === 'forge' && t.ok ? `data-action="card-workshop-forge" data-rarity="${esc(t.rarity)}"` : t.reason === 'Not available now' ? 'data-action="card-rest-unavailable"' : `data-action="card-workshop" data-service="${t.id}"`;
  return `<button type="button" class="rest2-tile${t.ok ? '' : ' is-off'}" ${data} data-rest-service="${t.id}" aria-disabled="${t.ok ? 'false' : 'true'}" aria-label="${esc(label)}"><span class="rest2-ico">${uiIcon(t.icon, {size: 32})}</span><span class="rest2-tname">${esc(t.title)}</span><span class="rest2-price">${t.price != null ? `${resourceSymbol('packed')}<b>${t.price}</b>` : ''}</span><span class="rest2-tline">${esc(t.ok ? t.line : t.reason)}</span><span class="rest2-tstate">${t.ok ? 'Ready' : ''}</span></button>`;
}
export function cardRestMarkup(run, node, choices, { selected = null } = {}) {
  const camp = getCardCampPreview(run);
  if (!camp) return '';
  node = camp.node;
  const all = camp.actions.filter(c => c.key), order = ['recover', 'grow', 'slot'];
  const actions = order.map(key => all.find(c => c.key === key)).filter(Boolean);
  const leave = camp.actions.find(c => c.effect?.restContinue);
  const usedCount = camp.used.length, total = camp.extraAvailable ? 2 : 1;
  const finished = camp.completed || camp.closed || (usedCount > 0 && camp.remaining === 0);
  const next = camp.completed ? getChoices(run)[0] : null, dream = next ? canDreamAt(run, next) : false;
  const pick = selected && !finished && actions.some(c => c.key === selected && !c.disabled && !c.taken) ? selected : null;
  const title = finished ? (usedCount ? 'Rest: done' : 'Rest: skipped') : `Rest: choose ${total === 2 ? 'two' : 'one'}`;
  const count = total === 2 && (usedCount || !finished) ? `<span class="rest2-count" role="status">${usedCount} of 2 chosen</span>` : '';
  const capacity = getGlowCapacity(run), maxHearts = getLifeCapacity(run);
  const chips = `<ul class="rest2-chips" aria-label="Status"><li class="rest2-chip" aria-label="Hearts ${run.lives} of ${maxHearts}">${livesMarkup(run)}</li><li class="rest2-chip" aria-label="Spark Meter ${formatGlow(run.flame)} of ${formatGlow(capacity)}">${resourceSymbol('glow')}<b>${formatGlow(run.flame)}/${formatGlow(capacity)}</b></li><li class="rest2-chip" aria-label="${amount(run.condensedGlow)} Stored Sparks">${resourceSymbol('packed')}<b>${amount(run.condensedGlow)}</b><small>Stored</small></li></ul>`;
  const cards = actions.map(c => {
    const copy = REST_KEYS[c.key], taken = camp.used.includes(c.key), isPick = pick === c.key, facts = restCardFacts(run, c);
    let state, main, more = '', foot, aria;
    if (taken) { state = 'done'; main = restDoneFacts(run, c.key); foot = `<span class="rest2-tag">${uiIcon('check', {size: 16})}Done</span>`; aria = `${copy.title}: done, ${plain(main)}`; }
    else if (finished) { state = 'passed'; main = facts.now; foot = '<span class="rest2-tag">Not chosen</span>'; aria = `${copy.title}: not chosen`; }
    else if (c.disabled) { const why = c.disabledReason === 'Choose a distinct Rest action' ? 'Already chosen' : REST_REASONS[c.disabledReason] || c.disabledReason || 'Unavailable'; state = 'off'; main = facts.now; foot = `<span class="rest2-why">${esc(why)}</span>`; aria = `${copy.title}: unavailable, ${why}`; }
    else if (isPick) { state = 'selected'; main = facts.main; more = facts.more; foot = `<button type="button" class="rest2-confirm" data-action="card-rest-confirm" data-key="${c.key}" data-index="${c.index}"${c.token ? ` data-token="${esc(c.token)}"` : ''} aria-label="Confirm ${copy.title}: ${esc(facts.aria)}. This cannot be undone.">Confirm</button>`; aria = `${copy.title}: ${facts.aria}, selected. Press Confirm to choose it.`; }
    else { state = 'ready'; main = facts.main; more = facts.more; foot = '<span class="rest2-hint">Tap to choose</span>'; aria = `${copy.title}: ${facts.aria}`; }
    const mark = state === 'selected' || state === 'done' ? `<span class="rest2-mark" aria-hidden="true">${uiIcon('check', {size: 16})}</span>` : '';
    const live = state === 'ready' || state === 'selected';
    return `<div class="rest2-card is-${state}" data-rest-card="${c.key}"><button type="button" class="rest2-pick" data-action="card-rest-select" data-key="${c.key}" data-index="${c.index}" aria-pressed="${state === 'selected' || state === 'done'}" aria-disabled="${live ? 'false' : 'true'}" aria-label="${esc(aria)}">${mark}<span class="rest2-ico">${uiIcon(copy.icon, {size: 48, className: 'ico-l'})}${uiIcon(copy.icon, {size: 32, className: 'ico-s'})}</span><span class="rest2-name">${copy.title}</span><span class="rest2-num">${main}</span>${more ? `<span class="rest2-more">${more}</span>` : ''}</button><div class="rest2-act">${foot}</div></div>`;
  }).join('');
  const tiles = restServiceTiles(run).map(restTileMarkup).join('');
  const note = camp.completed && dream ? `Next · ${esc(next.name)} · ${dreamConfig(run, next).duration}s full-light Dream`
    : finished ? (usedCount ? 'Saved.' : 'You left without resting.')
      : usedCount && camp.extraAvailable ? 'Second Ember is spent only on your second action.' : 'Your Rest choice is final once confirmed.';
  const go = camp.completed
    ? `<button type="button" class="rest2-go" data-action="${dream ? 'node' : 'view-route'}"${dream ? ` data-id="${esc(next.id)}"` : ''}>${dream ? `Enter Dream · ${dreamConfig(run, next).duration}s` : 'Continue'}</button>`
    : `<button type="button" class="rest2-go" data-action="card-rest-continue" data-index="${leave ? leave.index : ''}" data-used="${usedCount}">Continue</button>`;
  return `<section class="rest2 wb-ground${finished ? ' is-finished' : ''}" data-rest-state="${finished ? 'done' : pick ? 'selected' : 'open'}" aria-label="Rest"><header class="rest2-head"><h1 class="rest2-place">${esc(node.name)}<small>Map ${run.mapIndex + 1}/3</small></h1>${chips}<div class="rest2-head-end"><button type="button" class="rest2-btn" data-action="cards">${uiIcon('deck', {size: 16})}Deck</button><button type="button" class="rest2-btn rest2-help" data-card-term="rest" aria-label="Help with Rest actions">?</button></div></header><section class="rest2-sec rest2-free" aria-labelledby="rest2-free-t"><h2 id="rest2-free-t">${title}${count}</h2><p class="rest2-note">${note}</p><div class="rest2-cards">${cards}</div></section><footer class="rest2-bottom"><section class="rest2-sec rest2-spend" aria-labelledby="rest2-spend-t"><h2 id="rest2-spend-t">Spend Stored Sparks <small>optional · keeps your Rest choice</small></h2><div class="rest2-tiles">${tiles}</div></section><div class="rest2-gowrap">${go}</div></footer></section>`;
}
export function cardForgeMarkup(run, preview, { notice = '', paused = false, backLabel = 'Deck', lastForged = null } = {}) {
  // Forge v3: the price is shown, the card is a surprise until it is paid for.
  const tier = rarity => rarity[0].toUpperCase() + rarity.slice(1), label = tier(preview.rarity || 'rare'), wallet = amount(getSkillWallet({run}).condensedGlow);
  if (lastForged?.card) {
    // The result: the new card whole, one line about it, one way back, one way to forge again. `preview` is the quote after this forge, so its price is the next one.
    const next = amount(preview.price), short = Math.max(0, next - wallet), canAgain = !!preview.eligible && short === 0, again = esc(lastForged.rarity || preview.rarity);
    return `<section class="card-forge-preview card-forge-result forge2"><header class="forge2-head"><h2>New card</h2>${walletMarkup(wallet)}</header><div class="forge2-body"><div class="forge2-card"><span class="forge2-new" aria-label="New card">NEW</span>${cardFace(lastForged.card)}</div><div class="forge2-side"><p class="forge2-line" role="status">Added to your deck.</p><div class="forge2-actions"><button type="button" class="primary" data-action="card-forge-back">Back to ${esc(backLabel)}</button><button type="button" class="secondary forge2-again" data-action="card-forge-again" data-rarity="${again}" aria-disabled="${canAgain ? 'false' : 'true'}" aria-label="Forge another ${label} card for ${next} Stored Sparks${canAgain ? '' : `; needs ${short} more`}">Forge another · next ${next}</button>${canAgain ? '' : `<small class="forge2-need">Needs ${short} more</small>`}</div></div></div></section>`;
  }
  const hidden = !!preview.card?.hidden;
  const short = preview.reason === 'Not enough Stored Sparks';
  const reason = short ? `Need ${Math.max(0, amount(preview.price) - wallet)} more Stored Sparks.` : preview.reason;
  const receipt = lastForged ? `<div class="card-forge-receipt" role="status"><strong>${esc(lastForged.name)} added to your deck</strong><button class="secondary" data-action="card-forge-view" data-id="${esc(lastForged.instanceId)}">View card</button></div>` : '';
  const face = hidden ? `<div class="card-forge-mystery" role="img" aria-label="Surprise ${esc(label)} card, revealed after you pay"><strong aria-hidden="true">?</strong><span>Surprise ${esc(label)} card</span><small>Revealed after you pay</small></div>` : cardFace(preview.card);
  return `<section class="card-forge-preview"><header class="card-heading"><button class="secondary card-back" data-action="card-forge-back">Back to ${esc(backLabel)}</button><div><small>${paused ? 'FLIGHT PAUSED · ' : ''}CREATE A CARD</small><h2>Forge</h2></div>${walletMarkup(wallet)}</header><div class="card-exchange-body"><div class="card-forge-card">${face}</div><div class="card-exchange-result"><nav class="card-forge-tiers" aria-label="Forge rarity and next price in Stored Sparks">${['common', 'rare', 'legendary'].map(rarity => `<button class="secondary ${preview.rarity === rarity ? "selected" : ""}" data-action="card-preview-forge" data-rarity="${rarity}" aria-pressed="${preview.rarity === rarity}">${tier(rarity)} · ${amount(getCardForgePrice(run, rarity))}</button>`).join('')}</nav>${receipt}<span class="card-forge-destination">${hidden ? 'Surprise card' : 'Shown card'} · goes to your deck</span><strong>Costs ${amount(preview.price)} Stored Sparks</strong>${notice ? `<span class="card-forge-status" role="status">${esc(notice)}</span>` : ''}${reason ? `<span class="card-forge-status" role="status">${esc(reason)}</span>` : !notice ? `<span class="card-forge-status">${hidden ? 'One random card you do not own yet. Equip it from Deck.' : isInventoryOnlyCard(preview.card) ? 'Available at Rest directly from your Deck.' : 'Equip the new card from Deck.'}</span>` : ''}<small>Next ${label} forge: ${amount(preview.nextPrice)} · each forge doubles that price for the rest of the run.</small><small>Rest service · uses no Rest action.</small></div></div><footer class="card-dialog-actions">${short ? '<button class="secondary" data-action="card-melt-mode">Melt for Sparks…</button>' : ''}<button class="primary" data-action="card-confirm-forge" data-rarity="${preview.rarity}" data-token="${esc(preview.token)}" ${!preview.eligible ? "disabled" : ""}>Forge ${label} · ${amount(preview.price)}</button></footer></section>`;
}
/** One small tile for the victory recap: the Deck's tile content (Trigger chip, picture, name, effect line) plus the slot's Inscription brand. */
function recapTile(run, card, slot) {
  const chip = getCardTrigger(card, SKILL_CARDS[card.cardId || card.id] || {}), ins = slot == null ? null : slotInscriptionId(run, slot);
  return `<li class="recap-tile card-${rarity(card)}" data-recap-slot="${slot == null ? 'trophy' : slot + 1}"><span class="recap-top">${chipBadge(chip, { cls: 'recap-chip' })}${rarityPips(rarity(card))}</span>${ins ? `<span class="recap-brand" aria-hidden="true">${inscriptionGlyph(ins, { size: 26, brand: true })}</span>` : ''}<span class="recap-art">${cardArt(card, { compact: true })}</span><b class="recap-name">${esc(cardName(card))}</b><span class="recap-line">${esc(cardTileLine(card))}</span></li>`;
}
export function cardVictoryRecap(run) {
  const reward = getCardReward(run),
    trophy =
      reward?.card ||
      run.finalCardReward?.card ||
      run.finalCardTrophy;
  const receipts=run.cardClearReceipts||[],legacy=run.cardVictoryReceipt?.runId===run.id?run.cardVictoryReceipt.futureCapacity||0:0;
  const gain=receipts.reduce((sum,receipt)=>sum+(receipt.futureCapacity||0),legacy);
  const explanation=receipts.some(receipt=>receipt.futureCapacity)?`<details><summary>Permanent progress from flight clears</summary><ol>${receipts.filter(receipt=>receipt.futureCapacity).map(receipt=>`<li>Map ${receipt.mapIndex+1} · ${esc(receipt.nodeId)}${receipt.futureCapacity?` · +${receipt.futureCapacity} maximum Sparks`:''}.</li>`).join('')}</ol></details>`:'';
  // A gain of zero is not news: the line appears only when there is something permanent to report.
  const permanent=gain>0||explanation?`<div class="card-future-capacity-receipt" role="status">${gain>0?`<strong>+${gain} maximum ${gain===1?'Spark':'Sparks'} permanently this expedition</strong><p>Your next expedition starts full at ${30+(run.cardFutureCapacity||0)+legacy} maximum Sparks, before its starting card.</p>`:''}${explanation}</div>`:'';
  const maps=[...new Set([...(run.mapHistory||[]).map(entry=>entry.mapName),run.mapName].filter(Boolean))];
  const chain=run.mountedCards?.some(Boolean)?getMountedCards(run):(run.winningHand||[]);
  return `<section class="card-victory-recap"><header class="card-heading"><div><small>THREE GUARDIANS · RUN COMPLETE${flightPackingReceipt(run, reward)}</small><h1>The light returns</h1>${wispChipText(run)?`<p class="card-wisp-chip">${esc(wispChipText(run))}</p>`:''}${maps.length?`<p class="card-recap-maps">${maps.map(esc).join(' · ')}</p>`:''}</div></header>${permanent}<div class="card-winning-hand"><div><h2>Your Chain</h2><ol class="card-recap-row">${chain.map((card, slot) => card ? recapTile(run, card, slot) : '').join('')}</ol></div>${trophy ? `<aside><h2>Trophy: ${esc(cardName(trophy))}</h2><ol class="card-recap-row">${recapTile(run, trophy, null)}</ol></aside>` : ''}</div><p class="card-footnote">Ascension ${run.difficulty} conquered. Cards and Stored Sparks belong to this completed run.</p><footer class="card-dialog-actions"><button class="secondary" data-action="artifacts">Relic almanac</button><button class="primary" data-action="exit-menu">Main menu</button></footer></section>`;
}
