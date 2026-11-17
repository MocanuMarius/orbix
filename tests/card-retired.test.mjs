import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {SKILL_CARDS,CARD_ECONOMY,LIVE_CARDS,makeSkillCard,drawSkillCard,drawSkillCardDraft,drawForgeCard,getCardStarterOffers,getCardMeltValue,cleanCardRun} from '../dist/skill-cards.mjs';

const RETIRED = ['field-impulse'];

test('the catalog keeps retired entries but the live pool excludes them', () => {
  for (const id of RETIRED) {
    assert.equal(SKILL_CARDS[id]?.retired, true, `${id} stays named in the catalog`);
    assert.ok(!LIVE_CARDS.some(def => def.id === id), `${id} is not live`);
  }
  assert.ok(LIVE_CARDS.length > 0 && LIVE_CARDS.every(def => !def.retired));
});

test('retired cards never appear in starter choices or any offer pool over many seeded draws', () => {
  const seen = new Set();
  for (let seed = 0; seed < 600; seed++) {
    const run = { campaignSeed: `retired:${seed}`, seed: `retired:${seed}`, skillSystem: 'cards-v1', mapIndex: seed % 3, mountedCards: [], reserveCards: [] };
    for (const offer of getCardStarterOffers(run)) seen.add(offer.cardId);
    for (const offer of getCardStarterOffers(run, { legacy: true })) seen.add(offer.cardId);
    run.cardStarterVersion = 2;
    for (const offer of getCardStarterOffers(run)) seen.add(offer.cardId);
    for (const tier of ['normal', 'elite', 'boss']) {
      const node = { id: `n${seed}`, ...(tier === 'normal' ? {} : { [tier]: true }) };
      seen.add(drawSkillCard(run, 'flight', node).cardId);
      for (const card of drawSkillCardDraft(run, node)) seen.add(card.cardId);
    }
    for (const rarity of ['common', 'rare', 'legendary']) {
      seen.add(drawSkillCard(run, `forge:v2:${rarity}:0`, null, rarity).cardId);
      seen.add(drawForgeCard(run, rarity, seed % 5).cardId);
    }
  }
  for (const id of RETIRED) assert.ok(!seen.has(id), `${id} was offered`);
});

test('Wave Loom came back as an engine card: old copies (no edition) are still paid out on load, new copies stay', () => {
  assert.equal(SKILL_CARDS['wave-loom'].retiredBefore, 2);
  assert.ok(!LIVE_CARDS.some(def => def.id === 'wave-loom'), 'unreleased: still never offered');
  const state = M.newState(), run = state.run = M.createRun(state.profile, 'loom-save', 1, { cards: true });
  run.mountedCards = [{ instanceId: 'loom:old', cardId: 'wave-loom', rank: 1 }, makeSkillCard('wave-loom', 'loom:new'), null];
  run.reserveCards = [];
  const before = run.condensedGlow || 0, melt = getCardMeltValue({ instanceId: 'p', cardId: 'wave-loom', rank: 1 });
  let text;
  assert.ok(M.saveState(state, { setItem: (_, value) => { text = value; } }));
  const loaded = M.loadState({ getItem: () => text, setItem() {} }).run;
  assert.deepEqual(loaded.mountedCards.filter(Boolean).map(card => card.instanceId), ['loom:new']);
  assert.equal(loaded.mountedCards[1].edition, 2, 'the edition survives a save');
  assert.equal(loaded.condensedGlow, before + melt, 'the old copy pays once, as before');
});

test('a saved starter offer naming a retired card is re-rolled without it', () => {
  const run = { campaignSeed: 'stale-offer', seed: 'stale-offer', skillSystem: 'cards-v1', cardStarterVersion: 3, cardStarterOfferIds: ['field-impulse', 'body-spark', 'deep-vessel'] };
  const ids = getCardStarterOffers(run).map(offer => offer.cardId);
  assert.equal(ids.length, 3);
  assert.ok(!ids.includes('field-impulse'));
});

test('a saved run holding two Field Impulse copies loads without them and pays two Common melts, once', () => {
  const state = M.newState(), run = state.run = M.createRun(state.profile, 'retire-save', 1, { cards: true });
  run.mountedCards = [makeSkillCard('field-impulse', 'fi:a'), makeSkillCard('body-spark', 'keep:1'), null];
  run.reserveCards = [makeSkillCard('field-impulse', 'fi:b'), makeSkillCard('deep-vessel', 'keep:2')];
  const before = { condensedGlow: run.condensedGlow || 0, secured: run.securedCondensedGlow || 0, earned: run.condensedEarned || 0 };
  const melt = getCardMeltValue(makeSkillCard('field-impulse', 'probe'));
  assert.equal(melt, CARD_ECONOMY.melt.common);
  let text;
  assert.ok(M.saveState(state, { setItem: (_, value) => { text = value; } }));
  const load = () => M.loadState({ getItem: () => text, setItem() {} }).run;
  const loaded = load();
  const held = [...loaded.mountedCards, ...loaded.reserveCards].filter(Boolean).map(card => card.cardId);
  assert.ok(!held.includes('field-impulse'), 'no copy remains');
  assert.deepEqual(held.sort(), ['body-spark', 'deep-vessel']);
  assert.equal(loaded.mountedCards.length, run.mountedCards.length, 'slot count is unchanged');
  assert.equal(loaded.mountedCards[0], null, 'the emptied slot stays valid');
  assert.equal(loaded.condensedGlow, before.condensedGlow + 2 * melt);
  assert.equal(loaded.securedCondensedGlow, before.secured + 2 * melt);
  assert.equal(loaded.condensedEarned, before.earned + 2 * melt);
  // Saving the migrated run and loading again changes nothing.
  const again = { run: loaded, profile: state.profile, settings: state.settings };
  assert.ok(M.saveState(Object.assign(M.newState(), again), { setItem: (_, value) => { text = value; } }));
  const second = load();
  assert.equal(second.condensedGlow, loaded.condensedGlow);
  assert.deepEqual(second.mountedCards, loaded.mountedCards);
  assert.deepEqual(second.reserveCards, loaded.reserveCards);
  cleanCardRun(second);
  assert.equal(second.condensedGlow, loaded.condensedGlow, 'cleaning again pays nothing');
});

test('a retired card in an unclaimed draft is swapped for a live card of the same rarity', () => {
  const state = M.newState(), run = state.run = M.createRun(state.profile, 'retire-draft', 1, { cards: true });
  run.cardDraft = { version: 1, id: 'd', runId: run.id, nodeId: 'x', mapIndex: 0, claimed: false,
    offers: [makeSkillCard('field-impulse', 'o:1'), makeSkillCard('body-spark', 'o:2'), makeSkillCard('deep-vessel', 'o:3')] };
  cleanCardRun(run);
  const ids = run.cardDraft.offers.map(card => card.cardId);
  assert.ok(!ids.includes('field-impulse'));
  assert.equal(new Set(ids).size, 3);
  assert.equal(SKILL_CARDS[run.cardDraft.offers[0].cardId].rarity, 'common');
});
