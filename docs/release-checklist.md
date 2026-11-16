# Release checklist (GitHub Pages)

The live game at https://mocanumarius.github.io/orbix/ is served from the `gh-pages` branch. Pushing `main` does not change it. Use `scripts/release.mjs` for every release. It builds an isolated artifact from one commit, checks it, adds it to `gh-pages` as an overlay commit, then verifies the public bytes. It never writes to the working tree outside `work/release-<version>/`.

First used for `starter-flow-1` (source `1e6e20bf`, Pages commit `1d58d6c4`). Evidence for that release is in `work/release-starter-flow-1/`.

## Before you start

1. Get the user's go-ahead in chat for this release: the source commit and a new version label (for example `starter-flow-2`). An earlier approval does not cover a new release.
2. The source commit must already be pushed to `origin/main`. Check with `git merge-base --is-ancestor <commit> origin/main` after `git fetch`.
3. Do not stamp, stash, check out, reset or clean the working tree. Other work may be in progress there. Do not run `scripts/pwa-assets.mjs` against the working tree.
4. Do not change `git config`. Do not force-push. Never replace `gh-pages` wholesale.

## Run

From `F:\Vibecode\Orbix`:

```
node scripts/release.mjs all --source <commit> --version <label>
```

This runs prepare, check and browser, then stops without publishing. If it ends with `all checks passed; publication skipped`, publish with:

```
node scripts/release.mjs all --source <commit> --version <label> --publish
```

`all` reuses the passed artifact, runs check and browser again, then publishes, waits for Pages (up to 12 minutes) and verifies. You can also run single steps (`prepare`, `check`, `browser`, `publish --publish`, `wait`, `verify`) with `--version <label>`.

Standing defaults built into the script, which you do not need to pass:
- `dist/design-lab/` is excluded from publication.
- The graph must contain `collector-vortex.mjs`, `practice-route.mjs`, `route-bonus-copy.mjs`, `assets/guide-atlas-chevron.svg` and `assets/guide-atlas-spread.svg`.
- One reviewed unlisted reference is accepted: a video poster on a developer page.

Use extra `--exclude dist/<path>` or `--require <dist path>` only when the user asks for it.

## What each step proves

- **prepare**: the artifact equals the commit byte for byte. Exclusions are removed. The old `?v=` token (read from `game.html`) is replaced everywhere, and `GAME_VERSION` equals the label. The offline graph is regenerated inside the artifact and every file in it exists. The graph lists no excluded file, contains the required files, keeps every file from the current public graph, and has no unlisted local file references.
- **check**: `node --check` passes on every artifact `.mjs`/`.js` file. The focused tests pass when run inside the artifact (see `DEFAULT_TESTS` in the script, or pass `--tests a,b`).
- **browser**: headless Chrome with throwaway profiles, against a local server of the artifact:
  - every graph URL returns 200 with the artifact bytes;
  - Home boots with no console errors, exceptions or failed requests;
  - the worker caches the complete graph;
  - offline Home and a lazy module import work;
  - New Game on a fresh profile enters First Light;
  - a worker from the currently public release, holding a Cards save and a Legacy save, upgrades automatically. Both saves change only in the documented ways, and offline Continue works.
- **publish**: re-checks that the artifact digest is unchanged and that `gh-pages` has not moved since prepare. Builds the overlay commit:
  - uses a temporary index;
  - writes blobs with `hash-object --no-filters`, and each blob ID is recomputed from the artifact bytes;
  - adds `release.json`.

  It fails if any public path is deleted, if any unrelated path changes, or if any unexpected path appears. Then it runs a normal push.
- **wait / verify**: the public `release.json` shows the new version. Every graph file plus `worker.js`, `offline-list.js` and the manifest matches the artifact byte for byte. A public browser boot loads the new version and caches the complete graph.

## Stop and report (do not publish, do not work around)

The script stops at the first failed assertion and prints why. Each step writes a report under `work/release-<version>/`, and failures add screenshots under `shots/`. Report the message and the report file to the coordinator. Do not edit the script or the artifact to get past the failure. Typical stop conditions:

- `this version label is already public`: choose a new label with the user.
- `artifact folder must start empty`: a previous attempt exists. Delete `work/release-<version>/` only if no publication happened from it (there is no `publication-report.json`).
- `artifact bytes equal the source commit`, or `no old version token remains`: packaging problem.
- `files in the public graph stay in the graph`, or `possible runtime dependencies missing from the graph`: the offline graph changed. A coordinator must review it. Allow a file with `--allow-graph-removal` or `--allow-unlisted` only after that review.
- `node --check` fails, or focused tests fail: see `artifact-tests.log`. About 65 tests in the wider suite fail at known baselines. The coordinator decides whether a failure is pre-existing by running the same files against the previous release's source.
- Any browser timeout, console error, failed request, or `only documented save changes`: a real player risk.
- `gh-pages moved since prepare`: someone published in the meantime. Start over from prepare after a review.
- `overlay scope`, `no deletions`, or a push rejection: never force anything.
- `wait` times out: check the repository's Actions tab for the Pages build. Do not republish.
- `verify` reports byte failures: Pages may still be serving cached files. Rerun `verify` once after a few minutes. If it still fails, report it.

## Still manual

- The upgrade fixture in the `browser` step writes saves through the previous public release's own `model.mjs` and `ui/gallery-fixtures.mjs`. If a later release changes that API, the fixture block needs a coordinator update.
- The allowed save differences (the tutorial evidence marker and the onboarding stage alignment) are listed in `classifySaveDiff`. A release that changes save migration must review that list.
- The offline graph roots live in `scripts/pwa-assets.mjs` in the source commit. Root cleanup (developer pages) is separate work.
- After the release, update `handoff.md` section 4 with the new version, Pages commit, revision and counts from `final-summary.json`. The release step does not commit anything to `main`.
