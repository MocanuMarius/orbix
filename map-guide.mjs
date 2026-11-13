import {glowText} from './vitality.mjs?v=edge-and-void-1';
const stop=(kind,label,name,summary)=>Object.freeze({kind,label,name,summary,icon:kind});
export const MAP_STOP_TYPES=Object.freeze({
flight:stop('flight','FLIGHT','Flight','Fly a passage, choose a relic or dissolve it into Glow, and recover fuel.'),
treasure:stop('treasure','TREASURE','Treasure','Mount an artifact, replace one, or dissolve it into Glow. Surplus condenses.'),
rest:stop('rest','REST','Rest','Recover Glow or refill hearts. Prepare skills, companions and a Dream before leaving.'),
encounter:stop('encounter','ENCOUNTER','Encounter','A bargain, sanctuary, workshop or dice encounter. Preview the stakes.'),
boss:stop('boss','BOSS','Boss','Face the guardian at the end of the third map.'),
});
export const EVENT_SCENARIOS=Object.freeze([
{id:'ash-spring',index:0,name:'Ash Spring',summary:'Trade Condensed Glow for a refill, or collect a smaller light offering.',detail:'A full refill spends upgrade currency. A finite offering fills Glow first and condenses its surplus.'},
{id:'cinder-bargain',index:1,name:'Cinder Bargain',summary:'Trade some fuel for an artifact, or take a safe light offering.',detail:'Preview the Glow cost and the actual fuel/condensed split before accepting.'},
{id:'abandoned-lantern',index:2,name:'Abandoned Lantern',summary:'Recover fuel or collect the lantern’s remaining light.',detail:'Recovery fills fuel only. A finite light offering can condense above your maximum.'},
{id:'weathered-shrine',index:3,name:'Weathered Shrine',summary:'Buy a discounted skill or collect a light offering.',detail:'The offered skill spends Condensed Glow. This shrine does not provide full Rest services.'},
{id:'luminous-well',index:4,name:'Luminous Well',summary:'Choose full recovery or a finite light offering.',detail:'Rest-style recovery never produces currency; a light offering condenses only its actual surplus.'},
{id:'ember-archive',index:5,name:'The Glow Archive',summary:'Dissolve an artifact or keep your build and accept a light offering.',detail:'Dissolved artifacts release Glow. Any surplus becomes Condensed Glow for run skills.'},
{id:'ember-dice',index:6,name:'Prism Dice',summary:'Take a certain light offering, or spend Condensed Glow on one roll.',detail:'Three equally likely offerings. One cast; the result stays fixed if you return.'},
{id:'lost-lanterns',index:7,name:'Lost Lanterns',summary:'Choose recovery, a light offering, or sacrifice fuel for an artifact.',detail:'Each lantern trades immediate fuel, future upgrades or a changed build.'},
{id:'wisp-bargain',index:8,name:'Wisp Bargain',summary:'Take a larger offering with a Lift burden, or travel lightly.',detail:'The burden raises Lift effort for only the next flight. Preview each offering’s fuel and condensed value.'},
{id:'sanctuary',index:9,name:'Quiet Sanctuary',summary:'Choose fuel, a missing heart, or faster companion recovery.',detail:'The blessing improves companion recovery for your next flight.'},
{id:'workshop',index:10,name:'Lantern Workshop',summary:'Refund a main skill branch, or keep your build and collect light.',detail:'Refund paid Condensed Glow from that branch. Your free starting gift stays learned.'},
{id:'companion-shrine',index:11,name:'Companion Shrine',summary:'Bless companions, buy a discounted skill, or accept a light offering.',detail:'The blessing improves recovery for your next flight. Skills spend Condensed Glow.'},
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
 const summary=kind==='boss'?`Defeat ${node.bossId==='moonweaver'?'the Moonweaver':'the Hollow Warden'}: choose a permanent Boss Relic and advance the difficulty tier.`:event?.summary||(node.kind==='shrine'?'Choose Glow or an offered skill trade. No general fleet or skill service.':exit?'Clear this flight to continue to the next map.':base.summary);
 return{...base,label:exit?'EXIT':node.elite?'ELITE':base.label,name:event?.name||(node.type==='support'?node.name:node.locationName||node.name)||base.name,summary:event?summary:glowText(summary,maxGlow),detail:event?.detail||glowText(summary,maxGlow),eventIndex:event?.index??null,scenarioId:event?.id||null};
}
const ICONS={
flight:'<path d="M2 21V8l5-5h4v18M22 21V8l-5-5h-4v18M2 8h9m2 0h9M1 21h22"/><circle cx="12" cy="13" r="3" fill="currentColor"/>',
treasure:'<path d="M3 10V6l3-3h12l3 3v4M3 10h18v11H3zM2 10h20M10 8h4v6h-4zM7 3v7m10-7v7"/>',
rest:'<path d="M2 11 12 3l10 8M5 10v11h14V10M16 6V3h3v5"/><path d="M10 21v-7h4v7"/><path d="M11 16h2v4h-2z" fill="currentColor" stroke="none"/><path d="M7 11h2m6 0h2"/>',
encounter:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/>',
boss:'<path d="m3 3 6 4h6l6-4-2 9v4l-7 6-7-6v-4zM8 11l3 2m5-2-3 2M12 7v3m-3 7h6"/><path d="m7 7 5-4 5 4"/>',
};
export function mapStopIconMarkup(kindOrNode){const category=kindOf(kindOrNode);return`<svg class="map-stop-icon" data-map-category="${category}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[category]}</svg>`;}
