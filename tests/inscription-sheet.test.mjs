import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {inscriptionSheetModel, inscriptionSheetMarkup, inscriptionBrand} from '../dist/inscription-ui.mjs';
import {INSCRIPTION_IDS} from '../dist/inscriptions.mjs';

test('sheet model: standalone on an empty slot has name, tag and text but no "With" line', () => {
  const m = inscriptionSheetModel('hollow');
  assert.equal(m.name, 'Hollow'); assert.equal(m.tag, 'Slot'); assert.equal(m.withLine, ''); assert.match(m.text, /\+2 Sparks/);
});
test('sheet model: a mounted card gets "With <card>: ..." from the sentence builder', () => {
  const m = inscriptionSheetModel('gilded', makeSkillCard('body-spark', 'a'), 'Body Spark');
  assert.equal(m.tag, 'Card'); assert.match(m.withLine, /^With Body Spark: each time it fires, 50%: \+2 Sparks$/); assert.equal(m.works, true);
  const idle = inscriptionSheetModel('kindled', makeSkillCard('body-spark', 'b'), 'Body Spark');
  assert.match(idle.withLine, /^With Body Spark: /); assert.equal(idle.works, true);
});
test('sheet model: an idle pairing says so and unknown ids give null', () => {
  const m = inscriptionSheetModel('twin-mark', makeSkillCard('echo', 'c'), 'Echo');
  assert.equal(m.works, false); assert.match(m.withLine, /^With Echo: no effect \(/);
  assert.equal(inscriptionSheetModel('nope'), null); assert.equal(inscriptionSheetMarkup(0, 'nope'), '');
});
test('sheet markup: one Close, dialog frame, no banned words, every Inscription renders', () => {
  for (const id of INSCRIPTION_IDS) {
    const html = inscriptionSheetMarkup(1, id, makeSkillCard('body-spark', 'd'), 'Body Spark');
    assert.equal((html.match(/id="dk2-close"/g) || []).length, 1, id);
    assert.match(html, /role="dialog"/); assert.doesNotMatch(html, /wallet|reserve|\bTurn\b|>-\d/i, id);
  }
});
test('brand button carries the name and opens the sheet (data-ins-slot)', () => {
  const html = inscriptionBrand(2, 'gilded');
  assert.match(html, /data-ins-slot="2"/); assert.match(html, /<span class="dk2-ins-name"[^>]*>Gilded<\/span>/);
});
