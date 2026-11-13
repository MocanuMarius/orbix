# Wispbound design decisions

Updated 13 November 2026. Wispbound is the working title. This log records the confirmed direction and subsequent implementation choices. All ten recommended alignment choices were accepted in chat.

## Confirmed direction

- Simplify the graphics and theme while keeping the branching expedition map and three active card slots.
- Use original pixel sprites and scenery with the bleak, weathered mood of Salt and Sanctuary: stone, roots, mist, subdued earth colours and small lights.
- Play as a neutral white wisp. Carrier roles have distinct colours: Swift amber, Anchor cyan and Gravity violet. Fire/Ice themes remain removed; range, recovery and collection upgrades are independent.
- Keep one-handed portrait play with two right-side controls: Lift and the selected companion ability. Carrier collection and card effects act automatically.
- Direct contact always collects map sparks; the carrier is assistance. Its base cooldown is 5.5 seconds after delivery, before recovery upgrades.
- Give the player wisp an upgradeable light radius that reveals more terrain and pickups.
- Keep the game interface compact. Graphics, icons, numbers and card effects carry the information; remove repeated instructions and narrative paragraphs.
- Keep Glow as fuel for lift pulses, with sparks restoring it. Gliding remains free. Use three lives for the whole ascension, with fatal collisions and same-level retries; health points are removed.
- Prioritise the feature backlog. The latest instruction defers all checks, tests, simulations and balance work until the backlog is clear. Earlier verification remains historical evidence; do not add evaluation passes during feature work.
- The user has started live feedback: publish completed feedback batches while deferring checks and tests, avoiding deployments for every minor edit. Preserve the existing Site and audience.

## Ten confirmed decisions

The ten recommended options were accepted, with later feedback superseding the elemental appearance choices. Companion glow is selected before a run and remains fixed for that run.

| # | Decision | Current build | Rationale | Status |
| --- | --- | --- | --- | --- |
| 1 | Wisp identity | The player and companion are neutral lights. Fire/Ice is removed. | Keep the simplified theme consistent. | Updated by explicit user choice |
| 2 | Companion appearance | Fixed role colours distinguish amber Swift, cyan Anchor and violet Gravity, with matching distinct bodies. | Identify each tool at a glance. | Supersedes the optional shared tint selector |
| 3 | Visibility beyond the light | Distant landscape is nearly black with very faint silhouettes. Nearby detail becomes clearer inside the light. | Make the upgradeable light radius more meaningful. | Confirmed; darkened further by latest feedback |
| 4 | Light versus fuel | Spending Glow dims the sprite, not the upgrade-based reveal radius. Dark packets can temporarily reduce that radius. | Keep fuel and a deliberate visibility hazard separate. | Updated by dark-packet mechanic |
| 5 | Light progression | Inner Glow is a permanent utility skill with three ranks: radius 175, 210, 245 and 280. | Give light an explicit progression path independent of collection range. | Confirmed |
| 6 | Carrier recovery | Base rest is 5.5 seconds after delivery. Recovery upgrades can shorten it. | Leave meaningful windows for direct collection. | Confirmed |
| 7 | Carrier target selection | Give direct collection the full approach. Fetch the nearest beneficial packet only after it passes behind the 16-unit direct-contact window and while it remains within carrier range. Ignore dark packets. | Assist missed pickups without taking over the player's approach. | Updated by direct-pickup priority feedback |
| 8 | Expedition length | Seven stops with five flight stages, now targeting roughly 10–14 minutes including checkpoint choices. Normal flights are three times their former distance. | Longer uninterrupted flight with the same branching build decisions. | Updated by longer-level request |
| 9 | Main difficulty | Deliberate lift timing to collect scarce fuel inside rock passages, supported by Boost, the carrier and route/build choices. Direct pickup radius is 16. | Precision and fuel planning should both matter. | Confirmed; updated by difficulty feedback |
| 10 | Permanent progression | Utility and modest bonuses: light, carrier reach/recovery, Boost and Afterglow. No extra lives or in-place rebirth. | Support progress without changing the three-life rule. | Updated by latest life-system decision |

## Kept intact

Three terrains, ordinary and optional elite routes, support events, three ascension-wide lives, automatic card synergies, checkpoint rewards and browser-local progress remain in the design. The map and three-card build system were explicitly retained. Boost provides speed and wind resistance rather than terrain immunity.

## Current implementation notes

- Fire/Ice choices are removed. Both wisps are neutral lights; companion tint is cosmetic and old saves migrate without losing progress.
- Carrier search range and player light radius are separate statistics.
- The active renderer now uses a 260-pixel Canvas scene, raised modestly from 195, with nearest-neighbour scaling and finer original sprites. The game no longer loads the previous 3D renderer or photographic assets.
- Existing saves keep the same storage key. Display names can change without changing saved card identifiers.
- The earlier pixel graphics and compact UI iteration was deployed first. The user has now requested a batch release of the subsequent lives, tuning, locations, draft puffs, packets, rewards, companions and longer-level changes. Deployment confirmation is recorded separately in chat; no new simulation sweep is claimed.

## Precision and fuel difficulty

- Remove the free approach spark and centreline pickup strings. Keep one pickup per authored terrain pocket, with roughly 38% fewer placements than the prior generator budget.
- Carve pockets into the actual collidable terrain. Keep a gentler first shelf, and share an edge across close cache pairs to avoid abrupt roof-to-floor reversals.
- Start expeditions at 60 Glow. Normal caches restore 24 plus the route bonus; rich caches restore 40 plus the route bonus. Successful checkpoints restore a minimum of 60, preserving any higher earned reserve.
- Preserve gravity, lift strength, travel speed, the 5.5-second carrier rest and free Boost. Boost no longer protects against terrain. Increase difficulty through placement, precision and resource availability instead of faster tapping.
- Reduce Warm Heart's trigger to four base pickups and collection challenge targets to match the sparse pool.
- Simulations compare centre-lane, pickup-seeking and Boost-assisted controllers, including zero permanent upgrades. They guide tuning; they do not establish human success rates or prove that every seed requires every tool.

## Wisp silhouette and companion motion

- The earlier enlarged silhouette is superseded by a true circular main wisp with its core radius reduced from 16 to 13 scene pixels (about 19% smaller). Use circular shading layers and a smaller glow envelope. Keep collision and direct-contact pickup radii unchanged, with no directional tail or continuous particle trail.
- The carrier orbits the player on a 44 by 34 unit ellipse over 2.5 seconds while ready or cooling, clearing the larger player sprite. Fetching interrupts the orbit; returning rejoins it. Reduced Motion freezes the orbital phase.
- Centre the carrier's real search range on the player and draw that range as a persistent dotted circle. Range upgrades and temporary expansions use the same value as collection logic. Dim the circle and companion through cooldown.
- Reserve the full approach and direct-contact window for the player. Only launch a fetch once a missed beneficial packet is more than 16 units behind the player's horizontal centre and still within the carrier's true radius. This uses forward passage rather than guessing the player's next Lift. Preserve radius upgrades behind the player and the existing 5.5-second rest after delivery.
- Darken the landscape outside the light substantially and subdue the distant parallax layers. Keep the existing player light-radius upgrades.

## Localized draft puffs

- Retire the frequent, violent screen-wide gust cycle. Use occasional world-anchored puffs that gather, push briefly and fade once per passage.
- Bound each puff horizontally and vertically, using a soft elliptical falloff. It applies no force outside that footprint; the player can fly above or below it.
- Place sparse puffs in broad recovery spaces, with clear opening/exit approaches, rather than inside precision chokes. Avoid overlapping zones and repeated short-interval activation.
- Use gentler base forces of 65/85/105 by terrain with a final 140 cap. Gather for about 0.9 seconds, push for about 0.9 seconds and fade over about 0.3 seconds. These are feature defaults, not a completed balance pass.
- Preserve Boost's 72% local draft resistance and Steady Light's 55% resistance. Draft Feeder recharges Boost only while the player is actually inside an active puff. Card IDs and progression stay compatible.
- Draw small localized curls, wisps and direction cues matching each puff's footprint. Keep the far landscape dark, honour reduced motion, and remove the full-screen wind overlay.
- The first tutorial flight stays calm; its draft lesson introduces one gentle puff. Keep lives, terrain, fuel and tuning systems unchanged.

## Clear powers and finer pixel detail

- Keep pixel art, but raise the scene width from 195 to 260 logical pixels. Use finer original player, companion and cache details while preserving the large wisp and world-space light/collection radii.
- Call the draft choices powers. Explain their trigger, benefit and tradeoff in short lines, and state that they act automatically for the expedition.
- Make equipped powers tappable for optional checkpoint inspection, with one Close action. Inspection never selects or replaces a power and adds no flight controls.
- Give fuel a small round light-packet identity. Label pickup feedback with the actual Glow restored, or FULL; distinguish fuel and Boost reductions explicitly.
- Finish feature chunks locally. Batch publication after the backlog is ready, at the user's request. Defer additional simulation and balance passes until the backlog is addressed.

## Afterglow carryover

- Add an Afterglow reserve shared across flights and preserved between expeditions. A live expedition owns its reserve until it ends; settling it updates the saved bank once.
- After successful flights, unused Glow above 60 can be stored at 80% efficiency, up to a base bank capacity of 40. The transferred Glow is removed from flight fuel; energy is not counted twice. At a full bank, the untransferred Glow remains available normally.
- At a flight briefing, choose whether to draw up to 20 Afterglow into Glow. Allow one draw per flight, including when backing out to choose another route. Other checkpoints display the bank without spending it.
- Failed or abandoned normal expeditions lose 25% of the reserve. Successful expeditions preserve it. The bank cannot go negative.
- Add permanent upgrades for capacity (+15 per rank, three ranks), retention (+10 percentage points per rank, two ranks) and failure-loss protection (−10 percentage points per rank, two ranks).
- Make stored amounts, capacity, efficiency and loss visible through compact checkpoint feedback and optional details. Keep Lift and Boost as the only flight controls.

## Progressive learning

- Add a short three-stop teaching expedition: a 22-second flight, a support checkpoint, and a 26-second wind flight. Introduce Lift, gliding, Glow, the companion and Boost in context.
- Use practice Glow and a 20-point practice Afterglow bank; teaching runs cannot farm real embers, scores, reserve or flight-clear progress. A power learned in a completed tutorial remains available. Offer replay and skip without replacing an active normal expedition.
- Start new players with four straightforward powers. Introduce companion powers after two normal flight clears, wind powers after four, reward powers after six, and higher-risk powers after eight. Preserve powers and offers in existing experienced saves.
- Show one short contextual lesson at a time. Start the first lesson when Lift is pressed, avoiding damage while reading the first hint. Keep practice terrain forgiving and normal flight tuning unchanged.
- Build these systems now; defer simulation sweeps and balance fine-tuning until the feature backlog is addressed. Keep subsequent changes local until the user requests a batched release.

## Fatal attempts and ascension lives

- Start every ascension with three total lives. Each terrain or boundary collision ends that attempt immediately; successful levels do not refill lives. After the third death, the ascension ends.
- Retry the same level from its beginning, with the same terrain seed, equipped powers and entry Glow. Discard that failed attempt's score, embers, pickup progress and carryover deposits. Keep completed levels and ascension progress.
- Keep the Afterglow draw tied to the level across retries. A death does not create another draw opportunity. Apply the reserve's expedition-loss penalty only when the ascension is actually lost or abandoned.
- Persist attempt entry before flight. An already-recorded death does not consume another life on reload. A browser interruption alone restores the entry checkpoint without charging a death; explicitly ending an attempt does consume a life. Pausing continues to preserve the live attempt.
- Remove HP, healing, shields, collision protection and in-place rebirth. Boost still changes travel and wind resistance; Shatter Wake can destroy designated soft thorns but ordinary terrain stays fatal.
- Rework old power IDs for save compatibility: Ash Reserve adds pickup Glow with slower Boost; Warm Core restores Glow after four base pickups; Restless Light grants more embers with stronger wind forces. Remove and refund old Rebirth upgrades rather than adding extra lives.
- Keep these changes local. No new simulations, broad test passes or deployments for this feature chunk.

## Rest-site tuning and Boost visibility

- Add four tunable axes: speed, Lift rise, collector radius and Boost. Each accepts at most three points.
- Start each normal ascension with three points in a balanced setup. The two rest checkpoints each add two points, yielding a 3 → 5 → 7 budget. Record grants by rest row so repeated visits and route changes cannot duplicate them.
- Allow free reallocation during initial preparation and at a rest checkpoint, remaining open while preparing the next flight. Lock it when that flight begins and preserve it across retries.
- Use modest per-point bonuses: speed +3%, calm-air Lift rise +6%, collector radius +12%, Boost duration +5% and recharge time −4%. Retain combined modifier limits. These are implementation defaults, not a completed balance pass.
- Introduce three practice tuning points at the tutorial rest site, after the first movement/fuel lesson. Practice points do not affect the real profile.
- Show the budget, spent/free points, maximum ranks and effective combined statistics in a compact optional tuning sheet. Keep allocation controls out of flight.
- Enlarge and brighten Boost, keep BOOST visible while it recharges, add separate ready/burst/countdown feedback and a charge ring, and preserve hold-to-pause and reduced-motion support.
- Keep all feature work local; defer simulations, broad testing, numerical fine-tuning and publication until requested.

## Distinct locations and authored hard spots

- Give each terrain three location identities: Broken Aqueduct / Sunken Belfry / Ossuary Vault; Hollow Elder / Thorn Fen / Hanging Grove; Knife Ridge / Moonfall Chasm / Glass Caverns.
- Share one deterministic location identity across the route node, preview, course and scenery. Rotate location identities across the expedition; keep a retry on the same seed and identity.
- Replace the shared repeating corridor rhythm with authored occupancy, width, spacing and height-flow motifs. Use deliberate challenge windows with low underpasses, paced climbs, root bends, hanging dips, razor saddles, chasm crossings and crystal squeezes.
- Separate challenge windows with room to prepare and recover; preserve clear opening/exit approaches, sparse terrain-attached collection and the three-life fatal-collision rules. Keep localized draft puffs outside the tightest passages.
- Use distinct clipped terrain materials and parallax compositions. Solid-looking details stay aligned with real colliders; distant landscape remains dark.
- Show distinct map landmark art, location names and a short signature challenge preview. Keep normal flight free of additional menus or controls.
- Keep the feature local and defer simulation, broad testing and final difficulty tuning until the backlog is ready.

## Light packets and neutral companions

- Replace diamonds and shard crests with small round light packets; richer packets use a brighter halo. Preserve sparse terrain-pocket placement and fuel values.
- On direct collection or carrier delivery, animate an accelerating orbit and collapse into the main wisp over roughly 0.8 seconds. Reward immediately, once; the absorption is cosmetic. Keep reduced-motion support and no persistent player trail.
- Add optional dark packets after the full beneficial-fuel budget: none in the tutorial or first normal flight, at most one in later ordinary flights and two in elite/finale flights. Keep them away from good caches and forced chokes.
- Dark packets use a black core and shadow halo. Body contact dims the upgrade-based light radius by 20% per stack, capped at two stacks and a 60% minimum radius. Recover over eight seconds; a natural beneficial packet clears one stack. These are feature defaults pending the deferred balance pass.
- Dark packets grant no fuel, score, currency or power triggers. They do not remove lives or Afterglow. The companion ignores them throughout targeting, fetching and delivery.
- Remove Fire/Ice entirely. Use a neutral main wisp and neutral companion with cosmetic Pearl, Amber or Lilac glow, fixed during the expedition. Preserve carrier range, recovery, tuning and saved progression.
- Further companion abilities and terrain interactions await the user's upcoming ideas. Do not introduce elemental roles through this visual pass.
- Keep the changes local; defer broad tests, simulation and deployment as requested.

## Themed passage endings and screen bounds

- Replace the circular stargate with a weathered refuge waylight: a hanging lantern, sheltered by stone or roots appropriate to the terrain. Use quiet neutral light rather than rotating rings or orbital marks.
- Anchor the landmark to the level's exit distance and a fixed height; it no longer follows the player's vertical movement. It marks completion, without adding a new collider or requiring contact with the lantern.
- The earlier published version still bounces at the top and bottom. The local fatal-attempt implementation treats both bounds as collisions and ends the attempt, consistently with terrain. These local changes have not been deployed.
- A visible layered shell has been proposed as a replacement for immediate fatal hits. Its layer count and refill rule await the user's choice; no shield is enabled by this exit change.

## Rewards at each level and a readable climb

- Secure earned embers in the permanent wallet immediately after a successful level. Do not require death or expedition completion to receive them. Failed attempts award nothing new and cannot remove rewards from previously cleared levels.
- Use base clear rewards of 20 / 24 / 28 / 32 / 36 across the five flight stages, plus 12 for an optional elite, before applying the later passage-length multiplier. Add pickup earnings, the optional challenge bonus, and one ember per 100 score with a base cap of eight. Extended passages multiply fixed rewards and that cap by three. These are initial feature values, not a finished balance pass.
- Keep the existing power choice after each nonfinal flight. Show a compact clear celebration, the total saved, its breakdown and the permanent wallet. Scores now contribute a bounded clear bonus instead of serving only as an end-of-run statistic.
- Settle card-skip and support rewards at their checkpoint too. Support costs and permanent upgrades spend the same saved wallet; do not duplicate a secured purse or pay the same reward again when loading or ending a run.
- Allow permanent upgrades at safe checkpoints, applying to the next new flight and persisting after death. Lock purchases during practice or an unfinished/retried level so a retry keeps its original build. Separate the upgrade screen's name from the climb's difficulty labels.
- Keep the existing 3 → 5 → 7 tuning budget, with two points at each rest site and redistribution there. Make the upcoming rest milestone visible after clearing a level.
- Show five numbered flight stages within the seven-stop expedition. Support stops do not count as extra flight stages. Later stages tighten authored hard passages by 0 / 3 / 6 / 9 / 12 percent after their original gap bounds, respecting the existing 120-unit ordinary and 104-unit elite minimums. Keep broad approaches and recovery spaces unchanged.
- Increase requested authored challenge windows from one early to two mid-climb and three late, only where they fit. Keep movement, Lift costs, the beneficial packet budget and localized draft rules unchanged. A new-game-plus difficulty ladder is not introduced by this pass.
- Preserve old saves and prevent duplicate settlement on reload, repeated actions, failed retries and end-of-expedition banking. Keep this feature local and defer simulations, broad testing and deployment as requested.

## Companions define the active tool

- Keep Lift fixed and let the chosen neutral companion define the second button. Select before the expedition and allow changes during rest preparation. Each flight and its retries keep their entry companion. Glow colours remain cosmetic and distinct from roles.
- Swift provides BOOST: 0.9 seconds of existing faster travel and local draft resistance, with a nine-second base recharge.
- Anchor provides LEVEL: a 1.8-second level glide with an eleven-second recharge. Arrest vertical drift and cancel gravity, while local drafts can still nudge. Pressing Lift cancels the hold immediately; restore gravity smoothly after release.
- Scout provides REVEAL: expand the upgraded light radius by up to 45% for three seconds, with a twelve-second recharge and smooth entry/exit. Apply dark-packet dimming after the reveal expansion.
- Retain the 175-unit starting light radius for now. Reducing it would also reduce warning time in the increasingly tight authored passages. Revisit this during the deferred playtest rather than making Reveal necessary for basic readability.
- Every companion retains the same fallback collection, dotted range, 5.5-second carrier rest and range/recovery upgrades. Active-ability recharge and carrier recovery are separate statistics.
- Generalize active-card triggers and ability upgrades: Hungry Wisp expands fetch range during any active tool, Golden Wake boosts pickup score during any active tool, recharge powers reduce the selected tool's cooldown, and Shatter Wake can burn designated soft thorns while any tool is active. Preserve legacy identifiers and modifier fields for saves.
- Keep exactly two flight buttons. Make the active tool more prominent with an explicit action name, recognizable icon, ready feedback, active duration and recharge countdown. Hold-to-pause must work even while cooling. Use brief role-specific visual cues without giving the main wisp a persistent trail or implying a shield.
- Preserve old saves by defaulting missing roles to Swift. Keep tutorial descriptions consistent with the selected tool. Keep work local and defer simulations, broad testing and deployment.

## Three-times-longer normal passages

- Triple normal passage distance and nominal duration, preserving speed and controls. Extend route-dependent durations from 27–48 to 81–144 seconds and the finale from 55 to 165 seconds. Keep the 22/26-second teaching flights short.
- Raise the engine duration ceiling so the finale receives the full extension. Share length constants and time formatting between map generation, saves, the engine and briefings.
- Spread authored challenge/recovery phrases across three paced legs rather than adding only a long recovery tail. Preserve existing passage-width difficulty, clear approaches, collision polygons and deterministic route generation.
- Extend sparse terrain-pocket fuel, rich cache cadence, optional dark niches and localized draft encounters across the full distance. Preserve individual fuel values, Lift costs, movement, ability timing and puff forces. Keep optional hazards outside forced chokes.
- Scale clear and optional challenge bonuses by three for extended passages: guaranteed stage rewards 60 / 72 / 84 / 96 / 108, plus 36 for an elite; optional challenge bonus 24. Keep score conversion at one ember per 100 score and raise the extended-level cap from eight to 24. Collection and ability-use challenge counts scale by three; ability-use challenges become six uses.
- Retain one power choice after each nonfinal level and the existing rest-point grants. Do not interrupt the longer flights with new reward menus. Existing once-per-flight powers retain their rules pending the deferred balance pass.
- Migrate unplayed saved routes once. Preserve completed levels and the current active, interrupted or failed attempt's previous duration and reward scale. Extend future routes; preserve the tutorial. Do not multiply durations again on repeated loads.
- Approximate expedition target is now 10–14 minutes depending on route and build, replacing the earlier four-to-six-minute goal. Keep this feature local; no simulations, broad testing or deployment for this chunk.

## Batch release requested

On 13 November 2026, the user requested deployment of the current backlog build for hands-on feedback. Publish the accumulated changes together to the existing Site, preserving its current audience and saved progress. Keep the three-life fatal-collision rule; the proposed shield still awaits a choice. Existing started retries retain their original length; starting a new ascension exposes the complete new companion and extended-level setup. Keep simulations and broad testing deferred. The user has now started live feedback; publish completed feedback batches while avoiding deployment for each minor source edit.

## Distinct companions and rest-site switching

- Give each companion a distinct pixel body: Swift is a winged crescent, Anchor a squat bell, and Scout a tall lantern with antennae and an eye. Use the same original sprite data for flight and menu previews. Keep neutral light shading, independent cosmetic tints and the circular main wisp.
- Add a compact three-choice companion selector at support/rest checkpoints. Picking a companion is free and does not consume the separate recovery, power or event choice.
- Reuse the existing rest preparation window: after reaching a rest stop, the companion can change through the following power draft, map and briefing, until the next flight begins. Initial home selection still sets the starting companion; home changes during a live run set the next run's preference.
- Switching changes only the run's companion role. Preserve cards, tuning, currency, fuel, reserve, lives and statistics. Retain the common fallback collection rules and separate carrier cooldown.
- Keep roles locked during flight, retry and interrupted-attempt recovery. Snapshot the entry companion along with the rest of the attempt's build, preserving older saves without a role snapshot.
- Keep exactly two flight controls and the existing ability mechanics. Publish this feedback update to the existing Site after syntax checks, preserving its audience. Simulations and broad playtesting remain deferred.

## Top menu wheel and accessible Tutorial

- Move tuning access into a top gear marked MENU, including the live flight HUD. Remove repeated tuning controls from the regular map, rest and briefing layouts. Highlight editable unspent points on the gear.
- Open a compact game wheel with Tune, Companion, Upgrades and Tutorial, plus sound and a central Back/Resume action. Opening it during flight pauses the engine; opening another overlay must not resume flight underneath. The two flight actions remain Lift and the companion tool.
- Allow viewing tuning from the paused wheel while keeping its normal setup/rest edit restrictions. Keep companion and upgrade changes locked during active attempts and retries. Hold-to-pause uses the same wheel.
- Replace the tiny, conditionally hidden Learn shortcut with a visible Tutorial button at home, available even with an active ascension, and Tutorial access in MENU.
- Practice safely suspends the existing normal ascension. Preserve its checkpoint, fuel, cards, companion, tuning, currency, reserve and lives; a live attempt returns to its entry checkpoint without charging a life. Persist the suspended run with the practice save so reloads retain it.
- Finishing or leaving practice can resume the suspended ascension. Keep practice earnings and reserve isolated from real progress, retaining only the existing taught-power unlock on successful completion. Do not create nested suspended practices or end the normal ascension to open Tutorial.
- Add one short next-action cue per checkpoint instead of more explanatory paragraphs. Distinguish route selection, starting powers, reaching the waylight, resting and saved level rewards. Keep gameplay/balance unchanged and publish this feedback batch after source checks; no simulations or broad playtesting.

## Gravity replaces Reveal; distinct role colours

- Replace Scout's active Reveal with the Gravity companion and GRAVITY button. Reuse the three-second active period and twelve-second recharge. Migrate old Scout role IDs, including suspended ascensions and attempt snapshots, to Gravity; preserve cards, upgrades, fuel, lives and progression.
- Apply a gentle inverse-square attraction to nearby beneficial light packets. Use a 120-unit starting field, scaled by collection reach up to 220 units. The pull weakens to one quarter at twice the distance outside the softened/capped centre.
- Soften the force below 24 units, cap acceleration, damp packet velocity and keep a low speed limit. Preserve direct pickup timing; the field moves packets rather than collecting or paying for them. Do not pull dark, collected, carried or reserved packets, and block movement through real terrain colliders.
- Keep the normal fallback carrier and its recovery separate. Gravity does not change player falling, local drafts or terrain collisions. Base sight stays 175 with Inner Glow upgrades; active Reveal expansion is removed.
- Reuse existing tuning: Collector adds 12% reach and 8% Gravity strength per point; Ability adjusts active duration and recharge. Add Gravitic Bond, three permanent ranks at base cost 80, with 15% stronger Gravity pull per rank. Bound combined strength and radius. These are initial values, not a completed balance pass.
- Make role colours explicit and consistent: amber Swift, cyan Anchor and violet Gravity. Replace the Scout lantern with a distinct violet spiral body. Keep the main wisp white, remove the optional shared tint selector, and ignore its legacy saved fields without erasing unrelated progress.
- Update Home, rest selection, previews, active button, tutorial and restrained pull visuals. Preserve the top MENU, practice suspension, rest-site switching, long levels and checkpoint reward ledger. Publish this feedback batch after syntax checks; defer simulations and broad testing.

## Readable map and a quiet reserve

- Distinguish six map stop categories with explicit labels: Flight, Elite, Rest, Shrine, Event and Finale. Keep existing biome/location art for flights, distinct support symbols, and the real event names. Do not rely on unexplained decorative symbols alone.
- Keep the same six event scenarios and their order: Ash Spring, Cinder Bargain, Abandoned Lantern, Weathered Shrine, Luminous Well and The Ember Archive. Rest camps and power shrines remain separate support types. Use shared metadata for map labels and an optional MAP KEY, without changing seeds, routes, rewards or event choices.
- Show the next stop out of seven on the normal map, counting the two support stops as well as five flights. Use START/YOU markers, upward route cues, readable labels and bright reachable paths. MAP KEY explains categories and lists the six scenario variants only when opened.
- Hide empty and non-actionable reserve panels on Home, map, power drafts, support and results. Show a Stored Glow control in the briefing only when a positive reserve can actually be drawn for that flight. A used draw or full fuel meter does not leave a disabled empty panel behind.
- Show a positive reserve balance in MENU, with details available on demand. Use the plain label Stored Glow and a vessel symbol; retain Afterglow as the underlying mechanic. A new deposit gets one nonzero clear cue; only an actual reserve loss appears in the end recap.
- Make support rewards name their resource: Glow, Embers, Stored Glow or New Power. Keep capacity, retention and loss explanations in optional reserve details and permanent upgrades.
- Preserve all carryover calculations, tutorial isolation, lives, rewards, upgrades and flight controls. Publish the clarity update without additional checks, tests, simulations or balance work, as requested.

## Collector-field proposal awaiting implementation

The user proposed replacing the dotted collector circle with a glowing field that deforms against terrain, redistributes its charged area into connected open space, collapses into the main wisp on delivery and visibly regrows. Feedback recommended bounded stretching in narrow passages, Reach/Regrowth tuning at rest, and using the same field for Gravity. This remains a proposed follow-up; the living-scenery batch below does not implement it or change the existing collector recovery rules.

## Vegetation, structures and living scenery

- Add scene-specific foreground vegetation and objects as genuine obstacles: canopy trees, roots and branches; overgrown ruin cottages and walls; wind-shaped pines, shelters and old mine timbers in the peaks/caves.
- Reuse selected authored obstacle sites. Lower the supporting bank within its already-occupied side, then grow a tree or structure from it toward the original passage boundary. Keep the authored central gap, route lengths, opening/exit approaches and protected fuel pockets. Preserve soft-thorn behaviour.
- Use the same opaque prop polygons for drawing, player collisions and Gravity's packet obstruction. Keep all geometry within its parent obstacle footprint and share parent motion, so visible branches and rooftops match their collision shapes. Local draft footprints avoid prop bounds and their sway.
- Houses stand on ground. Ceiling structures are hanging roots, branches or supported timber. Use scene-appropriate silhouettes and materials rather than decorating every rock with the same object.
- Draw props beneath the existing light/fog reveal. Keep distant settlements and vegetation dark and visibly subordinate. Add only a few muted drifting leaves or seeds, without bright dots that resemble fuel pickups; honour reduced motion.
- Update location signature copy and map landmark hints while keeping location IDs, terrain, map routes and rewards intact. Keep the main wisp, companions, abilities, UI, progression and resource rules unchanged.
- Publish this feature batch for feedback. Per the latest user instruction, skip checks, tests, simulations and balance work until the backlog is clear.

## Passive Gravity and stronger base attraction

- Gravity is always-on while equipped and flying. Remove the activation requirement, active duration and cooldown. Swift and Anchor keep their active tools. Gravity's dock slot becomes a noninteractive PASSIVE indicator; MENU remains available to pause.
- Increase the requested baseline attraction by 50%: force constant 18,000 → 27,000 and near-field acceleration cap 24 → 36; raise packet speed cap 18 → 24. Keep radius, inverse-square falloff, softening, drag, terrain obstruction and dark-packet exclusions intact. This is a requested feature adjustment, with no balance evaluation.
- Keep upgrades useful: Gravity's Ability tuning becomes Recovery, with 5% pull strength and 4% shorter collector rest per point. Map duration modifiers into field strength and recharge modifiers into collector recovery. Collector and Gravitic Bond bonuses remain, with combined strength bounded.
- Treat passive Gravity as working automatically for Hungry Wisp, Golden Wake and designated-soft-thorn Shatter Wake effects. Kindled Spirit and Draft Feeder reduce collector recovery. Preserve ordinary terrain lethality and one-time pickup rewards.
- Passive Gravity cannot earn activation counts. For its activation-based route objective, display and require the same number of collected natural light packets instead. Keep other companions' objectives unchanged.
- Update Home, rest choices, previews, tuning, power explanations and tutorial to say passive/always on. Remove timers or prompts to press Gravity; do not add an extra active tool. Preserve colours, rest swaps, scene props, map clarity, reserve rules and saved progress.
- Publish the feedback batch without checks, tests, simulations or balance work while the backlog remains open.

## Rendering direction proposed after the first review

Use pre-rendered or cached 2D art for scenery, props and character animation, with dynamic light from the player and carrier wisps. Keep the pixel grid and the gameplay light-radius upgrades.

Bake material colour, surface detail and restrained ambient shading into the art. Supply normal and specular or roughness maps for terrain that needs moving, surface-responsive highlights. Use simple silhouette occluders where dynamic shadows materially improve depth. Keep strong directional highlights and shadows out of the base artwork so they do not contradict moving wisp lights.

The current build already caches terrain artwork. Its current dynamic lighting uses a low-resolution reveal mask and glow. Normal-map relighting is a proposed next rendering upgrade, not a feature already deployed. No gameplay mechanics change with this proposal.
