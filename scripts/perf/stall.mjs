// Find what runs inside the longest main-thread stall after wake in a heavy scenario.
//   node scripts/perf/stall.mjs --scenario=marsh --throttle=4 --seconds=5 [--root=dist] [--query=gl=0]
// Profiles from wake, then reports the longest contiguous run of non-idle samples
// (the long task) with its self-time and inclusive breakdown.
import path from 'node:path';
import {startServer,launch,emulatePhone,delay,until} from './lib.mjs';
const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const B={cardset:'heavy',ins:'bell,,resonant',collector:'twin',late:'1'};
const Q={marsh:{biome:'marsh',course:'4',...B},coral:{biome:'coral',course:'2',giant:'1',...B},frost:{biome:'frost',course:'2',...B},'basalt-guardian':{biome:'basalt',course:'1',guardian:'hollow-sun',...B}};
const name=A.scenario||'marsh',throttle=Number(A.throttle||4);
const srv=await startServer(A.root||'dist');const b=await launch();
try{
 await emulatePhone(b,{throttle:1});await b.send('Profiler.enable');await b.send('Profiler.setSamplingInterval',{interval:250});
 const params=new URLSearchParams({mock:'boundary',cards:'1',seed:'perf-heavy',...Q[name]});for(const [k,v] of new URLSearchParams(A.query||''))params.set(k,v);
 await b.send('Page.navigate',{url:`${srv.base}/game.html?${params}`});
 await until(()=>b.ev('!!window.__perf?.bridge&&!!window.__perf.engine&&!!document.querySelector("[data-action=wake-flight]")'),'ready',120000,200);
 await b.ev('__perf.engine.ready.then(()=>1)');
 await b.send('Emulation.setCPUThrottlingRate',{rate:throttle});
 if(A.load!=='0')await b.ev(`(()=>{const P=__perf,e=P.engine;P.lift=22;let a=0,f=0,n=0;P.onStep=(e,dt)=>{a+=dt;f+=dt;if(a>=.2){a=0;e.luminanceWaves.emit({x:e.distance+e.player.x,y:e.player.y,radius:260,source:'card',sourceKind:'card'})}if(!e.flashTether&&f>.5){f=0;e.collect({id:'pf'+(++n),kind:'sight',x:e.distance+e.player.x+30,y:e.player.y,phase:0,collected:false})}};return 1})()`);
 await b.send('Profiler.start');
 for(let i=0;i<12;i++){await b.tapSel('.entry-depart:not([disabled]),[data-action=wake-flight]');try{await until(()=>b.ev('!!(__perf.engine.running&&!__perf.engine.paused)'),'run',5000,100);break}catch{}}
 await delay(Number(A.seconds||5)*1000);
 const {profile}=await b.send('Profiler.stop');
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of nodes.values())for(const c of n.children||[])parent.set(c,n.id);
 const isIdle=id=>{const f=nodes.get(id).callFrame.functionName;return f==='(idle)'};
 // Longest run of consecutive non-idle samples.
 let best=[0,0,0],start=0,t=0,runT=0;const times=[];for(let i=0;i<profile.samples.length;i++){t+=profile.timeDeltas[i];times.push(t)}
 for(let i=0;i<profile.samples.length;i++){if(isIdle(profile.samples[i])){start=i+1;continue}const dur=times[i]-times[start];if(dur>best[2])best=[start,i,dur]}
 const [a,z,dur]=best;console.log(`longest busy run ${(dur/1000).toFixed(0)} ms at ${(times[a]/1e6).toFixed(2)} s after profile start`);
 const self=new Map(),incl=new Map();const key=n=>`${n.callFrame.functionName||'(anon)'} ${path.basename((n.callFrame.url||'').split('?')[0])}:${n.callFrame.lineNumber+1}`;
 for(let i=a;i<=z;i++){const us=profile.timeDeltas[i+1]||0;let id=profile.samples[i];const k=key(nodes.get(id));self.set(k,(self.get(k)||0)+us);const seen=new Set();while(id){const kk=key(nodes.get(id));if(!seen.has(kk)){seen.add(kk);incl.set(kk,(incl.get(kk)||0)+us)}id=parent.get(id)}}
 const top=(m,n)=>[...m].sort((x,y)=>y[1]-x[1]).slice(0,n).map(([k,us])=>`${(us/1000).toFixed(0).padStart(6)} ms  ${k}`).join('\n');
 console.log('SELF\n'+top(self,20)+'\nINCLUSIVE\n'+top(incl,40));
}finally{await b.close();srv.close();}
