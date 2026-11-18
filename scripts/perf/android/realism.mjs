// Emulator realism checks (Q2/Q3). Hands-off; the emulator must be running with Chrome open.
//   node scripts/perf/android/realism.mjs counts   --label x   canvas/GL call counts per frame: one normal flight + the stress peak
//   node scripts/perf/android/realism.mjs trace    --label x [--what normal|stress] [--query gl=0]   Chrome trace: process/thread busy + top events
//   node scripts/perf/android/realism.mjs gpuinfo  --label x   chrome://gpu text and CDP SystemInfo feature status
//   node scripts/perf/android/realism.mjs stress   --label x [--query gl=0]   55 s stress scene, __stressResult
// Output: outputs/perf/android/<date>-<label>/<mode>.json
import fs from 'node:fs/promises';
import path from 'node:path';
import {session, delay, wake, ensureLandscape} from './cdp.mjs';
import {startServer} from './serve.mjs';
import {flight} from './play.mjs';
import {ensureForward} from './connect.mjs';
const argv = process.argv.slice(2), mode = argv[0], A = {};
for (let i = 1; i < argv.length; i++) { const m = argv[i].match(/^--([^=]+)(?:=(.*))?$/); if (!m) continue; A[m[1]] = m[2] ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true); }
const label = A.label || mode, port = Number(A.port || 4186), day = new Date().toISOString().slice(0, 10);
const out = path.resolve('outputs/perf/android', `${day}-${label}`); await fs.mkdir(out, {recursive: true});
const save = (name, obj) => fs.writeFile(path.join(out, name), JSON.stringify(obj, null, 1));
const NORMAL = {biome: 'marsh', course: 4, row: 'late', chain: 'mid'};

// Canvas / WebGL call counter, injected before any page script runs (so cached method references are the wrapped ones).
const COUNTER = `(()=>{if(window.__cc)return;const cc=window.__cc={on:false,frames:0,n:{},srcPx:0,dstPx:0,drawImage:{},fills:{},uploads:{},gl:{}};
const area=s=>{try{return (s.videoWidth||s.naturalWidth||s.displayWidth||s.width||0)*(s.videoHeight||s.naturalHeight||s.displayHeight||s.height||0)}catch(e){return 0}};
const key=c=>{try{return (c.width|0)+'x'+(c.height|0)}catch(e){return '?'}};
const bump=(o,k,v=1)=>{o[k]=(o[k]||0)+v};
const wrap=(proto,name,fn)=>{const o=proto[name];if(typeof o!=='function')return;proto[name]=function(...a){if(cc.on)fn.call(this,a);return o.apply(this,a)}};
for(const P of [window.CanvasRenderingContext2D&&CanvasRenderingContext2D.prototype,window.OffscreenCanvasRenderingContext2D&&OffscreenCanvasRenderingContext2D.prototype].filter(Boolean)){
 wrap(P,'drawImage',function(a){bump(cc.n,'drawImage');const s=a[0];let sa=area(s);if(a.length>=9)sa=a[3]*a[4];const da=a.length>=9?a[7]*a[8]:a.length>=5?a[3]*a[4]:sa;cc.srcPx+=sa;cc.dstPx+=Math.abs(da)||0;
  const sk=(s.tagName||(s.constructor&&s.constructor.name)||'?')+':'+key(s);bump(cc.drawImage,key(this.canvas)+' <- '+sk);bump(cc.drawImage,'#srcPx '+key(this.canvas)+' <- '+sk,sa)});
 for(const f of ['fillRect','strokeRect','clearRect'])wrap(P,f,function(a){bump(cc.n,f);if(f==='fillRect')bump(cc.fills,key(this.canvas)+' fillRect')});
 for(const f of ['fill','stroke','fillText','strokeText','putImageData','getImageData','createImageData','createLinearGradient','createRadialGradient','createPattern'])wrap(P,f,function(a){bump(cc.n,f);
  if(f==='putImageData'){const d=a[0];bump(cc.uploads,'putImageData '+key(this.canvas)+' src '+d.width+'x'+d.height);cc.putPx=(cc.putPx||0)+d.width*d.height}
  if(f==='getImageData'){bump(cc.uploads,'getImageData '+key(this.canvas)+' '+a[2]+'x'+a[3]);cc.getPx=(cc.getPx||0)+a[2]*a[3]}
  if(f==='fill'||f==='stroke')bump(cc.fills,key(this.canvas)+' '+f)});
}
for(const P of [window.WebGL2RenderingContext&&WebGL2RenderingContext.prototype,window.WebGLRenderingContext&&WebGLRenderingContext.prototype].filter(Boolean)){
 for(const f of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','texImage2D','texSubImage2D','readPixels','bufferData','bufferSubData','useProgram','bindTexture','clear','blitFramebuffer','copyTexSubImage2D'])wrap(P,f,function(a){bump(cc.gl,f);
  if(f==='texSubImage2D'||f==='texImage2D'){const w=f==='texSubImage2D'?a[4]:a[3],h=f==='texSubImage2D'?a[5]:a[4];const full=f==='texSubImage2D'?a.length>=9:a.length>=9;const px=full?w*h:area(a[a.length-1]);cc.gl.texPx=(cc.gl.texPx||0)+px}
  if(f==='readPixels')cc.gl.readPx=(cc.gl.readPx||0)+a[2]*a[3]});
}
cc.start=n=>new Promise(res=>{cc.n={};cc.drawImage={};cc.fills={};cc.uploads={};cc.gl={};cc.srcPx=cc.dstPx=cc.putPx=cc.getPx=0;cc.frames=0;cc.on=true;const t0=performance.now();
 (function f(){if(++cc.frames<n)requestAnimationFrame(f);else{cc.on=false;res({frames:n,ms:performance.now()-t0,n:cc.n,srcPx:cc.srcPx,dstPx:cc.dstPx,putPx:cc.putPx,getPx:cc.getPx,drawImage:cc.drawImage,fills:cc.fills,uploads:cc.uploads,gl:cc.gl})}})()})
})()`;
function perFrame(r) {
  const o = {frames: r.frames, seconds: +(r.ms / 1000).toFixed(1), fps: +(r.frames / (r.ms / 1000)).toFixed(1), perFrame: {},
    srcMPixPerFrame: +(r.srcPx / r.frames / 1e6).toFixed(2), dstMPixPerFrame: +(r.dstPx / r.frames / 1e6).toFixed(2),
    putImageDataKPixPerFrame: +((r.putPx || 0) / r.frames / 1e3).toFixed(1), getImageDataKPixPerFrame: +((r.getPx || 0) / r.frames / 1e3).toFixed(1),
    drawImageByCanvasAndSource: {}, fillsByCanvas: {}, uploads: {}, gl: {}};
  for (const [k, v] of Object.entries(r.n)) o.perFrame[k] = +(v / r.frames).toFixed(1);
  for (const [k, v] of Object.entries(r.drawImage)) if (!k.startsWith('#')) o.drawImageByCanvasAndSource[k] = {perFrame: +(v / r.frames).toFixed(2), srcKPixPerFrame: +((r.drawImage['#srcPx ' + k] || 0) / r.frames / 1e3).toFixed(1)};
  for (const [k, v] of Object.entries(r.fills)) o.fillsByCanvas[k] = +(v / r.frames).toFixed(1);
  for (const [k, v] of Object.entries(r.uploads)) o.uploads[k] = +(v / r.frames).toFixed(2);
  for (const [k, v] of Object.entries(r.gl)) o.gl[k] = +(v / r.frames).toFixed(2);
  return o;
}
async function stressOpen(s, query = '') {
  const q = new URLSearchParams({scene: 'stress', run: String(Date.now())}); for (const [k, v] of new URLSearchParams(query)) q.set(k, v);
  await s.goto(`http://10.0.2.2:${port}/game.html?${q}`); await ensureLandscape(s);
  for (let i = 0; i < 240 && !(await s.ev('!!document.querySelector(".stress-confirm button")')); i++) await delay(500);
  await s.ev('(document.querySelector(".stress-confirm button").click(),1)');
}
async function browserWs() {
  ensureForward();
  const v = await (await fetch('http://localhost:9222/json/version')).json();
  const ws = new WebSocket(v.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('ws')); });
  let id = 0; const p = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && p.has(d.id)) { p.get(d.id)(d); p.delete(d.id); } };
  return {send: (method, params = {}) => new Promise(r => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({id: i, method, params})); }), close: () => ws.close(), v};
}

wake(); await delay(1500);
const srv = await startServer('dist', port), s = await session();
try {
  if (mode === 'stress') {
    await stressOpen(s, A.query || '');
    for (let i = 0; i < 400 && !(await s.ev('!!window.__stressResult')); i++) await delay(2000);
    const r = await s.ev('window.__stressResult'); console.log(r.summary); await save('stress.json', {query: A.query || '', ...r});
  }
  if (mode === 'counts') {
    await s.send('Page.enable'); await s.send('Runtime.enable');
    s.on(d => { if (d.method === 'Runtime.exceptionThrown') console.log('page exception', JSON.stringify(d.params.exceptionDetails).slice(0, 300)); });
    await s.send('Page.addScriptToEvaluateOnNewDocument', {source: COUNTER});
    const res = {};
    const r1 = await flight(s, NORMAL, {seconds: 8, sampler: () => `(async()=>{await new Promise(r=>setTimeout(r,2000));return window.__cc.start(300)})()`});
    res.normal = {flight: NORMAL, ...perFrame(r1.extra || r1)};
    console.log('normal', JSON.stringify(res.normal.perFrame), res.normal.srcMPixPerFrame, 'Mpx src/frame');
    await stressOpen(s, A.query || ''); await delay(22000); // stress peak
    const r2 = await s.ev('window.__cc.start(300)'); res.stress = perFrame(r2);
    console.log('stress', JSON.stringify(res.stress.perFrame), res.stress.srcMPixPerFrame, 'Mpx src/frame');
    await save('counts.json', res);
  }
  if (mode === 'gpuinfo') {
    const b = await browserWs(); const info = await b.send('SystemInfo.getInfo');
    const r = {version: b.v['Browser'], systemInfo: info.result || info.error};
    b.close();
    await s.goto('chrome://gpu'); await delay(6000);
    r.chromeGpuText = await s.ev(`(()=>{const out=[];const walk=n=>{if(n.nodeType===3){const t=n.textContent.trim();if(t)out.push(t)}else{if(n.shadowRoot)walk(n.shadowRoot);for(const c of n.childNodes)walk(c)}};walk(document.body);return out.join('\\n')})()`).catch(e => 'ERR ' + e.message);
    await save('gpuinfo.json', r);
    console.log(String(r.chromeGpuText).split('\n').filter(l => /Canvas|Graphics Feature|Hardware accelerated|Software only|Disabled|GL_RENDERER|GL_VENDOR|ANGLE|backend|Skia|Vulkan|WebGL|Rasterization|Compositing/i.test(l)).slice(0, 80).join('\n'));
  }
  if (mode === 'trace') {
    const seconds = Number(A.seconds || 6);
    if (A.what === 'stress') { await stressOpen(s, A.query || ''); await delay(15000); }
    else { await flight(s, NORMAL, {seconds: 1, query: A.query || ''}); await delay(6000); }
    const events = []; let done; const complete = new Promise(r => done = r);
    s.on(d => { if (d.method === 'Tracing.dataCollected') events.push(...d.params.value); else if (d.method === 'Tracing.tracingComplete') done(); });
    await s.send('Tracing.start', {traceConfig: {includedCategories: A.light ? ['toplevel', 'gpu', 'viz', 'cc', 'devtools.timeline'] : ['toplevel', 'gpu', 'viz', 'cc', 'devtools.timeline', 'blink', 'v8', 'gpu.angle', 'skia', 'skia.gpu', 'disabled-by-default-gpu.service', 'disabled-by-default-gpu.decoder', 'disabled-by-default-skia.gpu'], recordMode: 'recordAsMuchAsPossible'}, transferMode: 'ReportEvents'});
    const fps = await s.ev(`new Promise(res=>{let n=0;const t0=performance.now();(function f(){n++;if(performance.now()-t0<${seconds * 1000})requestAnimationFrame(f);else res(n/((performance.now()-t0)/1000))})()})`);
    await s.send('Tracing.end'); await complete;
    await fs.writeFile(path.join(out, 'trace.json'), JSON.stringify({traceEvents: events}));
    const pn = new Map(), tn = new Map(); for (const e of events) { if (e.name === 'process_name') pn.set(e.pid, e.args.name); if (e.name === 'thread_name') tn.set(e.pid + ':' + e.tid, e.args.name); }
    const busy = new Map(), byName = new Map();
    for (const e of events) {
      if (e.ph !== 'X' || !e.dur) continue; const k = `${pn.get(e.pid) || e.pid} / ${tn.get(e.pid + ':' + e.tid) || e.tid}`;
      if (['ThreadControllerImpl::RunTask', 'RunTask', 'ThreadPool_RunTask'].includes(e.name)) busy.set(k, (busy.get(k) || 0) + e.dur);
      const n = k + ' :: ' + e.name; byName.set(n, (byName.get(n) || 0) + e.dur);
    }
    const row = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 45).map(([k, v]) => [k, +(v / 1000 / seconds).toFixed(0)]);
    const res = {what: A.what || 'normal', query: A.query || '', seconds, fps: +fps.toFixed(1), busyPctByThread: row(busy).map(([k, v]) => [k, +(v / 10).toFixed(0)]), topEventsMsPerS: row(byName)};
    await save('trace-summary.json', res);
    console.log('fps', res.fps); for (const [k, v] of res.busyPctByThread.slice(0, 12)) console.log(String(v).padStart(4) + '%', k);
    for (const [k, v] of res.topEventsMsPerS.slice(0, 30)) console.log(String(v).padStart(5), k);
  }
} finally { srv.close(); s.close(); }
