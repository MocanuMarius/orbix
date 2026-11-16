import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CARD_UNIT, CARD_ROW_EVENTS, makeSkillCard, createCardExecution, resolveCardRow, previewCardRow} from '../dist/skill-cards.mjs';
import {getGlowCapacity, formatGlow} from '../dist/vitality.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {cardVictoryRecap,starterCardsMarkup} from '../dist/card-ui.mjs';
import {WispFlight} from '../dist/flight.mjs';

globalThis.requestAnimationFrame=()=>null;globalThis.cancelAnimationFrame=()=>{};

const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
const row = ids => ids.map((id,i)=>id ? makeSkillCard(id,`future:${i}`) : null);
function fresh(ids=['trail-vessel'], profile=null, cards=true) {
  const state=M.newState();if(profile)state.profile=structuredClone(profile);
  state.profile.tutorialComplete=true;
  state.run=M.createRun(state.profile,'future-normal-route',1,{cards});
  assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id));
  if(cards){
    state.run.reserveCards.push(...state.run.mountedCards.filter(Boolean));
    state.run.cardSlots=Math.max(3,ids.length);
    state.run.mountedCards=Array.from({length:state.run.cardSlots},(_,i)=>row(ids)[i]||null);
  }
  return state;
}
function acknowledge(state) {
  const r=state.run;
  if(r.cardReward)r.cardReward.uiAcknowledged=true;
  if(r.flightReward&&!r.flightReward.claimed){
    if(r.flightReward.offers.length)assert.ok(M.chooseFlightReward(state,r.flightReward.offers[0]));
    else r.flightReward.claimed=true;
  }
  assert.ok(M.acknowledgeVictory(state));
}
function selectNext(state) {
  const r=state.run;
  if(r.phase==='map-clear')assert.ok(M.advanceMap(r));
  const choices=M.getChoices(r),n=choices.find(n=>n.type!=='support'&&!n.elite)||choices[0];
  assert.ok(n);assert.ok(M.selectNode(r,n.id));return n;
}
function clearSelected(state,result={}) {
  const r=state.run;
  if(r.phase==='support'){
    const choices=M.getSupportChoices(r,state.profile);
    const i=choices.findIndex(c=>!c.disabled&&(c.id==='rest-continue'||c.effect?.rest==='recover'||c.effect?.restContinue));
    assert.ok(M.resolveSupport(r,i>=0?i:choices.findIndex(c=>!c.disabled),state.profile));
    return;
  }
  assert.ok(M.beginFlightAttempt(r));assert.ok(M.markFlightAttemptStarted(r));
  assert.ok(M.finishFlight(r,{success:true,flame:50,collected:4,boss:r.current.boss?{id:r.current.bossId,defeated:true}:null,...result}));
}
function approachFinal(state) {
  for(let visits=0;visits<80;visits++){
    const n=selectNext(state);
    if(n.boss&&state.run.mapIndex===2)return n;
    clearSelected(state);M.settleCheckpoint(state);acknowledge(state);
  }
  assert.fail('ordinary connected route never reached its final guardian');
}
function reload(state){let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};assert.ok(M.saveState(state,storage));return M.loadState(storage);}

test('future capacity is a separate integer subtotal with ordinary copy, order and one shared replay',()=>{
  for(const [ids,gain]of [
    [['trail-vessel'],1],[['echo','trail-vessel'],2],[['chameleon','trail-vessel'],2],
    [['echo-iii','trail-vessel'],4],[['trail-vessel','refrain'],2],
    [['bellows-seal','trail-vessel'],1],[['trail-vessel','bellows-seal'],2],
    [['echo-iii','trail-vessel','bellows-seal','refrain'],16],
    [['trail-vessel','prism-lens','kindling-bead','mirror-grain','second-sun'],1],
  ]){
    const runtime=createCardExecution(row(ids)),before=JSON.stringify(runtime),predicted=previewCardRow(runtime,{kind:CARD_ROW_EVENTS.victory});
    assert.equal(JSON.stringify(runtime),before,'preview is read-only');
    const receipt=resolveCardRow(runtime,{kind:CARD_ROW_EVENTS.victory});
    assert.deepEqual(receipt,predicted);assert.equal(receipt.futureCapacity,gain,ids.join(','));assert.equal(receipt.sparks,0);
    assert.ok(Object.isFrozen(receipt));assert.ok(receipt.steps.every(Object.isFrozen));assert.ok(receipt.passes<=2);
  }
  const before=previewCardRow(row(['bellows-seal','trail-vessel']),{kind:CARD_ROW_EVENTS.victory});
  assert.equal(before.charges['future:0'],2,'doubling zero never spends a use');
  const repeated=resolveCardRow(createCardExecution(row(['trail-vessel','bellows-seal','refrain'])),{kind:CARD_ROW_EVENTS.victory});
  assert.equal(repeated.futureCapacity,4);assert.equal(repeated.charges['future:1'],0);
});

test('ordinary model route awards only the final win, before acknowledgement, exactly once across reload and bank',()=>{
  let state=fresh(['echo','trail-vessel','bellows-seal']);const opening=getGlowCapacity(state.run);
  approachFinal(state);assert.equal(state.profile.cardFutureCapacity,0);assert.equal(state.run.cardVictoryReceipt,undefined);
  clearSelected(state);const receipt=state.run.cardVictoryReceipt;
  assert.equal(receipt.futureCapacity,4);assert.equal(receipt.sources.length,3);assert.equal(receipt.charges['future:2'],1);
  assert.ok(Object.isFrozen(receipt));assert.equal(state.profile.cardFutureCapacity,0);
  M.settleCheckpoint(state);assert.equal(state.profile.cardFutureCapacity,4);assert.equal(state.run.bossProgressSecured,true);
  assert.equal(getGlowCapacity(state.run),opening,'current winning expedition never adopts its future award');
  state=reload(state);assert.equal(state.profile.cardFutureCapacity,4);assert.ok(Object.isFrozen(state.run.cardVictoryReceipt));
  M.settleCheckpoint(state);assert.equal(state.profile.cardFutureCapacity,4);
  acknowledge(state);assert.equal(M.bankRun(state),false,'load already banked this ended run');
  state=reload(state);assert.equal(state.profile.cardFutureCapacity,4);
  const next=M.createRun(state.profile,'next-full',1,{cards:true});assert.equal(formatGlow(getGlowCapacity(next)),'34');near(next.flame,100+4*CARD_UNIT);
  assert.equal(next.flame,getGlowCapacity(next));assert.equal(state.run.cardFutureCapacity,0);
  assert.match(starterCardsMarkup(next,M.getStartingGiftOffers(next),false),/\+4 permanent maximum Sparks · starting full at 34\/34/);
  const html=cardVictoryRecap(state.run);assert.match(html,/\+4 maximum Sparks for future expeditions/);assert.match(html,/through Echo/);assert.match(html,/doubles 2 → 4/);
  assert.match(html,/next expedition starts full at 34 maximum Sparks/);
});

test('an unsettled real win settles on load and exhausted Bellows stays in the saved winning hand',()=>{
  let state=fresh(['trail-vessel','bellows-seal','refrain']);approachFinal(state);clearSelected(state);
  assert.equal(state.run.mountedCards[1],null);assert.equal(state.run.winningHand[1].cardId,'bellows-seal');
  assert.equal(state.run.cardReward.uiAcknowledged,undefined);
  state=reload(state);assert.equal(state.profile.cardFutureCapacity,4);assert.equal(state.run.banked,true);
  assert.match(cardVictoryRecap(state.run),/Bellows Seal/);assert.match(cardVictoryRecap(state.run),/on the shared replay/);
  acknowledge(state);M.bankRun(state);state=reload(state);assert.equal(state.profile.cardFutureCapacity,4);
});

test('one displayed point is retained for each later expedition and two real wins accumulate',()=>{
  let state=fresh();const oldActive=M.createRun(state.profile,'older-active',1,{cards:true});
  for(let win=1;win<=2;win++){
    approachFinal(state);clearSelected(state);M.settleCheckpoint(state);acknowledge(state);M.bankRun(state);
    assert.equal(state.profile.cardFutureCapacity,win);
    const next=fresh(['trail-vessel'],state.profile);assert.equal(formatGlow(getGlowCapacity(next.run)),String(30+win));near(next.run.flame,getGlowCapacity(next.run));
    state=next;
  }
  assert.equal(formatGlow(getGlowCapacity(oldActive)),'30');
  assert.equal(formatGlow(getGlowCapacity(M.createRun(state.profile,'legacy-unaffected'))),'30');
  assert.ok(M.startTutorial(state));assert.equal(formatGlow(getGlowCapacity(state.run)),'30');
});

test('failed and abandoned runs, TEST, Dream, legacy and a hand without Trail Vessel never earn capacity',()=>{
  for(const variant of ['failure','abandon','test','dream','legacy','no-vessel']){
    const state=fresh(variant==='no-vessel'?['body-spark']:['trail-vessel'],null,variant!=='legacy');
    if(variant==='test')state.run.testMode=true;
    approachFinal(state);
    if(variant==='abandon')assert.ok(M.abandonRun(state));
    else clearSelected(state,{success:variant!=='failure',dreamAttempt:variant==='dream'});
    M.settleCheckpoint(state);assert.equal(state.profile.cardFutureCapacity,0,variant);
    assert.equal(state.run.cardVictoryReceipt?.futureCapacity||0,0,variant);
  }
});

test('old missing or invalid profile/snapshot fields are zero, with no old-completion retrocredit or gameplay cap',()=>{
  for(const value of [undefined,null,-1,1.2,'3',Infinity,NaN]){
    const state=M.newState();state.profile.cardFutureCapacity=value;
    const run=M.createRun(state.profile,'sanitize',1,{cards:true});assert.equal(run.cardFutureCapacity,0);assert.equal(formatGlow(run.flame),'30');
    state.run=run;delete state.run.cardFutureCapacity;const loaded=reload(state);assert.equal(loaded.run.cardFutureCapacity,0);assert.equal(loaded.profile.cardFutureCapacity,0);
  }
  const state=fresh();approachFinal(state);clearSelected(state);delete state.run.cardVictoryReceipt;
  const old=reload(state);assert.equal(old.profile.cardFutureCapacity,0);assert.equal(old.run.bossProgressSecured,true);
  const profile={...M.newState().profile,cardFutureCapacity:100000};assert.equal(M.createRun(profile,'no-balance-cap',1,{cards:true}).cardFutureCapacity,100000);
});

test('real final-flight charge reconciliation precedes victory and removes exhausted cards',()=>{
  const state=fresh(['trail-vessel','body-spark','wick-doubler']);approachFinal(state);
  const r=state.run;assert.ok(M.beginFlightAttempt(r));assert.ok(M.markFlightAttemptStarted(r));
  let finished=null;
  const e=new WispFlight({preflight:true,seed:`${r.seed}-${r.current.id}`,node:r.current,boss:true,bossId:r.current.bossId,
    modifiers:M.getRunModifiers(r),flame:r.flame,onFinish:result=>{finished=result;assert.ok(M.finishFlight(r,result));},
    canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})}});
  try{
    e.running=true;e.render=()=>{};e.notify=()=>{};
    for(let i=0;i<3;i++){e.flame=0;e.collect({kind:'light'});}
    assert.equal(e.getState().cardCharges['future:2'],0);e.finish(true);
    for(let i=0;i<180&&!finished;i++)e.step(1/60);
    assert.ok(finished?.success);assert.equal(finished.boss.defeated,true);
    const receipt=r.cardVictoryReceipt;assert.equal(receipt.futureCapacity,1);
    assert.equal(receipt.sources.some(source=>source.cardId==='wick-doubler'),false);
    assert.ok(r.lastFlight.consumedCards.includes('future:2'));assert.equal(r.mountedCards[2],null);
    M.settleCheckpoint(state);assert.equal(state.profile.cardFutureCapacity,1);
  }finally{e.destroy();}
});

test('Deck readiness understands victory capacity and reel payoffs without awarding or spending them',()=>{
  for(const [ids,want]of [
    [['trail-vessel','bellows-seal','refrain'],['ready','ready','ready']],
    [['bellows-seal','trail-vessel'],['blocked','ready']],
    [['fast-spool','refrain'],['ready','ready']],
    [['return-spring','haul-winch','refrain'],['ready','ready','ready']],
  ]){
    const state=fresh(ids),before=JSON.stringify(state);assert.deepEqual(getEquippedCardStatuses(state.run).filter(Boolean).map(status=>status.state),want);
    assert.equal(JSON.stringify(state),before);
  }
});
