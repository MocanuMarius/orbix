import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight,circleHitsObstacle} from '../dist/flight.mjs';
import {obstacleEdgeClearance} from '../dist/edging-pulse.mjs';
import {demonstratedTutorialTopics,getTutorialHint} from '../dist/tutorial.mjs';
import {checkpointTutorialLesson} from '../dist/tutorial-steps.mjs';
import {resetOnboarding} from '../dist/onboarding.mjs';
import {treasureView} from '../dist/treasure-view.mjs';

const storage=()=>{let data;return {setItem:(_,v)=>{data=v},getItem:()=>data};};
function makeFlight(lesson,{height=430,skills={}}={}){
 const state=M.newState();M.startTutorial(state);
 const node=state.run.map.flat().find(n=>n.tutorialLesson===lesson);
 const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const canvas={width:900,height,style:{},getContext:()=>context,getBoundingClientRect:()=>({width:900,height})};
 const run={...state.run,skills:{...state.run.skills,...skills}};
 const e=new WispFlight({canvas,node,seed:'prologue-mechanics',terrain:node.terrain,duration:node.duration,
  flame:100,companions:['collector'],skills:run.skills,modifiers:M.getRunModifiers(run)});
 return e;
}

test('New Game gates the prologue only when requested and retains its continuation through reload',()=>{
 const s=M.newState();assert.equal(M.shouldStartTutorial(s),true);
 s.run=M.createRun(s.profile,'saved-campaign');const original=structuredClone(s.run);
 assert.ok(M.startTutorial(s,{forNewGame:true,difficulty:1}));
 const store=storage();M.saveState(s,store);const loaded=M.loadState(store);
 assert.equal(loaded.run.isTutorial,true);assert.deepEqual(loaded.run.tutorialContinuation,{difficulty:1});
 assert.deepEqual(loaded.suspendedRun,original);
 assert.ok(M.leaveTutorial(loaded));assert.deepEqual(loaded.run,original);
 assert.equal(loaded.profile.tutorialComplete,false,'leaving is not completing');
 assert.ok(M.startTutorial(loaded));assert.equal(loaded.run.tutorialContinuation,undefined,'explicit replay never requests a new campaign');
 M.leaveTutorial(loaded,{remember:true});assert.equal(M.shouldStartTutorial(loaded),false);
 resetOnboarding(loaded.profile);assert.equal(M.shouldStartTutorial(loaded),true);
 loaded.settings.skipTutorial=true;assert.equal(M.shouldStartTutorial(loaded),false);
});

test('unlimited practice failures restore the exact entrance fuel, wallet, skill and artifact state',()=>{
 const s=M.newState();M.startTutorial(s);const r=s.run;
 M.selectNode(r,M.getChoices(r)[0].id);
 r.practiceCondensedGlow=91;r.artifacts=['glow-wick'];r.artifactCharges={'glow-wick':3};r.skills['main-efficiency']=1;
 const before={flame:r.flame,wallet:r.practiceCondensedGlow,skills:{...r.skills},charges:{...r.artifactCharges},lives:r.lives};
 for(let i=0;i<12;i++){
  if(i)assert.ok(M.retryFlight(r));assert.ok(M.beginFlightAttempt(r));
  r.practiceCondensedGlow=2;r.skills['main-speed']=1;r.artifactCharges['glow-wick']=0;
  assert.ok(M.finishFlight(r,{success:false,flame:0,condensedGlow:99}));
  assert.equal(r.phase,'retry');assert.equal(r.deathPending,false);assert.equal(r.current.id,'practice-glide');
  assert.deepEqual({flame:r.flame,wallet:r.practiceCondensedGlow,skills:r.skills,charges:r.artifactCharges,lives:r.lives},before);
 }
 const store=storage();M.saveState(s,store);const loaded=M.loadState(store);
 assert.equal(loaded.run.phase,'retry');assert.equal(loaded.run.lives,before.lives);
});

test('the first flight uses body pickups and the real returning Collector',()=>{
 const e=makeFlight('glide');e.running=true;
 assert.equal(e.drafts.zones.length,0);assert.equal(e.blackHoles.items.length,0);
 assert.ok(e.layout.embers.some(p=>p.feature==='practice-direct'));
 assert.ok(e.layout.embers.some(p=>p.feature==='practice-carrier'));
 assert.ok(e.flap());e.flame=40;
 const direct=e.layout.embers[0];e.collect(direct);
 assert.equal(e.tutorial.directPickups,1);assert.ok(e.flame>40);
 const packet=e.layout.embers[1];packet.x=e.distance+e.player.x-45;packet.y=e.player.y+22;
 e._nearbyPacketsUntil=-1;
 const attachmentMargin=2,integrationMargin=.2;
 const deliveryFrames=Math.ceil((attachmentMargin+e.wisp.recoveryDuration(e)+integrationMargin)*60);
 let sawReel=false;
 for(let i=0;i<deliveryFrames&&!e.tutorial.carrierDeliveries&&!e.dying;i++){
  e.player.y=e.height*.5;e.player.vy=0;e.step(1/60);
  sawReel||=e.wisp.phase==='returning'&&e.wisp.cargo===packet;
 }
 assert.equal(packet.deliveredByWisp,true);assert.ok(e.tutorial.carrierDeliveries>0);
 assert.ok(sawReel);assert.equal(e.tutorial.carrierDeliveries,1);
 assert.ok(demonstratedTutorialTopics(e).includes('collector'));e.destroy();
});

test('the borrowed Proximity skill charges from safe real terrain and surplus packs automatically',()=>{
 for(const height of [320,430,620]){
  const e=makeFlight('proximity',{height,skills:{'proximity-awakening':1}});e.running=true;e.tutorialAwaitingLift=false;
  const floor=e.layout.obstacles[0],spark=e.layout.embers.find(p=>p.x>600);
  e.distance=spark.x-e.player.x;e.player.y=spark.y;e.player.vy=0;
  const clearance=obstacleEdgeClearance(spark.x,spark.y,e.player.radius,floor,0,48);
  assert.ok(clearance>0&&clearance<=48,`safe charging lane at ${height}: ${clearance}`);
  assert.equal(circleHitsObstacle(spark.x,spark.y,e.player.radius,floor,0),false);
  for(let i=0;i<121;i++){e.time+=1/60;e.edgingPulse.update(1/60,[floor]);}
  assert.ok(e.edgingPulse.triggerCount>0);assert.ok(e.edgingPulse.state.active);
  e.flame=e.maxFlame;e.collect(spark);assert.ok(e.condensedGlow>0);
  assert.ok(demonstratedTutorialTopics(e).includes('edging'));assert.ok(demonstratedTutorialTopics(e).includes('packed'));e.destroy();
 }
});

test('the Black Hole is real, visibly lit and has a wide safe bypass at phone heights',()=>{
 for(const height of [320,430,620]){
  const e=makeFlight('black-hole',{height}),hole=e.blackHoles.items[0];
  assert.ok(hole);assert.ok(e.mod.lightRadius>=360);assert.equal(e.drafts.zones.length,0);
  assert.ok(hole.bypass.y-hole.y>=e.height*.47);
  e.running=true;e.tutorialAwaitingLift=false;e.distance=hole.x-e.player.x;e.player.y=hole.bypass.y;
  assert.ok(e.layout.obstacles.every(o=>!circleHitsObstacle(hole.x,hole.bypass.y,e.player.radius,o,0)));
  const recovery=e.layout.embers.filter(p=>p.feature==='practice-bypass'&&p.x>hole.bypass.endX);
  assert.ok(recovery.length>=3);
  for(const spark of recovery){
   assert.ok(Math.hypot(spark.x-hole.x,spark.y-hole.y)>hole.influence,'recovery is beyond the drain');
   assert.ok(e.layout.obstacles.every(o=>!circleHitsObstacle(spark.x,spark.y,e.player.radius,o,0)),'recovery has a safe body-contact lane');
  }
  e.blackHoles.update(1/60);const bypass=e.blackHoles.rate;
  e.player.y=hole.y;e.blackHoles.update(1/60);
  assert.ok(e.blackHoles.rate>bypass*10);assert.ok(e.blackHoles.drained>0);e.destroy();
 }
});

test('the finale keeps the recognizable real Warden with broad, slow warned hands',()=>{
 const e=makeFlight('guardian');
 assert.equal(e.bossEncounter,true);assert.equal(e.layout.boss.id,'hollow-warden');assert.equal(e.layout.boss.phases.length,3);
 assert.ok(e.layout.obstacles.length>=6);assert.ok(e.layout.obstacles.filter(o=>o.bossPhase).every(o=>o.gap>=e.height*.64));
 assert.ok(e.layout.obstacles.some(o=>o.motion>0));assert.equal(e.blackHoles.items.length,0);
 assert.ok(e.layout.obstacles.some(o=>o.bossPart==='paired-hands'));e.destroy();
});

test('lesson cues never open flight cards and the loan has one canonical skill action',()=>{
 const s=M.newState();M.startTutorial(s);const r=s.run;
 for(const view of ['map','flight','support','victory'])assert.equal(checkpointTutorialLesson(view,{run:r}),null);
 const loan=r.map[1][0],markup=treasureView(r,loan);
 assert.match(markup,/PRACTICE LOAN/);assert.match(markup,/Borrow Proximity/);assert.match(markup,/prologue-loan/);
 assert.equal((markup.match(/data-action="support"/g)||[]).length,1);
 assert.doesNotMatch(markup,/CHOOSE ONE/);assert.match(markup,/data-skill-art="Proximity"/);
 const e=makeFlight('black-hole');assert.match(getTutorialHint(e).text,/dark core/);e.destroy();
});


test('a successful guardian hands back the campaign before one ordinary fresh gift',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'guardian-handoff');const original=structuredClone(s.run);
 M.startTutorial(s,{forNewGame:true,difficulty:1});const r=s.run;
 assert.equal(r.map.length,7,'seven practice stops');r.step=6;r.path=r.map.slice(0,6).map(row=>row[0].id);r.phase='map';
 assert.ok(M.selectNode(r,M.getChoices(r)[0].id));assert.ok(M.beginFlightAttempt(r));
 assert.ok(M.finishFlight(r,{success:true,flame:80,practiceTopics:['lift','collector']}));
 assert.equal(r.phase,'ended');assert.equal(r.success,true);assert.equal(r.victoryPending,false);
 const continuation={...r.tutorialContinuation};assert.ok(M.leaveTutorial(s));assert.deepEqual(s.run,original);
 assert.equal(s.profile.tutorialComplete,true);assert.deepEqual(s.profile.onboarding.seen,['lift','collector']);
 assert.equal(M.shouldStartTutorial(s),false);assert.equal(continuation.difficulty,1);
 const fresh=M.createRun(s.profile,'fresh-after-prologue',continuation.difficulty),gift=M.getStartingGiftOffers(fresh)[0];
 assert.ok(M.chooseStartingGift({run:fresh},gift.id));assert.equal(M.chooseStartingGift({run:fresh},gift.id),false);
 assert.equal(fresh.practiceLoan,undefined);assert.ok(!fresh.skills['proximity-awakening']);assert.equal(fresh.lives,3);
});


test('three delayed human input sequences clear all six stops from actual checkpoint fuel',async()=>{
 process.argv.push('--importOnly');const {simulate}=await import('../scripts/balance-current-flight.mjs');
 for(let controllerSeed=0;controllerSeed<3;controllerSeed++){
  const s=M.newState();M.startTutorial(s);
  for(let stop=0;stop<6;stop++){
   const r=s.run,n=M.getChoices(r)[0];assert.ok(M.selectNode(r,n.id));
   if(n.type==='support'){assert.ok(M.resolveSupport(r,0,s.profile));continue;}
   assert.ok(M.beginFlightAttempt(r));
   const result=simulate({run:structuredClone(r),controllerSeed,skills:r.skills,fleet:r.companions,
    terrain:n.terrain,difficulty:1,stage:n.row,role:'collector',style:'human250',seed:`prologue-${n.id}`,
    duration:n.duration,profile:'refuge',practice:true,node:n});
   assert.equal(result.success,true,`${controllerSeed}: ${n.tutorialLesson} from ${r.flame} fuel`);
   assert.ok(result.flaps>0);assert.ok(M.finishFlight(r,result.result));
  }
  assert.equal(s.run.success,true);
 }
});
