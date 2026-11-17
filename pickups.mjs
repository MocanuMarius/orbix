import {WISP_ART} from './companion-art.mjs?v=roundup-1';
import {FLAME_TUNING,LIGHT_PACKET_TUNING,glowPoints} from './vitality.mjs?v=roundup-1';
import {SPARK_TIERS,sparkBodyRadius,sparkMass} from './spark-size.mjs?v=roundup-1';

// A Flare is two things for one shared duration: a Pulse every 2 s (FLASH_PULSE_INTERVAL) and a temporary,
// very high Luminance. The bonus is real Luminance percent (adds to card and Momentum Luminance in
// flight.mjs getLightState). 82.8% of the 145 px base radius = the old +120 px, so a plain Flare reaches as before.
export const FLASH_LUMINANCE_BONUS = 82.8;
const FLASH_POWERUP = {luminanceBonus:FLASH_LUMINANCE_BONUS, sightDuration:8};
export const FLASH_BASE_DURATION = FLASH_POWERUP.sightDuration;
const type=(id,name,color,radius,contactRadius,description,extra={})=>Object.freeze({id,name,color,radius,contactRadius:contactRadius*.8,description,fuel:0,luminanceBonus:0,sightDuration:0,dim:0,dimDuration:0,manualOnly:false,...extra});
export const PICKUP_TYPES=Object.freeze({
  light:type('light','Spark','#f6edda',3,26,'Fine warm-white arcs. Restores 6 Sparks before bonuses.',{fuel:FLAME_TUNING.emberFuel,plasma:1}),
  cache:type('cache','Spark Cache','#f4f7ff',6,30,'Dense white plasma. Restores 18 Sparks before bonuses.',{fuel:FLAME_TUNING.heartFuel,plasma:3}),
  cluster:type('cluster','Spark Cluster','#e6f4ea',4,26,'Branching white currents with a green tint. Restores 12 Sparks before bonuses.',{fuel:40,plasma:2}),
  sight:type('sight','Flare Powerup','#ffffff',14,26,flashPowerupDescription(),FLASH_POWERUP),
  dusk:type('dusk','Dusk Spark','#d798ad',5,25,'A split rose crescent. Drains up to 3 Sparks and dims Luminance by 20% for four seconds. Dusk Wick pays after the drain.',{drain:10,dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:4,manualOnly:true}),
  dark:type('dark','Dark Spark','#e17a70',7,22,'A black seed with a red warning ring. Dims Luminance for eight seconds; a Spark pickup clears one effect.',{dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:LIGHT_PACKET_TUNING.darkDuration,manualOnly:true}),
});
export function flashPowerupDuration(modifiers = {}) {
  return FLASH_POWERUP.sightDuration * (modifiers.longFlash ? 3 : 1);
}
export function flashPowerupDescription(modifiers = {}) {
  return `The white triangle trails behind your wisp. For ${flashPowerupDuration(modifiers)} seconds it sends a Pulse every 2 seconds and raises your Luminance very high.`;
}
export function pickupKind(packet={}){
  if(typeof packet==='string')return Object.hasOwn(PICKUP_TYPES,packet)?packet:'light';
  if(packet.harmful||packet.kind==='dark')return 'dark';
  if(packet.kind==='light'&&packet.value===3)return 'cache';
  return Object.hasOwn(PICKUP_TYPES,packet.kind)?packet.kind:packet.value===3?'cache':'light';
}
const masses=new Map();
export function getPickupSpec(packet){
  const base=PICKUP_TYPES[pickupKind(packet)];
  if(!base.plasma||!packet?.sparkMass)return base;
  const mass=sparkMass(packet);
  if(base.fuel===mass*FLAME_TUNING.emberFuel||!mass)return base;
  const key=base.id+mass;
  if(!masses.has(key)){
    const fuel=mass*FLAME_TUNING.emberFuel;
    const tier=SPARK_TIERS.find(t=>t.mass===mass);
    masses.set(key,Object.freeze({...base,fuel,name:mass>3?`${tier.name} Spark`:base.name,
      description:`Restores ${glowPoints(fuel)} Sparks before bonuses. Surplus goes to packing.`}));
  }
  return masses.get(key);
}
export function pickupContactRadius(packet,height){
  const spec=getPickupSpec(packet);
  if(!packet||typeof packet!=='object'||packet.generated||!sparkMass(packet))return spec.contactRadius;
  const radius=sparkBodyRadius(packet,height)+WISP_ART.worldRadius; // visible shell plus the wisp body
  return packet.accessible||packet.riskChain||packet.intro||packet.forgivingContact?Math.max(radius,spec.contactRadius):radius;
}
export const SPARK_ART_SCALE = .8;
export const PLASMA_SHELL_RADIUS = 16;
// Contact padding stays generous even when the visible Spark shell is small.
export function pickupShellRadius(packet) {
  const spec = getPickupSpec(packet);
  if(packet&&typeof packet==='object')return sparkBodyRadius(packet);
  if (spec.id === 'sight') return spec.contactRadius;
  return (spec.plasma ? PLASMA_SHELL_RADIUS : spec.contactRadius) * SPARK_ART_SCALE;
}
export const canCompanionCollect=packet=>!getPickupSpec(packet).manualOnly&&!packet.harmful&&!packet.manualOnly;
export const isFuelPickup=packet=>getPickupSpec(packet).fuel>0;

export const pickupDisposition=packet=>getPickupSpec(packet).dim>0?'warning':'boon';
