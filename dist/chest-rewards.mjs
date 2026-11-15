const relic=(id,title,description,artifactIds)=>({id,title,description,artifactIds,icon:'artifact'});
const skill=(id,title,description,skillId)=>({id,title,description,skillId,icon:'skill'});
export const CHEST_REWARDS=Object.freeze([
 relic('cinder','Cinder in a jar','Each Lift costs one fewer Spark.','quiet-cinder'),
 relic('gardener','The night garden','Safely skim Dark Sparks to restore missing fuel. Up to five times per flight.','night-gardener'),
 relic('prism','The prism vessel','Pack one-third of overflow instead of one-sixth.','echo-vessel'),
 relic('coil','The sleeping coil','Overflow restores up to 12 seconds of companion recovery per flight.','overflow-coil'),
 relic('bell','The echo bell','Collector work primes your next body pickup for extra fuel.','echo-bell'),
 relic('seed','A wayward seed','Body-pickup chains restore fuel. Evolve the seed after Map 1.','wayward-seed'),
 relic('glass','The glass bargain','Each natural pickup grants 4 extra Sparks. Every Lift costs 1 extra Spark.','glass-lantern'),
 relic('sail','A sheltered sail','Fall 5% more slowly. Drafts push 12% less strongly.',['silk-sail','reed-charm']),
 relic('feather','The wind weave','Lift is 6% stronger. Drafts push 12% less strongly.',['silver-feather','reed-charm']),
 relic('survey','The surveyor kit','Stronger Lift and a small increase in Luminance.',['silver-feather','path-prism']),
 relic('moon','Moonward glass','More Luminance and resistance to Dark Spark dimming.',['moon-glass','ember-lens']),
 relic('path','A pathfinder seed','Collector reach +15%; small Luminance increase, doubled in crystal biomes.',['wayfinder-seed','path-prism']),
 relic('harvest','A cache harvest','Dense Cache pickups restore extra fuel. Fall 5% faster.',['cache-cup','stone-anchor']),
 relic('medicine','Emergency supplies','Three automatic fuel boosts and two automatic revealing flashes. Refill uses at Rest.',['glow-wick','flash-stone']),
 skill('dream','The dream journal','Learn Dream: rehearse each opening for 8 seconds.','main-dream'),
 skill('glide','The breathing stone','Learn Glide Regeneration. Recover while falling without Lift.','main-glide-regen'),
 skill('rhythm','The fourth note','Learn Fourth Beat. Your fourth quick Lift is free.','main-fourth-beat'),
 skill('vessel','A living vessel','Learn Spark Vessel: +6 maximum Sparks. Fill the new space.','main-reservoir'),
 skill('cargo','The carrier seal','Collector can retrieve dense Caches. Each delivery refills its search ring.','collector-fetch-large'),
 skill('flash','The white invitation','Collector can fetch Flash triangles. All Flash pickups restore up to 6 missing Sparks.','collector-fetch-flash'),
 skill('long-light','The long candle','Flash triangles last 24 seconds instead of 8.','main-long-flash'),
 skill('sense','The hidden constellation','Sense nearby pickups through fog. Distant pickups stay hidden.','main-glow-sense'),
 skill('packing','The crystal press','Learn Efficient Storage. Pack one-third of overflow instead of one-sixth.','main-afterglow'),
 skill('dividend','The trail charter','Every cleared flight pays 10 extra Stored Sparks.','main-clear-dividend'),
 skill('pulse','A surface whisper','Learn Proximity. Skim terrain to charge a revealing pulse.','proximity-awakening'),
 skill('guard','The last orbit','At full charge, Collector rescues a fatal collision. It then recovers four times more slowly.','collector-last-orbit'),
 skill('renewal','The renewal spring','Recover more fuel after every cleared flight.','main-recovery'),
 {id:'heart',title:'A captive heartbeat',description:'Restore one missing heart and gain 15 Stored Sparks.',icon:'heart',effect:{lives:1,packedReward:15},needsHeart:true},
 {id:'growth',title:'A glass seed',description:'Gain 3 maximum Sparks permanently and fill the new space.',icon:'capacity',effect:{treasureGift:'vessel',flame:10},growth:true},
 {id:'purse',title:'A sealed hoard',description:'Gain 40 Stored Sparks for the skills of your choice.',icon:'packed',effect:{packedReward:40}},
].map(item=>Object.freeze({...item,artifactIds:[item.artifactIds||[]].flat()})));
export function chestRewardPair(run,key,{validSkill,validArtifact,maxLives,growthAvailable}){
 const history=new Set(run.chestRewardHistory||[]);
 const eligible=CHEST_REWARDS.filter(item=>(!item.skillId||validSkill(item.skillId))&&item.artifactIds.every(validArtifact)&&(!item.needsHeart||run.lives<maxLives)&&(!item.growth||growthAvailable));
 const unseen=eligible.filter(item=>!history.has(item.id));
 const pool=unseen.length>=2?unseen:eligible;
 let seed=2166136261;for(const ch of key)seed=Math.imul(seed^ch.charCodeAt(0),16777619);
 const order=pool.map(item=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return{item,order:seed};}).sort((a,b)=>a.order-b.order);
 return order.slice(0,2).map(({item})=>({id:'chest:'+item.id,title:item.title,description:item.description,detail:item.description,displayUnits:true,icon:item.icon,artifactIds:item.artifactIds,skillId:item.skillId,effect:{...item.effect,chestRewardId:item.id,chestSkill:item.skillId,chestArtifacts:item.artifactIds}}));
}
