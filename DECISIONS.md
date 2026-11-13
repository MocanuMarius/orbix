# Wispbound design decisions

Updated 13 November 2026. Wispbound is the working title. This log records the confirmed direction and subsequent implementation choices. All ten recommended alignment choices were accepted in chat.

## Planned combinations and clearer teaching — 13 November 2026

Artifact offers and details now describe a trigger sequence and a piece to seek: overflow → companion recovery → Dawn Loom light → Sunspool free Lift. Edging Pulse intentionally qualifies as temporary light for Sunspool. Shared trigger budgets remain: five direct-fuel empowerments, four free Lifts, twelve recovery seconds per fleet member, and cooldown-limited light; generated effects cannot create a recursive pickup/currency loop. See the dedicated combination report for tested scope and assumptions.

Map legend and actual routes share the same illustrated landmark paths. Unlock descriptions use the displayed Glow unit conversion. Newly observed Black Hole drain and Edging activation queue one contextual lesson at a later safe map/victory screen, respecting skip/seen settings; they never open a new lesson during hazardous flight. Tutorial references match landmarks rather than removed circular markers.

Glow boon bands are thicker and brighter, with radii 14/9/4 and visible gaps. Original contact boundaries remain unchanged; this revises their art, not reach or fuel values. Changed Sunspool behavior invalidates older Dream recordings; saved runs continue.

## Glow boon rings — 13 November 2026

Positive fuel pickups share three fixed concentric slots, filled from outside inward: Light Mote one ring, Glow Cluster two, Glow Cache three. Thick pale bands retain gaps and the separate thin contact boundary. Ring count represents existing strength tiers, not literal Glow units; rewards and collision sizes are unchanged. Utility and harmful pickups keep their distinct symbols. The field guide uses the same art.

## Packed Light naming — 13 November 2026

The upgrade currency is now named Packed Light throughout the interface, with a pixel box containing a luminous center. This supersedes the earlier Condensed Glow name; conversion, prices and saved balances are unchanged. Overflow continues to rise into the left-side counter as a continuous beam.

## Edge, void and readable choices — 13 November 2026

Black Holes are persistent environmental drains, separate from collectible Dark Seeds. Each non-tutorial course places one in a quiet room with a tested body-clear bypass, or a guarded approach fallback; impossible synthetic layouts omit the hole instead of sealing the route. The 16-unit core is approximately the wisp's visible size. Drain uses a softened inverse-square curve, tapers to zero at 220 world units, and caps at 24 displayed Glow per second. There is no physical pull, collision death, currency debit or shield immunity. Zero Glow still disables Lift and allows rescue pickups while falling.

Recorded actual fuel loss drives at most 48 pixel motes, which leave the wisp, curve into the hole and spiral inward. Empty fuel emits no new stolen light. The hole retains an opaque black core through light reveals; a muted red rim signals danger. The Glow meter tints during actual drain. Pauses freeze the effect and simulation; Dream recording and replay incur the same environmental drain.

Skill maps emphasize the immediate purchase frontier: affordable nodes glow, unaffordable reachable nodes stay subdued and state their shortfall, learned nodes carry checks, next prerequisites appear as small anonymous locks, and deeper nodes are only faint dots. Unchosen exclusive paths close. TEST reveals all content while retaining prices. Vitality uses a pixel heart, life capacity a heart-plus, radius a sun, reduced effort a Glow-minus, Lift an upward arrow, steadiness a horizontal hold and cooldown a returning clock. Existing branch colors remain secondary cues.

Route maps preserve the committed graph and only expose actual next destinations as selectable. Current position and reachable landmarks are brightest, future previews muted, and closed branches have no controls. The new map art replaces uniform circles and straight links with uneven trails and illustrated landmarks, without adding encounter categories.

Focused validation: 192 normal course/size/seed variants and four boss variants retain body-clear bypasses, including moving geometry; black-hole fuel bounds, pause/Dream/resize behavior and bounded read-only art pass. Existing Condensed Glow and Edging probes pass. Skill disclosure and affordability probes pass. These checks do not establish human win rates, phone FPS or a newly rebalanced campaign economy. The previous 6,240-case economy report predates environmental drain. Current v7 saves continue; older Dream presets must be rehearsed again.

## Edging Pulse — 13 November 2026

Every wisp can build a passive Edging Pulse by flying within 24 world units of a real solid boundary, while remaining outside collision. This includes terrain, solid scenery and the lethal top/bottom screen limits. Decorative backgrounds and the camera's left/right edges do not count. Four seconds of accumulated close flight fills the meter; open space drains 18 percentage points per second. The player retains the same two flight controls.

Full charge automatically resets the meter and releases three gentle waves of diminishing light over five seconds, revealing the whole visible scene. Two seconds of recovery follow. No charge accumulates during the pulse or recovery. The effect reveals information; it awards no fuel, Condensed Glow, pickup event, shield or artifact trigger. Ready Protector layers do not prevent charge, but active collision protection does. Runner speed bursts resist wind rather than terrain, so they still allow risky-edge charging. Contact clears stored charge. Death, completion and Dream rehearsal/playback suppress it; pausing preserves simulation time.

The passive PULSE meter appears beside Glow on the first close approach. Warm color identifies charging; active fill counts down the remaining release. Existing pickup help explains the mechanic without interrupting normal flight. Reduced motion uses a smooth steady fade instead of repeated waves. Edging and pickup reveals combine by maximum brightness, never additive exposure; both rendering paths and scene visibility agree, including light-reactive ice.

Radiance leads to Edge Attunement (+25% charge, 3.2 seconds), then a mutually exclusive fork: Lasting Pulse (seven seconds) or Held Tension (half the open-space decay). Base prices are 80/100/90 Condensed Glow under the existing progressive price curve. These three Light nodes fit the current radial layout. Existing v7 run saves continue; the simulation fingerprint invalidates older Dream presets.

Focused checks cover 2,016 geometry/collider comparisons, moving and resized scenery, fixed-step determinism, charge/decay/recovery, protection and lifecycle guards, three descending light peaks, reduced motion, economic/artifact isolation, skill prerequisites/forks and save persistence. A 48-course, 3,840-update controller benchmark used at most seven nearby obstacles and measured about 0.011ms p95 on the development machine; this is not renderer or physical-phone frame-time evidence. Landscape browser inspection confirms the meter and full-scene reveal. The older broad flight/terrain suites contain obsolete health/companion/snapshot assumptions; only the focused current probes are claimed as passing. No new broad campaign-economy simulation was run for this sight feature.

## One light economy — 13 November 2026

This section supersedes every older Ember currency and Afterglow reserve rule. Flight Glow is still displayed in small whole numbers (30 base capacity). Natural pickups refill it, then actual surplus converts 1:1 into **Condensed Glow**, the run's upgrade currency. Fractional conversion credit is retained internally so splitting a pickup cannot create money. The flight meter has no second reserve. A bounded pool of pixel motes animates surplus from the meter ceiling into the top currency counter, with a batched whole-number gain and reduced-motion support.

Flight currency is provisional until the exit is reached. Failure restores entry currency and fractional credit; replaying the same opening or a Dream cannot farm earnings. Automatic checkpoint recovery, generated fuel and passive artifact healing do not condense. One-use natural Glow pods and finite checkpoint offerings can condense real surplus. Every flight still offers relic choices; dissolving the reward restores Glow and condenses only the remainder. Selling an owned relic removes it before calculating conversion. No flat clear or challenge money remains; optional challenge success improves relic rarity odds instead.

New runs start with one free Light/Motion/Glow root and 8 Condensed Glow. The Glow tree's Condensation node changes 3 surplus Glow into 4 Condensed Glow. Fine Facets adds small conversion improvements; a later choice specializes in reliable Prismatic Yield or Kept Light. Kept Light rewards holding 100/200/300 Condensed Glow at pickup time, capped at three tiers. It pays no interest while waiting. All conversion bonuses, including relics, share a 1.6× ceiling.

Upgrade prices use their quoted base multiplied by `1 + 0.4 × paid learned ranks^1.5`, rounded upward to a multiple of five. The free starter root is excluded. This slows economy compounding without capping pickup earnings. Small conversion ranks have lower bases than large movement/utility unlocks so their investment can pay back within a run. Locked buds and future ranks display current progressive quotes; purchasing another node changes later quotes. Workshop refunds return what was actually paid, not today's more expensive quote.

Fuel placement now checks a duration budget after actual terrain/encounter construction: Ascension 1 targets 10 internal fuel units/second on Map 1 and 9 on later maps; higher Ascensions use 8.2. Existing safe motes become richer caches first, then sparse body-clear pickups fill broad gaps. Boss hard-section labels no longer suppress every safe pocket. Warning zones and bad-packet chains retain their exclusions. These budgets describe available fuel, not guaranteed collection.

Tutorial teaches surplus contextually and uses an isolated practice wallet. Saves use a fresh v7 namespace rather than migrating the disposable prototype. Older Dream presets are invalidated. TEST unlocks remain separate from the explicit currency grant.

Focused engine/model checks cover natural surplus, 3→4 refinement, fractional credit, the 1.6× cap, Collector/body single payment, generated/dark exclusions, failure rollback, recovery exclusion, one-claim rewards and Dream isolation. Actual construction of all 48 maps across three encounter families still finds no fuel or positive actor targets blocked by scenery. The campaign stress report records imperfect-capture/correction assumptions and distinguishes conditional-clear economy from attrition; it is not a human play or Pixel 10 FPS measurement.

Final evidence: [the balance report](docs/condensed-glow-balance.md) documents 4,608 campaign cases, 864 sensitivities and 768 starting-root cases at the final price curve, with unchanged source during each run. Steady conditional-clear scenarios bought a median 8/7/6 ranks on Ascensions 1/3/6. All 48 maps and 12 biomes were sampled; 2,125 main-pass inventories had no supply shortfalls. Protector and Runner remain less forgiving under the imposed missed-pickup assumptions. These results support economy pacing, not exhaustive build parity or measured human success.

## Living biomes — 13 November 2026

New generated routes draw from twelve biomes: Moonlit Ruins, Frostbound Reach, Oldgrowth Pines, Lantern Marsh, Spore Hollows, Basalt Furnace, Glasswind Dunes, Coral Grave, Prism Caverns, Cloudbreak Isles, Briar Cathedral and Mourning Fields. Each has four authored course variants (48 active maps), distinct materials, landmarks, solid props and preview art. The three existing geometry families remain collision foundations, not the biome catalog. Legacy locations remain resolvable for tutorial and existing saves.

A separate seeded biome deck consumes all twelve identities across flight nodes before repeating. Biomes no longer depend on reward themes or difficulty position. A repeated biome rotates its course variant. Existing saved maps keep their destinations; New Game and newly generated subsequent maps use the shuffled catalog. Route commitments and the five event-symbol vocabulary remain intact; briefing previews identify the biome and one short interaction cue.

Local actors add twelve thematic interactions: masonry, ice and sand fragments or pinecones fall after a warning; ice thawing responds to actual illumination. Reed bubbles and puffcaps give one free lift, fumaroles/anemones/wind bells produce real rising currents, crystals/grave bells briefly reveal the scene, and seedpods grant up to 3 displayed Glow once. Currents share the normal draft, resistance and trajectory physics. Unprotected debris uses normal fatal contact; Protector can spend its shield. Actors are bounded at ten per flight, avoid hard passages/negative chains, and never produce Embers or recursively trigger pickup engines. Drafts now have a 1.15-second warning and stronger local displacement; debris warns for at least 1.2 seconds. Tutorial and boss encounters keep their authored mechanics.

Art uses cached pixel terrain/backdrops and bounded animated actors, with no dynamic terrain texture rebuilds. Forecast lines stop before unresolved touch/debris interactions. Dreams record deterministic simulation inputs; their fingerprint now includes the simulation revision, so old recordings must be rehearsed again after these physics changes.

Focused evidence: 48 distinct courses, 96 generated layout cases, 144 seeded maps, all twelve possible opening biomes and all 48 variants observed. Actual flight construction across 48 maps × three encounter families produced 3–10 actors in every case, with no blocked fuel or positive interaction targets at body size across canopy sway. Twelve behavior checks cover light-gated thawing, warnings, contact handling and single-use rewards. Route commitments, drift prediction and Dream checks pass. Landscape browser inspection confirms new materials, previews and launch without console errors. These checks do not establish human difficulty or Pixel 10 frame rate; no broad economy retuning was performed.

## Committed routes and readable map states — 13 November 2026

This update replaces the dense crossover graph from relic-paths-1. Each map still has three starting branches and seven stops. Routes stay on their chosen corridor for several stops; authored junctions offer at most two exits. Taking a Treasure branch can now exclude a later Rest. All displayed nodes remain reachable from some start, an ordinary route reaches the finale, and successive elites stay prohibited even across support stops.

A Rest still has one known next flight for Dream. Failure can reveal only one authored neighboring flight detour, keeping the choice of retry routes without opening the whole row. Completed sites cannot be repeated. Existing saved maps retain their graph; a New Game or newly generated next map uses the new topology.

Model-owned map state drives both permission and drawing. The current position is the last completed stop, with a wisp and HERE marker; failed/uncompleted attempts do not move that marker. Walked paths stay gold. Immediate NEXT stops have bright discs, halos and pulsing rings. Legal future stops are subdued and open explicitly labelled previews. Closed branches are faint and have no pointer/keyboard action. A HERE control recentres the view. The map key explains brightness as well as encounter symbols. Future forecasts follow the legal route history instead of carrying an earlier elite state through intervening ordinary flights.

Focused graph checks cover 144 generated maps, 813 rejected blocked selections, 262 bounded Rest retry cases and 727 excluded desirable sites. Existing route/reward and campaign checks pass. Local browser inspection at 900×405 covered next-stop brightness, a committed Treasure branch with a locked Rest, preview-only future stops and the recenter control. No flight physics, skill prices or reward amounts changed; no new broad economy or phone-performance claim is made.

## Previous build: relic-paths-1 — 13 November 2026

This section remains the baseline except where the newer committed-route update above supersedes it. Older entries below preserve the decision history; their obsolete prices, portrait layout, card rules, roles and test restrictions do not override this section.

- Landscape 20:9, four base companions, one-handed Lift/Power. Skills and Embers belong to the run; normal runs start with 30 Embers and one free Light/Motion/Glow root. Tutorial remains separate.
- Artifact slots: Ascension 1 starts with 3, Ascensions 2–3 with 2, Ascensions 4–6 with 1. The RELICS skill branch adds one slot per purchase for 140, 280 and 560 Embers. Maximum with those three purchases is respectively 6/5/4. Slots reset on New Game. The locked slot opens the next node directly; TEST does not grant slots for free.
- Every ordinary flight offers two run relics or an Ember alternative. Full slots require replacement; no reserve bag. COMMON and RARE are visibly labelled; later map milestones guarantee RARE offers. The actual final boss offers a chosen, permanent BOSS relic for future runs, with three stronger bounded effect bundles. Common/rare resale is 12/16, below the cash alternatives.
- Shared artifact triggers connect overflow, companion work, pickup recharge, temporary sight and free Lift. Generated rewards cannot recursively trigger these chains. Existing caps also apply when multiple artifacts share a trigger.
- Six seven-stop route recipes vary Rest, Event and Treasure placement, with themed reward previews. Rests retain one next flight for Dream. Stillwater tunnels, draft staircases and Dark Seed orchards give routes different flying problems; Moonweaver joins Hollow Warden as a final guardian.
- Glow uses a fixed 30-point display scale, whole-number labels and Lift-sized gauge segments, while physics keeps fine precision. Main capacity upgrades raise displayed capacity to 36/42. The small Afterglow meter above Glow remains visible when locked/empty; natural surplus spills into unlocked reserve or visibly strikes a blocked meter.
- Circular softened inverse-square baseline light restores the value of Light skills. Landscape HUD and wisp are separated, with notch-aware positioning and unchanged world timing. Arrival is a terrain-supported refuge beside the final visible solid, followed by the existing 1.5-second illumination.
- Ordinary skill costs are mostly 80–110, with stronger effects and full-effect specializations. In 360 imperfect-income scenarios, the seven main/companion plans each bought a median eight nodes over 15–16 clears. Socket-focused hard-Ascension plans traded roughly two ability purchases for two extra slots. These are economic diagnostics, not measured human win rates.
- TEST exposes locked companions and artifacts but keeps normal starting income. Its explicit +500 Ember button is separate. Practice uses its own 200 Ember wallet, one short checkpoint lesson at a time, and the real reward/upgrade flow.
- Targeted mechanics, capacity, route, save, isolation, geometry and skill-effect checks passed. Local 900×405 UI inspection verified the gauge, paid slot unlock and briefing fit. Actual Pixel 10 frame-rate evidence and human balance judgments remain unverified.

See [the request audit](docs/request-audit.md), [economy evidence](docs/economy-upgrade-decisions.md) and [runtime decisions](docs/artifact-engines-decisions.md).

## Historical direction (superseded where later entries differ)

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


## Guided tutorial and prototype pace

- Prioritize building the changing prototype. Do not add save migrations, compatibility layers or data-preservation work for this batch. Existing mechanisms are left as they are.
- Replace text-only onboarding with short coach prompts that spotlight the actual interface. Introduce map routes and all six encounter symbols, fuel and currency, lives, powers, companions, tuning, and Stored Glow where available.
- Teach rest preparation through the actual MENU wheel, tuning sheet and companion sheet. Let players use the normal controls after each explanation.
- Pause practice flight while pointing out controls or a newly encountered world object, then resume explicitly. Keep the two short authored practice flights and contextual action hints.
- Show a real optional dark packet in draft practice. Explain that it dims sight, rather than consuming Glow or a life.
- Publish this feature batch. Skip checks, tests, reviews, simulations and balance work until the backlog is clear.


## Three-map difficulty tiers and boss-gated Afterglow

- An ascension now crosses three separate seven-stop maps. Difficulty stays fixed across those maps; clearing the third map's Hollow Warden unlocks the next difficulty. Higher tiers add bounded passage and draft pressure. Within-map flight depth is labelled Flight, separate from Difficulty.
- Keep the same three lives, three-slot build, current Glow, tuning allocation, and secured rewards between maps. Map clears are checkpoints inside an ascension. Losing all lives restarts the ascension from its first map.
- The third map ends with a distinct guardian flight trial: survive authored, telegraphed phases and reach the refuge using existing flight controls. It adds no combat buttons.
- Afterglow is hidden and mechanically inactive before the first boss clear. Do not siphon spare fuel, offer reserve events, display reserve upgrades, or introduce it in basic practice. Before the unlock, events offer ordinary fuel, embers or powers.
- The first boss permanently unlocks Afterglow and grants 20 Stored Glow once. Introduce the bottle, surplus banking, preflight drawing and reserve upgrades at that moment. Future ascensions retain the unlock.
- Prototype speed takes priority over retaining previous save data. A new save key may reset the current prototype; do not add migrations or compatibility layers.
- Publish this batch without checks, tests, reviews, simulations or balance work.


## Consequential localized wind

- Strengthen the existing localized draft pockets rather than introducing global wind or more frequent puffs. Base acceleration is 260 in ruins, 340 in canopy and 430 in storm, capped at 560 after modifiers. Practice uses 90.
- Keep the warning readable at 1.05 seconds. Sustain the active puff for 1.45 seconds, with a 0.14-second onset and 0.35-second fade, so it lasts through a crossing.
- Broaden the strong core using a smooth radial feather. Force is still exactly zero outside the visible ellipse. Keep placement, spacing, count, bypass room, one-shot activation and 72% Swift resistance.
- Make local curls and directional chevrons more legible. Positive direction means downward acceleration; all motion cues must match that physical direction. Keep effects inside each puff and respect reduced motion.
- This is a requested strength change, not a balance pass. Publish without checks, tests or simulations.


## Collector-first companion roles and temporary unlock override

- All companions share a plain circular light body, distinguished only by colour. Remove bespoke crescent, bell and spiral silhouettes, fins, feet and faces. Main-player light remains neutral white.
- Collector is the starting companion, coloured soft green. It alone searches for missed good light packets, fetches them, returns with cargo and recovers. Preserve direct player pickup priority and the existing fetch cooldown.
- Swift (amber) provides Boost, Anchor (cyan) provides Level, and Gravity (violet) passively pulls nearby packets. They orbit but never automatically fetch or deliver; players still collect packets with the main body. Gravity's field does not create a free Collector.
- Provisional progression: Collector at Ascension 1, Swift at 2, Anchor at 3, Gravity at 4. Display the actual lock and required ascension for future companions. During this prototype, a deliberate TEST override keeps every role selectable on Home and at rests, including locked choices.
- Collector recovery and reach information appears only for Collector. Gravity shows field information; active roles show their ability status. Disable the unused Collector tuning axis on Swift/Anchor and return those points to the shared budget.
- Collector cooldown cards affect collector recovery; Swift/Anchor cooldown cards affect their active tool. Gravity's existing recharge triggers briefly strengthen its pull instead of granting collecting behavior.
- The tutorial and role previews teach the equipped role. Do not wait for, promise or show fetch behavior when Collector is not equipped.
- Publish without checks, tests, reviews, simulations or balance work. Unlock thresholds and role effects remain available for later tuning.


## Pickup variety, size and readable effects

- Seven pickup kinds share one catalog: Light Mote (small, 24 base Glow), Glow Cache (large, 40 base Glow), Ember Cluster (12 flight embers), Charge Spark (3 seconds of companion recovery, or a short Gravity surge), Sight Bloom (+50 sight for six seconds), Dusk Pearl (32 Glow with 20% sight dimming for four seconds), Dark Seed (the existing eight-second sight penalty). Card bonuses can modify fuel effects.
- Use recognizable light-packet art, sizes, colour and animation rather than diamonds or identical dots. Larger visual sizes have modestly larger contact windows. Collection retains the accelerating orbital absorption animation with each pickup's identity.
- Preserve mandatory fuel placements and the existing sparse optional-niche count. Convert some optional dark niches to utility or risk/reward pickups, retaining dark encounters; keep the opening flight simple. Never replace essential fuel with currency or utility.
- Only Collector can fetch automatic pickups. Dusk Pearls and Dark Seeds require deliberate body contact; Collector and Gravity ignore risky pickups. Other companions still rely on normal body pickup.
- Currency, charge and sight pickups do not count as fuel or recursively trigger fuel cards/challenges. Currency enters the normal clear reward and is discarded when the attempt fails. Temporary sight and recovery effects stay within the current attempt.
- Introduce a new type once when actually visible, pausing the flight with a short spotlight and explicit Continue. Skip disables further pickup tips. The normal MENU also provides an optional Pickup Key with actual icons, sizes and effects. Existing basic tutorial types do not need repeated normal-flight introductions.
- The Protector, Seer and Purifier roster discussions remain proposals; this batch adds pickup variety rather than claiming those companions exist.
- Publish without checks, tests, reviews, simulations or balance work. These are provisional effect values for later player feedback.


## Closed-queue progression overhaul

The complete intake was reconciled and implemented together. This section supersedes earlier tuning, card-build and single-companion decisions.

- Persistent Ember-funded trees replace the independent stat-tuning budget and temporary card drafts. Trees cover the main wisp, six companions and the boss-unlocked reserve. Score is removed from the player-facing economy: Glow is fuel; Embers are currency, secured after successful clears.
- Six plain coloured orb companions are Collector, Protector, Leveler, Swift, Seer and Kindler. Gravity is removed. Only Collector fetches missed pickups. Ascension locks remain visible while TEST permits selecting all six.
- Main-wisp Bond ranks unlock a second and third companion slot, costing 80 and 180 Embers. This competes with other tree upgrades. One Power button activates ready active companions together; another tap releases an active Leveler. Passive effects work automatically.
- Protector consumes a shield charge and Glow to bounce away from terrain or bounds into actual open space. A brief separation window prevents immediate repeated contact. Layers recover; unprotected collisions remain fatal. Leveler uses a gently bobbing hold, baseline manual release, upgradeable steadiness and an optional release/expiry dive cancelled by Lift. Seer temporarily reveals farther ahead. Kindler grants direct-pickup fuel bonuses and an optional dark-seed purification upgrade.
- The player's white orb has a dark core that grows as Glow falls, leaving a thin bright shell near empty. Zero fuel triggers a brief final-spark death. Protector's blue outer shell remains visually separate from that fuel display.
- Collector's search area follows terrain geometry, redistributes into free sectors to conserve area where space permits, collapses on delivery and regrows during recovery. The same cached contour controls fetch eligibility.
- Three artifact slots hold persistent boss relics. Nine artifacts have concrete effects, can be mounted during safe preparation and can be traded for Embers at events or shelters. Duplicate boss relics convert to currency. The first boss also unlocks Afterglow and grants 20 Stored Glow.
- Seven-stop maps have mixed Rest/event/shrine/flight opportunities, branches that remain separate and occasional three-way forks. Route forecasts show access to future Rest sites. Only a committed Rest opens skill purchases and fleet changes; normal clears no longer refill fuel automatically. Three maps share the same ascension lives and resources.
- The seven physical pickup types remain; removing card-style powerups does not undo requested flight-pickup variety.
- Rendering now uses cached fog/light masks, cached orb art, fractional scrolling and nearby spatial windows. HUD references are cached and labels update only when changed. Frame pacing stays bounded with interpolated visuals. No measured FPS claim is made.
- The prototype save key is skilltrees.v5. No migration work was added. Checks, tests, browser QA, simulations and balance validation remain skipped at the user's request.


## Calmer tutorial and local review

- Use localhost while hosted publishing is blocked.
- Practice flights last 36 and 44 seconds, with fuel in their added open passages.
- Each flight introduces only one short control prompt. At most one world-object spotlight per flight teaches fuel first, then a draft.
- Remove forced map-symbol tours, automatic skill-tree opening and early artifact lessons. Keep those references available through MENU for voluntary exploration.
- Rest is a breather with a single short choice prompt; practice upgrades remain optional. No tests or balance simulations were run.


## Collector circle performance fallback and pixel texture

- Revert terrain deformation after user reports visibly low reshape frame rate. Collector returns to an inexpensive circular field, retaining delivery collapse/recovery growth and reach/recovery upgrades. No polygon redistribution is computed.
- Draw its radius and center on every rendered frame, without the former 12 Hz geometry refresh. Do not claim benchmarked 60 fps.
- Use stepped pixel discs for the main orb and growing dark fuel core. Slightly coarsen the common pixel buffer from 260 to 240 wide; keep nearest-neighbour output.
- Local preview remains the review destination. No game tests or benchmarks were run.


## Upgradeable illumination and inverse-square falloff

- Inner Glow already upgrades the main wisp light radius; Seer has separate range/duration ranks and an Ember Lens artifact adds sight.
- Replace the artistic terrain reveal gradient with softened inverse-square attenuation, exposure mapping and a finite gameplay cutoff. Bake the 128×128 pixel mask once and reuse it for main, companion and Seer illumination. Decorative glow halos remain aesthetic.
- No per-frame CPU pixel loop or benchmark was added.


## Collector accessibility and progressive discovery — 2026-11-13

- Strengthen the base Collector: reach 100 → 140, fetch speed 500 → 700, return speed 620 → 820, recovery 5.5 → 5 seconds. Keep the full manual-contact window. Empty rescue trips do not spend a recovery cycle. Terrain and base Lift cost are not globally softened.
- Replace the main wisp’s black depletion core with muted red stepped pixels. Full Glow has no core; lower Glow grows the red warning within the pale shell. Harmful Dark Seeds retain black bodies with a visible violet accretion rim and a few inward-moving pixels.
- Reveal skill nodes after their prerequisites. Companion Bond opens after the first boss; existing owned ranks remain available. Support upgrades come from the main wisp and equipped companions, plus Afterglow after its unlock.
- Prioritize three improvements: meaningful pickup flight paths, gradual discovery of tactical options, and clear between-flight reward/route consequences. The third remains broader follow-up work; do not claim all route/reward issues resolved.
- Local source changes only; no tests, browser QA, simulations, balance validation or FPS benchmarks requested or run.

- First ordinary flight targets one optional mid-flight Dark Seed in a visible wide-passage side lane. Keep sparse later hazards and avoid fuel approach paths and compulsory tight passages; skip unsafe candidates. Contact shows SIGHT -20%. Tutorial remains separate.
- Lift costs keep two decimals so every efficiency rank saves actual Glow; the HUD shows those savings. Discovered-only pickup guide and full-fleet coaching reveal mechanics progressively.


## Run structure, menu, and inward depletion — 2026-11-13

- New Game means a fresh run of three maps, preserving permanent companion/Ascension unlocks, recovered artifacts and the existing Afterglow system. Continue resumes the saved run. Exit to Menu preserves the run at its checkpoint; an interrupted flight resumes from its entrance. Abandon Run asks for confirmation and ends the run. Tutorial is a separate front-page activity, suspending and restoring an active run.
- Skill ranks and spendable Embers now belong to the run, not the profile. They persist across three maps and retries; purchases are only available at committed Rests or explicit encounter trades. Starter selection is available inside the initial map before its first route is chosen. No skill purchase/equipment management on the front page.
- Ascension selection and the next companion unlock are visible on the front page. Locked companion previews are read-only; the existing TEST override remains in the in-run companion picker.
- Prototype save schema moves to v6 with no compatibility migration, consistent with the user’s preference to prioritize building.
- Latest art direction supersedes the earlier red-core pass: grey-black shading closes inward from the orb edge as Glow falls. The central light shrinks, the pale shell remains, and cached 2-pixel dithered gradients soften the geometry. Remove the old menu CSS black-dot override.

### Research applied

- Predictable menus and clear action consequences: Microsoft XAG 112 (https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112) and XAG 114 (https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/114).
- Confirm actions that discard a run, with a visible cancel action: XAG 115 (https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/115).
- Show unlock goals beside the choices they explain: XAG 109 (https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/109).
- Keep tutorials repeatable and contextual: https://gameaccessibilityguidelines.com/include-contextual-in-game-helpguidancetips/.
- These sources inform accessibility and clarity; the run/reset structure and companion trade-offs are game-design decisions, not rules proved by those guidelines. Checkpoint-only continuation remains a limitation compared with exact mid-flight suspension.

### Run build paths

Each companion now has a pair of mutually exclusive paths, kept visible after the choice so the player understands what was traded away. Branches use the existing flight mechanics and reset with the run:

- Collector: Wide Search (35% farther, 20% longer recovery) or Quick Return (30% faster recovery, 20% less reach).
- Protector: Quick Ward (28% faster recovery, 25% higher cost) or Deep Ward (two layers, 35% higher cost).
- Leveler: Still Point (65% steadiness, 15% shorter hold) or Falling Release (release dive, 25% shorter hold).
- Swift: Quick Sparks (28% faster recovery, 25% shorter burst) or Wind Lance (90% draft resistance, 25% longer recovery).
- Seer: Long Vigil (50% longer reveal, 20% less range) or Passing Glance (35% faster recovery, 35% shorter reveal).
- Kindler: Rich Fuel (12 bonus Glow, 10% more Lift cost) or Purify (12 Glow from a Dark Seed per 10 seconds, ordinary bonus reduced to 3).

These are implementation values, not a tested balance claim. Rest and encounter menus show consequences before purchase.

### Authored flight challenges

- Fuel-pocket approaches deliberately order a descent/climb from existing terrain cells and bind their cue to an actual existing fuel packet. No extra fuel-density increase.
- Draft crossings use broad, floor-sided rooms and real local puffs, with existing terrain/prop clearance and bypass guards. They replace an existing puff where possible rather than adding screen-wide wind.
- Cave passages use roof-and-floor sequences and reduce sight gradually by 15% (18% elite), only after a minimum 1.5-second warning. Visibility returns after leaving; permanent sight upgrades remain unchanged.
- Terrain, location, map and Ascension vary the planned sequence. First-flight basics, tutorial layouts and bosses remain separate. Preview labels describe planned patterns; unsafe/unavailable placements are omitted.
- During flight the existing event area gives concise cues without pausing play.
- All three requested improvement tracks are implemented in source; no playtests, simulations or benchmarks were run.


## Integrated playtest pass — 2026-11-13

- Later decisions here supersede earlier hard-cooldown, black-core, skip-simulation and individual-site-icon entries.
- Collector has one visible fuzzy vibrating boundary, without a filled aura. Successful delivery resets reach to 28 world units; it expands to upgraded maximum over recovery. It can fetch missed packets inside that smaller radius during recovery; direct player contact retains priority. Fixed 72-segment outline, no terrain reshaping.
- Baseline light exposure increases by 50% within the cached softened inverse-square mask. Distant cutoff remains dark. Solid terrain and scene-prop edges gain brighter inward rims; backdrop silhouettes stay subdued.
- Unprotected collision has a two-second pixel disintegration before retry. Protector deflections remain immediate. Glow exhaustion keeps its shorter last-spark fade.
- Every pause/dialog resume ramps simulation speed from 0.1x to 1x over two real seconds. Controls stay usable and RESUMING shows the current percentage. Stalls retain bounded catch-up.
- Power is icon-only, with a rising fill: Collector current/max radius, active powers cooldown, Protector shell recovery. Full charge produces a short pixel sparkle; reduced-motion disables it. The redundant Collector status text is removed.
- Map node symbols are limited to Flight, Elite, Rest, Encounter and Boss. Events and shrines share Encounter. Ordinary exits use Flight. Location-specific art remains in previews rather than acting as a separate node alphabet.
- Explicit TEST OVERRIDE unlocks Ascensions 1–6, three companion slots, skill prerequisites, Afterglow and artifact mounting, and grants 10,000 temporary Embers. Test training and equipment changes are available at safe inactive checkpoints. Test path swaps replace the other path. TEST runs are sticky and never bank permanent rewards; turning the preference off affects the next new game.
- Imperfect-play comparisons use 35/55/75% prescribed body contacts, 150/250/350ms reaction delays, and 20/40% missed Power opportunities. These are sensitivity assumptions, not measured human play. Actual-engine route probes are separate and retain their controller limitations.
- Applied provisional role tuning: Leveler 2.4s / 9s recovery; Swift 1.25s / 7.5s; Kindler +10 direct Glow, Rich Fuel +16 with 5% Lift penalty, Purify +8 ordinary Glow and existing 12 Glow Dark conversion per10s. Seer light offset is160 units forward. Strong main sight still diminishes Seer's value.
- Rich Fuel's penalty applies only while Kindler is equipped. Storm Knot also speeds Swift recovery by10%, preserving value when draft resistance is capped.
- Economy candidate D: clear40 +2 per depth capped at48; elite +12; intermap exit60; no extra final-boss completion currency. Main efficiency/sight prices40/80/140; Collector paths50/60; Bond slots80/300. Matched economy simulations condition on successful flights and synthetic pickup assumptions, not win rates.
- The new shrine illustration, original pixel frames and local Pixelify Sans font replace the flat website-like menu treatment. Font license and art prompt are included with assets.
- GitHub repository authorized by the user: https://github.com/MocanuMarius/orbix . Repository privacy must not be changed without explicit approval. No billing or paid-plan activation is authorized.

- Follow-up difficulty relief: new runs start with75 Glow (was60); Refuge natural packets add6 route Glow (was2), Cavern adds4 (was0), and gauntlet stays1. Light Mote body-contact radius rises16→20. Packet density and obstacle geometry are unchanged; missed pickups have more budget, without refilling every checkpoint.

- User explicitly approved making `MocanuMarius/orbix` public and enabling free GitHub Pages. Source remains on `main`; static runtime is published from the root of `gh-pages`. No paid plan or billing setting was changed.

## TEST starter selection fix — 2026-11-13

- The TEST front-page companion roster is now an interactive six-companion picker. The chosen starter persists independently of normal unlocks and is applied to New Game. Existing Continue runs retain their current fleet.
- Before this fix, front-page icons opened a read-only unlock panel and new runs always chose Collector, despite the in-run TEST picker allowing all roles.
- Checked every role in the actual start-map picker and verified Seer selection survives reload and becomes the new run starter. Changed UI and model asset URLs are versioned to avoid stale phone caches.


## Performance investigation — 2026-11-13, local batch

- User reports recovering hitches on Pixel10. Do not redeploy until the queue is cleared. No source push or deployment was performed in this performance pass.
- Frozen baseline is source8460f34. Real-browser Canvas2D testing covers16 matched cases:3 normal flights,9 accelerated terrain sweeps, boss, identical resize bursts,2px height jitter, and pickup effects. Test host is Windows Chrome157 with fixedDPR2 and a390×620 game canvas; it is not the user's phone. All timed samples remained visible.
- Baseline111.06s:283 RAF gaps>50ms,7>1s, maximum1825.3ms. Final109.09s:0>50ms, maximum20.9ms,6556 render calls (~60Hz). Normal flight maximum gaps were below9ms. Callback rate (~240Hz) is reported separately from render rate.
- The strongest isolated fix requests CPU rasterization for cached background, terrain and prop-art canvases. Live buffer, fog and presentation keep their accelerated contexts. Matched targeted tests remove the long gaps while synchronous render times remain small, supporting a deferred-canvas pipeline cause. This is not a GPU trace or a measuredPixel10 diagnosis.
- Cache slowly scrolling background art, remove same-canvas feedback copies, cull offscreen props before generation, and prepare at most one future surface per available frame. Initial course generation remains synchronous at flight entry.
- Identical resize events do nothing. Coalesce real resize events to one frame. Small active portrait height changes preserve the committed logical world and backing buffers (cap64px/10%); both canvases scale consistently viaCSS. Width, DPR, major height and paused/orientation changes still resize fully.
- Paint at most60Hz while keeping fixed-step physics and input callbacks responsive. Local-space collision tests avoid14k–20k temporary coordinate arrays/sec;68134 matched queries had zero disagreements. Pause/resume, two-second death and resize/pacing probes passed.
- Optional ?perf=1 adds a bounded in-memory frame recorder and SAVE PERFORMANCE REPORT in the menu, including after an attempt ends. Export is local; nothing is uploaded. Percentiles use the last3600 samples and lifetime counters/maxima. It remains to be measured onPixel10 after the next deployment.
- Full raw traces, intermediate unsuccessful candidates, comparison CSV/chart and reproducible laboratory bundle are saved in outputs. Asset versions are prepared for the next deployment to avoid stale phone modules.

## Main-wisp branching tree — local queue

Replace repeated main-stat ranks with named one-time skill nodes. New runs immediately offer one free root gift: Radiance(+35 sight), Momentum(+5%travel), or Vitality(7%lessLiftcost). Roots branch into exclusive pairs: Far Horizon/Dawn Veil, Slipstream/Feather Drift, Rising Light/Kindling. Embers buy further skills at Rests; no point allocation or +/- tuning. Companion Bond remains a discrete slot unlock. The main menu stays free of training; all run training is inside the run. Remove unused legacy tuning modules, constants and tutorial copy. TEST still bypasses gates and can replace a chosen fork. Kept local alongside the performance batch; no deployment.

## Pickup readability and easier recovery — local queue

- All beneficial pickups share a pale circular light boundary. Dark Seeds and Dusk Pearls share a red warning boundary; Dusk remains a reward with a cost, never an unmarked boon. Inner silhouettes identify fuel mote, radiant cache, ember cluster, charge spark, sight eye, pearl and black seed. The same art appears in flight and the pickup key.
- Contact radii increase to26/30/26/25/26/25/22 world units (light/cache/embers/charge/sight/dusk/dark). Rings match the corresponding contact radius.
- Normal courses target30% additional recovery lights, elite15%, capped at one extra per12 seconds. Candidates use broad central air with48-unit swept terrain/prop clearance, at least160 units from warning pickups, and1.5seconds of separation from other fuel. Unsafe candidates are skipped. Nine102-second samples added4–7 accessible lights each; full moving-terrain clearance checks passed.
- Pickup animations use a bounded per-document CPU-raster sprite atlas; the larger rings do not add live per-pixel painting each frame. Ring generation is linear in radius. This targeted cache check does not replace the earlier full benchmark or physical-phone testing.
- Changes are held locally with the skill-tree and performance work, pending queue clearance and a combined deployment.

## Horizontal visibility — local queue

- Main illumination becomes a smooth asymmetric ellipse:2× reach straight ahead,1× behind/above/below. The lobe stays horizontal regardless of flap animation. Softened inverse-square attenuation is evaluated in these stretched coordinates, retaining the dark cutoff.
- A separate soft horizon band is anchored at scene centre rather than following wisp height. It reveals up to50% through the fog at its centre and fades vertically, keeping the upper/lower scene dark. Dark Seed dimming, cave penalties, death fade and sight upgrades still affect it.
- Both mask textures are baked once and reused. Companion/Seer radial lights and Collector fetch radius retain their own shapes and mechanics. Tutorial/pickup visibility and wind previews follow the new forward ellipse.
- Checks cover cached masks,2:1 forward/vertical extent, fixed horizon at high/middle/low positions and continued dimming. Visual check uses all three altitudes. Kept local for the combined queue deployment.

## Empty Glow is recoverable — local queue

- Empty Glow no longer triggers death. Forward motion, gravity, drafts, body pickups and Collector rescue trips continue. Lift requires its full Glow cost; an unaffordable tap neither spends remaining fuel nor cancels an active Leveler.
- Spending the exact final Lift or Protector cost is allowed without killing the wisp. A fuel pickup restores Lift availability immediately. Colliding without protection still triggers the existing two-second disintegration.
- Flight map stops now use a wisp between cliffs, replacing the paper-plane symbol everywhere through the shared map icon.
- Updated tutorial fuel guidance. A focused presentation probe verifies falling, ground collision, Collector/body rescue, final-cost Lift and shield, and unchanged collision delay. No full balance simulation or deployment.

## Queue intake pause — 2026-11-13

The user has asked to collect all incoming feedback before continuing. Implementation, tests, simulations and deployment are paused until the user explicitly says the queue is complete. Only record incoming requests during intake.

Most recent request: make lives recoverable or purchasable with run Embers at Rests, and add a run skill path for a larger life cap. Local edits were already staged before the pause: one-life Rest boon; 60-Ember life service; Vitality → Spare Spark (100 Embers, cap 4) → Deep Reserve (180 Embers, cap 5); new capacity begins empty; dynamic heart displays. Focused model check passed before the pause. Mobile UI inspection was interrupted by the intake instruction and remains unfinished. These changes are local and undeployed; review with the completed queue.

### Queued correction: full heart recovery and Ember-funded capacity

At a Rest, the life recovery option must replenish all hearts up to the current maximum, rather than restoring just one. Spending run Embers increases maximum heart capacity through the skill tree; it is not the per-heart refill currency. This supersedes the locally staged one-life boon and 60-Ember refill service described above. Exact capacity prices remain provisional. Record only during intake: do not implement, test, simulate or deploy until the user says the queue is complete.

### Queued correction: Rest-site Glow percentages

Show Glow amounts and recovery at Rest sites as percentages rather than fixed fuel numbers, including current Glow and recovery offers. Keep Embers as currency amounts and hearts as discrete lives. Record only during queue intake; implementation, tests, simulations and deployment remain paused until the user says the queue is complete.

### Queued correction: visual branching skill trees and dedicated access

Main-wisp and companion skill trees must appear as connected branching trees with incremental improvements along prerequisite paths, rather than lists of upgrade items. Give Skill Tree its own clearly visible, dedicated button. Preserve run-owned upgrades and the existing Rest-site purchase scope; this request changes tree presentation, upgrade path structure and discoverability. Exact layout and incremental effects are to be reviewed with the completed queue. Record only during intake; do not implement, test, simulate or deploy until the user says the queue is complete.

## Completed queue implementation — 2026-11-13

Queue intake ended at the user's explicit instruction to start. Replaced the one-life Rest boon with full heart recovery and removed the 60-Ember refill service. Run Embers buy Spare Spark and Deep Reserve capacity (3→4→5). Choosing heart recovery also fills any newly purchased capacity while still preparing at that Rest. Other boons leave new slots empty.

Rest Glow readouts, resource effects and Rest offer descriptions now use percentages. Added a dedicated map Skill Tree button and renamed Rest/menu training access to Skill Tree. Companion trees now render prerequisite connectors and compact nodes with a single inspected-node panel, rather than upgrade lists. Each companion has small Spark and Deep Attunement increments alongside ability forks. Existing main-wisp visual branches remain and include the life-cap path. Only equipped companions appear as tabs; upgrades remain run-owned and purchased at Rests (TEST bypass retained).

Focused model and syntax checks passed. Full balance simulations and phone performance rebenchmark were not repeated. No deployment yet.

## Collector and easy fuel release

User authorized deployment once the combined work was ready. Collector baseline reach reduced from 140 to 105 world units; recovery minimum reduced from 28 to 18. Boundary opacity reduced from 0.52 to 0.23 with a thinner stroke and much softer outer pass. No filled aura or expensive terrain reshaping.

Ascension 1 non-elite routes prioritise screen-centre and near-centre recovery fuel. Early/open passages target 50% extra recovery fuel, later ordinary Ascension 1 passages 40%, versus 30% on higher tiers and 15% on elites. Placement remains capped by duration and swept terrain/prop clearance; unsafe candidates are skipped. Targeted syntax, rescue/collision and slow-resume checks passed; no full balance matrix repeated.

## Scenery-anchored exits

All flights now position the exit 72 world units beyond the rightmost terrain or collision-backed prop, rather than waiting for nominal duration. This leaves roughly 0.47 seconds of clear flight at base speed. Tutorial and boss layouts share the rule; no final terrain is skipped. Pickups beyond the new exit are removed, and the boss waylight cue follows the new endpoint. Targeted terrain/prop, tutorial/boss and collision/rescue checks passed.

## Level-clear light reveal

Reaching the refuge now enters a protected 1.5-second completion animation instead of immediately opening rewards. Gameplay and fuel freeze; Lift, powers, collision and pickup teaching popups cannot interrupt. The wisp's light expands, fog eases away, a warm wash remains across the scene, and the Collector outline fades out. Reduced-motion mode uses the same gentle fog fade without expanding the light radius. Rewards are delivered exactly once after the full reveal. Targeted timing/resource/control checks and three-stage visual preview passed.

## Smaller pickups and orbit absorption

All seven pickup contact radii and their visible rings are now 80% of their previous size. On body contact or Collector interception the ring shatters into a bounded 18 fading pixel fragments (6 reduced-motion). The carried/absorbed packet renders only its inner body; it has no collection halo or active hitbox. The 1.35-second absorption holds an orbit for 3.15 full revolutions before the final inward spiral. Rewards still apply immediately; animation does not delay fuel rescue. Reduced-motion mode retains a direct contraction. Renderer probe verified 3.15 visible orbits before collapse; collision/rescue checks passed.

## Deeper skill paths and provisional balance

Added 36 one-time named specialisations: 24 companion nodes and 12 main-wisp nodes. Every existing companion style now forks again into two distinct tradeoffs, giving four deep endpoints per companion. Main-wisp specialisations gain two further choices, revealed after learning their parent. Expanded companion trees can pan horizontally without shrinking touch targets.

Early attunement costs 20 Embers; optional Deep Spark costs 35; intermediate companion improvements cost 40; style forks and deeper forks cost 65. A full companion path costs 150 (Collector/Kindler) or 190 (other roles), excluding optional mastery. A main path costs 130 after its free starting root. Life-cap costs and companion-slot costs remain competing purchases. Companion intermediate improvements are one-time steps, not repeatable stat allocation.

New mechanics include Collector fuel yield/minimum recovering radius, longer Protector separation, Leveler/Swift/Seer duration/recharge tradeoffs and variable Kindler purification yield/recovery. New companion-specific bonuses and penalties only apply while that companion is equipped. TEST fork replacement recursively removes obsolete descendants.

Found and fixed a pre-existing touch bug: the global button active transform displaced absolutely positioned tree nodes on press. Nodes now retain their centred transform while pressed. Verified touch selection and purchasing Rich Cargo through the UI.

Balance evidence: all 24 companion paths have legal prerequisites and exclusive endpoints; 2,880 companion/main/single-artifact modifier combinations stayed within checked bounds. Three actual campaign-transition traces with synthetic pickup incomes of 0/12/24 Embers per cleared flight yielded 792/1008/1224 total Embers and first-Rest budgets of 40/52/64. These are conditional-clear economy checks, not human survival simulations or proof of equal companion win rates. Full flight balance/thermal benchmarking was not repeated. Local report exported as Wispbound-skill-tree-balance.json.

## Deep balance health pass — 2026-11-13

Implemented after the explicit request for deep balancing. Compared 23,328 campaign scenarios, 1,296 real-engine delayed-controller attempts, and 627,250 legal modifier configurations. Economy scenarios use actual generated inventories and model transactions but assigned contact/attrition; they do not predict human wins. Reports and reproducible snapshots are exported under outputs/Wispbound-balance-*.

First-run Bond slots now open after Maps 1 and 2 (80/300 Embers); boss-cleared profiles retain early access. Map 3 converges on one Last Hearth at stop 6, replacing a flight, so every route gets final preparation before the boss. Early upgrade prices remain 20/35/40; style forks are 75 and deep specialisations 120. Clears now pay 32–40, elite premium 12, challenges 16, Ember Clusters 8. Map exits remain 60 and bosses award artifacts. Heart cap prices remain 100/180.

Ordinary pocket lights move slightly outward (32 clearance on ordinary Ascension 1; 28 elsewhere), with rich-cache clearance still 22 and hitboxes unchanged. Quick Return recovery multiplier is now 0.50 instead of 0.70: the old range/cooldown combination grew more slowly than Wide Search at intermediate radii. Controlled streams now show a close/dense niche for Quick Return and a distant-pickup niche for Wide Search. The authored difficulty curve caps at tier 6; normal unlock progression now stops there rather than exposing identical higher tiers.

Representative conditional-clear Ascension 1/55%-contact Rest-seeking scenarios: mean income 1646.3→1323.3, spendable surplus 296.0→85.8, income after last Rest 403.9→37.2. Final-version geometry sample: 47319 fuel sites / 1404 layouts, zero body-blocked centres in sampled extrema. All 24,675 applicable artifact marginal checks retain an effect; 110 progression/integrity cases and 12 repeated boss runs pass. Browser purchase flow verified. Full-physics controllers still fail most routes; no claim of human win rates, equal companion survival or phone FPS is made.

## Incremental living trees — 2026-11-13

Replaced rectangular list-like skill layouts with a rooted, curved branch graph, compact 44px buds, brief effect captions and a fixed inspector. Main-wisp branches are separated into Light, Motion, Glow and Bonds; companion tabs remain limited to the equipped fleet. Scrolling survives node inspection and purchase.

Split 51 continuous upgrade tracks into three sequential purchases, adding 102 intermediate nodes. Style costs are 20/25/30 (75 total), deep costs 35/40/45 (120 total); discrete mechanic unlocks, roots, heart capacity and Bond prices retain their previous costs. Each partial purchase changes real gameplay immediately. Opposing paths remain exclusive, including discrete unlock versus partial continuous path; TEST switching removes the displaced descendants.

Glowkeeping replaces the old stronger-Lift fork with three 2-percentage-point reductions in Lift Glow use. Kindling grows pickup recovery by one third of its +4 Glow total per step. All other completed continuous paths retain their prior endpoints. A focused probe verifies all tracks and real transactions; mobile UI purchase flow verifies 20/25-Ember debits, fork locking and retained scroll position. No new full campaign or phone-performance benchmark is claimed for this layout/increment pass.

## Companion motion and held Leveler — 2026-11-13

Main-wisp art and collision radius are 15% smaller; its scene-light reach is unchanged. Flight-map nodes now show a travelling orb with a clear forward arrow.

Leveler uses the normal flight touch area or Lift control: tap still lifts immediately; holding for 180 ms begins levitation. Its charge drains only while levitating, unused charge remains on release, and charge refills while released. Fully depleted charge requires release before another hold. The 2.4-second base capacity and 9-second full recharge remain upgradeable through duration/recovery skills; bobbing and the optional release dive remain. Power activates only Swift/Seer. Leveler-only fleets show a non-button charge indicator; a small cyan meter under the main wisp also shows charge. Pause, pointer cancellation, lost capture and key release stop held levitation. Power challenge credit is based on spent Leveler capacity, preventing rapid hold/release farming.

Companions have distinct eased flight paths. Protector circles the recovering shield, welding progressively rebuilt intermittent segments with blue sparks. Collector has breathing fragments while retaining its fetch path; Leveler casts rising suspension rings; Swift sheds moving streaks; Seer scans with arcs; Kindler pulses on direct fuel/purification. Effects use bounded drawing loops, cached orb art and reduced-motion variants.

Focused mechanics and renderer-state probes passed. Local browser access was unavailable for this batch, so no new visual or phone-FPS verification is claimed.

## Shelter icon and six new locations — 2026-11-13

Rest/shelter map stops use a roofed refuge with a lit doorway and chimney, shared with the map key. The map still has five encounter symbols.

Expanded the location pool from 9 to 15 with Drowned Mill, Moonlit Cloister, Sporelight Glade, Drowned Mangrove, Cloudbreak Causeway and Basalt Organ. Each has an authored entry/challenge/recovery course, dedicated distant backdrop, material palette, pixel map thumbnail and location-specific challenge names. New solid scenery includes giant mushrooms, broken bridge supports and standing columns; it is rendered from the same polygons used for collisions. New thematic props can use cache-bearing terrain only after the existing pickup-clearance rejection passes; mushroom caps are narrower/recessed to protect nearby fuel access.

Location selection now draws through each terrain's five-location pool before repeating within a map, using map-specific ordering. Existing saved maps retain their generated destinations; New Game uses the expanded selection immediately. Route connections, Rest commitments, difficulty aperture floors and fuel/reward budgets remain governed by existing systems.

Focused validation: 24 generated new-location layouts at tiers 1/4, 804 fuel centres checked at moving-terrain extrema with no body-blocked centres; all three new prop kinds appeared; 30 route decks avoid repeated locations until their terrain pool cycles. Actual production-renderer snapshots were rendered offscreen with Canvas for visual inspection. This is not a phone FPS or human difficulty benchmark.

## Opening budget, distinct main-wisp choices and left Glow gauge — 2026-11-13

New Game grants 90 run Embers alongside the existing free root, with spending open before the first flight. This supersedes the earlier zero-Ember start and repeated three-stage main-wisp tracks. Main choices are now one-time named nodes (25–30 for opening upgrades, 40–50 for deep choices); companion incremental tracks remain. Lift economy, fuel gains and speed can mix. Opposing descent styles, vessel/cache specialisations and deeper forks remain exclusive. No separate stat-points screen is introduced.

Added Deep Vessel (+20% base capacity), Boundless Vessel (+20% again, +40% total) versus Cache Feast (+8 internal fuel from large caches); Falling Star (+12% gravity), then Heavy Core (+6% gravity, +8% terminal fall) versus Low Arc (−8% Lift strength and cost). Earlier gentle-fall and effort paths remain. Opening capacity upgrades preserve 75% fill. Recovery Rests fill the enlarged vessel, including capacity bought during their service; other boons do not fill new space.

Glow is displayed as a percentage of current capacity throughout pickup feedback, Lift, Rest and event choices, route summaries, reserve panels and saved-run readouts. Ember prices remain numbers. Fuel gains are still absolute internally, making a bigger reservoir a capacity choice rather than a hidden pickup multiplier. The flight meter moves from the top to a compact vertical gauge at the left, with 10% ticks and a warm low-fuel state. The wisp's shrinking core uses the same normalized fraction.

Focused checks passed for starting transactions, all remaining companion incremental paths, opposing descent choices, TEST branch replacement, upgraded-capacity refills, save/load and clear carryover, reserve thresholds/draw limits, actual-engine pickup limits and percentage descriptions, plus death/resume regressions. Browser access was unavailable; no new mobile layout inspection or full balance simulation is claimed. Start a New Game for the opening grant; existing saves do not receive a retroactive budget.

## Collector orbit and curved delivery — 2026-11-13

Collector orbits every 1.8 seconds (previously 2.5), with slight breathing of the ellipse and a smoothly following centre. It remains more visible while its radius recovers. Reduced-motion mode retains a still orbit anchor.

Fetching now uses two bounded cubic Hermite legs in world coordinates. Outbound travel inherits orbit velocity, curves through the pickup, and carries its turn tangent into the return. Return blends into the moving orbit instead of repeatedly steering and snapping to a new target. Each leg's duration scales with its actual distance; the travelling companion and its cargo remain visible. A reserved eligible pickup remains fetchable after scrolling offscreen. Body pickup takes precedence, harmful/manual-only packets stay excluded, rewards happen once on delivery, and recovery begins only then. Window-height rescaling also rescales in-progress paths.

Focused 60 Hz probes across four departure phases: nearby 30-unit-offset targets returned in 0.367–0.633 s; farther 95-unit-offset targets took 0.567–0.867 s. Every paired far target took longer. Moving-player/fast-scroll, cancellation, single delivery, manual pickup and reduced-motion checks passed. Paths were plotted offscreen for inspection; production companion drawing and death/resume regressions passed. This is not a measured phone frame-rate benchmark.

## Visible harmful pickups and Glow–Seed–Glow chains — 2026-11-13

Added deliberate three-pickup chains with a red-ringed Dark Seed between two Glow lights. Early ordinary routes target one forgiving chain; later long flights two, harder/elite routes up to three. Spacing narrows from 108 to 100 to 84 world units with difficulty, with small slopes on later patterns. These coexist with more retained standalone seeds: keep up to two ordinary / three elite harmful slots before converting remaining niches to utility pickups.

Chains relocate two existing ordinary, non-introductory, non-landmark pocket lights. They preserve fuel quantity and pickup reward values, and keep separately placed accessible recovery lights intact. Each candidate must have clear straight travel and a 64-unit arcing bypass, including props and moving-terrain extrema. Unsafe placements are skipped, and local drafts cannot overlap the encounter. The middle penalty is the existing sight dimming: players can dodge, accept it and cleanse at the next Glow, or benefit from Kindler's learned Purify. No new forced-death trap, currency type or tutorial popup is introduced.

Focused checks: 30 layouts covering all 15 locations at tiers 1/4 produced 58 valid chains. All sampled straight/bypass paths cleared solid geometry at sway extrema. Actual flight physics collected both introductory Glow lights while avoiding the seed with one timed Lift in all three terrains. Seed dimming and follow-up Glow cleansing, Collector exclusion, unchanged fuel budget and draft separation passed. Two production-renderer frames were inspected offscreen; this is not a mobile FPS or human win-rate benchmark.

## Filled pickup radiance — 2026-11-13

Pickup contact circles now contain layered pixel radiance between the item and the boundary, replacing the mostly empty-shell appearance. Boons use pale warm light; danger/cost pickups use red light, with dark cores preserved. A small upper highlight softens the interior. Contact-ring dimensions and collection behavior are unchanged. Carried/absorbing body-only sprites omit the field, so the collected circle still disintegrates. Layers are baked into the existing cached pickup frames, with no new runtime lighting pass or animation atlas. Inspected production-renderer frames in two terrains; no balance simulations or phone-performance claim for this art-only change.

## Pickup-triggered Light branch: Dawnburst — 2026-11-13

Added Dawnburst directly beneath Inner Glow in the main-wisp Light tree, a distinct one-time 45-Ember purchase compatible with the existing long-range/resistance paths. Collecting natural Glow reveals the entire currently visible flight scene, not offscreen terrain or the expedition route map. Normal onset is 0.12 seconds, followed by 1.5 seconds of full visibility and 1.2 seconds easing back to existing sight/dimming. Reduced-motion onset is 0.35 seconds. New pickups refresh the reveal from its current intensity, preventing dark blinks, accumulated duration or excessive brightness.

Direct fuel, Collector deliveries, full-tank pickups and Kindler purification trigger the effect; currency, charge, sight-only pickups, unpurified harmful seeds and generated fuel do not. Existing cleansing and all fuel rewards are unchanged. The scene's existing fog composite blends out and back, leaving art and terrain silhouettes intact, without a white flash or new per-frame lighting pass. Simulation-time timing freezes during pauses; dying fades the reveal with the wisp.

Focused checks passed for the one-time purchase, full hold/fade timing, refresh behavior and pickup categories. Production-renderer frames were inspected at normal, fully revealed and fading states. No full economy or device-performance benchmark was repeated for this skill.

## Motion branch: three-rank Drift Sense — 2026-11-13

Added three sequential named nodes after Momentum: Drift Sense I (40 Embers, 0.7-second preview), II (55, 1.2 seconds), and III (75, 1.8 seconds plus a small wisp/contact echo). The line previews no new Lift/Power input and immediate release of held Leveler. It responds to current speed/vertical velocity, gravity and terminal-fall upgrades, Swift duration/resistance, release recovery/dive, local draft timing and moving solid geometry. It ends at the first contact, before shield deflection; higher ranks do not promise a safe landing.

The pale pixel line fades toward its tip and remains faintly visible in darkness without lighting terrain. The final contact echo is subdued amber; an unobstructed endpoint stays pale. No extra button, runtime text, targeting automation or pickup reward is added. Skill purchases belong to the current run and retain normal prerequisites/TEST overrides.

A bounded forecast copies nearby draft timers and integrates at the existing 60 Hz physics step, caching for 50 ms. It never mutates live draft triggers, fuel, pickups or companion state. Flap/Power/hold changes, resize and shield displacement invalidate stale results. At most 37 points are drawn, and unowned skills perform no prediction. Six focused comparisons (ordinary, gentle/heavy gravity, Swift expiry, future draft, Leveler release dive) matched actual no-input positions to numerical precision. Moving-terrain contact, cached reads, purchase gates and mutation isolation passed. Local calculation p95 was about 0.2 ms in the sampled desktop probe; this is not measured phone FPS. Production-renderer frames for all three ranks were inspected offscreen.

## Routes, victory rewards and recovery — 2026-11-13

The seven-stop route starts at three flights and repeatedly splits/rejoins, with visible Rest/Event/Treasure alternatives at rows 2 and 5. Every Rest has exactly one outgoing flight for Dream. Five symbols: Flight (ELITE is a label), Rest, Treasure, Event and Boss. Elite restrictions remain and ordinary paths are retained. Source inspiration: [Mega Crit's official Slay the Spire press kit](https://www.megacrit.com/press-kits/slay-the-spire/) describes procedural levels, relics and encounter variety. No copied assets or claim of balance parity.

Every successful flight offers two seeded artifacts and an 18-Ember alternative. One offer is build-relevant when possible; the other invites a change. Three equipped slots, replacement only, no backpack. Run artifacts reset on New Game; profile equipment is no longer inherited. Boss retains its persistent discovery reward. VictoryPending blocks further route selection/banking until reward and Next are acknowledged; skills can be learned during all victory checkpoints. Rest still controls fleet changes.

New artifacts: Dreamcatcher recharges companions on natural fuel pickups during replay; Second Dawn reveals the scene on first fuel after waking; Echo Vessel adds 10 Afterglow when finishing above 60% Glow; Glass Lantern adds 6 natural fuel but increases Lift cost 12%; Night Gardener restores 4 Glow per close seed pass, once per seed, capped at five per flight. Flight hooks are implemented by the Dream agent. Rewards have contextual synergy descriptions and seeded offers.

Victory recovery starts at 50% maximum Glow. Renewal raises to 55%, then 60%; sibling perks add 10% for low-Glow finishes or completing optional challenges. Afterglow is a 35-Ember Vitality skill, available before the boss. Overflow fills a 30-Glow reserve automatically spent before Glow. Branch upgrades add 10 capacity per rank (60 max), improve conversion by 10% per rank, or improve unused reserve retention from 80% to 100%. Example: finish at 70/100, recover 50, start at 100 + 20 Afterglow. New runs start without reserve. Retry restores the entry resource snapshot and spends a life, as before.

Six new event variants: Ember Dice (12% Glow for equal chances at 4/24/48 Embers versus safe 14); Lost Lanterns (fuel/currency/sacrifice-for-artifact); Wisp Bargain (+32 Embers with 12% next-flight Lift burden versus safe 10); Sanctuary (40% Glow/missing life/recovery blessing); Workshop (refund main branch including Afterglow descendants, free gift retained); Companion Shrine (blessing/discounted skill/Embers). The blessing improves next-flight companion recovery by 20%. Temporary effects persist across retries and expire after victory. Treasure offers two artifacts or 28 Embers. Dice outcomes cannot be rerolled by reloading.

Dream skills: base 4 seconds costs 35, 6 seconds costs 40, 8 seconds costs 55. Gentle Awakening costs 30 and Lucid Sight 35; all follow the Light branch. Values are provisional, not human-playtest findings.

Focused model probe: 90 maps, 180 single-exit rests, 1,170 branching nodes, valid paths/no consecutive elites, all choices across 12 event variants, artifact replacement/one-time claiming, recovery arithmetic, victory upgrade access, and a complete three-map campaign through final banking (15 flights). No full economy or phone-frame-rate benchmark repeated.


## Dream, clearer checkpoints, Collector and Glow Sense — 2026-11-13

Dream rehearsals run a fresh engine with the real next node/seed/build and never write run rewards or attempts. Recorded inputs replay at fixed simulation frames. Presets validate scene, build, resource and viewport configuration; changes expire them. Free Lift applies to the dream opening. Playback ends paused; one tap resumes with no Lift, a subsequent tap lifts, and a 2-second slow ramp (3 with Gentle Awakening) prevents surprise. Presets are retained for retries and cleared after success. Locked Dream links its Light-tree node. Rehearsal cannot buy skills mid-flight.

Rest resolves its recovery offering into a dedicated preparation hub: Skill Tree, Companions, Dream and Artifacts, with the one upcoming flight shown. Victory displays two artifact choices plus Embers, then Upgrade and Next; three filled slots require choosing a replacement. Affordable upgrades pulse, locked nodes can be inspected to highlight prerequisite paths. Future reachable map nodes can be inspected without committing; arrowheads are removed, and subdued label mist keeps route lines from crossing readable text. Dice results receive a separate outcome reveal.

Glow Sense (40 Embers after Inner Glow) hints at up to three approaching beneficial pickups, at their approximate height on the right light boundary. It excludes warning pickups and fades once items are lit. Cached nearby packet windows and analytical light falloff avoid canvas readback or new lighting passes. Collector reacts when its growing radius touches a boon contact ring, with immediate ring feedback and a curved tether only when fetching. Body pickup priority and warning exclusions remain.

Checks passed: model routes/rewards/overflow/full campaign, exact Dream replay and resource isolation, paused input handoff, Collector outer-ring/motion cases, Glow Sense visibility/filtering, and app markup/control-flow integration for victory/rest/Dream. Actual game renderer and route SVG previews were inspected offscreen. Local browser access was unavailable; phone usability and device FPS remain to be evaluated by playing the release. Reward and recovery values are starting settings, not a claimed finished balance.


## Earned opening progression — 2026-11-13

Reduced new-run starting Embers from 90 to 30, retaining the choice of one free root skill. This affords one small 25–30 Ember refinement or a saving toward a 35–40 Ember unlock; it prevents buying a multi-upgrade build before the first flight. Flight rewards, artifact choices, recovery and TEST resources are unchanged. Both starter labels now use the shared budget constant. Existing runs retain their wallet.

Focused economy check follows a real first victory: 30 start, 25 spent on Rising Light, 5 remaining; clear reward 32 plus 5 gathered gives 42; choosing 18 Embers instead of an artifact yields 60, enough for two 30-Ember improvements. Choosing the artifact instead limits immediate spending. This is an opening-pacing adjustment, not a claim that the entire economy is balanced. Artifact combination depth remains a separate design opportunity.


## Landscape, radial skills and four companions — 2026-11-13

Landscape is now the default play orientation. Pixel 10's 20:9 display is the reference; the interface also adapts to reduced browser height. The home screen, horizontal route map, briefing, support, victory and pause screens use the available width. Lift and Power remain at the lower right. Portrait displays a rotate prompt and pauses live play; returning sideways requires an explicit resume. Fullscreen requests orientation lock where supported, with a rotate prompt fallback. The in-app browser preview is set to 900 by 405; the 900 by 340 browser-chrome case was also inspected.

Flight keeps a 430-unit landscape world height and reveals more terrain horizontally, preserving speed, pickup geometry and physics. The pixel buffer preserves aspect ratio instead of stretching the portrait view. Dream presets now validate width as well as height, and a viewport change stops rehearsal or pauses replay safely.

Skill trees are radial constellations. Main-wisp branches retain individual upgrade nodes; companion multi-rank upgrades share a circle with rank pips and individually selectable ranks in the inspector. Prerequisites, prices and mutually exclusive choices remain. The selected effect is shown beside the tree, with readable disabled-button contrast and 44-pixel touch targets.

The four base companions are Collector, Protector, Runner and Space Timer (internal IDs swift and leveler are retained). Their permanent unlock tiers are Ascensions 1, 2, 3 and 4. The home roster always shows all four with small locks; normal selection respects unlocks, and TEST permits all four. Seer and Kindler are learned main-wisp effects: Echo Sight gives a two-second forward reveal on natural fuel collection with an eight-second cooldown; Kindled Touch adds six Glow to direct body fuel pickups. Their further nodes extend vision or add purification. These traits work with any base companion and add no action button.

An unprotected death spends one life and returns to the current route-map row. Failed-flight resources are restored and no partial rewards are retained. Players can choose connected alternatives; a Rest's single Dream exit gains same-row detours after a failure. Completed support sites cannot be repeated, and the final boss cannot be skipped. Zero lives still ends the run.

The first Warden is eased at low Ascensions: A1 openings are 15% wider, sway 15% smaller, spacing 8% longer, and moving-hand warning distance 20% greater. Easing tapers through A2–3; A4–6 keep the prior layout. Rewards are unchanged.

Focused checks passed for four-role selection and locks, route deaths and reward isolation, all-role main traits, landscape geometry, 44 radial layouts, Dream replay and the campaign loop. Actual browser inspection covered home/TEST Runner start, skill tree, route, flight, rotation, pause menu and death returning to route. This is responsive browser verification, not a Pixel 10 hardware FPS or human win-rate measurement.

## Accepted design priorities — implemented in relic-paths-1

1. Interacting artifacts with shared gameplay triggers, so a reward can change the run's plan. Example: surplus fuel accelerates companion recovery, linking precise pickups, Collector and Space Timer without requiring a fixed named pair.
2. Distinct previewed challenge and boss families that reward different builds: controlled tunnels, draft staircases and Dark Seed orchards, with a survivable main route and optional harder payoff.
3. Route and economic tradeoffs worth planning: fix the 18/28-Ember cash option versus 40-Ember artifact resale, vary route recipes and advertise reward themes while preserving the known next flight needed for Dream.

Reference: Mega Crit's official Slay the Spire overview (https://www.megacrit.com/press-kits/slay-the-spire/) and its GDC balance presentation (https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf). These priorities are design recommendations, not proven balance outcomes.


## Skill ownership, Forge and durable landscape preview — 13 November 2026

Ownership and next-rank affordability are independent: blue checks/filled ranks show learned perks, gold plus signs show purchases affordable now, bronze prices show reachable but unaffordable perks, and grey locks show unmet prerequisites. A partially learned multi-rank perk keeps a blue owned count and learned connecting path even when its next rank cannot be bought. Selection is a neutral outline. Deep undiscovered branches remain anonymous.

The proposed reroll forge is replaced by artifact salvage. Consume an owned common/rare/boss artifact for a fixed 25/35/50 Packed Light, directly spendable on run skills. Show the exact artifact and payout before confirmation, including permanent collection removal when applicable. No Glow fill, heart restoration, Condensation multiplier, or rest-boon consumption. No TEST catalog farming. Reward-screen Glow offerings remain their existing separate choice. Defining artifact evolutions and authored in-flight forks remain proposals, not implemented in this batch.

A dedicated preview.html embeds the actual game at 900×405 and scales it to fit the host panel. This survives tall sidebar resizing without a portrait rotation gate; actual phone play continues at the normal index URL. Larger framed Continue/New Game actions, visible Tutorial, and larger companion labels improve the landscape home screen.

Verification covers skill disclosure and rank ownership, fixed salvage accounting/duplicate-sale rejection, and actual landscape browser rendering. It is not a new campaign balance sweep or Pixel 10 hardware benchmark.

## Easier Edging, larger flight HUD and inward absorption — 13 November 2026

Edging accepts a 48-world-unit clearance from real solid boundaries, twice the previous band. Charge requires two seconds of accumulated skimming. Leaving the band holds progress for 1.25 seconds without adding charge, then loses eight percentage points per second. Hits reset progress; protected separation and Dream cannot charge it. Pulse duration/recovery stay five/two seconds. Edge Attunement reduces charge time to 1.6 seconds; Held Tension halves decay to four points per second. Natural fuel under Edging light deliberately qualifies for the already bounded Sunspool interaction.

Flight's left side is reserved for light: Packed Light above a larger segmented Glow bar, with no visible fuel numbers. Screen-reader meter values remain. The left inset is at least 42 CSS pixels and respects a larger reported safe area. Ascension, map and attempt hearts move to the top right beside MENU. Landscape player placement moves from a minimum 155 to 190 world units, also clearing measured meter bounds. Dream recordings are invalidated by the release fingerprint because placement affects flight timing.

Captured boon bodies shrink while making twelve accelerating revolutions over 1.8 seconds. Their contact shell fractures and collapses inward at the capture position in 0.34 seconds. This applies to direct pickups and Collector retrieval, without delaying fuel credit or changing collision/collection rules. Reduced motion uses direct contraction. Sprite and fragment counts remain bounded.

Verification uses existing focused Edging/skill checks, animation sampling, and actual browser HUD inspection at 900×405 and 740×333. Physical Pixel 10 notch behavior, phone frame rate and full-run balance remain playtest work.

## Artifact clarity, first-use teaching and visible resume — 13 November 2026

Rarity and lifetime are separate. Reward generation rolls rarity before choosing a theme or useful combination. Ordinary paired offers target a 15% chance of containing a rare; challenge clears 25%, treasure 30%. Elites guarantee at least one rare, map finales offer rares, and bosses offer boss relics. On the same 1,000 first-flight seeds, any-rare incidence changed from 78.3% to 16.5%; challenge clears changed from 81.0% to 25.2%. This checks offer distribution, not complete campaign balance.

All artifacts act automatically in flight. Reusable artifacts remain equipped for the run; their trigger limits/cooldowns are stated separately. Boss relics retain their permanent collection unlock. Two common consumables introduce a clear finite lifetime: Glow Wick gives up to 3 displayed Glow on each of three natural fuel pickups; Flash Stone reveals the scene for 1.5 seconds on each of two pickups. Bonus Wick fuel cannot produce Packed Light. Charges persist across successful flights, and depleted relics free their slots on clear. Failed/interrupted attempts restore entry charges, matching other attempt resources. Moving slots cannot refill them. Duplicate stacking is pending, not implemented.

Rewards show one artifact OR immediate Glow; selecting one previews the exact mount/replacement/collection consequence before confirmation. Artifact management shows mounted slots and one selected effect with Keep/Mount OR Forge choices. Mounting an empty slot is direct; replacement and forging confirm the loss. Forge descriptions now consistently promise Packed Light, not the old Glow conversion. Skill spending remains separate from slot management. TEST catalog choices are collapsed; TEST artifacts cannot be sold.

First-use effect notices are sourced from real effect hooks, including passive effects. Show at most one new artifact lesson per flight, pause safely, and remember it across runs. The lesson points at the equipped artifact and has one Resume slowly action. Live counters show consumable charges, including during pause. A centered GAME SPEED overlay follows a linear 0.1× to 1× resume over three seconds and disappears at full speed. Gentle Awakening retains a benefit by extending Dream wake to four seconds.

Black Hole theft uses approximately five-times-larger particle heads and twice the emission, with deterministic varied paths tightening into a funnel. A 96-mote cap, simple pixel rectangles and reduced-motion limits bound rendering work. Drain mechanics are unchanged. Focused checks cover charge accounting/rollback, no bonus-currency minting, Dream determinism, resume timing, rarity distribution and bounded cosmetic rendering. This is not a new Pixel 10 hardware benchmark.

Latest feedback is registered in BACKLOG.md: one-unit Glow segments, grid-aligned crisp fill without stretching, pixel overflow beam, duplicate consumable stacking, and interactive scenery outlines. These are pending a later visual/gameplay pass.
