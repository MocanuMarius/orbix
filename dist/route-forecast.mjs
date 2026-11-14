import {getMapStopInfo} from './map-guide.mjs?v=packing-parcel-1';
import {getChoices} from './model.mjs?v=packing-parcel-1';

const emptyForecast=()=>({restReachable:false,restGuaranteed:false,nextRestDistance:null,flightsToRest:null,nextStops:[],minFlights:0,maxFlights:0,minTotalFlights:0,maxTotalFlights:0,minRests:0,maxRests:0});

// A future support stop can be reached after an ordinary flight even when the
// last completed flight was elite. Find its legal arrival histories first.
function arrivalStates(run,target,byId){
 const step=Number(run?.step)||0;
 const completed=(run?.path||[]).map(id=>byId.get(id)).filter(n=>n&&n.row<step);
 const lastElite=completed.filter(n=>n.type!=='support').at(-1)?.elite===true;
 const selected=['briefing','support','retry'].includes(run?.phase)&&run?.current?.row===step?byId.get(run.current.id):null;
 const frontier=selected?[selected]:getChoices(run),states=new Map(),visited=new Set();
 function visit(n,elite,flights){
  if(!n||n.row>target.row||elite&&n.elite)return;
  const key=`${n.id}:${Number(elite)}:${flights}`;if(visited.has(key))return;visited.add(key);
  if(n.id===target.id){states.set(`${Number(elite)}:${flights}`,{elite,flights});return;}
  const nextElite=n.type==='support'?elite:n.elite===true,nextFlights=flights+(n.type==='support'?0:1);
  for(const id of n.nextIds||[]){const next=byId.get(id);if(next?.row===n.row+1)visit(next,nextElite,nextFlights);}
 }
 for(const n of frontier)visit(n,lastElite,0);
 return{states:[...states.values()],completed:completed.filter(n=>n.type!=='support').length};
}

export function getRouteForecast(run,node){
 const all=run?.map?.flat?.()||[],byId=new Map(all.map(n=>[n.id,n]));
 node=typeof node==='string'?byId.get(node):node||run?.current;
 if(!node)return emptyForecast();
 const arrivals=arrivalStates(run,node,byId);
 if(!arrivals.states.length)return{...emptyForecast(),summary:'This stop is outside your chosen route.'};
 const children=(n,lastElite)=>{
  const elite=n.type==='support'?lastElite:n.elite===true;
  return(n.nextIds||[]).map(id=>byId.get(id)).filter(next=>next&&next.row===n.row+1&&!(elite&&next.elite));
 };
 const paths=[],rests=[];
 function walk(n,lastElite,distance,flights,restCount,before){
  const isRest=n.type==='support'&&n.kind==='camp',newFlights=flights+(n.type==='support'?0:1),newRests=restCount+(isRest?1:0);
  if(isRest)rests.push({distance,flights:distance===0?0:newFlights,name:n.name,id:n.id});
  const next=children(n,lastElite);
  if(!next.length){paths.push({flights:newFlights,rests:newRests,total:arrivals.completed+before+newFlights});return;}
  const elite=n.type==='support'?lastElite:n.elite===true;
  for(const child of next)walk(child,elite,distance+1,newFlights,newRests,before);
 }
 const nextById=new Map();
 for(const arrival of arrivals.states){
  walk(node,arrival.elite,0,0,0,arrival.flights);
  for(const child of children(node,arrival.elite))nextById.set(child.id,child);
 }
 rests.sort((a,b)=>a.distance-b.distance||a.flights-b.flights);
 const nearest=rests[0],minFlights=Math.min(...paths.map(p=>p.flights)),maxFlights=Math.max(...paths.map(p=>p.flights));
 const nextStops=[...nextById.values()].map(n=>({id:n.id,type:n.type,kind:n.kind,name:getMapStopInfo(n).name,label:getMapStopInfo(n).label,elite:n.elite===true,isRest:n.kind==='camp',rewardTheme:n.rewardTheme,rewardThemeLabel:n.rewardThemeLabel,rewardPreview:n.rewardPreview,encounterFamily:n.encounterFamily,encounterPreview:n.encounterPreview,glowReward:n.glowReward}));
 return{restReachable:!!nearest,restGuaranteed:paths.length>0&&paths.every(p=>p.rests>0),nextRestDistance:nearest?.distance??null,flightsToRest:nearest?.flights??null,nextRestName:nearest?.name||null,nextRestId:nearest?.id||null,nextStops,minFlights,maxFlights,minTotalFlights:Math.min(...paths.map(p=>p.total)),maxTotalFlights:Math.max(...paths.map(p=>p.total)),minRests:Math.min(...paths.map(p=>p.rests)),maxRests:Math.max(...paths.map(p=>p.rests)),commitment:node.commitment||'',recipeId:node.recipeId,recipeName:node.recipeName,rewardTheme:node.rewardTheme,rewardThemeLabel:node.rewardThemeLabel,rewardPreview:node.rewardPreview,encounterFamily:node.encounterFamily,encounterPreview:node.encounterPreview,summary:nearest?nearest.distance===0?'Recover, prepare your companions and Dream the known next flight.':`Rest reachable in ${nearest.flights} flight${nearest.flights===1?'':'s'}.`:'No Rest is reachable on this branch.'};
}
