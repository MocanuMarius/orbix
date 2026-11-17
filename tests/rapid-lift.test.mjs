import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {CARD_SYSTEM,makeSkillCard,getCardModifiers,describeSkillCard,drawSkillCard} from '../dist/skill-cards.mjs';
import {projectedLiftCost} from '../dist/flight-projection.mjs';

function flight(ids=['double-lift']){
  const mod=getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:ids.map((id,i)=>makeSkillCard(id,`rapid:${i}`))});
  const e=new WispFlight({preflight:true,seed:'rapid-lift',modifiers:mod,
    canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})}});
  e.running=true;let at=0;e.fourthBeatNow=()=>at;
  const tap=time=>{at=time;const accepted=e.beginLiftInput();e.endLiftInput();return accepted;};
  return {e,tap,clock:time=>{at=time;}};
}

test('Common Double Lift pays once per successful manual pair, including the exact one-second boundary',()=>{
  const {e,tap}=flight();e.flame=e.flapCost;
  assert.ok(tap(0));assert.equal(e.flame,0);assert.equal(e.nextLiftCost,0);
  assert.ok(tap(1));assert.equal(e.flaps,2);assert.equal(e.fourthBeat.count,0);
  assert.equal(tap(1.01),false);assert.equal(e.fourthBeat.count,0);
  assert.equal(e.luminanceWaves.waves.length,0);
  assert.match(describeSkillCard(makeSkillCard('double-lift','common')).effect,/second.*free/i);
  e.destroy();
});

test('Rare Climb makes both follow-ups free and emits one shared card pulse on the third',()=>{
  const {e,tap}=flight(['double-lift','climb','climb']);e.flame=e.flapCost;
  assert.equal(e.mod.cardRapidLiftRank,2);
  assert.ok(tap(0));assert.ok(tap(.4));assert.equal(e.luminanceWaves.waves.length,0);
  assert.equal(e.fourthBeat.count,2);assert.equal(e.getState().flapCost,0);
  assert.ok(tap(1));assert.equal(e.effortSpent,e.flapCost);assert.equal(e.flame,0);
  assert.equal(e.luminanceWaves.waves.length,1);
  assert.equal(e.luminanceWaves.waves[0].source,'card-climb');
  assert.equal(e.luminanceWaves.waves[0].sourceKind,'card');
  assert.equal(e.luminanceWaves.waves[0].reveal,true);
  assert.equal(e.luminanceWaves.sources.size,0);assert.equal(tap(1.01),false);
  e.destroy();
});

test('Climb expires as a whole phrase; a free second Lift cannot roll into an endless free chain',()=>{
  const {e,tap,clock}=flight(['climb']);e.flame=e.flapCost*3;
  assert.ok(tap(0));assert.ok(tap(.7));
  const before=e.flame;clock(1.00001);
  assert.equal(e.nextLiftCost,e.flapCost);assert.equal(e.fourthBeat.count,0);
  assert.ok(tap(1.4));assert.equal(e.flame,before-e.flapCost);
  assert.equal(e.luminanceWaves.waves.length,0);
  assert.ok(tap(1.5));assert.ok(tap(1.6));assert.equal(e.luminanceWaves.waves.length,1);
  e.destroy();
});

test('rejected inputs, held inputs, pauses, Dream and automatic bounces cannot fabricate a rapid phrase',()=>{
  const {e,tap}=flight(['climb']);e.flame=0;
  assert.equal(tap(0),false);assert.equal(e.fourthBeat.count,0);
  e.flame=e.flapCost;e.artifactEffects.freeLift=true;
  assert.ok(tap(.1));assert.equal(e.fourthBeat.count,1,'a real stored free manual Lift still counts');
  assert.ok(tap(.2));e.pause();assert.equal(e.fourthBeat.count,0);e.paused=false;
  e.dream={freeGlow:true,active:true,phase:'recording'};
  for(const t of [.3,.4,.5])assert.ok(tap(t));
  assert.equal(e.fourthBeat.count,0);assert.equal(e.luminanceWaves.waves.length,0);
  e.dream=null;assert.ok(e.beginLiftInput());assert.equal(e.beginLiftInput(),false);
  assert.equal(e.fourthBeat.count,1);e.endLiftInput(true);assert.equal(e.fourthBeat.count,0);
  e.mod.cardSpringboard=true;e.player.vy=100;e.collect({kind:'light'});
  assert.equal(e.fourthBeat.count,0);e.destroy();
});

test('free rapid Lifts preserve stored free Lifts and boons; previews never mutate the real phrase',()=>{
  const {e,tap,clock}=flight(['climb']);assert.ok(tap(0));
  e.artifactEffects.freeLift=true;e.flightBoon.giftLifts=1;e.flame=0;clock(.4);
  assert.equal(projectedLiftCost(e,0),0);assert.deepEqual(e.fourthBeatTaps,[0]);
  assert.ok(tap(.4));assert.ok(tap(.8));
  assert.equal(e.artifactEffects.freeLift,true);assert.equal(e.flightBoon.giftLifts,1);
  assert.ok(tap(.9));assert.equal(e.artifactEffects.freeLift,false);assert.equal(e.flightBoon.giftLifts,1);
  e.destroy();
});

test('Double Lift evolves into Climb at Rest and preserves instance identity through saves',()=>{
  const state=M.newState(),r=state.run=M.createRun(state.profile,'rapid-evolution',1,{cards:true});
  r.current=r.map[4][0];r.step=4;r.path=[r.current.id];r.phase='support';r.condensedGlow=100;
  r.mountedCards=[makeSkillCard('double-lift','stable-rapid')];
  const q=M.getCardImprovePreview(r,'stable-rapid');
  assert.equal(q.kind,'evolution');assert.equal(q.after.cardId,'climb');assert.equal(q.price,25);
  assert.ok(M.improveOwnedCard(state,'stable-rapid',1,q.token));
  assert.deepEqual(r.mountedCards[0],{instanceId:'stable-rapid',cardId:'climb',rank:1});
  let data;assert.ok(M.saveState(state,{setItem:(_,text)=>{data=text;}}));
  const loaded=M.loadState({getItem:()=>data,setItem(){}}).run;
  assert.equal(M.getRunModifiers(loaded).cardRapidLiftRank,2);
  assert.equal(loaded.mountedCards[0].instanceId,'stable-rapid');
  const seen=new Set();
  for(let i=0;i<1000;i++){
    seen.add(drawSkillCard({campaignSeed:`rapid:${i}`,mapIndex:0},'reward',{id:'node'}).cardId);
    seen.add(drawSkillCard({campaignSeed:`rapid:${i}`,mapIndex:0},'forge',{id:'node'},'rare').cardId);
  }
  assert.ok(seen.has('double-lift'));assert.ok(seen.has('climb'));
});
