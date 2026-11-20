// Timer ring proof (2026-11-20): flies Slow Wick alone at phone size (890x400) in headless Chrome with its own temporary profile,
// screenshots the Chain strip partly filled, just fired, and while paused. Needs a local server: PORT=4263 node server.mjs
//   node scripts/timer-ring-shots.mjs [baseUrl] [card]
import fs from 'node:fs/promises';
import path from 'node:path';
import { chrome, until, delay } from './browser-probe.mjs';
const base = process.argv[2] || 'http://127.0.0.1:4263', card = process.argv[3] || 'slow-wick', out = path.resolve('outputs/timer-ring');
await fs.mkdir(out, { recursive: true });
const b = await chrome(['--mute-audio', '--disable-background-timer-throttling']);
const shot = async (name, clip) => {
  const r = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip: { ...clip, scale: 6 } } : {}) });
  await fs.writeFile(path.join(out, name), Buffer.from(r.data, 'base64'));
};
const E = js => b.ev(`(()=>{const e=globalThis.__mockFlight?.();return ${js}})()`);
try {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 890, height: 400, deviceScaleFactor: 1, mobile: true });
  await b.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await b.visit(`${base}/game.html?simrun=sb1&stop=3&card=${card}&solo=1&autopilot=1`);
  await until(() => b.ev("!!document.querySelector('.entry-depart:not([disabled])')"), 'departure ready', 300);
  await b.ev("(()=>{const x=document.querySelector('.entry-depart');x.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,isPrimary:true,button:0}));x.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,isPrimary:true,button:0}));x.click();})()");
  await until(() => b.ev("document.body.dataset.screen==='flight'"), 'flight screen', 100);
  await delay(2500);
  await b.ev("document.querySelector('[data-action=wake-flight]')?.click()");
  await until(() => E('e&&e.cardEngine&&e.time>0.2&&!e.paused'), 'flight running', 100);
  // Partly filled: about 1.5 s after the last firing.
  const turn = () => E('e.cardEngine.turn');
  let t0 = await turn();
    await until(async () => { const st = await E('JSON.stringify(e.cardEngine.state.timers)'); const tm = JSON.parse(st)[0]; return tm && tm.progress > 0.45 && tm.progress < 0.7; }, 'half way', 200);
  const rect = JSON.parse(await b.ev("JSON.stringify((()=>{const r=document.querySelector('.chain-strip').getBoundingClientRect();return{x:Math.max(0,r.x+r.width/2-30),y:Math.max(0,r.y+4),width:60,height:36}})())"));
  await shot('ring-partly-filled.png'); await shot('ring-partly-filled-zoom.png', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  console.log('partly', await E('JSON.stringify({time:+e.time.toFixed(2),timers:e.cardEngine.state.timers,turn:e.cardEngine.turn})'), await b.ev("JSON.stringify([...document.querySelectorAll('.chain-ring')].map(n=>({hidden:n.hidden,anim:n.getAnimations().map(a=>a.playState+':'+Math.round(a.currentTime))})))"));
  // Just fired: a few frames after the next Turn.
  t0 = await turn();
  await until(async () => (await turn()) > t0, 'next firing', 200);
  await delay(120);
  await shot('ring-just-fired.png'); await shot('ring-just-fired-zoom.png', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  console.log('fired', await E('JSON.stringify({time:+e.time.toFixed(2),timers:e.cardEngine.state.timers,turn:e.cardEngine.turn})'));
  // Paused: the ring stands still (animation paused, simulation time unchanged).
  await delay(900);
  await b.ev("(document.elementFromPoint(850,33)?.closest('button')||document.elementFromPoint(850,33))?.click()");
  await delay(600);
  const p1 = await b.ev("JSON.stringify([...document.querySelectorAll('.chain-ring:not(.chain-ring-flash)')].map(n=>n.getAnimations().map(a=>a.playState+':'+Math.round(a.currentTime))))");
  const s1 = await E('JSON.stringify({paused:e.paused,time:+e.time.toFixed(3)})');
  await delay(1500);
  const p2 = await b.ev("JSON.stringify([...document.querySelectorAll('.chain-ring:not(.chain-ring-flash)')].map(n=>n.getAnimations().map(a=>a.playState+':'+Math.round(a.currentTime))))");
  const s2 = await E('JSON.stringify({paused:e.paused,time:+e.time.toFixed(3)})');
  console.log('paused', s1, p1, '| later', s2, p2);
  await shot('ring-paused.png'); await shot('ring-paused-zoom.png', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  console.log('errors', JSON.stringify(b.errors.slice(0, 5)));
} finally { b.close(); }
