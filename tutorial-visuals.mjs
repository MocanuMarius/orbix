import {getCompanionAbility} from './companion-abilities.mjs?v=living-choices-2';
import {resourceSymbol} from './game-symbols.mjs?v=living-choices-2';
import {pickupArtSvg} from './pickup-art.mjs?v=living-choices-2';
import {getPickupSpec} from './pickups.mjs?v=living-choices-2';
import {mapStopIconMarkup,MAP_STOP_TYPES} from './map-guide.mjs?v=living-choices-2';
import {artifactIcon,skillIcon} from './upgrade-icons.mjs?v=living-choices-2';
import {companionArtSvg} from './companion-art.mjs?v=living-choices-2';
import {dreamEye} from './dream.mjs?v=living-choices-2';
const item=(art,label)=>`<span class="coach-term">${art}<b>${label}</b></span>`;
const arrow='<i class="coach-term-arrow" aria-hidden="true">→</i>';
const meter='<span class="coach-meter" aria-hidden="true">'+Array.from({length:10},(_,i)=>`<i class="${i<7?'filled':''}"></i>`).join('')+'</span>';
// Reuse the actual game artwork. This is a vocabulary cue, not a second icon set.
export function tutorialVisualMarkup(step={}){
 const id=String(step.id||''),kind=step.visual||({'flight':'lift','flight-wind':'collector','practice-condensation':'packed','practice-lives':'life','practice-route':'route','practice-rest-route':'rest','practice-rest-choice':'rest','practice-rest-tools':'tools','practice-dream':'dream','practice-reward':'artifact','practice-skill-tree':'skills','practice-symbols':'sites'})[id.split(':')[0]];
 if(id.startsWith('artifact:'))return item(artifactIcon(id.split(':')[1]),'ARTIFACT · AUTOMATIC');
 if(kind?.startsWith('pickup:')){const type=kind.slice(7);return item(pickupArtSvg(type),getPickupSpec(type).name);}
 if(kind==='spark'||id.startsWith('world:light-packet'))return item(pickupArtSvg('light'),'SPARK')+arrow+item(meter,'SPARK METER');
 if(kind==='packed')return item(resourceSymbol('glow'),'FULL METER')+arrow+item(resourceSymbol('packed'),'PACKED LIGHT');
 if(kind==='lift')return item(resourceSymbol('up'),'LIFT')+item(resourceSymbol('glow'),'SPENDS SPARKS');
 if(kind==='route')return item(mapStopIconMarkup('flight'),'FLIGHT');
 if(kind==='rest')return item(mapStopIconMarkup('rest'),'REST · CHOOSE ONE');
 if(kind==='sites')return Object.values(MAP_STOP_TYPES).map(x=>item(mapStopIconMarkup(x.kind),x.label)).join('');
 if(kind==='dream')return item(dreamEye,'DREAM · REHEARSE');
 if(kind==='artifact')return item(artifactIcon('glow-wick'),'ARTIFACT')+ '<i class="coach-term-arrow">OR</i>'+item(resourceSymbol('glow'),'SPARKS');
 if(kind==='skills')return item(resourceSymbol('packed'),'PACKED LIGHT')+arrow+item(skillIcon({id:'main-sight',branch:'main'}),'RUN SKILL');
 if(kind==='tools')return item(skillIcon({id:'main-sight',branch:'main'}),'SKILLS')+item(companionArtSvg('collector'),'COMPANIONS')+item(dreamEye,'DREAM');
 if(kind==='life')return item(skillIcon({id:'main-efficiency',branch:'main'}),'HEART · ONE ATTEMPT');
 if(kind?.startsWith('companion:')){const role=kind.slice(10);return item(companionArtSvg(role),getCompanionAbility(role).name);}
 if(kind==='collector')return item(companionArtSvg('collector'),'COLLECTOR');
 return '';
}
