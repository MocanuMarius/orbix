// Chrome trace of a heavy scenario: the longest main-thread tasks and what is inside them,
// plus totals per trace event name (style, layout, paint, GC, canvas, GPU waits).
//   node scripts/perf/trace.mjs --scenario=marsh --throttle=4 --seconds=6 [--root=dist] [--query=gl=0] [--out=file.json]
import fs from 'node:fs/promises';
import {startServer,launch,emulatePhone,delay,until} from './lib.mjs';
const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const B={cardset:'heavy',ins:'bell,,resonant',collector:'twin',late:'1'};
const Q={marsh:{biome:'marsh',course:'4',...B},coral:{biome:'coral',course:'2',giant:'1',...B},frost:{biome:'frost',course:'2',...B},'basalt-guardian':{biome:'basalt',course:'1',guardian:'hollow-sun',...B}};
const name=A.scenario||'marsh',throttle=Number(A.throttle||4);
const srv=await startServer(A.root||'dist');const b=await launch();
const events=[];b.rawSocket.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.method==='Tracing.dataCollected')events.push(...m.params.value)});
try{
 await emulatePhone(b,{throttle:1});
 const params=new URLSearchParams({mock:'boundary',cards:'1',seed:'perf-heavy',...Q[name]});for(const [k,v] of new URLSearchParams(A.query||''))params.set(k,v);
 await b.send('Page.navigate',{url:`${srv.base}/game.html?${params}`});
 await until(()=>b.ev('!!window.__perf?.bridge&&!!window.__perf.engine&&!!document.querySelector("[data-action=wake-flight]")'),'ready',120000,200);
 await b.ev('__perf.engine.ready.then(()=>1)');
 await b.ev(`(()=>{const P=__perf,e=P.engine;const src=e.layout.embers.filter(p=>!p.harmful&&['light','cluster','cache','dusk'].includes(p.kind)),add=[];for(const p of src)for(let i=1;i<4;i++)add.push({...p,id:p.id+'-x'+i,x:p.x+i*16,collected:false,feature:undefined,anchor:null});e.layout.embers.push(...add);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;P.lift=22;let a=0,f=0,n=0;P.onStep=(e,dt)=>{a+=dt;f+=dt;if(a>=.2){a=0;e.luminanceWaves.emit({x:e.distance+e.player.x,y:e.player.y,radius:260,source:'card',sourceKind:'card'})}if(!e.flashTether&&f>.5){f=0;e.collect({id:'pf'+(++n),kind:'sight',x:e.distance+e.player.x+30,y:e.player.y,phase:0,collected:false})}};return 1})()`);
 await b.send('Emulation.setCPUThrottlingRate',{rate:throttle});
 await b.send('Tracing.start',{traceConfig:{includedCategories:['devtools.timeline','disabled-by-default-devtools.timeline','v8','v8.execute','blink','cc','gpu','toplevel','disabled-by-default-v8.gc','blink.user_timing'],recordMode:'recordAsMuchAsPossible'},transferMode:'ReportEvents'});
 for(let i=0;i<12;i++){await b.tapSel('.entry-depart:not([disabled]),[data-action=wake-flight]');try{await until(()=>b.ev('!!(__perf.engine.running&&!__perf.engine.paused)'),'run',5000,100);break}catch{}}
 await delay(Number(A.seconds||6)*1000);
 const done=new Promise(r=>b.rawSocket.addEventListener('message',ev=>{if(JSON.parse(ev.data).method==='Tracing.tracingComplete')r()}));
 await b.send('Tracing.end');await done;
 if(A.out)await fs.writeFile(A.out,JSON.stringify({traceEvents:events}));
 // Renderer main thread = thread named CrRendererMain.
 const names=new Map();for(const e of events)if(e.name==='thread_name')names.set(e.pid+':'+e.tid,e.args.name);
 const main=[...names].filter(([,n])=>n==='CrRendererMain').map(([k])=>k);
 const onMain=events.filter(e=>main.includes(e.pid+':'+e.tid)&&e.ph==='X'&&e.dur);
 const tasks=onMain.filter(e=>e.name==='RunTask'||e.name==='ThreadControllerImpl::RunTask').sort((a,b)=>b.dur-a.dur);
 const t0=Math.min(...onMain.map(e=>e.ts));
 console.log('main-thread tasks over 100 ms:',tasks.filter(t=>t.dur>1e5).length,' longest:',tasks.slice(0,6).map(t=>`${(t.dur/1000).toFixed(0)}ms@${((t.ts-t0)/1e6).toFixed(2)}s`).join(' '));
 for(const t of tasks.slice(0,3)){
  const inside=onMain.filter(e=>e!==t&&e.ts>=t.ts&&e.ts+e.dur<=t.ts+t.dur);const by=new Map();for(const e of inside){by.set(e.name,(by.get(e.name)||0)+e.dur)}
  console.log(`\nTask ${(t.dur/1000).toFixed(0)} ms at ${((t.ts-t0)/1e6).toFixed(2)} s:`);console.log([...by].sort((a,b)=>b[1]-a[1]).slice(0,18).map(([n,d])=>`  ${(d/1000).toFixed(1).padStart(7)} ms ${n}`).join('\n'));
 }
 const tot=new Map();for(const e of onMain){tot.set(e.name,(tot.get(e.name)||0)+e.dur)}
 const span=(Math.max(...onMain.map(e=>e.ts+e.dur))-t0)/1e6;
 console.log(`\nMain thread totals (ms per second over ${span.toFixed(1)} s):`);console.log([...tot].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([n,d])=>`  ${(d/1000/span).toFixed(1).padStart(7)} ${n}`).join('\n'));
}finally{await b.close();srv.close();}
