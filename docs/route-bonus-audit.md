# Conditional passage rewards

Sixteen seeded expeditions generated 48 maps and 648 eligible passage previews. The sample covered all 48 locations, all 12 biomes, the four companions, Ascensions 1, 2, 4 and 6, and all three map positions. The two landscape viewports were 900 × 405 and 740 × 333. Eight campaigns chose Proximity at the starting-gift screen and eight chose Dream. Three quarters started the audit missing one heart. First-time and returning tutorial profiles used their respective production layouts.

## What the map actually offered

Every preview went through the same final-layout planner used by the map. It replaced the highest-ranked candidate on 80 of 648 sites. All sites found an eligible objective.

| Objective | Number offered |
| --- | ---: |
| Gilded Passage | 16 |
| Pilgrim Precision | 31 |
| Three Suns | 30 |
| Wild Circuit | 34 |
| Flash Relay | 70 |
| Long Glide | 121 |
| Edgeweaver | 45 |
| Night Sail | 51 |
| Wayfinder | 115 |
| Rising Constellation | 135 |

Long Glide, Wayfinder and Rising Constellation together occupied 57% of the sites. They work across a wide range of biomes. Three Suns, by comparison, needs a missing heart and three suitable three-layer Sparks. Offers counted here include alternate paths that a player gives up when choosing a fork.

## Packed Sparks and Rest purchases

One of the three maps carries a Gilded opportunity and the others carry one Precision opportunity each. Winning all three adds **at most 46 Packed Sparks per expedition**. Dreams, retries, prior savings, escrow and other cash contracts cannot raise that ceiling. The normal 20 for clearing survives a missed objective.

The comparison below sampled 384 three-map paths per row. One routing policy chose randomly among reachable nodes. The other preferred a reachable cash objective. Both followed the actual graph and its consecutive-elite restriction. Each paired wallet began with the campaign's real starting gift, companion, Ascension and starting currency. The pair shared ordinary clears, rest visits, assumed ordinary Packing (0–8 per clear) and cheapest affordable in-game Rest purchases. Only the bonus wallet received the side reward. We isolated Proximity and Dream because the third starting choice, a rare artifact, can change Packing and fuel collection. Death, artifact sales, independent event deals and strategic saving could change absolute purchase counts.

| Per-target success assumption | Routing | Extra currency per eligible clear | Extra currency per expedition | Baseline / rewarded Rest ranks bought | Extra ranks bought |
| ---: | --- | ---: | ---: | ---: | ---: |
| 55% | Random | 0.443 | 6.42 | 2.85 / 2.88 | 0.03 |
| 55% | Seek cash | 0.629 | 9.07 | 2.92 / 2.98 | 0.05 |
| 70% | Random | 0.713 | 10.32 | 2.88 / 2.91 | 0.04 |
| 70% | Seek cash | 1.097 | 15.80 | 2.94 / 3.04 | 0.10 |
| 85% | Random | 0.942 | 13.65 | 2.81 / 2.86 | 0.05 |
| 85% | Seek cash | 1.449 | 20.91 | 2.91 / 3.04 | 0.13 |

The highest observed transfer was 44 over an expedition. In the high-hit cash-seeking scenario, side rewards raised average income by 7.2% of the ordinary clear floor. Purchase totals and paired differences are rounded independently. These sensitivities assume independent target misses and a cleared passage. Real target misses can cluster, particularly when a player misses the opening cue.

## Delayed-input flight witnesses

The audit also flew the first physically eligible site of each objective–companion combination at 60 physics steps per second with three controller profiles. They sample currently illuminated terrain, react after 150, 250 or 350 milliseconds with jitter, and can overlook marked targets. Their one-Lift lookahead ranges from 0.85 to 1.15 seconds. They can see the same advance gold corner marks that the renderer draws over the fog. Run-specific build and geography are shared with each preview. These 120 attempts stress how a first encounter might go. The controller has no learned maneuver timing, so this sample cannot estimate a player's practiced success rate or rank the companions.

All 120 runs terminated. The controllers cleared 29 flights and completed the optional objective on six clears. Gilded Passage paid once, Flash Relay twice, Wayfinder once and Rising Constellation twice. Six more objectives recorded partial progress. The low payout rate and the gap between clearing the passage and earning its bonus make cue recognition and target forgiveness worth watching on a phone. A dedicated Long Glide flight test executes its opening Lift and reaches both targets with the real physics.

The earlier Rising Constellation used one target per layer. None of the 12 attempts collected its first mark in order. The revised sequence offers a second target when the layout permits, lights only the current layer, and gives up to 2.8 seconds of advance warning. On the same four levels with the same companions and delay profiles, three attempts completed all three layers and two cleared the flight to earn the reward. All three sequences occurred with Collector at Wreck Canopy. The other three companion–level pairs still missed the opening, so broader evidence would be needed to generalize the gain.

Run these commands from the project root to reproduce the audit.

```sh
node scripts/route-bonus-audit.mjs 16 work/route-bonus-audit.json
node --test tests/route-bonuses.test.mjs
```
