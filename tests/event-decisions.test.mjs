import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceMap, beginFlightAttempt, buyCheckpointSkill, createRun, finishFlight, getChoices,
  getRunModifiers, getSupportChoices, loadState, markFlightAttemptStarted, newState,
  grantGlowPickup, previewGlowReward, resolveSupport, saveState, selectNode, settleCheckpoint, suspendRun
} from '../dist/model.mjs';
import {EVENT_SCENARIOS, getEventScenarios} from '../dist/map-guide.mjs';
import {getRouteForecast} from '../dist/route-forecast.mjs';
import {getGlowCapacity, getLifeCapacity, glowPoints} from '../dist/vitality.mjs';
import {WispFlight} from '../dist/flight.mjs';

// Search generated maps. Keep a legal prefix, including the no-back-to-back-elite rule.
function pathTo(run, target) {
  const byId = new Map(run.map.flat().map(n => [n.id, n]));
  function walk(node, previousElite, path) {
    if (previousElite && node.elite) return;
    if (node.id === target.id) return path;
    if (node.row >= target.row) return;
    for (const id of node.nextIds) {
      const found = walk(byId.get(id), node.type === 'support' ? previousElite : node.elite, [...path, node.id]);
      if (found) return found;
    }
  }
  for (const node of getChoices(run)) {
    const found = walk(node, false, []);
    if (found) return found;
  }
}

const sites = {ordinary: new Map(), late: new Map()};
for (let seed = 0; seed < 200 && (sites.ordinary.size < 12 || sites.late.size < 12); seed++) {
  const state = newState(), run = state.run = createRun(state.profile, 'events' + seed);
  for (let map = 0; map < 3; map++) {
    if (map !== 1) {
      const group = map === 2 ? sites.late : sites.ordinary;
      for (const node of run.map.flat().filter(n => n.kind === 'event' && !group.has(n.eventIndex))) {
        const path = pathTo(run,node);
        if (!path) continue;
        const copy = structuredClone(run);
        copy.step = node.row;
        copy.path = path;
        if (!selectNode(copy,node.id)) continue;
        if (map === 2 && getRouteForecast(copy,copy.current).restReachable) continue;
        group.set(node.eventIndex,copy);
      }
    }
    if (map < 2) {
      run.phase = 'map-clear';
      assert.ok(advanceMap(run));
    }
  }
}
function visit(index, {late=false, low=false, hurt=false}={}) {
  const fixture = (late ? sites.late : sites.ordinary).get(index);
  assert.ok(fixture, EVENT_SCENARIOS[index].name);
  const state = newState(), run = state.run = structuredClone(fixture);
  run.flame = low ? 10 : getGlowCapacity(run); // Three displayed Energy.
  run.lives = getLifeCapacity(run) - Number(hurt);
  return state;
}
function claim(state,id) {
  const run=state.run, offers=getSupportChoices(run,state.profile);
  const index=offers.findIndex(c=>c.id===id);
  assert.notEqual(index,-1,id);
  assert.ok(resolveSupport(run,index,state.profile),id);
  settleCheckpoint(state);
  return offers[index];
}
function resourceState(run,late=false) {
  return {
    energy:run.flame, lives:run.lives, wallet:late?null:run.condensedGlow,
    skills:run.skills, favors:run.eventFavors||[], vow:run.pilgrimVow||null,
    preparation:run.routePreparation?.nodeId||null
  };
}
function reload(state) {
  let saved;
  const storage={setItem:(_,v)=>{saved=v;},getItem:()=>saved};
  assert.ok(saveState(state,storage));
  return loadState(storage);
}

test('across 400 campaigns Cairns always give a real fork, every map gets a flight decision, and repeated seeds deal the same sites',()=>{
  const all=new Set(),straightEvents=new Set(),forkRecipes=new Set();
  for(let seed=0;seed<400;seed++){
    const profile=newState().profile;
    const run=createRun(profile,'events'+seed);
    const replay=seed<8?createRun(profile,'events'+seed):null;
    for(let map=0;map<3;map++){
      if(replay)assert.deepEqual(run.map,replay.map);
      const nodes=run.map.flat(), byId=new Map(nodes.map(n=>[n.id,n]));
      const events=nodes.filter(n=>n.kind==='event');
      const ids=events.map(n=>n.eventIndex);
      assert.equal(new Set(ids).size,events.length);
      ids.forEach(id=>all.add(id));
      const forks=events.filter(n=>{
        const mayArriveFromElite=nodes.some(prev=>prev.elite&&prev.nextIds.includes(n.id));
        return n.nextIds.map(id=>byId.get(id)).filter(next=>next.type!=='support'&&(!next.elite||!mayArriveFromElite)).length>=2;
      });
      const marked=events.filter(n=>n.eventIndex===4);
      assert.equal(marked.length,Number(forks.length>0));
      if(marked.length){
        assert.ok(forks.includes(marked[0]));
        forkRecipes.add(marked[0].recipeId);
      }else{
        const preparations=ids.filter(id=>[2,3,7,9,11].includes(id));
        assert.ok(preparations.length);
        preparations.forEach(id=>straightEvents.add(id));
      }
      if(map<2)for(const r of [run,replay].filter(Boolean)){r.phase='map-clear';assert.ok(advanceMap(r));}
    }
  }
  assert.equal(all.size,12);
  assert.equal(straightEvents.size,5);
  assert.ok(forkRecipes.size>=2);
});

test('12 generated encounters supply two usable, distinct decisions in all 192 resource and route states',()=>{
  assert.equal(sites.ordinary.size,12);
  assert.equal(sites.late.size,12);
  for (const {index,name} of EVENT_SCENARIOS) for (const late of [false,true])
    for (const energy of [3,15,27,30]) for (const hurt of [false,true]) {
      const state=visit(index,{late,hurt}), run=state.run;
      run.flame=energy/.3;
      const label=[name,late?'final route':'earlier map',energy+' Energy',hurt?'injured':'full hearts'].join(' / ');
      const offers=getSupportChoices(run,state.profile);
      const enabled=offers.filter(choice=>!choice.disabled);
      assert.ok(enabled.length>=2,label);
      assert.equal(new Set(enabled.map(c=>c.id)).size,enabled.length,label);
      assert.deepEqual(getSupportChoices(reload(state).run),offers,label+' reload');
      const actual=new Set(), initial=JSON.stringify(resourceState(run,late));
      for (const offer of enabled) {
        const copy=structuredClone(state), r=copy.run;
        const wallet=r.condensedGlow;
        claim(copy,offer.id);
        assert.ok(r.flame>=0 && r.flame<=getGlowCapacity(r),label);
        assert.ok(r.lives>=1 && r.lives<=getLifeCapacity(r),label);
        assert.equal(r.stats.events,run.stats.events+1,label);
        if (late) {
          assert.ok(!offer.effect.packedReward && !offer.effect.respec && !offer.effect.pilgrimVow,label+' spends past last Rest');
          assert.ok(!offer.effect.pickupGlow || offer.glowPreview.restored>0,label+' overflow only');
        }
        assert.ok(r.condensedGlow>=wallet,label);
        const outcome=JSON.stringify(resourceState(r,late));
        assert.notEqual(outcome,initial,label+' ineffective '+offer.id);
        // A real die can match the sure reward this seed. The advertised gamble still has different possible outcomes.
        actual.add(offer.effect.dice?'one seeded roll':outcome);
        const after=structuredClone(r);
        assert.equal(resolveSupport(r,offers.indexOf(offer),copy.profile),false,label+' double tap');
        assert.equal(settleCheckpoint(copy),0,label+' duplicate settlement');
        assert.deepEqual(r,after,label+' duplicate changed state');
      }
      assert.ok(actual.size>=2,label+' equivalent choices');
    }
});

test('fuel refills cannot be packed, trades pay exact costs, and conversion preview matches receipt',()=>{
  const refill=visit(0,{low:true}), funds=refill.run.condensedGlow;
  const immediate=getSupportChoices(refill.run).find(c=>c.effect.flame>0);
  claim(refill,immediate.id);
  assert.equal(refill.run.flame,getGlowCapacity(refill.run));
  assert.equal(refill.run.condensedGlow,funds);
  assert.equal(getSupportChoices(visit(1,{low:true}).run).some(c=>c.effect.flame<0),false);
  const sale=visit(1);
  const original=sale.run.flame;
  claim(sale,'bargain');
  assert.equal(glowPoints(original-sale.run.flame),6);
  assert.equal(sale.run.condensedGlow,funds+18);
  for(const fuel of [10,95,100]) {
    const state=visit(2), r=state.run; r.flame=fuel;
    const wallet=r.condensedGlow;
    const offer=getSupportChoices(r).find(c=>!c.effect.pilgrimVow);
    claim(state,offer.id);
    assert.equal(r.condensedGlow,wallet,'event fuel never packs');
    assert.equal(r.flame,fuel+(offer.effect.flame||0));
    r.flame=fuel;
    const preview=previewGlowReward(r,20);
    assert.deepEqual(grantGlowPickup(r,20),preview);
    assert.equal(r.flame,fuel+preview.restored);
    assert.equal(r.condensedGlow,wallet+preview.condensedGlow);
    assert.equal(r.condensedRemainder,preview.remainder);
  }
  const guide=getEventScenarios();
  assert.match(guide[0].detail,/below 6/i);
  assert.match(guide[1].detail,/at least 3 Sparks/i);
});

test('workshop refunds actual paid ranks while preserving the starting gift and unrelated training',()=>{
  const state=visit(10), r=state.run;
  // Buy through the ordinary Rest service, then return to this generated workshop.
  r.restReady=true; r.lastRest={mapIndex:r.mapIndex}; r.condensedGlow=500;
  r.startingSkill='proximity-awakening';r.skills[r.startingSkill]=1;
  for (const id of ['main-sight','main-horizon','main-speed']) assert.ok(buyCheckpointSkill(state,id),id);
  r.restReady=false; r.lastRest=null;
  const wallet=r.condensedGlow, refund=r.skillPaid['main-sight']+r.skillPaid['main-horizon'];
  const opt=getSupportChoices(r).find(c=>c.effect.respec==='main-sight');
  assert.ok(opt);
  assert.ok(opt.description.includes(String(refund)));
  claim(state,opt.id);
  assert.equal(r.condensedGlow,wallet+refund);
  assert.equal(r.skills['main-sight'],undefined);
  assert.equal(r.skills['main-horizon'],undefined);
  assert.equal(r.skills['main-speed'],1);
  assert.equal(r.skills['proximity-awakening'],1);
});

test('all six Prism faces are reproducible after reload, with a fixed seed and exactly one payout',()=>{
  const faces=[new Set(),new Set()];
  for(const [i,late] of [false,true].entries()){
    for(let seed=0;seed<160 && faces[i].size<6;seed++){
      const state=visit(6,{late}), run=state.run;
      run.seed='event-die-'+seed;
      const wallet=run.condensedGlow;getSupportChoices(run);
      const restored=reload(state);
      claim(state,'dice-roll');claim(restored,'dice-roll');
      const face=run.lastEvent.face;
      faces[i].add(face);
      assert.deepEqual(restored.run.lastEvent,run.lastEvent);
      assert.equal(restored.run.condensedGlow,run.condensedGlow);
      const favor=face<=2?'wick':face<=4?'feather':late?'lens':null;
      assert.deepEqual(run.eventFavors||[],favor?[favor]:[]);
      assert.equal(run.condensedGlow-wallet,favor?0:22);
    }
    assert.equal(faces[i].size,6);
  }
});
test('the Vow pays only for a successful attempt with four body pickups and never taxes a missed target',()=>{
  for(const [success,bodyFuelCollected,payout] of [[true,4,8],[true,3,0],[false,12,0]]) {
    const state=visit(2),r=state.run;
    claim(state,'pilgrim-vow');
    nextFlight(state);
    markFlightAttemptStarted(r);
    const wallet=r.condensedGlow;
    assert.ok(finishFlight(r,{success,flame:60,collected:12,bodyFuelCollected}));
    settleCheckpoint(state);
    const receipt=success?r.lastFlight.vow:r.lastAttempt.vow;
    assert.equal(receipt.reward,payout);
    assert.equal(r.condensedGlow-wallet,(r.lastFlight?.completionBonus||0)+payout);
    assert.equal(r.pilgrimVow,undefined);
    assert.equal(finishFlight(r,{success,bodyFuelCollected}),false);
  }
});
test('a started interruption spends the Vow or route preparation, reopens the exit, and a paused briefing preserves both',()=>{
  for(const index of [2,4]) {
    const state=visit(index),r=state.run,source=r.current;
    const exits=[...source.nextIds];
    const choice=getSupportChoices(r).find(o=>o.effect.pilgrimVow||o.effect.routePreparation);
    assert.ok(choice);
    claim(state,choice.id);
    nextFlight(state);
    assert.ok(suspendRun(state));
    assert.ok(r.pilgrimVow||r.routePreparation);
    assert.ok(beginFlightAttempt(r));
    markFlightAttemptStarted(r);
    assert.ok(suspendRun(state));
    assert.equal(r.pilgrimVow,undefined);
    assert.equal(r.routePreparation,undefined);
    assert.deepEqual(source.nextIds,exits);
  }
});
test('marking an actual Cairn fork gives the promised terrain aid and reopens its other route after a fall',()=>{
  const state=newState(),r=state.run=createRun(state.profile,'events1');
  const cairn=r.map.flat().find(n=>n.eventIndex===4&&n.nextIds.length===2);
  assert.ok(cairn);
  r.path=pathTo(r,cairn);r.step=cairn.row;
  assert.ok(selectNode(r,cairn.id));
  const routes=getSupportChoices(r).filter(c=>c.effect.routePreparation);
  assert.equal(routes.length,2);
  const exits=routes.map(c=>c.effect.routePreparation.nodeId).sort();
  for(const option of routes){
    const copy=structuredClone(state),run=copy.run;
    const prep=option.effect.routePreparation;
    claim(copy,option.id);
    assert.deepEqual(getChoices(run).map(n=>n.id),[prep.nodeId]);
    nextFlight(copy);
    const prepared=getRunModifiers(run), plain=structuredClone(run);
    delete plain.routePreparation;
    const base=getRunModifiers(plain);
    if(prep.kind==='wind')assert.equal(prepared.windSensitivity,base.windSensitivity*.7);
    else assert.equal(prepared.lightRadius,base.lightRadius+35);
    markFlightAttemptStarted(run);
    assert.ok(finishFlight(run,{success:false}));
    assert.equal(run.routePreparation,undefined);
    assert.deepEqual(getChoices(run).map(n=>n.id).sort(),exits);
  }
});
function nextFlight(state) {
  const run=state.run;
  const node=getChoices(run).find(n=>n.type!=='support');
  assert.ok(node);
  assert.ok(selectNode(run,node.id));
  assert.ok(beginFlightAttempt(run));
  return node;
}
function flight(run) {
  const g=new WispFlight({seed:run.seed,canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})},
    preflight:true,terrain:run.current.terrain,node:run.current,duration:60,companions:run.companions,modifiers:getRunModifiers(run),flame:run.flame});
  g.running=true;
  return g;
}
test('positive preparations survive failed flights; the one-attempt lead penalty is spent on a started attempt',()=>{
  for (const [event,choice,favor] of [[0,'reserve-wick','wick'],[0,'hollow-feather','feather'],[7,'star-chart','lens'],[3,'companion-chime','haste'],[8,'bargain-burden','burden']]) {
    const state=visit(event); claim(state,choice); const node=nextFlight(state),r=state.run;
    assert.deepEqual(getRunModifiers(r).eventFavors,[favor]);
    assert.ok(suspendRun(state));
    assert.deepEqual(r.eventFavors,[favor]);
    assert.ok(beginFlightAttempt(r));
    assert.ok(markFlightAttemptStarted(r));
    const suspended=structuredClone(state);
    assert.ok(suspendRun(suspended));
    assert.deepEqual(getRunModifiers(suspended.run).eventFavors,favor==='burden'?[]:[favor]);
    assert.ok(finishFlight(r,{success:false}));
    assert.ok(selectNode(r,node.id));
    assert.ok(beginFlightAttempt(r));
    assert.deepEqual(getRunModifiers(r).eventFavors,favor==='burden'?[]:[favor]);
  }
});
test('the real flight engine enforces wick threshold, paid Lift counts, sight radius and recovery speed',()=>{
  function engine(index,id) {const state=visit(index);claim(state,id);nextFlight(state);return flight(state.run);}
  const wick=engine(0,'reserve-wick');
  wick.flame=6/.3;wick.step(1/60);
  assert.equal(wick.flightBoon.reserveWick,true);
  wick.flame=5/.3;wick.step(1/60);
  assert.equal(glowPoints(wick.flame),14);
  wick.flame=5/.3;wick.step(1/60);
  assert.equal(glowPoints(wick.flame),5);
  const feather=engine(0,'hollow-feather'), start=feather.flame;
  assert.ok(feather.flap());assert.ok(feather.flap());assert.equal(feather.flame,start);
  assert.ok(feather.flap());assert.equal(glowPoints(start-feather.flame),3);
  const lead=engine(8,'bargain-burden');
  for(let i=0;i<7;i++) {
    const energy=lead.flame;
    assert.ok(lead.flap());
    assert.equal(glowPoints(energy-lead.flame),i<6?4:3);
  }
  const lens=engine(7,'star-chart');
  assert.equal(lens.getLightState().baseRadius,lens.mod.lightRadius*1.35);
  const swift=visit(3);
  swift.run.companions=['swift'];swift.run.companionRole='swift';
  claim(swift,'companion-chime');nextFlight(swift);
  const fast=flight(swift.run);
  const base=structuredClone(swift.run);base.attemptEntry.eventFavors=[];
  assert.equal(fast.roleCooldown('swift'),flight(base).roleCooldown('swift')*.8);
});
