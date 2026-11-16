# 120 Hz rendering evidence — 2026-11-16

Flight now paints interpolated frames at up to 120 Hz. Physics remains at exactly 1/60 world-second steps, with the existing six-step catch-up bound, time dilation and resume ramp. The change is the paint deadline and a 0.75 ms allowance for rounded RAF timestamps and modest refresh jitter. Late callbacks paint once. No graphics, effects, pixel density, audio, terrain or game balance were changed.

The production renderer is `WispFlightView`, using Canvas2D. The historical `pixiView` variable does not mean this is a Pixi/WebGL rendering benchmark.

## Measured result

The same-seed full application, HUD, music and FX were exercised with real Lift, touch swipe and menu inputs in isolated, output-muted Chrome profiles. These are Windows desktop measurements with mobile viewport emulation. Chrome reported hardware ANGLE/NVIDIA RTX 3080; a read-only Windows display query reported 2560×1440 at 239 Hz, with a virtual monitor also installed. Neither query measures physical scanout or Pixel 10 performance. GPU execution times were not collected.

| Scenario | Contiguous active paint calls/s | Render CPU p99 | Active gaps >50 ms |
| --- | ---: | ---: | ---: |
| Matched 60 Hz baseline, 900×405 DPR1 | 60.16 | 4.1 ms | 0 |
| Current 120 Hz scheduler, same scene | 120.05 | 3.3 ms | 0 |
| Later flight, five equipped cards | 119.07 | 4.8 ms | 0 |
| Same later flight, **uncapped throughput** | 120.05 | 4.8 ms | 0 |
| 740×333 DPR1, Frost | 117.48 | 4.3 ms | 0 |
| 740×333 DPR2, real body/card events | 118.68 | 4.9 ms | 0 |
| 740×333 DPR3, waves and capture | 119.07 | 6.4 ms | 0 |
| 900×405 DPR2.75, Basalt | 118.78 | 4.6 ms | 0 |
| Actual Black Hole drain/time dilation | 118.13 | 4.9 ms | 0 |
| 45-second session, active phases | 119.64 | 5.4 ms | 0 |

Normal headless RAF arrived about 160–175 times/s on this host. Consequently, 120 paints/s are distributed over roughly 6/12 ms callback gaps; that is not an 8.33 ms physical-display pacing proof. In the explicitly uncapped run, the render interval was p50 8.3 / p95 8.9 / p99 9.7 ms. CPU render durations measure synchronous submission work, not GPU completion.

The 45-second unprofiled session kept the same browser page/process through one natural fatal collision, the full dying/death sequence, Return to map, route selection and a second flight. The game engine and canvas view were recreated normally on retry. It observed Collector outbound, returning, carried cargo, rejoining and one actual delivery; four body pickups, five row events/operations, and peaks of two waves and two capture effects. There were 4,770 active renders and 242 dying renders. Active CPU exceeded 8.34 ms three times, reaching 9.4 ms. This is two flights in one session, not one uninterrupted 45-second flight. A separate Black Hole fixture produced a peak drain rate of 30.24 and a minimum world rate of 0.5685, alongside two waves and a real pickup/capture. Effects are evidenced by these counters, not inferred from equipped cards.

## Entry, pauses and terminal transitions

Fresh-profile first entry had no controlling service worker: DOMContentLoaded was about 435 ms, the ready-to-wake control was observed at 1.19 s, and active measurement began at 2.04 s after 30 paused warm-up renders, screenshots and setup. The first-entry render maximum was 110.4 ms; startup long tasks reached 276 ms. The same-browser retry had 63 and 66 ms long tasks during its menu/entry transition. These costs remain visible in the raw artifacts; steady rendering results do not imply hitch-free loading.

One separate 22-second CPU-profile repeat reproduced 67 and 69 ms retry tasks. The first window was dominated by `drawMap → prepareOffer → prepareRouteOffer → geometry → new WispFlight` (about 54 ms inclusive), including `ensureGlowBudget` (20 ms) and draft-zone creation (14 ms). The second was the actual `launch → new WispFlight` (58 ms), including glow-budget construction (22 ms) and draft zones (16 ms). This identifies synchronous preview/flight setup as the measured transition cost; it does not attribute the original unprofiled tasks to GC. Profile/page clocks were aligned approximately at the end of collection with ±5 ms analysis padding, so these sampled window costs are approximate and remain separate from the unprofiled matrix. No additional optimization was made from this diagnostic.

A real pause and Resume action exercised the countdown and three-second ramp. The resumed first three seconds made 90 HUD/music callbacks: mean HUD 0.219 ms, music 0.053 ms, notification 0.336 ms; maximum notification 5.1 ms. In the following approximately two seconds, 19 HUD calls averaged 0.142 ms. Active render CPU p99 was 4.2 ms, with no >50 ms active gaps. The intentional 3.34-second pause gap is recorded separately.

A near-bottom fixture allowed gravity and normal game logic to cause death, complete its settling animation, and return to the map through the normal action. A separate fixture began 260 world units before the authored exit, then progressed normally through clear, its completion reveal and the actual card reward screen. The clear/reveal render CPU p99 was 7.7 ms, maximum 9.0 ms, with no >50 ms gaps. This earlier capture groups completion with its active bucket; it does not claim a separate completion-phase percentile. Seeking a scene changes the disposable fixture's starting position; it does not disable collisions or alter physics.

Advanced → Save performance report was clicked and its JSON downloaded successfully in `?perf=1` mode. That report distinguished 692 RAF intervals from 482 render intervals, with 2.7167 simulated seconds. World steps are separately proven by the regression tests; the existing report does not include a step counter. Its percentile ring is bounded to 3,600 samples, with bounded long-task/event/error lists.

## Why the change stays small

The actual CPU profile's main rendering paths were `lightFog → castTerrainLight → spatialMask/cellMask`, Canvas `drawImage`, and terrain foreground drawing. In a six-second five-card sample, light fog accounted for approximately 295 ms inclusive, terrain lighting 256 ms, and terrain foreground 154 ms. A later sample recorded about 67 ms of sampled garbage collection over eight seconds. None of these samples establishes GPU timing. The measured steady CPU budget did not justify replacing the renderer, adding WASM, changing lighting, or reducing visual quality. Cold construction and retry-entry hitches remain specific follow-up targets.

`tests/render-cadence.test.mjs` covers 30/60/90/120/144/240 Hz callbacks, both initial polarities of ±0.3 ms alternating jitter with 0.1 ms timestamp rounding, phase retention after late frames, duplicate callback rejection, interpolation, pause/resume/resize, and exact real simulation/input/resource state equivalence across refresh rates. All six new tests and all six existing world-clock/Dream tests passed.

## Release package verification

The `flight-120-1` package passed **159 focused tests**, the Dream replay probe and **445 JavaScript syntax checks**. The generated offline graph contains **404 files**, revision `cedaf0008053`. Outside `flight.mjs` and the generated offline manifest, all changed production files are byte-identical to the prior source after normalizing the known cache-version strings. This preserves the 71-card catalog, art, effects, rhythm and world-clock modules.

A secure-origin local upgrade probe installed the actual previous Pages `skills-cards-3` worker and cache, then exercised its cached launcher, cold workbench and prepared offline catalog/entry. Both mode saves, including mounted/reserve order and remaining uses, were preserved byte for byte. The [root diagnostics link](https://mocanumarius.github.io/orbix/?perf=1) opens the recorder; the compatibility card launcher does not forward `perf`. These packaging checks do not measure physical-phone performance.

## Reproduce

Run from the repository root with installed Chrome and Node. The probe opens only an isolated headless browser and local server, enables game audio while muting browser output, and closes its browser on completion. Raw JSON, screenshots and optional CPU profiles go to ignored `work/perf120`.

```powershell
node scripts/render-performance-120.mjs --baseline-ref=8f87530 --builds=baseline,current --cadences=normal --scenarios=plain,fieldWave,maxRow --seconds=6 --label=matched
node scripts/render-performance-120.mjs --scenarios=collectorRow --sessionSeconds=45 --label=continuous-session
node scripts/render-performance-120.mjs --scenarios=collectorRow --late --distance=hole --seconds=6 --label=black-hole
node scripts/render-performance-120.mjs --scenarios=collectorRow --late --width=740 --height=333 --dpr=2 --seconds=8 --label=mobile
node scripts/render-performance-120.mjs --scenarios=maxRow --late --cadences=uncapped --seconds=8 --profile --label=throughput-profile
node scripts/render-performance-120.mjs --scenarios=collectorRow --pauseAt=1.5 --seconds=10 --label=pause-resume
node scripts/render-performance-120.mjs --scenarios=collectorRow --lifecycle=death --seconds=8 --label=death
node scripts/render-performance-120.mjs --scenarios=maxRow --lifecycle=clear --seconds=11 --label=clear
node scripts/render-performance-120.mjs --scenarios=maxRow --perf --seconds=4 --label=report-download
```

`--baseline-ref` deliberately supports modified top-level source files with identical nested assets; it fails on additions, removals, renames or nested asset changes. For a broader comparison, supply `--baseline=<complete dist tree>`, which serves all files from that tree. Module versions for the fixture import come from the corresponding build. Initial profiling captures whose profiler was started after measurement began are retained under `matched-*` but excluded from the compact primary comparison because profiler startup itself introduced 50–100 ms gaps.

The compact evidence and measured-source hashes are in `docs/performance-120-summary.json`; later cache-version stamping changes import strings without changing the benchmarked scheduler. Raw evidence remains in `work/perf120`. Physical Pixel 10 timing, thermal behavior, browser chrome/notch behavior, and human difficulty are unmeasured.
