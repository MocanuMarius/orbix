import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CARD_SYSTEM,STARTER_CARD_IDS,getCardStarterOffers} from '../dist/skill-cards.mjs';
import {starterCardsMarkup} from '../dist/card-ui.mjs';

const fresh=seed=>{const state=M.newState();state.profile.tutorialComplete=true;state.run=M.createRun(state.profile,seed,1,{cards:true});return state;};
const reload=state=>{let value;const storage={setItem:(_,next)=>value=next,getItem:()=>value};assert.ok(M.saveState(state,storage));return M.loadState(storage);};

test('opening offers are 3 distinct cards from the six starter cards, all Common, in a seeded order independent of Ascension',()=>{
  const count=3000,seen={},positions=[0,0,0];
  for(let seed=0;seed<count;seed++){
    const run={skillSystem:CARD_SYSTEM,cardStarterVersion:3,campaignSeed:`starter-distribution-${seed}`,difficulty:1};
    const offers=getCardStarterOffers(run);
    assert.equal(offers.length,3);
    assert.equal(new Set(offers.map(gift=>gift.cardId)).size,3);
    assert.ok(offers.every(gift=>STARTER_CARD_IDS.includes(gift.cardId)&&gift.rarity==='common'));
    assert.deepEqual(getCardStarterOffers({...run,difficulty:6}),offers);
    offers.forEach((gift,i)=>{seen[gift.cardId]=(seen[gift.cardId]||0)+1;if(gift.cardId==='lift-guide')positions[i]++;});
  }
  assert.deepEqual(Object.keys(seen).sort(),[...STARTER_CARD_IDS].sort());
  for(const id of STARTER_CARD_IDS)assert.ok(Math.abs(seen[id]/count-.5)<.04,`${id} is offered about half the time: ${seen[id]/count}`);
  assert.ok(positions.every(n=>n>count*.1),positions.join(','));
});

test('fresh offers retain their order through save, inspection and rejected confirmation; only one choice commits',()=>{
  const state=fresh('fixed-three-starter'),offers=M.getStartingGiftOffers(state.run),before=JSON.stringify(state.run);
  assert.equal(state.run.cardStarterVersion,3);
  assert.deepEqual(state.run.cardStarterOfferIds,offers.map(gift=>gift.cardId));
  assert.equal((starterCardsMarkup(state.run,offers,false).match(/class="card-pick"/g)||[]).length,3);
  for(const offer of offers){
    const preview=M.getStartingGiftPreview(state.run,offer.id);assert.ok(preview);
    assert.equal(M.chooseStartingGift(state,offer.id,preview.token+'stale'),false);
    assert.equal(JSON.stringify(state.run),before);
  }
  const loaded=reload(state);
  assert.deepEqual(M.getStartingGiftOffers(loaded.run),offers);
  const chosen=offers.find(o=>o.cardId!=='lift-guide'),preview=M.getStartingGiftPreview(loaded.run,chosen.id);
  assert.ok(M.chooseStartingGift(loaded,chosen.id,preview.token));
  assert.deepEqual(M.getOwnedCards(loaded.run).map(card=>card.cardId).sort(),[chosen.cardId,'lift-guide'].sort());
  assert.equal(loaded.run.mountedCards.filter(Boolean).length,2);
  for(const offer of offers)assert.equal(M.chooseStartingGift(loaded,offer.id),false);
  const resumed=reload(loaded);
  assert.equal(M.chooseStartingGift(resumed,chosen.id),false);
  assert.deepEqual(M.getOwnedCards(resumed.run).map(card=>card.cardId).sort(),[chosen.cardId,'lift-guide'].sort());
});

test('every starter card really equips from a production New Game offer and turns its effect on',()=>{
  const pending=new Set(STARTER_CARD_IDS),flag={'skim-line':'cardSkimLine','pulse-reader':'cardPulseReader','courier-cord':'cardCourierCord','meter-mark':'cardMeterMark','finish-flag':'cardFinishFlag','lift-guide':'cardLiftGuide'};
  for(let seed=0;seed<300&&pending.size;seed++){
    const state=fresh(`starter-useful-${seed}`);
    for(const gift of M.getStartingGiftOffers(state.run))if(pending.has(gift.cardId)){
      const selected=structuredClone(state);assert.ok(M.chooseStartingGift(selected,gift.id));
      const ids=selected.run.mountedCards.filter(Boolean).map(card=>card.cardId);
      assert.equal(ids.length,2);assert.ok(ids.includes(gift.cardId));assert.ok(new Set(ids).size===2,'two different cards');
      const mods=M.getRunModifiers(selected.run);
      assert.ok(mods[flag[gift.cardId]],gift.cardId);
      if(gift.cardId!=='lift-guide')assert.equal(ids[1],'lift-guide','Lift Guide is still the guaranteed second card');
      pending.delete(gift.cardId);
    }
  }
  assert.equal(pending.size,0,[...pending].join(','));
});

test('old v2 pending offers keep their seeded pair and reject a hidden legacy Guide choice',()=>{
  const state=fresh('old-pair-kept');state.run.cardStarterVersion=2;delete state.run.cardStarterOfferIds;
  const offers=M.getStartingGiftOffers(state.run);
  assert.equal(offers.length,2);assert.ok(offers.every(gift=>gift.rarity==='common'&&gift.cardId!=='dream'));
  assert.deepEqual(M.getStartingGiftOffers(reload(state).run),offers);
  assert.equal(M.chooseStartingGift(state,'card:lift-guide'),false);
  assert.ok(M.chooseStartingGift(state,offers[0].id));
});
