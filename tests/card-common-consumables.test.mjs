import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import * as M from '../dist/model.mjs';
import {CARD_SYSTEM,CARD_UNIT,CARD_ROW_EVENTS,SKILL_CARDS,makeSkillCard,getCardModifiers,cleanCardRun,
  createCardExecution,resolveCardRow,commitCardCharges,describeSkillCard,drawSkillCard,drawSkillCardDraft} from '../dist/skill-cards.mjs';
import {cardFace} from '../dist/card-ui.mjs';

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

test('Fast Spool spends only successful 3-second uses and excludes generated or Dream body pickups',()=>{
  const e=flight(['fast-spool'],{wispCooldown:1});try{
    const p=missed(e),initial=e.wisp.recoveryDuration(e,p);until(e,()=>!!e.wisp.cargo);near(e.wisp.activeReelSeconds(),initial);
    e.collect({kind:'light',generated:true});assert.equal(charges(e,0),3);
    e.dream={phase:'recording'};e.collect({kind:'light'});assert.equal(charges(e,0),3);e.dream=null;
    for(let i=0;i<3;i++){e.collect({kind:'light'});assert.equal(charges(e,0),3-Math.min(i+1,Math.ceil(initial/3)));}
    const remaining=Math.max(0,initial-9);near(e.wisp.activeReelSeconds(),remaining);e.collect({kind:'light'});near(e.wisp.activeReelSeconds(),remaining);
    until(e,()=>p.collected);assert.equal(e.collectorPickups,1);
  }finally{e.destroy();}
});

test('Return Spring and Haul Winch act once at real attachment before one genuine delivery, with bounded copies and replay',()=>{
  const e=flight(['echo','haul-winch','refrain','courier-tip','kindling-bead']);try{
    const p=missed(e,'cluster'),recovery=e.wisp.recoveryDuration(e,p);until(e,()=>!!e.wisp.cargo);
    const trace=e.cardRowTrace;assert.equal(trace.event.kind,CARD_ROW_EVENTS.attach);near(trace.reelSeconds,recovery);
    assert.equal(trace.sparks,0);assert.equal(trace.futureCapacity,0);assert.equal(e.flame,0,'attachment is not a fuel pickup');
    const spentUses=Math.ceil(recovery/3);
    assert.equal(trace.steps.filter(step=>step.success&&step.operation==='shorten-reel').length,spentUses);
    assert.equal(charges(e,1),SKILL_CARDS['haul-winch'].charges-spentUses,'only copies that shorten actual reel time spend a use');
    assert.equal(e.bodyPickups,0);assert.equal(e.collectorPickups,0);
    until(e,()=>p.collected);assert.equal(e.collectorPickups,1);assert.equal(e.bodyPickups,0);near(e.flame,40+6*CARD_UNIT);
    assert.equal(e.cardRowTrace.event.kind,CARD_ROW_EVENTS.delivery);assert.equal(e.wisp.cooldown,0);
    for(let i=0;i<180;i++)tick(e);assert.equal(e.collectorPickups,1);
  }finally{e.destroy();}
  const spring=flight(['return-spring']);try{
    const p=missed(spring),recovery=spring.wisp.recoveryDuration(spring,p);until(spring,()=>!!spring.wisp.cargo);near(spring.cardRowTrace.reelSeconds,.5);near(spring.wisp.activeReelSeconds(),Math.max(0,recovery-.5));
  }finally{spring.destroy();}
});

test('roughly half the Common catalog has charges without consuming persistent build enablers',()=>{
  const common=Object.values(SKILL_CARDS).filter(def=>def.rarity==='common'&&!def.unreleased),droppable=common.filter(def=>!def.starterOnly);
  // Prism Lens joined the Commons (ladder 2026-11-17) and Double Lift was added; neither has charges.
  assert.equal(common.length,48);assert.equal(common.filter(def=>def.charges).length,22);
  assert.equal(droppable.length,47);assert.equal(droppable.filter(def=>def.charges).length,22);
  assert.equal(droppable.reduce((sum,def)=>sum+(def.dropWeight||1),0),52);
  for(const id of ['body-spark','deep-vessel','tight-packing','echo','field-impulse','harvest-common',
    'downbeat','courier-tip','toll-bell','slip-feather','growth-seed-common','dream'])assert.equal(SKILL_CARDS[id].charges,undefined,id);
  let commonDrops=0,finiteDrops=0,finiteDrafts=0;
  for(let seed=0;seed<3000;seed++){
    const run={campaignSeed:`finite-common:${seed}`,mapIndex:0},node={id:'common-frequency'},
      card=drawSkillCard(run,'frequency',node,'common');
    commonDrops++;if(SKILL_CARDS[card.cardId].charges)finiteDrops++;
    if(drawSkillCardDraft(run,node).some(card=>SKILL_CARDS[card.cardId].rarity==='common'&&SKILL_CARDS[card.cardId].charges))finiteDrafts++;
  }
  assert.ok(Math.abs(finiteDrops/commonDrops-22/52)<.03,'weighted Common frequency includes Growth Seed weight and persistent Dream');
  assert.ok(finiteDrafts>2000&&finiteDrafts<2500,'normal three-card drafts usually offer a finite Common');
});

test('direct and wave Common charges spend on matching successful actions and share copies and replay',()=>{
  const e=flight(['echo-iii','cluster-heart','refrain','low-wick']);try{
    e.flame=80;e.collect({kind:'light'});assert.equal(charges(e,1),5);assert.equal(charges(e,3),6);
    e.flame=0;e.collect({kind:'cluster'});assert.equal(charges(e,1),0);assert.equal(charges(e,3),4);
    near(e.cardRowTrace.sparks,40);assert.equal(e.cardRowTrace.passes,2);
    assert.equal(e.cardRowTrace.steps.filter(step=>step.sourceCardId==='cluster-heart'&&step.success).length,5);
    for(const packet of [{kind:'cluster',generated:true},{kind:'cluster',deliveredByWisp:true}])e.collect(packet);
    assert.equal(charges(e,3),4,'generated and Collector pickups never spend body-card uses');
    e.dream={phase:'recording'};e.flame=0;e.collect({kind:'cluster'});assert.equal(charges(e,3),4);e.dream=null;
  }finally{e.destroy();}
  const runtime=createCardExecution(['first-ripple','far-shore','refrain'].map((id,i)=>makeSkillCard(id,`wave:${i}`)));
  const first=resolveCardRow(runtime,{kind:CARD_ROW_EVENTS.wave,firstCrossing:true});
  near(first.sparks,8);assert.deepEqual(first.charges,{'wave:0':4,'wave:1':6});
  const later=resolveCardRow(runtime,{kind:CARD_ROW_EVENTS.wave,firstCrossing:false});
  near(later.sparks,10);assert.deepEqual(later.charges,{'wave:0':4,'wave:1':4});
});

test('limited recovery cards keep uses when ready, clamp short recovery and cannot replay spent time',()=>{
  for(const [id,event] of [['pacesetter',{kind:CARD_ROW_EVENTS.rhythm}],
    ['mending-moss',{kind:CARD_ROW_EVENTS.body,guardRecovering:true}],
    ['flash-thread',{kind:CARD_ROW_EVENTS.flash}],
    ['haul-winch',{kind:CARD_ROW_EVENTS.attach,pickupKind:'cluster'}]]){
    const runtime=createCardExecution(['echo-iii',id,'refrain'].map((cardId,i)=>makeSkillCard(cardId,`time:${i}`))),cap=runtime.cards[1].charges;
    resolveCardRow(runtime,event);assert.equal(runtime.cards[1].charges,cap,id);
    const receipt=resolveCardRow(runtime,{...event,availableRecovery:.25,availableReel:.25});
    near(receipt.recoverySeconds+receipt.reelSeconds,.25);assert.equal(runtime.cards[1].charges,cap-1,id);
    assert.equal(receipt.steps.filter(step=>step.sourceCardId===id&&step.success).length,1,id);
    assert.equal(receipt.passes,2);assert.ok(receipt.steps.every(step=>step.recoveryAfter>=0&&step.reelAfter>=0));
  }
});

test('finite multipliers require an earlier payer and successful Flash, Cache and guard events retain their real sources',()=>{
  for(const [id,payer,kind] of [['courier-glass','courier-tip',CARD_ROW_EVENTS.delivery],['clear-prism','flash-handling',CARD_ROW_EVENTS.flash]]){
    const empty=createCardExecution([makeSkillCard(id,'multiplier')]),cap=empty.cards[0].charges;
    resolveCardRow(empty,{kind});assert.equal(empty.cards[0].charges,cap,'no earlier card Sparks means no use');
    const row=createCardExecution([makeSkillCard(payer,'payer'),{...makeSkillCard(id,'multiplier'),charges:1},makeSkillCard('refrain','replay')]),
      receipt=resolveCardRow(row,{kind});
    assert.equal(row.cards[1].charges,0);assert.equal(receipt.steps.filter(step=>step.sourceCardId===id&&step.success).length,1);
    near(receipt.sparks,SKILL_CARDS[payer].amount*3,'one doubling on the first pass, unmodified payer on replay');
  }
  for(const [id,kind,pickupKind,expected] of [['crate-lining',CARD_ROW_EVENTS.delivery,'cache',8],['home-beacon',CARD_ROW_EVENTS.guard,null,9]]){
    const row=createCardExecution([makeSkillCard('echo',`copy:${id}`),{...makeSkillCard(id,id),charges:1},makeSkillCard('refrain',`replay:${id}`)]),
      receipt=resolveCardRow(row,{kind,pickupKind});
    near(receipt.sparks,expected);assert.equal(row.cards[1].charges,0);assert.equal(receipt.steps.filter(step=>step.sourceCardId===id&&step.success).length,1);
  }
});

test('old-save Commons gain finite caps once, preserve partial duplicate identities and display remaining uses',()=>{
  const state=M.newState();state.profile.tutorialComplete=true;
  state.run=M.createRun(state.profile,'common-save-upgrade',1,{cards:true});const run=state.run;
  run.mountedCards=[{instanceId:'old:cluster',cardId:'cluster-heart',rank:1},
    {...makeSkillCard('cluster-heart','partial:cluster'),charges:2},null];
  run.reserveCards=[{instanceId:'old:prism',cardId:'clear-prism',rank:1},
    {...makeSkillCard('low-wick','empty:wick'),charges:0},
    {...makeSkillCard('spark-cache','ranked:cache'),rank:3,charges:2}];
  cleanCardRun(run);assert.equal(run.mountedCards[0].charges,5);assert.equal(run.mountedCards[1].charges,2);
  assert.equal(run.reserveCards.find(card=>card.instanceId==='old:prism').charges,4);
  assert.ok(!run.reserveCards.some(card=>card.instanceId==='empty:wick'));
  const body=describeSkillCard(run.mountedCards[1]),markup=cardFace(body);
  assert.equal(body.limited,true);assert.match(body.effect,/2 uses/);assert.doesNotMatch(body.effect,/shared uses/);assert.match(markup,/aria-label="2 of 5 uses remaining: help">2\/5/);
  assert.deepEqual(commitCardCharges(run,{'old:cluster':4,'partial:cluster':0}),['partial:cluster']);
  let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
  assert.ok(M.saveState(state,storage));const loaded=M.loadState(storage).run;
  assert.equal(loaded.mountedCards[0].instanceId,'old:cluster');assert.equal(loaded.mountedCards[0].charges,4);
  assert.equal(loaded.mountedCards[1],null);
  assert.deepEqual(loaded.reserveCards.find(card=>card.instanceId==='ranked:cache'),
    {instanceId:'ranked:cache',cardId:'spark-cache',rank:3,charges:2});
  cleanCardRun(loaded);assert.equal(loaded.mountedCards[0].charges,4,'reload and normalization never refill partial cards');
});

test('attachment checks the original kind and excludes generated and Dream-caught fuel',()=>{
  const cache=flight(['haul-winch'],{collectorFetchMass:3});try{
    const p=missed(cache,'cache'),recovery=cache.wisp.recoveryDuration(cache,p);until(cache,()=>!!cache.wisp.cargo);near(cache.wisp.activeReelSeconds(),recovery);
    assert.equal(cache.cardRowTrace,null);until(cache,()=>p.collected);assert.equal(p.kind,'cluster');assert.equal(p.collectorOriginalKind,'cache');
    assert.equal(cache.cardRowTrace,null,'compressed delivery never invents a Cluster attachment');
  }finally{cache.destroy();}
  for(const mode of ['generated','dream']){
    const e=flight(['return-spring']);try{
      if(mode==='dream')e.dream={phase:'recording',active:true};
      const p=missed(e,'light',mode==='generated'?{generated:true}:{});until(e,()=>!!e.wisp.cargo);
      near(e.wisp.activeReelSeconds(),e.wisp.recoveryDuration(e,p));assert.equal(e.cardRowTrace,null,mode);
      if(mode==='dream'){assert.equal(p.fetchedInDream,true);e.dream=null;}
      until(e,()=>p.collected);assert.equal(e.cardRowTrace,null,mode);
    }finally{e.destroy();}
  }
});
