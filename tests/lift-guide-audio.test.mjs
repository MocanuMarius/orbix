import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiftGuideAudio,liftGuideAudioPhase} from '../dist/lift-guide-audio.mjs';
import {WispFlight} from '../dist/flight.mjs';

function audio(){
 const sources=[],contexts=[];
 class Param{value=0;setValueAtTime(v){this.value=v;}cancelScheduledValues(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}setTargetAtTime(){}}
 class Context{
  currentTime=0;state='running';destination={};
  constructor(){contexts.push(this);}
  createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
  createOscillator(){const source={frequency:new Param(),connect(){},disconnect(){},start(){this.started=true;},stop(at){this.stops??=[];this.stops.push(at);}};sources.push(source);return source;}
  close(){this.state='closed';}
 }
 return {cue:createLiftGuideAudio({AudioContextClass:Context}),sources,contexts};
}
const snapshot=(phase,targetIn,extra={})=>({alive:true,worldRate:1,flaps:1,liftGuide:phase?{phase,targetIn,late:false}:null,...extra});

test('Guide prepares once, accents the physical target rather than the early window, and cancels an early Lift',()=>{
 const {cue,sources}=audio();cue.unlock();
 cue.update(snapshot('soon',.31));assert.equal(sources.length,2);
 for(let i=0;i<10;i++)cue.update(snapshot('soon',.25));assert.equal(sources.length,2);
 cue.update(snapshot('open',.09));assert.equal(sources.length,2,'open window is too early for balanced flight');
 cue.update(snapshot(null,null,{flaps:2}));assert.ok(sources.every(s=>s.stops.includes(.009)),'early manual Lift releases every pending tail');
 cue.update(snapshot('soon',.31,{flaps:2}));assert.equal(sources.length,4);
 cue.update(snapshot('open',0,{flaps:2}));assert.equal(sources.length,6);
 assert.equal(sources[4].frequency.value,1174.659);
 cue.update(snapshot('open',-.02,{flaps:2}));assert.equal(sources.length,6,'one accent per descent');cue.destroy();
});

test('a well-timed Lift keeps its resolving note while a later pause still suppresses it',()=>{
 const {cue,sources}=audio();cue.unlock();cue.update(snapshot('soon',.3));cue.update(snapshot('open',0));
 const target=sources.slice(-2),stopCounts=target.map(s=>s.stops.length);
 cue.update(snapshot(null,null,{flaps:2}));cue.update(snapshot(null,null,{flaps:2}));
 assert.deepEqual(target.map(s=>s.stops.length),stopCounts,'target tail survives accepted Lift and subsequent HUD frames');
 cue.update(snapshot(null,null,{flaps:2,paused:true}));assert.ok(target.every(s=>s.stops.includes(.009)));cue.destroy();
});

test('music controls, stopped world and terminal states remain silent with no background timers',()=>{
 for(const [extra,options]of [[{paused:true},{}],[{worldRate:0},{}],[{tutorialAwaitingLift:true},{}],[{dying:true},{}],[{completing:true},{}],[{finished:true},{}],[{dream:{active:true}},{}],[{}, {enabled:false}],[{}, {hidden:true}],[{}, {gain:0}]]){
  const {cue,sources}=audio();cue.unlock();cue.update(snapshot('soon',.3));assert.equal(sources.length,2);
  cue.update(snapshot('open',0,extra),options);assert.equal(sources.length,2);assert.ok(sources.every(s=>s.stops.includes(.009)));cue.destroy();
 }
 const {cue,sources,contexts}=audio();cue.update(snapshot('soon',.3));assert.equal(contexts.length,0);assert.equal(sources.length,0);
 cue.destroy();cue.unlock();assert.equal(contexts.length,0);
});

test('dilation changes the cue pitch and target waits for actual world motion, without a predicted timer',()=>{
 const {cue,sources}=audio();cue.unlock();cue.update(snapshot('soon',.3,{worldRate:.35}));
 assert.equal(sources[0].frequency.value,880*.35);
 for(let i=0;i<100;i++)cue.update(snapshot('soon',.3,{worldRate:.1}));
 assert.equal(sources.length,2);assert.equal(sources[0].frequency.value,88);
 cue.update(snapshot('open',0,{worldRate:.35}));assert.equal(sources.length,4);assert.equal(sources[2].frequency.value,1174.659*.35);cue.destroy();
});

test('real flight snapshots deliver useful preparation and balanced target once over repeated manual cycles',()=>{
 const {cue,sources}=audio();cue.unlock();const events=[];
 const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},preflight:true,seed:'guide-audio-cadence',modifiers:{cardLiftGuide:true},onUpdate:s=>{events.push(s);cue.update(s);}});
 Object.assign(e,{running:true,tutorialAwaitingLift:false,biomeDynamics:null,spacetime:null,atlas:null,flame:100});
 e.resumeElapsed=e.resumeRampSeconds;e.layout.obstacles=[];e.layout.boss=null;e.layout.embers=[];e.drafts.zones=[];
 e.blackHoles={update(){},stop(){},items:[],timeScale:.35};e.player.y=280;
 try{
  assert.ok(e.flap());
  for(let cycle=0;cycle<5;cycle++){
   const start=e.time,mark=events.length,starts=sources.length;
   for(let step=0;step<180&&liftGuideAudioPhase(e.getState())!=='target';step++)e.step(1/120);
   const states=events.slice(mark),prep=states.find(s=>liftGuideAudioPhase(s)==='soon'),target=states.find(s=>liftGuideAudioPhase(s)==='target');
   assert.ok(prep&&target);assert.ok(target.time-prep.time>=.30&&target.time-prep.time<=.33);
   assert.ok(target.time-start>=1.36&&target.time-start<=1.38,'accent follows balanced-height cadence');
   assert.equal(sources.length-starts,4,'one preparatory tone and one target tone');
   assert.ok(Math.abs(e.player.y-280)<12,'repeated centre-window lifts stay near starting altitude');
   assert.ok(e.flap());assert.equal(e.getState().liftGuide,null);
  }
 }finally{e.destroy();cue.destroy();}
});
