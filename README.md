# Wispbound

A one-handed, portrait-browser flight roguelite, formerly Emberwing. The branching seven-stop expedition and three-card builds remain intact. The active game uses original pixel scenery and neutral light wisps, with a grim, muted atmosphere inspired by Salt and Sanctuary. No reference-game art is copied.

The player is a neutral light wisp. **Swift** provides Boost, **Anchor** provides a level glide, and **Gravity** passively attracts nearby beneficial light packets throughout flight. Switch companions at a rest checkpoint, with that choice remaining editable through preparation for the next flight. Each flight and its retries keep their entry companion. Companions have distinct role colours: amber Swift, cyan Anchor and violet Gravity. Old Scout/Reveal selections migrate to Gravity without losing progress.

## Controls and collection

- **Lift:** large lower-right button, or Space / Up. A pulse costs 6 Glow in a refuge, 8 in a cavern, or 7 in a gauntlet. Glide between pulses. A successful press immediately flares and stretches the wisp; there are no slow wing animations.
- **Companion tool:** Swift's BOOST and Anchor's LEVEL use the second right-side button, or B / Shift. Hold an active button for half a second to pause, including during recharge. Gravity needs no activation: its place in the dock is a noninteractive GRAVITY / PASSIVE indicator. Use MENU or Escape to pause. Backgrounding/rotation also pauses. No companion protects against ordinary terrain or screen edges.
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

Companion tools have separate tactical uses. Upgrades affect active duration/recharge or the passive Gravity field and collector recovery:

| Companion | Action | Base duration / recharge | Use |
| --- | --- | --- | --- |
| Swift | BOOST | 0.9s / 9s | Travel 48% faster and resist local drafts. |
| Anchor | LEVEL | 1.8s / 11s | Arrest vertical drift and cancel gravity briefly; local drafts still nudge. Pressing Lift cancels the hold immediately. |
| Gravity | GRAVITY | Passive / no recharge | Always attract nearby beneficial light packets during flight. Direct contact or carrier delivery still collects them. |

The base sight radius remains 175, with Inner Glow retaining its permanent sight upgrades. The active Reveal ability has been replaced by Gravity. Hungry Wisp, Golden Wake, recharge powers and Shatter Wake respond to any selected active ability, preserving build choices across companions.

Companions have distinct original pixel bodies and role colours across flight, Home, rest and briefings. Swift is an amber winged crescent, Anchor a cyan squat bell, and Gravity a violet spiral. The optional shared tint selector has been removed so the three remain visually distinct. The main wisp stays circular and white.

Gravity starts with a 120-unit field, expanded by existing collection-reach modifiers up to a 220-unit cap. Its requested stronger baseline raises the force constant from 18,000 to 27,000 and near-field acceleration cap from 24 to 36; the movement-speed limit rises from 18 to 24. The field works continuously while flying. Acceleration follows `G × pull strength / distance²`, softened below 24 units and capped near the centre. Doubling distance quarters acceleration outside that softened/capped region. Drag and the low speed limit keep movement restrained. Gravity grants no rewards, makes no reservations, ignores dark or already-owned packets, and cannot pull them through terrain. Contact and delivery keep their existing one-time reward rules.

Collector tuning adds 12% reach and 8% Gravity pull per point. For Gravity, the Ability axis becomes **Recovery**, adding 5% field strength and shortening collector rest by 4% per point. Quickening improves its collector recovery and Lasting Bond strengthens its field; active companions retain their duration/recharge effects. **Gravitic Bond** remains a three-rank permanent upgrade, strengthening Gravity pull by 15% per rank. Combined pull remains bounded. These are feature values, with checks, tests and balance evaluation deferred.

Gravity also preserves companion-power synergies automatically: Hungry Wisp expands fetching, Golden Wake doubles pickup score, and Shatter Wake affects only designated soft thorns. Kindled Spirit and Draft Feeder shorten collector recovery instead of an absent active-tool cooldown. Gravity routes replace activation-count objectives with the same count of collected light packets. No tap or fabricated activation is required.

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

The route map labels six stop categories explicitly: Flight, Elite, Rest, Shrine, Event and Finale. Location art remains on flight nodes; support nodes use distinct symbols and their real names. START/YOU markers and brighter reachable paths make upward travel clear. The header counts the next stop out of seven, including support stops, rather than presenting the next flight number as if a rest were another flight. MAP KEY opens the optional legend.

Normal expeditions contain six event scenarios: Ash Spring, Cinder Bargain, Abandoned Lantern, Weathered Shrine, Luminous Well and The Ember Archive. They offer fuel, saved embers, powers or stored-fuel tradeoffs. Rest camps and power shrines are separate support categories. MAP KEY lists the six event variants on demand; this presentation pass does not add scenarios or change their rewards.

The climb now tightens hard passage gaps by 0 / 3 / 6 / 9 / 12 percent across its five stages, after the original gap bounds, retaining ordinary/elite minimums of 120/104 units. Requested challenge windows rise from one early to two mid-climb and three late where space permits. Intro and recovery passages, movement and fuel placement budgets remain unchanged. Map, briefing and flight labels expose the current stage; these defaults await the deferred balance pass.

Foreground materials and nearby landmarks carry the location identity without making distant scenery brighter. Map nodes show distinct original landmark art and location names. Briefings preview the signature challenge so route and tuning choices have context. The new geometry is an authored feature pass; reachability and numerical difficulty have not received a new simulation sweep.

Foreground obstacles now include scene-specific vegetation and structures as well as terrain. Canopy passages contain trees, roots and branches; ruins include overgrown cottages and broken walls; exposed peaks use wind-shaped pines and shelters, while caves use old mine timbers. Roof-mounted structures are roots, branches or supported beams, rather than upside-down buildings. Opaque trunks, crowns, roofs and walls use actual collision polygons shared by player collisions and Gravity's terrain blocking.

These vignettes replace selected occupied landform areas and remain rooted in their supporting banks. Protected fuel pockets, soft thorns, opening/exit approaches and the authored central passage are retained. Background settlement and vegetation layers remain subdued and non-colliding. A few muted leaf or seed silhouettes add motion without looking like collectible light packets; reduced motion suppresses that drift. New props use the existing wisp-lit darkness pass rather than adding bright distant scenery.

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
| Collector | 12% larger fetch/Gravity radius; Gravity also gains 8% pull strength |
| Ability / Recovery | Active tools: 5% longer effect and 4% shorter recharge. Gravity: 5% stronger pull and 4% shorter collector rest. |

Flight tuning is accessed through the top MENU wheel rather than controls embedded in the map, rest or briefing page. A badge on the gear highlights unspent points when editing is available. The tuning panel shows combined effects with equipped powers and permanent upgrades. Modifiers retain explicit bounds; the Lift bonus changes impulse by a square-root factor to match the stated rise-distance bonus. Tuning points are an ascension build budget, not a new collectible currency. Repeated rest visits cannot grant duplicate points. Numeric balance remains provisional until the feature backlog is ready for tuning.

Active tools keep their name visible through recharge, with separate ready/active/countdown feedback and a charge ring. Their lower-right control stays usable for hold-to-pause while recharging. Gravity instead shows an always-on passive indicator. There are at most two flight actions, with MENU available for pausing.

## Afterglow and learning

Successful flights can bank spare Glow above 60 as **Afterglow**, shown as **Stored Glow** in the main interface. The starting bank holds 40, storage retains 80% of transferred Glow, and one briefing draw restores up to 20 Glow before a flight. Transferred fuel is deducted once; a full bank leaves excess fuel in Glow. Holding the bank saves it for another route or expedition. Failed or abandoned expeditions lose 25% of their bank. Permanent Vessel, Retention and Anchor upgrades improve capacity, storage efficiency and failure protection.

Empty reserves no longer create panels around the game. A Stored Glow control appears only before departure when a draw is actually available. Positive balances can be inspected through MENU; newly stored Glow gets one nonzero clear cue, and an actual reserve loss appears in the end recap. Capacity and retention rules remain in optional details. A vessel icon and explicit Glow/Ember/Power labels replace ambiguous moon-only rewards. No reserve calculations or resource rules change.

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
- `dist/companion-abilities.mjs`: shared Swift, Anchor and Gravity definitions and legacy Scout migration.
- `dist/gravity.mjs`: bounded inverse-square packet attraction, damping and terrain-aware movement.
- `dist/companion-art.mjs`: shared original pixel silhouettes and matching menu SVG artwork for the three neutral companions.
- `dist/game-menu.mjs`, `game-menu.css`: top gear and paused game wheel; tuning, companions, upgrades and Tutorial stay in game overlays.
- `dist/map-guide.mjs`, `map-clarity.css`: shared stop/event metadata, recognisable support symbols and the optional map legend.
- `dist/afterglow-ui.mjs`, `afterglow-ui.css`: contextual Stored Glow controls and nonzero feedback without empty reserve panels.
- `dist/scene-props.mjs`, `scene-prop-art.mjs`: scene-specific solid vegetation/structures and their matching original pixel materials.
- `dist/level-length.mjs`: shared length multiplier, duration bounds, reward scale and compact time formatting.
- `dist/model.mjs`: branching routes, card builds, saves, companion appearance and permanent progression.
- `dist/app.mjs`, `style.css`, `game.css`: mobile game UI, pixel map glyphs and card icons.

The renderer draws at 260px, raised modestly from 195px, and uses nearest-neighbor scaling. Finer original sprites preserve the large player's silhouette, companion light footprint and world-space range circles. Its cache is bounded; it never changes game state. The active game loads no PixiJS, Three.js, photographic terrain maps or painted phoenix sprites. Earlier rendering prototypes and diagnostic pages remain in the source for reference, but the production entry point does not import them.

Power drafts distinguish automatic expedition-long powers from light packets. Cards show a trigger, benefit and exact tradeoff; equipped powers can be tapped at checkpoints for optional details. Inspection never equips or replaces a card. In flight, light packets explicitly show restored Glow or FULL; energy and Boost effects name the resource they change. Flight has at most two actions; Gravity works automatically.

Earlier tests cover engine and campaign rules; their easy-flight success targets predate the difficulty changes. Historical focused simulations compare the previous build and sparse placement with matched reserves and bounded local controllers; they do not represent current wind tuning or human success rates. Per the latest user instruction, further simulations, broad testing and balance fine-tuning are deferred until the feature backlog is addressed.

Development policy: the user has started live feedback. Publish completed feedback batches, preserving the existing Site and audience; avoid deploying each minor source edit. The latest user instruction defers all checks, tests, simulations and balance work until the backlog is clear.

The game requires no account, analytics, payment or cloud-save service. The existing private hosted Site may require the owner's ChatGPT sign-in. Progress is local to the browser; clearing browser data removes it.


### Guided practice

TUTORIAL starts short authored practice with spotlights on the real map, encounter key, controls, reward slots, rest choices, MENU wheel, tuning and companion selectors. Flight freezes while an item or control is explained, then continues after the player dismisses the prompt. The field lessons point at actual packets, carrier, draft and refuge objects; dark packets dim sight. This batch intentionally has no checks, tests, simulations or balance pass. Save migrations and compatibility work are outside the current prototype scope.


### Campaign structure and delayed reserve unlock

One difficulty tier contains three sequential seven-stop maps, sharing the ascension's lives, build, fuel and tuning. The first two map clears open the next map. The third ends in the Hollow Warden flight trial and unlocks the next difficulty. Higher tiers apply bounded passage/draft pressure independently of the five-flight depth within a map.

Afterglow is unavailable before the first boss defeat: no reserve balance, surplus deductions, reserve events, reserve upgrade branch or opening tutorial lesson. That boss grants the permanent unlock and a one-time 20 Stored Glow reward; a contextual unlock lesson introduces its use. The prototype save key changes for this campaign revision instead of migrating old campaigns. No checks, tests, simulations or balance pass are included.


### Stronger localized drafts

Draft pockets now apply base force 260/340/430 in ruins/canopy/storm (cap560), with a broader full-strength core and smooth edge feather. They warn for1.05s, act for1.45s, ramp over0.14s and fade over0.35s. Practice force is90. Existing placement, count, bypass space, one-shot behavior and Swift resistance remain. Directional rendering follows actual vertical force. This requested adjustment was implemented without checks, tests, simulations or a balance pass.


### Collector-first companion roles

Companions are the same plain round pixel light, with role colours: Collector green, Swift amber, Anchor cyan, Gravity violet. Collector is the default and the only companion that fetches missed packets and delivers cargo. Swift boosts, Anchor holds height and Gravity pulls packets; these roles require direct body pickup and never fetch.

Future unlock thresholds are Ascension 2/3/4 for Swift/Anchor/Gravity. The current explicit testing override leaves those buttons selectable while their lock and ascension requirement remain visible. Collector reach/recovery indicators are hidden for other roles; Gravity displays pull information instead. Basic tutorial text follows the equipped role. No checks, tests, simulations or balance work were run for this batch.


### Seven pickup kinds

Light Motes and Glow Caches supply fuel; Ember Clusters supply clear-reward currency; Charge Sparks restore companion charge; Sight Blooms temporarily extend sight; Dusk Pearls trade sight for fuel; Dark Seeds dim sight. Art, size and movement distinguish their purposes, and contact windows reflect their size. Optional niche variety preserves the fuel route and overall pickup count.

MENU → PICKUP KEY shows all effects. New types get one short visible-world spotlight, with flight paused until Continue; Skip disables those tips. Risky pickups stay body-only. Utility pickups do not feed fuel counters or fuel-triggered card loops. No tests, checks, simulations or balance pass were included.
