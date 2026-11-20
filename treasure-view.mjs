import {companionArtSvg} from './companion-art.mjs?v=clear-2';
import {resourceSymbol} from './game-symbols.mjs?v=clear-2';
import {lifeHeartSvg} from './lives.mjs?v=clear-2';
import {getTreasureChoices,getTreasureKind,SKILLS,isCardRun} from './model.mjs?v=clear-2';
import {CHEST_CARD_LINE,chestChoiceLine} from './treasure.mjs?v=clear-2';
import {treasureArt} from './treasure-art.mjs?v=clear-2';
import {skillIcon,artifactIcon} from './upgrade-icons.mjs?v=clear-2';
import {formatGlow,getGlowCapacity} from './vitality.mjs?v=clear-2';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function choiceIcon(kind,run,offer){
 if(offer?.skillId)return skillIcon(SKILLS[offer.skillId]||{id:offer.skillId});
 if(offer?.artifactIds?.length)return offer.artifactIds.map(id=>artifactIcon(id)).join('');
 if(kind==='companion')return companionArtSvg(run.companionRole);
 if(kind==='feather')return skillIcon({id:'main-drift'});
 if(kind==='heart')return lifeHeartSvg();
 if(kind==='sight')return skillIcon({id:'main-sight'});
 if(kind==='capacity')return skillIcon({id:'main-reservoir',treeIcon:'cup'});
 if(kind==='wager')return skillIcon({id:'wager',treeIcon:'hourglass'});
 return resourceSymbol(kind);
}

function treasureChoice(offer,index,run,preview){
 const body=`<span class="treasure-choice-icon" aria-hidden="true">${choiceIcon(offer.icon,run,offer)}</span>
 <span class="treasure-choice-copy"><strong>${esc(offer.title)}</strong><span>${esc(offer.description)}</span>
 ${offer.disabled? `<small class="treasure-constraint">${esc(offer.disabledReason)}</small>`:''}</span>`;
 if(preview)return `<div class="treasure-offer treasure-offer-preview">${body}</div>`;
 return `<button class="treasure-offer" data-tap-pick data-action="support" data-index="${index}" ${offer.disabled?'disabled':''}>${body}<span class="treasure-pick-arrow" aria-hidden="true">${offer.disabled?'':'›'}</span></button>`;
}

/** The chest's second choice, one simple screen: +N Stored Sparks now, or a free surprise card. One or the other. */
export function chestChoiceMarkup(run){
 const p=run?.pendingChest;if(!p)return '';
 return `<section class="treasure-room chest-choice" aria-label="Chest: choose one"><aside class="treasure-place"><div class="treasure-name"><small>CHOOSE ONE</small><h2>The chest holds two gifts</h2></div></aside>
 <div class="treasure-offers support-offers">
  <button class="treasure-offer chest-option" data-tap-pick data-action="chest-choice" data-id="sparks"><span class="treasure-choice-icon" aria-hidden="true">${resourceSymbol('packed')}</span><span class="treasure-choice-copy"><strong>Stored Sparks: +${p.sparks}</strong><span>Taken now. Spend them at Rest.</span></span><span class="treasure-pick-arrow" aria-hidden="true">›</span></button>
  <button class="treasure-offer chest-option" data-tap-pick data-action="chest-choice" data-id="card"><span class="treasure-choice-icon" aria-hidden="true">${skillIcon({id:'main-drift'})}</span><span class="treasure-choice-copy"><strong>A surprise card</strong><span>Forged free, then added to your deck.</span></span><span class="treasure-pick-arrow" aria-hidden="true">›</span></button>
 </div><p class="treasure-card-note" role="note"><b>One or the other.</b> <span>The other gift stays in the chest.</span></p></section>`;
}
export function treasureView(run,node,{preview=false,available=false,practiceTools=''}={}){
 const offers=getTreasureChoices(run,node),kind=getTreasureKind(run,node);
 const heading=node.practiceLoan?'PRACTICE LOAN':preview?(available?'REACHABLE CHEST':'CHEST AHEAD'):'CHOOSE ONE';
 return `<section class="treasure-room ${node.practiceLoan?'prologue-loan':''} ${preview?'treasure-route-preview':''}" data-treasure="${esc(kind)}" aria-label="${esc(node.name)}">
 <aside class="treasure-place">${treasureArt(kind)}
 <div class="treasure-name"><small>${heading}</small><h2>${esc(node.name)}</h2></div>
 <span class="treasure-energy" aria-label="Current Sparks: ${formatGlow(run.flame)} of ${formatGlow(getGlowCapacity(run))}">${resourceSymbol('energy')} <b>${formatGlow(run.flame)}<small> / ${formatGlow(getGlowCapacity(run))}</small></b></span></aside>
 ${isCardRun(run)&&!node.practiceLoan?`<p class="treasure-card-note" role="note"><b>${esc(chestChoiceLine(run.mapIndex))}</b> <span>${preview?'After you take a find, the chest offers this choice.':'Pick one: both are free.'}</span></p>`:''}
 <div class="treasure-offers ${preview?'':'support-offers'}">${offers.map((offer,i)=>treasureChoice(offer,i,run,preview)).join('')}</div>
 ${preview?`<footer class="treasure-route-actions"><button class="secondary" data-action="close-sheet">Back</button>${available?`<button class="primary" data-action="node" data-id="${esc(node.id)}">Visit chest</button>`:''}</footer>`:practiceTools}</section>`;
}
