# Visual consistency review

Status: local review build. Do not deploy pixelation changes until the player
approves the supplied phone-sized screens. The live Pages build is unchanged.

## Art rules

- Fine pixel silhouettes, normally 1–2 logical pixels per contour step.
  Preserve continuous movement and interpolation; do not quantize physics.
- The wisp uses one-pixel source cells and eight light values. Its shape stays
  stable while fuel burns inward. The primary and fallback renderers share
  the same cached art; the menu and flight share companion art.
- Stone, moss and charcoal form the quiet surfaces. Bone-white is light,
  brass identifies available actions, and blue identifies owned skills.
  Status words remain alongside color. Emitted light can fade softly.
- Action surfaces use the same sparse chipped rim. Informational scenery
  stays unframed. Avoid repetitive dotted edges, animated edge noise and blur
  filters over text. Keep existing home illustrations and unique location art.
- The shared pixel face, separate legible digits and consistent icon tiers
  cover the book, menus and checkpoint choices. Mobile safe areas remain.
- Fuel Sparks share one plasma painter across all five sizes. Raster detail
  follows projected size instead of enlarging the medium source or switching
  giants to supersampled curves. Channels and shell grain stay near one game
  raster pixel; large volumes gain additional channels and glass inclusions.
  Menus are baked from that same painter. Rendering streams paint operations
  and bounds adaptive caches; it does not allocate a giant full-frame atlas.
- Treasure vessels, lenses, scales and coins use detailed 52×48 source art.
  The vessel skill icon reuses the same glass art and animated Spark. The
  Stored Sparks case uses a finer 32×32 source with its own glass window.
- Reward copy uses “permanently” and omits redundant “now.” New Game still
  resets run skills and artifacts, as explained in the progression guide.

The proposal uses Godot's guidance on a stable design resolution and aspect
ratio handling, and Unity's treatment of consistent source pixel density.
These are principles applied to the existing Canvas renderer, not an engine
migration or a claim of integer scaling on every display.
[Godot](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html),
[Unity](https://github.com/Unity-Technologies/2d-pixel-perfect/blob/master/Documentation/2D%20Pixel%20Perfect%20Camera.md).

Microsoft's game accessibility guidance informs the readable text hierarchy
and state contrast. This pass does not claim full accessibility compliance.
[Text display](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101),
[Contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102).

## Related changes prepared during review

- Collector begins with Small/Cluster fetching. Separate Cache → Surge → Giant
  Handling purchases unlock larger loads. Flash has its own purchase. Larger
  loads shrink for 0.32 seconds into a Cluster, then absorb as 12 base Sparks.
  Normal pickup bonuses still work; direct pickups keep their full fuel.
- Regenerative Pulse adds three Sparks of missing-fuel recovery to the reveal.
  It works with duration, charge-retention and shield upgrades. Eight recoveries
  cap it at 24 Sparks per flight; ordinary pulses continue after that quota.
- The Luminance chapter reports current radius in wisp body widths and draws
  the selected upgrade's actual before/after reach. Locked-path previews include
  missing prerequisite skills. A body width means the fixed outer shell.
- Positive event preparations and utility challenge rewards last for three
  cleared flights. Failures do not spend them; re-earning refreshes duration
  without multiplying strength. Contract conditions and the negative Lead Seal
  remain explicitly tied to one attempt.
- The Fallen Giant's first optional challenge award gives Heartwood: +3 maximum
  Sparks for the rest of the run, once per run.

Animated local review: `http://localhost:4180/fidelity-preview.html`.
Treasure fixture: `http://localhost:4180/game.html?mock=treasure&treasure=vessel`.
These fixtures do not alter the campaign save.

Phone-sized review captures are in `review/visual-2026-11-15/`. Subjective art
approval and a production deployment remain pending.
