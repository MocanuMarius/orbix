// Scripted pilot for First Light (Edition 5; the flight part is unchanged from Edition 4). It flies each practice stop with the
// repository's delayed-input human pilots (balance-current-flight.mjs `simulate`)
// and reproduces the app's lesson stops: an entry lesson on the frozen first
// frame, and in-flight lessons only when practice-course.mjs offers one and the
// engine's own safe-pause check passes. A stop takes no simulated time (the
// engine is paused while the card is read), so stop times are simulated seconds.
//
//   node scripts/practice-pilot.mjs [--styles=human250] [--seeds=5] [--out=path.json]
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
if(!process.argv.includes('--importOnly'))process.argv.push('--importOnly');
const {simulate}=await import('./balance-current-flight.mjs');
const M=await import('../dist/model.mjs');
const R=await import('../dist/practice-route.mjs');const {nextPracticeLesson}=R;
const {tutorialEntryLesson}=await import('../dist/tutorial.mjs');
const C=await import('../dist/practice-course.mjs');const {lessonWords}=C;

/** Fly the current practice stop of `state` once. Returns the simulate record plus the lesson timeline. */
export function flyPracticeStop(state,{style='human250',controllerSeed=0,seed=null}={}){
 const r=state.run,n=r.current;r.guideSeen||={};
 const stops=[];
 const record=simulate({run:structuredClone(r),controllerSeed,skills:r.skills,fleet:r.companions,terrain:n.terrain,difficulty:1,stage:n.row,
  role:'collector',style,seed:seed||`practice-${n.id}-${controllerSeed}`,duration:n.duration,profile:'refuge',practice:true,node:n,
  prepareEngine(e){
   const entry=tutorialEntryLesson(e,r);
   if(entry){stops.push({id:entry.id,kind:'entry',t:0,words:lessonWords(entry.id),paused:true});r.guideSeen[entry.id]=true;}
   const step=e.step.bind(e);
   e.step=dt=>{
    step(dt);
    if(e.paused||e.dying||e.completing||e.finished||e.tutorialAwaitingLift)return;
    const lesson=nextPracticeLesson(e,r);
    if(!lesson||!e.canShowContextHint())return;
    // The app pauses first; record that the engine would be stopped.
    e.paused=true;const paused=e.paused,before=e.time;step(1/60);const frozen=e.time===before;e.paused=false;
    stops.push({id:lesson.id,kind:'flight',t:Math.round(e.time*100)/100,words:lessonWords(lesson.id),paused:paused&&frozen});
    r.guideSeen[lesson.id]=true;e.practiceCoachAt=e.time;
   };
  }});
 return {record,stops,success:record.success,time:record.time};
}

/** Play one Edition 5 practice screen the way a player would, through the same model calls the app makes:
 * read each paused lesson as it becomes due ('screen', then 'chain', ...), place the gift, and with `wrongFirst`
 * place it wrongly first where a lesson explains a wrong placement. Returns the lessons in order with the Chain after each. */
export function playPracticeScreen(state,{wrongFirst=true}={}){
 const r=state.run,stop=C.practiceStopById(r.current?.id),lessons=[];r.guideSeen||={};
 const read=where=>{let step;while((step=C.practiceSupportLesson(r,where))){lessons.push({id:step.id,kind:'screen',where,t:0,words:lessonWords(step.id),paused:true,
  target:step.target,chain:(r.practiceCards||[]).map(c=>c?.cardId||null)});r.guideSeen[step.id]=true;}};
 const uid=id=>[...(r.practiceReserve||[]),...(r.practiceCards||[])].find(c=>c?.cardId===id)?.instanceId;
 const place=(id,slot)=>{if(!R.placePracticeCard(r,uid(id),slot,r.practiceCards[slot]?.instanceId||null))throw Error(`could not place ${id} in slot ${slot+1}`);read('chain');};
 read('screen');
 if(stop.practiceRest){if(!R.practiceAddSlot(r))throw Error('Add slot refused');read('screen');}
 if(stop.practiceScribe){
  read('scribe');read('scribe-slot');
  const body=C.practiceChainPlaces(r).body;if(!R.practiceScribeWrite(r,'gilded',body))throw Error('Scribe write refused');
  read('chain');
 }else{
  read('chain');
  const p=()=>C.practiceChainPlaces(r);
  if(stop.goal==='place')place('body-spark',1);
  if(stop.goal==='echo-left'){if(wrongFirst)place('echo',p().body+1);place('echo',p().body-1);}
  if(stop.goal==='boost-right'){if(wrongFirst)place('crescendo',p().echo);
   // Wrong: Crescendo over Echo's slot sends Echo back to the Deck; put Echo back, then Crescendo right of Body Spark.
   if(p().echo<0)place('echo',p().body-1);place('crescendo',p().body+1);}
  if(stop.goal==='harvest')place('harvest-common',r.practiceCards.findIndex(c=>!c));
 }
 if(!R.practiceStopReady(r))throw Error(`${stop.id}: goal not met`);
 return {lessons,chain:r.practiceCards.map(c=>c?.cardId||null)};
}
/** Move a fresh practice to row `row` as a player would have (screens played, earlier flights cleared). */
export function walkTo(state,row){
 const r=state.run;
 while(r.step<row){const n=M.getChoices(r)[0];M.selectNode(r,n.id);
  if(n.type==='support'){playPracticeScreen(state,{wrongFirst:false});M.resolveSupport(r,0,state.profile);continue;}
  M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:80});}
 r.phase='map';
}

/** Walk the whole practice with one pilot. Failed flights are retried like the game does (up to `retries`). */
export function flyWholePractice({style='human250',controllerSeed=0,retries=3,edition,wrongFirst=true}={}){
 const state=M.newState();M.startTutorial(state,edition?{edition}:{});const r=state.run;
 const flights=[];
 while(r.phase!=='ended'){
  const node=M.getChoices(r)[0];if(!node||!M.selectNode(r,node.id))break;
  if(node.type==='support'){
   const {lessons,chain}=playPracticeScreen(state,{wrongFirst});
   flights.push({id:node.id,type:'screen',stops:lessons,chain});
   if(!M.resolveSupport(r,0,state.profile))throw Error('practice screen did not resolve');continue;
  }
  let attempt=0,result;
  for(;;){
   if(!M.beginFlightAttempt(r))throw Error('flight did not begin: '+node.id);
   result=flyPracticeStop(state,{style,controllerSeed:controllerSeed*7+attempt});
   flights.push({id:node.id,type:'flight',levelId:node.levelId,attempt,success:result.success,time:result.time,stops:result.stops,fatal:result.record.fatalCause,
    flaps:result.record.flaps,direct:result.record.direct,collector:result.record.collector,minFuel:result.record.minFuel});
   M.finishFlight(r,result.record.result||{success:false,flame:0});
   if(result.success||attempt>=retries)break;
   attempt++;if(!M.retryFlight(r))break;
  }
  if(!result.success)break;
 }
 const after=[];let step;while((step=C.practiceSupportLesson(r,'result'))){after.push({id:step.id,kind:'screen',where:'result',t:0,words:lessonWords(step.id),paused:true});(r.guideSeen||={})[step.id]=true;}
 if(after.length)flights.push({id:'practice-result',type:'screen',stops:after});
 return {state,flights,complete:r.phase==='ended'&&r.success===true};
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).filter(a=>a!=='--importOnly').map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true];}));
 const styles=String(args.styles||'human250').split(','),seeds=Number(args.seeds||5),out={};
 for(const style of styles){
  const perStop={};
  for(let seed=0;seed<seeds;seed++){
   const {flights}=flyWholePractice({style,controllerSeed:seed,retries:0});
   for(const f of flights.filter(f=>f.type==='flight')){(perStop[f.id]||=[]).push({seed,success:f.success,time:f.time,fatal:f.fatal,stops:f.stops.map(s=>`${s.id}@${s.t}`)});}
  }
  out[style]=perStop;
 }
 // Independent per-stop clears (each stop flown from its own entrance, not chained).
 const independent={};
 for(const style of styles){
  independent[style]={};
  const base=M.newState();M.startTutorial(base);
  for(const row of base.run.map){const n=row[0];if(n.type==='support')continue;
   const results=[];
   for(let seed=0;seed<seeds;seed++){
    const s=M.newState();M.startTutorial(s);const r=s.run;
    walkTo(s,n.row);M.selectNode(r,n.id);M.beginFlightAttempt(r);
    const {success,time,stops,record}=flyPracticeStop(s,{style,controllerSeed:seed});
    results.push({seed,success,time,fatal:record.fatalCause,stops:stops.map(x=>`${x.id}@${x.t}`)});
   }
   independent[style][n.id]={clears:results.filter(x=>x.success).length,of:seeds,results};
  }
 }
 const report={chained:out,independent};
 if(args.out)fs.writeFileSync(String(args.out),JSON.stringify(report,null,1));
 console.log(JSON.stringify(Object.fromEntries(Object.entries(independent).map(([style,stops])=>[style,Object.fromEntries(Object.entries(stops).map(([id,v])=>[id,`${v.clears}/${v.of} ${v.results.map(x=>x.success?'ok':x.fatal).join(' ')} | ${v.results[0].stops.join(' ')}`]))])),null,1));
}
