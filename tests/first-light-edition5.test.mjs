// First Light, Edition 5: the card Chain taught gradually (docs/tutorial-redesign-proposal.md, "Edition 5").
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import * as M from '../dist/model.mjs';
import {WispFlight,circleHitsObstacle} from '../dist/flight.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {CARD_TERMS} from '../dist/card-terms.mjs';
import {PRACTICE_EDITION,isPracticeCourseRun,practiceCardRun,placePracticeCard,practiceStopReady,practiceScribeWrite,nextPracticeLesson,migratePracticeRun} from '../dist/practice-route.mjs';
import {PRACTICE_STOPS,PRACTICE_LESSONS,PRACTICE_STOP_SPACING,PRACTICE_GIFTS,practiceCourseLesson,practiceSupportLesson,practiceSupportWhere,practiceChainAdvice,practiceChainPlaces,pendingCourseLesson,worldXAt,lessonWords} from '../dist/practice-course.mjs';
import {resolveChain} from '../dist/ui/chain-model.mjs';
import {deckScreenMarkup,createDeckView} from '../dist/ui/deck-screen.mjs';
import {flyWholePractice,playPracticeScreen,walkTo} from '../scripts/practice-pilot.mjs';

const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvasFor=(width=900,height=405)=>({width,height,style:{},getContext:()=>context,getBoundingClientRect:()=>({width,height})});
const storage=()=>{let data;return {setItem:(_,v)=>{data=v},getItem:()=>data};};
const practice=(options={})=>{const s=M.newState();M.startTutorial(s,options);return s;};
const sentences=text=>text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
const flightAt=(s,row,{width=900,height=405}={})=>{const r=s.run,node=r.map[row][0];r.current=node;
 return new WispFlight({canvas:canvasFor(width,height),preflight:true,node,seed:`e5-${node.id}`,terrain:node.terrain,duration:node.duration,flame:100,companions:['collector'],modifiers:M.getRunModifiers(r)});};
const payOnCollect=run=>resolveChain(practiceCardRun(run).mountedCards,'body-spark',null).sol.sparks;

// The order a player meets every lesson in a correct playthrough that also tries each wrong placement once.
const EXPECTED=[
 'practice:lift','practice:sparks',
 'practice:meet-collector','practice:collector-fetch',
 'practice:luminance','practice:flash',
 'practice:chain','practice:place','practice:preview',
 'practice:strip',
 'practice:echo','practice:order-wrong','practice:order',
 'practice:black-hole',
 'practice:rest','practice:boost','practice:boost-wrong',
 'practice:hearts',
 'practice:roles','practice:pulse-card',
 'practice:pulse-paid',
 'practice:scribe','practice:scribe-slot','practice:brand',
 'practice:inscription',
 'practice:rearrange'];

test('Edition 5: thirteen stops, eight flights on real courses in eight biomes, five paused Chain screens',()=>{
 const s=practice(),r=s.run;
 assert.equal(PRACTICE_EDITION,5);assert.equal(r.tutorialEdition,5);assert.ok(isPracticeCourseRun(r));
 assert.equal(r.map.length,13);assert.deepEqual(r.map.map(row=>row[0].id),PRACTICE_STOPS.map(stop=>stop.id));
 const flights=r.map.flat().filter(n=>n.type!=='support'),levels=flights.map(n=>BIOME_LEVELS.find(l=>l.id===n.levelId));
 assert.equal(flights.length,8);assert.ok(levels.every(Boolean),'every course is a real catalog level');
 assert.equal(new Set(levels.map(l=>l.biomeId)).size,8,'a different biome for every flight');
 assert.deepEqual(r.practiceCards,[],'no cards before the first Chain screen');
 // Gradual: one new card per Chain screen, in this order, the Scribe after all four.
 assert.deepEqual(PRACTICE_STOPS.filter(s=>s.give).map(s=>s.give).flat(),PRACTICE_GIFTS);
 assert.ok(PRACTICE_STOPS.findIndex(s=>s.practiceScribe)>PRACTICE_STOPS.findIndex(s=>s.give?.includes('harvest-common')));
});

test('every lesson is one idea, at most two sentences and 24 words, taught once, with real glossary links',()=>{
 const texts=new Set(),taught=[];
 for(const [id,lesson] of Object.entries(PRACTICE_LESSONS)){
  assert.ok(sentences(lesson.text)<=2,`${id}: two sentences at most`);assert.ok(lessonWords(id)<=24,`${id}: ${lessonWords(id)} words`);
  assert.ok(!texts.has(lesson.text));texts.add(lesson.text);
  for(const term of lesson.terms||[])assert.ok(CARD_TERMS[term],`${id}: glossary term ${term}`);
 }
 for(const stop of PRACTICE_STOPS)taught.push(...[stop.entry,...(stop.flight||[]),...(stop.support||[]),...(stop.after||[])].filter(Boolean));
 assert.equal(new Set(taught).size,taught.length,'nothing is taught twice');
 assert.deepEqual(new Set(taught),new Set(Object.keys(PRACTICE_LESSONS)));
 for(const stop of PRACTICE_STOPS.filter(s=>s.type!=='support'))assert.ok([stop.entry,...stop.flight].filter(Boolean).length<=2,`${stop.id}: at most two lesson stops in a flight`);
 for(const stop of PRACTICE_STOPS.filter(s=>s.type==='support'))for(const id of stop.support)assert.ok(practiceSupportWhere(id),`${id} is a paused-screen lesson`);
});

test('courses are the real levels, calmed: no drafts, biome actors or stray hazards; fuel reachable by body',()=>{
 const s=practice();
 for(const [row,cell] of s.run.map.entries()){
  if(cell[0].type==='support')continue;
  for(const height of [300,405]){
   const e=flightAt(s,row,{width:Math.round(height*2.22),height});
   try{
    assert.equal(e.levelIdentity.id,cell[0].levelId);
    assert.equal(e.drafts.zones.length,0);assert.equal(e.biomeDynamics.items.length,0);
    assert.ok(e.layout.embers.length>=12,`${cell[0].id}: fuel is placed for the lesson`);
    assert.ok(e.layout.embers.every(p=>p.x>worldXAt(e,2)),'quiet opening');
    for(const p of e.layout.embers.filter(p=>!p.stagedMiss))assert.ok(e.layout.obstacles.every(o=>!circleHitsObstacle(p.x,p.y,e.player.radius,o,0)),`${cell[0].id}: ${p.feature} reachable`);
   }finally{e.destroy();}
  }
 }
});

test('scripted playthrough: every lesson in order, paused, at most two per flight, 12 s apart; the Chain ends as taught',()=>{
 const {state,flights,complete}=flyWholePractice({style:'human250',controllerSeed:1,retries:2,wrongFirst:true});
 assert.ok(complete,'the tutorial completes');assert.equal(state.run.success,true);
 const order=flights.flatMap(f=>f.stops.map(x=>x.id));
 assert.deepEqual(order,EXPECTED,'every lesson fires, in order');
 assert.ok(flights.flatMap(f=>f.stops).every(x=>x.paused),'each lesson only while paused');
 let seconds=0;
 for(const f of flights.filter(f=>f.type==='flight'&&f.success)){
  seconds+=f.time;
  assert.ok(f.stops.length<=2,`${f.id}: at most two stops`);
  let last=0;for(const x of f.stops.filter(x=>x.kind==='flight')){assert.ok(x.t-last>=PRACTICE_STOP_SPACING-1e-6,`${x.id} after ${x.t-last}s`);last=x.t;}
 }
 assert.ok(seconds<260,`eight short flights (${Math.round(seconds)} s)`);
 // The gifts end where the lessons said: Echo just left of Body Spark, Crescendo right of it, Harvest in the new slot.
 const screens=Object.fromEntries(flights.filter(f=>f.type==='screen'&&f.chain).map(f=>[f.id,f.chain]));
 assert.deepEqual(screens['practice-chain'],[null,'body-spark',null]);
 assert.deepEqual(screens['practice-order'],['echo','body-spark',null]);
 assert.deepEqual(screens['practice-rest'],['echo','body-spark','crescendo',null]);
 assert.deepEqual(screens['practice-pulse-camp'],['echo','body-spark','crescendo','harvest-common']);
 // The Scribe step wrote a real Inscription on Body Spark's slot.
 assert.deepEqual(state.run.practiceInscriptions.map(x=>x?.id||null),[null,'gilded',null,null]);
});

test('the Chain preview rises with each gift: +2, then +4 with Echo, then +8 with Crescendo',()=>{
 const s=practice(),r=s.run;
 walkTo(s,3);M.selectNode(r,'practice-chain');playPracticeScreen(s,{wrongFirst:false});assert.equal(payOnCollect(r),2);M.resolveSupport(r,0,s.profile);
 walkTo(s,5);M.selectNode(r,'practice-order');playPracticeScreen(s,{wrongFirst:false});assert.equal(payOnCollect(r),4);M.resolveSupport(r,0,s.profile);
 walkTo(s,7);M.selectNode(r,'practice-rest');playPracticeScreen(s,{wrongFirst:false});assert.equal(payOnCollect(r),8);
});

test('wrong placement: nothing changes, the screen says why, Fly stays shut until Echo moves left of Body Spark',()=>{
 const s=practice(),r=s.run;walkTo(s,5);assert.ok(M.selectNode(r,'practice-order'));
 assert.equal(practiceSupportLesson(r,'chain').id,'practice:echo');r.guideSeen['practice:echo']=true;
 const echo=r.practiceReserve.find(c=>c.cardId==='echo');assert.ok(r.practiceUnseen.includes(echo.instanceId),'a gift arrives with a NEW badge');
 assert.ok(placePracticeCard(r,echo.instanceId,2));assert.deepEqual(practiceChainPlaces(r),{...practiceChainPlaces(r),echo:2,body:1});
 assert.equal(payOnCollect(r),2,'Echo to the right repeats nothing');
 assert.equal(practiceChainAdvice(r,'echo-left').tone,'warn');assert.equal(practiceStopReady(r),false);assert.equal(M.resolveSupport(r,0,s.profile),false,'Fly is refused');
 const markup=deckScreenMarkup(practiceCardRun(r),createDeckView(),{locked:false,loaned:true});
 assert.match(markup,/No effect here/,'Echo’s own plate says it does nothing there');assert.doesNotMatch(markup,/dk2-melt/,'practice cards cannot be melted');
 const wrong=practiceSupportLesson(r,'chain');assert.equal(wrong.id,'practice:order-wrong');assert.equal(wrong.target,'.dk2-station[data-slot="2"]','points at Echo');
 r.guideSeen['practice:order-wrong']=true;
 assert.ok(placePracticeCard(r,echo.instanceId,0),'drag or Swap: the two slots trade');
 assert.equal(payOnCollect(r),4);assert.equal(practiceSupportLesson(r,'chain').id,'practice:order');assert.ok(practiceStopReady(r));assert.ok(M.resolveSupport(r,0,s.profile));
});

test('the Scribe offers two, writes on a slot (the brand), and the next flight carries the Inscription',()=>{
 const s=practice(),r=s.run;walkTo(s,11);assert.ok(M.selectNode(r,'practice-scribe'));
 assert.deepEqual(r.practiceScribe.offers,['gilded','twin-mark'],'the Scribe offers two');
 assert.equal(practiceSupportLesson(r,'scribe').id,'practice:scribe');assert.equal(M.resolveSupport(r,0,s.profile),false,'nothing written yet');
 assert.ok(practiceScribeWrite(r,'twin-mark',1));assert.equal(practiceScribeWrite(r,'gilded',2),false,'one choice per Scribe');
 assert.equal(practiceSupportLesson(r,'chain').id,'practice:brand');
 assert.match(deckScreenMarkup(practiceCardRun(r),createDeckView(),{locked:true,loaned:true}),/dk2-inscribed/,'the slot frame carries the brand');
 assert.ok(M.resolveSupport(r,0,s.profile));
 const e=flightAt(s,12);try{assert.deepEqual(e.cardExecution.inscriptions.map(x=>x?.id||null),[null,'twin-mark',null,null]);}finally{e.destroy();}
});

test('Chain-strip lessons stop the flight only at the instant a card fires, and are never repeated at a checkpoint',()=>{
 const s=practice(),r=s.run;walkTo(s,4);M.selectNode(r,'practice-strip');
 const e=flightAt(s,4);
 try{
  e.running=true;e.tutorialAwaitingLift=false;e.time=13;e.tutorial.fireAt=5;e.tutorial.ready={};
  e.step(1/60);assert.equal(practiceCourseLesson(e,r),null,'no fire now: no stop');
  e.tutorial.fireAt=e.time;e.step(1/60);const step=practiceCourseLesson(e,r);
  assert.equal(step?.id,'practice:strip');assert.equal(step.target,'.chain-strip');
  assert.equal(pendingCourseLesson(e,r),null,'not carried to the map, where no strip exists');
 }finally{e.destroy();}
});

test('in-flight lessons go through the production pause, then resume only on the card’s button',()=>{
 const s=practice(),r=s.run,e=flightAt(s,2);
 try{
  e.running=true;e.tutorialAwaitingLift=false;e.time=13;e.tutorial.ready={'practice:flash':12.5};e.canShowContextHint=()=>true;
  {const f=e.tutorial.plan.flashes[0];f.collected=false;f.x=e.distance+e.player.x+100;f.y=e.player.y;}
  const step=nextPracticeLesson(e,r);assert.equal(step.id,'practice:flash');assert.equal(step.skipLabel,false);
  const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),from=source.indexOf('function worldFocusTarget('),to=source.indexOf('function worldLesson()',from),calls=[];
  const ctx=createContext({state:{run:r,settings:{}},engine:e,paused:false,lesson:null,lastSnapshot:{},document:{querySelector:()=>null},
   FIRST_LIGHT_COMBO:'x',FIRST_FLIGHT_STOPS:new Set(),firstLightComboLesson:()=>null,firstLightComboQuiet:()=>false,nextPracticeLesson,automaticTipsEnabled:()=>true,
   deferPracticeLesson:()=>false,armFirstLightCombo:()=>false,persist:()=>{},hud:null,
   pauseFlight:()=>{e.paused=true;calls.push('pause');},startLesson:(id,steps,done)=>{assert.equal(e.paused,true,'paused before the card');calls.push(['lesson',id]);ctx.done=done;},resumeFlight:()=>calls.push('resume')});
  runInContext(source.slice(from,to),ctx);ctx.practiceWorldLesson();
  assert.deepEqual(calls,['pause',['lesson','practice:flash']]);ctx.done();assert.equal(calls.at(-1),'resume');
  r.guideSeen={};e.paused=false;e.practiceCoachAt=e.time-5;assert.equal(practiceCourseLesson(e,r),null,'12 s between stops');
  e.practiceCoachAt=-Infinity;e.time=11.9;assert.equal(practiceCourseLesson(e,r),null,'never before 12 s');
 }finally{e.destroy();}
});

test('a lesson that points at a world object waits until the object is lit and on screen',()=>{
 const s=practice(),r=s.run,e=flightAt(s,2);
 try{
  r.guideSeen={};e.practiceCoachAt=-Infinity;e.time=13;e.running=true;e.tutorialAwaitingLift=false;e.tutorial.ready={'practice:flash':12.5};
  const f=e.tutorial.plan.flashes[0],radius=e.getLightState().radius,px=e.distance+e.player.x;f.collected=false;f.y=e.player.y;
  f.x=px+radius+60;assert.equal(practiceCourseLesson(e,r),null,'a Flare in the dark is not pointed at');
  f.x=px+radius*.5;assert.equal(practiceCourseLesson(e,r)?.id,'practice:flash');
  f.x=e.distance+e.width+40;assert.equal(practiceCourseLesson(e,r),null,'off screen: still waiting');
 }finally{e.destroy();}
});

/** An Edition 4 save in progress, as it was stored: seven rows, the camp's loaned cards. */
function edition4Save(step){
 const s=M.newState();s.run=M.createRun(s.profile,'real',1,{cards:true});M.startTutorial(s,{forNewGame:true,difficulty:1});
 const r=s.run,ids=['practice-first-light','practice-collector','practice-light','practice-edge','practice-camp','practice-chain','practice-finale'];
 r.map=ids.map((id,row)=>[{...structuredClone(r.map[Math.min(row,2)][0]),id,row,type:id==='practice-camp'?'support':id==='practice-finale'?'finale':'flight',kind:id==='practice-camp'?'camp':'normal',nextIds:ids[row+1]?[ids[row+1]]:[]}]);
 Object.assign(r,{tutorialEdition:4,step,path:ids.slice(0,step),phase:'map',current:null,mapName:'First Light · Seven stops',
  practiceCards:[{instanceId:'x:crescendo',cardId:'crescendo',rank:1}],practiceChainArranged:true,guideSeen:{'practice:lift':true,'practice:sparks':true}});
 return s;
}
test('saves: a mid-tutorial Edition 4 save loads onto Edition 5 at the matching stop and finishes',()=>{
 for(const [saved,expected] of [[1,1],[2,2],[5,3]]){
  const s=edition4Save(saved),store=storage();M.saveState(s,store);
  const loaded=M.loadState(store),r=loaded.run;
  assert.equal(r.tutorialEdition,5);assert.equal(r.map.length,13);assert.equal(r.step,expected,`Edition 4 step ${saved} resumes at ${expected}`);
  assert.equal(r.phase,'map');assert.deepEqual(r.practiceCards,[],'Edition 4 loans are dropped');
  assert.equal(r.guideSeen['practice:sparks'],true,'seen lessons stay seen');assert.equal(loaded.suspendedRun?.id,s.suspendedRun.id,'the real run waits');
  assert.deepEqual(r.tutorialContinuation,{difficulty:1});
  walkTo(loaded,13);assert.equal(r.success,true,'and it completes');
 }
 assert.equal(migratePracticeRun({isTutorial:true,tutorialEdition:5},[]),false,'only Edition 4 is moved');
});

test('completion: taught topics are remembered, the real run returns, and practice cards never leave practice',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'suspended',1,{cards:true});const real=structuredClone(s.run);
 M.startTutorial(s,{forNewGame:true,difficulty:1});const r=s.run;
 for(const id of Object.keys(PRACTICE_LESSONS))(r.guideSeen||={})[id]=true;
 walkTo(s,13);assert.equal(r.success,true);
 assert.ok(M.leaveTutorial(s));assert.equal(s.profile.tutorialComplete,true);
 for(const topic of ['lift','collector','collector-recovery','luminance','special-sparks','black-hole','hearts','artifacts'])assert.ok(s.profile.onboarding.seen.includes(topic),topic);
 assert.equal(s.run.id,real.id);assert.equal(s.run.practiceCards,undefined);assert.equal(s.run.practiceReserve,undefined);
});
