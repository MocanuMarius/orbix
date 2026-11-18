// A run holds at most ONE Growth Seed (2026-11-18): a Seed you gain merges into it; its amount is the sum, the best rarity shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {SKILL_CARDS, makeSkillCard, describeSkillCard, mergeGrowthSeeds, growthSeedDropFactor, cleanCardRun, cardAmount, settleCardReward, getInventoryCampCards, getCardModifiers} from '../dist/skill-cards.mjs';
import {cardFace} from '../dist/card-ui.mjs';
import {faceEffect} from '../dist/card-face-lines.mjs';

const fresh = id => { const state = M.newState(); state.profile.tutorialComplete = true; state.run = M.createRun(state.profile, id, 1, {cards: true}); return state.run; };
const seeds = run => [...run.mountedCards, ...run.reserveCards].filter(card => card && SKILL_CARDS[card.cardId].kind === 'camp-grow');
const reward = (run, cardId, id) => { run.cardReward = {id, card: makeSkillCard(cardId, id), source: 'flight', claimed: false}; settleCardReward(run); };

test('gaining another Seed merges into the owned one: amounts add up, highest rarity shows', () => {
  const run = fresh('merge-gain');
  reward(run, 'growth-seed-common', 'a');
  assert.equal(seeds(run).length, 1);
  reward(run, 'growth-seed', 'b');           // Rare 5
  reward(run, 'growth-seed-legendary', 'c'); // Legendary 8
  const [seed] = seeds(run);
  assert.equal(seeds(run).length, 1, 'one Seed only');
  assert.equal(seed.cardId, 'growth-seed-legendary', 'highest rarity merged');
  assert.equal(cardAmount(seed), 3 + 5 + 8, 'sum of all merged amounts');
  assert.equal(seed.seedBonus, 8, 'stored on the card');
  assert.match(cardFace(describeSkillCard(seed)).replace(/<[^>]+>/g, ' '), /\+16/, 'shown on the face');
  assert.equal(faceEffect(describeSkillCard(seed), SKILL_CARDS[seed.cardId]), '+16 max Sparks');
  assert.equal(run.cardReward.card.instanceId, 'c', 'the receipt points at the surviving deck card');
});

test('merge on load: old saves with several Seeds hold one with the same total', () => {
  const run = fresh('merge-load');
  run.reserveCards.push(makeSkillCard('growth-seed-common', 'x'), makeSkillCard('growth-seed', 'y'), makeSkillCard('growth-seed-legendary', 'z'));
  const before = getInventoryCampCards(run, 'camp-grow').reduce((sum, c) => sum + cardAmount(c), 0);
  cleanCardRun(run);
  assert.equal(seeds(run).length, 1);
  assert.equal(cardAmount(seeds(run)[0]), before, 'Grow amount equals the old sum');
  assert.equal(before, 16);
  cleanCardRun(run); // idempotent
  assert.equal(cardAmount(seeds(run)[0]), 16);
  const saved = JSON.parse(JSON.stringify(run));
  cleanCardRun(saved);
  assert.equal(cardAmount(seeds(saved)[0]), 16, 'survives a save round trip');
});

test('Grow amount equals the old sum and keeps its cap and shared uses', () => {
  const run = fresh('merge-grow');
  reward(run, 'growth-seed-common', 'a'); reward(run, 'growth-seed', 'b');
  assert.equal(getCardModifiers(run).cardGrowAmount, (3 + 5) * (10 / 3));
  for (let i = 0; i < 12; i++) reward(run, 'growth-seed-legendary', `l${i}`);
  assert.equal(getCardModifiers(run).cardGrowAmount, 90 * (10 / 3), 'the +90 cap per Grow still applies');
});

test('evolve applies to the merged card once and adds what one Seed would gain', () => {
  const run = fresh('merge-evolve');
  reward(run, 'growth-seed-common', 'a'); reward(run, 'growth-seed-common', 'b'); // Common 3 + 3 = 6
  const [seed] = seeds(run);
  assert.equal(cardAmount(seed), 6);
  run.condensedGlow = 500; run.current = {id: 'rest-x', kind: 'camp', type: 'support'};
  const preview = M.getCardImprovePreview(run, seed.instanceId);
  assert.equal(preview.after.cardId, 'growth-seed');
  assert.equal(preview.after.amount, 8, 'Common to Rare adds 2 (3 to 5) to the merged 6');
  assert.equal(preview.after.amount - preview.before.amount, SKILL_CARDS['growth-seed'].amount - SKILL_CARDS['growth-seed-common'].amount);
});

test('Seeds are offered half as often once one is owned', () => {
  const run = fresh('merge-weight');
  const def = SKILL_CARDS['growth-seed-common'];
  assert.equal(growthSeedDropFactor(run, def), 1);
  reward(run, 'growth-seed-common', 'a');
  assert.equal(growthSeedDropFactor(run, def), 0.5);
  assert.equal(growthSeedDropFactor(run, SKILL_CARDS['body-spark']), 1);
  void mergeGrowthSeeds;
});
