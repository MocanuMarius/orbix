// Production physics, visibility-limited input, and counterfactual fuel capture.
// This is a scenario suite, not a fitted estimate of human completion rates.
import fs from 'node:fs';
import {balanceSourceHashes} from './balance-source-hashes.mjs';
const options=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
process.argv.push('--importOnly');
const {simulate,buildCase,summarize}=await import('./balance-current-flight.mjs');
const {BIOME_LEVELS}=await import('../dist/biomes.mjs');
const {getFlightLengthProfile}=await import('../dist/level-length.mjs');
const {onboardingFlightPlan}=await import('../dist/onboarding.mjs');
const tiers=(options.tiers||'1,2').split(',').map(Number),styles=(options.styles||'human150,human250,human350').split(',');
const envelopes=(options.envelopes||'all,0.599').split(',');
const seeds=Number(options.seeds||1),out=options.out||'work/balance-spark-supply.json';
const hashes=balanceSourceHashes;
const sourceHashes=hashes(),start=Date.now(),rows=[];
const levels=BIOME_LEVELS.filter(l=>!options.firstVariants||l.variant===0);
for(const level of levels)for(const tier of tiers)for(let seedIndex=0;seedIndex<seeds;seedIndex++)for(const style of styles)for(const envelope of envelopes){
 const c=buildCase({terrain:level.terrain,difficulty:tier,stage:0,role:'collector',style,seedIndex});
 Object.assign(c.node,{levelId:level.id,biomeId:level.biomeId});
 c.seed=`supply-physics:${level.id}:${tier}:${seedIndex}`;
 c.duration=getFlightLengthProfile({seed:c.seed,row:0,mapIndex:0}).duration;
 if(options.onboarding)c.onboardingPlan=onboardingFlightPlan({}, {mapIndex:0,stats:{flights:0}});
 c.captureOrder=options.captureOrder||'stratified';
 if(envelope!=='all')c.captureEnvelope=Number(envelope);
 const r=simulate(c);r.envelope=envelope;rows.push(r);
 if(rows.length%24===0)console.log(JSON.stringify({cases:rows.length,seconds:+((Date.now()-start)/1000).toFixed(1)}));
}
const belowThresholdClears=rows.filter(r=>r.success&&r.capturedFuelShare<.6-1e-7);
const groups=Object.fromEntries(envelopes.map(e=>[e,summarize(rows.filter(r=>r.envelope===e))]));
const report={sourceHashes,sourceUnchanged:JSON.stringify(sourceHashes)===JSON.stringify(hashes()),createdAt:new Date().toISOString(),seconds:(Date.now()-start)/1000,
 scope:{levels:levels.length,tiers,styles,seeds,envelopes,onboarding:!!options.onboarding,captureOrder:options.captureOrder||'stratified'},cases:rows.length,belowThresholdClears,groups,rows,
 limitations:['Reaction, attention, timing jitter and planning horizon are stated scenario assumptions, not measured player distributions.',
 'Counterfactuals hide seeded forgone fuel from the controller while retaining the full field as the denominator; no collection quota exists in the game.',
 'These bare starter cases do not represent a progressed build. Coupled campaigns separately spend actual earned rewards and use seeded gifts and relics.',
 'Passing sampled courses does not prove every random seed or every possible path.']};
fs.writeFileSync(out,JSON.stringify(report));
console.log(JSON.stringify({out,cases:rows.length,sourceUnchanged:report.sourceUnchanged,belowThresholdClears:belowThresholdClears.map(r=>({level:r.levelId,tier:r.difficulty,share:r.capturedFuelShare})),
 summary:Object.fromEntries(Object.entries(groups).map(([e,g])=>[e,g.all]))}));
if(belowThresholdClears.length)process.exitCode=1;
