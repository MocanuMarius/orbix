# Skill, Proximity and encounter balance refresh

## Shipped behavior
- Role tabs centered above Light / Motion / Sparks; legend aligned right with the inspector.
- Proximity has its own seven-node run tree. No root purchase means no charging, pulse, meter or associated effects.
- Light Aegis: 8 seconds, one collision, no Energy cost, no stacking, at most two grants per flight. A subsequent unshielded collision remains fatal.
- Collector baseline: 105 → 52.5 range; 5 → 10 seconds radius recovery. Only the Collector rescues missed pickups; direct body pickups are unchanged.
- First-map A1 lethal scenery: at most 3 falling actors, spaced at least 1,800 world units. Later maps/ascensions retain the full mix. No ordinary passage widening or global fuel nerf.
- Guardians have distinct teach / vary / combine phases and respite rooms. Four previously shared an identical straight corridor. Warden now alternates high/low hands; Moonweaver A1 traversals are less extreme; Frost alternates warned ice; roots pulse; storm currents alternate; dark wells change sides.
- A1 signature attacks skip alternating hard rooms. Frost warnings last 2.2 seconds; Rootbound closure retains a 220-reference-unit opening.

## Skill economy
Base prices now distinguish effect size: Gentle Awakening 30, Lucid Luminance 40, several recovery conveniences 45–55, companion increments 50/60/70, Glowkeeping's additional Lift discount 125, Dawnburst 130. Prices still scale with learned investment and round to 5. Cheap purchases contribute less to future inflation; the free starter contributes nothing.

The corrected 3,456-case economy stress matrix has a median of 8 purchases and 14 flights, median per-run purchase/flight ratio 0.615. This is not exactly the aspirational one purchase per two flights: A1 successful collection can buy more, while learning/high-tier scenarios buy less. Main-tree completion is not a valid metric of viable-build completion because mutually exclusive branches inflate its denominator.

## Evidence
All 48 ordinary maps × 4 companions × 2 delayed controllers = 384 cases. Collector was subsequently rerun over every map with 2 layout seeds (192 cases): 153 clears, zero low-fuel deaths. These are synthetic results, not player success forecasts.

Corrected hazard-aware matched A1 biome tests: ruins 34.38% → 56.25%, pinewood 50% → 62.5%, frost 65.63% unchanged. The old simulator ignored falling scenery; its initial results are not used as a balance baseline.

Final guardian controller clears: Warden 5/8, Moonweaver 5/8, Frost 4/8, Rootbound 5/8, Storm 6/8, Hollow Sun 7/8. Eight samples are sparse (4/8 has a roughly 22–78% Wilson interval); do not equate these percentages to human difficulty or force every guardian to the same rate.

Timing: 150/250ms input delay with 40/70ms jitter; 10/15% seeded pickup noticing misses; missed Power decisions; limited visible horizon. Controller prediction still has geometric advantages over people, and does not model all perception or touch errors. A second seed is a robustness check, not independent human validation.

## Remaining major rethink
Survival and currency both reward keeping Energy full. Overflow produces a wide skill-growth gap between struggling and practiced players. More global price inflation alone cannot fix that without making modest skills feel bad. The next design decision should compare a stronger guaranteed clear reward plus bounded overflow bonuses against the current uncapped surplus economy. This is deliberately not silently changed here.

## Reproduce
- node scripts/balance-current-flight.mjs --source=current --mode=atlas --seeds=2 --out=work/atlas.json
- node scripts/balance-current-flight.mjs --source=current --mode=guardians --out=work/guardians.json
- node scripts/balance-current-economy.mjs --seeds=12 --tiers=1,3,6 --out=work/economy.json
- node scripts/proximity-unlock-probe.mjs
- node scripts/condensed-model-probe.mjs

The compact JSON beside this report retains grouped evidence. Full per-case local artifacts remain under work/. Early economy reports with the legacy multiplier are exploratory and superseded by economy-release.json.
