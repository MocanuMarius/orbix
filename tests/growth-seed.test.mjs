import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { CARD_ECONOMY, CARD_UNIT, SKILL_CARDS, makeSkillCard, describeSkillCard,
  drawSkillCard, getCardModifiers, getCardGrowthBonus, cleanCardRun } from '../dist/skill-cards.mjs';
import { getCardRuleBands } from '../dist/card-rule-bands.mjs';
import { getGlowCapacity, formatGlow } from '../dist/vitality.mjs';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const fresh = seed => {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id));
  return state;
};
function reload(state) {
  let data; const storage = { getItem: () => data, setItem: (_, value) => { data = value; } };
  assert.ok(M.saveState(state, storage)); return M.loadState(storage);
}
function enterCamp(run, index = 0) {
  while (run.mapIndex < index) {
    Object.assign(run, { phase: 'map-clear', step: run.map.length });
    assert.ok(M.advanceMap(run));
  }
  const node = run.map.flat().find(node => node.kind === 'camp');
  Object.assign(run, { mapIndex: index, current: node, step: node.row, path: [node.id], phase: 'support' });
  return M.getCardCampPreview(run);
}
function clearNext(state) {
  const run = state.run, node = M.getChoices(run).find(node => node.type !== 'support');
  assert.ok(node); assert.ok(M.selectNode(run, node.id));
  const before = JSON.stringify(run), preview = drawSkillCard(run, 'flight', node);
  assert.deepEqual(drawSkillCard(run, 'flight', node), preview);
  assert.equal(JSON.stringify(run), before, 'reward previews do not advance protection');
  assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, { success: true, flame: 50 })); M.settleCheckpoint(state);
  const draft = M.getCardDraft(run);
  assert.equal(draft.offers[0].cardId, preview.cardId);
  assert.ok(M.chooseCardDraft(state, draft.id, draft.offers[0].instanceId));
  assert.equal(run.cardReward.card.cardId, preview.cardId);
  run.cardReward.uiAcknowledged = true;
  if (run.flightReward && !run.flightReward.claimed) assert.ok(M.chooseFlightReward(state, run.flightReward.offers[0]));
  assert.ok(M.acknowledgeVictory(state));
  return { card: run.cardReward.card, node };
}

test('Growth family prints its real tier/rank values and evolves through existing camp previews', () => {
  const state = fresh('growth-evolution'), run = state.run;
  const seed = makeSkillCard('growth-seed-common', 'growth:upgrade');
  run.reserveCards.push(seed); run.condensedGlow = 500;
  for (const [id, rank, amount] of [
    ['growth-seed-common', 1, 3], ['growth-seed', 1, 5],
    ['growth-seed-legendary', 1, 8], ['growth-seed-legendary', 2, 9], ['growth-seed-legendary', 3, 10],
  ]) {
    const card = describeSkillCard({ ...makeSkillCard(id, `print:${id}:${rank}`), rank });
    assert.equal(card.amount, amount);
    // Approved plain wording (v1.0-cardtext): "max Sparks".
    assert.match(card.effect, new RegExp(`\\+${amount} max Sparks`));
    assert.ok(getCardRuleBands(card).some(band => band.text.includes(`+${amount} max Sparks`)));
  }
  assert.equal(M.improveOwnedCard(state, seed.instanceId), false, 'evolution stays camp-only');
  enterCamp(run);
  for (const [id, rank, amount, price, kind] of [
    ['growth-seed', 1, 5, 25, 'evolution'],
    ['growth-seed-legendary', 1, 8, 150, 'evolution'], // Evolve into Legendary: 150 (2026-11-17)
    ['growth-seed-legendary', 2, 9, 40, 'rank'],
    ['growth-seed-legendary', 3, 10, 80, 'rank'],
  ]) {
    const quote = M.getCardImprovePreview(run, seed.instanceId);
    assert.equal(quote.kind, kind); assert.equal(quote.price, price);
    assert.equal(quote.after.amount, amount);
    const wallet = run.condensedGlow;
    assert.ok(M.improveOwnedCard(state, seed.instanceId, seed.rank, quote.token));
    assert.equal(seed.cardId, id); assert.equal(seed.rank, rank); assert.equal(run.condensedGlow, wallet - price);
    assert.equal(seed.instanceId, 'growth:upgrade'); assert.deepEqual(run.cardRest?.actions || [], []);
  }
  assert.equal(M.getCardImprovePreview(run, seed.instanceId).reason, 'Maximum rank');
});

test('each Growth amount, owned Seeds and the +90 ceiling survive exact previews and save reloads', () => {
  const layouts = [
    { cards: [['growth-seed-common', 1]], amount: 3 },
    { cards: [['growth-seed', 1]], amount: 5 },
    { cards: [['growth-seed-legendary', 1]], amount: 8 },
    { cards: [['growth-seed-legendary', 2]], amount: 9 },
    { cards: [['growth-seed-legendary', 3]], amount: 10 },
    { cards: [['echo-iii', 1], ['growth-seed', 1], ['chameleon', 1], ['growth-seed-legendary', 3], ['growth-seed-common', 1]], amount: 18 },
    { cards: Array(12).fill(['growth-seed-legendary', 3]), amount: 90 },
  ];
  for (const { cards, amount } of layouts) {
    let state = fresh(`growth-amount:${amount}`), run = state.run;
    run.cardSlots = 3;
    run.mountedCards = [makeSkillCard('echo-iii', 'grow:echo'), makeSkillCard('chameleon', 'grow:chameleon'), null];
    run.reserveCards = cards.filter(([id]) => SKILL_CARDS[id].kind === 'camp-grow').map(([id, rank], i) => ({ ...makeSkillCard(id, `grow:${i}`), rank }));
    run.lives = 2;
    for (let i = 0; i < 3; i++) {
      const quote = enterCamp(run, i), grow = quote.actions.find(action => action.key === 'grow');
      assert.equal(grow.disabled, false); near(getCardModifiers(run).cardGrowAmount, amount * CARD_UNIT);
      // The Spark Meter stops at 100 printed Sparks (cap decided 2026-11-16): a +90 Grow fits only 70.
      assert.equal(formatGlow(grow.after.maxMeter - grow.before.maxMeter), String(Math.min(amount, 100 - Number(formatGlow(grow.before.maxMeter)))));
      assert.ok(M.resolveSupport(run, grow.index));
      near(getGlowCapacity(run), grow.after.maxMeter); near(run.flame, grow.after.maxMeter);
      near(run.cardGrowCapacity, (i + 1) * amount * CARD_UNIT); assert.equal(run.lives, 2);
      run.attemptEntry = { cardGrowUses: i + 1, cardGrowCapacity: run.cardGrowCapacity };
      state = reload(state); run = state.run;
      near(getCardGrowthBonus(run), (i + 1) * amount * CARD_UNIT);
      near(run.attemptEntry.cardGrowCapacity, (i + 1) * amount * CARD_UNIT);
    }
    const blocked = enterCamp(run, 2).actions.find(action => action.key === 'grow');
    assert.equal(blocked.disabled, true); assert.equal(M.resolveSupport(run, blocked.index), false);
    run.mountedCards.fill(null); near(getCardGrowthBonus(run), 3 * amount * CARD_UNIT);
  }
  assert.equal(CARD_ECONOMY.maxGrowPerAction, 90);
  const malformed = fresh('growth-cap').run;
  malformed.cardGrowUses = 3; malformed.cardGrowCapacity = Infinity; cleanCardRun(malformed);
  assert.equal(getCardGrowthBonus(malformed), 0);
  malformed.cardGrowCapacity = 1e8; cleanCardRun(malformed); near(getCardGrowthBonus(malformed), 900);
});

test('the second Common real flight clear supplies a Seed once; receipts, reloads and melting keep it settled', () => {
  let protectedRuns = 0;
  for (let i = 0; i < 60; i++) {
    let state = fresh(`growth-early:${i}`), run = state.run;
    const first = clearNext(state), firstDef = SKILL_CARDS[first.card.cardId];
    state = reload(state); run = state.run;
    const unprotected = drawSkillCard({ ...run, cardHistory: [], mountedCards: [], reserveCards: [] }, 'flight', M.getChoices(run)[0]);
    const second = clearNext(state), secondDef = SKILL_CARDS[second.card.cardId];
    if (firstDef.rarity === 'common' && firstDef.kind !== 'camp-grow' && SKILL_CARDS[unprotected.cardId].rarity === 'common') {
      assert.equal(second.card.cardId, 'growth-seed-common'); protectedRuns++;
    }
    assert.deepEqual(drawSkillCard(run, 'flight', second.node), second.card, 'settled receipt cannot reroll');
    if (secondDef.kind !== 'camp-grow') continue;
    const earnedId = second.card.instanceId;
    assert.ok(M.meltOwnedCards(state, [earnedId]));
    state = reload(state); run = state.run;
    assert.equal(M.getOwnedCards(run).some(card => card.instanceId === earnedId), false);
    const noGrowth = { ...run, cardHistory: [], mountedCards: [], reserveCards: [], cardReward: null };
    for (let j = 0; j < 20; j++) {
      const node = { id: `post-melt:${j}` };
      assert.deepEqual(drawSkillCard(run, 'flight', node), drawSkillCard(noGrowth, 'flight', node), 'melting never restarts protection');
    }
  }
  assert.ok(protectedRuns > 20, 'exercise actual protected Common rewards');
});

test('only Common flight drops count toward protection; Forge, failed attempts and previews do not', () => {
  const state = fresh('growth-history'), run = state.run;
  run.mountedCards = [null, null, null]; run.reserveCards = [];
  const base = { ...run, cardHistory: [] }, node = { id: 'common-history' };
  // Select a fixed ordinary node whose unchanged natural result is a non-seed Common.
  while (SKILL_CARDS[drawSkillCard(base, 'flight', node).cardId].rarity !== 'common'
    || drawSkillCard(base, 'flight', node).cardId === 'growth-seed-common') node.id += 'x';
  const ordinary = drawSkillCard(base, 'flight', node);
  const common = describeSkillCard(makeSkillCard('body-spark', 'prior'));
  for (const event of [{ type: 'store', card: common }, { type: 'forge', card: common }]) {
    run.cardHistory = [event]; assert.deepEqual(drawSkillCard(run, 'flight', node), ordinary);
  }
  run.cardHistory = [{ type: 'drop', mapIndex: 0, nodeId: 'prior', card: common }];
  const before = JSON.stringify(run);
  assert.equal(drawSkillCard(run, 'flight', node).cardId, 'growth-seed-common');
  assert.equal(JSON.stringify(run), before);
  for (const kind of ['store', 'drop', 'forge']) {
    run.cardHistory.push({ type: kind, card: describeSkillCard(makeSkillCard('growth-seed', 'once-acquired')) });
    assert.deepEqual(drawSkillCard(run, 'flight', node), ordinary, `${kind} remembers an acquired Seed`);
    run.cardHistory.pop();
  }
  run.reserveCards.push(makeSkillCard('growth-seed-legendary', 'legacy-owned'));
  assert.deepEqual(drawSkillCard(run, 'flight', node), ordinary, 'old owned Seeds suppress protection');
  run.reserveCards = [];
  assert.equal(SKILL_CARDS[drawSkillCard(run, 'forge:test', null, 'rare').cardId].rarity, 'rare');
  assert.equal(SKILL_CARDS[drawSkillCard(run, 'forge:test', null, 'legendary').cardId].rarity, 'legendary');
});
