import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,startTutorial,getChoices,selectNode,beginFlightAttempt,finishFlight,chooseFlightReward,getFlightRewardMeltValue,getSkillWallet,ARTIFACTS} from '../dist/model.mjs';
import {flightRewardMarkup} from '../dist/reward-screen.mjs';
import {startResumeCountdown,countdownNumber} from '../dist/resume-countdown.mjs';
const ready=(id='glass-lantern',practice=false)=>{
 const s=newState();if(practice)startTutorial(s);else s.run=createRun(s.profile,'reward-flow');
 const r=s.run;if(!practice)r.stats.flights=1;
 assert.ok(selectNode(r,getChoices(r)[0].id));assert.ok(beginFlightAttempt(r));
 assert.ok(finishFlight(r,{success:true,flame:40,collected:4}));
 if(id)r.flightReward.offers=[id];return s;
};
test('ordinary rewards are a single artifact; melt pays rarity currency once, without touching fuel',()=>{
 for(const [id,value]of [['glass-lantern',25],['overflow-coil',35],['sunheart-engine',50]]){
  const s=ready(id),r=s.run;const fuel=r.flame,before=r.condensedGlow,inventory=[...r.artifacts];
  r.skills['main-afterglow']=1;r.skills['afterglow-anchor']=2;r.condensedRemainder=.8;
  assert.equal(getFlightRewardMeltValue(r.flightReward),value);assert.ok(chooseFlightReward(s,'melt'));
  assert.equal(r.condensedGlow,before+value);assert.equal(r.flame,fuel);assert.equal(r.condensedRemainder,.8);assert.deepEqual(r.artifacts,inventory);
  assert.equal(chooseFlightReward(s,'melt'),false);assert.equal(chooseFlightReward(s,id),false);
 }
 for(let seed=0;seed<60;seed++){
  const s=newState();s.run=createRun(s.profile,`single-${seed}`);const r=s.run;r.stats.flights=1;
  selectNode(r,getChoices(r)[0].id);beginFlightAttempt(r);finishFlight(r,{success:true,flame:60});
  assert.equal(r.flightReward.offers.length,1);assert.ok(ARTIFACTS[r.flightReward.offers[0]]);
 }
});
test('equip selects an empty slot, and full slots require an explicit replacement',()=>{
 const s=ready(),r=s.run;r.artifacts=['glow-wick',null,'quiet-cinder'];
 assert.ok(chooseFlightReward(s,'glass-lantern'));assert.deepEqual(r.artifacts,['glow-wick','glass-lantern','quiet-cinder']);
 const full=ready();full.run.artifacts=['glow-wick','quiet-cinder','flash-stone'];
 assert.equal(chooseFlightReward(full,'glass-lantern'),false);
 assert.ok(chooseFlightReward(full,'glass-lantern',1));assert.deepEqual(full.run.artifacts,['glow-wick','glass-lantern','flash-stone']);
});
test('practice melting only funds the practice wallet; final boss relic cannot be melted into expiring currency',()=>{
 const s=ready('glass-lantern',true),profile=structuredClone(s.profile),before=getSkillWallet(s).condensedGlow;
 assert.ok(chooseFlightReward(s,'melt'));assert.equal(getSkillWallet(s).condensedGlow,before+25);assert.deepEqual(s.profile,profile);
 const boss=ready('sunheart-engine');boss.run.flightReward.permanent=true;
 assert.equal(getFlightRewardMeltValue(boss.run.flightReward),0);assert.equal(chooseFlightReward(boss,'melt'),false);
 assert.ok(chooseFlightReward(boss,'sunheart-engine'));assert.ok(boss.profile.ownedArtifacts.includes('sunheart-engine'));
});
test('reward keeps one readable card and visible slots before and after equip, without a mount confirmation page',()=>{
 const s=ready('echo-bell');s.run.companions=['collector'];
 const before=flightRewardMarkup(s,{artifactArt:id=>`<svg data-artifact="${id}"></svg>`});
 assert.equal((before.match(/<article /g)||[]).length,1);assert.match(before,/Collector delivers a Spark/);assert.match(before,/8 seconds/);assert.match(before,/5 empowered/);
 assert.equal((before.match(/data-reward-slot=/g)||[]).length,3);assert.match(before,/>Equip</);assert.doesNotMatch(before,/SPARKS RECOVERED|slot 2|other artifact|Packed Light/);
 assert.ok(chooseFlightReward(s,'echo-bell'));
 const after=flightRewardMarkup(s,{artifactArt:id=>`<svg data-artifact="${id}"></svg>`});
 assert.equal((after.match(/<article /g)||[]).length,1);assert.match(after,/Collector delivers a Spark/);assert.match(after,/data-id="echo-bell"/);assert.doesNotMatch(after,/ARTIFACT MOUNTED|settled-artifact/);
});
test('resume countdown keeps physics blocked for all three seconds and supports cancellation',()=>{
 let clock=0,callback,completed=0;const number={textContent:'3'},bar={style:{}},panel={querySelector:s=>s==='b'?number:bar,setAttribute(){}};
 const layer={innerHTML:'',querySelector:()=>panel};
 const run=()=>startResumeCountdown(layer,{now:()=>clock,request:cb=>(callback=cb,1),cancel(){callback=null;},onComplete:()=>completed++});
 run();clock=999;callback();assert.equal(number.textContent,'3');assert.equal(completed,0);
 clock=1001;callback();assert.equal(number.textContent,'2');clock=2001;callback();assert.equal(number.textContent,'1');assert.equal(completed,0);
 clock=3000;callback();assert.equal(completed,1);assert.equal(layer.innerHTML,'');
 const cancel=run();cancel();assert.equal(callback,null);assert.equal(completed,1);assert.equal(countdownNumber(-1),3);
});
