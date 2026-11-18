// Tap to pick (dist/tap-pick.mjs): first tap selects, second tap on the same item takes, another item moves the selection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectTapPick, isTapPickSelected, tapPickIntent, clearTapPick} from '../dist/tap-pick.mjs';
import {cardDraftOffersMarkup} from '../dist/card-ui.mjs';

// A tiny DOM stand-in: items in one parent, with classList and attributes.
function item(group) {
  const classes = new Set(), attrs = {};
  const node = {classList: {add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c)},
    setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: k => attrs[k], closest: () => group, parentElement: group, attrs};
  return node;
}
function makeGroup(n) {
  const classes = new Set(), items = [];
  const group = {items, classList: {add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c)}, querySelectorAll: () => items};
  for (let i = 0; i < n; i++) items.push(item(group));
  return group;
}

test('first tap selects, second tap on the same item takes, another item moves the selection', () => {
  const group = makeGroup(3), [a, b] = group.items;
  assert.equal(tapPickIntent(a), 'select');
  selectTapPick(a);
  assert.ok(isTapPickSelected(a));
  assert.equal(group.items.filter(isTapPickSelected).length, 1);
  assert.equal(a.attrs['aria-pressed'], 'true');
  assert.ok(group.classList.contains('tp-has-selection'));
  assert.equal(tapPickIntent(a), 'take', 'the selected item is taken by the next tap');
  assert.equal(tapPickIntent(b), 'select', 'another item only moves the selection');
  selectTapPick(b);
  assert.ok(isTapPickSelected(b) && !isTapPickSelected(a));
  assert.equal(a.attrs['aria-pressed'], 'false');
  void clearTapPick;
});

test('the Choose 1 card offers are tap-pick items with no Choose buttons', () => {
  const html = cardDraftOffersMarkup({id: 'd', offers: [{instanceId: 'x', cardId: 'body-spark', name: 'Body Spark', rarity: 'common'}]});
  assert.match(html, /data-tap-pick/);
  assert.match(html, /data-action="card-draft-pick"/);
  assert.doesNotMatch(html, /<button[^>]*data-action="card-draft-pick"/);
  assert.doesNotMatch(html, />Choose /);
});

test('every picking screen marks its items for tap-to-pick', () => {
  const read = f => fs.readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');
  for (const [file, action] of [['card-ui.mjs', 'new-gift'], ['stop-screen.mjs', 'event-card'], ['stop-screen.mjs', 'chest-choice'], ['card-workshop.mjs', 'card-workshop-improve'], ['card-workshop.mjs', 'card-workshop-refill'], ['stop-screen.mjs', 'stop2-tile']])
    assert.ok(read(file).includes(action), `${file} ${action}`);
  assert.match(read('stop-screen.mjs'), /data-tap-pick/);
  assert.match(read('stop-screen.mjs'), /action:'chest-choice'/);
  assert.match(read('card-workshop.mjs'), /data-tap-pick/);
  assert.match(read('app.mjs'), /installTapPick\(\)/);
  assert.match(read('ui/card-screens.css'), /\.tp-selected/);
});
