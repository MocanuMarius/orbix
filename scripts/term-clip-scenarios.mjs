// Scenarios for scripts/term-clips.mjs. Each clip is one glossary term (the key in dist/card-terms.mjs CARD_TERMS).
// `setup(e, tc)` and `director(e, tc)` run INSIDE the page against the live engine (they are serialised with toString(),
// so they must not use anything from this file's scope). The director runs before every 1/60 s step with e.time.
// Fields: term, title, url (query of the mock run), seconds, warmup (s, not recorded), crop [x,y,w,h] in CSS px of the
// 915x412 game view, poster (0..1 position of the poster frame), crf (start quality).
export const MAX_BYTES = 300 * 1000;
const DEPART = 'scenario=departure';

export const TERM_CLIPS = [
  {
    term: 'luminance', title: 'Light radius: small, then larger', seconds: 4, warmup: .8, crop: [0, 30, 915, 382],
    url: `${DEPART}&chain=body-spark,echo,downbeat`,
    setup(e, tc) { e.mod.cardLuminancePercent = 0; e.flame = e.maxFlame * .5; tc.pilotTarget = e.height * .5; },
    director(e, tc) {
      const t = tc.t, ramp = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
      // Lantern-lens-sized change: +0% -> +120% -> +0%, with a hold at each end.
      const k = Math.min(ramp(1.0, 1.4), 1 - ramp(2.5, 2.9));
      e.mod.cardLuminancePercent = 120 * k;
    },
  },
  {
    term: 'collect', title: 'Body Spark pays for each Spark the wisp touches', seconds: 4, warmup: .5,
    url: `${DEPART}&chain=body-spark,echo,downbeat`,
    setup(e, tc) { e.flame = e.maxFlame * .4; tc.pilotTarget = e.height * .5; tc.nextDrop = .3; },
    director(e, tc) {
      if (tc.t >= tc.nextDrop && tc.dropN !== 3) { tc.nextDrop = tc.t + 1.1; tc.drop('light', 190, e.player.y + 6); }
    },
  },
  {
    term: 'next', title: 'Echo repeats the card on its right', seconds: 4, warmup: .5, crop: [40, 10, 620, 280],
    url: `${DEPART}&chain=echo,body-spark,downbeat`,
    setup(e, tc) { e.flame = e.maxFlame * .4; tc.pilotTarget = e.height * .5; tc.nextDrop = .3; },
    director(e, tc) { if (tc.t >= tc.nextDrop && tc.dropN !== 3) { tc.nextDrop = tc.t + 1.2; tc.drop('light', 190, e.player.y + 6); } },
  },
  {
    term: 'boost', title: 'Boosts multiply the cards on their left', seconds: 4, warmup: .5, crop: [40, 10, 620, 280],
    url: `${DEPART}&chain=body-spark,prism-lens,crescendo`,
    setup(e, tc) { e.flame = e.maxFlame * .4; tc.pilotTarget = e.height * .5; tc.nextDrop = .3; },
    director(e, tc) { if (tc.t >= tc.nextDrop && tc.dropN !== 3) { tc.nextDrop = tc.t + 1.2; tc.drop('light', 190, e.player.y + 6); } },
  },
  {
    term: 'flash', title: 'Flare: the light jumps, a Pulse every 2 seconds', seconds: 5.4, warmup: .3,
    url: `${DEPART}&chain=harvest-common,echo,downbeat`,
    setup(e, tc) { e.flame = e.maxFlame * .5; tc.pilotTarget = e.height * .5; tc.flare = tc.drop('sight', 165, e.player.y, {feature: 'sight-niche'}); },
    director(e, tc) { const f = tc.flare; if (f && !f.collected) { const d = f.y - e.player.y; e.player.y += Math.max(-3, Math.min(3, d)); if (e.player.vy * d < 0) e.player.vy *= .5; } tc.notes.flare = {collected: !!tc.flare?.collected, sight: +(e.sightUntil - e.time).toFixed(1), py: Math.round(e.player.y), fy: Math.round(tc.flare?.y), fdx: Math.round((tc.flare?.x ?? 0) - e.distance - e.player.x)}; },
  },
  {
    term: 'wave', title: 'A Pulse ring crossing Sparks; Resonant Harvest pays', seconds: 5, warmup: .3, crop: [40, 10, 620, 280],
    url: `${DEPART}&chain=harvest-common,echo,downbeat`,
    setup(e, tc) {
      e.flame = e.maxFlame * .5; tc.pilotTarget = e.height * .5;
      tc.flare = tc.drop('sight', 150, e.player.y, {feature: 'sight-niche'});
      [[250, .22], [300, .8], [360, .3], [330, .62], [215, .78]].forEach(([dx, y]) => tc.drop('light', dx, y));
    },
    director(e, tc) { const f = tc.flare; if (f && !f.collected) { const d = f.y - e.player.y; e.player.y += Math.max(-3, Math.min(3, d)); if (e.player.vy * d < 0) e.player.vy *= .5; } },
  },
  {
    term: 'falling-lift', title: 'Lift while falling: Downbeat fires', seconds: 4.5, warmup: .4, crop: [40, 10, 620, 280],
    url: `${DEPART}&chain=downbeat,echo,body-spark`,
    setup(e, tc) { e.flame = e.maxFlame * .55; tc.pilotOn = false; tc.lastFall = -9; },
    director(e, tc) {
      // A calm human rhythm: let the wisp fall, Lift while it is falling, at most every 0.9 s.
      if (e.player.vy > 60 && e.player.y > e.height * .46 && e.time - tc.lastLift > .9) tc.lift();
      if (e.player.y > e.height * .8) tc.lift();
    },
  },
  {
    term: 'rhythm', title: 'Lift on the beat: three even Lifts send a Pulse', seconds: 5, warmup: .4, crop: [40, 10, 620, 280],
    url: `${DEPART}&chain=rhythm,toll-bell,body-spark`,
    setup(e, tc) { e.flame = e.maxFlame * .6; tc.pilotOn = false; tc.beats = [.5, 1.0, 1.5, 3.1, 3.6, 4.1].map(x => x + e.time); tc.nextBeat = 0; },
    director(e, tc) {
      if (tc.nextBeat < tc.beats.length && e.time >= tc.beats[tc.nextBeat]) { tc.nextBeat++; tc.lift(); }
      else if (e.player.y > e.height * .75 && e.player.vy > 0) tc.lift();
    },
  },
  {
    term: 'engine-skim', title: 'Skim: hugging terrain fills Proximity, then a Pulse', seconds: 5.5, warmup: .3, crop: [0, 60, 700, 352],
    url: `${DEPART}&chain=slip-feather,harvest-common,downbeat`,
    setup(e, tc) { e.flame = e.maxFlame * .7; e.mod.cardProximitySources = 3; tc.pilotTarget = e.height * .62; [[260, .5], [330, .66], [200, .6]].forEach(([dx, y]) => tc.drop('light', dx, y)); },
    director(e, tc) { const ep = e.edgingPulse; tc.notes.maxCharge = Math.max(tc.notes.maxCharge || 0, +(ep.charge || 0).toFixed(2)); tc.notes.pulses = Math.max(tc.notes.pulses || 0, ep.triggerCount || 0); },
  },
  {
    term: 'delivery', title: 'Collector brings a missed Spark home', seconds: 5.5, warmup: .3, crop: [0, 40, 640, 372],
    url: `${DEPART}&chain=courier-tip,twin-orbit,long-spool`,
    setup(e, tc) { e.flame = e.maxFlame * .4; tc.pilotTarget = e.height * .5; tc.dropAt = .2; },
    director(e, tc) { if (tc.dropAt != null && tc.t >= tc.dropAt) { tc.dropAt = null; tc.drop('light', -70, e.player.y + 10); } },
  },
  {
    term: 'overfill', title: 'The Meter tops out and the extra spills', seconds: 4.5, warmup: .3, crop: [0, 40, 640, 372],
    url: `${DEPART}&chain=body-spark,echo,downbeat&slots=0:wellspring`,
    setup(e, tc) { e.flame = e.maxFlame - 1; tc.pilotTarget = e.height * .5; tc.nextDrop = .4; },
    director(e, tc) {
      const f = tc.flare; if (f && !f.collected) { const d = f.y - e.player.y; e.player.y += Math.max(-3, Math.min(3, d)); if (e.player.vy * d < 0) e.player.vy *= .5; }
      if ((!f || f.collected) && tc.t >= tc.nextDrop && (tc.dropN || 0) < 2) { tc.nextDrop = tc.t + 1.6; e.flame = e.maxFlame - 1; tc.flare = tc.drop('cache', 170, e.player.y); }
    },
  },
  {
    term: 'save', title: 'Watchlight stops a fatal crash; Home Beacon pays', seconds: 4.5, warmup: .6, crop: [0, 40, 700, 372],
    url: `${DEPART}&chain=home-beacon,watchlight,downbeat`,
    setup(e, tc) { e.flame = e.maxFlame * .6; tc.pilotTarget = e.height * .55; tc.crashAt = e.time + 1.0; },
    director(e, tc) {
      if (tc.crashAt != null && e.time >= tc.crashAt && e.alive && !e.dying) { tc.crashAt = null; tc.pilotOn = false; e.player.y = e.height - 40; e.player.vy = 700 * e.scaleY; e.hit(null); tc.notes.crashed = true; tc.resume = e.time + .6; }
      if (tc.resume && e.time >= tc.resume) { tc.resume = null; tc.pilotOn = true; }
    },
  },
  {
    // Chain screen: the branded slot, then Play fires the chain (Collect) and Gilded adds its +2.
    term: 'inscription', title: 'A branded slot and its card firing', seconds: 5, realtime: true, poster: .7,
    url: 'chain=body-spark,echo,downbeat&slots=0:gilded',
    ready: `!!document.querySelector('[data-action=skills]')`,
    steps: [
      {js: `document.querySelector('[data-action=skills]').click()`}, {until: `!!document.querySelector('#dk2-play')`},
      {wait: 1.2}, {js: `document.querySelector('#dk2-play').click()`}, {wait: 4.2},
    ],
  },
  {
    // The Chain screen marks the card that the take-off will eat ("Eaten"); Play shows the chain's Trigger flow.
    // (The take-off itself has no animation in flight: the eaten slot just turns empty, so the screen is the clearer view.)
    term: 'devour', title: 'The card to the right of Dream is eaten at take-off', seconds: 4, realtime: true, poster: .5,
    url: 'chain=dream,harvest-rare,downbeat',
    ready: `!!document.querySelector('[data-action=skills]')`,
    steps: [{js: `document.querySelector('[data-action=skills]').click()`}, {until: `!!document.querySelector('#dk2-play')`}, {wait: 1.5}, {js: `document.querySelector('#dk2-play').click()`}, {wait: 3}],
  },
];
