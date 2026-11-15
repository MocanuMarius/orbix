import fs from 'node:fs';
import {COMPANION_ABILITIES,getCompanionUnlock} from '../dist/companion-abilities.mjs';
import {balanceSourceHashes} from './balance-source-hashes.mjs';
const options=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
process.argv.push('--importOnly');
const {simulate,summarize}=await import('./balance-current-flight.mjs');
const {runCase,aggregate}=await import('./balance-current-economy.mjs');
const tiers=(options.tiers||'1,3,6').split(',').map(Number),roles=options.roles?options.roles.split(','):Object.keys(COMPANION_ABILITIES).filter(id=>getCompanionUnlock(id).selectable),styles=(options.styles||'steady,practiced').split(','),policies=(options.policies||'survival,companion').split(',');
const startingChoices=(options.startingChoices||'0').split(',').map(Number);
const out=options.out||'work/coupled-balance.json',rows=[],flights=[];
const hashes=balanceSourceHashes;
const before=hashes(),started=Date.now();
for(let seed=0;seed<Number(options.seeds||1);seed++)for(const tier of tiers)for(const role of roles)for(const style of styles)for(const policy of policies)for(const startingChoice of startingChoices){
 const row=runCase({seed,tier,role,style,policy,startingChoice,attrition:true,flightSimulator(run,style,attempt){
  const n=run.current,config={run:structuredClone(run),controllerSeed:attempt,skills:run.skills,fleet:run.companions,terrain:n.terrain,difficulty:tier,stage:n.row,role,style:style==='practiced'?'human150':style==='learning'?'human350':'human250',seed:`${run.seed}-${n.id}`,duration:n.duration,profile:n.elite?'gauntlet':'refuge',node:n};const record=simulate(config);for(const key of ['map','mapHistory','path','pendingRewards','attemptEntry'])delete config.run[key];record.configuration=config;
  record.campaign={seed,tier,role,style,policy,startingChoice,map:run.mapIndex,attempt,skills:{...run.skills},wallet:run.condensedGlow};flights.push(record);
  const result=record.result||{success:false,flame:record.endFuel,condensedGlow:0,condensedRemainder:run.condensedRemainder};
  return {...result,coverage:(record.direct+record.collector)/Math.max(1,record.available.filter(p=>p.fuel>0).length),starved:record.lowFuelAtDeath,fuelFailure:record.lowFuelAtDeath,collisionFailure:!result.success&&!record.lowFuelAtDeath};
 }});rows.push(row);
 const report={createdAt:new Date().toISOString(),seconds:(Date.now()-started)/1000,sourceUnchanged:JSON.stringify(before)===JSON.stringify(hashes()),hashes:before,scope:{tiers,roles,styles,policies,startingChoices,seeds:Number(options.seeds||1)},limitations:['60Hz production physics with delayed imperfect controller; not measured human win rates.','Human controllers sample illuminated cues and use assumed response and attention limits. Device and player measurements would be needed to estimate human completion rates.','Dream builds use production recording and replay with up to eight imperfect rehearsals, without spending run hearts or earning currency. Nightmare uses its real prediction and once-per-map limit; dialog and slowdown wall time are omitted.','Sampled geometry gaps cannot prove every generated map reachable.','Policies include casual affordable purchases and explicit focused saving plans; route choice avoids recently failed nodes where alternatives are reachable. These do not exhaust possible builds.'],campaigns:aggregate(rows),byTier:Object.fromEntries(tiers.map(t=>[t,aggregate(rows.filter(r=>r.tier===t))])),flightSummary:summarize(flights),rows,flights};
 fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({campaign:rows.length,tier,role,style,policy,flights:row.flights,buys:row.buys,failures:row.failures,seconds:report.seconds}));
}
