# Event decision audit

The twelve encounter families each offered at least two actionable choices across 192 combinations of resources and route position. The check resolved each choice through the shipped model. Two displayed options alone would not qualify. Each had to change usable fuel, attempts, a future flight, paid skills or currency that the player could still spend. The Prism can land on the same reward as its guaranteed option, so its distinct outcomes were checked separately.

## Conditions checked

- The route fixtures came from ordinary seeded campaigns with legal paths. Each family was sampled once on Map 1 and once on a Map 3 route beyond its last reachable Rest. Each fixture was tested with full hearts or one missing heart, at 3, 15, 27 and 30 Energy out of 30.
- The ordinary campaign recovers at least half of maximum Energy after a cleared flight. In 400 seeds across three maps, all immediate predecessors of an event were flights. Of 2,605 incoming edges, 2,402 came from ordinary passages and 203 from elites. Fifteen Energy is therefore the baseline post-clear floor for a starting-capacity player. Three Energy stress-tests low-resource handling.
- Every option was previewed again after saving and loading. Choice resolution, an immediate second tap, and repeated checkpoint settlement were checked for extra payouts and other state changes.
- Ten focused tests and eleven existing treasure and route-bonus tests passed together. Run `node --test tests/event-decisions.test.mjs tests/route-bonuses.test.mjs tests/treasure.test.mjs` from the repository root. The production pickup and route-commitment probe also passed with `node scripts/contextual-events-probe.mjs`.

## What the player can trade

| Site | Decision and relevant condition |
|---|---|
| Ash Spring | Refill a depleted meter or save a Reserve Wick for the next attempt. Near full Energy, two free Lifts replace the refill. |
| Cinder Bargain | Spend 6 Energy for 18 Packed Sparks, or retain fuel for the passage. The sale requires at least 9 Energy and a future training opportunity. |
| Pilgrim’s Vow | Earn 8 Packed Sparks by clearing the next attempt with four body pickups, or take fuel or a Wick. Beyond the last Rest, the oath becomes two free Lifts. |
| Weathered Shrine | Shorten the equipped companion’s cooldown or waive the first two paid Lifts. |
| Surveyor’s Cairn | Mark one linked passage for gentler drafts or 35 extra pixels of Luminance, or leave the route open and take fuel or a Wick. A fall releases the other exit where a fork exists. |
| Sparks Archive | Save 16 Packed Sparks for training or restore a missing heart. At full hearts the alternative is a Wick. Beyond training range the ledger grants sight. |
| Prism Dice | Guarantee 10 Packed Sparks or roll once. Faces 1–2 grant a Wick, 3–4 a Feather, 5–6 pay 22 Packed Sparks. Past the last Rest the sure choice is a Wick and faces 5–6 grant sight. |
| Lost Lanterns | Refill or see farther during the next attempt. A near-full meter changes the refill to a Wick. |
| Wisp Bargain | Gain 20 Packed Sparks but spend one extra Energy on each of the next six paid Lifts, or take the Feather. Beyond the last Rest the purse becomes faster companion recovery. |
| Quiet Sanctuary | Relight a missing heart, or improve companion recovery. At full hearts the alternatives are immediate fuel or a Feather according to Energy. |
| Lantern Workshop | Recover the actual price of a paid branch by surrendering its ranks, or keep the build and save two Lifts. With no refundable branch or future Rest, take extra sight or the Feather. |
| Companion Shrine | Shorten the equipped companion’s cooldown or save 12 Packed Sparks for training. Without a future Rest, compare cooldown against sight. |

## Settlement and movement

The model kept both the preparation and the Pilgrim’s promise when a player left an unopened briefing. Once an attempt started, suspending it spent the preparation or oath. A real two-exit Cairn restored its other exit after a fall. The normal loss of a heart was the sole failure charge. A paid workshop branch refunded once and left unrelated ranks and the starting gift intact.

The flight engine restored 9 Energy once below the Wick’s 6-Energy threshold. The Feather covered two paid Lifts. The Seal added one Energy to six paid Lifts and then returned to the ordinary cost. The Chart multiplied base Luminance by 1.35, and the Chime cut the Runner’s measured cooldown by 20%. Refills from an event never packed overflow. Genuine Spark overflow still used the normal conversion preview and retained fractional credit.

## Replayability and human play

For seeds `events0` through `events399`, both generators dealt 2,400 event locations across the same 1,200 maps. The original generator dealt a Cairn or Vow first regardless of route shape. The new deal places a Cairn only where two flights are available on every legal arrival. Elsewhere it draws from Pilgrim’s Vow, Weathered Shrine, Lost Lanterns, Quiet Sanctuary and Companion Shrine. The second site draws another family from the same seeded deck. Map geometry, biome selection and flight seeds are preserved.

| Across the same 400 campaigns | Original deal | New deal |
|---|---:|---:|
| Surveyor’s Cairns | 607 | 397 |
| Cairns offering two flight exits | 104 (17.1%) | 397 (100%) |
| Pilgrim’s Vows | 609 | 218 |
| Combined share of events occupied by Cairn and Vow | 50.7% | 25.6% |
| Distinct event families dealt | 12 | 12 |

Every one of the 397 two-exit event locations in the sample received a Cairn. The new deal placed 127 on Map 1, 143 on Map 2 and 127 on Map 3. Across the sample, all twelve event families still appeared at least 131 times. Event locations count all branches the generator offers, including those a player will pass by.

These are generated map and action counts. The audit establishes distinct consequences and accurate payouts. It does not estimate how often a person will value a Wick over a Feather or complete four body pickups with limited visibility. The most informative playtest split is by arrival Energy, chosen companion and the terrain that follows.
