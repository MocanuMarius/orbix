# Wispbound

A one-handed, portrait-browser flight roguelite, formerly Emberwing. The branching seven-stop expedition and three-card builds remain intact. The active game now uses original low-resolution pixel scenery and elemental wisp sprites, with a grim, muted atmosphere inspired by Salt and Sanctuary. No reference-game art is copied.

Choose a **Fire** or **Ice** player wisp before an expedition; its carrier companion uses the opposite glow. This choice changes appearance, preserving the same controls and build mechanics. Existing saves, cards, banked currency and skill ranks continue under the same save key.

## Controls and collection

- **Lift:** large lower-right button, or Space / Up. A pulse costs 6 Glow in a refuge, 8 in a cavern, or 7 in a gauntlet. Glide between pulses. A successful press immediately flares and stretches the wisp; there are no slow wing animations.
- **Boost:** smaller right button, or B / Shift. Protected forward travel helps reach the fixed exit sooner. Hold the button for half a second, or press Escape, to pause. Backgrounding/rotation also pauses.
- **Wind:** alternating vertical gusts now affect every terrain, with a 1.4-second directional warning. Peak force is 160 in ruins, 240 in canopy and 420 in storm, compared with the former storm-only 54. Caves reduce exposure by 35%; elite/finale routes and later stops increase it, up to 520. Smooth half-second ramps surround a strong sustained pulse. Storm updrafts can lift the wisp without a pulse; downdrafts demand preparation. Boost suppresses 72% of wind force and eases that resistance away over its protected exit. Steady Flame suppresses 55% of wind force. Directional streaks and chevrons remain visible inside the light, above the darkness mask. The encounter preview shows wind exposure as an icon and pips.
- **Direct pickup:** touch a cache with the player wisp to receive fuel and currency immediately. The precise 16-unit pickup radius is independent of the carrier. Reservations never block player contact.
- **Carrier:** orbits the player, searches for the nearest spark within 100 units of the player, flies out, carries it back to its orbit, then rests for **5.5 seconds**. A dotted circle shows the actual search radius, including upgrades and Boost effects. The circle and companion dim during recovery. Fuel arrives on delivery. The player can keep collecting normally throughout its fetch and rest. A collision and a carrier cannot pay for the same spark twice.
- **Fuel:** expeditions start with 60 Glow. Normal caches restore 24–26 Glow; larger heart caches restore 40–42, capped at 100. Lift is unavailable when reserves are too low; gliding continues. Collision hearts remain separate.

Fuel appears in sparse rock, root and spire pockets rather than easy centreline strings. Each pocket contains one pickup; a connected three-shard crest identifies a richer cache. The pocket is carved into the same polygon used for rendering and collision. Nearby caches share an edge; roof-to-floor changes get at least three nominal seconds. Some pairs arrive before the carrier can recover, rewarding direct collection or a different build. The first cache is attached to a gentler leading shelf with about 3.6 seconds of approach time.

## Light and progression

The larger player wisp has twice the previous sprite dimensions and no trailing flame or exhaust. Pickup and collision bursts remain. The companion follows a smooth 2.5-second elliptical orbit when idle or cooling, and resumes the orbit after fetching. Reduced Motion holds its orbital phase still.

The player light reveals nearby terrain and pickups through a dithered darkness mask. Landscape beyond the light is now nearly black, with only faint silhouettes. The far scenery is also subdued independently of the lit terrain. The carrier casts a smaller light at its actual position, dimming during cooldown.

**Inner Glow** has three permanent ranks: visible radius 175 → 210 → 245 → 280. It changes reveal area independently of movement and collection reach. Carrier Reach remains 100 → 125 → 150 → 175. Recovery ranks reduce the 5.5-second rest to 4.675 / 3.85 / 3.025 seconds. The skill screen previews each change. Skills apply to the next expedition; three active cards and rewards remain run-specific.

Seven stops retain branching routes, support events, ordinary/elite tradeoffs, card drafts and a finale. Remaining Glow carries between passages; clearing a flight provides a minimum reserve of 60, while rest can refill it. This floor prevents one close finish from making the next passage underfunded. Warm Heart now needs four base pickups to suit the sparse placement.

## Afterglow and learning

Successful flights can bank spare Glow above 60 as **Afterglow**. The starting bank holds 40, storage retains 80% of transferred Glow, and one briefing draw restores up to 20 Glow before a flight. Transferred fuel is deducted once; a full bank leaves excess fuel in Glow. Holding the bank saves it for another route or expedition. Failed or abandoned expeditions lose 25% of their bank. Permanent Vessel, Retention and Anchor upgrades improve capacity, storage efficiency and failure protection. Checkpoints show the balance and optional rule details; flight controls stay unchanged.

New players receive a short three-stop tutorial with two teaching flights and a support checkpoint. Contextual hints introduce Lift, gliding, Glow collection, the companion and Boost. Practice reserve and earnings do not affect the real profile. Learn can be replayed, and the tutorial can be skipped.

Power discovery is gradual: four simple powers initially, then companion, wind, reward and risk powers after 2, 4, 6 and 8 normal flight clears. Existing experienced profiles retain their powers. Discovery progress carries across expeditions, while equipped powers still last only for the current expedition.

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

- `dist/wisp-renderer.mjs`: production 260-pixel-wide Canvas2D view, finer original wisp and fuel sprites, authored terrain scenery, fog reveal, particles and carrier presentation.
- `dist/flight.mjs`: fixed-step flight, direct collection, terrain collisions, fuel and Boost. Exports WispFlight plus the legacy PhoenixFlight alias for development tools.
- `dist/wisp.mjs`: nearest-target carrier fetching, return delivery, cooldown and shared tuning.
- `dist/model.mjs`: branching routes, card builds, saves, elemental appearance and permanent progression.
- `dist/app.mjs`, `style.css`, `game.css`: mobile game UI, pixel map glyphs and card icons.

The renderer draws at 260px, raised modestly from 195px, and uses nearest-neighbor scaling. Finer original sprites preserve the large player's silhouette, companion light footprint and world-space range circles. Its cache is bounded; it never changes game state. The active game loads no PixiJS, Three.js, photographic terrain maps or painted phoenix sprites. Earlier rendering prototypes and diagnostic pages remain in the source for reference, but the production entry point does not import them.

Power drafts distinguish automatic expedition-long powers from fuel pickups. Cards show a trigger, benefit and exact tradeoff; equipped powers can be tapped at checkpoints for optional details. Inspection never equips or replaces a card. In flight, warm-gold fuel pickups explicitly show restored Glow or FULL; health and Boost effects name the resource they change. Flight still has only Lift and Boost.

Earlier tests cover engine and campaign rules; their easy-flight success targets predate the difficulty changes. Historical focused simulations compare the previous build and sparse placement with matched reserves and bounded local controllers; they do not represent current wind tuning or human success rates. Per the latest user instruction, further simulations, broad testing and balance fine-tuning are deferred until the feature backlog is addressed.

The game requires no account, analytics, payment or cloud-save service. The existing private hosted Site may require the owner's ChatGPT sign-in. Progress is local to the browser; clearing browser data removes it.
