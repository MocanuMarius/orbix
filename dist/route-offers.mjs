import {WispFlight} from './flight.mjs?v=near-landscape-1';
import {getRunModifiers,getRouteBonusCandidates,nextBonusFlightNodes} from './model.mjs?v=near-landscape-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=near-landscape-1';
import {onboardingFlightPlan} from './onboarding.mjs?v=near-landscape-1';

// Only the selected ID is saved. Geometry and transient planning instances never enter the save.
const memo=new WeakMap();
export function prepareRouteOffer(run,node,{profile={},width=900,height=405}={}){
 const candidates=getRouteBonusCandidates(run,node);
 if(!candidates.length){if(node)node.bonusId=null;return null;}
 const plan=onboardingFlightPlan(profile,run),mods=getRunModifiers({...run,current:node});
 mods.flightBoon=run.attemptActive?run.attemptEntry?.flightBoon??null:run.nextFlightBoon??null;
 const key=JSON.stringify([run.seed,node.atlasForecast,width,height,plan,mods,candidates]);
 const cached=memo.get(node);
 if(cached?.key===key){node.bonusId=cached.id;return ROUTE_BONUSES[cached.id]||null;}
 const geometry=(site,benefits,teaching)=>{
  const ctx={setTransform(){}},canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width,height,left:0})};
  return new WispFlight({preflight:true,canvas,node:{...site,bonusId:null},terrain:site.terrain,elite:site.elite,
   seed:run.seed+'-'+site.id,duration:site.duration,companions:run.companions,skills:run.skills,
   flame:run.flame,modifiers:{...benefits,onboardingPlan:teaching}});
 };
 const scene=geometry(node,mods,plan);
 const id=candidates.find(id=>{
  if(!scene.planRouteObjective(id))return false;
  if(id==='night-sail'){
   const next=nextBonusFlightNodes(run,node);
   if(!next.length||!next.every(site=>geometry(site,getRunModifiers({...run,current:site}),
      onboardingFlightPlan(profile,{...run,stats:{...run.stats,flights:(run.stats?.flights||0)+1}})).blackHoles.items.length>0))return false;
  }
  return true;
 })||null;
 memo.set(node,{key,id});node.bonusId=id;return ROUTE_BONUSES[id]||null;
}
