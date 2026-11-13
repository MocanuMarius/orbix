import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {getLifeCapacity} from '../dist/vitality.mjs';

function setup(role='collector'){
 const s=M.newState();s.profile.difficulty=6;s.run=M.createRun(s.profile,'value-probe',1);
 s.run.mapIndex=2;s.run.victoryPending=true;s.run.embers=100000;s.run.companions=[role];s.run.companionRole=role;
 return s;
}
function prerequisites(s,id){
 const node=M.SKILLS[id];assert.ok(node,`Missing ${id}`);
 if(node.branch==='afterglow'&&!s.run.afterglowUnlocked){prerequisites(s,'main-afterglow');assert.ok(M.buyCheckpointSkill(s,'main-afterglow'));}
 for(const parent of Array.isArray(node.requires)?node.requires:node.requires?[node.requires]:[]){
  if(s.run.skills[parent])continue;prerequisites(s,parent);assert.ok(M.buyCheckpointSkill(s,parent),`Cannot learn prerequisite ${parent}`);
 }
}
function signature(r){return{...M.getRunModifiers(r),recovery:M.getRecoveryRules(r),afterglow:M.getAfterglowRules(r.skills),lifeCapacity:getLifeCapacity(r),companionCapacity:M.getCompanionCapacity(r),artifactCapacity:M.getArtifactCapacity(r)};}
const deltas=[];
for(const node of Object.values(M.SKILLS)){
 const role=['main','afterglow'].includes(node.branch)?'collector':node.branch,s=setup(role);prerequisites(s,node.id);
 for(let rank=1;rank<=node.maxRank;rank++){
  const before=signature(s.run),cost=M.getSkillCost(M.getSkillWallet(s),node.id);assert.ok(cost>0,`Inaccessible ${node.id} rank${rank}`);
  assert.ok(M.buyCheckpointSkill(s,node.id),`Rejected ${node.id} rank${rank}`);const after=signature(s.run);
  const changed=Object.keys(after).filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
  assert.ok(changed.length,`No engine/model effect from ${node.id} rank${rank}`);deltas.push({id:node.id,rank,cost,changed});
 }
}
// Every intended eight-purchase focus plan has legal prerequisites, meaningful
// changes and a functional signature before the final boss. These fixtures
// inspect effects, not earnings or a claim of human completion rates.
const plans={
 Light:{role:'collector',gift:'main-sight',ids:['main-glow-sense','main-echo-sight','main-dawnburst','main-horizon','main-dream','main-echo-long','main-dream-long','main-dream-sight']},
 Motion:{role:'collector',gift:'main-speed',ids:['main-drift-sense','main-drift','main-tailwind','main-drift-sense-2','main-light-step','main-drift-sense-3','main-soft-current','main-efficiency']},
 Glow:{role:'collector',gift:'main-efficiency',ids:['main-kindled-touch','main-recovery','main-reservoir','main-afterglow','main-kindled-rich','main-recovery-deep','main-lift','main-recovery-rescue']},
 Collector:{role:'collector',gift:'main-efficiency',ids:['collector-attunement','collector-reach-step-1','collector-mastery','collector-reach-step-2','collector-reach','collector-rich-cargo','main-afterglow','main-reservoir']},
 Protector:{role:'protector',gift:'main-efficiency',ids:['protector-attunement','protector-cost','protector-recovery-step-1','protector-mastery','protector-recovery-step-2','protector-recovery','protector-clean-break','main-recovery']},
 Runner:{role:'swift',gift:'main-speed',ids:['swift-attunement','swift-duration','swift-recovery-step-1','swift-mastery','swift-recovery-step-2','swift-recovery','swift-rapid-spark','main-drift-sense']},
 'Space Timer':{role:'leveler',gift:'main-efficiency',ids:['leveler-attunement','leveler-duration','leveler-steadiness-step-1','leveler-mastery','leveler-steadiness-step-2','leveler-steadiness','leveler-long-balance','main-speed']},
};
const focus={};
for(const[name,plan]of Object.entries(plans)){
 const s=setup(plan.role);s.run.mapIndex=0;s.run.victoryPending=false;assert.ok(M.chooseStartingSkill(s,plan.gift));
 const before=signature(s.run);let spent=0;
 for(const id of plan.ids){const cost=M.getSkillCost(M.getSkillWallet(s),id);assert.ok(cost>0,`${name} cannot reach ${id}`);assert.ok(M.buyCheckpointSkill(s,id));spent+=cost;}
 const after=signature(s.run);focus[name]={spent,changed:Object.fromEntries(Object.entries(after).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(before[key])).map(([key,value])=>[key,{before:before[key],after:value}]))};
}
const report={catalogNodes:Object.keys(M.SKILLS).length,pricedPurchases:deltas.length,zeroEffectPurchases:0,focus};
fs.writeFileSync('work/skill-value-probe.json',JSON.stringify({report,deltas},null,2));console.log(JSON.stringify(report));
