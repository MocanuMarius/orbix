export const COMPONENT_SAMPLES=Object.freeze({
  collection:{label:'Collection',description:'Production Collection: select a relic, page through the shelf, open full rules, and Melt at Rest.',states:{owned:'Owned relics',rest:'At Rest',confirm:'Confirm Melt',empty:'Empty',almanac:'Relic almanac'}},
  rewards:{label:'Relic rewards',description:'Production reward comparison and acquired state share identity, rule copy, and action primitives with Collection.',states:{choose:'Choose one',acquired:'Acquired',clear:'Clear receipt',pedestal:'A · Centered pedestal',horizontal:'B · Illustrated horizontal',compact:'C · Compact victory'}},
  cards:{label:'Cards & Deck',description:'Production card faces, reward comparison, Deck and Rest Workshop. Compare named upgrades, refill uses, or inspect Forge before spending sample Stored Sparks.',states:{draft:'Choose 1 of 3 cards',draftCeremony:'Choose 1 of 3 · flight reward',starter:'Starting card · tap to pick',workshop:'Rest Workshop · Improve, Refill & Forge',rest:'Rest · actions & Workshop',combos:'Connected row · Rhythm, Harvest & Dawn Loom',reward:'New card · compare & equip',rewardLong:'New card · long rules',rewardFive:'New card · five slots',rewardSeed:'New Seed · Rest card',equipped:'Equipped cards',reserve:'Reserve Deck',reader:'Card reader',empty:'Empty slots'}},
  route:{label:'Route & preview',description:'Production route art and Travel Guide. Preview a bright next stop or a muted future stop before committing.',states:{start:'At the start',progress:'Route in progress',wayfinder:'Thorn Steeple · gold gates'}},
  menus:{label:'Home & navigation',description:'Production home menu, resumable checkpoint, difficulty control, and companion roster.',states:{new:'New expedition',resume:'Resume checkpoint'}},
  hud:{label:'Flight HUD & controls',description:'Production Spark meter, hearts, proximity meter, route bonus, and companion control. Lift changes only this sample.',states:{ready:'Ready',low:'Low Sparks',recovering:'Power recovering',paused:'Paused'}},
  dialogs:{label:'Rules & glossary',description:'Production full rules, earnings breakdown, pickup guide, and clickable keyword glossary.',states:{relic:'Full relic rules',earnings:'Earnings breakdown',pickups:'Pickup guide',glossary:'Keyword glossary'}},
  controls:{label:'Shared controls',description:'Shared action renderer: enabled, unavailable, selected, and confirmation controls using the game action contract.',states:{actions:'Action states'}},
  art:{label:'Symbols & art',description:'The actual resource, companion, landmark, relic, and reliquary art renderers used by the game.',states:{symbols:'Resources & companions',relics:'Relics & reliquary'}},
});
export function resolveSample(family,state){
  const key=Object.hasOwn(COMPONENT_SAMPLES,family)?family:'collection';
  const spec=COMPONENT_SAMPLES[key],variant=Object.hasOwn(spec.states,state)?state:Object.keys(spec.states)[0];
  return {family:key,state:variant,spec};
}
