import fs from 'node:fs';
import {balanceSourceHashes} from './balance-source-hashes.mjs';
const options=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
process.argv.push('--importOnly');
const M=await import('../dist/model.mjs');
const {runCase,aggregate}=await import('./balance-current-economy.mjs');
const {simulate,summarize}=await import('./balance-current-flight.mjs');
const out=options.out||'work/balance-starting-gift-usage.json',rows=[],flights=[];
const hashes=balanceSourceHashes;
const before=hashes(),start=Date.now();
for(const [index,id] of M.STARTING_GIFT_IDS.entries()){
 const tier=1+index%2,profile=M.newState().profile;profile.difficulty=6;
 let seed;
 for(let candidate=0;candidate<2000;candidate++){
  const run=M.createRun(profile,`condensed-${candidate}-${tier}`,tier);
  if(M.getStartingGiftOffers(run).some(g=>g.id===id)){seed=candidate;break;}
 }
 if(seed===undefined)throw Error('No legal offer for '+id);
 const policy=['focused-survival','focused-storage','focused-collector'][index%3];
 const row=runCase({seed,tier,role:'collector',style:'steady',policy,startingSkill:id,attrition:true,flightSimulator(run,style,attempt){
  const n=run.current,c={run:structuredClone(run),controllerSeed:attempt,skills:run.skills,fleet:run.companions,terrain:n.terrain,difficulty:tier,stage:n.row,role:'collector',style:'human250',seed:`${run.seed}-${n.id}`,duration:n.duration,profile:n.elite?'gauntlet':'refuge',node:n};
  const record=simulate(c);record.gift=id;record.mapIndex=run.mapIndex;record.buildPolicy=policy;record.artifacts=[...run.artifacts];flights.push(record);
  const r=record.result||{success:false,flame:record.endFuel,condensedGlow:0,condensedRemainder:run.condensedRemainder};
  return {...r,coverage:(record.direct+record.collector)/Math.max(1,record.available.filter(p=>p.fuel>0).length),starved:record.lowFuelAtDeath,fuelFailure:record.lowFuelAtDeath,collisionFailure:!r.success&&!record.lowFuelAtDeath};
 }});
 if(row.startingSkill!==id)throw Error('Wrong offered gift selected');rows.push(row);
 console.log(JSON.stringify({gift:id,seed,tier,flights:row.flights,buys:row.buys,complete:row.success,seconds:+((Date.now()-start)/1000).toFixed(1)}));
}
const report={createdAt:new Date().toISOString(),seconds:(Date.now()-start)/1000,sourceHashes:before,sourceUnchanged:JSON.stringify(before)===JSON.stringify(hashes()),
 coverage:{gifts:rows.length,relics:[...new Set(flights.flatMap(r=>r.artifacts).filter(Boolean))],dreamFlights:flights.filter(r=>r.rehearsals?.length).length},summary:aggregate(rows),flightSummary:summarize(flights),rows,flights,
 limitations:['Every gift is selected from a genuine seeded two-gift offer. Seed search chooses the first matching offer, not a favorable route.',
 'This coverage pass is not a causal ranking of gifts: different seed, tier and build policy contexts confound individual results.',
 'Physics and production artifacts, charges, Dream inputs, resource settlement and skill purchases are real. Player attention and response are assumed scenarios.']};
fs.writeFileSync(out,JSON.stringify(report));console.log(JSON.stringify({out,sourceUnchanged:report.sourceUnchanged,coverage:report.coverage,summary:report.summary}));
