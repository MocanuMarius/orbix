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

---

# Trusted benchmark, 18 November

Protocol and commands: `docs/android-emulator.md` ("Trusted benchmark protocol"). Scripts: `scripts/perf/android/{bench,benchlib,where,desktop,boost,analyze,restart-emu}.mjs`. Raw data: `outputs/perf/android/2026-11-18-bench/*.json` (suite, suite-rep, ab, window-test, where-*, desktop) and the `log-*.txt` next to them. Build `5a5c027a`, real edge style (`edge=spectral`), N=5 flights of 30 s per scenario (first 4 s skipped), fixed seed, autopilot, Pixel 10 AVD in host-GPU mode.

## 1. Why the old numbers swung (53, 35, 32.6, 23 FPS)
Measured, in order of size:
1. **Emulator sessions are bimodal.** A fresh headless emulator gave marsh, late row, mid Chain 46.2 FPS (5 flights, spread 10%); a later session gave 34.4 (A/B base, 4 flights, range 2.2 FPS); and a marsh early flight fell from 32.7 to 20.1 FPS in the middle of one session (host GPU clock 255 to 215 MHz, emulator host CPU use 64% instead of 27%). Within a session the spread is small (1.3% to 12%); between sessions it is up to 2x. Cause not proven; the slow state appeared 30 to 80 minutes after an emulator restart. Frame rate and host GPU clock move together (r = 0.99 over 9 marsh runs), but forcing the clock to 1.7 GHz with a background load did not raise FPS (see `boost` below), so the clock is a symptom.
2. **Windowed emulator.** Windowed: marsh late mid 16.6 FPS (4 flights, spread 15.8%) with all 24 host threads at 100%. Headless (`-no-window`): 41.0 FPS (spread 13.4%) with host CPU at 27%. The spread is a tie; headless was chosen because it leaves 70% of the CPU free (other host work can no longer steal emulator time) and is 2.5x faster. The windowed emulator itself was fine (not minimised, in front). Absolute FPS here are therefore not comparable with the earlier reports.
3. **Cold-start GPU hangs.** The first heavy flight after `am force-stop` of Chrome stalls 18-40 s (renderer log: "GPU state invalid after WaitForGetOffsetInRange"; the GPU process is killed by the watchdog and restarted; Chrome counts "crashed N times"; three crashes switch it to software). `marsh-late-mid` needed up to 5 stalled warm-ups after one restart. A restart repeats it, so the protocol restarts Chrome once and soft-resets between scenarios, and discards stalled warm-ups and measured flights (none had to be discarded in the final data).
4. **Page height changes the scene.** The viewport was 870x308 in some sessions and 870x280 in others (toolbar state). The 308 run of `marsh-early-starter` (39.9 FPS) was not comparable and was replaced by a rerun at 870x280 (50.1 FPS). Every run now stores its viewport.
5. The first flight of a round runs 2-4% slow (A/B round 1, first condition); handled by rotating the condition order every round.

**Noise band to use:** within one fresh session, treat differences under about 7% (2-3 FPS) as noise (A/B base range 2.2 FPS = 6.4%; suite spreads 1.3-12%). Two fresh sessions on the same scenarios differed by -6, -7, -8 and -9% (the second session was slower every time). Never compare runs from different sessions without a same-session reference condition.

## 2. Scenario table (one fresh session, 5 flights each, median)
| Scenario | median FPS | min-max | spread | 1% low | p95 ms | frames >33 ms | second fresh session |
| --- | --- | --- | --- | --- | --- | --- | --- |
| marsh early, starter | 50.1 | 45.8-52.0 | 12.4% | 20.0 | 33.4 | 75 | (this row is from the second session) |
| marsh late, mid Chain | 46.2 | 42.2-46.8 | 10% | 22.1 | 33.4 | 113 | 43.5 |
| pinewood late, mid | 39.8 | 37.9-39.9 | 5% | 17.6 | 33.4 | 178 | 37.0 |
| coral late, mid | 53.7 | 52.6-54.1 | 2.8% | 22.7 | 33.3 | 40 | 49.2 |
| frost late, mid | 51.8 | 51.2-52.3 | 2.3% | 19.6 | 33.4 | 57 | 47.1 |
| stress scene | 30.1 | 29.8-30.2 | 1.3% | 18.2 | 50.0 | 475 | not repeated |
| Guardian flight | not measurable | | | | | | GPU process hangs every time |

No scenario exceeded the 15% spread limit in the final data. The ranking is stable across the two sessions: coral > frost > marsh late > pinewood. Frame times sit on the 33.4 ms step (30 Hz present) for most scenarios, so p95 does not separate them; average FPS, 1% low and frames over 33 ms do.

Guardian flights (`basalt` Hollow Sun and `frost` Frost Matron, ordinary start): every flight stalls 20-40 s, the GPU process is killed ("GPU state invalid") up to 3 times, Chrome falls to software and runs at 0.3-0.6 FPS, also with `?gl=0`. Desktop Chrome flies them normally, so this is either an emulator GLES-translator limit or a command the game sends that the translator cannot finish; not investigated further.

## 3. A/B on marsh late mid (every condition once per round, 4 rounds, order rotated and reversed, one session)
| condition | median FPS | min-max | vs base (paired difference per round) | verdict |
| --- | --- | --- | --- | --- |
| default (base) | 34.4 | 33.2-35.4 | reference, noise range 2.2 FPS | |
| `gl=0` (Canvas 2D lighting) | 30.9 | 29.5-33.0 | -3.5 FPS, -10% (-0.2, -3.5, -5.0, -4.4) | REAL: WebGL lighting is worth +10% |
| `sky=0` (moon and mist rect by rect) | 35.4 | 34.9-38.0 | +1.0 (4.8, 0, 0.5, 1.0) | noise: baked sky gains nothing measurable |
| `edges=1` (terrain-edge chunk bake) | 34.3 | 32.8-36.3 | -0.1 (3.0, -1.1, -0.6, -1.2) | noise: no gain, keep off |
| `scenery=1` (old ground, new landform scenery off) | 32.0 | 31.0-33.4 | -2.5, -7% (0.1, -3.5, -2.9, -3.0) | REAL but the wrong way: the old ground is slower; the new scenery is not the problem |
| `lowres=1` (output canvas 720x232) | 35.4 | 34.8-37.0 | +1.0, +3% (3.8, 0.2, 0.4, 0.9) | noise (at the floor) |
| DPR 2 (output canvas 1740x560, same as 2.625) | 34.8 | 33.7-35.7 | +0.4 | noise |
| DPR 1.5 (output canvas 1305x420) | 35.5 | 34.1-36.3 | +1.1, +3% | noise (at the floor) |
| DPR 1 (output canvas 870x280) | 35.0 | 34.0-36.4 | +0.6 | noise |
| `boost` (background WebGL load, host GPU at 1.7 GHz instead of 0.35) | 33.0 | 30.5-33.7 | -1.5, -4% | contention costs a little; a 5x GPU clock does NOT help |

A condition counts as real only if its paired difference has the same sign in all but at most one round and is at least 1 FPS and at least half the larger noise range. **Fill cost:** shrinking the output canvas by 2.2x (DPR 1.5), 2.6x (DPR 1) or 5.8x (`lowres`) in pixel count changed the frame rate by +0.4 to +1.1 FPS, within noise. Pixel fill and the final upscale are not the limit. Raising the host GPU clock 5x did not help either, so this is not plain GPU throughput (section 4).

## 4. Where the frame goes (real play; 150 frames counted; traces 6 s light and 5 s heavy)
| | marsh late mid | pinewood late mid |
| --- | --- | --- |
| frame rate during the light trace | 28.9 | 20.1 |
| GPU process main thread busy | **98%** | **98%** |
| renderer main thread | 45% | 40% |
| renderer compositor / GPU compositor / Viz | 33 / 17 / 14% | 23 / 12 / 10% |
| Canvas 2D draw calls per frame | 343 (fillRect 235, drawImage 80, stroke 12, fill 11) | 467 (fillRect 139, fill 110, stroke 116, drawImage 98) |
| Canvas 2D state calls per frame (save, restore, transforms, path building) | 4824 | 3102 |
| drawImage source / destination area per frame | 5.6 / 9.1 Mpx | 5.5 / 10.0 Mpx |
| canvases drawn into per frame (of all that exist) | 7 of 14, 2.0 Mpx summed | 6.2 of 16, 1.8 Mpx summed |
| `getImageData` | 0 | 0 |
| `putImageData` per frame | 1 call, 585 KB | 1 call, 183 KB |
| WebGL texImage/texSubImage uploads per frame | 2.3 calls, 656 KB | 1 call, 68 KB |
| total bytes uploaded to the GPU per frame | 1241 KB (about 36 MB/s at 29 FPS) | 251 KB |
| canvas re-allocations (width/height set) per frame | 0.1 | 0.1 |
| GPU main thread, heavy trace (shape only, the trace slows the game to 6-7 FPS) | DoRasterCHROMIUM 61% of the thread, of which Skia `drawRect` 47%; DoEndRaster/flush 25% | DoRasterCHROMIUM 52%, `drawPath` 33%; DoEndRaster/flush 38% |

Callers over 8 frames (call stacks, draw calls only; the marsh sample included the black hole of that course, so it overstates it). Marsh: `accretionDisk` black-hole-art.mjs:82/84/86, 94 fillRect each (42% of draw calls), black-hole `disc` 115, `drawSky` wisp-renderer.mjs:404 58, authored backdrop drawImage 24, habitat animals 12, wake 11. Pinewood: terrain-ecology `tuft` strokes and fills 245 (96+96+32+21, 52% of draw calls), `drawSky` 58, `groundMaterial` flush (level-scenery-two.mjs:481) 70 fillRects, authored plants 24 drawImage. Largest drawImage sources: the cached 512x320 background (11 per frame, 1.8 Mpx), 208x256 (10), 272x160 (8, pinewood), 720x232 layer copies (7), and the final 720x232 to 1740x560 blit once per frame (974 kpx).

**Single biggest cost: Canvas 2D rasterisation in the GPU process, driven by the number of vector operations per frame, not by pixels or uploads.** The GPU-process main thread is at 98% while the renderer main thread is at 40-45%, so the page is raster-bound. The heavy trace puts 52-61% of that thread in Skia raster of tiny rect and path ops (`drawRect`, `drawPath`) and another 25-38% in flush and op execution. The A/B shows pixel count is irrelevant, and uploads (0.25-1.2 MB per frame, no readbacks) are small. About 3000-4800 state calls and 350-470 draw calls per frame are replayed through the emulator's GLES translator. Both biomes have one decorative caller group that is about half of all draw calls (black-hole accretion disk and discs in marsh; terrain-ecology tufts in pinewood).

## 5. Desktop calibration (headless Chrome, 924x412, DPR 2.625, touch emulation, same URLs, N=2 per cell)
| scenario | emulator (median) | desktop 1x | 4x | 6x |
| --- | --- | --- | --- | --- |
| marsh early starter | 50.1 | 239 | 55.0 | 30.1 |
| marsh late mid | 46.2 | 232 | 48.4 | 25.9 |
| pinewood late mid | 39.8 | 217 | 49.0 | 26.2 |
| coral late mid | 53.7 | 234 | 54.2 | 27.9 |
| frost late mid | 51.8 | 236 | 53.5 | 28.8 |
| stress | 30.1 | 93.5 | 28.4 | 13.3 |
| Spearman rank correlation with the emulator | | 0.77 | 0.77 | 0.71 |
| emulator FPS / desktop FPS (median, range) | | 0.21 (0.18-0.32) | **0.96 (0.81-1.06)** | 1.79 (1.52-2.26) |

Desktop 1x is uncapped (about 235 FPS; only the stress scene separates). **4x is the level that matches the emulator's absolute frame rate** (ratio 0.96) and ties 1x for rank agreement (0.77); 6x is too pessimistic. No throttle level reproduces the ranking exactly: desktop makes pinewood as cheap as marsh late and marsh early as cheap as coral, while the emulator penalises pinewood and marsh late more. Use desktop 4x for regression checks of the stress scene and for ordering big wins; use the emulator for scenario-level decisions. The viewports differ (924x412 desktop, 870x280 emulator). N=2 per cell, so treat the correlations as indicative.

## 6. Recommendation
Optimise **the number of Canvas 2D operations per frame** next, in this order, measuring each with `bench.mjs ab` (same-session interleaving, 4 rounds, noise floor about 2.5 FPS): (1) bake the black-hole accretion disk and discs (about 400 fillRects) and the terrain-ecology tufts (about 245 stroke/fill ops) into cached sprites or layers that are drawn with one `drawImage`; (2) the 58 `drawSky` fillRects and the `groundMaterial` flush; (3) cut state churn (about 3000-4800 save/restore/transform/path calls per frame), for example by grouping fills per colour into one path. `sky=0`, `edges=1`, `lowres`, a smaller DPR and turning scenery off showed no gain, so skip them (keep `gl` on: it is worth +10%).

**A WebGL rewrite is not yet justified by this evidence.** What is shown: the frame is raster-bound on operation count, and pixels, uploads and the GPU clock are not the limit. That points at fewer, larger operations, which baking achieves at a fraction of the cost of a renderer rewrite. A WebGL renderer becomes the right answer only if, after the three steps above, the GPU-process main thread is still near 100% busy and the stress scene is still under 40 FPS. Caveat that cuts both ways: the emulator pushes every GL command through a serialising GLES translator, which probably overstates the cost of many small ops compared with a real Pixel 10 GPU, so confirm the first bake on a real phone before committing days of work.

## 7. Limits of this work
Absolute FPS belong to this headless emulator and this PC, not to a Pixel 10. The slow-session state was seen three times but its cause is not proven (suspects: emulator uptime, accumulated GPU-process crashes); the protocol stores the host GPU clock with every run and says to start from a fresh emulator. The Guardian flight could not be benchmarked. The A/B used 4 rounds, so differences under about 3% cannot be separated from noise. The `marsh-early-starter` row in the suite table comes from the second fresh session (the first session ran with a different viewport). The stress scene was measured once per session (5 runs). `play.mjs` and `serve.mjs` were edited (edge=spectral default, guardian query support); no game file was touched.

---

# Canvas 2D operation cuts, 18 November (late)

Tools: `scripts/perf/calls.mjs` (desktop Chrome sized like the emulator: Canvas 2D calls per frame by caller, split into draw / state / path / setters, and a same-moment pixel compare of render switches, with 4x crops). Additions: `bench.mjs ab --root <frozen dist copy>` and ad-hoc conditions `q:<query>` (for example `q:skip=light`); `where.mjs --root`; `?skip=<group>` in the renderer and the ecology code (diagnostics only). Raw data: `outputs/perf/calls/`, `outputs/perf/android/2026-11-18-bench/{ab-s1-*,skip-*,eco-*,guard*,shade-*,final-*,final2-*}.json`, `work/perf-snap/log-*.txt`.

Switches (each one alone turns its change off): `bh` (halo and core disc sprites), `tufts` (plant tufts, roof roots and stones in one atlas, sway quantised to 16 phases), `batch` (merged clearance runs, polygons with fewer vertices, shade bands drawn as polylines, sprite bakes written with one putImageData), `layers` (solid shade baked per 256 px course chunk). These are OFF by default and turned on with `=1`, because each writes an extra canvas every frame and the A/B measured no gain or a loss: `bhraster` (JS-composited disk and motes), `rects` (wake batch), `stars` (star layer canvas).

Calls per frame, all switches off → on (desktop, same moment): marsh late mid with the Black Hole on screen, draw 784 → 515 with the defaults (145 with `bhraster=1`), setters 971 → 780 (167), path 1598 → 979. Pinewood late mid: draw 497 → 247, setters 630 → 373, path 2993 → 1387. Guardian (basalt): path 5321, mostly solid shade bands, now baked per course chunk.

Emulator, fresh headless session, same-session A/B over 4 rounds, all on vs all off (`opt0`), median FPS:
- Pinewood: 30.3 vs 25.0 (paired +5.5, 4/4 rounds). An earlier session gave +3.6 (3/4). Noise band 9-14, so it is called "noise" by the protocol.
- Marsh: 38.4 vs 38.9 (noise band 6). An earlier session gave -1.6.
- Stress: 23.3 vs 23.3 (noise band 2.3).
- Extra canvases on (`bhraster+rects+stars`): marsh -6.2, pinewood -2.0 (4/4 rounds).

Pixels: shade chunks and the disc sprites are identical (0 differing pixels on seeded frames). With the defaults the marsh Black Hole frames are identical. Tufts differ by up to 32/255 on faint sub-pixel strokes, from the half-pixel snap and the quantised sway. Sprite bakes differ by at most 5/255 (`gl=0`, pinewood).

Where the frame goes now (bisect with `?skip=`, emulator): lighting is the biggest group in every scenario (marsh +11 FPS when skipped, pinewood +9, Guardian +14). In pinewood about half of that was building the solid shade, which is now chunked. Then ecology (pinewood +9: stones, authored plants), edges (+6), foreground (+4.6). GPU main thread: `DoEndRasterCHROMIUM::Flush` 475 ms/s, `DoRaster` 315 ms/s (down from 512). The cost is now per canvas raster flush and cross-context work, not draw count: more fillRects batch well in Ganesh, while every extra canvas written per frame costs a flush.

Guardian: basalt-guardian runs at 27-36 FPS on the emulator in hardware mode, with the switches on and with them off. The hang is the shader-compile stall on the first heavy flights after a Chrome start: 3 GPU-process crashes during warm-up, after which the GPU stays in use.

---

# Lighting pass cost, 18 November (night)

Goal: shrink the +9..+14 FPS that `?skip=light` gains. Files: `dist/light-gpu.mjs`, `dist/wisp-renderer.mjs`. Raw data: `outputs/perf/android/2026-11-18-bench/{lightprobe-marsh,lightfix-marsh}.json`, logs `work/perf-light-{probe,fix}-log.txt`.

**Probe (marsh late mid, emulator, new diagnostic switches).** `?skip=glfog` does all CPU light setup and the shade canvas but no GL draw and no composite; `?skip=fogdraw` does the GL draw but not the `drawImage` of the GL canvas into the 2D buffer; `?skip=shadeup` leaves out the per-frame shade upload. Two rounds (the session was noisy, host CPU 82% at round 2, so it was stopped): base 30.8 / 37.0, fogdraw 35.3 / 38.2, glfog 38.3 / 41.9, light 42.1 / 37.5 (round 2 under host load). So the cost is spread over three parts of similar size: CPU setup plus building the full-size solid-shade canvas every frame, the GL work (including a 720x240 2D-canvas-to-texture upload of that shade every frame, 656 KB), and the GL-to-2D composite.

**Change kept: GPU solid shade from the baked course chunks (default on, `?glshade=0` turns it off).** The shade chunks (256 px wide, already baked once per course chunk for the 2D path) are uploaded once each into a WebGL texture array (8 layers, LRU) and placed by the fog shader by camera offset. While the fog is fully on (`fogAlpha` 1) and every visible chunk is baked, the per-frame shade canvas (clear + 3-4 drawImage) and its per-frame texture upload disappear. Moving or Spacetime obstacles, the finish fade and the 2D fallback keep the old path. Also: one warm-up draw per GL program at creation.

**A/B (fresh headless emulator, marsh late mid, 4 rounds, order rotated):**
| condition | per round (FPS) | median |
| --- | --- | --- |
| old (`glshade=0&glbitmap=0`) | 35.5, 41.3, 37.0, 34.9 | 36.3 |
| GPU shade (`glbitmap=0`, the new default) | 41.1, 45.7, 40.4, 36.0 | 40.7 |
| GPU shade + bitmap hand-over | 38.2, 49.6, 33.8, 40.0 | 39.1 |
| `skip=light` | 49.6, 58.1, 48.0, 47.7 | 48.8 |

GPU shade vs old, paired: +5.5, +4.4, +3.4, +1.2 FPS (4 of 4 rounds, median +3.9, about +10%). The condition ranges are 6.5-9.7 FPS, so by the strict rule (half the larger range, 4.9) it is borderline, but the sign held in every round. It recovers about a third of the lighting cost; `skip=light` is still about +8-10 FPS above the new default.

**Tried and left off:** OffscreenCanvas + `transferToImageBitmap` for the fog frame (`?glbitmap=1`): paired -2.9, +3.8, -6.6, +4.0, no gain. **Not done:** making the WebGL canvas the visible one (idea 1). Every post-fog draw (wake, Wayfinder, warnings, fleet, main wisp, Black Holes, pickup labels, foreground, meters) is in the same 2D buffer, so it would need a second full-size overlay canvas written every frame plus a 2D-to-GL upload of the scene: two cross-context transfers instead of one, the pattern that lost FPS in every earlier experiment. A half-resolution light field (idea 2b) was not tried: the shade and the reveal bands have hard pixel edges inside the fog, and earlier DPR/lowres tests showed pixel count is not the limit.

**Checks.** Same-moment pixel compare, desktop, 16 marsh frames with Pulse rings (shade active), `glshade` on vs off: 0 differing pixels (max delta 0). `gl-diff.mjs` (GL vs Canvas 2D lighting, stress/marsh/coral/frost): max delta 1-4/255, as before. Renderer tests: same 43 pass / 1 fail as a clean HEAD copy (`pixel-renderer.test.mjs` fails on an unrelated `getModifiers` import). `heavy.mjs --check` fails its stored baseline both for this tree and for HEAD run right after it (stress 4x p95 58.4 ms here vs 87.6 ms for HEAD; avg 27.5 vs 22.6 FPS), so the baseline is stale, not a regression. Screenshot: `outputs/perf/heavy/2026-11-18-lightfix-marsh-marsh.png` (normal lit marsh frame, Pulse rings, rock shade correct). Guardian warm-up: the emulator still logged 3 GPU-process crashes in the first warm-ups after a Chrome start, so the crash is not our light programs (it happened with `gl=0` too); the warm-up draw does not prevent it.

**What remains the limit.** The rest of the lighting cost is the WebGL context itself on the emulator: the GL draw and the GL-to-2D composite each cost a context switch and a cross-context sync in the GPU process (whose main thread is at about 98%), independent of pixel count. Removing it means not using a second context at all: either the whole flight renderer in WebGL (one context, no transfers), or doing the darkness in Canvas 2D with far fewer operations than the old 2D path. Confirm on a real Pixel 10 first; the emulator's GLES translator likely overstates context switches.
