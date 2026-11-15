# Resonance: reactive sound and temporary light

## Sound connected to play

- Approaching a black hole smoothly bends all three synchronized music stems toward 0.72× speed and pitch. Leaving restores the same transport instead of restarting the score. The effect is artistic audio feedback; flight physics and reaction windows are unchanged.
- A spatial, nonverbal breath/formant murmur and quiet subharmonic follow black-hole proximity. Player pickups and shields remain centred rather than panning toward the hazard.
- Temporary Luminance brings the existing melodic layers forward and adds two quiet, harmonic shimmer voices. A pulse has a distinct blooming chime; Flash rises in a short bright ribbon.
- Spark strengths have different voicings, with an airy return for Collector deliveries. Pickup tones and shell cracks have separate rate limits to avoid chatter in chains.
- Shield saves, dark pickups, environmental bells/crystals, mushroom/reed lifts, boosts and clearing a passage have distinct cues. New tonal FX follow the exact 160-bar harmony of the original 78 BPM score and track its current pitch rate.
- Music and FX retain separate settings. FX only opens its AudioContext on a real input gesture. Pause, visibility, mute and disposal silence voices; the persistent ambience graph and noise buffer are reused. Transient overlap is bounded at 18 sources.

The playback implementation follows the standard [`playbackRate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate) and [`preservesPitch`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch) APIs. All synthesis and music remain original; there are no third-party recordings or new downloads.

## One temporary-light language

Flash, Proximity, temporary pickup/artifact reveals and interactive environmental effects emit one outward-moving front per gameplay second. Flash follows the actual tethered triangle; Proximity follows the main wisp; environmental sources remain at their world position. Emitted fronts stay anchored, expand at 360 world pixels/second and fade at their maximum range. Their faint, softly layered rim is rendered on the existing world raster under normal fog. Existing continuous light coverage remains, avoiding dark flicker between fronts.

The system retains at most 16 sources and 48 fronts. Intersections use the visible Spark shell, with swept contact so a late frame cannot skip an item. Nearby-pickup and axis bounds limit work before distance calculations. There is no new light texture or render buffer per frame.

## Adopted skill branch

The user chose repeated resonance rather than a once-per-Spark reward:

| Separate Luminance node | Base price | Effect |
| --- | ---: | --- |
| Resonant Harvest | 40 | Every wave intersection with an uncollected ordinary Spark restores 1 Spark to the meter. |
| Resonant Purification | 80 | Keeps Harvest and dissolves Dark Sparks touched by waves. |
| Resonant Bounty | 150 | Each ordinary intersection restores 1 Spark and grants 1 Stored Spark. |

Each node requires the preceding node; normal training price growth applies. The same map Spark can pay on subsequent waves, but can pay only once to any individual front. The ordinary Spark remains available for collection. Generated fuel, carried items and Flash Powerups cannot generate resonance rewards. Purification gives no fuel or currency, and does not affect black holes.

The Spark meter caps normally; Bounty's Stored Spark still pays when the meter is full. Resonance never triggers pickup/overflow/artifact hooks recursively. Currency is shown during flight, secured on a successful clear (including the final guardian) and lost on failure. Its payout is separate from the capped packing bonus. Pauses freeze the system, Dreams are visual only, terminal states clear it, and future offscreen Sparks cannot be farmed.

These are starting prices, not a claim of solved balance. Bounty is deliberately expensive because repeated intersections can become a build engine, particularly with Long Flash and pickup reveals.

## Review and checks

`resonance-preview.html` is a disposable listening/visual room. It shares the real wave and audio modules, has no saved-game storage, and exposes normal flight, black-hole proximity, Dream, pulse, Flash, pickup strengths, Collector return, shield and clear. Its audio starts only on request. At 915 × 412, controls fit without scrolling.

Focused checks cover synchronized rate easing, pulse mixing, AudioContext lifecycle/voice limits, repeated and swept wave intersections, pause/Dream/viewport safeguards, skill prerequisites and separate income settlement. A real WispFlight constructor/Flash/Harvest/death-cleanup probe also passes. The browser audition starts its real audio context, reaches the displayed 0.72× transport near the hole and records no runtime errors. Desktop and mobile-landscape views were inspected. No full balance simulation or all-repository test claim is made for this release.
