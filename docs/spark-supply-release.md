# Spark supply balance · 15 November 2026

Release `spark-balance-1` adds a final, finite fuel-placement pass after terrain, hazards and optional challenges are known. It accounts for flight duration, chapter, difficulty, environmental assistance and an explicit reference progression curve. It redistributes existing fuel into lean stretches rather than adding a collection quota. Buying better skills does not cause the course to raise its fuel tax.

Starter reference budgets require at least 60% of the available **fuel value**, not 60% of bubble count. Later chapters assume some Lift-cost improvements and ask for a larger share of their smaller supply. Authored challenge marks, falling chains, opening pickups and hazard bypasses remain protected. An optional glide can no longer relocate the essential central fuel lane into a deep dive.

Later chapter pressure now reaches actual obstacle apertures: an old minimum-gap clamp cancelled much of the intended scaling. Hard sections retain a minimum 84-world-unit aperture; opening and recovery sections retain their original treatment. Later chapters gradually add hard sections and stronger drafts. The first chapter's first-tier opening is unchanged by this geometry correction.

Automatic exit packing and baseline 50% checkpoint recovery from `exit-packing-1` remain included.

## Verification

- 1,296 generated layouts: 48 courses × tiers 1/2/6 × three chapters × three depths. No fuel-budget excess or deficit after normalization. This is an inventory audit, not a physical proof.
- 384 final-curve physics scenarios with 150/250 ms assumed reaction profiles that can seek visible mushrooms, vents and blooms. Full-field cases cleared 151/192. None of 192 cases allowed less than 60% fuel value cleared, including subsets preferring accessible central packets.
- 576 later-course scenarios using builds actually purchased with campaign earnings: 517 cleared on their first modeled attempt. Every one of the 192 course/chapter/depth groups had a successful witness after varying legal builds or imperfect input seeds. No invented maximum-stat builds.
- 96 coupled campaigns exercise actual rewards, spending, seeded gifts, relics, recovery, Dream record/replay and failed-route choices. Tier 1 completed 12/24; tier 2 completed 3/24; tiers 3 and 6 completed none in this small cohort. These are model outcomes, not predicted player win rates.
- 108 paired course/build comparisons show remaining fuel declining across chapters, but clear counts of 32/36, 31/36 and 33/36 do **not** establish monotonically increasing human difficulty. That curve still needs phone feedback and broader matched comparisons.
- 60 focused tests pass across supply, exit packing, checkpoints, rewards, Collector, skill-book, guardian geometry/relics and delayed-input/Dream simulation.

The controller observes coarse illuminated geometry, finite Spark Sense cues and currently visible hazards. It applies assumed reaction latency, timing jitter, missed notices and limited planning. These assumptions are not calibrated to measured players; it does not benchmark browser frame stalls. No finite sample proves every generated seed possible. Several older optional-objective tests still encode retired five-size Spark values and unconditional objective availability; this release does not claim the entire historical suite passes.

## Reproduce

Run from the repository root:

```text
node scripts/audit-spark-demand.mjs --out=work/supply-density-final-curve.json
node scripts/balance-spark-supply.mjs --styles=human150-env,human250-env --envelopes=all,0.599 --captureOrder=lane --out=work/supply-environment-final-curve.json
node scripts/balance-progressed-courses.mjs --reference=work/supply-coupled-dream-builds.json --out=work/supply-progressed-final-curve.json
node scripts/balance-coupled-campaign.mjs --seeds=2 --tiers=1,2,3,6 --styles=steady,practiced --policies=focused-survival,focused-storage,focused-collector --startingChoices=0,1 --out=work/supply-coupled-final-curve.json
```

Large raw reports live in ignored `work/`; scenario reports include runtime and controller source hashes. The progressed-course census needs earned templates from a preceding coupled report; use that report as `--reference` on a fresh checkout. Release stamping changes cache tokens after these runs, without changing mechanics.
