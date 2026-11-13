import assert from 'node:assert/strict';
import {WispCompanion,WISP_TUNING} from '../dist/wisp.mjs';
const dt=1/60;
function setup(phase=0,speed=154){
 const e={player:{x:110,y:310},time:phase,distance:0,baseSpeed:speed,mod:{},companions:['collector'],wispBoost:0,layout:{embers:[]},deliveries:0,rings:0,
  hasCompanion:role=>role==='collector',collect(p){assert.ok(p.deliveredByWisp);p.collected=true;this.deliveries++},shatterPickupRing(){this.rings++}};
 const w=new WispCompanion(e.player),tick=()=>{e.time+=dt;e.distance+=speed*dt;w.update(e,dt)};
 for(let i=0;i<120;i++)tick();return {e,w,tick};
}
function trip(offset,phase=0,speed=154,moving=false){
 const {e,w,tick}=setup(phase,speed),packet={kind:'light',x:e.distance+e.player.x-offset,y:335};
 e.layout.embers=[packet];let caught=false,frames=0,maxStep=0;
 for(;frames<180&&!e.deliveries;frames++){
  if(moving)e.player.y=310+Math.sin(frames*dt*5)*45;
  const before={x:w.x,y:w.y};tick();maxStep=Math.max(maxStep,Math.hypot(w.x-before.x,w.y-before.y));
  if(packet.carried){caught=true;assert.equal(e.deliveries,0);assert.equal(w.cooldown,0,'Recovery begins on delivery, not interception');}
 }
 assert.equal(e.deliveries,1);assert.equal(e.rings,1);assert.ok(caught);assert.equal(w.phase,'cooldown');
 assert.equal(w.cooldown,WISP_TUNING.cooldown);assert.ok(maxStep<20,'No position snaps at 60 Hz');
 for(let i=0;i<120;i++)tick();assert.equal(e.deliveries,1,'Only one payment');
 return Number((frames*dt).toFixed(3));
}
const timing=[0,.45,.9,1.35].map(phase=>({phase,near:trip(30,phase),far:trip(95,phase)}));
assert.ok(timing.every(t=>t.far>t.near+.12),'Distance affects round-trip duration from every sampled orbit phase');
const movingTime=trip(95,0,300,true);
// Taking a reserved item with the body must not duplicate its reward or reset recovery.
const canceled=setup();canceled.e.layout.embers=[{kind:'light',x:canceled.e.distance+30,y:335}];canceled.tick();
assert.equal(canceled.w.phase,'outbound');const target=canceled.w.target;target.collected=true;
for(let i=0;i<120;i++)canceled.tick();assert.equal(canceled.e.deliveries,0);assert.equal(canceled.w.cooldown,0);assert.equal(canceled.w.phase,'ready');
// Player approach and harmful/manual-only pickups remain outside automatic fetching.
const manual=setup();manual.e.layout.embers=[{kind:'light',x:manual.e.distance+210,y:310},{kind:'dark',x:manual.e.distance+50,y:310},{kind:'dusk',x:manual.e.distance+55,y:310}];
manual.tick();assert.equal(manual.w.target,null);
const reduced=setup();reduced.e.reducedMotion=true;for(let i=0;i<60;i++)reduced.tick();const still={x:reduced.w.x,y:reduced.w.y};for(let i=0;i<60;i++)reduced.tick();assert.equal(reduced.w.x,still.x);assert.equal(reduced.w.y,still.y);
console.log(JSON.stringify({timing,movingFastFlightSeconds:movingTime,oneRewardOnReturn:true,cancelAndManualPickup:true,reducedMotion:true},null,2));
