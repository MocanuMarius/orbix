// Drive the Android emulator's Chrome over CDP. No dependencies (Node 22+ global WebSocket).
// Usage:
//   node connect.mjs targets
//   node connect.mjs open <url>
//   node connect.mjs eval "<js expression>" [--target <idOrUrlSubstring>]
//   node connect.mjs demo [url]          (UA, DPR, sizes, 10 s rAF sample)
// Library: import {ensureForward, listTargets, openUrl, evaluate, rafSample} from './connect.mjs'
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const PORT = process.env.CDP_PORT || 9222;
const BASE = `http://localhost:${PORT}`;
const ADB = process.env.ADB || 'adb';

export function ensureForward() {
  const out = execFileSync(ADB, ['forward', '--list'], {encoding: 'utf8'});
  if (!out.includes(`tcp:${PORT} localabstract:chrome_devtools_remote`))
    execFileSync(ADB, ['forward', `tcp:${PORT}`, 'localabstract:chrome_devtools_remote']);
}
export async function listTargets() {
  ensureForward();
  return (await (await fetch(`${BASE}/json`)).json()).filter(t => t.type === 'page');
}
export async function openUrl(url) {
  ensureForward();
  const r = await fetch(`${BASE}/json/new?${encodeURI(url)}`, {method: 'PUT'});
  return r.json();
}
async function pickTarget(sel) {
  const ts = await listTargets();
  const t = sel ? ts.find(x => x.id === sel || x.url.includes(sel)) : ts.find(x => x.url !== 'about:blank') || ts[0];
  if (!t) throw new Error('no target');
  return t;
}
export async function evaluate(expression, sel) {
  const t = await pickTarget(sel);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')); });
  const r = await new Promise((res, rej) => {
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) res(d); };
    ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate',
      params: {expression, awaitPromise: true, returnByValue: true}}));
  });
  ws.close();
  if (r.error || r.result.exceptionDetails) throw new Error(JSON.stringify(r.error || r.result.exceptionDetails));
  return r.result.result.value;
}
export function rafSample(ms = 10000) {
  return `new Promise(res=>{const d=[];let l=performance.now();const end=l+${ms};
    (function f(t){d.push(t-l);l=t;if(t<end)requestAnimationFrame(f);else{d.shift();
    const s=[...d].sort((a,b)=>a-b),avg=d.reduce((a,b)=>a+b,0)/d.length;
    res({frames:d.length,avgFps:+(1000/avg).toFixed(1),avgMs:+avg.toFixed(2),
    p95Ms:+s[Math.floor(s.length*0.95)].toFixed(2),maxMs:+s[s.length-1].toFixed(2)});}})(l)})`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, arg0] = process.argv.slice(2); const arg = arg0 && !arg0.startsWith('--') ? arg0 : undefined;
  const ti = process.argv.indexOf('--target');
  const sel = ti > 0 ? process.argv[ti + 1] : undefined;
  if (cmd === 'targets') console.table((await listTargets()).map(t => ({id: t.id, url: t.url})));
  else if (cmd === 'open') console.log((await openUrl(arg)).url);
  else if (cmd === 'eval') console.log(JSON.stringify(await evaluate(arg, sel), null, 2));
  else if (cmd === 'demo') {
    if (arg) { await openUrl(arg); await new Promise(r => setTimeout(r, 8000)); }
    console.log(await evaluate(`({ua:navigator.userAgent,dpr:devicePixelRatio,
      inner:innerWidth+'x'+innerHeight,screen:screen.width+'x'+screen.height,
      vv:visualViewport.width+'x'+visualViewport.height})`, sel));
    console.log(await evaluate(rafSample(10000), sel));
  } else console.log('commands: targets | open <url> | eval <js> | demo [url]');
}
