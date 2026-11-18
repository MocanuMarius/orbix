// Persistent CDP session to the emulator's foreground Chrome tab (no dependencies). Used by play.mjs / realism.mjs.
//   import {session} from './cdp.mjs';  const s = await session();  await s.goto(url);  await s.ev('1+1');  await s.tap(x, y);
// Input.dispatchTouchEvent is trusted input (isTrusted=true), so it passes the "Tap to depart" gate.
import {execFileSync} from 'node:child_process';
import {ensureForward, listTargets} from './connect.mjs';
export const delay = ms => new Promise(r => setTimeout(r, ms));
export async function session(sel) {
  ensureForward();
  const ts = await listTargets();
  // Foreground tab = the one reporting visible. Prefer an explicit selector, else first non-blank that is visible.
  let t = sel ? ts.find(x => x.id === sel || x.url.includes(sel)) : null;
  if (!t) {
    for (const c of ts.filter(x => x.url !== 'about:blank')) {
      try { const r = await probe(c, 'document.visibilityState'); if (r === 'visible') { t = c; break; } } catch {}
    }
  }
  t ||= ts.find(x => x.url !== 'about:blank') || ts[0];
  if (!t) throw new Error('no target');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')); });
  let id = 0; const pending = new Map(), listeners = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); }
    else if (d.method) for (const l of listeners) l(d);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, {res, rej}); ws.send(JSON.stringify({id: i, method, params})); });
  const s = {
    target: t, send, on: fn => listeners.push(fn),
    async ev(expression) {
      const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
      return r.result.value;
    },
    async goto(url) { await send('Page.navigate', {url}); await delay(1500); },
    async tap(x, y) {
      await send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
      await delay(60);
      await send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    },
    async tapSel(selector) {
      const r = await s.ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const b=e.getBoundingClientRect();return b.width&&b.height?[b.x+b.width/2,b.y+b.height/2]:null})()`);
      if (!r) return false; await s.tap(r[0], r[1]); return true;
    },
    close() { try { ws.close(); } catch {} },
  };
  return s;
}
async function probe(t, expr) {
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('x')); });
  const r = await new Promise(res => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) res(d.result?.result?.value); };
    ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: expr, returnByValue: true}})); setTimeout(() => res(null), 3000); });
  ws.close(); return r;
}
export function wake() { try { execFileSync('adb', ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); execFileSync('adb', ['shell', 'monkey', '-p', 'com.android.chrome', '-c', 'android.intent.category.LAUNCHER', '1'], {stdio: 'ignore'}); } catch {} }
/** The emulator sometimes falls back to portrait; force landscape (rotation 1) when the page is taller than wide. */
export async function ensureLandscape(s) {
  for (let i = 0; i < 4; i++) {
    const portrait = await s.ev('innerHeight>innerWidth');
    if (!portrait) return;
    try { execFileSync('adb', ['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0']); execFileSync('adb', ['shell', 'settings', 'put', 'system', 'user_rotation', '1']); execFileSync('adb', ['shell', 'cmd', 'window', 'user-rotation', 'lock', '1']); } catch {}
    await delay(3000);
  }
}
