// CPU profile of the stress scene's peak on the emulator (hands-off).
//   node scripts/perf/android/profile.mjs --label after-gl [--root dist] [--query gl=1] [--seconds 10]
// Starts the scene like stress.mjs, profiles from 14 s to 14+N s (peak), prints top self time and files.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {startServer,delay,until,profileSummary} from '../lib.mjs';
import {listTargets,evaluate,ensureForward} from './connect.mjs';
const argv=process.argv.slice(2),A={};for(let i=0;i<argv.length;i++){const m=argv[i].match(/^--([^=]+)(?:=(.*))?$/);if(!m)continue;A[m[1]]=m[2]??(argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true);}
const port=Number(A.port||4184),seconds=Number(A.seconds||10),day=new Date().toISOString().slice(0,10);
const out=path.resolve('outputs/perf/android',`${day}-${A.label||'profile'}-profile`);await fs.mkdir(out,{recursive:true});
const srv=await startServer(A.root||'dist',port,{noCache:true});
try{
  ensureForward();
  const q=new URLSearchParams({scene:'stress',run:String(Date.now())});for(const [k,v] of new URLSearchParams(A.query||''))q.set(k,v);
  const url=`http://10.0.2.2:${port}/game.html?${q}`;
  const ts=await listTargets();const t0=ts.find(x=>x.url!=='about:blank')||ts[0];await evaluate(`(location.href=${JSON.stringify(url)},1)`,t0.id).catch(()=>{});
  try{execFileSync('adb',['shell','monkey','-p','com.android.chrome','-c','android.intent.category.LAUNCHER','1']);}catch{}
  const target=await until(async()=>(await listTargets()).find(x=>x.url.includes(q.get('run'))),'tab',60000,1000);
  await until(()=>evaluate('!!document.querySelector(".stress-confirm button")',target.id),'confirm',120000,1000);
  const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map();
  ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pending.has(d.id)){pending.get(d.id)(d.result);pending.delete(d.id);}};
  const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
  await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});
  await send('Runtime.evaluate',{expression:'document.querySelector(".stress-confirm button").click()'});
  await delay(14000);await send('Profiler.start');await delay(seconds*1000);const {profile}=await send('Profiler.stop');ws.close();
  await fs.writeFile(path.join(out,'peak.cpuprofile'),JSON.stringify(profile));
  const p=profileSummary(profile);
  console.log('self:');for(const r of p.self.slice(0,25))console.log(`  ${String(r.pct).padStart(6)}%  ${r.name}`);
  console.log('files:');for(const r of p.byFile.slice(0,15))console.log(`  ${String(r.pct).padStart(6)}%  ${r.name}`);
  await until(()=>evaluate('!!window.__stressResult',target.id),'result',600000,3000);
}finally{srv.close();}
