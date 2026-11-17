import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {advanceFlightRewardCeremony,flightRewardCeremonyStage,flightRewardCeremonyMarkup,flightRewardCeremonyReceipt,hasFlightRewardCeremony} from '../dist/flight-reward-ceremony.mjs';

function cleared(){
 const state=M.newState();state.profile.tutorialComplete=true;
 state.run=M.createRun(state.profile,'flight-reward-ceremony',1,{cards:true});
 M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);
 const node=M.getChoices(state.run).find(node=>node.type!=='support');
 M.selectNode(state.run,node.id);M.beginFlightAttempt(state.run);M.markFlightAttemptStarted(state.run);
 M.finishFlight(state.run,{success:true,flame:50});M.settleCheckpoint(state);
 return state;
}
function reload(state){let saved;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};M.saveState(state,storage);return M.loadState(storage);}
test('ceremony advances saved presentation without granting cards, currency, or rerolling offers',()=>{
 let state=cleared(),run=state.run;
 const id=run.cardDraft.id,offers=structuredClone(run.cardDraft.offers),wallet=run.condensedGlow,owned=M.getOwnedCards(run),history=run.cardHistory.length;
 assert.equal(flightRewardCeremonyStage(run),'income');
 assert.equal(advanceFlightRewardCeremony(run,id,'cards'),false,'a sealed pack cannot skip straight to a claim');
 assert.doesNotMatch(flightRewardCeremonyMarkup(run),/data-action="card-draft-pick"/);
 assert.equal(advanceFlightRewardCeremony(run,'stale','pack'),false);
 assert.equal(advanceFlightRewardCeremony(run,id,'pack'),true);
 state=reload(state);run=state.run;
 assert.equal(flightRewardCeremonyStage(run),'pack');
 const pack=flightRewardCeremonyMarkup(run);
 assert.equal((pack.match(/data-action="flight-reward-open-pack"/g)||[]).length,1);
 assert.doesNotMatch(pack,/data-action="card-draft-pick"/);
 assert.equal(advanceFlightRewardCeremony(run,id,'cards'),true);
 state=reload(state);run=state.run;
 assert.equal(flightRewardCeremonyStage(run),'cards');
 assert.equal((flightRewardCeremonyMarkup(run).match(/data-action="card-draft-pick"/g)||[]).length,3);
 assert.equal(advanceFlightRewardCeremony(run,id,'pack'),false);
 assert.deepEqual(run.cardDraft.offers,offers);
 assert.equal(run.condensedGlow,wallet);
 assert.deepEqual(M.getOwnedCards(run),owned);
 assert.equal(run.cardHistory.length,history);
 assert.equal(M.settleCheckpoint(state),0);
 assert.equal(run.condensedGlow,wallet);
});
test('receipt includes only settled flight income and separates real optional amounts',()=>{
 const state=cleared(),run=state.run,before=JSON.stringify(run),receipt=flightRewardCeremonyReceipt(run);
 assert.equal(receipt.total,run.lastFlight.securedCondensedGlow);
 assert.equal(receipt.base+receipt.bonus,receipt.total);
 assert.equal(receipt.wallet,run.condensedGlow);
 assert.equal(JSON.stringify(run),before,'reading the presentation is pure');
 const unsettled=structuredClone(run);unsettled.lastFlight.securedCondensedGlow=0;
 assert.equal(flightRewardCeremonyReceipt(unsettled).total,0);
 const optional=structuredClone(run);optional.lastFlight.routeBonus={amount:7,message:'A real completed route bonus'};optional.lastFlight.securedCondensedGlow+=7;
 assert.equal(flightRewardCeremonyReceipt(optional).bonus,7);
 assert.ok(flightRewardCeremonyReceipt(optional).notes.includes('A real completed route bonus'));
});
test('practice, stale drafts and old earned-card receipts do not start a ceremony',()=>{
 const state=cleared(),run=state.run;
 run.isTutorial=true;assert.equal(hasFlightRewardCeremony(run),false);
 run.isTutorial=false;run.lastFlight.nodeId='different-flight';assert.equal(hasFlightRewardCeremony(run),false);
 delete run.cardDraft;assert.equal(flightRewardCeremonyStage(run),null);assert.equal(flightRewardCeremonyMarkup(run),'');
});
