import {ARTIFACTS,SKILL_CARDS,getCardDraft,lastCourseName} from './model.mjs?v=guide-clarity-1';
import {chipIcon} from './ui/trigger-icons.mjs?v=guide-clarity-1';
import {cardDraftMarkup,cardDraftOffersMarkup} from './card-ui.mjs?v=guide-clarity-1';
import {planTally,tallyStateAt,tallyLayout} from './reward-tally.mjs?v=guide-clarity-1';
import {createTallySound} from './reward-tally-sound.mjs?v=guide-clarity-1';
import {rewardEarnings} from './reward-screen.mjs?v=guide-clarity-1';
import {resourceSymbol} from './game-symbols.mjs?v=guide-clarity-1';
import {routeBonusReceiptText} from './route-bonus-copy.mjs?v=guide-clarity-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=guide-clarity-1';
import {FLIGHT_PACTS} from './flight-pacts.mjs?v=guide-clarity-1';
import {sealedPackMarkup} from './flight-reward-pack-art.mjs?v=guide-clarity-1';
import {artifactIcon} from './upgrade-icons.mjs?v=guide-clarity-1';
import {flightRewardReceiptDetail,FLIGHT_REWARD_SOURCE_DETAILS} from './flight-reward-details.mjs?v=guide-clarity-1';
export {flightRewardReceiptDetail};

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const count=value=>Math.max(0,Math.floor(Number(value)||0));
const stages=['income','pack','cards'];
const optionalLabels=new Set(['Pact','Seal','Vow','Route bonus','Chest gifts']);

/** Presentation belongs to the saved draft. It never grants or settles income. */
export function hasFlightRewardCeremony(run){
 const draft=getCardDraft(run),flight=run?.lastFlight;
 return !!draft&&!run.isTutorial&&flight?.success===true&&draft.runId===run.id&&
  draft.mapIndex===flight.mapIndex&&draft.nodeId===flight.nodeId;
}
export function flightRewardCeremonyStage(run){
 if(!hasFlightRewardCeremony(run))return null;
 const presentation=run.cardDraft.ceremony;
 return presentation?.version===1&&stages.includes(presentation.stage)?presentation.stage:'income';
}
export function advanceFlightRewardCeremony(run,draftId,next){
 if(!hasFlightRewardCeremony(run)||run.cardDraft.id!==draftId)return false;
 const stage=flightRewardCeremonyStage(run);
 if(!((stage==='income'&&next==='pack')||(stage==='pack'&&next==='cards')))return false;
 run.cardDraft.ceremony={version:1,stage:next};
 return true;
}
export function flightRewardCeremonyReceipt(run){
 const flight=run?.lastFlight||{},earnings=rewardEarnings(run),secured=count(flight.securedCondensedGlow);
 const clear=flight.cardClearReceipt,steps=Array.isArray(clear?.steps)?clear.steps:[];
 const cardName=step=>clear?.sources?.find(source=>source.instanceId===step.sourceInstanceId)?.name||SKILL_CARDS[step.sourceCardId]?.name;
 const sourceNames=effect=>[...new Set(steps.filter(step=>step.success&&count(step[effect])>0).map(cardName).filter(Boolean))];
 const sourceLabel=(fallback,names)=>names.length?names.join(' + '):fallback;
 const challengeName=ROUTE_BONUSES[flight.routeBonus?.id]?.name;
 const labels={Pact:FLIGHT_PACTS[flight.flightPact]?.name||'Pact','Route bonus':challengeName?`Objective met · ${challengeName}`:'Route bonus',
  'Chest gifts':sourceLabel('Chest gifts',flight.chestIncome?.sources||[]),'Cards on clear':sourceLabel('Cards on clear',sourceNames('stored')),
  // Engine cards (v1.0-engine): the Trigger icon leads, the words say where the Stored Sparks came from.
  'Pack cards':'Pack cards','Engine cards':'Kept by your engine'};
 const chips={'Pack cards':'pack','Engine cards':'engine-turn'};
 // Do not display queued or invented income as banked currency.
 const total=Math.min(earnings.total,secured),rows=[];
 let remaining=total;
 for(const row of earnings.rows){const amount=Math.min(row.amount,remaining);if(amount)rows.push({...row,amount,detailKey:FLIGHT_REWARD_SOURCE_DETAILS[row.label],optional:optionalLabels.has(row.label),label:labels[row.label]||row.label,chip:chips[row.label]||null});remaining-=amount;}
 const bonusRows=rows.filter(row=>row.optional),baseRows=rows.filter(row=>!row.optional);
 const routeNote=routeBonusReceiptText(flight.routeBonus);
 const challengePayoutOnly = flight.routeBonus?.amount > 0 && [`+${count(flight.routeBonus.amount)} Stored Sparks`, `Objective met: +${count(flight.routeBonus.amount)} Stored Sparks`].includes(routeNote);
 const chestNote=flight.chestIncome?.message,chestPayout=`+${count(flight.chestIncome?.amount)} Stored Sparks`;
 const chestPayoutOnly=rows.some(row=>row.optional&&row.label===labels['Chest gifts'])&&
  [chestPayout,`${labels['Chest gifts']} · ${chestPayout}`,`${(flight.chestIncome?.sources||[]).join(' + ')} · ${chestPayout}`].includes(chestNote?.trim());
 const optionalNotes=[{detailKey:'challenge',text:challengePayoutOnly ? null : routeNote?challengeName?`Optional challenge · ${challengeName}: ${routeNote}`:routeNote:flight.challengeComplete?'Optional challenge completed':null},
  {detailKey:'event-seal',text:flight.treasureWager?.message},{detailKey:'event-vow',text:flight.vow?.message},{detailKey:'event-chest',text:chestPayoutOnly?null:chestNote}].filter(entry=>entry.text);
 const growthNotes=[{detailKey:'effect-growth',text:clear?.futureCapacity>0?`${sourceLabel('Cards on clear',sourceNames('futureCapacity'))} · +${count(clear.futureCapacity)} permanent maximum Sparks`:null},
  {detailKey:'effect-speed',text:clear?.cruisingSpeed>0?`${sourceLabel('Cards on clear',sourceNames('cruisingSpeed'))} · +${count(clear.cruisingSpeed)}% speed, kept on the card`:null}].filter(entry=>entry.text);
 const relicEntries=Object.entries(flight.artifactActivations||{}).filter(([id,amount])=>ARTIFACTS[id]&&count(amount)>0).map(([id,amount])=>({artifactId:id,detailKey:`artifact:${id}`,text:`${ARTIFACTS[id].name} · activated ×${count(amount)}`}));
 relicEntries.push(...(Array.isArray(flight.consumedArtifacts)?flight.consumedArtifacts:[]).filter(id=>ARTIFACTS[id]).map(id=>({artifactId:id,detailKey:`artifact:${id}`,text:`${ARTIFACTS[id].name} · uses depleted this flight`})));
 const effectEntries=[...optionalNotes,...growthNotes,...relicEntries];
 return {total,base:baseRows.reduce((sum,row)=>sum+row.amount,0),bonus:bonusRows.reduce((sum,row)=>sum+row.amount,0),baseRows,bonusRows,
  notes:effectEntries.map(entry=>entry.text),effectEntries,wallet:count(run?.condensedGlow)};
}
const receiptDetailAttributes=(key,label)=>`type="button" class="flight-reward-detail-trigger" data-action="flight-reward-detail" data-receipt-detail="${esc(key)}" aria-haspopup="dialog" aria-label="Inspect ${esc(label)}"`;
function renderReceiptSourceRows(rows,offset=0){
 return rows.map((row,index)=>`<span class="flight-reward-source-row" data-tally-row="${index+offset}"><button ${receiptDetailAttributes(row.detailKey,row.label)}>${row.chip?`<span class="flight-reward-chip" aria-hidden="true">${chipIcon(row.chip,16)}</span>`:''}<span>${esc(row.label)}</span><span class="flight-reward-detail-affordance" aria-hidden="true">ⓘ</span></button><b data-tally-amount>+${row.amount}</b></span>`).join('');
}
function renderReceiptEffectRows(entries){
 return entries.map(entry=>`<p><button ${receiptDetailAttributes(entry.detailKey,entry.text)}>${entry.artifactId?`<span class="flight-reward-effect-icon" aria-hidden="true">${artifactIcon(entry.artifactId)}</span>`:''}<span>${esc(entry.text)}</span><span class="flight-reward-detail-affordance" aria-hidden="true">ⓘ</span></button></p>`).join('');
}
export function flightRewardCeremonyMarkup(run){
 const draft=getCardDraft(run),stage=flightRewardCeremonyStage(run);
 if(!draft||!stage)return cardDraftMarkup(run);
 const receipt=flightRewardCeremonyReceipt(run),title=draft.boss?'Guardian cleared':draft.elite?'Elite cleared':'Flight cleared';
 const all=[...receipt.baseRows,...receipt.bonusRows],layout=tallyLayout(all.length);
 const rows=renderReceiptSourceRows(all);
 const context=receipt.notes.length?`<div class="tally-effects"><div class="flight-reward-scroll-region" data-receipt-scroll role="region" aria-label="Recorded flight effects" tabindex="0"><section class="flight-reward-notes" aria-label="Recorded flight effects"><h2>Recorded effects</h2>${renderReceiptEffectRows(receipt.effectEntries)}</section></div><small class="flight-reward-scroll-cue" data-receipt-scroll-cue hidden>Scroll for more ↓</small></div>`:'';
 const from=receipt.total>0&&receipt.wallet>=receipt.total?receipt.wallet-receipt.total:null;
 const income=`<article class="flight-reward-income flight-reward-receipt tally${layout.dense?' tally-dense':''}"><div class="tally-total"><strong class="flight-reward-income-total" aria-label="Stored Sparks earned">${resourceSymbol('packed')}<span>+<b data-ceremony-income>${receipt.total}</b></span></strong><span class="tally-balance" aria-label="Stored Sparks: ${receipt.wallet}"><small>Stored Sparks</small>${from!==null?`<span class="tally-balance-from" data-tally-from><span data-tally-from-value>${from}</span> →</span>`:''}<b data-ceremony-wallet>${receipt.wallet}</b></span><span class="flight-reward-bank-status" role="status" data-ceremony-bank-status>${receipt.total?'Banked ✓':'Clear complete ✓'}</span>${context}</div><div class="tally-sources" style="--tally-rows:${layout.rowsPerColumn}" data-tally-columns="${layout.columns}">${rows||'<span class="tally-empty">No clear income</span>'}</div></article>`;
 const pack=`<div class="flight-reward-pack-context"><p class="flight-reward-bank-status">${receipt.total?`${resourceSymbol('packed')} +${receipt.total} Stored Sparks banked`:'Clear complete'} ✓</p><button type="button" class="flight-reward-pack" data-action="flight-reward-open-pack" data-draft-id="${esc(draft.id)}" aria-label="Open card pack. Reveal three cards, then choose one."><span class="flight-reward-pack-art">${sealedPackMarkup()}</span></button></div>`;
 const fan=stage==='cards'?cardDraftOffersMarkup(draft,{className:'flight-reward-fan'}):'';
 const course=lastCourseName(run),kicker=stage==='income'?(course?`<span class="flight-course-name">${esc(course)}</span> · ${esc(title.replace(/^Flight /,''))}`:esc(title)):`${esc(title)}${course?` · <span class="flight-course-name">${esc(course)}</span>`:''}`;
 return `<section class="flight-reward-ceremony card-reward-screen ${stage==='cards'?'card-draft-screen':''}" data-stage="${stage}" data-ceremony-draft-id="${esc(draft.id)}"><header class="flight-reward-heading"><div><small>${kicker}</small>${stage==='income'?'':`<h1>${stage==='cards'?'Choose 1 card':'Your card reward'}</h1>`}</div>${stage==='income'?'':`<div class="flight-reward-wallet" aria-label="Stored Sparks: ${receipt.wallet}">${resourceSymbol('packed')}<b data-ceremony-wallet>${receipt.wallet}</b><small>Stored Sparks</small></div>`}${stage==='cards'?'<div class="flight-reward-actions flight-reward-header-actions"><button class="secondary" data-action="cards">Deck</button><button class="secondary" data-action="menu">Menu</button></div>':''}</header><div class="flight-reward-stage" data-stage="${stage}">${stage==='income'?income:stage==='pack'?pack:`<p class="flight-reward-choice-note">Tap a card, tap again to take it.</p>${fan||''}`}</div>${stage==='cards'?'':`<footer class="flight-reward-actions">${stage==='income'?`<button type="button" class="flight-reward-receipt-continue" data-action="flight-reward-continue" aria-label="${draft.trophyOnly?'Continue to the victory screen':'Continue to card pack'}">Continue</button>`:'<button class="secondary" data-action="cards">Deck</button><button class="secondary" data-action="menu">Menu</button>'}</footer>`}</section>`;
}

/** Cancellable one-shot feedback. Only a deliberate press advances the receipt. */
export function mountFlightRewardCeremony({root,run,reducedMotion=false,animateWallet=false,createSound}={}){
 if(!root||flightRewardCeremonyStage(run)!=='income')return ()=>{};
 let cancelled=false,frame=0;
 const receipt=flightRewardCeremonyReceipt(run);
 const live=()=>!cancelled&&root.isConnected;
 const scrollRegions=Array.from(root.querySelectorAll('[data-receipt-scroll]'));
 const updateScrollCues=()=>{for(const region of scrollRegions){const cue=region.parentElement?.querySelector('[data-receipt-scroll-cue]');if(cue)cue.hidden=region.scrollHeight-region.clientHeight-region.scrollTop<=2;}};
 for(const region of scrollRegions)region.addEventListener('scroll',updateScrollCues,{passive:true});
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(updateScrollCues):null;
 for(const region of scrollRegions){resizeObserver?.observe(region);if(region.firstElementChild)resizeObserver?.observe(region.firstElementChild);}
 root.ownerDocument?.defaultView?.addEventListener('resize',updateScrollCues);
 updateScrollCues();
 // Display only: the tally is driven by the same receipt, and its last state is exactly the receipt.
 const wallet=root.querySelector('[data-ceremony-wallet]'),earned=root.querySelector('[data-ceremony-income]'),status=root.querySelector('[data-ceremony-bank-status]');
 const fromBox=root.querySelector('[data-tally-from]'),fromValue=root.querySelector('[data-tally-from-value]');
 const rowBoxes=Array.from(root.querySelectorAll('[data-tally-row]')),all=[...receipt.baseRows,...receipt.bonusRows];
 const walletFrom=receipt.total>0&&receipt.wallet>=receipt.total?receipt.wallet-receipt.total:receipt.wallet;
 const plan=planTally({rows:all,total:receipt.total,wallet:receipt.wallet,walletFrom,reducedMotion:reducedMotion||!animateWallet});
 const setFinal=()=>{
  rowBoxes.forEach((box,i)=>{box.classList.remove('is-pending','is-counting');const b=box.querySelector('[data-tally-amount]');if(b)b.textContent=`+${all[i]?.amount??0}`;});
  if(earned)earned.textContent=receipt.total;
  if(wallet)wallet.textContent=receipt.wallet;
  if(fromValue)fromValue.textContent=walletFrom;
  root.classList.remove('is-counting','is-banking','tally-playing');root.classList.add('income-counted','bonus-counted','is-banked');
  if(status){status.textContent=receipt.total?'Banked ✓':'Clear complete ✓';status.classList.add('is-shown');}
 };
 const sound=!plan.reducedMotion&&receipt.total>0&&typeof createSound==='function'?createSound():null;
 let skipped=false,started=0,heard=0,chimed=false,lastRevealed=-1,lastTotal=-1;
 const skip=()=>{if(!plan.reducedMotion&&!skipped&&root.classList.contains('tally-playing')){skipped=true;cancelAnimationFrame(frame);setFinal();}};
 if(plan.reducedMotion||plan.endAt===0){setFinal();}
 else{
  root.classList.add('tally-playing','is-counting');
  rowBoxes.forEach(box=>box.classList.add('is-pending'));
  if(earned)earned.textContent='0';
  if(wallet)wallet.textContent=walletFrom;
  if(status){status.textContent='';status.classList.remove('is-shown');}
  const tick=now=>{
   if(!live()||skipped)return;
   started||=now;const t=now-started,state=tallyStateAt(plan,t);
   rowBoxes.forEach((box,i)=>{
    const v=state.rows[i];
    if(v===null){box.classList.add('is-pending');return;}
    box.classList.remove('is-pending');box.classList.toggle('is-counting',v<all[i].amount);
    const b=box.querySelector('[data-tally-amount]');if(b)b.textContent=`+${v}`;
   });
   while(heard<plan.ticks.length&&t>=plan.ticks[heard]){sound?.tick(heard,plan.ticks.length);heard++;}
   if(earned&&state.total!==lastTotal){earned.textContent=state.total;lastTotal=state.total;}
   if(state.revealed!==lastRevealed){lastRevealed=state.revealed;root.classList.remove('tally-bump');void root.offsetWidth;root.classList.add('tally-bump');}
   if(wallet)wallet.textContent=state.wallet;
   if(state.done||t>=plan.endAt){if(!chimed){chimed=true;sound?.chime();}setFinal();return;}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
 }
 // Any press that is not a button (or a source's details) jumps straight to the final numbers; Continue stays one press.
 const onPress=event=>{if(!event.target.closest?.('[data-action],[data-receipt-detail]'))skip();else if(event.target.closest?.('[data-receipt-detail]'))skip();};
 root.addEventListener('pointerdown',onPress);
 return ()=>{cancelled=true;cancelAnimationFrame(frame);sound?.dispose?.();root.removeEventListener('pointerdown',onPress);resizeObserver?.disconnect();for(const region of scrollRegions)region.removeEventListener('scroll',updateScrollCues);root.ownerDocument?.defaultView?.removeEventListener('resize',updateScrollCues);if(wallet)wallet.textContent=count(run.condensedGlow);};
}

// Keeps the receipt mounted, including each column's scroll position, while a source is open.
export function mountReceiptInspector(root,run) {
 if(root?.dataset.stage!=='income')return ()=>{};
 const doc=root.ownerDocument;
 const listeners=new AbortController(),options={signal:listeners.signal};
 let panel=null,opener=null,pending=null;
 function clearTimer(){clearTimeout(pending);pending=null;}
 function dismiss(restoreFocus=false){
  clearTimer();
  const previous=opener;
  if(panel?.open)panel.close();
  panel?.remove();panel=null;opener=null;
  if(restoreFocus&&previous?.isConnected)previous.focus({preventScroll:true});
 }
 function inspect(button,pinned){
  const detail=flightRewardReceiptDetail(run,button.dataset.receiptDetail);
  if(!detail)return;
  dismiss();
  opener=button;
  panel=doc.createElement(pinned?'dialog':'aside');
  panel.className='receipt-inspector';
  panel.dataset.kind=detail.kind;
  panel.setAttribute('aria-label',detail.title);
  if(!pinned)panel.setAttribute('role','region');
  panel.innerHTML=(pinned?'<button type="button" class="receipt-detail-close" aria-label="Close details">Close</button>':'')+
   '<h2 class="receipt-detail-title">'+esc(detail.title)+'</h2><div class="receipt-detail-body">'+detail.markup+'</div>';
  root.appendChild(panel);
  if(pinned){
   const bounds=root.getBoundingClientRect();
   panel.style.setProperty('--receipt-center-x',bounds.left+bounds.width/2+'px');
   panel.style.setProperty('--receipt-center-y',bounds.top+bounds.height/2+'px');
   panel.style.setProperty('--receipt-bound-width',bounds.width+'px');
   panel.style.setProperty('--receipt-bound-height',bounds.height+'px');
   panel.showModal();
   panel.querySelector('.receipt-detail-close').addEventListener('click',()=>dismiss(true));
   panel.addEventListener('cancel',event=>{event.preventDefault();dismiss(true);});
   panel.addEventListener('click',event=>{
    if(event.target!==panel)return;
    const b=panel.getBoundingClientRect();
    if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dismiss(true);
   });
  }else{
   const box=root.getBoundingClientRect(),row=button.getBoundingClientRect();
   panel.classList.toggle('receipt-detail-left',row.left+row.width/2>box.left+box.width/2);
   panel.addEventListener('pointerenter',clearTimer);
   panel.addEventListener('pointerleave',()=>{clearTimer();pending=setTimeout(dismiss,220);});
  }
 }
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-receipt-detail]');
  if(!button)return;
  event.stopPropagation();inspect(button,true);
 },options);
 root.addEventListener('pointerover',event=>{
  if(panel?.open||event.pointerType==='touch'||!matchMedia('(any-hover:hover)').matches)return;
  const button=event.target.closest('[data-receipt-detail]');
  if(!button||button.contains(event.relatedTarget))return;
  clearTimer();pending=setTimeout(()=>inspect(button,false),240);
 },options);
 root.addEventListener('pointerout',event=>{
  if(panel?.open)return;
  const button=event.target.closest('[data-receipt-detail]');
  if(!button||button.contains(event.relatedTarget))return;
  clearTimer();if(panel)pending=setTimeout(dismiss,260);
 },options);
 root.addEventListener('scroll',event=>{
  if(!panel?.open&&!panel?.contains(event.target))dismiss();
 },{...options,capture:true});
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel&&!panel.open)dismiss();},options);
 return ()=>{listeners.abort();dismiss();};
}
