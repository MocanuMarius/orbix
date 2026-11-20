// Batch 3 of the approved v1.0-cards proposals: the cards that need a small hook in the flight or the engine.
// Gilded Rim, Second Wind, Undertow, Tributary, Tithe (Magpie is skipped: Dusk Sparks have no Stored Sparks to double).
// Each hook only acts while its card is mounted; every hook has a test that a flight without the card is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {SKILL_CARDS, LIVE_CARDS, CARD_UNIT, makeSkillCard, createCardExecution, resolveCardRow, isUnofferedCard, cleanCardRun,
  getCardTallies, getCardTallyCapacity, cardTallyLine} from '../dist/skill-cards.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';

const ids = ['gilded-rim', 'second-wind', 'undertow', 'tributary', 'tithe'];
const row = list => list.map((id, i) => id ? makeSkillCard(id, `c${i}`) : null);
const canvas = {getContext: () => ({setTransform() {}}), getBoundingClientRect: () => ({width: 900, height: 430})};
const flightWith = (list, options = {}) => {
  const e = new WispFlight({canvas, preflight: true, seed: 'batch-3', cardPilot: true, ...options,
    modifiers: {cardPilot: true, cardExecution: {cards: row(list)}}});
  e.running = true; return e;
};
const spy = e => { const kinds = [], orig = e.resolveCardRowEvent.bind(e); e.resolveCardRowEvent = (kind, ...rest) => { kinds.push(kind); return orig(kind, ...rest); }; return kinds; };
const fakeRun = mounted => ({id: 'r1', skillSystem: 'cards-v1', cardSlots: 3, mountedCards: mounted, reserveCards: []});
const LIFT = {kind: 'downbeat-lift', meterFraction: 0.1};

test('the batch is in the catalog, unreleased and never offered', () => {
  for (const id of ids) {
    assert.equal(SKILL_CARDS[id].unreleased, true, id);
    assert.ok(isUnofferedCard(id) && !LIVE_CARDS.includes(SKILL_CARDS[id]), id);
    assert.ok(SKILL_CARDS[id].ruleBands.length === 2 && !SKILL_CARDS[id].artFamily === false, id);
  }
  assert.deepEqual(ids.map(id => SKILL_CARDS[id].rarity), ['legendary', 'rare', 'common', 'rare', 'common']);
  assert.equal(SKILL_CARDS.magpie, undefined, 'Magpie is skipped: its rule has no Stored Sparks to double');
});

test('Gilded Rim: each Overfill from a collected Spark is +1 max Sparks, counted on the card, only while mounted', () => {
  const e = flightWith(['gilded-rim', null, null]);
  try {
    for (let i = 0; i < 3; i++) { e.flame = e.maxFlame; e.collect({kind: 'light'}); }
    assert.equal(e.cardExecution.cards[0].tally, 3, 'three real Overfills');
    e.flame = 1; e.collect({kind: 'light'});
    assert.equal(e.cardExecution.cards[0].tally, 3, 'a Collect that does not overfill counts nothing');
    assert.deepEqual(getCardTallies(e.cardExecution), {c0: 3});
    assert.equal(cardTallyLine(e.cardExecution.cards[0]), 'Overfills 3 · +3 max Sparks');
  } finally { e.destroy(); }
  const run = fakeRun(row(['gilded-rim', null, null]));
  const base = getGlowCapacity(fakeRun(row([null, null, null])));
  run.mountedCards[0].tally = 4;
  assert.equal(getCardTallyCapacity(run), 4 * CARD_UNIT);
  assert.equal(getGlowCapacity(run), Math.min(100 * CARD_UNIT, base + 4 * CARD_UNIT), 'added to the meter through the same route as Black Hole');
  run.mountedCards[0].tally = 500;
  assert.ok(getGlowCapacity(run) <= 100 * CARD_UNIT, 'the Spark Meter cap of 100 holds');
  const gone = fakeRun(row([null, null, null])); gone.reserveCards = [Object.assign(makeSkillCard('gilded-rim', 'c0'), {tally: 9})];
  assert.equal(getCardTallyCapacity(gone), 0, 'in the reserve it counts for nothing');
  const saved = JSON.parse(JSON.stringify(run)); cleanCardRun(saved);
  assert.equal(saved.mountedCards[0].tally, 500, 'the count survives a save clean');
});

test('Second Wind: after a Save, every Trigger fires the Chain for 5 s; nothing is left after the flight', () => {
  const e = flightWith(['body-spark', 'second-wind', null]);
  try {
    const lift = () => e.resolveCardRowEvent('downbeat-lift', {pickupKind: 'light'});
    assert.equal(lift(), null, 'no Save yet: a Collect card does not hear a Lift');
    e.startSecondWind();
    assert.equal(e.cardSecondWindUntil, e.time + 5);
    assert.ok(lift().receipt.sparks > 0, 'inside the 5 s a Lift fires the Collect card');
    e.time += 4.9; assert.ok(lift(), 'still inside');
    e.time += 0.2; assert.equal(lift(), null, 'past 5 s it is over');
  } finally { e.destroy(); }
  const next = flightWith(['body-spark', 'second-wind', null]);
  try { assert.equal(next.cardSecondWindUntil, 0, 'a new flight starts with no window'); } finally { next.destroy(); }
  const plain = createCardExecution(row(['body-spark', null, null]));
  const idle = resolveCardRow(plain, {...LIFT, secondWind: true});
  assert.equal(idle.sparks, 0, 'the flag alone does nothing without the card');
});

test('Undertow: a Falling Lift is one Collect for the cards to its right only, and cannot loop', () => {
  const e = flightWith(['undertow', 'body-spark', null]);
  try {
    const kinds = spy(e), seq = e.cardRowSequence;
    e.undertowCollect({meterFraction: 0.1});
    assert.deepEqual(kinds.filter(k => k !== 'natural-overfill'), ['body-spark'], 'exactly one Collect (the Sparks it made at a full Meter may be heard as an Overfill, by the one-Overfill rule)');
    assert.equal(e.cardRowSequence, seq + 1, 'one event, no echo');
    assert.ok(e.cardRowTrace.sparks > 0, 'the Collect card on its right paid');
  } finally { e.destroy(); }
  const left = flightWith(['body-spark', 'undertow', null]);
  try {
    left.undertowCollect({meterFraction: 0.1});
    assert.equal(left.cardRowTrace, null, 'a Collect card to its left does not hear it');
  } finally { left.destroy(); }
});

test('Tributary: every 3rd Collect also fires the Delivery cards to its right; the count is on the card', () => {
  const e = flightWith(['tributary', 'courier-tip', null]);
  try {
    const kinds = spy(e);
    for (let i = 0; i < 7; i++) e.collect({kind: 'light'});
    assert.equal(kinds.filter(k => k === 'collector-delivery').length, 2, 'Collects 3 and 6');
    assert.equal(kinds.filter(k => k === 'body-spark').length, 7);
    assert.equal(e.cardExecution.cards[0].tally, 7);
    assert.equal(cardTallyLine(e.cardExecution.cards[0]), 'Collects 7 · Delivery in 2');
    assert.deepEqual(getCardTallies(e.cardExecution), {c0: 7});
  } finally { e.destroy(); }
  const left = flightWith(['courier-tip', 'tributary', null]);
  try {
    const kinds = spy(left); let before = 0;
    for (let i = 0; i < 3; i++) left.collect({kind: 'light'});
    before = left.cardRowSequence;
    assert.equal(left.cardRowTrace?.event?.kind === 'collector-delivery' ? left.cardRowTrace.sparks : 0, 0, 'a Delivery card on its left earns nothing from it');
    assert.equal(kinds.filter(k => k === 'collector-delivery').length, 1, 'the event is still made once');
    assert.ok(before > 0);
  } finally { left.destroy(); }
});

test('Tithe: at Pack it pays 5 Stored Sparks (those the flight began with) and the count on the card is +1 max Sparks', () => {
  const e = flightWith(['tithe', null, null], {condensedGlow: 12});
  try {
    e.flame = 30; e.finish(true);
    assert.equal(e.cardTithePaid, 5);
    assert.equal(e.cardExecution.cards[0].tally, 1);
    assert.equal(cardTallyLine(e.cardExecution.cards[0]), 'Tithes 1 · +1 max Sparks');
  } finally { e.destroy(); }
  const poor = flightWith(['tithe', null, null], {condensedGlow: 4});
  try { poor.flame = 30; poor.finish(true); assert.equal(poor.cardTithePaid, 0, 'under 5 Stored Sparks: nothing is paid'); assert.equal(poor.cardExecution.cards[0].tally, undefined); } finally { poor.destroy(); }
  const dead = flightWith(['tithe', null, null], {condensedGlow: 12});
  try { dead.flame = 30; dead.finish(false); assert.equal(dead.cardTithePaid, 0, 'no Pack, no Tithe'); } finally { dead.destroy(); }
  const finish = paid => {
    const state = M.newState(); state.profile.tutorialComplete = true;
    const run = state.run = M.createRun(state.profile, 'tithe-run', 1, {cards: true});
    M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id);
    run.mountedCards[2] = makeSkillCard('tithe', 't1'); run.condensedGlow = 20;
    const node = M.getChoices(run).find(choice => choice.type !== 'support');
    M.selectNode(run, node.id); M.beginFlightAttempt(run); M.markFlightAttemptStarted(run);
    const capBefore = getGlowCapacity(run);
    assert.ok(M.finishFlight(run, {success: true, flame: 60, ...(paid ? {cardTithePaid: paid, cardTallies: {t1: 1}} : {})}));
    return {run, capBefore};
  };
  const control = finish(0), paid = finish(5);
  assert.equal(control.run.condensedGlow - paid.run.condensedGlow, 5, 'five Stored Sparks were spent');
  assert.equal(paid.run.lastFlight.cardTithePaid, 5); assert.equal(control.run.lastFlight.cardTithePaid, undefined);
  assert.equal(paid.run.mountedCards[2].tally, 1); assert.equal(control.run.mountedCards[2].tally, undefined);
  assert.equal(getGlowCapacity(paid.run), Math.min(100 * CARD_UNIT, paid.capBefore + CARD_UNIT), '+1 max Sparks while mounted');
});

// Safety: with none of the new cards mounted the hooks change nothing.
test('no new card in the Chain: Collects, Lifts, Saves and the clear behave as before', () => {
  const play = (list, tamper) => {
    const e = flightWith(list, {condensedGlow: 40});
    try {
      if (tamper) tamper(e);
      const kinds = spy(e), out = [];
      e.flame = e.maxFlame * 0.5;
      for (let i = 0; i < 4; i++) { e.collect({kind: 'light'}); out.push(e.flame); }
      out.push(e.resolveCardRowEvent('downbeat-lift', {pickupKind: 'light'})?.receipt.sparks ?? null);
      e.flame = e.maxFlame; e.collect({kind: 'cache'}); out.push(e.flame);
      e.finish(true);
      return {kinds, out, tallies: getCardTallies(e.cardExecution), tithe: e.cardTithePaid, sequence: e.cardRowSequence};
    } finally { e.destroy(); }
  };
  const chain = ['body-spark', 'courier-tip', 'downbeat'];
  const base = play(chain);
  // A wind window, a Tributary count or an Undertow call do nothing without their card mounted.
  const tampered = play(chain, e => { e.cardSecondWindUntil = 1e9; e.cardTributaryFired = {c0: 3}; });
  assert.deepEqual(tampered, base, 'a flight without the cards ignores every hook');
  const flight = flightWith(chain);
  try {
    const seq = flight.cardRowSequence;
    flight.undertowCollect({meterFraction: 0.1}); flight.tributaryDelivery({meterFraction: 0.1}); flight.startSecondWind();
    assert.equal(flight.cardRowSequence, seq, 'no event is made');
    assert.equal(flight.cardSecondWindUntil, 0);
  } finally { flight.destroy(); }
  assert.equal(base.tithe, 0);
  assert.deepEqual(base.tallies, {});
});

test('no new card: the row walker and the meter ignore the batch-3 fields', () => {
  const list = ['body-spark', 'courier-tip', 'downbeat'];
  for (const event of [{kind: 'body-spark', pickupKind: 'light'}, {kind: 'collector-delivery', pickupKind: 'light'}, LIFT]) {
    const a = resolveCardRow(createCardExecution(row(list)), event);
    const b = resolveCardRow(createCardExecution(row(list)), {...event, secondWind: true, fromSlot: undefined});
    assert.equal(b.sparks, a.sparks); assert.deepEqual(b.steps.map(s => [s.slot, s.operation, s.success]), a.steps.map(s => [s.slot, s.operation, s.success]));
  }
  const run = fakeRun(row(list)), none = fakeRun(row([null, null, null]));
  assert.equal(getCardTallyCapacity(run), 0);
  assert.equal(getGlowCapacity(run), getGlowCapacity(none));
});
