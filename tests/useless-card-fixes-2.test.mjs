// Cards that did almost nothing alone now bring what they need (2026-11-20, groups 2-4 of the useless-card sweep).
// Real flights in the style of tests/overfill-cards-real-flight.test.mjs (cardPilot on, as in the app).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, sum, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';
import { SKILL_CARDS, makeSkillCard, createCardExecution, resolveCardRow, CARD_ROW_EVENTS, getCardModifiers } from '../dist/skill-cards.mjs';
import { faceTrigger, faceEffect } from '../dist/card-face-lines.mjs';

const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
const flights = (ids, opts = {}) => levels.flatMap(l => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, engineOptions: { cardPilot: true }, ...opts })));
const log = f => f.log.engine.cardEngine?.log || [];
const count = (fl, pred) => sum(fl, f => log(f).filter(pred).length);
const tile = id => SKILL_CARDS[id];

test('Wave Loom alone makes its own Turn and sends one Pulse every 6 s', () => {
  const fl = flights(['wave-loom']);
  const pulses = count(fl, x => x.k === 'world-pulse'), turns = count(fl, x => x.k === 'turn');
  assert.ok(pulses >= fl.length, `${pulses} Pulses in ${fl.length} flights`);
  assert.equal(pulses, turns, 'one Pulse per Turn');
  for (const f of fl) { const t = log(f).filter(x => x.k === 'turn').map(x => x.t); for (let i = 1; i < t.length; i++) assert.ok(Math.abs(t[i] - t[i - 1] - 6) < 1e-6, 'every 6 s'); assert.ok(!log(f).some(x => x.k === 'halt')); }
});

test('Wave Loom with a Timer mounted behaves as before (no extra Turns of its own)', () => {
  const fl = flights(['first-catch', 'metronome', 'wave-loom']);
  for (const f of fl) assert.equal(log(f).filter(x => x.k === 'world-pulse').length, log(f).filter(x => x.k === 'turn').length);
  assert.ok(!count(fl, x => x.k === 'turn' && x.slot === 2), 'no Turn is made by the Loom while a Timer is mounted');
});

test('Slow Wick and Long Fuse light themselves at take-off', () => {
  const wick = flights(['slow-wick']);
  for (const f of wick) { const l = log(f); const lit = l.find(x => x.k === 'lit').t; assert.ok(lit < 0.5, 'lit at take-off'); assert.ok(Math.abs(l.find(x => x.k === 'turn').t - lit - 3) < 1e-6, 'first Turn 3 s later'); }
  const fuse = flights(['long-fuse']);
  for (const f of fuse) { const l = log(f); const lit = l.find(x => x.k === 'lit').t; assert.ok(lit < 0.5); assert.ok(l.some(x => x.k === 'turn' && Math.abs(x.t - lit - 5) < 1e-6), 'first Turn 5 s later'); }
});

test('Afterglow lights its own 1 s Flare at take-off, once a flight, and pays +2 when it ends', () => {
  const fl = flights(['afterglow']);
  for (const f of fl) {
    const l = log(f);
    assert.equal(l.filter(x => x.k === 'flash' && x.slot === -1).length, 1);
    assert.equal(l.filter(x => x.k === 'gain' && x.slot === 0).length, 1);
    assert.equal(l.find(x => x.k === 'gain').amount, 2);
  }
});

test('Spark Chime also hears a real Pulse crossing a Spark (Wave Loom alone to its left)', () => {
  const fl = flights(['wave-loom', 'spark-chime']);
  const heard = count(fl, x => x.k === 'hit' && x.slot === 1 && x.type === 'crossing');
  assert.ok(heard >= 1, `${heard} crossings heard`);
  assert.equal(count(fl, x => x.k === 'gain' && x.slot === 1), count(fl, x => x.k === 'hit' && x.slot === 1));
});

test('First Catch pays +4 Sparks the first time it fires; Low Ember pays +6 (and both still send a Pulse)', () => {
  const rt = ids => createCardExecution(ids.map((id, i) => makeSkillCard(id, `n${i}`)));
  assert.equal(tile('first-catch').amount, 4); assert.equal(tile('low-ember').amount, 6);
  for (const id of ['first-catch', 'low-ember']) assert.deepEqual(tile(id).engine.does, ['gain', 'pulse']);
  const a = flights(['first-catch']);
  assert.ok(a.every(f => log(f).filter(x => x.k === 'gain' && x.slot === 0).every(x => x.amount === 4)));
  assert.equal(count(a, x => x.k === 'gain' && x.slot === 0), a.length, 'once per flight');
  assert.ok(rt(['first-catch']).cards.length);
});

test('Momentum pays +1 Spark on every Timer firing, on top of its Luminance', () => {
  const fl = flights(['first-catch', 'metronome', 'spark-chime', 'momentum']);
  const turns = count(fl, x => x.k === 'turn');
  assert.ok(turns >= 3);
  assert.equal(count(fl, x => x.k === 'gain' && x.slot === 3 && x.amount === 1), turns);
  assert.ok(!count(fl, x => x.k === 'halt'));
});

test('Third Beat reads Timer / 33%: counts twice', () => {
  const def = tile('third-beat'), card = makeSkillCard('third-beat', 't');
  assert.equal(faceTrigger(card, def).word, 'Timer'); assert.equal(faceEffect(card, def), '33%: counts twice');
  assert.equal(faceTrigger(makeSkillCard('wave-loom', 'w'), tile('wave-loom')).word, 'Timer');
});

test('Flare Thread lets the Collector fetch a Flare, so it fires on a fetched Flare too', () => {
  const m = getCardModifiers({ skillSystem: 'cards-v1', mountedCards: [makeSkillCard('flash-thread', 'f')], reserveCards: [] });
  assert.equal(m.cardFlashFetch, true);
});

test('Clear Prism pays +6 Sparks on a Flare by itself and still doubles the Flare cards before it', () => {
  const flare = ids => resolveCardRow(createCardExecution(ids.map((id, i) => makeSkillCard(id, `c${i}`))), { kind: CARD_ROW_EVENTS.flash, pickupKind: 'sight', meterFraction: .5 });
  assert.equal(flare(['clear-prism']).sparks, 6);
  assert.equal(flare(['flash-handling', 'clear-prism']).sparks, 6 * 2 + 6, 'Flare Handling doubled, plus the Prism’s own 6 (not doubled)');
});
