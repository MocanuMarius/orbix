# Wispbound

A one-handed, portrait-browser flight roguelite, formerly Emberwing. The branching seven-stop expedition and three-card builds remain intact. The active game uses original pixel scenery and neutral light wisps, with a grim, muted atmosphere inspired by Salt and Sanctuary. No reference-game art is copied.

The player is a neutral light wisp. Choose a neutral companion before an expedition: **Swift** provides Boost, **Anchor** provides a level glide, and **Scout** provides Reveal. Switch companions at a rest checkpoint, with that choice remaining editable through preparation for the next flight. Each flight and its retries keep their entry companion. Pearl, Amber and Lilac glow colours remain optional cosmetics; range, recovery and collection upgrades remain independent. Old saves default to Swift without losing progress.

## Controls and collection

- **Lift:** large lower-right button, or Space / Up. A pulse costs 6 Glow in a refuge, 8 in a cavern, or 7 in a gauntlet. Glide between pulses. A successful press immediately flares and stretches the wisp; there are no slow wing animations.
- **Companion ability:** the prominent second right-side button, or B / Shift. Its label, icon and charge display match BOOST, LEVEL or REVEAL. Hold it for half a second, or press Escape, to pause, including during recharge. Backgrounding/rotation also pauses. No ability protects against terrain or screen edges.
- **MENU:** a gear button at the top opens the game wheel. It pauses a live flight and contains tuning, companions, permanent upgrades, Tutorial and sound. In flight, tuning is view-only; editing and companion changes follow the existing rest preparation rules. The wheel's Resume action returns to flying.
- **Draft puffs:** occasional, world-anchored patches of moving air replace the global gust cycle. A puff gathers locally, pushes briefly, then fades; it never affects the whole screen or repeats on a short timer. Force applies only inside its visible elliptical footprint and softens at the edges, so flying above or below avoids it. Puffs occupy wider recovery areas rather than tight chokes, with clear opening and exit approaches. Base peak force is 65/85/105 by terrain, capped at 140 after modifiers; the tutorial has one gentler puff. Boost suppresses 72% of local draft force and Steady Light suppresses 55%. Draft Feeder earns its recharge only while inside an active puff. Briefings identify occasional PUFFS rather than global storm severity.
- **Direct pickup:** touch a cache with the player wisp to restore fuel immediately and earn pickup embers, secured when the level is cleared. The precise 16-unit pickup radius is independent of the carrier. Reservations never block player contact.
- **Carrier:** every companion shares the same automatic pickup behaviour and gives direct collection priority. It waits until a beneficial packet has passed behind the player's 16-unit direct-contact window, then fetches the nearest missed packet still within its 100-unit range. Range upgrades also apply behind the player. It carries the packet back to its orbit, then rests for **5.5 seconds**. The dotted circle shows actual search radius, including upgrades and Hungry Wisp's temporary expansion, and dims with the companion during recovery. Fuel arrives on delivery. A direct touch and a carrier cannot pay for the same packet twice.
- **Fuel:** expeditions start with 60 Glow. Normal caches restore 24–26 Glow; larger rich caches restore 40–42, capped at 100. Ash Reserve adds 4 Glow to base pickups. Lift is unavailable when reserves are too low; gliding continues.
- **Lives:** an ascension starts with exactly three lives. A terrain or boundary collision immediately ends the attempt. Retry starts the same level from the beginning with its entry fuel and build; failed-attempt rewards are discarded. Winning a level does not refill lives. The third death ends the ascension. There are no hit points, healing, shields, in-place revives or extra-life upgrades. Explicitly ending an attempt consumes a life. Pause preserves it; browser interruption restores the entry checkpoint without an extra death.

Fuel appears as small round light packets in sparse rock, root and spire pockets rather than easy centreline strings. Rich packets have a brighter halo. The pocket is carved into the same polygon used for rendering and collision. Nearby caches share an edge; roof-to-floor changes get at least three nominal seconds. Some pairs arrive before the carrier can recover, rewarding direct collection or a different build. The first cache is attached to a gentler leading shelf with about 3.6 seconds of approach time.

On collection, a packet spirals into the player with an accelerating orbit and collapse. Fuel and rewards still arrive immediately on direct contact or carrier delivery; the animation cannot pay twice. Reduced Motion uses a short fade instead.

Later passages also contain sparse dark packets in optional edge niches, separate from the good fuel budget. Direct contact temporarily reduces light radius by 20% per stack, up to two stacks, with recovery over eight seconds. A natural light packet clears one stack. Dark packets grant no fuel or rewards and trigger no collection powers; they do not affect lives or Afterglow. The carrier ignores them. The opening passage and tutorial contain none.

## Light and progression

Companion abilities have separate tactical uses, with duration and recharge modified by the existing ability upgrades and tuning:

| Companion | Action | Base duration / recharge | Use |
| --- | --- | --- | --- |
| Swift | BOOST | 0.9s / 9s | Travel 48% faster and resist local drafts. |
| Anchor | LEVEL | 1.8s / 11s | Arrest vertical drift and cancel gravity briefly; local drafts still nudge. Pressing Lift cancels the hold immediately. |
| Scout | REVEAL | 3s / 12s | Expand the upgraded reveal radius by up to 45%, with a smooth fade. Dark-packet dimming still applies. |

The base sight radius remains 175. Lower visibility is deferred until playtesting can establish whether it preserves enough warning for the tighter passages. Reveal is an optional scouting advantage rather than a requirement for seeing the normal route. Hungry Wisp, Golden Wake, recharge powers and Shatter Wake now respond to any selected active ability, preserving build choices across companions.

Companions have distinct original pixel bodies: Swift is a winged crescent, Anchor is a squat bell, and Scout is a tall lantern with antennae and an eye. The same sprite shapes appear in flight, the home selector, the resting menu and the briefing. Tint changes colour independently of the role. The main wisp remains circular.

At a support/rest stop, choose among the three companions without spending currency or consuming the stop's recovery/event choice. The rest preparation window stays open through a following power draft, map and briefing, until flight begins. Switching changes only the active companion and its ability; it does not refill fuel, lives or reserve, grant points, or alter cards. Home selection during an active run still sets the next expedition's preference. Retry and interrupted-attempt snapshots preserve the entry companion.

The player wisp now has a true circular silhouette, reduced from a 16-pixel to a 13-pixel core radius, with a smaller glow envelope and no trailing flame or exhaust. Collision and direct-pickup radii are unchanged. Pickup and collision bursts remain. The companion follows a smooth 2.5-second elliptical orbit when idle or cooling, and resumes the orbit after fetching. Reduced Motion holds its orbital phase still.

The player light reveals nearby terrain and pickups through a dithered darkness mask. Landscape beyond the light is now nearly black, with only faint silhouettes. The far scenery is also subdued independently of the lit terrain. The carrier casts a smaller light at its actual position, dimming during cooldown.

**Inner Glow** has three permanent ranks: visible radius 175 → 210 → 245 → 280. It changes reveal area independently of movement and collection reach. Carrier Reach remains 100 → 125 → 150 → 175. Recovery ranks reduce the 5.5-second rest to 4.675 / 3.85 / 3.025 seconds. The skill screen previews each change. Purchases at safe checkpoints apply to the next new flight; permanent ranks persist while equipped powers remain run-specific.

Seven stops retain branching routes, support events, ordinary/elite tradeoffs, card drafts and a finale. Remaining Glow carries between passages; clearing a flight provides a minimum reserve of 60, while rest can refill it. This floor prevents one close finish from making the next passage underfunded. Warm Core restores 12 Glow after four base pickups once per flight. Ash Reserve and Restless Light replace the former shield and reduced-health power effects with fuel and wind/reward tradeoffs.

The seven stops contain five numbered flight stages and two support checkpoints. Every successful level immediately secures its embers in the permanent wallet, with a visible clear reward and the existing power choice. For the new extended passages, the guaranteed clear award rises from 60 to 108 across stages, with 36 extra for optional elites. Pickups, completed challenges and a capped score bonus add to that amount. Each 100 score contributes one extra ember, up to 24 on an extended passage. Failed attempts award nothing new; earlier secured earnings stay yours.

Permanent upgrades can be bought at safe checkpoints and apply to the next new flight. An unfinished or retried level keeps its entry build. Support choices spend the same saved wallet; there is no second copy of already secured money. Rest sites still add two tuning points each. Tutorial practice does not grant permanent rewards or allow purchases.

## Locations and challenge sections

Each biome contains three distinct locations, shared by its map landmark, preflight art, scenery and course generation:

| Biome | Locations |
| --- | --- |
| Ruins | Broken Aqueduct, Sunken Belfry, Ossuary Vault |
| Canopy | Hollow Elder, Thorn Fen, Hanging Grove |
| Storm | Knife Ridge, Moonfall Chasm, Glass Caverns |

Locations change route occupancy and rhythm as well as materials: arches and terraces, root tunnels and hanging branches, open chasm drops and crystal necks. Authored challenge windows use tighter passages, staggered climbs or dipping exits, with broader approaches and recovery stretches between them. Stage, route difficulty and available course length determine the number of windows. The course still uses actual shared render/collision polygons, sparse terrain-attached fuel and deterministic retries; tutorial layouts remain separate.

The climb now tightens hard passage gaps by 0 / 3 / 6 / 9 / 12 percent across its five stages, after the original gap bounds, retaining ordinary/elite minimums of 120/104 units. Requested challenge windows rise from one early to two mid-climb and three late where space permits. Intro and recovery passages, movement and fuel placement budgets remain unchanged. Map, briefing and flight labels expose the current stage; these defaults await the deferred balance pass.

Foreground materials and nearby landmarks carry the location identity without making distant scenery brighter. Map nodes show distinct original landmark art and location names. Briefings preview the signature challenge so route and tuning choices have context. The new geometry is an authored feature pass; reachability and numerical difficulty have not received a new simulation sweep.

Passages end at a weathered refuge waylight rather than a rotating portal. The lantern uses local timber, root or stone details and stays anchored to the exit, without following the player's height. It is a completion landmark, not an extra obstacle or required pickup.

Normal passages now have three times their former distance: route-dependent flight budgets run from 81 to 144 seconds, with a 165-second finale, before speed and ability effects. Briefings use compact time previews such as 1:42. The five-flight climb now targets roughly 10–14 minutes including checkpoint choices, depending on route, build and pace. Practice remains 22 and 26 seconds.

Extended passages use three paced legs, distributing authored challenges and recovery sections across the full course. Sparse light packets, rich caches, optional dark packets and localized drafts extend across that distance at the existing placement cadence. Speeds, ability timings, fuel costs and per-packet fuel values remain unchanged. Clear and challenge bonuses scale with the length; collection and ability-use challenges require three times their former counts. Per-flight powers still trigger according to their existing rules.

Save migration extends unplayed normal routes once. Completed levels and already-started, interrupted or failed attempts retain their previous duration and reward scale for that retry. Later unplayed routes use the new lengths. No new difficulty simulations or balance pass has been run.

## Flight tuning

Each normal ascension starts with a three-point tuning budget and a balanced allocation. The first two rest checkpoints add two points each, growing the budget to five and then seven. Each of four axes accepts at most three points, so the budget cannot maximise everything. Initial preparation and rest checkpoints allow free redistribution; the setup stays editable until the next flight begins. Flight and retries keep the allocation fixed. Tutorial practice introduces three points at its rest site rather than before the first Lift lesson.

| Axis | Per point |
| --- | --- |
| Speed | 3% faster forward travel |
| Lift | 6% more calm-air rise distance |
| Collector | 12% larger fetch radius |
| Boost | 5% longer burst and 4% shorter recharge |

Flight tuning is accessed through the top MENU wheel rather than controls embedded in the map, rest or briefing page. A badge on the gear highlights unspent points when editing is available. The tuning panel shows combined effects with equipped powers and permanent upgrades. Modifiers retain explicit bounds; the Lift bonus changes impulse by a square-root factor to match the stated rise-distance bonus. Tuning points are an ascension build budget, not a new collectible currency. Repeated rest visits cannot grant duplicate points. Numeric balance remains provisional until the feature backlog is ready for tuning.

The selected ability keeps its name visible through recharge, with separate ready/active/countdown feedback and a charge ring. Its larger, brighter lower-right control stays usable for hold-to-pause while recharging. Flight still has exactly two controls.

## Afterglow and learning

Successful flights can bank spare Glow above 60 as **Afterglow**. The starting bank holds 40, storage retains 80% of transferred Glow, and one briefing draw restores up to 20 Glow before a flight. Transferred fuel is deducted once; a full bank leaves excess fuel in Glow. Holding the bank saves it for another route or expedition. Failed or abandoned expeditions lose 25% of their bank. Permanent Vessel, Retention and Anchor upgrades improve capacity, storage efficiency and failure protection. Checkpoints show the balance and optional rule details; flight controls stay unchanged.

New players receive a short three-stop tutorial with two teaching flights and a support checkpoint. Contextual hints introduce Lift, gliding, Glow collection, the companion and its selected ability. A clearly labelled Tutorial button is always available at home and through MENU. Starting practice safely suspends the current ascension; returning restores its checkpoint, resources and entry build without a life charge. A saved practice session also retains that suspended ascension across reloads. Practice reserve and earnings do not affect the real profile, and practice can be left or replayed.

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
- `dist/companion-abilities.mjs`: shared Swift, Anchor and Scout definitions for flight, controls, tutorials and loadout selection.
- `dist/companion-art.mjs`: shared original pixel silhouettes and matching menu SVG artwork for the three neutral companions.
- `dist/game-menu.mjs`, `game-menu.css`: top gear and paused game wheel; tuning, companions, upgrades and Tutorial stay in game overlays.
- `dist/level-length.mjs`: shared length multiplier, duration bounds, reward scale and compact time formatting.
- `dist/model.mjs`: branching routes, card builds, saves, companion appearance and permanent progression.
- `dist/app.mjs`, `style.css`, `game.css`: mobile game UI, pixel map glyphs and card icons.

The renderer draws at 260px, raised modestly from 195px, and uses nearest-neighbor scaling. Finer original sprites preserve the large player's silhouette, companion light footprint and world-space range circles. Its cache is bounded; it never changes game state. The active game loads no PixiJS, Three.js, photographic terrain maps or painted phoenix sprites. Earlier rendering prototypes and diagnostic pages remain in the source for reference, but the production entry point does not import them.

Power drafts distinguish automatic expedition-long powers from light packets. Cards show a trigger, benefit and exact tradeoff; equipped powers can be tapped at checkpoints for optional details. Inspection never equips or replaces a card. In flight, light packets explicitly show restored Glow or FULL; energy and Boost effects name the resource they change. Flight still has only Lift and the selected companion ability.

Earlier tests cover engine and campaign rules; their easy-flight success targets predate the difficulty changes. Historical focused simulations compare the previous build and sparse placement with matched reserves and bounded local controllers; they do not represent current wind tuning or human success rates. Per the latest user instruction, further simulations, broad testing and balance fine-tuning are deferred until the feature backlog is addressed.

Development policy: the user has started live feedback. Publish completed feedback batches after source checks, preserving the existing Site and audience; avoid deploying each minor source edit. Simulations and broad playtesting remain deferred.

The game requires no account, analytics, payment or cloud-save service. The existing private hosted Site may require the owner's ChatGPT sign-in. Progress is local to the browser; clearing browser data removes it.
