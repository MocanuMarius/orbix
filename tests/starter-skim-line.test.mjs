// Skim Line (2026-11-18): "Skim: +1 Spark", a band hugging the terrain where a Skim counts. Real flights, as for Close Call.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';
import { SKILL_CARDS, makeSkillCard, describeSkillCard, getCardModifiers } from '../dist/skill-cards.mjs';
import { getCardTrigger } from '../dist/card-rule-bands.mjs';
import { triggerDisplay } from '../dist/card-trigger-labels.mjs';
import { faceEffect, faceTrigger } from '../dist/card-face-lines.mjs';

const levels = [0, 8, 16].map(i => BIOME_LEVELS[i]).filter(Boolean);
const flights = (ids, opts = {}) => levels.flatMap(l => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, flare: true, ...opts })));
const logOf = f => f.log.engine.cardEngine?.log || [];
const entries = (fl, k, pred = () => true) => fl.flatMap(f => logOf(f).filter(x => x.k === k && pred(x)));

test('Skim Line face: Skim / +1 Spark, common, copyable, turns Proximity on', () => {
  const def = SKILL_CARDS['skim-line'], card = makeSkillCard('skim-line', 's');
  assert.equal(def.rarity, 'common'); assert.equal(def.copyable, true); assert.equal(def.starterOnly, true);
  assert.equal(triggerDisplay(getCardTrigger(def).id).label, 'Skim');
  assert.equal(faceEffect(card, def), '+1 Spark');
  assert.equal(faceTrigger(card, def).word, 'Skim');
  assert.match(describeSkillCard(card).effect, /Skim: \+1 Spark/);
  const mod = getCardModifiers({ skillSystem: 'cards-v1', mountedCards: [card], reserveCards: [] });
  assert.equal(mod.cardSkimLine, true); assert.equal(mod.cardProximityUnlocked, true);
});

test('Skim Line in real flights: it fires on skims, pays +1 each; Echo twice; a Boost rounds up; nothing without the card', () => {
  const a = flights(['skim-line']);
  const skims = a.reduce((n, f) => n + (f.log.engine.edgingPulse?.triggerCount || 0), 0);
  const gains = entries(a, 'gain', x => x.slot === 0);
  assert.ok(skims >= 2 && gains.length === skims, `${skims} skims, ${gains.length} gains`);
  assert.ok(gains.every(x => x.amount === 1));
  const echoed = flights(['echo', 'skim-line']);
  assert.ok(entries(echoed, 'hit', x => x.slot === 1).every(x => x.times === 2), 'Echo fires it twice');
  const boosted = flights(['skim-line', 'prism-lens']);
  assert.ok(entries(boosted, 'gain', x => x.slot === 0).every(x => x.amount === 2), 'x1.25 rounds up to 2');
  const none = flights(['body-spark']);
  assert.equal(entries(none, 'gain').length, 0);
});

test('Skim Line cue is a few whole-pixel rects and draws only with the card mounted', async () => {
  const { drawSkimLine } = await import('../dist/starter-cues.mjs');
  const calls = []; const c = { save() {}, restore() {}, set globalAlpha(v) {}, set fillStyle(v) {}, fillRect: (...a) => calls.push(a) };
  const e = { mod: { cardSkimLine: true }, player: { x: 100, y: 100, radius: 10 }, distance: 0, time: 1, edgingPulse: { live: true, charge: .5, surface: { x: 100, y: 150, clearance: 30 } } };
  drawSkimLine(c, e, { scale: 2, distance: 0, playerY: 100 });
  assert.ok(calls.length >= 2 && calls.length <= 4);
  assert.ok(calls.flat().every(Number.isInteger), 'whole pixels');
  calls.length = 0; e.mod.cardSkimLine = false; drawSkimLine(c, e, { scale: 2, distance: 0, playerY: 100 });
  assert.equal(calls.length, 0);
});
