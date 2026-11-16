import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { makeSkillCard, cleanCardRun, isInventoryOnlyCard, getCardModifiers, getEffectiveCardSources } from '../dist/skill-cards.mjs';
import { cardsBenchMarkup, cardRewardMarkup, cardForgeMarkup, starterGiftConfirmationMarkup, cardGrowConfirmationMarkup } from '../dist/card-ui.mjs';

function fresh(seed = 'inventory-camp') {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  return state;
}
function rest(run) {
  run.current = run.map.flat().find(node => node.kind === 'camp');
  run.step = run.current.row; run.path = [run.current.id]; run.phase = 'support';
}

test('legacy mounted Rest cards move to inventory exactly once with rank and uses intact', () => {
  const state = fresh(), run = state.run;
  const seed = { ...makeSkillCard('growth-seed-legendary', 'old:seed'), rank: 2 };
  const ember = makeSkillCard('camp-kit', 'old:ember');
  const pocket = { ...makeSkillCard('spark-cache', 'old:pocket'), charges: 2 };
  run.mountedCards = [seed, ember, pocket]; run.reserveCards = [makeSkillCard('camp-kit', 'old:extra')];
  cleanCardRun(run); cleanCardRun(run);
  assert.deepEqual(run.mountedCards, [null, null, pocket]);
  assert.deepEqual(run.reserveCards.map(card => card.instanceId), ['old:extra', 'old:seed', 'old:ember']);
  assert.deepEqual(run.reserveCards.find(card => card.instanceId === seed.instanceId), seed);
  assert.equal(run.reserveCards.find(card => card.instanceId === ember.instanceId).charges, 1);
  let saved; M.saveState(state, { setItem: (_, value) => { saved = value; } });
  const loaded = M.loadState({ getItem: () => saved }).run;
  assert.deepEqual(loaded.mountedCards, run.mountedCards); assert.deepEqual(loaded.reserveCards, run.reserveCards);
  assert.equal(M.equipOwnedCard(loaded, seed.instanceId, 0), false);
  assert.equal(M.equipOwnedCard(loaded, ember.instanceId, 0), false);
  assert.ok(M.equipOwnedCard(loaded, 'old:extra', 0) === false);
});

test('inventory-only metadata excludes only Rest cards and preserves true flight consumables', () => {
  const state = fresh(), run = state.run;
  for (const id of ['growth-seed-common', 'growth-seed', 'growth-seed-legendary', 'camp-kit']) assert.equal(isInventoryOnlyCard(makeSkillCard(id, id)), true);
  for (const id of ['spark-cache', 'heart-stitch', 'twin-wick']) assert.equal(isInventoryOnlyCard(makeSkillCard(id, id)), false);
  run.reserveCards.push(makeSkillCard('spark-cache', 'flight:limited'));
  assert.ok(M.equipOwnedCard(run, 'flight:limited', 0)); assert.equal(run.mountedCards[0].charges, 6);
  run.mountedCards = [makeSkillCard('echo-iii', 'copy'), makeSkillCard('growth-seed', 'legacy:seed'), null];
  assert.equal(getEffectiveCardSources(run).some(source => source.def.kind === 'camp-grow'), false);
  assert.equal(getCardModifiers(run).cardGrowSources, 1);
});

test('reward, collection, reader, Forge and starter never offer a Rest card an active slot', () => {
  const state = fresh(), run = state.run, seed = makeSkillCard('growth-seed-common', 'ui:seed');
  run.reserveCards.push(seed); rest(run); run.condensedGlow = 100;
  run.cardReward = { id: 'ui:reward', source: 'flight', card: seed, claimed: true };
  const reward = cardRewardMarkup(run, { equipping: true });
  assert.doesNotMatch(reward, /data-action="card-reward-(?:equip|slot)"|data-deck-drag-id|data-deck-drop/);
  assert.match(reward, /3\/3 shared Grow actions remaining/);
  const gallery = cardsBenchMarkup(state, { browsing: true });
  assert.match(gallery, /Rest · from Deck/); assert.doesNotMatch(gallery, /data-deck-drag-id="ui:seed"/);
  const reader = cardsBenchMarkup(state, { selectedId: seed.instanceId, inspecting: true, equip: true });
  assert.doesNotMatch(reader, /data-action="card-equip"|card-deck-equipping|Choose a slot/);
  assert.match(reader, /In Deck · available at Rest/);
  const forge = cardForgeMarkup(run, { ...M.getCardForgePreview(run), card: M.getOwnedCards(run).find(card => card.instanceId === seed.instanceId) });
  assert.match(forge, /Available at Rest directly from your Deck/); assert.doesNotMatch(forge, /Equip the new card/);
  let starter;
  for (let index = 0; index < 100 && !starter; index++) {
    const candidate = fresh(`inventory-starter:${index}`);
    candidate.run.cardStarterVersion = 2;
    delete candidate.run.cardStarterOfferIds;
    const gift = M.getStartingGiftOffers(candidate.run).find(offer => offer.cardId === 'camp-kit');
    if (gift) starter = { candidate, gift };
  }
  assert.ok(starter); const preview = M.getStartingGiftPreview(starter.candidate.run, starter.gift.id);
  assert.match(starterGiftConfirmationMarkup(starter.candidate.run, preview, false), /stays in your Deck/);
  assert.ok(M.chooseStartingGift(starter.candidate, starter.gift.id, preview.token));
  assert.equal(starter.candidate.run.mountedCards.filter(Boolean).length, 1);
  assert.equal(starter.candidate.run.reserveCards[0].cardId, 'camp-kit');
});

test('Grow review explains its exact result and costs without changing inventory or shared actions', () => {
  const state = fresh(), run = state.run;
  run.reserveCards.push(makeSkillCard('growth-seed', 'confirm:seed'), makeSkillCard('camp-kit', 'confirm:ember'));
  rest(run); run.flame = 10;
  assert.ok(M.resolveSupport(run, M.getSupportChoices(run).findIndex(offer => offer.effect?.rest === 'recover')));
  const before = structuredClone(run), camp = M.getCardCampPreview(run), grow = camp.actions.find(offer => offer.key === 'grow');
  const markup = cardGrowConfirmationMarkup(run, camp, grow);
  assert.deepEqual(run, before);
  assert.match(markup, /Uses 1 Rest action and 1 shared Grow action/); assert.match(markup, /3 → 2 of 3/);
  assert.match(markup, /Spends 1 Second Ember use/); assert.match(markup, /data-action="card-cancel-grow"/);
  assert.ok(grow.token); assert.ok(M.resolveSupport(run, grow.index));
  assert.equal(run.cardGrowUses, 1); assert.equal(run.reserveCards.some(card => card.cardId === 'camp-kit'), false);
});
