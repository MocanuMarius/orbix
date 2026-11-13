import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {attachDream,validateDreamPreset} from '../dist/dream.mjs';
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function make(w,h){const bounds={width:w,height:h},canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>bounds};const engine=new WispFlight({canvas,seed:'landscape-probe',terrain:'ruins',duration:102,flame:100,companions:['collector'],modifiers:{dreamDuration:4}});return {engine,bounds};}
const a=make(844,390),b=make(960,360),portrait=make(390,620);
for(const {engine:e,bounds} of [a,b,portrait])assert.ok(Math.abs(e.width/e.height-bounds.width/bounds.height)<1e-8,'Canvas/world aspect must match');
assert.equal(a.engine.height,430);assert.equal(b.engine.height,430);assert.equal(portrait.engine.width,390);
assert.deepEqual(a.engine.layout.embers,b.engine.layout.embers,'Wide screens must not change pickups');
assert.equal(a.engine.totalDistance,b.engine.totalDistance);assert.equal(a.engine.baseSpeed,b.engine.baseSpeed);
for(const {engine:e} of [a,b]){e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.running=true;}
for(let frame=0;frame<100;frame++){for(const {engine:e} of [a,b]){if(frame%40===0)e.flap();e.step(1/60);}assert.equal(a.engine.player.y,b.engine.player.y);assert.equal(a.engine.player.vy,b.engine.player.vy);assert.equal(a.engine.distance,b.engine.distance);}
const e=a.engine;e.paused=true;const before={x:e.player.x,y:e.player.y,vy:e.player.vy,distance:e.distance};a.bounds.width=960;e.resize();assert.deepEqual({x:e.player.x,y:e.player.y,vy:e.player.vy,distance:e.distance},before,'Width-only resize must not move the player');
const rec=make(844,390).engine;rec.layout.obstacles=[];rec.layout.embers=[];rec.drafts.zones=[];rec.running=true;let ready;
attachDream(rec,{mode:'record',onReady:r=>ready=r});for(let frame=0;frame<240&&!rec.paused;frame++){if([3,85,167].includes(frame))rec.flap();rec.step(1/60);}assert.ok(ready?.valid);const matched=make(844,390).engine,mismatch=make(960,360).engine;assert.ok(validateDreamPreset(ready.preset,matched));assert.equal(validateDreamPreset(ready.preset,mismatch),false,'Dream must invalidate changed width even at the same logical height');
const rotating=make(844,390);rotating.engine.running=true;let invalidated;
attachDream(rotating.engine,{mode:'record',onReady:r=>invalidated=r});rotating.bounds.width=700;rotating.engine.resize();
assert.equal(invalidated?.valid,false,'Resizing mid-rehearsal must not save an unreplayable path');assert.equal(rotating.engine.paused,true);
const rotatingReplay=make(844,390);rotatingReplay.engine.running=true;let wake=0;
attachDream(rotatingReplay.engine,{mode:'replay',preset:ready.preset,onAwake:()=>wake++});rotatingReplay.bounds.width=700;rotatingReplay.engine.resize();assert.equal(wake,1);assert.equal(rotatingReplay.engine.paused,true,'Resize interrupts autoplay into safe handoff');
rotating.engine.destroy();rotatingReplay.engine.destroy();
for(const e of [a.engine,b.engine,portrait.engine,rec,matched,mismatch])e.destroy();
console.log('Landscape: undistorted aspect, unchanged world pickups/speed/physics, width-resize continuity and Dream viewport validation passed.');
