// Steady-state variant of fillrect-callers.mjs: samples after WAIT ms (default 15 s) so sprite warm-up is over.
//   node scripts/perf/android/fillrect-callers.mjs [--biome marsh] [--course 4] [--frames 5]
import fs from 'node:fs/promises';
import path from 'node:path';
import {session, delay, wake} from './cdp.mjs';
import {startServer} from './serve.mjs';
import {flight} from './play.mjs';
const argv = process.argv.slice(2), A = {}; for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
const SRC = `(()=>{const o=CanvasRenderingContext2D.prototype.fillRect;const c=window.__fr={on:false,n:{}};
CanvasRenderingContext2D.prototype.fillRect=function(...a){if(c.on){const st=(new Error().stack||'').split('\\n').slice(2,4).map(l=>l.replace(/https?:\\/\\/[^/]+\\//,'').replace(/\\?[^:)]*/,'').trim()).join(' < ');c.n[st]=(c.n[st]||0)+1}return o.apply(this,a)};
c.run=n=>new Promise(res=>{c.n={};c.on=true;let k=0;(function f(){if(++k<n)requestAnimationFrame(f);else{c.on=false;res(Object.entries(c.n).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([s,v])=>[s,+(v/n).toFixed(1)]))}})()})})()`;
wake(); await delay(1500);
const srv = await startServer('dist', 4186), s = await session();
try {
  await s.send('Page.enable'); await s.send('Page.addScriptToEvaluateOnNewDocument', {source: SRC});
  const r = await flight(s, {biome: A.biome || 'marsh', course: Number(A.course || 4), row: 'late', chain: 'mid'}, {seconds: 1, sampler: () => `(async()=>{await new Promise(r=>setTimeout(r,${Number(process.env.WAIT||15000)}));return window.__fr.run(${Number(A.frames || 5)})})()`});
  const rows = r.extra || r; console.log(JSON.stringify(rows, null, 1));
  const out = path.resolve('outputs/perf/android', `${new Date().toISOString().slice(0, 10)}-counts-host`); await fs.writeFile(path.join(out, `fillrect-callers-steady-${A.biome || 'marsh'}.json`), JSON.stringify(rows, null, 1));
} finally { srv.close(); s.close(); }
