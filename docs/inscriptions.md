# Inscriptions: artifacts become effects written on cards

Status: proposal for the owner. Nothing here is built. Preview: `dist/design-lab/inscribe.html` (codes `v1.0-inscribe-A/B/C`).

## The idea in plain words

An artifact is a separate relic. You hold it, and its effect hides in a list.

An Inscription is the same effect, written on one card. It shows in the Chain, on the card's face, and it follows the card's rules. A card's effect lives on the card, so the Inscription works only while the card is mounted.

Source of the facts below: `ARTIFACTS` in `dist/model.mjs` (52 artifacts), `GUARDIAN_RELICS` in `dist/guardian-artifacts.mjs` (18 of them), `CONSUMABLE_ARTIFACTS` in `dist/artifact-info.mjs` (charges), `availableFlightArtifacts` in `dist/model.mjs` (where they come from).

How artifacts are obtained today, from the code: an Elite flight reward offers any artifact you do not hold. A Boss flight reward offers only the 21 boss relics (the 18 guardian relics plus Sunheart Engine, Dream Sovereign, Hollow Covenant). Map 3 bosses offer none. Companion artifacts (Wayfinder Seed, Iron Petal, Storm Knot, Hollow Bell) appear only if you carry that companion. Every artifact can be sold (25, 35 rare, 50 boss). I found no separate "chest" or "relic stop" reward path in `model.mjs`; if the map has one, it likely reuses the Elite reward. Not verified.

## 1. Inventory of every artifact (52)

Source codes: **B** = Boss or Elite reward (boss relic). **E** = Elite reward. Charges: only two artifacts have charges today.

| id | Name | What it does today | Charges | Obtained |
| --- | --- | --- | --- | --- |
| rescue-wick | Rescue Wick | A paid Lift leaves 3 Sparks or fewer: restore up to 9. Once per flight. | none (1/flight) | B |
| galespun-spindle | Galespun Spindle | Touch fuel yourself inside a draft: store one free Lift. 3 per flight. | none (3/flight) | B |
| moonwake-lens | Moonwake Lens | Touch fuel yourself while descending: reveal passage 1.5 s. 3 per flight, 6 s apart. | none | B |
| ascent-chime | Ascent Chime | Touch fuel yourself while climbing: take 3 s off companion recovery. 4 per flight. | none | B |
| threefold-chalice | Threefold Chalice | Collect a small Spark, a Cluster and a Cache: next paid Lift restores up to 9. 2 sets per flight. | none | B |
| salt-crown | Salt Crown | Fuel overfills the meter: store one free Lift. 3 per flight. | none | B |
| twin-lanterns | Twin Lanterns | Two same-strength fuel Sparks in a row: restore up to 6. 3 pairs per flight. | none | B |
| restless-feather | Restless Feather | Five paid Lifts: take 4 s off companion recovery. 3 per flight. | none | B |
| stillwater-bell | Stillwater Bell | Coast 1.2 s, then touch fuel yourself: restore up to 6 extra. 3 per flight. | none | B |
| first-light-standard | First Light Standard | Start each flight with three free Lifts. | none | B |
| black-atlas | Black Atlas | Two ranks of the flight-path guide; Luminance +25. | none (passive) | B |
| storm-keel | Storm Keel | Resist 40 points of draft force; fall 10% faster. | none (passive) | B |
| eclipse-mirror | Eclipse Mirror | Natural fuel clears a Dark Spark penalty: reveal and restore up to 6. 3 per flight. | none | B |
| relay-moth | Relay Moth | Companion completes two actions: restore up to 6. 3 pairs per flight. | none | B |
| undertow-pearl | Undertow Pearl | Paid Lift while a Black Hole drains you: restore up to 6 and reveal. 2 per flight. | none | B |
| sunken-vault | Sunken Vault | Overfill: store 3 extra Sparks per 6 surplus. | none (passive) | B |
| pilgrims-clock | Pilgrim's Clock | Fly 15 s, then a paid Lift: restore up to 6. 3 per flight. | none | B |
| beacon-chain | Beacon Chain | Three natural fuel Sparks within 5 s: cast forward light 5 s. 3 per flight. | none | B |
| sunheart-engine | Sunheart Engine | Natural fuel gives 8 extra Sparks; overflow recharges companion and lights ahead. | none (caps per flight) | B |
| dream-sovereign | Dream Sovereign | Dream pickups recharge companion; first waking fuel reveals; lit fuel stores free Lifts; light +35. | none (4 Lifts/flight) | B |
| hollow-covenant | Hollow Covenant | Lift costs 1 less; companion work primes +12 Sparks; skim a Dark Spark for 6. | none (5/flight) | B |
| wayward-seed | Wayward Seed | Three body pickups in a row: restore 3.34. Evolves after Map 1 (Hearth or Lantern Bloom). | none (5/flight) | E |
| hearth-bloom | Hearth Bloom | Three body pickups in a row: restore 10. | none (5/flight) | E (evolution) |
| lantern-bloom | Lantern Bloom | Three body pickups in a row: reveal scene 1.5 s. | none (5/flight) | E (evolution) |
| glow-wick | Spark Wick | Natural pickups restore up to 10 extra Sparks while the meter is below full. | 3, consumed when empty | E |
| flash-stone | Flash Stone | Natural pickups reveal the scene 1.5 s. | 2, consumed when empty | E |
| overflow-coil | Overflow Coil | Fuel that cannot fit recharges companion (2 s per pickup, 12 s per flight). | none | E (rare) |
| echo-bell | Echo Bell | Companion work primes next direct pickup for +8 Sparks within 8 s. | none (5/flight) | E (rare) |
| dawn-loom | Dawn Loom | Pickup-granted companion recharge lights the route 1.5 s. | none (recharges 4 s) | E (rare) |
| sunspool | Sunspool | Natural fuel in extra light stores one free Lift. Up to 4 per flight. | none | E (rare) |
| dreamcatcher | Dreamcatcher | During preset playback each natural pickup recharges companion 1.5 s. | none | E |
| second-dawn | Second Dawn | First natural pickup after dream playback reveals the whole scene. | none | E |
| echo-vessel | Prism Vessel | Pack 2 of every 6 surplus Sparks instead of 1. | none (passive) | E (rare) |
| glass-lantern | Glass Lantern | Natural pickups restore 13.3 extra Sparks; Lift costs 1 more. | none (passive) | E |
| night-gardener | Night Gardener | Skim past a Dark Spark: restore up to 6. 5 per flight. | none | E (rare) |
| ember-lens | Spark Lens | See farther ahead (Luminance +28). | none (passive) | E |
| quiet-cinder | Quiet Cinder | Lift costs 1 less (never below 1). | none (passive) | E |
| silver-feather | Silver Feather | Lift impulse 6% stronger. | none (passive) | E |
| moss-heart | Moss Heart | Kindled Touch adds 3 more Sparks. Needs that learned perk. | none (passive) | E |
| wayfinder-seed | Wayfinder Seed | Collector searches 15% farther. | none (passive) | E (Collector) |
| iron-petal | Iron Petal | Protector recharges 12% sooner. | none (passive) | E (Protector) |
| storm-knot | Storm Knot | Runner resists 6 points more draft; recharges 10% sooner. | none (passive) | E (Runner) |
| hollow-bell | Hollow Bell | Space Timer levitation 0.25 s longer. | none (passive) | E (Space Timer) |
| reed-charm | Reed Charm | Drafts push 12% less. | none (passive) | E |
| moon-glass | Moon Glass | Dark Sparks dim Luminance 10 points less. | none (passive) | E |
| stone-anchor | Stone Anchor | Fall 5% faster on deliberate descents. | none (passive) | E |
| silk-sail | Silk Sail | Fall 5% more slowly. | none (passive) | E |
| edge-needle | Edge Needle | Charge Edging Pulse 12% faster. | none (passive) | E |
| pulse-hourglass | Pulse Hourglass | Edging Pulse reveals the scene 1 s longer. | none (passive) | E |
| cache-cup | Cache Cup | Caches restore 2 extra Sparks. | none (passive) | E |
| path-prism | Path Prism | Luminance +12; double in crystal caves. | none (passive) | E |
| dawn-thread | Dawn Thread | Echo Luminance lasts 1 s longer. Needs that learned perk. | none (passive) | E |

## 2. How each reads as an Inscription

Reading guide. **Text** is at most 12 words, in the 9-Trigger and 3-role vocabulary (Collect, Lift, Pulse, Flash, Delivery, Overfill, Save, Finish, Skim; Passive, Boost, Repeat). **Rep** = should a Repeat card (it fires the card to its right again) also repeat the Inscription. **Boo** = should a Boost card also multiply it. Reasons are short; the Repeat and Boost rule behind them is in section 4.

"Once per flight" or "3 per flight" limits already exist today. They stay as the Inscription's uses per flight (see open question 3).

| Name | Inscription text | Suits | Rep | Boo | Risk when repeated |
| --- | --- | --- | --- | --- | --- |
| Rescue Wick | Lift: if 3 Sparks or fewer left, restore 9. | Lift cards | yes, same trigger | yes, it gives Sparks | none; once per flight |
| Galespun Spindle | Collect in a draft: store a free Lift. | Collect cards | yes | no, not Sparks | free Lifts could pile up; keep stored max 1 |
| Moonwake Lens | Collect while falling: reveal passage 1.5 s. | Collect, Lift | yes | no | none; reveals do not stack |
| Ascent Chime | Collect while climbing: take 3 s off recovery. | Collect | yes | no | recovery could hit zero constantly; ready companion keeps the use |
| Threefold Chalice | Collect 3 kinds: next Lift restores 9. | Collect | yes | yes | repeats finish sets twice as fast; per-flight cap holds |
| Salt Crown | Overfill: store a free Lift. | Overfill, Collect | yes | no | strong with Echo; stored max 1 holds |
| Twin Lanterns | Collect twice in a row: restore 6. | Collect | yes, it makes the pair | yes | Repeat makes every Collect a pair; cap 3 holds |
| Restless Feather | Every 5th Lift: take 4 s off recovery. | Lift | yes, counts as 2 | no | fast loop; cap 3 holds |
| Stillwater Bell | Collect after coasting: restore 6 more. | Collect | yes | yes | none |
| First Light Standard | Passive: begin each flight with 3 free Lifts. | Passive cards | no, Passive | no | none |
| Black Atlas | Passive: see the path; Luminance +25. | Passive | no | no | stacking two copies must stay capped (guide caps at rank 3) |
| Storm Keel | Passive: draft force -40%; fall 10% faster. | Passive | no | no | cap 45% already in code |
| Eclipse Mirror | Collect clears Dark: reveal, restore 6. | Collect | yes | yes | none; cap 3 |
| Relay Moth | Delivery twice: restore 6. | Delivery | yes, a Repeat makes the pair | yes | Echo on a Delivery card pairs instantly; cap 3 |
| Undertow Pearl | Lift in a Black Hole: restore 6, reveal. | Lift | yes | yes | none; cap 2 |
| Sunken Vault | Overfill: store 3 extra per 6 surplus. | Overfill, Finish | yes | no, Stored Sparks never multiply | double storage; total stays under surplus |
| Pilgrim's Clock | Lift after 15 s: restore 6. | Lift | yes | yes | none; cap 3 |
| Beacon Chain | Collect 3 in 5 s: light ahead 5 s. | Collect | yes | no | none |
| Sunheart Engine | Collect: +8 Sparks. Overfill: charge companion, light. | Collect | yes | yes (the +8) | strongest Collect Inscription; recovery caps hold |
| Dream Sovereign | Collect lit: store a free Lift; light +35. | Collect, Passive | yes | no | stored free Lifts; cap 4 |
| Hollow Covenant | Passive: Lift costs 1 less. Skim: restore 6. | Skim, Lift | skim part only | skim part yes | cap 5 seeds holds |
| Wayward Seed | Collect 3 in a row: restore up to 3. | Collect | yes | yes | Repeat triples progress; cap 5 |
| Hearth Bloom | Collect 3 in a row: restore up to 10. | Collect | yes | yes | same; cap 5 |
| Lantern Bloom | Collect 3 in a row: reveal scene 1.5 s. | Collect | yes | no | none |
| Spark Wick | Collect: restore up to 10 extra. Uses: 3. | Collect | yes, spends 2 uses | yes | Echo burns uses 2x faster; the card keeps the count |
| Flash Stone | Collect: reveal scene 1.5 s. Uses: 2. | Collect | yes, spends uses | no | none |
| Overflow Coil | Overfill: recharge companion up to 2 s. | Overfill | yes | no | 12 s per flight cap holds |
| Echo Bell | Delivery: next Collect gives +8 within 8 s. | Delivery, Collect | yes | yes (the +8) | cap 5 |
| Dawn Loom | Delivery: light the route 1.5 s. | Delivery | yes | no | none |
| Sunspool | Collect in extra light: store a free Lift. | Collect | yes | no | cap 4 |
| Dreamcatcher | Collect in a preset: recharge companion 1.5 s. | Collect | yes | no | none |
| Second Dawn | First Collect after a preset: reveal scene. | Collect | no, once | no | fires once only |
| Prism Vessel | Finish: pack 2 of every 6 surplus. | Finish, Overfill | yes | no, Stored Sparks | stays under surplus |
| Glass Lantern | Collect: +13 Sparks. (Lift +1 cost dropped.) | Collect | yes | yes | needs a rebalance if the drawback is dropped |
| Night Gardener | Skim a Dark Spark: restore 6. | Skim | yes | yes | cap 5 |
| Spark Lens | Passive: Luminance +28. | Passive | no | no | none |
| Quiet Cinder | Passive: Lift costs 1 less. | Passive | no | no | two copies must stop at cost 1 (rule exists) |
| Silver Feather | Passive: Lift pushes 6% harder. | Passive | no | no | none |
| Cache Cup | Collect a Cache: +2 Sparks. | Collect | yes | yes | none |
| Path Prism | Passive: Luminance +12, double in caves. | Passive | no | no | none |
| Reed Charm | Passive: drafts push 12% less. | Passive | no | no | none |
| Moon Glass | Passive: Dark Sparks dim 10 points less. | Passive | no | no | none |
| Stone Anchor | Passive: fall 5% faster. | Passive | no | no | none |
| Silk Sail | Passive: fall 5% slower. | Passive | no | no | none |
| Edge Needle | Passive: Edging Pulse charges 12% faster. | Passive | no | no | none |
| Pulse Hourglass | Pulse: Edging reveal lasts 1 s longer. | Pulse | yes | no | none |

Notes: the Passive and stat Inscriptions cannot be repeated. This matches today's Echo rule, which cannot repeat always-on cards. Companion-only artifacts and perk-bound artifacts are in section 3.

## 3. Artifacts that do NOT fit on a card

Six of the 52 do not fit well. 46 fit.

| Artifact | Why it does not fit | Recommendation |
| --- | --- | --- |
| Moss Heart | It only works with the Kindled Touch perk. A card cannot own a perk's number. | **Retire**, and add its +3 to the perk (Kindled Touch rank bonus). Refund the artifact as its sell value. |
| Dawn Thread | Same: it only works with the Echo Luminance perk. | **Retire**, and fold +1 s into that perk. |
| Wayfinder Seed | Companion tuning (Collector reach 15%). Dead if the companion is not carried. | **One-off stop reward**: "Companion tune-up" at Rest, per companion. |
| Iron Petal | Protector recharge 12%. Same reason. | One-off stop reward, same tune-up. |
| Storm Knot | Runner draft resistance and recharge. Same reason. | One-off stop reward, same tune-up. |
| Hollow Bell | Space Timer levitation +0.25 s. Same reason. | One-off stop reward, same tune-up. |

Why a tune-up and not a card: these four change a companion, not a Chain event. A card slot is too valuable for a 12% change. If the owner prefers, make a single common card "Tuning Fork" with Passive: "Your companion gets a small boost".

## 4. Proposed rules

1. **An Inscription works only while its card is mounted in the Chain.** Reason: it is the standing rule that a card's effect lives on the card.
2. **It leaves with the card.** Melted, devoured, sold or discarded cards take it. Reason: no hidden leftovers; what is on the card stays on the card.
3. **One Inscription per card, to start.** Reason: keeps the face readable and the inspect view short; a second slot can come later as a rare upgrade.
4. **Where you get them: the Scribe.** Chests and relic stops (today's Elite and Boss artifact rewards) become a "Scribe" choice: pick 1 of 3 Inscriptions, then pick a card to inscribe. Boss Scribes offer boss relics. Reason: the same reward moment, one extra tap; the choice stays small.
5. **Moving and overwriting.** Moving: not allowed; the Inscription is written on the card. Overwriting: allowed at a Scribe, the old one is lost, with a clear warning before the player commits. Reason: avoids dead picks (a bad card is never a trap) while keeping each choice meaningful.
6. **Devour.** The eater gains the eaten card's Inscription only if the eater has none; otherwise the eater keeps its own and the eaten one is lost. Reason: it keeps Devourer exciting without breaking rule 3.
7. **Charges on a card.** Charges are stored on the card and leave with it. A use lasts one flight and refreshes at Rest, like card uses. Glow Wick (3) and Flash Stone (2) are the only two today. A card never keeps a depleted, permanent leftover effect. Reason: matches "a use lasts one flight" and "uses never leave permanent effects".
8. **Conversion of existing saves.** Each held artifact becomes an unassigned Inscription in a "Scribe pouch". At the next Rest the player places each one on a card (or sells it). Saves in the 6 non-fitting cases get the sell value or the tune-up instead. Reason: nobody loses anything and nothing is placed without a choice.
9. **Repeat and Boost.** A Repeat fires the card's Inscription only if the Inscription's Trigger is the one firing. A Boost multiplies the Inscription only if it gives Sparks (never Stored Sparks, never reveals or free Lifts). Reason: this is today's Boost rule, and it keeps combos legible.
10. **Combos use the card's Trigger and the Inscription's Trigger together.** A card may carry two Triggers. Reason: cheap way to make a quiet card exciting.

## 5. Ten combos

Chain order is left to right. A Boost multiplies Spark gains to its left, so it sits to the right of what it multiplies. All numbers are the intended outcome, to be checked in `simulate`.

1. **Echo, Body Spark +2 [Spark Wick]**: on each Collect the card fires twice, so you get +2 +2 Sparks and restore up to 10 extra Sparks, twice (spends 2 of 3 uses).
2. **Pocket Sparks [Cache Cup], Prism Lens**: Pocket Sparks gains +2 from the Inscription; the Boost multiplies both numbers.
3. **Echo, Ring Spring [Salt Crown]**: one overfill stores two free Lifts (stored max 1 holds, so the second waits).
4. **Downbeat [Pilgrim's Clock], Crescendo**: a Lift after 15 s restores 6, and the Boost doubles the card's gain and the restore.
5. **Echo, Courier Tip [Relay Moth]**: one Delivery counts as a pair at once, so Relay Moth restores 6 on the first Delivery.
6. **Dusk Wick [Wayward Seed], Echo II**: Echo II fires Dusk Wick three times per Collect, so the 3-in-a-row count completes every Collect.
7. **Resonant Harvest [Beacon Chain], Prism Lens**: a Pulse harvest plus a light cast; the Boost multiplies the Harvest gain.
8. **Flash Thread [Flash Stone], Echo**: a Flash picks up twice and reveals the scene twice; the reveal does not stack, but two uses are spent.
9. **Growth Ring [Prism Vessel], Tight Packing**: Finish packs 2 of every 6 surplus and Tight Packing adds its own, so the stored amount grows each flight.
10. **Home Beacon [Hollow Covenant], Refrain**: Save restores, and the Skim part restores 6 each time Refrain fires an Encore.

Strongest three: 1, 2 and 3.

## 6. Open questions for the owner

1. **Marker look.** A (wax seal), B (engraved band) or C (rune border with glyph)? Recommend **B**: the band sits on the picture, never touches the card's text or border, and keeps the keyword icon readable at tile size.
2. **Two Triggers per card?** Recommend **yes**: it is the point of the idea. Show the Inscription's Trigger as a small second chip.
3. **Keep today's per-flight limits?** They conflict with "no arbitrary caps". Recommend **keep them for now** and drop one at a time as each Inscription proves safe in `simulate`.
4. **Overwrite or fixed?** Recommend **overwrite allowed at a Scribe, with a warning**; moving is not allowed.
5. **Devour gives the eater the Inscription?** Recommend **yes if the eater has none**, otherwise the eater keeps its own.
6. **Boss relics are two-part (Sunheart Engine, Hollow Covenant, Dream Sovereign). Split them?** Recommend **keep them as two-line "Greater" Inscriptions** that only a Boss Scribe offers, still one per card.
