import test from 'node:test';
import assert from 'node:assert/strict';
import {WispCompanion,WISP_TUNING} from '../dist/wisp.mjs';
import {pickupHookAnchor} from '../dist/pickup-handling-cue.mjs';
import {sparkBodyRadius} from '../dist/spark-size.mjs';
import {WISP_ART} from '../dist/companion-art.mjs';

function fixture(kind='light',mod={}){
  const e={player:{x:110,y:310},height:620,time:0,distance:0,previousDistance:0,baseSpeed:154,
    mod,companions:['collector'],wispBoost:0,layout:{embers:[]},deliveries:[],shatters:[],
    hasCompanion:r=>r==='collector',
    collect(p,source){assert.equal(p.collected,undefined);assert.ok(p.deliveredByWisp);p.collected=true;this.deliveries.push({time:this.time,p,source,home:{...this.player}});},
    shatterPickupRing(p,source){this.shatters.push({time:this.time,p,source});}};
  const w=new WispCompanion(e.player),p={kind,x:70,y:335};e.layout.embers=[p];
  const tick=()=>{e.time+=1/60;e.previousDistance=e.distance;e.distance+=e.baseSpeed/60;w.update(e,1/60);};
  return {e,w,p,tick};
}

test('Collector latches at the one lower hook, tows a connected intact shell, and shatters once at moving body contact',()=>{
  const {e,w,p,tick}=fixture();let latch=false,towing=false,rejoined=false,maxStep=0;
  for(let frame=0;frame<360;frame++){
    e.player.y=310+Math.sin(frame/60*5)*32;
    const x=w.x,y=w.y,wasCarried=Boolean(p.carried),before=w.phase;tick();
    maxStep=Math.max(maxStep,Math.hypot(w.x-x,w.y-y));
    assert.ok([w.x,w.y,w.vx,w.vy,w.cargoX,w.cargoY].every(Number.isFinite));
    if(p.carried&&!wasCarried){
      const hook=pickupHookAnchor(p,p.x-e.distance,p.y);
      assert.ok(Math.hypot(w.x-hook.x,w.y-hook.y)<1e-8,'interception is the art attachment point');
      assert.equal(e.shatters.length,0);assert.equal(e.deliveries.length,0);latch=true;
    }
    if(w.phase==='outbound'||w.phase==='rejoining')assert.equal(w.state(e).gripPose,null,'plain Collector approaches and leaves without a growing limb');
    if(p.carried){
      const state=w.state(e),pose=state.cargoPose;
      assert.equal(state.gripPose?.attached,true,'only the loaded Spark loop gains a filament');
      const hook=pickupHookAnchor(p,state.x+pose.offsetX,state.y+pose.offsetY);
      assert.ok(Math.hypot(state.x-hook.x,state.y-hook.y)<=WISP_TUNING.towLength+.001);
      assert.equal(pose.scale,1,'ordinary cargo retains its full shell');
      assert.equal(e.shatters.length,0,'shell stays intact for the entire tow');
      assert.equal(e.deliveries.length,0);towing||=pose.age>.1;
    }
    if(before==='rejoining'&&w.phase!=='rejoining')rejoined=true;
  }
  assert.ok(latch&&towing&&rejoined);assert.ok(maxStep<20,'including the return to idle orbit');
  assert.equal(e.deliveries.length,1);assert.equal(e.shatters.length,1);
  const {source,home}=e.deliveries[0];
  // The source records world coordinates at the collection timestamp.
  const distanceAtArrival=154*e.deliveries[0].time;
  assert.ok(Math.hypot(source.worldX-distanceAtArrival-home.x,source.y-home.y)<=sparkBodyRadius(p)+WISP_ART.worldRadius);
  assert.equal(e.shatters[0].time,e.deliveries[0].time);
  assert.deepEqual(e.shatters[0].source,source);
});

test('body cancellation and a cargo reclassified as harmful never duplicate collection or cause a Collector harm effect',()=>{
  for(const cancelAt of ['outbound','returning']){
    const {e,w,p,tick}=fixture();
    for(let i=0;i<180&&w.phase!==cancelAt;i++)tick();assert.equal(w.phase,cancelAt);
    if(cancelAt==='outbound')p.collected=true;else{p.kind='dark';p.harmful=true;}
    for(let i=0;i<240;i++)tick();
    assert.equal(e.deliveries.length,0);assert.equal(e.shatters.length,0);
    assert.equal(w.cargo,null);assert.equal(w.target,null);assert.equal(w.cooldown,0);
  }
});
