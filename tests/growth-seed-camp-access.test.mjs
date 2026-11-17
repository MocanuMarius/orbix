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
      const draft = M.getCardDraft(run);
      if (draft) assert.ok(M.chooseCardDraft(state, draft.id, draft.offers[0].instanceId));
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

test('a seed in the Deck unlocks Grow without an equipped slot and the quote stays read only', () => {
  const state = fresh(), run = state.run, id = addSeed(run);
  approach(state); run.lives = 1; run.flame = 10;
  const before = structuredClone(run), quote = grow(run);
  assert.deepEqual(run, before); assert.equal(quote.disabled, false);
  assert.equal(M.equipOwnedCard(run, id, 2), false);
  assert.deepEqual(run.mountedCards, before.mountedCards);
  assert.equal(formatGlow(quote.after.maxMeter - quote.before.maxMeter), '3');
  const wallet = run.condensedGlow;
  assert.ok(commit(run)); near(getGlowCapacity(run), quote.after.maxMeter); near(run.flame, quote.after.maxMeter);
  assert.equal(run.cardGrowUses, 1); assert.equal(run.lives, 1); assert.equal(run.condensedGlow, wallet);
  assert.deepEqual(run.lastRest.actions, ['grow']);
  const settled = structuredClone(run);
  assert.equal(M.resolveSupport(run, quote.index), false); assert.deepEqual(run, settled);
});

test('open Rest reload ignores an old false arrival bit and uses a newly acquired inventory Seed', () => {
  let state = fresh('growth-old-arrival'), run = state.run;
  approach(state); addSeed(run); run.cardRest.growUnlocked = false;
  state = reload(state); run = state.run;
  assert.equal(run.cardRest.growUnlocked, false); assert.equal(grow(run).disabled, false);
  const quote = grow(run); assert.ok(commit(run)); near(run.flame, quote.after.meter);
  assert.equal(run.cardGrowUses, 1);
});

test('owned tiers and ranks add their exact amounts while equipped copying cards have no effect', () => {
  const layouts = [
    [['growth-seed-common', 1], 3], [['growth-seed', 1], 5],
    [['growth-seed-legendary', 1], 8], [['growth-seed-legendary', 2], 9], [['growth-seed-legendary', 3], 10],
  ].map(([card, amount]) => ({ cards: [card], amount }));
  layouts.push({ cards: [['growth-seed', 1], ['growth-seed-legendary', 3], ['growth-seed-common', 1]], amount: 18 });
  layouts.push({ cards: Array(12).fill(['growth-seed-legendary', 3]), amount: 90 });
  for (const { cards, amount } of layouts) {
    const state = fresh(`growth-late-amount-${amount}`), run = state.run;
    approach(state); run.reserveCards = []; run.mountedCards = [makeSkillCard('echo-iii', 'copy:echo'), makeSkillCard('chameleon', 'copy:chameleon'), null];
    cards.forEach(([id, rank], index) => addSeed(run, `late-${index}`, id, rank));
    run.lives = 1; run.flame = 10;
    const quote = grow(run); assert.equal(quote.disabled, false);
    // The Spark Meter stops at 100 printed Sparks (cap decided 2026-11-16): a +90 Grow fits only 70.
    assert.equal(formatGlow(quote.after.maxMeter - quote.before.maxMeter), String(Math.min(amount, 100 - Number(formatGlow(quote.before.maxMeter)))));
    assert.ok(commit(run)); near(run.cardGrowCapacity, amount * CARD_UNIT);
    near(run.flame, quote.after.maxMeter); near(getGlowCapacity(run), quote.after.maxMeter);
    assert.equal(run.lives, 1); assert.equal(run.cardGrowUses, 1);
  }
});

test('wrong phase and a completed or reopened camp refuse Grow without spending or changing capacity', () => {
  const state = fresh('growth-closed-camp'), run = state.run;
  approach(state); const node = run.current; addSeed(run);
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

test('Grow stays distinct and Second Ember acquired after arrival keeps its use for a later Rest', () => {
  const state = fresh('growth-no-late-extra'), run = state.run;
  approach(state); addSeed(run); const extra = addSeed(run, 'late-extra', 'camp-kit');
  assert.equal(M.getCardCampPreview(run).remaining, 1);
  assert.ok(commit(run)); assert.equal(run.phase, 'map');
  assert.equal(run.reserveCards.find(card => card.instanceId === extra).charges, 1);
  const paired = fresh('growth-distinct'), r = paired.run;
  const ember = addSeed(r, 'arrival-extra', 'camp-kit'); approach(paired); addSeed(r);
  assert.ok(commit(r)); assert.equal(r.phase, 'support');
  const used = grow(r), before = structuredClone(r);
  assert.equal(used.disabled, true); assert.equal(used.disabledReason, 'Choose a distinct Rest action');
  assert.equal(M.resolveSupport(r, used.index), false); assert.deepEqual(r, before);
  const slot = M.getSupportChoices(r).findIndex(offer => offer.effect?.rest === 'slot');
  assert.ok(M.resolveSupport(r, slot)); assert.equal(r.reserveCards.some(card => card.instanceId === ember), false);
});
