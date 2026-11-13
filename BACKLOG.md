# Pending feedback — 2026-11-13

- [ ] Glow basin: each segment represents exactly one displayed Glow unit; fill aligns to the same grid.
- [ ] Remove stretching, squash and fluid fill animations from the Glow basin; retain crisp pixel transitions.
- [ ] Make the upward Packed Light overflow beam visibly pixelated to match the game art.
- [ ] Allow duplicate common consumable artifacts to stack remaining uses in one slot; define a readable stack counter and a bounded charge cap.
- [x] Preserve automatic artifact effects: mounting selects the build; flight never needs an artifact activation button.
- [ ] Give interactive scenery, including mushrooms, a distinct edge highlight so it is distinguishable from ordinary terrain and background art.
- [ ] Explore **Regenerative Falling** as a skill/artifact choice: (A) an X% chance per Lift tap to negate its Glow cost, or (B) replace the full Edging reveal pulse with +1 Glow. These are alternatives to evaluate, not approved values or simultaneous effects. Show the tradeoff and prevent recovery/overflow farming when balancing.

# Accepted gameplay batch — 2026-11-13

Status: implemented, checked and deployed as dream-paths-1 (source 9a0ecf9). Public release marker, index and Dream/rest/victory modules verified.

- [x] Glow Sense: Light-tree forward boon hints, fading as actual pickups become visible.
- [x] Collector: use outer boon contact ring; visible contact ripple and committed fetch feedback; retain body priority.
- [x] Routes: split/rejoin paths, clear five-category symbols, future encounter previews, single outgoing flight after each rest.
- [x] Sites: treasure, bounded dice, bargains, sanctuary and workshop choices with visible consequences.
- [x] Victory: artifact/Ember reward after every flight, three equipped slots with replacement, Upgrade and Next after victory animation.
- [x] Skill presentation: owned/available/unaffordable/prerequisite path distinctions.
- [x] Recovery: baseline 50% maximum Glow after victory; overflow into early skill-unlocked Afterglow; separate upgrades and HUD reserve strip.
- [x] Dream: unlockable 4-second practice, unlimited retries without run writes, save preset, matching real replay free of flight fuel costs, paused handoff then gradual resume; duration/sight/wake upgrades.
- [x] Rest preparation: clear Skill Tree / Companions / Dream / artifact access.
- [x] Integration checks and targeted resource/reward sanity checks.
- [x] Single GitHub Pages deployment and live verification.

Balance values are initial settings, not claims of human-play balance. Rehearsal must not farm resources; replay pickup rewards happen only once. No billing or plan changes.
