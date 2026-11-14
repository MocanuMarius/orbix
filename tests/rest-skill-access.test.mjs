import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {skillTreeState,skillTreeStatus} from '../dist/skill-tree-state.mjs';
import {treeDetail} from '../dist/living-tree.mjs';

const fresh=()=>{
 const state=M.newState();
 state.run=M.createRun(state.profile,'rest-only-training');
 state.run.condensedGlow=1000;
 return state;
};
function paidSkill(state){
 const wallet=M.getSkillWallet(state);
 return Object.values(M.SKILLS).find(skill=>!skill.retired&&skill.branch==='main'&&M.getSkillCost(wallet,skill.id)!==null);
}
function arriveAtRest(state){
 const r=state.run,camp=r.map.flat().find(n=>n.kind==='camp'),path=[];
 let node=camp;
 while(node.row>0){
  node=r.map[node.row-1].find(parent=>parent.nextIds.includes(node.id));
  path.unshift(node.id);
 }
 r.step=camp.row;r.path=path;r.phase='map';
 assert.ok(M.selectNode(r,camp.id));
 return camp;
}

test('paid skills wait for Rest, while the starting gift is still free',()=>{
 const state=fresh(),r=state.run,before=r.condensedGlow;
 assert.equal(M.canBuyCheckpointSkills(state),false);
 assert.ok(M.chooseStartingSkill(state,'main-efficiency'));
 assert.equal(r.condensedGlow,before);
 const skill=paidSkill(state);
 assert.ok(skill);
 assert.equal(M.buyCheckpointSkill(state,skill.id),false);
 assert.equal(r.condensedGlow,before);
 assert.equal(r.skills[skill.id]||0,0);
 r.victoryPending=true;r.step=1;
 assert.equal(M.canBuyCheckpointSkills(state),false,'a victory is not a Rest');
 assert.equal(M.buyCheckpointSkill(state,skill.id),false);
});

test('actual Rest benefit opens paid training, and starting flight closes it',()=>{
 const state=fresh(),r=state.run;
 arriveAtRest(state);
 assert.equal(M.canBuyCheckpointSkills(state),false,'choose the Rest benefit first');
 assert.ok(M.resolveSupport(r,0,state.profile));
 assert.equal(M.canBuyCheckpointSkills(state),true);
 const skill=paidSkill(state),price=M.getSkillCost(M.getSkillWallet(state),skill.id),before=r.condensedGlow;
 assert.ok(M.buyCheckpointSkill(state,skill.id));
 assert.equal(r.skills[skill.id],1);
 assert.equal(r.condensedGlow,before-price);
 assert.ok(M.selectNode(r,M.getChoices(r)[0].id));
 assert.ok(M.beginFlightAttempt(r));
 assert.equal(M.canBuyCheckpointSkills(state),false);
});

test('tree explains location separately from currency and shows the Rest icon',()=>{
 const state=fresh(),r=state.run;
 M.chooseStartingSkill(state,'main-efficiency');
 const skill=paidSkill(state),wallet=M.getSkillWallet(state);
 const locked=skillTreeState({run:r,wallet,canBuy:false},skill);
 assert.equal(locked.restRequired,true);
 assert.equal(skillTreeStatus(locked),'Upgrade at Rest');
 const html=treeDetail({run:r,wallet,skill,canBuy:false});
 assert.match(html,/rest-required/);
 assert.match(html,/map-symbol-rest/);
 assert.match(html,/Upgrade at Rest/);
 arriveAtRest(state);M.resolveSupport(r,0,state.profile);r.condensedGlow=0;
 const saving=skillTreeState({run:r,wallet:M.getSkillWallet(state),canBuy:true},skill);
 assert.equal(saving.restRequired,false);
 assert.match(skillTreeStatus(saving),/Need .* more Packed Sparks/);
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
  const blessing=offers.findIndex(offer=>offer.effect.blessing);
  assert.ok(M.resolveSupport(r,blessing,state.profile));
  assert.equal(r.nextFlightBlessing,true);
  assert.equal(r.condensedGlow,before);
  assert.deepEqual(r.skills,{});
  assert.equal(M.canBuyCheckpointSkills(state),false);
 }
});
