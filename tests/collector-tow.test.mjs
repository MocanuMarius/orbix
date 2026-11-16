import test from 'node:test';
import assert from 'node:assert/strict';
import {WispCompanion,WISP_TUNING} from '../dist/wisp.mjs';
import {pickupHookAnchor,COLLECTOR_RING} from '../dist/pickup-handling-cue.mjs';
import {collectorTowPose,collectorTowPoint,collectorTowOrbit} from '../dist/collector-tow-geometry.mjs';
import {pickupContactRadius} from '../dist/pickups.mjs';
import {sparkBodyRadius} from '../dist/spark-size.mjs';
import {WISP_ART} from '../dist/companion-art.mjs';
import {drawCollectorGrip,drawCarriedSpark} from '../dist/capture-art.mjs';
import {drawCollectorField} from '../dist/collector-field-art.mjs';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {WispFlight} from '../dist/flight.mjs';

function fixture(kind='light',mod={},speed=154){
  const e={player:{x:110,y:310,radius:WISP_ART.worldRadius},height:620,time:0,distance:0,previousDistance:0,baseSpeed:speed,
    mod,companions:['collector'],wispBoost:0,layout:{embers:[]},deliveries:[],shatters:[],
    hasCompanion:r=>r==='collector',
    collect(p,source){assert.ok(!p.collected);assert.ok(p.deliveredByWisp);p.collected=true;this.deliveries.push({time:this.time,p,source,home:{...this.player}});},
    shatterPickupRing(p,source){this.shatters.push({time:this.time,p,source});}};
  const w=new WispCompanion(e.player),p={kind,x:70,y:335};e.wisp=w;e.layout.embers=[p];
  const tick=(dt=1/60)=>{e.time+=dt;e.previousDistance=e.distance;e.distance+=e.baseSpeed*dt;w.update(e,dt);};
  return {e,w,p,tick};
}
const until=(f,predicate,max=1000)=>{for(let i=0;i<max&&!predicate();i++)f.tick();assert.ok(predicate());};

test('Collector latches at the real loop, then winds around a Spark-to-main-wisp cord for one recovery',()=>{
  const f=fixture(),{e,w,p,tick}=f;let latch=false,back=false,front=false,progress=0;
  until(f,()=>w.phase==='returning');
  const hook=pickupHookAnchor(p,p.x-e.distance,p.y);
  assert.ok(Math.hypot(w.x-hook.x,w.y-hook.y)<1e-8);latch=true;
  const latchedAt=e.time;assert.equal(w.activeReelSeconds(),w.recoveryDuration(e));
  for(let i=0;i<800&&!p.collected;i++){
    e.player.y=310+Math.sin(i/60*5)*32;tick();
    assert.ok([w.x,w.y,w.vx,w.vy,w.cargoX,w.cargoY].every(Number.isFinite));
    if(!w.cargo)break;
    const state=w.state(e),pose=state.cargoPose;
    assert.equal(state.motion,'reeling');assert.equal(state.canFetch,false);assert.equal(state.busy,true);
    assert.equal(state.tetherPose.x,e.player.x);assert.equal(state.tetherPose.y,e.player.y);
    assert.equal(pose.scale,1);if(state.towStage==='tow'||state.towStage==='setup')assert.ok(w.cargoX<e.player.x,'cruise cargo remains aft through Lift and Dive');
    assert.ok(w.reelProgress>=progress);progress=w.reelProgress;
    back||=state.depth<-.6;front||=state.depth>.6;
    assert.equal(e.shatters.length,0);assert.equal(e.deliveries.length,0);
  }
  assert.ok(latch&&back&&front);assert.ok(Math.abs(e.deliveries[0].time-latchedAt-w.recoveryDuration(e))<.04);
  assert.equal(e.deliveries.length,1);assert.equal(e.shatters.length,1);
  assert.equal(w.phase,'ready');assert.equal(w.cooldown,0);assert.equal(w.state(e).canFetch,true);
  const {source,home}=e.deliveries[0];
  assert.ok(source.worldX-e.baseSpeed*e.deliveries[0].time>home.x,'front-side body contact');
  assert.ok(Math.hypot(source.worldX-e.baseSpeed*e.deliveries[0].time-home.x,source.y-home.y)<=sparkBodyRadius(p)+WISP_ART.worldRadius);
  for(let i=0;i<180;i++)tick();assert.equal(e.deliveries.length,1);
});

test('approach, body contact and extra human grace stay manual; base and minimum reach retain a rescue band',()=>{
  for(const recovery of [0,1]){
    const {e,w,p,tick}=fixture('light',{},0);
    w.cooldownMax=10;w.cooldown=(1-recovery)*10;w.phase=recovery?'ready':'cooldown';
    const reach=w.currentRange(e),contact=pickupContactRadius(p,e.height);
    for(const x of [e.player.x+20,e.player.x-contact+.01,e.player.x-contact-1]){
      p.x=x;p.y=e.player.y;tick(.00001);assert.equal(w.target,null,'a retrievable or grace-window Spark stays with the player');
    }
    p.x=e.player.x-reach-sparkBodyRadius(p,e.height)+.05;tick(.00001);
    assert.equal(w.target,p,'a witnessed Spark is rescued even at the minimum reachable orbit');
  }
  const {e,w,p,tick}=fixture('light',{},0);p.x=e.player.x-w.range(e)-sparkBodyRadius(p)-1;p.y=e.player.y;tick();assert.equal(w.target,null);
});

test('real idle orbit conveys reach and stays inside its projected three-dimensional sphere',()=>{
  for(const attract of [.5,1,2]){
    const {e,w,tick}=fixture('light',{attract},0);e.layout.embers=[];let maximum=0,back=false,front=false;
    for(let i=0;i<180;i++){tick();const r=Math.hypot(w.x-e.player.x,w.y-e.player.y);maximum=Math.max(maximum,r);
      assert.ok(r<=w.currentRange(e)+1e-8);back||=w.depth<-.8;front||=w.depth>.8;}
    assert.ok(maximum>w.range(e)*.99);assert.ok(back&&front);
  }
});

test('no second fetch during reel; shorten-reel cards advance the live cycle and allow immediate next fetch',()=>{
  const f=fixture(),{e,w,p,tick}=f;until(f,()=>w.cargo===p);
  const other={kind:'cluster',x:e.distance+e.player.x-35,y:e.player.y};e.layout.embers.push(other);
  tick();assert.equal(w.target,null);assert.equal(other.attracted,undefined);
  const before=w.activeReelSeconds();assert.equal(w.shortenReel(2),2);assert.equal(w.activeReelSeconds(),before-2);
  assert.equal(w.shortenReel(100),before-2);tick();
  assert.equal(p.collected,undefined,'spending the deadline cannot teleport an attached load');
  until(f,()=>p.collected,60);assert.equal(w.phase,'ready');
  other.x=e.distance+e.player.x-35;other.y=e.player.y;tick();assert.equal(w.target,other);
  assert.equal(w.shortenReel(2),0,'an outbound flight is not a reel');
});

test('recovery rank and world recovery boon determine reel time without a second cooldown',()=>{
  for(const [cooldown,rate] of [[1,1],[.5,1],[1,2]]){
    const f=fixture('light',{wispCooldown:cooldown}),{e,w,p}=f;e.flightBoon={recoveryRate:rate};
    until(f,()=>w.cargo===p);const at=e.time;until(f,()=>p.collected);
    assert.ok(Math.abs(e.time-at-10*cooldown/rate)<.04);assert.equal(w.cooldown,0);assert.equal(w.phase,'ready');
  }
});

test('cancelled body reservations, harmful replacements and removed cargo never award twice or spend idle recovery',()=>{
  for(const cancelAt of ['outbound','returning'])for(const invalidation of ['collected','harmful','removed']){
    const f=fixture(),{e,w,p,tick}=f;until(f,()=>w.phase===cancelAt);
    if(invalidation==='collected')p.collected=true;
    else if(invalidation==='harmful'){p.kind='dark';p.harmful=true;}
    else e.layout.embers=[];
    for(let i=0;i<180;i++)tick();
    assert.equal(e.deliveries.length,0);assert.equal(e.shatters.length,0);assert.equal(w.cargo,null);assert.equal(w.target,null);assert.equal(w.cooldown,0);
  }
});

test('pause freezes reel; resize preserves finite attachment; terminal cleanup releases it without reward',()=>{
  const f=fixture(),{e,w,p,tick}=f;until(f,()=>w.cargo===p);const before=JSON.stringify(w);
  e.paused=true;w.update(e,1);assert.equal(JSON.stringify(w),before);e.paused=false;
  w.resizeY(.7);e.player.y*=.7;p.y*=.7;w.shiftX(20);e.player.x+=20;e.distance-=20;tick();
  assert.ok([w.x,w.y,w.cargoX,w.cargoY,w.reelAnchorY].every(Number.isFinite));
  w.clear(e);assert.equal(p.carried,false);assert.equal(p.attracted,false);assert.equal(w.target,null);assert.equal(w.cargo,null);assert.equal(e.deliveries.length,0);
});

test('ordinary reach paints no circle and the single cord starts at the main wisp',()=>{
  const calls=[],c=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
  drawCollectorField(c,{player:{x:100,y:200},getCollectorAuraState:()=>({active:true,radius:52.5})});assert.equal(calls.length,0);
  drawCollectorGrip(c,{x:55,y:220,tetherPose:{x:100,y:200,hookX:40,hookY:225}});
  assert.deepEqual(calls.find(x=>x[0]==='moveTo'),['moveTo',100,200]);
  assert.equal(calls.filter(x=>x[0]==='beginPath').length,1);assert.ok(!calls.some(x=>String(x[0]).includes('Gradient')));
});

test('both production renderers place the helix behind and ahead of the main body with signed depth sizing',()=>{
  for(const backend of ['native','fallback']){
    const sizes=[];
    for(const depth of [-1,1]){
      const calls=[],c=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??((...a)=>calls.push([k,...a])),set:(o,k,v)=>(o[k]=v,true)});
      const state={role:'collector',x:50,y:60,depth,phase:'returning',recovery:.5,carrying:false};
      const e={player:{x:100,y:80},reducedMotion:false,canvas:{}};
      if(backend==='native'){
        const view=Object.create(WispFlightView.prototype);Object.assign(view,{bufferContext:c,scale:1,lightIntensity:1,glow(){},orbSprite:()=>({})});
        view.drawFleet(e,0,[state],depth<0?'front':'back');assert.equal(calls.filter(x=>x[0]==='drawImage').length,0);
        view.drawFleet(e,0,[state],depth<0?'back':'front');const painted=calls.filter(x=>x[0]==='drawImage');assert.equal(painted.length,1);sizes.push(painted[0][4]);
      }else{
        WispFlight.prototype.drawWisp.call(e,c,[state],depth<0);assert.equal(calls.filter(x=>x[0]==='arc').length,0);
        WispFlight.prototype.drawWisp.call(e,c,[state],depth>0);const painted=calls.filter(x=>x[0]==='arc');assert.equal(painted.length,2);sizes.push(painted[1][3]);
      }
    }
    assert.ok(sizes[1]>sizes[0],backend+' front helix looks closer');
  }
});

test('loaded hook turns toward the main wisp, stays on its eyelet, and the displayed Collector follows the windy cord',()=>{
  for(const quiet of [false,true])for(const index of [0,1]){
    const f=fixture(),{e,w,tick}=f;e.reducedMotion=quiet;w.collectorIndex=index;
    until(f,()=>w.cargo);const first=w.state(e);
    assert.ok(Math.abs(first.cargoPose.hookAngle-Math.PI/2)<1e-8,'latch starts at the field eyelet');
    for(let i=0;i<800&&!f.p.collected;i++){
      e.player.y=310+Math.sin(i*.09)*25;tick();
      if(!w.cargo)break;
      const before={x:w.x,y:w.y,cargoX:w.cargoX,cargoY:w.cargoY,cooldown:w.cooldown};
      const state=w.state(e),pose=state.cargoPose,tether=state.tetherPose;
      const cx=state.x+pose.offsetX,cy=state.y+pose.offsetY;
      const anchor=pickupHookAnchor({kind:state.cargoKind,sparkMass:pose.massTier},cx,cy,pose.scale,pose.hookAngle);
      assert.ok(Math.hypot(anchor.x-tether.hookX,anchor.y-tether.hookY)<1e-8,'cord and rendered eyelet agree');
      if(pose.age>.32){
        const expected=Math.atan2(e.player.y-cy,e.player.x-cx);
        assert.ok(Math.abs(Math.atan2(Math.sin(pose.hookAngle-expected),Math.cos(pose.hookAngle-expected)))<1e-8);
        if(state.towStage==='tow'){
          const orbit=collectorTowOrbit(tether,pose.age,quiet,WISP_TUNING.reelTurnsPerSecond);
          assert.ok(Math.hypot(orbit.x-state.x,orbit.y-state.y)<1e-8,'helix winds around the same curve that is painted');
        }
      }
      assert.deepEqual({x:w.x,y:w.y,cargoX:w.cargoX,cargoY:w.cargoY,cooldown:w.cooldown},before,'visual sampling cannot advance gameplay');
    }
    assert.equal(f.p.collected,true,'exact attachment survives the entire reel through body contact');
  }
});

test('wind has broad fluid swings with fixed ends, fades at short lengths and becomes still with reduced motion',()=>{
  const sample=(age,quiet=false,reach=70)=>collectorTowPose({kind:'light'},30,50,30+reach,30,1,age,quiet);
  let minimum=Infinity,maximum=-Infinity;
  for(let age=.4;age<7;age+=1/120){
    const tether=sample(age),start=collectorTowPoint(tether,0),end=collectorTowPoint(tether,1),middle=collectorTowPoint(tether,.5);
    assert.deepEqual([start.x,start.y,end.x,end.y],[tether.x,tether.y,tether.hookX,tether.hookY]);
    const dy=middle.y-(tether.y+tether.hookY)/2;minimum=Math.min(minimum,dy);maximum=Math.max(maximum,dy);
    const next=collectorTowPoint(sample(age+1/120),.5);assert.ok(Math.hypot(next.x-middle.x,next.y-middle.y)<.7,'no frame-to-frame whip');
  }
  assert.ok(maximum-minimum>17,'wind is visibly broader than the old four-unit sag');
  assert.deepEqual(collectorTowPoint(sample(1,true),.5),collectorTowPoint(sample(5,true),.5),'reduced motion has a steady curve');
  assert.ok(sample(1,false,28).wind<sample(1,false,70).wind,'shortening cord tames the swing near contact');
  assert.notEqual(sample(1).phase,collectorTowPose({kind:'light'},30,50,100,30,1,1,false,1).phase,'paired cords have separate wind phases');
});

test('mint glow reuses one cheap path, preserves inherited opacity and hides the eyelet and cord outside visibility',()=>{
  const f=fixture(),{e,w,tick}=f;until(f,()=>w.cargo);for(let i=0;i<60;i++)tick();
  const state=w.state(e),calls=[],strokes=[],stack=[];
  const c=new Proxy({globalAlpha:.4,save(){stack.push(this.globalAlpha)},restore(){this.globalAlpha=stack.pop()},stroke(){strokes.push({alpha:this.globalAlpha,width:this.lineWidth,color:this.strokeStyle})}},
    {get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
  drawCollectorGrip(c,state,.615);
  assert.equal(strokes.length,5);assert.equal(calls.filter(c=>c[0]==='beginPath').length,1);
  assert.ok(strokes.every(s=>s.alpha<=.4));assert.ok(strokes.some(s=>s.color==='#e2ffe9'));
  assert.ok(!calls.some(c=>/Gradient|shadow/i.test(c[0])));assert.equal(c.globalAlpha,.4);
  const hidden={engine:e,light:{radius:1,intensity:0}};calls.length=0;strokes.length=0;
  drawCollectorGrip(c,state,1,hidden);drawCarriedSpark(c,state,e.time,1,false,undefined,hidden);
  assert.equal(calls.length+strokes.length,0,'new glow cannot reveal an unseen load');
  const ringCenter=pickupHookAnchor({kind:state.cargoKind},state.x+state.cargoPose.offsetX,state.y+state.cargoPose.offsetY,state.cargoPose.scale,state.cargoPose.hookAngle);
  assert.ok(Math.hypot(ringCenter.x-state.tetherPose.hookX,ringCenter.y-state.tetherPose.hookY)<COLLECTOR_RING.radius*.001);
});
