# Three skill trees and Glide Regeneration

The skill UI now has Wisp, Companion and Mystic tabs, without subtabs. Wisp and Mystic each show eight grouped nodes. The selected companion has at most eight. Ranks retain individual effects and costs; later ranks require the previous stage.

Wisp: Lift, Luminance, Momentum, Energy Vessel, Glide Regeneration, Vitality, Trajectory Guide, Spark Sense.
Mystic: Packing, Prismatic Yield, Kept Light, Dream, Proximity, Lasting Pulse, Regenerative Pulse, Light Aegis.

Retired filler skills are unavailable even in TEST. Existing recorded spending on them is refunded once; active-attempt snapshots also receive the refund. Refunds do not count as earned currency.

Glide Regeneration restores usable Energy while falling unassisted after not lifting. Rank 1 waits 1.5 seconds, restores 1 Energy/second and caps at 6 per flight. Rank 2 waits 1 second, restores 2/second and caps at 9 per flight. Pauses, held lift, active abilities, Dream and full Energy prevent recovery. Regeneration cannot create Packed Sparks or trigger pickups.

Global paid-rank price growth changes from .35 to .12 to compensate for removing cheap filler. The prior inventory-based 3,456-campaign check retained median purchases of four for steady and five for practiced profiles. It did not model regeneration fuel gains. The coupled physics audit is documented separately and takes precedence for map difficulty conclusions.

Validation: consolidated-tree-probe, condensed-model-probe, browser purchase at 900x405 (180 -> 25 currency, regeneration 0/2 -> 1/2), no nested category selectors.
