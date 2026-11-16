// v1.0-deck: one Deck screen. Row and Reserve on one page, one pick-up-and-place interaction for everything.
// Every verdict on this page comes from the game's own functions: placement status from
// card-status.mjs › getEquippedCardStatuses, the result line from skill-cards.mjs › previewCardRow,
// melt values from getCardMeltValue, Rest cards from isInventoryOnlyCard. The page only adds words and layout.
import {CARD_SYSTEM, CARD_ROW_EVENTS, SKILL_CARDS, makeSkillCard, getMountedCards, describeSkillCard, getCardRowRule, hasCardRowEvent, previewCardRow, getCardMeltValue, isInventoryOnlyCard} from '../skill-cards.mjs?v=guide-clarity-1';
import {getEquippedCardStatuses} from '../card-status.mjs?v=guide-clarity-1';
import {cardFace, cardArt} from '../card-ui.mjs?v=guide-clarity-1';
import {resourceSymbol} from '../game-symbols.mjs?v=guide-clarity-1';

const query = new URLSearchParams(location.search);
const variant = query.get('variant') || 'v1.0-deck';
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
document.documentElement.dataset.ready = 'true';
