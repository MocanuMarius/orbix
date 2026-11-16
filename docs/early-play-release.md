# Early play release — early-play-1

Source baseline: `1e6e20bf9bc26ba8f15ab090272398d8eceeda68` (16 November 2026). Previous public package at final local handoff: `starter-flow-1`, Pages `1d58d6c4261ac14c30bede3c08a299e0478f1402` (published by the other tool during this work).

## Scope

Practice reading uses stopped coach cards, with an explicit button to continue. Entry hints precede the Tap to begin gate; remaining first-flight hints wait for a safe checkpoint. Accepting a practice popup starts the existing three-second 0.1× to 1× ramp immediately, without a 3–2–1 countdown or an automatic Lift. Ordinary expedition countdowns remain intact.

The first practice flight introduces a temporary Rhythm / Common Resonant Harvest pair after a real body Spark pickup. The stopped lesson explains the pair, then two authored clear pockets allow evenly timed Lifts and real wave crossings. Portraits react to actual Rhythm waves and actual resolver receipts. Later practice revisits these cards as practice. No flight physics, card resolver, campaign rewards or owned-card save rules change.

The existing wisp wake and approved Vortex II Collector animation were verified in current production code and against public modules. No animation rewrite was necessary. Six-second production capture (`dist/assets/previews/early-play-1/wisp.mp4`, local only until the other tool deploys) uses a seeded real Cards expedition and one deliberately missed Small Spark; this is controlled browser evidence, not an untouched human play session. The clip is packaged for review and excluded from the offline install graph.

Uncommitted pause / Settings / audio / Collection / reliquary work, new design-lab proposals, and study assets were excluded. Already committed starter-routing and Travel Guide changes in the baseline remain included. Other-tool changes in the active checkout are preserved.

## Reproduce verification

Run from a checkout containing this source commit. Chrome is expected at `C:/Program Files/Google/Chrome/Application/chrome.exe`; browser helpers create disposable profiles.

```powershell
node --test tests/no-reading-during-play.test.mjs tests/first-light-combo.test.mjs tests/playable-practice.test.mjs tests/tutorial-progression.test.mjs tests/tutorial-starter-routing.test.mjs tests/tutorial-preferences.test.mjs tests/camp-resume-render.test.mjs tests/automatic-updates.test.mjs tests/pwa-upgrade.test.mjs tests/collector-vortex.test.mjs tests/collector-tow.test.mjs tests/collector-recovery-tiers.test.mjs tests/wisp-wake.test.mjs
node scripts/first-run-routing-probe.mjs dist
node scripts/practice-paused-hints-probe.mjs dist
node scripts/early-play-release-probe.mjs package
node scripts/early-play-release-probe.mjs upgrade
```

The PWA probe accepts `RELEASE_DIST` for an isolated stamped artifact and `RELEASE_PROBE_OUT` for reports. `RELEASE_PREVIOUS_PAGES` defaults to the actual preceding published commit above. The upgrade test installs that preceding worker, creates both Cards and Legacy saves, opens the new phone launcher, and checks preserved saves, complete caches and offline flight/lazy-helper availability. `public` checks the deployed launcher and offline install.

Production packaging follows `handoff.md` section 15: isolate this source, stamp only artifact text from `guide-clarity-1` to `early-play-1`, run `node scripts/pwa-assets.mjs` inside the artifact, and verify before publication. Overlay artifact `dist` onto the existing Pages tree using `git hash-object --no-filters`; preserve every unrelated public entry and permit no deletions. The active dirty index is not used for the source or Pages commit.

## Results and limits

Final frozen-package results and publication identifiers are recorded below after verification. Browser CSS viewports do not establish physical Pixel 10 timing or human reaction comfort; full-campaign balance and every historical suite test remain outside this focused release. No physical-phone or all-suite pass is claimed.

## Local delivery handoff — not a public release

At the user's request, Codex stopped all shipping activity. No remote write, source push or Pages publication was performed for this candidate. Public `release.json` was independently advanced by the other tool to **starter-flow-1**, source `1e6e20bf`, Pages `1d58d6c4`, while this work ran. Early-play-1 is a verified local candidate; its clip URL is not yet public.

Local candidate runtime: `F:/Vibecode/Orbix/work/tutorial-combo-release/artifact/dist`, version **early-play-1**, revision **1113c79aeec8**, **488 offline files**. Its source snapshot is `work/tutorial-combo-release/source`. The active `F:/Vibecode/Orbix/dist` also contains the feature and both follow-up fixes, applied as additive patches after checks; it additionally contains the other tool's ongoing menu/art/audio work. These are different review scopes. Existing localhost:4173 serves the active source, not the frozen artifact. Open `/game.html?cards=1`, then Tutorial and the first flight.

The local source branch is `release/early-play-1`, based on `1e6e20bf`. `work/tutorial-combo-release/early-play-1.bundle` and `early-play-1.patch` retain its exact delta. Main was never switched, reset, staged or advanced by this delivery. Concurrent main became `143d2605` through the other tool; its AGENTS/docs/design-lab changes must remain. The candidate is an additive reference, not a replacement for final main.

Final local verification:

- 82 focused tests passed; all 265 artifact JavaScript modules passed syntax checks. No full-suite claim.
- Normal fresh-profile entry, three distinct starter choices, cancellation/confirmation and real campaign entry passed in Chrome at 900×405.
- Entry-only Got it, frozen reading, immediate 0.1× resume without countdown/automatic Lift, and hidden live hint text passed at 900×405 and 667×300.
- Independent real-renderer geometry checked 480 timed frames at both sizes, including actual +1 feedback; portraits remain in the top HUD band. Real timed inputs produced two waves and four actual +1 resolver receipts. Mistimed/no inputs produced no wave payment. Both primary and fallback renderers consume the actual target flash flag.
- The prepared 488-file PWA installed completely and worked offline. A real preceding **starter-flow-1** worker upgraded through the phone launcher, preserved the Cards save except the existing already-completed-tutorial stage normalization (0→4), retained Legacy bytes exactly, and supported offline Continue → Guide → flight plus lazy Collector helper.
- Wisp wake/Vortex II public/source parity and production captures were checked; no animation rewrite was made.
- `prepare-release-artifact.mjs` was smoke-tested on committed baseline `1e6e20bf` using `--release prepare-smoke-1 --out work/tutorial-combo-release/helper-smoke`; it produced and checked 487 old-source offline files without remote writes.

Reports and screenshots: `work/tutorial-combo-release/{build-report,package-browser-report,upgrade-report,syntax-report}.json`, `artifact-tests.log`, `practice-browser/report.json`. Independent geometry proof is in `C:/Users/mocan/Documents/Codex/2026-11-12/can-w/outputs/early-combo-independent-2026-11-16/summary.json`. The old `prior-build-evidence`/`artifact-before-portrait-fix` are superseded and must not be deployed. The prior upgrade failure was a harness cwd-prefix error, corrected by running Git tree reads from the repository root; the final real old-worker upgrade passes.

### How the other tool finishes shipping

1. Review the candidate diff and its source list. In a clean integration checkout, merge/cherry-pick the local candidate onto current main, preserving concurrent commits. Alternatively, review and commit the already-integrated active F files alongside the other tool's explicitly approved changes. Do not blanket-stage the dirty repository. The two feature patches and rendering/positioning follow-ups are already applied in the active folder; do not apply them twice.
2. **Do not publish an older frozen snapshot over concurrent updates. Package and test the combined final committed HEAD.** The retained local candidate remains useful as a known-good comparison. Additional production changes require their own checks.
3. Run the focused test command above, then prepare a fresh artifact from the combined source commit:

```powershell
node scripts/prepare-release-artifact.mjs --commit HEAD --release early-play-1 --out work/early-play-final
$env:RELEASE_DIST = (Resolve-Path work/early-play-final/artifact/dist).Path
$env:RELEASE_PROBE_OUT = (Resolve-Path work/early-play-final).Path
$env:RELEASE_PREVIOUS_PAGES = (git rev-parse origin/gh-pages)
node scripts/first-run-routing-probe.mjs $env:RELEASE_DIST
node scripts/practice-paused-hints-probe.mjs $env:RELEASE_DIST
node scripts/early-play-release-probe.mjs package
node scripts/early-play-release-probe.mjs upgrade
```

The packaging helper creates a fresh output only, archives exact committed source, stamps artifact-only text, regenerates/checks its offline graph, and writes matching `release.json`/`package-report.json`. It never pushes, stages, deletes prior output, or edits the active checkout. Fetch/inspect the latest main and Pages refs before choosing the final predecessor. A new combined package may have a different revision/count; retain its own reports rather than reusing this candidate's checks.

4. Push reviewed source to main by the ordinary fast-forward process. **Pushing main does not deploy this game.** Pages is served from **gh-pages**. Construct a temporary-index overlay of the verified final artifact's `dist` onto the latest `origin/gh-pages`, using exact bytes (`git hash-object --no-filters`) and preserving all unrelated public entries. Verify no deletion and no unexpected overwrite. The worked algorithm is in `handoff.md` section 15 and the retained `work/tutorial-combo-release/release.mjs`; that local driver has historical constants and is evidence, not a safe general rerun script. Never replace Pages with an empty tree or use destructive sync.
5. Push the reviewed overlay commit to gh-pages only when the source/package/overlay checks pass. Wait for the Pages build/deployment to finish. Verify public `release.json` has the intended final source commit and `early-play-1`; compare every offline file plus worker/manifest/clip to final artifact bytes. Run `node scripts/early-play-release-probe.mjs public` with the final `RELEASE_DIST` and `RELEASE_PROBE_OUT` still set. Verify the phone link `https://mocanumarius.github.io/orbix/cards.html?v=early-play-1` opens that version automatically and works offline after preparation.
6. Report **shipped** only after that public metadata, byte, deployment and phone/PWA proof passes. Until then, report **locally verified** or **source pushed** accurately. Record final source/Pages commits and deployment URL in this receipt. The wisp clip becomes public at `/orbix/assets/previews/early-play-1/wisp.mp4` only after this overlay is deployed.

Pending at handoff: source integration with the other tool's final main, public overlay/publication and all public exact-byte/phone checks. Physical Pixel 10 hardware timing, human difficulty feedback and full-campaign balance also remain unproven.
