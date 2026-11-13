# Clear Rewards income check

This checks the selected simplification, not human difficulty or optimal play. Run `node scripts/checkpoint-economy.mjs` to reproduce. It drives the production campaign, reward, Rest and skill models for 12 seeds x 4 companions x 3 income assumptions (144 completed campaigns).

All flights succeed; each begins with synthetic outcomes. The policy takes a free Vitality root, prefers Rest, keeps two of every three flight artifacts, melts the third, and buys the cheapest reachable skill. Overflow income is supplied explicitly, not measured by an AI flight controller. The final guardian awards a permanent relic, not the fixed clear income.

| Packed Sparks from overflow per flight | Mean paid ranks | Range | Mean currency left |
| --- | ---: | --- | ---: |
| 0 | 3.00 | 3 | 128.06 |
| 15 | 4.00 | 4 | 157.75 |
| 40 | 5.17 | 5-6 | 276.08 |

Routes averaged 15.42 flights and 288.33 guaranteed Packed Sparks. The fixed reward provides income even with no overflow, without filling the trees. It is 20 for ordinary, elite and map-exit clears and unaffected by conversion upgrades. Rest no longer supplies the old 25/50/75 Condense award.

This does not establish the earlier goal of one rank per two flights: with existing escalating prices, these scenarios buy fewer. The user selected only proposal 3; tree/pricing simplification was deliberately not applied. Human play can differ in overflow, failures, routing, saving, artifact value and chosen skill costs. Starting balance remains 8, artifact Melt/Forge values remain 25/35/50, and existing overflow tuning is retained.

Transaction tests additionally cover no reward on failure, exact-once settlement through reload, conversion multiplier exclusion, practice isolation, Recover/Grow refills, three-growth cap, repeated-Rest rejection and capacity purchases at Rest.
