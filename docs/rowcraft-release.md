# Ordered cards and a faster Deck — 16 November 2026

Release **rowcraft-1**. [Play](https://mocanumarius.github.io/orbix/?v=rowcraft-1) · [Try the equipped example](https://mocanumarius.github.io/orbix/?cards=1&mock=cards&scenario=rowcraft&v=rowcraft-1) · [Phone review](https://mocanumarius.github.io/orbix/previews/rowcraft-1/) · [Update an installed game](https://mocanumarius.github.io/orbix/cards.html?v=rowcraft-1).

The equipped Deck keeps all five slots visible on small landscape screens. Tap a card and then a destination, drag its grip, or use its left/right arrows to swap immediately. Reserve cards use the same direct placement. Inspecting and returning preserves the selected card. Melting cards still reviews the exact loss and Stored Spark return before confirmation.

Selecting a card explains its actual current arrangement: its trigger, requirements, immediate neighbor where relevant, and exact per-pass example. A pass checks the matching cards from left to right for one event. Every replay starts a fresh subtotal; matching bonuses from both passes add together. Examples distinguish bonus Sparks from the natural pickup and from the amount that fits in the meter. Refrain, copies, multipliers and finite shared uses use the production row resolver. Unrelated or unproductive crossings leave the last useful live receipt visible.

The disposable example starts with Echo, Body Spark +2, Kindling Bead, Refrain and Closing Chord. On a direct passage Spark pickup, each pass produces 8.75 bonus Sparks, for 17.5 before the meter cap. Move cards to see placement verdicts and quotes change. Its reserve includes the new physical consumers and ordinary consumables. Opening, inspecting and rearranging this example never reads or writes either player save.

**Use Doubler** consumes itself once when a real flight begins, doubling the remaining uses of the eligible consumable immediately right. Invalid targets keep it unspent. The enlarged maximum follows the target through saves and eligible paid refills; doubling does not refill a partially used card to twice its printed starting uses. Preview, Dream and later resumes do not grant another doubling.

**Ember Feeder** consumes the first two occupied cards to its right together after a successful flight. It skips empty slots and consumes neither if fewer than two remain. Each meal adds one maximum Spark to that Feeder while equipped; growth follows the card instance. It never refills the meter. Physical consumers resolve left to right, and the selected card and post-flight receipt name the cards being destroyed. Failed flights and Dream do not feed it. Neither new action can be copied or replayed.

One of the two supplementary draft slots now gives bounded extra weight to real partners already owned, while preserving the first earned offer, the seeded rarity of every slot, three distinct displayed names and the entire ordinary catalog. Exhausted cards do not provide a partner. Saved offers never reroll when the inventory changes. Forge gives broad chain cards more circulation while keeping its next shown card independent of inventory and arrangement.

## Verification

- Clean previous source: 641/701 tests pass, 60 fail. Candidate: 656/716 pass, the same 60 fail. Added failing tests: **0**; all 15 added tests pass. The broad suite remains **not green**; the unchanged failures are listed in [the preceding release](combo-camp-release.md#remaining-full-suite-failures).
- Focused row, physical-consumer and offer tests: 34/34 pass. JavaScript syntax: 529 files checked, zero failures.
- Trusted Chrome touch proof at 915×412 and 740×333 covers immediate tap, drag and arrow swaps, reserve placement, return selection, five visible mounted cards, live doubling targets and named Feeder targets. Additional example and play smoke covers 720×280 and a scaled desktop frame. Physical Pixel 10 testing has not been performed.
- Actual previous Pages worker and launcher upgrade preserves the ordinary save byte for byte and the card save structurally, including partial uses, completed Rest/Grow, future capacity and an unclaimed three-card draft. The new example works from the prepared offline cache without changing either save.
- Offline package: 470 files, revision `80d0ce0bf3ed`; all 469 preceding roots retained. Public verification compares every packaged asset with the committed source, opens the mounted example, swaps and inspects cards, and starts a real flight with its paused Deck.

Baseline source: `a35280515e6a9caf9da2657448279a359308a5b6`. Baseline Pages: `3cc49cb9a71eb9d58fa0bed4fa076eef973d39ca`. Evidence remains locally in `work/rowcraft-release` and `outputs/deck-fast-proof`. Publication overlays canonical committed game bytes onto the existing Pages tree and checks preservation of unrelated public files.
