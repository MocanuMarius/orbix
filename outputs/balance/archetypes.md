# Archetype table (2026-11-20)

Made by `node scripts/balance/archetype-table.mjs [--deep]`. Real flights through the same headless engine the app uses (`scripts/balance/starter-sim.mjs`): course behind run seed `sb1`, stops 2, 3 and 4, three pilot trials each, so 9 flights per Chain, Meter and hearts as the pilots normally start those stops. Pilot: `player-good`.

**Caveat.** The sim pilots are weaker than the owner (capture about 85% against 96%) and do not play to every card. Use this to compare archetypes with each other and to find dead cards, not to size numbers. Nine flights per Chain is small: a difference of one clear is noise.

## The table

Cards are listed left to right. "Card Sparks" is what the Chain's cards paid into the Meter per flight, in Sparks. "Stored" is Stored Sparks the cards paid during the flight (not at the Finish). "Firings" is how many times each card fired per flight. Cleared is clears over flights flown; cleared depends on the whole run state, not only on the Chain.

| Archetype | Chain | Cleared | Avg s | Card Sparks | Stored | Firings per flight | Never fired |
|---|---|---|---|---|---|---|---|
| Collect | Body Spark, Pocket Sparks, Cluster Heart | 2/9 | 75 | 21.3 | 0 | 15.2 / 4.7 / 3.7 | none |
| Lift | Lift Guide, Toll Bell, Pacesetter | 8/9 | 114 | 28.9 | 0 | 58.3 / 19.0 / 1.2 | none |
| Pulse | Pulse Reader, Resonant Harvest, First Ripple | 7/9 | 103 | 21.5 | 0 | 24.3 / 24.3 / 5.8 | none |
| Delivery | Courier Cord, Courier Tip, Courier Glass | 3/9 | 73 | 5.6 | 0 | 0.8 / 0.8 / 0.8 | none |
| Overfill | Meter Mark, Ember Bell, Spill Jar | 3/9 | 74 | 0 | 1.7 | 1.7 / 3.9 / 3.9 | none |
| Finish | Home Beacon, Clean Run, Victory Lap | 3/9 | 74 | 0 | 0 | 0 / 0 / 0 (see below) | see below |
| Skim | Skim Line, Close Call, Whetstone | 5/9 | 86 | 1.4 | 0 | 1.0 / 1.0 / 1.0 | none |
| Timer | Spark Chime, Slow Wick, Long Fuse | 3/9 | 71 | 0.3 | 0 | 2.1 / 0 / 0 | Slow Wick, Long Fuse |

Notes on the picks. Collect, Finish, Timer and Delivery have no Common starter in their trigger, so they use Commons. Skim has only the starter as a Common; Close Call and Whetstone are Rare. Long Fuse is Rare (Timer has two Commons only: Slow Wick and, as a listener, Spark Chime). The Finish cards fire when the flight is cleared, after the engine log stops, so the 0s in that row are a measuring limit, not dead cards; the Finish section below measures them properly.

## Findings

1. Strongest: Lift (Lift Guide plus Toll Bell) and Pulse. Both clear 7 or 8 of 9 and pay 21 to 29 Sparks a flight. Lift Guide alone fires about 58 times a flight, which is why that Chain looks so good: it is the starter doing most of the work.
2. Weakest: Timer (0.3 Sparks a flight, two of three cards silent), then Delivery (5.6) and Skim (1.4). Finish and Overfill pay Stored Sparks only, so Card Sparks 0 is expected for them.
3. Pacesetter fired only 1.2 times a flight beside Toll Bell and Lift Guide. It is nearly dead in this Chain; read its rule before trusting it.
4. Delivery cards fired 0.8 times a flight each. The Collector rarely completes a delivery for the sim pilots, so the Chain sits idle most of the flight.
5. Slow Wick and Long Fuse never fired in the Timer Chain. They are covered in the Timer section.
6. Overfill is thin: 1.7 Stored per flight from Meter Mark and a few Pulses from the bells.
7. Skim cards each fire once a flight: one skim per flight is all the pilots make.

---

## FINISH: how it really works

All from the code (`dist/model.mjs` `finishFlight`, `dist/skill-cards.mjs`), then measured with Lift Guide plus the card, against a baseline of Lift Guide plus Deep Vessel (a passive card that pays nothing).

**When it fires.** Once per flight, only when the flight is cleared. A flight that ends in a fall never fires it, and a flight you clear after a crash fires it once. It fires at the Finish, after the flight has stopped, so you never see it during play. A repeated clear of the same stop in a run cannot fire twice (a receipt keyed on run, map and stop blocks it).

**What it pays into.** Stored Sparks, never the Meter. The only Finish card that touches the Meter is Curtain Call, and only because its Sparks land in the Meter just before the Finish packs the Meter into Stored Sparks. Sparks gained at the very end of the flight are not lost: the Finish packs whatever is left in the Meter into Stored Sparks, and the Pack cards (Last Round, Full Satchel, Tithe) fire first, so their Sparks go into the Meter before it is packed. A Finish card's Stored Sparks go straight into the flight's reward and are not packed again.

**What affects it, and what silently does not.**
- Boost (Prism Lens and the other Boosts): does nothing. Boosts multiply Sparks, and almost every Finish card pays Stored Sparks, which Boosts never multiply. The card text says so, but a player putting a Boost in front of Home Beacon gets nothing and no warning.
- Echo and Repeat: Echo repeats the next card, so Echo before Curtain Call makes 6 firings. For the Stored Finish cards there is no stated effect either way.
- Heart rules matter: Clean Run needs a flight with no heart lost, even one lost and then survived; Home Beacon pays per heart still held.
- Slot Inscriptions: the Finish rule is resolved with the Chain's Inscriptions included, so an Inscription on a slot can act on a Finish card in that slot. I did not test any Inscription here.
- Growth is stored on the card: Growth Ring (+1 max Spark per Finish) and Wind Feather (+1% speed per Finish, up to +10%) pay nothing the first time you look at the clear screen.

**Every live Finish card, measured on cleared flights** (Stored per cleared flight, difference from the baseline of 42.0, nine flights each; 7 of 9 cleared):

| Card | Rule | Real yield per flight |
|---|---|---|
| Home Beacon | +3 Stored per heart left, one use a flight | +8.9 (three hearts) |
| Clean Run | +5 Stored if no heart lost | +4.9 |
| Wayfarer's Purse | +5 Stored, no packing bonus | +4.9 |
| Victory Lap | +1 Stored per other card that fired | +0.9 with one other card; at most Slots minus 1 |
| Nest Egg | +1 Stored per 10 carried in, max +10 | about 0: the pilots carried under 10 |
| Curtain Call (Rare) | Slot 1 fires 3 times at the Finish | +0.1: Slot 1 was Lift Guide, which pays 1 Spark and only on a Lift |
| Growth Ring | +1 max Spark per Finish | 0 Stored; grows the Meter by 1 |
| Wind Feather | +1% speed per Finish, up to +10% | 0 Stored; speed only |

The whole clear is worth about 42 Stored a flight before any Finish card, so the best card adds roughly 20% and the typical one 2 to 12%.

**Why it is weak and confusing.**
1. It pays once per flight and only at the very end, so it cannot make a flight feel stronger while you fly.
2. The payoff is a small flat Stored number on top of about 42; by flight 3 it hardly changes what the player can afford.
3. No payoff is visible in flight. The player sees nothing fire on the card row until the result screen.
4. Boosts, Echo and most other cards the player already understands do not combine with it, and the game does not say so on the card.
5. Three of the eight cards (Growth Ring, Wind Feather, Nest Egg) are not "bonus at the end" at all; they are slow counters or conditions the player must understand from text.
6. Victory Lap needs other cards to fire, but a Chain of three Finish cards does not fire anything in flight, so that Chain pays nothing.
7. Clean Run and Home Beacon punish the very flights where the player most needs help.

**Proposals (rules, not applied).**
1. Pay a Finish card's Stored Sparks scaled by how well the flight went (for example Home Beacon +3 per heart plus +1 per 10 Sparks left in the Meter). Expected: +9 to +14 Stored per flight, for 3 hearts and a healthy Meter.
2. Let a Boost multiply Stored Sparks paid by a Finish card (Prism Lens x1.25 on a +9 gives about +11), and print "Boost works" on those cards so the combo is real and visible. Expected: +2 to +4 Stored for a Chain of two Finish cards and a Boost.
3. Make Finish cards fire an extra time for each card that fired at least 10 times in flight (Victory Lap pays 1 per card, but the same card counts again per 10 firings). Expected: Victory Lap +3 to +5 Stored per flight in a Pulse or Lift Chain, and the Chain becomes a way to turn a busy flight into Stored Sparks.

---

## TIMER: what exists, what works

**Cards that are a Timer.** Slow Wick (Common, waits 3 s), Metronome (Rare, every 3 s, fires the card to its right), Long Fuse (Rare, waits 5 s, repeats the Chain's last answered Trigger). Wave Loom (Legendary) sends its own Pulse when a Timer fires.

**Cards that need a Timer.** Third Beat (Rare: every third time a Timer fires, each Spark gain counts twice), Momentum (Legendary: +1 Spark per Timer fire), Wave Loom (Legendary). Spark Chime is a listener, not a Timer; it hears a Pulse from any source.

**What each did in my flights** (card Sparks per flight and firings per card per flight, 9 flights each):

| Chain | Cleared | Card Sparks | Firings |
|---|---|---|---|
| Slow Wick alone | 3/9 | 0 | 0 |
| Spark Chime alone | 3/9 | 0.3 | 1.8 |
| Spark Chime, Slow Wick | 3/9 | 0.3 | 2.1 / 0 |
| Slow Wick, Spark Chime | 3/9 | 0.3 | 0 / 2.1 |
| Long Fuse, Spark Chime | 3/9 | 0.3 | 0 / 1.8 |
| Spark Chime, Long Fuse | 3/9 | 0.3 | 1.8 / 0 |
| Metronome, Body Spark | 6/9 | 28.4 | 0 / 47.6 |
| Body Spark, Metronome, Spark Chime | 6/9 | 24.2 | 22.1 / 0 / 42.8 |
| Pulse Reader, Spark Chime, Slow Wick | 6/9 | 12.0 | 21.2 / 22.2 / 0 |

(Firings of 0 for a Timer card means the card itself pays nothing; its job is to fire another card. Slow Wick next to Spark Chime added only 0.3 firings over Spark Chime alone, about one extra Pulse every three flights, instead of the roughly 30 a flight its 3 s wait would suggest. Long Fuse added nothing.)

**What does nothing alone.** Slow Wick and Long Fuse: they pay nothing themselves and send their Pulse only to a card to their left that hears a Pulse. Even with that partner they added almost nothing, because after the first take-off firing they only relight on a Pulse they hear, and nothing keeps feeding them. Spark Chime alone pays only when a real Pulse (a Flare) happens to cross a Spark. Metronome is the only Timer that did real work: it tripled Body Spark's firings, from about 15 to about 48 a flight.

**What is missing for a complete archetype.**
- A starter. Every other archetype has a Common starter; Timer's working card (Metronome) is Rare and its partners are Rare or Legendary.
- A reliable first beat. Slow Wick and Long Fuse light once at take-off and then stall unless something else sends a Pulse. They need a source of Pulses in the Chain, which makes them a Pulse support card, not a Timer archetype.
- Payoffs at Common. Third Beat is Rare, Momentum and Wave Loom Legendary, so a Timer Chain cannot be built before the late game.
- Visibility without reading. The engine only exposes a small progress state (`timers[].progress`) and a strip cue that pulses on a new beat; I found no per-card countdown the player can see in flight, so the player cannot tell whether the Timer is waiting, burning or stopped.

**Proposals (not applied).**
1. Give Slow Wick a plain loop: it relights itself 3 s after it fires, whether or not a Pulse arrives. Expected: about 30 firings a flight; with Spark Chime to its left roughly +20 to +30 Sparks, at the level of the Lift and Pulse Chains.
2. Add a Common starter Timer ("Dripping Wick": every 4 s fires the card to its right once, like a weaker Metronome, +2 Sparks only if that card pays). Expected: Body Spark or Pocket Sparks chains reach about 20 Sparks a flight, close to the Pulse starter Chain.
3. Show the Timer on its card face as a ring that fills in the card row (no text), and make Third Beat a Common so a payoff exists. Expected Sparks unchanged; this makes the archetype readable and buildable early.
