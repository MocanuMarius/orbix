# Composed worlds

The terrain art pass gives each of the 48 courses a composition of its own: three large landmarks placed along the journey, layered with the existing banks, vegetation and wildlife. It retains the current common world raster and changes neither collision geometry nor gameplay balance.

## Visual direction

The references informed composition rather than asset reuse:

- [Limbo](https://playdead.com/games/limbo/): large silhouettes, negative space and a clear foreground boundary.
- [Ori and the Blind Forest](https://www.orithegame.com/blind-forest/): organic formations framing a central opening and cooler distance planes.
- [Salt and Sanctuary](https://ska-studios.com/games/salt-and-sanctuary/): ruined masonry, deep backgrounds and restrained warm accents.

None of those games' artwork is included. Original course compositions combine the game's palette and geometric masses with freely licensed native pixel textures and cutouts.

## What changed

- Pinewood, marsh and thorn courses use rooted arches, high branches, fallen timber, reeds and cathedral roots. Bark grain follows the direction of upright trunks and fallen logs.
- Ruins, cemetery and desert courses use arcades, bell stairs, courtyards, chapel shells, buried temples and obelisks. Native Town at Night rooftops and clocktower cutouts provide finer architectural detail.
- Frost, basalt and crystal courses use glacier buttresses, falling-ice silhouettes, mineral vaults, basalt organs, scoria roofs and broken prisms.
- Fungal courses use broad mushroom caps, gills and bent stalks. Coral courses use the artist's branching kelp, porous reefs and wreck scenery instead of simple branch diagrams.
- Cloud courses use disconnected land masses, ruined spans, ascending islands and an overhead vault.
- Background palettes are graded independently of solid terrain. Course landmarks blend at their edges instead of exposing rectangular cards.
- The repeated synthetic wavy bands inside authored rock materials are removed. Native granular material and geological faces remain.
- Guardian silhouettes render above opaque backgrounds and behind the real terrain, anchored near the ending.
- The scenery inspector supports `biome`, `course=1..4`, `at=0..98`, `pan=1` and `guardian=1`. It can switch between full scene inspection light and normal gameplay darkness.

## Asset provenance

Town at Night assets are unmodified PNGs from Luis Zuno / Ansimuz's [Gothicvania Patreon Collection](https://opengameart.org/content/gothicvania-patreons-collection), released under CC0. The included collection licence is `dist/assets/nature/licenses/castle.txt`.

The additional reef garden layer is an unmodified PNG from the same artist's [Underwater Fantasy](https://opengameart.org/content/underwater-fantasy), under CC-BY 3.0. Palette grading, scale, mirroring and placement happen in the renderer. Attribution, licence and source links are included in `nature-credits.html` and `assets/nature/licenses/reef.txt`.

## Verification and performance limits

All 12 biomes and all four courses per biome were opened through the actual mobile-landscape browser inspector. Coral was checked again after the native reef replacement. Representative foreground, landmark, full darkness and ending/guardian views were visually inspected. No browser errors were recorded during that review.

The five changed JavaScript modules pass syntax checks. The six exposed-terrain-boundary and three renderer-registration tests pass. This is a visual release, so no balance simulations were repeated.

Landmarks are baked before the flight becomes ready, after the cancellation guard. There are three 768 × 390 RGBA canvases per course, with at most two course sets retained (approximately 6.86 MiB before browser overhead). Each frame performs only the visible cached image blits. There are no per-frame image reads, texture regeneration or new collision checks. The normal Luminance/fog mask remains over every new scenery layer.

The separate `starter-flow-1` hotfix remains included: starting gifts that grant relics no longer get interpreted as skill identifiers, and backing out of gift selection preserves the current run.
