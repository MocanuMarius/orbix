# Wispbound design decisions

Updated 12 November 2026. Wispbound is the working title. This log records the current build and the choices to review before the next major iteration.

## Confirmed direction

- Simplify the graphics and theme while keeping the branching expedition map and three active card slots.
- Use original pixel sprites and scenery with the bleak, weathered mood of Salt and Sanctuary: stone, roots, mist, subdued earth colours and small elemental lights.
- Play as a wisp. Other carrier wisps assist it. Fire and ice are the first visual forms.
- Keep one-handed portrait play with two right-side controls: Lift and Boost. Companions and card effects act automatically.
- Direct contact always collects map sparks; the carrier is assistance. Its unupgraded cooldown should be about five to six seconds.
- Give the player wisp an upgradeable light radius that reveals more terrain and pickups.
- Keep the game interface compact. Graphics, icons, numbers and card effects carry the information; remove repeated instructions and narrative paragraphs.
- Keep Glow as fuel for lift pulses, with sparks restoring it. Gliding remains free. Collision hearts are separate.
- Skip additional test passes during this iteration. Evaluate larger, integrated chunks through play.

## Ten decisions for alignment

These are current implementation defaults, not additional user approvals. Each awaits your answer to the matching numbered question.

| # | Decision | Current build | Reason for this default | Review status |
| --- | --- | --- | --- | --- |
| 1 | Fire and ice identity | Appearance changes; controls and statistics remain the same. | Keep another balance system out of this graphics pivot. | Awaiting answer |
| 2 | Element and carrier selection | Choose Fire or Ice before an expedition; the carrier has the opposite element. The pair stays fixed for that expedition. | Clear identities without another inventory. | Awaiting answer |
| 3 | Visibility beyond the light | Distant terrain remains a dim silhouette. Nearby detail becomes clearer inside the light. | Darkness matters while hazards retain warning time. | Awaiting answer |
| 4 | Light versus fuel | Spending Glow dims the player sprite; the reveal radius remains fixed by upgrades. | Avoid combining low fuel with sudden blindness. | Awaiting answer |
| 5 | Light progression | Inner Glow is a permanent utility skill with three ranks: radius 175, 210, 245 and 280. | Give light an explicit progression path independent of collection range. | Awaiting answer |
| 6 | Carrier recovery | Base rest is 5.5 seconds after delivery. Recovery upgrades can shorten it. | Leave meaningful windows for direct collection. | Awaiting answer |
| 7 | Carrier target selection | Fetch the nearest available spark within its range. | Predictable, automatic assistance. | Awaiting answer |
| 8 | Expedition length | Seven stops, targeting roughly four to six minutes including map and reward choices. | Enough decisions to develop a three-card build in a mobile session. | Awaiting answer |
| 9 | Main difficulty | Fuel conservation, collection timing and route/build choices, with forgiving direct pickups. | Preserve strategy alongside movement skill. | Awaiting answer |
| 10 | Permanent progression | Mostly utility and modest bonuses: light, carrier reach/recovery, Boost and one rebirth. | Support progress without making grinding the main way to win. | Awaiting answer |

## Kept intact

Three terrains, ordinary and optional elite routes, support events, shared expedition health, automatic card synergies, checkpoint rewards, safe protected Boost exits and browser-local progress remain in the design. The map and three-card build system were explicitly retained.

## Current implementation notes

- Fire and Ice are visual choices at present; no distinct elemental combat or terrain abilities have been added.
- Carrier search range and player light radius are separate statistics.
- The active renderer uses a 195-pixel Canvas scene and nearest-neighbour scaling. The game no longer loads the previous 3D renderer or photographic assets.
- Existing saves keep the same storage key. Display names can change without changing saved card identifiers.
- UI and art are being delivered as one larger iteration. Answers to the ten questions will update this log and guide the next build.
