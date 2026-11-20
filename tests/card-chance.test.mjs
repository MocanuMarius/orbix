// Chance (owner rule, 20 November 2026): a card that should pay less often rolls a percentage per firing, never a counter.
// The helper (dist/card-chance.mjs) is deterministic per seed; five things use it: Lift Guide, Gilded, Meter Mark, Courier, Third Beat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rollChance, chanceStream, LIFT_GUIDE_CHANCE, GILDED_CHANCE, METER_MARK_CHANCE, COURIER_COLLECT_CHANCE, THIRD_BEAT_CHANCE } from '../dist/card-chance.mjs';
import { makeSkillCard, createCardExecution, resolveCardRow, previewCardRow, CARD_ROW_EVENTS as E } from '../dist/skill-cards.mjs';
import { getInscription } from '../dist/inscriptions.mjs';
import { simulateEngineChain } from '../dist/card-engine.mjs';
import { faceEffect, faceTrigger } from '../dist/card-face-lines.mjs';
import { cardTileLine } from '../dist/card-tile-lines.mjs';
import { CARD_TERMS } from '../dist/card-terms.mjs';
import { SKILL_CARDS } from '../dist/skill-cards.mjs';
import { fly } from '../scripts/balance/real-flight-check.mjs';

const FORCE = Symbol.for('orbix.chanceForce');
const seeded = (seed, ids, inscriptions) => { const rt = createCardExecution({ cards: ids.map((id, i) => id ? makeSkillCard(id, `c${i}`) : null), ...(inscriptions ? { inscriptions: inscriptions.map(id => id ? { id } : null) } : {}) }); rt.chanceSeed = seed; return rt; };
const fire = (rt, kind, extra = {}) => resolveCardRow(rt, { kind, meterFraction: .5, heartsLeft: 2, pickupKind: 'light', ...extra });
const rate = (n, f) => { let hit = 0; for (let i = 0; i < n; i++) if (f(i)) hit++; return hit / n; };

test('the helper: the same seed replays the same rolls, another seed differs, 0 and 100 are certain', () => {
  const a = seeded('s1', ['body-spark']), b = seeded('s1', ['body-spark']), c = seeded('s2', ['body-spark']);
  const seq = rt => Array.from({ length: 64 }, () => rollChance(rt, 50));
  assert.deepEqual(seq(a), seq(b));
  assert.notDeepEqual(seq(seeded('s1', ['body-spark'])), seq(c));
  assert.equal(rollChance(a, 0), false); assert.equal(rollChance(a, 100), true);
  const s = chanceStream('x'), t = chanceStream('x'); assert.equal(s(), t());
});

test('the helper: the long-run frequency matches the stated percentage, rolls are independent of anything but order', () => {
  for (const p of [33, 50]) {
    const rt = seeded('freq', ['body-spark']), f = rate(20000, () => rollChance(rt, p));
    assert.ok(Math.abs(f - p / 100) < .02, `${p}% rolled ${f}`);
  }
  assert.ok(rate(2000, () => rollChance({ preview: true }, 1)) === 1, 'a preview always shows the full effect');
});

test('a failed roll is not a firing: no pay, no light, nothing that depends on it', () => {
  globalThis[FORCE] = false;
  try {
    const rt = seeded('f', ['lift-guide', 'crescendo']);
    const r = fire(rt, 'guide-lift');
    assert.equal(r.sparks, 0); assert.equal(r.executions, 0);
    assert.equal(r.cards[0].fired, 0, 'the card does not light');
    assert.equal(r.steps[0].skipReason, 'chance'); assert.equal(r.steps[0].success, false);
    const echo = fire(seeded('f', ['echo', 'lift-guide']), 'guide-lift');
    assert.equal(echo.sparks, 0, 'a Repeat rolls again for each repeat (and fails again)');
  } finally { delete globalThis[FORCE]; }
  const win = (() => { globalThis[FORCE] = true; try { return fire(seeded('f', ['echo', 'lift-guide']), 'guide-lift').sparks; } finally { delete globalThis[FORCE]; } })();
  assert.equal(win, 2, 'with both rolls succeeding, Echo pays twice');
  assert.equal(previewCardRow({ cards: [makeSkillCard('lift-guide', 'p')] }, { kind: 'guide-lift' }).sparks, 1, 'a preview shows the expected full effect');
});

test('Lift Guide: on the cue, 50%: +1 Spark', () => {
  assert.equal(LIFT_GUIDE_CHANCE, 50);
  const rt = seeded('lg', ['lift-guide']);
  let total = 0;
  const f = rate(4000, () => { const s = fire(rt, 'guide-lift').sparks; total += s; return s > 0; });
  assert.ok(Math.abs(f - .5) < .03, `paid ${f}`); assert.equal(total, Math.round(f * 4000));
  const card = makeSkillCard('lift-guide', 'x');
  assert.equal(faceEffect(card, SKILL_CARDS['lift-guide']), '50%: +1 Spark');
  assert.ok(cardTileLine(card).length <= 22 && /^50%/.test(cardTileLine(card)));
});

test('Gilded: each firing, 50%: +2 Sparks (the card still fires when the roll fails)', () => {
  assert.equal(GILDED_CHANCE, 50); assert.equal(getInscription('gilded').chance, 50);
  const rt = seeded('gd', ['body-spark'], ['gilded']);
  const base = fire(seeded('gd', ['body-spark']), E.body).sparks, seen = new Set();
  const f = rate(4000, () => { const s = fire(rt, E.body).sparks; seen.add(s); return s === base + 2; });
  assert.deepEqual([...seen].sort(), [base, base + 2], 'the card pays its own Sparks, plus 2 on a successful roll');
  assert.ok(Math.abs(f - .5) < .03, `gilded paid ${f}`);
  assert.equal(getInscription('gilded').text, 'Each firing, 50%: +2 Sparks.');
});

test('Meter Mark: each Overfill, 50%: keeps 1 Stored Spark; no count, no badge', () => {
  assert.equal(METER_MARK_CHANCE, 50);
  const rt = seeded('mm', ['meter-mark']);
  const f = rate(4000, () => fire(rt, E.overfill).stored === 1);
  assert.ok(Math.abs(f - .5) < .03, `kept ${f}`);
  assert.equal(rt.cards[0].markCount, undefined);
  assert.equal(faceEffect(makeSkillCard('meter-mark', 'm'), SKILL_CARDS['meter-mark']), '50%: +1 Stored');
  assert.ok(!/1\/2|2nd/.test(SKILL_CARDS['meter-mark'].help));
});

test('Courier: on a Collect, 33%: the card also fires; a Delivery always does; no count', () => {
  assert.equal(COURIER_COLLECT_CHANCE, 33); assert.equal(getInscription('courier').collectChance, 33);
  const rt = seeded('co', ['harvest-common'], ['courier']);
  const f = rate(4000, () => fire(rt, E.body).sparks > 0);
  assert.ok(Math.abs(f - .33) < .03, `fired ${f}`);
  assert.ok(fire(seeded('co', ['harvest-common'], ['courier']), E.delivery).sparks > 0);
  assert.equal(rt.collectCount, undefined);
  assert.equal(getInscription('courier').text, 'Also fires on a Delivery. On a Collect, 33%: also fires.');
});

test('Third Beat: each Timer firing, 33%: its Spark gains count twice (no every-third counter)', () => {
  assert.equal(THIRD_BEAT_CHANCE, 33);
  const cards = ['first-catch', 'metronome', 'spark-chime', 'third-beat'].map((id, i) => makeSkillCard(id, `e${i}`));
  const run = simulateEngineChain(cards, { horizon: 400, events: [{ t: 0, kind: 'collect' }] });
  const gains = [...run.gainsByTurn.entries()].filter(([turn]) => turn > 0), doubled = gains.filter(([, g]) => g === 2).length;
  assert.ok(gains.length > 100 && gains.every(([, g]) => g === 1 || g === 2), `${gains.length} Turns`);
  assert.ok(Math.abs(doubled / gains.length - .33) < .08, `doubled ${doubled} of ${gains.length}`);
  assert.ok(gains.some(([turn, g]) => turn % 3 !== 0 && g === 2), 'not tied to every third Turn');
  const again = simulateEngineChain(cards.map(c => ({ ...c })), { horizon: 400, events: [{ t: 0, kind: 'collect' }] });
  assert.deepEqual([...again.gainsByTurn.entries()], [...run.gainsByTurn.entries()], 'the same Chain replays the same');
  const face = makeSkillCard('third-beat', 't');
  assert.equal(faceTrigger(face, SKILL_CARDS['third-beat']).word, 'Timer');
  assert.equal(faceEffect(face, SKILL_CARDS['third-beat']), '33%: counts twice');
  assert.ok(cardTileLine(face).length <= 22);
});

test('the glossary explains Chance, and no converted line uses a counter or a banned word', () => {
  assert.equal(CARD_TERMS.chance[1], 'A percentage on a card is a roll each time the card would fire. If it fails, nothing happens.');
  for (const id of ['lift-guide', 'meter-mark', 'third-beat']) {
    const card = makeSkillCard(id, 'z'), line = `${faceEffect(card, SKILL_CARDS[id])} ${cardTileLine(card)} ${SKILL_CARDS[id].help}`;
    assert.ok(!/\bTurn\b|every (2nd|3rd)|-\d/.test(line), line);
  }
});

test('real flights: the same seed replays the same Lift Guide flight', () => {
  const a = fly({ ids: ['lift-guide'], seedIndex: 0 }), b = fly({ ids: ['lift-guide'], seedIndex: 0 });
  assert.equal(a.log.slots[0]?.fired || 0, b.log.slots[0]?.fired || 0);
  assert.equal(a.log.slots[0]?.sparks || 0, b.log.slots[0]?.sparks || 0);
});
