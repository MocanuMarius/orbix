import {FLAME_TUNING,LIGHT_PACKET_TUNING} from './vitality.mjs?v=living-biomes-1';

const type=(id,name,color,radius,contactRadius,description,extra={})=>Object.freeze({id,name,color,radius,contactRadius:contactRadius*.8,description,fuel:0,currency:0,recharge:0,sightBonus:0,sightDuration:0,dim:0,dimDuration:0,manualOnly:false,...extra});
export const PICKUP_TYPES=Object.freeze({
  light:type('light','Light Mote','#f5e6bc',3,26,'Small fuel light. 24 Glow before route and companion bonuses.',{fuel:FLAME_TUNING.emberFuel}),
  cache:type('cache','Glow Cache','#f6d58d',6,30,'Large, slow-pulsing light. 40 Glow before route and companion bonuses.',{fuel:FLAME_TUNING.heartFuel}),
  embers:type('embers','Ember Cluster','#e4ad62',4,26,'Three golden seeds. Adds 8 embers to this flight’s reward.',{currency:8}),
  charge:type('charge','Charge Spark','#80d4dc',4,25,'A cyan flicker. Shortens companion recovery.',{recharge:3}),
  sight:type('sight','Sight Bloom','#c5a5ed',5,26,'A violet light with a spreading halo. Extends sight by 50 for six seconds.',{sightBonus:50,sightDuration:6}),
  dusk:type('dusk','Dusk Pearl','#d798ad',5,25,'A dark-centered rose light. Gain 32 Glow, but lose some sight for four seconds.',{fuel:32,dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:4,manualOnly:true}),
  dark:type('dark','Dark Seed','#e17a70',7,22,'A black seed with a red warning ring. Dims sight for eight seconds; a fuel pickup clears one effect.',{dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:LIGHT_PACKET_TUNING.darkDuration,manualOnly:true}),
});
export function pickupKind(packet={}){
  if(typeof packet==='string')return Object.hasOwn(PICKUP_TYPES,packet)?packet:'light';
  if(packet.harmful||packet.kind==='dark')return 'dark';
  if(packet.kind==='light'&&packet.value===3)return 'cache';
  return Object.hasOwn(PICKUP_TYPES,packet.kind)?packet.kind:packet.value===3?'cache':'light';
}
export const getPickupSpec=packet=>PICKUP_TYPES[pickupKind(packet)];
export const pickupContactRadius=packet=>getPickupSpec(packet).contactRadius;
export const canCompanionCollect=packet=>!getPickupSpec(packet).manualOnly&&!packet.harmful;
export const isFuelPickup=packet=>getPickupSpec(packet).fuel>0;

export const pickupDisposition=packet=>getPickupSpec(packet).dim>0?'warning':'boon';
