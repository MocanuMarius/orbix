// v1.0-cardflow / v1.1-cardflow: a paused, step-by-step stage that teaches how the row fires.
// Every number on this page comes from the game's own resolver (skill-cards.mjs › previewCardRow);
// the page only adds words, marks and motion.
import {CARD_SYSTEM, CARD_UNIT, CARD_ROW_EVENTS, SKILL_CARDS, makeSkillCard, getMountedCards, getCardRowRule, hasCardRowEvent, previewCardRow} from '../skill-cards.mjs?v=guide-clarity-1';
import {cardFace} from '../card-ui.mjs?v=guide-clarity-1';
import {glowGaugeMarkup, glowGaugeUnits} from '../glow-ui.mjs?v=guide-clarity-1';
import {getGlowCapacity, glowPoints, GLOW_DISPLAY_SCALE} from '../vitality.mjs?v=guide-clarity-1';
import {PICKUP_TYPES} from '../pickups.mjs?v=guide-clarity-1';

const query = new URLSearchParams(location.search);
const KNOWN = ['v1.0-cardflow', 'v1.1-cardflow', 'v2.0-cardflow', 'v2.1-cardflow'];
// No ?variant= keeps showing v1.0; a name that is not built yet gets a plain message (showNotBuilt, below).
const variant = query.get('variant') || 'v1.0-cardflow';
const UNKNOWN = !KNOWN.includes(variant);
document.documentElement.dataset.variant = variant;
// v1.1: the Atlas book skin, cards MOVE to a slot, and the pickup's own fuel goes in before the Bonus.
const V11 = variant === 'v1.1-cardflow';
// v2.0: one Spark travels a track through the cards and pours into the meter.
const V21 = variant === 'v2.1-cardflow';
// v2.1: v2.0 with no title, an eye on every card that opens it, kind marks and "No effect here".
const V20 = variant === 'v2.0-cardflow' || V21;

// The worked example from the brief: Echo, Pocket Sparks (rank 1, 6 uses), Prism Lens.
const START = ['echo', 'spark-cache', 'prism-lens'];
const DECK = Object.fromEntries(START.map((id, i) => [id, makeSkillCard(id, `cardflow-${i}`)]));
const MAX_FLAME = getGlowCapacity({});
const MAX_SPARKS = glowPoints(MAX_FLAME);
// v1.0: the meter half full. v1.1: the meter starts so the default order's Bonus just fills the room the
// Spark's own fuel leaves (14 of 30). ?meter=N (v1.1 only) sets another start, to review the "lost" state.
const SPARK = PICKUP_TYPES.light;
// The same rounding flight.mjs > collect applies to a plain pickup's fuel.
const SPARK_FUEL = Math.round(SPARK.fuel * .3) / .3;
const DEFAULT_START_SPARKS = MAX_SPARKS - glowPoints(SPARK_FUEL) - 10;
const requestedStart = Number.parseFloat(query.get('meter'));
const startSparks = Math.max(0, Math.min(MAX_SPARKS, requestedStart >= 0 ? requestedStart : DEFAULT_START_SPARKS));
const START_FLAME = V11 ? startSparks / GLOW_DISPLAY_SCALE : MAX_FLAME * .5;
const PICKUP_FLAME = V11 ? Math.min(SPARK_FUEL, Math.max(0, MAX_FLAME - START_FLAME)) : 0;
const BASE_FLAME = START_FLAME + PICKUP_FLAME;
// Trigger: your wisp touches a natural Spark. Conditions read the meter before the pickup refills it.
const EVENT = Object.freeze({kind: CARD_ROW_EVENTS.body, pickupKind: 'light', meterFraction: START_FLAME / MAX_FLAME});
// Steps before the first card: the Trigger, and in v1.1 the pickup's own fuel.
const OFFSET = V11 ? 2 : 1;
const round2 = v => Math.round(v * 100) / 100;

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = v => String(Number((Number(v) || 0).toFixed(2)));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const nameOf = id => SKILL_CARDS[id]?.name || 'Empty slot';

const state = {order: [...START], step: 0, picked: null, practice: false, before: null, lastDone: null, note: '', timer: 0};

/** One resolver run for an order: the step list, numbers, uses and skip reasons are the receipt's own. */
function solve(order) {
  const cards = order.map(id => ({...DECK[id]}));
  const listens = hasCardRowEvent(cards, EVENT.kind);
  const receipt = previewCardRow({cards}, listens ? EVENT : {...EVENT, eligible: false});
  const printed = getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: cards.length, mountedCards: cards});
  // Meter: the same cap as flight.mjs › resolveCardRowEvent, gain = min(sparks × CARD_UNIT, room left after the pickup's own fuel).
  const gainFlame = Math.min(receipt.sparks * CARD_UNIT, Math.max(0, MAX_FLAME - BASE_FLAME));
  const lost = round2((receipt.sparks * CARD_UNIT - gainFlame) * GLOW_DISPLAY_SCALE);
  return {cards, printed, receipt, listens, gainFlame, gain: glowPoints(gainFlame), lost, steps: receipt.steps, total: OFFSET + 1 + receipt.steps.length};
}

function markOf(id) {
  const def = SKILL_CARDS[id];
  if (!def) return null;
  if (def.kind === 'echo' || def.kind === 'chameleon') return {cls: 'repeat', glyph: REPEAT_ICON, text: 'Repeats the next card'};
  const rule = getCardRowRule(def, DECK[id]);
  if (rule?.operation === 'multiply') return {cls: 'mul', glyph: '×', text: 'Multiplies'};
  if (rule?.operation === 'add-sparks' || rule?.operation === 'add-last-payout') return {cls: 'add', glyph: '+', text: 'Adds'};
  return null;
}
const REPEAT_ICON = '<svg viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M2 3h6V1h1v1h1v1h1v1h-1v1H9v1H8V4H3v3H2zm0 6h7v1H2zm8-2h1v1h-1zM1 8h1v1H1z"/></svg>';
const ARROW = '<svg class="cf-arrow" viewBox="0 0 8 10" width="16" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h2v1h1v1h1v1h1v1h1v2H6v1H5v1H4v1H3v1H1V8h1V7h1V6h1V4H3V3H2V2H1z"/></svg>';

// One caption per step, at most twelve words, in the plan's vocabulary.
function captionFor(step, solved) {
  const acting = nameOf(step.actingCardId), source = nameOf(step.sourceCardId);
  if (step.success) {
    if (step.operation === 'multiply') return `${acting} multiplies: Bonus ${num(step.before)} × ${num(step.multiplier)} = ${num(step.after)}.`;
    const uses = Number.isFinite(step.chargesBefore) ? ` Uses ${step.chargesBefore} → ${step.chargesAfter}.` : '';
    if (step.copiedBy) return `${acting} repeats ${source}: Bonus ${num(step.before)} → ${num(step.after)}.${uses}`;
    if (step.operation === 'replay-row') return `${acting} asks for an Encore after this row.`;
    return `${acting} adds ${num(step.amount)}: Bonus ${num(step.before)} → ${num(step.after)}.${uses}`;
  }
  switch (step.skipReason) {
    case 'empty-subtotal': return `${acting}: nothing to multiply yet. Bonus stays ${num(step.before)}.`;
    case 'needs-two-earlier-payers': return `${acting} needs two cards that Add before it.`;
    case 'incompatible-neighbor': {
      const right = solved.cards[step.slot + 1];
      return right ? `${acting} can't repeat ${nameOf(right.cardId)}. Nothing happens.` : `${acting} has no card to its right to repeat.`;
    }
    case 'exhausted-source': return `${source} has no Uses left.`;
    case 'empty-slot': return 'This slot is empty.';
    case 'replay-limit': return 'Only one Encore per Trigger.';
    case 'no-productive-action': return 'No Bonus yet, so no Encore.';
    default: return `${acting} does not fire for this Trigger.`;
  }
}
function popFor(step) {
  if (step.success) {
    if (step.operation === 'multiply') return {text: `×${num(step.multiplier)}`, cls: 'mul'};
    if (step.operation === 'replay-row') return {text: 'Encore', cls: 'add'};
    return {text: `+${num(step.amount)}`, cls: 'add'};
  }
  if (step.skipReason === 'empty-subtotal') return {text: `0 ×${num(step.multiplier)}`, cls: 'skip'};
  return {text: '–', cls: 'skip'};
}

let solved = solve(state.order);

function buildRow() {
  const row = $('cf-row');
  row.innerHTML = solved.printed.map((card, slot) => {
    const id = state.order[slot], mark = markOf(id);
    const label = `Slot ${slot + 1}: ${nameOf(id)}${mark ? `, ${mark.text}` : ''}`;
    return `${slot ? ARROW : ''}<div class="cf-slot" data-slot="${slot}" data-card="${esc(id)}" aria-label="${esc(label)}">
      <span class="cf-pop" aria-hidden="true"></span>
      ${mark ? `<span class="cf-mark cf-mark-${mark.cls}" aria-hidden="true">${mark.glyph}</span>` : ''}
      ${cardFace(card, {compact: true})}
      <span class="cf-slot-no" aria-hidden="true">${slot + 1}</span>
    </div>`;
  }).join('');
  syncSwapAffordance();
}

function syncSwapAffordance() {
  $('cf-row').querySelectorAll('.cf-slot').forEach(node => {
    const slot = Number(node.dataset.slot), base = node.getAttribute('aria-label').replace(/\. .*$/, '');
    if (state.practice) {
      node.setAttribute('role', 'button');node.tabIndex = 0;
      node.setAttribute('aria-pressed', String(state.picked === slot));
      const verb = V11 ? 'move' : 'swap';
      node.setAttribute('aria-label', `${base}. ${state.picked === null ? `Tap to pick for a ${verb}` : state.picked === slot ? 'Picked. Tap again to cancel' : V11 ? `Tap to move ${nameOf(state.order[state.picked])} to slot ${slot + 1}` : 'Tap to swap here'}`);
    } else {
      node.removeAttribute('role');node.removeAttribute('tabindex');node.removeAttribute('aria-pressed');
      node.setAttribute('aria-label', base);
    }
    node.classList.toggle('cf-picked', state.picked === slot);
    node.classList.toggle('cf-target', state.picked !== null && state.picked !== slot);
  });
  $('cf-row').classList.toggle('cf-swappable', state.practice);
}

function setUses(node, card, charges) {
  const counter = node.querySelector('.card-use-counter');
  if (!counter || !Number.isFinite(charges)) return;
  const max = SKILL_CARDS[card.cardId]?.charges;
  counter.textContent = `${charges}/${max}`;
  counter.setAttribute('aria-label', `${charges} of ${max} uses remaining`);
}

function render({animate = true} = {}) {
  const {steps, total} = solved, k = state.step, last = total - 1;
  const done = steps.slice(0, Math.max(0, Math.min(k - OFFSET + 1, steps.length)));
  const current = k >= OFFSET && k < OFFSET + steps.length ? steps[k - OFFSET] : null;
  const pickupStep = V11 && k === 1;
  const atMeter = k === last;
  const slots = [...$('cf-row').querySelectorAll('.cf-slot')];

  // Uses as of this step: start from the printed card, then apply every step shown so far.
  const charges = Object.fromEntries(solved.cards.map(card => [card.instanceId, card.charges]));
  for (const step of done) if (step.sourceInstanceId && Number.isFinite(step.chargesAfter)) charges[step.sourceInstanceId] = step.chargesAfter;

  slots.forEach((node, slot) => {
    const card = solved.cards[slot];
    const mine = done.filter(step => step.slot === slot);
    node.classList.toggle('cf-firing', !!current && current.slot === slot);
    node.classList.toggle('cf-fired', mine.some(step => step.success) && current?.slot !== slot);
    node.classList.toggle('cf-skipped', mine.length > 0 && !mine.some(step => step.success));
    node.classList.toggle('cf-source', !!current?.success && !!current.copiedBy && current.sourceInstanceId === card?.instanceId);
    const pop = node.querySelector('.cf-pop');
    const shown = current?.slot === slot ? current : null;
    if (shown) {
      const {text, cls} = popFor(shown);
      pop.textContent = text;pop.className = `cf-pop cf-pop-${cls} cf-pop-on`;
      if (animate && !reduced.matches) {pop.classList.remove('cf-pop-anim');void pop.offsetWidth;pop.classList.add('cf-pop-anim');}
    } else pop.className = 'cf-pop';
    setUses(node, card, charges[card?.instanceId]);
  });

  // Bonus: the running total the resolver reports after the shown step.
  const before = current ? current.before : done.length ? done[done.length - 1].after : 0;
  const bonus = done.length ? done.reduce((sum, step) => sum + (step.after - step.before), 0) : 0;
  $('cf-bonus-value').textContent = num(bonus);
  const delta = current && current.after !== current.before ? (current.operation === 'multiply' ? `${num(before)} × ${num(current.multiplier)}` : `${num(before)} + ${num(current.after - current.before)}`) : '';
  $('cf-bonus-delta').textContent = delta;
  $('cf-bonus').classList.toggle('cf-bonus-live', !!current?.success);
  $('cf-bonus').classList.toggle('cf-bonus-spent', atMeter);
  if (current?.success && animate && !reduced.matches) bump($('cf-bonus-value'));

  $('cf-trigger').classList.toggle('cf-lit', k === 0 || pickupStep);
  $('cf-trigger').classList.toggle('cf-was-lit', k > 0);

  if (V11) renderMeterV11(k, atMeter, animate); else renderMeter(atMeter, animate);

  // Caption, one per step.
  let caption;
  if (state.note) caption = state.note;
  else if (k === 0) caption = solved.listens ? 'Trigger: you catch a Spark. Your cards fire left to right.' : 'Trigger: you catch a Spark. No card in your row listens.';
  else if (pickupStep) caption = `The Spark's own ${num(glowPoints(PICKUP_FLAME))} fills the meter first: ${num(startSparks)} → ${num(round2(BASE_FLAME * GLOW_DISPLAY_SCALE))}.`;
  else if (current) caption = captionFor(current, solved);
  else if (V11) caption = solved.receipt.sparks <= 0 ? 'No Bonus this time, so nothing more goes in.'
    : solved.lost > 0 ? `Bonus +${num(solved.receipt.sparks)}: ${solved.gain} fits, ${num(solved.lost)} lost, meter full.`
    : `The Bonus fills the room that is left: +${solved.gain}.`;
  else caption = solved.gain > 0 ? `The Bonus flies into your Spark Meter: +${solved.gain}.` : 'No Bonus this time, so the meter gets nothing extra.';
  $('cf-caption').textContent = caption;

  // Result line: the lesson in two numbers once the player has changed the order.
  const result = $('cf-result');
  if (state.before) {
    const now = atMeter ? num(solved.receipt.sparks) : '…';
    const tone = !atMeter ? '' : solved.receipt.sparks < state.before.sparks ? 'cf-less' : solved.receipt.sparks > state.before.sparks ? 'cf-more' : 'cf-same';
    result.className = `cf-result cf-result-on ${tone}`;
    result.innerHTML = `<span>Before: <b>${num(state.before.sparks)}</b></span><i aria-hidden="true">·</i><span>Now: <b>${now}</b></span>`;
  } else if (state.practice) {
    result.className = 'cf-result cf-result-on cf-result-hint';
    result.textContent = V11 ? 'Move a card, then fire again' : 'Try it: tap two cards to swap';
  } else {result.className = 'cf-result';result.textContent = '';}

  $('cf-back').disabled = k === 0;
  $('cf-next').disabled = k === last;
  $('cf-back').setAttribute('aria-label', 'Back a step');
  $('cf-next').setAttribute('aria-label', 'Next step');
  $('cf-again').setAttribute('aria-label', 'Fire again from the Trigger');
  $('cardflow').dataset.step = String(k);
  $('cardflow').dataset.bonus = num(bonus);
  $('cardflow').dataset.gain = atMeter ? String(solved.gain) : '0';
  $('cardflow').dataset.order = state.order.join(',');
}

function renderMeter(atMeter, animate) {
  const flame = START_FLAME + (atMeter ? solved.gainFlame : 0);
  const gauge = $('cf-gauge');
  gauge.innerHTML = glowGaugeMarkup({flame, skillSystem: CARD_SYSTEM, isTutorial: true});
  const startUnits = glowGaugeUnits(START_FLAME, MAX_FLAME), nowUnits = glowGaugeUnits(flame, MAX_FLAME);
  const projected = glowGaugeUnits(START_FLAME + solved.gainFlame, MAX_FLAME);
  gauge.querySelectorAll('.glow-unit').forEach((unit, i) => {
    unit.classList.toggle('cf-gain', atMeter && i >= startUnits.filled && i < nowUnits.filled);
    unit.classList.toggle('cf-room', !atMeter && i >= startUnits.filled);
    unit.classList.toggle('cf-room-bonus', !atMeter && i >= startUnits.filled && i < projected.filled && state.step > 0);
  });
  $('cf-meter-value').textContent = `${nowUnits.value}/${nowUnits.maxValue}`;
  const room = startUnits.maxValue - startUnits.value;
  $('cf-meter-gain').textContent = atMeter ? `+${solved.gain} Bonus` : `Room ${num(room)}`;
  $('cf-meter').classList.toggle('cf-meter-on', atMeter);
  if (atMeter && animate && !reduced.matches && solved.gain > 0) fly();
}

// v1.1: three layers in the meter: what was there, the Spark's own fuel, then the Bonus in the room left.
function renderMeterV11(k, atMeter, animate) {
  const flame = START_FLAME + (k >= 1 ? PICKUP_FLAME : 0) + (atMeter ? solved.gainFlame : 0);
  const gauge = $('cf-gauge');
  gauge.innerHTML = glowGaugeMarkup({flame, skillSystem: CARD_SYSTEM, isTutorial: true});
  const start = glowGaugeUnits(START_FLAME, MAX_FLAME), base = glowGaugeUnits(BASE_FLAME, MAX_FLAME), now = glowGaugeUnits(flame, MAX_FLAME);
  const projected = glowGaugeUnits(BASE_FLAME + solved.gainFlame, MAX_FLAME);
  gauge.querySelectorAll('.glow-unit').forEach((unit, i) => {
    unit.classList.toggle('cf-pickup', k >= 1 && i >= start.filled && i < base.filled);
    unit.classList.toggle('cf-gain', atMeter && i >= base.filled && i < now.filled);
    unit.classList.toggle('cf-room', !unit.classList.contains('lit'));
    unit.classList.toggle('cf-room-bonus', !atMeter && k >= OFFSET && i >= base.filled && i < projected.filled);
  });
  $('cf-meter-value').textContent = `${now.value}/${now.maxValue}`;
  const room = round2((MAX_FLAME - (k >= 1 ? BASE_FLAME : START_FLAME)) * GLOW_DISPLAY_SCALE);
  $('cf-meter-gain').textContent = atMeter ? `+${solved.gain} Bonus` : k === 1 ? `+${num(glowPoints(PICKUP_FLAME))} Spark` : `Room ${num(room)}`;
  const lost = $('cf-meter-lost');
  lost.textContent = atMeter && solved.lost > 0 ? `${num(solved.lost)} lost: full` : '';
  lost.hidden = !lost.textContent;
  $('cf-meter').classList.toggle('cf-meter-on', atMeter || k === 1);
  if (atMeter && animate && !reduced.matches && solved.gain > 0) fly();
  if (k === 1 && animate && !reduced.matches) flyFrom($('cf-trigger').querySelector('.cf-spark'));
}

function bump(node) {node.animate?.([{transform: 'scale(1.35)'}, {transform: 'scale(1)'}], {duration: 260, easing: 'steps(4,end)'});}
function fly() {flyFrom($('cf-bonus-value'));}
function flyFrom(source) {
  const from = source.getBoundingClientRect(), to = $('cf-gauge').getBoundingClientRect();
  const spark = document.createElement('img');
  spark.src = 'assets/plasma-spark.png?v=guide-clarity-1';spark.alt = '';spark.className = 'cf-fly';spark.width = 44;spark.height = 44;
  document.body.appendChild(spark);
  const x0 = from.left + from.width / 2 - 22, y0 = from.top + from.height / 2 - 22, x1 = to.left + to.width / 2 - 22, y1 = to.top + to.height / 2 - 22;
  const anim = spark.animate([
    {transform: `translate(${Math.round(x0)}px,${Math.round(y0)}px)`, opacity: 1},
    {transform: `translate(${Math.round((x0 + x1) / 2)}px,${Math.round(Math.min(y0, y1) - 40)}px)`, opacity: 1, offset: .5},
    {transform: `translate(${Math.round(x1)}px,${Math.round(y1)}px)`, opacity: 0},
  ], {duration: 650, easing: 'ease-in'});
  anim.onfinish = anim.oncancel = () => spark.remove();
}

function stopAuto() {clearTimeout(state.timer);state.timer = 0;}
function go(step, opts) {
  state.step = Math.max(0, Math.min(solved.total - 1, step));state.note = '';
  if (state.step === solved.total - 1) {
    state.lastDone = {order: [...state.order], sparks: solved.receipt.sparks};
    if (!state.practice) {state.practice = true;syncSwapAffordance();}
  }
  render(opts);
}
function autoplay() {
  stopAuto();
  const tick = () => {if (state.step < solved.total - 1) {go(state.step + 1);state.timer = setTimeout(tick, 1100);} else state.timer = 0;};
  state.timer = setTimeout(tick, 900);
}

function swap(a, b) {
  stopAuto();
  // The comparison is against the order last fired all the way to the meter.
  if (state.lastDone) state.before = state.lastDone;
  const movedName = nameOf(state.order[a]);
  // v1.1 MOVES the card to the slot and shifts the others; v1.0 swaps the two.
  if (V11) {const [id] = state.order.splice(a, 1);state.order.splice(b, 0, id);}
  else [state.order[a], state.order[b]] = [state.order[b], state.order[a]];
  state.picked = null;
  solved = solve(state.order);
  buildRow();
  state.step = 0;
  state.note = V11 ? `Moved ${movedName} to slot ${b + 1}. Now Fire again.` : `Swapped ${nameOf(state.order[b])} and ${nameOf(state.order[a])}. Now Fire again.`;
  render({animate: false});
  if (!reduced.matches) {
    const moved = V11 ? Array.from({length: Math.abs(b - a) + 1}, (_, i) => Math.min(a, b) + i) : [a, b];
    for (const slot of moved) $('cf-row').querySelector(`.cf-slot[data-slot="${slot}"]`)?.animate([{transform: 'translateY(-8px)'}, {transform: 'none'}], {duration: 240, easing: 'steps(3,end)'});
  }
}

function pick(slot) {
  if (!state.practice) return;
  stopAuto();
  if (state.picked === null) {state.picked = slot;state.note = V11 ? `${nameOf(state.order[slot])} picked. Tap a slot to move it there.` : `${nameOf(state.order[slot])} picked. Tap another card to swap.`;syncSwapAffordance();render({animate: false});return;}
  if (state.picked === slot) {state.picked = null;state.note = '';syncSwapAffordance();render({animate: false});return;}
  swap(state.picked, slot);
}

// v2.0 is a different stage on the same page; v1.0 and v1.1 run the code below unchanged.
if (UNKNOWN) showNotBuilt(); else if (V20) runV2(); else {
// Controls.
$('cf-next').addEventListener('click', () => {stopAuto();go(state.step + 1);});
$('cf-back').addEventListener('click', () => {stopAuto();go(state.step - 1, {animate: false});});
$('cf-again').addEventListener('click', () => {stopAuto();state.picked = null;syncSwapAffordance();go(0);autoplay();});

// Tap to swap, keyboard too; dragging is a bonus on top of the same swap.
const row = $('cf-row');
let drag = null, suppressClick = false;
row.addEventListener('click', event => {
  if (suppressClick) {suppressClick = false;return;}
  const node = event.target.closest('.cf-slot');if (node) pick(Number(node.dataset.slot));
});
row.addEventListener('keydown', event => {
  const node = event.target.closest('.cf-slot');
  if (node && (event.key === 'Enter' || event.key === ' ')) {event.preventDefault();pick(Number(node.dataset.slot));}
});
row.addEventListener('pointerdown', event => {
  const node = event.target.closest('.cf-slot');
  if (!node || !state.practice || event.button !== 0) return;
  drag = {node, slot: Number(node.dataset.slot), x: event.clientX, y: event.clientY, moved: false, id: event.pointerId};
});
window.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 8) return;
  if (!drag.moved) {drag.moved = true;drag.node.classList.add('cf-dragging');try {drag.node.setPointerCapture(drag.id);} catch {}}
  drag.node.style.transform = `translate(${Math.round(dx)}px,${Math.round(dy)}px)`;
  const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('.cf-slot')).find(el => el && el !== drag.node);
  row.querySelectorAll('.cf-slot').forEach(el => el.classList.toggle('cf-drop', el === over));
});
const endDrag = event => {
  if (!drag || event.pointerId !== drag.id) return;
  const {node, slot, moved} = drag;drag = null;
  if (!moved) return;
  suppressClick = true;setTimeout(() => {suppressClick = false;}, 0);
  node.classList.remove('cf-dragging');node.style.transform = '';
  const target = row.querySelector('.cf-slot.cf-drop');
  row.querySelectorAll('.cf-drop').forEach(el => el.classList.remove('cf-drop'));
  if (target && event.type === 'pointerup') swap(slot, Number(target.dataset.slot));
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// A test and review hook: the frames the page shows, straight from the resolver.
window.cardflow = {
  state, solve, get solved() {return solved;}, meter: {start: startSparks, pickup: glowPoints(PICKUP_FLAME), max: MAX_SPARKS},
  orders: () => [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(p => {
    const order = p.map(i => START[i]), s = solve(order);
    return {order: order.map(nameOf), sparks: s.receipt.sparks, gain: s.gain, lost: s.lost, steps: s.steps.map(step => captionFor(step, s))};
  }),
};

// v1.1 dresses the same stage in the Atlas book: the woods behind, one wide page holding everything.
if (V11) {
  const root = $('cardflow');
  root.classList.add('cf-v11', 'wb-t3', 'wb-flat', 'wb-atlas', 'wb-a2', 'wb-go');
  const page = document.createElement('div');page.className = 'wb-page cf-sheet';
  page.innerHTML = '<div class="wb-pagelight" aria-hidden="true"></div>';
  page.append(...root.children);
  root.innerHTML = '<img class="wb-world" src="assets/moonwell-title.webp?v=guide-clarity-1" alt="" draggable="false"><div class="wb-shade2" aria-hidden="true"></div>';
  root.append(page);
  for (const id of ['cf-trigger', 'cf-bonus', 'cf-meter']) $(id).classList.add('wb-tabbox');
  $('cf-back').classList.replace('wb-sign-quiet', 'wb-sign-standard');
  const lost = document.createElement('small');lost.className = 'cf-meter-lost';lost.id = 'cf-meter-lost';lost.hidden = true;
  // Value, room and loss sit beside the gauge so the leather box fits a 300px frame.
  const info = document.createElement('div');info.className = 'cf-meter-info';
  info.append($('cf-meter').querySelector('.cf-meter-tag'), $('cf-meter-value'), $('cf-meter-gain'), lost);
  $('cf-meter').append(info);
}
buildRow();
render({animate: false});
document.documentElement.dataset.ready = 'true';
}

// ── v2.0-cardflow ─────────────────────────────────────────────────────────────
// One thing moves: a Spark rides a track left to right through the row, each card changes its
// number as it passes, and it pours into the Spark Meter. Numbers come only from previewCardRow.
function runV2() {
  const IDS = ['body-spark', 'spark-cache', 'crescendo'];
  const CARDS = Object.fromEntries(IDS.map((id, i) => [id, makeSkillCard(id, `cardflow2-${i}`)]));
  // The meter starts low so the whole Bonus fits: no "lost" in this first lesson.
  const START_SPARKS = 6, START_FLAME2 = START_SPARKS / GLOW_DISPLAY_SCALE;
  const EVENT2 = Object.freeze({kind: CARD_ROW_EVENTS.body, pickupKind: 'light', meterFraction: START_FLAME2 / MAX_FLAME});
  const SPARK_ART = 'design-lab/assets/spark-a.svg';
  // Captions use the card's name without a printed "+2" suffix ("Body Spark +2" → "Body Spark").
  const short = id => (SKILL_CARDS[id]?.name || 'Card').replace(/\s*\+\d+$/, '');
  const REASONS = {
    'needs-two-earlier-payers': 'Needs two + cards first', 'empty-subtotal': 'Nothing to multiply yet',
    'needs-earlier-payer': 'Needs a + card first', 'no-earlier-payout': 'Nothing to repeat yet',
    'incompatible-neighbor': 'Nothing to repeat', 'exhausted-source': 'No uses left', 'empty-slot': 'Empty',
  };
  const reasonOf = step => REASONS[step.skipReason] || 'Not for this Spark';
  const s2 = {order: [...IDS], step: 0, picked: null, practice: false, before: null, lastDone: null, note: '', timer: 0, prompt: 0, prompted: false};

  function solve2(order) {
    const cards = order.map(id => ({...CARDS[id]}));
    const listens = hasCardRowEvent(cards, EVENT2.kind);
    const receipt = previewCardRow({cards}, listens ? EVENT2 : {...EVENT2, eligible: false});
    const printed = getMountedCards({skillSystem: CARD_SYSTEM, cardSlots: cards.length, mountedCards: cards});
    const gainFlame = Math.min(receipt.sparks * CARD_UNIT, Math.max(0, MAX_FLAME - START_FLAME2));
    return {cards, printed, receipt, steps: receipt.steps, gainFlame, gain: glowPoints(gainFlame), total: receipt.steps.length + 2};
  }
  // What the card does, in plain numbers, read from its real row rule.
  function plateText(id) {
    const rule = getCardRowRule(SKILL_CARDS[id], CARDS[id]);
    if (rule?.operation === 'add-sparks') return `+${num(rule.amount)}`;
    if (rule?.operation === 'multiply') return `×${num(rule.amount)}`;
    return '–';
  }
  let sol = solve2(s2.order);

  // ── v2.1 helpers: will this card act on this Trigger, in this order? Asked of the resolver's own steps.
  const slotSteps = slot => sol.steps.filter(step => step.slot === slot);
  const idleSlot = slot => !slotSteps(slot).some(step => step.success);
  const idleStep = slot => slotSteps(slot).filter(step => !step.success).pop() || null;
  const minPayers = id => Number(getCardRowRule(SKILL_CARDS[id], CARDS[id])?.minimumEarlierPayers) || 0;
  // {why, fix} in plain words, from the resolver's skip reason.
  function whyIdle(slot) {
    const step = idleStep(slot), id = s2.order[slot];
    switch (step?.skipReason) {
      case 'empty-subtotal': case 'needs-two-earlier-payers':
        return minPayers(id) >= 2 ? {why: 'needs two + cards before it', fix: 'Move it after two + cards.'} : {why: 'needs a + card before it', fix: 'Move it after a + card.'};
      case 'needs-earlier-payer': return {why: 'needs a + card before it', fix: 'Move it after a + card.'};
      case 'no-earlier-payout': return {why: 'has nothing to repeat yet', fix: 'Move it after a + card.'};
      case 'incompatible-neighbor': return {why: "can't repeat the card beside it", fix: 'Put a + card to its right.'};
      case 'exhausted-source': return {why: 'has no Uses left', fix: ''};
      case 'empty-slot': return {why: 'is an empty slot', fix: ''};
      default: return {why: 'does not act on this Trigger', fix: ''};
    }
  }
  // The plain line for the opened card, built from the resolver's step for that slot.
  function hereLine(slot) {
    if (idleSlot(slot)) {const {why, fix} = whyIdle(slot);return `Here: no effect \u2014 ${why}.${fix ? ` ${fix}` : ''}`;}
    const step = slotSteps(slot).find(st => st.success);
    if (step.operation === 'multiply') return step.multiplier === 2 ? `Here: doubles ${num(step.before)} to ${num(step.after)}.` : `Here: multiplies ${num(step.before)} by ${num(step.multiplier)} to ${num(step.after)}.`;
    return `Here: adds ${num(step.amount)}, ${num(step.before)} to ${num(step.after)}.`;
  }
  const rarityWord = id => {const r = String(CARDS[id]?.rarity || SKILL_CARDS[id]?.rarity || 'common').toLowerCase();return r[0].toUpperCase() + r.slice(1);};
  // Pixel art from letter grids, drawn as crisp rects.
  const pixelSvg = (rows, fill, size, grid) => {
    const paths = {};
    rows.forEach((row, y) => [...row].forEach((c, x) => {if (fill[c]) (paths[c] ||= []).push(`M${x} ${y}h1v1h-1z`);}));
    return `<svg viewBox="0 0 ${grid} ${grid}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([c, d]) => `<path fill="${fill[c]}" d="${d.join('')}"/>`).join('')}</svg>`;
  };
  const EYE = pixelSvg(['................', '................', '................', '................', '....IIIIIIII....', '..IILLLBBLLLII..', '.ILLLBHBBBBLLLI.', 'ILLLBBBIIBBBLLLI', 'ILLLBBBIIBBBLLLI', '.ILLLBBBBBBLLLI.', '..IILLLBBLLLII..', '....IIIIIIII....', '................', '................', '................', '................'], {I: '#2a1d12', L: '#f3e3b3', B: '#8a6d44', H: '#fff6d8'}, 32, 16).replace('viewBox="0 0 16 16"', 'viewBox="0 4 16 8"');
  const WARN = pixelSvg(['.....II.....', '....IYYI....', '....IYYI....', '...IYYYYI...', '...IYIIYI...', '..IYYIIYYI..', '..IYYIIYYI..', '.IYYYYYYYYI.', '.IYYYIIYYYI.', 'IYYYYYYYYYYI', 'IIIIIIIIIIII', '............'], {I: '#2a1d12', Y: '#e6c77c'}, 24, 12);
  // Four arrows: the "move" handle.
  const GRIP = pixelSvg(['................', '.......II.......', '......IIII......', '.....IIIIII.....', '.......II.......', '..I....II....I..', '.II....II....II.', 'IIIIIIIIIIIIIIII', 'IIIIIIIIIIIIIIII', '.II....II....II.', '..I....II....I..', '.......II.......', '.....IIIIII.....', '......IIII......', '.......II.......', '................'], {I: 'currentColor'}, 16, 16);

  const root = $('cardflow');
  root.className = `cf cf-v11 cf-v20${V21 ? ' cf-v21' : ''} wb-ground wb-t2 wb-t3 wb-flat wb-atlas wb-a2 wb-go`;
  root.innerHTML = `<img class="wb-world" src="assets/moonwell-title.webp?v=guide-clarity-1" alt="" draggable="false"><div class="wb-shade2" aria-hidden="true"></div>
  <div class="wb-page cf-sheet cf2-sheet"><div class="wb-pagelight" aria-hidden="true"></div>
   ${V21 ? '' : '<header class="cf2-head"><h1 class="wb-title">How your cards fire</h1><span class="wb-context">Your Spark passes through your cards, left to right</span></header>'}
   <section class="cf2-stage" id="cf2-stage" ${V21 ? 'role="group" ' : ''}aria-label="Your Spark passing through your cards${V21 ? ', left to right' : ''}">
    <div class="cf2-track" id="cf2-track" aria-hidden="true"></div>
    <div class="cf2-anchor cf2-start" id="cf2-start"><span class="cf2-start-label">You catch a Spark</span><img class="cf2-orb" src="design-lab/assets/orb-wisp.svg" width="32" height="32" alt=""></div>
    <div id="cf2-stations" class="cf2-stations-host"></div>
    ${[0, 1, 2].map(i => `<div class="cf2-anchor cf2-notch" style="grid-column:${i + 2}" aria-hidden="true"><i></i></div>`).join('')}
    <div class="cf2-anchor cf2-meter" id="cf2-meter"><span class="cf2-meter-label">Spark Meter</span><div class="cf2-gauge cf-meter-gauge" id="cf2-gauge"></div>
     <div class="cf2-meter-info"><b id="cf2-meter-value"></b><small id="cf2-meter-gain"></small><small class="cf2-compare" id="cf2-compare"></small></div></div>
    <div class="cf2-spark" id="cf2-spark" aria-hidden="true"><img id="cf2-spark-img" src="${SPARK_ART}" width="16" height="16" alt=""><b class="cf2-tag" id="cf2-tag">Bonus 0</b></div>
   </section>
   <div class="cf2-captionbox"><p class="cf2-caption" id="cf2-caption" role="status" aria-live="polite"></p><div class="cf2-dots" id="cf2-dots" aria-hidden="true"></div></div>
   <nav class="cf2-controls" aria-label="Step controls">
    <button type="button" class="wb-sign wb-sign-standard" id="cf2-back" aria-label="Back one step"><span class="wb-sign-text"><b>Back</b></span></button>
    <button type="button" class="wb-sign wb-sign-primary" id="cf2-next" aria-label="Next step"><span class="wb-sign-text"><b>Next</b></span></button>
    <button type="button" class="wb-sign wb-sign-standard" id="cf2-play" aria-label="Play the journey"><span class="wb-sign-text"><b>Play</b></span></button>
   </nav>
  </div>`;
  const stage = $('cf2-stage');

  function buildStations() {
    const host = $('cf2-stations');
    host.outerHTML = `<div id="cf2-stations" class="cf2-stations-host">${sol.printed.map((card, slot) => {
      const id = s2.order[slot];
      if (V21) return stationV21(card, slot, id);
      return `<div class="cf2-station" data-slot="${slot}" data-card="${esc(id)}" style="grid-column:${slot + 2}">
        <div class="cf2-card">${cardFace(card, {compact: true})}</div>
        <span class="cf2-plate"><b data-action="${esc(plateText(id))}">${esc(plateText(id))}</b></span></div>`;
    }).join('')}</div>`;
    syncPractice();
  }
  // v2.1: eye above, kind mark on the card, Move handle beside it, plate below. A card that will not act shows "No effect here".
  function markV21(id) {
    const m = markOf(id);
    return m ? `<span class="cf3-mark cf-mark cf-mark-${m.cls}" aria-hidden="true">${m.glyph}</span>` : '';
  }
  function stationV21(card, slot, id) {
    const name = short(id), idle = idleSlot(slot);
    return `<div class="cf2-station cf3-station${idle ? ' cf3-idle' : ''}" data-slot="${slot}" data-card="${esc(id)}" role="group" style="grid-column:${slot + 2}">
      <span class="cf3-eyewrap"><span class="cf3-warn" role="img" aria-label="No effect here">${WARN}</span><button type="button" class="cf3-eye" data-slot="${slot}" aria-haspopup="dialog" aria-label="Read ${esc(name)}">${EYE}</button><button type="button" class="cf3-move" data-slot="${slot}" aria-pressed="false" aria-label="Move ${esc(name)}" title="Move" hidden><span class="cf3-move-skin">${GRIP}</span></button></span>
      <div class="cf2-card">${markV21(id)}${cardFace(card, {compact: true})}</div>
      <span class="cf2-plate"><b data-action="${esc(plateText(id))}">${esc(idle ? 'No effect here' : plateText(id))}</b></span></div>`;
  }
  function syncPractice() {
    stage.querySelectorAll('.cf2-station').forEach(node => {
      const slot = Number(node.dataset.slot), name = short(s2.order[slot]);
      if (V21) {
        const mv = node.querySelector('.cf3-move');
        node.classList.toggle('cf2-picked', s2.picked === slot);
        node.classList.toggle('cf2-target', s2.picked !== null && s2.picked !== slot);
        mv.hidden = !s2.practice;mv.setAttribute('aria-pressed', String(s2.picked === slot));
        mv.setAttribute('aria-label', s2.picked === null ? `Move ${name}` : s2.picked === slot ? `${name} picked. Press to cancel` : `Move ${short(s2.order[s2.picked])} to slot ${slot + 1}`);
        const idle = idleSlot(slot);
        node.setAttribute('aria-label', `Slot ${slot + 1}: ${name}, ${idle ? 'no effect here' : plateText(s2.order[slot])}${markOf(s2.order[slot]) ? ', ' + markOf(s2.order[slot]).text : ''}`);
        return;
      }
      node.classList.toggle('cf2-picked', s2.picked === slot);
      node.classList.toggle('cf2-target', s2.picked !== null && s2.picked !== slot);
      if (s2.practice) {
        node.setAttribute('role', 'button');node.tabIndex = 0;node.setAttribute('aria-pressed', String(s2.picked === slot));
        node.setAttribute('aria-label', s2.picked === null ? `Station ${slot + 1}: ${name}, ${plateText(s2.order[slot])}. Tap to move it.`
          : s2.picked === slot ? `${name} picked. Tap again to cancel.` : `Move ${short(s2.order[s2.picked])} to station ${slot + 1}.`);
      } else {
        node.removeAttribute('role');node.removeAttribute('tabindex');node.removeAttribute('aria-pressed');
        node.setAttribute('aria-label', `Station ${slot + 1}: ${name}, ${plateText(s2.order[slot])}`);
      }
    });
    stage.classList.toggle('cf2-practice', s2.practice);
  }

  // Geometry: every position is measured from the laid-out anchors, in whole pixels.
  const geo = {};
  function measure() {
    // Snap the stage to whole pixels: centring the grid can leave the track line on a half pixel.
    stage.style.top = '0px';
    const raw = stage.querySelector('.cf2-notch').getBoundingClientRect().top;
    stage.style.top = `${Math.round(raw) - raw}px`;
    const base = stage.getBoundingClientRect();
    // Positions are kept relative to the stage but snapped so their on-screen pixel is whole.
    const centre = el => {const r = el.getBoundingClientRect();return {x: Math.round(r.left + r.width / 2) - base.left, y: Math.round(r.top + r.height / 2) - base.top};};
    geo.orb = centre(stage.querySelector('.cf2-orb'));
    geo.gauge = centre(stage.querySelector('#flame-meter') || $('cf2-gauge'));
    geo.notches = [...stage.querySelectorAll('.cf2-notch')].map(n => centre(n));
    geo.y = geo.notches[0].y;
    const track = $('cf2-track');
    track.style.left = `${geo.orb.x}px`;track.style.width = `${geo.gauge.x - geo.orb.x}px`;track.style.top = `${geo.y - 3}px`;
  }

  const sizeFor = done => Math.min(48, 16 + 16 * done.filter(step => step.after > step.before).length);
  function placeSpark(k, animate) {
    const spark = $('cf2-spark'), img = $('cf2-spark-img'), last = sol.total - 1;
    const done = sol.steps.slice(0, Math.max(0, Math.min(k, sol.steps.length)));
    const current = k >= 1 && k <= sol.steps.length ? sol.steps[k - 1] : null;
    const size = sizeFor(done);
    let x;
    if (k === 0) x = geo.orb.x + 16 + 6 + size / 2;
    else if (current && V21 && idleSlot(current.slot)) {
      // A card that will not act is passed straight through: the Spark is already at the next card that acts, or the meter.
      const next = sol.steps.slice(k).find(step => step.success);
      x = next ? geo.notches[next.slot].x : geo.gauge.x;
    } else if (current) x = geo.notches[current.slot].x;
    else x = geo.gauge.x;
    spark.classList.toggle('cf2-moving', animate && !reduced.matches);
    spark.style.transform = `translate(${x}px,${geo.y}px)`;
    img.width = img.height = size;img.style.width = img.style.height = `${size}px`;
    img.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    $('cf2-tag').style.top = `${size / 2 + 2}px`;
    const bonus = done.length ? done[done.length - 1].after : 0;
    $('cf2-tag').textContent = `Bonus ${num(bonus)}`;
    spark.classList.toggle('cf2-poured', k === last);
    spark.dataset.size = String(size);
    return {bonus, size, x};
  }

  function render2({animate = true} = {}) {
    const k = s2.step, last = sol.total - 1;
    const done = sol.steps.slice(0, Math.max(0, Math.min(k, sol.steps.length)));
    const current = k >= 1 && k <= sol.steps.length ? sol.steps[k - 1] : null;
    stage.querySelectorAll('.cf2-station').forEach((node, slot) => {
      const mine = done.filter(step => step.slot === slot), skipped = mine.length > 0 && !mine.some(step => step.success);
      node.classList.toggle('cf2-current', current?.slot === slot);
      node.classList.toggle('cf2-done', mine.some(step => step.success));
      node.classList.toggle('cf2-skipped', skipped);
      const plate = node.querySelector('.cf2-plate>b');
      if (V21) {
        // v2.1: the plate says "No effect here" before, during and after play; it is never replaced by a reason.
        const idle = idleSlot(slot);
        node.classList.toggle('cf3-idle', idle);node.classList.remove('cf2-skipped');
        plate.textContent = idle ? 'No effect here' : plate.dataset.action;
        node.querySelector('.cf2-plate').classList.toggle('cf3-plate-idle', idle);
      } else {
      plate.textContent = skipped ? reasonOf(mine[mine.length - 1]) : plate.dataset.action;
      node.querySelector('.cf2-plate').classList.toggle('cf2-plate-reason', skipped);
      }
      if (current?.slot === slot && animate && !reduced.matches) {
        const p = node.querySelector('.cf2-plate');p.classList.remove('cf2-flash');void p.offsetWidth;p.classList.add('cf2-flash');
      }
    });
    const {bonus} = placeSpark(k, animate);
    // Meter: the game's gauge; the Bonus fills it only at the end.
    const flame = START_FLAME2 + (k === last ? sol.gainFlame : 0);
    $('cf2-gauge').innerHTML = glowGaugeMarkup({flame, skillSystem: CARD_SYSTEM, isTutorial: true});
    const startU = glowGaugeUnits(START_FLAME2, MAX_FLAME), nowU = glowGaugeUnits(flame, MAX_FLAME);
    $('cf2-gauge').querySelectorAll('.glow-unit').forEach((unit, i) => unit.classList.toggle('cf-gain', k === last && i >= startU.filled && i < nowU.filled));
    $('cf2-meter-value').textContent = `${nowU.value}/${nowU.maxValue}`;
    $('cf2-meter-gain').textContent = k === last ? `+${sol.gain}` : '';
    $('cf2-meter').classList.toggle('cf2-meter-on', k === last);
    const compare = $('cf2-compare');
    compare.innerHTML = s2.before && k === last ? `Before ${num(s2.before.sparks)}<br>Now ${num(sol.receipt.sparks)}` : '';
    compare.className = `cf2-compare${s2.before && k === last ? sol.receipt.sparks < s2.before.sparks ? ' cf-less' : sol.receipt.sparks > s2.before.sparks ? ' cf-more' : '' : ''}`;
    // One caption, at most eight words.
    let caption;
    if (s2.note) caption = s2.note;
    else if (k === 0) caption = 'You catch a Spark.';
    else if (current) {
      const name = short(current.actingCardId);
      if (!current.success) caption = V21 ? `${name} ${whyIdle(current.slot).why}.` : `${name}: ${reasonOf(current).toLowerCase()}.`;
      else if (current.operation === 'multiply') caption = current.multiplier === 2 ? `${name} doubles it: ${num(current.after)}.` : `${name} multiplies it: ${num(current.after)}.`;
      else caption = `${name} adds ${num(current.amount)}.`;
    } else caption = s2.prompted ? (V21 ? 'Move a card: drag it, or use its Move handle.' : 'Now move a card and fire again.') : sol.gain > 0 ? `${sol.gain} Sparks pour into your meter.` : 'No Bonus this time.';
    $('cf2-caption').textContent = caption;
    $('cf2-dots').innerHTML = Array.from({length: sol.total}, (_, i) => `<i class="${i <= k ? 'on' : ''}${i === k ? ' now' : ''}"></i>`).join('');
    $('cf2-back').disabled = k === 0;
    $('cf2-next').disabled = k === last;
    Object.assign(root.dataset, {step: String(k), bonus: num(bonus), gain: k === last ? String(sol.gain) : '0', order: s2.order.join(',')});
    if (V21) snapMarks();
  }
  // v2.1: the kind mark sits at a fixed offset from the card's corner, nudged so its edges land on whole screen pixels.
  function snapMarks() {
    stage.querySelectorAll('.cf2-card').forEach(card => {
      const mark = card.querySelector('.cf3-mark');if (!mark) return;
      mark.style.left = mark.style.top = '';
      const c = card.getBoundingClientRect(), m = mark.getBoundingClientRect();
      mark.style.left = `${Math.round(m.left) - c.left}px`;
      mark.style.top = `${Math.round(m.top) - c.top}px`;
    });
  }

  function stop2() {clearTimeout(s2.timer);s2.timer = 0;$('cf2-play').setAttribute('aria-pressed', 'false');}
  function go2(step, opts) {
    clearTimeout(s2.prompt);
    s2.step = Math.max(0, Math.min(sol.total - 1, step));s2.note = '';s2.prompted = false;
    if (s2.step === sol.total - 1) {
      s2.lastDone = {order: [...s2.order], sparks: sol.receipt.sparks};
      if (!s2.practice) {s2.practice = true;syncPractice();}
      // After the meter fills, the caption turns into the invitation to practise.
      s2.prompt = setTimeout(() => {if (s2.step === sol.total - 1 && !s2.note) {s2.prompted = true;render2({animate: false});}}, 1600);
    }
    render2(opts);
  }
  function play2() {
    stop2();
    if (reading) return;
    if (s2.step >= sol.total - 1) go2(0);
    $('cf2-play').setAttribute('aria-pressed', 'true');
    // v2.1: a card that will not act is passed quickly; its reason still shows in the caption for a moment.
    const wait = () => V21 && s2.step >= 1 && s2.step <= sol.steps.length && !sol.steps[s2.step - 1].success ? 800 : 1000;
    const tick = () => {if (reading) {s2.timer = 0;return;}if (s2.step < sol.total - 1) {go2(s2.step + 1);s2.timer = setTimeout(tick, wait());} else stop2();};
    s2.timer = setTimeout(tick, 1000);
  }
  function move2(from, to) {
    stop2();clearTimeout(s2.prompt);
    if (s2.lastDone) s2.before = s2.lastDone;
    const name = short(s2.order[from]);
    const [id] = s2.order.splice(from, 1);s2.order.splice(to, 0, id);
    s2.picked = null;sol = solve2(s2.order);
    buildStations();s2.step = 0;s2.prompted = false;s2.note = `Moved ${name}. Press Play.`;
    render2({animate: false});
  }
  function pick2(slot) {
    stop2();clearTimeout(s2.prompt);
    if (s2.picked === null) {s2.picked = slot;s2.note = `${short(s2.order[slot])} picked. Tap where it goes.`;}
    else if (s2.picked === slot) {s2.picked = null;s2.note = '';}
    else return move2(s2.picked, slot);
    syncPractice();render2({animate: false});
  }

  // v2.1: the stage never advances while a card is open.
  let reading = null;
  $('cf2-next').addEventListener('click', event => {event.stopPropagation();stop2();go2(s2.step + 1);});
  $('cf2-back').addEventListener('click', event => {event.stopPropagation();stop2();go2(s2.step - 1, {animate: false});});
  $('cf2-play').addEventListener('click', event => {event.stopPropagation();s2.picked = null;syncPractice();play2();});
  // Tapping the stage advances; in practice, tapping a station picks or moves a card.
  let drag2 = null, swallow = false;
  stage.addEventListener('click', event => {
    if (swallow) {swallow = false;return;}
    if (V21) return clickV21(event);
    const station = event.target.closest('.cf2-station');
    if (station && s2.practice) return pick2(Number(station.dataset.slot));
    if (s2.picked !== null) {s2.picked = null;s2.note = '';syncPractice();return render2({animate: false});}
    if (s2.step < sol.total - 1) {stop2();go2(s2.step + 1);}
  });
  stage.addEventListener('keydown', event => {
    if (V21) return;
    const station = event.target.closest('.cf2-station');
    if (station && s2.practice && (event.key === 'Enter' || event.key === ' ')) {event.preventDefault();pick2(Number(station.dataset.slot));}
  });
  stage.addEventListener('pointerdown', event => {
    const station = event.target.closest('.cf2-station');
    if (!station || !s2.practice || event.button !== 0) return;
    // v2.1: only the card itself can be dragged; the eye and the Move handle are buttons.
    if (V21 && (!event.target.closest('.cf2-card') || event.target.closest('.cf3-move'))) return;
    drag2 = {node: station.querySelector('.cf2-card'), slot: Number(station.dataset.slot), x: event.clientX, y: event.clientY, moved: false, id: event.pointerId};
  });
  window.addEventListener('pointermove', event => {
    if (!drag2 || event.pointerId !== drag2.id) return;
    const dx = event.clientX - drag2.x, dy = event.clientY - drag2.y;
    if (!drag2.moved && Math.hypot(dx, dy) < 8) return;
    drag2.moved = true;drag2.node.classList.add('cf2-dragging');
    drag2.node.style.transform = `translate(${Math.round(dx)}px,${Math.round(dy)}px)`;
    const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('.cf2-station')).find(el => el && Number(el.dataset.slot) !== drag2.slot);
    stage.querySelectorAll('.cf2-station').forEach(el => el.classList.toggle('cf2-drop', el === over));
  });
  const end2 = event => {
    if (!drag2 || event.pointerId !== drag2.id) return;
    const {node, slot, moved} = drag2;drag2 = null;
    if (!moved) return;
    swallow = true;setTimeout(() => {swallow = false;}, 0);
    node.classList.remove('cf2-dragging');node.style.transform = '';
    const target = stage.querySelector('.cf2-station.cf2-drop');
    stage.querySelectorAll('.cf2-drop').forEach(el => el.classList.remove('cf2-drop'));
    if (target && event.type === 'pointerup') move2(slot, Number(target.dataset.slot));
  };
  window.addEventListener('pointerup', end2);window.addEventListener('pointercancel', end2);

  // ── v2.1: READ and MOVE are two different gestures.
  //   Read: the eye button, or a plain tap on the card, opens it.
  //   Move: the Move handle (then tap where it goes), or drag the card. A tap with a card picked up puts it there.
  function clickV21(event) {
    const t = event.target, station = t.closest('.cf2-station');
    const slot = station ? Number(station.dataset.slot) : -1;
    if (t.closest('.cf3-move')) return pick2(slot);
    if (t.closest('.cf3-eye')) return openCard(slot, t.closest('.cf3-eye'));
    if (station && s2.picked !== null) return pick2(slot);
    if (t.closest('.cf2-card')) return openCard(slot);
    if (s2.picked !== null) {s2.picked = null;s2.note = '';syncPractice();return render2({animate: false});}
    if (s2.step < sol.total - 1) {stop2();go2(s2.step + 1);}
  }
  const sheet = root.querySelector('.cf2-sheet');
  const shut = [stage, root.querySelector('.cf2-captionbox'), root.querySelector('.cf2-controls')];
  function openCard(slot, from) {
    if (reading || !s2.order[slot]) return;
    const eye = from || stage.querySelector(`.cf3-eye[data-slot="${slot}"]`);
    stop2();clearTimeout(s2.prompt);
    const id = s2.order[slot], name = short(id), card = sol.printed[slot], idle = idleSlot(slot);
    const dlg = document.createElement('div');
    dlg.className = 'cf3-read';dlg.id = 'cf3-read';
    dlg.innerHTML = `<div class="cf3-panel" role="dialog" aria-modal="true" aria-labelledby="cf3-read-name">
      <div class="cf3-face">${cardFace(card)}</div>
      <div class="cf3-info"><h2 id="cf3-read-name" class="cf3-name">${esc(SKILL_CARDS[id].name)}</h2>
       <p class="cf3-rarity">${esc(rarityWord(id))}</p>
       <p class="cf3-here${idle ? ' cf3-here-idle' : ''}">${esc(hereLine(slot))}</p>
       <button type="button" class="cf3-close" id="cf3-close" aria-label="Close ${esc(name)}"><b>Close</b></button></div></div>`;
    sheet.append(dlg);
    // The face is the game's own; its help and Uses buttons belong to the game's glossary, which this page does not load.
    dlg.querySelectorAll('.card-help,.card-use-counter').forEach(el => {el.tabIndex = -1;el.setAttribute('aria-hidden', 'true');});
    for (const el of shut) el.inert = true;
    reading = {slot, eye, dlg};
    root.dataset.reading = String(slot);
    $('cf3-close').focus({preventScroll: true});
  }
  function closeCard() {
    if (!reading) return;
    const {slot, dlg} = reading;
    dlg.remove();reading = null;delete root.dataset.reading;
    for (const el of shut) el.inert = false;
    stage.querySelector(`.cf3-eye[data-slot="${slot}"]`)?.focus({preventScroll: true});
  }
  if (V21) {
    sheet.addEventListener('click', event => {
      if (!reading) return;
      if (event.target.closest('#cf3-close') || event.target === reading.dlg) closeCard();
    });
    document.addEventListener('keydown', event => {
      if (!reading) return;
      if (event.key === 'Escape') {event.preventDefault();closeCard();}
      else if (event.key === 'Tab') {event.preventDefault();$('cf3-close').focus({preventScroll: true});}
    });
  }

  window.cardflow = {
    state: s2, get reading() {return reading;}, open: slot => openCard(slot), close: () => closeCard(), get solved() {return sol;}, geo,
    orders: () => [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(p => {
      const order = p.map(i => IDS[i]), s = solve2(order);
      return {order: order.map(id => SKILL_CARDS[id].name), sparks: s.receipt.sparks, gain: s.gain,
        steps: s.steps.map(step => step.success ? `${short(step.actingCardId)} ${num(step.before)}→${num(step.after)}` : `${short(step.actingCardId)}: ${reasonOf(step)}`)};
    }),
    // Centre lines, measured from the rendered boxes (layout boxes, without the lift transform).
    centres() {
      const base = stage.getBoundingClientRect();
      const box = el => {const r = el.getBoundingClientRect();return {x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top};};
      const track = $('cf2-track').getBoundingClientRect(), trackY = track.top + track.height / 2 - base.top;
      const stations = [...stage.querySelectorAll('.cf2-station')].map(st => ({card: box(st.querySelector('.skill-card')).x, plate: box(st.querySelector('.cf2-plate')).x}));
      const notches = [...stage.querySelectorAll('.cf2-notch>i')].map(n => box(n));
      const img = box($('cf2-spark-img'));
      const page = $('cardflow').querySelector('.cf2-sheet').getBoundingClientRect(), controls = stage.parentElement.querySelector('.cf2-controls').getBoundingClientRect();
      return {trackY, orbY: box(stage.querySelector('.cf2-orb')).y, gaugeY: box(stage.querySelector('#flame-meter')).y, sparkY: img.y, sparkX: img.x,
        notchY: notches.map(n => n.y), stations, notchX: notches.map(n => n.x), spacing: notches.slice(1).map((n, i) => n.x - notches[i].x),
        controlsCentre: controls.left + controls.width / 2, pageCentre: page.left + page.width / 2, stageCentre: base.left + base.width / 2};
    },
  };

  buildStations();
  $('cf2-gauge').innerHTML = glowGaugeMarkup({flame: START_FLAME2, skillSystem: CARD_SYSTEM, isTutorial: true});
  measure();
  render2({animate: false});
  const relayout = () => {measure();render2({animate: false});};
  relayout();
  document.fonts?.ready.then(relayout);
  addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(stage);
  document.documentElement.dataset.ready = 'true';
}

// An unknown ?variant= is never answered with another look: a plain note on the paper page.
function showNotBuilt() {
  const root = $('cardflow');
  root.className = 'cf cf-v11 cf-nope wb-ground wb-t2 wb-t3 wb-flat wb-atlas wb-a2 wb-go';
  root.innerHTML = `<img class="wb-world" src="assets/moonwell-title.webp?v=guide-clarity-1" alt="" draggable="false"><div class="wb-shade2" aria-hidden="true"></div>
  <div class="wb-page cf-sheet cf-nope-sheet"><div class="wb-pagelight" aria-hidden="true"></div><p class="cf-nope-text" role="status">This look is not built yet</p></div>`;
  document.documentElement.dataset.ready = 'true';
}
