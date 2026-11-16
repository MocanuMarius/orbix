import test from 'node:test';
import assert from 'node:assert/strict';
import {WispCompanion} from '../dist/wisp.mjs';
import {WISP_ART} from '../dist/companion-art.mjs';

function fixture(hz,{quiet=false,short=false,paired=false,cache=false}={}){
 const e={player:{x:110,y:310},height:620,time:0,distance:0,previousDistance:0,baseSpeed:154,
  mod:{wispCooldown:1.2,collectorFetchMass:3},wispBoost:0,companions:['collector'],reducedMotion:quiet,
  hasCompanion:r=>r==='collector',layout:{embers:[]},deliveries:[],
  collect(p,source){assert.ok(!p.collected,'one contact per packet');p.collected=true;this.deliveries.push({p,time:this.time,source});}};
 const packets=[{kind:cache?'cache':'light',x:short?75:70,y:short?310:335}];
 if(paired)packets.push({kind:'cluster',x:66,y:284});
 e.layout.embers=packets;e.collectors=packets.map((_,i)=>new WispCompanion(e.player,i));
 const tick=(dt=1/hz)=>{e.time+=dt;e.previousDistance=e.distance;e.distance+=e.baseSpeed*dt;for(const w of e.collectors)w.update(e,dt);};
 if(short)e.collectors[0].beginReel(e,packets[0],e.player);
 return {e,packets,w:e.collectors[0],tick,hz};
}
function finish(f){for(let i=0;i<f.hz*16&&!f.packets.every(p=>p.collected);i++)f.tick();assert.ok(f.packets.every(p=>p.collected));}
for(const hz of [30,60,120]){
 test(`${hz}Hz cargo trails, slings past the body, makes two turns and reaches front contact once`,()=>{
  const f=fixture(hz),{e,w,packets:[p]}=f,samples=[];let attached;
  for(let i=0;i<hz*7&&!p.collected;i++){
   f.tick();if(w.cargo){attached??=e.time;const gap=Math.hypot(w.cargoX-e.player.x,w.cargoY-e.player.y);
    samples.push({time:e.time,gap,vx:w.reelVX,vy:w.reelVY,x:w.cargoX-e.player.x,y:w.cargoY-e.player.y,
      stage:w.towStage,cord:w.state(e).tetherPose.alpha});}
  }
  assert.equal(e.deliveries.length,1);assert.ok(Math.abs(e.time-attached-4)<1e-8);
  const d=e.deliveries[0],contact=Math.hypot(d.source.worldX-e.distance-e.player.x,d.source.y-e.player.y);
  assert.ok(samples[1].gap>samples[0].gap,'stationary field momentum briefly trails the moving anchor');
  const tow=samples.filter(s=>s.stage==='tow'&&s.time-attached>1);
  assert.ok(Math.max(...tow.map(s=>s.gap))-Math.min(...tow.map(s=>s.gap))<6,'settled tow holds its distance instead of winching');
  assert.ok(tow.every(s=>s.x<0));
  assert.ok(samples.some(s=>s.stage==='sling'&&s.vx>e.baseSpeed*2),'snap accelerates hard');
  assert.ok(samples.some(s=>s.stage==='sling'&&s.x>0&&s.y>20),'under pass overtakes with body clearance');
  const spiral=samples.filter(s=>s.stage==='spiral');let turns=0;
  for(let i=1;i<spiral.length;i++){
    const a=Math.atan2(spiral[i-1].y,spiral[i-1].x),b=Math.atan2(spiral[i].y,spiral[i].x);
    turns+=Math.atan2(Math.sin(b-a),Math.cos(b-a));
  }
  assert.ok(Math.abs(turns)/(Math.PI*2)>1.7&&Math.abs(turns)/(Math.PI*2)<2.01,'about two body turns');
  assert.ok(spiral.every(s=>s.cord===0),'released cord disappears before the orbit');
  assert.ok(d.source.worldX-e.distance>e.player.x,'delivery comes from the front');
  assert.ok(contact<=30.35,'real body contact');
  assert.ok(Math.hypot(d.source.worldX-d.source.previousWorldX,d.source.y-d.source.previousY)<e.baseSpeed/hz*1.8,'delivery uses one physical step without a terminal jump');
  for(let i=0;i<hz;i++)f.tick();assert.equal(e.deliveries.length,1);
 });

 test(`${hz}Hz recovery reduction preserves position, short and quiet reels deliver once, and twins own separate loads`,()=>{
  const f=fixture(hz);while(!f.w.cargo)f.tick();for(let i=0;i<hz;i++)f.tick();
  const before={x:f.w.cargoX,y:f.w.cargoY,gap:f.w.reelGap};f.w.shortenReel(1);
  assert.deepEqual({x:f.w.cargoX,y:f.w.cargoY,gap:f.w.reelGap},before,'a recovery spend never jumps the cargo');
  f.tick(1e-6);
  assert.ok(Math.hypot(f.w.cargoX-before.x,f.w.cargoY-before.y)<.001,'a recovery spend leaves the live position continuous');
  finish(f);assert.equal(f.e.deliveries.length,1);
  for(const options of [{short:true},{quiet:true},{paired:true},{short:true,cache:true}]){
   const next=fixture(hz,options);finish(next);assert.equal(next.e.deliveries.length,options.paired?2:1);
   assert.ok(next.e.collectors.every(w=>w.phase==='ready'&&w.cooldown===0));
   for(let i=0;i<hz;i++)next.tick();assert.equal(next.e.deliveries.length,options.paired?2:1);
  }
 });
}

test('resize keeps the scaled cargo attached and resumes from that gap without a position jump',()=>{
 const f=fixture(120),{e,w}=f;while(!w.cargo)f.tick();for(let i=0;i<90;i++)f.tick();
 const old={x:w.cargoX,y:w.cargoY};w.resizeY(.7);e.player.y*=.7;
 w.shiftX(20);e.player.x+=20;e.distance-=20;
 assert.equal(w.cargoX,old.x+20);assert.equal(w.cargoY,old.y*.7);
 const resized={x:w.cargoX,y:w.cargoY};f.tick(1e-6);
 assert.ok(Math.hypot(w.cargoX-resized.x,w.cargoY-resized.y)<.001);
 finish(f);assert.equal(e.deliveries.length,1);
});

test('upper and lower approaches retain their side, clear the body, and shrink the actual shell',()=>{
 for(const side of [-1,1]){
  const f=fixture(120),{w,e,packets:[p]}=f;p.y=e.player.y+side*25;
  while(!w.cargo)f.tick();const samples=[];
  while(!p.collected){
    if(side<0&&w.cooldown<2){e.player.y+=200/120;e.player.vy=200;}
    f.tick();if(w.cargo)samples.push({stage:w.towStage,x:w.cargoX-e.player.x,y:w.cargoY-e.player.y,scale:w.cargoPose(p,e.time,e.height).scale});
  }
  assert.equal(w.sling.side,side,'real vertical approach chooses over or under');
  const sling=samples.filter(s=>s.stage==='sling');
  assert.ok(sling.some(s=>s.x>0&&s.y*w.sling.side>25),'Spark overtakes on its snap side');
  assert.ok(sling.every(s=>Math.hypot(s.x,s.y)>30),'the pass never hits the rear of the body');
  assert.ok(Math.abs(Math.min(...samples.map(s=>s.scale))-.22)<1e-9,'the carried shell reaches the approved reduced size');
  assert.equal(e.deliveries.length,1);
 }
});

test('a recovery spend during the finishing move speeds the remaining path without skipping its turns or moving the load immediately',()=>{
 const f=fixture(120),{w,e,packets:[p]}=f;while(w.towStage!=='sling')f.tick();
 const before={x:w.cargoX,y:w.cargoY},at=e.time;w.shortenReel(100);
 assert.deepEqual({x:w.cargoX,y:w.cargoY},before);
 let spiral=false;while(!p.collected){f.tick();spiral||=w.towStage==='spiral';assert.ok(e.time-at<.9);}
 assert.ok(spiral);assert.equal(e.deliveries.length,1);
});

test('reduced motion replaces the two turns with one gentle front-side bend at the same deadline',()=>{
 const results=[];
 for(const quiet of [false,true]){
  const f=fixture(120,{quiet}),samples=[];let at;
  while(!f.packets[0].collected){f.tick();if(f.w.cargo){at??=f.e.time;if(f.w.towStage==='spiral')samples.push(Math.atan2(f.w.cargoY-f.e.player.y,f.w.cargoX-f.e.player.x));}}
  const delivery=f.e.deliveries[0];results.push({seconds:f.e.time-at,samples});
  assert.ok(delivery.source.worldX-f.e.distance>f.e.player.x,'quiet and normal both approach from the front');
 }
 assert.ok(Math.abs(results[0].seconds-results[1].seconds)<1e-8,'preference never delays the award');
 assert.ok(results[1].samples.every(angle=>Math.abs(angle)<Math.PI*.41),'quiet Spark remains in front without a full turn');
 assert.ok(results[0].samples.some(angle=>Math.abs(angle)>Math.PI*.95),'ordinary animation keeps the body spiral');
});
