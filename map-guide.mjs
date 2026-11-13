const stop=(kind,label,name,summary)=>Object.freeze({kind,label,name,summary,icon:kind});
export const MAP_STOP_TYPES=Object.freeze({
flight:stop('flight','FLIGHT','Flight','Fly a passage. Remaining Glow carries forward.'),
elite:stop('elite','ELITE','Elite flight','A harder flight with greater rewards.'),
rest:stop('rest','REST','Rest','Recover Glow, gather Embers or refill all hearts. Train to expand your heart cap before leaving.'),
encounter:stop('encounter','ENCOUNTER','Encounter','A Shrine or Event trade. No Rest services.'),
boss:stop('boss','BOSS','Boss','Face the Hollow Warden at the end of the third map.'),
});
export const EVENT_SCENARIOS=Object.freeze([
{id:'ash-spring',index:0,name:'Ash Spring',summary:'Spend 12 embers for full Glow, or take 16 embers.',detail:'A rare full refill competes directly with upgrade money for this run.'},
{id:'cinder-bargain',index:1,name:'Cinder Bargain',summary:'Trade 15 Glow for 35 embers, or take 12 embers safely.',detail:'If you lack 15 Glow, the first option instead recovers 18 Glow.'},
{id:'abandoned-lantern',index:2,name:'Abandoned Lantern',summary:'Recover 24 Glow or take 22 embers.',detail:'Choose fuel for the next passage or Embers for this run’s upgrades.'},
{id:'weathered-shrine',index:3,name:'Weathered Shrine',summary:'Buy an offered skill rank for this run at a discount, or take 20 embers.',detail:'This specific trade does not open general skills or fleet service.'},
{id:'luminous-well',index:4,name:'Luminous Well',summary:'Refill Glow or take 12 embers.',detail:'After the first boss, the second option stores up to 10 Afterglow instead.'},
{id:'ember-archive',index:5,name:'The Ember Archive',summary:'Trade an owned artifact, or keep your possessions and take 20 embers.',detail:'An offered artifact sells for 50 embers. Without an artifact, the first choice recovers 24 Glow.'},
].map(Object.freeze));
export function getEventScenarios(options={}){const unlocked=typeof options==='boolean'?options:options.afterglowUnlocked===true;return EVENT_SCENARIOS.map(e=>e.index===4&&unlocked?{...e,summary:'Refill Glow or store up to 10 Afterglow.',detail:'Stored light is available only after defeating the first boss.'}:e);}
function kindOf(value){
 if(typeof value==='string'){
  if(value==='camp')return'rest';
  if(value==='shrine'||value==='event'||value==='support')return'encounter';
  if(value==='finale'||value==='exit')return'flight';
  return Object.hasOwn(MAP_STOP_TYPES,value)?value:'flight';
 }
 const n=value||{};
 if(n.boss||n.kind==='boss'||n.type==='boss')return'boss';
 if(n.kind==='camp'||n.kind==='rest'||n.type==='camp')return'rest';
 if(n.kind==='shrine'||n.kind==='event'||n.type==='support')return'encounter';
 return n.elite||n.kind==='elite'||n.type==='elite'?'elite':'flight';
}
export function getMapStopInfo(node={}){
 const kind=kindOf(node),base=MAP_STOP_TYPES[kind];
 const event=kind==='encounter'&&node.kind!=='shrine'&&Number.isInteger(node.eventIndex)?getEventScenarios(node)[node.eventIndex]:null;
 const exit=kind==='flight'&&(node.type==='finale'||node.kind==='finale');
 const summary=kind==='boss'?'Defeat the Hollow Warden: earn a persistent artifact, unlock Afterglow and advance the difficulty tier.':event?.summary||(node.kind==='shrine'?'Choose Glow or an offered skill trade. No general fleet or skill service.':exit?'Clear this flight to continue to the next map.':base.summary);
 return{...base,label:exit?'EXIT':base.label,name:event?.name||(node.type==='support'?node.name:node.locationName||node.name)||base.name,summary,detail:event?.detail||summary,eventIndex:event?.index??null,scenarioId:event?.id||null};
}
const ICONS={
flight:'<circle cx="8" cy="12" r="3.5"/><path d="M8 10.5v.01M1 8h3M1 16h3M13 12h9m-4-4 4 4-4 4"/>',
elite:'<path d="M7 17c-2-1-3-3-3-6a8 8 0 0 1 16 0c0 3-1 5-3 6v4H7zM10 18v3m4-3v3"/><circle cx="8.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="11.5" r="1.2" fill="currentColor"/>',
rest:'<path d="M2 11 12 3l10 8M5 10v11h14V10M16 6V3h3v5"/><path d="M10 21v-7h4v7"/><path d="M11 16h2v4h-2z" fill="currentColor" stroke="none"/><path d="M7 11h2m6 0h2"/>',
encounter:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/>',
boss:'<path d="m3 3 6 4h6l6-4-2 9v4l-7 6-7-6v-4zM8 11l3 2m5-2-3 2M12 7v3m-3 7h6"/><path d="m7 7 5-4 5 4"/>',
};
export function mapStopIconMarkup(kindOrNode){const category=kindOf(kindOrNode);return`<svg class="map-stop-icon" data-map-category="${category}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[category]}</svg>`;}
