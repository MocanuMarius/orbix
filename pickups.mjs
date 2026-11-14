import {FLAME_TUNING,LIGHT_PACKET_TUNING} from './vitality.mjs?v=spark-arcs-2';

const type=(id,name,color,radius,contactRadius,description,extra={})=>Object.freeze({id,name,color,radius,contactRadius:contactRadius*.8,description,fuel:0,recharge:0,sightBonus:0,sightDuration:0,dim:0,dimDuration:0,manualOnly:false,...extra});
export const PICKUP_TYPES=Object.freeze({
  light:type('light','Spark','#f5e6bc',3,26,'Bright, branching arcs. Restores 6 Sparks before bonuses.',{fuel:FLAME_TUNING.emberFuel,plasma:1}),
  cache:type('cache','Spark Cache','#f6d58d',6,30,'Dense golden plasma. Restores 18 Sparks before bonuses.',{fuel:FLAME_TUNING.heartFuel,plasma:3}),
  cluster:type('cluster','Spark Cluster','#d5ead9',4,26,'Lively, branching currents. Restores 12 Sparks before bonuses.',{fuel:40,plasma:2}),
  charge:type('charge','Charge Spark','#80d4dc',4,25,'A cyan flicker. Shortens companion recovery.',{recharge:3}),
  sight:type('sight','Flash Spark','#c5a5ed',5,26,'A violet light with a spreading halo. Extends Luminance by 50 for six seconds.',{sightBonus:50,sightDuration:6}),
  dusk:type('dusk','Dusk Spark','#d798ad',5,25,'A dark-centered rose light. Gain 12 Sparks, but lose some Luminance for four seconds.',{fuel:40,dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:4,manualOnly:true}),
  dark:type('dark','Dark Spark','#e17a70',7,22,'A black seed with a red warning ring. Dims Luminance for eight seconds; a Spark pickup clears one effect.',{dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:LIGHT_PACKET_TUNING.darkDuration,manualOnly:true}),
});
export function pickupKind(packet={}){
  if(typeof packet==='string')return Object.hasOwn(PICKUP_TYPES,packet)?packet:'light';
  if(packet.harmful||packet.kind==='dark')return 'dark';
  if(packet.kind==='light'&&packet.value===3)return 'cache';
  return Object.hasOwn(PICKUP_TYPES,packet.kind)?packet.kind:packet.value===3?'cache':'light';
}
export const getPickupSpec=packet=>PICKUP_TYPES[pickupKind(packet)];
export const pickupContactRadius=packet=>getPickupSpec(packet).contactRadius;
// The shell is artwork; the original, more forgiving input target is retained.
export const pickupShellRadius=packet=>getPickupSpec(packet).plasma?16:pickupContactRadius(packet);
export const canCompanionCollect=packet=>!getPickupSpec(packet).manualOnly&&!packet.harmful&&!packet.manualOnly;
export const isFuelPickup=packet=>getPickupSpec(packet).fuel>0;

export const pickupDisposition=packet=>getPickupSpec(packet).dim>0?'warning':'boon';
