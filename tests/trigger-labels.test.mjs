// Trigger labels: players see 9 Triggers and 3 roles (dist/card-trigger-labels.mjs); the engine keeps its 25 internal keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARD_CATALOG} from '../dist/card-catalog.mjs';
import {SKILL_CARDS, makeSkillCard} from '../dist/skill-cards.mjs';
import {getCardTrigger, getCardRuleBands} from '../dist/card-rule-bands.mjs';
import {DISPLAY_GROUPS, NO_CHIP_IDS, triggerDisplay} from '../dist/card-trigger-labels.mjs';
import {cardFace} from '../dist/card-ui.mjs';
import {TRIGGER_BOOK} from '../dist/ui/chain-model.mjs';
import {CARD_TERMS} from '../dist/card-terms.mjs';

const TRIGGERS = ['Collect', 'Lift', 'Pulse', 'Flash', 'Delivery', 'Overfill', 'Save', 'Finish', 'Skim'], ROLES = ['Passive', 'Boost', 'Repeat'];
const TEMPORARY = ['On gain']; // engine-gain: reworked later, keeps its present label
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&middot;|&amp;/g, ' ').replace(/\s+/g, ' ');

test('the display layer has 9 Triggers and 3 roles', () => {
  assert.deepEqual(DISPLAY_GROUPS.filter(g => g.kind === 'trigger').map(g => g.label), TRIGGERS);
  assert.deepEqual(DISPLAY_GROUPS.filter(g => g.kind === 'role').map(g => g.label), ROLES);
  assert.deepEqual(TRIGGER_BOOK.map(t => t.label), [...TRIGGERS, ...ROLES], 'the Triggers tab lists the 9 + 3');
  for (const g of TRIGGER_BOOK) assert.ok(CARD_TERMS[g.term], `${g.label}: glossary entry`);
});

test('every card maps to a Trigger, a role or no chip, and no old label is on any face', () => {
  const old = [/Always on/i, /Falling Lift/, /(?<!When a )Flash ends/, /Each Turn/, /\bLatch\b/, /Card Pulse/, /Low Lift/, /Any Trigger/];
  const oldHeads = ['Always on', 'Falling Lift', 'Flash ends', 'Each Turn', 'Wave', 'Next', 'Any', 'Next card', 'Any Trigger', 'Clear', 'Rhythm', 'Pack', 'Take-off'];
  for (const def of Object.values(SKILL_CARDS)) {
    const card = makeSkillCard(def.id, 'tl'), chip = getCardTrigger(card, def);
    if (!chip.label) assert.ok(NO_CHIP_IDS.includes(chip.id) || !def.trigger, `${def.id}: no chip only for the timing cards`);
    else assert.ok([...TRIGGERS, ...ROLES, ...TEMPORARY].includes(chip.label), `${def.id}: chip ${chip.label}`);
    assert.ok(!oldHeads.includes(chip.label), def.id);
    for (const band of getCardRuleBands(card, def).filter(b => b.type === 'condition')) assert.ok(!oldHeads.includes(band.text.split(' · ')[0]), `${def.id}: ${band.text}`);
    for (const compact of [false, true]) { const face = text(cardFace(card, {compact})); for (const re of old) assert.doesNotMatch(face, re, `${def.id}: ${re}`); }
  }
  for (const id of ['rest', 'take-off', 'engine-any', 'timers', 'engine-turn']) assert.equal(triggerDisplay(id).label, '');
});

test('behaviour is unchanged: every card keeps its internal trigger key', () => {
  const was = JSON.parse(fs.readFileSync(new URL('./fixtures/card-trigger-keys.json', import.meta.url), 'utf8')); // snapshot of git HEAD before the label change
  const now = Object.fromEntries(Object.values(CARD_CATALOG).map(c => [c.id, c.trigger ?? null]));
  assert.deepEqual(now, was);
});
