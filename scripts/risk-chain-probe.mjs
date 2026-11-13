import assert from 'node:assert/strict';
import {buildFlightLayout,WispFlight,circleHitsPolygon,obstaclePolygons} from '../dist/flight.mjs';
import {LEVELS} from '../dist/level-catalog.mjs';
import {pickupKind,canCompanionCollect} from '../dist/pickups.mjs';
import {installRiskChains} from '../dist/risk-chains.mjs';
let layouts=0,chains=0;
for(const level of LEVELS)for(const difficulty of [1,4]){
 const layout=buildFlightLayout({seed:'risk-audit',terrain:level.terrain,levelId:level.id,difficulty,stage:difficulty===1?0:3,duration:102,lengthScale:3});
 layouts++;assert.ok(layout.riskChains.length>=1,level.id+' missing risk encounter');
 for(const chain of layout.riskChains){
  chains++;const packets=layout.embers.filter(p=>p.riskChain===chain.id);
  assert.deepEqual(packets.map(pickupKind),['light','dark','light']);
  assert.equal(canCompanionCollect(packets[1]),false);assert.ok(packets[2].x<layout.obstacles.at(-1).x+500);
  for(let n=0;n<=16;n++)for(const offset of [0,chain.dodgeSide*Math.sin(n/16*Math.PI)*64]){
   const x=chain.start+n/16*(chain.end-chain.start),y=chain.y+(n/8-1)*chain.lean+offset;
   for(const obstacle of layout.obstacles)for(const sign of [-1,1])for(const polygon of obstaclePolygons({...obstacle,motion:0,center:obstacle.center+sign*Math.abs(obstacle.motion)}))
    assert.equal(circleHitsPolygon(x,y,22,polygon),false,`${level.id}: blocked chain or bypass`);
  }
 }
}
// Repositioning existing ordinary lights keeps both their quantity and value.
const fixture={obstacles:[{id:0,x:2200,width:120,center:310},{id:1,x:4200,width:120,center:310},{id:2,x:6200,width:120,center:310}],sections:[],embers:[{id:'a',kind:'light',x:4100,y:400,value:1},{id:'b',kind:'light',x:4400,y:400,value:1}]};
installRiskChains(fixture,{duration:50,speed:154,height:620,stage:0,difficulty:1,elite:false,mapIndex:0},()=>true);
assert.equal(fixture.riskChains.length,1);assert.equal(fixture.embers.filter(p=>pickupKind(p)==='light').length,2);assert.equal(fixture.embers.reduce((sum,p)=>sum+p.value,0),2);

globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:620})};
for(const terrain of ['ruins','canopy','storm']){
 const e=new WispFlight({canvas,seed:'snare-intro',terrain,duration:102,node:{difficulty:1,row:0,flightLengthScale:3},companions:['seer'],flame:75});
 for(const chain of e.layout.riskChains)assert.ok(e.drafts.zones.every(z=>z.x+z.rx<chain.start-140||z.x-z.rx>chain.end+140));
 const chain=e.layout.riskChains[0];e.layout.embers=e.layout.embers.filter(p=>p.riskChain===chain.id);
 const [a,b,c]=e.layout.embers;e.distance=a.x-e.player.x-10;e.player.y=a.y;e.player.vy=0;e.running=true;e.flap();
 for(let i=0;i<95&&!e.dying;i++)e.step(1/60);
 assert.ok(a.collected&&c.collected);assert.ok(!b.collected);assert.equal(e.dying,false,'One timed Lift clears the introductory chain');
 e.collect(b);assert.equal(e.lightPenalties.length,1);e.collect({kind:'light',x:e.distance+e.player.x,y:e.player.y});assert.equal(e.lightPenalties.length,0,'Following Glow cleanses the seed');e.destroy();
}
console.log(JSON.stringify({layouts,chains,geometryAndMovingClearance:true,fuelBudgetPreserved:true,threeTerrainIntroBypasses:true,warningAndCleanse:true,noDraftOverlap:true}));
