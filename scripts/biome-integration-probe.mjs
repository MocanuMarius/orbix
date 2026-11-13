import assert from 'node:assert/strict';
import {BIOMES,BIOME_LEVELS} from '../dist/biomes.mjs';
import {WispFlight,circleHitsPolygon,circleHitsObstacle} from '../dist/flight.mjs';
import {scenePropPolygons} from '../dist/scene-props.mjs';
import {isFuelPickup} from '../dist/pickups.mjs';
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})});
const families=['stillwater-tunnel','draft-staircase','seed-orchard'];
const reports=[],missing=[],blockedFuel=[],blockedActors=[];
for(const identity of BIOME_LEVELS)for(const encounterFamily of families){
 const node={...identity,levelId:identity.id,flightLengthScale:3,duration:102,row:0,mapIndex:0,difficulty:1,encounterFamily};
 const e=new WispFlight({canvas:canvas(),terrain:identity.terrain,node,seed:`biome-integration:${identity.id}`,duration:102,companions:['collector'],flame:100});
 const actors=e.biomeDynamics.items.length,drafts=e.drafts.zones.length;
 reports.push({map:identity.id,biome:identity.biomeId,family:encounterFamily,actors,drafts});
 if(!actors)missing.push({map:identity.id,family:encounterFamily});
 for(const item of e.biomeDynamics.items.filter(item=>item.family!=='fall'))for(const obstacle of e.layout.obstacles){
  const hits=[-1,1].some(sign=>circleHitsObstacle(item.x,item.y,9.35,obstacle,0,obstacle.center+sign*Math.abs(obstacle.motion||0)));
  if(hits)blockedActors.push({map:identity.id,family:encounterFamily,actor:item.id,obstacle:obstacle.id});
 }
 for(const packet of e.layout.embers.filter(isFuelPickup))for(const obstacle of e.layout.obstacles){
  if(!obstacle.sceneProps?.length||packet.x<obstacle.x-obstacle.width-24||packet.x>obstacle.x+obstacle.width*2.5+24)continue;
  const hits=[-1,1].some(sign=>scenePropPolygons({...obstacle,motion:0,center:obstacle.center+sign*Math.abs(obstacle.motion||0)})
   .some(poly=>circleHitsPolygon(packet.x,packet.y,9.35,poly)));
  if(hits)blockedFuel.push({map:identity.id,family:encounterFamily,pickup:packet.id,obstacle:obstacle.id});
 }
 e.destroy();
}
const biomes=BIOMES.map(b=>{const r=reports.filter(r=>r.biome===b.id);return{id:b.id,actorsMin:Math.min(...r.map(x=>x.actors)),actorsMax:Math.max(...r.map(x=>x.actors)),draftsMin:Math.min(...r.map(x=>x.drafts)),draftsMax:Math.max(...r.map(x=>x.drafts))};});
console.log(JSON.stringify({cases:reports.length,biomes,missing,blockedFuel,blockedActors},null,2));
assert.equal(blockedFuel.length,0,'Fuel stays outside scene props across the full canopy sway');
assert.equal(blockedActors.length,0,'Interactive objects have a body-clear target across the full canopy sway');
assert.equal(missing.length,0,'Every authored map and encounter family has a visible biome interaction');
