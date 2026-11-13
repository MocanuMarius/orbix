import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,startTutorial,leaveTutorial,getChoices,selectNode,beginFlightAttempt,finishFlight,
 chooseFlightReward,acknowledgeVictory,getSupportChoices,resolveSupport,setCompanions,equipArtifact,sellArtifact,
 canSellArtifact,loadState,saveState} from '../dist/model.mjs';
import {TUTORIAL_TOPICS} from '../dist/tutorial-curriculum.mjs';
import {deathScreenMarkup} from '../dist/death-screen.mjs';
const clear=state=>{const r=state.run;assert.ok(beginFlightAttempt(r));assert.ok(finishFlight(r,{success:true,flame:70,collected:5}));if(r.victoryPending){assert.ok(chooseFlightReward(state,r.flightReward.offers[0]));assert.ok(acknowledgeVictory(state));}};
test('seven-stop practice teaches real checkpoints without changing the suspended run',()=>{
 const state=newState();state.profile.ownedArtifacts=['sunheart-engine'];state.profile.equippedArtifacts=['sunheart-engine'];
 state.run=createRun(state.profile,'real-run');const original=structuredClone(state.run),profile=structuredClone(state.profile);
 assert.ok(startTutorial(state));const r=state.run;assert.equal(r.map.length,7);assert.equal(r.companionRole,'collector');
 assert.ok(r.skills['main-dream']);assert.ok(selectNode(r,getChoices(r)[0].id));clear(state);
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.equal(r.current.kind,'camp');
 assert.ok(resolveSupport(r,0,state.profile));for(const role of ['protector','swift','leveler','collector'])assert.ok(setCompanions(r,[role]));
 assert.equal(equipArtifact(state,'sunheart-engine',1),false,'real collection cannot enter practice');
 assert.ok(selectNode(r,getChoices(r)[0].id));clear(state);assert.equal(getChoices(r).length,2,'practice includes a real route fork');
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.ok(resolveSupport(r,0,state.profile));
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.equal(r.current.kind,'treasure');
 const chest=getSupportChoices(r,state.profile).findIndex(c=>c.effect.artifactReward);assert.ok(resolveSupport(r,chest,state.profile));
 assert.equal(r.victoryPending,true,'treasure actually opens reward selection');assert.ok(chooseFlightReward(state,r.flightReward.offers[0]));assert.ok(acknowledgeVictory(state));
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.ok(resolveSupport(r,0,state.profile));
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.equal(r.current.tutorialLesson,'hazards');clear(state);
 assert.equal(r.success,true);assert.ok(leaveTutorial(state));assert.deepEqual(state.run,original);
 assert.deepEqual(state.profile.ownedArtifacts,profile.ownedArtifacts);assert.deepEqual(state.profile.equippedArtifacts,profile.equippedArtifacts);
 assert.equal(state.profile.difficulty,profile.difficulty);assert.equal(state.profile.tutorialComplete,true);
});
test('practice forging spends only practice artifacts and pays only the practice wallet',()=>{
 const s=newState();s.profile.ownedArtifacts=['glow-wick'];s.profile.equippedArtifacts=['glow-wick'];startTutorial(s);
 const r=s.run;r.step=1;r.phase='support';r.current=r.map[1][0];r.artifacts=['glow-wick'];r.artifactCharges={'glow-wick':3};
 const before=r.practiceCondensedGlow;assert.ok(canSellArtifact(s,'glow-wick'));assert.ok(sellArtifact(s,'glow-wick'));
 assert.ok(r.practiceCondensedGlow>before);assert.equal(r.condensedGlow,0);assert.deepEqual(s.profile.ownedArtifacts,['glow-wick']);
 assert.deepEqual(s.profile.equippedArtifacts,['glow-wick']);assert.equal(sellArtifact(s,'glow-wick'),false);
});
test('a failure removes exactly one heart, preserves entry state and survives reload for the death panel',()=>{
 const s=newState();s.run=createRun(s.profile,'hearts');const r=s.run;selectNode(r,getChoices(r)[0].id);const fuel=r.flame;
 beginFlightAttempt(r);assert.ok(finishFlight(r,{success:false,flame:0}));assert.equal(r.lives,2);assert.equal(r.flame,fuel);assert.equal(r.phase,'map');assert.equal(r.deathPending,true);
 assert.equal(finishFlight(r,{success:false}),false);assert.equal(r.lives,2);
 let data;const storage={setItem:(_,v)=>{data=v},getItem:()=>data};saveState(s,storage);const restored=loadState(storage);
 assert.equal(restored.run.lives,2);assert.equal(restored.run.deathPending,true);assert.match(deathScreenMarkup(restored.run),/2 attempts remaining/);
 r.deathPending=false;r.lives=1;selectNode(r,getChoices(r)[0].id);beginFlightAttempt(r);finishFlight(r,{success:false});
 assert.equal(r.lives,0);assert.equal(r.phase,'ended');assert.match(deathScreenMarkup(r),/No hearts remain/);
});
test('curriculum names and distinguishes fuel, seeing, collection, death and progression',()=>{
 for(const key of ['sparks','luminance','hearts','collector','companions','packed','skills','rewards','artifacts','rest','dream','routes','hazards','progression','utilities','terrain']){
  assert.ok(TUTORIAL_TOPICS[key]?.steps.length>=3,key);
  for(const s of TUTORIAL_TOPICS[key].steps){assert.ok(s.visual);assert.ok(s.text.split(/\s+/).length<=48,`${key}: one short idea per card`);}
 }
 assert.match(TUTORIAL_TOPICS.collector.steps[2].text,/separate/);
});
