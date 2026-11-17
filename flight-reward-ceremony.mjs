import {ARTIFACTS,SKILL_CARDS,getCardDraft,lastCourseName} from './model.mjs?v=roundup-1';
import {chipIcon} from './ui/trigger-icons.mjs?v=roundup-1';
import {cardDraftMarkup,cardDraftOffersMarkup} from './card-ui.mjs?v=roundup-1';
import {rewardEarnings} from './reward-screen.mjs?v=roundup-1';
import {resourceSymbol} from './game-symbols.mjs?v=roundup-1';
import {routeBonusReceiptText} from './route-bonus-copy.mjs?v=roundup-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=roundup-1';
import {FLIGHT_PACTS} from './flight-pacts.mjs?v=roundup-1';
import {sealedPackMarkup} from './flight-reward-pack-art.mjs?v=roundup-1';
import {artifactIcon} from './upgrade-icons.mjs?v=roundup-1';
import {flightRewardReceiptDetail,FLIGHT_REWARD_SOURCE_DETAILS} from './flight-reward-details.mjs?v=roundup-1';
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
 const labels={Pact:FLIGHT_PACTS[flight.flightPact]?.name||'Pact','Route bonus':challengeName?`Challenge · ${challengeName}`:'Route bonus',
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
 const challengePayoutOnly = flight.routeBonus?.amount > 0 && routeNote === `+${count(flight.routeBonus.amount)} Stored Sparks`;
 const chestNote=flight.chestIncome?.message,chestPayout=`+${count(flight.chestIncome?.amount)} Stored Sparks`;
 const chestPayoutOnly=rows.some(row=>row.optional&&row.label===labels['Chest gifts'])&&
  [chestPayout,`${labels['Chest gifts']} · ${chestPayout}`,`${(flight.chestIncome?.sources||[]).join(' + ')} · ${chestPayout}`].includes(chestNote?.trim());
 const optionalNotes=[{detailKey:'challenge',text:challengePayoutOnly ? null : routeNote?challengeName?`Optional challenge · ${challengeName}: ${routeNote}`:routeNote:flight.challengeComplete?'Optional challenge completed':null},
  {detailKey:'event-seal',text:flight.treasureWager?.message},{detailKey:'event-vow',text:flight.vow?.message},{detailKey:'event-chest',text:chestPayoutOnly?null:chestNote}].filter(entry=>entry.text);
 const growthNotes=[{detailKey:'effect-growth',text:clear?.futureCapacity>0?`${sourceLabel('Cards on clear',sourceNames('futureCapacity'))} · +${count(clear.futureCapacity)} permanent maximum Sparks`:null},
  {detailKey:'effect-speed',text:clear?.cruisingSpeed>0?`${sourceLabel('Cards on clear',sourceNames('cruisingSpeed'))} · +${count(clear.cruisingSpeed)}% cruising speed unlocked`:null}].filter(entry=>entry.text);
 const relicEntries=Object.entries(flight.artifactActivations||{}).filter(([id,amount])=>ARTIFACTS[id]&&count(amount)>0).map(([id,amount])=>({artifactId:id,detailKey:`artifact:${id}`,text:`${ARTIFACTS[id].name} · activated ×${count(amount)}`}));
 relicEntries.push(...(Array.isArray(flight.consumedArtifacts)?flight.consumedArtifacts:[]).filter(id=>ARTIFACTS[id]).map(id=>({artifactId:id,detailKey:`artifact:${id}`,text:`${ARTIFACTS[id].name} · uses depleted this flight`})));
 const effectEntries=[...optionalNotes,...growthNotes,...relicEntries];
 return {total,base:baseRows.reduce((sum,row)=>sum+row.amount,0),bonus:bonusRows.reduce((sum,row)=>sum+row.amount,0),baseRows,bonusRows,
  notes:effectEntries.map(entry=>entry.text),effectEntries,wallet:count(run?.condensedGlow)};
}
const receiptDetailAttributes=(key,label)=>`type="button" class="flight-reward-detail-trigger" data-action="flight-reward-detail" data-receipt-detail="${esc(key)}" aria-haspopup="dialog" aria-label="Inspect ${esc(label)}"`;
function renderReceiptSourceRows(rows){
 return rows.map(row=>`<span class="flight-reward-source-row"><button ${receiptDetailAttributes(row.detailKey,row.label)}>${row.chip?`<span class="flight-reward-chip" aria-hidden="true">${chipIcon(row.chip,16)}</span>`:''}<span>${esc(row.label)}</span><span class="flight-reward-detail-affordance" aria-hidden="true">ⓘ</span></button><b>+${row.amount}</b></span>`).join('');
}
function renderReceiptEffectRows(entries){
 return entries.map(entry=>`<p><button ${receiptDetailAttributes(entry.detailKey,entry.text)}>${entry.artifactId?`<span class="flight-reward-effect-icon" aria-hidden="true">${artifactIcon(entry.artifactId)}</span>`:''}<span>${esc(entry.text)}</span><span class="flight-reward-detail-affordance" aria-hidden="true">ⓘ</span></button></p>`).join('');
}
export function flightRewardCeremonyMarkup(run){
 const draft=getCardDraft(run),stage=flightRewardCeremonyStage(run);
 if(!draft||!stage)return cardDraftMarkup(run);
 const receipt=flightRewardCeremonyReceipt(run),title=draft.boss?'Guardian cleared':draft.elite?'Elite cleared':'Flight cleared';
 const rows=renderReceiptSourceRows(receipt.baseRows);
 const bonus=receipt.bonusRows.length?`<section class="flight-reward-bonus"><header><h2>Optional rewards</h2>${receipt.bonusRows.length>1?`<strong>+<b data-ceremony-bonus>${stage==='income'?0:receipt.bonus}</b></strong>`:''}</header><div class="flight-reward-income-rows">${renderReceiptSourceRows(receipt.bonusRows)}</div></section>`:'';
 const context=receipt.notes.length?`<section class="flight-reward-notes" aria-label="Recorded flight effects"><h2>Recorded effects</h2>${renderReceiptEffectRows(receipt.effectEntries)}</section>`:'';
 const scrollColumn=(className,label,content)=>`<div class="flight-reward-ledger-column ${className}"><div class="flight-reward-scroll-region" data-receipt-scroll role="region" aria-label="${label}" tabindex="0"><div class="flight-reward-scroll-content">${content}</div></div><small class="flight-reward-scroll-cue" data-receipt-scroll-cue hidden>Scroll for more ↓</small></div>`;
 const income=`<article class="flight-reward-income flight-reward-receipt"><div class="flight-reward-summary"><span class="flight-reward-total-label">Earned this flight</span><strong class="flight-reward-income-total" aria-label="Stored Sparks earned">${resourceSymbol('packed')} +<b data-ceremony-income>0</b></strong><span class="flight-reward-bank-status" role="status" data-ceremony-bank-status>Counting Stored Sparks…</span></div><div class="flight-reward-ledger ${context?'has-secondary':'single-column'}">${scrollColumn('flight-reward-ledger-primary','Stored Spark sources',`<section class="flight-reward-clear"><h2>Stored Spark sources</h2><div class="flight-reward-income-rows">${rows||'<span>No clear income</span>'}</div>${bonus}</section>`)}${context?scrollColumn('flight-reward-ledger-secondary','Recorded flight effects',context):''}</div></article>`;
 const pack=`<div class="flight-reward-pack-context"><p class="flight-reward-bank-status">${receipt.total?`${resourceSymbol('packed')} +${receipt.total} Stored Sparks banked`:'Clear complete'} ✓</p><button type="button" class="flight-reward-pack" data-action="flight-reward-open-pack" data-draft-id="${esc(draft.id)}" aria-label="Open card pack. Reveal three cards, then choose one."><span class="flight-reward-pack-art">${sealedPackMarkup()}</span></button></div>`;
 const fan=stage==='cards'?cardDraftOffersMarkup(draft,{className:'flight-reward-fan'}):'';
 return `<section class="flight-reward-ceremony card-reward-screen ${stage==='cards'?'card-draft-screen':''}" data-stage="${stage}" data-ceremony-draft-id="${esc(draft.id)}"><header class="flight-reward-heading"><div><small>${esc(title)}${lastCourseName(run)?` · <span class="flight-course-name">${esc(lastCourseName(run))}</span>`:''}</small><h1>${stage==='cards'?'Choose 1 card':stage==='pack'?'Your card reward':'Flight rewards'}</h1></div><div class="flight-reward-wallet" aria-label="Wallet: ${receipt.wallet} Stored Sparks">${resourceSymbol('packed')}<b data-ceremony-wallet>${receipt.wallet}</b><small>Stored Sparks</small></div></header><div class="flight-reward-stage" data-stage="${stage}">${stage==='income'?income:stage==='pack'?pack:`<p class="flight-reward-choice-note">Keep one. The other two are left behind.</p>${fan||''}`}</div><footer class="flight-reward-actions">${stage==='income'?`<button type="button" class="flight-reward-receipt-continue" data-action="flight-reward-continue" aria-label="Continue to card pack">Continue</button>`:'<button class="secondary" data-action="cards">Deck</button><button class="secondary" data-action="menu">Menu</button>'}</footer></section>`;
}

/** Cancellable one-shot feedback. Only a deliberate press advances the receipt. */
export function mountFlightRewardCeremony({root,run,reducedMotion=false,animateWallet=false}={}){
 if(!root||flightRewardCeremonyStage(run)!=='income')return ()=>{};
 let cancelled=false,frame=0,sprite=null,animation=null;
 const receipt=flightRewardCeremonyReceipt(run);
 const live=()=>!cancelled&&root.isConnected;
 const scrollRegions=Array.from(root.querySelectorAll('[data-receipt-scroll]'));
 const updateScrollCues=()=>{for(const region of scrollRegions){const cue=region.parentElement?.querySelector('[data-receipt-scroll-cue]');if(cue)cue.hidden=region.scrollHeight-region.clientHeight-region.scrollTop<=2;}};
 for(const region of scrollRegions)region.addEventListener('scroll',updateScrollCues,{passive:true});
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(updateScrollCues):null;
 for(const region of scrollRegions){resizeObserver?.observe(region);if(region.firstElementChild)resizeObserver?.observe(region.firstElementChild);}
 root.ownerDocument?.defaultView?.addEventListener('resize',updateScrollCues);
 updateScrollCues();
 const counter=(element,total,duration,initial=0)=>new Promise(resolve=>{
  if(!element||!total||reducedMotion){if(element)element.textContent=total;resolve();return;}
  const start=performance.now();const tick=now=>{if(!live()){resolve();return;}const progress=Math.min(1,(now-start)/duration);element.textContent=Math.floor(initial+(total-initial)*(1-Math.pow(1-progress,3)));if(progress<1)frame=requestAnimationFrame(tick);else resolve();};
  frame=requestAnimationFrame(tick);
 });
 const wallet=root.querySelector('[data-ceremony-wallet]'),walletCountAllowed=animateWallet&&!reducedMotion&&receipt.total>0&&receipt.wallet>=receipt.total;
 if(walletCountAllowed&&wallet)wallet.textContent=receipt.wallet-receipt.total;
 (async()=>{
  root.classList.add('is-counting');
  await counter(root.querySelector('[data-ceremony-income]'),receipt.base,650);if(!live())return;
  root.classList.add('income-counted');
  if(receipt.bonus){await counter(root.querySelector('[data-ceremony-bonus]'),receipt.bonus,420);if(!live())return;}
  const earned = root.querySelector('[data-ceremony-income]');
  if (earned) earned.textContent = receipt.total;
  root.classList.add('bonus-counted','is-banking');
  const walletArrival=walletCountAllowed?counter(wallet,count(run.condensedGlow),480,receipt.wallet-receipt.total):Promise.resolve();
  const status=root.querySelector('[data-ceremony-bank-status]');
  if(status)status.textContent=receipt.total?'Stored Sparks secured in your wallet':'Clear complete';
  if(receipt.total&&!reducedMotion){
   const source=root.querySelector('.flight-reward-income-total'),target=root.querySelector('.flight-reward-wallet');
   if(source&&target){const from=source.getBoundingClientRect(),to=target.getBoundingClientRect();sprite=root.ownerDocument.createElement('div');sprite.className='flight-reward-bank-sprite';sprite.setAttribute('aria-hidden','true');sprite.innerHTML=resourceSymbol('packed');Object.assign(sprite.style,{position:'fixed',left:`${from.left+from.width/2-16}px`,top:`${from.top+from.height/2-16}px`,width:'32px',height:'32px',pointerEvents:'none',zIndex:'1000'});root.ownerDocument.body.appendChild(sprite);
    animation=sprite.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(.6)`,opacity:0.6}],{duration:480,easing:'cubic-bezier(.2,.6,.3,1)',fill:'forwards'});
    try{await animation.finished;}catch{}sprite?.remove();sprite=null;
   }
  }
  await walletArrival;if(!live())return;root.classList.add('is-banked');root.classList.remove('is-counting','is-banking');
  if(status)status.textContent=receipt.total?'Banked ✓':'Clear complete ✓';
 })();
 return ()=>{cancelled=true;cancelAnimationFrame(frame);animation?.cancel();sprite?.remove();resizeObserver?.disconnect();for(const region of scrollRegions)region.removeEventListener('scroll',updateScrollCues);root.ownerDocument?.defaultView?.removeEventListener('resize',updateScrollCues);if(wallet)wallet.textContent=count(run.condensedGlow);};
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
