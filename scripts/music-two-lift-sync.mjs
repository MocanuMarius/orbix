// v1.1-music: does the marked beat (the kick on every Lift beat) land on the
// guide's Lift moments? Runs the real flight physics with the Lift guide and a
// pilot who Lifts exactly on each guide target, feeds the snapshots to the
// music engine on a simulated audio clock, and measures, at every guide Lift
// moment, the distance to the nearest marked beat.
//   node scripts/music-two-lift-sync.mjs
import {WispFlight,FLIGHT_TUNING} from '../dist/flight.mjs';
import {liftGuideAudioPhase} from '../dist/lift-guide-audio.mjs';
import {createMusicTwo,LIFT_PERIOD} from '../dist/music-two.mjs';
import {PIECES,prng,compilePiece} from '../dist/music-score.mjs';

function fakeAudio(){
 const sources=[];
 class Param{constructor(v=0){this.value=v;}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}setTargetAtTime(){}cancelScheduledValues(){}}
 const node=(x={})=>({connect(){},disconnect(){},...x});
 class Context{currentTime=0;state='suspended';sampleRate=8000;destination={};resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){}
  createGain(){return node({gain:new Param(1)});}createBiquadFilter(){return node({frequency:new Param(),Q:new Param()});}createWaveShaper(){return node({curve:null});}
  createDynamicsCompressor(){return node({threshold:new Param(),knee:new Param(),ratio:new Param(),attack:new Param(),release:new Param()});}createDelay(){return node({delayTime:new Param()});}
  createOscillator(){const s=node({frequency:new Param(),detune:new Param(),start(){},stop(t){this.stopAt=t;}});sources.push(s);return s;}createBufferSource(){return node({start(){},stop(){}});}}
 return {Context,advance(ctx,t){ctx.currentTime=t;for(const s of sources)if(!s.done&&s.stopAt<=t){s.done=true;s.onended?.();}}};
}
function engineFor(id,seed){
 const fake=fakeAudio(),events={};let tick=null;
 const music=createMusicTwo({document:{hidden:false,addEventListener:(k,f)=>events[k]=f,removeEventListener(){}},AudioContextClass:fake.Context,storage:{getItem:()=>null,setItem(){}},
  schedule:f=>{tick=f;return 1;},cancel(){tick=null;},random:prng(seed),pieces:PIECES.filter(p=>p.id===id),createGuide:()=>({unlock(){},update(){},stop(){},destroy(){}})});
 events.pointerdown({});
 return {music,fake,tick:()=>tick?.()};
}
const stats=list=>({n:list.length,meanMs:Math.round(list.reduce((a,b)=>a+Math.abs(b),0)/Math.max(1,list.length)*1000*10)/10,maxMs:Math.round(Math.max(0,...list.map(Math.abs))*1000*10)/10});
// Error (s) between audio time `t` and the nearest marked Lift beat of the current piece.
function markError(music,t){const tr=music.getTransport(),le=tr.liftEvery||2,bps=tr.bpm/60*tr.rate,b=tr.beat;return (b-Math.round(b/le)*le)/bps;}

// 1. Real flight physics at the game's fixed 1/60 s step, still air, world rate 1.
async function realFlight(id,seed){
 const {music,fake,tick}=engineFor(id,seed);await Promise.resolve();
 const ctx=music.context,offset=1+prng(seed)()*2.3;// the flight starts at an arbitrary point of the bar
 for(let t=0;t<offset;t+=.25){fake.advance(ctx,t);tick();}
 const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},preflight:true,seed:'lift-sync-'+seed,modifiers:{cardLiftGuide:true},onUpdate:s=>music.setFlight(s)});
 Object.assign(e,{running:true,tutorialAwaitingLift:false,biomeDynamics:null,spacetime:null,atlas:null,flame:100});
 e.resumeElapsed=e.resumeRampSeconds;e.layout.obstacles=[];e.layout.boss=null;e.layout.embers=[];e.drafts.zones=[];
 e.blackHoles={update(){},stop(){},items:[],timeScale:1};e.player.y=280;
 music.setScene('flight');
 const errors=[],cycles=[];let lastTick=ctx.currentTime,lastLift=null,lockedAt=null;
 e.flap();
 try{
  for(let step=0;step<60*60;step++){
   e.flame=100;e.step(1/60);const now=offset+e.time;fake.advance(ctx,now);
   if(now-lastTick>=.25){lastTick=now;tick();}
   if(lockedAt===null&&music.info().sync==='locked')lockedAt=e.time;
   if(liftGuideAudioPhase(e.getState())==='target'){
    errors.push({t:e.time,err:markError(music,now)});
    if(lastLift!==null)cycles.push(e.time-lastLift);lastLift=e.time;e.flap();
   }
  }
 }finally{e.destroy();music.destroy();}
 const barSec=compilePiece(PIECES.find(p=>p.id===id)).beatSec*compilePiece(PIECES.find(p=>p.id===id)).barBeats;
 const twoBars=errors.filter(x=>x.t>errors[0].t+2*barSec),settled=errors.filter(x=>lockedAt!==null&&x.t>=lockedAt);
 return {piece:id,worldRate:1,lifts:errors.length,cycleMean:cycles.reduce((a,b)=>a+b,0)/cycles.length,first:Math.round(errors[0].err*1000),lockedAfter:lockedAt===null?null:Math.round((lockedAt-errors[0].t)*10)/10,afterTwoBars:stats(twoBars.map(x=>x.err)),afterLock:stats(settled.map(x=>x.err))};
}
// 2. A guided pilot at another world rate (time dilation): the guide moments every LIFT_PERIOD / rate.
async function dilated(id,seed,w){
 const {music,fake,tick}=engineFor(id,seed);await Promise.resolve();
 const ctx=music.context,start=1+prng(seed)()*2.3,period=LIFT_PERIOD/w;let next=start+.9;
 music.setScene('flight');
 const errors=[];let lastTick=-1,lockedAt=null;
 for(let now=0;now<start+60;now+=1/120){
  fake.advance(ctx,now);if(now-lastTick>=.25){lastTick=now;tick();}
  if(lockedAt===null&&errors.length&&music.info().sync==='locked')lockedAt=now;
  if(now>=start){
   const until=next-now;
   music.setFlight({worldRate:w,flame:80,maxFlame:100,lives:3,maxLives:3,liftGuide:until<.32?{phase:'soon',targetIn:until*w,late:false}:null});
   if(now>=next){errors.push({t:now,err:markError(music,now)});next+=period;}
  }
 }
 music.destroy();
 const barSec=60/(LIFT_PERIOD===0?1:1)*0+compilePiece(PIECES.find(p=>p.id===id)).beatSec*compilePiece(PIECES.find(p=>p.id===id)).barBeats/w;
 const twoBars=errors.filter(x=>x.t>errors[0].t+2*barSec),settled=errors.filter(x=>lockedAt!==null&&x.t>=lockedAt);
 return {piece:id,worldRate:w,lifts:errors.length,first:Math.round(errors[0].err*1000),lockedAfter:lockedAt===null?null:Math.round((lockedAt-errors[0].t)*10)/10,afterTwoBars:stats(twoBars.map(x=>x.err)),afterLock:stats(settled.map(x=>x.err))};
}
const out={liftPeriod:LIFT_PERIOD,derived:`2 x ${FLIGHT_TUNING.flapImpulse} / ${FLIGHT_TUNING.gravity}`,bpm:120/LIFT_PERIOD,runs:[]};
for(const p of PIECES.filter(p=>!p.stems)){
 for(const seed of ['a','b','c'])out.runs.push(await realFlight(p.id,seed+p.id));
 out.runs.push(await dilated(p.id,'d'+p.id,1));
 out.runs.push(await dilated(p.id,'e'+p.id,.35));
}
// The reference mp3 cannot be nudged: its own 88 BPM against the 87.80 BPM cadence.
out.reference={bpm:88,beatsPerLift:2,liftEveryMs:Math.round(120/88*1000*10)/10,cadenceMs:Math.round(LIFT_PERIOD*1000*10)/10,driftMsPerLift:Math.round((LIFT_PERIOD-120/88)*1000*10)/10,driftMsPerMinute:Math.round((LIFT_PERIOD-120/88)/LIFT_PERIOD*60*1000)};
console.log(JSON.stringify(out,null,1));
