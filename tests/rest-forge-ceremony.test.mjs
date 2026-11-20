import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';
import { cardRestMarkup, cardForgeMarkup, forgeOption, restResultLine } from '../dist/card-ui.mjs';
import { createForgeCeremony, forgeCeremonyPlan, forgeCeremonyLength, forgeCeremonyMarkup } from '../dist/forge-ceremony.mjs';

function rest(ids = []) {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, 'rest-forge', 1, {cards:true,cardSlots:3});
  run.mountedCards = Array.from({ length: 3 }, (_, i) => ids[i] ? makeSkillCard(ids[i], `rest:${i}`) : null);
  run.current = run.map.flat().find(node => node.kind === 'camp');
  run.step = run.current.row;
  run.path = [run.current.id];
  run.phase = 'support';
  return { state, run };
}
const render = run => cardRestMarkup(run, run.current, M.getSupportChoices(run));
const primaries = html => (html.match(/class="primary[ "]/g) || []).length;

const tileOf = (html, id) => html.split('<button').find(part => part.includes('data-rest-service="' + id + '"'))?.split('</button>')[0] || '';
const cardOf = (html, key) => html.split('<div class="rest2-card').find(part => part.includes('data-rest-card="' + key + '"'))?.split('<div class="rest2-act">')[0] || '';

test('Forge is a Stored Sparks tile, ready when Stored Sparks cover a price, and never uses the Rest choice', () => {
  const { run } = rest();
  run.condensedGlow = 200;
  const html = render(run), option = forgeOption(run), tile = tileOf(html, 'forge');
  assert.equal(option.ready, true);
  assert.equal(option.possible, 3);
  assert.match(html, /Spend Stored Sparks/);
  assert.match(tile, /data-action="card-workshop-forge" data-rarity="common"/);
  assert.match(tile, /aria-disabled="false"/);
  assert.match(tile, /Ready/);
  assert.match(tile, /Surprise card/);
  assert.match(tile, /data-ui-icon="rest-forge"/);
  assert.match(tile, new RegExp('<b>' + option.price + '</b>'));
  assert.doesNotMatch(html, /Workshop/, 'no separate Workshop destination on the Rest screen');
});

test('Forge, Improve and Refill are disabled with the reason when Stored Sparks fall short', () => {
  const { run } = rest();
  run.condensedGlow = 0;
  const html = render(run), option = forgeOption(run), tile = tileOf(html, 'forge');
  assert.equal(option.ready, false);
  assert.ok(option.need > 0);
  assert.match(tile, /aria-disabled="true"/);
  assert.match(tile, new RegExp('Needs ' + option.need + ' more'));
  assert.match(tile, /class="rest2-tile is-off"/);
  for (const id of ['improve', 'refill']) assert.match(tileOf(html, id), /aria-disabled="true"/, id);
});

test('every Rest action ends on the same screen: Done in place, the others Not chosen, one Continue', () => {
  for (const key of ['recover', 'slot', 'grow', 'continue']) {
    const { run } = rest(key === 'grow' ? ['growth-seed'] : []);
    run.lives = 1; run.flame = 10;
    const node = run.current, quote = M.getCardCampPreview(run);
    const action = quote.actions.find(a => key === 'continue' ? a.effect?.restContinue : a.key === key);
    assert.ok(action && !action.disabled, key);
    assert.ok(M.resolveSupport(run, action.index), key);
    const html = cardRestMarkup(run, node, []);
    assert.match(html, /<h1 class="rest2-place">/, `${key} place heading`);
    assert.match(html, /<h2 id="rest2-free-t">Rest: (done|skipped)/, `${key} section title`);
    assert.equal((html.match(/class="rest2-go"/g) || []).length, 1, `${key} has exactly one Continue`);
    assert.doesNotMatch(html, /data-action="support"/);
    assert.doesNotMatch(html, /Rest complete/);
    if (key === 'continue') { assert.equal((html.match(/is-done/g) || []).length, 0); assert.equal((html.match(/Not chosen/g) || []).length, 3); continue; }
    assert.equal((html.match(/class="rest2-card is-done"/g) || []).length, 1, `${key} done in place`);
    assert.equal((html.match(/Not chosen/g) || []).length, 2, `${key} others dim`);
    const done = cardOf(html, key);
    if (key === 'recover') assert.match(done, /Hearts <b>1 → 3<\/b>/);
    if (key === 'slot') assert.match(done, /Slots <b>3 → 4<\/b>/);
    if (key === 'grow') assert.match(done, /Max Sparks <b>\d+ → \d+<\/b>/);
  }
});

test('Rest: selecting a card shows Confirm and nothing else changes; options do not use up the Rest choice', () => {
  const { run } = rest();
  run.lives = 1; run.flame = 10; run.condensedGlow = 200;
  const before = JSON.stringify([run.lives, run.flame, run.cardSlots]);
  const html = cardRestMarkup(run, run.current, [], { selected: 'recover' });
  assert.match(html, /data-rest-state="selected"/);
  assert.match(cardOf(html, 'recover'), /aria-pressed="true"/);
  assert.equal((html.match(/card-rest-confirm/g) || []).length > 0, true);
  assert.equal(JSON.stringify([run.lives, run.flame, run.cardSlots]), before, 'selecting spends nothing');
  assert.match(html, /data-action="card-rest-continue"/, 'Continue is enabled before any choice');
  // Forge pays Stored Sparks but leaves the Rest choice open.
  const forged = M.forgeOwnedCard({ run }, 'common');
  assert.ok(forged);
  const after = cardRestMarkup(run, run.current, []);
  assert.match(after, /Rest: choose one/);
  assert.equal((after.match(/class="rest2-card is-ready"/g) || []).length >= 1, true);
});

test('restResultLine reports full vitals honestly and falls back for older saves', () => {
  assert.match(restResultLine('recover', { hearts: [3, 3], meter: [30, 33] }), /Hearts already full · Sparks <b>\d+ → \d+<\/b>/);
  assert.match(restResultLine('recover', null, { heartsRestored: 2, sparksRestored: 4 }), /Hearts <b>\+2<\/b>/);
  assert.match(restResultLine('slot', null), /equipped slot/);
});

test('the Forge result shows the new card whole, one line, no accounting, one way back to Rest', () => {
  const { run } = rest();
  run.condensedGlow = 100;
  const card = makeSkillCard('echo', 'forged:1'), preview = M.getCardForgePreview(run, 'rare');
  const html = cardForgeMarkup(run, preview, { backLabel: 'Rest', lastForged: { instanceId: card.instanceId, name: 'Echo', card, price: 30, rarity: 'rare' } });
  assert.match(html, /<h2>New card<\/h2>/);
  assert.match(html, /Added to your deck\./);
  assert.match(html, /forge2-new/);
  assert.match(html, /Back to Rest/);
  assert.match(html, /Forge another · next \d+/);
  assert.doesNotMatch(html, /−|Banked wallet|\breserve\b|View card/);
  assert.equal(primaries(html), 1);
  // Not affordable: the secondary button is disabled and says what is missing.
  run.condensedGlow = 0;
  const poor = cardForgeMarkup(run, M.getCardForgePreview(run, 'rare'), { backLabel: 'Rest', lastForged: { instanceId: card.instanceId, name: 'Echo', card, price: 30, rarity: 'rare' } });
  assert.match(poor, /forge2-again[^>]*aria-disabled="true"/);
  assert.match(poor, /Needs \d+ more/);
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
