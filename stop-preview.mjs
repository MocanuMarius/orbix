import {getMapStopInfo,mapStopIconMarkup} from './map-guide.mjs?v=eaten-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** The open-book page for a non-flight stop (Rest, Scribe, event): what it is and what it gives. The reward line is the node's rewardPreview. */
export function stopPreviewMarkup(run,node,{available=false}={}){
 const info=getMapStopInfo(node),offer=node.rewardPreview||node.reward||'Choose a site benefit';
 return `<section class="route-inspection"><div class="route-inspection-art">${mapStopIconMarkup(node)}</div>
  <div class="route-inspection-copy"><small>${available?'REACHABLE NOW':'ROUTE PREVIEW'}</small><h2>${esc(node.name)}</h2>
   <p>${esc(info.summary)}</p><p class="route-inspection-reward">${esc(offer)}</p>
  </div><footer><button class="secondary" data-action="close-sheet">Back</button>
  ${available?`<button class="primary" data-action="node" data-id="${esc(node.id)}">Travel</button>`:'<span>Follow the connected path</span>'}</footer></section>`;
}
