import {SKILL_CARDS, describeSkillCard} from './skill-cards.mjs?v=clips-1';
import {createChainStrip, baseColor, STRIP, STRIP_COLORS} from './chain-strip.mjs?v=clips-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => Number((Number(value) || 0).toFixed(3));
const capped = trace => Number.isFinite(trace?.restoredSparks) && Math.abs(trace.restoredSparks - trace.sparks) > 1e-7;
// Trigger names (docs/card-teaching-plan.md §1).
const names = {'body-spark':'Collect','wave-crossing':'Pulse','flash-pickup':'Flare','flash-expiry':'Flare','downbeat-lift':'Lift','natural-overfill':'Overfill','collector-delivery':'Delivery','rhythm-phrase':'Lift','field-swipe':'Swipe','guard-rescue':'Save','collector-attach':'Delivery','expedition-victory':'Expedition complete','flight-clear':'Finish'};
const skipNames = {'cruising-speed-cap':'Cruising speed already unlocked to +6%','no-carried-interest':'Fewer than 10 Stored Sparks carried into flight','empty-slot':'Empty slot','incompatible-neighbor':'No compatible card to the right','exhausted-source':'No uses remaining','different-event':'Different Trigger','empty-subtotal':'Nothing to its left to multiply','boost-capped':'Nothing to its left could grow (a cap was reached)','not-boostable':'Boosts never multiply Stored Sparks or forever gains','needs-earlier-payer':'Needs a + card before it','already-replayed':'Encore already used','replay-limit':'Encore already used','no-recovery':'Collector is already ready','no-earlier-payout':'No + card before it to add again','event-or-condition-not-met':'Trigger or condition not met','different-event-or-passive':'Always on, or a different Trigger','no-productive-action':'Nothing worked, so no Encore','empty-future-capacity':'No max Spark gain to its left','no-active-reel':'Collector has no active reel'};
const action = step => {
  if (!step.success) return skipNames[step.skipReason] || 'No action for this event';
  if (step.operation === 'replay-row') return 'Encore: fire again from Slot 1';
  if (step.operation === 'multiply') return [`×${number(step.multiplier)} to every card on its left`, step.after !== step.before ? `${number(step.before)} → ${number(step.after)} Sparks` : '',
    step.stored ? `+${number(step.stored)} Stored Sparks` : '', step.futureCapacity ? `+${number(step.futureCapacity)} max Sparks forever` : '',
    step.cruisingSpeed ? `+${number(step.cruisingSpeed)}% speed` : '', step.recoverySeconds ? `−${number(step.recoverySeconds)} s recovery` : '',
    step.reelSeconds ? `−${number(step.reelSeconds)} s reel` : ''].filter(Boolean).join(' · ');
  if (step.operation === 'add-future-capacity' || step.operation === 'multiply-future-capacity') return `${number(step.futureCapacityBefore)} → ${number(step.futureCapacityAfter)} maximum Sparks permanently`;
  if (step.cruisingSpeed > 0) return `+${number(step.cruisingSpeed)}% cruising speed unlocked (cap +6%)`;
  if (step.operation === 'add-stored' || step.operation === 'carried-interest') return `+${number(step.stored)} Stored Sparks`;
  if (step.reelSeconds > 0) return `${number(step.reelBefore)} → ${number(step.reelAfter)} s remaining reel`;
  if (step.recoverySeconds > 0) return `−${number(step.recoverySeconds)} s Collector recovery`;
  return `${number(step.before)} → ${number(step.after)} Sparks${step.stored ? ` · +${step.stored} Stored Spark` : ''}`;
};
export function cardRowSequenceMarkup(trace) {
  if (!trace?.steps?.length) return '';
  return Array.from({length:trace.passes || 1}, (_, index) => {
    const steps = trace.steps.filter(step => step.pass === index + 1), slots = [...new Set(steps.map(step=>step.slot))];
    return `<span class="card-row-pass"><small>${index ? '↶ Encore' : 'Chain'}</small>${slots.map((slot, i) => {const attempts=steps.filter(step=>step.slot===slot);return `${i ? '<i aria-hidden="true">›</i>' : ''}<span class="card-row-slot ${attempts.some(step=>step.success) ? 'did-act' : ''}" data-trace-slot="${slot}" title="${esc(attempts.map(action).join('; '))}">${slot + 1}${attempts.length>1?`<em>×${attempts.length}</em>`:''}</span>`;}).join('')}</span>`;
  }).join('');
}
const traceTotals = trace => [
  trace.sparks > 0 || !(trace.reelSeconds || trace.futureCapacity || trace.cruisingSpeed || trace.recoverySeconds || trace.stored) ? `+${number(trace.sparks)} Sparks${Number.isFinite(trace.restoredSparks) ? ' awarded' : ''}${Number.isFinite(trace.sparksExact) && trace.sparksExact - trace.sparks > 1e-7 ? ` (${number(trace.sparksExact)} rounded down)` : ''}` : '',
  trace.reelSeconds ? `−${number(trace.reelSeconds)} s remaining reel` : '',
  trace.futureCapacity ? `+${number(trace.futureCapacity)} maximum Sparks permanently` : '',
  trace.cruisingSpeed ? `+${number(trace.cruisingSpeed)}% cruising speed unlocked (cap +6%)` : '',
  trace.stored ? `+${number(trace.stored)} Stored Sparks` : '',
  trace.recoverySeconds ? `−${number(trace.recoverySeconds)} s recovery` : '',
].filter(Boolean).join(' · ');
export function cardRowTraceMarkup(trace, {cards, showUses = false} = {}) {
  if (!trace) return '<p>No matching card event yet.</p>';
  const cardName = (instanceId, cardId) => describeSkillCard(cards?.find(card => card?.instanceId === instanceId))?.name || SKILL_CARDS[cardId]?.name || 'Empty slot';
  return `<p class="card-row-total">${esc(names[trace.event?.kind] || 'Card event')} · <b>${esc(traceTotals(trace))}</b>${capped(trace) ? `<br><span>+${number(trace.restoredSparks)} Sparks restored · meter limit</span>` : ''}</p>${Array.from({length:trace.passes || 1}, (_, index) => `<section class="card-row-receipt-pass"><h3>${index ? '↶ Encore · from Slot 1' : 'Chain fires · from Slot 1'}</h3><ol>${trace.steps.filter(step => step.pass === index + 1).map(step => `<li class="${step.success ? 'did-act' : ''}"><span class="card-row-receipt-slot">${step.slot + 1}</span><span><strong>${esc(cardName(step.actingInstanceId,step.actingCardId))}</strong>${step.copiedBy ? `<small>Copies ${esc(cardName(step.sourceInstanceId,step.sourceCardId))}${Number.isFinite(step.repeatIndex) ? ` · attempt ${step.repeatIndex + 1}` : ''}</small>` : ''}<span>${esc(action(step))}</span>${showUses && Number.isFinite(step.chargesBefore) ? `<small class="card-row-step-uses">${step.copiedBy ? 'Shared uses' : 'Uses'} · ${step.chargesBefore} → ${step.chargesAfter}</small>` : ''}</span></li>`).join('')}</ol></section>`).join('')}<p class="card-row-receipt-note">Each firing starts at 0 Sparks. An Encore does not collect another pickup or create another Pulse.</p>`;
}

/** At most five productive acting slots, with one truthful replay mark. */
export function productiveCardSources(trace) {
  const productive=(trace?.steps||[]).filter(step=>step.success && step.operation!=='replay-row');
  const sources=[...new Map(productive.map(step=>[step.slot, {slot:step.slot,cardId:step.actingCardId}])).values()].slice(0,5);
  return {sources,replayed:sources.length>0 && productive.some(step=>step.pass>1) && trace.steps.some(step=>step.success && step.operation==='replay-row')};
}

/** The in-flight Chain strip (view). One tiny fixed set of nodes, built when the Chain changes; a flash is one Web Animation on
 * one node, the idle fade one opacity change. No text, no pictures: the exact receipt lives in the paused dialog (tap the strip). */
export function createCardRowFeedback(root, {onInspect = () => {}, reducedMotion = false, now = () => globalThis.performance?.now?.() ?? Date.now()} = {}) {
  if (!root) return {update(){},destroy(){},attach(){}};
  const doc = root.ownerDocument, button = doc.createElement('button'), strip = createChainStrip({reducedMotion});
  button.type = 'button'; button.className = 'flight-card-row chain-strip'; button.hidden = true;
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-label', 'Card chain. Pause to inspect your chain.');
  root.append(button);
  const nodes = []; // {cell, shape, bar, fireSerial, barSerial}
  let trace = null, sequence = -1, dialog = null, shownVersion = -1, shownFaded = null;
  const close = () => { dialog?.close(); dialog?.remove(); dialog = null; if (button.isConnected) button.focus({preventScroll: true}); };
  button.addEventListener('click', () => {
    if (!trace) return;
    onInspect(); dialog?.remove(); dialog = doc.createElement('dialog'); dialog.className = 'card-term-dialog card-row-dialog'; dialog.setAttribute('aria-label', 'Last card event');
    dialog.innerHTML = `<header><h2>Last card event</h2><button type="button" aria-label="Close card event">×</button></header><div class="card-term-content">${cardRowTraceMarkup(trace)}</div><footer><button type="button">Back to pause</button></footer>`;
    dialog.querySelectorAll('button').forEach(node => node.addEventListener('click', close)); dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    doc.body.append(dialog); dialog.showModal(); dialog.querySelector('button').focus();
  });
  const reduced = () => strip.reducedMotion || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const animate = (node, frames, ms) => {
    if (reduced() || typeof node.animate !== 'function') { node.classList.add('chain-lit'); setTimeout(() => node.classList.remove('chain-lit'), STRIP.reducedFlashMs); return; }
    node.animate(frames, {duration: ms, easing: 'ease-out'});
  };
  function paint() {
    // Structure and base colours: only when the Chain, a slot's state or its Inscription changed.
    while (nodes.length < strip.slots.length) {
      const cell = doc.createElement('span'), shape = doc.createElement('i'), bar = doc.createElement('b');
      cell.className = 'chain-cell'; shape.className = 'chain-shape'; bar.className = 'chain-bar';
      cell.setAttribute('aria-hidden', 'true'); cell.append(shape, bar); button.append(cell);
      nodes.push({cell, shape, bar, fireSerial: 0, barSerial: 0});
    }
    while (nodes.length > strip.slots.length) nodes.pop().cell.remove();
    strip.slots.forEach((slot, i) => {
      const node = nodes[i];
      node.shape.className = `chain-shape chain-${slot.state}`; node.shape.style.setProperty('--tone', baseColor(slot));
      node.bar.className = `chain-bar chain-bar-${slot.bar}`;
    });
    button.hidden = !strip.visible;
  }
  function flashes() {
    const slots = strip.slots;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i], node = nodes[i];
      if (!node) continue;
      if (slot.fireSerial !== node.fireSerial) {
        node.fireSerial = slot.fireSerial;
        const tone = baseColor(slot), w = STRIP_COLORS.white;
        animate(node.shape, slot.double ? [{backgroundColor: w}, {backgroundColor: tone, offset: .17}, {backgroundColor: w, offset: .22}, {backgroundColor: tone}] : [{backgroundColor: w}, {backgroundColor: tone}], slot.double ? STRIP.doubleMs : STRIP.flashMs);
      }
      if (slot.barSerial !== node.barSerial) {
        node.barSerial = slot.barSerial;
        animate(node.bar, [{borderTopColor: STRIP_COLORS.white}, {borderTopColor: STRIP_COLORS.bar}], STRIP.flashMs);
      }
    }
  }
  function fade() {
    if (strip.faded === shownFaded) return;
    shownFaded = strip.faded;
    button.style.transitionDuration = !shownFaded || reduced() ? '0ms' : `${STRIP.fadeMs}ms`;
    button.style.opacity = shownFaded ? String(STRIP.idleOpacity) : '1';
  }
  const listener = marks => { if (strip.fire(marks, now())) { flashes(); fade(); } };
  return {strip, destroy() { dialog?.remove(); button.remove(); }, attach(engine) { if (engine) engine.cardFireListener = listener; },
    update(snapshot) {
      if (strip.sync(snapshot, now()) || strip.version !== shownVersion) { shownVersion = strip.version; paint(); }
      flashes(); fade();
      const next = snapshot?.cardRowTrace, nextSequence = Number(snapshot?.cardRowSequence);
      if (next?.steps?.length && next !== trace && nextSequence !== sequence) { sequence = nextSequence; trace = next; }
    }};
}
