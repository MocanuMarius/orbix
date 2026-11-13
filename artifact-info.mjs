// Lifetime is separate from rarity: a rare relic is not a consumable by default.
export const CONSUMABLE_ARTIFACTS=Object.freeze({
  'glow-wick':Object.freeze({charges:3}),
  'flash-stone':Object.freeze({charges:2}),
});
const info=(type,lifetime,trigger,effect,limit='',charges)=>Object.freeze({type,lifetime,trigger,effect,limit,...(charges?{charges}:{})});
const ARTIFACT_INFO=Object.freeze({
  'glow-wick':info('consumable','3 uses · this run','Collect a natural Glow pickup.','Restore up to 10 extra Glow.','Used up after 3 pickups. Extra fuel never makes Packed Light.',3),
  'flash-stone':info('consumable','2 uses · this run','Collect a natural Glow pickup.','Reveal the whole scene for 1.5 seconds.','Used up after 2 pickups.',2),
  'quiet-cinder':info('passive','Lasts this run','Always while mounted.','Lift costs 10% less Glow.'),
  'ember-lens':info('passive','Lasts this run','Always while mounted.','Your light reaches farther.'),
  'silver-feather':info('passive','Lasts this run','Whenever you Lift.','Rise 6% more strongly.'),
  'glass-lantern':info('passive','Lasts this run','Collect a natural Glow pickup.','Restore 6 extra Glow, but Lift costs 12% more.'),
  'moss-heart':info('passive','Lasts this run','Make a body pickup with Kindled Touch learned.','Kindled Touch restores 3 extra Glow.','Needs Kindled Touch in the Glow tree.'),
  'wayfinder-seed':info('passive','Lasts this run','While Collector is equipped.','Collector reaches 15% farther.'),
  'iron-petal':info('passive','Lasts this run','While Protector is equipped.','Protector recharges 12% sooner.'),
  'storm-knot':info('passive','Lasts this run','While Runner is equipped.','Runner recharges 10% sooner and resists more wind.'),
  'hollow-bell':info('passive','Lasts this run','While Space Timer is equipped.','Levitate for 0.25 seconds longer.'),
  'dawn-thread':info('passive','Lasts this run','When your learned Echo Sight activates.','Its reveal lasts one second longer.','Needs Echo Sight in the Light tree.'),
  'echo-vessel':info('passive','Lasts this run','Collect fuel above your maximum Glow.','Convert more surplus into Packed Light.','Adds 10 percentage points to conversion; the shared cap still applies.'),
  'overflow-coil':info('triggered','Resets each flight','Collect fuel above your maximum Glow.','Recharge your companions sooner.','Up to 2 seconds per pickup and 12 seconds per flight.'),
  'echo-bell':info('triggered','Resets each flight','Your companion fetches, shields, dashes or levitates.','Your next body fuel pickup restores 8 extra Glow.','Collect within 8 seconds. Up to 5 uses per flight.'),
  'dawn-loom':info('triggered','Resets each flight','A pickup restores companion recovery time.','Reveal ahead for 1.5 seconds.','4 seconds between flashes.'),
  'sunspool':info('triggered','Resets each flight','Collect fuel during a temporary light reveal.','Store one free Lift.','One stored Lift; 4 seconds between grants; 4 grants per flight.'),
  'dreamcatcher':info('triggered','Lasts this run','Collect fuel during your preset Dream opening.','Recharge companions by 1.5 seconds.','Needs a saved Dream. Activates on each eligible Dream pickup.'),
  'second-dawn':info('triggered','Resets each flight','Collect your first fuel after Dream playback.','Briefly reveal the whole scene.','Once each flight after a saved Dream.'),
  'night-gardener':info('triggered','Resets each flight','Skim a Dark Seed without touching it.','Restore 4 Glow.','Once per seed, up to 5 seeds per flight.'),
  'sunheart-engine':info('triggered','Kept between runs','Collect natural fuel, especially above maximum Glow.','Gain 8 extra Glow; surplus recharges companions and reveals ahead.','Recovery: up to 2 seconds per pickup, 12 per flight. Reveal: 2 seconds.'),
  'dream-sovereign':info('triggered','Kept between runs','Dream fuel recharges companions; waking fuel reveals the scene.','Fuel collected in temporary light can store a free Lift.','4 free Lift grants per flight. Also increases your light radius.'),
  'hollow-covenant':info('triggered','Kept between runs','Companion action primes your next body fuel pickup.','Restore 12 extra Glow; Lift always costs 10% less.','5 primed pickups per flight. Also skim up to 5 Dark Seeds for 6 Glow each.'),
});
export function getArtifactInfo(id){return ARTIFACT_INFO[id]||info('passive','Lasts this run','While mounted.','Inspect this artifact for its effect.');}
