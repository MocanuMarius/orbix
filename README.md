# Wispbound

A one-handed, portrait-browser flight roguelite, formerly Emberwing. The branching seven-stop expedition and three-card builds remain intact. The active game now uses original low-resolution pixel scenery and elemental wisp sprites, with a grim, muted atmosphere inspired by Salt and Sanctuary. No reference-game art is copied.

Choose a **Fire** or **Ice** player wisp before an expedition; its carrier companion uses the opposite glow. This choice changes appearance, preserving the same controls and build mechanics. Existing saves, cards, banked currency and skill ranks continue under the same save key.

## Controls and collection

- **Lift:** large lower-right button, or Space / Up. A pulse costs 6 Glow in a refuge, 8 in a cavern, or 7 in a gauntlet. Glide between pulses. A successful press immediately flares and stretches the wisp; there are no slow wing animations.
- **Boost:** smaller right button, or B / Shift. Protected forward travel helps reach the fixed exit sooner. Hold the button for half a second, or press Escape, to pause. Backgrounding/rotation also pauses.
- **Direct pickup:** touch a spark with the player wisp to receive fuel and currency immediately. The forgiving 24-unit pickup radius is independent of the carrier. Reservations never block player contact.
- **Carrier:** searches for the nearest spark within 100 units, flies out, carries it home, then rests for **5.5 seconds**. Fuel arrives on delivery. The player can keep collecting normally throughout its fetch and rest. A collision and a carrier cannot pay for the same spark twice.
- **Fuel:** normal sparks restore 22–28 Glow; larger heart sparks restore 38–44, capped at 100. Lift is unavailable when reserves are too low; gliding continues. Collision hearts remain separate.

## Light and progression

The player light reveals nearby terrain and pickups through a dithered darkness mask. Dim silhouettes remain readable beyond it for fair warning. The carrier casts a smaller light at its actual position.

**Inner Glow** has three permanent ranks: visible radius 175 → 210 → 245 → 280. It changes reveal area independently of movement and collection reach. Carrier Reach remains 100 → 125 → 150 → 175. Recovery ranks reduce the 5.5-second rest to 4.675 / 3.85 / 3.025 seconds. The skill screen previews each change. Skills apply to the next expedition; three active cards and rewards remain run-specific.

Seven stops retain branching routes, support events, ordinary/elite tradeoffs, card drafts and a finale. Encounter geometry, terrain-associated fuel placements, and safe Boost exits remain the tested simulation. Remaining Glow carries between passages; clearing a flight provides a minimum reserve of 35, while rest can refill it.

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

Tests cover the 288-route fuel-aware flight matrix, direct collection during carrier cooldown, no duplicate pickup rewards, full expeditions and reloads, card/skill bounds, light-radius progression, terrain geometry and fixed-step consistency. Browser QA checks portrait controls, selectable map nodes, pixel rendering, Fire/Ice identity and light reveal. Physical-phone frame-rate and subjective balance need continued playtesting.

The game requires no account, analytics, payment or cloud-save service. The existing private hosted Site may require the owner's ChatGPT sign-in. Progress is local to the browser; clearing browser data removes it.
