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

// What the player sees is the ground truth: collect each visible text box with its computed colour, take a screenshot, and read the
// dominant non-text colour behind the box from the pixels. Pixels with no dominant colour (a picture, a gradient) are skipped and counted.
const COLLECT = `(() => {
  const parse = c => { const p = (c.match(/[0-9.]+/g) || []).map(Number); return p.length < 3 ? null : {r: p[0], g: p[1], b: p[2], a: p[3] ?? 1}; };
  const sel = e => { const parts = []; for (let n = e; n && n.nodeType === 1 && parts.length < 3; n = n.parentElement) parts.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : '')); return parts.join(' < '); };
  const items = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    const text = node.textContent.trim(); if (!text) continue;
    const el = node.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const r = document.createRange(); r.selectNodeContents(node); const box = r.getBoundingClientRect();
    if (box.width < 2 || box.height < 2 || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) continue;
    let opacity = 1, hidden = false;
    for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') { hidden = true; break; } opacity *= Number(s.opacity); }
    if (hidden || opacity < .05) continue;
    const cx = Math.min(innerWidth - 1, Math.max(0, box.left + box.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2));
    const top = document.elementFromPoint(cx, cy);
    if (top && !el.contains(top) && !top.contains(el)) continue; // covered by something else: not what the player reads
    const closed = el.closest('details:not([open])'); if (closed && !el.closest('summary')) continue; // folded away
    let clipped = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n); if (o.overflow !== 'visible' || o.overflowX !== 'visible' || o.overflowY !== 'visible') { const b = n.getBoundingClientRect(); if (box.bottom > b.bottom + 1 || box.top < b.top - 1 || box.right > b.right + 1 || box.left < b.left - 1) { clipped = true; break; } } }
    if (clipped) continue; // scrolled out of its own box: not on screen
    const cs = getComputedStyle(el), fg = parse(cs.color); if (!fg) continue;
    items.push({cstr: cs.color, selector: sel(el), text: text.slice(0, 40), fg, opacity, size: parseFloat(cs.fontSize), x: Math.max(0, Math.floor(box.left)), y: Math.max(0, Math.floor(box.top)), w: Math.ceil(Math.min(box.width, innerWidth - box.left)), h: Math.ceil(Math.min(box.height, innerHeight - box.top))});
  }
  return items;
})()`;
const SAMPLE = (b64, items) => `(async () => {
  const img = new Image(); img.src = 'data:image/png;base64,${b64}'; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d', {willReadFrequently: true}); cx.drawImage(img, 0, 0);
  const items = ${JSON.stringify(items)};
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const low = [], seen = new Set(); let skipped = 0, checked = 0;
  for (const it of items) {
    const d = cx.getImageData(it.x, it.y, Math.max(1, it.w), Math.max(1, it.h)).data, buckets = new Map(); let n = 0;
    for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4; const b = buckets.get(k) || {c: 0, r: 0, g: 0, b: 0}; b.c++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; buckets.set(k, b); n++; }
    const fgc = [it.fg.r, it.fg.g, it.fg.b];
    const sorted = [...buckets.values()].map(b => ({c: b.c, rgb: [b.r / b.c, b.g / b.c, b.b / b.c]})).sort((a, b) => b.c - a.c);
    // Skip the bucket that is the text itself (close to its colour) when something else is also present.
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 40;
    let bg = sorted.find(s => !near(s.rgb, fgc)) || sorted[0];
    const share = (sorted.filter(s => Math.hypot(s.rgb[0] - bg.rgb[0], s.rgb[1] - bg.rgb[1], s.rgb[2] - bg.rgb[2]) < 40).reduce((a, s) => a + s.c, 0)) / n;
    if (share < .45) { skipped++; continue; }
    const a = it.fg.a * it.opacity, col = [0, 1, 2].map(i => fgc[i] * a + bg.rgb[i] * (1 - a));
    checked++;
    const need = it.size >= 24 ? 3 : 4.5, r = ratio(col, bg.rgb);
    if (r < need) { const key = it.selector + '|' + it.text.slice(0, 20); if (seen.has(key)) continue; seen.add(key); low.push({raw: it.cstr + ' ' + it.fg.r + ',' + it.fg.g + ',' + it.fg.b + ',' + it.fg.a + ',' + it.opacity, selector: it.selector, text: it.text, fg: hex(col), bg: hex(bg.rgb), ratio: Math.round(r * 100) / 100, size: it.size}); }
  }
  return {low, skipped, checked};
})()`;

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
