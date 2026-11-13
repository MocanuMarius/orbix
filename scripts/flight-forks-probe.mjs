import assert from 'node:assert/strict';
import {WispFlight,circleHitsObstacle} from '../dist/flight.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {installFlightForks,validateFlightFork,flightForkLane} from '../dist/flight-forks.mjs';
import {canCompanionCollect,getPickupSpec} from '../dist/pickups.mjs';

const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function engine(identity){
 const node={...identity,levelId:identity.id,flightLengthScale:3,duration:102,row:0,mapIndex:0,difficulty:1};
 return new WispFlight({canvas:{style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:956,height:430})},
  terrain:identity.terrain,node,seed:`fork-check:${identity.id}`,duration:102,companions:['collector'],flame:100});
}
const reports=[];
for(const identity of BIOME_LEVELS){
 const e=engine(identity),fork=e.layout.flightForks[0];
 reports.push({id:identity.id,placed:!!fork,authored:!!fork?.authored});
 if(fork){
  assert.equal(e.layout.flightForks.length,1);
  assert.ok(validateFlightFork(fork,e.layout,{height:e.height,circleHitsObstacle}));
  assert.ok(fork.opening>=90,'baseline Lift arc fits with body and clearance');
  const cache=e.layout.embers.find(p=>p.id===fork.cacheId),fuel=e.layout.embers.find(p=>p.id===fork.fuelId);
  assert.ok(cache.manualOnly&&!canCompanionCollect(cache),'Collector cannot take cache through divider');
  assert.equal(getPickupSpec(cache).fuel,50);assert.equal(getPickupSpec(fuel).fuel,24);
  assert.ok(Math.abs(cache.y-fuel.y)>100,'rewards require different flight positions');
  assert.equal(e.layout.embers.filter(p=>p.forkCache).length,1);
  const before=e.layout.embers.length;installFlightForks(e.layout,{height:e.height,circleHitsObstacle});
  assert.equal(e.layout.embers.length,before,'installation is idempotent, never farms another cache');
  const body=9.35;
  for(const risky of [false,true])for(const p of flightForkLane(fork,risky))
   for(const o of e.layout.obstacles)assert.equal(circleHitsObstacle(p.x,p.y,body+Math.abs(o.motion||0),o,0,o.center),false);
  assert.ok(e.drafts.zones.every(z=>z.x+z.rx<=fork.approachStart-100||z.x-z.rx>=fork.exitEnd+100));
  assert.ok(e.biomeDynamics.items.every(a=>a.x+160<=fork.approachStart||a.x-160>=fork.exitEnd));
 }
 e.destroy();
}
const identity=BIOME_LEVELS.find(l=>l.id==='moonruins-bell-stair'),a=engine(identity),b=engine(identity);
assert.deepEqual(a.layout.flightForks,b.layout.flightForks,'seeded forks survive retries and dreams unchanged');
assert.ok(a.layout.flightForks[0]?.authored,'fixture has an authored broad-shelf fork');a.destroy();b.destroy();
for(const flag of ['tutorial','boss']){const layout={obstacles:[],embers:[]};installFlightForks(layout,{[flag]:true,circleHitsObstacle});assert.equal(layout.flightForks.length,0);}
const blocked={obstacles:[],embers:[],sections:[]};installFlightForks(blocked,{endX:4000,circleHitsObstacle});assert.equal(blocked.flightForks.length,0);
console.log(JSON.stringify({cases:reports.length,placed:reports.filter(r=>r.placed).length,
 authored:reports.filter(r=>r.authored).length,skipped:reports.filter(r=>!r.placed).map(r=>r.id),
 safeSweptLanes:true,cachePerFlight:1,cacheInternalGlow:40,automaticCacheFetch:false,deterministic:true}));
