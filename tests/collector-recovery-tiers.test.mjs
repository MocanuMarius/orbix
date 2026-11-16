import test from 'node:test';
import assert from 'node:assert/strict';
import {WispCompanion} from '../dist/wisp.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {collectorCanFetch} from '../dist/collector-load.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {CARD_SYSTEM,makeSkillCard,getCardModifiers} from '../dist/skill-cards.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≈ ${b}`);
function fixture(kind='light',mod={},rate=1,hz=120){
  const e={player:{x:110,y:310},height:620,time:0,distance:0,baseSpeed:154,mod,
    wispBoost:0,companions:['collector'],flightBoon:{recoveryRate:rate},layout:{embers:[]},deliveries:[],
    hasCompanion:()=>true,collect(p,source){assert.ok(!p.collected);p.collected=true;this.deliveries.push({time:this.time,source});}};
  const p={kind,x:70,y:335},w=new WispCompanion(e.player);e.layout.embers=[p];w.beginReel(e,p,e.player);
  const tick=()=>{const dt=1/hz;e.time+=dt;e.previousDistance=e.distance;e.distance+=e.baseSpeed*dt;w.update(e,dt);};
  return {e,w,p,tick};
}

test('natural fuel sets Small, Cluster and Cache recovery before modifiers and Cache compression',()=>{
  const {e,w}=fixture();
  for(const [kind,seconds] of [['light',10/3],['cluster',20/3],['cache',10]]){
    near(w.recoveryDuration(e,{kind}),seconds);
    near(w.recoveryDuration({...e,mod:{wispCooldown:.5,treasureRecoveryScale:.8}},{kind}),seconds*.4);
  }
  near(w.recoveryDuration(e,{kind:'sight'}),10);near(w.recoveryDuration(e),10);
  w.spendGuard(e);near(w.cooldown,40);
  assert.equal(collectorCanFetch({kind:'cache'}),false,'handling requirement remains');
  assert.equal(collectorCanFetch({kind:'cache'},{collectorFetchMass:3}),true);
  const cache=fixture('cache',{collectorFetchMass:3});near(cache.w.cooldown,10);
  while(!cache.p.collected&&cache.e.time<11)cache.tick();
  assert.equal(cache.p.collectorCompressed,true);assert.equal(getPickupSpec(cache.p).fuel,40);
  near(cache.e.deliveries[0].time,10);near(cache.w.cooldownMax,10);
});

test('every fuel tier and fast recovery boon complete a scaled visible path once at the recovery deadline',()=>{
  for(const hz of [30,60,120])for(const kind of ['light','cluster','cache'])for(const rate of [1,2.5]){
    const f=fixture(kind,{wispCooldown:.4,treasureRecoveryScale:.8,collectorFetchMass:3},rate,hz),{e,w,p,tick}=f;
    const deadline=w.cooldown/rate;let shrink=false,spiral=false,previous=-1;
    while(!p.collected&&e.time<deadline+1){
      tick();if(w.sling){assert.ok(w.sling.elapsed>=previous);previous=w.sling.elapsed;}
      if(w.cargo){shrink||=w.cargoPose(p,e.time,e.height).scale<.5;spiral||=w.towStage==='spiral';}
    }
    assert.equal(e.deliveries.length,1,`${kind} ${hz}Hz rate ${rate}`);
    assert.ok(Math.abs(e.deliveries[0].time-deadline)<2/hz,'physical finish shares the recovery clock');
    assert.ok(shrink&&spiral);near(w.cooldown,0);assert.equal(w.phase,'ready');
    for(let i=0;i<hz;i++)tick();assert.equal(e.deliveries.length,1);
  }
});

test('real Fast Spool on a short Small reel completes the visible finish with one award and no idle cooldown',()=>{
  globalThis.requestAnimationFrame=()=>null;globalThis.cancelAnimationFrame=()=>{};
  const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??=(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{})});
  const e=new WispFlight({canvas:{style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})},
    seed:'short-recovery-card',preflight:true,companions:['collector'],duration:90,
    modifiers:{...getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:[makeSkillCard('fast-spool','fast')]}),wispCooldown:.4}});
  try{
    e.render=()=>{};e.notify=()=>{};e.running=true;e.resumeElapsed=e.resumeRampSeconds;
    const p={kind:'light',x:e.distance+e.player.x-40,y:e.player.y+20};e.layout.embers=[p];e.wisp.beginReel(e,p,e.player);
    const before={x:e.wisp.cargoX,y:e.wisp.cargoY};e.flame=e.maxFlame;
    e.collect({kind:'light',x:e.distance+e.player.x,y:e.player.y});near(e.wisp.cooldown,0);
    assert.deepEqual({x:e.wisp.cargoX,y:e.wisp.cargoY},before,'card spends time without teleporting');
    for(let i=0;i<120&&!p.collected;i++){e.time+=1/120;e.previousDistance=e.distance;e.distance+=e.baseSpeed/120;e.wisp.update(e,1/120);}
    assert.equal(p.collected,true);assert.equal(e.collectorPickups,1);assert.equal(e.wisp.phase,'ready');near(e.wisp.cooldown,0);
    for(let i=0;i<120;i++){e.time+=1/120;e.previousDistance=e.distance;e.distance+=e.baseSpeed/120;e.wisp.update(e,1/120);}
    assert.equal(e.collectorPickups,1);
  }finally{e.destroy();}
});
