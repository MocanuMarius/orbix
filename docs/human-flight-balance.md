# Human flight balance benchmark

The flight benchmark samples the illuminated part of the current viewport. The simulated player sees a coarse terrain silhouette, Sparks and visible hazards. It considers coasting or one Lift, samples the scene periodically, sometimes overlooks a visible Spark, and commits to a delayed input. The underlying flight continues at 60 Hz during that delay.

The three scenarios assume 150, 250 and 350 ms from observation to touch, with additional cadence and jitter. They also differ in attention and planning horizon, so their relative clear rates cannot isolate reaction time. Detection thresholds and timing have not been calibrated against recorded play. A controlled visual reaction study found that response time varies with the task and the visual symbol. [Original experimental results](https://pmc.ncbi.nlm.nih.gov/articles/PMC6428657/)

## Ascension 2 opening flights

The comparison used all three starting choices on each of 12 seeds and all three timing profiles. The Collector had no purchases in the baseline. The Luminance comparison added only the first sight upgrade.

| Model | Clears in 108 attempts | Flights below one Lift | Flights with a tap denied for lack of Energy | Median warning for a visible fuel Spark |
|---|---:|---:|---:|---:|
| Previous predictive controller | 79 | 0 | Unrecorded | Unrecorded |
| Limited perception and delayed input | 69 | 3 | 2 | 1.36 s |
| Same model with the first Luminance upgrade | 61 | 5 | 4 | 1.73 s |

Warning is the estimated time until the wisp passes the Spark's horizontal position when it first exceeds the recognition threshold. The estimate includes visible Sparks the controller overlooks. The measured median pools encounters from the portions of each flight the controller reached. Luminance increased warning, while the simple targeting policy converted fewer attempts into clears. Those outcomes limit how this controller can be used to price sight upgrades. Player recordings would distinguish visibility problems from decisions to chase difficult Sparks.

Unupgraded Energy-denied taps occurred on Sunken Walk and Sky Islands (level IDs marsh-sunken-walk and cloud-sky-islands). One unupgraded attempt ended below the cost of one Lift. Skill-specific Spark Sense hints, trajectory overlays, route memorization on retry and phone-specific input latency still require separate evaluation.

## Reproduce

Run from the repository root:

    node scripts/human-simulation-probe.mjs
    node scripts/collector-opening-probe.mjs --routes --out=work/a2-limited-human.json
    node scripts/collector-opening-probe.mjs --routes --sight --out=work/a2-limited-human-sight.json

For the previous controller on the same shipped flight physics, save scripts/balance-current-flight.mjs from commit 6268fc7 into work/prior-human-controller.mjs and pass --controller=work/prior-human-controller.mjs. The report includes per-flight inputs, fuel, warning times, pickups and outcomes.
