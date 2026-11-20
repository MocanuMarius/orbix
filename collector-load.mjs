import {canCompanionCollect,pickupKind} from './pickups.mjs?v=slots-1';
import {sparkMass} from './spark-size.mjs?v=slots-1';

// Body collection retains the original plasma density and fuel. A carrier
// can learn Cache handling; deliveries condense to one 12-Spark Cluster.
export function collectorCanFetch(packet,mod={}){
  if(!canCompanionCollect(packet))return false;
  if(pickupKind(packet)==='sight')return mod.collectorFlashFetch===true;
  return sparkMass(packet)<=Math.max(2,Number(mod.collectorFetchMass)||2);
}
export function collectorCompactSeconds(packet){return sparkMass(packet)>2?.32:0;}
export function compressCollectorCargo(packet){
  if(sparkMass(packet)<=2)return false;
  packet.collectorOriginalMass=sparkMass(packet);
  packet.collectorCompressed=true;packet.kind='cluster';packet.sparkMass=2;packet.value=1;
  return true;
}
