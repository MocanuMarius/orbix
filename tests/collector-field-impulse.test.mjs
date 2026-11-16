import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {attachDream,validateDreamPreset,dreamFingerprint} from '../dist/dream.mjs';
import {SKILLS,newState,createRun,getRunModifiers,buyCheckpointSkill} from '../dist/model.mjs';
import {CARD_SYSTEM,makeSkillCard,getCardModifiers} from '../dist/skill-cards.mjs';
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

test('Dive sustains native descent against wind until expiry; Lift cancels it and terminal limits remain',()=>{
 const e=flight({modifiers:{collectorFieldImpulse:true,cardFieldSources:2}});
 try{
  e.player.y=40;e.player.vy=0;
  e.gustState=()=>({active:true,direction:-1,force:2000,strength:1,guardian:false});
  assert.ok(e.activateFieldImpulse('down'));assert.equal(e.fieldImpulse.duration,1.6);
  const floor=200*e.scaleY;
  for(let i=0;i<18;i++){
   e.step(1/60);assert.ok(Math.abs(e.player.vy-floor)<1e-7,'updraft cannot erase an active Dive');
  }
  e.time=e.fieldImpulse.until;e.player.vy=0;e.step(1/60);
  assert.ok(e.player.vy<0,'normal upward wind resumes after expiry');
  e.fieldImpulse=null;e.wisp.cooldown=0;e.wisp.phase='ready';
  e.activateFieldImpulse('down');assert.ok(e.flap());assert.equal(e.fieldImpulse,null);assert.ok(e.player.vy<0);
  e.wisp.cooldown=0;e.wisp.phase='ready';e.player.y=40;e.player.vy=10000;
  assert.ok(e.activateFieldImpulse('down'));e.step(1/600);
  assert.ok(e.player.vy<1000*e.scaleY,'normal terminal limit bounds even an extreme descent');
 }finally{e.destroy();}
});

test('one swipe notifies once after its row replay and one Wave Loom emission',()=>{
 const cards=['field-impulse','springboard','wave-loom','refrain'].map((id,i)=>makeSkillCard(id,`once:${i}`));
 const e=flight({modifiers:{...getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:cards}),collectorFieldImpulse:true}});
 try{
  e.flame=0;let notified=0,cooldownCalls=0;
  const duration=e.wisp.recoveryDuration.bind(e.wisp);e.wisp.recoveryDuration=(...args)=>{cooldownCalls++;return duration(...args)};
  e.notify=()=>{notified++;assert.equal(e.luminanceWaves.waves.length,1);assert.equal(e.cardRowTrace.passes,2);};
  assert.ok(e.activateFieldImpulse('right'));assert.equal(notified,1);assert.equal(cooldownCalls,1);
  assert.equal(e.activationEvents.events.filter(a=>a.source==='collector-field-impulse').length,1);
  assert.equal(e.cardRowSequence,1);assert.equal(e.luminanceWaves.waves.length,1);
  assert.equal(e.activateFieldImpulse('right'),false);assert.equal(notified,1);assert.equal(cooldownCalls,1);
 }finally{e.destroy();}
});

test('paused midflight reorder changes the next duration, while removal clears the active impulse',()=>{
 const modifiers=ids=>getRunModifiers({skillSystem:CARD_SYSTEM,companions:['collector'],skills:{},mountedCards:ids.map((id,i)=>makeSkillCard(id,`live:${id}:${i}`))});
 const e=flight({modifiers:modifiers(['field-impulse','chameleon'])});
 try{
  assert.ok(e.activateFieldImpulse('right'));assert.equal(e.fieldImpulse.duration,.8);
  e.paused=true;assert.ok(e.reconcileCardLoadout({modifiers:modifiers(['chameleon','field-impulse']),condensedGlow:0}));
  assert.equal(e.fieldImpulse.duration,.8,'accepted action keeps its original duration');
  e.paused=false;e.time=e.fieldImpulse.until;e.wisp.phase='ready';e.wisp.cooldown=0;
  assert.ok(e.activateFieldImpulse('right'));assert.equal(e.fieldImpulse.duration,1.6);
  e.paused=true;assert.ok(e.reconcileCardLoadout({modifiers:modifiers([]),condensedGlow:0}));
  assert.equal(e.fieldImpulse,null);assert.equal(fieldImpulseSpeed(e),1);
  e.paused=false;assert.equal(e.activateFieldImpulse('right'),false);
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
