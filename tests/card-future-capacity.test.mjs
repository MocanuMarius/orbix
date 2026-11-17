import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CARD_UNIT,CARD_ROW_EVENTS,SKILL_CARDS,makeSkillCard,createCardExecution,resolveCardRow,previewCardRow,drawSkillCard} from '../dist/skill-cards.mjs';
import {getGlowCapacity,getLifeCapacity,formatGlow} from '../dist/vitality.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {cardVictoryRecap} from '../dist/card-ui.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const row=ids=>ids.map((id,i)=>id?makeSkillCard(id,`progress:${i}`):null);
function fresh(ids=['growth-ring'],profile=null){
 const state=M.newState();if(profile)state.profile=structuredClone(profile);
 state.profile.tutorialComplete=true;state.run=M.createRun(state.profile,'clear-progress-route',1,{cards:true});
 assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id));
 state.run.mountedCards=row(ids);state.run.cardSlots=Math.max(3,ids.length);return state;
}
function selectNext(state){
 const r=state.run;if(r.phase==='map-clear')assert.ok(M.advanceMap(r));
 const choices=M.getChoices(r),node=choices.find(n=>n.type!=='support'&&!n.elite)||choices[0];
 assert.ok(node);assert.ok(M.selectNode(r,node.id));return node;
}
function clearSelected(state,result={}){
 const r=state.run;
 assert.ok(M.beginFlightAttempt(r));assert.ok(M.markFlightAttemptStarted(r));
 assert.ok(M.finishFlight(r,{success:true,flame:0,collected:4,boss:r.current.boss?{id:r.current.bossId,defeated:true}:null,...result}));
}
function clearFirst(state,result={}){selectNext(state);clearSelected(state,result);}
function acknowledge(state){
 const r=state.run,draft=M.getCardDraft(r);if(draft)assert.ok(M.chooseCardDraft(state,draft.id,draft.offers[0].instanceId));if(r.cardReward)r.cardReward.uiAcknowledged=true;
 if(r.flightReward&&!r.flightReward.claimed){if(r.flightReward.offers.length)assert.ok(M.chooseFlightReward(state,r.flightReward.offers[0]));else r.flightReward.claimed=true;}
 assert.ok(M.acknowledgeVictory(state));
}
function reload(state){let data;const storage={getItem:()=>data,setItem:(_,v)=>{data=v;}};assert.ok(M.saveState(state,storage));return M.loadState(storage);}

test('Growth Ring uses flight clears, integer permanent units, copies and one shared replay',()=>{
 for(const [ids,gain]of [[['growth-ring'],1],[['echo','growth-ring'],2],[['chameleon','growth-ring'],2],
  [['echo-iii','growth-ring'],4],[['growth-ring','refrain'],2],[['echo-iii','growth-ring','refrain'],8],
  // Boosts never multiply permanent gains (point 3 revised 2026-11-17).
  [['growth-ring','prism-lens','kindling-bead','mirror-grain','second-sun'],1]]){
  const runtime=createCardExecution(row(ids)),before=JSON.stringify(runtime),preview=previewCardRow(runtime,{kind:CARD_ROW_EVENTS.clear});
  assert.equal(JSON.stringify(runtime),before);const receipt=resolveCardRow(runtime,{kind:CARD_ROW_EVENTS.clear});
  assert.deepEqual(receipt,preview);assert.equal(receipt.futureCapacity,gain,ids.join(','));assert.equal(receipt.sparks,0);assert.equal(receipt.stored,0);
  assert.ok(Object.isFrozen(receipt));assert.ok(receipt.steps.every(Object.isFrozen));assert.ok(receipt.passes<=2);
  assert.equal(previewCardRow(row(ids),{kind:CARD_ROW_EVENTS.victory}).futureCapacity,0,'a final win is not a second clear');
 }
});

test('ordinary clear grows this vessel without a refill, then permanently settles once across reload',()=>{
 let state=fresh(['echo','growth-ring','refrain']);const opening=getGlowCapacity(state.run);
 clearFirst(state);const receipt=state.run.lastFlight.cardClearReceipt;
 assert.equal(receipt.futureCapacity,4);assert.equal(state.profile.cardFutureCapacity,0);assert.ok(Object.isFrozen(receipt));
 near(getGlowCapacity(state.run),opening+4*CARD_UNIT);near(state.run.flame,opening*.5);
 M.settleCheckpoint(state);assert.equal(state.profile.cardFutureCapacity,4);
 const wallet=state.run.condensedGlow;state=reload(state);
 assert.equal(state.profile.cardFutureCapacity,4);assert.ok(Object.isFrozen(state.run.cardClearReceipts[0]));
 assert.equal(M.settleCheckpoint(state),0);assert.equal(state.run.condensedGlow,wallet);
 assert.equal(M.finishFlight(state.run,{success:true}),false);
 const next=fresh(['body-spark'],state.profile);assert.equal(formatGlow(getGlowCapacity(next.run)),'34');near(next.run.flame,getGlowCapacity(next.run));
});

test('an unsettled clear settles on load, and every subsequent real clear accumulates through the final bank',()=>{
 let state=fresh(['growth-ring']);clearFirst(state);state=reload(state);assert.equal(state.profile.cardFutureCapacity,1);acknowledge(state);
 let flights=1;
 for(let visit=0;visit<80&&state.run.phase!=='ended';visit++){
  selectNext(state);
  if(state.run.phase==='support'&&state.run.current?.kind==='scribe'){assert.ok(M.chooseFlightReward(state,state.run.flightReward.offers[0]));assert.ok(M.leaveScribe(state.run));continue;}
  if(state.run.phase==='support'){
   const choices=M.getSupportChoices(state.run,state.profile),index=choices.findIndex(c=>!c.disabled&&(c.id==='rest-continue'||c.effect?.rest==='recover'||c.effect?.restContinue));
   assert.ok(M.resolveSupport(state.run,index>=0?index:choices.findIndex(c=>!c.disabled),state.profile));continue;
  }
  clearSelected(state);flights++;M.settleCheckpoint(state);acknowledge(state);
 }
 assert.ok(state.run.success);assert.ok(flights>3);assert.equal(state.profile.cardFutureCapacity,flights);
 assert.ok(M.bankRun(state));state=reload(state);M.settleCheckpoint(state);assert.equal(state.profile.cardFutureCapacity,flights);
 assert.match(cardVictoryRecap(state.run),new RegExp(`\\+${flights} maximum Sparks permanently`));
 assert.equal(state.run.cardClearReceipts.length,flights);
});

test('failed, TEST, Dream and legacy attempts do not earn permanent growth',()=>{
 for(const variant of ['failure','test','dream','legacy','no-ring']){
  const state=fresh(variant==='no-ring'?['body-spark']:['growth-ring']);
  if(variant==='test')state.run.testMode=true;
  if(variant==='legacy')state.run.skillSystem=undefined;
  selectNext(state);clearSelected(state,{success:variant!=='failure',dreamAttempt:variant==='dream'});M.settleCheckpoint(state);
  assert.equal(state.profile.cardFutureCapacity,0,variant);
 }
});

test('Wind Feather unlocks at most six percentage points with copies/replay; baseline remains selectable and saved',()=>{
 let state=fresh(['echo-iii','wind-feather','refrain']);clearFirst(state);M.settleCheckpoint(state);
 assert.equal(state.run.lastFlight.cardClearReceipt.cruisingSpeed,6);assert.equal(state.profile.cardCruisingSpeed,6);
 assert.equal(state.run.lastFlight.cardClearReceipt.steps.reduce((sum,step)=>sum+step.cruisingSpeed,0),6);
 assert.equal(previewCardRow(row(['wind-feather','refrain']),{kind:CARD_ROW_EVENTS.clear,cruisingSpeedRoom:0}).cruisingSpeed,0);
 assert.equal(M.getCruisingSpeed(state),6);near(M.getRunModifiers(state.run).speed,1.06);
 assert.ok(M.setCruisingSpeed(state,0));near(M.getRunModifiers(state.run).speed,1);assert.equal(M.setCruisingSpeed(state,7),false);
 state=reload(state);assert.equal(M.getCruisingSpeed(state),0);assert.equal(state.settings.cardCruisingSpeed,0);
 assert.ok(M.setCruisingSpeed(state,3));near(M.getRunModifiers(state.run).speed,1.03);
 const next=M.createRun(state.profile,'speed-selection',1,{cards:true,cruisingSpeed:M.getCruisingSpeed(state)});near(M.getRunModifiers(next).speed,1.03);
 M.settleCheckpoint(state);assert.equal(state.profile.cardCruisingSpeed,6);
});

test('changing cruising speed during an active attempt waits until the following flight',()=>{
 const state=fresh(['wind-feather']);state.profile.cardCruisingSpeed=6;state.run.cardCruisingSpeedUnlocked=6;state.run.cardCruisingSpeed=6;
 selectNext(state);assert.ok(M.beginFlightAttempt(state.run));assert.ok(M.setCruisingSpeed(state,0));
 near(M.getRunModifiers(state.run).speed,1.06);M.settleCheckpoint(state);near(M.getRunModifiers(state.run).speed,1.06);
 assert.ok(M.finishFlight(state.run,{success:false,flame:0}));assert.equal(state.run.cardCruisingSpeedNext,0);
 selectNext(state);assert.ok(M.beginFlightAttempt(state.run));near(M.getRunModifiers(state.run).speed,1);
 assert.equal(state.run.cardCruisingSpeedNext,undefined);
});

test('Purse and Nest Egg pay clear-only currency from carried-in savings and never pack their own output',()=>{
 for(const [carried,expected]of [[0,0],[9,0],[10,1],[29,2],[100,10],[999,10]]){
  const state=fresh(['nest-egg']);state.run.condensedGlow=carried;clearFirst(state,{condensedGlow:20});M.settleCheckpoint(state);
  assert.equal(state.run.lastFlight.cardClearReceipt.stored,expected,`carried ${carried}`);
 }
 const state=fresh(['echo','wayfarers-purse','nest-egg','tight-packing','refrain']);state.run.condensedGlow=100;
 clearFirst(state,{condensedGlow:4});M.settleCheckpoint(state);
 assert.equal(state.run.lastFlight.cardClearReceipt.stored,40);assert.equal(state.run.lastFlight.cardPackingBonus,2);
 assert.equal(state.run.lastFlight.securedCondensedGlow,state.run.lastFlight.completionBonus+4+2+40);
 const wallet=state.run.condensedGlow;const saved=reload(state);M.settleCheckpoint(saved);assert.equal(saved.run.condensedGlow,wallet);
 const trace=previewCardRow(row(['wayfarers-purse','nest-egg','refrain']),{kind:CARD_ROW_EVENTS.clear,carriedStored:100});
 assert.equal(trace.stored,30);assert.equal(trace.sparks,0);
});

test('Devourer consumes only the adjacent actual Rare at a successful clear and heals once',()=>{
 let state=fresh(['devourer','echo-ii','devourer','harvest-rare']);const r=state.run;r.lives=1;
 clearFirst(state);assert.equal(r.lives,getLifeCapacity(r));assert.equal(r.mountedCards[1],null);assert.equal(r.mountedCards[3],null);
 assert.equal(r.mountedCards[0].cardId,'devourer');assert.equal(r.lastFlight.devourerSacrifices.length,2);
 assert.deepEqual(r.lastFlight.consumedCards,['progress:1','progress:3']);
 state=reload(state);assert.equal(state.run.lives,getLifeCapacity(state.run));assert.equal(state.run.lastFlight.devourerSacrifices.length,2);
 assert.equal(M.finishFlight(state.run,{success:true}),false);
 for(const [ids,lives,result,consumed]of [
  [['devourer','echo-ii'],3,{},false],[['devourer','body-spark'],1,{},false],
  [['devourer',null,'echo-ii'],1,{},false],[['devourer','echo-ii'],1,{success:false},false],
  [['devourer','echo-ii'],1,{dreamAttempt:true},false],[['echo','devourer','echo-ii'],1,{},true],
 ]){
  const s=fresh(ids);s.run.lives=lives;clearFirst(s,result);
  assert.equal(s.run.lastFlight?.devourerSacrifices?.length||0,consumed?1:0,ids.join(','));
  if(!consumed)assert.ok(s.run.mountedCards.some(card=>card?.cardId==='echo-ii')||!ids.includes('echo-ii'));
 }
});

test('retired Rare duplicates migrate into upgraded Common ranks with exact former effects',()=>{
 const state=fresh(['growth-ring']);state.run.reserveCards=['courier-tip-ii','downbeat-ii','toll-bell-ii','trail-vessel','bellows-seal'].map((cardId,i)=>({cardId,instanceId:`legacy:${i}`,rank:1,charges:1}));
 const saved=reload(state),cards=saved.run.reserveCards.filter(card=>card.instanceId.startsWith('legacy:'));
 assert.deepEqual(cards.map(card=>[card.cardId,card.rank]),[['courier-tip',2],['downbeat',2],['toll-bell',2],['growth-ring',1],['wind-feather',1]]);
 for(const [id,kind,before,after]of [['courier-tip',CARD_ROW_EVENTS.delivery,2,3],['downbeat',CARD_ROW_EVENTS.lift,2,3],['toll-bell',CARD_ROW_EVENTS.rhythm,2,4]]){
  assert.equal(SKILL_CARDS[id+'-ii'],undefined);const card=makeSkillCard(id,'rank');assert.equal(previewCardRow([card],{kind}).sparks,before);
  card.rank=2;assert.equal(previewCardRow([card],{kind}).sparks,after);
 }
});

test('retired earned-card receipts migrate with their owned instance and stay readable without duplicate settlement',()=>{
 for(const [oldId,newId,rank]of [['courier-tip-ii','courier-tip',2],['downbeat-ii','downbeat',2],['toll-bell-ii','toll-bell',2],['trail-vessel','growth-ring',1],['bellows-seal','wind-feather',1]])for(const claimed of [false,true]){
  let state=fresh(),r=state.run;const node=M.getChoices(r).find(n=>n.type!=='support');
  const instanceId=`${r.campaignSeed}:${r.mapIndex}:${node.id}:flight`,card={instanceId,cardId:oldId,rank:1};
  r.cardReward={id:instanceId,card:{...card},source:'flight',claimed,uiAcknowledged:false};
  r.reserveCards=claimed?[card]:[];
  state=reload(state);r=state.run;
  const receipt=M.getCardReward(r),owned=M.getOwnedCards(r).filter(c=>c.instanceId===instanceId);
  assert.equal(receipt.card.cardId,newId);assert.equal(receipt.card.rank,rank);assert.equal(receipt.uiAcknowledged,false);
  assert.equal(owned.length,1);assert.equal(owned[0].cardId,newId);assert.equal(owned[0].rank,rank);
  assert.deepEqual(drawSkillCard(r,'flight',node),{instanceId,cardId:newId,rank});
  const before=JSON.stringify(r);assert.deepEqual(reload(state).run,r);assert.equal(JSON.stringify(r),before);
 }
});

test('retired Rares never drop and verified camp Improve reaches their exact former payouts',()=>{
 const state=fresh(['body-spark']),r=state.run,retired=new Set(['courier-tip-ii','downbeat-ii','toll-bell-ii']);
 for(let seed=0;seed<500;seed++)assert.ok(!retired.has(drawSkillCard({...r,seed:`retired-pool:${seed}`},'flight',{id:`drop:${seed}`},'rare').cardId));
 const camp=r.map.flat().find(node=>node.kind==='camp'),path=[camp];let cursor=camp;
 while(cursor.row>0){cursor=r.map[cursor.row-1].find(node=>node.nextIds.includes(cursor.id));assert.ok(cursor);path.unshift(cursor);}
 for(const node of path){assert.ok(M.selectNode(r,node.id));if(node===camp)break;
  if(node.type==='support')assert.ok(M.resolveSupport(r,M.getSupportChoices(r).findIndex(choice=>!choice.disabled),state.profile));
  else{clearSelected(state);M.settleCheckpoint(state);acknowledge(state);}
 }
 r.condensedGlow=100;
 for(const [id,expected]of [['courier-tip',3],['downbeat',3],['toll-bell',4]]){
  const card=makeSkillCard(id,`improve:${id}`);r.reserveCards.push(card);const quote=M.getCardImprovePreview(r,card.instanceId);
  assert.equal(quote.kind,'rank');assert.equal(quote.price,15);assert.equal(quote.after.amount,expected);
  assert.ok(M.improveOwnedCard(state,card.instanceId,1,quote.token));assert.equal(card.rank,2);assert.equal(card.cardId,id);
  assert.equal(M.improveOwnedCard(state,card.instanceId,1,quote.token),false);
 }
});

test('Deck readiness recognizes clear economy, permanent gains and one shared replay without mutation',()=>{
 for(const ids of [['growth-ring','wind-feather','refrain'],['nest-egg','wayfarers-purse','refrain']]){
  const run=fresh(ids).run,before=JSON.stringify(run);assert.ok(getEquippedCardStatuses(run).filter(Boolean).every(status=>status.state==='ready'));
  assert.equal(JSON.stringify(run),before);
 }
 const state=fresh();state.profile.cardFutureCapacity=-2;state.profile.cardCruisingSpeed=50;
 state.run.cardFutureCapacity=NaN;state.run.cardClearReceipts=[{version:2,runId:state.run.id,event:{kind:'flight-clear'},futureCapacity:-1}];
 const saved=reload(state);assert.equal(saved.profile.cardFutureCapacity,0);assert.equal(saved.profile.cardCruisingSpeed,6);assert.equal(saved.run.cardClearReceipts.length,0);
});
