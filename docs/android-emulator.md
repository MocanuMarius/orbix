# Android emulator (Pixel 10) for performance measurement

Installed 2026-11-18, all on `F:\Android` (nothing on C:, no system settings changed, no admin rights used).

## What was installed (Google hosts only, via `dl.google.com` / sdkmanager)
| Package | Size |
| --- | --- |
| Command-line tools `commandlinetools-win-15859902_latest.zip` | 148 MB download (zip deleted after unpacking) |
| `emulator` | 1.1 GB on disk |
| `platform-tools` 37.0.1 | 17 MB |
| `platforms;android-36` | 127 MB |
| `system-images;android-36;google_apis_playstore;x86_64` (rev 7) | 2.3 GB on disk |
| AVD `Orbix_Pixel` in `F:\Android\avd` (grows with use) | a few GB |

SDK licences were accepted on the owner's approval. Layout: SDK `F:\Android\sdk`, AVD `F:\Android\avd`, logs `F:\Android\emulator*.log`, screenshots `F:\Android\shots`.

## Device
- AVD name `Orbix_Pixel`, device profile `pixel_10` (1080x2424, 420 dpi, from the installed tools), 4 GB RAM, x86_64.
- Android 16 (API 36), the version the Pixel 10 ships with. Image has real Chrome 133.0.6943.137 (Google Play image; no Google account signed in).
- Acceleration: WHPX already usable (`emulator -accel-check`: "WHPX(10.0.26200) is installed and usable").
- What Chrome sees in landscape, with its toolbar showing: `innerWidth x innerHeight` 924x308 (870x280 in the swiftshader run, which had a display-cutout strip), `devicePixelRatio` 2.625, `screen.width x screen.height` 924x412. The user agent says "Android 10; K" (Chrome reduced UA, normal).

## Start / stop / connect (PowerShell)
```
$env:ANDROID_SDK_ROOT='F:\Android\sdk'; $env:ANDROID_AVD_HOME='F:\Android\avd'
$env:Path="F:\Android\sdk\platform-tools;F:\Android\sdk\emulator;$env:Path"
# start the PC dev server first if needed:  cd F:\Vibecode\Orbix; node server.mjs
Start-Process F:\Android\sdk\emulator\emulator.exe -ArgumentList '-avd','Orbix_Pixel','-gpu','host','-no-snapshot-save','-no-boot-anim','-no-audio' -RedirectStandardOutput F:\Android\emulator.log -RedirectStandardError F:\Android\emulator.err
adb wait-for-device; adb shell cmd window user-rotation lock 1     # landscape (repeat after each boot)
adb shell am start -a android.intent.action.VIEW -d "http://10.0.2.2:4173/game.html?cards=1" com.android.chrome
node scripts\perf\android\connect.mjs demo
adb emu kill                                                        # stop
```
Screenshots: run in Git Bash, `adb exec-out screencap -p > F:/Android/shots/x.png` (PowerShell `>` corrupts the PNG).
Chrome first run: declined sign-in ("Use without an account", which implies the Terms notice), declined notifications and the ad-privacy prompts (No thanks / Got it).

## GPU modes (read this before trusting numbers)
`-gpu host` uses this PC's GPU (NVIDIA RTX 3080), so absolute FPS is HIGHER than a real Pixel 10. Use it for relative comparisons.
`-gpu swiftshader_indirect` is CPU rendering: pessimistic lower bound for graphics, not a phone either. Switch by changing the flag.

10 s `requestAnimationFrame` sample on the game home screen (`?cards=1`), 2026-11-18:
| Mode | avg FPS | p95 frame | max frame |
| --- | --- | --- | --- |
| host | 55.0 (one 217 ms hitch at load; a quiet 2 s run gave 60.3, p95 16.7) | 16.8 ms | 217 ms |
| swiftshader_indirect | 58.7 | 16.8 ms | 50 ms |
The home screen is light, so both modes hit vsync (60). The modes will differ under heavy load; measure there.

## Uninstall
Stop the emulator (`adb emu kill`), then delete `F:\Android`. Nothing else was changed (no registry, no environment variables, no features).

## Notes from the 2026-11-18 realism check
- Software GPU modes (`swiftshader_indirect`, `swangle_indirect`) crash qemu (access violation 0xc0000005) when the game renders heavy frames (stress scene, WebGL lighting). With `?gl=0` one flight ran at 1.9 FPS. Use host mode for all game measurements.
- The emulator sometimes returns to portrait; run `adb shell settings put system user_rotation 1` and `adb shell cmd window user-rotation lock 1` again (the scripts do it via `ensureLandscape`).
- `chrome://gpu` cannot be opened over CDP; read `SystemInfo.getInfo` from the browser target instead (`realism.mjs gpuinfo`).
- Normal-play benchmark: `node scripts/perf/android/play.mjs --label play-normal` (12 flights, about 35 min, trusted departure tap over CDP). Draw-call counts: `realism.mjs counts`; traces: `realism.mjs trace --what normal|stress [--light 1]`; restart in a GPU mode: `emu.mjs host|swiftshader_indirect`.
- Never run two of these scripts at once: they share port 4186 and the foreground tab.

## Notes from the 2026-11-18 realism check
- Software GPU modes (`swiftshader_indirect`, `swangle_indirect`) crash qemu (access violation 0xc0000005) when the game renders heavy frames (stress scene, WebGL lighting). With `?gl=0` one flight ran at 1.9 FPS. Use host mode for all game measurements.
- The emulator sometimes returns to portrait; run `adb shell settings put system user_rotation 1` and `adb shell cmd window user-rotation lock 1` again (the scripts do it via `ensureLandscape`).
- `chrome://gpu` cannot be opened over CDP; read `SystemInfo.getInfo` from the browser target instead (`realism.mjs gpuinfo`).
- Normal-play benchmark: `node scripts/perf/android/play.mjs --label play-normal` (12 flights, about 35 min, trusted departure tap over CDP). Draw-call counts: `realism.mjs counts`; traces: `realism.mjs trace --what normal|stress [--light 1]`; restart in a GPU mode: `emu.mjs host|swiftshader_indirect`.
- Never run two of these scripts at once: they share port 4186 and the foreground tab.

## Trusted benchmark protocol (18 November 2026)
One command runs the whole thing: `node scripts/perf/android/bench.mjs all` (restarts the headless emulator itself before the suite and before the A/B; about 100 minutes; the suite alone, `bench.mjs suite`, takes about 35 minutes; `bench.mjs ab` about 50). Nobody has to touch the emulator, Chrome or the PC while it runs. Results: `outputs/perf/android/<date>-bench/*.json`; tables: `node scripts/perf/android/analyze.mjs all`. Results and findings: `outputs/perf/report.md`, section "Trusted benchmark, 18 November".

**Before you start (the harness does not do this for you):** restart the emulator headless, emulator restarted no-window (about 3 minutes), and stop other heavy work on the PC (other workers, builds, releases). Emulator sessions flip between a fast and a slow state: the same scenario (marsh, late row, mid Chain) measured 46 FPS in a session 10 minutes after an emulator restart, 34 FPS about 40 minutes after it, and a marsh early flight dropped from 32 to 20 FPS in the middle of a session 80 minutes after it (host CPU use of the emulator went from 27% to 64% and the host GPU clock from about 400 to about 250 MHz). Cause not proven (candidates: emulator uptime, accumulated GPU-process crashes); frame rate and GPU clock move together (correlation 0.99 across 9 runs) but forcing the clock to 1.7 GHz with a background load did NOT raise FPS, so the clock is a symptom. Rule: start from a fresh emulator, run the suite within about 40 minutes, compare only runs of the same session, and treat a session whose host GPU clock is 30% below the usual 350-430 MHz as slow (the harness stores the clock with every run).

What the protocol does (`bench.mjs`, helpers in `benchlib.mjs`):
1. Host quiet check: CPU load over 3 s split into emulator and everything else (quiet = everything else at 4% or less), busy-loop timing (30 ms when idle), GPU utilisation and clock from `nvidia-smi`; waits up to 5 minutes, records what it saw.
2. Emulator health check: boot complete, landscape, Chrome in front, battery saver off, animation scales default, thermal status, emulator window not minimised. It fixes what it can and records the rest.
3. Chrome: one `am force-stop` start per session and a soft reset (navigate to `about:blank`) between scenarios. A hard restart after every scenario was tried and rejected: the first heavy flight after a Chrome start hangs the GPU process for 18-40 s (the host driver and the GLES translator compile the shaders again, the GPU watchdog kills it, Chrome restarts it; three crashes in one run drop Chrome to software), and restarting repeats it.
4. Warm-up flights until two in a row have no stall over 1.5 s (discarded), then N=5 measured flights of 30 s (first 4 s skipped), fixed seed (`perf-bench`), real edge style (`edge=spectral`), `?autopilot=1`, trusted departure tap. A measured flight with a stall over 3 s or a GPU crash is discarded and flown again (kept in the JSON under `discarded`).
5. Per scenario: median, min, max and spread (max-min)/median of avg FPS, 1% low, p95 frame time, frames over 33 ms. Spread over 15% marks the scenario unstable and the batch is run once more. Host CPU and GPU clock are sampled during every flight and stored with it.
6. A/B (`bench.mjs ab`): every condition once per round, order rotated and reversed between rounds, one Chrome session, 4 rounds. A condition is called real only when its paired difference has the same sign in at least all-but-one round and is at least 1 FPS and at least half the larger of the two noise ranges.
Scenarios: `marsh-early-starter`, `marsh-late-mid`, `pinewood-late-mid`, `coral-late-mid`, `frost-late-mid`, `stress` (`basalt-guardian` only with `--boss`, see below). Conditions: `base gl0 sky0 edges1 scenery1 lowres1 dpr2 dpr1.5 dpr1 boost`.

Emulator window: windowed vs `-no-window` was tested (`bench.mjs window`). Windowed saturates all 24 host threads and runs the game 2.5x slower; headless (`-no-window`) was chosen. The scripts start it that way (`restart-emu.mjs`, add `--window` for a window). Absolute FPS in the headless emulator are higher than in the windowed one used in the earlier reports, so never compare the two.

Known problems: (1) Guardian flights (`basalt-guardian`, `frost-matron`) hang the emulator's GPU process in every run (Chrome falls to software, 0.3-0.6 FPS), so they are not benchmarked; they fly normally on desktop. (2) The CDP socket goes silent when the Chrome tab dies; every call in `restartChrome`'s session has a 90 s deadline. (3) `chrome://gpu` still cannot be opened over CDP.
Extra tools: `where.mjs` (where the frame goes: traces, Canvas 2D call counts by caller, upload bytes), `desktop.mjs` (desktop Chrome calibration, 1x/4x/6x throttle), `boost.mjs` (GPU clock booster used by the `boost` condition), `restart-emu.mjs`.
