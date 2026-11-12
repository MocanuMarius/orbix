# Emberwing

A portrait mobile-browser phoenix roguelite. Five flight encounters and two support stops make a seven-stop expedition. The flight scene uses **PixiJS 8.23.0 / WebGL** with a live **Three.js 0.187.0** phoenix. Flight and collisions remain on a 2D plane. A mesh/Canvas fallback is available if GPU initialization fails.

## Play

Open the published game on a phone. Tap **Take Flight**, pick a starter card, then tap a glowing destination on the illustrated map. Scroll upward to scout future locations. Terrain, difficulty, challenge, and reward are shown before launching.

- **Flap:** the large lower-right button. A wingbeat costs **6 Flame in a refuge, 8 in a cavern, or 7 in a gauntlet**. Glide between taps to conserve effort. Below the displayed wingbeat cost, the phoenix cannot flap until an ember refuels it.
- **Flame vitality:** start with 100. A normal ember restores **22–28** depending on the route, a heart ember **38–44**, and a converted thorn mote **6**, capped at 100. Gliding spends no Flame. The HUD shows the reserve, and the phoenix's fire dims as it runs low. Collision hearts track injuries separately.
- **Boost:** the smaller button next to Flap. A protected burst; a visible timer shows recharge. Flights end at a fixed exit distance, so Boost and travel-speed cards save time and wingbeats.
- **Pause:** hold Boost for half a second. Backgrounding or rotating the phone also pauses. Resume deliberately.
- **Desktop testing:** Space / Up to flap, B / Shift to boost, Escape to pause.
- **Cards:** choose between two offers. Three flexible slots, no reserve inventory. When full, swipe the equipped card to choose a replacement, then Replace or Keep.
- **Progress:** expedition cards reset each run. Collected embers are banked at the end, including on defeat. The Ascension tree contains seven permanent skills in Wisp, Flame, and Rebirth branches.

Progress is stored only in this browser. Reloading during flight restarts the current passage from its saved checkpoint, without retaining duplicate rewards from the abandoned attempt. Clearing browser data removes progress. Skill purchases are available between expeditions.

Remaining Flame carries between flights. Clearing a passage lets the phoenix catch its breath up to a minimum reserve of 35. Resting at a camp or recovery event refills Flame; gathering glow at a camp instead restores 22 and awards currency. Existing saves receive a full reserve when first loaded with this system.

The map now has real three-lane forks and merges, a maximum of two reachable choices, and a single final ascent. Choosing a route changes the support stops and future branches within reach. Refuge routes offer frequent fuel and Wisp/Ash drafts; caverns are shorter, cost more effort and reward Wing/Wisp builds; elite gauntlets have leaner fuel and richer Flame/Wing rewards. Fuel shrines trade a full reserve against a new card. Preview each route before launching, and tap the top-left arrow to reconsider. Start **New Expedition** to receive the new graph; old saved routes can still finish, and starting fresh banks their collected embers.

Refuges are tested from 35 Flame and caverns from the advised 60, with 288 fuel-aware simulated flights across terrains, seeds and contrasting builds. These are automated clearability checks; physical-phone performance and subjective balance still need playtesting.

The phoenix is a genuine, continuously rendered 3D model, viewed side-on through an orthographic camera. Volumetric feather geometry, independently articulated shoulder/elbow/wrist joints, feather fans and flexible tail chains move through depth. Each successful tap drives a damped power stroke and recovery; Boost folds the wings. PBR feather materials include fine barb normals, rough reflections and cool moon/warm fire lighting. Pixi composites the live Three.js canvas every frame, with curved blaze ribbons, curling heat wisps, bounded spark/cinder pools and Boost shockwaves. GPU failure uses the earlier painted mesh rig as a fallback.

The photographic terrain materials are Poly Haven CC0 Rock Boulder Dry and Bark Willow, supplied as local 1K diffuse, OpenGL normal and roughness maps. Authors, original download URLs, license and checksums are included in `dist/assets/pbr-materials-sources.json` and `pbr-materials-license.txt`. The generated backdrop and fallback art retain their recorded prompts and provenance.

## Run the source

Embers are sparse discoveries attached to scenery: relics below ruin arches, dew near canopy branches and thorn hearts, and rewards beside storm spires. Route-specific quiet stretches separate pickups; occupied features hold one accessible fuel ember and sometimes a larger, riskier reward. An early approach ember and bounded distances between fuel sources support deliberate flight from a low checkpoint reserve. The autonomous wisp chooses the closest unclaimed ember within its 100-unit search range, flies out, carries it home, and delivers the fuel and currency on return. It then rests for 1.8 seconds before fetching again. The spirit's moving glow and trail follow its actual position; a faint halo at the phoenix shows search reach, and a recovery arc plus flight status shows its cooldown. The phoenix can still collect an ember by touching it directly. Hungry Wisp expands search reach by 60% during Boost. The permanent Spirit branch has three ranks of Reach (125/150/175 range) and Recovery (1.53/1.26/0.99 seconds of rest). Upgrade prices grow per rank, and purchases apply to the next expedition. Large heart embers pay three currency but count as one pickup for card triggers and challenges. Kindled Spirit triggers every three pickups; Warm Heart heals after eight. Collection challenges require six to nine pickups. All placements reserve phoenix clearance across the full canopy sway envelope.

The gameplay remains 2D while the phoenix is rendered in 3D. Terrain material lighting uses photographic colour plus authored normal/roughness maps. Warm orange phoenix and fire-wake lights and the autonomous white wisp illuminate the surface detail as they move. Moon fill and restrained bloom keep the night atmosphere. Terrain collisions still use the same polygon silhouettes that clip the materials. The Canvas fallback uses clipped warm and white gradients.

Requires Node.js 20+. No installation step is needed for the packaged playable build: PixiJS, Three.js and all local assets are included.

```sh
node server.mjs
```

Open http://localhost:4173. On another device, use this computer's reachable LAN address or the published HTTPS game URL. A phone's localhost points to the phone itself.

```sh
npm test
```

The tests cover seeded maps and authored terrain, cards and skill bounds, polygon collision geometry, safe boost exits, finite card triggers, rebirth, exact map challenges, whole expeditions, reloads, currency banking, and fixed-step behavior at 30/60/120 display Hz. Browser QA covers portrait layout, direct map selection, genuine Pixi/WebGL initialization and console health. Physical phone performance and subjective balance need continued playtesting.

## Assets and source

- `dist/app.mjs`: portrait game interface and application flow.
- `dist/model.mjs`: seeded expedition, card, event, save, and skill model.
- `dist/flight.mjs`: deterministic flight simulation and collision geometry.
- `dist/wisp.mjs`: autonomous nearest-target fetching, return delivery, and companion recovery.
- `dist/pixi-renderer.mjs`: layered GPU scenery, terrain and character integration.
- `dist/phoenix-3d.mjs`: live 3D anatomy, feather geometry, materials, joints and lighting.
- `dist/phoenix-rig.mjs` and `dist/phoenix-motion.mjs`: mesh fallback and shared damped joint response.
- `dist/flame-effects.mjs`: curved blaze ribbons, shaded particles and Boost shockwaves.
- `dist/assets/prompts.txt`: exact art prompts, built-in generation mode, and asset QA.
- `dist/vendor/PIXI-LICENSE.txt` and `THREE-LICENSE.txt`: engine MIT licenses.

All generated art is stored inside the project. No external runtime assets, sign-in, analytics, card payments, or cloud-save account are required by the game itself. The private hosted site may require its owner's ChatGPT sign-in.

## Material-lighting verification

Run `node tests/lighting-server.mjs`, open http://localhost:4180, and choose **Run GPU checks**. This diagnostic imports the production terrain shader, keeps the photographic stone texture fixed, and reads back the same rendered pixel patch under moon fill, nearby/distant fire, and nearby/distant white wisp light. It verifies actual brightness changes, moving falloff, and distinct fire/white reflections. Checked at 390px and 430px widths. The diagnostic is outside the published static build.

## Motion preview

Run `node tests/lighting-server.mjs` and open http://localhost:4180/motion for a larger preview using the production rig and fire-effect components. Its six-second recorder exports a WebM clip. Motion tests cover interrupted strokes, anchored roots, tail continuity, gentle glide flex and consistent 30/60/120 Hz response. This diagnostic is outside the published static build.
