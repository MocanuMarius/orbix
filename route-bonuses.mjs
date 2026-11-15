import {getLifeCapacity} from './vitality.mjs?v=biome-spirit-1';
import {grantPassageBoon} from './passage-preparations.mjs?v=biome-spirit-1';

function bonus(id, name, condition, reward, target) {
  return Object.freeze({id, name, condition, reward, target});
}

export const ROUTE_BONUSES = Object.freeze({
  gilded: bonus('gilded', 'Gilded Passage', 'Collect 4 of 6 marked Sparks.', 'Double this flight’s clear pay and stored surplus, up to +30 Stored Sparks.', 4),
  'three-suns': bonus('three-suns', 'Three Suns', 'Collect all three marked Spark Caches. Look for dense plasma.', 'Restore one missing heart.', 3),
  precision: bonus('precision', 'Pilgrim Precision', 'Touch 4 of 6 marked Sparks with your main wisp.', '+8 Stored Sparks.', 4),
  'wild-circuit': bonus('wild-circuit', 'Wild Circuit', 'Activate two marked terrain objects.', 'Companion recovery is 20% faster for 3 cleared flights.', 2),
  'flash-relay': bonus('flash-relay', 'Flash Relay', 'Collect the marked Flash Powerup, then 2 of 3 marked Sparks while the passage is lit.', 'Opening Luminance +25% for 15 seconds, for 3 cleared flights.', 2),
  'long-glide': bonus('long-glide', 'Long Glide', 'Lift at the blue chevron, then glide through both marked Sparks for two seconds.', 'First 3 Lifts free in each of 3 cleared flights, up to 9 Sparks per flight.', 2),
  edgeweaver: bonus('edgeweaver', 'Edgeweaver', 'Trigger Proximity in both marked sections.', 'One collision ward per flight, for 3 cleared flights.', 2),
  'night-sail': bonus('night-sail', 'Night Sail', 'Collect both bypass Sparks. Lose at most 3 Sparks to the marked Black Hole.', 'Black Holes drain 25% less Sparks for 3 cleared flights.', 2),
  wayfinder: bonus('wayfinder', 'Wayfinder', 'Fly through three marked gates.', 'Preview the opening 2.5 seconds of each of 3 cleared flights.', 3),
  constellation: bonus('constellation', 'Rising Constellation', 'Follow the gold marks. Collect a Spark, then a Cluster, then a Cache. Miss one? Look for the next matching Spark.', 'First 3 fuel Sparks give +2 Sparks each, for 3 cleared flights.', 3)
});

const utility = ['wild-circuit', 'flash-relay', 'long-glide', 'edgeweaver', 'night-sail', 'wayfinder', 'constellation'];
const helpfulBiomes = new Set(['marsh', 'fungal', 'crystal', 'thorn', 'cemetery']);
const currency = new Set(['gilded', 'precision']);

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
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
    case 'edgeweaver': return !!run.skills?.['proximity-awakening'];
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
  if (node.id === purse?.id && !run.pilgrimVow && run.treasurePact !== 'wager' && !alreadyAwarded(run, currencyId)) ids.push(currencyId);
  const heartSites = flights.filter(site => site.id !== purse?.id&&(!Number.isFinite(site.duration)||site.duration>=75));
  const heart = heartSites[hash(run.seed + ':bonus-heart') % heartSites.length];
  if (node.id === heart?.id && run.lives < getLifeCapacity(run) && !alreadyAwarded(run, 'three-suns')) ids.push('three-suns');
  const prefix = run.seed + ':bonus-row:' + node.row + ':';
  const order = [...utility].sort((a,b) => hash(prefix + a) - hash(prefix + b));
  const offset = (node.routeLane ?? node.lane ?? 0) % order.length;
  return ids.concat([...order.slice(offset), ...order.slice(0,offset)].filter(id => canOfferUtility(run, node, id)));
}

export function getRouteBonus(run, node) {
  const candidates = getRouteBonusCandidates(run, node);
  if (Object.hasOwn(node || {}, 'bonusId')) {
    if (node.bonusId === null) return null;
    if (candidates.includes(node.bonusId)) return rewardForNode(run,node,ROUTE_BONUSES[node.bonusId]);
  }
  return rewardForNode(run,node,ROUTE_BONUSES[candidates[0]] || null);
}

function rewardForNode(run,node,definition){
 if(definition&&node?.levelId==='pinewood-fallen-giant'&&!run.fallenGiantHeartwood)
  return{...definition,name:'Heartwood Trail',reward:'+3 maximum Sparks permanently.'};
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
    message='Heartwood Trail · +3 maximum Sparks permanently';
  } else if (currency.has(id)) {
    if (hasCurrencyContract || alreadyAwarded(run, id)) return null;
    const wakingPacked = Number.isFinite(observed.packed) ? Math.max(0, Math.floor(observed.packed)) : 0;
    amount = id === 'gilded' ? Math.min(30, clearPay + Math.min(wakingPacked, pickupPacked)) : 8;
    message = definition.name + ' · +' + amount + ' Stored Sparks';
  } else if (id === 'three-suns') {
    if (alreadyAwarded(run, id) || run.lives >= getLifeCapacity(run)) return null;
    run.lives++;
    message = 'Three Suns · one heart restored';
  } else {
    grantPassageBoon(run,id);
    message = definition.name + ' · ' + definition.reward;
  }
  (run.routeBonusClaims ??= {})[node.id] = {id, mapIndex:run.mapIndex};
  return {id, name:message.startsWith('Heartwood Trail')?'Heartwood Trail':definition.name, message, amount};
}
