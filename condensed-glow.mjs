// One light economy: usable Sparks first, its actual surplus crystallizes.
// Values entering this module use the simulation's internal Sparks scale.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,d=0)=>Number.isFinite(n)?n:d;
const rank=(s,id,max)=>clamp(Math.floor(finite(s?.[id])),0,max);
export const CONDENSED_TUNING=Object.freeze({starting:8,displayScale:.3,maxMultiplier:1,
  practiceStarting:80,trainingGrowth:.24,trainingExponent:1.5,priceStep:5});
export const KEPT_LIGHT_MAX_PRINCIPAL=100;
export function getFlightPackingLimit(skills={}){
 return 20+(skills['main-afterglow']?10:0)+5*rank(skills,'afterglow-vessel',2)+5*rank(skills,'afterglow-retention',2);
}
/** Quote once at departure. Each rank pays 5% on the first 100 banked Stored Sparks. */
export function getKeptLightDividend(balance,level){
 const principal=clamp(Math.floor(finite(balance)),0,KEPT_LIGHT_MAX_PRINCIPAL);
 const ranks=clamp(Math.floor(finite(level)),0,2);
 return Math.floor(principal*ranks/20);
}
export function getCondensationRules(skills={}){
 const advanced=rank(skills,'main-afterglow',1)>0;
 return {multiplier:1/6+(advanced?1/6:0)+(advanced ? .05*(rank(skills,'afterglow-vessel',2)+rank(skills,'afterglow-retention',2)) : 0),
  maxMultiplier:CONDENSED_TUNING.maxMultiplier};
}
/** Fractional overflow survives pickups, independently of clear dividends. */
export function condenseGlow(rawInternal,{rules={},remainder=0,limit=Infinity,packed=0}={}){
 const rawGlow=Math.max(0,finite(rawInternal))*CONDENSED_TUNING.displayScale;
 const multiplier=clamp(finite(rules.multiplier,1/6),1/6,CONDENSED_TUNING.maxMultiplier);
 const total=rawGlow*multiplier+clamp(finite(remainder),0,.999999999);
 const room=Math.max(0,limit-Math.max(0,finite(packed))),amount=Math.min(room,Math.floor(total+1e-9));
 return{amount,remainder:room<=amount?0:Math.round(Math.max(0,total-amount)*1e9)/1e9,multiplier,rawGlow};
}
