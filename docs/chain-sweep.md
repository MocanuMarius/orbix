# Chain sweep: do fun chains exist? (`scripts/balance/chain-sweep.mjs`)

Written 17 November 2026 by a worker for the coordinator. Nothing in the game was changed. Owner's request: "run extensive tests on the combos and orders to make sure fun chains exist."

**Short answer.** Yes, for Collect, Lift and Delivery builds with a Repeat or Boost: order changes a hand's value by a median of 3x (25 of 44 hands by 2x or more, 8 by 5x or more). No, for Finish, Overfill, Save and Pack builds: order changes nothing in 9 of 44 hands, and most of their cards pay 0 to 15 Sparks a flight. The hidden Position cards (Vanguard, Keystone) and the new Chameleon blow the value scale open; I flag them, I do not call them fun.

Names are the catalogue's: Flash is now **Flare** in card names (Flare Handling, Flare Tinder, Flare Bank). `*` marks a hidden (unreleased) card.

## 1. What was measured, and what was assumed

**Measured by the real code** (the harness imports the game's modules and re-implements no card rule): every Spark, Stored Spark, permanent gain and Collector second a card pays (`resolveCardRow` from `dist/skill-cards.mjs`, with its Boost, Echo, Refrain, Keystone, position and tally rules); every engine card (`CardEngine` in `dist/card-engine.mjs`: Turns, Timers, Pulses, Flare Tinder, Spill Jar, Pack); what Black Hole eats (`previewBlackHoleMeals`). The glue around them copies what `dist/flight.mjs` does (Collect, Delivery, Lift, Tributary, Undertow, Second Wind, Save, Finish, Pack).

**Assumed** (no flight telemetry exists): everything in this table.

| Item | Assumption |
| --- | --- |
| Flight | 30 s (same as `simulate.mjs`) |
| Flare (Flash) | 1 per flight at 8 s (rows 1+), lasts 8 s, a Pulse every 2 s = 4 Pulses. Picking it up fires Collect-a-Flare once; its end fires once. Row 0 would have none. |
| Pulses | Each world Pulse crosses 1, then 2, then 1... uncollected Sparks (average 1.5; 2 of 3 are first crossings). Extra Pulses only from cards that send one: Rhythm (per phrase), Climb (per trio), Proximity or Edge Reach (per Skim), Spillway (every 2nd Overfill; Spillway II every one), Prism Wick (end of Flare), Wave Loom (per Turn). |
| Careful | 8 Collects (1 overfill), 3 Deliveries, 2 Latches, 16 Lifts (4 while falling), 2 Rhythm phrases, 2 Climb trios, 2 Skims, never crashes, meter drains 2.0/s |
| Greedy | 13 Collects (5 overfill), 4 Deliveries, 3 Latches, 22 Lifts (4 falling), 1 phrase, 1 trio, 1 Skim, 1 crash, drains 2.6/s |
| Stylish | 9 Collects (2 overfill), 3 Deliveries, 2 Latches, 26 Lifts (11 falling), 4 phrases, 3 trios, 6 Skims, 1 crash, drains 2.3/s |
| Always | 1 Finish (carrying 40 Stored), 1 Pack. A Save needs a Watchlight in the Chain and a crashing profile; the meter counts as a quarter full; the Collector recovers for 8 s after it. Skims need Proximity or Edge Reach. |
| Meter | base 30 (+Deep Vessel, +permanent growth, cap 100), starts at 15, a plain pickup gives 6 (+6 Cluster or Cache). Collect kinds repeat light, light, cluster, light, cache, light, dusk. Collector always has 6 s of recovery to cut. |
| Uses | reset every flight (a use lasts one flight). Tallies persist across the 8 flights of a run and start at 0. |
| Value | Sparks asked from the Chain (each firing capped at the meter's 100) + 1 per Stored Spark + 5 per permanent max Spark + 1 per Collector second + 2 per speed point. These exchange rates are my guess, so that a card that pays in another currency is not called dead. Sparks-only numbers are given beside value. |

"Sparks per flight" below are **asked** Sparks: what the Chain pays, before the small meter can hold it. The meter keeps 67 to 88 of them in every profile, so the strongest chains mostly spill. Value is the mean of the three profiles. Run time of the whole script: 319 s, 207,311 distinct chains.

## 2. The 12 most fun chains

Picked from the best order of every hand, the beam search (best 4 and 5 card chains) and the top pairs and triples. Rule: every card pulls weight, order matters, and the value is below the explosion line. Sparks per flight are careful / greedy / stylish.

| # | Chain (left to right) | What happens | Sparks c / g / s | Why order matters |
| --- | --- | --- | --- | --- |
| 1 | Echo III > Downbeat III > Prism Lens II | A Lift while falling pays Downbeat III's 5 Sparks four times (Echo), then triples it: 60 per Lift | 240 / 240 / 660 | Best/worst 12x. Echo must sit directly left of Downbeat; Prism Lens must be to its right or it multiplies nothing |
| 2 | Dusk Wick II > Echo II > Downbeat III > Body Spark > Crescendo | Two Triggers, one Boost: Collects and falling Lifts both pay, Crescendo doubles every firing | 212 / 292 / 426 | 3.4x. Echo II directly left of Downbeat III is x1.4; Echo II next to Crescendo wastes it (x0.7) |
| 3 | Rhythm > Dusk Wick II > Echo II > Resonant Harvest (Legendary) > Prism Lens II | Rhythm makes Pulses, the Pulses cross Sparks, Echo makes Harvest pay three times each, Prism Lens triples | 252 / 306 / 306 | 4.7x. Echo II directly left of Harvest x1.6; Prism Lens left of Dusk Wick x0.65 |
| 4 | Dusk Wick II > Tributary\* > Courier Tip III > Courier Glass > Closing Chord | Every third Collect also fires the Delivery cards to the right; the Glass doubles them; the Chord closes. Two builds in one (paper build 1) | 200 / 311 / 212 | 4.3x. Tip directly left of Glass x1.3. Tributary adds 58 to the hand. Over 8 flights it climbs 30 > 200 as the cards arrive |
| 5 | Body Spark > Old Friend\* > Echo III > Kindling Bead III > Crescendo | Old Friend pays +1 per flight it has been mounted, on every Trigger. A growth curve | flight 1: 288 / 468 / 324; flight 8: 1090 / 1570 / 1508 | 18x. Kindling Bead directly left of Body Spark x0.3 (it needs an adder before it) |
| 6 | Body Spark > Kindling Bead III > Refrain > Crescendo > Second Sun | Plus 4, then Encore, then x2 and x2 again in the Encore. The Boost-core payoff | 480 / 780 / 540 | 15x, the largest order effect among live cards. Body Spark directly left of Bead x2.1, reversed x0.5 |
| 7 | Collect flood: Dusk Wick II > Cluster Heart > Echo II > Body Spark > Crescendo | The baseline everything else is measured against | 168 / 300 / 180 | 3.2x. Echo II directly left of Dusk Wick II x1.4 |
| 8 | Flare Tinder\* > Prism Wick > Afterglow\* > Clear Prism > Closing Chord | A Collect starts a 1 s Flare; its end pays Afterglow and Prism Wick (paper build 5) | 42 / 57 / 42 | 9.4x. Tinder directly left of Afterglow x2.0, reversed x0.4. Small in absolute terms |
| 9 | Proximity > Metronome\* > Downbeat III > Close Call\* > Heartbeat\* | Metronome fires Downbeat III every tick, with no Lift needed; Heartbeat halves the wait; Skims add Close Call | 57 / 46 / 126 | 2.2x. Metronome directly left of Downbeat III x2.0; Metronome in front of Proximity x0.7 |
| 10 | Echo III > Body Spark > Chameleon > Dusk Wick II > Closing Chord | Echo makes Body Spark pay four times; Chameleon copies Dusk Wick; the Chord closes | 240 / 420 / 260 | 5.1x. Echo directly left of Body Spark x1.6; Chord directly left of Dusk Wick x0.6 |
| 11 | Use Doubler > Pocket Sparks > Cluster Heart > Low Wick > Wick Doubler | Use Doubler gives Pocket Sparks 12 uses; Wick Doubler doubles the three Collect cards | 66 / 88 / 70 | 2.0x. Use Doubler directly left of Pocket Sparks x1.3; Wick Doubler left of Pocket Sparks x0.8 |
| 12 | Watchlight > Home Beacon > Scar Tissue\* > Dusk Wick II > Crescendo | Crash and comeback: each Save adds +1 to every Collect, doubled | run, flight 1 to 8: greedy 9 > 300, stylish 9 > 190, careful 0 throughout | Run only: the count grows with Saves. A careful flyer never crashes, so it pays nothing |

Also strong but fragile: Dusk Wick III > Ember Bell\* > Long Fuse\* repeats the big Collect every 5 s: 80 / 200 / 80, with Heartbeat first 120 / 320 / 160 (2 to 4x Dusk Wick III alone).

## 3. Where order does not matter

Order changed nothing in **9 of 44 hands**: Finish and Stored (both hands), Overfill (live and hidden), Save and survival A, Devour growth A, paper build 3 (Overfill), paper build 4 (Crash), and the Pack hand (Harvest Home). Why: these hands hold no Boost, Echo, Refrain or position card, and their engine cards hear Triggers made by your flying, which the whole Chain hears whatever its order. Pulse engine A and B come close (best/worst 1.34x and 1.14x): the Pulse payoffs are small adders, and only Ripple Glass (doubles) cares where it stands.

Rule of thumb from the data: **a hand has an order only if it holds a Boost, a Repeat, a position rule or a Timer.** The median hand with one of those is 3x better in its best order than its worst; the largest ratios are 25x (hidden Vanguard/Keystone/Twin Flame hand), 18x (Old Friend), 15x (Boost core B), 9.4x (Flare Tinder, Timer A).

## 4. Cards with no partner

Under 1.1 synergy with any partner (a pair's value divided by the cards alone; a dead filler card beside each stops "pays for any neighbour" cards from looking partnered). **18 live cards, all of them paying nothing the harness can see**, so they are "not measurable", not "dead": Lift Guide, Lantern Lens, Springboard, Heart Stitch, Tight Packing I to III, Cache Handling, Haul Winch, Devourer, Ember Feeder, Fast Spool, Twin Orbit, Twin Wick, Long Spool, Cast Line, Dream, Double Lift.

Echo, Chameleon, Refrain, Keystone and wildcard Boosts partner every adder, so I also ran "no specific partner" (those cards excluded). Measurable live cards with none: **Growth Ring, Wayfarer's Purse and Nest Egg** (all Finish). Boosts never touch Stored or permanent gains, so only a Repeat helps them. Among hidden cards, no specific partner in a pair: Spark Chime, Slow Wick, Long Fuse, Heartbeat and most engine cards, but see section 7: they need three or four cards to work, so pairs cannot show it.

## 5. Archetypes that work, and that do not

Measured value is the best hand in `docs/archetype-gaps.md` section 2 (two hands each); the median random 5-card live chain is worth 20.7. Sparks c / g / s.

| Archetype | Gap-map rating | Measured | Agree? |
| --- | --- | --- | --- |
| Collect flood | rich | 216 (168/300/180): 10x median | Yes |
| Boost core | rich but flat | Hand A 133, hand B 600 (480/780/540): 29x | Mostly. Not flat: Refrain and Second Sun pay four times what Echo and Prism Lens do |
| Lift and Rhythm | playable | A 75, B 225 (136/136/374): 11x. Stylish 374 beats Collect flood's 180 | **Disagree, better than rated**: with an Echo it is as rich as Collect, for a flyer who Lifts while falling. Rhythm itself adds little (A is a third of B) |
| Pulse engine | playable | A 84, B 65: 3 to 4x, order 1.1 to 1.3x | Yes, but it is the weakest "playable" build and has no order |
| Collector and Delivery | playable | A 64, B 116: 3 to 6x. Paper build 1 (Tributary\*) 241: 12x | Yes; Tributary makes it rich |
| Finish and Stored | playable as a long game | 16 and 14: below the median chain, 0 Sparks, order-free | Agree it is a long game. It has no internal synergy at all |
| Overfill | thin | A 61 (all from Dusk Wick), B hidden 91. Hidden cards add Spill Jar 22, Gilded Rim 13, Overflow Bell 12 | Yes, thin even with the hidden cards; order-free |
| Save and survival | thin | A 17, B 33, paper build 4 27. Careful flyer: 0 | Yes |
| Flash (Flare) | thin in practice | A 26 (about 15 Sparks if you get the one Flare); B hidden 47 | Yes. At the landform rate of 0.19 Flares per flight it is close to zero |
| Skim | thin | A 68, B 64, paper build 2 71 | **Disagree on why**: Close Call\* adds only 1 to 6 per flight. The Pulse payoffs are fed by Proximity alone (section 7) |
| Timers engine | not in the game | A 9 (broken, section 7), B 76 (Metronome adds 42, Heartbeat 18) | B works, A does not |
| Devour growth | thin | Black Hole: +1 max Spark per flight for one card eaten; best order puts it last (eats nothing) | Yes, thin |
| Position cards | thin live | live hand A 307: but that is Echo III and Closing Chord. Hidden hand 1741 | **Disagree**: Vanguard, Ladder and Empty Chair are not weak (section 7) |
| Limited-use | thin enabler side | 75 (66/88/70): Use Doubler x1.6 on Pocket Sparks | Yes |
| Light and dark | thin | not measurable | Cannot say |

## 6. Hidden cards: strongest and dead

What each hidden card adds to the best hand that holds it (value, best order with versus without it), and to the best 4-card chain the beam search found:

| Card | Adds to its best hand | Note |
| --- | --- | --- |
| Chameleon (new)\* | +296 (beam chain) | Fires the card to its right on every Trigger. Toll Bell, Home Beacon, Growth Ring, Wayfarer's Purse all pay about 30 times a flight. Strongest partner-maker, biggest risk (section 7) |
| Tributary\* | +58 (paper build 1) | Makes Delivery builds rich |
| Metronome\* | +42 (Timers B) | Fires the card on its right every few seconds, ignoring that card's own Trigger |
| Afterglow\*, Flare Tinder\* | +40, +35 | A pair: worth 16 together against 2 and 0 alone |
| Second Wind\* | +35 (Second Wind chaos) | Every Trigger fires the Chain for 5 s after a Save |
| Whetstone\*, Undertow\* | +29, +24 | Whetstone needs a use card to its right (Pocket Sparks) and a Metronome or a Skim to run it; Undertow needs Collect cards to its right |
| Spill Jar\*, Homing Thread\*, Gilded Rim\*, Overflow Bell\* | +22, +34, +13, +12 | Spill Jar pays in Stored Sparks (loophole, section 7) |
| Heartbeat\* | +18 | Halves timers: it is a multiplier for Metronome, Long Fuse |
| Long Fuse\* with Ember Bell\* and a big Collect | +147 to +154 in a beam chain | Repeats the last firing every 5 s |

**Dead even with partners** (add 3 or less to every hand and beam chain): Wave Loom, Third Beat, Momentum, Low Ember, Last Round, Harvest Home, Full Satchel. Tithe also adds 0 in a single flight; it pays only with Stored Sparks carried in (a Stored-fed run counted 6 Tithes in 8 flights, +6 max Sparks). **Weak**: Close Call, Slow Wick, First Catch and Spark Chime add under 25 even in their best chain, and only with a Metronome to run them. Treat "dead" as "not found in a hand or a 4-card search": these are engine cards whose loop needs three or four exact partners; Wave Loom, Momentum and Third Beat pay only through light or a second engine, which the harness cannot see. Black Hole: not dead, but one meal a flight is +1 max Spark; it needs the 100 meter ceiling to be a limit before it matters.

## 7. Possible bugs

**Explosions.** Threshold 20x the median 5-card chain (20.7), that is 413. 30,747 of 207,311 evaluated chains pass it (6,244 distinct card sets, a biased sample: the searches go looking for the best). They hold Prism Lens II (80%), Vanguard\* (68%), Keystone\* (48%). The top chain: **Vanguard > Spill Jar > Prism Lens II > Keystone > Closing Chord**, value 5,368: 2,300 / 3,300 / 3,200 Sparks asked and 1,842 to 2,645 Stored. Reason: Vanguard is an "Any Trigger" adder, so it fires on every Trigger (23 to 33 a flight), Keystone doubles it, Prism and the Chord multiply, and every firing hits the 100 cap. Live-only, the top is Echo III > Body Spark > Crescendo > Prism Lens II > Closing Chord at 1,000, exactly 10 Collects at the cap (agrees with `archetype-gaps.md`: "1000 per flight").
- **Spill Jar bypasses "Boosts never multiply Stored Sparks".** Half of a *boosted* spill becomes Stored: Echo III > Body Spark > Prism Lens II > Spill Jar keeps 84 / 141 / 93 Stored a flight; with the Vanguard chain, over 2,000. Stored Sparks are not capped. Worth a decision.
- **Wildcard adders count every Trigger.** Vanguard alone makes 69 / 99 / 96 Sparks a flight (23 to 33 firings); a Rare Dusk Wick II alone makes 30 / 60 / 30. A Common beats the Rare adders alone. `archetype-gaps.md` calls Ladder and Empty Chair weak because its simulation fired each Trigger 1 to 10 times; a flight has about 40 Trigger events. Ladder alone is worth 29 in any chain.
- **Old Friend\*: text "+1 Spark for each flight this card has stayed" pays on every Trigger**, so at 7 flights it adds about 7 x 30 firings = 200+ Sparks (measured 1,090 / 1,570 / 1,508 at flight 8). Likely not what the text suggests.
- **Chameleon (new)\* breaks the permanent-gain pacing.** Chameleon > Growth Ring fires the Ring on every Trigger: +24 / 34 / 33 max Sparks in one flight (the meter caps at 100; Wayfarer's Purse would pay 120+ Stored). Echo does the same at most 4 times.
- **Metronome\* > Home Beacon pays without a Save or a Watchlight** (27 / 27 / 9 Sparks): Metronome ignores the card's own Trigger, as designed.

**Loops.** None found: no flight reached the engine safety stop, 400 Turns or 6,000 engine events in any of 207,311 chains. One false alarm in my harness: Echo plus Homing Thread looped (Delivery > fetch > Delivery) until I made the fetch wait for the Collector's recovery as `dist/flight.mjs` does; the engine alone does not bound that loop, the flight's Collector does.

**Text against measured.**
- Pulse text (`card-trigger-labels.mjs`): "A Pulse crosses a Spark you have not taken, **or a card to its left sends a Pulse**." Measured: a card-sent Pulse (First Catch, Close Call, Ember Bell) reaches only engine cards to its right (Spark Chime, Slow Wick, Long Fuse). It never reaches Resonant Harvest, Far Shore or First Ripple. With First Catch in front of Harvest and Far Shore the Pulse count stays at the Flare's 4 and the payoffs do not move; Close Call adds 1 to 6. **Paper build 2 (Skim into Pulse) works through Proximity, not Close Call.**
- Prism Lens (x1.25): "every card before it x1.25". On Body Spark +2 it pays 2.5, rounds down to 2: **no effect at all** (16 / 26 / 18 with and without). It works on Dusk Wick (20 > 25).
- Chime loop (First Catch > Spark Chime > Ember Bell > Slow Wick, `engines.md`): measured 1 Turn and 2 Sparks (careful), 6 Turns and 7 (greedy). Ember Bell now hears Overfill, not a gain, so the loop no longer closes.
- Home Beacon: "Watchlight and Last Orbit saves both count". The harness only knows Watchlight, so Home Beacon reads 0 alone.
- Last Light (Legendary Save) needs the meter at a third or less: it paid only because I set the Save meter to a quarter; with the natural meter in the script it paid nothing.

## 8. What the harness cannot see

- **Flying skill**: distances, crashes, how a player really spends Lifts; all counts are invented and the same every flight.
- **Light and vision**: Lantern Lens, Momentum, Wave Loom's light, Flare's Luminance, Lift Guide.
- **Hearts**: Heart Stitch, Devourer, Tailwind, Ember Feeder. **Collector reach and fetching**: Long Spool, Cast Line, Twin Orbit, Twin Wick, Cache Handling, Fast Spool, Haul Winch (time cards show only as Collector seconds at 1 per second).
- **Stored packing** (Tight Packing I to III), speed, Rest cards, Dream, practice flights, and what Stored Sparks are worth.
- **The real meter**: engines stop when the meter is full, and my meter is a guess. Engine chains are the most sensitive to it.
- **Last Orbit**, Echo II or III on engine cards in a real flight, boss and course effects, edition cards.
- **Gaps in my own reading**: which cards turn on an event source (Watchlight, Rhythm, Climb, Spillway, Proximity) is from `getCardModifiers` and `flight.mjs`; a card added after this run is picked up automatically, but a new event source will not be.
- The ranking uses asked Sparks. The meter holds only 67 to 88 of them, so past about 100 a chain mostly overflows: "best" does not mean "plays better".

## Files

- `scripts/balance/chain-sweep.mjs` (the harness). Run `node scripts/balance/chain-sweep.mjs`; `--quick` shrinks the searches; `--only=order,pairs,runs,hidden`; `--probe=card-a,card-b` shows one chain; `--slowscan` times every pair.
- `outputs/balance/chain-sweep-order.json/.md` (sweep 1, every permutation), `-pairs` (sweep 2, live cards), `-pairs-unreleased` (sweep 4, all cards), `-runs` (sweep 3, 8-flight runs of 15 builds), `-hidden`, `-fun`, `-guard`, `-cards` (every card alone and its best partner), `-all.json` (everything).

## Fixed (2026-11-17)

Tests: `tests/chain-sweep-fixes.test.mjs`.

- **Glide Prism** (owner decision, Rare, live): "Lift: double every reward before it." It now hears a Lift while falling and a Lift on the beat (Toll Bell, Pacesetter, and any card on a Kindled slot on a falling Lift); it still ignores every other Trigger, only reaches cards before it, and never multiplies Stored Sparks or permanent gains. Low Ember (Lift under a quarter) pays no Sparks, so the Prism has nothing of it to double. Row field `alsoEvents` in `card-catalog.mjs`, read by `resolveCardRow` and `hasCardRowEvent`.
- **Spill Jar and Boosts**: Stored Sparks kept from a spill (Spill Jar, Overflow Bell) come from the Boost-free amount only. The meter takes the Boost-free Sparks first, so a spill that only a Boost made keeps nothing. Receipts carry `sparksUnboosted`; the engine reads it (`CardEngine.baseSpill`) for player Collects, Long Fuse repeats and card gains.
- **Vanguard and Old Friend** now fire on a Collect only (their proposals say "Any" without naming a Trigger; the common adder convention applies). Chip and condition read "Collect".
- **Chameleon (new)** skips growth cards (Growth Ring, any permanent-gain or tally card, anything at Finish): text "...on any Trigger (not growth cards)". `isGrowthEffectCard` in `skill-cards.mjs`.
- **Card-sent Pulses are real Pulses.** Every Pulse a card sends (First Catch, Close Call, Ember Bell, Low Ember, a Timer's return, and the Bell Inscription) makes a real light ring from the wisp when a card to its right hears Pulses. The ring is tagged with the sender's Slot, so on crossing an uncollected Spark only Pulse cards to the right pay (Resonant Harvest, First Ripple, Far Shore, Ripple Glass and the rest); the sender and cards to its left do not, and Sparks and Overfills that crossing makes are heard only to the right of the sender, so a Pulse cannot loop back to its Bell. A Timer's return (Slot -1) reaches the whole Chain. No ring is made when nobody to the right hears it. It needs a real uncollected Spark to pay: no Spark, no payout.
