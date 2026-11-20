# Useless-card check (2026-11-20)

The card-works audit proves every released card FIRES. This table asks whether a card that fires is worth a slot.

How read: 15 real flights (5 biomes x 3 seeds, pilot human150, cardPilot as in the app) with the card alone and with its obvious partner; "audit" = firings per flight from `outputs/balance/card-works.md`; "text" = read from the card, not flown. Baselines: Body Spark pays 27 Sparks a flight (13.5 firings x 2); Lift Guide 41; Downbeat 131; Pulse Reader 20 alone; Resonant Harvest (common) alone 2.8.

Verdict words: fine / needs a partner it does not bring or name / trigger almost never happens / pays too little to matter / effect invisible or unclear.
Fix status: IMPLEMENTED (text-only, or the card now brings an existing enabler flag) or PROPOSED (numbers, reworks, new mechanics: the owner decides).

## Cards that are not fine

| Card | Needs | How often / pays per flight | Verdict | One fix |
| --- | --- | --- | --- | --- |
| Clear Prism (common, 4 uses) | A Flare pickup AND a Flare-paying card before it | Flare pickups 0.7 a flight. Flare Handling alone 4.0 Sparks; with Clear Prism 8.0. So the whole card is +4 Sparks a flight, 4 flights. Alone: 0. | pays too little to matter; trigger rare | PROPOSED: it also pays +6 Sparks on a Flare itself (the Flare Handling number), so alone it is worth a slot and with a partner it still doubles. Text IMPLEMENTED: the help now says what it doubles. |
| Ember Feeder (rare) | Two cards to its right to give up, a cleared flight | Eats 2 cards for +1 max Spark per clear. Black Hole eats ONE card for +1 to +3. Setup cost is two cards and a flight each time. | pays too little to matter | PROPOSED: eats the next ONE card for +1 max Spark (Black Hole eats one for +1/+2/+3, Feeder repeats every clear) or two cards for +3. |
| Low Ember (rare) | A Pulse card to its right | 2.3 Lifts a flight answered. Alone 0 Sparks. Behind Resonant Harvest: 6.9 against 2.8 alone (+4.1). | needs a partner it does not bring | PROPOSED: also +6 Sparks when it fires (as Close Call now pays its own +12), so it pays alone. Text IMPLEMENTED: help names the Pulse cards it needs. |
| Wave Loom (legendary) | A Timer (Slow Wick, Long Fuse, Metronome) | Alone 0 firings, 0 pulses. The text already says so. | needs a partner it does not bring | PROPOSED: with no Timer in the Chain it makes its own Turn every 6 s (Pulse Reader's 8 s self-timer is the precedent). Needs engine code, not a flag. |
| First Catch (common) | A Pulse card to its right | Once per flight. Alone 0. Behind Resonant Harvest 2.9 against 2.8 alone (+0.1); behind Spark Chime 1.0. | pays too little to matter | PROPOSED: "1st of a flight: a Pulse, +4 Sparks". Text IMPLEMENTED: help names the Pulse cards it needs. |
| Slow Wick (common) | A Pulse to start it, then a Pulse card | Alone 0 hits (nothing starts it). First Catch > Slow Wick > Resonant Harvest 5.5 against First Catch > Harvest 4.1 (+1.4). | needs a partner it does not bring | PROPOSED: it starts its first burn by itself at take-off, so the loop runs without a starter card. |
| Long Fuse (rare) | A Pulse before it and something it can repeat | Alone 0. First Catch > Long Fuse > Harvest: 3.6 against 2.9 (+0.7). | needs a partner it does not bring | PROPOSED: same as Slow Wick: it starts itself at take-off (and repeats the first Trigger that pays). |
| Spark Chime (common) | A card to its LEFT that sends a Pulse | Alone 0. First Catch > Chime: 1.0 a flight. | needs a partner it does not bring | PROPOSED: also hears a real Pulse crossing a Spark (Pulse Reader, Proximity), so it pays like Resonant Harvest without an engine card. Text IMPLEMENTED: help names the Pulse makers. |
| Overflow Bell (rare) | A card to its left that makes Sparks (it keeps only card-made spill) | Alone: 0 Sparks, 0 kept (pickup spill already packs). With Resonant Harvest: 16.6 (the Pulse does it, the Bell's own part is 0). | pays too little to matter alone | PROPOSED: keep 2 Stored also on a pickup's spill (a pickup's spill packs anyway, so make it pack at +2 extra). |
| Afterglow (common) | A Flare that ends | Alone 0 (no Flare in ordinary flights). With Flare Tinder: 32.9 a flight. | needs a partner it does not bring | PROPOSED: Afterglow also starts the Flare Tinder flare itself once a flight (brings the enabler). Text IMPLEMENTED: help names Flare Tinder and Flare Handling. |
| Flare Bank (rare) | A Flare pickup, meter 1/3 or less | 0.0 firings in 15 natural flights; 0.5 with an assisted Flare (audit). | trigger almost never happens | PROPOSED: pays +8 on any Flare pickup but +12 when low (pays for how hard the trigger is). Text IMPLEMENTED: help says Flares are rare and names Flare Tinder. |
| Flare Thread (common, 5 uses) | A Flare pickup and a recovering Collector | 0.0 firings in 15 natural flights. | trigger almost never happens | PROPOSED: also fires on a Flare the Collector fetches and shortens by 5 s. Text IMPLEMENTED: help says when it pays. |
| Prism Wick (common, 3 uses) | A Flare that ends | 0.0 in 15 natural flights (audit 1.0 with an assisted Flare). | trigger almost never happens | PROPOSED: +3 -> +8 Sparks, since the trigger is hard (the Skim Line precedent). |
| Courier Tip (common) / Courier Tip III (legendary) | A Delivery | 1.6 Deliveries a flight: +3.2 Sparks (III: +5 each: 8.0). Courier Cord pays 17.3 on the same trigger. | pays too little to matter | PROPOSED: Courier Tip +2 -> +6 (III +5 -> +12). The trigger is hard (1.6 a flight), Courier Cord is the precedent. |
| Crate Lining (common, 4 uses) | A Delivery (Cache full, Cluster half) | 1.3 firings: 5.1 Sparks a flight. | pays too little to matter | PROPOSED: +8 -> +12 on a Cache, half on a Cluster. |
| Courier Glass (common, 5 uses) | A Delivery card before it | Doubles Courier Tip: +3.2 more Sparks a flight. | pays too little to matter | Follows the Courier Tip fix (its partners get bigger). |
| Glass Spool (common) | A Collector that is recovering | 2.4 Collects a flight, 0.5 s each: about 1 s a flight. | pays too little to matter | PROPOSED: 0.5 s -> 1.5 s. |
| Return Spring (common) | A reel | 1.8 reels a flight, 0.5 s each: under 1 s a flight. | pays too little to matter | PROPOSED: 0.5 s -> 1.5 s. |
| Momentum (legendary) | 5 Turns in a row from a Timer | With Metronome > Body Spark: 85.1 against 85.7 without (no Sparks); +40% Luminance only. | effect invisible or unclear | PROPOSED: the +40% Luminance also reveals more of the passage with a visible ring cue, or it pays +1 Spark a Turn while it lasts. |
| Third Beat (rare) | A Timer | Alone 0. With Metronome > Body Spark: 99.9 against 85.7 (+14). | needs a partner it does not bring (the text names Turns, not Timers) | PROPOSED: face "Every 3rd Timer Turn counts twice". Text-only candidate, left to the owner because the face is two short lines already. |
| Full Satchel (common) | The Finish | +3 Sparks before packing, once. Body Spark pays 27. | pays too little to matter | PROPOSED: +3 -> +8. |
| Victory Lap (common) | Several different cards that fired | About 1 Stored per card that fired, so 3 to 4 in a 5-slot Chain. Clean Run pays 5, Wayfarer's Purse 5. | pays too little to matter | PROPOSED: +1 -> +2 Stored per card. |
| Cache Handling (rare) | A Cache on the course | Not flown: how often a Cache appears was not measured. Fetches Caches for +12. | effect invisible or unclear | PROPOSED: measure Caches per flight first; if under 1, +12 -> +20. |
| Homing Thread (rare) | A Delivery and a charged Collector | 1.7 Deliveries a flight, 1.6 answered. Pays no Sparks itself. | effect invisible or unclear | PROPOSED: the fetched Spark shows a thread to it (a cue, no text). |

## Fixed today (IMPLEMENTED)

| Card | What it silently needed | Fix |
| --- | --- | --- |
| Toll Bell, Pacesetter | A Rhythm card (their Trigger is a Rhythm phrase). Alone: 0 firings in 15 flights. With Rhythm: Toll Bell 36.8 Sparks a flight. | Both turn Rhythm on for the flight themselves (existing flag `cardRhythm`), help says so. Alone they now fire in real flights (tests/useless-card-fixes.test.mjs). |
| Close Call | A Proximity or Edge Reach card | Brings Proximity (as Skim Line), pays +12: alone 12.8 Sparks a flight. |
| Low Ember, First Catch, Ember Bell, Spark Chime, Clear Prism, Afterglow, Flare Bank, Flare Thread | Help did not say what they need | Help now names the partner (text-only). |

## Every released card

Pays are per flight, from the measurements above or the audit; "audit" firing counts come from `card-works.md`.

| Card | Needs | Trigger rate / pays per flight | Verdict |
| --- | --- | --- | --- |
| Body Spark | Nothing | Collect, 13.5 firings, 27 | fine |
| Spark Cache (Pocket Sparks) | Nothing | Collect, 6 uses, 24 | fine |
| Deep Vessel | Nothing | Passive: bigger Meter | fine |
| Tight Packing / II / III | A Meter that packs | Passive +50/75/100% Stored from packing | fine |
| Echo / Echo II / Echo III | A card to its right | Repeats the next card 1/2/3 times | fine (names its partner) |
| Chameleon | A card to its right | Borrows its ability | fine |
| Lift Guide | Nothing | 41 firings, +1 each, 41 | fine |
| Skim Line | Nothing | 1.1 Skims, +12: 12.8 | fine |
| Pulse Reader | Nothing | Own Pulse every 8 s: 20.3 alone, 153.7 with Resonant Harvest | fine |
| Courier Cord | Nothing | 1.7 Deliveries, +10 over 10 s: 17.3 | fine |
| Meter Mark | Nothing | 7.3 Stored alone | fine |
| Finish Flag | Nothing | retired (not released) | skipped |
| Rhythm | Pulse cards to pay | 3 even Lifts: a Pulse; 0 Sparks alone | fine (Toll Bell now brings its own) |
| Resonant Harvest C / R / L | A Pulse crossing a Spark | Alone 2.8; behind Ember Bell 16.6, Pulse Reader 77 each | fine (the Pulse partner is named) |
| Second Ember (camp-kit) | A Rest | 2 Rest actions | fine |
| Growth Seed / common / legendary | A Rest | +5 / +3 / +8 max Sparks | fine |
| Flare Handling | A Flare | 0.7 Flares, 4.0 | fine |
| Prism Lens / II, Crescendo, Closing Chord, Second Sun, Refrain, Mirror Grain | Cards before it | Boosts: x1.25 / x3 / x2 / x2.5 / x2+x3 / Encore / repeat last | fine |
| Downbeat / III | Nothing | Falling Lift, 65 firings: 131 | fine |
| Ring Spring / II | Overfills | 6 Overfills: banks 1 s / 2 s each | fine |
| Watchlight | A Collector at home | Saves a crash once a flight | fine |
| Second Look | A card reward | Re-roll 1 | fine |
| Lantern Lens | Nothing | +20% Luminance | fine |
| Dusk Wick / II / III | A Dusk Spark | 0.7 a flight, +20/30/40: 14.7 | fine |
| Cluster Heart | A Cluster | 5.0 firings, 30 | fine |
| Low Wick | Meter low | 1.5 firings, 7.3 | fine |
| First Ripple, Far Shore, Ripple Glass | A Pulse crossing | 2.5 and 1.6 firings: 10.1 and 8.0; Glass doubles | fine |
| Toll Bell, Pacesetter | Rhythm | now bring their own, see above | fine after fix |
| Proximity (Slip Feather) / Edge Reach | Pulse cards to pay | A Pulse every 2 s near terrain; with Harvest 6.5 / 9.6 against 2.8 | fine |
| Heart Stitch (tailwind) | A missing heart | 3rd Collect: +1 heart, 2 uses | fine |
| Springboard | A falling Collect | Bounce | fine |
| Counterweight | A recovering Collector | 4.6 firings, 0.75 s each: 3.5 s | fine |
| Glide Prism | Cards before it | x2 on Lift | fine |
| Home Beacon / Clean Run / Wayfarer's Purse / Nest Egg | The Finish | 9 / 5 / 5 / up to 10 Stored | fine |
| Curtain Call | A first card with Sparks | First card fires x3 at the Finish | fine |
| Growth Ring / Wind Feather | The Finish | +1 max Spark / +1% speed per Finish | fine |
| Brimful | A full Meter | +1 Spark per Collect, spilled (feeds Overfill cards) | fine |
| Pressure Valve, Floodgate | Overfills | 7.5 and 6.0 events (audit) | fine |
| Last Light | The last heart | Rewards x2 | fine |
| Haul Winch | A Delivery | 1.3 firings, Collector time | fine |
| Fast Spool | A reeling Collector | 1.6 firings, 3 s | fine |
| Kindling Bead / II / III | A + card before it | +1 / +2 / +4 Sparks | fine (face names it) |
| Devourer | A Rare to its right, a missing heart | Probe: +1 heart | fine |
| Use Doubler | A card with uses to its right | Doubles uses | fine (text names it) |
| Wick Doubler | Cards before it | x2, 3 uses | fine |
| Twin Orbit / Twin Wick | A Collector | 2nd Collector | fine |
| Long Spool / Cast Line | A far pickup | Reach +35% / +100% | fine |
| Dream | A Rest or Elite | Practise 8 s | fine |
| Double Lift / Climb | Lifts | Free Lifts | fine |
| Metronome | A card to its right that can act | Every 3 s: 85.7 with Body Spark | fine |
| Heartbeat | A Timer | Timers wait half | fine (names its partner) |
| Flare Tinder | A Collect | Starts a 1 s Flare, 16.7 times a flight | fine |
| Ember Bell | A Pulse card | Behind Resonant Harvest 16.6 against 2.8 | fine after help fix |
| Black Hole | A card to its right | +1/+2/+3 max Sparks for good | fine |
| Last Round, Harvest Home | The Finish | Last Trigger / Collect cards fire again | fine |
| Close Call | Nothing now | 12.8 | fine after fix |
| Clear Prism, Ember Feeder, Low Ember, Wave Loom, First Catch, Slow Wick, Long Fuse, Spark Chime, Overflow Bell, Afterglow, Flare Bank, Flare Thread, Prism Wick, Courier Tip (+III), Crate Lining, Courier Glass, Glass Spool, Return Spring, Momentum, Third Beat, Full Satchel, Victory Lap, Cache Handling, Homing Thread | see the first table | | not fine |
