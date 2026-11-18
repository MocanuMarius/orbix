import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {attachDream,dreamFingerprint} from '../dist/dream.mjs';
import {CARD_SYSTEM,makeSkillCard,getCardModifiers} from '../dist/skill-cards.mjs';

globalThis.requestAnimationFrame=()=>null;globalThis.cancelAnimationFrame=()=>{};
function flight(cards=[]){
 const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??=(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{})});
 const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})};
 const e=new WispFlight({canvas,seed:'reel-world-clock',preflight:true,companions:['collector'],duration:90,
  modifiers:{...getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:cards.map((id,i)=>makeSkillCard(id,'reel:'+i))}),wispCooldown:1.2,dreamDuration:6}});
 e.render=()=>{};e.renderScheduledFrame=()=>{};e.notify=()=>{};e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.biomeDynamics.items=[];e.blackHoles.items=[];
 e.running=true;e.resumeElapsed=e.resumeRampSeconds;
 const p={id:'carried-test',kind:'light',x:e.distance+e.player.x-40,y:e.player.y+20};e.layout.embers=[p];e.wisp.beginReel(e,p,e.player);
 const step=e.step.bind(e);e.step=dt=>{e.player.y=e.height*.5;e.player.vy=0;step(dt);};
 return {e,p};
}
function tickFor(e,hz,seconds){e.tick(1000);for(let i=1;i<=Math.round(hz*seconds);i++)e.tick(1000+i*1000/hz+(i===hz*seconds?.001:0));}
const snapshot=e=>({time:e.time,distance:e.distance,cooldown:e.wisp.cooldown,phase:e.wisp.phase,
 cargoX:e.wisp.cargoX,cargoY:e.wisp.cargoY,x:e.wisp.x,y:e.wisp.y,flame:e.flame});

test('a reel advances in world seconds at .35 world rate identically across 30/60/120Hz paints',()=>{
 const snapshots=[];
 for(const hz of [30,60,120]){const {e}=flight();try{
  e.blackHoles.timeScale=.35;e.blackHoles.update=()=>{};tickFor(e,hz,1);
  assert.ok(Math.abs(e.time-.35)<1e-8);assert.ok(Math.abs(e.wisp.activeReelSeconds()-3.65)<1e-8);
  snapshots.push(snapshot(e));
 }finally{e.destroy();}}
 assert.deepEqual(snapshots[1],snapshots[0]);
 assert.deepEqual(snapshots[2],snapshots[0]);
});

test('real Fast Spool spends retain cargo position and deliver once at 30/60/120Hz',()=>{
 for(const hz of [30,60,120])for(const [id,seconds] of [['fast-spool',3]]){
  const {e,p}=flight([id]);try{
   const tick=()=>{e.time+=1/hz;e.previousDistance=e.distance;e.distance+=e.baseSpeed/hz;e.wisp.update(e,1/hz);};
   for(let i=0;i<hz/2;i++)tick();
   const recovery=e.wisp.cooldown,before={x:e.wisp.cargoX,y:e.wisp.cargoY};
   e.flame=e.maxFlame;e.collect({kind:'light',x:e.distance+e.player.x,y:e.player.y});
   assert.ok(Math.abs(e.wisp.cooldown-(recovery-seconds))<1e-8,id+' spends real recovery');
   assert.deepEqual({x:e.wisp.cargoX,y:e.wisp.cargoY},before,id+' leaves the attached position continuous');
   for(let i=0;i<hz*5&&!p.collected;i++)tick();
   assert.equal(p.collected,true);assert.equal(e.collectorPickups,1);assert.equal(e.wisp.phase,'ready');
   for(let i=0;i<hz;i++)tick();assert.equal(e.collectorPickups,1);
  }finally{e.destroy();}
 }
});

test('paused equipment changes preserve reel progress and Ring Spring banks seconds without touching the live recovery',()=>{
 const {e,p}=flight(['ring-spring']);try{
  e.time=1;e.wisp.update(e,1);const fraction=e.wisp.recoveryFraction();
  e.paused=true;const before=snapshot(e);for(let i=0;i<60;i++)e.step(1/60);assert.deepEqual(snapshot(e),before);
  e.applySkillUpgrade({...e.mod,wispCooldown:.8},0);assert.ok(Math.abs(e.wisp.recoveryFraction()-fraction)<1e-9);e.paused=false;
  e.flame=e.maxFlame;const recovery=e.wisp.cooldown;e.collect({kind:'light',x:e.distance+e.player.x,y:e.player.y});
  assert.equal(e.wisp.cooldown,recovery,'a real body overfill banks its seconds and leaves the live recovery alone');assert.equal(e.cardRecoveryCredit,1);
  let deliveryAvailableRecovery=-1;const resolve=e.resolveCardRowEvent.bind(e);
  e.resolveCardRowEvent=(kind,detail)=>{if(p.deliveredByWisp)deliveryAvailableRecovery=e.wisp.cooldown;return resolve(kind,detail);};
  e.wisp.shortenReel(100);e.time+=1/60;e.wisp.update(e,1/60);
  assert.equal(p.collected,undefined,'a full recovery spend tightens the physical tow');
  for(let i=0;i<60&&!p.collected;i++){e.time+=1/60;e.previousDistance=e.distance;e.distance+=e.baseSpeed/60;e.wisp.update(e,1/60);}
  assert.equal(p.collected,true);assert.equal(e.wisp.phase,'ready');assert.equal(e.wisp.cooldown,0);
  assert.equal(deliveryAvailableRecovery,0,'the delivery does not invent another recovery to pay a card');
 }finally{e.destroy();}
});

test('Dream record/replay carry the same live reel; death releases cargo without a pickup',()=>{
 const a=flight(),b=flight();try{
  attachDream(a.e,{mode:'record'});a.p.fetchedInDream=true;
  const preset={version:1,fingerprint:dreamFingerprint(b.e.options),width:b.e.width,height:b.e.height,duration:6,events:[]};
  assert.ok(attachDream(b.e,{mode:'replay',preset}));b.p.fetchedInDream=true;
  tickFor(a.e,60,1);tickFor(b.e,120,1);assert.deepEqual(snapshot(b.e),snapshot(a.e));
  const collected=a.e.collectorPickups;a.e.beginDying('collision');
  assert.equal(a.p.carried,false);assert.equal(a.p.attracted,false);assert.equal(a.e.wisp.cargo,null);assert.equal(a.e.collectorPickups,collected);
 }finally{a.e.destroy();b.e.destroy();}
});
