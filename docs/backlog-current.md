# Current implementation audit - Clear Rewards

Release: `clear-rewards-1`. Only simplification proposal 3 is selected; prior menu/display work remains in place.

- Successful ordinary, elite and map-exit flights secure 20 Packed Sparks plus overflow. Fixed clear income bypasses conversion multipliers. Failed attempts pay nothing; settlement, reload and retry are idempotent. The final guardian grants its permanent relic.
- Rest shows Recover or Grow. Recover refills hearts; Grow adds 3 maximum Sparks, up to 9 this run. Both refill Sparks. Grow is disabled at its cap; Recover stays usable even when full. Current/max outcomes are visible.
- Condense and Recharge are removed from Rest choices and current tutorial text. Consumable stacks/charges, artifact slots and skill-tree rules remain. Optional preparation tools still open on the same Rest screen.
- Flight previews show the clear reward. Reward screens distinguish clear income and overflow without adding another confirmation screen.

Verification: 33 focused tests passed for transactions, practice isolation, Rest growth/cap, restart/retry, entry, onboarding, artifact flow, one-companion rules and desktop display routing. A 144-campaign synthetic income probe completed through the production model; its assumptions/results are in [checkpoint-economy.md](checkpoint-economy.md). It does not measure human difficulty.

Browser inspection: Rest choices and Grow preparation at 900x405; Recover preparation at 740x333; capped Rest, briefing and reward screens at 720x280. No control overlap, offscreen action or document overflow in those checked states. Clear-only and clear-plus-overflow totals rendered correctly.

Publication verified: `clear-rewards-1`, source `d020841888f16172975d735159be2f9e72f0bcf7`, Pages `4ff127d1c442c1a2022affceed0ebc0c538174d4`. Workflow `43507875190` succeeded. The public manifest and twelve entry/model/UI files match local release bytes. Live Rest displays Recover/Grow correctly; the normal public URL opens the playable landscape home screen. Play: https://mocanumarius.github.io/orbix/?v=clear-rewards-1 .

---

# Current implementation audit — Moonlit Menus

Release: `moonlit-menus-1`. This entry supersedes the older UI status below; the One Companion gameplay rules remain in force.

Implemented: automatic desktop landscape presentation at 900 × 405 logical units; preferred 150% zoom with bounded Fit and saved scale; native responsive phone routing; legacy preview redirect; same-origin display pause/fullscreen bridge; original home woodland/ruin pixel art; stronger primary actions and unlock cue; consistent worn frames, typography, resource glyphs and disabled/owned/available/locked cues.

Research: primary Xbox guidelines, Game Accessibility Guidelines, Apple's free handheld-game interface lesson and Valve handheld display guidance. Links, reasoning and limits are in [the research report](ui-design-research.md). No paid courses or financial pages were needed.

Verification:
- 26 focused Node tests pass across display layout, flight entry, onboarding, single-companion behavior, reward flow and tutorial progression.
- Eight actual screens × three CSS landscape sizes (900×405, 740×333, 720×280) were checked for control overlap, offscreen actions and document overflow. Home with Continue, Rest arrival/preparation, skills, artifacts and settings were additionally identified by their rendered contents. No overlap or offscreen controls were found. Existing intentional map panning and optional explanation scroll surfaces remain.
- Desktop render sizes at 1920×1080, 1440×900, 1280×720, 900×900 and 420×820 all fit the browser. The inner game remained 900×405. Large windows display exactly 1350×607.5 at 150%; smaller windows clamp without cropping.
- A 100% choice survived navigation to the query-free root. Fit and fullscreen work. Scaled Rest selection, Leave Rest and Enter clicks reached the actual flight. Changing scale during the countdown or active flight opened the pause menu; no automatic resume was introduced.
- Static menu art adds no render loop or network asset service. These checks are browser layout/behavior evidence, not accessibility certification or a physical Pixel 10 FPS measurement. The existing campaign balance/performance follow-ups remain open.

Publication verified: `moonlit-menus-1`, source `f2320079396b1c608e47c9dd83829b162c73e3b4`, Pages `6a0ce7cf3dba4c0adbae2b93d0db365dc5e8f1ca`. Workflow `43504949708` completed successfully. The public manifest and fourteen entry, routing, UI and art files match local release bytes. Play: https://mocanumarius.github.io/orbix/?v=moonlit-menus-1 . Local mock scene instrumentation stays outside `dist`.

---

# Current implementation audit — One Companion

Release: `one-companion-1`. This header supersedes the older designs below.

The flushed backlog is implemented: one equipped companion throughout saves, TEST, modifiers, rendering and input; no companion-capacity purchases; one clear artifact offer with Equip/Melt; consistent Packed Sparks currency; larger reward descriptions tailored to the equipped role; visible larger slots and direct equip animation; no mounted confirmation page; contextual normal-run onboarding; larger coach panels; remembered topics/reset; and a frozen 3–2–1 resume before the existing slow recovery.

Behavior:
- Melt pays the same 25/35/50 rarity values as forging, directly into the run's upgrade wallet. Fuel, overflow remainder and multipliers are untouched; a reward can be claimed once. Final-boss relics are permanent collection claims because the run currency is about to reset.
- Equip uses an empty slot immediately. Full slots require a named replacement and show the effect being lost. The artifact then travels into the visible slot; Upgrade/Continue remain on the same screen.
- First-time players get a single short Lift/Sparks lesson. Skills open after a cleared flight, initial tree disclosure is limited, and additional tools/content are phased in. New Game does not automatically open Skills. TEST/practice bypass these gates.
- First-death heart guidance waits until the heart-loss animation completes. Remember & skip persists across games; Reset tutorial is in main-menu settings; New Game then replays the phased introduction even for a returning profile. Manual Field Guide/practice is optional.
- Dismissing a flight lesson or choosing Resume starts one three-second frozen countdown, then the existing three-second linear 0.1×→1× recovery. The initial five-second loader still ends paused. Countdown taps cannot spend a Lift.

Validation:
- 22 focused tests: transaction/rarity payouts, one-off claims, replacement, practice isolation, permanent boss claims, reward markup, countdown cancellation/timing, one-companion save/modifier/engine behavior, staged content, tutorial persistence/pacing, practice progression and death/entry semantics.
- Current-mechanics probe, deterministic Dream replay and slow-resume probe pass. Dream fixture was updated from two companions to one, with a separate Runner-only recharge case.
- 42 browser screen/viewport cases across 900×405, 740×333 and 720×280. Corrected settings-footer overlap and the longest legendary descriptions, then rechecked affected cases. Actual Equip animation, explicit replacement, first lesson, delayed death lesson and companion swapping inspected.
- Post-integration review caught and restored the artifact management/mount/forge handlers. Twelve additional management, forge, skills, settings, companion and Field Guide checks at 900×405 and 720×280 opened their expected sheets with no control overlap or new console errors. Actual forge removed Spark Wick and paid 25 (230→255).
- Browser input: before/countdown `{flaps:0,time:0,paused:true}`; after countdown `{flaps:0,time:0,paused:false}` at `Game speed 0.1×`; next Lift increments to one. Initial input is never spent by Resume.
- Existing old suites that import removed card/getModifiers APIs remain obsolete; this is a focused check report, not a full-suite or physical-device FPS certification.

Publication verified: `one-companion-1`, source `0a39c997037279d07da3dc76912a273880a25654`, Pages `24e51caaaae5c5231f5e10ba46c62d56cfcd91a2`. Workflow `43501588123` completed successfully. Public manifest and ten entry/model/UI files match local release bytes. Phone: https://mocanumarius.github.io/orbix/?v=one-companion-1 ; landscape preview: https://mocanumarius.github.io/orbix/preview.html?v=one-companion-1 . Local mock fixtures stay outside `dist`.

---

# Current implementation audit — Clear Paths

Release: `clear-paths-2`. This entry supersedes older terminology and status reports below.

The resumed backlog is implemented: extended, isolated tutorial practice; Luminance terminology; delayed heart-loss presentation; a five-second loading splash; explicit tap-to-wake before Lift; an in-world proximity indicator; readable interactive edges; and simplified landscape route, briefing and result composition.

Validation:
- Seven focused tests pass: seven-stop practice progression and actual event fork, practice inventory isolation, exactly one heart lost with entry state restored, curriculum coverage, preparation/splash timing, paused engine/input semantics and proximity visibility/placement.
- Browser input probe: before wake `{flaps:0,time:0,paused:true}`; first tap `{flaps:0,paused:false}`; second tap `{flaps:1}`. The first tap does not spend fuel.
- Existing current-mechanics and resume probes pass; linear 0.1×→1× over three seconds remains intact.
- Forty-five screen/viewport cases at 900×405, 844×390, 740×333, 720×280 and 1024×600: no overlapping controls or document overflow. Route-map scrolling is intentional. The settled heart-loss screen and five-second splash also fit 720×280.
- Successful-run summary with both boss artifact and companion unlock additionally verified at 720×280; old absolute-positioned reward labels replaced by one compact reward row.
- Pixel renderer legacy test cannot load because it imports removed `getModifiers`. The old model suite also targets removed card APIs. These are not reported as passing; no broad test-suite claim is made.
- Local-only preview fixtures and input instrumentation remain outside `dist`.

The map hides distant labels, not planning information: future landmarks still open previews. Hearts retain accessible remaining/maximum labels, without duplicate visible fractions. Scene highlights use the same finite Luminance field, so objects beyond visibility are not revealed.

Remaining validation outside this batch: a physical Pixel 10 performance trace and a new full-campaign economy study with imperfect human collection. This UI/tutorial release does not certify either.

Publication verified: `clear-paths-2`, source `531cc7ba980dc546b72c4e2155a3e4d9a9a4cb86`, Pages `1c6ceaf9427cdcfb1cdc9ebaf35e4d80b17fbf1d`. GitHub Pages workflow `43494903905` completed successfully. Public release marker and eight entry/UI/engine files match the local release. Phone: https://mocanumarius.github.io/orbix/?v=clear-paths-2 ; sidebar landscape: https://mocanumarius.github.io/orbix/preview.html?v=clear-paths-2 .

---

# Current implementation audit — Lantern Paths

Release: `lantern-paths-1`. This header supersedes the historical audits below. Publication is verified separately against the GitHub Pages release manifest.

| Accepted request | Current implementation |
| --- | --- |
| Tiny, crisp Glow and proximity meters | 4×4px whole-unit Glow cells; slim Edging cells; no visible fuel text or fluid scaling |
| Pixel overflow, six-turn absorption | 32 reused beam tiles; six shrinking accelerating orbits and shell collapse |
| Readable UI with fewer words |Shared pixel symbols, compact artifact stats, expandable conditional rules, brighter Lift/Back |
| Consumable stacks | One slot, 9 Wick / 6 Flash uses; exact cap preview, fixed forge payout, retry/save/TEST safeguards |
| Active-looking scenery |Pixel edge states for mushrooms and other interactive props under normal fog |
| Regenerative Falling |Exclusive Edging-to-fuel branch; 1 Glow, 8/flight, no overflow or recursive triggers |
| Evolving defining artifact |First-flight Seed; Map 1 Hearth/Lantern choice; normal map reward preserved |
| In-flight forks |Guarded authored terrain passages, normal fuel versus body-only larger cache; 31/48 sampled variants fit |
| Contextual map events |Pilgrim vow and committed Surveyor preparation; previewed consequences, seeded non-repeating selection |
| Relaxing music and controls |Original 7-minute pre-rendered score, independent persistent Music/FX toggles |

Focused checks cover actual artifact triggers and lifecycle, event payment/route commitment, fork geometry, regeneration exclusions and save/retry isolation. Browser inspection covers 900×405 and 740×333 landscape menus and the evolution→normal reward sequence. Temporary visual fixtures are excluded from publication.

Still open: **a physical Pixel 10 hitch trace and a current full-campaign balance study with imperfect human collection**. The historical economy/performance reports do not certify this expanded version. Safe geometry coverage is not a claim that every player can clear every fork.

Earlier speculative forge rerolls were explicitly replaced by artifact-to-Packed-Light salvage. Afterglow reserve, Ember currency, phoenix graphics and six base companions are superseded designs, not missing features. The random free-tap Regenerative Falling variant was replaced by the selected deterministic Edging recovery branch.

---

## Historical audit follows

# Current backlog audit — 13 November 2026

Audited source: `223761f`; public release: `ring-boons-1`. The public release manifest matches. Ten deployed modules were compared with local source (normalizing Git line endings): app, pickup art, Glow UI, currency icon, landscape map, skill disclosure, black holes, Edging Pulse, model and Dream; all matched. Working tree was clean at audit start.

This is a source and publication audit, with independent flight and progression reviews. No new human play session, phone FPS capture or campaign balance simulation was performed. Implemented means an active implementation exists, not that its art or balance has been approved.

## Follow-up implementation

The next batch fixes the map-key/tutorial mismatch by sharing illustrated landmark art, formats Protector unlock costs with the displayed Glow scale, and teaches observed Edging/Black Hole effects one at a time at safe checkpoints. Artifact offers now name a setup/sequence; Sunspool intentionally accepts Edging light within existing grant caps. Fuel rings are thicker/brighter within the original contact boundaries. See `combo-balance.md` for current combination coverage; physical Pixel 10 profiling and full campaign economy coverage remain open. The table below records the findings at audit time.

## Findings at audit time

| Priority | Finding | Evidence / completion condition |
| --- | --- | --- |
| High | Current balance coverage is incomplete | `scripts/balance-condensed-glow.mjs` omits Black Hole drain and Edging visibility. `docs/condensed-glow-balance.md` excludes purchased secondary companions/lives, approximates artifact triggers, and assumes optimistic Dream preparation. Re-run representative current builds and route policies with imperfect collection; the old 6,240 cases do not certify this version or exhaustive tree viability. |
| High | Pixel 10 hitching is not proven resolved | Caching, interpolation, bounded effects and `dist/flight-performance.mjs` instrumentation exist. Need an actual device trace and follow-up fixes for observed stalls; desktop/controller timings cannot establish phone 60 FPS. |
| Medium | New mechanics lack contextual onboarding | `dist/black-holes.mjs` excludes practice; `dist/tutorial-steps.mjs` has no Black Hole/Edging lesson. Optional `pickup-guide.mjs` explains both. Add brief, progressive teaching without interrupting dangerous flight. |
| Medium | Map key/tutorial lag behind map art | `tutorial-steps.mjs` still says “bright ring”; `map-guide.mjs` uses older outlined icons while `landscape-map.mjs` uses illustrated landmarks. Match teaching/legend to the actual map. |
| Medium | Protector unlock cost has wrong display units | `app.mjs:showUnlocks()` displays raw `role.description`: “12 Glow” from `companion-abilities.mjs`. Actual debit is 12 internal units, approximately 4 displayed Glow. Use the shared Glow formatter. |
| Low | Historical documentation is easy to mistake for current rules | Older audit/README sections retain unpublished status, Ember/Afterglow and obsolete counts. This file is the current audit; prior chronological entries are historical. |

## Implemented in the current release

| Area | Surviving requests checked | Active implementation |
| --- | --- | --- |
| Runs | New Game, Continue, abandon/exit, separate Tutorial; three maps; Ascension unlocks | `run-menu.mjs`, `app.mjs`, `model.mjs` |
| Controls | Landscape/Pixel-style wide layout, one hand, two action controls, safe-area placement | `landscape.css`, `orientation.css`, `app.mjs` |
| Survival | Glow-funded Lift, zero fuel falls and can recover, three attempts, upgradeable life cap, Rest refill | `flight.mjs`, `vitality.mjs`, `model.mjs` |
| Timing | Slow resume, two-second death, grounded exit, 1.5-second lighting transition | `flight.mjs`, `level-length.mjs`, renderer and app lifecycle |
| Flight terrain | Real scenery colliders, longer paced flights, localized drafts, central accessible fuel and risky pockets | `flight.mjs`, `drafts.mjs`, encounter families |
| Variety | Twelve shuffled biomes, four courses each; vegetation/buildings and themed local interactions | `biomes.mjs`, `level-catalog.mjs`, `biome-dynamics.mjs` |
| Wisp/light | Smaller circular neutral orb, no constant tail, outside-in dimming, pale shell, upgradeable circular inverse-square-style light | `wisp-renderer.mjs`, `light-field.mjs`, model |
| Companions | Collector, Protector, Runner, Space Timer; visible locks, TEST selection; rest changes and purchasable extra slots | companion abilities/art, model, app |
| Collector | Body gets first chance, boundary contact, curved distance-based trips, five-second recovery, shrinking/regrowing fuzzy boundary, close recovery pickups | `wisp.mjs`, renderer |
| Other powers | Shield deflection/recovery/welding; burst and wind resistance; held levitation, bob, steadiness and release dive | flight, renderer, model |
| Power HUD | Fill-based readiness and ready sparkle, without overflowing ready text | `boost-control.mjs` |
| Pickups | Positive/warning distinction, utility and harmful items, temptation chains, smaller hitboxes, ring disintegration and inward spirals | pickups, flight, renderer |
| Latest pickup art | Fixed ring slots at radii 15/10/5, filled outside-in for light/cluster/cache; shared field-guide art | `pickup-art.mjs` |
| Packed Light | Surplus currency, conversion branches, failure rollback, no recovery minting, luminous box icon and rising left-side beam | `condensed-glow.mjs`, `afterglow-ui.mjs`, `glow-ui.mjs`, model |
| Skill structure | Run-owned radial branches; starter choice plus eight Packed Light; buy after clear/rest; affordable/saving/locked distinction and distant anonymous dots | living/wisp/skill trees, `skill-tree-state.mjs`, model |
| Skills | Capacity, effort, speed/fall choices; pickup reveal, trajectory I–III, incoming-boon hints, recovery, Dream and conversion paths | main tuning, skill paths, projection, Glow Sense |
| Routes | Committed branch graph, consequential Rest access, six recipes, future previews, failure alternatives, five categories | model, route recipes, landscape map |
| Map art | Illustrated landmarks, winding stone trails, brighter NEXT, traveling-light HERE and subdued closed paths | `landscape-map.mjs`, `map-clarity.css` |
| Encounters | Rest preparation, treasure, shrine/bargain/dice events and encounter/boss families | map guide, model, encounter families, boss |
| Rewards | Artifact choices each flight, rarity, replacement/dissolution, stronger persistent boss rewards, scalable slots | model, app, artifact effects |
| Combinations | Bounded artifact trigger interactions; generated effects cannot recursively mint income | `artifact-effects.mjs`, condensed/model economy guards |
| Dream | Unlockable 4/6/8-second rehearsal, repeat/preset, automatic free-Lift opening, paused handoff and separate resume tap | `dream.mjs`, app, model |
| Black Holes | Persistent proximity drain, softened inverse-square falloff, safe bypass placement, actual-loss spiral effects | black holes/art, flight |
| Edging Pulse | Real-boundary risk charge, five-second fading reveal, recovery, upgrade fork and passive HUD | edging controller/UI, light field, model |
| Practice | Isolated tutorial, one short contextual lesson per checkpoint, rewards/rest/skills teaching | tutorial steps/coach, app, model |

## Qualifications, not hidden missing features

- Boon ring count represents existing strength tiers, not literal 1/2/3 Glow. The body slots match in size; existing contact boundaries still differ (20.8 versus 24 world units).
- A Black Hole is normally placed once per non-tutorial flight. Impossible synthetic geometry can omit it instead of blocking passage.
- Dream makes Lift/sustain free; environmental Black Hole drain still applies identically to rehearsal/replay.
- Current biome dynamics are small interactive actors, not fully deformable terrain or a general destruction engine.
- The original four-to-six-minute run target conflicts with the later request for three-times-longer levels. Long flights are implemented; original total duration is not claimed.
- “About one upgrade per two flights” has older conditional-clear simulation support. Neither exact human pacing nor a 60% tree-completion ceiling is guaranteed.

## Superseded deliberately

Phoenix/realistic 3D art → pixel neutral wisps. Portrait → landscape. Cards and standalone stat tuning → run skills and artifacts. Fire/Ice, Gravity and six standalone roles → four base companions with learned traits. Afterglow fuel reserve and Ember currency → Packed Light overflow currency. Terrain-deforming Collector aura → inexpensive circular boundary after the explicit performance fallback. These are not unfinished tasks to restore.

## Verdict

Most surviving feature requests are implemented and deployed. The backlog is not fully closed: onboarding/legend consistency, a displayed cost defect, current-system balance coverage and real-device performance verification remain. No gameplay changes or redeployment were made during this audit.


## Follow-up: skill-forge-1

Skill trees now separate partial/full ownership from next-rank affordability with blue owned badges, gold plus signs, bronze prices, grey locks and a compact key. Deep unrevealed nodes remain dots. Artifact forging now yields fixed Packed Light without fuel/heart recovery and confirms consumption first. Home Continue/New Game are larger framed actions. The persistent 20:9 preview page fixes the sidebar returning to portrait after resizing.

The evolving-artifact and in-flight-fork suggestions are still proposals. Current campaign economy and real Pixel 10 hitch traces remain open work; the salvage change has transaction checks, not a full rebalance.

## Follow-up: glow-flight-1

Edging is easier to accumulate: twice the boundary clearance, two seconds of skimming, 1.25 seconds of retention between edges and slower decay. Upgrade descriptions and contextual teaching match those values. The large left Glow meter drops visible numeric labels, Packed Light moves above it, and ascension/map/hearts sit beside the top-right menu. The wisp sits farther right. The notch-safe inset has a fallback when the browser reports no safe area.

Pickup absorption now shrinks through twelve accelerating orbits. Shell fragments collapse inward at body capture or Collector retrieval. Existing effect budgets and immediate fuel credit remain. Responsive layout and focused mechanic checks cover this batch; no full balance sweep or hardware FPS claim is made. The richer map-event proposals still await implementation.

## Follow-up: artifact-clarity-1

Artifact rewards now use rarity-first rolls and short effect/trigger/lifetime labels. Common limited-use relics have visible, persistent charge counters and free their slots on a successful clear. Effects remain automatic; first-use teaching pauses safely and resumes with a large centered speed readout. Choosing a reward, mounting/replacing, and forging now state their alternatives and consequences. Forge copy consistently uses Packed Light.

Black Hole stolen light is larger, denser and follows a narrowing spiral, with a bounded particle pool. Baseline resume is linear over three seconds. Latest user-requested backlog additions (Glow unit grid and crisp basin, pixel overflow beam, duplicate consumable stacking, interactive scenery highlighting) are recorded as pending in BACKLOG.md. They are not claimed as implemented in this release.


## Clear Sparks — 13 November 2026

Completed the latest highlighted batch. Plain `/` and `index.html` now open normal play on both local servers; only `?mock=rest` opts into a fresh in-memory Rest run. The Settings/run-menu toggle adds/removes that parameter, including in the landscape wrapper. No run-save read/write in mock mode. This supersedes the earlier local-server default inspector.

New numeric font: Silkscreen digits only (bundled OFL). Shared 22px choice / 24px outcome sizes, with explicit compact 18px / 20px steps. Rest current/max values remain visible. Menus and post-choice screens retain bounded layouts.

Light now has a cached finite inverse-square-style tail: about 5.7% exposure at twice the bright radius, zero at three times. This supersedes the preceding hard cutoff. Baseline radius remains 145; sight skills and reveal effects extend visibility. Flight text banners are hidden; artifact icons are 32px within 44px buttons, pause to inspect and safely resume.

Base paid Lift = 3 Sparks; ordinary one/two/three-ring pickups = 6/12/18. Whole Lift discounts use 3→2→1; minimum one. Fractional-cost leaves instead add 3 capacity while retaining their movement tradeoffs. Quiet Cinder/Hollow Covenant reduce cost by one, Glass Lantern and event burdens add one. Route identity uses density/geometry/rewards rather than hidden fuel/cost multipliers. Finite fuel offers use 6-Spark blocks; current/max values and skill descriptions match. Meter cells represent one paid Lift and stay stable during free effects. Fixed floating-point last-Lift affordability and the flight capacity clamp (up to the model's 60-Spark maximum).

Checks: whole-cost/meter/pickup and overflow accounting; Rest transactions; linear safe resume; isolated fixture; actual 667×375, 740×333, 844×390, 900×405, 932×430 and 844×320 viewports. 48 checked screen/size combinations had no document overflow, offscreen actions or mandatory scrolling panes. Native menu toggle and compact artifact inspection/resume verified. Existing campaign economy and physical-device performance caveats remain; these checks do not claim 60 FPS on a Pixel 10.


## 14 November — streamlined flow and quieter art

Implemented in the next flow release: one reachable flight preview with Fly and a safe Tap to begin gate; actual renderer loading only with cancellation/rollback; automatic ordinary-flight banking and direct map return; one Collection workbench with inline Melt/cancel/result; borderless, irregular darkness behind map/home art. Elite/guardian choices remain. Paid skill purchases remain Rest-only. The orientation callback no longer launches a saved flight while the player is on the main menu.

Verification includes one-time banking/reload/retry, loading cancellation/failure, first-tap-without-Lift and second-tap Lift, safe workbench resume, Rest permissions, and compact landscape layouts. This is not a new phone performance or campaign balance certification.

### Implemented — conditional flight bonuses

Keep 20 Packed Sparks for clearing. Replace the generic optional challenge with one previewed objective per flight. These ten designs add route identity without adding artifacts, inventory, or a reward selection screen after ordinary flights. All numerical strengths below are initial tuning values, not validated human balance.

| Bonus | Condition in a successful real flight | Reward |
| --- | --- | --- |
| Gilded Passage | Collect 4 of 6 marked Sparks | Double that flight's clear pay and actual pickup-generated Packed Sparks, extra capped at 30, one designated site per three-map expedition. Never multiply banked currency, vows, escrow, or this bonus. |
| Pilgrim Precision | Collect 4 of 6 marked Sparks with the main body | 8 Packed Sparks. Collector delivery explicitly does not count for this objective. |
| Three Suns | Collect three marked three-layer Sparks on a single verified route | Recover one missing heart, without increasing its cap. At most once per map; offer only while a heart is missing. |
| Edgeweaver | Trigger Proximity in two separate marked terrain sections | One ward on the next attempt; with Protector its first deflection is free instead of stacking a layer. Only when Proximity is unlocked. |
| Wild Circuit | Activate two marked helpful biome objects | Companion recovery 20% faster on the next attempt. Offer only when the required helpful objects exist. |
| Flash Relay | Collect the marked Flash Powerup and 2 of 3 fuel Sparks in its reveal stretch | Luminance radius +25% for the first 15 seconds of the next attempt. |
| Night Sail | Take two marked Sparks on a Black Hole's outer bypass while losing at most 3 Energy to it | Black Hole drain reduced by 25% for the next attempt. Offer only when the next flight has a Black Hole. |
| Long Glide | Collect two marked Sparks in a verified two-second Lift-free glide | First three Lifts of the next attempt are free, capped at 9 Energy saved. |
| Wayfinder | Pass three broad position waymarks with readable approach warning | Preview the first 2.5 seconds of the next route while its start is paused. Normal darkness returns on play. |
| Rising Constellation | Collect a marked one-, two-, then three-layer Spark sequence; a second existing target is marked at each stage when the terrain supports it | First three natural fuel pickups next attempt give 2 extra Energy each. This extra Energy cannot pack. |

Implementation rules: validate targets against the final layout, companion speed and useful visible warning (at least 1.5 seconds); do not count Dream, generated items or replayed pickups; each node pays once on a successful clear; no simultaneous extra currency contract; temporary benefits apply to the next attempt only and cannot stack with their own copies. Show one icon, a short requirement and progress. Failed objectives do not reduce normal clear pay. Unlock later objectives with their related mechanic rather than presenting all ten on the first map.

One cash site per map: one Gilded and two Precision opportunities per three-map expedition. Even winning all three adds at most 46 Packed Sparks. [Route and economy audit](route-bonus-audit.md) records the coverage, income assumptions and limits of the delayed-input flight sample.

Design references: [Risk & Reward, official creator guide](https://docs.sandbox.game/en/creator/game-maker/creative-guides/experience-design-techniques/game-design/risk-and-reward), [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/), and [Xbox difficulty guidance](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/108). The specific rewards and numbers above are project proposals, not claims made by those sources.


### Implemented — three starting gifts

Choose one before a new expedition: Proximity, the six-second Dream, or one named Rare artifact. The artifact is previewed with its actual benefit for the starting companion; backing out and reopening does not reroll it. Choosing the Rare grants the artifact immediately and consumes the same gift as either skill. It is not a permanent unlock. A saved or ongoing expedition does not receive an additional gift. Unowned Dream is not advertised at Rest or in route previews. Once owned, rehearsal lives in Rest preparation after Recover or Grow.

### Implemented — home menu actions and information

Continue, New Game and Field Guide use raised directional signs. Only the primary action uses the gold frame. Equipped, selectable and progression-locked orbs use distinct marks and surface treatments; TEST preserves selection of locked roles. The read-only journey is a single illustrated road with three landmarks and a current location. It has no separate cards, pointer interactions or keyboard stops.

### Implemented — Night Atlas experiment, mobile route screens and event decisions

After the first expedition victory (or in TEST), the first guardian offers a Map 2 forecast: Bellwind, Hollow Moon or clear skies. See the affected branches, retain an ordinary route, and keep the weather on retries. The forecast ends at Guardian 2. New unlock rules, forecast combinations and replacing numbered Ascension remain [design proposals](night-atlas-proposal.md).

Route previews separate the guaranteed clear reward from optional conditions, omit duplicated travel stats, and distinguish the final guardian victory from currency. The map shows current and maximum Sparks beside the Stored Sparks wallet. Corner controls are inset inside the device safe area.

The Archive and the other events now account for Sparks, hearts, route and the opportunity to spend. A last-map site beyond the last reachable Rest offers preparations usable in flight. See [event audit](event-decisions-audit.md).

The installable landscape game preloads its playable assets on the first online visit. A downloaded release waits for the older game windows to close before activating.

### Absorption art and the first-run resource lesson

- Player review is next for the [icon and terminology proposal](icon-language-plan.md). The basic resource vocabulary is shared by the first-run briefing and Field Guide.
- **Stretch the light under pull.** In both Spark pickup and Black Hole drain, start deforming the source within the first part of capture: stretch along the curved path, flatten across it, and progressively taper to a bright filament. The Spark's shell still breaks at contact. Sparks stripped from the wisp streams into the hole's accretion spiral. Preserve the pixel style, six-turn Spark capture, reduced-motion support and the existing particle cap. Capture, collision and drain amounts do not change. Acceptance: even in a freeze-frame just after contact the moving core is deformed; halfway through neither effect resembles a train of round beads.
- **Show the resource lifecycle at the beginning.** The first briefing contains a short three-step demonstration before the first live flight, using the names Spark, Spark Meter and Stored Sparks. Start with a plasma Spark in the passage, follow it to the Spark Meter at the left, show a Lift spending Sparks, then show only surplus Sparks packing into the wallet. Finish with the wallet paying for a skill at a Rest. Point to the actual HUD locations with the same art used in play. Respect Skip tutorial and offer replay from the Field Guide. Show one change at a time on a paused scene and derive amounts and packing rate from the current build; do not add another mid-flight interruption. See the worked example in the terminology proposal.

- **Readable plasma charge.** The three fuel Sparks now share a shell about 20% smaller in the artwork while their contact area and +6/+12/+18 values stay fixed. Recognize charge by the density of the branching plasma. Reduced motion preserves the three silhouettes in a still frame. The wallet uses a copper box, including in teaching examples.
