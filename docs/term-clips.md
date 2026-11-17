# Glossary gameplay clips

The glossary dialog shows a short gameplay clip first, then ONE line of text; the full text and the Example are under
"More details". Clips are recorded from the real game by code, so they can be re-recorded when the look changes.

## Re-record

```
node scripts/term-clips.mjs                  # all clips (about 4 minutes)
node scripts/term-clips.mjs --only flash,wave   # some terms (glossary keys)
node scripts/term-clips.mjs --list           # terms and scenarios
node scripts/term-clips.mjs --keep-frames    # keep PNG frames (temp folder, path is printed)
```

Output: `dist/assets/terms/<term>.mp4` (H.264, no audio, 480 px wide, 30 fps) and `<term>.webp` (poster).
Encoder: ffmpeg, found on PATH, or `FFMPEG=<path>`, or `work/audio-tools/imageio_ffmpeg/binaries/` (the route used by
`scripts/encode-*.py`). The CRF rises from 26 until a clip is at most 300 kB (`MAX_BYTES`).

How it works: headless Chrome with a throwaway profile, 915x412 at device scale 2, a mock run
(`/game.html?display=native&mock=cards&scenario=departure&chain=...`, nothing saved). Flight clips stop the engine's loop and
step it by hand (1/60 s, two steps per frame), drive CSS animations from the same clock, and let a "director" place pickups
and give inputs, so the same scenario gives the same clip (same size to the byte on a re-run). Screens that are not the
flight (Chain screen) are recorded in real time and resampled. Scenarios live in `scripts/term-clip-scenarios.mjs`
(functions run inside the page; `tc.drop(kind, dx, y)` places a pickup, `tc.lift()` is a real Lift input).

## Scenarios (seconds, chain, what makes it happen)

| Term | s | Chain | Scenario |
| --- | --- | --- | --- |
| luminance | 4 | Body Spark, Echo, Downbeat | Card Luminance 0% to +120% to 0% (what Lantern Lens does), no pickups |
| flash (Flare) | 5.4 | Resonant Harvest, ... | A Flare is dropped on the wisp's line; the wisp steers into it; light jumps, Pulses leave |
| wave (Pulse) | 5 | Resonant Harvest, ... | Flare plus five uncollected Sparks; the ring crosses them, slot 1 fires |
| collect | 4 | Body Spark, Echo, Downbeat | Three Sparks placed on the wisp's line |
| falling-lift | 4.5 | Downbeat, Echo, Body Spark | No autopilot: a Lift every 0.9 s while falling |
| rhythm | 5 | Rhythm, Toll Bell, Body Spark | Two phrases of three Lifts 0.5 s apart; Pulse and Toll Bell |
| engine-skim | 5.5 | Slip Feather, Resonant Harvest, Downbeat | Proximity reach +3 sources (about 120 px), wisp at 62% height over the floor; Proximity fills, Pulse |
| delivery | 5.5 | Courier Tip, Twin Orbit, Long Spool | A Spark dropped just behind the wisp; the Collector fetches and delivers it |
| overfill | 4.5 | Body Spark, Echo, Downbeat + Wellspring on slot 1 | Meter set to 1 below full, two Caches placed on the wisp's line |
| save | 4.5 | Home Beacon, Watchlight, Downbeat | Wisp forced into the floor at 1 s; Watchlight stops it |
| next (Repeat) | 4 | Echo, Body Spark, Downbeat | Three Sparks; Body Spark fires twice |
| boost | 4 | Body Spark, Prism Lens, Crescendo | Three Sparks; one Collect pays x1.25 and x2 |
| inscription | 5 | Body Spark, Echo, Downbeat + Gilded on slot 1 | Chain screen, then Play: the branded slot adds Bonus 4 (real time, about 8 fps) |
| devour | 4 | Dream, Resonant Harvest, Downbeat | Chain screen: "Eats the next card" / "Eaten at take-off", then Play (real time) |

Notes:
- The in-flight Chain strip shows no Inscription mark today, so Inscription uses the Chain screen. Devour has no take-off
  animation in flight (the eaten slot just turns empty), so it also uses the Chain screen. Re-record after the HUD work lands.
- Collect, Repeat and Boost show the Chain strip flashing and the "+N" cue; the Chain strip is small at 480 px.

## Sizes (this recording)

14 clips, 566 kB of mp4 (18 to 78 kB each), 67 kB of posters, 633 kB in all.

## Dialog and offline

`dist/card-terms.mjs`: `TERM_CLIP_LINES` (key to short line and alt text), `termClipMarkup`, `termSectionMarkup`. The clip is an
autoplaying muted looping `<video>` with a poster; with `prefers-reduced-motion` or the game's reduced-motion setting there is
no autoplay and a play button over the poster. The styles are injected once from the module (no extra file to cache).

The clips are NOT in the offline list: `scripts/pwa-assets.mjs` follows literal `assets/...mp4` strings in modules, so the
path is built from a directory string (`./assets/terms/` + key). `tests/term-clips.test.mjs` checks the offline list.
When a clip cannot load (offline), the video's `error` handler swaps it for the poster if that loads, else removes the
figure, leaving the text. To make a clip work offline later, add it to the offline list on purpose.
