# Warm score and exposed terrain contours

## Terrain readability

The white contact outline is drawn once from the union of filled terrain surfaces. Roofs choose the lowest exposed ceiling face; floors choose the highest exposed ground face. Intersecting segments split exactly at crossings. Buried joins and coincident duplicate outlines disappear. Vegetation on buried surfaces is culled too. Both the main pixel renderer and canvas fallback use the same contour pass. Collider geometry and gameplay rules are unchanged.

World-space contour results are cached; panning does not rebuild them. Destruction, shape replacement, resizing or explicit terrain motion invalidates the result. Long offscreen shoulders clip before pixel drawing.

Six focused union tests cover floor/roof overlaps, exact crossing splits, duplicate contacts, invalidation and clipping. A further 8,351 exposed contour samples from the three real collision families were checked with the actual polygon collision function: each had filled terrain on one side and open space on the other, with zero mismatches. The three existing terrain registration checks also pass. The screenshot's Oldgrowth Pines course was inspected at multiple positions in the real renderer.

## Original lo-fi score: Lantern Hours

The broad reference is mellow lo-fi hip-hop. No Lofi Girl recordings, samples or melodies are used. The original offline composer now provides:

- 78 BPM, 160 arranged bars, 8 minutes 12 seconds per synchronized stem.
- Warm electric-piano voicings with sevenths/ninths and soft suspensions, sparse felt-key melodies and rounded bass.
- Swung hats, laid-back brushed snares, changing kick patterns and written breathing spaces.
- Ten distinct harmonic sections, shallow tine drift, subtle filtered room grain and a diffuse room response.
- A musical checkpoint mix, a fuller flight groove, restrained guardian percussion and quieter dream/pause mixes.

All processing remains offline. The browser streams three MP3 layers and eases their volumes; no live synthesizers, DSP graph construction or decoding jobs are added to the flight loop. Each stereo 32 kHz / 96 kbit stem is 5,909,013 bytes and 492.31 seconds, including identical encoder delay. Decoded peak levels are -1.6, -1.5 and -4.7 dBFS. The two existing adaptive music tests pass for scene response, smooth gain changes, mute, visibility and cleanup. Preview controls were also checked in the browser without console warnings/errors.

A separately normalized 45-second excerpt is available in music-preview.html and assets/audio/lantern-hours-preview.mp3. Normal gameplay keeps a quieter background mix so collision and pickup cues remain audible. The Music on/off preference is retained.
