// Scripted pilot for First Light Edition 4. It flies each practice stop with the
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
const {nextPracticeLesson,loanPracticeCards}=await import('../dist/practice-route.mjs');
const {tutorialEntryLesson}=await import('../dist/tutorial.mjs');
const {lessonWords}=await import('../dist/practice-course.mjs');

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

/** Walk the whole practice with one pilot. Failed flights are retried like the game does (up to `retries`). */
export function flyWholePractice({style='human250',controllerSeed=0,retries=3,edition}={}){
 const state=M.newState();M.startTutorial(state,edition?{edition}:{});const r=state.run;
 const flights=[];
 while(r.phase!=='ended'){
  const node=M.getChoices(r)[0];if(!node||!M.selectNode(r,node.id))break;
  if(node.type==='support'){
   r.guideSeen||={};for(const id of ['practice:chain','practice:boost'])r.guideSeen[id]=true;
   flights.push({id:node.id,type:'camp',stops:[{id:'practice:chain',kind:'camp',t:0,words:lessonWords('practice:chain'),paused:true},{id:'practice:boost',kind:'camp',t:0,words:lessonWords('practice:boost'),paused:true}]});
   if(!M.resolveSupport(r,0,state.profile))throw Error('camp did not resolve');continue;
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
    const s=M.newState();M.startTutorial(s);const r=s.run;r.step=n.row;r.path=r.map.slice(0,n.row).map(x=>x[0].id);r.phase='map';
    if(n.row>4)for(const id of ['practice:chain','practice:boost'])(r.guideSeen||={})[id]=true;
    if(n.row>4)loanPracticeCards(r,['body-spark','courier-tip','crescendo']);
    M.selectNode(r,n.id);M.beginFlightAttempt(r);
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
