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
