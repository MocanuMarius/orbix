// "Play fullscreen?" asks once: only on a touch device, in a browser tab, on Home, never in flight, a lesson or on top of a dialog.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readDisplayAnswer, writeDisplayAnswer, shouldAskDisplay, isTouchDevice, isImmersive, enterFullscreen, displayPromptMarkup, DISPLAY_PROMPT_KEY} from '../dist/display-prompt.mjs';

const memory = () => { const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), m}; };
const ask = over => shouldAskDisplay({touch: true, immersive: false, answer: null, screen: 'home', ...over});

test('first visit on a touch phone in a tab, on Home: ask', () => assert.equal(ask(), true));

test('any remembered answer ends the question for good', () => {
  const s = memory();
  assert.equal(readDisplayAnswer(s), null);
  for (const answer of ['fullscreen', 'install', 'later']) {
    const t = memory(); assert.equal(writeDisplayAnswer(answer, t), true);
    assert.equal(readDisplayAnswer(t), answer); assert.equal(ask({answer: readDisplayAnswer(t)}), false, answer);
  }
  assert.equal(writeDisplayAnswer('maybe', s), false, 'only the three answers are stored'); assert.equal(s.m.size, 0);
});

test('junk, broken or refusing storage reads as never asked and never throws', () => {
  const s = memory(); s.setItem(DISPLAY_PROMPT_KEY, '{nope'); assert.equal(readDisplayAnswer(s), null);
  s.setItem(DISPLAY_PROMPT_KEY, JSON.stringify({answer: 'banana'})); assert.equal(readDisplayAnswer(s), null);
  const hostile = {getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); }};
  assert.equal(readDisplayAnswer(hostile), null); assert.equal(writeDisplayAnswer('later', hostile), false);
  assert.equal(readDisplayAnswer(null), null);
});

test('never on desktop, when installed or already fullscreen', () => {
  assert.equal(ask({touch: false}), false);
  assert.equal(ask({immersive: true}), false);
  assert.equal(ask({fullscreenAvailable: false}), false, 'no fullscreen support: nothing to offer');
  assert.equal(ask({secure: false}), false);
});

test('never in flight, in a tutorial lesson, on another screen, or on top of another dialog', () => {
  assert.equal(ask({engine: true}), false);
  assert.equal(ask({lessonActive: true}), false);
  assert.equal(ask({sheetOpen: true}), false);
  for (const screen of ['map', 'flight', 'support', 'rest-prep', 'card-draft', 'death']) assert.equal(ask({screen}), false, screen);
});

test('touch and installed detection read the media queries and navigator', () => {
  const win = (media, extra = {}) => ({matchMedia: q => ({matches: !!media[q]}), navigator: {maxTouchPoints: 0, ...extra.navigator}, document: extra.document || {}});
  assert.equal(isTouchDevice(win({'(pointer: coarse)': true})), true);
  assert.equal(isTouchDevice(win({}, {navigator: {maxTouchPoints: 5}})), true);
  assert.equal(isTouchDevice(win({})), false);
  assert.equal(isImmersive(win({'(display-mode: standalone)': true})), true);
  assert.equal(isImmersive(win({}, {navigator: {standalone: true}})), true);
  assert.equal(isImmersive(win({}, {document: {fullscreenElement: {}}})), true);
  assert.equal(isImmersive(win({})), false);
});

test('Fullscreen asks the page for fullscreen and then landscape; refusals do not throw', async () => {
  const calls = [];
  const doc = {fullscreenElement: null, documentElement: {requestFullscreen: async () => { calls.push('fullscreen'); doc.fullscreenElement = {}; }}};
  const win = {document: doc, screen: {orientation: {lock: async o => { calls.push('lock ' + o); }}}};
  assert.equal(await enterFullscreen(win), true); assert.deepEqual(calls, ['fullscreen', 'lock landscape']);
  const noLock = {document: {fullscreenElement: null, documentElement: {requestFullscreen: async () => {}}}, screen: {orientation: {lock: async () => { throw new Error('no'); }}}};
  assert.equal(await enterFullscreen(noLock), false, 'fullscreen did not stick, but nothing throws');
  const denied = {document: {documentElement: {requestFullscreen: async () => { throw new Error('denied'); }}}};
  assert.equal(await enterFullscreen(denied), false);
});

test('the dialog has the owner’s title and buttons; Install app only when the browser offered an install', () => {
  const plain = displayPromptMarkup(), withInstall = displayPromptMarkup({canInstall: true});
  assert.match(plain, /<h2>Play fullscreen\?<\/h2>/);
  assert.match(plain, /class="primary" data-action="display-fullscreen">Fullscreen</);
  assert.match(plain, /data-action="display-later">Not now</);
  assert.doesNotMatch(plain, /Install app/);
  assert.match(withInstall, /data-action="display-install">Install app</);
});
