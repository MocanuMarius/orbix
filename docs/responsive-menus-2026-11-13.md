# Responsive menu fixes — 13 November 2026

Release: `responsive-menus-1`.

## Reproduced and fixed

1. Rest's Dream button and next-passage illustration inherited taller fixed card heights, covering Leave Rest. They now fit their grid track.
2. Skill diagrams estimated viewport space and separated circular centers, allowing square touch rectangles to overlap. The layout now measures the rendered pane, separates rectangles, and uses nearest-anchor packing if a crowded sector cannot settle. Only the diagram can grow when necessary. Existing resize handling recomputes the layout.
3. Expanded artifact explanations pushed Keep/Forge below the visible area. Explanations now have their own scroll area with the choices pinned below them. Reward and replacement confirmations follow the same structure.
4. At 280px landscape height, the home menu covered Continue and the victory footer fell below the viewport. Compact layout rules reserve space for these actions.

## Verification

- Browser viewports: 900×405, 740×333, 844×320, 720×280, 667×375, 932×430.
- Fourteen screen states at each size: Home, arrival Rest, prepared Rest, map, settings, run menu, skills, companions, artifacts, forge, briefing, victory, pause, tutorial Rest.
- All 84 baseline cases had no overlapping, covered or offscreen interactive rectangles and no document overflow.
- Additionally opened artifact explanations and the TEST catalogue, reward replacement explanations, and companion explanations. Long optional content scrolls inside its own area; action buttons stay visible.
- Switched four main skill branches at three sizes and resized an open Collector tree. No overlapping targets.
- Clicked Leave Rest and verified the next flight briefing opens.
- The radial layout probe covers 66 branch/size combinations, prerequisite grouping, rectangular target gaps and rank-marker advancement. Updated stale probe fixtures to use current skills and Packed Light.
- Browser console check found no errors in the audited local tab.

These are browser viewport/layout checks, not measurements from a physical phone. No economy or flight balance parameters were changed.
