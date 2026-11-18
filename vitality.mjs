import {capacityBonusSparks} from './inscriptions.mjs?v=calm-2';
import {CONDENSED_TUNING} from './condensed-glow.mjs?v=calm-2';
import {getCardCapacityBonus,getCardGrowthBonus,getCardFutureCapacityBonus,getCardBlackHoleBonus,getCardTallyCapacity} from './skill-cards.mjs?v=calm-2';
// Shared flight Sparks and expedition rules. Overflow is Stored Sparks.
export const FLAME_TUNING = Object.freeze({ maximum: 100, starting: 100, flapCost: 10,
  emberFuel: 20, heartFuel: 60, generatedFuel: 6, checkpointMinimum: 0, warmCorePickups: 4 });


export const LIFE_TUNING = Object.freeze({ lives: 3, maximum: 5 });
export function getLifeCapacity(run) {
  return Math.min(LIFE_TUNING.maximum, LIFE_TUNING.lives
    + (run?.skills?.['main-spare-spark'] > 0 ? 1 : 0)
    + (run?.skills?.['main-deep-reserve'] > 0 ? 1 : 0));
}

// Dark packets affect only the current attempt's light, never lives or fuel.
export const LIGHT_PACKET_TUNING = Object.freeze({ baseRadius: 145, pickupRadius: 16,
  absorptionDuration: 1.58, absorptionLimit: 24, darkDuration: 8,
  darkPenalty: .2, darkMaximumStacks: 2, minimumLight: .6,
  recoveryFade: 1.5, dimResponse: 9 });

export const STARTING_CONDENSED_GLOW = CONDENSED_TUNING.starting;
// Rest growth is a run-owned, three-step bonus; it never spends skill points.
export const REST_GLOW_TUNING=Object.freeze({capacityStep:10,capacityLimit:30});
export function getRestGlowBonus(run={}) {
 const value=Number(run.restGlowCapacity);
 return Number.isFinite(value)?Math.min(REST_GLOW_TUNING.capacityLimit,Math.max(0,Math.floor(value/REST_GLOW_TUNING.capacityStep)*REST_GLOW_TUNING.capacityStep)):0;
}
/** Hard ceiling of the Spark Meter, in printed Sparks (designer, 2026-11-16).
 * Internal fuel units are printed ÷ GLOW_DISPLAY_SCALE, so the internal ceiling is 1000/3. */
export const GLOW_CAPACITY_LIMIT=100;
export const GLOW_CAPACITY_LIMIT_UNITS=1000/3;
/** Every capacity source added together, before the 100-Spark ceiling. */
export function getRawGlowCapacity(run={}) {
 return 100+10*['main-light-step','main-thrifty-rise','main-low-lift'].filter(id=>run.skills?.[id]>0).length+getRestGlowBonus(run)+(run.skills?.['main-reservoir']>0?20:0)+(run.skills?.['main-vast-vessel']>0?20:0)+(run.treasureCapacity||0)+getCardCapacityBonus(run)+getCardGrowthBonus(run)+getCardFutureCapacityBonus(run)+getCardBlackHoleBonus(run)+getCardTallyCapacity(run)+capacityBonusSparks(run)/GLOW_DISPLAY_SCALE;
}
/** Total capacity never exceeds 100 printed Sparks, whatever the source. */
export function getGlowCapacity(run={}) {
 return Math.min(GLOW_CAPACITY_LIMIT_UNITS,getRawGlowCapacity(run));
}
/** True when the meter is at its 100-Spark ceiling, so more capacity adds nothing. */
export const isGlowCapacityMaxed=(run={})=>getRawGlowCapacity(run)>=GLOW_CAPACITY_LIMIT_UNITS-1e-9;
export function glowPercent(amount,capacity=100){return (Number(amount)||0)/Math.max(1,Number(capacity)||100)*100;}
// Keep fine simulation precision for incremental skills, but one player-facing
// point is always the same amount of light. Capacity upgrades never redefine it.
export const GLOW_DISPLAY_SCALE=.3;
export const glowPoints=amount=>Math.round((Number(amount)||0)*GLOW_DISPLAY_SCALE);
export function formatGlow(amount){return String(glowPoints(amount));}
export function glowText(text,capacity=100){
 return String(text??'').replace(/([+−-]?\d+(?:\.\d+)?)(%)? (?:of )?(extra |more |less |bonus |fetched |direct |purified |pickup |maximum |max )?(?:Sparks?\b|Energy)/g,(_,n,percent,modifier='')=>{
  if(percent&&['less','more'].includes(modifier.trim()))return _;
  const amount=Number(n.replace('−','-'))*(percent?capacity/100:1);
  return `${n.startsWith('+')?'+':''}${formatGlow(amount)} ${modifier}${Math.abs(Number(formatGlow(amount)))===1?'Spark':'Sparks'}`;
 });
}
