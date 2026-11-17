# Card balance, second look (17 November 2026)

For the owner to read later. Nothing in the game was changed. Every number comes from `scripts/balance/simulate.mjs`; the full tables are in `outputs/balance/cards.md` and `outputs/balance/cards.json`. Per your correction: strong cards are fine, no costs or caps are proposed, and each suggestion only gives a card a role or a bigger number.

## How the numbers were made, in four lines

- The real game engine fired every card and Chain, exactly as the Deck screen does (440 of 440 spot checks matched the Deck screen).
- One flight is 30 seconds. A Trigger fires a fixed number of times per flight (my guess): Collect 10, Falling Lift 8, Pulse 6, Delivery 4, Rhythm 4, Flash 3, Flash ends 3, Latch 3, Overfill 2, Save 1, Clear 1.
- Numbers are Sparks per flight, with each firing capped at 100 because the Spark Meter holds 100.
- 85 live cards: 42 pay Sparks and are compared here. 10 save Collector time, 4 give Stored Sparks or permanent gains, 29 are always-on or Rest cards (Luminance, hearts, Collector reach, slots, max Sparks). Those 43 cannot be compared in Sparks and are only listed.

## Weak cards

Eight cards are almost never worth a Slot. "Best Chain" is the best 3-card Chain they appear in, per flight.

| Card | What it does | Why it loses | Simplest suggestion |
| --- | --- | --- | --- |
| Chameleon (Rare) | Acts as the next card once. | Echo II does the same job better on 5 of 8 Triggers; best Chain 240. | Let it fire the card to its right on any Trigger, so it bridges two Triggers. A role Echo does not have. |
| Resonant Harvest (Common) | +1 Spark on each Pulse. | Far Shore (Common) is better on Pulse; best Chain 102. | Bigger number: +2 (the Rare and Legendary versions step up with it). |
| Prism Lens (Common) | Everything before it x1.25. | Trigger cards like Courier Glass and Clear Prism beat it on 4 of 8 Triggers; best Chain 200. | It is the first step to Prism Lens II (x3). Raise it to x1.5 so the first step is worth a Slot. |
| First Ripple (Common) | +4 on a Pulse's first Spark, 6 uses. | Far Shore (+5, 2nd Spark onward) is better; best Chain 84. | Bigger number: +8, since the first Spark comes up less often. |
| Ripple Glass (Rare) | Doubles on a Pulse's 2nd Spark onward. | Crescendo (also Rare, doubles on every Trigger) beats it; best Chain 120. | Bigger number: x3. It works on one Trigger only, so it should pay more there. |
| Kindling Bead (Common) | +1, but only after a + card, any Trigger. | Beaten on 6 of 8 Triggers by plain adders like Dusk Wick or Courier Tip; best Chain 168. | Bigger numbers on the ladder: +3 / +5 / +8. It needs a partner, so it can pay more. |
| Kindling Bead II (Rare) | +2, same condition. | Beaten on 6 of 8 Triggers; best Chain 176. | Same ladder as above. |
| Wick Doubler (Common) | Doubles on Collect, 3 uses. | Three uses run out in a third of a flight; best Chain 110. | Bigger number: 5 uses. |

Watch list, not weak but close (beaten on 4 or more Triggers):

- Mirror Grain (Rare): beaten by Crescendo on all 8 Triggers. It only shines with one huge card (Dusk Wick, Courier Tip III). Suggestion: repeat the last + card twice.
- Second Sun (Legendary): beaten by Prism Lens II on all 8 Triggers. Suggestion: make its Encore multiplier bigger, since that is the one thing only it does.
- Kindling Bead III (Legendary): decent on Rhythm and Pulse, beaten on 4 of 8 others.

Not weak, only thin: Toll Bell, Prism Wick (Flash ends), Home Beacon and Last Light look low on numbers (96, 66, 81 and 100 per flight at best) but they are the only or nearly the only Sparks card on their Trigger, so they are always the pick for that Trigger. This is a thin Trigger problem, not a weak card problem (see Archetypes).

## Strong everywhere

Five cards sit in the best 5-slot Chain on at least 75% of the Triggers they can use.

| Card | Why it is everywhere | Context it could belong to (no drawback) |
| --- | --- | --- |
| Prism Lens II (Legendary) | x3 on any Trigger; in the top 5% of 3-card Chains 22% to 32% of the time. | A "one big hit" build: best next to a single large card. Could have a Trigger-linked bonus (extra on Pulse cards, say) rather than a flat x3. |
| Echo III (Legendary) | Repeats the next card 3 times; on every Trigger. | A "one big card" build: stays best with a single big adder. |
| Closing Chord (Rare) | x2.5 as the last card; on every Trigger. | Already tied to the last Slot; fits "finisher" builds. |
| Crescendo (Rare) | x2 on every Trigger. | A generalist Boost that fits any build; leave it. |
| Refrain (Legendary) | Fires the whole Chain again. | A "wide Chain" build: best with many different adders, weaker with one big card. |

Common fact behind all five: with five Slots, one adder plus Echo III, Prism Lens II and Closing Chord (plus Crescendo, Kindling Bead III or Refrain in the other Slots) fills the 100-Spark meter on every firing, on every Trigger that has an adder (see Combos).

Best in their own Trigger (not everywhere): Flash Handling, Downbeat III, Courier Tip III, Toll Bell, Prism Wick. Each is in 80% or more of the top 3-card Chains on its Trigger, mostly because few other cards exist there.

## Archetypes today

Cards that name the Trigger, from the data:

| Trigger | Adds Sparks | Boosts | Collector time |
| --- | --- | --- | --- |
| Collect (11 cards) | 7 | 1 (Wick Doubler) | 3 |
| Pulse (6) | 5 (3 are one Harvest ladder) | 1 | 0 |
| Delivery (4) | 3 | 1 | 0 |
| Flash (4) | 2 | 1 | 1 |
| Falling Lift (4) | 2 (one ladder) | 1 | 1 |

Thin Triggers (fewer than 4 cards):

- Flash ends: 1 card (Prism Wick). Sparks only, no Boost.
- Rhythm: 2 cards (Toll Bell, Pacesetter), no Boost.
- Save: 2 cards (Home Beacon, Last Light), no Boost.
- Latch: 2 cards (Return Spring, Haul Winch); no Sparks payoff.
- Overfill: 2 cards (Ring Spring, Ring Spring II); no Sparks payoff.
- Clear: 4 cards (Growth Ring, Wind Feather, Wayfarer's Purse, Nest Egg), all Stored or permanent, no Sparks payoff.
- Swipe and Victory: no live card at all.

Families that work on any Trigger (the glue): Echo, Echo II, Echo III, Chameleon, Refrain, Prism Lens, Prism Lens II, Crescendo, Closing Chord, Second Sun, Mirror Grain and the three Kindling Beads (14 cards). They make the same few boost-and-echo builds work on every Trigger, which is why the top Chains all look alike.

## Combos worth keeping

All are intended fun. Every one of these fills the Spark Meter on every firing in the model, so each makes that Trigger's flight effectively impossible to lose if the Trigger keeps firing; they need 5 Slots and Legendary cards (Echo III and Prism Lens II each cost 150 to forge), so they are late-game. With the default 3 Slots, the best Chain found is Echo III, Downbeat III, Prism Lens II on Falling Lift: 480 per flight (60 per firing, not saturated).

1. Collect: Body Spark, Echo III, Kindling Bead III, Prism Lens II, Closing Chord. 1000 of 1000. A plain Common Spark becomes a full meter on one touch (about 135 per firing).
2. Falling Lift: Echo III, Downbeat III, Crescendo, Prism Lens II, Closing Chord. 800 of 800 (300 per firing).
3. Pulse: Resonant Harvest (Rare), Echo III, Kindling Bead III, Prism Lens II, Closing Chord. 600 of 600.
4. Delivery: Echo III, Courier Tip III, Crescendo, Prism Lens II, Closing Chord. 400 of 400.
5. Rhythm: Toll Bell, Echo III, Kindling Bead III, Prism Lens II, Closing Chord. 400 of 400.
6. Flash: Echo III, Flash Handling, Crescendo, Prism Lens II, Closing Chord. 300 of 300 (360 in one firing).
7. Flash ends: Prism Wick, Echo III, Kindling Bead III, Prism Lens II, Closing Chord. 300 of 300.
8. Save: Echo III, Last Light, Crescendo, Prism Lens II, Closing Chord. 100 of 100 (540 in the single firing).
9. Collect with repeated copies: Echo III, Body Spark, Prism Lens II, Prism Lens II, Prism Lens II. 1000 of 1000 (216 per firing) if the game lets you own several copies.
10. Collect: Refrain, Echo III, Body Spark, Prism Lens II, Closing Chord. 1000 of 1000 (120 per firing); the "fire the whole Chain again" version.

Reading: the overflow past 100 is wasted today. That is where Overfill cards (Spillway, Ring Spring) have room to matter, and where a Black Hole or Pack Trigger would give the extra a use.

## Gaps

- A Trigger that uses the overflow: the meter caps at 100, so saturated Chains waste Sparks; Overfill and Latch have no Spark payoff at all.
- A second Boost for Flash ends, Rhythm and Save (no Boost exists there).
- More than one Sparks card per thin Trigger: Flash ends has 1, Rhythm 1, Save 2.
- A reason to use Chameleon, Kindling Bead and Mirror Grain (weak, see above).
- A payoff for Clear beyond Stored and permanent gains.
- Pack Trigger (on your list: packing Sparks at flight end fires the Chain): would improve Tight Packing I to III, Nest Egg and Wayfarer's Purse, which have nothing to do with a Chain today. Echo III and Refrain would also get a new job: repeating Pack payoffs. Boosts would still skip Stored Sparks, as the rule says.
- Black Hole (on your list: eats the card to its right, +1, +2 or +3 permanent max Sparks by rarity): turns the weak cards in this document into fuel. Chameleon (Rare, +2), Kindling Bead and Prism Lens (+1 each) become worth carrying. It overlaps Ember Feeder (eats the next 2 cards, +1 max Spark) and Devourer (eats a Rare), so decide how they differ.
- Engines with wait timers (BACKLOG.md, "Engines: Chains that keep themselves going"): a Pulse, wait, Pulse loop would make Pulse cards (Resonant Harvest, Far Shore, First Ripple, Ripple Glass) and Pulse makers (Spillway, Rhythm, Edge Reach, Slip Feather, Watchlight) better, and would let a Boost on the left work on every turn. It would also finally give Latch and Overfill (Return Spring, Haul Winch, Ring Spring) a Spark payoff.

## What I could not measure

- Real firing rates. Firings per flight and the mix of pickups (for example how often a Dusk Spark appears) are my guesses. Dusk Wick and Cluster Heart depend on them the most.
- The meter level at each firing. I capped each firing at 100 but did not track how full the meter already was.
- Only 3-slot and 5-slot Chains of distinct cards, all at rank 1 (no Improve upgrades, which would raise Body Spark and others). Five Slots need Slot upgrades that a normal run may not reach.
- Chains were searched for Sparks only. Collector time, Luminance, hearts, Collector reach, Stored Sparks and max Sparks were not compared, so cards like Pacesetter, Flash Thread and Long Spool are described, not ranked.
- Boosts on always-on cards (Crescendo making Lantern Lens stronger) are not in the numbers.
- Cost: forge prices and how often a card is offered. A weak Common may still be a fair early pick.
- Player skill and how often a Trigger is actually hit. "Impossible to lose" only means the meter is full each firing, not that a player cannot crash.
- Cards that bring a new Trigger in play (Pulse makers, Overfill makers) are not in the Chains, so their value as enablers is not shown.
