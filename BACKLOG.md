# Current backlog status — Cards default · 16 November 2026

Current release: **`flight-120-1`**. [Performance verification](docs/performance-120.md) · [Cards verification](docs/skills-cards-release.md) · [Current card rules](docs/skill-cards.md) · [Item-by-item audit](docs/backlog-current.md).

The entries below are chronological release snapshots. Their old “current” labels, checked boxes and pending notes describe those snapshots; later decisions take precedence. In particular, the present game has 71 cards, an owned Deck editable during safely paused flight, a guaranteed meltable Lift Guide, independent repeatable Forge, copy-compatible numeric Field Impulse duration and a two-ink Collector. The original skill book stays under Settings → Advanced with a separate save.

| Surviving item | Current disposition |
| --- | --- |
| Cards entry, Deck ownership, card rules, status/help, Rest, Guide, Field Impulse, Rhythm and Black Hole clock | Implemented; current source, focused tests and actual normal-entry checks are identified in the [audit](docs/backlog-current.md). |
| Incorrect current-release headers and checkpoint-only Deck wording | Corrected in this documentation pass; archive entries remain intact. |
| 60%-fuel/progression implementation and the earlier excluded supply-pruning experiment | Superseded by the completed [Spark progression release](docs/spark-progression-release.md), not a missing implementation batch. |
| Collector Guard and learned targeting preferences | Implemented after the earlier planning note; see `dist/model.mjs`, `dist/collector-preferences.mjs` and the archived Spark choices entry. |
| Performance toward 120 FPS | Implemented 120 Hz interpolation/paint cap with unchanged 60 Hz physics and graphics. Matched desktop Chrome scenarios reached about 118–120 actual paint calls/s; [measured scope and retained entry/retry hitches](docs/performance-120.md). Physical phone evidence remains open. |
| Physical Pixel 10 timing, reaction assumptions and human Cards difficulty/choice feedback | Evidence still unavailable. Desktop/mobile-emulation scenarios do not establish these results. |
| Global pixelation/art-grain alternatives | Preview only; awaiting the player's visual choice. Keep the approved game's art defaults. |
| Cards versus legacy-book equal-economy comparison | Earlier optional study, superseded as a release requirement by the decision to make Cards primary and retain the book only as an Advanced override. |
| Bankrunner/Glider, full Night Atlas replacement and other companions | Future archetypes, an unapproved proposal and deferred companions respectively; do not invent implementation requirements from their old notes. |
| Item-by-item legacy skill ratings | Paused at Search Spark; resume only when requested. |

The baseline correctness audit passed 114 focused tests and real Chrome entry/save/upgrade checks. It found no new runtime blocker in those checked scenarios. This is a scoped result, not a full-suite, physical-phone or all-seed balance claim. The final `flight-120-1` package passed 159 focused tests, the Dream replay probe and 445 JavaScript syntax checks; the actual prior installed `skills-cards-3` worker upgraded while preserving both saves byte for byte. See [the performance report](docs/performance-120.md) for scope and remaining hitches.

---

## Historical backlog snapshots

# Skills as cards pilot — 15 November 2026

Current release: `skills-cards-1`.

- [x] Publish an isolated skills-as-cards New Game flow at [`cards.html`](https://mocanumarius.github.io/orbix/cards.html), with a separate save, a cache-proof installed-phone update entry and offline support after download. Preserve the standard campaign and skill book.
- [x] Start with three ordered slots and one of two Common gifts. Award one card per first real clear; preview Equip/replacement/Melt, checkpoint improvements, shared charges and immediate-right-neighbour copy compatibility. Preserve transactions across reload and retry.
- [x] Offer two optional reachable Rest forks on every pilot map. Use Recover / Add slot / Forge, with mounted Growth Seed unlocking Grow and charged Second Ember enabling one second distinct eligible action. Preserve all costs and no-benefit cases.
- [x] Integrate starter/tutorial Lift Guide, Rare Rhythm and the three Resonant Harvest rarities with real flight and Luminance. Keep Field Impulse uncopyable and borrowed/echoed payouts tied to their real source charges.
- [x] Add Common Tight Packing to the 16-card pool: +25% to actual overflow/exit packing, integer quarter carry through saves, a named clear receipt and no multiplier on flat rewards or unrelated Stored Sparks grants.
- [x] Show brief Collector delivery/discard handling cues in both modes. Supply a separate phone-sized [`collector-art.html`](https://mocanumarius.github.io/orbix/collector-art.html) comparison; keep its flatter candidate opt-in pending approval.
- [x] Attach Spirit Fire rim grain and mineral details to world pixels, narrow the inward band and reduce light penetration through rock by one third. Preserve open-air light and dynamic physical shadows; provide a matched actual-renderer still comparison.
- [ ] Gather human phone feedback and compare the pilot with the skill book at equal economy on matching seeds. Tune prices, drop odds, slot choices and the combined card/relic reward budget; evaluate the final-guardian trophy. Bankrunner and Glider remain future archetypes.

Rules, provisional values and limitations are recorded in [the pilot notes](docs/skill-cards.md). Automated flight and emulated-phone evidence do not establish physical-device performance or human balance. The historical First Light verification below remains evidence for that preceding release.

---

# First Light, living terrain and visible triggers — 15 November 2026

Historical release: `first-light-2`.

- [x] Replace the old practice with six separate First Light stops: real flight and Collector pickups, a practice Proximity loan, close-flight charging and packing, Rest, a real Black Hole bypass and a forgiving Warden. Preserve the suspended campaign, unlimited entrance-state retries, saved continuation, skip/reset preferences and Field Guide replay.
- [x] Show brief source-art cues for actual skill, artifact and companion triggers, including repeated and simultaneous effects. Keep passive bonuses quiet and clear old cues on pause/resume.
- [x] Add Last Glimmer, a one-rank Flight skill after Momentum. A fatal position remains visible only on a matching passage retry, survives reload and does not change collisions or rewards.
- [x] Add opaque nearest-camera silhouettes, authored habitat animals and Luminance attenuation through the union of real terrain and solid props. Preserve real collision boundaries, camera registration and reduced-motion behavior.
- [x] Correct nearest-camera ground and canopy clipping: use the actual current floor/roof union, preserve gaps and contact rims, keep binary black edges, and composite the closest plane after world lighting in both renderers. Retain the earlier films as historical evidence and provide a new matched foreground clip.
- [x] Provide a cache-proof phone entry at `first-light.html`. A user tap updates an installed game before opening practice; first installs, already-current builds and offline retry are covered. Keep the ordinary `?tutorial=1` route available.
- [x] Disable campfire Recover when hearts and Sparks are full; retain Grow until its cap. Offer a no-benefit Continue when both are exhausted, while preserving preparation, the seller and its single Dream route. Revalidate stale offers and repeated taps.
- [x] Add Spacetime after Steady Current at base cost 160: nearby ordinary banks yield shallowly, with one shared polygon for collisions, contact edges, light and Proximity. Leave Sparks, props and guardian geometry fixed; keep forecasts private.
- [x] Add Collector Field Impulse after Search Spark at base cost 80. Up/down/right swipes spend the available recovering ring on levitation/dive/surge without a Lift, with real touch, rotated-landscape input and fixed-tick Dream replay.
- [x] Remove the measured contact-edge rendering stall with an exact shared nearby union, bounded spectral pixel buffer and source-local light-mask invalidation. Preserve the existing art and generic-path pixel commands.

Verification: 81 integrated targeted tests passed, including all twelve real flights in three delayed-input six-stop practice chains. All 199 top-level JavaScript modules pass syntax checks. Chrome verified twelve real mobile-input behaviors plus a simulated stale installed worker, first install, already-current launch and offline/reconnect retry. Matched production-app replay against public `d46f95f` improved 900 × 405 from 40.16 to 59.93 FPS (12 to 0 render gaps over 50 ms; p99 51.6 to 22.1 ms), 1280 × 720 from 44.53 to 59.83 FPS, and reached 60.00 FPS at DPR 2.75. A separate 40-second dense renderer traversal stayed at 60 FPS. Four-times CPU throttle remains below target (dense 43.94, guardian 51.83 FPS). Physical-phone frame traces and human play are not available.

The full suite is not claimed green. Unchanged `d46f95f` has six failing seamless-clear tests; current has five, each reproducing the same baseline assertion. All six terrain-geometry failures also reproduce identically. Full scope, methods and limitations are recorded in [the release notes](docs/first-light-release.md).

## Run archetypes

- [x] Implement the separate [skills-as-cards pilot](docs/skill-cards.md) with the shared-wallet Melt economy, checkpoint equipment/improvements, two optional Rest forks per map and action-based camp choices. First-playtest prices remain +10 Stored Sparks for one Common Melt and 30 Stored Sparks plus one camp action to forge one Rare. The standard campaign keeps its skill book; card-mode First Light adds a Lift Guide loan.

Card Rest normally permits one action from Recover / Add slot / Forge. Mounted Rare Growth Seed unlocks Grow: +3 maximum Sparks and a full meter refill, no heart restoration, up to three Grow actions (+9 maximum Sparks) per run. Common Second Ember grants a second distinct eligible action at one Rest and preserves its one charge until that second action succeeds. Eligibility is captured on arrival; Grow may be either action when eligible. Forge charges its quoted price once and grants no additional healing, refill, growth or slot.

Bankrunner's bank skimming and Glider's coasting remain archetype candidates, with their free-Lift follow-ups and limits retained in the pilot notes. Compare cards with the skill book at equal economy on the same seed. Include open-middle and riskier-bank routes, player feedback, actual card supply and wallet spending. Continue evaluating charge/copy readability, passive relic rewards and the final-guardian trophy. The implemented five-slot cap, other-tier prices, rank-improvement prices and drop odds remain provisional balance values.

Mega Crit's original GDC talk, [Slay the Spire: Metrics Driven Design and Balance](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf), informs this method. Use picks/skips as evidence and combine measured outcomes with player feedback.

---

# Spark choices, longer journeys and living terrain — 15 November 2026

Current release: `spark-choices-2`. This supersedes the older size and reward rules below.

- [x] Restore three fuel strengths (6/12/18) at one shared 12.8-world-unit shell radius, between Collector and main-wisp size. Arc density differentiates strength. Update live rendering, contacts, Collector cargo, lessons and all shared previews.
- [x] Thin redundant fuel and preserve useful approach/recovery lanes and marked challenges. Retain more Dark Sparks instead of converting them into extra fuel.
- [x] Twenty starting gifts; offer exactly two seeded choices, grant one, keep the offer stable through save/reload.
- [x] Thirty chest finds spanning learned skills, relics, bundles, permanent capacity, recovery and currency. Prefer unseen finds; filter owned/incompatible benefits; record both displayed options after a choice.
- [x] Length-based clear pay: 15/20/25, plus 5 for elites. Trail Dividend adds 10 per clear (standard 20→30), in the Storage chapter.
- [x] Base flight packing limit 20; Efficient Storage raises it to 30. Fine Facets and Prismatic Yield each add 5 per rank. Ordinary clear pay and optional map rewards remain separate from packing.
- [x] Ten stops per map: three extra flights before each guardian. Preserve committed edges, ordinary paths, single dreamable Rest exits and the original encounter-pressure range.
- [x] Three optional pacts: 55% Luminance for double packing (+20 maximum), 38% for triple packing (+40 maximum), or −45% Collector reach for double packing (+20 maximum). One attempt, clear required, no recursive packing or stacking, free decline. Do not offer a currency pact before the final guardian.
- [x] Remove discovery/ascension gates from relic availability. Elites can roll legendary relics at low frequency; guardians offer strong relics from the first map. Rejected offers cycle after unseen finds are exhausted. Almanac shows all relics. Final victory has no pointless item-unlock choice.
- [x] Complete the accepted Collector follow-up: cheap learned Dense/Flash targeting preferences, switched at checkpoints; independent Last Orbit Guard branch; Kindled Guard lets direct body pickups repair 2 seconds of post-rescue recovery.
- [x] Richer cached rock bedding, fractures, ledge deposits, opaque atlas sampling and two nondamaging foreground parallax strips clipped inside real ground. Bedrock faces become less uniformly rounded without raising the old route boundary. Preserve camera registration and cropped material bakes.
- [x] New original adaptive score: three synchronized 7m16s stems at 88 BPM, changing harmony, motifs, bass, percussion and arpeggios. Smooth mix changes for quiet sites, flights, danger, guardians, dreams, pause and victory. Pre-rendered audio; mute and background pause retained. Standalone music preview included.

Verification: 46 focused tests passed, covering the changes above and checkpoint accounting, terrain registration, skill-book availability and audio lifecycle. All 174 top-level modules pass syntax checks. The 72 completed-flight inventory scenarios use the actual model, three imperfect collection styles and four purchase policies at A1/A2. They yield about 16–20 packed per clear, about 20 clear pay, and 11–12 purchases over about 24 cleared flights. These assume completed flights and do not measure human win rates. A separate 72-flight physics sample uses limited visibility, 250ms reaction delay and missed/corrective inputs: 17/24 opening and 27/48 later-stage clears; 8 failures occurred with low fuel. This is diagnostic evidence, not proof that every seed is fair or completable.

Physical Pixel 10 frame-time traces and human play remain unavailable. The item-by-item rating conversation remains paused; resume at Search Spark when requested. The full Night Atlas replacement remains an unapproved design proposal, not a shipped system. Other companions remain deliberately deferred/locked while Collector is developed.

---

# Guardian paths, Spark mass and run treasures — 14 November 2026

## Completion audit and current rules

- [x] Audit current UI, tutorials, Collector, routes, Dream, rendering and the current economy scripts against surviving accepted requests.
- [x] Fix early Collector ring contact, match both renderers' contact signal, and hide the Proximity meter when it would obscure solid terrain.
- [x] Reserve darkness-lantern chambers and their approaches against independent Dark Spark challenges.
- [x] Correct obsolete tutorial targets, use the current chapter names and remove ordinary-clear currency popups.
- [x] Let players learn a prerequisite inside the chapter where they are planning an upgrade.
- [x] Bound terrain texture generation to the playfield and sway envelope to reduce frame stalls.
- [x] Apply an accepted Dream during preparation and hand control over paused at its endpoint.
- [x] Restore the requested clear-interest mechanic through Kept Light, with per-clear caps and one-time settlement.
- [x] Update the current benchmark scope to Collector and infer visible falling-hazard motion.
- [x] Expand Storage with exclusive body-pickup and large-Spark packing choices, bounded by per-flight caps.
- [x] Show each skill rank as a connected prerequisite item and use explicit owned/affordable/saving/locked labels and fills.
- [x] Provide a large-Spark absorption comparison with three fluid treatments, size and approach-angle controls, slow playback and a timeline.
- [x] Combine Undertow’s circularity and Mist’s vapor in the live capture animation and shared preview.
- [x] Make the Collector field greener, slightly thicker and half as opaque at full reach, fading almost away near the main wisp.
- [ ] Verify frame timing on a physical Pixel 10 and evaluate the hardest Collector routes with recorded human play.

Current behavior and evidence are recorded in [the audit](docs/backlog-current.md). Historical checked batches below describe earlier releases and include superseded rules.

## Darkness Lanterns chapter and Collector build

- [x] Collector is the playable companion at every difficulty, including Test. Keep the other three portraits locked.
- [x] Give Hollow Sun's whole map a lantern identity and show it on the route. Ordinary flights introduce paired lanterns, later flights add crossings, elites chain pairs and Hollow Sun ends the chapter with a climbing crossfire. Place a Flash before the hardest crossing and teach lanterns at the first flight gate.
- [x] Open the [playable lantern map](https://mocanumarius.github.io/orbix/game.html?mock=lantern-map) on a phone without altering the player's campaign. Keep the [lighting rehearsal](https://mocanumarius.github.io/orbix/playtests/lantern-crossfire/) available.
- [x] Spark Sense reveals pickups at their actual positions through the fog. Make large Sparks more detailed, shorten the absorption spiral, and release finer arcs on contact. Give Black Holes a bright accretion disk around a black core.
- [x] Vary the crossroads encounter using six shaped passages and four entry, exit and cache configurations. Validate the cache route, the open route and separation from lanterns.
- [x] Taper foreground rock shoulders into the ground, grow short moss on sheltered ledges, and place mineral seams along exposed rock. Keep terrain and attached props registered to the same camera pixel during scrolling.
- [x] Give the skills book chapter colors, prerequisite states and an inline description for prerequisites in another chapter.

- [x] Fourth Beat: the fourth quick Lift is free, then the third at rank II. The free Lift works on an empty meter.
- [x] Falling Spark chain: see the Dark Spark at the last Lift, stay in the dark for the lower fuel, or lift away. Four small Sparks pay 24 total.
- [x] Guardian crests and hazards, two-route Hollow Sun shutters, 21 legendary relics, permanent final discovery and stronger Night Gardener.
- [x] Small through giant Sparks, mass-dependent art, hit detection, absorption and outside-game size gallery. Faster, shorter shell arcs. Giant hazards need a verified bypass.
- [x] Automatic full-ring Collector rescue, four recovery cycles without fetching, and ordinary direct pickups.
- [x] Run-long treasure choices; two-step skill previews and differentiated prices.
- [x] Black Holes drain 2.5× faster with protected bypasses. Settings can check for and apply the latest build.

# Current batch — One Companion (13 November 2026)

Implemented as `one-companion-1`; final publication is tracked in `docs/backlog-current.md`.

- [x] Exactly one equipped companion, including TEST, saves, attempt entry restoration, rendered orbs and power activation. Remove additional-companion purchases, capacity UI and mixed-role skill effects.
- [x] Keep four distinct roles; select one starter and swap one role at Rest. Keep artifact slots separate from this removal.
- [x] One artifact offer per flight/chest. Equip or Melt into Packed Sparks at common 25 / rare 35 / legendary 50 forge values. Final-boss relic remains a permanent collection claim.
- [x] Rename the upgrade currency Packed Sparks across the UI and tutorial. Flight Sparks remain fuel. Remove recovered-fuel stats from the reward screen.
- [x] Larger reward text, visible trigger → effect → limit, and copy tailored to the equipped companion.
- [x] Larger visible artifact slots on the reward screen; Equip animates directly into a slot. Keep the same screen for Upgrade / Continue. No separate mounted confirmation screen or slot number in the Equip action.
- [x] Full slots use Equip & replace and an explicit replacement choice with its lost effect shown.
- [x] Integrate short tutorials into normal progress, postpone Skills until after the first flight, and introduce more tools/hazards gradually. No automatic skill sheet at New Game.
- [x] Remember & skip persists each topic across runs. Reset tutorial is in main-menu settings; New Game can replay the phased introduction. Field Guide/practice remain optional references.
- [x] Larger teaching panels/text; first death explains hearts and Rest recovery after the heart-loss animation.
- [x] One Resume action → frozen 3–2–1 → existing three-second 0.1×→1× recovery. Dismissing an in-flight lesson no longer needs another wake confirmation.
- [x] Meaningful checks for reward transactions, one-companion enforcement, staged content, tutorial persistence, Dream replay and resume timing; landscape review and corrected overflow.

---

# Current batch — Clear Paths (13 November 2026)

Implemented in `clear-paths-2`; publication is recorded in `docs/backlog-current.md`.

- [x] Seven-stop isolated tutorial practice; 17 replayable Field Guide topics with short visual lessons.
- [x] Name seeing distance **Luminance** throughout player-facing skills, pickups and lessons.
- [x] Teach Sparks, Packed Light, hearts, death, routes, Rest, Dream, companions, artifacts, progression and interaction colors.
- [x] Preserve the in-flight disintegration, then animate one heart crumbling away before route/summary actions appear.
- [x] Five-second preflight splash: current/max Sparks, hearts, equipped artifacts and one mechanic tip; prepare the renderer behind it.
- [x] Start paused. Dismissed flight panels return to a wake gate; first tap wakes without lifting, second tap Lifts. Preserve three-second 0.1×→1× resume.
- [x] Horizontal proximity meter beside the wisp, only while charged/active; shakes during charging and chooses open space around terrain.
- [x] Teal interactive edges, blue vents and orange falling hazards, rendered distinctly within the existing Luminance falloff.
- [x] Remove the old flame mascot and overlapping result decoration; use a round pixel-orb companion symbol.
- [x] Single map header, centered Back, graphical hearts without numeric duplication, no top KEY/HERE shortcut or redundant step/Sparks counters.
- [x] Keep next choices bright and named; distant stops retain illustrated symbols and tap-to-preview details.
- [x] Simpler flight choice and run summary; correct map intrinsic-width overflow that pushed header actions offscreen.
- [x] Focused model/input checks and five-size landscape review. No claim of real-device 60 FPS or full-campaign economy certification.

---

# Current batch — lantern-paths-1

Implementation is complete for the accepted items below; integration and publication are recorded in docs/backlog-current.md. Earlier entries are historical and may use superseded resource names.

- [x] One displayed Glow unit per segment; exact grid alignment.
- [x] Latest HUD direction: literal 4 × 4 px cells, no visible Glow labels/numbers/chrome; slim Edging meter.
- [x] Remove stretching, squash and fluid fuel fill; pixel overflow beam.
- [x] Duplicate common consumables stack remaining uses in one slot; bounded caps and readable previews.
- [x] All artifact effects stay automatic.
- [x] Interactive scenery has distinct pixel edge highlights and spent/hazard states.
- [x] Regenerative Falling: chosen alternative replaces Edging reveals with bounded +1 Glow recovery. The random per-tap refund alternative is superseded, not an additional stacked effect.
- [x] Absorption reduced from twelve to six accelerating, shrinking rotations; shell collapse retained.
- [x] Shared pixel resource/increase/decrease symbols, shorter basic effect summaries; conditional rules remain available.
- [x] Original evolving lo-fi mystical music, independent persistent Music / FX menu controls.
- [x] Earlier defining-artifact proposal: Wayward Seed evolves after Map 1 into a fuel or reveal path.
- [x] Earlier in-flight-fork proposal: geometry-safe open fuel route versus optional tight cache lane.
- [x] Earlier contextual-events proposal: Pilgrim’s Vow and Surveyor’s Cairn, real route stakes and no repeat within a map.

The proposed combo-reroll forge was explicitly replaced by the already implemented artifact-to-Packed-Light forge. Do not restore the superseded version. Full campaign balance and actual Pixel 10 performance traces are still validation work, not features declared finished by this checklist.

# Accepted gameplay batch — 2026-11-13

Status: implemented, checked and deployed as dream-paths-1 (source 9a0ecf9). Public release marker, index and Dream/rest/victory modules verified.

- [x] Glow Sense: Light-tree forward boon hints, fading as actual pickups become visible.
- [x] Collector: use outer boon contact ring; visible contact ripple and committed fetch feedback; retain body priority.
- [x] Routes: split/rejoin paths, clear five-category symbols, future encounter previews, single outgoing flight after each rest.
- [x] Sites: treasure, bounded dice, bargains, sanctuary and workshop choices with visible consequences.
- [x] Victory: artifact/Ember reward after every flight, three equipped slots with replacement, Upgrade and Next after victory animation.
- [x] Skill presentation: owned/available/unaffordable/prerequisite path distinctions.
- [x] Recovery: baseline 50% maximum Glow after victory; overflow into early skill-unlocked Afterglow; separate upgrades and HUD reserve strip.
- [x] Dream: unlockable 4-second practice, unlimited retries without run writes, save preset, matching real replay free of flight fuel costs, paused handoff then gradual resume; duration/sight/wake upgrades.
- [x] Rest preparation: clear Skill Tree / Companions / Dream / artifact access.
- [x] Integration checks and targeted resource/reward sanity checks.
- [x] Single GitHub Pages deployment and live verification.

Balance values are initial settings, not claims of human-play balance. Rehearsal must not farm resources; replay pickup rewards happen only once. No billing or plan changes.


## Living Choices — 13 November 2026

Implemented the current Rest/phone UI batch: illustrated one-of-four Rest benefits; explicit current/max Glow; +3 capacity plus refill, up to +9 capacity per run; 25/50/75 Packed Light on maps 1/2/3; refill hearts; or one copy of uses restored to each mounted surviving consumable, capped at three copies. Recharge is mutually exclusive with the other benefits, cannot revive exhausted or refill unmounted TEST artifacts, and cannot be claimed twice. Full-stack earned duplicates melt for 25 Packed Light. No passive multiplier stacking.

Dream baseline is 6s, with 8s and 10s duration upgrades. All 26 artifacts have distinct icons and grey Common / green Rare / purple Legendary backgrounds. Three copy squares show stack state. Reward generation filters companion-specific and unlearned skill/Dream artifacts against the current build; the TEST catalogue stays open. Boss relics retain useful generic effects and permanent collection behavior.

Rest preparation uses three illustrated service choices plus Dream and Leave. Forge explicitly shows lost artifact/all uses and gained currency, then animates the actual exchange. Settings and buttons share game framing, green accepts, rose cancels, amber Forge. Packed Light uses a larger contrasting box icon. No mandatory tiny currency label. Fixed overflowing landscape victory footer and Rest decorations. Six CSS viewport sizes checked: 667x375, 740x333, 844x390, 900x405, 932x430 and 844x320. This is responsive browser evidence, not a physical phone frame-time benchmark.

Latest lighting supersedes all distant-silhouette requirements: 145 base radius, steeper attenuated falloff, pitch-black fog outside emitted light; upgrades/reveals can still expand visibility. Collector boundary has its companion's green and is slightly fainter. Packed Light beam superseded by exactly two 4px motes rising 26px over 340ms, 65ms apart. Glow Cache fuel increases 12 to 15 displayed units (+25%); placement, collision size and absorption timing unchanged.

Focused verification: Rest growth/recharge/currency transaction persistence and anti-repeat; artifact stacks, auto-melt and companion-aware rewards; deterministic six-second Dream replay; pickup overflow accounting; syntax checks and landscape browser inspection. Long-run economy, physical Pixel 10 FPS and whole legacy-test modernization remain separate work.

Latest naming/scaling steering: all collectible types now use Spark names (Spark, Cluster, Cache, Charge, Flash, Dusk, Dark); displayed energy is Sparks / Spark meter. Packed Light remains separate currency. Proper artifact names Spark Wick and Spark Lens are updated. Internal save/action IDs remain stable. Unified resource/action/item icon sizing; replaced tiny skill-tree currency text with the same colored Packed Light box. The final 78-state landscape browser audit had no overflow, offscreen controls or required scroll panes.

Visual tutorial vocabulary now reuses actual Spark, meter, Packed Light, companion, artifact, Dream and map-site art. One contextual concept is introduced at a time, with short text and existing safe 0.1x-to-1x resume. Rest coach targets were corrected to the new benefit cards/preparation tools. Single-step hints omit the disabled Back action. Previewed at 900x405 and 844x320 without overflow.


## Clear Sparks — 13 November 2026

Completed the latest highlighted batch. Plain `/` and `index.html` now open normal play on both local servers; only `?mock=rest` opts into a fresh in-memory Rest run. The Settings/run-menu toggle adds/removes that parameter, including in the landscape wrapper. No run-save read/write in mock mode. This supersedes the earlier local-server default inspector.

New numeric font: Silkscreen digits only (bundled OFL). Shared 22px choice / 24px outcome sizes, with explicit compact 18px / 20px steps. Rest current/max values remain visible. Menus and post-choice screens retain bounded layouts.

Light now has a cached finite inverse-square-style tail: about 5.7% exposure at twice the bright radius, zero at three times. This supersedes the preceding hard cutoff. Baseline radius remains 145; sight skills and reveal effects extend visibility. Flight text banners are hidden; artifact icons are 32px within 44px buttons, pause to inspect and safely resume.

Base paid Lift = 3 Sparks; ordinary one/two/three-ring pickups = 6/12/18. Whole Lift discounts use 3→2→1; minimum one. Fractional-cost leaves instead add 3 capacity while retaining their movement tradeoffs. Quiet Cinder/Hollow Covenant reduce cost by one, Glass Lantern and event burdens add one. Route identity uses density/geometry/rewards rather than hidden fuel/cost multipliers. Finite fuel offers use 6-Spark blocks; current/max values and skill descriptions match. Meter cells represent one paid Lift and stay stable during free effects. Fixed floating-point last-Lift affordability and the flight capacity clamp (up to the model's 60-Spark maximum).

Checks: whole-cost/meter/pickup and overflow accounting; Rest transactions; linear safe resume; isolated fixture; actual 667×375, 740×333, 844×390, 900×405, 932×430 and 844×320 viewports. 48 checked screen/size combinations had no document overflow, offscreen actions or mandatory scrolling panes. Native menu toggle and compact artifact inspection/resume verified. Existing campaign economy and physical-device performance caveats remain; these checks do not claim 60 FPS on a Pixel 10.


## Balance audit — 13 November 2026

Completed the requested model/simulation pass after Clear Sparks. See [the full report](docs/balance-2026-11-13.md) for methods, before/after results, research and limitations. Production changes: gentler skill-price escalation (0.40 → 0.25), Glass Lantern +4 displayed Sparks per natural pickup / +1 Lift cost, Spark Wick preserves uses at full fuel, bounded 12-paid-Lift Heavy Light bargain, and no ineffective Quiet Cinder rewards at the one-Spark cost floor.

Outstanding design questions are explicit, not silently treated as implemented: overflow-only income compounds survival advantages; broad trees plus global price escalation dilute meaningful branch depth; Recharge may work better as a secondary Rest service. Models cannot settle human difficulty or enjoyment. No companion was rebalanced solely from the imperfect flight controller.

## Steady giants and ceiling warnings — 15 November 2026

- [x] Rare Giant Black Holes at the roof or floor, with a steady stronger drain, visible partial core and accretion disk.
- [x] Require a checked crossing and existing approach/recovery Sparks; retain ordinary holes when a giant cannot fit.
- [x] First-encounter guidance and a save-free playable `black-holes.html` rehearsal for both edges.
- [x] Remove the blue upward guide. Mark a predicted affordable Lift's solid ceiling contact with a red pixel dot; keep the falling guide.
- [x] Reduce the three guide base prices to 25/40/70 Stored Sparks and explain the new behavior in Skills.
- [x] Check actual physics, paused/Dream drain, terrain clearance, resource accounting and both phone renderers.

Published as `steady-giants-1`, source `15dc15a`. All 259 release assets matched the local package. The public game modules and both roof/floor rehearsals passed phone-sized browser checks. Collector size gates, learned targeting preferences and the Guard reorganization remain the next planning batch; they are not silently included here.

# 15 November · Prepared locally, awaiting visual approval

- [x] Consistent fine pixel grain for wisp, companion, treasure art and menu frames.
- [x] Shared size-aware Spark material, including medium/giant fidelity parity.
- [x] Vessel/Stored Sparks box refinement; shorter permanent reward wording.
- [x] Collector size unlocks, separate Flash skill, shrinking larger deliveries to 12 base Sparks.
- [x] Additive Regenerative Pulse and readable Luminance radius comparisons.
- [x] Three-clear positive preparations and a lasting Fallen Giant challenge reward.
- [ ] Player visual approval, then publish this batch. Public build is unchanged.
- [ ] Continue Collector Guard/targeting-preference planning after visual review.

## Paused item-by-item balance review

Resume at **Search Spark**, the next unrated item (30 Stored Sparks base, +12% Collector reach). Compare each item's effect with its cost and offer Useless, Weak, Ok, Strong or OP. Prior ratings and accepted changes are in DECISIONS.md. The final Dream skill is named Nightmare.

## Living biome scenery

- [x] Surface-anchored, reactive decorative foliage and wildlife across all twelve biomes.
- [x] Water pockets and layered distant habitat scenery.
- [x] Mineral seams, erosion pockets and damp rock detail in cached materials.
- [x] Highlight true collision edges through softer vegetation.
- [x] Inspect all 48 authored courses and verify decoration leaves gameplay state intact.
- [ ] Evaluate the scenery density and frame timing on the physical Pixel 10.

## Authored scenery review

- [x] Source freely licensed foliage, terrain and parallax artwork and retain author/licence notices.
- [x] Integrate the new material and prop treatment across twelve biome profiles and both flight renderers.
- [x] Check the 48 course views and phone landscape preview layout.
- [x] Player approved the imported art scale, palette and granularity.
- [x] Roll the approved art direction into the main public game as authored-biomes-1.


## Exit packing release — 15 November 2026

- [x] Convert remaining flight Sparks to Stored Sparks automatically at a successful exit, using current Storage efficiency and fractional carry. The finite reserve packs independently of the pickup-overflow allowance.
- [x] Drain the displayed meter during the clear animation and finish any preceding parcel before sending the last parcel. No extra reward popup.
- [x] Consume the converted reserve, then apply baseline 50% checkpoint recovery. Rest refills do not mint currency. Restore Renewal, Last Spark and Earned Rest to the skill book.
- [x] Reconcile clear receipts, elite reward totals and bounded pact bonuses with exit packing; keep failed attempts and practice isolated.
- [ ] Continue the separate 60%-collection/progression balance goal. Its experimental supply pruning and later-map pressure are excluded from this release: the delayed, visibility-limited controller showed excessive starvation.

Verification: focused transaction/engine/reward checks; 24 opening-flight physics simulations; 48 campaign economic scenarios across 48 course variants and twelve biomes. Economic scenarios are inventory models, not measured human win rates. The unchanged opening cohort clears 17/24 with seven terrain failures, three of those at low fuel; this is regression evidence, not proof of finished balance.

## Spark supply release — 15 November 2026

- [x] Final duration/chapter-based finite Spark budget, protected authored objectives and redistribution into fuel droughts. No adaptive tax on purchased builds and no collection quota.
- [x] Prevent optional glide challenges from stealing the essential central fuel lane.
- [x] Apply later-map difficulty scaling to real obstacle apertures; gradually increase hard sections and draft pressure.
- [x] Exercise actual earned skills, gifts, relics and Dream inputs in visibility-limited campaign simulations. Validate terrain-assisted starter cases below 60% fuel value and all 48 later courses with earned builds.
- [ ] Calibrate reaction/missed-notice assumptions against Pixel 10 play and refine the later-chapter difficulty curve. Paired clear rates are not yet monotonic; do not treat sampled solvability as universal proof.

Evidence, exact counts and limitations: `docs/spark-supply-release.md`. This release supersedes the preceding note that supply normalization is excluded, while retaining the explicit tuning follow-up.

## Spark progression completion — 15 November 2026

- [x] Budget all bare starter depths for a full entry vessel; separately place fuel for half-full checkpoint entries. Reproduce and fix the early Cemetery drought without adding fuel.
- [x] Choose optional mission marks after funding the inventory, so protected construction pickups cannot exceed the supply cap. Match simulation offer preflight to the real game; reserve rich hunts for longer routes.
- [x] Pace authored challenges across ordinary progressed flights instead of front-loading hard terrain and skipping previewed encounter families.
- [x] Verify the 60% fuel-value target, automatic exit packing and progression-aware pressure with the current runtime and real earned builds, gifts, relics, Dream and reward settlement.
- [x] Pass 80 focused checks, 1,296 layout inventory cases and 4,949 flight scenarios. Check all 48 courses and all twenty starting gifts; retain raw hashes and limitations in the evidence report.

The implementation and simulation goal is complete; physical phone feedback remains a future calibration step rather than a claim of measured human win rates. See `docs/spark-progression-release.md` and `docs/spark-balance-evidence.json`. This supersedes the preceding open balance-tuning item.
