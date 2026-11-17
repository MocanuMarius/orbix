# Orbix / Wispbound / Emberwing — project handoff

Prepared 16 November 2026 for another LLM to continue the project. This is a working-state handoff, not a claim that every historical request is finished. Read the latest pending requirements before changing code.

## 1. Start here

The repository now lives at `F:\Vibecode\Orbix`. The old location was `C:\Users\mocan\Documents\Codex\2026-11-12\can-w\work\emberwing`. The surrounding old Codex workspace was not the game repository. Use the new repository root for commands, servers, Git, and new artifacts.

Relocation was verified before this document/README were written: **114,301 files, 15,019,337,071 bytes and 21,368 directories**, with independent SHA-256 comparison of every file and zero differences. Git checks and an actual `npm start`/HTTP smoke check passed at the new location. External migration evidence is at `F:\Vibecode\Orbix-move-audit-20261116`; it is outside the game root. Document edits after that equality checkpoint are intentional and should not be mistaken for copy corruption.

**Old-copy status:** removal of the exact old Git root was rejected by automatic approval review before execution; the only stated reason was “blocked by policy”. No source files were removed. `F:\Vibecode\Orbix` is the verified authoritative working location; the original old repository remains an intact retained copy, and old parent attachment folders also remain. Do not alternate edits between the two roots or describe this as completed source deletion. Do not retry deletion as part of continuing the handoff.

Names are historical: **Orbix** is the GitHub repository/deployment name, **Wispbound** is the package and README title, and **Emberwing** appears in internal comments, server messages and agent instructions. Do not start a branding rewrite merely to make these match.

**Incoming Deck merge, 17 November 2026.** Bring the blocked-card treatment into the incoming card faces. Open the disposable preview at `/index.html?mock=cards&scenario=closed-eye` with Lantern Lens, Climb and Resonant Harvest together to verify the fully blocked, partially blocked and working appearances. End the pact and check that Lens regains its color. Use `getCardFaceAvailability(run, card, status)` from `dist/ui/cards.mjs`. Pass its result as `availability` to the shared `cardFace`, or consume its `state`, `reason` and presented `status` in the incoming renderer so a blocked card cannot also show a Ready check. The [Deck decision](DECISIONS.md#blocked-cards-in-the-deck--17-november-2026) records the intended behavior across layouts.

Recommended reading order:

1. [AGENTS.md](AGENTS.md): current model routing for Claude and Codex, delegation, art, accessibility and money constraints. Claude also reads [CLAUDE.md](CLAUDE.md).
2. This file, especially sections 2–4 and 13–16.
3. [Shared UI ownership and design principles](dist/ui/README.md).
4. The runtime owners relevant to the change; the source map below avoids treating galleries as production owners.
5. [Page cleanup audit](outputs/page-cleanup/audit.md), [menu simplification report](outputs/menu-simplification/report.md), and [graph summary](outputs/page-cleanup/graph-summary.json) for the interrupted cleanup task.
6. [Latest release summary](work/collector-vortex-release/final-summary.json) and adjacent proof reports for what was actually shipped.
7. [Current historical backlog audit](docs/backlog-current.md), then specific release notes as needed. [DECISIONS.md](DECISIONS.md), [BACKLOG.md](BACKLOG.md), and the older README sections are chronological archives and can conflict with current code or later user decisions.

This handoff was the requested work during relocation. No new tutorial, gift-flow, cleanup, economy or gameplay changes were authorized for implementation as part of writing it. No commit or publication is needed merely to deliver the handoff.

## 2. Latest user feedback: pending, not implemented

The following is the latest backlog. These reports supersede earlier statements that tutorial quality was complete. The user's exact wording is retained in the appendix so a new agent does not soften or reinterpret the concern. The user asked to finish the handoff process after recording this backlog; these game changes stay pending.

### P0 — starting gift leaks into Tutorial; real starting gift may be broken

- The user reports that the starting gift dialog appears inside Tutorial, where it should not.
- The user also reports that normal starting gift selection may not work. Reproduce this separately; do not assume the two symptoms share one cause.
- Intended flow: temporary tutorial loans → tutorial completion → the real run's starting draft → real game.
- Tutorial loans must remain temporary. They must neither replace the real starter selection nor consume, reroll or commit a real starter inadvertently.
- Investigate controller routing and state transitions around New Game, Tutorial, suspended real run, completion/skip, starting gift, and reload/Continue.
- Relevant owners: `app.mjs`, `model.mjs`, `practice-route.mjs`, `tutorial.mjs`, `tutorial-coach.mjs`, `onboarding.mjs`, and starter functions in `skill-cards.mjs`.
- Acceptance should cover fresh profile, existing profile, Tutorial from Home, new-run Tutorial, skip once, Remember & skip, completion, cancel/back, reload, and a suspended real run. Verify both Cards and the separate Legacy save remain isolated.
- Do not remove the deliberate `isCardRun(run) && !run.isTutorial` distinction to make a UI branch pass. Practice already uses a temporary adapter into the real card engine.

### P1 — redesign tutorial pacing and teaching order

- The user considers the current tutorial poor. The shipped seven-stop Edition 3 is current implementation, not an approved final teaching experience.
- **Never require reading while actively flying.** Stop/pause the flight for interactive teaching popups, and resume safely after the player explicitly continues.
- Popups should include actual gameplay videos and clear definitions, rather than relying on text or decorative approximations alone.
- Introduce what Collector is and what it looks like **before** explaining fetching, delivery or recovery. Explain the concept first, then let the player practice it.
- Apply this concept → paused demonstration/definition → practice order across the tutorial. Do not presume the existing seven stops or all their content should be retained unchanged.
- Existing contextual safety checks, slow motion and practice isolation are useful infrastructure, but do not answer the user's pacing complaint by themselves.
- Preserve readable landscape touch controls, glossary access, Back/Cancel context, and save isolation during the redesign. Bring substantial new design/architecture choices back to the coordinator/user before implementing them.

### P2 — cleanup unused pages, offline junk and menu clutter

- This was the active task before relocation/handoff interrupted it. Read-only audits are complete; **cleanup source changes have not been implemented**.
- Continue by discussing the audit's product/UI cuts and removing clearly safe junk with evidence. Do not blindly delete history, remote-only release assets, developer tools, or untracked art.
- Five UI candidates, proposed rather than approved: hide unavailable companion roster choices; hide the one-option Baseline cruising-speed selector until progress exists; consolidate duplicate Help navigation; gate Rest Preview as a developer tool; remove same-screen duplicate Deck/Loaned Cards entries.
- Small identified repairs include stale six-stop First Light copy, hardcoded “3 MAPS PER RUN” inside practice, Install/App-status Back returning to the wrong origin, and credits returning to a developer scenery review.
- Keep useful mechanics/content when simplifying navigation. Deck reserve management, equipped view, Workshop, glossary, Field Guide, Try row, combo practice, scorecards and TEST/Legacy override have distinct purposes.
- See section 14 for exact page/cache findings and safe boundaries.

## 3. Latest decisions that must survive handoff

- **Keep Vortex II.** The user cancelled the later direct-hit Collector proposal. Do not implement it, remove the vortex, or treat that cancelled proposal as approved backlog.
- Keep Collector's attachment hooks/cues. They are intentional, including the small green attachment cue and intact pickup transport.
- Cards remains the default game. Legacy Skills remains available under Settings → Advanced, with a separate save.
- Current tutorial code is Edition 3 with seven practice stops and real card loans; tutorial pacing and starter routing now need follow-up under the feedback above.
- Art must match actual game palette, lighting, framing and pixel density at displayed scale. Global pixelation changes require previews of several actual game screens and explicit user approval.
- Keep local/untracked Collector motion studies, travel-guide studies, captures, scripts and art. They are user work, not disposable because Git does not track them.
- Do not infer that an older unchecked planning item is still unimplemented: some Collector guard, targeting and other systems were later implemented. Conversely, historical “complete” prose is not evidence that the latest reported bug is fixed.

## 4. Exact code and published release state

The latest verified source commit is `b628df9951ee1320b525306ef4574081a9167c52` on `main`. The source tracked worktree was clean at release verification; untracked and ignored local work still exists and must be preserved. Re-run `git status` before making new assumptions after relocation/document edits.

Remote: [MocanuMarius/orbix](https://github.com/MocanuMarius/orbix). Public game: [Orbix](https://mocanumarius.github.io/orbix/). Latest verified launcher: [collector-cards-1](https://mocanumarius.github.io/orbix/cards.html?v=collector-cards-1).

| Release fact | Verified value |
| --- | --- |
| Published version | `collector-cards-1` |
| Source commit | `b628df9951ee1320b525306ef4574081a9167c52` |
| Pages commit | `d7ea81d48278685f984522a5217ba35adcd6413a` |
| Offline revision | `89bde7b33ced` |
| Published offline graph | 487 files |
| Public exact-byte verification | 489 files: graph + worker + manifest |
| Latest focused tests | 119 passed, 0 failed |
| Publication overlay | 604 dist files, plus `release.json` |
| Preserved remote-only files | 713 |
| Deployment proof | [GitHub Actions run](https://github.com/MocanuMarius/orbix/actions/runs/43934316853) |

**Critical release trap:** the canonical checkout still uses the older `guide-clarity-1` import/version token and a generated 482-file `dist/offline-list.js`. The latest release was stamped and packaged in an **isolated artifact**, not by globally stamping the source checkout. Therefore a clean source tree can contain the current gameplay changes while its release label/cache list is older than the live game.

The five source-runtime dependencies missing from that old canonical offline manifest are `collector-vortex.mjs`, `practice-route.mjs`, `route-bonus-copy.mjs`, `assets/guide-atlas-chevron.svg`, and `assets/guide-atlas-spread.svg`. The published 487-file graph includes them. Never deploy the old manifest over the live release or mistake `guide-clarity-1` in source for the current public version. Repackage deliberately and verify every runtime/lazy dependency.

Authoritative local release evidence is under ignored [work/collector-vortex-release](work/collector-vortex-release/): `final-summary.json`, `source-report.json`, `prepare-report.json`, `source-artifact-audit.json`, `publication-report.json`, `publication-scope-audit.json`, `public-content-report.json`, `public-pwa-report.json`, `upgrade-report.json`, `package-browser-report.json`, `artifact-tests.log`, and the isolated `artifact/`.

The upgrade proof records one fixture normalization: an already tutorial-complete Cards fixture changed `onboarding.stage` from 0 to 4; other Cards fields deep-equal, and untouched Legacy raw bytes were identical. Do not claim byte-for-byte save equality without that exception.

## 5. Running locally after relocation

This is a static browser game with ES modules, CSS, image/audio/video assets, a Node static development server, and Node built-in tests. There is no bundler or transpilation step. `package.json` has no runtime npm dependencies. Do not add React, a UI framework, a state store, a package manager migration, or a build pipeline to solve routine changes.

Use PowerShell, one shell end-to-end for file operations:

```powershell
Set-Location -LiteralPath 'F:\Vibecode\Orbix'
node --version
git status --short --branch
npm start
```

Default server: `http://localhost:4173`. It serves `dist/`, supports media byte ranges, sends `Cache-Control: no-cache`, and provides `/__dev-revision`. To run a separate proof server:

```powershell
$env:PORT = '4184'
node server.mjs
```

Useful local routes: `/` for normal game; `/game.html` for the direct responsive document; `/cards.html` for the compatibility/PWA Cards launcher; `/game.html?cards=0` for explicit Legacy; `/game.html?perf=1` for performance diagnostics. Use an isolated browser profile for destructive test fixtures.

`npm run preview:rest` starts the local Rest fixture tooling at port 4180. Other probes often assume 4184 or have script-specific environment variables; read the script header before running. Old reports contain the old absolute root and ephemeral ports. These are historical references, not paths to keep launching.

Desktop uses a 900 × 405 logical landscape game, requests 150% display scale, and fits smaller windows. Toolbar controls include scale, Fit and fullscreen. `?display=desktop`, `?display=native`, and `?zoom=150` override routing/scale. Phones get the native responsive document and safe areas. Display changes pause a live flight.

No game secrets or server-side account configuration are required to run locally. Do not copy browser-profile contents, tokens or credentials into handoff documents or commit them. Existing proof profiles are local artifacts, not distributable game assets.

## 6. Architecture and source ownership

All paths below are relative to the repository root. `dist/` is editable runtime source, not a build output to wipe/recreate. `work/` and `outputs/` contain substantial retained release/proof/capture work; ignored does not mean disposable.

| Area | Primary owners | Responsibilities / cautions |
| --- | --- | --- |
| Browser entry and display | `dist/index.html`, `loading.html`, `game.html`, `cards.html`, `display-layout.mjs` | Desktop shell/native phone routing, launcher/bootstrap and display controls. Preserve compatibility entry links. |
| Main orchestration | `dist/app.mjs` | Screen/sheet stack, action dispatch, settings, pause/resume, entry/reward flow, tutorial triggers, Deck navigation and persistence checkpoints. Avoid putting model rules into markup. |
| Run state and transactions | `dist/model.mjs` | Profiles, run/map construction, attempts, checkpoints, rewards, starter/camp/Deck actions, migration and banked progression. Central transaction owner. |
| Cards definition/execution | `dist/card-catalog.mjs`, `skill-cards.mjs`, `card-standalone.mjs`, `card-offer-context.mjs` | Catalog, rarity rolls, starter offers, ordered execution, charges, modifiers and per-flight hooks. Printed units differ from simulation fuel. |
| Cards UI | `dist/card-ui.mjs`, `card-workshop.mjs`, `card-guide.mjs`, `card-status.mjs`, `card-terms.mjs`, `card-rule-bands.mjs`, `card-art.mjs`, `card-ui.css` | Actual Deck/card faces/reader, workshop, glossary and status. Preserve term-return context and real renderer reuse. |
| Row explanation/practice | `dist/card-row-preview.mjs`, `card-row-try.mjs`, `card-row-help.mjs`, `card-row-feedback.mjs`, `combo-lesson.mjs` | Nonmutating quotes, real event explanations, Try row and safe combination practice. Do not charge real uses for previews. |
| Flight simulation | `dist/flight.mjs` | `WispFlight`, seeded layout, fixed-step physics, collisions, pickups, real card events, pause/Dream/finish state and interpolation. Large central engine file. |
| Renderer | `dist/wisp-renderer.mjs` | Current production pixel-art Canvas view, terrain/light/effect composition and caches. `flight.mjs` loads `WispFlightView`. |
| Alternate renderer | `dist/pixi-renderer.mjs`, `dist/vendor/` | Retained Pixi/WebGL implementation; not the default active renderer merely because fields are still named `pixiView`/`pixiReady`. Trace actual imports. |
| Input / time | `dist/flight-input.mjs`, `boost-control.mjs`, `flight-entry.mjs`, `flight-end.mjs`, `world-clock.mjs` | Pointer ownership, transformed display coordinates, Lift/gesture controls, countdown and time scaling. Avoid double-scaling simulation time. |
| Collector | `dist/wisp.mjs`, `collector-vortex.mjs`, `collector-load.mjs`, `collector-preferences.mjs`, `collector-field-art.mjs`, `capture-art.mjs`, `pickup-handling-cue.mjs` | Fetch eligibility/priority, intact cargo/reel/recovery, Vortex II, attachment and field cues, guard/repair. Companion identity and second Collector are separate questions. |
| Companions/art | `dist/companion-abilities.mjs`, `companion-art.mjs`, `wisp-orbit.mjs` | Companion catalog, availability and visuals. Only Collector selectable, even TEST; cards can add a second Collector. |
| Fuel/pickups/economy | `dist/vitality.mjs`, `pickups.mjs`, `condensed-glow.mjs`, `spark-supply.mjs`, `spark-size.mjs`, `pickup-art.mjs` | Simulation/display scale, fuel/lives, pickup specs, overflow/exit packing and supply. Preserve single-award physical pickup semantics. |
| Campaign/routes | `dist/landscape-map.mjs`, `map-guide.mjs`, `campaign-ui.mjs`, `route-bonuses.mjs`, `route-bonus-copy.mjs`, `route-bonus-ui.mjs`, `route-offers.mjs`, `route-forecast.mjs`, `flight-preview.mjs` | Reachable map state, next-stop review, route bonuses and honest durations/effects. Do not make previews mutate a real route. |
| Worlds / geometry | `dist/biomes.mjs`, `biome-courses.mjs`, `biome-dynamics.mjs`, `world-expansion.mjs`, `level-scenery.mjs`, `scene-prop-art.mjs` | Twelve biomes × four authored courses, collidable props and local interactions. Decorative ecology must not become a collider accidentally. |
| Terrain/environment art | `dist/authored-environment.mjs`, `near-landscape.mjs`, `terrain-ecology.mjs`, `terrain-boundary.mjs`, `contact-edge-*.mjs`, `terrain-light.mjs` | Layered authored scenery, fixed world-pixel mineral rim, near foreground, contact palettes, lighting/shadows and raster caches. |
| Hazards / encounters | `dist/black-hole-*.mjs`, `boss.mjs`, `guardian-*.mjs`, `shutter-cone.mjs`, `flight-objectives.mjs`, `flight-challenges.mjs`, `flight-forks.mjs` | Fuel-drain hazards, telegraphed guardians, terrain warning/optional objectives and committed route choices. |
| Tutorial | `dist/tutorial.mjs`, `tutorial-coach.mjs`, `tutorial-context.mjs`, `tutorial-curriculum.mjs`, `tutorial-steps.mjs`, `practice-route.mjs`, `onboarding.mjs`, `flight-hint-safety.mjs` | First Light, loan cards, lessons, contextual gates, replay/skip and suspended real run. Latest redesign is pending. |
| Relics | `dist/artifact-effects.mjs`, `artifact-copy.mjs`, `artifact-info.mjs`, `artifact-lessons.mjs`, `guardian-artifacts.mjs`, `collection-view.mjs`, `reward-screen.mjs` | Accumulating run relics, almanac/discovery and reward/Collection presentation. Older slot-equipped-artifact designs are obsolete. |
| Menus / shared UI | `dist/run-menu.mjs`, `menu-world.mjs`, `menu-icons.mjs`, `dist/ui/` | Production renderers and shared primitives; see exact family ownership in `dist/ui/README.md`. Gallery facades are not second implementations. |
| Audio | `dist/music.mjs`, `dist/assets/audio/`, sound hooks in `flight.mjs`/`app.mjs` | Adaptive synchronized music stems and independent music/FX controls. Preserve browser gesture/autoplay behavior and reduced-motion separation. |
| Scores/sharing | `dist/game-score.mjs`, `score-result.mjs`, `scorecard.mjs`, `scorecard-viewer.mjs`, `scorecard.html`, `replay-ui.mjs` | Local personal scores and shareable scorecards with producing build version. Do not silently rewrite old snapshot versions. |
| PWA / updates | `dist/pwa.mjs`, `worker.js`, `offline-list.js`, manifest files | Complete-release caching, safe updates, launcher compatibility and offline dependencies. Graph generated by `scripts/pwa-assets.mjs`. |
| Development server | `server.mjs` | Static root, MIME/range handling and debounced runtime revision endpoint. Capture/preview file changes are excluded from reload triggering. |
| Verification | `tests/*.test.mjs`, `scripts/*.mjs`, `outputs/`, `work/` | Node tests, actual browser/engine probes, retained measurements/captures and isolated release packaging. See evidence limitations below. |

## 7. Current gameplay and player flow

This is a landscape, one-handed pixel flight roguelite. The player steers a luminous wisp with Lift and gliding, spends flight Sparks, collects pickups, and chooses branching stops between flights. Collision protection, fuel, light visibility, build effects and optional objectives create tradeoffs.

Normal menu exposes New Game, Continue, Tutorial and Settings. Cards is the default; Legacy is an explicit Advanced override. Intended tutorial-to-real-run flow is documented in P0 above because the user reports a current defect.

A normal expedition has three named maps: The Forgotten Verge, The Rootbound March, and The Warden’s Reach. Baseline starts with three lives/attempts. An unprotected collision loses an attempt rather than chipping a combat health bar. The wisp can fall into a pickup and recover at zero fuel. Do not equate low fuel with immediate death.

Each stop has actual route/flight context; support/event/treasure/camp services differ from ordinary, Elite and Guardian flights. Maps have optional reachable camps. Rewards settle through model transactions, including once-only clear income and card receipts. Death/retry, reload, Back, pause editing and repeated callbacks must not duplicate income or refill consumables.

Fuel Sparks are the same shell size with three intensities/arc densities. Baseline meter: 30 printed Sparks. Normal Lift: 3. Spark/Cluster/Cache restore 6/12/18 printed Sparks before modifiers. These are **not** their internal engine numbers: base meter 100, Lift 10, pickups 20/40/60, `GLOW_DISPLAY_SCALE = .3`, and `CARD_UNIT = 10/3` simulation units per printed Spark. Follow existing helpers; never apply .3 twice.

Stored Sparks are a separate banked currency (`run.condensedGlow`), not fuel under another name. Baseline starting balance is 8. Naturally packed overflow, exit reserve and flat rewards have separate rules. Baseline natural packing cap is 20 per flight before upgrades; base conversion is one sixth of printed surplus. Exit reserve packing is separate from that overflow cap. Tight Packing modifies naturally packed income; it must not recursively multiply its own payment or flat/Melt income.

Luminance is visibility, not fuel. Flash, Dusk/Dark Sparks, Black Holes, lantern shadows and light waves have different rules. Use `pickups.mjs`, glossary and focused tests to distinguish them rather than generalizing every glowing object into a fuel pickup.

Input: Lift button and normal playfield taps Lift; MENU pauses. Field Impulse, when learned/equipped and eligible, uses up/down/right gestures for levitate/dive/surge; playfield taps resolve on release while the Lift control remains immediate. Pointer capture/transform correction prevents scaled desktop misclicks and double input. Disabled/paused/preflight/Dream states block real actions. Preserve keyboard/focus semantics when changing menus.

Entry loading ends paused. Resume uses a frozen countdown and gradual time recovery; established behavior includes three-second countdown and a three-second 0.1× → 1× ramp. Resuming should not accidentally Lift. Pauses, visibility changes, guide popups, Dream wake-up and display changes share safety concerns.

## 8. Cards, economy and run/permanent boundaries

The current catalog has **85 cards: 46 Common, 24 Rare, 15 Legendary**, verified by importing `CARD_CATALOG` directly during handoff preparation. Verify again if later edits change it; older 75/81-card counts are historical. The latest four Collector cards are Twin Orbit, Twin Wick, Long Spool and Cast Line.

New Cards runs start with three ordered active slots, two occupied: guaranteed Lift Guide plus the selected starter. Current starter version 3 offers three distinct choices: 80% all Common, 20% two Common plus one curated Rare, at every Ascension. Curated starter Commons/Rares are explicit pools in `skill-cards.mjs`; new catalog cards are not automatically starters. Back/No/reload must preserve the roll. Unpicked older v1/v2 saves retain their original two-choice behavior.

Ordinary earned card rarity odds are 83/15/2 Common/Rare/Legendary; Elite 55/32/13; Guardian/boss 35/47/18. Context can weight identities within a rarity, and card drafts have discovery/safeguard logic. Do not describe those raw rarity odds as uniform identity probabilities.

| Service / rule | Current source behavior |
| --- | --- |
| Melt | Common 10, Rare 20, Legendary 40 Stored Sparks; spent limited-use card returns 0. Preview exact selected set and confirm destructive removal once. |
| Improve | Base Common 15, Rare 25, Legendary 40 × current rank. Preserve remaining uses. Definitions control max rank. |
| Evolve | Target Rare 25, target Legendary 40; supported named family evolution only. Preserve identity/use rules. |
| Refill | Supported surviving multi-use flight cards only; `ceil(full tier Improve price × missing / actual capacity)`. No consumed, one-use, inventory Rest or permanent-progress refill exploit. |
| Forge | At each Rest, Rare starts at 30 Stored Sparks; Legendary starts at 60 and requires a Rare mounted. Each successful craft raises only that rarity’s price at this Rest: base × 1.5 per prior craft, rounded up at checkout. Reopening or reloading the same Rest retains its prices; the next Rest starts fresh. The previewed card joins the Deck and costs no Rest action. |
| Camp service gate | Improve/Evolve/Refill/Forge require a verified active or completed camp context. Equip/unequip/reorder/Melt work at safe paused checkpoints, including paused flight. |
| Slots | Three initially; cap five. Add one slot per map at Rest, without healing/refill. |
| Rest action | Normally one of Recover/Add slot; Grow unlocked by owned Growth Seed. Second Ember can grant a second distinct eligible action. |
| Growth Seed | Common +3, Rare +5, Legendary +8, latter can improve to +9/+10. All owned Seeds add, capped +90 per action, three shared Grow actions per expedition. |

Rest cards remain in the Deck rather than consuming flight slots. Growth Seed's Common identity has six draw tickets; if no Seed acquired, the second actual Common flight reward supplies one. This safeguard respects rarity and cannot restart after Melt. Second Ember spends only on a successful eligible second action.

Cards resolve matching events **left to right**. A multiplier affects eligible bonus already earned in that pass, not base pickup fuel. Refrain can replay matching numeric actions once from slot one while sharing real uses and one physical pickup/wave. Copy restrictions matter. Keep displayed row receipts consistent with real execution, not a parallel hand-coded arithmetic model.

Owned cards, equipped passives, rest growth, currency and most relic/build effects are run-owned. Growth Ring can grant permanent printed maximum capacity after equipped successful clears. Wind Feather can unlock permanent cruising speed, capped +6%, selectable down to Baseline in Settings. Profile receipt ledgers settle these once; New Game resets ordinary run builds. Do not turn a lasting profile gain into a temporary equipped bonus or make practice/TEST farm permanent gains.

Dream is a Common card: after a committed Rest and before Elite/Guardian, it rehearses the first eight seconds in full light with free Lifts. Repeat or Wake at the selected opening end with pickups; real handoff begins paused and resumes safely. Rehearsal spends no saved hearts/card uses/rewards; extra Dream copies do not stack. Legacy Dream remains a separate skill system.

## 9. Collector: preserve the chosen behavior

Collector is the green automatic helper. The player body gets first opportunity; it rescues eligible missed pickups within reach. Small/Cluster are baseline; Cache and Flash handling follow their actual card/skill gates. Red/negative pickups are not generically fetched. Main-body collection retains its own rules and full base values.

The attachment cue/hooks and intact cargo are intentional. Recovery starts with attachment/reeling, runs through visible travel, and ends on delivery contact; there is no extra ordinary cooldown after delivered cargo. Cargo remains an actual pickup, with exactly one award on body contact. Death/unequip/reconciliation must release or retain the right load without duplicates.

Natural fuel size sets base recovery **before Cache compression and modifiers**: Spark 3⅓ seconds, Cluster 6⅔, Cache 10. Flash/noncargo base recovery is 10; Guard recovery is four base cycles, 40 seconds before modifiers. Existing recovery multipliers/boons apply afterward. Cache handling can compress to 12 printed fuel while its original 18-value recovery remains the basis.

Vortex II constants in `collector-vortex.mjs`: setup .252 s, launch .168, orbit .504, absorb .126, nominal total 1.05 s; two fast turns, minimum orbit radius 55, minimum visual scale .22. It retains normal absorption/contact and scales within real recovery, including shortened reels. Reduced motion uses the quiet path. The direct-hit alternative was cancelled.

Twin Orbit is Rare and supplies a second independent Collector while equipped, maximum two. Twin Wick is Common, one use, unlocks the second Collector for the expedition after real eligible flight activation; redundant uses are retained while Twin Orbit already supplies it. The second does not duplicate first-Collector guard or Field Impulse ownership. Pause, preview, practice and Dream must not spend Wick.

Long Spool: +35% fetching reach for five successful extra catches. Cast Line: double reach for two. They spend only for a real eligible catch beyond baseline range, use the shortest sufficient extension, do not stack range arbitrarily, and leave first body opportunity intact. Fast Spool shortens an active reel after a real passage body pickup, spending a use only if time was saved.

Other companion identities exist in catalog/legacy engine transport, but `getCompanionUnlock` makes **only Collector selectable** and `COMPANION_TEST_UNLOCKS` is false. TEST does not unlock Protector, Runner or Space Timer. Multiple Collectors from cards do not mean the older multi-role fleet design returned.

## 10. Tutorial and persistence contracts

`PRACTICE_EDITION = 3`; `isPlayablePractice` checks tutorial + edition. Seven practice stops currently cover Lift/collection/glide, proximity/Flash, treasure/card preparation, Rest, rhythm/Harvest, Black Hole and Guardian concepts (read map construction for exact route order). Do not rewrite that summary into an assertion that the experience is good; the latest user feedback explicitly requests redesign.

Practice keeps `isTutorial = true`. `isCardRun` deliberately excludes Tutorial to protect real rewards, progression, camp logic and spending. `practiceCardRun` creates a temporary card-engine view and `practiceCards` holds loans; `practiceModifiers` supplies real effects. It is not acceptable to globally make Tutorial an ordinary Cards run to display a card.

Current contextual hints use quiet-input and collision-projection checks (including approximately one second since input and .7 seconds without projected impact), then pause/teach through controller infrastructure. Countdown/slow-motion state must remain safe. The user nevertheless reports needing to read while flying and bad teaching order: reproduce actual visible flow, not just static safety helpers.

Current state schema is v7. Legacy key: `wispbound.save.condensed.v7`; Cards controller prefixes it to `cards-pilot:wispbound.save.condensed.v7`. Tutorial and a suspended real run live inside the relevant mode's state. Settings/score/audio/display storage can have additional keys; preserve them when writing tests and migrations.

`loadState` validates/migrates run data, interrupts active attempts safely, restores routes/themes/charges/companions, settles checkpoints and banks progression once. `saveState` returns success/failure and catches storage errors. PWA reload safety relies on a successful save, not merely calling a persistence function.

Mock inspectors/workbench are isolated in memory and must not read/write either player's journey. Existing test profiles may already have tutorialComplete or unlocked state; always distinguish fresh-profile reproduction from an old fixture. Do not use the user's real Chrome profile for test resets.

## 11. Rendering, audio, art and accessibility

Physics remains fixed at 60 Hz with interpolation targeting up to 120 paints/second. Actual production rendering uses the custom pixel-art Canvas `WispFlightView`; retained names such as `pixiReady` are historical. `pixi-renderer.mjs` is a separate retained implementation, not evidence that the normal game depends on a runtime npm framework.

Terrain/light/ecology use caches and world geometry shared with collision. Bright solid boundaries need readable contrast from decorative backgrounds. Terrain Spirit Fire's mineral rim is fixed to world pixels, with restrained inward light penetration. Preserve dynamic shadow behavior and foreground clipping when editing materials. New visual work must be checked on actual in-game screens.

Reference platform is Pixel 10 landscape, but CSS viewport checks are not hardware measurements. Core checks include 900×405, 915×412, 740×360, 640×320 and 667×300; desktop scales must remain readable. Use at least 44×44 CSS-pixel targets, safe areas, visible keyboard focus, proper buttons/ARIA, readable disabled labels, reduced motion and calm text grounds.

Use `resourceSymbol('energy')` for Sparks and `resourceSymbol('packed')` for stored containers. Reuse real pickup, Collector, relic and landmark renderers. Standard card language is yellow conditions, green effects/passives, and distinguishable Common/Rare/Legendary ornaments; use labels/structure as well as color. Terms use consistent dotted-underlined clickable glossary help, including touch/keyboard return to the original selection and scroll context.

Shared UI families export actual production renderers. Gallery-only styling or mocked copies are not adequate fixes. Keep rules in model owners and orchestration in `app.mjs`; keep new shared renderer inputs explicit, escape untrusted text and preserve public exports/CSS/data-action contracts.

Music and FX toggle independently. Adaptive music uses synchronized local stems; browser autoplay unlock requires actual user interaction. Preserve audio attribution/credits, including licensed environment art and adaptations in `nature-credits.html` and related asset credits. Deleting a review page does not authorize removing credit/license text.

## 12. PWA, offline and automatic update behavior

The worker names complete release caches using release + revision. Installation fetches the entire offline list and marks completion; failed partial installs are cleaned up rather than advertised as ready. Keep old installed releases usable until the new release is fully cached.

The page and desktop shell share installation state. Visible/online sessions check for releases on startup/foreground/online events and roughly every 60 seconds. Local development additionally checks `/__dev-revision` every five seconds while visible and online. The server debounces runtime writes and ignores captured preview/image changes to avoid constant reloads.

Automatic activation/reload is deferred to safe game checkpoints. Every registered client must be safe; its `beforeReload` save must succeed. Apply once, preserve live flights, and retry after later successful checkpoints if saving failed. Controller change on the first installation should provide offline support without an unnecessary restart.

The worker reconstructs cached **image** responses from `arrayBuffer()` before returning them. This fixes a Chromium cached response-stream stall. Do not “simplify” it back to a raw cached stream without regression evidence. Keep video byte-range/offline support and lazy glossary assets in verification.

Compatibility launchers have online update/bootstrap logic while installed offline play remains pinned to a complete cache. An unprepared offline visit explains that a connection is needed. Test both new offline installation and upgrading an already installed old worker, not just online reload.

`scripts/pwa-assets.mjs` traverses static module/HTML/CSS/asset references from explicit roots and emits `offline-list.js`. Runtime-built HTML/CSS links and lazy media require explicit coverage. The current manual root list includes many developer/review pages; cleanup is pending. Regenerating the graph mutates a runtime file, so do it deliberately within the relevant task/artifact.

## 13. Verification: commands, evidence and limits

Use focused tests related to the changed owners, then relevant actual-browser/engine probes. Do not add low-value tests that merely restate markup implementation. The historical broad suite includes prototype/removed-API checks; report current failures honestly rather than claiming all old tests are the specification.

```powershell
Set-Location -LiteralPath 'F:\Vibecode\Orbix'
npm test
node --test tests/collector-vortex.test.mjs tests/collector-recovery-tiers.test.mjs tests/collector-cards.test.mjs
node --test tests/playable-practice.test.mjs tests/card-starter-three.test.mjs tests/automatic-updates.test.mjs
npm run check:ui-components
```

`npm test` runs `node --test tests/*.test.mjs`. It is available, but the latest recorded 119/0 is a **focused release run**, not a new all-suite pass. See `work/collector-vortex-release/artifact-tests.log` for its exact selection/output. Do not relabel historical 33/114/153-test counts as the current total.

Useful probes: `scripts/collector-production-probe.mjs`, `playable-practice-probe.mjs`, `automatic-update-probe.mjs`, `backlog-ui-proof.mjs`, `reward-compositions-probe.mjs`, `route-preview-probe.mjs`, `travel-guide-probe.mjs`, `ui-components-probe.mjs`, and the companion/card focused scripts. Read their expected base URL/env/profile/output handling first.

Collector production proof uses a real seeded expedition and normal route/flight entry, stages one missed pickup, and uses native production Collector/recovery/renderers. It is stronger evidence than a prototype movie; it still is not an unaltered human play session. Other fake Canvas/headless fixtures validate logic, not appearance or physical performance. Keep that distinction explicit in reports.

Browser probes typically use installed Chrome/CDP without adding a package dependency. Keep disposable profiles separate, close owned processes, and preserve existing user browser state. Captures/reports often go to `outputs/` or ignored `work/`; their size can be large.

Latest release verified public exact bytes, automatic phone entry, offline Home/lazy help, old installed-worker auto-upgrade, approved source scope, 70 frozen source hashes/artifact inputs and preserved remote-only assets. Retained reports are reproducible evidence of that release, not proof that the user's newly reported starter/tutorial problems cannot exist.

Physical Pixel 10 frame timing, human reaction-time comfort, complete campaign difficulty and equal-economy balance remain unproven. Balance models, delayed-input agents and seeded audits are diagnostics. Do not market their success rates as human win rates or turn viewport performance into a hardware guarantee.

## 14. Interrupted cleanup: exact findings and safe continuation

[Page inventory](outputs/page-cleanup/page-inventory.json) lists 38 top-level HTML pages: **9 conservative product/compatibility HTML pages and 29 other developer/review pages**. The graph has 10 roots because lazy `cache-card-help.css` is the tenth root; the audit prose's 10/28 HTML split is an inherited counting error. Canonical old manifest: 482 files, 42,104,037 bytes. Conservative production closure after fixing credits navigation: 383 files, 25,053,063 bytes. Identified offline development delta: 104 files, 17,062,764 bytes, approximately 40.5% of current old-manifest download.

These numbers describe the audited canonical source graph, not the already stamped public 487-file manifest and not the whole 15 GB working repository. Three comparison movies alone account for 10,761,011 bytes. Do not conclude that all repository captures or historic published files should therefore be deleted.

Keep product/compatibility pages: `index.html`, `game.html`, `cards.html`, `loading.html`, `first-light.html`, `scorecard.html`, `nature-credits.html`, tiny compatibility `preview.html`, and standalone `combo-lesson.html` until explicitly retired. Keep lazy `cache-card-help.css` and modules even if its standalone developer page changes.

**Asset exception:** live `card-terms.mjs` uses `assets/previews/collector-tether/reel.mp4` and `reel-front.png`. Never exclude all of `assets/previews/`. Keep runtime-referenced travel-guide SVGs, `assets/help/` imagery, credits/licenses and shared modules. A name containing “preview” is not proof that an asset is unused.

Candidate historical pages: `reference-chests.html`, `reference-relics.html`, `reference-skills.html`, `skills-preview.html`, `travel-guide-compare.html`, `first-light-terrain.html`, `biome-edges.html`, `edge-ideas.html`, `boundary-videos.html`, `fidelity-preview.html`, `nightmare-preview.html`. They have doc/script consumers; preserve or update those references and counterpart files deliberately. Their HTML/module/CSS counterparts total only 116,756 bytes before media.

Preserve useful developer workshops/tools outside the product publication if separated: components/gallery, card combos/art/workbench, reward comparisons, Collector/boundary/Spark/rhythm/resonance/absorption/Black Hole/ecology/music/lantern reviews. Their modules often share production owners. Prefer explicit production staging/roots over moving runtime modules and breaking imports.

The audit's minimal proposal is an explicit product root + lazy-asset manifest, credits Back-to-game repair, regenerated graph, offline/help/launcher checks, and a repository developer catalog. This is a recommendation, not yet an implemented architecture decision. Excluding a file from offline cache alone does not exclude it from publication; the server and prior release overlay still expose dist files.

The public branch contains about 1,318 files including 713 preserved historical/remote-only review files. Some are still linked by README/docs. Never replace `gh-pages` with a clean directory or run destructive publication sync without an explicit reviewed deletion manifest and link analysis.

[Menu report](outputs/menu-simplification/report.md) includes actual fresh-profile 900×405 screenshots and normal click dispatch for Home/Settings/Advanced/Field Guide. It distinguishes dynamic observations from conditional source-only findings. No runtime deletion or UI redesign has been applied from it.

Safe-next acceptance: ordinary game still launches; Tutorial/real starter behavior is explicitly tested; Deck/Workshop/Help Back returns to its origin; credits work; compatibility launchers and shared scorecards survive; production graph has no missing literals; Collector glossary video works offline; developer catalog preserves tools; no gameplay/economy/save behavior changes sneak into cleanup.

## 15. Git and release workflow: scope and byte safety

Before any new change: `git status --short --branch`, inspect relevant diff/untracked files, identify ownership and preserve unrelated art/prototypes. Do not use `git clean`, `reset --hard`, a full-root `git add .`, global Git config changes or broad line-ending rewrites to tidy the workspace.

Latest release tooling lives under ignored `work/collector-vortex-release/release.mjs`; there is no general `scripts/release.mjs` or `scripts/stamp-release.mjs`. Read the retained script/reports as a worked example. It hardcodes historical baseline hashes and approval environment gates; **do not rerun it blindly** for the next release.

The top-level release helpers (`release.mjs`, `browser.mjs`, `public-ui.mjs`, `dev-revision-check.mjs`) were inspected for old absolute repository paths: their repository/output roots use `process.cwd()`/`path.resolve()` or relative imports, so launch them from `F:\Vibecode\Orbix`. They still contain historical release/baseline tokens, fixture assumptions and temporary-server logic that require review before reuse. Browser-probe dependencies can contain machine-specific Chrome/Edge executable paths; validate installation on a different machine. Do not globally rewrite archived artifacts, reports or browser profiles to replace old paths.

Old parent-workspace `.codex-attachments` files were outside the Git repository and were not part of the repository relocation. Essential in-repository `dist/assets/` and `outputs/` work was preserved. An old chat attachment URI may therefore not be a portable asset; prefer the retained in-repository asset/proof when it exists and explicitly locate any truly needed external original.

The successful pattern: freeze an explicit approved source-file list/hashes; prepare an isolated artifact from a known baseline plus that list; stamp only the artifact; regenerate/verify its offline graph; syntax/tests/browser/offline/old-worker checks; review source commit scope; publish an overlay of artifact dist onto the existing public branch; verify exact public bytes and deployment result.

Publication used `GIT_INDEX_FILE` pointing to a temporary index, `read-tree` of the existing Pages commit, and `git hash-object --no-filters` for artifact bytes, then wrote an overlay tree/commit. It verified all unrelated public entries remained unchanged and that no public file was deleted. `--no-filters` matters on Windows: implicit Git CRLF conversion otherwise changes published JavaScript/media/manifest bytes relative to the verified artifact.

Do not globally set `core.autocrlf`/`safecrlf` to work around a release. Command-scoped settings and isolated artifact/index ownership keep the normal checkout and unrelated user work safe. Preserve the actual artifact/report evidence; regenerate only for a deliberate next version with a new freeze/baseline and current approval.

New files used at runtime must be in the release graph, including lazily imported modules and video/image/help assets. Source commit, artifact token, `GAME_VERSION`, generated manifest release/revision, worker and public `release.json` must describe one coherent package, even when canonical source imports intentionally retain an older token.

Documentation delivery/relocation does not itself authorize a new commit, push, Pages publication, global config change or a new paid service. Historical release authorization is not a request to rerun deployment now.

## 16. Operating rules for the next LLM

- Model routing changed on 16 November 2026, after this handoff was first written: Claude is now the primary agent and Codex / ChatGPT is secondary. AGENTS.md holds the current routing table. On Claude, Fable coordinates (planning, design, architecture, review) and Opus workers implement; on Codex, `gpt-6.1-sol` with `high` reasoning fills both roles. Saved defaults do not switch an already running chat. If the required model is unavailable, disclose and obtain direction; do not silently substitute.
- Delegate independent implementation and verification in parallel when safe, as required by AGENTS.md. Give each worker the model settings from the AGENTS.md table, a self-contained approved brief, acceptance checks and nonconflicting file ownership.
- Workers return proposed new requirements/design/architecture changes to the coordinator before implementing. The coordinator reviews results and directs follow-up. Parallel verification must not race with source copy/hash or release stamping.
- Keep progress updates clear; do the authorized work rather than repeatedly asking permission for reversible routine steps. Ask about substantive unapproved design cuts when the decision matters, and show concrete reviewable options.
- **Money constraint:** explicit approval is required before opening/navigating/interacting with billing, checkout, payments, subscriptions, paid services, plan activation or financial terms, including “free” plans with billing/possible overages. Let the user enter card details and accept financial terms. General project authorization does not waive this.
- Windows filesystem safety: before recursive deletion or moving, resolve and verify absolute targets are within the intended directory; use native PowerShell `-LiteralPath` operations. Do not enumerate in one shell and pass computed destructive strings to another.
- Preserve the full relocated `.git`, ignored release artifacts, outputs and user prototypes. Keep migration proof separate from later edits so copy/hash identity is meaningful. Do not use a successful copy as permission to delete additional old workspace siblings.
- Follow the established design principles, mobile-first reach/readability and glossary language. Human reaction time and limited sight matter; do not balance purely for an automated controller.
- Latest user decisions and current code outrank stale archive prose. Update this handoff as new decisions are made; leave historical evidence clearly dated rather than rewriting it to pretend the past was always current.

## 17. Suggested next session

1. Read AGENTS.md and the pending P0–P2 requirements; inspect status at the new root. Confirm no leftover server/probe is writing an old checkout.
2. Reproduce starting gift inside Tutorial and normal starter selection in fresh isolated Cards storage, recording the actual state/routing transitions and preserving Legacy. Fix only after the intended flow is explicit.
3. Present a short tutorial sequence based on concept-first paused videos/definitions and safe practice, including Collector identity before fetching. Do not call current Edition 3 satisfactory without the user's review.
4. Resume cleanup from the retained audits: discuss proposed menu cuts, implement clearly safe bounded fixes/developer-cache separation with explicit file ownership, and verify offline/lazy/compatibility links. Preserve history and untracked studies.
5. Run focused tests and actual game browser checks appropriate to the changed owners. Report concrete limitations. Prepare any future release through an isolated verified artifact; do not accidentally republish the old canonical cache manifest.

The handoff's purpose is continuity: preserve the working game, chosen Vortex II, real player saves and extensive proof/art history while addressing the newly reported starter/tutorial problems and the unfinished cleanup honestly.

## Appendix: latest user wording

Starting gift/Tutorial defect:

> Also seems to me the starting gifts are not working anymore... why? Or rather.. the tutorial area wrongly shows that dialog

Tutorial pacing and teaching:

> I feel like the tutorial is so badly paced.. we should not show things that you have to read as you play, ever.... we should just stop the game and display interactive popups, with videos, with definition of concepts... i see the tutorial talking about the collector without even first presenting what it is ... lol

Cleanup task:

> There is a bunch of inconsistent unused pages and too much fluff ... we must remove the junk but also come up with some candidates to cut away from superflous things in terms of menus, settings, whatever.

Handoff/document instruction:

> make sure the document is called handoff and is very detailed.. and also i have some other items on the backlog i'd want you to note down so the other llm can take over..take in a backlog first too

## Latest update: Tutorial resumes without a countdown (16 November 2026)

- The user requested removing the 3–2–1 delay after accepting a Tutorial popup. `dist/app.mjs` now bypasses the countdown for Tutorial runs and starts the existing linear 0.1× → 1×, three-second resume ramp immediately. The Game Speed overlay remains visible during the ramp.
- Ordinary expedition countdowns and initial Tap to begin gates remain unchanged. Dismissing a lesson does not issue a Lift.
- This is a narrow local change on top of existing, uncommitted tutorial/design-lab work from the other tool; preserve that work. No release was performed for this change.


## Local early-play handoff — 16 November 2026, not published

The user assigned shipping to the other tool. Codex made no remote writes for early-play-1. See [the exact local integration and shipping instructions](docs/early-play-release.md). Local branch `release/early-play-1` is commit `52247567149112a84fc1875bf307b13821f07c90`, prerequisite `1e6e20bf`; bundle/patch and proof reports are in `work/tutorial-combo-release/`. A read-only merge-tree check found it merges cleanly with concurrent `143d2605`; active main and index were not switched or reset.

Both feature follow-ups are already applied additively in the active F source (primary-renderer target halo and top-HUD portrait positioning). Existing localhost:4173 serves that source: open `/game.html?cards=1` → Tutorial → first flight. Paused reading, immediate slow resume and the early real Rhythm/Harvest practice are ready locally. Verified immutable package: `work/early-play-ready/artifact/dist`, version early-play-1, revision `1113c79aeec8`, 488 offline files; helper output matches the browser-verified runtime bytes. 82 focused tests, 265 syntax files, startup, phone-sized paused-reading bounds and the actual preceding starter-flow-1 installed-worker upgrade pass. Public remains the other tool's starter-flow-1 until it publishes the combined final committed HEAD. Do not publish an older snapshot over concurrent work, claim early-play-1 shipped, or advertise its wisp clip URL yet.

### Flight clear: receipt, sealed pack, pick one
The Cards campaign draft now opens with a receipt built from the settled flight. The Waystone v2.5 summary counts clear and optional earnings into the wallet and lists the recorded effects and artifact activations. It stays until Continue. The next tap opens the illustrated stack of card backs and reveals the three saved offers. Presentation never pays a reward. Reloads preserve the draft stage; skipped animations and reduced motion still require opening the pack. The existing card grant and subsequent elite reward flow remain authoritative. The disposable local preview is `/game.html?mock=cards&scenario=pack`. The presentation lives in `dist/flight-reward-ceremony.mjs` and `.css`; see `tests/flight-reward-ceremony.test.mjs` and `scripts/reward-ceremony-probe.mjs` for verification. Include the ceremony JS and CSS and its flight-reward-pack-art.mjs dependency in the next published artifact.
For desktop review, open /index.html?display=desktop&zoom=100&mock=cards&scenario=pack&late=1. This opens the third-map stress case in the centered 900 × 405 landscape frame. The earnings and effect ledger scrolls independently while the total and Continue stay visible. Direct desktop game links also route through the frame.
The revised Lantern Hours score has a shared 88 BPM clock. Double-time and half-time passages change its feel. Lift Guide uses a separate two-note instrument keyed to current flight physics. Hear the resolving note at the balanced-height point in /music-preview.html under Flight + Lift Guide. The static one-minute sample demonstrates the arrangement change. Guide audio follows the music volume and stops during pause and hidden tabs.
Flight entry keeps one illustrated tip visible while rendering prepares and after readiness. Tap to depart starts simulation without spending a Lift. The next flight input controls Lift. Tips rotate across departures and cover balanced-height gliding, the Lift Guide instrument and Rhythm/Resonant Harvest. An isolated playable preview opens at /index.html?display=desktop&zoom=100&mock=cards&scenario=departure. Tip art and copy live in dist/flight-loading-tips.mjs and its stylesheet.

## Latest update: Claude is the only tool in the repository (17 November 2026)

- The user shut the second tool (Codex) down on 17 November 2026. Claude (Fable 5.2 coordinating, Opus/Sonnet workers, Haiku runner) is the single writer until the user says otherwise.
- Public release: `card-rules-1` from commit `d811737d` (plain card text, Boost rules, Forge 15/40/150 with +50% per craft at a Rest, Pulse naming, whole Sparks, Spark Meter cap 100, plus the second tool's reward ceremony, loading tips, Lift cards and scenery changes as they stood).
- In progress: a stabilise pass over the second tool's scenery and flight changes (all biomes against `85b57c38`), and building the approved Chain and Deck screens (`v2.3-deck`, see `docs/design-versions.md`) into the game. Uncommitted in the tree: the rest of the "wave" to "Pulse" rename in tutorial, help and HUD text.
- Decisions of 16–17 November live in `docs/design-versions.md`, `docs/boost-rules.md`, `docs/card-balance-changes.md`, `docs/card-text-rewrite.md` and `docs/card-teaching-plan.md`. Releases use `scripts/release.mjs` and `docs/release-checklist.md`.
