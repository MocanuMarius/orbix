// Fixes from the combo sweep (docs/chain-sweep.md, section 7 and "Fixed") and the Glide Prism rework (2026-11-17).
import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS, makeSkillCard, createCardExecution, resolveCardRow, hasCardRowEvent, getCardRowRule} from '../dist/skill-cards.mjs';
import {CardEngine, createMeterHost, playerEvent} from '../dist/card-engine.mjs';
import {stepFlightInscriptions} from '../dist/card-engine-flight.mjs';
import {fly, sum} from '../scripts/balance/real-flight-check.mjs';

const row = list => list.map((id, i) => id ? makeSkillCard(id, `s${i}`) : null);
const ins = (...ids) => ids.map(id => id ? {id} : null);
const fire = (list, event, inscriptions) => resolveCardRow(createCardExecution(inscriptions ? {cards: row(list), inscriptions: ins(...inscriptions)} : row(list)), event);
const COLLECT = {kind: 'body-spark', pickupKind: 'light', meterFraction: 0.5, firstCrossing: true};
const LIFT = {kind: 'downbeat-lift', meterFraction: 0.5};
const BEAT = {kind: 'rhythm-phrase', meterFraction: 0.5};

// ── Glide Prism ─────────────────────────────────────────────────────────────────────────────────────────────────────
test('Glide Prism: "Lift: double every reward before it", on a falling Lift and on a Lift on the beat', () => {
  const def = SKILL_CARDS['glide-prism'];
  assert.equal(def.rarity, 'rare');
  assert.equal(def.ruleBands[0].text, 'Lift');
  assert.equal(def.ruleBands[1].text, 'Double every reward before it');
  assert.equal(fire(['downbeat'], LIFT).sparks, 2);
  assert.equal(fire(['downbeat', 'glide-prism'], LIFT).sparks, 4, 'Downbeat on a falling Lift is doubled');
  assert.equal(fire(['toll-bell'], BEAT).sparks, 2);
  assert.equal(fire(['toll-bell', 'glide-prism'], BEAT).sparks, 4, 'Toll Bell on the beat is doubled');
  assert.equal(fire(['body-spark', 'glide-prism'], LIFT, ['kindled']).sparks, 2 * fire(['body-spark'], COLLECT).sparks,
    'a Body Spark on a Kindled slot fires on the plain Lift and is doubled');
  assert.equal(hasCardRowEvent(createCardExecution(row(['glide-prism'])), 'rhythm-phrase'), true);
});

test('Glide Prism: does nothing for other Triggers, only for cards before it, never for Stored Sparks or growth', () => {
  assert.equal(fire(['body-spark', 'glide-prism'], COLLECT).sparks, fire(['body-spark'], COLLECT).sparks, 'a Collect is not doubled');
  assert.equal(fire(['downbeat', 'glide-prism'], {kind: 'wave-crossing', firstCrossing: true, pickupKind: 'light'}).sparks, 0);
  assert.equal(fire(['glide-prism', 'downbeat'], LIFT).sparks, 2, 'order matters: a card after it is not doubled');
  assert.equal(fire(['downbeat', 'glide-prism', 'downbeat'], LIFT).sparks, 4 + 2);
  assert.deepEqual(getCardRowRule(SKILL_CARDS['glide-prism'], makeSkillCard('glide-prism', 'x')).alsoEvents, ['rhythm-phrase']);
  const WAVE = {kind: 'wave-crossing', firstCrossing: true, pickupKind: 'light'}, harvest = fire(['harvest-legendary', 'glide-prism'], WAVE);
  assert.equal(harvest.sparks, 2); assert.equal(harvest.stored, 1, 'a Pulse is not a Lift: nothing is doubled, Stored least of all');
  const mixed = fire(['downbeat', 'glide-prism'], LIFT);
  assert.equal(mixed.stored, 0); assert.equal(mixed.futureCapacity, 0);
});

// ── Spill Jar ───────────────────────────────────────────────────────────────────────────────────────────────────────
const stored = (list, {start = 10, max = 10} = {}) => {
  const runtime = createCardExecution(row(list)), host = createMeterHost({start, max}); host.runtime = runtime;
  const engine = new CardEngine(runtime, host);
  playerEvent(engine, host, 'collect', {}, 0);
  return host.storedTotal;
};
test('Spill Jar keeps half of the spill as it was before any Boost: Stored Sparks are never Boosted', () => {
  assert.equal(stored(['body-spark', 'spill-jar']), 1, 'a plain 2-Spark spill keeps 1');
  assert.equal(stored(['body-spark', 'prism-lens-ii', 'spill-jar']), 1, 'Prism Lens II makes 6 Sparks, but only the 2 the Body Spark gave can be kept (half: 1)');
  assert.equal(stored(['body-spark', 'crescendo', 'prism-lens-ii', 'spill-jar']), 1, 'several Boosts change nothing');
  assert.equal(stored(['vanguard', 'body-spark', 'prism-lens-ii', 'spill-jar']), 3, 'Vanguard 3 + Body Spark 2 = 5 before the Boost, half rounded up = 3');
  assert.equal(stored(['body-spark', 'prism-lens-ii', 'spill-jar'], {start: 7, max: 10}), 0, 'the meter takes the Boost-free Sparks first; the Boost alone spills');
  // A card-made gain: Spark Chime's Boosted gain spills, the Jar keeps from the printed gain only.
  const runtime = createCardExecution(row(['spark-chime', 'prism-lens-ii', 'spill-jar'])), host = createMeterHost({start: 10, max: 10}); host.runtime = runtime;
  const engine = new CardEngine(runtime, host);
  engine.queue.push({type: 'pulse', to: 0, from: -1, mask: 0, turn: 0}); engine.flush();
  assert.equal(engine.log.find(l => l.k === 'gain').amount, 3, 'Chime +1 x3');
  assert.equal(host.storedTotal, 1, 'kept from the unboosted 1');
});

// ── Vanguard and Old Friend ─────────────────────────────────────────────────────────────────────────────────────────
test('Vanguard fires on a Collect only (+3 in Slot 1, +1 elsewhere), not on every Trigger', () => {
  const def = SKILL_CARDS.vanguard;
  assert.equal(def.trigger, 'collect'); assert.equal(def.ruleBands[0].text, 'Collect');
  assert.equal(fire(['vanguard', null, null], COLLECT).sparks, 3);
  assert.equal(fire([null, 'vanguard', null], COLLECT).sparks, 1);
  for (const kind of ['wave-crossing', 'downbeat-lift', 'collector-delivery', 'rhythm-phrase', 'natural-overfill', 'flash-pickup'])
    assert.equal(fire(['vanguard', null, null], {...COLLECT, kind}).sparks, 0, kind);
});

test('Old Friend pays once per Collect, +1 per cleared flight, and not on other Triggers', () => {
  const def = SKILL_CARDS['old-friend'];
  assert.equal(def.trigger, 'collect'); assert.equal(def.ruleBands[0].text, 'Collect');
  const runtime = createCardExecution(row(['old-friend', null, null]));
  for (let i = 0; i < 3; i++) resolveCardRow(runtime, {kind: 'flight-clear'});
  assert.equal(runtime.cards[0].tally, 3);
  assert.equal(resolveCardRow(runtime, COLLECT).sparks, 3);
  for (const kind of ['wave-crossing', 'downbeat-lift', 'collector-delivery', 'rhythm-phrase', 'natural-overfill'])
    assert.equal(resolveCardRow(runtime, {...COLLECT, kind}).sparks, 0, kind);
});

// ── Chameleon (two) and growth ──────────────────────────────────────────────────────────────────────────────────────
test('Chameleon (two) does not fire growth cards: Growth Ring, tally cards', () => {
  assert.equal(SKILL_CARDS['chameleon-two'].ruleBands[1].text, 'Fires the card to its right on any Trigger (not growth cards)');
  for (const kind of ['body-spark', 'wave-crossing', 'downbeat-lift', 'collector-delivery', 'rhythm-phrase', 'flash-pickup', 'natural-overfill']) {
    const r = fire(['chameleon-two', 'growth-ring'], {...COLLECT, kind});
    assert.equal(r.futureCapacity, 0, `${kind}: Growth Ring gives no max Sparks`);
    assert.equal(r.steps.filter(s => s.slot === 0 && s.success).length, 0, kind);
  }
  assert.equal(hasCardRowEvent(createCardExecution(row(['chameleon-two', 'growth-ring'])), 'downbeat-lift'), false);
  assert.equal(fire(['growth-ring'], {kind: 'flight-clear'}).futureCapacity, 1, 'Growth Ring still grows at Finish');
  const friend = fire(['chameleon-two', 'old-friend'], LIFT);
  assert.equal(friend.steps.filter(s => s.slot === 0 && s.success).length, 0, 'a tally card is skipped');
  assert.equal(fire(['chameleon-two', 'body-spark'], LIFT).sparks, SKILL_CARDS['body-spark'].amount, 'ordinary cards still answer any Trigger');
});

// ── Card-sent Pulses are real Pulses ────────────────────────────────────────────────────────────────────────────────
const pulseRig = list => {
  const runtime = createCardExecution(row(list)), calls = [], host = createMeterHost({}); host.runtime = runtime;
  host.cardPulse = slot => { calls.push(slot); return true; };
  const engine = new CardEngine(runtime, host);
  return {engine, host, calls};
};
test('a Pulse sent by a card is a real Pulse for Pulse cards to its right, never for the sender or cards to its left', () => {
  for (const [list, expected] of [
    [['first-catch', 'harvest-common'], [0]], [['first-catch', 'first-ripple'], [0]], [['first-catch', 'far-shore'], [0]], [['first-catch', 'ripple-glass'], [0]],
    [['harvest-common', 'first-catch'], []], [['first-catch'], []], [['first-catch', 'body-spark'], []],
    [['first-catch', null, 'harvest-common'], [0]], [['harvest-common', 'first-catch', 'harvest-common'], [1]],
  ]) {
    const {engine, calls} = pulseRig(list);
    engine.raise('collect', {}, 0);
    assert.deepEqual(calls, expected, list.join(' > '));
  }
  // Ember Bell and Close Call send Pulses the same way.
  const bell = pulseRig(['ember-bell', 'harvest-common']); bell.engine.raise('overfill', {spill: 2}, 0);
  assert.deepEqual(bell.calls, [0]);
  const close = pulseRig(['close-call', 'harvest-common']); close.engine.raise('skim', {}, 0);
  assert.deepEqual(close.calls, [0]);
});

test('Sparks a card-sent Pulse earns flow right of the sender: the sender never answers its own Pulse', () => {
  const {engine, calls} = pulseRig(['ember-bell', 'harvest-common']);
  engine.raise('overfill', {spill: 2, fromSlot: 0}, 0);
  assert.deepEqual(calls, [], 'an Overfill made by the Pulse the Bell sent is not heard by the Bell');
  engine.raise('overfill', {spill: 2}, 0);
  assert.deepEqual(calls, [0], 'an ordinary Overfill is');
});

test('the Bell Inscription tags its Pulse with its Slot', () => {
  const waves = [], e = {running: true, paused: false, alive: true, time: 6, radiateLight: () => { const w = {}; waves.push(w); return w; },
    cardExecution: {cards: row(['body-spark', 'harvest-common', null]), inscriptions: ins(null, 'bell')}};
  e.time = 0; stepFlightInscriptions(e); e.time = 6; stepFlightInscriptions(e);
  assert.equal(waves.length, 1); assert.equal(waves[0].fromSlot, 1);
});

test('real flight: First Catch before Resonant Harvest sends a real Pulse that Harvest hears; Harvest before First Catch does not', () => {
  const right = [0, 1].map(seedIndex => fly({ids: ['first-catch', 'harvest-common'], seedIndex}));
  assert.ok(sum(right, f => f.log.pulseBySource['card-pulse'] || 0) >= 1, 'a real light Pulse was sent');
  assert.ok(sum(right, f => f.log.slots[1]?.fired || 0) >= 1, 'Harvest to its right fired on it');
  assert.equal(sum(right, f => f.log.slots[0]?.fired || 0), 0);
  const left = [0, 1].map(seedIndex => fly({ids: ['harvest-common', 'first-catch'], seedIndex}));
  assert.equal(sum(left, f => f.log.slots[0]?.fired || 0), 0, 'Harvest to its left never hears it');
  assert.equal(sum(left, f => f.log.pulseBySource['card-pulse'] || 0), 0, 'and no ring is made for nobody');
});
