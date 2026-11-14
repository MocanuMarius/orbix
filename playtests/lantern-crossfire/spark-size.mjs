// One mass unit is six Sparks. Percentages describe a whole expedition's
// natural field; individual habitats favour different parts of the spectrum.
export const SPARK_TIERS=Object.freeze([
  {name:'Small',mass:1,probability:.50},
  {name:'Cluster',mass:2,probability:.27},
  {name:'Cache',mass:3,probability:.15},
  {name:'Surge',mass:6,probability:.07},
  {name:'Giant',mass:10,probability:.01},
].map(Object.freeze));
export const GIANT_SPARK_RATE=SPARK_TIERS[4].probability;
const masses=new Set(SPARK_TIERS.map(t=>t.mass));

export function sparkMass(p){
 if(!p||typeof p!=='object'||p.generated||p.kind==='sight')return 0;
 if(masses.has(p.sparkMass))return p.sparkMass;
 if(p.harmful||p.kind==='dark')return 1;
 if(p.kind==='cluster'||p.kind==='dusk')return 2;
 return p.kind==='cache'||p.value===3?3:1;
}
function previousRadius(p){
 const k=p?.harmful?'dark':p?.kind??p;
 return k==='dark'?14.08:k==='dusk'?16:k==='sight'?20.8:12.8;
}
export function sparkBodyRadius(p,height=p?.sparkWorldHeight||430){
 // Terrain-born motes share the Small shell while keeping their own fuel rules.
 const mass=p?.generated && p.kind!=='sight'?1:sparkMass(p);
 if(!mass)return previousRadius(p);
 // The smallest case has an absolute readable minimum. Larger shells follow
 // the course height, with a lower bound so neighboring tiers remain distinct.
 const h=Math.max(100,Number(height)||430);
 switch(mass){
  case 1:return 11.2;
  case 2:return Math.max(15,h*.043);
  case 3:return Math.max(19,h*.068);
  case 6:return Math.max(22,h*.12);
  case 10:return h*.25;
 }
}
export const sparkArtScale=(p,height)=>sparkBodyRadius(p,height)/previousRadius(p);
