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
const main=Object.values(M.SKILLS).filter(s=>s.branch==='main');
assert.ok(main.every(s=>!s.incrementStage),'Main paths should be distinct choices, not repeated ranks');
const state=M.newState();state.run=M.createRun(state.profile,'growth-purchases');
assert.equal(state.run.embers,30);assert.ok(M.chooseStartingSkill(state,'main-efficiency'));
assert.ok(M.buyCheckpointSkill(state,'main-lift'));assert.equal(state.run.embers,5);
assert.equal(M.buyCheckpointSkill(state,'main-kindling'),false,'Second upgrade must be earned');
M.selectNode(state.run,M.getChoices(state.run)[0].id);M.beginFlightAttempt(state.run);
M.finishFlight(state.run,{success:true,flame:70,embers:5});M.settleCheckpoint(state);
assert.equal(state.run.embers,42);assert.ok(M.chooseFlightReward(state,'embers'));
for(const id of ['main-kindling','main-reservoir'])assert.ok(M.buyCheckpointSkill(state,id),id);
assert.equal(state.run.embers,0);assert.equal(state.run.skills['main-lift'],1);assert.equal(state.run.skills['main-kindling'],1);
const mods=M.getRunModifiers(state.run);assert.ok(mods.flapCost<.9);assert.equal(mods.cacheFuelBonus,4);assert.equal(mods.maxGlow,120);
const fast={skills:chain('main-plummet')},slow={skills:chain('main-drift')};
assert.ok(M.getRunModifiers(fast).gravity>1);assert.ok(M.getRunModifiers(slow).gravity<1);
assert.ok(M.getSkillLockReason(fast,'main-drift'));assert.ok(M.getSkillLockReason(slow,'main-plummet'));
state.run.testMode=true;state.run.embers=1000;
for(const id of ['main-speed','main-drift','main-light-step','main-plummet'])assert.ok(M.buyCheckpointSkill(state,id),id);
assert.equal(state.run.skills['main-drift'],undefined);assert.equal(state.run.skills['main-light-step'],undefined);
console.log(JSON.stringify({companionIncrementTracks:tracks,mainChoices:main.length,startingBudget:30,mixedEconomyBuild:true,exclusiveFallPaths:true,testReplacement:true},null,2));
