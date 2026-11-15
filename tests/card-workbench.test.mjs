import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCardInspectorState, prepareCardInspectorReward } from '../dist/card-inspector.mjs';
import { cardsBenchMarkup, cardRewardMarkup, cardReplacementMarkup, cardFace, cardMechanicMarkup } from '../dist/card-ui.mjs';
import { moveMountedCard, improveMountedCard, meltMountedCard, chooseCardReward, getMountedCards, getSupportChoices } from '../dist/model.mjs';
import { makeSkillCard, describeSkillCard } from '../dist/skill-cards.mjs';
import { glowGaugeMarkup } from '../dist/glow-ui.mjs';

test('the direct sample works on real card actions and never touches either player save', () => {
  const app = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  // The factory is selected before loadState; all persistence exits in mock mode.
  assert.match(app, /if\(cardInspector\)state=createCardInspectorState/);
  assert.match(app, /mockMode=[^;]*\|\|cardInspector/);
  assert.match(app, /function persist\(\)\{if\(mockMode\)return/);
  assert.match(app, /if\(cardInspector\)\{const scenario=/);
  assert.match(readFileSync(new URL('../dist/cards.html', import.meta.url), 'utf8'), /cards-launcher\.mjs/);
  assert.match(readFileSync(new URL('../dist/cards-launcher.mjs', import.meta.url), 'utf8'), /query\.get\('mock'\)\s*===\s*'cards'/);
  const sample = createCardInspectorState(), initial = structuredClone(sample.run.mountedCards);
  assert.ok(moveMountedCard(sample.run, 0, 1));
  assert.ok(improveMountedCard(sample, 0, 1));
  assert.equal(sample.run.mountedCards[0].charges, 4);
  assert.ok(chooseCardReward(sample, 'equip', 2));
  const once = sample.run.condensedGlow;
  assert.equal(chooseCardReward(sample, 'equip', 2), false);
  assert.equal(sample.run.condensedGlow, once);
  assert.ok(meltMountedCard(sample, 0));
  const reset = createCardInspectorState();
  assert.deepEqual(reset.run.mountedCards, initial);
  assert.equal(reset.run.condensedGlow, 90);
  prepareCardInspectorReward(sample.run);
  assert.ok(sample.run.cardReward.card.instanceId);
  assert.equal(new Set(sample.run.mountedCards.filter(Boolean).map(c=>c.instanceId)).size, sample.run.mountedCards.filter(Boolean).length);
});

test('workbench previews meaningful order changes without spending a use', () => {
  const sample = createCardInspectorState(), before = JSON.stringify(sample);
  const preview = cardsBenchMarkup(sample, { selected: 0, previewDirection: 1 });
  assert.match(preview, /20 → 16/);
  assert.match(preview, /No activation to repeat/);
  assert.match(preview, /card-cancel-move/);
  assert.equal(JSON.stringify(sample), before);
  const singleRank = cardsBenchMarkup(sample, { selected: 0 });
  assert.doesNotMatch(singleRank, /Fully improved|card-preview-improve/);
  assert.match(cardsBenchMarkup(sample, { selected: 1 }), /Improve · 15/);
  const reward = cardRewardMarkup(sample.run, { replaceIndex: 1 });
  assert.match(reward, /card-preview-replace/);
  assert.match(reward, /Melt incoming/);
  assert.match(cardReplacementMarkup(sample.run, 1), /Back to compare/);
});

test('disposable Rest and starter inspection use the actual production model', () => {
  const rest = createCardInspectorState(new URLSearchParams('scenario=rest'));
  assert.equal(rest.run.phase, 'support');
  assert.ok(getSupportChoices(rest.run).some(c=>c.effect.cardForge));
  const starter = createCardInspectorState(new URLSearchParams('scenario=starter'));
  assert.ok(getMountedCards(starter.run).every(c=>!c));
  assert.equal(starter.run.cardReward, undefined);
});

test('only a card-pilot meter has two quiet overfill ticks', () => {
  const sample=createCardInspectorState();
  assert.match(glowGaugeMarkup(sample.run), /spark-overfill-ticks/);
  delete sample.run.skillSystem;
  assert.doesNotMatch(glowGaugeMarkup(sample.run), /spark-overfill-ticks/);
});


test('portrait faces keep artwork pure while short symbol-led mechanics remain accessible', () => {
  const body = describeSkillCard(makeSkillCard('spark-cache', 'portrait:body'));
  assert.match(cardFace(body), /viewBox="0 0 120 180"/);
  assert.doesNotMatch(cardFace(body), /card-effect/);
  const mechanics = cardMechanicMarkup(body, { details: true });
  assert.match(mechanics, /Direct pickup/);
  assert.match(mechanics, /aria-label="Spark Meter"/);
  assert.match(mechanics, /<b>6<\/b> uses/);
  assert.match(mechanics, /<summary>Details<\/summary>/);
  const swipe = cardMechanicMarkup(describeSkillCard(makeSkillCard('field-impulse', 'portrait:swipe')));
  const echo = cardMechanicMarkup(describeSkillCard(makeSkillCard('echo', 'portrait:echo')));
  assert.match(swipe, /aria-label="Swipe up, down or right"/);
  assert.doesNotMatch(swipe, /aria-label="Automatic"/);
  assert.match(echo, /Repeat next card/);
  assert.match(echo, /aria-label="Automatic"/);
});
