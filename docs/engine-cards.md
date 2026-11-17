# Engine cards, Pack Trigger and Black Hole: proposal `v1.0-engine`

Written by the coordinator on 17 November 2026 from the user's three requests of that morning (kept in `BACKLOG.md`, top). Nothing here is built. The user approves by code; numbers are first guesses for the simulation (`scripts/balance/simulate.mjs`) to test.

Findings this leans on (`docs/card-balance-2.md`): the same Boost core (Echo III, Crescendo, Prism Lens II, Closing Chord, Refrain) wins on every Trigger, so builds differ only in their first card; Flash ends, Rhythm, Save, Latch and Overfill have too few cards; Victory has none. Engines give builds a second axis: not "how big is one firing" but "how long does the Chain keep turning".

## Three new rules

1. **A card may answer an event another card made.** Today only the player's actions fire the Chain. New: some cards send an event (a Pulse, a Spark gain, a Flash). Cards waiting for that event fire, left to right, as usual.
2. **A circle needs a wait.** If the cards in a Chain can feed each other in a circle, at least one **Timer** card must be in the circle. Without one the Chain screen marks the circle "Needs a wait" and it runs once only. A card never answers an event it made itself in the same turn.
3. **An engine stops when a card cannot do its job.** Meter full, no Collector charge, nothing in reach. No turn limit. (Spark Meter stays capped at 100. Boosts still never multiply Stored Sparks or permanent gains.)

Words for the glossary: **Engine** (a Chain that feeds itself), **Turn** (one trip round the circle), **Timer** (a card that waits, then acts).

## New Trigger: Pack

- Fires once at the end of a flight, when the meter's Sparks are packed into Stored Sparks.
- Chain cards with the Pack Trigger fire then; Echo and other repeaters repeat them. Boosts strengthen Spark amounts that go **into the meter before packing**, not the Stored Sparks coming out (kept rule), so a boosted Pack card makes the pack bigger honestly: more Sparks in, same exchange.
- Shown in the reward ceremony: the Chain plays once on the pack line, with the same plates as the Chain screen. No reading during flight is involved; the flight is over.
- Existing cards that move here: Nest Egg, Wayfarer's Purse and the "at Clear" Stored Sparks cards become Pack cards (Clear keeps hearts and permanent gains).

## Cards

Format: **Name** (rarity) · Trigger → what it does. One input, one output, so a circle can be read off the cards.

### Makers (turn one event into another)

| Card | Trigger → effect |
| --- | --- |
| **Spark Chime** (Common) | Pulse → gain 1 Spark |
| **Ember Echo** (Common) | Gain Sparks (any source) → send a Pulse. Once per turn |
| **Flash Tinder** (Rare) | Collect → start a short Flash (1 s) |
| **Homing Thread** (Rare) | Delivery → Collector fetches again at once (uses charge) |
| **Overflow Bell** (Rare) | Overfill → send a Pulse and keep 2 of the spilled Sparks |
| **Afterglow** (Common) | Flash ends → gain 2 Sparks |

### Timers (the wait that makes a circle legal)

| Card | Effect |
| --- | --- |
| **Slow Wick** (Common) | 3 s after it is lit by any card to its left: send a Pulse |
| **Metronome** (Rare) | Every 2 s while the meter is not full: fire the card to its right once |
| **Long Fuse** (Rare) | 5 s after a Pulse: repeat the whole Chain's last firing |
| **Heartbeat** (Legendary) | Timers in this Chain wait half as long |

### Starters (the first push, from flying)

| Card | Trigger → effect |
| --- | --- |
| **First Catch** (Common) | First Collect of a flight → send a Pulse |
| **Close Call** (Rare) | A skim (Proximity fills) → send a Pulse and gain 1 Spark |
| **Low Ember** (Rare) | Lift while the meter is under a quarter → send a Pulse. Once per 6 s |

### Governors (shape the engine; no drawbacks)

| Card | Effect |
| --- | --- |
| **Third Beat** (Rare) | Every third Turn counts twice |
| **Momentum** (Legendary) | After 5 Turns without a stop: Luminance +1 until the engine stops |

### Pack cards

| Card | Trigger → effect |
| --- | --- |
| **Full Satchel** (Common) | Pack → gain 3 Sparks before packing |
| **Last Round** (Rare) | Pack → send a Pulse (the engine gets one last Turn) |
| **Harvest Home** (Legendary) | Pack → fire every Collect card in the Chain once |

### Black Hole (the user's card, as specified)

- **Black Hole** (Rare). At the start of each flight it destroys the card in the Slot to its right. It then grows for good: **+1 max Sparks** for a Common, **+2** for a Rare, **+3** for a Legendary. The total is written on the card ("Eaten 4 · +7 max Sparks").
- Nothing to its right, or an empty Slot: nothing happens. It cannot eat a loaned practice card.
- "For good" = for the rest of the run (default; say if it should carry across runs). Meter cap 100 applies.
- Boosts do not change the gain (kept rule).
- Chain screen: the plate under the card to its right reads "Eaten at take-off" in wine, and Play asks once: "Black Hole will destroy [card]. Fly?" (Cancel is the paper slip.) A card is lost for good, so the player is told before committing.
- Why it is fun: it turns spare Commons from Forge into growth, it wants a full reserve, and a bigger meter is exactly what engines need (they stop when the meter is full).
- Name: the flight hazard is also called Black Hole. One glossary entry covers both ("in flight it pulls you; as a card it eats the card beside it"). Rename only if the user prefers.

## Two worked engines

**Four cards: "Chime loop"** · First Catch → Spark Chime → Ember Echo → Slow Wick
1. First Collect of the flight: First Catch sends a Pulse.
2. Pulse: Spark Chime gives 1 Spark.
3. Gaining a Spark: Ember Echo sends a Pulse, which lights Slow Wick.
4. Three seconds later Slow Wick sends a Pulse: back to step 2.
Result: +1 Spark every 3 s from the first pickup until the meter is full. About 9 Sparks in a 30 s flight, hands free. Add Crescendo at the end and each Turn gives 2.

**Five cards: "Overflow mill"** · Close Call → Metronome → Body Spark +2 → Overflow Bell → Heartbeat
1. A skim starts it: Pulse and 1 Spark.
2. Metronome fires Body Spark +2 every 2 s (every 1 s with Heartbeat) while the meter is not full.
3. When the meter overfills, Overflow Bell sends a Pulse and keeps 2 of the spill, which re-arms the loop instead of ending it.
Result: a build that wants a small meter kept near full, the opposite of the Black Hole build that wants a huge one. Two archetypes from the same pieces.

## How it is shown (no reading while flying)

- **Chain screen:** Play runs the engine in slow motion. A circle is drawn as a closed track under the cards with the Timer as a small dial. The medallion shows two numbers: Sparks per Turn, and Turns per 10 s. A circle with no Timer shows "Needs a wait".
- **In flight:** no text. The card strip pulses in the engine's tempo; a Timer shows a filling ring; a stopped engine dims. A soft tick per Turn.
- **Teaching:** one Rest lesson with three loaned cards (First Catch, Spark Chime with Ember Echo, Slow Wick) to arrange into a circle and watch turn.

## Balance approach

The dial is the wait, never a ceiling. The simulation gets a clock (it has none today) and reports Sparks per 10 s for every legal circle of 3 to 5 cards. Only an engine that makes a flight impossible to lose is touched, and then by a longer wait.

## Build order after approval

1. Engine rules in the card firing code and the clock in the simulation (Opus: firing order and timing are core).
2. Pack Trigger and moving the Stored Sparks cards to it (Sonnet).
3. Black Hole (Sonnet).
4. The 18 cards above, art from the new card art direction once `v1.0-cardart` is chosen (Sonnet).
5. Chain screen track, dial and medallion; in-flight tempo cues (Sonnet).
6. Performance check: pooled Pulses, coalesced feedback at fast tempo.

## Decisions for the user

1. Approve the three rules and the card list as a start: `v1.0-engine`.
2. Black Hole: growth for the run (default) or across runs?
3. Black Hole: keep the name?
