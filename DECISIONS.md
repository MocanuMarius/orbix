# Wispbound design decisions

Updated 12 November 2026. Wispbound is the working title. This log records the confirmed direction for the next major iteration. All ten recommended alignment choices were accepted in chat.

## Confirmed direction

- Simplify the graphics and theme while keeping the branching expedition map and three active card slots.
- Use original pixel sprites and scenery with the bleak, weathered mood of Salt and Sanctuary: stone, roots, mist, subdued earth colours and small elemental lights.
- Play as a wisp. Other carrier wisps assist it. Fire and ice are visual identities for now; distinct abilities and terrain interactions are deferred.
- Keep one-handed portrait play with two right-side controls: Lift and Boost. Companions and card effects act automatically.
- Direct contact always collects map sparks; the carrier is assistance. Its base cooldown is 5.5 seconds after delivery, before recovery upgrades.
- Give the player wisp an upgradeable light radius that reveals more terrain and pickups.
- Keep the game interface compact. Graphics, icons, numbers and card effects carry the information; remove repeated instructions and narrative paragraphs.
- Keep Glow as fuel for lift pulses, with sparks restoring it. Gliding remains free. Collision hearts are separate.
- Skip broad test passes. The subsequent difficulty request explicitly asks for focused balance simulations; use those to check fuel budgets and collection pressure before the next integrated play session.

## Ten confirmed decisions

All ten recommended options are confirmed. The element and carrier pair is selected before a run and remains fixed for that run.

| # | Decision | Current build | Rationale | Status |
| --- | --- | --- | --- | --- |
| 1 | Fire and ice identity | Appearance changes; controls and statistics remain the same. | Keep another balance system out of this graphics pivot. | Confirmed |
| 2 | Element and carrier selection | Choose Fire or Ice before an expedition; the carrier has the opposite element. The pair stays fixed for that expedition. | Clear identities without another inventory. | Confirmed |
| 3 | Visibility beyond the light | Distant terrain remains a dim silhouette. Nearby detail becomes clearer inside the light. | Darkness matters while hazards retain warning time. | Confirmed |
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
- The active renderer uses a 195-pixel Canvas scene and nearest-neighbour scaling. The game no longer loads the previous 3D renderer or photographic assets.
- Existing saves keep the same storage key. Display names can change without changing saved card identifiers.
- The pixel graphics and compact UI iteration is deployed. The next difficulty iteration adds sparse terrain-attached caches and focused balance simulations at the user's request.

## Precision and fuel difficulty

- Remove the free approach spark and centreline pickup strings. Keep one pickup per authored terrain pocket, with roughly 38% fewer placements than the prior generator budget.
- Carve pockets into the actual collidable terrain. Keep a gentler first shelf, and share an edge across close cache pairs to avoid abrupt roof-to-floor reversals.
- Start expeditions at 60 Glow. Normal caches restore 24 plus the route bonus; rich caches restore 40 plus the route bonus. Successful checkpoints restore a minimum of 60, preserving any higher earned reserve.
- Preserve gravity, lift strength, travel speed, the 5.5-second carrier rest and free protected Boost. Increase difficulty through placement, precision and resource availability instead of faster tapping.
- Reduce Warm Heart's trigger to four base pickups and collection challenge targets to match the sparse pool.
- Simulations compare centre-lane, pickup-seeking and Boost-assisted controllers, including zero permanent upgrades. They guide tuning; they do not establish human success rates or prove that every seed requires every tool.

## Deferred elemental gameplay

Explore distinct roles for the player wisp and mini carrier wisps in a later iteration, including interactions with terrain. No specific elemental abilities, terrain effects or balance values are chosen yet. Keep Fire and Ice visual-only in the current scope.

## Rendering direction proposed after the first review

Use pre-rendered or cached 2D art for scenery, props and character animation, with dynamic light from the player and carrier wisps. Keep the pixel grid and the gameplay light-radius upgrades.

Bake material colour, surface detail and restrained ambient shading into the art. Supply normal and specular or roughness maps for terrain that needs moving, surface-responsive highlights. Use simple silhouette occluders where dynamic shadows materially improve depth. Keep strong directional highlights and shadows out of the base artwork so they do not contradict moving wisp lights.

The current build already caches terrain artwork. Its current dynamic lighting uses a low-resolution reveal mask and glow. Normal-map relighting is a proposed next rendering upgrade, not a feature already deployed. No gameplay mechanics change with this proposal.
