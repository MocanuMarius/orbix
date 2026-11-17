import {SKILL_CARDS, describeSkillCard} from './skill-cards.mjs?v=reskin-1';
import {resourceSymbol} from './game-symbols.mjs?v=reskin-1';
import {CARD_ART_IDS} from './card-art.mjs?v=reskin-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => Number((Number(value) || 0).toFixed(3));
const capped = trace => Number.isFinite(trace?.restoredSparks) && Math.abs(trace.restoredSparks - trace.sparks) > 1e-7;
// Trigger names (docs/card-teaching-plan.md §1).
const names = {'body-spark':'Collect','wave-crossing':'Pulse','flash-pickup':'Flash','flash-expiry':'Flash ends','downbeat-lift':'Falling Lift','natural-overfill':'Overfill','collector-delivery':'Delivery','rhythm-phrase':'Rhythm','field-swipe':'Swipe','guard-rescue':'Save','collector-attach':'Latch','expedition-victory':'Expedition complete','flight-clear':'Clear'};
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

/** Retain the engine receipt. The five portrait nodes are allocated once, and
 * idle snapshots do no DOM work. Exact numbers live in the paused receipt. */
export function createCardRowFeedback(root, {onInspect = () => {}} = {}) {
  if (!root) return {update(){},destroy(){}};
  const doc=root.ownerDocument, ns='http://www.w3.org/2000/svg', button=doc.createElement('button');
  button.type='button';button.className='flight-card-row';button.hidden=true;
  button.setAttribute('aria-haspopup','dialog');
  const icons=Array.from({length:5},()=>{
    const holder=doc.createElement('span');holder.className='card-row-source';holder.hidden=true;holder.setAttribute('aria-hidden','true');
    const svg=doc.createElementNS(ns,'svg');svg.setAttribute('preserveAspectRatio','xMidYMid slice');svg.setAttribute('focusable','false');
    const atlas=doc.createElementNS(ns,'image');atlas.setAttribute('href','./assets/cards/skill-card-scenes.webp');atlas.setAttribute('width','1252');atlas.setAttribute('height','1252');
    svg.append(atlas);holder.append(svg);button.append(holder);return {holder,svg,id:null};
  });
  const replay=doc.createElement('span');replay.className='card-row-replay';replay.setAttribute('aria-hidden','true');replay.textContent='↶';replay.hidden=true;button.append(replay);
  const bonus=doc.createElement('span');bonus.className='card-row-bonus';button.append(bonus);
  (root.querySelector('.flight-effect-space')||root.querySelector('.canvas-wrap')||root).append(button);
  let trace=null,sequence=-1,dialog=null;
  const close=()=>{dialog?.close();dialog?.remove();dialog=null;if(button.isConnected)button.focus({preventScroll:true});};
  button.addEventListener('click',()=>{
    if(!trace)return;
    onInspect();dialog?.remove();dialog=doc.createElement('dialog');dialog.className='card-term-dialog card-row-dialog';dialog.setAttribute('aria-label','Last card event');
    dialog.innerHTML=`<header><h2>Last card event</h2><button type="button" aria-label="Close card event">×</button></header><div class="card-term-content">${cardRowTraceMarkup(trace)}</div><footer><button type="button">Back to pause</button></footer>`;
    dialog.querySelectorAll('button').forEach(node=>node.addEventListener('click',close));dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    doc.body.append(dialog);dialog.showModal();dialog.querySelector('button').focus();
  });
  return {destroy(){dialog?.remove();button.remove();},update(snapshot){
    const next=snapshot?.cardRowTrace,nextSequence=Number(snapshot?.cardRowSequence);
    if(!next?.steps?.length||next===trace||nextSequence===sequence)return;
    sequence=nextSequence;
    const result=productiveCardSources(next);if(!result.sources.length)return;
    trace=next;button.hidden=false;
    for(let i=0;i<icons.length;i++){
      const icon=icons[i],source=result.sources[i];icon.holder.hidden=!source;if(!source)continue;
      const requested=SKILL_CARDS[source.cardId]?.artFamily||source.cardId,id=CARD_ART_IDS.includes(requested)?requested:'body-spark';
      if(icon.id!==id){const index=CARD_ART_IDS.indexOf(id);icon.svg.setAttribute('viewBox',`${index%4*313} ${Math.floor(index/4)*313} 313 313`);icon.id=id;}
      icon.holder.dataset.traceSlot=String(source.slot);
      if(!snapshot.reducedMotion&&typeof icon.holder.animate==='function')icon.holder.animate([{opacity:.35,filter:'brightness(.7)'},{opacity:1,filter:'brightness(1.8)',offset:.35},{opacity:1,filter:'brightness(1)'}],{duration:520,delay:i*90,easing:'ease-out'});
    }
    replay.hidden=!result.replayed;
    bonus.innerHTML=[next.sparks>0?`+${number(Number.isFinite(next.restoredSparks)?next.restoredSparks:next.sparks)}${resourceSymbol('energy')}`:'',next.stored>0?`+${number(next.stored)}${resourceSymbol('packed')}`:'',next.recoverySeconds>0?`−${number(next.recoverySeconds)}s${resourceSymbol('clock')}`:'',next.futureCapacity>0?`+${number(next.futureCapacity)} max`:'' ].filter(Boolean).join(' ');
    bonus.hidden=!bonus.innerHTML;
    button.setAttribute('aria-label',`Last card event: ${result.sources.map(source=>SKILL_CARDS[source.cardId]?.name||'Card').join(', ')}${result.replayed?', with an Encore':''}. ${traceTotals(next)}${capped(next)?`, +${number(next.restoredSparks)} restored at the meter limit`:''}. Pause to inspect the exact receipt.`);
  }};
}
