import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {collectorCanFetch,compressCollectorCargo} from '../dist/collector-load.mjs';
import {sparkBodyRadius,sparkMass} from '../dist/spark-size.mjs';
import {pickupContactRadius,getPickupSpec} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>context,getBoundingClientRect:()=>({width:915,height:412})};
const run=skills=>({companions:['collector'],skills});
const all={'collector-fetch-large':1};
const make=skills=>new WispFlight({canvas,seed:'collector-size-unlocks',preflight:true,companions:['collector'],modifiers:M.getRunModifiers(run(skills))});

test('Small and Cluster start available, larger loads unlock together, Flare separately',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'load-purchases');s.run.condensedGlow=10000;
 const allowed=()=>[1,2,3].filter(m=>collectorCanFetch({kind:'cache',sparkMass:m},M.getRunModifiers(s.run)));
 assert.deepEqual(allowed(),[1,2]);assert.equal(M.buyCheckpointSkill(s,'collector-fetch-large'),false);
 assert.ok(M.buyCheckpointSkill(s,'collector-attunement'));
 assert.equal(M.getSkillPrice(M.getSkillWallet(s),'collector-fetch-large'),50);
 assert.ok(M.buyCheckpointSkill(s,'collector-fetch-large'));
 assert.deepEqual(allowed(),[1,2,3]);
 assert.equal(collectorCanFetch({kind:'sight'},M.getRunModifiers(s.run)),false);
 assert.ok(M.buyCheckpointSkill(s,'collector-fetch-flash'));
 assert.equal(collectorCanFetch({kind:'sight'},M.getRunModifiers(s.run)),true);
 for(const p of [{kind:'dark',sparkMass:1},{kind:'dusk'},{kind:'cache',sparkMass:10,manualOnly:true}])assert.equal(collectorCanFetch(p,M.getRunModifiers(s.run)),false);
});
test('locked Caches stay for the body; learned cargo reduces density before one 12-Spark delivery',()=>{
 for(const mass of [3]){
  const e=make(all);e.flame=0;e.getNearbyPickups=()=>e.layout.embers;e.collectorContains=()=>true;
  const p={id:'load-'+mass,kind:'cache',sparkMass:mass,x:0,y:e.player.y};
  p.x=e.distance+e.player.x-pickupContactRadius(p,e.height)-7;e.layout.embers=[p];
  let firstRadius=0,sawCompaction=false;
  for(let i=0;i<900&&!p.collected;i++){
   e.time+=1/60;e.wisp.update(e,1/60);
   if(p.carried){const pose=e.wisp.cargoPose(p,e.time,e.height);firstRadius||=pose.scale;
    if(e.time-p.carriedAt>.1)sawCompaction||=pose.compacting;
    assert.equal(e.flame,0,'The trip cannot pay before delivery');
   }
  }
  if(mass===3)assert.equal(e.wisp.recoveryFraction(),1,'Cache delivery restores the entire search ring');
  else assert.ok(e.wisp.recoveryFraction()<1,'Other loads still spend recovery');
  assert.ok(p.collected,'Learned load returns');assert.ok(sawCompaction);
  assert.ok(e.time-p.carriedAt>=.32,'Compression completes before absorption');
  assert.equal(p.collectorOriginalMass,mass);assert.equal(sparkMass(p),2);
  assert.equal(glowPoints(e.flame),12);assert.equal(e.condensedTotal,0);
  assert.equal(e.absorptionEffects.at(-1).massTier,2);
  assert.ok(Math.abs(e.absorptionEffects.at(-1).shellRadius-sparkBodyRadius({kind:'cluster',sparkMass:2},e.height))<1e-8);
  e.collect(p);assert.equal(glowPoints(e.flame),12,'One payment only');e.destroy();
 }
 const locked=make({});locked.getNearbyPickups=()=>locked.layout.embers;locked.collectorContains=()=>true;
 const p={kind:'cache',sparkMass:3,x:locked.distance+locked.player.x-45,y:locked.player.y};locked.layout.embers=[p];
 locked.time+=1/60;locked.wisp.update(locked,1/60);assert.equal(locked.wisp.target,null);assert.equal(p.attracted,undefined);
 locked.flame=0;locked.collect(p);assert.equal(glowPoints(locked.flame),18);assert.equal(sparkMass(p),3);locked.destroy();
});
test('body Cache keeps 18 Sparks while a delivered Cache compacts to 12',()=>{
 const direct=make({});direct.flame=0;const p={kind:'cache',sparkMass:3,x:direct.player.x,y:direct.player.y};direct.collect(p);
 assert.equal(glowPoints(direct.flame),18);direct.destroy();
 const carried=make(all);carried.flame=carried.maxFlame;const packet={kind:'cache',sparkMass:3,x:carried.player.x,y:carried.player.y};
 compressCollectorCargo(packet);packet.deliveredByWisp=true;carried.collect(packet);
 assert.equal(glowPoints(carried.pickupOverflow),12);assert.equal(carried.condensedGlow,2);carried.destroy();
});

test('Flare Handling restores missing fuel once on body or carrier contact, without packing surplus',()=>{
 for(const [trained,delivered,start,expected] of [[true,false,0,6],[true,true,0,6],[true,false,95,30],[false,false,0,0]]){
  const flight=make(trained?{'collector-fetch-flash':1}:{});
  flight.flame=start;
  const flash={kind:'sight',x:flight.player.x,y:flight.player.y,deliveredByWisp:delivered};
  flight.collect(flash);flight.collect(flash);
  assert.equal(glowPoints(flight.flame),expected);
  assert.equal(flight.condensedGlow,0);
  assert.ok(flight.sightUntil>flight.time);
  flight.destroy();
 }
});
