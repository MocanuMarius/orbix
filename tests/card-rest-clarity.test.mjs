import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';
import { cardRestMarkup } from '../dist/card-ui.mjs';
import { getGlowCapacity, formatGlow } from '../dist/vitality.mjs';

function rest(ids = []) {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, 'rest-clarity', 1, { cards: true });
  run.mountedCards = Array.from({ length: 3 }, (_, i) => ids[i] ? makeSkillCard(ids[i], `rest:${i}`) : null);
  run.current = run.map.flat().find(node => node.kind === 'camp');
  run.step = run.current.row;
  run.path = [run.current.id];
  run.phase = 'support';
  return { state, run };
}
const render = run => cardRestMarkup(run, run.current, M.getSupportChoices(run));

test('Rest quote leaves a fresh arrival untouched and uses the live Second Ember charge', () => {
  const { run } = rest(['camp-kit']);
  run.flame = 20;
  const before = structuredClone(run), initial = M.getCardCampPreview(run);
  assert.deepEqual(run, before);
  assert.equal(initial.remaining, 2);
  assert.match(render(run), /Choose up to two different actions/);
  const source = run.mountedCards[0];
  run.mountedCards[0] = null;
  run.reserveCards.push(source);
  assert.equal(M.getCardCampPreview(run).remaining, 2);
  assert.match(render(run), /Choose up to two/);
  source.charges = 0;
  assert.equal(M.getCardCampPreview(run).remaining, 1);
});

test('Rest previews match real Recover, Add slot and amplified Grow commits', () => {
  for (const [ids, key] of [[['camp-kit'], 'recover'], [[], 'slot'], [['echo-iii', 'growth-seed'], 'grow']]) {
    const { run } = rest(ids);
    run.lives = 1;
    run.flame = 20;
    const quote = M.getCardCampPreview(run), action = quote.actions.find(choice => choice.key === key);
    assert.equal(action.disabled, false);
    const markup = render(run);
    if (key === 'grow') {
      const increment = formatGlow(action.after.maxMeter - action.before.maxMeter);
      assert.ok(markup.includes(`Max Sparks <b>${formatGlow(action.before.maxMeter)} → ${formatGlow(action.after.maxMeter)}</b>`));
      assert.notEqual(increment, '3', 'copied Growth must use its computed amount');
    }
    assert.ok(M.resolveSupport(run, action.index));
    assert.equal(run.lives, action.after.hearts);
    assert.equal(run.flame, action.after.meter);
    assert.equal(run.cardSlots, action.after.slots);
    assert.equal(getGlowCapacity(run), action.after.maxMeter);
    if (key === 'recover') {
      const remaining = M.getCardCampPreview(run);
      assert.equal(remaining.remaining, 1);
      assert.equal(remaining.actions.find(choice => choice.key === key).taken, true);
      assert.match(render(run), /Choose one more/);
      assert.ok(M.resolveSupport(run, remaining.actions.find(choice => choice.effect?.restContinue).index));
      assert.equal(run.mountedCards[0].charges, 1, 'leaving preserves the unused extra action');
    }
  }
});

test('full vitals and unavailable upgrades explain their limits and keep Leave reachable', () => {
  const { run } = rest();
  run.flame = getGlowCapacity(run);
  run.cardSlots = 5;
  run.mountedCards.push(null, null);
  const quote = M.getCardCampPreview(run);
  assert.ok(quote.actions.filter(choice => choice.key).every(choice => choice.disabled));
  const html = render(run);
  assert.match(html, /No actions available/);
  assert.match(html, /Hearts and meter full/);
  assert.match(html, /All 5 slots unlocked/);
  assert.match(html, /Find a Growth Seed to Grow/);
  assert.match(html, /Leave Rest/);
  assert.ok(M.resolveSupport(run, quote.actions.find(choice => choice.effect?.restContinue).index));
  assert.equal(run.phase, 'map');
});
