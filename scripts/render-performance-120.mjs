// Local-only full-App/HUD/music/FX measurement; browser output stays muted.
// node scripts/render-performance-120.mjs --seconds=8 --scenarios=maxRow
// node scripts/render-performance-120.mjs --baseline-ref=8f87530 --builds=baseline,current --cadences=normal --seconds=6
// --cadences=uncapped tests throughput, not physical display FPS.
// --width=740 --height=333 --dpr=3 is desktop emulation, not a phone.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chrome,until,delay} from './browser-probe.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const root=path.resolve('dist'),out=path.resolve(args.out||'work/perf120'),git=promisify(execFile);
await fs.mkdir(out,{recursive:true});
const baselineFiles=new Map();let baselineCommit=null;
if(args['baseline-ref']){
 baselineCommit=(await git('git',['rev-parse','--verify',args['baseline-ref']+'^{commit}'])).stdout.trim();
 const changed=(await git('git',['diff','--no-renames','--name-status',baselineCommit,'--','dist'])).stdout.trim().split(/\r?\n/).filter(Boolean);
 for(const line of changed){const [status,file]=line.split('\t');
  if(status!=='M'||!file.startsWith('dist/')||file.slice(5).includes('/'))throw Error('Baseline ref supports modified top-level source files with identical nested assets only; use --baseline=<complete dist tree> for '+line);
  baselineFiles.set(file.slice(5),Buffer.from((await git('git',['show',baselineCommit+':'+file],{encoding:'buffer',maxBuffer:16*1024*1024})).stdout));
 }
}
if(String(args.builds||'current').includes('baseline')&&!args.baseline&&!baselineCommit)throw Error('Baseline requires --baseline-ref=<commit> or --baseline=<dist-directory>.');
const scenarios={plain:[],fieldWave:['field-impulse','wave-loom'],maxRow:['echo','field-impulse','wave-loom','refrain','chameleon'],collectorRow:['cache-handling','field-impulse','wave-loom','courier-tip','body-spark']};
const timings=['step','render','tick','notify','hud','music','audio','swipe'];
const init=`localStorage.clear();localStorage.setItem('emberwing-muted','false');window.__page120={gaps:[],longTasks:[],errors:[]};let last=0;requestAnimationFrame(function frame(t){if(last)__page120.gaps.push({at:performance.now(),rafAt:t,ms:t-last});last=t;requestAnimationFrame(frame)});try{new PerformanceObserver(l=>{for(const e of l.getEntries())__page120.longTasks.push({at:e.startTime,ms:e.duration})}).observe({type:'longtask',buffered:true})}catch{}addEventListener('error',e=>__page120.errors.push(e.message));addEventListener('unhandledrejection',e=>__page120.errors.push(String(e.reason)));`;
const bridge=`
const __m120=Object.fromEntries(${JSON.stringify(timings)}.map(k=>[k,[]]));
const __time120=(key,fn,self,args)=>{const at=performance.now(),phase=!engine?screen:engine.finished?'finished':engine.paused?'paused':engine.dying?'dying':engine.completing?'completing':'active';try{return fn.apply(self,args)}finally{__m120[key].push({at,ms:performance.now()-at,phase,active:phase==='active'})}};
const __hud120=updateFlight;updateFlight=function(...args){return __time120('hud',__hud120,this,args)};
const __music120=music.setFlight;music.setFlight=function(...args){return __time120('music',__music120,this,args)};
for(const key of ['step','render','tick','notify','sound','activateFieldImpulse']){const original=WispFlight.prototype[key];WispFlight.prototype[key]=function(...args){return __time120(key==='sound'?'audio':key==='activateFieldImpulse'?'swipe':key,original,this,args)}}
window.__bench120={get engine(){return engine},metrics:__m120,async prepare(){await engine.ready;await document.fonts.ready;engine.distance=engine.previousDistance=Number(new URLSearchParams(location.search).get('distance'))||0;engine.player.y=engine.previousPlayerY=engine.height*.5;engine.player.vy=0;for(let i=0;i<30;i++)await new Promise(r=>requestAnimationFrame(()=>{engine.render();r()}));return {seed:engine.seed,renderer:engine.pixiView?.constructor.name,rendererDataset:engine.pixiView?.canvas?.dataset.renderer,contextType:engine.pixiView?.context?.constructor.name,world:[engine.width,engine.height],buffer:[engine.pixiView?.buffer.width,engine.pixiView?.buffer.height],output:[engine.pixiView?.canvas.width,engine.pixiView?.canvas.height],slots:state.run.mountedCards.map(c=>c?.cardId),music:music.enabled}},snapshot(){return {at:performance.now(),time:engine?.time,distance:engine?.distance,y:engine?.player.y,vy:engine?.player.vy,height:engine?.height,dying:engine?.dying,finished:engine?.finished,waves:engine?.luminanceWaves.waves.length,blackHoles:engine?.blackHoles.items.length,captureEffects:engine?.absorptionEffects.length,collectorPickups:engine?.collectorPickups,field:engine?.fieldImpulse,phase:engine?.paused?'paused':engine?.dying?'dying':'active',hidden:document.hidden,near:engine?.getNearbyObstacles().filter(o=>o.x+o.width>engine.distance+engine.player.x-15&&o.x<engine.distance+engine.player.x+200).slice(0,3).map(o=>({x:o.x-engine.distance-engine.player.x,width:o.width,center:engine.obstacleCenter(o),gap:o.gap}))}}};
`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),[,build,...parts]=url.pathname.split('/'),name=parts.join('/'),file=path.resolve(root,name);
 if(!['baseline','current'].includes(build)||!file.startsWith(root+path.sep))throw Error('Bad path');
 let data=build==='baseline'&&baselineFiles.has(name)?baselineFiles.get(name):await fs.readFile(build==='baseline'&&args.baseline?path.resolve(args.baseline,name):file);
 if(name==='app.mjs')data=Buffer.from(data.toString()+bridge+`\nconst __baseSnapshot120=__bench120.snapshot;__bench120.snapshot=()=>({...__baseSnapshot120(),phase:!engine?screen:engine.finished?'finished':engine.paused?'paused':engine.dying?'dying':engine.completing?'completing':'active',completing:engine?.completing,screen,blackHoleRate:engine?.blackHoles.rate,timeScale:engine?.blackHoles.timeScale,cardExecutions:engine?.cardExecutions,rowEvents:engine?.cardRowSequence,rowOperations:engine?.cardExecution?.executions,collectorPhase:engine?.wisp.phase,collectorCarrying:!!engine?.wisp.cargo,bodyPickups:engine?.bodyPickups,collectorPickups:engine?.collectorPickups,flame:engine?.flame,deathCause:engine?.deathCause});`);
 if(name==='boundary-run-inspector.mjs'){
  const version=data.toString().match(/['"]\.\/model\.mjs(\?[^'"]*)?['"]/)?.[1]||'';
  let source=`import {makeSkillCard} from './skill-cards.mjs${version}';\n`+data.toString().replace("createRun(state.profile,'in-game-boundary-study',1)","createRun(state.profile,'perf120-same-seed',1,{cards:true})");
  source=source.replace('return state;',`run.cardSlots=5;run.mountedCards=(${JSON.stringify(scenarios)}[new URLSearchParams(location.search).get('scenario')]||[]).map((id,i)=>makeSkillCard(id,'perf:'+i));while(run.mountedCards.length<run.cardSlots)run.mountedCards.push(null);return state;`);
  if(args.late)source=source.replace('difficulty:1,duration:90','difficulty:3,duration:90').replace("row:0,mapIndex:0","row:4,mapIndex:0");data=Buffer.from(source);
 }
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||''),headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'};
 if(range){const start=+range[1],end=range[2]?Math.min(+range[2],data.length-1):data.length-1;res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1}).end(data.subarray(start,end+1));}
 else res.writeHead(200,headers).end(data);
}catch(e){res.writeHead(404).end(String(e))}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const stats=values=>{const a=values.toSorted((a,b)=>a-b),p=f=>a[Math.min(a.length-1,Math.floor(a.length*f))]||0;return {n:a.length,mean:a.reduce((s,n)=>s+n,0)/Math.max(1,a.length),p50:p(.5),p95:p(.95),p99:p(.99),max:a.at(-1)||0,over8_34:a.filter(n=>n>8.34).length,over16_7:a.filter(n=>n>16.7).length,over50:a.filter(n=>n>50).length}};
function profileSummary(profile){
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of nodes.values())for(const id of n.children||[])parents.set(id,n.id);
 const self=new Map(),inclusive=new Map();let total=0;
 for(let i=0;i<profile.samples.length;i++){let id=profile.samples[i],us=profile.timeDeltas[i];total+=us;self.set(id,(self.get(id)||0)+us);while(id){inclusive.set(id,(inclusive.get(id)||0)+us);id=parents.get(id)}}
 const rows=counts=>[...counts].map(([id,us])=>({name:nodes.get(id)?.callFrame.functionName||'(anonymous)',url:nodes.get(id)?.callFrame.url,line:(nodes.get(id)?.callFrame.lineNumber??-1)+1,ms:us/1000,percent:us/total*100})).sort((a,b)=>b.ms-a.ms).slice(0,50);
 return {durationMs:(profile.endTime-profile.startTime)/1000,samples:profile.samples.length,self:rows(self),inclusive:rows(inclusive)};
}
const results=[];
try{
 for(const cadence of String(args.cadences||'normal').split(',')){
 const b=await chrome(['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding',...(cadence==='uncapped'?['--disable-frame-rate-limit','--disable-gpu-vsync']:[])]);
 try{
 const{send,ev}=b;
 await send('Emulation.setDeviceMetricsOverride',{width:Number(args.width)||900,height:Number(args.height)||405,deviceScaleFactor:Number(args.dpr)||1,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:init});
 let host={unavailable:true};
 try{const target=await send('Target.getTargetInfo');host.target=target;}catch{}
 const click=async selector=>{const p=await ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getBoundingClientRect().width>0);if(!e)throw Error('Missing visible '+${JSON.stringify(selector)}+' in '+document.body.innerText);const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1});};
 for(const scenario of String(args.scenarios||'plain,fieldWave,maxRow').split(','))for(const build of String(args.builds||'current').split(',')){
 const label=`${args.label||'baseline'}-${cadence}-${build}-${scenario}-${args.width||900}x${args.height||405}-dpr${args.dpr||1}`,errorStart=b.errors.length;
 await b.visit(`${base}/${build}/game.html?mock=boundary&cards=1&biome=${args.biome||'pinewood'}&course=1&scenario=${scenario}&distance=${args.distance||0}${args.perf?'&perf=1':''}${args.scenery?'&scenery='+args.scenery:''}`);
 await until(()=>ev('!!window.__bench120?.engine&&!!document.querySelector("[data-action=wake-flight]")'),'actual flight',200);
 const firstFlightReadyMs=await ev('performance.now()'),fixture=await ev('__bench120.prepare()');
 const placement=await ev(`(()=>{const e=__bench120.engine,mode=${JSON.stringify(args.distance||args.lifecycle||'entrance')};let target=null;if(mode==='hole'){target=e.blackHoles.items[0];if(target){e.distance=target.x-e.player.x-110;e.player.y=target.y+(target.y<e.height*.5?48:-48);}}else if(mode==='collect'){target=e.layout.embers.find(p=>p.fuel&&p.x>1200&&p.y>e.height*.25&&p.y<e.height*.75);if(target){e.distance=target.x-e.player.x+36;e.player.y=target.y+24;}}else if(mode==='clear'){e.distance=e.totalDistance-260;e.player.y=e.height*.5;}else if(mode==='death'){e.distance=0;e.player.y=e.height-e.player.radius*2;}e.previousDistance=e.distance;e.previousPlayerY=e.player.y;e.player.vy=0;e.render();e.notify();return {mode,target:target?{x:target.x,y:target.y,id:target.id}:null,distance:e.distance,y:e.player.y,totalDistance:e.totalDistance}})()`);
 const graphics=await ev(`(()=>{const c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return {webgl:false};const d=g.getExtension('WEBGL_debug_renderer_info');return {webgl:true,renderer:g.getParameter(g.RENDERER),vendor:g.getParameter(g.VENDOR),unmaskedRenderer:d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):null,unmaskedVendor:d?g.getParameter(d.UNMASKED_VENDOR_WEBGL):null,timerQuery:!!g.getExtension('EXT_disjoint_timer_query_webgl2')}})()`);
 await b.shot(path.join(out,label+'-before.png'));
 if(args.profile){await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});await send('Profiler.start');}
 await click('[data-action=wake-flight]');await until(()=>ev('__bench120.engine.running&&!__bench120.engine.paused'),'active',100);
 if(args.lifecycle!=='death'&&placement.mode!=='collect'&&placement.y>215*.65)await click('#flap-btn');
 const before=await ev('__bench120.snapshot()'),begin=await ev('performance.now()');
 const inputs=[],states=[],sessionEvents=[];let lastFlap=begin,lastSwipe=begin,pauseDone=false;const wallEnd=Date.now()+(Number(args.sessionSeconds||args.seconds)||4)*1000;
 while(Date.now()<wallEnd){
  const s=await ev('__bench120.snapshot()');states.push(s);
  if(args.pauseAt&&!pauseDone&&s.at-begin>Number(args.pauseAt)*1000&&!s.dying){
   pauseDone=true;sessionEvents.push({at:s.at,kind:'pause'});await click('[data-action=menu]');await delay(300);await click('[data-action=resume]');
   await until(()=>ev('__bench120.engine&&!__bench120.engine.paused'),'resume countdown',100);sessionEvents.push({at:await ev('performance.now()'),kind:'resume-start'});continue;
  }
  if(args.sessionSeconds&&s.phase==='death'){
   sessionEvents.push({at:s.at,kind:'natural-death'});await delay(2200);await click('[data-action=death-continue]');await delay(350);
   let action=await ev('document.querySelector("[data-action=retry]")?"retry":document.querySelector("[data-route-state=next]")?"route":null');
   if(action==='retry')await click('[data-action=retry]');
   else if(action==='route'){await click('[data-route-state=next]');await delay(200);await click('[data-action=node]');}
   else{sessionEvents.push({at:await ev('performance.now()'),kind:'no-next-flight',screen:await ev('document.body.dataset.screen')});break;}
   await until(()=>ev('!!document.querySelector("[data-action=wake-flight]")'),'retry entry',100);await click('[data-action=wake-flight]');await click('#flap-btn');
   sessionEvents.push({at:await ev('performance.now()'),kind:'retry-start'});lastFlap=lastSwipe=await ev('performance.now()');continue;
  }
  if(args.sessionSeconds?!!s.finished:args.lifecycle?s.finished||!s.near:s.dying||s.finished)break;
  if(!s.near){await delay(90);continue;}
  if(args.lifecycle==='death'||s.phase==='dying'||s.completing){await delay(90);continue;}
  const next=s.near.find(o=>o.x<145&&o.x+o.width>0),target=next?.center??s.height*.52;
  if(s.y>target&&s.vy>0&&s.at-lastFlap>350){await click('#flap-btn');inputs.push({at:s.at-begin,kind:'lift',y:s.y,target});lastFlap=s.at;}
  if(scenario!=='plain'&&s.at-lastSwipe>1400){
   const p=await ev('(()=>{const r=document.querySelector(".canvas-wrap").getBoundingClientRect();return {x:r.x+r.width*.4,y:r.y+r.height*.55,dx:Math.min(85,r.width*.15)}})()');
   await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});
   for(let i=1;i<=4;i++){await delay(16);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+p.dx*i/4,y:p.y,id:1}]});}
   await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});inputs.push({at:s.at-begin,kind:'field-swipe'});lastSwipe=s.at;
  }
  await delay(90);
 }
 const end=await ev('performance.now()');let profile;
 if(args.profile){profile=(await send('Profiler.stop')).profile;await fs.writeFile(path.join(out,label+'.cpuprofile'),JSON.stringify(profile));}
 const raw=await ev('({metrics:__bench120.metrics,page:__page120,end:__bench120.snapshot(),screen:document.body.dataset.screen,bodyText:document.body.innerText,navigation:performance.getEntriesByType("navigation").map(e=>e.toJSON()),serviceWorker:!!navigator.serviceWorker?.controller,userAgent:navigator.userAgent,dpr:devicePixelRatio,width:innerWidth,height:innerHeight,concurrency:navigator.hardwareConcurrency})');
 const frames=raw.metrics.render.filter(s=>s.at>=begin&&s.at<=end&&s.active),gaps=frames.slice(1).map((s,i)=>s.at-frames[i].at);
 const summary={label,cadence,build,scenario,fixture,placement,before,end:raw.end,screen:raw.screen,windowMs:end-begin,renderedFrames:frames.length,paintCallsPerSecond:frames.length/(end-begin)*1000,frameMs:stats(gaps),rafMs:stats(raw.page.gaps.filter(s=>s.at>=begin&&s.at<=end).map(s=>s.ms)),cpuMs:Object.fromEntries(timings.map(k=>[k,stats(raw.metrics[k].filter(s=>s.at>=begin&&s.at<=end&&s.active).map(s=>s.ms))])),lifecycleCpuMs:args.lifecycle?Object.fromEntries(timings.map(k=>[k,stats(raw.metrics[k].filter(s=>s.at>=begin&&s.at<=end).map(s=>s.ms))])):null,longTasks:raw.page.longTasks.filter(s=>s.at>=begin&&s.at<=end),errors:[...raw.page.errors,...b.errors.slice(errorStart)],graphics,environment:{userAgent:raw.userAgent,dpr:raw.dpr,width:raw.width,height:raw.height,concurrency:raw.concurrency},profile:profile?profileSummary(profile):null,scope:'Chrome headless desktop emulation. Paint-call throughput is not presented physical-display FPS. Game audio active, browser output muted. Canvas2D renderer.'};
 summary.startup={firstFlightReadyMs,firstActiveMs:begin,pausedWarmupFrames:30,serviceWorker:raw.serviceWorker,navigation:raw.navigation,preActiveLongTasks:raw.page.longTasks.filter(s=>s.at<begin),preActiveRenderCpu:stats(raw.metrics.render.filter(s=>s.at<begin).map(s=>s.ms))};
 summary.sessionEvents=sessionEvents;
 summary.observed={peakWaves:Math.max(0,...states.map(s=>s.waves||0)),peakCaptures:Math.max(0,...states.map(s=>s.captureEffects||0)),peakRowEvents:Math.max(0,...states.map(s=>s.rowEvents||0)),peakRowOperations:Math.max(0,...states.map(s=>s.rowOperations||0)),peakBlackHoleRate:Math.max(0,...states.map(s=>s.blackHoleRate||0)),minimumTimeScale:Math.min(1,...states.map(s=>s.timeScale||1)),collectorPhases:[...new Set(states.map(s=>s.collectorPhase).filter(Boolean))],collectorCarrying:states.some(s=>s.collectorCarrying),collectorPickups:Math.max(0,...states.map(s=>s.collectorPickups||0)),bodyPickups:Math.max(0,...states.map(s=>s.bodyPickups||0))};
 const allRenders=raw.metrics.render.filter(s=>s.at>=begin&&s.at<=end);
 summary.phases=Object.fromEntries(['active','dying','completing'].map(phase=>{const rows=allRenders.filter(s=>s.phase===phase),intervals=allRenders.slice(1).flatMap((s,i)=>s.phase===phase&&allRenders[i].phase===phase&&!sessionEvents.some(e=>e.kind==='pause'&&e.at>allRenders[i].at&&e.at<s.at)?[s.at-allRenders[i].at]:[]);return[phase,{renders:rows.length,renderCpu:stats(rows.map(s=>s.ms)),renderGapMs:stats(intervals)}]}));
 const cpuWindow=(start,stop)=>Object.fromEntries(timings.map(k=>[k,stats(raw.metrics[k].filter(s=>s.at>=start&&s.at<stop&&s.phase==='active').map(s=>s.ms))]));
 summary.resumeWindows=[begin,...sessionEvents.filter(e=>e.kind==='resume-start'||e.kind==='retry-start').map(e=>e.at)].map(start=>({start,first3Seconds:cpuWindow(start,start+3000),next3Seconds:cpuWindow(start+3000,start+6000)}));
 if(args.lifecycle||args.sessionSeconds||args.pauseAt)summary.paintCallsPerSecond=null;
 if(args.perf){
  const downloads=path.resolve(out,'downloads');await fs.mkdir(downloads,{recursive:true});await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await click('[data-action=menu]');await click('[data-action=settings]');await click('[data-action=settings-advanced]');await click('[data-action=performance-report]');
  const reportPath=path.join(downloads,'wispbound-performance.json');await until(async()=>{try{return JSON.parse(await fs.readFile(reportPath,'utf8'))}catch{return false}},'performance report',50);
  const report=JSON.parse(await fs.readFile(reportPath,'utf8'));await fs.writeFile(path.join(out,label+'-downloaded-report.json'),JSON.stringify(report,null,2));
  summary.downloadedReport={schema:report.schema,flight:report.flight,raf:report.rafGapMs,render:report.renderGapMs,work:report.tickCpuMs,notes:report.notes};await b.shot(path.join(out,label+'-report-menu.png'));
 }
 if(args.lifecycle){
  summary.lifecycleEnd={screen:raw.screen,text:raw.bodyText,phases:states.map(s=>s.phase),dyingObserved:states.some(s=>s.dying),finishedObserved:states.some(s=>s.finished)};
  if(args.lifecycle==='death'&&await ev('!!document.querySelector("[data-action=death-continue]")')){await delay(2200);await b.shot(path.join(out,label+'-death.png'));await click('[data-action=death-continue]');await delay(800);summary.lifecycleEnd.afterContinue=await ev('({screen:document.body.dataset.screen,text:document.body.innerText})');}
 }
 await fs.writeFile(path.join(out,label+'.json'),JSON.stringify({summary,begin,end,inputs,states,raw},null,2));await b.shot(path.join(out,label+'-after.png'));results.push(summary);
 console.log(JSON.stringify({label,paintCallsPerSecond:summary.paintCallsPerSecond,frameMs:summary.frameMs,rafMs:summary.rafMs,renderCpu:summary.cpuMs.render,tickCpu:summary.cpuMs.tick,phase:summary.end.phase,screen:summary.screen,longTasks:summary.longTasks,errors:summary.errors,placement,downloadedReport:summary.downloadedReport,lifecycle:summary.lifecycleEnd?{...summary.lifecycleEnd,text:summary.lifecycleEnd.text.slice(0,200),phases:undefined}:null}));
 }
 }finally{b.close();}
 }
 await fs.writeFile(path.join(out,(args.label||'baseline')+'-suite.json'),JSON.stringify({at:new Date().toISOString(),baselineCommit,baselineChangedFiles:[...baselineFiles.keys()],sourceHashes:Object.fromEntries(await Promise.all(['flight.mjs','wisp-renderer.mjs','app.mjs'].map(async f=>[f,createHash('sha256').update(await fs.readFile(path.join(root,f))).digest('hex')]))),results},null,2));
}finally{server.close();}
