import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,startTutorial,getChoices,selectNode,beginFlightAttempt,finishFlight,chooseFlightReward,getFlightRewardMeltValue,ARTIFACTS} from '../dist/model.mjs';
import {flightRewardMarkup} from '../dist/reward-screen.mjs';
import {startResumeCountdown,countdownNumber} from '../dist/resume-countdown.mjs';
const ready=(elite=false,practice=false)=>{
 const s=newState();if(practice)startTutorial(s);else s.run=createRun(s.profile,'reward-flow');
 const r=s.run;if(!practice)r.stats.flights=1;
 const node=getChoices(r)[0];node.elite=elite;
 assert.ok(selectNode(r,node.id));assert.ok(beginFlightAttempt(r));
 assert.ok(finishFlight(r,{success:true,flame:40,collected:4}));return s;
};
test('ordinary clears offer currency without artifacts; elite choices cannot be melted',()=>{
 const ordinary=ready();assert.deepEqual(ordinary.run.flightReward.offers,[]);assert.equal(ordinary.run.lastFlight.completionBonus,20);
 for(let seed=0;seed<60;seed++){
  const s=newState();s.run=createRun(s.profile,`pair-${seed}`);const r=s.run;r.stats.flights=1;
  const node=getChoices(r)[0];node.elite=true;selectNode(r,node.id);beginFlightAttempt(r);finishFlight(r,{success:true,flame:60});
  assert.equal(r.flightReward.offers.length,2);assert.equal(new Set(r.flightReward.offers).size,2);assert.ok(r.flightReward.offers.every(id=>ARTIFACTS[id]));
  const before=r.condensedGlow,fuel=r.flame;assert.equal(getFlightRewardMeltValue(r.flightReward),0);assert.equal(chooseFlightReward(s,'melt'),false);assert.equal(r.condensedGlow,before);assert.equal(r.flame,fuel);
 }
});
test('taking an artifact appends without replacing owned effects and cannot be repeated',()=>{
 const s=ready(true),r=s.run;r.artifacts=['glow-wick','quiet-cinder','flash-stone'];r.flightReward.offers=['glass-lantern','echo-bell'];
 assert.ok(chooseFlightReward(s,'glass-lantern'));assert.deepEqual(r.artifacts,['glow-wick','quiet-cinder','flash-stone','glass-lantern']);assert.equal(chooseFlightReward(s,'echo-bell'),false);assert.equal(chooseFlightReward(s,'glass-lantern'),false);
});
test('practice artifacts do not alter profile; final guardian unlocks a future reward',()=>{
 const s=ready(true,true),profile=structuredClone(s.profile);s.run.flightReward.offers=['glass-lantern','echo-bell'];
 assert.ok(chooseFlightReward(s,'glass-lantern'));assert.deepEqual(s.profile,profile);
 const boss=ready(true);boss.run.flightReward={offers:['sunheart-engine','echo-bell'],permanent:true,claimed:false};const owned=[...boss.run.artifacts];
 assert.equal(chooseFlightReward(boss,'melt'),false);assert.ok(chooseFlightReward(boss,'sunheart-engine'));assert.ok(boss.profile.ownedArtifacts.includes('sunheart-engine'));assert.deepEqual(boss.run.artifacts,owned);
 const next=createRun(boss.profile,'next');assert.equal(next.artifacts.includes('sunheart-engine'),false);
});
test('reward shows two readable choices and no slot controls; claimed effect remains inspectable',()=>{
 const s=ready(true);s.run.flightReward.offers=['echo-bell','glass-lantern'];s.run.companions=['collector'];
 const options={artifactArt:id=>`<svg data-artifact="${id}"></svg>`};
 const before=flightRewardMarkup(s,options);assert.equal((before.match(/<article /g)||[]).length,2);assert.match(before,/Collector delivers a Spark/);assert.match(before,/Choose one/);assert.doesNotMatch(before,/data-reward-slot|Equip and replace|SPARKS RECOVERED|Packed Light/);
 assert.ok(chooseFlightReward(s,'echo-bell'));const after=flightRewardMarkup(s,options);assert.equal((after.match(/<article /g)||[]).length,1);assert.match(after,/Active for this run/);assert.match(after,/victory-next/);
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
