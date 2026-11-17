# Boost rules — multipliers act on every kind of card

Status: **decided by the user on 2026-11-16; not built yet.** The engine today multiplies only Bonus Sparks (see `outputs/card-ux/activation-brief.md` section 1.5). This document is the specification for changing that. Open details at the end need the user's confirmation before the engine work starts.

## What the user asked for

> static cards like the ones that increase collector range or luminance or reduce the recovery time… should still be able to be multiplied easily by crescendo or effects like this… if something is uncertain about how these interactions should work, we should clarify them beforehand.

## Decided

1. **Reach.** A Boost card (a card that Multiplies: Prism Lens, Crescendo and the like) strengthens **every card to its left** in the row, of any kind: cards that add Sparks, always-on cards (Collector range, Luminance, capacity), and cards that save time. Boost goes on the right; order matters.
2. **Crescendo's condition: dropped** (user, 2026-11-17; replaces the earlier "any two cards count"). Crescendo simply doubles: "Double the chain's Sparks." Today's code still requires two earlier adding cards; the engine job removes that. Card text in general is being simplified the same way: see `docs/card-text-rewrite.md`.
3. **Never boosted: Stored Sparks rewards and permanent gains** (designer, 2026-11-17, replacing “nothing is off limits” after the balance run showed 300 Stored Sparks and +60 max Sparks per clear). A Boost multiplies Sparks, Collector time saved, and always-on bonuses (Luminance, Collector reach, packing efficiency, capacity cards). Stored Sparks rewards (Wayfarer’s Purse, Nest Egg, Legendary Harvest’s Stored Spark) and anything that outlasts the run (Growth Ring’s max Sparks, Wind Feather’s speed) pay their base amount whatever Boosts are in the chain; in the receipt their effective amount equals base × firings and no Boost is listed against them.
4. **Stacking.** Several Boosts on the same card **multiply together** (×1.25 then ×2 = ×2.5), exactly as Bonus Sparks do today.

5. **Spark Meter hard cap: 100 Sparks** (user, 2026-11-16). Today the meter has no overall ceiling (`getGlowCapacity` in `dist/vitality.mjs` adds every bonus to the base of 30; only some parts are capped). With boosted permanent gains it must have one: total capacity never exceeds 100 printed Sparks, whatever the source. A capacity card that can add nothing more says "Max 100 reached".

## Ceilings (applied after every copy and Boost)

No new ceilings are added for boosted always-on cards (designer, 2026-11-17): broken combos are meant to be discoverable. Existing ones stay: Luminance 180%, max Sparks 100, packing +900%, Collector time floor half a second.

- **Luminance:** +180% at most (flight clamps `cardLuminancePercent`).
- **Max Sparks:** the Spark Meter never holds more than 100 Sparks, whatever the source (`vitality.mjs › getGlowCapacity`).
- **Packing efficiency:** +900% at most (`CARD_ECONOMY.maxPackingWeight`, 36 quarters).
- **Collector time:** seconds a Boost adds never bring Collector recovery or reel time below half a second (`CARD_ROW_LIMITS.collectorFloor`).

## Consequences to watch (coordinator's note, not a decision)

Decision 4 still lets three Boosts multiply to ×15 on Sparks and always-on bonuses; decision 3 (revised) keeps that out of the wallet and permanent progress. This is the user's call. It needs a balance pass with real play before a public release, and the numbers on Boost cards may need to come down.

## Open details — coordinator's defaults, awaiting the user's yes or change

A. **Boost cards with limited Uses** (for example Wick Doubler, 3 uses): they act only on rewards paid when a Trigger fires, and spend a Use then, as today. They do **not** strengthen always-on cards (there is no moment to spend a Use).
B. **Boost cards tied to one Trigger** (Ripple Glass: Pulses; Courier Glass: Collector delivery; and similar): they strengthen only rewards from their own Trigger. Always-on cards are strengthened only by Boosts with no Trigger of their own (Prism Lens, Prism Lens II, Crescendo, Closing Chord).
C. **Time savings.** A Boost multiplies the seconds saved (−2 s ×2 = −4 s). Collector recovery and reel time never drop below half a second.
D. **Percentages.** A Boost multiplies the bonus part, not the whole (+20% Luminance ×2 = +40%, not 240%).
E. **Encore.** Always-on cards are not applied a second time by an Encore; only Trigger rewards repeat.
F. **Echo and Chameleon** keep their current rules; a Boost to the right of a copied card strengthens the copy as well.
G. **What the player sees.** A boosted always-on card shows its boosted figure on its plate and in the inspector ("+20% → +40% Luminance, boosted by Crescendo"), in the Deck and in the explainer.

## Approved 2026-11-17

The user approved all proposals: the open details A–G above as written, the multiplier ladder and Forge prices in `docs/card-balance-changes.md`, and the card wording `v1.0-cardtext` with the recommendations in `docs/card-text-rewrite.md` (keep Kindling Bead's "needs a + card before it", Closing Chord's "last card only" and Second Sun's stronger Encore; leave copy limits, extra Refrains, non-stacking notes and Growth Seed's "max +90" off the card; keep Watchlight's cost on the card; chips "Any Trigger" and "Next card"). Melt stays as it is.
