// A small opening direction, not a shortcut past a major skill investment.
export const STARTING_SKILL_COST_LIMIT=60;
const skill=(id,name,description)=>({id,name,description,skillId:id,artifactIds:[]});
const relic=(id,name,description,...artifactIds)=>({id,name,description,artifactIds});
export const STARTING_GIFTS=Object.freeze([
  skill('proximity-awakening','Surface Pulse','Skim solid terrain to charge a revealing pulse.'),
  skill('main-sight','Luminance','Your light reaches farther. Opens the Luminance skill paths.'),
  skill('main-speed','Momentum','Fly 8% faster. Shorter crossings demand quicker reactions.'),
  skill('collector-attunement','Search Spark','Collector range +12%. Opens its skill branches.'),
  skill('main-resonant-harvest','Resonant Harvest','Temporary Pulses restore 1 Spark when they touch an uncollected Spark.'),
  relic('gift-spark-lens','Spark Lens','Your light reaches a little farther.','ember-lens'),
  relic('gift-silver-feather','Silver Feather','Lift impulse is 6% stronger.','silver-feather'),
  relic('gift-wayfinder-seed','Wayfinder Seed','Collector searches 15% farther.','wayfinder-seed'),
  relic('gift-reed-charm','Reed Charm','Drafts push 12% less strongly.','reed-charm'),
  relic('gift-moon-glass','Moon Glass','Dark Sparks dim your Luminance 10 percentage points less.','moon-glass'),
  relic('gift-stone-anchor','Stone Anchor','Fall 5% faster for deliberate descents.','stone-anchor'),
  relic('gift-silk-sail','Silk Sail','Fall 5% more slowly.','silk-sail'),
  relic('gift-cache-cup','Cache Cup','Caches restore 2 extra Sparks.','cache-cup'),
  relic('gift-path-prism','Path Prism','A small Luminance increase; twice the benefit in crystal caves.','path-prism'),
  relic('gift-spark-wick','Spark Wick','Three automatic pickups restore extra fuel. Full Sparks preserve a use.','glow-wick'),
  relic('gift-flash-stone','Flare Stone','Two automatic pickups briefly reveal the scene.','flash-stone'),
  relic('gift-echo-bell','Echo Bell','Collector work primes your next body pickup for extra fuel within 8 seconds. Up to 5 times per flight.','echo-bell'),
  relic('gift-overflow-coil','Overflow Coil','Overflow speeds Collector recovery, up to 2 seconds per pickup and 12 seconds per flight.','overflow-coil'),
  relic('gift-night-gardener','Night Gardener','Skim past a Dark Spark without touching it to recover up to 6 missing Sparks. Up to 5 times per flight.','night-gardener'),
  relic('gift-wayward-seed','Wayward Seed','Consecutive body pickups restore extra fuel. Choose its lasting evolution after Map 1.','wayward-seed'),
].map(Object.freeze));
