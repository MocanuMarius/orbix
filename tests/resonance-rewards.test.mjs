import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';

function start(skills={'main-resonant-bounty':1}){
 const s=M.newState(),r=s.run=M.createRun(s.profile,'resonance-rewards');r.skills=skills;
 assert.ok(M.selectNode(r,M.getChoices(r)[0].id));assert.ok(M.beginFlightAttempt(r));return s;
}
function acknowledge(s){
 if(s.run.flightReward?.offers?.length)assert.ok(M.chooseFlightReward(s,s.run.flightReward.offers[0]));
 assert.ok(M.acknowledgeVictory(s));M.settleCheckpoint(s);
}
test('resonance income survives packing caps, secures on clear and banks only once',()=>{
 const s=start(),r=s.run,before=r.condensedGlow;
 assert.ok(M.finishFlight(r,{success:true,flame:0,condensedGlow:999,resonanceStored:10,storageBonus:999}));
 acknowledge(s);
 const reward=r.lastFlight.completionBonus+r.lastFlight.pickupCondensedGlow+10;
 assert.equal(r.lastFlight.pickupCondensedGlow,20);assert.equal(r.lastFlight.resonanceStored,10);assert.equal(r.lastFlight.storageBonus,undefined);
 assert.equal(r.condensedGlow,before+reward);assert.equal(r.condensedEarned,reward);assert.equal(r.lastFlight.securedCondensedGlow,reward);
 const receipt=M.takeClearRewardReceipt(r);assert.equal(receipt.amount,reward);assert.equal(receipt.resonanceStored,10);
 assert.equal(M.settleCheckpoint(s),0);assert.equal(M.finishFlight(r,{success:true,resonanceStored:10}),false);assert.equal(r.condensedGlow,before+reward);
});
test('failed flights, tutorials and builds without Bounty cannot bank reported resonance',()=>{
 for(const [skills,success,tutorial]of [[{'main-resonant-bounty':1},false,false],[{},true,false],[{'main-resonant-purification':1},true,false],[{'main-resonant-bounty':1},true,true]]){
  const s=start(skills),r=s.run,before=r.condensedGlow;if(tutorial){r.isTutorial=true;r.practiceCondensedGlow=0;}
  assert.ok(M.finishFlight(r,{success,flame:0,resonanceStored:10}));
  assert.equal(r.lastFlight?.resonanceStored||0,0);assert.ok(!r.pendingRewards.some(reward=>reward.kind==='resonance'));
  if(!success){M.settleCheckpoint(s);assert.equal(r.condensedGlow,before);}
 }
});
test('final guardians pay uncapped resonance despite having no ordinary clear bonus',()=>{
 const s=start(),r=s.run,before=r.condensedGlow;
 Object.assign(r.current,{boss:true,type:'finale',mapIndex:2});r.mapIndex=2;
 assert.ok(M.finishFlight(r,{success:true,flame:0,resonanceStored:50}));
 assert.equal(r.lastFlight.completionBonus,0);assert.equal(r.lastFlight.resonanceStored,50);
 assert.ok(r.pendingRewards.some(reward=>reward.kind==='resonance'&&reward.amount===50));
 acknowledge(s);assert.equal(r.condensedGlow,before+50);assert.equal(r.lastFlight.securedCondensedGlow,50);
});
