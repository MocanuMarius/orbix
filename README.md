# Wispbound

A landscape, one-handed pixel flight roguelite. The static game lives in `dist/` and uses a custom Canvas simulation and cached renderer. No build step or runtime framework dependency.

## Current release

[Play](https://mocanumarius.github.io/orbix/) · [Compare Spark absorption styles](https://mocanumarius.github.io/orbix/spark-preview.html#absorption) · [Landscape desktop preview](https://mocanumarius.github.io/orbix/preview.html)

Run `npm start` at localhost:4173, or `npm run preview:rest` at localhost:4180 for local inspection fixtures.

The main URL automatically presents a **900 × 405 logical landscape game** on desktop, requesting **150%** scale and fitting smaller windows. The toolbar offers 75–200%, Fit and fullscreen; the selected scale persists. Touch phones use the native responsive game and safe areas. `?display=desktop` or `?display=native` overrides detection; `?zoom=150` selects a desktop scale. `game.html` is the direct responsive game document. Changing display controls pauses a live flight.

## Clear Rewards

Cleared flights grant predictable income. Surplus fuel adds a bonus, and Rest offers a choice between Recover and Grow. [Income-model assumptions and results](docs/checkpoint-economy.md).

## Moonlit Menus

- Original moonlit pixel woodland and ruin art, clear Continue/New Game actions and a visible companion unlock path.
- Consistent illustrated frames and quiet text grounds; stronger effect descriptions and resource glyphs.
- Owned, available, saving and locked skills use distinct marks and border treatments alongside color. Disabled labels remain readable.
- Rest, reward, equipment, settings and skill layouts reviewed at 900 × 405, 740 × 333 and 720 × 280. Desktop fit reviewed from a narrow sidebar through 1920 × 1080.
- [Design research and free lessons](docs/ui-design-research.md) · [Current audit](docs/backlog-current.md).

## Current rules

Three branching maps form a run. Choose one companion at the start. Skills belong to that run. Open the skill tree from the Stored Sparks counter to spend banked currency, including during a flight. Opening the tree pauses play.

**Sparks** fuel flight. A baseline meter holds 30 and a Lift costs 3 before upgrades. A Spark, Cluster and Cache restore 6, 12 and 18 respectively. Their white arcs grow denser as the value rises. Surplus fuel earns Stored Sparks on a clear. An unshielded collision costs one attempt. At zero fuel the wisp can still fall into a Spark and recover.

Rest offers **Recover** to relight missing hearts or **Grow** to raise capacity by 3, up to three times in a run. Both refill the Spark Meter. With Dream learned, a player can rehearse the opening of the flight after Rest or a reachable elite or guardian. A saved rehearsal plays when that flight starts and pauses for the handoff.

Normal play teaches one contextual concept at a time. Field Guide and separate practice remain available. Remember & skip persists; Reset tutorial replays the introduction on New Game. Entry loads for five seconds and ends paused. Resume uses a frozen three-second countdown followed by the three-second 0.1× → 1× recovery.

Twelve shuffled biomes have four authored courses each, scenery colliders, local drafts, interactive props, negative Sparks and draining Black Holes. Luminance uses a cached finite circular falloff. Original ambient music and FX have separate menu toggles.

## Inspection and verification

Plain `/` opens normal play. Add `?mock=rest` for an isolated in-memory Rest run; Settings also toggles it. Mock changes never overwrite the normal save. Local `/rest-scene.html?scenario=...` fixtures stay outside publication.

33 focused checks pass for display sizing/routing, entry, onboarding, rewards, countdowns, one-companion behavior, practice isolation, clear-reward transactions and Rest choices. Browser inspection covers compact controls, actual scaled clicks, zoom persistence, fullscreen and pause-on-display-change. These checks do not establish physical Pixel 10 frame rate or human difficulty.

The [balance report](docs/balance-2026-11-13.md) documents diagnostic models and unresolved design questions. A physical-device hitch trace and current full-campaign human balance study remain separate work. Older generic tests target removed prototype APIs and are not current specifications.

`DECISIONS.md` and older audit entries retain chronological history. Later decisions supersede phoenix, Ember, Afterglow reserve, multiple equipped companions and paired artifact rewards.
