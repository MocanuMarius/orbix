// One lasting opening advantage. Bundles pair modest relic effects so they
// can compete with skills and the stronger single relics in the same draw.
const skill=(id,name,description)=>({id,name,description,skillId:id,artifactIds:[]});
const relic=(id,name,description,...artifactIds)=>({id,name,description,artifactIds});
export const STARTING_GIFTS=Object.freeze([
  skill('proximity-awakening','Surface Pulse','Skim solid terrain to charge a revealing pulse.'),
  skill('main-dream','Dreamer','Rehearse the opening 8 seconds of each flight. Keep your chosen path and pickups.'),
  skill('main-glow-sense','Spark Sense','See nearby pickups faintly through fog. Distant pickups stay hidden.'),
  skill('main-long-flash','Long Flash','Flash triangles light the passage for 24 seconds instead of 8.'),
  skill('main-fourth-beat','Fourth Beat','Your fourth quick Lift within one second is free.'),
  skill('main-glide-regen','Glide Regeneration','After 1.5 seconds without Lift, regenerate while falling. Up to 6 Sparks per flight.'),
  skill('main-reservoir','Deep Vessel','Start with 6 extra maximum Sparks. The new space begins full.'),
  skill('collector-fetch-large','Cache Handling','Collector can fetch dense Caches for 12 Sparks. Cache deliveries refill its ring.'),
  relic('gift-prism-vessel','Prism Vessel','Pack 2 of every 6 surplus Sparks instead of 1.','echo-vessel'),
  relic('gift-echo-bell','Echo Bell','Collector work primes your next body pickup for extra fuel within 8 seconds. Up to 5 times per flight.','echo-bell'),
  relic('gift-overflow-coil','Overflow Coil','Overflow speeds Collector recovery, up to 2 seconds per pickup and 12 seconds per flight.','overflow-coil'),
  relic('gift-night-gardener','Night Gardener','Skim past a Dark Spark without touching it to recover up to 6 missing Sparks. Up to 5 times per flight.','night-gardener'),
  relic('gift-wayward-seed','Wayward Seed','Consecutive body pickups restore extra fuel. Choose its lasting evolution after Map 1.','wayward-seed'),
  relic('gift-quiet-cinder','Quiet Cinder','Each Lift costs one fewer Spark, down to a minimum of 1.','quiet-cinder'),
  relic('gift-windweave','Windweave','Drafts push 12% less strongly. Lift impulse is 6% stronger.','reed-charm','silver-feather'),
  relic('gift-wayfinder','Wayfinder','Collector searches 15% farther. Luminance reaches farther, especially in crystal caves.','wayfinder-seed','path-prism'),
  relic('gift-moonward','Moonward','Luminance reaches farther. Dark Sparks dim it 10 percentage points less.','ember-lens','moon-glass'),
  relic('gift-cache-harvest','Cache Harvest','Large Sparks restore 2 extra Sparks. Fall 5% faster for deliberate descents.','cache-cup','stone-anchor'),
  relic('gift-sheltered-sail','Sheltered Sail','Drafts push 12% less strongly. Fall 5% more slowly.','reed-charm','silk-sail'),
  relic('gift-surveyor','Surveyor','Lift impulse is 6% stronger. Luminance reaches farther, especially in crystal caves.','silver-feather','path-prism'),
].map(Object.freeze));
