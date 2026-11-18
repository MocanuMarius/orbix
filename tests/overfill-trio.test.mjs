// Overfill trio (2026-11-18): Brimful (Common), Pressure Valve (Rare), Floodgate (Legendary). Rules in dist/card-engine.mjs (the two engine cards)
// and dist/flight.mjs (Brimful on a direct Collect, the armed free Lift). Loop numbers: scripts/balance/overfill-loop-check.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_CARDS, CARD_UNIT, makeSkillCard, createCardExecution, getCardModifiers, CARD_SYSTEM } from '../dist/skill-cards.mjs';
import { CardEngine, createMeterHost } from '../dist/card-engine.mjs';
import { faceEffect, faceTrigger } from '../dist/card-face-lines.mjs';
import { cardTileLine } from '../dist/card-tile-lines.mjs';
import { inscriptionOnCard } from '../dist/inscription-on-card.mjs';
import { getEquippedCardStatuses } from '../dist/card-status.mjs';
import { cardGrowthBadge } from '../dist/card-ui.mjs';
import { synthFlight } from '../scripts/balance/card-works-probes.mjs';
import { measure } from '../scripts/balance/overfill-loop-check.mjs';

const ids = list => list.map((id, i) => id ? makeSkillCard(id, `t${i}`) : null);
/** A pure engine on a meter; `inscriptions` as in a run. */
function rig(list, meter = { start: 0, max: Infinity }, inscriptions = []) {
  const runtime = createCardExecution({ cards: ids(list), inscriptions: inscriptions.map(id => id ? { id } : null) }), host = createMeterHost(meter); host.runtime = runtime;
  return { engine: new CardEngine(runtime, host), host, runtime };
}
const floods = r => r.engine.log.filter(x => x.k === 'flood');
const gains = r => r.engine.log.filter(x => x.k === 'gain');
const collect = e => e.collect({ kind: 'light', x: e.distance + e.player.x, y: e.player.y });

test('catalogue: normal-pool cards, not starters, not permanent, faces and tiles fit', () => {
  for (const [id, rarity, trigger, word, line] of [['brimful', 'common', 'always-on', 'Passive', 'Full Meter: Collect +1'], ['pressure-valve', 'rare', 'overfill', 'Overfill', 'next Lift free'], ['floodgate', 'legendary', 'overfill', 'Overfill', 'whole Chain fires']]) {
    const def = SKILL_CARDS[id], card = makeSkillCard(id, 'x');
    assert.equal(def.rarity, rarity); assert.equal(def.trigger, trigger);
    assert.ok(!def.starterOnly && !def.permanent && !def.unreleased && !def.retired && def.excludeStarter && def.help && def.ruleBands.length >= 2, id);
    assert.equal(faceTrigger(card, def).word, word); assert.equal(faceEffect(card, def), line);
    assert.ok(cardTileLine(card).length <= 22, `${id} tile line fits: ${cardTileLine(card)}`);
  }
});

test('Pressure Valve: an Overfill arms one free Lift, never stacks, re-arms after use; Echo to its left adds nothing', () => {
  for (const list of [['pressure-valve'], ['echo', 'pressure-valve'], ['pressure-valve', 'pressure-valve']]) {
    const r = rig(list); r.engine.raise('overfill', { natural: true }, 0);
    assert.equal(r.host.freeLiftArmed, true, list.join());
    r.engine.raise('overfill', { spill: 3 }, 1); assert.equal(r.host.freeLiftArmed, true);
    r.host.freeLiftArmed = false; // the free Lift was used
    r.engine.raise('overfill', { natural: true }, 2); assert.equal(r.host.freeLiftArmed, true, 're-arms');
  }
  const none = rig(['pressure-valve']); none.engine.raise('collect', {}, 0); assert.equal(none.host.freeLiftArmed, false, 'only an Overfill arms it');
});

test('Pressure Valve in a real flight: arms on a natural Overfill, the next Lift costs 0, the badge shows, the one after costs', () => {
  const e = synthFlight(['pressure-valve']);
  try {
    const card = () => e.cardExecution.cards[0];
    e.flame = e.maxFlame; collect(e);
    assert.equal(e.cardFreeLift, true); assert.equal(card().armed, 1); assert.equal(cardGrowthBadge(card()).text, 'Free');
    assert.equal(e.nextLiftCost, 0);
    e.flame = e.maxFlame; collect(e); assert.equal(e.cardFreeLift, true, 'a second Overfill does not stack');
    const spentBefore = e.effortSpent; e.flame = e.maxFlame; e.player.vy = 50; assert.ok(e.flap(), 'the Lift happens');
    assert.equal(e.effortSpent, spentBefore, 'free: no Sparks spent'); assert.equal(e.cardFreeLiftsUsed, 1);
    assert.equal(e.cardFreeLift, false); assert.equal(card().armed, undefined); assert.equal(cardGrowthBadge(card()), null);
    assert.ok(e.nextLiftCost > 0, 'the next Lift is paid again');
  } finally { e.destroy(); }
});

test('Floodgate: fires every OTHER Spark-paying card once, left to right, printed Sparks only; growth and Stored cards stay quiet', () => {
  const r = rig(['body-spark', 'clean-run', 'harvest-common', 'floodgate']);
  r.engine.raise('overfill', { natural: true }, 0);
  assert.equal(floods(r).length, 1); assert.equal(floods(r)[0].fired, 2);
  assert.deepEqual(gains(r).map(x => x.slot), [0, 2], 'left to right; Clean Run (Stored) does not fire');
  assert.equal(r.host.storedTotal, 0);
  assert.equal(r.host.meter, gains(r).reduce((s, x) => s + x.amount, 0));
  const plain = gains(r).map(x => x.amount);
  const dressed = rig(['body-spark', 'harvest-common', 'floodgate'], undefined, ['gilded', 'twin-mark', 'kindled']);
  dressed.engine.raise('overfill', { natural: true }, 0);
  assert.deepEqual(gains(dressed).map(x => x.amount), plain, 'Gilded and Twin Mark on the fired cards add nothing');
  const twin = rig(['body-spark', 'harvest-common', 'floodgate'], undefined, [null, null, 'twin-mark']);
  twin.engine.raise('overfill', { natural: true }, 0);
  assert.equal(floods(twin).length, 1, 'Twin Mark on Floodgate does not fire the Chain twice');
});

test('Floodgate: once per 3 seconds; Echo to its left and a second Overfill inside the cooldown add nothing', () => {
  for (const list of [['body-spark', 'floodgate'], ['body-spark', 'echo', 'floodgate']]) {
    const r = rig(list);
    r.engine.raise('overfill', { natural: true }, 0);
    r.engine.raise('overfill', { natural: true }, 1); r.engine.raise('overfill', { spill: 2 }, 2.9);
    assert.equal(floods(r).length, 1, `${list.join()} inside 3 s`);
    r.engine.raise('overfill', { natural: true }, 3.1);
    assert.equal(floods(r).length, 2, `${list.join()} after 3 s`);
    assert.equal(gains(r).length, 2, 'Echo does not repeat it: one body-spark gain per flood');
  }
});

test('Floodgate: the Overfill made by its own firing cannot fire it again (checked without the cooldown)', () => {
  const r = rig(['body-spark', 'floodgate'], { start: 5, max: 5 }); // full meter: the fired Sparks all spill
  r.engine.lowEmberAt.set = () => {}; // cooldown off, so only the same-step guard is under test
  r.engine.raise('overfill', { natural: true }, 0);
  assert.equal(floods(r).length, 1);
  assert.ok(r.engine.log.some(x => x.k === 'gain' && x.spill > 0), 'its Sparks did spill');
  assert.ok(!r.engine.log.some(x => x.k === 'halt'));
});

test('Floodgate in a real flight: an Overfill makes the Slot 1 Body Spark fire from the Chain', () => {
  const e = synthFlight(['body-spark', 'floodgate']);
  try {
    e.flame = e.maxFlame; collect(e);
    const log = e.cardEngine.log, flood = log.filter(x => x.k === 'flood');
    assert.equal(flood.length, 1); assert.equal(flood[0].fired, 1);
    assert.ok(log.some(x => x.k === 'gain' && x.slot === 0 && x.amount === 2 && x.t === flood[0].t), 'Body Spark +2 printed Sparks');
  } finally { e.destroy(); }
});

test('Brimful: with the meter full, each direct Collect gives +1 Spark per Brimful that spills; not with room, several add', () => {
  const spill = (list, full = true) => {
    const e = synthFlight(list);
    try { e.flame = full ? e.maxFlame : e.maxFlame * .5; const before = e.pickupOverflow; collect(e); return (e.pickupOverflow - before) / CARD_UNIT; }
    finally { e.destroy(); }
  };
  const base = spill([]);
  assert.ok(base > 0, 'a Collect into a full meter already spills');
  assert.ok(Math.abs(spill(['brimful']) - base - 1) < 1e-6, '+1 Spark');
  assert.ok(Math.abs(spill(['brimful', 'brimful']) - base - 2) < 1e-6, 'several add');
  assert.equal(spill(['brimful'], false), spill([], false), 'a meter with room gets nothing extra');
  assert.equal(getCardModifiers({ skillSystem: CARD_SYSTEM, mountedCards: ids(['brimful', 'brimful']) }).cardBrimful, 2);
});

test('Brimful feeds Overfill cards: the extra spill reaches Overflow Bell, which keeps it as Stored', () => {
  const e = synthFlight(['brimful', 'overflow-bell']);
  try {
    e.flame = e.maxFlame; collect(e);
    const keeps = e.cardEngine.log.filter(x => x.k === 'keep');
    assert.equal(keeps.length, 1); assert.equal(keeps[0].amount, 1, 'the Brimful Spark, kept as Stored');
    assert.equal(e.cardEngineStored, 1);
  } finally { e.destroy(); }
});

test('Brimful with a Boost to its right: nothing is multiplied', () => {
  const run = list => { const e = synthFlight(list); try { e.flame = e.maxFlame; const before = e.pickupOverflow; collect(e); return e.pickupOverflow - before; } finally { e.destroy(); } };
  assert.equal(run(['brimful', 'prism-lens']), run(['brimful']));
});

test('Inscription sentences are true for the three cards', () => {
  const card = id => makeSkillCard(id, 'x');
  assert.match(inscriptionOnCard('gilded', card('pressure-valve')), /only fires on Overfill/);
  assert.match(inscriptionOnCard('gilded', card('floodgate')), /only fires on Overfill/);
  assert.match(inscriptionOnCard('twin-mark', card('floodgate')), /once per Overfill/);
  assert.match(inscriptionOnCard('twin-mark', card('pressure-valve')), /fires twice/);
  for (const ins of ['gilded', 'kindled', 'twin-mark']) assert.doesNotMatch(inscriptionOnCard(ins, card('brimful')), /^\s*\+2 Sparks/, ins);
});

test('Chain state lines: none of the three is blocked in a normal Chain', () => {
  const s = getEquippedCardStatuses({ mountedCards: ids(['body-spark', 'brimful', 'pressure-valve', 'floodgate']), skillSystem: undefined });
  for (const i of [1, 2, 3]) assert.notEqual(s[i].state, 'blocked', `${i}: ${s[i].state} ${s[i].code}`);
});

test('LOOP CHECK: Lifts do not become free and the engine safety counter never trips (2 real flights each)', () => {
  for (const chain of [['brimful', 'pressure-valve', 'floodgate', 'echo', 'overflow-bell'], ['body-spark', 'harvest-common', 'brimful', 'pressure-valve', 'floodgate']]) {
    const m = measure({ ids: chain, flights: 2 });
    assert.ok(m.liftsPerMin > 0, chain.join());
    assert.ok(m.freeShare < 0.5, `free Lifts ${m.freeShare} of all Lifts`);
    assert.equal(m.safetyHalts, 0); assert.equal(m.safetyWarnings, 0);
    assert.ok(m.maxFiringsInOneStep <= 12, `max firings in one step ${m.maxFiringsInOneStep}`);
    assert.ok(m.floodsPerMin <= 20 + 1e-9, 'at most once per 3 s');
  }
});
