# Wispbound

A portrait, one-handed pixel flight roguelite. The static game lives in `dist/` and uses a custom Canvas simulation and cached pixel renderer; there is no build step or framework dependency.

## Current game

An ascension spans three branching seven-stop maps and shares three lives, fuel, companions and artifacts. The third map converges at The Last Hearth for final preparation before the Hollow Warden survival trial. A boss clear unlocks the next of six supported ascension difficulties, drops a persistent artifact and unlocks Afterglow after the first boss.

The front page separates New Game, Continue and Tutorial, shows the next permanent companion unlock, and lets players select an unlocked Ascension. New Game starts a fresh three-map run; it does not reset permanent unlocks. Exit to Menu saves the run at its current checkpoint (an active flight restarts at its entrance). Abandon Run discards the run after confirmation. Tutorial uses a separate practice state.

Maps mix flights, elites, Rest sites, shrines and events. Branches stay separate and can miss a needed Rest. Route previews show future Rest access. Only committing to a Rest boon opens training and companion changes. Ordinary clears carry the actual remaining Glow; they do not automatically refill fuel.

## Controls and companions

Tap Lift to rise and spend Glow. Glide between taps. One Power button activates ready equipped active powers together; tapping again releases Leveler. MENU pauses the game. There are never more than two flight-action buttons.

All six companions are identical colored orb bodies. Collector (green) alone fetches missed pickups; Protector (blue) spends Glow and a charge to deflect a collision; Leveler (cyan) holds a bobbing altitude; Swift (amber) boosts with wind resistance; Seer (violet) reveals farther ahead; Kindler (rose) adds fuel to direct pickups. Progression-locked companions remain selectable inside a collapsed TEST section.

Start with one companion. Main-wisp Bond ranks cost 80 and 300 Embers. During the first run, slots two and three unlock after clearing Maps 1 and 2; returning players with the first boss cleared can buy them at any Rest. Companions can be changed at committed Rest preparation. Collector uses a lightweight circular area with base reach 105, faster fetch/return travel and five-second recovery. Its unfilled, softly vibrating boundary shrinks to a narrow radius on delivery and regrows during recovery. Missed packets within the current smaller radius remain eligible for rescue; empty trips do not reset recovery. Terrain deformation was reverted after user-reported stutter. Protector has a visible blue shell, recovery and a possible second layer. Leveler supports manual release, upgradeable steadiness and an optional dive on release or expiry, cancelled by Lift. Kindler can unlock dark-seed purification.

## Resources and progression

Glow is flight fuel. Its level is shown on the player orb: the bright center shrinks inward as grey-charcoal shading gathers at the edges, leaving a pale shell. Cached, dithered 2-pixel gradients soften the outline without adding per-frame pixel work. At zero Glow, Lift becomes unavailable but the wisp keeps falling and can still recover through body pickups or Collector deliveries. An unprotected collision ends the attempt after two seconds of disintegration. Three ascension lives are separate from fuel and shield charges.

Embers are run currency, secured after successful clears. Run-specific skill trees show the main wisp, equipped companions and the boss-unlocked reserve. Skills and spendable Embers reset on New Game, carry across all three maps and retries, and can only be purchased during a run at committed Rests or explicit encounter offers. Deeper nodes reveal after learning their prerequisites; artifact management stays hidden until the first boss or artifact ownership. Companions have mutually exclusive run paths with explicit trade-offs: Collector reach/recovery, Protector layer/recovery, Leveler steadiness/dive, Swift frequency/resistance, Seer duration/frequency, and Kindler fuel/purification. There is no separate stat-tuning budget, temporary card draft or player-facing score currency.

Nine boss artifacts have concrete passive effects. Equip three at safe preparation and trade unwanted relics at events or shelters. Boss drops prioritize unowned artifacts. Once all nine are owned, duplicates add up to 20 Stored Glow within reserve capacity. Seven physical pickup types remain: Light Mote, Glow Cache, Ember Cluster, Charge Spark, Sight Bloom, Dusk Pearl and Dark Seed. MENU → Pickups shows discovered kinds; first encounters can show short skippable guides.

TUTORIAL provides two short flights and a Rest, using an isolated practice wallet for upgrades. It highlights actual map symbols, controls, world objects and the new progression UI.

## Runtime and delivery

Run `npm start` for a local server. Hosting uses `.openai/hosting.json` and packages `dist/`. The prototype uses save key `emberwing.save.runskills.v6`; earlier prototype progress is not migrated.

Rendering reuses fog/light masks, orb sprites and terrain caches, applies fractional scrolling and nearby spatial windows, and avoids rebuilding HUD markup during flight. Physics uses bounded fixed steps with interpolated visuals.

The current pass includes deterministic economy simulations, exhaustive build comparisons, actual-engine flight probes and imperfect-pickup sensitivity models. Assumed reaction delays and pickup rates are not measurements of human players. A mobile menu review and focused lifecycle checks were completed; no measured device frame rate or proven-balance claim is made.

Lighting uses a cached, softened inverse-square reveal mask with a finite core, exposure mapping and a finite gameplay cutoff. Inner Glow upgrades the main light radius; Seer has separate range and duration upgrades. The shrinking light uses cached dithered pixels, and the game buffer is 240 pixels wide.

Normal long flights combine authored fuel-pocket approaches, broad rooms with actual local draft crossings, and roofed cave passages. Their order varies by terrain, location, map and difficulty. Preflight previews describe the planned patterns; runtime placement guards may omit a pattern if it does not fit. Caves give at least 1.5 seconds of warning before a gradual 15% sight-radius reduction (18% on elite routes), then restore visibility. Tutorial, first-flight basics and boss layouts remain separate.

## Latest playtest controls

TEST OVERRIDE on the front page or run menu unlocks the six Ascensions, three companion slots, all skill prerequisites and all artifacts for an explicitly marked test run. It grants 10,000 test Embers. Choose upgrades at any safe inactive checkpoint. Alternate companion branches can replace each other. Turning TEST off affects the next new run; a test run never awards permanent progression.

Map nodes now use five symbols: Flight, Elite, Rest, Encounter and Boss. Events and shrines share Encounter; ordinary map exits retain Flight.

The Power control contains icons and a rising fill without visible status text. Collector fill tracks its current radius; active companions use cooldown recovery. Reaching full charge emits one short pixel sparkle. Reduced-motion settings disable the burst.

Unprotected collision freezes travel and disintegrates the wisp over two seconds before the retry screen. Shield saves retain their deflection. Resume after any pause starts at 10% simulation speed and ramps to 100% over two real seconds, with a visible indicator and working controls.

Main-light exposure is 50% stronger, with softened inverse-square distance attenuation and a finite dark cutoff. Collidable terrain and props use clearer rims inside their real silhouettes. Seer illumination is centered farther forward to reduce overlap with upgraded main sight.

Human-imperfect exposure sensitivity informed provisional buffs: Leveler 2.4-second hold / 9-second cooldown; Swift 1.25-second burst / 7.5-second cooldown; Kindler +10 direct fuel, Rich Fuel +16 with 5% Lift penalty, Purify +8 ordinary fuel plus the existing Dark Seed conversion. These preserve each role's collection restrictions.

New runs start at75 Glow. Refuge and Cavern refills add6 and4 route Glow respectively, while the demanding gauntlet remains+1. Light Motes have a20-unit direct-contact radius. `npm run check:playtest` checks collision timing and resume behavior; balance scripts are available as `balance:builds`, `balance:economy` and `balance:flight`. The legacy `npm test` suite contains earlier prototype expectations and was not used to certify this release.

## Local performance batch (not yet deployed)

Cached scenery/terrain/prop art now rasterizes onCPU before being reused by the accelerated flight buffers. Background caching, bounded prewarming, local-space collisions, stable mobile viewport sizing and60Hz render pacing reduce repeated work. Inputs and physics keep their existing cadence.

Add `?perf=1` to the local game URL for a bounded foreground frame recorder. MENU → SAVE PERFORMANCE REPORT exports JSON locally, also after death or exit to the front page. It collects no remote telemetry. Recorded maxima/counters cover a flight; percentiles cover the most recent3600 samples. Intentional pauses are excluded from frame gaps. The normal game does not instantiate the recorder.

The matched Windows/Chrome benchmark eliminated gaps over50ms across16 diagnostic cases; this is not a physicalPixel10 or thermal test. See the separately delivered performance report and laboratory bundle. Publishing is held until the user's queue is cleared.

Main-wisp training now uses three named root gifts and mutually exclusive forks, with one free starting gift offered after New Game. Radiance reveals farther, Momentum increases travel speed, and Vitality lowers Lift effort. Further one-time nodes are bought with run Embers at Rests. The main-wisp list of repeatable stat ranks and legacy point-allocation modules have been removed. This skill-tree batch remains local until the queue is cleared.

Pickup rings now show disposition (pale boons; red danger/cost), with type-specific inner silhouettes and larger22–30-unit contact radii. Normal maps target30% extra fuel opportunities in broad swept-clear air; unsafe placements are omitted. Nine102-second clearance samples added4–7 accessible lights. Pickup sprites use a bounded CPU-raster atlas to keep the larger halos off the live per-pixel drawing path. These additions remain in the local queue.

Main light now reaches twice as far forward, tapering to the prior vertical/rear range. A soft scene-centred horizon band improves horizontal readability at all wisp heights. The lobe stays horizontal and uses a cached mask; darkness effects and sight skills still apply. This change is staged locally with the queue.

Empty Glow now removes Lift rather than ending the attempt: the wisp keeps falling and Collector can still deliver a rescue. Fuel pickups restore Lift immediately. Flight map stops use the shared wisp-between-cliffs icon instead of the paper plane. Held locally with the queue.

Latest queue supersedes the earlier life-service proposal: Rest heart recovery fills every available heart, with no per-heart Ember purchase. Ember-funded run skills increase the cap to 4 and 5. Rest Glow is shown as percentages. A dedicated Skill Tree map button opens connected main/companion paths; companion Sparks add incremental improvements before ability forks. Verified full-heart recovery and a learned Collector Spark in the local interface. This combined batch remains undeployed.

## Reproducible balance checks

- `npm run balance:economy`: 11,664 campaign cases by default, using actual generated pickup inventories and model transactions. Pickup contact and failure probabilities are explicitly assigned stress scenarios, not human win rates. Reports are written under `work/`.
- `npm run balance:flight`: 648 real-engine attempts at 60 Hz with 150/250 ms delayed controllers, across all six companions, three terrains, tiers 1/3/6 and early/mid passages. These controllers are deliberately imperfect and do not model human perception.
- `npm run balance:builds`: 627,250 legal modifier configurations, all 0–3 artifact sets, actual Collector recovery streams, and progression/reward integrity.

Current prices: starting gift free; Sparks 20, Deep Sparks 35, utilities/main roots 40. Continuous style upgrades now cost 20/25/30 across three steps (75 total); deep specialisations cost 35/40/45 (120 total). Discrete mechanic unlocks remain single purchases. Ordinary clears pay 32–40 Embers, elites add 12, optional challenges pay 16, and Ember Clusters pay 8. Full heart recovery still competes with Glow or Embers at each Rest; maximum-heart skills cost 100/180.

`balance-health.mjs --source=PATH --out=PATH --seeds=N` supports paired source snapshots. `balance-flight.mjs` defaults to current source; select `--source=PATH` for a historical snapshot. The older standalone `balance-economy.mjs` and `balance-builds.mjs` are historical experiments and are no longer the package entrypoints.

## Incremental branching trees

Main-wisp and companion trees use compact connected buds with 44px touch targets and one fixed detail/purchase panel. Main-wisp branches are Light, Motion, Glow and Bonds. Only equipped companion trees are shown. Selecting a node keeps the scroll position.

51 continuous upgrade tracks now have three separate purchases, adding 102 intermediate nodes without increasing full-path prices. Every step changes the actual modifiers immediately; exclusive forks still apply. Glowkeeping replaces Rising Light with three 2-percentage-point reductions to Lift Glow use. Kindling adds 1.33 Glow per step, reaching +4 at completion. Deeper forks further specialise conservation, flight control or collection.

`npm run check:skill-growth` checks prerequisites, exclusivity, partial effects, full-path costs and real purchase/TEST replacement flows. The 390×844 browser purchase flow was also checked. The preceding large balance report predates these partial purchases; unchanged endpoint prices do not by themselves prove equal campaign balance.

## Hold-to-levitate and companion motion

With Leveler equipped, tap the flight area or Lift normally; keep holding for 180 ms to levitate, then release to glide. Charge is spent only while levitating and recharges while released. The Power control remains for Swift/Seer. Existing Leveler duration, recharge, steadiness and dive skills apply. A cyan meter beneath the main wisp shows remaining charge.

The main wisp and collision radius are 15% smaller. Companion paths and activity effects are distinct, including progressive Protector shield welding. Flight map icons use an orb and forward arrow. `node scripts/companion-hold-probe.mjs` checks held-input semantics and `node scripts/companion-render-probe.mjs` exercises all companion draw paths. Browser visual review was unavailable for this batch.
