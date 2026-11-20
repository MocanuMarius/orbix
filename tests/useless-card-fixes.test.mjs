// "No useless cards" pass (2026-11-20): cards that silently needed another card now bring it, and the help says what each card needs.
// Real flights, pilot as in the app. Table of every released card: outputs/balance/useless-cards.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, sum, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';
import { SKILL_CARDS, makeSkillCard, getCardModifiers } from '../dist/skill-cards.mjs';

const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
const flights = ids => levels.flatMap(l => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, engineOptions: { cardPilot: true } })));
const mods = id => getCardModifiers({ skillSystem: 'cards-v1', mountedCards: [makeSkillCard(id, 'm')], reserveCards: [] });

test('Close Call, Toll Bell and Pacesetter bring the enabler they used to need (Proximity, Rhythm)', () => {
  assert.equal(mods('close-call').cardProximityUnlocked, true);
  assert.equal(mods('toll-bell').cardRhythm, true);
  assert.equal(mods('pacesetter').cardRhythm, true);
  assert.equal(mods('body-spark').cardRhythm, false);
});

test('Toll Bell and Pacesetter work alone in a real flight (no Rhythm card)', () => {
  const bell = flights(['toll-bell']), pace = flights(['pacesetter']);
  assert.ok(sum(bell, f => f.log.slots[0]?.fired || 0) >= 1, 'Toll Bell fires on a Rhythm beat by itself');
  assert.ok(sum(bell, f => f.log.slots[0]?.sparks || 0) >= 2, 'and pays +2 Sparks each time');
  assert.ok(sum(pace, f => f.log.slots[0]?.fired || 0) >= 1, 'Pacesetter fires by itself');
});

test('Cards that make a Pulse or need a Flare say what they need in their help', () => {
  const says = (id, re) => assert.match(SKILL_CARDS[id].help || '', re, id);
  says('low-ember', /Pulse card/); says('first-catch', /Pulse card/); says('ember-bell', /Pulse cards/);
  says('spark-chime', /Pulse maker/); says('clear-prism', /Flare Handling/);
  says('toll-bell', /needs no Rhythm card/); says('pacesetter', /needs no Rhythm card/);
});
