import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {CARD_UNIT,makeSkillCard,cleanCardRun,getMountedCards,getCardChargeCapacity,
  getCardFeederCapacity,getCardCapacityBonus,getUseDoublerTarget,getEmberFeederTargets,
  createCardExecution,previewCardRow,resolveCardRow} from '../dist/skill-cards.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {sparkBodyRadius} from '../dist/spark-size.mjs';

globalThis.requestAnimationFrame=()=>null;
globalThis.cancelAnimationFrame=()=>{};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fresh(ids){
  const state=M.newState();state.profile.tutorialComplete=true;
  const run=state.run=M.createRun(state.profile,'physical-chain-cards',1,{cards:true});
  assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(run)[0].id));
  run.cardSlots=Math.max(3,ids.length);run.reserveCards=[];
  run.mountedCards=Array.from({length:run.cardSlots},(_,i)=>ids[i]?makeSkillCard(ids[i],`chain:${i}`):null);
  run.condensedGlow=200;return state;
}
function select(run){
  const node=M.getChoices(run).find(n=>n.type!=='support'&&!n.elite);
  assert.ok(node);assert.ok(M.selectNode(run,node.id));return node;
}
function begin(run){select(run);assert.ok(M.beginFlightAttempt(run));}
function clear(state,result={}){
  begin(state.run);assert.ok(M.markFlightAttemptStarted(state.run));
  assert.ok(M.finishFlight(state.run,{success:true,flame:0,...result}));
}
function reload(state){
  let saved;assert.ok(M.saveState(state,{setItem:(_,value)=>{saved=value;}}));
  return M.loadState({getItem:()=>saved,setItem(){}});
}
function pausedEngine(run){
  const engine=new WispFlight({preflight:true,seed:`${run.seed}-${run.current.id}`,node:run.current,
    modifiers:{...M.getRunModifiers(run),wispCooldown:.4},companions:run.companions,
    canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})}});
  engine.running=true;engine.paused=true;engine.render=()=>{};engine.notify=()=>{};
  engine.layout.obstacles=[];engine.layout.embers=[];engine.drafts.zones=[];
  engine.biomeDynamics.items=[];engine.blackHoles.items=[];return engine;
}

test('Use Doubler grants once at actual entry and updates the already built engine ledger',()=>{
  const state=fresh(['use-doubler','spark-cache','echo']);const run=state.run;
  begin(run);const engine=pausedEngine(run);
  try{
    assert.equal(engine.getCardChargeLedger()['chain:1'],6);
    const before=structuredClone(run);
    getMountedCards(run);getEquippedCardStatuses(run);previewCardRow(run,{kind:'body-spark'});
    assert.deepEqual(run,before,'all preview paths preserve ownership and uses');
    assert.ok(M.markFlightAttemptStarted(run,engine));
    assert.equal(run.mountedCards[0],null);assert.equal(engine.cardExecution.cards[0],null);
    assert.equal(run.mountedCards[1].charges,12);assert.equal(getCardChargeCapacity(run.mountedCards[1]),12);
    assert.equal(engine.getCardChargeLedger()['chain:1'],12);assert.equal(engine.getCardChargeLedger()['chain:0'],undefined);
    assert.equal(M.markFlightAttemptStarted(run,engine),false);
    assert.equal(engine.reconcileCardLoadout({modifiers:M.getRunModifiers(run),condensedGlow:run.condensedGlow,flightEntry:true}),false);
    engine.paused=false;engine.flame=0;engine.collect({kind:'light'});
    assert.equal(engine.getCardChargeLedger()['chain:1'],11);
    engine.paused=true;assert.ok(M.syncCardFlightForEdit(run,engine));
    assert.equal(run.mountedCards[1].charges,11);assert.equal(run.mountedCards[0],null);
    assert.ok(M.moveMountedCard(run,1,2));assert.ok(M.closeCardFlightEdit(run,engine));
    assert.equal(engine.cardExecution.cards[2].charges,11);
    assert.equal(engine.getCardChargeLedger()['chain:1'],11,'ordinary reconciliation never restores the doubled ceiling');
    assert.ok(M.finishFlight(run,{success:false,cardCharges:engine.getCardChargeLedger()}));
    assert.equal(run.mountedCards[2].charges,11);assert.equal(run.mountedCards[0],null);
    const loaded=reload(state).run;
    assert.equal(loaded.mountedCards[2].charges,11);assert.equal(getCardChargeCapacity(loaded.mountedCards[2]),12);
    assert.equal(loaded.mountedCards[0],null);assert.equal(loaded.cardHistory.filter(e=>e.type==='use-doubler').length,1);
  }finally{engine.destroy();}
});

test('doubling uses the remaining count, does not refill partial cards and survives entry interruption',()=>{
  let state=fresh(['use-doubler','spark-cache']);state.run.mountedCards[1].charges=2;
  begin(state.run);assert.ok(M.markFlightAttemptStarted(state.run));
  assert.equal(state.run.mountedCards[1].charges,4);assert.equal(getCardChargeCapacity(state.run.mountedCards[1]),6);
  state=reload(state);assert.equal(state.run.mountedCards[0],null);assert.equal(state.run.mountedCards[1].charges,4);
  assert.equal(state.run.attemptActive,false);
  assert.ok(M.beginFlightAttempt(state.run));assert.ok(M.markFlightAttemptStarted(state.run));
  assert.equal(state.run.mountedCards[1].charges,4,'reload and retry cannot mint another grant');
});

test('invalid, empty, exhausted and recursive targets keep Use Doubler unspent',()=>{
  for(const ids of [['use-doubler'],['use-doubler',null,'spark-cache'],['use-doubler','body-spark'],['use-doubler','use-doubler']]){
    const state=fresh(ids);begin(state.run);assert.ok(M.markFlightAttemptStarted(state.run));
    assert.equal(state.run.mountedCards[0].cardId,'use-doubler',ids.join(','));
    assert.equal(state.run.cardHistory.filter(e=>e.type==='use-doubler').length,0);
  }
  const state=fresh(['use-doubler','spark-cache']);state.run.mountedCards[1].charges=0;
  assert.equal(getUseDoublerTarget(state.run.mountedCards,0),null);
  begin(state.run);assert.ok(M.markFlightAttemptStarted(state.run));assert.ok(state.run.mountedCards[0]);
  for(const mode of ['preview','practice','dream']){
    const sample=fresh(['use-doubler','spark-cache']);begin(sample.run);const engine=pausedEngine(sample.run);
    try{
      if(mode==='dream')engine.dream={mode:'record',phase:'recording'};else engine.options[mode]=true;
      assert.equal(M.markFlightAttemptStarted(sample.run,engine),false,mode);
      assert.equal(sample.run.mountedCards[1].charges,6);assert.ok(sample.run.mountedCards[0]);
    }finally{engine.dream=null;engine.destroy();}
  }
});

test('doubled passive range uses spend on genuine extra catches outside the numeric row',()=>{
  const state=fresh(['use-doubler','long-spool']);const run=state.run;run.companions=['collector'];
  begin(run);const engine=pausedEngine(run);
  try{
    assert.ok(M.markFlightAttemptStarted(run,engine));engine.paused=false;
    assert.equal(engine.getCardChargeLedger()['chain:1'],10);
    const pickup={id:'doubled-passive-catch',kind:'light',y:engine.player.y};
    pickup.x=engine.distance+engine.player.x-65-sparkBodyRadius(pickup,engine.height);
    engine.layout.embers.push(pickup);engine._nearbyPacketsUntil=-1;
    for(let i=0;i<2400&&!engine.wisp.cargo;i++){
      engine.time+=1/120;engine.previousDistance=engine.distance;engine.syncCollectors(true);
      for(const collector of engine.collectors)collector.update(engine,1/120);
    }
    assert.equal(engine.wisp.cargo,pickup);assert.equal(engine.getCardChargeLedger()['chain:1'],9);
    engine.paused=true;assert.ok(M.syncCardFlightForEdit(run,engine));
    assert.equal(run.mountedCards[1].charges,9);assert.equal(getCardChargeCapacity(run.mountedCards[1]),10);
  }finally{engine.destroy();}
});

test('expanded use ceilings persist through normalization and eligible paid refills',()=>{
  const state=fresh(['use-doubler','spark-cache']);clear(state);
  const run=state.run;run.mountedCards[1].charges=7;
  cleanCardRun(run);assert.equal(run.mountedCards[1].charges,7);assert.equal(getCardChargeCapacity(run.mountedCards[1]),12);
  const node=run.map.flat().find(site=>site.kind==='camp');
  Object.assign(run,{current:node,step:node.row,path:[node.id],phase:'support',victoryPending:false});
  const quote=M.getCardRefillPreview(run,'chain:1');
  assert.equal(quote.maximum,12);assert.equal(quote.missing,5);assert.equal(quote.price,7);
  assert.ok(M.refillOwnedCard(state,'chain:1',quote.token));assert.equal(run.mountedCards[1].charges,12);
  assert.equal(M.refillOwnedCard(state,'chain:1',quote.token),false);
  const restored=reload(state).run;assert.equal(restored.mountedCards[1].charges,12);
  assert.equal(getCardChargeCapacity(restored.mountedCards[1]),12);
  run.reserveCards.push({...makeSkillCard('camp-kit','one-use'),charges:2,chargeCapacity:2});
  assert.equal(M.getCardRefillPreview(run,'one-use').supported,false,'doubling cannot make a one-shot refillable');
});

test('Ember Feeder consumes two exact occupied instances atomically, keeps holes and grows only itself',()=>{
  const state=fresh(['ember-feeder',null,'tight-packing','spark-cache']);const run=state.run;
  const baseline=getGlowCapacity(run);assert.deepEqual(getEmberFeederTargets(run.mountedCards,0).map(t=>t.slot),[2,3]);
  const before=structuredClone(run);getMountedCards(run);getEquippedCardStatuses(run);
  previewCardRow(run,{kind:'flight-clear'});assert.deepEqual(run,before);
  clear(state);assert.deepEqual(run.mountedCards.map(c=>c?.cardId||null),['ember-feeder',null,null,null]);
  assert.equal(getCardFeederCapacity(run.mountedCards[0]),1);near(getGlowCapacity(run),baseline+CARD_UNIT);
  assert.equal(run.cardFutureCapacity,0,'an eaten clear card cannot also earn its clear reward');
  assert.equal(state.profile.cardFutureCapacity,0);
  const receipt=run.lastFlight.emberFeederSacrifices[0];
  assert.deepEqual(receipt.targets.map(t=>[t.instanceId,t.slot]),[['chain:2',2],['chain:3',3]]);
  assert.deepEqual(run.lastFlight.consumedCards,['chain:2','chain:3']);assert.equal(receipt.totalCapacity,1);
  assert.equal(M.finishFlight(run,{success:true}),false);assert.equal(getCardFeederCapacity(run.mountedCards[0]),1);
  const restored=reload(state);assert.equal(getCardFeederCapacity(restored.run.mountedCards[0]),1);
  M.settleCheckpoint(restored);assert.equal(restored.profile.cardFutureCapacity,0);
});

test('fewer than two targets, failed flights and Dream never consume a partial meal',()=>{
  for(const ids of [['ember-feeder'],['ember-feeder','spark-cache'],['ember-feeder',null,'tight-packing']]){
    const state=fresh(ids),expected=state.run.mountedCards.map(c=>c?.instanceId||null);
    clear(state);assert.deepEqual(state.run.mountedCards.map(c=>c?.instanceId||null),expected);
    assert.equal(getCardFeederCapacity(state.run.mountedCards[0]),0);assert.equal(state.run.lastFlight.emberFeederSacrifices,undefined);
  }
  for(const result of [{success:false},{success:true,dreamAttempt:true}]){
    const state=fresh(['ember-feeder','tight-packing','spark-cache']),expected=structuredClone(state.run.mountedCards);
    clear(state,result);assert.deepEqual(state.run.mountedCards,expected);
  }
  const state=fresh(['ember-feeder','spark-cache','tight-packing']);
  clear(state,{cardCharges:{'chain:1':0}});
  assert.equal(state.run.mountedCards[1],null);assert.equal(state.run.mountedCards[2].cardId,'tight-packing');
  assert.equal(getCardFeederCapacity(state.run.mountedCards[0]),0,'a card exhausted during flight cannot count as food');
});

test('growth follows the feeder instance through duplicate swaps, saves, unequipping and melting without refilling',()=>{
  let state=fresh(['ember-feeder','ember-feeder','body-spark']);const run=state.run;
  run.mountedCards[0].fedCapacity=3;run.mountedCards[1].fedCapacity=7;run.flame=10;
  near(getCardCapacityBonus(run),10*CARD_UNIT);
  assert.ok(M.moveMountedCard(run,0,1));assert.equal(getCardFeederCapacity(run.mountedCards[0]),7);
  assert.ok(M.unequipMountedCard(run,0,'chain:1'));near(getCardCapacityBonus(run),3*CARD_UNIT);assert.equal(run.flame,10);
  assert.ok(M.equipOwnedCard(run,'chain:1',0));near(getCardCapacityBonus(run),10*CARD_UNIT);assert.equal(run.flame,10);
  state=reload(state);assert.equal(getCardFeederCapacity(state.run.mountedCards[0]),7);
  assert.equal(getCardFeederCapacity(state.run.mountedCards[1]),3);assert.equal(state.run.flame,10);
  const quote=M.getCardMeltPreview(state.run,['chain:1']);assert.ok(M.meltOwnedCards(state,['chain:1'],quote.token));
  near(getCardCapacityBonus(state.run),3*CARD_UNIT);assert.equal(state.run.flame,10);
  assert.equal(state.profile.cardFutureCapacity,0);
});

test('physical consumers resolve safely left to right, including a feeder or Devourer being eaten first',()=>{
  for(const [ids,lives,survivors,grown,healed] of [
    [['devourer','ember-feeder','tight-packing','body-spark'],1,['devourer',null,'tight-packing','body-spark'],0,1],
    [['ember-feeder','devourer','echo-ii','body-spark'],1,['ember-feeder',null,null,'body-spark'],1,0],
    [['ember-feeder','ember-feeder','body-spark','tight-packing'],1,['ember-feeder',null,null,'tight-packing'],1,0],
    [['ember-feeder','body-spark','tight-packing','devourer','echo-ii'],1,['ember-feeder',null,null,'devourer',null],1,1],
  ]){
    const state=fresh(ids);state.run.lives=lives;clear(state);
    assert.deepEqual(state.run.mountedCards.map(c=>c?.cardId||null),survivors,ids.join(','));
    assert.equal(state.run.mountedCards.reduce((sum,c)=>sum+getCardFeederCapacity(c),0),grown);
    assert.equal(state.run.lives,lives+healed);assert.equal(state.run.lastFlight.emberFeederSacrifices?.length||0,grown);
  }
});

test('neither new physical action is copyable or replayable; statuses name exact consequences',()=>{
  const state=fresh(['echo-iii','ember-feeder','spark-cache','refrain','tight-packing']);
  const before=structuredClone(state.run.mountedCards),runtime=createCardExecution(before);
  resolveCardRow(runtime,{kind:'flight-clear'});assert.deepEqual(runtime.cards,before);
  const printed=getMountedCards(state.run),status=getEquippedCardStatuses(state.run);
  // Plain status instructions and the approved face wording (v1.0-cardtext).
  assert.equal(status[0].state,'blocked');assert.match(status[1].reason,/Pocket Sparks in Slot 3 and Refrain in Slot 4/);
  assert.match(printed[1].effect,/Eats the next 2 cards/);assert.match(printed[1].effectiveSummary,/Stored growth \+0 maximum Sparks/);assert.match(printed[1].effectiveSummary,/permanently consume/);
  const doubler=fresh(['echo','use-doubler','spark-cache']),dstatus=getEquippedCardStatuses(doubler.run);
  assert.equal(dstatus[0].state,'blocked');assert.match(dstatus[1].reason,/Pocket Sparks in Slot 3 goes from 6 to 12/);
  assert.match(getMountedCards(doubler.run)[1].effectiveSummary,/6 → 12 remaining uses/);
});
