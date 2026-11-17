# Course design: landforms (v2.0-courses)

Status: prototype behind `?courses=2`. Off by default; with the switch off every course, seed and save is unchanged (432 layouts compared byte for byte against the code before this change: 48 courses × rows 0/3/5 × 60/90/140 s).

## 1. How courses worked before this change, and where the odd edges come from

- A course is a list of *cells* in `dist/biome-courses.mjs`: `[height fraction, opening, width, spacing, floor|roof|both, landform]`, in three phrases (`entry`, `hard`, `rest`). `buildFlightLayout` in `dist/flight.mjs` paces them along the course length (intro, `requestedHardWindows` challenge windows by row, breathers, outro).
- Each cell becomes one *obstacle*: `center`, `gap`, and up to two polygons, `topShape` (hangs from above the frame) and `bottomShape` (rises from below). Each polygon is a separate hump spanning `-0.8·width … 2.45·width` with two closing points 900 units off-frame, picked from a small table of contours per terrain family (ruins / canopy / storm) and then edited by the `landform` word (`shelf` rounds to 18-unit steps, `cliff` adds a drop, tight cells pinch).
- Neighbouring humps overlap; there is no continuous ground. The silhouette is the union of independent mounds (see `outputs/course-design/existing/*.png`). The unnatural edges come from:
  1. isolated mounds and hanging blobs with nothing between them (a "roof" cell is a lump hanging from the sky in an open course);
  2. floor and ceiling built from the same contour family and centred on the same line, so they mirror;
  3. `shelf` quantisation (18-unit steps) and straight `cliff` drops on soft-looking ground;
  4. cache pockets: a 26–42-unit bowl carved into the crest of a hump, which reads as a notch;
  5. solid scene props (`scene-props.mjs`): a tall prop inserted on a hump, with the hump surface pulled up around it (cactus, arches, columns standing on nothing);
  6. no material: the same shape language for sand, ice, roots and masonry.
- Height limit today: there is no ceiling in a floor-only cell. Leaving the frame is a fall: once the whole body is above the top edge (or below the bottom) the flight takes a hit (`flight.mjs` step, "Open sky allows partial visibility until the whole body exits"). With a shield the edge itself is the contact. So an open-sky course already works in the engine; it simply never had sustained high ground.
- Pickups: cache lights are carved into crests, then the supply system (`glow-budget.mjs`, `spark-fields.mjs`, `spark-supply.mjs`) adds "sheltered glow" at mid-screen heights, trims surplus and normalises the total to a per-second budget (`fuelBudgetProfile`). Dark Sparks use side lanes in wide openings. Black Holes, wind drafts, risk chains and biome actors are placed from obstacle `center`/`gap` and sections.
- Difficulty by row: `getAscentInfo` gives `hardGapScale` (1 → 0.88, never below 0.78) and the number of challenge windows (1–3, more on later maps). Length: `getFlightLengthProfile` (45–150 s by seed and row).
- Tools that check courses: `scripts/balance-current-flight.mjs` (`simulate`, the delayed-input human pilots `human150`/`human250`/`human350` from `scripts/human-flight-planner.mjs` and `human-flight-perception.mjs`), `scripts/practice-pilot.mjs`, `scripts/balance-progressed-courses.mjs`, `scripts/biome-integration-probe.mjs`, tests `terrain-geometry`, `terrain-boundary`, `flight`, `seamless-clears`.

## 2. Flight facts the rules are built on (620-unit frame)

| Fact | Value | Source |
| --- | --- | --- |
| Forward speed | 154 units/s | `FLIGHT_TUNING.forwardSpeed` |
| Gravity, Lift impulse, terminal fall | 300, 205, 245 | `FLIGHT_TUNING` |
| One Lift from rest | rises 70 units in 0.68 s, back to start after 1.37 s (210 units ahead) | derived |
| Fastest climb (Lift every 0.30 s, the pilots' touch floor) | 160 units/s, slope 1.04 | derived |
| Steady climb (Lift at every apex) | 102 units/s, slope 0.66 | derived |
| Human reaction (pilots) | 0.15 s and 0.25 s, cadence 0.10–0.14 s, horizon 1.65–1.8 s | `human-flight-planner.mjs` |
| What the pilot sees | only terrain inside the wisp's light; with nothing lit it drifts toward mid-screen | `human-flight-perception.mjs`, `planHumanLift` |

## 3. Landform vocabulary

Each piece has a material and a meaning for the player. Soft materials (soil, sand, snow, scree) are smoothed and never steeper than their angle of repose (0.60 sand, 0.66 snow, 0.70 soil, 0.72 scree; the repose varies ±7 % along a slope so a slumped face is never ruler-straight). Hard materials (rock, ice) stay angular; ruins and timber may be straight.

| Piece | Shape rule | Player meaning |
| --- | --- | --- |
| `plain` | low ground with fine noise | rest, glide |
| `hills` | two-wave rolling ground, smooth | glide down, one Lift up |
| `dunes` | asymmetric: long windward ramp, slip face at repose | skim the crest, drop the face |
| `terraces` | equal risers (level strata); soil lips rounded, rock risers exposed with drift on the treads | a stair to climb or descend |
| `basin` | wide dip, flat water line in the middle | a breather; water is ground |
| `climb` / descent | long rise of the landmass with benches, under repose | sustained Lift rhythm |
| `cliff` | rock face between two ground levels, talus heaped at its foot | drop and glide (only `down` is used; an `up` cliff fails the lead-in rule) |
| `mesa` | caprock band over a broken slope, flat top, eroded shoulder on big ones | one big hop |
| `highland` | the landmass climbs high under open sky, holds, falls away | open-sky squeeze (see §4) |
| `rugged` | mountain mass with several summits and saddles, rock teeth on the summits | hop along a crest |
| `outcrops` | broad faceted boulders, skirt buried under soil, talus around | hop each one |
| `stacks` | broad-based rock pillars standing in water | weave between |
| `log` | straight fallen trunk with a root plate | a low barrier |
| `ruin` | built wall stub, straight edges allowed | a barrier with a broken top |
| `cave` | roof with its own rise and fall, stalactite clusters at drip lines, stalagmite mounds below each, faceted mouths descending from the mountain above | fly the passage |
| `arch` | underside of a span whose deck is above the frame; abutments curve up out of frame | pass under |
| `canopy` | rounded bough lobes from trees above the frame | pass under, low |
| `shelf` | flat hanging ice with short icicles | pass under |

Talus: every exposed rock body gets a heap of the surrounding soft material at its feet, up to 30 % of its height, at that material's angle of repose. This is what makes a boulder sit *in* the soil instead of on it.

Plausibility rules, enforced by `validateCourse` (`dist/course-landforms.mjs`):

1. Soft ground never exceeds its repose (+0.06 tolerance; the corner where a heap meets a rock face belongs to the rock).
2. No straight soft run longer than 186 units (water, ruins, timber exempt).
3. Exposed rock: width ≥ 0.75 × height, crest ≥ 10 units wide (no needles, no knife crests).
4. Every ceiling run starts and ends above the frame top (it hangs from something: a mountain, a deck, a tree, a glacier).
5. The landmass is continuous: one ground line from start to finish; pieces hand their level to the next.
6. Overheads follow the broad landmass (smoothed ground), not every pebble.

Fairness rules (also in `validateCourse`):

1. Gap under an overhead ≥ 205 (≥ 175 inside a challenge after row tightening).
2. Open sky above the ground ≥ 225 (≥ 235 inside a sustained squeeze; see §4).
3. Slope-limited corridor: there is a path that climbs at most 0.66 (0.92 in a challenge) and falls at most 1.25 per unit, with at least 70 units of vertical room (46 in a challenge) left for an imprecise hop.
4. Lead-in: a crest first seen one human horizon (1.65 s, 254 units) ahead must be climbable from a cruise height of 52 above the ground under the player at that moment, after a 0.25 s reaction, at 80 % of the fastest Lift cadence. The validator reports the spare seconds.
5. A long climb is repaid: a rich light where the ground levels out (protected from the supply trimmer).

## 4. What limits height in an open-sky course

Choice: the frame top, as the engine already does (no engine change). Leaving the frame is a fall, exactly as in today's floor-only cells, so the rule is consistent and needs no reading: the sky ends where the screen ends.

Evidence from the pilots, and the consequence: a squeeze where the ground climbs to within 200–250 units of the top failed 10–30 % of pilot runs, always by sinking into the high ground, never by leaving the top. In the dark the plateau is only seen inside the wisp's light, and a player with nothing lit drifts toward the middle of the screen. Ground held above mid-screen (y < ~330 of 620) for several seconds is therefore unfair today. The prototypes keep high ground at 335–370 (the band above it is 55–60 % of the screen), do not tighten open-sky bands with row, and keep the squeeze short. A tighter, owner-style squeeze needs one of: a ground rim visible from two Lift heights away (edge light range, scenery worker), a "thin air" sky cue near the top, or a soft cushion at the top edge. That is the next decision, not built.

## 5. Tooling

- `dist/course-landforms.mjs`: the generator, validator and recipes. `composeCourse(recipe, {seed, extent, windows, hardGapScale})` → profile; `validateCourse(course)` → `{ok, errors, metrics, line}`; `courseObstacles` → ordinary obstacles; `courseLanePickups` → lights on the good line; `buildLandformCourse` (used by `flight.mjs`). Deterministic: same recipe and seed, same course.
- `scripts/course-design/silhouettes.mjs`: whole-course strips (`existing/` and `v2.0/`).
- `scripts/course-design/pilot-courses.mjs`: flies new and existing courses with the same pilots, seeds and rows.
- `scripts/course-design/lab-data.mjs`: writes `dist/design-lab/courses-data.mjs` for the lab page `/design-lab/courses.html`.
- Tests: `tests/course-landforms.test.mjs`.

Recipe format (one line per piece: `[kind, params]`; phrases paced like the old cells):

```js
'desert-obelisk-walk': {
  id: 'v2-hoodoo-field', biome: 'desert', type: 'open-sky', name: 'The Hoodoo Field', ground: 'sand', start: 560,
  summary: 'Hard dark sandstone boulders stand out of soft sand; hop each one, glide between.',
  intro: [['plain', { len: 520, level: 545 }], ['outcrops', { len: 900, count: 2, size: [40, 70], level: 535 }]],
  challenge: [[['outcrops', { len: 1100, count: 3, size: [70, 120], level: 520 }], ['dunes', { len: 500, level: 520, amp: 40 }], ...]],
  rest: [['dunes', { len: 1000, level: 535, amp: 46 }], ...],
  outro: [['plain', { len: 520, level: 560 }], ['plain', { len: 520, level: 650 }]],
}
```

`level`, `to` and `band` are ground heights in the 620 frame (y down). Challenge phrases are placed `requestedHardWindows × legs` times, evenly; rows tighten `gap`/`clear` by `hardGapScale` (open-sky `band` is not tightened).

## 6. Engine support added (behind the switch)

`dist/flight.mjs`, four small edits: import `buildLandformCourse`; in `buildFlightLayout`, if it returns a course, push its obstacles, sections and lane lights instead of the authored cells; skip the solid scene-prop pass for that course; expose `layout.landformCourse` (recipe id, validator result, the full per-sample profile). Nothing else in the engine changes. The switch is read once from `?courses=2` (`courseGeneration()`); tooling can set `overrideCourseGeneration(2)`.

Landform obstacles are ordinary: `center`/`gap` anchor at the slice's ground crest and lowest overhead (so every system that reads "the opening" stays conservative), shapes follow the renderer contract, `cacheEligible` is false (no carved notches; lane lights replace them).

Optional metadata for scenery (not rendered yet): each obstacle has `terrainMaterial {bottom, top}`, `surfaceMaterials {bottom: [[x0, x1, material], ...], top}`, `landform`, `ceilingLandform`, `role`; `layout.landformCourse.profile` has per-sample (6 units) ground, soft ground, rock, ceiling, visible material, soft material underneath, landform label and role.

Not expressible today: floating bodies (sky islands, a natural bridge crossing the path seen end-on, slabs lit on top and bottom). The contact-edge union in `terrain-boundary.mjs` treats a floor as solid all the way down and a ceiling as solid all the way up, so a floating slab would hide the rim of the ground beneath it. Needed: a finite thickness per profile in `buried()`, and the same in the light and scenery bakes. Until then arches are drawn as undersides hanging from above the frame, which is the weakest visual in the set.

## 7. Converting all 48 courses

- Per course: 30–60 minutes for a recipe (most pieces exist), plus a 2–3 minute pilot run and one or two tuning passes. All 48: about 4–6 working days including review, assuming no new piece kinds. New kinds (crevasse, wave-cut platform, floating islands) add half a day each; floating bodies need the engine change above (1–2 days with tests).
- Balance risks: (1) Spark economy is normalised per second by the supply system, so climbing courses cost more Lifts for the same Sparks; the validator's climb repayment helps but courses with many climbs need a supply rule that counts ascent. (2) High ground near mid-screen is unfair in the dark (§4). (3) Authored encounter families (Stillwater Tunnel, Draft Staircase, Seed Orchard) place their own cells; they are not yet mapped onto landforms in v2 courses. (4) Biome actors that fall from ceilings need an overhead or fall from the frame top in open sky. (5) Scene props are skipped on v2 courses.
- What the scenery worker needs from the tags: texture per material span (`surfaceMaterials`), rock drawn darker and angular over the soft ground beneath (`profile.rock` vs `profile.soft`), water as a flat reflective line (`material === 'water'`), cave roofs vs boughs vs ice shelves (`ceilingLandform`), growth only on soft spans, talus as scree texture at rock feet.
