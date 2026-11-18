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
