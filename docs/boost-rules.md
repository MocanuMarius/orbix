# Boost rules — multipliers act on every kind of card

Status: **decided by the user on 2026-11-16; not built yet.** The engine today multiplies only Bonus Sparks (see `outputs/card-ux/activation-brief.md` section 1.5). This document is the specification for changing that. Open details at the end need the user's confirmation before the engine work starts.

## What the user asked for

> static cards like the ones that increase collector range or luminance or reduce the recovery time… should still be able to be multiplied easily by crescendo or effects like this… if something is uncertain about how these interactions should work, we should clarify them beforehand.

## Decided

1. **Reach.** A Boost card (a card that Multiplies: Prism Lens, Crescendo and the like) strengthens **every card to its left** in the row, of any kind: cards that add Sparks, always-on cards (Collector range, Luminance, capacity), and cards that save time. Boost goes on the right; order matters.
2. **Crescendo's condition.** "After 2 earlier cards": **any two cards** to its left count, not only cards that add Sparks.
3. **Nothing is off limits.** A Boost may strengthen any reward, including permanent gains (max Sparks, speed unlocks) and Stored Sparks income.
4. **Stacking.** Several Boosts on the same card **multiply together** (×1.25 then ×2 = ×2.5), exactly as Bonus Sparks do today.

5. **Spark Meter hard cap: 100 Sparks** (user, 2026-11-16). Today the meter has no overall ceiling (`getGlowCapacity` in `dist/vitality.mjs` adds every bonus to the base of 30; only some parts are capped). With boosted permanent gains it must have one: total capacity never exceeds 100 printed Sparks, whatever the source. A capacity card that can add nothing more says "Max 100 reached".

## Consequences to watch (coordinator's note, not a decision)

Decisions 3 and 4 together allow runaway builds: a boosted permanent gain grows every flight, and three Boosts multiply to ×5 or more. This is the user's call. It needs a balance pass with real play before a public release, and the numbers on Boost cards may need to come down.

## Open details — coordinator's defaults, awaiting the user's yes or change

A. **Boost cards with limited Uses** (for example Wick Doubler, 3 uses): they act only on rewards paid when a Trigger fires, and spend a Use then, as today. They do **not** strengthen always-on cards (there is no moment to spend a Use).
B. **Boost cards tied to one Trigger** (Ripple Glass: waves; Courier Glass: Collector delivery; and similar): they strengthen only rewards from their own Trigger. Always-on cards are strengthened only by Boosts with no Trigger of their own (Prism Lens, Prism Lens II, Crescendo, Closing Chord).
C. **Time savings.** A Boost multiplies the seconds saved (−2 s ×2 = −4 s). Collector recovery and reel time never drop below half a second.
D. **Percentages.** A Boost multiplies the bonus part, not the whole (+20% Luminance ×2 = +40%, not 240%).
E. **Encore.** Always-on cards are not applied a second time by an Encore; only Trigger rewards repeat.
F. **Echo and Chameleon** keep their current rules; a Boost to the right of a copied card strengthens the copy as well.
G. **What the player sees.** A boosted always-on card shows its boosted figure on its plate and in the inspector ("+20% → +40% Luminance, boosted by Crescendo"), in the Deck and in the explainer.
