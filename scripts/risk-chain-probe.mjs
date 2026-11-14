import assert from 'node:assert/strict';
import {buildFlightLayout,WispFlight,circleHitsObstacle,FLIGHT_TUNING} from '../dist/flight.mjs';
import {LEVELS} from '../dist/level-catalog.mjs';
import {pickupKind,canCompanionCollect,getPickupSpec} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';
import {lightVisibility} from '../dist/light-field.mjs';
import {installRiskChains} from '../dist/risk-chains.mjs';
import {VISION} from './human-flight-perception.mjs';

const options={seed:'risk-audit',height:430,duration:102,lengthScale:3};
const packetsFor=(layout,chain)=>layout.embers.filter(p=>p.riskChain===chain.id).sort((a,b)=>a.x-b.x);
let layouts=0,straight=0,falling=0;
const examples=new Map();
for(const level of LEVELS)for(const difficulty of [1,4]){
 const stage=difficulty===1?0:3;
 const layout=buildFlightLayout({...options,terrain:level.terrain,levelId:level.id,difficulty,stage});
 layouts++;
 for(const chain of layout.riskChains){
  const packets=packetsFor(layout,chain);
  if(chain.kind==='fall'){
   falling++;
   assert.deepEqual(packets.map(pickupKind),['light','light','dark','light','light']);
   assert.equal(canCompanionCollect(packets[2]),false);
   assert.equal(glowPoints(packets.reduce((sum,p)=>sum+getPickupSpec(p).fuel,0)),24);
   assert.ok(chain.launch.x<packets[0].x);
   const key=level.terrain+'/'+difficulty;
   if(!examples.has(key))examples.set(key,{level,difficulty,stage,index:chain.id});
  }else{
   straight++;
   assert.deepEqual(packets.map(pickupKind),['light','dark','light']);
   assert.equal(canCompanionCollect(packets[1]),false);
   for(let n=0;n<=16;n++)for(const offset of [0,chain.dodgeSide*Math.sin(n/16*Math.PI)*64]){
    const x=chain.start+n/16*(chain.end-chain.start),y=chain.y+(n/8-1)*chain.lean+offset;
    for(const o of layout.obstacles)for(const sign of [-1,1])
     assert.equal(circleHitsObstacle(x,y,22,o,0,o.center+sign*Math.abs(o.motion)),false,level.id+' blocked straight route or bypass');
   }
  }
  assert.ok(!layout.sections.some(s=>(s.hard||s.authoredChallenge)&&s.start<chain.end&&s.end>chain.start));
 }
}
assert.ok(falling>0&&straight>0,'Both authored encounter types should occur');
assert.ok(new Set([...examples.values()].map(e=>e.level.terrain)).size===3,'Falling routes should appear in each terrain');

// A synthetic clear room has ordinary donors and several protected fuel pickups.
// Keep a snapshot of the solids, the crucial fuel, and every donor's yield.
const fixture={obstacles:[{id:0,x:2200,width:120,center:310},{id:1,x:4200,width:120,center:310},{id:2,x:6200,width:120,center:310}],sections:[],embers:[]};
for(let i=0;i<14;i++)fixture.embers.push({id:'spark-'+i,kind:'light',x:1900+i*330,y:85,value:1});
fixture.embers[2].accessible=true; fixture.embers[4].intro=true; fixture.embers[8].challengeLandmark=true;
const protectedItems=fixture.embers.filter(p=>p.intro||p.accessible||p.challengeLandmark);
const protectedSnapshot=structuredClone(protectedItems),solids=structuredClone(fixture.obstacles);
const fuels=layout=>layout.embers.filter(p=>getPickupSpec(p).fuel>0).map(p=>[p.id,getPickupSpec(p).fuel]).sort();
const budget=fuels(fixture);
installRiskChains(fixture,{...options,height:620,speed:FLIGHT_TUNING.forwardSpeed,stage:3,difficulty:4,elite:false,mapIndex:1},()=>true);
assert.ok(fixture.riskChains.length);
assert.deepEqual(fuels(fixture),budget);
assert.deepEqual(protectedItems,protectedSnapshot);
assert.deepEqual(fixture.obstacles,solids);

const dt=1/60;
const canvas={style:{},getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
function runPass({level,difficulty,stage,index},leave){
 const engine=new WispFlight({canvas,preflight:true,terrain:level.terrain,seed:options.seed,duration:options.duration,
  node:{levelId:level.id,flightLengthScale:3,difficulty,row:stage,mapIndex:0},companions:['swift'],flame:30});
 engine.running=true;
 const chain=engine.layout.riskChains.find(c=>c.id===index&&c.kind==='fall');
 assert.ok(chain,level.id+' chain missing after live assembly');
 const packets=packetsFor(engine.layout,chain),seed=packets[2];
 const label=level.id+' '+difficulty+' '+(leave?'Lift':'fall');
 assert.ok(engine.drafts.zones.every(z=>z.x+z.rx<chain.start-140||z.x-z.rx>chain.end+140),label+' overlaps draft');
 assert.ok(engine.biomeDynamics.items.every(a=>a.x+160<=chain.start||a.x-160>=chain.end),label+' overlaps terrain actor');
 const received=[],collect=engine.collect.bind(engine);
 engine.collect=(packet,delivery)=>{
  const before=engine.flameRestored+engine.pickupOverflow;
  collect(packet,delivery);
  if(packet.riskChain===chain.id&&packet.collected)received.push({packet,time:engine.time,fuel:engine.flameRestored+engine.pickupOverflow-before});
 };
 engine.distance=chain.launch.x-engine.player.x;
 engine.player.y=chain.launch.y;
 engine.time=Math.max(0,(chain.launch.x-98)/engine.baseSpeed);
 engine.player.vy=0;
 let escaped=false,warnedAt=null,decisionAt=null,maxDim=0;
 assert.ok(engine.flap(),label+' last Lift');
 const goal=packets.at(-1).x,deadline=engine.time+(goal-chain.launch.x)/engine.baseSpeed+.5;
 while(engine.distance+engine.player.x<goal&&!engine.dying&&engine.time<deadline){
  const worldX=engine.distance+engine.player.x;
  const x=seed.x-engine.distance;
  if(warnedAt===null&&x>=engine.player.x&&x<engine.width&&lightVisibility(engine,engine.getLightState(),x,seed.y)>=VISION.hazard)warnedAt=engine.time;
  if(decisionAt===null&&worldX>=packets[1].x){
   decisionAt=engine.time;
   if(leave){assert.ok(engine.flap(),label+' exit Lift');escaped=true;}
  }
  engine.step(dt);
  maxDim=Math.max(maxDim,engine.lightDimming);
 }
 assert.ok(!engine.dying&&engine.distance+engine.player.x>=goal,label+' failed to reach the end');
 assert.ok(warnedAt!==null&&decisionAt!==null&&decisionAt-warnedAt>=.20,label+' insufficient warning');
 assert.deepEqual(received.map(r=>r.packet.chainIndex),leave?[0,1]:[0,1,2,3,4],label+' sequence');
 assert.equal(glowPoints(received.reduce((sum,r)=>sum+r.fuel,0)),leave?12:24,label+' delivered fuel');
 assert.equal(engine.lightPenalties.length,0,label+' unresolved penalty');
 const darkTime=leave?0:received[3].time-received[2].time;
 if(escaped){assert.equal(maxDim,0,label+' escaped seed still dimmed');}
 else {assert.ok(darkTime>=.35,label+' dark cleared too early');assert.ok(maxDim>=.15,label+' dim never reached 15%');}
 engine.destroy();
 return {warning:decisionAt-warnedAt,darkTime,maxDim};
}

const reports=[];
for(const example of examples.values()){
 reports.push(runPass(example,false));
 runPass(example,true);
}
const min=key=>Number(Math.min(...reports.map(r=>r[key])).toFixed(3));
console.log(JSON.stringify({layouts,straight,falling,liveCases:reports.length*2,minimumWarningSeconds:min('warning'),
 minimumDarkSeconds:min('darkTime'),minimumPeakDim:min('maxDim'),fuelOnCommit:24,fuelOnExit:12,sceneryAndFuelBudgetsPreserved:true}));
