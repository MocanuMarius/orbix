# Menu audit (2026-11-18)

Re-run before every release: `node scripts/menu-audit.mjs` (about 15 minutes for all 5 sizes; options `--only name,prefix*`, `--sizes WxH,...`, `--quiet`). It opens each screen through the game's mock routes in a throwaway headless Chrome profile, writes `outputs/menu-audit/<screen>-<WxH>.png` and `results.json`, and measures: content clipped by its container or the viewport, text cut by its own box, tap targets under 40 px, controls under 6 px apart, overlapping controls, covered text, inner scrollbars (and nested ones), contrast under 4.5:1 (pixel-sampled), text under 11 px, missing accessible names, clickable non-buttons, selected-looking buttons without an aria state, dialogs without a name or focus, dialogs that ignore Escape, and infinite animations. `node scripts/lib/summarize-audit.mjs <log>` merges a console log into one line per finding; `node scripts/lib/fit-table.mjs` prints the fit table from `results.json`. `--probe '<selector>'` lists the CSS rules that style an element; `--eval '<js>'` prints a page expression.

Sizes: 890x400 (owner's phone), 915x412, 740x333, and the Pixel 10 browser tab with the toolbar showing: 924x308 and 870x280.
Screens: 38 (35 menu screens plus 3 card-reader variants). Not reachable by a route and left to their owners: Scribe, chest, temporary-Inscription and the tutorial lesson overlay.
Captures that failed (headless screenshot timed out three times): retry 890x400, rest-forge-preview 915x412 and 924x308.

## Fit per screen and size

"fits" = no clipping, no scrolling. "scrolls" = one scrolling area with header and primary button staying put, or an intended scroller (Deck grid, glossary list, map pan, ledger). "clipped" = content is cut and cannot be reached.

| screen | 890x400 | 915x412 | 740x333 | 924x308 | 870x280 |
|---|---|---|---|---|---|
| home | fits | fits | fits | fits | fits |
| settings | fits | fits | fits | fits | fits |
| settings-advanced | scrolls | scrolls | scrolls | scrolls | scrolls |
| help-field-guide | fits | fits | fits | fits | fits |
| help-glossary | scrolls (list) | scrolls | scrolls | scrolls | scrolls |
| help-glossary-term | fits | fits | scrolls | scrolls | scrolls |
| help-credits | fits | fits | fits | fits | fits |
| starting-card-choice | fits | fits | fits | fits | scrolls (Cache Handling text) |
| starting-card-confirm | fits | fits | scrolls | scrolls | scrolls |
| chain-tab | fits | fits | fits | fits | fits |
| deck-tab, filter menu, swap picker | fits (grid scrolls) | fits | scrolls | scrolls | scrolls |
| triggers-tab | scrolls | scrolls | scrolls | scrolls | scrolls |
| card reader (3 variants) | fits | fits | scrolls (text column, Close pinned) | same | same |
| map | pans | pans | pans | pans | pans |
| map-stop-page | fits | fits | fits | fits | fits |
| depart-panel | fits | fits | fits | not opened (mock flight failed to load, map shown) | not opened |
| pause-menu-map | fits | fits | fits | fits (two columns) | scrolls |
| pause-abandon-confirm, pause-settings, map-help | fits | fits | fits | fits | fits |
| map-clear | fits | fits | scrolls | scrolls | scrolls |
| retry | not captured | fits | scrolls | scrolls | scrolls |
| rest, rest-complete (other worker) | fits | fits | scrolls | fits | fits |
| rest-workshop (other worker) | clipped (heading 2 px) | clipped | scrolls | scrolls | scrolls |
| rest-forge-preview (other worker) | clipped (mystery label) | not captured | clipped | not captured | clipped |
| rest-forge-result (other worker) | fits | fits | fits | fits | fits |
| flight-summary, flight-summary-late | scrolls (ledger) | scrolls | scrolls | scrolls | scrolls |
| victory | fits | fits | scrolls | scrolls | scrolls |
| defeat-result | fits | fits | fits | scrolls | scrolls |
| death-light-fallen | fits | fits | scrolls | scrolls | scrolls |

At 924x308 and 870x280 every screen is usable apart from the Rest family (another worker's) and the depart panel, which the mock route could not open at those two sizes.

## Findings

Severity: **blocks** = cannot use, **broken** = looks broken, **untidy**.

| # | Sev | Screen · size | Defect | Cause (file:line) | Fixed? |
|---|---|---|---|---|---|
| 1 | broken | every card face, glossary, tips · all | Linked words drawn with a dark filled box ("censored text") | `dist/card-ui.css`: `html body dialog.wb-dlg button.card-term{background:#314a35!important}` (was line 1769, added by commit ab2c268e for glossary dialogs but it matched every card sheet); also `.card-term-hover` (1442), `.card-term-dialog .card-term` (1432), `.card-term-label`, `.combo-outcomes .card-term` (card-combos.css:41) | yes: sentence colour with a dotted underline only; `tests/card-links-and-faces.test.mjs` scans every style sheet for a background on linked words (menu lists such as the glossary list and the reward detail term buttons stay buttons) |
| 2 | broken | large card face · all | Trigger drawn twice (chip on the picture and first text line); dead green area; "6 uses" twice (badge and line) | `dist/card-ui.mjs` `faceBadges`, `redundantFaceNote`; layout `card-ui.css:529-533` (fixed 5:7 height) | yes: no chip on the large face (small tiles keep theirs), face height follows content, picture 48/96/144 px, uses badge bottom-left of the picture, gems bottom-right, effect text 14-18 px centred; v3 block at `card-ui.css:1795` |
| 3 | blocks | victory · all | Panel taller than the screen: header and Main menu cut, ribbons over "New best", cards huge and cropped, pale text on parchment, "+0 maximum Sparks" line | `dist/scorecard.css` 3-row grid inside `overflow:hidden`; `dist/card-ui.mjs:436` recap; pale colours from the dark card theme | yes: panel = viewport, body scrolls as one area with the header pinned (`scorecard.css:44`); final Chain as small tiles with Inscription brands and the trophy (`card-ui.mjs:432`, `card-ui.css:1826`); zero line removed; course names added from `run.mapHistory` |
| 4 | broken | every screen with the pixel font | "fi" and "fl" print as a capital A ("Arst", "Aight") | font ligatures; `dist/typography.css:56` | yes: ligatures off |
| 5 | blocks | card reader · 308/280 (Close also cut at 890x400 with an Inscription) | Close pushed off the bottom; the Rare badge and the status line sat on the tab bar (the "RE" blue box) | reader covered the whole sheet (`card-screens.css:195` inset 0) with a column of unbounded height | yes: reader starts below the tab bar (`deck-screen.mjs:640` `sizeFace`), column = scrolling body + pinned foot (`deck-screen.mjs:299`, `ui-contrast.css:210`) |
| 6 | broken | Chain/Deck tabs | Status sentence wrapped to two lines under the bar | `card-screens.css:49` line clamp 2-3 | yes: one line with ellipsis (`ui-contrast.css`) |
| 7 | untidy | Deck tab | "new cards" dot touched the Deck label | `card-screens.css:644` | yes: own space at the end of the tab |
| 8 | broken | all dialogs | Dialogs had no accessible name | `dist/app.mjs:877` `openSheet` | yes: named from the first heading |
| 9 | broken | pause menu · 870x280 | Title and bottom buttons cut | five stacked plaques | yes: two columns under 340 px height, then one scroll area |
| 10 | broken | starter row · 870x280 | Frame narrower than the card | card width from the cell, frame from the height | yes |
| 11 | untidy | Rest cards, field guide Back | Unavailable options faded to 2.9:1 | `forge-ceremony.css:12`, `rest-choices.css:59` | yes (Rest now belongs to another worker) |
| 12 | untidy | many | Gaps under 6 px (pause, settings, home, flight rewards, chips); 9-10 px captions (home, retry, uses badge, recap chips) | `waystone.css:166,224`, `home-commands.css:31,76-87`, `game.css:38`, `flight-reward-ceremony.css` | yes, except rows 15-17 |
| 13 | untidy | retry | Two buttons touching | `.compact-retry` | yes |
| 14 | untidy | flight summary | Detail "i" and Banked text 3.9-4.0:1 | `flight-reward-ceremony.css:37,68` | yes |
| 15 | untidy | deck tab, swap picker | Trigger chips 3.6:1 on dimmed tiles | `design-lab/deck.css` tile dimming | no |
| 16 | untidy | Triggers tab | Back button 5 px from the term row | `deck.css` `.tb-bar` | no |
| 17 | untidy | Deck tab | Tile and its eye button overlap (the tile is the whole row, the eye sits on it) | `deck.css:715-733` | no, by design; see "For the owner" |
| 18 | broken | Forge result (Rest worker) | Title looks smeared mid-ceremony | `forge-ceremony.css` | not mine; verify after the Rest redesign |

## Accessibility summary

Measured clean at every size: every button has a name, no clickable `div`s without a role, dialogs named and focused, Escape or a visible Back exists, no nested scrolling, tabs and filter controls carry `aria-selected` and `aria-expanded`. `node scripts/contrast-check.mjs` reports 0 low texts (it now ignores disabled controls, which WCAG exempts, and screen-reader-only text). Not checkable by script: the scorecard bakes its text into an image (it has a full alt text); colour-only cues on the Deck chips need a manual check; reduced motion: the audit lists about 465 infinite animations (map route flow, companion orbit, glints) but does not yet run with the reduced-motion setting (a `--reduced` flag is the next step).

## For the owner (design decisions, not defects)

1. The primary action sits in different places: Play bottom-left (Chain), Back to map top (pause), Continue bottom-right (rewards), New Game at the foot of the right column (result). Recommendation: one rule, bottom-right in a pinned foot everywhere.
2. Back is "Back", "Done", "Close" and "Back to map" on different screens. Recommendation: Back always at the left of the foot, Close only on dialogs.
3. Starter and reader cards at 870x280 cannot show a three-line effect without a small inner scroll. Recommendation: accept, or add a compact face without the picture under 300 px height.
4. The red and green header ribbons hang over the right end of several headers. Recommendation: keep them on home and result only.
5. The Deck eye button is a second target on a row-sized tile; a long press could free the row. Recommendation: keep and document.
6. The depart page is the only dark field note among parchment menus. Recommendation: confirm parchment as the rule.

## Install and fullscreen (what exists, unchanged)

- `dist/pwa.mjs` captures `beforeinstallprompt` silently and shows nothing by itself. Install is offered only in Settings, the "Install game / Play offline" plate (`dist/app.mjs` `installationLabel`).
- Fullscreen: `dist/landscape.mjs` `fullscreen()` (requestFullscreen plus a landscape lock) is reachable only from the portrait "rotate your phone" panel; `dist/desktop-host.mjs` has a desktop fullscreen button. In a normal landscape browser tab neither an install nor a fullscreen offer appears on first visit.

## Other workers' screens, seen but not touched

Scribe, chest and temporary-Inscription slot screens and the tutorial lesson overlay were not opened (no route in the list). The Chain tab Inscription brand button (`dk2-ins-brand`) is 36 px high (needs 40). Rest, Workshop and Forge are screenshot only: the Workshop and Forge headings clip 2 px at 890x400, the Forge mystery label clips at 740x333 and 870x280.

## Notes

One early `pkill chrome.exe` closed all Chrome processes, including the owner's own; the script now only closes the browser it launched.
