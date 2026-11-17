import {FLIGHT_PACTS} from './flight-pacts.mjs?v=clack-1';
import {getBiome} from './biomes.mjs?v=clack-1';
import {sparkHabitat} from './spark-fields.mjs?v=clack-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=clack-1';
import {landmarkCategory,guardianNames} from './map-landmarks.mjs?v=clack-1';
import {uiIcon} from './ui-icons.mjs?v=clack-1';
import {glowText} from './vitality.mjs?v=clack-1';
const stop=(kind,label,name,summary)=>Object.freeze({kind,label,name,summary,icon:kind});
export const MAP_STOP_TYPES=Object.freeze({
flight:stop('flight','FLIGHT','Flight','Flight length sets its Stored Sparks reward; overflow adds a bonus. Ordinary flights do not drop artifacts.'),
treasure:stop('treasure','TREASURE','Treasure','Inspect a chest to see its two offers. Taking one leaves the other behind.'),
rest:stop('rest','REST','Rest','Recover missing hearts or Grow Spark capacity. Both refill Sparks.'),
encounter:stop('encounter','ENCOUNTER','Encounter','A promise, route preparation or bargain. Preview the stakes before choosing.'),
boss:stop('boss','ELITE / GUARDIAN','Creature','Small creature: elite. Large head: guardian. Both offer two artifacts; choose one for your build.'),
});
export const EVENT_SCENARIOS=Object.freeze([
{id:'ash-spring',index:0,name:'Ash Spring',summary:'Bottle a reserve or take immediate flight support.',detail:'An empty meter makes a refill attractive. With a full Spark Meter the spring offers free Lifts instead. A Reserve Wick waits for Sparks to fall below 6.'},
{id:'cinder-bargain',index:1,name:'Night’s Ledger',summary:'Reduced Luminance for double packing, or leave freely.',detail:'Next attempt: 55% Luminance. On clear, double packing from that flight, up to 20 extra Stored Sparks. No bonus on failure.'},
{id:'pilgrim-vow',index:2,name:'Pilgrim’s Vow',summary:'Promise four body Spark pickups next attempt, or take light.',detail:'Clear the next attempt with four natural body Spark pickups to earn 8 Stored Sparks. Collector deliveries and Dreams do not count. Missing the vow has no extra penalty. Beyond the last Rest, take a flight preparation instead.'},
{id:'weathered-shrine',index:3,name:'Weathered Shrine',summary:'Prepare faster companion recovery or two free Lifts.',detail:'Both preparations are automatic and last for 3 cleared flights. Failures do not spend them.'},
{id:'surveyors-cairn',index:4,name:'Surveyor’s Cairn',summary:'Prepare one reachable passage, or take light and keep your fork open.',detail:'Mark a linked exit for gentler drafts or more Luminance on its first attempt. Where the path forks, marking one exit commits the route. With a full Spark Meter, you can take a Reserve Wick instead. Falling spends the preparation and reopens a fork.'},
{id:'ember-archive',index:5,name:'The Sparks Archive',summary:'Copy the ledger or spend its light to protect the run.',detail:'A missing heart can be restored. With full hearts, carry a Reserve Wick instead. Near the last guardian, a Star Chart can reveal the route ahead.'},
{id:'ember-dice',index:6,name:'Prism Dice',summary:'Choose a guaranteed reward or cast the prism once.',detail:'Each pair of faces has an equal chance. Check the three outcomes before rolling.'},
{id:'lost-lanterns',index:7,name:'The Closed Eye',summary:'Brave deep darkness for triple packing, or leave freely.',detail:FLIGHT_PACTS['blind-pilgrim'].description},
{id:'wisp-bargain',index:8,name:'The Silent Orbit',summary:'Shorten Collector reach for double packing, or leave freely.',detail:'Next attempt: Collector reach −45%. On clear, double packing from that flight, up to 20 extra Stored Sparks. Body pickups keep full value.'},
{id:'sanctuary',index:9,name:'Quiet Sanctuary',summary:'Restore a missing heart or prepare the companion.',detail:'At full hearts, the sanctuary offers fuel or free Lifts instead.'},
{id:'workshop',index:10,name:'Lantern Workshop',summary:'Unweave a paid branch or glide with free Lifts.',detail:'If there is no useful refund, the workshop offers a Star Chart instead.'},
{id:'companion-shrine',index:11,name:'Companion Shrine',summary:'Tune your companion or salvage its tuning fork.',detail:'Choose faster companion recovery or Stored Sparks for skills.'},
].map(Object.freeze));
export function getEventScenarios(){return EVENT_SCENARIOS.map(entry=>({...entry}));}
function kindOf(value){
 if(typeof value==='string'){
  if(value==='camp')return'rest';if(value==='treasure')return'treasure';if(value==='elite')return'flight';
  if(value==='shrine'||value==='event'||value==='support')return'encounter';
  if(value==='finale'||value==='exit')return'flight';
  return Object.hasOwn(MAP_STOP_TYPES,value)?value:'flight';
 }
 const n=value||{};
 if(n.boss||n.kind==='boss'||n.type==='boss')return'boss';
 if(n.kind==='treasure')return'treasure';
 if(n.kind==='camp'||n.kind==='rest'||n.type==='camp')return'rest';
 if(n.kind==='shrine'||n.kind==='event'||n.type==='support')return'encounter';
 return 'flight';
}
export function getMapStopInfo(node={},maxGlow=100){
 const kind=kindOf(node),base=MAP_STOP_TYPES[kind],elite=node.elite===true||node.kind==='elite';
 if(node.practiceLoan)return {...base,name:node.name,summary:'Borrow Proximity rank 1 for a revealing Surface Pulse. The loan stays in practice.',detail:'One practice loan. Your campaign build stays safe.',eventIndex:null,scenarioId:null};
 if(node.tutorialLesson==='guardian')return {...base,label:'GUARDIAN',name:'Hollow Warden',summary:'Read the warned stone hands. A wide opening and unlimited retries teach the guardian.',detail:'Reach the waylight to finish First Light. Practice resources stay here.',eventIndex:null,scenarioId:null};
 const event=kind==='encounter'&&node.kind!=='shrine'&&Number.isInteger(node.eventIndex)?getEventScenarios({...node,maxGlow})[node.eventIndex]:null;
 const exit=kind==='flight'&&(node.type==='finale'||node.kind==='finale'),guardian=guardianNames[node.bossId]||node.name||'Guardian';
 if(kind==='treasure')return {...base,name:node.name||base.name,summary:node.rewardPreview||base.summary,detail:node.description||base.summary,eventIndex:null,scenarioId:null};
 const summary=kind==='boss'?(node.mapIndex>=2?`Pass ${guardian} and complete the Ascension.`:`Pass ${guardian} and choose one of two artifacts.`):elite?`Face an elite creature for ${getFlightClearReward(node)} Stored Sparks and two artifact choices.`:event?.summary||(node.kind==='shrine'?'Choose faster companion recovery or two free Lifts, for 3 cleared flights.':exit?`Clear this passage for ${getFlightClearReward(node)} Stored Sparks and continue to the next map.`:base.summary);
 const detail=kind==='boss'?(node.mapIndex>=2?'Reach the waylight to complete the Ascension.':`A guardian ends this map: ${getFlightClearReward(node)} Stored Sparks and one of two run artifacts.`):elite?'Choose one automatic artifact. Both offers retire from this run; melting is available later at Rest.':event?.detail||summary;
 return{...base,label:kind==='boss'?'GUARDIAN':elite?'ELITE':exit?'EXIT':base.label,name:kind==='boss'?guardian:event?.name||(node.type==='support'?node.name:node.locationName||node.name)||base.name,summary:event?summary:glowText(summary,maxGlow),detail:event?detail:glowText(detail,maxGlow),eventIndex:event?.index??null,scenarioId:event?.id||null};
}
// Stop icons are the approved v2.0-icons set (ui-icons.mjs). Elite and Guardian share the boss family but keep their own drawings.
const STOP_ICON={flight:'stop-flight',rest:'stop-rest',encounter:'stop-encounter',treasure:'stop-chest',boss:'stop-boss',elite:'stop-elite'};
export const MAP_STOP_ICON_NAMES=Object.freeze([...Object.values(STOP_ICON),'stop-workshop','stop-unknown']);
/** Map stop icon (24-grid art): 48 px by default, ask for 24, 72, 96... through size. The Lantern Workshop encounter has its own icon. */
export function mapStopIconMarkup(kindOrNode,{size=48}={}){
 const artCategory=landmarkCategory(kindOrNode),category=artCategory==='elite'?'boss':artCategory;
 const workshop=artCategory==='encounter'&&typeof kindOrNode==='object'&&(kindOrNode?.scenarioId==='workshop'||kindOrNode?.eventIndex===10);
 const name=workshop?'stop-workshop':STOP_ICON[artCategory]||'stop-flight';
 return uiIcon(name,{size,className:`map-stop-icon map-symbol-${artCategory}`}).replace('<svg ',`<svg data-map-category="${category}" `);
}

/** Only the currently linked route is disclosed, from the same biome data as play. */
export function mapBiomeGuideMarkup(run){
 if(!run?.map?.length)return '';
 const all=run.map.flat(),previous=(run.path||[]).map(id=>all.find(n=>n.id===id)).filter(n=>n&&n.row<run.step).at(-1);
 const linked=run.map[run.step]||[],ids=previous?.nextIds;
 const priorElite=(run.path||[]).map(id=>all.find(n=>n.id===id)).filter(n=>n&&n.row<run.step&&n.type!=='support').at(-1)?.elite===true;
 const biomes=[...new Map(linked.filter(n=>n.type!=='support'&&(!ids||ids.includes(n.id))&&!(priorElite&&n.elite)).map(n=>getBiome(n)).filter(Boolean).map(b=>[b.id,b])).values()];
 if(!biomes.length)return '';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const mixes={filament:'More small Sparks.',cluster:'More Clusters.',vault:'More Caches.',mineral:'More dense Caches.'};
 return `<details class="map-event-guide map-biome-guide"><summary>Biomes &amp; pickups</summary>${biomes.map(b=>`<p><b>${esc(b.name)}</b> · ${esc(b.interactionHint)} ${mixes[sparkHabitat(b.id)]||''}</p>`).join('')}</details>`;
}
