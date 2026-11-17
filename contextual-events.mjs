import {completeOffers,EVENT_FAVORS,hasFutureRest} from './event-choices.mjs?v=rest-2';
import {getGlowCapacity} from './vitality.mjs?v=rest-2';
import {treasureFlightNotice} from './treasure.mjs?v=rest-2';
import {temporaryLine,temporaryEntries,hasTemporary} from './temporary-inscriptions.mjs?v=rest-2';
// Event stakes are fixed when offered. They are not rolled during flight.
const choice=(id,title,description,effect)=>({id,title,description,detail:description,effect});
export const PILGRIM_VOW=Object.freeze({target:4,reward:8});
export const ROUTE_PREPARATION=Object.freeze({lightBonus:35,windMultiplier:.7});

export function contextualEventChoices(run,nextFlights){
  const node=run.current;
  const late=!hasFutureRest(run),room=getGlowCapacity(run)-run.flame;
  const prepare=(id,key,art)=>({...choice(id,EVENT_FAVORS[key].title,EVENT_FAVORS[key].text,{eventFavor:key}),displayUnits:true,art});
  const wick=()=>prepare('traveller-wick','wick','wick'),feather=()=>prepare('traveller-feather','feather','feather');
  if(node?.eventIndex===2){
    const bodyNote=run.companions?.includes('collector')?' Collector deliveries do not count.':'';
    return completeOffers([
      ...(late?[feather()]:nextFlights.length&&!hasTemporary(run,'pilgrim-vow')?[choice('pilgrim-vow','Keep the Pilgrim’s Vow',
        `${temporaryLine('pilgrim-vow')}${bodyNote} Dream pickups do not count. Falling short costs nothing; the oath stays.`,
        {pilgrimVow:{...PILGRIM_VOW,sourceNodeId:node.id,mapIndex:run.mapIndex}})]:[]),
      room>=20?{...choice('pilgrim-offering','Drink the offering','Restore 6 Sparks.',{flame:20}),displayUnits:true,art:'energy'}:wick()
    ],run);
  }
  if(node?.eventIndex===4){
    return completeOffers([
      ...nextFlights.map(next=>{
        const wind=next.terrain==='storm'||next.encounterFamily==='draft-staircase';
        const effect=wind?'Drafts are 30% gentler':'Luminance extends by 35 pixels';
        return choice(`survey-${next.id}`,`Mark ${next.name}`,
          `${effect} for your first attempt there. ${nextFlights.length>1?'Commit to this exit and leave the other path. If you fall, the fork reopens.':'This is the only exit.'}`,
          {routePreparation:{nodeId:next.id,sourceNodeId:node.id,name:next.name,kind:wind?'wind':'sight'}});
      }),
      room>=20?{...choice('survey-offering',nextFlights.length>1?'Keep the fork open':'Take travel fuel','Restore up to 12 Sparks. No route preparation.',{flame:Math.min(room,40)}),displayUnits:true,art:'energy'}:wick()
    ],run);
  }
  return null;
}

/** Count only deliberate, real flight pickups, not deliveries or rehearsals. */
export function isVowBodyPickup(engine,packet,spec){
  return spec.fuel>0&&!spec.dim&&!packet.generated&&!packet.deliveredByWisp
    &&(!engine.dream||engine.dream.phase==='done');
}

export function contextualFlightNotice(run,node=run.current,{temporaries=true}={}){
  if(!node||node.type==='support')return '';
  const lines=temporaries?temporaryEntries(run).map(e=>temporaryLine(e.id,e.flightsLeft)):[];
  const treasure=treasureFlightNotice(run.treasurePact,run);
  if(treasure)lines.push(treasure);
  if(run.routePreparation?.nodeId===node.id)lines.push(run.routePreparation.kind==='wind'
    ?'MARKED PASSAGE · Drafts −30% · First attempt'
    :'MARKED PASSAGE · Luminance +35 · First attempt');
  return lines.join(' ');
}

export function resolvePilgrimVow(vow,result){
  if(!vow||result.success!==true)return null;
  const collected=Math.max(0,Math.floor(Number(result.bodyFuelCollected)||0));
  const completed=collected>=PILGRIM_VOW.target;
  return {completed,collected,target:PILGRIM_VOW.target,reward:completed?PILGRIM_VOW.reward:0,
    message:completed?`Vow kept · +${PILGRIM_VOW.reward} Stored Sparks`
      :`Vow still open · ${Math.min(collected,PILGRIM_VOW.target)}/${PILGRIM_VOW.target} body pickups. It stays until you keep it.`};
}
