// Deterministic income scenarios through the production campaign model.
// Synthetic successful flights, not an estimate of human collection or survival.
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';
const results=[];
for(const overflow of [0,15,40])for(const role of ['collector','protector','swift','leveler'])for(let seed=0;seed<12;seed++){
 const s=M.newState();s.profile.difficulty=4;s.run=M.createRun(s.profile,`checkpoint-${seed}`,1);
 const r=s.run;r.companions=[role];r.companionRole=role;M.chooseStartingSkill(s,'main-efficiency');
 const row={overflow,role,seed,flights:0,clearIncome:0,purchases:0,spend:0,rests:0};
 let turns=0;
 while(!r.banked){
  assert.ok(turns++<160,'campaign must progress');
  if(r.victoryPending){
   const reward=r.flightReward;
   if(!reward.claimed){
    if(!reward.permanent&&!reward.evolution&&r.stats.flights%3===0)assert.ok(M.chooseFlightReward(s,'melt'));
    else assert.ok(M.chooseFlightReward(s,reward.offers[0],r.artifacts.filter(Boolean).length>=M.getArtifactCapacity(r)?0:null));
   }
   if(!reward.permanent){
    for(let i=0;i<20;i++){
     const wallet=M.getSkillWallet(s),id=M.getAvailableUpgrades(s).sort((a,b)=>M.getSkillCost(wallet,a)-M.getSkillCost(wallet,b))[0];
     if(!id)break;
     const cost=M.getSkillCost(wallet,id);assert.ok(M.buyCheckpointSkill(s,id));row.purchases++;row.spend+=cost;
    }
   }
   assert.ok(M.acknowledgeVictory(s));continue;
  }
  if(r.phase==='ended'){assert.ok(M.bankRun(s));break;}
  if(r.phase==='map-clear'){assert.ok(M.advanceMap(r));continue;}
  if(r.phase==='map'){
   const choices=M.getChoices(r),node=choices.find(n=>n.kind==='camp')||choices.find(n=>!n.elite)||choices[0];
   assert.ok(node);assert.ok(M.selectNode(r,node.id));continue;
  }
  if(r.phase==='briefing'){
   assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:true,flame:getGlowCapacity(r)*.5,condensedGlow:overflow,collected:5}));
   row.flights++;row.clearIncome+=r.lastFlight.completionBonus;
   const before=r.condensedGlow,expected=r.pendingCondensedGlow;
   assert.equal(M.settleCheckpoint(s),expected);assert.equal(r.condensedGlow-before,expected);assert.equal(M.settleCheckpoint(s),0);continue;
  }
  if(r.phase==='support'){
   const choices=M.getSupportChoices(r,s.profile);let index=choices.findIndex(c=>c.id==='rest-grow'&&!c.disabled);
   if(index<0)index=0;
   const camp=r.current.kind==='camp',wallet=r.condensedGlow;
   let resolved=M.resolveSupport(r,index,s.profile);
   if(!resolved)for(let j=0;j<choices.length&&!resolved;j++)resolved=M.resolveSupport(r,j,s.profile);
   assert.ok(resolved);
   if(camp){row.rests++;assert.equal(r.condensedGlow,wallet);assert.equal(r.flame,getGlowCapacity(r));}
   M.settleCheckpoint(s);continue;
  }
  throw Error(`Unhandled phase ${r.phase}`);
 }
 assert.ok(r.success);assert.equal(row.clearIncome,20*(row.flights-1));
 results.push({...row,remaining:r.condensedGlow});
}
const mean=(rows,key)=>Math.round(rows.reduce((n,r)=>n+r[key],0)/rows.length*100)/100;
console.log(JSON.stringify({kind:'synthetic income scenarios; no human balance claim',runs:results.length,
 policy:'One free Vitality root; cheapest available skills; one reward in three melted; prefer Rest; all flights succeed.',
 scenarios:[0,15,40].map(overflow=>{const rows=results.filter(r=>r.overflow===overflow);return{overflowPerFlight:overflow,runs:rows.length,flights:mean(rows,'flights'),guaranteedIncome:mean(rows,'clearIncome'),paidRanks:mean(rows,'purchases'),rankRange:[Math.min(...rows.map(r=>r.purchases)),Math.max(...rows.map(r=>r.purchases))],remaining:mean(rows,'remaining')};})},null,2));
