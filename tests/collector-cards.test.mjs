import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import * as M from '../dist/model.mjs';
import {CARD_SYSTEM,makeSkillCard,getCardModifiers,cleanCardRun} from '../dist/skill-cards.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {sparkBodyRadius} from '../dist/spark-size.mjs';

globalThis.requestAnimationFrame=()=>null;globalThis.cancelAnimationFrame=()=>{};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const cards=ids=>ids.map((id,i)=>makeSkillCard(id,`collector-card:${i}`));
function flight(ids=[],extra={}){
 const e=new WispFlight({preflight:true,seed:'collector-cards',companions:['collector'],
  modifiers:{...getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:cards(ids)}),wispCooldown:.4,...extra.modifiers},...extra,
  canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})}});
 e.running=true;e.render=()=>{};e.renderScheduledFrame=()=>{};e.notify=()=>{};
 e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];e.biomeDynamics.items=[];e.blackHoles.items=[];return e;
}
function packet(e,distance,extra={}){
 const p={id:`missed:${e.layout.embers.length}`,kind:'light',y:e.player.y,...extra};
 p.x=e.distance+e.player.x-distance-sparkBodyRadius(p,e.height);e.layout.embers.push(p);e._nearbyPacketsUntil=-1;return p;
}
function tick(e,dt=1/120){e.time+=dt;e.previousDistance=e.distance;e.syncCollectors(true);for(const w of e.collectors)w.update(e,dt);}
function until(e,predicate){for(let i=0;i<2400&&!predicate();i++)tick(e);assert.ok(predicate(),'Collector transition completed');}
const charge=(e,slot)=>e.getCardChargeLedger()[`collector-card:${slot}`];

test('Twin Orbit renders two independent Collectors and each pickup has exactly one owner',()=>{
 const e=flight(['twin-orbit','twin-orbit','fast-spool']);try{
  assert.equal(e.collectors.length,2);tick(e);
  const views=e.getCompanionStates();assert.equal(views.length,2);assert.notEqual(views[0].x,views[1].x);
  const p=packet(e,38),q=packet(e,42,{y:e.player.y+10});tick(e);
  assert.notEqual(e.collectors[0].target,e.collectors[1].target);assert.equal(e.collectors.filter(w=>w.target===p).length,1);
  assert.ok(p.attracted&&q.attracted);until(e,()=>e.collectors.every(w=>w.cargo));
  e.collectors[0].cooldown=1;e.collectors[1].cooldown=3.5;
  e.collect({kind:'light'});near(e.collectors[0].cooldown,1);near(e.collectors[1].cooldown,.5);assert.equal(charge(e,2),2);
  until(e,()=>q.collected&&p.collected);assert.equal(e.collectorPickups,2);
  for(let i=0;i<30;i++)tick(e);assert.equal(e.collectorPickups,2);
 }finally{e.destroy();}
});

test('removing Twin Orbit releases only the secondary load; its guard never duplicates',()=>{
 const e=flight(['twin-orbit'],{modifiers:{...getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:cards(['twin-orbit'])}),collectorGuard:true}});try{
  assert.ok(e.wisp.canGuard(e));assert.equal(e.collectors[1].canGuard(e),false);
  const p=packet(e,38);tick(e);until(e,()=>!!e.wisp.cargo);
  const q=packet(e,42);tick(e);until(e,()=>!!e.collectors[1].cargo);
  e.paused=true;assert.ok(e.reconcileCardLoadout({modifiers:getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:[]}),condensedGlow:0}));
  assert.equal(e.collectors.length,1);assert.equal(e.wisp.cargo,p);assert.equal(q.carried,false);assert.equal(q.attracted,false);
  e.paused=false;e.beginDying();assert.equal(p.carried,false);assert.equal(e.wisp.cargo,null);
 }finally{e.destroy();}
});

test('Twin Wick unlocks once in real flight and persists through loadout changes and save/reload',()=>{
 const e=flight(['twin-wick']);try{
  assert.equal(charge(e,0),1);assert.equal(e.cardTwinWickUnlocked,false);e.syncCollectors(true);
  assert.equal(charge(e,0),0);assert.equal(e.cardTwinWickUnlocked,true);
  const run={skillSystem:CARD_SYSTEM,cardSlots:3,mountedCards:cards(['twin-wick']),reserveCards:[],cardTwinWickUnlocked:e.getState().cardTwinWickUnlocked};
  M.commitCardCharges(run,e.getCardChargeLedger());assert.equal(run.mountedCards[0],null);
  cleanCardRun(run);const loaded=JSON.parse(JSON.stringify(run));cleanCardRun(loaded);
  assert.equal(getCardModifiers(loaded).cardTwinWickUnlocked,true);
  e.paused=true;assert.ok(e.reconcileCardLoadout({modifiers:getCardModifiers(loaded),condensedGlow:0}));assert.equal(e.collectors.length,2);
  const next=flight([],{modifiers:getCardModifiers(loaded)});try{assert.equal(next.collectors.length,2);}finally{next.destroy();}
  const fresh=M.createRun(M.newState().profile,'fresh-after-wick',1,{cards:true});assert.equal(!!getCardModifiers(fresh).cardTwinWickUnlocked,false);
 }finally{e.destroy();}
});

test('Wick preserves redundant uses and never spends during pause, preview, practice or Dream',()=>{
 const redundant=flight(['twin-orbit','twin-wick']);try{
  redundant.syncCollectors(true);assert.equal(charge(redundant,1),1);assert.equal(redundant.cardTwinWickUnlocked,false);
 }finally{redundant.destroy();}
 for(const mode of ['paused','preview','practice','dream','preflight']){
  const e=flight(['twin-wick'],{[mode]:true});try{
   if(mode==='paused')e.paused=true;if(mode==='dream')e.dream={phase:'recording'};if(mode==='preflight')e.running=false;
   e.syncCollectors(true);assert.equal(charge(e,0),1,mode);assert.equal(e.cardTwinWickUnlocked,false,mode);
  }finally{e.destroy();}
 }
});

test('the real finish, pause and retry save paths retain a spent Wick unlock without restoring the card',()=>{
 const state=M.newState();state.profile.tutorialComplete=true;state.run=M.createRun(state.profile,'wick-attempt-save',1,{cards:true});
 const run=state.run;run.mountedCards[0]=makeSkillCard('twin-wick','actual-wick');
 const node=M.getChoices(run).find(n=>n.type!=='support');assert.ok(M.selectNode(run,node.id));assert.ok(M.beginFlightAttempt(run));assert.ok(M.markFlightAttemptStarted(run));
 const e=flight([],{seed:`${run.seed}-${node.id}`,modifiers:M.getRunModifiers(run)});try{
  e.syncCollectors(true);assert.equal(e.getCardChargeLedger()['actual-wick'],0);e.paused=true;
  assert.ok(M.syncCardFlightForEdit(run,e));assert.equal(run.cardTwinWickUnlocked,true);assert.equal(run.mountedCards[0],null);
  let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};assert.ok(M.saveState(state,storage));
  const loaded=M.loadState(storage);assert.equal(loaded.run.cardTwinWickUnlocked,true);assert.equal(loaded.run.mountedCards[0],null);
  e.paused=false;let result;e.onFinish=value=>{result=value;};e.finish(false);assert.ok(result);
  assert.ok(M.finishFlight(run,result));assert.equal(run.cardTwinWickUnlocked,true);assert.equal(run.mountedCards[0],null);
  assert.ok(M.selectNode(run,node.id));assert.ok(M.beginFlightAttempt(run));assert.equal(M.getRunModifiers(run).cardTwinWickUnlocked,true);
 }finally{e.destroy();}
});

test('Long Spool and Cast Line spend the shortest sufficient extension only on real extra attachment',()=>{
 const e=flight(['cast-line','long-spool']);try{
  packet(e,40);tick(e);assert.equal(charge(e,0),2);assert.equal(charge(e,1),5);
  until(e,()=>!!e.wisp.cargo);assert.equal(charge(e,0),2);assert.equal(charge(e,1),5);until(e,()=>!e.wisp.cargo);
  const short=packet(e,65);tick(e);assert.equal(e.wisp.target,short);assert.equal(e.wisp.targetExtension.instanceId,'collector-card:1');assert.equal(charge(e,1),5);
  until(e,()=>!!e.wisp.cargo);assert.equal(charge(e,1),4);assert.equal(charge(e,0),2);until(e,()=>short.collected);
  const long=packet(e,90);tick(e);assert.equal(e.wisp.target,long);until(e,()=>!!e.wisp.cargo);assert.equal(charge(e,0),1);assert.equal(charge(e,1),4);
 }finally{e.destroy();}
});

test('failed trips preserve uses, type eligibility and the player body window remain intact',()=>{
 const e=flight(['long-spool','cast-line']);try{
  const front=packet(e,-10),cache=packet(e,70,{kind:'cache'}),flash=packet(e,75,{kind:'sight'}),harmful=packet(e,72,{kind:'dark'});tick(e);
  assert.equal(e.wisp.target,null);assert.ok([front,cache,flash,harmful].every(p=>!p.attracted));
  const p=packet(e,65);tick(e);assert.equal(e.wisp.target,p);p.collected=true;tick(e);
  assert.equal(charge(e,0),5);assert.equal(charge(e,1),2);assert.equal(p.carried,undefined);
 }finally{e.destroy();}
});

test('two outbound Collectors cannot overbook the last shared range use',()=>{
 const e=flight(['twin-orbit','chameleon','cast-line']);try{
  e.cardExecution.cards[2].charges=1;const p=packet(e,90),q=packet(e,95);tick(e);
  assert.equal(e.collectors.filter(w=>!!w.target).length,1);assert.equal(charge(e,2),1);
  until(e,()=>e.collectors.some(w=>w.cargo));assert.equal(charge(e,2),0);assert.equal(e.collectors.filter(w=>!!w.cargo).length,1);
  assert.equal([p,q].filter(p=>p.attracted).length,1);
 }finally{e.destroy();}
});

test('Collector card status explains missing Collector and the shared maximum',()=>{
 const run={skillSystem:CARD_SYSTEM,companions:['protector'],mountedCards:cards(['twin-orbit','twin-wick','long-spool'])};
 assert.deepEqual(getEquippedCardStatuses(run).map(s=>s.state),['blocked','blocked','blocked']);
 run.companions=['collector'];assert.equal(getEquippedCardStatuses(run)[1].state,'shared');
 run.cardTwinWickUnlocked=true;assert.equal(getEquippedCardStatuses(run)[0].state,'shared');
});
