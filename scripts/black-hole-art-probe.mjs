import assert from 'node:assert/strict';
import {drawBlackHoles,blackHoleArtStats} from '../dist/black-hole-art.mjs';

// Cosmetic bookkeeping must stay bounded and read-only relative to simulation.
let rectangles=0;
let headRects=[];
const context={save(){},restore(){},fillRect(...values){
 assert.ok(values.every(Number.isFinite),'Every pixel rectangle has finite coordinates');
 assert.ok(values[2]>0&&values[3]>0,'Collapsing fragments never draw zero or reversed rectangles');
 if(['#f4edd0','#e1a3a2'].includes(this.fillStyle)&&this.globalAlpha>.4)headRects.push(values);
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
assert.equal(first,20,'Actual recorded drain has a bounded20-mote emission');
for(let i=0;i<10;i++)assert.equal(draw(live),first,'Repeated render of one frame cannot emit again');
live.time+=1/120;
assert.equal(draw(live),first,'A new frame without additional stolen Glow cannot emit');
let maximum=first;
for(let i=0;i<240;i++){
 drain(live);maximum=Math.max(maximum,draw(live));
 assert.ok(blackHoleArtStats(live).motes<=96,'Long active drain stays within the pool cap');
}
assert.equal(maximum,96,'Stress fixture exercises the pool capacity');
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

// Ten units of stolen fuel produced9 motes previously; now18, without a new
// simulation effect. One head starts at5q, then both its orbit and body shrink.
const density=fixture();drain(density,10);assert.equal(draw(density),18);
const spiral=fixture();spiral.blackHoles.items[0].sourceX=1140;
drain(spiral,.6);headRects=[];assert.equal(draw(spiral),1);
const born=spiral.time;
const headBounds=()=>({left:Math.min(...headRects.map(r=>r[0])),right:Math.max(...headRects.map(r=>r[0]+r[2])),
 top:Math.min(...headRects.map(r=>r[1])),bottom:Math.max(...headRects.map(r=>r[1]+r[3]))});
const initial=headBounds();assert.equal(initial.right-initial.left,10,'Full head is5×q at defaultscaleq2');
const radii=[],sizes=[];
for(const age of [.15,.3,.5,.72,.795]){
 spiral.time=born+age;headRects=[];draw(spiral);assert.ok(headRects.length);
 const b=headBounds(),cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2;
 radii.push(Math.hypot(cx-240,(cy-220)/.72));sizes.push(b.right-b.left);
}
for(let i=1;i<radii.length;i++)assert.ok(radii[i]<=radii[i-1]+1,'Funnel tightens into the core');
for(let i=1;i<sizes.length;i++)assert.ok(sizes[i]<=sizes[i-1],'Light fragments shrink during absorption');
assert.ok(radii.at(-1)<3);assert.ok(sizes.at(-1)<=2);
// The smallest scale takes the1px fallback and remains finite/positive.
headRects=[];drawBlackHoles(context,spiral,{scale:.5});
// Same-frame emissions must fan into distinct seeded paths rather than waste
// the denser pool drawing20 identical sprites over one another.
density.time+=.25;headRects=[];draw(density);
assert.ok(new Set(headRects.map(r=>r.slice(0,2).join(','))).size>8,'Seeded fragments have visibly distinct funnel paths');

console.log(JSON.stringify({actualDrainOnly:true,repeatedFrameStable:true,
 maximumMotes:maximum,resizeClears:true,expiredTrailsRemoved:true,
 noStaleBurst:true,lifecycleGates:true,reducedMotion:true,
 simulationAndEconomyUntouched:true,headScale:5,emissionScale:2,funnelRadii:radii,
 shrinkingHeads:sizes,finiteRectangles:rectangles}));
