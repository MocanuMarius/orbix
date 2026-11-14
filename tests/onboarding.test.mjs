import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanOnboarding,markOnboardingSeen,resetOnboarding,nextOnboardingLesson,
 noteOnboardingPrompt,noteOnboardingProgress,onboardingFeatureAvailable,onboardingFlightPlan} from '../dist/onboarding.mjs';
import {resourceCycleSteps,resourceCycleArt} from '../dist/resource-cycle.mjs';

const fresh=()=>({profile:{difficulty:1,stats:{flights:0},clearedFlights:0},run:{id:'run-a',mapIndex:0,step:0,stats:{flights:0,deaths:0},companions:['collector'],current:{id:'flight-a',type:'flight'}}});

test('the first briefing teaches the resource cycle before flight and postpones skill trees',()=>{
 const state=fresh(),before=structuredClone(state),lesson=nextOnboardingLesson('briefing',{...state,now:1000});
 assert.equal(lesson.id,'onboarding:lift');
 assert.deepEqual(lesson.steps.map(s=>s.cycle.stage),[0,1,2]);
 assert.deepEqual(lesson.steps[0].cycle.values,[6,12,18]);
 assert.match(lesson.steps[0].text,/crackling Spark adds 12 to your Spark Meter/);
 assert.match(lesson.steps[1].text,/24\/30.*Tap anywhere to Lift.*3 Sparks/);
 assert.match(lesson.steps[2].text,/spare 6 into 1 Stored Spark\..*Rest/);
 assert.ok(lesson.steps[0].text.split(/\s+/).length<40);assert.equal(lesson.steps[0].skipLabel,'Remember & skip');
 assert.deepEqual(state,before,'merely selecting a possible prompt must not write progress');
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'skills'),false);
 state.run.stats.flights=1;noteOnboardingProgress(state.profile,state.run);
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'skills'),true);
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'advanced-skills'),false);
 state.run.restReady=true;noteOnboardingProgress(state.profile,state.run);
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'advanced-skills'),true);
});

test('the lesson follows the equipped Lift and storage efficiency without spending resources',()=>{
 const run={condensedGlow:61},before=structuredClone(run);
 const steps=resourceCycleSteps(run,{liftCostPoints:1,condensationRules:{multiplier:1/3}});
 assert.match(steps[1].text,/uses 1 Spark from the meter/);
 assert.match(steps[2].text,/2 Stored Sparks/);
 assert.match(resourceCycleArt(steps[2].cycle),/\+2<\/text>/);
 assert.deepEqual(run,before);
});

test('remembering a topic survives a new run and a cleaned profile; reset replays it',()=>{
 const {profile,run}=fresh();markOnboardingSeen(profile,'onboarding:lift');
 const restored={...profile,onboarding:cleanOnboarding(JSON.parse(JSON.stringify(profile.onboarding)))};
 assert.equal(nextOnboardingLesson('briefing',{profile:restored,run:{...run,id:'new-run'}}),null);
 restored.ownedArtifacts=['sunheart-engine'];restored.stats.flights=20;resetOnboarding(restored);
 assert.equal(onboardingFlightPlan(restored,run).gentleOpening,true,'Reset can replay the gradual intro for an experienced player');
 assert.equal(onboardingFeatureAvailable(restored,run,'skills'),false);
 assert.equal(nextOnboardingLesson('briefing',{profile:restored,run}).id,'onboarding:lift');
 assert.deepEqual(restored.ownedArtifacts,['sunheart-engine']);
});

test('one checkpoint prompt and one flight prompt prevent modal trains; death bypasses delay',()=>{
 const state=fresh();noteOnboardingPrompt(state.run,'briefing',{now:1000});
 assert.equal(nextOnboardingLesson('briefing',{...state,now:40000}),null,'one card per route checkpoint');
 const first=nextOnboardingLesson('flight',{...state,flight:{time:18},now:2000});
 assert.equal(first.id,'onboarding:luminance');
 noteOnboardingPrompt(state.run,'flight',{flight:{time:18},now:2000});markOnboardingSeen(state.profile,first.id);
 assert.equal(nextOnboardingLesson('flight',{...state,flight:{time:50},snapshot:{blackHole:{rate:10}},now:90000}),null);
 state.run.stats.deaths=1;
 assert.equal(nextOnboardingLesson('death',{...state,now:2001}).id,'onboarding:hearts');
 state.run.current={id:'flight-b',type:'flight'};state.run.stats.flights=1;
 assert.equal(nextOnboardingLesson('flight',{...state,flight:{time:13},now:90000}).id,'onboarding:collector');
});

test('first-time flights introduce drafts, special Sparks and Black Holes in stages',()=>{
 const state=fresh();let plan=onboardingFlightPlan(state.profile,state.run);
 assert.equal(plan.gentleOpening,true);assert.equal(plan.drafts,false);assert.equal(plan.specialSparks,false);assert.equal(plan.blackHoles,false);
 state.run.stats.flights=1;plan=onboardingFlightPlan(state.profile,state.run);assert.equal(plan.drafts,true);assert.equal(plan.specialSparks,false);
 state.run.stats.flights=2;plan=onboardingFlightPlan(state.profile,state.run);assert.equal(plan.specialSparks,true);assert.equal(plan.blackHoles,false);
 state.run.stats.flights=3;assert.equal(onboardingFlightPlan(state.profile,state.run).blackHoles,true);
 state.profile.stats.flights=20;state.run.stats.flights=0;plan=onboardingFlightPlan(state.profile,state.run);
 assert.equal(plan.enabled,false);assert.equal(plan.blackHoles,true,'experienced players retain full authored maps');
});

test('the first map teaches rewards and Rest when encountered, not at the opening menu',()=>{
 const state=fresh();state.run.stats.flights=1;state.run.flightReward={nodeId:'flight-a',offers:['glow-wick'],claimed:false};
 let lesson=nextOnboardingLesson('victory',{...state,now:1000});assert.equal(lesson.topic,'artifacts');
 markOnboardingSeen(state.profile,lesson.id);noteOnboardingPrompt(state.run,'victory',{now:1000});
 state.run.flightReward.claimed=true;state.run.flightReward.chosen='melt';
 assert.equal(nextOnboardingLesson('victory',{...state,now:40000}),null,'equipping does not append another tutorial to the same reward');
 state.run.current={id:'rest-a',kind:'camp',type:'support'};
 lesson=nextOnboardingLesson('support',{...state,now:40000});assert.equal(lesson.topic,'rest');
 assert.match(lesson.steps[0].text,/Recover restores missing hearts/);
 assert.match(lesson.steps[0].text,/Grow adds 3 Spark capacity/);
 assert.match(lesson.steps[0].text,/spend Stored Sparks on skills/);
 assert.doesNotMatch(lesson.steps[0].text,/Dream/,'unowned optional mechanics are not advertised at every Rest');
 assert.doesNotMatch(lesson.steps[0].text,/equip|switch|change.*companion/i,'Rest does not change the run companion');
 const companion=nextOnboardingLesson('companions',{...state,now:40000});
 assert.match(companion.steps[0].text,/Choose on the main screen; your companion stays for the entire run/);
});

test('artifact onboarding waits for a choice, ordinary income is taught on the map, and final victory teaches progression',()=>{
 const normal=fresh();normal.run.lastFlight={success:true,completionBonus:20};normal.run.stats.flights=1;
 assert.equal(nextOnboardingLesson('victory',{...normal,now:1000}),null,'ordinary clears have no reward page lesson');
 assert.equal(nextOnboardingLesson('map',{...normal,now:1000}).topic,'packed');
 const elite=fresh();elite.run.flightReward={offers:['echo-bell','glow-wick'],claimed:false};
 const lesson=nextOnboardingLesson('victory',{...elite,now:1000});
 assert.equal(lesson.topic,'artifacts');assert.match(lesson.steps[0].text,/two artifacts/);assert.doesNotMatch(lesson.steps[0].text,/slot|replace|melt/i);
 const completed=fresh();Object.assign(completed.run,{mapIndex:2,phase:'ended',success:true,bossDefeated:true,flightReward:null,lastFlight:{success:true,boss:true}});
 assert.equal(nextOnboardingLesson('victory',{...completed,now:1000}),null,'the final guardian has no artifact choice to explain');
 const final=nextOnboardingLesson('result',{...completed,now:1000});
 assert.equal(final.topic,'progression');assert.match(final.steps[0].text,/unlock the next Ascension/);
});
