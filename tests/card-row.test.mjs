import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_SYSTEM,CARD_UNIT,CARD_ROW_EVENTS,CARD_ECONOMY,SKILL_CARDS,makeSkillCard,getCardModifiers,createCardExecution,resolveCardRow,previewCardRow,getCardStarterOffers,getCardPackingBonus,getMountedCards,cleanCardRun} from '../dist/skill-cards.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {activationPresentation} from '../dist/activation-feedback.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const cards=ids=>ids.map((id,index)=>id?makeSkillCard(id,`${index}:${id}`):null);
function flight(ids,extra={}){
  const mountedCards=cards(ids),modifiers=getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards});
  if(modifiers.cardFlashHandling)modifiers.collectorFlashFetch=true;
  const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
    seed:'ordered-row-test',preflight:true,companions:['collector'],modifiers:{...modifiers,...extra}});
  e.running=true;e.render=()=>{};e.notify=()=>{};e.layout.obstacles=[];e.layout.embers=[];
  return e;
}
const cross=(e,packets=[{kind:'light',x:e.player.x+90,y:e.player.y}])=>{
  e.layout.embers=packets;e.getNearbyPickups=()=>packets;
  e.luminanceWaves.emit({x:e.player.x,y:e.player.y,radius:300,reveal:true});e.luminanceWaves.update(.3);return packets;
};
const waveFeedback=e=>{
  const bursts=[],sounds=[];
  e.burst=(...args)=>bursts.push(args);e.sound=(...args)=>sounds.push(args);
  return {bursts,sounds};
};

test('one ordered walker drives exact previews, fractions, reversal and bounded full replay',()=>{
  for(const [ids,want] of [
    // Whole Sparks (2026-11-17): each firing's total rounds UP (owner: always round up), so 2 × 1.25 = 2.5 pays 3.
    [['rhythm','harvest-rare','prism-lens'],3],
    [['harvest-rare','prism-lens','refrain'],6],
    [['prism-lens','harvest-rare','refrain'],4],
    [['echo','harvest-rare','crescendo'],8],
    [['harvest-rare','harvest-rare','crescendo','prism-lens','refrain'],20],
    [['refrain','harvest-common','refrain','prism-lens','refrain'],4],
  ]){
    const runtime=createCardExecution(cards(ids)),event={kind:CARD_ROW_EVENTS.wave,firstCrossing:true};
    const predicted=previewCardRow(runtime,event),actual=resolveCardRow(runtime,event);
    near(actual.sparks,want);assert.deepEqual(actual,predicted);assert.ok(actual.steps.length<=10);
    assert.ok(Object.isFrozen(actual));assert.ok(Object.isFrozen(actual.steps[0]));
    assert.equal(actual.steps[0].slot,0);assert.equal(actual.steps[0].pass,1);
  }
  const empty=previewCardRow(cards(['refrain','prism-lens',null]),{kind:CARD_ROW_EVENTS.body});
  assert.equal(empty.passes,1);assert.equal(empty.sparks,0);
});

test('finite actual sources fund copy, original and replay in slot order without recursion',()=>{
  const row=cards(['echo','spark-cache','refrain']);row[1].charges=3;
  const runtime=createCardExecution(row),event={kind:CARD_ROW_EVENTS.body};
  const preview=previewCardRow(runtime,event);assert.equal(runtime.cards[1].charges,3);
  const actual=resolveCardRow(runtime,event);assert.deepEqual(actual,preview);
  assert.equal(actual.sparks,12);assert.equal(actual.charges['1:spark-cache'],0);
  assert.deepEqual(actual.steps.filter(s=>s.success&&s.operation==='add-sparks').map(s=>[s.pass,s.slot]),[[1,0],[1,1],[2,0]]);
  assert.equal(resolveCardRow(runtime,event).sparks,0);
  const chain=previewCardRow(cards(['echo','chameleon','body-spark']),event);
  assert.equal(chain.sparks,4);assert.equal(chain.steps[0].skipReason,'incompatible-neighbor');
});

test('real Rhythm pulse applies 2.5 per uncollected organic crossing with one physical wave',()=>{
  const e=flight(['rhythm','harvest-rare','prism-lens']);let now=0;e.fourthBeatNow=()=>now;
  try{
    for(const at of [0,.6,1.2]){now=at;e.time=at;assert.ok(e.beginLiftInput());e.endLiftInput();}
    assert.equal(e.luminanceWaves.waves.length,1);e.flame=0;
    const packet={kind:'light',x:e.distance+e.player.x+90,y:e.player.y};e.layout.embers=[packet];e.getNearbyPickups=()=>[packet];
    e.luminanceWaves.update(.3);near(e.flame,3*CARD_UNIT); // whole Sparks: each firing rounds UP
    assert.equal(packet.collected,undefined);assert.equal(e.cardRowTrace.sparks,3);assert.equal(e.cardRowTrace.sparksExact,2.5);assert.equal(e.cardRhythm.waves,1);
    e.luminanceWaves.update(.1);near(e.flame,3*CARD_UNIT);
  }finally{e.destroy();}
});

test('replayed Harvest pays capped meter and original-pass Stored once, without collecting or emitting',()=>{
  const e=flight(['harvest-legendary','prism-lens','refrain']);
  try{
    e.flame=e.maxFlame-1;const packets=cross(e);
    near(e.flame,e.maxFlame);assert.equal(e.resonanceStored,1);assert.equal(e.cardRowTrace.sparks,6); // whole Sparks: each firing rounds UP
    assert.equal(e.luminanceWaves.waves.length,1);assert.equal(packets[0].collected,undefined);
    assert.equal(e.pickupOverflow,0);assert.equal(e.condensedGlow,0);
    e.flame=0;cross(e,[{kind:'light',x:e.player.x+90,y:e.player.y,generated:true}]);
    assert.equal(e.flame,0);assert.equal(e.resonanceStored,1);
  }finally{e.destroy();}
});

test('unrelated and unmatched ordered crossings stay silent and retain the last productive receipt',()=>{
  for(const ids of [['body-spark','lift-guide'],['body-spark','kindling-bead']]){
    const e=flight(ids);
    try{
      e.flame=0;e.collect({kind:'light'});const trace=e.cardRowTrace;
      assert.ok(trace.sparks>0);const {bursts,sounds}=waveFeedback(e);
      e.flame=0;const [packet]=cross(e),wave=e.luminanceWaves.waves[0];
      assert.equal(e.flame,0);assert.equal(e.cardRowTrace,trace);
      assert.deepEqual(bursts,[]);assert.deepEqual(sounds,[]);
      assert.equal(wave.naturalCrossings,1);assert.ok(wave.seen.has(packet));
      assert.equal(packet.collected,undefined);assert.equal(e.luminanceWaves.waves.length,1);
      assert.equal(e.pickupOverflow,0);assert.equal(e.resonanceStored,0);
    }finally{e.destroy();}
  }
});

test('First Ripple pays and cues only its first crossing while later physical crossings still count',()=>{
  const e=flight(['first-ripple']);
  try{
    const {bursts,sounds}=waveFeedback(e);e.flame=0;
    const packets=[90,200].map(x=>({kind:'light',x:e.player.x+x,y:e.player.y}));cross(e,packets);
    const trace=e.cardRowTrace,wave=e.luminanceWaves.waves[0];
    near(e.flame,4*CARD_UNIT);assert.equal(trace.event.firstCrossing,true);
    assert.equal(bursts.length,1);assert.equal(sounds.length,1);assert.equal(sounds[0][0],'resonate');
    e.luminanceWaves.update(.3);
    near(e.flame,4*CARD_UNIT);assert.equal(e.cardRowTrace,trace);
    assert.equal(e.cardExecution.lastTrace.event.firstCrossing,false);assert.equal(e.cardExecution.lastTrace.sparks,0);
    assert.equal(wave.naturalCrossings,2);assert.equal(wave.seen.size,2);assert.equal(e.cardRowSequence,2);
    assert.equal(bursts.length,1);assert.equal(sounds.length,1);
    assert.ok(packets.every(packet=>!packet.collected));assert.equal(e.luminanceWaves.waves.length,1);
  }finally{e.destroy();}
});

test('live capped receipts preserve raw arithmetic and retain a meaningful full-meter award',()=>{
  const e=flight(['harvest-rare','prism-lens','refrain']);
  try{
    e.flame=e.maxFlame-CARD_UNIT;cross(e);
    const partial=e.cardRowTrace,raw=e.cardExecution.lastTrace;
    assert.equal(partial.sparks,6);near(partial.restoredSparks,1);near(e.flame,e.maxFlame); // whole Sparks: each firing rounds UP
    assert.ok(Object.isFrozen(partial));assert.ok(Object.isFrozen(partial.event));assert.ok(Object.isFrozen(partial.steps));
    assert.ok(partial.steps.every(Object.isFrozen));assert.equal(partial.steps,raw.steps);
    assert.equal(raw.sparks,6);assert.equal(raw.restoredSparks,undefined);
    assert.deepEqual(partial.steps.filter(step=>step.operation==='multiply').map(step=>[step.before,step.after]),[[2,2.5],[2,2.5]]);
    cross(e);const full=e.cardRowTrace;
    assert.notEqual(full,partial);assert.ok(full.event.id>partial.event.id);
    assert.equal(full.sparks,6);assert.equal(full.restoredSparks,0);near(e.flame,e.maxFlame);
    assert.ok(full.steps.some(step=>step.success&&step.operation==='add-sparks'));
    assert.equal(e.cardExecution.lastTrace.sparks,6);near(partial.restoredSparks,1);
    assert.equal(e.pickupOverflow,0);assert.equal(e.resonanceStored,0);assert.equal(e.luminanceWaves.waves.length,2);
  }finally{e.destroy();}
});

test('body and Flare replay numeric gain without new collection, overflow, waves or Dream rewards',()=>{
  const e=flight(['body-spark','prism-lens','refrain']);
  try{
    e.flame=0;e.collect({kind:'light'});near(e.flame,20+6*CARD_UNIT); // whole Sparks: each firing rounds UP
    assert.equal(e.bodyPickups,1);assert.equal(e.pickupOverflow,0);assert.equal(e.condensedGlow,0);
    const seq=e.cardRowSequence;e.flame=0;e.collect({kind:'light',generated:true});assert.equal(e.cardRowSequence,seq);
    e.collect({kind:'light',deliveredByWisp:true});assert.equal(e.cardRowSequence,seq);
    e.dream={phase:'recording'};e.collect({kind:'light'});assert.equal(e.cardRowSequence,seq);
  }finally{e.destroy();}
  const flash=flight(['flash-handling','prism-lens','refrain']);
  try{
    let physical=0;const original=flash.radiateLight.bind(flash);flash.radiateLight=options=>{physical++;return original(options);};
    flash.flame=0;const packet={kind:'sight',x:flash.player.x,y:flash.player.y};flash.collect(packet);flash.collect(packet);
    near(flash.flame,16*CARD_UNIT);assert.equal(physical,1);assert.equal(flash.cardRowTrace.passes,2); // whole Sparks: each firing rounds UP
  }finally{flash.destroy();}
});

test('Downbeat uses pre-impulse descent and previous accepted simulation Lift, excluding failed/free/Dream',()=>{
  const e=flight(['downbeat','prism-lens','refrain']);
  const lift=(at,vy=20)=>{e.time=at;e.player.vy=vy;const result=e.beginLiftInput();e.endLiftInput();return result;};
  try{
    e.flame=80;assert.ok(lift(0));assert.equal(e.cardRowTrace,null);
    assert.ok(lift(.74));assert.equal(e.cardRowTrace,null);
    e.flame=80;assert.ok(lift(1.49));near(e.flame,80-e.flapCost+6*CARD_UNIT); // whole Sparks: each firing rounds UP
    assert.equal(e.cardRowTrace.event.kind,CARD_ROW_EVENTS.lift);const sequence=e.cardRowSequence;
    assert.ok(lift(2.3,-2));assert.equal(e.cardRowSequence,sequence);
    e.artifactEffects.freeLift=true;assert.ok(lift(3.1));assert.equal(e.cardRowSequence,sequence);
    e.flame=0;assert.equal(lift(4),false);assert.equal(e.cardLastAcceptedLift,3.1);
    e.dream={phase:'recording',freeGlow:true};assert.ok(lift(5));assert.equal(e.cardRowSequence,sequence);
  }finally{e.destroy();}
});

test('Ring Spring repairs only genuine natural overfill, includes guard and clamps replayed seconds',()=>{
  const e=flight(['echo','ring-spring','refrain']);
  try{
    e.wisp.phase='guard-recovery';e.wisp.cooldownMax=40;e.wisp.cooldown=3.5;e.flame=e.maxFlame;
    e.collect({kind:'light',deliveredByWisp:true});near(e.wisp.cooldown,0);
    assert.equal(e.cardRowTrace.event.kind,CARD_ROW_EVENTS.overfill);near(e.cardRowTrace.recoverySeconds,3.5);
    e.wisp.cooldown=10;e.flame=0;e.collect({kind:'light'});near(e.wisp.cooldown,10);
    e.flame=e.maxFlame;e.collect({kind:'light',generated:true});near(e.wisp.cooldown,10);
    e.dream={phase:'recording'};e.collect({kind:'light'});near(e.wisp.cooldown,10);
  }finally{e.destroy();}
});

test('Watchlight reuses safe rescue once per flight, emits from relocated position and keeps native guard',()=>{
  const e=flight(['watchlight','watchlight','refrain']);
  try{
    const waves=[];const original=e.radiateLight.bind(e);e.radiateLight=options=>{waves.push({y:e.player.y,...options});return original(options);};
    e.player.y=e.height+20;e.hit(null);assert.equal(e.dying,false);assert.equal(e.cardWatchlightUsed,true);
    assert.equal(e.wisp.phase,'guard-recovery');near(e.wisp.cooldown,e.wisp.recoveryDuration(e)*4);
    assert.equal(waves.length,1);assert.ok(waves[0].y>=35&&waves[0].y<e.height-35);
    assert.equal(e.luminanceWaves.waves.length,1);
    assert.equal(e.event,'Watchlight · ring spent');
    const rescue=e.activationEvents.events.at(-1);
    assert.equal(rescue.source,'card-watchlight');assert.equal(rescue.label,'Watchlight');assert.equal(rescue.priority,10);
    assert.equal(activationPresentation(rescue).name,'Watchlight');assert.deepEqual(rescue.outcome,{saved:1});
    e.shield.protection=0;e.wisp.cooldown=0;e.wisp.phase='ready';e.player.y=e.height+20;e.hit(null);assert.equal(e.dying,true);
    assert.equal(waves.length,1);assert.equal(e.activationEvents.events.filter(event=>event.outcome.saved).length,1);
  }finally{e.destroy();}
  const native=flight(['watchlight'],{collectorGuard:true});
  try{
    native.player.y=-20;native.hit(null);assert.equal(native.cardWatchlightUsed,true);
    assert.equal(native.event,'Watchlight · ring spent');assert.equal(native.activationEvents.events.at(-1).source,'card-watchlight');
    native.shield.protection=0;native.wisp.cooldown=0;native.wisp.phase='ready';native.hit(null);assert.equal(native.dying,false);
    assert.equal(native.luminanceWaves.waves.length,1);
    assert.equal(native.event,'Last Orbit · ring spent');
    const rescue=native.activationEvents.events.at(-1);
    assert.equal(rescue.source,'collector-last-orbit');assert.equal(rescue.priority,10);
    assert.equal(activationPresentation(rescue).name,'Last Orbit');
    assert.deepEqual(native.activationEvents.events.filter(event=>event.outcome.saved).map(event=>event.source),['card-watchlight','collector-last-orbit']);
  }finally{native.destroy();}
  for(const phase of ['outbound','returning','cooldown']){
    const blocked=flight(['watchlight']);try{blocked.wisp.phase=phase;blocked.wisp.cooldown=1;blocked.hit(null);assert.equal(blocked.dying,true);}finally{blocked.destroy();}
  }
});

test('paused reorder changes next event only, preserving charge ledger, immutable receipt and pending earnings',()=>{
  const e=flight(['harvest-rare','prism-lens','refrain']);
  try{
    e.flame=0;cross(e);near(e.flame,6*CARD_UNIT);const trace=e.cardRowTrace; // whole Sparks: each firing rounds UP
    e.paused=true;const next=getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:cards(['prism-lens','harvest-rare','refrain'])});
    assert.ok(e.reconcileCardLoadout({modifiers:next,condensedGlow:0}));assert.equal(e.cardRowTrace,trace);
    e.paused=false;e.flame=0;cross(e);near(e.flame,4*CARD_UNIT);assert.equal(trace.sparks,6);
    assert.ok(e.cardRowSequence>trace.event.id);
  }finally{e.destroy();}
});

test('new Common never changes the established seeded starter pool',()=>{
  for(let seed=0;seed<40;seed++)assert.ok(getCardStarterOffers({seed}).every(c=>c.cardId!=='downbeat'));
});

test('every declarative catalog rule executes with its exact approved event and conditions',()=>{
  assert.equal(Object.values(SKILL_CARDS).filter(def=>!def.unreleased&&!def.engine&&def.kind!=='black-hole').length,86);
  const payer={
    'body-spark':'body-spark','wave-crossing':'harvest-common','flash-pickup':'flash-handling',
    'downbeat-lift':'downbeat','collector-delivery':'courier-tip','rhythm-phrase':'toll-bell',
    'field-swipe':'springboard','guard-rescue':'home-beacon','flight-clear':'growth-ring',
  };
  for(const def of Object.values(SKILL_CARDS).filter(d=>d.row&&!d.tallyEvent)){ // counting cards: tests/cards-batch-2.test.mjs
    const kind=def.row.event==='*'?CARD_ROW_EVENTS.body:def.row.event;
    const rows=[];
    if(['multiply','add-last-payout','multiply-future-capacity'].includes(def.row.operation)||def.row.minimumEarlierPayers||def.row.perCardLeft){
      const need=Math.max(1,def.row.minimumEarlierPayers||0,def.row.when?.exactlyEarlier||0,def.row.when?.endsShareTrigger?2:0);
      for(let i=0;i<need;i++)rows.push(payer[kind]);
    }
    rows.push(def.id);
    if(def.row.perEmptySlot)rows.push(null);
    const event={kind,carriedStored:100,availableRecovery:10,availableReel:10,collectorReeling:true,meterFraction:.2,pickupKind:def.row.when?.pickupKind||'light',
      firstCrossing:def.row.when?.firstCrossing??true,direction:def.row.when?.direction||'up',guardRecovering:true};
    const result=previewCardRow(cards(rows),event);
    assert.ok(result.steps.some(s=>s.actingCardId===def.id&&s.success),def.id);
    assert.ok(result.steps.length<=40,def.id);
  }
});

test('Echo II and III spend 2/3 true repeats before original, including finite exhaustion and replay',()=>{
  for(const [id,repeats]of [['echo-ii',2],['echo-iii',3]]){
    const runtime=createCardExecution(cards([id,'spark-cache','refrain']));runtime.cards[1].charges=5;
    const result=resolveCardRow(runtime,{kind:CARD_ROW_EVENTS.body});assert.equal(result.sparks,20);
    assert.equal(result.charges['1:spark-cache'],0);assert.equal(result.slotVisits,6);
    const first=result.steps.filter(s=>s.pass===1&&s.slot===0&&s.success);
    assert.deepEqual(first.map(s=>s.repeatIndex),Array.from({length:repeats},(_,i)=>i));
    assert.ok(result.steps.every(s=>s.sourceCardId!=='refrain'||!s.copiedBy));
  }
  const row=['echo-iii','tight-packing-iii','echo-iii','tight-packing-iii','tight-packing-iii'];
  const run={skillSystem:CARD_SYSTEM,cardSlots:5,mountedCards:cards(row),reserveCards:[]};
  assert.equal(getCardModifiers(run).cardPackingSources,36);assert.deepEqual(getCardPackingBonus(4,36),{amount:36,remainder:0});
  assert.match(getMountedCards(run)[0].copyPreview,/300%/);
  run.cardGrowUses=3;run.cardGrowCapacity=270;cleanCardRun(run);assert.equal(run.cardGrowCapacity,270);
  assert.equal(CARD_ECONOMY.maxGrowPerAction,90);
  const field=getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:cards(['echo-iii','field-impulse','echo-iii','field-impulse','field-impulse'])});
  assert.equal(field.cardFieldSources,9);assert.equal(field.cardFieldMultiplier,9,'nine duration sources preserve native force');
});

test('catalog meter, pickup kind and first/later crossing conditions use native event entry state',()=>{
  const low=flight(['low-wick','dusk-wick','cluster-heart']);
  try{
    low.flame=0;low.collect({kind:'dusk'});near(low.flame,Math.min(low.maxFlame,25*CARD_UNIT));
    low.flame=34;low.collect({kind:'cluster'});near(low.flame,34+40+6*CARD_UNIT);
    low.flame=0;low.collect({kind:'light',generated:true});assert.equal(low.cardRowTrace.sparks,6,'generated did not issue a new row');
  }finally{low.destroy();}
  const waves=flight(['first-ripple','far-shore','ripple-glass']);
  try{
    waves.flame=0;cross(waves,[90,100].map(x=>({kind:'light',x:waves.player.x+x,y:waves.player.y})));
    near(waves.flame,(4+10)*CARD_UNIT);assert.equal(waves.cardRowTrace.event.firstCrossing,false);
    assert.equal(waves.layout.embers.filter(p=>p.collected).length,0);
  }finally{waves.destroy();}
  const courier=flight(['courier-tip','courier-glass','return-spring']);
  try{
    courier.flame=0;courier.wisp.cooldown=5;courier.collect({kind:'light',deliveredByWisp:true});
    near(courier.flame,20+4*CARD_UNIT);near(courier.wisp.cooldown,5,'Return Spring acts at attachment, never after delivery');
    assert.equal(courier.cardRowTrace.event.kind,CARD_ROW_EVENTS.delivery);
    courier.flame=0;courier.collect({kind:'light'});near(courier.flame,20);
  }finally{courier.destroy();}
});

test('Rhythm, directional Field and guard rewards pay from actual physical success, with binary waves',()=>{
  const rhythm=flight(['rhythm','toll-bell','pacesetter']);let now=0;rhythm.fourthBeatNow=()=>now;
  try{
    rhythm.wisp.cooldown=8;rhythm.flame=70;
    for(const at of [0,.6,1.2]){now=at;rhythm.time=at;assert.ok(rhythm.beginLiftInput());rhythm.endLiftInput();}
    near(rhythm.flame,70-3*rhythm.flapCost+2*CARD_UNIT);near(rhythm.wisp.cooldown,5);
    assert.equal(rhythm.cardRowTrace.event.kind,CARD_ROW_EVENTS.rhythm);assert.equal(rhythm.luminanceWaves.waves.length,1);
  }finally{rhythm.destroy();}
  const field=flight(['field-impulse','springboard','tailwind','wave-loom','refrain'],{collectorFieldImpulse:true});
  try{
    field.flame=0;assert.ok(field.activateFieldImpulse('right'));near(field.flame,0);
    // Wave Loom no longer answers a swipe: it came back as an engine card (one light Pulse per Turn).
    assert.equal(field.luminanceWaves.waves.length,0);assert.equal(field.cardRowTrace,null);
    const sequence=field.cardRowSequence;assert.equal(field.activateFieldImpulse('up'),false);assert.equal(field.cardRowSequence,sequence);
  }finally{field.destroy();}
  const guard=flight(['watchlight','home-beacon','last-light','prism-lens','refrain']);
  try{
    guard.flame=0;guard.player.y=-20;guard.hit(null);assert.equal(guard.dying,false);
    assert.equal(guard.cardRowTrace.sparks,46);assert.equal(guard.cardRowTrace.event.meterFraction,0); // whole Sparks: each firing rounds UP
    assert.equal(guard.flame,guard.maxFlame);assert.equal(guard.luminanceWaves.waves.length,1);
  }finally{guard.destroy();}
});

test('Spillway changes the next natural overfill only and strongest duplicate emits once',()=>{
  const e=flight(['spillway','spillway-ii','refrain']);e.options.cardPilot=true;
  try{
    assert.equal(e.luminanceWaves.waves.length,0);e.flame=e.maxFlame;e.collect({kind:'light'});
    assert.equal(e.luminanceWaves.waves.length,1);assert.equal(e.overfillWave.every,1);
    e.collect({kind:'light',generated:true});assert.equal(e.luminanceWaves.waves.length,1);
    e.paused=true;const mods=getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:cards(['spillway',null,null])});
    assert.ok(e.reconcileCardLoadout({modifiers:mods,condensedGlow:0}));assert.equal(e.luminanceWaves.waves.length,1);
    e.paused=false;e.collect({kind:'light'});assert.equal(e.luminanceWaves.waves.length,1);
    e.collect({kind:'light'});assert.equal(e.luminanceWaves.waves.length,2);assert.equal(e.overfillWave.every,2);
  }finally{e.destroy();}
});

test('meta rules use pass-local earlier payers, last additive payout, rightmost slot and replay scalar',()=>{
  const event={kind:CARD_ROW_EVENTS.body};
  assert.equal(previewCardRow(cards(['kindling-bead','body-spark','kindling-bead-iii']),event).sparks,6);
  assert.equal(previewCardRow(cards(['body-spark','prism-lens','mirror-grain']),event).sparks,5,'2.5 + 2 = 4.5 rounds up');
  assert.equal(previewCardRow(cards(['body-spark','closing-chord',null,null,null]),event).sparks,5,'Closing Chord ×2.5 (ladder 2026-11-17)');
  assert.equal(previewCardRow(cards(['body-spark','closing-chord','lift-guide']),event).sparks,2);
  assert.equal(previewCardRow(cards(['body-spark','second-sun','refrain']),event).sparks,10,'Second Sun ×2, ×3 in the Encore (ladder 2026-11-17)');
});

test('Always round up (owner, 2026-11-17): fractions round up, integers stay, zero stays zero, Stored Sparks are not boosted',()=>{
  const body={kind:CARD_ROW_EVENTS.body},wave={kind:CARD_ROW_EVENTS.wave,firstCrossing:true};
  assert.equal(previewCardRow(cards(['body-spark']),body).sparks,2);
  assert.equal(previewCardRow(cards(['body-spark','prism-lens']),body).sparks,3,'Prism Lens x1.25 on +2 = 2.5 rounds up to 3');
  assert.equal(previewCardRow(cards(['body-spark','crescendo']),body).sparks,4,'an exact whole number stays exact');
  assert.equal(previewCardRow(cards(['prism-lens','body-spark']),body).sparks,2,'a Boost left of the card does nothing');
  assert.equal(previewCardRow(cards(['prism-lens',null]),body).sparks,0,'zero stays zero');
  assert.equal(previewCardRow(cards(['prism-lens','prism-lens']),body).sparks,0,'Boosts alone stay zero');
  const plain=previewCardRow(cards(['harvest-legendary']),wave),boosted=previewCardRow(cards(['harvest-legendary','prism-lens']),wave);
  assert.ok(plain.stored>0);assert.equal(boosted.stored,plain.stored,'Boosts never multiply Stored Sparks');
  assert.equal(boosted.sparks,3);
});
