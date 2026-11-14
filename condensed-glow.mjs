// One light economy: usable Sparks first, its actual surplus crystallizes.
// Values entering this module use the simulation's internal Sparks scale.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,d=0)=>Number.isFinite(n)?n:d;
const rank=(s,id,max)=>clamp(Math.floor(finite(s?.[id])),0,max);
export const CONDENSED_TUNING=Object.freeze({starting:8,displayScale:.3,maxMultiplier:1,
  bankStep:100,maxBankTiers:3,practiceStarting:80,trainingGrowth:.35,trainingExponent:1.5,priceStep:5});
export function getCondensationRules(skills={}){
 const advanced=rank(skills,'main-afterglow',1)>0;
 return {multiplier:1/3+(advanced?1/6:0)+(advanced ? .05*(rank(skills,'afterglow-vessel',2)+rank(skills,'afterglow-retention',2)) : 0),
  bankStep:CONDENSED_TUNING.bankStep,bankBonusPerTier:advanced ? .025*rank(skills,'afterglow-anchor',2) : 0,
  maxBankTiers:CONDENSED_TUNING.maxBankTiers,maxMultiplier:CONDENSED_TUNING.maxMultiplier};
}
/** Fractional credit survives pickups, never rounds each tiny fragment up.
 * The bank tier rewards keeping currency, not waiting: no passive interest. */
export function condenseGlow(rawInternal,{rules={},wallet=0,remainder=0}={}){
 const rawGlow=Math.max(0,finite(rawInternal))*CONDENSED_TUNING.displayScale;
 const tiers=Math.min(CONDENSED_TUNING.maxBankTiers,Math.max(0,Math.floor(finite(wallet)/Math.max(1,finite(rules.bankStep,CONDENSED_TUNING.bankStep)))));
 const multiplier=clamp(finite(rules.multiplier,1/3)+tiers*clamp(finite(rules.bankBonusPerTier),0,.1),1/3,CONDENSED_TUNING.maxMultiplier);
 const total=rawGlow*multiplier+clamp(finite(remainder),0,.999999999),amount=Math.floor(total+1e-9);
 return{amount,remainder:Math.round(Math.max(0,total-amount)*1e9)/1e9,multiplier,rawGlow};
}
