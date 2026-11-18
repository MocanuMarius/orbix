# Inscription glyph audit (2026-11-18)

Every place that draws an Inscription glyph (`inscriptionGlyph()` in `dist/inscription-glyphs.mjs`, or the files in
`dist/assets/ui/inscriptions/`), checked at 890×400, 915×412 and 740×333 with `node scripts/glyph-audit.mjs`
(headless Chrome, throwaway profile, mock runs only). Screenshots and the machine checks: `outputs/glyph-audit/` (`report.json`).
The script checks: glyph drawn at a whole multiple of its grid, square, on screen, not clipped; slot brand overlapping the card's
parts (eye button, NEW badge, name, chip, label, Add); counter over the glyph; page or inner scrolling; buttons cut off or under 40 px.

Glyphs are now 24×24 in two tones (see `docs/inscriptions.md`, "Marks"). One size per role, pinned by CSS in
`dist/artifact-reward.css` ("One size per glyph role"): list 24, large 48, huge 72, brand 26, brandLarge 52.

| Place | Size(s) now | Defect found | Cause (file:line before the fix) | Fixed? (what the last screenshots show) |
| --- | --- | --- | --- | --- |
| Chain slot brand, card in slot (3, 4, 5, 6 slots) | 26 (brand) | Eye button covers part of the brand on 5- and 6-slot Chains (up to 26×12 px) | eye centred in the eye row: `dist/ui/card-screens.css:281`; brand fixed at left 3 px | Yes: on narrow slots the eye moves to the right edge (40 px wide below 84 px); no overlap at any size |
| Chain slot brand with the NEW badge | 26 | NEW badge sits under the brand (both at the eye row's left) | `.dk2-eyerow>.dk2-new{left:2px}` `dist/ui/card-screens.css:628` | Yes: on an inscribed slot the badge moves right of the eye |
| Empty inscribed slot | 52 (26 on narrow slots) | Brand covers the Add plus and, on narrow slots, the "Add a card" words | brand box centred over the Add skin, `dist/ui/card-screens.css:612` | Yes: brand takes the plus's place at the top, words at the bottom (smaller on narrow slots) |
| Chain brand size | 26 | Old 16-grid marks drawn at 36 (2.25 per pixel of art, fine) and 18 on narrow slots | (redraw) | Yes: 24-grid at 1× (26 with the burned edge); 52 on empty slots |
| Temporary brand: dashed ring + flights counter | 26 | Counter covers the glyph's top-right corner | `.dk2-ins-count{right:0;top:0}` `dist/ui/card-screens.css` (Temporary block) | No: temporary Inscriptions are on hold (likely removed); left as is |
| Brand tooltip (tap a brand) | n/a | none found | | Checked: inside the screen, not over its slot |
| Inspector Inscription block | 24 (list) | old 32 / covered 16 not on the new grid | `dist/inscription-ui.mjs:43,45` | Yes: role list (24) |
| Inspector: covered permanent Inscription | 24 (list) | was 16 | `dist/inscription-ui.mjs:43` | Yes; covered mark shown (temporary only) |
| Glossary: Inscription entry list | 24 (list) | was 32 | `dist/card-terms.mjs:349` | Yes |
| Scribe "Choose an Inscription" (owner's screenshot) | 48 on offers | Three offer cards taller than the panel: Choose buttons cut off, inner scrollbar, hint under the cards; long kind sentences; linked words with icon gaps and boxes | `.scribe-choice{overflow:auto}` and 3 columns `dist/artifact-reward.css:71`; `.card-term-icon` inline-block `dist/card-ui.css:548` | Yes: replaced by the one-screen writer (2 offers, Card/Slot tags, one keyword line, no icons in links); nothing scrolls at the three sizes |
| Scribe "Choose a slot" / "Replace this Inscription?" | 24 / 48 | Replaces-line glyph forced to 16 px, then 20 px by a generic rule (fractional on the 24 grid) | `.scribe-slot-ins .ins-glyph{width:16px}` `dist/artifact-reward.css:95`; generic button-svg sizing | Yes: both screens replaced by the writer for permanent Inscriptions; role rules pin glyph sizes everywhere |
| Writer: nothing selected / offer + slot / replacing / 6 slots | 48 offers, 24 slot lines (24 chosen-aside in short landscape) | Title band grid made Write fill the band; slots collapsed; ribbons over Write; 740×333 content cut off | kit header rules on `.wbf-head`; indefinite section height | Yes: own compact band, definite height, short-landscape compaction; all states fit, no scrolling, buttons ≥ 40 px |
| Chest find (1 offer) | 48 / 24 | Separate slot and confirm screens; page scrolled 2 px at 740×333 | `temporaryWriteMarkup` permanent path; `#app` padding on the temporary screen | Yes: same writer with the find preselected; no scroll |
| Temporary slot screen and its confirm | 48 / 24 | 740×333: page scrolls 2 px and one slot box is cut off | old two-step Scribe styles | No: on hold with temporary Inscriptions (kept working, not polished) |
| Map Scribe stop icon (map, stop page, briefing art) | 48 (72 on the support page, 24 in small rows) | Sizes rounded to multiples of 16 and forced by generic stop-icon rules (64, 26×30, 28×30): fractional and not square | `dist/map-guide.mjs:72` (round to 16); `dist/queue-ui.css:134`, `dist/ui-contrast.css:168-189` | Yes for the shown sizes (CSS pins `svg.map-symbol-scribe` to 24/48/72). Remaining: `map-guide.mjs` still rounds to 16 and sets `--ui-size` to that (harmless: the glyph helper re-rounds) — file owned by the tutorial worker. Inside the scaled map picture it follows the map's own scale. |
| Flight preview: temporary effects list | 24 (list) | was 32 | `dist/inscription-ui.mjs:56` | Yes |
| In-flight Chain strip | no glyph | bars only | | Checked: unchanged (`tests/chain-strip.test.mjs` passes) |
| Deck tab | no glyph | none | | n/a |
| Tutorial Scribe lesson (First Light) | uses the writer | Texts say "three Inscriptions"; the practice lesson step `scribe-slot` assumes the old two steps | `dist/map-guide.mjs:18,61,62`, `dist/onboarding.mjs:119`, `dist/tutorial-curriculum.mjs:48,60,64`; `practiceSupportLesson(r, scribe.id?'scribe-slot':'scribe')` `dist/app.mjs:1305` | Not mine (tutorial worker): change "three" → "two", and the lesson to "pick an Inscription and a slot, then Write" |

Also fixed: the in-page checks found no glyph without a file (all 41 ids resolve, Sunlit uses id `flare`), no invisible glyph,
and no fractional glyph anywhere after the role rules. `tests/inscriptions.test.mjs` fails if a call site asks for a size that is
not a whole multiple, an unknown role, or an id without a glyph, or if a CSS rule gives a glyph a non-multiple size.
