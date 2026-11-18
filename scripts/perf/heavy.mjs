// Heavy-load flight benchmark: "a lot of things happen" on an emulated phone.
//   node scripts/perf/heavy.mjs                 (4x and 6x CPU throttle, all scenarios)
//   node scripts/perf/heavy.mjs --throttle=4 --scenarios=marsh,coral --seconds=10 --label=after
//   node scripts/perf/heavy.mjs --check         (fails, exit 1, if a scenario's frame p95 is >15% worse than
//                                                outputs/perf/heavy/baseline.json; --save-baseline writes it)
//   --root=<dist folder> --noprofile --shots (seeded screenshot per scenario) --query=gl=0 (extra URL params)
// Phone: 915x412 CSS px, DPR 2.625, touch, CPU throttle. Late row (difficulty 3, row 4), a Pulse build
// (Rhythm, Spillway II, Resonant Harvest, Ripple Glass, Twin Orbit; Bell and Resonant Inscriptions),
// twin Collectors, 4x Sparks, a Flare kept active, card Pulses every 0.2 s on top of the Flare's 2 s rings,
// a giant Black Hole (coral) and a Guardian segment (basalt). The harness autopilot (lib.mjs P.steer) flies:
// it steers towards Sparks and cannot die (keepAlive), so the same course stretch is drawn every run.
// The planner in scripts/course-design/pilot-courses.mjs is not used in-page: its look-ahead search
// would run inside the measured frames and dominate the profile.
import fs from 'node:fs/promises';
import path from 'node:path';
import {startServer,launch,emulatePhone,stats,profileSummary,delay,until} from './lib.mjs';

const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const root=A.root||'dist',label=A.label||(A.check?'check':'run'),seconds=Number(A.seconds||(A.check?8:10));
const throttles=String(A.throttle||(A.check?'4':'4,6')).split(',').map(Number);
const dir=path.resolve('outputs/perf/heavy');await fs.mkdir(dir,{recursive:true});
const day=new Date().toISOString().slice(0,10);

const BUILD={cardset:'heavy',ins:'bell,,resonant',collector:'twin',late:'1'};
const SCENARIOS={
 // The built-in stress test flight (dist/stress-scene.mjs, ?scene=stress): the main scenario, the same scene the
 // emulator script and the owner's phone run. Its own frame statistics are used; about 55 s per run.
 stress:{stress:true},
 marsh:{q:{biome:'marsh',course:'4',...BUILD}},
 coral:{q:{biome:'coral',course:'2',giant:'1',...BUILD},hole:true},
 frost:{q:{biome:'frost',course:'2',...BUILD}},
 'basalt-guardian':{q:{biome:'basalt',course:'1',guardian:'hollow-sun',...BUILD},boss:true},
};
const names=String(A.scenarios||'stress').split(',');
const extra=new URLSearchParams(A.query||'');

// In-page load: run once after the engine exists, before wake.
const SETUP=`(()=>{const P=__perf,e=P.engine;
 const src=e.layout.embers.filter(p=>!p.harmful&&['light','cluster','cache','dusk'].includes(p.kind)),add=[];
 for(const p of src)for(let i=1;i<4;i++)add.push({...p,id:p.id+'-x'+i,x:p.x+i*16,collected:false,feature:undefined,anchor:null});
 e.layout.embers.push(...add);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;
 P.lift=22;let pulseAt=0,flareAt=0,serial=0;P.heavy={pulses:0,flares:0};
 const hole=%HOLE%,boss=%BOSS%;
 if(boss){const b=e.layout.boss;const x=b&&(b.start??b.x??b.rooms?.[0]?.start??b.stormRooms?.[0]?.start);if(x)e.distance=e.previousDistance=Math.max(0,x-e.player.x-300);}
 if(hole){const h=e.blackHoles.items[0];if(h)e.distance=e.previousDistance=Math.max(0,h.x-e.player.x-700);}
 P.onStep=(e,dt)=>{
  pulseAt+=dt;flareAt+=dt;
  if(pulseAt>=.2){pulseAt=0;P.heavy.pulses++;e.luminanceWaves.emit({x:e.distance+e.player.x,y:e.player.y,radius:260,source:'card',sourceKind:'card'})}
  if(!e.flashTether&&flareAt>.5){flareAt=0;P.heavy.flares++;try{e.collect({id:'perf-flare-'+(++serial),kind:'sight',x:e.distance+e.player.x+30,y:e.player.y,phase:0,collected:false})}catch(err){P.errors.push('flare:'+err.message)}}
  if(hole){const h=e.blackHoles.items[0];if(h&&e.distance+e.player.x>h.x-160&&e.distance+e.player.x<h.x+80){e.player.y+=((h.giant?h.bypass.y:h.y+(h.y<e.height/2?60:-60))-e.player.y)*.2}}
 };
 return {embers:e.layout.embers.length,boss:e.layout.boss?.id||null,holes:e.blackHoles.items.length,cards:(e.cardExecution?.cards||[]).map(c=>c?.cardId||null),inscriptions:(e.cardExecution?.inscriptions||[]).map(i=>i?.id||null),buffer:e.pixiView?.buffer?[e.pixiView.buffer.width,e.pixiView.buffer.height]:null,canvas:e.pixiView?.canvas?[e.pixiView.canvas.width,e.pixiView.canvas.height]:null,gl:e.pixiView?.lightGpu?.kind||'canvas2d'};
})()`;

async function open(b,base,q){
 const params=new URLSearchParams({mock:'boundary',cards:'1',seed:'perf-heavy',...q});for(const [k,v] of extra)params.set(k,v);
 const t0=Date.now();
 await b.send('Page.navigate',{url:`${base}/game.html?${params}`});
 await until(()=>b.ev('!!window.__perf?.bridge&&!!window.__perf.engine&&!!document.querySelector("[data-action=wake-flight]")'),'flight ready',120000,200);
 await until(()=>b.ev('window.__perf.engine.ready.then(()=>true)'),'engine ready',60000);
 return Date.now()-t0;
}
async function wake(b){
 const ok=()=>b.ev('(()=>{const e=__perf.engine;return !!(e&&e.running&&!e.paused)})()');
 for(let i=0;i<12;i++){await b.tapSel('.entry-depart:not([disabled]),[data-action=wake-flight]');try{await until(ok,'running',6000,100);return}catch{}}
 throw Error('wake failed');
}
const BEGIN=`(()=>{const P=__perf;for(const k in P.bake)P.bake[k]=0;for(const k of ['raf','ticks','renders','hud','longTasks','heap','scenes','marks'])P[k].length=0;P.recording=true;P.t0=performance.now();return P.t0})()`;
const END=`(()=>{const P=__perf;P.recording=false;return {t0:P.t0,t1:performance.now(),raf:P.raf,ticks:P.ticks,renders:P.renders,hud:P.hud,heap:P.heap,scenes:P.scenes,longTasks:P.longTasks,errors:P.errors.slice(-10),heavy:P.heavy,final:P.scene()}})()`;
const pairs=(a,w)=>{const r=[];for(let i=0;i<a.length;i+=w)r.push(a.slice(i,i+w));return r};

// Each profile sample goes to the innermost frame that names a category.
const CATS=[
 ['harness (autopilot, load)',f=>/^(P\.onStep|P\.steer|P\.scene|proto\.(step|hit|beginDying))$/.test(f.fn)],
 ['card engine',f=>/^card-|skill-cards|inscriptions|chain-strip|card-row/.test(f.file)&&f.file!=='card-black-hole.mjs'||/resolveCardRowEvent|cardPulse/.test(f.fn)],
 ['rings',f=>f.file==='luminance-waves.mjs'],
 ['light masks',f=>/terrain-light|light-field|light-gpu|light-attenuation/.test(f.file)||/^(lightFog|solidShade|compositeEdgeLight|lightMask)$/.test(f.fn)],
 ['background',f=>/biome-art|terrain-ecology/.test(f.file)&&/Backdrop|Background/.test(f.fn)||/^(drawSky|drawCachedBackground|backgroundStrips|drawMist|drawDeadForest|drawDistantRuins)$/.test(f.fn)||f.file==='biome-art.mjs'],
 ['sprites',f=>/pickup-art|capture-art|black-hole-art|companion-art|boss|guardian|wisp-wake|shell-arcs|collector-field|flash-tether|fourth-beat/.test(f.file)||/^(drawCollectibles|drawPacket|drawFleet|drawMain|drawProtector|drawAbsorptions|drawBurstEffects|glow|drawWind)$/.test(f.fn)],
 ['terrain/scenery',f=>/level-scenery|terrain-|authored-environment|contact-edge|scene-prop|spacetime|flight-forks|exit-landmark|course-/.test(f.file)||/^(drawTerrain|terrainImage|drawSceneryGrowth|drawSceneProps|drawScenePropContacts|drawTerrainStory|pixelLine|path)$/.test(f.fn)],
 ['HUD/DOM (JS)',f=>/^(updateFlight|notify|render[A-Z]\w*Hud)$/.test(f.fn)||/fps-counter|hud|app\.mjs/.test(f.file)],
 ['simulation step',f=>f.file==='flight.mjs'&&/^(step|stepFlight|updateCollectors|collect)$/.test(f.fn)||/^(wisp|black-holes|biome-dynamics|drafts|glow-budget|pickups|companion-abilities)\.mjs$/.test(f.file)],
 ['final blit/frame',f=>f.file==='wisp-renderer.mjs'&&f.fn==='render'||f.file==='flight.mjs'&&/^(render|renderScheduledFrame|tick)$/.test(f.fn)],
];
function categorize(profile){
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of nodes.values())for(const id of n.children||[])parent.set(id,n.id);
 const memo=new Map(),out={};let total=0;
 const catOf=id=>{if(memo.has(id))return memo.get(id);let cur=id,cat=null;
  const n0=nodes.get(id).callFrame.functionName;
  if(n0==='(garbage collector)')cat='GC';else if(n0==='(idle)')cat='idle';else if(n0==='(program)')cat='native/program';
  while(!cat&&cur){const cf=nodes.get(cur).callFrame,f={fn:cf.functionName,file:path.basename((cf.url||'').split('?')[0])};for(const [name,test] of CATS)if(test(f)){cat=name;break}cur=parent.get(cur)}
  cat??='other JS';memo.set(id,cat);return cat};
 for(let i=0;i<profile.samples.length;i++){const us=profile.timeDeltas[i]||0;total+=us;const c=catOf(profile.samples[i]);out[c]=(out[c]||0)+us}
 const busy=total-(out.idle||0);
 return Object.fromEntries(Object.entries(out).sort((a,b)=>b[1]-a[1]).map(([k,us])=>[k,{ms:+(us/1000).toFixed(0),pctBusy:k==='idle'?null:+(us/busy*100).toFixed(1)}]));
}

function summarize(raw,m0,m1,durS){
 const gaps=pairs(raw.raf,2).map(r=>r[1]),s=stats(gaps),sorted=gaps.slice().sort((a,b)=>b-a),worst=sorted.slice(0,Math.max(1,Math.ceil(sorted.length/100)));
 const ticks=pairs(raw.ticks,4).filter(t=>t[2]===0).map(t=>t[1]),renders=pairs(raw.renders,2).map(r=>r[1]);
 const heapMB=pairs(raw.heap,2).map(h=>h[1]/1048576);let gcDrops=0;for(let i=1;i<heapMB.length;i++)if(heapMB[i-1]-heapMB[i]>.5)gcDrops++;
 const peak={};for(const [,sc] of raw.scenes)for(const k of ['visiblePickups','waves','pickupEffects','particles','blackHole','collectors'])if(typeof sc[k]==='number')peak[k]=Math.max(peak[k]||0,sc[k]);
 peak.boss=raw.scenes.find(x=>x[1].boss)?.[1].boss||null;
 const d=k=>+(((m1[k]||0)-(m0[k]||0))*1000/durS).toFixed(1);
 return {frames:s.n,avgFps:+(1000/s.mean).toFixed(1),low1Fps:+(1000/(worst.reduce((a,b)=>a+b,0)/worst.length)).toFixed(1),
  p50:+s.p50.toFixed(1),p95:+s.p95.toFixed(1),p99:+s.p99.toFixed(1),over33:s.over33,over50:s.over50,longest:+s.max.toFixed(0),
  tickP50:+stats(ticks).p50.toFixed(2),tickP95:+stats(ticks).p95.toFixed(2),renderP50:+stats(renders).p50.toFixed(2),renderP95:+stats(renders).p95.toFixed(2),
  heap:{startMB:+(heapMB[0]||0).toFixed(1),endMB:+(heapMB.at(-1)||0).toFixed(1),allocMBperS:+(heapMB.slice(1).reduce((a,v,i)=>a+Math.max(0,v-heapMB[i]),0)/durS).toFixed(2),gcDrops},
  msPerS:{task:d('TaskDuration'),script:d('ScriptDuration'),style:d('RecalcStyleDuration'),layout:d('LayoutDuration'),styleCount:+(((m1.RecalcStyleCount||0)-(m0.RecalcStyleCount||0))/durS).toFixed(1),layoutCount:+(((m1.LayoutCount||0)-(m0.LayoutCount||0))/durS).toFixed(1)},
  worst:pairs(raw.raf,2).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t,ms])=>[+((t-raw.t0)/1000).toFixed(2),+ms.toFixed(0)]),
  longTasks:pairs(raw.longTasks,2).filter(([a])=>a>=raw.t0).map(([a,ms])=>[+((a-raw.t0)/1000).toFixed(2),+ms.toFixed(0)]).sort((a,b)=>b[1]-a[1]).slice(0,5),
  peak,heavy:raw.heavy,errors:raw.errors};
}

async function runStress(b,srv,{id,name,throttle,ri}){
 const params=new URLSearchParams({scene:'stress'});for(const [k,v] of extra)params.set(k,v);
 const t0=Date.now();await b.send('Page.navigate',{url:`${srv.base}/game.html?${params}`});
 await until(()=>b.ev('!!document.querySelector(".stress-confirm button")'),'stress confirm',120000,200);const readyMs=Date.now()-t0;
 await b.send('Emulation.setCPUThrottlingRate',{rate:throttle});await b.send('HeapProfiler.collectGarbage').catch(()=>{});
 if(!A.noprofile)await b.send('Profiler.start');await delay(800);
 const m0=await b.metrics();await b.ev('(document.querySelector(".stress-confirm button").click(),1)');
 if(A.shots&&throttle===throttles[0]){await delay(25000);await b.shot(path.join(dir,`${day}-${label}-stress${ri?'-B':''}.png`));}
 const r=await until(()=>b.ev('window.__stressResult'),'stress result',400000,500);
 let profile=null;if(!A.noprofile)profile=(await b.send('Profiler.stop')).profile;const m1=await b.metrics();
 if(A.shots&&throttle===throttles[0])await b.shot(path.join(dir,`${day}-${label}-stress-result${ri?'-B':''}.png`));
 const durS=r.seconds||1,d=k=>+(((m1[k]||0)-(m0[k]||0))*1000/durS).toFixed(1);
 const row={id,scenario:name,throttle,label,root:roots[ri],side:roots.length>1?(ri?'B':'A'):null,readyMs,avgFps:r.avgFps,low1Fps:r.low1Fps,minFps:r.minFps,p50:r.p50Ms,p95:r.p95Ms,p99:r.p99Ms,over33:r.over33,over50:r.over50,longest:r.longestMs,frames:r.frames,
  msPerS:{task:d('TaskDuration'),script:d('ScriptDuration'),style:d('RecalcStyleDuration'),layout:d('LayoutDuration')},phases:r.phases,renderer:r.renderer,load:r.load,gpu:r.gpu,summary:r.summary,errors:b.errors.slice(-5)};
 if(profile){row.categories=categorize(profile);const p=profileSummary(profile);row.top25=p.self.slice(0,25);row.byFile=p.byFile.slice(0,15);}
 console.log(`avg ${r.avgFps} fps  1%low ${r.low1Fps}  p50 ${r.p50Ms}  p95 ${r.p95Ms}  p99 ${r.p99Ms}  >33 ${r.over33}  >50 ${r.over50}  max ${r.longestMs}  peak ${r.phases.peak.avgFps} fps  ${r.renderer}`);
 return row;
}

// --ab=<rootB>: run every scenario on root A then root B in the same browser (interleaved A/B, less drift).
const roots=[root,...(A.ab?[A.ab]:[])],servers=[];for(const r of roots)servers.push(await startServer(r));
// A fresh browser per measurement: one long-lived browser got slower run after run.
let b=null;const repeat=Number(A.repeat||1);
const results=[];
try{
 for(const throttle of throttles)for(const name of names)for(let rep=0;rep<repeat;rep++)for(let ri=0;ri<roots.length;ri++){
  const sc=SCENARIOS[name];if(!sc)throw Error('Unknown scenario '+name);const srv=servers[ri];
  const id=`${name}-${throttle}x`+(roots.length>1?(ri?'-B':'-A'):'')+(repeat>1?'-r'+(rep+1):'');process.stdout.write(id.padEnd(22)+' ');
  b=await launch({headed:!!A.headed,extra:A.gpuFlags?String(A.gpuFlags).split(' '):[]});
  try{
   await emulatePhone(b,{throttle:1});
   if(!A.noprofile){await b.send('Profiler.enable');await b.send('Profiler.setSamplingInterval',{interval:1000});}
   if(sc.stress){results.push(await runStress(b,srv,{id,name,throttle,ri}));continue;}
   const readyMs=await open(b,srv.base,sc.q);
   const setup=await b.ev(SETUP.replace('%HOLE%',sc.hole?'true':'false').replace('%BOSS%',sc.boss?'true':'false'));
   await b.send('Emulation.setCPUThrottlingRate',{rate:throttle});
   // Starting the profiler and a forced GC stall the main thread for up to a second
   // under throttling: do both before wake, outside the measured window.
   await b.send('HeapProfiler.collectGarbage').catch(()=>{});
   if(!A.noprofile)await b.send('Profiler.start');
   await delay(800);
   await wake(b);await delay(1500);
   if(A.shots&&throttle===throttles[0])await b.shot(path.join(dir,`${day}-${label}-${name}.png`));
   const m0=await b.metrics();await b.ev(BEGIN);
   const t=Date.now();await delay(seconds*1000);
   let profile=null;if(!A.noprofile)profile=(await b.send('Profiler.stop')).profile;
   const raw=await b.ev(END);const m1=await b.metrics();const durS=(Date.now()-t)/1000;
   const sum=summarize(raw,m0,m1,durS);
   const row={id,scenario:name,throttle,label,root:roots[ri],side:roots.length>1?(ri?'B':'A'):null,rep,readyMs,setup,...sum};
   if(profile){row.categories=categorize(profile);const p=profileSummary(profile);row.top25=p.self.slice(0,25);row.byFile=p.byFile.slice(0,15);
    if(A.saveProfiles)await fs.writeFile(path.join(dir,`${day}-${label}-${id}.cpuprofile`),JSON.stringify(profile));}
   results.push(row);
   console.log(`avg ${sum.avgFps.toFixed(1)} fps  1%low ${sum.low1Fps.toFixed(1)}  p50 ${sum.p50}  p95 ${sum.p95}  p99 ${sum.p99}  >33 ${sum.over33}  >50 ${sum.over50}  max ${sum.longest}  waves ${sum.peak.waves} sparks ${sum.peak.visiblePickups}${sum.errors.length?'  ERR '+sum.errors[0]:''}`);
  }catch(e){console.log('FAILED',e.message);results.push({id,scenario:name,throttle,failed:e.message,pageErrors:b.errors.slice(-5)});}
  finally{await b.close();b=null;}
 }
}finally{if(b)await b.close();for(const s of servers)s.close();}

const file=path.join(dir,`${day}-${label}.json`);
await fs.writeFile(file,JSON.stringify({day,label,root,seconds,throttles,query:A.query||'',results},null,1));
console.log('\n'+'scenario'.padEnd(22)+'avgFPS  1%low   p50   p95   p99  >33  >50  max');
for(const r of results)if(!r.failed)console.log(r.id.padEnd(22)+String(r.avgFps).padStart(6)+String(r.low1Fps).padStart(7)+String(r.p50).padStart(6)+String(r.p95).padStart(6)+String(r.p99).padStart(6)+String(r.over33).padStart(5)+String(r.over50).padStart(5)+String(r.longest).padStart(5));
for(const r of results)if(r.categories)console.log(r.id.padEnd(22)+Object.entries(r.categories).filter(([k])=>k!=='idle').slice(0,8).map(([k,v])=>`${k} ${v.pctBusy}%`).join(' | '));
console.log('saved',file);

const basePath=path.join(dir,'baseline.json');
if(A['save-baseline']){await fs.writeFile(basePath,JSON.stringify({day,label,seconds,results:results.filter(r=>!r.failed).map(r=>({id:r.id,p95:r.p95,over33:r.over33,avgFps:r.avgFps}))},null,1));console.log('baseline written',basePath);}
if(A.check){
 let base;try{base=JSON.parse(await fs.readFile(basePath,'utf8'))}catch{console.log('No baseline: run with --save-baseline first.');process.exit(2)}
 let bad=0;
 for(const r of results){const o=base.results.find(x=>x.id===r.id);if(r.failed){console.log('FAIL',r.id,r.failed);bad++;continue}if(!o){console.log('NEW ',r.id,'p95',r.p95);continue}
  const worse=r.p95>o.p95*1.15&&r.p95-o.p95>2;if(worse)bad++;console.log(`${worse?'REGRESSED':'pass     '} ${r.id} p95 ${o.p95} -> ${r.p95} ms`)}
 process.exit(bad?1:0);
}
