# Starter card balance (realistic pilots; generated 2026-11-18)

Setup: first 6 stops of Map 1 flown as a sequence, true starting state (3 hearts, starting Meter, Lift Guide + the card under test, nothing else), Rests taken when offered and the Meter is under 88% (old pilots: under 60%) or a heart is lost, a fall costs a heart and the stop is retried (the pilot remembers where Sparks were), the run ends at 0 hearts. 30 seeded runs per (condition x pilot); every card run is paired with the same run seed for its baseline. Differences are paired means ± standard error; under 2 SE is marked (noise). Worth = extra Stored Sparks + 15 x hearts saved (1 heart = the Workshop's base price to restore a resource).

Pilots. NEW (scripts/player-pilot.mjs, scripts/human-flight-planner.mjs planPlayerLift): same human limits as the old ones (reaction 350/250/150 ms, observation-limited view, drops) but they Lift only when it pays: each Lift is scheduled near the efficient moment (fall speed back at the Lift's launch speed, which is where Lift Guide's arrow is open) with Gaussian timing error (sigma 110/70/40 ms with the arrow, x1.6-2 without), glide inside a tolerant altitude band, ride lower and spend less when the Meter is low, never climb to the top fifth of the screen, chase Sparks more greedily when low, play safer on the last heart, remember Spark positions and shrink errors on a retried stop, take a Rest whenever the Meter is under 88%. Slips (late press) 12/6/2% and insurance taps 10/4/1% on routine Lifts. Card-aware: Courier Cord = steer for Sparks inside the Collector's reach (the Collector's fetch makes a Delivery); Skim Line = reward holding within 40 units of terrain when the margin is safe (not on the last heart; strength 0.5/1/1.5 by skill); Meter Mark = keep collecting at a full Meter (each natural Overfill pays); Pulse Reader = prefer Spark clusters so its Pulse crosses uncollected Sparks; Finish Flag = nothing. OLD = human350/250/150, card-blind; the arrow is emulated by converting off-cue Lifts to paid on-cue Lifts until the share reaches 40/65/85%.

## 1. Survival (Lift Guide alone, first 6 stops)

| pilot | cleared of 6 | died before stop 6 | hearts lost | refused Lifts / run | Lifts / flight | spam share (<0.75 s) | on-cue share | Sparks taken (share of seen) | s under 20% Meter |
|---|---|---|---|---|---|---|---|---|---|
| player-beginner | 2.4 | 23/30 | 3.57 | 2.8 | 46.6 | 6% | 71% | 82% | 11.2 |
| player-average | 4 | 13/30 | 2.8 | 3.2 | 55 | 5% | 74% | 83% | 10.5 |
| player-good | 3.9 | 14/30 | 2.2 | 4.7 | 57.4 | 5% | 74% | 84% | 9.6 |

Deaths by cause (flights failed, Lift Guide alone): player-beginner fuel 41 / terrain 0 / ceiling-floor 0 / obstacle 66; player-average fuel 34 / terrain 1 / ceiling-floor 0 / obstacle 49; player-good fuel 41 / terrain 0 / ceiling-floor 0 / obstacle 25.

### Survival by condition (cleared of 6 / died-runs / hearts lost / refused Lifts)

| condition | player-beginner | player-average | player-good |
|---|---|---|---|
| none | 0.6 / 30/30 / 3.2 / 3.3 | 1.5 / 27/30 / 3.3 / 6.2 | 2 / 27/30 / 3.4 / 8.8 |
| LG | 2.4 / 23/30 / 3.6 / 2.8 | 4 / 13/30 / 2.8 / 3.2 | 3.9 / 14/30 / 2.2 / 4.7 |
| LGc | 1.7 / 28/30 / 3.6 / 3.8 | 2.8 / 21/30 / 3.4 / 5.7 | 3.5 / 19/30 / 2.8 / 8.4 |
| LG+skim-line | 2.6 / 23/30 / 3.8 / 2.4 | 3.8 / 14/30 / 2.5 / 2.9 | 4 / 11/30 / 2.1 / 4.4 |
| LG+pulse-reader | 2.9 / 20/30 / 3.4 / 1.6 | 4.3 / 7/30 / 2.2 / 1.4 | 4.3 / 9/30 / 1.6 / 3 |
| LG+courier-cord | 2.7 / 22/30 / 3.6 / 2.7 | 4 / 13/30 / 2.6 / 2.9 | 3.9 / 14/30 / 2.2 / 4.7 |
| LG+meter-mark | 2.4 / 23/30 / 3.6 / 2.8 | 4 / 13/30 / 2.8 / 3.2 | 3.9 / 14/30 / 2.2 / 4.7 |
| LG+finish-flag | 2.4 / 23/30 / 3.6 / 2.8 | 4 / 13/30 / 2.8 / 3.2 | 3.9 / 14/30 / 2.2 / 4.7 |
| LG+skim-line:aware | 2.9 / 22/30 / 3.9 / 3.3 | 3.3 / 19/30 / 3 / 3 | 3.5 / 17/30 / 2.8 / 3.9 |
| LG+pulse-reader:aware | 2.9 / 20/30 / 3.4 / 1.6 | 4.3 / 7/30 / 2.2 / 1.4 | 4.3 / 9/30 / 1.6 / 3 |
| LG+courier-cord:aware | 2.7 / 21/30 / 3.5 / 2.7 | 3.9 / 14/30 / 2.8 / 3.2 | 3.7 / 16/30 / 2.4 / 4.8 |
| LG+meter-mark:aware | 2.4 / 23/30 / 3.5 / 2.7 | 3.9 / 14/30 / 3 / 3.8 | 3.7 / 15/30 / 2.3 / 3.6 |
| LG+finish-flag:aware | 2.4 / 23/30 / 3.6 / 2.8 | 4 / 13/30 / 2.8 / 3.2 | 3.9 / 14/30 / 2.2 / 4.7 |
| LGc+skim-line:aware | 1.9 / 28/30 / 3.7 / 3.6 | 2.9 / 24/30 / 3.5 / 5.8 | 2.5 / 23/30 / 3.5 / 6.4 |
| LGc+pulse-reader:aware | 2.5 / 23/30 / 3.6 / 2.9 | 3.9 / 12/30 / 2.7 / 3.5 | 3.9 / 16/30 / 2.4 / 6 |
| LGc+courier-cord:aware | 1.7 / 29/30 / 3.7 / 4.2 | 2.6 / 22/30 / 3.4 / 5.5 | 3.5 / 19/30 / 2.7 / 7.9 |
| LGc+meter-mark:aware | 1.4 / 30/30 / 3.7 / 3.7 | 3 / 20/30 / 3.2 / 5.6 | 2.5 / 25/30 / 3.2 / 8.4 |
| LGc+finish-flag:aware | 1.7 / 28/30 / 3.6 / 3.8 | 2.8 / 21/30 / 3.4 / 5.7 | 3.5 / 19/30 / 2.8 / 8.4 |
| LGc+courier-cord +3 Sparks/Delivery:aware | 1.7 / 29/30 / 3.7 / 4.1 | 2.8 / 20/30 / 3.4 / 5 | 3.6 / 17/30 / 2.5 / 6.9 |
| LGc+courier-cord +6 Sparks/Delivery:aware | 2.1 / 27/30 / 3.7 / 4 | 2.9 / 20/30 / 3.1 / 4.8 | 3.6 / 17/30 / 2.4 / 6.6 |
| LGc+skim-line +3 Sparks/Skim:aware | 2 / 27/30 / 3.8 / 3.2 | 3.3 / 22/30 / 3.3 / 5.3 | 2.6 / 22/30 / 3.1 / 5.1 |
| LGc+skim-line +6 Sparks/Skim:aware | 2 / 27/30 / 3.7 / 3.2 | 2.8 / 23/30 / 3.2 / 5.3 | 2.9 / 20/30 / 2.7 / 4.5 |
| LGc+finish-flag +4 Stored, refill 10 Sparks:aware | 1.8 / 28/30 / 3.6 / 2.9 | 3 / 22/30 / 3.4 / 4.7 | 3.4 / 18/30 / 2.7 / 7.1 |
| LGc+finish-flag +4 Stored, refill 20 Sparks:aware | 2.3 / 26/30 / 3.7 / 3.4 | 3 / 21/30 / 3.2 / 5.1 | 3.8 / 15/30 / 2.3 / 6.5 |
| LGc+courier-cord: +6 Sparks and +5 Stored per Delivery:aware | 2.1 / 27/30 / 3.7 / 4 | 2.9 / 20/30 / 3.1 / 4.8 | 3.6 / 17/30 / 2.4 / 6.6 |
| LGc+skim-line: +6 Sparks and +4 Stored per Skim (aware):aware | 2 / 27/30 / 3.7 / 3.2 | 2.8 / 23/30 / 3.2 / 5.3 | 2.9 / 20/30 / 2.7 / 4.5 |
| LGc+skim-line: +6 Sparks and +4 Stored per Skim (blind):aware | 1.7 / 27/30 / 3.5 / 3.3 | 2.7 / 23/30 / 3.3 / 5.2 | 3.5 / 19/30 / 2.8 / 7.5 |
| LGc+finish-flag: +6 Stored and Meter refilled to full:aware | 2.3 / 26/30 / 3.7 / 3.4 | 3 / 21/30 / 3.2 / 5.1 | 3.8 / 15/30 / 2.3 / 6.5 |

## 2. Worth, realistic pilots, today's released cards (baseline: Lift Guide alone)

Lift Guide today pays +1 Spark on every on-cue Lift.

| card | player-beginner | player-average | player-good | weighted | x T |
|---|---|---|---|---|---|
| Lift Guide (today: pays on every on-cue Lift) vs no card | 68.4 ± 11.7 | 108.2 ± 13.9 | 103.8 ± 14.9 | 101.6 ± 9.9 | 1 |
| Skim Line (today), card-blind pilot | -2 ± 12.9 (noise) | -2.1 ± 7.3 (noise) | 6.5 ± 11.6 (noise) | 3.1 ± 7.4 | 0.03 |
| Pulse Reader (today), card-blind pilot | 26 ± 15.7 (noise) | 29.2 ± 16 (noise) | 34.2 ± 12 | 31.9 ± 8.8 | 0.31 |
| Courier Cord (today), card-blind pilot | 8.9 ± 7.1 (noise) | 3.3 ± 5.7 (noise) | 0.3 ± 0.1 | 2.1 ± 1.9 | 0.02 |
| Meter Mark (today), card-blind pilot | 31.7 ± 4.3 | 52.1 ± 4 | 51.3 ± 3.6 | 49.6 ± 2.5 | 0.49 |
| Finish Flag (today), card-blind pilot | 4.9 ± 0.6 | 7.9 ± 0.5 | 7.7 ± 0.5 | 7.5 ± 0.3 | 0.07 |
| Skim Line (today), card-aware pilot | 6.2 ± 12.4 (noise) | -29.1 ± 13.4 | -31 ± 11.7 | -26.7 ± 8.2 | -0.26 |
| Pulse Reader (today), card-aware pilot | 26 ± 15.7 (noise) | 29.2 ± 16 (noise) | 34.2 ± 12 | 31.9 ± 8.8 | 0.31 |
| Courier Cord (today), card-aware pilot | 9.9 ± 5.1 (noise) | -3.5 ± 9.4 (noise) | -8.5 ± 6 (noise) | -5.2 ± 4.6 | -0.05 |
| Meter Mark (today), card-aware pilot | 33.9 ± 16.6 | 53 ± 14.8 | 46.1 ± 14.6 | 46.9 ± 10 | 0.46 |
| Finish Flag (today), card-aware pilot | 4.9 ± 0.6 | 7.9 ± 0.5 | 7.7 ± 0.5 | 7.5 ± 0.3 | 0.07 |

T = weighted worth of the first row = 101.6; target band 0.8x-1.25x = 81.3-127.

## 3. Worth in the coin-toss world (baseline: coin-toss Lift Guide alone) and modelled boosts

T is the coin-toss Lift Guide's weighted worth. Modelled rows inject the payout inside this script (the game does not have them).

| card | player-beginner | player-average | player-good | weighted | x T |
|---|---|---|---|---|---|
| Lift Guide with 50% coin toss (modelled: payout halved) vs no card | 33.5 ± 8.7 | 49.3 ± 11.8 | 69.5 ± 13.7 | 59.8 ± 9 | 1 |
| Skim Line (today), aware, next to coin-toss Lift Guide | 9.5 ± 7 (noise) | -2.6 ± 13.1 (noise) | -47.6 ± 11.3 | -28.4 ± 7.9 | -0.47 |
| Pulse Reader (today), aware, next to coin-toss Lift Guide | 33.2 ± 10.2 | 56.5 ± 14.6 | 23.5 ± 11.5 | 34.4 ± 8.2 | 0.57 |
| Courier Cord (today), aware, next to coin-toss Lift Guide | 2.6 ± 4.7 (noise) | -7.4 ± 5.8 (noise) | -0.3 ± 6.4 (noise) | -2.1 ± 4.2 | -0.04 |
| Meter Mark (today), aware, next to coin-toss Lift Guide | 2.5 ± 7.6 (noise) | 45.5 ± 16.3 | -6.4 ± 14.7 (noise) | 10.1 ± 10.1 | 0.17 |
| Finish Flag (today), aware, next to coin-toss Lift Guide | 3.4 ± 0.5 | 5.6 ± 0.6 | 6.9 ± 0.5 | 6.2 ± 0.4 | 0.1 |
| MODEL courier-cord +3 Sparks/Delivery | 2.4 ± 7.1 (noise) | -0.8 ± 6.9 (noise) | 7 ± 7.8 (noise) | 4.2 ± 5.2 | 0.07 |
| MODEL courier-cord +6 Sparks/Delivery | 14.5 ± 9.3 (noise) | 8 ± 8.9 (noise) | 9.8 ± 8.1 (noise) | 9.7 ± 5.6 | 0.16 |
| MODEL skim-line +3 Sparks/Skim | 11.1 ± 10.1 (noise) | 15.3 ± 11 (noise) | -41.6 ± 13.1 | -19.2 ± 8.6 | -0.32 |
| MODEL skim-line +6 Sparks/Skim | 8.6 ± 11.7 (noise) | 3.1 ± 14 (noise) | -18.8 ± 16.2 (noise) | -9.5 ± 10.7 | -0.16 |
| MODEL finish-flag +4 Stored, refill 10 Sparks | 16.7 ± 9.2 (noise) | 20.8 ± 9.6 | 19.8 ± 11 (noise) | 19.8 ± 7.3 | 0.33 |
| MODEL finish-flag +4 Stored, refill 20 Sparks | 33.6 ± 9.1 | 23.8 ± 11.8 | 37.6 ± 10.8 | 33.1 ± 7.5 | 0.55 |
| PROPOSAL courier-cord: +6 Sparks and +5 Stored per Delivery | 38.5 ± 12.2 | 39.5 ± 10.7 | 46.1 ± 10.2 | 43.4 ± 7 | 0.72 |
| PROPOSAL skim-line: +6 Sparks and +4 Stored per Skim (aware) | 19.4 ± 13 (noise) | 24.1 ± 15.5 (noise) | 15.2 ± 19 (noise) | 18.3 ± 12.4 | 0.31 |
| PROPOSAL skim-line: +6 Sparks and +4 Stored per Skim (blind) | 14.3 ± 8.8 (noise) | 12.9 ± 10 (noise) | 21.1 ± 13.7 (noise) | 18 ± 8.8 | 0.3 |
| PROPOSAL finish-flag: +6 Stored and Meter refilled to full | 38.3 ± 9.6 | 29.9 ± 12.1 | 45.1 ± 11.2 | 39.9 ± 7.7 | 0.67 |

T = weighted worth of the first row = 59.8; target band 0.8x-1.25x = 47.9-74.8.

## 6. Card activity per flight (new pilots; card-blind vs card-aware)

| pilot | Deliveries/flight blind -> aware (Courier Cord) | Skims/flight blind -> aware (Skim Line) | Overfills/flight blind -> aware (Meter Mark) | Pulses/flight (Pulse Reader) |
|---|---|---|---|---|
| player-beginner | 1.37 -> 1.4 | 0.84 -> 0.85 | 6.9 -> 7.92 | 8.19 |
| player-average | 1.63 -> 1.55 | 1.03 -> 1.5 | 9.57 -> 10.46 | 10.01 |
| player-good | 1.53 -> 1.53 | 1.05 -> 1.94 | 10.38 -> 10.85 | 10 |
