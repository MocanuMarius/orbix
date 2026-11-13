import {glowText} from './vitality.mjs?v=earned-start-1';
const stop=(kind,label,name,summary)=>Object.freeze({kind,label,name,summary,icon:kind});
export const MAP_STOP_TYPES=Object.freeze({
flight:stop('flight','FLIGHT','Flight','Fly a passage, choose a reward, and recover 50% maximum Glow.'),
treasure:stop('treasure','TREASURE','Treasure','Choose an artifact for your three slots, or take Embers.'),
rest:stop('rest','REST','Rest','Recover Glow, gather Embers or refill all hearts. Prepare skills, companions and a Dream before leaving.'),
encounter:stop('encounter','ENCOUNTER','Encounter','A bargain, sanctuary, workshop or dice encounter. Preview the stakes.'),
boss:stop('boss','BOSS','Boss','Face the Hollow Warden at the end of the third map.'),
});
export const EVENT_SCENARIOS=Object.freeze([
{id:'ash-spring',index:0,name:'Ash Spring',summary:'Spend 12 embers for full Glow, or take 16 embers.',detail:'A rare full refill competes directly with upgrade money for this run.'},
{id:'cinder-bargain',index:1,name:'Cinder Bargain',summary:'Trade 15 Glow for 35 embers, or take 12 embers safely.',detail:'If you lack 15 Glow, the first option instead recovers 18 Glow.'},
{id:'abandoned-lantern',index:2,name:'Abandoned Lantern',summary:'Recover 24 Glow or take 22 embers.',detail:'Choose fuel for the next passage or Embers for this run’s upgrades.'},
{id:'weathered-shrine',index:3,name:'Weathered Shrine',summary:'Buy an offered skill rank for this run at a discount, or take 20 embers.',detail:'This specific trade does not open general skills or fleet service.'},
{id:'luminous-well',index:4,name:'Luminous Well',summary:'Refill Glow or take 12 embers.',detail:'With Afterglow learned, the second option stores up to 10 Afterglow instead.'},
{id:'ember-archive',index:5,name:'The Ember Archive',summary:'Trade an owned artifact, or keep your possessions and take 20 embers.',detail:'An offered artifact sells for 50 embers. Without an artifact, the first choice recovers 24 Glow.'},
{id:'ember-dice',index:6,name:'Ember Dice',summary:'Take 14 Embers, or spend 12% Glow to roll for 4, 24, or 48.',detail:'Each pair of faces is equally likely. One cast; the outcome stays fixed if you return.'},
{id:'lost-lanterns',index:7,name:'Lost Lanterns',summary:'Choose Glow, Embers, or sacrifice Glow for an artifact.',detail:'Three offerings: 35% Glow, 24 Embers, or an artifact choice costing 15% Glow.'},
{id:'wisp-bargain',index:8,name:'Wisp Bargain',summary:'Take 32 Embers with a one-flight Lift burden, or 10 safely.',detail:'The burden raises Lift effort by 12% for only your next flight.'},
{id:'sanctuary',index:9,name:'Quiet Sanctuary',summary:'Choose 40% Glow, a missing heart, or faster companion recovery.',detail:'The blessing makes companion recovery 20% faster for your next flight.'},
{id:'workshop',index:10,name:'Lantern Workshop',summary:'Refund a main skill branch, or keep your build and take 16 Embers.',detail:'Refund paid Ember costs for that branch. Your free starting gift remains learned.'},
{id:'companion-shrine',index:11,name:'Companion Shrine',summary:'Bless your companions, buy a discounted skill, or take 18 Embers.',detail:'A temporary blessing improves recovery by 20% for your next flight.'},
].map(Object.freeze));
export function getEventScenarios(options={}){const unlocked=typeof options==='boolean'?options:options.afterglowUnlocked===true;return EVENT_SCENARIOS.map(e=>{const entry=e.index===4&&unlocked?{...e,summary:'Refill Glow or store up to 10 Glow in Afterglow.',detail:'Stored light pays your next flight’s Glow costs first.'}:e;return {...entry,summary:glowText(entry.summary,options.maxGlow||100),detail:glowText(entry.detail,options.maxGlow||100)};});}
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
 const summary=kind==='boss'?'Defeat the Hollow Warden: earn a rare artifact and advance the difficulty tier.':event?.summary||(node.kind==='shrine'?'Choose Glow or an offered skill trade. No general fleet or skill service.':exit?'Clear this flight to continue to the next map.':base.summary);
 return{...base,label:exit?'EXIT':node.elite?'ELITE':base.label,name:event?.name||(node.type==='support'?node.name:node.locationName||node.name)||base.name,summary,detail:event?.detail||summary,eventIndex:event?.index??null,scenarioId:event?.id||null};
}
const ICONS={
flight:'<path d="M2 21V8l5-5h4v18M22 21V8l-5-5h-4v18M2 8h9m2 0h9M1 21h22"/><circle cx="12" cy="13" r="3" fill="currentColor"/>',
treasure:'<path d="M3 10V6l3-3h12l3 3v4M3 10h18v11H3zM2 10h20M10 8h4v6h-4zM7 3v7m10-7v7"/>',
rest:'<path d="M2 11 12 3l10 8M5 10v11h14V10M16 6V3h3v5"/><path d="M10 21v-7h4v7"/><path d="M11 16h2v4h-2z" fill="currentColor" stroke="none"/><path d="M7 11h2m6 0h2"/>',
encounter:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/>',
boss:'<path d="m3 3 6 4h6l6-4-2 9v4l-7 6-7-6v-4zM8 11l3 2m5-2-3 2M12 7v3m-3 7h6"/><path d="m7 7 5-4 5 4"/>',
};
export function mapStopIconMarkup(kindOrNode){const category=kindOf(kindOrNode);return`<svg class="map-stop-icon" data-map-category="${category}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[category]}</svg>`;}
