import {ARTIFACTS,getArtifactCapacity,getFlightRewardMeltValue} from './model.mjs?v=clear-rewards-1';
import {getArtifactStackPreview} from './artifact-info.mjs?v=clear-rewards-1';
import {artifactRarityLabel} from './replay-ui.mjs?v=clear-rewards-1';
import {artifactDescription} from './artifact-copy.mjs?v=clear-rewards-1';
import {resourceSymbol} from './game-symbols.mjs?v=clear-rewards-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rewardDescription=(a,run)=>{const c=artifactDescription(a,run,{fresh:true});return [c.effect,[c.trigger,c.limit].filter(Boolean).join(' ')];};
function loadoutMarkup(run,artifactArt,chosen){
 const capacity=getArtifactCapacity(run);
 return `<div class="reward-loadout" aria-label="Equipped artifacts">${Array.from({length:capacity},(_,slot)=>{
 const id=run.artifacts?.[slot],a=ARTIFACTS[id];
 return `<button class="reward-equipped-slot ${a?'filled':''} ${id===chosen?'newly-equipped':''}" data-reward-slot="${slot}" ${a?`data-action="inspect-artifact" data-id="${id}"`:'disabled'} aria-label="${a?`Inspect equipped ${esc(a.name)}`:'Empty artifact slot'}">${a?artifactArt(id):'<span aria-hidden="true">+</span>'}</button>`;
 }).join('')}</div>`;
}
export function flightRewardMarkup(state,{artifactArt,selectedArtifact,upgradeCount=0,skillsAvailable=true}={}){
 const r=state.run,reward=r.flightReward,open=!!reward&&!reward.claimed;
 const id=!open&&ARTIFACTS[reward?.chosen]?reward.chosen:reward?.evolution&&reward.offers.includes(selectedArtifact)?selectedArtifact:reward?.offers?.[0];
 const a=ARTIFACTS[id],copy=a?artifactDescription(a,r,{fresh:open}):null;
 const melt=getFlightRewardMeltValue(reward),stack=a&&!reward?.permanent&&getArtifactStackPreview(r,id);
 const full=(r.artifacts||[]).filter(Boolean).length>=getArtifactCapacity(r),capacity=getArtifactCapacity(r);
 const canEquip=!!a&&(reward.permanent||reward.evolution||capacity>0)&&!stack?.autoForge;
 const flightIncome=reward?.source==='flight'&&!reward.evolution&&!reward.permanent;
 const clear=flightIncome?Number(r.lastFlight?.completionBonus)||0:0,overflow=flightIncome?Number(r.lastFlight?.pickupCondensedGlow)||0:0,earned=clear+overflow;
 const title=reward?.evolution?'A seed awakens':reward?.permanent?'Guardian defeated':reward?.source==='treasure'?'Treasure found':'Passage cleared';
 const melted=reward?.chosen==='melt'||reward?.autoForged;
 const equipLabel=reward?.evolution?'Evolve':reward?.permanent?'Claim relic':stack?.autoForge?'Stack full':full&&!stack?'Equip & replace':'Equip';
 const status=open?reward?.permanent?''
  :stack?.autoForge?'Three copies held · melt this extra copy.':stack?`Adds ${stack.added} uses to the same artifact.`:''
  :melted?`+${reward.meltedAmount||0} Packed Sparks`:reward?.collectionComplete?'Collection complete':reward?.evolution?'Evolved':reward?.permanent?(r.testMode?'TEST relic claimed':'Added to your collection'):'Equipped';
 return `<section class="artifact-reward-screen ${open?'reward-open':'reward-resolved'} ${melted?'reward-melted':''} ${reward?.evolution?'reward-evolution':''}">
  <header class="artifact-reward-heading"><h1>${esc(title)}</h1>${earned>0?`<span class="reward-packed-earned" aria-label="${earned} Packed Sparks earned: ${clear} for clearing, ${overflow} from overflow">${resourceSymbol('packed')}<b>+${earned}</b><span class="reward-earnings-notes">${clear?`<i>${overflow?`${clear} clear`:'Clear reward'}</i>`:''}${overflow?`<i>${overflow} overflow</i>`:''}</span></span>`:''}</header>
  <article class="single-artifact ${esc(a?.rarity||'common')}" aria-label="Artifact reward${a?`: ${esc(a.name)}`:''}">
   <div class="reward-art-column"><div class="reward-trophy">${melted?resourceSymbol('packed'):a?artifactArt(id):resourceSymbol('packed')}${a?`<span>${artifactRarityLabel(a)}</span>`:''}</div>${!reward?.permanent?loadoutMarkup(r,artifactArt,!open&&!melted?reward.chosen:null):''}</div>
   <div class="reward-copy"><div class="reward-identity"><h2>${esc(a?.name||'Collection complete')}</h2>${copy?`<span>${esc(reward?.permanent?(r.testMode?'TEST · collection unchanged':'Permanent · for future runs'):copy.lifetime)}</span>`:''}${!open&&status?`<b class="reward-state" role="status">${!melted?'✓ ':''}${esc(status)}</b>`:''}</div>
    ${copy?.trigger?`<p class="reward-trigger">${esc(copy.trigger)}</p>`:''}
    ${copy?`<p class="reward-effect-sentence">${esc(copy.effect)}</p><p class="reward-condition">${esc(copy.limit)}</p>`:''}
    ${open&&status?`<p class="reward-status" role="status">${esc(status)}</p>`:''}
   </div>
  </article>
  <footer class="artifact-reward-actions">${open?`
   ${reward.evolution?`<nav class="evolution-forms" aria-label="Choose an evolution">${reward.offers.map(form=>`<button data-action="reward-form" data-id="${form}" aria-pressed="${id===form}">${form==='hearth-bloom'?'Restore':'Reveal'}</button>`).join('')}</nav>`:''}
   <button class="primary reward-equip" data-action="keep-flight-reward" data-id="${id}" ${canEquip?'':'disabled'}>${resourceSymbol('up')}<span>${esc(equipLabel)}</span></button>
   ${melt>0?`<span class="reward-action-or">or</span><button class="reward-melt" data-action="melt-flight-reward" aria-label="Melt ${esc(a?.name)} for ${melt} Packed Sparks"><svg class="melt-art" viewBox="0 0 32 24" shape-rendering="crispEdges" aria-hidden="true"><path d="M3 2h12v9H3z" fill="#7d8277"/><path d="M5 3h2v5H5zM12 6h3v4h-3zM6 12h2v3H6zM13 11h3v3h-3z" fill="#e9c18d"/><path d="M21 13h8v8h-8z" fill="#9da876"/><path d="M23 15h4v4h-4z" fill="#f3efb9"/><path d="M16 16h4v2h-4zM18 14h2v6h-2z" fill="#cfa87c"/></svg><span>Melt</span><b>+${melt}</b>${resourceSymbol('packed')}</button>`:''}`:
   `${skillsAvailable&&!reward?.permanent&&!reward?.evolution?`<button class="secondary ${upgradeCount?'upgrade-ready':''}" data-action="skills">${resourceSymbol('packed')}<span>${upgradeCount?'Upgrade':'Skills'}</span></button>`:''}<button class="primary" data-action="victory-next">${reward?.evolution?'Next reward':'Continue'} <span aria-hidden="true">→</span></button>`}
  </footer>
 </section>`;
}
