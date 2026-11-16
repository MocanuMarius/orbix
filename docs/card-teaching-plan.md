# Teaching how cards fire — design plan

Status: coordinator design, 2026-11-16. Facts come from `outputs/card-ux/activation-brief.md` (read that for the exact rules and citations). Each piece below is shown in the design lab under a code and built into the game only after the user approves the code. Registry: `docs/design-versions.md`.

## The problem, in the user's words

> users have no idea how this flow with card activations work, what is a "pass", and all of that fluff

The brief confirms it: no lesson or Field Guide topic teaches order, running totals, multipliers or uses; the one card lesson uses a pair where order does not matter; the running total has five names; "pass", "replay", "charge" and "Ready" each mean two or three things; and during flight the player sees a number with no cause.

## Decisions

### 1. One name per thing (`v1.0-words`)

| Today | Becomes | Why |
| --- | --- | --- |
| pass, row pass | no noun at all: "your cards fire **left to right**" | "pass" is jargon and also means "get past"; the idea is carried by the animation, as in Balatro's scoring |
| matching event | **Trigger** ("Trigger: you catch a Spark") | names the cause the player can see |
| bonus Sparks, card Sparks, Sparks so far, earlier card Sparks, Card bonuses | **Bonus** | one word for the running total |
| payer, additive action | a card that **Adds** (marked `+`) | pairs with the next row |
| multiplier | a card that **Multiplies** (marked `×`) | the mark shows why it belongs to the right of a `+` card |
| replay (Refrain's second pass) | **Encore** | "replay" already labels restart buttons |
| charge (for card uses) | **Uses** everywhere; "charge" stays for Collector only | removes the double meaning |
| equipped, mounted, active slot | **In your row** | one word for where a card must be to fire |
| Deck, reserve, collection (for cards) | **Deck** = all your cards; **Row** = the ones that fire; **Reserve** = the rest | Collection stays for relics only |

Every one of these gets a glossary entry, and status labels open the glossary rather than a separate dialog.

### 2. One explainer, used everywhere (`v1.0-cardflow`)

A paused, step-by-step stage, modelled on how Balatro and Slay the Spire show scoring:

1. **Trigger** lights up on the left ("You catch a Spark").
2. Each card in the row **fires in turn**, left to right, popping its own `+4` or `×1.25`, while one **Bonus** counter under the row counts up and the card's Uses tick down.
3. The Bonus flies into the Spark Meter.
4. Then the practice: **swap two cards and fire again**. Moving the `×` card to the front shows "nothing to multiply yet" and a smaller Bonus. Order is learned by doing it, not by reading about it.

Numbers come from the real resolver (`previewCardRow`), so the explainer can never disagree with the game. One caption of at most twelve words per step; the stage only ever runs while the game is stopped.

It appears in three places, the same component each time: the tutorial (a new camp lesson with three loaned cards, replacing the order-independent Rhythm + Harvest pair as the first card lesson), the Deck (replacing today's "Try row"), and the glossary (as the moving picture for Trigger, Bonus, Adds, Multiplies, Uses and Encore).

### 3. The Deck shows order without being asked (`v1.0-deck`, after the current-flow capture lands)

- The row reads as a sentence: arrows between slots, each card carrying its mark (`+`, `×`, Encore, or "always on" for cards that work outside the row).
- A line under the row states the result for the commonest Trigger in plain numbers ("Catch a Spark: +10 Bonus").
- Status is a plain instruction on the card ("Move right of a + card") instead of a code-like label ("Move after payer").
- Built from the approved kit pieces in `v1.2-theme`.

### 4. In flight: cause before effect, no words (`v1.0-flightcue`)

The card strip gains the Trigger's icon in front of the card icons, so the player sees *what happened*, *which cards fired*, *the Bonus* — in that order, with no text to read (the hard rule in AGENTS.md). The readable receipt stays behind the pause.

### 5. Glossary entries as short demonstrations (`v1.0-term`)

Each term: a moving picture first (the explainer stage or a real gameplay clip), then at most two sentences, then "See it in your row". Tapping a keyword on a card highlights the part of the card or stage it refers to.

## Rules the explainer must make visible (today they exist only in code)

- Nothing fires unless a card in the row listens for that Trigger; a lone `×` card never fires.
- `×` multiplies only the Bonus built so far in that firing, and is not itself a card that Adds.
- A Use is spent when the card's action succeeds, even if the meter is already full.
- The pickup's own fuel goes in first; the Bonus fills what room is left.
- Encore fires the row once more from the left, starting the Bonus at zero; Uses already spent stay spent.

## Order of work

1. `v1.0-cardflow` preview (in progress) — the heart of it.
2. `v1.0-words` applied inside that preview so the vocabulary can be judged in context.
3. `v1.0-deck`, `v1.0-flightcue`, `v1.0-term` previews.
4. After approvals: implementation in the game, the tutorial lesson folded into the Edition 4 plan (`docs/tutorial-redesign-proposal.md`).
