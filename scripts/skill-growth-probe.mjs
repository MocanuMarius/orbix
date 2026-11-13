import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {skillProgress} from '../dist/skill-increments.mjs';
const chain=(id,skills={})=>{const s=M.SKILLS[id];assert.ok(s,id);if(s.requires)chain(s.requires,skills);skills[id]=1;return skills;};
let tracks=0;
for(const s of Object.values(M.SKILLS).filter(s=>s.incrementStage===3)){
 const base=s.incrementBase,one=M.SKILLS[base+'-step-1'],two=M.SKILLS[base+'-step-2'];
 assert.equal(one.cost+two.cost+s.cost,s.expansion?120:75);
 const wallet={skills:{},afterglowUnlocked:true,mapIndex:2};
 for(const id of Object.keys(chain(s.id))){assert.notEqual(M.getSkillCost(wallet,id),null,id);wallet.skills[id]=1;}
 assert.equal(skillProgress(wallet.skills,base),1);
 for(const n of [1,2,3]){
  const id=n===3?base:base+'-step-'+n,skills=chain(id),progress=skillProgress(skills,base);
  assert.equal(progress,n/3);const mods=M.getRunModifiers({skills,companions:[s.branch==='main'?'collector':s.branch]});
  for(const val of Object.values(mods))if(typeof val==='number')assert.ok(Number.isFinite(val));
 }
 for(const other of one.excludes||[])assert.ok(M.getSkillLockReason({skills:chain(one.id)},other),'opposite fork available: '+other);
 tracks++;
}
for(const id of ['kindler-purify','protector-layers','leveler-dive']){
 const s=M.SKILLS[id],skills=chain(id);
 for(const other of s.excludes||[])assert.ok(M.getSkillLockReason({skills},other));
}
const glow=[];
for(const n of [0,1,2,3]){
 const loss=n?chain(n===3?'main-lift':'main-lift-step-'+n):{'main-efficiency':1};
 const gain=n?chain(n===3?'main-kindling':'main-kindling-step-'+n):{'main-efficiency':1};
 glow.push({step:n,costMultiplier:M.getRunModifiers({skills:loss}).flapCost,pickupBonus:M.getRunModifiers({skills:gain}).cacheFuelBonus});
}
assert.ok(glow.every((v,i)=>i===0||v.costMultiplier<glow[i-1].costMultiplier&&v.pickupBonus>glow[i-1].pickupBonus));
const state=M.newState();state.run=M.createRun(state.profile,'growth-purchases');M.chooseStartingSkill(state,'main-efficiency');
state.run.restReady=true;state.run.embers=75;
for(const id of ['main-kindling-step-1','main-kindling-step-2','main-kindling'])assert.ok(M.buyCheckpointSkill(state,id));
assert.equal(state.run.embers,0);assert.equal(M.buyCheckpointSkill(state,'main-lift-step-1'),false);
state.run.testMode=true;state.run.embers=1000;assert.ok(M.buyCheckpointSkill(state,'main-lift-step-1'));assert.equal(state.run.skills['main-kindling'],undefined);assert.equal(state.run.skills['main-kindling-step-2'],undefined);
console.log(JSON.stringify({tracks,addedNodes:tracks*2,glow,exclusivePaths:true,totalPricesPreserved:true,purchasesAndTestReplacement:true},null,2));
