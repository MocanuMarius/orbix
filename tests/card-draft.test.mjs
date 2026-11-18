import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {drawSkillCardDraft, makeSkillCard, SKILL_CARDS} from '../dist/skill-cards.mjs';
import {cardDraftMarkup, cardRewardMarkup} from '../dist/card-ui.mjs';

function fresh(seed = 'three-card-draft') {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, {cards: true});
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id));
  return state;
}
function reload(state) {
  let text; const storage = {getItem: () => text, setItem: (_, value) => { text = value; }};
  assert.ok(M.saveState(state, storage)); return M.loadState(storage);
}
function clear(state, node = M.getChoices(state.run).find(node => node.type !== 'support')) {
  assert.ok(M.selectNode(state.run, node.id)); assert.ok(M.beginFlightAttempt(state.run));
  assert.ok(M.markFlightAttemptStarted(state.run));
  assert.ok(M.finishFlight(state.run, {success: true, flame: 50})); M.settleCheckpoint(state);
  return M.getCardDraft(state.run);
}
const owned = run => M.getOwnedCards(run).map(card => card.instanceId).sort();
const rightOfDream = run => run.mountedCards.some((card, i) => card && run.mountedCards[i - 1] && SKILL_CARDS[run.mountedCards[i - 1].cardId].kind === 'dream');

test('ordinary, elite and guardian clears save three distinct offers without granting them', () => {
  for (const tier of ['normal', 'elite', 'boss']) {
    let state = fresh(`draft:${tier}`), run = state.run;
    const node = M.getChoices(run).find(node => node.type !== 'support');
    if (tier !== 'normal') node[tier] = true;
    assert.equal(rightOfDream(run), false, 'the starter Chain never puts a card to the right of Dream');
    const before = owned(run), draft = clear(state, node), wallet = run.condensedGlow;
    assert.equal(draft.offers.length, 3);
    assert.equal(new Set(draft.offers.map(card => card.cardId)).size, 3);
    assert.equal(new Set(draft.offers.map(card => card.name)).size, 3);
    assert.deepEqual(owned(run), before);
    assert.equal(run.cardReward, undefined);
    assert.equal(M.getRouteMapState(run).availableIds.length, 0);
    assert.equal(M.selectNode(run, M.getChoices(run)[0]?.id), false);
    assert.equal(M.acknowledgeVictory(state), false);
    const snapshot = JSON.stringify(run);
    M.getCardDraft(run); M.getCardReward(run); M.getOwnedCards(run);
    assert.equal(JSON.stringify(run), snapshot, 'reading offers never claims one');
    state = reload(state); run = state.run;
    assert.deepEqual(M.getCardDraft(run), draft);
    assert.deepEqual(owned(run), before);
    assert.equal(run.condensedGlow, wallet);
    const pick = draft.offers[1];
    assert.equal(M.chooseCardDraft(state, 'stale-draft', pick.instanceId), false);
    assert.equal(M.chooseCardDraft(state, draft.id, 'not-offered'), false);
    assert.ok(M.chooseCardDraft(state, draft.id, pick.instanceId));
    assert.equal(M.getCardDraft(run), null);
    assert.deepEqual(owned(run), [...before, pick.instanceId].sort());
    assert.equal(run.cardReward.card.cardId, pick.cardId);
    assert.equal(run.cardReward.claimed, true);
    assert.equal(run.condensedGlow, wallet);
    assert.equal(M.chooseCardDraft(state, draft.id, draft.offers[2].instanceId), false);
    assert.equal(M.chooseCardDraft(state, draft.id, pick.instanceId), false);
    assert.equal(run.cardHistory.filter(event => event.type === 'drop').length, 1);
    state = reload(state); run = state.run;
    assert.deepEqual(owned(run), [...before, pick.instanceId].sort());
    assert.equal(M.chooseCardDraft(state, draft.id, pick.instanceId), false);
  }
});

test('drafts preserve the seeded tier bias, starter pool and early Growth Seed opportunity', () => {
  const totals = {};
  for (const tier of ['normal', 'elite', 'boss']) {
    totals[tier] = {common: 0, rare: 0, legendary: 0};
    for (let seed = 0; seed < 1800; seed++) {
      const run = {campaignSeed: `draft-distribution:${seed}`, mapIndex: 0}, node = {id: 'draft', [tier]: true},
        before = JSON.stringify(run), offers = drawSkillCardDraft(run, node);
      assert.deepEqual(drawSkillCardDraft(run, node), offers);
      assert.equal(JSON.stringify(run), before);
      assert.equal(new Set(offers.map(card => SKILL_CARDS[card.cardId].name)).size, 3);
      for (const card of offers) {
        const def = SKILL_CARDS[card.cardId]; assert.ok(!def.starterOnly); totals[tier][def.rarity]++;
      }
    }
  }
  // Elite reward: slot 1 is a Rare. Guardian reward: slot 1 is a Legendary. Other slots roll flat. Ordinary rounds roll flat 94.5/5/0.5.
  assert.ok(totals.elite.rare >= 1800 && totals.elite.rare < 1800 * 1.2 && totals.elite.legendary < 1800 * .03);
  assert.ok(totals.boss.legendary >= 1800 && totals.boss.legendary < 1800 * 1.1 && totals.boss.rare < 1800 * .2);
  assert.ok(totals.normal.common > 1800 * 3 * .9 && totals.normal.rare > 1800 * 3 * .03);
  const state = fresh('draft-growth-safeguard'), run = state.run;
  run.mountedCards = [null, null, null]; run.reserveCards = [];
  run.cardHistory = [{type: 'drop', mapIndex: 0, nodeId: 'prior', card: {cardId: 'body-spark', rarity: 'common'}}];
  let protectedOffer = false;
  for (let i = 0; i < 30; i++) {
    const offers = drawSkillCardDraft(run, {id: `seed-opportunity:${i}`});
    if (SKILL_CARDS[offers[0].cardId].rarity === 'common') {
      assert.equal(offers[0].cardId, 'growth-seed-common'); protectedOffer = true;
    }
  }
  assert.ok(protectedOffer);
});

test('legacy earned receipts stay earned and never acquire a replacement draft', () => {
  let state = fresh('draft-old-save'), run = state.run;
  const card = makeSkillCard('spark-cache', 'legacy-earned');
  run.cardReward = {id: card.instanceId, card, source: 'flight', claimed: false};
  run.cardRewardedNodes = ['0:prior'];
  state = reload(state); run = state.run;
  assert.equal(M.getCardDraft(run), null);
  assert.equal(run.cardReward.claimed, true);
  assert.equal(owned(run).filter(id => id === card.instanceId).length, 1);
  assert.ok(M.meltOwnedCards(state, [card.instanceId]));
  state = reload(state); run = state.run;
  assert.ok(!owned(run).includes(card.instanceId));
  assert.equal(M.getCardDraft(run), null);
  assert.equal(run.cardReward.choice, 'deck');
});

test('a final guardian draft survives reload before banking and preserves the actual winning hand', () => {
  let state = fresh('draft-final'), run = state.run;
  run.mapIndex = 2;
  const node = run.map.at(-1).find(node => node.boss), winning = makeSkillCard('growth-ring', 'winning-ring');
  Object.assign(run, {step: node.row, path: [], phase: 'briefing', current: node,
    mountedCards: [winning, null, null]});
  const beforeCapacity = run.cardFutureCapacity;
  assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, {success: true, flame: 30})); M.settleCheckpoint(state);
  assert.equal(run.cardFutureCapacity, beforeCapacity, 'Growth Ring keeps its gain on the card');
  const draft = M.getCardDraft(run), hand = structuredClone(run.winningHand), receipt = structuredClone(run.lastFlight.cardClearReceipt);
  assert.ok(draft.final); assert.equal(M.bankRun(state), false);
  state = reload(state); run = state.run;
  assert.equal(run.banked, false); assert.deepEqual(M.getCardDraft(run), draft);
  assert.ok(M.chooseCardDraft(state, draft.id, draft.offers[2].instanceId));
  assert.equal(run.cardReward.trophy, true);
  assert.deepEqual(run.winningHand, hand);
  assert.deepEqual(run.lastFlight.cardClearReceipt, receipt);
  assert.equal(run.cardFutureCapacity, beforeCapacity);
  assert.ok(cardRewardMarkup(run).includes('FINAL GUARDIAN'));
  assert.doesNotMatch(cardRewardMarkup(run), /data-action="card-reward-equip"|data-action="card-preview-reward-melt"/);
  if (run.flightReward && !run.flightReward.claimed) assert.ok(M.chooseFlightReward(state, run.flightReward.offers[0]));
  assert.ok(M.acknowledgeVictory(state)); assert.equal(M.bankRun(state), false);
  run.cardReward.uiAcknowledged = true; assert.ok(M.bankRun(state));
  state = reload(state); assert.deepEqual(state.run.winningHand, hand);
  assert.equal(state.profile.cardFutureCapacity, 0);
});

test('a failed attempt has no draft and draft markup uses the shared full portrait renderer', () => {
  const state = fresh('draft-failure'), run = state.run, node = M.getChoices(run)[0];
  assert.ok(M.selectNode(run, node.id)); assert.ok(M.beginFlightAttempt(run));
  assert.ok(M.finishFlight(run, {success: false, flame: 0}));
  assert.equal(M.getCardDraft(run), null);
  const success = fresh('draft-render'); clear(success);
  const markup = cardDraftMarkup(success.run);
  assert.equal((markup.match(/class="skill-card /g) || []).length, 3);
  assert.equal((markup.match(/data-action="card-draft-pick"/g) || []).length, 3);
  assert.match(markup, /Tap a card, tap again to take it\./);
  assert.doesNotMatch(markup, /<button[^>]*>Choose /, 'no per-card Choose buttons');
  assert.equal((markup.match(/data-tap-pick(?=[ >])/g) || []).length, 3, 'each offer is a tap-to-pick item');
});

test('a Dream starter gift goes last in the starter Chain, so take-off devours nothing', () => {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, 'dream-starter', 1, {cards: true});
  const offer = M.getStartingGiftOffers(state.run).find(gift => gift.cardId === 'dream');
  if (!offer) return; // this seed does not offer Dream
  assert.ok(M.chooseStartingGift(state, offer.id));
  assert.equal(rightOfDream(state.run), false);
  assert.deepEqual(state.run.mountedCards.filter(Boolean).map(c => c.cardId).sort(), ['dream', 'lift-guide']);
});
