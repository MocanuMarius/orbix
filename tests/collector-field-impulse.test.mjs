import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {attachDream,validateDreamPreset,dreamFingerprint} from '../dist/dream.mjs';
import {SKILLS,newState,createRun,getRunModifiers,buyCheckpointSkill} from '../dist/model.mjs';
import {fieldImpulseStrength,fieldImpulseSpeed} from '../dist/collector-impulse.mjs';
import {updateGlideRegeneration} from '../dist/glide-regeneration.mjs';
import {createBoundaryInspectorState} from '../dist/boundary-run-inspector.mjs';

function flight(extra={}){
 const ctx=new Proxy({}, {get:(o,k)=>o[k]??=(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{})});
 const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})};
 const e=new WispFlight({canvas,seed:'field-impulse',terrain:'ruins',companions:['collector'],flame:80,
  modifiers:{collectorFieldImpulse:true,wispCooldown:.75,treasureRecoveryScale:.8,dreamDuration:6,driftSense:1},...extra});
 e.render=()=>{};e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.blackHoles.items=[];e.biomeDynamics.items=[];
 e.running=true;e.resumeElapsed=e.resumeRampSeconds;return e;
}
const snapshot=e=>({y:e.player.y,vy:e.player.vy,distance:e.distance,cooldown:e.wisp.cooldown,phase:e.wisp.phase,impulse:e.fieldImpulse,flaps:e.flaps});

test('Field Impulse is a Collector run purchase after Search Spark at base 80; inspector is opt-in',()=>{
 assert.equal(SKILLS['collector-field-impulse'].cost,80);assert.equal(SKILLS['collector-field-impulse'].requires,'collector-attunement');
 const state=newState();state.run=createRun(state.profile,'field-skill');state.run.condensedGlow=1000;
 assert.equal(buyCheckpointSkill(state,'collector-field-impulse'),false);
 assert.equal(buyCheckpointSkill(state,'collector-attunement'),true);assert.equal(buyCheckpointSkill(state,'collector-field-impulse'),true);
 assert.equal(getRunModifiers(state.run).collectorFieldImpulse,true);
 assert.equal(getRunModifiers({...state.run,companions:['swift'],companionRole:'swift'}).collectorFieldImpulse,false);
 assert.equal(createBoundaryInspectorState().run.skills['collector-field-impulse'],undefined);
 assert.equal(createBoundaryInspectorState(new URLSearchParams('fieldimpulse=1')).run.skills['collector-field-impulse'],1);
});

test('all directions consume the normal recovering ring once, scale with its actual radius and cost no Lift',()=>{
 for(const direction of ['up','down','right'])for(const recovery of [.25,.6,1]){
  const e=flight();try{
   e.wisp.cooldownMax=e.wisp.recoveryDuration(e);e.wisp.cooldown=(1-recovery)*e.wisp.cooldownMax;e.wisp.phase=recovery===1?'ready':'cooldown';
   const strength=e.wisp.currentRange(e)/e.wisp.range(e),fuel=e.flame;
   assert.equal(e.activateFieldImpulse(direction),true);assert.equal(e.fieldImpulse.strength,strength);
   assert.equal(e.wisp.cooldown,6);assert.equal(e.wisp.cooldownMax,6);assert.equal(e.wisp.phase,'cooldown');
   assert.equal(e.getCollectorAuraState().radius,18);assert.equal(e.flame,fuel);assert.equal(e.flaps,0);
   assert.equal(e.activateFieldImpulse(direction),false);assert.equal(e.shield.protection,0);assert.equal(e.exitProtection,0);
   assert.equal(e.activationEvents.snapshot(e.time).at(-1).source,'collector-field-impulse');
  }finally{e.destroy();}
 }
});

test('fetch, guard, low charge, current action and nonplaying states reject a swipe without spending anything',()=>{
 const changes=[e=>e.wisp.phase='outbound',e=>e.wisp.phase='returning',e=>e.wisp.phase='guard-recovery',e=>e.wisp.target={},e=>e.wisp.cargo={},
  e=>e.wisp.leg={},e=>e.wisp.cooldown=e.wisp.cooldownMax*.751,e=>e.paused=true,e=>e.running=false,e=>e.dying=true,
  e=>e.completing=true,e=>e.tutorialAwaitingLift=true,e=>e.tutorial={},e=>e.liftHeld=true,e=>e.mod.collectorFieldImpulse=false,e=>e.fieldImpulse={until:1}];
 for(const change of changes){const e=flight();try{change(e);const cooldown=e.wisp.cooldown,fuel=e.flame;assert.equal(e.activateFieldImpulse('up'),false);assert.equal(e.wisp.cooldown,cooldown);assert.equal(e.flame,fuel);assert.equal(e.flaps,0);}finally{e.destroy();}}
 const e=flight();try{assert.equal(e.activateFieldImpulse('left'),false);assert.equal(e.activateFieldImpulse('diagonal'),false);assert.equal(fieldImpulseStrength(e),1);}finally{e.destroy();}
});

test('up holds briefly, down dives and right speeds the world; normal collisions still end the attempt',()=>{
 const base=flight(),up=flight(),down=flight(),right=flight();
 try{
  for(const e of [base,up,down,right])e.player.vy=0;
  up.activateFieldImpulse('up');down.activateFieldImpulse('down');right.activateFieldImpulse('right');
  assert.equal(up.getFlightProjection(),null);assert.equal(fieldImpulseSpeed(right),1.48);
  for(let i=0;i<24;i++)for(const e of [base,up,down,right])e.step(1/60);
  assert.ok(Math.abs(up.player.y-up.fieldImpulse.targetY)<.001);assert.ok(down.player.y>base.player.y+20);assert.ok(right.distance>base.distance+15);
  up.flap();assert.equal(up.fieldImpulse,null);assert.ok(up.player.vy<0);assert.ok(up.getFlightProjection());
  right.fieldImpulse.until=right.time;assert.equal(fieldImpulseSpeed(right),1);
  down.player.y=down.height+down.player.radius+2;down.step(1/60);assert.equal(down.dying,true);
 }finally{for(const e of [base,up,down,right])e.destroy();}
});

test('active impulses pause unassisted regeneration and preserve recovery fraction across a skill upgrade',()=>{
 const e=flight();try{
  e.time=3;e.mod.glideRegenRank=1;e.flame=20;e.player.vy=40;e.activateFieldImpulse('right');
  updateGlideRegeneration(e,.1);assert.equal(e.flame,20);
  e.wisp.update(e,.8);const fraction=e.wisp.recoveryFraction();e.applySkillUpgrade({...e.mod,wispCooldown:.6},0);
  assert.ok(Math.abs(e.wisp.recoveryFraction()-fraction)<1e-9);
  e.time=e.fieldImpulse.until;updateGlideRegeneration(e,.1);assert.ok(e.flame>20);
 }finally{e.destroy();}
});

test('Dream records and replays direction, movement and ring recovery identically across render cadences',()=>{
 const originalRAF=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=()=>null;
 const tickFor=(e,hz)=>{const count=hz*.4;for(let i=0;i<=count;i++)e.tick(10+i*1000/hz+(i===count?.001:0));};
 try{
 for(const direction of ['up','down','right']){
  const record=flight(),replay=flight();try{
   attachDream(record,{mode:'record'});record.activateFieldImpulse(direction);
   tickFor(record,30);
   const events=record.dream.events.map(e=>({...e,args:[...e.args]}));
   const preset={version:1,fingerprint:dreamFingerprint(record.options),width:record.width,height:record.height,duration:6,events};
   assert.equal(events[0].action,'activateFieldImpulse');assert.deepEqual(events[0].args,[direction]);
   assert.equal(validateDreamPreset(preset,replay),true);
   assert.equal(validateDreamPreset({...preset,events:[{...events[0],args:['left']}]},replay),false);
   assert.ok(attachDream(replay,{mode:'replay',preset}));
   assert.equal(replay.activateFieldImpulse('down'),false,'live input cannot alter replay');
   tickFor(replay,120);
   assert.deepEqual(snapshot(replay),snapshot(record));
   assert.equal(replay.dream.events.length,1);
  }finally{record.destroy();replay.destroy();}
 }
 }finally{if(originalRAF===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=originalRAF;}
});
