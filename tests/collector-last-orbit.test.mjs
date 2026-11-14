import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight,circleHitsObstacle} from '../dist/flight.mjs';
import {attachDream} from '../dist/dream.mjs';

function flight(options={}) {
  const ctx=new Proxy({}, {get(o,k){return o[k]??=String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{};}});
  const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})};
  const e=new WispFlight({canvas,seed:'last-orbit',terrain:'ruins',companions:['collector'],
    modifiers:{collectorGuard:true,wispCooldown:.75,treasureRecoveryScale:.8,dreamDuration:6},...options});
  e.render=()=>{};e.layout.embers=[];e.blackHoles.items=[];e.biomeDynamics.items=[];e.running=true;
  return e;
}

function leaveViewport(e,top=false){
  e.player.y=top?-e.player.radius-1:e.height+e.player.radius+1;
  e.player.vy=top?-5:5;
  e.step(1/60);
}

test('Last Orbit spends a full idle ring at a lethal edge; suppresses fetch until four equipped recoveries finish',()=>{
  const e=flight();e.layout.obstacles=[];
  try{
    const w=e.wisp;
    const ordinary=w.recoveryDuration(e);
    const fuel=e.flame;
    e.player.y=e.height+e.player.radius*.5;e.player.vy=0;e.step(1/240);
    assert.equal(w.canGuard(e),true,'a partially offscreen wisp is still safe');
    leaveViewport(e);
    assert.equal(e.dying,false);assert.equal(e.flame,fuel);assert.ok(e.player.vy<0);
    assert.ok(e.player.y<e.height-e.player.radius);
    assert.equal(w.cooldownMax,ordinary*4);assert.equal(w.cooldown,w.cooldownMax);
    assert.equal(w.phase,'guard-recovery');assert.equal(w.state(e).canFetch,false);
    assert.equal(e.getCollectorAuraState().radius,0);
    const before=w.cooldown;e.hit(null);assert.equal(w.cooldown,before,'separation protects a second contact');
    const packet={kind:'light',id:8,x:e.distance+e.player.x-28,y:e.player.y,fuel:true};
    e.layout.embers=[packet];
    e.flame=35;w.update(e,.1);assert.ok(!packet.attracted);
    packet.x=e.distance+e.player.x;e.step(1/60);assert.equal(packet.collected,true);assert.ok(e.flame>35);
    e.layout.embers=[];
    const ratio=w.cooldown/w.cooldownMax;
    e.applySkillUpgrade({...e.mod,wispCooldown:.6},0);
    assert.equal(w.cooldownMax,w.recoveryDuration(e)*4);assert.ok(Math.abs(w.cooldown/w.cooldownMax-ratio)<1e-8);
    w.update(e,w.cooldown-.05);assert.equal(w.canGuard(e),false);
    w.update(e,.06);assert.equal(w.canGuard(e),true);assert.ok(e.getCollectorAuraState().radius>0);
  }finally{e.destroy();}
});

test('existing shields spend first; a second impact while the ring is recovering costs the attempt',()=>{
  const e=flight();e.layout.obstacles=[];
  try{
    e.proximityShieldRemaining=1;e.flightBoon.ward=true;
    leaveViewport(e,true);assert.ok(e.player.vy>0);assert.equal(e.proximityShieldRemaining,0);assert.equal(e.flightBoon.ward,true);assert.equal(e.wisp.canGuard(e),true);
    e.shield.protection=0;leaveViewport(e);assert.equal(e.flightBoon.ward,false);assert.equal(e.wisp.canGuard(e),true);
    e.shield.protection=0;leaveViewport(e);assert.equal(e.dying,false);assert.equal(e.wisp.canGuard(e),false);
    e.shield.protection=0;leaveViewport(e);assert.equal(e.dying,true);
  }finally{e.destroy();}
});

test('no free shield on a fetch, a partial ring, a lost heart without the skill, or a different companion',()=>{
  for(const state of ['outbound','returning','cooldown','no-skill','swift']){
    const e=flight(state==='swift'?{companions:['swift']}:{});e.layout.obstacles=[];
    try{
      if(state==='no-skill')e.mod.collectorGuard=false;
      if(state==='outbound'){e.wisp.phase=state;e.wisp.target={};}
      if(state==='returning'){e.wisp.phase=state;e.wisp.cargo={};}
      if(state==='cooldown'){e.wisp.phase=state;e.wisp.cooldown=3;}
      leaveViewport(e,true);
      assert.equal(e.dying,true,state);
    }finally{e.destroy();}
  }
});

test('solid guardian terrain is intercepted, black-hole drain alone is not',()=>{
  const e=flight({boss:true,bossId:'rootbound-heart'});try{
    const gate=e.layout.boss.attacks[0],x=gate.x,ob=gate.obstacle;
    const collisionY=Array.from({length:Math.floor(e.height)-70},(_,i)=>35+i)
      .find(y=>circleHitsObstacle(x,y,e.player.radius,ob,e.time));
    assert.ok(Number.isFinite(collisionY));
    e.player.y=collisionY;e.distance=x-e.player.x-e.baseSpeed/60;e.step(1/60);
    assert.equal(e.dying,false);assert.equal(e.wisp.phase,'guard-recovery');
    assert.ok(!e.getNearbyObstacles().some(o=>circleHitsObstacle(e.distance+e.player.x,e.player.y,e.player.radius,o,e.time)));
  }finally{e.destroy();}
  const obs=flight();try{
    obs.blackHoles.items=[{id:'drain',x:obs.distance+obs.player.x,y:obs.player.y,influence:200}];
    const before=obs.flame;obs.blackHoles.update(.1);
    assert.ok(obs.flame<before);assert.equal(obs.wisp.canGuard(obs),true);
  }finally{obs.destroy();}
});

test('Dream recording uses the same defense and does not carry spent recovery into a fresh attempt',()=>{
  const rehearsal=flight(),next=flight();
  try{
    attachDream(rehearsal,{mode:'record'});rehearsal.layout.obstacles=[];
    leaveViewport(rehearsal);assert.equal(rehearsal.wisp.phase,'guard-recovery');
    assert.equal(rehearsal.dying,false);assert.ok(next.wisp.canGuard(next));
  }finally{rehearsal.destroy();next.destroy();}
});
