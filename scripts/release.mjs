// Reusable GitHub Pages release for Orbix / Wispbound.
//
//   node scripts/release.mjs all --source <commit> --version <label> [options]
//
// Commands (each writes <command>-report.json under work/release-<version>/):
//   prepare  isolated artifact from `git archive <source>`, byte check against the
//            commit, exclusions removed, version stamped, offline graph regenerated
//   check    node --check of every artifact .mjs/.js and the focused test files,
//            run with the artifact as the tree under test
//   browser  headless Chrome probes on a local server of the artifact: boot, fresh
//            New Game, offline graph over HTTP, complete worker cache, offline Home,
//            and an upgrade from the currently published worker with save comparison
//   publish  overlay commit on top of origin/gh-pages (temporary index,
//            hash-object --no-filters), scope checks, normal push. Needs --publish.
//   wait     poll the public release.json until it reports this version
//   verify   public exact bytes of graph + worker + manifest, and a public browser boot
//   all      prepare, check, browser, then (only with --publish) publish, wait, verify
//
// Options:
//   --source <commit>     commit to release (required for prepare)
//   --version <label>     release label, for example starter-flow-1 (always required)
//   --exclude <dist path> not published, removed from the artifact (repeatable)
//   --require <dist path> file the offline graph must contain (repeatable)
//   --tests <a,b,...>     test files to run in check (default list below)
//   --allow-graph-removal <dist path>   a previously public graph file may leave the graph
//   --allow-unlisted <dist path>        accept one unlisted-reference warning
//   --publish             permit publish (also RELEASE_PUBLISH_GO=1)
//   --wait-minutes <n>    deployment wait limit (default 12)
//
// The tool never writes the working tree outside work/release-<version>/. It stops on
// the first failed assertion. Rerunning a passed step is safe; `prepare` refuses to
// reuse an existing artifact folder, so delete work/release-<version>/ to start over.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_BASE = 'https://mocanumarius.github.io/orbix/';
const DEFAULT_TESTS = ['tests/tutorial-starter-routing.test.mjs', 'tests/playable-practice.test.mjs', 'tests/card-starter-three.test.mjs', 'tests/flight-preview.test.mjs', 'tests/automatic-updates.test.mjs', 'tests/camp-resume-render.test.mjs', 'tests/pwa-upgrade.test.mjs'];
// Reviewed standing defaults (starter-flow-1, 2026-11-16). Command-line values add to these.
// design-lab/ is a developer tool, never published; it is skipped silently if absent.
const DEFAULT_EXCLUDE = ['design-lab/'];
// Runtime dependencies the pre-collector-cards-1 manifest once missed.
const DEFAULT_REQUIRE = ['collector-vortex.mjs', 'practice-route.mjs', 'route-bonus-copy.mjs', 'assets/guide-atlas-chevron.svg', 'assets/guide-atlas-spread.svg'];
// A <video poster> on the developer page collector-art.html; already public, never in the graph.
const DEFAULT_ALLOW_UNLISTED = ['assets/previews/collector-art/tow-latch.png'];
const TEXT = /\.(mjs|js|html|css|webmanifest|json|svg|txt|md)$/;
const SAVE = 'wispbound.save.condensed.v7', CARDS_SAVE = 'cards-pilot:' + SAVE;

// ---------- arguments ----------
const argv = process.argv.slice(2), command = argv[0], opts = {exclude: [], require: [], 'allow-graph-removal': [], 'allow-unlisted': []};
for (let i = 1; i < argv.length; i++) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(argv[i]);
  if (!m) throw Error('Unexpected argument ' + argv[i]);
  const [, key, inline] = m;
  if (key === 'publish') { opts.publish = true; continue; }
  const value = inline ?? argv[++i];
  if (value === undefined) throw Error('Missing value for --' + key);
  if (Array.isArray(opts[key])) opts[key].push(value); else opts[key] = value;
}
const version = opts.version;
if (!/^[a-z0-9][a-z0-9.-]*$/.test(version || '')) throw Error('--version <label> is required (lowercase letters, digits, dots, hyphens)');
const out = path.join(root, 'work', 'release-' + version), artifact = path.join(out, 'artifact'), dist = path.join(artifact, 'dist');
const toDist = p => p.replace(/\\/g, '/').replace(/^\.?\/?(dist\/)?/, '');

// ---------- helpers ----------
const git = (args, o = {}) => execFileSync('git', ['-c', 'core.safecrlf=false', '-c', 'core.autocrlf=false', ...args], {cwd: root, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, ...o}).toString().trim();
const gitRaw = args => execFileSync('git', args, {cwd: root, maxBuffer: 512 * 1024 * 1024});
const sha256 = data => createHash('sha256').update(data).digest('hex');
const blobId = data => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + data.length + '\0'), data])).digest('hex');
const writeReport = (name, value) => fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
const readReport = async name => JSON.parse(await fs.readFile(path.join(out, name), 'utf8'));
const exists = file => fs.access(file).then(() => true, () => false);
const listing = async dir => { const files = []; for (const e of await fs.readdir(dir, {withFileTypes: true})) { const f = path.join(dir, e.name); if (e.isDirectory()) files.push(...await listing(f)); else files.push(f); } return files; };
const distFiles = async () => (await listing(dist)).map(f => path.relative(dist, f).replace(/\\/g, '/')).sort();
const parseList = source => { const c = {}; vm.runInNewContext(source + ';this.list=WISP_OFFLINE', c); return JSON.parse(JSON.stringify(c.list)); };
const offlineList = async () => parseList(await fs.readFile(path.join(dist, 'offline-list.js'), 'utf8'));
const treeEntries = ref => new Map(git(['ls-tree', '-r', '--full-tree', ref]).split(/\r?\n/).filter(Boolean).map(row => { const [, mode, type, oid, file] = /^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/.exec(row); return [file, {mode, type, oid}]; }));
const log = (...a) => console.log('[release ' + version + ']', ...a);
async function artifactDigest() { const files = {}; for (const f of await distFiles()) files[f] = sha256(await fs.readFile(path.join(dist, f))); return {digest: sha256(JSON.stringify(files)), files}; }
async function pool(items, limit, fn) { const it = items.values(); await Promise.all(Array.from({length: limit}, async () => { for (const x of it) await fn(x); })); }
function stampText(text, oldToken) { return text.replaceAll('?v=' + oldToken, '?v=' + version).replaceAll("'" + oldToken + "'", "'" + version + "'").replaceAll('"' + oldToken + '"', '"' + version + '"'); }

// ---------- prepare ----------
async function prepare() {
  const source = git(['rev-parse', '--verify', (opts.source || '') + '^{commit}']);
  await fs.mkdir(out, {recursive: true});
  if (await exists(artifact)) assert.equal((await fs.readdir(artifact)).length, 0, 'artifact folder must start empty: delete ' + artifact + ' to start over');
  await fs.mkdir(artifact, {recursive: true});
  git(['fetch', 'origin', 'main', 'gh-pages']);
  const pagesBaseline = git(['rev-parse', 'origin/gh-pages']);
  const publicRelease = JSON.parse(git(['show', pagesBaseline + ':release.json']));
  assert.notEqual(publicRelease.version, version, 'this version label is already public');
  const sourceOnMain = spawnSync('git', ['merge-base', '--is-ancestor', source, 'origin/main'], {cwd: root}).status === 0;
  const sourceHas = p => spawnSync('git', ['cat-file', '-e', source + ':dist/' + p.replace(/\/$/, '')], {cwd: root}).status === 0;
  const exclude = [...new Set([...DEFAULT_EXCLUDE.filter(sourceHas), ...opts.exclude.map(toDist).filter(Boolean)])];
  assert.ok(exclude.every(e => !e.includes('..')), 'exclusions stay inside dist');

  // 1. Extract the committed tree with Git's line-ending conversion disabled.
  const archive = path.join(out, 'source.tar');
  git(['archive', '--format=tar', '-o', archive, source]);
  execFileSync('tar', ['-xf', '../source.tar'], {cwd: artifact});
  await fs.rm(archive);

  // 2. Every extracted file must equal its committed blob byte for byte.
  const tree = treeEntries(source), mismatched = [];
  for (const [file, entry] of tree) { if (entry.type !== 'blob') continue; const data = await fs.readFile(path.join(artifact, file)); if (blobId(data) !== entry.oid) mismatched.push(file); }
  assert.deepEqual(mismatched, [], 'artifact bytes equal the source commit');

  // 3. Remove exclusions so the artifact is exactly what is published.
  const removed = [];
  for (const e of exclude) { const target = path.join(dist, e); if (!await exists(target)) throw Error('Exclusion not found in source: dist/' + e); const st = await fs.stat(target); if (st.isDirectory()) removed.push(...(await listing(target)).map(f => path.relative(dist, f).replace(/\\/g, '/'))); else removed.push(e); await fs.rm(target, {recursive: true}); }

  // 4. Stamp. The old token is whatever the committed game entry imports.
  const game = await fs.readFile(path.join(dist, 'game.html'), 'utf8');
  const oldToken = /src="app\.mjs\?v=([^"]+)"/.exec(game)?.[1];
  assert.ok(oldToken, 'game.html imports app.mjs?v=<token>');
  assert.notEqual(oldToken, version);
  const stamped = [], badEncoding = [];
  for (const file of await distFiles()) {
    if (!TEXT.test(file) || file === 'offline-list.js') continue;
    const bytes = await fs.readFile(path.join(dist, file)), before = bytes.toString('utf8'), after = stampText(before, oldToken);
    if (after === before) continue;
    if (!Buffer.from(before, 'utf8').equals(bytes)) { badEncoding.push(file); continue; }
    await fs.writeFile(path.join(dist, file), after); stamped.push(file);
  }
  assert.deepEqual(badEncoding, [], 'stamped files are valid UTF-8');
  const leftovers = [];
  for (const file of await distFiles()) { if (!TEXT.test(file) || file === 'offline-list.js') continue; const t = await fs.readFile(path.join(dist, file), 'utf8'); if (t.includes('?v=' + oldToken) || t.includes("'" + oldToken + "'") || t.includes('"' + oldToken + '"')) leftovers.push(file); }
  assert.deepEqual(leftovers, [], 'no old version token remains');
  const gameVersion = /GAME_VERSION\s*=\s*'([^']+)'/.exec(await fs.readFile(path.join(dist, 'build-version.mjs'), 'utf8'))?.[1];
  assert.equal(gameVersion, version, 'GAME_VERSION');
  assert.ok((await fs.readFile(path.join(dist, 'game.html'), 'utf8')).includes('app.mjs?v=' + version));
  // Mentions of the outgoing public label are only reported (for example changelog text).
  const publicTokenMentions = [];
  for (const file of await distFiles()) { if (!TEXT.test(file) || file === 'offline-list.js') continue; if ((await fs.readFile(path.join(dist, file), 'utf8')).includes(publicRelease.version)) publicTokenMentions.push(file); }

  // 5. Regenerate the offline graph inside the artifact with the committed generator.
  execFileSync(process.execPath, ['scripts/pwa-assets.mjs'], {cwd: artifact, stdio: 'inherit'});
  const offline = await offlineList();
  assert.equal(offline.release, version, 'offline-list release');
  const missingFiles = []; for (const f of offline.files) if (!await exists(path.join(dist, f))) missingFiles.push(f);
  assert.deepEqual(missingFiles, [], 'every graph file exists');
  const listedExcluded = offline.files.filter(f => exclude.some(e => f === e || f.startsWith(e.endsWith('/') ? e : e + '/')));
  assert.deepEqual(listedExcluded, [], 'graph lists no excluded file');
  const required = [...new Set([...DEFAULT_REQUIRE, ...opts.require.map(toDist)])], missingRequired = required.filter(f => !offline.files.includes(f));
  assert.deepEqual(missingRequired, [], 'graph contains every required file');
  const previousGraph = parseList(git(['show', pagesBaseline + ':offline-list.js']));
  const allowRemoval = new Set(opts['allow-graph-removal'].map(toDist));
  const removedFromGraph = previousGraph.files.filter(f => !offline.files.includes(f));
  assert.deepEqual(removedFromGraph.filter(f => !allowRemoval.has(f)), [], 'files in the public graph stay in the graph (use --allow-graph-removal after review)');
  const addedToGraph = offline.files.filter(f => !previousGraph.files.includes(f));

  // 6. Heuristic: local file literals in graph code/markup that exist in dist but are not listed.
  // worker.js is registered, not cached through the list; publish/verify cover it separately.
  const graph = new Set(offline.files), allowUnlisted = new Set(['worker.js', ...DEFAULT_ALLOW_UNLISTED, ...opts['allow-unlisted'].map(toDist)]), unlisted = new Map();
  const literal = /["'`(]((?:\.{1,2}\/)?[\w@][\w./-]*\.(?:mjs|js|css|html|svg|png|webp|jpg|jpeg|gif|mp3|mp4|webm|ogg|wav|ttf|woff2?|json|webmanifest))(?:[?#][^"'`)\s]*)?["'`)]/g;
  for (const file of offline.files) {
    if (!/\.(mjs|js|html|css)$/.test(file)) continue;
    const text = await fs.readFile(path.join(dist, file), 'utf8');
    for (const [, ref] of text.matchAll(literal)) {
      if (/^[a-z]+:/i.test(ref)) continue;
      for (const candidate of new Set([path.posix.normalize(path.posix.join(path.posix.dirname(file), ref)), path.posix.normalize(ref.replace(/^\.\//, ''))])) {
        if (candidate.startsWith('..') || graph.has(candidate) || allowUnlisted.has(candidate)) continue;
        if (await exists(path.join(dist, candidate)) && (await fs.stat(path.join(dist, candidate))).isFile()) { if (!unlisted.has(candidate)) unlisted.set(candidate, new Set()); unlisted.get(candidate).add(file); }
      }
    }
  }
  const unlistedReport = Object.fromEntries([...unlisted].map(([f, by]) => [f, [...by].sort()]));
  // Published files that still mention an excluded path would link to something not published.
  const excludedMentions = {};
  for (const e of exclude) for (const file of await distFiles()) { if (!TEXT.test(file)) continue; if ((await fs.readFile(path.join(dist, file), 'utf8')).includes(e)) (excludedMentions[e] ||= []).push(file); }

  const {digest, files} = await artifactDigest();
  const report = {passed: Object.keys(unlistedReport).length === 0, version, source, sourceOnMain, pagesBaseline, publicRelease, oldToken, artifact, exclude, removedExcludedFiles: removed.length, stampedFiles: stamped.length, stamped, gameVersion, publicTokenMentions, offline: {files: offline.files.length, revision: offline.revision, required, addedToGraph, removedFromGraph, previousGraphFiles: previousGraph.files.length}, unlistedReferences: unlistedReport, excludedMentions, distFiles: Object.keys(files).length, artifactDigest: digest, fileHashes: files};
  await writeReport('prepare-report.json', report);
  assert.deepEqual(unlistedReport, {}, 'possible runtime dependencies missing from the graph (see prepare-report.json unlistedReferences; regenerate roots or pass --allow-unlisted after review)');
  log('prepared', JSON.stringify({source, oldToken, stamped: stamped.length, offline: offline.files.length, revision: offline.revision, distFiles: report.distFiles, sourceOnMain}));
}

async function requirePassed(name) { const r = await readReport(name); assert.equal(r.passed, true, name + ' must have passed'); return r; }
async function artifactUnchanged() { const prep = await requirePassed('prepare-report.json'); const {digest} = await artifactDigest(); assert.equal(digest, prep.artifactDigest, 'artifact changed since prepare'); return prep; }

// ---------- check ----------
async function check() {
  const prep = await artifactUnchanged();
  const scripts = (await distFiles()).filter(f => /\.(mjs|js)$/.test(f)), syntaxFailures = [];
  await pool(scripts, 8, file => new Promise(resolve => { const p = spawn(process.execPath, ['--check', path.join(dist, file)], {stdio: ['ignore', 'ignore', 'pipe']}); let err = ''; p.stderr.on('data', d => err += d); p.on('close', code => { if (code) syntaxFailures.push({file, err: err.slice(0, 2000)}); resolve(); }); }));
  const tests = opts.tests ? opts.tests.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_TESTS;
  for (const t of tests) assert.ok(await exists(path.join(artifact, t)), 'test file in artifact: ' + t);
  const run = spawnSync(process.execPath, ['--test', ...tests], {cwd: artifact, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  const output = (run.stdout || '') + (run.stderr || '');
  await fs.writeFile(path.join(out, 'artifact-tests.log'), output);
  const count = name => Number(new RegExp('ℹ ' + name + ' (\\d+)').exec(output)?.[1] ?? NaN);
  const tally = {tests: count('tests'), pass: count('pass'), fail: count('fail'), cancelled: count('cancelled'), skipped: count('skipped'), todo: count('todo')};
  const report = {passed: syntaxFailures.length === 0 && run.status === 0 && tally.fail === 0 && tally.pass > 0, version, source: prep.source, artifactDigest: prep.artifactDigest, syntaxChecked: scripts.length, syntaxFailures, testFiles: tests, tally, exitCode: run.status};
  await writeReport('check-report.json', report);
  assert.deepEqual(syntaxFailures, [], 'node --check');
  assert.equal(report.passed, true, 'focused tests (see artifact-tests.log)');
  log('checked', JSON.stringify({syntax: scripts.length, ...tally}));
}

// ---------- headless Chrome ----------
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, seconds = 60) { const end = Date.now() + seconds * 1000; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await delay(150); } throw Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : '')); }
async function chrome(extra = []) {
  const executable = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'orbix-release-'));
  const browser = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--remote-debugging-port=0', '--user-data-dir=' + profile, ...extra, 'about:blank'], {windowsHide: true, stdio: 'ignore'});
  const port = await until(async () => Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]), 'Chrome start');
  const target = await until(async () => (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(t => t.type === 'page'), 'Chrome page');
  const socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => socket.addEventListener('open', r, {once: true}));
  let serial = 0; const pending = new Map(), events = [];
  socket.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) { const [res, rej] = pending.get(m.id); pending.delete(m.id); m.error ? rej(Error(m.error.message)) : res(m.result); return; }
    const p = m.params;
    if (m.method === 'Runtime.exceptionThrown') events.push({kind: 'exception', text: p.exceptionDetails.exception?.description || p.exceptionDetails.text});
    else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') events.push({kind: 'console', text: p.args.map(a => a.value ?? a.description ?? '').join(' ')});
    else if (m.method === 'Log.entryAdded' && p.entry.level === 'error') events.push({kind: 'log', text: p.entry.text, url: p.entry.url});
    else if (m.method === 'Network.responseReceived' && p.response.status >= 400) events.push({kind: 'http', status: p.response.status, url: p.response.url});
    else if (m.method === 'Network.loadingFailed' && !p.canceled) events.push({kind: 'failed', text: p.errorText, id: p.requestId});
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++serial; pending.set(id, [res, rej]); socket.send(JSON.stringify({id, method, params})); });
  const ev = async expression => { const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
  return {send, ev, events, mark: () => events.length, since: i => events.slice(i).filter(e => !/favicon\.ico/.test(e.url || '')),
    visit: url => send('Page.navigate', {url}),
    offline: on => send('Network.emulateNetworkConditions', {offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1}),
    viewport: (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile}),
    shot: async file => fs.writeFile(file, Buffer.from((await send('Page.captureScreenshot', {format: 'png'})).data, 'base64')),
    close: async () => { try { socket.close(); } catch {} browser.kill(); for (let i = 0; i < 20; i++) { try { await fs.rm(profile, {recursive: true, force: true}); break; } catch { await delay(250); } } }};
}
const TYPES = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain'};
// Serves the artifact. While `previous` is set, paths that exist on the given Pages
// commit are served from that commit instead, which reproduces the installed release.
async function artifactServer(pagesCommit) {
  const oldFiles = pagesCommit ? new Set(git(['ls-tree', '-r', '--name-only', pagesCommit]).split(/\r?\n/)) : new Set(), oldCache = new Map(), missing = [];
  const state = {previous: false, missing};
  const server = http.createServer(async (req, res) => {
    try {
      const file = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'index.html';
      assert.ok(!file.includes('..'));
      let body;
      if (state.previous && oldFiles.has(file)) { if (!oldCache.has(file)) oldCache.set(file, gitRaw(['show', pagesCommit + ':' + file])); body = oldCache.get(file); }
      else body = await fs.readFile(path.join(dist, file));
      const type = TYPES[path.extname(file)] || 'application/octet-stream', range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (range && type.startsWith('video/')) { const start = Number(range[1] || 0), end = range[2] ? Number(range[2]) : body.length - 1; res.writeHead(206, {'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store'}).end(body.subarray(start, end + 1)); return; }
      res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'}).end(body);
    } catch { if (!/favicon\.ico/.test(req.url)) missing.push(req.url); res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(opts.port ? Number(opts.port) : 0, '127.0.0.1', r));
  state.port = server.address().port; state.host = 'release-probe.test'; state.base = `http://${state.host}:${state.port}/`;
  state.flags = ['--no-proxy-server', `--host-resolver-rules=MAP ${state.host} 127.0.0.1`, '--unsafely-treat-insecure-origin-as-secure=' + state.base];
  state.close = () => new Promise(r => server.close(r));
  return state;
}
const frameDoc = `(document.querySelector('#game-frame')?.contentDocument||document)`;
const versionIs = v => `${frameDoc}.querySelector('[data-game-version]')?.dataset.gameVersion===${JSON.stringify(v)}`;
const completeCache = (rev, count) => `(async()=>{if(!navigator.serviceWorker.controller)return false;const name=(await caches.keys()).find(k=>k.endsWith(':${version}:${rev}'));if(!name)return false;const n=(await (await caches.open(name)).keys()).length;return n===${count}?{name,files:n}:false;})()`;
const onlineProblems = list => list.filter(e => e.kind !== 'failed' || !/ERR_ABORTED/.test(e.text));
function diffJson(a, b, at = '') {
  if (Object.is(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) { const out = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out.push(...diffJson(a[k], b[k], at ? at + '.' + k : k)); return out; }
  return [{path: at, before: a, after: b}];
}
// Allowed save changes: the documented one-time tutorial-evidence marker of
// dist/model.mjs cleanProfile, and the onboarding stage alignment documented in
// collector-cards-1 for tutorial-complete profiles. Anything else fails.
function classifySaveDiff(before, after) {
  if (before === after) return {identical: true, allowed: [], unexpected: []};
  if (before == null || after == null) return {identical: false, allowed: [], unexpected: [{path: '<save>', before: before == null ? null : 'present', after: after == null ? null : 'present'}]};
  const b = JSON.parse(before), a = JSON.parse(after), p = b.profile || {};
  const history = (p.stats?.completedRuns > 0) || (p.clearedFlights > 0) || (p.bankedRuns?.length > 0);
  const allowed = [], unexpected = [];
  for (const d of diffJson(b, a)) {
    if (d.path === 'profile.tutorialEvidenceChecked' && d.before !== true && d.after === true) allowed.push({...d, reason: 'one-time tutorial evidence marker'});
    else if (d.path === 'profile.tutorialComplete' && d.before === false && d.after === true && history && p.tutorialEvidenceChecked !== true) allowed.push({...d, reason: 'profile with play history skips the First Light gate'});
    else if (d.path === 'profile.onboarding.stage' && a.profile?.tutorialComplete === true) allowed.push({...d, reason: 'completed tutorial profile onboarding alignment'});
    else unexpected.push(d);
  }
  return {identical: false, allowed, unexpected};
}

async function browser() {
  const prep = await artifactUnchanged(); await requirePassed('check-report.json');
  const offline = await offlineList(), server = await artifactServer(prep.pagesBaseline), shots = path.join(out, 'shots');
  await fs.mkdir(shots, {recursive: true});
  const report = {passed: false, version, source: prep.source, artifactDigest: prep.artifactDigest, revision: offline.revision, pagesBaseline: prep.pagesBaseline, previousVersion: prep.publicRelease.version};
  const fail = async (b, name, error) => { try { await b.shot(path.join(shots, name + '-failure.png')); report[name + 'FailurePage'] = await b.ev('location.href+"\\n"+document.body.innerText.slice(0,3000)'); } catch {} report.error = String(error.stack || error); report.events = b.events; await writeReport('browser-report.json', report); };
  try {
    // A. Every offline graph URL answers 200 with the artifact bytes.
    const graphFailures = [];
    await pool([...offline.files, 'worker.js', 'offline-list.js'], 8, async f => { const r = await fetch(`http://127.0.0.1:${server.port}/${f.split('/').map(encodeURIComponent).join('/')}?v=${version}`); const body = Buffer.from(await r.arrayBuffer()); if (r.status !== 200 || !body.equals(await fs.readFile(path.join(dist, f)))) graphFailures.push({file: f, status: r.status}); });
    report.graphHttp = {checked: offline.files.length + 2, failures: graphFailures};
    assert.deepEqual(graphFailures, [], 'offline graph URLs');

    // B. Fresh profile: Home boots without errors, worker caches the complete graph, offline Home works.
    let b = await chrome(server.flags);
    try {
      await b.viewport(1280, 800, false); let m = b.mark();
      await b.visit(server.base + '?v=' + version);
      await until(() => b.ev(versionIs(version)), 'root boots to the new game', 90);
      await until(() => b.ev(`!!${frameDoc}.querySelector('.front-new-button')`), 'Home menu', 60);
      report.homeCardsMode = await b.ev(`${frameDoc}.body.classList.contains('card-pilot')`);
      await b.shot(path.join(shots, 'home-desktop.png'));
      report.cache = await until(() => b.ev(completeCache(offline.revision, offline.files.length)), 'complete worker cache', 240);
      await delay(1500); report.bootProblems = onlineProblems(b.since(m));
      assert.deepEqual(report.bootProblems, [], 'boot: no console errors, exceptions or failed requests');
      await b.viewport(740, 333, true); await b.offline(true);
      await b.visit(server.base + 'game.html?cards=1&display=native&v=' + version);
      await until(() => b.ev(`document.readyState==='complete'&&!!document.querySelector('.front-new-button')&&` + versionIs(version)), 'offline Home', 60);
      await b.shot(path.join(shots, 'offline-home-phone.png'));
      await b.visit(server.base + 'loading.html'); await until(() => b.ev(`document.readyState==='complete'`), 'offline loading page');
      report.offlineLazyImport = await b.ev(`import('./collector-vortex.mjs?v=${version}').then(m=>Object.keys(m).length)`);
      assert.ok(report.offlineLazyImport > 0, 'offline lazy module import');
      report.offlineExceptions = b.events.filter(e => e.kind === 'exception');
      assert.deepEqual(report.offlineExceptions, [], 'no exceptions offline');
      report.freshInstall = true;
    } catch (e) { await fail(b, 'fresh', e); throw e; } finally { await b.close(); }

    // C. Fresh profile: New Game reaches First Light (practice run).
    b = await chrome(server.flags);
    try {
      await b.viewport(740, 333, true); const m = b.mark();
      await b.visit(server.base + 'game.html?cards=1&display=native&v=' + version);
      await until(() => b.ev(`document.readyState==='complete'&&!!document.querySelector('.front-new-button')&&` + versionIs(version)), 'phone Home', 90);
      await b.ev(`document.querySelector('.front-new-button').click()`);
      report.newGame = await until(() => b.ev(`(()=>{const s=JSON.parse(localStorage.getItem(${JSON.stringify(CARDS_SAVE)})||'null');return s?.run?.isTutorial===true&&!document.querySelector('.front-new-button')?{isTutorial:true,phase:s.run.phase,mentionsFirstLight:/first light/i.test(document.body.innerText)}:false;})()`), 'New Game enters First Light', 60);
      await delay(1500); await b.shot(path.join(shots, 'new-game-first-light.png'));
      report.newGameProblems = onlineProblems(b.since(m));
      assert.deepEqual(report.newGameProblems, [], 'New Game: no console errors or failed requests');
    } catch (e) { await fail(b, 'newGame', e); throw e; } finally { await b.close(); }

    // D. Upgrade from the currently published release with existing saves.
    b = await chrome(server.flags); const old = prep.publicRelease.version;
    try {
      server.previous = true; await b.viewport(740, 333, true);
      await b.visit(server.base + 'game.html?cards=1&display=native');
      await until(() => b.ev(`document.readyState==='complete'&&!!document.querySelector('.front-new-button')`), 'previous release Home', 90);
      await until(() => b.ev(`navigator.serviceWorker.controller&&caches.keys().then(k=>k.some(n=>n.includes(':${old}:')))`), 'previous worker installed', 240);
      await b.visit(server.base + 'loading.html'); await until(() => b.ev(`document.readyState==='complete'`), 'loading page');
      // Fixtures are written by the previous release's own model. Update this block if its API changes.
      await b.ev(`(async()=>{const M=await import('./model.mjs?v=${old}'),{createComponentFixture}=await import('./ui/gallery-fixtures.mjs?v=${old}');
        const legacy=M.newState();legacy.run=M.createRun(legacy.profile,'release-legacy-kept');legacy.profile.stats.completedRuns=1;M.saveState(legacy,localStorage);
        const s=createComponentFixture('route','wayfinder');s.settings.skipTutorial=true;M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);s.profile.tutorialComplete=false;s.profile.stats.completedRuns=Math.max(1,s.profile.stats.completedRuns||0);
        M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
      await b.visit(server.base + 'game.html?cards=1&display=native');
      await until(() => b.ev(`document.readyState==='complete'&&!!document.querySelector('.front-continue')`), 'previous release shows Continue', 60);
      const snapshot = () => b.ev(`({legacy:localStorage.getItem(${JSON.stringify(SAVE)}),cards:localStorage.getItem(${JSON.stringify(CARDS_SAVE)})})`);
      const before = await snapshot(); assert.ok(before.legacy && before.cards, 'both fixture saves exist');
      server.previous = false; const m = b.mark();
      await b.visit(server.base + 'cards.html?v=' + version);
      await until(() => b.ev(versionIs(version)), 'installed worker upgrades the phone link to the new build', 180);
      await until(() => b.ev(`!!${frameDoc}.querySelector('.front-continue')`), 'Continue after upgrade', 60);
      report.upgradeNormalGame = await b.ev(`!new URL(document.querySelector('#game-frame')?.src||location.href).searchParams.has('mock')`);
      await until(() => b.ev(completeCache(offline.revision, offline.files.length)), 'complete new cache after upgrade', 240);
      report.retainedPreviousCache = await b.ev(`caches.keys().then(k=>k.some(n=>n.includes(':${old}:')))`);
      const afterCards = await snapshot();
      report.cardsSave = classifySaveDiff(before.cards, afterCards.cards);
      report.legacyAfterCardsUpgrade = classifySaveDiff(before.legacy, afterCards.legacy);
      await b.shot(path.join(shots, 'upgrade-continue.png'));
      await delay(1000); report.upgradeProblems = onlineProblems(b.since(m)).filter(e => !(e.kind === 'failed' && server.previous));
      // Offline after upgrade: Legacy mode loads its own save; then Continue in Cards.
      await b.offline(true);
      await b.visit(server.base + 'game.html?legacy=1&display=native&v=' + version);
      await until(() => b.ev(`document.readyState==='complete'&&!!document.querySelector('.front-continue')&&` + versionIs(version)), 'offline Legacy Home after upgrade', 60);
      await delay(1000);
      const afterLegacy = await snapshot();
      report.legacySave = classifySaveDiff(before.legacy, afterLegacy.legacy);
      report.cardsSaveAfterLegacyVisit = classifySaveDiff(before.cards, afterLegacy.cards);
      await fs.writeFile(path.join(out, 'upgrade-saves.json'), JSON.stringify({before, afterCardsUpgrade: afterCards, afterLegacyVisit: afterLegacy}, null, 2) + '\n');
      await b.visit(server.base + 'game.html?cards=1&display=native&v=' + version);
      await until(() => b.ev(`document.readyState==='complete'&&!!document.querySelector('.front-continue')`), 'offline Cards Continue', 60);
      await b.ev(`document.querySelector('.front-continue').click()`);
      await until(() => b.ev(`!document.querySelector('.front-continue')&&!!document.querySelector('#journey-map, .canvas-wrap canvas, dialog[open]')`), 'offline Continue opens the run', 60);
      await b.shot(path.join(shots, 'upgrade-offline-continue.png'));
      report.upgradeExceptions = b.events.filter(e => e.kind === 'exception');
      for (const key of ['cardsSave', 'legacyAfterCardsUpgrade', 'legacySave', 'cardsSaveAfterLegacyVisit']) assert.deepEqual(report[key].unexpected, [], key + ': only documented save changes');
      assert.deepEqual(report.upgradeProblems, [], 'upgrade: no console errors or failed requests');
      assert.deepEqual(report.upgradeExceptions, [], 'upgrade: no exceptions');
      assert.equal(report.retainedPreviousCache, true, 'previous complete cache retained during upgrade');
      assert.equal(report.upgradeNormalGame, true);
    } catch (e) { await fail(b, 'upgrade', e); throw e; } finally { await b.close(); }
    report.serverMissing = server.missing;
    assert.deepEqual(server.missing, [], 'server 404s');
    report.passed = true; delete report.events;
    await writeReport('browser-report.json', report);
    log('browser checks passed', JSON.stringify({cache: report.cache, newGame: report.newGame, cardsSave: report.cardsSave.allowed.map(d => d.path), legacySave: report.legacySave.allowed.map(d => d.path)}));
  } finally { await server.close(); }
}

// ---------- publish ----------
async function publish() {
  assert.ok(opts.publish || process.env.RELEASE_PUBLISH_GO === '1', 'publication needs --publish (or RELEASE_PUBLISH_GO=1)');
  const prep = await artifactUnchanged(); await requirePassed('check-report.json'); const br = await requirePassed('browser-report.json');
  assert.equal(br.artifactDigest, prep.artifactDigest);
  if (await exists(path.join(out, 'publication-report.json'))) throw Error('publication-report.json exists: this version was already published from this folder');
  git(['fetch', 'origin', 'main', 'gh-pages']);
  assert.equal(spawnSync('git', ['merge-base', '--is-ancestor', prep.source, 'origin/main'], {cwd: root}).status, 0, 'source commit is on origin/main');
  const previous = git(['rev-parse', 'origin/gh-pages']);
  assert.equal(previous, prep.pagesBaseline, 'gh-pages moved since prepare: review the newer public release, then start again');
  const offline = await offlineList(), files = await distFiles();
  const index = path.join(out, 'publication-index'); await fs.rm(index, {force: true});
  const env = {...process.env, GIT_INDEX_FILE: index};
  git(['read-tree', previous], {env});
  const rows = [], expected = new Map();
  for (const file of files) { const data = await fs.readFile(path.join(dist, file)), oid = git(['hash-object', '-w', '--no-filters', path.join(dist, file)]); assert.equal(oid, blobId(data), 'unfiltered blob ' + file); expected.set(file, oid); rows.push(`100644 ${oid}\t${file}`); }
  const metadata = {version, sourceCommit: prep.source, publishedAt: new Date().toISOString()}, metaBytes = Buffer.from(JSON.stringify(metadata, null, 2) + '\n');
  const metaOid = git(['hash-object', '-w', '--no-filters', '--stdin'], {input: metaBytes}); assert.equal(metaOid, blobId(metaBytes));
  expected.set('release.json', metaOid); rows.push(`100644 ${metaOid}\trelease.json`);
  git(['update-index', '--index-info'], {env, input: rows.join('\n') + '\n'});
  const tree = git(['write-tree'], {env});
  const before = treeEntries(previous), after = treeEntries(tree);
  let preserved = 0, changed = 0, added = 0, unchanged = 0; const problems = [];
  for (const [f, e] of before) {
    if (!after.has(f)) problems.push('deleted ' + f);
    else if (!expected.has(f)) { if (JSON.stringify(after.get(f)) !== JSON.stringify(e)) problems.push('changed unrelated ' + f); else preserved++; }
  }
  for (const [f, oid] of expected) { const a = after.get(f); if (!a || a.oid !== oid || a.mode !== '100644') problems.push('overlay mismatch ' + f); else if (!before.has(f)) added++; else if (before.get(f).oid !== oid) changed++; else unchanged++; }
  for (const f of after.keys()) if (!before.has(f) && !expected.has(f)) problems.push('unexpected new ' + f);
  assert.deepEqual(problems, [], 'overlay scope');
  assert.equal(git(['diff', '--name-only', '--diff-filter=D', previous, tree]), '', 'no deletions');
  const changedPaths = git(['diff', '--name-only', previous, tree]).split(/\r?\n/).filter(Boolean);
  assert.ok(changedPaths.every(f => expected.has(f)), 'only overlay paths change');
  const pages = git(['commit-tree', tree, '-p', previous, '-m', 'Publish ' + version]);
  const report = {passed: false, version, source: prep.source, previousPages: previous, pages, tree, metadata, revision: offline.revision, offlineFiles: offline.files.length, publishedDistFiles: files.length, overlayPaths: expected.size, overlayAdded: added, overlayChanged: changed, overlayUnchanged: unchanged, preservedPublicFiles: preserved, publicFilesBefore: before.size, publicFilesAfter: after.size, changedPaths};
  await writeReport('publication-report.json', report);
  log('pushing', pages, 'onto', previous);
  const push = spawnSync('git', ['push', 'origin', pages + ':refs/heads/gh-pages'], {cwd: root, encoding: 'utf8'});
  report.push = (push.stdout + push.stderr).trim(); report.passed = push.status === 0;
  await writeReport('publication-report.json', report);
  assert.equal(push.status, 0, 'git push: ' + report.push);
  await fs.rm(index, {force: true});
  log('published', JSON.stringify({pages, added, changed, unchanged, preserved}));
}

// ---------- wait / verify ----------
async function waitForPages() {
  const pub = await requirePassed('publication-report.json'), limit = Number(opts['wait-minutes'] || 12) * 60000, start = Date.now(); let seen;
  while (Date.now() - start < limit) {
    try { const r = await fetch(PUBLIC_BASE + 'release.json?verify=' + Date.now(), {cache: 'no-store'}); seen = await r.json(); if (seen.version === version && seen.sourceCommit === pub.source) break; } catch (e) { seen = String(e); }
    await delay(15000);
  }
  const passed = seen?.version === version && seen?.sourceCommit === pub.source;
  await writeReport('wait-report.json', {passed, version, seconds: Math.round((Date.now() - start) / 1000), releaseJson: seen});
  assert.ok(passed, 'public release.json did not report ' + version + ' in time: ' + JSON.stringify(seen));
  log('live', JSON.stringify(seen));
}
async function verify() {
  const pub = await requirePassed('publication-report.json'); await artifactUnchanged();
  const offline = await offlineList(), files = [...new Set([...offline.files, 'worker.js', 'offline-list.js', 'wispbound.webmanifest'])], failures = []; let verified = 0;
  const metadata = await (await fetch(PUBLIC_BASE + 'release.json?verify=' + Date.now(), {cache: 'no-store'})).json();
  assert.deepEqual(metadata, pub.metadata, 'public release.json');
  await pool(files, 6, async f => { let status = 0, actual = Buffer.alloc(0); for (let attempt = 0; attempt < 3; attempt++) { try { const r = await fetch(new URL(f.split('/').map(encodeURIComponent).join('/') + '?v=' + version, PUBLIC_BASE), {cache: 'no-store'}); status = r.status; actual = Buffer.from(await r.arrayBuffer()); break; } catch { await delay(2000); } } const expected = await fs.readFile(path.join(dist, f)); if (status !== 200 || !actual.equals(expected)) failures.push({file: f, status, actual: actual.length, expected: expected.length}); else verified++; });
  const report = {passed: false, version, metadata, verified, failures};
  if (failures.length) { await writeReport('verify-report.json', report); assert.deepEqual(failures, [], 'public exact bytes'); }
  // Public browser boot on a throwaway profile.
  const b = await chrome([]), shots = path.join(out, 'shots'); await fs.mkdir(shots, {recursive: true});
  try {
    await b.viewport(1280, 800, false); const m = b.mark();
    await b.visit(PUBLIC_BASE + '?v=' + version);
    await until(() => b.ev(versionIs(version)), 'public root loads ' + version, 120);
    await until(() => b.ev(`!!${frameDoc}.querySelector('.front-new-button')`), 'public Home', 60);
    await b.shot(path.join(shots, 'public-home-desktop.png'));
    report.publicCache = await until(() => b.ev(completeCache(offline.revision, offline.files.length)), 'public complete worker cache', 300);
    await b.viewport(740, 333, true);
    await b.visit(PUBLIC_BASE + 'cards.html?v=' + version);
    await until(() => b.ev(versionIs(version)), 'public phone link loads ' + version, 120);
    await b.shot(path.join(shots, 'public-phone-entry.png'));
    await delay(1500); report.publicProblems = onlineProblems(b.since(m));
    assert.deepEqual(report.publicProblems, [], 'public boot: no console errors or failed requests');
  } catch (e) { report.error = String(e.stack || e); report.events = b.events; await writeReport('verify-report.json', report); throw e; } finally { await b.close(); }
  report.passed = true; await writeReport('verify-report.json', report);
  const prep = await readReport('prepare-report.json'), check = await readReport('check-report.json');
  await writeReport('final-summary.json', {passed: true, version, url: PUBLIC_BASE + '?v=' + version, source: pub.source, pages: pub.pages, previousPages: pub.previousPages, releaseJson: metadata, revision: offline.revision, offlineFiles: offline.files.length, publicBytesVerified: verified, publishedDistFiles: pub.publishedDistFiles, overlayPaths: pub.overlayPaths, preservedPublicFiles: pub.preservedPublicFiles, excluded: prep.exclude, tests: check.tally, syntaxChecked: check.syntaxChecked});
  log('verified', JSON.stringify({verified, publicCache: report.publicCache}));
}

const steps = {prepare, check, browser, publish, wait: waitForPages, verify};
if (command === 'all') {
  const prepared = await exists(path.join(out, 'prepare-report.json')) && (await readReport('prepare-report.json')).passed;
  if (!prepared) await prepare(); else log('reusing prepared artifact');
  await check(); await browser();
  if (opts.publish || process.env.RELEASE_PUBLISH_GO === '1') { await publish(); await waitForPages(); await verify(); }
  else log('all checks passed; publication skipped (add --publish to publish)');
} else if (steps[command]) await steps[command]();
else { console.error('Usage: node scripts/release.mjs <prepare|check|browser|publish|wait|verify|all> --version <label> [--source <commit>] [--exclude dist/x/] [--require dist/y] [--publish]'); process.exit(2); }
