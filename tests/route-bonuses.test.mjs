import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, newState, getChoices, getRouteBonusCandidates, getRouteBonus,
  selectNode, beginFlightAttempt, markFlightAttemptStarted, finishFlight,
  getRunModifiers, takeClearRewardReceipt, saveState, loadState, suspendRun
} from '../dist/model.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';

function firstOffer(id) {
  for (let seed=0; seed<1000; seed++) {
    const state = newState(), run = state.run = createRun(state.profile, String(seed));
    run.testMode=true;
    run.lives=2;
    run.skills['proximity-awakening']=1;
    for (const node of getChoices(run)) {
      if (getRouteBonusCandidates(run,node).includes(id)) {
        node.bonusId=id;
        assert.equal(getRouteBonus(run,node).id,id);
        assert.ok(selectNode(run,node.id));
        assert.ok(beginFlightAttempt(run));
        return {state, run, node};
      }
    }
  }
  throw Error('Could not obtain first ' + id);
}
function cleared(id, fields={}) {
  const target=ROUTE_BONUSES[id].target;
  return {success:true,flame:60,condensedGlow:19,
    routeBonus:{id,packed:19,eligible:true,complete:true,progress:target,target,failed:false}, ...fields};
}
function memory() {
  let value;
  return {setItem:(k,v)=>value=v,getItem:()=>value};
}

test('every route bonus pays exactly its advertised clear effect and survives save once',()=>{
  for (const id of Object.keys(ROUTE_BONUSES)) {
    const {run,state}=firstOffer(id);
    const funds=run.condensedGlow, hearts=run.lives;
    assert.ok(finishFlight(run,cleared(id)));
    const claimed=run.lastFlight.routeBonus;
    assert.equal(claimed.id,id);
    const currency=id==='gilded'?30:id==='precision'?8:0;
    assert.equal(claimed.amount,currency);
    assert.equal(run.condensedGlow,funds+39+currency);
    assert.equal(run.lives,hearts+Number(id==='three-suns'));
    assert.equal(run.nextFlightBoon, ['three-suns','precision','gilded'].includes(id)?undefined:id);
    assert.equal(finishFlight(run,cleared(id)),false);
    const store=memory();
    saveState(state,store);
    const saved=loadState(store);
    assert.equal(saved.run.condensedGlow,run.condensedGlow);
    assert.equal(saved.run.nextFlightBoon,run.nextFlightBoon);
    const receipt=takeClearRewardReceipt(saved.run);
    assert.equal(receipt.amount,39+currency);
    assert.ok(receipt.notes.some(note=>note.includes(claimed.name)));
    assert.equal(takeClearRewardReceipt(saved.run),null);
  }
});

test('a missed, ineligible, conflicting, or failed objective never mints its reward',()=>{
  for(const patch of [{id:'wayfinder'},{progress:0},{target:0},{eligible:false},{failed:true},{complete:false}]) {
    const {run}=firstOffer('precision');
    const result=cleared('precision');
    Object.assign(result.routeBonus,patch);
    assert.ok(finishFlight(run,result));
    assert.equal(run.lastFlight.routeBonus,null);
    assert.equal(run.lastFlight.challengeComplete,false);
  }
  const {run}=firstOffer('gilded');
  run.treasurePact='wager';
  finishFlight(run,cleared('gilded'));
  assert.equal(run.lastFlight.routeBonus,null);
  const {run:dead}=firstOffer('three-suns'),wallet=dead.condensedGlow;
  finishFlight(dead,cleared('three-suns',{success:false}));
  assert.equal(dead.lives,1);
  assert.equal(dead.condensedGlow,wallet);
  assert.equal(dead.routeBonusClaims,undefined);
});

test('an interrupted loading gate restores the pending boon, an already flown attempt spends it',()=>{
  for(const started of [false,true]){
    const state=newState(),run=state.run=createRun(state.profile,'boon-lifetime');
    run.nextFlightBoon='long-glide';
    assert.equal(getRunModifiers(run).flightBoon,null);
    selectNode(run,getChoices(run)[0].id);
    beginFlightAttempt(run);
    assert.equal(getRunModifiers(run).flightBoon,'long-glide');
    assert.equal(run.nextFlightBoon,undefined);
    if(started)assert.ok(markFlightAttemptStarted(run));
    const store=memory();saveState(state,store);
    assert.equal(loadState(store).run.nextFlightBoon,started?undefined:'long-glide');
    suspendRun(state);
    assert.equal(run.nextFlightBoon,started?undefined:'long-glide');
  }
});

test('a failed attempt spends its boon even when the player returns to choose another route',()=>{
  const {state,run}=firstOffer('precision');
  run.attemptEntry.flightBoon='wild-circuit';
  markFlightAttemptStarted(run);
  finishFlight(run, {success:false});
  assert.equal(run.nextFlightBoon,undefined);
  const store=memory();saveState(state,store);
  assert.equal(loadState(store).run.nextFlightBoon,undefined);
});

test('cash and heart offers are capped by map, state and outstanding contracts',()=>{
  for(let seed=0;seed<24;seed++){
    const run=createRun(newState().profile,String(seed));run.lives=2;run.testMode=true;
    const sites=run.map.flat().filter(n=>n.type!=='support');
    const offers=sites.map(n=>getRouteBonusCandidates(run,n));
    assert.equal(offers.filter(o=>o.includes('gilded')||o.includes('precision')).length,1);
    assert.equal(offers.filter(o=>o.includes('three-suns')).length,1);
    run.lives=3;run.treasurePact='wager';
    assert.ok(sites.every(n=>getRouteBonusCandidates(run,n).every(id=>!['gilded','precision','three-suns','edgeweaver'].includes(id))));
  }
});

test('Gilded matches waking Packing and the clear reward within both transfer limits',()=>{
  for(const [received,waking,expected] of [[12,1,21],[2,20,22],[50,0,20],[50,49,30]]) {
    const {run}=firstOffer('gilded');
    const result=cleared('gilded',{condensedGlow:received});
    result.routeBonus.packed=waking;
    finishFlight(run,result);
    assert.equal(run.lastFlight.routeBonus.amount,expected);
  }
});
