# Offer odds: Proximity and the "melting ground" skill

Measured with `scripts/balance/offer-odds.mjs` (6,000 simulated card runs, the real `drawSkillCardDraft` and `drawForgeCard`).
Assumptions: 3 maps per run, 7 flight drafts per map (5 normal, 1 elite, the guardian) = 21 drafts and 63 offers per run (route recipes in `dist/model.mjs` `CARD_ROUTE_RECIPES`); the player takes one of the three offers at random and keeps it, so the owned-card weighting, the Growth Seed safeguard and the Lantern Lens pity behave as in play. The actual elite count varies with the route taken.

## 1. Proximity (`slip-feather`)

Result: offered at least once in **52.6% of runs**, **1.16% of individual offers**, rank **36 of 84** from least offered (a typical Common: other weight-1 Commons sit at 52-53%).

Sources, with weight for `slip-feather`:
| Source | Can it come? | Weight |
|---|---|---|
| Starting choice (`getCardStarterOffers`) | No. `excludeStarter: true`; the v3 pool is a fixed six Commons plus three Rares (`starterCommonIds`, `starterRareIds`, skill-cards.mjs:615-616). | 0 |
| Flight draft (3 offers per cleared flight, `drawSkillCardDraft`) | Yes, only as a Common. Rarity roll per offer: normal 83/15/2, elite 55/32/13, guardian 35/47/18 (`CARD_DROP_WEIGHTS`). Inside Common the pool is 46 cards, total weight 51 (Growth Seed Common counts 6, all others 1), so 1/51 = 1.96% of Common offers. Never seen offers are not tracked; names already in the draft are excluded. | 1 of 51 within Common |
| Draft context slot (one of slots 2 and 3) | Multiplier x1 for Proximity (only copy/doubler/refrain style cards get x1.5 to x4), so no boost. | x1 |
| Forge, Rest (`drawForgeCard`) | Only the Common forge (15 Sparks), and the hidden card skips cards you own. About 1.9% per Common forge. Rare and Legendary forges cannot give it. | 1 of 51 (x1) |
| Chests / treasure | Not a card. Chests give skills and artifacts; one chest reward is "A surface whisper: Learn Proximity" (the native skill `proximity-awakening`, `chest-rewards.mjs:28`). It is not the card. Whether card runs show that chest was not verified. | n/a |
| Events | No card grants found in model.mjs event effects. | 0 |
| Evolve | `slip-feather` has no `evolvesTo`. `edge-reach` is a separate Rare drawn from the Rare pool; it is not an evolution of Proximity. | 0 |
| Practice (First Light / Rest preview) | Loaned (`loanPracticeCards`), not owned. | n/a |

Gates: none beyond the starter exclusion. `cardProximityUnlocked` (skill-cards.mjs:1187, set at :1231 when a mounted card has `kind: 'proximity'`) only decides whether the Proximity Pulse mechanic works (`model.mjs:1825`, `edging-pulse.mjs:173`, `route-bonuses.mjs:78`). It does not affect whether the card is offered. No map or ascension condition, no "already has ability" filter.

Why the owner has not seen it: pure dilution, not a gate or a bug. Per draft the chance of seeing Proximity is about 3.4% (3 offers, 1.16% each); one full run has about a 1-in-2 chance, so a typical player misses it in about half of all runs. Elite and guardian drafts roll Rare or Legendary more often, which pushes Commons out further.

## Least-offered cards (chance to be offered at least once per run)
All 15 are Legendary or Rare. The least-offered Commons are the weight-1 ones at about 52%.

| # | card | rarity | weight | offered >=1x per run | per offer |
|---|---|---|---|---|---|
| 1 | Growth Seed (growth-seed-legendary) | legendary | 1 | 18.0% | 0.31% |
| 2 | Spillway II (spillway-ii) | legendary | 1 | 19.2% | 0.34% |
| 3 | Tight Packing III (tight-packing-iii) | legendary | 1 | 19.8% | 0.35% |
| 4 | Ring Spring II (ring-spring-ii) | legendary | 1 | 20.9% | 0.37% |
| 5 | Resonant Harvest (harvest-legendary) | legendary | 1 | 20.9% | 0.37% |
| 6 | Dusk Wick III (dusk-wick-iii) | legendary | 1 | 21.3% | 0.38% |
| 7 | Downbeat III (downbeat-iii) | legendary | 1 | 22.1% | 0.40% |
| 8 | Courier Tip III (courier-tip-iii) | legendary | 1 | 22.4% | 0.40% |
| 9 | Last Light (last-light) | legendary | 1 | 22.4% | 0.40% |
| 10 | Second Sun (second-sun) | legendary | 1 | 27.4% | 0.49% |
| 11 | Prism Lens II (prism-lens-ii) | legendary | 1 | 27.6% | 0.50% |
| 12 | Kindling Bead III (kindling-bead-iii) | legendary | 1 | 27.6% | 0.51% |
| 13 | Echo III (echo-iii) | legendary | 1 | 29.0% | 0.53% |
| 14 | Refrain (refrain) | legendary | 1 | 29.6% | 0.54% |
| 15 | Growth Seed (growth-seed) | rare | 1 | 35.0% | 0.67% |

Full 84-card table: `outputs/balance/offer-odds.table.txt` (regenerate with `node scripts/balance/offer-odds.mjs 6000 --write`).

## 2. "The skill that was melting ground"

No card melts or burns ground. Candidates:
- **Spacetime** (the best match): a legacy-tree Proximity skill, `proximity-spacetime`, `dist/proximity-skills.mjs:11` and `dist/model.mjs:1783` (`m.spacetime`), implemented in `dist/spacetime.mjs`. "Skimming an ordinary bank bends a broad, shallow dent ahead of you. The real floor or roof yields by up to a third of your body width, then settles behind you." The floor moves; it does not melt. It exists only in the older skill-tree mode (not a card in the catalog; not in card chests, which list a fixed set of skills that excludes it). Release note: docs/first-light-release.md:23, BACKLOG.md:159.
- **Frostbound Reach "thaw" biome**: `dist/biomes.mjs:5,31`. "Your light melts hanging ice into falling shards." This is the only literal terrain melting, a biome hazard for every run, not a skill.
- **Rest "Melt"** (`meltMountedCard`, `model.mjs:672`) melts cards for Stored Sparks, and the Forge / furnace-style ceremony. These are likely sources of the "melting" memory.
Nothing named Basalt Furnace exists in the code or docs (no match for basalt, furnace, lava, molten, scorch, carve, dissolve).

## Options (not implemented)
1. **Unseen first.** Each draft guarantees one Common (or the lowest tier it already rolled) from cards the player has never been offered this run; pick uniformly from them. Needs a per-run "offered ids" set. No new UI.
2. **Weight up the unseen.** Multiply the draft weight of any card not yet offered this run by 3 (and keep weight 1 once seen). Proximity's per-run chance would rise noticeably (not measured) without any guarantee.
3. **Seen tracker in the Collection.** Mark each card "Seen" or "Not yet seen" with a lifetime count, so the owner can tell which cards they have not met; pair with option 2 for the lifetime profile. Purely informational.
