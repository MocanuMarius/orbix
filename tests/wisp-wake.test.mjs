import test from 'node:test';
import assert from 'node:assert/strict';
import {WispWake,drawWispWake,WISP_WAKE_TUNING} from '../dist/wisp-wake.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {WISP_ART} from '../dist/companion-art.mjs';

globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};
const context=()=>new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function flight(reducedMotion=false){
  const e=new WispFlight({canvas:{getContext:()=>context(),getBoundingClientRect:()=>({width:900,height:430})},
    preflight:true,seed:'wake-contract',duration:90,reducedMotion});
  e.layout.obstacles=[];e.layout.embers=[];e.blackHoles.items=[];e.running=true;
  e.stars=[];e.pixiReady=true;e.pixiView={render(){},resize(){},destroy(){}};
  return e;
}
const active=w=>w.marks.filter(m=>m.active);

test('fixed-step wake is identical at 60/120Hz while rendering never emits or mutates',()=>{
  const results=[];
  for(const hz of [60,120]){
    const e=flight();
    try{
      const step=e.step;let n=0;
      e.step=function(dt){if([0,70,140,210].includes(n++))this.flap();return step.call(this,dt);};
      e.tick(1000);for(let i=1;i*1000/hz<4010;i++)e.tick(1000+i*1000/hz);e.tick(5010);
      const before=JSON.stringify(e.wispWake),draw=context();
      for(let i=0;i<240;i++)drawWispWake(draw,e,.615,1);
      assert.equal(JSON.stringify(e.wispWake),before);
      results.push({wake:JSON.parse(before),time:e.time,distance:e.distance,y:e.player.y,flame:e.flame,flaps:e.flaps});
    }finally{e.destroy();}
  }
  assert.deepEqual(results[1],results[0]);
});

test('first moving world step leaves a mark; curved samples stay where they were born',()=>{
  const wake=new WispWake(),e={running:true,alive:true,time:1/60,distance:2.5,previousDistance:0,
    player:{x:190,y:203},previousPlayerY:207};
  wake.update(e,1/60);assert.equal(wake.births,1);
  const first={...active(wake)[0]};
  for(let i=1;i<=15;i++){
    e.previousDistance=e.distance;e.previousPlayerY=e.player.y;
    e.distance+=2.5;e.player.y-=3-i*.2;e.time+=1/60;wake.update(e,1/60);
  }
  assert.equal(wake.marks[0].x,first.x);assert.equal(wake.marks[0].y,first.y);
  assert.equal(wake.births,5);assert.ok(active(wake).some(m=>Math.abs(m.y-first.y)>2));
});

test('accepted Lift replaces the old flare and paints immediately at the displayed clock in slow time',()=>{
  const e=flight();
  try{
    e.captureTime=e.time-1/60;e.renderDistance=e.distance-2;e.renderPlayerY=e.player.y+1;
    const before=e.particles.length;e.flap();
    assert.equal(e.particles.length,before);assert.equal(e.wispWake.count,5);
    assert.ok(active(e.wispWake).every(m=>m.bornAt===e.captureTime));
    assert.ok(active(e.wispWake).every(m=>Math.hypot(m.x-e.renderDistance-e.player.x,m.y-e.renderPlayerY)>WISP_ART.worldRadius+2),
      'the accepted Lift fan begins visibly beyond the opaque body rim');
    let calls=0;const c=context();c.fillRect=()=>calls++;
    drawWispWake(c,e,.615,1);assert.ok(calls>=5,'visible on the next redraw before a world step');
    const count=e.wispWake.births;e.paused=true;assert.equal(e.flap(),false);assert.equal(e.wispWake.births,count);
    e.paused=false;e.flame=0;assert.equal(e.flap(),false);assert.equal(e.wispWake.births,count);
  }finally{e.destroy();}
});

test('pool remains allocated and bounded under repeated Lifts, with a strict quiet reduced variant',()=>{
  for(const reducedMotion of [false,true]){
    const e=flight(reducedMotion),wake=e.wispWake,pool=wake.marks,slots=[...pool];
    try{
      for(let i=0;i<600;i++){
        e.flame=e.maxFlame;e.player.y=e.height*.5;e.previousPlayerY=e.player.y;
        e.flap();e.step(1/60);
        assert.ok(wake.count<=(reducedMotion?8:24));
      }
      assert.equal(wake.marks,pool);for(let i=0;i<pool.length;i++)assert.equal(pool[i],slots[i]);
      if(reducedMotion)assert.ok(active(wake).every(m=>!m.glint&&m.size===1&&m.life<=.43));
      const stamp=e.time;e.flap();
      const fresh=active(wake).filter(m=>m.bornAt===stamp);
      assert.ok(fresh.length>=(reducedMotion?2:5));
      assert.ok(new Set(fresh.map(m=>m.x+','+m.y)).size>=(reducedMotion?2:5),'a capped Lift owns distinct fresh slots');
    }finally{e.destroy();assert.equal(wake.count,0);}
  }
});

test('pause/tutorial/preflight freeze births; terminal marks age away; resize/destruction clear',()=>{
  const e=flight();
  try{
    e.step(1/60);assert.ok(e.wispWake.count>0);
    const start=JSON.stringify(e.wispWake);
    e.pause();for(let i=0;i<120;i++){e.step(1/60);e.render();}
    assert.equal(JSON.stringify(e.wispWake),start);
    e.paused=false;e.tutorialAwaitingLift=true;e.step(1/60);assert.equal(JSON.stringify(e.wispWake),start);
    e.tutorialAwaitingLift=false;e.running=false;e.wispWake.update(e,1/60);assert.equal(JSON.stringify(e.wispWake),start);
    e.running=true;const births=e.wispWake.births;e.dying=true;e.dyingDuration=2;
    for(let i=0;i<60;i++)e.step(1/60);
    assert.equal(e.wispWake.births,births);assert.equal(e.wispWake.count,0);
    e.dying=false;e.flame=e.maxFlame;e.flap();assert.ok(e.wispWake.count>0);
    e.canvas.getBoundingClientRect=()=>({width:390,height:620});e.resize();assert.equal(e.wispWake.count,0);
  }finally{e.destroy();assert.equal(e.wispWake.count,0);}
});

test('world-time sampling slows with the world and never bridges teleports or rewind',()=>{
  const wake=new WispWake(),e={running:true,alive:true,time:0,distance:0,previousDistance:0,player:{x:190,y:215},previousPlayerY:215};
  for(let i=0;i<60;i++){
    e.previousDistance=e.distance;e.distance+=154/60;e.time+=1/60;wake.update(e,1/60);
  }
  assert.equal(wake.births,17);
  const regular=wake.births;wake.clear();e.time=e.distance=0;
  for(let i=0;i<21;i++){
    e.previousDistance=e.distance;e.distance+=154/60;e.time+=1/60;wake.update(e,1/60);
  }
  assert.equal(wake.births-regular,6,'.35 world seconds emit six marks, not one second worth');
  e.previousDistance=e.distance=5000;e.previousPlayerY=e.player.y=100;e.time+=1/60;
  e.distance+=154/60;wake.update(e,1/60);
  assert.equal(wake.count,1);assert.ok(active(wake).every(m=>m.x>5100));
  e.time=.01;e.previousDistance=e.distance;e.distance+=2;wake.update(e,1/60);assert.equal(wake.count,1);
  e.previousDistance=e.distance;e.distance+=150;e.time+=1/60;wake.update(e,1/60);
  assert.equal(wake.count,0,'a within-step teleport emits nothing across the jump');
  e.previousDistance=e.distance;e.distance+=2;e.time+=1/60;wake.update(e,1/60);
  assert.equal(wake.count,1);assert.ok(active(wake)[0].x>5250);
});

test('late hidden Dream replay Lifts use the simulated pose instead of stale initial render data',()=>{
  const e=flight();
  try{
    e.captureTime=0;e.renderDistance=0;e.renderPlayerY=215;
    e.dream={mode:'replay',preparing:true};e.time=5.8;e.distance=893;e.player.y=170;e.flap();
    assert.equal(e.wispWake.count,5);
    assert.ok(active(e.wispWake).every(m=>m.bornAt===5.8&&m.x>e.player.x+850&&m.y<190));
    e.dream.preparing=false;e.time=6;e.captureTime=5.99;e.renderDistance=922;
    const c=context();let drawn=0;c.fillRect=()=>drawn++;drawWispWake(c,e,.615,1);
    assert.ok(drawn>=5,'late replay burst survives into the waking frame');
  }finally{e.destroy();}
});

test('Dream dims the same immutable marks and reduced mode clears excess slots',()=>{
  const e=flight();
  try{
    for(let i=0;i<8;i++)e.flap();assert.equal(e.wispWake.count,WISP_WAKE_TUNING.capacity);
    const alphas=[],c=context();c.fillRect=()=>alphas.push(c.globalAlpha);e.captureTime=e.time;
    drawWispWake(c,e,.615,1);const normal=alphas[0];alphas.length=0;e.dream={mode:'record'};
    drawWispWake(c,e,.615,1);assert.equal(alphas[0],normal*.48);
    e.reducedMotion=true;e.flap();assert.equal(e.wispWake.count,2);assert.equal(active(e.wispWake).some(m=>m.glint),false);
  }finally{e.destroy();}
});
