import test from 'node:test';
import assert from 'node:assert/strict';
import {WispCompanion} from '../dist/wisp.mjs';
import {WISP_ART} from '../dist/companion-art.mjs';

function fixture(hz,{quiet=false,short=false,paired=false,cache=false}={}){
 const e={player:{x:110,y:310},height:620,time:0,distance:0,previousDistance:0,baseSpeed:154,
  mod:{wispCooldown:.4,collectorFetchMass:3},wispBoost:0,companions:['collector'],reducedMotion:quiet,
  hasCompanion:r=>r==='collector',layout:{embers:[]},deliveries:[],
  collect(p,source){assert.ok(!p.collected,'one contact per packet');p.collected=true;this.deliveries.push({p,time:this.time,source});}};
 const packets=[{kind:cache?'cache':'light',x:short?75:70,y:short?310:335}];
 if(paired)packets.push({kind:'cluster',x:66,y:284});
 e.layout.embers=packets;e.collectors=packets.map((_,i)=>new WispCompanion(e.player,i));
 const tick=(dt=1/hz)=>{e.time+=dt;e.previousDistance=e.distance;e.distance+=e.baseSpeed*dt;for(const w of e.collectors)w.update(e,dt);};
 if(short)e.collectors[0].beginReel(e,packets[0],e.player);
 return {e,packets,w:e.collectors[0],tick,hz};
}
function finish(f){for(let i=0;i<f.hz*8&&!f.packets.every(p=>p.collected);i++)f.tick();assert.ok(f.packets.every(p=>p.collected));}
function crossing(samples,gap){for(let i=1;i<samples.length;i++)if(samples[i].gap<=gap){const a=samples[i-1],b=samples[i];return a.time+(a.gap-gap)/(a.gap-b.gap)*(b.time-a.time);}assert.fail('gap crossed');}

for(const hz of [30,60,120]){
 test(`${hz}Hz actual cargo creeps, accelerates and covers its final body width at direct pickup pace`,()=>{
  const f=fixture(hz),{e,w,packets:[p]}=f,samples=[];let attached;
  for(let i=0;i<hz*7&&!p.collected;i++){
   f.tick();if(w.cargo){attached??=e.time;const gap=Math.hypot(w.cargoX-e.player.x,w.cargoY-e.player.y);
    const before=samples.at(-1);if(before){assert.ok(gap<before.gap);assert.ok(w.reelCloseSpeed>=before.speed-1e-8);}
    samples.push({time:e.time,gap,speed:w.reelCloseSpeed});}
  }
  assert.equal(e.deliveries.length,1);assert.ok(Math.abs(e.time-attached-4)<1e-8);
  const d=e.deliveries[0],contact=Math.hypot(d.source.worldX-e.distance-e.player.x,d.source.y-e.player.y);
  samples.push({time:e.time,gap:contact,speed:w.reelCloseSpeed});
  const actual=e.time-crossing(samples,contact+WISP_ART.worldDiameter),direct=WISP_ART.worldDiameter/e.baseSpeed;
  assert.ok(Math.abs(actual/direct-1)<.025,`${actual}s versus direct ${direct}s`);
  assert.ok(samples[0].speed<e.baseSpeed*.05,'visible slow opening');
  assert.ok(Math.abs(samples.at(-1).speed/e.baseSpeed-1.04)<1e-8,'natural contact speed');
  for(let i=0;i<hz;i++)f.tick();assert.equal(e.deliveries.length,1);
 });

 test(`${hz}Hz recovery reduction preserves position, short and quiet reels deliver once, and twins own separate loads`,()=>{
  const f=fixture(hz);while(!f.w.cargo)f.tick();for(let i=0;i<hz;i++)f.tick();
  const before={x:f.w.cargoX,y:f.w.cargoY,gap:f.w.reelGap};f.w.shortenReel(1);
  assert.deepEqual({x:f.w.cargoX,y:f.w.cargoY,gap:f.w.reelGap},before,'a recovery spend never jumps the cargo');
  const speed=f.w.reelCloseSpeed;f.tick(1e-6);
  assert.ok(Math.abs((before.gap-f.w.reelGap)/1e-6-speed)<.01,'rebase retains incoming velocity');
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
