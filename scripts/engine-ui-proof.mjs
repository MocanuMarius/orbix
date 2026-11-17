// Captures and layout checks for the engine UI (Chain tab with engines, Trigger badges, Trigger collection,
// Black Hole confirmation, flight strip cues). Run: node scripts/engine-ui-proof.mjs <set> [<set> ...]
// Writes PNGs and a JSON report to outputs/engine-ui/. Uses headless Chrome over the DevTools protocol, like the
// other proof scripts, on a local static server for dist/. Mock runs only (?mock=cards / ?mock=engine): nothing saved.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const OUT = path.resolve('outputs/engine-ui');
await fs.mkdir(OUT, {recursive: true});
export const SIZES = [[915, 412], [900, 405], [740, 333], [667, 300]];
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.json': 'application/json', '.mp4': 'video/mp4'};
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
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-ui-'));
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
let serial = 0; const pending = new Map(); const errors = []; const consoleErrors = [];
socket.addEventListener('message', event => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(Error(m.error.message)) : ok(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon|404/.test(m.params.entry.text + m.params.entry.url)) consoleErrors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
const send = (method, params = {}) => new Promise((ok, ko) => { const id = ++serial; pending.set(id, [ok, ko]); socket.send(JSON.stringify({id, method, params})); });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
export const ev = async expression => {
  const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
export async function size(w, h) {
  await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: true});
  await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
  await delay(120);
}
export async function shot(name) {
  const s = await send('Page.captureScreenshot', {format: 'png'});
  await fs.writeFile(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
  return name;
}
export async function go(url, ready = '#dk-root') {
  await send('Page.navigate', {url: base + url});
  await delay(300);
  await until(() => ev(`!!document.querySelector(${JSON.stringify(ready)})`), 'ready ' + url, 200);
  await ev('document.fonts?.ready.then(()=>true)');
  await delay(250);
}
export async function click(selector) {
  const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView?.({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await delay(120);
}
// Layout check inside a root: elements outside the viewport, text overflowing its box, text under 11px,
// controls under 44x44, and overlaps between the named groups.
export async function measure(label, root = '#dk-root', {overlap = []} = {}) {
  return ev(`(()=>{
    const root=document.querySelector(${JSON.stringify(root)})||document.body, W=innerWidth, H=innerHeight, out={label:${JSON.stringify(label)},offscreen:[],overflow:[],small:[],tiny:[],overlaps:[]};
    const vis=e=>{const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
    const name=e=>(e.id?'#'+e.id:'')+'.'+[...e.classList].slice(0,3).join('.')+' "'+(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,30)+'"';
    for(const e of root.querySelectorAll('*')){
      if(!vis(e)||e.closest('[inert],[hidden],.dk-sr,svg'))continue;
      const r=e.getBoundingClientRect();
      if((r.right>W+1||r.bottom>H+1||r.left<-1||r.top<-1)&&!e.closest('.dk21-grid,.tb-list'))out.offscreen.push(name(e)+' '+[r.left,r.top,r.right,r.bottom].map(Math.round));
      const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
      if(own){const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<11)out.tiny.push(name(e)+' '+fs+'px');
        const s=getComputedStyle(e);if(s.textOverflow!=='ellipsis'&&(e.scrollWidth>e.clientWidth+1&&s.overflow!=='visible'||e.scrollHeight>e.clientHeight+2&&s.overflowY==='hidden'&&!/-webkit-box/.test(s.display)))out.overflow.push(name(e));}
      if((e.matches('button,[role=button],a[href]')&&!e.closest('.skill-card'))&&!e.matches('.dk-sr *')){if((r.width<43.5||r.height<43.5)&&!e.closest('.card-term-dialog'))out.small.push(name(e)+' '+Math.round(r.width)+'x'+Math.round(r.height));}
    }
    const groups=${JSON.stringify(overlap)}.map(sel=>[...root.querySelectorAll(sel)].filter(vis).map(e=>({e,r:e.getBoundingClientRect()})));
    const all=groups.flat();
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j];if(a.e.contains(b.e)||b.e.contains(a.e))continue;
      const x=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left),y=Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top);if(x>1&&y>1)out.overlaps.push(name(a.e)+' x '+name(b.e)+' '+Math.round(x)+'x'+Math.round(y));}
    return out;})()`);
}
export const report = {errors, consoleErrors, checks: []};
export async function finish() {
  report.errors = errors; report.consoleErrors = consoleErrors;
  await fs.writeFile(path.join(OUT, 'report-' + (process.argv.slice(2).join('-').replace(/[^a-z0-9-]/gi, '_') || 'all') + '.json'), JSON.stringify(report, null, 1));
  socket.close(); browser.kill(); server.close();
}

const sets = process.argv.slice(2);
const CHAIN_OVERLAP = ['.dk2-plate:not(.dk2-plate-empty)', '.dk2-swap', '#dk2-play', '.dk2-card', '.dk22-medal', '.en-ret-tag', '.en-dial', '.en-runs', '.dk21-eye'];
const sized = async (fn) => { for (const [w, h] of SIZES) { await size(w, h); await fn(w, h); } };
const check = async (label, opts) => { const m = await measure(label, '#dk-root', opts); report.checks.push(m); const bad = m.offscreen.length + m.overflow.length + m.small.length + m.tiny.length + m.overlaps.length; console.log(label, bad ? JSON.stringify(m) : 'clean'); return m; };

try {
  for (const set of sets) {
    const tag = set.startsWith('peek') ? 'x' : set.split(':')[1] || 'after';
    const name = set.split(':')[0];
    if (name === 'chain') await sized(async (w, h) => {
      await go('/game.html?mock=cards&chain=echo,spark-cache,deep-vessel,body-spark,harvest-rare');
      await shot(`chain-normal-${tag}-${w}x${h}`); await check(`chain-normal-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
    });
    if (name === 'deck') await sized(async (w, h) => {
      await go('/game.html?mock=cards&chain=echo,spark-cache,deep-vessel&reserve=body-spark,harvest-rare,harvest-legendary,camp-kit,prism-lens-ii,flash-handling,crescendo,growth-seed');
      await click('#dk2-tab-deck'); await delay(200);
      await shot(`deck-tiles-${tag}-${w}x${h}`); await check(`deck-tiles-${tag}-${w}x${h}`);
    });
    if (name === 'open') await sized(async (w, h) => {
      for (const [i, id] of [[0, 'common'], [1, 'rare'], [2, 'legendary']]) {
        await go('/game.html?mock=cards&chain=body-spark,crescendo,echo-iii');
        await click(`.dk21-eye[data-slot="${i}"]`); await delay(250);
        await shot(`open-${id}-${tag}-${w}x${h}`); await check(`open-${id}-${tag}-${w}x${h}`);
      }
    });
    if (name === 'engine') await sized(async (w, h) => {
      await go('/game.html?mock=engine');
      await shot(`engine-rest-${tag}-${w}x${h}`); await check(`engine-rest-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
      if (await ev(`!!document.querySelector('#dk2-play')`)) {
        await click('#dk2-play'); await delay(2600);
        await shot(`engine-play-${tag}-${w}x${h}`); await check(`engine-play-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
        await until(() => ev(`!!document.querySelector('.dk-stopped')`), 'engine stop', 600);
        await delay(300);
        await shot(`engine-stopped-${tag}-${w}x${h}`); await check(`engine-stopped-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
      }
    });
    if (name === 'notimer') await sized(async (w, h) => {
      await go('/game.html?mock=engine&chain=first-catch,spark-chime,ember-bell');
      await shot(`engine-notimer-${tag}-${w}x${h}`); await check(`engine-notimer-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
    });
    if (name === 'long') await sized(async (w, h) => {
      await go('/game.html?mock=engine&chain=close-call,metronome,courier-tip-iii,overflow-bell,heartbeat');
      await shot(`engine-long-${tag}-${w}x${h}`); await check(`engine-long-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
      await go('/game.html?mock=cards&chain=kindling-bead-iii,courier-tip-iii,growth-seed-legendary,mirror-grain,second-sun');
      await shot(`chain-long-${tag}-${w}x${h}`); await check(`chain-long-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
    });
    if (name === 'book') await sized(async (w, h) => {
      await go('/game.html?mock=engine');
      await click('#dk2-tab-triggers'); await delay(200);
      await shot(`book-owned-${tag}-${w}x${h}`); await check(`book-owned-${tag}-${w}x${h}`);
      await ev(`document.querySelector('#tb-scroll').scrollTop=9999`); await delay(150);
      await shot(`book-owned-end-${tag}-${w}x${h}`);
      await click('.tb-card'); await delay(200);
      await shot(`book-inspect-${tag}-${w}x${h}`); await check(`book-inspect-${tag}-${w}x${h}`);
      await click('#dk2-close'); await delay(150);
      report.checks.push({label: `book-back-${w}x${h}`, tabAfterClose: await ev(`document.querySelector('#dk-root').dataset.view`)});
      await click('#tb-back'); await delay(150);
      report.checks.push({label: `book-back-to-${w}x${h}`, tab: await ev(`document.querySelector('#dk-root').dataset.view`)});
      await go('/game.html?mock=cards&chain=body-spark,-,-&reserve=deep-vessel');
      await click('#dk2-tab-triggers'); await delay(200);
      await shot(`book-few-${tag}-${w}x${h}`); await check(`book-few-${tag}-${w}x${h}`);
    });
    if (name === 'glossary') {
      await size(915, 412);
      await go('/game.html?mock=engine');
      await click('.dk21-eye[data-slot="1"]'); await delay(200);
      await click('.dk21-on [data-card-term]'); await delay(300);
      await shot(`glossary-term-${tag}`);
      await click('.card-term-dialog [data-trigger-book]'); await delay(300);
      report.checks.push({label: 'glossary-to-book', tab: await ev(`document.querySelector('#dk-root').dataset.view`)});
      await shot(`glossary-to-book-${tag}`);
    }
    if (name === 'confirm') await sized(async (w, h) => {
      await go('/game.html?mock=cards&scenario=departure&chain=black-hole,spark-chime,body-spark', '.entry-depart');
      await until(() => ev(`!!document.querySelector('.entry-depart:not([disabled])')`), 'depart ready', 300);
      await click('.entry-depart'); await delay(250);
      await until(() => ev(`!!document.querySelector('dialog.bh-confirm[open]')`), 'confirm', 50);
      await shot(`takeoff-confirm-${tag}-${w}x${h}`);
      report.checks.push(await measure(`takeoff-confirm-${w}x${h}`, 'dialog.bh-confirm'));
      report.checks.push({label: `confirm-text-${w}x${h}`, text: await ev(`document.querySelector('.bh-confirm-q').textContent`)});
      await click('dialog.bh-confirm [data-bh="cancel"]'); await delay(300);
      report.checks.push({label: `confirm-cancel-${w}x${h}`, flightGone: await ev(`!document.querySelector('.flight-entry')`), dialog: await ev(`!!document.querySelector('dialog.bh-confirm')`)});
      if (w === 915) {
        await go('/game.html?mock=cards&scenario=departure&chain=black-hole,spark-chime,body-spark', '.entry-depart');
        await until(() => ev(`!!document.querySelector('.entry-depart:not([disabled])')`), 'depart ready 2', 300);
        await click('.entry-depart'); await delay(250);
        await click('dialog.bh-confirm [data-bh="fly"]'); await delay(400);
        report.checks.push({label: 'confirm-fly', entryGone: await ev(`!document.querySelector('.flight-entry')`), dialog: await ev(`!!document.querySelector('dialog.bh-confirm')`)});
        await shot(`takeoff-after-fly-${tag}`);
      }
    });
    if (name === 'flight') {
      await size(915, 412);
      await go('/game.html?mock=cards&scenario=departure&chain=first-catch,spark-chime,ember-bell,slow-wick,wave-loom', '.entry-depart');
      await until(() => ev(`!!document.querySelector('.entry-depart:not([disabled])')`), 'depart ready', 300);
      await click('.entry-depart'); await delay(600);
      // Drive the live flight's engine: low meter, then a Collect (First Catch starts the Chime loop).
      await ev(`(async()=>{const e=__mockFlight();const F=await import('./card-engine-flight.mjs?v=guide-clarity-1');e.flame=Math.min(e.flame,e.maxFlame*.3);F.raiseFlightEngine(e,'collect',{pickupKind:'light'});return true})()`);
      const samples = [];
      // Keep the wisp aloft with a Lift every 250 ms (no input otherwise), so the flight lasts.
      await ev(`(()=>{globalThis.__lifter=setInterval(()=>{const e=__mockFlight();if(e&&e.player.y>e.height*.45)e.flap?.()},250);return true})()`);
      for (let i = 0; i < 6; i++) {
        await delay(1000);
        if (!(await ev(`!!__mockFlight()`))) { samples.push({ended: true}); break; }
        samples.push(await ev(`(()=>{const e=__mockFlight();const s=e.cardEngine?.state;const b=document.querySelector('.flight-card-row');return {t:e.time,turns:s?.turns,running:s?.running,progress:s?.timers?.[0]?.progress,cue:!document.querySelector('.card-row-engine')?.hidden,ring:document.querySelector('.card-row-ring')?.style.getPropertyValue('--k'),text:(b?.innerText||'').trim()}})()`));
        if (i === 3) await shot(`flight-strip-${tag}`);
      }
      report.checks.push({label: 'flight-strip', samples});
      console.log(JSON.stringify(samples));
    }
    if (name === 'ceremony') await sized(async (w, h) => {
      await go('/game.html?mock=cards&scenario=pack&engine=1', '.flight-reward-income,.card-draft-screen,.artifact-reward-screen');
      await delay(2500);
      await ev(`document.querySelectorAll('[data-receipt-scroll]').forEach(n=>{const row=[...n.querySelectorAll('.flight-reward-source-row')].find(r=>/Pack cards/.test(r.textContent));row?.scrollIntoView({block:'center'})})`); await delay(200);
      await shot(`ceremony-${tag}-${w}x${h}`);
      report.checks.push({label: `ceremony-${w}x${h}`, lines: await ev(`[...document.querySelectorAll('.flight-reward-source-row')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())`)});
    });
    if (name === 'grey') {
      await size(915, 412);
      await go('/game.html?mock=cards&chain=echo,spark-cache,deep-vessel&reserve=body-spark,harvest-rare,harvest-legendary,camp-kit,prism-lens-ii,flash-handling,crescendo,growth-seed');
      await click('#dk2-tab-deck'); await delay(200);
      await ev(`document.querySelector('dialog[open]').style.filter='grayscale(1)'`);
      await shot(`deck-tiles-greyscale-${tag}`);
      await ev(`document.querySelector('dialog[open]').style.filter=''`);
      // Contrast of the name and effect lines on each rarity ground (WCAG relative luminance).
      report.checks.push({label: 'tile-contrast', values: await ev(`(()=>{const L=c=>{const v=c.match(/\\d+/g).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};const ratio=(a,b)=>{const x=L(a),y=L(b);return Math.round((Math.max(x,y)+.05)/(Math.min(x,y)+.05)*10)/10};const grounds={common:'rgb(235,230,208)',rare:'rgb(210,225,228)',legendary:'rgb(227,214,236)'};const out={};for(const r of ['common','rare','legendary']){const t=document.querySelector('.dk2-tile.dc-r-'+r+':not(.dk21-inchain)')||document.querySelector('.dk2-tile.dc-r-'+r);if(!t)continue;out[r]={name:ratio(getComputedStyle(t.querySelector('.dk2-name')).color,grounds[r]),effect:ratio(getComputedStyle(t.querySelector('.dk2-effect')).color,grounds[r])}}return out})()`)});
      console.log(JSON.stringify(report.checks.at(-1)));
    }
    if (name === 'peek') { await size(915, 412); await go(decodeURIComponent(set.split(':').slice(1).join(':')), 'body'); await delay(1500); await shot('peek'); console.log(await ev(`[...document.querySelectorAll('[data-action]')].map(b=>b.dataset.action).join(',')`)); }
    if (name === 'smoke') {
      // An ordinary non-engine run: home, Deck (Chain, Deck, Triggers), departure, flight, then the reward ceremony.
      await size(915, 412);
      await go('/game.html', '.front-new-button,[data-action="new-game"],[data-action="play"]'); await shot('smoke-home');
      await go('/game.html?mock=cards', '#dk-root'); await click('#dk2-tab-deck'); await click('#dk2-tab-triggers'); await click('#dk2-tab-chain'); await click('#dk2-play'); await delay(3000); await shot('smoke-deck');
      await go('/game.html?mock=cards&scenario=departure', '.entry-depart');
      await until(() => ev(`!!document.querySelector('.entry-depart:not([disabled])')`), 'depart', 300); await click('.entry-depart'); await delay(400);
      report.checks.push({label: 'smoke-departed', noDialog: await ev(`!document.querySelector('dialog.bh-confirm')`), flying: await ev(`!document.querySelector('.flight-entry')`)});
      await delay(1500); await shot('smoke-flight');
      await go('/game.html?mock=cards&scenario=pack', '.flight-reward-income,.card-draft-screen,.artifact-reward-screen'); await delay(2500); await shot('smoke-reward');
      console.log(JSON.stringify(report.checks.at(-1)));
    }
    if (name === 'hole') await sized(async (w, h) => {
      await go('/game.html?mock=engine&chain=black-hole,spark-chime,first-catch,ember-bell,slow-wick');
      await shot(`blackhole-${tag}-${w}x${h}`); await check(`blackhole-${tag}-${w}x${h}`, {overlap: CHAIN_OVERLAP});
    });
  }
} catch (error) { console.error(error); report.fatal = String(error); }
console.log('errors', JSON.stringify(errors), 'console', JSON.stringify(consoleErrors));
await finish();
