# Phone performance: why it slows "after a few levels" (17 November 2026)

Source: read-only hunt by an Opus worker with the harness in `scripts/perf/`; raw data in `outputs/perf/session/` and `outputs/perf/raw/`. Emulated phone 915x412, DPR 2.625, CPU throttle 2x and 4x. Measured on a frozen copy of the tree at `106a4e34`, `?scenery=2` off.

## Verdict

No memory leak. Over 10 flights in one page: heap 11.4 → 14.7 MB and flattening, previous flight always released, 0 rAF loops between flights, listeners and DOM flat, a fixed reference course costs the same after flight 1 and flight 8. No regression against release `85b57c38`.

The slowdown comes from things that grow during a run:
- later map rows and more equipped cards make the same course heavier (same course: frame p95 33 ms early with no cards → 42 ms late with a 5-card Chain; Guardian fight on basalt is the worst: p95 46 ms);
- some biomes cost far more to draw (frames over 33 ms per 20 s at 4x: marsh 106, coral 82, basalt 60, against cloud 10, desert 13);
- probably heat on the real phone (the CPU never rests, see cause 5); emulation cannot show it.

## Ranked causes

1. **Background strip redrawn 7.7 times a second.** `drawCachedBackground` (`dist/wisp-renderer.mjs` ~375-398) → `drawBiomeBackground` (`dist/biome-art.mjs:25`), drawn pixel by pixel. 18.6% of CPU in marsh, 10.5% in coral; each redraw is a 4–23 ms spike. Its cost per biome matches the biome ranking above.
2. **Light masks rebuilt from scratch.** `castTerrainLight` → `cellMask` (`dist/terrain-light.mjs:74`), `solidRayIntervals` (`:12`), `solidDistanceAt` (`:32`): about 19% of CPU. Each rebuild makes a new 128x128 canvas; `sceneFor` (`:44-56`) re-hashes every nearby obstacle polygon every frame.
3. **More run state costs more** (cards, Pulses, extra Sparks, twin Collectors). No single fix; helped by 1 and 2.
4. **Level start stalls 0.5–1.8 s (at 4x) on every flight.** `new WispFlight` 0.93 s, sprite pre-rendering in `dist/pickup-art.mjs` about 1.0 s, first light masks; load-time tinting (`dist/authored-environment.mjs:59`) smaller.
5. **SVG CSS animations on the main thread all the time.** `rune-glint` (`dist/game-symbols.css:15-16`), `companion-collect` (`dist/living-icons.css:14`): about 240 style recalculations a second, even on an idle Home screen and during flight.
6. **Two full-size output canvases (1830x824).** The hidden `#flight-canvas` (`dist/flight.mjs` ~1159/1202) is sized at full resolution but drawn only by the fallback renderer; 6 MB wasted.
7. **Unbounded cache:** `tinted()` art variants (`dist/authored-environment.mjs:53-70`), about 0.4 MPx more for each new biome visited.

## Fixes (R = render loop, T = level setup/teardown)

- **Fix 1 (R).** Bake each of the two parallax layers into its own wide strip: optional `{layer, originX}` on `drawBiomeBackground`; in `drawCachedBackground` render layer 0 and 1 into canvases `W+2*span` wide, redraw a strip only when its first element index changes, `drawImage` each at `-round(offset - first*span)`. Must look identical: screenshot diff in marsh, coral, moonruins. Expected 10–18% CPU in heavy biomes and no periodic spike.
- **Fix 2 (R), pixels unchanged.** (a) `rememberCell` (`terrain-light.mjs:96`): push the evicted canvas to `bank.spare` (cap 4) instead of `width=1`; `cellMask` (`:86`): `bank.spare?.pop()||document.createElement('canvas')`. (b) Reuse one module-level `ImageData(128,128)` (pixels with `r>=1` are never written, so they stay 0: verify). (c) Memoise `checksum(p.points)` in a `WeakMap` in `sceneFor` (`:56`). Expected 4–7% CPU, less GC.
- **Fix 3 (T).** Warm the sprite atlas while the map is idle: `requestIdleCallback(()=>prepareFuelSprites(document))` (exported by `dist/flight-entry.mjs:2`); move the glow budget and draft-zone setup out of the synchronous `WispFlight` constructor. Expected entry stall under 0.5 s at 4x.
- **Fix 4 (T).** After `state.variants.set(id,surface)` (`authored-environment.mjs:70`): `while(state.variants.size>24)state.variants.delete(state.variants.keys().next().value);` Do not shrink the evicted canvas: a cached landscape may still use it.
- **Fix 5.** Pause decorative glints during flight: `body.playing .carving-light, body.playing .heart-glint, body.playing .bonus-glint, body.playing .resource-facet{animation-play-state:paused}`. Small visual change (coordinator approved: these glints are decoration, not cues).
- **Fix 6 (R).** In `flight.mjs` `resize`, size the hidden engine canvas 1x1 once `pixiReady` is true (early-out check ~`:1172`, assignment ~`:1202-1204`); the fallback at ~`:2650` only runs when `pixiReady` is false.
- **Needs the owner's eye (changes the look), not done:** halve background sampling (`Math.floor(scroll)` at `wisp-renderer.mjs:378`), raise light `sourceStep` 12 → 16/24 (`terrain-light.mjs:6`), back the pixel canvas at 2x the buffer with CSS pixelated scaling (2.4x less fill).

## Daily check

`node scripts/perf/daily.mjs` (10–15 min; `--quick` for 3 flights; `--root=<dist>`). Saves `outputs/perf/daily/<date>.json`, compares with the previous day, prints `pass` or `REGRESSED` per metric (worse by more than 15% and beyond a floor: frame p95 +3 ms, +10 frames over 33 ms, heap +0.3 MB per flight, canvas +2 MPx, +200 DOM nodes, any rAF loop alive between flights). First run writes the baseline. Releases are not gated on it.

## Limits

CPU throttling is not a phone: GPU fill, texture upload, thermal throttling and real vsync are not captured. One course per biome was measured, not all 48. Real-device check: play 8+ flights with `?perf=1`, save the report after flight 1 and after a retry of the same course at flight 8.

---

# 18 November 2026: heavy load, stress scene, GPU lighting

## Tools
- **Stress test flight** `dist/stress-scene.mjs`: `?scene=stress` (confirm first; `&go=1` skips it) or Settings › Advanced › Stress test. Marsh landform course, Guardian (Hollow Sun, lantern shutters), giant Black Hole, a 5-slot Chain (Rhythm, Spillway II, Echo III, Resonant Harvest legendary, Twin Orbit) with Bell, Resonant, Twin Mark, Kindled and Lodestone, Sparks ×4, a Flare every 3.5 s and card Pulses every 0.25 s in the 35 s peak. Flies itself (`dist/flight-autopilot.mjs`), cannot be lost, writes nothing. Result panel + `window.__stressResult` + console line.
- `scripts/perf/heavy.mjs`: the stress scene (default) and the marsh/coral/frost/basalt-guardian scenarios at 4×/6× throttle; `--ab=<root>` interleaves two builds; `--check` compares p95 with `outputs/perf/heavy/baseline.json` (fails over +15% and +2 ms); `--save-baseline`.
- `scripts/perf/android/stress.mjs` (emulator, hands-off), `profile.mjs`, `trace.mjs`, `play.mjs` (autopilot flights; desktop works up to the departure gate, which needs a trusted tap: unfinished).
- `scripts/perf/pixel-probe.mjs` (now prints a histogram), `gl-diff.mjs` (GPU vs 2D on stress frames; slow, unfinished), `stall.mjs`, `trace.mjs`.

## Causes (stress scene, desktop 4×, CPU profile of busy time, before)
light masks 64% · terrain/scenery 11% · native canvas 8% · sprites 4% · final blit 3% · card engine 3% · simulation 2% · Pulse rings ~1% · style/layout ~5% of main thread. Pixi/Three are not used by the live flight (`pixi-renderer.mjs` is imported by nothing).

## Fixes
1. `terrain-light.mjs` CPU rewrite (identical pixels): clear-pixel table, typed sample arrays, one 32-bit store per pixel, ray/box culling, cell-key memo, per-polygon edge grid for ray cuts and the point-in-polygon test.
2. `light-gpu.mjs` WebGL2 compositor: 128×128 masks rendered on the GPU from cached ray-span textures (same polar 96-ray sampling, lattice and 12 Hz blends), fog composite with Flare prisms, Pulse reveal bands, solid-rock shade and lantern wake. Max difference 2/255 per channel on the test frames. On by default; `?gl=0` or any failure → Canvas 2D; context loss handled.
3. `contact-edge-raster.mjs`: only written rows are cleared, converted and uploaded (identical).
4. `wisp-renderer.mjs`: moon, stars, mist and labels as one path per fill (529/530 frames identical, 1 pixel differs in one).
5. Profiler start was the 1 s "stall" in yesterday's harness; heavy.mjs starts it before wake.

## Emulator finding
In host-GPU mode the GPU process main thread is ~95% busy executing Canvas 2D raster commands while the page main thread is ~57% idle: the emulator is raster-bound. A low-resolution output canvas (`?lowres=1`) gave nothing there. Reaching 60 FPS needs the whole frame on WebGL (static layers as textures, batched sprites), not more CPU work.
