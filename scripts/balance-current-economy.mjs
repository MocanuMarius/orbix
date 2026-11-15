import {COMPANION_ABILITIES,getCompanionUnlock} from '../dist/companion-abilities.mjs';
import {WISP_TUNING} from '../dist/wisp.mjs';
// Economic stress scenarios, NOT a human win-rate model. Flight resource
// schedules use actual authored levels; geometry is not controlled by a bot.
// Pickup misses, correction taps and collision attrition are stated assumptions.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as M from '../dist/model.mjs';
import {WispFlight,FLIGHT_TUNING,FLAME_TUNING} from '../dist/flight.mjs';
import {getPickupSpec,pickupKind} from '../dist/pickups.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {CONDENSED_TUNING,KEPT_LIGHT_MAX_PRINCIPAL,getCondensationRules,condenseGlow} from '../dist/condensed-glow.mjs';
import {ArtifactEffects} from '../dist/artifact-effects.mjs';
import {blackHoleDrainRate} from '../dist/black-holes.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const[k,...rest]=v.replace(/^--/,'').split('=');return[k,rest.join('=')||true]}));
const seeds=Number(args.seeds||24),out=String(args.out||'work/balance-condensed-glow.json');
const proposedGrowth=Number(args.proposedGrowth||1);
const proposedPowerK=Number(args.proposedPowerK||0);
const proposedConversionBase=Number(args.proposedConversionBase||0);
const proposedTrainingGrowth=args.trainingGrowth==null?null:Number(args.trainingGrowth);
const tiers=args.tiers?String(args.tiers).split(',').map(Number):[1,2,3,4,5,6];
const roles=Object.keys(COMPANION_ABILITIES).filter(id=>getCompanionUnlock(id).selectable),policies=['survival','conversion','hoard','companion'];
const profiles={
 learning:{pocket:.45,accessible:.68,centreBonus:.035,corrections:.16,reactionMs:280,missPower:.45,collision:.09},
 steady:{pocket:.60,accessible:.82,centreBonus:.04,corrections:.08,reactionMs:180,missPower:.25,collision:.045},
 practiced:{pocket:.76,accessible:.94,centreBonus:.035,corrections:.025,reactionMs:110,missPower:.1,collision:.018},
};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),round=n=>Math.round(n*1000)/1000;
const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
const percentile=(a,p)=>a.length?[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)]:0;
const rngFor=s=>{let x=2166136261;for(const c of String(s))x=Math.imul(x^c.charCodeAt(0),16777619);return()=>{x+=0x6d2b79f5;let n=x;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296}};
const hashes=()=>Object.fromEntries(fs.readdirSync('dist').filter(n=>n.endsWith('.mjs')).map(n=>[n,createHash('sha256').update(fs.readFileSync(path.join('dist',n))).digest('hex')]));
const initialHashes=hashes(),started=Date.now();
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})});
const inventories=new Map();
function inventory(node,tier){
 const phase=node.mapIndex||0,row=node.row||0,duration=node.duration||114;
 const key=[node.levelId,tier,phase,node.encounterFamily||'mixed',node.boss?node.bossId:'ordinary',node.elite?'elite':'normal',node.routeStyle||node.passage||'open',node.fuelCadence||3,node.mapTheme||'clear',node.flightLengthScale||1,row,duration].join(':')+(node.blackHoleEncounter?':'+node.blackHoleEncounter+':'+(node.blackHoleEdge||0):'');
 if(inventories.has(key))return inventories.get(key);
 const e=new WispFlight({canvas:canvas(),terrain:node.terrain,elite:node.elite,seed:'condensed-inventory:'+key,duration,
  node:{...node,row,difficulty:tier},companions:['collector'],flame:100});
 const result={key,levelId:node.levelId,biome:node.biomeId||e.levelIdentity.biomeId,tier,phase,boss:!!node.boss,elite:!!node.elite,
  seconds:(e.totalDistance-e.distanceOrigin)/e.baseSpeed,draftCount:e.drafts.zones.length,interactionCount:e.biomeDynamics.items.length,
  glowBudget:e.layout.glowBudget,holeCount:e.blackHoles?.items?.length??1,
  holes:(e.blackHoles?.items||[]).map(h=>({time:Math.max(0,(h.x-e.player.x-e.distanceOrigin)/e.baseSpeed),influence:h.influence,coreRadius:h.coreRadius,giant:!!h.giant,bypassClearance:Math.abs(h.bypass.y-h.y)})),
  negativeCount:e.layout.embers.filter(p=>getPickupSpec(p).dim>0).length,
  items:e.layout.embers.filter(p=>!p.generated&&!p.harmful&&getPickupSpec(p).fuel>0).map(p=>({id:p.id,kind:pickupKind(p),time:Math.max(0,(p.x-e.player.x-e.distanceOrigin)/e.baseSpeed),
   y:p.y,mass:p.sparkMass||({'cache':3,'cluster':2}[pickupKind(p)]||1),fuel:getPickupSpec(p).fuel,accessible:!!(p.accessible||p.intro||p.budgetRecovery),rich:pickupKind(p)==='cache',manual:getPickupSpec(p).manualOnly})).sort((a,b)=>a.time-b.time)};
 result.rawFuel=result.items.reduce((s,p)=>s+p.fuel,0);result.fuelPerSecond=result.rawFuel/result.seconds;
 inventories.set(key,result);e.destroy();return result;
}
const rank=(s,id)=>Number(s[id])||0;
function simulateFlow(run,inv,style,rng,{captureDelta=0,effortScale=1,artifactScale=1,cacheBonusDelta=0,attrition=false}={}){
 const p=profiles[style],mod=M.getRunModifiers(run),skills=run.skills,role=run.companions[0],max=getGlowCapacity(run);
 mod.cacheFuelBonus+=cacheBonusDelta;
 const use=1-p.missPower,has=id=>run.companions.includes(id);
 const swiftDuty=has('swift')?use*mod.swiftDuration/(mod.swiftRecovery+mod.swiftDuration):0;
 const holdDuty=has('leveler')?use*mod.levelerDuration/(mod.levelerRecovery+mod.levelerDuration):0;
 const speed=Math.max(.8,mod.speed)*(1+swiftDuty*.48),seconds=inv.seconds/speed;
 // Steady altitude needs one impulse each 2v/g seconds. Human timing jitter
 // and corrections add taps; actual skill modifiers and role uptime alter it.
 const interval=2*FLIGHT_TUNING.flapImpulse*clamp(mod.flap,.8,1.2)/(FLIGHT_TUNING.gravity*clamp(mod.gravity,.8,1.2));
 const correction=(1+p.corrections+(run.difficulty-1)*.009+(inv.elite?.025:0))*effortScale;
 const flapCost=mod.liftCostPoints/.3;
 const events=[];
 const freeDream=rank(skills,'main-dream')?mod.dreamDuration:0;
 for(let t=.5;t<seconds;t+=interval/correction*(.88+rng()*.24)){
  if(t<freeDream||rng()<holdDuty)continue;
  events.push({t,cost:flapCost});
 }
 let lastFetched=-99,attempted=0,captured=0,fetched=0,available=0;
 const readability=Math.min(.06,(mod.lightRadius-145)/1800+(mod.glowSense?.025:0)+(mod.driftSense||0)*.008);
 for(const item of inv.items){
  if(item.time>inv.seconds)continue;
  available++;const t=item.time/speed;
  let chance=(item.accessible?p.accessible:p.pocket)+(Math.abs(item.y-215)<75?p.centreBonus:-.02)+readability+captureDelta;
  chance-=(run.difficulty-1)*.009+(inv.elite?.018:0)+(has('swift')?swiftDuty*.08:0);
  if(item.manual)chance-=.16;if(item.rich)chance+=.02;
  chance=clamp(chance,.05,.985);attempted++;
  let caught=rng()<chance,delivery=false;
  if(!caught&&!item.manual&&has('collector')&&item.mass<=(mod.collectorFetchMass||2)){
   const recovery=clamp((t-lastFetched)/Math.max(1,WISP_TUNING.cooldown*(mod.wispCooldown||1)),.1,1);
   const rescueChance=clamp((.17+.17*recovery)*(WISP_TUNING.range/105)*(mod.attract||1),.05,.58);
   if(rng()<rescueChance){caught=true;delivery=true;lastFetched=item.mass>=3?-Infinity:t;fetched++;}
  }
  if(!caught)continue;captured++;
  let fuel=(delivery&&item.mass>2?40:item.fuel)+(run.current?.fuelBonus||0)+clamp(mod.cacheFuelBonus||0,0,32)+(item.rich&&!delivery?(mod.richFuelBonus||0):0);
  if(delivery)fuel+=mod.collectorFuelBonus||0;else if(mod.mainKindler)fuel+=mod.kindlerBonus||6;
  fuel=Math.round(fuel*artifactScale*.3)/.3;
  events.push({t:t+(delivery?.32:0),fuel,item,delivery});
 }
 // A straight Black Hole pass at a stated clearance; distance is a scenario, not inferred human behavior.
 for(const hole of inv.holes){
  const clearance=hole.giant?Math.max(hole.coreRadius+18,hole.bypassClearance-({learning:50,steady:25,practiced:12})[style]):({learning:85,steady:140,practiced:195})[style];
  let loss=0;for(let x=-hole.influence;x<=hole.influence;x+=12)loss+=blackHoleDrainRate(Math.hypot(x,clearance),hole.influence,hole.coreRadius)*12/(154*speed);
  events.push({t:hole.time/speed,cost:loss,drain:true});
 }
 // Collision stress is imposed, not inferred from these inventory samples.
 // Protector's core benefit is represented as a fuel cost and avoided failure.
 const collisionChance=p.collision*(1+(run.difficulty-1)*.10+run.mapIndex*.08+(inv.elite?.3:0)+(inv.boss?.45:0));
 let collisionFailure=false,shieldUses=0;
 if(attrition&&rng()<collisionChance){
  const protectionChance=clamp(.76+.13*(mod.protectorLayers-1)+Math.max(0,14-mod.protectorRecovery)*.006,.76,.94);
  if(has('protector')&&rng()<protectionChance){shieldUses++;events.push({t:seconds*(.2+rng()*.6),cost:mod.protectorCost||12,shield:true})}
  else collisionFailure=true;
 }
 events.sort((a,b)=>a.t-b.t);
 let fuel=run.flame,condensed=0,remainder=run.condensedRemainder||0,rawOverflow=0,emptyLifts=0,consecutiveEmpty=0,minFuel=fuel,spent=0;
 const rules=mod.condensationRules;
 const actor={mod,player:{x:180,y:200},time:0,flame:fuel,maxFlame:max,flameRestored:0,fleet:[],pickupRevealHoldUntil:0,pickupRevealStrength:0,sightUntil:0,mainSeerUntil:0,edgingPulse:{strength:0},burst(){},revealFromPickup(){this.pickupRevealHoldUntil=this.time+1.5},quickenCompanionRecovery(_,amount){const gain=Math.min(amount,1);this.artifactEffects.onRecharge(gain);return gain}};
 // A sequence of pickups and taps does not resolve local draft or Black Hole
 // contact. Conditional guardian effects requiring either remain dormant.
 actor.gustState=()=>({active:false});actor.lastFlapTime=-Infinity;
 const effects=new ArtifactEffects(actor);actor.artifactEffects=effects;effects.onStart();
 let workAt=0,bodyFuelCollected=0;

 let fuelFailure=false,lastTime=0,burdenRemaining=mod.burdenLifts||0,storageBonus=0,storageAwards=0;
 for(const event of events){
  lastTime=event.t;actor.time=event.t;actor.flame=fuel;
  if(event.cost){
   if(event.drain){const paid=Math.min(fuel,event.cost);fuel-=paid;spent+=paid;minFuel=Math.min(minFuel,fuel);continue;}
   if(!event.shield&&effects.consumeLift()){actor.lastFlapTime=event.t;continue;}

   const cost=event.cost+(!event.shield&&burdenRemaining>0?1/.3:0);
   if(fuel+1e-8<cost){emptyLifts++;consecutiveEmpty++;if(consecutiveEmpty>=2&&event.t<seconds-1.5)fuelFailure=true;}
   else{
    fuel-=cost;spent+=cost;consecutiveEmpty=0;actor.flame=fuel;
    if(!event.shield){if(burdenRemaining>0)burdenRemaining--;effects.onFlap(true);actor.lastFlapTime=event.t;fuel=actor.flame;}
   }
  }else{
   const packet={kind:event.delivery&&event.item.mass>2?'cluster':event.item.kind,sparkMass:event.delivery?Math.min(2,event.item.mass):event.item.mass,deliveredByWisp:event.delivery},spec=getPickupSpec(packet);
   if(!event.delivery)bodyFuelCollected++;
   if((event.delivery||has('swift')||has('leveler'))&&event.t>=workAt){effects.onWork();fuel=actor.flame;workAt=event.t+8;}
   const amount=event.fuel+Math.round(effects.fuelBonus(packet,spec)*.3)/.3;
   const naturalSurplus=Math.max(0,fuel+event.item.fuel-max);
   const surplus=Math.max(0,fuel+amount-max);fuel=Math.min(max,fuel+amount);consecutiveEmpty=0;
   if(storageAwards<2&&surplus>0&&naturalSurplus>1e-7&&spec.plasma&&event.t>=freeDream){
    const award=mod.handSeal&&!event.delivery?1:mod.deepCache&&event.item.fuel>=FLAME_TUNING.heartFuel?2:0;
    if(award){storageAwards++;storageBonus+=award;}
   }
   actor.flame=fuel;effects.applyConsumables(packet,spec);fuel=actor.flame;
   if(mod.pickupReveal||mod.mainSeer)actor.pickupRevealHoldUntil=event.t+1.5;
   effects.onFuel(packet,spec,surplus);fuel=actor.flame;

   const conversion=condenseGlow(surplus,{rules,wallet:run.condensedGlow+condensed,remainder,limit:mod.packingLimit??20,packed:condensed});
   condensed+=conversion.amount;remainder=conversion.remainder;rawOverflow+=surplus;
  }
  minFuel=Math.min(minFuel,fuel);
  if(attrition&&fuelFailure)break;
 }
 return {success:!attrition||!fuelFailure&&!collisionFailure,flame:fuel,condensedGlow:condensed,condensedRemainder:remainder,pickupOverflow:rawOverflow,
  storageBonus,collected:captured,challengeComplete:rng()<Math.max(.15,p.pocket-.1),seconds,available,captured,fetched,emptyLifts,starved:emptyLifts>0,
  artifactCharges:{...effects.charges},bodyFuelCollected,fuelFailure,collisionFailure,shieldUses,spent,minFuel,coverage:captured/Math.max(1,available),lastTime};
}
const priorities={
 survival:['main-efficiency','main-lift','main-glide-regen','main-sight','main-glow-sense','main-glide-regen-2','main-reservoir','main-drift-sense','main-dream'],
 conversion:['main-efficiency','main-clear-dividend','main-afterglow','afterglow-vessel','afterglow-retention','main-reservoir','main-glow-sense','main-glide-regen-2','main-sight','main-dream'],
 hoard:['main-efficiency','main-clear-dividend','main-afterglow','afterglow-anchor','afterglow-vessel','main-reservoir','main-glow-sense','main-sight','main-glide-regen-2','main-dream'],
 companion:['main-efficiency'],
};
const focusedGoals={
 'focused-survival':['main-efficiency','main-recovery','main-reservoir','main-sight','main-lift','main-glide-regen'],
 'focused-storage':['main-clear-dividend','main-afterglow','afterglow-anchor','afterglow-vessel','main-reservoir','afterglow-retention'],
 'focused-collector':['collector-fetch-large','collector-last-orbit','collector-guard-repair','collector-reach','collector-recovery','main-sight'],
};
function goalSequence(goals){
 const result=[],seen=new Set();
 function visit(id){const s=M.SKILLS[id];if(!s||s.retired||seen.has(id))return;seen.add(id);for(const parent of [s.requires].flat().filter(Boolean))visit(parent);result.push(id);}
 for(const id of goals)visit(id);return result;
}
function buy(state,policy,metrics){
 const run=state.run,own=run.companions[0],ownedSkills=Object.values(M.SKILLS).filter(s=>s.branch===own).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id)).map(s=>s.id);
 const preferred=[...(priorities[policy]||[]),`${own}-attunement`,`${own}-recovery`,`${own}-cost`,`${own}-duration`,`${own}-reach`,...(policy==='companion'?ownedSkills:[])];
 for(let guard=0;guard<30;guard++){
  const w=M.getSkillWallet(state),paidRanks=M.getTrainingRankCount(w);
  const quote=id=>{
   const ordinary=M.getSkillCost(w,id);
   const definition=M.SKILLS[id],r=rank(run.skills,id),base=definition.prices?.[r]??Math.round(definition.cost*1.5**r);
   const price=proposedConversionBase&&definition.branch==='afterglow'
    ?(proposedConversionBase+5*r)*(1+(proposedTrainingGrowth??CONDENSED_TUNING.trainingGrowth)*paidRanks**CONDENSED_TUNING.trainingExponent)
    :proposedTrainingGrowth!==null?base*(1+proposedTrainingGrowth*paidRanks**CONDENSED_TUNING.trainingExponent):ordinary;
   return Math.ceil(price*(proposedGrowth**paidRanks)*(1+proposedPowerK*paidRanks**1.5)/5)*5;
  };
  if(focusedGoals[policy]){
   const next=goalSequence(focusedGoals[policy]).find(id=>M.getSkillCost(w,id)!==null);
   if(!next||quote(next)>run.condensedGlow)break;
   const price=M.getSkillCost(w,next);assert.ok(M.buyCheckpointSkill(state,next));
   metrics.spent+=price;metrics.buys++;metrics.firstBuy??=run.stats.flights;
   metrics.purchases.push({id:next,cost:price,flight:run.stats.flights,map:run.mapIndex});continue;
  }
  const branches=new Set(['main','proximity',own,...(w.condensationUnlocked?['afterglow']:[])]);
  const eligible=Object.keys(M.SKILLS).filter(id=>branches.has(M.SKILLS[id].branch)&&M.getSkillCost(w,id)!==null&&!['main-bond','main-spare-spark','main-deep-reserve'].includes(id)&&quote(id)<=run.condensedGlow);
  if(!eligible.length)break;
  const ordered=eligible.sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return(ai<0?80:ai)-(bi<0?80:bi)||M.getSkillCost(w,a)-M.getSkillCost(w,b)||a.localeCompare(b)});
  const id=ordered[0],baseCost=M.getSkillCost(w,id),cost=quote(id),keep=policy==='hoard'&&rank(run.skills,'afterglow-anchor')?KEPT_LIGHT_MAX_PRINCIPAL:0;
  if(run.condensedGlow-cost<keep)break;
  const before=run.condensedGlow;run.condensedGlow+=baseCost-cost;
  if(!M.buyCheckpointSkill(state,id)){run.condensedGlow=before;break;}
  if(cost!==baseCost)run.skillPaid[id]+=cost-baseCost;
  assert.equal(before-run.condensedGlow,cost);metrics.spent+=cost;metrics.buys++;metrics.firstBuy??=run.stats.flights;metrics.purchases.push({id,cost,flight:run.stats.flights,map:run.mapIndex});
 }
}
function restDistance(run,node){const all=new Map(run.map.flat().map(n=>[n.id,n])),q=[[node,0]],seen=new Set();while(q.length){const[n,d]=q.shift();if(seen.has(n.id))continue;seen.add(n.id);if(n.kind==='camp')return d;for(const id of n.nextIds||[])if(all.has(id))q.push([all.get(id),d+1])}return 8;}
function chooseRoute(run,rng,failedNodes={}){
 const reachable=M.getChoices(run);assert.ok(reachable.length);
 const untried=reachable.filter(n=>!failedNodes[n.id]),choices=untried.length?untried:reachable;
 const low=run.flame<getGlowCapacity(run)*.65||run.lives<2;
 return choices.map(node=>({node,score:rng()*1.1-1.6*(failedNodes[node.id]||0)+(node.elite?(low?-2:-.2):.15)-(low?.6:.16)*restDistance(run,node)+(node.kind==='camp'?.6:0)})).sort((a,b)=>b.score-a.score)[0].node;
}
function reward(state,policy,rng,metrics){
 const r=state.run,reward=r.flightReward;if(!reward||reward.claimed)return;
 const before=r.condensedGlow;
 let id=reward.offers[0];
 if(!reward.permanent)id=reward.offers.find(a=>M.artifactSynergy(r,a))||id;
 if(!id)return;
 assert.ok(M.chooseFlightReward(state,id));metrics.supportIncome+=r.condensedGlow-before;
}
function runCase({seed,tier,role,style,policy,attrition=false,captureDelta=0,effortScale=1,artifactScale=1,startingSkill=null,startingChoice=0,flightSimulator=null}){
 const state=M.newState();state.profile.difficulty=6;state.run=M.createRun(state.profile,`condensed-${seed}-${tier}`,tier);
 const r=state.run;assert.ok(r.companions[0]===role||M.setCompanions(r,[role]));const offers=M.getStartingGiftOffers(r);startingSkill=offers.find(g=>g.id===startingSkill)?.id||offers[startingChoice].id;assert.ok(M.chooseStartingGift(state,startingSkill),'Simulator must take a real starting gift');
 const rng=rngFor([seed,tier,style].join(':')); // common seed streams across policies and sensitivities
 const m={seed,tier,role,style,policy,attrition,captureDelta,effortScale,artifactScale,startingSkill,spent:0,buys:0,firstBuy:null,purchases:[],flightIncome:0,packingIncome:0,clearIncome:0,supportIncome:0,failures:0,fuelFailures:0,collisionFailures:0,starvedFlights:0,attempts:0,coverage:[],mapBuys:[0,0,0],mapIncome:[0,0,0],mapWallet:[0,0,0],totalLostCurrency:0,failedNodes:{}};
 for(let guard=0;guard<130;guard++){
  if(r.victoryPending){reward(state,policy,rng,m);buy(state,policy,m);M.acknowledgeVictory(state);continue;}
  if(r.phase==='ended')break;
  if(r.phase==='map'){buy(state,policy,m);M.selectNode(r,chooseRoute(r,rng,m.failedNodes).id);continue;}
  if(r.phase==='map-clear'){m.mapBuys[r.mapIndex]=m.buys;m.mapIncome[r.mapIndex]=m.flightIncome+m.supportIncome;m.mapWallet[r.mapIndex]=r.condensedGlow;M.advanceMap(r);continue;}
  if(r.phase==='briefing'){
   const attemptedNodeId=r.current.id,inv=inventory(r.current,tier),before=r.condensedGlow,remainder=r.condensedRemainder;M.beginFlightAttempt(r);
   const flow=flightSimulator?flightSimulator(r,style,m.attempts):simulateFlow(r,inv,style,rngFor(`${seed}:${tier}:${style}:${r.current.id}:${m.attempts}`),{captureDelta,effortScale,artifactScale,attrition});m.attempts++;m.coverage.push(flow.coverage);m.starvedFlights+=Number(flow.starved);
   if(args.debug&&seed===0&&tier===1&&role==='collector'&&style==='steady'&&policy==='survival'&&m.attempts<3)console.error(JSON.stringify({debug:true,node:r.current,mod:M.getRunModifiers(r),inv:{seconds:inv.seconds,rawFuel:inv.rawFuel,items:inv.items.length},flow}));
   if(flow.nightmareUsed)r.nightmareSpentMap=r.mapIndex;
   M.finishFlight(r,flow);M.settleCheckpoint(state);assert.equal(M.settleCheckpoint(state),0,'settlement is idempotent');
   if(!flow.success){m.failedNodes[attemptedNodeId]=(m.failedNodes[attemptedNodeId]||0)+1;m.failures++;m.fuelFailures+=Number(flow.fuelFailure);m.collisionFailures+=Number(flow.collisionFailure);m.totalLostCurrency+=flow.condensedGlow;assert.equal(r.condensedGlow,before,'failed pickups cannot farm currency');assert.equal(r.condensedRemainder,remainder,'failed fractions roll back');}
   else{
    const receipt=r.lastFlight,secured=r.condensedGlow-before;
    const expected=receipt.pickupCondensedGlow+(receipt.exitPacking?.amount||0)+receipt.completionBonus+(receipt.routeBonus?.amount||0)+(receipt.vow?.reward||0)
      +(receipt.treasureWager?.reward||0)+(receipt.chestIncome?.amount||0)+(receipt.keptLightDividend||0)+(receipt.storageBonus||0)+(receipt.pactBonus||0);
    assert.equal(secured,expected,'ordinary autobanking and checkpoint settlements reconcile');
    m.flightIncome+=secured;m.packingIncome+=receipt.pickupCondensedGlow+(receipt.exitPacking?.amount||0);m.clearIncome+=receipt.completionBonus;
   }
   continue;
  }
  if(r.phase==='support'){
   const before=r.condensedGlow,offers=M.getSupportChoices(r,state.profile),low=r.flame<getGlowCapacity(r)*.65;
   let choice=offers.findIndex(o=>r.lives<2&&o.effect.lives>0);
   if(choice<0&&low)choice=offers.findIndex(o=>o.effect.flame>=getGlowCapacity(r)-r.flame);
   if(choice<0)choice=offers.findIndex(o=>o.effect.packedLight>0);
   if(choice<0)choice=offers.findIndex(o=>o.effect.artifactReward);
   if(choice<0)choice=offers.findIndex(o=>o.effect.pickupGlow>0&&!o.effect.condensedCost&&!o.effect.sell);
   if(choice<0)choice=offers.findIndex(o=>o.effect.flame>0&&!o.effect.condensedCost);
   if(choice<0)choice=0;
   if(!M.resolveSupport(r,choice,state.profile)){choice=offers.findIndex(o=>!o.effect.condensedCost&&!o.effect.upgrade&&!o.effect.sell);assert.ok(choice>=0&&M.resolveSupport(r,choice,state.profile));}
   const effect=offers[choice]?.effect||{},supportCost=effect.condensedCost||0;
   M.settleCheckpoint(state);m.supportIncome+=r.condensedGlow-before+supportCost;m.spent+=supportCost;
   if(effect.upgrade){m.buys++;m.firstBuy??=r.stats.flights;m.purchases.push({id:effect.upgrade,cost:supportCost,flight:r.stats.flights,map:r.mapIndex,shrine:true});}
   reward(state,policy,rng,m);buy(state,policy,m);continue;
  }
  throw Error('Unexpected phase '+r.phase);
 }
 assert.equal(r.phase,'ended','campaign resolves');
 m.mapBuys[r.mapIndex]=m.buys;m.mapIncome[r.mapIndex]=m.flightIncome+m.supportIncome;m.mapWallet[r.mapIndex]=r.condensedGlow;
 m.success=r.success;m.flights=r.stats.flights;m.currency=r.condensedGlow;m.income=m.flightIncome+m.supportIncome;m.learnedRanks=Object.values(r.skills).reduce((a,b)=>a+b,0);
 m.coverage=mean(m.coverage);m.paidRanksPerFlight=m.buys/Math.max(1,m.flights);m.finalMap=r.mapIndex;m.finalGlow=r.flame;
 m.eligibleTreeRanks=Object.values(M.SKILLS).filter(s=>!s.retired&&['main','proximity',role,'afterglow'].includes(s.branch)).reduce((a,s)=>a+s.maxRank,0);
 m.treeFraction=m.learnedRanks/m.eligibleTreeRanks;
 m.nonConversionRanks=Object.keys(r.skills).filter(id=>M.SKILLS[id].branch!=='afterglow'&&id!=='main-afterglow').reduce((n,id)=>n+rank(r.skills,id),0)-1;
 const endMod=M.getRunModifiers(r);m.endingBuild={flapCost:endMod.liftCostPoints,lightRadius:endMod.lightRadius,maxGlow:getGlowCapacity(r),attract:endMod.attract,condensation:endMod.condensationRules};
 assert.equal(CONDENSED_TUNING.starting+m.income-m.spent,m.currency,'wallet reconciliation');
 return m;
}
function aggregate(rows){const complete=rows.filter(r=>r.success),median=k=>percentile(rows.map(r=>r[k]),.5);return{n:rows.length,complete:complete.length,
 medianFlights:median('flights'),medianBuys:median('buys'),meanBuys:round(mean(rows.map(r=>r.buys))),medianPaidRanksPerFlight:round(median('paidRanksPerFlight')),
 medianIncome:median('income'),incomeP10:percentile(rows.map(r=>r.income),.1),incomeP90:percentile(rows.map(r=>r.income),.9),medianWallet:median('currency'),walletP90:percentile(rows.map(r=>r.currency),.9),
 medianFirstBuy:percentile(rows.map(r=>r.firstBuy).filter(v=>v!==null),.5),noPurchaseCases:rows.filter(r=>!r.buys).length,medianTreeFraction:round(median('treeFraction')),maxTreeFraction:round(Math.max(0,...rows.map(r=>r.treeFraction))),
 meanCapture:round(mean(rows.map(r=>r.coverage))),starvedAttemptShare:round(rows.reduce((s,r)=>s+r.starvedFlights,0)/Math.max(1,rows.reduce((s,r)=>s+r.attempts,0))),
 failedAttempts:rows.reduce((s,r)=>s+r.failures,0),fuelFailures:rows.reduce((s,r)=>s+r.fuelFailures,0),collisionFailures:rows.reduce((s,r)=>s+r.collisionFailures,0),
 mapMedianBuys:[0,1,2].map(i=>percentile(rows.filter(r=>r.finalMap>=i).map(r=>r.mapBuys[i]),.5)),mapMedianWallet:[0,1,2].map(i=>percentile(rows.filter(r=>r.finalMap>=i).map(r=>r.mapWallet[i]),.5)),
 meanFlightIncome:round(rows.reduce((s,r)=>s+r.flightIncome,0)/Math.max(1,rows.reduce((s,r)=>s+r.flights,0))),meanSupportIncome:round(mean(rows.map(r=>r.supportIncome)))};}
if(!args.importOnly){
const rows=[];
const phases=args.quick?[false]:[false,true];
for(let seed=0;seed<seeds;seed++){
 if(args.startingOnly){for(const role of roles)for(const style of ['learning','steady'])for(const policy of policies)for(const attrition of phases)for(const startingChoice of [0,1])rows.push(runCase({seed:seed+201,tier:1,role,style,policy,attrition,startingChoice}));}
 else for(const tier of tiers)for(const role of roles)for(const style of Object.keys(profiles))for(const policy of policies)for(const attrition of phases)rows.push(runCase({seed,tier,role,style,policy,attrition}));
 if(seed%4===3||seed===seeds-1)console.log(JSON.stringify({seed:seed+1,campaigns:rows.length,inventories:inventories.size,seconds:round((Date.now()-started)/1000)}));
}
const sensitivity=[];
if(!args.quick&&!args.startingOnly&&!args.noSensitivity)for(const seed of [101,102,103,104,105,106])for(const tier of [1,3,6])for(const role of roles)for(const adjustment of [{name:'capture-minus-8pp',captureDelta:-.08},{name:'capture-plus-8pp',captureDelta:.08},{name:'correction-effort-plus-12pct',effortScale:1.12},{name:'fuel-bonus-upper-bound-plus-15pct',artifactScale:1.15}])for(const policy of ['survival','conversion','hoard'])sensitivity.push({...runCase({seed,tier,role,style:'steady',policy,...adjustment}),adjustment:adjustment.name});
const groups={all:aggregate(rows)};
for(const key of ['style','role','policy','tier','attrition'])for(const value of new Set(rows.map(r=>r[key])))groups[key+':'+value]=aggregate(rows.filter(r=>r[key]===value));
if(args.startingOnly)for(const root of M.STARTING_GIFT_IDS)for(const style of ['learning','steady'])for(const attrition of [false,true])groups[`${root}:${style}:${attrition?'attrition':'clear'}`]=aggregate(rows.filter(r=>r.startingSkill===root&&r.style===style&&r.attrition===attrition));
for(const key of ['style','role','policy','tier'])for(const value of new Set(rows.map(r=>r[key])))for(const attrition of [false,true])groups[`${key}:${value}:${attrition?'attrition':'clear'}`]=aggregate(rows.filter(r=>r[key]===value&&r.attrition===attrition));
for(const style of Object.keys(profiles))for(const tier of [1,3,6])for(const policy of policies)groups[`${style}:a${tier}:${policy}:clear`]=aggregate(rows.filter(r=>r.style===style&&r.tier===tier&&r.policy===policy&&!r.attrition));
for(const style of Object.keys(profiles))for(const tier of [1,3,6])for(const attrition of [false,true])groups[`${style}:a${tier}:${attrition?'attrition':'clear'}`]=aggregate(rows.filter(r=>r.style===style&&r.tier===tier&&r.attrition===attrition));
for(const name of new Set(sensitivity.map(r=>r.adjustment)))groups['sensitivity:'+name]=aggregate(sensitivity.filter(r=>r.adjustment===name));
const inv=[...inventories.values()],coverage={layouts:inv.length,biomes:[...new Set(inv.map(i=>i.biome))].sort(),authoredMaps:new Set(inv.map(i=>i.levelId)).size,
 minFuelPerSecond:round(Math.min(...inv.map(i=>i.fuelPerSecond))),medianFuelPerSecond:round(percentile(inv.map(i=>i.fuelPerSecond),.5)),maxFuelPerSecond:round(Math.max(...inv.map(i=>i.fuelPerSecond))),
 budgetShortfalls:inv.filter(i=>i.glowBudget?.shortfall>0).map(i=>({key:i.key,shortfall:i.glowBudget.shortfall})),negativePackets:inv.reduce((s,i)=>s+i.negativeCount,0),
 byBiome:[...new Set(inv.map(i=>i.biome))].sort().map(b=>({biome:b,n:inv.filter(i=>i.biome===b).length,medianFuelRate:round(percentile(inv.filter(i=>i.biome===b).map(i=>i.fuelPerSecond),.5))}))};
const endHashes=hashes(),sourceChangedFiles=Object.keys(initialHashes).filter(name=>initialHashes[name]!==endHashes[name]);
const report={schema:2,model:'clear-sparks-current',createdAt:new Date().toISOString(),seconds:round((Date.now()-started)/1000),sourceHashes:initialHashes,endSourceHashes:endHashes,sourceChangedFiles,sourceUnchanged:sourceChangedFiles.length===0,
 assumptions:{profiles,roles,policies,proposedPriceGrowth:proposedGrowth,proposedPricePowerK:proposedPowerK,proposedConversionBase,proposedTrainingGrowth,campaigns:rows.length,sensitivityCampaigns:sensitivity.length,
  limits:['Economic inventory stress, not a geometric flight controller or measured human win rate.','Reaction figures label correction/miss scenarios; no reaction-delayed physics controller is claimed.','Pickup contacts, bad-packet avoidance, correction taps and imposed collisions are stochastic assumptions. Dark Seeds reduce visibility in play; their secondary targeting effect is represented by the miss sensitivity, not simulated as a separate fuel penalty.','Conditional-clear scenarios isolate economy even if fuel stress flags occur; attrition scenarios end failed attempts and lose their income.','Real production map graph, pickups, prices, modifiers, rewards, banking, conversion fractions and spending are used.','Uses actual node row and duration with a deterministic cached inventory per level/route/phase; does not enumerate every layout seed.','No TEST purchasing. Default campaigns choose the first of the actual two seeded gifts; startingOnly compares both offered choices with shared streams.','Spending policies buy main, the currently playable companion, Proximity and conversion skills; extra-life purchases are excluded.','Actual ArtifactEffects handles charges, seed chains and free-Lift caps; work/reveal/recharge opportunities remain scenario approximations. Black Hole exposure is an assumed straight pass at 85/140/195 clearance.','Tree fraction uses all nominal main/selected-companion/conversion ranks, including mutually exclusive paths; it is not a claim about fully purchasable completion.']},
 coverage,groups,rows,sensitivity};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({out,sourceUnchanged:report.sourceUnchanged,campaigns:rows.length,sensitivity:sensitivity.length,coverage,steady:groups['style:steady'],learning:groups['style:learning'],practiced:groups['style:practiced']},null,2));

}
export {simulateFlow,inventory,rngFor,profiles,runCase,aggregate};
