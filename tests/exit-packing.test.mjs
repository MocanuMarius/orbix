import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {packExitReserve} from '../dist/condensed-glow.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';

const start=(skills={},artifacts=[])=>{
 const s=M.newState(),r=s.run=M.createRun(s.profile,'exit-reserve');r.skills=skills;r.artifacts=artifacts;
 assert.ok(M.selectNode(r,M.getChoices(r)[0].id));assert.ok(M.beginFlightAttempt(r));return s;
};
test('remaining fuel converts before recovery, including when overflow harvest is already full',()=>{
 const s=start(),r=s.run,before=r.condensedGlow;
 assert.ok(M.finishFlight(r,{success:true,flame:100,condensedGlow:20}));M.settleCheckpoint(s);
 assert.equal(r.lastFlight.exitPacking.amount,5);assert.equal(r.lastFlight.exitPacking.reserve,100);
 assert.equal(r.lastFlight.pickupCondensedGlow,20);assert.equal(r.flame,50);
 assert.equal(r.condensedGlow,before+r.lastFlight.completionBonus+25);
 assert.equal(r.lastFlight.securedCondensedGlow,r.lastFlight.completionBonus+25);
 assert.equal(M.finishFlight(r,{success:true,flame:100,condensedGlow:20}),false);
 let data;const storage={setItem:(_,v)=>data=v,getItem:()=>data};M.saveState(s,storage);
 const reloaded=M.loadState(storage);assert.equal(reloaded.run.condensedGlow,r.condensedGlow);assert.equal(M.settleCheckpoint(reloaded),0);
 assert.equal(M.takeClearRewardReceipt(reloaded.run).amount,r.lastFlight.completionBonus+25);
});
test('storage efficiency, fractional carry and recovery upgrades apply without pickup triggers',()=>{
 const s=start({'main-afterglow':1,'main-recovery':1},['echo-vessel','glow-wick']),r=s.run;
 const charges={...M.getRunModifiers(r).artifactCharges};
 M.finishFlight(r,{success:true,flame:80,condensedGlow:0,condensedRemainder:.6,artifactCharges:charges});M.settleCheckpoint(s);
 assert.equal(r.lastFlight.exitPacking.amount,12);assert.ok(Math.abs(r.condensedRemainder-.6)<1e-8);
 assert.equal(r.flame,55);assert.equal(r.artifactCharges['glow-wick'],3);
 const quote=packExitReserve(10,{remainder:.8});assert.equal(quote.amount,1);assert.equal(quote.remainder,.3);
});
test('failure never packs or changes the saved reserve',()=>{
 const s=start(),r=s.run,before=r.condensedGlow;r.condensedRemainder=.4;
 M.finishFlight(r,{success:false,flame:100,condensedGlow:20});M.settleCheckpoint(s);
 assert.equal(r.condensedGlow,before);assert.equal(r.flame,100);assert.equal(r.lastFlight?.exitPacking,undefined);
 assert.equal(r.condensedRemainder,0,'failed fractional changes roll back with the entry');
});
test('the exit animation previews the real payout and waits for packing without rewriting pickup income',()=>{
 const c=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{})});
 const canvas={getContext:()=>c,getBoundingClientRect:()=>({width:915,height:412})};
 let result;const e=new WispFlight({canvas,preflight:true,seed:'exit-animation',onFinish:r=>result=r});
 e.flame=80;e.condensedGlow=2;e.finish(true);
 assert.equal(e.getState().exitPacking.amount,4);assert.equal(e.getState().condensedGlow,6);
 assert.equal(e.condensationFlow.source,'exit');assert.equal(e.completionProgress,0);
 for(let i=0;i<100;i++)e.step(1/60);assert.equal(result,undefined);assert.equal(e.completionProgress,1);
 for(let i=0;i<50&&!result;i++)e.step(1/60);
 assert.equal(result.success,true);assert.equal(result.flame,80);assert.equal(result.condensedGlow,2);e.destroy();
});


test('Rest refill does not pack a second time and later exits pack only their own reserve',()=>{
 const s=start(),r=s.run;
 M.finishFlight(r,{success:true,flame:100});M.settleCheckpoint(s);
 const wallet=r.condensedGlow,earned=r.condensedEarned;
 const node=r.map.flat().find(n=>n.kind==='camp');assert.ok(node);
 let child=node;const path=[];
 for(let row=node.row-1;row>=0;row--){const parent=r.map[row].find(n=>n.nextIds.includes(child.id));path.unshift(parent.id);child=parent;}
 Object.assign(r,{path,step:node.row,phase:'map',current:null,victoryPending:false,flightReward:null});
 assert.ok(M.selectNode(r,node.id));assert.ok(M.resolveSupport(r,0,s.profile));M.settleCheckpoint(s);
 assert.equal(r.flame,getGlowCapacity(r));assert.equal(r.condensedGlow,wallet);assert.equal(r.condensedEarned,earned);
 assert.equal(M.resolveSupport(r,0,s.profile),false);assert.equal(M.settleCheckpoint(s),0);
 assert.ok(M.selectNode(r,M.getChoices(r)[0].id));assert.ok(M.beginFlightAttempt(r));
 M.finishFlight(r,{success:true,flame:0});M.settleCheckpoint(s);
 assert.equal(r.lastFlight.exitPacking.amount,0);assert.equal(r.condensedGlow,wallet+r.lastFlight.completionBonus);
});

test('reserve cashout is capacity-bounded and zero fuel still receives checkpoint recovery',()=>{
 for(const flame of [0,1,100,9999]){
  const s=start(),r=s.run;M.finishFlight(r,{success:true,flame});M.settleCheckpoint(s);
  assert.equal(r.lastFlight.exitPacking.reserve,Math.min(100,flame));
  assert.equal(r.lastFlight.exitPacking.amount,Math.floor(Math.min(100,flame)*.05));
  assert.equal(r.flame,50);assert.equal(r.lastFlight.recovery.before,0);
 }
});
