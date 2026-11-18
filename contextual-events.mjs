import {completeOffers,eventSparks} from './event-choices.mjs?v=calm-2';
import {getGlowCapacity} from './vitality.mjs?v=calm-2';
import {treasureFlightNotice} from './treasure.mjs?v=calm-2';
import {oathLine,oathReward,pendingOathId} from './oaths.mjs?v=calm-2';
// Event stakes are fixed when offered. They are not rolled during flight.
const choice=(id,title,description,effect)=>({id,title,description,detail:description,effect});
export const PILGRIM_VOW=Object.freeze({target:4});
export const ROUTE_PREPARATION=Object.freeze({lightBonus:35,windMultiplier:.7});

export function contextualEventChoices(run,nextFlights,targets={}){
  const node=run.current;
  const room=getGlowCapacity(run)-run.flame;
  const sparks=()=>({...choice('traveller-coins','Take the traveller’s coins','+'+eventSparks(run)+' Stored Sparks. Spend on skills at any time.',{packedReward:eventSparks(run)}),displayUnits:true,art:'packed'});
  if(node?.eventIndex===2){
    const bodyNote=run.companions?.includes('collector')?' Collector deliveries do not count.':'';
    return completeOffers([
      ...(nextFlights.length&&!run.pendingOath?[{...choice('pilgrim-vow','Keep the Pilgrim’s Vow',
        `${oathLine(run,'pilgrim-vow')}${bodyNote} Dream pickups do not count.`,
        {oath:'pilgrim-vow'}),displayUnits:true}]:[]),
      room>=20?{...choice('pilgrim-offering','Drink the offering','Restore 6 Sparks.',{flame:20}),displayUnits:true,art:'energy'}:sparks()
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
      room>=20?{...choice('survey-offering',nextFlights.length>1?'Keep the fork open':'Take travel fuel','Restore up to 12 Sparks. No route preparation.',{flame:Math.min(room,40)}),displayUnits:true,art:'energy'}:sparks()
    ],run);
  }
  return null;
}

/** Count only deliberate, real flight pickups, not deliveries or rehearsals. */
export function isVowBodyPickup(engine,packet,spec){
  return spec.fuel>0&&!spec.dim&&!packet.generated&&!packet.deliveredByWisp
    &&(!engine.dream||engine.dream.phase==='done');
}

/** The plain line for a wager waiting on (or flown in) this flight, plus the Marked Passage line. Stop pages and the briefing show it. */
export function contextualFlightNotice(run,node=run.current,{oath=true}={}){
  if(!node||node.type==='support')return '';
  const lines=[];
  const wager=oath?pendingOathId(run):null;
  if(wager)lines.push(oathLine(run,wager));
  const treasure=treasureFlightNotice(run.treasurePact,run);
  if(treasure)lines.push(treasure);
  if(run.routePreparation?.nodeId===node.id)lines.push(run.routePreparation.kind==='wind'
    ?'MARKED PASSAGE · Drafts −30% · First attempt'
    :'MARKED PASSAGE · Luminance +35 · First attempt');
  return lines.join(' ');
}

/** Pilgrim's Vow settled on a cleared flight: kept pays Stored Sparks, short of it pays nothing. Gone either way. */
export function resolvePilgrimVow(vow,result,run){
  if(!vow||result.success!==true)return null;
  const collected=Math.max(0,Math.floor(Number(result.bodyFuelCollected)||0));
  const completed=collected>=PILGRIM_VOW.target,reward=completed?oathReward(run,'pilgrim-vow'):0;
  return {completed,collected,target:PILGRIM_VOW.target,reward,
    message:completed?`Wager won · +${reward} Stored Sparks`
      :`Wager not met · ${Math.min(collected,PILGRIM_VOW.target)}/${PILGRIM_VOW.target} body pickups. Nothing is lost.`};
}
