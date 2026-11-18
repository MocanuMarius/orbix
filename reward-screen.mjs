import {ARTIFACTS,lastCourseName} from './model.mjs?v=tally-1';
import {artifactDescription} from './artifact-copy.mjs?v=tally-1';
import {resourceSymbol} from './game-symbols.mjs?v=tally-1';
import {artifactIcon} from './upgrade-icons.mjs?v=tally-1';
import {relicIdentityMarkup,relicRulesMarkup,relicRulesButton} from './ui/relic-primitives.mjs?v=tally-1';
import {actionButton} from './ui/primitives.mjs?v=tally-1';
import {acquiredRewardMarkup} from './ui/acquired-reward.mjs?v=tally-1';
import {routeBonusReceiptText} from './route-bonus-copy.mjs?v=tally-1';
import {getInscription,slotInscriptionId,slotEntry,permanentOnSlot} from './inscriptions.mjs?v=tally-1';
import {inscriptionGlyph,inscriptionTag} from './inscription-ui.mjs?v=tally-1';
import {cardArt} from './card-art.mjs?v=tally-1';
import {inscriptionWriteMarkup} from './inscription-write.mjs?v=tally-1';
import {cardTermTextMarkup} from './card-terms.mjs?v=tally-1';
import {SKILL_CARDS} from './skill-cards.mjs?v=tally-1';
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
  f.cardClearReceipt?.tallyCapacity?`Growth Ring · +${f.cardClearReceipt.tallyCapacity} max Spark, kept on the card while it is in your Chain`:null,
  f.cardClearReceipt?.cruisingSpeed?`Wind Feather · +${f.cardClearReceipt.cruisingSpeed}% speed, kept on the card (max +10%)`:null].filter(Boolean);
 return `<div class="re-root wb-reskin wb-ground wb-inline"><button type="button" class="wb-sign wb-sign-quiet reward-earnings-back" data-action="close-sheet">Back to rewards</button><section class="reward-earnings-detail"><header><h2 class="wb-title">Stored Sparks earned</h2><strong>${resourceSymbol('packed')} +${total}</strong></header><dl>${rows.map(row=>`<div><dt>${esc(row.label)}</dt><dd>+${row.amount}</dd></div>`).join('')}</dl>${notes.length?`<div class="reward-earnings-context">${notes.map(note=>`<p>${esc(note)}</p>`).join('')}</div>`:''}</section></div>`;
}
// The Scribe (docs/inscriptions.md): 1 choose an Inscription, 2 choose a slot, 3 (only over an existing Inscription) confirm.
// Cancelling the slot step returns to the two choices. Menu screens only: nothing here is shown in flight. Nothing on these screens
// scrolls (890×400, 915×412, 740×333): two wide offer cards (mark at the left, name, tag and one keyword line, Choose along the bottom).
const insCard=(id,open)=>{const i=getInscription(id);return `<article class="scribe-choice scribe-${i.kind}" data-scribe-offer="${id}"><span class="scribe-mark">${inscriptionGlyph(id,{role:'huge'})}</span><div class="scribe-copy"><h2>${esc(i.name)}</h2>${inscriptionTag(i)}<p class="scribe-rule">${cardTermTextMarkup(i.text)}</p></div>${open?actionButton('Choose',{className:'wb-sign wb-sign-primary scribe-choose',action:'scribe-pick',id,ariaLabel:`Choose ${i.name}`}):''}</article>`;};
/** The chosen Inscription beside the slots: mark, name, tag, rule and what to do. */
const chosenAside=(i,{source='',back=''}={})=>`<aside class="scribe-chosen scribe-${i.kind}" aria-label="Chosen Inscription"><div class="scribe-chosen-id"><span class="scribe-mark">${inscriptionGlyph(i.id,{role:'large'})}</span><div><h2>${esc(i.name)}</h2>${inscriptionTag(i)}</div></div><p class="scribe-rule">${cardTermTextMarkup(i.text)}</p>${source?`<small class="scribe-source">${esc(source)}</small>`:''}${back}</aside>`;
/** One slot choice: Slot N, the mounted card (picture and wrapped name) or "Empty slot", and what is written there now. */
function scribeSlot(r,n,i){
 const card=r.mountedCards?.[n],def=card?SKILL_CARDS[card.cardId]:null,name=card?def?.name||'Card':'',cur=getInscription(slotInscriptionId(r,n));
 const pic=card?`<span class="scribe-slot-pic">${cardArt({cardId:card.cardId,rarity:card.rarity||def?.rarity,name},{compact:true})}</span>`:'<span class="scribe-slot-pic scribe-slot-pic-empty" aria-hidden="true"></span>';
 const what=cur?`<span class="scribe-slot-ins">${inscriptionGlyph(cur.id,{role:'list'})}<span>Replaces: ${esc(cur.name)}</span></span>`:'<span class="scribe-slot-ins scribe-slot-none"><span>No Inscription</span></span>';
 const warn=!card&&i.kind==='card'?'<span class="scribe-slot-warn">Needs a card here to do anything</span>':'';
 return `<button type="button" class="scribe-slot${cur?' scribe-slot-inscribed':''}${card?'':' scribe-slot-empty'}" data-action="scribe-slot" data-slot="${n}" aria-label="Slot ${n+1}, ${card?esc(name):'empty'}${cur?`. Replaces ${esc(cur.name)}`:'. No Inscription'}${warn?'. Needs a card here to do anything':''}"><b class="scribe-slot-n">Slot ${n+1}</b>${pic}<span class="scribe-slot-name">${card?esc(name):'Empty slot'}</span>${what}${warn}</button>`;
}
/** Every Scribe screen is headed with this, so it can never be taken for the chest-find slot screen. */
export const SCRIBE_KICKER='The Scribe — permanent Inscription';
export function scribeMarkup(state,{scribe={},upgradeCount=0,skillsAvailable=false,deckAvailable=true,receiptAvailable=false,earned=0,title='Elite cleared',stop=false}={}){
 // stop: the Scribe stop on the map. No flight came before it, so no course name, and it leaves for the map.
 const r=state.run,reward=r.flightReward,open=!reward.claimed,picked=open&&reward.offers.includes(scribe.id)?scribe.id:null; // scribe: {id, slot} selection
 const second=r.pendingTemporary&&open?`<p class="scribe-second-note" role="note">A second choice follows: a chest find, ${esc(getInscription(r.pendingTemporary.id)?.name||'')}.</p>`:'';
 const head=(small,h,step='')=>`<header class="artifact-reward-heading wbf-head"><div class="wbf-titles"><small class="wb-context">${esc(small)}${step?` · ${esc(step)}`:''}${!stop&&lastCourseName(r)?` · <span class="flight-course-name">${esc(lastCourseName(r))}</span>`:''}</small><h1 class="wb-title">${esc(h)}</h1></div>${receiptAvailable?`<button type="button" class="wb-sign wb-sign-standard reward-packed-earned" data-action="reward-earnings" aria-label="${earned} Stored Sparks earned. View breakdown.">${resourceSymbol('packed')}<b>+${earned}</b><span>Earned · Details</span></button>`:''}</header>`;
 const shell=(inner,foot)=>`<section class="artifact-reward-screen accumulating-rewards scribe-screen rw-screen wb-reskin wb-ground wb-inline wb-framed ${open?'reward-open':'reward-resolved'}">${inner}<footer class="artifact-reward-actions">${foot}</footer></section>`;
 if(!open){
  const i=getInscription(reward.chosen);
  return shell(head(SCRIBE_KICKER,title)+`<div class="scribe-written" role="status">${i?insCard(reward.chosen,false):''}<p class="scribe-result">Written on slot ${(reward.slot??0)+1}${reward.replaced?`, replacing ${esc(getInscription(reward.replaced)?.name||'the old one')}`:''}.</p></div>`,
   `${deckAvailable?'<button type="button" class="wb-sign wb-sign-standard" data-action="cards"><span>Deck</span></button>':''}<button type="button" class="wb-sign wb-sign-primary" data-action="${stop?'leave-scribe':'victory-next'}">${stop?'Back to map':'Continue'}</button>`);
 }
 // One screen (inscription-write.mjs): the offers above, the Chain below, the result shown on the chosen slot, then Write.
 const note=r.pendingTemporary?`Then: a chest find, ${getInscription(r.pendingTemporary.id)?.name||''}`:'';
 return inscriptionWriteMarkup(r,{offers:reward.offers,picked,slot:Number.isInteger(scribe.slot)?scribe.slot:null,kicker:`${SCRIBE_KICKER}${note?` · ${note}`:''}`,title:'Write an Inscription'});
}
export function flightRewardMarkup(state,{artifactArt=artifactIcon,upgradeCount=0,skillsAvailable=true,deckAvailable=false,acquiredPresentation='horizontal',scribe=null}={}){
 if(state.run?.flightReward?.kind==='inscription'){
  const r=state.run,f=r.lastFlight||{},earned=rewardEarnings(r).total;
  const receiptAvailable=earned>0||!!routeBonusReceiptText(f.routeBonus)||['treasureWager','vow','chestIncome'].some(key=>f[key]?.message?.trim())||f.cardClearReceipt?.futureCapacity>0||f.cardClearReceipt?.tallyCapacity>0||f.cardClearReceipt?.cruisingSpeed>0;
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

// A chest find (docs/inscriptions.md, "Chest gifts"): the permanent Inscription is written on a slot of the Chain on the one-screen writer, one offer
// already selected (run.pendingTemporary, which only ever holds a chest find). Menu screen only.
export function temporaryWriteMarkup(state,{slot=null}={}){
 const r=state.run,p=r?.pendingTemporary,i=p?getInscription(p.id):null;
 if(!i)return '';
 return inscriptionWriteMarkup(r,{offers:[i.id],picked:i.id,slot,kicker:'Chest find — permanent Inscription',title:'Write an Inscription',actions:{pick:'temp-pick',slot:'temp-slot',write:'temp-write'},className:'permanent-write'});
}
