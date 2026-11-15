# Skills as cards

**Live isolated pilot · `skills-cards-1` · 15 November 2026.** Open [Skills as cards](https://mocanumarius.github.io/orbix/cards.html), tap **Open card playtest**, then choose **New Game**. The fresh launcher updates older installed games before opening `game.html?cards=1`; it does not force the tutorial route. The pilot uses a separate save and starter seed. Standard play retains its skill book and six-stop First Light; card-mode First Light adds the Lift Guide loan during its Lift lesson. Practice rewards cannot enter the real card run.

The rules below describe the implemented pilot unless explicitly marked as a follow-up. Prices, payout values, odds and caps are first-playtest starting points, not claims of solved balance. This supersedes the two-milestone, two-pick suggestion. The optional [Collector art comparison](https://mocanumarius.github.io/orbix/collector-art.html) is a separate visual review: its flatter candidate remains opt-in pending approval.

## Four settled decisions

1. **Melt into one wallet.** Every unwanted playable reward card can immediately **Melt** for a visible amount of **Stored Sparks**, the existing run wallet also earned through flight and packing. That wallet pays to improve a chosen mounted card or forge a random higher-rarity card. The first playtest uses **+10 Stored Sparks per Common Melt** and **30 Stored Sparks to forge one Rare**, so three Common melts fund a Rare. These are pilot prices, not a three-card recipe. No matching-copy requirement, duplicate tally or spare-card inventory.
2. **Separate the timings.** Freely equip and reorder after flight. Improve at **any checkpoint**. Forge at **Rest only**.
3. **Two optional Rest opportunities per map.** Every playable route through each ten-stop map must offer two reachable Rest forks: one around mid-map and one before the guardian. Either Rest can be bypassed for treasure, an event or another flight. Reaching or taking the first must leave the second reachable.
4. **Forge uses a Rest action.** Rest normally permits one action from **Recover, Add slot or Forge**. Forge spends Stored Sparks and consumes an action; it grants no additional healing, refill, growth or slot. A specific mounted **Rare skill card** unlocks Grow as another choice. A separate **Common consumable camp card** grants a second distinct eligible action at one Rest and spends its one charge only after that second action succeeds. Details and remaining hypotheses are below.

## The player loop

Start with **three ordered active slots**. Skills come from mounted cards. Each first real flight clear, including elites and guardians, drops **one card**. Choose **Equip** or **Melt**, with the Stored Sparks return shown before confirming. Equip and reorder freely after flight. Flight stays one-handed.

When full, choose the replacement deliberately. Preview the lost ability and the Melt return for the displaced card. Exhausted cards are discarded, not recycled. Keep cards in mounted slots rather than a spare-card inventory.

For example, take a direct body Spark worth 12, with meter room and no packing conversion:

- **Echo → Body Spark +2 → Field Impulse:** 12 base +2 action +2 repeat = **16 to the meter**.
- **Body Spark +2 → Echo → Field Impulse:** 12 base +2 action = **14**. Echo cannot repeat Field Impulse.

“Body Spark +2” is illustrative. Field Impulse keeps its normal capability in either order. **Move left / Move right** previews totals, charges and compatibility: “Repeats +2” or “Cannot repeat Field Impulse.” At the right edge, Echo and Chameleon have no target.

Three slots means capacity, not three free cards. After the tutorial and before the first real flight, the **existing starter gift screen offers two distinct random Common cards**. Equip one; the other two slots start empty. This adds no drafting screen. Cards replace buying the same effects in the skill book for this trial.

## Card meaning and rewards

Keep these distinctions visible:

- **Rarity:** Common grey, Rare green, Legendary purple, with written labels.
- **Cost:** free to mount. Improvements and forging spend existing **Stored Sparks**, never flight fuel. No new currency. Improve a chosen mounted card at any checkpoint. Forge only at Rest, consuming one camp action as well as its price.
- **Rank:** improvement within a card. Map level may unlock selected upgrades without automatically raising rarity. Tap to preview the actual number changed and price.
- **Charges:** remaining uses on that real card.
- **Temporary modifiers:** their own printed duration, separate from rank and charges.

Common is the default drop. The provisional Rare / Legendary / Common odds are 10% / 0.5% / 89.5% for ordinary flights, 22% / 2% / 76% for elites and 35% / 6% / 59% for guardians. These deterministic draws do not reroll on reload or retry. Tougher flights improve rarity odds rather than guaranteeing Legendary; their total reward budgets remain a balance question.

Elite/guardian relics remain separate and passive for comparison. The final guardian's card becomes a trophy in the victory recap rather than an unusable Equip or Melt choice. Compare the combined card/relic budget and whether that trophy is a satisfying final reward.

## Copy, repeat and lifetime

Run-long means **while mounted**; limited-use cards persist only while charges remain. Recalculate passives on mounting, removal and reordering, without refilling the meter or granting a one-time effect twice.

**Field Impulse and fixed wards cannot be copied or doubled.** A compatible printed numeric payout, such as direct body pickup **+2 to the meter**, may be amplified or repeated. Its base pickup value stays unchanged.

**Echo** repeats its immediate right neighbour's compatible printed action when its natural event fires. **Chameleon** borrows the compatible printed ability immediately right. Neither recursively copies or repeats modifiers such as Echo or Chameleon.

Chameleon may borrow an explicitly copyable passive: **+3 maximum Sparks while mounted** becomes +6 capacity with the original. Echo has no activation to repeat. Reordering changes capacity without refilling fuel; run-long duration alone does not make an ability copyable.

**Tight Packing** is a **Common, fixed-rank mounted passive**: “Pack 25% more Stored Sparks. Every 4 you pack earns 1 extra.” Chameleon can borrow its packing bonus; Echo has no action to repeat.

Limited uses are shared with the real source **per execution**. Repeating +2 twice spends two uses. Permitted numeric doubling gives +4 for one use. A borrowed execution also spends a source use. No remaining use means no repeat. Copies create no pickups, collection events or reward triggers. Swapping, reordering and improving never refill spent charges or reset consumed effects.

## Melt and forge

Melt exchanges one unwanted playable card for the shown Stored Sparks. It does not save ingredients or count matching cards. Preview the card and ability lost, its remaining charges and the amount gained. Consume the card once and never leave it active after the exchange. Exhausted cards cannot Melt.

At Rest, spend from the shared wallet and consume one camp action to forge a **seeded random higher-rarity card**, progressing through Common → Rare → Legendary, with no tier above Legendary. **One Rare costs 30 Stored Sparks in the first playtest.** Before spending either the wallet price or the camp action, show the **exact seeded Rare and its effect**, alongside the price and action cost. Revisiting or reloading shows the same card. Melt payouts and forged results survive reload and retry without duplicate transactions or rerolls.

**One Common Melt returns 10 Stored Sparks in the first playtest.** Provisional implemented values are:

| Transaction | Common | Rare | Legendary |
| --- | ---: | ---: | ---: |
| Melt return | 10 | 20 | 40 |
| Forge price | — | 30 | 60 |
| Improve price | 15 × current rank | 25 × current rank | 40 × current rank |

Body Spark, Pocket Sparks, Deep Vessel and Resonant Harvest can improve through rank 3; other pilot cards remain rank 1. Mount a Rare card to unlock the Legendary forge option. Both forge tiers preview their exact seeded result before spending, and share the one-Forge-per-Rest limit. Higher-tier prices and odds still need playtest tuning.

## Rest and archetypes

Rest normally offers **one action per visit**: choose **Recover, Add slot or Forge**. Forge costs Stored Sparks as well as the action passed up; choosing it grants no additional healing, refill, growth or slot.

**Growth Seed**, a Rare skill card, unlocks Grow while mounted; it does not grant growth automatically. Selecting Grow preserves the current benefit: **+3 maximum Sparks for the rest of the run and a full meter refill, with no heart restoration**. The existing limit is **three Grow actions per run, +9 maximum Sparks total**. The unlock lasts while mounted.

**Second Ember**, a Common consumable camp card, grants **one second, distinct eligible action at one Rest**. Spend its one charge only when the second action successfully commits. Visiting, declining, swapping or leaving after the first action does not spend it; if no second action is possible, preserve the charge. Do not repeat the same choice or Forge twice. Forge still deducts its quoted price once when committed. Grow remains the separate Rare unlock described above.

With both cards mounted on arrival, Grow may be either action in the pair, provided it remains eligible. Camp-card eligibility is captured on arrival at Rest; the extra-action source must remain available for its charge to be spent. Same-visit changes cannot create unlimited extra actions.

The pilot permits **five slots maximum, at most one addition per map**. Add slot restores neither hearts nor fuel. Recover/Grow refills are printed. At cap, useful choices or Continue remain available without resetting the run. Test whether slots are worthwhile without becoming the guaranteed best camp choice; the cap and prices remain provisional.

Keep **Bankrunner** skimming and **Glider** coasting into a direct fuel Spark as archetype examples, each priming one free Lift. Candidate follow-ups reveal nearby space or accelerate a recovering Collector when that Lift is spent. Retain one stored free Lift, tentatively two priming triggers per flight, and preserve the opportunity while a free Lift is stored. Show each step clearly.

## Lift Guide

**Lift Guide** is a **Common coaching card**. It is loaned during card-mode First Light's Lift lesson, then included in the existing two-Common starter gift pool as an optional pick; it never forces the player's choice. It is starter-only rather than in ordinary flight rewards, so those rewards stay varied.

One small **amber chevron beside the wisp** appears slightly before a brief tap window, giving the player a human reaction margin, then opens for that window. It disappears on Lift. Over a short visible horizon, compare coasting with affordable tap timings by **safe forward distance per Spark spent**, preferring coasting when tied. The cue responds to current speed, gravity, drafts and actual Lift cost, accounting for free Lifts without dividing by zero. Suppress it for a predicted ceiling strike, insufficient visibility or an uncertain hazard.

For example, coast over a bank crest; the marker opens on the descent before the next ridge. It offers timing advice without automatic Lift, a guaranteed route or extra meter. This is neither Rhythm's even beat nor Drift Sense's route to a pickup.

## Rhythm and pulse rewards

**Rhythm is a Rare card.** Three successful manual Lifts with roughly equal gaps, at a tempo chosen by the player, release **exactly one terrain-revealing Luminance wave from the wisp**. Consume that trio: six evenly spaced Lifts release two waves, not four overlapping-trio waves. Rhythm is independent of music playback and Fourth Beat. Legitimate free manual Lifts count; failed cadence never penalizes an ordinary Lift. It uses the existing Lift input with no extra button.

Rhythm uses the existing temporary Luminance wave system and supports the **three separate pulse-on-map-Spark payout cards** below. Those cards also work with all existing temporary Luminance sources. Compatible payouts intentionally stack. These numbers are **first-playtest values only**:

| Card | Rarity | Payout |
| --- | --- | --- |
| Resonant Harvest | Common | **+1 Spark to the meter** per qualifying crossing. |
| Resonant Harvest | Rare | **+2 Sparks to the meter** per qualifying crossing. |
| Resonant Harvest | Legendary | **+2 Sparks to the meter** per qualifying crossing, plus **+1 Stored Spark on the first qualifying crossing of each wave**, at most one wallet award per wave. |

A qualifying crossing is a wave crossing a **natural, uncollected fuel Spark on the map**. Each Spark qualifies once per wave and can qualify again on a later wave. Crossing does not collect the Spark. Meter gain stops at the cap; no payout can trigger itself or pay from a generated Spark. The Legendary wallet payout is deliberately per wave, unlike the existing skill book's +1 Stored Spark per crossing.

For one payout card, a wave crossing three eligible Sparks with room in the meter gives **Common: +3 meter; Rare: +6 meter; Legendary: +6 meter and +1 Stored Spark**.

## What the pilot still needs to answer

Compare with the skill book at **equal economy on the same seed**, across open-middle and riskier-bank routes. Require neither Proximity nor Dream or expensive granted skills. Prevent practice carryover, generated loops and Dream/retry farming.

Use a small card pool. Record actual flights, card drops, equips, Melts, improvement and forge spending, reordering, direct versus Collector pickups, bank time, routes, survival and camp choices. Check that every playable route offers both optional Rest forks and that taking the first preserves access to the second. Ask why players changed flight line and whether they predicted combinations and charge costs. Do the choices add readable archetypes beyond the book, and can they fit comfortably on a phone?

The current pool contains 16 printed cards, including the three Harvest rarities. Cache Handling and Flash Handling unlock the corresponding Collector pickup capability in card runs; ordinary flight pickups and their brief delivery/discard cues also remain visible in standard play. Bankrunner and Glider remain follow-ups. Local card history records transactions and outcomes in the pilot save; no remote telemetry is added. Automated flights and emulated phone layouts do not establish physical-phone performance, a human difficulty curve or an equal-economy comparison with the skill book.
