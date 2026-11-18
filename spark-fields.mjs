import {getPickupSpec,pickupKind,pickupContactRadius} from './pickups.mjs?v=lesson-1';
import {SPARK_TIERS,sparkMass,sparkBodyRadius} from './spark-size.mjs?v=lesson-1';

// These four habitat profiles average to the overall tier probabilities.
// The percentage shift changes the mix without altering any authored route.
const profiles={
 filament:[.40,.40,.20],
 cluster:[.20,.56,.24],
 vault:[.24,.34,.42],
 mineral:[.15,.43,.42],
};
const habitats={pinewood:'filament',marsh:'filament',thorn:'filament',
 fungal:'cluster',coral:'cluster',cloud:'cluster',moonruins:'vault',desert:'vault',cemetery:'vault',
 crystal:'mineral',frost:'mineral',basalt:'mineral'};
export const sparkHabitat=biomeId=>habitats[biomeId]||null;

export function installSparkField(layout,{height,random,clear,targets=[],protectedSites=[],opening=false}){
 const all=layout.embers,marked=new Set(targets.map(t=>t.object));
 const authored=p=>p.riskChain||p.intro||p.forkCache||p.feature==='fork-safe-fuel'||p.atlasBypass||p.blackHoleBypass||p.challengeLandmark||marked.has(p);
 const natural=all.filter(p=>!p.generated&&['light','cluster','cache','dark'].includes(pickupKind(p)));
 const identity=layout.levelIdentity||{};
 const profile=profiles[sparkHabitat(identity.biomeId)]||SPARK_TIERS.map(t=>t.probability);
 const quota=new Map(SPARK_TIERS.map(t=>[t.mass,0]));
 const assigned=new Set(),initial=new Map(),order=new Map();
 let initialFuel=0;
 for(const p of natural){
  const m=sparkMass(p),dark=pickupKind(p)==='dark';
  p.sparkMass=m;p.sparkWorldHeight=height;initial.set(p,m);
  if(!dark)initialFuel+=m;
  if((opening||layout.boss)&&!dark)p.forgivingContact=true;
  if(authored(p)||p.x<450)assigned.add(p);
  let roll=random(),i=0;
  while(i<profile.length-1 && roll>=profile[i])roll-=profile[i++];
  const wanted=SPARK_TIERS[i].mass;
  quota.set(wanted,quota.get(wanted)+1);
  order.set(p,random());
 }
 const candidates=natural.filter(p=>!assigned.has(p));
 function setMass(p,m){
  p.sparkMass=m;
  if(pickupKind(p)!=='dark'){
   p.kind=m===1?'light':m===2?'cluster':'cache';
   p.value=Math.min(3,m);
  }
 }
 // Count the authored and physically placed prizes before distributing the
 // remaining tiers; protected chains count toward the real field frequency.
 for(const p of assigned)quota.set(p.sparkMass,quota.get(p.sparkMass)-1);
 const minimum=p=>opening&&pickupKind(p)!=='dark'&&p.x<1000?initial.get(p):1;
 const ordinary=candidates.filter(p=>!assigned.has(p)).sort((a,b)=>
  Number(pickupKind(b)==='dark')-Number(pickupKind(a)==='dark')||minimum(b)-minimum(a)||order.get(a)-order.get(b));
 for(const p of ordinary){
  const dark=pickupKind(p)==='dark';
  // Keep the first accessible fuel pockets dependable and their delivery lane
  // intact. Every strength shares the same physical shell.
  const min=minimum(p);
  let max=3;
  if(!dark && !clear(p.x,p.y,sparkBodyRadius({...p,sparkMass:3},height)+2))max=Math.max(2,initial.get(p));
  const options=SPARK_TIERS.filter(t=>t.mass>=min&&t.mass<=max);
  const available=options.reduce((n,t)=>n+Math.max(0,quota.get(t.mass)),0);
  let m=min;
  if(available>0){
   let ticket=random()*available;
   for(const t of options){
    ticket-=Math.max(0,quota.get(t.mass));
    if(ticket<0){m=t.mass;break;}
   }
  }
  setMass(p,m);quota.set(m,quota.get(m)-1);
 }
 // Trade two ordinary strengths across sections before minting any rescue fuel.
 // A sheltered lane can receive the richer Spark without changing field odds.
 const fuel=natural.filter(p=>pickupKind(p)!=='dark');
 const adjustable=ordinary.filter(p=>pickupKind(p)!=='dark').sort((a,b)=>
  b.sparkMass-a.sparkMass||Number(Boolean(b.accessible))-Number(Boolean(a.accessible))||order.get(a)-order.get(b));
 function restore(packets,needed){
  for(const p of packets){
   if(needed<=0)break;
   const extra=Math.min(needed,initial.get(p)-p.sparkMass);
   if(extra<=0)continue;
   const m=p.sparkMass+extra;
   setMass(p,m);needed-=extra;
  }
 }
 if(opening){
  const windows=new Map(),zone=p=>Math.floor(p.x/900);
  for(const p of fuel){
   const key=zone(p),v=windows.get(key)||{initial:0,current:0};
   v.initial+=initial.get(p);v.current+=p.sparkMass;windows.set(key,v);
  }
  for(const [key,v] of windows){
   // 36 Sparks per six-second approach is the local reserve. Surplus above
   // that stays available for later stretches and doesn't force every biome rich.
   const floor=Math.min(v.initial,6),local=adjustable.filter(p=>zone(p)===key);
   for(const receiver of local){
    if(v.current>=floor)break;
    const donor=adjustable.find(p=>{
     const spare=windows.get(zone(p)),gain=p.sparkMass-receiver.sparkMass;
     return zone(p)!==key&&gain>0&&p.sparkMass<=initial.get(receiver)&&receiver.sparkMass>=minimum(p)
      &&spare.current-gain>=Math.min(spare.initial,6);
    });
    if(donor){
     const before=receiver.sparkMass,gain=donor.sparkMass-before;
     setMass(receiver,donor.sparkMass);setMass(donor,before);
     v.current+=gain;windows.get(zone(donor)).current-=gain;
    }
   }
   if(v.current<floor)restore(local,floor-v.current);
  }
 }
 const budget=layout.glowBudget;
 // The old generator deliberately oversupplied some sections. Retain its
 // access reserve and the actual budget; leave room for low-density courses.
 const budgetMass=budget?Math.ceil(budget.target/getPickupSpec('light').fuel):initialFuel;
 const reserve=Math.min(initialFuel,Math.max(budgetMass,Math.ceil(initialFuel*(opening?.9:.84))));
 const deficit=reserve-fuel.reduce((n,p)=>n+p.sparkMass,0);
 if(deficit>0)restore(adjustable,deficit);
 if(budget){
  budget.available=all.reduce((n,p)=>n+(!p.generated&&!getPickupSpec(p).dim?getPickupSpec(p).fuel:0),0);
  budget.shortfall=Math.max(0,budget.target-budget.available);
 }
}
