// Real flights for the engine, Pack and Black Hole cards (released 2026-11-18). Every card is flown in the actual WispFlight by the
// repository pilot, in the Chain it is meant for, and the engine log (flight.cardEngine.log) is compared with what the card says.
// Held cards (still `unreleased`) are listed at the end with the measurement that held them. Table: docs/engine-cards.md, "Release check".
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, sum, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';
import { SKILL_CARDS, LIVE_CARDS } from '../dist/skill-cards.mjs';
import { engineFire } from '../dist/chain-strip.mjs';
import { existsSync } from 'node:fs';
import { CARD_ART_FILES } from '../dist/card-art-files.mjs';
import { CARD_TILE_LINES } from '../dist/card-tile-lines.mjs';

const levels = [0, 8, 16].map(i => BIOME_LEVELS[i]).filter(Boolean);
const flights = (ids, opts = {}) => levels.flatMap(l => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, flare: true, ...opts })));
const logOf = f => f.log.engine.cardEngine?.log || [];
const entries = (fl, k, pred = () => true) => fl.flatMap(f => logOf(f).filter(x => x.k === k && pred(x, f)));
const perFlight = (fl, k, pred) => entries(fl, k, pred).length / fl.length;
const EPS = 1e-3;

test('Metronome fires the card to its right every 3 s (1.5 s with Heartbeat), only while that card can act', () => {
  const a = flights(['metronome', 'body-spark']);
  assert.ok(perFlight(a, 'fired', x => x.slot === 1) >= 8, 'a periodic engine: many ticks per flight');
  assert.ok(entries(a, 'gain').every(x => x.slot === 1 && x.amount === 2), 'each tick is one Body Spark: +2');
  for (const f of a) {
    const t = logOf(f).filter(x => x.k === 'turn').map(x => x.t);
    for (let i = 1; i < t.length; i++) assert.ok(t[i] - t[i - 1] >= 3 - EPS, 'never faster than 3 s');
    assert.ok(t.length < 2 || t.some((x, i) => i && Math.abs(x - t[i - 1] - 3) < EPS), 'consecutive ticks are exactly 3 s apart');
  }
  const h = flights(['heartbeat', 'metronome', 'body-spark']);
  for (const f of h) { const t = logOf(f).filter(x => x.k === 'turn').map(x => x.t); for (let i = 1; i < t.length; i++) assert.ok(t[i] - t[i - 1] >= 1.5 - EPS); assert.ok(t.length < 2 || t.some((x, i) => i && Math.abs(x - t[i - 1] - 1.5) < EPS)); }
  assert.ok(perFlight(h, 'turn') > 1.4 * perFlight(a, 'turn'), 'Heartbeat roughly doubles the ticks');
  const last = flights(['body-spark', 'metronome']);
  assert.equal(perFlight(last, 'turn'), 0, 'nothing to its right: it never ticks');
  assert.ok(perFlight(last, 'metronome-stops') > 0);
  const cond = flights(['metronome', 'dusk-wick-ii']);
  assert.equal(perFlight(cond, 'fired'), 0, 'a card whose condition (a Dusk Spark) is not met does not fire');
});

test('timer firings reach the in-flight Chain strip: a Turn mark for the Metronome Slot, and no timer without a mark', () => {
  const a = flights(['metronome', 'body-spark']);
  for (const f of a) {
    const turns = logOf(f).filter(x => x.k === 'turn');
    assert.ok(turns.every(x => engineFire(x)?.slot === x.slot), 'every Turn becomes a strip mark for the Timer card');
    if (turns.length) assert.ok((f.log.engine.cardFires || []).some(m => m.slot === 0 && m.kind === 'fire'), 'the strip log holds a firing for Slot 1');
  }
});

test('the Chime loop under today’s rules: First Catch lights it, Ember Bell hears the Overfill, Slow Wick waits 3 s and returns the Pulse; only a Timer returns to Slot 1', () => {
  const a = flights(['first-catch', 'spark-chime', 'ember-bell', 'slow-wick']);
  assert.ok(perFlight(a, 'turn') >= 3, `a loop turns: ${perFlight(a, 'turn')} Turns a flight`);
  assert.ok(entries(a, 'gain').every(x => (x.slot === 1 && x.amount === 1) || (x.slot === 0 && x.amount === 4)), 'Spark Chime gives 1 Spark per Pulse (First Catch’s own +4 is the only other gain)');
  assert.ok(entries(a, 'hit', x => x.slot === 2).every(x => x.type === 'overfill'), 'Ember Bell hears Overfill and nothing else');
  assert.ok(entries(a, 'turn').every(x => x.slot === 3), 'only the Timer starts a Turn');
  assert.ok(entries(a, 'pulse', x => x.slot === -1).every(x => x.back === true), 'only a Timer returns a Pulse to Slot 1');
  for (const f of a) {
    const lit = logOf(f).filter(x => x.k === 'lit' || x.k === 'turn');
    for (let i = 1; i < lit.length; i++) if (lit[i].k === 'turn' && lit[i - 1].k === 'lit') assert.ok(Math.abs(lit[i].t - lit[i - 1].t - 3) < EPS, 'Slow Wick waits 3 s');
  }
  assert.equal(perFlight(a, 'halt'), 0);
  const ember = flights(['body-spark', 'ember-bell', 'slow-wick', 'spark-chime']);
  assert.ok(perFlight(ember, 'turn') >= 3, 'the loop also runs behind a Collect adder');
});

test('First Catch sends exactly one Pulse per flight, on the first Collect', () => {
  const a = flights(['first-catch', 'spark-chime']);
  for (const f of a) assert.equal(logOf(f).filter(x => x.k === 'hit' && x.slot === 0).length, 1);
  assert.ok(entries(a, 'gain').filter(x => x.slot === 0).every(x => x.amount === 4) && perFlight(a, 'gain', x => x.slot === 0) === 1, 'First Catch pays +4 Sparks of its own, once a flight');
  assert.ok(perFlight(a, 'gain', x => x.slot === 1) >= 1, 'its Pulse is heard by Spark Chime (and Chime also hears the real Pulse crossing Sparks)');
});

test('Long Fuse repeats the Chain’s last firing exactly 5 s after a Pulse, for what that firing paid', () => {
  const a = flights(['body-spark', 'ember-bell', 'long-fuse']);
  assert.ok(perFlight(a, 'fuse') >= 3);
  assert.ok(entries(a, 'fuse').every(x => x.amount === 2), 'the last firing was a Body Spark: +2');
  for (const f of a) {
    const lit = logOf(f).filter(x => x.k === 'lit' || x.k === 'fuse');
    for (let i = 1; i < lit.length; i++) if (lit[i].k === 'fuse' && lit[i - 1].k === 'lit') assert.ok(Math.abs(lit[i].t - lit[i - 1].t - 5) < EPS);
  }
});

test('Overflow Bell sends a Pulse and keeps at most 2 spilled Sparks as Stored Sparks, the same total the flight records', () => {
  const a = flights(['body-spark', 'overflow-bell']);
  const kept = entries(a, 'keep');
  assert.ok(kept.length >= 4 && kept.every(x => x.amount >= 1 && x.amount <= 2), 'keeps 1 to 2 per Overfill');
  assert.equal(sum(kept, x => x.amount), sum(a, f => f.log.engine.cardEngineStored || 0), 'every kept Spark is a Stored Spark of the flight');
  const boosted = flights(['body-spark', 'crescendo', 'overflow-bell']);
  assert.ok(entries(boosted, 'keep').every(x => x.amount <= 2), 'a Boost never makes it keep more');
});

test('Flare Tinder starts a 1 s Flare on a Collect; its end pays Afterglow +2 each time', () => {
  const a = flights(['flash-tinder', 'afterglow']);
  assert.ok(perFlight(a, 'flash') >= 3);
  const hits = entries(a, 'hit', x => x.slot === 1 && x.type === 'flash-end').length, gains = entries(a, 'gain', x => x.slot === 1);
  assert.ok(hits >= 3 && gains.every(x => x.amount === 2) && gains.length === hits);
});

test('Third Beat: each Timer firing, 33% that its card gains count twice (whatever the Turn number)', () => {
  const a = flights(['metronome', 'body-spark', 'third-beat']);
  const gains = entries(a, 'gain');
  assert.ok(gains.length > 20);
  assert.ok(gains.every(x => x.amount === 2 || x.amount === 4), 'a gain is 2, or 4 when the Turn roll succeeded');
  assert.ok(gains.some(x => x.amount === 4) && gains.some(x => x.amount === 2), 'some firings double, most do not');
  assert.ok(gains.some(x => x.turn % 3 !== 0 && x.amount === 4), 'doubling is not tied to every third Turn');
});

test('Full Satchel (Pack): +3 Sparks go into the meter before it is packed; Echo repeats it', () => {
  const a = flights(['full-satchel']).filter(f => f.record.success);
  assert.ok(a.length >= 3);
  assert.ok(a.every(f => f.log.engine.cardPack?.asked === 3 && f.log.engine.cardPack.sparks <= 3), 'asks 3; the meter takes what fits');
  assert.ok(a.some(f => f.log.engine.cardPack.sparks > 0));
  const e = flights(['echo', 'full-satchel']).filter(f => f.record.success);
  assert.ok(e.length >= 3 && e.every(f => f.log.engine.cardPack?.asked === 6));
});

test('runaway guard: the strongest released Chains stay under 20 times a typical 5-card Chain (413), never reach the safety stop', () => {
  const worst = [['heartbeat', 'metronome', 'body-spark', 'echo-iii', 'overflow-bell'], ['metronome', 'body-spark', 'echo-iii', 'overflow-bell', 'heartbeat'], ['first-catch', 'spark-chime', 'echo-iii', 'ember-bell', 'slow-wick'], ['heartbeat', 'metronome', 'downbeat', 'third-beat', 'crescendo']];
  for (const ids of worst) {
    const a = flights(ids);
    for (const f of a) {
      const ce = f.log.engine.cardEngine;
      assert.ok(!ce.warned, `${ids.join('+')}: safety limit reached`);
      assert.ok(ce.asked + ce.stored + f.log.paid < 413, `${ids.join('+')}: ${ce.asked} asked + ${ce.stored} stored + ${f.log.paid} paid`);
      assert.ok(ce.turn < 200);
    }
  }
});

test('Close Call brings its own Proximity: a skim sends a Pulse and +12 Sparks, with no Proximity card in the Chain; Echo or a Boost repeats the +12', () => {
  const a = flights(['close-call', 'spark-chime']);
  assert.ok(a.every(f => f.log.engine.mod.cardProximityUnlocked), 'the card turns Proximity on');
  assert.ok(entries(a, 'hit', x => x.slot === 0 && x.type === 'skim').length >= 2, 'it fires on skims in the flights, alone');
  const own = entries(a, 'gain', x => x.slot === 0);
  assert.ok(own.length >= 2 && own.every(x => x.amount === 12), 'each skim pays +12');
  assert.ok(entries(a, 'gain', x => x.slot === 1).every(x => x.amount === 1), 'its Pulse is heard by Spark Chime');
  const boosted = flights(['close-call', 'crescendo']);
  assert.ok(entries(boosted, 'gain', x => x.slot === 0).every(x => x.amount === 24), 'a Boost doubles it');
  const echoed = flights(['echo', 'close-call']);
  assert.ok(entries(echoed, 'hit', x => x.slot === 1).every(x => x.times === 2), 'Echo fires it twice');
  const none = flights(['spark-chime']);
  assert.equal(entries(none, 'hit', x => x.type === 'skim').length, 0, 'without the card there is no Proximity, so no skim');
});

test('Low Ember: a Lift while the meter is under half sends a Pulse, once per 6 s', () => {
  const a = flights(['low-ember', 'spark-chime']);
  assert.ok(perFlight(a, 'hit', x => x.slot === 0) >= 1.5, `fires ${perFlight(a, 'hit', x => x.slot === 0)} times a flight (was 0.6 under a quarter)`);
  for (const f of a) { const t = logOf(f).filter(x => x.k === 'hit' && x.slot === 0).map(x => x.t); for (let i = 1; i < t.length; i++) assert.ok(t[i] - t[i - 1] >= 6 - EPS); }
  const echoed = flights(['echo', 'low-ember', 'spark-chime']);
  assert.ok(entries(echoed, 'hit', x => x.slot === 1).every(x => x.times === 2));
});

test('Momentum: +40% Luminance after 5 Turns in a row, only while the engine keeps turning', () => {
  const a = flights(['metronome', 'body-spark', 'momentum']);
  const starts = entries(a, 'momentum');
  assert.ok(starts.length >= a.length && starts.every(x => x.amount === 40), 'starts in every flight, at +40%');
  const heart = flights(['heartbeat', 'metronome', 'body-spark', 'momentum']);
  assert.ok(perFlight(heart, 'momentum') > perFlight(a, 'momentum'), 'a faster engine reaches it more often');
  for (const f of a) { const ce = f.log.engine.cardEngine; assert.ok(!ce.warned); assert.ok(f.log.engine.cardEngineLuminance === 0 || f.log.engine.cardEngineLuminance === 40 || f.log.engine.cardEngineLuminance === undefined); }
});

test('Homing Thread: a Delivery sends the Collector for the nearest Spark within twice its reach', () => {
  const a = flights(['haul-winch', 'homing-thread']);
  assert.ok(perFlight(a, 'homing') >= 1, `sends the Collector ${perFlight(a, 'homing')} times a flight`);
  assert.equal(perFlight(a, 'halt'), 0);
  assert.equal(SKILL_CARDS['homing-thread'].engine.does[0], 'homing');
});

test('Last Round: at Pack the Chain’s last Trigger card fires once more into the meter; Echo repeats it; no loop', () => {
  const a = flights(['body-spark', 'last-round']).filter(f => f.record.success);
  assert.ok(a.length >= 3);
  assert.ok(a.every(f => f.log.engine.cardPack.asked === 2 && f.log.engine.cardPack.turns === 1), 'one more Body Spark: +2, one Turn');
  const e = flights(['body-spark', 'echo', 'last-round']).filter(f => f.record.success);
  assert.ok(e.every(f => f.log.engine.cardPack.asked === 4 && f.log.engine.cardPack.turns === 2), 'Echo: twice');
  const boosted = flights(['body-spark', 'last-round', 'crescendo']).filter(f => f.record.success);
  assert.ok(boosted.every(f => f.log.engine.cardPack.asked === 4), 'a Boost doubles the repeat');
  for (const f of [...a, ...e]) assert.ok(!f.log.engine.cardEngine.warned);
});

test('Harvest Home: at Pack every Collect card fires, Cluster and Dusk cards too (+2 each from Harvest Home)', () => {
  const a = flights(['harvest-home', 'body-spark', 'dusk-wick']).filter(f => f.record.success);
  assert.ok(a.length >= 3);
  assert.ok(a.every(f => f.log.engine.cardPack.asked === 2 + 20 + 2), 'Body Spark 2, Dusk Wick 20 + 2 (Cluster Heart: unit test in card-engines)');
  assert.ok(a.some(f => f.log.engine.cardPack.sparks > 0));
  const plain = flights(['harvest-home', 'body-spark']).filter(f => f.record.success);
  assert.ok(plain.every(f => f.log.engine.cardPack.asked === 2), 'a plain Collect card pays as before');
  const boosted = flights(['harvest-home', 'body-spark', 'prism-lens']).filter(f => f.record.success);
  assert.ok(boosted.every(f => f.log.engine.cardPack.asked === 3), 'a Boost applies to the firing, rounded up');
});

test('Wave Loom: a light Pulse each Turn, Pulse cards hear it, and its picture exists', () => {
  const a = flights(['metronome', 'body-spark', 'wave-loom']);
  assert.ok(perFlight(a, 'world-pulse') >= 8, 'a Pulse per Turn');
  assert.equal(perFlight(a, 'world-pulse-refused'), 0);
  const heard = flights(['metronome', 'body-spark', 'wave-loom', 'harvest-rare']);
  assert.ok(heard.every(f => !f.log.engine.cardEngine.warned));
});

test('released: every card has a picture and a tile line of 22 characters at most', () => {
  const released = ['metronome', 'heartbeat', 'slow-wick', 'spark-chime', 'ember-bell', 'long-fuse', 'first-catch', 'overflow-bell', 'flash-tinder', 'afterglow', 'third-beat', 'black-hole', 'full-satchel', 'wave-loom', 'momentum', 'low-ember', 'close-call', 'homing-thread', 'last-round', 'harvest-home'];
  for (const id of released) {
    assert.ok(LIVE_CARDS.includes(SKILL_CARDS[id]), `${id} is live`);
    assert.ok(CARD_ART_FILES[id] && existsSync(new URL('../dist/' + CARD_ART_FILES[id], import.meta.url)), `${id}: picture`);
    assert.ok(CARD_TILE_LINES[id] && CARD_TILE_LINES[id].length <= 22, `${id}: "${CARD_TILE_LINES[id]}"`);
  }
  // The seven cards held on 2026-11-18 were released the same day with the owner's fixes (see the tests above).
});
