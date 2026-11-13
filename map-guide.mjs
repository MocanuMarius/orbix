import {landmarks} from './map-landmarks.mjs?v=clear-paths-1';
import {glowText} from './vitality.mjs?v=clear-paths-1';
const stop=(kind,label,name,summary)=>Object.freeze({kind,label,name,summary,icon:kind});
export const MAP_STOP_TYPES=Object.freeze({
flight:stop('flight','FLIGHT','Flight','Fly a passage, choose a relic or dissolve it into Sparks, and recover fuel.'),
treasure:stop('treasure','TREASURE','Treasure','Mount an artifact, replace one, or dissolve it into Sparks. Surplus condenses.'),
rest:stop('rest','REST','Rest','Recover Sparks or refill hearts. Prepare skills, companions, a Dream or forge an artifact into Packed Light.'),
encounter:stop('encounter','ENCOUNTER','Encounter','A promise, route preparation or bargain. Preview the stakes before choosing.'),
boss:stop('boss','BOSS','Boss','Face the guardian at the end of the third map.'),
});
export const EVENT_SCENARIOS=Object.freeze([
{id:'ash-spring',index:0,name:'Ash Spring',summary:'Trade Packed Light for a refill, or collect a smaller light offering.',detail:'A full refill spends upgrade currency. A finite offering fills Sparks first and condenses its surplus.'},
{id:'cinder-bargain',index:1,name:'Cinder Bargain',summary:'Trade some fuel for an artifact, or take a safe light offering.',detail:'Preview the Sparks cost and the actual fuel/condensed split before accepting.'},
{id:'pilgrim-vow',index:2,name:'Pilgrim’s Vow',summary:'Promise four body Spark pickups next attempt, or take light now.',detail:'Clear the next attempt with four natural body Spark pickups to earn 8 Packed Light. Collector deliveries and Dreams do not count. Missing the vow has no extra penalty.'},
{id:'weathered-shrine',index:3,name:'Weathered Shrine',summary:'Buy a discounted skill or collect a light offering.',detail:'The offered skill spends Packed Light. This shrine does not provide full Rest services.'},
{id:'surveyors-cairn',index:4,name:'Surveyor’s Cairn',summary:'Prepare one reachable passage, or take light and keep your fork open.',detail:'Mark a linked exit for gentler drafts or more Luminance on its first attempt. That commits your route. Falling consumes the preparation and reopens the fork.'},
{id:'ember-archive',index:5,name:'The Sparks Archive',summary:'Forge an artifact into Packed Light, or keep your build and accept a light offering.',detail:'Forging consumes the chosen artifact for a fixed Packed Light payout. Spend it on run skills; Sparks and hearts stay unchanged.'},
{id:'ember-dice',index:6,name:'Prism Dice',summary:'Take a certain light offering, or spend Packed Light on one roll.',detail:'Three equally likely offerings. One cast; the result stays fixed if you return.'},
{id:'lost-lanterns',index:7,name:'Lost Lanterns',summary:'Choose recovery, a light offering, or sacrifice fuel for an artifact.',detail:'Each lantern trades immediate fuel, future upgrades or a changed build.'},
{id:'wisp-bargain',index:8,name:'Wisp Bargain',summary:'Take a larger offering with a Lift burden, or travel lightly.',detail:'The burden raises Lift effort for only the next flight. Preview each offering’s fuel and condensed value.'},
{id:'sanctuary',index:9,name:'Quiet Sanctuary',summary:'Choose fuel, a missing heart, or faster companion recovery.',detail:'The blessing improves companion recovery for your next flight.'},
{id:'workshop',index:10,name:'Lantern Workshop',summary:'Refund a main skill branch, or keep your build and collect light.',detail:'Refund paid Packed Light from that branch. Your free starting gift stays learned.'},
{id:'companion-shrine',index:11,name:'Companion Shrine',summary:'Bless companions, buy a discounted skill, or accept a light offering.',detail:'The blessing improves recovery for your next flight. Skills spend Packed Light.'},
].map(Object.freeze));
export function getEventScenarios(options={}){return EVENT_SCENARIOS.map(entry=>({...entry,summary:glowText(entry.summary,options.maxGlow||100),detail:glowText(entry.detail,options.maxGlow||100)}));}
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
 const kind=kindOf(node),base=MAP_STOP_TYPES[kind];
 const event=kind==='encounter'&&node.kind!=='shrine'&&Number.isInteger(node.eventIndex)?getEventScenarios({...node,maxGlow})[node.eventIndex]:null;
 const exit=kind==='flight'&&(node.type==='finale'||node.kind==='finale');
 const summary=kind==='boss'?`Defeat ${node.bossId==='moonweaver'?'the Moonweaver':'the Hollow Warden'}: choose a permanent Boss Relic and advance the difficulty tier.`:event?.summary||(node.kind==='shrine'?'Choose Sparks or an offered skill trade. No general fleet or skill service.':exit?'Clear this flight to continue to the next map.':base.summary);
 return{...base,label:exit?'EXIT':node.elite?'ELITE':base.label,name:event?.name||(node.type==='support'?node.name:node.locationName||node.name)||base.name,summary:event?summary:glowText(summary,maxGlow),detail:event?.detail||glowText(summary,maxGlow),eventIndex:event?.index??null,scenarioId:event?.id||null};
}
const colors={dark:'#15251e',body:'#6e8164',face:'#a4b18b',fire:'#efcc82',edge:'#c8c89c',rune:'#e4d6a9'};
export function mapStopIconMarkup(kindOrNode){
 const category=kindOf(kindOrNode);
 const art=landmarks[category].replace(/class="landmark-(\w+)"/g,(_,part)=>part==='edge'||part==='rune'?`fill="none" stroke="${colors[part]}" stroke-width="1.5"`:`fill="${colors[part]||colors.body}" stroke="none"`);
 return `<svg class="map-stop-icon" data-map-category="${category}" viewBox="-36 -32 72 64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${art}</svg>`;
}
