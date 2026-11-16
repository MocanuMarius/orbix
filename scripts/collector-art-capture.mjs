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
  const {WispCompanion}=await import('./wisp.mjs?v=skills-cards-2');
  this.canFetch=(await import('./collector-load.mjs?v=skills-cards-2')).collectorCanFetch;
  this.hook=(await import('./pickup-handling-cue.mjs?v=skills-cards-2')).pickupHookAnchor;
  e.wisp=new WispCompanion(e.player);e.accumulator=1/60;
  await document.fonts.ready;await e.environmentArtReady;
  this.initial={distance:e.distance,y:e.player.y,width:e.width,height:e.height,seed:e.seed};
  this.steps=0;this.inputs=[];this.states=[];this.events=[];this.renderSamples=[];this.maxFieldCandidates=0;
  const collect=e.collect.bind(e),shatter=e.shatterPickupRing.bind(e);
  e.collect=(p,source)=>{if(!p.collected)this.events.push({event:'collect',time:e.time,id:p.id,via:source?'collector':'body',cargo:source?[source.worldX-e.distance,source.y]:null,player:[e.player.x,e.player.y]});return collect(p,source);};
  e.shatterPickupRing=(p,source)=>{this.events.push({event:'shatter',time:e.time,id:p.id,source});return shatter(p,source);};
  const step=e.step.bind(e);
  e.step=dt=>{
   if(e.player.y>this.initial.y+12&&e.player.vy>20){e.beginLiftInput();e.endLiftInput();this.inputs.push({step:this.steps,time:e.time,y:e.player.y,vy:e.player.vy});}
   const phase=e.wisp.phase;step(dt);this.steps++;
   if(e.wisp.phase!==phase)this.events.push({event:e.wisp.phase,time:e.time,x:e.wisp.x,y:e.wisp.y,hook:e.wisp.target?Object.values(this.hook(e.wisp.target,e.wisp.target.x-e.distance,e.wisp.target.y)):null});
  };
  e.render();e.notify();return this.initial;
 },
 frame(){
  const e=engine;
  for(let j=0;j<60/${fps};j++){
   e.step(1/60);
  }
  const candidates=e.layout.embers.filter(p=>!p.collected&&!p.carried&&this.canFetch(p,e.mod)&&p.x-e.distance>=0&&p.x-e.distance<=e.width&&p.y>=0&&p.y<=e.height).length;
  this.maxFieldCandidates=Math.max(this.maxFieldCandidates,candidates);
  e.accumulator=1/60;const started=performance.now();e.render();e.notify();this.renderSamples.push(performance.now()-started);
  const w=e.getWispState();
  const state={time:e.time,distance:e.distance,playerX:e.player.x,playerY:e.player.y,
    x:w.x,y:w.y,depth:w.depth,phase:w.phase,carrying:w.carrying,cargoPose:w.cargoPose,dying:e.dying,
    scale:e.pixiView.scale,canvas:JSON.parse(JSON.stringify(document.querySelector('#flight-canvas').getBoundingClientRect()))};
  this.states.push(state);return state;
 },
 stageHandling(){
  const e=engine;
  // Explicitly staged review example, drawn by the full production renderer.
  // No simulation or eligibility substitutes are used for the capture.
  e.mod={...e.mod,collectorFetchMass:2,collectorFlashFetch:true};
  e.wisp.target=null;e.wisp.cargo=null;e.wisp.phase='cooldown';e.wisp.cooldown=99;
  const offsets=[['light',-30,-48],['cache',65,-48],['sight',-30,35],['dark',65,35]];
  e.layout.embers=offsets.map(([kind,x,y],i)=>({kind,id:'staged-handling-'+i,x:e.distance+e.player.x+x,y:e.player.y+y,phase:0}));
  e.render();e.notify();
  return {label:'Staged production-renderer example: Spark and learned Flash marked; locked Cache and harmful Dark unmarked.',
   playerX:e.player.x,playerY:e.player.y,width:e.width,height:e.height,
   packets:e.layout.embers.map(p=>({kind:p.kind,x:p.x-e.distance,y:p.y,eligible:this.canFetch(p,e.mod),hook:this.hook(p,p.x-e.distance,p.y)}))};
 },
 cadence(hz){
  const e=engine,render=e.renderScheduledFrame,raf=window.requestAnimationFrame;
  e.renderScheduledFrame=()=>{};window.requestAnimationFrame=()=>null;e.lastFrame=0;
  try{for(let i=0;i<=hz*6;i++)e.tick(10+i*1000/hz+(i===hz*6?.001:0));}
  finally{e.renderScheduledFrame=render;window.requestAnimationFrame=raf;}
  return {hz,time:e.time,distance:e.distance,player:[e.player.y,e.player.vy],steps:this.steps,inputs:this.inputs,events:this.events,phase:e.wisp.phase,cargo:[e.wisp.cargoX,e.wisp.cargoY],position:[e.wisp.x,e.wisp.y],collected:e.layout.embers.filter(p=>p.collected).map(p=>p.id)};
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
  const extra=await evaluate('(()=>{const s=__collectorStudy,t=[...s.renderSamples].sort((a,b)=>a-b);return{inputs:s.inputs,events:s.events,errors:__studyErrors,renderer:s.engine.pixiView.constructor.name,art:document.querySelector("[data-role-art=collector]")?.dataset.collectorArt,renderTiming:{samples:t.length,p50:t[Math.floor(t.length*.5)],p95:t[Math.floor(t.length*.95)],max:t.at(-1),maxFieldCandidates:s.maxFieldCandidates}}})()');
  assert.equal(extra.errors.length,0,JSON.stringify(extra.errors));
  assert.ok(states.every(s=>!s.dying),'The matched flight must remain alive');
  assert.ok(states.some(s=>s.depth>.8)&&states.some(s=>s.depth<-.8),'Front and back depth both shown');
  assert.ok(states.some(s=>s.phase==='outbound')&&states.some(s=>s.carrying),'Actual fetch and return shown');
  if(results.length){assert.deepEqual(states,results[0].states,'Art must not change orbit, player, phase or depth');assert.deepEqual(extra.inputs,results[0].inputs);}
  results.push({art,initial,states,...extra});console.log(art+': '+states.length+' matched real-game frames, '+extra.inputs.length+' Lifts');
 }
 const staged=await evaluate('__collectorStudy.stageHandling()');
 await fs.writeFile(path.join(output,'handling-staged.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 const cadences=[];
 for(const hz of [30,60,120]){
  await call('Page.navigate',{url:base+'/game.html?mock=boundary&cards=1&biome=pinewood&course=1&collectorArt=flat2'});
  await until(()=>evaluate('window.__collectorStudy?.engine?.pixiReady&&document.querySelector("[data-action=wake-flight]")'),'cadence flight');
  await evaluate('__collectorStudy.prepare()');
  const result=await evaluate('__collectorStudy.cadence('+hz+')');
  const {hz:ignore,...matched}=result;if(cadences.length){const {hz:other,...baseline}=cadences[0];assert.deepEqual(matched,baseline,'Actual fixed-step Lift and tow events match across render frame rates');}
  cadences.push(result);console.log(hz+'Hz: '+result.steps+' physical steps, '+result.events.filter(e=>e.event==='collect'&&e.via==='collector').length+' deliveries');
 }
 const report={staged,cadences,at:new Date().toISOString(),fps,seconds,viewport:[900,405],note:'Full application/HUD, production WispFlight and WispFlightView. Disposable boundary inspector course/seed, real Lift inputs and normal physics. All Sparks are from the authored course. Headless mobile layout; not a physical-phone performance measurement.',results};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 console.log('Capture saved to '+output+'; encode with python scripts/encode-collector-art.py');
}finally{socket?.close();browser.kill();server.close();}
