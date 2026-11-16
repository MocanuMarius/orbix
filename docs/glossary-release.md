# Contextual card glossary — 16 November 2026

Release **glossary-1**. [Play](https://mocanumarius.github.io/orbix/?v=glossary-1) · [Try Echo → Body Spark → Resonant Harvest](https://mocanumarius.github.io/orbix/card-combos.html?combo=echo,body-spark,harvest-rare&row=1&v=glossary-1) · [Update an installed game](https://mocanumarius.github.io/orbix/cards.html?v=glossary-1).

Underlined pickup words open pickup help; a numeric Spark bonus opens the Spark Meter. Pickup help keeps the selected card's actual rank and connects its trigger to the meter effect. Meter help uses the current build or paused flight, including its current maximum, fuel and next Lift cost. Stored Sparks use the boxed savings symbol. Glossary buttons are available from the equipped row, Deck, Field Guide, settings and run menu. Nested help keeps its original card context and returns predictably with Back.

Repeat, Shared uses, Uses and Pass help run a read-only preview of the actual row, with its slots, ranks and remaining uses. It shows left-to-right actions, shared-use spending and separate pass totals. A missing or unsuitable action uses an explicitly labeled teaching row. Opening help changes neither the saved game nor the prior live event receipt.

Cache help and the ? on Resonant Harvest or Cache Handling show three isolated captures from the production flight engine: direct touch gives 18 Sparks; Collector delivery with Cache Handling gives 12 on arrival; a wave crossing leaves the Cache in place and pays the selected Harvest's printed bonus. The Rare Harvest in the linked row pays +2, while generic Cache help uses a Common +1 example. Card faces stay concise, with accounting restrictions and detailed rules available in help.

## Verification

- Fresh shipped baseline: 656/716 tests pass, 60 fail. Candidate: 664/724 pass, the same 60 fail. Added failing tests: **0**; all eight added tests pass. The broad suite remains **not green**; unchanged failures are listed in [the earlier release](combo-camp-release.md#remaining-full-suite-failures).
- Focused glossary and row checks passed, including the 71-test implementation check and its final 13-test compact-layout follow-up. JavaScript syntax: 533 files checked, zero failures.
- Trusted Chrome touch proof at 915×412, 740×333 and 720×280 covers both Spark keyword routes, nested Back, Echo's actual row, Harvest's three events, a preserved gallery event receipt, unchanged saves, bounded dialogs and 44-pixel Back buttons. The phone Deck glossary and main phone/desktop links also pass. Physical Pixel 10 testing has not been performed.
- The actual preceding Pages worker and launcher upgrade preserve the ordinary save byte for byte and the card save structurally, including partial uses, completed Rest/Grow, future capacity and an unclaimed draft. The new Cache help and stylesheet work from the prepared offline cache without changing either save.
- Offline package: 473 files, revision `ce8ecc0b2ea0`; all 470 preceding roots retained. Publication overlays canonical committed game bytes onto the existing Pages tree and checks preservation of unrelated public files. Public verification compares every packaged asset against the committed source and repeats the interactive glossary checks.

Baseline source: `44b5152448f73be84839cc9888bf90278d0f9d8a`. Baseline Pages: `ada2173bdfd5655156230d123b626c83bcf9be61`. Local release evidence is in `work/glossary-release`; implementation proofs are in `outputs/card-row-help` and `work/glossary-context-proof`.
