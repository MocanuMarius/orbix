# Wispbound design decisions

Updated 13 November 2026. Wispbound is the working title. This log records the confirmed direction and subsequent implementation choices. All ten recommended alignment choices were accepted in chat.

## Confirmed direction

- Simplify the graphics and theme while keeping the branching expedition map and three active card slots.
- Use original pixel sprites and scenery with the bleak, weathered mood of Salt and Sanctuary: stone, roots, mist, subdued earth colours and small elemental lights.
- Play as a wisp. Other carrier wisps assist it. Fire and ice are visual identities for now; distinct abilities and terrain interactions are deferred.
- Keep one-handed portrait play with two right-side controls: Lift and Boost. Companions and card effects act automatically.
- Direct contact always collects map sparks; the carrier is assistance. Its base cooldown is 5.5 seconds after delivery, before recovery upgrades.
- Give the player wisp an upgradeable light radius that reveals more terrain and pickups.
- Keep the game interface compact. Graphics, icons, numbers and card effects carry the information; remove repeated instructions and narrative paragraphs.
- Keep Glow as fuel for lift pulses, with sparks restoring it. Gliding remains free. Collision hearts are separate.
- Prioritise the feature backlog. Defer further simulations, broad testing and balance fine-tuning until the larger backlog is addressed, as explicitly requested in the latest feedback. Earlier focused simulations remain historical evidence.

## Ten confirmed decisions

All ten recommended options are confirmed. The element and carrier pair is selected before a run and remains fixed for that run.

| # | Decision | Current build | Rationale | Status |
| --- | --- | --- | --- | --- |
| 1 | Fire and ice identity | Appearance changes; controls and statistics remain the same. | Keep another balance system out of this graphics pivot. | Confirmed |
| 2 | Element and carrier selection | Choose Fire or Ice before an expedition; the carrier has the opposite element. The pair stays fixed for that expedition. | Clear identities without another inventory. | Confirmed |
| 3 | Visibility beyond the light | Distant landscape is nearly black with very faint silhouettes. Nearby detail becomes clearer inside the light. | Make the upgradeable light radius more meaningful. | Confirmed; darkened further by latest feedback |
| 4 | Light versus fuel | Spending Glow dims the player sprite; the reveal radius remains fixed by upgrades. | Avoid combining low fuel with sudden blindness. | Confirmed |
| 5 | Light progression | Inner Glow is a permanent utility skill with three ranks: radius 175, 210, 245 and 280. | Give light an explicit progression path independent of collection range. | Confirmed |
| 6 | Carrier recovery | Base rest is 5.5 seconds after delivery. Recovery upgrades can shorten it. | Leave meaningful windows for direct collection. | Confirmed |
| 7 | Carrier target selection | Fetch the nearest available spark within its range. | Predictable, automatic assistance. | Confirmed |
| 8 | Expedition length | Seven stops, targeting roughly four to six minutes including map and reward choices. | Enough decisions to develop a three-card build in a mobile session. | Confirmed |
| 9 | Main difficulty | Deliberate lift timing to collect scarce fuel inside rock passages, supported by Boost, the carrier and route/build choices. Direct pickup radius is 16. | Precision and fuel planning should both matter. | Confirmed; updated by difficulty feedback |
| 10 | Permanent progression | Mostly utility and modest bonuses: light, carrier reach/recovery, Boost and one rebirth. | Support progress without making grinding the main way to win. | Confirmed |

## Kept intact

Three terrains, ordinary and optional elite routes, support events, shared expedition health, automatic card synergies, checkpoint rewards, safe protected Boost exits and browser-local progress remain in the design. The map and three-card build system were explicitly retained.

## Current implementation notes

- Fire and Ice are visual choices at present; no distinct elemental combat or terrain abilities have been added.
- Carrier search range and player light radius are separate statistics.
- The active renderer now uses a 260-pixel Canvas scene, raised modestly from 195, with nearest-neighbour scaling and finer original sprites. The game no longer loads the previous 3D renderer or photographic assets.
- Existing saves keep the same storage key. Display names can change without changing saved card identifiers.
- The pixel graphics and compact UI iteration is deployed. The next difficulty iteration adds sparse terrain-attached caches and focused balance simulations at the user's request.

## Precision and fuel difficulty

- Remove the free approach spark and centreline pickup strings. Keep one pickup per authored terrain pocket, with roughly 38% fewer placements than the prior generator budget.
- Carve pockets into the actual collidable terrain. Keep a gentler first shelf, and share an edge across close cache pairs to avoid abrupt roof-to-floor reversals.
- Start expeditions at 60 Glow. Normal caches restore 24 plus the route bonus; rich caches restore 40 plus the route bonus. Successful checkpoints restore a minimum of 60, preserving any higher earned reserve.
- Preserve gravity, lift strength, travel speed, the 5.5-second carrier rest and free protected Boost. Increase difficulty through placement, precision and resource availability instead of faster tapping.
- Reduce Warm Heart's trigger to four base pickups and collection challenge targets to match the sparse pool.
- Simulations compare centre-lane, pickup-seeking and Boost-assisted controllers, including zero permanent upgrades. They guide tuning; they do not establish human success rates or prove that every seed requires every tool.

## Wisp silhouette and companion motion

- Double the main wisp sprite dimensions and remove its directional tail and continuous particle trail. Keep local pickup and hit bursts. The gameplay collision radius stays unchanged.
- The carrier orbits the player on a 44 by 34 unit ellipse over 2.5 seconds while ready or cooling, clearing the larger player sprite. Fetching interrupts the orbit; returning rejoins it. Reduced Motion freezes the orbital phase.
- Centre the carrier's real search range on the player and draw that range as a persistent dotted circle. Range upgrades and temporary expansions use the same value as collection logic. Dim the circle and companion through cooldown.
- Darken the landscape outside the light substantially and subdue the distant parallax layers. Keep the existing player light-radius upgrades.

## Stronger wind challenge

- Make wind a major steering challenge: base peak acceleration is 160 in ruins, 240 in canopy and 420 in storm, replacing the previous storm-only 54.
- Alternate seeded updrafts and downdrafts. Give 1.4 seconds of visible directional warning, smooth half-second ramps and sustained pulses. The first cache has a calm approach before the first gust.
- Reduce cave exposure by 35%; increase it on elite/finale routes and by 2% per later map row. Cap peak force at 520. Preserve the existing base lift, gravity, fuel budget and two-button controls.
- Let Boost suppress 72% of gust force, fading through its 0.45-second protected exit. Steady Flame retains 55% wind resistance, giving exposed-route builds a clear purpose.
- Draw vertical wind streaks and directional chevrons above fog, restricted to the existing light. Keep the far landscape dark. Add only a compact wind icon and pips to the encounter preview.

## Clear powers and finer pixel detail

- Keep pixel art, but raise the scene width from 195 to 260 logical pixels. Use finer original player, companion and cache details while preserving the large wisp and world-space light/collection radii.
- Call the draft choices powers. Explain their trigger, benefit and tradeoff in short lines, and state that they act automatically for the expedition.
- Make equipped powers tappable for optional checkpoint inspection, with one Close action. Inspection never selects or replaces a power and adds no flight controls.
- Give fuel a consistent warm-gold identity for both elements. Label pickup feedback with the actual Glow restored, or FULL; distinguish healing and Boost reductions explicitly.
- Finish feature chunks and publish them promptly. Defer additional simulation and balance passes until the backlog is addressed.

## Afterglow carryover

- Add an Afterglow reserve shared across flights and preserved between expeditions. A live expedition owns its reserve until it ends; settling it updates the saved bank once.
- After successful flights, unused Glow above 60 can be stored at 80% efficiency, up to a base bank capacity of 40. The transferred Glow is removed from flight fuel; energy is not counted twice. At a full bank, the untransferred Glow remains available normally.
- At a flight briefing, choose whether to draw up to 20 Afterglow into Glow. Allow one draw per flight, including when backing out to choose another route. Other checkpoints display the bank without spending it.
- Failed or abandoned normal expeditions lose 25% of the reserve. Successful expeditions preserve it. The bank cannot go negative.
- Add permanent upgrades for capacity (+15 per rank, three ranks), retention (+10 percentage points per rank, two ranks) and failure-loss protection (−10 percentage points per rank, two ranks).
- Make stored amounts, capacity, efficiency and loss visible through compact checkpoint feedback and optional details. Keep Lift and Boost as the only flight controls.

## Progressive learning

- Add a short three-stop teaching expedition: a 22-second flight, a support checkpoint, and a 26-second wind flight. Introduce Lift, gliding, Glow, the companion and Boost in context.
- Use practice Glow and a 20-point practice Afterglow bank; teaching runs cannot farm real embers, scores, reserve or flight-clear progress. A power learned in a completed tutorial remains available. Offer replay and skip without replacing an active normal expedition.
- Start new players with four straightforward powers. Introduce companion powers after two normal flight clears, wind powers after four, reward powers after six, and higher-risk powers after eight. Preserve powers and offers in existing experienced saves.
- Show one short contextual lesson at a time. Start the first lesson when Lift is pressed, avoiding damage while reading the first hint. Keep practice terrain forgiving and normal flight tuning unchanged.
- Build these systems now; defer simulation sweeps and balance fine-tuning until the feature backlog is addressed.

## Deferred elemental gameplay

Explore distinct roles for the player wisp and mini carrier wisps in a later iteration, including interactions with terrain. No specific elemental abilities, terrain effects or balance values are chosen yet. Keep Fire and Ice visual-only in the current scope.

## Rendering direction proposed after the first review

Use pre-rendered or cached 2D art for scenery, props and character animation, with dynamic light from the player and carrier wisps. Keep the pixel grid and the gameplay light-radius upgrades.

Bake material colour, surface detail and restrained ambient shading into the art. Supply normal and specular or roughness maps for terrain that needs moving, surface-responsive highlights. Use simple silhouette occluders where dynamic shadows materially improve depth. Keep strong directional highlights and shadows out of the base artwork so they do not contradict moving wisp lights.

The current build already caches terrain artwork. Its current dynamic lighting uses a low-resolution reveal mask and glow. Normal-map relighting is a proposed next rendering upgrade, not a feature already deployed. No gameplay mechanics change with this proposal.
