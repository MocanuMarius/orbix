import test from 'node:test';
import assert from 'node:assert/strict';
import {createPinnedCombo} from '../dist/card-combos.mjs';
import {cardTermTextMarkup,CARD_TERMS} from '../dist/card-terms.mjs';
import {cardFace} from '../dist/card-ui.mjs';
import {makeSkillCard,describeSkillCard} from '../dist/skill-cards.mjs';

test('shared comparison IDs stay exact and reject malformed examples',()=>{
  const ids=['wayfarers-purse','field-impulse','last-light'];
  assert.deepEqual(createPinnedCombo(ids,14).cards.map(c=>c.cardId),ids);
  assert.equal(createPinnedCombo(['body-spark','missing','last-light']),null);
  assert.equal(createPinnedCombo(ids,15),null);
  assert.equal(createPinnedCombo(ids,-1),null);
  assert.equal(createPinnedCombo(ids,1.5),null);
  assert.equal(createPinnedCombo(ids.slice(1)),null);
});

test('nested glossary links distinguish specific pickups and avoid linking their own heading',()=>{
  const html=cardTermTextMarkup('Dusk Spark dims Luminance. Packing efficiency improves Packing into Stored Sparks.');
  for(const key of ['dusk','luminance','packing-efficiency','packing','stored'])assert.match(html,new RegExp(`data-card-term="${key}"`));
  assert.doesNotMatch(html,/data-card-term="spark"/);
  assert.doesNotMatch(cardTermTextMarkup(CARD_TERMS.packing[1],{exclude:['packing']}),/data-card-term="packing"/);
});

test('concise faces retain live values and leave accounting restrictions in actual Help data',()=>{
  const face=cardFace(describeSkillCard({...makeSkillCard('low-wick','live'),charges:2}));
  assert.match(face,/2 of 6 uses remaining/);
  assert.match(face,/Checks before the pickup refills it/);
  const purse=cardFace(describeSkillCard(makeSkillCard('wayfarers-purse','purse')));
  assert.match(purse,/data-card-description="[^"]*This bonus cannot earn packing bonuses/);
  assert.doesNotMatch(purse.match(/<div class="card-rule-band"[\s\S]*$/)[0],/This bonus cannot earn packing bonuses/);
  const devourer=cardFace(describeSkillCard(makeSkillCard('devourer','devourer'))).replace(/<[^>]+>/g,'');
  assert.match(devourer,/Consume the Rare card to the right to restore 1 heart/);
  assert.match(devourer,/Full hearts keep both cards. Cannot be copied or replayed/);
});
