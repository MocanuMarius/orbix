// Orbix phone-emulation stress harness.
// node scripts/perf/run.mjs --scenarios=flight --biome=pinewood --course=1 --throttle=4 --runs=3 --seconds=30
// node scripts/perf/run.mjs --suite=biomes --throttle=4 --seconds=30
// Options: --root=dist (or an extracted older dist) --label=current --count (draw-call counting run)
//          --profile (CPU profile of the measurement window) --out=outputs/perf/raw --headed
import fs from 'node:fs/promises';
import path from 'node:path';
import {startServer,launch,emulatePhone,stats,profileSummary,delay,until} from './lib.mjs';

const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const root=A.root||'dist',label=A.label||'current',out=path.resolve(A.out||'outputs/perf/raw',label);
const throttles=String(A.throttle||4).split(',').map(Number),runs=Number(A.runs||1),seconds=Number(A.seconds||30);
await fs.mkdir(out,{recursive:true});

const BIOMES=['moonruins','frost','pinewood','marsh','fungal','basalt','desert','coral','crystal','cloud','thorn','cemetery'];

// ---- in-page helpers -------------------------------------------------------
async function openFlight(b,base,q={}){
 const params=new URLSearchParams({mock:'boundary',cards:'1',biome:'pinewood',course:'1',...q});if(A.count)params.set('perfcount','1');
 const t0=Date.now();
 await b.send('Page.navigate',{url:`${base}/game.html?${params}`});
 await until(()=>b.ev('!!window.__perf?.bridge&&!!window.__perf.engine&&!!document.querySelector("[data-action=wake-flight]")'),'flight ready',120000,200);
 await until(()=>b.ev('window.__perf.engine.ready.then(()=>true)'),'engine ready',60000);
 const readyMs=Date.now()-t0;
 return readyMs;
}
async function wake(b){
 const ok=()=>b.ev('(()=>{const e=__perf.engine;return !!(e&&e.running&&!e.paused)})()');
 for(let i=0;i<12;i++){
  await b.tapSel('.entry-depart:not([disabled]),[data-action=wake-flight]');
  try{await until(ok,'running',6000,100);return}catch{}
 }
 throw Error('wake failed: '+await b.ev('JSON.stringify({screen:__perf.screen,run:__perf.engine?.running,paused:__perf.engine?.paused,btn:!!document.querySelector("[data-action=wake-flight]")})'));
}
const begin=b=>b.ev(`(()=>{const P=__perf;for(const k in P.bake)P.bake[k]=0;for(const k of ['raf','ticks','renders','hud','longTasks','heap','scenes','marks'])P[k].length=0;P.draws=0;P.counts={};P.mutations=0;P.rafCallbacks=0;P.recording=true;P.t0=performance.now();return P.t0})()`);
const mark=(b,name)=>b.ev(`__perf.marks.push([performance.now(),${JSON.stringify(name)}])`);
async function end(b){
 return b.ev(`(()=>{const P=__perf;P.recording=false;return {bake:{...P.bake},t0:P.t0,t1:performance.now(),raf:P.raf,ticks:P.ticks,renders:P.renders,hud:P.hud,longTasks:P.longTasks,heap:P.heap,scenes:P.scenes,marks:P.marks,counts:P.counts,draws:P.draws,mutations:P.mutations,rafCallbacks:P.rafCallbacks,errors:P.errors.slice(-20),deathsPrevented:P.deathsPrevented,hitsPrevented:P.hitsPrevented,final:P.scene(),canvases:[...document.querySelectorAll('canvas')].filter(c=>c.getBoundingClientRect().width>0).map(c=>({cls:c.className,id:c.id,w:c.width,h:c.height,css:[Math.round(c.getBoundingClientRect().width),Math.round(c.getBoundingClientRect().height)]})),buffer:__perf.engine?.pixiView?.buffer?[__perf.engine.pixiView.buffer.width,__perf.engine.pixiView.buffer.height]:null,dpr:devicePixelRatio}})()`);
}
const pairs=(a,w)=>{const r=[];for(let i=0;i<a.length;i+=w)r.push(a.slice(i,i+w));return r};

function summarize(raw){
 const raf=pairs(raw.raf,2),ticks=pairs(raw.ticks,4),renders=pairs(raw.renders,2),hud=pairs(raw.hud,2),lt=pairs(raw.longTasks,2).filter(([a])=>a>=raw.t0),heap=pairs(raw.heap,2);
 const activeTicks=ticks.filter(t=>t[2]===0);
 const gaps=raf.map(r=>r[1]);
 let stall=0;for(const g of gaps)stall=Math.max(stall,g);
 // Worst moments with the scene that was on screen.
 const worst=raf.slice().sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t,ms])=>{let s=null,d=1e9;for(const [at,sc] of raw.scenes){const dd=Math.abs(at-t);if(dd<d){d=dd;s=sc}}return {atS:+((t-raw.t0)/1000).toFixed(2),ms:+ms.toFixed(1),scene:s}});
 const heapMB=heap.map(h=>h[1]/1048576);let gcDrops=0,maxDrop=0;for(let i=1;i<heapMB.length;i++){const d=heapMB[i-1]-heapMB[i];if(d>0.5){gcDrops++;maxDrop=Math.max(maxDrop,d)}}
 const half=Math.floor(heapMB.length/2),avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
 const durS=(raw.t1-raw.t0)/1000;
 const drawsPerTick=activeTicks.filter(t=>t[3]>0).map(t=>t[3]);
 return {
  windowS:+durS.toFixed(1),
  bake:raw.bake?{terrainPerS:+(raw.bake.terrain/durS).toFixed(2),terrainMsPerS:+(raw.bake.terrainMs/durS).toFixed(1),terrainMax:+raw.bake.terrainMax.toFixed(1),propsPerS:+(raw.bake.props/durS).toFixed(2),bgPerS:+(raw.bake.bg/durS).toFixed(2),bgMsPerS:+(raw.bake.bgMs/durS).toFixed(1),bgMsEach:+(raw.bake.bgMs/Math.max(1,raw.bake.bg)).toFixed(2)}:null,
  frame:stats(gaps),
  tickCpu:stats(activeTicks.map(t=>t[1])),
  renderCpu:stats(renders.map(r=>r[1])),
  hudCpu:stats(hud.map(h=>h[1])),
  paintsPerS:+(renders.length/durS).toFixed(1),rafPerS:+(raf.length/durS).toFixed(1),
  longTasks:{count:lt.length,totalMs:+lt.reduce((s,l)=>s+l[1],0).toFixed(0),max:+Math.max(0,...lt.map(l=>l[1])).toFixed(0)},
  longestStall:+stall.toFixed(1),
  heap:{startMB:+(heapMB[0]||0).toFixed(1),endMB:+(heapMB.at(-1)||0).toFixed(1),maxMB:+Math.max(0,...heapMB).toFixed(1),firstHalfAvg:+avg(heapMB.slice(0,half)).toFixed(1),secondHalfAvg:+avg(heapMB.slice(half)).toFixed(1),gcDrops,maxDropMB:+maxDrop.toFixed(1),allocMBperS:+(heapMB.slice(1).reduce((s,v,i)=>s+Math.max(0,v-heapMB[i]),0)/durS).toFixed(2)},
  draws:drawsPerTick.length?{perPaint:stats(drawsPerTick),counts:Object.fromEntries(Object.entries(raw.counts).map(([k,v])=>[k,+(v/Math.max(1,renders.length)).toFixed(2)]))}:null,
  mutationsPerS:+(raw.mutations/durS).toFixed(1),rafCallbacksPerS:+(raw.rafCallbacks/durS).toFixed(1),
  worst,peaks:peakScene(raw.scenes),final:raw.final,canvases:raw.canvases,buffer:raw.buffer,dpr:raw.dpr,
  errors:raw.errors,deathsPrevented:raw.deathsPrevented,hitsPrevented:raw.hitsPrevented,marks:raw.marks.map(([t,n])=>[+((t-raw.t0)/1000).toFixed(2),n])
 };
}
function peakScene(scenes){const p={};for(const[,s] of scenes)for(const k of ['visiblePickups','waves','absorptions','pickupEffects','particles','blackHole','collectors','cardEvents'])if(typeof s[k]==='number')p[k]=Math.max(p[k]||0,s[k]);const lv=scenes.map(s=>s[1].level).filter(Boolean);p.level=lv[0];p.boss=scenes.find(s=>s[1].boss)?.[1].boss||null;p.collectorPhases=[...new Set(scenes.map(s=>s[1].collector).filter(Boolean))];p.screens=[...new Set(scenes.map(s=>s[1].screen))];p.distance=[scenes[0]?.[1].distance,scenes.at(-1)?.[1].distance];return p}

// Per-window phase summaries (e.g. countdown vs ramp) from marks.
function windowStats(raw,from,to){const raf=pairs(raw.raf,2).filter(r=>r[0]>=from&&r[0]<to).map(r=>r[1]);const t=pairs(raw.ticks,4).filter(r=>r[0]>=from&&r[0]<to).map(r=>r[1]);const lt=pairs(raw.longTasks,2).filter(r=>r[0]>=from&&r[0]<to);return {frame:stats(raf),tickCpu:stats(t),longTasks:lt.length,longTaskMax:+Math.max(0,...lt.map(l=>l[1])).toFixed(0)}}

// ---- scenarios ---------------------------------------------------------------
// Each returns {raw, extra}. Flights are measured from wake for `seconds`.
const flightScenario=(q,setup='')=>async(b,base)=>{
 const readyMs=await openFlight(b,base,q);
 if(setup)await b.ev(setup);
 await wake(b);
 await delay(500);
 await begin(b);await delay(seconds*1000);const raw=await end(b);
 return {raw,extra:{readyMs}};
};
// Synthetic stress setups (run after the engine exists, before wake).
const S={
 pickups:k=>`(()=>{const e=__perf.engine,src=e.layout.embers.filter(p=>!p.harmful&&['light','cluster','cache','dusk','dark'].includes(p.kind)),add=[];for(const p of src)for(let i=1;i<${k};i++)add.push({...p,id:p.id+'-x'+i,x:p.x+i*16,collected:false,feature:undefined,anchor:null});e.layout.embers.push(...add);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;return e.layout.embers.length})()`,
 pulses:interval=>`(()=>{let acc=0;__perf.onStep=(e,dt)=>{acc+=dt;if(acc>=${interval}){acc=0;e.luminanceWaves.emit({x:e.distance+e.player.x,y:e.player.y,radius:260,source:'perf',sourceKind:'ability'})}};return true})()`,
 flashes:spacing=>`(()=>{const e=__perf.engine,add=[];for(let x=e.distance+500;x<e.totalDistance;x+=${spacing})add.push({id:'perf-sight-'+x,kind:'sight',x,y:e.height*.5,phase:0});e.layout.embers.push(...add);e.layout.embers.sort((a,b)=>a.x-b.x);e.flashProps=e.layout.embers.filter(p=>p.kind==='sight');e._pickupCount=-1;e._nearbyPacketsUntil=-1;return add.length})()`,
 light:r=>`(()=>{const e=__perf.engine;e.mod.lightRadius=${r};return true})()`,
 hole:`(()=>{const e=__perf.engine,h=e.blackHoles.items[0];if(!h)return 'no hole';e.distance=e.previousDistance=Math.max(0,h.x-e.player.x-420);__perf.onStep=(e)=>{const h=e.blackHoles.items[0];if(h&&e.distance+e.player.x>h.x-140&&e.distance+e.player.x<h.x+60){e.player.y+=((h.giant?h.bypass.y:h.y+(h.y<e.height/2?60:-60))-e.player.y)*.2}};return {x:h.x,giant:!!h.giant}})()`,
 boss:`(()=>{const e=__perf.engine,b=e.layout.boss;if(!b)return 'no boss';const x=b.start??b.x??b.rooms?.[0]?.start??b.stormRooms?.[0]?.start;if(x)e.distance=e.previousDistance=Math.max(0,x-e.player.x-300);return {id:b.id,x}})()`,
};

const scenarios={
 flight:()=>flightScenario({biome:A.biome||'pinewood',course:String(A.course||1),cardset:A.cardset||'plain',late:A.late?'1':'0'}),
 cards:()=>flightScenario({biome:A.biome||'pinewood',course:'1',cardset:'maxRow'}),
 pickups10:()=>flightScenario({biome:A.biome||'pinewood',course:'1',cardset:'maxRow'},S.pickups(10)),
 pulses:()=>flightScenario({biome:A.biome||'pinewood',course:'1',cardset:'maxRow'},S.pulses(Number(A.interval||.2))),
 flash:()=>flightScenario({biome:A.biome||'pinewood',course:'1',cardset:'collectorRow'},S.flashes(600)),
 collector:()=>flightScenario({biome:A.biome||'pinewood',course:'1',cardset:'collectorRow',collector:'twin'},S.pickups(3)),
 lantern:()=>flightScenario({biome:A.biome||'cemetery',course:'1',cardset:'plain',theme:'darkness-lanterns'}),
 blackhole:()=>flightScenario({biome:A.biome||'pinewood',course:'2',cardset:'collectorRow'},S.hole),
 giant:()=>flightScenario({biome:A.biome||'pinewood',course:'2',cardset:'collectorRow',giant:'1'},S.hole),
 guardian:()=>flightScenario({biome:A.biome||'basalt',course:'1',cardset:'maxRow',guardian:A.guardian||'hollow-sun'},S.boss),
 chain:()=>flightScenario({biome:A.biome||'pinewood',course:'1',cardset:'chain'},S.pickups(5)+';'+S.pulses(.5)),
 stress:()=>async(b,base)=>{ // composite worst case, knobs from CLI
  const q={biome:A.biome||'pinewood',course:'1',cardset:A.cardset||'chain'};if(A.twin)q.collector='twin';
  const setup=[A.k&&S.pickups(Number(A.k)),A.interval&&S.pulses(Number(A.interval)),A.flashes&&S.flashes(Number(A.flashes)),A.light&&S.light(Number(A.light))].filter(Boolean).join(';');
  return flightScenario(q,setup)(b,base);
 },
 // Entry: from navigation to 6 s after wake, including load and first frames.
 entry:()=>async(b,base)=>{
  await b.send('Page.navigate',{url:'about:blank'});await delay(300);
  const params=new URLSearchParams({mock:'boundary',cards:'1',biome:A.biome||'pinewood',course:'1',cardset:'maxRow'});
  await b.send('Page.navigate',{url:`${base}/game.html?${params}`});
  await until(()=>b.ev('!!window.__perf'),'perf',30000,50);await begin(b);await mark(b,'nav');
  await until(()=>b.ev('!!window.__perf?.engine&&!!document.querySelector("[data-action=wake-flight]")'),'ready',120000,100);await mark(b,'ready');
  await b.ev('__perf.engine.ready.then(()=>1)');await mark(b,'engine-ready');
  await wake(b);await mark(b,'running');await delay(6000);
  const raw=await end(b);const nav=await b.ev('performance.getEntriesByType("navigation")[0]?.toJSON()');
  const m=Object.fromEntries(raw.marks.map(([t,n])=>[n,t]));
  return {raw,extra:{navigation:{dcl:nav?.domContentLoadedEventEnd,load:nav?.loadEventEnd},marksS:Object.fromEntries(Object.entries(m).map(([k,v])=>[k,+((v-raw.t0)/1000).toFixed(2)])),loading:windowStats(raw,m.nav,m.running),first6s:windowStats(raw,m.running,m.running+6000),firstSecond:windowStats(raw,m.running,m.running+1000)}};
 },
 // Death and retry through the real UI.
 death:()=>async(b,base)=>{
  await openFlight(b,base,{biome:A.biome||'pinewood',course:'1',cardset:'maxRow'});await wake(b);await delay(3000);
  await begin(b);await mark(b,'flying');await delay(3000);
  await b.ev('(()=>{__perf.allowDeath=true;__perf.autopilot=false;const e=__perf.engine;e.beginDying("collision");return true})()');await mark(b,'death');
  await until(()=>b.ev('!!document.querySelector("[data-action=death-continue]")'),'death continue',30000);await delay(1500);await mark(b,'continue');
  await b.click('[data-action=death-continue]');await delay(800);
  const which=await b.ev('document.querySelector("[data-action=retry]")?"retry":document.querySelector("[data-action=node]")?"node":document.body.dataset.screen');
  if(which==='retry')await b.click('[data-action=retry]');else if(which==='node')await b.click('[data-action=node]');
  await b.ev('(()=>{__perf.allowDeath=false;__perf.autopilot=true;return 1})()');
  await until(()=>b.ev('!!document.querySelector("[data-action=wake-flight]")'),'retry entry',60000);await mark(b,'retry-ready');
  await wake(b);await mark(b,'retry-running');await delay(5000);
  const raw=await end(b);const m=Object.fromEntries(raw.marks.map(([t,n])=>[n,t]));
  return {raw,extra:{after:which,dying:windowStats(raw,m.death,m.continue),toRetry:windowStats(raw,m.continue,m['retry-running']),retryFirst5s:windowStats(raw,m['retry-running'],m['retry-running']+5000)}};
 },
 // Pause menu, Deck and Settings, then resume countdown and speed ramp.
 pause:()=>async(b,base)=>{
  await openFlight(b,base,{biome:A.biome||'pinewood',course:'1',cardset:'maxRow'});await wake(b);await delay(2000);
  await begin(b);await mark(b,'flying');await delay(3000);
  await mark(b,'menu');await b.click('[data-action=menu]');await delay(2000);
  const ui=await b.ev('[...document.querySelectorAll("[data-action]")].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.dataset.action)');
  await mark(b,'deck');const deck=await b.click('[data-action=cards],[data-action=practice-deck]',{optional:true});await delay(2500);
  if(deck){await b.click('[data-action=close-sheet],[data-action=card-done],[data-action=settings-back],[data-action=cards-back]',{optional:true});await delay(800);}
  if(!await b.ev('!!document.querySelector("[data-action=resume]")&&document.querySelector("[data-action=resume]").getBoundingClientRect().width>0'))await b.click('[data-action=menu]',{optional:true});
  await mark(b,'settings');const set=await b.click('[data-action=settings]',{optional:true});await delay(2000);
  if(set){await b.click('[data-action=settings-back],[data-action=close-sheet]',{optional:true});await delay(800);}
  if(!await b.ev('!!document.querySelector("[data-action=resume]")&&document.querySelector("[data-action=resume]").getBoundingClientRect().width>0'))await b.click('[data-action=menu]',{optional:true});
  await mark(b,'idle-menu');await delay(3000);
  await mark(b,'resume');await b.click('[data-action=resume]');
  await until(()=>b.ev('!__perf.engine.paused'),'resumed',30000,50);await mark(b,'unpaused');await delay(6000);
  const raw=await end(b);const m=Object.fromEntries(raw.marks.map(([t,n])=>[n,t]));
  return {raw,extra:{ui,deckOpened:deck,settingsOpened:set,flying:windowStats(raw,m.flying,m.menu),menuOpen:windowStats(raw,m.menu,m.deck),deck:windowStats(raw,m.deck,m.settings),settings:windowStats(raw,m.settings,m['idle-menu']),menuIdle:windowStats(raw,m['idle-menu'],m.resume),countdown:windowStats(raw,m.resume,m.unpaused),ramp3s:windowStats(raw,m.unpaused,m.unpaused+3000),after:windowStats(raw,m.unpaused+3000,m.unpaused+6000)}};
 },
 // Clear the flight and walk into the reward ceremony.
 reward:()=>async(b,base)=>{
  await openFlight(b,base,{biome:A.biome||'pinewood',course:'1',cardset:'maxRow'});
  await b.ev('(()=>{const e=__perf.engine;e.distance=e.previousDistance=e.totalDistance-700;return 1})()');
  await wake(b);await begin(b);await mark(b,'flying');
  await until(()=>b.ev('__perf.screen!=="flight"||!!__perf.engine?.finished'),'finish',60000,200);await mark(b,'finished');
  await delay(8000);await mark(b,'ceremony-end');
  const raw=await end(b);const m=Object.fromEntries(raw.marks.map(([t,n])=>[n,t]));
  return {raw,extra:{screen:await b.ev('__perf.screen'),approachAndClear:windowStats(raw,m.flying,m.finished),ceremony:windowStats(raw,m.finished,m['ceremony-end'])}};
 },
 // Map panning: real game map from a fresh run, dragged left/right.
 map:()=>async(b,base)=>{
  await b.send('Page.navigate',{url:`${base}/game.html?mock=cards&scenario=map`});
  await until(()=>b.ev('!!window.__perf?.bridge&&__perf.screen==="map"'),'map',60000,200).catch(()=>null);
  await delay(2000);
  const scr=await b.ev('__perf.screen');
  const box=await b.ev('(()=>{const e=document.querySelector(".map-scroll,.route-map,.map-wrap,[data-map],.map")||document.body;const r=e.getBoundingClientRect();return {sel:e.className||e.tagName,x:r.x+r.width/2,y:r.y+r.height/2,w:r.width}})()');
  await begin(b);await mark(b,'idle');await delay(2000);await mark(b,'pan');
  for(let i=0;i<8;i++){await b.drag(box.x+150,box.y,box.x-150,box.y,12,16);await b.drag(box.x-150,box.y,box.x+150,box.y,12,16);}
  await mark(b,'pan-end');await delay(500);
  const raw=await end(b);const m=Object.fromEntries(raw.marks.map(([t,n])=>[n,t]));
  return {raw,extra:{screen:scr,box,idle:windowStats(raw,m.idle,m.pan),pan:windowStats(raw,m.pan,m['pan-end'])}};
 },
 // Home screen idle: should cost almost nothing.
 home:()=>async(b,base)=>{
  await b.send('Page.navigate',{url:`${base}/game.html`});
  await until(()=>b.ev('!!window.__perf?.bridge'),'home',60000,200);await delay(3000);
  const m0=await b.metrics();await begin(b);await delay(10000);const m1=await b.metrics();const raw=await end(b);
  return {raw,extra:{screen:await b.ev('__perf.screen'),cpuTaskMsPerS:+((m1.TaskDuration-m0.TaskDuration)*1000/10).toFixed(1),scriptMsPerS:+((m1.ScriptDuration-m0.ScriptDuration)*1000/10).toFixed(1),layoutsPerS:(m1.LayoutCount-m0.LayoutCount)/10,styleRecalcsPerS:(m1.RecalcStyleCount-m0.RecalcStyleCount)/10}};
 },
 // Ten-minute session: back-to-back flights with forced deaths and retries.
 session:()=>async(b,base)=>{
  const total=Number(A.minutes||10)*60000,t0=Date.now(),cycles=[];
  await openFlight(b,base,{biome:A.biome||'pinewood',course:'1',cardset:'maxRow'});await wake(b);
  await begin(b);
  while(Date.now()-t0<total){
   await delay(40000);
   const c0=Date.now();
   await b.ev('(()=>{__perf.allowDeath=true;__perf.engine.beginDying("collision");return 1})()');
   await until(()=>b.ev('!!document.querySelector("[data-action=death-continue]")'),'death',30000);await delay(1200);
   await b.click('[data-action=death-continue]');await delay(800);
   const which=await b.ev('document.querySelector("[data-action=retry]")?"retry":document.querySelector("[data-action=node]")?"node":document.body.dataset.screen');
   if(which==='retry')await b.click('[data-action=retry]');else if(which==='node')await b.click('[data-action=node]');else break;
   await b.ev('(()=>{__perf.allowDeath=false;return 1})()');
   await until(()=>b.ev('!!document.querySelector("[data-action=wake-flight]")'),'retry',60000);await wake(b);
   cycles.push({atS:Math.round((Date.now()-t0)/1000),retryMs:Date.now()-c0,heapMB:+(await b.ev('performance.memory.usedJSHeapSize'))/1048576,canvases:await b.ev('document.querySelectorAll("canvas").length'),nodes:await b.ev('document.getElementsByTagName("*").length')});
   console.log('cycle',JSON.stringify(cycles.at(-1)));
  }
  const raw=await end(b);
  // Per-minute frame stats to look for drift.
  const raf=pairs(raw.raf,2),ticks=pairs(raw.ticks,4);const perMin=[];
  for(let m=0;m*60000<raw.t1-raw.t0;m++){const a=raw.t0+m*60000,z=a+60000;perMin.push({minute:m+1,frame:stats(raf.filter(r=>r[0]>=a&&r[0]<z).map(r=>r[1])),tick:stats(ticks.filter(r=>r[0]>=a&&r[0]<z&&r[2]===0).map(r=>r[1])),heapMB:+(Math.max(0,...pairs(raw.heap,2).filter(h=>h[0]>=a&&h[0]<z).map(h=>h[1]))/1048576).toFixed(1)})}
  // Thin raw arrays to keep the file small.
  raw.raf=[];raw.ticks=[];raw.renders=[];raw.hud=[];
  return {raw,extra:{cycles,perMinute:perMin}};
 },
};

// ---- suite expansion -------------------------------------------------------
let jobs=[];
if(A.suite==='biomes'){const courses=String(A.courses||'1').split(',');for(const biome of BIOMES)for(const course of courses)jobs.push({name:`flight-${biome}-c${course}`,fn:flightScenario({biome,course,cardset:A.cardset||'plain'})});}
else for(const s of String(A.scenarios||'flight').split(',')){if(!scenarios[s])throw Error('Unknown scenario '+s);jobs.push({name:s+(A.tag?'-'+A.tag:''),fn:scenarios[s]()});}

const srv=await startServer(root,Number(A.port||0));
const results=[];
try{
 for(const throttle of throttles)for(const job of jobs)for(let r=1;r<=runs;r++){
  const name=`${job.name}-${throttle}x-r${r}`;process.stdout.write(name+' ... ');
  const b=await launch({headed:!!A.headed});
  try{
   await emulatePhone(b,{throttle});
   let profiling=false;
   if(A.profile){await b.send('Profiler.enable');await b.send('Profiler.setSamplingInterval',{interval:500});}
   // Profiling starts at measurement begin via a hook on begin(): approximate by starting now for flights.
   const origEv=b.ev;
   if(A.profile){b.ev=async(expr,...x)=>{if(!profiling&&expr.includes('P.recording=true')){profiling=true;await b.send('Profiler.start');}return origEv(expr,...x)};}
   const t=Date.now();const {raw,extra}=await job.fn(b,srv.base);
   let profile=null;if(profiling){const p=(await b.send('Profiler.stop')).profile;await fs.writeFile(path.join(out,name+'.cpuprofile'),JSON.stringify(p));profile=profileSummary(p);}
   const sum=summarize(raw);
   if(A.shot)await b.shot(path.join(out,name+'.png'));
   const row={name,job:job.name,throttle,run:r,label,root,wallS:Math.round((Date.now()-t)/1000),...sum,extra,profile,pageErrors:b.errors.slice(-10)};
   await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(row,null,1));
   results.push(row);
   console.log(`frame p50 ${sum.frame.p50.toFixed(1)} p95 ${sum.frame.p95.toFixed(1)} p99 ${sum.frame.p99.toFixed(1)} max ${sum.frame.max.toFixed(0)} >33:${sum.frame.over33} tick p95 ${sum.tickCpu.p95.toFixed(1)} LT ${sum.longTasks.count}/${sum.longTasks.max}ms heap ${sum.heap.startMB}->${sum.heap.endMB}MB paints/s ${sum.paintsPerS} bake ${JSON.stringify(sum.bake)}${sum.errors.length?' ERR '+sum.errors[0]:''}`);
  }catch(e){console.log('FAILED',e.message);results.push({name,job:job.name,throttle,run:r,label,failed:e.message,pageErrors:b.errors.slice(-5)});await b.shot(path.join(out,name+'-failed.png')).catch(()=>{});}
  finally{await b.close();}
 }
}finally{srv.close();}
await fs.writeFile(path.join(out,`suite-${A.suite||A.scenarios||'flight'}${A.tag?'-'+A.tag:''}-${throttles.join('_')}x-${Date.now()}.json`),JSON.stringify(results.map(r=>({...r,canvases:undefined,profile:r.profile?{byFile:r.profile.byFile,self:r.profile.self.slice(0,25)}:null})),null,1));
