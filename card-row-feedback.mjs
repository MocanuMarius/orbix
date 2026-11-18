import {SKILL_CARDS, describeSkillCard} from './skill-cards.mjs?v=stops-2';
import {createChainStrip, baseColor, stripLayout, STRIP, STRIP_COLORS, resolveStripVariant} from './chain-strip.mjs?v=stops-2';
import {createVariantView} from './chain-strip-variants.mjs?v=stops-2';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => Number((Number(value) || 0).toFixed(3));
const capped = trace => Number.isFinite(trace?.restoredSparks) && Math.abs(trace.restoredSparks - trace.sparks) > 1e-7;
// Trigger names (docs/card-teaching-plan.md §1).
const names = {'body-spark':'Collect','wave-crossing':'Pulse','flash-pickup':'Flare','flash-expiry':'Flare','downbeat-lift':'Lift','natural-overfill':'Overfill','collector-delivery':'Delivery','rhythm-phrase':'Lift','guide-lift':'Lift','field-swipe':'Swipe','guard-rescue':'Crash stopped','collector-attach':'Delivery','expedition-victory':'Expedition complete','flight-clear':'Finish'};
const skipNames = {'cruising-speed-cap':'Already at +10% speed','no-carried-interest':'Fewer than 10 Stored Sparks carried into flight','empty-slot':'Empty slot','incompatible-neighbor':'No compatible card to the right','exhausted-source':'No uses remaining','different-event':'Different Trigger','empty-subtotal':'Nothing to its left to multiply','boost-capped':'Nothing to its left could grow (a cap was reached)','not-boostable':'Boosts never multiply Stored Sparks or forever gains','needs-earlier-payer':'Needs a + card before it','already-replayed':'Encore already used','replay-limit':'Encore already used','no-recovery':'Collector is already ready','no-earlier-payout':'No + card before it to add again','event-or-condition-not-met':'Trigger or condition not met','different-event-or-passive':'Always on, or a different Trigger','no-productive-action':'Nothing worked, so no Encore','empty-future-capacity':'No max Spark gain to its left','no-active-reel':'Collector has no active reel'};
const action = step => {
  if (!step.success) return skipNames[step.skipReason] || 'No action for this event';
  if (step.operation === 'replay-row') return 'Encore: fire again from Slot 1';
  if (step.operation === 'multiply') return [`×${number(step.multiplier)} to every card on its left`, step.after !== step.before ? `${number(step.before)} → ${number(step.after)} Sparks` : '',
    step.stored ? `+${number(step.stored)} Stored Sparks` : '', step.futureCapacity ? `+${number(step.futureCapacity)} max Sparks` : '',
    step.cruisingSpeed ? `+${number(step.cruisingSpeed)}% speed` : '', step.recoverySeconds ? `−${number(step.recoverySeconds)} s recovery` : '',
    step.reelSeconds ? `−${number(step.reelSeconds)} s reel` : ''].filter(Boolean).join(' · ');
  if (step.operation === 'add-future-capacity' || step.operation === 'multiply-future-capacity') return `${number(step.futureCapacityBefore)} → ${number(step.futureCapacityAfter)} maximum Sparks permanently`;
  if (step.tallyCapacity > 0) return `+${number(step.tallyCapacity)} max Spark, kept on the card`;
  if (step.cruisingSpeed > 0) return `+${number(step.cruisingSpeed)}% speed, kept on the card (max +10%)`;
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
  trace.sparks > 0 || !(trace.reelSeconds || trace.futureCapacity || trace.tallyCapacity || trace.cruisingSpeed || trace.recoverySeconds || trace.stored) ? `+${number(trace.sparks)} Sparks${Number.isFinite(trace.restoredSparks) ? ' awarded' : ''}${Number.isFinite(trace.sparksExact) && trace.sparksExact - trace.sparks > 1e-7 ? ` (${number(trace.sparksExact)} rounded down)` : ''}` : '',
  trace.reelSeconds ? `−${number(trace.reelSeconds)} s remaining reel` : '',
  trace.futureCapacity ? `+${number(trace.futureCapacity)} maximum Sparks` : '',
  trace.tallyCapacity ? `+${number(trace.tallyCapacity)} max Spark, kept on the card` : '',
  trace.cruisingSpeed ? `+${number(trace.cruisingSpeed)}% speed, kept on the card (max +10%)` : '',
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

/** The in-flight Chain strip (view). One fixed set of nodes per MOUNTED card, built when the Chain changes; a flash is three
 * Web Animations (white fill, beat, echo frame) that touch only transform and opacity, the idle fade one opacity change.
 * No text, no pictures: the exact receipt lives in the paused dialog (tap the strip). */
export function createCardRowFeedback(root, {onInspect = () => {}, reducedMotion = false, doubleEcho = STRIP.doubleEcho, variant = resolveStripVariant(), now = () => globalThis.performance?.now?.() ?? Date.now(),
  setTimer = (fn, ms) => globalThis.setTimeout(fn, ms), clearTimer = id => globalThis.clearTimeout(id)} = {}) {
  if (!root) return {update(){},destroy(){},attach(){}};
  const doc = root.ownerDocument, button = doc.createElement('button'), strip = createChainStrip({reducedMotion});
  button.type = 'button'; button.className = 'flight-card-row chain-strip'; button.hidden = true;
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-label', 'Card chain. Pause to inspect your chain.');
  root.append(button);
  const view = variant === 'b' || variant === 'c' || variant === 'd' ? createVariantView(variant, {doc, root}) : null; // variant A (below) is the shipped look and is untouched
  if (view) { button.dataset.strip = variant; button.hidden = true; } // B, C and D draw their own layer (top button stays hidden)
  let engineRef = null;
  const nodes = []; // {cell, frame, fill, echo, echo2, bar, ref, fireSerial, barSerial, lit}
  let trace = null, sequence = -1, dialog = null, shownVersion = -1, shownFaded = null, timer = null, timerDue = null, shownWidth = -1;
  const close = () => { dialog?.close(); dialog?.remove(); dialog = null; if (button.isConnected) button.focus({preventScroll: true}); };
  button.addEventListener('click', () => {
    if (!trace) return;
    onInspect(); dialog?.remove(); dialog = doc.createElement('dialog'); dialog.className = 'card-term-dialog card-row-dialog'; dialog.setAttribute('aria-label', 'Last card event');
    dialog.innerHTML = `<header><h2>Last card event</h2><button type="button" aria-label="Close card event">×</button></header><div class="card-term-content">${cardRowTraceMarkup(trace)}</div><footer><button type="button">Back to pause</button></footer>`;
    dialog.querySelectorAll('button').forEach(node => node.addEventListener('click', close)); dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    doc.body.append(dialog); dialog.showModal(); dialog.querySelector('button').focus();
  });
  const reduced = () => strip.reducedMotion || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const ms = STRIP.flashMs, ECHO_SCALE = 2.3;
  const beat = [{transform: 'scale(1)'}, {transform: 'scale(1.15)', offset: .214}, {transform: 'scale(1)'}];
  const fillFrames = [{opacity: 1}, {opacity: 1, offset: .33}, {opacity: 0}];
  const echoFrames = a => [{transform: 'scale(1)', opacity: a}, {transform: `scale(${ECHO_SCALE})`, opacity: 0}];
  function paint() {
    // Structure and base colours: only when the Chain, a card's state or its Inscription changed. Empty slots have no node.
    const cells = strip.cells;
    if (view) {
      view.paint(strip); button.hidden = true; return;
    }
    while (nodes.length < cells.length) {
      const cell = doc.createElement('span'), frame = doc.createElement('i'), fill = doc.createElement('i'), echo = doc.createElement('i'), echo2 = doc.createElement('i'), bar = doc.createElement('b');
      cell.className = 'chain-cell'; frame.className = 'chain-frame'; fill.className = 'chain-fill'; echo.className = 'chain-echo'; echo2.className = 'chain-echo chain-echo2'; bar.className = 'chain-bar';
      cell.setAttribute('aria-hidden', 'true'); cell.append(echo, echo2, frame, fill, bar); button.append(cell);
      nodes.push({cell, frame, fill, echo, echo2, bar, ref: null, fireSerial: 0, barSerial: 0, lit: false});
    }
    while (nodes.length > cells.length) nodes.pop().cell.remove();
    cells.forEach((slot, i) => {
      const node = nodes[i];
      if (node.ref !== slot) { node.ref = slot; node.fireSerial = slot.lit ? slot.fireSerial - 1 : slot.fireSerial; node.barSerial = slot.barSerial; node.lit = false; }
      node.frame.className = `chain-frame chain-${slot.state}`; node.cell.style.setProperty('--tone', baseColor(slot));
      node.bar.className = `chain-bar chain-bar-${slot.bar}`;
    });
    const width = cells.length ? stripLayout(cells.length).width : 0;
    if (width !== shownWidth) { shownWidth = width; root.style?.setProperty('--strip-w', `${width + 2 * STRIP.padX}px`); }
    button.hidden = !strip.visible;
  }
  function flashes() {
    if (view) { view.flashes(strip, reduced(), {engine: engineRef, canvas: root.querySelector?.('#flight-canvas') || doc.querySelector?.('#flight-canvas')}); return; }
    const cells = strip.cells, soft = reduced();
    for (let i = 0; i < cells.length; i++) {
      const slot = cells[i], node = nodes[i];
      if (!node) continue;
      if (slot.fireSerial !== node.fireSerial) {
        node.fireSerial = slot.fireSerial;
        if (!soft && typeof node.cell.animate === 'function') {
          node.fill.animate(fillFrames, {duration: ms, easing: 'ease-out'});
          node.cell.animate(beat, {duration: ms});
          node.echo.animate(echoFrames(.7), {duration: ms, easing: 'ease-out'});
          if (doubleEcho) node.echo2.animate(echoFrames(.4), {duration: ms - 120, delay: 120, easing: 'ease-out'});
        }
      }
      if (slot.barSerial !== node.barSerial) {
        node.barSerial = slot.barSerial;
        if (typeof node.bar.animate === 'function' && !soft) node.bar.animate([{transform: 'scaleX(1.8)', opacity: 1}, {transform: 'scaleX(1)', opacity: .6}], {duration: ms, easing: 'ease-out'});
      }
      // Reduced motion: solid white for the whole 0.7 s, no echo, no scale (one class toggle at the start and the end).
      const lit = soft && slot.lit;
      if (lit !== node.lit) { node.lit = lit; node.cell.classList[lit ? 'add' : 'remove']('chain-lit'); }
    }
  }
  function fade() {
    if (strip.faded === shownFaded) return;
    shownFaded = strip.faded;
    if (view) { if (variant !== 'd') { view.layer.style.transitionDuration = !shownFaded || reduced() ? '0ms' : `${STRIP.fadeMs}ms`; view.layer.style.opacity = shownFaded ? String(STRIP.idleOpacity) : '1'; } return; }
    button.style.transitionDuration = !shownFaded || reduced() ? '0ms' : `${STRIP.fadeMs}ms`;
    button.style.opacity = shownFaded ? String(STRIP.idleOpacity) : '1';
  }
  // One timer, set only while a flash is playing: the next flash starts the moment the current one ends (not on the 10 Hz HUD tick).
  function schedule() {
    const due = strip.nextDueAt;
    if (due === timerDue) return;
    if (timer !== null) clearTimer(timer);
    timer = null; timerDue = due;
    if (due !== null) timer = setTimer(tick, Math.max(0, due - now()) + 1);
  }
  function tick() { timer = null; timerDue = null; strip.advance(now()); flashes(); fade(); schedule(); }
  const listener = marks => { if (strip.fire(marks, now())) { flashes(); fade(); schedule(); } };
  return {strip, destroy() { if (timer !== null) clearTimer(timer); timer = null; dialog?.remove(); button.remove(); view?.destroy(); root.style?.removeProperty('--strip-w'); }, attach(engine) { engineRef = engine || null; if (engine) engine.cardFireListener = listener; },
    update(snapshot) {
      if (strip.sync(snapshot, now()) || strip.version !== shownVersion) { shownVersion = strip.version; paint(); }
      flashes(); fade(); schedule();
      const next = snapshot?.cardRowTrace, nextSequence = Number(snapshot?.cardRowSequence);
      if (next?.steps?.length && next !== trace && nextSequence !== sequence) { sequence = nextSequence; trace = next; }
    }};
}
