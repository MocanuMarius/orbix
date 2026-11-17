// Engine cards, Pack Trigger and Black Hole, Phase 1 (docs/engine-cards.md with its rulings): rules only, no UI.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {SKILL_CARDS, LIVE_CARDS, CARD_UNIT, makeSkillCard, describeSkillCard, drawSkillCard, drawSkillCardDraft, drawForgeCard,
  getCardStarterOffers, createCardExecution, cleanCardRun, CARD_SYSTEM} from '../dist/skill-cards.mjs';
import {CARD_ART_IDS} from '../dist/card-art.mjs';
import {CardEngine, simulateEngineChain, engineMetrics, previewPack, findEngineLoop, engineBoostAt, createMeterHost, playerEvent,
  hasEngineCards, ENGINE_LIMITS} from '../dist/card-engine.mjs';
import {syncFlightEngine, raiseFlightEngine, stepFlightEngine} from '../dist/card-engine-flight.mjs';
import {previewBlackHoleMeals, consumeBlackHoles, BLACK_HOLE_GROWTH} from '../dist/card-black-hole.mjs';
import {resolveChain, engineStats} from '../dist/ui/chain-model.mjs';
import {getGlowCapacity, GLOW_CAPACITY_LIMIT_UNITS} from '../dist/vitality.mjs';
import {rewardEarnings} from '../dist/reward-screen.mjs';

const row = ids => ids.map((id, i) => id ? makeSkillCard(id, `e${i}`) : null);
// The demo engine: First Catch (Collect -> Pulse), a Metronome that fires the next card every 3 s, a Spark Chime (+1 per Turn).
const CHIME = ['first-catch', 'metronome', 'spark-chime'];
// The Wick version: one Turn only (nothing loops it), used where the Slow Wick's own rules are tested.
const WICK = ['first-catch', 'slow-wick', 'spark-chime'];
const MILL = ['close-call', 'metronome', 'body-spark', 'overflow-bell'];
// Batch 1 position cards (tests/cards-batch-1.test.mjs) are unreleased too but are ordinary Chain cards, not engine cards.
const BATCH_1 = ['keystone', 'vanguard', 'bookends', 'empty-chair', 'ladder', 'twin-flame', 'spill-jar', 'scar-tissue', 'collectors-ledger', 'old-friend', 'gilded-rim', 'second-wind', 'undertow', 'tributary', 'tithe']; // batches 1 to 3 (cards-batch-N.test.mjs)
const UNRELEASED = Object.values(SKILL_CARDS).filter(def => def.unreleased && !BATCH_1.includes(def.id)).map(def => def.id);
const near = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) < eps, msg || `${a} != ${b}`);
/** A pure engine on an uncapped (or given) meter, driven by hand. */
function rig(ids, meter = {start: 0, max: Infinity}) {
  const runtime = createCardExecution(row(ids)), host = createMeterHost(meter); host.runtime = runtime;
  const engine = new CardEngine(runtime, host);
  return {engine, host, runtime, at: (kind, t, detail) => playerEvent(engine, host, kind, detail, t)};
}
const hits = (engine, k) => engine.log.filter(entry => entry.k === k);
const canvas = {getContext: () => ({setTransform() {}}), getBoundingClientRect: () => ({width: 900, height: 430})};
const flightWith = (ids, extra = {}) => {
  const e = new WispFlight({canvas, preflight: true, seed: 'engine-proof', cardPilot: true,
    modifiers: {cardPilot: true, cardExecution: {cards: row(ids)}, ...extra}});
  e.running = true; return e;
};

// ── catalog ─────────────────────────────────────────────────────────────────────────────────────────────────────
test('the engine cards are in the catalog, unreleased, readable and drawn with existing art', () => {
  assert.deepEqual(UNRELEASED, ['wave-loom', 'spark-chime', 'ember-bell', 'flash-tinder', 'homing-thread', 'overflow-bell', 'afterglow', 'slow-wick', 'metronome',
    'long-fuse', 'heartbeat', 'first-catch', 'close-call', 'low-ember', 'third-beat', 'momentum', 'full-satchel', 'last-round', 'harvest-home', 'black-hole', 'chameleon-two', 'whetstone']);
  for (const id of UNRELEASED) {
    const def = SKILL_CARDS[id], card = describeSkillCard(makeSkillCard(id, `x:${id}`));
    assert.equal(def.unreleased, true); assert.equal(def.excludeStarter, true);
    assert.ok(CARD_ART_IDS.includes(def.artFamily), `${id}: existing art`);
    assert.ok(card.effect && def.ruleBands.length, `${id}: readable`);
    assert.equal(def.row, undefined, `${id}: never enters the ordinary chain walker`);
    assert.notEqual(def.trigger, 'always-on', `${id}: an engine card never reads Always on`);
    assert.ok(!LIVE_CARDS.includes(def), `${id}: not live`);
  }
  assert.ok(!SKILL_CARDS['wave-loom'].retired, 'Wave Loom is back as an engine card, unreleased');
});

test('unreleased cards never appear in any starter, reward draw, draft or Forge over many seeds', () => {
  const seen = new Set();
  for (let seed = 0; seed < 600; seed++) {
    for (const legacy of [false, true]) for (const offer of getCardStarterOffers({seed: `u${seed}`, campaignSeed: `u${seed}`}, {legacy})) seen.add(offer.cardId);
    for (const tier of [{}, {elite: true}, {boss: true}]) {
      const node = {id: `n${seed}`, ...tier}, run = {campaignSeed: `unreleased:${seed}`, mapIndex: seed % 3, mountedCards: [], reserveCards: [], cardSlots: 3};
      seen.add(drawSkillCard(run, 'flight', node).cardId);
      for (const card of drawSkillCardDraft(run, node)) seen.add(card.cardId);
      for (const rarity of ['common', 'rare', 'legendary']) {
        seen.add(drawForgeCard(run, rarity, seed % 4).cardId);
        seen.add(drawSkillCard(run, `forge:v2:${rarity}:${seed}`, null, rarity).cardId);
      }
    }
  }
  for (const id of [...UNRELEASED, ...BATCH_1]) assert.ok(!seen.has(id), `${id} was offered`);
  assert.ok(seen.size > 40, 'the sample really covers the live pool');
});

// ── engine events (rulings 1, 2, 7, 8) ──────────────────────────────────────────────────────────────────────────
test('a card-made Pulse reaches only the next card to its right that waits for a Pulse', () => {
  const {engine, host, at} = rig(['first-catch', 'spark-chime', 'spark-chime']);
  at('collect', 0);
  assert.deepEqual(hits(engine, 'gain').map(g => g.slot), [1], 'the second Spark Chime does not hear it');
  assert.equal(host.meter, 1);
});

test('card-made Spark gains reach every waiting card to the right, never to the left', () => {
  // The Metronome is the one card that hears a Spark gain.
  const right = rig(['first-catch', 'spark-chime', 'metronome', 'metronome']);
  right.at('collect', 0);
  assert.deepEqual(hits(right.engine, 'armed').map(h => h.slot), [2, 3], 'both Metronomes heard the Chime’s gain');
  const left = rig(['metronome', 'first-catch', 'spark-chime']);
  left.at('collect', 0);
  assert.equal(hits(left.engine, 'armed').length, 0, 'events never flow left');
});

test('a player-made Trigger is heard by the whole Chain: the Chain’s Collect Sparks, spilling on a full meter, reach an Ember Bell on its left', () => {
  const {engine, at} = rig(['ember-bell', 'body-spark', 'slow-wick'], {start: 3, max: 3});
  at('collect', 0);
  assert.deepEqual(hits(engine, 'hit').map(h => [h.slot, h.type]), [[0, 'overfill']]);
  assert.deepEqual(hits(engine, 'lit').map(h => h.slot), [2]);
  assert.equal(engine.timers.length, 1, 'the Bell lit the Wick');
});

test('Ember Bell hears an Overfill and sends a Pulse: no once-per-Turn, no loop, events flow right', () => {
  const spec = SKILL_CARDS['ember-bell'].engine;
  assert.deepEqual(spec.hears, ['overfill']); assert.deepEqual(spec.does, ['pulse']); assert.equal(spec.oncePerTurn, undefined, 'it answers every Overfill');
  assert.equal(SKILL_CARDS['ember-bell'].trigger, 'overfill');
  // Two Collects in the same Turn on a full meter spill twice: the Bell sends a Pulse each time (the Spark Chime to its right hears both).
  const {engine, at} = rig(['body-spark', 'ember-bell', 'spark-chime'], {start: 3, max: 3});
  at('collect', 0); at('collect', 0);
  assert.equal(hits(engine, 'hit').filter(h => h.slot === 1 && h.type === 'overfill').length, 2, 'both Overfills heard in one Turn');
  assert.equal(hits(engine, 'pulse').filter(p => p.slot === 1).length, 2, 'one Pulse per Overfill');
  assert.equal(hits(engine, 'hit').filter(h => h.slot === 2 && h.type === 'pulse').length, 2);
  // No loop: the Chime's own spill is an Overfill made to the Bell's right, so a Pulse the Bell sends never re-fires the same Bell.
  const loop = rig(['body-spark', 'ember-bell', 'spark-chime', 'ember-bell'], {start: 3, max: 3});
  loop.at('collect', 0);
  assert.equal(hits(loop.engine, 'hit').filter(h => h.slot === 1).length, 1, 'the first Bell fired once');
  assert.equal(hits(loop.engine, 'hit').filter(h => h.slot === 3 && h.type === 'overfill' && h.from === 2).length, 1, 'the second Bell heard the Chime’s spill');
  assert.equal(hits(loop.engine, 'pulse').filter(p => p.slot === 1).length, 1);
  // Events flow right only: a Bell to the left of the spill never hears it.
  const left = rig(['ember-bell', 'close-call', 'spark-chime'], {start: 3, max: 3});
  left.at('skim', 0);
  assert.equal(hits(left.engine, 'gain').filter(g => g.slot === 2 && g.spill > 0).length, 1, 'the Chime did spill');
  assert.equal(hits(left.engine, 'hit').filter(h => h.slot === 0).length, 0, 'a Bell on the left does not hear it');
  const right = rig(['close-call', 'spark-chime', 'ember-bell'], {start: 3, max: 3});
  right.at('skim', 0);
  assert.equal(hits(right.engine, 'hit').filter(h => h.slot === 2 && h.type === 'overfill' && h.from === 1).length, 1, 'the Chime’s spill reaches a Bell on the right');
});

test('a Timer returns its Pulse to the first Slot but never to itself', () => {
  const {engine, host, at} = rig(['first-catch', 'slow-wick', 'spark-chime']);
  at('collect', 0);
  assert.equal(host.meter, 0); assert.equal(engine.timers[0].slot, 1);
  engine.advance(3);
  assert.equal(engine.turns, 1);
  const back = hits(engine, 'pulse').find(p => p.back);
  assert.deepEqual([back.slot, back.to], [-1, 2], 'from the first Slot to the first hearer that is not the Wick');
  assert.equal(host.meter, 1);
});

test('Boosts multiply each card-made gain to their left, rounded down; Stored Sparks are never boosted', () => {
  for (const [ids, gain] of [[[...CHIME, 'prism-lens'], 1], [[...CHIME, 'crescendo'], 2], [['crescendo', ...CHIME], 1], [[...CHIME, 'prism-lens-ii'], 3]]) {
    const {engine, at} = rig(ids);
    at('collect', 0); engine.advance(6.01);
    assert.deepEqual(hits(engine, 'gain').map(g => g.amount), [gain, gain], ids.join(','));
  }
  assert.equal(engineBoostAt(row(['spark-chime', 'closing-chord', 'body-spark']), 0).multiplier, 1, 'Closing Chord only as the last card');
  // Overflow Bell keeps 2 of a spill; a Crescendo to its right doubles the gain that spills, not what is kept.
  const {engine, host, at} = rig(['close-call', 'metronome', 'body-spark', 'overflow-bell', 'crescendo'], {start: 9, max: 10});
  at('skim', 0);
  assert.equal(hits(engine, 'gain')[0].amount, 2, 'Close Call +1 doubled');
  assert.ok(hits(engine, 'keep').every(k => k.amount <= 2)); assert.equal(host.storedTotal, 1, 'kept 1 spilled Spark (2 asked, 1 fitted)');
});

test('the two worked engines reproduce the demo’s numbers', () => {
  const chime = engineMetrics(row(CHIME)), crescendo = engineMetrics(row([...CHIME, 'crescendo']));
  assert.equal(chime.sparksPerTurn, 1); near(chime.turnsPer10s, 10 / 3, 1e-4);
  assert.equal(crescendo.sparksPerTurn, 2); near(crescendo.turnsPer10s, 10 / 3, 1e-4);
  const mill = engineMetrics(row(MILL)), fast = engineMetrics(row([...MILL, 'heartbeat']));
  // Metronome waits 3 s (1.5 s with Heartbeat): tempo is the dial (Phase 2 rule fix).
  assert.equal(mill.sparksPerTurn, 2); near(mill.turnsPer10s, 10 / 3, .04);
  assert.equal(fast.sparksPerTurn, 2); near(fast.turnsPer10s, 20 / 3, .04);
  // A Turn every 3 s from the first pickup: Turns at 3, 6, 9 ... s.
  const run = simulateEngineChain(row(CHIME), {horizon: 30, events: [{t: 0, kind: 'collect'}]});
  assert.deepEqual(run.turnLog, [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
  assert.equal(run.sparks, 10, '10 Sparks in a 30 s flight: one per Turn, the first Turn after the first 3 s');
});

test('a Chain with no Timer runs once', () => {
  const run = simulateEngineChain(row(['first-catch', 'spark-chime']), {horizon: 60, events: [{t: 0, kind: 'collect'}]});
  assert.equal(run.turns, 0); assert.equal(run.sparks, 1); assert.equal(run.running, false);
  assert.equal(findEngineLoop(row(['first-catch', 'spark-chime'])).runsOnce, true);
  assert.equal(engineMetrics(row(['first-catch', 'spark-chime'])).turnsPer10s, null);
});

// ── Timers, stopping (rulings 3, 4, 6) ──────────────────────────────────────────────────────────────────────────
test('Slow Wick waits 3 s, Heartbeat halves every Timer, and a burning Wick ignores further Pulses', () => {
  const plain = rig(['close-call', 'slow-wick', 'spark-chime']); plain.at('skim', 0);
  assert.equal(plain.engine.timers[0].at, 3);
  plain.at('skim', 1); assert.equal(plain.engine.timers.length, 1, 'a burning Wick ignores the second Pulse: no second loop');
  assert.equal(hits(plain.engine, 'already-waiting').length, 1);
  const fast = rig([...WICK, 'heartbeat']); fast.at('collect', 0);
  assert.equal(fast.engine.timers[0].at, 1.5);
  const two = rig([...WICK, 'heartbeat', 'heartbeat']); two.at('collect', 0);
  assert.equal(two.engine.timers[0].wait, 1.5, 'two Heartbeats would not halve it again');
});

test('Metronome fires the next card every 3 s, stops when it cannot act and is re-armed by the next event', () => {
  assert.equal(SKILL_CARDS.metronome.engine.wait, 3); assert.equal(SKILL_CARDS.metronome.amount, 3);
  assert.match(describeSkillCard(makeSkillCard('metronome', 'm')).effect, /Every 3 s/);
  const {engine, host, at} = rig(MILL, {start: 0, max: 7});
  at('skim', 0);
  assert.equal(host.meter, 1);
  engine.advance(2.99); assert.equal(engine.turns, 0, 'nothing before 3 s');
  engine.advance(9);
  assert.equal(engine.turns, 3); assert.equal(host.meter, 7);
  engine.advance(12);
  assert.ok(hits(engine, 'metronome-stops').length === 1, 'meter full: it stops');
  assert.equal(engine.timers.length, 0);
  host.meter = 3; engine.advance(20); assert.equal(engine.turns, 3, 'no restart by itself');
  at('skim', 20);
  engine.advance(23); assert.equal(engine.turns, 4, 're-armed by the next event');
  const fast = rig([...MILL, 'heartbeat']); fast.at('skim', 0);
  assert.equal(fast.engine.timers[0].wait, 1.5, 'Heartbeat halves it to 1.5 s');
});

test('Homing Thread: a Delivery sends a Collector with charge for the nearest Spark in reach, through the normal fetch', () => {
  assert.equal(SKILL_CARDS['homing-thread'].rarity, 'rare'); assert.equal(SKILL_CARDS['homing-thread'].trigger, 'delivery');
  const asked = [];
  const engine = new CardEngine(createCardExecution(row(['homing-thread'])), {homingFetch: slot => { asked.push(slot); return true; }});
  engine.raise('delivery', {pickupKind: 'light'}, 0);
  assert.deepEqual(asked, [0]); assert.equal(hits(engine, 'homing').length, 1);
  const none = new CardEngine(createCardExecution(row(['homing-thread'])), {homingFetch: () => false});
  none.raise('delivery', {}, 0); assert.equal(hits(none, 'homing-refused').length, 1, 'no charge: nothing happens');
  none.raise('collect', {}, 1); assert.equal(hits(none, 'homing-refused').length, 1, 'a Collect is not a Delivery');
  // In flight: the request lets one search take a Spark that has not passed the wisp yet; it lapses in 0.25 s.
  const e = flightWith(['homing-thread']);
  syncFlightEngine(e);
  const w = e.wisp;
  w.enabled = () => true; w.phase = 'ready'; w.cooldown = 0; w.cargo = null; w.target = null;
  raiseFlightEngine(e, 'delivery', {pickupKind: 'light'});
  assert.equal(w.homingFetch, e.time, 'the Collector was asked to search once');
  w.cooldown = 2; w.homingFetch = null;
  raiseFlightEngine(e, 'delivery', {pickupKind: 'light'});
  assert.equal(w.homingFetch, null, 'no charge: not asked');
});

test('Momentum: after 5 Turns in a row, +20% Luminance until the engine stops', () => {
  assert.equal(SKILL_CARDS.momentum.rarity, 'legendary'); assert.equal(SKILL_CARDS.momentum.amount, 20);
  const lum = [];
  const runtime = createCardExecution(row([...CHIME, 'momentum'])), host = createMeterHost({start: 0, max: 7});
  host.runtime = runtime; host.setLuminance = p => lum.push(p);
  const engine = new CardEngine(runtime, host);
  playerEvent(engine, host, 'collect', {}, 0);
  engine.advance(12); assert.equal(engine.turns, 4); assert.deepEqual(lum, [], 'not before the fifth Turn');
  engine.advance(15); assert.equal(engine.turns, 5); assert.deepEqual(lum, [20]); assert.equal(engine.state.momentum, 20);
  engine.advance(40);
  assert.ok(engine.stops >= 1, 'the meter filled and the engine stopped');
  assert.deepEqual(lum, [20, 0], 'the light goes back when the engine stops'); assert.equal(engine.state.streak, 0);
  // In flight it adds to the Chain's Luminance in getLightState.
  const e = flightWith(['first-catch']); const before = e.getLightState().radius;
  e.cardEngineLuminance = 20; const after = e.getLightState().radius;
  assert.ok(after > before * 1.15, `${before} -> ${after}`);
});

test('Wave Loom is back as an engine card: one real light Pulse each Turn', () => {
  const def = SKILL_CARDS['wave-loom'];
  assert.equal(def.unreleased, true); assert.equal(def.retired, undefined); assert.equal(def.engine.governor, 'wave-loom');
  assert.equal(makeSkillCard('wave-loom', 'w').edition, 2);
  const pulses = [];
  const runtime = createCardExecution(row([...CHIME, 'wave-loom'])), host = createMeterHost({start: 0, max: Infinity});
  host.runtime = runtime; host.worldPulse = slot => { pulses.push(slot); return true; };
  const engine = new CardEngine(runtime, host);
  playerEvent(engine, host, 'collect', {}, 0); engine.advance(9.01);
  assert.equal(engine.turns, 3); assert.deepEqual(pulses, [3, 3, 3], 'one Pulse per Turn');
  // In flight the Pulse is the world's own revealing Pulse (the kind Pulse cards hear).
  const e = flightWith([...CHIME, 'wave-loom']); const sent = [];
  e.flame = 0; e.radiateLight = options => sent.push(options); syncFlightEngine(e);
  raiseFlightEngine(e, 'collect', {pickupKind: 'light'}); e.time = 3.05; stepFlightEngine(e);
  assert.equal(sent.filter(o => o.source === 'card-wave-loom' && o.reveal).length, 1);
});

test('Long Fuse repeats the Chain’s last firing 5 s after a Pulse, spending real uses', () => {
  const {engine, host, runtime, at} = rig(['spark-cache', 'first-catch', 'long-fuse']);
  at('collect', 0);
  assert.equal(host.meter, 4); assert.equal(runtime.cards[0].charges, 5);
  engine.advance(5);
  assert.equal(engine.turns, 1); assert.equal(host.meter, 8); assert.equal(runtime.cards[0].charges, 4);
  const nothing = rig(['first-catch', 'long-fuse']); nothing.at('collect', 0); nothing.engine.advance(5);
  assert.equal(nothing.engine.lastStop.reason, 'nothing-to-repeat');
});

test('an engine stops when the meter is full and no card hears the Overfill', () => {
  const {engine, host, at} = rig(CHIME, {start: 2, max: 3});
  at('collect', 0); engine.advance(30);
  assert.equal(host.meter, 3); assert.equal(engine.lastStop.reason, 'cannot-act'); assert.equal(engine.timers.length, 0);
  assert.equal(engine.turns, 1, 'no turn limit: at the next 3 s the Spark Chime could not act, so the Metronome stopped');
  // A Wick version has no Metronome to stop it: the meter-full Chime is what ends the engine.
  const wick = rig(WICK, {start: 3, max: 3}); wick.at('collect', 0); wick.engine.advance(30);
  assert.equal(wick.engine.lastStop.reason, 'meter-full'); assert.equal(wick.engine.timers.length, 0);
});

test('starters: First Catch once per flight, Low Ember under a quarter once per 6 s, Close Call on a skim', () => {
  const first = rig(['first-catch', 'spark-chime']); first.at('collect', 0); first.at('collect', 1);
  assert.equal(first.host.meter, 1);
  const low = rig(['low-ember', 'spark-chime']);
  low.engine.raise('lift', {meterFraction: .3}, 0); low.engine.raise('lift', {meterFraction: .2}, 1);
  low.engine.raise('lift', {meterFraction: .2}, 6.5); low.engine.raise('lift', {meterFraction: .2}, 7.1);
  assert.equal(low.host.meter, 2, 'fired at 1 s and 7.1 s only');
  const close = rig(['close-call', 'spark-chime']); close.engine.raise('skim', {}, 0);
  assert.equal(close.host.meter, 2);
});

test('Flare Tinder starts a 1 s Flare; its end is heard by Afterglow to the right', () => {
  const run = simulateEngineChain(row(['flash-tinder', 'afterglow']), {horizon: 5, events: [{t: 0, kind: 'collect'}, {t: .5, kind: 'collect'}]});
  assert.equal(run.sparks, 2, 'one Flare at a time; Afterglow +2 when it ends');
  assert.deepEqual(run.log.filter(e => e.k === 'gain').map(e => e.t), [1]);
  const left = simulateEngineChain(row(['afterglow', 'flash-tinder']), {horizon: 5, events: [{t: 0, kind: 'collect'}]});
  assert.equal(left.sparks, 0, 'card-made events flow right only');
});

test('Third Beat doubles card-made gains in every third Turn', () => {
  const run = simulateEngineChain(row([...CHIME, 'third-beat']), {horizon: 9, events: [{t: 0, kind: 'collect'}]});
  assert.deepEqual([...run.gainsByTurn.entries()], [[1, 1], [2, 1], [3, 2]]);
});

test('determinism: the same Chain and inputs give the same event log', () => {
  const events = [{t: 0, kind: 'collect'}, {t: 2.2, kind: 'skim'}, {t: 4.9, kind: 'collect'}, {t: 7, kind: 'lift', detail: {meterFraction: .1}}];
  const ids = ['first-catch', 'spark-chime', 'ember-bell', 'metronome', 'slow-wick'];
  const a = simulateEngineChain(row(ids), {horizon: 40, events, meter: {start: 3, max: 12}, burn: 1});
  const b = simulateEngineChain(row(ids), {horizon: 40, events, meter: {start: 3, max: 12}, burn: 1});
  assert.ok(a.log.length > 20); assert.deepEqual(a.log, b.log);
});

test('a hard safety counter stops a runaway instant and warns once', () => {
  const {engine} = rig(['first-catch', 'spark-chime']);
  const warn = console.warn; let warned = 0; console.warn = () => warned++;
  try {
    for (let i = 0; i < ENGINE_LIMITS.deliveriesPerInstant + 5; i++) engine.queue.push({type: 'gain', from: -1, mask: 0, turn: 0});
    engine.flush(); engine.halt('again');
  } finally { console.warn = warn; }
  assert.equal(warned, 1); assert.equal(engine.queue.length, 0);
});

// ── flight clock ────────────────────────────────────────────────────────────────────────────────────────────────
test('in flight the engine runs on the simulation clock: a Collect starts it and pause freezes its Timers', () => {
  const e = flightWith(CHIME);
  try {
    assert.ok(e.cardEngine); e.flame = 30;
    e.collect({kind: 'light', x: e.distance + e.player.x, y: e.player.y});
    assert.equal(e.cardEngine.timers.length, 1, 'First Catch’s Pulse lit the Metronome');
    const meter = e.flame;
    e.pause(); const t = e.time;
    e.step(5); stepFlightEngine(e);
    assert.equal(e.time, t); assert.equal(e.cardEngine.turns, 0, 'paused: no time passes, no Timer fires');
    e.paused = false; e.time = t + 3; stepFlightEngine(e);
    assert.equal(e.cardEngine.turns, 1); near(e.flame - meter, CARD_UNIT, 1e-6, 'the Turn gave 1 Spark');
    assert.equal(e.getState().cardEngine.turns, 1, 'per-flight Turn count');
    e.tutorial = {lesson: 'glide'}; e.time += 3; stepFlightEngine(e);
    assert.equal(e.cardEngine.turns, 1, 'a tutorial without practice cards keeps it still');
  } finally { e.destroy(); }
  const plain = flightWith(['body-spark']);
  try { assert.equal(plain.cardEngine, null, 'no engine card: no engine'); assert.equal(plain.getState().cardEngine, undefined); }
  finally { plain.destroy(); }
});

test('preview agreement: the Deck model, the pure engine and the flight glue give the same Turns', () => {
  const ids = [...CHIME, 'crescendo'];
  assert.deepEqual(resolveChain(row(ids)).engine, engineStats(row(ids)));
  const stats = engineStats(row(ids)), m = engineMetrics(row(ids));
  assert.equal(stats.sparksPerTurn, m.sparksPerTurn); assert.equal(stats.turnsPer10s, m.turnsPer10s);
  assert.equal(resolveChain(row(['body-spark', 'crescendo'])).engine, undefined, 'ordinary Chains gain no field');
  // A minimal flight-shaped object through the real flight helpers, against the pure run.
  const fake = {cardExecution: createCardExecution(row(ids)), time: 0, running: true, paused: false, alive: true, finished: false,
    destroyed: false, dying: false, completing: false, tutorial: null, dream: null, mod: {}, flame: 0, maxFlame: 1e9, flameRestored: 0, sightUntil: 0};
  syncFlightEngine(fake); raiseFlightEngine(fake, 'collect');
  for (let i = 1; i <= 3000; i++) { fake.time = i / 60; stepFlightEngine(fake); }
  const pure = simulateEngineChain(row(ids), {horizon: 50, events: [{t: 0, kind: 'collect'}]});
  assert.deepEqual(fake.cardEngine.turnLog, pure.turnLog);
  near(fake.flame / CARD_UNIT, pure.sparks, 1e-6);
});

// ── Pack Trigger ────────────────────────────────────────────────────────────────────────────────────────────────
test('Pack: Full Satchel adds before packing; Echo repeats it; a Boost strengthens the Sparks going in', () => {
  assert.equal(previewPack(row(['full-satchel'])).sparks, 3);
  assert.equal(previewPack(row(['echo', 'full-satchel'])).sparks, 6);
  assert.equal(previewPack(row(['full-satchel', 'echo'])).sparks, 3, 'Echo repeats the card to its right');
  assert.equal(previewPack(row(['full-satchel', 'crescendo'])).sparks, 6);
  assert.equal(previewPack(row(['full-satchel', 'refrain'])).sparks, 6, 'a Refrain plays the Pack line once more');
  assert.equal(previewPack(row(['full-satchel']), {start: 9, max: 10}).sparks, 1, 'the meter cap applies');
  const last = previewPack(row(['last-round', 'spark-chime', 'metronome']));
  assert.equal(last.sparks, 1); assert.equal(last.turns, 1, 'one last Turn; the Metronome cannot wait');
  assert.ok(last.log.some(entry => entry.k === 'no-time'));
  assert.equal(previewPack(row(['harvest-home', 'body-spark', 'dusk-wick', 'prism-lens'])).sparks, 2, 'every Collect card once, a plain Spark');
  assert.equal(previewPack(row(['body-spark', 'spark-chime'])).sparks, 0, 'no Pack card: nothing');
});

test('Pack in flight fires before packing and the ceremony lines still add up', () => {
  const e = flightWith(['echo', 'full-satchel', 'crescendo']);
  try {
    e.flame = 30; e.finish(true);
    assert.equal(e.cardPack.sparks, 12, 'Echo ×2, Crescendo ×2');
    near(e.flame, 30 + 12 * CARD_UNIT);
    assert.ok(e.exitPacking.reserve >= e.flame - 1e-9, 'packed after the Pack cards');
  } finally { e.destroy(); }
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, 'pack-ceremony', 1, {cards: true});
  M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id);
  const node = M.getChoices(run).find(choice => choice.type !== 'support');
  M.selectNode(run, node.id); M.beginFlightAttempt(run); M.markFlightAttemptStarted(run);
  assert.ok(M.finishFlight(run, {success: true, flame: 60, cardPack: {sparks: 12}, cardEngineStored: 3}));
  const f = run.lastFlight;
  assert.ok(f.cardPack.stored >= 1); assert.equal(f.cardEngineStored, 3);
  const {rows, total} = rewardEarnings(run);
  assert.equal(rows.reduce((s, r) => s + r.amount, 0), total);
  assert.equal(rows.find(r => r.label === 'Takeaway packing').amount + f.cardPack.stored, f.exitPacking.amount, 'Pack share split out of the packing');
  assert.equal(rows.find(r => r.label === 'Engine cards').amount, 3);
});

// ── Black Hole ──────────────────────────────────────────────────────────────────────────────────────────────────
function cardState(seed, mounted) {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, seed, 1, {cards: true});
  M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id);
  run.cardSlots = 5; run.mountedCards = row(mounted); run.mountedCards.length = 5;
  for (let i = 0; i < 5; i++) run.mountedCards[i] ??= null;
  return state;
}
const takeOff = run => { const node = M.getChoices(run).find(c => c.type !== 'support'); M.selectNode(run, node.id); M.beginFlightAttempt(run); return M.markFlightAttemptStarted(run); };

test('Black Hole eats the card to its right at take-off: +1 Common, +2 Rare, +3 Legendary, recorded for good', () => {
  for (const [victim, growth] of [['body-spark', 1], ['crescendo', 2], ['refrain', 3]]) {
    const state = cardState(`hole:${victim}`, ['black-hole', victim, 'deep-vessel']), run = state.run;
    const before = getGlowCapacity(run);
    assert.deepEqual(previewBlackHoleMeals(run.mountedCards).map(m => [m.slot, m.victimCardId, m.growth]), [[1, victim, growth]]);
    assert.ok(takeOff(run));
    assert.equal(run.mountedCards[1], null); assert.ok(!run.reserveCards.some(c => c.cardId === victim), 'not returned to the reserve');
    assert.deepEqual([run.mountedCards[0].eaten, run.mountedCards[0].eatenGrowth], [1, growth]);
    assert.equal(run.cardBlackHoleGrowth, undefined, 'growth is stored on the card, not the run');
    near(getGlowCapacity(run) - before, growth * CARD_UNIT);
    assert.equal(run.cardHistory.filter(e => e.type === 'black-hole').length, 1);
    assert.equal(BLACK_HOLE_GROWTH[SKILL_CARDS[victim].rarity], growth);
  }
});

test('Black Hole: an empty right Slot, the last Slot or a loaned card is safe; practice is inert; Boosts change nothing', () => {
  assert.deepEqual(previewBlackHoleMeals(row(['black-hole', null, 'body-spark'])), []);
  assert.deepEqual(previewBlackHoleMeals(row(['body-spark', 'black-hole'])), []);
  assert.deepEqual(previewBlackHoleMeals([makeSkillCard('black-hole', 'h'), makeSkillCard('rhythm', 'run-1:practice:rhythm')]), []);
  assert.deepEqual(previewBlackHoleMeals(row(['black-hole', 'black-hole', 'body-spark'])).map(m => m.slot), [1], 'the eaten hole eats nothing');
  const tutorial = {skillSystem: CARD_SYSTEM, isTutorial: true, mountedCards: row(['black-hole', 'body-spark'])};
  assert.deepEqual(consumeBlackHoles(tutorial), []); assert.equal(tutorial.mountedCards[1].cardId, 'body-spark');
  const state = cardState('hole-boost', ['black-hole', 'body-spark', 'crescendo']);
  takeOff(state.run); assert.equal(state.run.mountedCards[0].eatenGrowth, 1);
});

test('Black Hole growth respects the 100-Spark ceiling and survives a save and load mid-map', () => {
  const state = cardState('hole-save', ['black-hole', 'echo-iii', 'deep-vessel']), run = state.run;
  takeOff(run);
  let text; assert.ok(M.saveState(state, {setItem: (_, value) => { text = value; }}));
  const loaded = M.loadState({getItem: () => text, setItem() {}}).run;
  assert.equal(loaded.cardBlackHoleGrowth, undefined);
  assert.deepEqual([loaded.mountedCards[0].eaten, loaded.mountedCards[0].eatenGrowth], [1, 3]);
  near(getGlowCapacity(loaded), getGlowCapacity(run));
  loaded.mountedCards[0].eatenGrowth = 500;
  assert.equal(getGlowCapacity(loaded), GLOW_CAPACITY_LIMIT_UNITS);
});

test('Black Hole growth counts only while mounted: unmounting drops it, remounting restores it, melting loses it, old run-wide growth moves onto a mounted hole', () => {
  const state = cardState('hole-mounted', ['black-hole', 'echo-iii', 'deep-vessel']), run = state.run;
  const base = getGlowCapacity(run);
  takeOff(run);
  near(getGlowCapacity(run) - base, 3 * CARD_UNIT);
  const hole = run.mountedCards[0];
  run.mountedCards[0] = null; run.reserveCards.push(hole);
  near(getGlowCapacity(run), base, 1e-6, 'a Black Hole in the reserve adds nothing');
  assert.equal(hole.eatenGrowth, 3, 'the instance keeps its tally');
  run.mountedCards[0] = hole; run.reserveCards = run.reserveCards.filter(c => c !== hole);
  near(getGlowCapacity(run) - base, 3 * CARD_UNIT);
  run.mountedCards[0] = null; // melted or sold: the instance is gone, and so is the growth
  near(getGlowCapacity(run), base);
  // Old save: run-wide growth moves onto the mounted hole, or is dropped when none is mounted.
  const old = cardState('hole-old', ['black-hole', 'body-spark', 'deep-vessel']).run, oldBase = getGlowCapacity(old);
  old.cardBlackHoleGrowth = 4; cleanCardRun(old);
  assert.equal(old.cardBlackHoleGrowth, undefined); assert.equal(old.mountedCards[0].eatenGrowth, 4);
  near(getGlowCapacity(old) - oldBase, 4 * CARD_UNIT);
  const none = cardState('hole-none', ['body-spark', 'deep-vessel']).run, noneBase = getGlowCapacity(none);
  none.cardBlackHoleGrowth = 4; cleanCardRun(none);
  assert.equal(none.cardBlackHoleGrowth, undefined); near(getGlowCapacity(none), noneBase);
});

// ── saves ───────────────────────────────────────────────────────────────────────────────────────────────────────
test('old saves load byte-identical and an ordinary flight writes none of the new fields', () => {
  const state = cardState('old-save', ['body-spark', 'echo', 'deep-vessel']), run = state.run;
  takeOff(run);
  assert.ok(M.finishFlight(run, {success: true, flame: 40}));
  // Loading settles a checkpoint once (existing behaviour); after that a save loads back byte for byte.
  const cycle = text => { const loaded = M.loadState({getItem: () => text, setItem() {}}); let out; M.saveState(loaded, {setItem: (_, v) => { out = v; }}); return out; };
  let saved; M.saveState(state, {setItem: (_, v) => { saved = v; }});
  const first = cycle(saved), second = cycle(first);
  assert.equal(second, first);
  for (const key of ['cardBlackHoleGrowth', 'cardBlackHoleMeals', 'cardPack', 'cardEngineStored', 'cardEngineTurns', 'eaten', 'eatenGrowth', 'card-engine'])
    assert.ok(!first.includes(`"${key}"`), `${key} written to an ordinary save`);
  const copy = structuredClone(run); cleanCardRun(copy); assert.equal(JSON.stringify(copy), JSON.stringify(run));
  assert.equal(hasEngineCards(run.mountedCards), false);
});
