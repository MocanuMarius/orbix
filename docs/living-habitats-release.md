# Living habitats art release

## Scope and implementation

Terrain appearance and ecological composition are changed across all twelve biomes. Gameplay terrain polygons, Spark inventories, collision rules, flight speed, rewards and economy are unchanged.

`habitat-compositions.mjs` contains 36 authored vignettes, arranged for four course variants per biome. Seven crest profiles produce terraces, root banks, talus slopes, fractured shelves and rock stacks. Only Cloudbreak uses suspended islands; other formations continue into rooted banks with sloping shoulders. There are two parallax depths at 0.54 and 0.78 travel speed. Whole vignettes are selected together, preserving focal props, bare stone, soil pockets and animal perches.

| Biome | Composition and life |
| --- | --- |
| Oldgrowth Pines | Root banks, fallen timber and stumps; deer, foxes and rabbits |
| Lantern Marsh | Low banks, reed pockets, exposed roots; butterflies and ravens |
| Moonlit Ruins | Broken terraces, arch fragments and rubble; ravens and rabbits |
| Mourning Fields | Headstones, collapsed masonry and dead wood; ravens and rabbits |
| Briar Cathedral | Tangled roots, sloping talus and fallen timber; foxes and rabbits |
| Frostbound Reach | Split ice shelves, talus and fractured crags; occasional raven or rabbit |
| Glasswind Dunes | Eroded terraces, mesas, sparse dry cover and scree; occasional rabbit |
| Basalt Furnace | Cooling columns, fractured cliffs and talus; deliberately little vegetation |
| Prism Caverns | Mineral slabs, crystals and broken shelves; sparse lichen |
| Spore Hollows | Mushroom colonies, rooted banks and cave stacks; small mothlike butterflies |
| Coral Grave | Coral shelves, branched fans and reef stacks; small fish |
| Cloudbreak Isles | Suspended shelves with exposed roots and broken pillars; rabbits and ravens |

Playable surfaces receive biome-specific material crops, shared bedding direction for sediment, split facets for ice/basalt/crystal and buried branching roots in organic banks. Opaque atlas crops and staggered/mirrored texture rows replace transparent-edge bands. Vegetation is clustered on gentle ledges; exposed crests remain bare. Roofs receive hanging roots or lichen instead of inverted bushes. Foreground rock/foliage strips remain clipped behind the actual collision rim. Native pixel density and the common renderer raster scale are retained.

## Free art and provenance

Existing environment packs by Luis Zuno / Ansimuz are reused, with the links and licences in `dist/nature-credits.html`. Additional unmodified source sheets:

- Animated Wild Animals by ScratchIO (CC0): deer, fox and rabbit idle cycles.
- Pixel Raven by tbbk (CC0): resting and fluttering cycles.
- Butterfly by Jordan Irwin / AntumDeluge (CC BY 3.0, dual licensed with OGA BY).

Original author notes, licence text and direct source URLs are included in `assets/nature/licenses/`. Fish and formation/prop drawing are original canvas artwork. Wildlife is subdued, decorative and affected by the normal light mask; it has no pickup or collision behaviour.

## Rendering limits

Each cached course set contains six 512 by 320 plates (3.75 MiB RGBA). At most three sets are retained (11.25 MiB). Plates bake while loading, not during active flight; sprite sheets and their subdued palette versions also prepare during loading. Each plate carries at most two animal anchors. Only visible tiles and animals draw; no animal objects or terrain meshes are allocated during flight. Reduced Motion freezes sprite frames and decorative flight offsets. Device FPS is not claimed from these source bounds.

## Verification

- All 48 biome/course combinations baked through finite drawing commands with the six-plate/two-animal bounds intact.
- All twelve biome themes inspected in the real renderer at 915 by 412 landscape, with alternate forest courses also inspected. Scene-light mode exposes composition; normal Flight-light mode confirms darkness and the bright terrain contact rim remain distinct.
- Pan mode verified; animal frames use advancing visual time and remain registered to their own ledge.
- No console errors/warnings during the scenery review.
- The three existing terrain-registration tests pass, including static pixel registration, offscreen shoulder closure and bounded baking.
- The six tests in the older `terrain-geometry.test.mjs` fail on both the unchanged HEAD release and this branch. Four assume every obstacle has two terrain shapes, one expects a superseded inventory digest, and one reports a legacy cache/terrain intersection. They were not altered or presented as passing by this art release.
- Offline packaging includes all five wildlife images, both new modules and local attribution files (313 files total).
