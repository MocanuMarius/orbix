import fs from 'node:fs';
process.argv.push('--importOnly');
const {simulate,buildCase,summarize}=await import('./balance-current-flight.mjs');
const {BIOME_LEVELS}=await import('../dist/level-catalog.mjs');
const all=process.argv.includes('--all');
const levels=all?BIOME_LEVELS:BIOME_LEVELS.filter((_,i)=>i%4===0);
const records=[];
if(process.argv.includes('--routes')){
 const M=await import('../dist/model.mjs');
 for(let seed=0;seed<12;seed++){
  const state=M.newState();state.profile.difficulty=2;const run=M.createRun(state.profile,`starter-a2-${seed}`,2);
  for(const node of M.getChoices(run))for(const style of ['human150','human250']){
   const r=structuredClone(run);M.selectNode(r,node.id);const n=r.current;
   records.push(simulate({run:r,skills:r.skills,fleet:r.companions,terrain:n.terrain,difficulty:2,stage:n.row,role:'collector',style,seed:`${r.seed}-${n.id}`,duration:n.duration,profile:n.elite?'gauntlet':'refuge',node:n}));
  }
 }
}else for(const level of levels)for(const style of ['human150','human250']){
 const c=buildCase({terrain:level.terrain,difficulty:2,stage:0,role:'collector',style,skills:{}});
 c.seed+=':'+level.id;Object.assign(c.node,{levelId:level.id,biomeId:level.biomeId,locationName:level.name});
 records.push(simulate(c));console.log(JSON.stringify({done:records.length,total:levels.length*2,last:records.at(-1).success}));
}
fs.writeFileSync(process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'work/collector-opening.json',JSON.stringify({summary:summarize(records),records},null,2));
console.log(JSON.stringify(summarize(records).all));
