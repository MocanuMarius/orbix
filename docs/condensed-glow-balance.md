# Condensed Glow balance — 2026-11-13

The final economy reaches approximately one paid skill rank per two successful flights for the steady scenario. It preserves fuel availability on easier maps and prevents overflowing fuel from filling the entire skill tree. These are resource-schedule simulations, **not measured human win rates or proof that every companion is equally strong**.

## Final rules evaluated

- Start with 8 Condensed Glow (CG) and one free main-wisp root.
- Natural pickups fill usable Glow first. Each surplus displayed Glow becomes 1 CG; fractional credit carries forward without rounding each fragment upward.
- Condensation changes 3 surplus Glow into 4 CG. Small conversion ranks have base prices 30/35 CG. Kept Light counts held-wallet tiers at 100/200/300 CG; the shared conversion multiplier cannot exceed 1.6.
- Paid training prices use `ceil(base × (1 + 0.4 × paidRanks^1.5) / 5) × 5`. The free starter root is excluded. Small conversion ranks also raise future prices, so their opportunity cost is real.
- Normal skill base prices are generally 80–110 CG. Condensation's base price is 85 CG. Capacity, extra companions and extra lives have higher base prices.
- Clear recovery and full Rest recovery create no CG. Relic dissolution and finite support offerings supply real Glow, which fills the vessel before its excess converts. Failed attempts discard their whole and fractional pickup income.
- Natural benign fuel supply floors are 10 internal Glow/second on Ascension 1's first map, 9 on its later maps, and 8.2 at higher Ascensions. Internal Glow is multiplied by 0.3 for display. Actual collection is never guaranteed.

## Reproduce

Run from the repository root with Node:

```sh
node scripts/balance-condensed-glow.mjs --seeds=8 --out=work/balance-condensed-glow.json
node scripts/balance-condensed-glow.mjs --startingOnly --seeds=4 --out=work/balance-condensed-starting-roots.json
node scripts/condensed-model-probe.mjs
node scripts/condensed-flight-probe.mjs
```

The first command runs 4,608 campaigns plus 864 sensitivity campaigns. The second runs 768 starting-root cases: **6,240 final cases in total**. Detailed rows remain in ignored `work/` files. Both final reports recorded `sourceUnchanged: true` and no changed source files during execution. The main pass took 98.6 seconds locally; this is simulation throughput, not a mobile performance benchmark.

The campaign cases cover all four companions, Ascensions 1–6, all three campaign maps, and survival-first, conversion-first, hoarding and companion-first spending. There are 2,304 conditional-clear cases and 2,304 separate attrition cases. The first isolates progression by allowing the economy schedule to finish even if fuel pressure flags occur. The second consumes attempts and rolls back failed income.

## Progression results

Conditional-clear medians; normally 15 successful flights per campaign. A rank is one purchase, including small conversion increments, not an entire branch.

| Behavior scenario | Paid ranks | First purchase after flight | CG earned | CG left | Ranks after maps 1 / 2 / 3 |
| --- | ---: | ---: | ---: | ---: | --- |
| Learning | 5 | 3 | 813 | 169 | 2 / 4 / 5 |
| Steady | 7 | 1 | 2,091 | 328 | 3 / 5 / 7 |
| Practiced | 9 | 1 | 3,584 | 427 | 5 / 7 / 9 |

The steady median is 0.467 paid ranks per flight. Growth is deliberately front-loaded: first purchases arrive quickly, while later decisions require saving. Across the main cases, the maximum observed was 13 paid ranks. The largest learned fraction was 19.4% of nominal main/selected-companion/conversion ranks, well below the requested 60% upper limit. This denominator includes mutually exclusive paths; it is not a claim about completion of every purchasable path.

| Ascension | Learning ranks | Steady ranks | Practiced ranks |
| --- | ---: | ---: | ---: |
| 1 | 6 | 8 | 11 |
| 3 | 5 | 7 | 9 |
| 6 | 4 | 6 | 8 |

The easier supply floor remains useful without restoring the original inflation. A separate set of starting-root seeds produced A1 steady medians of 9/10/10 ranks for Vitality/Radiance/Momentum and learning medians of 7/7/7. Learning first purchases took two flights with each root. These results do not establish a single mandatory starter choice.

## Companion and strategy differences

Steady scenarios, pooling Ascensions 1–6:

| Companion | Paid ranks | Flight overflow CG | First purchase after flight | CG left | Attrition campaigns completed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Collector | 8 | 2,531 | 1 | 359 | 163 / 192 |
| Protector | 6 | 1,488 | 2 | 306 | 81 / 192 |
| Space Timer | 7 | 2,102 | 1 | 349 | 153 / 192 |
| Runner | 6 | 1,543 | 2 | 297 | 96 / 192 |

All economy columns are conditional-clear medians. Flight overflow excludes finite support/relic offerings, which contribute another median 146–163 CG depending on role. Collector's rescue behavior produces more usable fuel and overflow. Space Timer saves effort. Protector's safety does not solve missed-fuel droughts, and Runner has less time to collect. The imposed attrition scenarios expose this difference; **they do not justify claiming role parity**. Fixed capture/collision assumptions cannot represent a Protector player deliberately taking a safer risk for fuel, or a Runner player choosing better dash timing. Actual collision frequency, deliberate descent and human use of hold/dash controls require playtesting; the abilities should not be overfitted to this schedule model.

For the learning A1 stress subset, the default Collector completed 21/32 campaigns; the other roles completed 0/32, 5/32 and 2/32 respectively. Higher-unlock roles should not be advertised as equally forgiving beginner options. These small, deliberately harsh samples are diagnostic rather than empirical success forecasts.

| Steady spending policy | Paid ranks | Non-conversion paid ranks | CG earned | CG left |
| --- | ---: | ---: | ---: | ---: |
| Survival first | 6 | 6 | 1,841 | 240 |
| Conversion first | 8 | 3 | 2,448 | 353 |
| Hold one Kept Light tier | 8 | 3 | 2,645 | 520 |
| Companion first | 6 | 6 | 1,731 | 230 |

Conversion builds earn more, but spend several ranks improving income and raise the prices of later survival purchases. Holding currency earns no passive interest and can never exceed the 1.6 conversion ceiling.

## Supply and sensitivity

The final main pass constructed 2,125 actual inventories spanning all 48 authored maps in all 12 biomes, including boss/elite layouts and route profiles. **No fuel-budget shortfalls remained.** Minimum benign-supply rate was approximately 8.2 internal Glow/second. The starting-root pass sampled another 151 inventories, with no shortfalls and minimum rate approximately 9.0. Inventories also contained 11,141 warning packets across the main sample; they are not absent from generated maps.

Each sensitivity below has 216 conditional-clear steady cases at Ascensions 1, 3 and 6. Independent scenario seeds and policy distributions mean these are ranges, not exact paired treatment effects.

| Change | Median paid ranks | Median CG earned | Flights with an unaffordable Lift event |
| --- | ---: | ---: | ---: |
| Pickup probability −8 percentage points | 7 | 1,898 | 27.1% |
| Pickup probability +8 percentage points | 8 | 3,318 | 4.5% |
| Correction effort +12% | 7 | 2,039 | 22.2% |
| Optimistic fuel yield +15% | 9 | 3,668 | 9.0% |

These cases show the price curve contains income inflation, while fuel drought remains sensitive to missed pickups. The +15% case is an optimistic scenario, not a mathematical upper bound on every artifact and multi-companion combination.

## What changed after the diagnostics

The earlier 13,824-campaign / 864-sensitivity pass used training growth 0.25. It sampled 4,335 inventories with no supply shortfalls after the layout repair, but A1 steady progression still reached 11 ranks. Three subsequent 192-case comparisons at growth 0.4/0.5/0.6 selected 0.4 to keep A1 near eight ranks without suppressing later runs excessively. That baseline is saved as `work/balance-condensed-growth025-baseline.json`; it must not be presented as final tuning.

Before the supply repair, roof-heavy maps and some final-boss layouts fell below the intended fuel budget, with individual shortfalls up to 269 internal Glow. Existing lights are enriched first; additional body-clear pockets are allowed within hard sections when their actual clearance is safe. This fixed the inventory deficit without adding a flat clear-income grant.

Only `app.mjs` and `model.mjs` changed during the old long baseline: UI edits, refund earned-stat accounting and removal-aware artifact-sale preview. The final measurements above were rerun after those changes and the 0.4 price update, with identical source hashes at start and end.

## Verification and limits

Campaign assertions verify wallet reconciliation, single checkpoint settlement, no flat challenge/clear currency, and whole/fractional failed-attempt rollback. Focused model/engine probes verify body and Collector pickup payment once, generated-fuel exclusion, base and upgraded conversion, bounded multipliers, fragment rounding, finite reward claims, practice isolation, save/load and no-mint workshop refund/rebuy cycles.

The simulations use production map construction, prices, numeric skill modifiers, rewards, conversion and campaign transitions. They do not fly a geometry controller. Pickup probability and extra correction taps approximate imperfect play: learning/steady/practiced begin at 45/60/76% pocket capture and 68/82/94% accessible capture, with 16/8/2.5% extra correction effort. Baseline lift cadence derives from `2 × impulse / gravity`, about 1.37 seconds before modifiers. Reaction-delay labels describe those scenarios; they are not measurements of people.

Inventories use representative early/middle/late durations rather than the exact duration of every node. Bad-packet avoidance and visibility loss are represented through capture assumptions and sensitivity, not a direct fuel penalty. Numeric artifact bonuses are included; exact recovery/reveal/free-Lift trigger chains are approximated. Learned Dream savings assume successful prepared openings, optimistically even when route preparation would limit availability. Secondary companion purchases and paid extra-life upgrades are excluded from these role-isolation policies. Multi-companion combinations and actual human flight remain outstanding balance work; no claim of exhaustive build viability is made.
