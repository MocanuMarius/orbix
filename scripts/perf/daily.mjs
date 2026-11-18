// Once-a-day performance check (not a release gate). About 10-15 minutes.
//   node scripts/perf/daily.mjs            (uses dist/)
//   node scripts/perf/daily.mjs --root=<dist folder> --quick
// Runs: a 6-flight accumulation session (2x CPU throttle, phone emulation) and the
// three heaviest scenarios found in the November 2026 investigation (4x throttle):
// chain (5-card Echo/Refrain chain + extra pickups + Pulses), pickups10 (10x Sparks), collector (twin Collectors).
// Saves outputs/perf/daily/<date>.json, compares with the most recent earlier day
// and prints PASS / REGRESSED per metric (tolerance: 15% and an absolute floor).
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const root=A.root||'dist',day=new Date().toISOString().slice(0,10),dir=path.resolve('outputs/perf/daily'),raw=path.join(dir,'raw',day);
await fs.mkdir(raw,{recursive:true});
// --quick (under 3 minutes): only the two 8 s scenarios; the multi-flight session (leak check) is skipped.
const WORST=(A.scenarios||(A.quick?'chain,collector':'chain,pickups10,collector')).split(',');
const node=(script,args)=>{const r=spawnSync(process.execPath,[script,...args],{stdio:'inherit'});if(r.status)console.log(script,'exited',r.status)};

const flights=A.quick?2:6;
if(!A.quick)node('scripts/perf/session.mjs',[`--root=${root}`,`--flights=${flights}`,'--throttle=2','--ref=15',`--out=${raw}`,'--label=session',A.quick?'--maxMinutes=1.6':'--maxMinutes=30',...(A.quick?['--noref']:[])]);
node('scripts/perf/run.mjs',[`--root=${root}`,`--scenarios=${WORST.join(',')}`,'--throttle=4','--runs=1',`--seconds=${A.quick?8:15}`,`--out=${raw}`,'--label=scenarios']);

const metrics={};
if(!A.quick)try{
 const s=JSON.parse(await fs.readFile(path.join(raw,'session','session.json'),'utf8'));
 const done=s.flights.filter(f=>f.state&&f.flight>0),first=done[0],last=done.at(-1);
 metrics['session.flights']=done.length;
 metrics['session.heapGrowthMBPerFlight']=+((last.state.heapUsedMB-first.state.heapUsedMB)/Math.max(1,done.length-1)).toFixed(2);
 metrics['session.canvasMPxAfterLast']=last.state.canvasMPx;
 metrics['session.nodesAfterLast']=last.state.nodes;
 metrics['session.rafLoopsBetweenFlights']=Math.max(...done.map(f=>f.state.rafPending));
 const refs=s.flights.filter(f=>f.reference);
 if(refs.length){metrics['reference.firstTickP95']=+refs[0].reference.tick.p95.toFixed(2);metrics['reference.lastTickP95']=+refs.at(-1).reference.tick.p95.toFixed(2);metrics['reference.lastFrameP95']=+refs.at(-1).reference.frame.p95.toFixed(1);}
}catch(e){metrics['session.error']=e.message}
for(const name of WORST){
 try{const r=JSON.parse(await fs.readFile(path.join(raw,'scenarios',`${name}-4x-r1.json`),'utf8'));
  metrics[`${name}.frameP95`]=+r.frame.p95.toFixed(1);metrics[`${name}.tickP95`]=+r.tickCpu.p95.toFixed(1);metrics[`${name}.over33`]=r.frame.over33;metrics[`${name}.heapAllocMBps`]=r.heap.allocMBperS;
 }catch(e){metrics[`${name}.error`]=e.message}
}
const today={day,root,metrics};
await fs.writeFile(path.join(dir,day+'.json'),JSON.stringify(today,null,1));
const prev=(await fs.readdir(dir)).filter(f=>/^\d{4}-\d\d-\d\d\.json$/.test(f)&&f<day+'.json').sort().at(-1);
console.log(`\nDaily performance ${day}`+(prev?` vs ${prev.slice(0,10)}`:' (no earlier day saved: baseline written)'));
let regressed=0;
const old=prev?JSON.parse(await fs.readFile(path.join(dir,prev),'utf8')).metrics:{};
const floor={frameP95:3,tickP95:2,over33:10,heapAllocMBps:.5,heapGrowthMBPerFlight:.3,canvasMPxAfterLast:2,nodesAfterLast:200,rafLoopsBetweenFlights:0,TickP95:1,FrameP95:3,flights:0};
for(const [k,v] of Object.entries(metrics)){
 if(typeof v!=='number'){console.log(`  ERROR     ${k}: ${v}`);regressed++;continue}
 const o=old[k];if(typeof o!=='number'){console.log(`  NEW       ${k}: ${v}`);continue}
 const f=Object.entries(floor).find(([s])=>k.endsWith(s))?.[1]??0;
 const higherIsWorse=!k.endsWith('.flights');
 const bad=higherIsWorse?(v>o*1.15&&v-o>f):(v<o);
 if(bad)regressed++;
 console.log(`  ${bad?'REGRESSED':'pass     '} ${k}: ${o} -> ${v}`);
}
console.log(regressed?`\n${regressed} metric(s) regressed. Raw data: ${raw}`:'\nAll metrics within tolerance.');
