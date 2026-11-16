# Current implementation audit — Cards default · 16 November 2026

Current release: **`furnace-tow-1`**, following source `0e657c7`. [Latest release verification](furnace-tow-release.md) · [Performance evidence](performance-120.md) · [Cards release notes](skills-cards-release.md) · [Current rules](skill-cards.md) · [Backlog dispositions](../BACKLOG.md).

The reward furnace follow-up offers Add to collection, Equip and a directly reviewed Melt with exact receipt guards, positive banked returns and a distinct furnace. Collector uses a shared aimed hook and wind-bowed luminous cord in both renderers, with paired and reduced-motion support. [Release verification](furnace-tow-release.md) records 239 focused tests, 25 retained touch/keyboard navigation scenarios, five live-simulation Collector captures and exact preservation of the preceding installed Cards save.

This audit reconciles accepted backlog items with the current entry and production sources. Older sections below are preserved release history; their “current” wording and earlier pending items are superseded where this table or a later release says so. The accompanying performance change raises interpolated paint cadence to 120 Hz with unchanged 60 Hz physics and graphics.

The current catalog has **81 cards (43 Common / 23 Rare / 15 Legendary)**. Common Growth Seed adds +3, the existing Rare +5, and Legendary +8 with +9/+10 rank improvements. A Common seed has six relative tickets; if none has been acquired, the second real Common flight reward supplies one. Actual generated receipts survive reload, acquisition remains remembered after Melt, and rarity rolls and starters stay unchanged. The [matched 10,000-expedition production audit](growth-seed-rng.md) measured 1.41% → 68.92% seed availability before the earliest reachable camp, 5.94% → 99.80% by map one, and 16.82% → 100% by the final trophy in this sample. These assume successful clears and do not measure human win rates. Grow retains three shared expedition actions, exact tier/copy amounts, one refill and no heart healing; Improve/Evolve/Forge remain camp-only. The final release passes 225 focused tests and 467 JavaScript syntax checks; [full release evidence](cards-renewal-release.md) includes the approved frames, installed-save migration and offline package.

| Accepted item | Disposition and concrete evidence |
| --- | --- |
| Cards by default; legacy book in Advanced; separate saves | Implemented in `dist/app.mjs` and the launchers. Fresh `/` opened normal Cards without a mock flag, New Game entered First Light, and Settings exposed legacy only under Advanced. The actual previous installed worker upgraded without changing the legacy save. |
| Three initial full active faces; guaranteed optional Guide | Implemented in `dist/skill-cards.mjs` and `dist/card-ui.mjs`. Actual New Game offered two Common choices excluding Guide, equipped the chosen card and Guide in slots 1–2, and left slot 3 free. Both occupied faces and their lower rules bands were inspected at 844×390 and 720×280. |
| Owned Deck, free stow/reorder, finite uses, batch Melt, repeatable Forge | Implemented in `dist/skill-cards.mjs`, `dist/model.mjs` and `dist/card-ui.mjs`. `card-deck`, `card-anytime` and `card-catalog` focused tests cover exact quotes, stale taps, identities, uses and paused-flight reconciliation. Normal flight opened the editable paused Deck; warm Continue restored paused flight. |
| Four-column reserve scrolling without pagination | Implemented in `dist/card-ui.css` and `dist/card-ui.mjs`. Actual sample Deck computed four columns and had no visible page controls; its screenshot was inspected. It uses production Deck actions without writing either journey save. |
| One coherent card face, concise rule bands, keyword help and uses | Implemented in `dist/card-ui.mjs`, `dist/card-rule-bands.mjs` and `dist/card-terms.mjs`; covered by `card-workbench.test.mjs`. A real owned card opened its keyword dialog. Name/art/rules hierarchy and compact active faces were inspected. |
| 71 cards, ordered multipliers/replay, Echo II/III and family evolutions | Implemented in `dist/card-catalog.mjs`, `dist/skill-cards.mjs` and `dist/flight.mjs`; `card-catalog`, `card-row` and `card-magnitude` tests passed. The exact 75/20/5 reference is the normal/elite/guardian node mix; per-node card odds remain 83/15/2, 55/32/13 and 35/47/18. The catalog test verifies both. |
| Ready versus Needs position; read-only cached status | Implemented in `dist/card-status.mjs`. `card-status.test.mjs` passed immediate-neighbor compatibility, shared last-use, productive replay, nonmutation and bounded-cache cases. Reserve cards are not judged as though equipped. |
| Exclusive Rest allowance; independent Forge | Implemented in `dist/model.mjs` and `dist/card-ui.mjs`. `card-rest-clarity`, `card-anytime` and `card-magnitude` tests passed exclusive choices, no-benefit cases, Second Ember's successful second distinct action, Grow sources and Forge leaving Rest actions usable. |
| Guaranteed meltable Lift Guide; real efficient timing | Implemented in `dist/card-guide.mjs` and `dist/skill-cards.mjs`. `card-flight` and `lift-guide-boundary` tests passed visible late safe windows, actual costs/free Lifts, uncertain/ceiling suppression and nonautomatic input. Normal flight received the guaranteed Guide modifier. |
| Field Impulse/Chameleon source count changes duration, one ring spend | Implemented in `dist/collector-impulse.mjs`, `dist/skill-cards.mjs` and `dist/flight.mjs`. `card-magnitude` and `collector-field-impulse` tests passed exact doubling for two sources, unchanged force, one notification/wave, live reorder and deterministic replay. FPS evidence belongs to the separate performance pass. |
| Black Hole minimum 0.35 world rate; world-clock music and Rhythm | Implemented in `dist/black-holes.mjs`, `dist/flight.mjs`, `dist/music.mjs` and `dist/card-rhythm.mjs`. `world-clock` and `card-rhythm` tests passed core normalization, strongest-field choice, one dilation, slower-factor resume, pause/hidden-time guards and consumed trios. Real muted audio verification is retained in `scripts/music-world-transport-probe.mjs` and the current release evidence; it was not rerun in this audit. |
| Edge Reach: actual before/after help and real solid boundaries | Implemented in `dist/proximity-card-help.mjs` and `dist/edging-pulse.mjs`. `proximity-card.test.mjs` passed 48/72/96 reach boundaries, actual polygons, copied sources, honest displacement and nonmutating same-scene preview rows. |
| Collector attachment marks/tow, current flat art | Implemented in `dist/pickup-handling-cue.mjs`, `dist/wisp.mjs` and `dist/companion-art.mjs`; retained `collector-tow.test.mjs` and release gallery evidence cover the lower hook, intact shell and single body delivery. Normal root selected `flat2`. This audit did not rerun the tow movie capture. |
| Six-stop First Light, teaching, safe resume and practice isolation | Existing production curriculum is in `dist/tutorial-curriculum.mjs`, `dist/tutorial-context.mjs` and `dist/app.mjs`. Normal New Game reached the real practice and skip-once continuation; the complete practice/retry/visibility evidence is retained in [First Light](first-light-release.md), not remeasured here. |
| Living biomes, substantial ground/depth and nearest foreground clipping | Implemented in `dist/habitat-compositions.mjs`, `dist/near-landscape.mjs` and both flight renderers. [Living habitats](living-habitats-release.md), [composed worlds](composed-worlds-release.md), [nearest scenery](near-parallax.md) and [First Light](first-light-release.md) retain actual 48-course/foreground evidence. These art passes did not authorize global pixelation changes. |
| Fuel supply, exit packing and progression | Implemented in `dist/spark-supply.mjs`, `dist/model.mjs` and the flight layout. [Spark progression](spark-progression-release.md) supersedes the earlier open supply/pruning note and records the 60%-fuel target, exit transactions and all 48 courses. Historical simulation outcomes remain diagnostic rather than human win-rate measurements. |
| Giant Black Holes, lantern routes, committed forks/events and adaptive music | Implemented in the production hazard, layout, route/event and music modules. Retained [giant](steady-giants-and-ceiling-guide.md), [event](event-decisions-audit.md), [Collector/lantern](#current-backlog-audit--collector) and [score](lofi-and-terrain-contours.md) evidence describes the checked behavior. No newly reproduced defect was found in the current focused entry checks. |
| Earlier Collector Guard/targeting planning item | Already implemented in `dist/model.mjs` (`collector-last-orbit`, `collector-guard-repair`, Dense/Flash priority) and `dist/collector-preferences.mjs`. The historical “continue planning” checkbox does not describe a missing current mechanic. |

## Completed follow-up — collector-reel-1

The current catalog has **75 cards (37 Common, 24 Rare, 14 Legendary)**. Starter selection now opens an explicit Yes/No confirmation; preview and cancel preserve the run. A successful confirmation equips the chosen Common and one guaranteed Lift Guide. Shared cards use yellow conditions, green effects and passive bonuses, grey Common / gold Rare / purple Legendary ornaments, complete rules and padded 5:7 artwork. Drag grips and adjacent move arrows reorder mounted cards. The in-app Deck glossary and Field Guide use real game captures and a muted Collector reel video. Artifact chests have a distinct icon and casing in all contexts, while temporary effects print their actual lifetime.

Each newly generated map contains three reachable optional camps, each with one ordinary flight exit. Existing visited maps and edges are preserved. Recover, Add slot, Grow and no-benefit Continue now retain a visible completed receipt after reload. Forge, Improve and Evolve require a verified active or completed camp; equip, reorder and Melt remain available while safely paused elsewhere.

Collector waits until the body has passed an unreachable pickup, then tethers the intact pickup aft of the main wisp and reels it through a depth-changing corkscrew. Recovery begins at attachment and one body-contact delivery returns Collector ready. Return Spring, Haul Winch and ring Spring shorten that actual reel; established Field, Guard and Cache behavior stays intact. Lift Guide uses current velocity and the physical Lift cadence without reading future terrain. The main wisp has a bounded 24-particle wake with reduced-motion support. Card feedback uses five pooled icons and a single exact receipt/replay control below the objective.

Growth Ring now grants +1 maximum Spark permanently on each equipped flight clear, with copies and the shared replay; the active vessel grows without a refill. Wind Feather replaces Bellows Seal, unlocking cruising speed up to +6%, with baseline and every unlocked percentage selectable in Settings. Wayfarer’s Purse pays +5 Stored Sparks per clear action; Nest Egg pays +1 per 10 carried into flight, capped at +10 per action. Tight Packing pays +50/75/100% of naturally packed currency by tier and never packs its own bonuses. Clear receipts settle once across reload and repeated callbacks. Devourer consumes only its immediately right Rare card on a successful clear with a missing heart, then heals one; it preserves the pair at full hearts. Courier Tip II, Downbeat II and Toll Bell II have moved into Common rank-2 Improve effects (+3/+3/+4), with legacy instance migration. Wick Doubler retains three body-pickup uses; Fast Spool removes up to three seconds from an active reel per successful use.

Focused tests, actual normal mobile screens, quiet paired performance captures and the First Light/ordinary balance receipt below cover this batch. [Release verification](collector-reel-release.md) records the final package, installed-worker migration and live checks. Physical Pixel 10 timing and human balance feedback remain unavailable.

## Evidence from this correctness pass

The 114-test focused run passed `card-deck`, `card-anytime`, `card-catalog`, `card-row`, `card-magnitude`, `card-rest-clarity`, `card-status`, `card-rhythm`, `card-flight`, `card-workbench`, `lift-guide-boundary`, `proximity-card`, `world-clock` and `collector-field-impulse`. This was a baseline correctness run, not a full-suite run or a certification of subsequent performance changes. Historical 153-test release verification and the known broad-suite baseline are recorded separately in [the release notes](skills-cards-release.md).

The new muted Chrome check used actual normal `/` → New Game → First Light → skip once → starter → Deck → actual flight → paused Deck → reload/Continue. The same check inspected compact cards, keyword help and the sample four-column reserve. It reported no runtime exceptions, failing assets or document overflow in the checked states. Local evidence: `work/backlog-audit-2026-11-16/report.json` and seven screenshots. The initial card offer is seeded normally; no fake successful flight was used to reach these screens.

`scripts/cards-launch-probe.mjs` separately passed the real previous `skills-cards-2-mode-switch-1` installed worker → `skills-cards-3` upgrade, mounted order/remaining uses, exactly-once pending reward migration, legacy-save preservation, cold sample entry, prepared offline sample, first installation and desktop query forwarding. Its only request miss was optional `favicon.ico`. That historical probe verifies the preceding Cards package. The final `flight-120-1` gate passed 159 focused tests, the Dream replay probe and 445 JavaScript syntax checks. A new local secure-origin probe installed the actual `skills-cards-3` Pages worker, upgraded its cached launcher and cold workbench, checked prepared offline launch/catalog, and preserved both saved journeys byte for byte. The generated offline package contains 404 files, revision `cedaf0008053`.

## Remaining items and superseded requests

- **120 Hz paint cadence implemented:** matched desktop Chrome scenarios reached about 118–120 actual paint calls/s with unchanged physics and graphics. [Measurements and reproduction](performance-120.md) retain cold construction and retry-entry hitches as follow-up targets; they do not establish physical Pixel 10 timing.
- **External evidence:** no physical Pixel 10 frame trace or measured human reaction/choice/difficulty data is available. Scenery density and higher-chapter tuning remain human feedback questions; completed model/simulation checks are not blocked features.
- **Awaiting visual choice:** global pixelation alternatives are available through `card-art-preview.html` and the [visual review](visual-consistency-review.md). Keep the currently approved art until the player chooses. Imported environment art was separately approved and shipped.
- **Superseded as a release requirement:** the earlier Cards-versus-book equal-economy study. Cards is now the main game; the separate legacy book remains an Advanced option. Current Cards balance may be tuned without reopening legacy-book balance.
- **Proposals/deferred:** Bankrunner/Glider, the full Night Atlas replacement and the other companions. Their proposed mechanics are not a missing accepted batch. The legacy item-rating conversation remains paused at Search Spark.
- **Retired rules:** phoenix/3D presentation, multiple equipped companions, old artifact slots/recharge/Afterglow, checkpoint-only Deck edits, Forge consuming a Rest action, a 16-card catalog and uncopyable numeric Field Impulse are superseded by later decisions. Preserve their archive context rather than restoring them.

The concrete defect found in this pass was stale current-status documentation. The checked current gameplay scenarios produced no new reproducible runtime blocker. That statement is limited to the evidence above.

---

# Historical release audits

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

# Current backlog audit — Collector

Release `mist-undertow-1`. This entry describes the current rules and supersedes the historical release snapshots below.

The accepted implementation backlog is implemented, with the following audit corrections.

| Area | Current behavior |
| --- | --- |
| Companion | Collector is playable throughout the run. The other three portraits are locked in normal play and Test. The recovering field tests the visible pickup shell, prioritizes direct body pickup and signals successful contact. Both renderers use the same field and orbital depth. |
| Lantern chapter | The entire map ending at Hollow Sun uses paired darkness lanterns, progressive crossings, a reachable Flash and a first-encounter lesson. Its chambers and approaches are reserved against unrelated Dark Spark challenges. |
| Dream | Accepted rehearsal advances to its endpoint during preparation, then changes to normal lighting and waits for the player. Its inputs and eligible opening pickups are applied once. A changed viewport returns the player to the briefing to rehearse again. |
| Upgrades | The six book chapters have distinct accents and prerequisite inspection. Each rank has its own connected item with its previous rank as a prerequisite. Owned, Can learn, Save more and Needs prerequisite use distinct fills and readable text. An affordable prerequisite can be learned in place. Skills are available during the run, with a safe pause when accessed in flight. |
| Rewards and storage | Ordinary clears update the wallet quietly. Elite and guardian rewards offer accumulating automatic artifacts. Kept Light pays 5% per rank on the first 100 Stored Sparks carried into a successful flight, for at most 5 or 10 per clear. Practice, failures, repeated settlement and the final guardian provide no dividend. Overflow conversion and optional bonuses do not multiply it. Hand Seal and Deep Cache are exclusive pickup specializations, paying at most 2 or 4 extra Stored Sparks per cleared flight. Hand Seal requires direct body overfills; Deep Cache requires natural Cache-sized or larger overfills and accepts Collector delivery. |
| Teaching | Current terms, Collector, Luminance, interaction states and resource lifecycle are taught in small lessons. Practice spotlights target the current panels and controls. Skip tutorial and remembered topics apply. |
| Flight art | Five Spark sizes share plasma art with finer detail on large sizes. Absorption is shorter and pop arcs are finer. Spark Sense reveals pickups in place. Black Holes have a bright tilted accretion disk. |
| Terrain and forks | Twenty-four shaped crossroads configurations have validated routes. Texture baking is cropped to the visible playfield and full sway envelope, while colliders retain their original shape. Terrain and attached props share camera pixel registration. |

The selected capture combines Undertow’s circular flow with Mist’s vapor. The Hybrid preview and live flight use the same renderer, including large Sparks and compacted Collector cargo. The shell pops at contact and the free contents billow and flow into the receiver. The new style is the default. The Collector field is greener and slightly thicker, with about half the previous opacity at full range and a smooth fade toward the main wisp.

The [vocabulary list](icon-language-plan.md) is ready for wording and visual review. Earlier names, artifacts with slots, companion swapping, Afterglow reserves and Rest-only upgrading in the historical snapshots are superseded.

## Verification and remaining evidence

Publication rechecked on 15 November 2026. The live release marker is `mist-undertow-1`, source `431767ecbaea7b3f770a231777441eee768f3a18`. All 255 offline/release assets, including the worker and offline manifest, matched the local source after normalizing text line endings. The source changes after that release contain planning notes only.

The published game passed real Chrome checks for all five capture sizes, both renderers, Collector cargo, skill status fills, the lantern route, the paused entry lesson, normal home routing and locked companions in both normal play and Test. No browser exceptions or horizontal overflow appeared in these checked states. The working checkout is clean.

A physical Pixel 10 is not connected through the available Android debug bridge. Device frame timing and recorded human play therefore remain open evidence items. The new Collector eligibility and Guard-tree questions are paused design work.


A 116-flight lantern sweep retained paired beams and reachable Flashes with zero independent Dark Spark overlap. Production Dream probes cover normal, elite and guardian routes, including viewport changes. The coupled flight benchmark samples illuminated terrain and visible hazards with delayed touches. It now infers falling movement from successive visible observations.

Final focused verification passed 64 tests covering Storage and clear interest, separate skill ranks, lantern maps, Dream-related entry behavior, tutorial progression, Collector protection, proximity, terrain registration and route bonuses. Landscape browser checks at 915×412 and 667×320 verified distinct skill fills, rank purchases and readable controls. The large-Spark comparison fits 915×412 and 360×740 without document overflow.

The browser performance audit used actual Canvas2D at 915×412 CSS pixels, DPR 2, with a 4× CPU slowdown. Before cropping, the accelerated Thorn course sweep had a 195 ms maximum render and 35 render gaps above 100 ms. With cropped textures, the same stress case had a 74 ms maximum render and zero gaps above 100 ms. The Crystal pickup-effects case improved from a 99 ms to a 30 ms maximum render. A regression test checks coverage over the whole sway envelope and leaves collision vertices intact. These measurements describe the desktop browser stress test. A physical Pixel 10 trace remains open.

Economy reports separate completed-flight inventory scenarios from coupled flight control. The final 72 completed-flight inventory scenarios cover Collector at Ascensions 1, 2 and 6, three pickup/correction styles and four buying policies over two campaign seeds. The steady scenario has a median 10 paid purchases in 16 flights (0.588 per flight), median 21.2% of nominal ranks and maximum 32.7%. This includes the new interest reward. These scenarios assume successful flight clears, so their completion count is not a human success estimate. A delayed-input pilot still fails entire expeditions, including some early flights, despite demonstrated physical bypasses for the investigated falling-masonry and pinecone deaths. Human difficulty and actual cue recognition remain open playtesting questions. A bot failure alone does not establish an impossible map.

The larger Night Atlas replacement for numbered Ascension remains a design proposal. Its existing Map 2 forecast experiment is playable. Other companions are deferred while the Collector game is developed.

---

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

### Collector practice balance — 16 November 2026

Against the complete tracked `05bd2ba70331b1aef418baecc9ee17208de71c33` tree (832 archived files byte-verified), five matched human250 First Light sequences clear 5/5 before and after this batch. The new reel initially reduced that to 4/5: seed 1 hit terrain after three fuel-denied Lifts, with 6.176 internal fuel and 6.767 reel seconds remaining. Existing post-rim practice Sparks now meet the safe glide arc at .61h instead of .69h; counts, kinds, fuel values, hole drain, terrain and reel timing stay fixed. The delivery test uses the computed production reel duration, witnesses the reel and checks one delivery. All 22 focused practice/reel tests pass, including the committed three-sequence regression and safe recovery contact at three heights.

The ten matched ordinary first-flight pairs retain the same legal starter, entry state, seed and pickup inventory, with the real Cards flag and unchanged visible-observation controller. A1 clears 3/5 in both; A2 clears 3/5 baseline versus 2/5 new. The extra A2 loss is seed 2, `pinewood-timber-run`: its missed 20-fuel delivery is still reeling when fuel runs out. This remains a known ordinary balance limitation; no global or ordinary-route tuning was applied. These small synthetic samples are not human win rates. Full telemetry, hashes and exact seed-1 comparison are in ignored `work/collector-practice-check/report.txt`, `baseline-final.json`, `current-final.json` and `current-before-lane.json`.

Reproduce by archiving the full baseline into `work/collector-practice-check/baseline-05bd2ba`, then run `node scripts/collector-practice-balance-check.mjs --tree=. --other=work/collector-practice-check/baseline-05bd2ba --out=work/collector-practice-check/current-final.json` and `node scripts/collector-practice-balance-check.mjs --tree=work/collector-practice-check/baseline-05bd2ba --other=. --variant=baseline --out=work/collector-practice-check/baseline-final.json`. Validate with `node --test tests/prologue-gameplay.test.mjs tests/tutorial-reel-learning.test.mjs tests/collector-tow.test.mjs tests/collector-reel-flight.test.mjs`.
