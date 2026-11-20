// ?simrun=...&cards=a,b,c mounts exactly those cards in that order (nothing else), unknown ids ignored; &card= still works.
import test from 'node:test';
import assert from 'node:assert/strict';
const R = await import('../dist/sim-replay.mjs');
const ids = q => R.createSimRunState(new URLSearchParams(q)).state.run.mountedCards.filter(Boolean).map(c => c.cardId);
test('parseCardList trims and drops empties', () => assert.deepEqual(R.parseCardList(' a, b,,c '), ['a', 'b', 'c']));
test('cards= mounts exactly the named cards left to right', () => {
  assert.deepEqual(ids('simrun=sb1&stop=3&cards=body-spark,spark-cache,cluster-heart'), ['body-spark', 'spark-cache', 'cluster-heart']);
  assert.deepEqual(ids('simrun=sb1&stop=3&cards=meter-mark,nope,ember-bell'), ['meter-mark', 'ember-bell']);
  const run = R.createSimRunState(new URLSearchParams('simrun=sb1&stop=3&cards=pulse-reader,harvest-common,first-ripple')).state.run;
  assert.deepEqual(run.mountedCards.slice(0, 3).map(c => c.cardId), ['pulse-reader', 'harvest-common', 'first-ripple']);
});
test('card= and the default still work', () => {
  assert.deepEqual(ids('simrun=sb1&stop=3'), ['lift-guide']);
  assert.deepEqual(ids('simrun=sb1&stop=3&card=skim-line'), ['lift-guide', 'skim-line']);
  assert.deepEqual(ids('simrun=sb1&stop=3&card=skim-line&solo=1'), ['skim-line']);
  assert.deepEqual(ids('simrun=sb1&stop=3&cards=nope'), ['lift-guide']);
});
