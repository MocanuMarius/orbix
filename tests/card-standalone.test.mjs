import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight,FLIGHT_TUNING} from '../dist/flight.mjs';
import {CARD_SYSTEM,CARD_UNIT,makeSkillCard,getCardModifiers,getMountedCards} from '../dist/skill-cards.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {getProximityClearance} from '../dist/edging-pulse.mjs';
import {updatePrismWick} from '../dist/card-standalone.mjs';
import {activationPresentation} from '../dist/activation-feedback.mjs';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const build=ids=>({skillSystem:CARD_SYSTEM,companions:['collector'],skills:{},mountedCards:ids.map((id,i)=>id?makeSkillCard(id,`standalone:${i}`):null)});
function flight(ids,options={}) {
  const e=new WispFlight({preflight:true,seed:'standalone-common-test',
    canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
    modifiers:getCardModifiers(build(ids)),...options});
  e.running=true;e.render=()=>{};e.notify=()=>{};e.layout.obstacles=[];e.layout.embers=[];
  return e;
}
const expire=e=>{e.time=e.sightUntil;updatePrismWick(e);};

test('Dusk Wick pays 20/30/40 only for an actual direct Dusk, with its native light cost retained',()=>{
  for (const [id,amount] of [['dusk-wick',20],['dusk-wick-ii',30],['dusk-wick-iii',40]]) {
    const e=flight([id],{modifiers:{...getCardModifiers(build([id])),maxGlow:250}});
    try {
      e.flame=0;e.collect({kind:'dusk'});near(e.flame,40+amount*CARD_UNIT);
      assert.equal(e.lightPenalties.length,1);
      e.flame=0;e.collect({kind:'light',collectorOriginalKind:'dusk'});near(e.flame,20);
      e.flame=0;e.collect({kind:'dusk',generated:true});assert.equal(e.cardRowTrace.event.pickupKind,'dusk');
      near(e.flame,2*CARD_UNIT);
      e.dream={phase:'recording',active:true};e.flame=0;e.collect({kind:'dusk'});near(e.flame,40);
    } finally {e.destroy();}
  }
});

test('Springboard directly bounces at half Lift strength without cost, manual Lift counters or copy effects',()=>{
  const e=flight(['springboard','springboard','rhythm','tailwind']);
  try {
    e.player.vy=90;e.flame=0;e.collect({kind:'light'});
    near(e.player.vy,-FLIGHT_TUNING.flapImpulse*.5*e.scaleY);near(e.flame,20);
    assert.equal(e.flaps,0);assert.equal(e.effortSpent,0);assert.equal(e.cardRhythm.state.count,0);
    assert.equal(e.activationEvents.events.filter(event=>event.source==='card-springboard').length,1);
    for (const packet of [{kind:'light',deliveredByWisp:true},{kind:'light',generated:true},{kind:'sight'},{kind:'dark'}]) {
      e.player.vy=90;e.collect(packet);near(e.player.vy,90);
    }
    e.player.vy=-10;e.collect({kind:'light'});near(e.player.vy,-10);
    e.player.vy=90;e.dream={phase:'recording',active:true};e.collect({kind:'light'});near(e.player.vy,90);
    assert.match(getMountedCards(build(['echo','springboard']))[0].copyPreview,/Cannot repeat/);
  } finally {e.destroy();}
});

test('Common Proximity works at normal terrain reach without Collector and Rare Edge Reach enhances it',()=>{
  const common=build(['slip-feather']);common.companions=['protector'];
  const mod=M.getRunModifiers(common);assert.equal(mod.proximityUnlocked,true);assert.equal(getProximityClearance(mod),48);
  assert.equal(getEquippedCardStatuses(common)[0].state,'ready');
  assert.equal(getProximityClearance(M.getRunModifiers(build(['slip-feather','edge-reach']))),72);
  assert.match(getMountedCards(build(['echo','slip-feather']))[0].copyPreview,/no action/);
  const e=flight([],{modifiers:mod,companions:['protector']});
  try {
    e.player.x=180;e.player.y=220;
    const wall={x:0,width:500,phase:0,motion:0,center:220+e.player.radius+40,gap:0,bottomShape:[[0,0],[500,0],[500,200],[0,200]],sceneProps:[]};
    e.edgingPulse.update(2,[wall]);assert.equal(e.edgingPulse.triggerCount,1);
    assert.equal(e.luminanceWaves.waves.length,1);
  } finally {e.destroy();}
});

test('Prism Wick spends its three shared uses at Flash expiry and sends only one final physical wave',()=>{
  const e=flight(['echo-iii','diving-bell','refrain']);
  try {
    e.flame=0;e.collect({kind:'sight'});assert.equal(e.getCardChargeLedger()['standalone:1'],3);
    e.luminanceWaves.clear();const count=e.luminanceWaves.serial;
    e.time=e.sightUntil-.01;updatePrismWick(e);assert.equal(e.luminanceWaves.serial,count);
    expire(e);near(e.flame,9*CARD_UNIT);assert.equal(e.getCardChargeLedger()['standalone:1'],0);
    assert.equal(e.luminanceWaves.serial,count+1);assert.equal(e.cardRowTrace.event.kind,'flash-expiry');
    updatePrismWick(e);assert.equal(e.luminanceWaves.serial,count+1);
    e.collect({kind:'sight'});expire(e);assert.equal(e.luminanceWaves.serial,count+1);
  } finally {e.destroy();}
  for (const packet of [{kind:'sight',generated:true},{kind:'sight',fetchedInDream:true}]) {
    const e=flight(['diving-bell']);
    try {e.collect(packet);e.luminanceWaves.clear();expire(e);assert.equal(e.getCardChargeLedger()['standalone:0'],3);assert.equal(e.luminanceWaves.waves.length,0);}
    finally {e.destroy();}
  }
  const refreshed=flight(['diving-bell']);
  try {
    refreshed.collect({kind:'sight'});const first=refreshed.sightUntil;
    refreshed.time=2;refreshed.collect({kind:'sight'});refreshed.time=first;updatePrismWick(refreshed);
    assert.equal(refreshed.getCardChargeLedger()['standalone:0'],3);
    expire(refreshed);assert.equal(refreshed.getCardChargeLedger()['standalone:0'],2);
  } finally {refreshed.destroy();}
  const timed=flight(['diving-bell']);
  try {
    timed.collect({kind:'sight'});timed.time=timed.sightUntil-.005;timed.luminanceWaves.clear();
    timed.step(.01);assert.equal(timed.getCardChargeLedger()['standalone:0'],2);
    assert.equal(timed.cardFlashExpiryPending,false);assert.equal(timed.cardRowTrace.event.kind,'flash-expiry');
  } finally {timed.destroy();}
});

test('Heart Stitch counts only direct fuel while hurt, uses only successful heals, and resets each flight',()=>{
  const e=flight(['tailwind'],{lives:1,maxLives:3});
  try {
    for(const packet of [{kind:'light'},{kind:'cluster'}])e.collect(packet);
    assert.equal(e.lives,1);assert.equal(e.cardHeartProgress['standalone:0'],2);
    for(const packet of [{kind:'light',deliveredByWisp:true},{kind:'light',generated:true},{kind:'sight'}])e.collect(packet);
    assert.equal(e.cardHeartProgress['standalone:0'],2);
    e.dream={phase:'recording',active:true};e.collect({kind:'light'});e.dream=null;
    e.collect({kind:'dusk'});assert.equal(e.lives,2);assert.equal(e.getCardChargeLedger()['standalone:0'],1);
    const cue=e.activationEvents.events.find(event=>event.source==='card-heart-stitch');
    assert.match(activationPresentation(cue).outcome,/\+1.*life-heart/);
    for(let i=0;i<3;i++)e.collect({kind:'light'});
    assert.equal(e.lives,3);assert.equal(e.cardHeartsRestored,2);assert.equal(e.getCardChargeLedger()['standalone:0'],0);
  } finally {e.destroy();}
  const full=flight(['tailwind']);
  try {for(let i=0;i<6;i++)full.collect({kind:'light'});assert.equal(full.getCardChargeLedger()['standalone:0'],2);assert.equal(full.cardHeartProgress['standalone:0'],0);}
  finally {full.destroy();}
  const next=flight(['tailwind'],{lives:1});assert.deepEqual(next.cardHeartProgress,{});next.destroy();
});

test('Heart Stitch restored hearts and spent uses survive clears and failed attempts without double healing',()=>{
  for(const success of [true,false])for(const livePersisted of [true,false]) {
    const state=M.newState();state.profile.tutorialComplete=true;
    const run=M.createRun(state.profile,`stitch-${success}-${livePersisted}`,1,{cards:true});
    run.lives=1;run.mountedCards=[makeSkillCard('tailwind','healer')];
    const node=M.getChoices(run).find(node=>node.type!=='support');assert.ok(M.selectNode(run,node.id));
    assert.ok(M.beginFlightAttempt(run));assert.ok(M.markFlightAttemptStarted(run));
    if(livePersisted)run.lives=2;
    assert.ok(M.finishFlight(run,{success,flame:55,cardCharges:{healer:1},cardHeartsRestored:1}));
    assert.equal(run.lives,success?2:1);assert.equal(run.mountedCards[0].charges,1);
  }
});

test('Devourer Deck preview names its actual adjacent Rare and explains sparing it at full hearts',()=>{
  const run=build(['devourer','edge-reach']);
  assert.match(getMountedCards(run)[0].effectiveSummary,/consume Edge Reach in slot 2/);
  assert.match(getMountedCards(run)[0].effectiveSummary,/full hearts it is spared/);
  assert.equal(getEquippedCardStatuses(run)[0].state,'ready');
  run.mountedCards=[makeSkillCard('devourer','d'),makeSkillCard('body-spark','c')];
  assert.equal(getEquippedCardStatuses(run)[0].label,'Needs Rare to right');
  assert.match(getMountedCards(run)[0].effectiveSummary,/No Rare target/);
});
