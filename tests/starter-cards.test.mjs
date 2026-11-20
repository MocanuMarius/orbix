// Pulse Reader, Courier Cord, Meter Mark (2026-11-18; Finish Flag retired 2026-11-19): the Lift Guide pattern for four more Triggers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WispFlight } from '../dist/flight.mjs';
import { CARD_UNIT } from '../dist/skill-cards.mjs';
import { cardGrowthBadge } from '../dist/card-ui.mjs';
import { fly, makeRun, M } from '../scripts/balance/real-flight-check.mjs';
import { SKILL_CARDS, makeSkillCard, createCardExecution, resolveCardRow, CARD_ROW_EVENTS, getCardModifiers } from '../dist/skill-cards.mjs';
import { faceEffect, faceTrigger } from '../dist/card-face-lines.mjs';
import { getCardTrigger } from '../dist/card-rule-bands.mjs';
import { triggerDisplay } from '../dist/card-trigger-labels.mjs';
import { drawPulseRing, drawCourierFlash } from '../dist/starter-cues.mjs';
import { glowGaugeMarkup } from '../dist/glow-ui.mjs';

const fire = (ids, inscriptions, kind, extra = {}) => {
  const cards = ids.map((id, i) => id ? makeSkillCard(id, `s${i}`) : null);
  return resolveCardRow(createCardExecution(inscriptions ? { cards, inscriptions: inscriptions.map(id => id ? { id } : null) } : { cards }), { kind, meterFraction: .5, heartsLeft: 2, firstCrossing: true, ...extra });
};
const E = CARD_ROW_EVENTS;
const CARDS = [['pulse-reader', 'Pulse', '+1 Spark', E.wave], ['courier-cord', 'Delivery', '+10 Sparks over 10 s', E.delivery], ['meter-mark', 'Overfill', 'keeps 1 Stored', E.overfill]];

test('faces: Trigger word and one short effect line; common, copyable, starter-only', () => {
  for (const [id, word, line] of CARDS) {
    const def = SKILL_CARDS[id], card = makeSkillCard(id, 'f');
    assert.equal(def.rarity, 'common'); assert.equal(def.copyable, true); assert.equal(def.starterOnly, true);
    assert.equal(faceTrigger(card, def).word, word); assert.equal(faceEffect(card, def), line);
    assert.equal(triggerDisplay(getCardTrigger(def).id).label, word);
  }
});

test('Pulse Reader: +1 Spark on its Trigger only; Echo twice; a Boost rounds up; Twin Mark, Gilded', () => {
  const [id, , , kind] = CARDS[0];
  assert.equal(fire([id], null, kind).sparks, 1, id);
  assert.equal(fire([id], null, E.body).sparks, 0, `${id} ignores a Collect`);
  assert.equal(fire(['echo', id], null, kind).sparks, 2);
  assert.equal(fire([id, 'prism-lens'], null, kind).sparks, 2, 'x1.25 rounds up');
  assert.equal(fire([id, 'crescendo'], null, kind).sparks, 2);
  assert.equal(fire([id], ['gilded'], kind).sparks, 3);
  assert.equal(fire([id], ['twin-mark'], kind).sparks, 2);
  assert.ok(fire(['echo', id, 'glide-prism'], ['gilded'], kind).sparks < 20, 'bounded');
});

test('Courier Cord: a Delivery is worth 10 Sparks over 10 s; Echo adds another 10; a Boost lengthens it (x1.25 -> 13); it ignores other Triggers', () => {
  const k = E.delivery;
  assert.equal(fire(['courier-cord'], null, k).sparks, 10);
  assert.equal(fire(['courier-cord'], null, E.body).sparks, 0);
  assert.equal(fire(['echo', 'courier-cord'], null, k).sparks, 20);
  assert.equal(fire(['courier-cord', 'prism-lens'], null, k).sparks, 13);
  assert.equal(fire(['courier-cord'], ['twin-mark'], k).sparks, 20);
  assert.equal(SKILL_CARDS['courier-cord'].row.overSeconds, 10);
});

const dripStub = ({ maxFlame = 100 * CARD_UNIT, ...over } = {}) => Object.defineProperty(Object.assign(Object.create(WispFlight.prototype), { mod: { cardCourierCord: true }, flame: 0, flameRestored: 0, rec: { cardSparks: 0 }, courierDrip: 0,
  cardExecution: { cards: [{ cardId: 'courier-cord', instanceId: 'c' }] } }, over), 'maxFlame', { value: maxFlame });
const run = (e, seconds, dt = 1 / 60) => { for (let t = 0; t < seconds - 1e-9; t += dt) e.updateCourierDrip(Math.min(dt, seconds - t)); };
const sparksOf = e => Math.round(e.flame / CARD_UNIT * 1e6) / 1e6;

test('Courier Cord drip: 0 at once, 5 after 5 s, 10 after 10 s, none after; two Deliveries 4 s apart give 20 over 20 s', () => {
  const e = dripStub(); e.courierDrip += 10;
  assert.equal(sparksOf(e), 0);
  run(e, 5); assert.equal(sparksOf(e), 5); assert.equal(cardGrowthBadge(e.cardExecution.cards[0]).text, '5 s');
  run(e, 5); assert.equal(sparksOf(e), 10); run(e, 5); assert.equal(sparksOf(e), 10, 'nothing after the drip ends');
  assert.equal(cardGrowthBadge(e.cardExecution.cards[0]), null);
  const f = dripStub(); f.courierDrip += 10; run(f, 4); f.courierDrip += 10; run(f, 16 - 1e-9 + 1e-9); assert.equal(sparksOf(f), 20, 'two Deliveries: 20 in total over 20 s'); assert.equal(f.rec.cardSparks, 20);
  const g = dripStub(); g.courierDrip += 10; run(g, 4); g.courierDrip += 10; run(g, 10); assert.equal(sparksOf(g), 14, 'still dripping at 1 per second');
  assert.equal(g.rec.cardSparks, 14, 'the recorder counts dripped Sparks as card Sparks');
});

test('Courier Cord drip: nothing when the card is not mounted; at a full Meter a dripped Spark is an Overfill (heard by Overfill cards to its right), not lost', () => {
  const e = dripStub({ mod: {} }); e.courierDrip = 10; run(e, 10); assert.equal(sparksOf(e), 0); assert.equal(e.courierDrip, 0);
  const spills = [], raised = [];
  const f = dripStub({ flame: 98 * CARD_UNIT, running: true, paused: false, alive: true, finished: false, destroyed: false, dying: false, completing: false,
    cardEngine: { raise: (kind, detail) => raised.push({ kind, ...detail }) } });
  f.cardSpillHeard = (spill, slot) => spills.push({ spill, slot });
  f.courierDrip = 10; run(f, 10);
  assert.equal(sparksOf(f), 100); assert.equal(Math.round(f.rec.cardSparks), 2, 'only the room is paid and recorded');
  assert.equal(spills.length, 8, 'each of the 8 Sparks that found the Meter full is one Overfill for row cards');
  assert.ok(spills.every(x => x.slot === 0 && Math.abs(x.spill - 1) < 1e-6), 'one Spark each, made by the Courier Cord at Slot 0 (only cards to its right hear it)');
  assert.equal(raised.filter(x => x.kind === 'overfill' && x.fromSlot === 0).length, 8, 'engine Overfill cards to its right hear it too');
});

test('real flight: a Delivery pays no Spark at once but owes 10 s of drip; the badge shows it', () => {
  let seen = null;
  fly({ ids: ['courier-cord'], hook: e => { const step = e.step.bind(e); let done = false; e.step = dt => { step(dt); if (!done && e.time > 5 && e.running && !e.paused) { done = true; const before = e.flame; const out = e.resolveCardRowEvent(E.delivery, { pickupKind: 'light' }); seen = { gain: out?.gain, drip: e.courierDrip, flame: e.flame - before, badge: e.cardExecution.cards[0].dripLeft }; } }; } });
  assert.ok(seen, 'the event ran'); assert.equal(seen.gain, 0); assert.equal(seen.flame, 0); assert.ok(seen.drip > 9.9 && seen.drip <= 10); assert.ok(seen.badge > 0);
});

test('Meter Mark pays Stored Sparks once; Boosts and Inscriptions never multiply them; Echo repeats', () => {
  for (const [id, , , kind, stored] of [[...CARDS[2], 1]]) {
    assert.equal(fire([id], null, kind).stored, stored); assert.equal(fire([id], null, kind).sparks, 0);
    assert.equal(fire([id, 'crescendo'], null, kind).stored, stored, 'a Boost never multiplies Stored Sparks');
    assert.equal(fire([id, 'prism-lens'], null, kind).stored, stored);
    for (const ins of ['gilded', 'twin-mark', 'kindled', 'resonant', 'brimful']) assert.equal(fire([id], [ins], kind).stored, stored, ins);
    assert.equal(fire(['echo', id], null, kind).stored, 2 * stored, 'Echo is a card, and repeats it');
    assert.equal(fire([id], null, E.lift).stored, 0);
  }
});

test('real flights: Pulse Reader pays per Pulse crossing, Courier Cord per Delivery (and stamps its flash), Meter Mark per Overfill', () => {
  const a = [0, 1, 2].map(seedIndex => fly({ ids: ['pulse-reader'], seedIndex, flare: true }));
  const crossings = a.reduce((n, f) => n + (f.log.events['wave-crossing'] || 0), 0), fired = a.reduce((n, f) => n + (f.log.slots[0]?.fired || 0), 0);
  assert.ok(crossings >= 2 && fired === crossings, `${fired} of ${crossings}`);
  assert.equal(a.reduce((n, f) => n + (f.log.slots[0]?.sparks || 0), 0), fired);
  const b = [0, 1, 2].map(seedIndex => fly({ ids: ['courier-cord'], seedIndex }));
  const deliveries = b.reduce((n, f) => n + (f.log.events['collector-delivery'] || 0), 0), paid = b.reduce((n, f) => n + (f.log.slots[0]?.fired || 0), 0);
  assert.ok(deliveries >= 2 && paid === deliveries, `${paid} of ${deliveries}`);
  assert.ok(b.some(f => f.log.engine.courierFlashAt > 0), 'a drop-off stamps the flash');
  const c = [0, 1, 2].map(seedIndex => fly({ ids: ['meter-mark'], seedIndex }));
  const overfills = c.reduce((n, f) => n + (f.log.events['natural-overfill'] || 0), 0), kept = c.reduce((n, f) => n + (f.log.slots[0]?.stored || 0), 0);
  assert.ok(overfills >= 2 && kept === overfills, `${kept} Stored for ${overfills} Overfills`);
});

test('cues are cheap whole-pixel rects, drawn only with the card mounted', () => {
  const calls = []; const c = { save() {}, restore() {}, set globalAlpha(v) {}, set fillStyle(v) {}, fillRect: (...a) => calls.push(a) };
  const e = { mod: {}, player: { x: 100, y: 100 }, time: 5, courierFlashAt: 4.9, distance: 50, distanceOrigin: 0, totalDistance: 1000, width: 900, luminanceWaves: { cue: { lead: 40 } } };
  drawPulseRing(c, e, { scale: 2, playerY: 100 }); assert.equal(calls.length, 16); assert.ok(calls.flat().every(Number.isInteger));
  calls.length = 0; drawCourierFlash(c, e, { scale: 2, playerY: 100 }); assert.ok(calls.length <= 3 && calls.length > 0 && calls.flat().every(Number.isInteger));
  calls.length = 0; e.time = 6; drawCourierFlash(c, e, { scale: 2 }); assert.equal(calls.length, 0, 'the flash lasts 0.35 s');
  for (const [id, key] of [['pulse-reader', 'cardPulseReader'], ['courier-cord', 'cardCourierCord'], ['meter-mark', 'cardMeterMark']])
    assert.equal(getCardModifiers({ skillSystem: 'cards-v1', mountedCards: [makeSkillCard(id, 'm')], reserveCards: [] })[key], true, key);
  assert.match(glowGaugeMarkup({ flame: 10, skillSystem: 'cards-v1' }), /class="meter-mark"[^>]*hidden/);
});

test('Pulse Reader alone: it sends its own Pulse every 8 s, is paid by it, and cannot re-trigger itself into a loop (2026-11-18)', () => {
  const a = [0, 1, 2].map(seedIndex => fly({ ids: ['pulse-reader'], seedIndex })); // no Flare assist: the card is the only Pulse source
  for (const f of a) {
    const secs = f.record.time, own = f.log.pulseBySource['card-pulse-reader'] || 0;
    assert.ok(own >= 1 && own <= Math.floor(secs / 8) + 1, `own Pulses ${own} in ${secs.toFixed(1)} s`);
    assert.equal(f.log.pulses, own, 'no other Pulse source, and no Pulse made by a crossing');
  }
  const fired = a.reduce((n, f) => n + (f.log.slots[0]?.fired || 0), 0), crossings = a.reduce((n, f) => n + (f.log.events['wave-crossing'] || 0), 0);
  assert.ok(fired >= 1 && fired === crossings, `${fired} firings of ${crossings} crossings`);
  assert.equal(a.reduce((n, f) => n + (f.log.slots[0]?.sparks || 0), 0), fired, '+1 Spark per firing');
  // Cards to its LEFT never hear it; cards to its right do.
  const right = fly({ ids: ['pulse-reader', 'harvest-common'], seedIndex: 0 }), left = fly({ ids: ['harvest-common', 'pulse-reader'], seedIndex: 0 });
  assert.ok((right.log.slots[1]?.fired || 0) >= 1, 'a Pulse card to its right is fired');
  assert.equal(left.log.slots[0]?.fired || 0, 0, 'a Pulse card to its left is not');
});

