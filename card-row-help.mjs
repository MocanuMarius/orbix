/** Read-only glossary examples use the same ordered walker as a real flight. */
import {CARD_SYSTEM, CARD_ROW_EVENTS, SKILL_CARDS, makeSkillCard, describeSkillCard, getCardRowRule, previewCardRow} from './skill-cards.mjs?v=audit-1';
import {cardRowTraceMarkup, cardRowSequenceMarkup} from './card-row-feedback.mjs?v=audit-1';
import {getEquippedCardStatuses} from './card-status.mjs?v=audit-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rowTerms = new Set(['uses','shared','copy','repeat','pass']);
const isCopy = card => ['echo','chameleon'].includes(SKILL_CARDS[card?.cardId]?.kind);
export const getCardRowCards = run => Array.from({length:Math.min(5, Math.max(run?.cardSlots || 0, run?.mountedCards?.length || run?.cards?.length || 0))}, (_,slot) => (run?.mountedCards || run?.cards)?.[slot] || null);
const rowFor = getCardRowCards;
const name = card => describeSkillCard(card)?.name || 'Empty slot';

/** The card face supplies rank/uses even for a reward or an improvement preview. */
export function resolveCardHelpContext(button, run, {example = false, label, snapshot} = {}) {
  if (snapshot?.cardCharges && run) run = {...run, mountedCards:(run.mountedCards || []).map(card => card && Number.isFinite(snapshot.cardCharges[card.instanceId]) ? {...card, charges:snapshot.cardCharges[card.instanceId]} : card)};
  const face = button.closest?.('[data-card-help]');
  const instanceId = face?.dataset.cardInstance || null;
  const mounted = run?.mountedCards || [];
  const slot = mounted.findIndex(card => card && card.instanceId === instanceId);
  const owned = [...mounted, ...(run?.reserveCards || [])].find(card => card && card.instanceId === instanceId);
  const cardId = face?.dataset.cardHelp || owned?.cardId;
  let card = owned ? {...owned} : SKILL_CARDS[cardId] ? makeSkillCard(cardId, instanceId || `help:${cardId}`) : null;
  if (card && face) {
    card.cardId = cardId;
    if (face.dataset.cardRank) card.rank = Number(face.dataset.cardRank);
    if (face.dataset.cardCharges !== undefined) card.charges = Number(face.dataset.cardCharges);
    if (Number.isFinite(snapshot?.cardCharges?.[instanceId])) card.charges = snapshot.cardCharges[instanceId];
  }
  return {run, instanceId, card, definition:SKILL_CARDS[card?.cardId], slot:slot < 0 ? null : slot, example:!!example, label, snapshot};
}

const fixture = () => {
  const cards = ['echo','spark-cache','refrain'].map((id,slot) => makeSkillCard(id, `glossary:${slot}`));
  cards[1].charges = 2;
  return {run:{skillSystem:CARD_SYSTEM, cardSlots:3, mountedCards:cards}, card:cards[0], slot:0, instanceId:cards[0].instanceId, example:true, label:'Example chain · 2 shared uses'};
};

export function getCardRowSource(cards, slot) {
  const acting = cards[slot], own = SKILL_CARDS[acting?.cardId];
  const source = isCopy(acting) ? cards[slot + 1] : acting;
  const def = SKILL_CARDS[source?.cardId];
  if (!def || isCopy(acting) && (!def.copyable || own.kind === 'echo' && (def.passive || def.kind === 'capacity'))) return null;
  return {source, def, rule:getCardRowRule(def, source)};
}
const sourceFor = getCardRowSource;

const unavailableTrigger = status => status?.state === 'blocked' && ['needs-rhythm','needs-field','needs-save','needs-collector','needs-cache'].includes(status.code);
function eventCandidates(cards, run, preferredSlot, statuses) {
  const orderedSlots = [...new Set([preferredSlot, ...cards.map((_,slot) => slot)])].filter(Number.isInteger);
  const events = [];
  for (const slot of orderedSlots) {
    if (unavailableTrigger(statuses[slot])) continue;
    const rule = sourceFor(cards, slot)?.rule;
    if (!rule) continue;
    const when = rule.when || {};
    for (const kind of rule.event === '*' ? Object.values(CARD_ROW_EVENTS) : [rule.event]) {
      events.push({kind, firstCrossing:when.firstCrossing ?? true, pickupKind:when.pickupKind || 'light',
        meterFraction:when.meterAtMost ?? .25, direction:when.direction || 'up',
        guardRecovering:!!when.guardRecovering, collectorReeling:!!when.collectorReeling,
        availableRecovery:10, availableReel:when.collectorReeling ? 10 : 0,
        carriedStored:Math.max(0, Math.floor(run?.carriedCondensedGlow || run?.condensedGlow || 0))});
    }
  }
  return events.length ? events : [{kind:CARD_ROW_EVENTS.body, pickupKind:'light', firstCrossing:true, meterFraction:.25}];
}

/** A scenario, never a forecast: conditions are explicit; cards/rank/uses are real. */
export function getCardRowHelpExample(key, context) {
  if (!rowTerms.has(key)) return null;
  const original = context || {};
  let active = original;
  const originalCards = rowFor(original.run);
  const statuses = getEquippedCardStatuses(original.run || {});
  const usableRule = slot => !unavailableTrigger(statuses[slot]) && sourceFor(originalCards,slot)?.rule;
  const limitedRow = originalCards.some((card,slot) => Number.isFinite(card?.charges) && usableRule(slot));
  const copyRow = originalCards.some((card,slot) => isCopy(card) && usableRule(slot));
  const anyRow = originalCards.some((card,slot) => usableRule(slot));
  const sharedRow = limitedRow && originalCards.some((card,slot) => isCopy(card) && usableRule(slot) && Number.isFinite(sourceFor(originalCards,slot)?.source?.charges) || SKILL_CARDS[card?.cardId]?.kind === 'refrain');
  const applicable = ['copy','repeat'].includes(key) ? copyRow : key === 'shared' ? sharedRow : key === 'uses' ? limitedRow : anyRow;
  if (!applicable) active = fixture();
  const cards = rowFor(active.run);
  const selected = active.slot == null ? null : cards[active.slot];
  let preferredSlot = active.slot;
  if (['copy','repeat'].includes(key) && !isCopy(selected)) preferredSlot = cards.findIndex((card,slot) => isCopy(card) && sourceFor(cards,slot)?.rule);
  if (['uses','shared'].includes(key) && !Number.isFinite(sourceFor(cards,preferredSlot)?.source?.charges)) preferredSlot = cards.findIndex((card,slot) => Number.isFinite(sourceFor(cards,slot)?.source?.charges) && sourceFor(cards,slot)?.rule);
  const preferredSource = sourceFor(cards,preferredSlot)?.source;
  let best = null;
  for (const event of eventCandidates(cards, active.run, preferredSlot, active === original ? statuses : getEquippedCardStatuses(active.run))) {
    const trace = previewCardRow(cards,event);
    const relevant = trace.steps.filter(step => step.slot === preferredSlot && step.success && step.operation !== 'replay-row');
    const spent = trace.steps.filter(step => step.sourceInstanceId === preferredSource?.instanceId && step.chargesAfter < step.chargesBefore).length;
    const score = relevant.length * 100 + spent * 10 + trace.executions;
    if (!best || score > best.score) best = {trace,event,score};
  }
  return {...best, cards, context:active, original, fallback:active !== original, preferredSlot, selectedStatus:original.slot == null ? null : statuses[original.slot]};
}

function selectedNote(context, cards) {
  const card = context.card;
  if (!card) return '';
  const def = SKILL_CARDS[card.cardId];
  const location = context.slot == null ? 'Not in this chain' : `Slot ${context.slot + 1}`;
  if (isCopy(card)) {
    const target = cards[context.slot + 1], source = context.slot == null ? null : sourceFor(cards,context.slot);
    return `${location} · ${name(card)}. ${source ? `${def.kind === 'echo' ? `Repeats ${def.repeatCount || 1} ${def.repeatCount > 1 ? 'times' : 'time'}` : 'Borrows'} ${name(target)} in slot ${context.slot + 2}${Number.isFinite(target.charges) ? `, sharing its ${target.charges} remaining ${target.charges === 1 ? 'use' : 'uses'}` : ''}.` : 'No compatible triggered action immediately to its right.'}`;
  }
  return `${location} · ${name(card)}. ${Number.isFinite(card.charges) ? `${card.charges} ${card.charges === 1 ? 'use' : 'uses'} remaining.` : 'This card has no limited uses.'}`;
}

export function describeCardRowScenario(event, trace) {
  const events = {[CARD_ROW_EVENTS.body]:'your wisp touches a pickup', [CARD_ROW_EVENTS.wave]:'a Pulse crosses an uncollected pickup', [CARD_ROW_EVENTS.flash]:'your wisp or Collector picks up Flare', [CARD_ROW_EVENTS.flashExpiry]:'a passage Flare expires', [CARD_ROW_EVENTS.lift]:'a Lift succeeds', [CARD_ROW_EVENTS.overfill]:'a passage Spark overfills the meter', [CARD_ROW_EVENTS.delivery]:'Collector delivers a pickup', [CARD_ROW_EVENTS.rhythm]:'3 evenly timed successful Lifts complete Rhythm', [CARD_ROW_EVENTS.guideLift]:'a Lift is tapped while the Lift Guide arrow is open', [CARD_ROW_EVENTS.field]:'a Field Impulse swipe succeeds', [CARD_ROW_EVENTS.guard]:'Collector saves a fatal impact', [CARD_ROW_EVENTS.clear]:'you clear a flight', [CARD_ROW_EVENTS.victory]:'you defeat the third Guardian', [CARD_ROW_EVENTS.attach]:'Collector attaches to a pickup'};
  const parts = [events[event.kind] || 'one Trigger'];
  if (event.kind === CARD_ROW_EVENTS.body || event.kind === CARD_ROW_EVENTS.delivery || event.kind === CARD_ROW_EVENTS.wave) parts.push(`pickup: ${event.pickupKind === 'light' ? 'passage Spark' : event.pickupKind}`);
  if (event.kind === CARD_ROW_EVENTS.wave) parts.push(event.firstCrossing ? 'first crossing of this Pulse' : 'later crossing');
  if (trace.steps.some(step => getCardRowRule(SKILL_CARDS[step.sourceCardId], {cardId:step.sourceCardId})?.when?.meterAtMost !== undefined)) parts.push(`meter at ${Math.round(event.meterFraction * 100)}% before the event`);
  if (event.guardRecovering) parts.push('Collector recovering after a save');
  if (event.collectorReeling) parts.push(`Collector reeling, with ${event.availableReel}s left`);
  else if (trace.recoverySeconds) parts.push(`Collector has ${event.availableRecovery}s recovery left`);
  if (event.kind === CARD_ROW_EVENTS.field) parts.push(`${event.direction} swipe succeeds`);
  if (event.kind === CARD_ROW_EVENTS.lift) parts.push('paid manual Lift while falling, at least 0.75s after the previous Lift');
  if (event.kind === CARD_ROW_EVENTS.victory) parts.push('third Guardian defeated');
  if (trace.steps.some(step => step.operation === 'carried-interest')) parts.push(`${event.carriedStored} Stored Sparks carried`);
  return parts.join(' · ');
}
const assumptions = describeCardRowScenario;

export function cardRowTermHelpMarkup(key, context) {
  const example = getCardRowHelpExample(key,context);
  if (!example) return '';
  const {cards, trace, event, original, fallback, selectedStatus} = example;
  const title = fallback ? example.context.label : original.label || (original.example ? 'Example chain · preview' : 'Your current chain · preview');
  const selected = selectedNote(original, rowFor(original.run));
  const missing = ['copy','repeat'].includes(key) ? 'This chain has no copy card that can fire.' : key === 'shared' ? 'This chain has no copy card sharing a limited card’s uses.' : key === 'uses' ? 'This chain has no limited card that can fire.' : 'This chain has no card that can fire.';
  const explanation = fallback ? `${original.run ? missing + ' ' : ''}The labeled example below uses Echo, Pocket Sparks and Refrain.` : 'Uses this chain’s actual order, ranks and remaining uses.';
  return `<section class="card-row-help" data-card-row-help="${esc(key)}"><h3>${esc(title)}</h3>${selected ? `<p class="card-row-help-selected">${esc(selected)}</p>` : ''}${selectedStatus?.state === 'blocked' ? `<p class="card-row-help-context"><strong>${esc(selectedStatus.label)}</strong> · ${esc(selectedStatus.reason)} ${esc(selectedStatus.fix)}</p>` : ''}<p class="card-row-help-context">${esc(explanation)}</p><ol class="card-help-current-row" aria-label="${fallback || original.example ? 'Example' : 'Current'} cards from left to right">${cards.map((card,slot) => `<li${original.instanceId && card?.instanceId === original.instanceId ? ' class="is-selected"' : ''}><b>Slot ${slot + 1}</b><span>${esc(name(card))}</span><small>${card ? Number.isFinite(card.charges) ? `${card.charges} uses` : 'No use limit' : 'Empty'}</small></li>`).join('')}</ol><p class="card-row-help-context">Scenario · ${esc(assumptions(event,trace))}. Card Sparks below are before the Spark Meter limit.</p><div class="card-row-sequences">${cardRowSequenceMarkup(trace)}</div><details class="card-row-help-receipt" open><summary>Follow slots left to right</summary>${cardRowTraceMarkup(trace,{cards,showUses:true})}</details><p class="card-row-help-context">Preview only · your cards and uses stay unchanged.</p></section>`;
}
