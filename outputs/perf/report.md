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

## Emulator: normal play and realism check
2026-11-18. Pixel 10 AVD (Android 16, Chrome 133, DPR 2.625, page 870x280 CSS px), host-GPU mode (RTX 3080 behind the emulator's GLES translator, no ANGLE). Raw data: `outputs/perf/android/2026-11-18-{play-normal,counts-host,stress-host-gl,stress-host-gl0,trace-host-*,gpuinfo-host,play-swiftshader,desktop-compare}/`. Scripts: `scripts/perf/android/{play,realism,cdp,serve,emu,fillrect-callers}.mjs`.

### Q1 Normal play
40 s of each flight (first 4 s skipped), `?autopilot=1`; the departure gate is passed with a trusted tap (CDP `Input.dispatchTouchEvent`). Builds: starter = Pocket Sparks; mid = Echo, Spillway (Pulse), Cache Handling, Pocket Sparks, Twin Orbit with twin Collectors.

| Biome | Row | Chain | avg FPS | 1% low | p95 ms | >33 ms | >50 ms | longest ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pinewood | early | starter | 25.0 | 7.6 | 66.7 | 515 | 157 | 250 |
| pinewood | early | mid | 24.6 | 5.4 | 66.7 | 527 | 168 | 467 |
| pinewood | late | starter | 21.6 | 5.7 | 66.8 | 565 | 222 | 217 |
| pinewood | late | mid | 20.8 | 7.1 | 83.3 | 569 | 275 | 183 |
| marsh | early | starter | 31.0 | 10.0 | 50.1 | 409 | 78 | 167 |
| marsh | early | mid | 30.6 | 9.6 | 66.6 | 413 | 98 | 150 |
| marsh | late | starter | 28.2 | 7.1 | 66.6 | 451 | 130 | 300 |
| marsh | late | mid | 27.6 | 7.2 | 66.7 | 460 | 129 | 200 |
| coral | early | starter | 32.9 | 10.9 | 50.0 | 365 | 59 | 150 |
| coral | early | mid | 31.6 | 9.8 | 50.1 | 409 | 95 | 167 |
| coral | late | starter | 25.7 | 7.1 | 66.7 | 502 | 162 | 183 |
| coral | late | mid | 24.9 | 6.1 | 66.7 | 502 | 177 | 217 |

Normal play does NOT hold 60 on the emulator: 21-33 FPS (about 1000 frames per flight), only slightly better than the stress scene (18.6). Pinewood, the lightest biome, is the slowest. Chain size barely matters (mid costs 0.4-1 FPS); row matters more (late costs 3-6 FPS).

### Q2 Is the emulator's GPU cost real?
- (a) Software GL. `-gpu swiftshader_indirect` and `-gpu swangle_indirect`: qemu-system-x86_64 crashed (Windows Application Error 0xc0000005) several times while the game rendered (stress scene, a flight with WebGL lighting). With `?gl=0` one flight survived: pinewood early starter 1.9 FPS (p95 533 ms, longest 13.7 s), then qemu crashed again. No stress or second-flight numbers exist in software mode. Host mode was restored afterwards.
- (b) Host mode stress scene: WebGL lighting 18.3 FPS (1% low 9.5, >50 ms 456); `gl=0` Canvas 2D lighting 13.7 FPS (1% low 6.3, >50 ms 521).
- (c) Traces, 6 s, light categories so the trace does not distort the frame rate. Normal flight (marsh late mid) 23 FPS: GPU process CrGpuMain 98% busy, renderer main 44%, renderer Compositor 31%, CompositorGpuThread 25%, Viz 16%. Stress peak 16.7 FPS: GPU main 98%, renderer main 37%. Heavy trace with skia categories (the trace itself drops FPS to 2-5, so use only the shape): normal flight, GPU main about 1020 ms/s, `RasterDecoderImpl::DoRasterCHROMIUM` 897, of which `skgpu::ganesh::Device::drawRect` 770 (`SurfaceDrawContext::drawRect` 482, `addDrawOp` 201); stress: DoRaster 552, drawRect 349, DoEndRaster 253 (GrDrawingManager::flush 177). Canvas 2D raster is essentially the whole GPU-process cost; compositing and GL lighting are small.
- (d) `chrome://gpu` cannot be opened over CDP (`Page.navigate` gives ERR_FAILED, an intent does not resolve), so the same data came from CDP `SystemInfo.getInfo`: renderer "Android Emulator OpenGL ES Translator (NVIDIA GeForce RTX 3080/PCIe/SSE2)", `gl=egl-gles2,angle=none`, GL ES 3.1; `2d_canvas: enabled`, `canvas_oop_rasterization: enabled_on`, `rasterization: enabled`, `gpu_compositing: enabled`, `webgl/webgl2: enabled`, `vulkan: disabled_off`, `skia_graphite: disabled_off`, `multiple_raster_threads: disabled_off`. Nothing is software only: Canvas 2D is hardware accelerated with out-of-process raster (Ganesh on GLES), going through the emulator's GLES-to-host translation (every GL command serialised to the host).
- (e) Desktop Chrome (headless, same server, 915x412, DPR 2.625, touch, no CPU throttle, WebGL lighting), `heavy.mjs --throttle=1 --scenarios=stress`: 92.2 FPS avg, 1% low 52.8, p95 12.6 ms. GPU-process busy % not collected (heavy.mjs takes no trace). About 5x the emulator.
- Judgement: partly an artefact. The code path is real Chrome Android Canvas 2D (OOP raster, Ganesh/GLES), but it runs through a command-serialising GLES translator, so absolute FPS and the GPU-process saturation are probably overstated; the work itself (thousands of tiny `fillRect` ops, see Q3) is real and costly on any phone GPU.

### Q3 What the GPU process executes
300 frames, injected prototype wrappers, no game edits. The main canvas buffer is 720x232.

| Per frame (avg) | normal flight (marsh late mid, 25 FPS) | stress peak (18 FPS) |
| --- | --- | --- |
| fillRect | 3583 | 500 |
| drawImage | 73 | 105 |
| fill / stroke | 23 / 6 | 58 / 89 |
| putImageData | 0 | 1 (167 kpx) |
| getImageData | 0 | 0 |
| drawImage source area | 5.0 Mpx (8.4 Mpx dest) | 6.4 Mpx (10.7 Mpx dest) |
| WebGL | 2 texSubImage2D (34 kpx), 4 drawArrays | 5 texSubImage2D (337 kpx), 5 drawArrays |
| readbacks | none | none |

Receiving canvases: nearly everything lands on the 720x232 main canvas (3253 of the fillRects; 313 more on 28x28 sprite-bake canvases). drawImage sources into it: 512x320 (11 per frame, 1.84 Mpx, the largest), 720x232 (3-7), 512x160 (5.6), 208x256 (10), 96x256 (10), 768x390 (1-1.7), plus full-width 874/913x232 strips. Callers of the fillRect flood in the normal flight (stack sampling, `fillrect-callers.mjs`): `pixelLine` (wisp-renderer.mjs:190) from `drawTerrainBoundary` (terrain-boundary.mjs:130) about 1040 per frame and from `paintContactEdge` (contact-edge-art.mjs:40) about 1000 per frame, i.e. 1-pixel rects drawing terrain edge lines; pickup-art sprite emit 695 (plus `cachedSprite` 249 per frame, suggesting a sprite cache that keeps re-baking); level-scenery-two `flush` about 240; contact edge about 200 more; black-hole accretion disk about 225 (this marsh course has one).

Biggest item: about 2000 one-pixel `fillRect` calls per frame from the terrain boundary lines, each a separate Skia drawRect op (drawRect is 770 of about 1020 GPU ms/s). It dwarfs the stress scene's 500, which is why normal play is barely faster than the "stress" scene. Large texture uploads, readbacks and putImageData are not a problem.

### Not measured / caveats
Software GPU modes beyond one flight (qemu crashes). The `chrome://gpu` page itself (SystemInfo used instead). Desktop GPU-process busy %. `gl=0` in normal play on host. Rotation sometimes flips back to portrait on the emulator; `cdp.mjs ensureLandscape` fixes it before each flight. `heavy.mjs --label x` needs `--label=x`: my first desktop run saved to `outputs/perf/heavy/2026-11-18-true.json` (moved to `outputs/perf/android/2026-11-18-desktop-compare/`; it may have replaced an earlier file of that name).
