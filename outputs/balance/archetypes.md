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

---

## After the fix set (2026-11-20)

Same method as above (`node scripts/balance/archetype-table.mjs --deep`, real flights, 9 per Chain, pilot `player-good`). Loop check: `node scripts/balance/timer-loop-check.mjs`.

**Timer.** Slow Wick (3 s) and Long Fuse (5 s) now light at take-off and again after every firing, with or without a Pulse; a Pulse they hear while burning is ignored, so they never fire faster than their period. Third Beat is Common. Faces read "Timer / Every 3 s: a Pulse" and "Every 5 s: fires again". The Chain tab preview now runs take-off, so Slow Wick, Long Fuse and Wave Loom alone show their repeating Turns instead of "runs once". In flight every mounted Timer card's frame fills as a ring over its period and flashes when it fires (paused with the flight).

| Chain | Cleared | Card Sparks / flight | Firings / flight |
|---|---|---|---|
| Slow Wick alone | 3/9 | 0 | 0 (pays nothing itself) |
| Spark Chime, Slow Wick | 8/9 | 10.8 | 43.8 / 0 |
| Slow Wick, Spark Chime | 8/9 | 10.8 | 0 / 43.8 |
| Long Fuse, Spark Chime | 3/9 | 0.3 | 0 / 1.8 |
| Spark Chime, Long Fuse | 3/9 | 0.3 | 1.8 / 0 |
| Pulse Reader, Spark Chime, Slow Wick | 8/9 | 170.8 | 477.9 / 512.0 / 0 |

Slow Wick + Spark Chime pays 10.8 card Sparks a flight (asked about 28; the rest hits a full Meter): inside the 10 to 40 window but at its low end, against about 20 for the Pulse Chain. Long Fuse + Spark Chime stays near zero: Probable cause, not checked: Long Fuse repeats the last Trigger from flying that the Chain answered, and with only a Chime there is often nothing to repeat. FLAG: Pulse Reader + Spark Chime + Slow Wick pays 170.8 Sparks a flight (was 12.0): every Slow Wick Pulse crosses many Sparks and each crossing fires both Pulse cards (up to 74 log entries in one instant, 393 gains a flight). No safety stop and one Timer firing per step, but it is 8 times the Pulse Chain. Proposal, not applied: lengthen Slow Wick to 5 s, or let a Timer's Pulse pay each Pulse card at most once per ring.

**Finish.** Home Beacon pays +3 Stored per heart left plus +1 per full 10 Sparks in the Meter at the clear: +11.0 per cleared flight over the baseline of 42.0 (was +8.9; target 9 to 14). Victory Lap counts a card once plus once more per full 10 firings: +6.3 with Lift Guide beside it (was +0.9; target 3 to 5, so slightly high because Lift Guide alone fires about 58 times: 1 + 5). Proposal if that is too much: step of 15 firings instead of 10 (Lift Guide would give 1 + 3). Every live Finish card reads "Once: ..." on its face and tile, and its help says "Fires once, when you clear the flight." (Curtain Call says Boosts to its right do strengthen its Sparks, since that is true.)

**Owner numbers applied (2026-11-20): Slow Wick 5 s, Victory Lap step 15.** Same method (`archetype-table.mjs --deep`, 9 flights per Chain). Slow Wick + Spark Chime: 5.3 card Sparks and 22.1 firings per flight (was 10.8 and 43.8 at 3 s). Pulse Reader + Spark Chime + Slow Wick: 94.2 Sparks, firings 248.3 / 267.9 / 0 per flight (was 170.8 at 3 s), still about 4.4 times the reference of Pulse Reader + Spark Chime alone: 21.4 Sparks, 50.3 / 50.3 firings per flight.
Victory Lap beside Lift Guide adds +4.4 Stored per cleared flight (was +6.3 with step 10; target 3 to 5, now inside it). Home Beacon unchanged at +11.0. Loop check: no safety stops, one Timer firing per step.

## Timer beat rule (2026-11-20)

Owner decision: a Pulse made by a Timer firing (Slow Wick, and Wave Loom whenever a Timer fires or on its own 6 s) is a beat. Each Pulse card that may hear it fires exactly once per Timer firing; the ring is still drawn and still lights the passage, but its crossings fire no card. Pulses from other sources (Pulse Reader's 8 s Pulse, Flares, Bell, First Catch, Close Call, Ember Bell, Overfill waves) keep per-Spark crossings. Slow Wick is back to 3 s. Pulse cards that fire only on later crossings (Far Shore, Ripple Glass) do not hear a beat, which is one event; First Ripple-type cards hear it as a first crossing.

Same method (`archetype-table.mjs --deep`, 9 real flights per Chain, pilot `player-good`; loop check `timer-loop-check.mjs`):

| Chain | Cleared | Card Sparks / flight | Firings / flight (L to R) | Target |
|---|---|---|---|---|
| Spark Chime, Slow Wick | 8/9 | 10.8 | 43.8 / 0 (asked 43.8, the rest hits a full Meter) | pair 15 to 25: below |
| Pulse Reader, Spark Chime | 5/9 | 21.4 | 50.3 / 50.3 | reference |
| Pulse Reader, Spark Chime, Slow Wick | 6/9 | 43.4 (was 94.2 at 5 s, 170.8 at 3 s) | 94.9 / 94.9 / 0 | trio 30 to 50: inside |
| Slow Wick, Wave Loom, Resonant Harvest | 4/9 | 9.5 | 0 / 0 / 31.8 | none set |

Loop check: no safety stops, at most 1 Timer firing per step, at most 9 engine log entries in one instant (Slow Wick + Spark Chime 8, Slow Wick + Wave Loom + Harvest 7, Metronome + Slow Wick + Third Beat + Momentum 9).

FLAG: the Slow Wick + Spark Chime pair pays 10.8 Sparks a flight, under the 15 to 25 target, because a beat pays once and the Meter fills (asked 43.8 against 10.8 real). Not changed. Proposals if the owner wants the pair stronger: Slow Wick every 2 s, or Spark Chime +2 on a beat. Also seen, not caused by the beat: two Spark Chimes beside a Slow Wick start an Overfill-wave loop (404 Overfill waves a flight in one test flight) because each Chime's crossing spills into a full Meter and the spill makes a new wave; the engine does not stop it. Needs its own look.

## Chances instead of counters (2026-11-20)

Owner rule: a card or Inscription that should pay less often rolls a percentage per firing (a coin toss), never a counter and never "once per X seconds". One helper, `dist/card-chance.mjs` (`rollChance`), draws from a seeded stream owned by the flight (seed `<flight seed>:card-chance`, one draw per roll, never per frame; the Chain-tab simulator uses one fixed seed; previews show the full effect in plain words). Converted: Lift Guide on the cue 50%: +1 Spark; Gilded each firing 50%: +2 Sparks; Meter Mark each Overfill 50%: keeps 1 Stored; Courier on a Collect 33%: also fires; Third Beat each Timer firing 33%: gains count twice.

Method: real flights, `starter-sim.mjs` (pilot `player-good`, route `sb1`, stops 2 to 4, 5 trials each = 15 flights per Chain), the same flights before (HEAD) and after (the rolls vary the flights, so counts move by a few flights either way: read trends, not single flights). Per flight: firings of the card, card Sparks, Stored.

| Chain | Cleared before | Cleared after | Card Sparks / flight before | after | Firings / flight before | after |
|---|---|---|---|---|---|---|
| Lift Guide alone | 12/15 | 9/15 | 15.8 | 6.5 | 52.5 | 21.7 |
| Skim Line alone (reference) | 4/15 | 4/15 | n/a | n/a | n/a | n/a |
| Pulse Reader alone (reference) | 8/15 | 8/15 | 5.3 | 5.3 | 17.7 | 17.7 |
| Lift archetype (Lift Guide, Toll Bell, Pacesetter) | 13/15 | 14/15 | 17.2 + 11.4 + 0 | 8.5 + 11.8 + 0 | 57.5 / 18.9 / 1.4 | 28.3 / 19.7 / 1.7 |
| Lift Guide + Gilded on its slot | 10/15 | 7/15 | 43.3 | 11.4 | 48.1 | 19.6 |
| Pulse Reader, Harvest + Gilded on Harvest | 11/15 | 9/15 | 6.7 + 20.0 | 6.8 + 12.5 | 22.2 / 22.2 | 22.5 / 22.5 |
| Pulse Reader, Harvest (no Gilded) | 7/15 | 7/15 | 5.9 + 5.9 | 5.9 + 5.9 | 19.8 / 19.8 | 19.8 / 19.8 |
| Meter Mark alone | 4/15 | 4/15 | Stored 1.53 | Stored 1.27 | 1.5 | 1.3 |
| Lift Guide, Meter Mark | 12/15 | 9/15 | Stored 6.87 (Mark) | 4.33 (Mark) | 52.5 / 6.9 | 22.2 / 4.3 |

Reading: Lift Guide alone pays 59% less card Sparks (15.8 to 6.5) and clears 9 of 15 instead of 12 of 15; that is level with Pulse Reader alone (8/15) and well above Skim Line (4/15), so the nerf lands it on the Pulse reference rather than below it. Gilded on Lift Guide fell from 43.3 to 11.4 card Sparks a flight (the very strong pairing in `inscriptions.md` is tamed: 7/15 clears, below Pulse + Gilded at 9/15). Gilded on a Pulse card pays 12.5 instead of 20.0. Meter Mark alone keeps about the same Stored (1.3 against 1.5: 50% of every Overfill replaces every 2nd, an equal average); beside Lift Guide it falls with Lift Guide's own spill (6.9 to 4.3). Courier and Third Beat were checked by the long-run frequency test in `tests/card-chance.test.mjs` (33% of Collects, 33% of Timer firings), not by flights.
