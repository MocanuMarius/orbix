import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {attachDream,validateDreamPreset} from '../dist/dream.mjs';
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:620})};
const options={canvas,seed:'dream-probe',terrain:'ruins',duration:102,node:{flightLengthScale:3,flightNumber:1},flame:40,condensedGlow:12,
  companions:['leveler','swift'],modifiers:{dreamDuration:6,dreamWake:3,secondDawn:1,dreamRecharge:1.5}};
const make=()=>{const e=new WispFlight(options);e.render=()=>{};e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.start();return e};
const snapshot=e=>JSON.stringify({time:e.time,y:e.player.y,vy:e.player.vy,distance:e.distance,flame:e.flame,condensedGlow:e.condensedTotal,flaps:e.flaps,boosts:e.boosts,charge:e.levelCharge});
let ready,awake=0;const record=make();attachDream(record,{onReady:r=>ready=r});
for(let frame=0;frame<360;frame++){
  if([3,85,167,249,331].includes(frame))record.beginLiftInput();
  if([18,100,182,264,346].includes(frame))record.endLiftInput(false);
  if(frame===50)record.activateAbility();
  if([220,270,320].includes(frame))record.flap();
  record.step(1/60);
}
assert.ok(ready?.valid);assert.equal(record.paused,true);assert.equal(record.flame,40);assert.equal(record.condensedTotal,12);
const real=make();assert.ok(attachDream(real,{mode:'replay',preset:ready.preset,onAwake:()=>awake++}));
assert.equal(real.flap(),false,'Player cannot disrupt preset replay');
for(let i=0;i<360;i++)real.step(1/60);
assert.equal(snapshot(real),snapshot(record),'Replay must exactly reproduce physics and fuel');
assert.equal(awake,1);const stopped=snapshot(real);real.step(1/60);assert.equal(snapshot(real),stopped);
const flaps=real.flaps;assert.ok(real.dream.resume());assert.equal(real.flaps,flaps,'Awakening alone must not Lift');
assert.equal(real.resumeRemaining,3);assert.equal(real.resumeScale,.1);
real.flap();assert.equal(real.flaps,flaps+1);assert.equal(real.condensedTotal,12);assert.equal(real.flame,33);
real.flap();assert.equal(real.condensedTotal,12);assert.equal(real.flame,26,'Only flight Glow pays for Lift');
real.collect({id:'dawn',kind:'light',x:real.distance+real.player.x,y:real.player.y});real.time+=.12;
assert.equal(real.pickupRevealStrength,1);assert.equal(real.secondDawnUsed,true);
const changed=make();changed.height=621;assert.equal(validateDreamPreset(ready.preset,changed),false);
changed.height=620;changed.options={...options,modifiers:{...options.modifiers,speed:1.1}};assert.equal(validateDreamPreset(ready.preset,changed),false);
const failed=make();let fail;attachDream(failed,{onReady:r=>fail=r});failed.hit(null);for(let i=0;i<121;i++)failed.step(1/60);
assert.equal(fail.valid,false);assert.equal(fail.preset,null);
const garden=make();garden.mod.nightGarden=4;garden.layout.embers=[{id:'seed',kind:'dark',x:garden.player.x-10,y:garden.player.y+45}];
garden.step(1/60);assert.equal(garden.flame,44);garden.step(1/60);assert.equal(garden.flame,44,'Each seed only grants one near-pass benefit');
for(let i=0;i<7;i++){garden.layout.embers=[{id:'seed-'+i,kind:'dark',x:garden.distance+garden.player.x-10,y:garden.player.y+45}];garden._pickupCount=-1;garden.step(1/60);}
assert.equal(garden.nightGardenCount,5);assert.equal(garden.flame,60,'Night Gardener cannot produce more than 20 Glow per flight');
const charging=make();attachDream(charging,{mode:'record'});charging.fleet.find(x=>x.role==='swift').cooldown=5;
charging.collect({kind:'light',x:98,y:310});assert.equal(charging.fleet.find(x=>x.role==='swift').cooldown,3.5);
charging.collect({kind:'sight',x:98,y:310});assert.equal(charging.fleet.find(x=>x.role==='swift').cooldown,3.5,'Only fuel triggers Dreamcatcher');
const shield=new WispFlight({...options,companions:['protector'],flame:12,condensedGlow:100});shield.running=true;shield.hit(null);
assert.equal(shield.dying,false);assert.equal(shield.condensedTotal,100);assert.equal(shield.flame,0);assert.equal(shield.shield.charges,0);
for(const e of [record,real,changed,failed,garden,charging,shield])e.destroy();
console.log('Dream: deterministic input replay, free opening, no rehearsal reward writes, paused handoff, separate resume/Lift, build/viewport invalidation, failed rehearsal, Condensed Glow isolation, Second Dawn and bounded Night Gardener passed.');
