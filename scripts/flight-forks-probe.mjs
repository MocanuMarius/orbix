import assert from 'node:assert/strict';
import {WispFlight,buildFlightLayout,circleHitsObstacle} from '../dist/flight.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {installFlightForks,validateFlightFork,flightForkLane} from '../dist/flight-forks.mjs';
import {canCompanionCollect,getPickupSpec} from '../dist/pickups.mjs';
import {inLanternRoom} from '../dist/lantern-layout.mjs';
import {glowPoints} from '../dist/vitality.mjs';

const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function engine(identity,themed=false){
 const node={...identity,levelId:identity.id,flightLengthScale:3,duration:102,row:0,mapIndex:0,difficulty:1,
  mapTheme:themed?'darkness-lanterns':null};
 return new WispFlight({canvas:{style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:956,height:430})},
  terrain:identity.terrain,node,seed:`fork-check:${identity.id}`,duration:102,companions:['collector'],flame:100});
}
const reports=[];
const commonFuel=getPickupSpec('light').fuel,cacheFuel=getPickupSpec('cache').fuel;
assert.equal(glowPoints(cacheFuel),3*glowPoints(commonFuel),'the optional cache is three ordinary Sparks');
for(const identity of BIOME_LEVELS){
 const e=engine(identity, reports.length%2===1),fork=e.layout.flightForks[0];
 reports.push({id:identity.id,placed:!!fork,authored:!!fork?.authored});
 if(fork){
  assert.equal(e.layout.flightForks.length,1);
  assert.ok(validateFlightFork(fork,e.layout,{height:e.height,circleHitsObstacle}));
  assert.ok(fork.opening>=90,'baseline Lift arc fits with body and clearance');
  const cache=e.layout.embers.find(p=>p.id===fork.cacheId),fuel=e.layout.embers.find(p=>p.id===fork.fuelId);
  assert.ok(cache.manualOnly&&!canCompanionCollect(cache),'Collector cannot take cache through divider');
  assert.equal(getPickupSpec(cache).fuel,cacheFuel);assert.equal(getPickupSpec(fuel).fuel,commonFuel);
  assert.ok(Math.abs(cache.y-fuel.y)>100,'rewards require different flight positions');
  assert.equal(e.layout.embers.filter(p=>p.forkCache).length,1);
  const before=e.layout.embers.length;installFlightForks(e.layout,{height:e.height,circleHitsObstacle});
  assert.equal(e.layout.embers.length,before,'installation is idempotent, never farms another cache');
  const body=9.35;
  for(const risky of [false,true])for(const p of flightForkLane(fork,risky))
   for(const o of e.layout.obstacles)assert.equal(circleHitsObstacle(p.x,p.y,body+Math.abs(o.motion||0),o,0,o.center),false);
  assert.ok(e.drafts.zones.every(z=>z.x+z.rx<=fork.approachStart-100||z.x-z.rx>=fork.exitEnd+100));
  assert.ok(e.biomeDynamics.items.every(a=>a.x+160<=fork.approachStart||a.x-160>=fork.exitEnd));
  const span=fork.exitEnd-fork.approachStart;
  assert.ok(!inLanternRoom(e.layout,fork.approachStart+span/2,span/2+45),'fork guidance stays clear of lantern rooms');
 }
 e.destroy();
}
const identity=BIOME_LEVELS.find(l=>l.id==='moonruins-bell-stair'),a=engine(identity),b=engine(identity);
assert.deepEqual(a.layout.flightForks,b.layout.flightForks,'seeded forks survive retries and dreams unchanged');
assert.ok(a.layout.flightForks[0]?.authored,'fixture has an authored broad-shelf fork');a.destroy();b.destroy();
for(const flag of ['tutorial','boss']){const layout={obstacles:[],embers:[]};installFlightForks(layout,{[flag]:true,circleHitsObstacle});assert.equal(layout.flightForks.length,0);}
const blocked={obstacles:[],embers:[],sections:[]};installFlightForks(blocked,{endX:4000,circleHitsObstacle});assert.equal(blocked.flightForks.length,0);
const examples=new Map();
let generated=0,placed=0;
for(let roll=0;roll<25;roll++)for(const identity of BIOME_LEVELS){
 const seed='fork:'+roll+':'+identity.id,height=430,duration=75;
 const layout=buildFlightLayout({terrain:identity.terrain,levelId:identity.id,height,duration,seed});
 installFlightForks(layout,{height,seed,terrain:identity.terrain,endX:duration*154,circleHitsObstacle});
 generated++;
 const fork=layout.flightForks[0];
 if(!fork)continue;
 placed++;
 if(examples.has(fork.variant))continue;
 assert.ok(validateFlightFork(fork,layout,{height,circleHitsObstacle}));
 const risky=flightForkLane(fork,true);
 assert.ok(risky.some(p=>p.x>fork.start && p.x<fork.end && Math.abs(p.y-fork.cacheY)>fork.opening*.12));
 examples.set(fork.variant,fork.name);
}
assert.equal(examples.size,24,'all profile and approach combinations must occur in generated courses');
assert.equal(new Set(examples.values()).size,24);
console.log(JSON.stringify({generated,placedAcrossSeeds:placed,variants:examples.size,cases:reports.length,placed:reports.filter(r=>r.placed).length,
 authored:reports.filter(r=>r.authored).length,skipped:reports.filter(r=>!r.placed).map(r=>r.id),
 safeSweptLanes:true,maxCachesPerFlight:1,safeSparks:glowPoints(commonFuel),cacheSparks:glowPoints(cacheFuel),
 automaticCacheFetch:false,deterministic:true}));
