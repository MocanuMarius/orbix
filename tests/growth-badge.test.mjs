// JOB I part 3: a growth card shows its current value as a badge on the picture, in the uses badge's place and style, on every face size.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardFace, cardGrowthBadge } from '../dist/card-ui.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';
import { faceEffect } from '../dist/card-face-lines.mjs';
import { SKILL_CARDS } from '../dist/skill-cards.mjs';

test('Wind Feather +3%, Growth Ring +3, Growth Seed +5; other cards have none', () => {
  const wf = makeSkillCard('wind-feather', 'a'), gr = makeSkillCard('growth-ring', 'b');
  wf.tally = 3; gr.tally = 3;
  assert.equal(cardGrowthBadge(wf).text, '+3%'); assert.equal(cardGrowthBadge(gr).text, '+3');
  assert.equal(cardGrowthBadge(makeSkillCard('growth-seed', 'c')).text, '+5');
  assert.equal(cardGrowthBadge(makeSkillCard('body-spark', 'd')), null);
  for (const compact of [true, false]) for (const card of [wf, gr]) {
    const html = cardFace(card, { compact });
    assert.match(html, /card-use-counter card-growth-badge/, `compact=${compact}`);
    assert.doesNotMatch(html, /now \+/, 'the "now +N" text moved to the badge');
  }
  assert.equal(faceEffect(wf, SKILL_CARDS['wind-feather']), '+1% speed');
  assert.equal(faceEffect(gr, SKILL_CARDS['growth-ring']), '+1 max Spark');
});
