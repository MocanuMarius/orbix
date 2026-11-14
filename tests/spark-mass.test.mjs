import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {sparkBodyRadius} from '../dist/spark-size.mjs';
import {getPickupSpec,pickupContactRadius} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';

const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
test('a giant fills available capacity first; only its actual surplus reaches packing',()=>{
 for(const [max,rate,stored] of [[100,1/6,5],[150,1/6,2],[100,1/3,10]]){
  const e=new WispFlight({canvas,preflight:true,seed:'giant-receipt',modifiers:{maxGlow:max,condensationRules:{multiplier:rate}}});
  e.flame=0;
  const p={kind:'cache',sparkMass:10,id:'receipt',x:e.distance+e.player.x,y:e.player.y};
  assert.equal(glowPoints(getPickupSpec(p).fuel),60);
  assert.equal(sparkBodyRadius(p,e.height)*2,e.height/2);
  e.collect(p);e.collect(p);
  assert.equal(glowPoints(e.flame),glowPoints(max));assert.equal(e.condensedGlow,stored);
  assert.equal(glowPoints(e.pickupOverflow),60-glowPoints(max));assert.equal(e.baseEmbers,1);
 }
});
test('a giant Dark Spark enlarges the hazard without granting fuel or secretly increasing darkness',()=>{
 const e=new WispFlight({canvas,preflight:true,seed:'dark-giant-receipt'});e.flame=40;
 const p={kind:'dark',sparkMass:10,id:'dark',x:e.distance+e.player.x,y:e.player.y,harmful:true};
 assert.ok(pickupContactRadius(p,e.height)>100);
 e.collect(p);assert.equal(e.flame,40);assert.equal(e.condensedGlow,0);assert.deepEqual(e.lightPenalties,[8]);
});
