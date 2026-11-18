// Canvas 2D operations per frame, by caller, in a real flight; and a same-moment pixel compare of render switches on/off.
// Desktop headless Chrome sized like the Pixel 10 emulator (924x308 CSS px, DPR 2.625, touch), no CPU throttle: operation COUNTS
// do not depend on the device, so this is the fast way to see what the emulator's GPU process has to execute.
//   node scripts/perf/calls.mjs --scenario marsh-late-mid [--frames 120] [--wait 12] [--flags bh,tufts] [--compare 16] [--label x] [--query k=v&..]
// Scenarios: the bench scenarios (scripts/perf/android/benchlib.mjs SCEN) plus 'stress'.
// --flags: render switches read by the flight modules (globalThis.__perfFlags[name]=false is the same as ?name=0). Counts are taken with
//   everything on, with each flag off, and with all of them off, interleaved twice; --compare N renders N moments of the live flight twice
//   in one task (all flags off, then on) and reports the per-pixel difference of the pixel buffer; the worst frame's difference box is
//   written as a 4x crop (off | on | difference x16) next to the JSON.
// Categories: draw (fillRect, drawImage, fill, stroke, ...), state (save/restore/transforms/clip), path (beginPath, moveTo, lineTo, arc, ...),
//   set (fillStyle, globalAlpha, globalCompositeOperation, lineWidth, ... assignments). where.mjs's "state" = state + path.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {startServer, launch, delay, until} from './lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) { const [k, ...v] = a.slice(2).split('='); acc.push([k, v.length ? v.join('=') : (all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true)]); } return acc; }, []));
const SCEN = {
  'marsh-early-starter': {biome: 'marsh', course: 4, row: 'early', chain: 'starter'},
  'marsh-late-mid': {biome: 'marsh', course: 4, row: 'late', chain: 'mid'},
  'pinewood-late-mid': {biome: 'pinewood', course: 1, row: 'late', chain: 'mid'},
  'coral-late-mid': {biome: 'coral', course: 2, row: 'late', chain: 'mid'},
  'frost-late-mid': {biome: 'frost', course: 2, row: 'late', chain: 'mid'},
  'basalt-guardian': {biome: 'basalt', course: 1, row: 'late', chain: 'mid', guardian: 'hollow-sun', boss: true},
  'frost-matron': {biome: 'frost', course: 1, row: 'late', chain: 'mid', guardian: 'frost-matron', boss: true},
  stress: {stress: true},
};
const name = A.scenario || 'marsh-late-mid', sc = SCEN[name] || (() => { throw Error('unknown scenario ' + name); })();
const frames = Number(A.frames || 120), wait = Number(A.wait || 12), flags = A.flags && A.flags !== true ? String(A.flags).split(',') : [], compareN = Number(A.compare || 0);
const label = A.label || 'calls', OUT = path.resolve('outputs/perf/calls'), DAY = new Date().toISOString().slice(0, 10);

const COUNTER = `(()=>{if(window.__cc)return;
const cc=window.__cc={on:false,stack:true,n:{draw:0,state:0,path:0,set:0},op:{},st:{}};
const DRAW=['fillRect','strokeRect','clearRect','fill','stroke','drawImage','fillText','strokeText','putImageData','getImageData'];
const STATE=['save','restore','translate','scale','rotate','transform','setTransform','resetTransform','clip','reset'];
const PATH=['beginPath','moveTo','lineTo','arc','rect','closePath','quadraticCurveTo','bezierCurveTo','ellipse','roundRect','arcTo'];
const SET=['fillStyle','strokeStyle','globalAlpha','globalCompositeOperation','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset','font','textAlign','textBaseline','direction','filter','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','imageSmoothingEnabled','imageSmoothingQuality'];
const where=()=>{const l=(new Error().stack||'').split('\\n');const f=k=>(l[k]||'').replace(/^\\s*at\\s+/,'').replace(/https?:\\/\\/[^/]+\\//,'').replace(/\\?[^:)\\s]*/,'').replace(/:\\d+\\)?$/,')').replace(/\\(\\)$/,'').trim();return f(4)+' < '+f(5)};
const hit=(cat,op)=>{cc.n[cat]++;cc.op[op]=(cc.op[op]||0)+1;if(cc.stack){const k=where();const e=cc.st[k]||(cc.st[k]={n:0,draw:0,state:0,path:0,set:0,ops:{}});e.n++;e[cat]++;e.ops[op]=(e.ops[op]||0)+1}};
for(const P of [CanvasRenderingContext2D.prototype,window.OffscreenCanvasRenderingContext2D&&OffscreenCanvasRenderingContext2D.prototype].filter(Boolean)){
 const wrap=(list,cat)=>{for(const op of list){const o=P[op];if(typeof o!=='function')continue;P[op]=function(...a){if(cc.on)hit(cat,op);return o.apply(this,a)}}};
 wrap(DRAW,'draw');wrap(STATE,'state');wrap(PATH,'path');
 for(const k of SET){const d=Object.getOwnPropertyDescriptor(P,k);if(!d||!d.set)continue;Object.defineProperty(P,k,{...d,set(v){if(cc.on)hit('set',k);d.set.call(this,v)}})}
}
cc.run=(n,stack=true)=>new Promise(res=>{cc.n={draw:0,state:0,path:0,set:0};cc.op={};cc.st={};cc.stack=stack;let k=0;const t0=performance.now();
 requestAnimationFrame(function f(){if(k===0)cc.on=true;if(++k<=n)requestAnimationFrame(f);else{cc.on=false;
  const pf=x=>+(x/n).toFixed(1);
  res({frames:n,ms:+(performance.now()-t0).toFixed(0),perFrame:Object.fromEntries(Object.entries(cc.n).map(([a,b])=>[a,pf(b)])),ops:Object.fromEntries(Object.entries(cc.op).sort((a,b)=>b[1]-a[1]).map(([a,b])=>[a,pf(b)])),
   callers:Object.entries(cc.st).sort((a,b)=>b[1].n-a[1].n).slice(0,30).map(([k,v])=>({caller:k,all:pf(v.n),draw:pf(v.draw),state:pf(v.state),path:pf(v.path),set:pf(v.set),ops:Object.fromEntries(Object.entries(v.ops).map(([o,c])=>[o,pf(c)]))}))})}})});
})()`;

// Same-moment compare: flags off, render x2, read; flags on, render x2, read. One synchronous task, so the simulation cannot move between.
const COMPARE = (flagList) => `(()=>{const e=globalThis.__mockFlight?.()||window.__stressEngine;const v=e&&e.pixiView;if(!v||!v.buffer)return null;
const F=globalThis.__perfFlags||(globalThis.__perfFlags={});const saved={...F};const read=()=>{const b=v.buffer;return b.getContext('2d').getImageData(0,0,b.width,b.height).data};
const shot=on=>{for(const f of ${JSON.stringify(flagList)})F[f]=on;e.render();e.render();return read()};
const a=shot(false),b=shot(true);for(const k of Object.keys(F))delete F[k];Object.assign(F,saved);
const w=v.buffer.width,h=v.buffer.height;let n=0,max=0,x0=1e9,y0=1e9,x1=-1,y1=-1;const hist={};
for(let i=0;i<a.length;i+=4){const m=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));if(m){n++;if(m>max)max=m;const bin=m<=2?'1-2':m<=8?'3-8':m<=24?'9-24':m<=64?'25-64':'65+';hist[bin]=(hist[bin]||0)+1;const p=i>>2,x=p%w,y=(p/w)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
const holes=(e.blackHoles?.items||[]).map(o=>Math.round((o.x-(e.renderDistance??e.distance))*v.scale)).filter(x=>x>-60&&x<w+60);
const out={time:+(e.time||0).toFixed(2),distance:Math.round(e.distance),w,h,pixels:n,max,hist,box:n?[x0,y0,x1,y1]:null,holesOnScreen:holes};
window.__lastCompare={w,h,a,b};return out})()`;
const CROP = (box) => `(()=>{const c=window.__lastCompare;if(!c)return null;const [x0,y0,x1,y1]=${JSON.stringify(box)};const w=x1-x0+1,h=y1-y0+1;const pick=d=>{const o=new Uint8Array(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((y0+y)*c.w+x0+x)*4,j=(y*w+x)*3;o[j]=d[i];o[j+1]=d[i+1];o[j+2]=d[i+2]}let s='';for(let i=0;i<o.length;i+=8192)s+=String.fromCharCode.apply(null,o.subarray(i,i+8192));return btoa(s)};return {w,h,a:pick(c.a),b:pick(c.b)}})()`;

function png(W, H, rgb) {
  const rows = []; for (let y = 0; y < H; y++) rows.push(Buffer.concat([Buffer.from([0]), rgb.subarray(y * W * 3, (y + 1) * W * 3)]));
  const table = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  const crc = buf => { let x = 0xffffffff; for (const v of buf) x = table[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}
/** off | on | |difference| x16, each scaled 4x. */
function cropPng({w, h, a, b}, S = 4) {
  const pa = Buffer.from(a, 'base64'), pb = Buffer.from(b, 'base64'), W = (w * 3 + 2) * S, H = h * S, out = Buffer.alloc(W * H * 3, 40);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const panel = Math.floor(x / ((w + 1) * S)), px = Math.floor((x - panel * (w + 1) * S) / S), py = Math.floor(y / S); if (px < 0 || px >= w) continue;
    const i = (py * w + px) * 3, o = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) out[o + c] = panel === 0 ? pa[i + c] : panel === 1 ? pb[i + c] : Math.min(255, Math.abs(pa[i + c] - pb[i + c]) * 16);
  }
  return png(W, H, out);
}

function flightUrl(base) {
  if (sc.stress) { const q = new URLSearchParams({scene: 'stress', go: '1', edge: 'spectral'}); for (const [k, v] of new URLSearchParams(A.query || '')) q.set(k, v); return `${base}/game.html?${q}`; }
  const q = new URLSearchParams({mock: 'boundary', cards: '1', autopilot: '1', seed: 'perf-bench', biome: sc.biome, course: String(sc.course), cardset: sc.chain, edge: 'spectral'});
  if (sc.row === 'late') q.set('late', '1'); if (sc.chain === 'mid') q.set('collector', 'twin'); if (sc.guardian) q.set('guardian', sc.guardian);
  for (const [k, v] of new URLSearchParams(A.query || '')) q.set(k, v);
  return `${base}/game.html?${q}`;
}

export async function openFlight(b, base) {
  await b.send('Emulation.setDeviceMetricsOverride', {width: 924, height: 308, deviceScaleFactor: 2.625, mobile: true, screenOrientation: {type: 'landscapePrimary', angle: 90}});
  await b.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
  await b.send('Page.addScriptToEvaluateOnNewDocument', {source: COUNTER});
  const t0 = Date.now();
  await b.send('Page.navigate', {url: flightUrl(base)});
  const timing = {};
  if (sc.stress) {
    await until(() => b.ev('!!window.__stressEngine&&window.__stressEngine.time>0'), 'stress engine', 120000, 200);
    timing.entryMs = Date.now() - t0;
  } else {
    await until(() => b.ev('!!document.querySelector(".entry-depart:not([disabled])")'), 'depart', 120000, 200);
    timing.departReadyMs = Date.now() - t0;
    let running = false;
    for (let i = 0; i < 8 && !running; i++) { await b.tapSel('.entry-depart:not([disabled])'); await delay(1500); running = await b.ev('document.body.classList.contains("playing")&&!document.querySelector(".entry-depart")'); }
    if (!running) throw Error('did not depart');
    if (sc.boss) await b.ev(`(()=>{const e=globalThis.__mockFlight&&__mockFlight();if(!e)return 0;const bo=e.layout&&e.layout.boss;const x=bo&&(bo.start??bo.x??bo.rooms?.[0]?.start??bo.stormRooms?.[0]?.start);if(x)e.distance=e.previousDistance=Math.max(0,x-e.player.x-300);return x||0})()`);
  }
  return timing;
}

// --seek hole: put the first Black Hole ahead of the player before each block (the course has it only for a few seconds).
// --seek <number>: course distance. Counting starts right after.
async function seek(b) {
  if (!A.seek) return;
  const r = await b.ev(`(()=>{const e=globalThis.__mockFlight?.()||window.__stressEngine;if(!e)return null;let d=${JSON.stringify(A.seek)};
   if(d==='hole'){const h=(e.blackHoles?.items||[]).find(h=>!h.giant)||(e.blackHoles?.items||[])[0];if(!h)return 'no hole';d=h.x-e.width*${Number(A.ahead || .8)};}
   d=Number(d);if(!Number.isFinite(d))return 'bad seek';e.distance=e.previousDistance=Math.max(0,d);if('renderDistance' in e)e.renderDistance=e.distance;return Math.round(d)})()`);
  res0.seeks.push(r);
}
const res0 = {seeks: []};
async function main() {
  const srv = await startServer('dist'), b = await launch();
  const res = {day: DAY, scenario: name, frames, wait, flags, seek: A.seek || null, query: A.query || '', counts: {}, compare: [], errors: []}; res.seeks = res0.seeks;
  try {
    res.timing = await openFlight(b, srv.base);
    await delay(wait * 1000);
    res.buffer = await b.ev('(()=>{const e=globalThis.__mockFlight?.()||window.__stressEngine;const v=e&&e.pixiView;return v&&v.buffer?v.buffer.width+"x"+v.buffer.height:null})()');
    const configs = [['on', {}]];
    for (const f of flags) configs.push([`${f}=0`, {[f]: false}]);
    if (flags.length > 1) configs.push(['all=0', Object.fromEntries(flags.map(f => [f, false]))]);
    for (let round = 0; round < (flags.length ? 2 : 1); round++) {
      const order = round % 2 ? [...configs].reverse() : configs;
      for (const [key, set] of order) {
        await b.ev(`(()=>{const F=globalThis.__perfFlags||(globalThis.__perfFlags={});for(const k of Object.keys(F))delete F[k];Object.assign(F,${JSON.stringify(set)});return 1})()`);
        await seek(b); await delay(300); // let a frame or two pass after the switch (lazy bakes)
        const r = await b.ev(`window.__cc.run(${frames},true)`, 600000);
        (res.counts[key] ||= []).push(r);
      }
    }
    await b.ev('(()=>{const F=globalThis.__perfFlags||{};for(const k of Object.keys(F))delete F[k];return 1})()');
    let worst = null;
    for (let i = 0; i < compareN; i++) {
      if (i % 4 === 0) { await seek(b); await delay(200); }
      const c = await b.ev(COMPARE(flags)); if (!c) break; res.compare.push(c);
      if (c.pixels && (!worst || c.max > worst.max || (c.max === worst.max && c.pixels > worst.pixels))) {
        worst = c; const [x0, y0, x1, y1] = c.box, pad = 6;
        const box = [Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(c.w - 1, x1 + pad), Math.min(c.h - 1, y1 + pad)];
        if ((box[2] - box[0] + 1) * (box[3] - box[1] + 1) <= 400 * 240) res.worstCrop = {box, data: await b.ev(CROP(box))};
      }
      await delay(Number(A.gap || 450));
    }
    res.errors = b.errors.slice(0, 10);
  } finally { await b.close(); srv.close(); }
  await fs.mkdir(OUT, {recursive: true});
  const base = path.join(OUT, `${DAY}-${name}-${label}`);
  if (res.worstCrop?.data) { await fs.writeFile(base + '-worst-crop4x.png', cropPng(res.worstCrop.data)); res.worstCrop = {box: res.worstCrop.box, file: base + '-worst-crop4x.png'}; }
  await fs.writeFile(base + '.json', JSON.stringify(res, null, 1));
  // Summary
  const avg = (list, k) => +(list.reduce((s, r) => s + r.perFrame[k], 0) / list.length).toFixed(1);
  console.log(`${name}  buffer ${res.buffer}  ${JSON.stringify(res.timing)}`);
  console.log('config'.padEnd(12) + 'draw'.padStart(8) + 'state'.padStart(8) + 'path'.padStart(8) + 'set'.padStart(8) + '  state+path');
  for (const [k, list] of Object.entries(res.counts)) console.log(k.padEnd(12) + [avg(list, 'draw'), avg(list, 'state'), avg(list, 'path'), avg(list, 'set')].map(v => String(v).padStart(8)).join('') + String(+(avg(list, 'state') + avg(list, 'path')).toFixed(1)).padStart(10));
  const on = res.counts.on?.[0];
  if (on) { console.log('\ntop callers (flags on, first block): all draw state path set'); for (const c of on.callers.slice(0, Number(A.top || 18))) console.log(`${String(c.all).padStart(7)} ${String(c.draw).padStart(6)} ${String(c.state).padStart(5)} ${String(c.path).padStart(6)} ${String(c.set).padStart(6)}  ${c.caller}`); }
  if (res.compare.length) {
    const differing = res.compare.filter(c => c.pixels), max = Math.max(0, ...res.compare.map(c => c.max));
    console.log(`\ncompare ${flags.join(',')} off vs on: ${res.compare.length} moments, ${differing.length} differ, max channel delta ${max}, max pixels ${Math.max(0, ...res.compare.map(c => c.pixels))}; holes on screen in ${res.compare.filter(c => c.holesOnScreen.length).length}`);
    for (const c of differing.slice(0, 8)) console.log('  ', JSON.stringify(c));
    if (res.worstCrop) console.log('  worst crop', res.worstCrop.file);
  }
  if (res.errors.length) console.log('page errors', res.errors);
  console.log('->', base + '.json');
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))) await main();
