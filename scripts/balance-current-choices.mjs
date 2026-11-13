// Run with --importOnly so the shared economy model does not launch campaigns.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {simulateFlow,inventory,rngFor} from './balance-current-economy.mjs';
import {getGlowCapacity,getLifeCapacity} from '../dist/vitality.mjs';
import {createRestInspectorState} from '../dist/rest-inspector.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const[k,...rest]=v.replace(/^--/,'').split('=');return[k,rest.join('=')||true]}));
assert.ok(args.importOnly,'Pass --importOnly');
const average=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length),median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)]||0;
const roles=['collector','protector','leveler','swift'],roots=['main-efficiency','main-sight','main-speed'];
const artifacts=Object.keys(M.ARTIFACTS),marginals=[];
const builds={starter:{'main-efficiency':1},efficient:{'main-efficiency':1,'main-lift':1},light:{'main-sight':1,'main-dawnburst':1,'main-echo-sight':1},touch:{'main-efficiency':1,'main-kindled-touch':1}};
for(let seed=0;seed<8;seed++)for(const role of roles)for(const [build,skills]of Object.entries(builds))for(const style of ['learning','steady','practiced']){
 const state=M.newState();state.profile.difficulty=6;const run=M.createRun(state.profile,'choice-'+seed,seed%2?3:1);run.companions=[role];run.companionRole=role;run.skills=skills;
 run.current=M.getChoices(run)[seed%M.getChoices(run).length];const inv=inventory(run.current,run.difficulty),random=()=>rngFor(`${seed}:${style}`);
 const baseline=simulateFlow(run,inv,style,random());
 for(const id of artifacts){
  const next={...run,artifacts:[id],artifactCharges:{}};const outcome=simulateFlow(next,inv,style,random(),{cacheBonusDelta:id==='glass-lantern'&&args.glassBonus!=null?Number(args.glassBonus)-M.ARTIFACTS[id].modifiers.cacheFuelBonus:0});
  marginals.push({seed,role,build,style,id,income:outcome.condensedGlow-baseline.condensedGlow,sparedLifts:baseline.emptyLifts-outcome.emptyLifts,remaining:(outcome.flame-baseline.flame)*.3,spent:(outcome.spent-baseline.spent)*.3});
 }
}
const artifactSummary=artifacts.map(id=>{const a=marginals.filter(r=>r.id===id);return{id,n:a.length,meanIncome:average(a.map(r=>r.income)),meanSparedLifts:average(a.map(r=>r.sparedLifts)),meanRemaining:average(a.map(r=>r.remaining)),worseFuelCases:a.filter(r=>r.sparedLifts<0).length,negativeIncomeCases:a.filter(r=>r.income<0).length}});

// Static marginal signatures ignore obsolete fields unused by the current engine.
const signature=run=>{const m=M.getRunModifiers(run);delete m.flapCost;delete m.artifactIds;delete m.artifactCharges;return JSON.stringify({...m,maxLives:getLifeCapacity(run),recovery:M.getRecoveryRules(run),capacity:getGlowCapacity(run)})};
let skillComparisons=0;const zeroSkills=[];
for(let seed=0;seed<40;seed++)for(const role of roles)for(const root of roots){
 const state=createRestInspectorState(),r=state.run;r.mapIndex=2;r.skills={[root]:1};r.startingSkill=root;r.skillPaid={};r.artifacts=seed%2?['quiet-cinder']:[];r.companions=[role];r.companionRole=role;r.condensedGlow=1e8;r.restReady=true;r.phase='map';
 const random=rngFor(`${seed}:${role}:${root}`);
 for(let depth=0;depth<8;depth++){
  const eligible=Object.keys(M.SKILLS).filter(id=>['main',role,'afterglow'].includes(M.SKILLS[id].branch)&&M.getSkillCost(M.getSkillWallet(state),id)!==null);
  if(!eligible.length)break;
  for(const id of eligible){
   const copy=structuredClone(r),before=signature(copy);copy.skills[id]=(copy.skills[id]||0)+1;skillComparisons++;
   if(signature(copy)===before&&!['main-bond','main-spare-spark','main-deep-reserve'].includes(id)&&!id.startsWith('main-artifact-slot'))zeroSkills.push({id,role,skills:{...r.skills},artifacts:r.artifacts});
  }
  const id=eligible[Math.floor(random()*eligible.length)];if(!M.buyCheckpointSkill(state,id))break;
 }
}

// Rest choices are compared on the same next flight, at low/medium/full fuel.
const rests=[];
for(const role of roles)for(const style of ['learning','steady','practiced'])for(const fuel of [10,50,100])for(const mapIndex of [0,1,2])for(let seed=0;seed<8;seed++){
 const state=createRestInspectorState();Object.assign(state.run,{mapIndex,flame:fuel,companions:[role],companionRole:role});
 const offers=M.getSupportChoices(state.run,state.profile);
 for(let pick=0;pick<offers.length;pick++){
  const s=structuredClone(state),r=s.run;assert.ok(M.resolveSupport(r,pick,s.profile));
  const next=M.getChoices(r)[0];r.current=next;const flow=simulateFlow(r,inventory(next,1),style,rngFor(`rest:${seed}:${style}`),{attrition:true});
  rests.push({role,style,fuel,mapIndex,seed,choice:offers[pick].id,success:flow.success,emptyLifts:flow.emptyLifts,wallet:r.condensedGlow+(flow.success?flow.condensedGlow:0),lives:r.lives,max:getGlowCapacity(r)*.3});
 }
}
const restSummary=[];for(const fuel of [10,50,100])for(const choice of [...new Set(rests.map(r=>r.choice))]){const a=rests.filter(r=>r.fuel===fuel&&r.choice===choice);restSummary.push({fuel:fuel*.3,choice,n:a.length,clearRate:average(a.map(r=>Number(r.success))),meanWallet:average(a.map(r=>r.wallet)),meanEmptyLifts:average(a.map(r=>r.emptyLifts))});}
const zeroSummary=[...new Set(zeroSkills.map(x=>x.id))].map(id=>({id,count:zeroSkills.filter(x=>x.id===id).length,example:zeroSkills.find(x=>x.id===id)}));
const report={artifactCases:marginals.length,artifactSummary,skillComparisons,zeroSummary,restCases:rests.length,restSummary,marginals,rests,limits:['Marginal fuel/income values do not price sight, safety, control or enjoyment.','Rest analysis evaluates one next flight, not the value of saved hearts across an entire campaign.','Production prices and effects; schedules and capture probabilities remain assumptions.']};
fs.writeFileSync(String(args.out||'work/clear-sparks-choices-baseline.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({artifactCases:report.artifactCases,skillComparisons,restCases:rests.length,zeroSummary,artifacts:artifactSummary.filter(a=>['glass-lantern','quiet-cinder','glow-wick','echo-vessel','hearth-bloom'].includes(a.id)),restSummary},null,2));
