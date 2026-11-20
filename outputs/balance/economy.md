# Economy per full card run (production model, synthetic cleared flights)

Source: scripts/balance/economy-run.mjs. Drop rates 94.5/5/0.5, Elite slot 1 reserved Rare, Guardian slot 1 reserved Legendary; Forge price rises linearly per Forge or Evolve of a tier for the rest of the run: base x (1 + 0.5 x n), rounded up (2026-11-20; it doubled before: none 4.2 R / 2.3 L, forge 7.2 / 3.5, evolve 5.1 / 4.1).

```
runs=150 per policy; reached the end: 150/150 (otherwise stopped in phase: none)
flights/run 28.00, Rests/run 10.95 (map 1/2/3: 3.60 / 3.64 / 3.71), card packs/run 27.00
Rares offered/run 4.56, Legendaries offered/run 2.38
Stored Sparks earned/run (no spending): 773.90; per map 236.34 / 256.70 / 280.86

| income source (Stored Sparks wallet rise) | per run |
|---|---|
| Rest | 0.00 |
| card packs | 0.00 |
| chests | 114.87 |
| events | 3.81 |
| flights (reward choice) | 0.00 |
| flights: Elite | 15.90 |
| flights: Guardian | 50.51 |
| flights: ordinary | 588.81 |

Policy none: ends with Commons 20.26, Rares 4.09, Legendaries 2.39; forges C/R/L 0.00/0.00/0.00; evolves R/L 0.00/0.00; spent forge 0.00, evolve 0.00, improve 0.00; wallet left 782.43

Policy forge: ends with Commons 27.37, Rares 8.68, Legendaries 3.06; forges C/R/L 7.41/4.59/0.67; evolves R/L 0.00/0.00; spent forge 751.59, evolve 0.00, improve 0.00; wallet left 32.41

Policy evolve: ends with Commons 17.29, Rares 5.00, Legendaries 4.45; forges C/R/L 0.00/0.00/0.00; evolves R/L 2.71/2.13; spent forge 0.00, evolve 586.30, improve 29.30; wallet left 167.00
```
