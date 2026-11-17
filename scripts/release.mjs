// Reusable GitHub Pages release for Orbix / Wispbound.
//
//   node scripts/release.mjs all --source <commit> --version <label> [options]
//
// Commands (each writes <command>-report.json under work/release-<version>/):
//   prepare  isolated artifact from `git archive <source>`, byte check against the
//            commit, exclusions removed, version stamped, offline graph regenerated
//   check    node --check of every artifact .mjs/.js and the focused test files,
//            run with the artifact as the tree under test
//   browser  headless Chrome probes on a local server of the artifact, served under the
//            same path as production (/orbix/): boot, fresh New Game, offline graph over
//            HTTP, complete worker cache, offline Home, an upgrade from the currently
//            published worker with save comparison, and a request audit (every image,
//            font, style, script and media request on Home, New Game, pause menu, Deck,
//            Rest and the first flight frame returns 200 inside the subpath)
//   subpath  only the request audit of the browser step (fast re-run while fixing)
//   publish  overlay commit on top of origin/gh-pages (temporary index,
//            hash-object --no-filters), scope checks, normal push. Needs --publish.
//   wait     poll the public release.json until it reports this version
//   verify   public exact bytes of graph + worker + manifest (a file is retried with backoff
//            on a 5xx or network error; retries are recorded), and a public browser boot
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
//   --allow-audit-url <text>            waive one request-audit finding whose URL contains <text>
//                                       (reviewed; waived findings stay listed in the report)
//   --allow-dev-page-removal            one-time reviewed cleanup: files may leave the graph if
//                                       only developer entry pages (scripts/pwa-assets.mjs
//                                       developerOnlyFiles) could reach them; listed in the report
//   --generator <path>    offline-list generator to run (default: the artifact's own
//                         scripts/pwa-assets.mjs). Use scripts/pwa-assets.mjs to test an
//                         uncommitted generator against a committed source.
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
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_BASE = 'https://mocanumarius.github.io/orbix/';
// The site lives under this path, so every browser check serves the artifact under it too.
const PUBLIC_PATH = new URL(PUBLIC_BASE).pathname;
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
// Importing this file (the tests do) only exposes the pure helpers: nothing runs unless it is the entry script.
const isMain = !!process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
const argv = isMain ? process.argv.slice(2) : [], command = argv[0], opts = {exclude: [], require: [], 'allow-graph-removal': [], 'allow-unlisted': [], 'allow-audit-url': []};
for (let i = 1; i < argv.length; i++) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(argv[i]);
  if (!m) throw Error('Unexpected argument ' + argv[i]);
  const [, key, inline] = m;
  if (key === 'publish') { opts.publish = true; continue; }
  if (key === 'allow-dev-page-removal') { opts[key] = true; continue; }
  const value = inline ?? argv[++i];
  if (value === undefined) throw Error('Missing value for --' + key);
  if (Array.isArray(opts[key])) opts[key].push(value); else opts[key] = value;
}
const version = opts.version;
if (isMain && !/^[a-z0-9][a-z0-9.-]*$/.test(version || '')) throw Error('--version <label> is required (lowercase letters, digits, dots, hyphens)');
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

// ---------- pure helpers (exported for tests/release-tool.test.mjs) ----------
// Public verification: retry a file on a 5xx status or a network error with backoff. A 2xx/3xx/4xx answer is
// final (a byte mismatch on a 200 is a real failure, not a transient one). Five attempts over about a minute.
export const VERIFY_RETRY_DELAYS_MS = [5000, 10000, 20000, 25000];
export async function fetchWithRetry(attemptFetch, {delays = VERIFY_RETRY_DELAYS_MS, sleep = ms => new Promise(r => setTimeout(r, ms))} = {}) {
  const retries = []; let last;
  for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
    try { last = {...await attemptFetch(), error: undefined}; if (last.status < 500) return {...last, attempts: attempt, retries}; retries.push({attempt, reason: 'HTTP ' + last.status}); }
    catch (e) { last = {status: 0, body: Buffer.alloc(0), error: String(e?.cause?.code || e?.message || e)}; retries.push({attempt, reason: 'network: ' + last.error}); }
    if (attempt <= delays.length) await sleep(delays[attempt - 1]);
  }
  return {...last, attempts: delays.length + 1, retries};
}
// Files that left the offline graph: each needs its own --allow-graph-removal, except that with
// --allow-dev-page-removal (developerOnly set) a file the generator classifies as reachable only from developer
// entry pages is accepted and listed as a developer-page removal. Everything else stays blocked.
export function classifyGraphRemovals(removed, {allow = new Set(), developerOnly = null} = {}) {
  const devPageRemovals = developerOnly ? removed.filter(f => developerOnly.has(f) && !allow.has(f)) : [], dev = new Set(devPageRemovals);
  return {devPageRemovals, blocked: removed.filter(f => !allow.has(f) && !dev.has(f))};
}
// Maps a request path to a file of the artifact. Only the public path is served; anything else is "outside".
export function servedFile(pathname, prefix = PUBLIC_PATH) {
  if (!pathname.startsWith(prefix)) return {inside: false, file: null};
  return {inside: true, file: decodeURIComponent(pathname.slice(prefix.length)) || 'index.html'};
}
// Request audit: entries are {url, type, status, failed, canceled, stage}. Reports every request to the probe
// origin that is outside the public path, answered with something other than 200 (206 for ranged media), or failed.
export function auditRequests(entries, {origin, prefix = PUBLIC_PATH}) {
  const problems = [];
  for (const e of entries) {
    let url; try { url = new URL(e.url); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || url.origin !== origin || /\/favicon\.ico$/.test(url.pathname)) continue;
    const where = {stage: e.stage, type: e.type, url: e.url, initiator: e.initiator};
    if (!url.pathname.startsWith(prefix)) problems.push({...where, reason: 'outside ' + prefix, status: e.status ?? null});
    else if (e.failed && !e.canceled) problems.push({...where, reason: 'failed: ' + e.failed});
    else if (e.status !== undefined && !(e.status === 200 || (e.status === 206 && e.type === 'Media'))) problems.push({...where, reason: 'status ' + e.status});
  }
  return problems;
}

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
  const generator = opts.generator ? path.resolve(root, opts.generator) : path.join(artifact, 'scripts', 'pwa-assets.mjs');
  execFileSync(process.execPath, [generator, '--dist', dist], {cwd: artifact, stdio: 'inherit'});
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
  // One-time reviewed cleanup: removals are accepted only for files the generator classifies as
  // reachable solely from developer entry pages. Any other removal still needs its own flag.
  let developerOnly = null;
  if (opts['allow-dev-page-removal']) {
    const generatorModule = await import(pathToFileURL(generator).href);
    assert.equal(typeof generatorModule.developerOnlyFiles, 'function', 'the generator has no developer-only classification (pass --generator scripts/pwa-assets.mjs)');
    developerOnly = new Set(await generatorModule.developerOnlyFiles(dist));
  }
  const {devPageRemovals, blocked} = classifyGraphRemovals(removedFromGraph, {allow: allowRemoval, developerOnly});
  assert.deepEqual(blocked, [], 'files in the public graph stay in the graph (use --allow-graph-removal after review, or --allow-dev-page-removal for developer-only files)');
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
  const report = {passed: Object.keys(unlistedReport).length === 0, version, source, sourceOnMain, pagesBaseline, publicRelease, oldToken, artifact, exclude, removedExcludedFiles: removed.length, stampedFiles: stamped.length, stamped, gameVersion, publicTokenMentions, offline: {files: offline.files.length, revision: offline.revision, required, addedToGraph, removedFromGraph, devPageRemovals, previousGraphFiles: previousGraph.files.length}, unlistedReferences: unlistedReport, excludedMentions, distFiles: Object.keys(files).length, artifactDigest: digest, fileHashes: files};
  await writeReport('prepare-report.json', report);
  assert.deepEqual(unlistedReport, {}, 'possible runtime dependencies missing from the graph (see prepare-report.json unlistedReferences; regenerate roots or pass --allow-unlisted after review)');
  log('prepared', JSON.stringify({source, oldToken, stamped: stamped.length, offline: offline.files.length, previousOffline: previousGraph.files.length, devPageRemovals: devPageRemovals.length, revision: offline.revision, distFiles: report.distFiles, sourceOnMain}));
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
  let serial = 0; const pending = new Map(), events = [], network = [], byId = new Map(), page = {stage: 'boot'};
  socket.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) { const [res, rej] = pending.get(m.id); pending.delete(m.id); m.error ? rej(Error(m.error.message)) : res(m.result); return; }
    const p = m.params;
    if (m.method === 'Runtime.exceptionThrown') events.push({kind: 'exception', text: p.exceptionDetails.exception?.description || p.exceptionDetails.text});
    else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') events.push({kind: 'console', text: p.args.map(a => a.value ?? a.description ?? '').join(' ')});
    else if (m.method === 'Log.entryAdded' && p.entry.level === 'error') events.push({kind: 'log', text: p.entry.text, url: p.entry.url});
    else if (m.method === 'Network.requestWillBeSent') {
      // A redirect reuses the request id: close the earlier hop with its own status first.
      if (p.redirectResponse && byId.has(p.requestId)) byId.get(p.requestId).status = p.redirectResponse.status;
      const entry = {url: p.request.url, type: p.type, stage: page.stage, initiator: p.initiator?.url || p.initiator?.stack?.callFrames?.[0]?.url || p.initiator?.type}; byId.set(p.requestId, entry); network.push(entry);
    }
    else if (m.method === 'Network.responseReceived') { if (byId.has(p.requestId)) byId.get(p.requestId).status = p.response.status; if (p.response.status >= 400) events.push({kind: 'http', status: p.response.status, url: p.response.url}); }
    else if (m.method === 'Network.loadingFailed') { if (byId.has(p.requestId)) Object.assign(byId.get(p.requestId), {failed: p.errorText, canceled: !!p.canceled}); if (!p.canceled) events.push({kind: 'failed', text: p.errorText, id: p.requestId}); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++serial; pending.set(id, [res, rej]); socket.send(JSON.stringify({id, method, params})); });
  const ev = async expression => { const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
  return {send, ev, events, network, page, mark: () => events.length, since: i => events.slice(i).filter(e => !/favicon\.ico/.test(e.url || '')),
    visit: url => send('Page.navigate', {url}),
    offline: on => send('Network.emulateNetworkConditions', {offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1}),
    viewport: (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile}),
    shot: async file => fs.writeFile(file, Buffer.from((await send('Page.captureScreenshot', {format: 'png'})).data, 'base64')),
    close: async () => { try { socket.close(); } catch {} browser.kill(); for (let i = 0; i < 20; i++) { try { await fs.rm(profile, {recursive: true, force: true}); break; } catch { await delay(250); } } }};
}
const TYPES = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain'};
// Serves the artifact under PUBLIC_PATH, like production (the site lives under /orbix/, not at the root).
// While `previous` is set, paths that exist on the given Pages commit are served from that commit
// instead, which reproduces the installed release. Requests outside PUBLIC_PATH answer 404 and are
// recorded in `outside`; missing files inside it are recorded in `missing`.
async function artifactServer(pagesCommit) {
  const oldFiles = pagesCommit ? new Set(git(['ls-tree', '-r', '--name-only', pagesCommit]).split(/\r?\n/)) : new Set(), oldCache = new Map(), missing = [], outside = [];
  const state = {previous: false, missing, outside};
  const server = http.createServer(async (req, res) => {
    try {
      const served = servedFile(new URL(req.url, 'http://x').pathname);
      if (!served.inside) { if (!/favicon\.ico/.test(req.url)) { outside.push(req.url); missing.push(req.url); } res.writeHead(404).end(); return; }
      const file = served.file;
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
  state.port = server.address().port; state.host = 'release-probe.test'; state.origin = `http://${state.host}:${state.port}`; state.base = state.origin + PUBLIC_PATH;
  state.flags = ['--no-proxy-server', `--host-resolver-rules=MAP ${state.host} 127.0.0.1`, '--unsafely-treat-insecure-origin-as-secure=' + state.origin];
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
  const allowed = [], unexpected = [];
  // reskin-1 (2026-11-17, owner decision): Field Impulse and Wave Loom are retired. On load every held
  // copy leaves the run and is paid at its melt value (dist/skill-cards.mjs retireHeldCards). Apply
  // exactly that to the old save, then compare: anything beyond it still fails.
  const RETIRED = {'field-impulse': 10, 'wave-loom': 40}, idOf = c => c && (typeof c === 'string' ? c : (c.cardId ?? c.id));
  if (b.run) {
    let paid = 0; const run = b.run;
    const strip = r => {
      if (Array.isArray(r?.reserveCards)) r.reserveCards = r.reserveCards.filter(c => !(idOf(c) in RETIRED && (r === run ? (paid += RETIRED[idOf(c)]) : 1)));
      if (Array.isArray(r?.mountedCards)) r.mountedCards = r.mountedCards.map(c => idOf(c) in RETIRED ? ((r === run ? (paid += RETIRED[idOf(c)]) : 0), null) : c);
    };
    strip(run); strip(run.attemptEntry);
    if (paid) {
      for (const k of ['condensedGlow', 'securedCondensedGlow', 'condensedEarned']) run[k] = (run[k] || 0) + paid;
      if (run.attemptEntry && 'condensedGlow' in run.attemptEntry) run.attemptEntry.condensedGlow += paid;
      allowed.push({path: 'run', before: 'held retired cards', after: `removed, paid ${paid} Stored Sparks`, reason: 'retired cards leave the run at melt value'});
    }
  }
  const history = (p.stats?.completedRuns > 0) || (p.clearedFlights > 0) || (p.bankedRuns?.length > 0);
  for (const d of diffJson(b, a)) {
    if (d.path === 'profile.tutorialEvidenceChecked' && d.before !== true && d.after === true) allowed.push({...d, reason: 'one-time tutorial evidence marker'});
    else if (d.path === 'profile.tutorialComplete' && d.before === false && d.after === true && history && p.tutorialEvidenceChecked !== true) allowed.push({...d, reason: 'profile with play history skips the First Light gate'});
    else if (d.path === 'profile.onboarding.stage' && a.profile?.tutorialComplete === true) allowed.push({...d, reason: 'completed tutorial profile onboarding alignment'});
    // dist/onboarding.mjs noteOnboardingProgress only ever raises the stage (max 4) as an experienced
    // profile continues a run. It gates first-run hints only. Reviewed 2026-11-16 for early-play-1.
    else if (d.path === 'profile.onboarding.stage' && Number.isInteger(d.before) && Number.isInteger(d.after) && d.after > d.before && d.after <= 4) allowed.push({...d, reason: 'onboarding progress note (stage only rises, hints only)'});
    // inscribe-1 (2026-11-18): artifacts are gone for players (owner: no conversion needed); a loaded run drops
    // them and gains an empty Inscription per Chain slot.
    else if (/^run\.(artifacts\.\d+|artifactCharges\.[a-z-]+)$/.test(d.path) && d.after === undefined) allowed.push({...d, reason: 'artifacts retired, replaced by slot Inscriptions'});
    else if (d.path === 'run.slotInscriptions' && d.before === undefined && Array.isArray(d.after) && d.after.every(x => x === null)) allowed.push({...d, reason: 'new empty slot Inscriptions'});
    // twin-wick-1 (2026-11-17): Twin Wick's run-wide unlock is gone (a card's effect lives on the card).
    else if (d.path === 'run.cardTwinWickUnlocked' && d.after === undefined) allowed.push({...d, reason: 'run-wide Twin Wick flag removed'});
    // card-rules-1 (2026-11-17): Forge counts crafts per rarity in the run. Old runs gain the tally at zero.
    else if (d.path === 'run.cardForgeTally' && d.before === undefined && d.after && Object.values(d.after).every(n => n === 0)) allowed.push({...d, reason: 'new Forge tally, starts at zero'});
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
    await pool([...offline.files, 'worker.js', 'offline-list.js'], 8, async f => { const r = await fetch(`http://127.0.0.1:${server.port}${PUBLIC_PATH}${f.split('/').map(encodeURIComponent).join('/')}?v=${version}`); const body = Buffer.from(await r.arrayBuffer()); if (r.status !== 200 || !body.equals(await fs.readFile(path.join(dist, f)))) graphFailures.push({file: f, status: r.status}); });
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
        let s;try{s=createComponentFixture('route','wayfinder')}catch{s=createComponentFixture('route','plain')} // courses-1 shipped a wayfinder fixture that throws on the new layouts
        s.settings.skipTutorial=true;M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);s.profile.tutorialComplete=false;s.profile.stats.completedRuns=Math.max(1,s.profile.stats.completedRuns||0);
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
    // E. Subpath request audit: the screens a player meets first, every request judged together.
    report.subpath = await subpathAudit(server);
    if (!report.subpath.passed) { report.error = 'subpath audit failed'; await writeReport('browser-report.json', report); }
    assert.equal(report.subpath.error, undefined, 'subpath audit completed every stage');
    assert.deepEqual(report.subpath.problems, [], 'subpath audit: every request returned 200 inside ' + PUBLIC_PATH + ' (see browser-report.json subpath.problems)');
    assert.deepEqual(report.subpath.exceptions, [], 'subpath audit: no exceptions');
    report.serverMissing = server.missing; report.serverOutsideSubpath = server.outside;
    assert.deepEqual(server.missing.filter(u => !opts['allow-audit-url'].some(a => u.includes(a))), [], 'server 404s (outside ' + PUBLIC_PATH + ' or missing inside it)');
    report.passed = true; delete report.events;
    await writeReport('browser-report.json', report);
    log('browser checks passed', JSON.stringify({cache: report.cache, newGame: report.newGame, cardsSave: report.cardsSave.allowed.map(d => d.path), legacySave: report.legacySave.allowed.map(d => d.path)}));
  } finally { await server.close(); }
}

// ---------- subpath request audit ----------
// Walks the screens a player meets first, on a server that serves the artifact under PUBLIC_PATH (like production).
// Every request of every stage is collected (stage label, resource type, status, initiator) and judged together at the
// end by auditRequests: anything outside PUBLIC_PATH, any non-200 answer and any failed request is listed with its URL.
// Stages: Home (desktop shell, phone), a new game to the map, the pause menu, the Deck screen (practice: Loaned Cards),
// the first flight frame, and the Rest screen (developer scene ?mock=rest, the existing way to reach Rest).
async function subpathAudit(server) {
  const b = await chrome(server.flags), stages = [], waived = [], allowed = opts['allow-audit-url'];
  const at = name => { b.page.stage = name; stages.push(name); };
  const click = sel => b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true;})()`);
  const step = (sel, label) => until(() => click(sel), label, 30);
  const present = (sel, label, seconds = 30) => until(() => b.ev(`!!document.querySelector(${JSON.stringify(sel)})`), label, seconds);
  const shots = path.join(out, 'shots'); await fs.mkdir(shots, {recursive: true});
  const report = {base: server.base, stages: {}, requests: 0, problems: [], waived, skipped: []};
  try {
    at('home-desktop'); await b.viewport(1280, 800, false);
    await b.visit(server.base + '?v=' + version);
    await until(() => b.ev(versionIs(version)), 'subpath audit: desktop root boots', 90);
    await until(() => b.ev(`!!${frameDoc}.querySelector('.front-new-button')`), 'subpath audit: desktop Home', 60);
    await delay(1500);
    at('home'); await b.viewport(740, 333, true);
    await b.visit(server.base + 'game.html?cards=1&display=native&v=' + version);
    await until(() => b.ev(`document.readyState==='complete'&&!!document.querySelector('.front-new-button')&&` + versionIs(version)), 'subpath audit: phone Home', 90);
    await delay(1500);
    at('new-game');
    await click('.front-new-button');
    await present('[data-action="preview-node"]', 'subpath audit: New Game reaches the map', 60);
    await delay(2000); await b.shot(path.join(shots, 'subpath-map.png'));
    at('pause-menu');
    await step('[data-action="menu"]', 'subpath audit: menu button');
    await present('dialog.wb-pause-sheet', 'subpath audit: pause menu');
    await delay(1500);
    at('deck');
    await step('dialog [data-action="skills"]', 'subpath audit: Loaned Cards entry');
    await present('.dk2-tab', 'subpath audit: Deck screen'); await delay(1000);
    await click('#dk2-tab-deck'); await delay(1000); await b.shot(path.join(shots, 'subpath-deck.png'));
    await click('#dk2-tab-chain'); await delay(500);
    await step('.dk2-done', 'subpath audit: close Deck');
    await until(() => b.ev(`!document.querySelector('dialog[open]')`), 'subpath audit: back on the map');
    at('first-flight-frame');
    await step('[data-action="preview-node"]', 'subpath audit: open the first stop');
    await step('dialog [data-action="node"]', 'subpath audit: start the flight');
    await present('.pixel-flight-canvas', 'subpath audit: flight canvas', 60); await present('#flap-btn', 'subpath audit: flight controls', 60);
    await delay(2500); await b.shot(path.join(shots, 'subpath-flight.png'));
    at('rest');
    await b.visit(server.base + 'game.html?mock=rest&cards=1&display=native&v=' + version);
    await present('.rest-benefit', 'subpath audit: Rest screen', 60); await delay(2000);
    await b.shot(path.join(shots, 'subpath-rest.png'));
  } catch (e) { report.error = String(e.stack || e); } finally { await b.close(); }
  const problems = auditRequests(b.network, {origin: server.origin}), keep = [];
  for (const p of problems) (allowed.some(a => p.url.includes(a)) ? waived : keep).push(p);
  for (const name of stages) report.stages[name] = b.network.filter(e => e.stage === name && e.url.startsWith(server.origin)).length;
  report.requests = b.network.filter(e => e.url.startsWith(server.origin)).length; report.problems = keep;
  report.exceptions = b.events.filter(e => e.kind === 'exception');
  report.passed = !report.error && keep.length === 0 && report.exceptions.length === 0;
  return report;
}

async function subpathOnly() {
  const prep = await artifactUnchanged(), server = await artifactServer(null);
  try {
    const report = {version, source: prep.source, artifactDigest: prep.artifactDigest, ...await subpathAudit(server), serverMissing: server.missing};
    await writeReport('subpath-report.json', report);
    assert.equal(report.error, undefined, 'subpath audit completed every stage');
    assert.deepEqual(report.problems, [], 'subpath audit: requests outside ' + PUBLIC_PATH + ' or not answered 200');
    assert.deepEqual(report.exceptions, [], 'subpath audit: no exceptions');
    assert.deepEqual(server.missing.filter(u => !opts['allow-audit-url'].some(a => u.includes(a))), [], 'server 404s');
    log('subpath audit passed', JSON.stringify(report.stages));
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
  const offline = await offlineList(), files = [...new Set([...offline.files, 'worker.js', 'offline-list.js', 'wispbound.webmanifest'])], failures = [], retried = []; let verified = 0;
  // A transient 5xx or network error is retried with backoff (5 attempts over about a minute, see fetchWithRetry); the
  // retries are recorded in the report. A 200 whose bytes differ, or a 4xx, is final and fails at once.
  const publicFetch = async url => fetchWithRetry(async () => { const r = await fetch(url, {cache: 'no-store'}); return {status: r.status, body: Buffer.from(await r.arrayBuffer())}; });
  const metaGet = await publicFetch(PUBLIC_BASE + 'release.json?verify=' + Date.now());
  assert.equal(metaGet.status, 200, 'public release.json status after ' + metaGet.attempts + ' attempt(s)');
  if (metaGet.retries.length) retried.push({file: 'release.json', attempts: metaGet.attempts, retries: metaGet.retries});
  const metadata = JSON.parse(metaGet.body.toString('utf8'));
  assert.deepEqual(metadata, pub.metadata, 'public release.json');
  await pool(files, 6, async f => {
    const got = await publicFetch(new URL(f.split('/').map(encodeURIComponent).join('/') + '?v=' + version, PUBLIC_BASE)), expected = await fs.readFile(path.join(dist, f));
    if (got.retries.length) retried.push({file: f, attempts: got.attempts, retries: got.retries, finalStatus: got.status});
    if (got.status !== 200 || !got.body.equals(expected)) failures.push({file: f, status: got.status, actual: got.body.length, expected: expected.length, attempts: got.attempts, retries: got.retries, error: got.error}); else verified++;
  });
  const report = {passed: false, version, metadata, verified, failures, retried};
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
  await writeReport('final-summary.json', {passed: true, version, url: PUBLIC_BASE + '?v=' + version, source: pub.source, pages: pub.pages, previousPages: pub.previousPages, releaseJson: metadata, revision: offline.revision, offlineFiles: offline.files.length, publicBytesVerified: verified, verifyRetries: retried.length, publishedDistFiles: pub.publishedDistFiles, overlayPaths: pub.overlayPaths, preservedPublicFiles: pub.preservedPublicFiles, excluded: prep.exclude, tests: check.tally, syntaxChecked: check.syntaxChecked});
  log('verified', JSON.stringify({verified, retried: retried.map(r => r.file + ' x' + r.attempts), publicCache: report.publicCache}));
}

const steps = {prepare, check, browser, subpath: subpathOnly, publish, wait: waitForPages, verify};
if (!isMain) { /* imported for its helpers only */ }
else if (command === 'all') {
  const prepared = await exists(path.join(out, 'prepare-report.json')) && (await readReport('prepare-report.json')).passed;
  if (!prepared) await prepare(); else log('reusing prepared artifact');
  await check(); await browser();
  if (opts.publish || process.env.RELEASE_PUBLISH_GO === '1') { await publish(); await waitForPages(); await verify(); }
  else log('all checks passed; publication skipped (add --publish to publish)');
} else if (steps[command]) await steps[command]();
else { console.error('Usage: node scripts/release.mjs <prepare|check|browser|subpath|publish|wait|verify|all> --version <label> [--source <commit>] [--exclude dist/x/] [--require dist/y] [--publish]'); process.exit(2); }
