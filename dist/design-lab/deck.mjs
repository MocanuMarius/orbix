// v1.0-deck: one Deck screen. Row and Reserve on one page, one pick-up-and-place interaction for everything.
// Every verdict on this page comes from the game's own functions: placement status from
// card-status.mjs › getEquippedCardStatuses, the result line from skill-cards.mjs › previewCardRow,
// melt values from getCardMeltValue, Rest cards from isInventoryOnlyCard. The page only adds words and layout.
import {CARD_SYSTEM, CARD_ROW_EVENTS, SKILL_CARDS, makeSkillCard, getCardChargeCapacity, getMountedCards, describeSkillCard, getCardRowRule, hasCardRowEvent, previewCardRow, getCardMeltValue, isInventoryOnlyCard} from '../skill-cards.mjs?v=guide-clarity-1';
import {getEquippedCardStatuses} from '../card-status.mjs?v=guide-clarity-1';
import {cardFace, cardArt} from '../card-ui.mjs?v=guide-clarity-1';
import {resourceSymbol} from '../game-symbols.mjs?v=guide-clarity-1';
import {getCardRuleBands} from '../card-rule-bands.mjs?v=guide-clarity-1';

const query = new URLSearchParams(location.search);
const variant = query.get('variant') || 'v1.0-deck';
const V11 = variant === 'v1.1-deck';
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
if (!V11) {
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
  [/^Finish this pass, then replay once from slot 1$/i, 'Encore: row fires again'],
  [/^\+(\d+) maximum Sparks and a full meter$/i, '+$1 max Sparks, full meter'],
  [/^An amber chevron shows when .*$/i, 'Shows when to Lift'],
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
  return {when, spark, effect, fallback, long: bands.map(b => b.text).join(' ')};
}
const WHEN_PHRASE = {'Catch a Spark': 'you catch a Spark', 'After a + card': 'a card that Adds fired before it', 'Wave crosses a Spark': 'a wave crosses a Spark', 'Collector delivers': 'Collector delivers a Spark'};
function cardSentence(c, L, mark) {
  const rule = getCardRowRule(SKILL_CARDS[c.cardId], c);
  const phrase = WHEN_PHRASE[L.when] || L.when.replace(/^./, m => m.toLowerCase());
  if (isRest(c)) return `At Rest: ${L.effect}. It stays in the Reserve and never goes in your Row.`;
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
     <span class="dc-when">${L.spark ? SPARK_IMG : ''}<span>${esc(L.when)}</span></span>
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
    targets = pick && !S.melting ? targetsFor(pick) : [];targets11 = targets;
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
        <div class="dk1-actions"><button type="button" class="wb-sign wb-sign-quiet" id="dk1-keep"><span class="wb-sign-text"><b>Keep card</b></span></button>
        <button type="button" class="wb-sign wb-sign-danger" id="dk1-meltgo" aria-label="Melt ${esc(nameOf(c))} for ${value} Stored Sparks. This cannot be undone."><span class="wb-sign-text"><b>Melt</b></span></button></div></div>`
      : `<div class="dk1-actions"><button type="button" class="wb-sign wb-sign-standard" id="dk1-move" aria-label="${moving ? `Cancel move: put ${esc(nameOf(c))} down` : `Move ${esc(nameOf(c))}: lights every place it can go`}"><span class="wb-sign-text"><b>${moving ? 'Cancel move' : 'Move'}</b></span></button>
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

if (V11) runV11();
document.documentElement.dataset.ready = 'true';
