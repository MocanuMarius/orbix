import {ARTIFACTS,lastCourseName} from './model.mjs?v=roundup-1';
import {artifactDescription} from './artifact-copy.mjs?v=roundup-1';
import {resourceSymbol} from './game-symbols.mjs?v=roundup-1';
import {artifactIcon} from './upgrade-icons.mjs?v=roundup-1';
import {relicIdentityMarkup,relicRulesMarkup,relicRulesButton} from './ui/relic-primitives.mjs?v=roundup-1';
import {actionButton} from './ui/primitives.mjs?v=roundup-1';
import {acquiredRewardMarkup} from './ui/acquired-reward.mjs?v=roundup-1';
import {routeBonusReceiptText} from './route-bonus-copy.mjs?v=roundup-1';
import {getInscription,slotInscriptionId} from './inscriptions.mjs?v=roundup-1';
import {inscriptionGlyph,INSCRIPTION_KIND_WORDS} from './inscription-ui.mjs?v=roundup-1';
import {cardArt} from './card-art.mjs?v=roundup-1';
import {cardTermTextMarkup} from './card-terms.mjs?v=roundup-1';
import {SKILL_CARDS} from './skill-cards.mjs?v=roundup-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rewardDescription=(a,run)=>{const c=artifactDescription(a,run,{fresh:true});return [c.effect,[c.trigger,c.limit].filter(Boolean).join(' ')];};
export function rewardEarnings(run){
 const f=run?.lastFlight||{},rows=[
  // Pack cards' share of the exit packing gets its own line; the two still add up to the packing (engine cards only).
  ['Clear reward',f.completionBonus],['Overflow',f.pickupCondensedGlow],['Takeaway packing',(f.exitPacking?.amount||0)-(f.cardPack?.stored||0)],
  ['Pack cards',f.cardPack?.stored],['Engine cards',f.cardEngineStored],
  ['Pact',f.pactBonus],['Seal',f.treasureWager?.reward],['Vow',f.vow?.reward],
  ['Route bonus',f.routeBonus?.amount],['Chest gifts',f.chestIncome?.amount],
  ['Kept Light',f.keptLightDividend],['Storage perk',f.storageBonus],['Tight Packing',f.cardPackingBonus],
  ['Resonance',f.resonanceStored],['Cards on clear',f.cardClearReceipt?.stored],
 ].map(([label,amount])=>({label,amount:Math.max(0,Math.floor(Number(amount)||0))})).filter(row=>row.amount);
 return {rows,total:rows.reduce((sum,row)=>sum+row.amount,0)};
}
export function rewardEarningsDetailMarkup(run){
 const {rows,total}=rewardEarnings(run),f=run?.lastFlight||{};
 const notes=[routeBonusReceiptText(f.routeBonus),f.treasureWager?.message,f.vow?.message,f.chestIncome?.message||(f.chestIncome?.sources?.length?`${f.chestIncome.sources.join(' + ')} · +${f.chestIncome.amount} Stored Sparks`:null),
  f.cardClearReceipt?.futureCapacity?`Growth Ring · +${f.cardClearReceipt.futureCapacity} maximum Sparks permanently`:null,
  f.cardClearReceipt?.cruisingSpeed?`Wind Feather · +${f.cardClearReceipt.cruisingSpeed}% cruising speed unlocked (cap +6%)`:null].filter(Boolean);
 return `<div class="re-root wb-reskin wb-ground wb-inline"><button type="button" class="wb-sign wb-sign-quiet reward-earnings-back" data-action="close-sheet">Back to rewards</button><section class="reward-earnings-detail"><header><h2 class="wb-title">Stored Sparks earned</h2><strong>${resourceSymbol('packed')} +${total}</strong></header><dl>${rows.map(row=>`<div><dt>${esc(row.label)}</dt><dd>+${row.amount}</dd></div>`).join('')}</dl>${notes.length?`<div class="reward-earnings-context">${notes.map(note=>`<p>${esc(note)}</p>`).join('')}</div>`:''}</section></div>`;
}
// The Scribe (docs/inscriptions.md): 1 choose an Inscription, 2 choose a slot, 3 (only over an existing Inscription) confirm.
// Cancelling the slot step returns to the three choices. Menu screens only: nothing here is shown in flight.
const insCard=(id,open)=>{const i=getInscription(id);return `<article class="scribe-choice scribe-${i.kind}" data-scribe-offer="${id}"><span class="scribe-mark">${inscriptionGlyph(id,{size:48})}</span><h2>${esc(i.name)}</h2><small class="scribe-kind">${esc(INSCRIPTION_KIND_WORDS[i.kind])}</small><p>${cardTermTextMarkup(i.text)}</p>${open?actionButton('Choose',{className:'wb-sign wb-sign-primary',action:'scribe-pick',id,ariaLabel:`Choose ${i.name}`}):''}</article>`;};
/** One slot choice: Slot N, the mounted card (picture and wrapped name) or "Empty slot", and what is written there now. */
function scribeSlot(r,n,i){
 const card=r.mountedCards?.[n],def=card?SKILL_CARDS[card.cardId]:null,name=card?def?.name||'Card':'',cur=getInscription(slotInscriptionId(r,n));
 const pic=card?`<span class="scribe-slot-pic">${cardArt({cardId:card.cardId,rarity:card.rarity||def?.rarity,name},{compact:true})}</span>`:'<span class="scribe-slot-pic scribe-slot-pic-empty" aria-hidden="true"></span>';
 const what=cur?`<span class="scribe-slot-ins">${inscriptionGlyph(cur.id,{size:16})}<span>Replaces: ${esc(cur.name)}</span></span>`:'<span class="scribe-slot-ins scribe-slot-none"><span>No Inscription</span></span>';
 const warn=!card&&i.kind==='card'?'<span class="scribe-slot-warn">Needs a card here to do anything</span>':'';
 return `<button type="button" class="scribe-slot${cur?' scribe-slot-inscribed':''}${card?'':' scribe-slot-empty'}" data-action="scribe-slot" data-slot="${n}" aria-label="Slot ${n+1}, ${card?esc(name):'empty'}${cur?`. Replaces ${esc(cur.name)}`:'. No Inscription'}${warn?'. Needs a card here to do anything':''}"><b class="scribe-slot-n">Slot ${n+1}</b>${pic}<span class="scribe-slot-name">${card?esc(name):'Empty slot'}</span>${what}${warn}</button>`;
}
export function scribeMarkup(state,{scribe={},upgradeCount=0,skillsAvailable=false,deckAvailable=true,receiptAvailable=false,earned=0,title='Elite cleared'}={}){
 const r=state.run,reward=r.flightReward,open=!reward.claimed,picked=open&&reward.offers.includes(scribe.id)?scribe.id:null;
 const head=(small,h)=>`<header class="artifact-reward-heading wbf-head"><div class="wbf-titles"><small class="wb-context">${esc(small)}${lastCourseName(r)?` · <span class="flight-course-name">${esc(lastCourseName(r))}</span>`:''}</small><h1 class="wb-title">${esc(h)}</h1></div>${receiptAvailable?`<button type="button" class="wb-sign wb-sign-standard reward-packed-earned" data-action="reward-earnings" aria-label="${earned} Stored Sparks earned. View breakdown.">${resourceSymbol('packed')}<b>+${earned}</b><span>Earned · Details</span></button>`:''}</header>`;
 const shell=(inner,foot)=>`<section class="artifact-reward-screen accumulating-rewards scribe-screen rw-screen wb-reskin wb-ground wb-inline wb-framed ${open?'reward-open':'reward-resolved'}">${inner}<footer class="artifact-reward-actions">${foot}</footer></section>`;
 if(!open){
  const i=getInscription(reward.chosen);
  return shell(head('The Scribe',title)+`<div class="scribe-written" role="status">${i?insCard(reward.chosen,false):''}<p class="scribe-result">Written on slot ${(reward.slot??0)+1}${reward.replaced?`, replacing ${esc(getInscription(reward.replaced)?.name||'the old one')}`:''}.</p></div>`,
   `${deckAvailable?'<button type="button" class="wb-sign wb-sign-standard" data-action="cards"><span>Deck</span></button>':''}<button type="button" class="wb-sign wb-sign-primary" data-action="victory-next">Continue</button>`);
 }
 if(!picked)return shell(head(`The Scribe · ${title}`,'Choose an Inscription')+`<div class="scribe-offers" aria-label="Choose an Inscription">${reward.offers.map(id=>insCard(id,true)).join('')}</div>`,`<span class="artifact-choice-instruction">Next: choose the slot to write it on</span>`);
 const i=getInscription(picked),slots=Array.from({length:r.cardSlots||0},(_,n)=>n);
 if(Number.isInteger(scribe.slot)&&slotInscriptionId(r,scribe.slot)){
  const old=getInscription(slotInscriptionId(r,scribe.slot));
  return shell(head('The Scribe','Replace this Inscription?')+`<div class="scribe-confirm"><div class="scribe-swap" aria-hidden="true"><span>${inscriptionGlyph(old.id,{size:48})}<b>${esc(old.name)}</b></span><span>${inscriptionGlyph(i.id,{size:48})}<b>${esc(i.name)}</b></span></div><p>Slot ${scribe.slot+1} already carries <b>${esc(old.name)}</b>: ${esc(old.text)}</p><p>Writing <b>${esc(i.name)}</b> there erases it. This cannot be undone.</p></div>`,
   `<button type="button" class="wb-sign wb-sign-quiet" data-action="scribe-slot-back"><span>Back</span></button><button type="button" class="wb-sign wb-sign-primary" data-action="scribe-confirm" aria-label="Replace ${esc(old.name)} with ${esc(i.name)} on slot ${scribe.slot+1}"><span>Replace</span></button>`);
 }
 return shell(head('The Scribe','Choose a slot')+`<div class="scribe-pick"><aside class="scribe-chosen scribe-${i.kind}" aria-label="Chosen Inscription"><span class="scribe-mark">${inscriptionGlyph(i.id,{size:48})}</span><h2>${esc(i.name)}</h2><p>${cardTermTextMarkup(i.text)}</p><small class="scribe-kind">${esc(INSCRIPTION_KIND_WORDS[i.kind])}</small><button type="button" class="wb-sign wb-sign-quiet scribe-back" data-action="scribe-back"><span>Back</span></button></aside><div class="scribe-slots" role="group" aria-label="Chain slots" style="--slots:${slots.length}">${slots.map(n=>scribeSlot(r,n,i)).join('')}</div></div>`,'');
}
export function flightRewardMarkup(state,{artifactArt=artifactIcon,upgradeCount=0,skillsAvailable=true,deckAvailable=false,acquiredPresentation='horizontal',scribe=null}={}){
 if(state.run?.flightReward?.kind==='inscription'){
  const r=state.run,f=r.lastFlight||{},earned=rewardEarnings(r).total;
  const receiptAvailable=earned>0||!!routeBonusReceiptText(f.routeBonus)||['treasureWager','vow','chestIncome'].some(key=>f[key]?.message?.trim())||f.cardClearReceipt?.futureCapacity>0||f.cardClearReceipt?.cruisingSpeed>0;
  return scribeMarkup(state,{scribe:scribe||{},upgradeCount,skillsAvailable,deckAvailable,receiptAvailable,earned,title:f.boss?'Guardian defeated':'Elite cleared'});
 }
 const r=state.run,reward=r.flightReward,offers=(reward?.offers||[]).filter(id=>ARTIFACTS[id]),open=!!reward&&!reward.claimed&&offers.length>0;
 if(!reward?.permanent&&!r.lastFlight?.elite&&!r.lastFlight?.boss&&!offers.length)return '';
 const earned=rewardEarnings(r).total;
 const receiptAvailable=earned>0||!!routeBonusReceiptText(r.lastFlight?.routeBonus)||['treasureWager','vow','chestIncome'].some(key=>r.lastFlight?.[key]?.message?.trim())||r.lastFlight?.cardClearReceipt?.futureCapacity>0||r.lastFlight?.cardClearReceipt?.cruisingSpeed>0;
 const title=reward?.permanent?'Choose an Inscription':r.lastFlight?.boss?'Guardian defeated':r.lastFlight?.elite?'Elite cleared':'Passage cleared';
 const ids=open?offers:ARTIFACTS[reward?.chosen]?[reward.chosen]:[];
 if(reward?.claimed===true&&!reward.permanent&&(r.lastFlight?.elite||r.lastFlight?.boss)&&ids.length===1&&['pedestal','horizontal','compact'].includes(acquiredPresentation)){
  const artifact=ARTIFACTS[ids[0]],copy=artifactDescription(artifact,r);
  return acquiredRewardMarkup({artifact,copy,run:r,title,earned,receiptAvailable,presentation:acquiredPresentation,artifactArt,skillsAvailable,deckAvailable,upgradeCount});
 }
 return `<section class="artifact-reward-screen accumulating-rewards rw-screen wb-reskin wb-ground wb-inline wb-framed ${open?'reward-open':'reward-resolved'} ${ids.length?'has-artifacts':'clear-only'}">
 <header class="artifact-reward-heading wbf-head"><div class="wbf-titles">${open?'<small class="wb-context">Choose one</small>':''}<h1 class="wb-title">${esc(title)}</h1>${lastCourseName(r)?`<small class="wb-context flight-course-name">${esc(lastCourseName(r))}</small>`:''}</div>${receiptAvailable?`<button type="button" class="wb-sign wb-sign-standard reward-packed-earned" data-action="reward-earnings" aria-label="${earned} Stored Sparks earned. View breakdown.">${resourceSymbol('packed')}<b>+${earned}</b><span>Earned · Details</span></button>`:''}</header>
 ${ids.length?`<div class="artifact-pair ${ids.length===1?'artifact-pair-resolved':''}" aria-label="${open?'Choose one artifact':'Acquired artifact'}">${ids.map(id=>{
 const a=ARTIFACTS[id],copy=artifactDescription(a,r,{fresh:open});
 return `<article class="artifact-choice ${a.rarity}" data-reward-artifact="${id}">${relicIdentityMarkup(a,copy,{artifactArt,lifetime:reward.permanent?(r.testMode?'TEST preview':'Permanent discovery'):copy.lifetime})}${relicRulesMarkup(copy)}<footer class="artifact-choice-actions">${relicRulesButton(a,{sign:true})}${open?actionButton(reward.permanent?'Discover':'Take artifact',{className:'wb-sign wb-sign-primary',action:'keep-flight-reward',id,ariaLabel:`${reward.permanent?'Discover':'Take'} ${a.name}`}):`<span class="artifact-acquired" role="status">✓ ${reward.permanent?'Unlocked for future runs':copy.type==='consumable'?'Ready · '+copy.lifetime.split(' · ')[0]:'Active this run'}</span>`}</footer></article>`;
 }).join('')}</div>`:`<div class="flight-clear-summary">${resourceSymbol('packed')}<strong>${reward?.permanent?'Collection complete':'Passage secured'}</strong><span>${reward?.permanent?'All guardian unlocks discovered.':deckAvailable?'Review your Deck before you go on.':'Open Skills to spend your Stored Sparks.'}</span></div>`}
 <footer class="artifact-reward-actions">${open?`<span class="artifact-choice-instruction">${reward.permanent?(r.testMode?'Preview in TEST':'Saved to your Collection'):'Works automatically'}</span>`:`${(skillsAvailable||deckAvailable)&&!reward?.permanent?`<button type="button" class="wb-sign wb-sign-standard ${!deckAvailable&&upgradeCount?'upgrade-ready':''}" data-action="${deckAvailable?'cards':'skills'}">${deckAvailable?'':resourceSymbol('packed')}<span>${deckAvailable?'Deck':upgradeCount?'Upgrade':'Plan skills'}</span></button>`:''}<button type="button" class="wb-sign wb-sign-primary" data-action="victory-next">Continue</button>`}</footer></section>`;
}
