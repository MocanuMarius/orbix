// Ordinary-play benchmark on the Android emulator, hands-off. Replaces the earlier menu-driving version.
// Each flight is a disposable real flight (?mock=boundary, see serve.mjs) flown by the dev autopilot (?autopilot=1). The
// "Tap to depart" gate is passed with a TRUSTED touch sent over CDP (Input.dispatchTouchEvent). The page's requestAnimationFrame
// gaps are sampled for --seconds after departure (default 40 s, first 4 s skipped).
//   node scripts/perf/android/play.mjs --label play [--seconds 40] [--matrix full|quick] [--query gl=0] [--only pinewood-early-mid]
// Saves outputs/perf/android/<date>-<label>/play.json
import fs from 'node:fs/promises';
import path from 'node:path';
import {session, delay, wake, ensureLandscape} from './cdp.mjs';
import {startServer} from './serve.mjs';
import {pathToFileURL} from 'node:url';
const argv=process.argv.slice(2),A={};for(let i=0;i<argv.length;i++){const m=argv[i].match(/^--([^=]+)(?:=(.*))?$/);if(!m)continue;A[m[1]]=m[2]??(argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true);}
const label=A.label||'play',seconds=Number(A.seconds||40),port=Number(A.port||4186),day=new Date().toISOString().slice(0,10);
const out=path.resolve('outputs/perf/android',`${day}-${label}`);await fs.mkdir(out,{recursive:true});
const BIOMES=[['pinewood',1],['marsh',4],['coral',2]];
const MATRIX=[];for(const [b,c] of BIOMES)for(const row of ['early','late'])for(const chain of ['starter','mid'])MATRIX.push({id:`${b}-${row}-${chain}`,biome:b,course:c,row,chain});
export const SAMPLER=s=>`new Promise(res=>{const d=[];let l=0,t0=0;(function f(t){if(!t0)t0=t;if(l&&t-t0>4000)d.push(t-l);l=t;if(t-t0<${s*1000+4000})requestAnimationFrame(f);else{
 const n=d.length,sorted=[...d].sort((a,b)=>a-b),sum=d.reduce((a,b)=>a+b,0),worst=sorted.slice(Math.max(0,n-Math.ceil(n/100))),w=worst.reduce((a,b)=>a+b,0);
 res({frames:n,avgFps:+(1000*n/sum).toFixed(1),low1Fps:+(1000*worst.length/w).toFixed(1),p50Ms:+sorted[Math.floor(n*.5)].toFixed(1),p95Ms:+sorted[Math.floor(n*.95)].toFixed(1),over33:d.filter(x=>x>33.4).length,over50:d.filter(x=>x>50).length,longestMs:Math.round(sorted[n-1])});}})(performance.now())})`;
export async function flight(s,{biome,course,row,chain},{query='',seconds=40,sampler=SAMPLER,after}={}){
  const q=new URLSearchParams({mock:'boundary',cards:'1',autopilot:'1',seed:'perf-play',biome,course:String(course),cardset:chain,edge:'spectral',r:String(Date.now())});
  if(row==='late')q.set('late','1');if(chain==='mid')q.set('collector','twin');
  for(const [k,v] of new URLSearchParams(query))q.set(k,v);
  await s.goto(`http://10.0.2.2:${port}/game.html?${q}`);await ensureLandscape(s);
  for(let i=0;i<600;i++){if(await s.ev('!!document.querySelector(".entry-depart:not([disabled])")'))break;await delay(500);}
  let running=false;
  for(let i=0;i<8&&!running;i++){await s.tapSel('.entry-depart:not([disabled])');await delay(2500);running=await s.ev('document.body.classList.contains("playing")&&!document.querySelector(".entry-depart")');}
  if(!running)throw Error('did not depart');
  const info=await s.ev('({vis:document.visibilityState,vp:innerWidth+"x"+innerHeight,dpr:devicePixelRatio})');
  const r=await s.ev(sampler(seconds));
  const extra=after?await after():null;
  return {...r,vis:info.vis,extra};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
  wake();await delay(1500);
  const srv=await startServer('dist',port),s=await session();
  const only=A.only?String(A.only).split(','):null,list=MATRIX.filter(m=>!only||only.includes(m.id)).filter(m=>A.matrix!=='quick'||m.row==='late'||m.biome==='pinewood');
  const results=[];
  try{
    for(const m of list){
      try{const r=await flight(s,m,{query:A.query||'',seconds});results.push({...m,...r});console.log(m.id.padEnd(22),r.avgFps,'fps  1%low',r.low1Fps,' p95',r.p95Ms,'ms  >33',r.over33,' >50',r.over50,' max',r.longestMs);}
      catch(e){console.log(m.id,'FAILED',e.message);results.push({...m,error:e.message});}
      await fs.writeFile(path.join(out,'play.json'),JSON.stringify({day,query:A.query||'',seconds,device:await s.ev('({dpr:devicePixelRatio,vp:innerWidth+"x"+innerHeight})'),results},null,1));
    }
  }finally{srv.close();s.close();}
}
