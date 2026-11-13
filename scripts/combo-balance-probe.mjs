import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ARTIFACTS,getRunModifiers} from '../dist/model.mjs';
import {ArtifactEffects} from '../dist/artifact-effects.mjs';
import {WispFlight,FLIGHT_TUNING,FLAME_TUNING} from '../dist/flight.mjs';
import {blackHoleDrainRate} from '../dist/black-holes.mjs';
import {condenseGlow} from '../dist/condensed-glow.mjs';
const roles=['collector','protector','swift','leveler'];
function combinations(items,n,start=0,prefix=[],out=[]){if(!n){out.push(prefix);return out;}for(let i=start;i<=items.length-n;i++)combinations(items,n-1,i+1,[...prefix,items[i]],out);return out;}
const fleets=[1,2,3].flatMap(n=>combinations(roles,n));
const ids=Object.keys(ARTIFACTS),engines=['sunheart-engine','dream-sovereign','hollow-covenant','overflow-coil','echo-bell','dawn-loom','sunspool','dreamcatcher','second-dawn'];
const builds=[[],...ids.map(id=>[id]),...combinations(ids,2),...combinations(engines,3)];
const profiles={learning:{capture:.52,use:.55,correction:.16},steady:{capture:.7,use:.75,correction:.08},practiced:{capture:.86,use:.9,correction:.025}};
const random=seed=>{let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
const round=x=>Number(x.toFixed(3));
function engine(fleet,artifacts){
 const mod=getRunModifiers({companions:fleet,artifacts,skills:{'main-efficiency':1,'main-echo-sight':1,'main-kindled-touch':1,'main-dream':1},difficulty:1,mapIndex:1});
 const e={mod,time:0,player:{x:0,y:0},flame:100,packed:0,remainder:0,burst(){},fleet:fleet.map(role=>({role,cooldown:0,remaining:0})),wisp:{cooldown:0},shield:{charges:1,layers:1,recovery:0},levelCharge:mod.levelerDuration,hasCompanion:r=>fleet.includes(r),roleDuration:()=>mod.levelerDuration,roleCooldown:()=>mod.levelerRecovery,syncFleetTimers(){},setEvent(){},pickupRevealHoldUntil:0,pickupRevealStrength:0,sightUntil:0,mainSeerUntil:0,edgingPulse:{strength:0}};
 e.quickenCompanionRecovery=WispFlight.prototype.quickenCompanionRecovery.bind(e);e.artifactEffects=new ArtifactEffects(e);return e;
}
function run(fleet,artifacts,profile,seed,offset=Infinity){
 const e=engine(fleet,artifacts),fx=e.artifactEffects,rng=random(seed),p=profiles[profile],m=e.mod;
 const duration=120,dt=.5,flapCost=FLAME_TUNING.flapCost*m.flapCost,interval=2*FLIGHT_TUNING.flapImpulse*m.flap/(FLIGHT_TUNING.gravity*m.gravity)/(1+p.correction);
 let nextFlap=interval,bonus=0,freeSaved=0,fuelOffered=0,collected=0,starved=0,work=0,rechargeTotal=0,lastWake=false,blackHoleLoss=0;
 const q=e.quickenCompanionRecovery;e.quickenCompanionRecovery=(source,amount)=>{const before=e.fleet.map(item=>item.cooldown);const result=q(source,amount);rechargeTotal+=e.fleet.reduce((n,item,i)=>n+before[i]-item.cooldown,0);return result;};
 for(let step=1;step<=duration/dt;step++){
  const useRolls=Object.fromEntries(roles.map(role=>[role,rng()]));
  e.time=step*dt;const stolen=Math.min(e.flame,blackHoleDrainRate(Math.hypot((e.time-60)*154,offset))*dt);e.flame-=stolen;blackHoleLoss+=stolen;e.mainSeerUntil=Math.max(0,e.mainSeerUntil);e.wisp.cooldown=Math.max(0,e.wisp.cooldown-dt);e.shield.recovery=Math.max(0,e.shield.recovery-dt);if(!e.shield.recovery)e.shield.charges=1;
  for(const item of e.fleet)item.cooldown=Math.max(0,item.cooldown-dt);
  e.levelCharge=Math.min(m.levelerDuration,e.levelCharge+dt*m.levelerDuration/m.levelerRecovery);
  e.edgingPulse.strength=step%80<8?.6:0;
  const holder=e.fleet.find(x=>x.role==='leveler');let held=false;
  for(const item of e.fleet){if(item.cooldown>0)continue;const opportunity=item.role==='collector'?false:item.role==='protector'?step%40===0:step%8===0;if(opportunity&&useRolls[item.role]<p.use){fx.onWork();work++;item.cooldown=item.role==='swift'?m.swiftRecovery:item.role==='protector'?m.protectorRecovery:m.levelerRecovery;if(item.role==='protector'){e.shield.charges=0;e.shield.recovery=m.protectorRecovery;e.flame=Math.max(0,e.flame-m.protectorCost);}if(item.role==='leveler'){item.remaining=m.levelerDuration;e.levelCharge=0;}}}
  if(holder?.remaining>0){held=true;holder.remaining=Math.max(0,holder.remaining-dt);}
  if(e.time>=nextFlap){nextFlap+=interval;if(!held&&e.time>4){if(fx.consumeLift())freeSaved+=flapCost;else{if(e.flame<flapCost)starved++;e.flame=Math.max(0,e.flame-flapCost);}}}
  // 48 authored-target opportunities; misses and Collector rescues are assumptions.
  if(step%5!==0)continue;const directRoll=rng(),rescueRoll=rng(),direct=directRoll<p.capture,collector=fleet.includes('collector')&&!direct&&e.wisp.cooldown<=0&&rescueRoll<.55;
  if(!direct&&!collector)continue;
  const packet={deliveredByWisp:collector},spec={fuel:step%15===0?40:24,dim:0};collected++;
  if(collector){fx.onWork();work++;e.wisp.cooldown=5*m.wispCooldown;const item=e.fleet.find(x=>x.role==='collector');item.cooldown=e.wisp.cooldown;}
  e.mainSeerUntil=e.time+m.seerDuration;
  if(e.time<=4&&m.dreamRecharge)e.quickenCompanionRecovery(null,Math.min(4,m.dreamRecharge));
  if(e.time>4&&!lastWake&&m.secondDawn){lastWake=true;e.pickupRevealHoldUntil=e.time+1.5;}
  const b=fx.fuelBonus(packet,spec);bonus+=b;const fuel=spec.fuel+Math.min(32,m.cacheFuelBonus||0)+(direct?m.kindlerBonus:0)+b;fuelOffered+=fuel;
  const restored=Math.min(fuel,100-e.flame);e.flame+=restored;const surplus=fuel-restored;
  const payout=condenseGlow(surplus,{wallet:e.packed,rules:m.condensationRules,remainder:e.remainder});e.packed+=payout.condensedGlow||payout.amount||0;e.remainder=payout.remainder||0;
  fx.onFuel(packet,spec,surplus);
  assert.ok(fx.overflowUsed<=12+1e-9&&fx.workUses<=5&&fx.liftGrants<=4,'Shared per-flight budgets');
  assert.ok(e.flame>=0&&e.flame<=100&&Number.isFinite(e.packed));
 }
 return{blackHoleLoss:blackHoleLoss*.3,packed:e.packed,remaining:e.flame*.3,bonus:bonus*.3,freeSaved:freeSaved*.3,starved,collected,work,rechargeTotal,overflow:fx.overflowUsed,grants:fx.liftGrants,uses:fx.workUses,flashes:fx.procCounts['dawn-loom'],fuelOffered:fuelOffered*.3};
}
// Adversarial event storm: generated/harmful/dim/fetched packets cannot spend or recurse.
const stress=engine(roles,['sunheart-engine','hollow-covenant','sunspool']);stress.mod.workFuel=1000;stress.mod.overflowRecharge=1000;stress.mod.rechargeSight=1000;stress.mod.litLift=1000;stress.mainSeerUntil=1e6;
for(let i=0;i<10000;i++){stress.time=i*.01;for(const item of stress.fleet)item.cooldown=100;stress.artifactEffects.onWork();const f=stress.artifactEffects.fuelBonus({}, {fuel:24,dim:0});assert.ok(f<=16);stress.artifactEffects.onFuel({}, {fuel:24,dim:0},1e6);stress.artifactEffects.consumeLift();}
assert.equal(stress.artifactEffects.workUses,5);assert.equal(stress.artifactEffects.liftGrants,4);assert.equal(stress.artifactEffects.overflowUsed,12);assert.ok(stress.artifactEffects.procCounts['dawn-loom']<=25);assert.equal(stress.flame,100);assert.equal(stress.packed,0);
for(const packet of [{generated:true},{harmful:true}]){const e=engine(roles,['sunheart-engine','hollow-covenant','sunspool']);e.mainSeerUntil=100;e.artifactEffects.onWork();assert.equal(e.artifactEffects.fuelBonus(packet,{fuel:24}),0);e.artifactEffects.onFuel(packet,{fuel:24},100);assert.equal(e.artifactEffects.liftGrants,0);assert.equal(e.artifactEffects.overflowUsed,0);}
const edge=engine(['swift'],['sunspool']);edge.edgingPulse.strength=.5;edge.artifactEffects.onFuel({}, {fuel:24},0);assert.equal(edge.artifactEffects.consumeLift(),true);assert.equal(edge.artifactEffects.consumeLift(),false);
const results=[],byFleet={};let count=0;
for(const fleet of fleets){const key=fleet.join('+'),stats=byFleet[key]={cases:0,minPacked:Infinity,maxPacked:0,maxBonus:0,maxFreeSaved:0,maxFleetRecharge:0,maxStarved:0};
 for(const [profile] of Object.entries(profiles))for(let seed=1;seed<=4;seed++)for(const offset of [Infinity,100,40]){
 const baseline=run(fleet,[],profile,seed,offset);
 for(const artifacts of builds){const result=run(fleet,artifacts,profile,seed,offset);count++;stats.cases++;stats.minPacked=Math.min(stats.minPacked,result.packed);stats.maxPacked=Math.max(stats.maxPacked,result.packed);stats.maxBonus=Math.max(stats.maxBonus,result.bonus);stats.maxFreeSaved=Math.max(stats.maxFreeSaved,result.freeSaved);stats.maxFleetRecharge=Math.max(stats.maxFleetRecharge,result.rechargeTotal);stats.maxStarved=Math.max(stats.maxStarved,result.starved);
 results.push({fleet:key,profile,seed,exposure:Number.isFinite(offset)?offset:'safe',artifacts,...result,packedDelta:result.packed-baseline.packed});
 }
 }
}
results.sort((a,b)=>b.packedDelta-a.packedDelta);for(const row of Object.values(byFleet))for(const k of Object.keys(row))row[k]=round(row[k]);
const report={cases:count,fleets:fleets.length,builds:builds.length,profiles,seeds:4,seconds:120,blackHoleOffsets:['safe',100,40],byFleet,topPackedDelta:results.slice(0,12),hardCaps:{workFuelDisplayed:24,freeLiftCount:4,overflowSecondsPerFleetMember:12},limits:['Scheduled opportunities, not geometry or measured human success.','No deaths imposed; starvation reports pressure rather than win rate.','All fleets get equivalent milestone skills and 3 artifact slots; acquisition cost excluded.','All single artifacts and pairs, plus triples of nine trigger artifacts. Other passive triples and 4–6 sockets not enumerated.','No new currency without a natural pickup event; current conversion code used.','Predictable edge pulse windows and successful 4-second Dream openings are optimistic ability opportunities.','Night Gardener skim fuel and passive vision influence on missed pickups not modeled. Black-hole exposure uses actual drain falloff along one scheduled straight 154-unit/s passage, sampled at half-second intervals; not geometric steering.']};
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/combo-balance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
