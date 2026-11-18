# Starter card balance (human pilots, initial flights; generated 2026-11-18)

Setup: first 6 flights of Map 1 flown as a sequence, true starting state (3 hearts, starting Meter, Lift Guide + the card under test, nothing else), Rests taken when the route offers one, a fall costs a heart and the stop is retried, the run ends at 0 hearts. 30 seeded runs per (card x pilot); every card run is paired with the same run seed for the baseline. Pilots: beginner = human350 (350 ms reaction, jitter .10, drops .40), average = human250, good = human150 (profiles in scripts/human-flight-planner.mjs; assumptions, not fits to real players). Lift Guide cue following with the arrow: beginner 40%, average 65%, good 85% of Lifts on cue (an off-cue Lift is converted to an on-cue paid Lift with probability q so the share reaches the target; the Lift's timing is the pilot's own, so following the arrow costs no survival). Differences are paired means ± standard error; a difference under 2 SE is marked (noise) and is not real.

Exchange rate for the combined worth: 1 heart = 15 Stored Sparks (the Workshop's base price to restore a resource at a Rest). Worth = extra Stored Sparks + 15 x hearts saved. Both raw columns are shown; extra flights cleared and died-runs are shown but not priced.

## beginner pilot (human350)

Lift Guide on-cue share: without the arrow 49%, with the arrow 49% (target 40%, q=0).

### Absolute (mean per run of 6 flights)

| Chain | cleared /6 | hearts lost | died before stop 6 | Lifts refused (no Sparks) | s under 20% | lowest Meter % | pickups collected | card Sparks | Stored at end |
|---|---|---|---|---|---|---|---|---|---|
| no card | 1.3 | 3.27 | 30/30 | 4.9 | 19.5 | 2 | 30.7 | 0 | 47.9 |
| Lift Guide (arrow ignored) | 1.7 | 3.17 | 30/30 | 4.1 | 16.8 | 3 | 40.4 | 33.3 | 69.2 |
| Lift Guide only | 1.7 | 3.17 | 30/30 | 4.1 | 16.8 | 3 | 40.4 | 33.3 | 69.2 |
| LG + Skim Line | 2.7 | 3 | 23/30 | 4.2 | 17.7 | 3 | 59.4 | 13.7 | 116.3 |
| LG + Pulse Reader | 2.6 | 2.77 | 22/30 | 3.6 | 16.1 | 5 | 58.1 | 24.6 | 100.5 |
| LG + Courier Cord | 1.7 | 3.17 | 30/30 | 4.1 | 16.8 | 3 | 40.4 | 0 | 75.5 |
| LG + Meter Mark | 1.7 | 3.17 | 30/30 | 4.1 | 16.8 | 3 | 40.4 | 0 | 74.5 |
| LG + Finish Flag | 1.7 | 3.17 | 30/30 | 4.1 | 16.8 | 3 | 40.4 | 0 | 86.2 |

### Paired difference vs baseline (Lift Guide only; Lift Guide itself vs no card)

| Card | extra Stored | extra flights cleared | hearts saved | died-run change | refused Lifts change | s under 20% change | card Sparks added | worth (Stored + 15/heart) |
|---|---|---|---|---|---|---|---|---|
| Lift Guide | 21.27 ± 5.73 | 0.43 ± 0.16 | 0.1 ± 0.1 (noise) | 0 ± 0 (noise) | -0.8 ± 0.28 | -2.75 ± 1.3 | 33.3 | 22.8 ± 5.5 |
| Skim Line | 47.07 ± 10.57 | 0.97 ± 0.26 | 0.17 ± 0.19 (noise) | -0.23 ± 0.08 | 0.07 ± 0.41 (noise) | 0.93 ± 1.37 (noise) | -19.7 | 49.6 ± 11.6 |
| Pulse Reader | 31.27 ± 9.81 | 0.87 ± 0.27 | 0.4 ± 0.16 | -0.27 ± 0.08 | -0.53 ± 0.3 (noise) | -0.68 ± 1.37 (noise) | -8.8 | 37.3 ± 10.7 |
| Courier Cord | 6.27 ± 0.75 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -33.3 | 6.3 ± 0.7 |
| Meter Mark | 5.33 ± 0.77 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -33.3 | 5.3 ± 0.8 |
| Finish Flag | 17 ± 1.74 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -33.3 | 17 ± 1.7 |

## average pilot (human250)

Lift Guide on-cue share: without the arrow 58%, with the arrow 70% (target 65%, q=0.16).

### Absolute (mean per run of 6 flights)

| Chain | cleared /6 | hearts lost | died before stop 6 | Lifts refused (no Sparks) | s under 20% | lowest Meter % | pickups collected | card Sparks | Stored at end |
|---|---|---|---|---|---|---|---|---|---|
| no card | 1.7 | 3.37 | 29/30 | 6.6 | 21.6 | 0 | 40.8 | 0 | 62.4 |
| Lift Guide (arrow ignored) | 3.2 | 2.73 | 19/30 | 4.7 | 17.4 | 2 | 70.9 | 67.7 | 120.9 |
| Lift Guide only | 3.3 | 2.4 | 18/30 | 3.8 | 14.4 | 2 | 73.6 | 84.1 | 128.5 |
| LG + Skim Line | 3.6 | 2.1 | 15/30 | 3.5 | 12.8 | 4 | 78.3 | 20 | 157.1 |
| LG + Pulse Reader | 3.6 | 2.2 | 16/30 | 3.3 | 12.1 | 4 | 79.8 | 33.7 | 144.2 |
| LG + Courier Cord | 3.3 | 2.4 | 18/30 | 3.8 | 14.4 | 2 | 73.6 | 0 | 139.4 |
| LG + Meter Mark | 3.3 | 2.4 | 18/30 | 3.8 | 14.4 | 2 | 73.6 | 0 | 139.6 |
| LG + Finish Flag | 3.3 | 2.4 | 18/30 | 3.8 | 14.4 | 2 | 73.6 | 0 | 161.5 |

### Paired difference vs baseline (Lift Guide only; Lift Guide itself vs no card)

| Card | extra Stored | extra flights cleared | hearts saved | died-run change | refused Lifts change | s under 20% change | card Sparks added | worth (Stored + 15/heart) |
|---|---|---|---|---|---|---|---|---|
| Lift Guide | 66.07 ± 11.35 | 1.57 ± 0.31 | 0.97 ± 0.29 | -0.37 ± 0.09 | -2.83 ± 0.82 | -7.23 ± 1.77 | 84.1 | 80.6 ± 13.5 |
| Skim Line | 28.6 ± 10.99 | 0.27 ± 0.28 (noise) | 0.3 ± 0.23 (noise) | -0.1 ± 0.1 (noise) | -0.27 ± 0.53 (noise) | -1.6 ± 1.18 (noise) | -64.1 | 33.1 ± 13.9 |
| Pulse Reader | 15.7 ± 8.12 (noise) | 0.27 ± 0.22 (noise) | 0.2 ± 0.12 (noise) | -0.07 ± 0.07 (noise) | -0.5 ± 0.37 (noise) | -2.25 ± 1.11 | -50.4 | 18.7 ± 9.3 |
| Courier Cord | 10.93 ± 1.36 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -84.1 | 10.9 ± 1.4 |
| Meter Mark | 11.13 ± 1.11 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -84.1 | 11.1 ± 1.1 |
| Finish Flag | 33 ± 2.96 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -84.1 | 33 ± 3 |

## good pilot (human150)

Lift Guide on-cue share: without the arrow 67%, with the arrow 105% (target 85%, q=0.54).

### Absolute (mean per run of 6 flights)

| Chain | cleared /6 | hearts lost | died before stop 6 | Lifts refused (no Sparks) | s under 20% | lowest Meter % | pickups collected | card Sparks | Stored at end |
|---|---|---|---|---|---|---|---|---|---|
| no card | 2 | 3.37 | 28/30 | 9 | 19.1 | 1 | 48.6 | 0 | 73.9 |
| Lift Guide (arrow ignored) | 3.1 | 2.53 | 20/30 | 6.5 | 15 | 3 | 72 | 77.8 | 123.6 |
| Lift Guide only | 4.1 | 1.73 | 9/30 | 3.9 | 11.3 | 5 | 94 | 155.1 | 167.7 |
| LG + Skim Line | 3.9 | 1.9 | 12/30 | 3.3 | 9.9 | 5 | 88 | 18.8 | 179.4 |
| LG + Pulse Reader | 4.1 | 1.43 | 9/30 | 2.7 | 8 | 8 | 93.8 | 40.2 | 171.7 |
| LG + Courier Cord | 4.1 | 1.73 | 9/30 | 3.9 | 11.3 | 5 | 94 | 0 | 181.3 |
| LG + Meter Mark | 4.1 | 1.73 | 9/30 | 3.9 | 11.3 | 5 | 94 | 0 | 184.7 |
| LG + Finish Flag | 4.1 | 1.73 | 9/30 | 3.9 | 11.3 | 5 | 94 | 0 | 209.1 |

### Paired difference vs baseline (Lift Guide only; Lift Guide itself vs no card)

| Card | extra Stored | extra flights cleared | hearts saved | died-run change | refused Lifts change | s under 20% change | card Sparks added | worth (Stored + 15/heart) |
|---|---|---|---|---|---|---|---|---|
| Lift Guide | 93.8 ± 12.05 | 2.13 ± 0.31 | 1.63 ± 0.26 | -0.63 ± 0.09 | -5.17 ± 0.77 | -7.81 ± 1.89 | 155.1 | 118.3 ± 14.4 |
| Skim Line | 11.7 ± 6.67 (noise) | -0.27 ± 0.15 (noise) | -0.17 ± 0.19 (noise) | 0.1 ± 0.06 (noise) | -0.53 ± 0.42 (noise) | -1.4 ± 1.13 (noise) | -136.3 | 9.2 ± 8.4 |
| Pulse Reader | 3.93 ± 0.86 | 0 ± 0 (noise) | 0.3 ± 0.12 | 0 ± 0 (noise) | -1.13 ± 0.46 | -3.32 ± 0.76 | -114.9 | 8.4 ± 2.1 |
| Courier Cord | 13.6 ± 1.24 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -155.1 | 13.6 ± 1.2 |
| Meter Mark | 16.97 ± 1.24 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -155.1 | 17 ± 1.2 |
| Finish Flag | 41.33 ± 2.7 | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | 0 ± 0 (noise) | -155.1 | 41.3 ± 2.7 |

## Worth summary (Stored-equivalent per 6 flights, ± standard error)

Weighted worth = 0.6 good + 0.3 average + 0.1 beginner (balance for good players, weigh in worse ones). T = Lift Guide weighted worth = 97.4; target band for the others 0.8x-1.25x = 77.9-121.8.

| Card | beginner | average | good | weighted | x T |
|---|---|---|---|---|---|
| Lift Guide | 22.8 ± 5.5 | 80.6 ± 13.5 | 118.3 ± 14.4 | 97.4 | 1 |
| Skim Line | 49.6 ± 11.6 | 33.1 ± 13.9 | 9.2 ± 8.4 | 20.4 | 0.21 |
| Pulse Reader | 37.3 ± 10.7 | 18.7 ± 9.3 | 8.4 ± 2.1 | 14.4 | 0.15 |
| Courier Cord | 6.3 ± 0.7 | 10.9 ± 1.4 | 13.6 ± 1.2 | 12.1 | 0.12 |
| Meter Mark | 5.3 ± 0.8 | 11.1 ± 1.1 | 17 ± 1.2 | 14.1 | 0.14 |
| Finish Flag | 17 ± 1.7 | 33 ± 3 | 41.3 ± 2.7 | 36.4 | 0.37 |
| median of the starters tested | 17 | 18.7 | 13.6 |
