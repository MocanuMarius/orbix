import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';

const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
function flight(modifiers) {
  const engine=new WispFlight({canvas,preflight:true,seed:'storage-fork',condensedGlow:8,
    node:{row:3,bonusId:'gilded'},modifiers});
  engine.flame=engine.maxFlame;
  return engine;
}
function collect(engine,kind,extra={}) {
  const packet={kind,x:engine.distance+engine.player.x,y:engine.player.y,...extra};
  engine.collect(packet);
  return packet;
}

test('Hand Seal rewards only the first two direct waking overfills from the Spark itself',()=>{
  const e=flight({handSeal:true,cacheFuelBonus:20});
  e.flame=e.maxFlame-30;
  collect(e,'light'); // 20 base fuel fits; the 20-point modifier alone spills.
  collect(e,'light',{generated:true});
  collect(e,'cache',{deliveredByWisp:true});
  collect(e,'sight');collect(e,'dusk');collect(e,'dark');
  for(const phase of ['recording','replay','awakening']){
    e.dream={phase,active:phase!=='awakening'};
    collect(e,'light');
  }
  assert.equal(e.storageBonus,0);
  e.dream={phase:'done'};
  const first=collect(e,'light');
  e.collect(first); // Already collected.
  assert.equal(e.storageBonus,1);
  collect(e,'cluster');collect(e,'cache');
  assert.equal(e.storageBonus,2);
  assert.equal(e.getState().condensedTotal,8+e.condensedGlow+2);
});

test('Deep Cache accepts rich body and Collector pickups, including native large shells',()=>{
  let result;
  const e=flight({deepCache:true});
  collect(e,'cluster');collect(e,'dusk',{sparkMass:6});
  collect(e,'cache',{deliveredByWisp:true,fetchedInDream:true});
  assert.equal(e.storageBonus,0);
  collect(e,'light',{sparkMass:6,deliveredByWisp:true});
  assert.equal(e.storageBonus,2);
  collect(e,'cache');collect(e,'light',{sparkMass:10});
  assert.equal(e.storageBonus,4);
  const control=flight({});
  for(const p of [['cluster'],['dusk',{sparkMass:6}],['cache',{deliveredByWisp:true,fetchedInDream:true}],
    ['light',{sparkMass:6,deliveredByWisp:true}],['cache'],['light',{sparkMass:10}]])collect(control,...p);
  assert.equal(e.condensedGlow,control.condensedGlow);
  assert.equal(e.condensedRemainder,control.condensedRemainder);
  assert.equal(e.routeObjective.state.packed,control.routeObjective.state.packed);
  e.onFinish=r=>{result=r;};e.finish(true);e.completionAge=1.5;e.finish(true);
  assert.equal(result.condensedGlow,control.condensedGlow);
  assert.equal(result.storageBonus,4);
  const lost=flight({deepCache:true});
  collect(lost,'cache');lost.onFinish=r=>{result=r;};lost.finish(false);
  assert.equal(result.storageBonus,0);
});
