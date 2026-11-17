// Multi-flight accumulation session through the real game flow (no reloads).
// node scripts/perf/session.mjs --flights=8 --throttle=2 [--hidden] [--pause] [--snapshots] [--root=dist] [--label=current]
// Starts a fresh profile: New game -> First Light practice route -> real run.
// After each flight: 20 s reference stretch stats, heap after forced GC,
// DOM nodes, listeners, live canvases and pixels, live rAF loops / timers.
import fs from 'node:fs/promises';
import path from 'node:path';
import {startServer,launch,emulatePhone,stats,delay,until} from './lib.mjs';

const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const flightsWanted=Number(A.flights||8),throttle=Number(A.throttle||2),ref=Number(A.ref||20),label=A.label||'current';
const out=path.resolve(A.out||'outputs/perf/session',label+(A.tag?'-'+A.tag:''));await fs.mkdir(out,{recursive:true});
const log=(...x)=>{console.log(...x);fs.appendFile(path.join(out,'log.txt'),x.join(' ')+'\n').catch(()=>{})};

// Live-resource tracker installed before any page script.
import {TRACK} from './track.mjs';

const srv=await startServer(A.root||'dist');const b=await launch({headed:!!A.headed});
await b.send('Page.addScriptToEvaluateOnNewDocument',{source:TRACK});
await b.send('HeapProfiler.enable');await b.send('DOMDebugger.getEventListeners').catch(()=>{});
await emulatePhone(b,{throttle});
const visible=`[...document.querySelectorAll("[data-action]")].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled}).map(e=>({a:e.dataset.action,id:e.dataset.id||'',t:e.textContent.trim().replace(/\\s+/g,' ').slice(0,40),state:e.dataset.routeState||''}))`;
const acts=()=>b.ev(visible);
const dismiss=async()=>{const p=await b.ev(`(()=>{const e=[...document.querySelectorAll('button,[role=button]')].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled&&/^(got it|ok|okay|yes|continue|start|begin|understood|next|done|take|claim|keep|collect|onward|depart|tap to depart|rest|open)$/i.test(e.textContent.trim())&&!['menu','settings'].includes(e.dataset.action)});if(!e)return null;e.click();return {t:e.textContent.trim()}})()`);if(!p)return false;return p.t};
const clickAct=async(a,id)=>{const sel=id?`[data-action="${a}"][data-id="${id}"]`:`[data-action="${a}"]`;return b.ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled});if(!e)return false;if(e.click)e.click();else e.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));return true})()`)};
async function listeners(){
 const out={};for(const [k,expr] of [['window','window'],['document','document']]){const {result}=await b.send('Runtime.evaluate',{expression:expr});const r=await b.send('DOMDebugger.getEventListeners',{objectId:result.objectId});out[k]=r.listeners.length;const by={};for(const l of r.listeners)by[l.type]=(by[l.type]||0)+1;out[k+'Types']=by;await b.send('Runtime.releaseObject',{objectId:result.objectId})}return out;
}
async function measureState(tag){
 await b.send('HeapProfiler.collectGarbage');await delay(300);await b.send('HeapProfiler.collectGarbage');
 const m=await b.metrics();const t=await b.ev('__track.snapshot()');const l=await listeners();
 const heap=await b.send('Runtime.getHeapUsage');
 const agg={};for(const [k,[n,p]] of Object.entries(t.byOriginRaw||{})){const m=k.match(/at (\S+) \(.*?([\w-]+\.mjs)/);const key=m?m[1]+' ['+m[2]+']':k.slice(0,60);agg[key]=agg[key]||[0,0];agg[key][0]+=n;agg[key][1]+=p}delete t.byOriginRaw;t.canvasByOrigin=Object.fromEntries(Object.entries(agg).sort((a,b)=>b[1][1]-a[1][1]).slice(0,15).map(([k,[n,p]])=>[k,n+' / '+(p/1e6).toFixed(2)+'MPx']));
 const sizes=await b.ev(`(async()=>{let cache=0;try{for(const k of await caches.keys()){const c=await caches.open(k);cache+=(await c.keys()).length}}catch{}return {cacheEntries:cache,storageKB:Math.round(JSON.stringify(localStorage).length/1024)}})()`);
 return {tag,heapUsedMB:+(heap.usedSize/1048576).toFixed(2),heapTotalMB:+(heap.totalSize/1048576).toFixed(2),nodes:m.Nodes,jsListeners:m.JSEventListeners,documents:m.Documents,frames:m.Frames,layoutObjects:m.LayoutObjects,...l,...t,...sizes};
}
async function snapshot(file){
 const chunks=[];const handler=ev=>{};let data='';
 // Stream chunks via raw socket messages: use takeHeapSnapshot with reportProgress false and collect addHeapSnapshotChunk events.
 return new Promise(async(resolve,reject)=>{
  const ws=b.rawSocket;if(!ws)return resolve(null);
  const on=e=>{const m=JSON.parse(e.data);if(m.method==='HeapProfiler.addHeapSnapshotChunk')chunks.push(m.params.chunk)};
  ws.addEventListener('message',on);
  try{await b.send('HeapProfiler.collectGarbage');await b.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false,captureNumericValue:false});ws.removeEventListener('message',on);await fs.writeFile(file,chunks.join(''));resolve(file)}catch(e){ws.removeEventListener('message',on);reject(e)}
 });
}

const begin=()=>b.ev(`(()=>{const P=__perf;for(const k in P.bake)P.bake[k]=0;for(const k of ['raf','ticks','renders','hud','longTasks','heap','scenes','marks'])P[k].length=0;P.recording=true;P.t0=performance.now();return 1})()`);
const end=()=>b.ev(`(()=>{const P=__perf;P.recording=false;const pr=(a,w)=>{const r=[];for(let i=0;i<a.length;i+=w)r.push(a.slice(i,i+w));return r};return {raf:pr(P.raf,2).map(x=>x[1]),tick:pr(P.ticks,4).filter(x=>x[2]===0).map(x=>x[1]),render:pr(P.renders,2).map(x=>x[1]),lt:pr(P.longTasks,2).filter(x=>x[0]>=P.t0).map(x=>x[1]),dur:(performance.now()-P.t0)/1000,scene:P.scene(),bake:{...P.bake},mean:0}})()`);

const flights=[];const steps=[];let flightNo=0,deathDone=false,lastScreen='',stuck=0;
const t0=Date.now();
try{
 await b.send('Page.navigate',{url:srv.base+'/game.html'});
 await until(()=>b.ev('!!window.__perf?.bridge'),'bridge',120000,200);await delay(2000);
 flights.push({flight:0,label:'home (before first flight)',state:await measureState('home')});
 if(!A.noref){const rf=await b.ev(`__perf.refFlight(${ref})`,ref*1000+120000);flights[0].reference={level:rf.level,frame:stats(rf.raf),tick:stats(rf.tick),render:stats(rf.render),longTasks:rf.lt.length,sim:+rf.sim.toFixed(1)};log('  reference(fresh)',rf.level,'frame p50',flights[0].reference.frame.p50.toFixed(1),'p95',flights[0].reference.frame.p95.toFixed(1),'tick p50',flights[0].reference.tick.p50.toFixed(2),'p95',flights[0].reference.tick.p95.toFixed(1));flights[0].stateAfterRef=await measureState('home-after-ref')}log('state0',JSON.stringify(flights[0].state));
 if(A.snapshots)await snapshot(path.join(out,'heap-0.heapsnapshot'));
 await clickAct('new-game');await delay(1500);
 if(!A.practice){for(const a of ['skip-practice','skip-practice-once','practice-skip-to-start','confirm-new-game']){if(await clickAct(a)){log('clicked',a);await delay(1200)}}}
 while(flightNo<flightsWanted&&Date.now()-t0<Number(A.maxMinutes||90)*60000){
  const screen=await b.ev('__perf.screen'),list=await acts();const has=a=>list.find(x=>x.a===a);
  steps.push({atS:Math.round((Date.now()-t0)/1000),screen,acts:list.map(x=>x.a+(x.id?':'+x.id:'')).join(' ')});
  if(screen!==lastScreen){log('screen',screen,'|',list.map(x=>x.a+(x.id?':'+x.id:'')+(x.state?'['+x.state+']':'')).join(' '));lastScreen=screen;stuck=0}else stuck++;
  if(stuck>40){log('STUCK on',screen,JSON.stringify(list));await b.shot(path.join(out,'stuck.png'));break}
  // ---- flight -------------------------------------------------------------
  if(screen==='flight'&&await b.ev('!!__perf.engine&&!__perf.engine.finished&&!__perf.engine.dying')){
   const entry=await b.ev(`(async()=>{const a=performance.now();await __perf.engine.ready;const lt=[];for(let i=0;i<__perf.longTasks.length;i+=2)if(__perf.longTasks[i]>performance.now()-15000)lt.push(__perf.longTasks[i+1]);return {waitMs:Math.round(performance.now()-a),longTaskMax:Math.round(Math.max(0,...lt)),longTaskSum:Math.round(lt.reduce((x,y)=>x+y,0))}})()`);
   flightNo++;const level=await b.ev('__perf.engine?.levelIdentity?.id||__perf.engine?.terrain');
   const live='!!(__perf.engine&&__perf.engine.running&&!__perf.engine.paused&&!__perf.engine.tutorialAwaitingLift)';
   for(let i=0;i<20&&!await b.ev(live);i++){if(!await b.tapSel('.entry-depart:not([disabled]),[data-action=wake-flight]'))if(!await dismiss())await b.click('#flap-btn',{optional:true});await delay(1200)}
   await delay(1000);await begin();const until0=Date.now()+ref*1000;let interrupts=0;
   while(Date.now()<until0){await delay(1000);if(!await b.ev(live)){interrupts++;await dismiss();await b.click('#flap-btn',{optional:true})}}
   const r=await end();
   const rec={flight:flightNo,level,interrupts,entry,bake:{...r.bake,terrainPerS:+(r.bake.terrain/r.dur).toFixed(1),terrainMsPerS:+(r.bake.terrainMs/r.dur).toFixed(1),bgPerS:+(r.bake.bg/r.dur).toFixed(2)},frameMean:+(r.raf.reduce((a,b)=>a+b,0)/Math.max(1,r.raf.length)).toFixed(2),scene:r.scene,frame:stats(r.raf),tick:stats(r.tick),render:stats(r.render),longTasks:r.lt.length,longTaskMax:Math.max(0,...r.lt),paintsPerS:+(r.render.length/r.dur).toFixed(1)};
   if(A.pause){await clickAct('menu');await delay(1500);await clickAct('resume');await until(()=>b.ev('!__perf.engine?.paused'),'resume',20000).catch(()=>{});await delay(4000);}
   if(A.hidden){const me=(await b.send('Target.getTargetInfo')).targetInfo.targetId;const {targetId}=await b.send('Target.createTarget',{url:'about:blank',background:false});await b.send('Target.activateTarget',{targetId});await delay(3000);
    const vis=await b.ev('document.visibilityState+" paused="+!!__perf.engine?.paused');await b.send('Target.activateTarget',{targetId:me});await b.send('Target.closeTarget',{targetId});await delay(1500);
    const vis2=await b.ev('document.visibilityState+" paused="+!!__perf.engine?.paused');log('  hidden test',vis,'->',vis2);
    if(await b.ev('!!__perf.engine?.paused')){await clickAct('resume');await until(()=>b.ev('!__perf.engine?.paused'),'resume after hide',20000).catch(()=>log('  could not resume after hide'));}await delay(4000);}
   if(flightNo===3&&!deathDone){ // one death + retry
    deathDone=true;await b.ev('(()=>{__perf.allowDeath=true;__perf.engine.beginDying("collision");return 1})()');
    await until(()=>b.ev('!!document.querySelector("[data-action=death-continue]")'),'death',30000).catch(()=>{});await delay(1500);await clickAct('death-continue');await delay(1000);await b.ev('(__perf.allowDeath=false,1)');
    rec.death=true;flights.push({...rec,state:await measureState('after-death-'+flightNo)});log('flight',flightNo,level,'DEATH','frame p50',rec.frame.p50.toFixed(1),'p95',rec.frame.p95.toFixed(1),'heap',flights.at(-1).state.heapUsedMB);continue;
   }
   // Clear: jump close to the exit and let the autopilot finish.
   await b.ev('(()=>{const e=__perf.engine;if(e.layout?.boss){}e.distance=e.previousDistance=Math.max(e.distance,e.totalDistance-500);return 1})()');
   await until(()=>b.ev('__perf.screen!=="flight"||!!__perf.engine?.finished'),'finish',180000,250).catch(async e=>{log('no finish',JSON.stringify(await b.ev('__perf.scene()')))});
   await delay(2500);
   flights.push({...rec,state:await measureState('after-flight-'+flightNo)});
   if(!A.noref){const rf=await b.ev(`__perf.refFlight(${ref})`,ref*1000+120000);flights.at(-1).reference={bake:rf.bake,level:rf.level,frame:stats(rf.raf),tick:stats(rf.tick),render:stats(rf.render),longTasks:rf.lt.length,sim:+rf.sim.toFixed(1)};log('  reference',rf.level,'frame p50',flights.at(-1).reference.frame.p50.toFixed(1),'p95',flights.at(-1).reference.frame.p95.toFixed(1),'p99',flights.at(-1).reference.frame.p99.toFixed(1),'tick p50',flights.at(-1).reference.tick.p50.toFixed(2),'p95',flights.at(-1).reference.tick.p95.toFixed(1),'render p50',flights.at(-1).reference.render.p50.toFixed(2),'bakes',rf.bake.terrain,'bakeMs',rf.bake.terrainMs.toFixed(0))}
   const s=flights.at(-1).state;log('flight',flightNo,level,'entryLT',entry.longTaskMax,'bake/s',rec.bake.terrainPerS,'bakeMs/s',rec.bake.terrainMsPerS,'bakeMax',rec.bake.terrainMax.toFixed(1),'mean',rec.frameMean,'frame p50',rec.frame.p50.toFixed(1),'p95',rec.frame.p95.toFixed(1),'p99',rec.frame.p99.toFixed(1),'tick p95',rec.tick.p95.toFixed(1),'| heap',s.heapUsedMB,'nodes',s.nodes,'listeners',s.jsListeners,'canvases',s.canvasesLive,s.canvasMPx+'MPx','raf',s.rafPending,JSON.stringify(s.rafSources),'intervals',s.intervals,'timeouts',s.timeoutsPending);
   if(A.snapshots&&(flightNo===1||flightNo===flightsWanted))await snapshot(path.join(out,`heap-${flightNo}.heapsnapshot`));
   continue;
  }
  // ---- once per map visit: open and close the Deck --------------------------
  if((screen==='map'||screen==='support'||screen==='rest-prep')&&has('cards')&&!steps.some(x=>x.deckFor===flightNo)){steps.at(-1).deckFor=flightNo;await clickAct('cards');await delay(2500);for(const a of ['close-sheet','card-done','cards-back','back-route','view-route'])if(await clickAct(a)){await delay(1200);break}continue;}
  if(screen==='support'&&has('support')){const opts=list.filter(x=>x.a==='support');await clickAct('support',opts[0].id);await delay(1000);if(await b.ev(`__perf.screen`)==='support'){await b.ev(`(()=>{const e=[...document.querySelectorAll('[data-action=support]')].filter(e=>e.getBoundingClientRect().width>0)[0];e?.click();return 1})()`);await delay(800);await dismiss();}await delay(700);continue;}
  if(screen==='rest-prep'&&has('view-route')){await clickAct('view-route');await delay(1200);continue;}
  // ---- between flights: generic progression -------------------------------
  const order=['keep-flight-reward','confirm-starting-gift','new-gift','confirm-gift','start-run','death-continue','retry','flight-reward-open-pack','flight-reward-continue','pick-reward','card-reward-continue','victory-next','reward-earnings','continue','dream-accept','dream-wake','next-map','launch','node','continue-run','close-power'];
  let done=false;
  for(const a of order){const x=has(a);if(x){
   if(a==='node'&&!list.some(y=>y.a==='node'&&y.state))await clickAct(a,x.id);else await clickAct(a,x.id);done=true;break}}
  if(!done){
   const next=list.find(x=>x.a==='preview-node'&&/Next stop|Choose|Available/i.test(x.t))||list.find(x=>x.a==='map-node'||x.a==='route-node');
   if(next){await clickAct(next.a,next.id);done=true;
    // Once per map visit, open and close the Deck like a player.
    if(!steps.some(s=>s.deckAt===flightNo)){steps.at(-1).deckAt=flightNo;}
   }
  }
  if(!done){
   // Rest / chest / sheets: click a button whose text looks like a confirmation.
   const p=list.find(x=>/rest|take|claim|open|continue|done|depart|accept|choose|keep|collect|onward|next/i.test(x.t)&&!/menu|settings|abandon|new game|skip/i.test(x.a));
   if(p){await clickAct(p.a,p.id);done=true}
  }
  if(!done&&await dismiss())done=true;
  if(!done){await delay(800)}
  await delay(700);
 }
 // Final accounting.
 await fs.writeFile(path.join(out,'session.json'),JSON.stringify({label,throttle,ref,flags:{hidden:!!A.hidden,pause:!!A.pause},wallMinutes:+((Date.now()-t0)/60000).toFixed(1),flights,steps},null,1));
 log('DONE flights',flightNo);
}catch(e){log('FAILED',e.stack);await b.shot(path.join(out,'failed.png')).catch(()=>{});await fs.writeFile(path.join(out,'session.json'),JSON.stringify({label,throttle,failed:e.message,flights,steps},null,1));}
finally{await b.close();srv.close();}
