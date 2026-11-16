# Wispbound

A landscape, one-handed pixel flight roguelite. The static game lives in `dist/` and uses a custom Canvas simulation and cached renderer. No build step or runtime framework dependency.

## Current release

[Play](https://mocanumarius.github.io/orbix/) · [Compare Skills layouts on your phone](https://mocanumarius.github.io/orbix/skills-preview.html) · [Fly through a Darkness Lantern](https://mocanumarius.github.io/orbix/spark-preview.html#lantern) · [Compare the three Spark strengths](https://mocanumarius.github.io/orbix/spark-preview.html#sizes) · [Compare Spark absorption styles](https://mocanumarius.github.io/orbix/spark-preview.html#absorption) · [Landscape desktop preview](https://mocanumarius.github.io/orbix/preview.html)

Release `combo-camp-1` adds saved three-card drafts, connected card/relic explanations and integrated safe combo practice, more useful Rest access and a Workshop for improving, refilling or forging cards, personal scores and shareable scorecards, and one visible build version. [Phone review](https://mocanumarius.github.io/orbix/previews/combo-camp-1/) · [Three-card draft](https://mocanumarius.github.io/orbix/components.html?family=cards&state=draft&viewport=low&v=combo-camp-1) · [Try Rhythm + Harvest](https://mocanumarius.github.io/orbix/combo-lesson.html?v=combo-camp-1) · [Rest Workshop](https://mocanumarius.github.io/orbix/components.html?family=cards&state=workshop&viewport=low&v=combo-camp-1) · [Release verification](docs/combo-camp-release.md). The preceding [relic/guide release](docs/relic-guide-release.md), [camp rendering repair](docs/camp-resume-release.md), [reward furnace](docs/furnace-tow-release.md), [Deck flow](docs/deck-flow-release.md), and [81-card renewal](docs/cards-renewal-release.md) remain included. Interpolated flight rendering targets 120 Hz with 60 Hz physics; physical Pixel 10 timing remains unmeasured. [Measurements](docs/performance-120.md).

**Cards** is the default game at the [main link](https://mocanumarius.github.io/orbix/). Choose **New Game**, **Continue**, **Tutorial** or **Settings**. The original skill-book game is available under **Settings → Advanced → Legacy skills override** and keeps its separate save. Existing card journeys retain their save and starter seed. The [older card launcher](https://mocanumarius.github.io/orbix/cards.html) remains supported and updates installed games before entry, retaining desktop display controls and native phone routing. First Light loans Lift Guide during its Lift lesson; practice rewards do not carry into the real run.

Cards start with three ordered active slots: guaranteed Lift Guide and your choice of two Common starter gifts. A flight card occupies a slot; a Rest card stays in the Deck. Earned and forged cards enter the owned Deck automatically. On an earned card's reward screen, tap a visible slot or drag the card to transfer immediately; the previous occupant returns to the Deck. Moving cards from the Deck retains full swap review. Equip, unequip, drag, reorder and Melt anytime in Deck, including during paused flight. Improve, Evolve and Forge require a verified active or completed camp. Select several cards and preview their combined Melt return before confirming. Banked Stored Sparks pay for improvements and repeatable forging: Rare 30, Legendary 60 with a Rare equipped. Forge uses no Rest action. Try the [disposable sample Deck](https://mocanumarius.github.io/orbix/card-workbench.html) without changing either saved journey. Prices, rarity odds and the five-slot cap remain provisional; see [the pilot rules](docs/skill-cards.md). The [Collector art comparison](https://mocanumarius.github.io/orbix/collector-art.html#tow) includes the living tow preview; the two-ink Collector is the current default.

The catalog contains **81 cards**: 43 Common, 23 Rare and 15 Legendary, including the three Harvest rarities and named family evolutions. Matching events resolve equipped cards from left to right. Multipliers affect the bonus already earned in that pass; Refrain can replay matching numeric actions once from slot 1, sharing real uses and preserving one physical pickup or wave. The retained flight receipt shows the slot order and both passes. Common **Tight Packing** adds one Stored Spark for every two naturally packed, with fractional progress carried across clears; flat rewards and Melts retain their normal value.

**Growth Seed** has Common +3, Rare +5 and Legendary +8 maximum Spark versions; the Legendary can improve to +9 and +10. A Common seed has six draw tickets against one for each other Common card. If no seed has been acquired, the second actual Common flight reward supplies one. This one-time safeguard preserves rarity rolls and does not restart after Melt. Owned Seeds unlock Grow directly from the Deck at an open Rest; all owned Seeds add together, up to +90, and share three Grow actions per expedition. Grow reviews its exact result and action costs before committing. Second Ember also stays in the Deck and spends its use only on a successful second distinct Rest action. Existing mounted Rest cards return to the Deck with their identities, ranks and uses intact. [Matched 10,000-expedition RNG audit](docs/growth-seed-rng.md).

Browse [15 sample trios and the full catalog](https://mocanumarius.github.io/orbix/card-combos.html), with actual event results and clickable glossary help. The [artwork scale preview](https://mocanumarius.github.io/orbix/card-art-preview.html) compares the existing art and captured game screens at current, mild and medium pixelation; game defaults remain unchanged.

The ground's Spirit Fire mineral rim now stays fixed to world pixels, with a narrower inward band. Luminance penetrates rock one third less deeply while its open-air falloff and dynamic physical shadows remain intact. [Matched terrain-light frames](https://mocanumarius.github.io/orbix/assets/previews/terrain-light-comparison.png) · [Release verification](docs/skills-cards-release.md).

Use **Settings → Advanced → Refresh build** to apply a published update. On a phone, open the game link directly or install it as a PWA. To record a device flight, open [performance diagnostics](https://mocanumarius.github.io/orbix/?perf=1), play, then choose **Settings → Advanced → Save performance report**.

Run `npm start` at localhost:4173, or `npm run preview:rest` at localhost:4180 for local inspection fixtures.

The main URL automatically presents a **900 × 405 logical landscape game** on desktop, requesting **150%** scale and fitting smaller windows. The toolbar offers 75–200%, Fit and fullscreen; the selected scale persists. Touch phones use the native responsive game and safe areas. `?display=desktop` or `?display=native` overrides detection; `?zoom=150` selects a desktop scale. `game.html` is the direct responsive game document. Changing display controls pauses a live flight.

## Clear Rewards

Cleared flights grant predictable income. Surplus fuel adds a bonus, and legacy skill-book Rest offers a choice between Recover and Grow. Cards uses the action-based Rest rules below. [Income-model assumptions and results](docs/checkpoint-economy.md).

## Moonlit Menus

- Original moonlit pixel woodland and ruin art, clear Continue/New Game actions and a visible companion unlock path.
- Consistent illustrated frames and quiet text grounds; stronger effect descriptions and resource glyphs.
- Owned, available, saving and locked skills use distinct marks and border treatments alongside color. Disabled labels remain readable.
- Rest, reward, equipment, settings and skill layouts reviewed at 900 × 405, 740 × 333 and 720 × 280. Desktop fit reviewed from a narrow sidebar through 1920 × 1080.
- [Shared component design principles](dist/ui/README.md#shared-component-design-principles) · [Component ownership and workshop](dist/ui/README.md) · [Design research and free lessons](docs/ui-design-research.md) · [Current audit](docs/backlog-current.md).

## Current rules

Three branching maps form a run with Collector, the currently available companion. Skills belong to that run. In the legacy skill-book game, open the skill tree from the Stored Sparks counter to spend banked currency, including during a flight. Opening the tree pauses play. In Cards, the counter opens the Deck and its ordered active slots. Equip, reorder, improve, Melt and Forge remain available during the run, including a safely paused flight; purchases use banked Stored Sparks.

**Sparks** fuel flight. A baseline meter holds 30 and a Lift costs 3 before upgrades. A Spark, Cluster and Cache restore 6, 12 and 18 respectively. Their white arcs grow denser as the value rises. Surplus fuel earns Stored Sparks on a clear. An unshielded collision costs one attempt. At zero fuel the wisp can still fall into a Spark and recover.

Legacy skill-book Rest offers **Recover** to relight missing hearts or **Grow** to raise capacity by 3, up to three times in a run. Both refill the Spark Meter. Card Rest normally permits one action: Recover or Add slot. An owned Growth Seed unlocks Grow from the Deck; an owned Second Ember can spend its single charge on a second distinct eligible action. Add slot grants no healing or refill. Forge is available in Deck at a verified active or completed camp and uses no camp action. Each Rest leads to one flight. Once you learn Dream, each flight opens with a fully lit rehearsal. Go back to sleep to retry, or wake to replay a successful opening in normal light. Playback pauses for the handoff.

Normal play teaches one contextual concept at a time. Field Guide and separate practice remain available. Remember & skip persists; Reset tutorial replays the introduction on New Game. Entry loads for five seconds and ends paused. Resume uses a frozen three-second countdown followed by the three-second 0.1× → 1× recovery.

Twelve shuffled biomes have four authored courses each, scenery colliders, local drafts, interactive props, negative Sparks and draining Black Holes. Luminance uses a cached finite circular falloff. Original ambient music and FX have separate menu toggles.

## Inspection and verification

Plain `/` opens normal play. Add `?mock=rest` for an isolated in-memory Rest run; Settings also toggles it. Mock changes never overwrite the normal save. Local `/rest-scene.html?scenario=...` fixtures stay outside publication.

Use `cards.html` for the installed-phone card entry or `game.html?cards=1` for direct local inspection. `card-workbench.html` opens a sample Deck that resets on reload and never reads or writes either player save. The launcher also preserves explicit `collectorArt`, `display` and `zoom` choices. After its complete download, the launcher and pilot are available offline. An unprepared offline visit asks for a connection. Card events are recorded in the pilot save, not sent to a server. Automated flight and phone-viewport checks establish mechanics and layout, not physical-phone frame rate, human balance or a completed equal-economy study.

33 focused checks pass for display sizing/routing, entry, onboarding, rewards, countdowns, one-companion behavior, practice isolation, clear-reward transactions and Rest choices. Browser inspection covers compact controls, actual scaled clicks, zoom persistence, fullscreen and pause-on-display-change. These checks do not establish physical Pixel 10 frame rate or human difficulty.

The [balance report](docs/balance-2026-11-13.md) documents diagnostic models and unresolved design questions. A physical-device hitch trace and current full-campaign human balance study remain separate work. Older generic tests target removed prototype APIs and are not current specifications.

`DECISIONS.md` and older audit entries retain chronological history. Later decisions supersede phoenix, Ember, Afterglow reserve, multiple equipped companions and paired artifact rewards.
