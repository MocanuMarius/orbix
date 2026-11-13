import {getBiome} from './biomes.mjs?v=fuel-depth-1';
import {collectionMarkup,collectionItemMarkup} from './collection-view.mjs?v=fuel-depth-1';
import {restBenefitsMarkup} from './rest-choice-view.mjs?v=fuel-depth-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=fuel-depth-1';
import {artifactDescription} from './artifact-copy.mjs?v=fuel-depth-1';
import {startResumeCountdown} from './resume-countdown.mjs?v=fuel-depth-1';
import {nextOnboardingLesson,markOnboardingSeen,resetOnboarding,noteOnboardingPrompt,noteOnboardingProgress,onboardingFeatureAvailable,onboardingFlightPlan} from './onboarding.mjs?v=fuel-depth-1';
import {flightRewardMarkup} from './reward-screen.mjs?v=fuel-depth-1';
import {flightEntryMarkup,resumeGateMarkup,waitForFlightEntry} from './flight-entry.mjs?v=fuel-depth-1';
import {TUTORIAL_TOPICS,topicSteps} from './tutorial-curriculum.mjs?v=fuel-depth-1';
import {tutorialVisualMarkup} from './tutorial-visuals.mjs?v=fuel-depth-1';
import {deathScreenMarkup} from './death-screen.mjs?v=fuel-depth-1';
import {createRestInspectorState} from './rest-inspector.mjs?v=fuel-depth-1';
import {choiceScene} from './choice-art.mjs?v=fuel-depth-1';
import {contextualFlightNotice} from './contextual-events.mjs?v=fuel-depth-1';
import {createMusic} from './music.mjs?v=fuel-depth-1';
import {resourceSymbol} from './game-symbols.mjs?v=fuel-depth-1';
import {nextArtifactNotice,artifactUseLesson} from './artifact-lessons.mjs?v=fuel-depth-1';
import {getArtifactInfo,CONSUMABLE_ARTIFACTS,EVOLVING_ARTIFACTS} from './artifact-info.mjs?v=fuel-depth-1';
import {checkpointTutorialLesson,observedFlightLesson,flightEffectLesson} from './tutorial-steps.mjs?v=fuel-depth-1';
import {ARTIFACT_ENGINE_RULES} from './artifact-effects.mjs?v=fuel-depth-1';
import {rewardThemeMarkup,encounterIntent,encounterIntentMarkup,artifactOfferMarkup,artifactDetailMarkup,artifactRarityLabel,artifactSummaryMarkup,artifactLifetimeMarkup} from './replay-ui.mjs?v=fuel-depth-1';
import {installLandscapeMode} from './landscape.mjs?v=fuel-depth-1';
import {drawLandscapeMap} from './landscape-map.mjs?v=fuel-depth-1';
import {attachDream,dreamRestMarkup,dreamIndicatorMarkup} from './dream.mjs?v=fuel-depth-1';
import {chooseFlightReward,getAvailableUpgrades,acknowledgeVictory,artifactSynergy} from './model.mjs?v=fuel-depth-1';
import {STARTING_CONDENSED_GLOW,formatGlow,glowPercent,getGlowCapacity,glowText} from './vitality.mjs?v=fuel-depth-1';
import {glowGaugeMarkup,updateGlowGauge} from './glow-ui.mjs?v=fuel-depth-1';
import {edgingPulseMarkup,updateEdgingPulse} from './edging-ui.mjs?v=fuel-depth-1';
import {branchTreeMarkup} from './skill-tree.mjs?v=fuel-depth-1';
import {livesMarkup,lifeHeartSvg} from './lives.mjs?v=fuel-depth-1';
import {mainWispTreeMarkup} from './wisp-tree.mjs?v=fuel-depth-1';
import {attachFlightPerformance,downloadPerformanceReport} from './flight-performance.mjs?v=fuel-depth-1';
import {getChallengePreview} from './flight-challenges.mjs?v=fuel-depth-1';
import {homeMenuMarkup,runProgressMarkup,unlockPreviewMarkup} from './run-menu.mjs?v=fuel-depth-1';
import {skillIcon,artifactIcon} from './upgrade-icons.mjs?v=fuel-depth-1';
import {TERRAINS,SKILLS,ARTIFACTS,newState,loadState,saveState,createRun,canChooseStartingSkill,chooseStartingSkill,setTestOverride,grantTestCondensedGlow,getStartingCompanion,setStartingCompanion,startTutorial,leaveTutorial,getChoices,getRouteMapState,selectNode,beginFlightAttempt,retryFlight,finishFlight,getSupportChoices,resolveSupport,settleCheckpoint,bankRun,advanceMap,previewGlowReward,getSkillCost,getSkillPrice,getSkillWallet,getSkillLockReason,suspendRun,abandonRun,isSkillRevealed,canBuyCheckpointSkills,buyCheckpointSkill,getRunModifiers,canChangeCompanion,setCompanions,sellArtifact,canSellArtifact,getArtifactSalvageValue} from './model.mjs?v=fuel-depth-1';
import {WispFlight} from './flight.mjs?v=fuel-depth-1';
import {COMPANION_ABILITIES,getCompanionAbility,getCompanionUnlock,normalizeCompanionRole} from './companion-abilities.mjs?v=fuel-depth-1';
import {companionArtSvg} from './companion-art.mjs?v=fuel-depth-1';
import {boostControlMarkup,updateBoostControl} from './boost-control.mjs?v=fuel-depth-1';
import {campaignStrip,bossSigil} from './campaign-ui.mjs?v=fuel-depth-1';
import {resolveLevelIdentity} from './level-catalog.mjs?v=fuel-depth-1';
import {levelMapGlyph,levelMapPreview} from './level-map-art.mjs?v=fuel-depth-1';
import {getAscentInfo} from './ascent.mjs?v=fuel-depth-1';
import {getRouteForecast} from './route-forecast.mjs?v=fuel-depth-1';
import {MAP_STOP_TYPES,getMapStopInfo,mapStopIconMarkup,getEventScenarios} from './map-guide.mjs?v=fuel-depth-1';
import {formatFlightDuration} from './level-length.mjs?v=fuel-depth-1';
import {condensedIconMarkup} from './afterglow-ui.mjs?v=fuel-depth-1';
import {pickupGuideMarkup,pickupLesson} from './pickup-guide.mjs?v=fuel-depth-1';
import {pickupArtSvg} from './pickup-art.mjs?v=fuel-depth-1';
import {createTutorialCoach} from './tutorial-coach.mjs?v=fuel-depth-1';
import {getTutorialWorldFocus} from './tutorial.mjs?v=fuel-depth-1';
const app=document.querySelector('#app'),header=document.querySelector('#header');
const mockMode=new URLSearchParams(location.search).get('mock')==='rest';
let state;if(mockMode)state=createRestInspectorState();else try{state=loadState(localStorage)}catch{state=newState()}
let launchTicket=0,flightLoading=false,resumeArmed=false,cancelCountdown=null,rewardAnimating=false;
let screen='home',engine=null,paused=false,hud=null,treeBranch='main',lesson=null,lastSnapshot=null;
let selectedDifficulty=state.profile.difficulty||1;let mainSkillSelection='main-efficiency';
const performanceEnabled=new URLSearchParams(location.search).get('perf')==='1';let flightPerformance=null;
let muted=false;try{muted=localStorage.getItem('emberwing-muted')==='true'}catch{}
const music=createMusic();
function switchRestInspector(enabled){if(engine){pauseFlight();suspendRun(state);}persist();const url=new URL(location.href);url.pathname=url.pathname.replace(/rest-scene\.html$/,'index.html');url.searchParams.delete('scenario');if(enabled)url.searchParams.set('mock','rest');else url.searchParams.delete('mock');if(window.parent!==window)window.parent.postMessage({type:'wisp-mock-mode',enabled},location.origin);location.assign(url.href);}
function mockControl(){return `<button class="mock-toggle" data-action="mock-toggle" aria-pressed="${mockMode}">${mapStopIconMarkup('rest')}REST PREVIEW · ${mockMode?'ON':'OFF'}</button>`}
function audioControls(){return `<div class="audio-controls"><button class="secondary" data-action="music" aria-pressed="${music.enabled}">${resourceSymbol('music')}MUSIC ${music.enabled?'ON':'OFF'}</button><button class="secondary" data-action="mute" aria-pressed="${!muted}">${icon(muted?'mute':'sound')}FX ${muted?'OFF':'ON'}</button></div>`}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Shared original icons are inserted here during source assembly.

const iconPaths={
 flame:'<path d="M12 2c1 6 7 6 7 12a7 7 0 0 1-14 0c0-3 2-5 4-7-1 4 0 6 2 7-2-5 1-8 1-12Z"/><path d="M12 12c0 3 3 3 3 6a3 3 0 0 1-6 0c0-2 2-3 3-6Z"/>',
 wing:'<path d="M9 3h6v3h3v6h3v6h-3v3H6v-3H3v-6h3V6h3Z"/><path d="M9 12v3m6-3v3"/>',
 route:'<path d="M6 20V9a4 4 0 0 1 4-4h8M6 14h8a4 4 0 0 1 4 4v2"/><circle cx="6" cy="20" r="2"/><path d="m15 2 3 3-3 3"/><circle cx="18" cy="20" r="2"/>',
 cards:'<rect x="7" y="3" width="13" height="17" rx="2"/><path d="m4 5-2 1 3 16 11-2M13.5 7 16 11l-2.5 4L11 11l2.5-4Z"/>',
 ember:'<path d="m12 2 6 8-6 12-6-12 6-8Z"/><path d="M6 10h12m-6-8v20"/>',
 arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
 star:'<path d="m12 2 2.7 6.3 6.8.7-5.1 4.5 1.5 6.5-5.9-3.5L6.1 20l1.5-6.5L2.5 9l6.8-.7L12 2Z"/>',
 shield:'<path d="m12 2 8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 wisp:'<path d="M8 3h8v2h3v3h2v8h-2v3h-3v2H8v-2H5v-3H3V8h2V5h3Z"/><path d="M9 8h6v2h2v5h-2v2H9v-2H7v-5h2Z" fill="currentColor" stroke="none"/>',
 wind:'<path d="M3 8h11a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M5 17h6a2 2 0 1 1-2 2"/>',
 leaf:'<path d="M20 3C7 2 2 7 4 15c8 5 16 0 16-12Z"/><path d="M3 21 17 7M8 16l1-7m4 2h5"/>',
 ruins:'<path d="M3 21h18M4 7h16M7 7v14m10-14v14M3 7l9-5 9 5M5 11h4m6 0h4"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 sound:'<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 5 6m0-6-5 6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 moon:'<path d="M20.5 14A9 9 0 0 1 10 3a9 9 0 1 0 10.5 11Z"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 tune:'<path d="M3 6h18M3 12h18M3 18h18M8 3v6m8 0v6M9 15v6"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>'
};
function icon(name,cls=''){const k=({'✧':'wisp','✦':'sun','◈':'ember','ϟ':'wind','⌄':'wing','⌃':'wing','»':'wind','◇':'flame','♢':'wind','≈':'wind','♨':'flame','♡':'flame',boost:'flame',survival:'wisp',collection:'wisp',mobility:'wing',spirit:'wisp',ash:'flame',speed:'wind',phoenix:'flame',rebirth:'sun',control:'wing'}[String(name).toLowerCase()]||name);return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[k]||iconPaths.star}</svg>`}

iconPaths.ember='<circle cx="8" cy="8" r="3"/><circle cx="16" cy="11" r="3"/><circle cx="10" cy="17" r="3"/>';
iconPaths.flame='<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/>';
const allRoles=()=>Object.values(COMPANION_ABILITIES);
const runLength=(r=state.run)=>r?.map?.length||7;
const mapHeight=(r=state.run)=>runLength(r)*160+225;
const roleFleet=()=>[normalizeCompanionRole((state.run&&(state.run.phase!=='ended'||state.run.victoryPending)?state.run.companions?.[0]||state.run.companionRole:state.settings.companions?.[0])||'collector')];
const featureAvailable=feature=>onboardingFeatureAvailable(state.profile,state.run,feature);
function stopCountdown(){cancelCountdown?.();cancelCountdown=null;}

const socketLock='<svg viewBox="0 0 16 18" fill="none" aria-hidden="true"><path d="M4 7V4h2V2h4v2h2v3M2 7h12v9H2zM8 10v3" stroke="currentColor" stroke-width="1.5" shape-rendering="crispEdges"/></svg>';
const artifactById=id=>ARTIFACTS[id]||Object.values(ARTIFACTS).find(a=>a.id===id);
function persist(){if(mockMode)return;try{saveState(state,localStorage)}catch{}}
function notify(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),2300)}
function menuButton(){return `<button class="game-menu-trigger" data-action="menu" aria-label="Game menu${screen==='flight'?', pause flight':''}">${icon('tune')}<span>MENU</span></button>`}
function renderHeader(){
 if(screen==='death'){header.innerHTML='';return;}
 const r=state.run,inside=screen!=='home'&&r&&(r.phase!=='ended'||r.victoryPending),route=screen==='map';
 header.innerHTML=`<div class="game-top-left">${screen==='home'?'<span class="header-wisp">W</span>':`<button class="game-round back-icon" data-action="${['briefing','support'].includes(screen)?'back-route':'exit-menu'}" aria-label="${['briefing','support'].includes(screen)?'Back to route':'Exit to menu'}">${icon('arrow')}</button>`}${route?`<div class="route-heading">${r.isTutorial?'<span>Practice</span>':`<span>Ascension ${r.difficulty}</span><b>Map ${r.mapIndex+1} / 3</b>`}</div>`:''}</div><div class="header-end">${route?livesMarkup(r):''}${inside&&featureAvailable('skills')?`<button class="bank saved-wallet-bank ember-wallet condensed-wallet" data-action="skills" aria-label="Skill tree · ${Math.floor(getSkillWallet(state).condensedGlow||0)} Packed Sparks"><span>${condensedIconMarkup()}</span><b>${Math.floor(getSkillWallet(state).condensedGlow||0)}</b></button>`:''}${menuButton()}</div>`;
}
function destroyFlight(){stopCountdown();launchTicket++;flightLoading=false;resumeArmed=false;engine?.destroy();engine=null;hud=null;paused=false;document.body.classList.remove('playing');hideLesson()}
function render(view=screen){screen=view;document.body.dataset.screen=screen;document.body.dataset.companionRole=normalizeCompanionRole(roleFleet()[0]);document.body.classList.toggle('playing',screen==='flight');renderHeader();const views={home:renderHome,map:renderMap,briefing:renderBriefing,support:renderSupport,retry:renderRetry,death:()=>deathScreenMarkup(state.run),'map-clear':renderMapClear,result:renderResult,victory:renderVictory,'rest-prep':renderRestPrep};app.innerHTML=(views[screen]||renderHome)();if(screen==='map')drawMap();requestAnimationFrame(()=>{if(screen==='home'&&state.updateNotice){const notice=state.updateNotice;delete state.updateNotice;persist();openSheet(`<h2>Your game has changed</h2><p class="run-pause-note">${esc(notice)}</p><button class="primary" data-action="close-sheet">Got it</button>`,'run-confirm-sheet');return;}if(screen==='death')setTimeout(()=>{if(screen==='death')guideScreen('death')},1850);else guideScreen(screen)})}
function goToRun(){const r=state.run;if(!r)return render('home');if(r.deathPending)return render('death');if(r.victoryPending){settleCheckpoint(state);persist();return render('victory')}if(r.phase==='map'&&r.restReady)return render('rest-prep');if(r.phase==='ended'){settleCheckpoint(state);bankRun(state);persist();render('result')}else if(r.phase==='map-clear'){settleCheckpoint(state);persist();render('map-clear')}else render(({map:'map',briefing:'briefing',support:'support',retry:'retry'}[r.phase])||'map')}
function beginRun(replace=false){if((state.run&&(state.run.phase!=='ended'||state.run.victoryPending))&&!replace)return goToRun();closeSheet();destroyFlight();if(state.run?.isTutorial)leaveTutorial(state);if((state.run&&(state.run.phase!=='ended'||state.run.victoryPending)))abandonRun(state);state.run=createRun(state.settings.testOverride?{...state.profile,difficulty:Math.max(6,state.profile.difficulty||1)}:state.profile,undefined,selectedDifficulty);if(state.settings.testOverride)setTestOverride(state,true);setCompanions(state.run,[getStartingCompanion(state)]);if(state.profile.onboarding?.replayIntro){state.profile.onboarding.stage=0;state.run.onboardingIntroReplay=true;}treeBranch='main';mainSkillSelection='main-efficiency';persist();goToRun()}
function requestNewGame(){if(!state.run||state.run.phase==='ended')return beginRun();pauseFlight();openSheet(`<h2>Start a new game?</h2><p class="run-pause-note">This abandons your current three-map run. Its skills and Packed Sparks reset. Permanent unlocks stay; artifact effects reset.</p><div class="run-pause-actions"><button class="secondary" data-action="close-sheet">Keep current run</button><button class="primary" data-action="confirm-new-game">Abandon & start new</button></div>`,'run-confirm-sheet')}
function exitToMenu(){if(engine?.dream?.mode==='record'){closeSheet();destroyFlight();goToRun();return;}closeSheet();if(state.run?.isTutorial)return exitTutorial();suspendRun(state);destroyFlight();persist();render('home')}
function requestAbandon(){if(state.run?.isTutorial)return exitTutorial();pauseFlight();openSheet(`<h2>Abandon this run?</h2><p class="run-pause-note">Your run skills and unspent Packed Sparks are lost. Permanent unlocks stay; artifact effects reset. To continue later, use Exit to Menu instead.</p><div class="run-pause-actions"><button class="secondary" data-action="close-sheet">Keep playing</button><button class="primary" data-action="confirm-abandon">Abandon run</button></div>`,'run-confirm-sheet')}
function showUnlocks(){pauseFlight();const unlocked=state.profile.difficulty||1;openSheet(`<h2>Companion unlocks</h2><p class="run-pause-note">Clear all three maps to unlock the next ascension and its companion. Choose your starter at the beginning of a run; change at rests.</p><div class="unlock-roster">${allRoles().map(role=>`<article>${companionArtSvg(role.id)}<div><strong>${esc(role.name)}</strong><p>${role.unlockDifficulty<=unlocked?'UNLOCKED':`CLEAR ASCENSION ${role.unlockDifficulty-1}`}</p><small>${esc(glowText(role.description,getGlowCapacity(state.run||{})))}</small></div></article>`).join('')}</div><button class="primary" data-action="close-sheet">Back</button>`,'unlock-sheet')}
function enterTutorial(){closeSheet();if(engine){pauseFlight();suspendRun(state)}if(!startTutorial(state)){if(state.run?.isTutorial)goToRun();return;}destroyFlight();persist();goToRun()}
function exitTutorial(){if(!leaveTutorial(state))return;closeSheet();destroyFlight();persist();render('home')}
function endRun(){closeSheet();destroyFlight();abandonRun(state);state.run=null;persist();render('home')}
function backRoute(){const r=state.run;if(!r||r.attemptActive||!['support','briefing'].includes(r.phase))return;r.path=r.path.filter(id=>id!==r.current?.id);r.current=null;r.phase='map';persist();goToRun()}
function objectiveStrip(text,symbol='route'){return `<div class="objective-strip">${icon(symbol)}<span>${esc(text)}</span></div>`}
function nodeLocation(n){return resolveLevelIdentity(n?.levelId,n?.terrain||'ruins',`${state.run?.seed}-${n?.id}`)}
function currentAscent(n=state.run?.current){return getAscentInfo(n||{row:state.run?.step||0,difficulty:state.run?.difficulty||1},!!state.run?.isTutorial)}
function fleetArt(ids=roleFleet(),cls=''){return `<div class="fleet-orbs ${cls}">${ids.map(id=>`<span title="${esc(getCompanionAbility(id).name)}">${companionArtSvg(id)}</span>`).join('')}</div>`}
function prepOpen(){return !!(state.run&&(state.run.phase!=='ended'||state.run.victoryPending))&&canChangeCompanion(state.run)}
function tutorialCheckpoint(){return state.run?.isTutorial?`<div class="tutorial-checkpoint"><button data-action="field-guide">LESSONS</button><button data-action="skip-practice">Skip practice ${icon('arrow')}</button></div>`:''}
function artifactArt(id){return artifactIcon(id)}
function artifactsRevealed(){return !!state.run&&featureAvailable('artifacts')}
function artifactCollectionDock(){const ids=state.run?.artifacts||[];return artifactsRevealed()&&ids.length?`<button class="collection-dock" data-action="artifacts" aria-label="Inspect collected artifacts">${ids.slice(0,4).map(artifactArt).join('')}<span>Collection · ${ids.length}</span></button>`:'';}

let dreamReady=null,collectionPage=0;

function renderVictory(){return flightRewardMarkup(state,{artifactArt,upgradeCount:getAvailableUpgrades(state).length,skillsAvailable:featureAvailable('skills')});}
function claimFlightReward(id){
 if(engine||!chooseFlightReward(state,id))return false;
 closeSheet();persist();render('victory');
 const card=app.querySelector('[data-reward-artifact]');if(card&&!matchMedia('(prefers-reduced-motion:reduce)').matches)card.animate([{opacity:.4,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],{duration:380,easing:'ease-out'});
 return true;
}
function keepFlightReward(id){return claimFlightReward(id);}

function takeSupport(index,confirmedArtifact=null){const offeredArtifact=getSupportChoices(state.run,state.profile)[index]?.effect?.sell;if(offeredArtifact&&confirmedArtifact!==offeredArtifact){if(confirmedArtifact){notify('This forge offer has changed.');return;}return requestArtifactSalvage(offeredArtifact,index);}if(confirmedArtifact&&!offeredArtifact){notify('This forge offer is no longer available.');return;}closeSheet();const before=state.run.lastEvent;if(!resolveSupport(state.run,index,state.profile)){notify('Not enough resources, or this offer is no longer available.');return;}settleCheckpoint(state);persist();goToRun();if(confirmedArtifact)showForgeFeedback(confirmedArtifact,getArtifactSalvageValue(confirmedArtifact));const outcome=state.run.lastEvent;if(outcome&&outcome!==before)openSheet(`<div class="event-outcome-art">${outcome.face?`<span class="dice-face" aria-label="Rolled ${outcome.face}">${['','⚀','⚁','⚂','⚃','⚄','⚅'][outcome.face]}</span>`:icon('star')}</div><h2>${esc(outcome.title)}</h2><p>${esc(outcome.message)}</p><button class="primary" data-action="close-sheet">Continue</button>`,'event-outcome')}
function previewNode(id){
 const r=state.run;if(!r||engine)return;const n=r.map.flat().find(n=>n.id===id);if(!n)return;
 const info=getMapStopInfo(n),available=getChoices(r).some(choice=>choice.id===id),support=n.type==='support',loc=support?null:nodeLocation(n),biome=getBiome(n)||getBiome(loc),bonuses=(r.artifacts||[]).map(id=>({id,text:artifactSynergy({...r,current:n},id)})).filter(item=>item.text),duration=Math.round(Number(n.duration)||0);
 const reward=support?n.rewardPreview||n.reward||'Choose a site benefit':n.boss?(r.mapIndex===2?'Choose one permanent artifact unlock':'20 Packed Sparks + overflow · choose one artifact'):n.elite?'20 Packed Sparks + overflow · choose one artifact':'20 Packed Sparks + overflow';
 openSheet(`<section class="route-inspection"><div class="route-inspection-art">${mapStopIconMarkup(n)}</div><div class="route-inspection-copy"><small>${available?'REACHABLE NOW':'ROUTE PREVIEW'}${n.boss?' · GUARDIAN':n.elite?' · ELITE':''}</small><h2>${esc(n.name)}</h2>${!support?`<p><b>${esc(biome?.name||n.biomeName||loc.name)}</b> · ${esc(n.lengthLabel||'Standard')} · ${duration}s</p><p>${esc(n.interactionHint||biome?.interactionHint||info.summary)}</p><p>${esc(n.lengthChallenge||'')}${n.challenge?` · ${esc(n.challenge)}`:''}</p>`:`<p>${esc(info.summary)}</p>`}<p class="route-inspection-reward">${resourceSymbol('packed')} ${esc(reward)}</p>${bonuses.length&&!support?`<details class="route-build-bonuses"><summary>Your build · ${bonuses.length} effects</summary>${bonuses.map(item=>`<p>${artifactArt(item.id)}<b>${esc(ARTIFACTS[item.id]?.name)}</b> ${esc(item.text)}</p>`).join('')}</details>`:''}</div><footer><button class="secondary" data-action="close-sheet">Back to route</button>${available?`<button class="primary" data-action="node" data-id="${esc(id)}">Travel →</button>`:'<span>Inspect only · follow the connected path</span>'}</footer></section>`,'route-inspection-sheet');
}

function beginDream(){
 if(!featureAvailable('dream'))return;
 const hint=nextOnboardingLesson('dream',{profile:state.profile,run:state.run});
 if(hint&&!lesson){noteOnboardingPrompt(state.run,'dream');startLesson(hint.id,hint.steps,()=>launch(false,true));persist();return;}
 launch(false,true);
}
function dreamFinished(result){dreamReady=result;paused=true;const sheet=openSheet(`<h2>${result.valid?'Dream remembered':'Dream interrupted'}</h2><p>${result.valid?'Keep this opening, or rehearse it again. No run resources were spent.':'Try another path. Your run is untouched.'}</p><div class="run-pause-actions"><button class="secondary" data-action="dream-retry">Dream again</button>${result.valid?'<button class="primary" data-action="dream-preset">Preset this dream</button>':''}<button class="secondary" data-action="dream-back">Back to rest</button></div>`,'dream-result');sheet.addEventListener('cancel',e=>e.preventDefault())}
function dreamAwake(){paused=true;document.querySelector('#pause-layer').innerHTML=`<button class="dream-awakening" data-action="dream-wake"><svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M8 5h5v22H8zM19 5h5v22h-5z"/></svg><span>TAP TO WAKE</span><small>Then tap again to Lift</small></button>`}
function wakeDream(){if(engine?.dream?.phase==='awakening')beginResumeCountdown()}

function renderHome(){return homeMenuMarkup({profile:state.profile,run:state.run,selectedDifficulty,testOverride:state.settings.testOverride,testStarterCompanion:getStartingCompanion(state)})+testControls()}
function forecastMarkup(n){if(state.run?.isTutorial||!featureAvailable('artifacts'))return '';const f=getRouteForecast(state.run,n)||{};return `<div class="route-consequences ${!f.restReachable?'rest-scarce':''}"><div><b>${mapStopIconMarkup('rest')}${f.nextRestDistance===0?'REST HERE':f.restReachable?`${f.restGuaranteed?'REST IN':'REST OPTION'} ${f.nextRestDistance} ${f.nextRestDistance===1?'STOP':'STOPS'}`:'NO REST AHEAD'}</b><span>${n.type==='support'?(n.kind==='camp'?'RECOVERY · TRAINING':'A TRADE, NO TRAINING'):esc(encounterIntent(n)?.name||n.fuelPreview||'CONSERVE SPARKS')}</span></div>${rewardThemeMarkup(n)}<div class="forecast-path">${(f.nextStops||[]).slice(0,3).map(stop=>`<span title="${esc(stop.name)}">${mapStopIconMarkup(stop)}<small>${esc(getMapStopInfo(stop).label)}</small></span>`).join('<i>OR</i>')}</div></div>`}
function renderMap(){const r=state.run;return `<section class="game-map-screen map-v2 minimal-map">${tutorialCheckpoint()}${!r.isTutorial&&r.mapIndex===0&&r.step===0&&!r.path.length?`<button class="starter-companion" data-action="companions">${fleetArt()}<span>CHOOSE STARTER COMPANION</span>${icon('arrow')}</button>`:''}${canChooseStartingSkill(r)?`<button class="starter-companion" data-action="bond-tree">STARTER SKILL + ${STARTING_CONDENSED_GLOW} PACKED SPARKS</button>`:''}<button class="checkpoint-skill-button" data-action="skills">${icon('route')} SKILL TREE</button><div class="map-atlas-frame"><div class="game-map-viewport" id="map-viewport"><svg id="journey-map" class="game-world-map" viewBox="0 0 390 ${mapHeight(r)}"></svg></div></div><div class="map-build-dock">${r.restReady?`<div class="rest-services"><button data-action="skills">${icon('route')}SKILL TREE</button><button data-action="companions">${fleetArt()}COMPANIONS</button>${artifactsRevealed()?`<button data-action="artifacts">${icon('star')}ARTIFACTS</button>`:''}</div>`:''}${r.restReady?dreamRestMarkup(r,getChoices(r)[0]):''}${artifactCollectionDock()}</div></section>`}
function plannedChallengesMarkup(n){if(state.run?.isTutorial)return '';if(n.encounterFamily||n.boss)return encounterIntentMarkup(n,{optionalChallenge:true});const preview=getChallengePreview({...n,stage:n.row});return `<div class="flight-challenge-preview" aria-label="Planned terrain challenges">${preview.patterns.map(pattern=>`<span>${icon(pattern.type==='fuel-pocket'?'flame':pattern.type==='draft-crossing'?'wing':'wisp')}${esc(pattern.name)}</span>`).join('')}${n.challengeId?`<small class="optional-challenge">Optional: ${esc(n.challenge||'Clear the challenge')} · Better relic odds</small>`:''}</div>`}
function flightCue(snapshot){if(snapshot.completing)return 'PASSAGE CLEARED';if(snapshot.dying)return snapshot.event||'The light scatters…';const challenge=snapshot.flightChallenge;if(!challenge)return snapshot.event||'';if(challenge.phase==='warning')return challenge.type==='dark-cave'?'CAVE AHEAD · LUMINANCE NARROWS':challenge.type==='draft-crossing'?'DRAFT AHEAD · CHOOSE YOUR CROSSING':challenge.pocket?.side==='ceiling'?'FUEL POCKET ABOVE':'FUEL POCKET AHEAD';if(challenge.phase==='active'&&challenge.progress<.2)return challenge.name;return snapshot.event||''}
function renderBriefing(){const r=state.run,n=r.current,loc=nodeLocation(n);return `<section class="passage-briefing ${n.boss?'boss-brief':''}"><div class="passage-art location-art" data-location="${loc.id}">${mapStopIconMarkup(n)}</div><div class="passage-choice"><span class="passage-kind">${esc(n.biomeName||loc.name||'')}${n.boss?' · BOSS':n.elite?' · ELITE':''}</span><h1>${esc(n.name)}</h1>${forecastMarkup(n)}${contextualFlightNotice(r,n)?`<p class="passage-notice">${esc(contextualFlightNotice(r,n))}</p>`:''}${r.flame<21?'<p class="passage-notice">Low Sparks · find fuel early</p>':''}<div class="passage-actions">${getFlightClearReward(n)?`<span class="passage-clear-pay" aria-label="Clear reward: ${getFlightClearReward(n)} Packed Sparks">${resourceSymbol('packed')}<b>+${getFlightClearReward(n)}</b><small>on clear</small></span>`:''}${r.restReady?dreamRestMarkup(r,n):''}<button class="primary enter-passage" data-action="launch">Enter ${icon('arrow')}</button></div></div></section>`}
function supportValues(effect={},{compact=false}={}){const r=state.run,items=[],add=(kind,value,label)=>items.push(`<span class="boon-resource-value" title="${label}" aria-label="${value} ${label}">${kind==='heart'?lifeHeartSvg():resourceSymbol(kind)}<b>${value}</b>${compact?'':`<small>${label}</small>`}</span>`);if(effect.flame){const maximum=getGlowCapacity(r)+Math.max(0,Number(effect.glowCapacity)||0),amount=effect.flame>=100?maximum-r.flame:effect.flame>0?Math.min(effect.flame,maximum-r.flame):effect.flame;add('glow',compact?`${amount>=0?'+':''}${formatGlow(amount)}`:effect.flame>=100?'FULL':`${amount>0?'+':''}${formatGlow(amount)}`,'Sparks')}if(effect.pickupGlow){const p=previewGlowReward(r,effect.pickupGlow,{removeArtifact:effect.sell});if(p.restored>0)add('glow','+'+formatGlow(p.restored),'Sparks');if(p.condensedGlow>0)add('packed','+'+p.condensedGlow,'Packed Sparks');if(!p.restored&&!p.condensedGlow)add('glow','+'+formatGlow(effect.pickupGlow),'Sparks')}if(effect.packedLight)add('packed','+'+effect.packedLight,'Packed Sparks');if(effect.salvagePackedLight)add('packed','+'+effect.salvagePackedLight,'Packed Sparks');if(effect.condensedCost)add('packed','−'+effect.condensedCost,'Packed Sparks');if(effect.lives)add('heart','+'+effect.lives,'hearts');return items.join('')}

function restGlowReadout(r){const max=getGlowCapacity(r);return `<span class="rest-glow" aria-label="${formatGlow(r.flame)} of ${formatGlow(max)} Energy">${resourceSymbol('glow')}<b>${formatGlow(r.flame)}<small>/${formatGlow(max)}</small></b></span>`}
function renderRestBenefits(r,n,choices){return restBenefitsMarkup(r,n,choices)}
function renderSupport(){const r=state.run,n=r.current,choices=getSupportChoices(r,state.profile);if(n.kind==='camp')return renderRestBenefits(r,n,choices);return `<section class="center-view compact-support">${campaignStrip(r,state.profile)}${tutorialCheckpoint()}<div class="support-symbol">${mapStopIconMarkup(n)}</div><h1>${esc(n.name)}</h1><div class="support-vitals">${livesMarkup(r)}<span class="glow-label">${icon('flame')}${formatGlow(r.flame,getGlowCapacity(r),0)} SPARKS</span></div>${forecastMarkup(n)}<div class="support-offers">${choices.map((c,i)=>`<button class="route-choice boon-choice" data-action="support" data-index="${i}"><span class="boon-emblem">${c.effect?.lives?lifeHeartSvg():c.effect?.flame||c.effect?.pickupGlow?icon('flame'):c.effect?.condensedCost||c.effect?.salvagePackedLight?condensedIconMarkup():icon('star')}</span><h3>${esc(c.title)}</h3><div class="boon-values">${supportValues(c.effect)}</div><p>${esc(c.description)}</p>${c.effect?.upgrade?`<p class="support-upgrade-effect">${esc(glowText(SKILLS[c.effect.upgrade]?.consequence||SKILLS[c.effect.upgrade]?.description||'',getGlowCapacity(r)))}${SKILLS[c.effect.upgrade]?.choiceGroup?' · Commits this path for the run.':''}</p>`:''}</button>`).join('')}</div>${n.kind==='camp'?'<p class="rest-service-note">Choose a boon to open training and companion preparation.</p>':artifactsRevealed()?`<button class="secondary" data-action="artifacts">${icon('star')}Artifacts & Forge</button>`:''}</section>`}

function renderRestPrep(){const r=state.run,n=r.map.flat().find(x=>x.id===r.lastRest?.nodeId)||{name:'Rest',kind:'camp'};return restBenefitsMarkup(r,n,[],{nextNode:getChoices(r)[0]});}

function renderRetry(){const r=state.run;return `<section class="center-view compact-retry"><h1>Light lost</h1><div class="retry-level-label">${esc(r.current?.name)}</div><div class="retry-lives">${livesMarkup(r)}</div><button class="primary" data-action="retry">Retry this passage ${icon('arrow')}</button><button class="secondary" data-action="abandon-run">Abandon run</button></section>`}
function renderMapClear(){const r=state.run;return `<section class="center-view run-summary map-clear-screen"><h1>Map ${r.mapIndex+1} cleared</h1><p>${esc(r.mapName)}</p><div class="map-clear-carry">${livesMarkup(r)}<span class="glow-label">${icon('flame')}${formatGlow(r.flame,getGlowCapacity(r),0)} SPARKS</span></div>${fleetArt()}${artifactCollectionDock()}<p class="map-clear-note">Your fuel, lives and build continue.</p><button class="primary" data-action="next-map">MAP ${r.mapIndex+2} ${icon('arrow')}</button></section>`}
function renderResult(){const r=state.run,drop=r.lastFlight?.artifactDrop?.collectionComplete?null:r.lastFlight?.artifactDrop,role=r.success&&!r.isTutorial?allRoles().find(c=>c.unlockDifficulty===r.difficulty+1):null;return `<section class="center-view run-summary"><h1>${r.isTutorial?(r.success?'Practice complete':'Practice ended'):r.success?'Run complete':'Run ended'}</h1><div class="result-stats"><div><strong>${Math.floor(r.securedCondensedGlow||0)}</strong><span>PACKED SPARKS EARNED</span></div><div><strong>${r.stats?.flights||0}</strong><span>FLIGHTS</span></div></div>${drop||role?`<div class="summary-prizes">${drop?`<div class="summary-prize">${drop.duplicate?condensedIconMarkup():artifactArt(typeof drop==='string'?drop:drop.id)}<div><small>${r.testMode?'TEST REWARD':'BOSS REWARD'}</small><strong>${drop.duplicate?(drop.convertedGlow?`+${formatGlow(drop.convertedGlow)} Sparks`:'Collection complete'):esc(artifactById(typeof drop==='string'?drop:drop.id)?.name||'Artifact recovered')}</strong></div></div>`:''}${role?`<div class="summary-prize">${companionArtSvg(role.id)}<div><small>ASCENSION ${r.difficulty+1} UNLOCKED</small><strong>${esc(role.name)}</strong></div></div>`:''}</div>`:''}${r.isTutorial?'<div class="two-actions"><button class="secondary" data-action="restart-practice">Practice again</button><button class="primary" data-action="leave-practice">Back to Menu</button></div>':`<p class="run-pause-note">Run skills and Packed Sparks reset. Permanent unlocks remain.</p><div class="two-actions"><button class="secondary" data-action="exit-menu">Main menu</button><button class="primary" data-action="new-game">New Game ${icon('arrow')}</button></div>`}</section>`}

function closeSheet(){const el=document.querySelector('dialog.game-sheet');if(el){el.close();el.remove()}}
function openSheet(content,cls=''){closeSheet();const el=document.createElement('dialog');el.className=`power-sheet game-sheet ${cls}`;el.innerHTML=content;el.addEventListener('close',()=>{el.remove();if(engine&&paused&&!flightLoading&&!document.querySelector('dialog[open]')&&!document.querySelector('#pause-layer')?.children.length&&!lesson)resumeFlight();},{once:true});document.body.appendChild(el);el.showModal();el.querySelector('button')?.focus({preventScroll:true});return el}
function pauseFlight(){stopCountdown();if(engine&&!engine.dying&&!paused){resumeArmed=false;paused=true;engine.pause();const speed=document.querySelector('#game-speed');if(speed)speed.hidden=true;engine.render()}}
function resumeFlight({waitForTap=false}={}){
 if(flightLoading)return;
 if(['ready','failed'].includes(engine?.dream?.phase))return dreamFinished(dreamReady);
 closeSheet();hideLesson();if(!engine)return;
 pauseFlight();paused=true;resumeArmed=waitForTap;
 const layer=document.querySelector('#pause-layer');if(!layer)return;
 if(waitForTap){layer.innerHTML=resumeGateMarkup();return;}
 beginResumeCountdown();
}
function beginResumeCountdown(){
 if(!engine||flightLoading||lesson)return;stopCountdown();resumeArmed=false;paused=true;
 const scene=engine,layer=document.querySelector('#pause-layer');if(!layer)return;
 cancelCountdown=startResumeCountdown(layer,{blocked:()=>engine!==scene||document.hidden,onComplete:()=>{
  cancelCountdown=null;if(engine!==scene)return;paused=false;
  if(scene.dream?.phase==='awakening')scene.dream.resume();else scene.resume();
 }});
}
function wakeFlight(){if(!engine||flightLoading||!resumeArmed||lesson)return;stopCountdown();resumeArmed=false;document.querySelector('#pause-layer').innerHTML='';paused=false;if(engine.dream?.phase==='awakening')engine.dream.resume();else engine.resume();}

function testControls({allowGrant=false}={}){const active=state.settings.testOverride;return `<div class="test-controls"><button class="test-toggle ${active?'active':''}" data-action="test-override" aria-pressed="${!!active}" ${engine||state.run?.isTutorial?'disabled':''}>TEST OVERRIDE · ${active?'ON':'OFF'}</button>${active?'<small>All unlocks · normal overflow income · no permanent rewards</small>':''}${active&&allowGrant&&state.run&&!engine&&state.run.phase!=='ended'?'<button class="test-currency-grant" data-action="grant-test-condensed">Grant 100 test Packed Sparks</button>':''}</div>`}
function toggleTestOverride(){if(engine||state.run?.isTutorial)return;setTestOverride(state,!state.settings.testOverride);selectedDifficulty=Math.min(selectedDifficulty,state.settings.testOverride?Math.max(6,state.profile.difficulty||1):state.profile.difficulty||1);persist();closeSheet();render(screen);notify(state.settings.testOverride?'TEST READY · all builds available':'TEST OFF · next New Game uses normal rules')}
function menuDebugControls(){return `<div class="menu-debug-controls">${testControls({allowGrant:true})}${mockControl()}</div>`}
function showMenu(){if(flightLoading)return;stopCountdown();if(engine?.dream?.phase==='awakening')return;if(engine?.dying||engine?.completing)return;if(engine)pauseFlight();const r=state.run,inside=screen!=='home'&&r&&r.phase!=='ended',flight=!!engine;if(!inside){openSheet(`<h2>Settings</h2>${menuDebugControls()}${performanceEnabled&&flightPerformance?'<button class="secondary" data-action="performance-report">SAVE PERFORMANCE REPORT</button>':''}${audioControls()}<div class="run-pause-actions"><button class="secondary" data-action="field-guide">Field Guide</button><button class="secondary" data-action="reset-tutorial">Reset tutorial</button><button class="primary" data-action="close-sheet">Back</button></div>`,'game-menu-sheet');return}const content=`<header class="run-pause-heading"><span>${r.isTutorial?'SEPARATE PRACTICE':`ASCENSION ${r.difficulty} · MAP ${r.mapIndex+1}/3`}</span><h2>${mockMode?'Rest preview':flight?'Paused':'Your run'}</h2></header><div class="run-pause-actions"><button class="primary" data-action="${flight?'resume':'close-sheet'}">${flight?'Resume flight':'Back to run'}</button><button class="secondary" data-action="exit-menu">${r.isTutorial?'Exit tutorial':'Exit to Menu'}</button></div><p class="run-pause-note">${mockMode?'MOCK RUN · CHANGES NOT SAVED':r.isTutorial?'Separate practice':flight?'Exit saves the flight entrance.':'Checkpoint saved'}</p>${menuDebugControls()}${performanceEnabled&&flightPerformance?'<button class="secondary" data-action="performance-report">SAVE PERFORMANCE REPORT</button>':''}<div class="run-tools">${featureAvailable('skills')?`<button data-action="skills">${icon('route')}SKILLS</button>`:''}${featureAvailable('companions')?`<button data-action="companions">${icon('wisp')}COMPANION</button>`:''}${artifactsRevealed()?`<button data-action="artifacts">${icon('star')}ARTIFACTS</button>`:''}<button data-action="field-guide">${icon('info')}FIELD GUIDE</button></div>${audioControls()}${r.isTutorial?'':`<button class="run-menu-danger" data-action="abandon-run">Abandon run</button>`}`;if(flight){closeSheet();document.querySelector('#pause-layer').innerHTML=`<div class="pause-overlay menu-pause">${content}</div>`}else openSheet(content,'game-menu-sheet')}
function skillProfile(){return getSkillWallet(state)}
function treeMarkup(){if(treeBranch==='main')return mainWispTreeMarkup({run:state.run,wallet:skillProfile(),canBuy:!engine&&canBuyCheckpointSkills(state),selected:mainSkillSelection,intro:!featureAvailable('advanced-skills')});return branchTreeMarkup({run:state.run,wallet:skillProfile(),branch:treeBranch,canBuy:!engine&&canBuyCheckpointSkills(state),selected:mainSkillSelection});}
function showSkills(branch){if(!featureAvailable('skills')){notify('Skills open after your first flight');return;}if(branch&&branch!=='main'&&!featureAvailable('companion-upgrades'))branch='main';if(screen==='home'||!state.run||state.run.phase==='ended'&&!state.run.victoryPending)return;pauseFlight();if(branch)treeBranch=branch;const visible=['main',...roleFleet(),...(state.run?.testMode||!!state.run?.skills?.['main-afterglow']?['afterglow']:[])];if(!visible.includes(treeBranch))treeBranch='main';const prior=document.querySelector('.living-tree-scroll'),position=prior?{key:prior.dataset.treeKey,top:prior.scrollTop,left:prior.scrollLeft}:null;const sheet=openSheet(treeMarkup(),'tree-sheet');sheet.classList.toggle('intro-tree',!featureAvailable('advanced-skills'));sheet.innerHTML=treeMarkup();sheet.querySelector('button')?.focus({preventScroll:true});const pane=sheet.querySelector('.living-tree-scroll');if(pane&&position?.key===pane.dataset.treeKey){pane.scrollTop=position.top;pane.scrollLeft=position.left}guideScreen('skills')}
function fleetChoiceMarkup(role,ids,editable){const gate=getCompanionUnlock(role.id,state.profile.difficulty,state.run?.isTutorial||state.run?.testMode||state.settings.testOverride),selected=ids.includes(role.id);return `<button class="companion-role ${selected?'selected':''} ${gate.unlocked?'':'progression-locked'}" data-action="fleet-role" data-id="${role.id}" ${!editable||!gate.selectable?'disabled':''}><span class="companion-portrait">${companionArtSvg(role.id)}</span><strong>${esc(role.name)}</strong><small>${role.passive?'PASSIVE':role.label}</small>${!gate.unlocked?`<span class="companion-lock-badge">${icon('shield')}ASC ${gate.requiredDifficulty}</span>${gate.testing?`<span class="companion-test-badge">${state.run?.isTutorial?'PRACTICE':'TEST'}</span>`:''}`:''}${selected?'<b class="fleet-selected">✓</b>':''}</button>`}
function fleetMarkup(){
 const ids=roleFleet(),editable=!engine&&canChangeCompanion(state.run),role=getCompanionAbility(ids[0]);
 return `<header class="single-companion-heading"><h2>COMPANION</h2><span>${editable?'Choose one':'Swap at Rest'}</span></header><div class="companion-roles">${allRoles().map(c=>fleetChoiceMarkup(c,ids,editable)).join('')}</div><div class="single-companion-description">${companionArtSvg(role.id)}<p>${esc(glowText(role.description,getGlowCapacity(state.run)))}</p></div><button class="primary" data-action="close-sheet">Done</button>`;
}
function showFleet(){if(screen==='home'||!state.run||state.run.phase==='ended')return showUnlocks();if(!featureAvailable('companions')){notify('Companion choices open at your first Rest');return;}pauseFlight();openSheet(fleetMarkup(),'companion-sheet');guideScreen('companions')}
function chooseFleet(id){
 if(engine||!state.run||!canChangeCompanion(state.run)||!getCompanionUnlock(id,state.profile.difficulty,state.run.isTutorial||state.run.testMode||state.settings.testOverride).selectable)return;
 if(setCompanions(state.run,[id])){persist();render(screen);showFleet();}
}

function artifactsMarkup(){const r=state.run,presentation=engine?{...r,artifactCharges:{...r?.artifactCharges,...lastSnapshot?.artifactCharges}}:r;return collectionMarkup({...state,run:presentation},{artifactArt,page:collectionPage,canMelt:!engine&&!!r?.restReady});}

function requestArtifactSalvage(id,supportIndex=null){
 if(engine||!canSellArtifact(state,id)){notify(state.run?.testMode?'Forging is disabled in TEST. Use the test Packed Sparks grant.':'Melt artifacts at Rest.');return;}
 const a=ARTIFACTS[id],value=getArtifactSalvageValue(id),isSupport=Number.isInteger(supportIndex),spec=CONSUMABLE_ARTIFACTS[id],uses=spec?(state.run.artifactCharges?.[id]??spec.charges):null;
 openSheet(`<header class="forge-ritual-heading"><span>ARTIFACT → SKILLS</span><h2>Melt ${esc(a.name)}?</h2></header><div class="forge-ritual-body">${choiceScene('forge',{artifactId:id})}<div class="forge-exchange"><div class="forge-loss">${artifactArt(id)}<strong>− ${esc(a.name)}</strong>${uses!==null?`<small>All ${uses} uses</small>`:'<small>Effect removed</small>'}</div><span class="forge-exchange-arrow">↓</span><div class="forge-gain">${condensedIconMarkup()}<strong>+${value}</strong><span>Packed Sparks</span></div><p>This run loses its effect. Future unlocks are kept.</p></div></div><footer class="forge-ritual-actions"><button class="secondary" data-action="${isSupport?'close-sheet':'artifacts'}">Keep artifact</button><button class="primary" data-action="${isSupport?'confirm-support-forge':'confirm-artifact-forge'}" data-id="${id}" ${isSupport?`data-index="${supportIndex}"`:''}>Melt ${resourceSymbol('packed')}+${value}</button></footer>`,'forge-ritual-sheet');
}
function showForgeFeedback(id,value){const host=document.querySelector('dialog[open]')||app;if(!host)return;const fx=document.createElement('div');fx.className='forge-completion';fx.setAttribute('role','status');fx.innerHTML=`${choiceScene('forge',{artifactId:id,phase:'complete'})}<span>− ${esc(ARTIFACTS[id]?.name||'Artifact')} <b>→ ${resourceSymbol('packed')}+${value}</b></span>`;host.appendChild(fx);const done=()=>fx.remove();fx.addEventListener('animationend',e=>{if(e.target===fx)done()});setTimeout(done,1600)}

function forgeArtifact(id){
 if(engine||!sellArtifact(state,id)){notify('This artifact can no longer be forged.');return;}
 persist();render(screen);showArtifacts();showForgeFeedback(id,getArtifactSalvageValue(id));notify(`+${getArtifactSalvageValue(id)} PACKED SPARKS`);
}
let artifactDetailBack=false;
function inspectArtifact(id,fromFlight=false){const a=ARTIFACTS[id];if(!a||!state.run?.artifacts?.includes(id)||engine?.dying||engine?.completing)return;if(fromFlight)pauseFlight();const run=engine?{...state.run,artifactCharges:{...state.run.artifactCharges,...lastSnapshot?.artifactCharges}}:state.run;const details=openSheet(collectionItemMarkup({...state,run},id,{artifactArt,canMelt:!engine&&canSellArtifact(state,id)}),'collection-detail-sheet');if(fromFlight)details.addEventListener('cancel',event=>{event.preventDefault();resumeFlight()});}

function showArtifacts(){if(screen==='home'||!state.run||state.run.phase==='ended'&&!state.run.victoryPending||!artifactsRevealed())return;pauseFlight();openSheet(artifactsMarkup(),'collection-sheet');guideScreen('artifacts')}
function refreshMapDock(){const dock=document.querySelector('.map-build-dock');if(dock)dock.innerHTML=`${state.run?.restReady?'<div class="rest-services"><button data-action="skills">TRAIN</button><button data-action="companions">COMPANIONS</button></div>':''}${artifactCollectionDock()}`}
function showPickupKey(){pauseFlight();openSheet(pickupGuideMarkup({maxGlow:getGlowCapacity(state.run),companions:roleFleet(),discovered:state.profile.seenPickups||[]}), 'pickup-guide-sheet')}
function showMapKey(){const r=state.run;openSheet(`<h2>ROUTE KEY</h2><p class="map-key-total">${r?.map.length||7} STOPS PER MAP · 3 MAPS PER RUN</p><div class="route-light-key" aria-label="Route brightness key"><span class="route-key-here"><i></i>HERE · your wisp</span><span class="route-key-next"><i></i>NEXT · tap to travel</span><span class="route-key-future"><i></i>Later · tap to preview</span><span class="route-key-closed"><i></i>Dark · path closed</span></div><div class="map-key-list">${Object.values(MAP_STOP_TYPES).map(type=>`<div class="map-key-row">${mapStopIconMarkup(type.kind)}<div><h3>${type.label}</h3><p>${esc(glowText(type.summary,getGlowCapacity(r||{})))}</p></div></div>`).join('')}</div><details class="map-event-guide"><summary>EVENTS & TRADES</summary>${getEventScenarios({maxGlow:getGlowCapacity(r||{})}).map(e=>`<p><b>${esc(e.name)}</b> · ${esc(e.summary)}</p>`).join('')}</details><button class="primary" data-action="close-sheet">Done</button>`,'map-key-sheet');guideScreen('map-key');}
function showCondensation(){pauseFlight();openSheet(`<h2>PACKED SPARKS</h2>${condensedIconMarkup()}<p>Clear a flight for 20 Packed Sparks to spend on run skills. Pickup overflow adds a bonus; melting an unwanted artifact is another way to earn more.</p><p>Flight earnings are kept on a clear. The final guardian awards a permanent relic instead. Rest refills do not create currency.</p><p>Improve conversion in the Energy tree. Packed Sparks is spent on skills; it never pays Lift costs.</p><button class="primary" data-action="inspect-main-skill" data-id="main-afterglow">Conversion skills</button><button class="secondary" data-action="close-sheet">Done</button>`,'condensation-sheet')}

async function launch(retry=false,dream=false){if(engine||flightLoading||landscape.isPortrait())return;const r=state.run;let n=dream?(r.phase==='briefing'?r.current:getChoices(r)[0]):r.current;if(dream&&n&&r.phase!=='briefing'){n={...n,flightNumber:r.path.map(id=>r.map.flat().find(p=>p.id===id)).filter(p=>p&&p.type!=='support').length+1};}if(dream&&(!r.restReady||!n||!getRunModifiers(r).dreamDuration))return;if(!dream){if(retry&&!retryFlight(r))return;if(!beginFlightAttempt(r))return goToRun();}const ticket=++launchTicket;flightLoading=true;resumeArmed=false;const startedAt=performance.now();dreamReady=null;screen='flight';paused=true;persist();renderHeader();document.body.classList.add('playing');document.body.dataset.screen='flight';app.innerHTML=`<section class="flight-shell"><div class="flight-device"><div class="flight-hud"><span class="ember-counter flight-condensed-counter" title="Packed Sparks · new overflow is saved when you clear this flight" aria-label="Packed Sparks">${condensedIconMarkup()}<b id="flight-condensed">${getSkillWallet(state).condensedGlow}</b><small>PACKED SPARKS</small></span><div class="flight-run-status">${livesMarkup(r)}<div class="boss-phase-hud" id="boss-phase"></div></div><span class="flight-menu-slot">${menuButton()}</span></div><div class="flight-artifact-bar" aria-label="Automatic artifact effects">${(r.artifacts||[]).filter(Boolean).map(id=>`<button type="button" data-action="inspect-flight-artifact" data-id="${id}" data-relic="${id}" aria-label="Inspect ${esc(ARTIFACTS[id]?.name||id)}; pause flight">${artifactArt(id)}${EVOLVING_ARTIFACTS.includes(id)?'<small class="artifact-seed-pips" aria-hidden="true"><i></i><i></i><i></i></small>':''}${getArtifactInfo(id).type==='consumable'?`<small class="artifact-flight-charge">${r.artifactCharges?.[id]??getArtifactInfo(id).charges}</small>`:''}</button>`).join('')}</div><div class="flight-progress"><i id="flight-progress-bar"></i></div><div class="canvas-wrap">${glowGaugeMarkup(r)}${edgingPulseMarkup()}<canvas id="flight-canvas" aria-label="Tap to Lift. With Space Timer, keep holding to levitate and release to glide. Power is on the right. MENU pauses."></canvas><div class="flight-event" id="flight-event"></div><div class="game-speed-overlay" id="game-speed" role="status" aria-label="Game speed" hidden><span>GAME SPEED</span><b>0.1×</b><i><em></em></i></div><div class="dream-mark" id="dream-mark"></div>${performanceEnabled?'<div class="perf-status" id="perf-status">MEASURING…</div>':''}<div class="tutorial-flight-hint" id="tutorial-hint" hidden></div></div><div class="flight-dock"><div class="flight-fleet-status" id="fleet-status">${fleetArt()}</div>${boostControlMarkup(r.companions)}<button class="flight-control flap-control" id="flap-btn" aria-label="Lift">${resourceSymbol('up')}<span id="flap-label">−2</span></button></div><div id="pause-layer">${flightEntryMarkup(r,n,{artifactArt,dream})}</div></div></section>`;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(ticket!==launchTicket)return;
  hud={edging:document.querySelector('.edging-pulse-gauge'),fill:document.querySelector('#flame-fill'),meter:document.querySelector('#flame-meter'),condensed:document.querySelector('#flight-condensed'),progress:document.querySelector('#flight-progress-bar'),power:document.querySelector('#boost-btn'),event:document.querySelector('#flight-event'),flap:document.querySelector('#flap-label'),boss:document.querySelector('#boss-phase')};
  engine=new WispFlight({canvas:document.querySelector('#flight-canvas'),terrain:n.terrain,elite:n.elite,seed:`${r.seed}-${n.id}`,duration:n.duration,node:n,challengeId:n.challengeId,challengeTarget:n.challengeTarget,flame:r.flame,condensedGlow:getSkillWallet(state).condensedGlow,condensedRemainder:r.condensedRemainder||0,companions:r.companions,companionRole:r.companions[0],skills:r.skills,cards:[],modifiers:{...getRunModifiers(r),onboardingPlan:onboardingFlightPlan(state.profile,r)},onUpdate:updateFlight,onFinish:dream?()=>{}:completeFlight,onPause:()=>{if(!paused){paused=true;showMenu()}}});engine.setMuted?.(muted);if(dream)attachDream(engine,{mode:'record',onReady:dreamFinished});else if(r.dreamPreset){const replay=attachDream(engine,{mode:'replay',preset:r.dreamPreset,onAwake:dreamAwake});if(!replay){delete r.dreamPreset;persist();notify('Dream expired · scene or build changed');}}if(performanceEnabled)flightPerformance=attachFlightPerformance(engine,{onStatus:s=>{const indicator=document.querySelector('#perf-status');if(indicator)setText(indicator,`${s.fps} FPS · worst ${s.worstGap}ms · ${s.stalls} stalls`)}});bindFlightControls();const scene=engine;scene.start({paused:true});await waitForFlightEntry(scene.ready,startedAt);if(ticket!==launchTicket||engine!==scene)return;flightLoading=false;resumeFlight({waitForTap:true});if(r.isTutorial)requestAnimationFrame(()=>guideScreen('flight'));
}
function setText(el,text){if(el&&el.textContent!==String(text))el.textContent=text}
function updateFlight(s){lastSnapshot=s;
 const run=state.run;
 updateGameSpeed(s);
 for(const [id,remaining] of Object.entries(s.artifactCharges||{})){
  const item=document.querySelector(`.flight-artifact-bar [data-relic="${id}"]`);if(!item)continue;
  setText(item.querySelector('.artifact-flight-charge'),remaining);item.classList.toggle('depleted',remaining===0);
  item.setAttribute('aria-label',`${ARTIFACTS[id]?.name||id}: ${remaining} uses left`);
 }
 const seed=s.artifactEffects?.seed;
 if(seed){const item=document.querySelector(`.flight-artifact-bar [data-relic="${seed.id}"]`);if(item){const key=`${seed.charge}:${seed.procs}`;if(item.dataset.seed!==key){item.dataset.seed=key;item.classList.toggle('depleted',seed.procs>=seed.limit);for(const [i,pip]of [...item.querySelectorAll('.artifact-seed-pips i')].entries())pip.classList.toggle('filled',i<seed.charge);item.setAttribute('aria-label',`${ARTIFACTS[seed.id].name}: ${seed.charge} of 3 body pickups; ${seed.limit-seed.procs} activations left`);}}}
 if(run?.isTutorial&&!run.guideSkipped&&!engine?.dream?.active&&(s.blackHole?.rate>0||s.edgingPulse?.active||s.edgingPulse?.mode==='regen'&&s.edgingPulse?.regenGrants>0)){
  const id=observedFlightLesson(s,{...run.guideSeen,...run.effectHints});
  if(id){(run.effectHints||={})[id]=true;(run.pendingEffectHints||=[]).push(id);}
 }
if(!hud)return;const mark=document.querySelector('#dream-mark');if(mark){const phase=(engine?.dream?.phase||'')+':'+Math.ceil(engine?.dream?.duration-(engine?.time||0));if(mark.dataset.phase!==phase){mark.dataset.phase=phase;mark.innerHTML=engine?.dream?dreamIndicatorMarkup(engine.dream):''}}updateGlowGauge(hud.gauge||(hud.gauge=document.querySelector('.glow-side-gauge')),s);updateEdgingPulse(hud.edging,s);setText(hud.condensed,Math.floor(s.condensedTotal??getSkillWallet(state).condensedGlow??0));hud.progress.style.transform=`scaleX(${Math.min(1,s.progress||0)})`;setText(hud.event,flightCue(s));setText(hud.flap,s.completing?'CLEAR':s.dying?'FADING':s.leveler?.active?'HOLD':s.artifactEffects?.freeLift?'FREE':`−${formatGlow(s.flapCost,s.maxFlame)}`);if(hud.flap&&!engine?.hasCompanion('leveler'))hud.flap.parentElement.setAttribute('aria-label',`Lift, ${s.artifactEffects?.freeLift?'free':`costs ${formatGlow(s.flapCost,s.maxFlame)} Energy`}`);if(hud.flap&&engine?.hasCompanion('leveler'))hud.flap.parentElement.setAttribute('aria-label',`Tap to Lift. Hold to levitate. Space Timer charge ${Math.round((s.leveler?.charge||0)/Math.max(.001,s.leveler?.capacity||1)*100)} percent`);setText(hud.boss,s.bossWarning||s.bossPhase||'');updateBoostControl(hud.power,s);const proc=s.artifactProc?.id||'';if(hud.artifactProc!==proc){hud.artifactProc=proc;for(const item of document.querySelectorAll('.flight-artifact-bar>[data-relic]'))item.classList.toggle('triggered',item.dataset.relic===proc);}if(engine?.tutorial&&!s.completing&&s.tutorialHintState&&!lesson){const hint=document.querySelector('#tutorial-hint');if(hint){hint.hidden=false;const key=s.tutorialHintState.id;if(hint.dataset.key!==key){hint.dataset.key=key;hint.innerHTML=`<strong>${esc(s.tutorialHintState.title)}</strong><p>${esc(s.tutorialHintState.text)}</p>`}}}if(!paused&&!lesson&&!s.dying)queueMicrotask(()=>{if(!showArtifactLesson())worldLesson()})}
function bindFlightControls(){
 const lift=document.querySelector('#flap-btn'),power=document.querySelector('#boost-btn');let heldPointer=null;
 for(const target of [lift,document.querySelector('.canvas-wrap')]){
  target.addEventListener('pointerdown',e=>{e.preventDefault();if(paused||lesson||engine?.dream?.phase==='replay'||heldPointer!==null)return;heldPointer=e.pointerId;target.setPointerCapture(e.pointerId);engine?.beginLiftInput()});
  const release=e=>{if(e.pointerId!==heldPointer)return;heldPointer=null;engine?.endLiftInput(e.type!=='pointerup')};
  target.addEventListener('pointerup',release);target.addEventListener('pointercancel',release);target.addEventListener('lostpointercapture',release);
  target.addEventListener('contextmenu',e=>e.preventDefault());
 }
 lift.addEventListener('click',e=>{if(e.detail===0&&!paused&&!lesson&&engine?.dream?.phase!=='replay')engine?.flap()});
 if(power?.tagName==='BUTTON'){power.addEventListener('pointerdown',e=>{e.preventDefault();if(!paused&&!lesson&&engine?.dream?.phase!=='replay')engine?.activateAbility()});power.addEventListener('click',e=>{if(e.detail===0&&!paused&&!lesson&&engine?.dream?.phase!=='replay')engine?.activateAbility()})}
}

function completeFlight(result){hideLesson();const previous=engine;engine=null;hud=null;previous?.destroy();paused=false;document.body.classList.remove('playing');finishFlight(state.run,result);if(result.success){delete state.run.dreamPreset;const n=settleCheckpoint(state);if(n)notify(`+${n} PACKED SPARKS`);if(state.run.success&&!state.run.isTutorial)selectedDifficulty=state.profile.difficulty}persist();goToRun()}
function finishCoachLesson(){
 if(!lesson)return;const {done,key}=lesson;
 if(key.startsWith('onboarding:'))markOnboardingSeen(state.profile,key);
 else if(state.run){state.run.guideSeen||={};state.run.guideSeen[key]=true;}
 hideLesson();persist();done?.();
}
const coach=createTutorialCoach({onNext:()=>{if(!lesson)return;if(++lesson.index<lesson.steps.length)return showLessonStep();finishCoachLesson();},onBack:()=>{if(lesson&&lesson.index>0){lesson.index--;showLessonStep()}},onSkip:finishCoachLesson});

function hideLesson(){lesson=null;coach.hide();document.querySelector('[data-world-focus]')?.remove()}
function startLesson(key,steps,done){if(lesson||!steps.length)return;const real=steps;if(!real.length)return;lesson={key,steps:real,index:0,done};showLessonStep()}
function showLessonStep(){const s=lesson.steps[lesson.index];coach.show({...s,id:`${lesson.key}:${lesson.index}`,progress:`${lesson.index+1}/${lesson.steps.length}`,actionLabel:s.actionLabel||(lesson.index===lesson.steps.length-1?'Continue':'Next')})}
function guideScreen(view){
 const r=state.run;if(!r||lesson||rewardAnimating||flightLoading||cancelCountdown)return;
 noteOnboardingProgress(state.profile,r);
 if(!r.isTutorial){
  const normal=nextOnboardingLesson(view,{profile:state.profile,run:r,flight:engine,snapshot:lastSnapshot||{}});
  if(!normal)return;
  if(engine){if(paused||engine.dying||engine.completing)return;pauseFlight();}
  noteOnboardingPrompt(r,view,{flight:engine});
  startLesson(normal.id,normal.steps,engine?resumeFlight:undefined);persist();return;
 }
  if(!r.guideSkipped&&['map','victory'].includes(view)){
    const id=r.pendingEffectHints?.shift();
    if(id&&!r.guideSeen?.[id])return startLesson(id,[flightEffectLesson(id,view)]);
  }
  if(!r.isTutorial)return;
  if(r.guideSkipped)return;
  const checkpointHint=checkpointTutorialLesson(view,{run:r});if(checkpointHint&&!r.guideSeen?.[checkpointHint.id])return startLesson(checkpointHint.id,checkpointHint.steps||[checkpointHint]);
  if(view==='support'&&!r.guideSeen?.support)startLesson('support',[{title:'Take a breather',text:'Recover fuel or collect an offering. Full-meter surplus condenses; upgrades can wait until you feel ready.',target:'.support-offers'}]);
  else if(view==='flight'){
    const kind=r.current?.tutorialLesson;const key=kind==='glide'?'flight':`flight-${kind}`;if(r.guideSeen?.[key])return;
    pauseFlight();const active=r.companions.some(id=>!getCompanionAbility(id).passive);
    const steps=kind==='hazards'?topicSteps('hazards').slice(1):key==='flight'?[{...topicSteps('flight')[1],target:'#flap-btn'},{...topicSteps('sparks')[0],target:'.glow-side-gauge'}]
      :[{...topicSteps('hazards')[0],target:'.canvas-wrap'},{...topicSteps(r.companions[0]==='collector'?'collector':'companions')[r.companions[0]==='leveler'?2:r.companions[0]==='swift'?1:0],target:'#boost-btn'}];
    startLesson(key,steps,resumeFlight);
  }
}

let guidePage=0;
const guidePages=[['flight','sparks','luminance','hearts','collector','utilities'],['companions','packed','skills','rewards','artifacts','rest'],['dream','routes','terrain','hazards','progression']];
function showFieldGuide(page=guidePage){guidePage=Math.max(0,Math.min(2,Number(page)||0));pauseFlight();hideLesson();openSheet(`<header class="field-guide-heading"><h2>FIELD GUIDE <small>${['BASICS','YOUR BUILD','THE JOURNEY'][guidePage]}</small></h2><button class="secondary guide-practice" data-action="practice">Practice</button><button class="secondary" data-action="close-sheet" aria-label="Close Field Guide">×</button></header><div class="guide-topics">${guidePages[guidePage].map(id=>{const topic=TUTORIAL_TOPICS[id];return `<button class="secondary" data-action="guide-topic" data-id="${id}" aria-label="${esc(topic.name)}">${tutorialVisualMarkup({visual:topic.visual})}<strong>${esc(topic.name)}</strong><small>${topic.steps.length} small steps</small></button>`}).join('')}</div><footer class="guide-pages"><button class="secondary" data-action="guide-page" data-id="${guidePage-1}" ${guidePage===0?'disabled':''}>← Back</button><span>${guidePage+1} / 3</span><button class="primary" data-action="guide-page" data-id="${guidePage+1}" ${guidePage===2?'disabled':''}>Next →</button></footer>`,'field-guide-sheet')}

function showGuideTopic(id){if(!TUTORIAL_TOPICS[id])return;closeSheet();startLesson('guide:'+id,topicSteps(id),showFieldGuide)}

function showArtifactLesson(){
 if(!state.run?.isTutorial)return false;
 if(!engine||engine.dream?.active||paused||lesson||engine._artifactLessonShown||lastSnapshot?.dying||lastSnapshot?.completing)return false;
 const lessonOwner=state.run?.isTutorial?state.run:state.profile;const notice=nextArtifactNotice(lastSnapshot,lessonOwner.seenArtifactLessons||[]);
 if(!notice||!ARTIFACTS[notice.artifactId])return false;
 engine._artifactLessonShown=true;
 (lessonOwner.seenArtifactLessons||=[]).push(notice.artifactId);
 pauseFlight();
 startLesson(`artifact:${notice.artifactId}`,[artifactUseLesson(notice,ARTIFACTS[notice.artifactId],{maxGlow:engine.maxFlame,charges:lastSnapshot.artifactCharges})],resumeFlight);
 persist();return true;
}
function updateGameSpeed(snapshot){
 const overlay=document.querySelector('#game-speed');if(!overlay)return;
 const visible=!paused&&!engine?.paused&&!lesson&&!snapshot.dying&&!snapshot.completing&&snapshot.resumeRemaining>0;
 overlay.hidden=!visible;if(!visible)return;
 const speed=Math.max(.1,Math.min(1,snapshot.resumeScale||.1)),label=`${speed.toFixed(1)}×`;
 if(overlay.dataset.speed!==label){overlay.dataset.speed=label;overlay.querySelector('b').textContent=label;overlay.setAttribute('aria-label',`Game speed ${label}`);}
 overlay.querySelector('em').style.transform=`scaleX(${(speed-.1)/.9})`;
}
function worldLesson(){if(!state.run?.isTutorial){guideScreen('flight');return;}if(!engine||engine.dream?.active||paused||lesson||lastSnapshot?.dying||lastSnapshot?.completing)return;const r=state.run,practice=!!engine.tutorial;if(practice&&!r.guideSkipped&&!r.guideSeen?.['practice-condensation']&&engine.time>3&&(lastSnapshot?.condensedGlow||0)>0){pauseFlight();startLesson('practice-condensation',[{title:'Packed Sparks buys skills',visual:'packed',text:'With a full Energy meter, extra Energy become Packed Sparks. Clear this flight to keep it.',target:'.flight-condensed-counter'}],resumeFlight);return;}let focus,key,content;if(practice){if(r.guideSkipped||engine.time<3||engine.time-(engine.tutorialCoachAt??-10)<7)return;const prefix='world:',seen=new Set(Object.keys(r.guideSeen||{}).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length)));focus=getTutorialWorldFocus(engine,seen);if(!focus)return;engine.tutorialCoachAt=engine.time;key=`world:${focus.id}`;content=focus}else{const seen=new Set(state.profile.seenPickups||[]);if(seen.size>=7)return;focus=engine.getNearbyPickup(seen);if(!focus)return;key=`pickup:${focus.kind}`;content=pickupLesson(focus.kind,{maxGlow:engine.maxFlame,companions:roleFleet()});state.profile.seenPickups||=[];state.profile.seenPickups.push(focus.kind);if(state.profile.pickupCoachSkipped){persist();return}}pauseFlight();const wrap=document.querySelector('.canvas-wrap'),canvas=document.querySelector('#flight-canvas'),target=document.createElement('i'),c=canvas.getBoundingClientRect(),w=wrap.getBoundingClientRect(),sx=c.width/engine.width,sy=c.height/engine.height,rad=Math.max(18,focus.radius||18);target.dataset.worldFocus='';target.style.cssText=`position:absolute;pointer-events:none;left:${c.left-w.left+(focus.x-rad)*sx}px;top:${c.top-w.top+(focus.y-rad)*sy}px;width:${rad*2*sx}px;height:${rad*2*sy}px`;wrap.appendChild(target);startLesson(key,[{...content,target}],resumeFlight)}
function mapLabelLines(value,max=14){const words=String(value||'').split(/\s+/),lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>max&&line){lines.push(line);line=word}else line=(line+' '+word).trim()}if(line)lines.push(line);return lines.slice(0,2).map(v=>v.length>max?v.slice(0,max-1)+'…':v)}
function mapPositionMarker(x,y,label){return `<g class="map-position-marker map-orb-marker" transform="translate(${x},${y})"><circle r="12" fill="#dce8d1" opacity=".25"/><circle r="6" fill="#f2f0d5"/><text y="24" text-anchor="middle">${label}</text></g>`}

function drawMap(){
  if(window.matchMedia('(orientation: landscape)').matches){drawLandscapeMap(document.querySelector('#journey-map'),document.querySelector('#map-viewport'),state.run);return;}
  const r=state.run,height=mapHeight(r),origin=height-57,svg=document.querySelector('#journey-map');if(!svg)return;
  const routeState=getRouteMapState(r),choices=getChoices(r),available=new Set(routeState.availableIds),visited=new Set(routeState.completedIds),positions={},byId=new Map(r.map.flat().map(n=>[n.id,n]));
  const modern=r.map.some(row=>row.some(n=>Array.isArray(n.nextIds)));
  r.map.forEach((row,i)=>row.forEach((n,j)=>{const lane=modern?(Number.isInteger(n.lane)?n.lane:j):(row.length===2?j*2:1);positions[n.id]={x:[65,195,325][lane]??195,y:height-165-i*160};}));
  const nextNodes=n=>Array.isArray(n.nextIds)?n.nextIds.map(id=>byId.get(id)).filter(Boolean):(r.map[n.row+1]||[]);
  const future=new Set(routeState.reachableIds),futureEdges=new Set(routeState.reachableEdges.map(edge=>edge.join('|')));
  const takenEdges=new Set(routeState.pathEdges.map(edge=>edge.join('|'))),last=routeState.currentId;
  let paths='',locations='',decorations='',clips='';
  const pathMarkup=(d,taken,open,locked,id)=>`<g class="map-route-line ${taken?'path-taken':open?'path-open':locked?'path-locked':'path-future'}"><path d="${d}" class="route-shadow"/><path id="${id}" d="${d}" class="route-thread"/>${open?`<path d="${d}" class="route-current"/>`:''}</g>`;
  r.map.forEach(row=>row.forEach(a=>{for(const b of nextNodes(a)){const p=positions[a.id],q=positions[b.id];if(!p||!q)continue;const d=`M${p.x} ${p.y-33} C${p.x} ${p.y-79},${q.x} ${q.y+81},${q.x} ${q.y+34}`;paths+=pathMarkup(d,takenEdges.has(`${a.id}|${b.id}`),a.id===last&&available.has(b.id),!futureEdges.has(`${a.id}|${b.id}`),`route-${a.id}-${b.id}`);}}));
  const starts=(Array.isArray(r.startNodeIds)?r.startNodeIds:r.map[0].map(n=>n.id)).map(id=>byId.get(id)).filter(Boolean);
  for(const node of starts){const q=positions[node.id],d=`M195 ${origin} C195 ${origin-39},${q.x} ${origin-33},${q.x} ${q.y+34}`;paths+=pathMarkup(d,r.path[0]===node.id,r.path.length===0&&available.has(node.id),r.path.length>0&&r.path[0]!==node.id,`origin-${node.id}`);}
  for(let i=0;i<66;i++){const x=(i*137+41)%390,y=(i*211+73)%height;decorations+=`<circle cx="${x}" cy="${y}" r="${i%5===0?1.6:.7}" fill="#f5dcad" opacity="${.16+(i%4)*.07}"/>`;}
  for(let i=0;i<Math.ceil(runLength(r)*1.3);i++){const x=i%2?320:42,y=170+i*119;decorations+=`<g opacity=".17" transform="translate(${x},${y}) rotate(${i%2?-9:8})"><path d="M-53 8Q-37-12-15-6L8-19 40-7 55 15 26 34-4 47-28 29Z" fill="#323a34"/><path d="M-38 5Q-10-14 33-2" fill="none" stroke="#b8c692" stroke-width="2"/><path d="M-17-8v-29h8v26m20-1v-24h7v27m-42-23q23-23 48 0" fill="none" stroke="#68705d" stroke-width="5"/></g>`;}
  r.map.forEach((row,i)=>row.forEach(n=>{
    const p=positions[n.id],reach=available.has(n.id),taken=visited.has(n.id),bypassed=i<r.step&&!taken,possible=future.has(n.id),stop=getMapStopInfo(n,getGlowCapacity(r));
    const routeMode=n.id===last?'current':reach?'next':taken?'complete':possible?'future':'closed';
    const location=n.type==='support'?null:nodeLocation(n),name=stop.name||n.locationName||n.name,lines=mapLabelLines(name),ascent=r.isTutorial?i+1:getAscentInfo(n).level;
    const type=n.boss?'BOSS':n.elite?'ELITE':n.type==='finale'?'EXIT':stop.kind==='flight'?'FLIGHT':stop.label;
    const forecast=reach&&!r.isTutorial?getRouteForecast(r,n):null;
    const forecastText=forecast?(forecast.nextRestDistance===0?'REST HERE':forecast.restReachable?`REST ≤${forecast.nextRestDistance}`:'NO REST AHEAD'):'';
    const glyph=`<g class="map-support-symbol">${mapStopIconMarkup(n).replace('<svg ',`<svg x="${p.x-22}" y="${p.y-22}" width="44" height="44" `)}</g>`;
    locations+=`<g class="world-map-node route-state-${routeMode} map-stop-${stop.kind} ${reach?'reachable':''} ${taken?'taken':''} ${bypassed?'bypassed':''} ${!possible&&!taken?'unreachable':''}" data-route-state="${routeMode}" ${(reach||possible)?`data-action="${reach?'node':'preview-node'}" data-id="${esc(n.id)}" role="button" tabindex="0" aria-label="${reach?'Next stop. Choose':'Future stop. Preview'} ${type}: ${esc(name)}. ${esc(stop.summary)}. ${esc(n.setpiecePreview||location?.signature||'')}. ${esc(n.fuelPreview||n.description)}. ${esc(n.reward)}"`:''}>
      <title>${type}: ${esc(name)}. ${esc(stop.summary)}</title>
      ${(reach||possible)?`<rect x="${p.x-51}" y="${p.y-44}" width="102" height="138" fill="transparent" pointer-events="all"/>`:''}
      <ellipse cx="${p.x}" cy="${p.y+35}" rx="39" ry="10" fill="#05171e" opacity=".5"/>
      ${reach?`<circle class="node-aureole" cx="${p.x}" cy="${p.y}" r="48" fill="url(#nodeRadiance)"/><circle class="node-pulse" cx="${p.x}" cy="${p.y}" r="38" fill="none" stroke="#e8f1d4" stroke-width="1.5"/><circle cx="${p.x}" cy="${p.y}" r="43" fill="none" stroke="#d5e5bc" stroke-opacity=".28"/>`:''}
      <circle cx="${p.x}" cy="${p.y}" r="34" fill="#142c25" stroke="${reach||taken?'#c6d5a7':'#667f70'}" stroke-width="${reach?2:1}"/>
      ${glyph}
      ${taken?`<circle cx="${p.x+24}" cy="${p.y+24}" r="10" fill="#a8bd89" stroke="#173322" stroke-width="2"/><path d="m${p.x+19} ${p.y+24} 3 3 7-7" fill="none" stroke="#173b27" stroke-width="1.8"/>`:''}
      <ellipse cx="${p.x}" cy="${p.y+(forecastText?78:66)}" rx="63" ry="${forecastText?45:31}" fill="url(#labelMist)"/>
      <text x="${p.x}" y="${p.y+54}" class="map-node-type" text-anchor="middle">${type}</text>
      <text x="${p.x}" y="${p.y+72}" class="map-node-name map-node-detail" text-anchor="middle">${lines.map((text,index)=>`<tspan x="${p.x}" dy="${index?14:0}">${esc(text)}</tspan>`).join('')}</text>
      ${forecastText?`<text x="${p.x}" y="${p.y+107}" class="map-rest-forecast ${forecast.restReachable?'':'danger'}" text-anchor="middle">${esc(forecastText)}</text>`:''}
      ${last===n.id?mapPositionMarker(p.x-47,p.y+1,'YOU'):''}
    </g>`;
  }));
  svg.innerHTML=`<defs><radialGradient id="labelMist"><stop offset=".55" stop-color="#112e32" stop-opacity=".96"/><stop offset="1" stop-color="#112e32" stop-opacity="0"/></radialGradient><marker id="mapUpArrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto" markerUnits="strokeWidth"><path d="M0 0 6 3 0 6Z" fill="#dcebc5"/></marker><linearGradient id="atlasSky" x2="0" y2="1"><stop stop-color="#102a3b"/><stop offset=".46" stop-color="#173c3e"/><stop offset="1" stop-color="#0b2930"/></linearGradient><radialGradient id="moonRadiance"><stop stop-color="#e9dbac" stop-opacity=".30"/><stop offset=".35" stop-color="#c1d9c0" stop-opacity=".10"/><stop offset="1" stop-color="#a6d8c9" stop-opacity="0"/></radialGradient><radialGradient id="nodeRadiance"><stop stop-color="#f5cd81" stop-opacity=".27"/><stop offset=".63" stop-color="#f5cd81" stop-opacity=".10"/><stop offset="1" stop-color="#f5cd81" stop-opacity="0"/></radialGradient><linearGradient id="mapIsland" x2=".4" y2="1"><stop stop-color="#7f9d85"/><stop offset="1" stop-color="#173544"/></linearGradient><pattern id="atlasContour" width="195" height="220" patternUnits="userSpaceOnUse"><path d="M-30 80Q27 12 107 75T235 72M-30 95Q27 27 107 90T235 87M-30 112Q27 44 107 107T235 104" stroke="#a2bc9d" stroke-opacity=".05" fill="none"/></pattern>${clips}</defs><rect width="390" height="${height}" fill="url(#atlasSky)"/><rect width="390" height="${height}" fill="url(#atlasContour)"/><circle cx="195" cy="90" r="155" fill="url(#moonRadiance)"/><circle cx="195" cy="88" r="26" fill="#e9d8a5" opacity=".72"/><circle cx="205" cy="80" r="24" fill="#193641"/><path d="M24 64Q195 8 366 64M24 ${height-18}Q195 ${height+24} 366 ${height-18}" stroke="#9eae8866" stroke-width="1" fill="none"/>${decorations}${paths}${locations}${mapPositionMarker(195,origin,'START')}<text x="195" y="36" class="map-gate-title" text-anchor="middle">${r.isTutorial?'FIRST LIGHT':esc((r.mapName||'THE ASCENT').toUpperCase())}</text>`;
  const viewport=document.querySelector('#map-viewport'),target=positions[choices[0]?.id];
  if(viewport&&target){const ratio=svg.getBoundingClientRect().width/390;viewport.scrollTop=Math.max(0,target.y*ratio-viewport.clientHeight*.62);}
}

document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;const action=btn.dataset.action,id=btn.dataset.id;if(rewardAnimating&&['victory-next','skills'].includes(action))return;switch(action){case'keep-flight-reward':keepFlightReward(id);break;case'wake-flight':wakeFlight();break;case'death-continue':if(state.run){state.run.deathPending=false;persist();goToRun()}break;case'field-guide':showFieldGuide();break;case'guide-page':showFieldGuide(id);break;case'guide-topic':showGuideTopic(id);break;case'restart-practice':exitTutorial();enterTutorial();break;case'mock-toggle':switchRestInspector(!mockMode);break;case'fullscreen':landscape.fullscreen();break;case'view-route':render('map');break;case'preview-node':previewNode(id);break;case'victory-next':if(acknowledgeVictory(state)){persist();goToRun()}break;case'dream':beginDream();break;case'dream-retry':closeSheet();destroyFlight();launch(false,true);break;case'dream-back':closeSheet();destroyFlight();goToRun();break;case'dream-preset':if(dreamReady?.valid){state.run.dreamPreset=dreamReady.preset;persist();closeSheet();destroyFlight();goToRun();notify('DREAM PRESET SAVED')}break;case'dream-wake':wakeDream();break;case'performance-report':if(flightPerformance)downloadPerformanceReport(flightPerformance.report());break;case'inspect-branch-skill':mainSkillSelection=id;showSkills();break;case'inspect-main-skill':mainSkillSelection=id;showSkills('main');break;case'choose-start-skill':if(chooseStartingSkill(state,id)){mainSkillSelection=id;persist();render(screen);showSkills('main');notify('STARTING GIFT LEARNED')}break;case'grant-test-condensed':if(!engine&&grantTestCondensedGlow(state,100)){persist();showMenu();notify('+100 TEST PACKED SPARKS')}break;case'test-override':toggleTestOverride();break;case'starting-companion':case'test-starter':if(setStartingCompanion(state,id)){persist();render('home')}break;case'play':closeSheet();beginRun();break;case'continue-run':closeSheet();goToRun();break;case'new-game':requestNewGame();break;case'confirm-new-game':beginRun(true);break;case'exit-menu':exitToMenu();break;case'abandon-run':requestAbandon();break;case'confirm-abandon':endRun();break;case'companion-unlocks':showUnlocks();break;case'choose-ascension':selectedDifficulty=Math.max(1,Math.min(state.settings.testOverride?Math.max(6,state.profile.difficulty||1):state.profile.difficulty||1,Number(btn.dataset.value)||1));render('home');break;case'home':exitToMenu();break;case'menu':showMenu();break;case'resume':resumeFlight();break;case'close-sheet':closeSheet();break;case'tutorial':showFieldGuide();break;case'practice':enterTutorial();break;case'reset-tutorial':resetOnboarding(state.profile);if(state.run)delete state.run.onboardingPacing;persist();showMenu();notify('Tutorial reset · New Game will replay the gradual introduction');break;case'skip-practice':exitTutorial();break;case'leave-practice':if(state.run?.success)state.profile.tutorialComplete=true;exitTutorial();break;case'music':music.setEnabled(!music.enabled);showMenu();break;case'mute':muted=!muted;localStorage.setItem('emberwing-muted',String(muted));engine?.setMuted?.(muted);showMenu();break;case'node':closeSheet();if(selectNode(state.run,id)){persist();goToRun()}break;case'back-route':backRoute();break;case'support':takeSupport(Number(btn.dataset.index));break;case'launch':launch();break;case'retry':launch(true);break;case'end-run':requestAbandon();break;case'next-map':if(advanceMap(state.run)){persist();goToRun()}break;case'skills':showSkills();break;case'bond-tree':showSkills('main');break;case'tree-branch':showSkills(id);break;case'buy-skill':if(!engine&&buyCheckpointSkill(state,id)){persist();render(screen);showSkills();notify(SKILLS[id]?.choiceGroup?'PATH CHOSEN · THIS RUN':'UPGRADE LEARNED · THIS RUN')}break;case'companions':showFleet();break;case'fleet-role':chooseFleet(id);break;case'inspect-flight-artifact':inspectArtifact(id,true);break;case'inspect-artifact':inspectArtifact(id);break;case'artifact-details-back':if(artifactDetailBack)showArtifacts();else closeSheet();break;case'artifacts':showArtifacts();break;case'collection-page':collectionPage=Number(btn.dataset.page)||0;showArtifacts();break;case'sell-artifact':requestArtifactSalvage(id);break;case'confirm-artifact-forge':forgeArtifact(id);break;case'confirm-support-forge':takeSupport(Number(btn.dataset.index),id);break;case'pickup-key':showPickupKey();break;case'map-key':showMapKey();break;case'map-position':drawMap();break;case'condensation-help':showCondensation();break;case'close-power':closeSheet();break}});
document.addEventListener('keydown',e=>{if(coach.active||document.querySelector('dialog[open]'))return;if(engine){if(['Space','ArrowUp','KeyB','Escape'].includes(e.code))e.preventDefault();if(e.repeat)return;if(engine.dream?.phase==='awakening'&&['Space','ArrowUp'].includes(e.code)){wakeDream();return;}if(resumeArmed&&['Space','ArrowUp'].includes(e.code)){wakeFlight();return;}if(e.code==='Escape')showMenu();else if(!paused&&['Space','ArrowUp'].includes(e.code))engine.beginLiftInput();else if(!paused&&e.code==='KeyB')engine.activateAbility()}else{const node=e.target.closest?.('.world-map-node[role=button]');if(node&&['Enter',' '].includes(e.key)){e.preventDefault();if(node.dataset.action==='preview-node')previewNode(node.dataset.id);else if(selectNode(state.run,node.dataset.id)){persist();goToRun()}}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&engine&&!engine.dying&&(!paused||cancelCountdown)){pauseFlight();showMenu()}});
window.addEventListener('pagehide',persist);
if(state.run?.isTutorial){leaveTutorial(state);persist()}
render('home');
const landscape=installLandscapeMode({onPortrait:()=>{closeSheet();if(engine&&(!paused||cancelCountdown)){pauseFlight();showMenu()}},onChange:()=>{if(screen==='map')drawMap()}});

document.addEventListener('keyup',e=>{if(['Space','ArrowUp'].includes(e.code))engine?.endLiftInput()});
window.addEventListener('blur',()=>engine?.endLiftInput(true));
let treeResizeFrame=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(treeResizeFrame);treeResizeFrame=requestAnimationFrame(()=>{if(document.querySelector('dialog.tree-sheet'))showSkills();if(screen==='map')drawMap()})});

if(mockMode)goToRun();

// Host display controls pause a live scene before changing its presentation.
if(new URLSearchParams(location.search).get('hosted')==='1'&&window.parent!==window){
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='wisp-host-pause')return;
  if(engine&&!engine.dying&&!engine.completing)showMenu();
 });
}
