import {OATHS} from './oaths.mjs?v=tidy-1';
import {OBJECTIVE_SPARKS} from './route-bonuses.mjs?v=tidy-1';
import {getBiome} from './biomes.mjs?v=tidy-1';
import {sparkHabitat} from './spark-fields.mjs?v=tidy-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=tidy-1';
import {landmarkCategory,guardianNames} from './map-landmarks.mjs?v=tidy-1';
import {uiIcon} from './ui-icons.mjs?v=tidy-1';
import {inscriptionGlyph} from './inscription-glyphs.mjs?v=tidy-1';
import {glowText} from './vitality.mjs?v=tidy-1';
const stop=(kind,label,name,summary)=>Object.freeze({kind,label,name,summary,icon:kind});
export const MAP_STOP_TYPES=Object.freeze({
flight:stop('flight','FLIGHT','Flight','Flight length sets its Stored Sparks reward; overflow adds a bonus. Ordinary flights do not offer an Inscription.'),
treasure:stop('treasure','TREASURE','Treasure','A chest holds two gifts: Stored Sparks or a surprise card. Taking one leaves the other behind.'),
scribe:stop('scribe','SCRIBE','The Scribe','Scribe — choose an Inscription for a slot of your Chain.'),
rest:stop('rest','REST','Rest','Recover missing hearts or Grow Spark capacity. Both refill Sparks.'),
encounter:stop('encounter','ENCOUNTER','Encounter','Choose one of two rewards: you get only the one you tap. Card rewards ask which card. Some offer a one-flight wager or a route mark.'),
boss:stop('boss','ELITE / GUARDIAN','Creature','Small creature: elite. Large head: guardian. Both offer two Inscriptions; choose one to write on your Chain.'),
});
// Every event offers two outcomes and the player takes ONE (dist/event-choices.mjs). The wager events (dist/oaths.mjs) offer a bet on the NEXT flight only.
const wagerPay = id => OBJECTIVE_SPARKS.map(n => n * OATHS[id].multiple).join(' / ');
const wagerLine = id => OATHS[id].rule + ' Won: +' + wagerPay(id) + ' Stored Sparks by map. Not met: nothing. One flight only.';
export const EVENT_SCENARIOS=Object.freeze([
{id:'ash-spring',index:0,name:'Ash Spring',summary:'Drink the spring, or bottle the ash for Stored Sparks.',detail:'Drinking refills your Spark Meter. With a full meter the spring relights a missing heart, or lets you refill one card’s uses instead. The other choice is 20 / 30 / 40 Stored Sparks by map.',reward:'Refill Sparks, a heart or one card’s uses, or Stored Sparks'},
{id:'cinder-bargain',index:1,name:'Night’s Ledger',summary:'Wager the next flight at 55% Luminance, or leave freely.',detail:wagerLine('night-ledger'),reward:'Wager: +'+wagerPay('night-ledger')+' Stored Sparks if you clear the next flight'},
{id:'pilgrim-vow',index:2,name:'Pilgrim’s Vow',summary:'Wager four body Spark pickups on the next flight, or drink the offering.',detail:wagerLine('pilgrim-vow')+' Collector deliveries and Dreams do not count. The other choice restores 6 Sparks.',reward:'Wager: +'+wagerPay('pilgrim-vow')+' Stored Sparks, or restore 6 Sparks'},
{id:'weathered-shrine',index:3,name:'Weathered Shrine',summary:'Refill one card’s uses, or leave an offering for Stored Sparks.',detail:'Refill pays off on any card that has used some of its uses: you tap which one, free. The other choice is 20 / 30 / 40 Stored Sparks by map.',reward:'Refill one card’s uses, or Stored Sparks'},
{id:'surveyors-cairn',index:4,name:'Surveyor’s Cairn',summary:'Prepare one reachable passage, or take light and keep your fork open.',detail:'Mark a linked exit for gentler drafts or more Luminance on its first attempt. Where the path forks, marking one exit commits the route. Falling spends the preparation and reopens a fork. The other choice restores Sparks, or gives Stored Sparks with a full meter.',reward:'A route mark for your next flight, or Sparks'},
{id:'ember-archive',index:5,name:'The Sparks Archive',summary:'Copy the ledger for Stored Sparks, or take a heart or an upgrade.',detail:'Copying pays 16 Stored Sparks. The other choice relights a missing heart, or with full hearts lets you improve one card of your choice (free).',reward:'+16 Stored Sparks, or a heart or one card improved'},
{id:'ember-dice',index:6,name:'Prism Dice',summary:'Take a small sure sum or cast the prism once.',detail:'The sure sum is 10 Stored Sparks. The prism rolls once: faces 1–2 improve one card, 3–4 give a free card, 5–6 give 22 Stored Sparks. With no card to improve, faces 1–2 pay 22 Stored Sparks.',reward:'10 Stored Sparks, or one roll: card improved, free card or 22 Stored Sparks'},
{id:'lost-lanterns',index:7,name:'The Closed Eye',summary:'Wager the next flight in deep darkness for a large prize, or leave freely.',detail:wagerLine('closed-eye'),reward:'Wager: +'+wagerPay('closed-eye')+' Stored Sparks if you clear the next flight'},
{id:'wisp-bargain',index:8,name:'The Silent Orbit',summary:'Wager the next flight with shorter Collector reach, or leave freely.',detail:wagerLine('silent-orbit')+' Body pickups keep full value.',reward:'Wager: +'+wagerPay('silent-orbit')+' Stored Sparks if you clear the next flight'},
{id:'sanctuary',index:9,name:'Quiet Sanctuary',summary:'Restore a missing heart, or refill one card’s uses.',detail:'The first choice relights a missing heart; at full hearts it refills your Spark Meter, or pays Stored Sparks if that is full too. The other choice refills one card’s uses, free: you tap which card.',reward:'A heart or Sparks, or one card’s uses refilled'},
{id:'workshop',index:10,name:'Lantern Workshop',summary:'Unweave a paid branch for a refund, or improve one card.',detail:'Unweaving removes a skill branch’s paid ranks and refunds their Stored Sparks. Without a useful refund the workshop buys your scrap for Stored Sparks. The other choice improves one card of your choice, free.',reward:'A skill refund or Stored Sparks, or one card improved'},
{id:'companion-shrine',index:11,name:'Companion Shrine',summary:'Improve one card, or salvage the tuning fork for Stored Sparks.',detail:'The first choice improves one card you tap, free. The other pays 12 Stored Sparks.',reward:'One card improved, or +12 Stored Sparks'},
].map(entry=>Object.freeze(entry)));
export function getEventScenarios(){return EVENT_SCENARIOS.map(entry=>({...entry}));}
function kindOf(value){
 if(typeof value==='string'){
  if(value==='camp')return'rest';if(value==='treasure')return'treasure';if(value==='scribe')return'scribe';if(value==='elite')return'flight';
  if(value==='shrine'||value==='event'||value==='support')return'encounter';
  if(value==='finale'||value==='exit')return'flight';
  return Object.hasOwn(MAP_STOP_TYPES,value)?value:'flight';
 }
 const n=value||{};
 if(n.boss||n.kind==='boss'||n.type==='boss')return'boss';
 if(n.kind==='treasure')return'treasure';
 if(n.kind==='scribe')return'scribe';
 if(n.kind==='camp'||n.kind==='rest'||n.type==='camp')return'rest';
 if(n.kind==='shrine'||n.kind==='event'||n.type==='support')return'encounter';
 return 'flight';
}
export function getMapStopInfo(node={},maxGlow=100){
 const kind=kindOf(node),base=MAP_STOP_TYPES[kind],elite=node.elite===true||node.kind==='elite';
 if(node.practiceLoan)return {...base,name:node.name,summary:'Borrow Proximity rank 1 for a revealing Surface Pulse. The loan stays in practice.',detail:'One practice loan. Your campaign build stays safe.',eventIndex:null,scenarioId:null};
 // First Light Edition 5: the paused Chain screens (practice-course.mjs). Nothing is at risk; nothing flies.
 if(node.practiceChain&&!node.practiceScribe)return {...base,name:node.name,summary:node.practiceRest?'Rest: take Add slot, then place a gift card in your Chain.':'A gift card waits: place it in your Chain. No flight.',detail:'Practice cards stay in practice. Your real run is safe.',eventIndex:null,scenarioId:null};
 if(node.tutorialLesson==='guardian')return {...base,label:'GUARDIAN',name:'Hollow Warden',summary:'Read the warned stone hands. A wide opening and unlimited retries teach the guardian.',detail:'Reach the waylight to finish First Light. Practice resources stay here.',eventIndex:null,scenarioId:null};
 const event=kind==='encounter'&&node.kind!=='shrine'&&Number.isInteger(node.eventIndex)?getEventScenarios({...node,maxGlow})[node.eventIndex]:null;
 const exit=kind==='flight'&&(node.type==='finale'||node.kind==='finale'),guardian=guardianNames[node.bossId]||node.name||'Guardian';
 if(kind==='treasure')return {...base,name:node.name||base.name,summary:node.rewardPreview||base.summary,detail:node.description||base.summary,eventIndex:null,scenarioId:null};
 if(kind==='scribe')return {...base,detail:base.summary,eventIndex:null,scenarioId:null};
 const summary=kind==='boss'?(node.mapIndex>=2?`Pass ${guardian} and complete the Ascension.`:`Pass ${guardian} and choose one of two Inscriptions.`):elite?`Face an elite creature for ${getFlightClearReward(node)} Stored Sparks and a choice of two Inscriptions.`:event?.summary||(node.kind==='shrine'?'Refill one card’s uses, or leave an offering for Stored Sparks.':exit?`Clear this passage for ${getFlightClearReward(node)} Stored Sparks and continue to the next map.`:base.summary);
 const detail=kind==='boss'?(node.mapIndex>=2?'Reach the waylight to complete the Ascension.':`A guardian ends this map: ${getFlightClearReward(node)} Stored Sparks and one of two Inscriptions to write on your Chain.`):elite?'Choose one of two Inscriptions and write it on a slot of your Chain.':event?.detail||summary;
 return{...base,label:kind==='boss'?'GUARDIAN':elite?'ELITE':exit?'EXIT':base.label,name:kind==='boss'?guardian:event?.name||(node.type==='support'?node.name:node.locationName||node.name)||base.name,summary:event?summary:glowText(summary,maxGlow),detail:event?detail:glowText(detail,maxGlow),eventIndex:event?.index??null,scenarioId:event?.id||null};
}
// Stop icons are the approved v2.0-icons set (ui-icons.mjs). Elite and Guardian share the boss family but keep their own drawings.
const STOP_ICON={flight:'stop-flight',rest:'stop-rest',encounter:'stop-encounter',treasure:'stop-chest',boss:'stop-boss',elite:'stop-elite'};
export const MAP_STOP_ICON_NAMES=Object.freeze([...Object.values(STOP_ICON),'stop-workshop','stop-unknown']);
/** Map stop icon (24-grid art): 48 px by default, ask for 24, 72, 96... through size. The Lantern Workshop encounter has its own icon. */
export function mapStopIconMarkup(kindOrNode,{size=48}={}){
 const artCategory=landmarkCategory(kindOrNode),category=artCategory==='elite'?'boss':artCategory;
 // The Scribe stop borrows the Whetted brand (a nib resting on a slab) from the Inscription family; no new art.
 if(artCategory==='scribe'){const px=Math.max(1,Math.round(size/16))*16;return inscriptionGlyph('whetted',{size:px,className:'map-stop-icon map-symbol-scribe'}).replace(' viewBox=',` style="--ui-size:${px}px;color:#f6ebcc" data-map-category="scribe" viewBox=`);}
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
