import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { makeSkillCard, cleanCardRun, createCardExecution, executeCardBodyPickup, getCardCharges, CARD_UNIT } from '../dist/skill-cards.mjs';
import { getGlowCapacity } from '../dist/vitality.mjs';

const fresh = (seed = 'owned-card-deck') => {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  return state;
};
const reload = (state, raw = false) => {
  let data = JSON.stringify(state);
  const storage = { getItem: () => data, setItem: (_, value) => { data = value; } };
  if (!raw) assert.ok(M.saveState(state, storage));
  return M.loadState(storage);
};
const add = (run, type, id, extra = {}) => {
  const card = { ...makeSkillCard(type, id), ...extra };
  run.reserveCards.push(card);
  return card;
};
const finish = (state, result = {}, node = M.getChoices(state.run).find((n) => n.type !== 'support')) => {
  const run = state.run;
  assert.ok(M.selectNode(run, node.id));
  assert.ok(M.beginFlightAttempt(run));
  assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, { success: true, flame: 55, collected: 4, ...result }));
  M.settleCheckpoint(state);
  return node;
};
const rest = (state) => {
  const run = state.run, node = run.map.flat().find((n) => n.kind === 'camp');
  Object.assign(run, { current: node, step: node.row, path: [node.id], phase: 'support' });
  M.getSupportChoices(run);
};
const choose = (run, id) => M.resolveSupport(run, M.getSupportChoices(run).findIndex((choice) => choice.id === id));
const ownedIds = (run) => M.getOwnedCards(run).map((card) => card.instanceId).sort();

test('the deck retains arbitrary duplicates with independent ranks and uses across swaps and saves', () => {
  let state = fresh(), run = state.run;
  const first = add(run, 'spark-cache', 'copy:first', { charges: 2, rank: 2 }),
    second = add(run, 'spark-cache', 'copy:second', { charges: 5 });
  for (let i = 0; i < 300; i++) add(run, 'body-spark', `bulk:${i}`);
  const ids = ownedIds(run), wallet = run.condensedGlow;
  assert.equal(ids.length, 302);
  assert.ok(M.equipOwnedCard(run, first.instanceId, 1, null));
  assert.ok(M.equipOwnedCard(run, second.instanceId, 1, first.instanceId));
  assert.deepEqual(run.reserveCards.find((card) => card.instanceId === first.instanceId), first);
  assert.equal(run.mountedCards[1].charges, 5);
  assert.equal(M.equipOwnedCard(run, first.instanceId, 1, null), false, 'stale destination is rejected');
  assert.ok(M.unequipMountedCard(run, 1, second.instanceId));
  assert.equal(M.unequipMountedCard(run, 1, second.instanceId), false);
  assert.ok(M.equipOwnedCard(run, first.instanceId, 0));
  assert.ok(M.equipOwnedCard(run, second.instanceId, 2));
  assert.ok(M.equipOwnedCard(run, first.instanceId, 2));
  assert.equal(run.mountedCards[0].instanceId, second.instanceId);
  assert.equal(run.mountedCards[2].instanceId, first.instanceId);
  assert.equal(run.condensedGlow, wallet);
  assert.deepEqual(ownedIds(run), ids);
  state = reload(state); run = state.run;
  assert.deepEqual(ownedIds(run), ids);
  assert.equal(run.mountedCards[0].charges, 5);
  assert.equal(run.mountedCards[2].charges, 2);
  assert.equal(run.mountedCards[2].rank, 2);
  const described = M.getOwnedCards(run);
  assert.equal(described.find((card) => card.instanceId === first.instanceId).slot, 2);
  assert.equal(M.getReserveCards(run).length, 300);
});

test('stored capacity, harvest, packing, handling and adjacency have no effect until equipped', () => {
  const state = fresh(), run = state.run;
  for (const [id, type] of ['deep-vessel', 'harvest-legendary', 'tight-packing', 'cache-handling', 'flash-handling', 'chameleon'].entries()) add(run, type, `effect:${id}`);
  run.flame = 71;
  assert.equal(getGlowCapacity(run), 100);
  let modifiers = M.getRunModifiers(run);
  assert.equal(modifiers.cardHarvestMeter, 0);
  assert.equal(modifiers.cardPackingSources, 0);
  assert.equal(modifiers.cardCacheHandling, false);
  assert.equal(modifiers.cardFlashHandling, false);
  assert.ok(M.equipOwnedCard(run, 'effect:0', 1));
  assert.ok(M.equipOwnedCard(run, 'effect:5', 0));
  assert.equal(getGlowCapacity(run), 120);
  assert.equal(run.flame, 71);
  assert.ok(M.unequipMountedCard(run, 1));
  assert.equal(getGlowCapacity(run), 100);
  assert.equal(run.flame, 71);
  assert.match(M.getMountedCards(run)[0].copyPreview, /No card to the right/);
  modifiers = M.getRunModifiers(run);
  assert.deepEqual(modifiers.cardExecution.cards.filter(Boolean).map((card) => card.instanceId), ['effect:5']);
});

test('batch melt uses selected identities, warns about mounted cards, checks previews and commits once', () => {
  let state = fresh(), run = state.run;
  run.condensedGlow = 0;
  add(run, 'body-spark', 'common'); add(run, 'rhythm', 'rare'); add(run, 'harvest-legendary', 'legendary');
  add(run, 'spark-cache', 'keep', { charges: 1 });
  assert.ok(M.equipOwnedCard(run, 'common', 0));
  const ids = ['common', 'rare', 'legendary'], preview = M.getCardMeltPreview(run, ids);
  assert.equal(preview.amount, 70);
  assert.equal(preview.mountedCount, 1);
  assert.equal(preview.cards.find((card) => card.instanceId === 'common').mounted, true);
  let before = JSON.stringify(state);
  assert.equal(M.meltOwnedCards(state, ['common', 'missing']), false);
  assert.equal(M.meltOwnedCards(state, ['common', 'common']), false);
  assert.equal(M.meltOwnedCards(state, []), false);
  assert.equal(JSON.stringify(state), before);
  assert.ok(M.moveMountedCard(run, 0, 1));
  before = JSON.stringify(state);
  assert.equal(M.meltOwnedCards(state, ids, preview.token), false, 'a changed mounted preview must be reviewed');
  assert.equal(JSON.stringify(state), before);
  const current = M.getCardMeltPreview(run, ids);
  assert.ok(M.meltOwnedCards(state, ids, current.token));
  assert.equal(run.condensedGlow, 70);
  assert.deepEqual(ownedIds(run), ['keep']);
  assert.equal(M.meltOwnedCards(state, ids, current.token), false);
  assert.equal(run.condensedGlow, 70);
  state = reload(state); run = state.run;
  assert.equal(M.meltOwnedCards(state, ids), false);
  assert.equal(run.condensedGlow, 70);
  assert.equal(run.reserveCards[0].charges, 1);
});

test('reserve improvements charge the same wallet and preserve rank, uses, fuel and inactivity', () => {
  let state = fresh(), run = state.run;
  add(run, 'spark-cache', 'upgrade', { charges: 2 });
  run.condensedGlow = 14; run.flame = 37;
  rest(state);
  assert.equal(M.getCardImprovePreview(run, 'upgrade').price, 15);
  assert.equal(M.improveOwnedCard(state, 'upgrade', 1), false);
  run.condensedGlow = 45;
  const melt = M.getCardMeltPreview(run, ['upgrade']);
  assert.ok(M.improveOwnedCard(state, 'upgrade', 1));
  assert.equal(run.condensedGlow, 30);
  assert.equal(M.improveOwnedCard(state, 'upgrade', 1), false);
  assert.equal(M.meltOwnedCards(state, ['upgrade'], melt.token), false);
  assert.equal(run.reserveCards[0].charges, 2);
  assert.equal(run.reserveCards[0].rank, 2);
  assert.equal(run.flame, 37);
  assert.equal(M.getRunModifiers(run).cardBodyBonus, 0);
  assert.ok(M.improveOwnedCard(state, 'upgrade', 2));
  assert.equal(run.condensedGlow, 0);
  assert.equal(M.getCardImprovePreview(run, 'upgrade').reason, 'Maximum rank');
  state = reload(state); run = state.run;
  assert.equal(run.reserveCards[0].rank, 3);
  assert.equal(run.reserveCards[0].charges, 2);
});

test('legacy pending cards settle exactly once on reads or load and spent receipts never recreate cards', () => {
  let state = fresh(), run = state.run;
  delete run.reserveCards;
  run.mountedCards[0] = makeSkillCard('deep-vessel', 'legacy:mounted');
  run.cardReward = { id: 'legacy:pending', card: makeSkillCard('spark-cache', 'legacy:pending'), claimed: false, source: 'flight' };
  const before = run.condensedGlow;
  const receipt = M.getCardReward(run);
  assert.equal(receipt.claimed, true);
  assert.equal(receipt.choice, 'deck');
  assert.equal(run.reserveCards.length, 1);
  assert.equal(M.getOwnedCards(run).length, 2);
  assert.equal(run.condensedGlow, before);
  assert.ok(M.meltOwnedCards(state, ['legacy:pending']));
  state = reload(state); run = state.run;
  assert.equal(run.condensedGlow, before + 10);
  assert.deepEqual(ownedIds(run), ['legacy:mounted']);
  M.getCardReward(run); M.getOwnedCards(run); M.settleCheckpoint(state);
  assert.deepEqual(ownedIds(run), ['legacy:mounted']);

  const old = fresh('legacy:load');
  delete old.run.reserveCards;
  old.run.cardReward = { id: 'old:unclaimed', card: makeSkillCard('rhythm', 'old:unclaimed'), claimed: false };
  state = reload(old, true);
  assert.deepEqual(ownedIds(state.run), ['old:unclaimed']);
  assert.equal(reload(state).run.reserveCards.length, 1);
  old.run.cardReward.claimed = true; old.run.cardReward.choice = 'melt';
  state = reload(old, true);
  assert.deepEqual(ownedIds(state.run), []);
});

test('real cleared cards are stored before finish returns, never autoequip, and route without card decisions', () => {
  let state = fresh('automatic:flight'), run = state.run;
  finish(state);
  const id = run.cardReward.card.instanceId, wallet = run.condensedGlow;
  assert.equal(run.reserveCards.filter((card) => card.instanceId === id).length, 1);
  assert.ok(run.mountedCards.every((card) => !card));
  assert.equal(run.cardReward.claimed, true);
  assert.equal(run.cardHistory.filter((event) => event.type === 'store').length, 1);
  state = reload(state); run = state.run;
  assert.equal(run.reserveCards.filter((card) => card.instanceId === id).length, 1);
  assert.ok(M.meltOwnedCards(state, [id]));
  const payout = run.condensedGlow - wallet;
  assert.ok(payout > 0);
  M.getCardReward(run); M.getRouteMapState(run);
  state = reload(state); run = state.run;
  assert.equal(run.reserveCards.some((card) => card.instanceId === id), false);
  assert.ok(M.acknowledgeVictory(state));
  assert.ok(M.selectNode(run, M.getChoices(run)[0].id));
});

test('shared copied charges survive deck transfers and a fully consumed receipt stays consumed on reload', () => {
  let state = fresh('automatic:consumed'), run = state.run;
  run.cardReward = { id: 'used:source', card: { ...makeSkillCard('spark-cache', 'used:source'), charges: 2 }, claimed: false };
  M.getCardReward(run);
  add(run, 'echo', 'used:echo'); add(run, 'spark-cache', 'unused:duplicate', { charges: 5 });
  assert.ok(M.equipOwnedCard(run, 'used:echo', 0));
  assert.ok(M.equipOwnedCard(run, 'used:source', 1));
  assert.ok(M.unequipMountedCard(run, 1));
  assert.ok(M.equipOwnedCard(run, 'used:source', 1));
  const runtime = createCardExecution(M.getRunModifiers(run).cardExecution), result = executeCardBodyPickup(runtime);
  assert.equal(result.executions, 2);
  assert.equal(result.bonus, 8 * CARD_UNIT);
  assert.equal(executeCardBodyPickup(runtime).executions, 0);
  finish(state, { success: false, cardCharges: getCardCharges(runtime), cardExecutions: 2 });
  assert.equal(run.mountedCards[1], null);
  assert.equal(run.reserveCards.find((card) => card.instanceId === 'unused:duplicate').charges, 5);
  state = reload(state); run = state.run;
  M.getCardReward(run);
  assert.equal(ownedIds(run).includes('used:source'), false);
  assert.equal(run.cardReward.claimed, true);
});

test('deck mutations require a live checkpoint and cannot change a running flight snapshot', () => {
  const state = fresh('deck:gates'), run = state.run;
  add(run, 'body-spark', 'gate:reserve'); add(run, 'spark-cache', 'gate:mounted', { charges: 3 });
  run.condensedGlow = 100;
  M.equipOwnedCard(run, 'gate:mounted', 0);
  assert.ok(M.selectNode(run, M.getChoices(run)[0].id));
  assert.ok(M.beginFlightAttempt(run));
  const before = JSON.stringify(run);
  assert.equal(M.equipOwnedCard(run, 'gate:reserve', 1), false);
  assert.equal(M.unequipMountedCard(run, 0), false);
  assert.equal(M.moveMountedCard(run, 0, 1), false);
  assert.equal(M.meltOwnedCards(state, ['gate:mounted']), false);
  assert.equal(M.improveOwnedCard(state, 'gate:reserve', 1), false);
  assert.equal(JSON.stringify(run), before);
  assert.equal(run.attemptEntry.mountedCards[0].charges, 3);
});

test('forging awards each preview once and leaves both Rest actions usable without a card gate', () => {
  let state = fresh('deck:forge'), run = state.run;
  add(run, 'camp-kit', 'forge:kit');
  run.flame = 8; run.lives = 2; run.condensedGlow = 30;
  rest(state);
  const quote = M.getCardForgePreview(run);
  assert.ok(M.forgeOwnedCard(state, 'rare', quote.token));
  assert.equal(run.condensedGlow, 0);
  assert.equal(run.flame, 8);
  assert.equal(run.reserveCards.filter((card) => card.instanceId === quote.card.instanceId).length, 1);
  assert.equal(run.reserveCards.find(card => card.instanceId === 'forge:kit').charges, 1);
  state = reload(state); run = state.run;
  assert.equal(run.reserveCards.filter((card) => card.instanceId === quote.card.instanceId).length, 1);
  assert.ok(choose(run, 'rest-recover'));
  assert.equal(run.reserveCards.find(card => card.instanceId === 'forge:kit').charges, 1);
  assert.ok(choose(run, 'rest-slot'));
  assert.equal(run.reserveCards.some(card => card.instanceId === 'forge:kit'), false);
  assert.equal(run.phase, 'map');
  assert.equal(choose(run, 'rest-forge'), false);
});

test('legacy cleaning preserves mounted and overflow cards while repairing duplicate ownership', () => {
  const run = fresh().run;
  run.cardSlots = 3;
  run.mountedCards = [makeSkillCard('spark-cache', 'same'), null, null, makeSkillCard('rhythm', 'overflow')];
  run.mountedCards[0].charges = 2;
  run.reserveCards = [makeSkillCard('spark-cache', 'same'), makeSkillCard('body-spark', 'other')];
  cleanCardRun(run);
  assert.deepEqual(ownedIds(run), ['other', 'overflow', 'same']);
  assert.equal(run.mountedCards[0].charges, 2);
  assert.deepEqual(run.reserveCards.map((card) => card.instanceId), ['overflow', 'other']);
});
