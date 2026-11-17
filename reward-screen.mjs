import {ARTIFACTS,lastCourseName} from './model.mjs?v=rest-2';
import {artifactDescription} from './artifact-copy.mjs?v=rest-2';
import {resourceSymbol} from './game-symbols.mjs?v=rest-2';
import {artifactIcon} from './upgrade-icons.mjs?v=rest-2';
import {relicIdentityMarkup,relicRulesMarkup,relicRulesButton} from './ui/relic-primitives.mjs?v=rest-2';
import {actionButton} from './ui/primitives.mjs?v=rest-2';
import {acquiredRewardMarkup} from './ui/acquired-reward.mjs?v=rest-2';
import {routeBonusReceiptText} from './route-bonus-copy.mjs?v=rest-2';
import {getInscription,slotInscriptionId,slotEntry} from './inscriptions.mjs?v=rest-2';
import {previewPendingTemporary,temporaryLine} from './temporary-inscriptions.mjs?v=rest-2';
import {inscriptionGlyph,INSCRIPTION_KIND_WORDS} from './inscription-ui.mjs?v=rest-2';
import {cardArt} from './card-art.mjs?v=rest-2';
import {cardTermTextMarkup} from './card-terms.mjs?v=rest-2';
import {SKILL_CARDS} from './skill-cards.mjs?v=rest-2';
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
export function scribeMarkup(state,{scribe={},upgradeCount=0,skillsAvailable=false,deckAvailable=true,receiptAvailable=false,earned=0,title='Elite cleared',stop=false}={}){
 // stop: the Scribe stop on the map. No flight came before it, so no course name, and it leaves for the map.
 const r=state.run,reward=r.flightReward,open=!reward.claimed,picked=open&&reward.offers.includes(scribe.id)?scribe.id:null;
 const head=(small,h)=>`<header class="artifact-reward-heading wbf-head"><div class="wbf-titles"><small class="wb-context">${esc(small)}${!stop&&lastCourseName(r)?` · <span class="flight-course-name">${esc(lastCourseName(r))}</span>`:''}</small><h1 class="wb-title">${esc(h)}</h1></div>${receiptAvailable?`<button type="button" class="wb-sign wb-sign-standard reward-packed-earned" data-action="reward-earnings" aria-label="${earned} Stored Sparks earned. View breakdown.">${resourceSymbol('packed')}<b>+${earned}</b><span>Earned · Details</span></button>`:''}</header>`;
 const shell=(inner,foot)=>`<section class="artifact-reward-screen accumulating-rewards scribe-screen rw-screen wb-reskin wb-ground wb-inline wb-framed ${open?'reward-open':'reward-resolved'}">${inner}<footer class="artifact-reward-actions">${foot}</footer></section>`;
 if(!open){
  const i=getInscription(reward.chosen);
  return shell(head('The Scribe',title)+`<div class="scribe-written" role="status">${i?insCard(reward.chosen,false):''}<p class="scribe-result">Written on slot ${(reward.slot??0)+1}${reward.replaced?`, replacing ${esc(getInscription(reward.replaced)?.name||'the old one')}`:''}.</p></div>`,
   `${deckAvailable?'<button type="button" class="wb-sign wb-sign-standard" data-action="cards"><span>Deck</span></button>':''}<button type="button" class="wb-sign wb-sign-primary" data-action="${stop?'leave-scribe':'victory-next'}">${stop?'Back to map':'Continue'}</button>`);
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

// Temporary Inscriptions (docs/inscriptions.md, "Events and objectives"): earned from an event or an optional objective, the player picks the
// slot on this screen (run.pendingTemporary). Choose a slot; over a permanent Inscription it COVERS it (confirm, the old one comes back);
// over another temporary one it replaces it (confirm). Menu screen only.
function tempSlot(r,n,i){
 const card=r.mountedCards?.[n],def=card?SKILL_CARDS[card.cardId]:null,name=card?def?.name||'Card':'',entry=slotEntry(r,n),cur=entry?getInscription(entry.id):null;
 const under=entry?.temporary&&entry.covers?.id?getInscription(entry.covers.id):null;
 const pic=card?`<span class="scribe-slot-pic">${cardArt({cardId:card.cardId,rarity:card.rarity||def?.rarity,name},{compact:true})}</span>`:'<span class="scribe-slot-pic scribe-slot-pic-empty" aria-hidden="true"></span>';
 const words=!cur?'No Inscription':cur.temporary?`Replaces: ${cur.name}${cur.until?'':` (${entry.flightsLeft} left)`}${under?`, still covering ${under.name}`:''}`:`Covers: ${cur.name} (comes back)`;
 const what=cur?`<span class="scribe-slot-ins scribe-slot-covers">${inscriptionGlyph(cur.id,{size:16})}<span>${esc(words)}</span></span>`:'<span class="scribe-slot-ins scribe-slot-none"><span>No Inscription</span></span>';
 return `<button type="button" class="scribe-slot${cur?' scribe-slot-inscribed':''}${card?'':' scribe-slot-empty'}" data-action="temp-slot" data-slot="${n}" aria-label="Slot ${n+1}, ${card?esc(name):'empty'}. ${esc(words)}"><b class="scribe-slot-n">Slot ${n+1}</b>${pic}<span class="scribe-slot-name">${card?esc(name):'Empty slot'}</span>${what}</button>`;
}
export function temporaryWriteMarkup(state,{slot=null}={}){
 const r=state.run,p=r?.pendingTemporary,i=p?getInscription(p.id):null;
 if(!i)return '';
 const slots=Array.from({length:r.cardSlots||0},(_,n)=>n),oath=!!i.until,kind=oath?'Oath Inscription':'Temporary Inscription';
 const head=h=>`<header class="artifact-reward-heading wbf-head"><div class="wbf-titles"><small class="wb-context">${kind}${p.label?` · ${esc(p.label)}`:''}</small><h1 class="wb-title">${esc(h)}</h1></div></header>`;
 const shell=(inner,foot)=>`<section class="artifact-reward-screen accumulating-rewards scribe-screen rw-screen wb-reskin wb-ground wb-inline wb-framed reward-open temporary-write">${inner}<footer class="artifact-reward-actions">${foot}</footer></section>`;
 const when=oath?'Stays until fulfilled':`${p.flights} ${p.flights===1?'flight':'flights'}`;
 const chosen=`<aside class="scribe-chosen scribe-temporary" aria-label="Chosen Inscription"><span class="scribe-mark">${inscriptionGlyph(i.id,{size:48})}</span><h2>${esc(i.name)}</h2><p>${cardTermTextMarkup(i.text)}</p><small class="scribe-kind">${esc(when)}. ${esc(INSCRIPTION_KIND_WORDS.temporary)}</small></aside>`;
 const pv=Number.isInteger(slot)?previewPendingTemporary(r,slot):null;
 if(pv?.needsConfirm){
  const old=getInscription(pv.replacesTemporary||pv.covers),covers=!pv.replacesTemporary;
  const body=covers
   ?`<p>Slot ${slot+1} carries <b>${esc(old.name)}</b>: ${esc(old.text)}</p><p><b>${esc(i.name)}</b> covers it. <b>${esc(old.name)}</b> stops working, then comes back by itself when ${esc(i.name)} ends (${esc(when.toLowerCase())}).</p>`
   :`<p>Slot ${slot+1} carries <b>${esc(old.name)}</b>, a temporary Inscription.</p><p>Writing <b>${esc(i.name)}</b> there replaces it. ${pv.covers?`The permanent Inscription beneath it, <b>${esc(getInscription(pv.covers).name)}</b>, stays covered until ${esc(i.name)} ends.`:''}</p>`;
  return shell(head(covers?'Cover this Inscription?':'Replace this Inscription?')+`<div class="scribe-confirm"><div class="scribe-swap" aria-hidden="true"><span>${inscriptionGlyph(old.id,{size:48})}<b>${esc(old.name)}</b></span><span>${inscriptionGlyph(i.id,{size:48})}<b>${esc(i.name)}</b></span></div>${body}</div>`,
   `<button type="button" class="wb-sign wb-sign-quiet" data-action="temp-slot-back"><span>Back</span></button><button type="button" class="wb-sign wb-sign-primary" data-action="temp-confirm" aria-label="${covers?'Cover':'Replace'} ${esc(old.name)} with ${esc(i.name)} on slot ${slot+1}"><span>${covers?'Cover':'Replace'}</span></button>`);
 }
 return shell(head('Choose a slot')+`<div class="scribe-pick">${chosen}<div class="scribe-slots" role="group" aria-label="Chain slots" style="--slots:${slots.length}">${slots.map(n=>tempSlot(r,n,i)).join('')}</div></div>`,`<span class="artifact-choice-instruction">${esc(temporaryLine(i.id,p.flights))}</span>`);
}
