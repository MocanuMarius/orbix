# Design versions

Every proposed look gets a code. The user approves or rejects by code ("`v1.0-pause` looks good"), and only an approved code is built into the game. Previews live in the design lab: `http://localhost:4173/design-lab/index.html` (source in `dist/design-lab/`, rendered with the production stylesheets and icons; not part of the offline release graph).

Code format: `v<major>.<minor>-<surface>`. `v0-<surface>` is always what ships today. A requested change to a proposal bumps the minor (`v1.0` → `v1.1`); a different direction bumps the major.

| Code | Surface | Status | What it is |
| --- | --- | --- | --- |
| `v0-pause` | Pause menu | Shipped (baseline) | Current menu: entries scattered across three columns, Field Guide + Glossary split, audio toggles duplicated, translucent backdrop. |
| `v1.0-pause` | Pause menu | Layout liked 2026-11-16 ("this is great"); art direction rejected — flat boxes do not match the game's pixel art. Superseded by `v1.1-pause`. | One ordered column: Resume → build (Loaned Cards, or Deck + Collection) → Help → Settings; a rule; then quiet Skip/Exit (practice) or Exit/Abandon (real run). Audio moves to Settings. Opaque backdrop. Fits 667×300 without scrolling. |
| `v1.2-pause` | Pause menu | **Proposed 2026-11-16 — awaiting user verdict** | `v1.1-pause` with the user's two notes applied: flat plaques (no pointed end, no arrow) and lettering 20px clear of every edge. Built from `v1.1-theme`. Checked at 900×405, 667×300 and 640×320: no overflow, no clipped labels. |
| `v1.1-theme` | Shared menu language ("Waystone") | **Proposed 2026-11-16 — awaiting user verdict** | `v1.0-theme` with flat 9-slice plaques shown at exactly 2×, in the same four stones. New art in `dist/design-lab/assets/plaque-*.svg`. |
| `v1.1-pause` | Pause menu | Liked 2026-11-16 ("looks much better"); replaced by `v1.2-pause` — text too close to the borders, pointed sign end and arrow disliked. | The `v1.0-pause` order, built from `v1.0-theme`: every entry is the Home screen's carved waystone sign with title, subtitle and stepped arrow. |
| `v1.0-theme` | Shared menu language ("Waystone") | Replaced by `v1.1-theme`. | The kit all menus would be built from: four sign roles (gold primary, basalt standard, weathered quiet, rust danger), one title style, one context line, one carved rule. Reuses `assets/command-waystone*.svg`; the weathered and rust stones are new recolours kept in `dist/design-lab/assets/` until approved. |

## Rules

- Add a row here whenever a look is proposed; update Status when the user answers (Approved → Implemented in `<commit>`, or Rejected with the reason).
- A preview must use real production renderers/styles where possible, and include the current look (`v0`) for comparison.
- Approval of a code authorizes building exactly that look. Anything that drifts from it during implementation comes back as a new code.
