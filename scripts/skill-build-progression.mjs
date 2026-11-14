import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../dist/model.mjs';
import {getCondensationRules} from '../dist/condensed-glow.mjs';

// Successful, delayed-vision controller clears: ten midpoint deciles of base packed surplus across
// 315 human250 and 250 human150 samples (coupled-final 0/1/2 + coupled-shipping-a2). The floor
// policy earns no pickup surplus. Failed rehearsals or attempts never provide simulated income.
const deciles={floor:[0],steady:[7,11,14,17,20,24,29,34,42,61],practiced:[7,10,16,18,21,24,26,32,39,60]};
const builds=[
 ['Last Orbit','collector','main-dream','collector-last-orbit','main-speed'],
 ['Light Aegis','protector','proximity-awakening','proximity-light-shield','main-sight'],
 ['Landing Guide','swift','main-dream','main-drift-sense-3','swift-duration'],
 ['Deep Regeneration','leveler','main-dream','main-glide-regen-2','main-sight'],
 ['Full Search','collector','proximity-awakening','collector-far-search','main-speed'],
 ['Rapid Surge','swift','proximity-awakening','swift-rapid-spark','main-sight'],
 ['Long Balance','leveler','proximity-awakening','leveler-long-balance','main-speed'],
 ['Returning Shell','protector','main-dream','protector-returning-shell','main-sight'],
];
function sequence(id,run,items=[]){
 if(!id||run.skills[id]||items.includes(id))return items;
 for(const parent of [M.SKILLS[id].requires].flat().filter(Boolean))sequence(parent,run,items);
 items.push(id);
 return items;
}
function scenario(seed,style,build,tier){
 const [name,role,gift,goal,side]=build,s=M.newState();
 s.profile.difficulty=6;s.run=M.createRun(s.profile,'build-budget-'+seed,tier);
 const r=s.run;assert.ok(r.companions[0]===role||M.setCompanions(r,[role]));assert.ok(M.chooseStartingSkill(s,gift));
 const chain=sequence(goal,r),sideBranch=sequence(side,r);
 chain.splice(1,0,...sideBranch.filter(id=>!chain.includes(id)));
 const receipts=[];let activated=null,firstAt=null,clears=0,byMap=[],rng=(seed+1)*16777619,failed=0,eligibleIncome=0;
 const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 for(let turns=0;turns<120;turns++){
  if(r.phase==='ended')break;
  if(r.victoryPending){if(r.flightReward&&!r.flightReward.claimed){const id=r.flightReward.offers[0];if(id)M.chooseFlightReward(s,id);}M.acknowledgeVictory(s);continue;}
  if(r.phase==='map-clear'){byMap[r.mapIndex]=receipts.length;assert.ok(M.advanceMap(r));continue;}
  if(r.phase==='map'){
   while(true){
    const w=M.getSkillWallet(s),next=chain.find(id=>!r.skills[id]),available=M.getAvailableUpgrades(s);
    const id=next||available.sort((a,b)=>M.getSkillCost(w,a)-M.getSkillCost(w,b)||a.localeCompare(b))[0];
    if(!id||!M.buyCheckpointSkill(s,id))break;
    receipts.push(id);firstAt??=clears;if(id===goal)activated={map:r.mapIndex,flight:clears};
   }
   const opts=M.getChoices(r),safe=opts.filter(n=>!n.elite);const row=safe.length?safe:opts;
   assert.ok(M.selectNode(r,row[Math.floor(random()*row.length)].id));continue;
  }
  if(r.phase==='briefing'){
   const n=r.current,m=r.mapIndex,final=n.boss&&m===2,credits=deciles[style],raw=credits[Math.floor(random()*credits.length)]*6;
   const result=()=>({success:true,flame:60,collected:4,condensedGlow:Math.floor(raw*getCondensationRules(r.skills).multiplier),pickupOverflow:raw/.3});
   if(!failed&&m===0&&r.step>=2){const wallet=r.condensedGlow;M.beginFlightAttempt(r);M.finishFlight(r,{...result(),success:false});M.settleCheckpoint(s);assert.equal(r.condensedGlow,wallet);failed++;continue;}
   assert.ok(M.beginFlightAttempt(r));const old=r.condensedGlow;M.finishFlight(r,result());M.settleCheckpoint(s);if(!final)eligibleIncome+=r.condensedGlow-old;clears++;continue;
  }
  if(r.phase==='support'){
   const options=M.getSupportChoices(r,s.profile);
   const free=o=>!o.effect.condensedCost&&!o.effect.sell&&!o.effect.upgrade&&!o.effect.wager;
   const order=options.map((o,i)=>({o,i})).filter(({o})=>free(o)).sort((a,b)=>Number(b.o.effect.lives>0)-Number(a.o.effect.lives>0));
   assert.ok(order.some(({i})=>M.resolveSupport(r,i,s.profile))||options.some((o,i)=>M.resolveSupport(r,i,s.profile)));
   M.settleCheckpoint(s);continue;
  }
  throw Error(r.phase);
 }
 assert.ok(r.success,'whole budget horizon');
 byMap[2]=receipts.length;
 return {seed,style,name,tier,learned:!!activated,map:activated?activated.map+1:null,at:activated?.flight,firstAt,paid:receipts.length,byMap,clears,eligibleIncome};
}
const arg=Object.fromEntries(process.argv.slice(2).map(opt=>opt.replace(/^--/,'').split('=')));
const rows=[];for(let seed=0;seed<Number(arg.seeds||12);seed++)for(const style of Object.keys(deciles))for(const build of builds)rows.push(scenario(seed,style,build,[1,2,4,6][seed%4]));
const mid=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
const summary=arr=>({count:arr.length,byMap2:Math.round(100*arr.filter(r=>r.map&&r.map<=2).length/arr.length),byFinal:Math.round(100*arr.filter(r=>r.learned).length/arr.length),medianBuyMap:mid(arr.map(r=>r.map||4)),firstAt:mid(arr.map(r=>r.firstAt)),paid:mid(arr.map(r=>r.paid)),clears:mid(arr.map(r=>r.clears)),rate:+mid(arr.map(r=>r.paid/r.clears)).toFixed(2)});
const results={all:summary(rows),style:Object.fromEntries(Object.keys(deciles).map(s=>[s,summary(rows.filter(r=>r.style===s))])),build:Object.fromEntries(builds.map(([name])=>[name,summary(rows.filter(r=>r.name===name&&r.style!=='floor'))]))};
if(arg.out)fs.writeFileSync(arg.out,JSON.stringify({results,rows}));
console.log(JSON.stringify(results,null,2));