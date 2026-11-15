// Reproduce the art-review recordings in the full application, HUD and renderer.
// The server appends a disposable inspection bridge; no app source is rewritten.
// Run: node scripts/collector-art-capture.mjs
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root=path.resolve('dist'),output=path.resolve('work/collector-art-capture');
await fs.mkdir(output,{recursive:true});
const variants=['current','flat2','flat3'],fps=30,seconds=6;
const bridge=`
window.__collectorStudy={
 get engine(){return engine},
 async prepare(){
  const e=engine;if(!e?.pixiReady)throw Error('Production renderer not ready');
  music.setEnabled(false);e.setMuted(true);if(e.raf!==null)cancelAnimationFrame(e.raf);e.raf=null;
  paused=false;resumeArmed=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
  document.querySelector('#pause-layer').replaceChildren();
  const {WispCompanion}=await import('./wisp.mjs?v=skills-cards-1');
  e.wisp=new WispCompanion(e.player);e.accumulator=1/60;
  await document.fonts.ready;await e.environmentArtReady;
  this.initial={distance:e.distance,y:e.player.y,width:e.width,height:e.height,seed:e.seed};
  this.steps=0;this.inputs=[];this.states=[];
  e.render();e.notify();return this.initial;
 },
 frame(){
  const e=engine;
  for(let j=0;j<60/${fps};j++){
   // Real Lift input and normal physics, kept within the authored opening.
   const target=this.initial.y;
   if(e.player.y>target+12&&e.player.vy>20){e.beginLiftInput();e.endLiftInput();this.inputs.push(this.steps);}
   e.step(1/60);this.steps++;
  }
  e.accumulator=1/60;e.render();e.notify();
  const w=e.getWispState();
  const state={time:e.time,distance:e.distance,playerX:e.player.x,playerY:e.player.y,
    x:w.x,y:w.y,depth:w.depth,phase:w.phase,carrying:w.carrying,dying:e.dying,
    scale:e.pixiView.scale,canvas:JSON.parse(JSON.stringify(document.querySelector('#flight-canvas').getBoundingClientRect()))};
  this.states.push(state);return state;
 }
};
`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))throw Error('Outside dist');
  let body=await fs.readFile(file);if(path.basename(file)==='app.mjs')body=Buffer.from(body.toString()+bridge);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
 }catch(e){res.writeHead(404).end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'collector-art-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
 '--user-data-dir='+profile,'--disable-background-timer-throttling','about:blank'
],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<300;i++){const value=await fn().catch(()=>null);if(value)return value;await delay(100);}throw Error('Timed out '+label);}
let socket;
try{
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
 const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map();
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:1,mobile:true});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.__studyErrors=[];addEventListener('error',e=>__studyErrors.push(e.message));addEventListener('unhandledrejection',e=>__studyErrors.push(String(e.reason)));"});
 const results=[];
 for(const art of variants){
  const frames=path.join(output,art);await fs.mkdir(frames,{recursive:true});
  await call('Page.navigate',{url:base+'/game.html?mock=boundary&cards=1&biome=pinewood&course=1&collectorArt='+art});
  await until(()=>evaluate('window.__collectorStudy?.engine?.pixiReady&&document.querySelector("[data-action=wake-flight]")'),'actual flight');
  const initial=await evaluate('__collectorStudy.prepare()');await delay(250);
  const states=[];
  for(let i=0;i<fps*seconds;i++){
   states.push(await evaluate('__collectorStudy.frame()'));
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   await fs.writeFile(path.join(frames,String(i).padStart(4,'0')+'.png'),Buffer.from(shot.data,'base64'));
  }
  const extra=await evaluate('({inputs:__collectorStudy.inputs,errors:__studyErrors,renderer:__collectorStudy.engine.pixiView.constructor.name,art:document.querySelector("[data-role-art=collector]")?.dataset.collectorArt})');
  assert.equal(extra.errors.length,0,JSON.stringify(extra.errors));
  assert.ok(states.every(s=>!s.dying),'The matched flight must remain alive');
  assert.ok(states.some(s=>s.depth>.8)&&states.some(s=>s.depth<-.8),'Front and back depth both shown');
  assert.ok(states.some(s=>s.phase==='outbound')&&states.some(s=>s.carrying),'Actual fetch and return shown');
  if(results.length){assert.deepEqual(states,results[0].states,'Art must not change orbit, player, phase or depth');assert.deepEqual(extra.inputs,results[0].inputs);}
  results.push({art,initial,states,...extra});console.log(art+': '+states.length+' matched real-game frames, '+extra.inputs.length+' Lifts');
 }
 const report={at:new Date().toISOString(),fps,seconds,viewport:[900,405],note:'Full application/HUD, production WispFlight and WispFlightView. Disposable boundary inspector course/seed, real Lift inputs and normal physics. All Sparks are from the authored course. Headless mobile layout; not a physical-phone performance measurement.',results};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 console.log('Capture saved to '+output+'; encode with python scripts/encode-collector-art.py');
}finally{socket?.close();browser.kill();server.close();}
