import {OATHS,oathLine,oathOfPact,oathReward,pendingOathId,getOath} from './oaths.mjs?v=slots-1';
// Optional one-flight wagers (dist/oaths.mjs): accepted at an event, applied to the next flight only. Won on a clear: a fixed payout of
// Stored Sparks, paid by the model; it never recursively packs. Not cleared: nothing. Gone after that flight either way.
const pact=(oathId,extra)=>{const o=OATHS[oathId];return Object.freeze({id:o.pact,oath:oathId,name:o.name,description:o.rule+' One flight only.',...extra});};
export const FLIGHT_PACTS=Object.freeze({
 'night-ledger':pact('night-ledger',{sight:.55}),
 'blind-pilgrim':pact('closed-eye',{sight:.38}),
 'silent-orbit':pact('silent-orbit',{reach:.55}),
});
/** The Flight Pact id (the engine rule) a pending oath drives, or null (Pilgrim's Vow and Sealed Purse are settled by the model). */
export const pactOfOath=id=>getOath(id)?.pact||null;
export function pactOffers(run){
 const oathId={1:'night-ledger',7:'closed-eye',8:'silent-orbit'}[run.current?.eventIndex];
 const wager=OATHS[oathId];
 if(!wager||run.pendingOath)return null;
 if(run.mapIndex===2){
  const nodes=new Map(run.map.flat().map(n=>[n.id,n])),seen=new Set(),pending=[...(run.current.nextIds||[])];let useful=false;
  while(pending.length){const n=nodes.get(pending.pop());if(!n||seen.has(n.id))continue;seen.add(n.id);if(n.type==='support')pending.push(...n.nextIds);else if(!n.boss)useful=true;}
  if(!useful)return null;
 }
 const offer=(id,title,description,art,effect)=>({id,title,description,detail:description,displayUnits:true,art,effect});
 return [offer('pact:'+oathId,'Take the wager: '+wager.name,oathLine(run,oathId),wager.pact==='silent-orbit'?'companion':'lens',{oath:oathId}),
  offer('pact:leave','Leave it','No wager. Keep your sight, Collector reach and normal packing.','back',{})];
}
export function activeFlightPact(run){return FLIGHT_PACTS[run.attemptActive?run.attemptEntry?.flightPact:pactOfOath(pendingOathId(run))]||null;}
/** Stored Sparks a won Flight Pact wager pays (0 unless the flight was cleared). */
export function pactBonus(id,result,run){
 const p=FLIGHT_PACTS[id];
 return p&&result.success?oathReward(run,p.oath):0;
}
export {oathOfPact};
