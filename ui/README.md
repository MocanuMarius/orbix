# Wispbound shared UI

Start with [the live component workshop](../components.html?family=collection&state=rest). The same relative link works from the deployed game. To inspect a component without the workshop controls, open [the native landscape preview](../components-preview.html?family=collection&state=rest).

The [Thorn Steeple Travel Guide](../components.html?family=route&state=wayfinder&viewport=low) uses a naturally generated, reachable Wayfinder stop and the production guide template. Back returns to its route; Ripe pods, More gentle Sparks, and Details disclose the actual rules. The duration stays in Details.

This folder is the shared entry point for game UI. Family modules export the **actual production renderers**, so changes appear in the game and in the workshop. Established root module paths remain compatible. Shared controls, relic comparison primitives, and Collection furniture live here and are used directly by production screens. Existing larger renderers retain the owners listed below; a facade is a route to that source, not a second implementation.

The [shared component design principles](#shared-component-design-principles) below are the canonical interaction and layout guidance for these families and the production screens that use them. Apply them when designing or reviewing a component, alongside the ownership and verification rules here.

## Entry points and ownership

| Family | Shared import | Production source and styling | Workshop states |
| --- | --- | --- | --- |
| Text, action buttons, delegated actions | `primitives.mjs` | `escapeHtml`, `actionAttributes`, `actionButton`; game button styles in `visual-system.css`, `viewport-layout.css` | Enabled, unavailable, selected, confirmation |
| Relic identity, effect, limit, Full rules | `relic-primitives.mjs` | Used by `collection-view.mjs` and `reward-screen.mjs`; class recipes retain existing production styles | Collection and reward states |
| Collection and relic rewards | `relics.mjs` | `collection-view.mjs`, `reward-screen.mjs`, `artifact-copy.mjs`, `replay-ui.mjs`; `artifact-collection.css`, `artifact-reward.css`, `artifact-detail.css` | Owned, Rest, confirm, empty, almanac; choice, acquired, clear |
| Reliquary furniture | `reliquary-art.mjs`, `reliquary.css` | Inline pixel niche, shelf backdrop, furnace; imported by the Collection owner | Collection and relic art |
| Cards and Deck | `cards.mjs` | `card-ui.mjs`, `card-terms.mjs`, `card-art.mjs`, `card-status.mjs`; `card-ui.css` | Equipped, reserve, reader, empty; live keyword and status help |
| Route, stop previews, campaign and bonuses | `route.mjs` | `landscape-map.mjs`, `flight-preview.mjs`, `map-guide.mjs`, `route-bonus-ui.mjs`, `campaign-ui.mjs`; `journey-art.css`, `level-map.css`, `flight-preview.css`, `route-bonus.css`, `campaign.css` | Start, progress, Thorn Steeple Wayfinder; reachable and future stop preview |
| Home, run checkpoint, companions, navigation icons | `menus.mjs` | `run-menu.mjs`, `menu-world.mjs`, `menu-icons.mjs`; `menu-art.css`, `home-commands.css`, `home-journey-ink.css`, `companion-picker.css`, `home-utilities.css`, `game-menu.css` | New and resumable expedition |
| HUD and flight controls | `hud.mjs` | `glow-ui.mjs`, `lives.mjs`, `edging-ui.mjs`, `afterglow-ui.mjs`, `boost-control.mjs`; `glow-ui.css`, `boost-control.css`, `game-symbols.css` | Ready, low Sparks, recovering, paused; accessible live meter updates |
| Full rules, earnings, guide and glossary | `dialogs.mjs` | `replay-ui.mjs`, `reward-screen.mjs`, `pickup-guide.mjs`, `card-terms.mjs`; `artifact-detail.css`, `pickup-guide.css`, `card-ui.css` | Relic, earnings, pickups, glossary |
| Shared visual language | `art.mjs` | Resource/Spark, pickup, companion, landmark, choice-scene and reliquary renderers | Resource and companion symbols; relics and furniture |

`index.mjs` exposes the families as namespaces for discoverability. Production code should use a narrow import, avoiding the cost of loading unrelated families:

```js
import {actionButton} from './ui/primitives.mjs?v=RELEASE';
import {relicRulesMarkup} from './ui/relic-primitives.mjs?v=RELEASE';
// From inside dist/ui, use ./primitives.mjs and ../model.mjs as appropriate.
```

`RELEASE` above is an example placeholder. In a real import, use the current release token already used by adjacent files. The release script stamps and verifies the graph.

## Adding or changing a component

1. Find the family and edit its actual source. Extract a repeated visual or control into this folder before making another copy. Keep model rules in the model and game-flow decisions in the controller; a markup renderer reads input and returns markup.
2. Preserve public exports, CSS classes, `data-action` names, expected data attributes, and accessibility semantics. Existing root entry paths are part of the game contract. Add a narrow family export when introducing a shared renderer.
3. Give the component explicit inputs for content and state. Avoid hidden reads from local storage, the live flight, or global app state. Use `escapeHtml` for text/attributes and `actionButton` for ordinary controls. `labelMarkup` and `icon` accept only trusted renderer output, never unescaped player text.
4. Add representative sample states to `gallery-catalog.mjs`, fixture data to `gallery-fixtures.mjs`, and a call to the real renderer in `gallery-preview.mjs`. Gallery-only layout belongs in `preview.css`; it must not restyle the production component. Keep all sample mutations in memory.
5. Put new component-owned CSS/art beside its renderer. Keep selectors scoped to the family. While legacy styles remain outside this folder, update their owner rather than writing a second gallery-only skin. The iframe loads production styles in exactly the order in `game.html`; update `components-preview.html` when that order changes.
6. Run the checks below and inspect the native screenshots. Update this owner map when moving an implementation. Include new runtime files in PWA release validation.

## Shared component design principles

These principles guide future component and screen work; they do not assert that every current screen already meets them. The [UI design research](../../docs/ui-design-research.md) records supporting sources and earlier reviews.

1. **Start with landscape thumb reach.** Design mobile-first for Pixel 10 landscape and a comfortable grip. Put frequent actions within easy thumb reach, keep their positions stable, and avoid flows that repeatedly require reaching across the screen. Respect safe areas and leave room between neighboring actions. Use the game's 900 × 405 logical landscape viewport, with 915 × 412 wide, 740 × 360 compact, 640 × 320 short, and 667 × 300 low checks. These are CSS viewports, not hardware pixel measurements. Preserve a readable scaled preview on desktop; use 100% or the native link to inspect touch sizes, then check reach on the phone.

2. **Keep the decision's context visible.** Show the selected item, relevant equipped slots, and the destination or item being replaced while the player chooses. Make occupied and empty slots obvious, and make swapping an understandable action in that context. Keep the information needed to compare choices together, with enough detail to understand the tradeoff. Inspection and glossary help must return to the same selection, position, and surrounding screen. Avoid sending the player between screens merely to remember what is equipped or what a choice will replace.

3. **Use space to improve reading and choice.** Use landscape width efficiently: group identity, art, effect, and relevant actions; remove redundant labels, oversized furniture, and empty padding that force extra scrolling or hide useful context. Retain enough separation for touch and scanning. Give artwork a readable size and clear silhouette at its actual displayed scale, alongside readable fonts and numbers. Resolve a crowded layout by improving hierarchy and disclosure before shrinking everything. Put text on calm grounds with clear contrast, including disabled labels, and prevent scenery or effects from competing with essential information.

4. **Make actions and state unmistakable.** A player should see what can be tapped, what is selected, and what is unavailable before trying it. Use consistent action shapes, labels, and feedback; reserve the strongest emphasis for the next meaningful action. Decoration must not imply interactivity. Show availability through words and disabled/selected semantics as well as brightness or color. A selected item uses `aria-pressed`; meters expose values and their meaning. Put short action feedback in `role="status"` without announcing continuous animation every frame.

5. **Disclose rules where they are needed.** Put the condition before the effect, then a concise limit. Keep lifetime separate from rarity. Use standardized keywords and icons consistently, and mark glossary terms with the same dotted underline so players recognize that they can tap for an explanation. Help must work on touch and keyboard, without requiring hover. Keep the immediate choice concise; open a focused definition, Details, or Full rules for deeper information, then return to the originating choice. Avoid both walls of rules and unexplained abbreviations.

6. **Use the fewest meaningful steps.** Keep menu flows direct and Back, Done, Keep, and Cancel predictable. Make reversible actions such as equipping, unequipping, reordering, or swapping a single direct action once the player has identified the item and destination; keep the result visible and easy to change again. Do not insert a confirmation merely to repeat a reversible choice. Destructive **Melt** gets one confirmation before commitment, showing the exact item or selected set, what will be lost, and the exact Stored Sparks payout. Avoid a chain of confirmation screens. Cancel preserves the selection and context; confirmation commits the reviewed action once.

7. **Preserve accessible controls and reading.** Keep interactive targets at least 44 × 44 CSS pixels with space between neighboring actions. Preserve keyboard order and a visible `:focus-visible` indicator. Prefer native buttons; SVG or composite buttons need `role="button"`, focusability, an accessible name, and Enter/Space handling in the controller. Restore opener focus when a detail dialog closes. Use native modal dialogs and keep full rules scrollable at short heights. Respect reduced motion, and keep states understandable with animation disabled. Important choices must remain usable without fast reactions or precise eyesight; effects must not hide availability, labels, or consequences.

8. **Keep one visual language.** Use `resourceSymbol('energy')` for Sparks and `resourceSymbol('packed')` for stored containers. Reuse actual companion, pickup, relic, and landmark renderers. Match the established dark woodland palette, warm accents, local lighting, and small integer art grid. Keep unframed item bodies separate from optional furniture or containers. Avoid arbitrary smoothing, globally changed pixel density, decorative frames around every surface, and gallery-only art. A global pixelation redesign requires previews of actual game screens and user approval.

## What remains scene-owned

The shared folder intentionally leaves orchestration in `app.mjs`: header/menu wheel assembly, pause/settings/audio/install controls, the native sheet stack, route selection/commit, Rest services, tutorial pacing, reward transitions, and flight entry/exit. Their existing visual rules remain in the corresponding `game-menu.css`, `rest-choices.css`, `checkpoint-flow.css`, `installation.css`, `tutorial-coach.css`, and other scene styles. The canvas and dynamic in-world effects remain in `flight.mjs` and their effect/art modules.

These are existing owners, not alternate UI systems to recreate in the workshop. When a scene gains a reusable piece, extract that renderer into the appropriate family and use it in both production and its sample. Changes that alter game design, navigation, or architecture go through the planner before implementation.

The workshop exercises the shared renderers and representative controllers, including Collection Melt, reward claim, card equip/reorder, route preview, glossary, and HUD updates. Actions that require a journey or running engine lead to another representative sample or explain that they continue in the game. The workshop never starts the flight engine or persists progress.

## Verification

Run from the `work/emberwing` project directory:

```sh
npm run check:ui-components
npm test
node scripts/pwa-assets.mjs
```

The browser probe checks every catalog state, production CSS parity, browser exceptions/missing resources, Collection selection/full rules/confirmation, touch bounds at three native sizes, keyboard future-stop preview, card order, accessible HUD values, desktop scaling, and both save keys remaining unchanged. It writes screenshots and `report.json` under `outputs/ui-components/`. It uses the installed Chrome executable; it does not add a package dependency.

With the game server running, `node scripts/travel-guide-probe.mjs` checks the exact Wayfinder guide at all four core landscape sizes, feature disclosures, Back and re-entry, then Fly and takeoff in the actual game engine. Set `TRAVEL_GUIDE_BASE` to the server URL (default `http://localhost:4184`). It writes screenshots, the production gate marker, and a report under `outputs/travel-guide/`.

The release graph must include **both** `components.html` and `components-preview.html`, every referenced UI module/style, and their production dependencies. After a release stamp, run the probe again and test the gallery offline through the installed service worker. The gallery itself does not register a service worker or trigger updates; it uses the game's existing cache when available.
