# Wispbound

A landscape, one-handed pixel flight roguelite. The static game lives in `dist/` and uses a custom Canvas simulation and cached renderer. No build step or runtime framework dependency.

## Current release: balanced-sparks-1

[Play on your phone](https://mocanumarius.github.io/orbix/?v=balanced-sparks-1) · [900 × 405 sidebar preview](https://mocanumarius.github.io/orbix/preview.html?v=balanced-sparks-1)

Run `npm start` to serve the game at localhost:4173. The phone link fills the device; `preview.html` keeps landscape proportions inside a narrow browser panel.

## Balance pass

See [the balance report](docs/balance-2026-11-13.md) for matched economy scenarios, artifact tradeoffs, route audits, sources and major design concerns. Updated scripts model whole-Spark Lift costs, landscape geometry, six-second Dreams and current artifact charges. These are diagnostic models, not measured human win rates.

- Gentler escalating skill prices; Spark Wick keeps its charges at full Sparks.
- Glass Lantern: +4 Sparks per natural fuel pickup, +1 per paid Lift.
- Heavy Light: +24 Sparks now versus +12 safely; the first 12 paid Lifts cost +1.
- Quiet Cinder is excluded from rewards when Lift already costs one. TEST mounting stays unrestricted.

## Clear Sparks update

- Default URLs launch the normal game. Add `?mock=rest` for an isolated Rest preview, or toggle **Rest Preview** in the menu. This also works on the deployed game and the landscape wrapper. Preview changes never overwrite the normal run save.
- Distinct Silkscreen numeric glyphs, larger standardized choice/outcome typography, and readable current/max Sparks at Rest. Font source: [Google Fonts Silkscreen](https://fonts.google.com/specimen/Silkscreen); the OFL license is bundled beside the font.
- Base Lift costs **3 Sparks**; ordinary pickup layers restore **6 / 12 / 18**. Effort upgrades use whole costs (**3 → 2 → 1**), with a minimum of one. Each 4px meter cell is one paid Lift, including during temporary free-Lift effects. Capacity upgrades match in menus and flight.
- Circular inverse-square-style lighting retains faint silhouettes near twice the bright radius and becomes black at three radii. The sampled mask is cached, with the same falloff used for pickups and fallback rendering.
- Quiet flight header. Larger artifact buttons pause to show their effect and remaining uses; Resume and Escape use the existing three-second 0.1× → 1× ramp.
- Verified 48 screen/viewport combinations across six actual CSS landscape sizes, plus Rest click transitions and artifact pause/resume. These are layout and behavior checks, not a physical Pixel 10 FPS result.

## Living Choices update

Pickup terminology is unified: Spark, Spark Cluster, Spark Cache, Charge Spark, Flash Spark, Dusk Spark and Dark Spark. Flight energy is Sparks, shown in the Spark meter. Packed Light remains run upgrade currency. Internal save/model identifiers retain their previous names. Menu icons now share 24px action / 22px resource / 32px item sizes, with landscape exceptions for the smallest screens and accessible labels.

- Rest shows current/max Sparks and four illustrated alternatives when applicable: grow capacity by 3 and refill (up to three blessings), take 25/50/75 Packed Light by map, recharge one copy of uses on each mounted consumable, or refill hearts. Choose once, then use Skills, Companions, Artifacts/Forge or Dream.
- Dream starts at 6 seconds; its duration upgrades reach 8 and 10 seconds.
- All 26 artifacts have unique pixel icons. Common is grey, Rare green, Legendary purple. Consumables show three copy squares; a fourth earned copy melts for 25 Packed Light. Reward pools exclude incompatible companion artifacts and unlearned skill/Dream prerequisites; TEST mounting remains unrestricted.
- Baseline bright radius is 145 with a faint falloff out to three times that radius. Reveal effects and sight upgrades retain their purpose. Collector boundary matches its green orb, at lower opacity.
- Spark Caches restore 18 displayed Sparks before bonuses, with unchanged contact radius and placement frequency.
- Compact settings, colored confirmation/cancel/Forge buttons, fixed landscape footers, and a six-size landscape UI audit. The normal local game is `http://localhost:4180/`; `?mock=rest` opts into the separate fixture.

## Previous gameplay batch

- **Minimal HUD:** each paid Lift is one 4 × 4 pixel cell with a 1 px gap. No visible fuel labels or numbers. The Edging meter is equally slim. Overflow uses exactly two small, short-lived pixel particles near Packed Light. Lift and menu controls have clearer contrast and compact symbols.
- **Pickup art:** six accelerating, shrinking absorption orbits; the contact shell collapses on capture. Interactive scenery has pixel rims that distinguish ready, spent and dangerous states before the normal darkness pass.
- **Artifact stacks:** earned duplicate Glow Wicks or Flash Stones add uses in the existing slot, up to 9 or 6 uses. Fourth copies automatically melt for 25 Packed Light. Moving slots, TEST, reloads and failed attempts cannot refill them; Rest can explicitly recharge mounted consumables. Forge consumes the entire stack for one payout.
- **Defining artifact:** the first flight offers Wayward Seed. Every third consecutive body fuel pickup restores 1 Glow; Collector deliveries reset the chain. After Map 1, a mounted Seed evolves in the same slot into Hearth Bloom (+3 Glow) or Lantern Bloom (1.5-second reveal). Five triggers per flight; restoration cannot create currency. The ordinary map reward still follows.
- **Regenerative Falling:** an exclusive Light-tree branch trades Edging reveals for +1 missing Glow, at most eight times per flight. Two-second recovery; no pickup triggers or Packed Light farming.
- **Contextual events:** Pilgrim’s Vow rewards clearing the next attempted flight with four body fuel pickups. Surveyor’s Cairn grants sight or draft preparation if you commit to a real exit. Both preview their consequences; failure consumes the promise/preparation and reopens a marked fork.
- **Authored flight forks:** eligible terrain sections offer an intact open fuel lane and a tighter optional cache passage, selected through positioning. Placement is guarded by actual collision geometry and skips unsuitable sections.
- **Music:** Lantern Drift is an original seven-minute ambient score with evolving keys, pads, bells and soft percussion. One pre-rendered audio stream keeps synthesis off the gameplay thread. MUSIC and FX have separate persistent menu toggles. Music starts after interaction and pauses when the page is hidden.

## Current rules

Three branching maps form a run. New Game, Continue, Tutorial and Abandon are separate. Unshielded collisions end an attempt; zero Glow prevents Lift but lets you fall and potentially recover. Lives can be restored at Rest and their cap upgraded in the run.

Collector, Protector, Runner and Space Timer are the four base companions. The home page shows locks and the next unlock; TEST permits selection. Companions and run skills are managed at checkpoints. Space Timer supports held levitation. Flight remains one-handed with Lift and a single contextual Power control.

Glow is the only resource family: natural pickups fill a baseline 30-point meter; surplus becomes whole **Packed Light** for run skills. There is no Ember currency or Afterglow fuel reserve. New runs receive one free root and 8 Packed Light; prices rise as the build grows. Failed attempts cannot bank provisional flight earnings. Generated recovery cannot mint currency.

Artifacts activate automatically. Rewards offer an artifact or a finite Glow offering; previews state the exact replacement or stack result. Ordinary offers have a 15% chance of a rare in the pair, or 25% after the optional challenge. Elites guarantee a rare; finales and bosses use their special tiers. Forge unwanted owned artifacts at shelters/events for 25/35/50 Packed Light (common/rare/boss), separately from fuel and heart recovery. TEST catalog artifacts cannot be forged for income.

Twelve shuffled biomes have four authored courses each, with real scenery colliders, local drafts, interactive props, dark packets and inverse-square-draining Black Holes. Light has a circular physical-style falloff. Edging near terrain accumulates a five-second reveal pulse unless its regeneration branch is chosen. Dream rehearsals can save an opening path without farming run resources.

Panels pause flight. Resume rises linearly from 0.1× to 1× over three seconds, with a central speed indicator. Death disintegrates over two seconds; completion lights the scene over 1.5 seconds. Old Dream recordings are invalidated when simulation rules change.

## Verification and limits

Focused checks cover artifact charges/evolutions, event transactions, Edging, forks and Dream/resource isolation. Browser review uses landscape layouts, including the fixed sidebar preview. See [the current backlog audit](docs/backlog-current.md).

The earlier [economy report](docs/condensed-glow-balance.md) is historical scenario analysis, not certification of this expanded batch. Actual Pixel 10 hitch traces and a current full-campaign human-style balance pass remain open. Desktop checks cannot establish phone 60 FPS. Older generic tests contain superseded prototype rules; do not treat them as current balance specifications.

`DECISIONS.md` and `docs/request-audit.md` retain chronological development history. Later entries supersede older phoenix, Ember, Afterglow and six-companion designs. Original audio can be regenerated with `scripts/compose-music.py` (NumPy plus ffmpeg); the game itself needs neither.

## Local Rest inspector

Run `npm run preview:rest`. Normal game: `http://localhost:4180/`. Mock Rest: `http://localhost:4180/?mock=rest`. Fixed 900×405 sidebar preview: `http://localhost:4180/preview.html` (add `?mock=rest` for the same mock).

The isolated fixture starts with 18/30 Sparks, 2/4 hearts, 180 Packed Light, three artifacts and Dream unlocked. Purchases, forging, companion changes and rehearsals work in memory; refresh resets it. The menu's Rest Preview toggle enters/exits the mock. Internal `/rest-scene.html?scenario=...` routes remain local layout fixtures and are never the default route.

Visual tutorial vocabulary now reuses actual Spark, meter, Packed Light, companion, artifact, Dream and map-site art. One contextual concept is introduced at a time, with short text and existing safe 0.1x-to-1x resume. Rest coach targets were corrected to the new benefit cards/preparation tools. Single-step hints omit the disabled Back action. Previewed at 900x405 and 844x320 without overflow.
