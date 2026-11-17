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
// Retired (artifacts removed, docs/inscriptions.md): artifact reward screen is replaced by the Scribe.
test.skip('ordinary clears offer currency without artifacts; elite choices cannot be melted',()=>{
 const ordinary=ready();assert.equal(ordinary.run.flightReward,null);assert.equal(ordinary.run.victoryPending,false);assert.equal(flightRewardMarkup(ordinary),'');assert.equal(ordinary.run.lastFlight.completionBonus,15);
 for(let seed=0;seed<60;seed++){
  const s=newState();s.run=createRun(s.profile,`pair-${seed}`);const r=s.run;r.stats.flights=1;
  const node=getChoices(r)[0];node.elite=true;selectNode(r,node.id);beginFlightAttempt(r);finishFlight(r,{success:true,flame:60});
  assert.equal(r.flightReward.offers.length,2);assert.equal(new Set(r.flightReward.offers).size,2);assert.ok(r.flightReward.offers.every(id=>ARTIFACTS[id]));
  const before=r.condensedGlow,fuel=r.flame;assert.equal(getFlightRewardMeltValue(r.flightReward),0);assert.equal(chooseFlightReward(s,'melt'),false);assert.equal(r.condensedGlow,before);assert.equal(r.flame,fuel);
 }
});
// Retired (artifacts removed, docs/inscriptions.md): artifact reward screen is replaced by the Scribe.
test.skip('taking an artifact appends without replacing owned effects and cannot be repeated',()=>{
 const s=ready(true),r=s.run;r.artifacts=['glow-wick','quiet-cinder','flash-stone'];r.flightReward.offers=['glass-lantern','echo-bell'];
 assert.ok(chooseFlightReward(s,'glass-lantern'));assert.deepEqual(r.artifacts,['glow-wick','quiet-cinder','flash-stone','glass-lantern']);assert.equal(chooseFlightReward(s,'echo-bell'),false);assert.equal(chooseFlightReward(s,'glass-lantern'),false);
});
// Retired (artifacts removed, docs/inscriptions.md): artifact reward screen is replaced by the Scribe.
test.skip('practice artifacts do not alter profile; final guardian unlocks a future reward',()=>{
 const s=ready(true,true),profile=structuredClone(s.profile);s.run.flightReward.offers=['glass-lantern','echo-bell'];
 assert.ok(chooseFlightReward(s,'glass-lantern'));assert.deepEqual(s.profile,profile);
 const boss=ready(true);boss.run.flightReward={offers:['sunheart-engine','echo-bell'],permanent:true,claimed:false};const owned=[...boss.run.artifacts];
 assert.equal(chooseFlightReward(boss,'melt'),false);assert.ok(chooseFlightReward(boss,'sunheart-engine'));assert.ok(boss.profile.ownedArtifacts.includes('sunheart-engine'));assert.deepEqual(boss.run.artifacts,owned);
 const next=createRun(boss.profile,'next');assert.equal(next.artifacts.includes('sunheart-engine'),false);
});
// Retired (artifacts removed, docs/inscriptions.md): artifact reward screen is replaced by the Scribe.
test.skip('reward shows two readable choices and no slot controls; claimed effect remains inspectable',()=>{
 const s=ready(true);s.run.flightReward.offers=['echo-bell','glass-lantern'];s.run.companions=['collector'];
 const options={artifactArt:id=>`<svg data-artifact="${id}"></svg>`};
 const before=flightRewardMarkup(s,options);assert.equal((before.match(/<article /g)||[]).length,2);assert.match(before,/Collector delivers a Spark/);assert.match(before,/Choose one/);assert.doesNotMatch(before,/data-reward-slot|Equip and replace|SPARKS RECOVERED|Packed Light/);
 assert.equal((before.match(/data-action="reward-artifact-details"/g)||[]).length,2);
 assert.ok(chooseFlightReward(s,'echo-bell'));const after=flightRewardMarkup(s,options);assert.equal((after.match(/<article /g)||[]).length,1);assert.match(after,/data-acquired-presentation="horizontal"/);assert.match(after,/relic acquired/);assert.match(after,/data-action="reward-artifact-details" data-id="echo-bell"/);assert.match(after,/victory-next/);
});
// Retired (artifacts removed, docs/inscriptions.md): artifact reward screen is replaced by the Scribe.
test.skip('claimed relic presentation preserves choice, discovery and generic clear flows',()=>{
 const s=ready(true);s.run.flightReward.offers=['echo-bell','glass-lantern'];
 assert.doesNotMatch(flightRewardMarkup(s),/data-acquired-presentation/);
 assert.ok(chooseFlightReward(s,'echo-bell'));
 for(const presentation of ['pedestal','horizontal','compact'])assert.match(flightRewardMarkup(s,{acquiredPresentation:presentation}),new RegExp(`data-acquired-presentation="${presentation}"`));
 s.run.flightReward.permanent=true;assert.doesNotMatch(flightRewardMarkup(s),/data-acquired-presentation/);
 s.run.flightReward.permanent=false;s.run.lastFlight.elite=false;s.run.lastFlight.boss=false;s.run.flightReward.offers=[];assert.equal(flightRewardMarkup(s),'');
 s.run.lastFlight.elite=true;s.run.flightReward={offers:[],claimed:true};assert.match(flightRewardMarkup(s),/Passage secured/);assert.doesNotMatch(flightRewardMarkup(s),/data-acquired-presentation/);
 s.run.flightReward={offers:[],chosen:'echo-bell',claimed:false};assert.doesNotMatch(flightRewardMarkup(s),/data-acquired-presentation/);
});
// Retired (artifacts removed, docs/inscriptions.md): artifact reward screen is replaced by the Scribe.
test.skip('claimed relic actions follow actual build availability',()=>{
 const s=ready(true);assert.ok(chooseFlightReward(s,s.run.flightReward.offers[0]));
 const cards=flightRewardMarkup(s,{deckAvailable:true,skillsAvailable:false,upgradeCount:4});
 assert.match(cards,/data-action="cards">Deck/);assert.doesNotMatch(cards,/data-action="skills"|>Upgrade</);
 const skills=flightRewardMarkup(s,{skillsAvailable:true,upgradeCount:0});assert.match(skills,/data-action="skills">Skills/);assert.doesNotMatch(skills,/>Deck</);
 const upgrade=flightRewardMarkup(s,{skillsAvailable:true,upgradeCount:2});assert.match(upgrade,/data-action="skills">Upgrade/);
 const locked=flightRewardMarkup(s,{skillsAvailable:false,deckAvailable:false});assert.match(locked,/acquired-no-build/);assert.doesNotMatch(locked,/data-action="skills"|data-action="cards"/);assert.match(locked,/Full rules|victory-next/);
});
// Retired (artifacts removed, docs/inscriptions.md): artifact reward screen is replaced by the Scribe.
test.skip('claimed relic boon and receipt reflect real awards and handle no bonus',()=>{
 const s=ready(true);assert.ok(chooseFlightReward(s,s.run.flightReward.offers[0]));
 s.run.lastFlight={elite:true,routeBonus:{id:'wild-circuit'},cardClearReceipt:{}};
 const empty=flightRewardMarkup(s);assert.match(empty,/acquired-no-boon/);assert.doesNotMatch(empty,/acquired-boon"|data-action="reward-earnings"|Wild Circuit/);
 s.run.lastFlight.routeBonus={id:'wayfinder',message:'Wayfinder challenge completed.'};assert.doesNotMatch(flightRewardMarkup(s),/acquired-boon"|data-action="reward-earnings"/);
 s.run.lastFlight.routeBonus={id:'wild-circuit',name:'Heartwood Trail',amount:0,message:'Heartwood Trail · +3 maximum Sparks permanently'};
 const special=flightRewardMarkup(s);assert.match(special,/acquired-has-boon/);assert.doesNotMatch(special,/Heartwood Trail/);assert.match(special,/\+3 maximum Sparks permanently/);assert.doesNotMatch(special,/Companion recovery/);assert.match(special,/data-action="reward-earnings"/);
 s.run.lastFlight.routeBonus={id:'precision',amount:8};assert.doesNotMatch(flightRewardMarkup(s),/Pilgrim Precision/);assert.match(flightRewardMarkup(s),/\+8 Stored Sparks/);
 delete s.run.lastFlight.routeBonus;s.run.lastFlight.cardClearReceipt={futureCapacity:3};const growth=flightRewardMarkup(s);assert.match(growth,/data-action="reward-earnings"/);assert.match(growth,/acquired-no-boon/);
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
