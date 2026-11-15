# Resonance: reactive sound and temporary light

## Sound connected to play

- Approaching a black hole smoothly bends all three synchronized music stems toward 0.72× speed and pitch. Leaving restores the same transport instead of restarting the score. The effect is artistic audio feedback; flight physics and reaction windows are unchanged.
- A spatial, nonverbal breath/formant murmur and quiet subharmonic follow black-hole proximity. Player pickups and shields remain centred rather than panning toward the hazard.
- Temporary Luminance brings the existing melodic layers forward and adds two quiet, harmonic shimmer voices. A pulse has a distinct blooming chime; Flash rises in a short bright ribbon.
- Spark strengths have different voicings, with an airy return for Collector deliveries. Pickup tones and shell cracks have separate rate limits to avoid chatter in chains.
- Shield saves, dark pickups, environmental bells/crystals, mushroom/reed lifts, boosts and clearing a passage have distinct cues. New tonal FX follow the exact 160-bar harmony of the original 78 BPM score and track its current pitch rate.
- Music and FX retain separate settings. FX only opens its AudioContext on a real input gesture. Pause, visibility, mute and disposal silence voices; the persistent ambience graph and noise buffer are reused. Transient overlap is bounded at 18 sources.

### Environmental sound pass

Proximity's visible terrain streamers now have their own quiet electrical texture: sparse crackles become denser and brighter as charge rises, accompanied by a small harmony-locked tension tone. This follows actual contact with solid terrain, not retained charge while flying away. It releases as soon as contact ends and stays silent through the pulse/recovery phase. Flash illumination can coexist with charging sound. Sparse/dense grain buffers and their playback/filter/gain nodes are prepared once on audio unlock; charging updates allocate no audio graph nodes.

Puffcaps pop with a soft membrane transient, a rising spring sound and a short spore flutter. Reed bubbles have a watery, rounded lift cue. Crystals ring with glass overtones; grave bells have a low hollow body; seedpods crack into warm Spark notes. Ice creaks before it falls. Other loose terrain has a lighter warning rustle and a distinct impact tumble. Vents have a short warning hiss and a fuller opening breath. Cues occur at actor phase transitions, not every frame, and are attenuated/panned by distance to the player. Offscreen distant actors are silent. Existing lift forces, hazard warning times and rewards are unchanged.

The audition now groups controls under World, Light and Nature. Nature exposes all eight environmental sounds, a small mushroom/spore demonstration and a two-second Proximity charging example that releases the shared light waves. All three panels fit at 915 × 412 without body or panel scrolling. The old separate 1.65-second Proximity ring was removed, leaving the shared one-wave-per-second fronts as the sole expanding ring effect.

The environmental pass has 16 focused checks passing: real biome interactions emit their distinct sounds once, warning/impact order is preserved even on a fatal collision, vents do not replay on every frame, existing pulse/reward behavior remains, and FX state updates preserve the bounded graph and disposal rules. All audition controls also ran in a real browser without errors; real audio unlock and the charge-to-pulse sequence were verified. This verifies operation, not subjective sound quality on every phone speaker.

### Mix hierarchy and restraint

The additional sounds were held for a mix review before publication. [FMOD's resource guidance](https://www.fmod.com/docs/2.04/api/managing-resources-in-the-core-api.html) recommends a small number of priority levels and audibility-based limits so quiet, low-importance details yield. [Xbox Audio Accessibility Guideline 105](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/105) explains how competing background output can obscure useful information and recommends independent audio controls. These are design references; this game still uses its own lightweight Web Audio implementation.

The resulting policy has three levels: danger/contact warnings, meaningful world actions, and decorative pickup/movement detail. At most three transient event groups occupy the foreground (a chord counts as one event). Only one decorative group can lead at once, with pickup accents limited to fewer than three per second. Warnings suppress new decorative accents and gently retire or duck lower-priority tails. The physical ceiling remains 18 transient sources, including fade tails, with six reserved from lower-priority use for danger feedback.

Charging pushes the black-hole murmur and light shimmer back. A warning further reduces those beds and the charge texture; the score dips by at most 22%, with quick attack and a slower return. Transport and harmony remain continuous. Music and FX keep their independent switches. Distance attenuation, one-shot phase transitions and quiet intervals keep environmental effects local rather than creating a constant soundtrack of every object.

The audition's Nature tab includes a bounded **Busy moment** comparison, combining charging, pickups, mushroom lift, warning and shield feedback. Stop, hiding the tab and leaving cancel its pending events. Focused checks exercise priority preemption, foreground/source limits, refusal of fresh pickup chatter under danger, silence and recovery, and bounded music ducking. These checks protect the mixing rules; phone listening remains the final check of the artistic result.

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
