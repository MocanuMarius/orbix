# Android emulator perf harness

Drives Chrome on the local Android emulator (AVD `Orbix_Pixel`, Pixel 10 profile) over the Chrome DevTools Protocol.
Setup and start/stop commands: `docs/android-emulator.md`. No npm dependencies (Node 22+ global `WebSocket`).

```
node scripts/perf/android/connect.mjs targets                 # list open tabs
node scripts/perf/android/connect.mjs open http://10.0.2.2:4173/game.html?cards=1
node scripts/perf/android/connect.mjs eval "innerWidth+'x'+innerHeight" [--target <id|url part>]
node scripts/perf/android/connect.mjs demo [url]              # UA, DPR, sizes, 10 s rAF sample
```

As a library: `import {ensureForward, listTargets, openUrl, evaluate, rafSample} from './connect.mjs'`.
`evaluate(expr, target)` awaits promises and returns JSON values, so a benchmark can run in-page and return frame times.

Notes
- The emulator reaches the PC at `10.0.2.2` (not `localhost`). `node server.mjs` must be running on port 4173.
- Only the foreground tab runs `requestAnimationFrame`; background tabs stall. Keep one real tab, avoid `open` spam
  (it creates `about:blank` tabs that are hidden). Default target = first tab that is not `about:blank`.
- Do not close the last tab via `/json/close`: Chrome died once and showed first-run screens again.
