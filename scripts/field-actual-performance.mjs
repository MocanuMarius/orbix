// Local full-App/HUD/audio/Pixi benchmark. Chrome mobile emulation is not a physical phone.
// Baseline overrides only the three files captured before the Field change.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return [k,v.join('=')||true]}));
const out=path.resolve('work/field-perf-proof'),root=path.resolve('dist');
await fs.mkdir(out,{recursive:true});
const scenarios={noField:[],singleField:['field-impulse'],twoFields:['field-impulse','field-impulse'],chameleonField:['chameleon','field-impulse'],waveLoom:['field-impulse','wave-loom']};
const metrics=['step','render','tick','notify','hud','music','audio','swipe'];
const init=`localStorage.clear();localStorage.setItem('emberwing-muted','false');window.__fieldPage={gaps:[],longTasks:[],errors:[]};let __lastFrame=0;requestAnimationFrame(function frame(t){if(__lastFrame)window.__fieldPage.gaps.push({at:t,ms:t-__lastFrame});__lastFrame=t;requestAnimationFrame(frame)});try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__fieldPage.longTasks.push({at:e.startTime,ms:e.duration})}).observe({type:'longtask',buffered:true})}catch{}addEventListener('error',e=>window.__fieldPage.errors.push(e.message));`;
const bridge=`
const __fieldMetrics=Object.fromEntries(${JSON.stringify(metrics)}.map(k=>[k,[]]));
const __fieldTime=(key,fn,self,args)=>{const at=performance.now();try{return fn.apply(self,args)}finally{__fieldMetrics[key].push({at,ms:performance.now()-at})}};
const __fieldHud=updateFlight;updateFlight=function(...args){return __fieldTime('hud',__fieldHud,this,args)};
const __fieldMusic=music.setFlight;music.setFlight=function(...args){return __fieldTime('music',__fieldMusic,this,args)};
for(const key of ['step','render','tick','notify','sound','activateFieldImpulse']){const original=WispFlight.prototype[key];WispFlight.prototype[key]=function(...args){return __fieldTime(key==='sound'?'audio':key==='activateFieldImpulse'?'swipe':key,original,this,args)}}
window.__fieldBench={get engine(){return engine},metrics:__fieldMetrics,async prepare(){await engine.ready;await document.fonts.ready;engine.distance=engine.previousDistance=0;engine.player.y=engine.previousPlayerY=engine.height*.5;engine.player.vy=0;for(let i=0;i<45;i++)await new Promise(r=>requestAnimationFrame(()=>{engine.render();r()}));return {seed:engine.seed,renderer:engine.pixiView?.constructor.name,width:engine.width,height:engine.height,camera:engine.distance,slots:state.run.mountedCards.map(c=>c?.cardId),sources:engine.mod.cardFieldSources,music:music.enabled}},snapshot(){return {time:engine?.time,distance:engine?.distance,y:engine?.player.y,dying:engine?.dying,field:engine?.fieldImpulse,sequence:engine?.activationEvents.sequence,waves:engine?.luminanceWaves.waves.length,phase:engine?.paused?'paused':'active',hidden:document.hidden}}};
`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),[,build,...parts]=url.pathname.split('/'),name=parts.join('/'),file=path.resolve(root,name);
 if(!['baseline','candidate'].includes(build)||!file.startsWith(root+path.sep))throw Error('Bad path');
 let data=await fs.readFile(build==='baseline'&&['flight.mjs','collector-impulse.mjs','skill-cards.mjs'].includes(name)?path.resolve(out,'baseline',name):file);
 if(name==='app.mjs')data=Buffer.from(data.toString()+bridge);
 if(name==='boundary-run-inspector.mjs'){
  let source=data.toString().replace("createRun(state.profile,'in-game-boundary-study',1)","createRun(state.profile,'field-perf-same-seed',1,{cards:true})");
  source="import {makeSkillCard} from './skill-cards.mjs?v=skills-cards-3';\n"+source;
  source=source.replace('return state;',`run.mountedCards=${JSON.stringify(scenarios[url.searchParams.get('scenario')]||[])}.map((id,i)=>makeSkillCard(id,'perf:'+i));while(run.mountedCards.length<3)run.mountedCards.push(null);return state;`);
  // Module query strings do not carry the page scenario; obtain it in the page itself.
  source=source.replace(/run\.mountedCards=\[.*?\]\.map\(\(id,i\)=>makeSkillCard\(id,'perf:'\+i\)\);/,`run.mountedCards=(${JSON.stringify(scenarios)}[new URLSearchParams(location.search).get('scenario')]||[]).map((id,i)=>makeSkillCard(id,'perf:'+i));`);
  data=Buffer.from(source);
 }
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||''),headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'};
 if(range){const start=+range[1],end=range[2]?Math.min(+range[2],data.length-1):data.length-1;res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1}).end(data.subarray(start,end+1));}
 else res.writeHead(200,headers).end(data);
}catch(e){res.writeHead(404).end(String(e))}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const stats=values=>{const a=values.toSorted((a,b)=>a-b),p=f=>a[Math.min(a.length-1,Math.floor(a.length*f))]||0;return {n:a.length,mean:a.reduce((s,n)=>s+n,0)/Math.max(1,a.length),p50:p(.5),p95:p(.95),p99:p(.99),max:a.at(-1)||0,over50:a.filter(n=>n>50).length,over100:a.filter(n=>n>100).length}};
const b=await chrome(['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']);
const {ev,send}=b,results=[];
try{
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:init});
 const click=async selector=>{const p=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1});};
 for(let repeat=0;repeat<Number(args.repeats||3);repeat++)for(const scenario of String(args.scenarios||Object.keys(scenarios)).split(','))for(const build of String(args.builds||'baseline,candidate').split(',')){
  const errorStart=b.errors.length;
  await b.visit(`${base}/${build}/game.html?mock=boundary&cards=1&biome=pinewood&course=1&scenario=${scenario}`);
  await until(()=>ev('!!window.__fieldBench?.engine&&!!document.querySelector("[data-action=wake-flight]")'),'actual flight');
  const fixture=await ev('window.__fieldBench.prepare()');assert.equal(fixture.renderer,'WispFlightView');
  await click('[data-action=wake-flight]');
  await until(()=>ev('window.__fieldBench.engine?.running&&!window.__fieldBench.engine.paused'),'active');
  await click('#flap-btn');
  await ev('new Promise(r=>{function wait(){if(window.__fieldBench.engine.time>=.55)r();else requestAnimationFrame(wait)}wait()})');
  const before=await ev('window.__fieldBench.snapshot()'),begin=await ev('performance.now()');
  if(scenario!=='noField'){
   const p=await ev('(()=>{const r=document.querySelector(".canvas-wrap").getBoundingClientRect();return {x:r.x+r.width*.5,y:r.y+r.height*.55,dx:Math.min(85,r.width*.15)}})()');
   await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,radiusX:2,radiusY:2,force:1,id:1}]});
   for(let i=1;i<=4;i++){await delay(16);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+p.dx*i/4,y:p.y,radiusX:2,radiusY:2,force:1,id:1}]});}
   await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await delay(850);
  const end=await ev('performance.now()'),raw=await ev('({metrics:window.__fieldBench.metrics,page:window.__fieldPage,end:window.__fieldBench.snapshot(),userAgent:navigator.userAgent,dpr:devicePixelRatio,width:innerWidth,height:innerHeight})');
  assert.equal(raw.end.hidden,false);assert.equal(raw.end.dying,false,'fixture must survive measurement');
  const swipe=raw.metrics.swipe.filter(s=>s.at>=begin&&s.at<=end);
  assert.equal(swipe.length,scenario==='noField'?0:1,'real pointer swipe accepted exactly once');
  if(scenario!=='noField')assert.equal(raw.end.field.direction,'right');
  const frames=raw.metrics.render.filter(s=>s.at>=begin&&s.at<=end);
  const summary={repeat,build,scenario,fixture,before,end:raw.end,windowMs:end-begin,frameMs:stats(frames.slice(1).map((s,i)=>s.at-frames[i].at)),rafMs:stats(raw.page.gaps.filter(s=>s.at>=begin&&s.at<=end).map(s=>s.ms)),cpuMs:Object.fromEntries(metrics.map(k=>[k,stats(raw.metrics[k].filter(s=>s.at>=begin&&s.at<=end).map(s=>s.ms))])),longTasks:raw.page.longTasks.filter(s=>s.at>=begin&&s.at<=end),errors:[...raw.page.errors,...b.errors.slice(errorStart)]};
  assert.equal(summary.errors.length,0);
  await fs.writeFile(path.join(out,`${build}-${scenario}-${repeat}.json`),JSON.stringify({summary,begin,end,raw},null,2));
  if(repeat===0)await b.shot(path.join(out,`${build}-${scenario}.png`));
  results.push(summary);console.log(JSON.stringify(summary));
 }
 await fs.writeFile(path.join(out,'suite.json'),JSON.stringify(results,null,2));
 const aggregate=[];for(const scenario of Object.keys(scenarios))for(const build of ['baseline','candidate']){const rows=results.filter(r=>r.scenario===scenario&&r.build===build);if(!rows.length)continue;aggregate.push({scenario,build,repeats:rows.length,frameP50:stats(rows.map(r=>r.frameMs.p50)).p50,frameP95:stats(rows.map(r=>r.frameMs.p95)).p50,frameP99:stats(rows.map(r=>r.frameMs.p99)).p50,rafP50:stats(rows.map(r=>r.rafMs.p50)).p50,rafP95:stats(rows.map(r=>r.rafMs.p95)).p50,rafP99:stats(rows.map(r=>r.rafMs.p99)).p50,stallsOver50:rows.reduce((s,r)=>s+r.frameMs.over50,0),notifyPerWindow:rows.map(r=>r.cpuMs.notify.n),swipeCpuMedian:stats(rows.map(r=>r.cpuMs.swipe.mean)).p50,cpu:Object.fromEntries(metrics.map(k=>[k,{mean:stats(rows.map(r=>r.cpuMs[k].mean)).p50,p95:stats(rows.map(r=>r.cpuMs[k].p95)).p50,p99:stats(rows.map(r=>r.cpuMs[k].p99)).p50}]))});}
 await fs.writeFile(path.join(out,'summary.json'),JSON.stringify({at:new Date().toISOString(),method:'Matched real App/HUD/audio/Pixi, local before-handler overrides, 45 paused render warmups, fixed seed/camera, one normal Lift then real touch right swipe, 844x390 DPR1 Chrome mobile emulation; browser output muted, game audio enabled. No physical Pixel 10 claim.',aggregate},null,2));
}finally{b.close();server.close();}
