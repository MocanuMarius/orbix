import assert from 'node:assert/strict';
import {WispFlight,FLIGHT_TUNING,circleHitsObstacle} from '../dist/flight.mjs';
import {FlightProjection,drawFlightProjection} from '../dist/flight-projection.mjs';
import * as M from '../dist/model.mjs';
const state=M.newState();state.run=M.createRun(state.profile,'drift-tree');state.run.condensedGlow=500;
assert.ok(M.buyCheckpointSkill(state,'main-speed')); // Buy the guide prerequisite from the current run tree.
assert.ok(M.buyCheckpointSkill(state,'main-drift-sense'));assert.equal(M.getRunModifiers(state.run).driftSense,1);
assert.equal(M.buyCheckpointSkill(state,'main-drift-sense-3'),false);state.run.condensedGlow=3000; // Fund the current two advanced ranks for the physics fixture.
for(const id of ['main-drift-sense-2','main-drift-sense-3'])assert.ok(M.buyCheckpointSkill(state,id));
assert.equal(M.getRunModifiers(state.run).driftSense,3);
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:620})};
const make=(role='collector')=>new WispFlight({canvas,seed:'drift-probe',duration:102,node:{flightLengthScale:3},companions:[role],modifiers:{driftSense:3},flame:100});
const cases=['ordinary','gentle','heavy','swift','draft','leveler-release'];let maxError=0;
for(const name of cases){
 const e=make(name==='swift'?'swift':name==='leveler-release'?'leveler':'collector');e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.running=true;e.player.y=100;e.player.vy=25;
 if(name==='gentle')e.mod.gravity=.9;
 if(name==='heavy'){e.mod.gravity=1.18;e.mod.terminalFall=1.08;}
 if(name==='swift'){e.fleet.find(x=>x.role==='swift').remaining=.25;e.mod.speed=1.1;e.syncFleetTimers();}
 if(name==='draft')e.drafts.zones=[{id:'future-draft',x:350,y:310,rx:150,ry:280,direction:-1,force:340,triggeredAt:null}];
 if(name==='leveler-release'){e.mod.levelerDive=1.35;e.fleet.find(x=>x.role==='leveler').remaining=1;e.levelTargetY=e.player.y;e.liftHeld=true;e.player.vy=-20;}
 e.projection=null;
 const snapshot=()=>JSON.stringify({player:e.player,distance:e.distance,time:e.time,flame:e.flame,fleet:e.fleet,drafts:e.drafts.zones,charge:e.levelCharge,held:e.liftHeld});
 const before=snapshot(),guide=e.getFlightProjection();assert.equal(snapshot(),before,'Projection mutated live state: '+name);
 assert.ok(guide.points.length<=37);if(name==='leveler-release')e.endLiftInput();
 for(const point of guide.points.slice(1)){
  if(guide.contact&&point===guide.points.at(-1))break;
  while(e.time<point.time-1e-8)e.step(1/60);
  const error=Math.hypot(e.distance+e.player.x-point.x,e.player.y-point.y);maxError=Math.max(maxError,error);
  assert.ok(error<1e-6,`${name}: forecast diverged ${error}`);
 }
}
const collision=make();collision.drafts.zones=[];collision.player.y=310;collision.player.vy=30;
collision.layout.obstacles=[{x:0,width:1000,center:400,gap:100,motion:20,phase:.4,topShape:null,bottomShape:[[-800,0],[2450,0],[2450,500],[-800,500]]}];
collision.projection=null;const contact=collision.getFlightProjection();assert.ok(contact.contact);assert.ok(contact.points.at(-1).time<1.8);
for(const p of contact.points)assert.equal(circleHitsObstacle(p.x,p.y,collision.player.radius,collision.layout.obstacles[0],p.time),false,'Guide goes inside terrain');
const fresh=make();assert.equal(fresh.getFlightProjection(),fresh.getFlightProjection(),'Read cache reused');
fresh.running=true;const old=fresh.getFlightProjection();fresh.flap();assert.notEqual(fresh.getFlightProjection(),old,'Lift must invalidate immediately');
fresh.mod.driftSense=0;assert.equal(fresh.getFlightProjection(),null);
// A hypothetical Lift marks its actual overhead contact, without exposing an
// ascent line, a floor hit, or a false ceiling at an open viewport boundary.
const roof=make();roof.drafts.zones=[];roof.biomeDynamics.items=[];roof.player.y=310;
roof.layout.obstacles=[{x:0,width:1000,center:400,gap:260,motion:20,phase:.4,
 topShape:[[-800,-500],[2450,-500],[2450,0],[-800,0]],bottomShape:null}];
roof.projection=null;const warning=roof.getFlightProjection();
assert.ok(warning.liftContact,'Lifting under a low roof must mark its surface');
assert.equal(warning.lift,undefined,'Upward preview line has been removed');
assert.ok(Math.abs(warning.liftContact.y-(270+Math.sin(warning.liftContact.time*.9+.4)*20))<1e-7,'Dot follows the actual moving ceiling');
assert.ok(warning.liftContact.x>roof.distance+roof.player.x);
assert.equal(warning.ceilingContact,null,'The falling path must not invent a ceiling warning');
const painted=[];const paintContext=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{o[k]=v;if(k==='fillStyle')painted.push(v);return true;}});
drawFlightProjection(paintContext,roof);
assert.ok(painted.includes('#ef6868'),'Visible impact is red');
assert.ok(!painted.includes('#98d9f1'),'No blue ascent dots remain');
roof.flame=0;roof.projection=null;assert.equal(roof.getFlightProjection().liftContact,undefined,'No warning for a Lift the player cannot afford');
roof.flame=100;roof.layout.obstacles=[];roof.player.y=15;roof.projection=null;
assert.equal(roof.getFlightProjection().liftContact,null,'Open sky is not a solid ceiling');
for(const[id,cost]of Object.entries({'main-drift-sense':25,'main-drift-sense-2':40,'main-drift-sense-3':70}))assert.equal(M.SKILLS[id].cost,cost,'Reduced guide base price');
const perf=make(),projector=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle),times=[];
for(let i=0;i<160;i++){perf.distance=1500+(i%8)*180;const start=performance.now();projector.predict(perf,3);const elapsed=performance.now()-start;if(i>=20)times.push(elapsed);}
times.sort((a,b)=>a-b);
console.log(JSON.stringify({ranks:3,maxPhysicsError:maxError,scenarios:cases,liveStateUntouched:true,movingTerrainContact:true,redCeilingWarning:true,noAscentLine:true,noOpenSkyWarning:true,reducedPrices:[25,40,70],cachedAndInputReactive:true,localComputeP95ms:Number(times[Math.floor(times.length*.95)].toFixed(3))}));
