# Growth Seed accessibility and production RNG — 16 November 2026

Growth now has Common +3, Rare +5 and Legendary +8 seed cards; Legendary ranks II and III reach +9 and +10. The existing Rare `growth-seed` identity is retained. The new Common stays outside the unchanged seeded starter pool. Equipping a seed at an open camp enables Grow immediately. Grow consumes the normal Rest allowance, refills once without healing hearts, and shares a limit of three actions across all copies for that expedition.

Previously, a seed could only be the single Rare card among 24 possible Rare definitions. Its exact probability per flight reward was 0.625% ordinary, 1.333% elite and 1.958% guardian. The random draw correctly selected rarity first and then a card, but those odds made a necessary camp option effectively absent from most expeditions.

The change keeps the existing rarity roll and gives Common Growth Seed six relative draw tickets, against one for each of the other 41 eligible Common definitions. Its natural share of Common rewards is therefore 6/47, or 12.766%. Rare and Legendary seed variants each keep one ticket. Natural seed probabilities, before the early safeguard, are 11.381% ordinary, 9.279% elite and 7.712% guardian. The ordinary route is the main source of accessible Common seeds; tougher routes retain their better overall rarity odds.

If no seed of any tier has been acquired, the second actual Common flight reward supplies one Common seed. A Rare or Legendary seed acquired earlier cancels this safeguard. Forge, previews, failures and retrying an uncompleted flight do not advance the Common count. Once acquired, a seed remains remembered after Melt, preventing repeated guaranteed rewards. Saved generated cards and completed receipts remain authoritative. Acquiring a seed permits a choice: equipping it still competes for a slot, and Grow still competes with Recover and Add slot.

## Matched route sample

`node scripts/growth-seed-audit.mjs` compares the production draw module from baseline commit `c41f0311811e6869a1c10efe0131235aa3ccfef5` with the final 81-card production code for cards-renewal-1. It uses the same 10,000 monotonically numbered campaign seeds, actual generated maps, seeded random choices along connected edges, and each expedition's evolving owned collection and historical flight drops. The independent earliest-camp sample selects a connected approach to the earliest camp; its two flight rewards do not affect the main sample. These results assume every selected flight clears, with no Forge or seed-aware route selection. They measure card accessibility, not physical flight fairness or human completion rates.

| Acquired at least one seed | Before | After |
| --- | ---: | ---: |
| Before earliest reachable camp | 141 / 10,000 (1.41%) | 6,892 / 10,000 (68.92%) |
| Before first camp actually visited | 245 / 9,983 (2.45%) | 8,087 / 9,983 (81.01%) |
| By the first map's guardian reward | 594 / 10,000 (5.94%) | 9,980 / 10,000 (99.80%) |
| By the expedition's final guardian reward | 1,682 / 10,000 (16.82%) | 10,000 / 10,000 (100% in this sample) |

Seventeen sampled routes bypassed all camps, so they are excluded from the first-visited-camp denominator. The safeguard promises a seed by the second Common clear, not before a fixed camp: unusually Rare-heavy opening routes can reach an early camp without one. The final guardian reward is a trophy and cannot supply growth during the completed expedition.

Every sampled before/after route used exactly the same rarity outcomes: **146,786 Common, 44,355 Rare and 11,514 Legendary** across **202,655** flight rewards (147,667 ordinary, 24,988 elite, 30,000 guardians). No current expedition lacked a seed after its second Common reward. Duplicate card definitions remain valid individual instances: 29,210 baseline and 35,720 current repeated definitions within their own expeditions, with separate IDs. The increase includes intentionally more frequent Common seeds; no collection-history exclusion silently changes the published rarity roll.

## Raw RNG checks and regression coverage

The audit additionally draws 30,000 monotonic seeds for each node tier and 30,000 rewards in an exact 75% ordinary / 20% elite / 5% guardian reference mix. Those figures describe the reference node mix, not the card rarity percentages. Rarity counts are byte-for-byte identical before and after the card change. Within-tier card frequencies, using the intended Common weight, stay within 2.56 standard deviations of their expectations.

| Source | Common | Rare | Legendary | Current seed rewards of any tier |
| --- | ---: | ---: | ---: | ---: |
| 30,000 ordinary draws | 24,884 | 4,500 | 616 | 3,425 |
| 30,000 elite draws | 16,506 | 9,587 | 3,907 | 2,793 |
| 30,000 guardian draws | 10,462 | 14,117 | 5,421 | 2,371 |
| Exact 75/20/5 mix | 22,609 | 5,914 | 1,477 | — |

The final JSON report is written to `work/cards-renewal-release/growth-seed-audit.json` (the script defaults to `work/growth-seed-audit.json`); `--runs=`, `--samples=`, `--base=` and `--out=` support reproducible variants. `growth-seed.test.mjs` exercises real production clears, nonmutating previews, Common history, receipt stability, reload, later Melt, owned legacy seeds and Forge exclusion. It verifies the 3/5/8/9/10 printed values, camp-only evolution and rank quotes, three exact fractional-capacity actions, mixed copied +43 and the nine-source +90 bound, with saved reload and unchanged hearts. Existing catalog, source magnitude, row, starter, camp progression and Rest clarity checks remain part of the focused verification.
