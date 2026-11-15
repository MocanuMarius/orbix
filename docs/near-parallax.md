# Nearest scenery pass

Two new decorative parallax depths carry substantial textured land fragments, tapering undersides, broken strata and hanging roots. Ground cover combines the existing licensed plant crops with dense biome-specific reeds, ferns, scrub, fungi and grasses. Woodland adds fallen wood and tangled crowns; cold/mineral biomes use sparse vegetation and rock or ice outcrops. Each biome and course variant gets its own seeded composition, with three irregularly selected plates per depth.

These layers sit behind physical terrain and share the existing darkness/light mask. Their soil caps have no bright continuous rim. Solid terrain retains its stronger collision edge. Frontmost rock strips, clipped inside real ground, also gain cached plant clusters. No collider, pickup, reward or flight physics changes.

Six 512×210 canvases are prepared while the scene loads. Frames translate those canvases rather than rebuilding plants or land. Retention is bounded to three course sets (about 7.4 MiB of bitmap storage); the renderer no longer allocates its unused placeholder depth plates. Native texture crops, raster density and main-wisp lighting remain unchanged.

The living-biome inspector now has a Pan toggle, also available through `ecology-preview.html?biome=pinewood&pan=1`, for watching parallax without playing a flight. Its full-scene light is an inspection mode; Flight light shows the normal game illumination.

Validation: browser inspection of woodland, marsh, fungal, cloud and frost scenes under scene/flight lighting; moving Pan control; syntax checks and three existing terrain-registration/geometry checks. This is not a measured Pixel 10 frame-rate benchmark.
