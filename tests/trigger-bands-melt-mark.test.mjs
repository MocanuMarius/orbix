// Work orders 14 and 15: the melt mark on a card instance, and the trigger colour band on card faces.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSkillCard, cleanCardRun, describeSkillCard} from '../dist/skill-cards.mjs';
import {createCardInspectorState} from '../dist/card-inspector.mjs';
import {bandOf, BAND_COLOURS, bandMarkup} from '../dist/trigger-bands.mjs';
import {toggleMeltMark, isMeltMarked, meltMarkedIds, meltMarkBadge} from '../dist/melt-mark.mjs';
import {cardFace} from '../dist/card-ui.mjs';

const band = id => bandOf(makeSkillCard(id, 't')).id;

test('each trigger has its own colour; roles share the neutral one', () => {
  assert.equal(band('body-spark'), 'collect');
  assert.equal(band('lift-guide'), 'lift');
  assert.equal(band('pulse-reader'), 'pulse');
  assert.equal(band('courier-cord'), 'delivery');
  assert.equal(band('ember-bell'), 'overfill');
  assert.equal(band('home-beacon'), 'finish');
  assert.equal(band('skim-line'), 'skim');
  assert.equal(band('slow-wick'), 'timer');
  assert.equal(band('metronome'), 'timer');
  assert.equal(band('deep-vessel'), 'neutral');   // Passive
  assert.equal(band('prism-lens'), 'neutral');    // Boost
  assert.equal(band('echo'), 'neutral');          // Repeat
  const colours = Object.values(BAND_COLOURS);
  assert.equal(new Set(colours).size, colours.length, 'no two bands share a colour');
  assert.ok(colours.every(c => /^#[0-9a-f]{6}$/i.test(c)));
});

test('the face carries the band and it does not replace the name or the badge', () => {
  const html = cardFace(describeSkillCard(makeSkillCard('skim-line', 'x')), {compact: true});
  assert.match(html, /class="card-band" data-band="skim"/);
  assert.match(html, new RegExp(`--band:${BAND_COLOURS.skim}`));
  assert.match(html, /<h3>Skim Line<\/h3>/);
  assert.match(html, /card-tbadge/);
  assert.match(bandMarkup(makeSkillCard('body-spark', 'y'), 'dk-band'), /class="dk-band" data-band="collect"/);
});

test('melt mark: toggles on and off, only on cards in the run, never changes numbers', () => {
  const run = createCardInspectorState(new URLSearchParams('')).run;
  const card = [...run.mountedCards, ...run.reserveCards].find(Boolean);
  const before = JSON.stringify({...card});
  assert.equal(isMeltMarked(card), false);
  assert.equal(toggleMeltMark(run, card.instanceId), true);
  assert.equal(card.meltMark, true);
  assert.deepEqual(meltMarkedIds(run), [card.instanceId]);
  assert.match(meltMarkBadge(card), /Marked to melt/);
  assert.equal(toggleMeltMark(run, card.instanceId), false);
  assert.equal('meltMark' in card, false, 'a cleared mark leaves no field behind');
  assert.equal(JSON.stringify({...card}), before);
  assert.equal(meltMarkBadge(card), '');
  assert.equal(toggleMeltMark(run, 'nobody'), null);
});

test('melt mark survives the save clean-up and old saves without it load unchanged', () => {
  const run = createCardInspectorState(new URLSearchParams('')).run;
  const card = run.reserveCards.find(Boolean) || run.mountedCards.find(Boolean);
  toggleMeltMark(run, card.instanceId);
  const loaded = JSON.parse(JSON.stringify(run));
  cleanCardRun(loaded);
  const kept = [...loaded.mountedCards, ...loaded.reserveCards].find(c => c?.instanceId === card.instanceId);
  assert.equal(kept.meltMark, true);
  // An old save has no mark: clean-up must not add one.
  const old = JSON.parse(JSON.stringify(createCardInspectorState(new URLSearchParams('')).run));
  cleanCardRun(old);
  assert.ok([...old.mountedCards, ...old.reserveCards].filter(Boolean).every(c => !('meltMark' in c)));
  // A malformed mark is dropped.
  loaded.reserveCards.forEach(c => {if (c) c.meltMark = 'yes';});
  loaded.mountedCards.forEach(c => {if (c) c.meltMark = 1;});
  cleanCardRun(loaded);
  assert.ok([...loaded.mountedCards, ...loaded.reserveCards].filter(Boolean).every(c => !('meltMark' in c)));
});
