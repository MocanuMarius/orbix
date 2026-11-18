import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_CARDS, makeSkillCard, createCardExecution, resolveCardRow, describeSkillCard } from '../dist/skill-cards.mjs';
import { DISPLAY_GROUPS } from '../dist/card-trigger-labels.mjs';
import { CARD_ROW_EVENTS } from '../dist/skill-cards.mjs';

const row = ids => createCardExecution(ids.map((id, i) => makeSkillCard(id, `t:${i}`)));

test('seven player Triggers: Save is gone', () => {
  assert.deepEqual(DISPLAY_GROUPS.filter(g => g.kind === 'trigger').map(g => g.label), ['Collect', 'Lift', 'Pulse', 'Delivery', 'Overfill', 'Finish', 'Skim']);
});

test('Home Beacon adds 3 Stored per heart left on Finish, spends a use, and Boosts never multiply it', () => {
  for (const hearts of [1, 2, 3]) {
    const rt = row(['home-beacon', 'crescendo']), r = resolveCardRow(rt, { kind: CARD_ROW_EVENTS.clear, heartsLeft: hearts });
    assert.equal(r.stored, 3 * hearts); assert.equal(rt.cards[0].charges, 2);
  }
  const none = resolveCardRow(row(['home-beacon']), { kind: CARD_ROW_EVENTS.body, heartsLeft: 3 });
  assert.equal(none.stored, 0, 'only a Finish');
  assert.equal(resolveCardRow(row(['home-beacon']), { kind: CARD_ROW_EVENTS.guard, heartsLeft: 3 }).stored, 0, 'a stopped crash is not a Trigger');
  const face = describeSkillCard(makeSkillCard('home-beacon', 'x'));
  assert.equal(face.trigger.label, 'Finish');
});

test('Last Light doubles Spark rewards on the last heart only, never Stored Sparks or permanent gains', () => {
  const plain = resolveCardRow(row(['body-spark', 'last-light']), { kind: CARD_ROW_EVENTS.body, heartsLeft: 1, lastHeart: false });
  const last = resolveCardRow(row(['body-spark', 'last-light']), { kind: CARD_ROW_EVENTS.body, heartsLeft: 1, lastHeart: true });
  assert.equal(last.sparks, 2 * plain.sparks); assert.ok(plain.sparks > 0);
  assert.equal(last.cards[0].effective.sparks, 2 * plain.cards[0].effective.sparks);
  const without = resolveCardRow(row(['body-spark']), { kind: CARD_ROW_EVENTS.body, lastHeart: true });
  assert.equal(without.sparks, plain.sparks, 'no Last Light, no doubling');
  const clear = resolveCardRow(row(['home-beacon', 'growth-ring', 'last-light']), { kind: CARD_ROW_EVENTS.clear, heartsLeft: 1, lastHeart: true });
  assert.equal(clear.stored, 3); assert.equal(clear.futureCapacity, 1);
  assert.equal(SKILL_CARDS['last-light'].trigger, 'always-on');
});

test('Mending Moss is retired', () => assert.equal(SKILL_CARDS['mending-moss'].retired, true));
