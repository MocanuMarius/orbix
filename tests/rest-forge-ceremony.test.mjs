import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';
import { cardRestMarkup, cardForgeMarkup, forgeOption, restResultLine } from '../dist/card-ui.mjs';
import { createForgeCeremony, forgeCeremonyPlan, forgeCeremonyLength, forgeCeremonyMarkup } from '../dist/forge-ceremony.mjs';

function rest(ids = []) {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, 'rest-forge', 1, { cards: true });
  run.mountedCards = Array.from({ length: 3 }, (_, i) => ids[i] ? makeSkillCard(ids[i], `rest:${i}`) : null);
  run.current = run.map.flat().find(node => node.kind === 'camp');
  run.step = run.current.row;
  run.path = [run.current.id];
  run.phase = 'support';
  return { state, run };
}
const render = run => cardRestMarkup(run, run.current, M.getSupportChoices(run));
const primaries = html => (html.match(/class="primary[ "]/g) || []).length;

test('Forge is a Rest option, ready when Stored Sparks cover a price', () => {
  const { run } = rest();
  run.condensedGlow = 200;
  const html = render(run), option = forgeOption(run);
  assert.equal(option.ready, true);
  assert.equal(option.possible, 3);
  assert.match(html, /class="card-camp-choice rest-opt card-camp-forge forge-ready/);
  assert.match(html, /data-action="card-workshop-forge" data-rarity="common"/);
  assert.match(html, /Ready · 3 possible/);
  assert.match(html, /Surprise card/);
  assert.match(html, /data-ui-icon="rest-forge"/);
  assert.match(html, /Forge uses no Rest action/);
});

test('Forge stays visible and tappable, saying what is needed, when nothing is affordable', () => {
  const { run } = rest();
  run.condensedGlow = 0;
  const html = render(run), option = forgeOption(run), card = html.split('card-camp-forge')[1];
  assert.equal(option.ready, false);
  assert.ok(option.need > 0);
  assert.match(html, /forge-needs/);
  assert.match(card, new RegExp(`Needs ${option.price} Stored Sparks`));
  assert.match(card, /Melt a card for more/);
  assert.doesNotMatch(card.slice(0, card.indexOf('</article>')), /disabled/, 'not a dead end: the Forge screen explains prices and offers Melt');
  assert.match(card, /class="secondary" data-action="card-workshop-forge"/);
});

test('every Rest action ends in a view with a heading, a result line and one primary button', () => {
  for (const key of ['recover', 'slot', 'grow', 'continue']) {
    const { run } = rest(key === 'grow' ? ['growth-seed'] : []);
    run.lives = 1; run.flame = 10;
    const node = run.current, quote = M.getCardCampPreview(run);
    const action = quote.actions.find(a => key === 'continue' ? a.effect?.restContinue : a.key === key);
    assert.ok(action && !action.disabled, key);
    assert.ok(M.resolveSupport(run, action.index), key);
    const html = cardRestMarkup(run, node, []);
    assert.match(html, /<h2>[^<]+<\/h2>/, `${key} heading`);
    assert.match(html, /class="card-camp-result"/, `${key} result line`);
    assert.equal(primaries(html), 1, `${key} has exactly one primary button`);
    assert.doesNotMatch(html, /data-action="support"/);
    if (key === 'recover') assert.match(html, /Hearts <b>1 → 3<\/b>/);
    if (key === 'slot') assert.match(html, /Equipped slots <b>3 → 4<\/b>/);
    if (key === 'grow') assert.match(html, /Max Sparks <b>\d+ → \d+<\/b>/);
    if (key === 'continue') assert.match(html, /Left without resting/);
  }
});

test('restResultLine reports full vitals honestly and falls back for older saves', () => {
  assert.match(restResultLine('recover', { hearts: [3, 3], meter: [30, 33] }), /Hearts already full · Sparks <b>\d+ → \d+<\/b>/);
  assert.match(restResultLine('recover', null, { heartsRestored: 2, sparksRestored: 4 }), /Hearts <b>\+2<\/b>/);
  assert.match(restResultLine('slot', null), /equipped slot/);
});

test('the Forge result view shows the forged card with one primary way back', () => {
  const { run } = rest();
  run.condensedGlow = 100;
  const card = makeSkillCard('echo', 'forged:1'), preview = M.getCardForgePreview(run, 'rare');
  const html = cardForgeMarkup(run, preview, { backLabel: 'Rest', lastForged: { instanceId: card.instanceId, name: 'Echo', card, price: 30, rarity: 'rare' } });
  assert.match(html, /<h2>Forged<\/h2>/);
  assert.match(html, /−30 Stored Sparks/);
  assert.match(html, /Back to Rest/);
  assert.equal(primaries(html), 1);
});

test('ceremony runs gather, strike, reveal, then done in about 1.2 s', () => {
  const timers = [], seen = []; let done = 0;
  const c = createForgeCeremony({ onPhase: p => seen.push(p), onDone: () => done++, setTimer: (fn, ms) => timers.push({ fn, ms }) - 1, clearTimer: () => {} });
  assert.equal(c.phase, 'idle');
  c.start();
  while (timers.length) timers.shift().fn();
  assert.deepEqual(seen, ['gather', 'strike', 'reveal', 'done']);
  assert.equal(done, 1);
  assert.equal(forgeCeremonyLength(false), 1200);
});

test('a tap skips straight to the result, once, at any phase', () => {
  for (const reduced of [false, true]) {
    let done = 0; const timers = [];
    const c = createForgeCeremony({ reduced, onDone: () => done++, setTimer: fn => timers.push(fn) - 1, clearTimer: () => {} });
    c.start(); c.skip(); c.skip();
    assert.equal(c.phase, 'done'); assert.equal(done, 1);
    timers.forEach(fn => fn());
    assert.equal(done, 1, 'a late timer cannot finish it twice');
  }
});

test('reduced motion is a single short cross-fade', () => {
  assert.deepEqual(forgeCeremonyPlan(true).map(([name]) => name), ['fade']);
  assert.ok(forgeCeremonyLength(true) <= 300);
  const seen = []; const timers = [];
  const c = createForgeCeremony({ reduced: true, onPhase: p => seen.push(p), setTimer: fn => timers.push(fn) - 1, clearTimer: () => {} });
  c.start(); while (timers.length) timers.shift()();
  assert.deepEqual(seen, ['fade', 'done']);
  const card = makeSkillCard('echo', 'forged:2');
  assert.match(forgeCeremonyMarkup({ ...card, name: 'Echo' }, { price: 30, reduced: true }), /forge-reduced" data-phase="fade"/);
  assert.match(forgeCeremonyMarkup({ ...card, name: 'Echo' }, { price: 30 }), /data-phase="gather"/);
});
