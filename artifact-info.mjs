import {GUARDIAN_RELICS} from './guardian-artifacts.mjs?v=rest-1';
// Lifetime is separate from rarity: a rare relic is not a consumable by default.
export const CONSUMABLE_ARTIFACTS=Object.freeze({
  'glow-wick':Object.freeze({charges:3,maxCharges:3}),
  'flash-stone':Object.freeze({charges:2,maxCharges:2}),
});
export const EVOLVING_ARTIFACTS=Object.freeze(['wayward-seed','hearth-bloom','lantern-bloom']);
const info=(type,lifetime,trigger,effect,limit='',charges)=>Object.freeze({type,lifetime,trigger,effect,limit,...(charges?{charges}:{})});
const ARTIFACT_INFO=Object.freeze({
 ...Object.fromEntries(Object.entries(GUARDIAN_RELICS).map(([id,r])=>[id,info(Object.keys(r.modifiers).length?'passive':'triggered','Permanent',r.trigger,r.effect,r.limit)])),
 'wayward-seed':info('triggered','Permanent · evolves after Map 1','Three consecutive body Spark pickups.','Restore up to 3.34 extra Sparks.','Collector deliveries break the chain. Five activations per flight. At Map 1 clear, choose Hearth Bloom (+10 Sparks) or Lantern Bloom (1.5s reveal). Bonus fuel never makes Stored Sparks.'),
 'hearth-bloom':info('triggered','Permanent · fuel evolution','Three consecutive body Spark pickups.','Restore up to 10 extra Sparks.','Collector deliveries break the chain. Five activations per flight. Replaces Wayward Seed. Bonus fuel never makes Stored Sparks.'),
 'lantern-bloom':info('triggered','Permanent · Luminance evolution','Three consecutive body Spark pickups.','Reveal the whole scene for 1.5 seconds.','Collector deliveries break the chain. Five activations per flight. Replaces Wayward Seed. Can prime Sunspool, within its four-Lift cap.'),
  'glow-wick':info('consumable','3 automatic uses','Collect a natural Spark pickup while below full.','Restore up to 10 extra Sparks.','A full Spark Meter preserves the use. Consumed when empty. Extra fuel never makes Stored Sparks.',3),
  'flash-stone':info('consumable','2 automatic uses','Collect a natural Spark pickup.','Reveal the whole scene for 1.5 seconds.','Consumed when empty. Extra light does not stack.',2),
  'quiet-cinder':info('passive','Permanent','Always while owned.','Lift costs one fewer Spark (minimum one).'),
  'ember-lens':info('passive','Permanent','Always while owned.','Your light reaches farther.'),
  'silver-feather':info('passive','Permanent','Whenever you Lift.','Rise 6% more strongly.'),
  'glass-lantern':info('passive','Permanent','Collect a natural Spark pickup.',`Restore ${40/3} extra Sparks, but Lift costs one extra Spark.`,'One pickup repays four Lifts of extra effort. Missed pickups still cost you.'),
  'moss-heart':info('passive','Permanent','Make a body pickup with Kindled Touch learned.','Kindled Touch restores 3 extra Sparks.','Needs Kindled Touch in the Sparks tree.'),
  'wayfinder-seed':info('passive','Permanent','While Collector is equipped.','Collector reaches 15% farther.'),
  'iron-petal':info('passive','Permanent','While Protector is equipped.','Protector recharges 12% sooner.'),
  'storm-knot':info('passive','Permanent','While Runner is equipped.','Runner recharges 10% sooner and resists more wind.'),
  'hollow-bell':info('passive','Permanent','While Space Timer is equipped.','Levitate for 0.25 seconds longer.'),
  'dawn-thread':info('passive','Permanent','When your learned Echo Luminance activates.','Its reveal lasts one second longer.','Needs Echo Luminance in the Light tree.'),
  'echo-vessel':info('passive','Permanent','Collect fuel above your Spark capacity.','Increase storage efficiency.','Without skills: 6 surplus Sparks become 2 Stored Sparks instead of 1. Storage cannot exceed the surplus.'),
  'overflow-coil':info('triggered','Resets each flight','Collect fuel above your Spark capacity.','Recharge your companions sooner.','Up to 2 seconds per pickup and 12 seconds per flight.'),
  'echo-bell':info('triggered','Resets each flight','Your companion fetches, shields, dashes or levitates.','Your next body Spark pickup restores 8 extra Sparks.','Collect within 8 seconds. Up to 5 uses per flight.'),
  'dawn-loom':info('triggered','Resets each flight','A pickup restores companion recovery time.','Reveal ahead for 1.5 seconds.','4 seconds between flashes.'),
  'sunspool':info('triggered','Resets each flight','Collect fuel during a temporary light reveal.','Store one free Lift.','One stored Lift; 4 seconds between grants; 4 grants per flight.'),
  'dreamcatcher':info('triggered','Permanent','Collect fuel during your preset Dream opening.','Recharge companions by 1.5 seconds.','Needs a saved Dream. Activates on each eligible Dream pickup.'),
  'second-dawn':info('triggered','Resets each flight','Collect your first fuel after Dream playback.','Briefly reveal the whole scene.','Once each flight after a saved Dream.'),
  'night-gardener':info('triggered','Resets each flight','Fly past a Dark Spark just outside its red rim.','Restore up to 6 missing Sparks per safe skim.','Each Dark Spark blooms once, up to 5 times per flight.'),
  'sunheart-engine':info('triggered','Permanent','Collect natural fuel, especially above Spark capacity.','Gain 8 extra Sparks; surplus recharges companions and reveals ahead.','Recovery: up to 2 seconds per pickup, 12 per flight. Reveal: 2 seconds.'),
  'dream-sovereign':info('triggered','Permanent','Dream fuel recharges companions; waking fuel reveals the scene.','Fuel collected in temporary light can store a free Lift.','4 free Lift grants per flight. Also increases your Luminance radius.'),
  'hollow-covenant':info('triggered','Permanent','Companion action primes your next body Spark pickup.','Restore 12 extra Sparks; Lift costs one fewer Spark (minimum one).','5 primed pickups per flight. Also skim up to 5 Dark Sparks for 6 Sparks each.'),
});
export function getArtifactInfo(id){return ARTIFACT_INFO[id]||info('passive','Permanent','While owned.','Inspect this artifact for its effect.');}
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
