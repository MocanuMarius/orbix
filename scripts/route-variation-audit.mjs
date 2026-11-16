import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {newState,createRun,advanceMap,getChoices,getRunModifiers,getStartingGiftOffers,chooseStartingGift} from '../dist/model.mjs';
import {prepareRouteOffer} from '../dist/route-offers.mjs';
import {onboardingFlightPlan} from '../dist/onboarding.mjs';
import {WispFlight} from '../dist/flight.mjs';

const samples=Math.max(1,Number(process.argv[2]||4));
const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:740,height:333,left:0})};
const report={samples,viewport:[740,333],modes:{},witnesses:[]};
for(const mode of ['standard-first','cards-first','cards-returning']){
 const counts={},byMap=[{},{},{}],decisions={total:0,withRepeatedFlightBonus:0,allFlightsSame:0,opening:0,openingRepeated:0,nullOffers:0};
 for(let seed=0;seed<samples;seed++){
  const state=newState(),profile=state.profile;
  if(mode.endsWith('returning'))profile.stats.flights=32;
  const run=state.run=createRun(profile,'route-current-'+seed,1,{cards:mode.startsWith('cards')});
  const gift=getStartingGiftOffers(run)[0];if(gift)assert.ok(chooseStartingGift(state,gift.id));
  // The distribution covers ordinary initial health, without forced unlocks.
  for(let mapIndex=0;mapIndex<3;mapIndex++){
   if(mapIndex){run.phase='map-clear';advanceMap(run);}
   for(const row of run.map)for(const node of row){
    if(node.type==='support'||node.boss&&mapIndex===2)continue;
    run.stats.flights=mapIndex*5+Math.min(node.row,4);
    const bonus=prepareRouteOffer(run,node,{profile,width:740,height:333}),id=bonus?.id||'none';
    counts[id]=(counts[id]||0)+1;byMap[mapIndex][id]=(byMap[mapIndex][id]||0)+1;
    if(!bonus)decisions.nullOffers++;
    // A production flight, not just the preview planner, must fund its marks.
    if(bonus&&!report.witnesses.some(w=>w.mode===mode&&w.id===id)){
     const engine=new WispFlight({preflight:true,canvas,node,seed:run.seed+'-'+node.id,terrain:node.terrain,
      duration:node.duration,elite:node.elite,companions:run.companions,skills:run.skills,flame:run.flame,
      modifiers:{...getRunModifiers({...run,current:node}),onboardingPlan:onboardingFlightPlan(profile,run)}});
     assert.ok(engine.routeObjective?.eligible,[mode,node.id,id].join(':'));
     report.witnesses.push({mode,id,node:node.id,level:node.levelId,marks:engine.routeObjective.targets.length,
      target:engine.routeObjective.target,fuelBudgetExcess:engine.layout.sparkSupply.budgetExcess});
     assert.equal(engine.layout.sparkSupply.budgetExcess,0);engine.destroy();
    }
   }
   // Count each legally reachable fork once, including the starting choice.
   const visited=new Set();
   function walk(path=[],step=0){
    if(step>=run.map.length)return;
    const scenario={...run,path,step,phase:'map',current:null},choices=getChoices(scenario);
    const key=choices.map(n=>n.id).join('|');
    if(!key||visited.has(key))return;visited.add(key);
    const flights=choices.filter(n=>n.type!=='support'),ids=flights.map(n=>n.bonusId).filter(Boolean);
    if(flights.length>1){
     const repeated=new Set(ids).size<ids.length;
     decisions.total++;decisions.withRepeatedFlightBonus+=Number(repeated);
     decisions.allFlightsSame+=Number(ids.length===flights.length&&new Set(ids).size===1);
     if(step===0){decisions.opening++;decisions.openingRepeated+=Number(repeated);}
    }
    for(const choice of choices)walk([...path,choice.id],step+1);
   }
   walk();run.path=[];run.step=0;
  }
 }
 report.modes[mode]={counts,byMap,decisions};
 console.log(mode,JSON.stringify(report.modes[mode]));
}
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
