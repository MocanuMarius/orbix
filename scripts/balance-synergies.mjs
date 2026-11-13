import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {WispCompanion} from '../dist/wisp.mjs';
import {pickupContactRadius} from '../dist/pickups.mjs';
import {getRouteForecast} from '../dist/route-forecast.mjs';
const roles=['collector','protector','leveler','swift','seer','kindler'];
const combos=(items,k)=>{const rows=[];function visit(start,chosen){if(chosen.length===k){rows.push(chosen);return;}for(let i=start;i<items.length;i++)visit(i+1,[...chosen,items[i]]);}visit(0,[]);return rows;};
const chain=(id,s={})=>{const node=M.SKILLS[id];if(node.requires)chain(node.requires,s);s[id]=1;return s;};
const legalCost=skills=>{const wallet={skills:{},afterglowUnlocked:true,mapIndex:2};let cost=0;for(let pass=0;pass<10;pass++){let added=false;for(const [id,r]of Object.entries(skills))if((wallet.skills[id]||0)<r){const price=M.getSkillCost(wallet,id);if(price!==null){cost+=price;wallet.skills[id]=(wallet.skills[id]||0)+1;added=true;}}if(!added)break;}assert.deepEqual(wallet.skills,skills);return cost;};
const artifactIds=Object.keys(M.ARTIFACTS),arts=[[],...combos(artifactIds,1),...combos(artifactIds,2),...combos(artifactIds,3)];
const mains=[{}];
const mainLeaves=M.MAIN_WISP_BRANCHES.map(b=>Object.values(M.SKILLS).filter(s=>s.expansion&&(!s.incrementStage||s.incrementStage===3)&&b.leaves.includes(s.trackParent||s.requires)));
for(const a of mainLeaves[0])for(const b of mainLeaves[1])for(const c of mainLeaves[2])mains.push({...chain(a.id),...chain(b.id),...chain(c.id)});
const variants=Object.fromEntries(roles.map(role=>[role,[{id:'base',skills:{}},...Object.values(M.SKILLS).filter(s=>s.branch===role&&s.expansion).map(s=>({id:s.id,skills:{...chain(s.id),[role+'-mastery']:1}}))]]));
const fleets=[...combos(roles,1),...combos(roles,2),...combos(roles,3)],builds=[];
for(const fleet of fleets){
 const add=(i,skills,ids)=>{if(i===fleet.length){builds.push({fleet,skills:{...skills,...(fleet.length>1?{'main-bond':fleet.length-1}:{})},ids});return;}for(const v of variants[fleet[i]])add(i+1,{...skills,...v.skills},[...ids,v.id]);};add(0,{},[]);
}
// Full deepest singleton paths x all 64 main endings x every 0–3 artifact set.
// Every multi-companion legal ending is additionally checked against all artifact
// sets, cycling the main endings deterministically to bound runtime.
let configurations=0,artifactMarginals=0;const range={},deadArtifacts=[],rolePaths=[];
for(let i=0;i<builds.length;i++){
 const build=builds[i],cost=legalCost(build.skills);
 if(build.fleet.length===1)rolePaths.push({role:build.fleet[0],path:build.ids[0],cost,mod:M.getRunModifiers({...build,companions:build.fleet,artifacts:[]})});
 const mainSets=build.fleet.length===1?mains:[mains[i%mains.length]];
 for(const main of mainSets)for(const artifacts of arts){
  const input={skills:{...build.skills,...main},companions:build.fleet,artifacts},m=M.getRunModifiers(input);configurations++;
  for(const [key,value]of Object.entries(m))if(typeof value==='number'){assert.ok(Number.isFinite(value));const r=range[key]??={min:value,max:value};r.min=Math.min(r.min,value);r.max=Math.max(r.max,value);}
  assert.ok(m.flapCost>=.5&&m.flapCost<=1.25&&m.flap<=1.2&&m.attract<=2.5&&m.protectorLayers<=2&&m.swiftResistance<=.94);
  for(const role of ['leveler','swift','seer'])assert.ok(m[role+'Duration']<m[role+'Recovery'],'permanent active uptime: '+role);
  // Single artifacts are enough to isolate their marginal effect; combinations
  // above still cover shared caps. Only role-applicable artifacts are audited.
  if(artifacts.length===1){const id=artifacts[0],role=({'moss-heart':'kindler','wayfinder-seed':'collector','iron-petal':'protector','storm-knot':'swift','hollow-bell':'leveler','dawn-thread':'seer'})[id];if(role&&!build.fleet.includes(role))continue;
   const base=M.getRunModifiers({...input,artifacts:[]});artifactMarginals++;
   if(!Object.keys(M.ARTIFACTS[id].modifiers).some(k=>Math.abs(m[k]-base[k])>1e-8))deadArtifacts.push({id,fleet:build.fleet,skills:input.skills});
  }
 }
}
assert.equal(deadArtifacts.length,0,'equipped applicable artifact must have an effect');
// Expanded companion tradeoffs must disappear when that companion is unequipped.
let unequippedChecks=0;
for(const role of roles)for(const v of variants[role].slice(1)){
 const leaf=v.id,s={...v.skills};delete s[leaf];const other=role==='collector'?'seer':'collector';
 assert.deepEqual(M.getRunModifiers({skills:s,companions:[other]}),M.getRunModifiers({skills:v.skills,companions:[other]}));unequippedChecks++;
}
// Measure Collector recovery using its real state machine under imperfect lateral
// contacts. This open-air stream is a throughput comparison, not a survival test.
const collectorStreams=[];
for(const variant of variants.collector)for(const interval of [1,1.25,1.5,1.75,2,2.5,3,4,6])for(const offset of [24,40,55,70,90,110,130]){
 const mod=M.getRunModifiers({skills:variant.skills,companions:['collector']}),packets=[];
 for(let t=2;t<120;t+=interval)packets.push({id:t,kind:'light',value:1,x:98+t*154,y:310+offset,collected:false});
 const e={time:0,distance:0,player:{x:98,y:310},mod,companions:['collector'],wispBoost:0,layout:{embers:packets},hasCompanion:r=>r==='collector',getNearbyPickups:()=>packets,isCompanionWorking:()=>true,collect:p=>{p.collected=true;},reducedMotion:true};
 const w=new WispCompanion(e.player);for(let frame=0;frame<120*60;frame++){e.time+=1/60;e.distance+=154/60;w.update(e,1/60);}
 collectorStreams.push({path:variant.id,interval,offset,opportunities:packets.length,delivered:packets.filter(p=>p.collected).length,range:w.range(e),regrowth:w.cooldownMax});
}
// Reward replay, failure, reset, life cap, staged Bond and artifact ownership.
let invariantCases=0;
for(let seed=0;seed<80;seed++){
 const s=M.newState();s.run=M.createRun(s.profile,'integrity-'+seed);const r=s.run;
 M.chooseStartingSkill(s,'main-efficiency');assert.equal(M.getSkillCost(M.getSkillWallet(s),'main-bond'),null);
 for(let guard=0;r.phase!=='ended'&&guard<100;guard++){
  if(r.phase==='map'){const choices=M.getChoices(r),n=choices.find(n=>n.kind==='camp')||choices[0];assert.ok(M.selectNode(r,n.id));}
  else if(r.phase==='briefing'){assert.ok(M.beginFlightAttempt(r));const before=r.embers,skills=JSON.stringify(r.skills);assert.ok(M.finishFlight(r,{success:false,embers:9999,flame:100}));assert.equal(M.settleCheckpoint(s),0);assert.equal(r.embers,before);assert.equal(JSON.stringify(r.skills),skills);if(r.phase==='retry'){M.retryFlight(r);M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:70,embers:12,collected:5});M.settleCheckpoint(s);const credited=r.embers;assert.equal(M.settleCheckpoint(s),0);assert.equal(r.embers,credited);}}
  else if(r.phase==='support'){const choices=M.getSupportChoices(r,s.profile),i=Math.max(0,choices.findIndex(o=>o.effect.lives));M.resolveSupport(r,i,s.profile);M.settleCheckpoint(s);}
  else if(r.phase==='map-clear')M.advanceMap(r);
 }
 assert.equal(r.phase,'ended');M.bankRun(s);const p=JSON.stringify(s.profile);assert.equal(M.bankRun(s),false);assert.equal(JSON.stringify(s.profile),p);
 const next=M.createRun(s.profile,'fresh-'+seed);assert.equal(next.embers,0);assert.deepEqual(next.skills,{});invariantCases++;
}
for(const mapIndex of [0,1,2])for(const bondRank of [0,1]){
 const wallet={skills:{'main-bond':bondRank},mapIndex};assert.equal(M.getSkillCost(wallet,'main-bond')!==null,mapIndex>=bondRank+1);invariantCases++;
}
for(let seed=0;seed<24;seed++){
 const s=M.newState();s.run=M.createRun(s.profile,'hearth-'+seed);const r=s.run;
 M.chooseStartingSkill(s,'main-efficiency');
 M.selectNode(r,M.getChoices(r).find(n=>n.routeLane===0).id);M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:35,embers:0});M.settleCheckpoint(s);
 M.selectNode(r,M.getChoices(r).find(n=>n.kind==='camp').id);r.lives=1;r.embers=1000;
 const i=M.getSupportChoices(r,s.profile).findIndex(o=>o.effect.lives);assert.ok(M.resolveSupport(r,i,s.profile));
 assert.equal(r.lives,3);assert.ok(M.buyCheckpointSkill(s,'main-spare-spark'));assert.equal(r.lives,4);assert.ok(M.buyCheckpointSkill(s,'main-deep-reserve'));assert.equal(r.lives,5);assert.equal(M.getSkillCost(M.getSkillWallet(s),'main-deep-reserve'),null);
 // Reach the actual third map via model transitions and inspect every start.
 while(r.mapIndex<2){
  if(r.phase==='map')M.selectNode(r,M.getChoices(r)[0].id);
  else if(r.phase==='briefing'){M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:70,embers:0});M.settleCheckpoint(s);}
  else if(r.phase==='support'){const offers=M.getSupportChoices(r,s.profile);M.resolveSupport(r,Math.max(0,offers.findIndex(o=>!o.effect.emberCost&&!o.effect.upgrade&&!o.effect.sell)),s.profile);M.settleCheckpoint(s);}
  else if(r.phase==='map-clear')M.advanceMap(r);
 }
 assert.equal(r.map[5].length,1);assert.ok(r.map[5].every(n=>n.kind==='camp'&&n.name==='The Last Hearth'));
 for(const n of M.getChoices(r))assert.ok(getRouteForecast(r,n).restGuaranteed);
 invariantCases++;
}
let bossRuns=0;const state=M.newState();
for(let seed=0;seed<12;seed++){
 state.run=M.createRun(state.profile,'boss-progression-'+seed);const r=state.run;
 for(let guard=0;r.phase!=='ended'&&guard<50;guard++){
  if(r.phase==='map')M.selectNode(r,M.getChoices(r)[0].id);
  else if(r.phase==='briefing'){M.beginFlightAttempt(r);M.finishFlight(r,{success:true,flame:65,embers:0});M.settleCheckpoint(state);}
  else if(r.phase==='support'){const offers=M.getSupportChoices(r,state.profile),i=offers.findIndex(o=>!o.effect.emberCost&&!o.effect.upgrade&&!o.effect.sell);M.resolveSupport(r,i,state.profile);M.settleCheckpoint(state);}
  else if(r.phase==='map-clear')M.advanceMap(r);
 }
 assert.ok(r.success);M.bankRun(state);assert.equal(state.profile.difficulty,Math.min(6,seed+2));assert.equal(state.profile.ownedArtifacts.length,Math.min(9,seed+1));assert.ok(state.profile.afterglow<=85);bossRuns++;
}
const report={schema:1,configurations,legalFleetBuilds:builds.length,artifactSets:arts.length,mainSets:mains.length,artifactMarginals,deadArtifacts,unequippedChecks,invariantCases,bossRuns,range,rolePaths,collectorStreams,method:'All legal 1–3 companion deepest paths with optional mastery, all artifact sets; full main ending cross-product for single companions and one deterministic main ending per multi-companion build. Collector open-air stream uses real recovery and delivery. No survival inference.'};
fs.writeFileSync('work/balance-health-synergies.json',JSON.stringify(report,null,2));console.log(JSON.stringify({configurations,artifactMarginals,unequippedChecks,invariantCases,bossRuns,range},null,2));
