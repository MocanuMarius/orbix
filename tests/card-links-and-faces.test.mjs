import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cardFace, cardVictoryRecap} from '../dist/card-ui.mjs';
import {makeSkillCard, describeSkillCard} from '../dist/skill-cards.mjs';
import * as M from '../dist/model.mjs';

// Menu audit 2026-11-18. Owner: linked words look like the sentence with a dotted underline; no box, no colour block, anywhere in text.
const CSS_FILES = fs.readdirSync(new URL('../dist/', import.meta.url)).filter(f => f.endsWith('.css')).concat(fs.readdirSync(new URL('../dist/ui/', import.meta.url)).filter(f => f.endsWith('.css')).map(f => 'ui/' + f));
// Menu lists made of keyword buttons (not words inside a sentence) and the Field Guide plaques keep their button look.
const BUTTON_LISTS = /card-glossary-list|card-glossary-dialog|flight-reward-detail-terms|card-term-symbol|preview-glossary/;
test('linked words inside text carry no background box in any style sheet', () => {
  const offenders = [];
  for (const file of CSS_FILES) {
    const css = fs.readFileSync(new URL('../dist/' + file, import.meta.url), 'utf8').replace(/\/\*[^]*?\*\//g, '');
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim(), body = m[2];
      if (!/(^|[\s>,])(?:button)?\.card-term(?![-\w])|\[data-card-term(?:-key)?(?:=[^\]]*)?\]/.test(selector.replace(/:not\([^)]*\)/g, ''))) continue;
      if (BUTTON_LISTS.test(selector)) continue;
      for (const d of body.split(';')) {
        const [prop, ...rest] = d.split(':'), value = rest.join(':').trim().replace(/\s*!important/, '');
        if (/^(background|background-color)$/.test(prop.trim()) && !/^(none|transparent|inherit|initial|unset)$/.test(value)) offenders.push(`${file}: ${selector.slice(0, 90)} { ${prop.trim()}: ${value} }`);
      }
    }
  }
  assert.deepEqual(offenders, [], 'linked words must not get a background');
});

test('the large card face shows its trigger once, as the first line of the text, and never as a chip over the picture', () => {
  for (const id of ['spark-cache', 'cache-handling', 'harvest-common']) {
    const face = cardFace(describeSkillCard(makeSkillCard(id, 's:' + id)));
    assert.doesNotMatch(face, /card-tbadge/, id + ': no chip over the picture');
    assert.match(face, /card-rule-condition/, id + ': the trigger line is in the text band');
    assert.ok(face.indexOf('card-use-counter') === -1 || face.indexOf('card-use-counter') < face.indexOf('card-rule-band'), id + ': the uses badge sits on the picture, away from the text');
  }
  assert.match(cardFace(makeSkillCard('spark-cache', 's:tile'), {compact: true}), /card-tbadge/, 'a small tile keeps its chip: it has no text band');
});

test('the victory recap leaves out a zero maximum-Sparks line and shows the final Chain as small tiles with the course names', () => {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, 'recap-zero', 1, {cards: true});
  run.mountedCards = ['tight-packing-iii', 'harvest-rare', null, 'wind-feather'].map((id, i) => id ? makeSkillCard(id, 'e:' + i) : null);
  run.slotInscriptions = []; run.finalCardTrophy = describeSkillCard(makeSkillCard('harvest-legendary', 'e:t'));
  const none = cardVictoryRecap(run);
  assert.doesNotMatch(none, /maximum Sparks? permanently/, 'no zero gain line');
  assert.doesNotMatch(none, /\+0 maximum/);
  assert.equal((none.match(/class="recap-tile /g) || []).length, 4, 'three Chain cards and the trophy, at one tile size');
  assert.match(none, new RegExp(run.mapName), 'the course name is on the summary');
  run.cardClearReceipts = [{futureCapacity: 3, mapIndex: 0, nodeId: 'n1'}];
  assert.match(cardVictoryRecap(run), /\+3 maximum Sparks permanently this expedition/, 'a real gain is still reported');
});
