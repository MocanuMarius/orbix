import test from 'node:test';import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {activePassageBoons,activeEventFavors,spendPreparationClear} from '../dist/passage-preparations.mjs';
import {writeTemporary,temporaryEntries} from '../dist/temporary-inscriptions.mjs';
import {getRouteBonus,awardRouteBonus} from '../dist/route-bonuses.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';
import {FlightBoon} from '../dist/flight-boons.mjs';
// Lasting preparations live on the Chain as temporary Inscriptions (docs/inscriptions.md). These runs are plain map runs given a three-slot Chain.
const setup=()=>{const s=M.newState();s.run=M.createRun(s.profile,'lasting-prep');s.run.mountedCards=[null,null,null];return s;};
const left=(r,id)=>temporaryEntries(r).find(e=>e.id===id)?.flightsLeft;
test('earned preparations survive failed attempts, expire after three clears, and refresh without stacking',()=>{
 const s=setup(),r=s.run;writeTemporary(r,0,'glidepath');writeTemporary(r,1,'hollow-feather');
 M.selectNode(r,M.getChoices(r)[0].id);M.beginFlightAttempt(r);M.markFlightAttemptStarted(r);
 assert.deepEqual(r.attemptEntry.flightBoons,['long-glide']);assert.deepEqual(r.attemptEntry.eventFavors,['feather']);
 assert.ok(M.finishFlight(r,{success:false}));assert.equal(left(r,'glidepath'),3);assert.equal(left(r,'hollow-feather'),3);
 M.selectNode(r,M.getChoices(r)[0].id);M.beginFlightAttempt(r);M.markFlightAttemptStarted(r);
 assert.ok(M.finishFlight(r,{success:true,flame:60}));assert.equal(left(r,'glidepath'),2);assert.equal(left(r,'hollow-feather'),2);
 assert.equal(M.finishFlight(r,{success:true}),false);assert.equal(left(r,'hollow-feather'),2);
 const entry={flightBoons:['long-glide'],eventFavors:['feather']};spendPreparationClear(r,entry);assert.equal(left(r,'hollow-feather'),1);
 spendPreparationClear(r,entry);assert.deepEqual(activePassageBoons(r),[]);assert.deepEqual(activeEventFavors(r),[]);
 assert.deepEqual(r.slotInscriptions,[null,null,null],'spent ones leave the slots bare');
 writeTemporary(r,0,'glidepath');writeTemporary(r,2,'glidepath');assert.equal(left(r,'glidepath'),3);
 assert.deepEqual(temporaryEntries(r).map(e=>e.slot),[2],'earning it again moves it and refreshes the count; it never stacks');
});
test('simultaneous preparations combine distinct effects and use the stronger recovery multiplier',()=>{
 const e={mod:{flightBoons:['long-glide','wild-circuit','night-sail'],eventFavors:['haste']},time:0};
 const b=new FlightBoon(e,null);assert.equal(b.lifts,3);assert.equal(b.drainScale,.75);assert.equal(b.recoveryRate,1.25);
 e.dream={mode:'record'};assert.equal(b.liftSaving(10),0);assert.equal(b.drainScale,1);assert.equal(b.recoveryRate,1);
});

test('Spark Trail restores missing fuel once while awake and shares the stronger Reserve Wick trigger',()=>{
 for(const favors of [[],['wick']]){
  const events=[],e={mod:{flightBoons:['spark-trail'],eventFavors:favors},flame:5/.3,maxFlame:100,flameRestored:0,setEvent:s=>events.push(s)};
  const b=new FlightBoon(e,null);
  e.dream={mode:'record'};assert.equal(b.tryReserve(),0);
  e.dream=null;e.flame=6/.3;assert.equal(b.tryReserve(),0);
  e.flame=5/.3;
  const amount=(favors.length?9:6)/.3;
  assert.equal(b.tryReserve(),amount);assert.equal(e.flameRestored,amount);
  assert.match(events[0],favors.length?/Reserve Wick/:/\+6 Sparks/);
  e.flame=0;assert.equal(b.tryReserve(),0);assert.equal(events.length,1);
  assert.equal(e.condensedGlow,undefined);
 }
 const e={mod:{flightBoons:['spark-trail']},flame:4/.3,maxFlame:8/.3,flameRestored:0};
 assert.equal(new FlightBoon(e,null).tryReserve(),4/.3);
});
test('Fallen Giant offers permanent Heartwood capacity and cannot grant it twice in the run',()=>{
 const{run:r}=setup();r.testMode=true;
 const n=M.getChoices(r)[0];n.levelId='pinewood-fallen-giant';
 const b=getRouteBonus(r,n);n.bonusId=b.id;assert.match(b.reward,/\+3 maximum Sparks permanently/);
 const result={success:true,routeBonus:{id:b.id,eligible:true,complete:true,target:b.target,progress:b.target,failed:false,packed:0}};
 const before=getGlowCapacity(r),attempt={nodeId:n.id,bonusId:b.id};
 const receipt=awardRouteBonus(r,n,attempt,result,20,0,false);assert.match(receipt.message,/\+3 maximum Sparks permanently/);assert.doesNotMatch(receipt.message,/Heartwood/);assert.equal(getGlowCapacity(r),before+10);
 assert.equal(awardRouteBonus(r,n,attempt,result,20,0,false),null);assert.equal(getGlowCapacity(r),before+10);
});
