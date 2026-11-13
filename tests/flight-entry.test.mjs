import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForFlightEntry} from '../dist/flight-entry.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {drawProximityMeter} from '../dist/proximity-meter.mjs';

test('entry waits for both scene preparation and five seconds, including slow loading',async()=>{
 let ready=false,clock=0,waits=[];
 const wait=async ms=>{assert.ok(ready);waits.push(ms);clock+=ms;};
 await waitForFlightEntry(Promise.resolve().then(()=>{clock=1250;ready=true;}),0,{now:()=>clock,wait});
 assert.equal(clock,5000);assert.deepEqual(waits,[3750]);
 ready=false;clock=0;waits=[];
 await waitForFlightEntry(Promise.resolve().then(()=>{clock=6700;ready=true;}),0,{now:()=>clock,wait});
 assert.equal(clock,6700);assert.deepEqual(waits,[0]);
});

test('paused entry neither schedules physics nor spends fuel, resume itself never lifts',async()=>{
 const oldRaf=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;let frames=0;
 globalThis.requestAnimationFrame=()=>++frames;globalThis.cancelAnimationFrame=()=>{};
 const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const canvas={style:{},getContext:()=>context,getBoundingClientRect:()=>({width:900,height:405})};
 let engine;
 try{
  engine=new WispFlight({canvas,terrain:'ruins',seed:'paused-entry',duration:30,flame:100});await engine.ready;
  const fuel=engine.flame;engine.start({paused:true});
  assert.equal(frames,0);assert.equal(engine.time,0);assert.equal(engine.flap(),false);assert.equal(engine.flame,fuel);
  engine.resume();assert.equal(frames,1);assert.equal(engine.flaps,0);assert.equal(engine.flame,fuel);assert.equal(engine.resumeScale,.1);
  assert.equal(engine.flap(),true);assert.equal(engine.flaps,1);assert.ok(engine.flame<fuel);
  engine.pause();const time=engine.time;engine.resume();assert.equal(engine.flaps,1);assert.equal(engine.time,time);assert.equal(engine.resumeScale,.1);
 }finally{engine?.destroy();globalThis.requestAnimationFrame=oldRaf;globalThis.cancelAnimationFrame=oldCancel;}
});

test('proximity indicator disappears at zero and moves above the orb near the floor',()=>{
 const rects=[],c={save(){},restore(){},fillRect(...args){rects.push(args);}},pulse={charge:0};
 const e={edgingPulse:{state:pulse},player:{x:170,y:182},height:220,time:1,layout:{obstacles:[]},distance:0,reducedMotion:true};
 drawProximityMeter(c,e);assert.equal(rects.length,0);
 pulse.charge=.6;pulse.nearEdge=true;drawProximityMeter(c,e);
 assert.ok(rects.length>0);assert.ok(rects.every(r=>r[1]<e.player.y),'meter must avoid the ground beneath the orb');
 pulse.charge=0;rects.length=0;drawProximityMeter(c,e);assert.equal(rects.length,0);
});
