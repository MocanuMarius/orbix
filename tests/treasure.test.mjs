import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,advanceMap,getTreasureChoices,getSupportChoices,selectNode,resolveSupport,
  getChoices,beginFlightAttempt,finishFlight,getRunModifiers,settleCheckpoint} from '../dist/model.mjs';
import {describeTreasure} from '../dist/treasure.mjs';
import {getGlowCapacity,glowPoints} from '../dist/vitality.mjs';

// Isolate the site and the flight where its wager or preparation expires.
function visit(kind,energy=100) {
  const state=newState(),run=state.run=createRun(state.profile,'chest-contact');
  const flight={...run.map[0][0],row:1,nextIds:[]};
  const chest={...describeTreasure(kind),id:'chest',type:'support',kind:'treasure',row:0,nextIds:[flight.id]};
  run.map=[[chest],[flight]];run.flame=energy;
  const preview=getTreasureChoices(run,chest);
  assert.equal(run.phase,'map');
  assert.ok(selectNode(run,chest.id));
  assert.deepEqual(getSupportChoices(run),preview);
  return state;
}

function claim(state,id) {
  const i=getSupportChoices(state.run).findIndex(offer=>offer.id===id);
  assert.notEqual(i,-1);
  assert.ok(resolveSupport(state.run,i));
  settleCheckpoint(state);
  assert.equal(resolveSupport(state.run,i),false);
}

function fly(state,result) {
  const run=state.run;
  assert.ok(selectNode(run,getChoices(run)[0].id));
  assert.ok(beginFlightAttempt(run));
  assert.ok(finishFlight(run,result));
  settleCheckpoint(state);
}

function campaignSites(seed) {
  const run=createRun(newState().profile,seed),sites=[];
  for(let map=0;map<3;map++){
    for(const node of run.map.flat().filter(n=>n.kind==='treasure')){
      sites.push(node.treasureKind);
      if(map===2&&node.row===run.map.length-2)assert.equal(node.treasureKind,'lens');
    }
    if(map<2){run.phase='map-clear';assert.ok(advanceMap(run));}
  }
  return sites;
}

test('campaign seed deals distinct treasure families across map boundaries',()=>{
  const decks=new Set();
  for(let seed=0;seed<12;seed++){
    const sites=campaignSites('treasure-deck-'+seed);
    assert.deepEqual(campaignSites('treasure-deck-'+seed),sites);
    for(let i=0;i+4<=sites.length;i++)assert.equal(new Set(sites.slice(i,i+4)).size,4);
    decks.add(sites.join('/'));
  }
  assert.ok(decks.size>1);
});

test('the vessel either grows capacity for this run or pays once',()=>{
  const grown=visit('vessel'),wallet=grown.run.condensedGlow;
  claim(grown,'vessel-grow');
  assert.equal(glowPoints(getGlowCapacity(grown.run)),33);
  assert.equal(grown.run.flame,getGlowCapacity(grown.run));
  assert.equal(grown.run.condensedGlow,wallet);
  const sold=visit('vessel');
  claim(sold,'vessel-purse');
  assert.equal(sold.run.condensedGlow,wallet+20);
  assert.equal(glowPoints(getGlowCapacity(sold.run)),30);
});

test('strongbox enforces its displayed spending threshold and caps its provisions',()=>{
  const low=visit('tithe',26),oldWallet=low.run.condensedGlow;
  assert.equal(glowPoints(low.run.flame),8);
  assert.equal(getSupportChoices(low.run)[1].disabled,true);
  assert.equal(resolveSupport(low.run,1),false);
  assert.equal(low.run.flame,26);assert.equal(low.run.condensedGlow,oldWallet);
  const trade=visit('tithe',29);
  assert.equal(glowPoints(trade.run.flame),9);
  claim(trade,'tithe-pay');
  assert.equal(glowPoints(trade.run.flame),3);assert.equal(trade.run.condensedGlow,oldWallet+30);
  const supplies=visit('tithe',95);
  claim(supplies,'tithe-supplies');
  assert.equal(supplies.run.flame,getGlowCapacity(supplies.run));
  assert.equal(supplies.run.condensedGlow,oldWallet+10);
});

test('split lens affects only the chosen system and is spent on a failed or successful attempt',()=>{
  for(const sight of [true,false]){
    const state=visit('lens'),run=state.run,base=getRunModifiers(run);
    claim(state,sight?'lens-sight':'lens-companion');
    const modified=getRunModifiers(run);
    assert.equal(modified.lightRadius,base.lightRadius*(sight?1.35:1));
    assert.equal(modified.treasureRecoveryScale??1,sight?1:.7);
    fly(state,{success:sight,flame:80});
    assert.equal(getRunModifiers(run).lightRadius,base.lightRadius);
    assert.equal(getRunModifiers(run).treasureRecoveryScale??1,1);
  }
});

test('escrow pays a guaranteed purse or checks displayed Energy before recovery',()=>{
  const safe=visit('wager'),wallet=safe.run.condensedGlow;
  claim(safe,'wager-purse');
  assert.equal(safe.run.condensedGlow,wallet+18);
  for(const [success,flame,expected] of [[true,39,40],[true,37,0],[false,80,0]]){
    const state=visit('wager'),run=state.run;
    claim(state,'wager-carry');
    assert.equal(run.condensedGlow,wallet);
    fly(state,{success,flame});
    const receipt=(success?run.lastFlight:run.lastAttempt).treasureWager;
    assert.equal(receipt.reward,expected);
    assert.equal(run.condensedGlow,wallet+(success?run.lastFlight.completionBonus:0)+expected);
    assert.equal(run.treasurePact,undefined);
    assert.equal(finishFlight(run,{success:true,flame:100}),false);
  }
});
