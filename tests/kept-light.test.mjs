import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,beginFlightAttempt,markFlightAttemptStarted,finishFlight,getChoices,selectNode,
 buyCheckpointSkill,saveState,loadState,settleCheckpoint,startTutorial,takeClearRewardReceipt,getRunModifiers,getSkillWallet,getSkillCost} from '../dist/model.mjs';
import {getKeptLightDividend,getCondensationRules,condenseGlow} from '../dist/condensed-glow.mjs';
import {flightRewardMarkup} from '../dist/reward-screen.mjs';

function campaign(wallet,rank){
 const state=newState();
 state.run=createRun(state.profile,1,1);
 Object.assign(state.run,{condensedGlow:wallet,skills:{'main-afterglow':1,'afterglow-anchor':rank}});
 return state;
}
function depart(run){
 if(run.phase==='map')assert.ok(selectNode(run,getChoices(run)[0].id));
 assert.ok(beginFlightAttempt(run));
 assert.ok(markFlightAttemptStarted(run));
}
function reload(state){
 let data;
 const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
 assert.ok(saveState(state,storage));
 return loadState(storage);
}
const clear=(run,extra={})=>finishFlight(run,{success:true,flame:50,condensedGlow:0,...extra});

test('whole dividend floors and caps by rank; held funds no longer improve pickup conversion',()=>{
 for(const [wallet,rank,expected] of [[60,0,0],[19,1,0],[20,1,1],[59,1,2],[60,1,3],[99,2,9],[100,1,5],[100,2,10],[99999,2,10]]){
  assert.equal(getKeptLightDividend(wallet,rank),expected);
 }
 const rules=getCondensationRules({'main-afterglow':1,'afterglow-anchor':2});
 const ordinary=getCondensationRules({'main-afterglow':1});
 assert.deepEqual(condenseGlow(120,{rules,wallet:500}),condenseGlow(120,{rules:ordinary,wallet:0}));
});

test('departure fixes the dividend rate and balance even when upgraded during flight; ordinary banking only happens once',()=>{
 const s=campaign(100,1),r=s.run;
 depart(r);
 assert.equal(r.attemptEntry.keptLightDividend,5);
 assert.ok(buyCheckpointSkill(s,'afterglow-anchor'));
 const remaining=r.condensedGlow;
 assert.ok(remaining<100);
 assert.equal(r.attemptEntry.keptLightDividend,5);
 assert.ok(clear(r,{condensedGlow:13,keptLightDividend:9999}));
 assert.equal(r.condensedGlow,remaining+20+13+5);
 assert.equal(r.lastFlight.securedCondensedGlow,38);
 assert.equal(r.condensedEarned,38);
 assert.equal(takeClearRewardReceipt(r).amount,38);
 assert.equal(clear(r),false);
 assert.equal(settleCheckpoint(reload(s)),0);
 assert.equal(reload(s).run.condensedGlow,r.condensedGlow);
});

test('a failed attempt and interrupted save cannot cash a quote; a retry gets one fresh quote',()=>{
 let s=campaign(80,2);
 depart(s.run);
 s=reload(s);
 assert.equal(s.run.condensedGlow,80);
 assert.equal(settleCheckpoint(s),0);
 depart(s.run);
 assert.ok(finishFlight(s.run,{success:false,condensedGlow:300}));
 assert.equal(s.run.condensedGlow,80);
 assert.equal(s.run.condensedEarned,0);
 depart(s.run);
 assert.ok(clear(s.run));
 assert.equal(s.run.lastFlight.keptLightDividend,8);
 assert.equal(s.run.condensedGlow,108);
});

test('a Gilded clear and the new flight earnings cannot multiply the opening balance dividend',()=>{
 const s=campaign(80,2),r=s.run;
 depart(r);
 r.current.bonusId=r.attemptEntry.bonusId='gilded';
 assert.ok(clear(r,{condensedGlow:2,routeBonus:{id:'gilded',eligible:true,
  complete:true,failed:false,packed:2,progress:4,target:4}}));
 assert.equal(r.lastFlight.routeBonus.amount,22);
 assert.equal(r.lastFlight.keptLightDividend,8);
 assert.equal(r.condensedGlow,80+20+2+22+8);
});

test('nonfinal guardian settles its quoted dividend once; final guardian and practice award none',()=>{
 for(const index of [0,2]){
  const s=campaign(100,2),r=s.run,boss=r.map.at(-1)[0];
  Object.assign(boss,{type:'finale',boss:true,mapIndex:index});
  Object.assign(r,{current:boss,mapIndex:index,phase:'briefing',step:boss.row});
  depart(r);
  assert.ok(clear(r));
  const earned=index===2?0:30;
  assert.equal(r.lastFlight.keptLightDividend||0,index===2?0:10);
  if(index===0)assert.match(flightRewardMarkup(s),/Kept Light \+10/);
  const restored=reload(s);
  assert.equal(restored.run.condensedGlow,100+earned);
  assert.equal(settleCheckpoint(restored),0);
 }
 const s=newState();
 assert.ok(startTutorial(s));
 s.run.skills['afterglow-anchor']=2;
 const practice=s.run.practiceCondensedGlow;
 depart(s.run);assert.ok(clear(s.run));
 assert.equal(s.run.lastFlight.keptLightDividend||0,0);
 assert.equal(s.run.practiceCondensedGlow,practice+20);
 assert.equal(s.run.condensedGlow,0);
 const t=campaign(60,1);t.run.testMode=true;
 const profile=structuredClone(t.profile);
 depart(t.run);assert.ok(clear(t.run));
 assert.equal(t.run.condensedGlow,83);
 assert.deepEqual(t.profile,profile);
});
test('Storage pickup forks are exclusive, capped, and settle once outside doubles and interest',()=>{
 for(const [id,other,cap,property] of [['packing-hand-seal','packing-deep-cache',2,'handSeal'],['packing-deep-cache','packing-hand-seal',4,'deepCache']]){
  const s=campaign(160,1),r=s.run;
  assert.equal(buyCheckpointSkill(s,id,1),true);
  assert.equal(getSkillCost(getSkillWallet(s),other),null);
  assert.equal(getRunModifiers(r)[property],true);
  const carried=r.condensedGlow;
  depart(r);assert.ok(finishFlight(r,{success:false,storageBonus:99}));
  assert.equal(r.condensedGlow,carried);
  depart(r);r.current.bonusId=r.attemptEntry.bonusId='gilded';
  assert.ok(clear(r,{storageBonus:99,condensedGlow:2,routeBonus:{id:'gilded',eligible:true,complete:true,failed:false,packed:2,progress:4,target:4}}));
  const receipt=takeClearRewardReceipt(r);
  assert.equal(receipt.storageBonus,cap);
  assert.equal(r.lastFlight.routeBonus.amount,22);
  assert.equal(r.lastFlight.keptLightDividend,5);
  assert.equal(receipt.amount,20+2+22+5+cap);
  assert.equal(r.condensedGlow,carried+receipt.amount);
  assert.equal(settleCheckpoint(reload(s)),0);
 }
});
