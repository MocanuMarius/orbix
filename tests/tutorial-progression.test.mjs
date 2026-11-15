import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,startTutorial,leaveTutorial,getChoices,selectNode,beginFlightAttempt,finishFlight,
 chooseFlightReward,acknowledgeVictory,getSupportChoices,resolveSupport,setCompanions,equipArtifact,sellArtifact,
 canSellArtifact,loadState,saveState} from '../dist/model.mjs';
import {TUTORIAL_TOPICS} from '../dist/tutorial-curriculum.mjs';
import {deathScreenMarkup} from '../dist/death-screen.mjs';
const clear=state=>{const r=state.run;assert.ok(beginFlightAttempt(r));assert.ok(finishFlight(r,{success:true,flame:70,collected:5}));if(r.victoryPending){assert.ok(chooseFlightReward(state,r.flightReward.offers[0]));assert.ok(acknowledgeVictory(state));}};
test('six-stop prologue loans a real skill, restores Rest resources and preserves the suspended run',()=>{
 const state=newState();state.profile.ownedArtifacts=['sunheart-engine'];state.profile.equippedArtifacts=['sunheart-engine'];
 state.run=createRun(state.profile,'real-run');const original=structuredClone(state.run),profile=structuredClone(state.profile);
 assert.ok(startTutorial(state));const r=state.run;assert.equal(r.map.length,6);assert.equal(r.companionRole,'collector');
 assert.deepEqual(r.map.map(row=>row[0].tutorialLesson||row[0].kind),['glide','treasure','proximity','camp','black-hole','guardian']);
 assert.equal(r.practiceCondensedGlow,0);assert.ok(!r.skills['proximity-awakening']);
 assert.ok(selectNode(r,getChoices(r)[0].id));clear(state);
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.equal(r.current.kind,'treasure');
 const offers=getSupportChoices(r,state.profile);assert.equal(offers.length,1);assert.equal(offers[0].skillId,'proximity-awakening');
 assert.ok(resolveSupport(r,0,state.profile));assert.equal(r.skills['proximity-awakening'],1);
 assert.equal(resolveSupport(r,0,state.profile),false,'the lesson loan is claimed once');
 assert.equal(equipArtifact(state,'sunheart-engine',1),false,'real collection cannot enter practice');
 assert.ok(selectNode(r,getChoices(r)[0].id));clear(state);
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.equal(r.current.kind,'camp');
 assert.ok(r.lives<r.maxLives,'a labelled practice heart is missing without forcing a failed flight');r.flame=20;
 assert.ok(resolveSupport(r,0,state.profile));assert.equal(r.lives,r.maxLives);assert.equal(r.flame,100);
 for(const role of ['protector','swift','leveler'])assert.equal(setCompanions(r,[role]),false);
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.equal(r.current.tutorialLesson,'black-hole');clear(state);
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.equal(r.current.bossId,'hollow-warden');assert.equal(r.current.boss,true);clear(state);
 assert.equal(r.success,true);assert.ok(leaveTutorial(state));assert.deepEqual(state.run,original);
 assert.deepEqual(state.profile.ownedArtifacts,profile.ownedArtifacts);assert.deepEqual(state.profile.equippedArtifacts,profile.equippedArtifacts);
 assert.equal(state.profile.difficulty,profile.difficulty);assert.equal(state.profile.tutorialComplete,true);
 assert.deepEqual(state.profile.onboarding.seen,['rest'],'unobserved flight mechanics still receive later contextual lessons');
});
test('practice forging spends only practice artifacts and pays only the practice wallet',()=>{
 const s=newState();s.profile.ownedArtifacts=['glow-wick'];s.profile.equippedArtifacts=['glow-wick'];startTutorial(s);
 const r=s.run;r.step=3;r.phase='support';r.current=r.map[3][0];r.artifacts=['glow-wick'];r.artifactCharges={'glow-wick':3};
 assert.equal(canSellArtifact(s,'glow-wick'),false);assert.ok(resolveSupport(r,0,s.profile));
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
 assert.ok(TUTORIAL_TOPICS.collector.steps.some(step=>/Luminance has a separate chapter/.test(step.text)));
 assert.ok(TUTORIAL_TOPICS.collector.steps.some(step=>step.title==='Last Orbit'&&step.text.includes('four normal recovery cycles')));
});
