// Pulse Reader, Courier Cord, Meter Mark, Finish Flag (2026-11-18): the Lift Guide pattern for four more Triggers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, makeRun, M } from '../scripts/balance/real-flight-check.mjs';
import { SKILL_CARDS, makeSkillCard, createCardExecution, resolveCardRow, CARD_ROW_EVENTS, getCardModifiers } from '../dist/skill-cards.mjs';
import { faceEffect, faceTrigger } from '../dist/card-face-lines.mjs';
import { getCardTrigger } from '../dist/card-rule-bands.mjs';
import { triggerDisplay } from '../dist/card-trigger-labels.mjs';
import { drawPulseRing, drawCourierFlash, drawFinishBar } from '../dist/starter-cues.mjs';
import { glowGaugeMarkup } from '../dist/glow-ui.mjs';

const fire = (ids, inscriptions, kind, extra = {}) => {
  const cards = ids.map((id, i) => id ? makeSkillCard(id, `s${i}`) : null);
  return resolveCardRow(createCardExecution(inscriptions ? { cards, inscriptions: inscriptions.map(id => id ? { id } : null) } : { cards }), { kind, meterFraction: .5, heartsLeft: 2, firstCrossing: true, ...extra });
};
const E = CARD_ROW_EVENTS;
const CARDS = [['pulse-reader', 'Pulse', '+1 Spark', E.wave], ['courier-cord', 'Delivery', '+1 Spark', E.delivery], ['meter-mark', 'Overfill', 'keeps 1 Stored', E.overfill], ['finish-flag', 'Finish', '+2 Stored', E.clear]];

test('faces: Trigger word and one short effect line; common, copyable, starter-only', () => {
  for (const [id, word, line] of CARDS) {
    const def = SKILL_CARDS[id], card = makeSkillCard(id, 'f');
    assert.equal(def.rarity, 'common'); assert.equal(def.copyable, true); assert.equal(def.starterOnly, true);
    assert.equal(faceTrigger(card, def).word, word); assert.equal(faceEffect(card, def), line);
    assert.equal(triggerDisplay(getCardTrigger(def).id).label, word);
  }
});

test('Pulse Reader and Courier Cord: +1 Spark on their Trigger only; Echo twice; a Boost rounds up; Twin Mark, Gilded', () => {
  for (const [id, , , kind] of [CARDS[0], CARDS[1]]) {
    assert.equal(fire([id], null, kind).sparks, 1, id);
    assert.equal(fire([id], null, E.body).sparks, 0, `${id} ignores a Collect`);
    assert.equal(fire(['echo', id], null, kind).sparks, 2);
    assert.equal(fire([id, 'prism-lens'], null, kind).sparks, 2, 'x1.25 rounds up');
    assert.equal(fire([id, 'crescendo'], null, kind).sparks, 2);
    assert.equal(fire([id], ['gilded'], kind).sparks, 3);
    assert.equal(fire([id], ['twin-mark'], kind).sparks, 2);
    assert.ok(fire(['echo', id, 'glide-prism'], ['gilded'], kind).sparks < 20, 'bounded');
  }
});

test('Meter Mark and Finish Flag pay Stored Sparks once; Boosts and Inscriptions never multiply them; Echo repeats', () => {
  for (const [id, , , kind, stored] of [[...CARDS[2], 1], [...CARDS[3], 2]]) {
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

test('Finish Flag: +2 Stored at a real Finish; Echo +4; a Boost adds nothing', () => {
  const clear = ids => { const run = makeRun(ids, { seed: 'ff' }), n = M.getChoices(run).find(x => x.type !== 'support'); M.selectNode(run, n.id); M.beginFlightAttempt(run); M.finishFlight(run, { success: true, flame: 60, collected: 3 }); return run.lastFlight.cardClearReceipt.stored; };
  assert.equal(clear(['finish-flag']), 2); assert.equal(clear(['echo', 'finish-flag']), 4); assert.equal(clear(['finish-flag', 'crescendo']), 2);
});

test('cues are cheap whole-pixel rects, drawn only with the card mounted', () => {
  const calls = []; const c = { save() {}, restore() {}, set globalAlpha(v) {}, set fillStyle(v) {}, fillRect: (...a) => calls.push(a) };
  const e = { mod: {}, player: { x: 100, y: 100 }, time: 5, courierFlashAt: 4.9, distance: 50, distanceOrigin: 0, totalDistance: 1000, width: 900, luminanceWaves: { cue: { lead: 40 } } };
  drawPulseRing(c, e, { scale: 2, playerY: 100 }); assert.equal(calls.length, 16); assert.ok(calls.flat().every(Number.isInteger));
  calls.length = 0; drawCourierFlash(c, e, { scale: 2, playerY: 100 }); assert.ok(calls.length <= 3 && calls.length > 0 && calls.flat().every(Number.isInteger));
  calls.length = 0; e.time = 6; drawCourierFlash(c, e, { scale: 2 }); assert.equal(calls.length, 0, 'the flash lasts 0.35 s');
  calls.length = 0; drawFinishBar(c, e, { scale: 2 }); assert.ok(calls.length <= 8 && calls.flat().every(Number.isInteger));
  for (const [id, key] of [['pulse-reader', 'cardPulseReader'], ['courier-cord', 'cardCourierCord'], ['meter-mark', 'cardMeterMark'], ['finish-flag', 'cardFinishFlag']])
    assert.equal(getCardModifiers({ skillSystem: 'cards-v1', mountedCards: [makeSkillCard(id, 'm')], reserveCards: [] })[key], true, key);
  assert.match(glowGaugeMarkup({ flame: 10, skillSystem: 'cards-v1' }), /class="meter-mark"[^>]*hidden/);
});
