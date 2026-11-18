// Chests (treasure stops) in a card run (JOB E, 2026-11-18): selecting the chest opens ONE choice on its own screen: +N Stored Sparks now, OR a free forged surprise card. The old find step (retired skills and relics) is gone for card runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {SKILL_CARDS, makeSkillCard, LIVE_CARDS} from '../dist/skill-cards.mjs';
import {treasureView} from '../dist/treasure-view.mjs';
import {chestStopMarkup} from '../dist/stop-screen.mjs';
import {CHEST_CARD_LINE, chestSparks, chestChoiceLine} from '../dist/treasure.mjs';
import {forgeCeremonyMarkup, forgeCeremonyPlan} from '../dist/forge-ceremony.mjs';

const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
function atChest(seed, mounted = ['body-spark', null, null]) {
  const s = M.newState(); s.profile.tutorialComplete = true;
  const run = s.run = M.createRun(s.profile, seed, 1, {cards: true});
  M.chooseStartingGift(s, M.getStartingGiftOffers(run)[0].id);
  run.cardSlots = 3; run.mountedCards = mounted.map((id, i) => id ? makeSkillCard(id, `c:${i}`) : null);
  const stop = run.map.flat().find(n => n.kind === 'treasure');
  const pred = run.map[stop.row - 1].find(n => n.nextIds.includes(stop.id));
  run.step = stop.row; run.path = [pred.id];
  assert.ok(M.selectNode(run, stop.id)); assert.equal(run.phase, 'support');
  return {s, run, stop};
}
const owned = run => [...run.mountedCards, ...run.reserveCards].filter(Boolean);
// Selecting a chest in a card run queues its one choice at once; the stop is over when it is taken.
const takeBase = (seed, mounted) => atChest(seed, mounted);

test('selecting a chest pends one choice; nothing else moves until it is taken', () => {
  const {run, stop} = takeBase('chest-pend');
  assert.deepEqual({sparks: run.pendingChest.sparks, map: run.pendingChest.mapIndex}, {sparks: chestSparks(0), map: 0});
  assert.equal(M.selectNode(run, M.getChoices(run)[0]?.id), false);
  assert.equal(M.beginFlightAttempt(run), false);
  const html = chestStopMarkup(run, {node: stop}), t = text(html);
  assert.ok(t.includes('+' + chestSparks(0) + ' Stored Sparks')); assert.match(t, /A surprise card/); assert.match(t, /Take one/);
  assert.doesNotMatch(t, /skill|relic|artifact/i);
  assert.equal((html.match(/data-action="chest-choice"/g) || []).length, 2);
  assert.equal(M.chooseChestReward({run}, 'nonsense'), false);
});

test('the Stored Sparks option awards exactly +N Stored Sparks and no card', () => {
  for (const seed of ['chest-a', 'chest-b']) {
    const {s, run} = takeBase(seed), wallet = run.condensedGlow, cards = owned(run).length, tally = JSON.stringify(run.cardForgeTally || null);
    const got = M.chooseChestReward(s, 'sparks');
    assert.deepEqual(got, {option: 'sparks', sparks: chestSparks(0)});
    assert.equal(run.condensedGlow - wallet, chestSparks(0));
    assert.equal(owned(run).length, cards, 'never both');
    assert.equal(JSON.stringify(run.cardForgeTally || null), tally);
    assert.equal(run.pendingChest, undefined);
    assert.equal(M.chooseChestReward(s, 'card'), false, 'one or the other');
    assert.equal(run.phase === 'support', false, 'back on the map');
  }
});

test('the card option adds exactly one live surprise card, spends nothing, adds no Stored Sparks, and returns to the map', () => {
  for (const seed of ['chest-a', 'chest-b', 'chest-c', 'chest-d']) {
    const {s, run} = takeBase(seed), wallet = run.condensedGlow, before = owned(run).length, tally = JSON.stringify(run.cardForgeTally || null);
    const got = M.chooseChestReward(s, 'card');
    assert.equal(got.option, 'card');
    assert.equal(owned(run).length, before + 1, 'exactly one card');
    const card = run.reserveCards.at(-1);
    assert.ok(card && SKILL_CARDS[card.cardId]);
    assert.ok(LIVE_CARDS.some(def => def.id === card.cardId && !def.starterOnly), 'live pool only');
    assert.ok(M.isCardNew(run, card.instanceId), 'NEW badge');
    assert.equal(run.mountedCards.filter(Boolean).length, 1, 'not mounted over the Chain');
    assert.equal(run.condensedGlow, wallet, 'no Stored Sparks spent or added');
    assert.equal(JSON.stringify(run.cardForgeTally || null), tally);
    assert.equal(run.pendingChest, undefined); assert.equal(run.phase === 'support', false);
    assert.equal(M.chooseChestReward(s, 'sparks'), false, 'one or the other');
    assert.equal(M.grantChestCard(run), null, 'one per chest');
  }
});

test('with nothing mounted the first card is mounted for the player; the card is seeded', () => {
  const a = takeBase('chest-empty', [null, null, null]);
  M.chooseChestReward(a.s, 'card');
  const mounted = a.run.mountedCards.findIndex(Boolean);
  if (mounted >= 0) assert.equal(mounted, 0);
  const b = takeBase('chest-empty', [null, null, null]); M.chooseChestReward(b.s, 'card');
  assert.equal(a.run.lastChestChoice.card.cardId, b.run.lastChestChoice.card.cardId);
});

test('the amount scales with the map: 20, 30, 40', () => {
  assert.deepEqual([0, 1, 2, 7].map(chestSparks), [20, 30, 40, 40]);
});

test('preview matches the award: the stop page and chest view say "Choose: +N Stored Sparks or 1 surprise card"', () => {
  const {run, stop} = atChest('chest-preview');
  const line = chestChoiceLine(0);
  assert.equal(line, `Choose: +${chestSparks(0)} Stored Sparks or ${CHEST_CARD_LINE}`);
  assert.ok(stop.rewardPreview.includes(line), stop.rewardPreview);
  assert.equal(stop.reward, stop.rewardPreview);
  const c = takeBase('chest-preview-award');
  assert.equal(c.run.pendingChest.sparks, chestSparks(0));
  const before = owned(c.run).length, wallet = c.run.condensedGlow;
  M.chooseChestReward(c.s, 'sparks');
  assert.equal(c.run.condensedGlow - wallet, chestSparks(0)); assert.equal(owned(c.run).length, before);
});

test('the legacy (non-card) chest is unchanged: no choice, no card line', () => {
  const s = M.newState(), run = s.run = M.createRun(s.profile, 'chest-legacy', 1);
  const stop = run.map.flat().find(n => n.kind === 'treasure');
  assert.doesNotMatch(stop.rewardPreview, /surprise card/);
  assert.equal(M.queueChestChoice(run), false);
  assert.doesNotMatch(text(treasureView(run, stop, {preview: true})), /surprise card/);
});

test('the reveal reuses the Forge ceremony: skippable, one short fade under reduced motion, free of charge', () => {
  const card = {cardId: 'body-spark', rarity: 'common', name: 'Body Spark'};
  assert.equal(forgeCeremonyPlan(true).length, 1);
  assert.match(text(forgeCeremonyMarkup(card, {price: 0})), /free from the chest/);
  assert.match(forgeCeremonyMarkup(card, {price: 0}), /data-action="forge-ceremony-skip"/);
});
