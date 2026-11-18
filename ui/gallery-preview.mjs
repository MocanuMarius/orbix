import {relics,cards,route,menus,hud,art,dialogs,actionButton,escapeHtml as esc} from './index.mjs?v=clear-1';
import {resolveSample} from './gallery-catalog.mjs?v=clear-1';
import {createComponentFixture} from './gallery-fixtures.mjs?v=clear-1';
import {makeSkillCard} from '../skill-cards.mjs?v=clear-1';
import {getStartingGiftOffers} from '../model.mjs?v=clear-1';
import {ARTIFACTS,getChoices,getOwnedCards,getMountedCards,getCardReward,getCardDraft,chooseCardDraft,getCardMeltPreview,meltOwnedCards,getArtifactSalvageValue,sellArtifact,chooseFlightReward,equipOwnedCard,unequipMountedCard,moveMountedCard} from '../model.mjs?v=clear-1';
import {bindDeckDragging} from '../deck-drag.mjs?v=clear-1';
import {ROUTE_BONUSES} from '../route-bonuses.mjs?v=clear-1';
import {prepareRouteOffer} from '../route-offers.mjs?v=clear-1';
import {installComboLessons} from '../combo-lesson.mjs?v=clear-1';
import {installTapPick} from '../tap-pick.mjs?v=clear-1';
import {flightRewardCeremonyMarkup} from '../flight-reward-ceremony.mjs?v=clear-1';
import {cardWorkshopMarkup,cardRefillMarkup} from '../card-workshop.mjs?v=clear-1';
import {getCardImprovePreview,improveOwnedCard,getCardRefillPreview,refillOwnedCard,getCardForgePreview,forgeOwnedCard,getSupportChoices,resolveSupport} from '../model.mjs?v=clear-1';
installComboLessons();installTapPick();

const query=new URLSearchParams(location.search),sample=resolveSample(query.get('family'),query.get('state'));
const state=createComponentFixture(sample.family,sample.state),run=state.run,app=document.querySelector('#app');
const local={page:0,selectedId:'glow-wick',confirmMeltId:sample.state==='confirm'?'glow-wick':null,lastMelt:null,
  browsing:sample.state==='reserve',inspecting:sample.state==='reader',cardId:sample.state==='reader'?'sample-mounted-0':null,equip:false,chosenDifficulty:2,toggle:false};
let rootSheet=null,detailSheet=null,detailOpener=null;
document.body.dataset.componentFamily=sample.family;

function status(message){
  document.querySelector('#preview-status').textContent=message;
  if(parent!==window)parent.postMessage({type:'ui-sample-status',message},location.origin);
}
function navigate(family,variant){
  if(parent!==window)parent.postMessage({type:'ui-sample-navigate',family,state:variant},location.origin);
  else location.href=`?${new URLSearchParams({family,state:variant})}`;
}
function closeDetail(){
  if(!detailSheet)return;
  detailSheet.close();detailSheet.remove();detailSheet=null;
  if(detailOpener?.isConnected)detailOpener.focus({preventScroll:true});
}
function sheet(content,className,{detail=false}={}){
  if(detail){
    closeDetail();detailOpener=document.activeElement;
    detailSheet=document.createElement('dialog');detailSheet.className=`power-sheet game-sheet ${className}`;
    detailSheet.setAttribute('aria-label','Component details');detailSheet.innerHTML=content;
    document.body.append(detailSheet);detailSheet.showModal();
    detailSheet.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
    detailSheet.querySelector('button')?.focus({preventScroll:true});
    return detailSheet;
  }
  if(!rootSheet){
    rootSheet=document.createElement('dialog');rootSheet.className=`power-sheet game-sheet ${className}`;
    rootSheet.setAttribute('aria-label',sample.spec.label);
    document.body.append(rootSheet);
    rootSheet.addEventListener('cancel',event=>{event.preventDefault();closeSample();});
  }
  rootSheet.innerHTML=content;
  if(!rootSheet.open)rootSheet.showModal();
  return rootSheet;
}
function closeSample(){
  if(detailSheet){closeDetail();return;}
  rootSheet?.close();
  app.innerHTML=`<section class="ui-preview-notice"><h1>Sample closed</h1><p>Your saved journey is unchanged.</p>${actionButton('Reopen sample',{action:'preview-reopen',className:'primary'})}</section>`;
  status('Sample closed. Reopen it or use Reset sample.');
}
function background(){app.innerHTML=`<div class="ui-preview-world" aria-hidden="true">${menus.menuWorldMarkup()}</div>`;}
function renderCollection(){
  document.body.dataset.screen='map';
  const node=sheet(relics.collectionMarkup(state,{page:local.page,selectedId:local.selectedId,confirmMeltId:local.confirmMeltId,lastMelt:local.lastMelt,canMelt:run.restReady,discovered:sample.state==='almanac'}),'collection-sheet');
  node.querySelector(local.confirmMeltId?'[data-action="cancel-artifact-melt"]':'[aria-pressed="true"]')?.focus({preventScroll:true});
}
function renderRewards(){document.body.dataset.screen='victory';app.innerHTML=relics.flightRewardMarkup(state,{upgradeCount:0,skillsAvailable:false,deckAvailable:true,acquiredPresentation:sample.state});}
function renderCards(){
  if(sample.state==='starter'){
    document.body.dataset.screen='home';
    sheet(cards.starterCardsMarkup(run,getStartingGiftOffers(run),false),'card-sheet card-starter-sheet');
    return;
  }
  if(['workshop','rest'].includes(sample.state)&&!local.restDeck){
    document.body.dataset.screen='support';
    if(local.workshop??sample.state==='workshop')sheet(cardWorkshopMarkup(run,{notice:local.workshopNotice||''}),'card-sheet card-bench-sheet card-workshop-sheet');
    else sheet(cards.cardRestMarkup(run,run.current,getSupportChoices(run)),'card-sheet card-bench-sheet');
    return;
  }
  if(sample.state==='draftCeremony'&&getCardDraft(run)){
    document.body.dataset.screen='card-draft';document.body.classList.add('card-pilot');
    run.cardDraft.ceremony={version:1,stage:'cards'};
    run.cardDraft.offers=['twin-wick','growth-seed','harvest-rare'].map((id,i)=>makeSkillCard(id,`sample-draft-${i}`));
    app.innerHTML=flightRewardCeremonyMarkup(run);
    return;
  }
  if(sample.state==='draft'&&getCardDraft(run)){
    document.body.dataset.screen='card-draft';
    app.innerHTML=cards.cardDraftMarkup(run);
    return;
  }
  if((sample.state.startsWith('reward')||sample.state==='draft'||sample.state==='draftCeremony')&&!run.cardReward?.uiAcknowledged){
    document.body.dataset.screen='card-reward';
    app.innerHTML=cards.cardRewardMarkup(run,{equipping:local.equip,notice:local.rewardNotice||''});
    return;
  }
  document.body.dataset.screen='map';
  if(app.querySelector('.card-reward-screen'))background();
  sheet(cards.cardsBenchMarkup(state,{selectedId:local.cardId,browsing:local.browsing,inspecting:local.inspecting,equip:local.equip,demo:true}),'card-sheet card-bench-sheet');
}
function renderRoute(){
  document.body.dataset.screen='map';
  app.innerHTML='<section class="game-map-screen map-v2 minimal-map"><div class="map-atlas-frame"><div class="game-map-viewport"><svg class="game-world-map" aria-label="Expedition route"></svg></div></div></section>';
  route.drawLandscapeMap(app.querySelector('.game-world-map'),app.querySelector('.game-map-viewport'),run);
  if(sample.state==='wayfinder'&&local.guideOpened!==true){
    local.guideOpened=true;
    previewRouteNode(run.map[0].find(node=>node.levelId==='thorn-thorn-steeple'));
  }
}
function previewRouteNode(node){
  if(!node)return;
  const available=getChoices(run).some(item=>item.id===node.id);
  const bonus=prepareRouteOffer(run,node,{profile:state.profile,width:innerWidth,height:innerHeight});
  sheet(route.flightPreviewMarkup(run,node,{available,level:node,bonus,guideArt:query.get('guideArt')}),'flight-preview-sheet',{detail:true});
}
function renderMenus(){document.body.dataset.screen='home';app.innerHTML=menus.homeMenuMarkup({profile:state.profile,run:sample.state==='resume'?run:null,selectedDifficulty:local.chosenDifficulty});}
function renderHud(){
  document.body.dataset.screen='flight';document.body.classList.add('playing');
  app.innerHTML=`<section class="flight-shell"><div class="flight-device ui-preview-flight"><div class="flight-hud"><span class="ember-counter flight-condensed-counter">${hud.condensedIconMarkup()}<b>75</b></span><span class="flight-bonus-counter" id="flight-bonus"></span><div class="flight-run-status">${hud.livesMarkup(run)}</div></div><div class="canvas-wrap">${hud.glowGaugeMarkup(run)}${hud.edgingPulseMarkup()}<div class="ui-preview-flight-caption">${sample.spec.states[sample.state]}</div></div><div class="flight-dock">${hud.boostControlMarkup('swift')}${actionButton('Lift',{className:'flight-control flap-control',action:'preview-lift',icon:art.resourceSymbol('up')})}</div></div></section>`;
  const control=document.querySelector('#boost-btn');
  hud.updateBoostControl(control,{alive:true,paused:sample.state==='paused',ability:{role:'swift',roles:['swift'],ready:sample.state!=='recovering',cooldown:sample.state==='recovering'?5:0,cooldownTotal:9}});
  hud.updateGlowGauge(document.querySelector('.glow-side-gauge'),{flame:run.flame,maxGlow:100,flapCost:10});
  hud.updateEdgingPulse(document.querySelector('.edging-pulse-gauge'),{edgingPulse:{charge:.65,nearEdge:true}});
  route.updateBonusGauge(document.querySelector('#flight-bonus'),{id:'wayfinder',progress:1,target:3,eligible:true});
}
function renderDialogs(){
  document.body.dataset.screen='map';
  if(sample.state==='relic')sheet(dialogs.artifactDetailMarkup(ARTIFACTS['glow-wick'],{run}),'artifact-sheet');
  if(sample.state==='earnings')sheet(dialogs.rewardEarningsDetailMarkup(run),'reward-earnings-sheet');
  if(sample.state==='pickups')sheet(dialogs.pickupGuideMarkup({discovered:['light','cluster','vault','sight'],cardPilot:true})+actionButton('Back',{action:'close-sheet'}),'pickup-guide-sheet');
  if(sample.state==='glossary'){
    app.innerHTML='<section class="ui-preview-notice"><h1>Keyword glossary</h1><button type="button" class="primary" data-card-glossary>Open glossary</button></section>';
    app.querySelector('[data-card-glossary]').click();
  }
}
function renderControls(){
  document.body.dataset.screen='map';
  sheet(`<section class="ui-preview-controls"><h2>Shared actions</h2><p>Native buttons keep keyboard and touch behavior.</p><div class="ui-preview-action-row">${actionButton('Continue →',{action:'preview-continue',className:'primary'})}${actionButton('Back',{action:'preview-back'})}${actionButton('Unavailable',{action:'preview-unavailable',disabled:true})}</div><div class="ui-preview-action-row" role="group" aria-label="Selected choice">${actionButton(local.toggle?'Selected':'Select choice',{action:'preview-toggle',pressed:local.toggle})}</div><p>Remove this sample relic and its effect?</p><div class="ui-preview-action-row">${actionButton('Keep',{action:'preview-keep'})}${actionButton('Confirm Melt',{action:'preview-confirm',className:'primary',icon:art.furnaceGlyphMarkup()})}</div><p id="control-result" role="status">Choose an action to see feedback.</p></section>`,'ui-preview-control-sheet');
}
function tile(label,markup){return `<figure class="ui-preview-art-tile">${markup}<figcaption>${esc(label)}</figcaption></figure>`;}
function renderArt(){
  document.body.dataset.screen='map';
  const contents=sample.state==='relics'
    ? ['wayward-seed','glow-wick','echo-bell','sunheart-engine'].map(id=>tile(ARTIFACTS[id].name,art.reliquaryNicheMarkup()+relics.relicPortraitMarkup(id))).join('')+tile('Melt',art.furnaceGlyphMarkup())
    : ['energy','packed','up'].map(id=>tile(id==='energy'?'Spark':id==='packed'?'Stored Sparks':'Lift',art.resourceSymbol(id))).join('')+['collector','protector','swift','leveler'].map(id=>tile(id,art.companionArtSvg(id))).join('')+tile('Rest',route.mapStopIconMarkup('camp'));
  app.innerHTML=`<section class="ui-preview-art"><h1>${sample.spec.states[sample.state]}</h1><div class="ui-preview-art-grid">${contents}</div></section>`;
}
const renderers={collection:renderCollection,rewards:renderRewards,cards:renderCards,route:renderRoute,menus:renderMenus,hud:renderHud,dialogs:renderDialogs,controls:renderControls,art:renderArt};
function render(){renderers[sample.family]();}
dialogs.installCardTermHelp(document);
function transferReward(slot,expectedId){
  const reward=getCardReward(run),outgoing=getMountedCards(run)[slot],fromSlot=getOwnedCards(run).find(card=>card.instanceId===reward?.card.instanceId)?.slot;
  if(!reward||!equipOwnedCard(run,reward.card.instanceId,slot,expectedId))return;
  local.equip=false;
  local.rewardNotice=`${cards.cardName(reward.card)} → slot ${slot+1}.${outgoing?` ${cards.cardName(outgoing)} → ${fromSlot===null?'Deck':`slot ${fromSlot+1}`}.`:''}`;
  renderCards();status(local.rewardNotice+' Sample only.');
}
bindDeckDragging({
  canEdit:()=>sample.family==='cards'&&(sample.state.startsWith('reward')||sample.state==='draft'||sample.state==='draftCeremony')&&!!run.cardReward&&!run.cardReward.uiAcknowledged&&!detailSheet,
  getCard:id=>getOwnedCards(run).find(card=>card.instanceId===id),
  onDrop:({kind,slot,expectedId})=>{if(kind==='slot')transferReward(slot,expectedId);},
});
background();render();

document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-tap-pick] :is([data-card-term],[data-card-term-trigger],[data-card-status-help])'))return;
  const button=event.target.closest?.('[data-action]');
  if(!button||button.disabled)return;
  const {action,id}=button.dataset;
  if(action==='card-workshop'){closeDetail();local.restDeck=false;local.workshop=true;renderCards();return;}
  if(action==='card-workshop-back'){local.restDeck=false;local.workshop=false;renderCards();return;}
  if(action==='cards'&&['workshop','rest'].includes(sample.state)){local.restDeck=true;renderCards();return;}
  if(action==='support'&&['workshop','rest'].includes(sample.state)){if(resolveSupport(run,Number(button.dataset.index))){renderCards();status('Rest action saved only in this sample.');}return;}
  if(action==='card-workshop-improve'){
    const preview=getCardImprovePreview(run,id);if(!preview.before)return;
    sheet(cards.cardExchangeMarkup(preview.before,{kind:'improve',preview,wallet:run.condensedGlow,backLabel:'Back to Workshop'}),'card-sheet card-exchange-sheet',{detail:true});return;
  }
  if(action==='card-back-improve'){closeDetail();return;}
  if(action==='card-confirm-improve'){
    if(improveOwnedCard(state,id,Number(button.dataset.rank),button.dataset.token)){closeDetail();local.workshopNotice='Card improved · uses preserved.';renderCards();status('Only sample Stored Sparks spent.');}return;
  }
  if(action==='card-workshop-refill'){
    const preview=getCardRefillPreview(run,id);if(!preview.before)return;
    sheet(cardRefillMarkup(run,preview),'card-sheet card-exchange-sheet',{detail:true});return;
  }
  if(action==='card-confirm-refill'){
    if(refillOwnedCard(state,id,button.dataset.token)){closeDetail();local.workshopNotice='Card refilled · exact uses restored.';renderCards();status('Only sample Stored Sparks spent.');}return;
  }
  if(action==='card-workshop-forge'){
    local.workshopForgeRarity=button.dataset.rarity;
    sheet(cards.cardForgeMarkup(run,getCardForgePreview(run,local.workshopForgeRarity),{backLabel:'Workshop'}),'card-sheet card-forge-sheet',{detail:true});return;
  }
  if(action==='card-forge-back'){closeDetail();renderCards();return;}
  if(action==='card-confirm-forge'){
    if(forgeOwnedCard(state,button.dataset.rarity,button.dataset.token)){
      renderCards();sheet(cards.cardForgeMarkup(run,getCardForgePreview(run,button.dataset.rarity),{backLabel:'Workshop',notice:'Shown card added to sample Deck.'}),'card-sheet card-forge-sheet',{detail:true});status('Only sample Stored Sparks spent.');
    }return;
  }
  if(['collection-artifact-details','reward-artifact-details'].includes(action)){
    const artifact=ARTIFACTS[id];if(!artifact)return;
    sheet(dialogs.artifactDetailMarkup(artifact,{run,fresh:action==='reward-artifact-details',rewardPreview:action==='reward-artifact-details'}),'artifact-sheet',{detail:true});return;
  }
  if(action==='reward-earnings'){sheet(dialogs.rewardEarningsDetailMarkup(run),'reward-earnings-sheet',{detail:true});return;}
  if(action==='preview-node'){
    const node=run.map.flat().find(item=>item.id===id);if(!node)return;
    previewRouteNode(node);return;
  }
  if(action==='close-sheet'||action==='close-collection'){closeSample();return;}
  if(action==='preview-reopen'){background();render();return;}
  if(action==='inspect-artifact'){local.selectedId=id;local.confirmMeltId=null;renderCollection();return;}
  if(action==='collection-page'){local.page=Number(button.dataset.page)||0;local.selectedId=null;local.confirmMeltId=null;renderCollection();return;}
  if(action==='sell-artifact'){local.confirmMeltId=id;renderCollection();return;}
  if(action==='cancel-artifact-melt'){local.confirmMeltId=null;renderCollection();return;}
  if(action==='confirm-artifact-forge'){
    if(local.confirmMeltId!==id)return;
    const receipt={id,name:ARTIFACTS[id]?.name,amount:getArtifactSalvageValue(id)};
    if(sellArtifact(state,id)){local.lastMelt=receipt;local.confirmMeltId=null;renderCollection();status(`${receipt.name} melted in sample only. +${receipt.amount} Stored Sparks.`);}return;
  }
  if(action==='keep-flight-reward'){if(chooseFlightReward(state,id)){renderRewards();status(`${ARTIFACTS[id].name} acquired in this sample.`);}return;}
  if(action==='card-draft-pick'){
    if(chooseCardDraft(state,button.dataset.draftId,id)){renderCards();status('One card chosen and added only to this sample Deck. The other two are left behind.');}return;
  }
  if(action==='card-reward-equip'){local.equip=true;local.rewardNotice='';renderCards();return;}
  if(action==='card-reward-cancel'){local.equip=false;renderCards();return;}
  if(action==='card-reward-slot'){if(local.equip)transferReward(Number(button.dataset.index),button.dataset.deckSlotId||null);return;}
  if(action==='card-reward-continue'){run.cardReward.uiAcknowledged=true;local.equip=false;local.browsing=true;renderCards();status('Card kept in this sample Deck. Your saved journey is unchanged.');return;}
  if(action==='card-preview-reward-melt'){
    const reward=getCardReward(run),preview=getCardMeltPreview(run,[reward?.card.instanceId]);
    if(!preview.eligible)return;
    local.rewardMeltToken=preview.token;
    sheet(cards.cardMeltSelectionMarkup(run,[reward.card.instanceId],run.condensedGlow,{single:true,receipt:{rewardId:reward.id,instanceId:reward.card.instanceId}}),'card-sheet card-exchange-sheet',{detail:true});return;
  }
  if(action==='card-cancel-melt'){local.rewardMeltToken=null;closeDetail();return;}
  if(action==='card-confirm-melt-selected'){
    const reward=getCardReward(run);
    if(button.dataset.token!==local.rewardMeltToken||button.dataset.rewardId!==reward?.id||button.dataset.rewardInstance!==reward?.card.instanceId)return;
    if(meltOwnedCards(state,[reward.card.instanceId],local.rewardMeltToken)){run.cardReward.uiAcknowledged=true;local.rewardMeltToken=null;closeDetail();local.browsing=true;renderCards();status('Card melted only in this sample. Your saved journey is unchanged.');}return;
  }
  if(action==='card-open-collection'){local.browsing=true;local.inspecting=false;renderCards();return;}
  if(action==='card-select'){local.cardId=id;local.equip=true;renderCards();return;}
  if(action==='card-inspect'){local.cardId=id;local.inspecting=true;renderCards();return;}
  if(action==='card-slot'){
    const index=Number(button.dataset.index),card=getOwnedCards(run).find(item=>item.instanceId===local.cardId);
    if(card&&(local.equip||local.browsing&&!local.inspecting)){
      const outgoing=getMountedCards(run)[index];
      if(outgoing&&outgoing.instanceId!==card.instanceId){local.pendingSwap={id:card.instanceId,slot:index,fromSlot:card.slot,expectedId:outgoing.instanceId};sheet(cards.cardSwapMarkup(run,local.pendingSwap),'card-sheet card-exchange-sheet',{detail:true});return;}
      equipOwnedCard(run,card.instanceId,index);local.equip=false;local.inspecting=false;local.browsing=false;
    }
    else{local.cardId=getMountedCards(run)[index]?.instanceId||null;local.inspecting=false;if(!local.cardId)local.browsing=true;}
    renderCards();return;
  }
  if(action==='card-move-one'){moveMountedCard(run,Number(button.dataset.index),Number(button.dataset.index)+Number(button.dataset.direction));renderCards();return;}
  if(action==='card-swap-back'){local.pendingSwap=null;closeDetail();return;}
  if(action==='card-swap-confirm'){
    const pending=local.pendingSwap;
    if(pending&&equipOwnedCard(run,pending.id,pending.slot,pending.expectedId)){local.pendingSwap=null;local.equip=false;local.inspecting=false;local.browsing=false;local.cardId=null;closeDetail();renderCards();status('Reviewed swap equipped in sample only.');}return;
  }
  if(action==='card-collection-back'){local.browsing=false;local.inspecting=false;local.cardId=null;local.equip=false;renderCards();return;}
  if(action==='card-equip'){local.equip=true;renderCards();return;}
  if(action==='card-unequip'){unequipMountedCard(run,Number(button.dataset.index),id);local.inspecting=false;local.browsing=true;renderCards();return;}
  if(['card-cancel-equip','card-reading-back','card-browse-back'].includes(action)){local.equip=false;local.inspecting=false;local.cardId=null;renderCards();return;}
  if(action==='choose-ascension'){local.chosenDifficulty=Number(button.dataset.value)||1;renderMenus();return;}
  if(['continue-run','new-game','play','view-route','victory-next'].includes(action)){navigate('route','start');return;}
  if(['skills','cards','card-return-equipped'].includes(action)){navigate('cards','equipped');return;}
  if(action==='artifacts'){navigate('collection','owned');return;}
  if(['practice','field-guide','tutorial','companion-unlocks'].includes(action)){navigate('dialogs','pickups');return;}
  if(action==='node'){closeDetail();navigate('hud','ready');return;}
  if(action==='preview-lift'){
    run.flame=Math.max(0,run.flame-10);hud.updateGlowGauge(document.querySelector('.glow-side-gauge'),{flame:run.flame,maxGlow:100,flapCost:10});status('Lift used only in this sample. Reset to refill the meter.');return;
  }
  if(action==='preview-toggle'){local.toggle=!local.toggle;renderControls();return;}
  if(action.startsWith('preview-')){const result=document.querySelector('#control-result');if(result)result.textContent=action==='preview-confirm'?'Sample Melt confirmed.':action==='preview-keep'?'Sample relic kept.':action==='preview-back'?'Returned to previous sample state.':'Continue selected.';status(result?.textContent||'Sample updated.');return;}
  status('This control continues a game flow. Open the game to use it with your journey.');
});
document.addEventListener('keydown',event=>{
  if(!['Enter',' '].includes(event.key)||event.repeat)return;
  const target=event.target.closest?.('[role="button"][data-action]');
  if(target&&target.tagName.toLowerCase()!=='button'){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
});
document.querySelector('#boost-btn')?.addEventListener('click',event=>{
  hud.updateBoostControl(event.currentTarget,{alive:true,ability:{role:'swift',roles:['swift'],cooldown:9,cooldownTotal:9,ready:false}});
  status('Companion power is recovering in this sample. Reset to make it ready.');
});
status(`${sample.spec.label} · ${sample.spec.states[sample.state]}. Sample data only.`);
document.documentElement.dataset.previewReady='true';
