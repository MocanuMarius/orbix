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
