// Print markdown tables from session.json and run.mjs results.
// node scripts/perf/tables.mjs session outputs/perf/session/reskin-4x/session.json
// node scripts/perf/tables.mjs runs outputs/perf/raw/reskin  (aggregates <name>-<t>x-r<n>.json)
import fs from 'node:fs';import path from 'node:path';
const [mode,target]=process.argv.slice(2);const f=(v,d=1)=>typeof v==='number'?v.toFixed(d):'-';
if(mode==='session'){
 const s=JSON.parse(fs.readFileSync(target,'utf8'));
 console.log('| Flight | Course | Course frame mean / p95 / p99 (ms) | Reference tick p50 / p95 (ms) | Heap after GC (MB) | DOM nodes | JS listeners | Canvases | Canvas MPx | rAF pending | Intervals | Background re-rasters/s | Entry long task (ms) |');
 console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
 for(const x of s.flights){const st=x.state||{},r=x.reference;
  console.log(`| ${x.flight}${x.death?' (death)':''} | ${x.level||'home'} | ${x.frame?`${f(x.frameMean??x.frame.mean)} / ${f(x.frame.p95)} / ${f(x.frame.p99)}`:'-'} | ${r?`${f(r.tick.p50)} / ${f(r.tick.p95)}`:'-'} | ${f(st.heapUsedMB,2)} | ${st.nodes??'-'} | ${st.jsListeners??'-'} | ${st.canvasesLive??'-'} | ${f(st.canvasMPx,2)} | ${st.rafPending??'-'} | ${st.intervals??'-'} | ${x.bake?f(x.bake.bgPerS,1):'-'} | ${x.entry?x.entry.longTaskMax:'-'} |`);}
}else{
 const rows={};for(const file of fs.readdirSync(target).filter(n=>/-r\d+\.json$/.test(n))){const r=JSON.parse(fs.readFileSync(path.join(target,file),'utf8'));if(r.failed)continue;const k=r.job+' '+r.throttle+'x';(rows[k]||(rows[k]=[])).push(r)}
 console.log('| Scenario | Runs | Frame p50 | Frame p95 (min-max) | Frame p99 | Worst | Frames >33 ms per 20 s | Tick CPU p95 | Long tasks | Background ms/s | Light/terrain notes |');
 console.log('|---|---|---|---|---|---|---|---|---|---|---|');
 for(const [k,rs] of Object.entries(rows).sort()){const a=fn=>rs.map(fn),avg=v=>v.reduce((s,x)=>s+x,0)/v.length;
  const p95=a(r=>r.frame.p95);
  console.log(`| ${k} | ${rs.length} | ${f(avg(a(r=>r.frame.p50)))} | ${f(avg(p95))} (${f(Math.min(...p95))}-${f(Math.max(...p95))}) | ${f(avg(a(r=>r.frame.p99)))} | ${f(Math.max(...a(r=>r.frame.max)),0)} | ${f(avg(a(r=>r.frame.over33*20/r.windowS)),0)} | ${f(avg(a(r=>r.tickCpu.p95)))} | ${f(avg(a(r=>r.longTasks.count)),0)} | ${rs[0].bake?f(avg(a(r=>r.bake.bgMsPerS))):'-'} | ${rs[0].peaks?.level||''} |`);}
}
