import {FLAME_TUNING,LIGHT_PACKET_TUNING} from './vitality.mjs';

const type=(id,name,color,radius,contactRadius,description,extra={})=>Object.freeze({id,name,color,radius,contactRadius,description,fuel:0,currency:0,recharge:0,sightBonus:0,sightDuration:0,dim:0,dimDuration:0,manualOnly:false,...extra});
export const PICKUP_TYPES=Object.freeze({
  light:type('light','Light Mote','#f5e6bc',3,20,'Small fuel light. Restores 24 Glow.',{fuel:FLAME_TUNING.emberFuel}),
  cache:type('cache','Glow Cache','#f6d58d',6,20,'Large, slow-pulsing light. Restores 40 Glow.',{fuel:FLAME_TUNING.heartFuel}),
  embers:type('embers','Ember Cluster','#e4ad62',4,18,'Three golden seeds. Adds 12 embers to this flight’s reward.',{currency:12}),
  charge:type('charge','Charge Spark','#80d4dc',4,17,'A cyan flicker. Shortens companion recovery.',{recharge:3}),
  sight:type('sight','Sight Bloom','#c5a5ed',5,19,'A violet light with a spreading halo. Extends sight by 50 for six seconds.',{sightBonus:50,sightDuration:6}),
  dusk:type('dusk','Dusk Pearl','#d798ad',5,19,'A dark-centered rose light. Gain 32 Glow, but lose some sight for four seconds.',{fuel:32,dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:4,manualOnly:true}),
  dark:type('dark','Dark Seed','#b296bc',7,17,'A black seed with a pale violet swirl. Dims sight for eight seconds; a fuel pickup clears one effect.',{dim:LIGHT_PACKET_TUNING.darkPenalty,dimDuration:LIGHT_PACKET_TUNING.darkDuration,manualOnly:true}),
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
