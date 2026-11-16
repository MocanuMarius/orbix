/**
 * Audit the game's route candidate, physical preflight and bounded income.
 * The economy model conditions on clearing a flight. Per-target misses and
 * ordinary overflow are sensitivity inputs, not measurements of human wins.
 */
import {writeFileSync} from 'node:fs';
import {newState,createRun,advanceMap,chooseStartingGift,getStartingGiftOffers,getChoices,selectNode,getRouteBonusCandidates,getAvailableUpgrades,
  getSkillCost,getSkillWallet,buyCheckpointSkill} from '../dist/model.mjs';
import {prepareRouteOffer} from '../dist/route-offers.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {playRouteWitness} from './route-bonus-controller.mjs';

const roles=['collector','protector','swift','leveler'];
const tables=[];
const counts=()=>Object.fromEntries(Object.keys(ROUTE_BONUSES).map(id=>[id,0]));
const proposed=counts(),offered=counts();
const biomes=new Set(),seenRoles=new Set(),locations=new Set();
const byRole={},byMap=[counts(),counts(),counts()];
const witnessCases=new Map();
let cases=0,unoffered=0,fallbacks=0;
const scenarios=Math.max(4,Number(process.argv[2]||8));
function rand(seed) {
  let n=seed>>>0;
  return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};
}

for(let i=0;i<scenarios;i++){
  const profile=newState().profile;
  profile.difficulty=[1,2,4,6][i%4];
  if(i%4!==0)profile.stats.flights=32;
  const run=createRun(profile,'route-bonus-audit-'+i,[1,2,4,6][i%4]);
  run.companionRole=roles[(i+Math.floor(i/4))%4];run.companions=[run.companionRole];seenRoles.add(run.companionRole);
  byRole[run.companionRole]??=counts();
  const gift=getStartingGiftOffers(run)[i%2]?.id||getStartingGiftOffers(run)[0]?.id;
  if(!chooseStartingGift({run,profile},gift))throw Error('Invalid starting gift '+gift);
  const walletTemplate=structuredClone(run);
  if(i%3===1)run.skills['main-speed']=1;
  run.lives=i%4===0?3:2;
  const campaign=[];
  for(let m=0;m<3;m++){
    if(m){run.phase='map-clear';advanceMap(run);}
    const rows=run.map;
    for(const site of rows.flat()){
      if(site.type==='support'||site.boss&&m===2)continue;
      run.stats.flights=m*5+Math.min(site.row,4);
      const ranked=getRouteBonusCandidates(run,site);
      const type=prepareRouteOffer(run,site,{profile,width:i%2?740:900,height:i%2?333:405});
      cases++;biomes.add(site.biomeId);locations.add(site.levelId);
      if(ranked[0])proposed[ranked[0]]++;
      if(type){
        offered[type.id]++;byRole[run.companionRole][type.id]++;byMap[m][type.id]++;if(type.id!==ranked[0])fallbacks++;
        const key=type.id+'/'+run.companionRole;
        if(!witnessCases.has(key))witnessCases.set(key,{run:structuredClone(run),node:structuredClone(site),profile:structuredClone(profile),width:i%2?740:900,height:i%2?333:405});
      }
      else unoffered++;
    }
    campaign.push(structuredClone(rows));
  }
  tables.push({campaign,walletTemplate});
}

function met(id,hit,random) {
  if(!id)return false;
  if(id==='flash-relay'){
    if(random()>=hit)return false;
    return [0,1,2].filter(()=>random()<hit).length>=2;
  }
  const trials=['gilded','precision'].includes(id)?6:id==='spark-trail'?5:ROUTE_BONUSES[id].target;
  const threshold=ROUTE_BONUSES[id].target;
  let successes=0;
  for(let n=0;n<trials;n++)successes+=Number(random()<hit);
  return successes>=threshold;
}
function wallets(template){
  return [0,1].map(()=>({profile:newState().profile,run:{...structuredClone(template),restReady:true}}));
}
function buyAtRest(state) {
  let count=0;
  state.run.lastRest={mapIndex:state.run.mapIndex,boon:'recover'};
  while(true){
    const wallet=getSkillWallet(state),affordable=getAvailableUpgrades(state).sort((a,b)=>getSkillCost(wallet,a)-getSkillCost(wallet,b)||a.localeCompare(b));
    if(!affordable.length||!buyCheckpointSkill(state,affordable[0]))return count;
    count++;
  }
}
const results=[];
for(const hit of [.55,.7,.85])for(const policy of ['uniform','seek-cash']){
 let paid=0,flights=0,extraRanks=0,beforeRanks=0,trials=0,maxPaid=0;
 const taken=counts(),metCondition=counts();
 for(const [index,{campaign,walletTemplate}]of tables.entries())for(let rep=0;rep<24;rep++){
  const random=rand(2153+index*10007+rep*503),states=wallets(walletTemplate);
  let total=0;
  for(const [m,map]of campaign.entries()){
    let prev=null,lastElite=false;
    for(const row of map){
      const choices=row.filter(n=>(!prev||prev.nextIds.includes(n.id))&&!(lastElite&&n.elite));
      const money=choices.filter(n=>['precision','gilded'].includes(n.bonusId));
      const eligible=policy==='seek-cash'&&money.length?money:choices;
      const n=eligible[Math.floor(random()*eligible.length)];
      prev=n;
      if(n.type==='support'){
        if(n.kind==='camp'){const base=buyAtRest(states[0]),bonus=buyAtRest(states[1]);beforeRanks+=base;extraRanks+=bonus-base;}
        continue;
      }
      lastElite=n.elite;
      if(n.boss&&m===2)continue;
      const overflow=Math.floor(random()*9);
      const id=n.bonusId,completed=met(id,hit,random);
      if(id){taken[id]++;if(completed)metCondition[id]++;}
      const extra=completed?(id==='gilded'?Math.min(30,20+overflow):id==='precision'?8:0):0;
      total+=extra;flights++;
      states[0].run.condensedGlow+=20+overflow;
      states[1].run.condensedGlow+=20+overflow+extra;
    }
    for(const s of states)s.run.mapIndex=Math.min(2,m+1);
  }
  if(total>46)throw Error('Payout cap breached');
  maxPaid=Math.max(maxPaid,total);trials++;paid+=total;
 }
 results.push({hit,policy,samples:trials,paidPerFlight:+(paid/flights).toFixed(3),paidPerRun:+(paid/trials).toFixed(2),maxRun:maxPaid,baseRestPurchases:+(beforeRanks/trials).toFixed(2),rewardRestPurchases:+((beforeRanks+extraRanks)/trials).toFixed(2),extraRestPurchases:+(extraRanks/trials).toFixed(2),taken,metCondition});
}
const actualPaths=[];
const pathOffered=counts(),pathTaken=counts();
for(let i=0;i<scenarios;i++){
 const profile=newState().profile;profile.stats.flights=32;profile.difficulty=6;
 const run=createRun(profile,'route-bonus-actual-path-'+i,[1,2,4,6][i%4]);
 run.companionRole=roles[i%4];run.companions=[run.companionRole];
 const gift=getStartingGiftOffers(run)[i%2]?.id||getStartingGiftOffers(run)[0]?.id;
 if(!chooseStartingGift({run,profile},gift))throw Error('Invalid actual-path gift '+gift);
 const random=rand(773+i*113),maps=[];
 for(let m=0;m<3;m++){
  if(m){run.phase='map-clear';advanceMap(run);}
  const reached=[];
  while(run.step<run.map.length){
   run.phase='map';
   const choices=getChoices(run);
   if(!choices.length)throw Error('Actual route has no connected choice');
   for(const site of choices){
    if(site.type==='support'||site.boss&&m===2)continue;
    const offer=prepareRouteOffer(run,site,{profile,width:i%2?740:900,height:i%2?333:405});
    if(offer)pathOffered[offer.id]++;
   }
   const chosen=choices[Math.floor(random()*choices.length)];
   if(!selectNode(run,chosen.id))throw Error('Actual route selection failed');
   reached.push({row:chosen.row,nodeId:chosen.id,bonusId:chosen.bonusId||null});
   if(chosen.type!=='support'){run.stats.flights++;if(chosen.bonusId)pathTaken[chosen.bonusId]++;}
   // Clear conditioning concerns the offered challenge mix, not physical wins.
   // Advance only the selected connected stop; run.path retains real history.
   run.step++;run.current=null;
  }
  maps.push(reached);
 }
 actualPaths.push({seed:run.campaignSeed,gift,maps});
}
const witnesses=[];
for(const [index,example]of [...witnessCases.values()].entries()){
 for(const [j,style]of ['human150','human250','human350'].entries())witnesses.push(playRouteWitness(example,style,rand(1447+index*37+j)));
}
const report={scenarios,actualPathAudit:{offered:pathOffered,taken:pathTaken,paths:actualPaths},cases,biomes:biomes.size,levelIdentities:locations.size,companions:[...seenRoles],fallbacks,unoffered,proposed,offered,byRole,byMap,economy:results,witnesses};
console.log(JSON.stringify(report,null,2));
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
