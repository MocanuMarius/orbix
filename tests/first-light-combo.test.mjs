import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {newState,startTutorial,getRunModifiers,createRun,leaveTutorial} from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {FIRST_LIGHT_COMBO,firstLightComboLesson,armFirstLightCombo,firstLightComboQuiet,FIRST_LIGHT_COMBO_GAP as GAP} from '../dist/first-light-combo.mjs';
import {nextPracticeLesson} from '../dist/practice-route.mjs';
import {tutorialEntryLesson,FIRST_FLIGHT_STOPS} from '../dist/tutorial.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(width=900,height=405){
 const state=newState();startTutorial(state);const run=state.run,node=run.map[0][0];
 const engine=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width,height})},preflight:true,node,duration:node.duration,flame:100,companions:['collector'],modifiers:getRunModifiers(run)});
 engine.running=true;run.guideSeen={'practice:lift':true};engine.beginLiftInput();engine.endLiftInput();
 // The same player inputs and production integrator obtain the prerequisite.
 for(let i=0;i<900&&!engine.dying;i++){
  if(engine.player.y>engine.height*.62&&engine.player.vy>0){engine.beginLiftInput();engine.endLiftInput();}
  engine.step(1/60);
  if(engine.time>=4){run.guideSeen['practice:sparks']=true;if(firstLightComboLesson(engine,run))break;}
 }
 assert.equal(engine.dying,false);assert.ok(engine.tutorial.directPickups>0);assert.ok(firstLightComboLesson(engine,run));
 return {state,run,engine};
}
function fly(engine,taps,seconds){
 const start=engine.time;let input=0;
 for(let i=0;i<Math.ceil(seconds*60);i++){
  if(input<taps.length&&engine.time-start+1e-7>=taps[input]){assert.ok(engine.beginLiftInput());engine.endLiftInput();input++;}
  engine.step(1/60);
 }
 return input;
}
test('two real scrolling trios cross the authored off-body Sparks and restore exactly +1 per resolver event',()=>{
 for(const [width,height]of [[900,405],[915,412],[740,333],[390,620]]){
  const {run,engine:e}=setup(width,height);try{
   assert.equal(armFirstLightCombo(e,run),false,'loans require the stopped frame');
   e.paused=true;assert.ok(armFirstLightCombo(e,run));e.paused=false;
   const entry=e.time,start=e.distance,receipts=[],resolve=e.resolveCardRowEvent.bind(e);
   e.resolveCardRowEvent=(...args)=>{const before=e.flame,result=resolve(...args);if(args[0]==='wave-crossing'&&result){near(e.flame-before,result.gain);receipts.push({at:e.time-entry,...result});}return result;};
   const flashed=new Set(),step=e.step.bind(e);e.step=dt=>{step(dt);for(const p of e.layout.embers)if(p.harvestFlashUntil>e.time)flashed.add(p.id);};
   const targets=e.layout.embers.filter(p=>p.feature==='first-light-combo-wave'),fronts=[],emit=e.luminanceWaves.emit.bind(e.luminanceWaves);
   e.luminanceWaves.emit=(...args)=>{const wave=emit(...args);fronts.push(wave);return wave;};
   assert.equal(fly(e,Array.from({length:6},(_,i)=>i*GAP),8),6);
   assert.equal(e.dying,false);assert.equal(e.cardRhythm.waves,2);assert.ok(e.distance>start+1000,'camera and world progress normally');
   assert.equal(targets.length,2);for(const target of targets){assert.ok(fronts.some(w=>w.seen.has(target)),target.id);assert.equal(target.collected,false,'wave leaves target in place');assert.ok(flashed.has(target.id),'actual crossed target flashed');}
   const direct=e.layout.embers.filter(p=>p.feature==='first-light-combo-direct');assert.ok(direct.every(p=>p.collected&&!p.deliveredByWisp),'both normal Sparks reached through body physics');
   assert.ok(receipts.length>=2);for(const {gain,receipt}of receipts){near(receipt.restoredSparks,1);near(gain,1/.3);assert.ok(receipt.steps.some(step=>step.success&&step.actingCardId==='harvest-common'));}
   assert.ok(entry+receipts.at(-1).at<120);assert.ok(firstLightComboQuiet(e));
   console.log(`${width}x${height}: cue ${entry.toFixed(2)}s; two targets crossed by ${(entry+7.24).toFixed(2)}s; ${receipts.length} real +1 crossings`);
  }finally{e.destroy();}
 }
});
test('uneven manual inputs create no wave and no Harvest payment; quiet room never pays on its own',()=>{
 const {run,engine:e}=setup();try{
  e.paused=true;armFirstLightCombo(e,run);e.paused=false;fly(e,[0,.9,2.7],3.5);
  assert.equal(e.cardRhythm.waves,0);assert.equal(e.tutorial.harvestPaid,undefined);
  assert.ok(!e.cardRowTrace||e.cardRowTrace.event.kind!=='wave-crossing');
 }finally{e.destroy();}
});
test('loans stay in practice, later introductions are consumed, and retries can restore the quiet room',()=>{
 const {state,run,engine:e}=setup();try{
  const original=createRun(state.profile,'saved');state.suspendedRun=structuredClone(original);
  e.paused=true;armFirstLightCombo(e,run);run.guideSeen[FIRST_LIGHT_COMBO]=true;
  assert.deepEqual(run.practiceCards.map(c=>[c.cardId,c.rank]),[['lift-guide',1],['rhythm',1],['harvest-common',1]]);
  assert.equal(firstLightComboLesson(e,run),null);assert.equal(armFirstLightCombo(e,run),false);
  const late={...e,tutorial:{lesson:'rhythm'},tutorialAwaitingLift:false,time:4,cardRhythm:{waves:1}};
  assert.equal(nextPracticeLesson(late,run),null);
  late.tutorialAwaitingLift=true;assert.equal(tutorialEntryLesson(late,run),null);
  assert.ok(leaveTutorial(state));assert.deepEqual(state.run,original);assert.equal(state.run.practiceCards,undefined);
  assert.equal(armFirstLightCombo(e,state.run),false);
 }finally{e.destroy();}
});
test('production coach pauses before lending and waits for the explicit Try it action; quiet room blocks every later coach',()=>{
 const {run,engine:e}=setup();try{
  const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),from=source.indexOf('function practiceWorldLesson(){'),to=source.indexOf('function worldLesson()',from),calls=[];
  const ctx=createContext({state:{run,settings:{}},engine:e,paused:false,lesson:null,lastSnapshot:{},FIRST_LIGHT_COMBO,FIRST_FLIGHT_STOPS,firstLightComboLesson,firstLightComboQuiet,nextPracticeLesson,automaticTipsEnabled:()=>true,
   armFirstLightCombo:(engine,run)=>{assert.equal(engine.paused,true);calls.push('loan');return armFirstLightCombo(engine,run);},
   pauseFlight:()=>{e.paused=true;calls.push('pause');},persist:()=>{},hud:null,
   startLesson:(id,steps,done)=>{calls.push('lesson');ctx.done=done;assert.equal(id,FIRST_LIGHT_COMBO);},resumeFlight:()=>calls.push('resume')});
  e.canShowContextHint=()=>true;runInContext(source.slice(from,to),ctx);ctx.practiceWorldLesson();
  assert.deepEqual(calls,['pause','loan','lesson']);ctx.done();assert.equal(calls.at(-1),'resume');
  ctx.practiceWorldLesson();assert.equal(calls.length,4,'second opportunity contains no prompt or extra stop');
 }finally{e.destroy();}
});


test('primary pixel renderer consumes the real target flash flag at the pickup scale, including reduced motion',()=>{
 const arcs=[],c={save(){},restore(){},beginPath(){},stroke(){},arc(...args){arcs.push(args);}};
 const view={scale:.5,buffer:{width:450},bufferContext:c,drawPacket(){}};
 const target={kind:'light',x:200,y:100,harvestFlashUntil:10.5};
 const e={height:430,time:10,reducedMotion:true,layout:{embers:[target]}};
 WispFlightView.prototype.drawCollectibles.call(view,e,10,100);
 assert.equal(arcs.length,1);near(arcs[0][0],50);near(arcs[0][1],50);near(arcs[0][2],(12.8*1.5+8+5)*.5);
 near(c.lineWidth,1.5);assert.equal(c.strokeStyle,'#edffd0');
 e.time=11;WispFlightView.prototype.drawCollectibles.call(view,e,11,100);assert.equal(arcs.length,1,'expired flash draws no halo');
 e.time=10;target.collected=true;WispFlightView.prototype.drawCollectibles.call(view,e,10,100);assert.equal(arcs.length,1,'collected objects stay hidden');
});
