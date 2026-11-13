# Flight and artifact decisions — 2026-11-13

- Keep 100-unit internal Glow precision. The UI converts by ×0.3 to a 30-unit baseline. Fractional fuel, costs and upgrades remain real; HUD labels do not drive physics.
- Landscape orb position starts at 155 world units and increases only when the measured safe-area HUD needs more clearance. Compensating camera distance keeps world position, obstacle arrival and remaining travel unchanged. Portrait remains 98.
- Baseline light is circular, using a softened inverse-square emitter with a finite cutoff and exposure mapping. Remove the permanent 2× forward reach and screen-centred horizon fill. Earned forward light, Sight Bloom and full-scene pickup reveals remain.
- Pixel and fallback renderers share the same baked mask. Glow Sense, projection visibility, pickup coach, tutorial focus and draft art use the matching light function.

## Artifact engines

| Artifact | Trigger / benefit | Bound |
| --- | --- | --- |
| Overflow Coil | Natural fuel still wasted after Glow and unlocked Afterglow fill restores companion recovery at 0.08 seconds per internal fuel unit. | 2 seconds per pickup, 12 seconds per attempt; only actual recovered time consumes the cap. |
| Echo Bell | Collector delivery, Protector deflection, Runner activation or start of Space Timer levitation primes the next direct natural fuel pickup for +8 internal Glow. | One 8-second charge, five empowered pickups per attempt. Fetched fuel cannot spend the charge. |
| Dawn Loom | Actual recovery granted by a pickup or effect creates forward light. | 1.5-second light; 4-second cooldown. Passive ticking does not trigger. |
| Sunspool | Natural fuel collected while temporary extra light is active stores one free normal Lift. | No stacking; 4-second cooldown; four grants per attempt. Does not replenish held levitation. |

Shared triggers allow existing skills, pickups and artifacts to participate. A wasted-fuel → recovery → light → free-Lift chain is intentional. No effect manufactures a new pickup or redispatches a fuel event. Generated fuel, harmful pickups, Dusk Pearls and purified Dark Seeds never trigger the new fuel engines or fill reserve.

Natural direct and fetched fuel fill base Glow first. Unlocked reserve receives `min(surplus, freeCapacity / efficiency) × efficiency`; remaining raw surplus is the only fuel passed to Overflow Coil. Retention continues at expedition checkpoints. A locked or full reserve produces a counted blocked-overflow cue; successful storage produces a counted transfer cue. Counters and all artifact limits reset with the flight instance.

Dream already makes Lift free, so it preserves a stored Sunspool Lift for waking. Recorded inputs reproduce artifact state; rehearsal does not write run rewards. The UI can inspect `ARTIFACT_ENGINE_RULES`, `artifactEffects`, `artifactProc`, `reserveFlow` and `blockedOverflow`.

## Evidence and limits

- `scripts/artifact-engines-probe.mjs`: all four roles, caps, expiry, direct/fetched distinction, actual-only recovery, shared chains, excluded pickups, zero-fuel free Lift, held levitation, Dream determinism and retry reset.
- `scripts/overflow-light-probe.mjs`: natural-only reserve, efficiency/cap conservation, actual wasted-fuel handling, locked/full cues, exact spending, circular visibility, earned scouting and notch/camera invariance.
- Existing Dream, Glow Sense and landscape probes pass with the revised explicit unlock and circular-range fixtures.
- Actual landscape render inspected in `work/artifact-engines-preview.png`; baseline darkness is circular and Dawn Loom visibly extends forward light.
- `work/circular-light-focus-stress.json`: 84 real-engine flights, seven focus plans, three terrain families, 150/250 ms reaction delay plus timing jitter and missed power use. Funded samples buy at most three eligible nodes with a 240-Ember budget. `work/circular-light-collector-reserve-stress.json` corrects the funded Collector sample's missing harness-only reserve-unlock flag.
- These controller outcomes are diagnostics, not human win rates or device frame benchmarks. The controller does not interpret Glow Sense or Drift Sense and uses crude levitation timing. No broad baseline buff was applied from its outcomes.

The encounter-family and boss-ID engine hooks are integrated. The grounded refuge now sits on a real shallow landing just beyond the final visible terrain. Deep underground polygon-closing vertices no longer extend the flight. Its bracket lamp emits a small local circular light reaching the foundation. Both renderers draw the refuge behind the wisp and through the scene fog; the existing 1.5-second completion reveal remains.

## Boss bundles and expanded artifact capacity

- Runtime accepts all modifiers supplied by the model's 1–6 mounted artifact capacity; the remaining renderer limit of three is for companions, not artifacts.
- Sunheart Engine: +8 internal natural fuel, 0.12-second surplus recovery coefficient, two-second forward light. Shared Coil caps still apply.
- Dream Sovereign: 2.5 seconds of actual Dream pickup recovery, first waking fuel reveal, stored free Lift, +35 light radius. Replaced the old hardcoded 1.5-second Dream recovery with the modifier value; combined Dream recovery caps at four seconds per pickup.
- Hollow Covenant: +12 internal fuel on the primed direct pickup, six Glow per Dark Seed skim, 10% lower Lift cost. Replaced the old hardcoded four-Glow skim value with the modifier; at most five seeds per flight and ten internal Glow per seed when combined.
- Shared stacking bounds remain: Echo bonus at most 16 internal Glow, Dawn Loom light at most three seconds with a four-second cooldown, one stored Lift, four Lift grants, and 12 total seconds of surplus recovery per flight.
- `artifactEngineSources` maps shared triggers to the actual equipped relics. Proc state contains the actual first source ID plus `engineId` and all `sourceIds`, so boss relics can pulse in the HUD.
- The focused artifact probe verifies all three current catalog bundles, six-slot modifier aggregation, source IDs and the shared stacking bounds. Dream, overflow/light, landscape and projection probes pass. The projection fixture's funding was updated for the new advanced-node prices; its physics error remained below 5e-13.

The delayed-controller stress files predate the final shortened grounded-exit geometry and boss bundle integration. They are retained as reaction/fuel diagnostics only, not final-version human balance or phone performance measurements.
