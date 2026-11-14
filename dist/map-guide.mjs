import {landmarkArt,landmarkCategory,guardianNames} from './map-landmarks.mjs?v=ribbon-luminance-1';
import {glowText} from './vitality.mjs?v=ribbon-luminance-1';
const stop=(kind,label,name,summary)=>Object.freeze({kind,label,name,summary,icon:kind});
export const MAP_STOP_TYPES=Object.freeze({
flight:stop('flight','FLIGHT','Flight','Clear a passage for 20 Stored Sparks plus overflow. Ordinary flights do not drop artifacts.'),
treasure:stop('treasure','TREASURE','Treasure','Inspect a chest to see its two offers. Taking one leaves the other behind.'),
rest:stop('rest','REST','Rest','Recover missing hearts or Grow Spark capacity. Both refill Sparks.'),
encounter:stop('encounter','ENCOUNTER','Encounter','A promise, route preparation or bargain. Preview the stakes before choosing.'),
boss:stop('boss','ELITE / GUARDIAN','Creature','Small creature: elite. Large head: guardian. Both offer two artifacts; choose one for your build.'),
});
export const EVENT_SCENARIOS=Object.freeze([
{id:'ash-spring',index:0,name:'Ash Spring',summary:'Bottle a reserve or take immediate flight support.',detail:'An empty meter makes a refill attractive. With a full Spark Meter the spring offers free Lifts instead. A Reserve Wick waits for Sparks to fall below 6.'},
{id:'cinder-bargain',index:1,name:'Cinder Bargain',summary:'Trade fuel for upgrade currency, or stay ready for the road.',detail:'Selling a coal keeps at least 3 Sparks. When trading is not useful, the bargain changes.'},
{id:'pilgrim-vow',index:2,name:'Pilgrim’s Vow',summary:'Promise four body Spark pickups next attempt, or take light now.',detail:'Clear the next attempt with four natural body Spark pickups to earn 8 Stored Sparks. Collector deliveries and Dreams do not count. Missing the vow has no extra penalty. Beyond the last Rest, take a flight preparation instead.'},
{id:'weathered-shrine',index:3,name:'Weathered Shrine',summary:'Prepare faster companion recovery or two free Lifts.',detail:'Both preparations are automatic and last for the next attempt.'},
{id:'surveyors-cairn',index:4,name:'Surveyor’s Cairn',summary:'Prepare one reachable passage, or take light and keep your fork open.',detail:'Mark a linked exit for gentler drafts or more Luminance on its first attempt. Where the path forks, marking one exit commits the route. With a full Spark Meter, you can take a Reserve Wick instead. Falling spends the preparation and reopens a fork.'},
{id:'ember-archive',index:5,name:'The Sparks Archive',summary:'Copy the ledger or spend its light to protect the run.',detail:'A missing heart can be restored. With full hearts, carry a Reserve Wick instead. Near the last guardian, a Star Chart can reveal the route ahead.'},
{id:'ember-dice',index:6,name:'Prism Dice',summary:'Choose a guaranteed reward or cast the prism once.',detail:'Each pair of faces has an equal chance. Check the three outcomes before rolling.'},
{id:'lost-lanterns',index:7,name:'Lost Lanterns',summary:'Choose immediate fuel or longer sight.',detail:'If the meter is nearly full, a Reserve Wick replaces the refill.'},
{id:'wisp-bargain',index:8,name:'Wisp Bargain',summary:'Carry a heavy purse or take two free Lifts.',detail:'The seal pays up front, but your first six paid Lifts cost extra on the next attempt.'},
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
 const event=kind==='encounter'&&node.kind!=='shrine'&&Number.isInteger(node.eventIndex)?getEventScenarios({...node,maxGlow})[node.eventIndex]:null;
 const exit=kind==='flight'&&(node.type==='finale'||node.kind==='finale'),guardian=guardianNames[node.bossId]||node.name||'Guardian';
 if(kind==='treasure')return {...base,name:node.name||base.name,summary:node.rewardPreview||base.summary,detail:node.description||base.summary,eventIndex:null,scenarioId:null};
 const summary=kind==='boss'?(node.mapIndex>=2?`Pass ${guardian} and complete the Ascension.`:`Pass ${guardian} and choose one of two artifacts.`):elite?'Face an elite creature for 20 Stored Sparks and two artifact choices.':event?.summary||(node.kind==='shrine'?'Choose faster companion recovery or two free Lifts for your next attempt.':exit?'Clear this passage for 20 Stored Sparks and continue to the next map.':base.summary);
 const detail=kind==='boss'?(node.mapIndex>=2?'Reach the waylight to complete the Ascension.':'A guardian ends this map: 20 Stored Sparks and one of two run artifacts.'):elite?'Choose one automatic artifact. Both offers retire from this run; melting is available later at Rest.':event?.detail||summary;
 return{...base,label:kind==='boss'?'GUARDIAN':elite?'ELITE':exit?'EXIT':base.label,name:kind==='boss'?guardian:event?.name||(node.type==='support'?node.name:node.locationName||node.name)||base.name,summary:event?summary:glowText(summary,maxGlow),detail:event?detail:glowText(detail,maxGlow),eventIndex:event?.index??null,scenarioId:event?.id||null};
}
const colors={dark:'#10231e',body:'#80917c',face:'#c0c7a3',fire:'#efd59a',glint:'#fff4cf',edge:'#d3d6b0',rune:'#e4d6a9'};
export function mapStopIconMarkup(kindOrNode){
 const artCategory=landmarkCategory(kindOrNode),category=artCategory==='elite'?'boss':artCategory;
 const art=landmarkArt(kindOrNode).replace(/class="landmark-(\w+)"/g,(_,part)=>part==='edge'||part==='rune'?`fill="none" stroke="${colors[part]}" stroke-width="1.8"`:`fill="${colors[part]||colors.body}" stroke="none"`);
 return `<svg class="map-stop-icon map-symbol-${artCategory}" data-map-category="${category}" viewBox="-42 -39 84 78" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${art}</svg>`;
}
