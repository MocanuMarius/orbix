import {getGlowCapacity,getLifeCapacity} from './vitality.mjs?v=roundup-1';
import {getCompanionAbility} from './companion-abilities.mjs?v=roundup-1';

// Values in descriptions are player-facing. Effects use the existing simulation units.
export const EVENT_EDITION=3;
export const EVENT_FAVORS=Object.freeze({
 wick:{title:'Reserve Wick',text:'Below 6 Sparks, restore 9 Sparks once per flight, for 3 cleared flights.'},
 feather:{title:'Hollow Feather',text:'Your first two paid Lifts are free in each of 3 cleared flights.'},
 lens:{title:'Star Chart',text:'See 35% farther for 3 cleared flights.'},
 haste:{title:'Companion Chime',text:'Companion cooldown is 20% shorter for 3 cleared flights.'},
 burden:{title:'Lead Seal',text:'Your first six paid Lifts cost 1 extra Spark next attempt.'}
});
const pick=(id,title,description,art,effect)=>({id,title,description,detail:description,art,effect,displayUnits:true});
const favor=(id,title,key,art)=>pick(id,title,EVENT_FAVORS[key].text,art,{eventFavor:key});
const packed=(id,title,n)=>pick(id,title,'Spend on skills at any time.','packed',{packedReward:n});
const reserve=()=>favor('reserve-wick','Carry a reserve wick','wick','wick');
const feather=()=>favor('hollow-feather','Take the hollow feather','feather','feather');
const lens=()=>favor('star-chart','Read the star chart','lens','lens');
const tempo=(run)=>favor('companion-chime','Tune '+getCompanionAbility(run.companions?.[0]||run.companionRole).name,'haste','companion');
const heart=()=>pick('rekindle','Relight a lost heart','Restore one missing attempt.','heart',{lives:1});
export const hasFutureRest=run=>{
 if(run.mapIndex<2||!run.map?.length)return true;
 const byId=new Map(run.map.flat().map(n=>[n.id,n])),seen=new Set();
 const prior=(run.path||[]).map(id=>byId.get(id)).filter(n=>n&&n.row<run.current.row&&n.type!=='support').at(-1);
 const pending=(run.current?.nextIds||[]).map(id=>[id,!!prior?.elite]);
 while(pending.length){const [id,wasElite]=pending.pop(),n=byId.get(id),key=id+':'+wasElite;if(!n||seen.has(key)||wasElite&&n.elite)continue;seen.add(key);
 if(n.kind==='camp')return true;for(const next of n.nextIds||[])pending.push([next,n.type==='support'?wasElite:!!n.elite]);}return false;
};
export function completeOffers(list,run){
 const already=new Set(run.eventFavors||[]);
 const seen=new Set();
 const choices=[...list,...[reserve(),feather(),lens(),tempo(run)]].filter(c=>{
  if(c.effect.eventFavor&&already.has(c.effect.eventFavor)||seen.has(c.id)||c.effect.eventFavor&&seen.has(c.effect.eventFavor))return false;
  seen.add(c.id);if(c.effect.eventFavor)seen.add(c.effect.eventFavor);return true;
 });
 return choices.slice(0,Math.max(2,list.length));
}
export function eventChoices(run,{refunds=[]}={}){
 const n=run.current,room=getGlowCapacity(run)-run.flame,injured=run.lives<getLifeCapacity(run);
 const training=hasFutureRest(run);
 const cache=(id,title,amount)=>training?packed(id,title,amount):lens();
 const refuel=(raw,id='bottle',title='Drink the spring')=>pick(id,title,'Recover Sparks. This refill cannot be stored.','energy',{flame:Math.min(room,raw)});
 let list;
 switch(n.kind==='shrine'?3:n.eventIndex){
 case 0: list=[room>=20?refuel(room):feather(),reserve()];break;
 case 1: list=[run.flame>=30&&training?pick('bargain','Sell a living coal','Pay 6 Sparks for 18 Stored Sparks. Keep at least 3 Sparks.','trade',{flame:-20,packedReward:18}):lens(),room>=20?refuel(40,'bargain-safe','Keep the warm coal'):reserve()];break;
 case 3: list=[tempo(run),feather()];break;
 case 5: list=[cache('archive-packed','Copy the star ledger',16),injured?heart():reserve()];break;
 case 6: list=[cache('dice-safe','Pocket the sure thing',10),pick('dice-roll','Cast the prism','Equal odds: a Reserve Wick, a Hollow Feather, or 22 Stored Sparks. One roll.','dice',{dice:true})];break;
 case 7: list=[room>=30?refuel(room,'lantern-fuel','Drink the pale lantern'):reserve(),lens()];break;
 case 8: list=[training?pick('bargain-burden','Carry the lead seal','Gain the purse. The first six paid Lifts next attempt each cost 1 extra Spark.','trade',{packedReward:20,eventFavor:'burden'}):tempo(run),feather()];break;
 case 9: list=[injured?heart():room>=20?refuel(room):feather(),tempo(run)];break;
 case 10: {
  const best=refunds.filter(x=>x.refund>0).sort((a,b)=>b.refund-a.refund)[0];
  list=[best&&training?pick('workshop-'+best.root,'Unweave '+best.name,'Remove this branch’s paid ranks. Refund '+best.refund+' Stored Sparks; keep your starting gift.','skills',{respec:best.root}):lens(),feather()];break;
 }
 case 11: list=[tempo(run),cache('shrine-packed','Salvage the tuning fork',12)];break;
 default:return null;
 }
 if(n.eventIndex===6){
  const field=!training,labels=[1,3,5].map(face=>{const result=rollPrism(run,face,field);return result.favor?EVENT_FAVORS[result.favor].title:result.packed?'22 Stored Sparks':result.capacity?'3 Spark capacity':'a full meter refill';});
  list=[field?reserve():list[0],pick('dice-roll','Cast the prism','Roll once. Faces 1–2: '+labels[0]+'. 3–4: '+labels[1]+'. 5–6: '+labels[2]+'.','dice',{dice:true,diceField:field})];
 }
 return completeOffers(list,run);
}
export function rollPrism(run,face,field=false){
 const key=face<=2?'wick':face<=4?'feather':field?'lens':null;
 if(!key)return {packed:22,message:'+22 Stored Sparks.'};
 // If an earlier stop already granted this preparation, make the roll useful.
 const result=[key,...['wick','feather','lens','haste']].find(f=>!run.eventFavors?.includes(f));
 if(!result)return run.flame<getGlowCapacity(run)?{energy:true,message:'The prism fills your Spark Meter.'}:{capacity:10,message:'+3 Spark capacity. Your meter is full.'};
 return {favor:result,message:EVENT_FAVORS[result].title+' · '+EVENT_FAVORS[result].text};
}
