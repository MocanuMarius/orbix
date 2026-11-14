export const PREPARATION_CLEARS=3;
const active=record=>Object.entries(record||{}).filter(([,n])=>Number(n)>0).map(([id])=>id);
export const activePassageBoons=run=>[...new Set([...active(run.passageBoons),...(run.nextFlightBoon?[run.nextFlightBoon]:[])])];
export const activeEventFavors=run=>[...new Set([...active(run.favorClears),...(run.eventFavors||[])])];
export function grantPassageBoon(run,id){(run.passageBoons??={})[id]=PREPARATION_CLEARS;run.nextFlightBoon=id;}
export function grantEventFavor(run,id){
 run.eventFavors=[...new Set([...(run.eventFavors||[]),id])];
 if(id!=='burden')(run.favorClears??={})[id]=PREPARATION_CLEARS;
}
// A failed or interrupted attempt never spends a successful-flight reward.
// Re-earning the same effect refreshes its window; magnitudes never stack.
export function spendPreparationClear(run,attempt){
 for(const[key,ids]of [['passageBoons',attempt?.flightBoons||[]],['favorClears',attempt?.eventFavors||[]]]){
  for(const id of ids)if(run[key]?.[id]>0){if(--run[key][id]===0)delete run[key][id];}
 }
}
