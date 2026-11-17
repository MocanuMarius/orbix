import { cardTermTextMarkup } from "./card-terms.mjs?v=biomes-1";
import { uiIcon } from "./ui-icons.mjs?v=biomes-1";
import { getCardRuleBands, getCardTrigger } from "./card-rule-bands.mjs?v=biomes-1";
import { chipBadge, rarityPips } from "./ui/trigger-icons.mjs?v=biomes-1";
import { blackHoleTally } from "./card-black-hole.mjs?v=biomes-1";
import { getEquippedCardStatuses, cardStatusText } from "./card-status.mjs?v=biomes-1";
import { activeFlightPact } from './flight-pacts.mjs?v=biomes-1';
import { cardArt } from "./card-art.mjs?v=biomes-1";
import {deckRelicShelfMarkup,deckContextMarkup,deckLinkedCardFace,deckSwapComboMarkup,deckCardExplanationMarkup} from './deck-combos.mjs?v=biomes-1';
import {
  getMountedCards,
  getOwnedCards,
  getCardMeltPreview,
  getCardReward,
  getCardDraft,
  getCardImprovePreview,
  getCardForgePreview,
  getCardForgePrice,
  getCardCampPreview,
  getChoices,
  canUseCardCampServices,
  getSkillWallet,
  equipOwnedCard,
} from "./model.mjs?v=biomes-1";
import { resourceSymbol } from "./game-symbols.mjs?v=biomes-1";
import { choiceScene } from "./choice-art.mjs?v=biomes-1";
import { livesMarkup } from "./lives.mjs?v=biomes-1";
import { getGlowCapacity, formatGlow } from "./vitality.mjs?v=biomes-1";
import { mapStopIconMarkup } from "./map-guide.mjs?v=biomes-1";
import {canDreamAt} from './dream.mjs?v=biomes-1';
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
} from "./skill-cards.mjs?v=biomes-1";

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
  const fed=flight.emberFeederSacrifices||[],doubled=flight.cardUseDoublings||[];
  if(!fed.length&&!doubled.length)return '';
  return `<details class="card-flight-changes"><summary>Card changes this flight · ${fed.length+doubled.length}</summary>${doubled.map(change=>`<p><strong>Use Doubler consumed.</strong> ${esc(change.name)} · ${change.before} → ${change.after} remaining uses.</p>`).join('')}${fed.map(change=>`<p><strong>Ember Feeder · +${amount(change.totalCapacity)} maximum Sparks while equipped.</strong> Permanently consumed ${change.targets.map(target=>`${esc(target.name)} (slot ${target.slot+1})`).join(' and ')}. No meter refill.</p>`).join('')}</details>`;
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
export { cardArt } from "./card-art.mjs?v=biomes-1";
export function effectMarkup(text) {
  return esc(text).replace(/([+−]?\d+(?:\.\d+)?%?)/g, '<b class="card-number">$1</b>');
}
const cardTerms = card => {
  const bands = getCardRuleBands(card, SKILL_CARDS[card?.cardId || card?.id]);
  const markup = bands.map(item => cardTermTextMarkup(item.text)).join('');
  return [...new Set([...markup.matchAll(/data-card-term="([^"]+)"/g)].map(match => match[1]))];
};
const fittedRuleText = text => text
  .replace(/^When you defeat the third guardian(?: with this equipped)?$/, 'On completing an expedition')
  .replace(/^Future expeditions start with \+1 maximum Spark\.?$/, 'Future expeditions: +1 maximum Spark')
  .replace(/^Double this pass’s earlier future maximum Spark gains\.?$/, 'This pass’s future gains ×2')
  .replace(/^Double this pass’s earlier card Sparks\.?$/, 'Earlier card Sparks ×2')
  .replace(/^Absorb a passage Spark while Collector reels in a pickup$/, 'Touch a Spark while Collector reels')
  .replace(/^Shorten the remaining reel by up to 1s\.?$/, 'Reel up to 1 s shorter')
  .replace(/^Shorten the remaining reel by up to (\d+)s\.?$/, 'Reel up to $1 s shorter')
  .replace(/^An amber chevron shows when your current fall makes a Lift rise back to its starting height\.?$/, 'Lift timing from your current fall')
  .replace(/^When your wisp absorbs a (?:passage )?Spark\.?$/, 'Touch a Spark')
  .replace(/^When a wave crosses an uncollected Spark\.?$/, 'Pulse crosses a Spark')
  .replace(/^First crossing of each wave\.?$/, 'Once per Pulse')
  .replace(/^While missing a heart, absorb 3 passage Sparks directly in one flight\.?$/, 'Missing a heart: touch 3 Sparks this flight')
  .replace(/^Start or resume flight with Collector\.?$/, 'Enter flight with Collector')
  .replace(/^Unlock a second Collector for this expedition, even after unequipping\.?$/, 'Unlock a second Collector this expedition, even unequipped')
  .replace(/^Repeat the action on the card to the right\.?$/, 'Repeat the card to the right')
  .replace(/^Borrow the ability on the card to the right\.?$/, 'Borrow the card to the right')
  .replace(/^Your meter holds (.+) more Sparks\.?$/, '+$1 maximum Sparks')
  .replace(/^After an earlier action pays Sparks in this pass\.?$/, 'After an earlier Spark payout this pass')
  .replace(/^Multiply this pass’s Sparks so far by (.+)\.?$/, 'This pass’s Sparks ×$1');
// The printed face carries the condition and consequence. The live Uses
// button and linked Help carry repeated use accounting and longer exceptions.
const conciseRuleText = text => text
  .replace(/^Once per flight, with Collector beside you at full charge$/, 'Collector beside you at full charge')
  .replace(/^Catch a fatal impact and send one wave\.$/, 'Once per flight: block a fatal hit and send a Pulse.')
  .replace(/^Collector then needs 4 recovery cycles before fetching again\.$/, 'Then recover for 4 cycles before fetching.')
  .replace(/^Paid Lift while falling, at least 0.75s after the last Lift$/, 'Paid falling Lift · at least 0.75s apart')
  .replace(/^An amber chevron shows when your current fall makes a Lift rise back to its starting height\.?$/, 'Amber chevron shows when a Lift can recover your height.')
  .replace(/^Up to 0\.8s per equipped or copied source\. Extra sources extend duration\.?$/, 'Up to 0.8s per source.')
  .replace(/^Consume the equipped Rare card immediately to the right\. Restore 1 heart\.?$/, 'Consume the Rare card to the right to restore 1 heart.')
  .replace(/^Keeps both cards at full hearts\. Devourer survives\. Cannot be copied or replayed\.?$/, 'Full hearts keep both cards. Cannot be copied or replayed.')
  .replace(/^A second Collector fetches independently while equipped\.?$/, 'A second Collector fetches while equipped.')
  .replace(/^Maximum 2 Collectors\. Each reels its own pickup\. Only the first keeps fatal-impact saves\.?$/, '2 Collectors maximum. Only the first keeps fatal-impact saves.')
  .replace(/^\+35% Collector fetching reach for \d+ extra catches\.?$/, 'Collector reach +35% for catches beyond normal reach.')
  .replace(/^Double Collector fetching reach for \d+ extra catches\.?$/, 'Double Collector reach for catches beyond normal reach.')
  .replace(/^Spend 1 use only when an eligible missed pickup beyond normal reach is caught\. Range extensions do not stack\.?$/, 'Range extensions do not stack.')
  .replace(/^Spend 1 use only beyond normal reach\. Use the shortest sufficient extension\. Your wisp gets first chance\.?$/, 'Uses the shortest sufficient extension. Your wisp gets first chance.')
  .replace(/^\d+ (?:shared )?uses\. Checks before the pickup refills it\.?$/, 'Checks before the pickup refills it.')
  .replace(/^3 shared Grow actions per journey\. Owned Seeds add together, up to \+90\.?$/, '3 shared Grow actions per Game. Seeds add together, up to +90.')
  .replace(/^1 use\. Maximum 2 Collectors\. Keeps its use while Twin Orbit already provides the second\.?$/, '2 Collectors maximum. Keeps its use if Twin Orbit supplies the second.')
  .replace(/^3 uses\. Copies share uses and keep one final wave\.?$/, 'Copies share uses and keep one final Pulse.')
  .replace(/^2 successful uses\. Collector deliveries do not count\.?$/, 'Collector deliveries do not count.');
const redundantFaceNote = (text, card) => Number.isFinite(card.charges) && /^\d+ (?:shared )?uses\. Spend 1 (?:per successful action|only when time is saved|only when this adds Sparks)\.?$/.test(text)
  || /^This bonus cannot earn packing bonuses\.?$/.test(text);
export function cardMechanicMarkup(card, { details = false, fitted = false } = {}) {
  const bands = getCardRuleBands(card, SKILL_CARDS[card?.cardId || card?.id]);
  const growth = (card.kind || SKILL_CARDS[card?.cardId || card?.id]?.kind) === 'camp-grow';
  const main = bands.filter(({type,text})=>!redundantFaceNote(text,card) && (!fitted || type!=='note' || growth)).map(({type, text}) => `<span class="card-rule-stripe card-rule-${type}" data-rule-type="${type}">${cardTermTextMarkup(fitted ? fittedRuleText(conciseRuleText(text)) : conciseRuleText(text))}</span>`).join('');
  return `<span class="card-mechanics"><span class="card-mechanic-main">${main}</span></span>${details ? `<details class="card-rules"><summary>Details</summary><p>${esc(printed(card))}</p></details>` : ''}`;
}
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
function faceBadges(card, compact) {
  const def = SKILL_CARDS[card.cardId || card.id] || {};
  const chip = getCardTrigger(card, def);
  const tally = def.kind === 'black-hole' ? blackHoleTally(card) : null;
  return `<span class="card-tbadge-row">${chipBadge(chip, { cls: 'card-tbadge' })}</span>${rarityPips(rarity(card))}${tally && (!compact || tally.eaten) ? `<span class="card-bh-tally"><b>Eaten ${tally.eaten}</b> · +${tally.growth}${compact ? '' : ' max Sparks'}</span>` : ''}`;
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
  const bands = getCardRuleBands(card, SKILL_CARDS[card.cardId || card.id]);
  const verbose = bands.length >= 3 || bands.map(band => band.text).join(' ').length > 130;
  const dense = status && verbose;
  const badge = finite ? compact ? `<span class="card-use-counter" role="img" aria-label="${usesLabel}">${uses}</span>` : `<button type="button" class="card-use-counter" data-card-term="uses" aria-haspopup="dialog" aria-label="${usesLabel}: help">${uses}</button>` : '';
  return `<article class="skill-card card-${rarity(card)} card-effect-${effectState} ${compact ? 'compact-card card-thumbnail' : 'card-readable'} ${fitted ? 'card-fitted' : ''} ${finite ? 'card-has-uses' : ''} ${status ? 'card-has-status' : ''} ${dense || fitted && status ? 'card-status-dense' : ''} ${verbose ? 'card-rules-dense' : ''} ${bands.length >= 4 ? 'card-rules-long' : ''} ${selected ? 'card-selected' : ''}" data-card-effect-state="${effectState}" data-card-instance="${esc(card.instanceId || '')}" data-card-help="${esc(card.cardId || card.id)}" data-card-rank="${card.rank || 1}"${Number.isFinite(card.charges) ? ` data-card-charges="${card.charges}"` : ''} data-card-name="${esc(cardName(card))}" data-card-description="${esc(printed(card))}" aria-label="${esc(cardName(card))}, ${esc(rarity(card))}${status ? `, ${esc(cardStatusText(status))}` : ''}${effectReason && effectReason !== status?.reason ? `, ${esc(effectReason)}` : ''}"><header class="card-face-heading"><h3>${esc(cardName(card))}</h3>${compact ? '' : `<button type="button" class="card-help" data-card-term-trigger="${esc(card.cardId || card.id)}" data-card-terms="${cardTerms(card).join(' ')}" aria-haspopup="dialog" aria-label="Help with ${esc(cardName(card))}">?</button>`}</header><div class="card-illustration">${cardArt(card, { compact })}${rarityInlay(card)}${faceBadges(card, compact)}${sightWarning ? `<span class="card-sight-warning" role="img" title="${esc(sightWarning)}" aria-label="${esc(sightWarning)}">${effectState === 'partial' ? '≈' : '×'} <small>${effectState === 'partial' ? 'Light blocked' : 'Sight blocked'}</small></span>` : ''}</div>${compact ? '' : `<div class="card-rule-band" role="group" tabindex="0" aria-label="Rules for ${esc(cardName(card))}; scroll for all details">${cardMechanicMarkup(card,{fitted})}</div>`}${cardStatusMarkup(status, {compact, slot})}${badge}</article>`;
}
export function starterCardsMarkup(run, gifts, existing) {
  const guide=describeSkillCard(makeSkillCard('lift-guide','included-starter-guide'));
  const capacity=run.cardFutureCapacity>0?`<small>+${run.cardFutureCapacity} permanent maximum Sparks · starting full at ${formatGlow(run.flame)}/${formatGlow(getGlowCapacity(run))}.</small>`:'';
  return `<section class="card-starter"><header class="card-heading"><div><h2>Choose one starting card</h2><small>Pick 1 of ${gifts.length}. Tap a card to review before starting.</small>${capacity}</div><div class="card-starter-included">${cardArt(guide,{compact:true})}<span><strong>Lift Guide included</strong><small>You can keep it or Melt it</small></span></div><button class="secondary" data-action="close-sheet">Back</button></header><div class="card-starter-pair${gifts.length===3?' card-starter-trio':''}">${gifts.map(gift => { const card = gift.card || { ...gift, effect: gift.description, rarity: 'common' }; return `<div role="button" tabindex="0" class="card-pick" data-action="${existing ? 'existing-gift' : 'new-gift'}" data-id="${esc(gift.id)}" aria-label="Choose ${esc(cardName(card))}. Review before starting.">${cardFace(card,{fitted:gifts.length===3})}<span class="card-pick-label" aria-hidden="true">Choose ${esc(cardName(card))}</span></div>`; }).join('')}</div></section>`;
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
  return `<section class="card-reward-screen card-draft-screen"><header class="card-heading"><div><small>${draft.boss ? 'GUARDIAN' : draft.elite ? 'ELITE ROUND' : 'ROUND CLEARED'}</small><h1>Choose 1 card</h1></div><p>Keep one. The other two are left behind.</p><button class="secondary" data-action="menu">Menu</button></header>${cardDraftOffersMarkup(draft)}</section>`;
}
export function cardDraftOffersMarkup(draft,{className=''}={}) {
  if (!draft?.offers?.length) return '';
  return `<div class="card-draft-offers${className?` ${esc(className)}`:''}" role="group" aria-label="Choose one of three cards">${draft.offers.map(card => `<div class="card-draft-option"><div class="card-draft-face">${cardFace(card)}</div><button class="primary" data-action="card-draft-pick" data-draft-id="${esc(draft.id)}" data-id="${esc(card.instanceId)}" aria-label="Choose ${esc(cardName(card))}, ${esc(rarity(card))}">Choose ${esc(cardName(card))}</button></div>`).join('')}</div>`;
}
export function cardRewardMarkup(run, { equipping = false, notice = '' } = {}) {
  const reward = getCardReward(run), card = reward?.card;
  if (!card) return '';
  if (reward.trophy) return `<section class="card-reward-screen card-draft-trophy"><header class="card-heading"><div><small>FINAL GUARDIAN · GAME COMPLETE</small><h1>Your chosen card</h1></div></header><div class="card-reward-body"><div class="card-reward-new">${cardFace(card)}</div><div class="card-reward-choice"><h2>Added to your collection</h2><p>Your winning cards are recorded as they were when the Round ended.</p><button class="primary" data-action="card-reward-continue">Continue</button></div></div></section>`;
  const owned = getOwnedCards(run).find(c => c.instanceId === card.instanceId), slots = getMountedCards(run), statuses = getEquippedCardStatuses(run).map((status,i)=>getCardFaceAvailability(run,slots[i],status).status);
  const equipped = !!owned?.mounted;
  if (isInventoryOnlyCard(card)) {
    const availability = card.kind === 'camp-grow' ? `${3 - getCardGrowthUses(run)}/3 shared Grow actions remaining this journey.` : 'Its use is spent only after your second different Rest action succeeds.';
    return `<section data-deck-surface="reward" data-deck-editable="false" class="card-reward-screen card-deck-receipt card-reward-inventory"><header class="card-heading"><div><small>${reward.source === 'forge' ? 'FORGED CARD' : 'FLIGHT REWARD'}${flightPackingReceipt(run, reward)}</small><h1>New card</h1></div><button class="secondary" data-action="menu">Menu</button></header><div class="card-reward-body"><div class="card-reward-new">${cardFace(owned || card)}</div><div class="card-reward-choice">${flightCardChangesMarkup(run)}<h2>${deckIcon()} In your Deck</h2><p>Available at Rest directly from your Deck.</p><p>${availability}</p><div class="card-reward-actions"><button class="primary" data-action="card-reward-continue">Add to collection</button>${owned ? `<button class="secondary card-danger card-melt-action" data-action="card-preview-reward-melt" ${!getCardMeltPreview(run, [card.instanceId]).eligible ? 'disabled' : ''}>${furnaceIcon()} Melt…</button>` : ''}</div></div></div></section>`;
  }
  const targetable = equipping && !!owned, outgoingDestination = equipped ? `slot ${owned.slot + 1}` : 'Deck';
  const incomingFace = cardFace(owned || card,{availability:getCardFaceAvailability(run,owned || card)}).replace('<div class="card-illustration">', `<div class="card-illustration" ${owned ? `data-deck-drag-id="${esc(owned.instanceId)}"` : ''}>`);
  return `<section data-deck-surface="reward" data-deck-editable="${!!owned}" class="card-reward-screen card-deck-receipt card-reward-equip ${targetable ? 'card-reward-targeting' : ''}"><header class="card-heading"><div><small>${reward.source === 'forge' ? 'FORGED CARD' : 'FLIGHT REWARD'}${flightPackingReceipt(run, reward)}</small><h1>${equipped ? 'Card equipped' : reward.source === 'forge' ? 'Card forged' : 'Flight complete'}</h1></div><button class="secondary" data-action="menu">Menu</button></header><div class="card-reward-body"><div class="card-reward-incoming"><h2 class="card-reward-group-heading">New card</h2><div class="card-reward-new" data-deck-card>${incomingFace}</div></div><div class="card-reward-choice"><h2 class="card-reward-group-heading">Equipped</h2>${flightCardChangesMarkup(run)}<div class="card-reward-slots" role="group" aria-label="Your equipped cards" data-slot-count="${slots.length}">${slots.map((c,i)=>{const active=targetable&&c?.instanceId!==card.instanceId;return `<div class="card-reward-slot ${active ? 'card-slot-target' : ''}" role="${active ? 'button' : 'group'}" tabindex="${active ? '0' : '-1'}" data-action="card-reward-slot" data-index="${i}" data-deck-drop="slot" data-deck-slot-id="${esc(c?.instanceId || '')}" data-deck-slot-name="${esc(c ? cardName(c) : '')}" aria-label="${active ? `Equip ${esc(cardName(card))} in ` : ''}slot ${i+1}: ${c ? esc(cardName(c)) : 'empty'}${active && c ? `. ${esc(cardName(c))} returns to ${outgoingDestination} with its uses.` : ''}"><span class="card-reward-slot-rail"><b>${i+1}</b><span>${c && statuses[i]?.state!=='ready' ? cardStatusMarkup(statuses[i]) : !c ? 'Empty slot' : ''}</span></span><div class="card-reward-mounted-face">${cardFace(c,{slot:i,availability:getCardFaceAvailability(run,c,statuses[i])})}</div></div>`;}).join('')}</div></div></div><footer class="card-reward-footer"><p class="card-reward-prompt" role="status">${esc(notice || (targetable ? `Choose a slot · outgoing card returns to ${outgoingDestination}` : ''))}</p><div class="card-reward-actions">${equipping ? '<button class="secondary" data-action="card-reward-cancel">Cancel</button>' : `<button class="primary" data-action="card-reward-continue">${equipped ? 'Continue →' : 'Add to collection'}</button>${owned ? `<button class="secondary card-equip-positive" data-action="card-reward-equip">${deckIcon('slot')} ${equipped ? 'Move' : 'Equip'}</button><button class="secondary card-danger card-melt-action" data-action="card-preview-reward-melt" ${!getCardMeltPreview(run, [card.instanceId]).eligible ? 'disabled' : ''}>${furnaceIcon()} Melt…</button>` : ''}`}</div></footer></section>`;
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
    return `<section class="card-exchange card-improve-confirm"><header class="card-heading"><div><small>${preview.kind === 'evolution' ? 'EVOLVE' : 'IMPROVE'} · USES PRESERVED</small><h2>${esc(cardName(before))} → ${esc(cardName(after))}</h2></div>${walletMarkup(wallet)}</header><div class="card-improve-pair"><div class="card-improve-version"><small>Before · ${esc(rarity(before))} · rank ${before.rank || 1}</small><div class="card-improve-face">${cardFace(before)}</div></div><div class="card-improve-version"><small>After · ${esc(rarity(after))} · rank ${after.rank || 1}</small><div class="card-improve-face">${cardFace(after)}</div></div></div><footer class="card-dialog-actions"><button class="secondary" data-action="card-back-improve">${esc(backLabel)}</button><p class="card-improve-wallet" role="status">${preview.eligible ? `Stored Sparks ${amount(wallet)} → ${amount(wallet)-amount(preview.price)}` : esc(preview.reason || `Need ${Math.max(0,amount(preview.price)-amount(wallet))} more Stored Sparks`)}</p><button class="primary" data-action="card-confirm-improve" data-id="${esc(card.instanceId)}" data-rank="${card.rank || 1}" data-token="${esc(preview.token || '')}" ${!preview.eligible ? 'disabled' : ''}>${preview.kind === 'evolution' ? 'Evolve' : 'Improve'} · ${amount(preview.price)}</button></footer></section>`;
  }
  return `<section class="card-exchange ${improve ? 'card-improve-confirm' : 'card-melt-confirm'}"><header class="card-heading"><div><small>${improve ? 'IMPROVE A DECK CARD' : 'PERMANENTLY DESTROY THIS CARD'}</small><h2>${improve ? 'Improve' : 'Melt'} ${esc(cardName(card))}?</h2></div>${walletMarkup(wallet)}</header><div class="card-exchange-body">${cardFace(card)}<div class="card-exchange-result">${improve ? `<h3>${esc(cardName(preview.before || card))} → ${esc(cardName(preview.after))}</h3><small class="card-improve-tier">${esc(rarity(preview.before || card))} · rank ${card.rank || 1} → ${esc(rarity(preview.after))} · rank ${preview.after?.rank || Number(card.rank || 1) + 1}</small>${Number.isFinite(card.amount) && preview.after?.amount !== card.amount ? `<p class="card-improve-amount">Bonus +${card.amount} → +${preview.after.amount}</p>` : ''}${cardMechanicMarkup(preview.after)}<p class="card-kept-uses">Uses unchanged</p><strong>−${amount(preview.price)} Stored Sparks</strong><small>${preview.eligible ? `Wallet ${amount(wallet)} → ${amount(wallet) - amount(preview.price)}` : esc(preview.reason || `Need ${Math.max(0, amount(preview.price) - amount(wallet))} more Stored Sparks`)}</small>` : `<div class="card-melt-art">${choiceScene('forge')}</div><h3>Destroy this card</h3><p>${card.charges == null ? 'Its ability ends.' : `${amount(card.charges)} remaining uses will be lost.`}</p><strong>+${amount(card.meltValue)} Stored Sparks</strong><small>Wallet ${amount(wallet)} → ${amount(wallet) + amount(card.meltValue)}</small>`}</div></div><footer class="card-dialog-actions"><button class="secondary" data-action="${improve ? 'card-back-improve' : source === 'reward' ? 'card-back-reward' : 'cards'}">${improve ? esc(backLabel) : 'Keep card'}</button><button class="primary ${improve ? '' : 'card-danger'}" data-action="${improve ? 'card-confirm-improve' : source === 'reward' ? 'card-confirm-reward-melt' : 'card-confirm-melt'}" data-id="${esc(card.instanceId)}" data-index="${index ?? ''}" data-rank="${card.rank || 1}" data-token="${esc(preview?.token || '')}" ${improve && !preview.eligible ? 'disabled' : ''}>${improve ? `${preview.kind === 'evolution' ? 'Evolve' : 'Improve'} for ${amount(preview.price)}` : `Melt card for +${amount(card.meltValue)}`}</button></footer></section>`;
}
export function cardGrowConfirmationMarkup(run, camp, grow) {
  return `<section class="card-exchange card-grow-confirm"><header class="card-heading"><h2>Grow at this Rest?</h2></header><div class="card-exchange-body">${choiceScene('refillGlow')}<div class="card-exchange-result"><h3>Max Sparks ${formatGlow(grow.before.maxMeter)} → ${formatGlow(grow.after.maxMeter)}</h3><p>Refill Sparks to ${formatGlow(grow.after.maxMeter)}. Hearts stay ${grow.before.hearts}/${grow.before.maxHearts}.</p><p>Uses 1 Rest action and 1 shared Grow action.</p><strong>${3 - getCardGrowthUses(run)} → ${2 - getCardGrowthUses(run)} of 3 Grow actions left</strong>${camp.used.length === 1 && camp.extraAvailable ? '<p>Spends 1 Second Ember use after Grow succeeds.</p>' : ''}</div></div><footer class="card-dialog-actions"><button class="secondary" data-action="card-cancel-grow">Cancel</button><button class="primary" data-action="card-confirm-grow" data-index="${grow.index}" data-token="${esc(grow.token)}">Confirm Grow</button></footer></section>`;
}
export function cardRestMarkup(run, node, choices) {
  const camp = getCardCampPreview(run);
  if (!camp) return '';
  node = camp.node;
  const rail = `<aside class="card-rest-rail">${mapStopIconMarkup(node)}<small>REST · MAP ${run.mapIndex + 1}/3</small><h1>${esc(node.name)}</h1><div class="card-rest-vitals">${livesMarkup(run)}<span>${resourceSymbol("glow")}${formatGlow(run.flame)}/${formatGlow(getGlowCapacity(run))}</span></div><div class="card-rest-deck-links"><button class="secondary" data-action="cards">Deck</button><button class="primary" data-action="card-workshop">Workshop</button></div><small>Improve · Refill · Forge<br>${resourceSymbol('packed')} ${Math.floor(run.condensedGlow||0)} Stored Sparks · no Rest action</small></aside>`;
  if (camp.completed) {
    const last = run.lastRest || {}, names = { recover: 'Recover', slot: 'Add slot', grow: 'Grow' };
    const next = getChoices(run)[0], dream = canDreamAt(run, next);
    const receipt = camp.used.length ? camp.used.map(key => {
      const detail = key === 'recover' ? `${Math.max(0, last.heartsRestored || 0)} hearts restored · meter refilled`
        : key === 'slot' ? `${run.cardSlots} equipped slots unlocked` : 'Maximum Sparks increased · meter refilled';
      return `<article class="card-camp-choice card-camp-taken">${choiceScene(key === 'slot' ? 'skills' : key === 'grow' ? 'refillGlow' : 'hearts')}<h3>✓ ${names[key] || esc(key)}</h3><p class="card-camp-consequence">${detail}</p></article>`;
    }).join('') : '<p>You left without taking a Rest action.</p>';
    return `<section class="card-rest-screen">${rail}<div class="card-camp-main"><header class="card-heading"><div><h2>Rest complete</h2><p>Prepare your Deck, then ${dream ? 'enter Dream' : 'choose the next route'}.</p></div></header><div class="card-camp-choices">${receipt}</div><footer class="card-camp-footer"><p>${dream ? `Next · ${esc(next.name)} · 8s full-light Dream` : 'Your choices are saved.'}</p><button class="primary" data-action="${dream ? 'node' : 'view-route'}"${dream ? ` data-id="${esc(next.id)}"` : ''}>${dream ? 'Enter Dream · 8s' : 'Choose next route'}</button></footer></div></section>`;
  }
  const actions = camp.actions.filter(c => c.key), leave = camp.actions.find(c => c.effect?.restContinue);
  const available = actions.filter(c => !c.disabled), exclusive = camp.remaining === 1 && available.length > 1;
  const title = !available.length ? camp.used.length ? "Rest actions complete" : "No actions available"
    : camp.used.length ? "Choose one more" : camp.remaining > 1 && available.length > 1 ? "Choose up to two different actions" : "Choose one Rest action";
  const shortReason = c => c.taken ? "✓ Taken" : ({
    "Hearts and Sparks are already full.": "Hearts and meter full",
    "Maximum five slots": "All 5 slots unlocked",
    "One slot already added on this map": "Already added this map",
    "Find a Growth Seed to Grow": "Find a Growth Seed to Grow",
    "Maximum growth reached (3/3)": "All 3 Grow actions used",
    "No Rest action remaining": "No actions remaining",
  }[c.disabledReason] || c.disabledReason || "");
  return `<section class="card-rest-screen">${rail}<div class="card-camp-main"><header class="card-heading"><div><h2>${esc(title)}</h2>${exclusive ? `<p class="card-camp-alternatives">${available.map(c => esc(c.title)).join('<span>OR</span>')}</p>` : ''}</div><button class="secondary card-camp-help" data-card-term="rest" aria-label="Help with Rest actions">?</button></header><div class="card-camp-choices">${actions.map(c => {
    const grow = c.key === "grow", slot = c.key === "slot", before = c.before, after = c.after;
    const numbers = slot ? `Slots <b>${before.slots} → ${after.slots}</b>` : grow ? `Max Sparks <b>${formatGlow(before.maxMeter)} → ${formatGlow(after.maxMeter)}</b>` : `Hearts <b>${before.hearts} → ${after.hearts}</b>`;
    const detail = slot ? 'Once per map · no refill' : `Meter <b>${formatGlow(before.meter)} → ${formatGlow(after.meter)}</b>`;
    const note = c.taken ? '' : c.disabled ? shortReason(c) : grow ? `No healing · Grow used ${getCardGrowthUses(run)}/3` : '';
    return `<article class="card-camp-choice ${c.disabled ? "unavailable" : ""} ${c.taken ? 'card-camp-taken' : ''}">${choiceScene(grow ? "refillGlow" : slot ? "skills" : "hearts")}<h3 class="rest-action-icon">${uiIcon(grow ? 'rest-grow' : slot ? 'rest-add-slot' : 'rest-recover', {size: 32})}<span>${esc(c.title)}</span></h3><div class="card-camp-consequence"><p>${numbers}</p><p>${detail}</p></div><p class="card-camp-note">${esc(note)}</p><button class="${c.disabled ? 'secondary' : 'primary'}" data-action="support" data-index="${c.index}" ${c.disabled ? 'disabled' : ''}>${c.taken ? '✓ Taken' : esc(c.title)}</button></article>`;
  }).join("")}</div><footer class="card-camp-footer"><p>${camp.extraAvailable && camp.remaining ? "Second Ember is spent only after your second action." : ""}</p>${leave && !leave.disabled ? `<button class="primary" data-action="support" data-index="${leave.index}">Leave Rest</button>` : '<button class="primary" data-action="view-route">Choose next route</button>'}</footer></div></section>`;
}
export function cardForgeMarkup(run, preview, { notice = '', paused = false, backLabel = 'Deck', lastForged = null } = {}) {
  // Forge v3: the price is shown, the card is a surprise until it is paid for.
  const tier = rarity => rarity[0].toUpperCase() + rarity.slice(1), label = tier(preview.rarity || 'rare'), wallet = amount(getSkillWallet({run}).condensedGlow);
  const hidden = !!preview.card?.hidden;
  const short = preview.reason === 'Not enough Stored Sparks';
  const reason = short ? `Need ${Math.max(0, amount(preview.price) - wallet)} more Stored Sparks.` : preview.reason;
  const receipt = lastForged ? `<div class="card-forge-receipt" role="status"><strong>Revealed: ${esc(lastForged.name)} → reserve</strong><button class="secondary" data-action="card-forge-view" data-id="${esc(lastForged.instanceId)}">View card</button></div>` : '';
  const face = hidden ? `<div class="card-forge-mystery" role="img" aria-label="Surprise ${esc(label)} card, revealed after you pay"><strong aria-hidden="true">?</strong><span>Surprise ${esc(label)} card</span><small>Revealed after you pay</small></div>` : cardFace(preview.card);
  return `<section class="card-forge-preview"><header class="card-heading"><button class="secondary card-back" data-action="card-forge-back">Back to ${esc(backLabel)}</button><div><small>${paused ? 'FLIGHT PAUSED · ' : ''}CREATE A CARD</small><h2>Forge</h2></div>${walletMarkup(wallet)}</header><div class="card-exchange-body"><div class="card-forge-card">${face}</div><div class="card-exchange-result"><nav class="card-forge-tiers" aria-label="Forge rarity and next price in Stored Sparks">${['common', 'rare', 'legendary'].map(rarity => `<button class="secondary ${preview.rarity === rarity ? "selected" : ""}" data-action="card-preview-forge" data-rarity="${rarity}" aria-pressed="${preview.rarity === rarity}">${tier(rarity)} · ${amount(getCardForgePrice(run, rarity))}</button>`).join('')}</nav>${receipt}<span class="card-forge-destination">${hidden ? 'Surprise card' : 'Shown card'} → reserve</span><strong>−${amount(preview.price)} Stored Sparks</strong><small>${wallet >= amount(preview.price) ? `Banked wallet ${wallet} → ${wallet - amount(preview.price)}` : `Banked wallet ${wallet} · cost ${amount(preview.price)}`}</small>${notice ? `<span class="card-forge-status" role="status">${esc(notice)}</span>` : ''}${reason ? `<span class="card-forge-status" role="status">${esc(reason)}</span>` : !notice ? `<span class="card-forge-status">${hidden ? 'One random card you do not own yet. Equip it from Deck.' : isInventoryOnlyCard(preview.card) ? 'Available at Rest directly from your Deck.' : 'Equip the new card from Deck.'}</span>` : ''}<small>Next ${label} forge: ${amount(preview.nextPrice)} · each forge raises that price by half at this Rest; the next Rest starts over.</small><small>Rest service · uses no Rest action.</small></div></div><footer class="card-dialog-actions">${short ? '<button class="secondary" data-action="card-melt-mode">Melt for Sparks…</button>' : ''}<button class="primary" data-action="card-confirm-forge" data-rarity="${preview.rarity}" data-token="${esc(preview.token)}" ${!preview.eligible ? "disabled" : ""}>Forge ${label} · ${amount(preview.price)}</button></footer></section>`;
}
export function cardVictoryRecap(run) {
  const reward = getCardReward(run),
    trophy =
      reward?.card ||
      run.finalCardReward?.card ||
      run.finalCardTrophy;
  const receipts=run.cardClearReceipts||[],legacy=run.cardVictoryReceipt?.runId===run.id?run.cardVictoryReceipt.futureCapacity||0:0;
  const gain=receipts.reduce((sum,receipt)=>sum+(receipt.futureCapacity||0),legacy),speed=receipts.reduce((sum,receipt)=>sum+(receipt.cruisingSpeed||0),0);
  const explanation=receipts.some(receipt=>receipt.futureCapacity||receipt.cruisingSpeed)?`<details><summary>Permanent progress from flight clears</summary><ol>${receipts.filter(receipt=>receipt.futureCapacity||receipt.cruisingSpeed).map(receipt=>`<li>Map ${receipt.mapIndex+1} · ${esc(receipt.nodeId)}${receipt.futureCapacity?` · +${receipt.futureCapacity} maximum Sparks`:''}${receipt.cruisingSpeed?` · +${receipt.cruisingSpeed}% cruising speed`:''}.</li>`).join('')}</ol></details>`:'';
  const permanent=`<div class="card-future-capacity-receipt" role="status"><strong>+${gain} maximum ${gain===1?'Spark':'Sparks'} permanently this expedition</strong>${gain?`<p>Your next expedition starts full at ${30+(run.cardFutureCapacity||0)+legacy} maximum Sparks, before its starting card.</p>`:''}${speed?`<p>+${speed}% cruising speed unlocked. Choose your speed in Settings; baseline stays available.</p>`:''}${explanation}</div>`;
  return `<section class="card-victory-recap"><header class="card-heading"><div><small>THREE GUARDIANS · RUN COMPLETE${flightPackingReceipt(run, reward)}</small><h1>The light returns</h1></div></header>${permanent}<div class="card-winning-hand"><div><h2>Your equipped cards</h2><div class="card-recap-row">${(run.winningHand || getMountedCards(run))
    .filter(Boolean)
    .map((c) => cardFace(c, { compact: true }))
    .join(
      "",
    )}</div></div>${trophy ? `<aside><h2>Final trophy</h2>${cardFace(trophy, { compact: true })}<p>A record of this victory.</p></aside>` : ""}</div><p class="card-footnote">Ascension ${run.difficulty} conquered. Cards and Stored Sparks belong to this completed run.</p><footer class="card-dialog-actions"><button class="secondary" data-action="artifacts">Relic almanac</button><button class="primary" data-action="exit-menu">Main menu</button></footer></section>`;
}
