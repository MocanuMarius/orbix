// JOB E (2026-11-18): event and chest stops in the house style, and a content audit: every event and chest outcome of a card run speaks in current game words.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {stopTile, tileLine, eventStopMarkup, chestStopMarkup, outcomeIcon} from '../dist/stop-screen.mjs';
import {chestChoiceLine} from '../dist/treasure.mjs';

const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const RETIRED = /\bskills?\b|\brelics?\b|artifact|wallet|reserve|\battempts?\b|Save trigger|temporary Inscription|Learn /i;

function runAt(seed, map = 0) {
  const state = M.newState(); state.profile.tutorialComplete = true; state.run = M.createRun(state.profile, seed, 1, {cards: true});
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id)); state.run.mapIndex = map;
  return state;
}

test('selecting a chest opens its one choice: Stored Sparks or a surprise card, with no retired find', () => {
  const state = runAt('stop-chest'), run = state.run, stop = run.map.flat().find(n => n.kind === 'treasure' && !n.practiceLoan);
  const pred = run.map[stop.row - 1].find(n => n.nextIds.includes(stop.id)); run.step = stop.row; run.path = [pred.id];
  assert.ok(M.selectNode(run, stop.id));
  assert.equal(run.pendingChest.sparks, 20);
  const html = chestStopMarkup(run, {node: stop}), t = text(html);
  assert.equal((html.match(/data-tap-pick /g) || []).length, 2);
  assert.equal((html.match(/data-action="chest-choice"/g) || []).length, 2);
  assert.match(t, /\+20 Stored Sparks/); assert.match(t, /A surprise card/); assert.doesNotMatch(t, RETIRED);
  assert.match(stop.rewardPreview, new RegExp(chestChoiceLine(0).replace(/[+]/g, '[+]')));
  assert.ok(M.chooseChestReward(state, 'sparks')); assert.equal(run.phase, 'map', 'the stop ends with the choice');
});

test('a disabled option stays visible with its reason and no action; a wager uses its short form', () => {
  const off = stopTile({icon: '<i></i>', title: 'Refill a card', line: '', off: 'No card has used any of its uses.', action: 'support', attrs: 'data-index="1"'});
  assert.match(off, /aria-disabled="true"/); assert.doesNotMatch(off, /data-action|data-tap-pick/); assert.match(off, /No card has used any of its uses/);
  const run = runAt('stop-wager').run;
  const line = tileLine(run, {description: 'Wager, next flight only: long rule text. Won: +45 Stored Sparks. Not met: nothing.', effect: {oath: 'night-ledger'}});
  assert.match(line, /^Fly at 55% Luminance\. Win: \+\d+ Stored Sparks\. Miss: nothing\.$/);
  assert.match(tileLine(run, {description: 'Drafts are 30% gentler for your first flight there. Commit to this exit and leave the other path.', effect: {routePreparation: {}}}, 3), /Closes the other path\.$/);
});

test('every event outcome of a card run uses current words only and fits one short tile line', () => {
  const seen = new Map();
  for (const hurt of [false, true]) for (const map of [0, 1, 2]) for (let seed = 0; seed < 25; seed++) {
    const state = runAt(`stop-audit-${seed}`, map), r = state.run;
    if (hurt) { r.lives = 1; r.flame = 10; }
    const c = makeSkillCard('twin-wick', 'tw'); c.charges = 1; r.mountedCards[0] = c;
    for (const n of r.map.flat().filter(x => x.type === 'support' && !['camp', 'treasure', 'scribe'].includes(x.kind))) {
      r.current = n; r.phase = 'support'; r.supportOffers = null;
      for (const o of M.getSupportChoices(r, state.profile)) {
        const line = o.disabled ? '' : tileLine(r, o, 2);
        seen.set(`${n.eventIndex}:${o.id}`, `${o.title} | ${o.description}`);
        assert.doesNotMatch(`${o.title} ${o.description} ${line}`, RETIRED, `${n.eventIndex}:${o.id}`);
        assert.ok(line.length <= 100, `${o.id} tile line: ${line}`);
        assert.ok(outcomeIcon(o).includes('ui-icon'), o.id);
      }
      const html = eventStopMarkup(r, n, M.getSupportChoices(r, state.profile));
      assert.ok((html.match(/class="stop2-tile/g) || []).length >= 2);
    }
  }
  assert.ok(seen.size >= 25, `${seen.size} distinct outcomes audited`);
});

/** Chests hold an Inscription 35% of the time, so look through seeds for the find a test needs. */
function chestWith(kind, seed, ok) {
  for (let i = 0; i < 80; i++) { const c = chestOf(kind, `${seed}-${i}`); if (ok(c.run.pendingChest.find)) return c; }
  assert.fail(`no ${kind} chest with the wanted find`);
}
function chestOf(kind, seed) {
  const state = runAt(seed), run = state.run, stop = run.map.flat().find(n => n.kind === 'treasure' && !n.practiceLoan);
  stop.treasureKind = kind;
  const pred = run.map[stop.row - 1].find(n => n.nextIds.includes(stop.id)); run.step = stop.row; run.path = [pred.id];
  assert.ok(M.selectNode(run, stop.id));
  return {state, run, stop};
}

test('the chest keeps its own find: shown under the picture, taken with the choice, never twice', () => {
  // Hollow Vessel: +3 max Sparks for the run (kept as before: run.treasureCapacity), filled.
  {
    const {state, run, stop} = chestWith('vessel', 'find-vessel', f => f === 'vessel'), capacity = run.treasureCapacity || 0;
    assert.equal(run.pendingChest.find, 'vessel');
    const html = chestStopMarkup(run, {node: stop}), t = text(html);
    assert.match(t, /Found\s+Hollow Vessel/); assert.match(t, /\+3 max Sparks/);
    assert.doesNotMatch(html, /Stored<\/small>/, 'Stored Sparks show once, in the app bar');
    run.flame = 10; assert.ok(M.chooseChestReward(state, 'sparks'));
    assert.equal(run.treasureCapacity, capacity + 10); assert.ok(run.flame > 10, 'the new space is filled');
  }
  // Starglass Cache: a Far Lens or Quick Lens Inscription; the slot write screen opens after the choice.
  for (const option of ['sparks', 'card']) {
    const {state, run, stop} = chestWith('lens', 'find-lens-' + option, f => ['farLens', 'quickLens'].includes(f)), id = run.pendingChest.find;
    assert.ok(['farLens', 'quickLens', 'wick', 'toll'].includes(id));
    assert.match(text(chestStopMarkup(run, {node: stop})), /Found\s+(Far Lens|Quick Lens)/);
    assert.equal(run.pendingTemporary, undefined);
    assert.ok(M.chooseChestReward(state, option));
    assert.equal(run.pendingTemporary.id, id === 'farLens' ? 'far-lens' : 'quick-lens'); assert.equal(run.pendingTemporary.permanent, true);
  }
  // Same chest, same find after a reload; the Reliquary holds none.
  assert.equal(chestOf('lens', 'find-same').run.pendingChest.find, chestOf('lens', 'find-same').run.pendingChest.find);
  assert.equal(chestWith('wager', 'find-none', f => f === null).run.pendingChest.find, null);
  const none = chestWith('wager', 'find-none2', f => f === null);
  assert.doesNotMatch(chestStopMarkup(none.run, {node: none.stop}), /Found/);
});
