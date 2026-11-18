// Trusted emulator benchmark: a repeatable protocol with a measured noise band.  Hands-off; never asks anyone to play.
//   node scripts/perf/android/bench.mjs suite   [--n 5] [--seconds 30] [--only marsh-late-mid,stress] [--label suite]
//   node scripts/perf/android/bench.mjs ab      [--scenario marsh-late-mid] [--rounds 5] [--seconds 30] [--conds base,gl0,sky0,edges1,scenery1,lowres1,dpr2,dpr1.5,dpr1]
//   node scripts/perf/android/bench.mjs window  [--scenario marsh-late-mid] [--n 4]    windowed vs -no-window emulator, picks the steadier
//   node scripts/perf/android/bench.mjs health                                           host quiet check + emulator health only
//   node scripts/perf/android/bench.mjs all     (suite, then ab; about 90 minutes)
//
// Protocol (one batch = one scenario):
//   1. host quiet check (CPU load over 3 s, busy-loop timing, GPU util/clock from nvidia-smi); waits up to 5 min for idle, records it
//   2. emulator health check (boot done, landscape, Chrome in front, battery saver off, animation scales default, thermal, emulator window not minimised)
//   3. `am force-stop com.android.chrome`, start Chrome again (cold but equal), attach, close stale tabs
//   4. one discarded warm-up flight, then N measured flights, fixed seed, real edge style (edge=spectral), starter or mid Chain, ?autopilot=1
//   5. per scenario: median, min, max and spread (max-min)/median of avg FPS, 1% low FPS, p95 frame time, frames over 33 ms;
//      avg-FPS spread > 15% = "unstable": the batch is run once more and both batches are kept.
//   Host CPU/GPU are sampled during every flight and stored with it, so a noisy run can be explained afterwards.
import {startServer} from './serve.mjs';
import {parseArgs, SCEN, DAY, PORT, delay, waitQuiet, emulatorHealth, restartChrome, restartEmulator, measureRetry, Session, monitor, metricsOf, summarize, median, save, fmtRun, emuWindow, gpuNow, adbTry, OUT} from './benchlib.mjs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {startBooster} from './boost.mjs';

export const CONDS = {
  base: {query: ''}, gl0: {query: 'gl=0'}, sky0: {query: 'sky=0'}, edges1: {query: 'edges=1'}, scenery1: {query: 'scenery=1'}, lowres1: {query: 'lowres=1'},
  dpr2: {dpr: 2}, 'dpr1.5': {dpr: 1.5}, dpr1: {dpr: 1},
  boost: {boost: true}, // base + a background desktop WebGL loop that lifts the host GPU out of its idle clock state (boost.mjs); not in the default list
};
const DEFAULT_CONDS = Object.keys(CONDS).filter(c => c !== 'boost');

/** One batch: preflight, Chrome restart, warm-up, N flights. */
export async function batch(name, {n = 5, seconds = 30, query = '', dpr = null, tag = ''} = {}, ses = new Session(), shared = false) {
  if (!ses.s) await ses.hard();
  else { await ses.s.goto('about:blank'); await delay(3000); } // Chrome on about:blank = emulator idle, so the quiet check does not count the game's own load
  const pre = {quiet: await waitQuiet(), health: await emulatorHealth()};
  console.log(`[${name}${tag}] host cpu ${pre.quiet.cpu}% (other ${pre.quiet.cpuOther}%) gpu ${pre.quiet.gpu?.util}% ${pre.quiet.gpu?.clockMHz}MHz loop ${pre.quiet.loopMs}ms quiet=${pre.quiet.quiet}; emulator ok=${pre.health.ok} ${pre.health.problems.join(',')}`);
  const out = {scenario: name, query, dpr, pre, runs: []};
  try {
    const r0 = ses.restarts; await ses.prepare(name, {query, dpr}); out.warmups = ses.warmups; out.restarts = ses.restarts - r0;
    for (let i = 0; i < n; i++) {
      const mon = monitor(); let r;
      try { r = await ses.fly({query, dpr, seconds}); } finally { var host = mon.stop(); }
      r.host = host; r.runIndex = i; out.runs.push(r); console.log(`   run ${i + 1}  ${fmtRun(r)}  host cpu ${host.cpuAvg}% gpu ${host.gpuUtilAvg}% @${host.gpuClockAvg}MHz  vis=${r.vis} dpr=${r.dpr} vp=${r.vp}`);
    }
    out.discarded = ses.discarded; ses.discarded = [];
  } finally { if (!shared) ses.close(); }
  out.metrics = metricsOf(out.runs); out.unstable = out.metrics.avgFps.spreadPct > 15;
  const m = out.metrics.avgFps; console.log(`   => median ${m.median} fps (min ${m.min}, max ${m.max}, spread ${m.spreadPct}%)${out.unstable ? '  UNSTABLE' : ''}`);
  return out;
}

async function suite(A) {
  const n = Number(A.n || 5), seconds = Number(A.seconds || 30), names = A.only ? String(A.only).split(',') : Object.keys(SCEN).filter(k => A.boss || k !== 'basalt-guardian'), label = A.label || 'suite'; // the Guardian flight hangs the emulator's GPU process (see report), --boss includes it anyway
  const srv = await startServer('dist', PORT), res = {day: DAY, n, seconds, startedAt: new Date().toISOString(), device: null, scenarios: {}, priming: {}};
  if (A.resume) { try { Object.assign(res, JSON.parse(await (await import('node:fs/promises')).readFile(path.join(OUT, label + '.json'), 'utf8'))); } catch {} }
  const ses = new Session(); // one Chrome for the whole suite, soft-reset between scenarios (see Session in benchlib.mjs)
  try {
    for (const name of names) {
      if (res.scenarios[name]) continue;
      const first = await batch(name, {n, seconds}, ses, true); const entry = {batches: [first]};
      if (first.unstable) { console.log(`[${name}] unstable (spread ${first.metrics.avgFps.spreadPct}% > 15%): re-running once`); entry.batches.push(await batch(name, {n, seconds, tag: ' re-run'}, ses, true)); }
      const fin = entry.batches.at(-1); entry.final = {metrics: fin.metrics, unstable: fin.unstable, reran: entry.batches.length > 1};
      res.scenarios[name] = entry; await save(`${label}.json`, res);
    }
  } finally { ses.close(); srv.close(); }
  console.log('\nscenario'.padEnd(24) + 'median  min   max  spread  1%low(med)  p95(med)  >33(med)');
  for (const [name, e] of Object.entries(res.scenarios)) { const m = e.final.metrics; console.log(name.padEnd(22) + `${m.avgFps.median}`.padStart(7) + `${m.avgFps.min}`.padStart(6) + `${m.avgFps.max}`.padStart(6) + `${m.avgFps.spreadPct}%`.padStart(8) + `${m.low1Fps.median}`.padStart(11) + `${m.p95Ms.median}`.padStart(10) + `${m.over33.median}`.padStart(10) + (e.final.unstable ? '  UNSTABLE' : '')); }
  return res;
}

/** A/B with every condition once per round, order rotated and reversed between rounds so drift cancels; Chrome restarts every round. */
async function ab(A) {
  const name = A.scenario || 'marsh-late-mid', rounds = Number(A.rounds || 5), seconds = Number(A.seconds || 30), conds = String(A.conds || DEFAULT_CONDS.join(',')).split(',');
  const label = A.label || 'ab', srv = await startServer('dist', PORT), res = {day: DAY, scenario: name, rounds, seconds, conds, runs: {}, order: []};
  for (const c of conds) res.runs[c] = [];
  const ses0 = new Session();
  try {
    for (let r = 0; r < rounds; r++) {
      let order = conds.map((_, i) => conds[(i + r * 2) % conds.length]); if (r % 2) order = order.reverse(); res.order.push(order);
      if (!ses0.s) await ses0.hard(); else { await ses0.s.goto('about:blank'); await delay(3000); } const ses = ses0; const quiet = await waitQuiet(); const health = await emulatorHealth(); res.pre ||= []; res.pre.push({quiet, health}); console.log(`[round ${r + 1}/${rounds}] ${order.join(' ')}  host cpu ${quiet.cpu}% gpu ${quiet.gpu?.util}% quiet=${quiet.quiet} emulator ok=${health.ok}`);
      try {
        await ses.prepare(name, {}); // warm-up until clean, discarded
        for (const c of order) {
          const booster = CONDS[c].boost ? await startBooster() : null; const mon = monitor(); let run;
          try { run = await ses.fly({seconds, query: CONDS[c].query || '', dpr: CONDS[c].dpr || null}); } finally { var host = mon.stop(); if (booster) { host.boosterGpu = booster.gpuAfterStart; await booster.stop(); } }
          run.host = host; run.round = r; run.cond = c; res.runs[c].push(run); console.log(`   ${c.padEnd(9)} ${fmtRun(run)}  dpr=${run.dpr} canvases=${(run.canvases || []).join(',')} host cpu ${host.cpuAvg}%`);
          await save(`${label}.json`, res);
        }
        res.discardedRuns = (res.discardedRuns || []).concat(ses.discarded.map(d => ({round: r, reason: d.discardedReason, avgFps: d.avgFps, longestMs: d.longestMs}))); ses.discarded = [];
      } catch (e) { console.log('round failed', e.message); throw e; }
    }
    ses0.close();
  } finally { srv.close(); }
  res.analysis = analyseAb(res); await save(`${label}.json`, res);
  printAb(res.analysis); return res;
}
export function analyseAb(res) {
  const base = res.runs.base || [], fps = r => r.avgFps, out = {};
  const bs = summarize(base.map(fps));
  for (const c of res.conds) {
    const runs = res.runs[c] || [], s = summarize(runs.map(fps)); if (!s) continue;
    const row = {cond: c, fps: s, low1Fps: summarize(runs.map(r => r.low1Fps)), p95Ms: summarize(runs.map(r => r.p95Ms)), over33: summarize(runs.map(r => r.over33))};
    if (c !== 'base' && bs) {
      const diffs = runs.map(r => { const b = base.find(x => x.round === r.round); return b ? r.avgFps - b.avgFps : null; }).filter(x => x !== null);
      const pos = diffs.filter(d => d > 0).length, neg = diffs.filter(d => d < 0).length, medDiff = median(diffs), rangeA = bs.max - bs.min, rangeB = s.max - s.min;
      const agree = Math.max(pos, neg) >= diffs.length - 1 && diffs.length >= 4;
      row.vsBase = {pairedDiffs: diffs.map(d => +d.toFixed(1)), medianPairedDiff: +medDiff.toFixed(2), medianDiff: +(s.median - bs.median).toFixed(2), pctDiff: +(100 * (s.median - bs.median) / bs.median).toFixed(1), baseRange: +rangeA.toFixed(1), condRange: +rangeB.toFixed(1), signAgree: `${Math.max(pos, neg)}/${diffs.length}`};
      row.vsBase.verdict = agree && Math.abs(medDiff) >= Math.max(1, 0.5 * Math.max(rangeA, rangeB)) ? (medDiff > 0 ? 'REAL gain' : 'REAL loss') : 'noise';
    }
    out[c] = row;
  }
  return out;
}
export function printAb(a) {
  console.log('\ncondition  median fps  (min-max)   vs base: diff  paired-median  sign  noise(range)  verdict');
  for (const r of Object.values(a)) console.log(r.cond.padEnd(10) + String(r.fps.median).padStart(9) + `  (${r.fps.min}-${r.fps.max})`.padEnd(14) + (r.vsBase ? `${r.vsBase.medianDiff >= 0 ? '+' : ''}${r.vsBase.medianDiff} (${r.vsBase.pctDiff}%)`.padStart(18) + String(r.vsBase.medianPairedDiff).padStart(10) + r.vsBase.signAgree.padStart(8) + String(Math.max(r.vsBase.baseRange, r.vsBase.condRange)).padStart(10) + '  ' + r.vsBase.verdict : '   (reference)'));
}

/** Windowed emulator vs -no-window: same scenario, N flights each, then keeps the steadier mode. */
async function windowTest(A) {
  const name = A.scenario || 'marsh-late-mid', n = Number(A.n || 4), seconds = Number(A.seconds || 30), srv = await startServer('dist', PORT), res = {day: DAY, scenario: name, n, seconds, modes: {}};
  try {
    for (const noWindow of [false, true]) {
      const mode = noWindow ? 'no-window' : 'windowed';
      const cur = emuWindow(); if (noWindow !== !!cur.noWindowFlag) { console.log('restarting emulator', mode); await restartEmulator({noWindow}); }
      const winState = emuWindow(); const b = await batch(name, {n, seconds, tag: ' ' + mode}); b.window = winState; res.modes[mode] = b; await save('window-test.json', res);
    }
    const w = res.modes.windowed.metrics.avgFps, nw = res.modes['no-window'].metrics.avgFps;
    // Steadier = smaller spread. Tie-break (spread within 3 points): the headless emulator, because it leaves the host CPU 70% idle (windowed saturates all
    // 24 threads, so any other host work steals time from the emulator) and the windowed present path throttles the guest 2.5x.
    res.chosen = w.spreadPct + 3 < nw.spreadPct ? 'windowed' : 'no-window';
    console.log(`windowed: median ${w.median} spread ${w.spreadPct}%   no-window: median ${nw.median} spread ${nw.spreadPct}%   chosen: ${res.chosen}`);
    if (res.chosen === 'windowed' && emuWindow().noWindowFlag) { await restartEmulator({noWindow: false}); }
    res.finalWindow = emuWindow(); await save('window-test.json', res);
  } finally { srv.close(); }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2], A = parseArgs(process.argv.slice(3));
  if (mode === 'health') { const s0 = await restartChrome(); s0.close(); const q = await waitQuiet({maxWaitMs: 60000}); const h = await emulatorHealth({fix: false}); console.log(JSON.stringify({quiet: q, health: h, gpu: gpuNow()}, null, 1)); }
  else if (mode === 'suite') await suite(A);
  else if (mode === 'ab') await ab(A);
  else if (mode === 'window') await windowTest(A);
  else if (mode === 'all') { await restartEmulator({noWindow: true}); await suite(A); await restartEmulator({noWindow: true}); await ab(A); } // a fresh headless emulator before each part: sessions slow down with uptime
  else console.log('modes: health | suite | ab | window | all');
}
