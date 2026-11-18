# Card text rewrite: plain rule text for all 85 cards (`v1.0-cardtext`)

Status: worker proposal, 2026-11-17, waiting for the designer's approval. **No game file is changed.** The live preview is `dist/design-lab/cardtext.html?variant=v1.0-cardtext`. Its data in `dist/design-lab/cardtext.mjs` is the source for the table below.

The designer asked for this:

> We should avoid game design which has complicated phrasings… Once it reaches it, the things to the left of it are earlier by default. We don't need those extra and complicated phrasings.

Facts come from `outputs/card-ux/activation-brief.md` §1–2 and the code. Vocabulary comes from `docs/card-teaching-plan.md` §1 and its two updates (Chain, Slots, Trigger names, Encore, + cards and × cards). Boost rules come from `docs/boost-rules.md`.

## Counts

| | Cards |
| --- | --- |
| Meaning unchanged, no decision needed | **60** |
| Decided rule change (Crescendo, D1) | **1** |
| Waiting on a **rule** decision (the simplest text would change what the card does): D2 Kindling Bead ×3, D3 Closing Chord, D9 Second Sun | **5** |
| Waiting on a **text-only** decision (the rule stays the same; the question is whether the limit is printed on the card or left to the status chip or inspector): D4 copy cards ×4, D5 Refrain, D6 non-stacking abilities ×10, D7 Watchlight, D8 Growth Seed ×3 | **19** |
| **Total** | **85** |

If the designer accepts every recommendation below, **84 of the 85 cards keep exactly today's behaviour**. Only Crescendo changes, and that change is already decided. Kindling Bead (×3), Closing Chord and Second Sun change only if the designer goes against the recommendation.

## Shape of every card

```
[TRIGGER CHIP]  short condition (only when the code enforces one)
WHAT, number first                                    [N uses]
```

- Line 1 says WHEN. It is a Trigger chip, optionally followed by a condition of four words or fewer.
- Line 2 says WHAT. It is eight words or fewer and starts with the number where there is one.
- The optional third element is a small tag. It holds uses, or a per-flight or per-journey limit.
- The words "earlier", "so far", "pass", "pay", "payer", "action", "replay", "bonus", "matching event", "equipped" and "mounted" never appear.
- Left-to-right order is taught by the screen, so a card mentions it only when the code has a real extra requirement. Two cards have one: Kindling Bead ("needs a + card before it") and Closing Chord ("last card only").

### Trigger chips

| Chip | Meaning (goes in the glossary, with the icon another worker is drawing) | Code event |
| --- | --- | --- |
| Collect | Your wisp touches a Spark, Cluster, Cache or Dusk Spark | `body-spark` |
| Delivery | Collector brings you a pickup | `collector-delivery` |
| Latch | Collector grabs a missed pickup | `collector-attach` |
| Pulse | A Pulse crosses a Spark you have not collected | `wave-crossing` |
| Flash | You or Collector pick up Flash | `flash-pickup` |
| Flash ends | A Flash's light runs out | `flash-expiry` |
| Falling Lift | A paid Lift while falling, at least 0.75 s after your last Lift | `downbeat-lift` |
| Overfill | A Spark brings more than your meter can hold | `natural-overfill` |
| Rhythm | Rhythm's 3 even Lifts complete | `rhythm-phrase` |
| Save | Watchlight or Last Orbit stops a fatal crash | `guard-rescue` |
| Clear | You clear a flight | `flight-clear` |
| **Any Trigger** *(new, needs approval)* | The card works with whatever Trigger fires the chain | `event: '*'` |
| **Next card** *(new, needs approval)* | Copy cards: the card fires when the card to its right fires | Echo, Chameleon |
| Always on | The card works outside the chain, so order and × cards do not affect it. A condition after the chip says when it acts ("Always on · after a clear"). | passives, abilities, consumers |
| At Rest | Rest cards: they work from the Deck and never go in the chain | `isInventoryOnlyCard` |

"Swipe" has no chip. No card listens to `field-swipe` inside the chain; Wave Loom works outside it, so its text says "Each Field Impulse swipe…".

### Sentence patterns (one per kind of effect)

| Kind of effect | Pattern | Example |
| --- | --- | --- |
| Adds Sparks (a + card) | `+N Sparks` (`+1 Spark`) | Pocket Sparks: `+4 Sparks` |
| Multiplies, ×2 | `Double the chain's Sparks` | Crescendo (wording decided by the designer) |
| Multiplies, other | `Chain's Sparks ×N` | Prism Lens: `Chain's Sparks ×1.25` |
| Stored Sparks | `+N Stored Sparks` | Wayfarer's Purse |
| Collector recovery | `Collector ready N s sooner` | Ring Spring: `Collector ready 1 s sooner` |
| Collector reel | `Collector reels in N s sooner` | Return Spring |
| Meter size | `+N max Sparks` (`forever` when permanent) | Deep Vessel, Growth Ring |
| Percentage bonus | `+N% thing` | Lantern Lens `+20% Luminance`; Cast Line `+100% Collector reach` (not "double", so it cannot be read as a × card) |
| Copy | `Repeats the next card` (`twice`, `3 times`) / `Acts as the next card` | Echo, Chameleon |
| Makes a Pulse | `… sends out a Pulse` | Rhythm `3 even Lifts send out a Pulse` |
| Encore | `Encore: the chain fires once more` | Refrain |
| Condition after the chip | a noun phrase: `Dusk Spark`, `Cluster`, `Cache`, `meter ⅓ or less`, `its 1st Spark`, `its 2nd Spark onward`, `while Collector reels in`, `last card only` | |
| Third element | `N uses`, `1 per flight`, `3 Grows per journey` | |

### Wording dropped everywhere because the code does not enforce it as a separate condition

- **"Earlier slots must pay first"** and **"so far"** on × cards. Multiplying zero Sparks does nothing and spends no use (`skill-cards.mjs › resolveCardRow`: `subtotal > 0`).
- **"up to N s"** on time cards. Every time saving is limited by the time left (`Math.min(amount, recoveryLeft)` in the same function), so this is a property of every time card. It moves to the glossary.
- **"Spend 1 only when…"** and **"1 use per pickup"**. A use is spent only when the card works; that is the general use rule (brief §1.7, glossary "uses").
- **"Restore up to N missing Sparks"**. The meter limit applies to every card (`flight.mjs › resolveCardRowEvent`).
- **"Checks before the pickup refills it"** (Low Wick, Flash Bank). "Meter ⅓ or less" when you touch the Spark already means that.
- **"after its drain" and the Dusk note** (Dusk Wick). These describe the Dusk pickup, not the card.
- **"while equipped", "in the chain"**. Implied by being in the chain.
- **Copy and Encore notes** ("Copies and the shared replay add gains", "Each copied or replayed action earns the same capped bonus"). Repeating a card repeats its effect; that is what a repeat means.

## All 85 cards

Today's text is verbatim from `card-rule-bands.mjs › getCardRuleBands`, with bands separated by " / ". Amounts are rank 1. Proposed text is written `chip · condition / WHAT [third element]`. The Boost column is filled only where the decided Boost rules would change the sentence.

| Card | Rarity | Today's text | Proposed | With Boost rules | Note |
| --- | --- | --- | --- | --- | --- |
| Body Spark +2 | common | Your wisp touches a Spark / +2 Sparks. | Collect / +2 Sparks |  |  |
| Pocket Sparks | common | Your wisp touches a Spark / +4 Sparks. / 1 use per pickup. | Collect / +4 Sparks [6 uses] |  | "1 use per pickup" is the normal use rule. |
| Deep Vessel | common | +3 maximum Sparks while equipped. / Equipping does not refill the meter. | Always on / +3 max Sparks |  | Dropped "Equipping does not refill the meter" (no card refills unless it says so). Boost: plate shows the boosted figure; 100-Spark meter cap. |
| Tight Packing | common | Packing efficiency +50%. | Always on / +50% Stored Sparks from packing |  | "Packing efficiency" made concrete. |
| Echo | common | Repeat the action on the card to the right. / Share its uses. | Next card / Repeats the next card |  | **D4.** "Share its uses" dropped: a repeat spends a use like any other firing. |
| Field Impulse | common | Collector is beside you with at least ¼ charge. / Spend Collector charge. Swipe up to float, down to dive, or right to speed up. / Up to 0.8s per equipped or copied source. Extra sources extend duration. | Always on · Collector home, ¼ charge / Swipe: float, dive or speed up, 0.8 s |  | Dropped "Extra sources extend duration": copies adding time is the normal expectation. |
| Lift Guide | common | An amber chevron shows when your current fall makes a Lift rise back to its starting height. / Motion only. Read the terrain and choose when to Lift. | Always on / An arrow shows when a Lift regains height |  | Dropped "Motion only. Read the terrain…" (advice, not a rule). |
| Resonant Harvest | common | When a wave crosses an uncollected Spark / +1 Sparks. / Leaves the pickup in place. | Pulse / +1 Spark |  | "Leaves the pickup in place" belongs to the Pulse Trigger (the Pulse crosses a Spark you have not collected). |
| Second Ember | common | Keep in your Deck when arriving at Rest / Take 2 different actions. / Spend 1 use after the second succeeds. | At Rest / Take 2 different Rest actions [1 use] |  | The use is still spent only when the second action succeeds (normal use rule). |
| Downbeat | common | Paid Lift while falling, at least 0.75s after the last Lift / +2 Sparks. | Falling Lift / +2 Sparks |  | "Paid Lift while falling, 0.75 s after the last Lift" moves into the Falling Lift glossary entry; rule unchanged. |
| Courier Tip | common | When Collector delivers a passage Spark / +2 Sparks. | Delivery / +2 Sparks |  |  |
| Dusk Wick | common | When your wisp absorbs a Dusk Spark / +20 Sparks after its drain. / Dusk still drains up to 3 Sparks and dims Luminance. | Collect · Dusk Spark / +20 Sparks |  | "after its drain" and the Dusk note describe the Dusk pickup itself; the pickup always resolves before card Sparks. |
| Lantern Lens | common | +20% Luminance radius while equipped. / Sources add together. Chameleon can borrow; Echo cannot repeat a passive. | Always on / +20% Luminance |  | Copy note dropped (Echo shows "Can't repeat" status). |
| Cluster Heart | common | When your wisp absorbs a Cluster / +6 Sparks. / 5 uses. Spend 1 per successful action. | Collect · Cluster / +6 Sparks [5 uses] |  |  |
| Low Wick | common | Absorb a Spark with your meter at most ⅓ full / +5 Sparks. / 6 uses. Checks before the pickup refills it. | Collect · meter ⅓ or less / +5 Sparks [6 uses] |  | Dropped "Checks before the pickup refills it": the meter is read as you touch the Spark, which is what the line says. |
| First Ripple | common | At a wave’s first passage Spark crossing / +4 Sparks. / 6 uses. Spend 1 per successful action. | Pulse · its 1st Spark / +4 Sparks [6 uses] |  |  |
| Far Shore | common | At later passage Spark crossings by the same wave / +5 Sparks. / 6 uses. Spend 1 per successful action. | Pulse · its 2nd Spark onward / +5 Sparks [6 uses] |  |  |
| Toll Bell | common | When you complete a Rhythm phrase / +2 Sparks. | Rhythm / +2 Sparks |  |  |
| Proximity | common | Skim near solid terrain for 2 seconds / Send a revealing wave. / Works without Collector. Brief gaps keep charge; contact does not charge. | Always on · near terrain for 2 s / Sends out a revealing Pulse |  | **D6.** Dropped "Works without Collector" and the charge-gap details (fine print for the inspector). |
| Prism Wick | common | When a passage Flash expires / Send one final wave and gain +3 Sparks. / 3 uses. Copies share uses and keep one final wave. | Flash ends / Sends a final Pulse, +3 Sparks [3 uses] |  | **D6.** Copies already share uses (normal rule). |
| Heart Stitch | common | While missing a heart, absorb 3 passage Sparks directly in one flight / Restore 1 heart. / 2 successful uses. Collector deliveries do not count. | Always on · while missing a heart / Every 3rd Collect: +1 heart [2 uses] |  | "Collector deliveries do not count" is already what Collect means. |
| Springboard | common | Absorb a passage Spark directly while falling / Bounce upward with half a Lift’s force, for free. / No Lift payment or Rhythm progress. One bounce per pickup. | Always on · while falling / Each Collect gives a free half-Lift bounce |  | Dropped "No Rhythm progress"; the bounce still does not count toward Rhythm. |
| Pacesetter | common | When you complete a Rhythm phrase / Shorten Collector’s recovery by up to 3s. / 5 uses. Spend 1 only when time is saved. | Rhythm / Collector ready 3 s sooner [5 uses] |  | "up to" dropped: every time card is limited by the time left. |
| Counterweight | common | Paid Lift while falling, at least 0.75s after the last Lift / Shorten Collector’s recovery by 0.75s. | Falling Lift / Collector ready 0.75 s sooner |  |  |
| Courier Glass | common | When Collector delivers a passage Spark / Double this pass’s earlier card Sparks. / 5 uses. Spend 1 only when this adds Sparks. | Delivery / Double the chain's Sparks [5 uses] | Double every reward before it |  |
| Home Beacon | common | When Watchlight saves you / +9 Sparks. / 3 uses. Spend 1 per successful action. | Save / +9 Sparks [3 uses] |  | Today's face says "Watchlight"; the code also fires on Last Orbit saves, which "Save" covers. |
| Mending Moss | common | Touch a Spark while Collector recovers from saving you. / Shorten Collector’s recovery by up to 3s. / Needs Watchlight or Last Orbit. 6 uses; spend 1 only when time is saved. | Collect · Collector recovering from a save / Collector ready 3 s sooner [6 uses] |  | "Needs Watchlight or Last Orbit" is implied by "a save". |
| Return Spring | common | When Collector attaches a Spark / Shorten the remaining reel by up to 0.5s. | Latch / Collector reels in 0.5 s sooner |  |  |
| Haul Winch | common | When Collector attaches a Cluster / Shorten the remaining reel by up to 3s. / 5 uses. Spend 1 only when time is saved. | Latch · Cluster / Collector reels in 3 s sooner [5 uses] |  |  |
| Crate Lining | common | When Collector delivers a Cache / +8 Sparks. / 4 uses. Spend 1 per successful action. | Delivery · Cache / +8 Sparks [4 uses] |  |  |
| Glass Spool | common | When your wisp absorbs a passage Spark / Shorten Collector’s recovery by 0.5s. | Collect / Collector ready 0.5 s sooner |  |  |
| Clear Prism | common | When your wisp or Collector picks up Flash / Double this pass’s earlier card Sparks. / 4 uses. Spend 1 only when this adds Sparks. | Flash / Double the chain's Sparks [4 uses] | Double every reward before it |  |
| Flash Thread | common | When your wisp or Collector picks up Flash / Shorten Collector’s recovery by up to 3s. / 5 uses. Spend 1 only when time is saved. | Flash / Collector ready 3 s sooner [5 uses] |  |  |
| Kindling Bead | common | After an earlier action pays Sparks in this pass / +1 Sparks. | Any Trigger · needs a + card before it / +1 Spark |  | **D2.**  |
| Growth Ring | common | Clear a flight with this equipped / +1 maximum Spark permanently. / Copies and the shared replay add gains. Does not refill. | Clear / +1 max Spark forever |  | Dropped "Does not refill" and the copy note. Boost: 100-Spark meter cap. |
| Wind Feather | common | Clear a flight with this equipped / +1% permanent cruising speed, up to +6%. / Choose any unlocked speed, including baseline, in Settings. | Clear / +1% speed per Finish, kept on this card (max +10%) |  | Changed 2026-11-18: growth stored on the card, no Settings unlock. |
| Wayfarer’s Purse | common | Clear a flight with this equipped / +5 Stored Sparks. / This bonus cannot earn packing bonuses. | Clear / +5 Stored Sparks |  | "Cannot earn packing bonuses" is the general rule for card payouts (glossary). |
| Nest Egg | common | Clear a flight with this equipped / +1 Stored Spark per 10 carried into the flight, up to +10. / Each copied or replayed action earns the same capped bonus. | Clear / +1 Stored per 10 brought in (max +10) |  | Copy note dropped (normal rule). |
| Use Doubler | common | When you enter a real flight / Double the remaining uses of the consumable immediately right. Consume this card. / Needs a live target. Cannot target another Use Doubler. Preview and Dream spend nothing. | Always on · flight start / Doubles the next card's uses [1 use] |  | Dropped "Needs a live target / not another Use Doubler / Preview and Dream spend nothing"; status chips already say "Needs consumable right". |
| Wick Doubler | common | When your wisp absorbs a passage Spark / Double this pass’s earlier card Sparks. / 3 uses. Spend 1 only when this adds Sparks. | Collect / Double the chain's Sparks [3 uses] | Double every reward before it |  |
| Fast Spool | common | Absorb a passage Spark while Collector reels in a pickup / Shorten the remaining reel by up to 3s. / 3 uses. Spend 1 only when time is saved. | Collect · while Collector reels in / Collector reels in 3 s sooner [3 uses] |  |  |
| Twin Wick | common | Start or resume flight with Collector / Unlock a second Collector for this expedition, even after unequipping. / 1 use. Maximum 2 Collectors. Keeps its use while Twin Orbit already provides the second. | Always on · flight start with Collector / Unlocks a 2nd Collector for this journey [1 use] |  | **D6.** "even after unequipping" is what "for this journey" means. |
| Long Spool | common | +35% Collector fetching reach for 5 extra catches. / Spend 1 use only when an eligible missed pickup beyond normal reach is caught. Range extensions do not stack. | Always on / +35% Collector reach [5 uses] |  | **D6.** A use is spent only on a catch beyond normal reach (normal use rule). |
| Cast Line | common | Double Collector fetching reach for 2 extra catches. / Spend 1 use only beyond normal reach. Use the shortest sufficient extension. Your wisp gets first chance. | Always on / +100% Collector reach [2 uses] |  | **D6.** "Double" written as +100% so it is not read as a × card. |
| Growth Seed | common | From your Deck at Rest, unlock Grow / +3 maximum Sparks and a full meter. / 3 shared Grow actions per journey. Owned Seeds add together, up to +90. | At Rest · Grow / +3 max Sparks and a full meter [3 Grows per journey] |  | **D8.**  |
| Dream | common | While equipped, after Rest or before an Elite or Guardian / Rehearse the first 8 seconds in full light with free Lifts. / Repeat, or Wake at your chosen opening’s end with its pickups. Extra cards keep 8 seconds. | Always on · after Rest, or before Elite or Guardian / Practise the first 8 s, then keep it |  | **D6.** "full light, free Lifts" and Wake/Repeat are how the rehearsal plays; moved to the Dream glossary entry. |
| Chameleon | rare | Borrow the ability on the card to the right. / Share its uses. | Next card / Acts as the next card |  | **D4.**  |
| Rhythm | rare | Lift 3 times at an even pace / Send out one wave. | Always on / 3 even Lifts send out a Pulse |  |  |
| Resonant Harvest | rare | When a wave crosses an uncollected Spark / +2 Sparks. / Leaves the pickup in place. | Pulse / +2 Sparks |  |  |
| Growth Seed | rare | From your Deck at Rest, unlock Grow / +5 maximum Sparks and a full meter. / 3 shared Grow actions per journey. Owned Seeds add together, up to +90. | At Rest · Grow / +5 max Sparks and a full meter [3 Grows per journey] |  | **D8.**  |
| Cache Handling | rare | Allows Collector to fetch Caches. / On Cache delivery / +12 Sparks. | Always on / Collector fetches Caches: +12 Sparks each |  | The +12 works outside the chain today, so it is "Always on" and × cards do not touch it. |
| Flash Handling | rare | Collector can fetch Flash. / When either of you picks up Flash / Restore up to 6 missing Sparks. | Flash / +6 Sparks; Collector can fetch Flash |  | "Restore up to 6 missing Sparks" is the meter limit every card has; the code adds 6 through the chain. |
| Prism Lens | rare | Multiply this pass’s Sparks so far by 1.25. / Earlier slots must pay first. | Any Trigger / Chain's Sparks ×1.25 | Every card before it ×1.25 | "Earlier slots must pay first" dropped: ×1.25 of nothing is nothing. |
| Crescendo | rare | After 2 earlier actions pay Sparks in this pass / Double this pass’s Sparks so far. | Any Trigger / Double the chain's Sparks | Double every card before it | **D1 decided.**  |
| Ring Spring | rare | When a passage Spark overfills your meter / Shorten Collector’s recovery by 1s. | Overfill / Collector ready 1 s sooner |  |  |
| Watchlight | rare | Once per flight, with Collector beside you at full charge / Catch a fatal impact and send one wave. / Collector then needs 4 recovery cycles before fetching again. | Always on · Collector home, full charge / Collector catches a fatal crash, sends a Pulse [1 per flight · then 4× recovery] |  | **D7.**  |
| Echo II | rare | Repeat the action on the card to the right twice. / Share its uses. | Next card / Repeats the next card twice |  | **D4.**  |
| Dusk Wick II | rare | When your wisp absorbs a Dusk Spark / +30 Sparks after its drain. / Dusk still drains up to 3 Sparks and dims Luminance. | Collect · Dusk Spark / +30 Sparks |  |  |
| Ripple Glass | rare | At later crossings by the same wave / Double this pass’s Sparks so far. | Pulse · its 2nd Spark onward / Double the chain's Sparks | Double every reward before it |  |
| Glide Prism | rare | Paid Lift while falling, at least 0.75s after the last Lift / Double this pass’s Sparks so far. | Falling Lift / Double the chain's Sparks | Double every reward before it |  |
| Flash Bank | rare | Pick up Flash with your meter at most ⅓ full / +8 Sparks. / Checks before the pickup refills it. | Flash · meter ⅓ or less / +8 Sparks |  | "Checks before the pickup refills it" dropped (see Low Wick). |
| Spillway | rare | Every 2 passage Spark overfills / Send out one wave. / Only the strongest Spillway sets the pace. | Always on / Every 2nd Overfill sends out a Pulse |  | **D6.**  |
| Tight Packing II | rare | Packing efficiency +75%. | Always on / +75% Stored Sparks from packing |  |  |
| Kindling Bead II | rare | After an earlier action pays Sparks in this pass / +2 Sparks. | Any Trigger · needs a + card before it / +2 Sparks |  | **D2.**  |
| Mirror Grain | rare | Add the most recent earlier additive Spark payout again. / A multiplier’s increase is not an additive payout. | Any Trigger / Adds the last + card's Sparks again |  | Needing an earlier + card is implied (nothing to add again). A × card's increase is not a + card. |
| Closing Chord | rare | In your rightmost occupied slot / Multiply this pass’s Sparks so far by 1.75. | Any Trigger · last card only / Chain's Sparks ×1.75 | Every card before it ×1.75 | **D3.**  |
| Edge Reach | rare | Near solid terrain / Charge a proximity wave from 50% farther away | Always on · near terrain for 2 s / Sends a Pulse; reach +50% |  | Code (model.mjs: proximityUnlocked) lets Edge Reach send Proximity Pulses on its own; today's face does not say so. Text now matches the code. |
| Devourer | rare | Clear a flight while missing a heart / Consume the equipped Rare card immediately to the right. Restore 1 heart. / Keeps both cards at full hearts. Devourer survives. Cannot be copied or replayed. | Always on · clear while missing a heart / Eats the next Rare card: +1 heart |  | "Keeps both at full hearts" is the missing-heart condition; "Devourer survives" is implied. |
| Ember Feeder | rare | After a successful flight / Consume the first 2 occupied cards to the right together. This card gains +1 maximum Spark while equipped. / Stored growth +{fedCapacity} maximum Sparks. Fewer than 2 targets consumes neither. Cannot be copied or replayed. No refill. | Always on · after a clear / Eats the next 2 cards: +1 max Spark |  | Still eats nothing if fewer than 2 cards follow (status chip "Needs 2 cards right"). The +1 stays on Ember Feeder while it is in the chain. |
| Twin Orbit | rare | A second Collector fetches independently while equipped. / Maximum 2 Collectors. Each reels its own pickup. The first keeps Field Impulse and saves. | Always on / A 2nd Collector fetches too |  | **D6.** "The first keeps Field Impulse and saves" moves to the inspector. |
| Resonant Harvest | legendary | When a wave crosses an uncollected Spark / +2 Sparks. / First crossing of each wave / +1 Stored Spark. | Pulse / +2 Sparks, +1 Stored on its 1st Spark |  | The Stored Spark is still paid once per Pulse (not again in an Encore). |
| Refrain | legendary | After a matching event earns a bonus / Finish this pass, then replay once from slot 1. / Same event. Shared uses stay spent. All Refrains share one replay. | Any Trigger / Encore: the chain fires once more |  | **D5.**  |
| Echo III | legendary | Repeat the action on the card to the right 3 times. / Share its uses. | Next card / Repeats the next card 3 times |  | **D4.**  |
| Prism Lens II | legendary | Multiply this pass’s Sparks so far by 1.5. / Earlier slots must pay first. | Any Trigger / Chain's Sparks ×1.5 | Every card before it ×1.5 |  |
| Downbeat III | legendary | Paid Lift while falling, at least 0.75s after the last Lift / +5 Sparks. | Falling Lift / +5 Sparks |  |  |
| Ring Spring II | legendary | When a passage Spark overfills your meter / Shorten Collector’s recovery by 2s. | Overfill / Collector ready 2 s sooner |  |  |
| Courier Tip III | legendary | When Collector delivers a passage Spark / +5 Sparks. | Delivery / +5 Sparks |  |  |
| Dusk Wick III | legendary | When your wisp absorbs a Dusk Spark / +40 Sparks after its drain. / Dusk still drains up to 3 Sparks and dims Luminance. | Collect · Dusk Spark / +40 Sparks |  |  |
| Wave Loom | legendary | After a successful Field Impulse / Send out one wave. / Extra cards and replays keep one wave. | Always on / Each Field Impulse swipe sends a Pulse |  | **D6.**  |
| Last Light | legendary | Watchlight saves you with your meter at most ⅓ full / +9 Sparks. | Save · meter ⅓ or less / +9 Sparks |  |  |
| Spillway II | legendary | Every passage Spark overfill / Send out one wave. / Extra Spillways keep one wave. | Always on / Every Overfill sends out a Pulse |  | **D6.**  |
| Tight Packing III | legendary | Packing efficiency +100%. | Always on / +100% Stored Sparks from packing |  |  |
| Kindling Bead III | legendary | After an earlier action pays Sparks in this pass / +4 Sparks. | Any Trigger · needs a + card before it / +4 Sparks |  | **D2.**  |
| Second Sun | legendary | Multiply this pass’s Sparks so far by 1.25. / On a replay, multiply by 2 instead. | Any Trigger / Chain's Sparks ×1.25, ×2 in an Encore | Every card before it ×1.25, ×2 in an Encore | **D9.**  |
| Growth Seed | legendary | From your Deck at Rest, unlock Grow / +8 maximum Sparks and a full meter. / 3 shared Grow actions per journey. Owned Seeds add together, up to +90. | At Rest · Grow / +8 max Sparks and a full meter [3 Grows per journey] |  | **D8.**  |

Under the Boost rules, cards that are not × cards keep their sentence; their plate shows the boosted figure (open detail G). Capacity cards (Deep Vessel, Growth Ring, Growth Seed, Ember Feeder) gain a "Max 100 reached" state from the 100-Spark meter cap (decision 5). The sentence itself does not change.

## Decisions for the designer

The designer's guidance is to prefer the simpler rule when a requirement mostly exists so that it can be explained. Each recommendation below follows that guidance unless the requirement does real balance work.

### D1 · Crescendo: DECIDED (rule change)

- **Code today:** `card-catalog.mjs` crescendo `row: {event:'*', operation:'multiply', amount:2, minimumEarlierPayers:2}`. `skill-cards.mjs › resolveCardRow` skips it with `needs-two-earlier-payers` unless two + card activations came before it in the same Trigger (Echo repeats count; × cards do not).
- **Text that kept today's rule:** `Any Trigger · needs 2 + cards before it / Double the chain's Sparks`.
- **Decided text:** `Any Trigger / Double the chain's Sparks`.
- **Decision (designer, 2026-11-17):** the requirement is dropped. The engine change comes later (remove `minimumEarlierPayers` from the catalog row and from the `crescendo` fallback in `getCardRowRule`). Until then the code still enforces it. Coordinator note: an unconditional ×2 Rare is stronger than Prism Lens II (×1.5, Legendary), so this belongs in the Boost balance pass.

### D2 · Kindling Bead I, II, III: keep "needs a + card before it"? (rule)

- **Code today:** catalog `row: {event:'*', operation:'add-sparks', amount:1|2|4, minimumEarlierPayers:1}`, checked in `resolveCardRow` (`payers >= minimumEarlierPayers`). Because it is a wildcard + card, `hasCardRowEvent` already lets it start the chain on every Trigger except Clear, Latch and victory.
- **Keeps today's rule:** `Any Trigger · needs a + card before it / +1 Spark`.
- **Simpler, needs a rule change:** `Any Trigger / +1 Spark`.
- **Recommendation: keep the requirement.** Here the condition does the balancing: without it, a lone Kindling Bead III pays +4 on every Collect, Pulse, Falling Lift, Overfill, Flash and Delivery. The kept text is four short words, with no "earlier" and no "pass". An equivalent wording is "if the chain has Sparks", because only + cards add Sparks.

### D3 · Closing Chord: keep "last card only"? (rule)

- **Code today:** catalog `when: {lastOccupied: true}`, checked in `skill-cards.mjs › matchesRowCondition` (`slot === lastOccupied`). It means the rightmost *occupied* slot, not slot 5: in a 3-card chain, slot 3 counts.
- **Keeps today's rule:** `Any Trigger · last card only / Chain's Sparks ×1.75`.
- **Simpler, needs a rule change:** `Any Trigger / Chain's Sparks ×1.75`.
- **Recommendation: keep.** The text is three plain words, and the condition is the card's price. Without it, a Rare ×1.75 placed anywhere beats Prism Lens II (×1.5, Legendary), and it could sit before a second × card. Write "last card", not "last slot": empty slots after it do not matter.

### D4 · Echo, Echo II, Echo III, Chameleon: print the copy limits? (text only)

- **Code today:** `resolveCardRow` skips with `incompatible-neighbor` when the next card is not `copyable`. That covers every × card, Refrain, Rhythm, Cache Handling, Lift Guide, Rest cards and the other copy cards. Echo also cannot repeat passives or capacity cards (`def.kind === 'capacity' || def.passive`). Copies spend the real card's uses. Chameleon can borrow passives (`getEffectiveCardSources`).
- **Card states the limit:** `Next card / Repeats the next card [Not × or always-on cards]`. For Chameleon: `[Not × cards or Rest cards]`.
- **Simpler, same rule:** `Next card / Repeats the next card`. The status chip already says "No action to copy" or "Cannot copy X" when the neighbour is wrong. "Share its uses" is dropped, because a repeat spends a use like any firing.
- **Recommendation: simpler text.** The limit is visible at the moment it matters, on the status chip in the Deck.

### D5 · Refrain: print "one Encore per Trigger"? (text only)

- **Code today:** `resolveCardRow`, `replay-row` branch:
  - The first Refrain asks for one second walk from slot 1. It happens only if something in the first walk worked, including time savings.
  - Further Refrains get `replay-limit`.
  - Uses spent stay spent, and the Sparks total restarts at 0.
  - The first-crossing Stored Spark is paid once.
  - The branch is not gated by event, so Refrain also repeats Clear and Latch chains (Growth Ring, Wind Feather, Return Spring and similar). "Any Trigger" is therefore accurate for Refrain. For the other wildcard cards, see D10.
- **Card states the limit:** `Any Trigger / Encore: the chain fires once more [1 Encore per Trigger]`.
- **Simpler, same rule:** `Any Trigger / Encore: the chain fires once more`. A second Refrain shows the "Shared replay" status (to be renamed "Shared Encore" under `v1.0-words`).
- **Recommendation: simpler text.** "After a matching event earns a bonus" is dropped in both versions: if nothing worked, an Encore would also do nothing, so no Encore is wasted. "Finish this pass" is dropped too: the screen shows the chain finishing first. This needs "Encore" as a glossary word (decided in `v1.0-words`).

### D6 · Abilities that do not stack: print "Doesn't stack"? (text only, 10 cards)

Proximity, Prism Wick, Twin Wick, Long Spool, Cast Line, Dream, Spillway, Spillway II, Twin Orbit, Wave Loom.

- **Code today:**
  - One shared Pulse or meter: Wave Loom, Spillway ("only the strongest sets the pace", `getCardModifiers` takes the minimum `pulseCadence`), Proximity (one terrain meter) and Prism Wick (one final Pulse per expiry, `card-standalone.mjs › updatePrismWick`).
  - Dream stays at 8 s.
  - Twin Orbit and Twin Wick allow at most 2 Collectors.
  - Long Spool and Cast Line extensions do not stack, and the shortest one that is enough is used.
- **Card states the limit:** add the tag `[Doesn't stack]`.
- **Simpler, same rule:** no tag. A duplicate shows the "Already covered" status.
- **Recommendation: simpler text.** It is the same answer as D4 and D5: a limit that only matters when you own two copies is shown when you own two copies.

### D7 · Watchlight: print the recovery cost? (text only)

- **Code today:** once per flight (`cardWatchlightUsed`), only with Collector home at full charge. Afterwards Collector needs 4 recovery cycles before fetching again.
- **Card states the limit:** `Always on · Collector home, full charge / Collector catches a fatal crash, sends a Pulse [1 per flight · then 4× recovery]`.
- **Simpler, same rule:** the same, with the tag `[1 per flight]` only.
- **Recommendation: keep the cost on the card.** AGENTS.md asks that consequences be explained before the player commits, and this is the card's only downside.

### D8 · Growth Seed (Common, Rare, Legendary): drop "+90" from the card? (text only)

- **Code today:**
  - Grow adds the sum of every owned Seed.
  - The sum is capped at `CARD_ECONOMY.maxGrowPerAction` = 10 × 9 = 90 per Grow (`skill-cards.mjs › getCardModifiers`, `cardGrowAmount`).
  - All Seeds share 3 Grow actions per journey.
- **Card states the limit:** `At Rest · Grow / +5 max Sparks and a full meter [3 Grows per journey · max +90]`.
- **Simpler, same rule:** `[3 Grows per journey]`. "Owned Seeds add together" is dropped because adding is the natural reading. The +90 cap stays in code and in the inspector.
- **Recommendation: simpler.** Reaching +90 in one Grow takes about 10 or more Seeds, and once the 100-Spark meter cap (Boost decision 5) is built, the meter cap binds first. Keep "shared" visible: the third element "3 Grows per journey" sits on every Seed, so it reads as one shared pool rather than three per Seed. If playtests show otherwise, use "3 Grows per journey, all Seeds".

### D9 · Second Sun: keep the Encore clause? (rule)

- **Code today:** catalog `row: {event:'*', operation:'multiply', amount:1.25, replayAmount:2}`. `resolveCardRow` uses ×2 in the second walk.
- **Keeps today's rule:** `Any Trigger / Chain's Sparks ×1.25, ×2 in an Encore`.
- **Simpler, needs a rule change:** `Any Trigger / Chain's Sparks ×1.25` (remove `replayAmount`).
- **Recommendation: keep.** Without the clause the Legendary is a worse Prism Lens II. With "Encore" as a glossary word the clause is short and plain.

### D10 · For the Boost engine work: does "Any Trigger" include Clear and Latch? (rule, future)

- **Code today:** wildcard + and × cards (Prism Lens I/II, Crescendo, Closing Chord, Second Sun, Kindling Bead, Mirror Grain) skip `flight-clear`, `collector-attach` and `expedition-victory` (`resolveCardRow`: `rule.event === "*" && ![victory, clear, attach].includes(kind)`). Refrain does not skip them.
- **Today this is harmless.** No card adds Sparks on Clear or Latch, so "Any Trigger" is true in effect. Under the Boost rules, though, × cards would strengthen time savings (Latch: Return Spring, Haul Winch) and permanent gains (Clear: Growth Ring, Wind Feather). With today's exclusion they would not.
- **Recommendation:** when the Boost engine is built, either remove the exclusion so that "Any Trigger" stays literally true, or print "Not on Clear" on the wildcard × cards. I recommend removing it.

### D11 · Chip names "Any Trigger", "Next card" and "Always on · condition" (vocabulary)

These two chips are new. "Always on" with a moment ("Always on · after a clear", for Ember Feeder) reads slightly oddly. An alternative is to give outside-chain cards their Trigger chip plus a small "outside chain" mark. I followed the coordinator's rule ("Always on" for every card outside the chain), because the important fact for the player is that order and × cards do not affect them. **Recommendation:** approve "Any Trigger" and "Next card", and keep "Always on" for cards outside the chain.

## Points the worker was unsure about

- **Dream.** "full light, free Lifts" and "Repeat or Wake" are dropped from the card in favour of `Practise the first 8 s, then keep it`. The Field Guide says waking carries "your chosen opening and its pickups" into the real flight. I did not confirm whether the free Lifts carry over when you wake (`dream.mjs` records inputs and re-simulates; `flightBoon` is stripped). If they do, the card should say so.
- **Edge Reach.** The code lets Edge Reach send Proximity Pulses on its own (`model.mjs`: `if (m.cardProximityUnlocked || m.cardProximitySources > 0) m.proximityUnlocked = true`), and its catalog `description` says so too. Its card face today ("Charge a proximity Pulse from 50% farther away") does not say this. The proposed text states it. Please confirm that this is intended.
- **Flash Handling and Cache Handling** sit on opposite sides of the chain. Flash Handling's +6 goes through the chain (fallback rule in `getCardRowRule`), so × cards double it. Cache Handling's +12 does not (brief §1.1), so the card is "Always on". The two cards look alike but behave differently. That is worth a designer look, but it is not a text question.
- **Heart Stitch** counts Collects only while a heart is missing, and resets to 0 while hearts are full (`card-standalone.mjs › applyDirectPickupCards`). "Every 3rd Collect" while missing a heart describes this.
- **"+1 Spark" versus "+1 Sparks".** Today's faces print "+1 Sparks" (Resonant Harvest). The proposal uses the singular.
- **Amounts at higher ranks** (Body Spark, Downbeat, Toll Bell, Harvest, Growth Seed Legendary) are shown at rank 1, as the faces resolve `{amount}` today. A built version keeps the `{amount}` token.
