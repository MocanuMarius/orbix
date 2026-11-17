// v1.0-cardart-B ("Vignette"), Common cards. Design lab only; nothing in the game imports this.
// Everything shared (toolkit, palette, sprites, objects) comes from ./kit.mjs. Rarity rule for Commons:
// the subject on plain ground under a simple two-band sky; flat, no second depth layer, no glow, no key-line.
import {
  PAL, S, grid, px, rect, disc, ring, inDisc, inEll, ell, line, stamp, recolor, flip, shape, toSvg,
  SPARK11, SPARK11_DIM, GLINT, DUSK, DIM, FADE_A, sparkAt, trail, wisp, collector, orb, streaks, scene, pulseRing,
  HEART, LEAF, CAMPFIRE, FLAME, SMALL_FLAME, FLAME7, sheaf, seedSprout, logs, stake,
  HOURGLASS, HOURGLASS_S, hourglass, bell, meterStack, jar, chest, satchel, spool, HOOK, coilSpring, winch, cluster,
  BOLT, BOLT_SPENT, BOLT_S, CHEV, CHEV_WHITE, ARROW_UP, dipPath, prismTri, beam, magnifier, miniCard, FLAG, candle,
  nest, kindling, echoRow,
} from './kit.mjs';
export {PAL};

const base = opts => { const g = grid('N'); scene(g, opts); return g; };
const P = {};

// COLLECT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Body Spark +2: the approved B picture, unchanged.
P['body-spark'] = () => { const g = base();
  wisp(g, 24, 29, 8);
  trail(g, 14, 14, 18, 21, 3); trail(g, 34, 14, 30, 21, 3);
  sparkAt(g, 11, 10, 10); sparkAt(g, 11, 38, 10);
  return g; };

// Pocket Sparks: a stitched satchel full of Sparks; one flies out into a small wisp.
P['spark-cache'] = () => { const g = base({gy: 40, tufts: [2, 30, 37, 44]});
  sparkAt(g, 7, 10, 19); sparkAt(g, 7, 22, 18); sparkAt(g, 11, 16, 17);
  satchel(g, 6, 22, 22, 17);
  trail(g, 24, 14, 32, 10, 4);
  wisp(g, 38, 9, 5);
  sparkAt(g, 7, 28, 15);
  return g; };

// Dusk Wick: the candle's flame feeds on a dark Dusk Spark and throws off gold (the line's device).
P['dusk-wick'] = () => { const g = base({gy: 41, tufts: [3, 40, 45]});
  candle(g, 26, 23, 15, 12);
  stamp(g, FLAME, 21, 7);
  sparkAt(g, 11, 8, 19, DUSK);
  trail(g, 13, 16, 18, 14, 3, 'R');
  sparkAt(g, 7, 40, 12);
  return g; };

// Cluster Heart: a bound bunch of Sparks (one pickup) streaming into the wisp.
P['cluster-heart'] = () => { const g = base();
  ring(g, 14, 15, 12, 1, 'D');
  sparkAt(g, 11, 14, 15); sparkAt(g, 7, 8, 9); sparkAt(g, 7, 21, 9); sparkAt(g, 7, 8, 21); sparkAt(g, 7, 20, 22);
  trail(g, 25, 24, 28, 27, 3);
  wisp(g, 33, 31, 8);
  return g; };

// Low Wick: a nearly empty Spark Meter; a Spark streaks into the wisp beside it and lights the bottom.
P['low-wick'] = () => { const g = base({gy: 41, tufts: [24, 44]});
  meterStack(g, 6, 7, 12, 33, .2);
  sparkAt(g, 11, 38, 9);
  trail(g, 35, 15, 33, 19, 3);
  wisp(g, 31, 28, 7);
  trail(g, 23, 31, 20, 34, 3, 'G');
  return g; };

// Wick Doubler: the wisp's Spark goes into the glass and comes out as two.
P['wick-doubler'] = () => { const g = base({gy: 41, tufts: [4, 40]});
  wisp(g, 7, 30, 5);
  trail(g, 10, 25, 13, 22, 2);
  sparkAt(g, 7, 13, 18);
  magnifier(g, 25, 18, 10, {handle: false});
  sparkAt(g, 7, 22, 16); sparkAt(g, 7, 28, 21);
  shape(g, l => { rect(l, 23, 29, 4, 11, 'B'); rect(l, 23, 29, 1, 11, 'P'); });
  trail(g, 35, 13, 38, 11, 2); trail(g, 35, 23, 38, 26, 2);
  sparkAt(g, 11, 42, 8); sparkAt(g, 11, 42, 29);
  return g; };

// Glass Spool: a Spark drops in, the hourglass is nearly run out, and the Collector is off again.
P['glass-spool'] = () => { const g = base({gy: 41, tufts: [4, 30, 44]});
  hourglass(g, 16, 13, 17, 27);
  sparkAt(g, 11, 7, 6); trail(g, 11, 10, 13, 12, 2);
  streaks(g, 29, 22);
  collector(g, 39, 22, 6);
  return g; };

// Mending Moss: the dimmed Collector rests on moss; a Spark comes in and the hourglass runs out early.
P['mending-moss'] = () => { const g = base({gy: 40, tufts: [3, 44]});
  const tufts = [[5, 36, 4], [11, 34, 5], [18, 33, 5], [25, 34, 5], [30, 36, 4]];
  shape(g, l => { tufts.forEach(([x, y, r]) => disc(l, x, y, r, 'M')); rect(l, 2, 36, 32, 4, 'M'); });
  tufts.forEach(([x, y, r]) => disc(g, x - 1, y - 1, r - 1.6, 'm', (px2, py2) => py2 < y));
  [[8, 37], [15, 36], [23, 37], [28, 38]].forEach(([x, y]) => px(g, x, y, 'L'));
  stamp(g, LEAF, 4, 23);
  orb(g, 18, 24, 7, {rim: 'T', body: 'C', core: 'C', hot: 'c'});
  sparkAt(g, 7, 9, 8); trail(g, 11, 12, 13, 15, 2);
  stamp(g, HOURGLASS, 34, 16);
  return g; };

// Fast Spool: a spinning spool reels the Collector in fast along its gold thread.
P['fast-spool'] = () => { const g = base();
  spool(g, 13, 14, 14, 25);
  [[4, 10], [3, 12], [22, 10], [23, 12]].forEach(([x, y]) => px(g, x, y, 'Y'));
  line(g, 20, 26, 31, 26, 'G');
  collector(g, 36, 26, 6);
  rect(g, 43, 21, 4, 1, 'T'); rect(g, 44, 26, 3, 1, 'T'); rect(g, 43, 31, 4, 1, 'T');
  sparkAt(g, 7, 36, 9); trail(g, 33, 13, 31, 15, 2);
  return g; };

// DELIVERY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Courier Tip: the approved B picture, unchanged.
P['courier-tip'] = () => { const g = base({gy: 40, tufts: [5, 17, 26, 38]});
  [[1, 22, 6], [3, 27, 8], [1, 32, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 18, 27, 7);
  sparkAt(g, 16, 31, 23);
  sparkAt(g, 7, 38, 8); sparkAt(g, 7, 44, 15);
  rect(g, 12, 43, 14, 1, 'O');
  return g; };

// Courier Glass: the Collector delivers a Spark into the glass, which shows it twice.
P['courier-glass'] = () => { const g = base({gy: 41, tufts: [4, 15, 25]});
  [[0, 21, 3], [0, 26, 5], [0, 31, 3]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 11, 26, 6);
  magnifier(g, 31, 21, 12);
  sparkAt(g, 11, 27, 18); sparkAt(g, 11, 35, 24);
  rect(g, 18, 26, 3, 1, 'D');
  return g; };

// Crate Lining: the Collector delivers into the Cache chest; its lining holds extra Sparks.
P['crate-lining'] = () => { const g = base({gy: 40, tufts: [3, 40, 45]});
  sparkAt(g, 7, 13, 19); sparkAt(g, 11, 20, 18); sparkAt(g, 7, 27, 20);
  chest(g, 8, 23, 24);
  rect(g, 9, 40, 25, 1, 'O');
  streaks(g, 35, 13);
  collector(g, 42, 13, 5);
  trail(g, 37, 18, 31, 21, 3);
  return g; };

// LATCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Return Spring: the Collector latches a Spark; a coiled spring snaps it back home.
P['return-spring'] = () => { const g = base({gy: 40, tufts: [3, 30, 44]});
  shape(g, l => { rect(l, 1, 14, 4, 22, 'B'); }); rect(g, 1, 14, 1, 22, 'P');
  coilSpring(g, 5, 25, 23, 6, 5);
  collector(g, 32, 25, 6);
  stamp(g, HOOK, 37, 22);
  sparkAt(g, 11, 43, 27);
  [[10, 16], [16, 16], [22, 16], [10, 34], [16, 34], [22, 34]].forEach(([x, y]) => rect(g, x, y, 2, 1, 'T'));
  return g; };

// Haul Winch: a cranked winch reels in a hooked Cluster fast.
P['haul-winch'] = () => { const g = base({gy: 41, tufts: [3, 12, 44]});
  winch(g, 14, 27);
  line(g, 20, 27, 34, 9, 'P'); line(g, 21, 27, 35, 9, 'O');
  stamp(g, HOOK, 33, 8);
  cluster(g, 37, 23, 7);
  [[42, 12, 4], [44, 16, 3]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'T'));
  return g; };

// PULSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Resonant Harvest: a golden sheaf on the field sends out one Pulse ring.
P['harvest-common'] = () => { const g = base();
  pulseRing(g, 24, 28, 18, (x, y) => y < 39);
  sheaf(g, 24, 41, {tall: 28});
  sparkAt(g, 7, 41, 12);
  return g; };

// First Ripple: a fresh Pulse ring from the wisp lights the first Spark it meets; the next ones wait, dim.
P['first-ripple'] = () => { const g = base({gy: 41, tufts: [30, 38, 45]});
  wisp(g, 4, 30, 5);
  pulseRing(g, 4, 30, 15, (x, y) => y < 41);
  sparkAt(g, 16, 19, 21);
  stamp(g, SPARK11_DIM, 29, 27); stamp(g, SPARK11_DIM, 37, 14);
  return g; };

// Far Shore: a wide Pulse ring crossed the water; the near Spark is spent, the far shore lights up.
P['far-shore'] = () => { const g = base({gy: 39, tufts: [35, 41, 45]});
  rect(g, 0, 39, 31, 9, 'T'); rect(g, 0, 39, 31, 1, 'C'); [[3, 42, 5], [14, 44, 6], [22, 41, 4]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'c'));
  pulseRing(g, -4, 44, 40, (x, y) => y < 39);
  stamp(g, SPARK11_DIM, 4, 27);
  sparkAt(g, 16, 39, 17); sparkAt(g, 11, 38, 32);
  return g; };

// FLASH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Clear Prism: the Flash bolt strikes a glass prism and two Sparks come out.
P['clear-prism'] = () => { const g = base({gy: 41, tufts: [3, 40]});
  stamp(g, BOLT, 1, 2);
  beam(g, 10, 20, 16, 27);
  prismTri(g, 23, 19, 21);
  beam(g, 30, 28, 37, 20); beam(g, 31, 33, 38, 36);
  sparkAt(g, 11, 41, 15); sparkAt(g, 11, 42, 35);
  return g; };

// Flash Thread: a Flash bolt runs the hourglass out early; the Collector is ready again.
P['flash-thread'] = () => { const g = base({gy: 41, tufts: [3, 26, 44]});
  stamp(g, BOLT, 2, 3);
  hourglass(g, 22, 12, 13, 27);
  streaks(g, 32, 28);
  collector(g, 41, 28, 5);
  return g; };

// FLASH ENDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Prism Wick: the spent, broken Flash bolt sends one last Pulse ring, three Sparks in it.
P['diving-bell'] = () => { const g = base();
  pulseRing(g, 24, 25, 17, (x, y) => y < 39);
  stamp(g, BOLT_SPENT, 18, 16);
  sparkAt(g, 7, 9, 13); sparkAt(g, 7, 40, 14); sparkAt(g, 7, 41, 33);
  return g; };

// RHYTHM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Toll Bell: a bell rings under three evenly spaced beat Sparks.
P['toll-bell'] = () => { const g = base();
  shape(g, l => rect(l, 6, 14, 36, 3, 'B')); rect(g, 6, 14, 36, 1, 'P');
  shape(g, l => { rect(l, 8, 17, 3, 22, 'B'); rect(l, 37, 17, 3, 22, 'B'); }); rect(g, 8, 17, 1, 22, 'P'); rect(g, 37, 17, 1, 22, 'P');
  bell(g, 24, 20, 14);
  [12, 24, 36].forEach(x => sparkAt(g, 7, x, 6));
  return g; };

// Pacesetter: three even beats run the hourglass out; the Collector dashes off early.
P['pacesetter'] = () => { const g = base({gy: 41, tufts: [3, 26, 44]});
  [9, 20, 31].forEach(x => { sparkAt(g, 7, x, 6); rect(g, x - 1, 10, 1, 3, 'L'); });
  hourglass(g, 13, 16, 13, 24);
  streaks(g, 25, 29);
  collector(g, 36, 29, 6);
  return g; };

// FALLING LIFT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Downbeat: the wisp falls, Lifts at the bottom of the dip (the chevron), and two Sparks pay out.
P['downbeat'] = () => { const g = base({gy: 41, tufts: [4, 30, 44]});
  dipPath(g, 3, 3, 15, 31, 25, 17);
  stamp(g, CHEV, 11, 33);
  wisp(g, 30, 13, 6);
  sparkAt(g, 7, 41, 23); sparkAt(g, 7, 41, 7);
  return g; };

// Counterweight: the wisp's falling Lift runs the hourglass out early; the Collector is off again.
P['counterweight'] = () => { const g = base({gy: 41, tufts: [4, 44]});
  dipPath(g, 2, 2, 9, 22, 15, 10);
  stamp(g, CHEV, 5, 24);
  hourglass(g, 24, 12, 13, 27);
  streaks(g, 33, 28);
  collector(g, 42, 28, 4);
  return g; };

// LIFT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Double Lift: the wisp rides up on two stacked chevrons; the upper one is pale (the free Lift).
P['double-lift'] = () => { const g = base();
  trail(g, 24, 38, 24, 36, 2, 'P');
  stamp(g, CHEV, 20, 28); stamp(g, CHEV_WHITE, 20, 21);
  wisp(g, 24, 12, 7);
  return g; };

// SAVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Home Beacon: the Save heart burns on top of a beacon post; Sparks rain from it.
P['home-beacon'] = () => { const g = base();
  shape(g, l => { rect(l, 21, 26, 6, 13, 'B'); rect(l, 18, 24, 12, 3, 'L'); }); rect(g, 21, 26, 1, 13, 'P'); rect(g, 18, 24, 12, 1, 'B');
  stamp(g, HEART, 13, 5);
  [[9, 6], [38, 6], [6, 16], [42, 16]].forEach(([x, y], i) => { line(g, x, y, x + (x < 24 ? -2 : 2), y - (i < 2 ? 2 : 0), 'Y'); });
  sparkAt(g, 7, 8, 30); sparkAt(g, 7, 40, 30); sparkAt(g, 7, 36, 37);
  return g; };

// CLEAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Growth Ring: a cut stump shows its year rings, the newest one gold.
P['growth-ring'] = () => { const g = base({gy: 40, tufts: [3, 44]});
  shape(g, l => { rect(l, 8, 26, 30, 13, 'B'); ell(l, 23, 39, 15, 2, 'B'); rect(l, 5, 37, 6, 3, 'B'); rect(l, 35, 37, 7, 3, 'B'); });
  for (let x = 9; x < 38; x += 4) rect(g, x, 30, 1, 9, 'L');
  rect(g, 8, 26, 1, 13, 'P');
  shape(g, l => ell(l, 23, 26, 15, 7, 'G'));
  ell(g, 23, 26, 12.6, 5, 'P'); ell(g, 23, 26, 10, 4.3, 'B'); ell(g, 23, 26, 9, 3.6, 'P'); ell(g, 23, 26, 6, 2.5, 'B'); ell(g, 23, 26, 5, 1.8, 'P'); rect(g, 22, 26, 2, 1, 'L');
  stamp(g, FLAG, 37, 4);
  return g; };

// Wind Feather: a pale feather rides streaks of wind past the Clear flag.
P['wind-feather'] = () => { const g = base();
  [[2, 10, 10], [26, 6, 8], [30, 36, 9], [4, 22, 6]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'T'));
  shape(g, l => {
    const x0 = 9, y0 = 38, x1 = 38, y1 = 8, L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const vx = x + .5 - x0, vy = y + .5 - y0, t = (vx * ux + vy * uy) / L, d = vx * -uy + vy * ux;
      if (t < 0 || t > 1) continue;
      const w = t < .2 ? .6 : 7 * Math.sin(Math.PI * Math.min(1, (t - .2) / .8)) ** .6;
      if (Math.abs(d) <= w) l[y][x] = Math.abs(d) < .8 ? 'B' : d > w - 1.6 ? 'P' : 'Y';
    }
  });
  [[22, 26, 26, 30], [28, 19, 32, 22]].forEach(([a, b, c, d]) => line(g, a, b, c, d, 'O'));
  stamp(g, FLAG, 2, 23);
  return g; };

// Wayfarer's Purse: at the Clear flag, five Sparks drop into the Stored Sparks jar.
P['wayfarers-purse'] = () => { const g = base({gy: 40, tufts: [4, 40]});
  jar(g, 20, 21, 20, 19, 16);
  sparkAt(g, 11, 17, 29); sparkAt(g, 7, 24, 34);
  [[8, 5], [16, 3], [24, 6], [32, 4]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  trail(g, 20, 10, 20, 12, 2);
  stamp(g, FLAG, 36, 8);
  return g; };

// Nest Egg: the Stored Sparks jar sits in a woven nest and has laid one gold Spark egg beside it.
P['nest-egg'] = () => { const g = base({gy: 40, tufts: [3, 9, 44]});
  jar(g, 20, 14, 16, 17, 12);
  sparkAt(g, 11, 20, 22);
  ell(g, 33, 26, 4, 5.5, 'O'); ell(g, 33, 26, 3, 4.5, 'G'); px(g, 32, 24, 'W'); px(g, 32, 25, 'W'); px(g, 34, 28, 'D'); px(g, 35, 29, 'D');
  nest(g, 24, 32);
  stamp(g, FLAG, 39, 4);
  return g; };

// REST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Second Ember: the Rest campfire, and a second small ember kindled from it on its own stones.
P['camp-kit'] = () => { const g = base({gy: 40, tufts: [3, 26, 44]});
  logs(g, 16, 35, 10);
  stamp(g, FLAME, 11, 20);
  trail(g, 22, 22, 30, 24, 3, 'E');
  shape(g, l => { rect(l, 30, 37, 3, 2, 'B'); rect(l, 34, 37, 3, 2, 'B'); rect(l, 38, 37, 3, 2, 'B'); });
  stamp(g, FLAME7, 32, 27);
  return g; };

// Growth Seed: the line's picture, flat: campfire, the sprouting seed, the stake's gold notch.
P['growth-seed-common'] = () => { const g = base({gy: 40, tufts: [30, 44]});
  stamp(g, CAMPFIRE, -2, 27);
  stake(g, 39, 12, 28, 18);
  seedSprout(g, 24, 42);
  return g; };

// ANY TRIGGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Prism Lens: the line's prism: one Spark goes in, two come out (the Legendary makes three).
P['prism-lens'] = () => { const g = base({gy: 41, tufts: [3, 44]});
  beam(g, 9, 26, 15, 26);
  sparkAt(g, 11, 6, 26);
  prismTri(g, 23, 13, 23);
  beam(g, 30, 21, 37, 15); beam(g, 30, 30, 37, 35);
  sparkAt(g, 11, 41, 12); sparkAt(g, 11, 41, 36);
  return g; };

// Kindling Bead: the line's cord: a Spark on the cord kindles the ember bead, which pops a Spark.
P['kindling-bead'] = () => { const g = base();
  kindling(g, {by: 30, out: [[42, 14]]});
  return g; };

// NEXT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Echo: the line's picture: a bright Spark followed by one fainter copy (II: two, III: three).
P['echo'] = () => { const g = base({gy: 39});
  echoRow(g, 24, 1);
  return g; };

// ALWAYS ON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Deep Vessel: the Spark Meter grows taller; new segments on top, still empty, under two up chevrons.
P['deep-vessel'] = () => { const g = base({gy: 41, tufts: [3, 44]});
  meterStack(g, 17, 16, 13, 25, .9);
  shape(g, l => rect(l, 17, 4, 13, 12, 'P')); rect(g, 18, 5, 11, 11, 'K'); rect(g, 17, 4, 1, 12, 'Y');
  [10].forEach(y => rect(g, 18, y, 11, 1, 'T'));
  rect(g, 14, 15, 19, 1, 'O');
  stamp(g, CHEV, 35, 5); stamp(g, CHEV, 35, 11);
  return g; };

// Tight Packing: the line's jar: Stored Sparks packed into the glass jar.
P['tight-packing'] = () => { const g = base({gy: 41, tufts: [3, 9, 40]});
  jar(g, 24, 18, 20, 23, 16);
  sparkAt(g, 11, 20, 29); sparkAt(g, 11, 28, 33); sparkAt(g, 7, 27, 24);
  rect(g, 13, 41, 22, 1, 'O');
  return g; };

// Lift Guide: the wisp glides toward rising ground; a gold arrow marks where to Lift.
P['lift-guide'] = () => { const g = base({gy: 40, tufts: [3, 11]});
  shape(g, l => { for (let x = 22; x < S; x++) { const h = Math.min(20, Math.round((x - 22) * .9)); rect(l, x, 40 - h, 1, h, 'L'); } });
  for (let x = 22; x < S; x++) { const h = Math.min(20, Math.round((x - 22) * .9)); px(g, x, 40 - h, 'M'); px(g, x, 41 - h, 'M'); }
  wisp(g, 11, 25, 6);
  trail(g, 1, 25, 3, 25, 2, 'P');
  for (let x = 19; x <= 29; x += 2) px(g, x, Math.round(25 - (x - 19) * (x - 19) * .1), 'Y');
  stamp(g, ARROW_UP, 24, 2);
  return g; };

// Lantern Lens: a lantern's round lens throws its light ring wider over the dark.
P['lantern-lens'] = () => { const g = base();
  ring(g, 24, 24, 21, 1, 'T', (x, y) => (x + y) % 3 !== 0 && y < 39);
  ring(g, 24, 24, 15, 1, 'T', (x, y) => (x + y) % 4 === 0 && y < 39);
  [[24, 2, 24, 5], [4, 24, 7, 24], [41, 24, 44, 24], [9, 9, 11, 11], [39, 9, 37, 11]].forEach(([a, b, c, d]) => line(g, a, b, c, d, 'Y'));
  shape(g, l => { rect(l, 22, 8, 4, 2, 'L'); rect(l, 18, 10, 12, 3, 'L'); rect(l, 17, 31, 14, 3, 'L'); rect(l, 18, 13, 12, 18, 'Y'); });
  rect(g, 18, 10, 12, 1, 'B'); rect(g, 17, 31, 14, 1, 'B'); rect(g, 18, 13, 1, 18, 'L'); rect(g, 29, 13, 1, 18, 'L');
  ring(g, 24, 22, 6, 1.5, 'B'); disc(g, 24, 22, 4.6, 'W'); disc(g, 25, 23, 2, 'G');
  rect(g, 23, 6, 2, 2, 'O');
  return g; };

// Proximity: the wisp skims low over the ground, sparks crackle between, a revealing ring spreads.
P['slip-feather'] = () => { const g = base({gy: 39, tufts: [5, 30, 41]});
  pulseRing(g, 26, 32, 15, (x, y) => y < 38 && x > 14);
  [[3, 27, 7], [1, 31, 9], [4, 35, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'P'));
  wisp(g, 20, 31, 6);
  [[16, 38], [21, 38], [25, 37]].forEach(([x, y]) => stamp(g, GLINT, x - 1, y - 1));
  return g; };

// Heart Stitch: a needle stitches a torn heart closed; three Sparks count the Collects.
P['tailwind'] = () => { const g = base({gy: 41, tufts: [3, 44]});
  stamp(g, HEART, 13, 15);
  for (let y = 18; y < 32; y += 3) { line(g, 23, y, 25, y + 1, 'P'); px(g, 24, y + 2, 'O'); }
  line(g, 32, 18, 42, 6, 'W'); line(g, 33, 18, 43, 6, 'P'); px(g, 41, 7, 'O');
  for (let x = 26; x < 33; x++) px(g, x, Math.round(17 - (x - 29) * (x - 29) * -.12 - 1), 'D');
  [6, 12, 18].forEach(x => sparkAt(g, 7, x, 8));
  return g; };

// Springboard: after a Spark, the wisp bounces up off a sprung plank.
P['springboard'] = () => { const g = base({gy: 40, tufts: [3, 44]});
  shape(g, l => { for (let i = 0; i < 4; i++) { rect(l, 15 + (i % 2) * 2, 35 + i, 14, 1, i % 2 ? 'D' : 'G'); } });
  shape(g, l => rect(l, 9, 32, 30, 3, 'B')); rect(g, 9, 32, 30, 1, 'P');
  wisp(g, 24, 16, 7);
  [[17, 26, 15, 29], [31, 26, 33, 29]].forEach(([a, b, c, d]) => line(g, a, b, c, d, 'Y'));
  trail(g, 24, 30, 24, 26, 3, 'P');
  sparkAt(g, 7, 37, 9); trail(g, 34, 11, 31, 13, 2);
  return g; };

// Use Doubler: a card's three use pips become six on the card beside it.
P['use-doubler'] = () => { const g = base({gy: 41, tufts: [3, 44]});
  miniCard(g, 3, 17, 13, 18);
  [6, 9, 12].forEach(x => rect(g, x, 30, 2, 2, 'B'));
  rect(g, 6, 21, 7, 1, 'B'); rect(g, 6, 23, 5, 1, 'B');
  shape(g, l => { rect(l, 18, 25, 5, 2, 'G'); rect(l, 23, 23, 1, 6, 'G'); rect(l, 24, 24, 1, 4, 'G'); rect(l, 25, 25, 1, 2, 'G'); });
  miniCard(g, 28, 10, 17, 27);
  rect(g, 31, 14, 9, 1, 'B'); rect(g, 31, 16, 7, 1, 'B');
  [[31, 25], [35, 25], [39, 25], [31, 30], [35, 30], [39, 30]].forEach(([x, y]) => { rect(g, x, y, 3, 3, 'O'); px(g, x + 1, y + 1, 'G'); });
  [[31, 25], [35, 25], [39, 25], [31, 30], [35, 30], [39, 30]].forEach(([x, y]) => { rect(g, x, y, 3, 3, 'D'); px(g, x, y, 'W'); });
  return g; };

// Twin Wick: the wisp with two Collectors sharing one orbit.
P['twin-wick'] = () => { const g = base();
  ell(g, 24, 25, 19, 8, 'T', (x, y) => !inEll(x, y, 24, 25, 18, 7));
  wisp(g, 24, 25, 7);
  ell(g, 24, 25, 19, 8, 'T', (x, y) => !inEll(x, y, 24, 25, 18, 7) && y > 26);
  collector(g, 7, 26, 4); collector(g, 41, 24, 4);
  return g; };

// Long Spool: the Collector's line runs out past its old reach (dashed ring) to a far Spark.
P['long-spool'] = () => { const g = base({gy: 41, tufts: [30, 44]});
  ring(g, 10, 30, 15, 1.3, 'C', (x, y) => Math.floor((Math.atan2(y + .5 - 30, x + .5 - 10) + Math.PI) / (Math.PI / 9)) % 2 === 0 && y < 41);
  spool(g, 10, 22, 11, 17);
  line(g, 15, 26, 36, 15, 'G'); line(g, 15, 27, 36, 16, 'D');
  collector(g, 38, 14, 5);
  sparkAt(g, 11, 40, 30);
  trail(g, 39, 20, 40, 23, 2);
  return g; };

// Cast Line: a rod casts the Collector far out on a long arc to a Spark.
P['cast-line'] = () => { const g = base({gy: 40, tufts: [20, 30, 44]});
  shape(g, l => { line(l, 3, 39, 14, 12, 'B'); line(l, 4, 39, 15, 12, 'B'); }); line(g, 3, 39, 14, 12, 'P');
  shape(g, l => { disc(l, 8, 32, 2.6, 'L'); }); px(g, 7, 31, 'B');
  for (let x = 15; x <= 37; x++) px(g, x, Math.round(12 - (x - 15) * .35 + (x - 15) * (x - 15) * .03), 'P');
  collector(g, 38, 16, 4);
  sparkAt(g, 11, 39, 29);
  trail(g, 38, 21, 39, 23, 2);
  return g; };

// Dream: the wisp sleeps in the curve of a pale moon; a gold practice path runs ahead.
P['dream'] = () => { const g = base();
  shape(g, l => {
    disc(l, 17, 23, 14, 'P', (x, y) => !inDisc(x, y, 23, 18, 12));
    disc(l, 16, 22, 13, 'Y', (x, y) => !inDisc(x, y, 23, 18, 12) && x + y < 40);
  });
  wisp(g, 20, 27, 4);
  for (let x = 28; x <= 45; x += 2) px(g, x, Math.round(26 - Math.sin((x - 28) / 5) * 8), 'G');
  [[36, 6], [43, 12], [29, 4]].forEach(([x, y]) => stamp(g, GLINT, x, y));
  return g; };

// â”€â”€ Metadata: family, 8-word idea, and the cards that continue the idea â”€â”€â”€â”€â”€â”€â”€â”€
export const COMMON_META = {
  'body-spark': {family: 'Collect', idea: 'Two Sparks drop into the wisp over grass', line: ['body-spark']},
  'spark-cache': {family: 'Collect', idea: 'Stitched pouch of Sparks, one flies to wisp', line: ['spark-cache']},
  'dusk-wick': {family: 'Collect', idea: 'Candle flame feeds on a dark Dusk Spark', line: ['dusk-wick', 'dusk-wick-ii', 'dusk-wick-iii']},
  'cluster-heart': {family: 'Collect', idea: 'A bound bunch of Sparks streams into wisp', line: ['cluster-heart']},
  'low-wick': {family: 'Collect', idea: 'Nearly empty Spark Meter; a Spark reaches the wisp', line: ['low-wick']},
  'wick-doubler': {family: 'Collect', idea: 'Wisp\'s Spark passes through glass, comes out twice', line: ['wick-doubler']},
  'glass-spool': {family: 'Collect', idea: 'Spark drops in, hourglass runs out, Collector off', line: ['glass-spool']},
  'mending-moss': {family: 'Collect', idea: 'Dim Collector on moss, Spark in, hourglass short', line: ['mending-moss']},
  'fast-spool': {family: 'Collect', idea: 'A spinning spool reels the Collector in fast', line: ['fast-spool']},
  'courier-tip': {family: 'Delivery', idea: 'Collector rushes in with a Spark, tips pop', line: ['courier-tip', 'courier-tip-iii']},
  'courier-glass': {family: 'Delivery', idea: 'Collector delivers into the glass showing two Sparks', line: ['courier-glass']},
  'crate-lining': {family: 'Delivery', idea: 'Collector delivers to the Cache chest, Sparks inside', line: ['crate-lining']},
  'return-spring': {family: 'Latch', idea: 'Collector hooks a Spark; coiled spring snaps back', line: ['return-spring']},
  'haul-winch': {family: 'Latch', idea: 'Cranked winch reels a hooked Cluster in fast', line: ['haul-winch']},
  'harvest-common': {family: 'Pulse', idea: 'Golden sheaf on the field sends one ring', line: ['harvest-common', 'harvest-rare', 'harvest-legendary']},
  'first-ripple': {family: 'Pulse', idea: 'Fresh ring lights the first Spark, others dim', line: ['first-ripple']},
  'far-shore': {family: 'Pulse', idea: 'Wide ring crosses water; near spent, far lit', line: ['far-shore']},
  'clear-prism': {family: 'Flash', idea: 'Flash bolt strikes a prism, two Sparks out', line: ['clear-prism']},
  'flash-thread': {family: 'Flash', idea: 'Flash bolt runs the hourglass out; Collector off', line: ['flash-thread']},
  'diving-bell': {family: 'Flash ends', idea: 'Spent broken Flash bolt sends one last ring', line: ['diving-bell']},
  'toll-bell': {family: 'Rhythm', idea: 'Bell rings under three evenly spaced beat Sparks', line: ['toll-bell']},
  'pacesetter': {family: 'Rhythm', idea: 'Three beats run hourglass out; Collector dashes off', line: ['pacesetter']},
  'downbeat': {family: 'Falling Lift', idea: 'Wisp falls, Lifts at the dip; Sparks pay', line: ['downbeat', 'downbeat-iii']},
  'counterweight': {family: 'Falling Lift', idea: 'Falling Lift dip runs hourglass out; Collector off', line: ['counterweight']},
  'double-lift': {family: 'Lift', idea: 'Wisp rides two stacked chevrons, upper one free', line: ['double-lift', 'climb']},
  'home-beacon': {family: 'Save', idea: 'Save heart burns atop a beacon post, Sparks', line: ['home-beacon']},
  'growth-ring': {family: 'Clear', idea: 'Cut stump shows year rings, newest one gold', line: ['growth-ring']},
  'wind-feather': {family: 'Clear', idea: 'Pale feather rides wind streaks past the flag', line: ['wind-feather']},
  'wayfarers-purse': {family: 'Clear', idea: 'At the flag, Sparks drop into the jar', line: ['wayfarers-purse']},
  'nest-egg': {family: 'Clear', idea: 'Stored jar in a nest lays a gold egg', line: ['nest-egg']},
  'camp-kit': {family: 'Rest', idea: 'Rest campfire kindles a second small ember beside', line: ['camp-kit']},
  'growth-seed-common': {family: 'Rest', idea: 'Campfire, sprouting seed and the stake\'s gold notch', line: ['growth-seed-common', 'growth-seed', 'growth-seed-legendary']},
  'prism-lens': {family: 'Any Trigger', idea: 'Prism: one Spark goes in, two come out', line: ['prism-lens', 'prism-lens-ii']},
  'kindling-bead': {family: 'Any Trigger', idea: 'Spark on cord kindles ember bead: one Spark', line: ['kindling-bead', 'kindling-bead-ii', 'kindling-bead-iii']},
  'echo': {family: 'Next card', idea: 'Bright Spark followed by one fainter copy', line: ['echo', 'echo-ii', 'echo-iii']},
  'deep-vessel': {family: 'Always on', idea: 'Spark Meter grows taller, new top segments empty', line: ['deep-vessel']},
  'tight-packing': {family: 'Always on', idea: 'Stored Sparks packed into the glass jar', line: ['tight-packing', 'tight-packing-ii', 'tight-packing-iii']},
  'lift-guide': {family: 'Always on', idea: 'Gold arrow marks where the wisp should Lift', line: ['lift-guide']},
  'lantern-lens': {family: 'Always on', idea: 'Lantern lens throws its light ring wider out', line: ['lantern-lens']},
  'slip-feather': {family: 'Always on', idea: 'Wisp skims ground, sparks crackle, revealing ring spreads', line: ['slip-feather', 'edge-reach']},
  'tailwind': {family: 'Always on', idea: 'Needle stitches a heart; three Sparks count Collects', line: ['tailwind']},
  'springboard': {family: 'Always on', idea: 'After a Spark, wisp bounces off sprung plank', line: ['springboard']},
  'use-doubler': {family: 'Always on', idea: 'Three use pips on a card become six', line: ['use-doubler']},
  'twin-wick': {family: 'Always on', idea: 'The wisp with two Collectors sharing one orbit', line: ['twin-wick', 'twin-orbit']},
  'long-spool': {family: 'Always on', idea: 'Spool line runs past the old reach ring', line: ['long-spool']},
  'cast-line': {family: 'Always on', idea: 'Rod casts the Collector far to a Spark', line: ['cast-line']},
  'dream': {family: 'Always on', idea: 'Wisp sleeps in a pale moon, gold path', line: ['dream']},
};
export const COMMON_IDS = Object.keys(COMMON_META);
export function commonGrid(id) { return P[id](); }
export const commonSvg = (id, opts) => toSvg(commonGrid(id), opts);
