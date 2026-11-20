// New Commons, batch 3 (2026-11-20): Radar, Ember Snack, Kindling. Each reuses an existing mechanism.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_CARDS, LIVE_CARDS, makeSkillCard, CARD_UNIT } from '../dist/skill-cards.mjs';
import { faceTrigger, faceEffect } from '../dist/card-face-lines.mjs';
import { cardTileLine } from '../dist/card-tile-lines.mjs';
import { stepRadar, RADAR_INTERVAL } from '../dist/card-engine-flight.mjs';
import { synthFlight } from '../scripts/balance/card-works-probes.mjs';
import { makeRun, M } from '../scripts/balance/real-flight-check.mjs';

const IDS = ['radar', 'ember-snack', 'kindling'];
test('the three cards are released Commons with plain two-line faces and short tile lines', () => {
  for (const id of IDS) {
    const def = SKILL_CARDS[id], card = makeSkillCard(id, 'x');
    assert.equal(def.rarity, 'common', id);
    assert.ok(LIVE_CARDS.some(d => d.id === id), `${id} is offered`);
    const tile = cardTileLine(card), face = faceEffect(card, def), all = `${tile} ${face} ${def.help} ${faceTrigger(card, def).word}`;
    assert.ok(tile.length <= 22, `${id} tile "${tile}"`);
    assert.ok(!/turn|-\d|every \d+(st|nd|rd|th)/i.test(all), `${id} wording`);
  }
  assert.equal(faceEffect(makeSkillCard('radar', 'x'), SKILL_CARDS.radar), 'Every 10 s: a Pulse');
});

test('Radar sends one real Pulse per 10 s tagged at its own slot (the leftmost Radar), and nothing else', () => {
  const waves = [], fires = [];
  const e = { cardExecution: { cards: [makeSkillCard('body-spark', 'a'), makeSkillCard('radar', 'b'), makeSkillCard('radar', 'c')] }, running: true, paused: false, alive: true, time: 0,
    radiateLight: o => { const w = { ...o }; waves.push(w); return w; }, cardEngine: null };
  e.cardEngine = { log: [], raise() { return {}; } };
  for (let t = 0; t <= 31; t += .1) { e.time = t; stepRadar(e); }
  assert.equal(RADAR_INTERVAL, 10);
  assert.equal(waves.length, 3, 'three Pulses in 31 s however many Radars');
  assert.ok(waves.every(w => w.fromSlot === 1 && w.source === 'card-radar'), 'tagged at the leftmost Radar, so only cards to its right hear it');
  e.cardExecution.cards = [null]; stepRadar(e); assert.equal(e.radarAt, undefined);
});

test('Ember Snack eats the one card to its right after a clear, pays 50 Stored and is spent', () => {
  const run = makeRun(['ember-snack', 'body-spark', 'lift-guide'], { seed: 'snack-1' }); run.condensedGlow = 0;
  const n = M.getChoices(run).find(x => x.type !== 'support');
  M.selectNode(run, n.id); M.beginFlightAttempt(run);
  M.finishFlight(run, { success: true, flame: 60, collected: 3, cardFiredIds: [] });
  assert.deepEqual(run.mountedCards.map(c => c?.cardId || null), [null, null, 'lift-guide']);
  assert.equal(run.lastFlight.emberSnackStored, 50);
  assert.equal(run.lastFlight.emberSnackMeals[0].target.cardId, 'body-spark');
});

test('Ember Snack never eats a permanent card and waits when only one is to its right', () => {
  const run = makeRun(['ember-snack', 'growth-ring'], { seed: 'snack-2' });
  const n = M.getChoices(run).find(x => x.type !== 'support');
  M.selectNode(run, n.id); M.beginFlightAttempt(run);
  M.finishFlight(run, { success: true, flame: 60, collected: 3, cardFiredIds: [] });
  assert.deepEqual(run.mountedCards.map(c => c?.cardId || null).slice(0, 2), ['ember-snack', 'growth-ring']);
  assert.ok(!run.lastFlight.emberSnackMeals);
});

test('Kindling recovers 1 Spark per 2 s only while the Meter is under 30%, and stops at 30%', () => {
  const e = synthFlight(['kindling']);
  assert.equal(e.mod.cardKindling, true);
  e.flame = e.maxFlame * .1; const start = e.flame;
  for (let i = 0; i < 2 * 120; i++) e.updateKindling(1 / 120);
  assert.ok(Math.abs(e.flame - start - CARD_UNIT) < 1e-6, '2 s gives 1 Spark');
  for (let i = 0; i < 400 * 120; i++) { e.updateKindling(1 / 120); assert.ok(e.flame <= e.maxFlame * .3 + 1e-9); }
  assert.ok(Math.abs(e.flame - e.maxFlame * .3) < 1e-6, 'rests at 30%');
  e.flame = e.maxFlame * .5; for (let i = 0; i < 10 * 120; i++) e.updateKindling(1 / 120);
  assert.equal(e.flame, e.maxFlame * .5, 'above 30% it does nothing');
  const plain = synthFlight([]); assert.ok(!plain.mod.cardKindling);
});
