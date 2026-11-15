// Short, matched-input production-renderer comparison. This is a headless
// desktop diagnostic, not a claim about a physical phone or the full app HUD.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root=path.resolve('dist'),out=path.resolve('work/card-flight-performance');
const cueOnly=process.argv.includes('--cues');
await fs.mkdir(out,{recursive:true});
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'emberwing-card-performance-'));
const page=`<!doctype html><style>html,body{margin:0;background:#08111d}#stage{position:relative;width:900px;height:430px}canvas{width:100%;height:100%}</style><div id="stage"><canvas></canvas></div><script type="module">
import {WispFlight} from '/flight.mjs';
const stats=a=>{const b=a.toSorted((a,b)=>a-b),p=f=>b[Math.min(b.length-1,Math.floor(b.length*f))]||0;return {count:a.length,mean:a.reduce((s,n)=>s+n,0)/Math.max(1,a.length),p50:p(.5),p95:p(.95),p99:p(.99),max:b.at(-1)||0,over50:a.filter(n=>n>50).length}};
window.__measure={ready:true};
window.__measure.previewHandling=async({learned=false,portrait=false,fallback=false,collector=true}={})=>{
  window.__measure.engine?.destroy();
  const stage=document.querySelector('#stage');stage.style.width=portrait?'390px':'900px';stage.style.height=portrait?'620px':'430px';
  const canvas=stage.querySelector('canvas');
  const e=new WispFlight({canvas,seed:'handling-visual',companions:[collector?'collector':'protector'],modifiers:{lightRadius:1000,...learned?{collectorFetchMass:3,collectorFlashFetch:true}:{}}});
  window.__measure.engine=e;await e.ready;
  const kinds=['light','cluster','cache','sight','dusk','dark'];e.layout.obstacles=[];e.drafts.zones=[];
  e.layout.embers=kinds.map((kind,i)=>({id:'cue-'+kind,kind,x:e.distance+e.width*(.1+i*.16),y:e.height*.42,phase:i*.7}));
  e.flashProps=[];e.player.y=e.previousPlayerY=e.height*.7;e.player.vy=0;
  if(fallback){e.pixiReady=false;e.pixiView.canvas.style.display='none';canvas.style.opacity='1';}
  e.render();return {width:portrait?390:900,height:portrait?620:430,world:[e.width,e.height],learned,portrait,fallback,collector};
};
window.__measure.run=async enabled=>{
  const errors=[];window.onerror=(...args)=>errors.push(String(args[0]));
  const canvas=document.querySelector('canvas');
  const e=new WispFlight({canvas,seed:'card-perf',duration:24,node:{tutorialLesson:'glide'},modifiers:{cardLiftGuide:enabled}});
  window.__measure.engine=e;await e.ready;
  if(!e.pixiReady)throw Error('Production pixel renderer unavailable: '+e.rendererError);
  await document.fonts.ready;
  const data={tick:[],render:[],guide:[],raf:[]},input=[0,1.85,3.31666666666666,4.6,6.06666666666665,7.35,8.63333333333334,9.91666666666674];
  let index=0,previous=0,resolveDone,resolveCue,soon=0,open=0;
  const done=new Promise(r=>resolveDone=r);window.__measure.cue=new Promise(r=>resolveCue=r);
  for(const name of ['tick','render','getLiftGuide']){const original=e[name];e[name]=function(...args){const at=performance.now();try{return original.apply(this,args)}finally{if(this.time>=1&&this.time<=8)data[name==='getLiftGuide'?'guide':name].push(performance.now()-at)}};}
  const step=e.step;e.step=function(dt){
    if(index<input.length&&this.time+1e-7>=input[index]){this.beginLiftInput();this.endLiftInput();index++;}
    step.call(this,dt);
    if(this.time>=8&&!this.dying){
      const result={enabled,renderer:this.pixiView.constructor.name,width:this.width,height:this.height,simSeconds:this.time,flaps:this.flaps,y:this.player.y,flame:this.flame,dying:this.dying,soon,open,guideSearches:this.liftGuide?.searches||0,guideProjections:this.liftGuide?.projections||0,errors,metrics:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,stats(v)]))};
      this.pause();resolveDone(result);
    }
  };
  const tick=e.tick;e.tick=function(t){if(this.running&&!this.paused&&this.time>=1&&this.time<=8&&previous)data.raf.push(t-previous);previous=t;return tick.call(this,t)};
  const guide=e.getLiftGuide;e.getLiftGuide=function(){const cue=guide.call(this);if(cue?.phase==='soon'){soon++;resolveCue({time:this.time,cue})}else if(cue?.phase==='open')open++;return cue};
  e.start();e.beginLiftInput();e.endLiftInput();index=1;
  return done;
};
</script>`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
  try{const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/measure.html'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(page);return;}
    const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error('Outside dist');
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<300;i++){const value=await fn().catch(()=>null);if(value)return value;await delay(100);}throw Error('Timed out '+label);}
let socket;
try{
  const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
  const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let serial=0;const pending=new Map();
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async(expression)=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:900,height:430,deviceScaleFactor:1,mobile:false});
  const results=[];
  for(const enabled of cueOnly?[]:[false,true,false,true]){
    await send('Page.navigate',{url:base+'/measure.html?guide='+Number(enabled)});
    await until(()=>evaluate('window.__measure?.ready'),'measurement module');
    const run=evaluate('window.__measure.run('+enabled+')');
    if(enabled&&results.length===1){
      await until(()=>evaluate('!!window.__measure.engine?.pixiReady'),'renderer');
      const cue=await evaluate('window.__measure.cue');
      await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      await fs.writeFile(path.join(out,'lift-guide-early.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
      await fs.writeFile(path.join(out,'lift-guide-early.json'),JSON.stringify(cue,null,2));
    }
    const result=await run;assert.equal(result.dying,false);assert.equal(result.errors.length,0);results.push(result);console.log(JSON.stringify(result));
  }
  if(cueOnly){
    await send('Page.navigate',{url:base+'/measure.html?cues=1'});await until(()=>evaluate('window.__measure?.ready'),'cue module');
    const samples=[];
    for(const settings of [{portrait:true},{portrait:true,learned:true},{portrait:true,fallback:true},{portrait:true,learned:true,fallback:true},{},{learned:true},{portrait:true,collector:false}]){
      const info=await evaluate('window.__measure.previewHandling('+JSON.stringify(settings)+')');
      const label=(info.portrait?'phone':'landscape')+'-'+(info.fallback?'fallback':'pixel')+'-'+(!info.collector?'no-collector':info.learned?'learned':'base');
      await fs.writeFile(path.join(out,'handling-'+label+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:info.width,height:info.height,scale:1},captureBeyondViewport:true})).data,'base64'));
      samples.push({label,...info});
    }
    await fs.writeFile(path.join(out,'handling-cues.json'),JSON.stringify(samples,null,2));console.log(JSON.stringify(samples));
  }
  for(const r of results){assert.equal(r.flaps,results[0].flaps);assert.ok(Math.abs(r.y-results[0].y)<1e-5);if(r.enabled)assert.ok(r.soon>0&&r.open>0);else assert.equal(r.guideProjections,0);}
  const report={createdAt:new Date().toISOString(),environment:await evaluate('({ua:navigator.userAgent,dpr:devicePixelRatio,cores:navigator.hardwareConcurrency})'),note:'Matched real input entry points and production canvas renderer; alternating no-guide/guide. Seven simulated seconds per sample after one second warmup. Headless desktop only; full app HUD/music and physical phone are not measured.',results};
  if(!cueOnly)await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}finally{socket?.close();browser.kill();server.close();}
