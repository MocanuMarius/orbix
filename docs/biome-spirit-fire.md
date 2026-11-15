# Approved Spirit Fire edges, colored by biome

The player selected the second bold art direction, Spirit Fire. It is now WispFlight's default contact style. The approved flowing silhouette, width and timing remain; a shared immutable palette supplies its deep color, body, fringe, core, hot accents, motes and near-white contact seam.

All twelve biome identities, including their forty-eight authored courses, resolve to a palette: Moonlit Ruins silver-blue; Oldgrowth Pines sage; Lantern Marsh jade; Briar Cathedral olive; Spore Hollows lavender; Basalt Furnace copper-amber; Glasswind Dunes warm gold; Coral Grave turquoise; Prism Caverns violet; Frostbound Reach ice-cyan; Cloudbreak Isles pale blue; Mourning Fields muted mint. Legacy rooms have terrain-family fallbacks.

The engine and pixel view cache the palette per level. Terrain and solid-object edges share it. Prop decorations remain clipped to their actual polygon union, and the contact seam is drawn last. Neither collision shapes nor visibility range changes. Reduced motion still freezes the flowing animation.

`biome-edges.html` shows four representative actual environments in synchronized recorded passes: Pines, Frost, Basalt and Spore Hollows. Individual enlarged videos and a Compare still control are included. The recordings use the production renderer and real levels, with a controlled camera and safe position path rather than a physics playthrough. Record with RECORD_KIND=biomes using scripts/record-boundary-video.mjs, then run scripts/encode-biome-edges.py. Review videos are excluded from the offline gameplay manifest.

Sixteen focused palette, edge and exposed-terrain checks pass, including all biome/course mappings, unchanged flow geometry between colors, exact contact seams, reduced motion and immutable palettes. Preflight checks also confirm normal Pines and Basalt flights select Spirit Fire by default and cache the correct palette.
