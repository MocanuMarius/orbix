// Mass is a property of this world object, not of its atlas sprite. Units 1–10
// each contain six displayed Sparks. Flash and generated motes keep their sizes.
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
export function sparkMass(p){
 if(!p||typeof p!=='object'||p.generated||p.kind==='sight')return 0;
 if(Number.isInteger(p.sparkMass))return limit(p.sparkMass,1,10);
 if(p.harmful||p.kind==='dark')return 1;
 if(p.kind==='cluster'||p.kind==='dusk')return 2;
 return p.kind==='cache'||p.value===3?3:1;
}
function previousRadius(p){
 const k=p?.harmful?'dark':p?.kind??p;
 return k==='dark'?14.08:k==='dusk'?16:k==='sight'?20.8:12.8;
}
export function sparkBodyRadius(p,height=p?.sparkWorldHeight||430){
 const mass=sparkMass(p),base=previousRadius(p);
 if(!mass)return base;
 const h=Math.max(100,Number(height)||430);
 // First three are deliberately hand-sized. The tail becomes a landscape feature.
 return mass<=3 ? (mass===1?base*.5:mass===2?10.8:15.8) :
   Math.max(16,15.8+(h*.25-15.8)*((mass-3)/7)**1.23);
}
export const sparkArtScale=(p,height)=>sparkBodyRadius(p,height)/previousRadius(p);
export const GIANT_SPARK_RATE=.01;
