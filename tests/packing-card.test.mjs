import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {CARD_SYSTEM,SKILL_CARDS,makeSkillCard,getCardModifiers,getCardPackingBonus,getMountedCards,drawSkillCard} from '../dist/skill-cards.mjs';
import {cardArt,cardRewardMarkup} from '../dist/card-ui.mjs';
import {flightRewardMarkup} from '../dist/reward-screen.mjs';

const fresh=()=>{
 const state=M.newState();state.profile.tutorialComplete=true;
 state.run=M.createRun(state.profile,'packing-card',1,{cards:true});
 mount(state.run,['tight-packing']);return state;
};
const mount=(run,ids)=>{
 run.cardSlots=Math.max(3,ids.length);
 run.mountedCards=Array.from({length:run.cardSlots},(_,i)=>ids[i]?makeSkillCard(ids[i],`packing:${i}:${ids[i]}`):null);
};
let sequence=0;
const launch=state=>{
 const run=state.run,node=run.map.flat().find(n=>n.type!=='support'&&!n.elite&&!n.boss);
 Object.assign(run,{current:{...node,id:`packing-flight-${++sequence}`},step:0,phase:'briefing',cardReward:null,flightReward:null,victoryPending:false});
 assert.ok(M.beginFlightAttempt(run));return run;
};
const clear=(state,result={})=>{
 const run=launch(state),before=run.condensedGlow;
 assert.ok(M.finishFlight(run,{success:true,flame:0,condensedGlow:0,...result}));
 M.settleCheckpoint(state);return run.condensedGlow-before;
};
const reload=state=>{
 let data;const storage={getItem:()=>data,setItem:(_,v)=>data=v};
 assert.ok(M.saveState(state,storage));return M.loadState(storage);
};
const engine=(modifiers={})=>new WispFlight({preflight:true,seed:'packing-card-engine',modifiers,
 canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})}});

test('Tight Packing pays 4→5 and 8→10 once, with explicit clear and history receipts',()=>{
 for(const base of [4,8]){
  const state=fresh(),run=state.run,gained=clear(state,{condensedGlow:base});
  assert.equal(gained,run.lastFlight.completionBonus+base*1.25);
  assert.equal(run.lastFlight.cardPackingBonus,base/4);
  assert.equal(run.lastFlight.securedCondensedGlow,gained);
  assert.equal(run.cardHistory.find(e=>e.type==='packing').bonus,base/4);
  const saved=reload(state),wallet=saved.run.condensedGlow;
  assert.equal(M.finishFlight(saved.run,{success:true,condensedGlow:base}),false);
  assert.equal(M.settleCheckpoint(saved),0);assert.equal(saved.run.condensedGlow,wallet);
  const receipt=M.takeClearRewardReceipt(saved.run);
  assert.equal(receipt.amount,gained);assert.equal(receipt.cardPackingBonus,base/4);
  assert.match(receipt.notes.join(' '),/Tight Packing/);
  assert.equal(M.takeClearRewardReceipt(saved.run),null);
 }
});

test('earned quarters survive successful clears, reload and unequip; failures and Dream add none',()=>{
 let state=fresh();clear(state,{condensedGlow:1});assert.equal(state.run.cardPackingRemainder,1);
 state=reload(state);clear(state,{condensedGlow:1});assert.equal(state.run.cardPackingRemainder,2);
 const run=launch(state),wallet=run.condensedGlow;
 assert.ok(M.finishFlight(run,{success:false,flame:100,condensedGlow:20,cardPackingEligible:20}));
 assert.equal(run.cardPackingRemainder,2);assert.equal(run.condensedGlow,wallet);
 clear(state,{condensedGlow:8,dreamAttempt:true});assert.equal(run.lastFlight.cardPackingBonus,0);assert.equal(run.cardPackingRemainder,2);
 mount(run,[]);clear(state,{condensedGlow:8});assert.equal(run.lastFlight.cardPackingBonus,0);assert.equal(run.cardPackingRemainder,2);
 state=reload(state);mount(state.run,['tight-packing']);clear(state,{condensedGlow:2});
 assert.equal(state.run.lastFlight.cardPackingBonus,1);assert.equal(state.run.cardPackingRemainder,0);
});

test('eligible overflow plus independent exit reserve is capped first; flat income and pact do not multiply',()=>{
 const state=fresh(),run=state.run;run.nextFlightPact='night-ledger';
 clear(state,{condensedGlow:999,cardPackingEligible:999,flame:80,storageBonus:100,resonanceStored:100});
 assert.equal(run.lastFlight.pickupCondensedGlow,20);assert.equal(run.lastFlight.exitPacking.amount,4);
 assert.equal(run.lastFlight.cardPackingEligible,24);assert.equal(run.lastFlight.cardPackingBonus,6);
 assert.equal(run.lastFlight.pactBonus,20,'pact sees only the original packing');
 const flat=fresh();mount(flat.run,['tight-packing','harvest-legendary']);
 clear(flat,{flame:0,condensedGlow:0,storageBonus:100,resonanceStored:7});
 assert.equal(flat.run.lastFlight.resonanceStored,7);assert.equal(flat.run.lastFlight.cardPackingBonus,0);
 const wallet=flat.run.condensedGlow;
 assert.ok(M.chooseCardReward(flat,'melt'));assert.ok(flat.run.condensedGlow>wallet);
 assert.equal(flat.run.cardPackingRemainder,0);
 const standard=M.newState();standard.run=M.createRun(standard.profile,'packing-standard');
 clear(standard,{condensedGlow:8});assert.equal(standard.run.lastFlight.cardPackingBonus,undefined);
});

test('genuine copies and Chameleon add percentage points; Echo has no passive action',()=>{
 const state=fresh(),run=state.run;
 mount(run,['chameleon','tight-packing','tight-packing','echo','tight-packing']);
 assert.equal(getCardModifiers(run).cardPackingSources,4);
 assert.equal(getMountedCards(run)[3].copyPreview,'No activation to repeat');
 clear(state,{condensedGlow:4});assert.equal(run.lastFlight.cardPackingBonus,4);
 assert.equal(SKILL_CARDS['tight-packing'].maxRank,1);
 assert.deepEqual(getCardPackingBonus(4,1),{amount:1,remainder:0});
 assert.deepEqual(getCardPackingBonus(8,1),{amount:2,remainder:0});
});

test('natural packing displays the extra separately without turning it into base output; Dream/generated pay none',()=>{
 const state=fresh(),e=engine(getCardModifiers(state.run));e.running=true;e.flame=100;
 for(let i=0;i<4;i++)e.collect({kind:'light'});
 assert.equal(e.condensedGlow,4);assert.equal(e.cardPackingBonus,1);assert.equal(e.getState().condensedGlow,5);
 assert.equal(e.condensationFlow.cardPackingBonus,1);
 assert.ok(e.activationEvents.events.some(event=>event.label==='Tight Packing'&&event.outcome.stored===1));
 e.storageBonus=12;e.resonanceStored=3;e.flame=80;e.finish(true);
 assert.equal(e.exitPacking.amount,4);assert.equal(e.cardPackingBonus,2);assert.equal(e.condensationFlow.amount,5);
 assert.equal(e.getState().condensedGlow,25);e.destroy();
 const denied=engine(getCardModifiers(state.run));denied.running=true;denied.flame=100;
 denied.collect({kind:'light',generated:true});
 denied.dream={phase:'recording',active:true};for(let i=0;i<8;i++)denied.collect({kind:'light'});
 denied.dream={phase:'done'};denied.collect({kind:'light',fetchedInDream:true});
 assert.equal(denied.cardPackingEligible,0);assert.equal(denied.cardPackingBonus,0);denied.destroy();
});

test('Common starter/drop pools include Tight Packing and its clear UI receipt never leaks to Forge',()=>{
 let starter=false,drop=false;
 for(let seed=0;seed<120&&(!starter||!drop);seed++){
  const state=fresh();state.run.campaignSeed=`packing-pool-${seed}`;
  starter ||= M.getStartingGiftOffers(state.run).some(offer=>offer.cardId==='tight-packing');
  drop ||= drawSkillCard(state.run,'flight',{id:`drop-${seed}`},'common').cardId==='tight-packing';
 }
 assert.ok(starter);assert.ok(drop);
 const state=fresh();clear(state,{condensedGlow:4});
 assert.match(cardArt(makeSkillCard('tight-packing','art')),/25%/);
 assert.match(cardRewardMarkup(state.run),/Tight Packing \+1 Stored Sparks/);
 state.run.cardReward.source='forge';assert.doesNotMatch(cardRewardMarkup(state.run),/Tight Packing \+1 Stored Sparks/);
 state.run.lastFlight.elite=true;
 assert.match(flightRewardMarkup(state),/Tight Packing \+1/);
});
