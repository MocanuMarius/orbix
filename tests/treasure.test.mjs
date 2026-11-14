import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,advanceMap,getTreasureChoices,getSupportChoices,selectNode,resolveSupport,
  getChoices,beginFlightAttempt,finishFlight,getRunModifiers,settleCheckpoint,saveState,loadState,markFlightAttemptStarted} from '../dist/model.mjs';
import {describeTreasure,treasureChoices} from '../dist/treasure.mjs';
import {WispFlight} from '../dist/flight.mjs';
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

test('strongbox enforces the advertised cost and rewards skillful body contact once per clear',()=>{
  const low=visit('tithe',26),oldWallet=low.run.condensedGlow;
  assert.equal(glowPoints(low.run.flame),8);
  assert.equal(getSupportChoices(low.run)[1].disabled,true);
  assert.equal(resolveSupport(low.run,1),false);
  assert.equal(low.run.flame,26);assert.equal(low.run.condensedGlow,oldWallet);
  const trade=visit('tithe',29);
  assert.equal(glowPoints(trade.run.flame),9);
  claim(trade,'tithe-pay');
  assert.equal(glowPoints(trade.run.flame),3);assert.equal(trade.run.condensedGlow,oldWallet);
  fly(trade,{success:true,flame:20,bodyFuelCollected:3});
  assert.equal(trade.run.lastFlight.chestIncome.amount,3);
  assert.equal(trade.run.condensedGlow,oldWallet+trade.run.lastFlight.completionBonus+3);
  const missed=visit('tithe');claim(missed,'tithe-pay');fly(missed,{success:true,flame:60,bodyFuelCollected:2,collected:20});
  assert.equal(missed.run.lastFlight.chestIncome,undefined);
  assert.equal(missed.run.treasureGifts.toll,1);
  const supplies=visit('tithe',95);
  claim(supplies,'tithe-supplies');
  assert.equal(supplies.run.flame,getGlowCapacity(supplies.run));
  assert.equal(supplies.run.condensedGlow,oldWallet);
  fly(supplies,{success:true,flame:0});
  assert.equal(glowPoints(supplies.run.flame),18);
  assert.equal(supplies.run.lastFlight.recovery.stored,0);
});

test('split lens affects only the chosen system and lasts across failed and successful attempts',()=>{
  for(const sight of [true,false]){
    const state=visit('lens'),run=state.run,base=getRunModifiers(run);
    claim(state,sight?'lens-sight':'lens-companion');
    const modified=getRunModifiers(run);
    assert.equal(modified.lightRadius,base.lightRadius*(sight?1.15:1));
    assert.equal(modified.treasureRecoveryScale??1,sight?1:.85);
    fly(state,{success:sight,flame:80});
    assert.equal(getRunModifiers(run).lightRadius,modified.lightRadius);
    assert.equal(getRunModifiers(run).treasureRecoveryScale??1,modified.treasureRecoveryScale??1);
    const again=treasureChoices('lens',run);
    assert.ok(again.find(o=>o.id==='lens-sell'));
    assert.ok(again.find(o=>o.id===(sight?'lens-companion':'lens-sight')));
  }
});

test('escrow pays a guaranteed purse or checks displayed Energy before recovery',()=>{
  const safe=visit('wager'),wallet=safe.run.condensedGlow;
  claim(safe,'wager-purse');
  assert.equal(safe.run.condensedGlow,wallet+18);
  for(const [success,flame,expected] of [[true,39,24],[true,37,0],[false,80,0]]){
    const state=visit('wager'),run=state.run;
    claim(state,'wager-carry');
    assert.equal(run.condensedGlow,wallet);
    fly(state,{success,flame});
    const receipt=(success?run.lastFlight:run.lastAttempt).treasureWager;
    assert.equal(receipt.reward,expected);
    assert.equal(run.condensedGlow,wallet+(success?run.lastFlight.completionBonus:0)+expected);
    assert.equal(run.treasurePact,undefined);
    assert.equal(run.treasureGifts?.seal||0,expected?1:0);
    assert.equal(run.lastFlight?.chestIncome,undefined,'seal first pays on a later clear');
    assert.equal(finishFlight(run,{success:true,flame:100}),false);
  }
});

test('each companion uses the quick lens in its own flight recovery timer',()=>{
  for(const role of ['collector','protector','swift','leveler']){
    const state=visit('lens'),run=state.run;run.companions=[role];run.companionRole=role;
    const timing=()=>{
      const canvas={style:{},getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
      const e=new WispFlight({canvas,preflight:true,seed:role,companions:[role],modifiers:getRunModifiers(run)});
      return role==='collector'?e.wisp.recoveryDuration(e):role==='protector'?e.shield.recoveryTotal:e.roleCooldown(role);
    };
    const before=timing();claim(state,'lens-companion');
    assert.ok(Math.abs(timing()-before*.85)<1e-8,role);
  }
});

test('map advance and save reload keep gifts; an interrupted flown wager expires',()=>{
  const state=visit('lens');claim(state,'lens-sight');
  const run=state.run;run.phase='map-clear';assert.ok(advanceMap(run));
  run.treasurePact='wager';assert.ok(selectNode(run,getChoices(run)[0].id));assert.ok(beginFlightAttempt(run));markFlightAttemptStarted(run);
  let json;const storage={setItem(k,value){json=value},getItem(){return json}};
  saveState(state,storage);const loaded=loadState(storage).run;
  assert.equal(loaded.mapIndex,1);assert.equal(loaded.treasureGifts.farLens,1);
  assert.equal(loaded.treasurePact,undefined);
  assert.equal(getRunModifiers(loaded).lightRadius,getRunModifiers(run).lightRadius);
});

test('full meters and capped treasure gifts produce useful alternatives',()=>{
  const r=visit('vessel').run;r.treasureGifts={vessel:2,farLens:1,quickLens:1,wick:1,toll:1,seal:1};
  r.lives=r.maxLives=3;
  for(const kind of ['vessel','lens','tithe','wager']){
    const options=treasureChoices(kind,r);
    assert.equal(new Set(options.map(o=>o.id)).size,2);
    assert.ok(options.every(o=>!o.disabled&&!o.effect.treasureGift));
  }
  r.lives=1;assert.equal(treasureChoices('vessel',r)[0].effect.lives,1);
  const doubled=visit('wager');doubled.run.treasureGifts={seal:1,toll:1};claim(doubled,'wager-carry');
  fly(doubled,{success:true,flame:40,bodyFuelCollected:3});
  assert.equal(doubled.run.lastFlight.treasureWager.reward,36);
  assert.equal(doubled.run.lastFlight.chestIncome.amount,6);
});
