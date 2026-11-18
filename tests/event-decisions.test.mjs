import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceMap, beginFlightAttempt, buyCheckpointSkill, createRun, finishFlight, getChoices,
  getRunModifiers, getSupportChoices, loadState, markFlightAttemptStarted, newState,
  grantGlowPickup, previewGlowReward, resolveSupport, saveState, selectNode, settleCheckpoint, suspendRun
} from '../dist/model.mjs';
import {EVENT_SCENARIOS, getEventScenarios} from '../dist/map-guide.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
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
  assert.equal(run.pendingTemporary,undefined,'no event opens a slot choice');
  settleCheckpoint(state);
  return offers[index];
}
function resourceState(run,late=false) {
  return {
    energy:run.flame, lives:run.lives, wallet:run.condensedGlow,
    skills:run.skills, oath:run.pendingOath?.id||null, cards:JSON.stringify([run.mountedCards,run.reserveCards,run.eventCards||null]),
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
          assert.ok(!offer.effect.respec,label+' refunds past last Rest');
          assert.ok(!offer.effect.pickupGlow || offer.glowPreview.restored>0,label+' overflow only');
        }
        assert.ok(r.condensedGlow>=wallet,label);
        const outcome=JSON.stringify(resourceState(r,late));
        assert.ok(outcome!==initial||offer.id==='pact:leave',label+' ineffective '+offer.id); // leaving a pact is the one honest no-op
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

// ── Pick 1 of 2 (2026-11-18) ────────────────────────────────────────────────────────────────────────────
import {CARD_SYSTEM} from '../dist/skill-cards.mjs';
import {eventCardOptions} from '../dist/model.mjs';
import {eventPickMarkup, eventPickKind} from '../dist/event-pick.mjs';
function cardEvent(index, {cards = ['body-spark', 'courier-glass', 'toll-bell'], deck = ['downbeat'], used = {}} = {}) {
  const state = visit(index), run = state.run;
  run.skillSystem = CARD_SYSTEM; run.cardSlots = 5;
  run.mountedCards = cards.map((id, i) => makeSkillCard(id, `pick:${i}`));
  run.reserveCards = deck.map((id, i) => makeSkillCard(id, `pickdeck:${i}`));
  for (const [id, uses] of Object.entries(used)) for (const c of [...run.mountedCards, ...run.reserveCards]) if (c.cardId === id) c.charges = uses;
  return state;
}
const CARD_EVENTS = [[0, 'refill-card'], [3, 'refill-card'], [5, 'improve-card'], [9, 'refill-card'], [11, 'improve-card']];

test('every event offers exactly two options, and an event with a card outcome keeps it on screen', () => {
  for (const {index, name} of EVENT_SCENARIOS) for (const late of [false, true]) {
    if (index === 4) continue; // the Marked Passage keeps its own shape: one mark per exit
    const state = visit(index, {late});
    assert.equal(getSupportChoices(state.run, state.profile).length, 2, name);
  }
  for (const [index, id] of CARD_EVENTS) {
    const state = cardEvent(index, {used: {'courier-glass': 2}});
    state.run.flame = 10; // low meter: no spring drink, so the refill (event 0) stays on offer
    const offers = getSupportChoices(state.run, state.profile);
    assert.equal(offers.length, 2, EVENT_SCENARIOS[index].name);
    if (index) assert.ok(offers.some(o => o.id === id && !o.disabled), EVENT_SCENARIOS[index].name + ' offers ' + id);
  }
});

test('an event grants exactly the one outcome chosen, never both', () => {
  const state = cardEvent(11, {used: {'courier-glass': 2}}), run = state.run;
  const before = {wallet: run.condensedGlow, ranks: run.mountedCards.map(c => c.rank), cardIds: run.mountedCards.map(c => c.cardId)};
  const offers = getSupportChoices(run, state.profile), sparksIndex = offers.findIndex(o => o.effect.packedReward);
  assert.notEqual(sparksIndex, -1);
  const paid = structuredClone(state);
  assert.ok(resolveSupport(paid.run, sparksIndex, paid.profile));
  assert.deepEqual(paid.run.mountedCards.map(c => [c.rank, c.cardId]), before.ranks.map((r, i) => [r, before.cardIds[i]]), 'Stored Sparks chosen: no card improved');
  const improved = structuredClone(state), improveIndex = offers.findIndex(o => o.effect.improveCard);
  assert.ok(resolveSupport(improved.run, improveIndex, improved.profile, {cardId: 'pick:2'}));
  assert.equal(improved.run.condensedGlow, before.wallet, 'a card chosen: no Stored Sparks');
});

test('a card outcome lists the eligible cards with what changes and applies to the tapped one', () => {
  const state = cardEvent(3, {used: {'courier-glass': 2}}), run = state.run;
  const list = eventCardOptions(run, 'refill');
  assert.deepEqual(list.map(c => c.instanceId), ['pick:1'], 'only a card that used some uses');
  assert.equal(list[0].change, 'Uses 2 → 5');
  assert.equal(list[0].slot, 0 + 1);
  const offers = getSupportChoices(run, state.profile), index = offers.findIndex(o => eventPickKind(o) === 'refill');
  assert.notEqual(index, -1);
  assert.match(eventPickMarkup(run, 'refill'), /data-id="pick:1"[^>]*>[\s\S]*Uses 2 → 5/);
  assert.equal(resolveSupport(run, index, state.profile, {cardId: 'pick:0'}), false, 'an ineligible card cannot be tapped');
  assert.ok(resolveSupport(run, index, state.profile, {cardId: 'pick:1'}));
  assert.equal(run.mountedCards[1].charges, 5);
  const imp = cardEvent(11, {used: {'courier-glass': 2}});
  const options = eventCardOptions(imp.run, 'improve');
  assert.ok(options.length >= 2); assert.ok(options.every(o => !/-\d/.test(o.change)), 'no negative numbers');
  const target = options.at(-1), others = imp.run.mountedCards.concat(imp.run.reserveCards).filter(c => c.instanceId !== target.instanceId).map(c => [c.cardId, c.rank]);
  const idx = getSupportChoices(imp.run, imp.profile).findIndex(o => eventPickKind(o) === 'improve');
  assert.ok(resolveSupport(imp.run, idx, imp.profile, {cardId: target.instanceId}));
  assert.deepEqual(imp.run.mountedCards.concat(imp.run.reserveCards).filter(c => c.instanceId !== target.instanceId).map(c => [c.cardId, c.rank]), others, 'only the tapped card changed');
});

test('with no eligible card the option stays, disabled, with its reason', () => {
  const state = cardEvent(3, {cards: ['body-spark'], deck: []}), run = state.run;
  assert.deepEqual(eventCardOptions(run, 'refill'), []);
  const offers = getSupportChoices(run, state.profile), refill = offers.find(o => o.effect.refillCard);
  assert.equal(offers.length, 2);
  assert.equal(refill.disabled, true); assert.match(refill.disabledReason, /used any of its uses/);
  assert.equal(resolveSupport(run, offers.indexOf(refill), state.profile), false);
  assert.ok(offers.some(o => !o.disabled));
});

test('the stop preview says choose 1 of 2 rewards, and the guide never says paid at once', () => {
  const run = visit(3).run, node = run.map.flat().find(n => n.kind === 'event');
  assert.equal(node.rewardPreview, 'Event: choose 1 of 2 rewards');
  assert.doesNotMatch(JSON.stringify(EVENT_SCENARIOS), /paid at once|chooses the first card/);
});

test('an event stopped mid-way saves and loads to the same two options', () => {
  const state = cardEvent(5, {used: {'courier-glass': 2}}), offers = getSupportChoices(state.run, state.profile);
  const loaded = reload(state);
  assert.deepEqual(getSupportChoices(loaded.run, loaded.profile).map(o => [o.id, !!o.disabled]), offers.map(o => [o.id, !!o.disabled]));
  assert.equal(loaded.run.phase, 'support');
});
