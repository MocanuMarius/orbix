# Card balance changes — decided and proposed

Status: user decisions of 2026-11-17 plus the coordinator's proposals to complete them. **Nothing here is built yet.** Companion to `docs/boost-rules.md` (how multipliers act) and `docs/card-text-rewrite.md` (plain wording).

## Multiplier ladder

User: "the ×1.25 card is too useless to be a Rare. ×1.25 should be a Common, ×2 a Rare… let's also have a Legendary that multiplies by 3."

Today in `dist/card-catalog.mjs`: Prism Lens (Rare, ×1.25), Crescendo (Rare, ×2, needs two earlier adding cards), Prism Lens II (Legendary, ×1.5), Closing Chord (Rare, ×1.75, last slot only), Second Sun (Legendary, ×1.25, or ×2 on an Encore), and Trigger-specific doublers: Ripple Glass (Rare), Glide Prism (Rare), Courier Glass (Common), Clear Prism (Common), Wick Doubler (Common, limited uses).

| Card | Today | Decided / proposed |
| --- | --- | --- |
| Prism Lens | Rare, ×1.25 | **Common, ×1.25** (decided) |
| Crescendo | Rare, ×2, needs two earlier adding cards | **Rare, ×2, no requirement** (decided) |
| Prism Lens II | Legendary, ×1.5 | **Legendary, ×3** (proposed: this becomes the user's new ×3 card; it is already the Legendary of the Prism family, and ×1.5 would be weaker than the Rare) |
| Closing Chord | Rare, ×1.75, last slot only | Proposed: **Rare, ×2.5, last slot only**, so its restriction buys something over Crescendo. Alternative: remove the card. |
| Second Sun | Legendary, ×1.25 (×2 on Encore) | Proposed: **Legendary, ×2 (×3 on Encore)**, to stay above the new Common. |
| Ripple Glass, Glide Prism, Courier Glass, Clear Prism, Wick Doubler | ×2 on one Trigger or with limited uses | Unchanged: narrower than Crescendo, so their rarity still fits. |

## Forge

User: "you should require a lot more [Stored Sparks] to forge a Legendary. Also combined with the penalty to keep doing it… you should not be able to know what you're going to get beforehand… just one card, random… you should be able to forge a Common too… cheaper than the others."

Today (`dist/skill-cards.mjs`): Rare 30, Legendary 60 with a Rare mounted; the card you will get is shown before you pay; no Common forge; repeatable at the same price.

Decided:
- The result is **hidden**: one random card of the chosen rarity, revealed after paying.
- **Common** can be forged, and is the cheapest.
- **Legendary costs much more** than today.
- **Each forge makes the next one dearer.**

Proposed numbers (need the user's yes; for scale, a cleared flight pays roughly 15–25 Stored Sparks plus up to about 20 packed):

| Forge | Today | Proposed first price | Each further forge of that rarity this run |
| --- | --- | --- | --- |
| Common | — | 15 | +5 |
| Rare | 30 | 40 | +20 |
| Legendary | 60 (needs a Rare mounted) | 150 | +75 |

**Decided 2026-11-17 (user):** first prices 15 / 40 / 150 and the surprise card stand. The step is not flat: each forge raises that rarity's price by **50%** (base × 1.5 per prior craft, rounded up), counted per Rest, as the game did before. Legendary: 150, 225, 338. Evolve into a Legendary costs 150 (coordinator's fix, so Prism Lens → Prism Lens II is not a 40-Spark shortcut).

Proposed details:
- Drop the "needs a Rare mounted" condition for Legendary: the price is the gate, and the condition is one more thing to explain.
- The random card is drawn from cards the player can use (the same filters the reward drafts use), with no duplicate of a card already owned unless the pool is exhausted.
- The price shown is always the next price, so the penalty is visible before paying.
- Melt values stay (Common 10, Rare 20, Legendary 40): forging then melting always loses Stored Sparks.
