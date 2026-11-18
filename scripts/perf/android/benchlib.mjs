// Shared helpers for the trusted emulator benchmark (bench.mjs, where.mjs). No dependencies (Node 22+).
// Host quiet check, emulator health check, Chrome restart, one measured flight, summary statistics.
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync, execFile, spawn} from 'node:child_process';
import {delay, session, wake, ensureLandscape} from './cdp.mjs';
import {listTargets, ensureForward} from './connect.mjs';

process.env.PATH = `F:\\Android\\sdk\\platform-tools;F:\\Android\\sdk\\emulator;${process.env.PATH}`;
export const ENV = {...process.env, ANDROID_SDK_ROOT: 'F:\\Android\\sdk', ANDROID_AVD_HOME: 'F:\\Android\\avd'};
export const adb = (...a) => execFileSync('adb', a, {encoding: 'utf8', env: ENV, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']}).trim();
export const adbTry = (...a) => { try { return adb(...a); } catch (e) { return ''; } };
export {delay};
export const PORT = 4186;
export const DAY = new Date().toISOString().slice(0, 10);
export const OUT = path.resolve('outputs/perf/android', `${DAY}-bench`);
export const parseArgs = argv => { const A = {}; for (let i = 0; i < argv.length; i++) { const m = argv[i].match(/^--([^=]+)(?:=(.*))?$/); if (!m) continue; A[m[1]] = m[2] ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true); } return A; };

// ---------- scenarios (all with the real edge style, edge=spectral, added by flightUrl) ----------
export const SCEN = {
  'marsh-early-starter': {biome: 'marsh', course: 4, row: 'early', chain: 'starter'},
  'marsh-late-mid': {biome: 'marsh', course: 4, row: 'late', chain: 'mid'},
  'pinewood-late-mid': {biome: 'pinewood', course: 1, row: 'late', chain: 'mid'},
  'coral-late-mid': {biome: 'coral', course: 2, row: 'late', chain: 'mid'},
  'frost-late-mid': {biome: 'frost', course: 2, row: 'late', chain: 'mid'},
  'basalt-guardian': {biome: 'basalt', course: 1, row: 'late', chain: 'mid', guardian: 'hollow-sun', boss: true},
  'stress': {stress: true},
};

// ---------- statistics ----------
export const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
export function summarize(values) {
  const v = values.filter(x => Number.isFinite(x)); if (!v.length) return null;
  const med = median(v), min = Math.min(...v), max = Math.max(...v);
  return {n: v.length, median: +med.toFixed(2), min: +min.toFixed(2), max: +max.toFixed(2), spreadPct: med ? +(100 * (max - min) / med).toFixed(1) : null};
}
export const metricsOf = runs => ({
  avgFps: summarize(runs.map(r => r.avgFps)), low1Fps: summarize(runs.map(r => r.low1Fps)),
  p95Ms: summarize(runs.map(r => r.p95Ms)), over33: summarize(runs.map(r => r.over33)),
});

// ---------- host state ----------
const cpuTimes = () => os.cpus().reduce((a, c) => { const t = c.times; a.idle += t.idle; a.total += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, {idle: 0, total: 0});
const emuCpuSec = () => { try { return Number(execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', '(Get-Process qemu-system-x86_64* -ErrorAction SilentlyContinue | Measure-Object CPU -Sum).Sum'], {encoding: 'utf8', timeout: 15000}).trim()) || 0; } catch { return 0; } };
/** Total host CPU %, the emulator's own share, and everything else (the number that decides 'quiet'). */
export async function cpuLoadSplit(ms = 3000) { const a = cpuTimes(), e0 = emuCpuSec(), t0 = Date.now(); await delay(ms); const b = cpuTimes(), e1 = emuCpuSec(), dt = (Date.now() - t0) / 1000; const total = 100 * (1 - (b.idle - a.idle) / (b.total - a.total)), emu = 100 * (e1 - e0) / dt / os.cpus().length; return {total: +total.toFixed(1), emu: +emu.toFixed(1), other: +Math.max(0, total - emu).toFixed(1)}; }
export async function cpuLoad(ms = 3000) { return (await cpuLoadSplit(ms)).total; }
export function loopMs() { let best = 1e9; for (let k = 0; k < 3; k++) { const t = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x += i % 7; best = Math.min(best, performance.now() - t); if (x < 0) console.log(x); } return +best.toFixed(1); }
export function gpuNow() {
  try { const [u, c, t, p, ps] = execFileSync('nvidia-smi', ['--query-gpu=utilization.gpu,clocks.gr,temperature.gpu,power.draw,pstate', '--format=csv,noheader,nounits'], {encoding: 'utf8', timeout: 8000}).trim().split(/,\s*/); return {util: +u, clockMHz: +c, tempC: +t, powerW: +p, pstate: ps}; } catch { return null; }
}
/** Background sampler of host CPU and GPU during a flight. stop() returns the averages. */
export function monitor() {
  const cpu = [], gpu = []; let last = cpuTimes(), alive = true;
  const tick = () => {
    if (!alive) return; const b = cpuTimes(); cpu.push(100 * (1 - (b.idle - last.idle) / (b.total - last.total))); last = b;
    execFile('nvidia-smi', ['--query-gpu=utilization.gpu,clocks.gr,temperature.gpu', '--format=csv,noheader,nounits'], {timeout: 8000}, (e, out) => { if (!e && alive) { const [u, c, t] = String(out).trim().split(/,\s*/).map(Number); gpu.push({u, c, t}); } });
  };
  const timer = setInterval(tick, 3000);
  return {stop() {
    alive = false; clearInterval(timer); const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null;
    return {cpuAvg: avg(cpu), cpuMax: cpu.length ? +Math.max(...cpu).toFixed(1) : null, gpuUtilAvg: avg(gpu.map(g => g.u)), gpuClockAvg: avg(gpu.map(g => g.c)), gpuClockMin: gpu.length ? Math.min(...gpu.map(g => g.c)) : null, gpuTempMax: gpu.length ? Math.max(...gpu.map(g => g.t)) : null};
  }};
}
const PS_WIN = `$ProgressPreference='SilentlyContinue';Add-Type -TypeDefinition 'using System;using System.Text;using System.Runtime.InteropServices;public class W{[DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll",CharSet=CharSet.Auto)]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);}'
$p=Get-Process qemu-system-x86_64* -ErrorAction SilentlyContinue|Where-Object{$_.MainWindowHandle -ne 0}|Select-Object -First 1
$fg=[W]::GetForegroundWindow();$sb=New-Object System.Text.StringBuilder 200;[void][W]::GetWindowText($fg,$sb,200)
$cmd=(Get-CimInstance Win32_Process -Filter "Name LIKE 'qemu-system-x86_64%'"|Select-Object -First 1).CommandLine
if($p){$h=$p.MainWindowHandle;@{window=$true;title=$p.MainWindowTitle;iconic=[W]::IsIconic($h);visible=[W]::IsWindowVisible($h);foreground=($fg -eq $h);foregroundTitle=$sb.ToString();noWindowFlag=($cmd -match '-no-window');gpu=([regex]::Match($cmd,'-gpu\\s+(\\S+)').Groups[1].Value)}|ConvertTo-Json -Compress}else{@{window=$false;foregroundTitle=$sb.ToString();noWindowFlag=($cmd -match '-no-window');gpu=([regex]::Match($cmd,'-gpu\\s+(\\S+)').Groups[1].Value)}|ConvertTo-Json -Compress}`;
export function emuWindow() {
  try { const enc = Buffer.from(PS_WIN, 'utf16le').toString('base64'); return JSON.parse(execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', enc], {encoding: 'utf8', timeout: 30000}).trim()); } catch (e) { return {error: String(e.message).slice(0, 200)}; }
}
/** Wait until the host is quiet (CPU and GPU idle). Records what it saw; proceeds (flagged) after maxWaitMs. */
export async function waitQuiet({maxWaitMs = 300000, cpuMax = 4, gpuMax = 10} = {}) {
  const t0 = Date.now(), samples = [];
  for (;;) {
    const split = await cpuLoadSplit(3000), cpu = split.total, gpu = gpuNow(); samples.push({...split, gpuUtil: gpu?.util ?? null});
    const quiet = split.other <= cpuMax && (gpu?.util ?? 0) <= gpuMax;
    if (quiet || Date.now() - t0 > maxWaitMs) return {quiet, waitedS: Math.round((Date.now() - t0) / 1000), cpu, cpuOther: split.other, cpuEmulator: split.emu, gpu, loopMs: loopMs(), samples: samples.slice(-4)};
  }
}

// ---------- emulator health ----------
export async function emulatorHealth({fix = true} = {}) {
  const h = {problems: [], fixed: []};
  h.bootComplete = adbTry('shell', 'getprop', 'sys.boot_completed') === '1'; if (!h.bootComplete) h.problems.push('boot not complete');
  h.focus = (adbTry('shell', 'dumpsys', 'window').match(/mCurrentFocus=.*/) || [''])[0].trim();
  if (!/com\.android\.chrome/.test(h.focus)) { h.problems.push('Chrome not foreground'); if (fix) { wake(); await delay(2000); h.fixed.push('brought Chrome to front'); } }
  h.userRotation = adbTry('shell', 'settings', 'get', 'system', 'user_rotation');
  if (h.userRotation !== '1') { h.problems.push('rotation not landscape'); if (fix) { adbTry('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0'); adbTry('shell', 'settings', 'put', 'system', 'user_rotation', '1'); adbTry('shell', 'cmd', 'window', 'user-rotation', 'lock', '1'); h.fixed.push('locked landscape'); } }
  h.batterySaver = adbTry('shell', 'settings', 'get', 'global', 'low_power'); if (h.batterySaver === '1') { h.problems.push('battery saver on'); if (fix) { adbTry('shell', 'settings', 'put', 'global', 'low_power', '0'); h.fixed.push('battery saver off'); } }
  h.animationScales = ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale'].map(k => adbTry('shell', 'settings', 'get', 'global', k));
  if (h.animationScales.some(v => v && v !== 'null' && v !== '1.0' && v !== '1')) { h.problems.push('animation scale not default'); if (fix) { for (const k of ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale']) adbTry('shell', 'settings', 'put', 'global', k, '1.0'); h.fixed.push('animations reset to 1.0'); } }
  const th = adbTry('shell', 'dumpsys', 'thermalservice'); h.thermalStatus = (th.match(/Thermal Status:\s*(\d+)/) || [])[1] ?? 'n/a'; if (h.thermalStatus !== 'n/a' && h.thermalStatus !== '0') h.problems.push('thermal status ' + h.thermalStatus);
  h.window = emuWindow();
  if (h.window.iconic) { h.problems.push('emulator window minimised'); }
  h.ok = h.problems.length === 0 || (fix && h.problems.length === h.fixed.length);
  return h;
}

// ---------- emulator restart (optionally headless) ----------
export async function restartEmulator({noWindow = false, gpu = 'host'} = {}) {
  const attached = () => { try { return /emulator-\d+\s+device/.test(adb('devices')); } catch { return false; } };
  const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (fn()) return; } catch {} await delay(2000); } throw new Error('timeout'); };
  if (attached()) { try { adb('emu', 'kill'); } catch {} await until(() => !attached(), 90000); await delay(5000); }
  const args = ['-avd', 'Orbix_Pixel', '-gpu', gpu, '-no-snapshot-save', '-no-boot-anim', '-no-audio', ...(noWindow ? ['-no-window'] : [])];
  spawn('F:/Android/sdk/emulator/emulator.exe', args, {env: ENV, detached: true, stdio: 'ignore'}).unref();
  await until(attached, 240000); await until(() => adb('shell', 'getprop', 'sys.boot_completed') === '1', 300000); await delay(10000);
  adbTry('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0'); adbTry('shell', 'cmd', 'window', 'user-rotation', 'lock', '1');
  adbTry('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'http://10.0.2.2:4173/game.html?cards=1', 'com.android.chrome');
  await delay(10000);
}

// ---------- Chrome restart and attach ----------
const listT = async () => { ensureForward(); return (await (await fetch('http://localhost:9222/json', {signal: AbortSignal.timeout(4000)})).json()).filter(t => t.type === 'page'); };
async function visibleOf(t) {
  try {
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('x')); });
    const r = await new Promise(res => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) res(d.result?.result?.value); }; ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: 'document.visibilityState', returnByValue: true}})); setTimeout(() => res(null), 3000); });
    ws.close(); return r === 'visible';
  } catch { return false; }
}
/** am force-stop Chrome, start it again on about:blank, attach to the visible tab, close stale tabs. Returns a CDP session. */
export const gpuCrashes = () => { try { return (execFileSync('adb', ['logcat', '-d'], {encoding: 'utf8', env: ENV, maxBuffer: 256 << 20, timeout: 60000}).match(/GPU process exited unexpectedly/g) || []).length; } catch { return -1; } };
export async function restartChrome() {
  adbTry('shell', 'am', 'force-stop', 'com.android.chrome'); adbTry('logcat', '-c'); await delay(2500);
  adbTry('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  adbTry('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'about:blank', 'com.android.chrome'); await delay(4000);
  ensureForward();
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    try { const ts = await listT(); for (const t of ts) if (await visibleOf(t)) { target = t; break; } } catch {}
    if (!target) { if (i === 10 || i === 25) adbTry('shell', 'monkey', '-p', 'com.android.chrome', '-c', 'android.intent.category.LAUNCHER', '1'); await delay(1500); }
  }
  if (!target) throw new Error('Chrome did not come back');
  try { for (const t of await listT()) if (t.id !== target.id) await fetch(`http://localhost:9222/json/close/${t.id}`, {signal: AbortSignal.timeout(4000)}).catch(() => {}); } catch {}
  const s = await session(target.id);
  // A crashed Chrome leaves the websocket silent: every CDP call gets a deadline so a dead tab becomes an error instead of a hang.
  for (const m of ['ev', 'goto', 'tap', 'tapSel', 'send']) { const f = s[m].bind(s); s[m] = (...a) => Promise.race([f(...a), delay(m === 'goto' ? 120000 : 90000).then(() => { throw new Error('CDP timeout in ' + m); })]); }
  await ensureLandscape(s);
  return s;
}

// ---------- one measured flight ----------
export const SAMPLER = s => `new Promise(res=>{const d=[];let l=0,t0=0;(function f(t){if(!t0)t0=t;if(l&&t-t0>4000)d.push(t-l);l=t;if(t-t0<${s * 1000 + 4000})requestAnimationFrame(f);else{
 const n=d.length,sorted=[...d].sort((a,b)=>a-b),sum=d.reduce((a,b)=>a+b,0),worst=sorted.slice(Math.max(0,n-Math.ceil(n/100))),w=worst.reduce((a,b)=>a+b,0);
 res({frames:n,avgFps:+(1000*n/sum).toFixed(2),low1Fps:+(1000*worst.length/w).toFixed(2),p50Ms:+sorted[Math.floor(n*.5)].toFixed(1),p95Ms:+sorted[Math.floor(n*.95)].toFixed(1),over33:d.filter(x=>x>33.4).length,over50:d.filter(x=>x>50).length,longestMs:Math.round(sorted[n-1])});}})(performance.now())})`;

export function flightUrl(sc, query = '', port = PORT) {
  const q = new URLSearchParams({mock: 'boundary', cards: '1', autopilot: '1', seed: 'perf-bench', biome: sc.biome, course: String(sc.course), cardset: sc.chain, edge: 'spectral', r: String(Date.now())});
  if (sc.row === 'late') q.set('late', '1'); if (sc.chain === 'mid') q.set('collector', 'twin'); if (sc.guardian) q.set('guardian', sc.guardian);
  for (const [k, v] of new URLSearchParams(query)) q.set(k, v);
  return `http://10.0.2.2:${port}/game.html?${q}`;
}
export async function setDpr(s, dpr) {
  if (dpr) await s.send('Emulation.setDeviceMetricsOverride', {width: 0, height: 0, deviceScaleFactor: dpr, mobile: false});
  else await s.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
}
const PAGEINFO = '({vis:document.visibilityState,vp:innerWidth+"x"+innerHeight,dpr:devicePixelRatio,canvases:[...document.querySelectorAll("canvas")].filter(c=>c.width*c.height>40000).map(c=>c.width+"x"+c.height)})';
/** Fly one scenario and measure `seconds` of rAF gaps. Returns the frame statistics plus page info. */
export async function measureFlight(s, name, {query = '', seconds = 30, dpr = null, port = PORT, hook = null} = {}) {
  const sc = SCEN[name]; if (!sc) throw new Error('unknown scenario ' + name);
  await setDpr(s, dpr);
  if (sc.stress) {
    const q = new URLSearchParams({scene: 'stress', edge: 'spectral', run: String(Date.now())}); for (const [k, v] of new URLSearchParams(query)) q.set(k, v);
    await s.goto(`http://10.0.2.2:${port}/game.html?${q}`); await ensureLandscape(s);
    for (let i = 0; i < 240 && !(await s.ev('!!document.querySelector(".stress-confirm button")')); i++) await delay(500);
    const info = await s.ev(PAGEINFO);
    await s.ev('(document.querySelector(".stress-confirm button").click(),1)');
    let r = null; for (let i = 0; i < 300 && !(r = await s.ev('window.__stressResult||null')); i++) await delay(2000);
    if (!r) throw new Error('no stress result');
    return {avgFps: r.avgFps, low1Fps: r.low1Fps, p95Ms: r.p95Ms, over33: r.over33, over50: r.over50, longestMs: r.longestMs, frames: r.frames, peakFps: r.phases?.peak?.avgFps ?? null, ...info};
  }
  await s.goto(flightUrl(sc, query, port)); await ensureLandscape(s);
  for (let i = 0; i < 600; i++) { if (await s.ev('!!document.querySelector(".entry-depart:not([disabled])")')) break; await delay(500); }
  let running = false;
  for (let i = 0; i < 8 && !running; i++) { await s.tapSel('.entry-depart:not([disabled])'); await delay(2500); running = await s.ev('document.body.classList.contains("playing")&&!document.querySelector(".entry-depart")'); }
  if (!running) throw new Error('did not depart');
  if (sc.boss) await s.ev(`(()=>{const e=globalThis.__mockFlight&&__mockFlight();if(!e)return 0;const b=e.layout&&e.layout.boss;const x=b&&(b.start??b.x??b.rooms?.[0]?.start??b.stormRooms?.[0]?.start);if(x)e.distance=e.previousDistance=Math.max(0,x-e.player.x-300);return x||0})()`);
  const info = await s.ev(PAGEINFO);
  if (hook) await hook(s);
  const r = await s.ev(SAMPLER(seconds));
  return {...r, ...info};
}
/** measureFlight with one retry when a flight fails to start. */
export async function measureRetry(s, name, opts) {
  try { return await measureFlight(s, name, opts); } catch (e) { console.log('   retry after:', e.message); await delay(3000); return await measureFlight(s, name, opts); }
}
export async function save(file, obj) { await fs.mkdir(OUT, {recursive: true}); await fs.writeFile(path.join(OUT, file), JSON.stringify(obj, null, 1)); }
export const fmtRun = r => `${String(r.avgFps).padStart(6)} fps  1%low ${String(r.low1Fps).padStart(5)}  p95 ${String(r.p95Ms).padStart(5)}  >33 ${String(r.over33).padStart(4)}  max ${r.longestMs}`;

// ---------- clean sessions: the first heavy flight after a Chrome start often hangs the emulator's GPU process (WaitForGetOffsetInRange, 18-40 s stall,
// watchdog kill, GPU process restarted; three crashes in one Chrome run switch Chrome to software, and the tab itself sometimes dies).
// Protocol: one hard Chrome restart (am force-stop) at the start; a SOFT reset (navigate to about:blank) between scenarios, because every hard restart
// risks another hang (a restart loses the compiled shaders, and recompiling them can exceed the GPU watchdog again); a hard restart only after three GPU crashes (software fallback) or when the tab died. Warm-up flights run until one has no stall; measured runs
// with a stall over 3 s are discarded and flown again (kept in .discarded). ----------
export class Session {
  constructor({warmSeconds = 8} = {}) { this.warmSeconds = warmSeconds; this.s = null; this.restarts = 0; this.warmups = []; this.discarded = []; this.name = null; }
  async hard() { try { this.s?.close(); } catch {} this.s = await restartChrome(); this.restarts++; }
  /** Prepare for a scenario: soft reset (or hard if there is no healthy tab), then warm-up flights until TWO in a row have no stall. */
  async prepare(name, opts = {}) {
    this.name = name; this.warmups = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      if (!this.s || attempt > 0) await this.hard();
      else { try { await this.s.goto('about:blank'); await delay(3000); } catch { await this.hard(); } }
      let clean = 0, stalls = 0;
      for (let w = 0; w < 10; w++) {
        let r; try { r = await measureRetry(this.s, name, {...opts, seconds: SCEN[name].stress ? 0 : this.warmSeconds}); } catch (e) { console.log('   warm-up failed (' + e.message + '): restarting Chrome'); break; }
        r.crashes = gpuCrashes(); this.warmups.push(r); console.log('   warm-up (discarded)', fmtRun(r), 'gpu crashes', r.crashes);
        if (r.longestMs < 1500) { if (++clean >= 2) return; } else { clean = 0; stalls++; }
        if (stalls >= 5) break; // five stalled flights in a row: restart Chrome
      }
    }
    throw new Error('could not get a clean Chrome session');
  }
  /** One measured flight, repeated (up to 3 extra times) when it contains a stall over 3 s or a GPU crash. */
  async fly(opts) {
    for (let t = 0; t < 4; t++) {
      const before = gpuCrashes(); let r;
      try { r = await measureRetry(this.s, this.name, opts); } catch (e) { console.log('   flight failed (' + e.message + '): restarting Chrome'); this.discarded.push({discardedReason: 'Chrome/page died: ' + e.message}); await this.hard(); await this.prepare(this.name, opts); continue; }
      r.crashes = gpuCrashes(); r.crashesDuring = r.crashes - before;
      if (r.longestMs <= 3000 && r.crashesDuring === 0) return r;
      r.discardedReason = r.crashesDuring ? 'GPU process crash' : 'stall over 3 s'; this.discarded.push(r); console.log('   DISCARDED (' + r.discardedReason + ')', fmtRun(r));
    }
    throw new Error('no clean flight after 4 attempts');
  }
  close() { try { this.s?.close(); } catch {} }
}
