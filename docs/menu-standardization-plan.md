# Menus & UI standardization — iteration plan

Status: **proposal for user review, 16 November 2026.** Coordinator design doc. Builds on the [shared component principles](../dist/ui/README.md), the [menu simplification audit](../outputs/menu-simplification/report.md), and the [UI design research](ui-design-research.md). Companion to the [tutorial redesign proposal](tutorial-redesign-proposal.md) — the two share the Help-hub decision.

## The diagnosis

The game's screens are individually decent but there is no single *navigation model*. Symptoms, all evidenced in the audits:

- **Parallel paths to the same content**: Help/Glossary/Field Guide/Map Guide reachable from five surfaces with different Back behavior; up to three Deck entries on one map state.
- **Inconsistent return contracts**: Field Guide remembers its Settings origin; Install/App-status didn't (just repaired); credits left the game entirely (just repaired). Back is only predictable where someone hand-wired it.
- **Naming drift**: the button says Deck, the screen says Equipped; "Skills" action opens the Deck in Cards mode.
- **No shared sheet anatomy**: each sheet hand-assembles its own header, Back placement and primary action, so players re-learn each screen.
- **Dev furniture in player space**: Rest Preview in Advanced (now being gated), one-option selectors (now being hidden).

The eight principles in `dist/ui/README.md` are good and already canonical — the gap is that they govern *components*, while navigation and screen anatomy stayed scene-owned in `app.mjs` with no equivalent contract.

## What good looks like (references)

- **Slay the Spire**: one spatial hub (the map) everything returns to; keyword tooltips on the object itself, never a separate manual; deck/discard/exhaust always one tap away with identical presentation everywhere a card list appears. Lesson: *one list renderer, one keyword system, one home surface*.
- **Balatro**: near-zero chrome; every number the player needs for the current decision is on the current screen; rarity/type encoded in frame + color + label redundantly; a single "peek" gesture (hold) works on everything. Lesson: *decision context stays visible (our principle 2), one inspect gesture everywhere*.
- **Hades**: strict hub-and-spoke; Back never surprises; one codex grows as you discover. Lesson: *a single Help/codex hub beats parallel guides* — this is the audit's candidate #3.
- **Theory**: recognition over recall and consistency (Nielsen heuristics 4 & 6); progressive disclosure (we already commit to it); thumb-reach/Fitts for landscape one-handed play (Game Accessibility Guidelines and the Xbox guidance already cited in `ui-design-research.md`); Hodent's *The Gamer's Brain* on carrying capacity of the first session.

## The three paradigms to standardize

**1. One navigation contract.**
- Hub-and-spoke: Home and the run Map are the only hubs. Everything else is a *sheet* on the existing native sheet stack.
- Back law: Back/Cancel always returns to the exact origin — screen, scroll, focus, selection (the `rememberSettings`/`guideReturn*` pattern, promoted from ad-hoc to a shared helper, e.g. `openSheetFrom(origin)` that records and restores context).
- Depth cap: ≤ 2 sheets above a hub. Anything deeper becomes in-place disclosure (Details/Full rules) instead of another screen.
- One entry per destination per screen: a destination may appear in at most one menu surface plus contextual links on objects (a card's keyword may open the glossary; a second Deck *button* may not exist on the same screen).

**2. One sheet anatomy (new shared component).**
Every sheet renders through a single `sheetFrame()` in `dist/ui/`: title zone (name, not a sentence), consistent Back placement (same corner everywhere, thumb-reachable), content zone, and a bottom action bar where the primary action is always rightmost/strongest and destructive actions are never adjacent to Back. Existing sheets migrate family by family; `data-action` contracts preserved.

**3. One vocabulary.**
- Canonical names: **Deck** (with Equipped/Reserve tabs, resolving the naming drift), **Help** (the hub: Tutorial, Keywords, Pickups, Map symbols, Lessons), **Workshop** (camp services), **Collection** (relics). No second name for any of these anywhere.
- Keywords keep the dotted-underline glossary affordance; icons come only from `art.mjs` renderers; rarity/availability always encoded by label + shape + color (never color alone).

## Iteration process (how we'll actually do this)

Per the art rule in AGENTS.md, nothing ships without previews of actual screens and your approval.

- **Iteration 0 — inventory (read-only, 1 worker):** enumerate every sheet/screen and its entry/exit edges from `app.mjs` dispatch + the page-cleanup graph; score each against the 8 principles + 3 paradigms. Output: a one-page scorecard naming the worst offenders.
- **Iteration 1 — paper-on-glass:** 2–3 variants of the navigation map and sheet anatomy as annotated mockups over real screenshots (components workshop + screenshot tooling at 900×405 and 667×300). You pick a direction.
- **Iteration 2 — one vertical slice:** rebuild the worst-scoring flow (likely Help hub + pause menu) on `sheetFrame()` behind the real game, screenshot the before/after at all core viewports, user review.
- **Iteration 3+ — migrate family by family**, each a bounded worker task with focused tests + `check:ui-components`, no big-bang rewrite.

## Non-goals

No framework, no portrait redesign, no gameplay/economy changes, no global pixelation, no deletion of mechanics (Workshop/Refill, Try row, glossary, scorecards, TEST/Legacy override all stay). The Help hub consolidation supersedes audit candidate #3 and is executed here, not as cleanup.
