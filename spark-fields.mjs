import {getPickupSpec,pickupKind,pickupContactRadius} from './pickups.mjs?v=guardian-beat-1';
import {GIANT_SPARK_RATE,sparkMass,sparkBodyRadius} from './spark-size.mjs?v=guardian-beat-1';

// Assign exceptional masses AFTER fuel balancing, objectives, forks and boss
// choreography. Never turn a compulsory pickup or a scripted Dark seed into a giant.
export function installSparkField(layout,{height,random,clear,targets=[],protectedSites=[],opening=false}){
 const all=layout.embers,marked=new Set(targets.map(t=>t.object)),busy=[];
 const authored=p=>p.riskChain||p.intro||p.forkCache||p.atlasBypass||p.blackHoleBypass||p.challengeLandmark||marked.has(p);
 const sparks=all.filter(p=>!p.generated&&['light','cluster','cache','dark'].includes(pickupKind(p)));
 for(const p of sparks){
  p.sparkMass=sparkMass(p);p.sparkWorldHeight=height;
  if((opening||layout.boss)&&getPickupSpec(p).plasma)p.forgivingContact=true;
 }
 const candidates=sparks.filter(p=>!authored(p)&&p.x>450);
 const guardianThreats=layout.boss?.attacks||[];
 const areas=[...(layout.riskChains||[]).map(c=>[c.start-65,c.end+65]),
  ...(layout.flightForks||[]).map(f=>[f.approachStart-40,f.exitEnd+40]),
  ...targets.filter(t=>Number.isFinite(t.x)).map(t=>[t.x-60,t.x+60]),
  ...(layout.boss?.crests||[]).map(o=>[o.x-170,o.x+o.width*2.5+100]),
  ...protectedSites.filter(s=>Number.isFinite(s.x)).map(s=>[s.x-50,s.x+50])];
 const clearOfScenes=(x,r)=>!areas.some(([a,b])=>x+r>a&&x-r<b);
 const feasible=(p,m)=>{
  const dark=pickupKind(p)==='dark',trial={...p,sparkMass:m},r=sparkBodyRadius(trial,height),rim=pickupContactRadius(trial,height);
  if(!clearOfScenes(p.x,r)||busy.some(b=>Math.abs(b.x-p.x)<b.r+r+130))return null;
  if(m>=5&&guardianThreats.some(a=>Math.abs(p.x-a.x)<r+165))return null;
  for(const y of [p.y,height*.5,height*.42,height*.58,height*.36,height*.64]){
   if(!clear(p.x,y,r+2))continue;
   // A large reward in a boss room must be approachable along the passage;
   // don't tempt the player toward a wall with a collectible centred on it.
   if(layout.boss&&m>=5&&[-135,-75,75,135].some(dx=>!clear(p.x+dx,y,23)))continue;
   // The enlarged shell may not swallow another marked pickup/hazard. A giant
   // Dark Spark needs a connected body-wide way around its rim, including the
   // approach and exit (not just an empty point above it at the centre).
   if(all.some(q=>q!==p&&Math.abs(q.x-p.x)<r+18&&Math.hypot(q.x-p.x,q.y-y)<r+15))continue;
   if(dark&&![-1,1].some(side=>{
    const off=rim+16;
    for(let i=-8;i<=8;i++)if(!clear(p.x+i*off/5,y+side*off,17))return false;
    return true;
   }))continue;
   return y;
  }
  return null;
 };
 const used=new Set(),promote=(p,m)=>{
   if(used.has(p))return false;
   const y=feasible(p,m);if(y===null)return false;
   if(y!==p.y&&p.pocket){p.pocket=false;p.pocketSide=null;}
   p.sparkMass=m;p.y=y;
   if(!p.harmful&&p.kind!=='dark'){p.kind='cache';p.value=3;}
   used.add(p);busy.push({x:p.x,r:sparkBodyRadius(p,height)});return true;
 };
 // Roll once per natural Spark. If that shell cannot fit, search a nearby site
 // of the same polarity. No rerolls on collection, no reduction to guaranteed fuel.
 const rolled=sparks.map(p=>({p,n:random()}));
 for(const {p,n} of rolled){
   if(n>=GIANT_SPARK_RATE)continue;
   const dark=pickupKind(p)==='dark';
   const places=candidates.filter(q=>(pickupKind(q)==='dark')===dark).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
   for(const q of places)if(promote(q,10))break;
 }
 for(const {p,n} of rolled)if(n>=GIANT_SPARK_RATE&&n<.075&&candidates.includes(p)){
   const m=n<.019?7:n<.038?5:4;promote(p,m);
 }
 if(layout.glowBudget)layout.glowBudget.available=all.reduce((n,p)=>n+(!p.generated&&!getPickupSpec(p).dim?getPickupSpec(p).fuel:0),0);
}
