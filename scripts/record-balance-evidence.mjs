import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {balanceSourceHashes} from './balance-source-hashes.mjs';
const read=name=>JSON.parse(fs.readFileSync('work/'+name+'.json'));
const hashes=balanceSourceHashes();
const stable=r=>{
 assert.equal(r.sourceUnchanged,true);
 assert.deepEqual(r.sourceHashes||r.hashes,hashes,'Evidence must describe the current runtime and controller');
};
const starter=read('supply-starter-final'),solver=read('supply-starter-solver-counterexample');
const earned=[read('supply-earned-final'),read('supply-earned-tier2-final'),read('supply-earned-tier6-final')];
const campaign=read('supply-coupled-final'),gifts=read('supply-gifts-final'),inventory=read('supply-density-final');
for(const r of [starter,solver,...earned,campaign,gifts])stable(r);
assert.equal(starter.scope.levels,48);assert.deepEqual(starter.scope.stages,[0,1,2]);
assert.equal(starter.cases,1152);assert.equal(starter.belowThresholdClears.length,0);
assert.equal(solver.cases,288);assert.equal(solver.belowThresholdClears.length,0);
assert.equal(inventory.cases,1296);assert.equal(inventory.excess.length,0);assert.equal(inventory.deficit.length,0);
assert.equal(campaign.campaigns.n,144);assert.equal(gifts.coverage.gifts,20);
for(const r of earned){assert.equal(r.cases,576);assert.equal(r.scope.levels,48);assert.equal(r.unwitnessed.length,0);}
const flights=[...starter.rows,...solver.rows,...earned.flatMap(r=>r.rows),...campaign.flights,...gifts.flights];
for(const f of flights){
 assert.equal(f.sparkSupply.budgetExcess,0,f.levelId);
 assert.equal(f.sparkSupply.budgetDeficit,0,f.levelId);
}
const progression=read('progression-final');
assert.equal(progression.sourceStableDuringRun,true);assert.equal(progression.sourceMatchesCurrent,true);
const campaignCoverage={guardians:[...new Set(campaign.flights.map(f=>f.configuration.node.bossId).filter(Boolean))],
 relics:[...new Set(campaign.flights.flatMap(f=>f.configuration.run.artifacts||[]).filter(Boolean))]};
assert.equal(campaignCoverage.guardians.length,6);
const report={release:'spark-progression-1',createdAt:new Date().toISOString(),
 sourceFingerprint:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),
 affectedRuntimeHashes:Object.fromEntries(['dist/flight.mjs','dist/ascent.mjs','dist/spark-supply.mjs','dist/flight-objectives.mjs','dist/route-bonuses.mjs','dist/model.mjs','dist/condensed-glow.mjs'].map(k=>[k,hashes[k]])),
 inventory:{cases:inventory.cases,excess:0,deficit:0},
 starter:{scope:starter.scope,cases:starter.cases,groups:Object.fromEntries(Object.entries(starter.groups).map(([k,v])=>[k,v.all])),belowThresholdClears:0},
 fasterSolver:{cases:solver.cases,belowThresholdClears:0,purpose:'Falsification check, not a human difficulty estimate'},
 earnedBuilds:earned.map(r=>({scope:r.scope,reference:r.reference,cases:r.cases,unwitnessed:0,summary:r.summary.all})),
 campaigns:{scope:campaign.scope,coverage:campaignCoverage,summary:campaign.campaigns,byTier:campaign.byTier,progression:progression.byTier},
 gifts:{coverage:gifts.coverage,summary:gifts.summary},
 limitations:['60% means available fuel value for the bare starter; purchased skills, gifts and relics can lower the required share.',
 'Reaction and visibility profiles are explicit assumptions, not fitted human distributions. Modeled win rates are not player win predictions.',
 'A successful witness across all course groups is evidence of sampled playability, not a proof for every seed or build.',
 'Fixed-build tier stress tests use legally earned builds from the first-tier cohort, rather than claiming those builds were earned in that harder campaign.',
 'Runtime hashes precede the release cache-token-only stamp. Raw scenario logs stay in ignored work/.']};
fs.writeFileSync('docs/spark-balance-evidence.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({written:'docs/spark-balance-evidence.json',flightScenarios:flights.length,sourceFingerprint:report.sourceFingerprint}));
