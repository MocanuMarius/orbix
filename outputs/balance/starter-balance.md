# Starter card balance (realistic pilots; generated 2026-11-19)

Setup: first 6 stops of Map 1 flown as a sequence, true starting state (3 hearts, starting Meter, Lift Guide + the card under test, nothing else), Rests taken when offered and the Meter is under 88% (old pilots: under 60%) or a heart is lost, a fall costs a heart and the stop is retried (the pilot remembers where Sparks were), the run ends at 0 hearts. 20 seeded runs per (condition x pilot); every card run is paired with the same run seed for its baseline. Differences are paired means ± standard error; under 2 SE is marked (noise). Worth = extra Stored Sparks + 15 x hearts saved (1 heart = the Workshop's base price to restore a resource).

Pilots. NEW (scripts/player-pilot.mjs, scripts/human-flight-planner.mjs planPlayerLift): same human limits as the old ones (reaction 350/250/150 ms, observation-limited view, drops) but they Lift only when it pays: each Lift is scheduled near the efficient moment (fall speed back at the Lift's launch speed, which is where Lift Guide's arrow is open) with Gaussian timing error (sigma 110/70/40 ms with the arrow, x1.6-2 without), glide inside a tolerant altitude band, ride lower and spend less when the Meter is low, never climb to the top fifth of the screen, chase Sparks more greedily when low, play safer on the last heart, remember Spark positions and shrink errors on a retried stop, take a Rest whenever the Meter is under 88%. Slips (late press) 12/6/2% and insurance taps 10/4/1% on routine Lifts. Card-aware: Courier Cord = steer for Sparks inside the Collector's reach (the Collector's fetch makes a Delivery); Skim Line = reward holding within 40 units of terrain when the margin is safe (not on the last heart; strength 0.5/1/1.5 by skill); Meter Mark = keep collecting at a full Meter (each natural Overfill pays); Pulse Reader = prefer Spark clusters so its Pulse crosses uncollected Sparks; Finish Flag = nothing. OLD = human350/250/150, card-blind; the arrow is emulated by converting off-cue Lifts to paid on-cue Lifts until the share reaches 40/65/85%.

## 1. Survival (Lift Guide alone, first 6 stops)

| pilot | cleared of 6 | died before stop 6 | hearts lost | refused Lifts / run | Lifts / flight | spam share (<0.75 s) | on-cue share | Sparks taken (share of seen) | s under 20% Meter |
|---|---|---|---|---|---|---|---|---|---|
| player-beginner | 3.2 | 15/20 | 3.8 | 1.5 | 50.2 | 7% | 68% | 84% | 8.3 |
| player-average | 4.9 | 10/20 | 3.25 | 3.4 | 56.9 | 5% | 70% | 86% | 10.1 |
| player-good | 4.5 | 10/20 | 2.15 | 3.2 | 57.6 | 5% | 70% | 87% | 8.1 |

Deaths by cause (flights failed, Lift Guide alone): player-beginner fuel 17 / terrain 0 / ceiling-floor 0 / obstacle 59; player-average fuel 22 / terrain 0 / ceiling-floor 0 / obstacle 43; player-good fuel 21 / terrain 0 / ceiling-floor 0 / obstacle 22.

### Survival by condition (cleared of 6 / died-runs / hearts lost / refused Lifts)

| condition | player-beginner | player-average | player-good |
|---|---|---|---|
| none | 0.6 / 20/20 / 3.2 / 3.2 | 1.2 / 20/20 / 3.4 / 5.1 | 2 / 20/20 / 3.5 / 8.9 |
| LG | 3.2 / 15/20 / 3.8 / 1.5 | 4.9 / 10/20 / 3.3 / 3.4 | 4.5 / 10/20 / 2.2 / 3.2 |
| LGc | 2 / 18/20 / 3.9 / 3.1 | 4.1 / 13/20 / 3.4 / 4.6 | 3.2 / 15/20 / 2.9 / 5.6 |
| LG+skim-line | 3.1 / 16/20 / 3.8 / 1.3 | 4.5 / 11/20 / 3.2 / 3.7 | 4.8 / 10/20 / 2 / 3.8 |
| LG+pulse-reader | 3.6 / 14/20 / 3.5 / 1.4 | 4.2 / 12/20 / 2.8 / 1.7 | 5.3 / 6/20 / 1.8 / 2.9 |
| LG+courier-cord | 3.4 / 15/20 / 3.8 / 1.4 | 4.7 / 10/20 / 3.2 / 3.5 | 4.5 / 10/20 / 2.2 / 3.3 |
| LG+meter-mark | 3.2 / 15/20 / 3.8 / 1.5 | 4.9 / 10/20 / 3.3 / 3.4 | 4.5 / 10/20 / 2.2 / 3.2 |
| LG+finish-flag | 3.2 / 15/20 / 3.8 / 1.5 | 4.9 / 10/20 / 3.3 / 3.4 | 4.5 / 10/20 / 2.2 / 3.2 |
| LG+skim-line:aware | 3 / 16/20 / 3.9 / 1.5 | 4.6 / 11/20 / 2.9 / 2.6 | 4 / 14/20 / 3.1 / 3.6 |
| LG+pulse-reader:aware | 3.6 / 14/20 / 3.5 / 1.4 | 4.2 / 12/20 / 2.8 / 1.7 | 5.3 / 6/20 / 1.8 / 2.9 |
| LG+courier-cord:aware | 3.5 / 15/20 / 3.9 / 1.9 | 4.9 / 10/20 / 3.1 / 3.5 | 4.8 / 9/20 / 2.2 / 4 |
| LG+meter-mark:aware | 3.2 / 15/20 / 3.8 / 1.5 | 4.9 / 10/20 / 3.3 / 3.4 | 4.5 / 10/20 / 2.2 / 3.2 |
| LG+finish-flag:aware | 3.2 / 15/20 / 3.8 / 1.5 | 4.9 / 10/20 / 3.3 / 3.4 | 4.5 / 10/20 / 2.2 / 3.2 |
| LGc+skim-line:aware | 1.7 / 17/20 / 3.4 / 2.5 | 3.5 / 15/20 / 3.4 / 4.6 | 3.7 / 14/20 / 3.4 / 6.7 |
| LGc+pulse-reader:aware | 2.8 / 17/20 / 3.6 / 2.6 | 4.4 / 12/20 / 2.9 / 3 | 5.2 / 8/20 / 2 / 4.8 |
| LGc+courier-cord:aware | 2.1 / 19/20 / 3.9 / 3.1 | 3.6 / 15/20 / 3.5 / 4.9 | 3.8 / 13/20 / 3 / 6.5 |
| LGc+meter-mark:aware | 2 / 18/20 / 3.9 / 3.1 | 4.1 / 13/20 / 3.4 / 4.6 | 3.2 / 15/20 / 2.9 / 5.6 |
| LGc+finish-flag:aware | 2 / 18/20 / 3.9 / 3.1 | 4.1 / 13/20 / 3.4 / 4.6 | 3.2 / 15/20 / 2.9 / 5.6 |
| LGc+courier-cord +3 Sparks/Delivery:aware | 2.4 / 17/20 / 3.9 / 2.9 | 3.4 / 15/20 / 3.2 / 4.5 | 4.3 / 11/20 / 2.9 / 6 |
| LGc+courier-cord +6 Sparks/Delivery:aware | 2.4 / 17/20 / 3.8 / 2.7 | 3.7 / 14/20 / 3.3 / 4 | 4.4 / 9/20 / 2.7 / 5.4 |
| LGc+skim-line +3 Sparks/Skim:aware | 2 / 17/20 / 3.5 / 2.5 | 3.5 / 15/20 / 3.2 / 3.3 | 3.9 / 15/20 / 3.4 / 6.8 |
| LGc+skim-line +6 Sparks/Skim:aware | 1.8 / 18/20 / 3.5 / 2.4 | 3.8 / 14/20 / 3.2 / 3.4 | 4.4 / 12/20 / 3 / 5.2 |
| LGc+finish-flag +4 Stored, refill 10 Sparks:aware | 2 / 18/20 / 3.8 / 3.1 | 3.9 / 14/20 / 3.1 / 4.1 | 3.3 / 15/20 / 2.7 / 3.8 |
| LGc+finish-flag +4 Stored, refill 20 Sparks:aware | 2 / 18/20 / 3.8 / 3 | 3.9 / 14/20 / 3.1 / 4.4 | 3.3 / 15/20 / 2.7 / 3.7 |
| LGc+courier-cord +3 Sparks +3 Stored/Delivery:aware | 2.4 / 17/20 / 3.9 / 2.9 | 3.4 / 15/20 / 3.2 / 4.5 | 4.3 / 11/20 / 2.9 / 6 |
| LGc+courier-cord +4 Sparks +2 Stored/Delivery:aware | 2.4 / 17/20 / 3.9 / 3 | 3.4 / 15/20 / 3.1 / 4.3 | 4.3 / 10/20 / 2.8 / 6.1 |
| LGc+finish-flag +3 Stored, refill 15 Sparks:aware | 2 / 18/20 / 3.8 / 3 | 3.9 / 14/20 / 3.1 / 4.4 | 3.3 / 15/20 / 2.7 / 3.7 |
| LGc+finish-flag +5 Stored, refill 30 Sparks (full):aware | 2 / 18/20 / 3.8 / 3 | 3.9 / 14/20 / 3.1 / 4.4 | 3.3 / 15/20 / 2.7 / 3.7 |
| LGc+skim-line +3 Sparks +2 Stored/Skim:aware | 2 / 17/20 / 3.5 / 2.5 | 3.5 / 15/20 / 3.2 / 3.3 | 3.9 / 15/20 / 3.4 / 6.8 |
| LGc+meter-mark +1 Stored per Overfill:aware | 2 / 18/20 / 3.9 / 3.1 | 4.1 / 13/20 / 3.4 / 4.6 | 3.2 / 15/20 / 2.9 / 5.6 |
| LGc+meter-mark +2 Stored per Overfill:aware | 2 / 18/20 / 3.9 / 3.1 | 4.1 / 13/20 / 3.4 / 4.6 | 3.2 / 15/20 / 2.9 / 5.6 |
| LGc+courier-cord +5 Sparks +4 Stored/Delivery (2nd pass):aware | 2.4 / 17/20 / 3.8 / 2.8 | 3.4 / 15/20 / 3.2 / 4.4 | 4.4 / 9/20 / 2.8 / 6.1 |
| LGc+courier-cord +6 Sparks +5 Stored/Delivery (2nd pass):aware | 2.4 / 17/20 / 3.8 / 2.7 | 3.7 / 14/20 / 3.3 / 4 | 4.4 / 9/20 / 2.7 / 5.4 |
| LGc+courier-cord +8 Sparks +6 Stored/Delivery (2nd pass):aware | 2.4 / 17/20 / 3.8 / 2.7 | 4 / 13/20 / 3.3 / 3.6 | 4.4 / 9/20 / 2.7 / 5.4 |
| LGc+courier-cord +8 Sparks +8 Stored/Delivery (2nd pass):aware | 2.4 / 17/20 / 3.8 / 2.7 | 4 / 13/20 / 3.3 / 3.6 | 4.4 / 9/20 / 2.7 / 5.4 |
| LGc+skim-line +6 Sparks +4 Stored/Skim (2nd pass):aware | 1.8 / 18/20 / 3.5 / 2.4 | 3.8 / 14/20 / 3.2 / 3.4 | 4.4 / 12/20 / 3 / 5.2 |
| LGc+skim-line +8 Sparks +6 Stored/Skim (2nd pass):aware | 1.8 / 18/20 / 3.5 / 2.4 | 4.2 / 13/20 / 3.2 / 3.3 | 4.2 / 12/20 / 2.9 / 5.5 |
| LGc+skim-line +10 Sparks +8 Stored/Skim (2nd pass):aware | 1.8 / 18/20 / 3.5 / 2.5 | 4 / 14/20 / 3.3 / 3.1 | 4.2 / 12/20 / 2.9 / 5.5 |
| LGc+finish-flag +8 Stored, refill to full (2nd pass):aware | 2 / 18/20 / 3.8 / 3 | 3.9 / 14/20 / 3.1 / 4.4 | 3.3 / 15/20 / 2.7 / 3.7 |
| LGc+finish-flag +12 Stored, refill to full (2nd pass):aware | 2 / 18/20 / 3.8 / 3 | 3.9 / 14/20 / 3.1 / 4.4 | 3.3 / 15/20 / 2.7 / 3.7 |
| LGc+finish-flag +16 Stored, refill to full (2nd pass):aware | 2 / 18/20 / 3.8 / 3 | 3.9 / 14/20 / 3.1 / 4.4 | 3.3 / 15/20 / 2.7 / 3.7 |
| SOLO:lift-guide coin toss | 2 / 18/20 / 3.9 / 3.1 | 4.1 / 13/20 / 3.4 / 4.6 | 3.2 / 15/20 / 2.9 / 5.6 |
| SOLO:skim-line (released):aware | 1 / 20/20 / 3.5 / 3 | 1.7 / 19/20 / 3.7 / 4.5 | 3 / 16/20 / 3.2 / 5.7 |
| SOLO:pulse-reader (released):aware | 1 / 20/20 / 3.2 / 2.5 | 2.5 / 18/20 / 3.7 / 5.7 | 3.1 / 16/20 / 3.4 / 8.9 |
| SOLO:courier-cord (released):aware | 0.4 / 20/20 / 3.2 / 3.7 | 0.7 / 20/20 / 3.2 / 5 | 0.8 / 20/20 / 3.2 / 7.8 |
| SOLO:courier-cord (released):blind | 0.6 / 20/20 / 3.2 / 3.3 | 1.2 / 20/20 / 3.4 / 5.2 | 1.7 / 20/20 / 3.4 / 9 |
| SOLO:meter-mark (released):aware | 0.6 / 20/20 / 3.2 / 3.2 | 1.2 / 20/20 / 3.4 / 5.1 | 2 / 20/20 / 3.5 / 8.9 |
| SOLO:finish-flag (released):aware | 0.6 / 20/20 / 3.2 / 3.2 | 1.2 / 20/20 / 3.4 / 5.1 | 2 / 20/20 / 3.5 / 8.9 |
| SOLO:courier-cord (a) +1 Spark:aware | 0.3 / 20/20 / 3.1 / 3.5 | 0.6 / 20/20 / 3.2 / 5.5 | 0.8 / 20/20 / 3.2 / 7.8 |
| SOLO:courier-cord (a) +1 Spark:blind | 0.7 / 20/20 / 3.3 / 3.8 | 1.6 / 20/20 / 3.6 / 4.8 | 1.9 / 20/20 / 3.5 / 8.7 |
| SOLO:courier-cord (b) +1 Stored:aware | 0.4 / 20/20 / 3.2 / 3.7 | 0.7 / 20/20 / 3.2 / 5 | 0.8 / 20/20 / 3.2 / 7.8 |
| SOLO:courier-cord (b) +1 Stored:blind | 0.6 / 20/20 / 3.2 / 3.3 | 1.2 / 20/20 / 3.4 / 5.2 | 1.7 / 20/20 / 3.4 / 9 |
| SOLO:courier-cord (c) +2 Stored:aware | 0.4 / 20/20 / 3.2 / 3.7 | 0.7 / 20/20 / 3.2 / 5 | 0.8 / 20/20 / 3.2 / 7.8 |
| SOLO:courier-cord (c) +2 Stored:blind | 0.6 / 20/20 / 3.2 / 3.3 | 1.2 / 20/20 / 3.4 / 5.2 | 1.7 / 20/20 / 3.4 / 9 |
| SOLO:courier-cord (d) +2 Sparks +1 Stored:aware | 0.5 / 20/20 / 3.1 / 3.6 | 0.6 / 20/20 / 3.2 / 5 | 0.9 / 20/20 / 3.2 / 7.2 |
| SOLO:courier-cord (d) +2 Sparks +1 Stored:blind | 0.9 / 20/20 / 3.4 / 3.6 | 1.9 / 19/20 / 3.7 / 5.3 | 2 / 20/20 / 3.6 / 9.8 |
| SOLO:skim-line +3 Sparks +2 Stored:aware | 1.1 / 20/20 / 3.5 / 3.1 | 1.6 / 19/20 / 3.6 / 4.7 | 3 / 16/20 / 3.1 / 5.3 |
| SOLO:skim-line +6 Sparks +4 Stored:aware | 1.3 / 20/20 / 3.5 / 3.1 | 1.9 / 18/20 / 3.6 / 4.5 | 3 / 16/20 / 3.1 / 5.5 |
| SOLO:skim-line +10 Sparks +8 Stored:aware | 1.1 / 20/20 / 3.5 / 3 | 2 / 18/20 / 3.6 / 4.5 | 3 / 16/20 / 3.1 / 5.2 |
| SOLO:finish-flag +5 Stored, full refill:aware | 0.8 / 20/20 / 3.4 / 3 | 2.1 / 18/20 / 3.6 / 4.9 | 2.5 / 19/20 / 3.5 / 8.6 |
| SOLO:finish-flag +8 Stored, full refill:aware | 0.8 / 20/20 / 3.4 / 3 | 2.1 / 18/20 / 3.6 / 4.9 | 2.5 / 19/20 / 3.5 / 8.6 |
| SOLO:finish-flag +12 Stored, full refill:aware | 0.8 / 20/20 / 3.4 / 3 | 2.1 / 18/20 / 3.6 / 4.9 | 2.5 / 19/20 / 3.5 / 8.6 |
| SOLO:meter-mark +1 Stored per Overfill:aware | 0.6 / 20/20 / 3.2 / 3.2 | 1.2 / 20/20 / 3.4 / 5.1 | 2 / 20/20 / 3.5 / 8.9 |
| SOLO:meter-mark +2 Stored per Overfill:aware | 0.6 / 20/20 / 3.2 / 3.2 | 1.2 / 20/20 / 3.4 / 5.1 | 2 / 20/20 / 3.5 / 8.9 |

## 2. Worth, realistic pilots, today's released cards (baseline: Lift Guide alone)

Lift Guide today pays +1 Spark on every on-cue Lift.

| card | player-beginner | player-average | player-good | weighted | x T |
|---|---|---|---|---|---|
| Lift Guide (today: pays on every on-cue Lift) vs no card | 92.6 ± 16.6 | 157.3 ± 18.8 | 141.4 ± 23.1 | 141.3 ± 15.1 | 1 |
| Skim Line (today), card-blind pilot | -3.9 ± 18.7 (noise) | -10.6 ± 16.6 (noise) | 15.3 ± 21.4 (noise) | 5.6 ± 13.9 | 0.04 |
| Pulse Reader (today), card-blind pilot | 23.4 ± 22.8 (noise) | -11.2 ± 20.1 (noise) | 48.2 ± 20 | 27.9 ± 13.6 | 0.2 |
| Courier Cord (today), card-blind pilot | 7.5 ± 5.2 (noise) | -2.6 ± 8.1 (noise) | 0.6 ± 0.2 | 0.3 ± 2.5 | 0 |
| Meter Mark (today), card-blind pilot | 39.6 ± 6.5 | 67.8 ± 5.3 | 60 ± 5.3 | 60.3 ± 3.6 | 0.43 |
| Finish Flag (today), card-blind pilot | 6.3 ± 1 | 9.7 ± 0.6 | 9 ± 0.8 | 8.9 ± 0.5 | 0.06 |
| Skim Line (today), card-aware pilot | -8.6 ± 19.5 (noise) | -10.5 ± 14.1 (noise) | -46.6 ± 29.9 (noise) | -32 ± 18.5 | -0.23 |
| Pulse Reader (today), card-aware pilot | 23.4 ± 22.8 (noise) | -11.2 ± 20.1 (noise) | 48.2 ± 20 | 27.9 ± 13.6 | 0.2 |
| Courier Cord (today), card-aware pilot | 10.2 ± 13.8 (noise) | 3 ± 9.2 (noise) | 12.8 ± 13.2 (noise) | 9.5 ± 8.5 | 0.07 |
| Meter Mark (today), card-aware pilot | 39.6 ± 6.5 | 67.8 ± 5.3 | 60 ± 5.3 | 60.3 ± 3.6 | 0.43 |
| Finish Flag (today), card-aware pilot | 6.3 ± 1 | 9.7 ± 0.6 | 9 ± 0.8 | 8.9 ± 0.5 | 0.06 |

T = weighted worth of the first row = 141.3; target band 0.8x-1.25x = 113-176.6.

## 3. Worth in the coin-toss world (baseline: coin-toss Lift Guide alone) and modelled boosts

T is the coin-toss Lift Guide's weighted worth. Modelled rows inject the payout inside this script (the game does not have them).

| card | player-beginner | player-average | player-good | weighted | x T |
|---|---|---|---|---|---|
| Lift Guide with 50% coin toss (modelled: payout halved) vs no card | 40.4 ± 15.1 | 107.7 ± 17.5 | 62.4 ± 19.3 | 73.8 ± 12.8 | 1 |
| Skim Line (today), aware, next to coin-toss Lift Guide | 0.4 ± 12.8 (noise) | -21.8 ± 16.7 (noise) | 8.4 ± 23.4 (noise) | -1.5 ± 15 | -0.02 |
| Pulse Reader (today), aware, next to coin-toss Lift Guide | 41.5 ± 18.1 | 32.1 ± 18.8 (noise) | 103.2 ± 21.8 | 75.7 ± 14.4 | 1.03 |
| Courier Cord (today), aware, next to coin-toss Lift Guide | 1.3 ± 7.7 (noise) | -17.3 ± 11.4 (noise) | 25.4 ± 19 (noise) | 10.2 ± 11.9 | 0.14 |
| Meter Mark (today), aware, next to coin-toss Lift Guide | 20.6 ± 5.9 | 42.3 ± 4.8 | 33.4 ± 5.6 | 34.8 ± 3.7 | 0.47 |
| Finish Flag (today), aware, next to coin-toss Lift Guide | 3.9 ± 0.8 | 8.1 ± 0.9 | 6.3 ± 0.9 | 6.6 ± 0.6 | 0.09 |
| MODEL skim-line +3 Sparks/Skim | 10.5 ± 14 (noise) | -17.8 ± 20.6 (noise) | 17.2 ± 24.4 (noise) | 6 ± 15.9 | 0.08 |
| MODEL skim-line +6 Sparks/Skim | 1.2 ± 9.1 (noise) | -4.9 ± 20.8 (noise) | 47.8 ± 26.7 (noise) | 27.3 ± 17.2 | 0.37 |
| MODEL finish-flag +4 Stored, refill 10 Sparks | 13.9 ± 7.6 (noise) | 23.9 ± 18.7 (noise) | 29.8 ± 25.4 (noise) | 26.4 ± 16.3 | 0.36 |
| MODEL finish-flag +4 Stored, refill 20 Sparks | 15.1 ± 7.9 (noise) | 25.3 ± 18.8 (noise) | 30.8 ± 25.5 (noise) | 27.5 ± 16.3 | 0.37 |
| MODEL finish-flag +3 Stored, refill 15 Sparks | 13.2 ± 7.6 (noise) | 21.4 ± 18.5 (noise) | 27.5 ± 25.2 (noise) | 24.2 ± 16.1 | 0.33 |
| MODEL finish-flag +5 Stored, refill 30 Sparks (full) | 17.1 ± 8.1 | 29.1 ± 19 (noise) | 34 ± 25.8 (noise) | 30.8 ± 16.5 | 0.42 |
| MODEL skim-line +3 Sparks +2 Stored/Skim | 16.2 ± 15.2 (noise) | -6.1 ± 21.8 (noise) | 35.6 ± 25.2 (noise) | 21.1 ± 16.5 | 0.29 |
| MODEL meter-mark +1 Stored per Overfill | 41.1 ± 11.9 | 84.6 ± 9.7 | 66.8 ± 11.1 | 69.6 ± 7.4 | 0.94 |
| MODEL meter-mark +2 Stored per Overfill | 61.7 ± 17.8 | 126.9 ± 14.5 | 100.2 ± 16.7 | 104.4 ± 11.1 | 1.41 |
| PROPOSAL skim-line +6 Sparks +4 Stored/Skim (2nd pass) | 11.2 ± 11.2 (noise) | 20.3 ± 23.2 (noise) | 90.2 ± 29.7 | 61.3 ± 19.2 | 0.83 |
| PROPOSAL skim-line +8 Sparks +6 Stored/Skim (2nd pass) | 16.5 ± 12.5 (noise) | 55.1 ± 25 | 107.8 ± 31.9 | 82.8 ± 20.6 | 1.12 |
| PROPOSAL skim-line +10 Sparks +8 Stored/Skim (2nd pass) | 21.8 ± 13.9 (noise) | 58.1 ± 28.1 | 129.9 ± 33.7 | 97.5 ± 22 | 1.32 |
| PROPOSAL finish-flag +8 Stored, refill to full (2nd pass) | 22.9 ± 9 | 40.7 ± 19.9 | 43.8 ± 26.8 (noise) | 40.7 ± 17.2 | 0.55 |
| PROPOSAL finish-flag +12 Stored, refill to full (2nd pass) | 30.7 ± 10.2 | 56.1 ± 21.1 | 56.8 ± 28.2 | 53.9 ± 18.1 | 0.73 |
| PROPOSAL finish-flag +16 Stored, refill to full (2nd pass) | 38.5 ± 11.6 | 71.5 ± 22.4 | 69.8 ± 29.6 | 67.1 ± 19 | 0.91 |
| Courier Cord (today), NEW fetch-beside pilot | 1.3 ± 7.7 (noise) | -17.3 ± 11.4 (noise) | 25.4 ± 19 (noise) | 10.2 ± 11.9 | 0.14 |

T = weighted worth of the first row = 73.8; target band 0.8x-1.25x = 59-92.2.

## 3b. Worth of each starter ALONE in the Chain vs no card (owner design change: starters are alternatives)

First row is T. Every other row is one card alone, aware pilot (Courier: fetch-beside pilot). Hearts lost and died-runs per condition are in the survival-by-condition table.

| card | player-beginner | player-average | player-good | weighted | x T |
|---|---|---|---|---|---|
| Lift Guide ALONE with 50% coin toss vs no card (T) | 40.4 ± 15.1 | 107.7 ± 17.5 | 62.4 ± 19.3 | 73.8 ± 12.8 | 1 |
| Skim Line alone, released | 11.4 ± 7.4 (noise) | 11.7 ± 13.3 (noise) | 46.3 ± 18.7 | 32.4 ± 11.9 | 0.44 |
| Pulse Reader alone, released | 14.7 ± 6.3 | 48 ± 16.5 | 52.5 ± 17.2 | 47.3 ± 11.5 | 0.64 |
| Courier Cord alone, released | -8.3 ± 3.8 | -15.6 ± 8.1 (noise) | -35.5 ± 8.8 | -26.8 ± 5.8 | -0.36 |
| Meter Mark alone, released | 4.2 ± 1.5 | 8.2 ± 2.3 | 12.6 ± 2.5 | 10.4 ± 1.6 | 0.14 |
| Finish Flag alone, released | 1.2 ± 0.3 | 2.4 ± 0.6 | 3.9 ± 0.6 | 3.2 ± 0.4 | 0.04 |
| Courier Cord alone, released, card-blind | -0.1 ± 0.2 (noise) | 1 ± 3.2 (noise) | -3 ± 4.9 (noise) | -1.5 ± 3.1 | -0.02 |
| SOLO courier-cord (a) +1 Spark | -9.2 ± 4.6 (noise) | -19.4 ± 8.2 | -33.3 ± 9.4 | -26.7 ± 6.2 | -0.36 |
| SOLO courier-cord (a) +1 Spark, card-blind | 2.2 ± 2.3 (noise) | 11.3 ± 6 (noise) | -0.4 ± 3.4 (noise) | 3.3 ± 2.7 | 0.05 |
| SOLO courier-cord (b) +1 Stored | -7 ± 4 (noise) | -12.2 ± 8.3 (noise) | -31.8 ± 9.1 | -23.4 ± 6 | -0.32 |
| SOLO courier-cord (b) +1 Stored, card-blind | 0.7 ± 0.3 | 3 ± 3.4 (noise) | -0.5 ± 5 (noise) | 0.6 ± 3.2 | 0.01 |
| SOLO courier-cord (c) +2 Stored | -5.6 ± 4.2 (noise) | -8.8 ± 8.5 (noise) | -28.1 ± 9.5 | -20.1 ± 6.3 | -0.27 |
| SOLO courier-cord (c) +2 Stored, card-blind | 1.6 ± 0.5 | 5 ± 3.6 (noise) | 2 ± 5.3 (noise) | 2.8 ± 3.3 | 0.04 |
| SOLO courier-cord (d) +2 Sparks +1 Stored | -2.3 ± 6 (noise) | -16 ± 9 (noise) | -24.6 ± 8.8 | -19.8 ± 5.9 | -0.27 |
| SOLO courier-cord (d) +2 Sparks +1 Stored, card-blind | 6.8 ± 3.4 | 26 ± 10 | 2.6 ± 3.7 (noise) | 10 ± 3.7 | 0.14 |
| SOLO skim-line +3 Sparks +2 Stored | 17.6 ± 7.9 | 15.1 ± 15.4 (noise) | 65 ± 22.3 | 45.2 ± 14.2 | 0.61 |
| SOLO skim-line +6 Sparks +4 Stored | 27.4 ± 9.9 | 36.4 ± 20.5 (noise) | 80 ± 25 | 61.7 ± 16.3 | 0.84 |
| SOLO skim-line +10 Sparks +8 Stored | 30.4 ± 10.6 | 53 ± 23.2 | 111.1 ± 30.7 | 85.6 ± 19.7 | 1.16 |
| SOLO finish-flag +5 Stored, full refill | 9.8 ± 3.5 | 43.7 ± 15.7 | 35.3 ± 12.7 | 35.3 ± 9 | 0.48 |
| SOLO finish-flag +8 Stored, full refill | 12.2 ± 4 | 49.9 ± 17 | 42.7 ± 13.6 | 41.8 ± 9.6 | 0.57 |
| SOLO finish-flag +12 Stored, full refill | 15.4 ± 4.7 | 58.1 ± 18.7 | 52.5 ± 14.8 | 50.4 ± 10.5 | 0.68 |
| SOLO meter-mark +1 Stored per Overfill | 8.3 ± 3 | 16.4 ± 4.5 | 25.1 ± 4.9 | 20.8 ± 3.3 | 0.28 |
| SOLO meter-mark +2 Stored per Overfill | 12.5 ± 4.6 | 24.6 ± 6.8 | 37.7 ± 7.4 | 31.2 ± 4.9 | 0.42 |

T = weighted worth of the first row = 73.8; target band 0.8x-1.25x = 59-92.2.

## 6. Card activity per flight (new pilots; card-blind vs card-aware)

| pilot | Deliveries/flight blind -> aware (Courier Cord) | Skims/flight blind -> aware (Skim Line) | Overfills/flight blind -> aware (Meter Mark) | Pulses/flight (Pulse Reader) |
|---|---|---|---|---|
| player-beginner | 1.13 -> 1.09 | 0.83 -> 0.89 | 7.76 -> 7.76 | 12.18 |
| player-average | 1.39 -> 1.4 | 1.05 -> 1.4 | 11.26 -> 11.26 | 13.48 |
| player-good | 1.15 -> 1.19 | 1.09 -> 1.85 | 10.99 -> 10.99 | 14.85 |
