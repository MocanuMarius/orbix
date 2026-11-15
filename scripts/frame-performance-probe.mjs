// Run server first: node scripts/frame-performance-server.mjs --snapshot
// Then: node scripts/frame-performance-probe.mjs --builds=baseline,candidate,optimized
// Uses stock Edge, a separate temporary profile, real-time RAF (no virtual time).
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const port=9337,work=resolve('work/frame-performance');await mkdir(work,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[`--remote-debugging-port=${port}`,`--user-data-dir=${resolve(work,'edge-profile-'+Date.now())}`,'--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--window-size=1024,650',...(args.headless?['--headless=new']:[]),'about:blank'],{windowsHide:true,stdio:'ignore'});
let info;for(let i=0;i<100;i++){try{info=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();break}catch{await new Promise(r=>setTimeout(r,100))}}
if(!info)throw Error('Edge CDP unavailable');
const ws=new WebSocket(info.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();ws.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result)}};
const cdp=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}))});
const target=await cdp('Target.createTarget',{url:'about:blank'}),{sessionId}=await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true});
const call=(method,params)=>cdp(method,params,sessionId);await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1000,height:600,deviceScaleFactor:1,mobile:false});
await call('Page.bringToFront');if(args.throttle)await call('Emulation.setCPUThrottlingRate',{rate:Number(args.throttle)});
const summaries=[];
try{
 await writeFile(resolve(work,'browser-system.json'),JSON.stringify({version:info,system:await cdp('SystemInfo.getInfo')},null,2));
 for(const build of String(args.builds||'baseline,candidate,optimized').split(','))for(const scene of String(args.scenes||'ordinary,dense,guardian').split(','))for(const mode of String(args.modes||'full').split(',')){
  const query=new URLSearchParams({build,scene,mode,seconds:args.seconds||'12',warmup:args.warmup||'3',pace:args.pace||'60',detail:args.detail||'1',label:args.label||'measure'});
  await call('Page.navigate',{url:`http://127.0.0.1:4187/probe?${query}`});
  await call('Page.bringToFront');
  if(args.quietRead)await new Promise(r=>setTimeout(r,Math.min(59000,(Number(args.seconds||12)+Number(args.warmup||3)+5)*1000)));
  let result;for(let poll=0;poll<300;poll++){
   await new Promise(r=>setTimeout(r,Number(args.pollms)||250));const state=await call('Runtime.evaluate',{expression:'JSON.stringify({done:window.done,result:window.done?window.result:null})',returnByValue:true});
   const data=JSON.parse(state.result.value||'{}');if(data.done){result=data.result;break;}
  }
  if(!result){const state=await call('Runtime.evaluate',{expression:'document.body.innerText',returnByValue:true});throw Error('Timed out '+build+'/'+scene+'/'+mode+': '+state.result.value);}
  if(result.hidden)throw Error('Discarding background-tab measurement');
  result.cpuThrottle=Number(args.throttle)||1;summaries.push(result);console.log(JSON.stringify({build,scene,mode,fps:result.fps,raf:result.rafGapMs,renderGap:result.renderGapMs,cpu:result.renderCpuMs,hot:Object.entries(result.cpu).sort((a,b)=>b[1].mean*b[1].count-a[1].mean*a[1].count).slice(0,7).map(([name,s])=>[name,s.mean,s.p99,s.count])}));
 }
 await writeFile(resolve(work,String(args.label||'measure')+'-suite.json'),JSON.stringify(summaries,null,2));
}finally{await cdp('Browser.close').catch(()=>{});ws.close();browser.unref();}
