import assert from 'node:assert/strict';
import {newState,createRun,getRunModifiers,getSkillCost,buyCheckpointSkill,getAvailableUpgrades,SKILLS} from '../dist/model.mjs';
import {EdgingPulse} from '../dist/edging-pulse.mjs';
const state=newState();state.run=createRun(state.profile,'proximity-proof',1);state.run.condensedGlow=10000;state.run.startingSkill='main-sight';state.run.skills={'main-sight':1};
assert.equal(getRunModifiers(state.run).proximityUnlocked,false);
assert.equal(getSkillCost(state.run,'proximity-light-shield'),null);
assert(getAvailableUpgrades(state).includes('proximity-awakening'));
assert(buyCheckpointSkill(state,'proximity-awakening'));
assert.equal(getRunModifiers(state.run).proximityUnlocked,true);
assert(buyCheckpointSkill(state,'main-edging-tension'));
assert(buyCheckpointSkill(state,'proximity-grace'));
assert(buyCheckpointSkill(state,'proximity-light-shield'));
const engine={obstacleCenter:o=>o.center,mod:{},running:true,alive:true,player:{x:50,y:85,radius:5},distance:0,height:200,time:0,shield:{},flame:50,maxFlame:100};
const floor={x:0,width:200,center:100,gap:0,motion:0,bottomShape:[[0,0],[200,0],[200,100],[0,100]]};
const pulse=new EdgingPulse(engine);pulse.update(3,[floor]);assert.equal(pulse.charge,0);assert.equal(pulse.triggerCount,0);
engine.mod=getRunModifiers(state.run);pulse.update(2.1,[floor]);assert.equal(pulse.triggerCount,1);assert.equal(engine.proximityShieldRemaining,8);assert.equal(engine.proximityShieldGrants,1);
pulse.remaining=0;pulse.recoveryRemaining=0;engine.proximityShieldRemaining=0;pulse.update(2.1,[floor]);assert.equal(engine.proximityShieldGrants,2);
pulse.remaining=0;engine.proximityShieldRemaining=0;pulse.update(2.1,[floor]);assert.equal(engine.proximityShieldGrants,2);
pulse.reset();pulse.update(3,[]);assert.equal(pulse.charge,0);
assert(SKILLS['main-lift'].cost>SKILLS['main-dream-wake'].cost*3);
console.log('PASS: purchase gate, separate branch, dormant baseline, surface-only charge, two-shield cap, differentiated prices.');

// Real collision integration: Aegis spends itself, keeps Protector charges,
// expires naturally, and does not turn into permanent immunity.
const {WispFlight}=await import('../dist/flight.mjs');
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const e=new WispFlight({canvas:{style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})},seed:'aegis-proof',terrain:'ruins',duration:40,companions:['collector'],modifiers:getRunModifiers(state.run)});
e.start();e.proximityShieldRemaining=8;e.hit(null);assert(!e.dying);assert.equal(e.proximityShieldRemaining,0);assert(e.shield.protection>0);
e.shield.protection=0;e.hit(null);assert(e.dying);e.destroy();console.log('PASS: real flight collision consumes Aegis; next unshielded impact kills.');
