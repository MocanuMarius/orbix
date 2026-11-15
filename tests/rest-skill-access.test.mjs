import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {skillTreeState,skillTreeStatus} from '../dist/skill-tree-state.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {treeDetail} from '../dist/living-tree.mjs';
import {getFlightClearReward} from '../dist/checkpoint-rewards.mjs';

const fresh=()=>{
 const state=M.newState();
 state.run=M.createRun(state.profile,'rest-only-training');
 state.run.condensedGlow=1000;
 return state;
};
function enterFlight(state){
 const r=state.run;
 assert.ok(M.selectNode(r,M.getChoices(r).find(n=>n.type!=='support').id));
 assert.ok(M.beginFlightAttempt(r));
}

test('learn at the opening, a camp before its benefit, or after a win',()=>{
 const state=fresh(),r=state.run,start=r.condensedGlow;
 assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(r)[0].id));
 assert.equal(r.condensedGlow,start);
 for(const phase of ['map','support','briefing','map-clear']){
   r.phase=phase;
   assert.ok(M.canBuyCheckpointSkills(state),phase);
 }
 r.phase='map';r.victoryPending=true;
 const price=M.getSkillCost(M.getSkillWallet(state),'main-sight');
 assert.ok(M.buyCheckpointSkill(state,'main-sight'));
 assert.equal(r.condensedGlow,start-price);
 r.phase='ended';assert.equal(M.canBuyCheckpointSkills(state),false);
});

test('a paid live upgrade survives a loss, interrupted reload or clear, once',()=>{
 for(const outcome of ['loss','reload','win']){
   const state=fresh();enterFlight(state);
   const r=state.run;
   const price=M.getSkillCost(M.getSkillWallet(state),'main-efficiency');
   assert.ok(M.buyCheckpointSkill(state,'main-efficiency'));
   const amount=1000-price,clearReward=getFlightClearReward(r.current,r);
   assert.equal(r.condensedGlow,amount);
   assert.equal(r.attemptEntry.skills['main-efficiency'],1);
   if(outcome==='reload'){
     const files=new Map();
     const store={setItem:(k,v)=>files.set(k,v),getItem:k=>files.get(k)};
     assert.ok(M.saveState(state,store));
     state.run=M.loadState(store).run;
   }else{
     assert.ok(M.finishFlight(r,{success:outcome==='win',condensedGlow:outcome==='win'?3:99,flame:40}));
   }
   assert.equal(state.run.skills['main-efficiency'],1,outcome);
   assert.equal(state.run.skillPaid['main-efficiency'],price,outcome);
   assert.equal(state.run.condensedGlow,amount+(outcome==='win'?clearReward+3+2:0),outcome);
 }
});

test('banked balance and prerequisites control skill availability while flying',()=>{
 const state=fresh(),r=state.run;
 enterFlight(state);
 r.condensedGlow=0;
 const skill=M.SKILLS['main-sight'];
 const context={run:r,wallet:M.getSkillWallet(state),canBuy:M.canBuyCheckpointSkills(state)};
 const view=skillTreeState(context,skill);
 assert.match(skillTreeStatus(view),/Need .* more Stored Sparks/);
 assert.doesNotMatch(treeDetail({...context,skill}),/Rest|REST REQUIRED/);
 assert.equal(M.buyCheckpointSkill(state,skill.id),false);
 r.condensedGlow=1000;
 assert.equal(M.buyCheckpointSkill(state,'main-horizon'),false,'prerequisites still apply');
});

test('live upgrades immediately adjust Lift cost and preserve progress and unbanked Sparks',()=>{
 const state=fresh(),r=state.run;enterFlight(state);
 const scene=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})},
   node:r.current,seed:r.seed,preflight:true,modifiers:M.getRunModifiers(r),flame:48,condensedGlow:1000});
 scene.condensedGlow=7;scene.distance+=126;scene.notify=()=>{};scene.render=()=>{};
 const priorDistance=scene.distance,priorFlame=scene.flame,priorCost=scene.flapCost;
 assert.ok(M.buyCheckpointSkill(state,'main-efficiency'));
 scene.applySkillUpgrade(M.getRunModifiers(r),r.condensedGlow);
 assert.ok(scene.flapCost<priorCost);
 assert.equal(scene.condensedTotal,r.condensedGlow+7);
 assert.equal(scene.flame,priorFlame);
 assert.equal(scene.distance,priorDistance);
});

test('TEST and explicit practice preserve flexible checkpoint access',()=>{
 const testing=fresh();testing.run.testMode=true;
 assert.equal(M.canBuyCheckpointSkills(testing),true);
 const practice=fresh();M.startTutorial(practice);
 assert.equal(M.canBuyCheckpointSkills(practice),true);
});

test('shrines give temporary blessings or resources, with no paid skill bypass',()=>{
 for(const eventIndex of [3,11]){
  const state=fresh(),r=state.run;
  r.current={...r.map[0][0],type:'support',kind:'event',eventIndex};
  r.map[0]=[r.current];r.path=[r.current.id];r.phase='support';
  r.supportOffers={nodeId:r.current.id,choices:[{id:'old-upgrade',effect:{upgrade:'main-sight',condensedCost:1}}]};
  const offers=M.getSupportChoices(r,state.profile);
  assert.ok(offers.length>=2);
  assert.ok(offers.every(offer=>!offer.effect.upgrade));
  const before=r.condensedGlow;
  const blessing=offers.findIndex(offer=>offer.effect.eventFavor==='haste');
  assert.ok(M.resolveSupport(r,blessing,state.profile));
  assert.ok(r.eventFavors.includes('haste'));
  assert.equal(r.condensedGlow,before);
  assert.deepEqual(r.skills,{});
  assert.equal(M.canBuyCheckpointSkills(state),true);
 }
});
