# Four distinct contact-edge concepts

The former narrow ivory/green/amber rim variants were too similar. This preview changes the visual structure, not only the color:

- **Carved Stone:** a broad, matte mineral bevel, chunky depth changes, dark cuts and an ivory lip. Static material rather than an animated effect.
- **Spirit Fire:** a blue core and uneven moving luminous tongues flowing into the material. Coherent traveling waves distinguish its motion from the static bevel.
- **Root Weave:** world-anchored clusters of brown branching veins, moss and small leaf shapes, with irregular gaps.
- **Rift Scars:** dark branching fissures that become red-orange and pulse locally as the Wisp approaches.

All four are opt-in art studies. The normal game's default rendering is unchanged. Exposed terrain union geometry remains authoritative. Decoration grows into the solid side; solid-object decoration is clipped to the union of its actual collision polygons so it cannot leak through thin branches. The exact contact seam is painted last. Roots and chips use stable spatial clusters; reduced motion freezes the blue flow and crack pulse.

`edge-ideas.html` is a new, watch-only gallery with a synchronized four-way video, matching enlarged videos and a Compare still action. It uses a grid so the four choices can be compared together on a phone. A large vertical comparison is also exported. Videos are 12 seconds, 30 FPS, H.264/yuv420p, muted and inline. A new URL and new filenames avoid prior offline-cache entries. The review videos remain outside the gameplay offline manifest.

Record with `RECORD_KIND=ideas node scripts/record-boundary-video.mjs`, open the local recorder and export its 360 frames, then run `python scripts/encode-edge-ideas.py`. A single production WispFlightView renders all four treatments at exactly the same time, position, camera and light, using the authored Pinewood course. This is a controlled visual replay, not a physics or balance test. No substitute landscape artwork is used.
