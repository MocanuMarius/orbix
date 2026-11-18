// Chrome trace of the stress scene's peak on the emulator: busy time per process/thread and top events.
//   node scripts/perf/android/trace.mjs --label x [--root dist] [--query gl=1] [--seconds 6]
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {startServer,delay,until} from '../lib.mjs';
import {listTargets,evaluate,ensureForward} from './connect.mjs';
const argv=process.argv.slice(2),A={};for(let i=0;i<argv.length;i++){const m=argv[i].match(/^--([^=]+)(?:=(.*))?$/);if(!m)continue;A[m[1]]=m[2]??(argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true);}
const port=Number(A.port||4185),seconds=Number(A.seconds||6),day=new Date().toISOString().slice(0,10);
const out=path.resolve('outputs/perf/android',`${day}-${A.label||'trace'}-trace`);await fs.mkdir(out,{recursive:true});
const srv=await startServer(A.root||'dist',port,{noCache:true});
try{
  ensureForward();
  const q=new URLSearchParams({scene:'stress',run:String(Date.now())});for(const [k,v] of new URLSearchParams(A.query||''))q.set(k,v);
  const url=`http://10.0.2.2:${port}/game.html?${q}`;
  const ts=await listTargets();const t0=ts.find(x=>x.url!=='about:blank')||ts[0];await evaluate(`(location.href=${JSON.stringify(url)},1)`,t0.id).catch(()=>{});
  try{execFileSync('adb',['shell','monkey','-p','com.android.chrome','-c','android.intent.category.LAUNCHER','1'],{stdio:'ignore'});}catch{}
  const target=await until(async()=>(await listTargets()).find(x=>x.url.includes(q.get('run'))),'tab',60000,1000);
  await until(()=>evaluate('!!document.querySelector(".stress-confirm button")',target.id),'confirm',120000,1000);
  const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map(),events=[];let done;
  const complete=new Promise(r=>done=r);
  ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.method==='Tracing.dataCollected')events.push(...d.params.value);else if(d.method==='Tracing.tracingComplete')done();else if(d.id&&pending.has(d.id)){pending.get(d.id)(d.result);pending.delete(d.id);}};
  const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
  await send('Runtime.evaluate',{expression:'document.querySelector(".stress-confirm button").click()'});
  await delay(15000);
  await send('Tracing.start',{traceConfig:{includedCategories:['toplevel','gpu','viz','cc','devtools.timeline','disabled-by-default-devtools.timeline','blink','v8'],recordMode:'recordAsMuchAsPossible'},transferMode:'ReportEvents'});
  await delay(seconds*1000);await send('Tracing.end');await complete;ws.close();
  await fs.writeFile(path.join(out,'trace.json'),JSON.stringify({traceEvents:events}));
  const pn=new Map(),tn=new Map();for(const e of events){if(e.name==='process_name')pn.set(e.pid,e.args.name);if(e.name==='thread_name')tn.set(e.pid+':'+e.tid,e.args.name);}
  const busy=new Map(),byName=new Map();
  for(const e of events){if(e.ph!=='X'||!e.dur)continue;const k=`${pn.get(e.pid)||e.pid} / ${tn.get(e.pid+':'+e.tid)||e.tid}`;
    if(['ThreadControllerImpl::RunTask','RunTask','ThreadPool_RunTask'].includes(e.name))busy.set(k,(busy.get(k)||0)+e.dur);
    const n=k+' :: '+e.name;byName.set(n,(byName.get(n)||0)+e.dur);}
  console.log(`busy ms per second (${seconds}s):`);for(const [k,v] of [...busy].sort((a,b)=>b[1]-a[1]).slice(0,12))console.log(`  ${(v/1000/seconds).toFixed(0).padStart(5)}  ${k}`);
  console.log('top events (ms/s):');for(const [k,v] of [...byName].sort((a,b)=>b[1]-a[1]).slice(0,30))console.log(`  ${(v/1000/seconds).toFixed(0).padStart(5)}  ${k}`);
  await until(()=>evaluate('!!window.__stressResult',target.id),'result',600000,3000);
}finally{srv.close();}
