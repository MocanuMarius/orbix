import {ARTIFACTS,SKILLS,SKILL_CARDS} from './model.mjs?v=icons-1';
import {cardFace} from './card-ui.mjs?v=icons-1';
import {cardTermMarkup,cardTermTextMarkup} from './card-terms.mjs?v=icons-1';
import {artifactDescriptionMarkup} from './artifact-copy.mjs?v=icons-1';
import {artifactIcon} from './upgrade-icons.mjs?v=icons-1';
import {EVENT_SCENARIOS,mapStopIconMarkup} from './map-guide.mjs?v=icons-1';
import {FLIGHT_PACTS} from './flight-pacts.mjs?v=icons-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=icons-1';
import {describeTreasure} from './treasure.mjs?v=icons-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paragraph=text=>text?`<p>${cardTermTextMarkup(text)}</p>`:'';
const related=terms=>terms.length?`<nav class="flight-reward-detail-terms" aria-label="Related terms">${terms.map(term=>cardTermMarkup(term)).join('')}</nav>`:'';
const unique=items=>[...new Map(items.filter(Boolean).map(item=>[item.instanceId||item.cardId,item])).values()];
// getOwnedCards settles legacy card rewards; inspection must never do that.
const ownedCards=run=>[...(run?.mountedCards||[]),...(run?.reserveCards||[])].filter(Boolean);

export const FLIGHT_REWARD_SOURCE_DETAILS=Object.freeze({
 'Clear reward':'source-clear','Overflow':'source-overflow','Exit packing':'source-exit',
 Pact:'event-pact',Seal:'event-seal',Vow:'event-vow','Route bonus':'challenge',
 'Chest gifts':'event-chest','Kept Light':'source-kept-light','Storage perk':'source-storage',
 'Tight Packing':'source-tight-packing',Resonance:'source-resonance','Cards on clear':'source-clear-cards',
});

function recordedCards(run,effect){
 const clear=run?.lastFlight?.cardClearReceipt,owned=ownedCards(run);
 const ids=new Set((clear?.steps||[]).filter(step=>step.success&&Number(step[effect])>0).map(step=>step.sourceInstanceId));
 return unique((clear?.sources||[]).filter(source=>ids.has(source.instanceId)).map(source=>{
  const actual=owned.find(card=>card.instanceId===source.instanceId);
  // The source snapshot also survives the final use consuming its actual card.
  return {...actual,...source,rank:source.rank||actual?.rank||1,
   ...(Number.isFinite(clear.charges?.[source.instanceId])?{charges:clear.charges[source.instanceId]}:{})};
 }));
}
function buildCards(run,kind){
 const snapshot=run?.lastFlight?.cardClearReceipt?.sources||[];
 const owned=ownedCards(run);
 const sources=snapshot.length?snapshot:(run?.mountedCards||[]).filter(Boolean);
 return unique(sources.filter(card=>SKILL_CARDS[card.cardId]?.kind===kind).map(source=>({...owned.find(card=>card.instanceId===source.instanceId),...source})));
}
function cardsMarkup(cards){
 return `<div class="flight-reward-detail-cards">${cards.map(card=>`<div class="flight-reward-detail-card">${cardFace(card)}</div>`).join('')}</div>`;
}
function eventMarkup(event,{choice,description,result,alternate,inspectorTitle}={}){
 return `<article class="flight-reward-original-event"><div class="flight-reward-event-identity">${mapStopIconMarkup('encounter')}<div><small>Original encounter</small>${event.name===inspectorTitle?'':`<h3>${esc(event.name)}</h3>`}</div></div>${paragraph(event.summary)}${description?'':paragraph(event.detail)}${choice?`<section class="flight-reward-event-choice"><h4>${esc(choice)}</h4>${paragraph(description)}</section>`:''}${alternate?paragraph(alternate):''}${result?`<p class="flight-reward-detail-result">${esc(result)}</p>`:''}</article>`;
}
function treasureMarkup(kind,choice,description,result,inspectorTitle){
 const event=describeTreasure(kind);
 return eventMarkup({...event,summary:event.description,detail:event.rewardPreview},{choice,description,result,inspectorTitle});
}

/** Pure, read-only inspectors. A key names the real source, never a generic fallback sheet. */
export function flightRewardReceiptDetail(run,key){
 const flight=run?.lastFlight;if(!flight||typeof key!=='string')return null;
 let title='',kind='terms',markup='',terms=[];
 const text=(heading,description,keywords)=>{title=heading;markup=paragraph(description);terms=keywords;};
 const cards=(heading,items,description,keywords)=>{
  title=heading;kind='cards';markup=paragraph(description)+(items.length?cardsMarkup(items):'');terms=keywords;
 };
 if(key.startsWith('artifact:')){
  const id=key.slice(9),artifact=ARTIFACTS[id];
  if(!artifact||!(Number(flight.artifactActivations?.[id])>0||(flight.consumedArtifacts||[]).includes(id)))return null;
  title=artifact.name;kind='artifact';
  const consumed=(flight.consumedArtifacts||[]).includes(id),context=consumed?{...run,artifactCharges:{...run.artifactCharges,[id]:0}}:run;
  markup=`<article class="artifact-inspection flight-reward-artifact-detail"><div class="flight-reward-detail-artifact-icon" aria-hidden="true">${artifactIcon(id)}</div><div class="artifact-inspection-rules">${artifactDescriptionMarkup(artifact,context)}${paragraph(consumed?'Its uses ran out during this flight.':`Activated ${flight.artifactActivations[id]} time${Number(flight.artifactActivations[id])===1?'':'s'} this flight.`)}</div></article>`;
 }else switch(key){
  case 'source-clear':text('Clear reward','The fixed Stored Spark reward for reaching this passage’s exit. This reward is separate from packing spare passage fuel.',['clear','stored']);break;
  case 'source-overflow':text('Overflow packing','Natural passage fuel that exceeded your Spark Meter was converted into Stored Sparks during this flight. It is secured after a successful clear. Sparks generated by cards and Dream pickups cannot be packed.',['packing','overfill','meter','stored']);break;
  case 'source-exit':text('Exit packing','Spare passage fuel left in your Spark Meter at the successful exit was converted into Stored Sparks. Card-generated fuel cannot be packed.',['packing','meter','clear','stored']);break;
  case 'source-kept-light':text('Kept Light',SKILLS['afterglow-anchor'].description,['stored','clear']);break;
  case 'source-storage':{
   const skill=SKILLS[run.skills?.['packing-deep-cache']?'packing-deep-cache':'packing-hand-seal'];
   text(skill.name,skill.description,['overfill','wisp','cache','stored']);break;
  }
  case 'source-tight-packing':cards('Tight Packing',buildCards(run,'packing'),'These cards add extra Stored Sparks to ordinary packing. Fractions carry between successful clears; rewards and card payouts do not earn packing extras.',['packing-efficiency','packing','stored','copy','boost']);break;
  case 'source-resonance':{
   const sources=buildCards(run,'harvest').filter(card=>Number(SKILL_CARDS[card.cardId]?.stored)>0);
   if(sources.length)cards('Resonant Harvest',sources,'The first crossing of an uncollected natural pickup by each Light Pulse earned this card’s Stored Spark reward. The pickup stays in place.',['wave','stored','spark']);
   else text('Resonance',SKILLS['main-resonant-bounty'].description,['wave','stored','spark']);break;
  }
  case 'source-clear-cards':cards('Cards on clear',recordedCards(run,'stored'),'These actual cards paid Stored Sparks when this flight cleared. This payout does not earn packing extras.',['clear','stored','uses','copy']);break;
  case 'effect-growth':cards('Permanent maximum Sparks',recordedCards(run,'futureCapacity'),`This clear added ${Number(flight.cardClearReceipt?.futureCapacity)||0} permanent maximum Sparks. It does not refill the meter.`,['clear','meter','copy']);break;
  case 'effect-speed':cards('Cruising speed unlocked',recordedCards(run,'cruisingSpeed'),`This clear unlocked +${Number(flight.cardClearReceipt?.cruisingSpeed)||0}% cruising speed. Choose an unlocked speed in Settings, including normal speed. The total unlock is capped at +6%.`,['clear','copy']);break;
  case 'event-pact':{
   const pact=FLIGHT_PACTS[flight.flightPact];if(!pact)return null;
   const event=EVENT_SCENARIOS[{ 'night-ledger':1,'blind-pilgrim':7,'silent-orbit':8 }[pact.id]];
   title=pact.name;kind='event';terms=['packing','stored','luminance','collector'];
   markup=eventMarkup(event,{inspectorTitle:title,choice:`Accepted ${pact.name}`,description:pact.description,result:`+${Number(flight.pactBonus)||0} Stored Sparks earned this flight.`,alternate:'Alternative: leave the pact freely and keep normal sight, Collector reach and packing.'});break;
  }
  case 'event-vow':title='Pilgrim’s Vow';kind='event';terms=['wisp','spark','collector','dream','clear'];markup=eventMarkup(EVENT_SCENARIOS[2],{inspectorTitle:title,choice:'Keep the Pilgrim’s Vow',description:'Clear your next attempt with 4 natural body Spark pickups to earn 8 Stored Sparks. Dream pickups and Collector deliveries do not count. Fail or fall short: no extra penalty.',result:flight.vow?.message});break;
  case 'event-seal':title='Lamplighter’s Reliquary';kind='event';terms=['meter','clear','stored'];markup=treasureMarkup('wager','Carry the sealed purse','Clear your next attempt holding 12 Sparks to win 24 Stored Sparks, then earn +3 on later clears holding 12. If you already own Lamplighter’s seal, the purse pays 36 Stored Sparks. A loss pays zero.',flight.treasureWager?.message,title);break;
  case 'event-chest':{
   const sources=flight.chestIncome?.sources||[];title=sources.join(' + ')||'Chest gifts';kind='event';terms=['wisp','spark','clear','meter','stored'];
   markup=sources.map(source=>source==='Toll stamp'?treasureMarkup('tithe','Buy the toll stamp','Pay 6 Sparks when taking the stamp. This run, each clear with at least 3 body Spark pickups earns 3 Stored Sparks.','Toll stamp · +3 Stored Sparks this clear.'):source==='Lamplighter’s seal'?treasureMarkup('wager','Lamplighter’s seal','After winning the sealed purse, earn 3 Stored Sparks on each later clear holding at least 12 Sparks.','Lamplighter’s seal · +3 Stored Sparks this clear.'):paragraph(source)).join('')||paragraph(flight.chestIncome?.message);break;
  }
  case 'challenge':{
   const challenge=ROUTE_BONUSES[flight.routeBonus?.id];title=challenge?.name||'Optional challenge';kind='challenge';terms=['clear','stored'];
   markup=challenge?`<article class="flight-reward-challenge-detail"><h3>Challenge</h3>${paragraph(challenge.condition)}<h3>Reward</h3>${paragraph(challenge.reward)}${paragraph(challenge.hint)}${paragraph(flight.routeBonus?.message)}</article>`:paragraph(flight.routeBonus?.message||'You completed this flight’s optional challenge.');break;
  }
  default:return null;
 }
 return {title,kind,terms,markup:markup+related(terms)};
}
