import test from 'node:test';
import assert from 'node:assert/strict';
import {EdgingPulse} from '../dist/edging-pulse.mjs';
import {proximityFill} from '../dist/proximity-meter.mjs';
import * as M from '../dist/model.mjs';
const floor={x:0,width:500,center:385,gap:0,bottomShape:[[0,0],[500,0],[500,80],[0,80]]};
const make=()=>{const e={mod:{proximityUnlocked:true,edgingRegen:true},running:true,alive:true,height:400,width:900,time:0,distance:0,flame:40,maxFlame:100,condensedGlow:0,player:{x:180,y:350,radius:10},obstacleCenter:o=>o.center};e.edgingPulse=new EdgingPulse(e);return e;};
const tick=e=>{e.time+=1/60;e.proximityShieldRemaining=Math.max(0,(e.proximityShieldRemaining||0)-1/60);e.edgingPulse.update(1/60,[floor]);};
test('Regenerative Pulse adds three Sparks and keeps normal illumination and recovery timing',()=>{
 const e=make(),p=e.edgingPulse;
 for(let i=0;i<120;i++)tick(e);
 assert.equal(e.flame,50);assert.equal(p.regenGrants,1);assert.equal(p.remaining,5);assert.equal(p.recoveryRemaining,0);assert.equal(proximityFill(p.state),0);
 for(let i=0;i<30;i++)tick(e);assert.ok(p.strength>.1,'The normal light pulse still reveals');
 assert.equal(e.condensedGlow,0);assert.equal(p.triggerCount,1);
});
test('fuel cap never disables normal pulse charging and shields still coexist',()=>{
 const e=make(),p=e.edgingPulse;e.mod.proximityShield=true;
 for(let trigger=1;trigger<=10;trigger++){
  e.flame=0;
  for(let i=0;i<600&&p.triggerCount<trigger;i++)tick(e);
  assert.equal(p.triggerCount,trigger);assert.ok(p.remaining>0);
  assert.equal(e.flame,trigger<=8?10:0);assert.equal(p.regenGrants,Math.min(8,trigger));
  for(let i=0;i<420;i++)tick(e);
 }
 assert.equal(p.exhausted,true);assert.equal(e.proximityShieldGrants,2);
 // The spent recovery quota cannot hide the ordinary charging meter.
 assert.equal(proximityFill({...p.state,active:false,recovering:false,regenFeedback:0,charge:.5}),.5);
});
test('Regenerative Pulse can be purchased alongside Lasting Pulse and Held Tension',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'additive-pulse');s.run.condensedGlow=10000;
 for(const id of ['proximity-awakening','main-edging-attunement','main-edging-lasting','main-edging-tension','main-edging-regeneration'])assert.ok(M.buyCheckpointSkill(s,id),id);
 const m=M.getRunModifiers(s.run);assert.equal(m.edgingRegen,true);assert.equal(m.edgingDuration,7);assert.equal(m.edgingDecayRate,.5);
});
