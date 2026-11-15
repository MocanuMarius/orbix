# Wispbound

A landscape, one-handed pixel flight roguelite. The static game lives in `dist/` and uses a custom Canvas simulation and cached renderer. No build step or runtime framework dependency.

## Current release

[Play](https://mocanumarius.github.io/orbix/) · [Compare Skills layouts on your phone](https://mocanumarius.github.io/orbix/skills-preview.html) · [Fly through a Darkness Lantern](https://mocanumarius.github.io/orbix/spark-preview.html#lantern) · [See the five Spark sizes](https://mocanumarius.github.io/orbix/spark-preview.html#sizes) · [Compare Spark absorption styles](https://mocanumarius.github.io/orbix/spark-preview.html#absorption) · [Landscape desktop preview](https://mocanumarius.github.io/orbix/preview.html)

Release `skills-cards-1` adds a separate [Skills as cards playtest](https://mocanumarius.github.io/orbix/cards.html). Open that phone link, tap **Open card playtest**, then choose **New Game**. The launcher updates older installed games before opening the normal start flow with `?cards=1`, retaining desktop display controls and native phone routing. The pilot has its own save and starter seed; standard play keeps the skill book. Card-mode First Light loans Lift Guide during its Lift lesson; practice rewards do not carry into the real run.

Cards start with three ordered slots and one of two Common starter gifts. First flight clears offer Equip or Melt; reorder and improve at checkpoints, and forge at Rest using the existing Stored Sparks wallet. Prices, rarity odds and the five-slot cap are provisional playtest values. See [the pilot rules and remaining questions](docs/skill-cards.md). The optional [Collector art comparison](https://mocanumarius.github.io/orbix/collector-art.html) presents matched phone frames and motion; its flatter candidate is opt-in and does not change the production Collector.

The 16-card pool includes Common **Tight Packing**: “Pack 25% more Stored Sparks. Every 4 you pack earns 1 extra.” It increases actual overflow and exit packing, carries fractional quarters across clears and prints a named bonus receipt. Flat clear rewards, Melt, gifts and other unrelated grants retain their normal value.

The ground's Spirit Fire mineral rim now stays fixed to world pixels, with a narrower inward band. Luminance penetrates rock one third less deeply while its open-air falloff and dynamic physical shadows remain intact. [Matched terrain-light frames](https://mocanumarius.github.io/orbix/assets/previews/terrain-light-comparison.png) · [Release verification](docs/skills-cards-release.md).

Use **Settings → Refresh build** to apply a published update. On a phone, open the game link directly or install it as a PWA.

Run `npm start` at localhost:4173, or `npm run preview:rest` at localhost:4180 for local inspection fixtures.

The main URL automatically presents a **900 × 405 logical landscape game** on desktop, requesting **150%** scale and fitting smaller windows. The toolbar offers 75–200%, Fit and fullscreen; the selected scale persists. Touch phones use the native responsive game and safe areas. `?display=desktop` or `?display=native` overrides detection; `?zoom=150` selects a desktop scale. `game.html` is the direct responsive game document. Changing display controls pauses a live flight.

## Clear Rewards

Cleared flights grant predictable income. Surplus fuel adds a bonus, and standard Rest offers a choice between Recover and Grow. The separate card pilot uses the action-based Rest rules below. [Income-model assumptions and results](docs/checkpoint-economy.md).

## Moonlit Menus

- Original moonlit pixel woodland and ruin art, clear Continue/New Game actions and a visible companion unlock path.
- Consistent illustrated frames and quiet text grounds; stronger effect descriptions and resource glyphs.
- Owned, available, saving and locked skills use distinct marks and border treatments alongside color. Disabled labels remain readable.
- Rest, reward, equipment, settings and skill layouts reviewed at 900 × 405, 740 × 333 and 720 × 280. Desktop fit reviewed from a narrow sidebar through 1920 × 1080.
- [Design research and free lessons](docs/ui-design-research.md) · [Current audit](docs/backlog-current.md).

## Current rules

Three branching maps form a run. Choose one companion at the start. Skills belong to that run. In standard play, open the skill tree from the Stored Sparks counter to spend banked currency, including during a flight. Opening the tree pauses play. In the card pilot, the counter opens mounted cards; changes and improvements require a checkpoint.

**Sparks** fuel flight. A baseline meter holds 30 and a Lift costs 3 before upgrades. A Spark, Cluster and Cache restore 6, 12 and 18 respectively. Their white arcs grow denser as the value rises. Surplus fuel earns Stored Sparks on a clear. An unshielded collision costs one attempt. At zero fuel the wisp can still fall into a Spark and recover.

Standard Rest offers **Recover** to relight missing hearts or **Grow** to raise capacity by 3, up to three times in a run. Both refill the Spark Meter. Card Rest normally permits one action: Recover, Add slot or Forge. Mounted Growth Seed unlocks Grow; Second Ember can spend its single charge on a second distinct eligible action. Add slot and Forge grant no healing or refill. Each Rest leads to one flight. Once you learn Dream, each flight opens with a fully lit rehearsal. Go back to sleep to retry, or wake to replay a successful opening in normal light. Playback pauses for the handoff.

Normal play teaches one contextual concept at a time. Field Guide and separate practice remain available. Remember & skip persists; Reset tutorial replays the introduction on New Game. Entry loads for five seconds and ends paused. Resume uses a frozen three-second countdown followed by the three-second 0.1× → 1× recovery.

Twelve shuffled biomes have four authored courses each, scenery colliders, local drafts, interactive props, negative Sparks and draining Black Holes. Luminance uses a cached finite circular falloff. Original ambient music and FX have separate menu toggles.

## Inspection and verification

Plain `/` opens normal play. Add `?mock=rest` for an isolated in-memory Rest run; Settings also toggles it. Mock changes never overwrite the normal save. Local `/rest-scene.html?scenario=...` fixtures stay outside publication.

Use `cards.html` for the installed-phone card entry or `game.html?cards=1` for direct local inspection. The launcher also preserves explicit `collectorArt`, `display` and `zoom` choices. After its complete download, the launcher and pilot are available offline. An unprepared offline visit asks for a connection. Card events are recorded in the pilot save, not sent to a server. Automated flight and phone-viewport checks establish mechanics and layout, not physical-phone frame rate, human balance or a completed equal-economy study.

33 focused checks pass for display sizing/routing, entry, onboarding, rewards, countdowns, one-companion behavior, practice isolation, clear-reward transactions and Rest choices. Browser inspection covers compact controls, actual scaled clicks, zoom persistence, fullscreen and pause-on-display-change. These checks do not establish physical Pixel 10 frame rate or human difficulty.

The [balance report](docs/balance-2026-11-13.md) documents diagnostic models and unresolved design questions. A physical-device hitch trace and current full-campaign human balance study remain separate work. Older generic tests target removed prototype APIs and are not current specifications.

`DECISIONS.md` and older audit entries retain chronological history. Later decisions supersede phoenix, Ember, Afterglow reserve, multiple equipped companions and paired artifact rewards.
