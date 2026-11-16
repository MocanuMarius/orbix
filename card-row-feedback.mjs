import {SKILL_CARDS} from './skill-cards.mjs?v=flight-120-1';
import {resourceSymbol} from './game-symbols.mjs?v=flight-120-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => Number((Number(value) || 0).toFixed(3));
const capped = trace => Number.isFinite(trace?.restoredSparks) && Math.abs(trace.restoredSparks - trace.sparks) > 1e-7;
const names = {'body-spark':'Wisp pickup','wave-crossing':'Wave crossing','flash-pickup':'Flash pickup','downbeat-lift':'Falling Lift','natural-overfill':'Spark overfill','collector-delivery':'Collector delivery','rhythm-phrase':'Rhythm phrase','field-swipe':'Field Impulse swipe','guard-rescue':'Collector save'};
const skipNames = {'empty-slot':'Empty slot','incompatible-neighbor':'No compatible card to the right','exhausted-source':'No uses remaining','different-event':'Does not match this event','empty-subtotal':'No earlier Sparks to multiply','needs-two-earlier-payers':'Needs two earlier Spark actions','needs-earlier-payer':'Needs an earlier Spark action','already-replayed':'Replay already used','replay-limit':'Replay already used','no-recovery':'Collector is already ready','no-earlier-payout':'No earlier payout to repeat','event-or-condition-not-met':'Event condition not met','different-event-or-passive':'Passive or a different event','no-productive-action':'No matching action to replay'};
const action = step => {
  if (!step.success) return skipNames[step.skipReason] || 'No action for this event';
  if (step.operation === 'replay-row') return 'Return to slot 1 after this pass';
  if (step.recoverySeconds > 0) return `−${number(step.recoverySeconds)} s Collector recovery`;
  return `${number(step.before)} → ${number(step.after)} Sparks${step.stored ? ` · +${step.stored} Stored Spark` : ''}`;
};
export function cardRowSequenceMarkup(trace) {
  if (!trace?.steps?.length) return '';
  return Array.from({length:trace.passes || 1}, (_, index) => {
    const steps = trace.steps.filter(step => step.pass === index + 1), slots = [...new Set(steps.map(step=>step.slot))];
    return `<span class="card-row-pass"><small>${index ? '↶ 2' : 'Pass 1'}</small>${slots.map((slot, i) => {const attempts=steps.filter(step=>step.slot===slot);return `${i ? '<i aria-hidden="true">›</i>' : ''}<span class="card-row-slot ${attempts.some(step=>step.success) ? 'did-act' : ''}" data-trace-slot="${slot}" title="${esc(attempts.map(action).join('; '))}">${slot + 1}${attempts.length>1?`<em>×${attempts.length}</em>`:''}</span>`;}).join('')}</span>`;
  }).join('');
}
export function cardRowTraceMarkup(trace) {
  if (!trace) return '<p>No matching card event yet.</p>';
  return `<p class="card-row-total">${esc(names[trace.event?.kind] || 'Card event')} · <b>+${number(trace.sparks)} Sparks${Number.isFinite(trace.restoredSparks) ? ' awarded' : ''}</b>${capped(trace) ? `<br><span>+${number(trace.restoredSparks)} Sparks restored · meter limit</span>` : ''}${trace.stored ? ` · +${trace.stored} Stored Sparks` : ''}${trace.recoverySeconds ? ` · −${number(trace.recoverySeconds)} s recovery` : ''}</p>${Array.from({length:trace.passes || 1}, (_, index) => `<section class="card-row-receipt-pass"><h3>${index ? '↶ Return to slot 1 · ' : ''}Pass ${index + 1}</h3><ol>${trace.steps.filter(step => step.pass === index + 1).map(step => `<li class="${step.success ? 'did-act' : ''}"><span class="card-row-receipt-slot">${step.slot + 1}</span><span><strong>${esc(SKILL_CARDS[step.actingCardId]?.name || 'Empty slot')}</strong>${step.copiedBy ? `<small>Copies ${esc(SKILL_CARDS[step.sourceCardId]?.name || 'the next card')}${Number.isFinite(step.repeatIndex) ? ` · attempt ${step.repeatIndex + 1}` : ''}</small>` : ''}<span>${esc(action(step))}</span></span></li>`).join('')}</ol></section>`).join('')}<p class="card-row-receipt-note">Each pass starts at 0 bonus Sparks. A replay does not collect another pickup or create another wave.</p>`;
}

/** A retained receipt from the engine, never a second evaluator or timing rule. */
export function createCardRowFeedback(root, {onInspect = () => {}} = {}) {
  if (!root) return {update(){},destroy(){}};
  const doc = root.ownerDocument, button = doc.createElement('button');
  button.type = 'button'; button.className = 'flight-card-row'; button.hidden = true;
  button.setAttribute('aria-haspopup', 'dialog');
  (root.querySelector('.canvas-wrap') || root).append(button);
  let trace = null, sequence = -1, dialog = null, animations = [];
  const stop = () => {animations.forEach(animation => animation.cancel()); animations = [];};
  const close = () => {dialog?.close(); dialog?.remove(); dialog = null; if(button.isConnected)button.focus({preventScroll:true});};
  button.addEventListener('click', () => {
    if (!trace) return;
    onInspect(); stop(); dialog?.remove(); dialog = doc.createElement('dialog');
    dialog.className = 'card-term-dialog card-row-dialog';
    dialog.setAttribute('aria-label','Last card event');
    dialog.innerHTML = `<header><h2>Last card event</h2><button type="button" aria-label="Close card event">×</button></header><div class="card-term-content">${cardRowTraceMarkup(trace)}</div><footer><button type="button">Back to pause</button></footer>`;
    dialog.querySelectorAll('button').forEach(node => node.addEventListener('click',close));
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    doc.body.append(dialog); dialog.showModal(); dialog.querySelector('button').focus();
  });
  return {destroy(){stop();dialog?.remove();button.remove();},update(snapshot){
    if (snapshot?.paused || snapshot?.reducedMotion) stop();
    const next = snapshot?.cardRowTrace;
    if (!next?.steps?.length || Number(snapshot.cardRowSequence) === sequence) return;
    sequence = Number(snapshot.cardRowSequence);
    // Empty unrelated checks stay out of the flight view. The last real result
    // remains inspectable through pause and Deck changes.
    if (!next.steps.some(step => step.success && step.operation !== 'replay-row')) return;
    trace = next; stop(); button.hidden = false;
    button.innerHTML = `<span class="card-row-result"><span>Cards <b>+${number(next.sparks)}</b>${resourceSymbol('energy')}</span>${capped(next) ? `<small>+${number(next.restoredSparks)} restored</small>` : ''}${next.stored ? `<b>+${next.stored}</b>${resourceSymbol('packed')}` : ''}${next.recoverySeconds ? `<b>−${number(next.recoverySeconds)}s</b>` : ''}</span><span class="card-row-sequences">${cardRowSequenceMarkup(next)}</span>`;
    button.setAttribute('aria-label',`Last card event, +${number(next.sparks)} Sparks awarded${capped(next) ? `, +${number(next.restoredSparks)} Sparks restored at the meter limit` : ''}, ${next.passes} ${next.passes === 1 ? 'pass' : 'passes'}. Pause and inspect slot order`);
    if (!snapshot.reducedMotion && !snapshot.paused) [...button.querySelectorAll('.card-row-slot')].forEach((node,index) => {
      const animation = node.animate?.([{background:'#f0d993',color:'#243b2b',transform:'translateY(-1px)'},{background:node.classList.contains('did-act')?'#5d7b4d':'#243d31',color:'#e9e8c9',transform:'none'}],{duration:350,delay:index*90,fill:'backwards'});
      if(animation)animations.push(animation);
    });
  }};
}
