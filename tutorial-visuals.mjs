import {resourceCycleArt} from './resource-cycle.mjs?v=fast-3';
import {getCompanionAbility} from './companion-abilities.mjs?v=fast-3';
import {resourceSymbol} from './game-symbols.mjs?v=fast-3';
import {pickupArtSvg} from './pickup-art.mjs?v=fast-3';
import {getPickupSpec} from './pickups.mjs?v=fast-3';
import {mapStopIconMarkup,MAP_STOP_TYPES} from './map-guide.mjs?v=fast-3';
import {artifactIcon,skillIcon} from './upgrade-icons.mjs?v=fast-3';
import {companionArtSvg} from './companion-art.mjs?v=fast-3';
import {dreamEye} from './dream.mjs?v=fast-3';
import {lifeHeartSvg} from './lives.mjs?v=fast-3';
import {uiIcon} from './ui-icons.mjs?v=fast-3';
// Teaching cues name a Spark or the Long Flare with the approved icons; other pickups keep their in-flight sprite.
const pickupCue=type=>type==='light'?uiIcon('spark',{size:32}):type==='sight'?uiIcon('long-flash',{size:32}):pickupArtSvg(type);
const item=(art,label)=>`<span class="coach-term">${art}<b>${label}</b></span>`;
const arrow='<i class="coach-term-arrow" aria-hidden="true">→</i>';
const meter='<span class="coach-meter" aria-hidden="true">'+Array.from({length:10},(_,i)=>`<i class="${i<7?'filled':''}"></i>`).join('')+'</span>';
// Reuse the actual game artwork. This is a vocabulary cue, not a second icon set.
export function tutorialVisualMarkup(step={}){
 const id=String(step.id||''),kind=step.visual||({'flight':'lift','flight-wind':'collector','practice-condensation':'packed','practice-lives':'life','practice-route':'route','practice-rest-route':'rest','practice-rest-choice':'rest','practice-rest-tools':'tools','practice-dream':'dream','practice-reward':'artifact','practice-skill-tree':'skills','practice-symbols':'sites'})[id.split(':')[0]];
 if(kind==='resource-cycle')return resourceCycleArt(step.cycle);
 if(kind==='lantern-icon')return '<img class="guide-lantern-icon" src="assets/lantern-wedge.png" width="55" height="33" alt="">';
 if(kind==='giant-hole')return '<img class="guide-hole-scene" src="assets/giant-hole-guide.png" width="196" height="92" alt="The bright rim of a giant crosses the roof. The wisp flies through the passage below it." style="max-width:100%;height:auto;image-rendering:pixelated">';
 if(kind==='spark-storage')return item(pickupArtSvg('cluster'),'Spark')+arrow+item(resourceSymbol('packed'),'Stored Sparks');
 if(kind?.startsWith('collector-')){
  const recovery=kind==='collector-recovery',returning=kind==='collector-return';
  return `<figure class="collector-teaching-capture"><img src="assets/previews/collector-tether/${recovery?'reel-near.png':'reel-front.png'}" width="300" height="180" alt="Actual flight: the small green Collector latches onto a pickup and reels it along a tether to the larger white wisp." style="display:block;max-width:100%;height:auto;image-rendering:pixelated"><figcaption>${recovery?'Busy during the reel · ready on contact':returning?'Latch → reel → body contact':'Your body first · green circle marks handling'}</figcaption></figure>`;
 }
 if(id.startsWith('artifact:'))return item(artifactIcon(id.split(':')[1]),'ARTIFACT · AUTOMATIC');
 if(kind==='luminance'||id.startsWith('world:luminance'))return item(skillIcon({id:'main-sight'}),'LUMINANCE');
 if(kind==='wisp')return item(companionArtSvg('collector'),'WISP');
 if(kind==='meter')return item(meter,'SPARK METER');
 if(kind==='spark-layers')return resourceCycleArt({stage:0});
 if(kind==='life-loss')return item(lifeHeartSvg(),'1 HEART')+arrow+item(lifeHeartSvg(true),'−1 ATTEMPT');
 if(kind==='pause')return item('<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M8 5h5v22H8zM19 5h5v22h-5z"/></svg>','PAUSE · RESUME');
 if(kind==='black-hole'||id.startsWith('world:black-hole'))return item('<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#9c7383" opacity=".3"/><circle cx="20" cy="20" r="13" fill="#030507" stroke="#9a738a" stroke-width="2"/><path d="M4 10q24-14 32 10M35 29Q13 43 4 20" fill="none" stroke="#e1c7b2" stroke-width="2"/></svg>','BLACK HOLE');
 if(kind==='draft')return item(resourceSymbol('up'),'DRAFT · PUSH');
 if(kind==='edge')return item(skillIcon({id:'main-edging-attunement',icon:'edge-pulse'}),'PROXIMITY');
 if(kind==='forge')return item(artifactIcon('glow-wick'),'DESTROY')+arrow+item(resourceSymbol('packed'),'STORED SPARKS');
 if(kind==='artifact-rarity')return item(artifactIcon('glow-wick'),'COMMON')+item(artifactIcon('sunspool'),'RARE')+item(artifactIcon('sunheart-engine'),'LEGENDARY');
 if(kind==='skill-states')return '<span class="coach-skill-key"><b>✓ Owned</b><b>Can learn</b><b>Save more</b><b>'+resourceSymbol('lock')+' Needs prerequisite</b></span>';
 if(kind?.startsWith('site:'))return item(mapStopIconMarkup(kind.slice(5)),kind.slice(5).toUpperCase());
 if(kind==='sites-support')return item(mapStopIconMarkup('encounter'),'ENCOUNTER')+item(mapStopIconMarkup('treasure'),'TREASURE');
 if(kind?.startsWith('pickup:')){const type=step.pickup||kind.slice(7);return item(pickupCue(type),getPickupSpec(type).name);}
 if(kind==='spark'||id.startsWith('world:light-packet'))return item(pickupCue('light'),'SPARK')+arrow+item(meter,'SPARK METER');
 if(kind==='clear-reward')return item(mapStopIconMarkup('flight'),'CLEAR FLIGHT')+arrow+item(resourceSymbol('packed'),'+20 STORED SPARKS');
 if(kind==='packed')return item(resourceSymbol('glow'),'FULL METER')+arrow+item(resourceSymbol('packed'),'BONUS STORED SPARKS');
 if(kind==='lift')return item(resourceSymbol('up'),'LIFT')+item(resourceSymbol('glow'),'SPENDS SPARKS');
 if(kind==='route')return item(mapStopIconMarkup('flight'),'FLIGHT');
 if(kind==='rest')return item(mapStopIconMarkup('rest'),'REST · CHOOSE ONE');
 if(kind==='sites')return Object.values(MAP_STOP_TYPES).map(x=>item(mapStopIconMarkup(x.kind),x.label)).join('');
 if(kind==='dream')return item(dreamEye,'DREAM · REHEARSE');
 if(kind==='artifact')return item(artifactIcon('glow-wick'),'ARTIFACT · AUTOMATIC');
 if(kind==='skills')return item(resourceSymbol('packed'),'STORED SPARKS')+arrow+item(skillIcon({id:'main-sight',branch:'main'}),'RUN SKILL');
 if(kind==='tools')return item(skillIcon({id:'main-sight',branch:'main'}),'SKILLS')+item(artifactIcon('glow-wick'),'COLLECTION');
 if(kind==='life')return item(lifeHeartSvg(),'HEART · ONE ATTEMPT');
 if(kind?.startsWith('companion:')){const role=kind.slice(10);return item(companionArtSvg(role),getCompanionAbility(role).name);}
 if(kind==='collector')return item(companionArtSvg('collector'),'COLLECTOR');
 return '';
}
