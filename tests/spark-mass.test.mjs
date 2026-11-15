import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight,seededRandom} from '../dist/flight.mjs';
import {sparkArtScale,sparkBodyRadius,SPARK_TIERS} from '../dist/spark-size.mjs';
import {installSparkField,sparkHabitat} from '../dist/spark-fields.mjs';
import {getPickupSpec,pickupContactRadius} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {compressCollectorCargo} from '../dist/collector-load.mjs';

const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
test('the shared Spark shell has matching body contact for every fuel strength',()=>{
 const small={kind:'light'},cluster={kind:'cluster'},cache={kind:'cache'};
 assert.ok(Math.abs(sparkBodyRadius(small)-12.8)<1e-10);
 assert.equal(sparkBodyRadius({kind:'dark'}),sparkBodyRadius(small));
 assert.ok(pickupContactRadius(small)>20);
 assert.equal(sparkBodyRadius(small),sparkBodyRadius(cluster));
 assert.equal(sparkBodyRadius(cluster),sparkBodyRadius(cache));
 assert.equal(glowPoints(getPickupSpec(small).fuel),6);
});
test('three fuel strengths share one radius across phone heights and polarities',()=>{
 assert.deepEqual(SPARK_TIERS.map(t=>t.probability),[.30,.42,.28]);
 for(const h of [320,430,620]){
  let previous=0;
  for(const {mass} of SPARK_TIERS){
   const packet={kind:'light',sparkMass:mass},dark={kind:'dark',sparkMass:mass};
   const r=sparkBodyRadius(packet,h);
   assert.equal(r,12.8);
   assert.equal(sparkBodyRadius(dark,h),r);
   assert.equal(glowPoints(getPickupSpec(packet).fuel),mass*6);
   assert.equal(getPickupSpec(dark).fuel,0);previous=r;
  }
  assert.equal(previous,12.8);
 }
});
test('terrain motes have the Small shell in flight, at the Collector and during a body pickup',()=>{
 const e=new WispFlight({canvas,preflight:true,seed:'terrain-mote-size'});
 const small={kind:'light',x:e.distance+e.player.x,y:e.player.y};
 const mote={...small,generated:true,carriedAt:0};
 const radius=sparkBodyRadius(small,e.height),scale=sparkArtScale(small,e.height);
 assert.equal(sparkBodyRadius(mote,e.height),radius);
 const draw=[];
 WispFlightView.prototype.drawCollectibles.call({scale:240/390,buffer:{width:600},
   drawPacket:(x,y,options)=>draw.push(options)}, {layout:{embers:[small,mote]},height:e.height}, 0, e.distance);
 assert.equal(draw.length,2);
 assert.equal(draw[0].massTier,1);
 assert.deepEqual(draw[1],{...draw[0],massTier:0});
 assert.equal(e.wisp.cargoPose(mote,0,e.height).scale,scale);
 e.shatterPickupRing(mote);
 assert.equal(e.particles.at(-1).radius,radius);
 e.flame=0;e.collect(mote);
 const absorption=e.absorptionEffects.at(-1);
 assert.equal(absorption.shellRadius,radius);
 assert.equal(absorption.initialScale,scale);
 assert.equal(glowPoints(e.flame),2);
 assert.equal(e.baseEmbers,0);
 e.destroy();
});
test('large Sparks keep their field tier until capture then compact to Cluster for the delivery ribbon',()=>{
 const e=new WispFlight({canvas,preflight:true,seed:'giant-art-tier'});
 const raster=240/390;
 for(const mass of [3]){
  const packet={kind:'cache',sparkMass:mass,x:e.distance+e.player.x,y:e.player.y,carriedAt:0};
  let field;
  WispFlightView.prototype.drawCollectibles.call({scale:raster,buffer:{width:600},
   drawPacket:(x,y,options)=>{field=options;}}, {layout:{embers:[packet]},height:e.height},0,e.distance);
  const contact=e.wisp.cargoPose(packet,0,e.height);
  const cargo=e.wisp.cargoPose(packet,1,e.height);
  assert.equal(field.massTier,mass);
  assert.equal(field.scale,contact.scale*raster);
  assert.equal(cargo.scale,contact.scale);
  assert.equal(cargo.massTier,2);
  const delivery={...cargo,worldX:packet.x,previousWorldX:packet.x,y:packet.y,previousY:packet.y,interval:1/60};
  compressCollectorCargo(packet);e.absorbPacket(packet,'light',delivery);
  assert.equal(e.absorptionEffects.at(-1).initialScale,cargo.scale);
  assert.equal(e.absorptionEffects.at(-1).massTier,2);
 }
 e.destroy();
});
test('biome profiles affect real pickups while authored fuel chains keep their position and value',()=>{
 function field(biomeId){
  const embers=Array.from({length:1000},(_,i)=>({id:i,kind:'light',x:600+i*450,y:215,riskChain:i%17===0}));
  const layout={embers,levelIdentity:{biomeId}};
  installSparkField(layout,{height:430,random:seededRandom('habitat-test'),clear:()=>true});
  for(const p of embers.filter(p=>p.riskChain)){
   assert.equal(p.sparkMass,1);assert.equal(p.x,600+p.id*450);assert.equal(p.y,215);
  }
  return embers.map(p=>p.sparkMass);
 }
 const wood=field('pinewood'),stone=field('crystal');
 assert.deepEqual(wood,field('pinewood'));
 assert.ok(wood.filter(m=>m===1).length>stone.filter(m=>m===1).length+150);
 assert.ok(stone.filter(m=>m===3).length>wood.filter(m=>m===3).length+150);
 assert.equal(sparkHabitat('moonruins'),'vault');assert.equal(sparkHabitat('fungal'),'cluster');
});
test('a Cache fills available capacity first and only its surplus reaches packing',()=>{
 for(const [start,rate,stored] of [[60,1/6,1],[80,1/6,2],[80,1/3,4]]){
  const e=new WispFlight({canvas,preflight:true,seed:'cache-receipt',modifiers:{condensationRules:{multiplier:rate}}});e.flame=start;
  const p={kind:'cache',sparkMass:3,id:'receipt',x:e.player.x,y:e.player.y};
  assert.equal(glowPoints(getPickupSpec(p).fuel),18);e.collect(p);e.collect(p);
  assert.equal(glowPoints(e.flame),30);assert.equal(e.condensedGlow,stored);assert.equal(e.baseEmbers,1);e.destroy();
 }
});
test('Dark Sparks share the shell and grant no fuel',()=>{
 const e=new WispFlight({canvas,preflight:true,seed:'dark-receipt'});e.flame=40;
 const p={kind:'dark',sparkMass:3,id:'dark',x:e.player.x,y:e.player.y,harmful:true};
 assert.equal(sparkBodyRadius(p),sparkBodyRadius({kind:'light'}));
 e.collect(p);assert.equal(e.flame,40);assert.equal(e.condensedGlow,0);assert.deepEqual(e.lightPenalties,[8]);e.destroy();
});
