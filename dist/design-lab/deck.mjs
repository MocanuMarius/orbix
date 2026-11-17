// v1.0-deck: one Deck screen. Row and Reserve on one page, one pick-up-and-place interaction for everything.
// Every verdict on this page comes from the game's own functions: placement status from
// card-status.mjs › getEquippedCardStatuses, the result line from skill-cards.mjs › previewCardRow,
// melt values from getCardMeltValue, Rest cards from isInventoryOnlyCard. The page only adds words and layout.
import {CARD_SYSTEM, CARD_UNIT, CARD_ROW_EVENTS, SKILL_CARDS, makeSkillCard, getCardChargeCapacity, getMountedCards, describeSkillCard, getCardRowRule, hasCardRowEvent, previewCardRow, getCardMeltValue, isInventoryOnlyCard} from '../skill-cards.mjs?v=guide-clarity-1';
import {glowGaugeMarkup, glowGaugeUnits} from '../glow-ui.mjs?v=guide-clarity-1';
import {getGlowCapacity, glowPoints, GLOW_DISPLAY_SCALE} from '../vitality.mjs?v=guide-clarity-1';
import {getEquippedCardStatuses} from '../card-status.mjs?v=guide-clarity-1';
import {cardFace, cardArt} from '../card-ui.mjs?v=guide-clarity-1';
import {resourceSymbol} from '../game-symbols.mjs?v=guide-clarity-1';
import {getCardRuleBands, CARD_TRIGGERS} from '../card-rule-bands.mjs?v=guide-clarity-1';

const query = new URLSearchParams(location.search);
const variant = query.get('variant') || 'v1.0-deck';
const V11 = variant === 'v1.1-deck';
const V20 = variant === 'v2.0-deck';
const V23 = variant === 'v2.3-deck';
const V22 = variant === 'v2.2-deck' || V23; // v2.3 is v2.2 plus fixes, gated by V23.
const V21 = variant === 'v2.1-deck' || V22; // v2.2 is v2.1 with the plate and result changes, gated by V22.
document.documentElement.dataset.variant = variant;

// Sample state from the brief.
let serial = 0;
const card = id => makeSkillCard(id, `deck-${serial++}`);
const state = {
  row: [card('echo'), card('spark-cache'), card('prism-lens'), null],
  reserve: ['body-spark', 'refrain', 'lift-guide', 'kindling-bead', 'crescendo', 'growth-seed'].map(card),
  wallet: 8,
  picked: null,     // {from: 'row' | 'reserve', index}
  melting: false,
  reading: false,
  note: '', noteTone: '',
};
// Trigger for the result line: your wisp catches a natural Spark with the meter half full.
const EVENT = Object.freeze({kind: CARD_ROW_EVENTS.body, pickupKind: 'light', meterFraction: .5});

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = v => String(Number((Number(v) || 0).toFixed(2)));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const nameOf = c => describeSkillCard(c)?.name || 'Empty slot';
const isRest = c => !!c && isInventoryOnlyCard(c);
const pickedCard = () => state.picked ? (state.picked.from === 'row' ? state.row : state.reserve)[state.picked.index] : null;

// ── Real functions ───────────────────────────────────────────────────────────
function solve(row) {
  const listens = hasCardRowEvent(row, EVENT.kind);
  const receipt = previewCardRow({cards: row}, listens ? EVENT : {...EVENT, eligible: false});
  return {sparks: receipt.sparks, listens};
}
const resultText = row => {
  const {sparks} = solve(row);
  return sparks > 0 ? `Catch a Spark: +${num(sparks)} Bonus` : 'Catch a Spark: no Bonus';
};

// The game's status label → one plain instruction, in the v1.0-words vocabulary.
const PLAIN = {
  'Move after payer': 'Move right of a + card',
  'Needs 2 payers': 'Needs two + cards to its left',
  'No target': 'Put a card to its right',
  'No action to copy': "Can't repeat the card to its right",
  'Must be last': 'Move to the last place',
  'Needs consumable right': 'Needs a card with Uses to its right',
  'Needs Rare to right': 'Needs a Rare card to its right',
  'Needs 2 cards right': 'Needs two cards to its right',
  'Shared replay': 'Only one Encore fires',
};
function plainStatus(status) {
  if (!status) return null;
  if (status.state === 'ready') return {state: 'ready', text: ''};
  const text = PLAIN[status.label] || (status.label.startsWith('Cannot copy') ? "Can't repeat the card to its right" : status.label);
  return {state: status.state, text, label: status.label};
}

// The mark: what the card does in the row.
const REPEAT_ICON = '<svg viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M2 3h6V1h1v1h1v1h1v1h-1v1H9v1H8V4H3v3H2zm0 6h7v1H2zm8-2h1v1h-1zM1 8h1v1H1z"/></svg>';
function markOf(c) {
  const def = SKILL_CARDS[c?.cardId];
  if (!def) return null;
  if (isRest(c)) return {cls: 'rest', glyph: 'Rest', text: 'Rest card, works from the Reserve', long: 'Rest card: works from the Reserve at Rest. It never goes in your row.'};
  if (def.kind === 'echo' || def.kind === 'chameleon') return {cls: 'repeat', glyph: REPEAT_ICON, text: 'Repeats the card to its right', long: 'Repeats the card to its right.'};
  if (def.kind === 'refrain') return {cls: 'encore', glyph: 'Encore', text: 'Encore', long: 'Encore: after a Bonus, your row fires once more from the left.'};
  const rule = getCardRowRule(def, c);
  if (rule?.operation === 'multiply') return {cls: 'mul', glyph: '×', text: 'Multiplies', long: '× Multiplies the Bonus built by the cards to its left.'};
  if (rule?.operation === 'add-sparks' || rule?.operation === 'add-last-payout') return {cls: 'add', glyph: '+', text: 'Adds', long: '+ Adds to the Bonus.'};
  if (!rule) return {cls: 'always', glyph: 'Always on', text: 'Always on', long: 'Always on: works while it is in your row, without firing.'};
  return null;
}
const markChip = (mark, extra = '') => mark ? `<span class="dk-mark dk-mark-${mark.cls} ${extra}" aria-hidden="true">${mark.glyph}</span>` : '';

// ── Places ───────────────────────────────────────────────────────────────────
// A place is {type: 'slot', index} | {type: 'gap', index} (between slot index-1 and index) | {type: 'reserve'}.
// placeResult returns the arrangement after the move, or null when the place is not valid for the picked card.
function placeResult(pick, place) {
  const row = [...state.row], reserve = [...state.reserve];
  const moving = (pick.from === 'row' ? row : reserve)[pick.index];
  if (!moving) return null;
  if (place.type !== 'reserve' && isRest(moving)) return null;
  const hasEmpty = row.includes(null);
  // Insert at index i, taking up one empty slot (the nearest to the right, else to the left).
  const insert = (arr, i, c) => {
    arr.splice(i, 0, c);
    let j = arr.findIndex((v, k) => v === null && k > i);
    if (j < 0) j = arr.findLastIndex((v, k) => v === null && k < i);
    arr.splice(j, 1);
    return arr.indexOf(c);
  };
  if (pick.from === 'row') {
    const a = pick.index;
    if (place.type === 'reserve') {row[a] = null;reserve.unshift(moving);return {row, reserve, kind: 'reserve', at: 0};}
    if (place.type === 'slot') {
      const b = place.index;
      if (b === a) return null;
      if (!row[b]) {row[b] = moving;row[a] = null;return {row, reserve, kind: 'fill', at: b};}
      row.splice(a, 1);row.splice(b, 0, moving);return {row, reserve, kind: 'move', at: b};
    }
    const g = place.index, target = g > a ? g - 1 : g;
    if (target === a) return null;
    row.splice(a, 1);row.splice(target, 0, moving);return {row, reserve, kind: 'move', at: target};
  }
  // From the Reserve.
  if (place.type === 'reserve') return null;
  if (place.type === 'slot') {
    const b = place.index;
    if (!row[b]) {row[b] = moving;reserve.splice(pick.index, 1);return {row, reserve, kind: 'fill', at: b};}
    if (!hasEmpty) {const out = row[b];row[b] = moving;reserve[pick.index] = out;return {row, reserve, kind: 'swap', at: b, out};}
    reserve.splice(pick.index, 1);
    return {row, reserve, kind: 'move', at: insert(row, b, moving)};
  }
  if (!hasEmpty) return null;
  reserve.splice(pick.index, 1);
  return {row, reserve, kind: 'move', at: insert(row, place.index, moving)};
}
// A gap is a place only between two row cards.
const gapIsBetweenCards = g => !!state.row[g - 1] && !!state.row[g];
function targetsFor(pick) {
  const list = [];
  state.row.forEach((_, i) => {
    if (i > 0 && gapIsBetweenCards(i)) {const r = placeResult(pick, {type: 'gap', index: i});if (r) list.push({place: {type: 'gap', index: i}, result: r});}
    const r = placeResult(pick, {type: 'slot', index: i});if (r) list.push({place: {type: 'slot', index: i}, result: r});
  });
  const r = placeResult(pick, {type: 'reserve'});if (r) list.push({place: {type: 'reserve'}, result: r});
  // Visual order: gap before slot within each place index already; keep it.
  return list;
}
const placeKey = p => p.type === 'reserve' ? 'reserve' : `${p.type}-${p.index}`;

// ── Render ───────────────────────────────────────────────────────────────────
const ARROW = '<svg class="dk-arrow" viewBox="0 0 8 10" width="16" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h2v1h1v1h1v1h1v1h1v2H6v1H5v1H4v1H3v1H1V8h1V7h1V6h1V4H3V3H2V2H1z"/></svg>';
const INSERT = '<svg class="dk-insert" viewBox="0 0 10 12" width="20" height="24" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M4 0h2v4h2v1h1v1h1v1H0V6h1V5h1V4h2zM4 8h2v4H4z"/></svg>';
const TICK = '<svg viewBox="0 0 8 8" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M6 1h2v2H7v1H6v1H5v1H4v1H2V6H1V5H0V4h2v1h1V4h1V3h1V2h1z"/></svg>';

let targets = [];
function render() {
  const pick = state.picked, moving = pickedCard();
  targets = pick && !state.melting ? targetsFor(pick) : [];
  const targetMap = new Map(targets.map(t => [placeKey(t.place), t]));
  const printed = getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: state.row.length, mountedCards: state.row});
  const statuses = getEquippedCardStatuses({mountedCards: state.row});

  // Row: slots and the gaps between them.
  const row = $('dk-row');
  row.style.setProperty('--dk-slots', String(state.row.length));
  let html = '';
  state.row.forEach((c, i) => {
    if (i > 0) {
      const gapT = targetMap.get(`gap-${i}`);
      const label = gapT ? `Move ${nameOf(moving)} between ${nameOf(state.row[i - 1])} and ${nameOf(state.row[i])}, to place ${gapT.result.at + 1}` : 'Then';
      html += `<button type="button" class="dk-gap ${gapT ? 'dk-lit' : ''}" data-place="gap-${i}" ${gapT ? '' : 'disabled aria-hidden="true" tabindex="-1"'} aria-label="${esc(label)}">${gapT ? INSERT : ARROW}</button>`;
    }
    const slotT = targetMap.get(`slot-${i}`);
    const isPicked = pick?.from === 'row' && pick.index === i;
    const mark = markOf(c);
    const plain = plainStatus(statuses[i]);
    let under = '', underCls = '';
    if (pick && !state.melting) {
      if (isPicked) {under = 'Picked up';underCls = 'dk-under-picked';}
      else if (slotT) {under = slotT.result.kind === 'swap' ? `Swaps with ${nameOf(c)}` : 'Move here';underCls = 'dk-under-target';}
      else if (moving && isRest(moving)) {under = 'Rest cards stay in Reserve';underCls = 'dk-under-refuse';}
    } else if (c && plain) {
      if (plain.state === 'ready') {under = `<span class="dk-tick" aria-hidden="true">${TICK}</span>`;underCls = 'dk-under-ready';}
      else {under = `<span class="dk-flag" aria-hidden="true">${plain.state === 'shared' ? '≈' : '!'}</span><span>${esc(plain.text)}</span>`;underCls = `dk-under-${plain.state}`;}
    }
    const underHtml = under && !under.startsWith('<') ? esc(under) : under;
    const status = c ? (plain?.state === 'ready' ? 'Ready' : plain?.text) : '';
    let label = `Place ${i + 1}: ${c ? nameOf(c) : 'Empty slot'}${mark ? `, ${mark.text}` : ''}${status ? `. ${status}` : ''}`;
    if (pick && !state.melting) label = isPicked ? `${label}. Picked up. Press to put it down` : slotT ? `Place ${i + 1}: ${slotT.result.kind === 'swap' ? `swap ${nameOf(moving)} with ${nameOf(c)}` : `move ${nameOf(moving)} here`}` : label;
    html += `<div class="dk-slot ${c ? '' : 'dk-slot-empty'} ${isPicked ? 'dk-picked' : ''} ${slotT ? 'dk-lit' : ''}" data-index="${i}">
      <button type="button" class="dk-slot-btn" data-place="slot-${i}" data-card="${c ? 'row-' + i : ''}" aria-label="${esc(label)}" ${pick && !isPicked && !slotT ? 'aria-disabled="true"' : ''}>
        <span class="dk-slot-no" aria-hidden="true">${i + 1}</span>
        <span class="dk-face">${c ? `${markChip(mark)}${cardFace(printed[i], {compact: true})}` : '<span class="dk-empty"><b>Empty slot</b></span>'}</span>
      </button>
      <p class="dk-under ${underCls}" aria-hidden="true">${underHtml}</p>
    </div>`;
  });
  row.innerHTML = html;
  row.querySelectorAll('.dk-face .skill-card').forEach(node => node.setAttribute('aria-hidden', 'true'));

  // Result line, straight from the resolver.
  $('dk-result').innerHTML = esc(resultText(state.row)).replace(/(\+[\d.]+ Bonus|no Bonus)/, '<b>$1</b>');

  // Reserve shelf.
  const reserveT = targetMap.get('reserve');
  const shelf = $('dk-shelf');
  const prevScroll = shelf.scrollLeft;
  shelf.classList.toggle('dk-lit', !!reserveT);
  shelf.innerHTML = (reserveT ? `<button type="button" class="dk-tile dk-tile-drop" data-place="reserve" aria-label="Move ${esc(nameOf(moving))} to the Reserve">${INSERT}<span><b>Move here</b></span></button>` : '')
    + state.reserve.map((c, i) => {
      const mark = markOf(c), isPicked = pick?.from === 'reserve' && pick.index === i, rest = isRest(c);
      const label = reserveT ? `Move ${nameOf(moving)} to the Reserve` : `${nameOf(c)}${mark ? `, ${mark.text}` : ''}, in Reserve${isPicked ? '. Picked up. Press to put it down' : ''}`;
      return `<button type="button" class="dk-tile ${isPicked ? 'dk-picked' : ''} ${rest ? 'dk-tile-rest' : ''}" data-card="reserve-${i}" ${reserveT ? 'data-place="reserve"' : ''} aria-label="${esc(label)}">
        <span class="dk-tile-art">${cardArt(c, {compact: true})}${rest ? '' : markChip(mark, 'dk-mark-small')}</span>
        <span class="dk-tile-copy"><b>${esc(nameOf(c))}</b>${rest ? '<small class="dk-rest-tag">Rest · works from here</small>' : mark ? `<small>${esc(mark.text)}</small>` : ''}</span>
      </button>`;
    }).join('')
    + (state.reserve.length ? '' : '<p class="dk-shelf-empty">No cards in Reserve</p>');
  shelf.scrollLeft = prevScroll;
  shelf.querySelectorAll('svg[role="img"]').forEach(svg => {svg.removeAttribute('role');svg.setAttribute('aria-hidden', 'true');});

  // Bottom band: Done / Workshop, or the action bar while a card is picked up.
  const picking = !!pick;
  $('dk-done').hidden = picking;$('dk-workshop').hidden = picking;
  $('dk-cancel').hidden = !picking;$('dk-read').hidden = !picking;$('dk-meltask').hidden = !picking;
  if (picking) {
    $('dk-read').setAttribute('aria-label', `Read card: ${nameOf(moving)}`);
    $('dk-meltask').setAttribute('aria-label', `Melt ${nameOf(moving)}: shows what you get first`);
    $('dk-cancel').setAttribute('aria-label', `Cancel: put ${nameOf(moving)} down`);
  }
  $('dk-bottom').classList.toggle('dk-picking', picking);
  $('dk-melt').hidden = !state.melting;
  $('dk-bottom').classList.toggle('dk-melting', state.melting);
  if (state.melting && moving) {
    const value = getCardMeltValue(moving);
    $('dk-melt-text').innerHTML = `You get <b>+${value} Stored Sparks</b>. ${esc(nameOf(moving))} is gone for good.`;
    $('dk-meltgo-label').textContent = `Melt ${nameOf(moving)}`;
    $('dk-meltgo').setAttribute('aria-label', `Melt ${nameOf(moving)} for ${value} Stored Sparks. This cannot be undone.`);
  }

  // Note: hint while picking, or the last receipt.
  const note = $('dk-note');
  let text = state.note, tone = state.noteTone;
  if (picking && !state.melting && !text) {
    text = isRest(moving) ? `${nameOf(moving)} is a Rest card: it works from the Reserve` : 'Tap a lit place';
    tone = isRest(moving) ? 'dk-note-rest' : 'dk-note-hint';
  }
  note.textContent = text;note.className = `dk-note ${tone || ''}`;

  $('dk-wallet-value').textContent = String(state.wallet);
  $('dk-wallet').setAttribute('aria-label', `Wallet: ${state.wallet} Stored Sparks`);
  $('deck').classList.toggle('dk-has-pick', picking);
  $('deck').dataset.row = state.row.map(c => c ? c.cardId : '-').join(',');
  $('deck').dataset.result = String(solve(state.row).sparks);
}

// ── Actions ──────────────────────────────────────────────────────────────────
const announce = text => {const live = $('dk-live');live.textContent = '';requestAnimationFrame(() => {live.textContent = text;});};
function focusCard(ref) {
  const node = ref && document.querySelector(`[data-card="${ref}"]`);
  (node || $('dk-done'))?.focus({preventScroll: true});
}
function pick(from, index) {
  const c = (from === 'row' ? state.row : state.reserve)[index];
  if (!c) return;
  state.picked = {from, index};state.melting = false;state.note = '';
  render();
  const n = targets.length;
  announce(isRest(c) ? `${nameOf(c)} picked up. It is a Rest card and works from the Reserve, so it can't go in your row. Read card, Melt, or Cancel.`
    : `${nameOf(c)} picked up. ${n} ${n === 1 ? 'place' : 'places'} lit. Use the arrow keys or tap a place, or Cancel.`);
  focusCard(`${from}-${index}`);
  if (!reduced.matches) document.querySelector(`[data-card="${from}-${index}"]`)?.animate([{transform: 'translateY(0)'}, {transform: 'translateY(-4px)'}], {duration: 120, easing: 'steps(2,end)'});
}
function cancel({silent = false} = {}) {
  if (!state.picked) return;
  const ref = `${state.picked.from}-${state.picked.index}`, c = pickedCard();
  state.picked = null;state.melting = false;state.note = '';
  render();
  if (!silent) announce(`${nameOf(c)} put down.`);
  focusCard(ref);
}
function drop(place) {
  const pickNow = state.picked;
  if (!pickNow) return;
  const moving = pickedCard();
  if (place.type !== 'reserve' && isRest(moving)) {refuse(moving);return;}
  const result = placeResult(pickNow, place);
  if (!result) return;
  state.row = result.row;state.reserve = result.reserve;state.picked = null;state.melting = false;
  const res = resultText(state.row);
  const what = result.kind === 'reserve' ? `${nameOf(moving)} moved to the Reserve.`
    : result.kind === 'swap' ? `${nameOf(moving)} swapped with ${nameOf(result.out)}: ${nameOf(moving)} is in place ${result.at + 1}, ${nameOf(result.out)} is in the Reserve.`
    : `${nameOf(moving)} moved to place ${result.at + 1}.`;
  state.note = '';
  render();
  announce(`${what} ${res}.`);
  focusCard(result.kind === 'reserve' ? 'reserve-0' : `row-${result.at}`);
  if (!reduced.matches) document.querySelector(result.kind === 'reserve' ? '[data-card="reserve-0"]' : `[data-card="row-${result.at}"]`)?.animate([{transform: 'translateY(-6px)'}, {transform: 'none'}], {duration: 200, easing: 'steps(3,end)'});
}
function refuse(c) {
  state.note = `${nameOf(c)} is a Rest card: it works from the Reserve, not the row`;state.noteTone = 'dk-note-rest';
  render();
  announce(`${nameOf(c)} can't go in your row. Rest cards work from the Reserve.`);
  state.note = '';state.noteTone = '';
  const node = document.querySelector('.dk-picked');
  if (node && !reduced.matches) node.animate([{transform: 'translateX(0)'}, {transform: 'translateX(-4px)'}, {transform: 'translateX(4px)'}, {transform: 'translateX(0)'}], {duration: 240, easing: 'steps(4,end)'});
}
function askMelt() {
  if (!state.picked) return;
  state.melting = true;render();
  const c = pickedCard();
  announce(`Melt ${nameOf(c)}? You get ${getCardMeltValue(c)} Stored Sparks. It is gone for good.`);
  $('dk-keep').focus({preventScroll: true});
}
function keepCard() {
  state.melting = false;render();
  announce(`Kept ${nameOf(pickedCard())}.`);
  $('dk-meltask').focus({preventScroll: true});
}
function confirmMelt() {
  const pickNow = state.picked, c = pickedCard();
  if (!pickNow || !c) return;
  const value = getCardMeltValue(c), was = state.wallet;
  if (pickNow.from === 'row') state.row[pickNow.index] = null; else state.reserve.splice(pickNow.index, 1);
  state.wallet += value;
  state.picked = null;state.melting = false;
  state.note = `Melted ${nameOf(c)} · +${value} Stored Sparks`;state.noteTone = 'dk-note-receipt';
  render();
  announce(`Melted ${nameOf(c)}. Plus ${value} Stored Sparks: ${was} to ${state.wallet}. ${resultText(state.row)}.`);
  if (!reduced.matches) $('dk-wallet').animate([{transform: 'scale(1.12)'}, {transform: 'none'}], {duration: 260, easing: 'steps(4,end)'});
  focusCard(pickNow.from === 'row' ? null : state.reserve.length ? `reserve-${Math.min(pickNow.index, state.reserve.length - 1)}` : null);
  if (pickNow.from === 'row') document.querySelector(`[data-place="slot-${pickNow.index}"]`)?.focus({preventScroll: true});
}

// Reader: the readable real face (help links made inert, since the glossary is not part of this preview) and plain facts.
function openReader() {
  const c = pickedCard();
  if (!c) return;
  state.reading = true;
  const where = state.picked.from === 'row' ? `In your Row, place ${state.picked.index + 1}` : 'In your Reserve';
  const printed = state.picked.from === 'row'
    ? getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: state.row.length, mountedCards: state.row})[state.picked.index]
    : describeSkillCard(c);
  const face = cardFace(printed, {compact: false})
    .replace(/<button type="button"/g, '<span').replace(/<\/button>/g, '</span>')
    .replace(/ aria-haspopup="dialog"/g, '').replace(/: help"/g, '"');
  $('dk-reader-face').innerHTML = face;
  $('dk-reader-face').querySelector('.card-help')?.remove();
  // The approved Spark icon (spark-a, 16-pixel grid, shown at exactly 16px) replaces the old Spark symbol.
  $('dk-reader-face').querySelectorAll('.card-term-icon-spark, .card-term-icon-meter').forEach(icon => {
    icon.innerHTML = '<img class="dk-spark" src="design-lab/assets/spark-a.svg" width="16" height="16" alt="" draggable="false">';
  });
  const mark = markOf(c);
  let status = '';
  if (state.picked.from === 'row') {
    const plain = plainStatus(getEquippedCardStatuses({mountedCards: state.row})[state.picked.index]);
    status = plain?.state === 'ready' ? 'Works in this place' : plain?.text || '';
  } else status = isRest(c) ? 'Works from here at Rest' : 'Not firing: move it to your Row';
  const facts = [
    ['Does', mark?.long || '—'],
    ['Where', where],
    ['Place', status],
    ...(Number.isFinite(c.charges) ? [['Uses', `${c.charges} left`]] : []),
    ['Melts for', `+${getCardMeltValue(c)} Stored Sparks`],
  ];
  $('dk-reader-name').textContent = nameOf(c);
  $('dk-reader-list').innerHTML = facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('dk-reader').hidden = false;
  $('dk-sheet').classList.add('dk-reading');
  $('dk-reader-name').focus({preventScroll: true});
  announce(`Reading ${nameOf(c)}.`);
}
function closeReader() {
  if (!state.reading) return;
  state.reading = false;
  $('dk-reader').hidden = true;
  $('dk-sheet').classList.remove('dk-reading');
  $('dk-read').focus({preventScroll: true});
  announce(`Back to the Deck. ${nameOf(pickedCard())} is still picked up.`);
}

// ── Input: tap, keyboard, drag ───────────────────────────────────────────────
function placeFromKey(key) {
  if (key === 'reserve') return {type: 'reserve'};
  const [type, index] = key.split('-');return {type, index: Number(index)};
}
function activate(node) {
  if (state.reading || state.melting) return;
  const cardRef = node.dataset.card, placeRef = node.dataset.place;
  if (state.picked) {
    const pickedRef = `${state.picked.from}-${state.picked.index}`;
    if (cardRef && cardRef === pickedRef) {cancel();return;}
    if (placeRef) {
      const place = placeFromKey(placeRef);
      if (targets.some(t => placeKey(t.place) === placeRef)) {drop(place);return;}
      if (place.type !== 'reserve' && isRest(pickedCard())) {refuse(pickedCard());return;}
    }
    // Another Reserve card while a Reserve card is picked: pick that one instead.
    if (cardRef?.startsWith('reserve-') && state.picked.from === 'reserve') {const [, i] = cardRef.split('-');pick('reserve', Number(i));return;}
    return;
  }
  if (cardRef) {const [from, i] = cardRef.split('-');pick(from, Number(i));return;}
  if (placeRef?.startsWith('slot-')) {
    state.note = 'Pick up a card first, then tap this place';state.noteTone = 'dk-note-hint';render();state.note = '';
    announce('This place is empty. Pick up a card first, then choose this place.');
  }
}
if (!V11 && !V20 && !V21) {
const sheet = $('dk-sheet');
let suppressClick = false;
sheet.addEventListener('click', event => {
  if (suppressClick) {suppressClick = false;return;}
  const node = event.target.closest('[data-card],[data-place]');
  if (node && !node.disabled) activate(node);
});
$('dk-cancel').addEventListener('click', () => cancel());
$('dk-read').addEventListener('click', openReader);
$('dk-meltask').addEventListener('click', askMelt);
$('dk-keep').addEventListener('click', keepCard);
$('dk-meltgo').addEventListener('click', confirmMelt);
$('dk-reader-back').addEventListener('click', closeReader);
$('dk-done').addEventListener('click', () => {state.note = 'In the game, Done returns to where you opened the Deck';state.noteTone = 'dk-note-hint';render();state.note = '';announce('Done returns to where you opened the Deck.');});
$('dk-workshop').addEventListener('click', () => {state.note = 'The Workshop button appears only at Rest';state.noteTone = 'dk-note-hint';render();state.note = '';announce('The Workshop appears only at Rest. It opens Forge, Improve and Evolve.');});

// Keyboard: arrows move between lit places while a card is picked up; Escape cancels.
document.addEventListener('keydown', event => {
  if (state.reading) {
    if (event.key === 'Escape') {event.preventDefault();closeReader();}
    else if (event.key === 'Tab') {
      // Keep focus inside the reader.
      const items = [$('dk-reader-name'), $('dk-reader-back')];
      const i = items.indexOf(document.activeElement);
      event.preventDefault();items[(i + (event.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
    return;
  }
  if (state.melting) {if (event.key === 'Escape') {event.preventDefault();keepCard();}return;}
  if (!state.picked) return;
  if (event.key === 'Escape') {event.preventDefault();cancel();return;}
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const pickedRef = `${state.picked.from}-${state.picked.index}`;
  const nodes = [document.querySelector(`[data-card="${pickedRef}"]`), ...targets.map(t => document.querySelector(`[data-place="${placeKey(t.place)}"]`))].filter(Boolean);
  if (nodes.length < 2) return;
  event.preventDefault();
  const at = nodes.indexOf(document.activeElement.closest('[data-card],[data-place]'));
  const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
  const next = nodes[((at < 0 ? 0 : at) + step + nodes.length) % nodes.length];
  next.focus();next.scrollIntoView?.({block: 'nearest', inline: 'nearest'});
});

// Drag: the same pick and place, with a floating copy that follows the pointer.
let drag = null;
sheet.addEventListener('pointerdown', event => {
  const node = event.target.closest('[data-card]');
  if (!node || !node.dataset.card || event.button !== 0 || state.reading || state.melting) return;
  drag = {node, ref: node.dataset.card, x: event.clientX, y: event.clientY, id: event.pointerId, moved: false, ghost: null};
});
window.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 10) return;
  if (!drag.moved) {
    drag.moved = true;
    const [from, i] = drag.ref.split('-');
    if (!state.picked || `${state.picked.from}-${state.picked.index}` !== drag.ref) pick(from, Number(i));
    const source = document.querySelector(`[data-card="${drag.ref}"]`);
    const box = source.getBoundingClientRect();
    const ghost = source.querySelector('.skill-card, .dk-tile-art')?.cloneNode(true) || source.cloneNode(true);
    ghost.classList.add('dk-ghost');ghost.style.width = `${Math.round(box.width)}px`;
    drag.ghost = document.createElement('div');drag.ghost.className = 'dk-ghost-wrap';drag.ghost.append(ghost);
    drag.offset = {x: drag.x - box.left, y: drag.y - box.top};
    document.body.append(drag.ghost);
    event.preventDefault();
  }
  drag.ghost.style.transform = `translate(${Math.round(event.clientX - drag.offset.x)}px,${Math.round(event.clientY - drag.offset.y)}px)`;
  const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('[data-place]')).find(Boolean);
  document.querySelectorAll('.dk-over').forEach(el => el.classList.remove('dk-over'));
  if (over && targets.some(t => placeKey(t.place) === over.dataset.place)) (over.closest('.dk-slot') || over.closest('.dk-shelf') || over).classList.add('dk-over');
});
const endDrag = event => {
  if (!drag || event.pointerId !== drag.id) return;
  const {moved, ghost} = drag;drag = null;
  if (!moved) return;
  suppressClick = true;setTimeout(() => {suppressClick = false;}, 0);
  ghost?.remove();
  document.querySelectorAll('.dk-over').forEach(el => el.classList.remove('dk-over'));
  if (event.type !== 'pointerup') {cancel();return;}
  const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('[data-place]')).find(Boolean);
  const key = over?.dataset.place;
  if (key && targets.some(t => placeKey(t.place) === key)) drop(placeFromKey(key));
  else if (key && key !== 'reserve' && isRest(pickedCard())) refuse(pickedCard());
  // Dropped elsewhere: the card stays picked up, so tapping still finishes the move.
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// The shelf scrolls sideways with a mouse wheel too (its scrollbar is hidden in short frames).
$('dk-shelf').addEventListener('wheel', event => {
  const shelf = $('dk-shelf');
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || shelf.scrollWidth <= shelf.clientWidth) return;
  shelf.scrollLeft += event.deltaY;event.preventDefault();
}, {passive: false});

// Wallet symbol: the game's own Stored Sparks container.
$('dk-wallet-icon').innerHTML = resourceSymbol('packed').replace(/role="img" aria-label="Stored Sparks"/, 'aria-hidden="true"');

render();
// A test and review hook.
window.deck = {
  state, solve, resultText, placeResult, targetsFor, get targets() {return targets;},
  statuses: () => getEquippedCardStatuses({mountedCards: state.row}).map(s => s && {label: s.label, plain: plainStatus(s)}),
};
}

/* ═══════════════════════════════════════════════════════════════════════════
   v1.1-deck: master and detail. The Row and a Reserve grid on the left, the Inspector on the right.
   A new small "deck card" answers HOW RARE / WHAT IT DOES / WHAT KIND without a tap.
   Same real functions as v1.0 (placement, resolver, statuses, melt value); tapping selects, "Move" is a second step.
   ═══════════════════════════════════════════════════════════════════════════ */
const RARITY_WORD = {common: 'Common', rare: 'Rare', legendary: 'Legendary'};
const rarityOf = c => SKILL_CARDS[c?.cardId]?.rarity || 'common';
const SPARK_IMG = '<img class="dc-spark" src="design-lab/assets/spark-a.svg" width="16" height="16" alt="" draggable="false">';

// The two short lines. Source: the card's REAL rule bands (card-rule-bands.mjs › getCardRuleBands) and its real row rule
// (skill-cards.mjs › getCardRowRule). WHEN = the first "condition" band, EFFECT = the first "effect" band, each cleaned of
// its trailing full stop and then rewritten by the first matching pattern below. Patterns only change wording to the approved
// vocabulary (a running total is "Bonus", a card that Adds is a "+ card"). A band no pattern knows keeps its real text, with only
// the banned words swapped, and wraps small; the Inspector always has the full sentence.
const tidy = t => String(t || '').replace(/\s+/g, ' ').replace(/[.:]\s*$/, '').trim();
const noBanned = t => t.replace(/this pass[’']s (?:earlier card )?Sparks(?: so far)?/gi, 'Bonus').replace(/\bpass\b/gi, 'firing').replace(/\bequipped\b/gi, 'in your Row').replace(/\breplay(?:ed)?\b/gi, 'Encore').replace(/\bpayers?\b/gi, '+ cards');
const WHEN_RULES = [
  [/^(?:Your wisp touches a Spark|When your wisp absorbs a (?:passage )?Spark)$/i, 'Catch a Spark', true],
  [/^After (\d+) earlier actions pay Sparks in this pass$/i, 'After $1 + cards'],
  [/^After an earlier action pays Sparks in this pass$/i, 'After a + card'],
  [/^After a matching event earns a bonus$/i, 'After a Bonus'],
  [/^When a wave crosses an uncollected Spark$/i, 'Wave crosses a Spark'],
  [/^(?:From your Deck at Rest, unlock Grow|At Rest, choose Grow)$/i, 'At Rest'],
  [/^When Collector delivers a passage Spark$/i, 'Collector delivers'],
  [/^Paid Lift while falling.*$/i, 'Lift while falling'],
  [/^When Collector delivers a Cache$/i, 'Cache delivered'],
];
const EFFECT_RULES = [
  [/^Multiply this pass[’']s Sparks so far by ([\d.]+)$/i, '×$1 Bonus'],
  [/^Double this pass[’']s (?:earlier card )?Sparks(?: so far)?$/i, '×2 Bonus'],
  [/^Repeat the action on the card to the right twice$/i, 'Repeats next card ×2'],
  [/^Repeat the action on the card to the right (\d+) times$/i, 'Repeats next card ×$1'],
  [/^Repeat the action on the card to the right$/i, 'Repeats next card'],
  [/^Borrow the ability on the card to the right$/i, 'Copies next card'],
  [/^Finish this pass, then replay once from slot 1$/i, 'Row fires again'],
  [/^\+(\d+) maximum Sparks and a full meter$/i, '+$1 max Sparks'],
  [/^An amber chevron shows when .*$/i, 'Lift timing'],
  [/^Packing efficiency \+(\d+)%$/i, 'Packs +$1%'],
  [/^\+(\d+) maximum Sparks while equipped$/i, '+$1 max Sparks'],
  [/^Take 2 different actions$/i, 'Two actions at Rest'],
];
function cardLines(c) {
  const def = SKILL_CARDS[c.cardId], bands = getCardRuleBands(c, def), rule = getCardRowRule(def, c);
  const cond = bands.find(b => b.type === 'condition'), eff = bands.find(b => b.type === 'effect');
  let when, spark = false, fallback = false;
  if (cond) {
    const t = tidy(cond.text), hit = WHEN_RULES.find(([re]) => re.test(t));
    if (hit) {when = t.replace(hit[0], hit[1]);spark = !!hit[2];} else {when = noBanned(t);fallback = true;}
  } else when = rule?.operation === 'multiply' ? 'After + cards' : 'In your Row';
  const raw = tidy(eff?.text), hit = EFFECT_RULES.find(([re]) => re.test(raw));
  let effect;
  if (hit) effect = raw.replace(hit[0], hit[1]);
  else {
    effect = noBanned(raw);fallback = true;
    if (rule?.operation === 'add-sparks') effect = effect.replace(/\bSparks\b/, 'Bonus');
  }
  return {when, spark, effect, fallback, full: tidy(eff?.text), whenCard: spark ? when.replace(/ Spark$/, '') : when};
}
const WHEN_PHRASE = {'Catch a Spark': 'you catch a Spark', 'After a + card': 'a card that Adds fired before it', 'Wave crosses a Spark': 'a wave crosses a Spark', 'Collector delivers': 'Collector delivers a Spark'};
function cardSentence(c, L, mark) {
  const rule = getCardRowRule(SKILL_CARDS[c.cardId], c);
  const phrase = WHEN_PHRASE[L.when] || L.when.replace(/^./, m => m.toLowerCase());
  if (isRest(c)) return `At Rest: ${L.full}. It stays in the Reserve and never goes in your Row.`;
  if (mark?.cls === 'repeat') return `${mark.long} It shares that card's Uses.`;
  if (mark?.cls === 'encore') return 'After a Bonus, your Row fires once more from the left. Only one Encore fires.';
  if (rule?.operation === 'multiply') {
    const x = (L.effect.match(/×([\d.]+)/) || [])[1];
    return `Multiplies the Bonus so far${x ? ` by ${x}` : ''}. ${rule.minimumEarlierPayers ? `Fires only after ${rule.minimumEarlierPayers} cards that Add.` : 'Put it right of cards that Add.'}`;
  }
  if (rule?.operation === 'add-sparks') return `Adds ${L.effect} when ${phrase}.`;
  if (!rule) return `${L.effect}. Works while it is in your Row, without firing.`;
  return `${L.effect}.`;
}

function runV11() {
  const SLOTS = Math.min(5, Math.max(3, Number(query.get('slots')) || 4));
  let n = 0;const mk = id => makeSkillCard(id, `d11-${n++}`);
  state.row = SLOTS === 5 ? ['echo', 'spark-cache', 'kindling-bead', 'prism-lens', 'crescendo'].map(mk) : [...['echo', 'spark-cache', 'prism-lens'].map(mk), ...(SLOTS === 4 ? [null] : [])];
  state.reserve = (SLOTS === 5 ? ['body-spark', 'refrain', 'lift-guide', 'growth-seed', 'closing-chord'] : ['body-spark', 'refrain', 'lift-guide', 'kindling-bead', 'crescendo', 'growth-seed']).map(mk);
  Object.assign(state, {sel: {from: 'row', index: 0}, moving: false, melting: false, filter: 'all', msg: '', msgTone: ''});
  const S = state;
  const sheet = $('dk-sheet');
  document.title = 'Deck v1.1 · Design lab';
  $('deck').classList.add('dk11');$('deck').dataset.slots = String(SLOTS);
  sheet.innerHTML = `<div class="wb-pagelight" aria-hidden="true"></div>
  <div class="dk1-left">
   <h1 class="wb-title dk1-title">Deck</h1>
   <p class="dk1-result" id="dk1-result"></p>
   <p class="dk-wallet dk1-wallet" id="dk-wallet"><span class="dk-wallet-icon" id="dk-wallet-icon" aria-hidden="true"></span><b id="dk-wallet-value">8</b><small>Stored Sparks</small></p>
   <section class="dk1-rowzone" aria-label="Row. Your cards fire left to right."><div class="dk-row dk1-row" id="dk1-row"></div></section>
   <section class="dk1-reserve" aria-label="Reserve">
    <div class="dk1-chips" id="dk1-chips" role="group" aria-label="Reserve by rarity"></div>
    <div class="dk1-grid" id="dk1-grid" role="group" aria-label="Reserve cards"></div>
   </section>
   <div class="dk1-foot">
    <button type="button" class="wb-sign wb-sign-quiet dk1-done" id="dk1-done"><span class="wb-sign-text"><b>Done</b></span></button>
    <a class="wb-sign wb-sign-standard dk1-fire" id="dk1-fire" href="design-lab/cardflow.html?variant=v1.1-cardflow"><span class="wb-sign-text"><b>See it fire</b></span></a>
    <button type="button" class="wb-sign wb-sign-standard dk1-workshop" id="dk1-workshop" aria-label="Workshop. Appears only at Rest."><span class="wb-sign-text"><b>Workshop</b><small>Only at Rest</small></span></button>
   </div>
  </div>
  <aside class="dk1-insp" id="dk1-insp" aria-label="Card inspector"></aside>`;
  $('dk-wallet-icon').innerHTML = resourceSymbol('packed').replace(/role="img" aria-label="Stored Sparks"/, 'aria-hidden="true"');

  const selCard = () => S.sel ? (S.sel.from === 'row' ? S.row : S.reserve)[S.sel.index] || null : null;
  const pickInfo = () => S.moving && S.sel && selCard() ? S.sel : null;
  const movingCard = () => pickInfo() ? selCard() : null;
  const refOf = s => s ? `${s.from}-${s.index}` : '';
  const usesOf = c => Number.isFinite(c?.charges) ? {now: c.charges, max: getCardChargeCapacity(c)} : null;
  const countOf = r => S.reserve.filter(c => r === 'all' || rarityOf(c) === r).length;
  const markHTML = (mark, cls = '') => mark ? `<span class="dc-mark dc-mark-${mark.cls} ${cls}" aria-hidden="true">${mark.glyph}</span>` : '';
  const usesHTML = c => {const u = usesOf(c);return u ? `<span class="dc-uses" aria-hidden="true">${u.now}/${u.max}</span>` : '';};

  function rowCard(c, i) {
    const L = cardLines(c), r = rarityOf(c), mark = markOf(c);
    return `<span class="dc dc-card dc-r-${r}"><span class="dc-band"><i class="dc-no">${i + 1}</i><span class="dc-rarity">${RARITY_WORD[r]}</span></span>
     <span class="dc-art">${cardArt(c, {compact: true})}${markHTML(mark)}${usesHTML(c)}</span>
     <b class="dc-name">${esc(nameOf(c))}</b>
     <span class="dc-when" title="${esc(L.when)}"><span>${esc(L.whenCard)}</span>${L.spark ? SPARK_IMG : ''}</span>
     <b class="dc-effect ${L.fallback ? 'dc-effect-fb' : ''}">${esc(L.effect)}</b></span>`;
  }
  function tile(c) {
    const L = cardLines(c), r = rarityOf(c), mark = markOf(c);
    return `<span class="dc dc-tile dc-r-${r}"><span class="dc-band"><span class="dc-rarity">${RARITY_WORD[r]}</span><span class="dc-tail">${markHTML(mark, 'dc-mark-inline')}${usesHTML(c)}</span></span>
     <span class="dc-body"><span class="dc-art">${cardArt(c, {compact: true})}</span><span class="dc-text"><b class="dc-name">${esc(nameOf(c))}</b><b class="dc-effect ${L.fallback ? 'dc-effect-fb' : ''}">${esc(L.effect)}</b></span></span></span>`;
  }
  const ARR = ARROW.replace('width="16" height="20"', 'width="12" height="15"');

  let targets11 = [];
  function render(focusRef) {
    const act = document.activeElement;
    const keep = focusRef || (act && act !== document.body ? (act.id ? '#' + act.id : act.dataset?.card ? `[data-card="${act.dataset.card}"]` : act.dataset?.place ? `[data-place="${act.dataset.place}"]` : act.dataset?.filter ? `[data-filter="${act.dataset.filter}"]` : '') : '');
    if (S.sel && !selCard()) S.sel = null;
    if (!S.sel) {const i = S.row.findIndex(Boolean);S.sel = i >= 0 ? {from: 'row', index: i} : S.reserve.length ? {from: 'reserve', index: 0} : null;}
    if (countOf(S.filter) === 0) S.filter = 'all';
    const pick = pickInfo(), moving = movingCard();
    // Slots already cover every position a gap would, so v1.1 lights slots and the Reserve only (no sub-44px gap targets).
    targets = pick && !S.melting ? targetsFor(pick).filter(t => t.place.type !== 'gap') : [];targets11 = targets;
    const tmap = new Map(targets.map(t => [placeKey(t.place), t]));
    const printed = getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: S.row.length, mountedCards: S.row});
    const statuses = getEquippedCardStatuses({mountedCards: S.row});

    // Row
    let html = '';
    S.row.forEach((c, i) => {
      if (i > 0) {
        const g = tmap.get(`gap-${i}`);
        const label = g ? `Move ${nameOf(moving)} between ${nameOf(S.row[i - 1])} and ${nameOf(S.row[i])}, to place ${g.result.at + 1}` : 'Then';
        html += `<button type="button" class="dk-gap ${g ? 'dk-lit' : ''}" data-place="gap-${i}" ${g ? '' : 'disabled aria-hidden="true" tabindex="-1"'} aria-label="${esc(label)}">${g ? INSERT.replace('width="20" height="24"', 'width="16" height="20"') : ARR}</button>`;
      }
      const slotT = tmap.get(`slot-${i}`), isSel = S.sel?.from === 'row' && S.sel.index === i, isMove = isSel && S.moving;
      const plain = plainStatus(statuses[i]), mark = markOf(c), L = c ? cardLines(c) : null;
      let under = '', ucls = '';
      if (pick) {
        if (isMove) {under = '<span class="u-long">Moving</span><span class="u-short">Moving</span>';ucls = 'dk1-u-picked';}
        else if (slotT) {const sw = slotT.result.kind === 'swap';under = `<span class="u-long">${sw ? 'Swap here' : 'Move here'}</span><span class="u-short">${sw ? 'Swap' : 'Here'}</span>`;ucls = 'dk1-u-target';}
        else if (moving && isRest(moving)) {under = '<span class="u-long">Stays in Reserve</span><span class="u-short">No</span>';ucls = 'dk1-u-refuse';}
      } else if (c && plain) {
        if (plain.state === 'ready') {under = `<span class="dk-tick" aria-hidden="true">${TICK}</span>`;ucls = 'dk1-u-ready';}
        else {under = `<span class="dk-flag" aria-hidden="true">${plain.state === 'shared' ? '≈' : '!'}</span><span class="u-long u-text">${esc(plain.text)}</span>`;ucls = `dk1-u-warn dk1-u-${plain.state}`;}
      }
      const status = c ? (plain?.state === 'ready' ? 'Ready' : plain?.text) : '';
      let label = c ? `Place ${i + 1}: ${nameOf(c)}. ${RARITY_WORD[rarityOf(c)]}. ${L.when}: ${L.effect}.${mark ? ` ${mark.text}.` : ''}${status ? ` ${status}.` : ''}${isSel ? ' Selected.' : ''}` : `Place ${i + 1}: empty slot`;
      if (pick) label = isMove ? `${label} Moving. Press to put it down.` : slotT ? `Place ${i + 1}: ${slotT.result.kind === 'swap' ? `swap ${nameOf(moving)} with ${nameOf(c)}` : `move ${nameOf(moving)} here`}` : label;
      html += `<div class="dk-slot dk1-slot ${slotT ? 'dk-lit' : ''} ${isMove ? 'dk-picked' : ''} ${isSel ? 'dk1-sel' : ''}">
        <button type="button" class="dk-slot-btn" data-place="slot-${i}" data-card="${c ? 'row-' + i : ''}" aria-label="${esc(label)}" ${c ? `aria-pressed="${isSel}"` : ''} ${pick && !isMove && !slotT ? 'aria-disabled="true"' : ''}>
         ${c ? rowCard(c, i) : `<span class="dc dc-empty"><b>Empty slot ${i + 1}</b></span>`}</button>
        <p class="dk1-under ${ucls}" aria-hidden="true">${under}</p></div>`;
    });
    $('dk1-row').innerHTML = html;

    // Result line, straight from the resolver.
    $('dk1-result').innerHTML = esc(resultText(S.row)).replace(/(\+[\d.]+ Bonus|no Bonus)/, '<b>$1</b>');
    $('dk-wallet-value').textContent = String(S.wallet);
    $('dk-wallet').setAttribute('aria-label', `Wallet: ${S.wallet} Stored Sparks`);

    // Chips: the rarity overview and the filter.
    $('dk1-chips').innerHTML = ['all', 'common', 'rare', 'legendary'].map(f => `<button type="button" class="dk1-chip ${f !== 'all' ? 'dc-r-' + f : ''}" data-filter="${f}" aria-pressed="${S.filter === f}" aria-label="${f === 'all' ? 'All cards' : RARITY_WORD[f]}: ${countOf(f)} in Reserve${S.filter === f ? '. Showing' : ''}">${f === 'all' ? '' : '<i class="dk1-sw"></i>'}<span>${f === 'all' ? 'All' : RARITY_WORD[f]}</span><b>${countOf(f)}</b></button>`).join('');

    // Reserve grid.
    const reserveT = tmap.get('reserve');
    const grid = $('dk1-grid');
    grid.classList.toggle('dk-lit', !!reserveT);
    grid.innerHTML = (reserveT ? `<button type="button" class="dk1-tile dk1-drop" data-place="reserve" aria-label="Move ${esc(nameOf(moving))} to the Reserve">${INSERT}<span><b>Move here</b></span></button>` : '')
      + S.reserve.map((c, i) => [c, i]).filter(([c]) => S.filter === 'all' || rarityOf(c) === S.filter).map(([c, i]) => {
        const isSel = S.sel?.from === 'reserve' && S.sel.index === i, isMove = isSel && S.moving, L = cardLines(c), mark = markOf(c);
        const label = reserveT ? `Move ${nameOf(moving)} to the Reserve` : `${nameOf(c)}. ${RARITY_WORD[rarityOf(c)]}. ${L.when}: ${L.effect}.${mark ? ` ${mark.text}.` : ''} In Reserve.${isMove ? ' Moving. Press to put it down.' : isSel ? ' Selected.' : ''}`;
        return `<button type="button" class="dk1-tile ${isSel ? 'dk1-sel' : ''} ${isMove ? 'dk-picked' : ''} ${isRest(c) ? 'dk1-rest' : ''}" data-card="reserve-${i}" ${reserveT ? 'data-place="reserve"' : ''} aria-pressed="${isSel}" aria-label="${esc(label)}">${tile(c)}</button>`;
      }).join('');
    if (!grid.children.length) grid.innerHTML = '<p class="dk1-empty">No cards here</p>';
    document.querySelectorAll('#dk1-row svg[role="img"],#dk1-grid svg[role="img"]').forEach(svg => {svg.removeAttribute('role');svg.setAttribute('aria-hidden', 'true');});
    $('deck').classList.toggle('dk-has-pick', !!pick);
    $('deck').dataset.row = S.row.map(c => c ? c.cardId : '-').join(',');
    $('deck').dataset.result = String(solve(S.row).sparks);
    renderInspector(printed, statuses);
    if (keep) document.querySelector(keep)?.focus({preventScroll: true});
  }

  function renderInspector(printedRow, statuses) {
    const c = selCard(), box = $('dk1-insp');
    if (!c) {box.innerHTML = '<p class="dk1-empty">No cards. Nothing to inspect.</p>';return;}
    const r = rarityOf(c), L = cardLines(c), mark = markOf(c), u = usesOf(c);
    const inRow = S.sel.from === 'row';
    const plain = inRow ? plainStatus(statuses[S.sel.index]) : null;
    const where = inRow ? `Row · place ${S.sel.index + 1}` : 'Reserve';
    const facts = [['What it does', esc(cardSentence(c, L, mark))], ['When', `${L.spark ? SPARK_IMG : ''}${esc(L.when)}`]];
    if (u) facts.push(['Uses', `${u.now} of ${u.max} left`]);
    const warn = plain && plain.state !== 'ready' ? `<div class="dk1-warn"><dt>Place</dt><dd><span class="dk-flag" aria-hidden="true">${plain.state === 'shared' ? '≈' : '!'}</span>${esc(plain.text)}</dd></div>` : '';
    const moving = S.moving, value = getCardMeltValue(c);
    let msg = S.msg, tone = S.msgTone;
    if (moving && !msg) {msg = isRest(c) ? `${nameOf(c)} is a Rest card: it works from the Reserve` : 'Tap a lit place';tone = isRest(c) ? 'dk1-msg-rest' : 'dk1-msg-hint';}
    box.innerHTML = `<div class="dk1-ib dc-r-${r}"><b>${RARITY_WORD[r]}</b><span>${where}</span></div>
     <h2 class="dk1-name" id="dk1-name" tabindex="-1">${esc(nameOf(c))}</h2>
     <div class="dk1-main"><div class="dk1-face" id="dk1-face" aria-hidden="true"></div>
      <div class="dk1-facts"><dl class="dk1-list">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}${warn}</dl>
      ${msg ? `<p class="dk1-msg ${tone || ''}">${esc(msg)}</p>` : ''}</div></div>
     ${S.melting ? `<div class="dk1-melt" role="group" aria-labelledby="dk1-melt-text"><p class="dk1-melt-text" id="dk1-melt-text">You get <b>+${value} Stored Sparks</b>. ${esc(nameOf(c))} is gone for good.</p>
        <div class="dk1-actions"><button type="button" class="wb-sign wb-sign-quiet" id="dk1-keep" aria-label="Keep card"><span class="wb-sign-text"><b>Keep</b></span></button>
        <button type="button" class="wb-sign wb-sign-danger" id="dk1-meltgo" aria-label="Melt ${esc(nameOf(c))} for ${value} Stored Sparks. This cannot be undone."><span class="wb-sign-text"><b>Melt</b></span></button></div></div>`
      : `<div class="dk1-actions"><button type="button" class="wb-sign wb-sign-standard" id="dk1-move" aria-label="${moving ? `Cancel move: put ${esc(nameOf(c))} down` : `Move ${esc(nameOf(c))}: lights every place it can go`}"><span class="wb-sign-text"><b>${moving ? 'Cancel' : 'Move'}</b></span></button>
        <button type="button" class="wb-sign wb-sign-quiet" id="dk1-melt" aria-label="Melt ${esc(nameOf(c))}: shows what you get first"><span class="wb-sign-text"><b>Melt…</b></span></button></div>`}`;
    // The game's real full face (help links made inert; the glossary is not part of this preview).
    const printed = inRow ? printedRow[S.sel.index] : describeSkillCard(c);
    const faceBox = $('dk1-face');
    faceBox.innerHTML = cardFace(printed, {compact: false}).replace(/<button type="button"/g, '<span').replace(/<\/button>/g, '</span>').replace(/ aria-haspopup="dialog"/g, '').replace(/: help"/g, '"');
    faceBox.querySelector('.card-help')?.remove();
    faceBox.querySelectorAll('.card-term-icon-spark, .card-term-icon-meter').forEach(icon => {icon.innerHTML = SPARK_IMG;});
    faceBox.querySelectorAll('[tabindex]').forEach(el => el.removeAttribute('tabindex'));
    faceBox.querySelectorAll('svg[role="img"]').forEach(svg => {svg.removeAttribute('role');svg.setAttribute('aria-hidden', 'true');});
    $('dk1-move')?.addEventListener('click', () => S.moving ? cancelMove() : startMove());
    $('dk1-melt')?.addEventListener('click', askMelt);
    $('dk1-keep')?.addEventListener('click', keepCard);
    $('dk1-meltgo')?.addEventListener('click', confirmMelt);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const firstSentence = t => (t.match(/^.*?[.!?](?:\s|$)/) || [t])[0].trim();
  function select(from, index) {
    const c = (from === 'row' ? S.row : S.reserve)[index];
    if (!c) return;
    S.sel = {from, index};S.moving = false;S.melting = false;S.msg = '';S.msgTone = '';
    render(`[data-card="${from}-${index}"]`);
    announce(`${nameOf(c)} selected. ${RARITY_WORD[rarityOf(c)]}. ${firstSentence(cardSentence(c, cardLines(c), markOf(c)))}`);
  }
  function startMove() {
    const c = selCard();
    if (!c) return;
    S.moving = true;S.melting = false;S.msg = '';S.msgTone = '';
    render('#dk1-move');
    const k = targets11.length;
    announce(isRest(c) ? `${nameOf(c)} is a Rest card and works from the Reserve, so it can't go in your row. Press Cancel move.`
      : `Moving ${nameOf(c)}. ${k} ${k === 1 ? 'place' : 'places'} lit. Use the arrow keys or tap a place, or Cancel move.`);
    if (!reduced.matches) document.querySelector(`[data-card="${refOf(S.sel)}"]`)?.animate([{transform: 'translateY(0)'}, {transform: 'translateY(-3px)'}], {duration: 120, easing: 'steps(2,end)'});
  }
  function cancelMove({silent = false} = {}) {
    if (!S.moving) return;
    const c = selCard();S.moving = false;S.msg = '';
    render('#dk1-move');
    if (!silent) announce(`${nameOf(c)} put down.`);
  }
  function drop(place) {
    const pk = pickInfo();
    if (!pk) return;
    const c = selCard();
    if (place.type !== 'reserve' && isRest(c)) {refuse(c);return;}
    const result = placeResult(pk, place);
    if (!result) return;
    S.row = result.row;S.reserve = result.reserve;S.moving = false;S.melting = false;S.msg = '';
    S.sel = result.kind === 'reserve' ? {from: 'reserve', index: 0} : {from: 'row', index: result.at};
    const res = resultText(S.row);
    const what = result.kind === 'reserve' ? `${nameOf(c)} moved to the Reserve.`
      : result.kind === 'swap' ? `${nameOf(c)} swapped with ${nameOf(result.out)}: ${nameOf(c)} is in place ${result.at + 1}, ${nameOf(result.out)} is in the Reserve.`
      : `${nameOf(c)} moved to place ${result.at + 1}.`;
    render(`[data-card="${refOf(S.sel)}"]`);
    announce(`${what} ${res}.`);
    if (!reduced.matches) document.querySelector(`[data-card="${refOf(S.sel)}"]`)?.animate([{transform: 'translateY(-5px)'}, {transform: 'none'}], {duration: 200, easing: 'steps(3,end)'});
  }
  function refuse(c) {
    S.msg = `${nameOf(c)} is a Rest card: it works from the Reserve, not the row`;S.msgTone = 'dk1-msg-rest';
    render();
    announce(`${nameOf(c)} can't go in your row. Rest cards work from the Reserve.`);
    S.msg = '';S.msgTone = '';
    const node = document.querySelector('.dk-picked');
    if (node && !reduced.matches) node.animate([{transform: 'translateX(0)'}, {transform: 'translateX(-4px)'}, {transform: 'translateX(4px)'}, {transform: 'translateX(0)'}], {duration: 240, easing: 'steps(4,end)'});
  }
  function askMelt() {
    const c = selCard();
    if (!c) return;
    S.moving = false;S.melting = true;S.msg = '';
    render('#dk1-keep');
    announce(`Melt ${nameOf(c)}? You get ${getCardMeltValue(c)} Stored Sparks. It is gone for good.`);
    $('dk1-keep')?.focus({preventScroll: true});
  }
  function keepCard() {
    S.melting = false;render('#dk1-melt');
    announce(`Kept ${nameOf(selCard())}.`);
    $('dk1-melt')?.focus({preventScroll: true});
  }
  function confirmMelt() {
    const sel = S.sel, c = selCard();
    if (!sel || !c) return;
    const value = getCardMeltValue(c), was = S.wallet;
    if (sel.from === 'row') S.row[sel.index] = null; else S.reserve.splice(sel.index, 1);
    S.wallet += value;S.melting = false;S.moving = false;
    S.sel = sel.from === 'reserve' && S.reserve.length ? {from: 'reserve', index: Math.min(sel.index, S.reserve.length - 1)} : null;
    S.msg = `Melted ${nameOf(c)} · +${value} Stored Sparks`;S.msgTone = 'dk1-msg-receipt';
    render('#dk1-melt');
    announce(`Melted ${nameOf(c)}. Plus ${value} Stored Sparks: ${was} to ${S.wallet}. ${resultText(S.row)}.`);
    if (!reduced.matches) $('dk-wallet').animate([{transform: 'scale(1.12)'}, {transform: 'none'}], {duration: 260, easing: 'steps(4,end)'});
  }

  // ── Input: tap, keyboard, drag ─────────────────────────────────────────────
  function activate(node) {
    if (S.melting) return;
    const cardRef = node.dataset.card, placeRef = node.dataset.place, pk = pickInfo();
    if (pk) {
      if (cardRef && cardRef === refOf(pk)) {cancelMove();return;}
      if (placeRef) {
        const place = placeFromKey(placeRef);
        if (targets11.some(t => placeKey(t.place) === placeRef)) {drop(place);return;}
        if (place.type !== 'reserve' && isRest(movingCard())) {refuse(movingCard());return;}
      }
      if (cardRef) {const [from, i] = cardRef.split('-');select(from, Number(i));}
      return;
    }
    if (cardRef) {const [from, i] = cardRef.split('-');select(from, Number(i));return;}
    if (placeRef?.startsWith('slot-')) {
      S.msg = 'Select a card, then Move it here';S.msgTone = 'dk1-msg-hint';render();S.msg = '';
      announce('This place is empty. Select a card, then choose Move.');
    }
  }
  let suppressClick = false;
  sheet.addEventListener('click', event => {
    if (suppressClick) {suppressClick = false;return;}
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      S.filter = filter.dataset.filter;render(`[data-filter="${S.filter}"]`);
      announce(`${S.filter === 'all' ? 'All cards' : RARITY_WORD[S.filter]}: ${countOf(S.filter)} in Reserve.`);return;
    }
    const node = event.target.closest('[data-card],[data-place]');
    if (node && !node.disabled) activate(node);
  });
  $('dk1-done').addEventListener('click', () => {S.msg = 'In the game, Done returns to where you opened the Deck';S.msgTone = 'dk1-msg-hint';render();S.msg = '';announce('Done returns to where you opened the Deck.');});
  $('dk1-workshop').addEventListener('click', () => {S.msg = 'The Workshop button appears only at Rest';S.msgTone = 'dk1-msg-hint';render();S.msg = '';announce('The Workshop appears only at Rest. It opens Forge, Improve and Evolve.');});

  document.addEventListener('keydown', event => {
    if (S.melting) {if (event.key === 'Escape') {event.preventDefault();keepCard();}return;}
    if (!S.moving) return;
    if (event.key === 'Escape') {event.preventDefault();cancelMove();return;}
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const nodes = [document.querySelector(`[data-card="${refOf(S.sel)}"]`), ...targets11.map(t => document.querySelector(`[data-place="${placeKey(t.place)}"]`))].filter(Boolean);
    if (nodes.length < 2) return;
    event.preventDefault();
    const at = nodes.indexOf(document.activeElement.closest('[data-card],[data-place]'));
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const next = nodes[((at < 0 ? 0 : at) + step + nodes.length) % nodes.length];
    next.focus();next.scrollIntoView?.({block: 'nearest', inline: 'nearest'});
  });

  // Drag: a card still moves directly. It selects, starts a move, and follows the pointer.
  let drag = null;
  sheet.addEventListener('pointerdown', event => {
    const node = event.target.closest('[data-card]');
    if (!node || !node.dataset.card || event.button !== 0 || S.melting) return;
    drag = {node, ref: node.dataset.card, x: event.clientX, y: event.clientY, id: event.pointerId, moved: false, ghost: null};
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 10) return;
    if (!drag.moved) {
      drag.moved = true;
      const [from, i] = drag.ref.split('-');
      if (!S.moving || refOf(S.sel) !== drag.ref) {S.sel = {from, index: Number(i)};S.msg = '';startMove();}
      const source = document.querySelector(`[data-card="${drag.ref}"]`);
      const box = source.getBoundingClientRect();
      const ghost = source.querySelector('.dc').cloneNode(true);
      ghost.classList.add('dk-ghost');ghost.style.width = `${Math.round(box.width)}px`;
      drag.ghost = document.createElement('div');drag.ghost.className = 'dk-ghost-wrap';drag.ghost.append(ghost);
      drag.offset = {x: drag.x - box.left, y: drag.y - box.top};
      document.body.append(drag.ghost);
      event.preventDefault();
    }
    drag.ghost.style.transform = `translate(${Math.round(event.clientX - drag.offset.x)}px,${Math.round(event.clientY - drag.offset.y)}px)`;
    const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('[data-place]')).find(Boolean);
    document.querySelectorAll('.dk-over').forEach(el => el.classList.remove('dk-over'));
    if (over && targets11.some(t => placeKey(t.place) === over.dataset.place)) (over.closest('.dk1-slot') || over.closest('.dk1-grid') || over).classList.add('dk-over');
  });
  const endDrag = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const {moved, ghost} = drag;drag = null;
    if (!moved) return;
    suppressClick = true;setTimeout(() => {suppressClick = false;}, 0);
    ghost?.remove();
    document.querySelectorAll('.dk-over').forEach(el => el.classList.remove('dk-over'));
    if (event.type !== 'pointerup') {cancelMove();return;}
    const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('[data-place]')).find(Boolean);
    const key = over?.dataset.place;
    if (key && targets11.some(t => placeKey(t.place) === key)) drop(placeFromKey(key));
    else if (key && key !== 'reserve' && isRest(movingCard())) refuse(movingCard());
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  render();
  announce(`Deck. ${nameOf(selCard())} selected. ${RARITY_WORD[rarityOf(selCard())]}.`);
  window.deck = {state, solve, resultText, placeResult, targetsFor, cardLines, get targets() {return targets11;}, countOf};
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2.0-deck: two screens with two jobs, one page, two tabs.
   ROW  = what fires and in what order: the travelling-Spark track of the card explainer (v2.x-cardflow).
   DECK = everything you own: a full-width grid to understand and prune (sort, filter, melt).
   No preview panel: every card has an eye that opens one overlay with the game's real full face.
   Numbers, statuses and texts come from the same real functions as v1.0/v1.1.
   ═══════════════════════════════════════════════════════════════════════════ */
function runV20() {
  const SLOTS = Math.min(5, Math.max(3, Number(query.get('slots')) || 4));
  let n = 0;const mk = id => makeSkillCard(id, `d20-${n++}`);
  // Sample deck: 5 Common, 3 Rare, 1 Legendary (Growth Seed is the Rest card; Crescendo is in it).
  const ALL = ['echo', 'spark-cache', 'prism-lens', 'kindling-bead', 'crescendo', 'body-spark', 'lift-guide', 'refrain', 'growth-seed'];
  const ROWS = {3: ['echo', 'spark-cache', 'prism-lens'], 4: ['echo', 'spark-cache', 'prism-lens', null], 5: ['echo', 'spark-cache', 'kindling-bead', 'prism-lens', 'crescendo']};
  const S = {
    row: ROWS[SLOTS].map(id => id ? mk(id) : null),
    reserve: ALL.filter(id => !ROWS[SLOTS].includes(id)).map(mk),
    wallet: 8, tab: query.get('tab') === 'deck' ? 'deck' : 'row',
    filter: 'all', sort: 'rarity',
    pick: null,      // Deck tab pick mode: the row place being filled (from Swap or an empty place)
    placing: null,   // Row tab place mode: the card (uid) being put in the row (from "Put in row…")
    note: '', noteTone: '', reading: null, melting: false, played: false,
  };
  state.v20 = S;

  // ── The meter and the Trigger: the same set-up as the card explainer (meter low, so the whole Bonus fits).
  const MAX_FLAME = getGlowCapacity({});
  const START_SPARKS = 6, START_FLAME = START_SPARKS / GLOW_DISPLAY_SCALE;
  const EV = Object.freeze({kind: CARD_ROW_EVENTS.body, pickupKind: 'light', meterFraction: START_FLAME / MAX_FLAME});
  function solve2(row) {
    const listens = hasCardRowEvent(row, EV.kind);
    const receipt = previewCardRow({cards: row}, listens ? EV : {...EV, eligible: false});
    const gainFlame = Math.min(receipt.sparks * CARD_UNIT, Math.max(0, MAX_FLAME - START_FLAME));
    return {receipt, steps: receipt.steps, sparks: receipt.sparks, gainFlame, gain: glowPoints(gainFlame)};
  }
  let sol = solve2(S.row);

  const short = c => nameOf(c).replace(/\s*\+\d+$/, '');
  const rarityWord = c => RARITY_WORD[rarityOf(c)];
  const all = () => [...S.row.filter(Boolean), ...S.reserve];
  const byUid = uid => all().find(c => c.instanceId === uid) || null;
  const rowIndex = c => S.row.indexOf(c);
  

  // ── Per place: does this card act here, on this Trigger, in this order? Asked of the resolver's own steps.
  const minPayers = c => Number(getCardRowRule(SKILL_CARDS[c.cardId], c)?.minimumEarlierPayers) || 0;
  function whyIdle(slot, step) {
    const c = S.row[slot];
    switch (step?.skipReason) {
      case 'empty-subtotal': case 'needs-two-earlier-payers':
        return minPayers(c) >= 2 ? {why: 'it needs two cards that Add before it', fix: 'Move it after two + cards.'} : {why: 'there is no Bonus to multiply yet', fix: 'Move it after a + card.'};
      case 'needs-earlier-payer': return {why: 'it needs a card that Adds before it', fix: 'Move it after a + card.'};
      case 'no-earlier-payout': return {why: 'there is nothing to repeat yet', fix: 'Move it after a + card.'};
      case 'incompatible-neighbor': return S.row[slot + 1] ? {why: `it can't repeat ${short(S.row[slot + 1])}`, fix: 'Put a + card to its right.'} : {why: 'there is no card to its right', fix: 'Put a + card to its right.'};
      case 'exhausted-source': return {why: 'it has no Uses left', fix: ''};
      case 'replay-limit': return {why: 'only one Encore fires', fix: ''};
      case 'no-productive-action': return {why: 'there is no Bonus yet, so no Encore', fix: 'Put cards that Add before it.'};
      default: return {why: 'it does not act when you catch a Spark', fix: ''};
    }
  }
  function placeInfo(slot) {
    const c = S.row[slot];
    if (!c) return {kind: 'empty', plate: ''};
    const def = SKILL_CARDS[c.cardId], rule = getCardRowRule(def, c);
    const fires = !!rule || ['echo', 'chameleon', 'refrain'].includes(def.kind);
    if (!fires) return {kind: 'passive', plate: 'Always on'};
    const steps = sol.steps.filter(st => st.slot === slot), ok = steps.find(st => st.success);
    if (!ok) return {kind: 'idle', plate: 'No effect here', ...whyIdle(slot, steps.filter(st => !st.success).pop())};
    const plate = ok.operation === 'multiply' ? `×${num(ok.multiplier)}` : ok.operation === 'replay-row' ? 'Encore'
      : ok.copiedBy ? 'Repeats next' : `+${num(ok.amount)}`;
    return {kind: 'act', plate, step: ok};
  }
  function hereLine(c) {
    if (isRest(c)) return 'Rest card: it works from the Deck at Rest and never goes in the row.';
    const slot = rowIndex(c);
    if (slot < 0) return 'In your Deck, not in the row: it does nothing until you put it in a place.';
    const info = placeInfo(slot), st = info.step;
    if (info.kind === 'passive') return `Place ${slot + 1}: always on while it is in your row. It does not fire.`;
    if (info.kind === 'idle') return `Place ${slot + 1}: no effect, because ${info.why}.${info.fix ? ` ${info.fix}` : ''}`;
    if (st.operation === 'multiply') return st.multiplier === 2 ? `Place ${slot + 1}: doubles the Bonus, ${num(st.before)} to ${num(st.after)}.` : `Place ${slot + 1}: multiplies ${num(st.before)} by ${num(st.multiplier)}, to ${num(st.after)}.`;
    if (st.operation === 'replay-row') return `Place ${slot + 1}: after a Bonus, your row fires once more.`;
    if (st.copiedBy) return `Place ${slot + 1}: repeats ${short(S.row[slot + 1])}, adding ${num(st.amount)}: ${num(st.before)} to ${num(st.after)}.`;
    return `Place ${slot + 1}: adds ${num(st.amount)} to the Bonus, ${num(st.before)} to ${num(st.after)}.`;
  }

  // ── Pixel art, drawn from letter grids as crisp rects (the eye and warning are the explainer's own).
  const pixelSvg = (rows, fill, size, grid) => {
    const paths = {};
    rows.forEach((row, y) => [...row].forEach((ch, x) => {if (fill[ch]) (paths[ch] ||= []).push(`M${x} ${y}h1v1h-1z`);}));
    return `<svg viewBox="0 0 ${grid} ${grid}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([ch, d]) => `<path fill="${fill[ch]}" d="${d.join('')}"/>`).join('')}</svg>`;
  };
  // 16-pixel grid; the eye uses rows 4 to 11, drawn at 2× (32×16).
  const EYE = pixelSvg(['................', '................', '................', '................', '....IIIIIIII....', '..IILLLBBLLLII..', '.ILLLBHBBBBLLLI.', 'ILLLBBBIIBBBLLLI', 'ILLLBBBIIBBBLLLI', '.ILLLBBBBBBLLLI.', '..IILLLBBLLLII..', '....IIIIIIII....', '................', '................', '................', '................'], {I: '#2a1d12', L: '#f3e3b3', B: '#8a6d44', H: '#fff6d8'}, 32, 16).replace('viewBox="0 0 16 16" width="32" height="32"', 'viewBox="0 4 16 8" width="32" height="16"');
  const WARN = pixelSvg(['.....II.....', '....IYYI....', '....IYYI....', '...IYYYYI...', '...IYIIYI...', '..IYYIIYYI..', '..IYYIIYYI..', '.IYYYYYYYYI.', '.IYYYIIYYYI.', 'IYYYYYYYYYYI', 'IIIIIIIIIIII', '............'], {I: '#2a1d12', Y: '#e6c77c'}, 12, 12);
  // "the next card", as a small arrow pointing right (the row's own arrow, at 1×).
  const NEXT = '<svg viewBox="0 0 8 10" width="8" height="10" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h2v1h1v1h1v1h1v1h1v2H6v1H5v1H4v1H3v1H1V8h1V7h1V6h1V4H3V3H2V2H1z"/></svg>';
  const PLUS = pixelSvg(['........', '...II...', '...II...', '.IIIIII.', '.IIIIII.', '...II...', '...II...', '........'], {I: 'currentColor'}, 16, 8);
  const inert = html => html.replace(/<button type="button"/g, '<span').replace(/<\/button>/g, '</span>').replace(/ aria-haspopup="dialog"/g, '').replace(/: help"/g, '"');

  // ── Shell ────────────────────────────────────────────────────────────────────
  const root = $('deck'), sheet = $('dk-sheet');
  document.title = 'Deck v2.0 · Design lab';
  root.className = 'dk dk2 wb-ground wb-t2 wb-t3 wb-flat wb-atlas wb-a2 wb-go';
  root.dataset.slots = String(SLOTS);
  sheet.innerHTML = `<div class="wb-pagelight" aria-hidden="true"></div>
  <header class="dk2-head" id="dk2-head">
   <button type="button" class="wb-sign wb-sign-quiet dk2-done" id="dk2-done"><span class="wb-sign-text"><b>Done</b></span></button>
   <div class="dk2-tabs" role="tablist" aria-label="Deck screens">
    <button type="button" class="dk2-btn dk2-tab" role="tab" id="dk2-tab-row" aria-controls="dk2-rowpanel" data-tab="row"><span>Row</span></button>
    <button type="button" class="dk2-btn dk2-tab" role="tab" id="dk2-tab-deck" aria-controls="dk2-deckpanel" data-tab="deck"><span>Deck</span></button>
   </div>
   <div class="dk2-context" id="dk2-context"><p class="dk2-note" id="dk2-note"></p>
    <button type="button" class="wb-sign wb-sign-quiet dk2-cancel" id="dk2-placecancel" hidden><span class="wb-sign-text"><b>Cancel</b></span></button></div>
   <p class="dk-wallet dk2-wallet" id="dk-wallet"><span class="dk-wallet-icon" id="dk-wallet-icon" aria-hidden="true"></span><b id="dk-wallet-value">8</b><small>Stored Sparks</small></p>
  </header>
  <section class="dk2-panel dk2-rowpanel" id="dk2-rowpanel" role="tabpanel" aria-labelledby="dk2-tab-row">
   <div class="dk2-stage" id="dk2-stage" role="group" aria-label="Your row. When you catch a Spark, your cards fire left to right.">
    <div class="dk2-track" id="dk2-track" aria-hidden="true"></div>
    <div class="dk2-anchor dk2-start" aria-hidden="true"><span class="dk2-start-label">You catch a Spark</span><img class="dk2-orb" src="design-lab/assets/orb-wisp.svg" width="32" height="32" alt="" draggable="false"></div>
    <div class="dk2-stations" id="dk2-stations"></div>
    <div class="dk2-anchor dk2-meter" id="dk2-meter"><span class="dk2-meter-label" aria-hidden="true">Spark Meter</span><div class="dk2-gauge" id="dk2-gauge" aria-hidden="true"></div>
     <div class="dk2-meter-info"><b id="dk2-meter-value"></b><small id="dk2-meter-gain"></small></div></div>
    <button type="button" class="wb-sign wb-sign-primary dk2-play" id="dk2-play"><span class="wb-sign-text"><b>Play</b></span></button>
    <p class="dk2-result" id="dk2-result"></p>
    <div class="dk2-spark" id="dk2-spark" aria-hidden="true"><img id="dk2-spark-img" src="design-lab/assets/spark-a.svg" width="16" height="16" alt="" draggable="false"><b class="dk2-tag" id="dk2-tag"></b></div>
   </div>
  </section>
  <section class="dk2-panel dk2-deckpanel" id="dk2-deckpanel" role="tabpanel" aria-labelledby="dk2-tab-deck">
   <div class="dk2-bar" id="dk2-bar"></div>
   <div class="dk2-grid" id="dk2-grid" role="group" aria-label="All your cards"></div>
  </section>`;
  $('dk-wallet-icon').innerHTML = resourceSymbol('packed').replace(/role="img" aria-label="Stored Sparks"/, 'aria-hidden="true"');
  const stage = $('dk2-stage');

  // ── Row tab ──────────────────────────────────────────────────────────────────
  function renderRow() {
    sol = solve2(S.row);
    const printed = getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: S.row.length, mountedCards: S.row});
    const placing = S.placing ? byUid(S.placing) : null;
    stage.style.setProperty('--n', String(SLOTS));
    $('dk2-stations').innerHTML = S.row.map((c, i) => {
      const info = placeInfo(i), col = `grid-column:${i + 2}`;
      const mark = c ? markOf(c) : null;
      const lit = placing ? ' dk2-lit' : '';
      const notch = `<div class="dk2-anchor dk2-notch" style="${col}" aria-hidden="true"><i></i></div>`;
      if (!c) {
        return `<div class="dk2-station dk2-empty${lit}" data-slot="${i}" style="${col}">
          <span class="dk2-eyerow"></span>
          <button type="button" class="dk2-btn dk2-card dk2-addcard" data-slot="${i}" aria-label="${placing ? `Put ${esc(nameOf(placing))} in place ${i + 1}` : `Place ${i + 1} is empty. Add a card`}"><span class="dk2-addskin">${PLUS}<b>${placing ? 'Put here' : 'Add a card'}</b></span></button>
          <span class="dk2-plate dk2-plate-empty" aria-hidden="true"></span></div>
          ${notch}<button type="button" class="wb-sign wb-sign-standard dk2-swap" data-slot="${i}" aria-label="Add a card to place ${i + 1}"><span class="wb-sign-text"><b>Add</b></span></button>`;
      }
      const label = placing ? `Put ${nameOf(placing)} in place ${i + 1}. ${nameOf(c)} goes back to the Deck`
        : `Place ${i + 1}: ${nameOf(c)}, ${rarityWord(c)}. ${info.kind === 'idle' ? `No effect here: ${info.why}` : info.plate}. Drag to reorder, or open it`;
      return `<div class="dk2-station dk2-k-${info.kind}${lit}" data-slot="${i}" style="${col}">
        <span class="dk2-eyerow"><button type="button" class="dk2-btn dk2-eye" data-slot="${i}" aria-haspopup="dialog" aria-label="Read ${esc(nameOf(c))}">${EYE}</button></span>
        <button type="button" class="dk2-btn dk2-card" data-slot="${i}" aria-label="${esc(label)}">${mark && !isRest(c) ? `<span class="dk2-mark dk-mark-${mark.cls}" aria-hidden="true">${mark.cls === 'add' || mark.cls === 'mul' || mark.cls === 'repeat' ? mark.glyph : ''}</span>` : ''}${cardFace(printed[i], {compact: true})}${placing ? '<span class="dk2-puthere" aria-hidden="true">Put here</span>' : ''}</button>
        <span class="dk2-plate dk2-plate-${info.kind}${/^[+×]/.test(info.plate) ? '' : ' dk2-plate-word'}" aria-hidden="true">${info.kind === 'idle' ? `<i class="dk2-warn">${WARN}</i>` : ''}${info.plate === 'Repeats next' ? `<b class="pl-long">Repeats next</b><b class="pl-short">Repeats</b><i class="pl-short dk2-next">${NEXT}</i>` : `<b>${esc(info.plate)}</b>`}</span></div>
        ${notch}<button type="button" class="wb-sign wb-sign-standard dk2-swap" data-slot="${i}" aria-label="Swap ${esc(nameOf(c))} in place ${i + 1} for another card"><span class="wb-sign-text"><b>Swap</b></span></button>`;
    }).join('');
    $('dk2-stations').querySelectorAll('.skill-card').forEach(node => {node.setAttribute('aria-hidden', 'true');node.querySelectorAll('[role="img"]').forEach(el => el.removeAttribute('role'));});
    // Swap buttons sit in the bottom row of the stage grid.
    $('dk2-stations').querySelectorAll('.dk2-swap').forEach(btn => {btn.style.gridColumn = String(Number(btn.dataset.slot) + 2);});
    $('dk2-result').innerHTML = sol.sparks > 0 ? `<b>+${num(sol.sparks)}</b> Bonus` : '<b>No</b> Bonus';
    $('dk2-result').setAttribute('aria-label', sol.sparks > 0 ? `When you catch a Spark: plus ${num(sol.sparks)} Bonus` : 'When you catch a Spark: no Bonus');
    $('dk2-play').setAttribute('aria-label', `Play: watch a Spark pass through your row. Result: ${sol.sparks > 0 ? `+${num(sol.sparks)}` : 'no'} Bonus`);
    stage.classList.toggle('dk2-placing', !!placing);
    root.dataset.row = S.row.map(c => c ? c.cardId : '-').join(',');
    root.dataset.result = String(sol.sparks);
    meter(false);
    sizeStage();
  }
  function meter(full) {
    const flame = START_FLAME + (full ? sol.gainFlame : 0);
    $('dk2-gauge').innerHTML = glowGaugeMarkup({flame, skillSystem: CARD_SYSTEM, isTutorial: true});
    const startU = glowGaugeUnits(START_FLAME, MAX_FLAME), nowU = glowGaugeUnits(flame, MAX_FLAME);
    $('dk2-gauge').querySelectorAll('.glow-unit').forEach((u, i) => u.classList.toggle('dk2-gain', full && i >= startU.filled && i < nowU.filled));
    $('dk2-meter-value').textContent = `${nowU.value}/${nowU.maxValue}`;
    $('dk2-meter-gain').textContent = full && sol.gain > 0 ? `+${sol.gain}` : '';
    $('dk2-meter').classList.toggle('dk2-meter-on', full);
  }
  // The card size follows the room: the tallest whole-pixel face that fits the stage height and the column width.
  const geo = {};
  function sizeStage() {
    if (S.tab !== 'row') return;
    const cs = getComputedStyle(stage);
    const fixed = ['--eye', '--plate', '--ga', '--gb', '--swap'].reduce((sum, v) => sum + (parseFloat(cs.getPropertyValue(v)) || 0), 0);
    const h = stage.clientHeight, w = stage.clientWidth;
    const endl = parseFloat(cs.getPropertyValue('--endl')) || 96, endr = parseFloat(cs.getPropertyValue('--endr')) || 120;
    const colW = (w - endl - endr) / SLOTS;
    const card = Math.max(80, Math.min(parseFloat(cs.getPropertyValue('--card-max')) || 150, Math.floor(h - fixed - 10), Math.floor((colW - 10) * 7 / 5)));
    stage.style.setProperty('--card', `${card}px`);
    measure();
  }
  function measure() {
    const base = stage.getBoundingClientRect();
    if (!base.width) return;
    const centre = el => {const r = el.getBoundingClientRect();return {x: Math.round(r.left + r.width / 2 - base.left), y: Math.round(r.top + r.height / 2 - base.top)};};
    geo.orb = centre(stage.querySelector('.dk2-orb'));
    geo.gauge = centre(stage.querySelector('#flame-meter') || $('dk2-gauge'));
    geo.notches = [...stage.querySelectorAll('.dk2-notch>i')].map(centre);
    geo.y = geo.orb.y;
    const track = $('dk2-track');
    track.style.left = `${geo.orb.x}px`;track.style.width = `${geo.gauge.x - geo.orb.x}px`;track.style.top = `${geo.y - 3}px`;
    if (!playing) parkSpark();
  }
  // ── Play: one Spark rides the track; each card that acts changes the Bonus as it passes; idle cards are passed by.
  let playing = 0, playTimer = 0;
  // The approved Spark icon is drawn only at 16 or 32 here (48 would cover the track): it grows once the Bonus has built up.
  const sizeFor = k => k >= 2 ? 32 : 16;
  function sparkAt(x, size, bonus, poured = false, animate = true) {
    const spark = $('dk2-spark'), img = $('dk2-spark-img');
    spark.classList.toggle('dk2-moving', animate && !reduced.matches);
    spark.style.transform = `translate(${x}px,${geo.y}px)`;
    img.width = img.height = size;img.style.width = img.style.height = `${size}px`;img.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    $('dk2-tag').textContent = bonus === null ? '' : `Bonus ${num(bonus)}`;
    $('dk2-tag').style.left = `${size / 2 + 4}px`;
    spark.classList.toggle('dk2-poured', poured);
    spark.classList.toggle('dk2-notag', bonus === null);
  }
  function parkSpark() {if (geo.orb) sparkAt(geo.orb.x + 24, 16, null, false, false);}
  function stopPlay() {clearTimeout(playTimer);playing = 0;$('dk2-play').setAttribute('aria-pressed', 'false');stage.querySelectorAll('.dk2-firing').forEach(el => el.classList.remove('dk2-firing'));}
  function play() {
    stopPlay();meter(false);
    const acts = sol.steps.filter(st => st.success);
    const frames = [{x: geo.orb.x + 24, size: 16, bonus: 0}];
    acts.forEach((st, k) => frames.push({x: geo.notches[st.slot].x, size: sizeFor(k + 1), bonus: st.after, slot: st.slot}));
    frames.push({x: geo.gauge.x, size: sizeFor(acts.length), bonus: sol.sparks, end: true});
    if (reduced.matches) {
      // Reduced motion: no travel, the result and the meter show at once.
      const last = frames[frames.length - 1];sparkAt(last.x, last.size, last.bonus, true, false);meter(true);
      announce(sol.sparks > 0 ? `Your Spark gives plus ${num(sol.sparks)} Bonus. ${sol.gain} Sparks go into your meter.` : 'No Bonus this time.');
      return;
    }
    playing = 1;$('dk2-play').setAttribute('aria-pressed', 'true');
    let i = 0;
    const tick = () => {
      const f = frames[i];
      stage.querySelectorAll('.dk2-firing').forEach(el => el.classList.remove('dk2-firing'));
      if (Number.isInteger(f.slot)) stage.querySelector(`.dk2-station[data-slot="${f.slot}"]`)?.classList.add('dk2-firing');
      sparkAt(f.x, f.size, f.bonus, false, i > 0);
      if (f.end) {
        playTimer = setTimeout(() => {sparkAt(f.x, f.size, f.bonus, true);meter(true);stopPlay();
          announce(sol.sparks > 0 ? `Plus ${num(sol.sparks)} Bonus. ${sol.gain} Sparks go into your meter.` : 'No Bonus this time.');
          playTimer = setTimeout(() => {if (!playing) {parkSpark();}}, 2600);}, 520);
        return;
      }
      i += 1;playTimer = setTimeout(tick, i === 1 ? 500 : 760);
    };
    tick();
  }

  // ── Deck tab ─────────────────────────────────────────────────────────────────
  const RANK = {legendary: 0, rare: 1, common: 2};
  const countOf = r => all().filter(c => r === 'all' || rarityOf(c) === r).length;
  function sorted() {
    const list = all().filter(c => S.filter === 'all' || rarityOf(c) === S.filter);
    const place = c => {const i = rowIndex(c);return i < 0 ? 99 : i;};
    return list.sort((a, b) => S.sort === 'name' ? nameOf(a).localeCompare(nameOf(b))
      : RANK[rarityOf(a)] - RANK[rarityOf(b)] || place(a) - place(b) || nameOf(a).localeCompare(nameOf(b)));
  }
  function renderDeck() {
    const bar = $('dk2-bar');
    if (S.pick !== null) {
      const here = S.row[S.pick];
      bar.innerHTML = `<p class="dk2-banner" id="dk2-banner"><b>Choose a card for place ${S.pick + 1}</b><span>${here ? `${esc(short(here))} goes back to the Deck` : 'This place is empty'}</span></p>
        <button type="button" class="wb-sign wb-sign-quiet dk2-cancel" id="dk2-pickcancel"><span class="wb-sign-text"><b>Cancel</b></span></button>`;
    } else {
      bar.innerHTML = `<div class="dk2-chips" role="group" aria-label="Show by rarity">${['all', 'common', 'rare', 'legendary'].map(f => `<button type="button" class="dk2-btn dk2-chip ${f !== 'all' ? 'dc-r-' + f : ''}" data-filter="${f}" aria-pressed="${S.filter === f}" aria-label="${f === 'all' ? 'All cards' : RARITY_WORD[f]}: ${countOf(f)}"><span>${f === 'all' ? 'All' : RARITY_WORD[f]}</span><b>${countOf(f)}</b></button>`).join('')}</div>
        <button type="button" class="dk2-btn dk2-sort" id="dk2-sort" aria-label="Sort by ${S.sort === 'rarity' ? 'rarity' : 'name'}. Press to sort by ${S.sort === 'rarity' ? 'name' : 'rarity'}"><small>Sort</small><b>${S.sort === 'rarity' ? 'Rarity' : 'Name'}</b></button>`;
    }
    const grid = $('dk2-grid'), top = grid.scrollTop;
    grid.classList.toggle('dk2-picking', S.pick !== null);
    grid.innerHTML = sorted().map(c => {
      const r = rarityOf(c), L = cardLines(c), mark = markOf(c), at = rowIndex(c), rest = isRest(c);
      const u = Number.isFinite(c.charges) ? {now: c.charges, max: getCardChargeCapacity(c)} : null;
      let tag = rest ? 'Rest' : at >= 0 ? `Row ${at + 1}` : '';
      let label = `${nameOf(c)}. ${rarityWord(c)}. ${L.effect}.${at >= 0 ? ` In your row, place ${at + 1}.` : rest ? ' Rest card.' : ' Not in your row.'}${u ? ` Uses ${u.now} of ${u.max}.` : ''}`;
      let state2 = '', sub = '';
      if (S.pick !== null) {
        if (rest) {state2 = 'dk2-dim';sub = 'Rest cards work from the Deck';label = `${nameOf(c)}: Rest cards work from the Deck. They can't go in the row.`;}
        else if (at === S.pick) {state2 = 'dk2-dim dk2-here';tag = `Row ${at + 1} · here`;label = `${nameOf(c)} is already in place ${at + 1}`;}
        else if (at >= 0) {state2 = 'dk2-choice';tag = `Row ${at + 1} · swap`;label = `Swap places: ${nameOf(c)} goes to place ${S.pick + 1}${S.row[S.pick] ? `, ${nameOf(S.row[S.pick])} goes to place ${at + 1}` : ''}`;}
        else {state2 = 'dk2-choice';label = `Put ${nameOf(c)} in place ${S.pick + 1}${S.row[S.pick] ? `. ${nameOf(S.row[S.pick])} goes back to the Deck` : ''}`;}
      }
      return `<div class="dk2-tile dc-r-${r} ${state2}${at >= 0 ? ' dk2-inrow' : ''}" data-uid="${esc(c.instanceId)}">
        <button type="button" class="dk2-btn dk2-tilemain" data-uid="${esc(c.instanceId)}" aria-label="${esc(label)}" ${S.pick !== null && (rest || at === S.pick) ? 'aria-disabled="true"' : ''}>
         <span class="dk2-band"><b>${RARITY_WORD[r]}</b>${tag ? `<i class="dk2-tag2${rest ? ' dk2-tag-rest' : ''}">${esc(tag)}</i>` : ''}</span>
         <span class="dk2-body"><span class="dk2-art">${cardArt(c, {compact: true})}${mark && !rest && (mark.cls === 'add' || mark.cls === 'mul' || mark.cls === 'repeat') ? `<span class="dk2-mark dk-mark-${mark.cls}" aria-hidden="true">${mark.glyph}</span>` : ''}${u ? `<span class="dk2-uses" aria-hidden="true">${u.now}/${u.max}</span>` : ''}</span>
          <span class="dk2-text"><b class="dk2-name">${esc(nameOf(c))}</b>${sub ? `<small class="dk2-sub">${esc(sub)}</small>` : `<b class="dk2-effect">${esc(L.effect)}</b>`}</span></span>
        </button>
        <button type="button" class="dk2-btn dk2-eye dk2-tileeye" data-uid="${esc(c.instanceId)}" aria-haspopup="dialog" aria-label="Read ${esc(nameOf(c))}">${EYE}</button></div>`;
    }).join('') || '<p class="dk2-none">No cards here</p>';
    grid.querySelectorAll('svg[role="img"]').forEach(svg => {svg.removeAttribute('role');svg.setAttribute('aria-hidden', 'true');});
    grid.scrollTop = top;
  }

  // ── Header, tabs, note ───────────────────────────────────────────────────────
  function renderHead() {
    for (const t of ['row', 'deck']) {
      const b = $(`dk2-tab-${t}`), on = S.tab === t;
      b.setAttribute('aria-selected', String(on));b.tabIndex = on ? 0 : -1;
    }
    $('dk2-rowpanel').hidden = S.tab !== 'row';$('dk2-deckpanel').hidden = S.tab !== 'deck';
    const placing = S.placing ? byUid(S.placing) : null;
    const note = $('dk2-note');
    note.textContent = placing ? `Choose a place for ${short(placing)}` : S.note;
    note.className = `dk2-note ${placing ? 'dk2-note-mode' : S.noteTone}`;
    $('dk2-placecancel').hidden = !placing;
    if (placing) $('dk2-placecancel').setAttribute('aria-label', `Cancel: keep ${nameOf(placing)} in the Deck`);
    $('dk-wallet-value').textContent = String(S.wallet);
    $('dk-wallet').setAttribute('aria-label', `Wallet: ${S.wallet} Stored Sparks`);
    root.dataset.view = S.tab;root.dataset.mode = S.pick !== null ? 'pick' : placing ? 'place' : '';
  }
  function render() {
    renderHead();
    if (S.tab === 'row') renderRow(); else renderDeck();
    root.dataset.cards = String(all().length);
  }
  const say = (text, tone = '') => {S.note = text;S.noteTone = tone;};
  function showTab(tab, {focus = true} = {}) {
    if (tab === S.tab) return;
    stopPlay();
    if (tab === 'row' && S.pick !== null) S.pick = null;
    if (tab === 'deck' && S.placing) S.placing = null;
    S.tab = tab;
    render();
    if (focus) $(`dk2-tab-${tab}`).focus({preventScroll: true});
  }

  // ── Moves (every one recomputes the row with the real resolver) ──────────────
  function resultWords() {const r = solve2(S.row);return r.sparks > 0 ? `Catch a Spark: +${num(r.sparks)} Bonus` : 'Catch a Spark: no Bonus';}
  function swapPlaces(a, b) {
    const ca = S.row[a], cb = S.row[b];
    S.row[a] = cb;S.row[b] = ca;
    return ca;
  }
  function putInPlace(c, slot) {
    const out = S.row[slot];
    S.reserve = S.reserve.filter(x => x !== c);
    S.row[slot] = c;
    if (out) S.reserve.unshift(out);
    return out;
  }
  function afterMove(text, slot) {
    S.pick = null;S.placing = null;S.tab = 'row';S.played = false;
    say(text, 'dk2-note-done');
    render();
    announce(`${text} ${resultWords()}.`);
    const node = stage.querySelector(`.dk2-card[data-slot="${slot}"]`);
    node?.focus({preventScroll: true});
    if (!reduced.matches) node?.animate([{transform: 'translateY(-6px)'}, {transform: 'none'}], {duration: 220, easing: 'steps(3,end)'});
  }
  function chooseForPick(c) {
    const slot = S.pick;
    if (slot === null || !c) return;
    if (isRest(c)) {say(`${short(c)} is a Rest card: Rest cards work from the Deck`, 'dk2-note-warn');renderHead();announce(`${nameOf(c)} can't go in the row. Rest cards work from the Deck.`);return;}
    const at = rowIndex(c);
    if (at === slot) return;
    if (at >= 0) {
      const other = S.row[slot];swapPlaces(at, slot);
      afterMove(other ? `Swapped: ${short(c)} is in place ${slot + 1}, ${short(other)} in place ${at + 1}.` : `Moved ${short(c)} to place ${slot + 1}.`, slot);
    } else {
      const out = putInPlace(c, slot);
      afterMove(out ? `${short(c)} is in place ${slot + 1}. ${short(out)} went back to the Deck.` : `${short(c)} is in place ${slot + 1}.`, slot);
    }
  }
  function startPick(slot) {
    S.pick = slot;S.placing = null;S.tab = 'deck';say('');
    render();
    $('dk2-tab-deck').focus({preventScroll: true});
    announce(`Choose a card for place ${slot + 1}. ${S.row[slot] ? `${nameOf(S.row[slot])} goes back to the Deck.` : ''} Cancel returns to your row.`);
  }
  function cancelPick() {
    const slot = S.pick;
    S.pick = null;S.tab = 'row';say('');render();
    stage.querySelector(`.dk2-swap[data-slot="${slot}"]`)?.focus({preventScroll: true});
    announce('Cancelled. Your row is unchanged.');
  }
  function startPlacing(c) {
    S.placing = c.instanceId;S.pick = null;S.tab = 'row';say('');
    render();
    stage.querySelector('.dk2-card')?.focus({preventScroll: true});
    announce(`${nameOf(c)} picked up. Tap a place to put it there; the card in that place goes back to the Deck. Or Cancel.`);
  }
  function placeAt(slot) {
    const c = byUid(S.placing);
    if (!c) return;
    const out = putInPlace(c, slot);
    afterMove(out ? `${short(c)} is in place ${slot + 1}. ${short(out)} went back to the Deck.` : `${short(c)} is in place ${slot + 1}.`, slot);
  }
  function cancelPlacing() {
    const c = byUid(S.placing);
    S.placing = null;say('');render();
    $('dk2-tab-row').focus({preventScroll: true});
    announce(`Cancelled. ${c ? nameOf(c) : 'The card'} stays in the Deck.`);
  }

  // ── The card overlay: the game's real full face, the rarity word, one plain line for this place ─────
  function openCard(c, opener) {
    if (!c || S.reading) return;
    stopPlay();
    S.reading = {uid: c.instanceId, opener};S.melting = false;
    const host = document.createElement('div');
    host.className = 'dk2-read';host.id = 'dk2-read';
    sheet.append(host);
    for (const el of [$('dk2-head'), $('dk2-rowpanel'), $('dk2-deckpanel')]) el.inert = true;
    renderCard();
    $('dk2-close')?.focus({preventScroll: true});
    announce(`${nameOf(c)}. ${rarityWord(c)}. ${hereLine(c)}`);
  }
  function renderCard() {
    const c = S.reading && byUid(S.reading.uid), host = $('dk2-read');
    if (!c || !host) return;
    const at = rowIndex(c), rest = isRest(c), value = getCardMeltValue(c);
    const printed = at >= 0 ? getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: S.row.length, mountedCards: S.row})[at] : describeSkillCard(c);
    const idle = at >= 0 && placeInfo(at).kind === 'idle';
    let acts = '';
    if (S.melting) {
      acts = `<p class="dk2-confirm" id="dk2-confirm">You get <b>+${value} Stored Sparks</b>. ${esc(short(c))} is gone for good.</p>
        <div class="dk2-acts"><button type="button" class="wb-sign wb-sign-quiet" id="dk2-keep"><span class="wb-sign-text"><b>Keep</b></span></button>
        <button type="button" class="wb-sign wb-sign-danger" id="dk2-meltgo" aria-label="Melt ${esc(nameOf(c))} for ${value} Stored Sparks. This cannot be undone."><span class="wb-sign-text"><b>Melt</b></span></button></div>`;
    } else if (S.tab === 'deck' && S.pick !== null) {
      acts = rest || at === S.pick ? '' : `<div class="dk2-acts"><button type="button" class="wb-sign wb-sign-primary dk2-wide" id="dk2-choose"><span class="wb-sign-text"><b>Choose for place ${S.pick + 1}</b></span></button></div>`;
    } else if (S.tab === 'deck') {
      acts = `<p class="dk2-worth">Melting gives <b>+${value} Stored Sparks</b></p><div class="dk2-acts">${rest ? '' : `<button type="button" class="wb-sign wb-sign-standard" id="dk2-put" aria-label="${at >= 0 ? `Move ${esc(nameOf(c))} to another place` : `Put ${esc(nameOf(c))} in your row`}"><span class="wb-sign-text"><b>${at >= 0 ? 'Move…' : 'Put in row…'}</b></span></button>`}
        <button type="button" class="wb-sign wb-sign-quiet" id="dk2-melt" aria-label="Melt ${esc(nameOf(c))}: shows what you get first"><span class="wb-sign-text"><b>Melt…</b></span></button></div>`;
    }
    host.innerHTML = `<div class="dk2-dialog" role="dialog" aria-modal="true" aria-labelledby="dk2-read-name">
      <div class="dk2-face" id="dk2-face" aria-hidden="true">${inert(cardFace(printed, {compact: false}))}</div>
      <div class="dk2-info">
       <h2 class="dk-sr" id="dk2-read-name">${esc(nameOf(c))}</h2>
       <p class="dk2-rar dc-r-${rarityOf(c)}">${rarityWord(c)}</p>
       <p class="dk2-here${idle ? ' dk2-here-idle' : ''}">${idle ? `<i class="dk2-warn">${WARN}</i>` : ''}<span>${esc(hereLine(c))}</span></p>
       ${acts}
       <button type="button" class="wb-sign wb-sign-quiet dk2-close" id="dk2-close" aria-label="Close ${esc(nameOf(c))}"><span class="wb-sign-text"><b>Close</b></span></button>
      </div></div>`;
    const face = $('dk2-face');
    face.querySelector('.card-help')?.remove();
    face.querySelectorAll('.card-term-icon-spark, .card-term-icon-meter').forEach(icon => {icon.innerHTML = SPARK_IMG;});
    face.querySelectorAll('[tabindex]').forEach(el => el.removeAttribute('tabindex'));
    face.querySelectorAll('[role="img"]').forEach(el => el.removeAttribute('role'));
    sizeFace();
  }
  // The face gets the height of the page; the rule text is then set on whole pixels.
  function sizeFace() {
    const host = $('dk2-read'), face = $('dk2-face');
    if (!host || !face) return;
    const h = Math.floor(Math.min(340, host.clientHeight - 20));
    face.style.setProperty('--face', `${h}px`);
  }
  function closeCard() {
    if (!S.reading) return;
    const {opener} = S.reading;
    S.reading = null;S.melting = false;
    $('dk2-read')?.remove();
    for (const el of [$('dk2-head'), $('dk2-rowpanel'), $('dk2-deckpanel')]) el.inert = false;
    if (opener && document.contains(opener)) opener.focus({preventScroll: true});
  }
  function confirmMelt() {
    const c = S.reading && byUid(S.reading.uid);
    if (!c) return;
    const value = getCardMeltValue(c), was = S.wallet, at = rowIndex(c);
    if (at >= 0) S.row[at] = null; else S.reserve = S.reserve.filter(x => x !== c);
    S.wallet += value;
    closeCard();
    say(`Melted ${short(c)} · +${value} Stored Sparks`, 'dk2-note-receipt');
    render();
    announce(`Melted ${nameOf(c)}. Plus ${value} Stored Sparks: ${was} to ${S.wallet}.${at >= 0 ? ` Place ${at + 1} is now empty. ${resultWords()}.` : ''}`);
    if (!reduced.matches) $('dk-wallet').animate([{transform: 'scale(1.12)'}, {transform: 'none'}], {duration: 260, easing: 'steps(4,end)'});
    ($('dk2-grid').querySelector('.dk2-tilemain') || $('dk2-tab-deck')).focus({preventScroll: true});
  }

  // ── Input ────────────────────────────────────────────────────────────────────
  let swallow = false;
  sheet.addEventListener('click', event => {
    if (swallow) {swallow = false;return;}
    const t = event.target;
    if (S.reading) {
      if (t.closest('#dk2-close') || t === $('dk2-read')) {closeCard();return;}
      if (t.closest('#dk2-melt')) {S.melting = true;renderCard();$('dk2-keep').focus({preventScroll: true});announce(`Melt ${nameOf(byUid(S.reading.uid))}? You get ${getCardMeltValue(byUid(S.reading.uid))} Stored Sparks. It is gone for good.`);return;}
      if (t.closest('#dk2-keep')) {S.melting = false;renderCard();$('dk2-melt')?.focus({preventScroll: true});announce('Kept.');return;}
      if (t.closest('#dk2-meltgo')) {confirmMelt();return;}
      if (t.closest('#dk2-put')) {const c = byUid(S.reading.uid);closeCard();startPlacing(c);return;}
      if (t.closest('#dk2-choose')) {const c = byUid(S.reading.uid);closeCard();chooseForPick(c);return;}
      return;
    }
    const tab = t.closest('.dk2-tab');
    if (tab) {showTab(tab.dataset.tab);return;}
    if (t.closest('#dk2-done')) {say('In the game, Done returns to where you opened the Deck');renderHead();announce('Done returns to where you opened the Deck.');return;}
    if (t.closest('#dk2-placecancel')) {cancelPlacing();return;}
    if (t.closest('#dk2-pickcancel')) {cancelPick();return;}
    if (t.closest('#dk2-play')) {if (S.placing) cancelPlacing();play();return;}
    const filter = t.closest('[data-filter]');
    if (filter) {S.filter = filter.dataset.filter;renderDeck();$('dk2-bar').querySelector(`[data-filter="${S.filter}"]`)?.focus({preventScroll: true});announce(`${S.filter === 'all' ? 'All cards' : RARITY_WORD[S.filter]}: ${countOf(S.filter)}.`);return;}
    if (t.closest('#dk2-sort')) {S.sort = S.sort === 'rarity' ? 'name' : 'rarity';renderDeck();$('dk2-sort').focus({preventScroll: true});announce(`Sorted by ${S.sort}.`);return;}
    // Row tab
    const eye = t.closest('.dk2-eye');
    if (eye && eye.dataset.slot !== undefined) {openCard(S.row[Number(eye.dataset.slot)], eye);return;}
    if (eye && eye.dataset.uid) {openCard(byUid(eye.dataset.uid), eye);return;}
    const swapBtn = t.closest('.dk2-swap');
    if (swapBtn) {if (S.placing) placeAt(Number(swapBtn.dataset.slot)); else startPick(Number(swapBtn.dataset.slot));return;}
    const cardBtn = t.closest('.dk2-card');
    if (cardBtn) {
      const slot = Number(cardBtn.dataset.slot);
      if (S.placing) {placeAt(slot);return;}
      if (!S.row[slot]) {startPick(slot);return;}
      openCard(S.row[slot], cardBtn);return;
    }
    // Deck tab
    const main = t.closest('.dk2-tilemain');
    if (main) {
      const c = byUid(main.dataset.uid);
      if (S.pick !== null) chooseForPick(c); else openCard(c, main);
    }
  });
  document.addEventListener('keydown', event => {
    if (S.reading) {
      if (event.key === 'Escape') {event.preventDefault();if (S.melting) {S.melting = false;renderCard();$('dk2-melt')?.focus();} else closeCard();}
      else if (event.key === 'Tab') {
        const items = [...$('dk2-read').querySelectorAll('button')];
        const i = items.indexOf(document.activeElement);
        event.preventDefault();items[(i + (event.shiftKey ? items.length - 1 : 1) + items.length) % items.length]?.focus();
      }
      return;
    }
    if (event.key === 'Escape') {
      if (S.pick !== null) {event.preventDefault();cancelPick();return;}
      if (S.placing) {event.preventDefault();cancelPlacing();return;}
    }
    const tab = event.target.closest?.('[role="tab"]');
    if (tab && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {event.preventDefault();showTab(S.tab === 'row' ? 'deck' : 'row');}
  });

  // Drag to reorder inside the row: drop a card on another place and the two swap places (an empty place just takes it).
  let drag = null;
  stage.addEventListener('pointerdown', event => {
    const card = event.target.closest('.dk2-card');
    if (!card || event.button !== 0 || S.placing || S.reading) return;
    const slot = Number(card.dataset.slot);
    if (!S.row[slot]) return;
    drag = {node: card, slot, x: event.clientX, y: event.clientY, id: event.pointerId, moved: false};
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) {drag.moved = true;stopPlay();drag.node.classList.add('dk2-dragging');stage.classList.add('dk2-dragmode');}
    drag.node.style.transform = `translate(${Math.round(dx)}px,${Math.round(dy)}px)`;
    const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('.dk2-station')).find(el => el && Number(el.dataset.slot) !== drag.slot);
    stage.querySelectorAll('.dk2-station').forEach(el => el.classList.toggle('dk2-drop', el === over));
    event.preventDefault();
  });
  const endDrag = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const {node, slot, moved} = drag;drag = null;
    if (!moved) return;
    swallow = true;setTimeout(() => {swallow = false;}, 0);
    node.classList.remove('dk2-dragging');node.style.transform = '';stage.classList.remove('dk2-dragmode');
    const target = stage.querySelector('.dk2-station.dk2-drop');
    stage.querySelectorAll('.dk2-drop').forEach(el => el.classList.remove('dk2-drop'));
    if (!target || event.type !== 'pointerup') return;
    const to = Number(target.dataset.slot), c = S.row[slot], other = S.row[to];
    swapPlaces(slot, to);
    afterMove(other ? `Swapped: ${short(c)} is in place ${to + 1}, ${short(other)} in place ${slot + 1}.` : `Moved ${short(c)} to place ${to + 1}.`, to);
  };
  window.addEventListener('pointerup', endDrag);window.addEventListener('pointercancel', endDrag);

  const relayout = () => {if (S.tab === 'row') sizeStage();sizeFace();};
  addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(stage);
  document.fonts?.ready.then(relayout);

  render();
  window.deck = {
    state: S, get sol() {return sol;}, solve: solve2, placeInfo, hereLine, cardLines, countOf, geo,
    open: uidOrSlot => openCard(typeof uidOrSlot === 'number' ? S.row[uidOrSlot] : byUid(uidOrSlot) || all().find(c => c.cardId === uidOrSlot)),
    close: closeCard, play, swap: (a, b) => {swapPlaces(a, b);afterMove(`Swapped places ${a + 1} and ${b + 1}.`, b);},
    pick: startPick, showTab, byId: id => all().find(c => c.cardId === id),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2.1-deck: v2.0 with the designer's notes.
   Chain + Slots (never row/place) · obvious eye buttons · plates show what a card really contributes
   (struck base, green effective, from the resolver's own steps) · Trigger names, icons and a Trigger switch ·
   Deck grouped (In your chain / Not in chain / Rest cards) · crafted 9-slice frames · scroll hint · no wallet box.
   ═══════════════════════════════════════════════════════════════════════════ */
// Pixel art from letter grids (16-pixel grid unless stated), drawn as crisp rects.
const PAL = {O: '#2a1d12', D: '#d39a3a', G: '#f0c86a', W: '#fffdf1', C: '#d8c98a', Y: '#f3e6b9', B: '#8a6d44', L: '#5a4632', M: '#536430', m: '#8a9a4a', R: '#7a2f2a', r: '#b8574a', S: '#42768f', s: '#8fb8c8', P: '#a58c57', E: '#c8642e', K: '#cdbf98', N: '#5f9f86', n: '#b4dcc0'};
function pixelArt(rows, {size = 16, pal = PAL, cls = ''} = {}) {
  const grid = rows.length, paths = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => {if (pal[ch]) (paths[ch] ||= []).push(`M${x} ${y}h1v1h-1z`);}));
  return `<svg class="${cls}" viewBox="0 0 ${grid} ${grid}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([ch, d]) => `<path fill="${pal[ch]}" d="${d.join('')}"/>`).join('')}</svg>`;
}
const BLANK = '................';
const pad16 = rows => [...rows, ...Array(16 - rows.length).fill(BLANK)];
// The Trigger icons. Same outline (#2a1d12), same light from the top left, the Spark's own golds.
const TRIGGER_ART = {
  // Collect: the wisp orb taking the glint (the Spark entering it from the top right).
  'body-spark': pad16([BLANK, BLANK, BLANK, '..........O.....', '.........OGO..G.', '........OGWGO...', '.....OOOGWWWGO..', '...OOCCCOGWGO...', '..OCCYYYYOGO..G.', '..OCYWWYYYOO....', '..OCYWWYYYCO....', '..OCYYYYYYCO....', '..OCCYYYYCCO....', '...OOCCCCOO.....', '.....OOOO.......']),
  // Delivery: the Collector (green orb) pushing a Spark towards you, speed lines behind it.
  'collector-delivery': pad16([BLANK, BLANK, BLANK, BLANK, BLANK, '.........OOO....', '...O....ONNNO.LL', '..OGO..ONWnNNO..', '.OGWGO.ONnnnNO.L', '..OGO..ONnnnNO..', '...O....ONNNO.LL', '.........OOO....']),
  'collector-attach': pad16(['...OOO..........', '...OBO..........', '...OBO..........', '...OBO.....O....', '...OBO....OGO...', '...OBO...OGWGO..', '...OBO....OGO...', '...OBO.....O....', '...OBO..........', '...OBO.....OOO..', '...OBO.....OBO..', '...OBO.....OBO..', '...OBBOOOOOBBO..', '....OBBBBBBBO...', '.....OOOOOOO....']),
  'wave-crossing': pad16([BLANK, BLANK, BLANK, BLANK, '.......O........', '......OGO.......', '.....OGWGO......', '......OGO.......', '..OOO..O..OOO...', '.OsssO...OsssO..', 'OsSSSsOOOsSSSsO.', 'OSSSSSSSSSSSSSSO', 'OSSSSSSSSSSSSSSO', '.OOOOOOOOOOOOOO.']),
  'flash-pickup': pad16([BLANK, '.........OOOOO..', '........OGGGGO..', '.......OGWGGO...', '......OGWGGO....', '.....OGWGGOOOO..', '....OGWGGGGGDO..', '....OOOOOGGDO...', '........OGDO....', '.......OGDO.....', '......OGDO......', '.....OGDO.......', '....OGO.........', '....OO..........']),
  'flash-expiry': pad16([BLANK, '.........OOOOO..', '........OPPPPO..', '.......OPCPPO...', '......OPCPPO....', '.....OPCPPOOOO..', '....OOOOOOOPBO..', BLANK, '........OOBO....', '.......OPBO.....', '......OPBO......', '.....OPBO.......', '....OPO.........', '....OO..........']),
  'downbeat-lift': pad16([BLANK, '.......OO.......', '......OGGO......', '.....OGWGGO.....', '....OGGOOGGO....', '...OGGO..OGGO...', '...OOO....OOO...', BLANK, '......OOOO......', '......OBBO......', '......OBBO......', '...OOOOBBOOOO...', '....OBBBBBBO....', '.....OBBBBO.....', '......OBBO......', '.......OO.......']),
  // Overfill: a full meter with the Spark bursting out of the top and drops spilling over.
  'natural-overfill': pad16(['.......O........', '......OGO.......', '.....OGWGO......', '...G..OGO..G....', '....OOOOOOO.....', '.G..OGGGGDO..G..', '....OGWGGDO.....', '....OOOOOOO.....', '....OGGGGDO.....', '....OOOOOOO.....', '....OGGGGDO.....', '....OOOOOOO.....', '....OGGGGDO.....', '....OOOOOOO.....']),
  // Rhythm: three even Lifts, with their beat ticks.
  'rhythm-phrase': pad16([BLANK, BLANK, BLANK, '..O....O....O...', '.OGO..OGO..OGO..', 'OGWGOOGWGOOGWGO.', 'OO.OOOO.OOOO.OO.', BLANK, '..L....L....L...', '..L....L....L...', '..L....L....L...']),
  'field-swipe': pad16([BLANK, BLANK, '...........OOO..', '..........OGGO..', '.........OGGO...', '........OGWO....', '.......OGWO.....', '......OGWO..LLL.', '.....OGWO.......', '....OGWO...LLL..', '...OGGO.........', '..OGGO....LLL...', '.OOOO...........']),
  'guard-rescue': pad16([BLANK, BLANK, BLANK, '...OOO....OOO...', '..OrrrO..OrrrO..', '.OrWrrrOOrrrRRO.', '.OrWrrrrrrrrRRO.', '.OrrrrrrrrrrRRO.', '..OrrrrrrrrRRO..', '...OrrrrrrRRO...', '....OrrrrRRO....', '.....OrrRRO.....', '......ORRO......', '.......OO.......']),
  'flight-clear': pad16([BLANK, '...OO...........', '...OBOOOOOO.....', '...OBOMmMMMO....', '...OBOmMMMMMO...', '...OBOMMMMMO....', '...OBOOOOOO.....', '...OBO..........', '...OBO..........', '...OBO..........', '...OBO..........', '...OBO..........', '...OBO..........', '..OBBBO.........', '..OOOOO.........']),
  'expedition-victory': pad16([BLANK, BLANK, BLANK, BLANK, '..O....O....O...', '.OGO..OGO..OGO..', '.OGGOOGWGOOGGO..', '.OGGGGGGGGGGGO..', '.OGWGGGGGGGGDO..', '.OGGGGGGGGGGDO..', '.OOOOOOOOOOOOO..']),
};
// Names are fixed by the designer; Victory is the game's thirteenth Trigger (no card listens to it by name today).
const TRIGGERS = [
  ['body-spark', 'Collect', 'your wisp touches a Spark'], ['collector-delivery', 'Delivery', 'Collector brings a Spark to you'],
  ['collector-attach', 'Latch', 'Collector grabs a missed Spark'], ['wave-crossing', 'Wave', 'a wave crosses a Spark'],
  ['flash-pickup', 'Flash', 'you pick up a Flash'], ['flash-expiry', 'Flash ends', 'a Flash runs out'],
  ['downbeat-lift', 'Falling Lift', 'a Lift while falling'], ['natural-overfill', 'Overfill', 'a Spark overfills the meter'],
  ['rhythm-phrase', 'Rhythm', 'three even Lifts'], ['field-swipe', 'Swipe', 'a Field Impulse swipe'],
  ['guard-rescue', 'Save', 'Collector saves you'], ['flight-clear', 'Clear', 'you clear a flight'],
  ['expedition-victory', 'Victory', 'you win an expedition'],
].map(([kind, name, what]) => ({kind, name, what}));
const TRIGGER_BY = Object.fromEntries(TRIGGERS.map(t => [t.kind, t]));
// v2.2 glossary: the meaning is the game's own (card-rule-bands.mjs › CARD_TRIGGERS); a second sentence only where two
// Triggers are easy to mix up.
const TRIGGER_MEANING = Object.fromEntries(Object.values(CARD_TRIGGERS).filter(t => t.event).map(t => [t.event, t.meaning]));
const TRIGGER_EXTRA = {
  'body-spark': 'Sparks brought by Collector are Delivery, not Collect.',
  'collector-delivery': 'Touching a Spark yourself is Collect, not Delivery.',
  'collector-attach': 'Latch is the grab; Delivery is when it arrives.',
  'flash-expiry': 'Picking the Flash up is Flash; this is when it runs out.',
};
// v2.2 tile-only short lines, for cards whose game "what" line (getCardRuleBands › effect) is too long for a tile.
// At most about 22 characters, same meaning, approved vocabulary. The full line is always in the opened card.
const TILE_SHORT = {
  'climb': 'Lifts 2 and 3 free', 'watchlight': 'Collector saves you', 'springboard': 'Collect: free bounce',
  'lift-guide': 'Shows when to Lift', 'cache-handling': 'Fetches Caches: +12', 'second-sun': '×2 before, ×3 Encore',
  'twin-wick': 'Unlocks 2nd Collector', 'field-impulse': 'Swipe to float, dive', 'harvest-legendary': '+2 Sparks, +1 Stored',
  'wave-loom': 'Swipes send a wave', 'nest-egg': '+1 Stored per 10', 'flash-handling': '+6; fetches Flash',
  'dream': 'Practise first 8 s', 'spillway': '2nd Overfill: a wave', 'mirror-grain': 'Adds last + again',
  'ember-feeder': 'Eats 2: +1 max Spark', 'refrain': 'Encore: fires again', 'devourer': 'Eats a Rare: +1 heart',
  'tight-packing': '+50% from packing', 'tight-packing-ii': '+75% from packing', 'tight-packing-iii': '+100% from packing',
  'return-spring': 'Reels in 0.5 s sooner', 'spillway-ii': 'Each Overfill: a wave',
  'growth-seed': '+5 max, full meter', 'growth-seed-common': '+3 max, full meter', 'growth-seed-legendary': '+8 max, full meter',
  'camp-kit': '2 Rest actions', 'echo-iii': 'Repeats next ×3', 'echo-ii': 'Repeats next twice',
  'ripple-glass': 'Doubles all before', 'glide-prism': 'Doubles all before', 'courier-glass': 'Doubles all before',
  'clear-prism': 'Doubles all before', 'wick-doubler': 'Doubles all before', 'crescendo': 'Doubles all before',
  'diving-bell': 'Final wave, +3 Sparks', 'counterweight': 'Ready 0.75 s sooner', 'haul-winch': 'Reels in 3 s sooner',
  'fast-spool': 'Reels in 3 s sooner', 'rhythm': '3 even Lifts: a wave', 'glass-spool': 'Ready 0.5 s sooner',
  'use-doubler': 'Next card: 2× uses', 'tailwind': '3rd Collect: +1 heart', 'wind-feather': '+1% speed (max 6%)',
  'twin-orbit': '2nd Collector fetches', 'prism-lens': 'All before ×1.25', 'prism-lens-ii': 'All before ×3',
  'closing-chord': 'Last: all before ×2.5', 'ring-spring': 'Ready 1 s sooner', 'ring-spring-ii': 'Ready 2 s sooner',
  'pacesetter': 'Ready 3 s sooner', 'mending-moss': 'Ready 3 s sooner', 'flash-thread': 'Ready 3 s sooner',
  'slip-feather': 'A revealing wave', 'edge-reach': 'Wave; reach +50%', 'double-lift': '2nd Lift is free',
};
const triggerIcon = (kind, size = 16) => TRIGGER_ART[kind] ? pixelArt(TRIGGER_ART[kind], {size, cls: 'dk21-ticon'}) : '';
const CAMPFIRE = pad16([BLANK, BLANK, '.......O........', '......OEO.......', '......OEEO......', '.....OEGEO......', '.....OEGGEO.....', '....OEGWGEO.....', '....OEGWWGEO....', '....OEGGWGEO....', '...OOOEGGEOOO...', '..OBBOOOOOOBBO..', '.OBBBBBBBBBBBBO.', '..OOBBOOOOBBOO..', '....OO....OO....']);
const CHEVRON = pad16([BLANK, BLANK, BLANK, BLANK, BLANK, '..OO........OO..', '..OBO......OBO..', '...OBO....OBO...', '....OBO..OBO....', '.....OBOOBO.....', '......OBBO......', '.......OO.......']);
const GEM_ROWS = ['...OO...', '..OHAO..', '.OHAAAO.', 'OHAAAAZO', 'OAAAAZZO', '.OAAZZO.', '..OAZO..', '...OO...'];
const GEM_PAL = {common: {A: '#d8dacd', Z: '#8d9187', H: '#ffffff'}, rare: {A: '#6fa3bd', Z: '#31546f', H: '#f0d68a'}, legendary: {A: '#b9a6d6', Z: '#5b4f73', H: '#f3d6f7'}};
const gem = r => pixelArt(GEM_ROWS, {size: 8, pal: {O: '#2a1d12', ...GEM_PAL[r]}, cls: 'dk21-gem'});
// 9-slice frames: 12×12, stepped 2-pixel corners, outline · rim · one-pixel bevel (light top/left, dark bottom/right) · fill.
function frameUrl({outline = '#2a1d12', rim, light, dark, fill}) {
  const paths = {};
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const a = Math.min(x, 11 - x), b = Math.min(y, 11 - y), l = Math.min(a, b, a + b - 2);
    if (l < 0) continue;
    const col = l === 0 ? outline : l === 1 ? rim : l === 2 ? ((b <= a ? y < 6 : x < 6) ? light : dark) : fill;
    (paths[col] ||= []).push(`M${x} ${y}h1v1h-1z`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges">${Object.entries(paths).map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function runV21() {
  // v2.3: the ring of light is called a Pulse (designer's decision); one page runs one variant, so this is safe here.
  if (V23) {
    Object.assign(TRIGGER_BY['wave-crossing'], {name: 'Pulse', what: 'a Pulse crosses a Spark'});
    TRIGGER_MEANING['wave-crossing'] = 'A Pulse crosses a Spark you have not collected.';
  }
  const SLOTS = Math.min(5, Math.max(3, Number(query.get('slots')) || 4));
  const MIXED = query.get('chain') === 'mixed';
  let n = 0;const mk = id => makeSkillCard(id, `d21-${n++}`);
  // Sample deck: 6 Common, 3 Rare, 1 Legendary. Courier Tip listens to Delivery (Collector brings a Spark).
  const ALL = ['echo', 'spark-cache', 'prism-lens', 'kindling-bead', 'crescendo', 'body-spark', 'lift-guide', 'refrain', 'growth-seed', 'courier-tip'];
  const SIMPLE = {3: ['echo', 'spark-cache', 'prism-lens'], 4: ['echo', 'spark-cache', 'prism-lens', null], 5: ['echo', 'spark-cache', 'kindling-bead', 'prism-lens', 'crescendo']};
  const MIXED2 = {3: ['spark-cache', 'courier-tip', 'prism-lens'], 4: ['echo', 'spark-cache', 'courier-tip', 'prism-lens'], 5: ['echo', 'spark-cache', 'courier-tip', 'kindling-bead', 'prism-lens']};
  // v2.2 default: real cards on three Triggers (Collect, Delivery, Wave) plus a Boost.
  const VARIED = {3: ['spark-cache', 'courier-tip', 'harvest-common'], 4: ['spark-cache', 'courier-tip', 'harvest-common', 'prism-lens'], 5: ['echo', 'spark-cache', 'courier-tip', 'harvest-common', 'prism-lens']};
  const chainParam = query.get('chain');
  const SEED = Number.parseInt(query.get('seed'), 10) || 1;
  function randomChain(seed, strict = V23) {
    // mulberry32: the same seed always gives the same chain.
    let a = seed >>> 0;
    const rnd = () => {a = (a + 0x6D2B79F5) >>> 0;let t = a;t = Math.imul(t ^ (t >>> 15), t | 1);t ^= t + Math.imul(t ^ (t >>> 7), t | 61);return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
    const pool = Object.keys(SKILL_CARDS).filter(id => !isInventoryOnlyCard(makeSkillCard(id, 'probe')));
    // A chain worth looking at: redraw (same seed sequence) until at least two cards act in the chain and one Trigger fires it.
    // v2.3 (strict): at least two Triggers fire it and at least one card is a Boost (×).
    const acts = id => !!getCardRowRule(SKILL_CARDS[id], makeSkillCard(id, 'probe')) || ['echo', 'chameleon', 'refrain'].includes(SKILL_CARDS[id].kind);
    const boost = id => getCardRowRule(SKILL_CARDS[id], makeSkillCard(id, 'probe'))?.operation === 'multiply';
    let out = [];
    for (let tries = 0; tries < (strict ? 2000 : 60); tries++) {
      out = [];
      while (out.length < SLOTS) {const id = pool[Math.floor(rnd() * pool.length)];if (!out.includes(id)) out.push(id);}
      const row = out.map((id, i) => makeSkillCard(id, `rc-${i}`));
      const firing = TRIGGERS.filter(t => hasCardRowEvent(row, t.kind) && previewCardRow({cards: row}, {kind: t.kind, pickupKind: 'light', meterFraction: .2}).steps.some(st => st.success)).length;
      if (strict ? firing >= 2 && out.some(boost) : out.filter(acts).length >= 2 && firing >= 1) break;
    }
    return out;
  }
  // v2.3: &chain=Pocket Sparks,Prism Lens,Refrain (card names or ids, comma-separated; missing slots stay empty).
  function namedChain(text) {
    const want = text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const ids = want.map(w => Object.keys(SKILL_CARDS).find(id => id === w || SKILL_CARDS[id].name.toLowerCase() === w)).filter(id => id && !isInventoryOnlyCard(makeSkillCard(id, 'probe')));
    return ids.length ? Array.from({length: SLOTS}, (_, i) => ids[i] || null) : null;
  }
  const CHAINS = !V22 ? (MIXED ? MIXED2 : SIMPLE)
    : chainParam === 'simple' ? SIMPLE : chainParam === 'mixed' ? MIXED2 : chainParam === 'random' ? {[SLOTS]: randomChain(SEED)}
    : V23 && chainParam && chainParam !== 'varied' && namedChain(chainParam) ? {[SLOTS]: namedChain(chainParam)} : VARIED;
  if (V22) ALL.push('harvest-common', 'toll-bell', 'downbeat');
  for (const id of CHAINS[SLOTS]) if (id && !ALL.includes(id)) ALL.push(id);
  const S = {
    row: CHAINS[SLOTS].map(id => id ? mk(id) : null),
    reserve: ALL.filter(id => !CHAINS[SLOTS].includes(id)).map(mk),
    wallet: 8, tab: query.get('tab') === 'deck' ? 'deck' : 'chain',
    filter: 'all', sort: 'rarity', trigger: null,
    pick: null, placing: null, note: '', noteTone: '', reading: null, melting: false,
  };
  // &deck=all (v2.2 check): every card in the catalog, to measure every tile.
  if (V22 && query.get('deck') === 'all') S.reserve = Object.keys(SKILL_CARDS).filter(id => !CHAINS[SLOTS].includes(id)).map(mk);
  state.v21 = S;

  const MAX_FLAME = getGlowCapacity({});
  const START_SPARKS = 6, START_FLAME = START_SPARKS / GLOW_DISPLAY_SCALE;
  const eventFor = kind => Object.freeze({kind, pickupKind: 'light', meterFraction: START_FLAME / MAX_FLAME});
  function solveK(row, kind) {
    const listens = hasCardRowEvent(row, kind);
    const ev = eventFor(kind);
    const receipt = previewCardRow({cards: row}, listens ? ev : {...ev, eligible: false});
    const gainFlame = Math.min(receipt.sparks * CARD_UNIT, Math.max(0, MAX_FLAME - START_FLAME));
    return {kind, listens, receipt, steps: receipt.steps, sparks: receipt.sparks, gainFlame, gain: glowPoints(gainFlame)};
  }
  // A Trigger fires this chain when a card listens to it (skill-cards.mjs › hasCardRowEvent) AND the resolver,
  // run with that event, has at least one card that acts. (hasCardRowEvent alone counts a "*" adding card such as
  // Kindling Bead as listening to every Trigger, although it cannot act without an earlier card that Adds.)
  const triggersFor = row => TRIGGERS.filter(t => hasCardRowEvent(row, t.kind) && solveK(row, t.kind).steps.some(st => st.success));

  // ── Effective figures, attributed from the resolver's steps ──────────────────
  // Adding step → its owner (an Echo-style copy is owned by the card it repeats, found by sourceInstanceId).
  // Multiply step → every contribution so far in that firing is multiplied (they add up to the subtotal it multiplies).
  // Encore → the second firing's contributions add to the same owners. Each step is checked against the resolver's
  // own before/after, and the total against receipt.sparks; any mismatch returns null and the plates fall back to plain figures.
  function attribute(row, sol) {
    const totals = new Map(), mods = new Map(), EPS = 1e-6;
    const addMod = (slot, mod) => {const list = mods.get(slot) || [];if (!list.some(m => m.type === mod.type && m.by === mod.by)) list.push(mod);mods.set(slot, list);};
    let pass = null, cur = new Map();
    const flush = () => {for (const [k, v] of cur) totals.set(k, (totals.get(k) || 0) + v);cur = new Map();};
    const sum = m => [...m.values()].reduce((a, b) => a + b, 0);
    for (const st of sol.steps) {
      if (st.pass !== pass) {
        if (pass !== null) {flush();}
        pass = st.pass;
      }
      if (!st.success) continue;
      if (st.operation === 'add-sparks' || st.operation === 'add-last-payout') {
        if (Math.abs(sum(cur) - st.before) > EPS) return null;
        let owner = st.slot;
        if (st.copiedBy) {
          owner = row.findIndex(c => c && c.instanceId === st.sourceInstanceId);
          if (owner < 0) return null;
          addMod(owner, {type: 'repeat', by: st.slot});
        }
        cur.set(owner, (cur.get(owner) || 0) + st.amount);
        if (st.pass > 1) addMod(owner, {type: 'encore'});
        if (Math.abs(sum(cur) - st.after) > EPS) return null;
      } else if (st.operation === 'multiply') {
        if (Math.abs(sum(cur) - st.before) > EPS) return null;
        for (const [k, v] of cur) {cur.set(k, v * st.multiplier);addMod(k, {type: 'mul', by: st.slot, m: st.multiplier});}
        if (Math.abs(sum(cur) - st.after) > EPS) return null;
      } else if (st.operation === 'replay-row') {
        // no value of its own
      } else if (Math.abs(st.after - st.before) > EPS) return null;
    }
    flush();
    if (Math.abs(sum(totals) - sol.sparks) > EPS) return null;
    return {totals, mods};
  }

  // v2.2: a plate shows what the card adds AT ITS OWN SLOT, with only what cards to its LEFT did to it (an Echo
  // repeating it). Later × cards and Encore keep their own plates. Read from the first firing's steps.
  function leftAttribute(row, sol) {
    const own = new Map(), mods = new Map(), passes = new Map(), paid = new Map();
    for (const st of sol.steps) passes.set(st.pass, st.after);
    // v2.3: a card that never acts itself in the first firing (e.g. its Uses all went to the repeats) does not own the
    // repeats; the repeating card shows what it paid ("Repeats ×3: +9").
    const acted = new Set(sol.steps.filter(st => st.pass === 1 && st.success && !st.copiedBy).map(st => st.slot));
    for (const st of sol.steps) {
      if (st.pass !== 1 || !st.success) continue;
      if (st.operation !== 'add-sparks' && st.operation !== 'add-last-payout') continue;
      let owner = st.slot;
      if (st.copiedBy) {
        owner = row.findIndex(c => c && c.instanceId === st.sourceInstanceId);
        if (owner < 0) return null;
        if (V23 && !acted.has(owner)) {const p = paid.get(st.slot) || {amount: 0, count: 0, target: owner};p.amount += st.amount;p.count += 1;paid.set(st.slot, p);continue;}
        const list = mods.get(owner) || [];
        list.push({type: 'repeat', by: st.slot});mods.set(owner, list);
      }
      own.set(owner, (own.get(owner) || 0) + st.amount);
    }
    return {totals: own, mods, paid, passTotals: [...passes.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)};
  }
  // The sum as the plates show it, read left to right: + adds, × multiplies the running figure, Encore repeats the line.
  // v2.3: the Encore line uses each × card's second-firing multiplier where it differs (Second Sun "×2 · ×3").
  function plateSum(useEff) {
    if (V23) {
      const infos = S.row.map((c, i) => slotInfo(i, {plain: !useEff}));
      const encore = infos.some(x => x.role === 'encore');
      let total = 0;
      for (const p of encore ? [1, 2] : [1]) {
        let r = 0;
        for (const info of infos) {
          if (info.kind !== 'act') continue;
          if (info.role === 'add') r += Number(num(useEff ? info.eff : info.base));
          else if (info.role === 'repeat-paid') r += Number(num(info.paid.amount));
          else if (info.role === 'mul') r *= p === 2 && info.m2 ? info.m2 : info.step.multiplier;
        }
        // When the resolver rounds each firing down to whole Sparks (it then also reports sparksExact), read it the same way.
        total += sol?.receipt && 'sparksExact' in sol.receipt ? Math.floor(r + 1e-9) : r;
      }
      return Math.round(total * 100) / 100;
    }
    let r = 0, encore = false;
    S.row.forEach((c, i) => {
      const info = slotInfo(i, {plain: !useEff});
      if (info.kind !== 'act') return;
      if (info.role === 'add') r += Number(num(useEff ? info.eff : info.base));
      else if (info.role === 'mul') r *= info.step.multiplier;
      else if (info.role === 'encore') encore = true;
    });
    return Math.round((encore ? r * 2 : r) * 100) / 100;
  }
  let sol, attr, trigs, plain = false;
  function resolve() {
    trigs = triggersFor(S.row);
    if (!trigs.some(t => t.kind === S.trigger)) S.trigger = trigs[0]?.kind || 'body-spark';
    sol = solveK(S.row, S.trigger);
    if (!V22) {attr = attribute(S.row, sol);return;}
    attr = leftAttribute(S.row, sol);plain = false;
    // Honesty rule: if the plates read left to right do not give the resolver's total, show plain figures.
    if (!attr || Math.abs(plateSum(true) - Math.round(sol.sparks * 100) / 100) > .011) plain = true;
  }

  const short = c => nameOf(c).replace(/\s*\+\d+$/, '');
  const rarityWord = c => RARITY_WORD[rarityOf(c)];
  const all = () => [...S.row.filter(Boolean), ...S.reserve];
  const byUid = uid => all().find(c => c.instanceId === uid) || null;
  const slotOf = c => S.row.indexOf(c);
  const tName = kind => TRIGGER_BY[kind]?.name || 'this Trigger';
  const shortScreen = matchMedia('(max-height:380px)');
  const minPayers = c => Number(getCardRowRule(SKILL_CARDS[c.cardId], c)?.minimumEarlierPayers) || 0;
  // Which Trigger the card itself listens to: the WHEN of its real row rule.
  function whenOf(c) {
    const def = SKILL_CARDS[c.cardId], rule = getCardRowRule(def, c);
    if (isRest(c)) return {text: 'At Rest'};
    if (rule?.event && TRIGGER_BY[rule.event]) return {kind: rule.event, text: TRIGGER_BY[rule.event].name};
    if (rule?.event === '*') return {text: 'Any Trigger'};
    if (def.kind === 'echo' || def.kind === 'chameleon') return {text: 'Same as the card it repeats'};
    if (def.kind === 'refrain') return {text: 'Any Trigger, after a Bonus'};
    return {text: 'Always on'};
  }
  function whyIdle(slot, step) {
    const c = S.row[slot];
    switch (step?.skipReason) {
      case 'empty-subtotal': case 'needs-two-earlier-payers':
        return minPayers(c) >= 2 ? {why: 'it needs two cards that Add before it', fix: 'Move it after two + cards.'} : {why: 'there is no Bonus to multiply yet', fix: 'Move it after a + card.'};
      case 'needs-earlier-payer': return {why: 'it needs a card that Adds before it', fix: 'Move it after a + card.'};
      case 'no-earlier-payout': return {why: 'there is nothing to repeat yet', fix: 'Move it after a + card.'};
      case 'incompatible-neighbor': return S.row[slot + 1] ? {why: `it can't repeat ${short(S.row[slot + 1])} on ${tName(S.trigger)}`, fix: ''} : {why: 'there is no card to its right', fix: 'Put a + card to its right.'};
      case 'exhausted-source': return {why: 'it has no Uses left', fix: ''};
      case 'replay-limit': return {why: 'only one Encore fires', fix: ''};
      case 'no-productive-action': return {why: 'there is no Bonus yet, so no Encore', fix: 'Put cards that Add before it.'};
      default: return {why: `it does not act on ${tName(S.trigger)}`, fix: ''};
    }
  }
  function slotInfo(slot, opts = {}) {
    const c = S.row[slot];
    if (!c) return {kind: 'empty'};
    const noEff = opts.plain ?? (V22 && plain);
    const def = SKILL_CARDS[c.cardId], rule = getCardRowRule(def, c);
    const fires = !!rule || ['echo', 'chameleon', 'refrain'].includes(def.kind);
    if (!fires) return {kind: 'passive', plate: 'Always on'};
    const steps = sol.steps.filter(st => st.slot === slot), ok = steps.find(st => st.success);
    if (!ok && V23) {
      const last = steps.filter(st => !st.success).pop();
      // Its Uses went to an Echo-style card's repeats.
      if (attr?.paid && [...attr.paid.values()].some(p => p.target === slot)) return {kind: 'spent', plate: 'Uses spent'};
      // It listens to a different Trigger: not an error, it waits for that one.
      const listensTo = card => {const r = getCardRowRule(SKILL_CARDS[card.cardId], card);return r?.event && r.event !== '*' && TRIGGER_BY[r.event] ? r.event : null;};
      const ownEvent = listensTo(c);
      const copyEvent = ['echo', 'chameleon'].includes(def.kind) && S.row[slot + 1] ? listensTo(S.row[slot + 1]) : null;
      const waits = ownEvent || copyEvent;
      if (waits && waits !== S.trigger) return {kind: 'waits', plate: `Waits for ${tName(waits)}`, waits};
      return {kind: 'idle', plate: 'No effect here', ...whyIdle(slot, last)};
    }
    if (!ok) return {kind: 'idle', plate: 'No effect here', ...whyIdle(slot, steps.filter(st => !st.success).pop())};
    if (ok.operation === 'multiply') {
      const second = V23 ? steps.find(st => st.success && st.pass === 2 && st.operation === 'multiply') : null;
      const m2 = second && Math.abs(second.multiplier - ok.multiplier) > 1e-9 ? second.multiplier : null;
      return {kind: 'act', role: 'mul', plate: `×${num(ok.multiplier)}`, step: ok, m2};
    }
    if (ok.operation === 'replay-row') return {kind: 'act', role: 'encore', plate: 'Encore', step: ok};
    if (ok.copiedBy && V23 && attr?.paid?.has(slot)) {const p = attr.paid.get(slot);return {kind: 'act', role: 'repeat-paid', plate: `Repeats ×${p.count}: +${num(p.amount)}`, step: ok, paid: p};}
    if (ok.copiedBy) return {kind: 'act', role: 'repeat', plate: 'Repeats next', step: ok};
    const base = ok.amount, eff = attr && !noEff ? attr.totals.get(slot) || 0 : null;
    const changed = eff !== null && Math.abs(eff - base) > 1e-6;
    return {kind: 'act', role: 'add', base, eff, changed, plate: `+${num(base)}`, step: ok, mods: attr?.mods.get(slot) || []};
  }
  function hereLine(c) {
    if (isRest(c)) return 'Rest card: it works from the Deck at Rest and never goes in the chain.';
    const slot = slotOf(c);
    if (slot < 0) return 'In your Deck, not in the chain: it does nothing until you put it in a slot.';
    const info = slotInfo(slot), st = info.step, at = `Slot ${slot + 1}`, on = tName(S.trigger);
    if (info.kind === 'passive') return `${at}: always on while it is in your chain. It does not fire.`;
    if (info.kind === 'waits') return `${at}: waits for ${tName(info.waits)}. It does nothing on ${on}; that is not a problem.`;
    if (info.kind === 'spent') return `${at}: its Uses were all spent by the repeats to its left, so it cannot act itself. The repeats count on that card.`;
    if (info.kind === 'idle') return `${at}: no effect on ${on}, because ${info.why}.${info.fix ? ` ${info.fix}` : ''}`;
    if (V23 && info.role === 'repeat-paid') return `${at}: repeats ${short(S.row[info.paid.target])} ${info.paid.count} times, +${num(info.paid.amount)} in all. ${short(S.row[info.paid.target])} then has no Uses left.`;
    if (V23 && info.role === 'mul' && info.m2) return `${at}: ×${num(st.multiplier)} on the first firing, ×${num(info.m2)} on the Encore.`;
    if (V22) {
      if (info.role === 'mul') return `${at}: multiplies the running total, ${num(st.before)} × ${num(st.multiplier)} = ${num(st.after)}.`;
      if (info.role === 'encore') {const p = attr?.passTotals || [];return p.length > 1 ? `${at}: fires the chain a second time: ${p.map(num).join(' + ')} = ${num(sol.sparks)}.` : `${at}: fires the chain a second time.`;}
      if (info.role === 'repeat') {const src = S.row.findIndex(x => x && x.instanceId === st.sourceInstanceId);const name = src >= 0 ? short(S.row[src]) : 'the next card';return `${at}: repeats ${name}. The extra ${num(st.amount)} shows on ${name}'s plate.`;}
      const by = (info.mods || []).filter(m => m.type === 'repeat').map(m => short(S.row[m.by]));
      return info.changed ? `${at}: adds ${num(info.base)}, repeated by ${[...new Set(by)].join(' and ')}: ${num(info.eff)}.` : `${at}: adds ${num(info.base)}.`;
    }
    if (info.role === 'mul') return `${at}: multiplies the Bonus so far, ${num(st.before)} × ${num(st.multiplier)} = ${num(st.after)}. The gain is counted on the cards it multiplies.`;
    if (info.role === 'encore') return `${at}: after a Bonus, your chain fires once more.`;
    if (info.role === 'repeat') {const src = S.row.findIndex(x => x && x.instanceId === st.sourceInstanceId);return `${at}: repeats ${src >= 0 ? short(S.row[src]) : 'the next card'}. That extra ${num(st.amount)} is counted on ${src >= 0 ? short(S.row[src]) : 'it'}.`;}
    const parts = (info.mods || []).map(m => m.type === 'repeat' ? `repeated by ${short(S.row[m.by])}` : m.type === 'mul' ? `×${num(m.m)} by ${short(S.row[m.by])}` : 'again in the Encore');
    return info.changed ? `${at}: adds ${num(info.base)}, ${parts.join(', ')}: ${num(info.eff)}.` : `${at}: adds ${num(info.base)}.`;
  }

  // ── Art ──────────────────────────────────────────────────────────────────────
  const EYE = pixelArt(['................', '................', '................', '................', '....OOOOOOOO....', '..OOYYYBBYYYOO..', '.OYYYBWBBBBYYYO.', 'OYYYBBBOOBBBYYYO', 'OYYYBBBOOBBBYYYO', '.OYYYBBBBBBYYYO.', '..OOYYYBBYYYOO..', '....OOOOOOOO....', BLANK, BLANK, BLANK, BLANK], {size: 32}).replace('viewBox="0 0 16 16" width="32" height="32"', 'viewBox="0 4 16 8" width="32" height="16"');
  const WARN = pixelArt(['.....OO.....', '....OGGO....', '....OGGO....', '...OGGGGO...', '...OGOOGO...', '..OGGOOGGO..', '..OGGOOGGO..', '.OGGGGGGGGO.', '.OGGGOOGGGO.', 'OGGGGGGGGGGO', 'OOOOOOOOOOOO', '............'], {size: 12});
  const PLUS = pixelArt(['........', '...OO...', '...OO...', '.OOOOOO.', '.OOOOOO.', '...OO...', '...OO...', '........'], {size: 16});
  const NEXT = '<svg viewBox="0 0 8 10" width="8" height="10" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h2v1h1v1h1v1h1v1h1v2H6v1H5v1H4v1H3v1H1V8h1V7h1V6h1V4H3V3H2V2H1z"/></svg>';
  const FIRE = pixelArt(CAMPFIRE, {size: 16, cls: 'dk21-fire'});
  const inert = html => html.replace(/<button type="button"/g, '<span').replace(/<\/button>/g, '</span>').replace(/ aria-haspopup="dialog"/g, '').replace(/: help"/g, '"');
  const eyeBtn = (attrs, label) => `<button type="button" class="dk2-btn dk21-eye" ${attrs} aria-haspopup="dialog" aria-label="${esc(label)}"><span class="dk21-eyebody">${EYE}</span></button>`;
  // v2.2: a Trigger as a glossary keyword: icon + name in ink with a dotted underline; tapping it explains the Trigger.
  const termBtn = (kind, {icon = true, cls = ''} = {}) => `<button type="button" class="dk2-btn dk22-term ${cls}" data-term="${kind}" aria-haspopup="dialog" aria-label="${esc(tName(kind))}: what it means">${icon ? triggerIcon(kind, 16) : ''}<span class="dk22-word">${esc(tName(kind))}</span></button>`;
  const tileLine0 = c => TILE_SHORT[c.cardId] || (getCardRuleBands(c, SKILL_CARDS[c.cardId]).find(bd => bd.type === 'effect')?.text || cardLines(c).effect).replace(/\.$/, '');
  const tileLine = c => V23 ? tileLine0(c).replace(/\bwaves\b/g, 'Pulses').replace(/\bwave\b/g, 'Pulse').replace(/\bWave\b/g, 'Pulse') : tileLine0(c);

  // ── v2.2 glossary panel for a Trigger keyword ────────────────────────────────
  function openGloss(kind, opener) {
    closeGloss({silent: true});
    S.gloss = {kind, opener};
    const host = document.createElement('div');host.className = 'dk22-glosshost';host.id = 'dk22-gloss';
    sheet.append(host);
    for (const el of [$('dk2-head'), $('dk2-rowpanel'), $('dk2-deckpanel'), $('dk2-read')]) if (el) el.inert = true;
    renderGloss();
    $('dk22-gclose').focus({preventScroll: true});
    announce(`${tName(kind)}. ${TRIGGER_MEANING[kind] || TRIGGER_BY[kind]?.what || ''} ${TRIGGER_EXTRA[kind] || ''}`);
  }
  function renderGloss() {
    const host = $('dk22-gloss');
    if (!host || !S.gloss) return;
    const kind = S.gloss.kind, r = solveK(S.row, kind);
    const actors = [...new Set(r.steps.filter(st => st.success).map(st => S.row[st.slot]).filter(Boolean).map(short))];
    const fires = trigs.some(t => t.kind === kind), shown = S.trigger === kind;
    const list = actors.length > 1 ? `${actors.slice(0, -1).join(', ')} and ${actors[actors.length - 1]}` : actors[0];
    host.innerHTML = `<div class="dk22-gpanel" role="dialog" aria-modal="true" aria-labelledby="dk22-gname">
      <div class="dk22-ghead">${triggerIcon(kind, 48)}<div><small>Trigger</small><h2 id="dk22-gname">${esc(tName(kind))}</h2></div></div>
      <p class="dk22-gtext">${esc(TRIGGER_MEANING[kind] || `When ${TRIGGER_BY[kind]?.what}.`)}${TRIGGER_EXTRA[kind] ? ` ${esc(TRIGGER_EXTRA[kind])}` : ''}</p>
      <p class="dk22-gchain">${actors.length ? `In your chain: ${esc(list)} ${actors.length > 1 ? 'act' : 'acts'} on it.` : 'No card in your chain acts on it yet.'}</p>
      <div class="dk2-acts">${fires && !shown ? '<button type="button" class="wb-sign wb-sign-standard" id="dk22-gshow"><span class="wb-sign-text"><b>Show on chain</b></span></button>' : fires ? '<p class="dk22-gshown">Shown on the chain now</p>' : ''}
       <button type="button" class="wb-sign wb-sign-quiet" id="dk22-gclose" aria-label="Close ${esc(tName(kind))}"><span class="wb-sign-text"><b>Close</b></span></button></div></div>`;
  }
  // Keys while the glossary is open (capture phase, so the card overlay's own keys do not run).
  document.addEventListener('keydown', event => {
    if (!S.gloss) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {event.preventDefault();closeGloss();}
    else if (event.key === 'Tab') {
      const items = [...$('dk22-gloss').querySelectorAll('button')];
      const i = items.indexOf(document.activeElement);
      event.preventDefault();items[(i + (event.shiftKey ? items.length - 1 : 1) + items.length) % items.length]?.focus();
    }
  }, true);
  function closeGloss({silent = false} = {}) {
    if (!S.gloss) return;
    const {opener} = S.gloss;S.gloss = null;
    $('dk22-gloss')?.remove();
    for (const el of [$('dk2-head'), $('dk2-rowpanel'), $('dk2-deckpanel')]) if (el) el.inert = !!S.reading;
    if ($('dk2-read')) $('dk2-read').inert = false;
    if (!silent && opener && document.contains(opener)) opener.focus({preventScroll: true});
  }

  // ── v2.3 lab page: the tile-only short lines, for the designer to skim (&tab=tilelines) ──
  if (V23 && query.get('tab') === 'tilelines') {
    const r0 = $('deck'), sh = $('dk-sheet');
    document.title = 'Tile lines · Deck v2.3 · Design lab';
    r0.className = 'dk dk2 dk21 dk22 dk23 dk23-lines wb-ground wb-t2 wb-t3 wb-flat wb-atlas wb-a2 wb-go';
    const rows = Object.entries(TILE_SHORT).map(([id, line]) => {
      const c = makeSkillCard(id, `tl-${id}`);
      const game = (getCardRuleBands(c, SKILL_CARDS[id]).find(bd => bd.type === 'effect')?.text || '').replace(/\.$/, '');
      return {name: SKILL_CARDS[id]?.name || id, rarity: RARITY_WORD[SKILL_CARDS[id]?.rarity] || '', game, line: line.replace(/\bwave\b/g, 'Pulse')};
    }).sort((a, b) => a.name.localeCompare(b.name));
    sh.innerHTML = `<div class="wb-pagelight" aria-hidden="true"></div>
      <header class="dk23-lhead"><h1>Tile lines <small>${rows.length} cards · lab only</small></h1><p>The game's short line, and the tile-only form used where it does not fit a Deck tile.</p></header>
      <div class="dk23-ltable" role="table" aria-label="Tile-only short lines"><div class="dk23-lrow dk23-lth" role="row"><span role="columnheader">Card</span><span role="columnheader">Rarity</span><span role="columnheader">Game line</span><span role="columnheader">Tile line</span></div>
      ${rows.map(r => `<div class="dk23-lrow" role="row"><span role="cell">${esc(r.name)}</span><span role="cell">${esc(r.rarity)}</span><span role="cell">${esc(r.game)}</span><span role="cell"><b>${esc(r.line)}</b></span></div>`).join('')}</div>`;
    document.documentElement.dataset.ready = 'true';
    return;
  }

  // ── Shell ────────────────────────────────────────────────────────────────────
  const root = $('deck'), sheet = $('dk-sheet');
  document.title = V23 ? 'Deck v2.3 · Design lab' : V22 ? 'Deck v2.2 · Design lab' : 'Deck v2.1 · Design lab';
  root.className = `dk dk2 dk21${V22 ? ' dk22' : ''}${V23 ? ' dk23' : ''} wb-ground wb-t2 wb-t3 wb-flat wb-atlas wb-a2 wb-go`;
  root.dataset.slots = String(SLOTS);
  const frames = {
    common: frameUrl({rim: '#9a9d90', light: '#fffbe8', dark: '#d2b97f', fill: '#f1e0b0'}),
    rare: frameUrl({rim: '#42768f', light: '#f0d68a', dark: '#c79f52', fill: '#f1e0b0'}),
    legendary: frameUrl({rim: '#716a7d', light: '#f3d6f7', dark: '#cfae86', fill: '#f1e0b0'}),
    rest: frameUrl({outline: '#6b5335', rim: '#b9a47a', light: '#efe2bc', dark: '#cbb58a', fill: '#e6d3a3'}),
    plate: frameUrl({rim: '#8a6d44', light: '#fffbe8', dark: '#d2b97f', fill: '#f1e0b0'}),
    idle: frameUrl({outline: '#5f5a4d', rim: '#8f897a', light: '#ddd6c2', dark: '#b3ab95', fill: '#cdc6b0'}),
    // Cards in the chain: moss outline and a faint moss-washed paper, so the group reads as placed.
    chainCommon: frameUrl({outline: '#3d4a22', rim: '#9a9d90', light: '#fbf8e2', dark: '#c9b980', fill: '#e9e4b6'}),
    chainRare: frameUrl({outline: '#3d4a22', rim: '#42768f', light: '#f0d68a', dark: '#c0a058', fill: '#e9e4b6'}),
    chainLegendary: frameUrl({outline: '#3d4a22', rim: '#716a7d', light: '#f3d6f7', dark: '#c9ab84', fill: '#e9e4b6'}),
  };
  for (const [k, v] of Object.entries(frames)) root.style.setProperty(`--fr-${k}`, v);
  sheet.innerHTML = `<div class="wb-pagelight" aria-hidden="true"></div>
  <header class="dk2-head dk21-head" id="dk2-head">
   <button type="button" class="wb-sign wb-sign-quiet dk2-done" id="dk2-done"><span class="wb-sign-text"><b>Done</b></span></button>
   <div class="dk2-tabs" role="tablist" aria-label="Deck screens">
    <button type="button" class="dk2-btn dk2-tab" role="tab" id="dk2-tab-chain" aria-controls="dk2-rowpanel" data-tab="chain"><span>Chain</span></button>
    <button type="button" class="dk2-btn dk2-tab" role="tab" id="dk2-tab-deck" aria-controls="dk2-deckpanel" data-tab="deck"><span>Deck</span></button>
   </div>
   <div class="dk2-context" id="dk2-context"><p class="dk2-note" id="dk2-note"></p>
    <button type="button" class="wb-sign wb-sign-quiet dk2-cancel" id="dk2-placecancel" hidden><span class="wb-sign-text"><b>Cancel</b></span></button>
    ${V22 ? '<button type="button" class="dk2-btn dk22-shuffle" id="dk22-shuffle" aria-label="Design lab only: shuffle the example chain"><small>Lab</small><span>Shuffle example</span></button>' : ''}</div>
  </header>
  <section class="dk2-panel dk2-rowpanel" id="dk2-rowpanel" role="tabpanel" aria-labelledby="dk2-tab-chain">
   <div class="dk2-stage dk21-stage" id="dk2-stage" role="group" aria-label="Your chain. On a Trigger, your cards fire left to right.">
    <div class="dk2-track" id="dk2-track" aria-hidden="true"></div>
    <div class="dk21-left" id="dk21-left"><h2 class="dk21-thead" id="dk21-thead">Triggers</h2><div class="dk21-chips" id="dk21-chips" role="radiogroup" aria-labelledby="dk21-thead"></div>
     <button type="button" class="wb-sign wb-sign-primary dk2-play dk21-play" id="dk2-play"><span class="wb-sign-text"><b>Play</b></span></button></div>
    <div class="dk2-anchor dk2-start dk21-start" aria-hidden="true"><span class="dk21-origin" id="dk21-origin"></span><span class="dk2-start-label" id="dk21-origin-name"></span></div>
    <div class="dk2-stations" id="dk2-stations"></div>
    ${V22 ? `<div class="dk22-sum" id="dk22-sum"><i class="dk22-eq" aria-hidden="true"></i>${V23 ? '<small class="dk23-passes" id="dk23-passes" aria-hidden="true"></small>' : ''}<span class="dk22-medal" id="dk22-medal"><b id="dk22-num"></b><small>Sparks</small></span></div>` : ''}
    ${V23 ? '<div class="dk2-track dk23-track2" id="dk23-track2" aria-hidden="true"></div>' : ''}
    <div class="dk2-anchor dk2-meter" id="dk2-meter"><span class="dk2-meter-label" aria-hidden="true">Spark Meter</span><div class="dk2-gauge" id="dk2-gauge" aria-hidden="true"></div>
     <div class="dk2-meter-info"><b id="dk2-meter-value"></b><small id="dk2-meter-gain"></small></div></div>
    <p class="dk2-result" id="dk2-result"></p>
    <div class="dk2-spark" id="dk2-spark" aria-hidden="true"><img id="dk2-spark-img" src="design-lab/assets/spark-a.svg" width="16" height="16" alt="" draggable="false"><b class="dk2-tag" id="dk2-tag"></b></div>
   </div>
  </section>
  <section class="dk2-panel dk2-deckpanel" id="dk2-deckpanel" role="tabpanel" aria-labelledby="dk2-tab-deck">
   <div class="dk2-bar" id="dk2-bar"></div>
   <div class="dk21-gridwrap" id="dk21-gridwrap"><div class="dk2-grid dk21-grid" id="dk2-grid" role="group" aria-label="All your cards"></div>
    <span class="dk21-more" id="dk21-more" aria-hidden="true">${pixelArt(CHEVRON, {size: 16})}</span></div>
  </section>`;
  const stage = $('dk2-stage');

  // ── Chain tab ────────────────────────────────────────────────────────────────
  function plateHTML(info) {
    if (info.kind === 'waits') return `<span class="dk23-waits"><small class="pl-long">Waits for</small><span class="dk23-wline">${triggerIcon(info.waits, 16)}<b class="pl-long">${esc(tName(info.waits))}</b><b class="pl-short">Waits</b></span></span>`;
    if (info.kind === 'spent') return '<b class="pl-long">Uses spent</b><b class="pl-short">Spent</b>';
    if (info.role === 'repeat-paid') return `<b class="pl-long">Repeats ×${info.paid.count}: +${num(info.paid.amount)}</b><b class="pl-short">×${info.paid.count}: +${num(info.paid.amount)}</b>`;
    if (info.role === 'mul' && info.m2) return `<b>×${num(info.step.multiplier)}</b><span class="dk23-m2"><b>· ×${num(info.m2)}</b><small>Encore</small></span>`;
    if (info.kind === 'idle') return V22 ? `<i class="dk2-warn">${WARN}</i><b class="pl-long">No effect here</b><b class="pl-short">No effect</b>` : `<i class="dk2-warn">${WARN}</i><b>No effect here</b>`;
    if (info.role === 'repeat') return '<b class="pl-long">Repeats next</b><b class="pl-short">Repeats</b>' + `<i class="pl-short dk2-next">${NEXT}</i>`;
    if (V22 && info.role === 'add' && info.changed) return `<span class="dk22-old"><span class="dk-sr">was </span>+${num(info.base)}</span><b class="dk22-new">+${num(info.eff)}</b>`;
    if (info.role === 'add' && info.changed) return `<s class="dk21-base">+${num(info.base)}</s><b class="dk21-eff">+${num(info.eff)}</b>`;
    if (V22 && info.role === 'encore') return '<b class="pl-long">Encore: again</b><b class="pl-short">Again</b>';
    return `<b>${esc(info.plate)}</b>`;
  }
  // v2.2: the crossed figure gets a stepped two-pixel diagonal, drawn at its exact pixel size (bottom left to top right).
  function drawSlashes() {
    stage.querySelectorAll('.dk22-old').forEach(el => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (w < 4 || h < 6) return;
      const top = 2, bottom = h - 2, span = bottom - top - 2;
      let d = '';
      for (let x = 0; x < w; x++) d += `M${x} ${top + Math.round(span * (1 - x / (w - 1)))}h1v2h-1z`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><path fill="#2a1d12" d="${d}"/></svg>`;
      el.style.setProperty('--slash', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    });
  }
  // v2.2: the result medallion, a pixel circle (outline, gold rim lit from the top left, paper inside) at its exact size.
  const medalCache = {};
  function medalUrl(D) {
    if (medalCache[D]) return medalCache[D];
    const r = D / 2, paths = {};
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
      const dist = Math.hypot(x + .5 - r, y + .5 - r);
      if (dist > r) continue;
      const lit = x + y < D - 1;
      const col = dist > r - 2 ? '#2a1d12' : dist > r - 3 ? (lit ? '#fff1c5' : '#b98f4a') : dist > r - 6 ? (lit ? '#f0c86a' : '#d39a3a') : dist > r - 7 ? '#8a6d44' : '#fbf1cf';
      (paths[col] ||= []).push(`M${x} ${y}h1v1h-1z`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}" viewBox="0 0 ${D} ${D}" shape-rendering="crispEdges">${Object.entries(paths).map(([c, p]) => `<path fill="${c}" d="${p.join('')}"/>`).join('')}</svg>`;
    return (medalCache[D] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }
  function plateWords(info) {
    if (info.kind === 'idle') return `No effect here: ${info.why}`;
    if (info.role === 'add' && info.changed) return `adds ${num(info.base)}, worth ${num(info.eff)} here`;
    return info.plate;
  }
  function renderChain() {
    resolve();
    const printed = getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: S.row.length, mountedCards: S.row});
    const placing = S.placing ? byUid(S.placing) : null;
    stage.style.setProperty('--n', String(SLOTS));
    $('dk2-stations').innerHTML = S.row.map((c, i) => {
      const info = slotInfo(i), col = `grid-column:${i + 2}`, lit = placing ? ' dk2-lit' : '';
      const notch = `<div class="dk2-anchor dk2-notch" style="${col}" aria-hidden="true"><i></i></div>`;
      const swap = `<button type="button" class="wb-sign wb-sign-quiet dk2-swap dk21-swap" data-slot="${i}" style="grid-column:${i + 2}" aria-label="${c ? `Swap ${esc(nameOf(c))} in slot ${i + 1} for another card` : `Add a card to slot ${i + 1}`}"><span class="wb-sign-text"><b>${c ? 'Swap' : 'Add'}</b></span></button>`;
      if (!c) {
        return `<div class="dk2-station dk2-empty${lit}" data-slot="${i}" style="${col}"><span class="dk2-eyerow"></span>
          <button type="button" class="dk2-btn dk2-card dk2-addcard" data-slot="${i}" aria-label="${placing ? `Put ${esc(nameOf(placing))} in slot ${i + 1}` : `Slot ${i + 1} is empty. Add a card`}"><span class="dk2-addskin">${PLUS}<b>${placing ? 'Put here' : 'Add a card'}</b></span></button>
          <span class="dk2-plate dk2-plate-empty" aria-hidden="true"></span></div>${notch}${swap}`;
      }
      const mark = markOf(c);
      const label = placing ? `Put ${nameOf(placing)} in slot ${i + 1}. ${nameOf(c)} goes back to the Deck`
        : `Slot ${i + 1}: ${nameOf(c)}, ${rarityWord(c)}. On ${tName(S.trigger)}: ${plateWords(info)}. Drag to trade slots, or open it`;
      return `<div class="dk2-station dk2-k-${info.kind}${lit}" data-slot="${i}" style="${col}">
        <span class="dk2-eyerow">${eyeBtn(`data-slot="${i}"`, `Read ${nameOf(c)}`)}</span>
        <button type="button" class="dk2-btn dk2-card" data-slot="${i}" aria-label="${esc(label)}">${mark && ['add', 'mul', 'repeat'].includes(mark.cls) ? `<span class="dk2-mark dk-mark-${mark.cls}" aria-hidden="true">${mark.glyph}</span>` : ''}${cardFace(printed[i], {compact: true})}${placing ? '<span class="dk2-puthere" aria-hidden="true">Put here</span>' : ''}</button>
        <span class="dk2-plate dk21-plate dk2-plate-${info.kind}${info.role === 'add' || info.role === 'mul' ? '' : ' dk2-plate-word'}${info.changed ? ' dk21-plate-changed' : ''}" aria-hidden="true">${plateHTML(info)}</span></div>${notch}${swap}`;
    }).join('');
    $('dk2-stations').querySelectorAll('.skill-card').forEach(node => {node.setAttribute('aria-hidden', 'true');node.querySelectorAll('[role="img"]').forEach(el => el.removeAttribute('role'));});
    // Trigger switch.
    // v2.2: each Trigger is a glossary keyword (tap the underlined word to read it); the rest of the line is a quiet
    // row that chooses which Trigger the track shows (a small pointer marks the shown one).
    if (V22) $('dk21-chips').innerHTML = (trigs.length ? trigs.map(t => `<div class="dk22-trow${t.kind === S.trigger ? ' dk22-on' : ''}"><button type="button" class="dk2-btn dk22-tsel" role="radio" data-trigger="${t.kind}" aria-checked="${t.kind === S.trigger}" tabindex="${t.kind === S.trigger ? 0 : -1}" aria-label="Show ${esc(tName(t.kind))} on the chain"><i class="dk22-dot" aria-hidden="true"></i></button>${termBtn(t.kind)}</div>`).join('')
      : '<p class="dk21-none">Nothing triggers this chain yet.</p>') + (V23 && trigs.length ? `<button type="button" class="dk2-btn dk23-help" aria-haspopup="dialog" aria-label="What is ${esc(tName(S.trigger))}?"><b>?</b></button>` : '');
    if (V23 && shortScreen.matches) $('dk21-chips').querySelectorAll('.dk22-trow .dk22-term').forEach(el => {el.setAttribute('aria-label', `Show ${tName(el.dataset.term)} on the chain`);el.setAttribute('aria-pressed', String(el.dataset.term === S.trigger));el.removeAttribute('aria-haspopup');});
    if (!V22) $('dk21-chips').innerHTML = trigs.length ? trigs.map(t => `<button type="button" class="dk2-btn dk21-chip" role="radio" data-trigger="${t.kind}" aria-checked="${t.kind === S.trigger}" tabindex="${t.kind === S.trigger ? 0 : -1}" aria-label="${esc(`${t.name}: ${t.what}`)}">${triggerIcon(t.kind, 16)}<span>${esc(t.name)}</span></button>`).join('')
      : '<p class="dk21-none">Nothing triggers this chain yet.</p>';
    root.dataset.triggers = trigs.map(t => t.kind).join(',');
    root.dataset.event = S.trigger;
    const tr = TRIGGER_BY[S.trigger];
    $('dk21-origin').innerHTML = trigs.length ? triggerIcon(S.trigger, 32) : '<img src="design-lab/assets/orb-wisp.svg" width="32" height="32" alt="">';
    if (V22) $('dk21-origin-name').innerHTML = trigs.length ? termBtn(S.trigger, {icon: false, cls: 'dk22-term-origin'}) : 'No Trigger';
    else $('dk21-origin-name').textContent = trigs.length ? tr.name : 'No Trigger';
    $('dk2-result').innerHTML = sol.sparks > 0 ? `<b>+${num(sol.sparks)}</b> Bonus` : '<b>No</b> Bonus';
    $('dk2-result').setAttribute('aria-label', sol.sparks > 0 ? `On ${tr.name}: plus ${num(sol.sparks)} Bonus` : `On ${tr.name}: no Bonus`);
    $('dk2-play').setAttribute('aria-label', `Play ${tr.name}: watch a Spark pass through your chain. Result: ${sol.sparks > 0 ? `+${num(sol.sparks)}` : 'no'} Bonus`);
    stage.classList.toggle('dk2-placing', !!placing);
    root.dataset.row = S.row.map(c => c ? c.cardId : '-').join(',');
    root.dataset.result = String(sol.sparks);
    root.dataset.attrib = attr ? 'ok' : 'plain';
    root.dataset.effsum = attr ? String(Math.round([...attr.totals.values()].reduce((a, b) => a + b, 0) * 1e6) / 1e6) : '';
    if (V22) {
      const text = sol.sparks > 0 ? `+${num(sol.sparks)}` : '0';
      $('dk22-num').textContent = text;
      $('dk22-medal').classList.toggle('dk22-long', text.length > 3);
      $('dk22-sum').setAttribute('aria-label', `Equals ${sol.sparks > 0 ? `plus ${num(sol.sparks)}` : 'zero'} Sparks on ${tr.name}`);
      $('dk22-sum').setAttribute('role', 'img');
      root.dataset.linesum = String(plateSum(!plain));
      root.dataset.plain = String(plain);
      if (V23) {
        // The Encore made visible: the two firings in small figures above the result.
        const encore = S.row.some((c, i) => c && slotInfo(i).role === 'encore');
        const p = attr?.passTotals || [];
        $('dk23-passes').textContent = encore && p.length > 1 ? `${p.map(num).join(' + ')}` : '';
        $('dk22-sum').setAttribute('aria-label', `Equals ${encore && p.length > 1 ? `${p.map(num).join(' plus ')}, ` : ''}${sol.sparks > 0 ? `plus ${num(sol.sparks)}` : 'zero'} Sparks on ${tr.name}`);
      }
    }
    meter(false);
    sizeStage();
    if (V22) {
      const medal = $('dk22-medal'), D = Math.round(medal.offsetWidth);
      medal.style.backgroundImage = medalUrl(D);
      (document.fonts?.ready || Promise.resolve()).then(drawSlashes);
      drawSlashes();
    }
  }
  function meter(full) {
    const flame = START_FLAME + (full ? sol.gainFlame : 0);
    $('dk2-gauge').innerHTML = glowGaugeMarkup({flame, skillSystem: CARD_SYSTEM, isTutorial: true});
    const startU = glowGaugeUnits(START_FLAME, MAX_FLAME), nowU = glowGaugeUnits(flame, MAX_FLAME);
    $('dk2-gauge').querySelectorAll('.glow-unit').forEach((u, i) => u.classList.toggle('dk2-gain', full && i >= startU.filled && i < nowU.filled));
    $('dk2-meter-value').textContent = `${nowU.value}/${nowU.maxValue}`;
    $('dk2-meter-gain').textContent = full && sol.gain > 0 && !V22 ? `+${sol.gain}` : '';
    $('dk2-meter').classList.toggle('dk2-meter-on', full);
  }
  const geo = {};
  function sizeStage() {
    if (S.tab !== 'chain') return;
    const cs = getComputedStyle(stage);
    const fixed = ['--eye', '--plate', '--ga', '--gb', '--swap'].reduce((sum, v) => sum + (parseFloat(cs.getPropertyValue(v)) || 0), 0);
    const h = stage.clientHeight, w = stage.clientWidth;
    const endl = parseFloat(cs.getPropertyValue('--endl')) || 96, endr = parseFloat(cs.getPropertyValue('--endr')) || 120;
    const medw = V22 ? parseFloat(cs.getPropertyValue('--medw')) || 0 : 0;
    const colW = (w - endl - endr - medw) / SLOTS;
    const card = Math.max(80, Math.min(parseFloat(cs.getPropertyValue('--card-max')) || 150, Math.floor(h - fixed - 10), Math.floor((colW - 10) * 7 / 5)));
    stage.style.setProperty('--card', `${card}px`);
    measure();
  }
  function measure() {
    const base = stage.getBoundingClientRect();
    if (!base.width) return;
    const centre = el => {const r = el.getBoundingClientRect();return {x: Math.round(r.left + r.width / 2 - base.left), y: Math.round(r.top + r.height / 2 - base.top)};};
    geo.orb = centre($('dk21-origin'));
    geo.gauge = centre(stage.querySelector('#flame-meter') || $('dk2-gauge'));
    geo.notches = [...stage.querySelectorAll('.dk2-notch>i')].map(centre);
    if (V22) geo.sum = centre($('dk22-medal'));
    geo.y = geo.orb.y;
    const track = $('dk2-track');
    if (V23) {
      // Two clean segments: from the Trigger icon's edge to a gap before "=", then from the medallion's edge to the meter.
      const rect = el => {const r = el.getBoundingClientRect();return {l: Math.round(r.left - base.left), r: Math.round(r.right - base.left)};};
      const icon = rect($('dk21-origin')), eq = rect(stage.querySelector('.dk22-eq')), medal = rect($('dk22-medal')), gauge = rect(stage.querySelector('#flame-meter') || $('dk2-gauge'));
      track.style.left = `${icon.r}px`;track.style.width = `${Math.max(0, eq.l - 8 - icon.r)}px`;track.style.top = `${geo.y - 3}px`;
      const t2 = $('dk23-track2');
      t2.style.left = `${medal.r}px`;t2.style.width = `${Math.max(0, gauge.l - 4 - medal.r)}px`;t2.style.top = `${geo.y - 3}px`;
    } else {track.style.left = `${geo.orb.x}px`;track.style.width = `${geo.gauge.x - geo.orb.x}px`;track.style.top = `${geo.y - 3}px`;}
    if (!playing) parkSpark();
  }
  let playing = 0, playTimer = 0;
  const sizeFor = k => k >= 2 ? 32 : 16;
  function sparkAt(x, size, bonus, poured = false, animate = true) {
    const spark = $('dk2-spark'), img = $('dk2-spark-img');
    spark.classList.toggle('dk2-moving', animate && !reduced.matches);
    spark.style.transform = `translate(${x}px,${geo.y}px)`;
    img.width = img.height = size;img.style.width = img.style.height = `${size}px`;img.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    $('dk2-tag').textContent = bonus === null ? '' : `Bonus ${num(bonus)}`;
    $('dk2-tag').style.left = `${size / 2 + 4}px`;
    spark.classList.toggle('dk2-poured', poured);
    spark.classList.toggle('dk2-notag', bonus === null);
  }
  // v2.3: no resting Spark beside the Trigger icon (it floated over the line); the Spark appears only while playing.
  function parkSpark() {if (geo.orb) sparkAt(geo.orb.x + 26, 16, null, false, false);if (V23) $('dk2-spark').classList.add('dk23-resting');}
  function stopPlay() {clearTimeout(playTimer);playing = 0;$('dk2-play').setAttribute('aria-pressed', 'false');stage.querySelectorAll('.dk2-firing').forEach(el => el.classList.remove('dk2-firing'));}
  function play() {
    stopPlay();meter(false);
    const acts = sol.steps.filter(st => st.success);
    const frames2 = [{x: geo.orb.x + 26, size: 16, bonus: 0}];
    acts.forEach((st, k) => frames2.push({x: geo.notches[st.slot].x, size: sizeFor(k + 1), bonus: st.after, slot: st.slot}));
    if (V22 && geo.sum) frames2.push({x: geo.sum.x, size: sizeFor(acts.length), bonus: sol.sparks});
    frames2.push({x: geo.gauge.x, size: sizeFor(acts.length), bonus: sol.sparks, end: true});
    $('dk2-spark').classList.remove('dk23-resting');
    const done = () => announce(sol.sparks > 0 ? `${tName(S.trigger)}: plus ${num(sol.sparks)} Bonus. ${sol.gain} Sparks go into your meter.` : `${tName(S.trigger)}: no Bonus this time.`);
    if (reduced.matches) {const last = frames2[frames2.length - 1];sparkAt(last.x, last.size, last.bonus, true, false);meter(true);done();return;}
    playing = 1;$('dk2-play').setAttribute('aria-pressed', 'true');
    let i = 0;
    const tick = () => {
      const f = frames2[i];
      stage.querySelectorAll('.dk2-firing').forEach(el => el.classList.remove('dk2-firing'));
      if (Number.isInteger(f.slot)) stage.querySelector(`.dk2-station[data-slot="${f.slot}"]`)?.classList.add('dk2-firing');
      sparkAt(f.x, f.size, f.bonus, false, i > 0);
      if (f.end) {
        playTimer = setTimeout(() => {sparkAt(f.x, f.size, f.bonus, true);meter(true);stopPlay();done();playTimer = setTimeout(() => {if (!playing) parkSpark();}, 2600);}, 520);
        return;
      }
      i += 1;playTimer = setTimeout(tick, i === 1 ? 500 : 760);
    };
    tick();
  }
  function setTrigger(kind, {focus = true} = {}) {
    if (!trigs.some(t => t.kind === kind)) return;
    stopPlay();S.trigger = kind;
    renderChain();
    if (focus) stage.querySelector(`[data-trigger="${kind}"]`)?.focus({preventScroll: true});
    announce(`${tName(kind)}: ${sol.sparks > 0 ? `plus ${num(sol.sparks)} Bonus` : 'no Bonus'}. ${S.row.map((c, i) => c && slotInfo(i).kind === 'idle' ? `${short(c)} has no effect.` : '').filter(Boolean).join(' ')}`.trim());
  }

  // ── Deck tab ─────────────────────────────────────────────────────────────────
  const RANK = {legendary: 0, rare: 1, common: 2};
  const countOf = r => all().filter(c => r === 'all' || rarityOf(c) === r).length;
  const passes = c => S.filter === 'all' || rarityOf(c) === S.filter;
  const order = list => list.sort((a, b) => S.sort === 'name' ? nameOf(a).localeCompare(nameOf(b)) : RANK[rarityOf(a)] - RANK[rarityOf(b)] || nameOf(a).localeCompare(nameOf(b)));
  function groups() {
    const chain = S.row.filter(c => c && passes(c));
    const free = order(S.reserve.filter(c => !isRest(c) && passes(c)));
    const rest = order(S.reserve.filter(c => isRest(c) && passes(c)));
    return [
      {id: 'chain', title: 'In your chain', cards: chain},
      {id: 'free', title: 'Not in chain', cards: free},
      {id: 'rest', title: S.pick !== null ? 'Cannot go in a slot' : 'Rest cards', note: S.pick !== null ? 'Rest cards work from the Deck at Rest.' : 'Work from the Deck at Rest. They never go in the chain.', cards: rest},
    ].filter(g => g.cards.length);
  }
  function tile(c) {
    const r = rarityOf(c), L = cardLines(c), mark = markOf(c), at = slotOf(c), rest = isRest(c), w = whenOf(c);
    const u = Number.isFinite(c.charges) ? {now: c.charges, max: getCardChargeCapacity(c)} : null;
    const effect = V22 ? tileLine(c) : L.effect.replace(/\bRow\b/g, 'Chain').replace(/\brow\b/g, 'chain');
    let label = `${nameOf(c)}. ${rarityWord(c)}. ${effect}.${w.kind ? ` Trigger: ${w.text}.` : ''}${at >= 0 ? ` In your chain, slot ${at + 1}.` : rest ? ' Rest card.' : ' Not in your chain.'}${u ? ` Uses ${u.now} of ${u.max}.` : ''}`;
    let cls = '', sub = '', disabled = false;
    if (S.pick !== null) {
      if (rest) {cls = ' dk2-dim';disabled = true;label = `${nameOf(c)}: Rest cards work from the Deck. They cannot go in a slot.`;}
      else if (at === S.pick) {cls = ' dk2-dim dk21-here';disabled = true;sub = 'Already in this slot';label = `${nameOf(c)} is already in slot ${at + 1}`;}
      else if (at >= 0) {cls = ' dk2-choice';sub = `Trades with slot ${S.pick + 1}`;label = `Trade slots: ${nameOf(c)} goes to slot ${S.pick + 1}${S.row[S.pick] ? `, ${nameOf(S.row[S.pick])} goes to slot ${at + 1}` : ''}`;}
      else {cls = ' dk2-choice';label = `Put ${nameOf(c)} in slot ${S.pick + 1}${S.row[S.pick] ? `. ${nameOf(S.row[S.pick])} goes back to the Deck` : ''}`;}
    }
    const frame = rest ? 'rest' : at >= 0 ? `chain${RARITY_WORD[r]}` : r;
    return `<div class="dk2-tile dk21-tile dc-r-${r}${rest ? ' dk21-rest' : ''}${at >= 0 ? ' dk21-inchain' : ''}${cls}" data-uid="${esc(c.instanceId)}" style="--fr:var(--fr-${frame})">
      <button type="button" class="dk2-btn dk2-tilemain dk21-tilemain" data-uid="${esc(c.instanceId)}" aria-label="${esc(label)}" ${disabled ? 'aria-disabled="true"' : ''}>
       <span class="dk21-top"><span class="dk21-rtab">${gem(r)}<b>${RARITY_WORD[r]}</b></span>
        ${w.kind && !V22 ? `<span class="dk21-when">${triggerIcon(w.kind, 16)}<small>${esc(w.text)}</small></span>` : ''}
        ${rest ? `<span class="dk21-resttag">${FIRE}<b>Rest</b></span>` : at >= 0 ? `<span class="dk21-slot"><b>Slot ${at + 1}</b></span>` : ''}</span>
       <span class="dk2-body dk21-body"><span class="dk2-art dk21-art">${cardArt(c, {compact: true})}${mark && !rest && ['add', 'mul', 'repeat'].includes(mark.cls) ? `<span class="dk2-mark dk-mark-${mark.cls}" aria-hidden="true">${mark.glyph}</span>` : ''}${u ? `<span class="dk2-uses" aria-hidden="true">${u.now}/${u.max}</span>` : ''}</span>
        <span class="dk2-text"><b class="dk2-name">${esc(nameOf(c))}</b>${sub ? `<small class="dk2-sub">${esc(sub)}</small>` : `<b class="dk2-effect">${esc(effect)}</b>`}${V23 && w.kind ? `<span class="dk23-when">${triggerIcon(w.kind, 16)}<span>${esc(tName(w.kind))}</span></span>` : ''}</span></span>
      </button>
      ${V22 && !V23 && w.kind ? termBtn(w.kind, {cls: 'dk22-term-tile'}) : ''}${eyeBtn(`data-uid="${esc(c.instanceId)}"`, `Read ${nameOf(c)}`)}</div>`;
  }
  function renderDeck() {
    const bar = $('dk2-bar');
    if (S.pick !== null) {
      const here = S.row[S.pick];
      bar.innerHTML = `<p class="dk2-banner" id="dk2-banner"><b>Choose a card for slot ${S.pick + 1}</b><span>${here ? `${esc(short(here))} goes back to the Deck` : 'This slot is empty'}</span></p>
        <button type="button" class="wb-sign wb-sign-quiet dk2-cancel" id="dk2-pickcancel"><span class="wb-sign-text"><b>Cancel</b></span></button>`;
    } else {
      bar.innerHTML = `<div class="dk2-chips" role="group" aria-label="Show by rarity">${['all', 'common', 'rare', 'legendary'].map(f => `<button type="button" class="dk2-btn dk2-chip ${f !== 'all' ? 'dc-r-' + f : ''}" data-filter="${f}" aria-pressed="${S.filter === f}" aria-label="${f === 'all' ? 'All cards' : RARITY_WORD[f]}: ${countOf(f)}">${f === 'all' ? '' : gem(f)}<span>${f === 'all' ? 'All' : RARITY_WORD[f]}</span><b>${countOf(f)}</b></button>`).join('')}</div>
        <button type="button" class="dk2-btn dk2-sort" id="dk2-sort" aria-label="Sort by ${S.sort}. Press to sort by ${S.sort === 'rarity' ? 'name' : 'rarity'}"><small>Sort</small><b>${S.sort === 'rarity' ? 'Rarity' : 'Name'}</b></button>`;
    }
    const grid = $('dk2-grid'), top = grid.scrollTop;
    grid.classList.toggle('dk2-picking', S.pick !== null);
    const gs = groups();
    grid.innerHTML = gs.map(g => `<h3 class="dk21-group dk21-group-${g.id}"><span>${esc(g.title)}</span><i class="dk21-rule" aria-hidden="true"></i></h3>${g.note ? `<p class="dk21-groupnote">${esc(g.note)}</p>` : ''}${g.cards.map(tile).join('')}`).join('') || '<p class="dk2-none">No cards here</p>';
    grid.querySelectorAll('svg[role="img"]').forEach(svg => {svg.removeAttribute('role');svg.setAttribute('aria-hidden', 'true');});
    grid.scrollTop = top;
    hint();
  }
  function hint() {
    const grid = $('dk2-grid');
    const more = grid.scrollHeight - grid.scrollTop - grid.clientHeight > 2;
    $('dk21-gridwrap').classList.toggle('dk21-hasmore', more);
  }

  // ── Header and tabs ──────────────────────────────────────────────────────────
  function renderHead() {
    for (const t of ['chain', 'deck']) {
      const b = $(`dk2-tab-${t}`), on = S.tab === t;
      b.setAttribute('aria-selected', String(on));b.tabIndex = on ? 0 : -1;
    }
    $('dk2-rowpanel').hidden = S.tab !== 'chain';$('dk2-deckpanel').hidden = S.tab !== 'deck';
    const placing = S.placing ? byUid(S.placing) : null;
    const note = $('dk2-note');
    note.textContent = placing ? `Choose a slot for ${short(placing)}` : S.note;
    note.className = `dk2-note ${placing ? 'dk2-note-mode' : S.noteTone}`;
    $('dk2-placecancel').hidden = !placing;
    if (placing) $('dk2-placecancel').setAttribute('aria-label', `Cancel: keep ${nameOf(placing)} in the Deck`);
    root.dataset.view = S.tab;root.dataset.mode = S.pick !== null ? 'pick' : placing ? 'place' : '';
  }
  function render() {
    renderHead();
    if (S.tab === 'chain') renderChain(); else renderDeck();
    root.dataset.cards = String(all().length);
    root.dataset.wallet = String(S.wallet);
  }
  const say = (text, tone = '') => {S.note = text;S.noteTone = tone;};
  function showTab(tab, {focus = true} = {}) {
    if (tab === S.tab) return;
    stopPlay();
    if (tab === 'chain' && S.pick !== null) S.pick = null;
    if (tab === 'deck' && S.placing) S.placing = null;
    S.tab = tab;render();
    if (focus) $(`dk2-tab-${tab}`).focus({preventScroll: true});
  }

  // ── Moves (every one recomputes the chain with the real resolver) ────────────
  function resultWords() {resolve();return sol.sparks > 0 ? `${tName(S.trigger)}: +${num(sol.sparks)} Bonus` : `${tName(S.trigger)}: no Bonus`;}
  const swapSlots = (a, b) => {const ca = S.row[a];S.row[a] = S.row[b];S.row[b] = ca;};
  function putInSlot(c, slot) {
    if (isRest(c)) return undefined; // Rest cards never go in a slot, by any route.
    const out = S.row[slot];
    S.reserve = S.reserve.filter(x => x !== c);S.row[slot] = c;
    if (out) S.reserve.unshift(out);
    return out;
  }
  function afterMove(text, slot) {
    S.pick = null;S.placing = null;S.tab = 'chain';
    say(text, 'dk2-note-done');
    render();
    announce(`${text} ${resultWords()}.`);
    const node = stage.querySelector(`.dk2-card[data-slot="${slot}"]`);
    node?.focus({preventScroll: true});
    if (!reduced.matches) node?.animate([{transform: 'translateY(-6px)'}, {transform: 'none'}], {duration: 220, easing: 'steps(3,end)'});
  }
  function refuseRest(c) {say(`${short(c)} is a Rest card: it works from the Deck at Rest`, 'dk2-note-warn');renderHead();announce(`${nameOf(c)} cannot go in a slot. Rest cards work from the Deck at Rest.`);}
  function chooseForPick(c) {
    const slot = S.pick;
    if (slot === null || !c) return;
    if (isRest(c)) {refuseRest(c);return;}
    const at = slotOf(c);
    if (at === slot) return;
    if (at >= 0) {const other = S.row[slot];swapSlots(at, slot);afterMove(other ? `Traded: ${short(c)} is in slot ${slot + 1}, ${short(other)} in slot ${at + 1}.` : `Moved ${short(c)} to slot ${slot + 1}.`, slot);}
    else {const out = putInSlot(c, slot);afterMove(out ? `${short(c)} is in slot ${slot + 1}. ${short(out)} went back to the Deck.` : `${short(c)} is in slot ${slot + 1}.`, slot);}
  }
  function startPick(slot) {
    S.pick = slot;S.placing = null;S.tab = 'deck';say('');
    render();$('dk2-tab-deck').focus({preventScroll: true});
    announce(`Choose a card for slot ${slot + 1}. ${S.row[slot] ? `${nameOf(S.row[slot])} goes back to the Deck.` : ''} Cancel returns to your chain.`);
  }
  function cancelPick() {
    const slot = S.pick;
    S.pick = null;S.tab = 'chain';say('');render();
    stage.querySelector(`.dk2-swap[data-slot="${slot}"]`)?.focus({preventScroll: true});
    announce('Cancelled. Your chain is unchanged.');
  }
  function startPlacing(c) {
    if (!c || isRest(c)) {if (c) refuseRest(c);return;}
    S.placing = c.instanceId;S.pick = null;S.tab = 'chain';say('');
    render();stage.querySelector('.dk2-card')?.focus({preventScroll: true});
    announce(`${nameOf(c)} picked up. Tap a slot to put it there; the card in that slot goes back to the Deck. Or Cancel.`);
  }
  function placeAt(slot) {
    const c = byUid(S.placing);
    if (!c) return;
    if (isRest(c)) {S.placing = null;render();refuseRest(c);return;}
    const at = slotOf(c);
    if (at >= 0) {if (at === slot) {cancelPlacing();return;}const other = S.row[slot];swapSlots(at, slot);afterMove(other ? `Traded: ${short(c)} is in slot ${slot + 1}, ${short(other)} in slot ${at + 1}.` : `Moved ${short(c)} to slot ${slot + 1}.`, slot);return;}
    const out = putInSlot(c, slot);
    afterMove(out ? `${short(c)} is in slot ${slot + 1}. ${short(out)} went back to the Deck.` : `${short(c)} is in slot ${slot + 1}.`, slot);
  }
  function cancelPlacing() {
    const c = byUid(S.placing);
    S.placing = null;say('');render();$('dk2-tab-chain').focus({preventScroll: true});
    announce(`Cancelled. ${c ? nameOf(c) : 'The card'} stays where it was.`);
  }

  // ── The card overlay ─────────────────────────────────────────────────────────
  function openCard(c, opener) {
    if (!c || S.reading) return;
    stopPlay();
    S.reading = {uid: c.instanceId, opener};S.melting = false;
    opener?.setAttribute?.('aria-expanded', 'true');
    const host = document.createElement('div');host.className = 'dk2-read';host.id = 'dk2-read';sheet.append(host);
    for (const el of [$('dk2-head'), $('dk2-rowpanel'), $('dk2-deckpanel')]) el.inert = true;
    renderCard();
    $('dk2-close')?.focus({preventScroll: true});
    const w = whenOf(c);
    announce(`${nameOf(c)}. ${rarityWord(c)}. Triggers on: ${w.text}. ${hereLine(c)}`);
  }
  function renderCard() {
    const c = S.reading && byUid(S.reading.uid), host = $('dk2-read');
    if (!c || !host) return;
    const at = slotOf(c), rest = isRest(c), value = getCardMeltValue(c), w = whenOf(c);
    const printed = at >= 0 ? getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: S.row.length, mountedCards: S.row})[at] : describeSkillCard(c);
    const idle = at >= 0 && slotInfo(at).kind === 'idle';
    let acts = '';
    if (S.melting) {
      acts = `<p class="dk2-confirm" id="dk2-confirm">You get <b>+${value} Stored Sparks</b> · you have ${S.wallet}. ${esc(short(c))} is gone for good.</p>
        <div class="dk2-acts"><button type="button" class="wb-sign wb-sign-quiet" id="dk2-keep"><span class="wb-sign-text"><b>Keep</b></span></button>
        <button type="button" class="wb-sign wb-sign-danger" id="dk2-meltgo" aria-label="Melt ${esc(nameOf(c))} for ${value} Stored Sparks. This cannot be undone."><span class="wb-sign-text"><b>Melt</b></span></button></div>`;
    } else if (S.tab === 'deck' && S.pick !== null) {
      acts = rest || at === S.pick ? '' : `<div class="dk2-acts"><button type="button" class="wb-sign wb-sign-primary dk2-wide" id="dk2-choose"><span class="wb-sign-text"><b>Choose for slot ${S.pick + 1}</b></span></button></div>`;
    } else if (S.tab === 'deck') {
      acts = `<div class="dk2-acts">${rest ? '' : `<button type="button" class="wb-sign wb-sign-standard" id="dk2-put" aria-label="${at >= 0 ? `Move ${esc(nameOf(c))} to another slot` : `Put ${esc(nameOf(c))} in your chain`}"><span class="wb-sign-text"><b>${at >= 0 ? 'Move…' : 'Put in chain…'}</b></span></button>`}
        <button type="button" class="wb-sign wb-sign-quiet" id="dk2-melt" aria-label="Melt ${esc(nameOf(c))}: shows what you get first"><span class="wb-sign-text"><b>Melt…</b></span></button></div>`;
    }
    host.innerHTML = `<div class="dk2-dialog" role="dialog" aria-modal="true" aria-labelledby="dk2-read-name">
      <div class="dk2-face" id="dk2-face" aria-hidden="true">${inert(cardFace(printed, {compact: false}))}</div>
      <div class="dk2-info">
       <h2 class="dk-sr" id="dk2-read-name">${esc(nameOf(c))}</h2>
       <p class="dk2-rar dc-r-${rarityOf(c)}">${gem(rarityOf(c))}<span>${rarityWord(c)}</span></p>
       <p class="dk21-on"><small>Triggers on</small>${V22 && w.kind ? termBtn(w.kind) : `${w.kind ? triggerIcon(w.kind, 16) : rest ? FIRE : ''}<b>${esc(w.text)}</b>`}</p>
       <p class="dk2-here${idle ? ' dk2-here-idle' : ''}">${idle ? `<i class="dk2-warn">${WARN}</i>` : ''}<span>${esc(hereLine(c))}</span></p>
       ${acts}
       <button type="button" class="wb-sign wb-sign-quiet dk2-close" id="dk2-close" aria-label="Close ${esc(nameOf(c))}"><span class="wb-sign-text"><b>Close</b></span></button>
      </div></div>`;
    const face = $('dk2-face');
    face.querySelector('.card-help')?.remove();
    face.querySelectorAll('.card-term-icon-spark, .card-term-icon-meter').forEach(icon => {icon.innerHTML = SPARK_IMG;});
    face.querySelectorAll('[tabindex]').forEach(el => el.removeAttribute('tabindex'));
    face.querySelectorAll('[role="img"]').forEach(el => el.removeAttribute('role'));
    sizeFace();
  }
  function sizeFace() {
    const host = $('dk2-read'), face = $('dk2-face');
    if (!host || !face) return;
    face.style.setProperty('--face', `${Math.floor(Math.min(340, host.clientHeight - 20))}px`);
  }
  function closeCard() {
    if (!S.reading) return;
    const {opener} = S.reading;
    S.reading = null;S.melting = false;
    $('dk2-read')?.remove();
    for (const el of [$('dk2-head'), $('dk2-rowpanel'), $('dk2-deckpanel')]) el.inert = false;
    opener?.removeAttribute?.('aria-expanded');
    if (opener && document.contains(opener)) opener.focus({preventScroll: true});
  }
  function confirmMelt() {
    const c = S.reading && byUid(S.reading.uid);
    if (!c) return;
    const value = getCardMeltValue(c), was = S.wallet, at = slotOf(c);
    if (at >= 0) S.row[at] = null; else S.reserve = S.reserve.filter(x => x !== c);
    S.wallet += value;
    closeCard();
    say(`Melted ${short(c)} · +${value} Stored Sparks (you have ${S.wallet})`, 'dk2-note-receipt');
    render();
    announce(`Melted ${nameOf(c)}. Plus ${value} Stored Sparks: ${was} to ${S.wallet}.${at >= 0 ? ` Slot ${at + 1} is now empty. ${resultWords()}.` : ''}`);
    ($('dk2-grid').querySelector('.dk2-tilemain') || $('dk2-tab-deck')).focus({preventScroll: true});
  }

  // ── Input ────────────────────────────────────────────────────────────────────
  let swallow = false;
  sheet.addEventListener('click', event => {
    if (swallow) {swallow = false;return;}
    const t = event.target;
    if (S.gloss) {
      if (t.closest('#dk22-gclose') || t === $('dk22-gloss')) {closeGloss();return;}
      if (t.closest('#dk22-gshow')) {const k = S.gloss.kind;closeGloss({silent: true});if (S.reading) closeCard();if (S.tab !== 'chain') showTab('chain', {focus: false});setTrigger(k);return;}
      return;
    }
    // v2.3, short screens: a Trigger icon in the list switches the track; the "?" after the list explains the shown one.
    if (t.closest('.dk23-help')) {openGloss(S.trigger, t.closest('.dk23-help'));return;}
    const term = t.closest('.dk22-term');
    if (term && V23 && term.closest('.dk22-trow') && shortScreen.matches) {setTrigger(term.dataset.term);return;}
    if (term) {openGloss(term.dataset.term, term);return;}
    if (t.closest('#dk22-shuffle')) {const q = new URLSearchParams(location.search);q.set('chain', 'random');q.set('seed', String(1 + Math.floor(Math.random() * 99999)));location.search = q.toString();return;}
    if (S.reading) {
      const c = byUid(S.reading.uid);
      if (t.closest('#dk2-close') || t === $('dk2-read')) {closeCard();return;}
      if (t.closest('#dk2-melt')) {S.melting = true;renderCard();$('dk2-keep').focus({preventScroll: true});announce(`Melt ${nameOf(c)}? You get ${getCardMeltValue(c)} Stored Sparks; you have ${S.wallet}. It is gone for good.`);return;}
      if (t.closest('#dk2-keep')) {S.melting = false;renderCard();$('dk2-melt')?.focus({preventScroll: true});announce('Kept.');return;}
      if (t.closest('#dk2-meltgo')) {confirmMelt();return;}
      if (t.closest('#dk2-put')) {closeCard();startPlacing(c);return;}
      if (t.closest('#dk2-choose')) {closeCard();chooseForPick(c);return;}
      return;
    }
    const tab = t.closest('.dk2-tab');
    if (tab) {showTab(tab.dataset.tab);return;}
    if (t.closest('#dk2-done')) {say('In the game, Done returns to where you opened the Deck');renderHead();announce('Done returns to where you opened the Deck.');return;}
    if (t.closest('#dk2-placecancel')) {cancelPlacing();return;}
    if (t.closest('#dk2-pickcancel')) {cancelPick();return;}
    if (t.closest('#dk2-play')) {if (S.placing) cancelPlacing();play();return;}
    const chip = t.closest('.dk21-chip, .dk22-tsel');
    if (chip) {setTrigger(chip.dataset.trigger);return;}
    const filter = t.closest('[data-filter]');
    if (filter) {S.filter = filter.dataset.filter;renderDeck();$('dk2-bar').querySelector(`[data-filter="${S.filter}"]`)?.focus({preventScroll: true});announce(`${S.filter === 'all' ? 'All cards' : RARITY_WORD[S.filter]}: ${countOf(S.filter)}.`);return;}
    if (t.closest('#dk2-sort')) {S.sort = S.sort === 'rarity' ? 'name' : 'rarity';renderDeck();$('dk2-sort').focus({preventScroll: true});announce(`Sorted by ${S.sort}.`);return;}
    const eye = t.closest('.dk21-eye');
    if (eye && eye.dataset.slot !== undefined) {openCard(S.row[Number(eye.dataset.slot)], eye);return;}
    if (eye && eye.dataset.uid) {openCard(byUid(eye.dataset.uid), eye);return;}
    const swapBtn = t.closest('.dk2-swap');
    if (swapBtn) {if (S.placing) placeAt(Number(swapBtn.dataset.slot)); else startPick(Number(swapBtn.dataset.slot));return;}
    const cardBtn = t.closest('.dk2-card');
    if (cardBtn) {
      const slot = Number(cardBtn.dataset.slot);
      if (S.placing) {placeAt(slot);return;}
      if (!S.row[slot]) {startPick(slot);return;}
      openCard(S.row[slot], cardBtn);return;
    }
    const main = t.closest('.dk2-tilemain');
    if (main) {const c = byUid(main.dataset.uid);if (S.pick !== null) chooseForPick(c); else openCard(c, main);}
  });
  document.addEventListener('keydown', event => {
    if (S.reading) {
      if (event.key === 'Escape') {event.preventDefault();if (S.melting) {S.melting = false;renderCard();$('dk2-melt')?.focus();} else closeCard();}
      else if (event.key === 'Tab') {
        const items = [...$('dk2-read').querySelectorAll('button')];
        const i = items.indexOf(document.activeElement);
        event.preventDefault();items[(i + (event.shiftKey ? items.length - 1 : 1) + items.length) % items.length]?.focus();
      }
      return;
    }
    if (event.key === 'Escape') {
      if (S.pick !== null) {event.preventDefault();cancelPick();return;}
      if (S.placing) {event.preventDefault();cancelPlacing();return;}
    }
    const tab = event.target.closest?.('[role="tab"]');
    if (tab && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {event.preventDefault();showTab(S.tab === 'chain' ? 'deck' : 'chain');return;}
    const chip = event.target.closest?.('.dk21-chip, .dk22-tsel');
    if (chip && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && trigs.length > 1) {
      event.preventDefault();
      const i = trigs.findIndex(x => x.kind === S.trigger), step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      setTrigger(trigs[(i + step + trigs.length) % trigs.length].kind);
    }
  });
  // Drag a chain card onto another slot: the two trade slots (an empty slot just takes it). Rest cards are never in the chain.
  let drag = null;
  stage.addEventListener('pointerdown', event => {
    const card = event.target.closest('.dk2-card');
    if (!card || event.button !== 0 || S.placing || S.reading) return;
    const slot = Number(card.dataset.slot);
    if (!S.row[slot]) return;
    drag = {node: card, slot, x: event.clientX, y: event.clientY, id: event.pointerId, moved: false};
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) {drag.moved = true;stopPlay();drag.node.classList.add('dk2-dragging');stage.classList.add('dk2-dragmode');}
    drag.node.style.transform = `translate(${Math.round(dx)}px,${Math.round(dy)}px)`;
    const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('.dk2-station')).find(el => el && Number(el.dataset.slot) !== drag.slot);
    stage.querySelectorAll('.dk2-station').forEach(el => el.classList.toggle('dk2-drop', el === over));
    event.preventDefault();
  });
  const endDrag = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const {node, slot, moved} = drag;drag = null;
    if (!moved) return;
    swallow = true;setTimeout(() => {swallow = false;}, 0);
    node.classList.remove('dk2-dragging');node.style.transform = '';stage.classList.remove('dk2-dragmode');
    const target = stage.querySelector('.dk2-station.dk2-drop');
    stage.querySelectorAll('.dk2-drop').forEach(el => el.classList.remove('dk2-drop'));
    if (!target || event.type !== 'pointerup') return;
    const to = Number(target.dataset.slot), c = S.row[slot], other = S.row[to];
    swapSlots(slot, to);
    afterMove(other ? `Traded: ${short(c)} is in slot ${to + 1}, ${short(other)} in slot ${slot + 1}.` : `Moved ${short(c)} to slot ${to + 1}.`, to);
  };
  window.addEventListener('pointerup', endDrag);window.addEventListener('pointercancel', endDrag);
  $('dk2-grid').addEventListener('scroll', hint, {passive: true});

  const relayout = () => {if (S.tab === 'chain') sizeStage(); else hint();sizeFace();};
  if (V23) shortScreen.addEventListener('change', () => {if (S.tab === 'chain') renderChain();});
  addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(stage);
  new ResizeObserver(relayout).observe($('dk2-grid'));
  document.fonts?.ready.then(relayout);

  resolve();
  render();
  window.deck = {
    state: S, get sol() {return sol;}, get attr() {return attr;}, get plain() {return plain;}, plateSum, randomChain, get triggers() {return trigs;}, solve: solveK, triggersFor, attribute, slotInfo, hereLine, cardLines, countOf, geo, tileLine,
    open: uidOrSlot => openCard(typeof uidOrSlot === 'number' ? S.row[uidOrSlot] : byUid(uidOrSlot) || all().find(c => c.cardId === uidOrSlot)),
    close: closeCard, play, setTrigger: k => setTrigger(k, {focus: false}),
    swap: (a, b) => {swapSlots(a, b);afterMove(`Traded slots ${a + 1} and ${b + 1}.`, b);},
    setChain: ids => {const pool = all();S.row = ids.map(id => id ? pool.find(c => c.cardId === id) || mk(id) : null);S.reserve = pool.filter(c => !S.row.includes(c));S.tab = 'chain';render();},
    pick: startPick, place: (uid, slot) => {S.placing = uid;placeAt(slot);}, putInSlot, showTab, byId: id => all().find(c => c.cardId === id),
    TRIGGERS, triggerIcon,
  };
}

if (V11) runV11();
if (V20) runV20();
if (V21) runV21();
document.documentElement.dataset.ready = 'true';
