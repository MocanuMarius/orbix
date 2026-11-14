import {companionArtSvg} from './companion-art.mjs?v=guardian-currents-1';
import {resourceSymbol} from './game-symbols.mjs?v=guardian-currents-1';
import {getTreasureChoices,getTreasureKind} from './model.mjs?v=guardian-currents-1';
import {treasureArt} from './treasure-art.mjs?v=guardian-currents-1';
import {skillIcon} from './upgrade-icons.mjs?v=guardian-currents-1';
import {formatGlow,getGlowCapacity} from './vitality.mjs?v=guardian-currents-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function choiceIcon(kind,run){
 if(kind==='companion')return companionArtSvg(run.companionRole);
 if(kind==='sight')return skillIcon({id:'main-sight'});
 if(kind==='capacity')return skillIcon({id:'main-reservoir',treeIcon:'cup'});
 if(kind==='wager')return skillIcon({id:'wager',treeIcon:'hourglass'});
 return resourceSymbol(kind);
}

function treasureChoice(offer,index,run,preview){
 const body=`<span class="treasure-choice-icon" aria-hidden="true">${choiceIcon(offer.icon,run)}</span>
 <span class="treasure-choice-copy"><strong>${esc(offer.title)}</strong><span>${esc(offer.description)}</span>
 ${offer.disabled? `<small class="treasure-constraint">${esc(offer.disabledReason)}</small>`:''}</span>`;
 if(preview)return `<div class="treasure-offer treasure-offer-preview">${body}</div>`;
 return `<button class="treasure-offer" data-action="support" data-index="${index}" ${offer.disabled?'disabled':''}>${body}<span class="treasure-pick-arrow" aria-hidden="true">${offer.disabled?'':'›'}</span></button>`;
}

export function treasureView(run,node,{preview=false,available=false,practiceTools=''}={}){
 const offers=getTreasureChoices(run,node),kind=getTreasureKind(run,node);
 const heading=preview?(available?'REACHABLE CHEST':'CHEST AHEAD'):'CHOOSE ONE';
 return `<section class="treasure-room ${preview?'treasure-route-preview':''}" data-treasure="${esc(kind)}" aria-label="${esc(node.name)}">
 <aside class="treasure-place">${treasureArt(kind)}
 <div class="treasure-name"><small>${heading}</small><h2>${esc(node.name)}</h2></div>
 <span class="treasure-energy" aria-label="Current Energy: ${formatGlow(run.flame)} of ${formatGlow(getGlowCapacity(run))}">${resourceSymbol('energy')} <b>${formatGlow(run.flame)}<small> / ${formatGlow(getGlowCapacity(run))}</small></b></span></aside>
 <div class="treasure-offers ${preview?'':'support-offers'}">${offers.map((offer,i)=>treasureChoice(offer,i,run,preview)).join('')}</div>
 ${preview?`<footer class="treasure-route-actions"><button class="secondary" data-action="close-sheet">Back to route</button>${available?`<button class="primary" data-action="node" data-id="${esc(node.id)}">Visit chest →</button>`:''}</footer>`:practiceTools}</section>`;
}
