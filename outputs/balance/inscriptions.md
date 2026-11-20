# Inscription value table (2026-11-20, estimate only, no numbers changed)

Method: from the rules in `dist/inscriptions.mjs` and the firings per flight in `outputs/balance/archetypes.md` (9 sim flights per Chain, weaker pilots than the owner): Collect cards fire about 15 times a flight, Pulse cards about 24, Lift Guide about 58 (about 19 for Toll Bell), Delivery cards 0.8, Overfill cards 1.7 to 3.9, Finish cards once, Skim once, Flares at least once. Reference: a good Common card in the Pulse Chain is about 10 Sparks a flight. Stored Sparks are scarcer than Sparks (about 30 earned per flight), so 1 Stored is worth more than 1 Spark. "Worth" is the extra the Inscription brings in a typical flight when it has a sensible card; "does nothing" cases are listed.

| Name | What it does | Worth in a typical flight | Verdict | Proposed change (one sentence, not applied) |
|---|---|---|---|---|
| Twin Mark | The card fires twice (a Boost applies twice) | Doubles that card: about +10 Sparks on a Common, +30 on a Collect card at 15 firings. Nothing on Finish, Timer-ring and once-per-trigger cards | fine | none |
| Gilded | +2 Sparks each firing | +30 on a Collect card, +48 on a Pulse card, about +116 on Lift Guide, +1.6 on a Delivery card | too strong on Lift and Pulse cards, weak on Delivery, Overfill, Skim and Finish cards | none (no nerfs); the gap shows that firing rate decides everything |
| Resonant | Also fires on a Pulse | A Collect card gains about 24 Pulse firings: +24 x its payout, so +48 for a +2 card. Nothing on a card that already fires on Pulse | fine | none |
| Kindled | Also fires on a Lift | About 58 extra firings with Lift Guide in the Chain, so a +2 card gains about +116; about 19 with Toll Bell alone | too strong in a Lift Chain, does nothing without Lifts | none (no nerfs) |
| Courier | Also fires on a Delivery | Delivery happens 0.8 times a flight: about +1 to +3 Sparks | weak | Also fires on a Delivery and on every 3rd Collect (about 5 extra firings a flight). |
| Wellspring | Also fires on an Overfill | Overfill happens 1.7 to 3.9 times a flight: about +4 to +8 Sparks | weak | Fires 3 times per Overfill instead of once (about 5 to 12 firings). |
| Sunlit | Also fires when you Collect a Flare | One Flare a flight at least, so 1 to 2 firings: about +2 to +4 | weak | Also fires on each Pulse of the 8 s Flare (4 more firings per Flare). |
| Mirror | Fires when the card on its left fires | Copies the left card's firing count: about +10 with a Pulse or Collect pair; nothing next to Finish or Timer cards | fine | none |
| Brimful | Sparks above the Meter become Stored Sparks | Only the spill: about 0 to 5 Stored a flight, and only when the Meter is full | weak | Each spilled Spark becomes 2 Stored Sparks (spill is rare, so about 0 to 10 Stored). |
| Whetted | +1 use each flight | One extra firing of a card with uses: about +3 to +10 Sparks. Does nothing on a card with no uses | weak, and does nothing in common cases | +2 uses each flight. |
| Hollow | Empty slot: +2 Sparks on each Collect | About +30 Sparks at 15 Collects, but it costs a slot (a card there is worth about 10 to 20) | fine | none |
| Hearth | +10 max Sparks (Meter cap 100) | Meter 30 to 40: one third more room, fewer wasted Sparks; no direct Sparks | fine | none |
| Lantern | +25% Luminance | See further; no Sparks | fine | none |
| Long Cord | Collector reach +30% | More pickups, about 2 to 4 extra Collects a flight | fine | none |
| Bell | A Pulse every 6 s | About 12 to 19 Pulses a flight: +16 to +48 Sparks with a Pulse card, nothing without one | fine | none |
| Lodestone | Cards on both sides: +1 Spark per firing | Up to +30 with two Collect neighbours; +1 to +2 with idle neighbours | fine | none |
| Ember Bed | Finish: +3 Stored, +1 per empty slot | 3 to 5 Stored once a flight, about 10 to 15% of the Stored a flight earns | weak | +5 Stored, +2 per empty slot. |
| Cinder | Lift costs 1 less Spark | Saves 1 per paid Lift: about 20 to 30 Sparks in a Lift Chain; nothing without Lifts (floor 1) | fine | none |
| Far Lens (chest) | Luminance reaches 15% farther | Sight only, no Sparks | fine | none |
| Quick Lens (chest) | Companion recharge 15% shorter | Small; a few seconds of recharge per flight | weak | Recharge 30% shorter. |
| Mending Wick (chest) | Recover 3 extra Sparks after each clear | 3 Sparks a flight against a 10 reference | weak | Recover 6 extra Sparks. |
| Toll Stamp (chest) | Clear with 3 body pickups: +3 Stored | Almost every flight meets it: +3 Stored, about 10% of income | weak | +5 Stored. |
| Lamplighter's Seal (chest) | Clear holding 12 Sparks: +3 Stored | Same as Toll Stamp when the Meter holds 12 at the end | weak | +5 Stored. |

Notes. (1) The five chest Inscriptions are not obtainable in a normal run yet (docs/inscriptions.md, "Chest gifts"), so their weakness costs nothing today. (2) The pattern: Inscriptions that add a trigger to a card (Courier, Wellspring, Sunlit) are only as good as that trigger's rate, which is 0.8 to 4 a flight for those three against 15 to 58 for Collect, Pulse and Lift; Kindled and Resonant are strong for the same reason. (3) Numbers for Gilded, Kindled and Resonant are upper estimates that assume the card pays Sparks on each firing; sim pilots fire less than the owner.
