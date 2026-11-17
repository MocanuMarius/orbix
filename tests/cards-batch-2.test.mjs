// Batch 2 of the approved v1.0-cards proposals: Scar Tissue, Collector's Ledger, Old Friend (the cards that count).
// Each: pays in its condition, not otherwise, keeps its count on the card, loses it when unmounted, survives a save clean.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS, LIVE_CARDS, makeSkillCard, createCardExecution, resolveCardRow, isUnofferedCard, cleanCardRun,
  getCardTallies, commitCardTallies, cardTallyLine} from '../dist/skill-cards.mjs';

const ids = ['scar-tissue', 'collectors-ledger', 'old-friend'];
const row = list => list.map((id, i) => id ? makeSkillCard(id, `c${i}`) : null);
const EVENTS = {collect: {kind: 'body-spark', pickupKind: 'light', meterFraction: 0.1, firstCrossing: true}, save: {kind: 'guard-rescue', meterFraction: 0.1},
  delivery: {kind: 'collector-delivery', pickupKind: 'light'}, clear: {kind: 'flight-clear'}};
const send = (runtime, name) => resolveCardRow(runtime, EVENTS[name]);
const save = run => { const copy = JSON.parse(JSON.stringify(run)); cleanCardRun(copy); return copy; };
const fakeRun = mounted => ({id: 'r1', skillSystem: 'cards-v1', cardSlots: 3, mountedCards: mounted, reserveCards: []});

test('the batch is in the catalog, unreleased and never offered', () => {
  for (const id of ids) {
    assert.equal(SKILL_CARDS[id].unreleased, true, id);
    assert.ok(isUnofferedCard(id) && !LIVE_CARDS.includes(SKILL_CARDS[id]), id);
  }
  assert.deepEqual(ids.map(id => SKILL_CARDS[id].rarity), ['common', 'rare', 'common']);
});

test('Scar Tissue: +1 Spark on every Collect for each Save, count on the card, none when unmounted', () => {
  const runtime = createCardExecution(row(['scar-tissue', null, null]));
  assert.equal(send(runtime, 'collect').sparks, 0, 'no Save yet');
  assert.equal(send(runtime, 'save').sparks, 0, 'a Save itself pays nothing');
  send(runtime, 'save');
  assert.equal(runtime.cards[0].tally, 2);
  assert.equal(send(runtime, 'collect').sparks, 2);
  assert.equal(send(runtime, 'delivery').sparks, 0, 'only Collect pays');
  const gone = createCardExecution(row([null, null, null]));
  send(gone, 'save');
  assert.equal(send(gone, 'collect').sparks, 0, 'unmounted: nothing counted, nothing paid');
  assert.equal(cardTallyLine(runtime.cards[0]), 'Saves 2 · +2 per Collect');
});

test("Collector's Ledger: +1 per Delivery, +1 more after every 10 Deliveries, count on the card", () => {
  const runtime = createCardExecution(row(['collectors-ledger', null, null]));
  const paid = [];
  for (let i = 0; i < 21; i++) paid.push(send(runtime, 'delivery').sparks);
  assert.deepEqual([paid[0], paid[9], paid[10], paid[19], paid[20]], [1, 1, 2, 2, 3]);
  assert.equal(runtime.cards[0].tally, 21);
  assert.equal(send(runtime, 'collect').sparks, 0, 'only Delivery pays');
  assert.equal(cardTallyLine(runtime.cards[0]), 'Deliveries 21 · +3 now');
  const gone = createCardExecution(row([null, null, null]));
  send(gone, 'delivery');
  assert.equal(getCardTallies(gone)['c0'], undefined);
});

test('Old Friend: +1 Spark per cleared flight it has stayed in the Chain, on any Trigger, none when unmounted', () => {
  const runtime = createCardExecution(row(['old-friend', null, null]));
  assert.equal(send(runtime, 'collect').sparks, 0, 'a new friend pays nothing');
  send(runtime, 'clear'); send(runtime, 'clear'); send(runtime, 'clear');
  assert.equal(runtime.cards[0].tally, 3);
  assert.equal(send(runtime, 'collect').sparks, 3);
  assert.equal(send(runtime, 'delivery').sparks, 3, 'Any Trigger: a Delivery pays too');
  const gone = createCardExecution(row([null, null, null]));
  send(gone, 'clear');
  assert.equal(send(gone, 'collect').sparks, 0);
});

test('counts are written to the mounted card, survive a save clean, and go when the card leaves', () => {
  for (const [id, event, n] of [['scar-tissue', 'save', 4], ['collectors-ledger', 'delivery', 12], ['old-friend', 'clear', 2]]) {
    const run = fakeRun(row([id, null, null]));
    const runtime = createCardExecution(run.mountedCards);
    for (let i = 0; i < n; i++) send(runtime, event);
    commitCardTallies(run, getCardTallies(runtime));
    assert.equal(run.mountedCards[0].tally, n, id);
    assert.equal(save(run).mountedCards[0].tally, n, `${id} keeps its count through a save clean`);
    commitCardTallies(run, {c0: 1});
    assert.equal(run.mountedCards[0].tally, n, 'counts only grow');
    const reserve = fakeRun([null, null, null]); reserve.reserveCards = [makeSkillCard(id, 'c0')];
    commitCardTallies(reserve, {c0: n});
    assert.equal(reserve.reserveCards[0].tally, undefined, `${id} counts nothing outside the Chain`);
  }
});
