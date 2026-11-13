import {CONDENSED_TUNING} from './condensed-glow.mjs?v=artifact-clarity-1';
// Shared flight Glow and expedition rules. Overflow is Packed Light.
export const FLAME_TUNING = Object.freeze({ maximum: 100, starting: 100, flapCost: 7,
  emberFuel: 24, heartFuel: 40, generatedFuel: 6, checkpointMinimum: 0, warmCorePickups: 4 });


export const LIFE_TUNING = Object.freeze({ lives: 3, maximum: 5 });
export function getLifeCapacity(run) {
  return Math.min(LIFE_TUNING.maximum, LIFE_TUNING.lives
    + (run?.skills?.['main-spare-spark'] > 0 ? 1 : 0)
    + (run?.skills?.['main-deep-reserve'] > 0 ? 1 : 0));
}

// Dark packets affect only the current attempt's light, never lives or fuel.
export const LIGHT_PACKET_TUNING = Object.freeze({ baseRadius: 175, pickupRadius: 16,
  absorptionDuration: 1.8, absorptionLimit: 24, darkDuration: 8,
  darkPenalty: .2, darkMaximumStacks: 2, minimumLight: .6,
  recoveryFade: 1.5, dimResponse: 9 });

export const STARTING_CONDENSED_GLOW = CONDENSED_TUNING.starting;
export function getGlowCapacity(run={}) {
 return 100+(run.skills?.['main-reservoir']>0?20:0)+(run.skills?.['main-vast-vessel']>0?20:0);
}
export function glowPercent(amount,capacity=100){return (Number(amount)||0)/Math.max(1,Number(capacity)||100)*100;}
// Keep fine simulation precision for incremental skills, but one player-facing
// point is always the same amount of light. Capacity upgrades never redefine it.
export const GLOW_DISPLAY_SCALE=.3;
export const glowPoints=amount=>Math.round((Number(amount)||0)*GLOW_DISPLAY_SCALE);
export function formatGlow(amount){return String(glowPoints(amount));}
export function glowText(text,capacity=100){
 return String(text??'').replace(/([+−-]?\d+(?:\.\d+)?)(%)? (?:of )?(extra |more |less |bonus |fetched |direct |purified |pickup |maximum |max )?Glow/g,(_,n,percent,modifier='')=>{
  if(percent&&['less','more'].includes(modifier.trim()))return _;
  const amount=Number(n.replace('−','-'))*(percent?capacity/100:1);
  return `${n.startsWith('+')?'+':''}${formatGlow(amount)} ${modifier}Glow`;
 });
}
