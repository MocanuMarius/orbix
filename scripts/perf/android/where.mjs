// Where does the frame go in real play on the emulator?  Hands-off.
//   node scripts/perf/android/where.mjs [--scenarios marsh-late-mid,pinewood-late-mid] [--frames 150]
// Per scenario, in one flight: (1) Chrome trace, light categories: busy % of the GPU-process main thread, renderer main, compositor threads;
// (2) Canvas 2D / WebGL call counters over N frames (no stacks): calls per frame, drawImage source/destination area, canvases touched per frame,
//     getImageData/putImageData/texImage uploads in bytes per frame; (3) the same counters with call stacks over 8 frames: top callers;
// (4) heavy Chrome trace (skia/gpu categories, it slows the frame rate, use only the shape): top events of the GPU-process main thread.
// Output: outputs/perf/android/<date>-bench/where-<scenario>.json
import fs from 'node:fs/promises';
import path from 'node:path';
import {startServer} from './serve.mjs';
import {parseArgs, PORT, delay, Session, measureRetry, waitQuiet, save, OUT} from './benchlib.mjs';

const COUNTER = `(()=>{if(window.__cc)return;
const cc=window.__cc={on:false,stack:false,frame:0,n:{},state:0,st:{},cv:new Map(),srcPx:0,dstPx:0,di:{},gl:{},up:{putPx:0,putN:0,getPx:0,getN:0,texPx:0,texN:0,bufB:0,bufN:0,readPx:0,bitmaps:0,resize:0,newCanvas:0}};
const ids=new WeakMap();let nid=0;const idOf=c=>{let i=ids.get(c);if(!i){i=++nid;ids.set(c,i)}return i};
const bump=(o,k,v=1)=>{o[k]=(o[k]||0)+v};
const area=s=>{try{return (s.videoWidth||s.naturalWidth||s.displayWidth||s.width||0)*(s.videoHeight||s.naturalHeight||s.displayHeight||s.height||0)}catch(e){return 0}};
const size=c=>{try{return (c.width|0)+'x'+(c.height|0)}catch(e){return '?'}};
const touch=(ctx,op)=>{const c=ctx.canvas;if(!c)return;const id=idOf(c);let r=cc.cv.get(id);if(!r){r={w:0,h:0,n:0,frames:new Set(),ops:{}};cc.cv.set(id,r)}r.w=c.width;r.h=c.height;r.n++;r.frames.add(cc.frame);r.ops[op]=(r.ops[op]||0)+1};
const caller=op=>{const st=(new Error().stack||'').split('\\n').slice(4,6).map(l=>l.replace(/^\\s*at\\s+/,'').replace(/https?:\\/\\/[^/]+\\//,'').replace(/\\?[^:)\\s]*/,'').replace(/:\\d+\\)?$/,'').trim()).join(' < ');const e=cc.st[st]||(cc.st[st]={n:0,ops:{}});e.n++;e.ops[op]=(e.ops[op]||0)+1};
const wrap=(proto,name,fn)=>{const o=proto[name];if(typeof o!=='function')return;proto[name]=function(...a){if(cc.on)fn.call(this,a,name);return o.apply(this,a)}};
const DRAW=['fillRect','strokeRect','clearRect','fill','stroke','drawImage','fillText','strokeText','putImageData','getImageData'];
const STATE=['save','restore','translate','scale','rotate','transform','setTransform','resetTransform','beginPath','moveTo','lineTo','arc','rect','closePath','clip','quadraticCurveTo','bezierCurveTo','ellipse','roundRect','arcTo'];
for(const P of [window.CanvasRenderingContext2D&&CanvasRenderingContext2D.prototype,window.OffscreenCanvasRenderingContext2D&&OffscreenCanvasRenderingContext2D.prototype].filter(Boolean)){
 for(const op of DRAW)wrap(P,op,function(a,name){bump(cc.n,name);touch(this,name);if(cc.stack)caller(name);
  if(name==='drawImage'){const s=a[0];let sa=area(s);if(a.length>=9)sa=a[3]*a[4];const da=a.length>=9?a[7]*a[8]:a.length>=5?a[3]*a[4]:sa;cc.srcPx+=sa;cc.dstPx+=Math.abs(da)||0;const k=size(this.canvas)+' <- '+(s.tagName||(s.constructor&&s.constructor.name)||'?')+':'+size(s);const e=cc.di[k]||(cc.di[k]={n:0,srcPx:0,dstPx:0});e.n++;e.srcPx+=sa;e.dstPx+=Math.abs(da)||0}
  if(name==='putImageData'){const d=a[0];const px=a.length>=7?a[5]*a[6]:d.width*d.height;cc.up.putPx+=px;cc.up.putN++}
  if(name==='getImageData'){cc.up.getPx+=a[2]*a[3];cc.up.getN++}});
 for(const op of STATE)wrap(P,op,function(){cc.state++});
}
for(const P of [window.WebGL2RenderingContext&&WebGL2RenderingContext.prototype,window.WebGLRenderingContext&&WebGLRenderingContext.prototype].filter(Boolean)){
 for(const f of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','useProgram','bindTexture','bindFramebuffer','clear','blitFramebuffer','uniform1f','uniform2f','uniform4f','uniform1i'])wrap(P,f,function(a,name){bump(cc.gl,name)});
 for(const f of ['texImage2D','texSubImage2D'])wrap(P,f,function(a,name){let w,h,px;if(a.length>=9){w=name==='texSubImage2D'?a[4]:a[3];h=name==='texSubImage2D'?a[5]:a[4];px=w*h}else px=area(a[a.length-1]);cc.up.texPx+=px;cc.up.texN++;bump(cc.gl,name)});
 wrap(P,'bufferData',function(a){cc.up.bufB+=typeof a[1]==='number'?a[1]:(a[1]&&a[1].byteLength)||0;cc.up.bufN++});
 wrap(P,'bufferSubData',function(a){cc.up.bufB+=(a[2]&&a[2].byteLength)||0;cc.up.bufN++});
 wrap(P,'readPixels',function(a){cc.up.readPx+=a[2]*a[3]});
}
for(const k of ['width','height']){const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,k);if(d&&d.set)Object.defineProperty(HTMLCanvasElement.prototype,k,{...d,set(v){if(cc.on)cc.up.resize++;d.set.call(this,v)}})}
const ce=Document.prototype.createElement;Document.prototype.createElement=function(t,...r){if(cc.on&&String(t).toLowerCase()==='canvas')cc.up.newCanvas++;return ce.call(this,t,...r)};
const cib=window.createImageBitmap;if(cib)window.createImageBitmap=function(...a){if(cc.on)cc.up.bitmaps++;return cib.apply(this,a)};
cc.run=(n,stack)=>new Promise(res=>{cc.n={};cc.state=0;cc.st={};cc.cv=new Map();cc.srcPx=cc.dstPx=0;cc.di={};cc.gl={};for(const k in cc.up)cc.up[k]=0;cc.stack=!!stack;cc.frame=0;cc.on=true;const t0=performance.now();
 (function f(){if(++cc.frame<=n)requestAnimationFrame(f);else{cc.on=false;cc.stack=false;res({frames:n,ms:performance.now()-t0,n:cc.n,state:cc.state,st:cc.st,cv:[...cc.cv].map(([id,r])=>[id,{w:r.w,h:r.h,n:r.n,frames:r.frames.size,ops:r.ops}]),srcPx:cc.srcPx,dstPx:cc.dstPx,di:cc.di,gl:cc.gl,up:cc.up})}})()})
})()`;

function perFrame(r) {
  const F = r.frames, f1 = x => +(x / F).toFixed(1), drawN = Object.values(r.n).reduce((a, b) => a + b, 0);
  const canv = r.cv.map(([id, c]) => ({id, size: `${c.w}x${c.h}`, px: c.w * c.h, callsPerFrame: f1(c.n), framesTouchedPct: +(100 * c.frames / F).toFixed(0), ops: Object.fromEntries(Object.entries(c.ops).map(([k, v]) => [k, f1(v)]))})).sort((a, b) => b.callsPerFrame - a.callsPerFrame);
  const touchedPerFrame = +(r.cv.reduce((a, [, c]) => a + c.frames, 0) / F).toFixed(1);
  const rasterPxPerFrame = r.cv.reduce((a, [, c]) => a + (c.w * c.h) * (c.frames / F), 0);
  const up = r.up, putB = up.putPx * 4, texB = up.texPx * 4;
  return {
    frames: F, fps: +(F / (r.ms / 1000)).toFixed(1),
    drawCallsPerFrame: f1(drawN), stateCallsPerFrame: f1(r.state), totalCanvas2DCallsPerFrame: f1(drawN + r.state), byOp: Object.fromEntries(Object.entries(r.n).map(([k, v]) => [k, f1(v)])),
    drawImage: {perFrame: f1(r.n.drawImage || 0), srcMPx: +(r.srcPx / F / 1e6).toFixed(2), dstMPx: +(r.dstPx / F / 1e6).toFixed(2),
      bySourceAndDest: Object.entries(r.di).map(([k, v]) => ({k, perFrame: +(v.n / F).toFixed(2), srcKPx: +(v.srcPx / F / 1e3).toFixed(0), dstKPx: +(v.dstPx / F / 1e3).toFixed(0)})).sort((a, b) => b.dstKPx - a.dstKPx).slice(0, 10)},
    canvasesTouchedPerFrame: touchedPerFrame, distinctCanvasesTouched: canv.length, canvases: canv.slice(0, 14),
    sumOfTouchedCanvasAreaMPxPerFrame: +(rasterPxPerFrame / 1e6).toFixed(2),
    uploadsPerFrame: {putImageDataCalls: f1(up.putN), putImageDataKB: +(putB / F / 1024).toFixed(1), getImageDataCalls: f1(up.getN), getImageDataKB: +(up.getPx * 4 / F / 1024).toFixed(1),
      texImageCalls: f1(up.texN), texImageKB: +(texB / F / 1024).toFixed(1), glBufferDataKB: +(up.bufB / F / 1024).toFixed(1), glReadPixelsKB: +(up.readPx * 4 / F / 1024).toFixed(1),
      imageBitmaps: f1(up.bitmaps), canvasResizes: f1(up.resize), canvasesCreated: f1(up.newCanvas),
      totalToGpuKB: +((putB + texB + up.bufB) / F / 1024).toFixed(1)},
    gl: Object.fromEntries(Object.entries(r.gl).map(([k, v]) => [k, f1(v)])),
  };
}
function callers(r) {
  const F = r.frames, all = Object.entries(r.st).sort((a, b) => b[1].n - a[1].n), total = all.reduce((a, [, v]) => a + v.n, 0);
  return {frames: F, drawCallsPerFrame: +(total / F).toFixed(0), top: all.slice(0, 12).map(([k, v]) => ({caller: k, perFrame: +(v.n / F).toFixed(0), pct: +(100 * v.n / total).toFixed(1), ops: Object.fromEntries(Object.entries(v.ops).map(([o, c]) => [o, +(c / F).toFixed(0)]))}))};
}

async function trace(s, seconds, heavy) {
  const events = []; let done; const complete = new Promise(r => done = r);
  const on = d => { if (d.method === 'Tracing.dataCollected') events.push(...d.params.value); else if (d.method === 'Tracing.tracingComplete') done(); };
  s.on(on);
  const cats = heavy ? ['toplevel', 'gpu', 'viz', 'cc', 'devtools.timeline', 'blink', 'v8', 'gpu.angle', 'skia', 'skia.gpu', 'disabled-by-default-gpu.service', 'disabled-by-default-gpu.decoder', 'disabled-by-default-skia.gpu'] : ['toplevel', 'gpu', 'viz', 'cc', 'devtools.timeline'];
  await s.send('Tracing.start', {traceConfig: {includedCategories: cats, recordMode: 'recordAsMuchAsPossible'}, transferMode: 'ReportEvents'});
  const fps = await s.ev(`new Promise(res=>{let n=0;const t0=performance.now();(function f(){n++;if(performance.now()-t0<${seconds * 1000})requestAnimationFrame(f);else res(n/((performance.now()-t0)/1000))})()})`);
  await s.send('Tracing.end'); await complete;
  const pn = new Map(), tn = new Map(); for (const e of events) { if (e.name === 'process_name') pn.set(e.pid, e.args.name); if (e.name === 'thread_name') tn.set(e.pid + ':' + e.tid, e.args.name); }
  const busy = new Map(), byName = new Map(), gpuByName = new Map();
  for (const e of events) {
    if (e.ph !== 'X' || !e.dur) continue; const th = tn.get(e.pid + ':' + e.tid) || e.tid, k = `${pn.get(e.pid) || e.pid} / ${th}`;
    if (['ThreadControllerImpl::RunTask', 'RunTask', 'ThreadPool_RunTask'].includes(e.name)) busy.set(k, (busy.get(k) || 0) + e.dur);
    byName.set(k + ' :: ' + e.name, (byName.get(k + ' :: ' + e.name) || 0) + e.dur);
    if (/CrGpuMain/.test(String(th))) gpuByName.set(e.name, (gpuByName.get(e.name) || 0) + e.dur);
  }
  const ms = (v) => +(v / 1000 / seconds).toFixed(0), top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, ms(v)]);
  return {heavy, seconds, fps: +fps.toFixed(1), busyPctByThread: top(busy, 14).map(([k, v]) => [k, +(v / 10).toFixed(0)]), gpuMainTopEventsMsPerS: top(gpuByName, Number(process.env.WHERE_TOP || 28)), topEventsMsPerS: heavy ? top(byName, 30) : undefined};
}

if (true) {
  const A = parseArgs(process.argv.slice(2)), names = String(A.scenarios || 'marsh-late-mid,pinewood-late-mid').split(','), frames = Number(A.frames || 150);
  const srv = await startServer(A.root || 'dist', PORT);
  try {
    const ses = new Session();
    for (const name of names) {
      await ses.prepare(name, {}); const s = ses.s; const quiet = await waitQuiet();
      const rec = {scenario: name, quiet};
      try {
        await s.send('Page.enable'); await s.send('Runtime.enable');
        await s.send('Page.addScriptToEvaluateOnNewDocument', {source: COUNTER});
        const hook = async () => {
          await delay(5000);
          rec.traceLight = await trace(s, 6, false); console.log(name, 'light trace fps', rec.traceLight.fps, rec.traceLight.busyPctByThread.slice(0, 6).map(x => x.join(' ')).join(' | '));
          await delay(2000);
          const c = await s.ev(`window.__cc.run(${frames},false)`); rec.counts = perFrame(c); console.log(name, 'counts: draw', rec.counts.drawCallsPerFrame, 'total', rec.counts.totalCanvas2DCallsPerFrame, 'src Mpx', rec.counts.drawImage.srcMPx, 'dst Mpx', rec.counts.drawImage.dstMPx, 'canvases/frame', rec.counts.canvasesTouchedPerFrame, 'upload KB', rec.counts.uploadsPerFrame.totalToGpuKB);
          const k = await s.ev(`window.__cc.run(8,true)`); rec.callers = callers(k); console.log(name, 'callers', rec.callers.top.slice(0, 4).map(x => x.perFrame + ' ' + x.caller).join(' || '));
          await delay(2000);
          rec.traceHeavy = await trace(s, 5, true); console.log(name, 'heavy trace fps', rec.traceHeavy.fps, 'gpu main top', rec.traceHeavy.gpuMainTopEventsMsPerS.slice(0, 5).map(x => x.join(' ')).join(' | '));
        };
        const r = await measureRetry(s, name, {seconds: 1, hook}); rec.pageInfo = {vp: r.vp, dpr: r.dpr, canvases: r.canvases};
      } catch (e) { rec.error = e.message; console.log(name, 'FAILED', e.message); }
      await save(`where-${name}.json`, rec);
    }
    ses.close();
  } finally { srv.close(); }
}
