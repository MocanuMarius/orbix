import {getPickupSpec,pickupKind,pickupContactRadius} from './pickups.mjs?v=collector-audit-1';
import {SPARK_TIERS,sparkMass,sparkBodyRadius} from './spark-size.mjs?v=collector-audit-1';

// These four habitat profiles average to the overall tier probabilities.
// The percentage shift changes the mix without altering any authored route.
const profiles={
 filament:[.65,.22,.095,.032,.003],
 cluster:[.48,.37,.11,.035,.005],
 vault:[.49,.20,.21,.093,.007],
 mineral:[.38,.29,.185,.12,.025],
};
const habitats={pinewood:'filament',marsh:'filament',thorn:'filament',
 fungal:'cluster',coral:'cluster',cloud:'cluster',moonruins:'vault',desert:'vault',cemetery:'vault',
 crystal:'mineral',frost:'mineral',basalt:'mineral'};
export const sparkHabitat=biomeId=>habitats[biomeId]||null;

export function installSparkField(layout,{height,random,clear,targets=[],protectedSites=[],opening=false}){
 const all=layout.embers,marked=new Set(targets.map(t=>t.object)),busy=[];
 const authored=p=>p.riskChain||p.intro||p.forkCache||p.feature==='fork-safe-fuel'||p.atlasBypass||p.blackHoleBypass||p.challengeLandmark||marked.has(p);
 const natural=all.filter(p=>!p.generated&&['light','cluster','cache','dark'].includes(pickupKind(p)));
 const identity=layout.levelIdentity||{};
 const profile=profiles[sparkHabitat(identity.biomeId)]||SPARK_TIERS.map(t=>t.probability);
 const quota=new Map(SPARK_TIERS.map(t=>[t.mass,0]));
 const assigned=new Set(),initial=new Map(),order=new Map(),largeRolls=[];
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
  if(wanted>=6)largeRolls.push({p,m:wanted,dark});
  order.set(p,random());
 }
 const candidates=natural.filter(p=>!assigned.has(p));
 const attacks=layout.boss?.attacks||[];
 const areas=[...(layout.riskChains||[]).map(c=>[c.start-65,c.end+65]),
  ...(layout.flightForks||[]).map(f=>[f.approachStart-40,f.exitEnd+40]),
  ...targets.filter(t=>Number.isFinite(t.x)).map(t=>[t.x-60,t.x+60]),
  ...(layout.boss?.crests||[]).map(o=>[o.x-170,o.x+o.width*2.5+100]),
  ...protectedSites.filter(s=>Number.isFinite(s.x)).map(s=>[s.x-50,s.x+50])];
 const inScene=(p,r)=>areas.some(([a,b])=>p.x+r>a&&p.x-r<b);
 function largeSite(p,m,dark){
  const trial={...p,sparkMass:m},r=sparkBodyRadius(trial,height);
  if(inScene(p,r)||busy.some(b=>Math.abs(b.x-p.x)<b.r+r+130)||attacks.some(a=>Math.abs(p.x-a.x)<r+165))return;
  const rim=pickupContactRadius(trial,height);
  for(const y of [p.y,height*.5,height*.42,height*.58,height*.36,height*.64]){
   if(!clear(p.x,y,r+2))continue;
   if(p.accessible&&opening&&Math.abs(p.y-y)>28)continue;
   if(layout.boss&&[-135,-75,75,135].some(dx=>!clear(p.x+dx,y,23)))continue;
   if(all.some(q=>q!==p&&Math.abs(q.x-p.x)<r+height*.25+4&&Math.hypot(q.x-p.x,q.y-y)<r+sparkBodyRadius(q,height)+4))continue;
   if(dark&&![-1,1].some(side=>{
    const off=rim+16;
    for(let dx=-off*1.6;dx<=off*1.6;dx+=8)if(!clear(p.x+dx,y+side*off,17))return false;
    return true;
   }))continue;
   return y;
  }
 }
 function setMass(p,m){
  p.sparkMass=m;
  if(pickupKind(p)!=='dark'){
   p.kind=m===1?'light':m===2?'cluster':'cache';
   p.value=Math.min(3,m);
  }
 }
 // A rare roll gets first refusal on a clear pocket of the same polarity.
 // Keep the dark side of the choice avoidable all the way through the crossing.
 for(const {p,m,dark} of largeRolls.sort((a,b)=>b.m-a.m)){
  const places=candidates.filter(q=>!assigned.has(q)&&(pickupKind(q)==='dark')===dark)
    .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
  for(const q of places){
   const y=largeSite(q,m,dark);
   if(y===undefined)continue;
   if(y!==q.y&&q.pocket){q.pocket=false;q.pocketSide=null;}
   q.y=y;setMass(q,m);assigned.add(q);
   busy.push({x:q.x,r:sparkBodyRadius(q,height)});
   break;
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
  // intact. Larger hazards are handled above with a tested bypass.
  const min=minimum(p);
  let max=3;
  if(dark){
   // Ordinary Dark variants keep the lane they were originally placed in.
   while(max>1&&largeSite(p,max,true)!==p.y)max--;
  }
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
 // Trade two ordinary sizes across sections before minting any rescue fuel.
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
   v.initial+=initial.get(p);v.current+=Math.min(6,p.sparkMass);windows.set(key,v);
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
