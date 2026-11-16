import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {CARD_SYSTEM,CARD_UNIT,CARD_ROW_EVENTS,makeSkillCard,getCardModifiers} from '../dist/skill-cards.mjs';

globalThis.requestAnimationFrame=()=>null;globalThis.cancelAnimationFrame=()=>{};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function flight(ids,extra={}){
  const e=new WispFlight({preflight:true,seed:'common-real-reel',companions:['collector'],
    modifiers:{...getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:ids.map((id,i)=>makeSkillCard(id,`common:${i}`))}),wispCooldown:.4,...extra},
    canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})}});
  e.running=true;e.render=()=>{};e.notify=()=>{};e.layout.obstacles=[];e.layout.embers=[];
  e.flame=0;return e;
}
function missed(e,kind='light',extra={}){
  const packet={id:'genuine-missed',kind,x:e.distance+e.player.x-40,y:e.player.y+10,...extra};e.layout.embers=[packet];return packet;
}
function tick(e,dt=1/120){e.time+=dt;e.previousDistance=e.distance;e.distance+=e.baseSpeed*dt;e.wisp.update(e,dt);}
function until(e,predicate){for(let i=0;i<1200&&!predicate();i++)tick(e);assert.ok(predicate(),'actual Collector transition reached');}
const charges=(e,slot)=>e.getState().cardCharges[`common:${slot}`];

test('Wick Doubler works without Rhythm and spends only three successful direct-pickup doublings',()=>{
  const e=flight(['body-spark','wick-doubler','refrain']);try{
    for(const packet of [{kind:'light',generated:true},{kind:'light',deliveredByWisp:true}])e.collect(packet);
    assert.equal(charges(e,1),3);
    e.dream={phase:'recording'};e.collect({kind:'light'});assert.equal(charges(e,1),3);e.dream=null;
    e.flame=0;e.collect({kind:'light'});assert.equal(charges(e,1),1);near(e.cardRowTrace.sparks,8);near(e.flame,20+8*CARD_UNIT);
    e.flame=0;e.collect({kind:'cluster'});assert.equal(charges(e,1),0);near(e.cardRowTrace.sparks,6);
    assert.deepEqual(e.cardRowTrace.steps.filter(step=>step.sourceCardId==='wick-doubler'&&step.success).map(step=>step.chargesAfter),[0]);
    e.flame=0;e.collect({kind:'light'});near(e.cardRowTrace.sparks,4);assert.equal(charges(e,1),0);
  }finally{e.destroy();}
  const noPayer=flight(['wick-doubler','body-spark']);try{
    noPayer.collect({kind:'light'});assert.equal(charges(noPayer,0),3);near(noPayer.cardRowTrace.sparks,2);
  }finally{noPayer.destroy();}
});

test('Fast Spool reduces only an actual active reel, clamps the last time and shares the original uses',()=>{
  const e=flight(['echo-iii','fast-spool','refrain'],{collectorGuard:true});try{
    e.collect({kind:'light'});assert.equal(charges(e,1),3);
    e.wisp.spendGuard(e);const guard=e.wisp.cooldown;e.collect({kind:'light'});near(e.wisp.cooldown,guard);assert.equal(charges(e,1),3);
    e.wisp.cooldown=0;e.wisp.phase='ready';const p=missed(e);until(e,()=>!!e.wisp.cargo);
    e.wisp.shortenReel(e.wisp.activeReelSeconds()-.25);const before=e.wisp.activeReelSeconds();
    e.collect({kind:'light'});near(e.cardRowTrace.reelSeconds,before);near(e.wisp.activeReelSeconds(),0);
    assert.equal(charges(e,1),2,'only the first successful copy spends a shared use');
    assert.equal(e.cardRowTrace.steps.filter(step=>step.sourceCardId==='fast-spool'&&step.success).length,1);
    until(e,()=>p.collected);assert.equal(e.wisp.phase,'ready');assert.equal(e.collectorPickups,1);
    const after=charges(e,1);e.collect({kind:'light'});assert.equal(charges(e,1),after);
  }finally{e.destroy();}
});

test('Fast Spool has three successful 3-second uses and no uses for generated or Dream body pickups',()=>{
  const e=flight(['fast-spool'],{wispCooldown:1});try{
    const p=missed(e);until(e,()=>!!e.wisp.cargo);const initial=e.wisp.activeReelSeconds();
    e.collect({kind:'light',generated:true});assert.equal(charges(e,0),3);
    e.dream={phase:'recording'};e.collect({kind:'light'});assert.equal(charges(e,0),3);e.dream=null;
    for(let i=0;i<3;i++){e.collect({kind:'light'});assert.equal(charges(e,0),2-i);}
    near(e.wisp.activeReelSeconds(),initial-9);e.collect({kind:'light'});near(e.wisp.activeReelSeconds(),initial-9);
    until(e,()=>p.collected);assert.equal(e.collectorPickups,1);
  }finally{e.destroy();}
});

test('Return Spring and Haul Winch act once at real attachment before one genuine delivery, with bounded copies and replay',()=>{
  const e=flight(['echo','haul-winch','refrain','courier-tip','kindling-bead']);try{
    const p=missed(e,'cluster');until(e,()=>!!e.wisp.cargo);
    const trace=e.cardRowTrace;assert.equal(trace.event.kind,CARD_ROW_EVENTS.attach);near(trace.reelSeconds,4);
    assert.equal(trace.sparks,0);assert.equal(trace.futureCapacity,0);assert.equal(e.flame,0,'attachment is not a fuel pickup');
    assert.equal(trace.steps.filter(step=>step.success&&step.operation==='shorten-reel').length,3);
    assert.equal(e.bodyPickups,0);assert.equal(e.collectorPickups,0);
    until(e,()=>p.collected);assert.equal(e.collectorPickups,1);assert.equal(e.bodyPickups,0);near(e.flame,40+6*CARD_UNIT);
    assert.equal(e.cardRowTrace.event.kind,CARD_ROW_EVENTS.delivery);assert.equal(e.wisp.cooldown,0);
    for(let i=0;i<180;i++)tick(e);assert.equal(e.collectorPickups,1);
  }finally{e.destroy();}
  const spring=flight(['return-spring']);try{
    missed(spring);until(spring,()=>!!spring.wisp.cargo);near(spring.cardRowTrace.reelSeconds,.5);near(spring.wisp.activeReelSeconds(),3.5);
  }finally{spring.destroy();}
});

test('attachment checks the original kind and excludes generated and Dream-caught fuel',()=>{
  const cache=flight(['haul-winch'],{collectorFetchMass:3});try{
    const p=missed(cache,'cache');until(cache,()=>!!cache.wisp.cargo);near(cache.wisp.activeReelSeconds(),4);
    assert.equal(cache.cardRowTrace,null);until(cache,()=>p.collected);assert.equal(p.kind,'cluster');assert.equal(p.collectorOriginalKind,'cache');
    assert.equal(cache.cardRowTrace,null,'compressed delivery never invents a Cluster attachment');
  }finally{cache.destroy();}
  for(const mode of ['generated','dream']){
    const e=flight(['return-spring']);try{
      if(mode==='dream')e.dream={phase:'recording',active:true};
      const p=missed(e,'light',mode==='generated'?{generated:true}:{});until(e,()=>!!e.wisp.cargo);
      near(e.wisp.activeReelSeconds(),4);assert.equal(e.cardRowTrace,null,mode);
      if(mode==='dream'){assert.equal(p.fetchedInDream,true);e.dream=null;}
      until(e,()=>p.collected);assert.equal(e.cardRowTrace,null,mode);
    }finally{e.destroy();}
  }
});
