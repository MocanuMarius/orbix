import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {FLIGHT_REWARD_SOURCE_DETAILS,flightRewardReceiptDetail} from '../dist/flight-reward-details.mjs';
import {flightRewardCeremonyReceipt,flightRewardCeremonyMarkup} from '../dist/flight-reward-ceremony.mjs';

function cleared(){
 const state=M.newState();state.profile.tutorialComplete=true;
 state.run=M.createRun(state.profile,'reward-inspectors',1,{cards:true});
 M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);
 const node=M.getChoices(state.run).find(node=>node.type!=='support');
 M.selectNode(state.run,node.id);M.beginFlightAttempt(state.run);M.markFlightAttemptStarted(state.run);
 M.finishFlight(state.run,{success:true,flame:50});M.settleCheckpoint(state);
 return state.run;
}
function richReceipt(){
 const run=cleared();
 Object.assign(run.lastFlight,{securedCondensedGlow:1000,pickupCondensedGlow:3,exitPacking:{amount:2},pactBonus:3,flightPact:'blind-pilgrim',
  treasureWager:{reward:24,message:'Seal opened · +24 Stored Sparks'},vow:{reward:8,message:'Vow kept · +8 Stored Sparks'},
  routeBonus:{id:'wayfinder',amount:2,message:'Opening route preview earned'},chestIncome:{amount:6,sources:['Toll stamp','Lamplighter’s seal'],message:'Two lasting finds paid'},
  keptLightDividend:2,storageBonus:2,cardPackingBonus:2,resonanceStored:2,artifactActivations:{'glow-wick':3},consumedArtifacts:['glow-wick'],
  cardClearReceipt:{stored:5,futureCapacity:1,cruisingSpeed:1,charges:{},
   sources:[{instanceId:'past-purse',cardId:'wayfarers-purse',name:'Wayfarer’s Purse',rank:1},{instanceId:'past-ring',cardId:'growth-ring',name:'Growth Ring',rank:1},{instanceId:'past-feather',cardId:'wind-feather',name:'Wind Feather',rank:1}],
   steps:[{success:true,sourceInstanceId:'past-purse',sourceCardId:'wayfarers-purse',stored:5},{success:true,sourceInstanceId:'past-ring',sourceCardId:'growth-ring',futureCapacity:1},{success:true,sourceInstanceId:'past-feather',sourceCardId:'wind-feather',cruisingSpeed:1}]}});
 return run;
}

test('every rendered source and effect resolves to its own read-only inspector without changing the run',()=>{
 const run=richReceipt(),before=JSON.stringify(run),receipt=flightRewardCeremonyReceipt(run);
 const keys=[...receipt.baseRows,...receipt.bonusRows,...receipt.effectEntries].map(entry=>entry.detailKey);
 assert.equal(keys.length,receipt.baseRows.length+receipt.bonusRows.length+receipt.notes.length);
 for(const key of keys){
  const detail=flightRewardReceiptDetail(run,key);
  assert.ok(detail?.title,key);assert.ok(detail.markup,key);
  assert.doesNotMatch(detail.markup,/data-action="(?:pick|keep|sell|buy|card-melt|card-improve|support)/,key);
 }
 const markup=flightRewardCeremonyMarkup(run);
 assert.equal((markup.match(/data-action="flight-reward-detail"/g)||[]).length,keys.length);
 assert.equal(JSON.stringify(run),before);
 assert.equal(flightRewardReceiptDetail(run,'invented-source'),null);
 assert.equal(flightRewardReceiptDetail(run,'artifact:quiet-cinder'),null);
 assert.equal(Object.keys(FLIGHT_REWARD_SOURCE_DETAILS).length,13);
});

test('card inspectors show recorded actual cards even after those instances leave the Deck',()=>{
 const run=richReceipt();
 const purse=flightRewardReceiptDetail(run,'source-clear-cards');
 assert.equal(purse.kind,'cards');
 assert.match(purse.markup,/data-card-instance="past-purse"/);
 assert.match(purse.markup,/data-card-help="wayfarers-purse"/);
 assert.doesNotMatch(purse.markup,/data-card-instance="past-ring"/);
 const growth=flightRewardReceiptDetail(run,'effect-growth');
 assert.match(growth.markup,/data-card-instance="past-ring"/);
 assert.match(growth.markup,/data-card-help="growth-ring"/);
 const speed=flightRewardReceiptDetail(run,'effect-speed');
 assert.match(speed.markup,/data-card-instance="past-feather"/);
});

test('depleted artifacts show full rules and an accurate used-up lifetime without collection controls',()=>{
 const detail=flightRewardReceiptDetail(richReceipt(),'artifact:glow-wick');
 assert.equal(detail.kind,'artifact');assert.equal(detail.title,M.ARTIFACTS['glow-wick'].name);
 assert.match(detail.markup,/artifact-trigger-line/);assert.match(detail.markup,/artifact-effect-main/);assert.match(detail.markup,/artifact-limit-line/);
 assert.match(detail.markup,/Used up/);assert.doesNotMatch(detail.markup,/3 automatic uses|Melt|data-action=/);
});

test('pact and challenge inspectors identify their original rules and relevant keywords',()=>{
 const run=richReceipt(),pact=flightRewardReceiptDetail(run,'event-pact');
 assert.equal(pact.title,'The Closed Eye');assert.equal(pact.kind,'event');
 assert.match(pact.markup,/Original encounter/);assert.match(pact.markup,/38%/);assert.match(pact.markup,/Clear the next flight to win/);assert.match(pact.markup,/leave the pact freely/);
 assert.doesNotMatch(pact.markup,/<h3>The Closed Eye<\/h3>/);
 const challenge=flightRewardReceiptDetail(run,'challenge');
 assert.equal(challenge.title,'Wayfinder');assert.match(challenge.markup,/all 3 gold gates/);assert.match(challenge.markup,/Stored Sparks/);
 assert.ok(flightRewardReceiptDetail(run,'source-exit').terms.includes('packing'));
 assert.match(flightRewardReceiptDetail(run,'event-chest').markup,/Tollkeeper’s Strongbox/);
});

test('new clear source snapshots preserve the actual rank for later inspection',()=>{
 const run=cleared();
 for(const source of run.lastFlight.cardClearReceipt.sources){
  assert.equal(source.rank,run.mountedCards.find(card=>card?.instanceId===source.instanceId)?.rank||1);
 }
});
