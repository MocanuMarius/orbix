import {temporaryLine,activePactId} from './temporary-inscriptions.mjs?v=temp-3';
// Optional, visible oaths: an Oath Inscription on a Chain slot (dist/inscriptions.mjs) that stays until a cleared flight fulfils it.
// Their bonus is paid by the model on a clear; it never recursively packs.
export const FLIGHT_PACTS=Object.freeze({
 'night-ledger':Object.freeze({id:'night-ledger',name:'Night’s Ledger',sight:.55,multiplier:2,bonusLimit:20,description:temporaryLine('night-ledger')}),
 'blind-pilgrim':Object.freeze({id:'blind-pilgrim',name:'The Closed Eye',sight:.38,multiplier:3,bonusLimit:Infinity,description:temporaryLine('closed-eye')}),
 'silent-orbit':Object.freeze({id:'silent-orbit',name:'The Silent Orbit',reach:.55,multiplier:2,bonusLimit:20,description:temporaryLine('silent-orbit')}),
});
export function pactOffers(run){
 const id={1:'night-ledger',7:'blind-pilgrim',8:'silent-orbit'}[run.current?.eventIndex];
 const pact=FLIGHT_PACTS[id];
 if(!pact||activePactId(run))return null;
 if(run.mapIndex===2){
  const nodes=new Map(run.map.flat().map(n=>[n.id,n])),seen=new Set(),pending=[...(run.current.nextIds||[])];let useful=false;
  while(pending.length){const n=nodes.get(pending.pop());if(!n||seen.has(n.id))continue;seen.add(n.id);if(n.type==='support')pending.push(...n.nextIds);else if(!n.boss)useful=true;}
  if(!useful)return null;
 }
 const offer=(id,title,description,art,effect)=>({id,title,description,detail:description,displayUnits:true,art,effect});
 return [offer('pact:'+id,'Accept '+pact.name,pact.description,pact.reach?'companion':'lens',{flightPact:id}),
  offer('pact:leave','Leave the pact','Keep your sight, Collector reach and normal packing. No penalty.','back',{})];
}
export function activeFlightPact(run){return FLIGHT_PACTS[run.attemptActive?run.attemptEntry?.flightPact:activePactId(run)]||null;}
export function pactBonus(id,result,packed){
 const pact=FLIGHT_PACTS[id];
 return pact&&result.success?Math.min(pact.bonusLimit,Math.max(0,Math.floor(packed))*(pact.multiplier-1)):0;
}
