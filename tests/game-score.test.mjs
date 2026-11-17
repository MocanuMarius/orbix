import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {SCORE_BOOK_KEY,completedGameScore,readScoreBook,recordCompletedGameScore} from '../dist/game-score.mjs';
import {cleanScorecard,scorecardLink,scorecardFromHash} from '../dist/scorecard.mjs';
import {GAME_VERSION} from '../dist/build-version.mjs';
import {flightRewardCeremonyReceipt} from '../dist/flight-reward-ceremony.mjs';
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)}};
const fresh=(seed='scoring',ascension=1)=>{const state=M.newState();state.profile.tutorialComplete=true;state.profile.difficulty=ascension;state.run=M.createRun(state.profile,seed,ascension,{cards:true});M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);return state;};
function enter(state){const r=state.run,node=M.getChoices(r).find(n=>n.type!=='support');assert.ok(M.selectNode(r,node.id));assert.ok(M.beginFlightAttempt(r));assert.ok(M.markFlightAttemptStarted(r));return node;}
function lose(state){state.run.lives=1;enter(state);assert.ok(M.finishFlight(state.run,{success:false,condensedGlow:999,resonanceStored:999}));assert.ok(M.bankRun(state));}

test('score counts banked clear/overflow once, survives spending, excludes failed pickup farming and melts',()=>{
 const state=fresh(),r=state.run;assert.equal(r.scoreLedger.earned,0,'starting wallet is not earned');
 enter(state);assert.ok(M.finishFlight(r,{success:true,flame:50,condensedGlow:7,resonanceStored:3}));M.settleCheckpoint(state);
 const expected=r.lastFlight.securedCondensedGlow;assert.ok(expected>7);assert.equal(r.scoreLedger.earned,expected);
 M.settleCheckpoint(state);assert.equal(r.scoreLedger.earned,expected);
 // Resolve the saved draft, then spend/melt through the actual deck model.
 const draft=M.getCardDraft(r);assert.ok(M.chooseCardDraft(state,draft.id,draft.offers[0].instanceId));r.cardReward.uiAcknowledged=true;
 r.reserveCards.push(makeSkillCard('body-spark','score:melt'));const melt=M.getCardMeltPreview(r,['score:melt']);assert.ok(melt.eligible);assert.ok(M.meltOwnedCards(state,['score:melt'],melt.token));
 assert.equal(r.scoreLedger.earned,expected,'melting adds wallet but never score');
 r.condensedGlow=0;lose(state);assert.equal(r.endScore.earned,expected,'wallet spending and fatal pickup results do not deduct or inflate score');
 assert.equal(r.endScore.outcome,'lost');assert.equal(r.endScore.version,GAME_VERSION);
});

test('Closed Eye uncapped packing bonus reaches wallet, score and reward ceremony exactly once across reloads',()=>{
 const storage=memory(),state=fresh('closed-eye-score'),r=state.run;
 r.nextFlightPact='blind-pilgrim';r.mountedCards=[makeSkillCard('tight-packing','contract:packing')];
 const wallet=r.condensedGlow;enter(state);
 assert.ok(M.finishFlight(r,{success:true,flame:100,condensedGlow:999}));
 const f=r.lastFlight,packed=f.pickupCondensedGlow+f.exitPacking.amount;
 assert.equal(f.pickupCondensedGlow,20,'base overflow allowance stays capped');
 assert.equal(f.pactBonus,packed*2);assert.ok(f.pactBonus>40);
 assert.ok(f.cardPackingBonus>0,'Tight Packing bonus is separate from contract multiplication');
 const earned=f.completionBonus+packed+f.cardPackingBonus+f.pactBonus;
 assert.equal(r.scoreLedger.earned,f.securedCondensedGlow,'score follows secured income, including ordinary automatic settlement');
 M.settleCheckpoint(state);
 assert.equal(r.condensedGlow,wallet+earned);assert.equal(r.scoreLedger.earned,earned);
 const receipt=flightRewardCeremonyReceipt(r);
 assert.equal(receipt.total,earned);assert.equal(receipt.bonusRows.find(row=>row.label==='The Closed Eye').amount,f.pactBonus);
 assert.ok(M.saveState(state,storage));const loaded=M.loadState(storage);
 M.settleCheckpoint(loaded);assert.equal(loaded.run.scoreLedger.earned,earned);
 assert.equal(loaded.run.condensedGlow,wallet+earned);
 assert.equal(M.finishFlight(loaded.run,{success:true,condensedGlow:999}),false);
});

test('a failed Closed Eye attempt grants no packing multiplier and cannot inflate completed score',()=>{
 const state=fresh('closed-eye-failure'),r=state.run;r.nextFlightPact='blind-pilgrim';
 r.scoreLedger.earned=17;lose(state);
 assert.equal(r.endScore.earned,17);assert.equal(r.lastFlight?.pactBonus,undefined);
});
test('scorebook is independent, stable on repeat save/load, keeps Ascension and overall bests',()=>{
 const storage=memory(),state=fresh();lose(state);assert.ok(M.saveState(state,storage));const first=storage.getItem(SCORE_BOOK_KEY);
 assert.ok(first);const score=state.run.endScore;assert.equal(score.comparison.ascensionNew,true);assert.equal(score.comparison.overallNew,true);
 M.saveState(state,storage);const loaded=M.loadState(storage);assert.equal(storage.getItem(SCORE_BOOK_KEY),first);assert.deepEqual(loaded.run.endScore,score);
 storage.removeItem(M.SAVE_KEY);assert.equal(readScoreBook(storage).overall.runId,state.run.id,'campaign reset cannot erase best');
 const high=fresh('higher');high.run.scoreLedger.earned=500;lose(high);M.saveState(high,storage);
 const tier=fresh('other-tier',2);tier.run.scoreLedger.earned=200;lose(tier);M.saveState(tier,storage);
 const book=readScoreBook(storage);assert.equal(book.overall.earned,500);assert.equal(book.ascensions[1].earned,500);assert.equal(book.ascensions[2].earned,200);assert.equal(tier.run.endScore.comparison.overallNew,false);
});
test('abandon, test, tutorial and migrated partial Games cannot set bests',()=>{
 const storage=memory();const abandoned=fresh('abandon');abandoned.run.scoreLedger.earned=1000;assert.ok(M.abandonRun(abandoned));M.saveState(abandoned,storage);assert.equal(completedGameScore(abandoned.run),null);assert.equal(storage.getItem(SCORE_BOOK_KEY),null);
 const partial=fresh('old-save');delete partial.run.scoreLedger;M.saveState(partial,storage);const loaded=M.loadState(storage);assert.equal(loaded.run.scoreLedger.complete,false);lose(loaded);M.saveState(loaded,storage);assert.equal(loaded.run.endScore.complete,false);assert.equal(storage.getItem(SCORE_BOOK_KEY),null);
 const testState=fresh('test');testState.run.testMode=true;lose(testState);M.saveState(testState,storage);assert.equal(testState.run.endScore,undefined);assert.equal(storage.getItem(SCORE_BOOK_KEY),null);
});
test('support purses earn score, resource sales do not, and replayed support choice is refused',()=>{
 for(const [eventIndex,id,expected] of [[5,'archive-packed',16],[1,'bargain',0],[8,'bargain-burden',0]]){
  const state=fresh('support:'+eventIndex),r=state.run;const node=r.map.flat().find(n=>n.type==='support'&&n.kind!=='camp');Object.assign(node,{kind:'event',eventIndex,eventEdition:3});Object.assign(r,{current:node,step:node.row,phase:'support',path:[node.id],flame:100});r.nextFlightPact='night-ledger';delete r.supportOffers;
  const index=M.getSupportChoices(r).findIndex(c=>c.id===id);assert.ok(index>=0,id);assert.ok(M.resolveSupport(r,index));assert.equal(r.scoreLedger.earned,expected,id);assert.equal(M.resolveSupport(r,index),false);
 }
});
test('stateless share payload is bounded, keeps producing version, rejects malformed/hostile inputs',()=>{
 const state=fresh();state.run.scoreLedger.earned=321;lose(state);recordCompletedGameScore(state.run,memory());
 const link=scorecardLink(state.run.endScore,'https://example.com/game/game.html?cards=1'),url=new URL(link),card=scorecardFromHash(url.hash);
 assert.equal(url.pathname,'/game/scorecard.html');assert.equal(url.search,'');assert.equal(card.earned,321);assert.equal(card.version,GAME_VERSION);assert.equal(card.runId,undefined);
 for(const bad of [null,{}, {...card,earned:-1},{...card,earned:Infinity},{...card,earned:1000000000},{...card,ascension:0},{...card,version:'<img>'},{...card,version:'x'.repeat(41)},{...card,comparison:{...card.comparison,overallBest:0}}])assert.equal(cleanScorecard(bad),null);
 assert.equal(scorecardFromHash('#card='+encodeURIComponent(JSON.stringify(card))+'&card={}'),null);assert.equal(scorecardFromHash('#card='+encodeURIComponent(JSON.stringify(card))+'&run=import'),null);assert.equal(scorecardFromHash('x'.repeat(1801)),null);
});
