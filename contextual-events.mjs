// Event stakes are fixed when offered. They are not rolled during flight.
const choice=(id,title,description,effect)=>({id,title,description,detail:description,effect});
export const PILGRIM_VOW=Object.freeze({target:4,reward:8});
export const ROUTE_PREPARATION=Object.freeze({lightBonus:35,windMultiplier:.7});

export function contextualEventChoices(run,nextFlights){
  const node=run.current;
  if(node?.eventIndex===2){
    const bodyNote=run.companions?.includes('collector')?' Collector deliveries do not count.':'';
    return [
      ...(nextFlights.length&&!run.pilgrimVow?[choice('pilgrim-vow','Keep the Pilgrim’s Vow',
        `Clear your next attempt with ${PILGRIM_VOW.target} body Spark pickups to earn ${PILGRIM_VOW.reward} Packed Light.${bodyNote} Dream pickups do not count. Fail or fall short: no extra penalty.`,
        {pilgrimVow:{...PILGRIM_VOW,sourceNodeId:node.id,mapIndex:run.mapIndex}})]:[]),
      choice('pilgrim-offering','Take the light now','Collect 20 Sparks now; excess condenses. No promise to keep.',{pickupGlow:20})
    ];
  }
  if(node?.eventIndex===4){
    return [
      ...nextFlights.map(next=>{
        const wind=next.terrain==='storm'||next.encounterFamily==='draft-staircase';
        const effect=wind?'Drafts are 30% gentler':'Light reaches 35 farther';
        return choice(`survey-${next.id}`,`Mark ${next.name}`,
          `${effect} for your first attempt there. Commit to this exit${nextFlights.length>1?' and leave the other path':''}. If you fall, the fork reopens.`,
          {routePreparation:{nodeId:next.id,sourceNodeId:node.id,name:next.name,kind:wind?'wind':'sight'}});
      }),
      choice('survey-offering','Keep the fork open','Collect 30 Sparks; excess condenses. Keep every reachable exit without a preparation.',{pickupGlow:30})
    ];
  }
  return null;
}

/** Count only deliberate, real flight pickups, not deliveries or rehearsals. */
export function isVowBodyPickup(engine,packet,spec){
  return spec.fuel>0&&!spec.dim&&!packet.generated&&!packet.deliveredByWisp
    &&(!engine.dream||engine.dream.phase==='done');
}

export function contextualFlightNotice(run,node=run.current){
  if(!node||node.type==='support')return '';
  const lines=[];
  if(run.pilgrimVow)lines.push(`PILGRIM VOW · Clear with ${run.pilgrimVow.target} body Spark pickups → ${run.pilgrimVow.reward} Packed Light · First attempt`);
  if(run.routePreparation?.nodeId===node.id)lines.push(run.routePreparation.kind==='wind'
    ?'MARKED PASSAGE · Drafts −30% · First attempt'
    :'MARKED PASSAGE · Sight +35 · First attempt');
  return lines.join(' ');
}

export function resolvePilgrimVow(vow,result){
  if(!vow)return null;
  const collected=Math.max(0,Math.floor(Number(result.bodyFuelCollected)||0));
  const completed=result.success===true&&collected>=PILGRIM_VOW.target;
  return {completed,collected,target:PILGRIM_VOW.target,reward:completed?PILGRIM_VOW.reward:0,
    message:completed?`Vow kept · +${PILGRIM_VOW.reward} Packed Light`
      :result.success?`Vow ended · ${Math.min(collected,PILGRIM_VOW.target)}/${PILGRIM_VOW.target} body pickups. No penalty.`:'Vow ended with this attempt. No extra penalty.'};
}
