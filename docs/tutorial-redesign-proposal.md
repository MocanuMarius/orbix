# Tutorial redesign proposal — Edition 4 (concept-first, stop-and-teach)

Status: **proposal for user review, 16 November 2026. Nothing here is implemented.** Prepared by the coordinator against the live Edition 3 code (`dist/tutorial-curriculum.mjs`, `dist/tutorial-steps.mjs`, `dist/practice-route.mjs`, `dist/tutorial-coach.mjs`). Addresses the P1 feedback in `handoff.md`:

> we should not show things that you have to read as you play, ever… we should just stop the game and display interactive popups, with videos, with definition of concepts… i see the tutorial talking about the collector without even first presenting what it is

## The three rules this design follows

1. **Never require reading while flying.** Every lesson happens with the simulation fully stopped. The player resumes explicitly, through the existing frozen 3-2-1 countdown and 0.1×→1× ramp, which already cannot spend a Lift.
2. **Concept → paused demonstration → practice.** A mechanic is named and shown (what it is, what it looks like) before any rule about using it. Collector is introduced as "this green orb that travels with you" with a video of it fetching, *before* any fetch/delivery/recovery rule.
3. **Show, don't describe.** Each popup leads with a short real-gameplay video clip (muted, looping, reduced-motion fallback = labelled still frames from the same capture), then one or two sentences of definition with the standard dotted-underline glossary terms. No decorative approximations.

## What changes vs Edition 3

| Edition 3 today | Edition 4 proposal |
| --- | --- |
| Checkpoint "chapters" of 3–8 text steps (`tutorial-curriculum.mjs`) | Short paused **lesson popups**: one video + ≤2 sentences + one optional "Try it" |
| `observedFlightLesson` queues lessons noticed during flight; some hints still reach the player mid-flight via quiet-input/projection windows | Observations only **queue**; everything is taught at a full stop. The in-flight channel is reduced to non-reading cues (the existing icons/arrows), never sentences |
| Collector topic opens with fetch eligibility ("Automatic helper… No Power press is needed") | New **Meet Collector** lesson first: identity, look, that it is green and orbits you — then first body opportunity, then fetching, each at separate stops |
| Seven stops, teaching order driven by map structure | Stops re-derived from the teaching order below; count is an outcome, not a constraint (current guess: 6 stops + guardian concept) |

## Proposed teaching order (one concept per paused lesson)

1. **You are the wisp / Lift & glide** — pre-flight, paused. Video: a Lift and a glide. Practice stop 1 is pure flying, no pickups, generous terrain.
2. **Sparks and the meter** — paused popup before stop 2's first Spark cluster. Video: Spark touch → meter fills → Lift spends. Practice: collect and spend.
3. **Luminance ≠ fuel** — paused at the first darker stretch. Video: light radius fading with distance. (Dusk/Dark Sparks deferred to a later stop — hazard rules come after the positive loop is solid.)
4. **Meet Collector** — paused, flight stopped the first time Collector is visible. Video A: "this is Collector" (identity, orbit). Resume. Next stop, after the player passes a deliberately-unreachable Spark, stop again → Video B: fetch → tether → reel → delivery. Practice: one staged miss (the existing production-probe staging pattern).
5. **Camp, cards and loans** — at the practice camp, paused by nature. Video: equipping a loaned card; explicit "these are loans — your real run starts fresh with its own starting draft" line (also supports the P0 fix).
6. **Routes, forks and committing** — on the map, already paused. Video: choosing a fork, dim vs bright nodes.
7. **Hazards: Black Hole** — paused before the authored Black Hole stretch. Video: drain spiral, wide bypass.
8. **Hearts, death and retry** — taught at the first real failure (already checkpoint-paused today) or, if the player never fails, folded into the guardian briefing.
9. **Guardian concept** — in the final briefing, paused. Video: telegraphed pattern, survive-and-reach-the-exit.

Glossary, Field Guide replay, Skip once, Remember & skip, Reset tutorial, and practice/save isolation all stay exactly as they are.

## Mechanics of a lesson popup

- Trigger points reuse `checkpointTutorialLesson`'s screens plus **flight-stop triggers**: entering a lesson zone sets the same safe-pause path the MENU pause uses (existing controller infrastructure; slow-motion contextual gates stay as a safety net, not a teaching surface).
- Popup layout: video (16:9, ≤8 s loop) on top, title, ≤2 sentences, glossary terms clickable with the standard return-to-origin behavior, one primary **Continue** (and **Try it** where practice follows). 44×44 targets, landscape-safe at 900×405 down to 640×320.
- Videos are real captures made with the existing probe/capture tooling (same pipeline as the Collector tow/production probes), stored under `dist/assets/help/`, muted, and **added to the offline graph** — the release manifest must include every clip (see the release trap in handoff §4).
- Reduced motion: poster frame + the same text; no autoplaying motion.

## Open decisions for the user

1. **Stop count**: keep seven practice stops and re-map lessons onto them, or trim to six (drop the rhythm/Harvest stop, teach it contextually in the real game)?
2. **Video budget**: ~9 clips at ≤8 s. Produce all up front, or ship text-first popups and add clips incrementally?
3. **Dusk/Dark Sparks**: teach inside the tutorial (one more stop) or leave to the first real-game encounter popup?
4. **Loans screen wording**: does the explicit "loans vs real starting draft" line above match your intent for the P0 flow?

## Non-goals

No change to practice isolation (`isTutorial`, `practiceCardRun`), save schema, Edition gating for existing saves (Edition 3 runs finish as Edition 3), economy, or art style. No global pixelation or framework additions.
