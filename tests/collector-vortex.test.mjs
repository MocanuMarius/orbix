import test from 'node:test';
import assert from 'node:assert/strict';
import {WispCompanion,WISP_TUNING} from '../dist/wisp.mjs';
import {COLLECTOR_VORTEX,vortexCargoPoint,vortexScale,drawCollectorVortex} from '../dist/collector-vortex.mjs';

function fixture(quiet=false){
  const e={player:{x:110,y:310},height:620,time:0,captureTime:0,distance:0,previousDistance:0,baseSpeed:154,
    mod:{},companions:['collector'],wispBoost:0,reducedMotion:quiet,layout:{embers:[]},deliveries:[],
    hasCompanion:r=>r==='collector',collect(p,source){assert.ok(!p.collected);p.collected=true;this.deliveries.push({time:this.time,source});}};
  const w=new WispCompanion(e.player),p={kind:'light',sparkMass:1,x:70,y:335};e.layout.embers=[p];w.beginReel(e,p,e.player);
  const tick=(dt=1/120)=>{e.time+=dt;e.captureTime=e.time;e.previousDistance=e.distance;e.distance+=e.baseSpeed*dt;w.update(e,dt);};
  return {e,w,p,tick};
}

test('production finish keeps fuel-scaled recovery, a wide two-turn orbit, .22 real sprite and one scaled delivery',()=>{
  const {e,w,p,tick}=fixture();let first,minimumScale=1,orbitSamples=0;
  while(!p.collected&&e.time<12){
    tick();
    if(w.sling&&first===undefined)first=e.time;
    if(!w.cargo)continue;
    const state=w.state(e),pose=state.cargoPose;
    minimumScale=Math.min(minimumScale,pose.scale);
    if(w.towStage==='spiral')orbitSamples++;
    if(w.sling)assert.ok(w.sling.trail.count<=32);
    const half=w.state(e,e.player.y,e.time,.5);
    assert.ok(Math.abs(half.x+half.cargoPose.offsetX-(w.previousCargoX+w.cargoX)/2)<1e-8,'render interpolation follows actual cargo');
  }
  assert.equal(WISP_TUNING.cooldown,10);
  assert.ok(Math.abs(first-(10/3-COLLECTOR_VORTEX.duration))<1/60);
  assert.ok(Math.abs(e.deliveries[0].time-10/3)<1/60);
  assert.ok(Math.abs(minimumScale-.22)<1e-9);
  assert.equal(orbitSamples,60,'two turns occupy the approved .504-second orbit');
  assert.ok(Math.abs(e.deliveries[0].source.scale-.22)<1e-9,'absorption inherits the real reduced shell');
  for(let i=0;i<120;i++)tick();assert.equal(e.deliveries.length,1);

  const s={radius:20,side:1,launch:{x:-40,y:25},elapsed:.42},out={};
  vortexCargoPoint(s,20,false,out);assert.equal(out.x,55,'initial orbit is full width even for a nearby pickup');
  let angle=0,last=0;
  for(let i=0;i<=1000;i++){
    s.elapsed=.42+.504*i/1000;vortexCargoPoint(s,20,false,out);
    const a=Math.atan2(out.y,out.x);if(i)angle+=Math.atan2(Math.sin(a-last),Math.cos(a-last));last=a;
  }
  assert.ok(Math.abs(angle+Math.PI*4)<1e-8,'actual live path completes two turns');
  assert.ok(Math.abs(vortexScale(.42+.1638)-.22)<1e-9);
});

test('recovery spends and boon changes retime the physical finish without teleporting, stalling or duplicating awards',()=>{
  for(const when of [.5,2.45,2.95])for(const rate of [1,1.5]){
    const {e,w,p,tick}=fixture();while(e.time<when)tick();
    const before={x:w.cargoX,y:w.cargoY};w.shortenReel(100);e.flightBoon={recoveryRate:rate};
    assert.equal(w.cargoX,before.x);assert.equal(w.cargoY,before.y);assert.equal(e.deliveries.length,0);
    const start=e.time;while(!p.collected&&e.time-start<1.3)tick();
    assert.equal(e.deliveries.length,1);assert.equal(w.cooldown,0);assert.ok(e.time-start>.1);
    for(let i=0;i<120;i++)tick();assert.equal(e.deliveries.length,1);
  }
});

test('viewport resize preserves a finite live finish and reduced motion avoids rapid winding and trails',()=>{
  const {e,w,p,tick}=fixture(true);while(e.time<2.75)tick();
  w.resizeY(.7);e.player.y*=.7;e.height*=.7;
  while(!p.collected&&e.time<11){tick();assert.ok([w.x,w.y,w.cargoX,w.cargoY].every(Number.isFinite));}
  assert.equal(e.deliveries.length,1);
  const s={radius:55,side:1,launch:{x:-40,y:25},elapsed:0},out={};
  for(let i=0;i<=100;i++){s.elapsed=.42+.504*i/100;vortexCargoPoint(s,20,true,out);assert.ok(out.x>0,'accessible arc stays on the front side');}
  let arcs=0,lines=0;const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},arc(){arcs++;},stroke(){},moveTo(){},lineTo(){lines++;}};
  drawCollectorVortex(ctx,{homeX:0,homeY:0,x:0,y:0,vortex:{elapsed:.2,trail:{count:32}}},1,true);
  assert.equal(arcs,1);assert.equal(lines,0);
});
