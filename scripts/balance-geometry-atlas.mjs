import fs from 'node:fs';
process.argv.push('--importOnly');
const {diagnoseLayout,canvas}=await import('./balance-current-flight.mjs');
const {WispFlight}=await import('../dist/flight.mjs');
const {BIOME_LEVELS}=await import('../dist/level-catalog.mjs');
const rows=[];
for(const difficulty of [1,2,3,4,5,6])for(const level of BIOME_LEVELS)for(const mapIndex of [0,1,2])for(let seed=0;seed<2;seed++){
 const node={row:mapIndex?5:0,mapIndex,difficulty,levelId:level.id,biomeId:level.biomeId,terrain:level.terrain,flightLengthScale:1};
 const key=`audit-${seed}-${difficulty}-${level.id}-${mapIndex}`;
 const e=new WispFlight({canvas:canvas(),node,seed:key,terrain:level.terrain,duration:mapIndex?130:110,companions:['collector'],flame:100});
 rows.push({difficulty,level:level.id,mapIndex,seed,diagnostic:diagnoseLayout(e,key),budget:e.layout.glowBudget});e.destroy();
}
fs.writeFileSync('work/geometry-atlas.json',JSON.stringify({layouts:rows.length,blocked:rows.filter(r=>r.diagnostic.emptyBodyCrossSections.length),shortfalls:rows.filter(r=>r.budget?.shortfall),rows},null,2));
console.log(JSON.stringify({layouts:rows.length,blocked:rows.filter(r=>r.diagnostic.emptyBodyCrossSections.length).length,shortfalls:rows.filter(r=>r.budget?.shortfall).length}));
