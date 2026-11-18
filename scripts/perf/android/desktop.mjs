// Desktop Chrome calibration against the emulator's scenario ranking.
//   node scripts/perf/android/desktop.mjs [--throttles 1,4,6] [--n 2] [--seconds 30] [--only marsh-late-mid,stress] [--boss]
// Same URLs, same server (serve.mjs), same autopilot and trusted departure tap as bench.mjs, in a fresh headless desktop Chrome per run:
// viewport 924x412, DPR 2.625, touch emulation, CPU throttle 1x/4x/6x (Emulation.setCPUThrottlingRate, set after the page has loaded).
// No page instrumentation (lib.mjs's bridge is not used). Output: outputs/perf/android/<date>-bench/desktop.json
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {startServer} from './serve.mjs';
import {parseArgs, SCEN, SAMPLER, flightUrl, delay, median, summarize, save, DAY} from './benchlib.mjs';

const A = parseArgs(process.argv.slice(2));
const throttles = String(A.throttles || '1,4,6').split(',').map(Number), n = Number(A.n || 2), seconds = Number(A.seconds || 30);
const names = A.only ? String(A.only).split(',') : Object.keys(SCEN).filter(k => A.boss || k !== 'basalt-guardian');
const PORT = 4187, BASE = `http://127.0.0.1:${PORT}`;
const PHONE = {width: 924, height: 412, deviceScaleFactor: 2.625, mobile: true, screenOrientation: {type: 'landscapePrimary', angle: 90}};

async function launch() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'orbix-desk-'));
  const args = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'];
  const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, {windowsHide: true, stdio: 'ignore'});
  let port; for (let i = 0; i < 100 && !port; i++) { try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch { await delay(300); } }
  let target; for (let i = 0; i < 100 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await delay(300); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const [res, rej] = pending.get(m.id); pending.delete(m.id); m.error ? rej(Error(m.error.message)) : res(m.result); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, [res, rej]); ws.send(JSON.stringify({id: i, method, params})); });
  const ev = async expr => { const r = await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const tapSel = async sel => { const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return b.width&&b.height?[b.x+b.width/2,b.y+b.height/2]:null})()`); if (!p) return false; await send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: p[0], y: p[1]}]}); await delay(60); await send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); return true; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', PHONE); await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
  await send('Emulation.setUserAgentOverride', {userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l'});
  return {send, ev, tapSel, close: async () => { try { ws.close(); } catch {} proc.kill(); await delay(500); fs.rm(profile, {recursive: true, force: true}).catch(() => {}); }};
}
async function run(name, throttle) {
  const sc = SCEN[name], b = await launch();
  try {
    if (sc.stress) {
      await b.send('Page.navigate', {url: `${BASE}/game.html?scene=stress&edge=spectral`});
      for (let i = 0; i < 400 && !(await b.ev('!!document.querySelector(".stress-confirm button")').catch(() => false)); i++) await delay(300);
      await b.send('Emulation.setCPUThrottlingRate', {rate: throttle}); await delay(500);
      await b.ev('(document.querySelector(".stress-confirm button").click(),1)');
      let r = null; for (let i = 0; i < 600 && !(r = await b.ev('window.__stressResult||null')); i++) await delay(1500);
      return {avgFps: r.avgFps, low1Fps: r.low1Fps, p95Ms: r.p95Ms, over33: r.over33, longestMs: r.longestMs, frames: r.frames};
    }
    await b.send('Page.navigate', {url: flightUrl(sc, '', PORT).replace('10.0.2.2', '127.0.0.1')});
    for (let i = 0; i < 600 && !(await b.ev('!!document.querySelector(".entry-depart:not([disabled])")').catch(() => false)); i++) await delay(300);
    let running = false; for (let i = 0; i < 8 && !running; i++) { await b.tapSel('.entry-depart:not([disabled])'); await delay(2000); running = await b.ev('document.body.classList.contains("playing")&&!document.querySelector(".entry-depart")'); }
    if (!running) throw Error('did not depart');
    if (sc.boss) await b.ev(`(()=>{const e=globalThis.__mockFlight&&__mockFlight();if(!e)return 0;const x=e.layout?.boss?.start;if(x)e.distance=e.previousDistance=Math.max(0,x-e.player.x-300);return x||0})()`);
    await b.send('Emulation.setCPUThrottlingRate', {rate: throttle}); await delay(300);
    return await b.ev(SAMPLER(seconds));
  } finally { await b.close(); }
}

const srv = await startServer('dist', PORT), res = {day: DAY, n, seconds, throttles, viewport: '924x412', dpr: 2.625, cells: {}};
try {
  for (const throttle of throttles) for (const name of names) {
    const runs = [];
    for (let i = 0; i < n; i++) { try { const r = await run(name, throttle); runs.push(r); console.log(`${throttle}x ${name.padEnd(20)} run ${i + 1}: ${r.avgFps} fps  1%low ${r.low1Fps}  p95 ${r.p95Ms}  >33 ${r.over33}`); } catch (e) { console.log(`${throttle}x ${name} FAILED ${e.message}`); } }
    res.cells[`${name}@${throttle}x`] = {scenario: name, throttle, runs, avgFps: summarize(runs.map(r => r.avgFps)), low1Fps: summarize(runs.map(r => r.low1Fps)), p95Ms: summarize(runs.map(r => r.p95Ms))};
    await save('desktop.json', res);
  }
} finally { srv.close(); }
