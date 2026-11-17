import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiftGuideAudio,liftGuideAudioPhase,LIFT_CUE,LIFT_CUE_MIN_GAP,LIFT_CUE_REPEAT_SCALE} from '../dist/lift-guide-audio.mjs';
import {WispFlight} from '../dist/flight.mjs';

// The fake audio clock advances only when a test says so (cues are rate-limited on it).
function audio({clock,random=()=>.5}={}){
 const sources=[],contexts=[],gains=[],time={t:0};
 class Param{value=0;setValueAtTime(v){this.value=v;}cancelScheduledValues(){}linearRampToValueAtTime(v){this.peak=v;}exponentialRampToValueAtTime(){}setTargetAtTime(){}}
 class Context{
  state='running';destination={};
  get currentTime(){return clock?clock():time.t;}
  constructor(){contexts.push(this);}
  createGain(){const g={gain:new Param(),connect(){},disconnect(){}};gains.push(g);return g;}
  createOscillator(){const source={frequency:new Param(),connect(){},disconnect(){},start(){this.started=true;},stop(at){this.stops??=[];this.stops.push(at);}};sources.push(source);return source;}
  close(){this.state='closed';}
 }
 return {cue:createLiftGuideAudio({AudioContextClass:Context,random}),sources,contexts,gains,at:t=>{time.t=t;}};
}
const snapshot=(phase,targetIn,extra={})=>({alive:true,worldRate:1,flaps:1,liftGuide:phase?{phase,targetIn,late:false}:null,...extra});
const released=(s,now)=>s.stops.some(x=>Math.abs(x-(now+.009))<1e-9);
const SOON=LIFT_CUE.new.soon[0][0],LOW=LIFT_CUE.new.target[0][0],HIGH=LIFT_CUE.new.target[1][0];

test('Guide prepares once, accents the physical target rather than the early window, and cancels an early Lift',()=>{
 const {cue,sources,at}=audio();cue.unlock();
 cue.update(snapshot('soon',.31));assert.equal(sources.length,1);assert.equal(sources[0].frequency.value,SOON);
 for(let i=0;i<10;i++)cue.update(snapshot('soon',.25));assert.equal(sources.length,1);
 cue.update(snapshot('open',.09));assert.equal(sources.length,1,'open window is too early for balanced flight');
 at(.1);cue.update(snapshot(null,null,{flaps:2}));assert.ok(sources.every(s=>released(s,.1)),'early manual Lift releases every pending tail');
 at(.5);cue.update(snapshot('soon',.31,{flaps:2}));assert.equal(sources.length,2);
 at(.8);cue.update(snapshot('open',0,{flaps:2}));assert.equal(sources.length,4,'the target is a two-note rising fifth');
 assert.equal(sources[2].frequency.value,LOW);assert.equal(sources[3].frequency.value,HIGH);assert.ok(Math.abs(HIGH/LOW-1.5)<.002);
 cue.update(snapshot('open',-.02,{flaps:2}));assert.equal(sources.length,4,'one accent per descent');cue.destroy();
});

test('a well-timed Lift keeps its resolving note while a later pause still suppresses it',()=>{
 const {cue,sources,at}=audio();cue.unlock();cue.update(snapshot('soon',.3));at(.3);cue.update(snapshot('open',0));
 const target=sources.slice(-2),stopCounts=target.map(s=>s.stops.length);
 at(.32);cue.update(snapshot(null,null,{flaps:2}));cue.update(snapshot(null,null,{flaps:2}));
 assert.deepEqual(target.map(s=>s.stops.length),stopCounts,'target tail survives accepted Lift and subsequent HUD frames');
 at(.35);cue.update(snapshot(null,null,{flaps:2,paused:true}));assert.ok(target.every(s=>released(s,.35)));cue.destroy();
});

test('music controls, stopped world and terminal states remain silent with no background timers',()=>{
 for(const [extra,options]of [[{paused:true},{}],[{worldRate:0},{}],[{tutorialAwaitingLift:true},{}],[{dying:true},{}],[{completing:true},{}],[{finished:true},{}],[{dream:{active:true}},{}],[{}, {enabled:false}],[{}, {hidden:true}],[{}, {gain:0}]]){
  const {cue,sources,at}=audio();cue.unlock();cue.update(snapshot('soon',.3));assert.equal(sources.length,1);
  at(.3);cue.update(snapshot('open',0,extra),options);assert.equal(sources.length,1);assert.ok(sources.every(s=>released(s,.3)));cue.destroy();
 }
 const {cue,sources,contexts}=audio();cue.update(snapshot('soon',.3));assert.equal(contexts.length,0);assert.equal(sources.length,0);
 cue.destroy();cue.unlock();assert.equal(contexts.length,0);
});

test('dilation changes the cue pitch and target waits for actual world motion, without a predicted timer',()=>{
 const {cue,sources,at}=audio();cue.unlock();cue.update(snapshot('soon',.3,{worldRate:.35}));
 assert.equal(sources[0].frequency.value,SOON*.35);
 at(.1);for(let i=0;i<100;i++)cue.update(snapshot('soon',.3,{worldRate:.1}));
 assert.equal(sources.length,1);assert.ok(Math.abs(sources[0].frequency.value-SOON*.1)<1e-9);
 at(.6);cue.update(snapshot('open',0,{worldRate:.35}));assert.equal(sources.length,3);assert.ok(Math.abs(sources[1].frequency.value-LOW*.35)<1e-9);cue.destroy();
});

test('the cue is rate-limited, quieter when it repeats within a second, and drifts at most 1.5% in pitch',()=>{
 const {cue,sources,gains,at}=audio();cue.unlock();
 const peaks=()=>gains.filter(g=>g.gain.peak!==undefined).map(g=>g.gain.peak);
 cue.update(snapshot('soon',.3));at(.1);cue.update(snapshot('open',0));
 assert.equal(sources.length,1,`a second cue inside ${LIFT_CUE_MIN_GAP} s is dropped`);
 at(.2);cue.update(snapshot(null,null,{flaps:2}));at(.3);cue.update(snapshot('soon',.3,{flaps:2}));
 assert.equal(sources.length,2,'once the gap has passed the next cue plays');
 const [first,second]=peaks();assert.ok(Math.abs(second-first*LIFT_CUE_REPEAT_SCALE)<1e-12,'the same cue within a second is quieter');
 at(1.5);cue.update(snapshot('open',0,{flaps:2}));at(1.6);cue.update(snapshot(null,null,{flaps:3}));at(2.8);cue.update(snapshot('soon',.3,{flaps:3}));
 assert.equal(peaks().at(-1),first,'after a second it is back to full level');
 cue.destroy();
 for(const r of [0,1]){
  const {cue:c,sources:s}=audio({random:()=>r});c.unlock();c.update(snapshot('soon',.3));
  assert.ok(Math.abs(s[0].frequency.value/SOON-1-(r?1:-1)*.015)<1e-9);c.destroy();
 }
});

test('the new cue is softer, rounder and shorter than the old one',()=>{
 const peak=v=>Math.max(...v.map(n=>n[2])),end=v=>Math.max(...v.map(n=>n[1]+n[4]));
 for(const kind of ['soon','target']){
  const dB=20*Math.log10(peak(LIFT_CUE.new[kind])/peak(LIFT_CUE.old[kind]));
  assert.ok(dB<=-5,`${kind} at least 5 dB below the old peak per voice (${dB.toFixed(1)} dB)`);
  assert.ok(end(LIFT_CUE.new[kind])<=.05,`${kind} no longer than 50 ms`);
  assert.ok(LIFT_CUE.new[kind].every(n=>n[3]>=.001&&n[3]<=.002),'1-2 ms attacks');
  assert.ok(LIFT_CUE.new[kind].every(n=>n[0]>=350&&n[0]<=600),'wooden body in 350-600 Hz');
 }
 assert.equal(LIFT_CUE.new.type,'triangle');assert.ok(LIFT_CUE.new.lowpass>0&&LIFT_CUE.new.lowpass<=3000);
});

test('real flight snapshots deliver useful preparation and balanced target once over repeated manual cycles',()=>{
 let flight=null;const {cue,sources}=audio({clock:()=>flight?.time??0});cue.unlock();const events=[];
 const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},preflight:true,seed:'guide-audio-cadence',modifiers:{cardLiftGuide:true},onUpdate:s=>{events.push(s);cue.update(s);}});
 Object.assign(e,{running:true,tutorialAwaitingLift:false,biomeDynamics:null,spacetime:null,atlas:null,flame:100});
 e.resumeElapsed=e.resumeRampSeconds;e.layout.obstacles=[];e.layout.boss=null;e.layout.embers=[];e.drafts.zones=[];
 e.blackHoles={update(){},stop(){},items:[],timeScale:.35};e.player.y=280;flight=e;
 try{
  assert.ok(e.flap());
  for(let cycle=0;cycle<5;cycle++){
   const start=e.time,mark=events.length,starts=sources.length;
   for(let step=0;step<180&&liftGuideAudioPhase(e.getState())!=='target';step++)e.step(1/120);
   const states=events.slice(mark),prep=states.find(s=>liftGuideAudioPhase(s)==='soon'),target=states.find(s=>liftGuideAudioPhase(s)==='target');
   assert.ok(prep&&target);assert.ok(target.time-prep.time>=.30&&target.time-prep.time<=.33);
   assert.ok(target.time-start>=1.36&&target.time-start<=1.38,'accent follows balanced-height cadence');
   assert.equal(sources.length-starts,3,'one preparatory tone and one two-note target');
   assert.ok(Math.abs(e.player.y-280)<12,'repeated centre-window lifts stay near starting altitude');
   assert.ok(e.flap());assert.equal(e.getState().liftGuide,null);
  }
 }finally{e.destroy();cue.destroy();}
});

test('the cue is pitched to the music: the fifth, then root to fifth, of the key the music reports',async()=>{
 const {liftCueTranspose}=await import('../dist/lift-guide-audio.mjs');
 assert.equal(liftCueTranspose(undefined),1,'no key reported (the reference score): D');
 assert.equal(liftCueTranspose(2),1);
 assert.ok(Math.abs(liftCueTranspose(7)-2**(5/12))<1e-12,'G: up a fourth');
 assert.ok(Math.abs(liftCueTranspose(0)-2**(-2/12))<1e-12,'C: down a tone');
 assert.ok(Math.abs(liftCueTranspose(10)-2**(-4/12))<1e-12,'B-flat: down a major third');
 const {cue,sources,at}=audio();cue.unlock();
 cue.update(snapshot('soon',.3),{transport:{key:7}});assert.ok(Math.abs(sources[0].frequency.value-SOON*2**(5/12))<1e-9);
 at(.31);cue.update(snapshot('open',0),{transport:{key:7}});
 assert.ok(Math.abs(sources[1].frequency.value-LOW*2**(5/12))<1e-9&&Math.abs(sources[2].frequency.value-HIGH*2**(5/12))<1e-9);cue.destroy();
});
