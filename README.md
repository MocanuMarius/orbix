# Wispbound

A one-handed, portrait-browser flight roguelite, formerly Emberwing. The branching seven-stop expedition and three-card builds remain intact. The active game now uses original low-resolution pixel scenery and elemental wisp sprites, with a grim, muted atmosphere inspired by Salt and Sanctuary. No reference-game art is copied.

Choose a **Fire** or **Ice** player wisp before an expedition; its carrier companion uses the opposite glow. This choice changes appearance, preserving the same controls and build mechanics. Existing saves, cards, banked currency and skill ranks continue under the same save key.

## Controls and collection

- **Lift:** large lower-right button, or Space / Up. A pulse costs 6 Glow in a refuge, 8 in a cavern, or 7 in a gauntlet. Glide between pulses. A successful press immediately flares and stretches the wisp; there are no slow wing animations.
- **Boost:** smaller right button, or B / Shift. Protected forward travel helps reach the fixed exit sooner. Hold the button for half a second, or press Escape, to pause. Backgrounding/rotation also pauses.
- **Direct pickup:** touch a cache with the player wisp to receive fuel and currency immediately. The precise 16-unit pickup radius is independent of the carrier. Reservations never block player contact.
- **Carrier:** searches for the nearest spark within 100 units, flies out, carries it home, then rests for **5.5 seconds**. Fuel arrives on delivery. The player can keep collecting normally throughout its fetch and rest. A collision and a carrier cannot pay for the same spark twice.
- **Fuel:** expeditions start with 60 Glow. Normal caches restore 24–26 Glow; larger heart caches restore 40–42, capped at 100. Lift is unavailable when reserves are too low; gliding continues. Collision hearts remain separate.

Fuel appears in sparse rock, root and spire pockets rather than easy centreline strings. Each pocket contains one pickup; a connected three-shard crest identifies a richer cache. The pocket is carved into the same polygon used for rendering and collision. Nearby caches share an edge; roof-to-floor changes get at least three nominal seconds. Some pairs arrive before the carrier can recover, rewarding direct collection or a different build. The first cache is attached to a gentler leading shelf with about 3.6 seconds of approach time.

## Light and progression

The player light reveals nearby terrain and pickups through a dithered darkness mask. Dim silhouettes remain readable beyond it for fair warning. The carrier casts a smaller light at its actual position.

**Inner Glow** has three permanent ranks: visible radius 175 → 210 → 245 → 280. It changes reveal area independently of movement and collection reach. Carrier Reach remains 100 → 125 → 150 → 175. Recovery ranks reduce the 5.5-second rest to 4.675 / 3.85 / 3.025 seconds. The skill screen previews each change. Skills apply to the next expedition; three active cards and rewards remain run-specific.

Seven stops retain branching routes, support events, ordinary/elite tradeoffs, card drafts and a finale. Remaining Glow carries between passages; clearing a flight provides a minimum reserve of 60, while rest can refill it. This floor prevents one close finish from making the next passage underfunded. Warm Heart now needs four base pickups to suit the sparse placement.

## Run locally

Requires Node.js 20+. No install or build step is needed.

```sh
node server.mjs
```

Open http://localhost:4173. Phones must use this computer's reachable LAN address or the published HTTPS URL; phone localhost points to the phone itself.

```sh
npm test
```

## Source and validation

- `dist/wisp-renderer.mjs`: production 195-pixel-wide Canvas2D view, pixel sprite animation, authored terrain scenery, fog reveal, particles and carrier presentation.
- `dist/flight.mjs`: fixed-step flight, direct collection, terrain collisions, fuel and Boost. Exports WispFlight plus the legacy PhoenixFlight alias for development tools.
- `dist/wisp.mjs`: nearest-target carrier fetching, return delivery, cooldown and shared tuning.
- `dist/model.mjs`: branching routes, card builds, saves, elemental appearance and permanent progression.
- `dist/app.mjs`, `style.css`, `game.css`: mobile game UI, pixel map glyphs and card icons.

The renderer draws at 195px and uses nearest-neighbor scaling. Its cache is bounded; it never changes game state. The active game loads no PixiJS, Three.js, photographic terrain maps or painted phoenix sprites. Earlier rendering prototypes and diagnostic pages remain in the source for reference, but the production entry point does not import them.

Earlier tests cover engine and campaign rules; their easy-flight success targets predate this difficulty pass. Per the user's request, this iteration uses focused real-engine balance simulations rather than another broad test pass. The simulator compares the previous build and the new placement with matched starting reserves and bounded local controllers. Automated clears demonstrate particular controller paths, not human difficulty or universal solvability; physical-phone playtesting remains necessary.

The game requires no account, analytics, payment or cloud-save service. The existing private hosted Site may require the owner's ChatGPT sign-in. Progress is local to the browser; clearing browser data removes it.
