// Contrast sweep: opens the menu and dialog surfaces headlessly (915x412, throwaway Chrome profile, local static server for dist/) and lists every
// visible text under 4.5:1 (3:1 from 24px) against the effective background behind it. Text over images, canvas or video is skipped and counted.
// Run: node scripts/contrast-check.mjs [--shots]   Mock runs only: nothing is saved.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const OUT = path.resolve('outputs/contrast');
await fs.mkdir(OUT, {recursive: true});
const SHOTS = process.argv.includes('--shots');
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json'};
const SHEET = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#e8d6a4;color:#2a2118;font:12px monospace}
.g{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.c{min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border:2px solid #6b5335}
.r{display:flex;align-items:flex-end;gap:8px}.b{background:#5a4024;padding:6px;color:#2a160a}.b .ins-brand-edge{fill:#b48a52}</style>
<div class="g" id="g"></div><script type="module">import {inscriptionGlyph, INSCRIPTION_GLYPH_IDS} from './inscription-glyphs.mjs';
document.getElementById('g').innerHTML = INSCRIPTION_GLYPH_IDS.map(id => '<div class="c"><div class="r">' + [16, 32, 48].map(s => inscriptionGlyph(id, {size: s})).join('') + '<span class="b">' + inscriptionGlyph(id, {size: 36, brand: true}) + '</span></div><b>' + id + '</b></div>').join('');
document.body.dataset.ready = '1';</script>`;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
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

import {COLLECT, SAMPLE} from './lib/contrast-probe.mjs';

const report = [];
async function audit(screen) {
  const items = await ev(COLLECT); if (!items.length) console.log("no text items on", screen);
  const s = await send('Page.captureScreenshot', {format: 'png'});
  const r = await ev(SAMPLE(s.data, items));
  report.push({screen, ...r});
  if (SHOTS) await shot(screen.replace(/[^a-z0-9]+/gi, '-'));
  console.log(screen.padEnd(34), 'checked', String(r.checked).padStart(4), 'skipped(image)', String(r.skipped).padStart(3), 'LOW', r.low.length);
}

const cannot = [];
async function tryScreen(name, fn) { try { await fn(); } catch (e) { cannot.push(name + ': ' + e.message.split('\n')[0].slice(0, 90)); } }
const CHAIN = '/game.html?cards=1&mock=cards&chain=rhythm,echo,-,body-spark&reserve=lift-guide,proximity,body-spark,echo&slots=0:twin-mark,3:gilded';
const exists = sel => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
const inject = (module, call) => ev(`import('/${module}').then(m=>{const a=document.querySelector('#app')||document.body;a.innerHTML=${call};return true})`);

try {
  await size(915, 412);
  // Glossary dialogs: one temporary trigger, clicked like a player would tap a keyword.
  for (const term of ['luminance', 'wave', 'flash', 'inscription', 'collector']) {
    await tryScreen('glossary ' + term, async () => {
      await go(CHAIN, '#dk-root .dk2-station');
      await ev(`(()=>{const b=document.createElement('button');b.id='t-term';b.setAttribute('data-card-term',${JSON.stringify(term)});b.textContent='x';b.style.cssText='position:fixed;left:0;top:0;z-index:9';(document.querySelector('#dk-root')||document.body).append(b)})()`);
      await ev("document.getElementById('t-term').click()"); await delay(600);
      if (!await exists('dialog.card-term-dialog[open]')) throw Error('dialog did not open');
      await audit('glossary ' + term);
    });
  }
  await tryScreen('chain tab', async () => { await go(CHAIN, '#dk-root .dk2-station'); await audit('chain tab'); });
  await tryScreen('chain tab, inscription tip', async () => { await click('.dk2-ins-brand'); await audit('chain tab, inscription tip'); });
  await tryScreen('deck tab', async () => { await go(CHAIN + '&new=1', '#dk-root .dk2-station'); await click('#dk2-tab-deck'); await audit('deck tab'); });
  await tryScreen('deck tab, filter menu', async () => { await click('#dk2-filter'); await audit('deck tab, filter menu'); });
  await tryScreen('card inspector', async () => { await click('#dk2-filter'); await click('#dk2-tab-chain'); await click('.dk21-eye'); await delay(200); await audit('card inspector'); });
  await tryScreen('triggers tab', async () => { await go(CHAIN, '#dk-root .dk2-station'); await click('#dk2-tab-triggers'); await audit('triggers tab'); });
  await tryScreen('scribe offers', async () => {
    await go('/game.html?cards=1&mock=cards&scenario=scribe&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii&slots=1:gilded,2:bell', '.scribe-screen');
    await audit('scribe offers');
    await click('.scribe-screen [data-action="scribe-pick"]'); await until(() => exists('.scribe-slots'), 'slots'); await audit('scribe slot choice');
    await click('.scribe-screen .scribe-slot[data-slot="1"]'); await delay(200); await audit('scribe replace confirm');
  });
  await tryScreen('rest screen', async () => {
    await go('/game.html?cards=1&mock=cards&scenario=rest&chain=rhythm,echo,-,body-spark&reserve=lift-guide,body-spark', '.card-rest-screen, #app section');
    await audit('rest screen');
    await click('[data-action="card-workshop"]'); await delay(300); await audit('workshop');
  });
  await tryScreen('forge', async () => { await click('[data-action="card-preview-forge"]'); await delay(300); if (!await exists('.card-forge-preview')) throw Error('forge preview did not open'); await audit('forge preview'); });
  const clickText = async text => { const ok = await ev(`(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>x.offsetParent&&x.textContent.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`); if (!ok) throw Error('no button "' + text + '"'); await delay(600); };
  await tryScreen('home', async () => { await go('/game.html', '#app *'); await delay(600); await audit('home'); });
  await tryScreen('death screen', async () => { await inject('death-screen.mjs', `m.deathScreenMarkup({lives:2,lastAttempt:{nodeName:'Bell Garden'},current:{name:'Bell Garden'}})`); await audit('death screen'); });
  await tryScreen('settings', async () => { await go('/game.html', '#app *'); await delay(600); await clickText('Sound & options'); await audit('settings'); });
  await tryScreen('help / field guide', async () => { await clickText('Guide & glossary'); await audit('help / field guide'); });
  await tryScreen('lessons & practice', async () => { await go('/game.html', '#app *'); await delay(600); await clickText('Lessons & practice'); await audit('lessons & practice'); });
  await tryScreen('map guide / collection / pause menu', async () => { throw Error('only reachable inside a live run; not opened by this sweep'); });
  for (const name of ['stop page', 'depart panel', 'flight summary'])
    cannot.push(name + ': needs a live run (no mock scene); covered by the unit tests, not by this sweep');
  const total = report.reduce((n, r) => n + r.low.length, 0);
  console.log('\nLOW CONTRAST TEXTS:', total);
  for (const r of report) for (const l of r.low) console.log(`- [${r.screen}] ${l.raw ? '' : ''}${l.selector}  "${l.text}"  ${l.fg} on ${l.bg}  ${l.ratio}:1  (${l.size}px) raw=${l.raw}`);
  console.log('image-backed texts skipped:', report.reduce((n, r) => n + r.skipped, 0));
  if (cannot.length) console.log('\nNOT OPENED:\n' + cannot.map(c => '- ' + c).join('\n'));
  if (errors.length) console.log('page errors', errors);
  process.exitCode = total ? 1 : 0;
} catch (e) { console.log('FAILED', e.message, errors); process.exitCode = 1; } finally {
  socket.close(); browser.kill(); server.close();
  await fs.rm(profile, {recursive: true, force: true}).catch(() => {});
}
