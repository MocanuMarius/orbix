// Guardian trophies use displayed Spark units throughout their descriptions.
// Each reaction has a flight-local allowance; bonus fuel cannot create overflow.
const relic=(name,tags,trigger,effect,limit='Always active this run.',modifiers={})=>
  Object.freeze({name,tags:Object.freeze(tags),trigger,effect,limit,modifiers:Object.freeze(modifiers)});

export const GUARDIAN_RELICS=Object.freeze({
 'rescue-wick':relic('Rescue Wick',['sustain'],'A paid Lift leaves 3 Sparks or fewer.','Restore up to 9 missing Sparks.','Once per flight.'),
 'galespun-spindle':relic('Galespun Spindle',['tempo','risk'],'Touch a fuel Spark yourself inside a blowing draft.','Store one free Lift.','Three grants per flight. One Lift can be stored at a time.'),
 'moonwake-lens':relic('Moonwake Lens',['precision','dream'],'Touch a fuel Spark yourself while descending.','Reveal the entire passage for 1.5 seconds.','Three reveals per flight, at least 6 seconds apart.'),
 'ascent-chime':relic('Ascent Chime',['tempo','precision'],'Touch a fuel Spark yourself while climbing.','Take 3 seconds off companion recovery.','Four uses per flight. A ready companion preserves a use.'),
 'threefold-chalice':relic('Threefold Chalice',['sustain','precision'],'Collect a small Spark, a Cluster and a Cache in any order.','Restore up to 9 missing Sparks on your next paid Lift.','Two sets per flight. A completed set waits for a paid Lift.'),
 'salt-crown':relic('Salt Crown',['sustain','tempo'],'Collect fuel that overfills the Spark Meter.','Store one free Lift.','Three grants per flight. One Lift can be stored at a time.'),
 'twin-lanterns':relic('Twin Lanterns',['precision','sustain'],'Collect two fuel Sparks of the same strength in a row.','Each matching pair restores up to 6 missing Sparks.','Three pairs per flight. A pickup counts toward only one pair.'),
 'restless-feather':relic('Restless Feather',['tempo'],'Make five paid Lifts.','Take 4 seconds off companion recovery.','Up to three recharges per flight. Free Lifts never advance the count.'),
 'stillwater-bell':relic('Stillwater Bell',['precision','sustain'],'Coast for 1.2 seconds, then touch a fuel Spark yourself.','Restore up to 6 extra Sparks.','Three uses per flight. Requires a Lift between catches.'),
 'first-light-standard':relic('First Light Standard',['dream','tempo'],'Begin a flight.','Start with three free Lifts.','Opening charges are spent before a Lift stored by another artifact.'),
 'black-atlas':relic('Black Atlas',['precision','dream'],'Throughout each flight.','Gain two ranks of the flight-path guide and extend Luminance by 25.','The guide caps at rank 3. Higher ranks help plot a Lift to a Spark.',{driftSense:2,lightRadius:25}),
 'storm-keel':relic('Storm Keel',['risk','tempo'],'Throughout each flight.','Resist 40 percentage points of draft force. Fall 10% faster.','Draft resistance caps at 45%.',{windSensitivity:-.40,gravity:.10}),
 'eclipse-mirror':relic('Eclipse Mirror',['risk','dream'],'A natural fuel pickup clears a Dark Spark penalty.','Reveal the passage and restore up to 6 extra Sparks.','Three cleanses per flight. Dusk Sparks cannot trigger it.'),
 'relay-moth':relic('Relay Moth',['tempo','precision'],'Your companion completes two actions.','Restore up to 6 missing Sparks.','Three pairs per flight. Deliveries, deflections, dashes and levitations count.'),
 'undertow-pearl':relic('Undertow Pearl',['risk','sustain'],'Make a paid Lift while a Black Hole is draining you.','Restore up to 6 missing Sparks and reveal the passage.','Twice per flight, at least 5 seconds apart.'),
 'sunken-vault':relic('Sunken Vault',['sustain','risk'],'Overfill your Spark Meter.','Store 3 extra Sparks per 6 surplus, on top of your normal yield.','Total storage cannot exceed the surplus.',{condensationBonus:.5}),
 'pilgrims-clock':relic('Pilgrim’s Clock',['sustain','tempo'],'Fly for 15 seconds, then make a paid Lift.','Restore up to 6 missing Sparks.','Three times per flight. The 15-second clock restarts after each grant.'),
 'beacon-chain':relic('Beacon Chain',['dream','precision'],'Collect three natural fuel Sparks within 5 seconds.','Cast forward light for 5 seconds.','Three reveals per flight. Each reveal starts a fresh chain.'),
});
