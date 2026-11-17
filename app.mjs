import {FIRST_LIGHT_COMBO,firstLightComboLesson,armFirstLightCombo,firstLightComboQuiet,createFirstLightComboFeedback} from './first-light-combo.mjs?v=pulse-1';
import {isPlayablePractice,isPracticeCourseRun,practiceCardFaces,practiceCardRun,loanPracticeCards,practicePurpose,nextPracticeLesson,reorderPracticeCards} from './practice-route.mjs?v=pulse-1';
import {practiceCampLesson,practiceLessonStep} from './practice-course.mjs?v=pulse-1';
import {cardFace} from './card-ui.mjs?v=pulse-1';
import {completedGameScore} from './game-score.mjs?v=pulse-1';
import {gameResultMarkup} from './score-result.mjs?v=pulse-1';
import {scorecardLink,scorecardPNG,downloadScorecard,shareScorecard} from './scorecard.mjs?v=pulse-1';
import {createCardRowFeedback} from './card-row-feedback.mjs?v=pulse-1';
import {createActivationFeedback} from './activation-feedback.mjs?v=pulse-1';
import {createRhythmScore} from './rhythm-score.mjs?v=pulse-1';
import {bindFlightPointerControls} from './flight-input.mjs?v=pulse-1';
import {bindDeckDragging} from './deck-drag.mjs?v=pulse-1';
import {setCollectorPreference} from './model.mjs?v=pulse-1';
import {menuIcon as icon} from './menu-icons.mjs?v=pulse-1';
import {installationState,installationInstructions,onInstallationChange,requestInstall,refreshBuild,registerUpdateClient,updateCheckpoint} from './pwa.mjs?v=pulse-1';
import {prepareRouteOffer} from './route-offers.mjs?v=pulse-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=pulse-1';
import {updateBonusGauge,bonusProgressText} from './route-bonus-ui.mjs?v=pulse-1';
import {forecastCheckpointMarkup} from './night-atlas.mjs?v=pulse-1';
import {markFlightAttemptStarted,previewAtlasMap,CAMPAIGN_MAP_NAMES} from './model.mjs?v=pulse-1';
import {getBossPreview} from './boss.mjs?v=pulse-1';
import {flightPreviewMarkup} from './flight-preview.mjs?v=pulse-1';
import {collectionMarkup,COLLECTION_PAGE_SIZE} from './collection-view.mjs?v=pulse-1';
import {restBenefitsMarkup} from './rest-choice-view.mjs?v=pulse-1';
import {treasureView} from './treasure-view.mjs?v=pulse-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=pulse-1';
import {artifactDescription} from './artifact-copy.mjs?v=pulse-1';
import {showNightmare} from './nightmare.mjs?v=pulse-1';
import {startResumeCountdown} from './resume-countdown.mjs?v=pulse-1';
import {automaticTipsEnabled,nextOnboardingLesson,markOnboardingSeen,resetOnboarding,noteOnboardingPrompt,noteOnboardingProgress,onboardingFeatureAvailable,onboardingFlightPlan,lanternEntryLesson,giantBlackHoleEntryLesson} from './onboarding.mjs?v=pulse-1';
import {flightRewardMarkup,rewardEarningsDetailMarkup,scribeMarkup} from './reward-screen.mjs?v=pulse-1';
import {stopPreviewMarkup} from './stop-preview.mjs?v=pulse-1';
import {ensureScribeStop,leaveScribe,cancelScribeStop} from './model.mjs?v=pulse-1';
import {runForgeCeremony} from './forge-ceremony.mjs?v=pulse-1';
import {hasFlightRewardCeremony,flightRewardCeremonyStage,advanceFlightRewardCeremony,flightRewardCeremonyMarkup,mountFlightRewardCeremony,mountReceiptInspector} from './flight-reward-ceremony.mjs?v=pulse-1';
import {flightEntryMarkup,prepareFlightDeparture,resumeGateMarkup,waitForFlightEntry,preloadFlightEntry} from './flight-entry.mjs?v=pulse-1';
import {TUTORIAL_TOPICS,topicSteps} from './tutorial-curriculum.mjs?v=pulse-1';
import {resourceCycleSteps} from './resource-cycle.mjs?v=pulse-1';
import {tutorialVisualMarkup} from './tutorial-visuals.mjs?v=pulse-1';
import {deathScreenMarkup} from './death-screen.mjs?v=pulse-1';
import {createLanternMapInspectorState} from './lantern-map-inspector.mjs?v=pulse-1';
import {createBoundaryInspectorState,frameBoundaryInspection} from './boundary-run-inspector.mjs?v=pulse-1';
import {LANTERN_THEME,LANTERN_CHAPTER} from './map-theme.mjs?v=pulse-1';
import {choiceScene} from './choice-art.mjs?v=pulse-1';
import {contextualFlightNotice} from './contextual-events.mjs?v=pulse-1';
import {createMusic} from './music.mjs?v=pulse-1';
import {createFxLevel,levelGain,levelForKey,levelFromPointer} from './sound-level.mjs?v=pulse-1';
import {pauseMenuMarkup,settingsMarkup,pauseContextLine,updateLevelControl} from './ui/pause-menu.mjs?v=pulse-1';
import {GAME_VERSION} from './build-version.mjs?v=pulse-1';
import {resourceSymbol} from './game-symbols.mjs?v=pulse-1';
import {nextArtifactNotice,artifactUseLesson} from './artifact-lessons.mjs?v=pulse-1';
import {getArtifactInfo,CONSUMABLE_ARTIFACTS,EVOLVING_ARTIFACTS} from './artifact-info.mjs?v=pulse-1';
import {checkpointTutorialLesson,observedFlightLesson,flightEffectLesson} from './tutorial-steps.mjs?v=pulse-1';
import {ARTIFACT_ENGINE_RULES} from './artifact-effects.mjs?v=pulse-1';
import {rewardThemeMarkup,encounterIntent,encounterIntentMarkup,artifactOfferMarkup,artifactDetailMarkup,artifactRarityLabel,artifactSummaryMarkup,artifactLifetimeMarkup} from './replay-ui.mjs?v=pulse-1';
import {installLandscapeMode} from './landscape.mjs?v=pulse-1';
import {drawLandscapeMap} from './landscape-map.mjs?v=pulse-1';
import {attachDream,canDreamAt,dreamEye,prepareDreamHandoff,updateDreamIndicator,validateDreamPreset} from './dream.mjs?v=pulse-1';
import {previewScribeWrite} from './model.mjs?v=pulse-1';
import {chooseFlightReward,getAvailableUpgrades,acknowledgeVictory,takeClearRewardReceipt} from './model.mjs?v=pulse-1';
import {formatGlow,glowPercent,getGlowCapacity,glowText,getLifeCapacity} from './vitality.mjs?v=pulse-1';
import {glowGaugeMarkup,updateGlowGauge} from './glow-ui.mjs?v=pulse-1';
import {edgingPulseMarkup,updateEdgingPulse} from './edging-ui.mjs?v=pulse-1';
import {skillBookMarkup,skillBookChapter} from './skill-book.mjs?v=pulse-1';
import {livesMarkup,lifeHeartSvg} from './lives.mjs?v=pulse-1';
import {attachFlightPerformance,downloadPerformanceReport} from './flight-performance.mjs?v=pulse-1';
import {getChallengePreview} from './flight-challenges.mjs?v=pulse-1';
import {homeMenuMarkup,runProgressMarkup,companionLockIcon} from './run-menu.mjs?v=pulse-1';
import {skillIcon,artifactIcon} from './upgrade-icons.mjs?v=pulse-1';
import {TERRAINS,SKILLS,ARTIFACTS,newState,loadState,saveState,createRun,getStartingArtifact,getStartingGiftOffers,canChooseStartingGift,getStartingGiftPreview,chooseStartingGift,chooseStartingSkill,setTestOverride,grantTestCondensedGlow,getStartingCompanion,setStartingCompanion,startTutorial,leaveTutorial,shouldStartTutorial,getChoices,getRouteMapState,selectNode,beginFlightAttempt,retryFlight,finishFlight,getSupportChoices,resolveSupport,settleCheckpoint,bankRun,advanceMap,previewGlowReward,getSkillCost,getSkillPrice,getSkillWallet,getSkillLockReason,suspendRun,abandonRun,isSkillRevealed,canBuyCheckpointSkills,buyCheckpointSkill,getRunModifiers,canChangeCompanion,setCompanions,sellArtifact,canSellArtifact,getArtifactSalvageValue} from './model.mjs?v=pulse-1';
import {WispFlight} from './flight.mjs?v=pulse-1';
import {COMPANION_ABILITIES,getCompanionAbility,getCompanionUnlock,normalizeCompanionRole} from './companion-abilities.mjs?v=pulse-1';
import {companionArtSvg} from './companion-art.mjs?v=pulse-1';
import {boostControlMarkup,updateBoostControl} from './boost-control.mjs?v=pulse-1';
import {campaignStrip,bossSigil,guardianRitualMarkup} from './campaign-ui.mjs?v=pulse-1';
import {resolveLevelIdentity} from './level-catalog.mjs?v=pulse-1';
import {levelMapGlyph,levelMapPreview} from './level-map-art.mjs?v=pulse-1';
import {getAscentInfo} from './ascent.mjs?v=pulse-1';
import {getRouteForecast} from './route-forecast.mjs?v=pulse-1';
import {MAP_STOP_TYPES,getMapStopInfo,mapStopIconMarkup,getEventScenarios,mapBiomeGuideMarkup} from './map-guide.mjs?v=pulse-1';
import {formatFlightDuration} from './level-length.mjs?v=pulse-1';
import {condensedIconMarkup} from './afterglow-ui.mjs?v=pulse-1';
import {pickupGuideMarkup,pickupLesson} from './pickup-guide.mjs?v=pulse-1';
import {createTutorialCoach} from './tutorial-coach.mjs?v=pulse-1';
import {getTutorialWorldFocus,demonstratedTutorialTopics,tutorialEntryLesson,notePracticeHint,hasPracticeHint,takePracticeHint,carryPracticeHints,takeCarriedPracticeHint,deferPracticeLesson,FIRST_FLIGHT_STOPS} from './tutorial.mjs?v=pulse-1';
import {isInventoryOnlyCard} from './skill-cards.mjs?v=pulse-1';
import {markCardsSeen} from './model.mjs?v=pulse-1';
import {isCardRun,getCardCampPreview,getMountedCards,getOwnedCards,getCardReward,getCardDraft,claimDraftedCard,equipOwnedCard,unequipMountedCard,getCardMeltPreview,meltOwnedCards,getCardImprovePreview,improveOwnedCard,getCardForgePreview,forgeOwnedCard,canManageCards,syncCardFlightForEdit,applyCardFlightEdits,closeCardFlightEdit,commitCardCharges} from './model.mjs?v=pulse-1';
import {CARD_GUIDE_TOPICS} from './card-guide.mjs?v=pulse-1';
import {installComboLessons} from './combo-lesson.mjs?v=pulse-1';
import {starterCardsMarkup,starterGiftConfirmationMarkup,cardDraftMarkup,cardRewardMarkup,cardSwapMarkup,cardsBenchMarkup,cardMeltSelectionMarkup,cardExchangeMarkup,cardRestMarkup,cardGrowConfirmationMarkup,cardForgeMarkup,cardVictoryRecap,cardArt,cardName} from './card-ui.mjs?v=pulse-1';
import {getCardRefillPreview,refillOwnedCard,canUseCardCampServices} from './model.mjs?v=pulse-1';
import {cardWorkshopMarkup,cardRefillMarkup} from './card-workshop.mjs?v=pulse-1';
import {createCardInspectorState,prepareCardInspectorReward} from './card-inspector.mjs?v=pulse-1';
import {installCardTermHelp} from './card-terms.mjs?v=pulse-1';
import {resolveCardHelpContext} from './card-row-help.mjs?v=pulse-1';
// v2.3-deck: the Chain and Deck screens. Play on the Chain tab replaces the old Try row.
import {createDeckView,deckScreenMarkup,mountDeckScreen} from './ui/deck-screen.mjs?v=pulse-1';
import {previewBlackHoleMeals} from './card-black-hole.mjs?v=pulse-1';
installCardTermHelp(document,{
 resolveCardContext:button=>resolveCardHelpContext(button,state.run,{example:cardInspector,snapshot:engine?lastSnapshot:null}),
 resolveProximityContext:button=>({run:state.run,instanceId:button.closest('[data-card-instance]')?.dataset.cardInstance,example:cardInspector})
});
if(window.parent!==window&&new URLSearchParams(location.search).has('hosted'))document.documentElement.dataset.framed='';
const app=document.querySelector('#app'),header=document.querySelector('#header');
const mockScene=new URLSearchParams(location.search).get('mock');
const modeQuery=new URLSearchParams(location.search);
// Cards is the main game. Explicit legacy links keep the original save separate.
const cardPilot=mockScene==='cards'||(modeQuery.get('cards')!=='0'&&modeQuery.get('legacy')!=='1'&&(modeQuery.get('cards')==='1'||!['rest','treasure','lantern-map','boundary'].includes(mockScene)));
// Keep the existing cards namespace, including practice and its suspended run.
const gameStorage={getItem:key=>localStorage.getItem(cardPilot?`cards-pilot:${key}`:key),setItem:(key,value)=>localStorage.setItem(cardPilot?`cards-pilot:${key}`:key,value),removeItem:key=>localStorage.removeItem(cardPilot?`cards-pilot:${key}`:key)};
const restInspector=mockScene==='rest',treasureInspector=mockScene==='treasure',lanternInspector=mockScene==='lantern-map',boundaryInspector=mockScene==='boundary',cardInspector=mockScene==='cards'||mockScene==='engine',mockFlightProbe=()=>engine,mockMode=restInspector||lanternInspector||treasureInspector||boundaryInspector||cardInspector;
if(mockMode)globalThis.__mockFlight=mockFlightProbe; // Dev scenes only (nothing is saved): proofs drive the live flight.
let state;if(cardInspector)state=createCardInspectorState(new URLSearchParams(location.search));else if(boundaryInspector)state=createBoundaryInspectorState(new URLSearchParams(location.search));else if(restInspector)state=(await import('./rest-inspector.mjs?v=pulse-1')).createRestInspectorState(new URLSearchParams(location.search));else if(treasureInspector)state=(await import('./rest-inspector.mjs?v=pulse-1')).createTreasureInspectorState(new URLSearchParams(location.search).get('treasure')||'vessel');else if(lanternInspector)state=createLanternMapInspectorState();else try{state=loadState(gameStorage)}catch{state=newState()}
document.body.classList.toggle('card-pilot',cardPilot);
if(state.run?.isTutorial)state.run.cardPilot=cardPilot;
let boundaryEdgeStyle=new URLSearchParams(location.search).get('edge')||(new URLSearchParams(location.search).has('spacetime')?'spectral':'moon'),boundaryReveal=false;
if(state.settings.reducedMotion)document.documentElement.dataset.reducedMotion='true';
let launchTicket=0,flightLoading=false,resumeArmed=false,cancelCountdown=null,rewardAnimating=false,pendingDeparture=null;
let ceremonyCleanup=null,ceremonyOpening=null,ceremonyPickReadyAt=0,ceremonyFreshDraftId=null;
let screen='home',engine=null,paused=false,hud=null,bookChapter='wisp',lesson=null,lastSnapshot=null;
installComboLessons({beforeOpen:()=>{pauseFlight();hideLesson();}});
let selectedDifficulty=state.profile.difficulty||1;let bookVariant='map',mainSkillSelection='main-efficiency';
const performanceEnabled=new URLSearchParams(location.search).get('perf')==='1';let flightPerformance=null;
const fxLevel=createFxLevel();let muted=fxLevel.level===0;
const music=createMusic();music.setFxGain?.(levelGain(fxLevel.level));
// Music and FX volume levels (0 off to 4), shared by the pause menu, Settings and the flight engine.
function soundLevels(){return {music:{level:music.level,last:music.lastLevel},fx:{level:fxLevel.level,last:fxLevel.last}};}
function applyFxLevel(){muted=fxLevel.level===0;music.setFxGain?.(levelGain(fxLevel.level));engine?.setMuted?.(muted);engine?.setFxGain?.(levelGain(fxLevel.level));}
function setSoundLevel(channel,level){if(channel==='music')music.setLevel(level);else{fxLevel.set(level);applyFxLevel();}syncSoundLevels();}
function toggleSound(channel){if(channel==='music')music.setEnabled(!music.enabled);else{fxLevel.toggle();applyFxLevel();}syncSoundLevels();}
function syncSoundLevels(){const levels=soundLevels();for(const control of document.querySelectorAll('.wb-level[data-channel]')){const s=levels[control.dataset.channel];if(s)updateLevelControl(control,s.level,s.last);}}
document.addEventListener('click',e=>{const mute=e.target.closest?.('[data-level-mute]');if(mute){toggleSound(mute.dataset.levelMute);return;}const bars=e.target.closest?.('[data-level-bars]');if(bars){const box=bars.getBoundingClientRect();setSoundLevel(bars.dataset.levelBars,levelFromPointer(e.clientX-box.left,box.width));}});
document.addEventListener('keydown',e=>{const bars=e.target.closest?.('[data-level-bars]');if(!bars)return;const channel=bars.dataset.levelBars,next=levelForKey(channel==='music'?music.level:fxLevel.level,e.key);if(next===null)return;e.preventDefault();e.stopPropagation();setSoundLevel(channel,next);},true);
function switchRestInspector(enabled){if(engine){pauseFlight();suspendRun(state);}persist();const url=new URL(location.href);url.pathname=url.pathname.replace(/rest-scene\.html$/,'index.html');url.searchParams.delete('scenario');if(enabled)url.searchParams.set('mock','rest');else url.searchParams.delete('mock');if(window.parent!==window)window.parent.postMessage({type:'wisp-mock-mode',enabled},location.origin);location.assign(url.href);}
// Developer scene switch: shown in TEST or any mock= scene, so the rest preview can always be left.
function restPreviewAvailable(){return restInspector||!!mockScene||!!state.settings?.testOverride}
function mockControl(){return `<button class="mock-toggle" data-action="mock-toggle" aria-pressed="${restInspector}">${mapStopIconMarkup('rest')}REST PREVIEW · ${restInspector?'ON':'OFF'}</button>`}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allRoles=()=>Object.values(COMPANION_ABILITIES);
const runLength=(r=state.run)=>r?.map?.length||10;
const mapHeight=(r=state.run)=>runLength(r)*160+225;
const roleFleet=()=>[normalizeCompanionRole((state.run&&(state.run.phase!=='ended'||state.run.victoryPending)?state.run.companions?.[0]||state.run.companionRole:state.settings.companions?.[0])||'collector')];
const featureAvailable=feature=>onboardingFeatureAvailable(state.profile,state.run,feature);
function stopCountdown(){cancelCountdown?.();cancelCountdown=null;}

const socketLock='<svg viewBox="0 0 16 18" fill="none" aria-hidden="true"><path d="M4 7V4h2V2h4v2h2v3M2 7h12v9H2zM8 10v3" stroke="currentColor" stroke-width="1.5" shape-rendering="crispEdges"/></svg>';
const artifactById=id=>ARTIFACTS[id]||Object.values(ARTIFACTS).find(a=>a.id===id);
function persist(){if(mockMode){updateCheckpoint();return true;}let saved=false;try{saved=saveState(state,gameStorage)===true;}catch{}updateCheckpoint();return saved;}
function notify(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),2300)}
function menuButton(){return `<button class="game-menu-trigger" data-action="menu" aria-label="Game menu${screen==='flight'?', pause flight':''}">${icon('tune')}<span>MENU</span></button>`}
function mapEnergy(run){
 const value=formatGlow(run.flame),max=formatGlow(getGlowCapacity(run));
 return `<span class="map-energy" role="img" aria-label="${value} of ${max} Sparks" title="Spark Meter: ${value} of ${max}">${resourceSymbol('energy')}<b>${value}<i>/</i>${max}</b></span>`;
}
function renderHeader(){
 if(screen==='death'){header.innerHTML='';return;}
 const r=state.run,inside=screen!=='home'&&r&&(r.phase!=='ended'||r.victoryPending),route=screen==='map';
 const affordable=inside&&!isPlayablePractice(r)?getAvailableUpgrades(state).length:0,wallet=Math.floor(getSkillWallet(state).condensedGlow||0);
 const walletLabel=`${isCardRun(r)?'Deck':'Skills'} · ${wallet} Stored Sparks${affordable?` · ${affordable} affordable upgrade choices`:''}`;
 const chapter=route&&r.map[0]?.[0]?.mapTheme===LANTERN_THEME?LANTERN_CHAPTER:'';
 header.innerHTML=`<div class="game-top-left">${screen==='home'?'<span class="header-wisp">W</span>':`<button class="game-round back-icon" data-action="${['briefing','support'].includes(screen)?'back-route':'exit-menu'}" aria-label="${['briefing','support'].includes(screen)?'Back':'Exit to menu'}">${icon('back')}</button>`}${route?`<div class="route-heading">${r.isTutorial?'<span>Practice</span>':`<span>Ascension ${r.difficulty}</span><b>Map ${r.mapIndex+1} / 3${chapter?` · ${chapter}`:''}</b>`}</div>`:''}</div><div class="header-end">${route?livesMarkup(r)+mapEnergy(r):''}${inside&&!(isPlayablePractice(r)&&screen!=='flight')&&r.phase!=='ended'&&(isCardRun(r)||featureAvailable('skills'))?`<button class="bank saved-wallet-bank ember-wallet condensed-wallet${affordable?' has-upgrades':''}" data-action="skills" aria-label="${walletLabel}" title="${walletLabel}"><span class="wallet-currency-icon">${condensedIconMarkup()}</span><b>${wallet}</b>${affordable?`<span class="wallet-upgrades" aria-hidden="true"><svg viewBox="0 0 24 28" shape-rendering="crispEdges"><path d="M10 2h4v4h4v4h4v4h-7v12H9V14H2v-4h4V6h4Z" fill="currentColor"/></svg><span class="wallet-upgrade-count">${affordable}</span></span>`:''}</button>`:''}${screen==='home'?'':menuButton()}</div>`;
}
function destroyFlight(){stopCountdown();launchTicket++;flightLoading=false;resumeArmed=false;pendingDeparture=null;hud?.activationFeedback?.destroy();hud?.rhythmScore?.destroy();hud?.firstLightCombo?.destroy();hud?.cardRowFeedback?.destroy();engine?.destroy();engine=null;hud=null;paused=false;document.body.classList.remove('playing','dream-rehearsal');hideLesson()}
function render(view=screen){ceremonyCleanup?.();ceremonyCleanup=null;clearTimeout(ceremonyOpening);ceremonyOpening=null;updateCheckpoint();screen=view;music.setScene(view==='flight'?'flight':view==='rest-prep'?'rest':view==='victory'||view==='map-clear'||view==='card-draft'?'clear':view==='death'?'loss':'menu');document.body.dataset.screen=screen;document.body.dataset.practice=String(!!state.run?.isTutorial);document.body.dataset.companionRole=normalizeCompanionRole(roleFleet()[0]);document.body.classList.toggle('playing',screen==='flight');renderHeader();const views={home:renderHome,map:renderMap,briefing:renderBriefing,support:renderSupport,retry:renderRetry,death:()=>deathScreenMarkup(state.run),'map-clear':renderMapClear,result:renderResult,victory:renderVictory,'rest-prep':renderRestPrep,'card-draft':()=>flightRewardCeremonyMarkup(state.run),'card-reward':()=>cardRewardMarkup(state.run,{equipping:cardRewardEquipping,notice:cardRewardNotice})};app.innerHTML=(views[screen]||renderHome)();if(screen==='card-draft')mountCardDraftCeremony();if(screen==='map')drawMap();requestAnimationFrame(()=>{if(screen==='home'&&state.updateNotice){const notice=state.updateNotice;delete state.updateNotice;persist();openSheet(`<h2>Your game has changed</h2><p class="run-pause-note">${esc(notice)}</p><button class="primary" data-action="close-sheet">Got it</button>`,'run-confirm-sheet');return;}if(screen==='death')setTimeout(()=>{if(screen==='death')guideScreen('death')},1850);else guideScreen(screen)})}
function mountCardDraftCeremony(){
 const run=state.run,draftId=run?.cardDraft?.id;
 const animateWallet=ceremonyFreshDraftId===draftId;ceremonyFreshDraftId=null;
 const root=app.querySelector('.flight-reward-ceremony');
 const unmountInspector=mountReceiptInspector(root,run);
 const unmountCeremony=mountFlightRewardCeremony({root,run,animateWallet,reducedMotion:state.settings.reducedMotion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
 ceremonyCleanup=()=>{unmountInspector();unmountCeremony();};
}
function finishCardDraftIncome(){
 if(screen!=='card-draft'||!advanceFlightRewardCeremony(state.run,state.run?.cardDraft?.id,'pack'))return;
 persist();render('card-draft');
}
function openCardDraftPack(button){
 const run=state.run,root=app.querySelector('.flight-reward-ceremony');
 if(screen!=='card-draft'||ceremonyOpening||!advanceFlightRewardCeremony(run,button.dataset.draftId,'cards'))return;
 // Save the opened state before animation. Reloading never redraws the offers.
 persist();button.disabled=true;root?.classList.add('flight-reward-opening');
 const reduced=state.settings.reducedMotion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 ceremonyPickReadyAt=performance.now()+(reduced?220:650);
 const reveal=()=>{
  ceremonyOpening=null;if(screen!=='card-draft'||state.run!==run)return;
  render('card-draft');const fan=app.querySelector('.flight-reward-ceremony');
  if(!reduced)fan?.classList.add('flight-reward-revealing');
  setTimeout(()=>fan?.classList.remove('flight-reward-revealing'),500);
 };
 if(reduced)reveal();else ceremonyOpening=setTimeout(reveal,360);
}
let guardianRitualTimer=null;
function playGuardianRitual(r){
 if(guardianRitualTimer)return;
 closeSheet();hideLesson();screen='guardian-ritual';music.setScene('clear');document.body.dataset.screen=screen;document.body.classList.remove('playing','dream-rehearsal');header.innerHTML='';app.innerHTML=guardianRitualMarkup(r);
 guardianRitualTimer=setTimeout(()=>{guardianRitualTimer=null;if(state.run!==r)return;r.guardianRituals||=[];if(!r.guardianRituals.includes(r.mapIndex))r.guardianRituals.push(r.mapIndex);persist();goToRun();},6000);
}
function goToRun(){
 const r=state.run;
 if(r&&!r.isTutorial&&r.lastFlight?.boss&&(r.victoryPending||r.success)&&!r.guardianRituals?.includes(r.mapIndex))return playGuardianRitual(r);
 if(!r)return render('home');
 if(r.deathPending)return render('death');
 if(getCardDraft(r)){settleCheckpoint(state);if(hasFlightRewardCeremony(r)&&!r.cardDraft.ceremony){r.cardDraft.ceremony={version:1,stage:'income',incomeStarted:true};ceremonyFreshDraftId=r.cardDraft.id;}persist();return render('card-draft');}
 if(isCardRun(r)&&getCardReward(r)&&!getCardReward(r).uiAcknowledged&&(!getCardReward(r).trophy||getCardReward(r).draftId)){persist();return render('card-reward');}
 if(r.victoryPending){settleCheckpoint(state);persist();return render('victory')}
 if(r.phase==='briefing'){
  if(landscape.isPortrait())return render('map');
  return launch();
 }
 if(r.phase==='map'&&r.restReady)return render('rest-prep');
 if(r.phase==='ended'){settleCheckpoint(state);bankRun(state);persist();return render('result')}
 if(r.phase==='map-clear'){settleCheckpoint(state);persist();return render('map-clear')}
 render(({map:'map',support:'support',retry:'retry'}[r.phase])||'map');
 if(r.phase==='map'){showMapEarnings();if(canChooseStartingGift(r))showStartingGifts(true);}
}
function showMapEarnings(){
 const receipt=takeClearRewardReceipt(state.run);
 if(!receipt)return;
 persist();
 const wallet=header.querySelector('.condensed-wallet');
 if(receipt.amount&&wallet)wallet.classList.add('wallet-banked');
 if(!receipt.notes.length)return;
 const bounds=wallet?.getBoundingClientRect();
 const mark=document.createElement('div');
 mark.className='map-clear-earnings';mark.setAttribute('role','status');
 mark.style.left=(bounds?bounds.left+bounds.width/2:innerWidth-110)+'px';
 mark.style.top=(bounds?bounds.bottom+7:52)+'px';
 mark.innerHTML=receipt.notes.map(note=>`<span>${esc(note)}</span>`).join('');
 document.body.appendChild(mark);
 const clear=()=>mark.remove();mark.addEventListener('animationend',clear,{once:true});setTimeout(clear,2600);
}
// Preview a real expedition without replacing a saved run. Back/reload retains the offered roll.
const starterSeedKey=cardPilot?'orbix-next-cards-expedition':'orbix-next-expedition';
// A practice skip or completion covers the pending New Game for this session.
let pendingStart=null,pendingGiftSelection=null,practiceSkippedForNewGame=false;
const starterNoun=()=>cardPilot?'card':'gift';
function draftRun(){
 const role=getStartingCompanion(state),test=state.settings.testOverride,previewKey=[role,selectedDifficulty,test].join(':');
 if(pendingStart?.previewKey===previewKey)return pendingStart.run;
 let seed=pendingStart?.run.campaignSeed;
 if(!mockMode&&!seed)try{seed=localStorage.getItem(starterSeedKey)||undefined;}catch{}
 const run=createRun(test?{...state.profile,difficulty:Math.max(6,state.profile.difficulty||1)}:state.profile,seed,selectedDifficulty,{cards:cardPilot,cruisingSpeed:getCruisingSpeed(state)});
 if(test)run.testMode=true;
 setCompanions(run,[role]);
 pendingStart={run,previewKey};
 if(!mockMode)try{localStorage.setItem(starterSeedKey,run.campaignSeed);}catch{}
 return run;
}
function showStartingGifts(existing=false){
 pendingGiftSelection=null;
 const run=existing?state.run:draftRun();if(!canChooseStartingGift(run))return;
 if(isCardRun(run))return openSheet(starterCardsMarkup(run,getStartingGiftOffers(run),existing),'card-sheet card-starter-sheet');
 const gifts=getStartingGiftOffers(run).map(gift=>[
  gift.id,gift.name,gift.skillId?'Starting skill':gift.artifactIds.length>1?'Relic pairing':'Starting relic',
  gift.skillId?skillIcon(SKILLS[gift.skillId]):gift.artifactIds.map(id=>artifactIcon(id)).join(''),
  gift.description
 ]);
 openSheet(`<section class="starting-gifts"><header><div><small>NEW EXPEDITION</small><h2>Choose your starting gift</h2></div><button class="secondary gift-back" data-action="close-sheet">Back</button></header><div class="starting-gift-trio starting-gift-pair">${gifts.map(([id,title,kind,art,effect])=>`<button class="starting-gift gift-${id}" data-action="${existing?'existing-gift':'new-gift'}" data-id="${id}"><span class="gift-art">${art}</span><small>${kind}</small><strong>${esc(title)}</strong><span class="gift-effect">${esc(effect)}</span></button>`).join('')}</div></section>`,'starting-gift-sheet');
}
function requestStartingGift(id,existing){
 const run=existing?state.run:pendingStart?.run;
 if(!isCardRun(run))return takeStartingGift(id,existing);
 const preview=getStartingGiftPreview(run,id);if(!preview)return;
 pendingGiftSelection={run,id,existing,token:preview.token};
 const sheet=openSheet(starterGiftConfirmationMarkup(run,preview,existing),'card-sheet card-starter-sheet card-starter-confirm-sheet');
 sheet.addEventListener('cancel',event=>{event.preventDefault();cancelStartingGift(existing);});
}
function cancelStartingGift(existing){
 const selected=pendingGiftSelection;if(!selected||selected.existing!==existing)return;
 showStartingGifts(existing);
 requestAnimationFrame(()=>document.querySelector(`dialog.card-starter-sheet [data-id="${CSS.escape(selected.id)}"]`)?.focus({preventScroll:true}));
}
function confirmStartingGift(id,existing,token){
 const selected=pendingGiftSelection,run=existing?state.run:pendingStart?.run;
 if(!selected||selected.run!==run||selected.id!==id||selected.existing!==existing||selected.token!==token)return;
 if(takeStartingGift(id,existing,token))pendingGiftSelection=null;
}
function takeStartingGift(id,existing,token){
 const run=existing?state.run:pendingStart?.run;if(!run||!chooseStartingGift({run},id,token))return false;
 closeSheet();
 if(!existing){
  practiceSkippedForNewGame=false;
  destroyFlight();
  if(state.run?.isTutorial)leaveTutorial(state);
  if(state.run&&(state.run.phase!=='ended'||state.run.victoryPending))abandonRun(state);
  state.run=run;pendingStart=null;
  if(!mockMode)try{localStorage.removeItem(starterSeedKey);}catch{}
  if(state.profile.onboarding?.replayIntro){state.profile.onboarding.stage=0;run.onboardingIntroReplay=true;}
 }
 // Gift IDs can name relics or relic bundles; only the learned skill belongs
 // in the Skills book. Save the chosen run before preparing its presentation.
 persist();
 mainSkillSelection=SKILLS[run.startingSkill]?run.startingSkill:'main-efficiency';
 bookChapter=skillBookChapter(SKILLS[mainSkillSelection]);goToRun();return true;
}
function beginNewGame(){
 closeSheet();
 if(state.run?.isTutorial)exitTutorial();
 if(practiceFirst()){enterTutorial({forNewGame:true,difficulty:selectedDifficulty});return;}
 showStartingGifts();
}
function practiceFirst(){return shouldStartTutorial(state)&&!state.settings.testOverride&&!practiceSkippedForNewGame;}
function requestNewGame(){
 if(state.run?.phase==='ended'&&(state.run.victoryPending||getCardDraft(state.run)||state.run.cardReward?.draftId&&!state.run.cardReward.uiAcknowledged))return goToRun();
 // Practice is never the run a new game replaces.
 if(state.run?.isTutorial&&state.run.phase!=='ended')return showPracticeNewGame();
 if(!state.run||state.run.phase==='ended')return beginNewGame();
 const r=state.run;
 pauseFlight();openSheet(`<h2>Start a new game?</h2><p class="run-pause-note">A new game will replace your Ascension ${r.difficulty} run (map ${Math.min(3,(Number(r.mapIndex)||0)+1)} of 3). Its skills, artifacts and Stored Sparks reset. Permanent unlocks stay.</p><div class="run-pause-actions"><button class="secondary" data-action="close-sheet">Keep current run</button><button class="primary" data-action="confirm-new-game">${practiceFirst()?'Start with First Light':`Choose a new ${starterNoun()}`}</button></div>`,'run-confirm-sheet');
}
function showPracticeNewGame(){
 pauseFlight();const real=state.suspendedRun&&state.suspendedRun.phase!=='ended'&&!state.suspendedRun.banked;
 openSheet(`<h2>You're in First Light</h2><p class="run-pause-note">This is practice with temporary loans. ${real?'Your saved run stays safe until you confirm a new game. ':''}Continue practising, or skip to your starting ${starterNoun()}.</p><div class="run-pause-actions"><button class="secondary" data-action="continue-run">Continue practice</button><button class="primary" data-action="practice-skip-to-start">Skip to starting ${starterNoun()}</button></div>`,'run-confirm-sheet');
}
function skipPracticeToStart(){
 const continuation=state.run?.tutorialContinuation;
 practiceSkippedForNewGame=true;exitTutorial();
 if(continuation)selectedDifficulty=continuation.difficulty;
 requestNewGame();
}
function exitToMenu(){closeSheet();if(state.run?.isTutorial)return exitTutorial();suspendRun(state);destroyFlight();persist();render('home')}
function requestAbandon(){if(state.run?.isTutorial)return exitTutorial();pauseFlight();openSheet(`<h2>Abandon this run?</h2><p class="run-pause-note">Your run skills and unspent Stored Sparks are lost. Permanent unlocks stay; artifact effects reset. To continue later, use Exit to Menu instead.</p><div class="run-pause-actions"><button class="secondary" data-action="close-sheet">Keep playing</button><button class="primary" data-action="confirm-abandon">Abandon run</button></div>`,'run-confirm-sheet')}
function showUnlocks(){pauseFlight();openSheet(fleetMarkup(),'companion-sheet')}

function enterTutorial(options={}){closeSheet();if(engine){pauseFlight();suspendRun(state)}if(!startTutorial(state,options)){if(state.run?.isTutorial)goToRun();return;}state.run.cardPilot=cardPilot;destroyFlight();persist();goToRun()}
function exitTutorial({continueNewGame=false,remember=false}={}){
 const continuation=state.run?.tutorialContinuation;
 if(!leaveTutorial(state,{remember}))return;
 if(continueNewGame&&continuation){practiceSkippedForNewGame=true;selectedDifficulty=continuation.difficulty;}
 closeSheet();destroyFlight();persist();render('home');
 if(continueNewGame&&continuation)showStartingGifts();
}
function skipPractice(){
 pauseFlight();
 openSheet(`<h2>Leave First Light?</h2><p class="run-pause-note">Practice has unlimited retries. Your real run and its resources stay safe.</p><div class="run-pause-actions"><button class="secondary" data-action="close-sheet">Keep practising</button><button class="secondary" data-action="skip-practice-once">Skip this time</button><button class="primary" data-action="remember-skip-practice">Remember & skip</button></div>`,'run-confirm-sheet');
}
function endRun(){closeSheet();destroyFlight();abandonRun(state);state.run=null;persist();render('home')}
function backRoute(){const r=state.run;if(!r||r.attemptActive||!['support','briefing'].includes(r.phase))return;if(r.current?.kind==='scribe'){if(r.flightReward?.claimed){notify('Use Back to map to leave the Scribe.');return;}cancelScribeStop(r);scribe={id:null,slot:null};}if(isCardRun(r)&&r.current?.kind==='camp'&&r.cardRest?.actions?.length){notify('Use Leave Rest to keep your chosen action.');return;}r.path=r.path.filter(id=>id!==r.current?.id);r.current=null;r.phase='map';persist();goToRun()}
function objectiveStrip(text,symbol='route'){return `<div class="objective-strip">${icon(symbol)}<span>${esc(text)}</span></div>`}
function nodeLocation(n){return resolveLevelIdentity(n?.levelId,n?.terrain||'ruins',`${state.run?.seed}-${n?.id}`)}
function currentAscent(n=state.run?.current){return getAscentInfo(n||{row:state.run?.step||0,difficulty:state.run?.difficulty||1},!!state.run?.isTutorial)}
function fleetArt(ids=roleFleet(),cls=''){return `<div class="fleet-orbs ${cls}">${ids.map(id=>`<span title="${esc(getCompanionAbility(id).name)}">${companionArtSvg(id)}</span>`).join('')}</div>`}
function prepOpen(){return !!(state.run&&(state.run.phase!=='ended'||state.run.victoryPending))&&canChangeCompanion(state.run)}
function tutorialCheckpoint(){const r=state.run;return r?.isTutorial?`<div class="tutorial-checkpoint prologue-tools"><span><b>FIRST LIGHT · ${Math.min(r.map.length,r.step+1)}/${r.map.length}</b><small>${esc(practicePurpose(r))} · Unlimited retries</small></span>${isPracticeCourseRun(r)&&!practiceCardFaces(r).length?'':'<button data-action="practice-deck">LOANED CARDS</button>'}<button data-action="field-guide">HELP</button><button data-action="skip-practice">Skip ${icon('arrow')}</button></div>`:''}
function practiceCardsMarkup(run){return `<div class="practice-card-row">${practiceCardFaces(run).map((card,slot)=>cardFace(card,{slot,fitted:true})).join('')}</div>`;}
function showPracticeDeck({arrange=false}={}){
 if(!isPlayablePractice(state.run))return;pauseFlight();
 // Loaned cards use the same Chain and Deck screens and can never be melted. At the Edition 4
 // camp the Chain lesson lets the player trade their Slots; everywhere else they are read-only.
 const editable=arrange&&isPracticeCourseRun(state.run)&&state.run.phase==='support'&&state.run.current?.practiceChain;
 const reopening=!!document.querySelector('dialog.practice-deck-sheet[open]');
 if(!reopening)Object.assign(deckView,createDeckView());
 const run=practiceCardRun(state.run),opts={locked:!editable,loaned:true,paused:!!engine,reducedMotion:state.settings.reducedMotion};
 const el=openSheet(deckScreenMarkup(run,deckView,opts),'practice-deck-sheet card-deck-sheet');
 const done=()=>{Object.assign(deckView,createDeckView());closeSheet();if(editable&&screen==='support')render('support');};
 mountDeckScreen(el,{run,view:deckView,opts,actions:{done,
  transfer:editable?(uid,slot,expected)=>{if(reorderPracticeCards(state.run,uid,slot,expected))persist();showPracticeDeck({arrange:true});}:undefined}});
 if(editable&&!reopening&&!state.run.guideSkipped&&!state.run.guideSeen?.['practice:boost'])requestAnimationFrame(()=>startLesson('practice:boost',[practiceLessonStep('practice:boost',{actionLabel:'Try it'})]));
}
function renderPracticeSupport(r,n){
 if(isPracticeCourseRun(r)&&n.practiceChain){
  const arranged=!!r.practiceChainArranged;
  return `<section class="practice-stop practice-chain-camp">${tutorialCheckpoint()}<div class="practice-stop-place">${mapStopIconMarkup(n)}<h1>${esc(n.name)}</h1><p>${arranged?'Your Chain is set. Fly the next passage to see it fire.':'Rest here and set the order of three loaned cards. They go back when practice ends.'}</p>${arranged?`<button class="primary" data-action="support" data-index="0">Fly with your Chain ${icon('arrow')}</button><button class="secondary" data-action="practice-chain">Open the Chain</button>`:`<button class="primary" data-action="practice-chain">Open the Chain ${icon('arrow')}</button><button class="secondary" data-action="support" data-index="0">Continue</button>`}</div><div class="practice-stop-cards">${practiceCardsMarkup(r)}<small>Loaned cards · Slot 1 goes first</small></div></section>`;
 }
 const preview=structuredClone(r),camp=n.kind==='camp';loanPracticeCards(preview,camp?['rhythm','harvest-common']:['slip-feather']);
 const offer=getSupportChoices(r,state.profile)[0];
 return `<section class="practice-stop">${tutorialCheckpoint()}<div class="practice-stop-place">${mapStopIconMarkup(n)}<h1>${esc(n.name)}</h1>${camp?livesMarkup(r):''}<p>${camp?(r.earlyComboIntroduced?'Restore your heart and Sparks. Practise the borrowed combination again.':'Restore your heart and Sparks. Try this combination in the next passage.'):'Borrow Proximity, then follow the low bend. A white Flare triangle waits along the route.'}</p><button class="primary" data-action="support" data-index="0">${camp?'Recover & borrow':'Borrow Proximity'} ${icon('arrow')}</button></div><div class="practice-stop-cards">${practiceCardsMarkup(preview)}<small>Temporary card loans · tap ? for their rules</small></div></section>`;
}
function artifactArt(id){return artifactIcon(id)}
function artifactsRevealed(){return !!state.run&&featureAvailable('artifacts')}
function artifactCollectionDock(){const ids=(state.run?.artifacts||[]).filter(id=>Object.hasOwn(ARTIFACTS,id));return artifactsRevealed()&&ids.length?`<button class="collection-dock" data-action="artifacts" aria-label="Inspect collected artifacts">${ids.slice(0,4).map(artifactArt).join('')}<span>Collection · ${ids.length}</span></button>`:'';}

let dreamReady=null,collectionPage=0,collectionSelectedId=null,collectionConfirmId=null,collectionLastMelt=null;
let cardRewardEquipping=false,cardRewardNotice='',cardSwapPending=null;
let cardSelectedId=null,cardInspecting=false,cardBrowsing=false,cardDeckScroll=0,cardMeltScroll=0,cardEquipMode=false,cardTargetSlot=null,cardMeltMode=false,cardMeltIds=new Set(),cardMeltToken=null,cardDeckNotice='',cardFlightEditing=false,cardForgeRarity='rare',cardForgeNotice='';
// These contexts belong to the open menu only. No temporary choice enters a save.
let cardView='deck',cardDeckOrigin='game',cardReaderOrigin='equipped',cardMeltOrigin=null,cardMeltSingle=false,cardForgeOrigin=null,cardLastForged=null;
let cardWorkshopOrigin=false,cardWorkshopFromDeck=false;
const deckView=createDeckView();
const deckDragging=bindDeckDragging({
 canEdit:()=>!flightLoading&&!cardMeltMode&&!cardSwapPending&&canEditDeck(),
 getCard:id=>getOwnedCards(state.run).find(c=>c.instanceId===id),
 onDrop:({id,fromSlot,kind,slot,expectedId})=>{
  if(!canEditDeck()||cardMeltMode)return;
  const selected=getOwnedCards(state.run).find(c=>c.instanceId===id);
  if(!selected||selected.slot!==fromSlot)return;
  if(kind==='return'){
   if(!unequipMountedCard(state.run,fromSlot,id))return;
   cardSelectedId=null;cardEquipMode=false;cardDeckNotice=`${cardName(selected)} → Deck. Slot ${fromSlot+1} is empty.`;repaintDeck();return;
  }
  requestCardTransfer(id,slot,expectedId,screen==='card-reward'?'reward':'deck');
 }
});

function canEditDeck(){
 if(flightLoading)return false;
 if(engine&&!syncCardFlightForEdit(state.run,engine))return false;
 return canManageCards(state.run);
}
function syncDeckFlight(){
 if(!engine)return true;
 if(!syncCardFlightForEdit(state.run,engine))return false;
 cardFlightEditing=true;return true;
}
function finishDeckFlight(){
 if(cardFlightEditing){if(engine)closeCardFlightEdit(state.run,engine);cardFlightEditing=false;}
}
function resetDeckChoices(){
 cardWorkshopOrigin=false;cardWorkshopFromDeck=false;Object.assign(deckView,createDeckView());
 cardSwapPending=null;cardSelectedId=null;cardInspecting=false;cardEquipMode=false;cardTargetSlot=null;cardMeltMode=false;cardMeltIds.clear();cardMeltToken=null;cardMeltOrigin=null;cardMeltSingle=false;cardReaderOrigin='equipped';cardDeckNotice='';cardForgeNotice='';cardForgeOrigin=null;cardLastForged=null;cardBrowsing=false;cardDeckScroll=0;cardMeltScroll=0;cardView='deck';
}
function beginDeckSession(){
 cardDeckOrigin=document.querySelector('dialog:is(.game-menu-sheet,.wb-pause-sheet)[open]')?'menu':'game';
 resetDeckChoices();
}
function openDeck(){
 if(!document.querySelector('dialog.card-sheet[open]'))beginDeckSession();
 else resetDeckChoices();
 showCards();
}
function doneDeck(){
 const origin=cardDeckOrigin;resetDeckChoices();closeSheet();
 if(origin==='menu'&&!engine)showMenu();
}
// Chromium can omit a click after touching Done in this repeatedly redrawn
// dialog. Commit only a stationary, single-finger release on that same button.
let deckDoneTouch=null;
document.addEventListener('touchstart',event=>{
 deckDoneTouch=null;
 if(event.touches.length!==1)return;
 const button=event.target.closest?.('dialog.card-bench-sheet[open] .card-close[data-action="close-sheet"]');
 if(!button||button.disabled||cardView!=='deck'||cardInspecting||cardMeltMode||cardTargetSlot!==null)return;
 const touch=event.touches[0];deckDoneTouch={button,id:touch.identifier,x:touch.clientX,y:touch.clientY};
},{capture:true,passive:true});
document.addEventListener('touchmove',event=>{
 if(!deckDoneTouch)return;
 const touch=[...event.touches].find(touch=>touch.identifier===deckDoneTouch.id);
 if(event.touches.length!==1||!touch||Math.hypot(touch.clientX-deckDoneTouch.x,touch.clientY-deckDoneTouch.y)>10)deckDoneTouch=null;
},{capture:true,passive:true});
document.addEventListener('touchcancel',()=>{deckDoneTouch=null;},{capture:true,passive:true});
document.addEventListener('touchend',event=>{
 const gesture=deckDoneTouch;deckDoneTouch=null;if(!gesture||event.touches.length)return;
 const touch=[...event.changedTouches].find(touch=>touch.identifier===gesture.id);
 if(!touch||!gesture.button.isConnected||Math.hypot(touch.clientX-gesture.x,touch.clientY-gesture.y)>10||document.elementFromPoint(touch.clientX,touch.clientY)?.closest('.card-close')!==gesture.button)return;
 event.preventDefault();event.stopImmediatePropagation();doneDeck();
},{capture:true,passive:false});
// A drag can open the review during touchend. Chromium then omits the next
// synthetic click; accept only a new stationary release on that same button.
let cardSwapTouch=null;
document.addEventListener('touchstart',event=>{
 cardSwapTouch=null;if(event.touches.length!==1)return;
 const button=event.target.closest?.('.card-swap-review button[data-action="card-swap-confirm"],.card-swap-review button[data-action="card-swap-back"]');
 if(!button||button.disabled)return;const touch=event.touches[0];cardSwapTouch={button,id:touch.identifier,x:touch.clientX,y:touch.clientY};
},{capture:true,passive:true});
document.addEventListener('touchmove',event=>{
 if(!cardSwapTouch)return;const touch=[...event.touches].find(t=>t.identifier===cardSwapTouch.id);
 if(event.touches.length!==1||!touch||Math.hypot(touch.clientX-cardSwapTouch.x,touch.clientY-cardSwapTouch.y)>10)cardSwapTouch=null;
},{capture:true,passive:true});
document.addEventListener('touchcancel',()=>{cardSwapTouch=null;},{capture:true,passive:true});
document.addEventListener('touchend',event=>{
 const gesture=cardSwapTouch;cardSwapTouch=null;if(!gesture||event.touches.length)return;
 const touch=[...event.changedTouches].find(t=>t.identifier===gesture.id);
 if(!touch||!gesture.button.isConnected||Math.hypot(touch.clientX-gesture.x,touch.clientY-gesture.y)>10||document.elementFromPoint(touch.clientX,touch.clientY)?.closest('button')!==gesture.button)return;
 event.preventDefault();event.stopImmediatePropagation();gesture.button.click();
},{capture:true,passive:false});
function showCards(){
 if(!isCardRun(state.run)||flightLoading||screen==='home'||state.run.phase==='ended'&&!state.run.victoryPending)return;
 pauseFlight();
 if(!syncDeckFlight())return;
 cardView='deck';
 const collection=document.querySelector('.card-deck-browser .card-deck-gallery');if(collection)cardDeckScroll=collection.scrollTop;
 const meltCollection=document.querySelector('.card-deck-melt-mode .card-deck-gallery');if(meltCollection)cardMeltScroll=meltCollection.scrollTop;
 const owned=getOwnedCards(state.run);if(!owned.some(c=>c.instanceId===cardSelectedId)){cardSelectedId=null;cardInspecting=false;cardEquipMode=false;}

 const liveIds=new Set(owned.map(c=>c.instanceId));cardMeltIds=new Set([...cardMeltIds].filter(id=>liveIds.has(id)));
 const opts={locked:!canManageCards(state.run),paused:!!engine,workshop:canUseCardCampServices(state.run),reducedMotion:state.settings.reducedMotion};
 const el=openSheet(deckScreenMarkup(state.run,deckView,opts),'card-sheet card-deck-sheet');
 mountDeckScreen(el,{run:state.run,view:deckView,opts,actions:deckScreenActions});
 const gallery=document.querySelector('.card-deck-browser .card-deck-gallery');if(gallery)gallery.scrollTop=cardDeckScroll;
 const meltGallery=document.querySelector('.card-deck-melt-mode .card-deck-gallery');if(meltGallery)meltGallery.scrollTop=cardMeltScroll;
}
// Real changes from the Chain and Deck screens: each goes through the model's own transaction, then the sheet reopens.
const deckScreenActions={
 done:()=>doneDeck(),
 transfer:(id,slot,expectedId)=>{if(canEditDeck())requestCardTransfer(id,slot,expectedId);else showCards();},
 takeOut:(slot,id)=>{if(canEditDeck()&&unequipMountedCard(state.run,slot,id))repaintDeck();else showCards();},
 meltQuote:id=>{if(!canEditDeck())return {eligible:false};const preview=getCardMeltPreview(state.run,[id]);return {eligible:!!preview.eligible,reason:preview.reason,amount:Math.floor(preview.amount||0),token:preview.token,wallet:Math.floor(getSkillWallet(state).condensedGlow||0)};},
 meltConfirm:(id,token)=>{if(canEditDeck()&&token&&meltOwnedCards(state,[id],token))repaintDeck();else{deckView.note='This card changed. Open it again to Melt.';deckView.noteTone='dk2-note-warn';showCards();}},
 workshop:()=>{if(!canUseCardCampServices(state.run))return;cardWorkshopFromDeck=true;showCardWorkshop();},
 back:to=>{if(to==='forge'){cardReaderOrigin='equipped';previewCardForge();}else showCards();},
};
// "All Triggers" from the glossary when the Deck is not open: open the Deck on its Triggers tab (Close returns).
document.addEventListener('trigger-book',()=>{if(document.querySelector('#dk-root')||!isCardRun(state.run)||isPlayablePractice(state.run))return;beginDeckSession();deckView.tab='triggers';deckView.bookFrom='outside';showCards();});
function backDeckWorkshop(){
 if(!cardWorkshopFromDeck)return doneDeck();
 cardWorkshopFromDeck=false;cardWorkshopOrigin=false;deckView.tab='deck';deckView.focus={tab:'deck'};showCards();
}
function selectDeckCard(id){
 const selected=getOwnedCards(state.run).find(c=>c.instanceId===id);if(!selected)return;
 if(cardMeltMode){if(cardMeltIds.has(id))cardMeltIds.delete(id);else cardMeltIds.add(id);cardMeltToken=null;}
 else if(isInventoryOnlyCard(selected)){cardReaderOrigin='deck';cardBrowsing=true;cardSelectedId=id;cardEquipMode=false;cardTargetSlot=null;cardDeckNotice='';cardInspecting=true;}
 else if(cardTargetSlot!==null){const slot=cardTargetSlot;requestCardTransfer(id,slot,getMountedCards(state.run)[slot]?.instanceId||null);return;}
 else{cardReaderOrigin=cardBrowsing?'deck':'equipped';cardSelectedId=id;cardEquipMode=true;cardDeckNotice='';cardInspecting=false;}
 showCards();
}
function requestCardTransfer(id,slot,expectedId,origin='deck'){
 if(!canEditDeck())return;
 const incoming=getOwnedCards(state.run).find(c=>c.instanceId===id),outgoing=getMountedCards(state.run)[slot];
 if(!incoming||isInventoryOnlyCard(incoming)||incoming.slot===slot||(outgoing?.instanceId||null)!==(expectedId||null))return;
 const pending={id,fromSlot:incoming.slot,slot,expectedId:outgoing?.instanceId||null,origin,surface:deckSurface()};
 commitCardTransfer(pending);
}
function cancelCardTransfer(){
 const pending=cardSwapPending;if(!pending)return;cardSwapPending=null;
 if(pending.origin==='reward'){closeSheet();cardRewardEquipping=false;render('card-reward');return;}
 restoreDeckSurface(pending.surface);
}
function commitCardTransfer(pending=cardSwapPending){
 if(!pending||!canEditDeck())return;
 const incoming=getOwnedCards(state.run).find(c=>c.instanceId===pending.id),old=getMountedCards(state.run)[pending.slot];
 if(!incoming||incoming.slot!==pending.fromSlot||(old?.instanceId||null)!==pending.expectedId){cancelCardTransfer();return;}
 if(!equipOwnedCard(state.run,pending.id,pending.slot,pending.expectedId))return;
 cardSwapPending=null;
 const notice=`${cardName(incoming)} → slot ${pending.slot+1}.${old?` ${cardName(old)} → ${pending.fromSlot===null?'Deck':`slot ${pending.fromSlot+1}`}.`:''}`;
 if(pending.origin==='reward'){cardRewardEquipping=false;cardRewardNotice=notice;persist();closeSheet();render('card-reward');return;}
 cardEquipMode=false;cardTargetSlot=null;cardSelectedId=pending.id;cardInspecting=false;cardBrowsing=!!pending.surface.browsing;cardDeckNotice=notice;repaintDeck();
}

function backDeckReader(){
 cardEquipMode=false;cardInspecting=false;cardDeckNotice='';
 if(cardReaderOrigin==='forge'){cardReaderOrigin='equipped';previewCardForge();}else{cardBrowsing=cardReaderOrigin==='deck';showCards();}
}
function acknowledgeCardReceipt(openDeck=false,id=null){
 if(engine||!state.run?.cardReward)return;
 cardRewardEquipping=false;cardRewardNotice='';state.run.cardReward.uiAcknowledged=true;persist();closeSheet();goToRun();
 if(openDeck){beginDeckSession();cardBrowsing=true;cardReaderOrigin='deck';cardSelectedId=id||state.run.cardReward.card?.instanceId;deckView.tab='deck';deckView.reading=getOwnedCards(state.run).some(c=>c.instanceId===cardSelectedId)?cardSelectedId:null;showCards();}
}
// A drag redraw during touchend can make Chromium omit the following click.
// Only a fresh stationary release on the same action or slot commits a choice.
let rewardActionTouch=null;
document.addEventListener('touchstart',event=>{
 rewardActionTouch=null;if(event.touches.length!==1)return;
 if(event.target.closest?.('[data-card-term],[data-card-term-trigger],[data-card-status-help]'))return;
 const button=event.target.closest?.('.card-reward-equip .card-reward-actions>button,.card-reward-targeting [data-action="card-reward-slot"][role="button"]');
 if(!button||button.disabled)return;
 const touch=event.touches[0];rewardActionTouch={button,id:touch.identifier,x:touch.clientX,y:touch.clientY};
},{capture:true,passive:true});
document.addEventListener('touchmove',event=>{
 if(!rewardActionTouch)return;const touch=[...event.touches].find(t=>t.identifier===rewardActionTouch.id);
 if(event.touches.length!==1||!touch||Math.hypot(touch.clientX-rewardActionTouch.x,touch.clientY-rewardActionTouch.y)>10)rewardActionTouch=null;
},{capture:true,passive:true});
document.addEventListener('touchcancel',()=>{rewardActionTouch=null;},{capture:true,passive:true});
document.addEventListener('touchend',event=>{
 const gesture=rewardActionTouch;rewardActionTouch=null;if(!gesture||event.touches.length)return;
 const touch=[...event.changedTouches].find(t=>t.identifier===gesture.id);
 if(!touch||!gesture.button.isConnected||Math.hypot(touch.clientX-gesture.x,touch.clientY-gesture.y)>10||document.elementFromPoint(touch.clientX,touch.clientY)?.closest('.card-reward-actions>button,[data-action="card-reward-slot"]')!==gesture.button)return;
 event.preventDefault();event.stopImmediatePropagation();gesture.button.click();
},{capture:true,passive:false});
function previewCardImprove(id=cardSelectedId){
 if(!canEditDeck())return;const card=getOwnedCards(state.run).find(c=>c.instanceId===id),preview=getCardImprovePreview(state.run,id);if(!card||!preview.after||(!preview.kind&&preview.after.cardId===card.cardId&&preview.after.rank<=card.rank))return;
 cardView='improve';openSheet(cardExchangeMarkup(card,{kind:'improve',preview,wallet:getSkillWallet(state).condensedGlow,backLabel:cardWorkshopOrigin?'Back to Workshop':'Back to card'}),'card-sheet card-exchange-sheet');
}
function showCardWorkshop(notice=''){
 if(!canUseCardCampServices(state.run))return;
 if(!document.querySelector('dialog.card-sheet[open]'))beginDeckSession();
 cardWorkshopOrigin=true;cardView='workshop';cardEquipMode=false;cardMeltMode=false;
 openSheet(cardWorkshopMarkup(state.run,{notice}),'card-sheet card-bench-sheet card-workshop-sheet');
}
function previewCardRefill(id){
 if(!canUseCardCampServices(state.run))return;
 const preview=getCardRefillPreview(state.run,id);if(!preview.before||!preview.supported)return;
 cardView='refill';openSheet(cardRefillMarkup(state.run,preview),'card-sheet card-exchange-sheet');
}
function confirmCardRefill(id,token){
 const preview=getCardRefillPreview(state.run,id);
 if(!refillOwnedCard(state,id,token)){showCardWorkshop('This quote changed. Review the current uses and price.');return;}
 saveDeckEdits();showCardWorkshop(`${cardName(preview.before)} refilled · ${preview.before.charges} → ${preview.maximum} uses · ${preview.price} Stored Sparks spent.`);
}
function deckSurface(){const gallery=document.querySelector('.card-deck-browser .card-deck-gallery');if(gallery)cardDeckScroll=gallery.scrollTop;return {surface:cardView==='forge'?'forge':cardInspecting?'reader':cardBrowsing?'deck':'equipped',equip:cardEquipMode,selectedId:cardSelectedId,targetSlot:cardTargetSlot,readerOrigin:cardReaderOrigin,scroll:cardDeckScroll,browsing:cardBrowsing,rarity:cardForgeRarity};}
function restoreDeckSurface(origin,notice=''){
 cardEquipMode=false;cardTargetSlot=origin?.targetSlot??null;cardMeltMode=false;cardInspecting=false;cardSelectedId=null;cardDeckNotice=notice;
 cardDeckScroll=origin?.scroll??cardDeckScroll;cardBrowsing=!!origin?.browsing||origin?.surface==='deck';cardReaderOrigin=origin?.readerOrigin||'equipped';
 if(origin?.surface==='forge'||origin?.surface==='reader'&&origin.readerOrigin==='forge'&&!getOwnedCards(state.run).some(c=>c.instanceId===origin.selectedId)){cardForgeNotice=notice;return previewCardForge(origin.rarity);}
 if(['deck','equipped'].includes(origin?.surface)&&origin.selectedId&&getOwnedCards(state.run).some(c=>c.instanceId===origin.selectedId)){cardSelectedId=origin.selectedId;cardEquipMode=!!origin.equip;}
 if(origin?.surface==='reader'&&getOwnedCards(state.run).some(c=>c.instanceId===origin.selectedId)){cardInspecting=true;cardSelectedId=origin.selectedId;}
 showCards();
}
function beginRewardMelt(){
 const reward=getCardReward(state.run);
 if(screen!=='card-reward'||!reward||reward.uiAcknowledged||reward.trophy)return;
 beginDeckMelt(reward.card.instanceId,{surface:'reward',rewardId:reward.id||'',instanceId:reward.card.instanceId});
}
function matchesRewardMelt(origin){
 const reward=state.run?.cardReward;
 return origin?.surface!=='reward'||!!reward&&!reward.uiAcknowledged&&(reward.id||'')===origin.rewardId&&reward.card?.instanceId===origin.instanceId;
}
function beginDeckMelt(singleId=null,origin=null){
 if(!canEditDeck())return;
 cardMeltOrigin=origin||deckSurface();cardMeltSingle=!!singleId;cardMeltIds.clear();cardMeltToken=null;cardEquipMode=false;cardTargetSlot=null;cardDeckNotice='';
 if(singleId){cardMeltIds.add(singleId);return previewDeckMelt();}
 cardMeltMode=true;cardMeltScroll=0;cardInspecting=false;showCards();
}
function previewDeckMelt(){
 if(!canEditDeck())return;const preview=getCardMeltPreview(state.run,[...cardMeltIds]);
 if(!preview.eligible)return;
 const gallery=document.querySelector('.card-deck-melt-mode .card-deck-gallery');if(gallery)cardMeltScroll=gallery.scrollTop;
 cardMeltToken=preview.token;cardView='melt-confirm';
 openSheet(cardMeltSelectionMarkup(state.run,[...cardMeltIds],getSkillWallet(state).condensedGlow,{single:cardMeltSingle,receipt:cardMeltOrigin?.surface==='reward'?cardMeltOrigin:null}),'card-sheet card-exchange-sheet');
}
function cancelDeckMelt(){
 const origin=cardMeltOrigin;cardMeltIds.clear();cardMeltToken=null;cardMeltOrigin=null;cardMeltSingle=false;
 if(origin?.surface==='reward'){cardView='deck';closeSheet();render('card-reward');return;}
 restoreDeckSurface(origin);
}
function confirmDeckMelt(button){
 if(!canEditDeck())return;
 if(button.dataset.token!==cardMeltToken||(cardMeltOrigin?.surface==='reward' ? button.dataset.rewardId!==cardMeltOrigin.rewardId||button.dataset.rewardInstance!==cardMeltOrigin.instanceId : !!button.dataset.rewardInstance))return;
 if(!matchesRewardMelt(cardMeltOrigin))return cancelDeckMelt();
 const preview=getCardMeltPreview(state.run,[...cardMeltIds]);
 if(!cardMeltToken||!meltOwnedCards(state,[...cardMeltIds],cardMeltToken)){cardMeltToken=null;return previewDeckMelt();}
 const origin=cardMeltOrigin,notice=`${preview.cards.length===1?cardName(preview.cards[0]):`${preview.cards.length} cards`} melted · +${preview.amount} Stored Sparks banked.`;
 cardMeltIds.clear();cardMeltToken=null;cardMeltOrigin=null;cardMeltSingle=false;
 if(origin?.surface==='reward'){cardView='deck';acknowledgeCardReceipt();notify(notice);return;}
 saveDeckEdits();restoreDeckSurface(origin,notice);
}
function saveDeckEdits(){if(engine)applyCardFlightEdits(state.run,engine);persist();if(!engine)render(screen);}
function repaintDeck(){saveDeckEdits();showCards();}
function previewCardForge(rarity=cardForgeRarity){
 if(!isCardRun(state.run)||flightLoading||screen==='home')return;
 pauseFlight();if(!syncDeckFlight())return;
 cardForgeRarity=['common','legendary'].includes(rarity)?rarity:'rare';
 const preview=getCardForgePreview(state.run,cardForgeRarity);
 if(!preview?.card)return;cardView='forge';cardEquipMode=false;cardTargetSlot=null;cardMeltMode=false;
 openSheet(cardForgeMarkup(state.run,preview,{notice:cardForgeNotice,paused:!!engine,backLabel:cardForgeOrigin?.surface==='workshop'?'Workshop':cardForgeOrigin?.surface==='rest'?'Rest':'Deck',lastForged:cardLastForged&&getOwnedCards(state.run).some(c=>c.instanceId===cardLastForged.instanceId)?cardLastForged:null}),'card-sheet card-forge-sheet');
}
function openCardForge(rarity){
 if(cardView!=='forge'||!document.querySelector('dialog.card-forge-sheet[open]')){
  if(!document.querySelector('dialog.card-sheet[open]')){beginDeckSession();cardForgeOrigin={surface:'rest'};}
  else cardForgeOrigin=cardView==='workshop'?{surface:'workshop'}:deckSurface();
  cardForgeNotice='';cardLastForged=null;
 }
 previewCardForge(rarity);
}
let forgeCeremony=null;
function backCardForge(){
 if(forgeCeremony){forgeCeremony.cancel();forgeCeremony=null;}
 const origin=cardForgeOrigin;cardForgeNotice='';cardLastForged=null;cardForgeOrigin=null;cardInspecting=false;cardSelectedId=null;
 if(origin?.surface==='workshop')showCardWorkshop();else if(origin?.surface==='rest')doneDeck();else restoreDeckSurface(origin);
}
function viewForgedCard(id){
 if(!cardLastForged||id!==cardLastForged.instanceId||!getOwnedCards(state.run).some(c=>c.instanceId===id))return;
 cardReaderOrigin='forge';cardSelectedId=id;cardEquipMode=false;cardDeckNotice='';deckView.tab='deck';deckView.pick=null;deckView.placing=null;deckView.reading=id;deckView.readingReturn='forge';showCards();
}
function confirmCardForge(rarity,token){
 const preview=getCardForgePreview(state.run,rarity);
 const forged=canEditDeck()&&forgeOwnedCard(state,rarity,token);
 if(!forged){cardForgeNotice='This price changed. Check the Forge again before paying.';previewCardForge(rarity);return;}
 // Forge v3 reveals the surprise card only after payment.
 saveDeckEdits();cardLastForged={instanceId:forged.instanceId,name:cardName(forged),card:forged,price:preview.price,rarity};
 cardForgeNotice=`Revealed: ${cardLastForged.name} added to reserve · ${preview.price} Stored Sparks spent.`;
 const sheet=document.querySelector('dialog.card-forge-sheet[open]');
 if(!sheet){previewCardForge(rarity);return;}
 // Source Sparks slide in, strike, reveal; a tap or reduced motion goes straight to the result view.
 const reduced=!!(state.settings.reducedMotion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 forgeCeremony=runForgeCeremony(sheet,{...forged,name:cardLastForged.name},{price:preview.price,reduced,onDone:()=>{forgeCeremony=null;if(cardView==='forge'&&cardLastForged?.instanceId===forged.instanceId)previewCardForge(rarity);}});
}
function backCardSheet(){
 const help=document.querySelector('dialog.card-bench-sheet[open] .card-deck-help[open]');
 if(help){help.open=false;help.querySelector('summary')?.focus({preventScroll:true});return;}
 if(cardView==='swap-confirm'){cancelCardTransfer();return;}
 if(cardView==='melt-confirm'){if(cardMeltSingle)cancelDeckMelt();else{cardMeltToken=null;showCards();}return;}
 if(cardView==='workshop'){backDeckWorkshop();return;}
 if(cardView==='refill'||cardView==='improve'&&cardWorkshopOrigin){showCardWorkshop();return;}
 if(cardView==='improve'){showCards();return;}
 if(forgeCeremony){forgeCeremony.skip();return;}
 if(cardView==='forge'){backCardForge();return;}
 if(cardMeltMode){cancelDeckMelt();return;}
 if(cardTargetSlot!==null||cardEquipMode){cardTargetSlot=null;cardEquipMode=false;if(!cardInspecting)cardSelectedId=null;showCards();return;}
 if(cardInspecting){backDeckReader();return;}
 if(cardBrowsing){cardBrowsing=false;cardTargetSlot=null;cardDeckNotice='';showCards();return;}
 doneDeck();
}

let scribe={id:null,slot:null};
function scribeStep(action,id,slot){
 // The Scribe: choose an Inscription, choose a slot, confirm only over an existing one. Back returns one step; nothing here runs in flight.
 if(engine||state.run?.flightReward?.kind!=='inscription'||state.run.flightReward.claimed)return false;
 if(action==='scribe-pick'&&state.run.flightReward.offers.includes(id))scribe={id,slot:null};
 else if(action==='scribe-back')scribe={id:null,slot:null};
 else if(action==='scribe-slot-back')scribe={id:scribe.id,slot:null};
 else if(action==='scribe-slot'){const p=previewScribeWrite(state.run,scribe.id,slot);if(!p)return false;if(p.needsConfirm)scribe={id:scribe.id,slot};else return writeScribe(scribe.id,slot,false);}
 else if(action==='scribe-confirm')return writeScribe(scribe.id,scribe.slot,true);
 render(scribeScreen());return true;
}
function scribeScreen(){return state.run?.phase==='support'&&state.run.current?.kind==='scribe'?'support':'victory';}
function writeScribe(id,slot,confirm){if(!chooseFlightReward(state,id,slot,{confirm}))return false;scribe={id:null,slot:null};closeSheet();persist();render(scribeScreen());return true;}
function renderVictory(){const cards=isCardRun(state.run);return flightRewardMarkup(state,{scribe,artifactArt,upgradeCount:cards?0:getAvailableUpgrades(state).length,deckAvailable:cards,skillsAvailable:!cards&&featureAvailable('skills')});}
function claimFlightReward(id){
 if(engine||!chooseFlightReward(state,id))return false;
 closeSheet();persist();
 if(state.run.flightReward?.permanent){acknowledgeVictory(state);persist();goToRun();return true;}
 render('victory');
 const card=app.querySelector('[data-reward-artifact]');if(card&&!matchMedia('(prefers-reduced-motion:reduce)').matches){rewardAnimating=true;card.animate([{opacity:.4,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],{duration:380,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>{rewardAnimating=false;updateCheckpoint();});}
 return true;
}
function keepFlightReward(id){return claimFlightReward(id);}

function takeSupport(index,confirmedGrowToken=null){
 const camp=getCardCampPreview(state.run),grow=camp?.actions.find(action=>action.index===index&&action.key==='grow');
 if(grow){
  if(grow.disabled)return;
  if(confirmedGrowToken!==grow.token){
   if(confirmedGrowToken)notify('Grow changed. Review the current result.');
   openSheet(cardGrowConfirmationMarkup(state.run,camp,grow),'card-sheet card-exchange-sheet');return;
  }
 }
 closeSheet();
 const before=state.run.lastEvent;
 if(!resolveSupport(state.run,index,state.profile)){notify('Not enough resources, or this offer is no longer available.');return;}
 settleCheckpoint(state);persist();goToRun();
 const outcome=state.run.lastEvent;
 if(outcome&&outcome!==before)openSheet(`<div class="event-outcome-art">${outcome.face?`<span class="dice-face" aria-label="Rolled ${outcome.face}">${['','⚀','⚁','⚂','⚃','⚄','⚅'][outcome.face]}</span>`:icon('star')}</div><h2>${esc(outcome.title)}</h2><p>${esc(outcome.message)}</p><button class="primary" data-action="close-sheet">Continue</button>`,'event-outcome');
}
function prepareOffer(r,n){return prepareRouteOffer(r,n,{profile:state.profile,width:innerWidth,height:innerHeight});}
function commitNode(id){
 const r=state.run,n=getChoices(r).find(n=>n.id===id);
 if(!n)return false;
 if(n.type!=='support')prepareOffer(r,n);
 return selectNode(r,id);
}
function previewNode(id){
 const run=state.run;
 if(!run || engine)return;
 const node=run.map.flat().find(site=>site.id===id);
 if(!node)return;
 const available=getChoices(run).some(choice=>choice.id===id);
 if(node.kind==='treasure')return openSheet(treasureView(run,node,{preview:true,available}),'treasure-route-sheet');
 if(node.type!=='support'){
  if(available)void preloadFlightEntry(state.settings.reducedMotion).catch(()=>{});
  const content=flightPreviewMarkup(run,node,{available,level:nodeLocation(node),bonus:prepareOffer(run,node)});
  return openSheet(content,'route-inspection-sheet flight-preview-sheet');
 }
 openSheet(stopPreviewMarkup(run,node,{available}),'route-inspection-sheet');
}

function dreamFinished(result){
 dreamReady=result;paused=true;
 const note=result.valid?'Wake at this opening’s end with its pickups. Starts paused: tap to resume, then tap again to Lift.':esc(result.reason||'Try another opening, or wake at the entrance.');
 const sheet=openSheet(`<h2>${result.valid?'Dream remembered':'Dream interrupted'}</h2><p>${note}</p><div class="two-actions"><button class="secondary" data-action="dream-retry">Go back to sleep</button><button class="primary" data-action="dream-accept">Wake up</button></div>`,'dream-result');
 sheet.addEventListener('cancel',e=>e.preventDefault());
}
function acceptDream(){
 if(!dreamReady||engine?.dream?.mode!=='record')return;
 const preset=dreamReady.preset;
 // The pixel renderer's canvas is the one on screen; #flight-canvas is only
 // drawn by the fallback renderer (and is 1x1 while the pixel renderer runs).
 const source=document.querySelector('.canvas-wrap .pixel-flight-canvas')||document.querySelector('#flight-canvas');
 const memory=document.createElement('canvas');
 memory.width=source.width;memory.height=source.height;
 memory.getContext('2d').drawImage(source,0,0);
 memory.className='dream-memory';memory.setAttribute('aria-hidden','true');
 closeSheet();destroyFlight();launch(false,{preset,memory});
}
function dreamAwake(){paused=true;document.querySelector('#pause-layer').innerHTML=`<button class="dream-awakening" data-action="dream-wake"><svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M8 5h5v22H8zM19 5h5v22h-5z"/></svg><span>Tap to resume</span><small>Then tap again to Lift</small></button>`;teachEntryHazard()}
function teachEntryHazard(){
 const giant=engine?.blackHoles?.items?.find(hole=>hole.giant);
 const tip=giantBlackHoleEntryLesson(state.settings,state.profile,state.run,giant)||lanternEntryLesson(state.settings,state.profile,state.run);
 if(tip&&paused&&!lesson)startLesson(tip.id,tip.steps);
}
function wakeDream(){if(engine?.dream?.phase==='awakening')beginResumeCountdown()}

function renderHome(){return homeMenuMarkup({profile:state.profile,run:state.run,selectedDifficulty,testOverride:state.settings.testOverride,gameMode:cardPilot?'cards':'standard',practiceFirst:practiceFirst()})}
function forecastMarkup(n){if(state.run?.isTutorial||!featureAvailable('artifacts'))return '';const f=getRouteForecast(state.run,n)||{};return `<div class="route-consequences ${!f.restReachable?'rest-scarce':''}"><div><b>${mapStopIconMarkup('rest')}${f.nextRestDistance===0?'REST HERE':f.restReachable?`${f.restGuaranteed?'REST IN':'REST OPTION'} ${f.nextRestDistance} ${f.nextRestDistance===1?'STOP':'STOPS'}`:'NO REST AHEAD'}</b><span>${n.type==='support'?(n.kind==='camp'?'RECOVER OR GROW':'A TRADE'):esc(encounterIntent(n)?.name||n.fuelPreview||'CONSERVE SPARKS')}</span></div>${rewardThemeMarkup(n)}<div class="forecast-path">${(f.nextStops||[]).slice(0,3).map(stop=>`<span title="${esc(stop.name)}">${mapStopIconMarkup(stop)}<small>${esc(getMapStopInfo(stop).label)}</small></span>`).join('<i>OR</i>')}</div></div>`}
function renderMap(){const r=state.run;return `<section class="game-map-screen map-v2 minimal-map ${r.isTutorial?'prologue-map':''}">${tutorialCheckpoint()}${canChooseStartingGift(r)?`<button class="starter-companion" data-action="starter-gifts">Choose your starting gift</button>`:''}<button class="checkpoint-skill-button" data-action="skills">${icon('route')} ${isPlayablePractice(r)?'LOANED CARDS':isCardRun(r)?'DECK':'SKILL TREE'}</button><div class="map-atlas-frame"><div class="game-map-viewport" id="map-viewport"><svg id="journey-map" class="game-world-map" viewBox="0 0 390 ${mapHeight(r)}"></svg></div></div><div class="map-build-dock">${r.restReady?`<div class="rest-services"><button data-action="skills">${icon('route')}${isPlayablePractice(r)?'LOANED CARDS':isCardRun(r)?'DECK':'SKILL TREE'}</button>${artifactsRevealed()?`<button data-action="artifacts">${icon('star')}ARTIFACTS</button>`:''}</div>`:''}${artifactCollectionDock()}</div></section>`}
function plannedChallengesMarkup(n){if(state.run?.isTutorial)return '';if(n.encounterFamily||n.boss)return encounterIntentMarkup(n,{optionalChallenge:true});const preview=getChallengePreview({...n,stage:n.row});return `<div class="flight-challenge-preview" aria-label="Planned terrain challenges">${preview.patterns.map(pattern=>`<span>${icon(pattern.type==='fuel-pocket'?'flame':pattern.type==='draft-crossing'?'wing':'wisp')}${esc(pattern.name)}</span>`).join('')}${n.challengeId?`<small class="optional-challenge">Optional: ${esc(n.challenge||'Clear the challenge')}</small>`:''}</div>`}
function flightCue(snapshot){if(snapshot.completing)return 'PASSAGE CLEARED';if(snapshot.dying)return snapshot.event||'The light scatters…';const challenge=snapshot.flightChallenge;if(!challenge)return snapshot.event||'';if(challenge.phase==='warning')return challenge.type==='dark-cave'?'CAVE AHEAD · LUMINANCE NARROWS':challenge.type==='draft-crossing'?'DRAFT AHEAD · CHOOSE YOUR CROSSING':challenge.pocket?.side==='ceiling'?'FUEL POCKET ABOVE':'FUEL POCKET AHEAD';if(challenge.phase==='active'&&challenge.progress<.2)return challenge.name;return snapshot.event||''}
function renderBriefing(){const r=state.run,n=r.current,loc=nodeLocation(n);return `<section class="passage-briefing ${n.boss?'boss-brief':''}"><div class="passage-art location-art" data-location="${loc.id}">${mapStopIconMarkup(n)}</div><div class="passage-choice"><span class="passage-kind">${esc(n.biomeName||loc.name||'')}${n.boss?' · BOSS':n.elite?' · ELITE':''}</span><h1>${esc(n.name)}</h1>${n.boss?`<p class="passage-notice">${esc(getBossPreview(n.bossId).instruction)}</p>`:forecastMarkup(n)}${contextualFlightNotice(r,n)?`<p class="passage-notice">${esc(contextualFlightNotice(r,n))}</p>`:''}${r.flame<21?'<p class="passage-notice">Low Sparks · find fuel early</p>':''}<div class="passage-actions">${getFlightClearReward(n,r)?`<span class="passage-clear-pay" aria-label="Clear reward: ${getFlightClearReward(n,r)} Stored Sparks">${resourceSymbol('packed')}<b>+${getFlightClearReward(n,r)}</b><small>on clear</small></span>`:''}<button class="primary enter-passage" data-action="launch">Enter ${icon('arrow')}</button></div></div></section>`}
function supportValues(effect={},{compact=false}={}){const r=state.run,items=[],add=(kind,value,label)=>items.push(`<span class="boon-resource-value ${String(value).startsWith('−')||String(value).startsWith('-')?'cost':'gain'}" title="${label}" aria-label="${value} ${label}">${kind==='heart'?lifeHeartSvg():resourceSymbol(kind)}<b>${value}</b>${compact?'':`<small>${label}</small>`}</span>`);if(effect.flame){const maximum=getGlowCapacity(r)+Math.max(0,Number(effect.glowCapacity)||0),amount=effect.flame>=100?maximum-r.flame:effect.flame>0?Math.min(effect.flame,maximum-r.flame):effect.flame;add('glow',compact?`${amount>=0?'+':''}${formatGlow(amount)}`:effect.flame>=100?'FULL':`${amount>0?'+':''}${formatGlow(amount)}`,'Sparks')}if(effect.pickupGlow){const p=previewGlowReward(r,effect.pickupGlow,{removeArtifact:effect.sell});if(p.restored>0)add('glow','+'+formatGlow(p.restored),'Sparks');if(p.condensedGlow>0)add('packed','+'+p.condensedGlow,'Stored Sparks');if(!p.restored&&!p.condensedGlow)add('packed','<1','Stored Spark toward the next whole unit')}if(effect.packedReward)add('packed','+'+effect.packedReward,'Stored Sparks');if(effect.packedLight)add('packed','+'+effect.packedLight,'Stored Sparks');if(effect.salvagePackedLight)add('packed','+'+effect.salvagePackedLight,'Stored Sparks');if(effect.condensedCost)add('packed','−'+effect.condensedCost,'Stored Sparks');if(effect.lives)add('heart','+'+effect.lives,effect.lives===1?'heart':'hearts');return items.join('')}

function restGlowReadout(r){const max=getGlowCapacity(r);return `<span class="rest-glow" aria-label="${formatGlow(r.flame)} of ${formatGlow(max)} Sparks">${resourceSymbol('glow')}<b>${formatGlow(r.flame)}<small>/${formatGlow(max)}</small></b></span>`}
function renderRestBenefits(r,n,choices,options={}){if(isPlayablePractice(r))return `<section class="practice-stop practice-rest-ready">${tutorialCheckpoint()}<div class="practice-stop-place"><h1>Recovered & ready</h1><p>${r.earlyComboIntroduced?'Practise Rhythm and Resonant Harvest again in your next flight.':'Rhythm and Resonant Harvest are loaned for your next flight.'}</p><button class="primary" data-action="node" data-id="${getChoices(r)[0]?.id}">Try the combination ${icon('arrow')}</button></div>${practiceCardsMarkup(r)}</section>`;if(isCardRun(r))return cardRestMarkup(r,n,choices.length?choices:getSupportChoices(r,state.profile));const markup=restBenefitsMarkup(r,n,choices,options);return r.isTutorial?markup.replace('<aside class="rest-rail">','<aside class="rest-rail">'+tutorialCheckpoint()+'<p class="prologue-rest-note">Practice starts one heart short. Recover restores hearts; both choices refill Sparks. Ordinary flight failures cost one heart.</p>'):markup}
function eventArt(c){
 if(c.effect?.artifact)return artifactIcon(c.effect.artifact);
 if(c.art==='lens')return icon('long-flash');
 if(c.art==='feather')return skillIcon({id:'main-drift'});
 if(c.art==='wick')return resourceSymbol('energy');
 if(c.art==='skills')return icon('route');
 if(c.art==='dice')return '<svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#aa96c0" d="M4 2h16v2h2v16h-2v2H4v-2H2V4h2z"/><path fill="#342a48" d="M6 6h3v3H6zm9 0h3v3h-3zm-5 5h4v3h-4zm-4 5h3v3H6zm9 0h3v3h-3z"/></svg>';
 if(c.art==='companion')return companionArtSvg(state.run.companions[0]);
 if(c.effect.lives)return lifeHeartSvg();
 if(c.effect.packedReward)return resourceSymbol('packed');
 if(c.effect.pilgrimVow||c.effect.routePreparation)return icon('route');
 return resourceSymbol('energy');
}
function renderSupport(){
 const r=state.run,n=r.current;
 if(isPlayablePractice(r))return renderPracticeSupport(r,n);
 if(n.kind==='treasure')return treasureView(r,n,{practiceTools:tutorialCheckpoint()});
 if(n.kind==='scribe'){ensureScribeStop(r);return scribeMarkup(state,{scribe,deckAvailable:true,title:'Map stop',stop:true});}
 const choices=getSupportChoices(r,state.profile);
 if(n.kind==='camp')return renderRestBenefits(r,n,choices);
 return `<section class="center-view compact-support">${campaignStrip(r,state.profile)}${tutorialCheckpoint()}
 <aside class="support-context"><div class="support-symbol">${mapStopIconMarkup(n)}</div><h1>${esc(n.name)}</h1>
 <div class="support-vitals">${livesMarkup(r)}<span class="glow-label">${resourceSymbol('energy')}${formatGlow(r.flame)} / ${formatGlow(getGlowCapacity(r))}</span></div>
 ${forecastMarkup(n)}${artifactsRevealed()?`<button class="secondary" data-action="artifacts">${icon('star')}Collection</button>`:''}</aside>
 <div class="support-offers">${choices.map((c,i)=>`<button class="route-choice boon-choice event-offer" data-action="support" data-index="${i}">
 <span class="boon-emblem" aria-hidden="true">${eventArt(c)}</span>
 <h3>${esc(c.title)}</h3>${c.effect?.eventFavor?`<small class="support-temporary-label">${c.effect.eventFavor==='burden'?'Next flight':'Next 3 cleared flights'}</small>`:c.effect?.flightBoon||c.effect?.routePreparation||c.effect?.pilgrimVow?'<small class="support-temporary-label">Next flight</small>':''}<div class="boon-values">${supportValues(c.effect)}</div><p>${esc(c.description)}</p>
 ${c.effect?.upgrade?`<p class="support-upgrade-effect">${esc(glowText(SKILLS[c.effect.upgrade]?.consequence||SKILLS[c.effect.upgrade]?.description||'',getGlowCapacity(r)))}${SKILLS[c.effect.upgrade]?.choiceGroup?' · Commits this path for the run.':''}</p>`:''}
 </button>`).join('')}</div></section>`;
}

function renderRestPrep(){const r=state.run,n=r.map.flat().find(x=>x.id===r.lastRest?.nodeId)||{name:'Rest',kind:'camp'};return renderRestBenefits(r,n,[],{nextNode:getChoices(r)[0]});}

function renderRetry(){const r=state.run;if(r.isTutorial)return `<section class="center-view compact-retry prologue-retry">${tutorialCheckpoint()}<h1>Try the passage again</h1><p>${esc(r.current?.name)}</p><p>Entrance Sparks, Stored Sparks and your build are restored. Practice retries use no hearts.</p><button class="primary" data-action="retry">Try again ${icon('arrow')}</button><button class="secondary" data-action="skip-practice">Skip practice</button></section>`;return `<section class="center-view compact-retry"><h1>Light lost</h1><div class="retry-level-label">${esc(r.current?.name)}</div><div class="retry-lives">${livesMarkup(r)}</div><button class="primary" data-action="retry">Retry this passage ${icon('arrow')}</button><button class="secondary" data-action="abandon-run">Abandon run</button></section>`}
function renderMapClear(){const r=state.run,nextMap=previewAtlasMap(r);if(nextMap)return forecastCheckpointMarkup(nextMap);return `<section class="center-view run-summary map-clear-screen"><h1>Map ${r.mapIndex+1} cleared</h1><p>${esc(r.mapName)}</p><div class="map-clear-carry">${livesMarkup(r)}<span class="glow-label">${resourceSymbol('energy')}${formatGlow(r.flame,getGlowCapacity(r),0)} SPARKS</span></div>${fleetArt()}${artifactCollectionDock()}<p class="map-clear-note">${r.mapIndex===0?'Map 2 guardians chain gates in their final phase.':'Map 3 guardians chain gates in their last two phases.'} Your build carries over.</p><button class="primary" data-action="next-map">MAP ${r.mapIndex+2} ${icon('arrow')}</button></section>`}
function renderResult(){if(!state.run?.isTutorial){const score=completedGameScore(state.run);if(score)return gameResultMarkup(state.run,score,{recap:isCardRun(state.run)&&state.run.success?cardVictoryRecap(state.run):''});if(state.run?.scoreAbandoned)return '<section class="center-view run-summary"><h1>Game abandoned</h1><p>Abandoned Games do not enter personal bests.</p><button class="primary" data-action="exit-menu">Main menu</button></section>';}if(isCardRun(state.run)&&state.run.success)return cardVictoryRecap(state.run);if(state.run?.success&&!state.run.isTutorial)return `<section class="center-view run-summary won-screen"><h1>You won</h1><p>Ascension ${state.run.difficulty} conquered</p><button class="secondary" data-action="artifacts">Relic almanac</button><button class="primary" data-action="exit-menu">Main menu</button></section>`;const r=state.run,drop=r.lastFlight?.artifactDrop?.collectionComplete?null:r.lastFlight?.artifactDrop;return `<section class="center-view run-summary"><h1>${r.isTutorial?(r.success?'Practice complete':'Practice ended'):r.success?'Run complete':'Run ended'}</h1><div class="result-stats"><div><strong>${Math.floor(r.securedCondensedGlow||0)}</strong><span>STORED SPARKS EARNED</span></div><div><strong>${r.stats?.flights||0}</strong><span>FLIGHTS</span></div></div>${drop?`<div class="summary-prizes">${drop?`<div class="summary-prize">${drop.duplicate?condensedIconMarkup():artifactArt(typeof drop==='string'?drop:drop.id)}<div><small>${r.testMode?'TEST REWARD':'BOSS REWARD'}</small><strong>${drop.duplicate?(drop.convertedGlow?`+${formatGlow(drop.convertedGlow)} Sparks`:'Collection complete'):esc(artifactById(typeof drop==='string'?drop:drop.id)?.name||'Artifact recovered')}</strong></div></div>`:''}</div>`:''}${r.isTutorial?(r.success&&r.tutorialContinuation?`<p class="run-pause-note">Next: choose your starting ${starterNoun()} for the real run.</p><div class="two-actions"><button class="secondary" data-action="restart-practice">Practice again</button><button class="primary" data-action="leave-practice">Choose your starting ${starterNoun()} ${icon('arrow')}</button></div>`:'<div class="two-actions"><button class="secondary" data-action="restart-practice">Practice again</button><button class="primary" data-action="leave-practice">Back to your game</button></div>'):`<p class="run-pause-note">Run skills and Stored Sparks reset. Permanent unlocks remain.</p><div class="two-actions"><button class="secondary" data-action="exit-menu">Main menu</button><button class="primary" data-action="new-game">New Game ${icon('arrow')}</button></div>`}</section>`}

function closeSheet(){const wallet=app.querySelector('[data-ceremony-wallet]');if(wallet){wallet.textContent=Math.floor(state.run?.condensedGlow||0);wallet.parentElement?.setAttribute('aria-label','Wallet: '+wallet.textContent+' Stored Sparks');}deckDragging.cancel();const el=document.querySelector('dialog.game-sheet');if(el){el.close();el.remove()}}
function openSheet(content,cls=''){closeSheet();const el=document.createElement('dialog');el.className=`power-sheet game-sheet ${cls}`;if(/(run-confirm-sheet|starting-gift-sheet|card-starter-sheet|installation-sheet|map-key-sheet|condensation-sheet|field-guide-sheet|scorecard-link-sheet|card-exchange-sheet)/.test(cls)||cls==='settings-sheet')el.classList.add('wb-dlg');el.innerHTML=content;if(el.classList.contains('card-bench-sheet')||el.classList.contains('card-forge-sheet')||el.classList.contains('card-exchange-sheet'))el.addEventListener('cancel',event=>{event.preventDefault();backCardSheet();});el.addEventListener('close',()=>{el.remove();if(el.classList.contains('card-sheet')&&!document.querySelector('dialog.card-sheet[open]'))finishDeckFlight();if(engine&&paused&&!flightLoading&&!document.querySelector('dialog[open]')&&!document.querySelector('#pause-layer')?.children.length&&!lesson)resumeFlight({waitForTap:el.classList.contains('tree-sheet')||el.classList.contains('card-sheet')});},{once:true});document.body.appendChild(el);el.showModal();el.querySelector('button')?.focus({preventScroll:true});return el}
function pauseFlight(){stopCountdown();if(engine&&!engine.dying&&!paused){resumeArmed=false;paused=true;music.setScene('pause');engine.pause();hud?.activationFeedback?.clear(lastSnapshot);const speed=document.querySelector('#game-speed');if(speed)speed.hidden=true;engine.render()}}
function resumeFlight({waitForTap=false}={}){
 if(flightLoading)return;
 if(['ready','failed'].includes(engine?.dream?.phase))return dreamFinished(engine.dream.result);
 closeSheet();hideLesson();if(!engine)return;
 // Entry lessons may request a normal resume, but the first departure always
 // waits for a separate deliberate action on the illustrated ready screen.
 waitForTap ||= !!pendingDeparture;
 finishDeckFlight();pauseFlight();paused=true;resumeArmed=waitForTap;
 const layer=document.querySelector('#pause-layer');if(!layer)return;
 if(waitForTap){
  if(pendingDeparture){layer.replaceChildren(pendingDeparture.element);pendingDeparture.accept ||= prepareFlightDeparture(pendingDeparture.element);}
  else layer.innerHTML=resumeGateMarkup();
  return;
 }
 beginResumeCountdown();
}
function beginResumeCountdown(){
 if(!engine||flightLoading||lesson)return;if(askBlackHole(()=>beginResumeCountdown()))return;stopCountdown();resumeArmed=false;paused=true;
 const scene=engine,layer=document.querySelector('#pause-layer');if(!layer)return;
 const resumeScene=()=>{
  cancelCountdown=null;if(engine!==scene)return;paused=false;if(scene.dream?.mode!=='record'&&markFlightAttemptStarted(state.run,scene))persist();
  if(scene.dream?.phase==='awakening')scene.dream.resume();else scene.resume();
 };
 // Practice tips return directly to the existing slow-motion ramp and speed HUD.
 if(state.run?.isTutorial){layer.innerHTML='';if(!document.hidden)resumeScene();return;}
 cancelCountdown=startResumeCountdown(layer,{blocked:()=>engine!==scene||document.hidden,onComplete:resumeScene});
}
// Practice entry hint: the frame stays frozen with no gate armed, so Lift (button,
// scene or keys) is ignored. Only its own Got it button closes it; the normal
// Tap to begin gate follows, and no new text replaces it once play starts.
function showEntryHint(scene,step){
 if(lesson)return resumeFlight({waitForTap:true});
 stopCountdown();paused=true;resumeArmed=false;const layer=document.querySelector('#pause-layer');if(layer)layer.innerHTML='';
 (scene.tutorial.shownHints||=[]).includes('launch')||scene.tutorial.shownHints.push('launch');
 if(step.point){const focus=typeof document.createElement==='function'&&worldFocusTarget(scene,step.point);if(focus)step={...step,target:focus};}
 startLesson(step.id,[step],()=>{
  if(engine!==scene)return;
  // The entry hint has just taught Lift, so the practice Lift coach card would repeat it.
  if(step.teachesLift&&state.run?.isTutorial){(state.run.guideSeen||={})['practice:lift']=true;persist();}
  resumeFlight({waitForTap:true});
  if(state.run?.isTutorial)requestAnimationFrame(()=>guideScreen('flight'));
 });
}
// In-flight practice hints are text, so they wait for the same safe pause as the
// coach lessons, then resume through the speed ramp (without a practice countdown).
function practiceHintLesson(){
 const r=state.run,e=engine;
 if(!e?.tutorial||paused||lesson||e.dream?.active||e.dying||e.completing||e.tutorialAwaitingLift||!automaticTipsEnabled(state.settings,r))return false;
 if(e.time-(e.practiceCoachAt??-10)<3||!hasPracticeHint(e,r)||!e.canShowContextHint())return false;
 const step=takePracticeHint(e,r);if(!step)return false;
 e.practiceCoachAt=e.time;pauseFlight();
 startLesson(step.id,[step],()=>resumeFlight());
 return true;
}
function wakeFlight(event,confirmed=false){if(!engine||flightLoading||!resumeArmed||lesson||document.hidden)return;if(!confirmed&&pendingDeparture&&(!pendingDeparture.element.isConnected||!pendingDeparture.accept?.(event)))return;if(!confirmed&&pendingDeparture&&askBlackHole(()=>wakeFlight(null,true)))return;pendingDeparture=null;activeFlightEntry=null;stopCountdown();resumeArmed=false;document.querySelector('#pause-layer').innerHTML='';paused=false;if(engine.dream?.mode!=='record'&&markFlightAttemptStarted(state.run,engine))persist();if(engine.dream?.phase==='awakening')engine.dream.resume();else engine.resume();}
// Black Hole (engine card): before a departure that will eat a card, ask once in the kit's dialog skin. Never in
// practice or the tutorial (Black Hole is inert there) and never for a Dream rehearsal or a resume.
function askBlackHole(proceed){
 const r=state.run;if(!r?.mountedCards?.some?.(Boolean))return false;if(!isCardRun(r)||r.isTutorial||isPlayablePractice(r)||engine?.options?.practice||engine?.options?.preview||engine?.dream?.mode==='record'||r.attemptEntry?.started)return false;
 const meals=previewBlackHoleMeals(r.mountedCards||[]);if(!meals.length)return false;
 const names=meals.map(m=>`${m.holeName} will destroy ${m.victimName}`).join('. '),dialog=document.createElement('dialog');
 dialog.className='wb-dlg bh-confirm';dialog.setAttribute('aria-labelledby','bh-confirm-q');
 dialog.innerHTML=`<p class="bh-confirm-q" id="bh-confirm-q">${esc(names)}. Fly?</p><p class="bh-confirm-sub">${meals.length>1?'These cards are':'The card is'} lost for good.</p><footer class="bh-confirm-acts"><button type="button" class="secondary" data-bh="cancel">Cancel</button><button type="button" class="danger" data-bh="fly">Fly</button></footer>`;
 const done=fly=>{dialog.close();dialog.remove();if(fly)proceed();else cancelFlightEntry();};
 dialog.addEventListener('click',e=>{const b=e.target.closest('[data-bh]');if(!b)return;e.preventDefault();e.stopPropagation();done(b.dataset.bh==='fly');});
 dialog.addEventListener('cancel',e=>{e.preventDefault();done(false);});
 document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-bh="cancel"]').focus();return true;
}

import {getCruisingSpeed,setCruisingSpeed} from './model.mjs?v=pulse-1';

let settingsPanel='main',settingsOrigin=null,guideReturnSettings=false;
const settingsScroll={main:0,advanced:0};
// Settings v1.1: Speed shows under the same condition as the old selector (Wind Feather earned a choice).
function cruisingSpeedChoice(){
 if(!cardPilot)return null;
 const earned=state.profile.cardCruisingSpeed||0,selected=getCruisingSpeed(state);
 if(!earned&&!selected)return null;
 return {selected:String(selected),options:Array.from({length:earned+1},(_,value)=>({value:String(value),label:value?`+${value}%`:'Baseline'}))};
}
document.addEventListener('change',event=>{
 if(!event.target.matches?.('[data-cruising-speed]'))return;
 if(setCruisingSpeed(state,Number(event.target.value))){persist();notify('Cruising speed saved · applies next flight');}
 const sub=event.target.closest('.wb-select')?.querySelector('small');if(sub)sub.textContent=event.target.selectedOptions[0]?.textContent||'';
});
function rememberSettings(){const sheet=document.querySelector('dialog.settings-sheet');if(sheet)settingsScroll[sheet.dataset.panel||'main']=sheet.querySelector('.settings-body')?.scrollTop||0;return !!sheet;}
function modeLink(cards){let source=location.href;try{if(window.parent!==window)source=window.top.location.href;}catch{}const url=new URL('./index.html',source);url.search=new URL(source).search;for(const key of ['hosted','mock','scenario','tutorial','legacy','cards'])url.searchParams.delete(key);if(!cards)url.searchParams.set('cards','0');return url.href;}
function testControls({allowGrant=false,showTutorialSkip=false}={}){const active=state.settings.testOverride,locked=!!engine||!!state.run?.isTutorial;return `<div class="settings-option"><button class="secondary test-toggle ${active?'active':''}" data-action="test-override" aria-pressed="${!!active}" ${locked?'disabled':''}>Test Override · ${active?'ON':'OFF'}</button><small>${locked?'Available after leaving the flight or tutorial.':'Unlocks test ascensions. New test runs give no permanent rewards.'}</small></div>${showTutorialSkip?`<div class="settings-option"><button class="secondary tutorial-skip-toggle" data-action="skip-tutorial" role="checkbox" aria-checked="${!!state.settings.skipTutorial}">Skip intro · ${state.settings.skipTutorial?'ON':'OFF'}</button><small>New Game ${state.settings.skipTutorial?'goes straight to your starting gift.':'includes First Light when needed.'}</small></div>`:''}${active&&allowGrant&&state.run&&!engine&&state.run.phase!=='ended'?'<button class="secondary" data-action="grant-test-condensed">Grant 100 test Stored Sparks</button>':''}`}
function showSettings(panel='main',{focusAction=null,restore=false}={}){
 const replacing=rememberSettings();if(!replacing&&!restore){settingsOrigin=document.activeElement;settingsScroll.main=0;settingsScroll.advanced=0;}
 settingsPanel=panel;
 // Main panel: v1.1-settings (ui/pause-menu.mjs). Tutorial lives on Home, Field Guide and Glossary behind Help
 // (pause menu; on Home a Help plaque here), Relic almanac behind Collection (in a run; on Home in Advanced).
 const main=settingsMarkup({...soundLevels(),lessons:!state.settings.skipTutorial,speed:cruisingSpeedChoice(),installLabel:installationLabel(),version:GAME_VERSION,showHelp:screen==='home'});
 const advanced=`<div class="settings-grid settings-advanced-grid">${testControls({allowGrant:true,showTutorialSkip:true})}<div class="settings-option"><a class="secondary settings-link" href="${esc(modeLink(!cardPilot))}" target="_top">${cardPilot?'Legacy skills override':'Return to Cards'}</a><small>Uses a separate save. Your ${cardPilot?'Cards':'legacy'} journey stays here.</small></div>${restPreviewAvailable()?`<div class="settings-option">${mockControl()}<small>Developer scene · changes are not saved.</small></div>`:''}<button type="button" class="secondary build-refresh" data-action="refresh-build"><span aria-live="polite">Check for updates</span></button><button class="secondary" data-action="reset-tutorial">Reset tutorial progress</button>${screen==='home'?'<button class="secondary" data-action="artifacts">Relic almanac</button>':''}<a class="secondary settings-link" href="nature-credits.html" target="_blank" rel="noopener">Art credits</a>${performanceEnabled&&flightPerformance?'<button class="secondary" data-action="performance-report">Save performance report</button>':''}</div>`;
 const sheet=panel==='advanced'
  ?openSheet(`<header class="settings-heading"><h2 id="settings-heading">Advanced settings</h2><span>${cardPilot?'Cards':'Legacy skills'}</span></header><div class="settings-body">${advanced}</div><footer class="settings-footer"><button class="primary" data-action="settings-back">Back</button></footer>`,'settings-sheet')
  :openSheet(main,'settings-sheet wb-settings-sheet');
 sheet.dataset.panel=panel;if(panel==='advanced')sheet.setAttribute('aria-labelledby','settings-heading');else sheet.setAttribute('aria-label','Settings');sheet.addEventListener('cancel',event=>{event.preventDefault();backSettings();});sheet.querySelector('.settings-body').scrollTop=settingsScroll[panel];if(focusAction)sheet.querySelector(`[data-action="${focusAction}"]`)?.focus({preventScroll:true});
}
function backSettings(){if(settingsPanel==='advanced'){showSettings('main',{focusAction:'settings-advanced'});return;}const origin=settingsOrigin;closeSheet();if(origin?.isConnected)origin.focus({preventScroll:true});else document.querySelector(screen==='home'?'.front-settings':'[data-action=settings]')?.focus({preventScroll:true});}
function refreshSettings(focusAction){if(document.querySelector('dialog.settings-sheet'))showSettings(settingsPanel,{focusAction});else showMenu();}
function toggleTestOverride(){if(engine||state.run?.isTutorial)return;setTestOverride(state,!state.settings.testOverride);selectedDifficulty=Math.min(selectedDifficulty,state.settings.testOverride?Math.max(6,state.profile.difficulty||1):state.profile.difficulty||1);persist();if(screen==='home')render('home');refreshSettings('test-override');notify(state.settings.testOverride?'TEST READY · all builds available':'TEST OFF · next New Game uses normal rules')}

function installationLabel(){const {installed,updateReady}=installationState();return updateReady?'Update ready':installed?'App status':'Install game';}
onInstallationChange(()=>{const label=document.querySelector('button.install-control [data-install-label]')||document.querySelector('button.install-control span');if(label)label.textContent=installationLabel();});
let installReturnSettings=false;
async function showInstallation(){
 const status=installationState();
 if(status.canPrompt&&!status.updateReady){await requestInstall();return;}
 installReturnSettings=rememberSettings();
 const detail=status.installed?'Wispbound is on your home screen.':installationInstructions();
 const update=status.updateReady?'A new build is ready and will open automatically at your next safe checkpoint.':status.offline?'The game is ready to play offline. Updates download automatically while online.':'Keep the game open online to finish its offline download.';
 openSheet('<h2>'+ (status.installed?'Installed game':'Install Wispbound')+'</h2><p>'+detail+'</p><p>'+update+'</p><button class="primary" data-action="installation-back">Back</button>','installation-sheet');
}
function backInstallation(){if(installReturnSettings){installReturnSettings=false;showSettings('main',{focusAction:'install-game',restore:true});}else showMenu();}


let refreshingBuild = false;
async function refreshFromMenu(button) {
 if (refreshingBuild) return;
 refreshingBuild = true;
 button.disabled = true;
 const label = button.querySelector('[data-build-label]') || button.querySelector('span');
 label.textContent = 'Checking build…';
 try {
  const status = await refreshBuild();
  label.textContent = status;
 } catch {
  label.textContent = navigator.onLine ? 'Update unavailable' : 'Offline';
 } finally {
  refreshingBuild = false;
  button.disabled = false;
 }
}
// Left tab of the pause menu: the same values the HUD shows (live flight snapshot in flight, the run otherwise).
// Practice shows hearts and the Spark Meter only; its Stored Sparks are not part of the lesson.
function pauseRunStatus(r,snap){const spark=snap?snap.flame:r.flame,max=snap?snap.maxFlame:getGlowCapacity(r);return {lives:snap?.lives??r.lives,maxLives:snap?.maxLives??getLifeCapacity(r),spark:formatGlow(spark),sparkMax:formatGlow(max),stored:r.isTutorial?null:Math.floor(snap?.condensedTotal??getSkillWallet(state).condensedGlow??0)};}
function showMenu(){if(flightLoading)return;stopCountdown();if(engine?.dream?.phase==='awakening')return;if(engine?.dying||engine?.completing)return;if(engine)pauseFlight();const r=state.run,inside=screen!=='home'&&r&&r.phase!=='ended',flight=!!engine;if(!inside){showSettings();return}const rememberedBonus=flight&&lastSnapshot?.routeBonus?.eligible&&ROUTE_BONUSES[lastSnapshot.routeBonus.id];
 const bonusReminder=rememberedBonus?`<details class="pause-bonus-rule"><summary>Optional challenge · ${esc(bonusProgressText(lastSnapshot.routeBonus))}</summary><p>${esc(rememberedBonus.condition)}</p><p>${esc(rememberedBonus.reward)}</p></details>`:'';
 // Pause menu v1.5-pause (ui/pause-menu.mjs, styles ui/waystone.css). Audio, Field Guide/Glossary/Map Guide and
 // Artifacts entries moved: sound is the level control, Help opens the Field Guide (Glossary and Map guide live there).
 const content=pauseMenuMarkup({practice:!!r.isTutorial,flight,onMap:!flight,context:pauseContextLine(r),heading:restInspector?'Rest preview':lanternInspector?'Lantern map preview':'Paused',deckLabel:isPlayablePractice(r)?'Loaned Cards':isCardRun(r)?'Deck':'Skills',showDeck:isCardRun(r)||featureAvailable('skills'),showCollection:artifactsRevealed(),status:pauseRunStatus(r,flight?lastSnapshot:null),bonusReminder,mock:!!mockMode,...soundLevels()});
 if(flight){closeSheet();document.querySelector('#pause-layer').innerHTML=content}else openSheet(content,'wb-pause-sheet')}
function skillProfile(){
 return {...getSkillWallet(state),unbanked:engine?.condensedGlow||0};
}
function learnSkill(id,expectedRank){
 if(engine&&(flightLoading||engine.finished||engine.dying||engine.completing))return;
 if(!buyCheckpointSkill(state,id,expectedRank))return;
 persist();
 if(engine)engine.applySkillUpgrade(getRunModifiers(state.run),getSkillWallet(state).condensedGlow);
 else render(screen);
 showSkills();
 notify(SKILLS[id]?.choiceGroup?'PATH CHOSEN · THIS RUN':'UPGRADE LEARNED · THIS RUN');
}
function showSkills(chapter){
 if(isPlayablePractice(state.run))return showPracticeDeck();
 if(isCardRun(state.run))return openDeck();
 if(!canBuyCheckpointSkills(state)||flightLoading||engine?.dying||engine?.completing||engine?.finished||screen==='home')return;
 if(chapter)bookChapter=chapter;
 pauseFlight();
 const content=skillBookMarkup({run:state.run,wallet:skillProfile(),chapter:bookChapter,variant:bookVariant,selected:mainSkillSelection});
 const sheet=document.querySelector('dialog.book-sheet[open]');
 if(sheet){
  const prior=sheet.querySelector('.book-page-scroll'),chapterList=sheet.querySelector('.book-chapters');
  const top=prior.scrollTop,chapterTop=chapterList.scrollTop,active=document.activeElement;
  sheet.innerHTML=content;
  const pane=sheet.querySelector('.book-page-scroll');
  if(prior.dataset.treeKey===pane.dataset.treeKey)pane.scrollTop=top;
  sheet.querySelector('.book-chapters').scrollTop=chapterTop;
  const same=[...sheet.querySelectorAll('button')].find(button=>button.dataset.action===active?.dataset.action&&button.dataset.id===active?.dataset.id);
  (same||sheet.querySelector('.book-perk[aria-pressed="true"]')||sheet.querySelector('button')).focus({preventScroll:true});
 }else{openSheet(content,'tree-sheet book-sheet');guideScreen('skills');}
}

function fleetMarkup(){
 const role=getCompanionAbility('collector');
 const roster=allRoles().map(c=>{
  const equipped=getCompanionUnlock(c.id).selectable;
  return `<div class="companion-role ${equipped?'selected':'progression-locked'}" aria-label="${esc(c.name)} ${equipped?'equipped':'locked'}"><span class="companion-portrait">${companionArtSvg(c.id)}</span><strong>${esc(c.name)}</strong>${equipped?'<b class="fleet-selected">✓</b>':`<span class="roster-lock">${companionLockIcon}</span>`}</div>`;
 }).join('');
 return `<header class="single-companion-heading"><h2>Companion</h2></header><div class="companion-roles">${roster}</div><div class="single-companion-description">${companionArtSvg(role.id)}<p>${esc(glowText(role.description,getGlowCapacity(state.run||{})))}</p></div><button class="primary" data-action="close-sheet">Done</button>`;
}
function showFleet(){if(screen==='home'||!state.run||state.run.phase==='ended')return showUnlocks();if(!featureAvailable('companions')){notify('Collector accompanies this run');return;}pauseFlight();openSheet(fleetMarkup(),'companion-sheet');guideScreen('companions')}
function chooseFleet(){return false;}

const browsingDiscoveries=()=>screen==='home'||screen==='result';
function artifactsMarkup(){
 const r=state.run,presentation=engine?{...r,artifactCharges:{...r?.artifactCharges,...lastSnapshot?.artifactCharges}}:r;
 return collectionMarkup({...state,run:presentation},{artifactArt,discovered:browsingDiscoveries(),page:collectionPage,selectedId:collectionSelectedId,
  confirmMeltId:collectionConfirmId,lastMelt:collectionLastMelt,canMelt:!engine&&!!r?.restReady});
}
function repaintCollection(){
 const sheet=document.querySelector('dialog.collection-sheet');
 if(sheet){sheet.innerHTML=artifactsMarkup();sheet.querySelector?.(collectionConfirmId?'[data-action=cancel-artifact-melt]':'[aria-pressed=true]')?.focus({preventScroll:true});return sheet;}
 return openSheet(artifactsMarkup(),'collection-sheet');
}
function requestArtifactSalvage(id){
 if(engine||!canSellArtifact(state,id)){notify('Melt artifacts at Rest.');return;}
 const ids=[...new Set(state.run.artifacts)].filter(value=>ARTIFACTS[value]);
 collectionPage=Math.floor(ids.indexOf(id)/COLLECTION_PAGE_SIZE);
 collectionSelectedId=id;collectionConfirmId=id;collectionLastMelt=null;repaintCollection();
}
function forgeArtifact(id){
 if(id!==collectionConfirmId||engine)return;
 const amount=getArtifactSalvageValue(id),name=ARTIFACTS[id]?.name;
 if(!sellArtifact(state,id)){collectionConfirmId=null;repaintCollection();return;}
 collectionConfirmId=null;collectionSelectedId=null;collectionLastMelt={id,name,amount};
 persist();renderHeader();repaintCollection();
}
function inspectArtifact(id,fromFlight=false){
 const source=browsingDiscoveries()?Object.keys(ARTIFACTS):state.run?.artifacts;
 if(!ARTIFACTS[id]||!source?.includes(id)||engine?.dying||engine?.completing)return;
 if(fromFlight||engine)pauseFlight();
 const ids=[...new Set(source)].filter(value=>ARTIFACTS[value]);
 collectionPage=Math.floor(ids.indexOf(id)/COLLECTION_PAGE_SIZE);
 collectionSelectedId=id;collectionConfirmId=null;collectionLastMelt=null;repaintCollection();
}
function showRewardArtifactDetails(id){
 const reward=state.run?.flightReward,ids=reward?.claimed?[reward.chosen]:reward?.offers;
 if(!ARTIFACTS[id]||!ids?.includes(id))return;
 const opener=app.querySelector(`[data-action="reward-artifact-details"][data-id="${id}"]`);
 const sheet=openSheet(artifactDetailMarkup(ARTIFACTS[id],{run:state.run,fresh:!reward.claimed,rewardPreview:true}),'artifact-details-sheet reward-artifact-details-sheet');
 sheet.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
}
function showCollectionArtifactDetails(id){
 const source=browsingDiscoveries()?Object.keys(ARTIFACTS):state.run?.artifacts;
 if(!ARTIFACTS[id]||!source?.includes(id))return;
 const run=browsingDiscoveries()?{}:engine?{...state.run,artifactCharges:{...state.run?.artifactCharges,...lastSnapshot?.artifactCharges}}:state.run;
 const sheet=openSheet(artifactDetailMarkup(ARTIFACTS[id],{run,fresh:browsingDiscoveries(),rewardPreview:browsingDiscoveries(),closeAction:'collection-artifact-rules-back'}),'artifact-details-sheet collection-artifact-details-sheet');
 sheet.addEventListener('cancel',event=>{event.preventDefault();repaintCollection();});
}
function showArtifacts(){
 if(browsingDiscoveries()){collectionPage=0;collectionSelectedId=null;collectionConfirmId=null;collectionLastMelt=null;repaintCollection();return;}
 if(screen==='home'||!state.run||state.run.phase==='ended'&&!state.run.victoryPending||!artifactsRevealed())return;
 pauseFlight();collectionConfirmId=null;collectionLastMelt=null;repaintCollection();guideScreen('artifacts');
}
function closeCollection(){
 collectionConfirmId=null;
 if(engine)return resumeFlight();
 closeSheet();render(screen);
}
function refreshMapDock(){const dock=document.querySelector('.map-build-dock');if(dock)dock.innerHTML=`${state.run?.restReady?'<div class="rest-services"><button data-action="skills">TRAIN</button></div>':''}${artifactCollectionDock()}`}
function showPickupKey(){pauseFlight();openSheet(pickupGuideMarkup({cardPilot,maxGlow:getGlowCapacity(state.run||{}),modifiers:engine?.mod||getRunModifiers(state.run||{}),companions:roleFleet(),discovered:state.profile.seenPickups||[]}), 'pickup-guide-sheet')}
function showMapKey(){const r=state.run;openSheet(`<h2>MAP GUIDE</h2><p class="map-key-total">${r?.isTutorial?`${r.map.length} PRACTICE STOPS`:`${r?.map.length||10} STOPS PER MAP · ${CAMPAIGN_MAP_NAMES.length} MAPS PER RUN`}</p><div class="route-light-key" aria-label="Route brightness key"><span class="route-key-here"><i></i>HERE · your wisp</span><span class="route-key-next"><i></i>NEXT · tap to travel</span><span class="route-key-future"><i></i>Later · tap to preview</span><span class="route-key-closed"><i></i>Dark · path closed</span></div><div class="map-key-list">${Object.values(MAP_STOP_TYPES).map(type=>`<div class="map-key-row">${mapStopIconMarkup(type.kind)}<div><h3>${type.label}</h3><p>${esc(glowText(type.summary,getGlowCapacity(r||{})))}</p></div></div>`).join('')}</div>${mapBiomeGuideMarkup(r)}<details class="map-event-guide"><summary>EVENTS & TRADES</summary>${getEventScenarios({maxGlow:getGlowCapacity(r||{})}).map(e=>`<p><b>${esc(e.name)}</b> · ${esc(e.summary)}</p>`).join('')}</details><button class="primary" data-action="close-sheet">Done</button>`,'map-key-sheet');guideScreen('map-key');}
function showCondensation(){if(isCardRun(state.run)){pauseFlight();return openSheet(`<h2>Stored Sparks</h2>${condensedIconMarkup()}<p>One run wallet: clear flights, pack surplus, or Melt a card. A Common Melt gives 10 Stored Sparks.</p><p>Open Deck anytime to equip, reorder or Melt, including during a paused flight. Improve, Evolve and Forge at Rest. At each Rest, Forge starts at 30 banked Stored Sparks for Rare, or 60 for Legendary with a Rare mounted. Each craft raises only that rarity’s price by 50%, compounded and rounded up; a new Rest resets both prices. Review the current price before forging. Forge uses no camp action. Lifts spend your Spark Meter.</p><button class="primary" data-action="cards">Open Deck</button><button class="secondary" data-action="close-sheet">Done</button>`,'condensation-sheet');}pauseFlight();openSheet(`<h2>Stored Sparks</h2>${condensedIconMarkup()}<p>Clear rewards provide 15–25 Stored Sparks, with more for elites. Trail Dividend adds 10 per clear. At the starting rate, 6 surplus Sparks make 1 Stored Spark, up to 20 packed per flight.</p><p>At the exit, remaining Sparks are packed at your current rate, separately from the overflow limit. Your vessel then recovers half its capacity; Renewal skills improve this. Failed attempts earn nothing. The final guardian ends the run. Rest refills do not create currency.</p><p>Efficient Storage raises the packing limit to 30. Later Storage skills extend it further. Prism Vessel improves conversion. Unfinished fractions carry into your next pickup. Open Skills to spend banked Stored Sparks at any time. Lifts draw only from the Spark Meter.</p><button class="primary" data-action="inspect-main-skill" data-id="main-afterglow">Storage skills</button><button class="secondary" data-action="close-sheet">Done</button>`,'condensation-sheet')}

let activeFlightEntry=null;
function cancelFlightEntry({keepRoute=false}={}){
 if(!flightLoading&&!pendingDeparture)return;
 const entry=activeFlightEntry;activeFlightEntry=null;
 destroyFlight();
 if(entry&&state.run===entry.run){
  if(!entry.dream)suspendRun(state);
  entry.run.restReady=entry.restReady;
  entry.run.lastAttempt=entry.lastAttempt;
  entry.run.stats.attempts=entry.attempts;
 }
 if(!keepRoute&&state.run?.phase==='briefing')backRoute();else{persist();goToRun()}
}
async function launch(retry=false,waking=null){
 if(engine||flightLoading||landscape.isPortrait())return;
 const r=state.run;
 if(retry&&!retryFlight(r))return;
 const n=r.current;
 if(!n||n.type==='support')return;
 const dream=!waking&&canDreamAt(r,n);
 const entryState={run:r,restReady:r.restReady,lastAttempt:r.lastAttempt,attempts:r.stats.attempts,dream};
 if(!r.attemptActive&&!Object.hasOwn(n,'bonusId'))prepareOffer(r,n);
 if(!dream&&!beginFlightAttempt(r))return goToRun();
 document.body.classList.toggle('dream-rehearsal',dream);
 activeFlightEntry=entryState;const ticket=++launchTicket;flightLoading=true;resumeArmed=false;dreamReady=null;screen='flight';paused=true;persist();renderHeader();document.body.classList.add('playing');document.body.dataset.screen='flight';app.innerHTML=`<section class="flight-shell ${r.isTutorial?'prologue-flight':''}"><div class="flight-device"><div class="flight-hud"><button type="button" class="ember-counter flight-condensed-counter" data-action="skills" title="${isCardRun(r)?'Deck · equip, reorder or Melt':'Skills'} · overflow banks on clear" aria-label="Pause and open ${isCardRun(r)?'Deck':'Skills'}">${condensedIconMarkup()}<b id="flight-condensed">${getSkillWallet(state).condensedGlow}</b>${isCardRun(r)?'<span class="flight-deck-label">DECK</span>':''}</button><span class="flight-bonus-counter" id="flight-bonus" hidden></span><div class="flight-run-status">${livesMarkup(r)}<div class="boss-phase-hud" id="boss-phase"></div></div><span class="flight-menu-slot">${menuButton()}</span></div><div class="flight-artifact-bar" aria-label="Automatic artifact effects">${(r.artifacts||[]).filter(Boolean).map(id=>`<button type="button" data-action="inspect-flight-artifact" data-id="${id}" data-relic="${id}" aria-label="Inspect ${esc(ARTIFACTS[id]?.name||id)}; pause flight">${artifactArt(id)}${EVOLVING_ARTIFACTS.includes(id)?'<small class="artifact-seed-pips" aria-hidden="true"><i></i><i></i><i></i></small>':''}${getArtifactInfo(id).type==='consumable'?`<small class="artifact-flight-charge">${r.artifactCharges?.[id]??getArtifactInfo(id).charges}</small>`:''}</button>`).join('')}</div><div class="flight-progress"><i id="flight-progress-bar"></i></div><div class="canvas-wrap">${glowGaugeMarkup(r)}${edgingPulseMarkup()}<canvas id="flight-canvas" aria-label="Tap to Lift. With Space Timer, keep holding to levitate and release to glide. Power is on the right. MENU pauses."></canvas><div class="flight-event" id="flight-event"></div><div class="game-speed-overlay" id="game-speed" role="status" aria-label="Game speed" hidden><span>GAME SPEED</span><b>0.1×</b><i><em></em></i></div><div class="dream-mark" id="dream-mark"></div>${performanceEnabled?'<div class="perf-status" id="perf-status">MEASURING…</div>':''}<div class="tutorial-flight-hint" id="tutorial-hint" hidden></div></div><div class="flight-dock"><div class="flight-fleet-status" id="fleet-status">${fleetArt()}</div>${boostControlMarkup(r.companions)}<button class="flight-control flap-control" id="flap-btn" aria-label="Lift">${resourceSymbol('up')}<span class="lift-cost">${resourceSymbol('energy')}<span id="flap-label"></span></span></button></div><div id="pause-layer">${waking?.memory?'':flightEntryMarkup(r,n,{artifactArt,dream,profile:state.profile})}</div></div></section>`;
 if(waking?.memory){
  document.querySelector('.flight-device').classList.add('dream-preparing');
  document.querySelector('.canvas-wrap').append(waking.memory);
 }

  try{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(ticket!==launchTicket)return;
  const entryElement=document.querySelector('.flight-entry');pendingDeparture=entryElement?{element:entryElement,accept:null}:null;
  hud={bonus:document.querySelector('#flight-bonus'),edging:document.querySelector('.edging-pulse-gauge'),fill:document.querySelector('#flame-fill'),meter:document.querySelector('#flame-meter'),progress:document.querySelector('#flight-progress-bar'),power:document.querySelector('#boost-btn'),event:document.querySelector('#flight-event'),flap:document.querySelector('#flap-label'),flapCostArt:document.querySelector('.lift-cost>.resource-symbol-energy'),boss:document.querySelector('#boss-phase')};
  engine=new WispFlight({boundaryStyle:boundaryInspector?boundaryEdgeStyle:undefined,reducedMotion:state.settings.reducedMotion,canvas:document.querySelector('#flight-canvas'),terrain:n.terrain,elite:n.elite,seed:`${r.seed}-${n.id}`,duration:n.duration,node:n,challengeId:n.challengeId,challengeTarget:n.challengeTarget,flame:r.flame,lives:r.lives,maxLives:r.maxLives,condensedGlow:getSkillWallet(state).condensedGlow,condensedRemainder:r.condensedRemainder||0,companions:r.companions,companionRole:r.companions[0],skills:r.skills,cards:[],cardPilot,modifiers:{...getRunModifiers(r),cardPilot,onboardingPlan:onboardingFlightPlan(state.profile,r)},getAudioTransport:()=>music.getTransport(),onUpdate:updateFlight,onFinish:dream?()=>{}:completeFlight,onPause:()=>{if(!paused){paused=true;showMenu()}}});engine.setMuted?.(muted);engine.setFxGain?.(levelGain(fxLevel.level));
  hud.activationFeedback=createActivationFeedback(document.querySelector('.flight-device'));
  hud.rhythmScore=createRhythmScore(document.querySelector('.flight-device'));
  if(isPlayablePractice(r)&&n.tutorialLesson==='glide')hud.firstLightCombo=createFirstLightComboFeedback(document.querySelector('.flight-device'));
  if(cardPilot)hud.cardRowFeedback=createCardRowFeedback(document.querySelector('.flight-device'),{onInspect:()=>{pauseFlight();showMenu();}});
  engine.nightmareAvailable=()=>!dream&&!r.isTutorial&&r.nightmareSpentMap!==r.mapIndex;
  engine.onNightmare=(scene,path)=>{
   r.nightmareSpentMap=r.mapIndex;persist();
   paused=true;scene.pause();
   showNightmare(scene,path,()=>{if(engine===scene){paused=false;scene.resume();}});
  };
  if(dream)attachDream(engine,{mode:'record',onReady:dreamFinished});
  else if(waking?.preset&&!attachDream(engine,{mode:'replay',preset:waking.preset})){
   cancelFlightEntry({keepRoute:true});
   notify('Your view or build changed. Dream this opening again.');
   return;
  }
  if(performanceEnabled)flightPerformance=attachFlightPerformance(engine,{onStatus:s=>{const indicator=document.querySelector('#perf-status');if(indicator)setText(indicator,`${s.fps} FPS · worst ${s.worstGap}ms · ${s.stalls} stalls`)}});
  bindFlightControls();
  const scene=engine;
  scene.start({paused:true});
  if(r.earlyComboIntroduced)armFirstLightCombo(scene,r);
  const handoff=waking?.preset?prepareDreamHandoff(scene):null;
  const ready=Promise.all([handoff,scene.ready,preloadFlightEntry(scene.reducedMotion).catch(()=>null)]);
  const [prepared]=await (waking?.memory?ready:waitForFlightEntry(ready));
  if(ticket!==launchTicket||engine!==scene)return;
  if(handoff&&(!prepared||!validateDreamPreset(waking.preset,scene))){
   cancelFlightEntry({keepRoute:true});
   notify('The opening changed. Dream it again.');
   return;
  }
  flightLoading=false;if(!pendingDeparture)activeFlightEntry=null;
  if(handoff){scene.render();scene.notify();dreamAwake();}
  if(waking?.memory){
   const device=document.querySelector('.flight-device');
   device.classList.remove('dream-preparing');
   device.classList.add('dream-waking');
   const memory=waking.memory;
   const fade=memory.animate([{opacity:1},{opacity:0}],{duration:scene.reducedMotion?180:1400,easing:'ease-in-out',fill:'forwards'});
   fade.finished.then(()=>{memory.remove();device.classList.remove('dream-waking')}).catch(()=>{});
  }
  if(boundaryInspector){
   const normal=scene.getLightState.bind(scene);
   scene.getLightState=()=>boundaryReveal?{...normal(),radius:5000,pickupReveal:1}:normal();
   frameBoundaryInspection(scene,new URLSearchParams(location.search));
   window.parent.postMessage({type:'wisp-boundary-ready'},location.origin);
  }
  const entryHint=!handoff&&!dream&&!waking?tutorialEntryLesson(scene,r):null;
  if(entryHint)showEntryHint(scene,entryHint);
  else if(!handoff)resumeFlight({waitForTap:true});
  if(r.isTutorial&&!dream&&!waking&&!entryHint)requestAnimationFrame(()=>guideScreen('flight'));
  else if(!dream&&!waking&&!r.testMode&&automaticTipsEnabled(state.settings,r)&&!state.profile.onboarding?.seen?.includes('lift')&&(r.stats?.flights||0)===0&&r.mapIndex===0){
   noteOnboardingPrompt(r,'briefing');
   const demo=resourceCycleSteps(r,getRunModifiers(r));
   startLesson('onboarding:lift',demo,teachEntryHazard);
  }else if(!dream&&!waking){teachEntryHazard();}
 }catch(error){
   if(ticket!==launchTicket)return;
   cancelFlightEntry();
   notify('The passage could not load. Choose a route to try again.');
  }
}
function setText(el,text){if(el&&el.textContent!==String(text))el.textContent=text}
function updateLiftCost(hud,s){
 engine?.pointerControls?.refresh();
 const cost=formatGlow(s.flapCost),free=s.flapCost===0||s.artifactEffects?.freeLift;
 const label=s.completing?'CLEAR':s.dying?'FADING':s.leveler?.active?'HOLD':free?'FREE':`−${cost}`;
 const showsCost=label.startsWith('−');
 setText(hud.flap,label);
 if(hud.showsFlapCost!==showsCost){hud.showsFlapCost=showsCost;hud.flapCostArt.toggleAttribute('hidden',!showsCost);}
 const leveler=engine?.hasCompanion('leveler');
 let status=leveler?`Tap to Lift. Hold to levitate. Space Timer charge ${Math.round((s.leveler?.charge||0)/Math.max(.001,s.leveler?.capacity||1)*100)} percent`:`Lift, ${free?'free':`costs ${cost} ${cost==='1'?'Spark':'Sparks'}`}`;
 const beat=s.fourthBeat;
 if(beat?.count)status+=beat.ready?`. ${beat.rank===2?'Climb':'Double Lift'} ready. Next Lift is free.`:`. ${beat.rank===2?'Climb':'Double Lift'}, ${beat.count} of ${beat.needed-1} taps.`;
 if(hud.liftStatus!==status){hud.liftStatus=status;hud.flap.closest('button').setAttribute('aria-label',status);}
}
function updateFlight(s){lastSnapshot=s;music.setFlight(s);hud?.activationFeedback?.update(s);hud?.rhythmScore?.update(s);hud?.firstLightCombo?.update(s,engine);hud?.cardRowFeedback?.update(s);
 if(hud)updateDreamIndicator(hud.dreamMark||=document.querySelector('#dream-mark'),s.dream);
 if(s.dream?.mode==='record'){if(hud)updateBoostControl(hud.power,s);return;}
 updateBonusGauge(hud?.bonus,s.routeBonus);
 const run=state.run;
 const healed=isCardRun(run)&&!s.dream?.active&&s.cardHeartsRestored>0&&s.lives>run.lives;
 if(healed){
  run.lives=Math.min(run.maxLives,s.lives);
  const hearts=document.querySelector('.flight-run-status .ascension-lives');
  if(hearts)hearts.outerHTML=livesMarkup(run);
 }
 if(isCardRun(run)&&!s.dream?.active&&s.cardCharges){
  const changed=run.mountedCards.some(card=>card&&Number.isFinite(card.charges)&&Number.isFinite(s.cardCharges[card.instanceId])&&s.cardCharges[card.instanceId]<card.charges);
  if(changed||healed){commitCardCharges(run,s.cardCharges);persist();}
 }
 updateGameSpeed(s);
 for(const [id,remaining] of Object.entries(s.artifactCharges||{})){
  const item=document.querySelector(`.flight-artifact-bar [data-relic="${id}"]`);if(!item)continue;
  setText(item.querySelector('.artifact-flight-charge'),remaining);item.classList.toggle('depleted',remaining===0);
  item.setAttribute('aria-label',`${ARTIFACTS[id]?.name||id}: ${remaining} uses left`);
 }
 const seed=s.artifactEffects?.seed;
 if(seed){const item=document.querySelector(`.flight-artifact-bar [data-relic="${seed.id}"]`);if(item){const key=`${seed.charge}:${seed.procs}`;if(item.dataset.seed!==key){item.dataset.seed=key;item.classList.toggle('depleted',seed.procs>=seed.limit);for(const [i,pip]of [...item.querySelectorAll('.artifact-seed-pips i')].entries())pip.classList.toggle('filled',i<seed.charge);item.setAttribute('aria-label',`${ARTIFACTS[seed.id].name}: ${seed.charge} of 3 body pickups; ${seed.limit-seed.procs} activations left`);}}}
 if(run?.isTutorial&&!isPlayablePractice(run)&&run.tutorialEdition!==2&&!run.guideSkipped&&!engine?.dream?.active&&(s.blackHole?.rate>0||s.edgingPulse?.active||s.edgingPulse?.mode==='regen'&&s.edgingPulse?.regenGrants>0)){
  const id=observedFlightLesson(s,{...run.guideSeen,...run.effectHints});
  if(id){(run.effectHints||={})[id]=true;(run.pendingEffectHints||=[]).push(id);}
 }
if(!hud)return;updateGlowGauge(hud.gauge||(hud.gauge=document.querySelector('.glow-side-gauge')),s);updateEdgingPulse(hud.edging,s);hud.progress.style.transform=`scaleX(${Math.min(1,s.progress||0)})`;setText(hud.event,isPracticeCourseRun(run)?'':flightCue(s));updateLiftCost(hud,s);setText(hud.boss,s.bossWarning||s.bossPhase||'');updateBoostControl(hud.power,s);hud.tutorialHint||=document.querySelector('#tutorial-hint');if(hud.tutorialHint&&!hud.tutorialHint.hidden)hud.tutorialHint.hidden=true;if(engine?.tutorial&&!s.completing&&!s.dying&&s.tutorialHintState)notePracticeHint(engine,state.run,s.tutorialHintState);if(!paused&&!lesson&&!s.dying)queueMicrotask(()=>{if(!showArtifactLesson()){worldLesson();if(!lesson)practiceHintLesson();}})}
function bindFlightControls(){
 const lift=document.querySelector('#flap-btn'),power=document.querySelector('#boost-btn');
 engine.pointerControls=bindFlightPointerControls({lift,playfield:document.querySelector('.canvas-wrap'),getEngine:()=>engine,
  blocked:()=>paused||lesson||flightLoading||!!document.querySelector('dialog[open]')});
 lift.addEventListener('click',e=>{if(e.detail===0&&!paused&&!lesson&&engine?.dream?.phase!=='replay')engine?.flap()});
 if(power?.tagName==='BUTTON'){power.addEventListener('pointerdown',e=>{e.preventDefault();if(!paused&&!lesson&&engine?.dream?.phase!=='replay')engine?.activateAbility()});power.addEventListener('click',e=>{if(e.detail===0&&!paused&&!lesson&&engine?.dream?.phase!=='replay')engine?.activateAbility()})}
}

function completeFlight(result){hideLesson();hud?.activationFeedback?.destroy();hud?.rhythmScore?.destroy();hud?.firstLightCombo?.destroy();hud?.cardRowFeedback?.destroy();const previous=engine;if(previous?.tutorial)result={...result,practiceTopics:demonstratedTutorialTopics(previous)};if(result.success&&previous?._pendingOnboardingLesson)state.run.pendingContextLesson=previous._pendingOnboardingLesson;engine=null;hud=null;previous?.destroy();paused=false;document.body.classList.remove('playing','dream-rehearsal');finishFlight(state.run,result);if(previous?.tutorial&&state.run?.isTutorial)carryPracticeHints(previous,state.run);if(result.success){delete state.run.dreamPreset;settleCheckpoint(state)}persist();goToRun()}
function finishCoachLesson(){
 if(!lesson)return;const {done,key}=lesson;
 if(key.startsWith('onboarding:'))markOnboardingSeen(state.profile,key);
 else if(state.run){state.run.guideSeen||={};state.run.guideSeen[key]=true;}
 hideLesson();persist();done?.();
}
const coach=createTutorialCoach({onNext:()=>{if(!lesson)return;if(++lesson.index<lesson.steps.length)return showLessonStep();finishCoachLesson();},onBack:()=>{if(lesson&&lesson.index>0){lesson.index--;showLessonStep()}},onSkip:finishCoachLesson});

function hideLesson(){lesson=null;coach.hide();document.querySelector('[data-world-focus]')?.remove()}
function startLesson(key,steps,done){if(!automaticTipsEnabled(state.settings,state.run)&&!key.startsWith('guide:')){done?.();return;}if(lesson||!steps.length)return;const real=steps;if(!real.length)return;lesson={key,steps:real,index:0,done};showLessonStep()}
function showLessonStep(){const s=lesson.steps[lesson.index];coach.show({...s,id:`${lesson.key}:${lesson.index}`,progress:`${lesson.index+1}/${lesson.steps.length}`,actionLabel:s.actionLabel||(lesson.index===lesson.steps.length-1?'Continue':'Next')})}
function guideScreen(view){
 const r=state.run;if(!r||lesson||rewardAnimating||flightLoading||cancelCountdown)return;
 noteOnboardingProgress(state.profile,r);
 if(!automaticTipsEnabled(state.settings,r))return;
 if(isCardRun(r))return;
 if(r.isTutorial&&!engine&&!r.guideSkipped&&['map','support','retry','victory'].includes(view)){
  // A practice hint that never found a safe in-flight pause is taught at this checkpoint.
  const carried=takeCarriedPracticeHint(r);if(carried){startLesson(carried.id,[carried]);persist();return;}
 }
 // Edition 4: the camp's Chain lesson, then the Chain screen opens for the Crescendo lesson.
 if(isPracticeCourseRun(r)){
  const camp=!engine&&practiceCampLesson(view,r);
  if(camp)startLesson(camp.id,[camp],()=>showPracticeDeck({arrange:true}));
  return;
 }
 if(isPlayablePractice(r)||r.isTutorial&&r.tutorialEdition===2)return;
 if(!r.isTutorial){
  const normal=(view==='flight'?engine?._pendingOnboardingLesson:['victory','map'].includes(view)?r.pendingContextLesson:null)||nextOnboardingLesson(view,{profile:state.profile,run:r,modifiers:view==='briefing'?getRunModifiers(r):undefined,flight:engine,snapshot:lastSnapshot||{}});
  if(!normal)return;
  if(engine){if(paused||engine.dying||engine.completing)return;engine._pendingOnboardingLesson=normal;if(!engine.canShowContextHint())return;delete engine._pendingOnboardingLesson;pauseFlight();}
  if(r.pendingContextLesson?.id===normal.id)delete r.pendingContextLesson;
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
  if(view==='support'&&!r.guideSeen?.support)startLesson('support',[{title:'Take a breather',text:'Recover fuel or collect an offering. Full-meter surplus is stored; upgrades can wait until you feel ready.',target:'.support-offers'}]);
  else if(view==='flight'){
    if(engine?.time>0&&!engine.canShowContextHint())return;
    const kind=r.current?.tutorialLesson;const key=kind==='glide'?'flight':`flight-${kind}`;if(r.guideSeen?.[key])return;
    pauseFlight();
    const steps=kind==='hazards'?topicSteps('hazards').slice(1):key==='flight'?[{...topicSteps('flight')[1],target:'#flap-btn'},{...topicSteps('sparks')[0],target:'.glow-side-gauge'}]
      :[{...topicSteps('hazards')[0],target:'.canvas-wrap'},{...topicSteps('collector')[0],target:'#boost-btn'}];
    startLesson(key,steps,resumeFlight);
  }
}

let guidePage=0;
const guidePages=[['flight','sparks','luminance','hearts','collector','utilities'],['packed','skills','rewards','artifacts','rest'],['dream','routes','terrain','hazards','lanterns','progression']];
function showFieldGuide(page=guidePage){if(rememberSettings())guideReturnSettings=true;guidePage=Math.max(0,Math.min(2,Number(page)||0));pauseFlight();hideLesson();openSheet(`<header class="field-guide-heading"><h2>FIELD GUIDE <small>${['BASICS','YOUR BUILD','THE JOURNEY'][guidePage]}</small></h2><button class="secondary card-glossary-link" data-card-glossary>Glossary</button>${screen==='map'&&state.run?'<button class="secondary guide-map-key" data-action="map-key">Map guide</button>':''}<button class="secondary" data-action="pickup-key">Pickup key</button><button class="secondary guide-practice" data-action="practice">Replay First Light</button><a class="secondary guide-phone-link" href="./first-light.html?cards=${cardPilot?'1':'0'}" target="_blank" rel="noopener">Open tutorial on phone</a><button class="secondary" data-action="guide-back" aria-label="Back from Field Guide">×</button></header>${cardPilot&&guidePage===1?'<aside class="combo-lesson-entry"><span><strong>Rhythm + Resonant Harvest</strong>Hands-on card practice · your current journey stays safe</span><button class="secondary" data-combo-lesson="rhythm-harvest">Try a combo</button></aside>':''}<div class="guide-topics">${guidePages[guidePage].map(id=>{const topic=cardPilot&&CARD_GUIDE_TOPICS[id]||TUTORIAL_TOPICS[id];return `<button class="secondary" data-action="guide-topic" data-id="${id}" aria-label="${esc(topic.name)}">${tutorialVisualMarkup({visual:topic.visual})}<strong>${esc(topic.name)}</strong><small>${topic.steps.length} small steps</small></button>`}).join('')}</div><footer class="guide-pages"><button class="secondary" data-action="guide-page" data-id="${guidePage-1}" ${guidePage===0?'disabled':''}>Back</button><span>${guidePage+1} / 3</span><button class="primary" data-action="guide-page" data-id="${guidePage+1}" ${guidePage===2?'disabled':''}>Next</button></footer>`,'field-guide-sheet').addEventListener('cancel',event=>{event.preventDefault();backFieldGuide();})}

function backFieldGuide(){if(guideReturnSettings){guideReturnSettings=false;showSettings('main',{focusAction:'field-guide',restore:true});}else closeSheet();}
function showGuideTopic(id){if(cardPilot&&CARD_GUIDE_TOPICS[id]){closeSheet();return startLesson('guide:'+id,CARD_GUIDE_TOPICS[id].steps,showFieldGuide);}if(!TUTORIAL_TOPICS[id])return;closeSheet();startLesson('guide:'+id,id==='sparks'?resourceCycleSteps(state.run||{},getRunModifiers(state.run||{})):topicSteps(id),showFieldGuide)}

function showArtifactLesson(){
 if(!automaticTipsEnabled(state.settings,state.run)||!state.run?.isTutorial||isPlayablePractice(state.run)||state.run.tutorialEdition===2)return false;
 if(!engine||engine.dream?.active||paused||lesson||engine._artifactLessonShown||lastSnapshot?.dying||lastSnapshot?.completing)return false;
 const lessonOwner=state.run?.isTutorial?state.run:state.profile;const notice=engine._pendingArtifactNotice||nextArtifactNotice(lastSnapshot,lessonOwner.seenArtifactLessons||[]);
 if(!notice||!ARTIFACTS[notice.artifactId])return false;
 engine._pendingArtifactNotice=notice;if(!engine.canShowContextHint())return false;delete engine._pendingArtifactNotice;engine._artifactLessonShown=true;
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
/** A spotlight element over a real visible world object (flight coordinates). */
function worldFocusTarget(e,point){
 if(!point||!e)return null;const {x,y,radius=22}=point;
 if(!(x>=12&&x<=e.width-12&&y>=12&&y<=e.height-12))return null;
 const wrap=document.querySelector('.canvas-wrap'),canvas=document.querySelector('#flight-canvas');if(!wrap||!canvas)return null;
 const c=canvas.getBoundingClientRect(),w=wrap.getBoundingClientRect(),target=document.createElement('i');
 target.dataset.worldFocus='';target.style.cssText=`position:absolute;pointer-events:none;left:${c.left-w.left+(x-radius)*c.width/e.width}px;top:${c.top-w.top+(y-radius)*c.height/e.height}px;width:${radius*2*c.width/e.width}px;height:${radius*2*c.height/e.height}px`;
 wrap.append(target);return target;
}
function practiceWorldLesson(){
 const r=state.run,e=engine;
 if(!e||paused||lesson||e.dream?.active||e.dying||e.completing||!automaticTipsEnabled(state.settings,r)||e.time-(e.practiceCoachAt??-10)<3)return;
 if(firstLightComboQuiet(e))return;
 const combo=firstLightComboLesson(e,r);
 const step=combo||nextPracticeLesson(e,r,lastSnapshot);if(!step)return;
 // One stop per topic in the first flight: Sparks, Collector, Luminance. Others wait for the checkpoint.
 if(e.tutorial.lesson==='glide'&&step.id!==FIRST_LIGHT_COMBO&&!FIRST_FLIGHT_STOPS.has(step.id)){if(deferPracticeLesson(r,step))persist();return;}
 if(!e.canShowContextHint())return;
 const focus=step.point&&worldFocusTarget(e,step.point);if(focus)step.target=focus;
 e.practiceCoachAt=e.time;pauseFlight();
 if(combo){armFirstLightCombo(e,r);persist();hud?.firstLightCombo?.update(e.getState(),e);}
 startLesson(step.id,[step],()=>resumeFlight());
}
function worldLesson(){if(isPlayablePractice(state.run))return practiceWorldLesson();if(state.run?.isTutorial&&state.run.tutorialEdition===2)return;if(!automaticTipsEnabled(state.settings,state.run))return;if(!state.run?.isTutorial){guideScreen('flight');return;}if(!engine||engine.dream?.active||paused||lesson||lastSnapshot?.dying||lastSnapshot?.completing)return;const r=state.run,practice=!!engine.tutorial;if(practice&&!r.guideSkipped&&!r.guideSeen?.['practice-condensation']&&engine.time>3&&(lastSnapshot?.condensedGlow||0)>0){if(!engine.canShowContextHint())return;pauseFlight();startLesson('practice-condensation',[{title:'Stored Sparks buy skills',visual:'packed',text:'With a full Spark Meter, extra Sparks become Stored Sparks. Clear this flight to keep it.',target:'.flight-condensed-counter'}],resumeFlight);return;}let focus,key,content;if(practice){if(r.guideSkipped||engine.time<3||engine.time-(engine.tutorialCoachAt??-10)<7)return;const prefix='world:',seen=new Set(Object.keys(r.guideSeen||{}).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length)));focus=engine._pendingWorldFocus||getTutorialWorldFocus(engine,seen);if(!focus)return;if(!engine.canShowContextHint()){engine._pendingWorldFocus={...focus,queuedDistance:engine.distance};return;}if(focus.queuedDistance!=null)focus={...focus,x:focus.x-(engine.distance-focus.queuedDistance)};delete engine._pendingWorldFocus;engine.tutorialCoachAt=engine.time;key=`world:${focus.id}`;content=focus}else{const seen=new Set(state.profile.seenPickups||[]);if(seen.size>=7)return;focus=engine.getNearbyPickup(seen);if(!focus)return;key=`pickup:${focus.kind}`;content=pickupLesson(focus.packet||focus.kind,{maxGlow:engine.maxFlame,modifiers:engine.mod,companions:roleFleet()});state.profile.seenPickups||=[];state.profile.seenPickups.push(focus.kind);if(state.profile.pickupCoachSkipped){persist();return}}pauseFlight();if(focus.x<0||focus.x>engine.width){startLesson(key,[{...content,target:'.canvas-wrap'}],resumeFlight);return;}const wrap=document.querySelector('.canvas-wrap'),canvas=document.querySelector('#flight-canvas'),target=document.createElement('i'),c=canvas.getBoundingClientRect(),w=wrap.getBoundingClientRect(),sx=c.width/engine.width,sy=c.height/engine.height,rad=Math.max(18,focus.radius||18);target.dataset.worldFocus='';target.style.cssText=`position:absolute;pointer-events:none;left:${c.left-w.left+(focus.x-rad)*sx}px;top:${c.top-w.top+(focus.y-rad)*sy}px;width:${rad*2*sx}px;height:${rad*2*sy}px`;wrap.appendChild(target);startLesson(key,[{...content,target}],resumeFlight)}
function mapLabelLines(value,max=14){const words=String(value||'').split(/\s+/),lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>max&&line){lines.push(line);line=word}else line=(line+' '+word).trim()}if(line)lines.push(line);return lines.slice(0,2).map(v=>v.length>max?v.slice(0,max-1)+'…':v)}
function mapPositionMarker(x,y,label){return `<g class="map-position-marker map-orb-marker" transform="translate(${x},${y})"><circle r="12" fill="#dce8d1" opacity=".25"/><circle r="6" fill="#f2f0d5"/><text y="24" text-anchor="middle">${label}</text></g>`}

// While the map waits for a choice, pre-render the pickup sprite atlas and load
// the pixel renderer in idle time, so the next flight's entry does less work.
// preloadFlightEntry caches per document; repeated calls are cheap.
let flightWarmupScheduled=false;
function warmFlightWhenIdle(){
 if(flightWarmupScheduled||typeof window==='undefined')return;flightWarmupScheduled=true;
 const warm=()=>{flightWarmupScheduled=false;if(screen==='map'&&!engine)void preloadFlightEntry(state.settings.reducedMotion).catch(()=>{});};
 if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(warm,{timeout:3000});else setTimeout(warm,1000);
}
function drawMap(){
  warmFlightWhenIdle();
  if(window.matchMedia('(orientation: landscape)').matches){for(const n of getChoices(state.run))if(n.type!=='support')prepareOffer(state.run,n);drawLandscapeMap(document.querySelector('#journey-map'),document.querySelector('#map-viewport'),state.run);return;}
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
    const glyph=`<g class="map-support-symbol">${mapStopIconMarkup(n).replace(/ width="48" height="48" style="[^"]*"/,` x="${p.x-24}" y="${p.y-24}" width="48" height="48"`)}</g>`;
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

document.addEventListener('keydown',e=>{const tile=e.target.closest('[role="button"][data-action]');if(tile&&e.target===tile&&['Enter',' '].includes(e.key)){e.preventDefault();tile.click();}});

document.addEventListener('click',e=>{
 const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
 const action=button.dataset.action,index=Number(button.dataset.index);
 if(action==='close-sheet'&&button.closest('dialog.card-bench-sheet')){e.stopImmediatePropagation();doneDeck();return;}
 if(action!=='cards'&&!action?.startsWith('card-')&&!action?.startsWith('flight-reward-'))return;
 switch(action){
  case 'cards':openDeck();break;
  case 'card-select':selectDeckCard(button.dataset.id);break;
  case 'card-reading-back':backDeckReader();break;
  case 'card-open-collection':cardBrowsing=true;cardDeckNotice='';showCards();break;
  case 'card-collection-back':cardBrowsing=false;if(!getOwnedCards(state.run).find(c=>c.instanceId===cardSelectedId)?.mounted)cardSelectedId=null;cardEquipMode=false;cardTargetSlot=null;cardDeckNotice='';showCards();break;
  case 'card-inspect':cardSelectedId=button.dataset.id;cardEquipMode=false;cardInspecting=true;cardReaderOrigin=cardBrowsing?'deck':'equipped';showCards();break;
  case 'card-return-selected':{const c=getOwnedCards(state.run).find(c=>c.instanceId===cardSelectedId);if(c?.mounted&&canEditDeck()&&unequipMountedCard(state.run,c.slot,c.instanceId)){cardDeckNotice=`${cardName(c)} → Deck`;cardSelectedId=null;cardEquipMode=false;repaintDeck();}break;}
  case 'card-equip':if(canEditDeck()&&cardSelectedId&&!isInventoryOnlyCard(getOwnedCards(state.run).find(c=>c.instanceId===cardSelectedId))){cardEquipMode=true;cardInspecting=false;cardBrowsing=cardReaderOrigin==='deck';cardDeckNotice='';showCards();}break;
  case 'card-cancel-equip':cardEquipMode=false;cardTargetSlot=null;if(!cardInspecting)cardSelectedId=null;showCards();break;
  case 'card-slot':{
   if(cardEquipMode&&cardSelectedId&&canEditDeck()){const selected=getOwnedCards(state.run).find(c=>c.instanceId===cardSelectedId);if(selected?.slot===index){cardSelectedId=null;cardEquipMode=false;showCards();}else requestCardTransfer(cardSelectedId,index,button.dataset.deckSlotId||null);}
   else{const card=getMountedCards(state.run)[index];if(card)selectDeckCard(card.instanceId);else if(!cardMeltMode&&canEditDeck()){cardTargetSlot=index;cardBrowsing=true;cardSelectedId=null;cardInspecting=false;cardEquipMode=false;cardDeckNotice='';showCards();}}
   break;
  }
  case 'card-move-one':{
   const direction=Number(button.dataset.direction), destination=index+direction, mounted=getMountedCards(state.run), source=mounted[index];
   if(![-1,1].includes(direction)||cardMeltMode||cardTargetSlot!==null||!canEditDeck()||!source||source.instanceId!==button.dataset.id||destination<0||destination>=mounted.length)break;
   const neighbor=mounted[destination];
   if((neighbor?.instanceId||'')!==(button.dataset.expectedId||''))break;
   requestCardTransfer(source.instanceId,destination,neighbor?.instanceId||null);
   break;
  }
  case 'card-unequip':if(canEditDeck()&&unequipMountedCard(state.run,index,button.dataset.id)){cardDeckNotice='Returned to reserve.';cardEquipMode=false;cardInspecting=false;cardSelectedId=null;cardBrowsing=false;repaintDeck();}break;
  case 'card-melt-mode':beginDeckMelt();break;
  case 'card-melt-this':beginDeckMelt(button.dataset.id);break;
  case 'card-cancel-melt':cancelDeckMelt();break;
  case 'card-back-melt':cardMeltToken=null;showCards();break;
  case 'card-preview-melt-selected':previewDeckMelt();break;
  case 'card-confirm-melt-selected':confirmDeckMelt(button);break;
  case 'card-swap-back':cancelCardTransfer();break;
  case 'card-swap-confirm':commitCardTransfer();break;
  case 'flight-reward-continue':finishCardDraftIncome();break;
  case 'flight-reward-open-pack':openCardDraftPack(button);break;
  case 'card-draft-pick':if(screen==='card-draft'&&(!hasFlightRewardCeremony(state.run)||flightRewardCeremonyStage(state.run)==='cards'&&performance.now()>=ceremonyPickReadyAt)&&claimDraftedCard(state,button.dataset.draftId,button.dataset.id)){cardRewardEquipping=false;cardRewardNotice='';persist();goToRun();}break;
  case 'card-reward-continue':acknowledgeCardReceipt();break;
  case 'card-preview-reward-melt':beginRewardMelt();break;
  case 'card-reward-deck':acknowledgeCardReceipt(true,button.dataset.id);break;
  case 'card-demo-reward':if(cardInspector){prepareCardInspectorReward(state.run);cardEquipMode=false;closeSheet();render('card-reward');}break;
  case 'card-preview-improve':previewCardImprove(button.dataset.id);break;
  case 'card-back-improve':if(cardWorkshopOrigin)showCardWorkshop();else showCards();break;
  case 'card-confirm-grow':takeSupport(index,button.dataset.token);break;
  case 'card-cancel-grow':closeSheet();break;
  case 'card-confirm-improve':if(canEditDeck()&&improveOwnedCard(state,button.dataset.id,Number(button.dataset.rank),button.dataset.token)){if(cardWorkshopOrigin){saveDeckEdits();showCardWorkshop('Card improved · remaining uses preserved.');}else repaintDeck();notify('Card improved · uses preserved');}break;
  case 'card-workshop':showCardWorkshop();break;
  case 'card-workshop-back':backDeckWorkshop();break;
  case 'card-workshop-improve':cardWorkshopOrigin=true;previewCardImprove(button.dataset.id);break;
  case 'card-workshop-refill':previewCardRefill(button.dataset.id);break;
  case 'card-confirm-refill':confirmCardRefill(button.dataset.id,button.dataset.token);break;
  case 'card-workshop-forge':openCardForge(button.dataset.rarity);break;
  case 'card-preview-forge':openCardForge(button.dataset.rarity);break;
  case 'card-confirm-forge':confirmCardForge(button.dataset.rarity,button.dataset.token);break;
  case 'card-forge-back':backCardForge();break;
  case 'card-forge-again':if(cardLastForged)cardLastForged.card=null;previewCardForge(button.dataset.rarity);break;
  case 'card-forge-view':viewForgedCard(button.dataset.id);break;
 }
});

document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;const action=btn.dataset.action,id=btn.dataset.id;if(rewardAnimating&&['victory-next','skills'].includes(action))return;switch(action){case'collector-preference':if(setCollectorPreference(state.run,id)){persist();showSkills('companion');}break;case'refresh-build':refreshFromMenu(btn);break;case'install-game':showInstallation();break;case'installation-back':backInstallation();break;case'cancel-flight-entry':cancelFlightEntry();break;case'close-collection':closeCollection();break;case'cancel-artifact-melt':collectionConfirmId=null;repaintCollection();break;case'reward-artifact-details':showRewardArtifactDetails(id);break;case'collection-artifact-details':showCollectionArtifactDetails(id);break;case'collection-artifact-rules-back':repaintCollection();break;case'reward-earnings':if(state.run)openSheet(rewardEarningsDetailMarkup(state.run),'reward-earnings-sheet');break;case'scribe-pick':case'scribe-back':case'scribe-slot':case'scribe-slot-back':case'scribe-confirm':scribeStep(action,id,Number(btn.dataset.slot));break;case'keep-flight-reward':keepFlightReward(id);break;case'wake-flight':wakeFlight(e);break;case'death-continue':if(state.run){state.run.deathPending=false;persist();goToRun()}break;case'practice-deck':showPracticeDeck();break;case'practice-chain':showPracticeDeck({arrange:true});break;case'field-guide':if(!document.querySelector('dialog.settings-sheet'))guideReturnSettings=false;showFieldGuide();break;case'guide-back':backFieldGuide();break;case'settings':showSettings();break;case'settings-advanced':showSettings('advanced');break;case'settings-back':backSettings();break;case'guide-page':showFieldGuide(id);break;case'guide-topic':showGuideTopic(id);break;case'restart-practice':{const continuation=state.run?.tutorialContinuation;exitTutorial();enterTutorial(continuation?{forNewGame:true,difficulty:continuation.difficulty}:{});}break;case'mock-toggle':switchRestInspector(!restInspector);break;case'fullscreen':landscape.fullscreen();break;case'view-route':render('map');break;case'preview-node':previewNode(id);break;case'victory-next':if(acknowledgeVictory(state)){persist();goToRun()}break;case'leave-scribe':if(leaveScribe(state.run)){scribe={id:null,slot:null};persist();goToRun()}break;case'dream-retry':closeSheet();destroyFlight();launch();break;case'dream-accept':acceptDream();break;case'dream-wake':wakeDream();break;case'performance-report':if(flightPerformance)downloadPerformanceReport(flightPerformance.report());break;case'book-skill':mainSkillSelection=id;showSkills(btn.dataset.chapter);break;case'book-chapter':mainSkillSelection=null;showSkills(id);break;case'book-variant':bookVariant=id==='index'?'index':'map';mainSkillSelection=null;showSkills(bookVariant==='index'?'available':'wisp');break;case'choose-start-skill':if(chooseStartingSkill(state,id)){mainSkillSelection=id;persist();render(screen);showSkills();notify('STARTING GIFT LEARNED')}break;case'grant-test-condensed':if(!engine&&grantTestCondensedGlow(state,100)){persist();refreshSettings('grant-test-condensed');notify('+100 TEST STORED SPARKS')}break;case'test-override':toggleTestOverride();break;case'skip-tutorial':state.settings.skipTutorial=!state.settings.skipTutorial;if(state.settings.skipTutorial){hideLesson();if(state.run){delete state.run.pendingContextLesson;delete state.run.pendingEffectHints;}if(engine){delete engine._pendingOnboardingLesson;delete engine._pendingArtifactNotice;delete engine._pendingWorldFocus;}}persist();if(screen==='home')render('home');refreshSettings('skip-tutorial');break;case'starting-companion':case'test-starter':if(setStartingCompanion(state,id)){persist();render('home')}break;case'starter-gifts':showStartingGifts(true);break;case'new-gift':requestStartingGift(id,false);break;case'existing-gift':requestStartingGift(id,true);break;case'confirm-starting-gift':confirmStartingGift(id,btn.dataset.existing==='true',btn.dataset.token);break;case'cancel-starting-gift':cancelStartingGift(btn.dataset.existing==='true');break;case'play':closeSheet();if(state.run&&state.run.phase!=='ended')goToRun();else requestNewGame();break;case'continue-run':closeSheet();goToRun();break;case'new-game':requestNewGame();break;case'confirm-new-game':beginNewGame();break;case'exit-menu':exitToMenu();break;case'abandon-run':requestAbandon();break;case'confirm-abandon':endRun();break;case'companion-unlocks':showUnlocks();break;case'choose-ascension':selectedDifficulty=Math.max(1,Math.min(state.settings.testOverride?Math.max(6,state.profile.difficulty||1):state.profile.difficulty||1,Number(btn.dataset.value)||1));render('home');break;case'home':exitToMenu();break;case'menu':showMenu();break;case'resume':resumeFlight();break;case'close-sheet':closeSheet();break;case'tutorial':enterTutorial();break;case'practice':enterTutorial();break;case'reset-tutorial':resetOnboarding(state.profile);state.settings.skipTutorial=false;if(state.run)delete state.run.onboardingPacing;persist();refreshSettings('reset-tutorial');notify('Tutorial reset · New Game will begin with First Light');break;case'skip-practice':skipPractice();break;case'skip-practice-once':exitTutorial({continueNewGame:true});break;case'practice-skip-to-start':skipPracticeToStart();break;case'remember-skip-practice':state.settings.skipTutorial=true;exitTutorial({continueNewGame:true,remember:true});break;case'leave-practice':exitTutorial({continueNewGame:true});break;case'music':toggleSound('music');refreshSettings('music');break;case'mute':toggleSound('fx');refreshSettings('mute');break;case'node':closeSheet();if(commitNode(id)){persist();goToRun()}break;case'back-route':backRoute();break;case'support':takeSupport(Number(btn.dataset.index));break;case'launch':launch();break;case'retry':launch(true);break;case'end-run':requestAbandon();break;case'next-map':if(advanceMap(state.run,id)){persist();goToRun()}break;case'skills':showSkills();break;case'bond-tree':showSkills('wisp');break;case'buy-skill':learnSkill(id,btn.dataset.rank?Number(btn.dataset.rank):undefined);break;case'companions':showFleet();break;case'fleet-role':chooseFleet(id);break;case'inspect-flight-artifact':inspectArtifact(id,true);break;case'inspect-artifact':inspectArtifact(id);break;case'artifact-details-back':showArtifacts();break;case'artifacts':showArtifacts();break;case'collection-page':collectionPage=Number(btn.dataset.page)||0;collectionSelectedId=null;collectionConfirmId=null;collectionLastMelt=null;repaintCollection();break;case'sell-artifact':requestArtifactSalvage(id);break;case'confirm-artifact-forge':forgeArtifact(id);break;case'pickup-key':showPickupKey();break;case'map-key':showMapKey();break;case'map-position':drawMap();break;case'condensation-help':showCondensation();break;case'close-power':closeSheet();break}});
document.addEventListener('pointerdown',()=>engine?.unlockAudio(),{capture:true,passive:true});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action^="score-"]');if(!button||button.disabled)return;
 if(button.dataset.action==='score-view'){if(completedGameScore(state.run))render('result');return;}
 const score=completedGameScore(state.run);if(!score)return;
 const status=document.querySelector('.game-score-status'),say=message=>{if(status)status.textContent=message;};
 button.disabled=true;
 try{
  if(button.dataset.action==='score-save'){downloadScorecard(await scorecardPNG(score),score);say('PNG saved.');}
  else if(button.dataset.action==='score-share'){const result=await shareScorecard(score);say(result==='downloaded'?'PNG downloaded. Share the saved image from your device.':result==='shared'?'Scorecard shared.':'');}
  else if(button.dataset.action==='score-link'){
   const link=scorecardLink(score,location.href);
   try{await navigator.clipboard.writeText(link);say('Scorecard link copied.');}
   catch{openSheet(`<h2>Scorecard link</h2><p>Copy this link to share the image.</p><input class="scorecard-copy-link" aria-label="Scorecard link" readonly value="${esc(link)}"><button class="primary" data-action="close-sheet">Done</button>`,'scorecard-link-sheet');document.querySelector('.scorecard-copy-link')?.select();}
  }
 }catch{say('Could not create the scorecard. Please try again.');}
 finally{button.disabled=false;}
});
document.addEventListener('keydown',e=>{if(engine&&['Space','ArrowUp','KeyB'].includes(e.code))engine.unlockAudio()},{capture:true});
document.addEventListener('keydown',e=>{if(coach.active||document.querySelector('dialog[open]'))return;if(engine){if(['Space','ArrowUp','KeyB','Escape'].includes(e.code))e.preventDefault();if(e.repeat)return;if(engine.dream?.phase==='awakening'&&['Space','ArrowUp'].includes(e.code)){wakeDream();return;}if(resumeArmed&&['Space','ArrowUp'].includes(e.code)){wakeFlight(e);return;}if(e.code==='Escape')showMenu();else if(!paused&&['Space','ArrowUp'].includes(e.code))engine.beginLiftInput();else if(!paused&&e.code==='KeyB')engine.activateAbility()}else{const node=e.target.closest?.('.world-map-node[role=button]');if(node&&['Enter',' '].includes(e.key)){e.preventDefault();if(node.dataset.action==='preview-node')previewNode(node.dataset.id);else if(commitNode(node.dataset.id)){persist();goToRun()}}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&engine&&!engine.dying&&(!paused||cancelCountdown)){pauseFlight();showMenu()}});
window.addEventListener('pagehide',persist);
render('home');
const landscape=installLandscapeMode({onPortrait:()=>{closeSheet();if(engine&&(!paused||cancelCountdown)){pauseFlight();showMenu()}},onChange:()=>{if(screen==='map'&&state.run?.phase==='briefing'&&!engine&&!flightLoading)requestAnimationFrame(()=>{if(screen==='map'&&!landscape.isPortrait()&&state.run?.phase==='briefing'&&!engine&&!flightLoading)goToRun()});else if(screen==='map')drawMap()}});

document.addEventListener('keyup',e=>{if(['Space','ArrowUp'].includes(e.code))engine?.endLiftInput()});
window.addEventListener('blur',()=>engine?.endLiftInput(true));
let treeResizeFrame=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(treeResizeFrame);treeResizeFrame=requestAnimationFrame(()=>{if(screen==='map')drawMap()})});

if(boundaryInspector)window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==window.parent)return;
 if(event.data?.type==='wisp-boundary-style'&&['moon','living','danger'].includes(event.data.style)){
  boundaryEdgeStyle=event.data.style;
  if(engine){if(!engine.paused){pauseFlight();resumeFlight({waitForTap:true});}engine.boundaryStyle=boundaryEdgeStyle;engine.render();}
 }
 if(event.data?.type==='wisp-boundary-scene'&&event.data.action==='relight'){boundaryReveal=!boundaryReveal;engine?.render();}
 if(event.data?.type==='wisp-boundary-scene'&&event.data.action==='restart'){boundaryReveal=false;destroyFlight();state=createBoundaryInspectorState(new URLSearchParams(location.search));goToRun();}
});

if(cardInspector){const scenario=new URLSearchParams(location.search).get('scenario');if(scenario==='scribe'){const pick=new URLSearchParams(location.search).get('pick');if(pick&&state.run.flightReward?.offers?.includes(pick))scribe={id:pick,slot:null};goToRun();}else if(['rest','dream','dream-rest','pack','departure'].includes(scenario))goToRun();else{render('map');if(scenario==='starter')showStartingGifts(true);else showCards();}}
else if(mockMode)goToRun();
else if(new URLSearchParams(location.search).get('tutorial')==='1'){
 const url=new URL(location.href);url.searchParams.delete('tutorial');history.replaceState(null,'',url);
 enterTutorial();
}

// Host display controls pause a live scene before changing its presentation.
if(new URLSearchParams(location.search).get('hosted')==='1'&&window.parent!==window){
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='wisp-host-pause')return;
  if(engine&&!engine.dying&&!engine.completing)showMenu();
 });
}

// A paused flight is still a live flight. Only completed/abandoned flight
// boundaries may save and open a fully downloaded replacement build.
registerUpdateClient({
 canReload:()=>!engine&&!flightLoading&&!rewardAnimating&&!cancelCountdown&&!['flight','guardian-ritual'].includes(screen),
 beforeReload:()=>persist()
});
