// Perf harness library: static server with an in-memory measurement bridge,
// Chrome over CDP with phone emulation and CPU throttling. Read-only towards
// dist/: the bridge is appended to the served copy of app.mjs, never on disk.
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

export const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function until(fn,label,ms=60000,step=100){const end=Date.now()+ms;let last;while(Date.now()<end){try{const v=await fn();if(v)return v;}catch(e){last=e}await delay(step);}throw Error('Timed out: '+label+(last?' ('+last.message+')':''));}

const MIME={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.json':'application/json','.webmanifest':'application/manifest+json'};

// In-page bridge appended to app.mjs (module scope: engine, state, screen,
// updateFlight, music and WispFlight are visible there).
const BRIDGE=`
;(()=>{const P=window.__perf;if(!P)return;
P.bridge=true;
Object.defineProperty(P,'engine',{get(){return engine},configurable:true});
Object.defineProperty(P,'screen',{get(){return screen},configurable:true});
Object.defineProperty(P,'state',{get(){return state},configurable:true});
const proto=WispFlight.prototype;
P.bake={terrain:0,terrainMs:0,terrainMax:0,props:0,propsMs:0,bg:0,bgMs:0};
P.views=new WeakSet();P.patchView=function(v){if(!v||P.views.has(v))return;P.views.add(v);const VP=Object.getPrototypeOf(v);
 if(!Object.hasOwn(VP,'__perfProto')){VP.__perfProto=true;
  const ti=VP.terrainImage;VP.terrainImage=function(...x){const n=this.terrainCache.size,had=this.__lastSets||0;const a=performance.now();const r=ti.apply(this,x);if((this.__sets||0)!==had){const ms=performance.now()-a;P.bake.terrain++;P.bake.terrainMs+=ms;if(ms>P.bake.terrainMax)P.bake.terrainMax=ms;this.__lastSets=this.__sets}return r};
  const bg=VP.drawCachedBackground;if(bg)VP.drawCachedBackground=function(...x){const a=performance.now();const r=bg.apply(this,x);if(this.backgroundRepainted){P.bake.bg++;P.bake.bgMs+=performance.now()-a}return r};
 }
 const tc=v.terrainCache;tc.set=function(k,val){v.__sets=(v.__sets||0)+1;return Map.prototype.set.call(this,k,val)};
 const sc=v.scenePropCache;if(sc)sc.set=function(k,val){P.bake.props++;return Map.prototype.set.call(this,k,val)};
};
const tick=proto.tick;proto.tick=function(t){if(this.pixiView&&!P.views.has(this.pixiView))P.patchView(this.pixiView);const a=performance.now(),d0=P.draws;try{return tick.call(this,t)}finally{const ms=performance.now()-a;P.ticks.push(a,ms,this.dying?2:this.paused?1:this.completing?3:0,P.draws-d0)}};
const render=proto.render;proto.render=function(...x){const a=performance.now();try{return render.apply(this,x)}finally{P.renders.push(a,performance.now()-a)}};
const stepF=proto.step;
proto.step=function(dt){
 const r=stepF.call(this,dt);
 try{
  if(P.autopilot&&this.running&&!this.dying&&!this.finished&&!this.completing)P.steer(this);
  if(P.keepAlive&&!P.allowDeath&&this.maxFlame)this.flame=Math.max(this.flame,this.maxFlame*.55);
  P.onStep?.(this,dt);
 }catch(e){P.errors.push('bridge:'+e.message)}
 return r};
const die=proto.beginDying;proto.beginDying=function(...x){if(P.keepAlive&&!P.allowDeath){P.deathsPrevented++;return}return die.apply(this,x)};
const hit=proto.hit;proto.hit=function(...x){if(P.keepAlive&&!P.allowDeath){P.hitsPrevented++;return}return hit.apply(this,x)};
const hud=updateFlight;updateFlight=function(...x){const a=performance.now();try{return hud.apply(this,x)}finally{P.hud.push(a,performance.now()-a)}};
P.steer=function(e){
 const wx=e.distance+e.player.x;let target=null,best=1e9;
 const em=e.layout?.embers||[];
 for(let i=0;i<em.length;i++){const p=em[i];if(p.collected||p.harmful||p.x<wx+4)continue;if(p.x>wx+240)break;if(p.x-wx<best){best=p.x-wx;target=p.y}}
 if(target==null){const ob=e.getNearbyObstacles?.()||[];for(const o of ob){if(o.destroyed)continue;if(o.x+o.width<wx-10)continue;if(o.x>wx+260)break;target=e.obstacleCenter(o);break}}
 if(target==null||!isFinite(target))target=e.height*.5;
 target=Math.max(40,Math.min(e.height-40,target));
 e.player.y+=(target-e.player.y)*.10;e.player.vy*=.5;
 P.steerClock=(P.steerClock||0)+1;
 if(P.lift&&P.steerClock%P.lift===0){try{e.beginLiftInput();e.endLiftInput()}catch{}}
};
P.scene=function(){const e=engine;if(!e)return{screen};const wx=e.distance+e.player.x;let vis=0;for(const p of e.layout?.embers||[]){if(!p.collected&&p.x>e.distance-20&&p.x<e.distance+e.width+20)vis++}
 return{screen,t:+(e.time||0).toFixed(2),distance:Math.round(e.distance),total:Math.round(e.totalDistance||0),terrain:e.terrain,level:e.levelIdentity?.id,y:Math.round(e.player.y),dying:!!e.dying,paused:!!e.paused,finished:!!e.finished,completing:!!e.completing,visiblePickups:vis,pickups:e.layout?.embers?.length,waves:e.luminanceWaves?.waves?.length||0,absorptions:e.absorptionEffects?.length||0,pickupEffects:e.pickupEffects?.length||0,particles:e.particles?.length||0,blackHole:e.blackHoles?.state?.active?+(e.blackHoles.rate||0).toFixed(2):0,collector:e.wisp?.phase,collectors:e.collectors?.length||0,boss:e.layout?.boss?.id||null,flash:!!e.forwardLight?.active,cardEvents:e.cardRowSequence||0,flame:Math.round(e.flame||0)}};
P.sceneTimer=setInterval(()=>{if(P.recording)P.scenes.push([performance.now(),P.scene()])},250);
P.refFlight=async function(seconds=20,biome='pinewood',course=0){
 const v=(new URL(import.meta.url)).search;const {BIOME_LEVELS}=await import('./biomes.mjs'+v);
 const level=BIOME_LEVELS.filter(l=>l.biomeId===biome)[course];
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:99999;background:#000';const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:100%;display:block';host.appendChild(canvas);document.body.appendChild(host);
 const e=new WispFlight({canvas,seed:'perf-reference',terrain:level.terrain,duration:90,node:{...level,id:'perf-reference',levelId:level.id,type:'flight',row:0,mapIndex:0,difficulty:1,duration:90,nextIds:[]},companions:['collector'],companionRole:'collector',cards:[],cardPilot:true,modifiers:{cardPilot:true},onUpdate:()=>{},onFinish:()=>{},onPause:()=>{}});
 P.refEngine=e;await e.ready;e.start();await new Promise(r=>setTimeout(r,800));
 const pr=(a,w)=>{const r=[];for(let i=0;i<a.length;i+=w)r.push(a.slice(i,i+w));return r};
 for(const k of ['raf','ticks','renders','longTasks'])P[k].length=0;for(const k in P.bake)P.bake[k]=0;const t0=performance.now();P.recording=true;
 await new Promise(r=>setTimeout(r,seconds*1000));P.recording=false;
 const out={level:level.id,raf:pr(P.raf,2).map(x=>x[1]),tick:pr(P.ticks,4).filter(x=>x[2]===0).map(x=>x[1]),render:pr(P.renders,2).map(x=>x[1]),lt:pr(P.longTasks,2).filter(x=>x[0]>=t0).map(x=>x[1]),dur:(performance.now()-t0)/1000,sim:e.time,dist:e.distance,bake:{...P.bake}};
 e.destroy();host.remove();P.refEngine=null;return out;
};
})();

`;

const INIT=`(()=>{
try{localStorage.clear();localStorage.setItem('emberwing-muted','true');${process.env.PERF_RECORD_PLAY?"localStorage.setItem('wispbound-record-play','on');":''}}catch{}
const P=window.__perf={raf:[],ticks:[],renders:[],hud:[],longTasks:[],heap:[],scenes:[],errors:[],marks:[],draws:0,counts:{},recording:false,keepAlive:true,allowDeath:false,autopilot:true,lift:60,deathsPrevented:0,hitsPrevented:0,mutations:0,rafCallbacks:0};
const raf=window.requestAnimationFrame.bind(window);
window.requestAnimationFrame=function(cb){P.rafCallbacks++;return raf(cb)};
let last=0;raf(function f(t){if(P.recording){if(last)P.raf.push(t,t-last)}last=t;raf(f)});
try{new PerformanceObserver(l=>{for(const e of l.getEntries())P.longTasks.push(e.startTime,e.duration)}).observe({type:'longtask',buffered:true})}catch{}
setInterval(()=>{if(P.recording&&performance.memory)P.heap.push(performance.now(),performance.memory.usedJSHeapSize)},250);
addEventListener('error',e=>P.errors.push(String(e.message)));addEventListener('unhandledrejection',e=>P.errors.push(String(e.reason)));
document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(l=>{if(P.recording)P.mutations+=l.length}).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true})});
if(new URLSearchParams(location.search).get('perfcount')==='1'){
 const C=CanvasRenderingContext2D.prototype,O=typeof OffscreenCanvasRenderingContext2D!=='undefined'?OffscreenCanvasRenderingContext2D.prototype:null;
 const draw=['drawImage','fillRect','strokeRect','fill','stroke','fillText','strokeText','putImageData','clearRect'];
 const other=['getImageData','createLinearGradient','createRadialGradient','createPattern','save','beginPath','arc','setTransform','clip','measureText'];
 for(const proto of [C,O].filter(Boolean)){
  for(const k of draw){const f=proto[k];if(!f)continue;proto[k]=function(){P.draws++;P.counts[k]=(P.counts[k]||0)+1;return f.apply(this,arguments)}}
  for(const k of other){const f=proto[k];if(!f)continue;proto[k]=function(){P.counts[k]=(P.counts[k]||0)+1;return f.apply(this,arguments)}}
  for(const k of ['filter','shadowBlur','globalCompositeOperation']){const d=Object.getOwnPropertyDescriptor(proto,k);if(!d)continue;Object.defineProperty(proto,k,{get:d.get,set(v){if(k!=='shadowBlur'||v)P.counts['set_'+k]=(P.counts['set_'+k]||0)+1;if(k==='filter'&&v&&v!=='none')P.counts.filterOn=(P.counts.filterOn||0)+1;d.set.call(this,v)},configurable:true})}
 }
 const ce=Document.prototype.createElement;Document.prototype.createElement=function(n){if(String(n).toLowerCase()==='canvas'){P.counts.canvasCreated=(P.counts.canvasCreated||0)+1}return ce.apply(this,arguments)};
 const wd=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width');Object.defineProperty(HTMLCanvasElement.prototype,'width',{get:wd.get,set(v){P.counts.canvasResize=(P.counts.canvasResize||0)+1;wd.set.call(this,v)},configurable:true});
}
})();`;

// Patch the boundary inspector (served copy) to mount cards and accept
// guardian / giant black hole / lantern theme / late-run query switches.
const CARD_SETS={plain:[],heavy:['rhythm','spillway-ii','harvest-legendary','ripple-glass','twin-orbit'],maxRow:['echo','spillway-ii','refrain','chameleon','first-ripple'],collectorRow:['cache-handling','cast-line','ripple-glass','courier-tip','body-spark'],chain:['echo-iii','refrain','spillway-ii','prism-lens-ii','first-ripple'],twin:['twin-orbit','cast-line','echo-iii','spillway-ii','refrain']};
function patchInspector(src){
 const version=src.match(/['"]\.\/model\.mjs(\?[^'"]*)?['"]/)?.[1]||'';
 let s=`import {makeSkillCard as __mk} from './skill-cards.mjs${version}';\n`+src;
 s=s.replace("createRun(state.profile,storm?query.get('seed')||'shepherd-study':'in-game-boundary-study',1)","createRun(state.profile,query.get('seed')||'perf-fixed-seed',1,{cards:true})");
 s=s.replace("createRun(state.profile,'in-game-boundary-study',1)","createRun(state.profile,query.get('seed')||'perf-fixed-seed',1,{cards:true})");
 s=s.replace(/return state;\s*\}/,`{const q=query,sets=${JSON.stringify(CARD_SETS)};run.cardSlots=5;run.mountedCards=(sets[q.get('cardset')||'plain']||[]).map((id,i)=>__mk(id,'perf:'+i));while(run.mountedCards.length<run.cardSlots)run.mountedCards.push(null);
 if(q.get('ins')){const ins=q.get('ins').split(',');run.slotInscriptions=run.mountedCards.map((_,i)=>ins[i]?{id:ins[i]}:null);}
 const n=run.map[0][0];if(q.get('guardian')){Object.assign(n,{name:'Guardian',boss:true,bossId:q.get('guardian'),row:6,type:'finale'});}
 if(q.get('giant')==='1'){n.blackHoleEncounter='giant';n.row=3;n.mapIndex=1;}
 if(q.get('theme'))n.mapTheme=q.get('theme');
 if(q.get('late')==='1'){n.difficulty=3;n.row=4;}}
 return state;}`);
 return s;
}

export async function startServer(root,port=0,{noCache=false}={}){
 root=path.resolve(root);
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');let name=decodeURIComponent(url.pathname.slice(1))||'index.html';
  const file=path.resolve(root,name);if(!file.startsWith(root))throw Error('outside');
  let data=await fs.readFile(file);
  if(name==='app.mjs')data=Buffer.from(data.toString()+BRIDGE);
  else if(name==='boundary-run-inspector.mjs')data=Buffer.from(patchInspector(data.toString()));
  else if(name==='worker.js'||name==='sw.js'){data=Buffer.from('// service worker disabled by perf harness');}
  const headers={'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':noCache?'no-store':'max-age=3600'};
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(range){const a=+range[1],b=range[2]?Math.min(+range[2],data.length-1):data.length-1;res.writeHead(206,{...headers,'Content-Range':`bytes ${a}-${b}/${data.length}`,'Content-Length':b-a+1}).end(data.subarray(a,b+1));}
  else res.writeHead(200,headers).end(data);
 }catch(e){res.writeHead(404).end(String(e))}});
 await new Promise(r=>server.listen(port,'127.0.0.1',r));
 return {server,base:'http://127.0.0.1:'+server.address().port,close:()=>server.close()};
}

export const PHONE={width:915,height:412,deviceScaleFactor:2.625,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}};

export async function launch({headed=false,extra=[]}={}){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'orbix-perf-'));
 const args=[headed?null:'--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'--mute-audio','--enable-precise-memory-info','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--js-flags=--expose-gc',...extra,'about:blank'].filter(Boolean);
 const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',args,{windowsHide:true,stdio:'ignore'});
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome',30000);
 const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page',30000);
 const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[],console_=[];
 socket.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){const[res,rej]=pending.get(m.id);pending.delete(m.id);m.error?rej(Error(m.error.message)):res(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const send=(method,params={})=>new Promise((res,rej)=>{const id=++serial;pending.set(id,[res,rej]);socket.send(JSON.stringify({id,method,params}))});
 const ev=async(expr,timeout=120000)=>{const r=await Promise.race([send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true}),delay(timeout).then(()=>{throw Error('evaluate timeout: '+expr.slice(0,80))})]);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 await send('Page.enable');await send('Runtime.enable');await send('Performance.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:INIT});
 const click=async(selector,{optional=false}={})=>{const p=await ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});if(!e)return null;e.scrollIntoView?.({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);if(!p){if(optional)return false;throw Error('Missing '+selector)}for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1});return true};
 const tapSel=async(selector)=>{const p=await ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].reverse().find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);if(!p)return false;await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});await delay(40);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return true};
 const tap=async(x,y)=>{await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};
 const drag=async(x0,y0,x1,y1,steps=12,ms=16)=>{await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0,id:1}]});for(let i=1;i<=steps;i++){await delay(ms);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/steps,y:y0+(y1-y0)*i/steps,id:1}]})}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};
 const metrics=async()=>Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const shot=async file=>fs.writeFile(file,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 return {rawSocket:socket,send,ev,click,tapSel,tap,drag,metrics,shot,errors,profile,close:async()=>{try{socket.close()}catch{}browser.kill();await delay(300);fs.rm(profile,{recursive:true,force:true}).catch(()=>{})}};
}

export async function emulatePhone(b,{throttle=4,phone=PHONE}={}){
 await b.send('Emulation.setDeviceMetricsOverride',phone);
 await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await b.send('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',platform:'Linux armv8l'});
 await b.send('Emulation.setCPUThrottlingRate',{rate:throttle});
}

export function stats(values){const a=Float64Array.from(values).sort(),n=a.length,p=f=>n?a[Math.min(n-1,Math.floor(n*f))]:0;let sum=0;for(const v of a)sum+=v;
 return {n,mean:n?sum/n:0,p50:p(.5),p95:p(.95),p99:p(.99),max:n?a[n-1]:0,over16_7:a.filter(v=>v>16.7).length,over33:a.filter(v=>v>33.4).length,over50:a.filter(v=>v>50).length};}

export function profileSummary(profile,filter){
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of nodes.values())for(const id of n.children||[])parents.set(id,n.id);
 const key=n=>`${n.callFrame.functionName||'(anonymous)'} ${path.basename(n.callFrame.url||'')}:${n.callFrame.lineNumber+1}`;
 const self=new Map(),incl=new Map(),files=new Map();let total=0;
 for(let i=0;i<profile.samples.length;i++){const us=profile.timeDeltas[i]||0;let id=profile.samples[i];const n=nodes.get(id);total+=us;
  const k=key(n);self.set(k,(self.get(k)||0)+us);const f=path.basename(n.callFrame.url||'')||n.callFrame.functionName;files.set(f,(files.get(f)||0)+us);
  const seen=new Set();while(id){const m=nodes.get(id),kk=key(m);if(!seen.has(kk)){seen.add(kk);incl.set(kk,(incl.get(kk)||0)+us)}id=parents.get(id)}}
 const rows=(m,k=40)=>[...m].map(([name,us])=>({name,ms:+(us/1000).toFixed(1),pct:+(us/total*100).toFixed(2)})).sort((a,b)=>b.ms-a.ms).slice(0,k);
 return {totalMs:+(total/1000).toFixed(1),self:rows(self),inclusive:rows(incl,60),byFile:rows(files,30)};
}
