import test from 'node:test';
import assert from 'node:assert/strict';
import {createPinnedCombo} from '../dist/card-combos.mjs';
import {cardTermTextMarkup,cardTermExampleMarkup,sparkMeterExampleState,CARD_TERMS} from '../dist/card-terms.mjs';
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

test('Spark links follow the action: pickup, meter fuel and boxed savings',()=>{
  const html=cardTermTextMarkup('Your wisp touches a Spark: +2 Sparks. Gain +1 Stored Spark.');
  assert.deepEqual([...html.matchAll(/data-card-term="([^"]+)"/g)].map(match=>match[1]),['wisp','spark','meter','stored']);
  assert.match(cardTermTextMarkup('Touch 3 Sparks'),/data-card-term="spark"/);
  assert.match(cardTermTextMarkup('Drain up to 3 Sparks'),/data-card-term="meter"/);
  assert.match(cardTermTextMarkup('Spark Meter'),/data-card-term="meter"/);
  const uses=cardTermTextMarkup('2 remaining uses');
  assert.match(uses,/data-card-term="uses"[^>]*>Uses<\/button>/);
  assert.doesNotMatch(uses,/data-card-term="shared"/);
  assert.match(cardTermTextMarkup('Share its uses'),/data-card-term="shared"/);
});

test('Spark pickup help keeps the selected card rank and meter consequence',()=>{
  const card={...makeSkillCard('body-spark','ranked-help'),rank:3};
  const before=structuredClone(card),html=cardTermExampleMarkup('spark',{card});
  assert.match(html,/This card · Body Spark · rank 3/);
  assert.match(html,/card-term-action-condition">Your wisp touches a Spark/);
  assert.match(html,/card-term-action-effect">\+4 /);
  assert.match(html,/data-card-term="meter"/);
  assert.deepEqual(card,before);
});

test('meter help uses paused flight values and distinguishes its next Lift cost from segment size',()=>{
  const context={snapshot:{flame:40,maxFlame:150,paidFlapCost:10,flapCost:20/3}};
  const before=structuredClone(context),state=sparkMeterExampleState(context),html=cardTermExampleMarkup('meter',context);
  assert.deepEqual([state.label,state.value,state.max,state.lift,state.after],['Current flight','12','45','2','10']);
  assert.equal(state.units.unitCost,3);
  assert.match(html,/role="meter"[^>]*aria-valuemax="45"[^>]*aria-valuenow="12"/);
  assert.match(html,/One Lift: 12 → 10 Sparks/);
  assert.match(cardTermExampleMarkup('meter'),/Base example/);
  assert.deepEqual(context,before);
});

test('concise faces retain live values and leave accounting restrictions in actual Help data',()=>{
  const face=cardFace(describeSkillCard({...makeSkillCard('low-wick','live'),charges:2}));
  assert.match(face,/2 of 6 uses remaining/);
  // Fine print is not on the face (v3 two-line faces); it is in the Help data.
  assert.match(face,/data-card-description="[^"]*Checks before the pickup refills it/);
  assert.doesNotMatch(face.match(/<div class="card-rule-band"[\s\S]*$/)[0],/Checks before the pickup refills it/);
  const purse=cardFace(describeSkillCard(makeSkillCard('wayfarers-purse','purse')));
  assert.match(purse,/data-card-description="[^"]*This bonus cannot earn packing bonuses/);
  assert.doesNotMatch(purse.match(/<div class="card-rule-band"[\s\S]*$/)[0],/This bonus cannot earn packing bonuses/);
  // Approved plain wording (v1.0-cardtext): the face says what; the fine print stays in Help.
  const devourerFace=cardFace(describeSkillCard(makeSkillCard('devourer','devourer'))),devourer=devourerFace.replace(/<[^>]+>/g,'');
  assert.match(devourer,/Eats a Rare: \+1 heart/);
  assert.match(devourerFace,/data-card-description="[^"]*Full hearts keep both cards/);
});
