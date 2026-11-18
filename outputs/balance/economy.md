# Economy per full card run (production model, synthetic cleared flights)

Source: scripts/balance/economy-run.mjs. Drop rates 94.5/5/0.5, Elite slot 1 reserved Rare, Guardian slot 1 reserved Legendary; Forge price doubles per forge of a tier for the rest of the run.

```
runs=150 per policy; reached the end: 150/150 (otherwise stopped in phase: none)
flights/run 28.00, Rests/run 10.94 (map 1/2/3: 3.59 / 3.61 / 3.74), card packs/run 27.00
Rares offered/run 4.56, Legendaries offered/run 2.38
Stored Sparks earned/run (no spending): 832.26; per map 245.71 / 275.61 / 310.93

| income source (Stored Sparks wallet rise) | per run |
|---|---|
| Rest | 0.00 |
| card packs | 0.00 |
| chests | 124.47 |
| events | 3.81 |
| flights (reward choice) | 0.00 |
| flights: Elite | 17.49 |
| flights: Guardian | 54.93 |
| flights: ordinary | 631.55 |

Policy none: ends with Commons 20.73, Rares 4.18, Legendaries 2.37; forges C/R/L 0.00/0.00/0.00; evolves R/L 0.00/0.00; spent forge 0.00, evolve 0.00, improve 0.00; wallet left 840.26

Policy forge: ends with Commons 24.68, Rares 7.16, Legendaries 3.51; forges C/R/L 4.12/3.00/1.13; evolves R/L 0.00/0.00; spent forge 724.60, evolve 0.00, improve 0.00; wallet left 116.17

Policy evolve: ends with Commons 16.66, Rares 4.51, Legendaries 6.12; forges C/R/L 0.00/0.00/0.00; evolves R/L 3.49/3.79; spent forge 0.00, evolve 655.33, improve 42.70; wallet left 147.73
```

## Reading (synthetic: every flight cleared, flames at half, no deaths; income per flight is the model's, not a human measurement)
- About 28 cleared flights, 11 Rests (about 3.6 per map), 27 card packs and 832 Stored Sparks earned per full run; 75 percent of it from ordinary flight clears, 15 percent chests.
- Forge with doubling (15/30/60..., 40/80/160..., 150/300/600...): spending everything buys about 4 Commons, 3 Rares and 1.1 Legendary (725 Sparks). Evolve-first buys about 3.5 Rare and 3.8 Legendary evolutions (700 Sparks) and ends with 6.1 Legendaries against 3.5.
- Recommendation: keep bases 15 / 40 / 150. The doubling already makes the 4th Common and 3rd Rare cost more than they are worth, and the 2nd Legendary Forge (300) is the real ceiling. Evolve into Legendary (flat 150) is about 2.5x cheaper than a second Legendary Forge; if the owner wants Forge to stay competitive with Evolve, lower the Legendary base to 100 rather than touching Common or Rare.
