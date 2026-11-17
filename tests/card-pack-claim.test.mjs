import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard, SKILL_CARDS} from '../dist/skill-cards.mjs';
import {cardRewardMarkup} from '../dist/card-ui.mjs';
import {deckScreenMarkup, createDeckView} from '../dist/ui/deck-screen.mjs';

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
  return M.getCardDraft(state.run);
}
const reload = state => {let text; const st = {getItem: () => text, setItem: (_, v) => { text = v; }}; assert.ok(M.saveState(state, st)); return M.loadState(st);};

test('winning a card takes it into the reserve and leaves: no equip step, not mounted', () => {
  const state = fresh('claim:plain'), run = state.run, mounted = run.mountedCards.map(c => c?.instanceId);
  const draft = clear(state), pick = draft.offers.find(c => !M.isCardRun || c.cardId);
  assert.ok(M.claimDraftedCard(state, draft.id, pick.instanceId));
  assert.equal(run.cardReward.uiAcknowledged, true, 'the receipt screen is skipped');
  assert.deepEqual(run.mountedCards.map(c => c?.instanceId), mounted, 'nothing is auto-mounted when cards are mounted');
  assert.ok(run.reserveCards.some(c => c.instanceId === pick.instanceId));
  assert.equal(M.getCardDraft(run), null);
  assert.doesNotMatch(cardRewardMarkup(run) || '', /card-reward-equip|card-reward-slot/);
  assert.ok(M.isCardNew(run, pick.instanceId));
});

test('the very first card of a run (nothing mounted) is mounted in the first empty slot; Dream never has a card to its right', () => {
  for (const dream of [false, true]) {
    const state = fresh(`claim:first:${dream}`), run = state.run;
    const draft = clear(state);
    run.reserveCards.push(...run.mountedCards.filter(Boolean)); run.mountedCards = run.mountedCards.map(() => null);
    if (dream) {
      const id = Object.keys(SKILL_CARDS).find(k => SKILL_CARDS[k].kind === 'dream');
      draft.offers[0] = makeSkillCard(id, 'dream:offer'); run.cardDraft.offers[0] = draft.offers[0];
    }
    assert.ok(M.claimDraftedCard(state, draft.id, draft.offers[0].instanceId));
    assert.equal(run.mountedCards[0]?.instanceId, draft.offers[0].instanceId);
    assert.equal(run.mountedCards.slice(1).filter(Boolean).length, 0, 'no card to its right');
    assert.equal(M.isCardNew(run, draft.offers[0].instanceId), false, 'a mounted first card needs no badge');
  }
});

test('NEW: set on gain, cleared when seen, persisted, absent on old saves, starters not new', () => {
  let state = fresh('new:flag'), run = state.run;
  assert.deepEqual(M.getUnseenCardIds(run), [], 'starting cards are not new');
  const draft = clear(state), pick = draft.offers[0];
  assert.ok(M.claimDraftedCard(state, draft.id, pick.instanceId));
  state = reload(state); run = state.run;
  assert.deepEqual(M.getUnseenCardIds(run), [pick.instanceId], 'persisted');
  const html = deckScreenMarkup(run, {...createDeckView(), tab: 'deck'}, {});
  assert.equal((html.match(/data-new>NEW</g) || []).length, 1);
  assert.match(html, /dk2-tabdot/, 'dot on the Deck tab');
  assert.ok(M.markCardsSeen(run, [pick.instanceId]));
  assert.doesNotMatch(deckScreenMarkup(run, {...createDeckView(), tab: 'deck'}, {}), /data-new>|dk2-tabdot/);
  delete run.unseenCardIds; state = reload(state);
  assert.deepEqual(M.getUnseenCardIds(state.run), [], 'old saves: nothing is new');
  state.run.unseenCardIds = ['ghost-id']; state = reload(state);
  assert.deepEqual(M.getUnseenCardIds(state.run), [], 'ids of cards no longer owned are dropped');
});

test('Filter: one button in the top bar, the menu applies and clears, the body has no chip row', () => {
  const run = fresh('filter:menu').run;
  const view = {...createDeckView(), tab: 'deck'};
  const closed = deckScreenMarkup(run, view, {});
  assert.equal((closed.match(/id="dk2-filter"/g) || []).length, 1);
  assert.match(closed, /aria-haspopup="menu"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*aria-haspopup="menu"/);
  assert.doesNotMatch(closed, /data-filter=|dk2-chips/);
  assert.ok(closed.indexOf('id="dk2-filter"') < closed.indexOf('id="dk2-deckpanel"'), 'the button sits in the header');
  const open = deckScreenMarkup(run, {...view, menu: true}, {});
  assert.match(open, /aria-expanded="true"/);
  for (const f of ['all', 'common', 'rare', 'legendary']) assert.match(open, new RegExp(`data-filter="${f}"`));
  assert.doesNotMatch(open, /data-clear/, 'no Clear while nothing is filtered');
  const on = deckScreenMarkup(run, {...view, filter: 'rare', menu: true}, {});
  assert.match(on, /dk2-filter-on/); assert.match(on, /data-clear/); assert.match(on, /dk2-dot/);
  assert.doesNotMatch(deckScreenMarkup(run, {...view, filter: 'rare'}, {}).split('id="dk2-deckpanel"')[0], /class="dk2-filtermenu"/);
  assert.equal((deckScreenMarkup(run, {...createDeckView(), tab: 'chain'}, {}).match(/id="dk2-filter"/g) || []).length, 0, 'Chain tab has no Filter');
});
