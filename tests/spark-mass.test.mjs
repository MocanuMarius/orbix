import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight,seededRandom} from '../dist/flight.mjs';
import {sparkArtScale,sparkBodyRadius,SPARK_TIERS} from '../dist/spark-size.mjs';
import {installSparkField,sparkHabitat} from '../dist/spark-fields.mjs';
import {getPickupSpec,pickupContactRadius} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';
import {WispFlightView} from '../dist/wisp-renderer.mjs';

const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
test('the larger six-Spark shell has a matching body contact and stays distinct from richer fuel',()=>{
 const small={kind:'light'},cluster={kind:'cluster'},cache={kind:'cache'};
 assert.ok(Math.abs(sparkBodyRadius(small)-6.4*1.75)<1e-10);
 assert.equal(sparkBodyRadius({kind:'dark'}),sparkBodyRadius(small));
 assert.ok(pickupContactRadius(small)>20);
 assert.ok(sparkBodyRadius(small)<sparkBodyRadius(cluster));
 assert.ok(sparkBodyRadius(cluster)<sparkBodyRadius(cache));
 assert.equal(glowPoints(getPickupSpec(small).fuel),6);
});
test('the five world sizes and payouts stay distinct across phone heights and both polarities',()=>{
 assert.deepEqual(SPARK_TIERS.map(t=>t.probability),[.50,.27,.15,.07,.01]);
 for(const h of [320,430,620]){
  let previous=0;
  for(const {mass} of SPARK_TIERS){
   const packet={kind:'light',sparkMass:mass},dark={kind:'dark',sparkMass:mass};
   const r=sparkBodyRadius(packet,h);
   assert.ok(r>previous*1.3);
   assert.equal(sparkBodyRadius(dark,h),r);
   assert.equal(glowPoints(getPickupSpec(packet).fuel),mass*6);
   assert.equal(getPickupSpec(dark).fuel,0);previous=r;
  }
  assert.equal(previous,h*.25);
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
test('large Sparks keep their art tier from the field through shrinking cargo and the delivery ribbon',()=>{
 const e=new WispFlight({canvas,preflight:true,seed:'giant-art-tier'});
 const raster=240/390;
 for(const mass of [6,10]){
  const packet={kind:'cache',sparkMass:mass,x:e.distance+e.player.x,y:e.player.y,carriedAt:0};
  let field;
  WispFlightView.prototype.drawCollectibles.call({scale:raster,buffer:{width:600},
   drawPacket:(x,y,options)=>{field=options;}}, {layout:{embers:[packet]},height:e.height},0,e.distance);
  const contact=e.wisp.cargoPose(packet,0,e.height);
  const cargo=e.wisp.cargoPose(packet,1,e.height);
  assert.equal(field.massTier,mass);
  assert.equal(field.scale,contact.scale*raster);
  assert.ok(cargo.scale<contact.scale);
  assert.equal(cargo.massTier,mass);
  const delivery={...cargo,worldX:packet.x,previousWorldX:packet.x,y:packet.y,previousY:packet.y,interval:1/60};
  e.absorbPacket(packet,'light',delivery);
  assert.equal(e.absorptionEffects.at(-1).initialScale,cargo.scale);
  assert.equal(e.absorptionEffects.at(-1).massTier,mass);
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
 assert.ok(stone.filter(m=>m>=6).length>wood.filter(m=>m>=6).length+55);
 assert.equal(sparkHabitat('moonruins'),'vault');assert.equal(sparkHabitat('fungal'),'cluster');
});
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
