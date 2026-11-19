import {ARTIFACTS,getArtifactSalvageValue,canSellArtifact} from './model.mjs?v=skim-1';
import {artifactDescription} from './artifact-copy.mjs?v=skim-1';
import {artifactIcon} from './upgrade-icons.mjs?v=skim-1';
import {resourceSymbol} from './game-symbols.mjs?v=skim-1';
import {reliquaryBackdropMarkup,reliquaryNicheMarkup} from './ui/reliquary-art.mjs?v=skim-1';
import {relicIdentityMarkup,relicRulesMarkup,relicRulesButton} from './ui/relic-primitives.mjs?v=skim-1';

export const COLLECTION_PAGE_SIZE=6;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Role colours follow the kit (v2.5-theme): Melt is a quiet slip until the player confirms, then wine
// (it cannot be undone); Keep steps back; Full rules opens something, so it is leather.
function artifactControls(state,id,{canMelt,confirmMeltId}){
 const allowed=canMelt&&canSellArtifact(state,id);
 if(!allowed)return '<span class="collection-rest-hint">Melt artifacts at Rest.</span>';
 const amount=getArtifactSalvageValue(id);
 const meltLabel=`<span class="wb-sign-text"><b>Melt <span class="collection-melt-value">${resourceSymbol('packed')}+${amount}</span></b></span>`;
 if(confirmMeltId!==id)return `<button type="button" class="wb-sign wb-sign-quiet collection-melt" data-action="sell-artifact" data-id="${id}">${meltLabel}</button>`;
 return `<div class="collection-inline-melt" role="group" aria-label="Confirm melt">
 <p>Remove this artifact and its remaining effect.</p>
 <div class="collection-melt-actions"><button type="button" class="wb-sign wb-sign-quiet" data-action="cancel-artifact-melt"><span class="wb-sign-text"><b>Keep</b></span></button><button type="button" class="wb-sign wb-sign-danger collection-melt" data-action="confirm-artifact-forge" data-id="${id}">${meltLabel}</button></div>
 </div>`;
}

function selectedArtifactMarkup(state,id,{artifactArt,canMelt,confirmMeltId,discovered}){
 const artifact=ARTIFACTS[id],copy=artifactDescription(artifact,discovered?{}:state.run,{fresh:discovered});
 const confirming=confirmMeltId===id&&canMelt&&canSellArtifact(state,id);
 return `<section class="collection-selected ${confirming?'is-confirming':''}" aria-label="${esc(artifact.name)} details">
 ${relicIdentityMarkup(artifact,copy,{context:'collection',artifactArt:value=>reliquaryNicheMarkup()+artifactArt(value)})}
 ${relicRulesMarkup(copy,{context:'collection'})}
 <div class="collection-selected-action">${relicRulesButton(artifact,{action:'collection-artifact-details',sign:true})}${discovered?'':artifactControls(state,id,{canMelt,confirmMeltId})}</div>
 </section>`;
}

/** The Collection sheet: Done top left (as on the Deck), one title, the shelf pager at the right of the
 *  header, the shelves on the left of the page and the selected relic on the right. */
export function collectionMarkup(state,{artifactArt=artifactIcon,canMelt=false,page=0,selectedId=null,confirmMeltId=null,lastMelt=null,discovered=false}={}){
 const run=discovered?{}:state.run;
 const ids=[...new Set((discovered?Object.keys(ARTIFACTS):run?.artifacts)||[])].filter(id=>ARTIFACTS[id]);
 const pages=Math.max(1,Math.ceil(ids.length/COLLECTION_PAGE_SIZE));
 const current=Math.max(0,Math.min(pages-1,Math.floor(page)||0));
 const visible=ids.slice(current*COLLECTION_PAGE_SIZE,(current+1)*COLLECTION_PAGE_SIZE);
 const selected=visible.includes(selectedId)?selectedId:visible[0];
 const receipt=lastMelt?.amount>0?`<span class="collection-inline-receipt" role="status">${esc(lastMelt.name||ARTIFACTS[lastMelt.id]?.name||'Artifact')} melted · ${resourceSymbol('packed')} +${Math.floor(lastMelt.amount)}</span>`:'';
 const count=discovered?`${ids.length} available · no unlocks needed`:`${ids.length} ${ids.length===1?'relic':'relics'} · all automatic`;
 const pager=pages>1?`<nav class="collection-shelf-nav" aria-label="Collection shelves"><button type="button" class="wb-sign wb-sign-quiet" data-action="collection-page" data-page="${current-1}" ${current===0?'disabled':''} aria-label="Previous artifacts"><span class="wb-sign-text"><b>Prev</b></span></button><span>Shelf ${current+1}/${pages}</span><button type="button" class="wb-sign wb-sign-quiet" data-action="collection-page" data-page="${current+1}" ${current===pages-1?'disabled':''} aria-label="Next artifacts"><span class="wb-sign-text"><b>Next</b></span></button></nav>`:'';
 const empty=lastMelt?'Your collection is empty.':discovered?'All relics are available from your first expedition.':'Defeat an elite or guardian<br>to choose an artifact.';
 const body=ids.length?`<div class="collection-workbench"><div class="collection-shelves"><div class="collection-shelf-scene">${reliquaryBackdropMarkup()}<nav class="artifact-collection-grid" aria-label="${discovered?'Available relics':'Owned artifacts'}">${visible.map(id=>{
  const artifact=ARTIFACTS[id],copy=artifactDescription(artifact,run);
  const uses=copy.lifetime.split(' · ')[0].replace(' automatic ',' ');
  return `<button class="collection-artifact ${artifact.rarity} ${id===selected?'is-selected':''}" data-action="inspect-artifact" data-id="${id}" aria-label="${esc(artifact.name)}. ${esc(copy.lifetime)}" aria-pressed="${id===selected}"><span class="collection-relic-object">${reliquaryNicheMarkup()}${artifactArt(id)}</span><b>${esc(artifact.name)}</b>${copy.type==='consumable'?`<small>${esc(uses)}</small>`:''}</button>`;
 }).join('')}</nav></div></div>${selectedArtifactMarkup(state,selected,{artifactArt,canMelt,confirmMeltId,discovered})}</div>`:`<div class="collection-empty">${empty}</div>`;
 return `<div class="co wb-reskin wb-ground wb-t2 wb-go" id="co-root"><div class="wb-world" aria-hidden="true"></div>
 <section class="wb-page artifact-collection collection-flat co-sheet"><div class="wb-pagelight" aria-hidden="true"></div>
 <header class="co-head"><button type="button" class="wb-sign wb-sign-quiet co-done" data-action="close-collection"><span class="wb-sign-text"><b>Done</b></span></button>
 <div class="co-titles"><h2 class="wb-title">Collection</h2><span class="wb-context">${receipt||esc(count)}</span></div>${pager}</header>
 ${body}</section></div>`;
}

// Direct inspection uses the same workbench, including from a paused flight.
export function collectionItemMarkup(state,id,options={}){
 if(!ARTIFACTS[id]||!state.run?.artifacts?.includes(id))return '';
 const ids=[...new Set(state.run.artifacts)].filter(value=>ARTIFACTS[value]);
 return collectionMarkup(state,{...options,selectedId:id,page:Math.floor(ids.indexOf(id)/COLLECTION_PAGE_SIZE)});
}
