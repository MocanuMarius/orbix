// Card face v3 (2026-11-18): two short lines, never scrolls. Line 1 = Trigger icon + one word; line 2 = the effect.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SKILL_CARDS, makeSkillCard, describeSkillCard} from '../dist/skill-cards.mjs';
import {cardFace} from '../dist/card-ui.mjs';
import {faceTrigger, faceEffect} from '../dist/card-face-lines.mjs';

const WORDS = new Set(['Collect', 'Lift', 'Pulse', 'Delivery', 'Overfill', 'Save', 'Finish', 'Skim', 'Passive', 'Boost', 'Repeat', 'Start', 'Rest', 'Flare', 'Turn', 'Timer']);
const plain = html => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const FINE_PRINT = /\bup to\b|never above|per journey|\bmax(?:imum)?\b(?! Sparks?| Spark\b)|\bshares?\b|cannot|only (?:the )?first/i;

test('every card face is a one-word Trigger line and a short effect line, with no fine print', () => {
  for (const def of Object.values(SKILL_CARDS)) for (const rank of new Set([1, def.maxRank || 1])) {
    const card = describeSkillCard({...makeSkillCard(def.id, `face:${def.id}`), rank});
    const trigger = faceTrigger(card, def), effect = faceEffect(card, def);
    assert.ok(WORDS.has(trigger.word), `${def.id}: trigger word "${trigger.word}"`);
    assert.doesNotMatch(trigger.word, /\s/, `${def.id}: one word`);
    assert.ok(effect.length >= 3 && effect.length <= 34, `${def.id}: effect line "${effect}" (${effect.length} chars)`);
    assert.doesNotMatch(effect, FINE_PRINT, `${def.id}: fine print on the face: "${effect}"`);
    assert.doesNotMatch(effect, /\{\w+\}/, `${def.id}: unresolved token`);
    const html = cardFace(card);
    assert.deepEqual([...html.matchAll(/data-rule-type="([^"]+)"/g)].map(match => match[1]), ['condition', 'effect'], `${def.id}: exactly two rule lines`);
    assert.equal((plain(html.match(/<span class="card-rule-condition|<span class="card-rule-stripe card-rule-condition[\s\S]*?<\/span><\/span>/)?.[0] || '').match(/\S+/g) || []).length, 1, `${def.id}: line 1 is one word`);
    assert.match(html, /<i class="card-trigger-icon"[^>]*><svg/, `${def.id}: trigger icon`);
    assert.doesNotMatch(html, /scroll for all details|tabindex="0" aria-label="Rules/, `${def.id}: the rules band is not a scroll region`);
  }
});

test('the trigger appears once, as a linked word, and Start, Rest and Lift Guide use the approved words', () => {
  const html = cardFace(describeSkillCard(makeSkillCard('spark-cache', 'x')));
  assert.equal((html.match(/data-card-term="collect"/g) || []).length, 1);
  assert.equal(faceTrigger(makeSkillCard('black-hole', 'x'), SKILL_CARDS['black-hole']).word, 'Start');
  assert.equal(faceTrigger(makeSkillCard('growth-seed', 'x'), SKILL_CARDS['growth-seed']).word, 'Rest');
  assert.equal(faceEffect(makeSkillCard('growth-seed', 'x'), SKILL_CARDS['growth-seed']), '+5 max Sparks');
  const guide = makeSkillCard('lift-guide', 'x');
  assert.equal(faceTrigger(guide, SKILL_CARDS['lift-guide']).word, 'Lift');
  assert.equal(faceEffect(guide, SKILL_CARDS['lift-guide']), '+1 Spark on the cue');
  // Caps and limits live only in the help window's data.
  const seed = cardFace(describeSkillCard(makeSkillCard('growth-seed', 'x')));
  assert.match(seed, /data-card-description="[^"]*3 Grows per journey/);
  assert.doesNotMatch(plain(seed.match(/<div class="card-rule-band"[\s\S]*$/)[0]), /Grows per journey/);
});

test('no stylesheet makes a card face scroll', () => {
  const ui = fs.readFileSync(new URL('../dist/card-ui.css', import.meta.url), 'utf8');
  const ceremony = fs.readFileSync(new URL('../dist/flight-reward-ceremony.css', import.meta.url), 'utf8');
  assert.doesNotMatch(ceremony, /card-rule-band\{[^}]*overflow-y:auto/);
  const last = ui.lastIndexOf('.card-rule-band{overflow:hidden!important');
  assert.ok(last > ui.lastIndexOf('overflow-y:auto'), 'the final rule hides overflow on every rules band');
});
