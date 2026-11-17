# Autonomous plan — 17 November 2026

The user is away until tomorrow and asked the coordinator to "decide and carry through… don't stop until we achieved all of our goals". This file is the working list, so the work survives a context reset. Update it as items land.

## Rules while unattended

- Decide by the recorded taste and rules (AGENTS.md, `docs/design-versions.md`, memory). Do not wait for verdicts on reskins or fixes; new looks still get a code in the registry and are built to the approved kit `v2.5-theme`.
- Cost: Haiku for pushes, releases and test runs; Sonnet for ordinary work; Opus only for the three jobs already running and for anything where a miss is expensive (say why).
- Ship in small releases. Every release goes through `scripts/release.mjs` (checks first, publish only on exit 0). A failed check is reviewed by the coordinator; never forced.
- One writer per file. Never `git add .`, reset, clean, stash or force-push. Keep the user's untracked art and studies.
- No caps or nerfs on card combos (user's taste). No reading during play. Nothing involving money.
- If the usage limit stops the work, resume the same workers after the reset.

## Goals, in order

1. **Stabilise** the second tool's scenery/flight work (running, Opus). Fix or roll back single pieces; push; release.
2. **`v2.3-deck` in the game** (running, Opus): Chain and Deck tabs replace the Deck screens. Coordinator checks map, Rest, paused flight and practice; push; release.
3. **Performance on Pixel 10** (running, Opus, read-only): find the slowdown after a few levels. Then apply the safe fixes (Sonnet, or Opus if they touch the render loop or teardown), verify with the harness, release. Add the once-a-day check command.
4. **Push the rest of the Pulse rename** (already in the tree) with the next release.
5. **Release check under a subpath**: serve the artifact under `/orbix/` in `scripts/release.mjs` so path bugs are caught before publishing (Sonnet).
6. **Reskin every remaining menu and sheet** in `v2.5-theme` (Sonnet, one family at a time): Help/Field Guide, Glossary dialog, Map guide, New Game and starting-card dialogs, confirmations, install sheet, Advanced settings, Collection and relic details, reward and result screens, Rest and Workshop/Forge, the score screen. Tidy as the navigation inventory recommends (`outputs/menu-standardization/iteration-0-inventory.md`): Back in one place, one name per destination.
7. **Icons**: build the approved Spark (`v1.1-icons` A1) into the game and bring icon sizes to whole multiples where it is mechanical (Sonnet); list the icons that need redrawing.
8. **Tutorial (Edition 4)**: rebuild First Light to the brief the user gave on 17 November (end of `docs/tutorial-redesign-proposal.md`): about five minutes, real courses in several locations, movement → energy → Collector → light and Proximity → arranging the Chain → Black Holes and the companion shield, lessons spread out (at most two stops per flight, about twelve seconds of free flying between them), all lessons paused. Opus job (touches practice route, course layout and tutorial flow); start after items 1 and 2 land.
9. **Cleanup**: keep developer pages out of the published offline list; no deletion of history or user art.
10. Keep `handoff.md`, `docs/design-versions.md` and this file current. Final summary for the user: what is live, what changed, what needs their eye.

## Status log

- 2026-11-17 04:55: items 1–3 running. Live: `card-rules-1` (`d811737d`).
