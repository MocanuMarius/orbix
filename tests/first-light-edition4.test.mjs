import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import * as M from '../dist/model.mjs';
import {WispFlight,circleHitsObstacle} from '../dist/flight.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {PRACTICE_EDITION,isPlayablePractice,isPracticeCourseRun,practiceCardFaces,reorderPracticeCards,nextPracticeLesson,practiceModifiers} from '../dist/practice-route.mjs';
import {PRACTICE_STOPS,PRACTICE_LESSONS,PRACTICE_STOP_SPACING,practiceLessonStep,practiceCourseLesson,practiceCampLesson,freeBand,worldXAt,lessonWords} from '../dist/practice-course.mjs';
import {tutorialEntryLesson,getTutorialHint,notePracticeHint,carryPracticeHints,takeCarriedPracticeHint} from '../dist/tutorial.mjs';
import {deckScreenMarkup,createDeckView} from '../dist/ui/deck-screen.mjs';
import {practiceCardRun} from '../dist/practice-route.mjs';
import {coachTermsMarkup} from '../dist/tutorial-coach.mjs';

const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvasFor=(width=900,height=405)=>({width,height,style:{},getContext:()=>context,getBoundingClientRect:()=>({width,height})});
const storage=()=>{let data;return {setItem:(_,v)=>{data=v},getItem:()=>data};};
function practice(options={}){const s=M.newState();M.startTutorial(s,options);return s;}
function flightAt(s,row,{width=900,height=405}={}){
 const r=s.run,node=r.map[row][0];r.current=node;
 return new WispFlight({canvas:canvasFor(width,height),preflight:true,node,seed:`e4-${node.id}`,terrain:node.terrain,duration:node.duration,flame:100,companions:['collector'],modifiers:M.getRunModifiers(r)});
}
const sentences=text=>text.split(/(?<=[.!?])\s+/).filter(Boolean).length;

test('Edition 4 is seven stops in the brief’s order, on real catalog courses in six biomes',()=>{
 const s=practice(),r=s.run;
 assert.equal(PRACTICE_EDITION,4);assert.equal(r.tutorialEdition,4);assert.ok(isPlayablePractice(r));assert.ok(isPracticeCourseRun(r));
 assert.deepEqual(r.map.map(row=>row[0].id),['practice-first-light','practice-collector','practice-light','practice-edge','practice-camp','practice-chain','practice-finale']);
 assert.equal(r.lives,3,'no deliberately missing heart');assert.deepEqual(r.practiceCards,[]);
 const flights=r.map.flat().filter(n=>n.type!=='support');
 const levels=flights.map(n=>BIOME_LEVELS.find(level=>level.id===n.levelId));
 assert.ok(levels.every(Boolean),'every course is a real catalog level');
 assert.equal(new Set(levels.map(l=>l.biomeId)).size,6,'six different biomes');
 assert.equal(r.map.at(-1)[0].type,'finale');assert.equal(r.map.at(-1)[0].boss,false,'a short finish, no guardian');
 // What each stop teaches, one idea at a time, simple to complex.
 assert.deepEqual(PRACTICE_STOPS.map(stop=>[stop.entry||null,...(stop.flight||stop.camp||[])].filter(Boolean)),[
  ['practice:lift','practice:sparks'],['practice:meet-collector','practice:collector-fetch'],['practice:luminance','practice:flash'],
  ['practice:proximity'],['practice:chain','practice:boost'],['practice:black-hole'],['practice:hearts','practice:shield']]);
 assert.ok(PRACTICE_STOPS.indexOf(PRACTICE_STOPS.find(s=>s.entry==='practice:meet-collector'))<PRACTICE_STOPS.findIndex(s=>s.camp),'Collector before cards');
});

test('every lesson is one idea in at most two short sentences, and nothing is taught twice',()=>{
 const texts=new Set();
 for(const [id,lesson] of Object.entries(PRACTICE_LESSONS)){
  assert.ok(sentences(lesson.text)<=2,`${id}: two sentences at most`);assert.ok(lessonWords(id)<=24,`${id}: short (${lessonWords(id)} words)`);
  assert.ok(!texts.has(lesson.text));texts.add(lesson.text);
 }
 const taught=PRACTICE_STOPS.flatMap(stop=>[stop.entry,...(stop.flight||[]),...(stop.camp||[])].filter(Boolean));
 assert.equal(new Set(taught).size,taught.length);assert.deepEqual(new Set(taught),new Set(Object.keys(PRACTICE_LESSONS)));
 for(const stop of PRACTICE_STOPS.filter(stop=>stop.type!=='support'))assert.ok([stop.entry,...stop.flight].filter(Boolean).length<=2,`${stop.id}: at most two lesson stops in a flight`);
 assert.match(coachTermsMarkup(['trigger','collect']),/data-card-term="trigger".*data-card-term="collect"/,'lessons link to the glossary');
});

test('courses are the real levels, calmed: no terrace rooms, drafts, biome actors or stray hazards',()=>{
 const s=practice();
 for(const [row,node] of s.run.map.entries()){
  if(node[0].type==='support')continue;
  for(const height of [300,405]){
   const e=flightAt(s,row,{width:Math.round(height*2.22),height});
   try{
    assert.equal(e.levelIdentity.id,node[0].levelId);
    assert.ok(e.layout.obstacles.every(o=>o.pattern!=='practice-terraces'),'the real course, not the Edition 3 terrace room');
    assert.ok(e.layout.obstacles.some(o=>String(o.pattern).startsWith(BIOME_LEVELS.find(l=>l.id===node[0].levelId).biomeId)),'its own biome patterns');
    assert.equal(e.drafts.zones.length,0);assert.ok(e.biomeDynamics.items.every(item=>item.practiceStaged));
    assert.ok(e.layout.embers.length>=12,'fuel is placed for the lesson');
    // Quiet opening: no solid terrain and no pickup in the first two seconds.
    assert.ok(e.layout.embers.every(p=>p.x>worldXAt(e,2)));
    for(const p of e.layout.embers.filter(p=>!p.stagedMiss))assert.ok(e.layout.obstacles.every(o=>!circleHitsObstacle(p.x,p.y,e.player.radius,o,0)),`${node[0].id}: ${p.feature} reachable by body`);
   }finally{e.destroy();}
  }
 }
});

test('the taught element sits where its lesson needs it, alone, with room to try it twice',()=>{
 const s=practice();
 const light=flightAt(s,2);try{const f=light.tutorial.plan.flashes;assert.equal(f.length,2);assert.ok(f.every(p=>p.kind==='sight'));
  assert.ok(f[1].x-f[0].x>light.baseSpeed*5,'second Flare several seconds later');}finally{light.destroy();}
 const chain=flightAt(s,5);try{
  const holes=chain.blackHoles.items;assert.equal(holes.length,2);
  for(const hole of holes){assert.ok(Math.abs(hole.bypass.y-hole.y)>=chain.height*.42,'wide bypass');
   for(let x=hole.bypass.startX;x<=hole.bypass.endX;x+=30)assert.ok(chain.layout.obstacles.every(o=>!circleHitsObstacle(x,hole.bypass.y,chain.player.radius,o,0)),'bypass lane is clear terrain');
   assert.ok(chain.layout.embers.filter(p=>p.blackHoleBypass&&Math.abs(p.x-hole.x)<300).length>=4,'Sparks mark the bypass');}
  assert.ok(holes[0].x>worldXAt(chain,PRACTICE_STOP_SPACING+2),'the first Black Hole appears after the free stretch');
 }finally{chain.destroy();}
 const finale=flightAt(s,6);try{const cone=finale.tutorial.plan.cone;assert.equal(cone.kind,'pinecone');assert.equal(cone.hinted,true,'no event text');
  assert.ok(cone.x>worldXAt(finale,PRACTICE_STOP_SPACING));}finally{finale.destroy();}
});

test('Proximity skim lanes really charge a Pulse along a real floor without touching it',()=>{
 const s=practice();
 for(const height of [300,405,620]){
  const e=flightAt(s,3,{width:Math.round(height*2.22),height});
  try{
   assert.equal(e.mod.proximityUnlocked,true,'Proximity is lent from this stop');
   const lanes=e.tutorial.plan.lanes;assert.equal(lanes.length,2);assert.ok(lanes.every(l=>l.length>=7));
   e.running=true;e.tutorialAwaitingLift=false;
   const lane=lanes[0];
   for(let i=0;i<lane.length-1&&!e.edgingPulse.triggerCount;i++){
    const a=lane[i],b=lane[i+1];
    for(let k=0;k<20;k++){const x=a.x+(b.x-a.x)*k/20,y=a.y+(b.y-a.y)*k/20;e.distance=x-e.player.x;e.player.y=y;e.player.vy=0;
     assert.ok(e.layout.obstacles.every(o=>!circleHitsObstacle(x,y,e.player.radius,o,0)),'the lane never touches rock');
     e.time+=(b.x-a.x)/20/e.baseSpeed;e.edgingPulse.update((b.x-a.x)/20/e.baseSpeed,e.layout.obstacles);}
   }
   assert.ok(e.edgingPulse.triggerCount>0,`a Pulse at height ${height}`);
  }finally{e.destroy();}
 }
});

test('Collector rests until its staged miss, then really fetches and delivers it',()=>{
 const s=practice(),e=flightAt(s,1);
 try{
  e.running=true;e.tutorialAwaitingLift=false;
  const staged=e.layout.embers.find(p=>p.stagedMiss);assert.ok(staged);
  // Fly level through the course; the staged Spark travels beside the wisp, out of body reach.
  let delivered=false,restingBefore=true,sawFetch=false;
  for(let i=0;i<60*24&&!e.finished&&!e.dying;i++){
   const band=freeBand(e,e.distance+e.player.x+40);
   if(band){e.player.y=Math.min(Math.max(e.player.y,band.top+20),band.bottom-20);}e.player.vy=0;
   e.step(1/60);
   if(e.distance+e.player.x<e.tutorial.plan.collectorWakeX&&e.wisp.target)restingBefore=false;
   sawFetch||=['outbound','returning','reeling'].includes(e.wisp.phase);
   if(e.tutorial.carrierDeliveries>0){delivered=true;break;}
  }
  assert.ok(restingBefore,'no fetching before the staged stretch');assert.ok(sawFetch);assert.ok(delivered,'a real delivery');
  assert.ok(e.tutorial.ready['practice:collector-fetch']>=PRACTICE_STOP_SPACING,'the lesson becomes ready only after 12 s');
 }finally{e.destroy();}
});

test('a staged pine cone gives a guaranteed safe Collector save in the finish',()=>{
 const s=practice(),e=flightAt(s,6);
 try{
  assert.equal(e.mod.collectorGuard,true,'the shield is lent only here');
  e.running=true;e.tutorialAwaitingLift=false;
  for(let i=0;i<60*20&&!e.tutorial.shieldSaved&&!e.dying;i++){const band=freeBand(e,e.distance+e.player.x+40);if(band)e.player.y=band.mid;e.player.vy=0;e.step(1/60);}
  assert.equal(e.dying,false,'the crash is caught');assert.equal(e.tutorial.shieldSaved,true);assert.equal(e.wisp.phase,'guard-recovery');
  assert.ok(e.tutorial.ready['practice:shield']>=PRACTICE_STOP_SPACING);
 }finally{e.destroy();}
 const plain=practice();plain.run.current=plain.run.map[5][0];assert.equal(M.getRunModifiers(plain.run).collectorGuard,false,'no shield before the finish');
});

test('scripted delayed pilot: stops follow the table, at most two per flight, 12 s of free flight before and between',async()=>{
 const {flyPracticeStop}=await import('../scripts/practice-pilot.mjs');
 const s=practice(),r=s.run;
 for(const [row,cell] of r.map.entries()){
  const node=cell[0];r.step=row;r.phase='map';r.path=r.map.slice(0,row).map(x=>x[0].id);
  assert.ok(M.selectNode(r,node.id));
  if(node.type==='support'){
   assert.deepEqual(practiceCardFaces(r).map(c=>c.cardId),['crescendo','body-spark','courier-tip']);
   assert.equal(practiceCampLesson('support',r).id,'practice:chain');
   for(const id of ['practice:chain','practice:boost'])(r.guideSeen||={})[id]=true;
   assert.ok(M.resolveSupport(r,0,s.profile));continue;
  }
  assert.ok(M.beginFlightAttempt(r));
  const {success,stops}=flyPracticeStop(s,{style:'human250',controllerSeed:1});
  const stop=PRACTICE_STOPS[row];
  assert.ok(success,`${node.id} cleared`);
  assert.deepEqual(stops.map(x=>x.id),[stop.entry,...stop.flight].filter(Boolean),`${node.id} teaches its own lessons, in order`);
  assert.ok(stops.length<=2);
  let last=0;for(const x of stops.filter(x=>x.kind==='flight')){assert.ok(x.t-last>=PRACTICE_STOP_SPACING-1e-6,`${x.id} after ${x.t-last}s of free flight`);last=x.t;}
  assert.ok(stops.every(x=>x.paused),'every lesson stops the simulation');
  M.finishFlight(r,{success:true,flame:80});r.phase='map';
 }
});

test('in-flight lessons go through the production pause, then resume only on the card’s button',()=>{
 const s=practice(),r=s.run,e=flightAt(s,2);
 try{
  e.running=true;e.tutorialAwaitingLift=false;e.time=13;e.tutorial.ready={'practice:flash':12.5};e.canShowContextHint=()=>true;
  {const f=e.tutorial.plan.flashes[0];f.collected=false;f.x=e.distance+e.player.x+100;f.y=e.player.y;}// the Flare is lit and on screen
  const step=nextPracticeLesson(e,r);assert.equal(step.id,'practice:flash');assert.equal(step.actionLabel,'Continue');assert.equal(step.skipLabel,false);
  const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),from=source.indexOf('function worldFocusTarget('),to=source.indexOf('function worldLesson()',from),calls=[];
  const ctx=createContext({state:{run:r,settings:{}},engine:e,paused:false,lesson:null,lastSnapshot:{},document:{querySelector:()=>null},
   FIRST_LIGHT_COMBO:'x',FIRST_FLIGHT_STOPS:new Set(),firstLightComboLesson:()=>null,firstLightComboQuiet:()=>false,nextPracticeLesson,automaticTipsEnabled:()=>true,
   deferPracticeLesson:()=>false,armFirstLightCombo:()=>false,persist:()=>{},hud:null,
   pauseFlight:()=>{e.paused=true;calls.push('pause');},startLesson:(id,steps,done)=>{assert.equal(e.paused,true,'paused before the card');calls.push(['lesson',id]);ctx.done=done;},resumeFlight:()=>calls.push('resume')});
  runInContext(source.slice(from,to),ctx);ctx.practiceWorldLesson();
  assert.deepEqual(calls,['pause',['lesson','practice:flash']]);
  ctx.done();assert.equal(calls.at(-1),'resume');
  // Too soon after a stop: nothing. Twelve seconds of free flight are required between stops.
  r.guideSeen={};e.paused=false;e.practiceCoachAt=e.time-5;assert.equal(practiceCourseLesson(e,r),null);
  e.practiceCoachAt=-Infinity;e.time=11.9;assert.equal(practiceCourseLesson(e,r),null,'never before 12 s');
  assert.ok(source.includes("setText(hud.event,isPracticeCourseRun(run)?'':flightCue(s))"),'no event banner text over a running practice flight');
  assert.equal(getTutorialHint(e),null,'the engine offers no hint text to queue');assert.equal(notePracticeHint(e,r,getTutorialHint(e)),false);
 }finally{e.destroy();}
});

test('a lesson that points at a world object waits until the object is lit and on screen',()=>{
 const s=practice(),r=s.run,e=flightAt(s,2);
 try{
  r.guideSeen={};e.paused=false;e.practiceCoachAt=-Infinity;e.time=13;e.running=true;e.tutorialAwaitingLift=false;e.tutorial.ready={'practice:flash':12.5};
  const f=e.tutorial.plan.flashes[0],radius=e.getLightState().radius,px=e.distance+e.player.x;f.collected=false;f.y=e.player.y;
  f.x=px+radius+60;assert.ok(f.x-e.distance<e.width-30,'on screen but outside the lit radius');
  assert.equal(practiceCourseLesson(e,r),null,'a Flare in the dark is not pointed at');
  f.x=px+radius*.5;const step=practiceCourseLesson(e,r);
  assert.equal(step?.id,'practice:flash');assert.ok(step.point||step.target||step,'lit Flare: the lesson fires');
  f.x=e.distance+e.width+40;assert.equal(practiceCourseLesson(e,r),null,'off screen: still waiting');
 }finally{e.destroy();}
});

test('a lesson whose moment passed without a safe stop is taught once at the next checkpoint',()=>{
 const s=practice(),r=s.run,e=flightAt(s,0);
 try{
  e.tutorial.ready={'practice:sparks':13};carryPracticeHints(e,r);
  const carried=takeCarriedPracticeHint(r);assert.equal(carried.id,'practice:sparks');assert.equal(takeCarriedPracticeHint(r),null);
  r.guideSeen={'practice:sparks':true};e.tutorial.ready={'practice:sparks':13};carryPracticeHints(e,r);assert.equal(takeCarriedPracticeHint(r),null,'seen lessons never return');
 }finally{e.destroy();}
});

test('the camp lends three reorderable cards whose order matters; loans cannot be melted and vanish with practice',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'real-cards',1,{cards:true});const real=structuredClone(s.run),profile=structuredClone(s.profile);
 M.startTutorial(s);const r=s.run;r.step=4;r.phase='map';r.path=r.map.slice(0,4).map(x=>x[0].id);
 assert.ok(M.selectNode(r,'practice-camp'));
 assert.equal(M.isCardRun(r),false,'practice is never a campaign card run');
 const [crescendo,body,courier]=r.practiceCards;assert.deepEqual([crescendo,body,courier].map(c=>c.cardId),['crescendo','body-spark','courier-tip']);
 const markup=deckScreenMarkup(practiceCardRun(r),createDeckView(),{locked:false,loaned:true});
 assert.match(markup,/data-loaned="true"/);assert.match(markup,/dk2-swap/,'Swap is offered at the camp');assert.doesNotMatch(markup,/dk2-melt/);
 assert.ok(practiceModifiers(r).practiceCards);
 assert.equal(reorderPracticeCards(r,crescendo.instanceId,2,courier.instanceId),true);
 assert.deepEqual(r.practiceCards.map(c=>c.cardId),['courier-tip','body-spark','crescendo']);assert.equal(r.practiceChainArranged,true);
 assert.equal(reorderPracticeCards(r,crescendo.instanceId,0,'wrong'),false,'a stale move is refused');
 // Order matters in the real engine: Crescendo doubles Body Spark only from the right.
 const collectBonus=cards=>{const run={...r,practiceCards:cards,current:r.map[5][0]},e=new WispFlight({canvas:canvasFor(),preflight:true,node:r.map[5][0],duration:30,flame:20,companions:['collector'],modifiers:M.getRunModifiers(run)});
  try{e.running=true;e.tutorialAwaitingLift=false;const p={id:'t',kind:'light',x:e.distance+e.player.x,y:e.player.y,value:1,fuel:true,collected:false};e.layout.embers.push(p);const f=e.flame;e.collect(p);return Math.round((e.flame-f)/3*10)/10;}finally{e.destroy();}};
 assert.ok(collectBonus([body,courier,crescendo])>collectBonus([crescendo,body,courier]),'Slot 3 Crescendo pays more on Collect');
 r.flame=40;assert.ok(M.resolveSupport(r,0,s.profile));assert.equal(r.flame,100,'the camp refills the Spark Meter');
 assert.ok(M.leaveTutorial(s));assert.deepEqual(s.run,real,'the real run is restored exactly');assert.equal(s.run.practiceCards,undefined);
 assert.deepEqual(s.profile.cardFutureCapacity,profile.cardFutureCapacity);assert.deepEqual(s.profile.stats,profile.stats);
 assert.equal(reorderPracticeCards(s.run,crescendo.instanceId,0),false,'nothing to reorder outside practice');
});

test('completion: the real run returns, taught topics are remembered and the starting-card step follows',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'suspended',1,{cards:true});
 M.startTutorial(s,{forNewGame:true,difficulty:1});const r=s.run;
 // Saving normalises the stored card run once (its own migration); compare against what was saved.
 const store=storage();M.saveState(s,store);const original=structuredClone(s.suspendedRun);const loaded=M.loadState(store);assert.equal(loaded.run.tutorialEdition,4);assert.equal(loaded.suspendedRun.id,original.id);
 const restored=structuredClone(loaded.suspendedRun);assert.ok(M.leaveTutorial(loaded));assert.deepEqual(loaded.run,restored,'reloaded practice hands back the suspended run exactly');
 for(const id of Object.keys(PRACTICE_LESSONS))(r.guideSeen||={})[id]=true;
 while(r.phase!=='ended'){
  const n=M.getChoices(r)[0];assert.ok(M.selectNode(r,n.id));
  if(n.type==='support'){assert.ok(M.resolveSupport(r,0,s.profile));continue;}
  assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:true,flame:70}));
 }
 assert.equal(r.success,true);assert.deepEqual(r.tutorialContinuation,{difficulty:1});
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(app,/Next: choose your starting \$\{starterNoun\(\)\} for the real run/);
 assert.ok(M.leaveTutorial(s));assert.deepEqual(s.run,original);assert.equal(s.profile.tutorialComplete,true);
 for(const topic of ['lift','collector','collector-recovery','luminance','special-sparks','edging','black-hole','hearts'])assert.ok(s.profile.onboarding.seen.includes(topic),topic);
 const gift=M.createRun(s.profile,'fresh',1,{cards:true});assert.equal(gift.practiceCards,undefined);
});

test('Cards and Legacy saves stay isolated, and practice never touches the score book or permanent gains',()=>{
 const s=M.newState();const before=structuredClone(s.profile);M.startTutorial(s);const r=s.run;
 while(r.phase!=='ended'){const n=M.getChoices(r)[0];M.selectNode(r,n.id);if(n.type==='support'){M.resolveSupport(r,0,s.profile);continue;}M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:70,cardFutureCapacity:9,condensedGlow:50});}
 for(const key of ['stats','cardFutureCapacity','cardCruisingSpeed','difficulty','bankedRuns','clearedFlights'])assert.deepEqual(s.profile[key],before[key],key);
 assert.equal(r.condensedGlow,0,'only the practice wallet moves');
});
