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
const all={'collector-fetch-cache':1,'collector-fetch-surge':1,'collector-fetch-giant':1};
const make=skills=>new WispFlight({canvas,seed:'collector-size-unlocks',preflight:true,companions:['collector'],modifiers:M.getRunModifiers(run(skills))});

test('Small and Cluster start available, larger loads unlock sequentially, Flash separately',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'load-purchases');s.run.condensedGlow=10000;
 const allowed=()=>[1,2,3,6,10].filter(m=>collectorCanFetch({kind:'cache',sparkMass:m},M.getRunModifiers(s.run)));
 assert.deepEqual(allowed(),[1,2]);assert.equal(M.buyCheckpointSkill(s,'collector-fetch-surge'),false);
 assert.ok(M.buyCheckpointSkill(s,'collector-attunement'));
 for(const[id,mass,price]of [['collector-fetch-cache',3,25],['collector-fetch-surge',6,35],['collector-fetch-giant',10,45]]){
  assert.equal(M.SKILLS[id].cost,price);assert.ok(M.buyCheckpointSkill(s,id));assert.equal(M.getRunModifiers(s.run).collectorFetchMass,mass);assert.equal(allowed().at(-1),mass);
 }
 assert.equal(collectorCanFetch({kind:'sight'},M.getRunModifiers(s.run)),false);
 assert.ok(M.buyCheckpointSkill(s,'collector-fetch-flash'));
 assert.equal(collectorCanFetch({kind:'sight'},M.getRunModifiers(s.run)),true);
 for(const p of [{kind:'dark',sparkMass:1},{kind:'dusk'},{kind:'cache',sparkMass:10,manualOnly:true}])assert.equal(collectorCanFetch(p,M.getRunModifiers(s.run)),false);
});
test('locked Sparks stay for the body; learned large cargo shrinks fully before one 12-Spark delivery',()=>{
 for(const mass of [3,6,10]){
  const e=make(all);e.flame=0;e.getNearbyPickups=()=>e.layout.embers;e.collectorContains=()=>true;
  const p={id:'load-'+mass,kind:'cache',sparkMass:mass,x:0,y:e.player.y};
  p.x=e.distance+e.player.x-pickupContactRadius(p,e.height)-5;e.layout.embers=[p];
  let firstRadius=0,sawContraction=false;
  for(let i=0;i<240&&!p.collected;i++){
   e.time+=1/60;e.wisp.update(e,1/60);
   if(p.carried){const pose=e.wisp.cargoPose(p,e.time,e.height);firstRadius||=pose.scale;
    if(e.time-p.carriedAt>.1)sawContraction||=pose.scale<firstRadius;
    assert.equal(e.flame,0,'The trip cannot pay before delivery');
   }
  }
  assert.ok(p.collected,'Learned load returns');assert.ok(sawContraction);
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
test('body Giant keeps 60 Sparks while delivered Giant packs only the converted Cluster surplus',()=>{
 const direct=make({});direct.flame=0;
 const p={id:'body-giant',kind:'cache',sparkMass:10,x:direct.distance+direct.player.x,y:direct.player.y};
 assert.equal(glowPoints(getPickupSpec(p).fuel),60);direct.collect(p);
 assert.equal(glowPoints(direct.flame),30);assert.equal(glowPoints(direct.pickupOverflow),30);assert.equal(direct.condensedGlow,5);direct.destroy();
 const carried=make(all),packet={id:'compressed-giant',kind:'cache',sparkMass:10,x:carried.distance+carried.player.x,y:carried.player.y};
 carried.flame=carried.maxFlame;compressCollectorCargo(packet);packet.deliveredByWisp=true;carried.collect(packet);
 assert.equal(glowPoints(carried.pickupOverflow),12);assert.equal(carried.condensedGlow,2);assert.equal(carried.baseEmbers,1);carried.destroy();
});
