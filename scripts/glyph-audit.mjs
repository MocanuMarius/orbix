// Inscription glyph audit (docs/glyph-audit.md): opens every screen that draws an Inscription glyph at the owner's phone sizes,
// takes a screenshot of each into outputs/glyph-audit/, and checks in the page: glyphs drawn at a whole multiple of their grid
// (no fractional scale from CSS or a parent transform), glyphs not clipped, the slot brand not overlapping the card's parts, no
// page or inner scrolling on the Inscription screens, Choose/slot buttons fully visible and at least 40 px tall.
// Run: node scripts/glyph-audit.mjs [scene ...] [--sizes=890x400,915x412,740x333]
// Headless Chrome with a throwaway profile over the DevTools protocol, on a local static server for dist/. Mock runs only: nothing is saved.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const OUT = path.resolve('outputs/glyph-audit');
await fs.mkdir(OUT, {recursive: true});
const args = process.argv.slice(2);
const SIZES = (args.find(a => a.startsWith('--sizes='))?.slice(8) || '890x400,915x412,740x333').split(',').map(s => s.split('x').map(Number));
const wanted = args.filter(a => !a.startsWith('--'));
const CHAIN = 'game.html?cards=1&mock=cards';
const SCENES = [
  {id: 'chain-3', url: `${CHAIN}&chain=rhythm,echo,body-spark&slots=0:twin-mark,1:mending~2,2:gilded&new=1`, ready: '#dk-root .dk2-station', root: '#dk-root'},
  {id: 'chain-empty', url: `${CHAIN}&chain=rhythm,-,body-spark,-&slots=1:hollow,2:closed-eye,3:edgeward~3`, ready: '#dk-root .dk2-station', root: '#dk-root'},
  {id: 'chain-5', url: `${CHAIN}&chain=rhythm,echo,body-spark,harvest-rare,lift-guide&slots=0:cinder,1:brimful,2:courier~1,3:whetted,4:long-cord`, ready: '#dk-root .dk2-station', root: '#dk-root'},
  {id: 'chain-6', url: `${CHAIN}&chain=rhythm,echo,body-spark,harvest-rare,lift-guide,proximity&slots=0:cinder,1:brimful,2:courier~1,3:whetted,4:long-cord,5:night-ledger`, ready: '#dk-root .dk2-station', root: '#dk-root'},
  {id: 'brand-tip', url: `${CHAIN}&chain=rhythm,echo,body-spark&slots=0:gilded,0:mending~2,2:hollow`, ready: '#dk-root .dk2-ins-brand', root: '#dk-root', act: [['click', '#dk-root .dk2-ins-brand']]},
  {id: 'inspector-covered', url: `${CHAIN}&chain=rhythm,echo,body-spark&slots=0:gilded,0:mending~2,2:hollow`, ready: '#dk-root .dk2-station', root: '#dk-root', act: [['click', '#dk-root .dk2-station[data-slot="0"] .dk2-card']]},
  {id: 'glossary', url: `${CHAIN}&chain=rhythm,echo,body-spark&slots=0:gilded`, ready: '#dk-root .dk2-station', root: 'dialog[open]', act: [['click', '#dk-root .dk2-station[data-slot="0"] .dk2-card'], ['click', '.dk2-inscription [data-card-term="inscription"]'], ['open', 'dialog[open] details.ins-legend']]},
  {id: 'scribe-none', url: `${CHAIN}&scenario=scribe&offers=gilded,hearth&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii&slots=1:gilded,2:bell`, ready: '.scribe-screen', root: '.scribe-screen', noScroll: true},
  {id: 'scribe-card', url: `${CHAIN}&scenario=scribe&offers=gilded,hearth&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii&slots=1:gilded,2:bell`, ready: '.scribe-screen', root: '.scribe-screen', noScroll: true, act: [['click', '.iw-offer[data-scribe-offer="gilded"] .iw-select'], ['click', '.iw-slot[data-slot="3"] .iw-select']]},
  {id: 'scribe-replace', url: `${CHAIN}&scenario=scribe&offers=gilded,hearth&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii&slots=1:gilded,2:bell`, ready: '.scribe-screen', root: '.scribe-screen', noScroll: true, act: [['click', '.iw-slot[data-slot="2"] .iw-select'], ['click', '.iw-offer[data-scribe-offer="gilded"] .iw-select']]},
  {id: 'scribe-6', url: `${CHAIN}&scenario=scribe&offers=cinder,brimful&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii,rhythm&slots=1:gilded,2:bell,5:mending~1`, ready: '.scribe-screen', root: '.scribe-screen', noScroll: true, act: [['click', '.iw-offer[data-scribe-offer="brimful"] .iw-select'], ['click', '.iw-slot[data-slot="0"] .iw-select']]},
  {id: 'temp-slots', url: `${CHAIN}&scenario=temp-write&temp=mending&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii&slots=1:gilded,2:bell`, ready: '.scribe-screen', root: '.scribe-screen', noScroll: true},
  {id: 'temp-confirm', url: `${CHAIN}&scenario=temp-write&temp=mending&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii&slots=1:gilded,2:bell`, ready: '.scribe-screen', root: '.scribe-screen', noScroll: true, act: [['click', '.scribe-screen .scribe-slot[data-slot="1"]']]},
  {id: 'chest-slots', url: `${CHAIN}&scenario=chest-write&gift=farLens&chain=harvest-rare,collectors-ledger,-,body-spark,tight-packing-iii,rhythm&slots=1:gilded,2:bell,3:mending~2`, ready: '.scribe-screen', root: '.scribe-screen', noScroll: true},
  {id: 'harness', url: '__glyph-harness.html', ready: 'body[data-ready]', root: 'body', tall: true},
];
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="./ui/card-screens.css"><link rel="stylesheet" href="./route-bonus.css"><link rel="stylesheet" href="./card-ui.css">
<style>body{margin:0;padding:8px;background:#e8d6a4;color:#2a2118;font:12px monospace}h3{margin:6px 0 2px;font:12px monospace}.row{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}.dark{background:#2a2118;color:#f6ebcc;padding:6px}.map{background:#16251d;padding:6px;display:flex;gap:8px}</style>
<h3>Map: Scribe stop icon (map-guide)</h3><div class="map" id="map"></div><h3>Flight preview: temporary effects</h3><div id="temp"></div><h3>Glossary list</h3><div class="dark" id="legend"></div>
<script type="module">import {mapStopIconMarkup} from './map-guide.mjs';import {temporaryEffectsMarkup} from './inscription-ui.mjs';import {inscriptionLegendMarkup} from './card-terms.mjs';
document.getElementById('map').innerHTML=[48,72,96].map(s=>mapStopIconMarkup('scribe',{size:s})).join('');
document.getElementById('temp').innerHTML=temporaryEffectsMarkup({slotInscriptions:[{id:'mending',temporary:true,flightsLeft:2,covers:null},null,{id:'closed-eye',temporary:true,until:'fulfilled',covers:null}]});
try{document.getElementById('legend').innerHTML=inscriptionLegendMarkup().replace('<details','<details open');}catch(e){document.getElementById('legend').textContent='no legend export: '+e.message;}
document.body.dataset.ready='1';</script>`;
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.mp4': 'video/mp4'};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__glyph-harness.html') return res.writeHead(200, {'Content-Type': 'text/html'}).end(HARNESS);
    const file = path.resolve('dist', '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    const data = await fs.readFile(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/';
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'glyph-audit-'));
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--disable-gpu', '--mute-audio', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {windowsHide: true, stdio: 'ignore'});
const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label, tries = 150) { for (let i = 0; i < tries; i++) { try { const v = await fn(); if (v) return v; } catch {} await delay(100); } throw Error('Timed out: ' + label); }
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
const send = (method, params = {}) => new Promise((ok, ko) => { const id = ++serial; pending.set(id, [ok, ko]); socket.send(JSON.stringify({id, method, params})); });
await send('Runtime.enable'); await send('Page.enable');
const ev = async expression => { const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
async function size(w, h) { await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: true}); await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5}); await delay(150); }
async function click(selector) {
  const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView?.({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1});
  await delay(300);
}
// In-page checks. Returns a list of defects (strings).
const CHECK = (root, noScroll, tall) => `(()=>{const out=[];const W=innerWidth,H=${tall ? 1e9 : 'innerHeight'};const R=document.querySelector(${JSON.stringify(root)})||document.body;
const se=document.scrollingElement;if(se.scrollHeight>H+1||se.scrollWidth>W+1+0)out.push('page scrolls '+se.scrollWidth+'x'+se.scrollHeight);
for(const svg of R.querySelectorAll('svg.ins-glyph')){const r=svg.getBoundingClientRect();if(!r.width)continue;const vb=svg.viewBox.baseVal,k=r.width/vb.width,id=svg.dataset.insGlyph;
 if(Math.abs(k-Math.round(k))>0.01||Math.round(k)<1)out.push('fractional glyph '+id+' '+r.width.toFixed(1)+'px on grid '+vb.width);
 if(Math.abs(r.width-r.height)>0.5)out.push('non-square glyph '+id);
 if(r.left<-0.5||r.top<-0.5||r.right>W+0.5||r.bottom>H+0.5)out.push('glyph off screen '+id);
 for(let a=svg.parentElement;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(cs.overflow!=='visible'||cs.overflowX!=='visible'){const b=a.getBoundingClientRect();if(r.left<b.left-0.5||r.right>b.right+0.5||r.top<b.top-0.5||r.bottom>b.bottom+0.5)out.push('glyph clipped '+id+' by '+(a.className.baseVal??a.className).toString().slice(0,40));break;}}
 const c=getComputedStyle(svg).color;if(c==='rgba(0, 0, 0, 0)')out.push('glyph invisible '+id);}
for(const b of R.querySelectorAll('.dk2-ins-brand')){const st=b.closest('.dk2-station');const g=b.querySelector('svg').getBoundingClientRect();if(b.getBoundingClientRect().width<40&&b.getBoundingClientRect().height<40)out.push('brand tap target small '+b.dataset.insId+' '+Math.round(b.getBoundingClientRect().width)+'x'+Math.round(b.getBoundingClientRect().height));
 for(const e of st.querySelectorAll('*')){if(b.contains(e)||e.contains(b)||e.classList.contains('dk2-eyerow')||e.classList.contains('dk2-addcard')||e.classList.contains('dk2-addskin')||e.classList.contains('dk2-ins-frame')||e.closest('.dk2-ins-frame'))continue;const r=e.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden'||+getComputedStyle(e).opacity===0)continue;if(e.children.length&&!/^(BUTTON|IMG|svg)$/i.test(e.tagName)&&!e.className.toString().match(/chip|new|eye|name|label|swap|add/i))continue;
  const ix=Math.min(g.right,r.right)-Math.max(g.left,r.left),iy=Math.min(g.bottom,r.bottom)-Math.max(g.top,r.top);if(ix>1&&iy>1)out.push('brand '+b.dataset.insId+' overlaps '+e.tagName.toLowerCase()+'.'+e.className.toString().slice(0,30)+' '+Math.round(ix)+'x'+Math.round(iy));}
 const cnt=b.querySelector('.dk2-ins-count');if(cnt){const r=cnt.getBoundingClientRect(),ix=Math.min(g.right,r.right)-Math.max(g.left,r.left),iy=Math.min(g.bottom,r.bottom)-Math.max(g.top,r.top);if(ix>1&&iy>1)out.push('counter covers glyph '+b.dataset.insId);}}
if(${!!noScroll}){for(const e of R.querySelectorAll('*')){const cs=getComputedStyle(e);if(e.scrollHeight>e.clientHeight+1&&e.clientHeight>0&&/(auto|scroll)/.test(cs.overflowY))out.push('inner scroll '+e.className.toString().slice(0,40));if(e.scrollHeight>e.clientHeight+2&&e.clientHeight>0&&cs.overflowY==='hidden'&&e.matches('.scribe-choice,.scribe-chosen,.scribe-slot,.scribe-screen,.scribe-offers,.scribe-pick,.scribe-slots'))out.push('content cut off in '+e.className.toString().slice(0,40)+' ('+e.scrollHeight+'>'+e.clientHeight+')');}
 for(const btn of R.querySelectorAll('button.wb-sign,.scribe-slot')){const r=btn.getBoundingClientRect();if(!r.width)continue;if(r.bottom>H+0.5||r.top<-0.5||r.right>W+0.5)out.push('button off screen '+btn.textContent.trim().slice(0,20));
  let a=btn.parentElement;for(;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(cs.overflowY!=='visible'){const b=a.getBoundingClientRect();if(r.bottom>b.bottom+0.5)out.push('button clipped '+btn.textContent.trim().slice(0,20)+' by '+a.className.toString().slice(0,30));break;}}
  if(r.height<40)out.push('button short '+btn.textContent.trim().slice(0,20)+' '+Math.round(r.height));}}
return out;})()`;
const report = {};
try {
  for (const scene of SCENES.filter(s => !wanted.length || wanted.includes(s.id))) {
    for (const [w, h] of SIZES) {
      errors = [];
      const name = `${scene.id}-${w}x${h}`;
      try {
        await size(w, h);
        await send('Page.navigate', {url: base + scene.url});
        await delay(300);
        await until(() => ev(`!!document.querySelector(${JSON.stringify(scene.ready)})`), 'ready ' + scene.id, 200);
        await ev('document.fonts?.ready.then(()=>true)');
        await delay(250);
        for (const [kind, sel] of scene.act || []) { if (kind === 'click') await click(sel); else if (kind === 'open') await ev(`(()=>{const d=document.querySelector(${JSON.stringify(sel)});if(d)d.open=true;return 1})()`); await delay(150); }
        const s = await send('Page.captureScreenshot', {format: 'png'});
        await fs.writeFile(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
        const probe = args.find(a => a.startsWith('--probe='))?.slice(8);
        if (probe) console.log(await ev(`[...document.querySelectorAll(${JSON.stringify(probe)})].slice(0,6).map(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return e.tagName+'.'+e.className+' '+[r.x,r.y,r.width,r.height].map(Math.round)+' display:'+c.display+' grid:'+c.gridTemplateColumns+'/'+c.gridTemplateRows+' w:'+c.width+' h:'+c.height+' flex:'+c.flex+' pos:'+c.position}).join(' || ')`));
        const defects = await ev(CHECK(scene.root, scene.noScroll, scene.tall));
        report[name] = [...new Set(defects)].concat(errors.map(e => 'page error ' + String(e).slice(0, 120)));
      } catch (e) { report[name] = ['FAILED ' + e.message]; }
      console.log(name, report[name].length ? report[name].join(' | ') : 'ok');
    }
  }
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
} finally {
  socket.close(); browser.kill(); server.close();
  await fs.rm(profile, {recursive: true, force: true}).catch(() => {});
}
