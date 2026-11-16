import {ARTIFACTS,getArtifactSalvageValue,canSellArtifact} from './model.mjs?v=early-play-2';
import {artifactDescription} from './artifact-copy.mjs?v=early-play-2';
import {artifactIcon} from './upgrade-icons.mjs?v=early-play-2';
import {resourceSymbol} from './game-symbols.mjs?v=early-play-2';
import {reliquaryBackdropMarkup,reliquaryNicheMarkup,furnaceGlyphMarkup} from './ui/reliquary-art.mjs?v=early-play-2';
import {relicIdentityMarkup,relicRulesMarkup,relicRulesButton} from './ui/relic-primitives.mjs?v=early-play-2';

export const COLLECTION_PAGE_SIZE=6;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function artifactControls(state,id,{canMelt,confirmMeltId}){
 const allowed=canMelt&&canSellArtifact(state,id);
 if(!allowed)return '<span class="collection-rest-hint">Melt artifacts at Rest.</span>';
 const amount=getArtifactSalvageValue(id);
 const meltLabel=`${furnaceGlyphMarkup()}<span>Melt</span><span class="collection-melt-value">${resourceSymbol('packed')} +${amount}</span>`;
 if(confirmMeltId!==id)return `<button class="collection-melt" data-action="sell-artifact" data-id="${id}">${meltLabel}</button>`;
 return `<div class="collection-inline-melt" role="group" aria-label="Confirm melt">
 <p>Remove this artifact and its remaining effect.</p>
 <div class="collection-melt-actions"><button class="secondary" data-action="cancel-artifact-melt">Keep</button><button class="collection-melt" data-action="confirm-artifact-forge" data-id="${id}">${meltLabel}</button></div>
 </div>`;
}

function selectedArtifactMarkup(state,id,{artifactArt,canMelt,confirmMeltId,discovered}){
 const artifact=ARTIFACTS[id],copy=artifactDescription(artifact,discovered?{}:state.run,{fresh:discovered});
 const confirming=confirmMeltId===id&&canMelt&&canSellArtifact(state,id);
 return `<section class="collection-selected ${confirming?'is-confirming':''}" aria-label="${esc(artifact.name)} details">
 ${relicIdentityMarkup(artifact,copy,{context:'collection',artifactArt:value=>reliquaryNicheMarkup()+artifactArt(value)})}
 ${relicRulesMarkup(copy,{context:'collection'})}
 <div class="collection-selected-action">${relicRulesButton(artifact,{action:'collection-artifact-details'})}${discovered?'':artifactControls(state,id,{canMelt,confirmMeltId})}</div>
 </section>`;
}

export function collectionMarkup(state,{artifactArt=artifactIcon,canMelt=false,page=0,selectedId=null,confirmMeltId=null,lastMelt=null,discovered=false}={}){
 const run=discovered?{}:state.run;
 const ids=[...new Set((discovered?Object.keys(ARTIFACTS):run?.artifacts)||[])].filter(id=>ARTIFACTS[id]);
 const pages=Math.max(1,Math.ceil(ids.length/COLLECTION_PAGE_SIZE));
 const current=Math.max(0,Math.min(pages-1,Math.floor(page)||0));
 const visible=ids.slice(current*COLLECTION_PAGE_SIZE,(current+1)*COLLECTION_PAGE_SIZE);
 const selected=visible.includes(selectedId)?selectedId:visible[0];
 const receipt=lastMelt?.amount>0?`<span class="collection-inline-receipt" role="status">${esc(lastMelt.name||ARTIFACTS[lastMelt.id]?.name||'Artifact')} melted · ${resourceSymbol('packed')} +${Math.floor(lastMelt.amount)}</span>`:'';
 return `<section class="artifact-collection collection-flat"><header><h2>${discovered?'Relic almanac':'Collection'}</h2>${receipt||`<span>${ids.length} ${discovered?'available':('automatic '+(ids.length===1?'effect':'effects'))}</span>`}</header>
 ${ids.length?`<div class="collection-workbench"><div class="collection-shelves"><div class="collection-shelf-scene">${reliquaryBackdropMarkup()}<nav class="artifact-collection-grid" aria-label="${discovered?'Available relics':'Owned artifacts'}">${visible.map(id=>{
  const artifact=ARTIFACTS[id],copy=artifactDescription(artifact,run);
  const uses=copy.lifetime.split(' · ')[0].replace(' automatic ',' ');
  return `<button class="collection-artifact ${artifact.rarity} ${id===selected?'is-selected':''}" data-action="inspect-artifact" data-id="${id}" aria-label="${esc(artifact.name)}. ${esc(copy.lifetime)}" aria-pressed="${id===selected}"><span class="collection-relic-object">${reliquaryNicheMarkup()}${artifactArt(id)}</span><b>${esc(artifact.name)}</b>${copy.type==='consumable'?`<small>${esc(uses)}</small>`:''}</button>`;
 }).join('')}</nav></div>${pages>1?`<nav class="collection-shelf-nav" aria-label="Collection shelves"><button data-action="collection-page" data-page="${current-1}" ${current===0?'disabled':''} aria-label="Previous artifacts">←</button><span>Shelf ${current+1}/${pages}</span><button data-action="collection-page" data-page="${current+1}" ${current===pages-1?'disabled':''} aria-label="Next artifacts">→</button></nav>`:''}</div>${selectedArtifactMarkup(state,selected,{artifactArt,canMelt,confirmMeltId,discovered})}</div>`:`<div class="collection-empty">${lastMelt?'Your collection is empty.':discovered?'All relics are available from your first expedition.':'Defeat an elite or guardian<br>to choose an artifact.'}</div>`}
 <footer><span>${discovered?'No discovery or ascension requirement.':'Effects work automatically.'}</span><button class="secondary" data-action="close-collection">Done</button></footer></section>`;
}

// Direct inspection uses the same workbench, including from a paused flight.
export function collectionItemMarkup(state,id,options={}){
 if(!ARTIFACTS[id]||!state.run?.artifacts?.includes(id))return '';
 const ids=[...new Set(state.run.artifacts)].filter(value=>ARTIFACTS[value]);
 return collectionMarkup(state,{...options,selectedId:id,page:Math.floor(ids.indexOf(id)/COLLECTION_PAGE_SIZE)});
}
