# Wispbound request-to-code audit

Audit date: 13 November 2026. Scope: the chronological requests in this conversation, the current source, decision log and existing targeted probes. Repeated requests are consolidated into the same row. This is a source audit, not a claim of phone usability, 60 FPS, human win rate or a new deployment.

## Status and release boundary

- **Implemented**: an active code path performs the requested behavior. This does not mean its balance or art has been approved through play.
- **Partial**: the underlying feature exists, but a still-current part or its practical verification is missing.
- **Missing**: no active code path was found.
- **Superseded**: a later user decision explicitly replaced it; restoring it would be a regression.
- **In progress**: the current root/agent batch owns it. It is not counted as completed here.

The recorded released baseline is the landscape/four-companion/radial-tree batch, through local HEAD `f5f41e2` (following `8881fa8`). Its release and browser inspection are recorded in `DECISIONS.md` under “Landscape, radial skills and four companions.” I did not query Pages or deploy. The three subsequently approved replayability systems are present in the current uncommitted working tree and must be described as **local/unpublished**: artifact trigger interactions, encounter/boss families, and route/economy recipes. The new audit fixes and current Glow/HUD/progression changes are also unpublished.

`DECISIONS.md` is chronological, not a current specification: its opening tables still mention cards, portrait, three old companion roles, permanent stat tuning and old Afterglow. Later sections and the most recent explicit user decisions take priority.

## Latest requests and ownership

| Request | Status at audit start | Actual source / remaining action |
| --- | --- | --- |
| Landscape HUD must clear the notch, move the wisp farther right | In progress — root/flight agent | `dist/landscape.css`, `dist/flight.mjs` player/resize positioning. Audit does not call this complete before the current patch. |
| Baseline illumination should be circular, physically decreasing away from the wisp | In progress — flight agent | Existing `WispFlightView.lightMask()` in `dist/wisp-renderer.mjs` uses softened inverse-square attenuation, but `lightFog()` still applies a doubled forward mask and screen-centred horizon. Latest circular-baseline correction supersedes that earlier requested horizontal stretch. |
| Glow should use a 30-unit base and whole numbers instead of percentages | In progress — model/root | At audit start `FLAME_TUNING.maximum` is 100 and `formatGlow()` returns percentages in `dist/vitality.mjs`. Gauge and copy use shared formatting, but raw effect strings also need consistent conversion. Earlier percentage requests are superseded. |
| Always show a small Afterglow bar above Glow, including locked state; blocked overflow should shake; unlocked natural pickups should spill into it | In progress — root/model/flight | At audit start `glowGaugeMarkup()` hides an empty reserve and `storedGlowPanelMarkup()` hides a locked/empty one; `finishFlight()` stores victory overflow. Existing behavior does not yet satisfy the latest always-visible/live-pickup request. |
| Roughly one skill node every two flights; no more than 60% of the trees by final boss | In progress — model/economy agent | Current `nodeEconomy()`, `getSkillCost()` and skill definitions are the relevant budget path. Existing scripts are evidence of earlier configurations, not proof of this new target. |
| TEST unlock override must be separate from a 10,000-Ember grant | In progress — model/root | At audit start `setTestOverride()` still grants money and Afterglow. Selection override itself already works through `getCompanionUnlock()` / `setStartingCompanion()` / `setCompanions()`. |
| Audit all prior requests and implement surviving gaps | In progress — this audit | Main actionable unclaimed gap found: separate practice no longer walks through the route, current checkpoint rewards and rest tools. See tutorial findings below. |

## Flight, survival and controls

| Request, in chronological order | Status | Active implementation / qualification |
| --- | --- | --- |
| Tap to fly, more forgiving drop, higher travel speed, but meaningful timing | Implemented; tuning remains provisional | `dist/flight.mjs`: `FLIGHT_TUNING`, `flap()`, fixed-step `step()`. Glow spent per Lift, free gliding, authored terrain/pickup placement. Different speed/lift/fall skills alter the tradeoff. |
| One hand, at most two lower-right action buttons | Implemented | `dist/app.mjs`: `bindFlightControls()` / `launch()`; `dist/boost-control.mjs`. Lift plus Power, with Collector/Protector passive. Space Timer uses the same held Lift/scene input. No third flight action was added. |
| Scenery should be the obstacles; no Flappy Bird bars | Implemented | `buildFlightLayout()`, `makeCourseLandform()` and `circleHitsObstacle()` in `dist/flight.mjs`; shared solid polygons in `dist/scene-props.mjs`. Terrain contours, arches, roots, buildings and vegetation collide directly. |
| Flapping consumes the wisp's light; collecting light sustains flight | Implemented | `flap()`, `spendGlow()`, `collect()` in `dist/flight.mjs`, tuning in `dist/vitality.mjs`. Glow and Ember currency have separate effects and displays. |
| Zero Glow should disable Lift and allow falling/recovery, not instant death | Implemented | `flap()` rejects insufficient fuel; `step()` continues physics and companion collection. Death is through collision/bounds, not an empty-fuel immediate finish. Fuel collection can restore Lift. |
| Remove damage hearts; fatal collision spends one of three run attempts | Implemented | `beginDying()` then `finish(false)` in flight; `finishFlight()` in model subtracts one life, restores entry resources, removes failed route choice and returns to the map. `LIFE_TUNING` starts at three. |
| Open bounds are hazards unless the Protector deflects | Implemented | Flight collision/bounds share Protector handling; `getShieldState()` and shield separation logic. Runner does not grant terrain immunity. |
| Thin visible shield, recovery, cracks/dimming, push to clear space | Implemented | Protector charge/Glow checks in `dist/flight.mjs`; `WispFlightView.drawProtector()` and companion welding animation in `dist/wisp-renderer.mjs`. Actual collider separation is checked; an empty/underfunded ward cannot save the attempt. |
| Death should disintegrate for about two seconds before menus | Implemented | `beginDying()` sets `dyingDuration=2`; fixed-step death phase delays `finish(false)`; renderer dissolves the orb and scatters particles. |
| Failed attempt should return to the map and allow alternatives | Implemented in recorded baseline | `finishFlight()` restores snapshot, removes failed node, sets phase `map`; a Rest's one outgoing Dream edge gains same-row flight alternatives after failure. Final boss remains mandatory. |
| Popups/resume must not cause surprise death | Implemented | `pause()`, `resume()`, `resumeScale`, `tick()` and app `resumeFlight()` reset accumulator and ease from slow time to full speed. Existing `scripts/resume-probe.mjs` covers paused handoff. Dream wake additionally consumes the first tap without Lift. |
| Levels about three times longer | Implemented | `dist/level-length.mjs`: multiplier 3; `makeMap()` durations and `buildFlightLayout()` three paced legs. Practice remains short. |
| End lantern should sit near the final real scenery and be grounded | Fixed locally after latest feedback | Previous code still used underground closure vertices and a mid-air `height*.5` lamp. `visibleCourseEnd()` now clips full-sway solids/props to the visible band; `flightEndDistance()` installs a real shallow landing and finishes 26 world units beyond visible terrain. `drawExitLandmark()` draws a recessed shelter and attached lamp on that landing. Doorway is background; only the visibly solid foundation collides. |
| Level clear should illuminate the scene over 1.5 seconds | Implemented | `finish(true)` enters `completing`; `step()` waits 1.5 seconds; renderer uses `completionProgress`. Victory screen follows this reveal. |

## Companions, pickups and light feedback

| Request | Status | Active implementation / qualification |
| --- | --- | --- |
| Neutral main wisp, colored simple orb companions; no Fire/Ice | Implemented | `dist/companion-art.mjs` uses circular pixel orb silhouettes and role palettes; `mainSprite()` uses neutral white/grey. Fire/Ice roles are absent. |
| Main wisp circular, slightly smaller, no persistent tail | Implemented | `mainSprite()` draws a dithered circle; `drawMain()` scales by .85. Short action/collection particles remain, not a continuous phoenix trail. |
| Glow depletion should darken outside-in with a pale shell, not a black centre | Implemented | `mainSprite(fuel)` shrinks the luminous core, dithers 2px cells and preserves an irregular pale rim. This supersedes the older inside-out black-hole request and temporary red-core idea. |
| Light radius upgradeable and inverse-square-like | Implemented except newest shape change | `getRunModifiers()` light skills feed `getLightState()`. `lightMask()` bakes softened inverse-square attenuation plus exposure/cutoff; it is not a literal unbounded point-light simulation. Latest circular shape is assigned above. |
| Much darker distant landscape, brighter collidable edges | Implemented; visual approval remains subjective | Fog outside light is strongly opaque; terrain surface/edge accents and prop art use the same world geometry. `WispFlightView.lightFog()`, `terrainImage()` / surface cache and `scene-prop-art.mjs`. |
| Collector assists missed pickups; body has first chance | Implemented | `WispCompanion.update()` in `dist/wisp.mjs` only considers beneficial packets that have passed the body approach/contact window; body `collect()` remains independent. |
| Collector fetch and return smooth, travel duration depends on distance | Implemented | `beginLeg()`, `advanceLeg()` and `returnToOrbit()` use curved world-coordinate legs and duration based on distance/outbound or return speed. Orbit resumes on arrival. |
| Companions orbit like electrons; active role-specific motion | Implemented | `wispOrbit()` in `dist/wisp.mjs`; `getCompanionStates()` / renderer role effects. Protector welds the recovering shell; Runner surges; Space Timer levitates/bobs. |
| Collector about 5–6 seconds to recover, range collapses then expands; can fetch close items while recovering | Implemented | `WISP_TUNING.cooldown=5`, `recoveryFraction()`, usable range starts at 18 plus upgrades and grows toward 105 base reach. No full cooldown lock blocks close rescues. |
| Collector boundary should visibly touch boon boundary and react consistently | Implemented | `collectorContains()` and `WispCompanion.update()` include `pickupContactRadius()`; `detectedUntil`/boundary feedback precedes fetch. Current circular visual and targeting share the same state. |
| Subtle fuzzy/vibrating boundary, not dotted/filled aura | Implemented | Renderer collector ring uses a low-opacity uneven outline driven by the current recovery radius. The terrain-reshaping aura is no longer called by live flight. |
| Collector field should deform around terrain while preserving area | Superseded by explicit performance fallback | `computeCollectorAura()` remains an unused geometry module; live `getCollectorAuraState()` returns a cheap circle. User explicitly permitted reverting if reshaping could not remain smooth. Do not silently restore the heavy path. |
| Only Collector automatically collects | Implemented | `WispCompanion.enabled()` checks `hasCompanion('collector')`; all other roles require direct pickups. Dark/Dusk are manual-only via `canCompanionCollect()`. |
| Additional companions purchased as a build choice; change at rests | Implemented | `main-bond`, `getCompanionCapacity()` (one to three), `setCompanions()` / `canChangeCompanion()`. Starter and rest preparation allow choices; flight/attempt snapshots lock them. |
| Four final companion roles with progression locks, TEST can pick any | Implemented | `COMPANION_ABILITIES`: Collector A1, Protector A2, Runner A3, Space Timer A4. Home roster shows all four; `getCompanionUnlock()` distinguishes locked-but-test-selectable. Six-role proposal was replaced explicitly by four roles plus learned main traits. |
| Space Timer held levitation, charge only drains while held, release ends it | Implemented | `beginLiftInput()`, `updateLeveler()` and `endLiftInput()`; held threshold .18s. Releasing recharges and allows natural fall. Uses Lift/scene, not Power. |
| Levitation bob/steadiness and release-dive upgrades | Implemented | `getRunModifiers()` leveler steadiness/dive fields; `step()` incorporates bob, local drafts and release dive. Does not perfectly freeze position or ignore wind. |
| Power button fill instead of overflowing status text, sparkle at full | Implemented | `boostControlMarkup()` / `updateBoostControl()`; fill represents Collector radius, shield recovery, Runner cooldown or Leveler charge. Ready transition triggers particle CSS once, reduced-motion honored. |
| Fewer meaningful packets in terrain pockets, plus easier central fuel on low difficulty | Implemented; final balance unproven | `buildFlightLayout()` pocket authoring, `addAccessibleGlow()` and ascent/cadence rules. New family layouts preserve mandatory fuel count. Current economy/balance targets are being changed separately. |
| Multiple pickup types/sizes, positive versus negative rings and distinct contents | Implemented | `PICKUP_TYPES` / `pickupKind()` in `dist/pickups.mjs`: Light, Cache, Embers, Charge, Sight, Dusk, Dark. `pickupDisposition()` and `drawPickup()` use bright boon rings/filled radiance versus red warnings. |
| Pickup contact circles 20% smaller | Implemented | `type()` applies `contactRadius*.8` consistently; detection uses shared contact radius. |
| Pickup ring disintegrates, packet orbits at least three times and spirals inward faster | Implemented | `shatterPickupRing()` in flight; `drawAbsorptions()` in renderer uses >4 rotations in normal-motion animation. Reduced-motion intentionally removes rotations. |
| Dark Seed negative pickups and light–dark–light temptation chains | Implemented, expanded locally | `installRiskChains()` and optional dark niches; `collect()` applies dimming, light clears it. New `seed-orchard` family authors more explicit bypassable chains. Negative pickups are actual runtime items, not just preview text. |
| Pickup-triggered full reveal, drift trajectory, forward boon hints | Implemented | `main-dawnburst`, `main-drift-sense` I–III, `main-glow-sense`; flight hooks plus `dist/flight-projection.mjs`, `dist/glow-sense.mjs`. Projection is predictive aid, not a future-input solver. |

## Run structure, progression, choices and variety

| Request | Status | Active implementation / qualification |
| --- | --- | --- |
| New Game / Continue / Exit / Abandon; separate Tutorial front page | Implemented | `homeMenuMarkup()` in `dist/run-menu.mjs`; app `requestNewGame()`, `exitToMenu()`, `requestAbandon()`, `enterTutorial()`; model suspend/abandon/start/leave functions. |
| A run has three maps, then advances Ascension difficulty | Implemented | `createRun()`, `advanceMap()`, `secureBoss()`; `ascent.mjs`. Boss only at third map finale; first two finales move to next map. TEST victories do not unlock profile difficulty. |
| Branching dependency-style map, readable reachable choices and future previews | Implemented | `makeMap()` real `nextIds`; `getChoices()` respects edges and elites; `drawLandscapeMap()` draws horizontal branches with touchable nodes and future preview actions. No decorative arrows pretending to be dependencies. |
| Maximum five familiar map categories and improved icons | Implemented | `MAP_STOP_TYPES` and `mapStopIconMarkup()` in `dist/map-guide.mjs`: Flight, Rest, Treasure, Event, Boss. Elite is a flight badge; finale uses flight/exit, not new categories. |
| More consequential rest availability and varied map recipes | Implemented locally/unpublished | `ROUTE_RECIPES` defines six different row schedules; `makeMap()` assigns real services, edges and themes; `getRouteForecast()` reports upcoming rests/risk. Ordinary completion route, no consecutive elites and one known post-Rest flight are maintained. |
| More distinct terrain/biomes, vegetation, houses, objects | Implemented | 15 `LEVELS` across three terrains (nine base + six `EXTRA_LEVELS`); authored course cells and themed solid props include trees, huts, ruins, mushrooms, bridges, columns. Shared collision/render geometry. |
| Local wind puffs, stronger meaningful effect, safe readable bypasses | Implemented | `DraftField` / `createDraftZones()` in `dist/drafts.mjs`: one-shot warning, localized footprint, bounded force and full-sway/prop geometry guards. No global rapid wind cycle. Runner resists; Leveler still feels drafts. Human balance not established. |
| Distinct previewed encounters and a substantively different second boss | Implemented locally/unpublished | `dist/encounter-families.mjs`, `getAuthoredChallenge()`, `installEncounterFamily()`: controlled tunnel, rising draft staircase, Dark-seed orchard. `boss.mjs`: Warden and Moonweaver (crescent slalom / moving loom). Model previews and engine consume same IDs. |
| Safe ordinary path with optional demanding reward | Implemented locally/unpublished | Family installer uses full-sway collision guards, preserves ordinary fuel, provides orchard arc bypasses; optional currency caps at two 8-Ember pickups. Boss geometry probe checks connected body-width corridor, not human win rate. |
| Rewards and progress after every successful level, not after death | Implemented | `finishFlight()`, `settleCheckpoint()`, `makeFlightReward()`, `renderVictory()`. Clear/pickup/challenge Embers settle once; failed flight rewards are discarded. Local boss reward is a permanent relic choice instead of useless end-run currency. |
| Choose two rewards or currency, three artifact slots, replace/keep | Implemented | `makeFlightReward()`, `chooseFlightReward()`, app reward offers/replacement sheet. Three artifacts, no reserve inventory; declining an offer keeps build and permits cash alternative. |
| Artifacts should create combination engines, not only flat stat bonuses | Implemented locally/unpublished | `ArtifactEffects` in `dist/artifact-effects.mjs` subscribes to bounded natural-pickup, overflow, companion-work, recharge and Dream triggers. Artifact tags and `artifactSynergy()` explain combinations. Trigger guards/cooldowns prevent generated effects recursively farming themselves. |
| Boss artifacts persist and can be mounted/traded | Implemented | `secureBoss()` permanent choice and `profile.ownedArtifacts`; `equipArtifact()` / `sellArtifact()` gated to safe contexts. Relic reward structure improved locally. Current root batch should retain clear run versus permanent labels. |
| Fix cash-versus-resale arbitrage, preserve meaningful economy | Implemented locally; pacing still in progress | `nodeEconomy()` and artifact `sellValue` tiers remove the universal old 40-Ember resale over 18/28 cash choice. New one-node-per-two-flights target supersedes earlier provisional values. |
| Rest offers full Glow, full hearts, or currency; Ember skills raise max hearts | Implemented | `rawSupportChoices()` camp branch, `resolveSupport()`; `getLifeCapacity()` caps three base hearts at five through `main-spare-spark`/`main-deep-reserve`. Recovery choice fills all missing hearts, no per-collision health points. |
| More beneficial sites, chests, dice and trade events | Implemented | Treasure nodes plus 12 `EVENT_SCENARIOS`: deterministic dice, bargain, sanctuary, workshop respec, companion shrine and other trades. Rewards preview stakes; one cast/result is tied to node/seed. |
| Skills belong to the run, not an outside permanent stat-point menu | Implemented | `run.skills`, run wallet, `getSkillCost()` / `buyCheckpointSkill()`; old flat tuning UI is not the current menu. Permanent profile primarily tracks difficulty/companions/artifacts. |
| Starting gift plus modest Embers, meaningful light/motion/fuel choices | Implemented | `chooseStartingSkill()` chooses one free root; `STARTING_EMBERS=30` at audit start. `MAIN_TUNING_SKILLS` includes capacity, Lift effort, greater or gentler fall, recovery, Dream and visibility traits. Budget may be adjusted by current economy owner. |
| Tree truly branches with smaller increments and clear prerequisites/affordability | Implemented | `radialTreeLayout()`, `treeCanvas()`, `treeDetail()`; radial circles, prerequisite links, selected ancestor paths, price/lock states. Companion ranks use pips and explicit rank purchase actions. |
| Show only owned/equipped companion skill trees | Implemented | `treeHeader()` tabs use `run.companions`; `getAvailableUpgrades()` restricts branch set. Unused legacy Seer/Kindler palette entries are not selectable companion branches. |
| Dedicated Skill Tree button; available at each victory | Implemented | App map button/rest hub/victory Upgrade action; `canBuyCheckpointSkills()` allows victory and safe setup/rest, forbids active attempts. |
| Progressive discovery rather than all mechanics on day one | Partial | Companion locks, prerequisite skills, pickup first-seen coach and optional key exist. Dedicated practice currently omits strategic checkpoint teaching; fixed below. Current economy gating also under revision. |
| Glow recovery after flight, upgrades, capped carryover/penalty | Implemented except newest live-spill UI | `getRecoveryRules()` baseline 50% max and conditional upgrades; `finishFlight()` clamps Glow, stores overflow if unlocked, applies reserve retention; automatic reserve spending in flight. Newest display/live-spill request is owned above. |
| Afterglow comes before first boss as a learned skill | Implemented | `main-afterglow` sits under main fuel branch; buying it sets run unlock. The older first-boss-only and permanent-bank design is superseded. |

## Dream and learning

| Request | Status | Active implementation / qualification |
| --- | --- | --- |
| Dream available at each Rest, one known next flight | Implemented | `restReady`, one `nextIds` edge after camp, rest hub `dreamRestMarkup()`; locked button points to `main-dream`. Other support types deliberately do not offer full Rest service. |
| Rehearse exact next map opening repeatedly, starting at four seconds | Implemented | `attachDream()` records real fixed-frame inputs against the same seed/node/build; `dreamConfig()` 4/6/8s. App retry/preset/back actions do not spend attempts or settle normal rewards. |
| Preset opening autoplays free of sustain/Lift cost, then pauses | Implemented | `dream.freeGlow` skips flight drain/Lift spend; replay ignores live gameplay inputs until recording ends; phase becomes `awakening` and stops RAF. `wakeDream()` first tap only resumes; later tap lifts. |
| Closed-eye recording marker and pause marker | Implemented | `dreamIndicatorMarkup()` uses closed-eye SVG for active Dream and pause bars for ready/awakening states. |
| Dream and recovery upgrade trees | Implemented | `main-dream-*`, `main-recovery-*`, `main-afterglow` and reserve branch in model/main-tuning. Preset fingerprint invalidates a changed build/view, avoiding replay mismatch. |
| Separate safe tutorial, slower/lax pacing and contextual symbols/mechanics | Implemented locally after audit repair | `startTutorial()` suspends normal run; practice is 36s Flight → Rest → 44s Flight, with isolated wallets. `checkpointTutorialLesson()` now supplies one brief spotlight at route/reward/Rest/preparation/skill/result checkpoints, optional symbol-key teaching, and a Dream hint after learning it. Existing calm flight/world teaching remains. |
| Practice should teach victory rewards and upgrades on actual UI | Implemented locally after audit repair | Model now exposes the first practice victory's actual two-artifact/Ember choice; practice cash credits `practiceEmbers`. Final practice flight still goes to completion. Root wired current `.reward-offers` and preparation screens; normal profile/rewards stay separate. |
| UI spotlight should identify symbols in context, without information dump | Implemented locally after audit repair | `createTutorialCoach()` handles focus/spotlight/skip/back; `checkpointTutorialLesson()` returns at most one short hint per visit, with seen/skip guards and no ordinary-run popups. Old dead multi-step table and obsolete selectors were removed. |

## Presentation, performance and delivery

| Request | Status | Active implementation / qualification |
| --- | --- | --- |
| Game UI rather than web cards: framed art, pixel font, low text density | Implemented iteration; aesthetic remains a play-review item | `assets/wisp-shrine-menu.png`, pixel font, `game-art.css`, `landscape.css`, `radial-tree.css`, `run-menu.mjs`, compact HUD. This audit cannot prove the user will consider the interface polished. |
| Disabled controls readable | Implemented in baseline; root auditing latest | `radial-tree.css` and later landscape/readability overrides use explicit readable disabled text rather than whole-element opacity. New HUD/30-Glow changes must preserve it. |
| Mobile-first visibility, map nodes tappable, landscape-first latest direction | Implemented | `landscape.mjs` / CSS, 44px tree targets and large SVG node hit rectangles, portrait rotate prompt, pause on orientation change. Latest notch/body-position adjustment is in progress. |
| Use a game renderer, cached art plus dynamic light | Implemented | Active `WispFlightView` is a low-resolution Canvas pixel renderer with cached terrain/material/pickup sprites and dynamic reusable light masks. Game simulation is fixed-step and input-driven; it is not DOM-box gameplay. Pixi/Three assets remain legacy but are not the active visual path. |
| Smooth motion and stop intermittent zero-FPS hiccups | Partial verification | Fixed-step simulation/interpolation, bounded nearby lists, cached terrain/pickup/light data, prewarming and the circular Collector fallback are implemented. `attachFlightPerformance()` captures foreground frame gaps/CPU/long tasks in `?perf=1`. No actual Pixel 10 trace proving 60 FPS or removal of all hiccups is present; browser/Node timing is not device evidence. |
| Balance around human mistakes, not perfect pickup bots | Partial verification | Existing `balance-flight.mjs`/economy/synergy scripts and geometry probes inspect seeded mechanics. They do not establish human frustration, touch timing or success rates. Current balance targets need retained scenario checks plus later phone play, not a claim of finished balance. |
| Batch queue before tests/deployment; publish only when authorized | Implemented process constraint | Current work remains local. Historical requests repeatedly pause and resume work; newest instruction authorizes audit/build, no deploy in this agent scope. No broad simulation was run for this audit. |
| Public GitHub repository and phone URL / localhost fallback | Recorded delivered earlier; not reverified here | Git remote is `https://github.com/MocanuMarius/orbix.git`; `server.mjs` provides local preview, Pages workflow exists. Current local features are not implied to be live. Root should give a verified release link after authorized publication. |
| Document decisions | Implemented but needs current-state distinction | `DECISIONS.md` records chronology. This audit explicitly marks superseded choices; the top of the decision file should not be presented as the final spec. |

## Explicitly superseded requests (do not restore)

1. Phoenix character, realistic 3D wing animation, fire trails and PBR mountains → neutral low-fi pixel wisp, cached scenery and dynamic light.
2. Fire/Ice carriers, Gravity pickup attraction, six final companion roles → four base companions; Echo Sight/Kindled Touch/Purifying Touch are main-wisp traits.
3. Three active cards/deck tuning plus point-distribution sliders → run skill trees and three artifact slots; keep meaningful reward choices, not the old card/stat UI.
4. Damage hearts, instant local respawn, protected Boost → fatal collision spends run life; Protector alone provides charged deflection; Runner still collides.
5. First-boss-only/permanent Afterglow bank, manual reserve draw, hide empty Afterglow → learned in-run reserve, automatic spend, latest always-visible reserve request.
6. Large central black hole showing fuel → outside-in charcoal/dithered depletion with pale shell.
7. Terrain-conforming area-preserving Collector aura → cheap growing circle after explicit smoothness fallback.
8. Dotted Collector line and hard no-fetch cooldown → soft boundary, continuous recovery radius and close rescues during recovery.
9. Portrait-first interface and long vertically scrolling tree → landscape-first horizontal map/radial skill display.
10. Doubled baseline forward light and percentage Glow displays → latest circular baseline and 30-unit whole-number Glow direction.
11. Exactly seven fixed Flight/Support rows in every map → still seven stops, but latest approved recipes vary Rest/Treasure/Event timings and meaningful forks.
12. Tests always skipped → temporary queue pauses were later lifted; current audit uses reading and bounded checks, not broad repeated balance sweeps.

## Highest-priority surviving gaps found

1. **Practice teaches flying but not the current run loop.** The dormant tutorial table is not wired, selectors have drifted and practice never sees victory rewards. Repair with one contextual checkpoint hint at a time, actual practice reward UI, optional symbol key and safe Dream rehearsal; preserve separate practice resources.
2. **Newest HUD/Glow/Afterglow/pacing requirements are not yet complete at audit start.** These are already owned by root and active agents; do not count old percentage/hidden reserve behavior as done or implement competing fixes.
3. **Performance and human balance remain evidence gaps.** Production diagnostics and focused probes exist, but a Pixel 10 capture and human play are still needed to substantiate “smooth at 60 FPS” or “balanced.” No additional feature needs to be invented to conceal this limitation.

No other high-priority surviving mechanic from the supplied history was found completely absent. Some earlier requests remain in dead modules/old notes, but their current replacements are implemented. The aesthetic, pacing and strategic depth judgments still require hands-on review of the unpublished build.

## Evidence consulted (not rerun by this audit)

Existing targeted probes: `scripts/dream-probe.mjs`, `resume-probe.mjs`, `four-companions-probe.mjs`, `companion-hold-probe.mjs`, `collector-motion-probe.mjs`, `companion-render-probe.mjs`, `radial-tree-probe.mjs`, `main-traits-probe.mjs`, `glow-sense-probe.mjs`, `dawnburst-probe.mjs`, `projection-probe.mjs`, `risk-chain-probe.mjs`, `world-variety-probe.mjs`, `planning-loop-probe.mjs`, `artifact-engines-probe.mjs`, `routes-economy-probe.mjs`, `permanent-boss-reward-probe.mjs`, and local `work/encounter-family-probe.mjs` / `work/boss-easing-probe.mjs`. Their existence or historical passing result does not validate changes made after their last run.

## Current-batch addendum (local, unpublished)

The snapshot above records the audit's starting point. Subsequent source inspection confirms these changes; publication and remaining integration checks belong to the root release task.

| Item | Updated status | Evidence |
| --- | --- | --- |
| Calm strategic practice walkthrough | Implemented locally | `dist/tutorial-steps.mjs` now exports `checkpointTutorialLesson()`; app imports it in `guideScreen()` and invokes it for symbol key and skill sheets. One short lesson per checkpoint, only practice. Focused checks passed for ordinary-run exclusion, seen/skip guards, maximum one step and contextual Dream. |
| Practice reward choice | Implemented locally | `finishFlight()` exposes first practice victory; `chooseFlightReward()` credits practice wallet instead of real Embers. Tutorial's final flight stays a direct practice completion. |
| Grounded arrival, remove dead tail | Implemented locally | New `dist/exit-landmark.mjs`: clipped visible solid extent, shallow collision-matched landing, background shelter arch, supported lamp. `getExitLandmarkState()` shares world entry plane and resize-safe coordinates; both renderers use `drawExitLandmark()` behind the player. Boss overlay skips foundation. A small shared lamp light reaches the landing so its feet remain faintly visible on approach. |
| Exit geometry checks | Passed, focused | `scripts/exit-landmark-probe.mjs` covers 12 fixtures: all three terrains, both bosses and practice at 430/620 heights. Arrival plane has 15-unit full-sway clearance; visible foundation collides; doorway does not. Repeated queries do not duplicate geometry. Compared with old endpoint, 46–131 empty world units are removed in these fixtures. Existing 1.5-second clear illumination remains. |
| Circular baseline light and HUD clearance | Implemented locally | Flight camera reframes around `playerScreenX` (155 base landscape plus notch/gauge clearance), preserving world timing. Renderer uses circular baseline mask; special traits/pickups can still extend vision. Final phone inspection remains necessary. |
| 30-point whole-number Glow | Implemented locally | `GLOW_DISPLAY_SCALE=.3`, `glowPoints()` and `formatGlow()` preserve fine 100-unit internal simulation precision while showing a stable 30-point base to the player. Capacity improvements do not redefine a displayed point. This is a presentation unit conversion, not a claim that physics now rounds each cost. |
| Always-visible Afterglow, live overflow feedback | Implemented locally | New `glowGaugeMarkup()` locked/empty reserve remains visible; flight tracks natural pickup surplus/stored/wasted; HUD receives live spill/block feedback. Victory carryover remains separate. |
| TEST unlocks versus money | Implemented locally | Model separates `setTestOverride()` from `grantTestEmbers()`. Grant defaults to 500 at the inspected source; it is an explicit action, not an automatic 10,000 bankroll. Root must ensure the visible button matches the intended grant amount. |
| Slower skill purchase pacing | Implemented values; target verification owned by economy agent | Main/companion costs now generally begin around 80–110, with costly capacity branches. Exact one-node-per-two-flights / <=60% final-tree-ownership result should be reported only from the economy agent's current-version scenario evidence. |
| Artifact socket progression (new latest request) | Implemented locally; UI integrated | `getArtifactCapacity()` starts A1 at 3, A2–3 at 2, A4+ at 1. The separate **RELICS** branch contains three reliquary nodes adding one slot each for 140/280/560; global cap 6. Thus maximum with these three nodes is 6/5/4 respectively. `getNextArtifactSlotSkill()` exposes the next unlock. Slots, replacement choices and inventory use actual capacity; locked-slot buttons open RELICS. Root browser inspection confirmed the first slot purchase debits 530→390 Embers and expands the UI. This supersedes the earlier fixed-three-slot limit. |
| Powerful boss-only artifact tier | Implemented locally; audit-discovered gating error repaired | `BOSS_ARTIFACTS` marks three powerful bundles (`sunheart-engine`, `dream-sovereign`, `hollow-covenant`) with boss rarity. `makeFlightReward()` now checks `node.boss===true` for this tier. Maps one/two nonboss finales instead draw from `RARE_ARTIFACTS`; normal routes exclude boss artifacts. This corrected an actual draft implementation gap found during the audit. |

The initial tutorial gap is now repaired. The surviving non-code proof gaps remain a genuine Pixel 10 frame trace and human play evaluation; this batch does not manufacture those results.

Actual production-renderer evidence for grounded endings: `work/render-grounded-exits.mjs` generated `work/grounded-exits-preview.png` after the final lamp-light integration. The preview was inspected: three biomes show the landing connected to terrain, the shelter behind the wisp, faint grounded feet on approach, and the existing bright 1.5-second arrival reveal. This is an actual Canvas-renderer capture, not browser/phone FPS evidence.



## Release integration note — relic-paths-1

Root integrated the RELICS branch, variable capacity throughout inventory/rewards, COMMON/RARE/BOSS presentation, whole-unit shrine/event copy, and direct locked-slot navigation. Browser checks confirm a 140-Ember unlock deducts exactly 140 and exposes the fourth slot, with no page overflow in the 900×405 briefing. The 360-scenario economy summary is retained beside this audit. Returning Shell now adds two internal Glow to its deflection cost, displayed as one, avoiding a misleading zero-cost label. This release still requires phone play to judge timing and performance.


## Route-consequence follow-up — committed-paths-1

The user's subsequent hands-on review found that the earlier graph did not create enough exclusion despite passing connectivity checks. Dense adjacent-lane edges and orphan repair made early choices converge too quickly; post-Rest death could unlock every flight in the row. The new authored corridors remove those behaviors, and focused tests now require meaningful support exclusions and bounded retry edges. Current/next/future/closed visual states share the model's legal traversal, including elite history. A legacy CSS rule hiding every map circle was also corrected so the new bright node discs and rings are actually visible.

The focused future-forecast probe also catches an elite-history regression: intervening ordinary flights must reset an earlier elite restriction before previewing a later event. Forecasts now follow legal arrival histories, include intervening flights in totals and reject unreachable target forecasts.


## Biome variety follow-up — living-biomes-1

Implemented twelve biome identities with four authored flight courses each, a seeded deck independent of encounter/reward family, themed material/scenery/preview art, and twelve themed interactive objects using five behavior families. Each actual map/family combination includes interactions rather than silently filtering them all out. Safe shoulder anchors fixed dune roofs occupied by decorative arches. Existing committed routes remain authoritative.

Wind now has materially stronger local force with a longer warning, and biome vent currents share production wind prediction and Runner resistance. Ice responds to scene illumination; dangerous fragments use the existing shield/death rules. Positive objects provide single-use lift, reveal or a capped Glow gift, not extra upgrade currency. Boss/tutorial dynamics remain authored. A simulation revision invalidates stale Dream recordings.

Focused catalog, 144 actual flight/encounter combinations, behavior, Dream, projection and route checks pass. No claim of human win-rate balance or physical-phone 60 FPS is made.
