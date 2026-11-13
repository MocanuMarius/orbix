import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanOnboarding,markOnboardingSeen,resetOnboarding,nextOnboardingLesson,
 noteOnboardingPrompt,noteOnboardingProgress,onboardingFeatureAvailable,onboardingFlightPlan} from '../dist/onboarding.mjs';

const fresh=()=>({profile:{difficulty:1,stats:{flights:0},clearedFlights:0},run:{id:'run-a',mapIndex:0,step:0,stats:{flights:0,deaths:0},companions:['collector'],current:{id:'flight-a',type:'flight'}}});

test('normal onboarding starts with one short Lift card and postpones skill trees',()=>{
 const state=fresh(),before=structuredClone(state),lesson=nextOnboardingLesson('briefing',{...state,now:1000});
 assert.equal(lesson.id,'onboarding:lift');assert.equal(lesson.steps.length,1);
 assert.ok(lesson.steps[0].text.split(/\s+/).length<40);assert.equal(lesson.steps[0].skipLabel,'Remember & skip');
 assert.deepEqual(state,before,'merely selecting a possible prompt must not write progress');
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'skills'),false);
 state.run.stats.flights=1;noteOnboardingProgress(state.profile,state.run);
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'skills'),true);
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'advanced-skills'),false);
 state.run.restReady=true;noteOnboardingProgress(state.profile,state.run);
 assert.equal(onboardingFeatureAvailable(state.profile,state.run,'advanced-skills'),true);
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
 assert.match(lesson.steps[0].text,/one companion/);assert.match(lesson.steps[0].text,/hearts/);
});

test('artifact onboarding waits for an actual choice and distinguishes the final unlock',()=>{
 const normal=fresh();normal.run.lastFlight={completionBonus:20};normal.run.stats.flights=1;
 assert.equal(nextOnboardingLesson('victory',{...normal,now:1000}).topic,'packed');
 const elite=fresh();elite.run.flightReward={offers:['echo-bell','glow-wick'],claimed:false};
 const lesson=nextOnboardingLesson('victory',{...elite,now:1000});
 assert.equal(lesson.topic,'artifacts');assert.match(lesson.steps[0].text,/two artifacts/);assert.doesNotMatch(lesson.steps[0].text,/slot|replace|melt/i);
 elite.run.flightReward.permanent=true;
 const final=nextOnboardingLesson('victory',{...elite,now:1000});
 assert.match(final.steps[0].text,/future guardian rewards/);assert.match(final.steps[0].text,/begin without artifacts/);
});
