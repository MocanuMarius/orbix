import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight,circleHitsObstacle,obstaclePolygons,FLIGHT_TUNING} from '../dist/flight.mjs';
import {SpacetimeTerrain,SPACETIME_TUNING,spacetimeOffsetAt,spacetimeSurfaceOffsetAt,spacetimeBaseShape,drawSpacetimeTerrain} from '../dist/spacetime.mjs';
import {terrainBoundary} from '../dist/terrain-boundary.mjs';
import {obstacleEdgeClearance} from '../dist/edging-pulse.mjs';
import {materialLightAt} from '../dist/terrain-light.mjs';
import {FlightProjection} from '../dist/flight-projection.mjs';
import {createBoundaryInspectorState,frameBoundaryInspection} from '../dist/boundary-run-inspector.mjs';
import {createNightmareGhost,advanceNightmareSpacetime} from '../dist/nightmare.mjs';

const shape=top=>[[-200,top?-900:900],[800,top?-900:900],[800,0],[-200,0]];
function bank(top=false,y=250,x=0){return {id:`${top}:${x}`,x,width:400,center:y,gap:0,phase:0,motion:0,sceneProps:[],[top?'topShape':'bottomShape']:shape(top)};}
function fixture(top=false){
 const o=bank(top),e={distance:0,width:390,height:500,time:0,player:{x:100,y:250+(top?1:-1)*20,radius:9.35},layout:{obstacles:[o],embers:[{id:'fixed',x:148,y:204}]},mod:{spacetime:true}};
 const field=e.spacetime=new SpacetimeTerrain(e);return {e,o,field};
}
function settle(f,count=90){for(let i=0;i<count;i++)f.field.update(1/60);}
const close=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);

test('Spacetime is an expensive one-rank ordinary Proximity purchase after Steady Current',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'spacetime-price');s.run.condensedGlow=5000;
 const skill=M.SKILLS['proximity-spacetime'];assert.equal(skill.name,'Spacetime');assert.equal(skill.cost,160);assert.equal(skill.maxRank,1);assert.equal(skill.requires,'proximity-grace');assert.equal(skill.retired,false);assert.equal(skill.branch,'proximity');
 assert.equal(M.canChooseStartingSkill(s.run,skill.id),false);assert.equal(M.buyCheckpointSkill(s,skill.id),false);
 for(const id of ['proximity-awakening','main-edging-tension','proximity-grace',skill.id])assert.ok(M.buyCheckpointSkill(s,id));
 assert.equal(M.getRunModifiers(s.run).spacetime,true);assert.equal(M.getRunModifiers({...s.run,isTutorial:true}).spacetime,false);
 assert.equal(M.buyCheckpointSkill(s,skill.id),false);
});

test('floor and roof dents change the real collision union, exposed rim, light and Proximity together',()=>{
 for(const top of [false,true]){
  const f=fixture(top),{e,o}=f,key=top?'topShape':'bottomShape',base=o[key],sign=top?-1:1;
  // Coincident and slightly buried neighbours must yield too: no old phantom lip.
  const neighbour=bank(top,250+sign*1,20);e.layout.obstacles.push(neighbour);
  const testY=250-sign*5;
  assert.ok(e.layout.obstacles.some(o=>circleHitsObstacle(100,testY,e.player.radius,o)));
  const lightBefore=materialLightAt(obstaclePolygons(o),{x:100,y:250-sign*40},{x:100,y:250+sign*7},145);
  settle(f);assert.notEqual(o[key],base);assert.equal(spacetimeBaseShape(o[key]),base);
  assert.ok(Math.abs(spacetimeOffsetAt(o[key],125))<=SPACETIME_TUNING.depth+.001);
  assert.ok(Math.abs(spacetimeOffsetAt(o[key],125))>SPACETIME_TUNING.depth*.9);
  assert.ok(e.layout.obstacles.every(o=>!circleHitsObstacle(100,testY,e.player.radius,o)));
  const point={clearance:Infinity};obstacleEdgeClearance(100,testY,e.player.radius,o,0,Infinity,undefined,point);
  assert.ok(point.clearance>0);
  const segments=terrainBoundary(e,0).segments,edge=segments.find(s=>s.a[0]<=100&&s.b[0]>=100);
  assert.ok(edge);assert.ok(sign*(edge.a[1]-250)>7);
  assert.ok(materialLightAt(obstaclePolygons(o),{x:100,y:250-sign*40},{x:100,y:250+sign*7},145)>lightBefore);
  assert.deepEqual(e.layout.embers,[{id:'fixed',x:148,y:204}]);
 }
});

test('the dent is shallow, local, starts ahead and settles without restoring terrain through a skimming body',()=>{
 const f=fixture(),{e,o,field}=f,base=o.bottomShape;settle(f);
 assert.ok(spacetimeOffsetAt(o.bottomShape,145)>spacetimeOffsetAt(o.bottomShape,30));
 assert.equal(spacetimeOffsetAt(o.bottomShape,500),0);assert.deepEqual(base,shape(false));
 e.player.y=252;settle(f);assert.ok(!circleHitsObstacle(100,e.player.y,e.player.radius,o));
 e.player.y=100;let prior=spacetimeOffsetAt(o.bottomShape,125);
 field.update(1/60);const next=spacetimeOffsetAt(o.bottomShape,125);assert.ok(next>0&&next<prior);assert.ok(prior-next<2);
 settle(f,180);assert.equal(o.bottomShape,base);assert.equal(field.changed.size,0);
});

test('open air, moving guardian banks, brambles and props are untouched',()=>{
 for(const flags of [{motion:8},{bossPhase:1},{guardianGate:true},{soft:true},{dynamic:true},{hazard:true}]){
  const f=fixture();Object.assign(f.o,flags);const base=f.o.bottomShape;settle(f);assert.equal(f.o.bottomShape,base);assert.equal(f.field.revision,0);
 }
 const f=fixture();f.e.player.y=100;const base=f.o.bottomShape;settle(f);assert.equal(f.o.bottomShape,base);assert.equal(f.field.revision,0);
 const prop={side:1,parts:[{polygon:[[0,-10],[20,-10],[20,10],[0,10]]}]};f.o.sceneProps=[prop];f.e.player.y=230;const original=JSON.stringify(prop);settle(f);assert.equal(JSON.stringify(prop),original);
});

test('resize and release preserve the source polygon and ordinary runs allocate no controller',()=>{
 const f=fixture(),base=f.o.bottomShape;settle(f);f.field.resizeY(1.5);
 for(const point of f.o.bottomShape)point[1]*=1.5;
 assert.ok(spacetimeSurfaceOffsetAt(f.o.bottomShape,125)<=SPACETIME_TUNING.depth+.001);
 f.o.center*=1.5;f.o.gap*=1.5;f.e.player.y=100;settle(f,180);
 assert.equal(f.o.bottomShape,base);assert.deepEqual(base,shape(false).map(([x,y])=>[x,y*1.5]));
 const context=new Proxy({},{get:()=>()=>{}}),e=new WispFlight({canvas:{getContext:()=>context,getBoundingClientRect:()=>({width:900,height:405})},preflight:true});
 assert.equal(e.spacetime,null);e.destroy();
});

test('the actual empty-meter flight step uses the bent bank before checking collision, with no shield rescue',()=>{
 const context=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 for(const enabled of [false,true]){
  const e=new WispFlight({canvas:{getContext:()=>context,getBoundingClientRect:()=>({width:915,height:412})},preflight:true,flame:0,modifiers:{spacetime:enabled}});
  e.render=()=>{};e.notify=()=>{};e.running=true;e.layout.obstacles=[bank()];e.layout.embers=[];e.player.y=e.previousPlayerY=245;e.distance=e.previousDistance=0;e.player.vy=0;
  for(let i=0;i<90;i++)e.spacetime?.update(1/60,e.layout.obstacles);
  e.step(1/60);assert.equal(e.dying,!enabled);assert.equal(e.flame,0);assert.equal(e.proximityShieldRemaining||0,0);assert.equal(e.collisions,enabled?0:1);e.destroy();
 }
});

test('material mapping uses the source bake, clips the actual polygon and changes no Spark coordinates',()=>{
 const f=fixture();settle(f);const calls=[],c={save(){},restore(){},clip(){calls.push('clip');},drawImage(...args){calls.push(args);}},item={canvas:{width:640,height:300},x:-200,y:0,pad:2};
 let traced;assert.ok(drawSpacetimeTerrain(c,item,f.o.bottomShape,{scale:.63,x:0,y:0,path:(_c,points)=>traced=points}));
 assert.equal(traced,f.o.bottomShape);assert.equal(calls[0],'clip');assert.ok(calls.length<180);assert.ok(calls.some(call=>Array.isArray(call)&&call[6]>0));
 assert.deepEqual(f.e.layout.embers,[{id:'fixed',x:148,y:204}]);
});

test('ghost forecast advances a private dent and never changes live geometry or resource positions',()=>{
 const f=fixture(),{e,o}=f;settle(f);e.player.y=235;e.player.vy=0;
 Object.assign(e,{baseSpeed:154,scaleY:1,totalDistance:10000,boostTime:0,exitProtection:0,levelRecovery:0,levelDive:0,fleet:[],ascentInfo:{draftForceScale:1},drafts:{zones:[]},biomeDynamics:null});
 Object.assign(e.mod,{driftSense:1,gravity:1,flap:1,terminalFall:1});
 const projection=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle),before=o.bottomShape,source=JSON.stringify(before),sparks=JSON.stringify(e.layout.embers);
 const predicted=projection.predict(e,1);assert.ok(predicted.points.length>1);assert.equal(o.bottomShape,before);assert.equal(JSON.stringify(before),source);assert.equal(JSON.stringify(e.layout.embers),sparks);
 const without={...e,spacetime:null,layout:{obstacles:[{...o,bottomShape:spacetimeBaseShape(before)}]}};
 assert.ok(predicted.points.at(-1).time>projection.predict(without,1).points.at(-1).time);
});

test('the disposable boundary inspector can show a real dent beside a fixed reference Spark',()=>{
 const query=new URLSearchParams('spacetime=1&biome=pinewood'),s=createBoundaryInspectorState(query);assert.equal(s.run.skills['proximity-spacetime'],1);
 const f=fixture();f.o.x=800;f.o.sceneProps=[];f.e.player.x=98;f.e.getNearbyObstacles=()=>f.e.layout.obstacles;f.e.render=()=>{};f.e.notify=()=>{};
 frameBoundaryInspection(f.e,query);assert.ok(f.o.bottomShape.spacetime);assert.ok(f.e.layout.embers.some(p=>p.id==='spacetime-inspection'));
 const off=createBoundaryInspectorState(new URLSearchParams('spacetime=off'));assert.equal(off.run.skills['proximity-spacetime'],undefined);
});

test('Nightmare shows its own evolving dent and leaves the live bank and Sparks intact',()=>{
 const f=fixture();settle(f);const {e,o}=f,original=o.bottomShape,saved=JSON.stringify(original),fields=JSON.stringify(f.field.fields),sparks=JSON.stringify(e.layout.embers);
 const ghost=createNightmareGhost(e);assert.notEqual(ghost.layout,e.layout);assert.notEqual(ghost.layout.obstacles[0],o);
 advanceNightmareSpacetime(ghost,[{x:100,y:230,time:0},{x:250,y:228,time:1}],.6);
 assert.ok(ghost.spacetime.fields[0].x>170);assert.equal(o.bottomShape,original);assert.equal(JSON.stringify(original),saved);assert.equal(JSON.stringify(f.field.fields),fields);assert.equal(JSON.stringify(e.layout.embers),sparks);
 const normal={...e,spacetime:null};assert.equal(Object.hasOwn(createNightmareGhost(normal),'layout'),false);
});
