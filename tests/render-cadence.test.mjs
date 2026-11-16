import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';

globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};
const interval=1000/120;
const close=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function scheduler(){
  const paints=[],engine={nextRenderAt:null,render(){paints.push(engine.timestamp);}};
  engine.frame=timestamp=>{engine.timestamp=timestamp;return WispFlight.prototype.renderScheduledFrame.call(engine,timestamp);};
  return {engine,paints};
}

test('paint cadence follows 30–120Hz callbacks and bounds 144/240Hz to 120 paints/s',()=>{
  for(const hz of [30,60,90,120,144,240]){
    const {engine,paints}=scheduler();
    for(let i=0;i<hz*5;i++)engine.frame(1000+i*1000/hz);
    assert.equal(paints.length,Math.min(hz,120)*5,`${hz}Hz`);
    for(let i=1;i<paints.length;i++)assert.ok(paints[i]-paints[i-1]>=1000/hz-.001);
  }
});

test('rounded 120Hz RAF timestamps and alternating refresh jitter retain every paint',()=>{
  for(const jitter of [0,.1,.2,.3])for(const sign of [-1,1]){
    const {engine,paints}=scheduler();
    for(let i=0;i<600;i++)engine.frame(Math.round((1000+i*interval+sign*(i%2?jitter:-jitter))*10)/10);
    assert.equal(paints.length,600,`${jitter}ms alternating jitter, polarity ${sign}`);
  }
  for(const hz of [144,240]){
    const {engine,paints}=scheduler();
    for(let i=0;i<hz*5;i++)engine.frame(Math.round((1000+i*1000/hz+(i%2?.3:-.3))*10)/10);
    assert.ok(paints.length>=599&&paints.length<=601,`${hz}Hz: ${paints.length}`);
  }
});

test('late frames paint once, preserve deadline phase and reject duplicate callbacks',()=>{
  const {engine,paints}=scheduler();
  engine.frame(1000);assert.equal(engine.frame(1000),false);
  engine.frame(1061);assert.equal(paints.length,2);
  close(engine.nextRenderAt,1000+8*interval);
  assert.equal(engine.frame(1061),false);
  assert.equal(engine.frame(engine.nextRenderAt-.8),false);
  assert.equal(engine.frame(engine.nextRenderAt-.3),true);
  engine.nextRenderAt=null;engine.frame(9000);close(engine.nextRenderAt,9000+interval);
});

function fixture(){
  const gradient={addColorStop(){}},context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const engine=new WispFlight({canvas:{getContext:()=>context,getBoundingClientRect:()=>({width:900,height:430})},preflight:true,seed:'render-cadence',duration:90});
  engine.layout.obstacles=[];engine.layout.embers=[];engine.blackHoles.items=[];engine.running=true;
  const samples=[];engine.pixiReady=true;engine.pixiView={render(e){samples.push({distance:e.renderDistance,y:e.renderPlayerY,blend:e.renderBlend});},destroy(){}};
  return {engine,samples};
}

test('120Hz paints interpolate between unchanged 1/60 simulation steps',()=>{
  const {engine:e,samples}=fixture();
  try{
    e.tick(1000);e.tick(1000+1000/60);e.tick(1000+1000/60+interval);
    const final=samples.at(-1);
    assert.ok(final.blend>.49&&final.blend<.51);
    close(final.distance,(e.previousDistance+e.distance)/2);
    close(final.y,(e.previousPlayerY+e.player.y)/2);
  }finally{e.destroy();}
});

test('paint rates leave real physics, input cost and world clocks identical',()=>{
  const states=[];
  for(const hz of [30,60,90,120,144,240]){
    const {engine:e}=fixture();
    try{
      const step=e.step;let n=0;
      e.step=function(dt){assert.equal(dt,1/60);if([0,70,140,210].includes(n))this.flap();n++;return step.call(this,dt);};
      e.tick(1000);
      for(let i=1;i*1000/hz<4010;i++)e.tick(1000+i*1000/hz);
      e.tick(5010);
      assert.equal(e.dying,false);assert.equal(n,240,`${hz}Hz fixed steps`);
      states.push({time:e.time,distance:e.distance,y:e.player.y,vy:e.player.vy,flame:e.flame,flaps:e.flaps,effort:e.effortSpent,score:e.score});
    }finally{e.destroy();}
  }
  for(const state of states.slice(1))assert.deepEqual(state,states[0]);
});

test('pause/resume resets the paint deadline and resize does not advance physics',()=>{
  const {engine:e}=fixture();
  try{
    e.tick(1000);e.tick(1020);assert.notEqual(e.nextRenderAt,null);
    e.pause();assert.equal(e.nextRenderAt,null);const time=e.time;
    e.tick(3000);assert.equal(e.time,time);
    e.resize();assert.equal(e.time,time);
    e.resume();assert.equal(e.nextRenderAt,null);assert.equal(e.accumulator,0);
    e.tick(5000);close(e.nextRenderAt,5000+interval);assert.equal(e.time,time);
  }finally{e.destroy();}
});
