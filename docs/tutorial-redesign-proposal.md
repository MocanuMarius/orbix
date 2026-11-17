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

## Edition 4 brief — decided by the user, 17 November 2026

The user's instruction: the tutorial must be "spread thinner", use "real life courses, not just some episodes", let the player "meet and learn all concepts gradually, including card arrangements, black holes, and main mechanics like luminance, proximity, shield from companion", in "an order that makes sense… first we learn movement, then we learn energy", with "some spread between lessons so it's not a constant barrage of info boxes… those levels need to be constructed accordingly… around 5 minutes in total".

Requirements:
- **Length:** about five minutes of play in total.
- **Real courses:** each stop is a real, authored course in a real location (different biomes), built so the thing being taught appears where the lesson needs it. Not isolated test rooms.
- **Order, simple to complex** (one idea at a time):
  1. Movement: Lift and glide.
  2. Energy: Sparks, the Spark Meter, what a Lift costs.
  3. Collector: what it is and what it looks like first, then fetching and delivery.
  4. Light: Luminance (how far you see), Flash, then Proximity (skim an edge to send a Pulse).
  5. Cards: arranging the Chain (order, Triggers, Play) at a camp, then a flight that uses it.
  6. Danger: Black Holes, hearts and retry, and the companion's shield (Collector saving you).
  7. A short finish that puts it together, then the real starting card.
- **Pacing rules** (hard): every lesson happens with the game stopped; one concept per lesson, two short sentences at most, then practice of exactly that; no more than two lesson stops in a flight; at least about twelve seconds of free flying between stops; nothing is explained before the player has seen it; nothing taught earlier is repeated.
- **Course construction:** quiet opening seconds in every course; the taught element placed alone, with room to try it twice; difficulty rises only after the lesson; each course ends with a short stretch using what was just learned.
- Keep: practice isolation and loaned cards, Skip once / Remember & skip, the explicit "Practice complete → choose your starting card" step, glossary access, existing saves finishing their own edition.

## Edition 4 — built design

Status: **built 17 November 2026** (worker, to the brief above). Seven stops: six real courses and one camp. Times are simulated seconds after "Tap to begin" at the normal forward speed (154 px/s), for a player who reads normally and does not fail. "Seen" means the taught thing is on screen before its lesson opens.

How a stop works: an **entry lesson** opens on the frozen first frame, before the first Lift, and is closed with its own button; the normal "Tap to begin" gate follows. An **in-flight lesson** opens only when the trigger is met, the projection says a one-second stop is safe, and at least 12 s of free flight have passed since the flight started or since the previous stop; the game pauses first, then the coach card appears, and play resumes only through the card's button and the immediate 0.1× → 1× ramp (no 3-2-1 in practice). Each course is the real catalog course (its terrain polygons, art and exit), made calmer by the practice hooks: obstacle gaps are widened before the lesson point, the course's own pickups, drafts, biome actors and Black Holes are removed, and the stop's own pickups are placed on the free band of the real terrain.

| # | Stop | Location (biome · course) | Flight | Lessons (title — text; trigger; then practise) | Loaned | Budget |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First Light | Moonlit Ruins · Roofless Courtyard | ~26 s | **Entry · Lift and glide** — "Tap to Lift your wisp. Let go to glide down." Then: no Sparks for the first ~13 s, only broad open courts. **In flight · Sparks** — "Touch Sparks to fill your Spark Meter. Each Lift costs 3 Sparks." Trigger: first Spark cluster on screen, t ≥ 12 s. Then two Spark lines and a closing line to the exit. | nothing | 26 s + 2 × 4 s reading + 6 s map/entry = **40 s** |
| 2 | Meet Collector | Lantern Marsh · Reed Channel | ~28 s | **Entry · Meet Collector** — "The green light circling you is Collector, your companion. It flies wherever you fly." Collector does not fetch until the staged stretch (t ≥ 12 s), so it is seen before any rule. **In flight · Collector fetches** — "Collector catches Sparks you miss and reels them back. They count when they reach you." Trigger: Collector has grabbed a staged miss (a Spark nudged 45 px off the wisp's path), t ≥ 12 s; the stop happens mid-reel and the delivery follows on resume. Then more off-path Sparks for Collector. | nothing | 28 + 8 + 6 = **42 s** |
| 3 | Luminance | Mourning Fields · The Grave Road | ~26 s | **Entry · Luminance** — "The glow around your wisp is Luminance. It shows how far you can see." **In flight · Flash** — "This white triangle is a Flash. Catch it to light the way for a few seconds." Trigger: the Flash is on screen and lit, t ≥ 12 s. A second Flash follows ~7 s later. | nothing | 26 + 8 + 6 = **40 s** |
| 4 | Proximity | Glasswind Dunes · Dune Trough | ~26 s | No entry lesson. **In flight · Proximity** — "Skim close to rock without touching it to fill this meter. Full, it sends a Pulse that lights the way." Trigger: the first skim lane (Sparks hugging a real dune floor, ~20–34 px of clearance, about 4 s long with short breaks Proximity bridges) is on screen, t ≥ 12 s. Two skim lanes with ordinary Sparks between them, then the exit. Floors only: a roof lane would ask the player to Lift toward rock. | Proximity (practice ability, not a card) from this stop on | 26 + 4 + 6 = **36 s** |
| 5 | Arrange your Chain | Camp (Oldgrowth Pines scenery) | — | **Your Chain** (camp screen, paused by nature) — "These loaned cards are your Chain. When a card's Trigger happens, the cards fire from left to right." Then the Chain tab opens with the cards in a deliberately weak order. **Crescendo** (on the Chain tab, pointing at Slot 1) — "Crescendo doubles the cards to its left, so in Slot 1 it does nothing. Drag it to Slot 3, then press Play." The player drags or Swaps once; the plates and the Play result change from +2 to +4 Sparks on Collect. | Crescendo (×2 Boost), Body Spark +2 (Collect), Courier Tip +2 (Delivery); reorderable, never meltable, gone when practice ends | 2 × 4 s + ~15 s arranging + 4 s = **27 s** |
| 6 | Chain in flight · Black Hole | Cloudbreak Isles · Sky Islands | ~28 s | No entry lesson: the first ~14 s use the Chain (Collect on every Spark, Delivery from off-path Sparks Collector fetches; the card strip lights without words). **In flight · Black Hole** — "This Black Hole drains Sparks while you are near it. Fly wide around it." Trigger: the first Black Hole on screen, t ≥ 12 s. Two Black Holes, each with a wide Spark-marked bypass. | the Chain from stop 5; Proximity | 28 + 4 + 6 = **38 s** |
| 7 | Last Light (finish) | Oldgrowth Pines · High Boughs | ~28 s | **Entry · Hearts** — "Hearts are your tries in a real run: a crash costs one. In practice a crash only restarts the passage." **In flight · Collector's shield** — "Collector shielded you from that crash. It can save you once, then needs time to recover." Trigger: a staged falling pine cone reaches the wisp at t ≈ 13 s while Collector is home and charged; the save happens first, the stop follows. The last ~12 s put it together: Sparks, a skim edge, a Flash and one small Black Hole, then the refuge and **Practice complete → choose your starting card**. | the Chain; Proximity; Collector shield (practice ability) | 28 + 8 + 6 = **42 s** |

Totals: 6 flights ≈ 162 s; 12 lessons × 4 s = 48 s; camp arranging ≈ 15 s; map, entry gates and clear screens ≈ 40 s; six resume ramps ≈ 8 s. **≈ 4 min 33 s**, within "about five minutes".

Measured (17 November 2026, `scripts/edition4-playthrough-probe.mjs`, headless Chrome at 900×405 and 667×300, no failures, timeline in `outputs/tutorial/edition4-timeline.json`): flights 26.4 / 29.6 / 27.0 / 27.1 / 30.1 / 29.7 s, 169.8 s in all; in-flight stops at 12.0 s (Sparks), 14.5 s (Collector fetches), 12.0 s (Flash), 12.0 s (Proximity), 14.8 s (Black Hole), 14.7 s (Collector's shield); at most two stops per flight; at least 12.0 s of free flight before every in-flight stop and at least 14.4 s after it; flights plus 12 lessons at 4 s each = 217.8 s, about 4.5 minutes with camp arranging and map screens included. No lesson text was visible in any frame where simulated time advanced, no event banner text appeared, and there were no console errors or failed requests. Delayed-input pilots (`scripts/practice-pilot.mjs`): human250 and human150 each cleared every course in 5 of 5 seeds, both stop by stop and chained through the whole practice.

Rules checked by tests: at most two lesson stops per flight (entry counts as one); no in-flight stop before 12 s of free flight, and at least 12 s between stops; every lesson pauses the simulation; one idea per lesson, at most two sentences; no hint queue, no checkpoint repeats, no event-banner text in flight.

Decisions taken while building:
- **Saves.** `PRACTICE_EDITION = 4`. A saved Edition 3 practice in progress **finishes as Edition 3** (its map, lessons and early Rhythm + Harvest pair are kept only for that); "Practice again" and every new practice start Edition 4. Edition 2 and older still restart cleanly. A real run suspended behind practice is restored exactly as before.
- **Removed from the first flight:** the Rhythm + Resonant Harvest pair (`first-light-combo.mjs`) and the loaned Lift Guide. Cards now come at stop 5. `first-light-combo.mjs` stays only for unfinished Edition 3 saves and can be deleted in a later release.
- **Guardian.** The Hollow Warden finale is not part of Edition 4; the brief asks for a short finish, and the guardian is taught by the real game's own briefing.
- **Proximity and the shield are practice abilities, not cards**, so the camp Chain stays at three cards whose order matters.
