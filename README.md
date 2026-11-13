# Wispbound

A portrait, one-handed pixel flight roguelite. The static game lives in `dist/` and uses a custom Canvas simulation and cached pixel renderer; there is no build step or framework dependency.

## Current game

An ascension spans three branching seven-stop maps and shares three lives, fuel, companions and artifacts. The third map ends with the Hollow Warden survival trial. A boss clear unlocks the next ascension difficulty, drops a persistent artifact and unlocks Afterglow after the first boss.

The front page separates New Game, Continue and Tutorial, shows the next permanent companion unlock, and lets players select an unlocked Ascension. New Game starts a fresh three-map run; it does not reset permanent unlocks. Exit to Menu saves the run at its current checkpoint (an active flight restarts at its entrance). Abandon Run discards the run after confirmation. Tutorial uses a separate practice state.

Maps mix flights, elites, Rest sites, shrines and events. Branches stay separate and can miss a needed Rest. Route previews show future Rest access. Only committing to a Rest boon opens training and companion changes. Ordinary clears carry the actual remaining Glow; they do not automatically refill fuel.

## Controls and companions

Tap Lift to rise and spend Glow. Glide between taps. One Power button activates ready equipped active powers together; tapping again releases Leveler. MENU pauses the game. There are never more than two flight-action buttons.

All six companions are identical colored orb bodies. Collector (green) alone fetches missed pickups; Protector (blue) spends Glow and a charge to deflect a collision; Leveler (cyan) holds a bobbing altitude; Swift (amber) boosts with wind resistance; Seer (violet) reveals farther ahead; Kindler (rose) adds fuel to direct pickups. Progression-locked companions remain selectable inside a collapsed TEST section.

Start with one companion. After the first boss, main-wisp Bond ranks cost 80 and 300 Embers and unlock slots two and three. Companions can be changed at committed Rest preparation. Collector uses a lightweight circular area with base reach 140, faster fetch/return travel and five-second recovery. Its unfilled, softly vibrating boundary shrinks to a narrow radius on delivery and regrows during recovery. Missed packets within the current smaller radius remain eligible for rescue; empty trips do not reset recovery. Terrain deformation was reverted after user-reported stutter. Protector has a visible blue shell, recovery and a possible second layer. Leveler supports manual release, upgradeable steadiness and an optional dive on release or expiry, cancelled by Lift. Kindler can unlock dark-seed purification.

## Resources and progression

Glow is flight fuel. Its level is shown on the player orb: the bright center shrinks inward as grey-charcoal shading gathers at the edges, leaving a pale shell. Cached, dithered 2-pixel gradients soften the outline without adding per-frame pixel work. Zero Glow produces final sparks and ends the attempt. Three ascension lives are separate from fuel and shield charges.

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
