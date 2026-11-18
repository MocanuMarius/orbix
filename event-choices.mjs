import {getGlowCapacity,getLifeCapacity} from './vitality.mjs?v=fast-2';
import {isCardRun} from './skill-cards.mjs?v=fast-2';

// Every event is ONE screen with a choice of two outcomes that happen at once: Stored Sparks, a heart, Sparks, a card (the normal claim
// path), one card's uses refilled, or one card improved. The two events that are not immediate on purpose keep their own shape:
// the wager events (Night's Ledger, The Closed Eye, The Silent Orbit, Pilgrim's Vow: dist/oaths.mjs) and the Marked Passage (it
// changes the map). Nothing here opens a slot-choice step. Values in descriptions are player-facing; effects use simulation units.
export const EVENT_EDITION=4;
const pick=(id,title,description,art,effect)=>({id,title,description,detail:description,art,effect,displayUnits:true});
/** Stored Sparks an event pays, by map. */
export const eventSparks=run=>[20,30,40][Math.max(0,Math.min(2,Math.floor(Number(run?.mapIndex)||0)))];
const sparks=(run,id='event-sparks',title='Pocket the coins',amount=eventSparks(run))=>pick(id,title,'+'+amount+' Stored Sparks. Spend on skills at any time.','packed',{packedReward:amount});
const heart=()=>pick('rekindle','Relight a lost heart','Restore one missing attempt.','heart',{lives:1});
const takeCard=run=>isCardRun(run)?pick('free-card','Take a card','A surprise card goes to your Deck.','card',{eventCard:true}):null;
const improve=target=>target?pick('improve-card','Improve '+target.name,target.kind==='evolution'?`Evolve ${target.name} into ${target.afterName}. Free.`:`${target.name} rises to rank ${target.rank}. Free.`,'card',{improveCard:target.instanceId}):null;
const refill=target=>target?pick('refill-card','Refill '+target.name,`All uses of ${target.name} return. Free.`,'wick',{refillCard:target.instanceId}):null;
export const hasFutureRest=run=>{
 if(run.mapIndex<2||!run.map?.length)return true;
 const byId=new Map(run.map.flat().map(n=>[n.id,n])),seen=new Set();
 const prior=(run.path||[]).map(id=>byId.get(id)).filter(n=>n&&n.row<run.current.row&&n.type!=='support').at(-1);
 const pending=(run.current?.nextIds||[]).map(id=>[id,!!prior?.elite]);
 while(pending.length){const [id,wasElite]=pending.pop(),n=byId.get(id),key=id+':'+wasElite;if(!n||seen.has(key)||wasElite&&n.elite)continue;seen.add(key);
 if(n.kind==='camp')return true;for(const next of n.nextIds||[])pending.push([next,n.type==='support'?wasElite:!!n.elite]);}return false;
};
/** Two distinct outcomes. `list` is the event's own pair; a missing one (no card to improve, a full meter) is filled by Stored Sparks. */
export function completeOffers(list,run){
 const room=getGlowCapacity(run)-run.flame,seen=new Set(),choices=[...list.filter(Boolean),sparks(run),takeCard(run),sparks(run,'event-sparks-small','Take the small purse',Math.round(eventSparks(run)/2)),run.lives<getLifeCapacity(run)?heart():null,room>=20?pick('fill','Drink the spring','Recover Sparks. This refill cannot be stored.','energy',{flame:Math.min(room,40)}):null].filter(Boolean).filter(c=>{
  const key=JSON.stringify(c.effect);
  if(seen.has(c.id)||seen.has(key))return false;seen.add(c.id);seen.add(key);return true;
 });
 return choices.slice(0,Math.max(2,list.filter(Boolean).length));
}
export function eventChoices(run,{refunds=[],targets={}}={}){
 const n=run.current,room=getGlowCapacity(run)-run.flame,injured=run.lives<getLifeCapacity(run);
 const training=hasFutureRest(run);
 const refuel=(raw,id='bottle',title='Drink the spring')=>pick(id,title,'Recover Sparks. This refill cannot be stored.','energy',{flame:Math.min(room,raw)});
 let list;
 switch(n.kind==='shrine'?3:n.eventIndex){
 case 0: list=[room>=20?refuel(room):injured?heart():refill(targets.refill),sparks(run,'ash-coins','Bottle the ash')];break;
 case 1: list=[room>=20?refuel(40,'bargain-safe','Keep the warm coal'):sparks(run),takeCard(run)];break;
 case 3: list=[refill(targets.refill),sparks(run,'shrine-offering','Leave an offering at the shrine')];break;
 case 5: list=[sparks(run,'archive-packed','Copy the star ledger',16),injured?heart():improve(targets.improve)];break;
 case 6: list=[sparks(run,'dice-safe','Pocket the sure thing',10),pick('dice-roll','Cast the prism','Roll once. Faces 1–2: one card improved. 3–4: a free card. 5–6: 22 Stored Sparks.','dice',{dice:true})];break;
 case 7: list=[room>=30?refuel(room,'lantern-fuel','Drink the pale lantern'):sparks(run),improve(targets.improve)];break;
 case 8: list=[takeCard(run),sparks(run)];break;
 case 9: list=[injured?heart():room>=20?refuel(room):sparks(run),refill(targets.refill)];break;
 case 10: {
  const best=refunds.filter(x=>x.refund>0).sort((a,b)=>b.refund-a.refund)[0];
  list=[best&&training?pick('workshop-'+best.root,'Unweave '+best.name,'Remove this branch’s paid ranks. Refund '+best.refund+' Stored Sparks; keep your starting gift.','skills',{respec:best.root}):sparks(run,'workshop-scrap','Sell the scrap'),improve(targets.improve)];break;
 }
 case 11: list=[improve(targets.improve),sparks(run,'shrine-packed','Salvage the tuning fork',12)];break;
 default:return null;
 }
 return completeOffers(list,run);
}
/** What a face of the Prism Dice gives (a card improved, a free card or Stored Sparks); an unusable improve falls back to Stored Sparks. */
export function rollPrism(run,face,targets={}){
 if(face<=2)return targets.improve?{improve:true,message:'One card improved.'}:{packed:22,message:'+22 Stored Sparks.'};
 if(face<=4)return {card:true,message:'A free card goes to your Deck.'};
 return {packed:22,message:'+22 Stored Sparks.'};
}
