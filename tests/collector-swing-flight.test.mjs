import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {sparkBodyRadius} from '../dist/spark-size.mjs';
import {WISP_ART} from '../dist/companion-art.mjs';

globalThis.requestAnimationFrame=()=>null;globalThis.cancelAnimationFrame=()=>{};

function flight({paired=false,quiet=false,flash=false}={}){
 const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??=(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{})});
 const e=new WispFlight({preflight:true,seed:'collector-swing-real-flight',duration:90,companions:['collector'],
  reducedMotion:quiet,modifiers:{wispCooldown:.4,cardTwinOrbit:paired,collectorFlashFetch:flash},
  canvas:{style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})}});
 e.render=()=>{};e.renderScheduledFrame=()=>{};e.notify=()=>{};
 e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.biomeDynamics.items=[];e.blackHoles.items=[];
 e.running=true;e.resumeElapsed=e.resumeRampSeconds;e.flame=e.maxFlame;
 const packets=[{id:'lower',kind:flash?'sight':'light',x:e.distance+e.player.x-29,y:e.player.y+20}];
 if(paired)packets.push({id:'upper',kind:'cluster',x:e.distance+e.player.x-34,y:e.player.y-24});
 e.layout.embers=packets;e._pickupCount=-1;e._nearbyPacketsUntil=-1;
 const lifts=[],attachments=[],deliveries=[],samples=[];
 const attach=e.onCollectorAttach.bind(e);e.onCollectorAttach=(p,w)=>{attachments.push({id:p.id,time:e.time,y:w.cargoY,vy:w.reelVY});return attach(p,w);};
 const collect=e.collect.bind(e);e.collect=(p,d)=>{if(d&&packets.includes(p)){
  const w=e.collectors.find(w=>w.cargo===p)||e.collectors.find(w=>Math.abs(w.cargoY-d.y)<1e-6);
  deliveries.push({id:p.id,time:e.time,distance:e.distance,y:d.y,source:d,player:{...e.player},cargoX:w?.cargoX});
 }return collect(p,d);};
 const step=e.step.bind(e);e.step=dt=>{
  if(e.player.y>e.height*.54&&e.player.vy>0){
   const before=e.collectors.filter(w=>w.cargo).map(w=>({index:w.collectorIndex,y:w.cargoY,vy:w.reelVY}));
   e.beginLiftInput();e.endLiftInput();
   for(const old of before){const w=e.collectors[old.index];assert.equal(w.cargoY,old.y,'Lift preserves cargo altitude');assert.equal(w.reelVY,old.vy,'Lift preserves cargo velocity');}
   if(before.length)lifts.push({time:e.time,playerVY:e.player.vy,before});
  }
  step(dt);
  for(const w of e.collectors)if(w.cargo)samples.push({id:w.cargo.id,time:e.time,y:w.cargoY,vy:w.reelVY,playerY:e.player.y,playerVY:e.player.vy,
   gap:Math.hypot(w.cargoX-e.player.x,w.cargoY-e.player.y),x:w.cargoX});
 };
 return {e,packets,lifts,attachments,deliveries,samples};
}
function paint(e,hz,seconds){e.tick(1000);for(let i=1;i<=hz*seconds;i++)e.tick(1000+i*1000/hz+(i===hz*seconds?.001:0));}

test('repeated real Lifts leave Sparks swinging at their own altitude at 20/30/60/120Hz paints',()=>{
 const results=[];
 for(const hz of [20,30,60,120]){
  const f=flight({paired:true}),{e}=f;try{
   paint(e,hz,7);
   assert.ok(!e.dying&&e.alive,'normal Lift physics keep the real flight alive');
   assert.equal(f.attachments.length,2,'both Collector paths actually intercept');
   assert.equal(f.deliveries.length,2,'both loads pay out once');assert.equal(e.collectorPickups,2);
   assert.ok(f.lifts.length>=2,'repeat Lifts happen while loads are attached');
   assert.ok(f.samples.some(s=>s.playerVY< -100&&s.vy>10),'a Lift can leave the Spark falling while the wisp rises');
   assert.ok(f.samples.some(s=>s.y-s.playerY>25),'the load visibly lags below the raised wisp');
   for(const delivery of f.deliveries){
    const packet=f.packets.find(p=>p.id===delivery.id),contact=sparkBodyRadius(packet,e.height)+WISP_ART.worldRadius;
    assert.ok(Math.hypot(delivery.source.worldX-delivery.distance-delivery.player.x,delivery.y-delivery.player.y)<=contact+1e-8,'payout is at integrated body contact');
    assert.ok(delivery.source.worldX-delivery.distance>delivery.player.x,'payout approaches from the front');
    const attached=f.attachments.find(a=>a.id===delivery.id);
    assert.ok(delivery.time-attached.time>=4-1e-8&&delivery.time-attached.time<4.4,'contact-gated arrival has a bounded recovery extension');
    assert.ok(Math.hypot(delivery.source.worldX-delivery.source.previousWorldX,delivery.source.y-delivery.source.previousY)<12,'delivery traverses a single physical step without a terminal jump');
   }
   results.push({lifts:f.lifts,attachments:f.attachments,deliveries:f.deliveries,samples:f.samples,time:e.time});
  }finally{e.destroy();}
 }
 for(const result of results.slice(1))assert.deepEqual(result,results[0],'fixed-step world physics match every paint cadence');
});

test('reduced motion retains gravity and real contact while suppressing added sway',()=>{
 const f=flight({quiet:true});try{
  paint(f.e,30,7);assert.equal(f.deliveries.length,1);assert.equal(f.e.collectorPickups,1);
  assert.ok(f.samples.some(s=>s.playerVY< -100&&s.vy>10));
 }finally{f.e.destroy();}
});

test('a real fetched Flash uses the front release once and keeps its own reveal tether',()=>{
 const f=flight({flash:true});try{
  paint(f.e,60,7);assert.equal(f.deliveries.length,1);assert.ok(f.packets[0].collected);
  const delivery=f.deliveries[0];assert.ok(delivery.source.worldX-delivery.distance>delivery.player.x);
  assert.ok(f.e.flashTether&&f.e.sightUntil>f.e.time);
  assert.ok(!f.e.absorptionEffects.some(effect=>effect.pickupId===f.packets[0].id),'Flash remains a reveal instead of a fuel absorption');
 }finally{f.e.destroy();}
});
