// Menu audit: opens every menu screen headlessly (throwaway Chrome profile, local static server for dist/) at the phone-landscape sizes,
// saves outputs/menu-audit/<screen>-<size>.png and measures what a script can judge: content clipped by its container or the viewport,
// text cut by its own box, tap targets under 40x40, overlapping controls, covered text, unexpected inner scrollbars and text contrast.
// Sizes: 890x400 (owner's phone), 915x412, 740x333, and the Pixel 10 browser tab with toolbar showing: 924x308 and 870x280 (a system bar on the left edge).
// Run: node scripts/menu-audit.mjs [--only name,name|prefix*] [--sizes 890x400,...] [--quiet] [--probe selector --props regex] [--eval js]   Mock routes only: nothing is saved.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {COLLECT, SAMPLE} from './lib/contrast-probe.mjs';

const arg = name => { const i = process.argv.indexOf('--' + name); return i < 0 ? null : process.argv[i + 1]; };
const ONLY = arg('only')?.split(',');
const SIZES = (arg('sizes') || '890x400,915x412,740x333,924x308,870x280').split(',').map(s => s.split('x').map(Number));
const QUIET = process.argv.includes('--quiet');
const OUT = path.resolve('outputs/menu-audit');
await fs.mkdir(OUT, {recursive: true});
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg'};
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
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'menu-audit-'));
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
let serial = 0; const pending = new Map(); let errors = [];
socket.addEventListener('message', event => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(Error(m.error.message)) : ok(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((ok, ko) => { const id = ++serial; const timer = setTimeout(() => { pending.delete(id); ko(Error('browser call timed out: ' + method)); }, 25000); pending.set(id, [v => { clearTimeout(timer); ok(v); }, e => { clearTimeout(timer); ko(e); }]); socket.send(JSON.stringify({id, method, params})); });
await send('Runtime.enable'); await send('Page.enable');
const ev = async expression => {
  const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
async function setSize(w, h) { await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: true}); await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5}); await delay(120); }
async function go(url, ready) {
  await send('Page.navigate', {url: base + url});
  await delay(300);
  await until(() => ev(`!!document.querySelector(${JSON.stringify(ready)})`), 'ready ' + url, 200);
  await ev('document.fonts?.ready.then(()=>true)');
  await delay(400);
}
const exists = sel => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
async function click(selector) {
  const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await delay(350);
}
const clickText = async (text, scope = 'button,a,summary') => { const ok = await ev(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(scope)})].find(x=>x.offsetParent&&x.textContent.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`); if (!ok) throw Error('no button "' + text + '"'); await delay(600); };
const inject = (module, call) => ev(`import('/${module}').then(m=>{const a=document.querySelector('#app')||document.body;a.innerHTML=${call};return true})`);

// ---- in-page measurements -------------------------------------------------------------------------------------------------------------
const MEASURE = `(() => {
  const vw = innerWidth, vh = innerHeight, out = {clip: [], cut: [], small: [], overlap: [], covered: [], scroll: [], noname: [], fakebtn: [], spacing: [], tiny: [], state: [], nested: [], dialog: [], motion: []};
  const sel = e => { const parts = []; for (let n = e; n && n.nodeType === 1 && parts.length < 3; n = n.parentElement) parts.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : '')); return parts.join(' < '); };
  const visible = e => { if (!e.getClientRects().length) return false; for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < .05) return false; if (n.tagName === 'DIALOG' && !n.open) return false; if (n.closest('details:not([open])') && !n.closest('summary') && n.parentElement?.tagName === 'DETAILS' && n.tagName !== 'SUMMARY') return false; } return true; };
  const isScroller = s => /(auto|scroll)/.test(s.overflowX + s.overflowY);
  const all = [...document.body.querySelectorAll('*')].filter(e => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'DEFS', 'BR', 'OPTION', 'CANVAS', 'IMG', 'USE', 'G', 'RECT', 'CIRCLE'].includes(e.tagName.toUpperCase()) && !(e instanceof SVGElement) && visible(e));
  const topLayer = (() => {
    const d = [...document.querySelectorAll('dialog[open]')].pop(); const reader = document.querySelector('.dk2-read:not([hidden]),.flight-entry'); if (reader && reader.getBoundingClientRect().width >= vw * .6) return reader; const hit = document.elementFromPoint(vw / 2, vh / 2);
    let best = null; for (let n = hit; n && n !== document.body && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n), r = n.getBoundingClientRect(); if (/(fixed|absolute)/.test(s.position) && r.width >= vw * .8 && r.height >= vh * .8 && n.id !== 'app') best = n; }
    return best || d || null;
  })();
  const inScope = e => !topLayer || topLayer.contains(e);
  const visibleAtCentre = e => { const r = e.getBoundingClientRect(); const x = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(vh - 1, Math.max(0, r.top + r.height / 2)); const t = document.elementFromPoint(x, y); return !!t && (e.contains(t) || t.contains(e)); };
  const hiddenByScroller = e => { const b = e.getBoundingClientRect(); for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const nb = n.getBoundingClientRect(); if (b.bottom <= nb.top + 1 || b.top >= nb.bottom - 1 || b.right <= nb.left + 1 || b.left >= nb.right - 1) return true; } } return false; };
  const items = all.filter(inScope);
  const seen = new Set(), note = (k, e, msg) => { const key = k + sel(e) + msg; if (seen.has(key)) return; seen.add(key); out[k].push({sel: sel(e), msg}); };
  const rectText = e => { const r = e.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); };
  for (const e of items) {
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.clientWidth > 1 && e.clientHeight > 1; // 1 px boxes are screen-reader-only text
    const interactive = e.matches('button,a[href],[role=button],summary,input:not([type=hidden]),select,textarea,[data-action]');
    // clipped: outside the viewport, or outside an ancestor that clips without scrolling
    if (hasText || interactive || e.matches('h1,h2,h3,p,li,figure,dd,dt')) {
      if (e.closest('[aria-hidden=true]') && !interactive) continue;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) {
        let scrolled = false; for (let n = e.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n); if (isScroller(s) && n.scrollHeight > n.clientHeight + 1 || isScroller(s) && n.scrollWidth > n.clientWidth + 1) { scrolled = true; break; } }
        if (!scrolled && getComputedStyle(document.documentElement).overflowY !== 'hidden' && document.documentElement.scrollHeight > vh + 1) scrolled = true;
        if (!scrolled) note('clip', e, 'outside viewport ' + rectText(e) + ' vs ' + vw + 'x' + vh);
      }
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n); if (s.overflow === 'visible' && s.overflowX === 'visible' && s.overflowY === 'visible') continue;
        if (n.tagName === 'DIALOG') break;
        const b = n.getBoundingClientRect(); const tol = 1.5;
        if (r.top < b.top - tol || r.bottom > b.bottom + tol || r.left < b.left - tol || r.right > b.right + tol) {
          if (isScroller(s)) break; // reachable by scrolling
          note('clip', e, 'cut by ' + sel(n) + ' ' + rectText(e) + ' in ' + rectText(n));
        }
        if (!isScroller(s)) continue; break;
      }
    }
    // text cut by its own box
    if (hasText) {
      const s = getComputedStyle(e);
      if (!isScroller(s) && (s.overflowX !== 'visible' || s.overflowY !== 'visible') && s.display !== 'inline') {
        if (e.scrollWidth > e.clientWidth + 1 && s.textOverflow !== 'ellipsis') note('cut', e, 'scrollWidth ' + e.scrollWidth + ' > ' + e.clientWidth + ' "' + e.textContent.trim().slice(0, 30) + '"');
        if (e.scrollHeight > e.clientHeight + 1) note('cut', e, 'scrollHeight ' + e.scrollHeight + ' > ' + e.clientHeight + ' "' + e.textContent.trim().slice(0, 30) + '"');
        if (s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) note('cut', e, 'ellipsis truncates "' + e.textContent.trim().slice(0, 30) + '"');
      }
      if (s.webkitLineClamp && s.webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 1) note('cut', e, 'line-clamp hides text');
    }
    // tap targets (inline links in running text are exempt, like the WCAG rule)
    if (e.matches('button,a[href],[role=button],summary,[role=checkbox],[role=tab],input[type=checkbox],input[type=range],select')) {
      const s = getComputedStyle(e), inline = s.display === 'inline' && e.closest('p,li,span,small,div') && !e.matches('summary');
      const inlineInText = e.matches('.card-term,[data-card-term],[data-card-term-key]') && !e.matches('.card-term-symbol');
      if ((r.width < 40 || r.height < 40) && !inline && !inlineInText) note('small', e, Math.round(r.width) + 'x' + Math.round(r.height) + ' "' + (e.textContent.trim() || e.getAttribute('aria-label') || '').slice(0, 24) + '"');
    }
    if (e.matches('.card-term,[data-card-term],[data-card-term-key]') && !e.matches('.card-term-symbol')) out.inlineLinks = (out.inlineLinks || 0) + 1;
    // scrollbars the player can see
    const cs = getComputedStyle(e);
    if (isScroller(cs) && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2)) note('scroll', e, 'scrolls ' + e.scrollWidth + 'x' + e.scrollHeight + ' in ' + e.clientWidth + 'x' + e.clientHeight + (e.scrollHeight > e.clientHeight + 2 ? ' (vertical)' : '') + (e.scrollWidth > e.clientWidth + 2 ? ' (horizontal)' : ''));
  }
  // overlapping controls
  const controls = items.filter(e => e.matches('button,a[href],[role=button],summary,[role=tab],[role=checkbox]') && e.getBoundingClientRect().width > 4);
  for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
    const a = controls[i], b = controls[j]; if (a.contains(b) || b.contains(a) || hiddenByScroller(a) || hiddenByScroller(b) || !visibleAtCentre(a) || !visibleAtCentre(b)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 3 && h > 3 && w * h > 24) {
      const inlineA = getComputedStyle(a).display === 'inline', inlineB = getComputedStyle(b).display === 'inline'; if (inlineA || inlineB) continue;
      note('overlap', a, 'overlaps ' + sel(b) + ' by ' + Math.round(w) + 'x' + Math.round(h));
    }
  }
  // text covered by something that is not its own ancestor or descendant
  for (const e of items) {
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) || e.clientWidth <= 1) continue;
    const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect();
    if (b.width < 3 || b.height < 3 || b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) continue;
    const pts = [[.25, .5], [.75, .5]];
    for (const [fx, fy] of pts) {
      const x = Math.min(vw - 1, Math.max(0, b.left + b.width * fx)), y = Math.min(vh - 1, Math.max(0, b.top + b.height * fy));
      const top = document.elementFromPoint(x, y);
      if (top && !e.contains(top) && !top.contains(e) && inScope(e) && getComputedStyle(e).pointerEvents !== 'none' && !e.closest('[style*="pointer-events"]') && !(top.closest('[aria-hidden=true]') && !top.closest('button,a'))) {
        let scrolledOut = false; for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (s.overflow !== 'visible') { const bb = n.getBoundingClientRect(); if (b.bottom > bb.bottom + 1 || b.top < bb.top - 1 || b.right > bb.right + 1 || b.left < bb.left - 1) { scrolledOut = true; break; } } }
        if (scrolledOut) break;
        note('covered', e, '"' + e.textContent.trim().slice(0, 28) + '" covered by ' + sel(top)); break;
      }
    }
  }

  // ---- accessibility and handling checks -------------------------------------------------------------------------------------------
  const nameOf = e => { const t = e.textContent.trim(); if (t) return t; if (e.getAttribute('aria-label')) return e.getAttribute('aria-label'); const lb = e.getAttribute('aria-labelledby'); if (lb && document.getElementById(lb.split(' ')[0])?.textContent.trim()) return 'x'; if (e.getAttribute('title')) return e.getAttribute('title'); if (e.querySelector('img[alt]:not([alt=""]),svg[aria-label],svg title,[aria-label]')) return 'x'; if (e.tagName === 'INPUT' && (e.labels?.length || e.getAttribute('aria-label'))) return 'x'; return ''; };
  const natural = e => e.matches('button,a[href],summary,input,select,textarea');
  for (const e of items) {
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (e.matches('button,a[href],[role=button],[role=tab],[role=checkbox],summary,input:not([type=hidden]),select') && !nameOf(e)) note('noname', e, 'no accessible name ' + rectText(e));
    if (e.matches('[data-action],[data-card-term-trigger],[data-deck-context-open]') && !natural(e) && !e.matches('[role=button],[role=tab],[role=checkbox],[role=link]')) note('fakebtn', e, 'clickable but not a real button (no role) ' + rectText(e));
    if ((e.matches('[role=button],[role=tab],[role=checkbox]') && !natural(e)) && e.tabIndex < 0) note('fakebtn', e, 'role button not focusable');
    const s = getComputedStyle(e);
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) && parseFloat(s.fontSize) < 11 && !e.closest('[aria-hidden=true],svg')) note('tiny', e, s.fontSize + ' "' + e.textContent.trim().slice(0, 24) + '"');
    if (e.matches('button,[role=button],[role=tab]') && !e.closest('[aria-hidden=true]')) {
      const cls = ' ' + e.className + ' ', toggled = /s(selected|active|is-on|is-active|current|on|chosen|dk2-on)s/.test(cls) || e.classList.contains('selected');
      const hasState = ['aria-pressed', 'aria-checked', 'aria-current', 'aria-selected', 'aria-expanded'].some(a => e.hasAttribute(a));
      if (toggled && !hasState) note('state', e, 'looks selected but has no aria state "' + (e.textContent.trim() || e.getAttribute('aria-label') || '').slice(0, 20) + '"');
    }
    if (isScroller(s) && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2)) { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const ns = getComputedStyle(n); if (isScroller(ns) && (n.scrollHeight > n.clientHeight + 2 || n.scrollWidth > n.clientWidth + 2) && n.tagName !== 'DIALOG') { note('nested', e, 'scrolls inside scrolling ' + sel(n)); break; } } }
  }
  // neighbouring controls closer than 6 px
  const real = items.filter(e => e.matches('button,a[href],[role=button],[role=tab],summary,input:not([type=hidden])') && getComputedStyle(e).display !== 'inline' && e.getBoundingClientRect().width >= 16 && !hiddenByScroller(e) && !e.matches('.card-term-symbol,.card-help'));
  for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++) {
    const a = real[i], b = real[j]; if (a.contains(b) || b.contains(a) || !visibleAtCentre(a) || !visibleAtCentre(b)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const gx = Math.max(rb.left - ra.right, ra.left - rb.right), gy = Math.max(rb.top - ra.bottom, ra.top - rb.bottom);
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if ((gx >= 1 && gx < 6 && oy > 8) || (gy >= 1 && gy < 6 && ox > 8)) note('spacing', a, 'only ' + Math.round(Math.min(gx < 0 ? 99 : gx, gy < 0 ? 99 : gy)) + 'px from ' + sel(b));
  }
  // dialogs: named, focus inside
  for (const d of [...document.querySelectorAll('dialog[open]')].slice(-1)) {
    if (!d.getAttribute('aria-label') && !d.getAttribute('aria-labelledby') && !d.querySelector('h1,h2')) note('dialog', d, 'dialog has no name');
    if (!d.contains(document.activeElement)) note('dialog', d, 'focus is not inside the open dialog');
  }
  out.motion = document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity && a.effect.target && !(a.effect.target instanceof SVGElement && false)).slice(0, 4).map(a => ({sel: sel(a.effect.target), msg: 'infinite animation ' + (a.animationName || a.transitionProperty || '')}));
  out.viewport = vw + 'x' + vh;
  out.docScroll = document.documentElement.scrollHeight > vh + 1 || document.documentElement.scrollWidth > vw + 1;
  return out;
})()`;

const KINDS = {clip: 'clipped', cut: 'text cut', small: 'tap <40px', overlap: 'overlap', covered: 'text covered', scroll: 'inner scroll', low: 'contrast', noname: 'no name', fakebtn: 'not a button', spacing: 'gap <6px', tiny: 'text <11px', state: 'no aria state', nested: 'nested scroll', dialog: 'dialog', esc: 'escape', motion: 'motion'};
const results = [], cannot = [];
async function measure(screen, w, h, extra = {}) {
  const m = await ev(MEASURE);
  const items = await ev(COLLECT);
  const s = await send('Page.captureScreenshot', {format: 'png'});
  await fs.writeFile(path.join(OUT, `${screen}-${w}x${h}.png`), Buffer.from(s.data, 'base64'));
  const c = items.length ? await ev(SAMPLE(s.data, items)) : {low: [], skipped: 0, checked: 0};
  m.esc = [];
  if (await ev("!!document.querySelector('dialog[open]')")) {
    // The browser closes a dialog on Escape unless the page cancels the 'cancel' event; a page that cancels it must step back itself.
    const verdict = await ev("(async()=>{const ds=[...document.querySelectorAll('dialog[open]')],d=ds[ds.length-1];const before=d.innerHTML.length+'|'+ds.length;const ev=new Event('cancel',{cancelable:true});d.dispatchEvent(ev);if(!ev.defaultPrevented)return '';await new Promise(r=>setTimeout(r,350));const now=[...document.querySelectorAll('dialog[open]')];const last=now[now.length-1];return (last===d&&d.innerHTML.length+'|'+now.length===before)?d.className.slice(0,60):'';})()");
    if (verdict) m.esc.push({sel: 'dialog.' + verdict, msg: 'Escape does nothing: the dialog cancels it and does not step back'});
  }
  m.low = c.low.map(l => ({sel: l.selector, msg: `"${l.text}" ${l.fg} on ${l.bg} ${l.ratio}:1 ${l.size}px${/^(h[1-4]|legend|summary)\b/.test(l.selector) ? ' HEADING' : ''}`}));
  m.fit = (m.clip.length || m.cut.length) ? 'clipped' : (m.scroll.length || m.docScroll) ? 'scrolls' : 'fits';
  results.push({screen, size: `${w}x${h}`, m});
  const n = Object.keys(KINDS).reduce((a, k) => a + (m[k]?.length || 0), 0);
  console.log(`\n== ${screen} @ ${w}x${h}  issues ${n}  FIT ${m.fit}  (inline links ${m.inlineLinks || 0}, image-backed texts skipped ${c.skipped}${m.docScroll ? ', DOCUMENT SCROLLS' : ''})`);
  if (!QUIET || n) for (const k of Object.keys(KINDS)) for (const i of (m[k] || [])) console.log(`  ${KINDS[k].padEnd(13)} ${i.sel}  ${i.msg}`);
}

// ---- screens ---------------------------------------------------------------------------------------------------------------------------
import {SCREENS} from './lib/menu-audit-screens.mjs';
const ctx = {go, ev, click, clickText, inject, exists, delay, until, send, setSize};
try {
  for (const screen of SCREENS) {
    if (ONLY && !ONLY.some(o => o === screen.name || (o.endsWith('*') && screen.name.startsWith(o.slice(0, -1))))) continue;
    for (const [w, h] of SIZES) {
      errors = [];
      for (let attempt = 1; attempt <= 3; attempt++) try {
        await setSize(w, h);
        await screen.open(ctx, w, h);
        if (arg('eval')) console.log(JSON.stringify(await ev(arg('eval'))));
        if (arg('probe')) { const {probe} = await import('./lib/rules-probe.mjs'); console.log(await ev(`(${probe.toString()})(${JSON.stringify(arg('probe'))},${JSON.stringify(arg('props') || 'background|border-image|box-shadow')})`)); }
        await measure(screen.name, w, h);
        break;
      } catch (e) {
        if (attempt < 3) { await send('Page.navigate', {url: 'about:blank'}).catch(() => {}); await delay(500); continue; }
        const why = screen.name + ' @ ' + w + 'x' + h + ': ' + e.message.split('\n')[0].slice(0, 120);
        if (!cannot.includes(why)) cannot.push(why);
        console.log('\n!! could not open ' + why);
      }
    }
  }
  const kinds = {};
  for (const r of results) for (const k of Object.keys(KINDS)) kinds[k] = (kinds[k] || 0) + (r.m[k]?.length || 0);
  console.log('\nSCREENS OPENED:', new Set(results.map(r => r.screen)).size, ' NOT OPENED:', cannot.length);
  console.log('TOTAL BY KIND:', Object.entries(kinds).map(([k, v]) => KINDS[k] + ' ' + v).join(', '));
  if (cannot.length) console.log(cannot.map(c => '- ' + c).join('\n'));
  await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify({results, cannot}, null, 1));
} catch (e) { console.log('FAILED', e.stack, errors); process.exitCode = 1; } finally {
  socket.close(); browser.kill(); server.close();
  await fs.rm(profile, {recursive: true, force: true}).catch(() => {});
}
