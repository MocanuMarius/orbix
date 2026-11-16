import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, newState, getChoices, getRouteBonusCandidates, getRouteBonus,
  selectNode, beginFlightAttempt, markFlightAttemptStarted, finishFlight,
  getRunModifiers, takeClearRewardReceipt, saveState, loadState, suspendRun
} from '../dist/model.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {getFlightClearReward} from '../dist/checkpoint-rewards.mjs';
import {prepareRouteOffer} from '../dist/route-offers.mjs';
import {awardRouteBonus} from '../dist/route-bonuses.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';

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

test('rich multi-stage hunts are reserved for flights long enough to fund their pickups',()=>{
 const state=newState(),run=createRun(state.profile,'short-hunt-budget');
 run.testMode=true;run.lives=1;
 const flights=run.map.flat().filter(n=>n.type==='flight');
 for(const n of flights)n.duration=50;
 for(const n of flights){
  const offers=getRouteBonusCandidates(run,n);
  assert.ok(!offers.includes('constellation'));assert.ok(!offers.includes('three-suns'));
 }
 for(const n of flights)n.duration=100;
 const offers=flights.flatMap(n=>getRouteBonusCandidates(run,n));
 assert.ok(offers.includes('constellation'));assert.ok(offers.includes('three-suns'));
});

test('Edgeweaver follows the equipped card build and never an unequipped reserve card',()=>{
 const state=newState(),run=createRun(state.profile,'card-route-eligibility',1,{cards:true}),node=getChoices(run)[0];
 const card=makeSkillCard('slip-feather','route-proximity');
 run.reserveCards.push(card);
 assert.ok(!getRouteBonusCandidates(run,node).includes('edgeweaver'));
 run.reserveCards=[];run.mountedCards[0]=card;
 assert.ok(getRunModifiers(run).proximityUnlocked);
 assert.ok(getRouteBonusCandidates(run,node).includes('edgeweaver'));
 run.mountedCards[0]=null;
 assert.ok(!getRouteBonusCandidates(run,node).includes('edgeweaver'));
});

test('sighted and saved committed offers retain their ID when ranking changes',()=>{
 const state=newState(),run=state.run=createRun(state.profile,'sighted-route-offer'),node=getChoices(run)[0];
 const offer=prepareRouteOffer(run,node);
 assert.ok(offer);run.passageBoons={[offer.id]:3};run.nextFlightBoon=offer.id;
 assert.equal(prepareRouteOffer(run,node).id,offer.id);
 assert.ok(selectNode(run,node.id));
 const store=memory();saveState(state,store);
 const restored=loadState(store).run;
 assert.equal(prepareRouteOffer(restored,restored.current).id,offer.id);
 assert.equal(restored.current.bonusId,offer.id);
});

test('sibling assignment is independent of preview order and keeps saved agreements',()=>{
 const profile=newState().profile,a=createRun(profile,'row-independent'),b=structuredClone(a),c=structuredClone(a);
 const row=a.map.find(row=>row.filter(n=>n.type==='flight').length===3),index=a.map.indexOf(row);
 prepareRouteOffer(a,row[0]);prepareRouteOffer(b,b.map[index].at(-1));
 assert.deepEqual(a.map[index].map(n=>n.bonusId),b.map[index].map(n=>n.bonusId));
 c.map[index][0].bonusId='wayfinder';
 prepareRouteOffer(c,c.map[index].at(-1));
 assert.equal(c.map[index][0].bonusId,'wayfinder');
});

test('Fallen Giant fresh, memoized and saved previews match its permanent settled reward',()=>{
 const state=newState(),run=state.run=createRun(state.profile,'heartwood-preview'),node=getChoices(run)[0];
 node.levelId='pinewood-fallen-giant';
 const first=prepareRouteOffer(run,node);
 assert.equal(first.name,'Heartwood Trail');assert.equal(first.reward,'+3 maximum Sparks permanently.');
 delete node.bonusId;
 const cached=prepareRouteOffer(run,node);assert.deepEqual(cached,first);
 assert.ok(selectNode(run,node.id));
 const store=memory();saveState(state,store);
 const saved=loadState(store).run,preview=prepareRouteOffer(saved,saved.current);
 assert.deepEqual(preview,first);
 const before=getGlowCapacity(saved),result={success:true,routeBonus:{id:preview.id,eligible:true,complete:true,failed:false,target:preview.target,progress:preview.target}};
 const receipt=awardRouteBonus(saved,saved.current,{nodeId:node.id,bonusId:preview.id},result,20,0,false);
 assert.equal(receipt.id,preview.id);assert.doesNotMatch(receipt.message,/Heartwood Trail/);assert.match(receipt.message,/\+3 maximum Sparks permanently/);
 assert.equal(getGlowCapacity(saved),before+10);
});

test('every route bonus pays exactly its advertised clear effect and survives save once',()=>{
  for (const id of Object.keys(ROUTE_BONUSES)) {
    const {run,state}=firstOffer(id);
    const funds=run.condensedGlow, hearts=run.lives,clearPay=getFlightClearReward(run.current,run);
    assert.ok(finishFlight(run,cleared(id)));
    const claimed=run.lastFlight.routeBonus;
    assert.equal(claimed.id,id);
    const currency=id==='gilded'?30:id==='precision'?8:0;
    assert.equal(claimed.amount,currency);
    const earned=clearPay+19+3+currency; // 60 internal reserve packs to 3 Stored Sparks.
    assert.equal(run.condensedGlow,funds+earned);
    assert.equal(run.lives,hearts+Number(id==='three-suns'));
    assert.equal(run.nextFlightBoon, ['three-suns','precision','gilded'].includes(id)?undefined:ROUTE_BONUSES[id].boonId||id);
    assert.equal(finishFlight(run,cleared(id)),false);
    const store=memory();
    saveState(state,store);
    const saved=loadState(store);
    assert.equal(saved.run.condensedGlow,run.condensedGlow);
    assert.equal(saved.run.nextFlightBoon,run.nextFlightBoon);
    const receipt=takeClearRewardReceipt(saved.run);
    assert.equal(receipt.amount,earned);
    assert.ok(receipt.notes.includes(claimed.message));
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
  for(const [received,waking,matched] of [[12,1,1],[2,20,2],[50,0,0],[50,49,20]]) {
    const {run}=firstOffer('gilded');
    const expected=Math.min(30,getFlightClearReward(run.current,run)+matched);
    const result=cleared('gilded',{condensedGlow:received});
    result.routeBonus.packed=waking;
    finishFlight(run,result);
    assert.equal(run.lastFlight.routeBonus.amount,expected);
  }
});
