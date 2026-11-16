# Collector cargo swing — 16 November 2026

Release **tow-swing-1**. [Watch the motion](https://mocanumarius.github.io/orbix/previews/tow-swing-1/) · [Play](https://mocanumarius.github.io/orbix/?v=tow-swing-1) · [Hands-on Collector inspection](https://mocanumarius.github.io/orbix/game.html?mock=boundary&cards=1&biome=pinewood&course=1&collector=1&v=tow-swing-1) · [Update an installed game](https://mocanumarius.github.io/orbix/cards.html?v=tow-swing-1).

The trailing pickup now has world-space inertia, a soft spring and gravity. A Lift leaves it briefly behind before the cord pulls it into a swing. The reel tightens during its final approach, and delivery requires physical contact at the cargo's real position. Collector still winds around the shared bowed cord. The recovery clock, pickup rules, paired Collectors and reduced motion remain supported.

The watch link opens a muted, looping 12-second actual-App recording. One missed inspection Spark is staged on the authored Pinewood course with the ordinary ten-second recovery. Seven normal Lifts occur while towing. The clip uses a fixed screenshot crop at normal speed; a full game-screen recording is also available. The staged Spark starts at world y=231.56, then arrives at y=196.347 beside the moving body's y=195.493. There is one Collector delivery at 10.65 seconds. The glossary, tutorial stills and earlier Collector art page now use the refreshed reel media. Earlier appearance comparisons remain labeled as historical recordings.

The optional hands-on inspection stages missed Sparks in a temporary flight and uses a four-second recovery so the return can be watched quickly. `collector=twin` stages two Collectors. It preserves the saved game.

## Verification

- Focused motion checks: **52/52** pass. Repeated-Lift flight tests cover 20, 30, 60 and 120 Hz paint cadence, exact fixed-step histories, physical contact, paired Collectors and reduced motion. Six actual-App inspection cases cover single and paired Collectors at 20 and 120 Hz, plus the fallback renderer at both cadences, without runtime errors.
- Fresh committed baseline: 664/724 tests pass, 60 fail. Candidate: 666/726 pass with the **same 60 historical failures** and zero added failures. The broad suite remains **not green**. JavaScript syntax: **536 files**, zero failures.
- The watch page autoplays with controls and a loop at 390×844, 915×412, 740×333 and 1280×800, with no horizontal overflow. The inherited contextual glossary checks pass at 915×412, 740×333 and 720×280, including nested Back, row previews, preserved receipts, unchanged saves and both main entry links. Checks use desktop Chrome and mobile emulation; physical Pixel 10 testing has not been performed.
- Offline package: **473 files**, revision **346d6bad9554**; all 473 preceding roots retained. The actual preceding `glossary-1` Pages worker upgrades through its cached launcher while keeping the ordinary save byte-identical and Cards saves structurally identical, including partial uses, completed Rest/Grow, future capacity and an unclaimed draft. Prepared offline game and glossary checks pass.
- The current cropped reel is 1.49 MB; the public full-screen recording is 0.59 MB. The public watch page and full-screen film sit outside the PWA download. Publication overlays committed canonical LF game bytes on the preceding Pages tree and preserves unrelated files. Public verification checks the packaged assets and watch artifacts against their Git blobs, and repeats the phone watch and glossary checks.

Baseline source: `b7c0b921f4366264eb6c3468918a61a264499ea0`. Baseline Pages: `80e6e4f9ac45cdbca464d769352d95f371d45211`. Release evidence is in `work/tow-swing-release`; mechanics route proofs are in `work/collector-swing-route-probe`.
