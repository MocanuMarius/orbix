import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard, SKILL_CARDS, LIVE_CARDS, drawSkillCardDraft, describeSkillCard, hasSecondLook, isUnofferedCard} from '../dist/skill-cards.mjs';
import {cardDraftMarkup, cardDraftRerollMarkup} from '../dist/card-ui.mjs';

function fresh(seed) {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, {cards: true});
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id));
  return state;
}
function clear(state) {
  const node = M.getChoices(state.run).find(n => n.type !== 'support');
  assert.ok(M.selectNode(state.run, node.id)); assert.ok(M.beginFlightAttempt(state.run));
  assert.ok(M.markFlightAttemptStarted(state.run));
  assert.ok(M.finishFlight(state.run, {success: true, flame: 50})); M.settleCheckpoint(state);
  return state.run.cardDraft;
}
const mount = run => { const slot = run.mountedCards.findIndex(c => !c); run.mountedCards[slot < 0 ? 0 : slot] = makeSkillCard('second-look', 'sl:1'); };
const reload = state => {let text; const st = {getItem: () => text, setItem: (_, v) => { text = v; }}; assert.ok(M.saveState(state, st)); return M.loadState(st);};
const rarity = card => SKILL_CARDS[card.cardId].rarity;

test('Second Look is a Rare Passive card with the owner text, no uses and not copyable', () => {
  const def = SKILL_CARDS['second-look'];
  assert.equal(def.rarity, 'rare'); assert.equal(def.trigger, 'always-on'); assert.equal(def.copyable, false); assert.equal(def.charges, undefined);
  assert.ok(!def.starterOnly && !def.unreleased && !def.retired);
  assert.match(describeSkillCard(makeSkillCard('second-look', 'x')).effect, /re-roll one offered card into another card of the same rarity/i);
});

test('the Re-roll button shows only while Second Look is mounted', () => {
  const state = fresh('sl:button'), run = state.run, draft = clear(state);
  assert.equal(cardDraftRerollMarkup(run, draft), '', 'no Second Look');
  run.reserveCards.push(makeSkillCard('second-look', 'sl:deck')); assert.equal(cardDraftRerollMarkup(run, draft), '', 'Deck only');
  assert.equal(M.rerollCardDraft(state, draft.id, draft.offers[0].instanceId), false);
  mount(run);
  assert.match(cardDraftRerollMarkup(run, draft), /data-action="card-draft-reroll"/);
  assert.match(cardDraftMarkup(run), /card-reroll/);
  assert.match(cardDraftRerollMarkup(run, draft), /Select a card first/);
});

test('re-roll gives another card of the same rarity, not in the pack, once per reward; several Second Looks do not stack', () => {
  const state = fresh('sl:once'), run = state.run, draft = clear(state);
  mount(run); run.reserveCards.push(makeSkillCard('second-look', 'sl:2'));
  const before = draft.offers.map(c => c.cardId), target = draft.offers[1], tier = rarity(target);
  assert.ok(M.rerollCardDraft(state, draft.id, target.instanceId));
  const after = run.cardDraft.offers;
  assert.equal(after.length, 3); assert.notEqual(after[1].cardId, before[1]); assert.equal(rarity(after[1]), tier);
  assert.equal(new Set(after.map(c => SKILL_CARDS[c.cardId].name)).size, 3);
  assert.deepEqual([after[0].cardId, after[2].cardId], [before[0], before[2]]);
  assert.equal(M.rerollCardDraft(state, draft.id, after[0].instanceId), false, 'second re-roll refused');
  assert.match(cardDraftRerollMarkup(run, run.cardDraft), /Re-rolled/);
  assert.doesNotMatch(cardDraftRerollMarkup(run, run.cardDraft), /data-action/);
});

test('the re-roll survives save and load: same card, still used, no second re-roll', () => {
  const state = fresh('sl:save'), run = state.run, draft = clear(state); mount(run);
  assert.ok(M.rerollCardDraft(state, draft.id, draft.offers[0].instanceId));
  const saved = run.cardDraft.offers.map(c => c.cardId), field = structuredClone(run.cardDraft.reroll);
  const back = reload(state).run;
  assert.deepEqual(back.cardDraft.offers.map(c => c.cardId), saved);
  assert.deepEqual(back.cardDraft.reroll, field); assert.equal(back.cardDraft.reroll.used, true);
  assert.equal(M.rerollCardDraft({run: back}, back.cardDraft.id, back.cardDraft.offers[2].instanceId), false);
});

test('a Guardian reserved Legendary re-rolls into another Legendary; an Elite Rare into another Rare', () => {
  for (const [kind, want] of [['boss', 'legendary'], ['elite', 'rare']]) {
    for (let s = 0; s < 12; s++) {
      const state = fresh(`sl:${kind}:${s}`), run = state.run, draft = clear(state); mount(run);
      draft.offers = drawSkillCardDraft(run, {...run.lastFlight && {id: draft.nodeId}, id: draft.nodeId, [kind]: true});
      assert.equal(rarity(draft.offers[0]), want);
      assert.ok(M.rerollCardDraft(state, draft.id, draft.offers[0].instanceId), `${kind} ${s}`);
      assert.equal(rarity(run.cardDraft.offers[0]), want);
    }
  }
});

test('excluded pools stay excluded: never retired, unreleased or starter-only cards', () => {
  const seen = new Set();
  for (let s = 0; s < 60; s++) {
    const state = fresh(`sl:pool:${s}`), run = state.run, draft = clear(state); mount(run);
    const target = draft.offers[s % 3];
    if (!M.rerollCardDraft(state, draft.id, target.instanceId)) continue;
    const now = run.cardDraft.offers.find(c => c.instanceId === target.instanceId);
    seen.add(now.cardId);
    assert.ok(!isUnofferedCard(now.cardId) && !SKILL_CARDS[now.cardId].starterOnly, now.cardId);
  }
  assert.ok(seen.size > 3);
  const one = fresh('sl:seed'), r = one.run, d = clear(one); mount(r); r.reserveCards.push(makeSkillCard('growth-seed-common', 'seed:1'));
  for (const c of LIVE_CARDS.filter(x => x.kind === 'camp-grow')) assert.ok(c.id);
});

test('the re-roll is deterministic for the draft', () => {
  const pick = () => { const state = fresh('sl:det'), draft = clear(state); mount(state.run); M.rerollCardDraft(state, draft.id, draft.offers[0].instanceId); return state.run.cardDraft.offers.map(c => c.cardId); };
  assert.deepEqual(pick(), pick());
});

test('hasSecondLook counts only mounted cards', () => {
  const state = fresh('sl:has'), run = state.run;
  assert.equal(hasSecondLook(run), false); mount(run); assert.equal(hasSecondLook(run), true);
});
