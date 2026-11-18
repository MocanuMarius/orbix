// Touch devices: no sticky hover, no tap-painted focus, no colour fill on :active. Fake CSS rules, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSelectors, cleanStyleRule, cleanRules, isTouchLike, installTouchClean} from '../dist/touch-clean.mjs';

const style = obj => { const m = new Map(Object.entries(obj)); return {getPropertyValue: p => m.get(p) || '', removeProperty: p => m.delete(p), has: p => m.has(p), keys: () => [...m.keys()]}; };
const rule = (selectorText, props) => ({selectorText, style: style(props)});
const sheetOf = rules => { const list = Object.assign([...rules], {}); list.forEach(r => { r.parentStyleSheet = {deleteRule: i => list.splice(i, 1)}; }); return {list, cssRules: list}; };

test('selector lists split only at top-level commas', () => {
  assert.deepEqual(splitSelectors('a:hover, :is(b, c):not(.d,.e), [x="1,2"]'), ['a:hover', ':is(b, c):not(.d,.e)', '[x="1,2"]']);
});

test(':hover rules are dropped, and a shared rule keeps its other selectors', () => {
  const only = rule('.btn:hover', {background: 'red'});
  assert.equal(cleanStyleRule(only), 'deleted');
  const shared = rule('.btn:hover, .btn:focus-visible', {outline: '2px solid gold'});
  assert.equal(cleanStyleRule(shared), 'edited'); assert.equal(shared.selectorText, '.btn:focus-visible');
  assert.equal(cleanStyleRule(rule('.hovered, .btn:not(:disabled)', {color: 'red'})), 'kept');
});

test(':focus loses background and outline (keyboard :focus-visible keeps both); :active loses colour fill but keeps its press', () => {
  const focus = rule('button:focus', {background: '#fc0', outline: '3px solid red', color: '#000'});
  assert.equal(cleanStyleRule(focus), 'edited'); assert.deepEqual(focus.style.keys(), ['color']);
  const visible = rule('button:focus-visible', {outline: '3px solid red'});
  assert.equal(cleanStyleRule(visible), 'kept'); assert.equal(visible.style.has('outline'), true);
  const active = rule('button:active', {'background-color': '#222', transform: 'translateY(1px)', filter: 'brightness(.5)'});
  assert.equal(cleanStyleRule(active), 'edited'); assert.deepEqual(active.style.keys(), ['transform']);
  assert.equal(cleanStyleRule(rule('.card:focus-within', {background: '#fff'})), 'kept');
});

test('whole sheets: nested @media rules are cleaned, keyframes are left alone', () => {
  const inner = sheetOf([rule('.a:hover', {color: 'red'}), rule('.b', {color: 'blue'})]);
  const media = {cssRules: inner.list, deleteRule: i => inner.list.splice(i, 1), constructor: {name: 'CSSMediaRule'}};
  inner.list.forEach(r => { r.parentRule = media; });
  const keyframes = {cssRules: [{keyText: '50%', style: style({background: 'red'})}], constructor: {name: 'CSSKeyframesRule'}};
  const top = sheetOf([rule('.x:hover', {background: 'red'}), media, keyframes, rule('.y:active', {background: 'red'})]);
  media.parentStyleSheet = top;
  const counts = cleanRules(top.list);
  assert.equal(counts.deleted, 2); assert.equal(counts.edited, 1);
  assert.deepEqual(inner.list.map(r => r.selectorText), ['.b']);
  assert.equal(keyframes.cssRules[0].style.has('background'), true);
});

test('only touch-like devices are touched', () => {
  assert.equal(isTouchLike({matchMedia: () => ({matches: true})}), true);
  assert.equal(isTouchLike({matchMedia: () => ({matches: false})}), false);
  assert.equal(isTouchLike({}), false);
  assert.equal(installTouchClean({matchMedia: () => ({matches: false}), document: {}}), null, 'a mouse device keeps its hover styles');
});
