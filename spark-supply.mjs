import {getPickupSpec,pickupKind} from './pickups.mjs?v=detail-1';
import {sparkMass} from './spark-size.mjs?v=detail-1';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fuel=p=>!p.generated&&!p.harmful?getPickupSpec(p).fuel:0;
const DISPLAY=.3,UNIT=20;
// A published progression envelope, not a tax on the player's actual build.
// Buying a discount, capacity or regeneration still improves the same course.
export const SUPPLY_CURVE=Object.freeze({capture:[.60,.66,.70],referenceLift:[3,2.55,2.30],
  steering:[1,1.10,1.20],firstReserve:30,checkpointReserve:15,coastSeconds:1.75});

export function sparkDemand({duration,mapIndex=0,stage=0,difficulty=1,elite=false,boss=false,
 gravity=300,impulse=205,updrafts=0,liftProps=0,bloomFuel=0}={}){
 const map=clamp(Math.floor(mapIndex),0,2),depth=clamp(stage/6,0,1);
 const first=map===0&&stage===0;
 const starter=map===0&&stage<=2&&!elite&&!boss;
 const capture=clamp(SUPPLY_CURVE.capture[map]+Math.max(0,difficulty-2)*.008+(elite?.015:0),.60,.78);
 const interval=2*impulse/gravity;
 const windCredit=Math.min(duration*.065,updrafts*.65+liftProps*.45);
 const minimumLifts=Math.max(1,Math.floor((duration-SUPPLY_CURVE.coastSeconds-windCredit)/interval));
 const referenceCost=starter?3:SUPPLY_CURVE.referenceLift[map];
 const steering=starter?1:SUPPLY_CURVE.steering[map]+depth*.055+(boss?.035:0);
 const effort=minimumLifts*referenceCost*steering;
 // Any bare starter can follow a Rest and enter full. Using the half-full
 // checkpoint reserve here would let that refill bypass the 60% budget.
 const reserve=first||starter?SUPPLY_CURVE.firstReserve:SUPPLY_CURVE.checkpointReserve;
 const environment=Math.min(effort*.10,Math.max(0,bloomFuel)*DISPLAY);
 const needed=Math.max(6,effort-reserve-environment);
 const units=Math.max(1,Math.floor(needed/capture/6));
 return {mapIndex:map,stage,difficulty,starter,capture,minimumLifts,referenceLiftCost:referenceCost,
  steering,referenceEffort:effort,referenceReserve:reserve,environmentCredit:environment,
  windCredit,targetFuel:units*UNIT,targetSparks:units*6,interval,
  neededSparks:needed,requiredShare:needed/(units*6),version:2};
}

function setStrength(p,mass){
 p.sparkMass=mass;p.kind=mass===1?'light':mass===2?'cluster':'cache';p.value=mass;p.fuel=true;
}

// Final pass after set pieces, objectives, holes and recovery lights are known.
// It changes real pickups, never completion eligibility or a hidden quota.
export function balanceSparkSupply(layout,{duration,height,speed,endX,mapIndex=0,stage=0,difficulty=1,
 elite=false,boss=false,targets=[],drafts=[],actors=[],hazards=[],clear,physics={}}={}){
 const good=layout.embers.filter(p=>fuel(p)>0),marked=new Set(targets.map(t=>t.object));
 const demand=sparkDemand({duration,mapIndex,stage,difficulty,elite,boss,...physics,
  updrafts:drafts.filter(d=>d.direction<0).length,
  liftProps:actors.filter(a=>a.family==='lift'||a.family==='vent').length,
  bloomFuel:actors.filter(a=>a.family==='bloom').length*10});
 const before=good.reduce((n,p)=>n+fuel(p),0),removed=new Set();
 const original=new Map(good.map(p=>[p,sparkMass(p)]));
 const fixed=p=>marked.has(p)||p.riskChain||p.intro||getPickupSpec(p).dim>0;
 const anchored=p=>fixed(p)||p.forkCache||p.feature==='fork-safe-fuel'||p.blackHoleBypass||p.atlasBypass||p.challengeLandmark;
 const mutable=good.filter(p=>!fixed(p));
 for(const p of mutable)setStrength(p,1);
 let available=good.reduce((n,p)=>n+fuel(p),0);
 const average={filament:1.7,cluster:1.95,vault:2.1,mineral:2.2};
 const biome=layout.levelIdentity?.biomeId;
 const habitat=['pinewood','marsh','thorn'].includes(biome)?'filament':['fungal','coral','cloud'].includes(biome)?'cluster':['crystal','frost','basalt'].includes(biome)?'mineral':'vault';
 const countTarget=Math.max(6,Math.round(demand.targetFuel/(UNIT*average[habitat])));
 const end=endX??duration*speed;
 const maxGap=speed*(demand.starter?6.6:mapIndex>=2?7:6.8);
 const ordered=[...mutable].filter(p=>!anchored(p)).sort((a,b)=>{
  const crowd=p=>good.some(q=>q!==p&&Math.abs(q.x-p.x)<speed*.8);
  return Number(crowd(b))-Number(crowd(a))||Number(!!a.accessible)-Number(!!b.accessible)||a.x-b.x;
 });
 for(const p of ordered){
  if(available<=demand.targetFuel&&good.length-removed.size<=countTarget)break;
  const others=good.filter(q=>q!==p&&!removed.has(q)).sort((a,b)=>a.x-b.x);
  const left=others.filter(q=>q.x<p.x).at(-1),right=others.find(q=>q.x>p.x);
  if(!left||!right||right.x-left.x>maxGap)continue;
  // Keep an opening approach and exit recovery; leave the player time to see.
  if(p.x<speed*2.5||p===good.at(-1))continue;
  removed.add(p);available-=fuel(p);
 }
 // Short, high-tier courses can otherwise retain one unit above the cap
 // solely because the normal spacing guard protected every remaining gap.
 // Keep authored marks and hazards; allow one wider, vessel-crossable interval.
 for(const p of [...ordered].sort((a,b)=>a.x-b.x)){
  if(available<=demand.targetFuel)break;
  if(removed.has(p)||p.x<speed*2.5||p===good.at(-1))continue;
  const others=good.filter(q=>q!==p&&!removed.has(q)).sort((a,b)=>a.x-b.x);
  const left=others.filter(q=>q.x<p.x).at(-1),right=others.find(q=>q.x>p.x);
  if(!left||!right||right.x-left.x>speed*8.5)continue;
  removed.add(p);available-=fuel(p);
 }
 const kept=good.filter(p=>!removed.has(p)),adjustable=mutable.filter(p=>!removed.has(p));
 const span=speed*6;
 const local=p=>kept.reduce((n,q)=>n+(Math.abs(q.x-p.x)<span/2?fuel(q):0),0);
 // Fill lean windows first, then restore each habitat's original preferences.
 while(available+UNIT<=demand.targetFuel){
  let options=adjustable.filter(p=>sparkMass(p)<(demand.starter&&p.accessible?2:3));
  if(!options.length)options=adjustable.filter(p=>sparkMass(p)<3);
  if(!options.length)break;
  options.sort((a,b)=>local(a)-local(b)||Number(!!b.accessible)-Number(!!a.accessible)
    ||(original.get(b)-sparkMass(b))-(original.get(a)-sparkMass(a))||a.x-b.x);
  const p=options[0];setStrength(p,sparkMass(p)+1);available+=UNIT;
 }
 layout.embers=layout.embers.filter(p=>!removed.has(p));
 // A fixed challenge can reserve several rich late pickups. Move a spare
 // unmarked packet into an earlier fuel drought rather than increase supply or
 // alter the challenge's marks. Forecast is an explicit imperfect-capture
 // envelope; it never reads or scales against the player's purchased build.
 let relocations=0;
 const firstX=end-duration*speed;
 const effortRate=demand.referenceEffort/Math.max(1,duration)/DISPLAY;
 const usable=p=>fuel(p)*(p.accessible?.85:p.riskChain?.55:.5);
 const forecast=()=>{
  // Total supply assumes the most generous legal starter entry (full after
  // Rest); placement must also work after the normal half-full checkpoint.
  let reserve=(stage===0&&mapIndex===0?SUPPLY_CURVE.firstReserve:SUPPLY_CURVE.checkpointReserve)/DISPLAY,last=0;
  for(const p of [...kept].sort((a,b)=>a.x-b.x)){
   const t=Math.max(0,(p.x-firstX)/speed);
   if(t>duration)break;
   const lowAt=last+Math.max(0,reserve-15)/Math.max(.01,effortRate);
   if(lowAt<t-.1)return firstX+speed*lowAt;
   reserve=Math.min(100,reserve-effortRate*(t-last)+usable(p));last=t;
  }
  return null;
 };
 if(clear)for(let repair=0;repair<Math.ceil(duration/24);repair++){
  const need=forecast();if(need==null)break;
  const donors=adjustable.filter(p=>!anchored(p)&&p.x>need+speed*4).sort((a,b)=>Number(!!a.accessible)-Number(!!b.accessible)||b.x-a.x);
  let moved=false;
  for(const p of donors){
   const others=kept.filter(q=>q!==p).sort((a,b)=>a.x-b.x),left=others.filter(q=>q.x<p.x).at(-1),right=others.find(q=>q.x>p.x);
   if((right?.x??end)-(left?.x??firstX)>speed*7.5)continue;
   const spots=[-speed*.65,-speed,0].flatMap(dx=>[.5,.46,.54,.42,.58].map(fraction=>({x:need+dx,y:height*fraction})));
   for(const {x,y} of spots){
    if(x<speed*2||x>end-speed*2||!clear(x,y,32)||!clear(x-45,y,28)||!clear(x+45,y,28))continue;
    if(layout.embers.some(q=>q!==p&&Math.hypot(q.x-x,q.y-y)<(q.harmful||getPickupSpec(q).dim>0?140:55)))continue;
    if(hazards.some(h=>Math.abs(h.x-x)<(h.influence||h.radius||60)+80)||drafts.some(d=>Math.abs(d.x-x)<d.rx+45))continue;
    Object.assign(p,{x,y,anchor:null,pocket:false,accessible:true,supplyRelocated:true});moved=true;relocations++;break;
   }
   if(moved)break;
  }
  if(!moved)break;
 }
 layout.embers.sort((a,b)=>a.x-b.x);
 const sorted=[...kept].sort((a,b)=>a.x-b.x),gaps=[];
 for(let i=1;i<sorted.length;i++)gaps.push((sorted[i].x-sorted[i-1].x)/speed);
 if(layout.glowBudget){
  layout.glowBudget.constructionTarget??=layout.glowBudget.target;
  Object.assign(layout.glowBudget,{target:demand.targetFuel,available,shortfall:Math.max(0,demand.targetFuel-available),normalized:true});
 }
 layout.sparkSupply={...demand,before,available,availableSparks:available*DISPLAY,
  actualReferenceShare:demand.neededSparks/(available*DISPLAY),removed:removed.size,relocations,forecastDrought:forecast(),count:kept.length,maxGap:Math.max(0,...gaps),
  budgetExcess:Math.max(0,available-demand.targetFuel),budgetDeficit:Math.max(0,demand.targetFuel-available)};
 return layout.sparkSupply;
}
