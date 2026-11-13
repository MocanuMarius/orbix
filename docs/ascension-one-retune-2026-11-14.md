# Ascension 1 opening retune

- Ordinary first-map passages are 20% wider (capped at 68% viewport height); later A1 maps 10% wider. Elite geometry unchanged.
- Ordinary first-map speed reduced 8%; fuel budget includes the longer crossing time.
- More accessible middle-passage fuel candidates; minimum supply rate 14 internal units/s on first A1 map, 11 on later A1 maps. Higher ascensions unchanged.
- Skill prices, Lift cost, pickup values and collision rules unchanged.

Validation: 96 paired engine stress cases before/after (four roles, three terrain families, two seeds, four controllers). Clears 4 to 12; mean progress 27% to 42%; low-fuel deaths 41 to 36. Collector clears 4 to 9 of 24. Other roles each 0 to 1 of 24. These are controller stress metrics, not human success predictions. In particular, reaction-delay results are non-monotonic; do not optimize to a target bot clear rate.

Economic model: 576 synthetic campaigns, 287 inventories, all 48 maps / 12 biomes, zero supply-budget shortfalls. Fixed obsolete simulation assumptions about clear reward income and slot/melt rewards. No-attrition A1 median paid ranks per flight: learning .563, steady .692, practiced .8. High-skill overflow income remains a trade-off to monitor; the simulation does not establish human survival or a complete balance solution.

Remaining concern: non-Collector roles still struggle in the flight controller. Evaluate on-device before further widening or increasing supply; more universal fuel also increases Collector overflow currency.
