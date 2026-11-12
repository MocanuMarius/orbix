# Emberwing

A portrait mobile-browser phoenix roguelite. Five flight encounters and two support stops make a seven-stop expedition. The flight scene uses **PixiJS 8.23.0 / WebGL**, with Canvas fallback if GPU initialization is unavailable.

## Play

Open the published game on a phone. Tap **Take Flight**, pick a starter card, then tap a glowing destination on the illustrated map. Scroll upward to scout future locations. Terrain, difficulty, challenge, and reward are shown before launching.

- **Flap:** the large lower-right button. Tap to rise; release to fall.
- **Boost:** the smaller button next to Flap. A protected burst; a visible timer shows recharge.
- **Pause:** hold Boost for half a second. Backgrounding or rotating the phone also pauses. Resume deliberately.
- **Desktop testing:** Space / Up to flap, B / Shift to boost, Escape to pause.
- **Cards:** choose between two offers. Three flexible slots, no reserve inventory. When full, swipe the equipped card to choose a replacement, then Replace or Keep.
- **Progress:** expedition cards reset each run. Collected embers are banked at the end, including on defeat. The Ascension tree contains six permanent upgrades in Wisp, Flame, and Rebirth branches.

Progress is stored only in this browser. Reloading during flight restarts the current passage from its saved checkpoint, without retaining duplicate rewards from the abandoned attempt. Clearing browser data removes progress. Skill purchases are available between expeditions.

## Run the source

Embers are sparse discoveries attached to scenery: relics below ruin arches, dew near canopy branches and thorn hearts, and rewards beside storm spires. A third of terrain sections have no pickups; occupied features hold one or two. Collection curls into the wisp over 0.32 seconds, then flashes with a ring and rising reward number. Its faint halo shows the actual attraction radius: collecting contracts it to 55%, recovering over 0.85 seconds. Hungry Wisp's Boost expansion also eases in and out. Large heart embers pay three currency but count as one pickup for card triggers and challenges. Kindled Spirit triggers every three pickups; Warm Heart heals after eight. Collection challenges require six to nine pickups. All placements reserve phoenix clearance across the full canopy sway envelope.

The game remains fully 2D. One WebGL material pass lights the existing scenery textures with warm phoenix light and cool wisp light; Boost increases the fire illumination. The Canvas fallback uses clipped light gradients. This is simulated 2D illumination, not 3D geometry or normal-mapped physical lighting.

Requires Node.js 20+. No installation step is needed for the packaged playable build: PixiJS and all generated assets are included.

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
- `dist/pixi-renderer.mjs`: layered GPU scenery, terrain, sprite animation, and effects.
- `dist/assets/prompts.txt`: exact art prompts, built-in generation mode, and asset QA.
- `dist/vendor/PIXI-LICENSE.txt`: PixiJS MIT license.

All generated art is stored inside the project. No external runtime assets, sign-in, analytics, card payments, or cloud-save account are required by the game itself. The private hosted site may require its owner's ChatGPT sign-in.
