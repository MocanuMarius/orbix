import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight,circleHitsObstacle} from '../dist/flight.mjs';
import {buildBossLayout} from '../dist/boss.mjs';
import {stormZoneState} from '../dist/storm-encounter.mjs';
import {createBoundaryInspectorState} from '../dist/boundary-run-inspector.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';

const dt=1/120;
function flight({seed='shepherd-rooms',height=405,speed=1,difficulty=1,mapIndex=0}={}){
 const context=new Proxy({}, {get:(o,k)=>o[k]??=(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{})});
 const canvas={style:{},bounds:{width:900,height},getContext:()=>context,getBoundingClientRect(){return this.bounds;}};
 const e=new WispFlight({canvas,boss:true,bossId:'storm-shepherd',seed,duration:[90,120,150][mapIndex],
  difficulty,mapIndex,row:6,companions:['collector'],modifiers:{speed}});
 e.render=()=>{};e.biomeDynamics.items=[];e.blackHoles.items=[];e.running=true;
 return e;
}
function place(e,x,y){
 e.distance=e.previousDistance=x-e.player.x;e.player.y=e.previousPlayerY=y;e.player.vy=0;
 e._nearbyPacketsUntil=-1;e._nearbyObstaclesUntil=-1;
}
function traverse(e,start,end,target){
 end=Math.min(end,e.totalDistance+e.player.x-4);
 place(e,start,target(start));
 let force=0,lifts=0,steps=0,minClearance=Infinity,closestReward=Infinity;
 while(e.distance+e.player.x<end&&!e.dying){
  const x=e.distance+e.player.x,y=target(x);
  // Fixed reaction/lookahead, ordinary manual Lift and a human-sized cadence.
  if(e.time-e.lastFlapTime>.30&&e.player.vy>=0&&e.player.y+e.player.vy*.20>y+3){e.flap();lifts++;}
  e.step(dt);steps++;
  const gust=e.gustState();if(gust.active)force+=dt;
  for(const p of e.layout.embers.filter(p=>p.stormChoice))closestReward=Math.min(closestReward,Math.hypot(e.distance+e.player.x-p.x,e.player.y-p.y));
  minClearance=Math.min(minClearance,e.player.y,e.height-e.player.y);
  if(steps>6000)throw Error('route did not finish');
 }
 return {force,lifts,minClearance,closestReward,x:e.distance+e.player.x,y:e.player.y,dying:!!e.dying,collisions:e.collisions};
}

test('Storm seeds reconstruct authored room order, spacing and mirrored choices without altering other guardians',()=>{
 const signatures=new Set();
 for(let seed=0;seed<12;seed++){
  const options={seed,height:430,speed:154,duration:90,bossId:'storm-shepherd'};
  const a=buildBossLayout(options),b=buildBossLayout(options);
  assert.deepEqual(a,b,'retry and Dream reconstruct the same geometry, rewards and force plan');
  signatures.add(JSON.stringify(a.boss.stormRooms.map(r=>[r.kind,r.side,r.start])));
  assert.equal(a.boss.stormRooms.at(-1).kind,'reversal');
  assert.deepEqual(a.boss.phases.map(p=>p.index),[1,2,3]);
  assert.deepEqual(a.boss.crests.map(o=>o.bossPhase),[2,3]);
  assert.ok(a.boss.attacks.length<a.obstacles.length/2,'quiet cells do not install another identical current');
 }
 assert.ok(signatures.size>=10);
 const easy=buildBossLayout({bossId:'storm-shepherd',height:430,duration:90,difficulty:1});
 const hard=buildBossLayout({bossId:'storm-shepherd',height:430,duration:90,difficulty:6});
 assert.ok(hard.boss.crests[0].gap<easy.boss.crests[0].gap,'manual crest retains its Ascension gap tuning');
 assert.ok(hard.obstacles.find(o=>o.stormRoom==='fork').gap<easy.obstacles.find(o=>o.stormRoom==='fork').gap);
 assert.ok(new Set(easy.obstacles.filter(o=>!o.stormApproach).map(o=>o.center)).size>=3,'quiet stone retains authored altitude variation');
 for(const bossId of ['hollow-warden','moonweaver','frost-matron','rootbound-heart','hollow-sun']){
  const layout=buildBossLayout({bossId,duration:90});
  assert.equal(layout.boss.stormRooms,undefined);assert.equal(layout.boss.stormZones,undefined);
 }
});

test('both real outcrop lanes are traversable and their opposing currents change actual flight',()=>{
 for(const height of [405,620])for(const speed of [1,1.25])for(const difficulty of [1,6])for(const lane of [-1,1]){
  const e=flight({height,speed,difficulty}),room=e.layout.boss.stormRooms.find(r=>r.kind==='fork');
  const mid=e.height/2,s=e.height/620,x=(room.start+room.end)/2;
  const host=e.layout.obstacles.find(o=>o.id===room.obstacleId);
  assert.ok(circleHitsObstacle(x,mid,e.player.radius,host),'the visible central stone really collides');
  const target=x=>mid+(lane<0?-65:155)*s*(1-Math.max(0,Math.min(1,(x-room.end+100)/180)))+30*s*Math.max(0,Math.min(1,(x-room.end+100)/180));
  for(let x=room.start;x<=room.end;x+=8)assert.ok(e.objectiveBodyClear(x,target(x),e.player.radius+5));
  const route=traverse(e,room.start-50,room.end+120,target);
  assert.equal(route.dying,false,JSON.stringify({height,speed,lane,route}));
  assert.equal(route.collisions,0);assert.ok(route.force>.25);
  // Same real integrator, same starting velocity: only the force field differs.
  const z=e.drafts.zones.find(z=>z.id.includes(lane<0?'upper-lane':'lower-lane'));
  const observe=enabled=>{
   const run=flight({height,speed,difficulty});if(!enabled)run.drafts.zones=[];
   place(run,z.x-45,z.y);run.player.vy=-20*run.scaleY;
   const begin=run.player.y;for(let i=0;i<30;i++)run.step(dt);
   const change=run.player.y-begin;assert.equal(!!run.dying,false);run.destroy();return change;
  };
  assert.ok((observe(true)-observe(false))*lane>5,'both lanes exert the advertised opposing force');
  e.destroy();
 }
});

test('the shelf has a reachable body Spark and a quiet safe passage that gives it up',()=>{
 for(const seed of ['shelf-a','shelf-b','shelf-c','shelf-d'])for(const route of ['ride','bypass']){
  const e=flight({seed}),room=e.layout.boss.stormRooms.find(r=>r.kind==='shelf');
  const prize=e.layout.embers.find(p=>p.id===room.rewardId),s=e.height/620;
  assert.ok(prize&&getPickupSpec(prize).fuel>0&&prize.stormChoice);
  assert.ok(e.objectiveBodyClear(prize.x,prize.y,20),'post-budget prize is outside every actual collider');
  const target=()=>route==='ride'?e.height/2+(room.side<0?-85:170)*s:room.bypassY;
  const result=traverse(e,room.start-40,room.end+90,target);
  assert.equal(result.dying,false,JSON.stringify({seed,route,result}));
  assert.equal(result.collisions,0);
  assert.equal(prize.collected,route==='ride',JSON.stringify({seed,route,result,prize:{x:prize.x,y:prize.y}}));
  if(route==='ride')assert.ok(result.force>.15);else assert.equal(result.force,0);
  e.destroy();
 }
});

test('the finisher warns, really reverses its force, leaves a flyable bypass and ends in quiet recovery air',()=>{
 for(const mapIndex of [0,1,2])for(const speed of [1,1.25]){
  const e=flight({mapIndex,speed}),boss=e.layout.boss,z=boss.stormZones.find(z=>z.kind==='reversal');
  const room=boss.stormRooms.find(r=>r.kind==='reversal');
  assert.ok((z.reverseX-z.reverseWarningX)/(154*1.25*1.48)>=1.6-1e-9);
  const before=e.drafts.sample(0,z.reverseX-60,z.y),after=e.drafts.sample(100,z.reverseX+60,z.y);
  assert.ok(before.active&&before.warning&&after.active);
  assert.equal(before.direction,-after.direction);assert.equal(after.direction,-z.direction);
  assert.equal(e.drafts.sample(20,z.reverseX,z.y).active,false,'brief quiet turn matches the live arrow');
  // Render sampling and force are order-independent, including a Dream revisit.
  for(const x of [z.reverseX+60,z.reverseX-60,z.reverseX+60]){
   assert.equal(e.drafts.sample(120,x,z.y).direction,stormZoneState(z,x).direction);
  }
  const observe=offset=>{
   const control=flight({mapIndex,speed}),wind=flight({mapIndex,speed});control.drafts.zones=[];
   for(const run of [control,wind]){place(run,z.reverseX+offset,z.y);run.player.vy=-20*run.scaleY;for(let i=0;i<24;i++)run.step(dt);assert.equal(!!run.dying,false);}
   const delta=wind.player.y-control.player.y;control.destroy();wind.destroy();return delta;
  };
  assert.ok(observe(-100)*z.direction>3);assert.ok(observe(65)*z.direction< -3);
  const result=traverse(e,room.start-100,room.end+160,()=>room.bypassY);
  assert.equal(result.dying,false,JSON.stringify({mapIndex,speed,result}));
  assert.equal(result.force,0);assert.equal(result.collisions,0);
  assert.ok(boss.stormZones.every(z=>z.x+z.rx<e.layout.exitLandmark.entryX-154*2),
   'at least two seconds of real field-free air precede the grounded exit');
  e.destroy();
 }
});

test('quiet rooms contain no hidden field, all surviving fuel clears stone, and resize retains both lanes',()=>{
 for(const seed of [1,2,3])for(const mapIndex of [0,1,2]){
  const e=flight({seed,mapIndex,difficulty:6}),boss=e.layout.boss;
  let quietDistance=0;
  for(let x=700;x<boss.end;x+=40){
   if(boss.stormZones.some(z=>Math.abs(x-z.x)<z.rx+1))continue;
   quietDistance+=40;
   for(let y=40;y<e.height-40;y+=30)assert.equal(e.drafts.sample(3,x,y).active,false);
  }
  assert.ok(quietDistance>(boss.end-700)*.55,'most travel is recovery air rather than another permanent ellipse');
  for(const p of e.layout.embers.filter(p=>p.fuel&&!p.harmful))assert.ok(e.objectiveBodyClear(p.x,p.y,15),`fuel inside stone: ${p.id}`);
  const room=boss.stormRooms.find(r=>r.kind==='fork'),z=boss.stormZones.find(z=>z.kind==='upper-lane');
  const old={height:e.height,upper:room.upperY,y:z.y,ry:z.ry};
  e.canvas.bounds={width:412,height:915};e.resize();const factor=e.height/old.height;
  assert.equal(room.upperY,old.upper*factor);assert.equal(z.y,old.y*factor);assert.equal(z.ry,old.ry*factor);
  for(const sign of [-1,1])for(let x=room.start;x<room.end;x+=15){
   assert.ok(e.objectiveBodyClear(x,e.height/2+(sign<0?-100:155)*e.height/620,e.player.radius+4));
  }
  e.destroy();
 }
 const state=createBoundaryInspectorState(new URLSearchParams('boss=storm-shepherd&seed=review'));
 assert.equal(state.run.current.bossId,'storm-shepherd');assert.equal(state.run.current.duration,90);
});
