import {WispFlight} from './flight.mjs?v=flash-2';
import {getRunModifiers,getRouteBonusCandidates,getRouteBonus,nextBonusFlightNodes} from './model.mjs?v=flash-2';
import {onboardingFlightPlan} from './onboarding.mjs?v=flash-2';
import {routeBonusFamily} from './route-bonuses.mjs?v=flash-2';

// Only the selected ID is saved. Geometry and transient planning instances never enter the save.
const memo=new WeakMap();
export function prepareRouteOffer(run,node,{profile={},width=900,height=405}={}){
 const candidates=getRouteBonusCandidates(run,node);
 if(!candidates.length){if(node)node.bonusId=null;return null;}
 // A saved offer is an agreement with the player, including an entrance that
 // has already been committed. New ranking only fills unsighted route offers.
 if(candidates.includes(node.bonusId))return getRouteBonus(run,node);
 if(node.bonusId===null&&(run.current?.id===node.id||run.path?.includes(node.id)))return null;
 const plan=onboardingFlightPlan(profile,run),mods=getRunModifiers({...run,current:node});
 mods.flightBoon=run.attemptActive?run.attemptEntry?.flightBoon??null:run.nextFlightBoon??null;
 const key=JSON.stringify([run.seed,node.atlasForecast,width,height,plan,mods,candidates]);
 const cached=memo.get(node);
 if(cached?.key===key){node.bonusId=cached.id;return getRouteBonus(run,node);}
 const geometry=(site,benefits,teaching)=>{
  const ctx={setTransform(){}},canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width,height,left:0})};
  return new WispFlight({preflight:true,canvas,node:{...site,bonusId:null},terrain:site.terrain,elite:site.elite,
   seed:run.seed+'-'+site.id,duration:site.duration,companions:run.companions,skills:run.skills,
   flame:run.flame,modifiers:{...benefits,onboardingPlan:teaching}});
 };
 // Resolve this bounded row together. Tapping a different sibling first must
 // not change the agreement, and narrow courses should not lose their only
 // eligible action to a broad course that has a genuine alternative.
 const row=run.map.find(row=>row.some(site=>site.id===node.id))||[node];
 const entries=row.filter(site=>site.type!=='support').map(site=>{
  const ranked=site===node?candidates:getRouteBonusCandidates(run,site);
  const benefits=site===node?mods:getRunModifiers({...run,current:site});
  benefits.flightBoon=mods.flightBoon;
  const siteKey=site===node?key:JSON.stringify([run.seed,site.atlasForecast,width,height,plan,benefits,ranked]);
  if(ranked.includes(site.bonusId))return{site,key:siteKey,eligible:[site.bonusId]};
  if(!ranked.length)return{site,key:siteKey,eligible:[]};
  if(site.bonusId===null&&(run.current?.id===site.id||run.path?.includes(site.id)))return{site,key:siteKey,eligible:[]};
  const scene=geometry(site,benefits,plan);
  const eligible=ranked.filter(id=>{
   if(!scene.planRouteObjective(id))return false;
   if(id==='night-sail'){
    const next=nextBonusFlightNodes(run,site);
    if(!next.length||!next.every(future=>{
     const preview=geometry(future,getRunModifiers({...run,current:future}),
      onboardingFlightPlan(profile,{...run,stats:{...run.stats,flights:(run.stats?.flights||0)+1}}));
     const hasHole=preview.blackHoles.items.length>0;preview.destroy();return hasHole;
    }))return false;
   }
   return true;
  });
  scene.destroy();
  // Keep the one bounded currency/heart site first when it is physically valid.
  const special=eligible.find(id=>['gilded','precision','three-suns'].includes(id));
  return{site,key:siteKey,eligible:special?[special]:eligible};
 }).sort((a,b)=>(a.site.routeLane??a.site.lane??0)-(b.site.routeLane??b.site.lane??0)||a.site.id.localeCompare(b.site.id));
 let best=null,bestScore=Infinity;
 function assign(index,ids,cost){
  if(index===entries.length){
   const present=ids.filter(Boolean),families=present.map(routeBonusFamily);
   const score=(present.length-new Set(present).size)*1000+(families.length-new Set(families).size)*100+cost;
   if(score<bestScore){bestScore=score;best=ids;}return;
  }
  const eligible=entries[index].eligible;
  (eligible.length?eligible:[null]).forEach((id,rank)=>assign(index+1,[...ids,id],cost+rank));
 }
 assign(0,[],0);
 entries.forEach((entry,index)=>{entry.site.bonusId=best[index];memo.set(entry.site,{key:entry.key,id:best[index]});});
 return getRouteBonus(run,node);
}
