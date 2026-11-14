import {FLAME_TUNING,LIGHT_PACKET_TUNING,glowPoints} from './vitality.mjs?v=spark-floor-1';
import {SPARK_TIERS,sparkBodyRadius,sparkMass} from './spark-size.mjs?v=spark-floor-1';

const FLASH_POWERUP = {sightBonus:120, sightDuration:8};
const type=(id,name,color,radius,contactRadius,description,extra={})=>Object.freeze({id,name,color,radius,contactRadius:contactRadius*.8,description,fuel:0,sightBonus:0,sightDuration:0,dim:0,dimDuration:0,manualOnly:false,...extra});
export const PICKUP_TYPES=Object.freeze({
  light:type('light','Spark','#f6edda',3,26,'Fine warm-white arcs. Restores 6 Sparks before bonuses.',{fuel:FLAME_TUNING.emberFuel,plasma:1}),
  cache:type('cache','Spark Cache','#f4f7ff',6,30,'Dense white plasma. Restores 18 Sparks before bonuses.',{fuel:FLAME_TUNING.heartFuel,plasma:3}),
  cluster:type('cluster','Spark Cluster','#e6f4ea',4,26,'Branching white currents with a green tint. Restores 12 Sparks before bonuses.',{fuel:40,plasma:2}),
  sight:type('sight','Flash Powerup','#ffffff',14,26,flashPowerupDescription(),FLASH_POWERUP),
  dusk:type('dusk','Dusk Spark','#d798ad',5,25,'A dark-centered rose light. Gain 12 Sparks, but lose some Luminance for four seconds.',{fuel:40,dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:4,manualOnly:true}),
  dark:type('dark','Dark Spark','#e17a70',7,22,'A black seed with a red warning ring. Dims Luminance for eight seconds; a Spark pickup clears one effect.',{dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:LIGHT_PACKET_TUNING.darkDuration,manualOnly:true}),
});
export function flashPowerupDuration(modifiers = {}) {
  return FLASH_POWERUP.sightDuration * (modifiers.longFlash ? 3 : 1);
}
export function flashPowerupDescription(modifiers = {}) {
  return `The white triangle trails behind your wisp. It reveals the passage, then pulses with up to ${FLASH_POWERUP.sightBonus} extra Luminance for ${flashPowerupDuration(modifiers)} seconds.`;
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
  const radius=sparkBodyRadius(packet,height)+9.35; // visible shell plus the wisp body
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
