// Lift Guide (2026-11-18): "Lift on the cue: +1 Spark", with the arrow always shown. Chain arithmetic for the event 'guide-lift'.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS, CARD_ROW_EVENTS, makeSkillCard, createCardExecution, resolveCardRow, describeSkillCard, getCardRowRule} from '../dist/skill-cards.mjs';
import {getCardTrigger, getCardRuleBands, cardRuleSentence} from '../dist/card-rule-bands.mjs';
import {triggerDisplay} from '../dist/card-trigger-labels.mjs';

const row = list => list.map((id, i) => id ? makeSkillCard(id, `g${i}`) : null);
const fire = (list, inscriptions, kind = CARD_ROW_EVENTS.guideLift) => {
  const cards = row(list);
  return resolveCardRow(createCardExecution(inscriptions ? {cards, inscriptions: inscriptions.map(id => id ? {id} : null)} : cards), {kind, meterFraction: .5});
};

test('Lift Guide reads "Lift on the cue: +1 Spark" and shows as a Lift Trigger', () => {
  const def = SKILL_CARDS['lift-guide'], card = describeSkillCard(makeSkillCard('lift-guide', 'g'));
  assert.equal(getCardRowRule(def, card).event, 'guide-lift');
  assert.equal(triggerDisplay(getCardTrigger(def).id).label, 'Lift');
  assert.match(cardRuleSentence(getCardRuleBands(card, def)), /^Lift on the cue: \+1 Spark/);
});

test('Lift Guide: one Spark per on-beat Lift, nothing on other Lifts', () => {
  assert.equal(fire(['lift-guide']).sparks, 1);
  assert.equal(fire(['lift-guide'], null, CARD_ROW_EVENTS.lift).sparks, 0);
  assert.equal(fire(['lift-guide'], null, CARD_ROW_EVENTS.plainLift).sparks, 0);
});

test('Lift Guide combos: Echo, Boost, Glide Prism, Gilded, Twin Mark', () => {
  assert.equal(fire(['echo', 'lift-guide']).sparks, 2, 'Echo fires it twice');
  assert.equal(fire(['lift-guide', 'prism-lens']).sparks, 2, 'a x1.25 Boost rounds up: 1.25 Sparks, shown whole');
  assert.equal(fire(['lift-guide', 'glide-prism']).sparks, 2, 'Glide Prism doubles it');
  assert.equal(fire(['lift-guide'], ['gilded']).sparks, 3, 'Gilded adds 2');
  assert.equal(fire(['lift-guide'], ['twin-mark']).sparks, 2, 'Twin Mark fires it twice');
  assert.ok(fire(['echo', 'lift-guide', 'glide-prism'], ['gilded']).sparks < 20, 'bounded');
});
