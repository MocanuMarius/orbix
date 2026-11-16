import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight,buildFlightLayout} from '../dist/flight.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {getRunModifiers} from '../dist/model.mjs';
import {sparkMass} from '../dist/spark-size.mjs';
import {sparkDemand} from '../dist/spark-supply.mjs';
const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:915,height:412})};
const total=e=>e.layout.embers.reduce((n,p)=>n+(!p.generated&&!p.harmful?getPickupSpec(p).fuel:0),0);
const flight=(level,difficulty,duration,extra={})=>new WispFlight({canvas,preflight:true,seed:'supply-contract:'+level.id,terrain:level.terrain,duration,
 node:{levelId:level.id,difficulty,row:0,mapIndex:0,...extra},companions:['collector']});

test('all 48 starter courses have a finite 60%-or-higher reference fuel budget at short and long lengths',()=>{
 for(const level of BIOME_LEVELS)for(const difficulty of [1,2])for(const duration of [50,140]){
  const e=flight(level,difficulty,duration),s=e.layout.sparkSupply,label=[level.id,difficulty,duration].join(':');
  assert.equal(total(e),s.available,label);
  assert.equal(e.layout.glowBudget.available,s.available,label);
  assert.equal(e.layout.glowBudget.target,s.targetFuel,label);
  assert.ok(s.requiredShare>=.6&&s.requiredShare<.66,label);
  assert.ok(s.actualReferenceShare>=.6,label);
  assert.equal(s.budgetExcess,0,label);assert.equal(s.budgetDeficit,0,label);
  assert.ok(s.count>=6,label);assert.ok(s.maxGap<8,label);
  for(const p of e.layout.embers.filter(p=>p.supplyRelocated)){
   assert.ok(e.objectiveBodyClear(p.x,p.y,30),label);
   assert.equal(p.anchor,null);assert.equal(p.accessible,true);
  }
  e.destroy();
 }
});

test('the same course never increases its fuel tax in response to a better player build',()=>{
 const level=BIOME_LEVELS[0],a=flight(level,1,100);
 const b=new WispFlight({canvas,preflight:true,seed:'supply-contract:'+level.id,terrain:level.terrain,duration:100,
  node:{levelId:level.id,difficulty:1,row:0,mapIndex:0},companions:['collector'],
  modifiers:getRunModifiers({companions:['collector'],skills:{'main-efficiency':1,'main-lift':1,'main-reservoir':1,'collector-attunement':1},artifacts:['quiet-cinder']})});
 assert.equal(a.layout.sparkSupply.targetFuel,b.layout.sparkSupply.targetFuel);
 assert.equal(total(a),total(b));assert.ok(b.flapCost<a.flapCost);
 a.destroy();b.destroy();
});

test('every bare starter budget accounts for a full vessel, including flights after a Rest',()=>{
 for(const stage of [0,1,2])for(const duration of [50,90,140]){
  const demand=sparkDemand({duration,mapIndex:0,stage,difficulty:1});
  assert.equal(demand.referenceReserve,30);
  assert.ok(demand.requiredShare>=.6);
 }
 assert.equal(sparkDemand({duration:100,mapIndex:1,stage:0}).referenceReserve,15);
});

test('fuel shaping preserves marked strengths and actual objects for selected collection challenges',()=>{
 for(const id of ['constellation','three-suns','precision','long-glide','spark-trail']){
  let eligible=0;
  for(let seed=0;seed<12;seed++){
   const e=new WispFlight({canvas,preflight:true,seed:'marked-supply:'+seed,terrain:'canopy',duration:100,
    node:{mapIndex:1,row:2,difficulty:2,bonusId:id},companions:['collector']});
   const o=e.routeObjective;
   if(o?.eligible){
    eligible++;
    for(const t of o.targets)if(t.object){
     assert.ok(e.layout.embers.includes(t.object),id);
     assert.equal(t.object.x,t.x,id);assert.equal(t.object.y,t.y,id);
     if(id==='constellation')assert.equal(sparkMass(t.object),t.stage+1);
     if(id==='three-suns')assert.equal(sparkMass(t.object),3);
    }
   }
   e.destroy();
  }
  assert.ok(eligible>0,id);
 }
});

test('optional marks are chosen from funded inventory and cannot inflate a short flight budget',()=>{
 for(const bonusId of [null,'constellation','three-suns','gilded','precision','long-glide','spark-trail']){
  const e=new WispFlight({canvas,preflight:true,seed:'condensed-0-1|tier:1|map:0-m0-1-2',terrain:'storm',duration:52,
   node:{levelId:'basalt-column-stair',biomeId:'basalt',mapIndex:0,row:1,difficulty:1,bonusId,
    encounterFamily:'draft-staircase',fuelCadence:3,passage:'cavern'},companions:['collector']});
  assert.equal(e.layout.sparkSupply.budgetExcess,0,bonusId);
  assert.equal(total(e),e.layout.sparkSupply.targetFuel,bonusId);
  assert.ok(e.layout.sparkSupply.actualReferenceShare>=.6,bonusId);
  e.destroy();
 }
});


test('later chapter pressure changes real authored apertures, while preserving the opening and a body-sized passage',()=>{
 const level=BIOME_LEVELS[0],averages=[];
 for(const mapIndex of [0,1,2]){
  const e=flight(level,1,120,{row:5,mapIndex,encounterFamily:'stillwater-tunnel'});
  const hard=e.layout.obstacles.filter(o=>o.hard&&!o.reservedDraft);
  assert.ok(hard.length>0);assert.ok(hard.every(o=>o.gap>=84));
  for(const o of hard)assert.ok(o.hardGapScale<1);
  averages.push(hard.reduce((n,o)=>n+o.gap,0)/hard.length);
  e.destroy();
 }
 assert.ok(averages[1]<averages[0]);assert.ok(averages[2]<averages[1]);
});

test('ordinary progressed courses deliver their encounter patterns through the flight, not just the opening',()=>{
 for(const level of BIOME_LEVELS)for(const mapIndex of [1,2])for(const stage of [0,5]){
  const layout=buildFlightLayout({seed:'paced:'+level.id,levelId:level.id,terrain:level.terrain,
   duration:140,height:620,speed:154,lengthScale:1,mapIndex,stage,difficulty:1});
  const authored=layout.sections.filter(s=>s.authoredChallenge),last=layout.obstacles.at(-1);
  assert.ok(authored.length>=2,level.id);
  assert.ok(authored.at(-1).end>last.x*.6,level.id);
  assert.ok(authored.every(s=>s.warningStart<s.start&&s.end>s.start),level.id);
 }
});

test('a normal-length flight actually builds the family advertised on its route',()=>{
 for(const encounterFamily of ['stillwater-tunnel','draft-staircase','seed-orchard']){
  const layout=buildFlightLayout({seed:'family-pacing',duration:140,lengthScale:1,mapIndex:1,stage:3,
   encounterFamily,terrain:'canopy'});
  const authored=layout.sections.filter(s=>s.authoredChallenge);
  assert.ok(authored.length>=2,encounterFamily);
  assert.ok(authored.every(s=>s.authoredChallenge.family===encounterFamily),encounterFamily);
 }
});
