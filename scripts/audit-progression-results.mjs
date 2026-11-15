import fs from 'node:fs';
import {balanceSourceHashes} from './balance-source-hashes.mjs';
const options=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const source=options.report||'work/supply-coupled-paced.json';
const report=JSON.parse(fs.readFileSync(source));
const key=c=>[c.seed,c.tier,c.role,c.style,c.policy,c.startingChoice].join(':');
const mean=values=>values.length?values.reduce((n,x)=>n+x,0)/values.length:null;
const round=n=>n==null?null:Math.round(n*10000)/10000;
const byTier={};
for(const tier of report.scope.tiers){
 const all=report.flights.filter(f=>f.difficulty===tier);
 // Compare the same campaign cohort at every chapter. Comparing all early
 // failures with only successful survivors later creates a selection bias.
 const matched=new Set(all.filter(f=>f.campaign.map===2).map(f=>key(f.campaign)));
 const chapters=[];
 for(const map of [0,1,2]){
  const flights=all.filter(f=>f.campaign.map===map&&matched.has(key(f.campaign)));
  const ids=[...new Set(flights.map(f=>key(f.campaign)))];
  const perCampaign=ids.map(id=>{
   const items=flights.filter(f=>key(f.campaign)===id);
   return items.filter(f=>f.success).length/items.length;
  });
  chapters.push({map:map+1,campaigns:ids.length,attempts:flights.length,
   clearShare:round(mean(flights.map(f=>Number(f.success)))),
   equallyWeightedCampaignClearShare:round(mean(perCampaign)),
   meanCaptureShare:round(mean(flights.map(f=>f.capturedFuelShare))),
   lowFuelFailureShare:round(mean(flights.map(f=>Number(f.lowFuelAtDeath)))),
   meanLiftCost:round(mean(flights.map(f=>f.flapCost*.3))),
   meanRealHardWindows:round(mean(flights.map(f=>f.actualHardWindows))),
   meanProgress:round(mean(flights.map(f=>f.progress)))});
 }
 byTier[tier]={matchedCampaigns:matched.size,chapters};
}
const hashes=balanceSourceHashes(),matches=Object.entries(report.hashes).every(([k,v])=>hashes[k]===v);
const out={source,sourceStableDuringRun:report.sourceUnchanged,sourceMatchesCurrent:matches,byTier,
 limitations:['A reached-third-chapter cohort controls survivor selection between chapters; it still excludes campaigns that never reached chapter three.',
 'These are outcomes of assumed human-limited controllers, not calibrated human win probabilities.',
 'Do not infer monotonically increasing difficulty from a single small sample or compare tiers with no matched campaigns.']};
fs.writeFileSync(options.out||'work/progression-audit.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out));
