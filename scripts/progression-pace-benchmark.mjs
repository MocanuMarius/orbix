// Seeded imperfect income scenarios using real generated pickup inventories and
// real model purchases. Error rates are assumptions, NOT human win-rate evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {pickupKind,getPickupSpec} from '../dist/pickups.mjs';
const randomFor=seed=>{let x=2166136261;for(const c of seed)x=Math.imul(x^c.charCodeAt(0),16777619);return()=>{x+=0x6d2b79f5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
const q=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)],mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
const round=n=>Math.round(n*100)/100;
const plans={
 Light:{role:'collector',gift:'main-sight',ids:['main-glow-sense','main-echo-sight','main-dawnburst','main-horizon','main-dream','main-echo-long','main-dream-long','main-dream-sight','main-wide-beam','main-dream-deep']},
 Motion:{role:'collector',gift:'main-speed',ids:['main-drift-sense','main-drift','main-tailwind','main-drift-sense-2','main-light-step','main-drift-sense-3','main-soft-current','main-efficiency','main-lift','main-kindling']},
 Glow:{role:'collector',gift:'main-efficiency',ids:['main-kindled-touch','main-recovery','main-reservoir','main-afterglow','main-kindled-rich','main-recovery-deep','main-lift','main-recovery-rescue','main-recovery-challenge','main-vast-vessel']},
 Collector:{role:'collector',gift:'main-efficiency',ids:['collector-attunement','collector-reach-step-1','collector-mastery','collector-reach-step-2','collector-reach','collector-rich-cargo','main-afterglow','main-reservoir','main-kindled-touch','main-lift']},
 Protector:{role:'protector',gift:'main-efficiency',ids:['protector-attunement','protector-cost','protector-recovery-step-1','protector-mastery','protector-recovery-step-2','protector-recovery','protector-clean-break','main-recovery','main-afterglow','main-lift']},
 Runner:{role:'swift',gift:'main-speed',ids:['swift-attunement','swift-duration','swift-recovery-step-1','swift-mastery','swift-recovery-step-2','swift-recovery','swift-rapid-spark','main-drift-sense','main-drift','main-tailwind']},
 'Space Timer':{role:'leveler',gift:'main-efficiency',ids:['leveler-attunement','leveler-duration','leveler-steadiness-step-1','leveler-mastery','leveler-steadiness-step-2','leveler-steadiness','leveler-long-balance','main-speed','main-drift-sense','main-lift']},
};
const personas={cautious:{pickup:.38,error:.085,cash:.48,challenge:.20},steady:{pickup:.52,error:.065,cash:.58,challenge:.34},bold:{pickup:.64,error:.12,cash:.70,challenge:.48}};
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)}),canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})};
const inventories=new Map();
function inventory(r,node){const key=r.seed+node.id;if(inventories.has(key))return inventories.get(key);const e=new WispFlight({canvas,terrain:node.terrain,node,seed:key,duration:node.duration,companions:['collector'],flame:100,modifiers:{}});const packets=e.layout.embers.filter(p=>!p.generated).map(p=>({kind:pickupKind(p),currency:getPickupSpec(p).currency,accessible:p.accessible===true}));e.destroy();inventories.set(key,packets);return packets;}
function learn(s,plan,clears,buys){if(!M.canBuyCheckpointSkills(s))return;for(let guard=0;guard<4;guard++){const available=M.getAvailableUpgrades(s),socketCount=buys.filter(b=>b.id.startsWith('main-artifact-slot-')).length,saveForSocket=plan.sockets&&buys.length-socketCount>=3&&socketCount<plan.sockets;const id=saveForSocket?M.getNextArtifactSlotSkill(s.run):plan.ids.find(id=>available.includes(id));if(!id||!available.includes(id))break;const price=M.getSkillCost(M.getSkillWallet(s),id);if(!M.buyCheckpointSkill(s,id))break;buys.push({id,cost:price,clear:clears});}}
const results=[],cases=[...Object.entries(plans),...[1,3,6].map(tier=>[`Relics A${tier}`,{...plans.Glow,tier,sockets:tier===1?1:2}])];
for(const [focus,plan]of cases)for(const [persona,style]of Object.entries(personas))for(let seed=0;seed<12;seed++){
 const random=randomFor(`${seed}:${persona}:${focus}`),s=M.newState();s.profile.difficulty=6;s.run=M.createRun(s.profile,'income-'+seed,plan.tier||1);const r=s.run;M.chooseStartingSkill(s,plan.gift);M.setCompanions(r,[plan.role]);
 const buys=[],incomeStart=r.embers;let clears=0,attempts=0,missed=0,touched=0,pickupIncome=0;
 while(!r.banked&&attempts<30){
  if(r.phase==='map'){
   learn(s,plan,clears,buys);const choices=M.getChoices(r);let node=choices.find(n=>n.kind==='camp'&&(r.lives<3||r.flame<65));
   node??=persona==='bold'?choices.find(n=>n.elite):choices.find(n=>n.routeStyle==='refuge');node??=choices[Math.floor(random()*choices.length)];assert.ok(M.selectNode(r,node.id));
  }else if(r.phase==='support'){
   const choices=M.getSupportChoices(r,s.profile);let index=choices.findIndex(c=>c.effect.lives&&r.lives<3);if(index<0&&r.flame<55)index=choices.findIndex(c=>c.effect.flame>0&&!c.effect.emberCost);if(index<0)index=choices.findIndex(c=>c.effect.embers>0&&!c.effect.burden);if(index<0)index=0;
   assert.ok(M.resolveSupport(r,index,s.profile));M.settleCheckpoint(s);learn(s,plan,clears,buys);
   if(r.flightReward&&!r.flightReward.claimed){M.chooseFlightReward(s,'embers');M.acknowledgeVictory(s);}
  }else if(r.phase==='briefing'){
   const node=r.current,mod=M.getRunModifiers(r),items=inventory(r,node);assert.ok(M.beginFlightAttempt(r));attempts++;
   const error=style.error*(node.elite?1.4:1)*(plan.role==='protector'?.62:1);
   if(random()<error){M.finishFlight(r,{success:false,flame:0});if(r.phase==='ended')M.bankRun(s);continue;}
   let earnings=0,fuelHits=0;const chance=Math.min(.82,style.pickup+(node.routeStyle==='refuge'?.08:0)+(plan.role==='collector'?.08*Math.min(1.5,mod.attract):0)+(mod.glowSense?.04:0)+(mod.driftSense?.035:0));
   for(const packet of items){if(['dark','dusk'].includes(packet.kind))continue;if(random()<chance+(packet.accessible?.1:0)){touched++;earnings+=packet.currency;if(['light','cache'].includes(packet.kind))fuelHits++;}else missed++;}
   pickupIncome+=earnings;const remaining=Math.max(8,Math.min(mod.maxGlow,20+random()*48+(1-mod.flapCost)*55+(mod.mainKindler?8:0)));
   const challengeComplete=random()<style.challenge;M.finishFlight(r,{success:true,flame:remaining,embers:earnings,collected:fuelHits,challengeComplete});clears++;M.settleCheckpoint(s);
   const reward=r.flightReward;
   if(!reward.claimed){if(reward.permanent)M.chooseFlightReward(s,reward.offers[0]);else if(random()>style.cash){const picked=reward.offers.find(id=>M.artifactSynergy(r,id))||reward.offers[0],slot=r.artifacts.filter(Boolean).length<M.getArtifactCapacity(r)?null:Math.floor(random()*M.getArtifactCapacity(r));M.chooseFlightReward(s,picked,slot);}else M.chooseFlightReward(s,'embers');}
   if(!reward.permanent)learn(s,plan,clears,buys);M.acknowledgeVictory(s);
  }else if(r.phase==='map-clear')assert.ok(M.advanceMap(r));else if(r.phase==='ended')M.bankRun(s);else throw new Error(r.phase);
 }
 const accessible=Object.values(M.SKILLS).filter(n=>n.branch==='main'||n.branch===plan.role||n.branch==='afterglow').length,learned=Object.keys(r.skills).length;
 assert.ok(learned/accessible<.6,'A run must not complete most accessible trees');
 results.push({focus,persona,seed,won:r.success,clears,attempts,paid:buys.length,spent:buys.reduce((n,b)=>n+b.cost,0),wallet:r.embers,pickupIncome,missed,touched,artifactCapacity:M.getArtifactCapacity(r),mountedArtifacts:r.artifacts.filter(Boolean).length,socketSpent:buys.filter(b=>b.id.startsWith('main-artifact-slot-')).reduce((n,b)=>n+b.cost,0),accessible,completion:learned/accessible,buys,skills:r.skills});
}
const completed=results.filter(r=>r.won),report={assumptions:{startingEmbers:30,personas,generatedInventories:inventories.size,meaning:'Income and error scenarios, not validated human win probabilities; no perfect targeting'},completed:completed.length,total:results.length,allTreeNodes:Object.keys(M.SKILLS).length,focus:{}};
for(const [focus]of cases){const rows=completed.filter(r=>r.focus===focus);assert.ok(rows.length>=8);report.focus[focus]={completed:rows.length,medianClears:q(rows.map(r=>r.clears),.5),medianPaidNodes:q(rows.map(r=>r.paid),.5),paidP10:q(rows.map(r=>r.paid),.1),paidP90:q(rows.map(r=>r.paid),.9),clearsPerPurchase:round(mean(rows.map(r=>r.clears/r.paid))),medianWallet:q(rows.map(r=>r.wallet),.5),medianSocketSpent:q(rows.map(r=>r.socketSpent),.5),medianArtifactCapacity:q(rows.map(r=>r.artifactCapacity),.5),medianMountedArtifacts:q(rows.map(r=>r.mountedArtifacts),.5),medianPickupIncome:q(rows.map(r=>r.pickupIncome),.5),maxAccessibleTreeCompletion:round(Math.max(...rows.map(r=>r.completion))*100),pickupMissRate:round(mean(rows.map(r=>r.missed/(r.missed+r.touched)))*100)};}
report.medianPaid=q(completed.filter(r=>plans[r.focus]).map(r=>r.paid),.5);report.medianClears=q(completed.map(r=>r.clears),.5);
fs.writeFileSync('work/progression-pace-benchmark.json',JSON.stringify({report,results},null,2));console.log(JSON.stringify(report));assert.ok(report.medianPaid>=6&&report.medianPaid<=8);
