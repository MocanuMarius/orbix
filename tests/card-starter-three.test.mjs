import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CARD_SYSTEM,CARD_STARTER_RARE_CHANCE,getCardStarterOffers} from '../dist/skill-cards.mjs';
import {starterCardsMarkup} from '../dist/card-ui.mjs';

const fresh=seed=>{const state=M.newState();state.profile.tutorialComplete=true;state.run=M.createRun(state.profile,seed,1,{cards:true});return state;};
const reload=state=>{let value;const storage={setItem:(_,next)=>value=next,getItem:()=>value};assert.ok(M.saveState(state,storage));return M.loadState(storage);};

test('opening Rare odds are per lineup, distinct, self-sufficient and independent of Ascension',()=>{
  const count=6000,positions=[0,0,0],rares=new Set(),commons=new Set();
  let rareSets=0;
  for(let seed=0;seed<count;seed++){
    const run={skillSystem:CARD_SYSTEM,cardStarterVersion:3,campaignSeed:`starter-distribution-${seed}`,difficulty:1};
    const offers=getCardStarterOffers(run),rare=offers.filter(gift=>gift.rarity==='rare');
    assert.equal(offers.length,3);
    assert.equal(new Set(offers.map(gift=>gift.cardId)).size,3);
    assert.equal(new Set(offers.map(gift=>gift.name)).size,3);
    assert.ok(rare.length<=1);
    assert.ok(offers.every(gift=>['common','rare'].includes(gift.rarity)&&gift.cardId!=='lift-guide'));
    assert.ok(offers.some(gift=>gift.rarity==='common'&&['body','capacity','field'].includes(gift.card.kind)));
    assert.deepEqual(getCardStarterOffers({...run,difficulty:6}),offers);
    for(const gift of offers)(gift.rarity==='rare'?rares:commons).add(gift.cardId);
    if(rare.length){rareSets++;positions[offers.indexOf(rare[0])]++;}
  }
  assert.ok(Math.abs(rareSets/count-CARD_STARTER_RARE_CHANCE)<.015,`${rareSets}/${count}`);
  assert.deepEqual([...rares].sort(),['cache-handling','flash-handling','rhythm']);
  assert.ok(positions.every(countAtPosition=>countAtPosition>count*.05),positions.join(','));
  assert.ok(commons.has('dream'));
  assert.ok(!commons.has('echo')&&!commons.has('camp-kit'));
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
  const chosen=offers[2],preview=M.getStartingGiftPreview(loaded.run,chosen.id);
  assert.ok(M.chooseStartingGift(loaded,chosen.id,preview.token));
  assert.deepEqual(M.getOwnedCards(loaded.run).map(card=>card.cardId).sort(),[chosen.cardId,'lift-guide'].sort());
  assert.equal(loaded.run.mountedCards.filter(Boolean).length,2);
  for(const offer of offers)assert.equal(M.chooseStartingGift(loaded,offer.id),false);
  const resumed=reload(loaded);
  assert.equal(M.chooseStartingGift(resumed,chosen.id),false);
  assert.deepEqual(M.getOwnedCards(resumed.run).map(card=>card.cardId).sort(),[chosen.cardId,'lift-guide'].sort());
});

test('every curated Rare and Dream really equips from a production New Game offer',()=>{
  const pending=new Set(['rhythm','cache-handling','flash-handling','dream']);
  for(let seed=0;seed<300&&pending.size;seed++){
    const state=fresh(`starter-useful-${seed}`);
    for(const gift of M.getStartingGiftOffers(state.run))if(pending.has(gift.cardId)){
      const selected=structuredClone(state);assert.ok(M.chooseStartingGift(selected,gift.id));
      assert.deepEqual(selected.run.mountedCards.filter(Boolean).map(card=>card.cardId),gift.cardId==='dream'?['lift-guide','dream']:[gift.cardId,'lift-guide']); // Dream starts last: nothing to its right to Devour
      const mods=M.getRunModifiers(selected.run);
      if(gift.cardId==='rhythm')assert.ok(mods.cardRhythm);
      if(gift.cardId==='cache-handling')assert.ok(mods.cardCacheHandling);
      if(gift.cardId==='flash-handling')assert.ok(mods.cardFlashHandling);
      assert.ok(mods.cardLiftGuide);pending.delete(gift.cardId);
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
