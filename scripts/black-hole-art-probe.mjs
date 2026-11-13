import assert from 'node:assert/strict';
import {drawBlackHoles,blackHoleArtStats} from '../dist/black-hole-art.mjs';

// Cosmetic bookkeeping must stay bounded and read-only relative to simulation.
let rectangles=0;
const context={save(){},restore(){},fillRect(...values){
 assert.ok(values.every(Number.isFinite),'Every pixel rectangle has finite coordinates');
 rectangles++;
}};
function fixture(extra={}){
 return {time:0,height:430,width:956,distance:1000,alive:true,flame:100,
  condensedGlow:37,condensedRemainder:.4,player:{x:200,y:220},
  blackHoles:{items:[{id:'probe-hole',x:1240,y:220,coreRadius:16,influence:220,
   seed:42,rate:0,potentialRate:80,drained:0,lastDrainAt:-Infinity,
   sourceX:1200,sourceY:220}]},...extra};
}
function draw(e){
 const before=structuredClone(e);
 drawBlackHoles(context,e);
 assert.deepEqual(e,before,'Drawing never mutates simulation, fuel or currency');
 return blackHoleArtStats(e).motes;
}
function drain(e,amount=20){
 e.time+=1/120;
 const h=e.blackHoles.items[0];
 h.drained+=amount;h.rate=80;h.lastDrainAt=e.time;
}

const empty=fixture({flame:0});
for(let i=0;i<120;i++){
 empty.time=i/60;empty.blackHoles.items[0].lastDrainAt=empty.time;
 assert.equal(draw(empty),0,'Potential drain on an empty wisp emits nothing');
}
const live=fixture();
drain(live);
const first=draw(live);
assert.ok(first>0&&first<=10,'Actual recorded drain creates a bounded emission');
for(let i=0;i<10;i++)assert.equal(draw(live),first,'Repeated render of one frame cannot emit again');
live.time+=1/120;
assert.equal(draw(live),first,'A new frame without additional stolen Glow cannot emit');
let maximum=first;
for(let i=0;i<240;i++){
 drain(live);maximum=Math.max(maximum,draw(live));
 assert.ok(blackHoleArtStats(live).motes<=48,'Long active drain stays within the pool cap');
}
assert.equal(maximum,48,'Stress fixture exercises the pool capacity');
live.height=390;
assert.equal(draw(live),0,'Resize clears stale world-space motes even at the same simulation time');
drain(live);assert.ok(draw(live)>0,'Fresh drain resumes after resize');
live.time+=2;
assert.equal(draw(live),0,'Finished trails expire without new drain');

const stale=fixture();
stale.time=5;stale.blackHoles.items[0].drained=40;
stale.blackHoles.items[0].lastDrainAt=1;
assert.equal(draw(stale),0,'Old offscreen drain does not create a delayed particle burst');
for(const state of [{dying:true},{completing:true},{alive:false}]){
 const stopped=fixture(state);drain(stopped);
 assert.equal(draw(stopped),0,'Stopped flight cannot begin new stolen-light trails');
}
const reduced=fixture({reducedMotion:true});drain(reduced);
assert.equal(draw(reduced),2,'Reduced motion limits new particles to two per frame');
assert.equal(blackHoleArtStats(fixture()).motes,0,'Effect state is isolated per engine');

console.log(JSON.stringify({actualDrainOnly:true,repeatedFrameStable:true,
 maximumMotes:maximum,resizeClears:true,expiredTrailsRemoved:true,
 noStaleBurst:true,lifecycleGates:true,reducedMotion:true,
 simulationAndEconomyUntouched:true,finiteRectangles:rectangles}));
