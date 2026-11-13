import {getCompanionAbility} from './companion-abilities.mjs?v=plain-begin-1';
import {resourceSymbol} from './game-symbols.mjs?v=plain-begin-1';
import {pickupArtSvg} from './pickup-art.mjs?v=plain-begin-1';
import {getPickupSpec} from './pickups.mjs?v=plain-begin-1';
import {mapStopIconMarkup,MAP_STOP_TYPES} from './map-guide.mjs?v=plain-begin-1';
import {artifactIcon,skillIcon} from './upgrade-icons.mjs?v=plain-begin-1';
import {companionArtSvg} from './companion-art.mjs?v=plain-begin-1';
import {dreamEye} from './dream.mjs?v=plain-begin-1';
import {lifeHeartSvg} from './lives.mjs?v=plain-begin-1';
const item=(art,label)=>`<span class="coach-term">${art}<b>${label}</b></span>`;
const arrow='<i class="coach-term-arrow" aria-hidden="true">→</i>';
const meter='<span class="coach-meter" aria-hidden="true">'+Array.from({length:10},(_,i)=>`<i class="${i<7?'filled':''}"></i>`).join('')+'</span>';
// Reuse the actual game artwork. This is a vocabulary cue, not a second icon set.
export function tutorialVisualMarkup(step={}){
 const id=String(step.id||''),kind=step.visual||({'flight':'lift','flight-wind':'collector','practice-condensation':'packed','practice-lives':'life','practice-route':'route','practice-rest-route':'rest','practice-rest-choice':'rest','practice-rest-tools':'tools','practice-dream':'dream','practice-reward':'artifact','practice-skill-tree':'skills','practice-symbols':'sites'})[id.split(':')[0]];
 if(id.startsWith('artifact:'))return item(artifactIcon(id.split(':')[1]),'ARTIFACT · AUTOMATIC');
 if(kind==='luminance'||id.startsWith('world:luminance'))return item('<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#dce8b6" opacity=".07"/><circle cx="20" cy="20" r="14" fill="#dce8b6" opacity=".16"/><circle cx="20" cy="20" r="9" fill="#dce8b6" opacity=".35"/><path d="M17 14h6v3h3v6h-3v3h-6v-3h-3v-6h3z" fill="#f6f3d9"/></svg>','LUMINANCE');
 if(kind==='wisp')return item(companionArtSvg('collector'),'WISP');
 if(kind==='meter')return item(meter,'ENERGY METER');
 if(kind==='spark-layers')return ['light','cluster','cache'].map((type,i)=>item(pickupArtSvg(type),[6,12,18][i]+' ENERGY')).join('');
 if(kind==='life-loss')return item(lifeHeartSvg(),'1 HEART')+arrow+item(lifeHeartSvg(true),'−1 ATTEMPT');
 if(kind==='pause')return item('<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M8 5h5v22H8zM19 5h5v22h-5z"/></svg>','PAUSE · RESUME');
 if(kind==='black-hole'||id.startsWith('world:black-hole'))return item('<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#9c7383" opacity=".3"/><circle cx="20" cy="20" r="13" fill="#030507" stroke="#9a738a" stroke-width="2"/><path d="M4 10q24-14 32 10M35 29Q13 43 4 20" fill="none" stroke="#e1c7b2" stroke-width="2"/></svg>','BLACK HOLE');
 if(kind==='draft')return item(resourceSymbol('up'),'DRAFT · PUSH');
 if(kind==='edge')return item(skillIcon({id:'main-edging-attunement',icon:'edge-pulse'}),'EDGING PULSE');
 if(kind==='forge')return item(artifactIcon('glow-wick'),'DESTROY')+arrow+item(resourceSymbol('packed'),'PACKED SPARKS');
 if(kind==='artifact-rarity')return item(artifactIcon('glow-wick'),'COMMON')+item(artifactIcon('sunspool'),'RARE')+item(artifactIcon('sunheart-engine'),'LEGENDARY');
 if(kind==='skill-states')return '<span class="coach-skill-key"><b>✓ OWNED</b><b>+ CAN LEARN</b><b>◆ NEED LIGHT</b><b>▣ LOCKED</b></span>';
 if(kind?.startsWith('site:'))return item(mapStopIconMarkup(kind.slice(5)),kind.slice(5).toUpperCase());
 if(kind==='sites-support')return item(mapStopIconMarkup('encounter'),'ENCOUNTER')+item(mapStopIconMarkup('treasure'),'TREASURE');
 if(kind?.startsWith('pickup:')){const type=kind.slice(7);return item(pickupArtSvg(type),getPickupSpec(type).name);}
 if(kind==='spark'||id.startsWith('world:light-packet'))return item(pickupArtSvg('light'),'SPARK')+arrow+item(meter,'ENERGY METER');
 if(kind==='clear-reward')return item(mapStopIconMarkup('flight'),'CLEAR FLIGHT')+arrow+item(resourceSymbol('packed'),'+20 PACKED SPARKS');
 if(kind==='packed')return item(resourceSymbol('glow'),'FULL METER')+arrow+item(resourceSymbol('packed'),'BONUS PACKED SPARKS');
 if(kind==='lift')return item(resourceSymbol('up'),'LIFT')+item(resourceSymbol('glow'),'SPENDS ENERGY');
 if(kind==='route')return item(mapStopIconMarkup('flight'),'FLIGHT');
 if(kind==='rest')return item(mapStopIconMarkup('rest'),'REST · CHOOSE ONE');
 if(kind==='sites')return Object.values(MAP_STOP_TYPES).map(x=>item(mapStopIconMarkup(x.kind),x.label)).join('');
 if(kind==='dream')return item(dreamEye,'DREAM · REHEARSE');
 if(kind==='artifact')return item(artifactIcon('glow-wick'),'ARTIFACT · AUTOMATIC');
 if(kind==='skills')return item(resourceSymbol('packed'),'PACKED SPARKS')+arrow+item(skillIcon({id:'main-sight',branch:'main'}),'RUN SKILL');
 if(kind==='tools')return item(skillIcon({id:'main-sight',branch:'main'}),'SKILLS')+item(companionArtSvg('collector'),'COMPANION')+item(dreamEye,'DREAM');
 if(kind==='life')return item(lifeHeartSvg(),'HEART · ONE ATTEMPT');
 if(kind?.startsWith('companion:')){const role=kind.slice(10);return item(companionArtSvg(role),getCompanionAbility(role).name);}
 if(kind==='collector')return item(companionArtSvg('collector'),'COLLECTOR');
 return '';
}
