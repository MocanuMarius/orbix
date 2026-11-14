import {ARTIFACTS,getArtifactSalvageValue,canSellArtifact} from './model.mjs?v=lantern-passages-1';
import {artifactDescription,effectMarkup} from './artifact-copy.mjs?v=lantern-passages-1';
import {artifactIcon} from './upgrade-icons.mjs?v=lantern-passages-1';
import {artifactRarityLabel} from './replay-ui.mjs?v=lantern-passages-1';
import {resourceSymbol} from './game-symbols.mjs?v=lantern-passages-1';

export const COLLECTION_PAGE_SIZE=6;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function artifactControls(state,id,{canMelt,confirmMeltId}){
 const allowed=canMelt&&canSellArtifact(state,id);
 if(!allowed)return '<span class="collection-rest-hint">Melt artifacts at Rest.</span>';
 const amount=getArtifactSalvageValue(id);
 if(confirmMeltId!==id)return `<button class="collection-melt" data-action="sell-artifact" data-id="${id}">Melt ${resourceSymbol('packed')} +${amount}</button>`;
 return `<div class="collection-inline-melt" role="group" aria-label="Confirm melt">
 <p>Remove this artifact and its remaining effect.</p>
 <div class="collection-melt-actions"><button class="secondary" data-action="cancel-artifact-melt">Keep</button><button class="collection-melt" data-action="confirm-artifact-forge" data-id="${id}">Melt ${resourceSymbol('packed')} +${amount}</button></div>
 </div>`;
}

function selectedArtifactMarkup(state,id,{artifactArt,canMelt,confirmMeltId,discovered}){
 const artifact=ARTIFACTS[id],copy=artifactDescription(artifact,discovered?{}:state.run,{fresh:discovered});
 const confirming=confirmMeltId===id&&canMelt&&canSellArtifact(state,id);
 return `<section class="collection-selected ${confirming?'is-confirming':''}" aria-label="${esc(artifact.name)} details">
 <header><div class="collection-inspection-art ${artifact.rarity}">${artifactArt(id)}</div><div><small>${artifactRarityLabel(artifact)}</small><h3>${esc(artifact.name)}</h3><span>${esc(copy.lifetime)}</span></div></header>
 <div class="collection-selected-rule">${copy.trigger?`<p>${esc(copy.trigger)}</p>`:''}<strong>${effectMarkup(copy.effect)}</strong>${copy.limit?`<p class="collection-selected-limit">${esc(copy.limit)}</p>`:''}</div>
 <div class="collection-selected-action">${discovered?'':artifactControls(state,id,{canMelt,confirmMeltId})}</div>
 </section>`;
}

export function collectionMarkup(state,{artifactArt=artifactIcon,canMelt=false,page=0,selectedId=null,confirmMeltId=null,lastMelt=null,discovered=false}={}){
 const run=discovered?{}:state.run;
 const ids=[...new Set((discovered?state.profile?.ownedArtifacts:run?.artifacts)||[])].filter(id=>ARTIFACTS[id]);
 const pages=Math.max(1,Math.ceil(ids.length/COLLECTION_PAGE_SIZE));
 const current=Math.max(0,Math.min(pages-1,Math.floor(page)||0));
 const visible=ids.slice(current*COLLECTION_PAGE_SIZE,(current+1)*COLLECTION_PAGE_SIZE);
 const selected=visible.includes(selectedId)?selectedId:visible[0];
 const receipt=lastMelt?.amount>0?`<span class="collection-inline-receipt" role="status">${esc(lastMelt.name||ARTIFACTS[lastMelt.id]?.name||'Artifact')} melted · ${resourceSymbol('packed')} +${Math.floor(lastMelt.amount)}</span>`:'';
 return `<section class="artifact-collection collection-flat"><header><h2>${discovered?'Relic discoveries':'Collection'}</h2>${receipt||`<span>${ids.length} ${discovered?'discovered':('automatic '+(ids.length===1?'effect':'effects'))}</span>`}</header>
 ${ids.length?`<div class="collection-workbench"><nav class="artifact-collection-grid" aria-label="Owned artifacts">${visible.map(id=>{
  const artifact=ARTIFACTS[id],copy=artifactDescription(artifact,run);
  return `<button class="collection-artifact ${artifact.rarity} ${id===selected?'is-selected':''}" data-action="inspect-artifact" data-id="${id}" aria-label="${esc(artifact.name)}. ${esc(copy.lifetime)}" aria-pressed="${id===selected}">${artifactArt(id)}<b>${esc(artifact.name)}</b>${copy.type==='consumable'?`<small>${esc(copy.lifetime.split(' · ')[0])}</small>`:''}</button>`;
 }).join('')}</nav>${selectedArtifactMarkup(state,selected,{artifactArt,canMelt,confirmMeltId,discovered})}</div>`:`<div class="collection-empty">${lastMelt?'Your collection is empty.':discovered?'Defeat the third guardian to discover a relic.':'Defeat an elite or guardian<br>to choose an artifact.'}</div>`}
 <footer><span>${discovered?'Recorded across runs.':'Effects work automatically.'}</span>${pages>1?`<nav aria-label="Collection pages"><button data-action="collection-page" data-page="${current-1}" ${current===0?'disabled':''} aria-label="Previous artifacts">←</button><span>${current+1}/${pages}</span><button data-action="collection-page" data-page="${current+1}" ${current===pages-1?'disabled':''} aria-label="Next artifacts">→</button></nav>`:''}<button class="secondary" data-action="close-collection">Done</button></footer></section>`;
}

// Direct inspection uses the same workbench, including from a paused flight.
export function collectionItemMarkup(state,id,options={}){
 if(!ARTIFACTS[id]||!state.run?.artifacts?.includes(id))return '';
 const ids=[...new Set(state.run.artifacts)].filter(value=>ARTIFACTS[value]);
 return collectionMarkup(state,{...options,selectedId:id,page:Math.floor(ids.indexOf(id)/COLLECTION_PAGE_SIZE)});
}
