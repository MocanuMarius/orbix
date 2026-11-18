// Pure helpers of scripts/release.mjs and the offline-graph classification of scripts/pwa-assets.mjs.
// Importing release.mjs without being the entry script runs nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fetchWithRetry, VERIFY_RETRY_DELAYS_MS, servedFile, auditRequests, classifyGraphRemovals} from '../scripts/release.mjs';
import {PLAYER_ENTRIES, buildGraph, playerGraph, developerOnlyFiles} from '../scripts/pwa-assets.mjs';

const ok = (status, body = 'x') => async () => ({status, body: Buffer.from(body)});
const sequence = steps => { let i = 0; return async () => { const step = steps[Math.min(i++, steps.length - 1)]; if (step instanceof Error) throw step; return {status: step, body: Buffer.from('b' + step)}; }; };

test('verify retries a 5xx or a network error with backoff and records every retry', async () => {
  const slept = [], sleep = async ms => slept.push(ms);
  const result = await fetchWithRetry(sequence([503, new Error('fetch failed'), 502, 200]), {sleep});
  assert.equal(result.status, 200);
  assert.equal(result.attempts, 4);
  assert.deepEqual(result.retries.map(r => r.reason), ['HTTP 503', 'network: fetch failed', 'HTTP 502']);
  assert.deepEqual(slept, VERIFY_RETRY_DELAYS_MS.slice(0, 3));
});

test('verify gives up after five attempts spread over about a minute', async () => {
  const slept = [], sleep = async ms => slept.push(ms);
  const result = await fetchWithRetry(sequence([503]), {sleep});
  assert.equal(result.status, 503);
  assert.equal(result.attempts, 5);
  assert.equal(result.retries.length, 5);
  assert.equal(VERIFY_RETRY_DELAYS_MS.length, 4);
  assert.ok(slept.reduce((a, b) => a + b, 0) >= 55000 && slept.reduce((a, b) => a + b, 0) <= 65000, 'about 60 seconds of backoff');
  const gone = await fetchWithRetry(sequence([new Error('offline')]), {sleep: async () => {}});
  assert.equal(gone.status, 0);
  assert.match(gone.error, /offline/);
  assert.equal(gone.attempts, 5);
});

test('verify does not retry a 200 with the wrong bytes, a 404 or a 304: those are final', async () => {
  for (const status of [200, 404, 304]) {
    let sleeps = 0;
    const result = await fetchWithRetry(ok(status), {sleep: async () => { sleeps++; }});
    assert.equal(result.attempts, 1);
    assert.deepEqual(result.retries, []);
    assert.equal(sleeps, 0);
  }
});

test('the probe server serves the public path only', () => {
  assert.deepEqual(servedFile('/orbix/'), {inside: true, file: 'index.html'});
  assert.deepEqual(servedFile('/orbix/ui/deck-screen.mjs'), {inside: true, file: 'ui/deck-screen.mjs'});
  assert.deepEqual(servedFile('/orbix/assets/a%20b.png'), {inside: true, file: 'assets/a b.png'});
  for (const outside of ['/', '/index.html', '/assets/ui/waystone/plaque-page.svg', '/orbixx/index.html']) assert.equal(servedFile(outside).inside, false, outside);
});

test('the request audit lists every failed or out-of-subpath request with its URL, and ignores the rest', () => {
  const origin = 'http://probe.test:1234', u = p => origin + p;
  const entries = [
    {url: u('/orbix/game.html'), type: 'Document', status: 200, stage: 'home'},
    {url: u('/orbix/a.png'), type: 'Image', status: 200, stage: 'home'},
    {url: u('/orbix/b.mp4'), type: 'Media', status: 206, stage: 'home'},
    {url: u('/assets/ui/waystone/plaque-page.svg'), type: 'Image', status: 404, stage: 'flight', initiator: u('/orbix/interface-composition.css')},
    {url: u('/orbix/${WISP_ORB_SRC}'), type: 'Image', status: 404, stage: 'deck'},
    {url: u('/orbix/font.woff2'), type: 'Font', failed: 'net::ERR_FAILED', canceled: false, stage: 'home'},
    {url: u('/orbix/aborted.png'), type: 'Image', failed: 'net::ERR_ABORTED', canceled: true, stage: 'home'},
    {url: u('/orbix/still-loading.js'), type: 'Script', stage: 'home'},
    {url: u('/orbix/moved.css'), type: 'Stylesheet', status: 301, stage: 'home'},
    {url: u('/favicon.ico'), type: 'Other', status: 404, stage: 'home'},
    {url: 'data:image/svg+xml,%3Csvg%3E', type: 'Image', stage: 'home'},
    {url: 'https://fonts.example/f.woff2', type: 'Font', status: 404, stage: 'home'}
  ];
  const problems = auditRequests(entries, {origin, prefix: '/orbix/'});
  assert.deepEqual(problems.map(p => p.url.replace(origin, '')), ['/assets/ui/waystone/plaque-page.svg', '/orbix/${WISP_ORB_SRC}', '/orbix/font.woff2', '/orbix/moved.css']);
  assert.equal(problems[0].reason, 'outside /orbix/');
  assert.equal(problems[0].initiator, origin + '/orbix/interface-composition.css');
  assert.equal(problems[1].stage, 'deck');
  assert.equal(problems[2].reason, 'failed: net::ERR_FAILED');
  assert.equal(problems[3].reason, 'status 301');
});

test('graph removals: developer-only files pass only with the dev flag, anything else stays blocked', () => {
  const removed = ['rest-inspector-preview.mjs', 'components.html', 'player-thing.mjs'], developerOnly = new Set(['rest-inspector-preview.mjs', 'components.html']);
  assert.deepEqual(classifyGraphRemovals(removed), {devPageRemovals: [], blocked: removed});
  const withFlag = classifyGraphRemovals(removed, {developerOnly});
  assert.deepEqual(withFlag.devPageRemovals, ['rest-inspector-preview.mjs', 'components.html']);
  assert.deepEqual(withFlag.blocked, ['player-thing.mjs']);
  const both = classifyGraphRemovals(removed, {developerOnly, allow: new Set(['player-thing.mjs'])});
  assert.deepEqual(both.blocked, []);
  assert.deepEqual(both.devPageRemovals, ['rest-inspector-preview.mjs', 'components.html']);
});

// A miniature dist: every player entry exists, plus developer pages and modules.
async function miniDist(extra) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbix-graph-')), write = async (file, text) => { await fs.mkdir(path.dirname(path.join(dir, file)), {recursive: true}); await fs.writeFile(path.join(dir, file), text); };
  for (const entry of PLAYER_ENTRIES) if (!/\.(html|css)$/.test(entry) || entry === 'cache-card-help.css') await write(entry, entry.endsWith('.css') ? 'body{}' : 'x');
  for (const entry of PLAYER_ENTRIES.filter(e => e.endsWith('.html'))) await write(entry, '<!doctype html><title>' + entry + '</title>');
  await write('game.html', '<script type="module" src="app.mjs?v=t1"></script><link rel="stylesheet" href="style.css?v=t1">');
  await write('app.mjs', "import {shared} from './shared.mjs';\nconst lazy = () => import('./lazy.mjs');\nconst art = 'assets/hero.png';\nexport {shared, lazy, art};");
  await write('shared.mjs', 'export const shared = 1;');
  await write('lazy.mjs', 'export default 2;');
  await write('style.css', ".a{background:url('assets/bg.svg')}");
  await write('assets/hero.png', 'png'); await write('assets/bg.svg', '<svg/>');
  await write('rest-inspector-preview.mjs', "import {shared} from './shared.mjs';\nimport './only-for-dev.mjs';");
  await write('only-for-dev.mjs', "const x = 'assets/dev-shot.png';");
  await write('assets/dev-shot.png', 'png');
  await write('inspector.html', '<script type="module" src="rest-inspector-preview.mjs"></script>');
  await write('brand-new-study.html', '<script type="module" src="study.mjs"></script>');
  await write('study.mjs', 'export {}');
  for (const [file, text] of Object.entries(extra || {})) await write(file, text);
  return dir;
}

test('the offline graph follows player entries only; developer pages and their private modules are classified', async () => {
  const dir = await miniDist();
  try {
    const graph = await playerGraph(dir);
    assert.equal(graph.release, 't1');
    for (const f of ['game.html', 'app.mjs', 'shared.mjs', 'lazy.mjs', 'style.css', 'assets/hero.png', 'assets/bg.svg', 'index.html', 'first-light.html', 'cards.html', 'cache-card-help.css']) assert.ok(graph.files.includes(f), f + ' is in the player graph');
    for (const f of ['inspector.html', 'rest-inspector-preview.mjs', 'only-for-dev.mjs', 'assets/dev-shot.png', 'brand-new-study.html', 'study.mjs']) assert.ok(!graph.files.includes(f), f + ' is not in the player graph');
    const devOnly = await developerOnlyFiles(dir);
    assert.deepEqual(devOnly.sort(), ['assets/dev-shot.png', 'brand-new-study.html', 'inspector.html', 'only-for-dev.mjs', 'rest-inspector-preview.mjs', 'study.mjs']);
    assert.ok(!devOnly.includes('shared.mjs'), 'a module a player page also loads is never developer-only');
    const everything = await buildGraph(dir, [...PLAYER_ENTRIES, 'inspector.html', 'brand-new-study.html']);
    assert.ok(everything.files.includes('study.mjs'));
  } finally { await fs.rm(dir, {recursive: true, force: true}); }
});

test('the real dist: the player graph holds the pages players open and keeps lazy runtime assets', async () => {
  const dist = new URL('../dist/', import.meta.url), graph = await playerGraph(dist), files = new Set(graph.files);
  for (const f of ['index.html', 'game.html', 'cards.html', 'card-workbench.html', 'first-light.html', 'loading.html', 'scorecard.html', 'nature-credits.html', 'combo-lesson.html', 'cache-card-help.css']) assert.ok(files.has(f), f);
  // reel-near.png is named inside a template literal in tutorial-visuals.mjs, so it is a root.
  for (const f of ['assets/previews/collector-tether/reel-near.png', 'assets/previews/collector-tether/reel-front.png', 'assets/previews/collector-tether/reel.mp4']) assert.ok(files.has(f), f);
  const devOnly = new Set(await developerOnlyFiles(dist));
  for (const f of ['components.html', 'components-preview.html']) assert.ok(!files.has(f) && devOnly.has(f), f + ' is developer-only');
  for (const f of files) assert.ok(!devOnly.has(f), f + ' is both player and developer-only');
});
