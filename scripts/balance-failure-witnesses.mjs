import fs from 'node:fs';
process.argv.push('--importOnly');
const {simulate}=await import('./balance-current-flight.mjs');
const source=JSON.parse(fs.readFileSync('work/coupled-full.json'));
const unique=new Map();for(const f of source.flights)if(!f.success&&f.configuration){const k=[f.seed,f.role,JSON.stringify(f.configuration.skills)].join(':');if(!unique.has(k))unique.set(k,f);}
const rows=[];for(const original of unique.values()){
 const attempts=[];for(const style of ['fuel','safety']){const r=simulate({...original.configuration,style});attempts.push({style,success:r.success,fatalCause:r.fatalCause,progress:r.progress,endFuel:r.endFuel});if(r.success)break;}
 rows.push({seed:original.seed,level:original.levelId,tier:original.difficulty,role:original.role,originalProgress:original.progress,reachableWitness:attempts.some(r=>r.success),attempts});
 if(rows.length%10===0)console.log(JSON.stringify({checked:rows.length,total:unique.size,witnesses:rows.filter(r=>r.reachableWitness).length}));
}
fs.writeFileSync('work/coupled-witnesses.json',JSON.stringify({sourceCampaigns:source.rows.length,n:rows.length,witnesses:rows.filter(r=>r.reachableWitness).length,unresolved:rows.filter(r=>!r.reachableWitness),rows},null,2));
