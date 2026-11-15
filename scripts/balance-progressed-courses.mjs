// Cross-course stress using builds actually purchased in a coupled campaign.
import fs from 'node:fs';
import {balanceSourceHashes} from './balance-source-hashes.mjs';
const options=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
process.argv.push('--importOnly');
const {simulate,summarize}=await import('./balance-current-flight.mjs');
const {BIOME_LEVELS}=await import('../dist/biomes.mjs');
const {getFlightLengthProfile}=await import('../dist/level-length.mjs');
const reference=JSON.parse(fs.readFileSync(options.reference||'work/supply-coupled-dream-builds.json'));
const policies=(options.policies||'focused-survival,focused-storage,focused-collector').split(',');
const out=options.out||'work/balance-progressed-courses.json',rows=[];
const hashes=balanceSourceHashes;
const before=hashes(),start=Date.now(),templates=[];
for(const mapIndex of [1,2])for(const stage of [0,5])for(const policy of policies){
 const candidates=reference.flights.filter(f=>f.campaign.map===mapIndex&&f.campaign.policy===policy&&f.difficulty===1&&!f.configuration.node.boss);
 const target=stage===0?Math.min(...candidates.map(f=>f.configuration.node.encounterStage)):Math.max(...candidates.map(f=>f.configuration.node.encounterStage));
 const witness=candidates.find(f=>f.configuration.node.encounterStage===target);
 if(!witness)throw Error('No genuinely earned build for '+[mapIndex,stage,policy]);
 templates.push({mapIndex,stage,policy,sourceCampaign:witness.campaign,configuration:witness.configuration});
}
function configurationFor(level,template,style='human250',controllerSeed=0){
 const c=structuredClone(template.configuration),{mapIndex,stage,policy}=template;
 c.style=style;c.controllerSeed=controllerSeed;c.seed=`progressed-supply:${level.id}:${mapIndex}:${stage}:${policy}`;
 Object.assign(c.node,{levelId:level.id,biomeId:level.biomeId,terrain:level.terrain,encounterStage:stage,row:stage,mapIndex,elite:false,boss:false,bossId:null,encounterFamily:null,mapTheme:null,bonusId:null});
 c.terrain=level.terrain;c.stage=stage;c.profile='refuge';
 c.duration=getFlightLengthProfile({seed:c.seed,row:stage,mapIndex}).duration;c.node.duration=c.duration;
 c.run.current=c.node;c.run.mapIndex=mapIndex;return c;
}
for(const level of BIOME_LEVELS)for(const template of templates){
 const record=simulate(configurationFor(level,template));record.buildPolicy=template.policy;record.sourceBuild=template.sourceCampaign;rows.push(record);
 if(rows.length%24===0)console.log(JSON.stringify({cases:rows.length,planned:BIOME_LEVELS.length*templates.length,seconds:+((Date.now()-start)/1000).toFixed(1)}));
}
const groups=new Map();for(const r of rows){const key=[r.levelId,r.sourceBuild.map,r.stage].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
const retryWitnesses=[];
for(const [key,items]of groups){
 if(items.some(r=>r.success))continue;
 const level=BIOME_LEVELS.find(l=>l.id===items[0].levelId);
 const candidates=templates.filter(t=>t.mapIndex===items[0].sourceBuild.map&&t.stage===items[0].stage);
 let found=false;
 for(const template of candidates){
  for(const style of ['human150','human250'])for(const inputSeed of [1,2,3]){
   const result=simulate(configurationFor(level,template,style,inputSeed));
   retryWitnesses.push({key,buildPolicy:template.policy,style,inputSeed,success:result.success,progress:result.progress,lowFuel:result.lowFuelAtDeath});
   if(result.success){found=true;break;}
  }
  if(found)break;
 }
}
const unwitnessed=[...groups].filter(([key,items])=>!items.some(r=>r.success)&&!retryWitnesses.some(r=>r.key===key&&r.success))
 .map(([key,items])=>({key,cases:items.map(r=>({policy:r.buildPolicy,lowFuel:r.lowFuelAtDeath,progress:r.progress}))}));
const report={createdAt:new Date().toISOString(),seconds:(Date.now()-start)/1000,sourceHashes:before,sourceUnchanged:JSON.stringify(before)===JSON.stringify(hashes()),
 scope:{levels:BIOME_LEVELS.length,maps:[1,2],stages:[0,5],policies},templates,cases:rows.length,retryWitnesses,unwitnessed,summary:summarize(rows),rows,
 limitations:['Each build was actually bought and equipped using earned campaign rewards, not granted as a perfect end-game loadout.',
 'Transplanting that legal build to another course tests resource and terrain viability; it is not a claim that every procedural route produces the same relics.',
 'No guardian attacks or authored encounter-family overrides in this ordinary-course census. Coupled campaigns cover those separately.',
 'Human250 is an assumed delayed visible-cue controller, not a measured population win rate.']};
fs.writeFileSync(out,JSON.stringify(report));console.log(JSON.stringify({out,cases:rows.length,sourceUnchanged:report.sourceUnchanged,unwitnessed:unwitnessed.length,summary:report.summary.all}));
