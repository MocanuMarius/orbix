import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {nextOnboardingLesson,markOnboardingSeen} from '../dist/onboarding.mjs';
import {flightRewardMarkup} from '../dist/reward-screen.mjs';
import {checkpointTutorialLesson} from '../dist/tutorial-steps.mjs';

function state(seed='seamless-clear'){
 const s=M.newState();s.run=M.createRun(s.profile,seed);
 return s;
}
function enter(s,kind='ordinary'){
 const r=s.run;
 const n=M.getChoices(r)[0];
 n.elite=kind==='elite';n.boss=kind==='guardian';
 assert.ok(M.selectNode(r,n.id));
 assert.ok(M.beginFlightAttempt(r));
 return n;
}
const storage=()=>{
 let data;
 return {setItem:(_,value)=>{data=value},getItem:()=>data};
};

test('ordinary success immediately banks its reward and opens the map without a reward panel',()=>{
 const s=state(),r=s.run,before=r.condensedGlow,n=enter(s);
 assert.ok(M.finishFlight(r,{success:true,flame:40,condensedGlow:7,collected:4}));
 assert.equal(r.condensedGlow,before+27);
 assert.equal(r.securedCondensedGlow,27);
 assert.equal(r.lastFlight.securedCondensedGlow,27);
 assert.equal(r.pendingCondensedGlow,0);
 assert.deepEqual(r.pendingRewards,[]);
 assert.equal(r.phase,'map');
 assert.equal(r.victoryPending,false);
 assert.equal(r.flightReward,null);
 assert.equal(flightRewardMarkup(s),'');
 assert.ok(M.getRouteMapState(r).availableIds.length);
 assert.equal(M.settleCheckpoint(s),0);
 const receipt=M.takeClearRewardReceipt(r);
 assert.deepEqual(receipt,{nodeId:n.id,mapIndex:0,amount:27,notes:[]});
 assert.equal(M.takeClearRewardReceipt(r),null);
 assert.equal(M.finishFlight(r,{success:true,condensedGlow:999}),false);
 assert.equal(r.condensedGlow,before+27);
});

test('automatic banking survives reload and cannot mint the reward twice',()=>{
 const s=state('reload'),r=s.run,before=r.condensedGlow,store=storage();
 enter(s);M.finishFlight(r,{success:true,flame:70,condensedGlow:9});
 assert.ok(M.saveState(s,store));
 const restored=M.loadState(store);
 assert.equal(restored.run.condensedGlow,before+29);
 assert.equal(restored.run.flightReward,null);
 assert.equal(restored.run.victoryPending,false);
 assert.equal(M.settleCheckpoint(restored),0);
 assert.equal(M.takeClearRewardReceipt(restored.run).amount,29);
 M.saveState(restored,store);
 const again=M.loadState(store);
 assert.equal(again.run.condensedGlow,before+29);
 assert.equal(M.takeClearRewardReceipt(again.run),null);
});

test('a saved ordinary victory from the previous flow settles once and returns to its map',()=>{
 const s=state('legacy'),r=s.run,before=r.condensedGlow,n=enter(s),store=storage();
 M.finishFlight(r,{success:true,flame:70,condensedGlow:5});
 Object.assign(r,{condensedGlow:before,securedCondensedGlow:0,pendingCondensedGlow:25,
  pendingRewards:[{kind:'flight-clear',amount:20,nodeId:n.id},{kind:'flight',amount:5,nodeId:n.id}],
  victoryPending:true,flightReward:{nodeId:n.id,offers:[],claimed:true}});
 r.lastFlight.securedCondensedGlow=0;
 M.saveState(s,store);
 const restored=M.loadState(store);
 assert.equal(restored.run.phase,'map');
 assert.equal(restored.run.victoryPending,false);
 assert.equal(restored.run.flightReward,null);
 assert.equal(restored.run.condensedGlow,before+25);
 assert.equal(restored.run.securedCondensedGlow,25);
 assert.equal(M.settleCheckpoint(restored),0);
 M.saveState(restored,store);
 assert.equal(M.loadState(store).run.condensedGlow,before+25);
});

test('failed flights pay nothing and abandon a stale visual receipt before the attempt',()=>{
 const s=state('failure'),r=s.run,before=r.condensedGlow;
 r.clearRewardReceipt={nodeId:'old',amount:20};enter(s);
 assert.equal(r.clearRewardReceipt,undefined);
 assert.ok(M.finishFlight(r,{success:false,flame:0,condensedGlow:200}));
 assert.equal(r.condensedGlow,before);
 assert.equal(r.lives,2);
 assert.equal(M.takeClearRewardReceipt(r),null);
 assert.equal(M.settleCheckpoint(s),0);
});

test('practice ordinary income stays in the practice wallet and directly opens its route',()=>{
 const s=state('practice'),profile=structuredClone(s.profile);
 M.startTutorial(s);const r=s.run,before=r.practiceCondensedGlow;
 enter(s);
 assert.ok(M.finishFlight(r,{success:true,flame:65,condensedGlow:4}));
 assert.equal(r.practiceCondensedGlow,before+24);
 assert.equal(r.condensedGlow,0);
 assert.equal(r.phase,'map');
 assert.equal(r.flightReward,null);
 assert.equal(r.victoryPending,false);
 assert.equal(M.takeClearRewardReceipt(r).amount,24);
 assert.deepEqual(s.profile,profile);
 const lesson=checkpointTutorialLesson('map',{run:r});
 assert.equal(lesson.id,'practice-clear-pay');
 assert.match(lesson.steps[0].text,/automatically banks/);
});

test('elite and guardian choices still block travel until a reward is chosen',()=>{
 for(const kind of ['elite','guardian']){
  const s=state(kind),r=s.run;
  if(kind==='guardian')r.step=6;
  enter(s,kind);
  assert.ok(M.finishFlight(r,{success:true,flame:65}));
  assert.equal(r.victoryPending,true);
  assert.equal(r.flightReward.offers.length,2);
  assert.equal(M.takeClearRewardReceipt(r),null);
  assert.equal(M.selectNode(r,M.getChoices(r)[0]?.id),false);
  assert.equal(M.acknowledgeVictory(s),false);
  assert.ok(M.chooseFlightReward(s,r.flightReward.offers[0]));
  assert.ok(M.acknowledgeVictory(s));
  if(kind==='guardian'){
   assert.equal(r.phase,'map-clear');
   assert.ok(M.advanceMap(r));
  }else assert.equal(r.phase,'map');
 }
});

test('a completed legendary collection skips the final discovery panel',()=>{
 const s=state('final'),r=s.run;
 for(let i=0;i<2;i++){r.phase='map-clear';assert.ok(M.advanceMap(r));}
 r.unlockedArtifacts=Object.keys(M.ARTIFACTS).filter(id=>M.ARTIFACTS[id].rarity==='boss');
 r.step=6;r.phase='map';enter(s,'guardian');
 assert.ok(M.finishFlight(r,{success:true,flame:60}));
 assert.equal(r.success,true);
 assert.equal(r.bossDefeated,true);
 assert.equal(r.phase,'ended');
 assert.deepEqual(r.flightReward.offers,[]);assert.ok(r.flightReward.collectionComplete);
 assert.equal(r.victoryPending,false);
 assert.equal(r.lastFlight.completionBonus,0);
 assert.equal(M.takeClearRewardReceipt(r),null);
});

test('normal reward onboarding can teach the saved currency on the map',()=>{
 const s=state('teach');enter(s);M.finishFlight(s.run,{success:true,flame:60});
 const lesson=nextOnboardingLesson('map',{...s,now:1000});
 assert.equal(lesson.topic,'packed');
 assert.match(lesson.steps[0].text,/automatically saves 20 Stored Sparks/);
 assert.equal(lesson.steps[0].target,'.condensed-wallet');
 markOnboardingSeen(s.profile,'packed');
 assert.equal(nextOnboardingLesson('map',{...s,now:1000}).topic,'routes');
});
