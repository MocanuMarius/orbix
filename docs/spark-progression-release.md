# Spark progression and exit packing

`spark-progression-1` completes the implementation of the starter fuel target, automatic exit packing and progression-aware course pacing. The machine-readable results are in `spark-balance-evidence.json`.

## Fuel and optional challenges

All 48 courses use a final finite fuel budget based on flight duration, chapter, difficulty, authored assistance and a fixed reference progression. Bare starter budgets assume a full 30-Spark vessel, including early flights after a Rest. Placement separately accounts for the half-full checkpoint entry, moving existing packets forward when needed instead of adding fuel. This fixes a reproduced early Cemetery fuel drought without increasing supply.

The 60% target means the **fuel value** available in a bare starter, not bubble count. There is no collection quota or failure gate. Gifts, learned skills and relics legitimately improve that requirement. A low-cost Lift build is not charged an adaptive fuel tax.

Optional missions now choose marks from the final funded inventory. Previously their protected marks could preserve too much of the richer construction inventory. This also aligns route preflight with the actual flight. Short flights offer lighter objectives; the rich Constellation and Three Suns hunts require at least 75 seconds. Tests cover all ten objectives on eligible geometry, without assuming every objective fits every seed.

## Progression

Ordinary later flights now use authored encounter pacing across their full distance. Previously `flightLengthScale=1` selected a legacy branch that front-loaded hard terrain and skipped the advertised encounter patterns, then filled the rest with recovery terrain. Bare first-map openings keep their tested geometry.

Later chapters gradually add challenge windows, tighter authored apertures and stronger local drafts. Their supply reference assumes some paid improvements: reference Lift effort decreases from 3 to 2.55 to 2.30 Sparks, while the target capture share rises from 60% to 66% to 70% before tier/elite adjustments. Actual purchased skills do not change those course budgets.

Coupled simulations use the real route-offer preflight, rewards, starting gifts, skill prerequisites and prices, relic charges, Dream recording/replay, recovery and failed-route choices. They spend earned currency rather than inventing a full build. The progression audit compares the same campaigns across chapters to avoid comparing early failures with only later survivors.

## Successful exit

Unused fuel is automatically packed at the current Storage rate, initially six Sparks to one Stored Spark. Fractions carry forward. Exit packing is independent of the pickup-overflow allowance and bounded by vessel capacity. The existing packing rail displays the payment before the flight ends; settlement recomputes it, preventing duplicate payment after a save or repeated callback.

After consuming that reserve, the vessel recovers 50% of capacity, improved by recovery skills. Rest refills do not pack fuel or mint currency. Failed attempts do not bank pickups or the reserve; practice stays separate.

## Verification and limits

The final evidence includes 1,296 generated layouts; 1,152 starter physics scenarios across all 48 courses, tiers 1/2 and three early depths; 288 additional faster-planning counterexample searches; earned-build course censuses at the normal tier and fixed-build stress tiers 2/6; 144 coupled campaigns; and all 20 genuine starting-gift offers. All runtime and controller hashes must match before the evidence recorder succeeds. It checks every recorded flight for excess or missing supply, including selected optional missions.

Final results: all 4,949 recorded flight scenarios meet their fuel budgets; none of the 864 under-60% starter counterfactuals clears. Full-field human-limited starter cases clear 438/576. All 192 course/chapter/depth groups have a successful earned-build witness at each tested tier (1, 2 and 6). All 80 focused tests pass, including real objective mechanics and exit/reward accounting. In the largest matched campaign cohort (18 first-tier campaigns), attempt clear shares are 95.63%, 93.92% and 79.38% across the three chapters; equally weighted campaign shares are 96.11%, 94.69% and 76.10%. Higher-tier matched cohorts contain only one to five campaigns and cannot support precise difficulty-rate estimates.

Human-limited profiles observe coarse illuminated terrain and finite Spark Sense cues, with assumed reaction delay, timing jitter, missed notices and limited planning. They can seek visible environmental assistance. These assumptions are not fitted to measured phone players. Modeled clear rates are scenario outcomes, not predictions of human win rates. Sampled successful paths do not prove every seed or every build possible. Fixed-build tier stress checks do not claim those builds were earned during those harder campaigns.

The evidence records pre-release-stamp source bytes. Publication changes cache tokens and normalizes line endings; it does not change mechanics. Phone feedback remains useful for subsequent tuning, especially at higher difficulty.

## Reproduction

From the repository root, run the coupled campaign first. Copy its completed JSON to `work/earned-final-builds.json` before the course censuses, so all three policies have genuinely earned later builds.

```text
node scripts/balance-coupled-campaign.mjs --seeds=3 --tiers=1,2,3,6 --styles=steady,practiced --policies=focused-survival,focused-storage,focused-collector --startingChoices=0,1 --out=work/supply-coupled-final.json
node scripts/balance-spark-supply.mjs --stages=0,1,2 --styles=human150-env,human250-env --envelopes=all,0.599 --captureOrder=lane --out=work/supply-starter-final.json
node scripts/balance-spark-supply.mjs --stages=0,1,2 --styles=fuel --envelopes=0.599 --captureOrder=lane --out=work/supply-starter-solver-counterexample.json
node scripts/balance-progressed-courses.mjs --reference=work/earned-final-builds.json --out=work/supply-earned-final.json
node scripts/balance-progressed-courses.mjs --reference=work/earned-final-builds.json --tier=2 --out=work/supply-earned-tier2-final.json
node scripts/balance-progressed-courses.mjs --reference=work/earned-final-builds.json --tier=6 --out=work/supply-earned-tier6-final.json
node scripts/balance-starting-gift-usage.mjs --out=work/supply-gifts-final.json
node scripts/audit-spark-demand.mjs --out=work/supply-density-final.json
node scripts/audit-progression-results.mjs --report=work/supply-coupled-final.json --out=work/progression-final.json
node scripts/record-balance-evidence.mjs
```
