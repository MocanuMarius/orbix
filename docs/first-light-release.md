# First Light release — 15 November 2026

Current release marker: `first-light-2`. The initial `first-light-1` release integrated the six-stop opening, terrain and lighting work, performance corrections, visible activations, Last Glimmer, campfire benefits, Spacetime and Collector Field Impulse.

## Foreground correction

- Nearest-camera foliage and rock now stay inside actual filled floor and roof banks, including moving terrain and Spacetime. Open sky, gaps and destroyed banks remain clear. The collision boundary and its contact rim stay visible.
- The closest plane composites once after world lighting, Flash and exit washes in both renderers. Its cached art and integer raster edges remain opaque black; it no longer cuts moving holes around the wisp, companions or Sparks. It does not add collision or change flight balance.
- The new matched motion comparison is `assets/previews/foreground-banks.mp4`. The earlier `first-light-terrain.html` films document `first-light-1`; they are retained as historical comparisons. The current phone gallery is `ecology-preview.html?biome=pinewood&course=1&at=30&pan=1`.

Verification for this correction: 30 focused terrain, foreground, registration, light and contact-edge tests pass after release stamping; all 199 top-level JavaScript modules pass syntax checks. An independent browser audit covers 40 states across all twelve biomes plus both Spacetime banks, with no partial-alpha foreground pixels or ink outside real terrain. All 300 corrected source frames in the new film also have black opaque ink. The ten-second film uses a controlled, collision-safe renderer traversal with matched movement, not a player survival run; its held native Flash wash is labeled for contrast.

The matched twelve-second production-app phone-viewport replay remains active with the same eight Lift taps: mean render CPU is 3.263 ms (previous release 3.280 ms), p99 is 6.6 ms (previously 7.1 ms), and neither run has an active render/RAF gap over 50 ms or runtime error. A separate dense traversal is 59.96 FPS. These are desktop-browser measurements, not physical-phone results. The real previous `e0cc739` installed worker upgrades to `first-light-2`, preserves the ordinary suspended campaign and sound preference, and serves the updated foreground module. Offline reload opens Home; Continue restores practice. The already-current launcher also succeeds.

## Shipped behavior

- First Light is a separate six-stop practice: real flight and Collector pickups, a real Proximity loan, close-flight charging and packing, Rest, a real Black Hole bypass, and a forgiving Warden. It preserves the suspended campaign, unlimited entrance-state retries, saved continuation, skip/reset preferences and Field Guide replay.
- `first-light.html` is a fresh online launcher. One deliberate tap updates an installed game before entering `game.html?tutorial=1`; first installation, an already-current build and offline/reconnect retry are supported.
- Brief source-art cues report actual skill, artifact and companion activations, including simultaneous and repeated triggers. Passive modifiers stay quiet; pause/resume clears old cues.
- Last Glimmer is one Flight rank after Momentum, at base cost 20. It preserves the fatal position only for a matching passage retry, including reload, without adding collision or rewards.
- Nearest-camera silhouettes are opaque black. Authored habitat animals remain decorative. Luminance spends three reach units through the union of actual terrain and solid scenery, including light emerging behind it.
- Recover is disabled when hearts and Sparks are full. Grow remains useful until its three-growth cap. An exhausted campfire offers a no-benefit Continue while retaining Skills, Collection, a seller and its single Dream route. Fuel-only recovery reports only the Sparks refill. Stale offers and repeated taps are revalidated.
- Spacetime is a one-rank Proximity purchase after Steady Current, at base cost 160. Nearby ordinary floor/roof banks yield shallowly ahead of the wisp; collision, contact rim, light and Proximity share the same local polygon. Sparks, props and guardian geometry stay fixed. Dream and Nightmare forecast private copies.
- Field Impulse is a Collector purchase after Search Spark, at base cost 80. An up, down or right swipe spends the available recovering field on brief levitation, a dive or a forward surge. It scales with the actual ring radius, requires at least 25% recovery and cannot interrupt fetching. Swipes cost no Lift; the dedicated Lift button remains immediate. Touch cancellation, multiple fingers, rotated landscape, pause and engine replacement cannot leave an extra action. Dream records the direction at the fixed simulation tick.

## Measured performance

These are matched desktop-browser measurements against public source `d46f95fa495f681b51de682dde27454824a2ff9f`, not physical-phone results. The integrated normal New Game fixture includes the production fixed-step ticker, HUD, music and effects, with the same seed and native Lift replay and no screenshots or state polling during the measured 12 seconds.

| Viewport | Public baseline FPS | Corrected FPS | Gaps over 50 ms, before → after | 99th-percentile render gap, before → after |
| --- | ---: | ---: | ---: | ---: |
| 900 × 405, DPR 1 | 40.16 | 59.93 | 12 → 0 | 51.6 → 22.1 ms |
| 1280 × 720, DPR 1 | 44.53 | 59.83 | 6 → 0 | 50.2 → 21.6 ms |
| 900 × 405, DPR 2.75 | — | 60.00 | — → 0 | — → 22.2 ms |

The corrected renderer shares one exact nearby terrain union within a render, rasterizes the existing spectral pixel commands into a bounded typed buffer for one upload/blit, and invalidates material-light masks only for geometry within their own reach. The generic and fast paths preserve the same pixel commands. A separate 40-second dense renderer traversal remained at 60.00 FPS with no errors. At 4× CPU throttle the dense fixture remains 43.94 FPS and the guardian fixture 51.83 FPS; the target is not met in those sensitivity cases.

Environment: Windows desktop, stock Microsoft Edge 157, NVIDIA RTX 3080 accelerated ANGLE D3D11, 24 logical processors, real-time RAF. FPS measures render-call cadence, not display scanout. Synchronous CPU timers omit deferred browser raster/compositor work. The controlled renderer traversal excludes survival termination and full application simulation. DPR emulation and CPU throttle do not establish phone performance. Raw local evidence is retained in ignored `work/frame-performance/measured-summary.json` and its referenced reports.

## Verification

- 81 integrated targeted tests pass across campfire benefits, Field Impulse and pointer input, Spacetime, First Light gameplay/curriculum, contact-edge fast/bitmap paths, terrain union, habitats and lighting, Last Glimmer, activations, checkpoint flow and packing.
- All 199 top-level JavaScript modules pass syntax checks.
- The real Chrome mobile-input probe passes twelve checks, including real touch, separate unpause/Lift behavior, all three directions, cancellation, multiple fingers, rotated landscape, visible feedback and preservation of the ordinary save.
- The First Light launcher browser probe covers an installed stale worker, offline/reconnect retry, an already-current build and first installation.
- Three delayed-input practice chains clear all six stops, including twelve actual flights. Fixed-tick Dream replay matches movement and ring state at 30 Hz recording versus 120 Hz replay for each Field Impulse direction.
- The two matched before/after films use the real `WispFlightView.canvas`, the same movement and a complete phone-landscape frame. `first-light-terrain.html` presents both films and posters.

The full suite is not claimed green. Five current `seamless-clears.test.mjs` failures and all six `terrain-geometry.test.mjs` failures reproduce with identical assertions on unchanged `d46f95f`. That baseline has one additional seamless failure which the updated practice test no longer has. The current seamless failures concern old reward totals, final-map/discovery expectations and the onboarding topic; the geometry failures concern the older two-shape contract, a superseded pickup digest and a legacy cache/terrain intersection. Exact TAP is retained under ignored `work/integrated-release/`. Physical-phone frame traces and human play remain unavailable.

| Exact historical check | Unchanged d46f95f | Integrated release |
| --- | --- | --- |
| `seamless-clears.test.mjs` | 2 pass, 6 fail | 3 pass, 5 fail |
| `terrain-geometry.test.mjs` | 0 pass, 6 fail | 0 pass, 6 fail |

The five shared seamless assertions are reward `37` versus `35`, reload reward `35` versus `37`, final map `'map'` versus `'map-clear'`, completed legendary discovery `false` versus `true`, and onboarding topic `'routes'` versus `'packed'`. The additional baseline-only practice assertion is `522` versus `524`. The six shared geometry failures are four null-shape `.slice` errors, the `ruins/2` inventory digest `920db2bd…` versus `6f21c5c7…`, and `ruins/2/844: cache-6 intersects a neighbouring curve` (`true` versus `false`). This is an isolated comparison of those two groups, not a full-suite baseline claim.

## Next design task — proposal, not implemented

Design meaningful build archetypes by combining Flight, Collector, Proximity, Luminance and Storage. Evaluate cards or limited slots against the current skill book, including how choices remain readable and how a build develops during a run. Preserve earned boss relics without making the player juggle equipment. Compare directions and their tradeoffs after this release before selecting or implementing a replacement system.
