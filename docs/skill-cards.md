# Skills as cards

**Cards default · `dream-gifts-1` · 16 November 2026.** Open the [main game](https://mocanumarius.github.io/orbix/) and choose **New Game**, **Continue**, **Tutorial** or **Settings**. The original skill-book game is under **Settings → Advanced → Legacy skills override**, with its own separate save. Existing Cards saves and starter seeds remain in use. The [older card launcher](https://mocanumarius.github.io/orbix/cards.html) still updates installed games before opening the compatible `?cards=1` flow. First Light adds the Lift Guide loan during its Lift lesson. Practice rewards cannot enter the real card run. The [sample Deck](https://mocanumarius.github.io/orbix/card-workbench.html) resets on reload without changing either saved journey.

The rules below describe the implemented pilot unless explicitly marked as a follow-up. Prices, payout values, odds and caps are first-playtest starting points, not claims of solved balance. This supersedes the two-milestone, two-pick suggestion and the earlier replacement-Melt flow. The [Collector art comparison and tow preview](https://mocanumarius.github.io/orbix/collector-art.html#tow) remain available; the two-ink Collector is the current default.

## Four settled decisions

1. **Own a Deck; Melt into one wallet.** Every earned or forged card enters the run's owned Deck automatically. Duplicate cards remain individual instances with their own rank and remaining uses. Keep a card in reserve, equip it, or deliberately select it to **Melt** for a visible amount of **Stored Sparks**, the existing run wallet also earned through flight and packing. That wallet pays to improve a chosen card or Forge a surprise card. The first playtest uses **+10 Stored Sparks per Common Melt** and Forge prices of **15 / 40 / 150** for a Common / Rare / Legendary card, each forge of a rarity at one Rest raising its next price by half (see Melt and Forge). Melt always returns less than a forge costs. These are pilot prices, without a matching-copy recipe.
2. **Edit the Deck anytime.** Equip, drag, reorder, unequip and select multiple cards to Melt throughout an active run, including a paused flight and camp. Improve, Evolve and Forge require a verified active or completed camp. Opening Deck pauses safely; Done returns to the existing pause and tap-to-resume controls.
3. **Three optional Rest opportunities per newly generated map.** Each ten-stop map offers three reachable camps, each with one ordinary flight exit and a route that bypasses it. Saved visited maps retain their committed edges.
4. **Forge in the Workshop at camp.** Forge spends banked Stored Sparks and uses no Rest action. It shows the price of the next forge of each rarity; the card itself is a surprise, revealed after paying. Forge as many cards as the wallet allows, return to Deck to Melt or arrange cards, and open Forge again. Rest normally permits one action from **Recover or Add slot**. Any owned **Growth Seed** unlocks Grow from the Deck, with Common / Rare / Legendary amounts of +3 / +5 / +8 and Legendary ranks reaching +9 / +10. Owned **Second Ember** grants a second distinct eligible action at one Rest and spends its 1 use only after that second action succeeds. These Rest cards never occupy active slots. Details and remaining hypotheses are below.

## The player loop

Start with a **chain of three Slots** (Rest can add Slots, up to five). Flight skills come from the cards in the chain; Rest cards work directly from the Deck and never go in the chain. Each first real flight clear, including elites and guardians, adds **one card** to the Deck before progression continues. The receipt shows the new card beside the current slots, with **Add to collection**, **Equip**, and **Melt…** for flight cards; equipped rewards offer **Continue**. Tap a destination or drag the incoming card's illustration to it to transfer immediately; its previous occupant returns to the Deck. Deck-origin transfers retain the full swap review. Adding acknowledges the already-owned card without changing its identity or uses. Rest-card rewards offer no slot action. Melt previews the exact card, lost uses and positive Stored Sparks return before confirmation; Cancel or Escape preserves the card, wallet and receipt. A distinct furnace symbol also marks single-card and batch Melt in Deck. Equip and reorder freely whenever Deck is open, including during paused flight. Flight stays one-handed.

The active hand and the owned Deck are separate. The collection keeps the active slot strip visible. Tap an owned card, then a slot, or use its drag grip. Empty destinations equip directly; occupied destinations review both full cards before confirmation. The previous card returns to reserve without a wallet payment or lost uses. The collection stays open after an edit so you can continue arranging. **Inspect** explicitly opens the full reader, and **Unequip** also returns a card to reserve. Only equipped cards grant abilities. Select mode can mark several reserve or mounted cards for one combined Melt preview; confirm to remove exactly those cards and collect their displayed total. Cancel leaves the cards and wallet unchanged. Exhausted cards are discarded rather than recycled.

For example, take a direct body Spark worth 12, with meter room and no packing conversion:

- **Echo → Body Spark +2 → Field Impulse:** 12 base +2 action +2 repeat = **16 to the meter**.
- **Body Spark +2 → Echo → Field Impulse:** 12 base +2 action = **14**. Echo extends the adjacent Field Impulse instead of repeating Body Spark.

“Body Spark +2” is illustrative. The first arrangement has one Field Impulse source; the second has two, giving the same force for exactly twice as long at equal ring fullness. Drag cards between equipped slots to choose the order, or use Equip and its slot buttons. The displayed copy preview follows the immediate right neighbour. At the right edge, Echo and Chameleon have no target.

Every new card journey starts with **two equipped cards and one free slot**. After the tutorial and before the first real flight, the **existing starter gift screen offers three distinct cards other than Lift Guide**. Each lineup has an **80% chance of three Commons and a 20% chance of two Commons and one Rare**, independent of Ascension. Rare choices are Rhythm, Cache Handling or Flash Handling; the Common pool includes Dream. The offers and order stay fixed through Back, No and reload. Existing unpicked v1/v2 saves retain their old pair. Tap one to preview an explicit Are you sure? confirmation. No returns without committing; Yes equips the selected card in the first slot and the guaranteed Lift Guide in the second slot. The screen shows the included Guide before you choose. This adds no drafting screen. Existing journeys keep their own cards and uses; loading or melting a starter never grants another. Cards replace buying the same effects in the skill book for this trial.

## Card meaning and rewards

Keep these distinctions visible:

- **Rarity:** Common grey, Rare gold, Legendary purple, with written labels.
- **Cost:** free to mount or stow. Improvements and forging spend existing **Stored Sparks**, never flight fuel. No new currency. Improve, Evolve and Forge in Deck only at a verified active or completed camp. Both spend banked Stored Sparks; Forge uses no camp action. Unbanked flight earnings become spendable after a successful clear.
- **Rank:** improvement within a card. Map level may unlock selected upgrades without automatically raising rarity. Tap to preview the actual number changed and price.
- **Charges:** remaining uses on that real card.
- **Temporary modifiers:** their own printed duration, separate from rank and charges.

Common is the default ordinary drop. The provisional Common / Rare / Legendary odds are 83% / 15% / 2% for ordinary flights, 55% / 32% / 13% for elites and 35% / 47% / 18% for guardians. A seeded rarity roll happens first. Within that tier, Common Growth Seed has six tickets and every other card one; larger tier catalogs do not dilute rarity odds. If no seed of any tier has been acquired, the second Common flight reward supplies a Common seed. Only real awarded flight drops count, and acquiring then melting a seed never restarts this safeguard. Evolved variants can drop directly. Generated receipts stay intact on reload or retry. Tougher flights improve rarity odds rather than guaranteeing Legendary; their total reward budgets remain a balance question. The [matched production RNG audit](growth-seed-rng.md) quantifies early availability and within-tier variation.

Elite/guardian relics remain separate and passive for comparison. The final guardian's card also enters the owned Deck and appears as a trophy in the victory recap. Compare the combined card/relic budget and whether that trophy is a satisfying final reward.

## Copy, repeat and lifetime

Run-long means **while mounted**; limited-use cards persist only while charges remain. Recalculate passives on mounting, removal and reordering, without refilling the meter or granting a one-time effect twice.

**Equipped numeric effects stack; reserve cards do nothing.** Compatible Echo and Chameleon cards add a source from the immediate right neighbour. They never recurse through another copy card. Binary permissions and unique activations stay single. The original-card matrix below and the expanded row rules describe these limits. Natural pickup values stay unchanged.

**Echo** repeats its immediate right neighbour's compatible printed action when its natural event fires. **Chameleon** borrows the compatible printed ability immediately right. Neither recursively copies or repeats modifiers such as Echo or Chameleon.

Chameleon may borrow an explicitly copyable passive: **+3 maximum Sparks while mounted** becomes +6 capacity with the original. Echo has no activation to repeat. Reordering changes capacity without refilling fuel; run-long duration alone does not make an ability copyable.

**Tight Packing** is a fixed-rank mounted bonus at each rarity: Common adds +50% naturally packed Stored Sparks (+1 per 2), Rare adds +75%, and Legendary adds +100%. Equipped originals and adjacent compatible Echo/Chameleon add their source percentages. Each successful packing amount is converted once, preserving fractional quarter progress; its bonuses never pack again.

Limited uses are shared with the real source **per execution**. Pocket Sparks and each copied execution spend a use from the original card, so two successful executions cost two uses. No remaining use means no repeat. Copies create no pickups, collection events or reward triggers. Swapping, reordering and improving never refill spent charges or reset consumed effects.

| Printed card | Equipped duplicates | Echo immediately left | Chameleon immediately left | Shared limit |
| --- | --- | --- | --- | --- |
| Body Spark +2 | Add each card's ranked direct-pickup bonus. | Repeat the source's bonus. | Borrow the source's bonus. | One natural direct-pickup event; bonus cannot be packed. |
| Pocket Sparks | Add each card's ranked bonus while its own uses remain. | Repeat using the source's uses. | Borrow using the source's uses. | Starts with 6 uses; one source use per successful execution. |
| Deep Vessel | Add each ranked capacity amount. | No activation to repeat. | Add the source's capacity. | Equip/reorder never refills the meter. |
| Tight Packing | Add the source’s +50/75/100 percentage points by rarity. | Add the source’s percentage. | Add the source’s percentage. | Apply once to eligible packing; preserve integer quarter carry. |
| Echo / Echo II / Echo III | Repeat a compatible immediate-right action 1 / 2 / 3 times, as printed. | Cannot copy a copy card. | Cannot copy a copy card. | Each successful execution spends a real source use; no recursion. |
| Chameleon | Each looks only one slot right. | Cannot copy a copy card. | Cannot copy a copy card. | No recursion or extra uses. |
| Field Impulse | Add 0.8 seconds per effective source at a full ring, up to 9 sources. | Add the printed repeat count as duration sources. | Add one duration source. | One swipe and one ring spend. Up, Down and Right keep their single-source force; only duration stacks. |
| Lift Guide | One coaching cue. | Incompatible. | Incompatible. | No automatic Lift or duplicate marker. |
| Dream | One 8-second opening after a committed Rest, or before an Elite or Guardian. | Incompatible. | Incompatible. | Full light and free Lifts; repeated rehearsal spends no saved heart, card use or reward. Wake at the chosen opening’s end, paused, then resume slowly without Lifting. |
| Rhythm | One evaluator and one Pulse per successful trio. | Incompatible. | Incompatible. | Trio consumed once; no overlapping extra Pulses. |
| Resonant Harvest · Common | Add each ranked meter payout. | Add the source's payout. | Add the source's payout. | One crossing per natural Spark per Pulse; meter cap applies. |
| Resonant Harvest · Rare | Add each ranked meter payout. | Add the source's payout. | Add the source's payout. | Same crossing and meter limits. |
| Resonant Harvest · Legendary | Add ranked meter payouts and +1 Stored Spark per source per Pulse. | Add both source payouts. | Add both source payouts. | Wallet pays only on the first qualifying crossing of each Pulse. |
| Second Ember | Keep one second distinct action; retain unspent duplicate charges. | Incompatible. | Incompatible. | One real source charge spent after the second action succeeds; at most 2 actions per Rest. |
| Growth Seed · Common / Rare / Legendary | Add each owned source's printed +3 / +5 / +8 maximum Sparks to one Grow; Legendary ranks reach +9 / +10. | Incompatible. | Incompatible. | Inventory only; one chosen action, one refill, no healing; +90 per action cap and 3 shared Grow actions per run. |
| Cache Handling | One fetch permission, 12-Spark delivery and full ring recharge. | Incompatible. | Incompatible. | One pickup and one recharge; duplicates do not raise 12. |
| Flash Handling | Add up to 6 missing Sparks per source. | Add up to 6. | Add up to 6. | One fetch permission and one pickup/refill event; stop at the meter cap. |

Field Impulse duration is **0.8 seconds × effective source count × ring strength** for every direction. One original plus an adjacent Chameleon lasts exactly twice as long as one source at equal ring fullness. The maximum supported nine sources give 7.2 seconds at a full ring. Copies preserve the normal lift hold, downward kick and rightward speed force; they extend the same action instead of multiplying its force. One swipe spends the ring once. Copies cannot multiply launches, recharge the ring or bypass cooldown. An absent, empty or incompatible right-hand card contributes nothing.

**Edge Reach** is a Rare passive that enables proximity Pulses while equipped and adds **50% of normal proximity reach per equipped or Chameleon-borrowed source**. One source changes the edge-to-solid-terrain threshold from 48 to 72 world units; two change it to 96. Echo has no action to repeat. Its card help compares two captures from the same production flight scene and loadout, including the meter charge and Pulse after two seconds. The disposable comparison leaves the run, wallet and saved cards unchanged.

### The chain: Triggers, Boosts and Encore

The **85-card catalog** approved on 2026-11-17 contains 47 Common, 23 Rare and 15 Legendary definitions (Prism Lens moved from Rare to Common). Two further cards, Double Lift and Climb, were added to the catalog by separate work on 2026-11-17 and are outside this approved set. Every card face reads the same way (wording: `docs/card-text-rewrite.md`, `v1.0-cardtext`): a **Trigger chip**, optionally with a short condition (“Collect · Dusk Spark”), one short line saying what the card gives, and an optional small tag for uses or a limit. The catalog stores the chip as data (`trigger`) and keeps the fine print the face leaves out in `help`, which the card's description shows. The [combination gallery](https://mocanumarius.github.io/orbix/card-combos.html) shows seeded trios, a searchable full catalog and actual event receipts. The curated three-choice starter pool remains separate from ordinary rewards.

The Triggers are **Collect** (your wisp touches a Spark), **Delivery**, **Latch**, **Pulse**, **Flash**, **Flash ends**, **Falling Lift**, **Overfill**, **Rhythm**, **Save** and **Clear**. **Any Trigger** cards work with all of them, **Next card** cards (Echo, Chameleon) fire with the card to their right, **Always on** cards work outside the chain, and **At Rest** cards work from the Deck.

When a Trigger happens and a card in the chain has it, the chain fires **left to right** from Slot 1. The Sparks start at zero each time. **+ cards** add Sparks. A **Boost** (× card) strengthens the Sparks and the Collector time saved by **every card to its left** in that firing (`docs/boost-rules.md`, approved 2026-11-17). It **never** strengthens Stored Sparks rewards or permanent gains (max Sparks forever, cruising speed): those pay their base amount whatever Boosts are in the chain, although Echo repeats and the Encore still fire them again. Several Boosts multiply together. Boosts with no Trigger of their own and no limited uses (Prism Lens, Prism Lens II, Crescendo, and Closing Chord as the last card) also strengthen the bonus part of **always-on cards** to their left: +20% Luminance ×2 = +40%, +3 max Sparks ×2 = +6; this covers Deep Vessel, Ember Feeder's stored growth, Lantern Lens, Edge Reach, Long Spool, Cast Line and Tight Packing. An Encore never re-applies always-on cards. Caps still apply after boosting: the Spark Meter never holds more than **100 Sparks**, and seconds added by a Boost never bring Collector recovery or reel time below half a second.

The **multiplier ladder** (2026-11-17): Prism Lens Common ×1.25; Crescendo Rare ×2 with no requirement; Closing Chord Rare ×2.5, last card only; Second Sun Legendary ×2, or ×3 in an Encore; Prism Lens II Legendary ×3. The Trigger-specific doublers (Ripple Glass, Glide Prism, Courier Glass, Clear Prism, Wick Doubler) are unchanged and strengthen only rewards from their own Trigger. Kindling Bead still needs a + card before it. Boosts and Mirror Grain cannot be copied by Echo or Chameleon.

For one natural Pulse crossing, **Resonant Harvest Rare → Prism Lens → Refrain** gives 2 × 1.25 = 2.5 Sparks, rounded down to 2, then the same 2 in the **Encore**, for **4**. Chain results are whole Sparks: each firing’s total rounds down once, at its end (4 × 1.25 = 5 stays 5), and an Encore rounds its own firing. The receipt keeps the unrounded figure (`sparksExact`). **Prism Lens → Resonant Harvest Rare → Refrain** gives 2 + 2 = **4**. All Refrains share one Encore per Trigger. It fires the chain again from Slot 1 with the cards' real remaining uses; it does not collect another pickup, emit another Pulse, repeat a rescue or spend Collector’s ring again. Legendary Harvest’s Stored Spark remains limited to the first firing.

The resolver (`skill-cards.mjs › resolveCardRow`) is shared by flight and previews. Its receipt lists, for every card in the chain, the card's base amount and its effective amount after repeats and Boosts per reward kind, and the effective amounts always sum exactly to the totals. `getAlwaysOnCardBoosts` gives the same for always-on cards. The flight’s retained **Last card event** receipt shows the exact Slots, copied attempts, skipped conditions and totals; opening it pauses flight.

## Melt and forge

Melt exchanges selected owned cards for the shown Stored Sparks. It does not save ingredients or count matching cards. Preview every selected card, mounted ability lost, remaining charges and combined amount gained. Consume each selected instance once and never leave it active after the exchange. Stale, invalid or changed selections are rejected together. Exhausted cards cannot Melt. Equipping and unequipping never Melt a card.

In the Workshop, spend from the shared banked wallet to **Forge one surprise card of the rarity you choose: Common, Rare or Legendary** (Forge v3, approved 2026-11-17). The price of the next forge of each rarity is always shown; the card is revealed only after paying. It is drawn from the same pool as the reward drafts for that rarity (never starter-only cards), and never a card you already own unless you own every card of that rarity. The result is seeded by the run and its forge count, so Back, reload or another quote cannot reroll it. The forged card enters reserve automatically, and Forge remains open for another purchase. Melt payouts and forged results survive reload and retry without duplicate transactions or rerolls.

**One Common Melt returns 10 Stored Sparks in the first playtest.** Provisional implemented values are:

| Transaction | Common | Rare | Legendary |
| --- | ---: | ---: | ---: |
| Melt return | 10 | 20 | 40 |
| First Forge of that rarity at each Rest | 15 | 40 | 150 |
| Each further Forge of that rarity at the same Rest | ×1.5, rounded up | ×1.5, rounded up | ×1.5, rounded up |
| Evolve into this rarity | — | 25 | 150 |
| Improve price | 15 × current rank | 25 × current rank | 40 × current rank |

Body Spark, Pocket Sparks, Deep Vessel and Resonant Harvest can improve through rank 3. Cards with a named next family tier can then **evolve** through the same Improve preview; rank upgrades happen first. Evolution costs 25 Stored Sparks into Rare or 150 into Legendary (the first Legendary forge price, since 2026-11-17), keeps the same individual card and remaining uses, and prints the exact result before confirmation. Other cards stay at their printed rank when no improvement or evolution exists. Prism Lens (Common) still evolves into Prism Lens II (Legendary), as Downbeat and Courier Tip already do; at 150 Stored Sparks it is no cheaper than forging a Legendary. Legendary forging needs no Rare card mounted: the price is the gate. Forge is repeatable at a verified active or completed camp whenever the banked wallet can pay; there is no per-Rest limit. Higher-tier prices and odds still need playtest tuning.

Each successful Forge raises the next price of that rarity at this Rest by half (first price × 1.5 per earlier forge of that rarity here, rounded up): Common 15 → 23 → 34, Rare 40 → 60 → 90, Legendary 150 → 225 → 338. Reopening the Workshop or reloading keeps the price and the surprise card; the next Rest starts again at the first prices. Previewing does not raise the price. Since Melt returns 10 / 20 / 40, forging and then melting always loses Stored Sparks.

## Rest and archetypes

Rest normally offers **one action per visit**: choose **Recover or Add slot**, or **Grow** when unlocked. Forge is a Workshop service at camp and spends no camp allowance. Forging grants no healing, refill, growth or slot.

**Growth Seed** unlocks Grow directly from the Deck at an open Rest; it does not grant growth automatically or occupy an active slot. Its Common / Rare / Legendary versions add **+3 / +5 / +8 maximum Sparks per owned Seed**, with Legendary ranks II and III adding +9 and +10. Echo and other flight-card copying effects cannot copy Rest cards. Common evolves to Rare for 25 Stored Sparks, then Legendary for 150; the Legendary's normal rank improvements cost 40 and 80. Improvements and evolutions require camp, preserve the real instance and never grant a free Grow or refill.

Selecting Grow reviews the resulting maximum Sparks, refill, Rest action and shared Grow action before committing. Confirming adds the owned sources' actual amounts **for the rest of the run and refills the meter once, with no heart restoration**. Cancel spends nothing. The limit remains **three Grow actions per run**, shared by every source. One Common seed can earn +9 total over three actions; one Rare seed +15; one rank-III Legendary +30. Owned Seeds add their individual amounts, capped at +90 per action, and the Spark Meter itself never holds more than 100 Sparks: Grow then quotes only what still fits, or “Max 100 reached”. Fractional internal fuel units preserve these exact printed totals through cleanup and reload. The unlock lasts while a Seed is owned; earned capacity remains after Melt. Existing earned growth does not change retroactively, and existing mounted Rest cards move into the Deck with their identities, ranks and uses intact.

**Second Ember**, a Common inventory-only Rest card, grants **one second, distinct eligible action at one Rest** directly from the Deck. Spend its 1 use only when the second action successfully commits. Visiting, declining or leaving after the first action does not spend it; if no second action is possible, keep the use. Do not repeat the same camp choice. Forge is independent and deducts its quoted wallet price once per confirmed purchase. Grow remains the owned Growth Seed family action described above.

With Second Ember owned on arrival, Grow may be either action in the pair, provided a Growth Seed is owned when Grow is chosen and it remains eligible. Second Ember eligibility is captured on arrival at Rest; that extra-action source must remain available for its charge to be spent. Acquiring a Growth Seed during the visit enables Grow immediately but grants no extra action. Same-visit changes cannot create unlimited extra actions.

The pilot permits **five slots maximum, at most one addition per map**. Add slot restores neither hearts nor fuel. Recover/Grow refills are printed. At cap, useful choices or Continue remain available without resetting the run. Test whether slots are worthwhile without becoming the guaranteed best camp choice; the cap and prices remain provisional.

Keep **Bankrunner** skimming and **Glider** coasting into a direct fuel Spark as archetype examples, each priming one free Lift. Candidate follow-ups reveal nearby space or accelerate a recovering Collector when that Lift is spent. Retain one stored free Lift, tentatively two priming triggers per flight, and preserve the opportunity while a free Lift is stored. Show each step clearly.

## Lift Guide

**Lift Guide** is a **Common coaching card**. It is loaned during card-mode First Light's Lift lesson, then guaranteed alongside the player's chosen Common card in every new card journey. It is excluded from the two advertised choices and remains starter-only rather than in ordinary flight rewards, so those rewards stay varied. It can be unequipped or deliberately melted like any other owned card, and is never restored by reloading.

One small **amber chevron beside the wisp** appears slightly before a brief tap window, giving the player a human reaction margin, then opens for that window. It disappears on Lift. Over a short visible horizon, compare coasting with affordable tap timings by **safe forward distance per Spark spent**, preferring coasting when tied. The cue responds to current speed, gravity, drafts and actual Lift cost, accounting for free Lifts without dividing by zero. Suppress it for a predicted ceiling strike, insufficient visibility or an uncertain hazard.

For example, coast over a bank crest; the marker opens on the descent before the next ridge. It offers timing advice without automatic Lift, a guaranteed route or extra meter. This is neither Rhythm's even beat nor Drift Sense's route to a pickup.

## Rhythm and pulse rewards

**Rhythm is a Rare card.** Three successful manual Lifts with roughly equal gaps, at a tempo chosen by the player, release **exactly one terrain-revealing Luminance Pulse from the wisp**. Consume that trio: six evenly spaced Lifts release two Pulses, not four overlapping-trio Pulses. Rhythm is independent of music playback and Fourth Beat. Legitimate free manual Lifts count; failed cadence never penalizes an ordinary Lift. It uses the existing Lift input with no extra button.

With Rhythm equipped, its small score records the first two notes and shows the third-note window. Follow that window for the Luminance Pulse. A missed window drops the notes, and completing the trio clears the score for the next one. Timing uses the shared flight/world clock. Slow motion stretches the same world-time window on the wall clock; pause and hidden time do not advance it. The [Rhythm flight preview](https://mocanumarius.github.io/orbix/rhythm-preview.html) uses the same production evaluator and score.

Rhythm uses the existing temporary Luminance Pulse system and supports the **three separate pulse-on-map-Spark payout cards** below. Those cards also work with all existing temporary Luminance sources. Compatible payouts intentionally stack. These numbers are **first-playtest values only**:

| Card | Rarity | Payout |
| --- | --- | --- |
| Resonant Harvest | Common | **+1 Spark to the meter** per qualifying crossing. |
| Resonant Harvest | Rare | **+2 Sparks to the meter** per qualifying crossing. |
| Resonant Harvest | Legendary | **+2 Sparks to the meter** per qualifying crossing, plus **+1 Stored Spark on the first qualifying crossing of each Pulse**, at most one wallet award per Pulse. |

A qualifying crossing is a Pulse crossing a **natural, uncollected fuel Spark on the map**. Each Spark qualifies once per Pulse and can qualify again on a later Pulse. Crossing does not collect the Spark. Meter gain stops at the cap; no payout can trigger itself or pay from a generated Spark. The Legendary wallet payout is deliberately per Pulse, unlike the existing skill book's +1 Stored Spark per crossing.

For one payout card, a Pulse crossing three eligible Sparks with room in the meter gives **Common: +3 meter; Rare: +6 meter; Legendary: +6 meter and +1 Stored Spark**.

## What the pilot still needs to answer

The earlier **same-seed, equal-economy comparison with the skill book** is optional historical study work. The later decision makes Cards the primary game and keeps the separate legacy book under Settings → Advanced; legacy-book balance is no longer a release requirement. Evaluate current Cards across open-middle and riskier-bank routes without requiring Proximity, Dream or expensive granted skills. Prevent practice carryover, generated loops and Dream/retry farming.

Record actual flights, card drops, equips, Melts, improvement and forge spending, reordering, direct versus Collector pickups, bank time, routes, survival and camp choices. Check that every playable route offers both optional Rest forks and that taking the first preserves access to the second. Ask why players changed flight line and whether they predicted combinations and charge costs. Do the choices add readable archetypes beyond the book, and can they fit comfortably on a phone?

The approved pool contains 85 printed cards, including the three Harvest rarities and evolved variants. They reuse the original sixteen illustrated scene families; the catalog does not imply eighty-five unique new paintings. Cache Handling and Flash Handling unlock the corresponding Collector pickup capability in card runs; ordinary flight pickups and their brief delivery/discard cues also remain visible in standard play. Bankrunner and Glider remain follow-ups. Local card history records transactions and outcomes in the pilot save; no remote telemetry is added. Automated flights and emulated phone layouts do not establish physical-phone performance, a human difficulty curve or an equal-economy comparison with the skill book.

## Future expedition capacity and shared consumables

Growth Ring replaces Trail Vessel and adds +1 maximum Spark permanently on every flight clear while it is in the chain, including copies and the Encore (Boosts never multiply it); the Spark Meter still stops at 100. The active vessel grows without refilling; later normal Cards expeditions begin full at the earned maximum. Wind Feather replaces Bellows Seal and unlocks +1% cruising speed per clear action, capped at +6% for the profile. Settings selects any unlocked whole percentage, including baseline; changes apply on the next flight. A selected slower speed stays selected after later unlocks. Each actual clear records its equipped sources before the reward, and profile settlement uses its run/map/node key exactly once across reload. TEST, practice, Dream, failures and historical completed wins cannot generate permanent rewards; abandoning later does not erase an already earned clear.

Wick Doubler has three successful Collect uses and doubles the Sparks and Collector time of the cards to its left in that firing. Fast Spool has three successful uses, removing three seconds only from an active Collector reel. Echo, Chameleon and the Encore consume the real source uses; failed/no-benefit attempts do not spend them. Fuel, reel seconds and future capacity are distinct chain totals.

Collector catches eligible missed pickups only after the body has passed them, reels the intact pickup to the moving main wisp, and delivers once on contact. Return Spring, Haul Winch and ring Spring shorten the active reel at attachment. Lift Guide is a current-motion cue based on velocity and physical Lift cadence; it neither predicts terrain nor flies automatically.

Tight Packing grants +50% naturally packed Stored Sparks at Common (+1 per 2), +75% at Rare and +100% at Legendary. Integer quarter-progress survives reload and tier changes; copied sources add their percentages, while card income, Melt and other bonuses never earn further packing bonuses. Wayfarer’s Purse grants +5 Stored Sparks per equipped clear action. Nest Egg grants +1 per 10 Stored Sparks carried into that flight, capped at +10 per action; copies and the Encore use the same entry balance. Boosts never multiply Wayfarer’s Purse or Nest Egg income, but they do strengthen Tight Packing’s percentage (an always-on bonus).

Devourer is Rare and takes two adjacent occupied slots with its Rare target immediately right. On a successful clear, if a heart is missing, it consumes that actual target instance and restores one heart. Full hearts and failed flights preserve the pair. Pairs resolve left-to-right before rewards, and copies or an Encore cannot trigger a second sacrifice. Courier Tip II, Downbeat II and Toll Bell II are retired from the pool: Improve their Common cards to rank 2 for +3, +3 and +4 respectively. Existing retired instances migrate to those Common ranks without changing their instance IDs.
