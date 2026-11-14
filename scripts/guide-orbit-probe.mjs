import assert from 'node:assert/strict';
import {WispFlight,FLIGHT_TUNING,circleHitsObstacle} from '../dist/flight.mjs';
import {FlightProjection} from '../dist/flight-projection.mjs';
import {condenseGlow,getCondensationRules} from '../dist/condensed-glow.mjs';
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})};
const e=new WispFlight({canvas,seed:'guide',duration:90,companions:['collector'],modifiers:{driftSense:3},flame:100});
e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.biomeDynamics=null;e.running=true;e.player.y=180;e.player.vy=0;
const predictor=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle);
const fall=predictor.predict(e,3),rise=predictor.predict(e,3,[0]);
assert.ok(rise.points[4].y<fall.points[4].y);
const p=rise.points[8];e.layout.embers=[{x:p.x,y:p.y,kind:'light',value:1}];
const before=JSON.stringify({player:e.player,flame:e.flame,embers:e.layout.embers});
const times=[];let route;
for(let i=0;i<40;i++){const t=performance.now();route=predictor.findRoute(e);times.push(performance.now()-t);}
assert.ok(route,'Visible reachable Spark has a route');
assert.equal(JSON.stringify({player:e.player,flame:e.flame,embers:e.layout.embers}),before);
e.layout.boss={attacks:[{}]};assert.equal(predictor.findRoute(e),null);delete e.layout.boss;
e.layout.embers=[];e.wisp.cooldown=5;e.wisp.cooldownMax=10;
let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,front=false,back=false;
for(let i=0;i<600;i++){e.time=i/60;e.wisp.update(e,1/60);front||=e.wisp.depth>.5;back||=e.wisp.depth<-.5;const d=Math.hypot(e.wisp.x-e.player.x,e.wisp.y-e.player.y);assert.ok(d<=Math.max(28,e.wisp.range(e)*.9)+.01);minX=Math.min(minX,e.wisp.x);maxX=Math.max(maxX,e.wisp.x);minY=Math.min(minY,e.wisp.y);maxY=Math.max(maxY,e.wisp.y);}
assert.ok(front&&back,'Collector crosses front and back depth planes');
assert.ok(maxX-minX>35&&maxY-minY>35,'Collector actively crosses both axes');
assert.equal(condenseGlow(20).amount,1);
assert.equal(condenseGlow(20,{rules:{...getCondensationRules(),multiplier:1/3}}).amount,2);
times.sort((a,b)=>a-b);
console.log(JSON.stringify({liftAndFall:true,sparkRoute:true,noLiveMutation:true,guardianCaution:true,collectorOrbitWithinMaximumRange:true,routeP95ms:times[38]}));
