import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { CARD_UNIT, makeSkillCard } from '../dist/skill-cards.mjs';
import { getGlowCapacity, formatGlow } from '../dist/vitality.mjs';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function fresh(seed = 'growth-open-camp') {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  const gift = M.getStartingGiftOffers(state.run).find(offer => offer.cardId !== 'camp-kit');
  assert.ok(M.chooseStartingGift(state, gift.id));
  return state;
}
function approach(state) {
  const run = state.run, camp = run.map.flat().find(node => node.kind === 'camp'), route = [camp];
  let cursor = camp;
  while (cursor.row > 0) {
    cursor = run.map[cursor.row - 1].find(node => node.nextIds.includes(cursor.id));
    assert.ok(cursor); route.unshift(cursor);
  }
  for (const node of route) {
    assert.ok(M.selectNode(run, node.id));
    if (node === camp) break;
    if (node.type === 'support') {
      assert.ok(M.resolveSupport(run, M.getSupportChoices(run).findIndex(offer => !offer.disabled)));
    } else {
      assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
      assert.ok(M.finishFlight(run, { success: true, flame: 55, collected: 4 })); M.settleCheckpoint(state);
      if (run.cardReward) run.cardReward.uiAcknowledged = true;
      if (run.flightReward && !run.flightReward.claimed) assert.ok(M.chooseFlightReward(state, run.flightReward.offers[0]));
      assert.ok(M.acknowledgeVictory(state));
    }
  }
  return camp;
}
function reload(state) {
  let value;
  assert.ok(M.saveState(state, { setItem: (_, text) => { value = text; } }));
  return M.loadState({ getItem: () => value });
}
const grow = run => M.getCardCampPreview(run).actions.find(action => action.key === 'grow');
const addSeed = (run, id = 'seed', cardId = 'growth-seed-common', rank = 1) => {
  run.reserveCards.push({ ...makeSkillCard(cardId, id), rank }); return id;
};
const commit = run => M.resolveSupport(run, grow(run).index);

test('a seed in reserve can be equipped, removed and re-equipped at the same connected open camp', () => {
  const state = fresh(), run = state.run, id = addSeed(run);
  approach(state); run.lives = 1; run.flame = 10;
  assert.equal(run.cardRest.growUnlocked, false, 'legacy arrival bit records no equipped seed');
  assert.equal(grow(run).disabledReason, 'Equip a Growth Seed to Grow');
  const unchanged = structuredClone(run);
  assert.equal(commit(run), false); assert.deepEqual(run, unchanged);
  assert.ok(M.equipOwnedCard(run, id, 2));
  const before = structuredClone(run), quote = grow(run);
  assert.deepEqual(run, before, 'quote remains read only'); assert.equal(quote.disabled, false);
  assert.equal(formatGlow(quote.after.maxMeter - quote.before.maxMeter), '3');
  assert.equal(quote.after.meter, quote.after.maxMeter);
  assert.ok(M.unequipMountedCard(run, 2, id));
  assert.equal(grow(run).disabledReason, 'Equip a Growth Seed to Grow');
  assert.ok(M.equipOwnedCard(run, id, 2));
  const wallet = run.condensedGlow;
  assert.ok(commit(run)); near(getGlowCapacity(run), quote.after.maxMeter); near(run.flame, quote.after.maxMeter);
  assert.equal(run.cardGrowUses, 1); assert.equal(run.lives, 1); assert.equal(run.condensedGlow, wallet);
  assert.deepEqual(run.lastRest.actions, ['grow']);
  const settled = structuredClone(run);
  assert.equal(M.resolveSupport(run, quote.index), false); assert.deepEqual(run, settled);
});

test('open Rest reload ignores an old false arrival bit and commits the equipped seed amount', () => {
  let state = fresh('growth-old-arrival'), run = state.run;
  approach(state); const id = addSeed(run);
  assert.ok(M.equipOwnedCard(run, id, 2)); assert.equal(run.cardRest.growUnlocked, false);
  state = reload(state); run = state.run;
  assert.equal(run.cardRest.growUnlocked, false); assert.equal(grow(run).disabled, false);
  const quote = grow(run); assert.ok(commit(run)); near(run.flame, quote.after.meter);
  assert.equal(run.cardGrowUses, 1);
});

test('late equipped tiers, ranks and copied sources quote their exact current amount and refill once', () => {
  const layouts = [
    [['growth-seed-common', 1], 3], [['growth-seed', 1], 5],
    [['growth-seed-legendary', 1], 8], [['growth-seed-legendary', 2], 9], [['growth-seed-legendary', 3], 10],
  ].map(([card, amount]) => ({ cards: [card], amount }));
  layouts.push({ cards: [['echo-iii', 1], ['growth-seed', 1], ['chameleon', 1], ['growth-seed-legendary', 3], ['growth-seed-common', 1]], amount: 43 });
  for (const { cards, amount } of layouts) {
    const state = fresh(`growth-late-amount-${amount}`), run = state.run;
    approach(state); run.cardSlots = Math.max(3, cards.length); run.mountedCards = Array(run.cardSlots).fill(null);
    for (const [[id, rank], index] of cards.map((card, index) => [card, index])) {
      const instanceId = addSeed(run, `late-${index}`, id, rank);
      assert.ok(M.equipOwnedCard(run, instanceId, index));
    }
    run.lives = 1; run.flame = 10;
    const quote = grow(run); assert.equal(quote.disabled, false);
    assert.equal(formatGlow(quote.after.maxMeter - quote.before.maxMeter), String(amount));
    assert.ok(commit(run)); near(run.cardGrowCapacity, amount * CARD_UNIT);
    near(run.flame, quote.after.maxMeter); near(getGlowCapacity(run), quote.after.maxMeter);
    assert.equal(run.lives, 1); assert.equal(run.cardGrowUses, 1);
  }
});

test('wrong phase and a completed or reopened camp refuse Grow without spending or changing capacity', () => {
  const state = fresh('growth-closed-camp'), run = state.run;
  approach(state); const node = run.current, id = addSeed(run); assert.ok(M.equipOwnedCard(run, id, 2));
  const index = grow(run).index;
  run.phase = 'briefing'; const wrongPhase = structuredClone(run);
  assert.equal(M.getCardCampPreview(run), null); assert.equal(M.resolveSupport(run, index), false); assert.deepEqual(run, wrongPhase);
  run.phase = 'support';
  const leave = M.getSupportChoices(run).findIndex(offer => offer.effect?.restContinue);
  assert.ok(M.resolveSupport(run, leave));
  const completed = structuredClone(run);
  assert.equal(M.resolveSupport(run, index), false); assert.deepEqual(run, completed);
  Object.assign(run, { current: node, step: node.row, phase: 'support' });
  const reopened = structuredClone(run);
  assert.equal(grow(run).disabled, true); assert.equal(M.resolveSupport(run, index), false); assert.deepEqual(run, reopened);
});

test('three shared uses take reason priority even when every seed is in reserve', () => {
  const state = fresh('growth-full-limit'), run = state.run;
  approach(state); addSeed(run); run.cardGrowUses = 3; run.cardGrowCapacity = 9 * CARD_UNIT;
  const before = structuredClone(run), quote = grow(run);
  assert.equal(quote.disabled, true); assert.equal(quote.disabledReason, 'Maximum growth reached (3/3)');
  assert.equal(commit(run), false); assert.deepEqual(run, before);
});

test('Grow stays distinct and equipping Second Ember during Rest grants no extra allowance', () => {
  const state = fresh('growth-no-late-extra'), run = state.run;
  approach(state); const seed = addSeed(run), extra = addSeed(run, 'late-extra', 'camp-kit');
  assert.ok(M.equipOwnedCard(run, seed, 2)); assert.ok(M.equipOwnedCard(run, extra, 0));
  assert.equal(M.getCardCampPreview(run).remaining, 1);
  assert.ok(commit(run)); assert.equal(run.phase, 'map'); assert.equal(run.mountedCards[0].charges, 1);

  const paired = fresh('growth-distinct'), r = paired.run;
  const ember = addSeed(r, 'arrival-extra', 'camp-kit'); assert.ok(M.equipOwnedCard(r, ember, 0));
  approach(paired); const id = addSeed(r); assert.ok(M.equipOwnedCard(r, id, 2));
  assert.ok(commit(r)); assert.equal(r.phase, 'support');
  const used = grow(r), before = structuredClone(r);
  assert.equal(used.disabled, true); assert.equal(used.disabledReason, 'Choose a distinct Rest action');
  assert.equal(M.resolveSupport(r, used.index), false); assert.deepEqual(r, before);
  const slot = M.getSupportChoices(r).findIndex(offer => offer.effect?.rest === 'slot');
  assert.ok(M.resolveSupport(r, slot)); assert.equal(r.reserveCards.find(card => card.instanceId === ember)?.charges ?? r.mountedCards[0]?.charges ?? 0, 0);
});
