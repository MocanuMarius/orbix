import fs from 'node:fs';
import {createHash} from 'node:crypto';
const options=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
process.argv.push('--importOnly');
const {simulate,summarize}=await import('./balance-current-flight.mjs');
const {runCase,aggregate}=await import('./balance-current-economy.mjs');
const tiers=(options.tiers||'1,3,6').split(',').map(Number),roles=(options.roles||'collector,protector,leveler,swift').split(','),styles=(options.styles||'steady,practiced').split(','),policies=(options.policies||'survival,companion').split(',');
const out=options.out||'work/coupled-balance.json',rows=[],flights=[];
const hashes=()=>Object.fromEntries(fs.readdirSync('dist').filter(f=>f.endsWith('.mjs')).map(f=>[f,createHash('sha256').update(fs.readFileSync('dist/'+f)).digest('hex')]));
const before=hashes(),started=Date.now();
for(let seed=0;seed<Number(options.seeds||1);seed++)for(const tier of tiers)for(const role of roles)for(const style of styles)for(const policy of policies){
 const row=runCase({seed,tier,role,style,policy,attrition:true,flightSimulator(run,style,attempt){
  const n=run.current,config={run:structuredClone(run),controllerSeed:attempt,skills:run.skills,fleet:run.companions,terrain:n.terrain,difficulty:tier,stage:n.row,role,style:style==='practiced'?'human150':style==='learning'?'human350':'human250',seed:`${run.seed}-${n.id}`,duration:n.duration,profile:n.elite?'gauntlet':'refuge',node:n};const record=simulate(config);for(const key of ['map','mapHistory','path','pendingRewards','attemptEntry'])delete config.run[key];record.configuration=config;
  record.campaign={seed,tier,role,style,policy,map:run.mapIndex,attempt,skills:{...run.skills},wallet:run.condensedGlow};flights.push(record);
  const result=record.result||{success:false,flame:record.endFuel,condensedGlow:0,condensedRemainder:run.condensedRemainder};
  return {...result,coverage:(record.direct+record.collector)/Math.max(1,record.available.filter(p=>p.fuel>0).length),starved:record.lowFuelAtDeath,fuelFailure:record.lowFuelAtDeath,collisionFailure:!result.success&&!record.lowFuelAtDeath};
 }});rows.push(row);
 const report={createdAt:new Date().toISOString(),seconds:(Date.now()-started)/1000,sourceUnchanged:JSON.stringify(before)===JSON.stringify(hashes()),hashes:before,scope:{tiers,roles,styles,policies,seeds:Number(options.seeds||1)},limitations:['60Hz production physics with delayed imperfect controller; not measured human win rates.','Controller has more precise trajectory information than a person.','Dream rehearsal is not performed; no free dream credit.','Sampled geometry gaps cannot prove every generated map reachable.','Fixed strategic policies do not exhaust possible builds.'],campaigns:aggregate(rows),byTier:Object.fromEntries(tiers.map(t=>[t,aggregate(rows.filter(r=>r.tier===t))])),flightSummary:summarize(flights),rows,flights};
 fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({campaign:rows.length,tier,role,style,policy,flights:row.flights,buys:row.buys,failures:row.failures,seconds:report.seconds}));
}
