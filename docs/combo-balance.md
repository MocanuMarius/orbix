# Companion and artifact combo review

13 November 2026. Bounded event/resource sensitivity; not human win rates or full campaign economy validation.

## Coverage

159,264 cases: all 14 legal single/pair/triple companion fleets × 316 artifact builds × three imperfect-play profiles × four seeds × three Black Hole exposures. Builds cover no artifacts, every single artifact, every artifact pair, and all triples of nine trigger-bearing artifacts. Each case is a synthetic 120-second passage with 48 fuel opportunities. Capture probabilities are 52/70/86%; power use 55/75/90%; extra corrective effort 16/8/2.5%. A ready Collector rescues 55% of assumed missed opportunities. Random draws are aligned between builds.

Production `ArtifactEffects`, `WispFlight.quickenCompanionRecovery`, `getRunModifiers`, `condenseGlow`, and `blackHoleDrainRate` are used. Black-hole approaches use safe/100/40-unit offsets along one straight 154-unit/s passage, sampled every half-second. All builds receive equivalent Vitality, Echo Sight, Kindled Touch and Dream milestones and three slots; acquisition cost is excluded.

## Findings

- No unbounded or recursive trigger loop appeared. A separate 10,000-event adversarial storm respects shared caps; generated/harmful packets do not trigger fuel engines.
- Echo Bell plus Hollow Covenant share five uses, capped at 16 internal Glow per use: 24 displayed Glow per flight, even when stacked.
- Sunspool plus Dream Sovereign share four free Lifts and one stored charge. Highest sampled saving is 8.279 displayed Glow. No levitation refill is created.
- Overflow Coil plus Sunheart share 12 seconds of fleet recovery, capped at two seconds per pickup. The production function applies that recovery to every recovering companion: up to 36 aggregate member-seconds with three companions. This intentional fleet benefit is not a 12-second sum across members. Dream recharge is separate and limited by finite opening pickups.
- Dawn Loom and Sunheart share a four-second flash cooldown and a three-second duration cap. Stacking sources does not duplicate triggers.
- Sunheart + Glass Lantern is a powerful but finite surplus engine, paid for by real pickups and higher Lift effort. No forced nerf is justified by the bounded-trigger results.
- Implemented one intentional synergy: Edging Pulse now counts as temporary light for Sunspool. The existing four-grant cap remains.

## Per-fleet envelope

Ranges combine all profiles, artifacts and hazard exposures. They are not predicted normal-level earnings. Starved taps count insufficient-fuel checks, not deaths.

| Fleet | Cases | Packed Light min–max | Max work-trigger Glow | Max free-Lift Glow saved | Max starved taps |
|---|---:|---:|---:|---:|---:|
| collector | 11376 | 100–506 | 24 | 8.279 | 0 |
| protector | 11376 | 9–401 | 24 | 8.279 | 11 |
| swift | 11376 | 16–423 | 24 | 8.279 | 9 |
| leveler | 11376 | 44–466 | 24 | 8.279 | 1 |
| collector+protector | 11376 | 86–484 | 24 | 8.279 | 0 |
| collector+swift | 11376 | 100–506 | 24 | 8.279 | 0 |
| collector+leveler | 11376 | 128–549 | 24 | 8.279 | 0 |
| protector+swift | 11376 | 9–401 | 24 | 8.279 | 11 |
| protector+leveler | 11376 | 30–445 | 24 | 8.279 | 3 |
| swift+leveler | 11376 | 44–466 | 24 | 8.279 | 1 |
| collector+protector+swift | 11376 | 86–484 | 24 | 8.279 | 0 |
| collector+protector+leveler | 11376 | 113–528 | 24 | 8.279 | 0 |
| collector+swift+leveler | 11376 | 128–549 | 24 | 8.279 | 0 |
| protector+swift+leveler | 11376 | 30–445 | 24 | 8.279 | 3 |

## Interpretation and remaining work

Collector rescues and Space Timer effort savings improve these schedules. Protector safety is undervalued because deaths are not imposed; Runner geometry and faster crossings are not represented. This does not establish companion parity or justify role nerfs.

Successful four-second Dream openings and periodic Edging opportunities are optimistic assumptions. Full route geometry, human timing, acquisition costs, Night Gardener skimming and vision-driven changes to pickup probability remain outside this sweep. Other passive triples and four-to-six-artifact endgame inventories are not exhaustively enumerated; shared runtime caps still apply. Complete campaign balance requires actual route inventories and playtesting, rather than treating this event harness as a flight bot.

Reproduce with `node scripts/combo-balance-probe.mjs`. Generated report: `work/combo-balance.json` (ignored).
