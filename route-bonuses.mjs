import {getLifeCapacity} from './vitality.mjs?v=audit-1';
import {getCardModifiers,isCardRun} from './skill-cards.mjs?v=audit-1';

// Optional objectives pay at once on the result screen (no Inscription, no choice step). `reward` below is the generic line for places with
// no run (glossary); stop pages, the pause note and the receipt use objectiveRewardLine(run, id), which is exactly what is paid.
export const OBJECTIVE_SPARKS = Object.freeze([15, 25, 35]);
export const objectiveSparks = run => OBJECTIVE_SPARKS[Math.max(0, Math.min(OBJECTIVE_SPARKS.length - 1, Math.floor(Number(run?.mapIndex) || 0)))];
const RECOVERY_OBJECTIVES = new Set(['spark-trail', 'reserve-finish']);
/** What a fulfilled objective pays: a heart for the recovery objectives while a heart is missing, Stored Sparks otherwise. */
export function objectivePayout(run, id) {
  if (RECOVERY_OBJECTIVES.has(id) && run && run.lives < getLifeCapacity(run)) return {kind: 'heart'};
  return {kind: 'sparks', amount: objectiveSparks(run)};
}
export const objectivePayoutLine = payout => payout.kind === 'heart' ? '+1 heart' : '+' + payout.amount + ' Stored Sparks';
export const objectiveRewardLine = (run, id) => objectivePayoutLine(objectivePayout(run, id));
function bonus(id, name, condition, reward, target, hint='', boonId=null) {
  return Object.freeze({id, name, condition, reward, target, hint, ...(boonId?{boonId}:{})});
}

export const ROUTE_BONUSES = Object.freeze({
  gilded: bonus('gilded', 'Gilded Passage', 'Collect 4 of 6 marked Sparks.', 'Double this flight’s clear pay and stored surplus, up to +30 Stored Sparks.', 4),
  'three-suns': bonus('three-suns', 'Three Suns', 'Collect all 3 marked Spark Caches.', 'Restore 1 missing heart.', 3),
  precision: bonus('precision', 'Pilgrim Precision', 'Touch 4 of 6 marked Sparks with your main wisp.', '+8 Stored Sparks.', 4),
  'wild-circuit': bonus('wild-circuit', 'Wild Circuit', 'Activate 2 marked terrain objects.', '+15 / 25 / 35 Stored Sparks by map.', 2),
  'flash-relay': bonus('flash-relay', 'Flare Relay', 'Catch the marked Flare, then 2 of 3 marked Sparks before it fades.', '+15 / 25 / 35 Stored Sparks by map.', 2),
  'long-glide': bonus('long-glide', 'Long Glide', 'Lift at the blue chevron. Glide through both marks without Lifting for 2s.', '+15 / 25 / 35 Stored Sparks by map.', 2),
  edgeweaver: bonus('edgeweaver', 'Edgeweaver', 'Trigger Proximity in both marked sections.', '+15 / 25 / 35 Stored Sparks by map.', 2),
  'night-sail': bonus('night-sail', 'Night Sail', 'Collect both bypass Sparks. Lose at most 3 Sparks to the marked Black Hole.', '+15 / 25 / 35 Stored Sparks by map.', 2),
  wayfinder: bonus('wayfinder', 'Wayfinder', 'Fly between all 3 gold gates, then finish.', '+15 / 25 / 35 Stored Sparks by map.', 3, 'Gold brackets mark each gate. Fly between them; collecting a nearby Spark does not count.'),
  'spark-trail': bonus('spark-trail', 'Spark Trail', 'Collect 3 of 5 marked Sparks. Collector deliveries count.', '+15 / 25 / 35 Stored Sparks by map.', 3),
  constellation: bonus('constellation', 'Rising Constellation', 'Collect the gold marks: Spark → Cluster → Cache.', '+15 / 25 / 35 Stored Sparks by map.', 3, 'Only the next kind is marked. If you miss one, look for another matching mark ahead.'),
  'reserve-finish': bonus('reserve-finish', 'Exit reserve', 'Reach the exit with at least 6 Sparks.', '+15 / 25 / 35 Stored Sparks by map.', 6, 'Your current Sparks may rise or fall. The reserve counts only when you reach the exit awake.', 'spark-trail'),
  'lift-windows': bonus('lift-windows', 'Marked Lifts', 'Lift inside 2 of the 3 marked windows.', '+15 / 25 / 35 Stored Sparks by map.', 2, 'Fly inside the gold window and Lift. Each window counts once; you may miss one.', 'long-glide'),
  'draft-rider': bonus('draft-rider', 'Draft contact', 'Ride the marked draft for 0.5s.', '+15 / 25 / 35 Stored Sparks by map.', .5, 'Stay inside the moving air while the marked draft is blowing. Approaching it does not count.', 'wild-circuit')
});

const UTILITY_PAYS = new Set(['wild-circuit', 'flash-relay', 'long-glide', 'edgeweaver', 'night-sail', 'wayfinder', 'constellation', 'spark-trail', 'reserve-finish', 'lift-windows', 'draft-rider']);
/** The reward line for an objective id in the context of a run (the stop page, the pause note): what a clear would pay now. */
export const bonusRewardLine = (run, id) => UTILITY_PAYS.has(id) ? objectiveRewardLine(run, id) : ROUTE_BONUSES[id]?.reward || '';
const utility = ['wild-circuit', 'flash-relay', 'long-glide', 'edgeweaver', 'night-sail', 'wayfinder', 'constellation', 'spark-trail', 'reserve-finish', 'lift-windows', 'draft-rider'];
export const routeBonusFamily = id => ({gilded:'collect',precision:'collect','three-suns':'collect',
  'spark-trail':'collect',constellation:'collect','flash-relay':'collect',wayfinder:'gates',
  'wild-circuit':'terrain','long-glide':'glide',edgeweaver:'edge','night-sail':'void',
  'reserve-finish':'reserve','lift-windows':'timing','draft-rider':'draft'})[id] || id;
const helpfulBiomes = new Set(['marsh', 'fungal', 'crystal', 'thorn', 'cemetery']);
const currency = new Set(['gilded', 'precision']);

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

// Avalanche the suffix as well as the seed: neighbouring FNV suffixes otherwise
// keep putting the same few objectives first across many independent maps.
function bonusOrder(value) {
  let n=hash(value);
  n=Math.imul(n^(n>>>16),0x7feb352d);
  n=Math.imul(n^(n>>>15),0x846ca68b);
  return (n^(n>>>16))>>>0;
}

function alreadyAwarded(run, id) {
  return Object.values(run.routeBonusClaims || {}).some(claim => claim.mapIndex === run.mapIndex && claim.id === id);
}

export function nextBonusFlightNodes(run, node) {
  const nodes = new Map(run.map.flat().map(item => [item.id, item]));
  const found = new Map(), visited = new Set();
  function visit(id) {
    const item = nodes.get(id);
    if (!item || visited.has(id)) return;
    visited.add(id);
    if (item.type === 'support') item.nextIds.forEach(visit);
    else found.set(id, item);
  }
  (node.nextIds || []).forEach(visit);
  return [...found.values()];
}

function canOfferUtility(run, node, id) {
  const experienced = run.testMode || run.mapIndex > 0;
  const flights = run.stats?.flights || 0;
  switch (id) {
    // These hunts reserve several rich pickups. Short courses cannot fund
    // them alongside opening fuel and dark chains without oversupplying fuel.
    case 'constellation': return !Number.isFinite(node.duration)||node.duration>=75;
    case 'wild-circuit': return !node.boss && helpfulBiomes.has(node.biomeId) && (experienced || flights >= 1);
    case 'flash-relay': return experienced || flights >= 2;
    case 'edgeweaver': {
      const cards=isCardRun(run)?getCardModifiers(run):null;
      return !!run.skills?.['proximity-awakening'] || !!cards?.cardProximityUnlocked || cards?.cardProximitySources>0;
    }
    case 'night-sail': return (experienced || flights >= 3) && nextBonusFlightNodes(run, node).length > 0;
    default: return true;
  }
}

// Each map has one currency-bearing site. One seeded map in the three-map run
// offers Gilded, the others offer Precision. Even seeking and winning all three
// pays at most 30 + 8 + 8 extra across a whole expedition.
export function getRouteBonusCandidates(run, node) {
  if (!run || !node || run.isTutorial || node.type === 'support' || node.boss && run.mapIndex === 2 || run.routeBonusClaims?.[node.id]) return [];
  const flights = run.map.flat().filter(site => site.type === 'flight');
  const purse = flights[hash(run.seed + ':bonus-purse') % flights.length];
  const currencyId = hash(run.campaignSeed + ':gilded-map') % 3 === run.mapIndex ? 'gilded' : 'precision';
  const ids = [];
  if (node.id === purse?.id && !['pilgrim-vow', 'sealed-purse'].includes(run.pendingOath?.id) && !alreadyAwarded(run, currencyId)) ids.push(currencyId);
  const heartSites = flights.filter(site => site.id !== purse?.id&&(!Number.isFinite(site.duration)||site.duration>=75));
  const heart = heartSites[hash(run.seed + ':bonus-heart') % heartSites.length];
  if (node.id === heart?.id && run.lives < getLifeCapacity(run) && !alreadyAwarded(run, 'three-suns')) ids.push('three-suns');
  const prefix = run.seed + ':bonus-row:' + node.row + ':';
  const order = [...utility].sort((a,b) => bonusOrder(prefix + a) - bonusOrder(prefix + b));
  const offset = (node.routeLane ?? node.lane ?? 0) % order.length;
  const prior=(run.path||[]).map(id=>run.map.flat().find(site=>site.id===id))
    .filter(site=>site&&site.row<node.row&&site.bonusId).slice(-3).map(site=>site.bonusId);
  const preference=id=>{
    return prior.reduce((cost,p,index)=>cost+(routeBonusFamily(p)===routeBonusFamily(id)?(index===prior.length-1?4:2):0)+(p===id?2:0),0);
  };
  return ids.concat([...order.slice(offset), ...order.slice(0,offset)]
    .filter(id => canOfferUtility(run, node, id)).sort((a,b)=>preference(a)-preference(b)));
}

export function getRouteBonus(run, node) {
  const candidates = getRouteBonusCandidates(run, node);
  if (Object.hasOwn(node || {}, 'bonusId')) {
    if (node.bonusId === null) return null;
    if (candidates.includes(node.bonusId)) return rewardForNode(run,node,ROUTE_BONUSES[node.bonusId]);
  }
  return rewardForNode(run,node,ROUTE_BONUSES[candidates[0]] || null);
}

// The reward line a player reads before flying is computed from the same function that pays it.
function rewardForNode(run,node,definition){
 if(!definition)return definition;
 if(node?.levelId==='pinewood-fallen-giant'&&!run.fallenGiantHeartwood)
  return{...definition,name:'Heartwood Trail',reward:'+3 maximum Sparks permanently.'};
 if(UTILITY_PAYS.has(definition.id))return{...definition,reward:objectiveRewardLine(run,definition.id)};
 return definition;
}

export function awardRouteBonus(run, node, attempt, result, clearPay, pickupPacked, hasCurrencyContract) {
  const definition = Object.hasOwn(ROUTE_BONUSES, attempt?.bonusId) && ROUTE_BONUSES[attempt.bonusId];
  const observed = result.routeBonus;
  if (!definition || run.isTutorial || !result.success || run.routeBonusClaims?.[node.id] ||
      attempt.nodeId !== node.id || definition.id !== node.bonusId || observed?.id !== definition.id ||
      observed.eligible !== true || observed.failed || observed.complete !== true ||
      observed.target !== definition.target || !Number.isFinite(observed.progress) || observed.progress < definition.target) return null;
  const id = definition.id;
  let amount = 0;
  let message;
  if(node.levelId==='pinewood-fallen-giant'&&!run.fallenGiantHeartwood){
    run.fallenGiantHeartwood=true;run.treasureCapacity=(run.treasureCapacity||0)+10;
    message='+3 maximum Sparks permanently';
  } else if (currency.has(id)) {
    if (hasCurrencyContract || alreadyAwarded(run, id)) return null;
    const wakingPacked = Number.isFinite(observed.packed) ? Math.max(0, Math.floor(observed.packed)) : 0;
    amount = id === 'gilded' ? Math.min(30, clearPay + Math.min(wakingPacked, pickupPacked)) : 8;
    message = '+' + amount + ' Stored Sparks';
  } else if (id === 'three-suns') {
    if (alreadyAwarded(run, id) || run.lives >= getLifeCapacity(run)) return null;
    run.lives++;
    message = 'One heart restored.';
  } else {
    // Utility objectives pay at once: Stored Sparks by map, or a heart for the recovery ones while a heart is missing.
    const payout = objectivePayout(run, id);
    if (payout.kind === 'heart') { run.lives++; message = 'Objective met: +1 heart'; }
    else { amount = payout.amount; message = 'Objective met: ' + objectivePayoutLine(payout); }
  }
  (run.routeBonusClaims ??= {})[node.id] = {id, mapIndex:run.mapIndex};
  return {id, message, amount};
}
