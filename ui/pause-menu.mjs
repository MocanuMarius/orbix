/** Pause menu (v1.5-pause) and Settings (v1.1-settings) in the v2.5-theme Atlas composition. Pure markup; styles in ui/waystone.css.
 * The data-action names are the ones the game's delegated click handler already dispatches. */
import {escapeHtml as esc} from './primitives.mjs?v=kindled-1';
import {menuIcon as icon} from '../menu-icons.mjs?v=kindled-1';
import {resourceSymbol} from '../game-symbols.mjs?v=kindled-1';
import {clampLevel,LEVEL_STEPS} from '../sound-level.mjs?v=kindled-1';
import {lifeHeartSvg} from '../lives.mjs?v=kindled-1';

/** One Waystone plaque. role = primary | standard | quiet | danger. Quiet and rust plaques carry no art or subtitle. */
export function waystoneSign(role,title,{action,sub='',art='',attrs=''}={}){
 const plain=role==='quiet'||role==='danger';
 const actionAttr=action?` data-action="${esc(action)}"`:'';
 return `<button type="button" class="wb-sign wb-sign-${esc(role)}"${actionAttr}${attrs?` ${attrs}`:''}>${art&&!plain?`<i class="wb-sign-art" aria-hidden="true">${art}</i>`:''}<span class="wb-sign-text"><b>${esc(title)}</b>${sub&&!plain?`<small>${esc(sub)}</small>`:''}</span></button>`;
}

/** Level control: the icon mutes or unmutes (aria-pressed = sound on), the bars are a 0-4 slider. */
export function levelControlMarkup(channel,level,{last,beat=false}={}){
 const value=clampLevel(level),name=channel==='music'?'Music':'FX',remembered=clampLevel(last)||value||3;
 const art=channel==='music'?resourceSymbol('music'):icon('sound');
 const bars=Array.from({length:LEVEL_STEPS},(_,index)=>`<i class="${index<value?'lit':''}"></i>`).join('');
 return `<div class="wb-level" data-channel="${channel}" data-name="${name}" data-level="${value}" data-last="${remembered}"${beat?' data-beat':''}><button type="button" class="wb-level-icon" data-level-mute="${channel}" aria-pressed="${value>0}" aria-label="${name} ${value>0?'on':'off'}">${art}</button><div class="wb-level-bars" data-level-bars="${channel}" role="slider" tabindex="0" aria-label="${name} volume" aria-valuemin="0" aria-valuemax="${LEVEL_STEPS}" aria-valuenow="${value}" aria-valuetext="${value?`${value} of ${LEVEL_STEPS}`:'Off'}">${bars}</div></div>`;
}

export function soundLevelsMarkup({music=3,musicLast,fx=3,fxLast}={}){
 return `<div class="wb-tabbox wb-sound" role="group" aria-label="Sound">${levelControlMarkup('music',music,{last:musicLast,beat:true})}${levelControlMarkup('fx',fx,{last:fxLast})}</div>`;
}

/** Run-status tab (left side area). Only values the caller passes are shown; nothing is invented.
 * @param {{lives?:number,maxLives?:number,spark?:string|number,sparkMax?:string|number,stored?:number}} status */
export function runStatusMarkup(status){
 if(!status)return '';
 const rows=[];
 const maxLives=Math.max(0,Math.floor(Number(status.maxLives)||0));
 if(maxLives>0&&status.lives!=null){
  const lives=Math.max(0,Math.min(maxLives,Math.floor(Number(status.lives)||0)));
  rows.push(`<div class="wb-stat" role="img" aria-label="${lives} of ${maxLives} hearts"><span class="wb-stat-hearts">${Array.from({length:maxLives},(_,index)=>lifeHeartSvg(index>=lives)).join('')}</span></div>`);
 }
 if(status.spark!=null&&status.sparkMax!=null)rows.push(`<div class="wb-stat" role="img" aria-label="Spark Meter ${esc(status.spark)} of ${esc(status.sparkMax)}">${resourceSymbol('energy')}<b>${esc(status.spark)} / ${esc(status.sparkMax)}</b></div>`);
 if(status.stored!=null)rows.push(`<div class="wb-stat" role="img" aria-label="${esc(status.stored)} Stored Sparks">${resourceSymbol('packed')}<b>${esc(status.stored)}</b></div>`);
 return rows.length?`<aside class="wb-side wb-side-left" aria-label="Your run"><div class="wb-tabbox">${rows.join('')}</div></aside>`:'';
}

/** Shared composition: woods painting, light pool, optional left tab, the paper page, optional right side area. */
export function atlasScreen({cls,label,dialog=true,left='',page='',right=''}){
 return `<div class="${cls} wb-ground"${dialog?' role="dialog" aria-modal="true"':''} aria-label="${esc(label)}"><div class="wb-world" aria-hidden="true"></div><div class="wb-shade" aria-hidden="true"></div>${left}<div class="wb-page"><div class="wb-pagelight" aria-hidden="true"></div>${page}</div>${right}</div>`;
}

export function titleMarkup(title){
 return `<div class="wb-title-row"><i class="wb-flourish" aria-hidden="true"></i><h2 class="wb-title">${esc(title)}</h2><i class="wb-flourish wb-flip" aria-hidden="true"></i></div>`;
}

/**
 * Pause menu v1.5-pause in the v2.5-theme composition.
 * @param {object} o
 * @param {boolean} o.practice   separate practice (tutorial) run: Skip practice / Exit to Menu
 * @param {boolean} o.flight     a flight is paused: Resume flight; otherwise Back to map
 * @param {boolean} o.onMap      opened from the map screen (Help subtitle names map symbols; no role=dialog, the <dialog> host has it)
 * @param {string}  o.context    context line, e.g. "ASCENSION 1 · MAP 1/3 · STOP 4/10"
 * @param {string}  o.heading    title; "Paused" unless a mock scene names itself ("Rest preview", "Lantern map preview")
 * @param {string}  o.deckLabel  "Loaned Cards" | "Deck" | "Skills"
 * @param {boolean} o.showDeck   the skills/deck entry is available
 * @param {boolean} o.showCollection relics are revealed
 * @param {object}  o.status     run status for the left tab, see runStatusMarkup
 * @param {string}  o.bonusReminder trusted markup of the optional-challenge <details>, built by the caller with escaped text;
 *                  it sits under the sound tab in the right side area
 * @param {object}  o.music      {level,last}
 * @param {object}  o.fx         {level,last}
 * @param {boolean} o.mock       mock run: changes are not saved
 */
export function pauseMenuMarkup({practice=false,flight=true,onMap=false,context='',heading='Paused',deckLabel='Deck',showDeck=true,showCollection=false,status=null,bonusReminder='',music={level:3},fx={level:3},mock=false}={}){
 const deckSub={'loaned cards':'Your practice build',deck:'Cards',skills:'Upgrades'}[String(deckLabel).toLowerCase()]||'';
 const deck=showDeck?waystoneSign('standard',deckLabel,{action:'skills',sub:deckSub,art:icon('deck')}):'';
 const collection=showCollection?waystoneSign('standard','Collection',{action:'artifacts',sub:'Relics',art:icon('collection')}):'';
 const build=deck&&collection?`<div class="wb-split">${deck}${collection}</div>`:deck||collection;
 const resume=flight?waystoneSign('primary','Resume flight',{action:'resume',sub:'Back to the passage'}):waystoneSign('primary','Back to map',{action:'close-sheet',sub:'Back to the route'});
 const leave=practice
  ?waystoneSign('quiet','Skip practice',{action:'skip-practice'})+waystoneSign('quiet','Exit to Menu',{action:'exit-menu'})
  :waystoneSign('quiet','Exit to Menu',{action:'exit-menu'})+waystoneSign('danger','Abandon run',{action:'abandon-run'});
 const title=heading||'Paused';
 const page=`<header class="wb-head">${titleMarkup(title)}${context?`<span class="wb-context">${esc(context)}</span>`:''}</header>
<nav class="wb-pause-col" aria-label="Pause menu">
${resume}
${build}
${waystoneSign('standard','Help',{action:'field-guide',sub:onMap?'Guide, glossary & map symbols':'Guide, glossary & pickups',art:icon('info')})}
${waystoneSign('standard','Settings',{action:'settings',sub:'Display & options',art:icon('tune')})}
<div class="wb-rule" role="separator"></div>
<div class="wb-split">${leave}</div>
</nav>`;
 const right=`<aside class="wb-side wb-side-right">${soundLevelsMarkup({music:music?.level,musicLast:music?.last,fx:fx?.level,fxLast:fx?.last})}${mock?'<p class="pause-bonus-rule wb-mock-note">Mock run · changes not saved</p>':''}${bonusReminder||''}</aside>`;
 return atlasScreen({cls:'pause-overlay wb-pause',label:title,dialog:!onMap,left:runStatusMarkup(status),page,right});
}

/** Repaint a rendered level control in place (keeps focus on the bars or the icon). */
export function updateLevelControl(control,level,last){
 const value=clampLevel(level),name=control.dataset.name||'';
 control.dataset.level=String(value);if(last!=null)control.dataset.last=String(clampLevel(last)||value||3);
 control.querySelectorAll('.wb-level-bars>i').forEach((bar,index)=>bar.classList.toggle('lit',index<value));
 const bars=control.querySelector('.wb-level-bars');bars?.setAttribute('aria-valuenow',String(value));bars?.setAttribute('aria-valuetext',value?`${value} of ${LEVEL_STEPS}`:'Off');
 const button=control.querySelector('.wb-level-icon');button?.setAttribute('aria-pressed',String(value>0));button?.setAttribute('aria-label',`${name} ${value>0?'on':'off'}`);
}

/** Context line under the title: "FIRST LIGHT PRACTICE · STOP 2/7" or "ASCENSION 1 · MAP 1/3 · STOP 4/10". */
export function pauseContextLine(run){
 if(!run)return '';
 const total=run.map?.length||(run.isTutorial?7:10),stop=Math.max(1,Math.min(total,(Number(run.step)||0)+1));
 const where=run.phase==='map-clear'?'REFUGE REACHED':`STOP ${stop}/${total}`;
 if(run.isTutorial)return `FIRST LIGHT PRACTICE · ${where}`;
 const map=Math.max(0,Math.min(2,Number(run.mapIndex)||0))+1;
 return `${run.testMode?'TEST · ':''}ASCENSION ${Math.max(1,Number(run.difficulty)||1)} · MAP ${map}/3 · ${where}`;
}

/**
 * Settings main panel, v1.1-settings in the Atlas composition. Three groups (Sound, Gameplay, App),
 * Back bottom left and Advanced bottom right. The <dialog> host owns the dialog role.
 * @param {object} o
 * @param {object} o.music,o.fx {level,last}
 * @param {boolean} o.lessons     lessons on (the skip-tutorial setting, inverted)
 * @param {object|null} o.speed   {options:[{value,label}],selected,note} or null to hide Speed
 * @param {string} o.installLabel 'Install game' | 'App status' | 'Update ready'
 * @param {string} o.version      GAME_VERSION
 * @param {boolean} o.showHelp    add a Help plaque (Field Guide) for Home, where there is no pause menu. It sits in
 *                                Gameplay (at most three rows there) so the page still fits 667x300.
 */
export function settingsMarkup({music={level:3},fx={level:3},lessons=true,speed=null,installLabel='Install game',version='',showHelp=false}={}){
 const row=(name,control)=>`<div class="wb-set-row"><span class="wb-set-label">${esc(name)}</span>${control}</div>`;
 const lessonsToggle=`<button type="button" class="wb-sign wb-sign-standard wb-toggle" data-action="skip-tutorial" aria-pressed="${!!lessons}"><i class="wb-sign-art" aria-hidden="true">${icon('info')}</i><span class="wb-sign-text"><b>Lessons ${lessons?'On':'Off'}</b></span></button>`;
 const selected=speed?.options?.find(option=>option.value===speed.selected)||speed?.options?.[0];
 const speedControl=speed?.options?.length?`<label class="wb-sign wb-sign-standard wb-select"><span class="wb-sign-text"><b>Speed</b><small>${esc(selected?.label||'')}${speed.note?` · ${esc(speed.note)}`:''}</small></span><select id="cruising-speed" data-cruising-speed aria-label="Cruising speed">${speed.options.map(option=>`<option value="${esc(option.value)}"${option.value===speed.selected?' selected':''}>${esc(option.label)}</option>`).join('')}</select></label>`:'';
 const install=`<button type="button" class="wb-sign wb-sign-standard install-control" data-action="install-game"><span class="wb-sign-text"><b data-install-label>${esc(installLabel)}</b><small>Play offline</small></span></button>`;
 const updates=`<button type="button" class="wb-sign wb-sign-standard build-refresh" data-action="refresh-build"><span class="wb-sign-text"><b>Updates</b><small data-build-label aria-live="polite">Version ${esc(version)}</small></span></button>`;
 const credits=`<a class="wb-sign wb-sign-standard" href="nature-credits.html" target="_blank" rel="noopener"><span class="wb-sign-text"><b>Credits</b><small>Art & music</small></span></a>`;
 const help=showHelp?waystoneSign('standard','Help',{action:'field-guide',sub:'Guide & glossary'}):'';
 const page=`<header class="wb-head">${titleMarkup('Settings')}</header>
<div class="settings-body wb-set-grid">
<section aria-labelledby="wb-set-sound"><h3 class="wb-set-group" id="wb-set-sound">Sound</h3>${row('Music',levelControlMarkup('music',music?.level,{last:music?.last,beat:true}))}${row('FX',levelControlMarkup('fx',fx?.level,{last:fx?.last}))}</section>
<section aria-labelledby="wb-set-gameplay"><h3 class="wb-set-group" id="wb-set-gameplay">Gameplay</h3>${lessonsToggle}${speedControl}${help}</section>
<section aria-labelledby="wb-set-app"><h3 class="wb-set-group" id="wb-set-app">App</h3>${install}${updates}${credits}</section>
</div>
<footer class="wb-set-foot">${waystoneSign('quiet','Back',{action:'settings-back'})}${waystoneSign('quiet','Advanced',{action:'settings-advanced'})}</footer>`;
 return atlasScreen({cls:'wb-settings',label:'Settings',dialog:false,page});
}
