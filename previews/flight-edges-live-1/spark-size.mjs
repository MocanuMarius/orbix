// Three fuel strengths share one shell. Arc density conveys 6, 12 or 18 Sparks.
export const SPARK_TIERS=Object.freeze([
 {name:'Spark',mass:1,probability:.30},
 {name:'Cluster',mass:2,probability:.42},
 {name:'Cache',mass:3,probability:.28},
].map(Object.freeze));
export const GIANT_SPARK_RATE=0;
export const SPARK_SHELL_RADIUS=12.8;
export function sparkMass(p){
 if(!p||typeof p!=='object'||p.generated||p.kind==='sight')return 0;
 if(Number.isFinite(p.sparkMass)&&p.sparkMass>0)return Math.min(3,Math.max(1,Math.round(p.sparkMass)));
 if(p.harmful||p.kind==='dark')return 1;
 if(p.kind==='cluster'||p.kind==='dusk')return 2;
 return p.kind==='cache'||p.value===3?3:1;
}
function previousRadius(p){
 const kind=p?.harmful?'dark':p?.kind??p;
 return kind==='dark'?14.08:kind==='dusk'?16:kind==='sight'?20.8:12.8;
}
export function sparkBodyRadius(p){
 return (p?.kind??p)==='sight'?20.8:SPARK_SHELL_RADIUS;
}
export const sparkArtScale=p=>sparkBodyRadius(p)/previousRadius(p);
