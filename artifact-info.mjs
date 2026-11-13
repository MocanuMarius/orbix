// Lifetime is separate from rarity: a rare relic is not a consumable by default.
export const CONSUMABLE_ARTIFACTS=Object.freeze({
  'glow-wick':Object.freeze({charges:3,maxCharges:9}),
  'flash-stone':Object.freeze({charges:2,maxCharges:6}),
});
export const EVOLVING_ARTIFACTS=Object.freeze(['wayward-seed','hearth-bloom','lantern-bloom']);
const info=(type,lifetime,trigger,effect,limit='',charges)=>Object.freeze({type,lifetime,trigger,effect,limit,...(charges?{charges}:{})});
const ARTIFACT_INFO=Object.freeze({
 'wayward-seed':info('triggered','This run · evolves after Map 1','Three consecutive body Spark pickups.','Restore up to 3.34 extra Sparks.','Collector deliveries break the chain. Five activations per flight. At Map 1 clear, choose Hearth Bloom (+10 Sparks) or Lantern Bloom (1.5s reveal). Bonus fuel never makes Packed Sparks.'),
 'hearth-bloom':info('triggered','This run · fuel evolution','Three consecutive body Spark pickups.','Restore up to 10 extra Sparks.','Collector deliveries break the chain. Five activations per flight. Replaces Wayward Seed in the same slot. Bonus fuel never makes Packed Sparks.'),
 'lantern-bloom':info('triggered','This run · Luminance evolution','Three consecutive body Spark pickups.','Reveal the whole scene for 1.5 seconds.','Collector deliveries break the chain. Five activations per flight. Replaces Wayward Seed in the same slot. Can prime Sunspool, within its four-Lift cap.'),
  'glow-wick':info('consumable','3 uses per copy · up to 9','Collect a natural Sparks pickup while below full.','Restore up to 10 extra Sparks.','Full Sparks preserves the use. Each earned copy adds 3 uses to the same slot, up to 9. Fourth copies melt for 25 Packed Sparks. Rest can recharge mounted copies. Consumed when empty. Extra fuel never makes Packed Sparks.',3),
  'flash-stone':info('consumable','2 uses per copy · up to 6','Collect a natural Sparks pickup.','Reveal the whole scene for 1.5 seconds.','Each earned copy adds 2 uses to the same slot, up to 6. Fourth copies melt for 25 Packed Sparks. Rest can recharge mounted copies. Consumed when empty. Extra light does not stack.',2),
  'quiet-cinder':info('passive','Lasts this run','Always while mounted.','Lift costs one less Spark (minimum one).'),
  'ember-lens':info('passive','Lasts this run','Always while mounted.','Your light reaches farther.'),
  'silver-feather':info('passive','Lasts this run','Whenever you Lift.','Rise 6% more strongly.'),
  'glass-lantern':info('passive','Lasts this run','Collect a natural Sparks pickup.',`Restore ${40/3} extra Sparks, but Lift costs one extra Spark.`,'One pickup repays four Lifts of extra effort. Missed pickups still cost you.'),
  'moss-heart':info('passive','Lasts this run','Make a body pickup with Kindled Touch learned.','Kindled Touch restores 3 extra Sparks.','Needs Kindled Touch in the Sparks tree.'),
  'wayfinder-seed':info('passive','Lasts this run','While Collector is equipped.','Collector reaches 15% farther.'),
  'iron-petal':info('passive','Lasts this run','While Protector is equipped.','Protector recharges 12% sooner.'),
  'storm-knot':info('passive','Lasts this run','While Runner is equipped.','Runner recharges 10% sooner and resists more wind.'),
  'hollow-bell':info('passive','Lasts this run','While Space Timer is equipped.','Levitate for 0.25 seconds longer.'),
  'dawn-thread':info('passive','Lasts this run','When your learned Echo Luminance activates.','Its reveal lasts one second longer.','Needs Echo Luminance in the Light tree.'),
  'echo-vessel':info('passive','Lasts this run','Collect fuel above your maximum Sparks.','Convert more surplus into Packed Sparks.','Adds 10 percentage points to conversion; the shared cap still applies.'),
  'overflow-coil':info('triggered','Resets each flight','Collect fuel above your maximum Sparks.','Recharge your companions sooner.','Up to 2 seconds per pickup and 12 seconds per flight.'),
  'echo-bell':info('triggered','Resets each flight','Your companion fetches, shields, dashes or levitates.','Your next body Spark pickup restores 8 extra Sparks.','Collect within 8 seconds. Up to 5 uses per flight.'),
  'dawn-loom':info('triggered','Resets each flight','A pickup restores companion recovery time.','Reveal ahead for 1.5 seconds.','4 seconds between flashes.'),
  'sunspool':info('triggered','Resets each flight','Collect fuel during a temporary light reveal.','Store one free Lift.','One stored Lift; 4 seconds between grants; 4 grants per flight.'),
  'dreamcatcher':info('triggered','Lasts this run','Collect fuel during your preset Dream opening.','Recharge companions by 1.5 seconds.','Needs a saved Dream. Activates on each eligible Dream pickup.'),
  'second-dawn':info('triggered','Resets each flight','Collect your first fuel after Dream playback.','Briefly reveal the whole scene.','Once each flight after a saved Dream.'),
  'night-gardener':info('triggered','Resets each flight','Skim a Dark Spark without touching it.','Restore 4 Sparks.','Once per seed, up to 5 seeds per flight.'),
  'sunheart-engine':info('triggered','Kept between runs','Collect natural fuel, especially above maximum Sparks.','Gain 8 extra Sparks; surplus recharges companions and reveals ahead.','Recovery: up to 2 seconds per pickup, 12 per flight. Reveal: 2 seconds.'),
  'dream-sovereign':info('triggered','Kept between runs','Dream fuel recharges companions; waking fuel reveals the scene.','Fuel collected in temporary light can store a free Lift.','4 free Lift grants per flight. Also increases your Luminance radius.'),
  'hollow-covenant':info('triggered','Kept between runs','Companion action primes your next body Spark pickup.','Restore 12 extra Sparks; Lift costs one less Spark (minimum one).','5 primed pickups per flight. Also skim up to 5 Dark Sparks for 6 Sparks each.'),
});
export function getArtifactInfo(id){return ARTIFACT_INFO[id]||info('passive','Lasts this run','While mounted.','Inspect this artifact for its effect.');}
// Only a newly earned reward adds uses. Mounting and moving read the same ledger.
export function getArtifactStackPreview(run,id){
 const spec=CONSUMABLE_ARTIFACTS[id],slot=run?.artifacts?.indexOf(id)??-1;
 if(!spec||slot<0)return null;
 const saved=run.artifactCharges?.[id],before=Number.isFinite(saved)?Math.max(0,Math.min(spec.maxCharges,Math.floor(saved))):spec.charges;
 const autoForge=Math.ceil(before/spec.charges)>=3;
 const after=autoForge?before:Math.min(spec.maxCharges,before+spec.charges);
 return {autoForge,packedLight:autoForge?25:0,copies:Math.ceil(before/spec.charges),slot,before,after,added:after-before,wasted:autoForge?0:spec.charges-(after-before),perCopy:spec.charges,max:spec.maxCharges};
}

// Rest replenishes only equipped, surviving consumables; it cannot revive or
// refill an unmounted TEST catalogue item. No reward or currency is generated.
export function getRestRechargePreview(run){
 return [...new Set(run?.artifacts||[])].flatMap(id=>{
  const spec=CONSUMABLE_ARTIFACTS[id];if(!spec)return [];
  const before=Math.max(0,Math.min(spec.maxCharges,Math.floor(run.artifactCharges?.[id]??spec.charges)));
  if(before<=0||before>=spec.maxCharges)return [];
  return [{id,before,after:Math.min(spec.maxCharges,before+spec.charges),max:spec.maxCharges}];
 });
}
