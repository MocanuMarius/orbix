# Relics, route guide and Rest inventory — 16 November 2026

Release **relic-guide-1**. [Play with refreshed assets](https://mocanumarius.github.io/orbix/?v=relic-guide-1) · [Phone review and Collector clip](https://mocanumarius.github.io/orbix/previews/relic-guide-1/) · [Update an installed game](https://mocanumarius.github.io/orbix/cards.html?v=relic-guide-1).

Relic rewards and Collection share their real identity, effects, limits and Full rules renderers. The collection uses the established relic portraits and pixel furniture; long effects, page selection, Melt review, and returning from Full rules remain usable in compact landscape layouts. Earned relic inspection does not mutate a save, claiming applies once, and reloading retains the acquired receipt.

The [component workshop](https://mocanumarius.github.io/orbix/components.html) exposes actual production families with disposable data. The [Thorn Steeple Travel Guide](https://mocanumarius.github.io/orbix/components.html?family=route&state=wayfinder&viewport=low) places Back and Fly in the side touch rails. Its reading area separates guaranteed income from the optional challenge and reward; feature disclosures and Details retain the full rules. The [reward comparison](https://mocanumarius.github.io/orbix/reward-compare.html) switches among A, B and C without changing a journey. These alternatives are inspection samples. Shared ownership and design principles are documented in [dist/ui/README.md](../dist/ui/README.md).

New route offers diversify optional objectives within reachable decisions while preserving their actual flight targets and rewards. Four seeded campaigns per mode cover first standard, first Cards, and returning Cards journeys; the route audit records the differences. Existing saved offers remain usable. The route preview checks cover Spark Trail, Long Glide, Rising Constellation and permanent Heartwood rewards.

Growth Seeds and Second Ember are **Rest cards kept in the Deck**. They never require or occupy an active slot. Owned Seeds add their Grow amounts, up to +90, with three shared Grow actions per journey. Grow reviews its exact result, full refill, and Rest/shared action costs before committing. Cancelling preserves all uses. Second Ember spends one use only when a second distinct eligible Rest action succeeds. Flight consumables retain their normal slot behavior. Existing mounted Rest cards return to the reserve Deck with the same instance IDs, ranks, charges and earned growth.

An earned flight card shows its full face beside the ordered equipped cards. Tapping a destination or dragging to it equips immediately and returns its prior occupant to the Deck. Deck-origin transfers retain the existing swap review. Melt keeps its separate review. Full rules and clickable keyword help remain available. The workshop includes three-slot, five-slot and inventory-only Seed rewards.

Collector return accelerates toward the player and retains the production body-contact delivery path. The [7.5-second normal-speed MP4](https://mocanumarius.github.io/orbix/assets/previews/collector-tow/acceleration-comparison.mp4) contains a complete opening and a contact-aligned replay with no retiming. Inspection Spark positions and equipped modifiers are staged; actual App rendering, Lift inputs, latching, reeling and rewards use live gameplay. The measured final body-width intervals are **0.232621 seconds** for Collector and **0.225063 seconds** for direct body contact. [Capture notes](../dist/assets/previews/collector-tow/capture-notes.json) distinguish source offsets from playback speed. Native and fallback rendering, paired cargo, reduced motion, resize, pause, and 30/60/120 Hz checks preserve finite attachment and one delivery per Spark.

## Verification

- Focused tests: 316/318 pass; 2 failures also reproduce on the preceding source.
- Full suite: 607/667 pass, 60 fail; the preceding source passes 583/647 with 64 failures.
- Comparison: no added failing tests; 4 preceding failures resolved; both full-suite runs exit 1.
- JavaScript syntax: 501 files checked, no failures.
- Offline package: 454 files, all 427 preceding roots retained, revision b581c8dd0762.
- Relic layout: 208 checked elements at each of 915×412 and 740×333; Collection art: 312 at each of 915×412, 740×333 and 667×300.
- Workshop: all catalog states, production CSS order, full rules/focus, card order, touch bounds, desktop scaling, and both save keys unchanged. Reward A/B/C controls also preserve both keys.
- Travel Guide: 900×405, 740×360, 667×300 and 640×320; disclosures, Back and re-entry, actual Fly and production takeoff.
- Actual prior Pages service worker upgrade: warm installed launcher and cold workbench, prepared offline launcher and 81-card catalog. Legacy save remains byte-identical. The entire Cards state matches except the intentional mounted Rest-card migration; relic ownership/charges, remaining flight-card slots, reserve order, completed camp, earned Grow capacity, future capacity credit and new Rare Grow fractions survive.
- Production relic flow uses real touch at 740×333; the earned receipt is staged. Browser proofs record zero runtime exceptions and no missing game resources.

The exact baseline is source 9402348c6d4d1ae5fe4e7ac5405792d0e3215478 and Pages 9209d69bddc834ec62475537aff767c962e429d1. Local proof reports and logs are retained under work/relic-guide-release, outputs, and work. These diagnostic folders, AGENTS.md and Python caches are excluded from source publication. Publication overlays canonical committed game bytes onto the existing Pages tree and verifies that every unrelated public file retains its prior blob. Public verification checks the release metadata, every offline asset hash, review images and links, 1× video playback, mobile/desktop launch, and prepared offline workshop.

Verification uses Chrome mobile emulation. A physical Pixel 10 has not been measured. The broad suite is **not green**; its remaining failures are listed below and were reproduced on the preceding committed source.

## Remaining full-suite failures

- ordinary clear pays currency without an artifact or slot purchase
- 120 seeded campaigns have two fresh offers, three guardians and a final collection discovery
- 12 generated encounters supply two usable, distinct decisions in all 192 resource and route states
- fuel refills cannot be packed, trades pay exact costs, and conversion preview matches receipt
- the Vow pays only for a successful attempt with four body pickups and never taxes a missed target
- positive preparations survive failed flights; the one-attempt lead penalty is spent on a started attempt
- the real flight engine enforces wick threshold, paid Lift counts, sight radius and recovery speed
- body contact and Collector delivery attach the Flash at contact and award only its reveal
- wingbeats consume Flame; exhaustion preserves glide and a pickup enables flight again
- fuel values are capped, generated embers remain finite, and refuelling never heals collision hearts
- route traits change actual effort, fuel recovery, income and collection-window density
- each seeded terrain supplies sparse fuel before a depleted checkpoint reserve could run out
- pickup card triggers are finite and reward multiplier applies exactly once
- sparse terrain rewards stay near their scenery and clear of its full motion envelope
- the autonomous wisp fetches the closest ember, carries it home, and awards it once on return
- the wisp rests after delivery, cannot fetch during recovery, and resumes when ready
- upgrades extend real search range and shorten real recovery; Hungry Wisp expands search during Boost
- direct body contact collects reserved sparks before the carrier can claim them
- the player can collect sparks throughout the carrier cooldown and resume lifting
- Golden Wake uses the Boost state when the wisp intercepts, even if Boost ends on its return
- heart embers pay three but count once toward pickup cards and cannot be claimed twice
- rebirth is consumed once and final result cannot pay twice
- the map challenge is the exact challenge awarded by flight
- shield absorbs damage and protected boost exits inside the opening
- grounded mountains and cave vaults use their visible sloping polygon silhouettes
- faster flight retains spaced approaches and a clear exit portal corridor
- pause preserves ability and progression timers
- gliding requires substantially fewer taps while preserving forward pace
- the guide can show a free Lift now and rejects a route that would use it after expiry
- an optional glide cannot steal the starter fuel lane in Drifting Icebergs
- half-full early checkpoints retain an attainable fuel approach without raising the full-vessel budget
- a Gilded clear and the new flight earnings cannot multiply the opening balance dividend
- nonfinal guardian settles its quoted dividend once; final guardian and practice award none
- Storage pickup forks are exclusive, capped, and settle once outside doubles and interest
- tests/model.test.mjs
- the first briefing teaches the resource cycle and keeps the initial skill menu small
- the guide and first-contact lesson name the actual fuel behind a white shell
- the first map teaches rewards and Rest when encountered, not at the opening menu
- tests/pixel-renderer.test.mjs
- tests/qa.test.mjs
- ordinary success immediately banks its reward and opens the map without a reward panel
- automatic banking survives reload and cannot mint the reward twice
- elite and guardian choices still block travel until a reward is chosen
- a completed legendary collection skips the final discovery panel
- normal reward onboarding can teach the saved currency on the map
- first-flight content flags remove advanced distractions and gently widen actual passages
- the introductory skill view shows three basic branches and hides distant capacity content
- terrain profiles are curved, biome-specific grounded surfaces with a stable polygon contract
- authored curves preserve encounter randomness and every pre-change pickup budget
- joined mountain floors and cave roofs retain a clear corridor at the full sway envelope
- every collectible stays clear of all overlapping terrain at either sway extreme
- ruins include a broad visible mesa cap instead of only pointed mounds
- storm ridges include two distinct summits separated by a deep wind saddle
- the vessel either grows capacity for this run or pays once
- strongbox enforces the advertised cost and rewards skillful body contact once per clear
- split lens affects only the chosen system and lasts across failed and successful attempts
- escrow pays a guaranteed purse or checks displayed Energy before recovery
- each companion uses the quick lens in its own flight recovery timer
- map advance and save reload keep gifts; an interrupted flown wager expires
- full meters and capped treasure gifts produce useful alternatives
