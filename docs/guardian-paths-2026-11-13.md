# Guardian Paths implementation

## Shipped decisions
- Artifacts accumulate for the current run without equipment slots, replacements, or starting loadouts. Elite and intermediate guardian clears offer two, choose one. Ordinary clears pay 20 Packed Sparks plus natural overflow. Chests/events grant currency or fuel instead of artifacts.
- Both offered artifacts enter the run history, including the declined one. Consumed and melted artifacts stay in that history. Rest melting pays 25/35/50 and removes the effect once.
- Final guardian unlocks a legendary artifact for future reward pools, never starting power. When fewer locked legendary artifacts remain, only remaining unlocks are offered; a completed pool has no artificial duplicate reward.
- Six guardians: Hollow Warden, Moonweaver, Frost Matron, Rootbound Heart, Storm Shepherd, Hollow Sun. Seeded campaigns choose three without repeats. Attacks use the existing survival controls with warnings and open passage space.
- Short 45–70s, standard 80–110s and endurance 120–150s flights. Guardians last 90/120/150s by map. These are baseline moving durations, excluding pauses and speed modifiers. No fuel-capacity entry gate.
- Rest remains one scene after Recover or Grow. Both refill Sparks, Recover restores all missing hearts, Grow increases capacity by three displayed Sparks up to three times. Skills, companion, Collection/Melt and Dream remain optional.
- Five map marker families separate flights, Rest, threats, events and chests. Guardian portraits are distinct. Future stops are inspectable; only currently reachable stops offer Travel. Preview includes biome interactions, duration, challenge and reward.
- Old incompatible active runs retire with a notice; ascension, settings and tutorial knowledge remain.

## Checks
- 33 focused tests passed: reward transactions, 120 complete seeded campaigns across four companions, save/reload migration, no-repeat rewards, modifier bounds, Rest, tutorial, single companion and guardian mechanics.
- 606 guardian canvas smoke frames across six identities: no exceptions or nonfinite coordinates.
- Browser reviewed at 900×405 and 720×280: two-choice rewards and acquisition, Rest before/after, Collection, map, route preview and Frost Matron flight rendering. These are desktop viewport checks, not physical Pixel 10 performance certification.
- Full legacy test suite was not claimed: model.test.mjs still targets retired card/heart mechanics. The old economy script asserts no flat clear reward and is obsolete.

## Balance finding for deferred pricing work
36 transaction-only campaigns with cheapest eligible purchases, assuming 0/10/20 Packed Sparks overflow per clear, averaged about 16.08 flights and 2.92/3.50/4.00 paid upgrades. This misses the desired one paid upgrade per two flights. Broad skill pricing changes remain deferred as agreed. Next balance plan should separate reliable clear income from expert overflow, compare achievable build paths, and validate longer flights with imperfect human inputs. These simulations do not demonstrate human difficulty or optimal builds.

## Publication
Source: 1c8a4452e15609ee0b52805e2c26002c069205b5. Pages: 3a3d497997058e6ae4e5958714f25d728d18d3ec. Release: guardian-paths-1. Public manifest and three key module bytes verified; live home migration notice and Rest Grow flow inspected. Phone link: https://mocanumarius.github.io/orbix/?v=guardian-paths-1
