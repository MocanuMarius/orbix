import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,startTutorial,leaveTutorial,getRunModifiers,getChoices,selectNode,beginFlightAttempt,finishFlight,retryFlight,resolveSupport,isCardRun} from '../dist/model.mjs';
import {loanPracticeCards,nextPracticeLesson,practiceCardFaces} from '../dist/practice-route.mjs';
import {WispFlight} from '../dist/flight.mjs';

const canvas={style:{},getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
test('the route uses real Rhythm wave crossings and Harvest payouts without making practice a campaign card run',()=>{
 const state=newState();state.run=createRun(state.profile,'protected-card-game',1,{cards:true});
 const campaign=structuredClone(state.run),profile=structuredClone(state.profile);startTutorial(state,{edition:3});
 const r=state.run;loanPracticeCards(r,['lift-guide','rhythm','harvest-common']);
 assert.equal(isCardRun(r),false);assert.deepEqual(practiceCardFaces(r).map(c=>c.cardId),['lift-guide','rhythm','harvest-common']);
 const e=new WispFlight({canvas,preflight:true,node:r.map[4][0],duration:26,flame:100,companions:['collector'],modifiers:getRunModifiers(r)});
 try{
  e.running=true;
  for(let i=0;i<3;i++){
   assert.ok(e.beginLiftInput());e.endLiftInput();
   for(let j=0;j<48;j++)e.step(1/60);
  }
  assert.equal(e.cardRhythm.waves,1);assert.equal(e.cardRowTrace.event.kind,'wave-crossing');
  assert.equal(e.cardRowTrace.restoredSparks,1);assert.equal(e.tutorial.harvestPaid,true);
  assert.equal(e.dying,false);assert.equal(e.bodyPickups,0,'the payout precedes direct collection');
  r.guideSeen={'practice:rhythm':true,'practice:wave':true};
  assert.equal(nextPracticeLesson(e,r).id,'practice:harvest','the observed payout remains teachable after the trace changes');
 }finally{e.destroy();}
 leaveTutorial(state);assert.deepEqual(state.run,campaign);
 assert.equal(state.profile.cardFutureCapacity,profile.cardFutureCapacity);
 assert.deepEqual(state.profile.stats,profile.stats);
});

test('old practice restarts into the seven Edition 4 stops while its suspended run and New Game continuation survive',()=>{
 const state=newState();state.run=createRun(state.profile,'resume-me',1,{cards:true});startTutorial(state,{forNewGame:true,difficulty:2});
 const suspended=structuredClone(state.suspendedRun);state.run.tutorialEdition=2;
 const oldId=state.run.id;assert.ok(startTutorial(state));
 assert.notEqual(state.run.id,oldId);assert.equal(state.run.tutorialEdition,4);assert.equal(state.run.map.length,7);
 assert.deepEqual(state.run.tutorialContinuation,{difficulty:2});assert.deepEqual(state.suspendedRun,suspended);
 assert.equal(startTutorial(state),false,'current practice continues');
});

test('an unfinished Edition 3 practice continues as Edition 3; Practice again starts Edition 4',()=>{
 const state=newState();state.run=createRun(state.profile,'resume-me',1,{cards:true});startTutorial(state,{forNewGame:true,difficulty:1,edition:3});
 const saved=structuredClone(state.run),suspended=structuredClone(state.suspendedRun);
 assert.equal(startTutorial(state),false,'Tutorial or reload keeps the Edition 3 run');assert.deepEqual(state.run,saved);
 assert.deepEqual(state.run.map.map(row=>row[0].tutorialLesson||row[0].kind),['glide','treasure','proximity','camp','rhythm','black-hole','guardian']);
 leaveTutorial(state);assert.deepEqual(state.run,suspended);
 assert.ok(startTutorial(state));assert.equal(state.run.tutorialEdition,4);
});

test('practice failures restore the entrance indefinitely and never spend real cards or hearts',()=>{
 const state=newState();startTutorial(state);const r=state.run;selectNode(r,getChoices(r)[0].id);
 for(let attempt=0;attempt<5;attempt++){
  if(r.phase==='retry')assert.ok(retryFlight(r));
  assert.ok(beginFlightAttempt(r));assert.ok(finishFlight(r,{success:false,flame:0,cardFutureCapacity:999,cardCharges:{}}));
  assert.equal(r.lives,3);assert.equal(r.flame,100);assert.equal(r.phase,'retry');
  assert.deepEqual(r.practiceCards,[],'Edition 4 lends no cards before the camp');
 }
});

test('Flash is a real collectible in the Luminance course and the finish',()=>{
 const state=newState();startTutorial(state);
 for(const row of [2,6]){
  state.run.current=state.run.map[row][0];
  const e=new WispFlight({canvas,preflight:true,node:state.run.map[row][0],duration:state.run.map[row][0].duration,flame:100,modifiers:getRunModifiers(state.run)});
  try{assert.ok(e.layout.embers.some(p=>p.kind==='sight'&&!p.collected));}finally{e.destroy();}
 }
});
