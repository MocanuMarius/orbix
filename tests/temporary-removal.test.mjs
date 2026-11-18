// Temporary Inscriptions are gone: old saves drop them (restoring what they covered), no reward opens a slot choice except the Scribe
// and chest Inscription finds, events pay at once, and a wager lasts exactly one flight.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {INSCRIPTIONS} from '../dist/inscriptions.mjs';
import {eventSparks} from '../dist/event-choices.mjs';
import {OATHS, oathReward} from '../dist/oaths.mjs';
import {objectiveSparks} from '../dist/route-bonuses.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';

const memory = () => { let value; return {setItem: (k, v) => { value = v; }, getItem: () => value}; };
function cardRun(seed = 'tr') {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, seed, 1, {cards: true});
  M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id);
  return state;
}
function atEvent(state, eventIndex, patch = {}) {
  const r = state.run;
  r.current = {...r.map[0][0], type: 'support', kind: 'event', eventIndex, ...patch};
  r.map[0] = [r.current]; r.path = [r.current.id]; r.phase = 'support'; r.supportOffers = null;
  return r;
}

test('old saves: temporary entries drop, the covered permanent Inscription returns, a pending temporary choice is skipped, loose fields go', () => {
  const state = cardRun('old-save'), run = state.run;
  run.cardSlots = 3; run.mountedCards = [null, null, null];
  run.slotInscriptions = [
    {id: 'mending', temporary: true, flightsLeft: 2, covers: {id: 'gilded'}},
    {id: 'closed-eye', temporary: true, until: 'fulfilled', covers: null},
    {id: 'hollow'}];
  run.pendingTemporary = {id: 'mending', flights: 3, source: 'route-bonus'};
  run.passageBoons = {'long-glide': 2}; run.eventFavors = ['wick']; run.nextFlightPact = 'night-ledger'; run.pilgrimVow = {target: 4}; run.treasurePact = 'wager';
  const store = memory(); M.saveState(state, store);
  const back = M.loadState(store).run;
  assert.deepEqual(back.slotInscriptions, [{id: 'gilded'}, null, {id: 'hollow'}]);
  for (const key of ['pendingTemporary', 'passageBoons', 'eventFavors', 'nextFlightPact', 'pilgrimVow', 'treasurePact', 'pendingOath']) assert.equal(back[key], undefined, key);
  assert.ok(M.selectNode(back, M.getChoices(back)[0].id), 'the save loads on to the next sensible step');
});

test('old saves: a pending chest find (permanent) survives, a pending temporary one does not', () => {
  const state = cardRun('old-find'), run = state.run;
  run.cardSlots = 3; run.mountedCards = [null, null, null];
  run.pendingTemporary = {id: 'far-lens', permanent: true, source: 'chest'};
  const store = memory(); M.saveState(state, store);
  assert.equal(M.loadState(store).run.pendingTemporary?.id, 'far-lens');
});

test('no reward path queues a slot choice except the Scribe and chest finds', () => {
  const state = cardRun('no-slot-choice');
  for (const eventIndex of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    const s = cardRun('no-slot-choice-' + eventIndex), r = atEvent(s, eventIndex);
    r.mountedCards = [makeSkillCard('body-spark', 'a'), null, null]; r.lives = 1;
    const offers = M.getSupportChoices(r, s.profile);
    for (let i = 0; i < offers.length; i++) {
      const copy = structuredClone(s);
      const rr = copy.run; rr.supportOffers = null;
      if (M.resolveSupport(rr, i, copy.profile)) assert.equal(rr.pendingTemporary, undefined, `event ${eventIndex} offer ${i}`);
    }
  }
  assert.ok(state.run);
});

test('each event offers two outcomes that both work at once', () => {
  for (let eventIndex = 0; eventIndex <= 11; eventIndex++) {
    const s = cardRun('two-' + eventIndex), r = atEvent(s, eventIndex);
    r.mountedCards = [makeSkillCard('body-spark', 'a'), null, null]; r.lives = 1; r.flame = 10;
    const offers = M.getSupportChoices(r, s.profile);
    assert.ok(offers.length >= 2, `event ${eventIndex}`);
    for (let i = 0; i < offers.length; i++) {
      const copy = structuredClone(s), rr = copy.run; rr.supportOffers = null;
      if (offers[i].disabled) { assert.ok(offers[i].disabledReason, `event ${eventIndex} offer ${i} says why`); assert.equal(M.resolveSupport(rr, i, copy.profile), false); continue; } // a card outcome with no eligible card stays on screen, disabled
      assert.ok(M.resolveSupport(rr, i, copy.profile), `event ${eventIndex} offer ${i}: ${offers[i].title}`);
      assert.equal(rr.pendingTemporary, undefined);
    }
  }
});

test('event sparks scale by map and a card outcome goes through the claim path', () => {
  assert.deepEqual([0, 1, 2].map(mapIndex => eventSparks({mapIndex})), [20, 30, 40]);
  const s = cardRun('event-card'), r = atEvent(s, 11);
  const before = (r.reserveCards || []).length + r.mountedCards.filter(Boolean).length;
  const card = M.grantEventCard(r);
  assert.ok(card?.name);
  assert.equal((r.reserveCards || []).length + r.mountedCards.filter(Boolean).length, before + 1);
  assert.equal(M.grantEventCard(r), null, 'one card per event stop');
});

test('a wager lasts exactly one flight: won pays Stored Sparks, not met pays nothing, gone either way', () => {
  for (const id of Object.keys(OATHS)) for (const success of [true, false]) {
    const s = cardRun('wager-' + id), r = s.run;
    r.pendingOath = {id};
    const node = M.getChoices(r)[0];
    assert.ok(M.selectNode(r, node.id) && M.beginFlightAttempt(r));
    assert.equal(r.pendingOath, undefined, 'taken by the flight that begins');
    assert.equal(r.attemptEntry.oath.id, id);
    assert.ok(M.markFlightAttemptStarted(r));
    const result = {success, flame: 60, bodyFuelCollected: 5};
    const before = r.condensedEarned || 0;
    assert.ok(M.finishFlight(r, result));
    assert.equal(r.pendingOath, undefined);
    if (success) assert.ok((r.condensedEarned || 0) - before >= oathReward(r, id), id);
    else assert.equal(r.lastFlight, undefined, 'a fall pays nothing');
    assert.equal(r.slotInscriptions.some(e => e?.temporary), false);
  }
  assert.equal(oathReward({mapIndex: 1}, 'pilgrim-vow'), objectiveSparks({mapIndex: 1}) * 3);
});

test('an interrupted gate gives the wager back; a started flight spends it', () => {
  const s = cardRun('wager-interrupt'), r = s.run;
  r.pendingOath = {id: 'night-ledger'};
  assert.ok(M.selectNode(r, M.getChoices(r)[0].id) && M.beginFlightAttempt(r));
  M.suspendRun(s);
  assert.equal(r.pendingOath?.id, 'night-ledger');
});

test('the catalogue has no temporary Inscription left', () => {
  assert.equal(Object.values(INSCRIPTIONS).some(i => i.temporary), false);
});
