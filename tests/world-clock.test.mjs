import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {blackHoleTimeScale,BLACK_HOLE_TUNING as NORMAL,GIANT_BLACK_HOLE_TUNING as GIANT} from '../dist/black-holes.mjs';
import {attachDream,prepareDreamHandoff} from '../dist/dream.mjs';

globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};
const near=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function fixture(){
  const gradient={addColorStop(){}},context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const engine=new WispFlight({canvas:{getContext:()=>context,getBoundingClientRect:()=>({width:900,height:430})},preflight:true,seed:'world-clock',duration:240,modifiers:{cardRhythm:true,dreamDuration:6}});
  engine.render=()=>{};engine.layout.obstacles=[];engine.layout.embers=[];engine.blackHoles.items=[];engine.running=true;
  const hole=(t=NORMAL,distance=0)=>{const h={id:'clock-hole',x:engine.distance+engine.player.x+distance,y:engine.player.y,coreRadius:t.coreRadius,influence:t.influence,rate:0,potentialRate:0,frameDrained:0,drained:0,lastDrainAt:-Infinity,drainSequence:0,sourceX:null,sourceY:null,bypass:{y:engine.player.y}};engine.blackHoles.items=[h];engine.blackHoles.cursor=0;engine.blackHoles.update(0);return h;};
  return {engine,hole};
}

test('normal and Giant holes slow by normalized actual geometry, reaching .35 at their cores',()=>{
  for(const t of [NORMAL,GIANT]){
    near(blackHoleTimeScale(t.influence,t.influence,t.coreRadius),1);
    near(blackHoleTimeScale((t.coreRadius+t.influence)/2,t.influence,t.coreRadius),.675);
    near(blackHoleTimeScale(t.coreRadius,t.influence,t.coreRadius),.35);
    near(blackHoleTimeScale(0,t.influence,t.coreRadius),.35);
    const {engine:e,hole}=fixture();
    try{
      const h=hole(t,t.influence);near(e.worldRate,1);
      h.x=e.distance+e.player.x+(t.coreRadius+t.influence)/2;e.blackHoles.update(1/60);near(e.worldRate,.675);
      h.x=e.distance+e.player.x;e.flame=0;e.blackHoles.update(1/60);near(e.worldRate,.35);assert.equal(e.blackHoles.rate,0,'fuel cannot control time');
      h.x=e.distance+e.player.x-t.influence-1;e.blackHoles.update(1/60);near(e.worldRate,1);
      e.blackHoles.stop();near(e.blackHoles.timeScale,1);
    }finally{e.destroy();}
  }
});

test('the strongest normalized field wins, regardless of nearest source or drain multipliers',()=>{
  const {engine:e,hole}=fixture();
  try{
    const normal=hole(NORMAL,100),giant={...normal,id:'giant-clock',x:normal.x+50,coreRadius:GIANT.coreRadius,influence:GIANT.influence};
    e.blackHoles.items=[normal,giant];Object.defineProperty(e.flightBoon,'drainScale',{value:0});e.blackHoles.update(1/60);
    near(e.blackHoles.timeScale,Math.min(blackHoleTimeScale(100),blackHoleTimeScale(150,GIANT.influence,GIANT.coreRadius)));
    assert.equal(e.blackHoles.nearest.id,normal.id);assert.equal(e.blackHoles.potentialRate,0);assert.ok(e.worldRate<.5);
  }finally{e.destroy();}
});

test('tick dilates elapsed once, keeps 1/60 world steps and a six-step catchup cap',()=>{
  for(const rate of [1,.675,.35]){
    const {engine:e,hole}=fixture();
    try{
      if(rate<1)hole(NORMAL,rate===.35?0:(NORMAL.coreRadius+NORMAL.influence)/2);
      const steps=[];e.step=dt=>{steps.push(dt);e.time+=dt;};
      e.tick(1000);for(let frame=1;frame<=120;frame++)e.tick(1000+frame*1000/60);
      near(e.time,2*rate,1/60+1e-8);assert.ok(steps.every(dt=>dt===1/60));
      const before=steps.length;e.tick(9000);assert.ok(steps.length-before<=6);assert.ok(e.accumulator<1/60);
    }finally{e.destroy();}
  }
});

test('resume uses the slower factor instead of multiplying the .1 ramp by the hole',()=>{
  const {engine:e,hole}=fixture();
  try{
    hole();e.pause();assert.equal(e.worldRate,0);assert.equal(e.blackHoles.timeScale,1);
    e.resume();near(e.worldRate,.1);near(e.blackHoles.timeScale,.35);
    e.step=dt=>{e.time+=dt;};e.tick(1000);
    for(let frame=1;frame<=180;frame++){
      e.tick(1000+frame*1000/60);near(e.worldRate,Math.min(e.resumeScale,.35));
    }
    near(e.time,3*.35-(.35-.1)**2/(2*.3),1/60+.002);
    assert.equal(e.resumeRemaining,0);near(e.worldRate,.35);
  }finally{e.destroy();}
});

test('awaiting Lift, pause and destruction freeze the flight clock; terminal settling still completes',()=>{
  const {engine:e,hole}=fixture();
  try{
    hole();e.beginLiftInput();e.endLiftInput();e.time=.6;e.beginLiftInput();e.endLiftInput();
    e.tutorialAwaitingLift=true;assert.equal(e.getState().worldRate,0);const time=e.time;e.tick(1000);e.tick(2000);assert.equal(e.time,time);
    e.tutorialAwaitingLift=false;e.pause();assert.equal(e.cardRhythm.phase,'idle');assert.equal(e.worldRate,0);
    e.resume();e.beginDying();assert.equal(e.cardRhythm.phase,'idle');assert.equal(e.worldRate,0);assert.equal(e.blackHoles.timeScale,1);
    e.tick(3000);for(let frame=1;frame<=125;frame++)e.tick(3000+frame*1000/60);
    assert.equal(e.finished,true);assert.equal(e.worldRate,0);e.destroy();const end=e.time;e.tick(8000);assert.equal(e.time,end);
  }finally{e.destroy();}
});

test('Dream clears Rhythm while fixed-step recording and reconstruction remain identical',async()=>{
  const {engine:e}=fixture();
  const {engine:replay}=fixture();
  try{
    e.cardRhythm.lift(0);let result;attachDream(e,{duration:6,onReady:value=>{result=value;}});
    assert.equal(e.cardRhythm.phase,'idle');e.hit=()=>{};
    for(let frame=0;frame<360;frame++)e.step(1/60);
    assert.equal(result.valid,true);assert.equal(e.worldRate,0);assert.equal(e.blackHoles.timeScale,1);
    replay.hit=()=>{};replay.paused=true;assert.ok(attachDream(replay,{mode:'replay',preset:result.preset}));
    assert.equal(await prepareDreamHandoff(replay),true);
    for(const key of ['time','distance','flame'])near(replay[key],e[key]);
    near(replay.player.y,e.player.y);near(replay.player.vy,e.player.vy);assert.equal(replay.cardRhythm.phase,'idle');assert.equal(replay.worldRate,0);
  }finally{e.destroy();replay.destroy();}
});
