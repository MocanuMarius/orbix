// "Update now": pure logic with a fake window. Saves are never touched; offline does nothing; the version comes from the network file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOfflineList, updateAvailable, cacheBustedUrl, fetchPublishedVersion, updateNow, VERSION_FILE} from '../dist/update-now.mjs';

const LIST = '// Generated\nconst WISP_OFFLINE = {\n  "release": "guide-clarity-2",\n  "revision": "abc123",\n  "files": ["a.mjs"]\n};\n';
const fakeWin = ({online = true, regs = 2, caches = ['wispbound:a', 'other'], published = LIST, href = 'https://x.test/game.html?cards=1#top'} = {}) => {
  const log = [];
  return {log, win: {
    navigator: {onLine: online, serviceWorker: {getRegistrations: async () => Array.from({length: regs}, (_, i) => ({unregister: async () => { log.push('unregister ' + i); return true; }}))}},
    caches: {keys: async () => caches, delete: async name => { log.push('delete ' + name); return true; }},
    localStorage: {setItem() { log.push('SAVE TOUCHED'); }, removeItem() { log.push('SAVE TOUCHED'); }, clear() { log.push('SAVE TOUCHED'); }},
    indexedDB: {deleteDatabase() { log.push('SAVE TOUCHED'); }},
    fetch: async (url, opts) => { log.push('fetch ' + new URL(url).pathname + ' ' + opts.cache); if (published === null) throw new Error('offline'); return {ok: true, text: async () => published}; },
    location: {href, replace: url => log.push('replace ' + url)},
  }};
};

test('the published version is read from offline-list.js; junk and errors read as unknown', async () => {
  assert.deepEqual(parseOfflineList(LIST), {release: 'guide-clarity-2', revision: 'abc123'});
  assert.equal(parseOfflineList('nothing'), null); assert.equal(parseOfflineList(undefined), null);
  const calls = [];
  const v = await fetchPublishedVersion({fetchFn: async (u, o) => { calls.push([u, o]); return {ok: true, text: async () => LIST}; }, base: 'https://x.test/app/game.html', now: 5});
  assert.equal(v.release, 'guide-clarity-2'); assert.equal(calls[0][0], 'https://x.test/app/' + VERSION_FILE + '?_u=5'); assert.deepEqual(calls[0][1], {cache: 'no-store'});
  assert.equal(await fetchPublishedVersion({fetchFn: async () => { throw new Error('x'); }, base: 'https://x.test/'}), null);
  assert.equal(await fetchPublishedVersion({fetchFn: async () => ({ok: false}), base: 'https://x.test/'}), null);
});

test('"Update available" only when a readable, different release is published', () => {
  assert.equal(updateAvailable('guide-clarity-1', {release: 'guide-clarity-2'}), true);
  assert.equal(updateAvailable('guide-clarity-1', {release: 'guide-clarity-1'}), false);
  assert.equal(updateAvailable('guide-clarity-1', null), false);
  assert.equal(updateAvailable('', {release: 'x'}), false);
});

test('the reload address keeps the page and its parameters and adds one throwaway query', () => {
  assert.equal(cacheBustedUrl('https://x.test/game.html?cards=1#top', 7), 'https://x.test/game.html?cards=1&_u=7');
  assert.equal(cacheBustedUrl('https://x.test/game.html?_u=1', 9), 'https://x.test/game.html?_u=9');
});

test('Update now removes every service worker and cache, reloads from the network and never touches saves', async () => {
  const {win, log} = fakeWin(), states = [];
  const result = await updateNow({win, onState: s => states.push(s), now: 3});
  assert.equal(result.ok, true); assert.deepEqual(states, ['updating']);
  assert.ok(log.includes('unregister 0') && log.includes('unregister 1'));
  assert.ok(log.includes('delete wispbound:a') && log.includes('delete other'), 'all caches, not just ours');
  assert.equal(log.includes('SAVE TOUCHED'), false);
  assert.ok(log.some(l => l === 'fetch /game.html reload'), 'the page itself is fetched past the HTTP cache');
  assert.equal(log.at(-1), 'replace https://x.test/game.html?cards=1&_u=3');
  assert.ok(log.findIndex(l => l.startsWith('fetch /offline-list.js')) < log.findIndex(l => l.startsWith('unregister')), 'the network is proven before anything is removed');
});

test('offline (reported or real) says "No connection" and does nothing', async () => {
  for (const opts of [{online: false}, {published: null}]) {
    const {win, log} = fakeWin(opts), states = [];
    const result = await updateNow({win, onState: s => states.push(s)});
    assert.deepEqual(result, {ok: false, reason: 'No connection'}); assert.deepEqual(states, []);
    assert.equal(log.some(l => /^(unregister|delete|replace)/.test(l)), false, JSON.stringify(opts));
  }
});

test('a browser without service workers or Cache Storage still reloads', async () => {
  const {win, log} = fakeWin(); delete win.navigator.serviceWorker; delete win.caches;
  assert.equal((await updateNow({win, now: 1})).ok, true); assert.equal(log.at(-1), 'replace https://x.test/game.html?cards=1&_u=1');
});
