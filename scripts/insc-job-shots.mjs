// Captures for the Inscription brand marks and the Scribe screens. Run: node scripts/inscription-ui-proof.mjs [sheet] [chain] [scribe]
// Writes PNGs to outputs/backlog-ui/. Headless Chrome with a throwaway profile over the DevTools protocol, on a local static
// server for dist/. Mock runs only (?mock=cards, ?mock=cards&scenario=scribe): nothing is saved.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const OUT = path.resolve('outputs/inscriptions');
await fs.mkdir(OUT, {recursive: true});
const sets = process.argv.slice(2).length ? process.argv.slice(2) : ['sheet', 'chain', 'scribe'];
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json'};
const SHEET = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#e8d6a4;color:#2a2118;font:12px monospace}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.c{min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border:2px solid #6b5335}
.r{display:flex;align-items:flex-end;gap:8px}.b{display:flex;align-items:flex-end;gap:6px;background:#5a4024;padding:6px;color:#2a160a}.b .ins-brand-edge{fill:#b48a52}.d{background:#2a2118;color:#f6ebcc;padding:6px;line-height:0}</style>
<div class="g" id="g"></div><script type="module">import {inscriptionGlyph, INSCRIPTION_GLYPH_IDS} from './inscription-glyphs.mjs';
document.getElementById('g').innerHTML = INSCRIPTION_GLYPH_IDS.map(id => '<div class="c"><div class="r">' + [24, 48, 72].map(s => inscriptionGlyph(id, {size: s})).join('') + '<span class="b">' + inscriptionGlyph(id, {role: "brand"}) + inscriptionGlyph(id, {role: "brandLarge"}) + '</span><span class="d">' + inscriptionGlyph(id, {size: 48}) + '</span></div><b>' + id + '</b></div>').join('');
document.body.dataset.ready = '1';</script>`;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/__out/')) return res.writeHead(200, {'Content-Type': 'image/png', 'Cache-Control': 'no-store'}).end(await fs.readFile(path.join(OUT, path.basename(url.pathname))));
    if (url.pathname === '/__review.html') return res.writeHead(200, {'Content-Type': 'text/html'}).end('<!doctype html><body style="margin:0;background:#222">' + url.searchParams.get('img').split(',').map(f => `<img src="/__out/${f}.png" style="display:block;margin:0 0 4px">`).join('') + '</body>');
    if (url.pathname === '/__glyph-sheet.html') return res.writeHead(200, {'Content-Type': 'text/html'}).end(SHEET);
    const file = path.resolve('dist', '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    const data = await fs.readFile(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'inscription-ui-'));
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--disable-gpu', '--mute-audio', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {windowsHide: true, stdio: 'ignore'});
const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label, tries = 150) {
  for (let i = 0; i < tries; i++) { try { const v = await fn(); if (v) return v; } catch {} await delay(100); }
  throw Error('Timed out: ' + label);
}
const port = await until(async () => Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]), 'browser');
const target = await until(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'), 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => socket.addEventListener('open', r, {once: true}));
let serial = 0; const pending = new Map(); const errors = [];
socket.addEventListener('message', event => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(Error(m.error.message)) : ok(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((ok, ko) => { const id = ++serial; pending.set(id, [ok, ko]); socket.send(JSON.stringify({id, method, params})); });
await send('Runtime.enable'); await send('Page.enable');
const ev = async expression => {
  const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
async function size(w, h, mobile = true) { await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile}); await send('Emulation.setTouchEmulationEnabled', {enabled: mobile, maxTouchPoints: 5}); await delay(120); }
async function shot(name) { const s = await send('Page.captureScreenshot', {format: 'png'}); await fs.writeFile(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64')); console.log('wrote', path.join(OUT, name + '.png')); }
async function go(url, ready) {
  await send('Page.navigate', {url: base + url});
  await delay(300);
  await until(() => ev(`!!document.querySelector(${JSON.stringify(ready)})`), 'ready ' + url, 200);
  await ev('document.fonts?.ready.then(()=>true)');
  await delay(300);
}
async function click(selector) {
  const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await delay(200);
}
// Text that runs past its own box, or boxes that leave the viewport, inside `root`.
const overflow = root => ev(`(()=>{const out=[];const W=innerWidth,H=innerHeight;for(const e of document.querySelectorAll(${JSON.stringify(root)}+' *')){const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).visibility==='hidden')continue;
  if(r.right>W+0.5||r.bottom>H+0.5||r.left<-0.5)out.push('outside: '+e.className+' '+(e.textContent||'').trim().slice(0,30));
  if(e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX!=='auto'&&e.children.length===0&&e.textContent.trim())out.push('clipped: '+e.className+' '+e.textContent.trim().slice(0,30));}return out})()`);

try {
  await size(890, 400);
  const Q='&chain=wind-feather,body-spark,growth-ring&tallies=0:3,2:3&slots=0:kindled,1:gilded';
  await go('/game.html?cards=1&mock=cards'+Q, '#dk-root .dk2-station');
  await shot('insc-deck-tile-890x400');
  await click('#dk-root .dk2-station[data-slot="0"] .dk2-card:not(.dk2-addcard)');
  await until(() => ev("!!document.querySelector('.dk2-inscription')"), 'detail', 60);
  await delay(300);
  await shot('insc-detail-890x400');
  console.log('detail', await ev("document.querySelector('.dk2-inscription')?.innerText"), await overflow('#dk-root'));
  await go('/game.html?cards=1&mock=cards&scenario=scribe&offers=kindled,twin-mark&chain=wind-feather,body-spark,echo,-&slots=1:gilded', '.scribe-screen');
  await click('.scribe-screen [data-scribe-offer="kindled"] .iw-select').catch(() => {});
  const offers = await ev("[...document.querySelectorAll('[data-scribe-offer]')].map(n=>n.dataset.scribeOffer)");
  console.log('offers', offers);
  await click('.scribe-screen [data-scribe-offer="kindled"] .iw-select');
  await click('.scribe-screen .scribe-slot[data-slot="0"]');
  await delay(300);
  await shot('insc-scribe-890x400');
  console.log('scribe', await ev("document.querySelector('.iw-slot.iw-on')?.innerText"), await overflow('.scribe-screen'));
  if (errors.length) console.log('page errors', errors);
} catch (e) { console.log('FAILED', e.message, errors, await ev('document.body.innerText.slice(0,300)').catch(()=>'')); process.exitCode = 1; } finally {
  socket.close(); browser.kill(); server.close();
  await fs.rm(profile, {recursive: true, force: true}).catch(() => {});
}
