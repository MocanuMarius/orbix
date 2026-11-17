// v1.0-cardart-B (Vignette), Rare and Legendary cards. Design lab only; nothing in the game imports this.
// Everything shared (toolkit, palette, sprites, objects) comes from ./kit.mjs. The four approved B pictures
// (Growth Seed, Rhythm, Resonant Harvest, Last Light) are taken from art.mjs so they stay the anchors.
// Rare: far hills and a light source (the crescent moon). Legendary: a stepped glow, a richer scene, a gold key-line.
import {
  PAL, S, grid, px, rect, disc, ring, inDisc, inEll, ell, line, stamp, recolor, shape, toSvg,
  GLINT, DUSK, FADE_A, sparkAt, trail, wisp, collector, glow, keyline, rays, moon, rareScene, legScene, WARM, COOL,
  pulseRing, CAMPFIRE, SPROUT, SEED, FLAME, FLAME_XL, HEART9, sheaf, BOLT, CARD, CHEV, CHEV_WHITE, HOURGLASS,
  hairpin, sun, bell, DIM_BELL, prismTri, beam, magnifier, crystal, candle, jar, chest, spring, spillMeter, meterStack, pool,
  spillStream, dipPath, kindling, echoRow, miniCard, SPARK11,
} from './kit.mjs';
import {pictureGrid as approvedGrid} from './art.mjs';
export {PAL};

const P = {};
// Anchors: the approved B pictures. Rhythm's full moon is swapped for the crescent (see the report: a pale full
// disc in the sky is the wisp's shape and colour at 1x; every other Rare uses the crescent).
P['growth-seed'] = () => approvedGrid('growth-seed', 'B');
P['rhythm'] = () => { const g = approvedGrid('rhythm', 'B'); rect(g, 1, 2, 10, 10, 'K'); moon(g, 6, 7); return g; };
P['harvest-legendary'] = () => approvedGrid('harvest-legendary', 'B');
P['last-light'] = () => approvedGrid('last-light', 'B');

// ─ Boost: multiply ─
// Crescendo (R): an opening hairpin; a small Spark at its point grows into two big ones at its mouth.
P['crescendo'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  hairpin(g, 5, 27, 42, 11, 41);
  sparkAt(g, 7, 12, 27);
  sparkAt(g, 11, 33, 21); sparkAt(g, 11, 33, 33);
  return g; };
// Prism Lens II (L): one Spark goes into a glass prism, three come out.
P['prism-lens-ii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [22, 25], bands: COOL, ground: 39});
  line(g, 7, 27, 15, 27, 'G'); line(g, 7, 28, 15, 28, 'D');
  [[29, 21, 37, 13], [30, 26, 37, 26], [29, 31, 37, 38]].forEach(([a, b, c, d]) => { line(g, a, b, c, d, 'G'); line(g, a, b + 1, c, d + 1, 'D'); });
  prismTri(g, 22, 12, 23);
  sparkAt(g, 7, 6, 27);
  sparkAt(g, 11, 40, 11); sparkAt(g, 11, 40, 26); sparkAt(g, 11, 40, 40);
  keyline(g);
  return g; };
// Closing Chord (R): a row of bells on a beam; the last and biggest is struck and rings out Sparks.
P['closing-chord'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37});
  shape(g, l => { rect(l, 3, 6, 42, 3, 'B'); rect(l, 3, 6, 42, 1, 'P'); rect(l, 3, 8, 42, 1, 'L'); });
  shape(g, l => { rect(l, 4, 9, 2, 34, 'B'); rect(l, 4, 9, 1, 34, 'P'); });
  [[11, 10, 8], [18, 10, 9]].forEach(([x, y, h]) => { line(g, x - 1, 9, x - 1, y - 1, 'L'); bell(g, x, y + 1, h, DIM_BELL); });
  line(g, 32, 9, 32, 11, 'D');
  bell(g, 33, 13, 20);
  ring(g, 33, 26, 16, 1, 'G', (x, y) => x > 43 && y > 14 && y < 38);
  ring(g, 33, 26, 16, 1, 'G', (x, y) => x < 23 && x > 19 && y > 18 && y < 36);
  sparkAt(g, 7, 22, 30); sparkAt(g, 7, 43, 38);
  return g; };
// Second Sun (L): a second sun, the same as the first, rises beside it; the field shines twice.
P['second-sun'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 22], bands: [[21, 'N'], [16, 'T']], ground: 36, glints: [[4, 30], [42, 31]]});
  sun(g, 14, 18, 6, 3);
  sun(g, 34, 18, 6, 3);
  rect(g, 0, 36, S, 12, 'M'); rect(g, 0, 36, S, 1, 'm');
  [[8, 37, 13], [9, 39, 11], [11, 41, 7], [12, 43, 5]].forEach(([x, y, w]) => { rect(g, x, y, w, 1, y === 37 ? 'G' : 'D'); rect(g, x + 20, y, w, 1, y === 37 ? 'G' : 'D'); });
  keyline(g);
  return g; };
// Ripple Glass (R): the Pulse ring passes its first Spark; from the second on, the glass shows it doubled.
P['ripple-glass'] = () => { const g = grid('K');
  rareScene(g, {ground: 42, hill: 35});
  pulseRing(g, 2, 42, 13, (x, y) => y < 42); pulseRing(g, 2, 42, 22, (x, y) => y < 42 && !inDisc(x, y, 30, 22, 12));
  sparkAt(g, 7, 10, 31);
  magnifier(g, 30, 22, 11);
  sparkAt(g, 7, 27, 19); sparkAt(g, 7, 33, 25);
  return g; };
// Glide Prism (R): the wisp's falling Lift dips, rises through the glass prism and comes out as two Sparks.
P['glide-prism'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36, moon: null});
  wisp(g, 6, 6, 4);
  dipPath(g, 5, 11, 11, 30, 18, 20);
  stamp(g, CHEV, 7, 32);
  prismTri(g, 28, 12, 22);
  beam(g, 35, 20, 40, 13); beam(g, 35, 28, 40, 35);
  sparkAt(g, 11, 42, 10); sparkAt(g, 11, 42, 36);
  return g; };
// Kindling Bead II (R): the line's cord, bigger flare, two Sparks.
P['kindling-bead-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  kindling(g, {by: 32, out: [[21, 12], [43, 15]]});
  return g; };
// Kindling Bead III (L): the same kindling, the big flame in a warm glow, four Sparks.
P['kindling-bead-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [31, 22], bands: WARM, ground: 41});
  kindling(g, {by: 33, big: true, out: [[19, 10], [43, 12], [12, 21], [43, 24]]});
  keyline(g);
  return g; };

// ─ Repeat ─
// Echo II (R): the line's picture: the bright Spark and two hollow copies following it.
P['echo-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 41, hill: 35});
  echoRow(g, 24, 2);
  return g; };
// Echo III (L): the same, three copies, in a glow.
P['echo-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [10, 24], bands: COOL, ground: 39});
  echoRow(g, 24, 3);
  keyline(g);
  return g; };
// Refrain (L): a looping gold arrow carries the Spark round to fire once more.
P['refrain'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 23], bands: COOL, ground: 39});
  const cx = 24, cy = 23, r = 14;
  const ang = (x, y) => { let a = Math.atan2(y + .5 - cy, x + .5 - cx) * 180 / Math.PI; return a; };
  shape(g, l => {
    ring(l, cx, cy, r, 3, 'G', (x, y) => { const a = ang(x, y); return !(a > -78 && a < -22); });
    ring(l, cx, cy, r - 2, 1, 'D', (x, y) => { const a = ang(x, y); return !(a > -78 && a < -22) && (x + y > 47); });
    ring(l, cx, cy, r, 1, 'Y', (x, y) => { const a = ang(x, y); return !(a > -78 && a < -22) && (x + y < 44); });
    for (let i = 0; i < 6; i++) rect(l, 28 + i, 10 - (5 - i), 1, (5 - i) * 2 + 1, i < 2 ? 'Y' : 'G');
  });
  sparkAt(g, 16, 24, 23);
  keyline(g);
  return g; };
// Chameleon (R): a card with a chameleon's eye and tail takes on the face of the card to its right.
P['chameleon'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37});
  miniCard(g, 28, 11, 15, 22, SPARK11);
  shape(g, l => {
    rect(l, 6, 14, 15, 22, 'm'); rect(l, 19, 15, 2, 21, 'M'); rect(l, 7, 34, 13, 2, 'M');
    disc(l, 8, 13, 4, 'm');
    ring(l, 6, 40, 3.6, 1.6, 'M', (x, y) => !(x > 6 && y < 40)); rect(l, 8, 35, 2, 3, 'M');
  });
  disc(g, 8, 13, 2, 'O'); disc(g, 8, 13, 1.2, 'Y'); px(g, 8, 12, 'O');
  stamp(g, SPARK11, 8, 19);
  trail(g, 26, 22, 22, 22, 3, 'G');
  return g; };
// Mirror Grain (R): a hand mirror gives back the Spark held up to it, as a hollow copy.
P['mirror-grain'] = () => { const g = grid('K');
  rareScene(g, {ground: 42, hill: 35});
  shape(g, l => { rect(l, 30, 30, 3, 11, 'B'); rect(l, 30, 30, 1, 11, 'P'); rect(l, 25, 40, 13, 2, 'L'); rect(l, 25, 40, 13, 1, 'B'); });
  ell(g, 31.5, 19, 10, 12.5, 'O'); ell(g, 31.5, 19, 9, 11.5, 'D'); ell(g, 31.5, 19, 9, 11.5, 'G', (x, y) => x + y < 50);
  ell(g, 31.5, 19, 7, 9.5, 'O'); ell(g, 31.5, 19, 6, 8.5, 'T');
  line(g, 27, 13, 29, 11, 'c'); line(g, 27, 15, 30, 12, 'c');
  sparkAt(g, 11, 32, 21, FADE_A[0]);
  sparkAt(g, 11, 11, 21);
  trail(g, 17, 18, 22, 18, 3, 'G');
  return g; };
// ─ Collect ─
// Dusk Wick II (R): a candle whose flame feeds on a dark Dusk Spark and throws off gold.
P['dusk-wick-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  candle(g, 25, 24, 16, 10);
  stamp(g, FLAME, 20, 8);
  sparkAt(g, 11, 9, 21, DUSK);
  trail(g, 14, 18, 18, 16, 3, 'R');
  sparkAt(g, 7, 38, 9); sparkAt(g, 7, 41, 19);
  return g; };
// Dusk Wick III (L): a taller candle blazing on the Dusk Spark in a warm glow, gold all round.
P['dusk-wick-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [25, 17], bands: WARM, ground: 42});
  candle(g, 25, 22, 18, 12);
  stamp(g, FLAME_XL, 18, 3);
  sparkAt(g, 11, 9, 24, DUSK);
  trail(g, 14, 20, 18, 17, 3, 'R');
  sparkAt(g, 7, 38, 7); sparkAt(g, 7, 41, 17); sparkAt(g, 7, 39, 27); sparkAt(g, 7, 11, 9);
  keyline(g);
  return g; };
// ─ Stored ─
// Tight Packing II (R): a glass jar crammed with three Sparks, its lid bulging.
P['tight-packing-ii'] = () => { const g = grid('K');
  rareScene(g, {ground: 42, hill: 35});
  jar(g, 24, 17, 22, 25, 18);
  sparkAt(g, 11, 19, 25); sparkAt(g, 11, 29, 27); sparkAt(g, 11, 22, 35);
  sparkAt(g, 7, 30, 36);
  rect(g, 12, 42, 24, 1, 'O');
  return g; };
// Tight Packing III (L): a bigger jar bursting with Sparks, the lid strapped down, in a warm glow.
P['tight-packing-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 26], bands: WARM, ground: 41});
  jar(g, 24, 14, 26, 27, 22, {strap: true});
  sparkAt(g, 11, 18, 21); sparkAt(g, 11, 29, 21); sparkAt(g, 11, 23, 30); sparkAt(g, 11, 31, 33);
  sparkAt(g, 7, 17, 34); sparkAt(g, 7, 30, 13); sparkAt(g, 7, 12, 10); sparkAt(g, 7, 39, 9);
  keyline(g);
  return g; };

// ─ Collector ─
// Courier Tip III (L): the Collector delivers its Spark and five tip Sparks fan out, in a glow.
P['courier-tip-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [20, 25], bands: [[17, 'N'], [13, 'T']], ground: 40});
  [[1, 21, 6], [3, 26, 7], [1, 31, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 17, 26, 8);
  sparkAt(g, 16, 31, 23);
  [[24, 8], [32, 5], [40, 9], [43, 18], [42, 30]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  rect(g, 10, 42, 16, 1, 'O');
  keyline(g);
  return g; };
// Cache Handling (R): the Collector carries a Spark chest home on its line.
P['cache-handling'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  line(g, 29, 16, 20, 24, 'P'); line(g, 30, 17, 21, 25, 'O');
  collector(g, 34, 12, 7);
  [[42, 20, 4], [44, 24, 3]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'T'));
  chest(g, 7, 24, 20);
  rect(g, 9, 44, 16, 1, 'O');
  return g; };
// Twin Orbit (R): two Collectors circle the wisp on one shared orbit.
P['twin-orbit'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37});
  ell(g, 24, 25, 19, 8.5, 'C', (x, y) => !inEll(x, y, 24, 25, 18, 7.5) && y >= 25);
  ell(g, 24, 25, 19, 8.5, 'T', (x, y) => !inEll(x, y, 24, 25, 18, 7.5) && y < 25);
  wisp(g, 24, 24, 7);
  ell(g, 24, 25, 19, 8.5, 'C', (x, y) => !inEll(x, y, 24, 25, 18, 7.5) && y >= 27 && Math.abs(x - 24) < 10);
  collector(g, 8, 29, 5); collector(g, 40, 20, 5);
  trail(g, 14, 33, 18, 33, 3, 'c'); trail(g, 34, 17, 30, 17, 3, 'c');
  return g; };
// Watchlight (R): the Collector catches the falling wisp just above the rocks and rings out a Pulse.
P['watchlight'] = () => { const g = grid('K');
  rareScene(g, {ground: 46, hill: 33});
  [[22, 9, 4], [26, 6, 3], [30, 8, 2]].forEach(([x, y, h]) => rect(g, x, y, 1, h, 'P'));
  pulseRing(g, 24, 29, 15, (x, y) => y < 36 && y > 18 && Math.abs(x + .5 - 24) > 9);
  shape(g, l => {
    [[0, 9], [8, 13], [17, 8], [27, 12], [36, 9], [44, 11]].forEach(([x0, h]) => {
      for (let i = 0; i < h; i++) { const half = Math.round(i * .55); rect(l, x0 + 4 - half, 47 - h + i, half * 2 + 1, 1, 'L'); px(l, x0 + 4 - half, 47 - h + i, 'B'); }
    });
  });
  wisp(g, 24, 16, 6);
  collector(g, 24, 30, 7);
  return g; };
// ─ Overfill ─
// Ring Spring (R): the meter overfills, the hourglass runs out early and a spring flings the Collector back.
P['ring-spring'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  spillMeter(g, 36, 17, 26);
  stamp(g, HOURGLASS, 20, 4);
  spring(g, 6, 43, 16, 32, 2);
  [[10, 25], [14, 24], [18, 25]].forEach(([x, y]) => rect(g, x, y, 1, 3, 'c'));
  collector(g, 14, 16, 6);
  return g; };
// Ring Spring II (L): the same, a taller double spring flinging the Collector high, in a glow.
P['ring-spring-ii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [15, 13], bands: WARM, ground: 42, glints: [[5, 4], [43, 30]]});
  spillMeter(g, 36, 17, 25, {drops: 2});
  stamp(g, HOURGLASS, 21, 3);
  spring(g, 5, 43, 18, 28, 3);
  [[10, 20], [14, 19], [18, 20]].forEach(([x, y]) => rect(g, x, y, 1, 4, 'c'));
  collector(g, 14, 11, 6);
  keyline(g);
  return g; };
// Spillway (R): the meter overfills; the first drop just splashes, the second rings out a Pulse.
P['spillway'] = () => { const g = grid('K');
  rareScene(g, {ground: 40, hill: 33});
  spillMeter(g, 35, 15, 25, {drops: 1});
  spillStream(g, 33, 13, 13, 39);
  pulseRing(g, 13, 40, 9, (x, y) => y < 40);
  [[25, 39], [27, 38], [23, 38]].forEach(([x, y]) => px(g, x, y, 'D'));
  rect(g, 24, 33, 2, 3, 'O'); rect(g, 24, 33, 1, 2, 'G');
  return g; };
// Spillway II (L): every drop rings: Pulse rings spreading wide, in a glow.
P['spillway-ii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [15, 34], bands: COOL, ground: 40, glints: [[5, 4], [16, 9], [27, 3]]});
  spillMeter(g, 35, 15, 25, {drops: 2});
  spillStream(g, 33, 13, 14, 39);
  pulseRing(g, 14, 40, 7, (x, y) => y < 40); pulseRing(g, 14, 40, 13, (x, y) => y < 40); pulseRing(g, 26, 40, 5, (x, y) => y < 40);
  rect(g, 25, 31, 2, 3, 'O'); rect(g, 25, 31, 1, 2, 'W');
  keyline(g);
  return g; };
// ─ Flash ─
// Flash Handling (R): the Collector carries a lightning Flash; its light bursts out and pushes the dark back.
P['flash-handling'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37, moon: null});
  glow(g, 30, 16, [[13, 'N'], [10, 'L']]);
  rays(g, 30, 16, 11, 16, 'G');
  stamp(g, BOLT, 24, 7);
  line(g, 25, 24, 19, 29, 'P'); line(g, 26, 24, 20, 29, 'O');
  collector(g, 14, 32, 7);
  [[3, 30, 4], [1, 34, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'T'));
  return g; };
// Flash Bank (R): a Flash bolt strikes a nearly empty Spark Meter and fills it.
P['flash-bank'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36, moon: null});
  meterStack(g, 25, 12, 13, 31, .3);
  stamp(g, BOLT, 6, 3);
  rays(g, 31, 10, 4, 7, 'G');
  trail(g, 20, 16, 24, 14, 3, 'G');
  sparkAt(g, 7, 43, 22); sparkAt(g, 7, 15, 31);
  return g; };

// ─ Pulse ─
// Resonant Harvest (R): the bound sheaf in a moonlit field, one Pulse ring passing over two Sparks.
P['harvest-rare'] = () => { const g = grid('K');
  rareScene(g, {ground: 38, hill: 31, groundCh: 'M', top: 'm'});
  for (let x = 1; x < S; x += 4) px(g, x, 37, 'D');
  pulseRing(g, 24, 30, 19, (x, y) => y < 38);
  sheaf(g, 24, 43, {tall: 27});
  sparkAt(g, 7, 7, 22); sparkAt(g, 7, 41, 22);
  return g; };
// Edge Reach (R): Proximity's picture with depth: the wisp skims low; its Pulse reaches past the old ring.
P['edge-reach'] = () => { const g = grid('K');
  rareScene(g, {ground: 40, hill: 33});
  ring(g, 22, 33, 12, 1, 'C', (x, y) => y < 40 && (x + y) % 3 === 0);
  pulseRing(g, 22, 33, 21, (x, y) => y < 39);
  [[3, 29, 7], [1, 33, 9], [4, 37, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'P'));
  wisp(g, 17, 33, 5);
  [[14, 39], [19, 39], [23, 38]].forEach(([x, y]) => stamp(g, GLINT, x - 1, y - 1));
  return g; };
// ─ Lift ─
// Climb (R): the wisp rides up on three stacked chevrons (the upper two pale, free); the third rings a Pulse.
P['climb'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 37});
  stamp(g, CHEV, 25, 35); stamp(g, CHEV_WHITE, 25, 28); stamp(g, CHEV_WHITE, 25, 21);
  pulseRing(g, 29, 11, 11, (x, y) => y < 20);
  wisp(g, 29, 11, 6);
  return g; };
// ─ Falling Lift ─
// Downbeat III (L): the line's dip: the wisp falls, Lifts at the bottom, and five Sparks burst round it.
P['downbeat-iii'] = () => { const g = grid('K');
  legScene(g, {glowAt: [31, 14], bands: COOL, ground: 41, glints: [[43, 40], [4, 38]]});
  dipPath(g, 4, 4, 15, 31, 25, 17);
  stamp(g, CHEV, 11, 33);
  wisp(g, 31, 13, 6);
  [[42, 6], [43, 19], [38, 28], [21, 5], [23, 25]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  keyline(g);
  return g; };
// ─ Rest ─
// Growth Seed (L): the sapling by the campfire towers past the top of its stake, in a warm glow.
P['growth-seed-legendary'] = () => { const g = grid('K');
  legScene(g, {glowAt: [24, 21], bands: [[18, 'N'], [14, 'T']], ground: 36, groundCh: 'L', top: 'M', glints: [[4, 3], [15, 6], [30, 2]]});
  rect(g, 0, 37, 26, 3, 'B'); rect(g, 0, 37, 15, 1, 'D');
  stamp(g, CAMPFIRE, -2, 25);
  shape(g, l => rect(l, 39, 12, 4, 28, 'B')); rect(g, 39, 12, 1, 28, 'P');
  [18, 24, 30, 36].forEach(y => rect(g, 39, y, 3, 1, 'O'));
  shape(g, l => rect(l, 37, 14, 8, 2, 'D'));
  shape(g, l => rect(l, 37, 5, 8, 2, 'G'));
  stamp(g, SPROUT, 12, 7); stamp(g, SPROUT, 12, 19);
  stamp(g, SEED, 19, 32);
  keyline(g);
  return g; };
// ─ Eater ─
// Devourer (R): wine jaws clamp on a Rare card (blue jewel) and a heart rises free.
P['devourer'] = () => { const g = grid('K');
  rareScene(g, {ground: 44, hill: 37});
  const RARE_CARD = recolor(CARD, {T: 'O', C: 'T', c: 'c'});
  shape(g, l => {
    for (let x = 0; x <= 30; x++) { const t = Math.round(5 + (x / 30) ** 2 * 9); rect(l, x, t, 1, 18 - t, 'R'); px(l, x, t, 'E'); }
    for (let x = 0; x <= 30; x++) { const b = Math.round(43 - (x / 30) ** 2 * 7); rect(l, x, 31, 1, b - 31, 'R'); px(l, x, b - 1, 'L'); }
  });
  rect(g, 0, 18, 30, 13, 'K');
  for (let x = 4; x < 30; x += 5) { stamp(g, ['OWWWO', '.OWO.', '..O..'], x, 18); stamp(g, ['..O..', '.OWO.', 'OWWWO'], x, 28); }
  stamp(g, RARE_CARD, 22, 17);
  disc(g, 9, 11, 2.8, 'O'); disc(g, 9, 11, 2, 'G'); px(g, 8, 10, 'W');
  stamp(g, HEART9, 37, 6);
  trail(g, 37, 16, 35, 19, 2, 'E');
  return g; };
// Ember Feeder (R): a little stove eats two cards; a Spark rises from it with an up arrow (+1 max).
P['ember-feeder'] = () => { const g = grid('K');
  rareScene(g, {ground: 43, hill: 36});
  shape(g, l => { rect(l, 20, 6, 5, 14, 'L'); rect(l, 20, 6, 1, 14, 'B'); });
  shape(g, l => {
    ell(l, 22, 30, 11, 10, 'L'); ell(l, 21, 28, 8, 6, 'B', (x, y) => x < 21); rect(l, 11, 39, 23, 2, 'L');
    rect(l, 13, 40, 3, 3, 'L'); rect(l, 28, 40, 3, 3, 'L'); rect(l, 10, 21, 25, 2, 'B');
  });
  shape(g, l => { rect(l, 16, 27, 12, 8, 'E'); rect(l, 17, 30, 10, 5, 'G'); rect(l, 19, 32, 5, 3, 'W'); });
  stamp(g, recolor(CARD, {}), 36, 22); stamp(g, CARD, 30, 28);
  sparkAt(g, 7, 22, 2 + 0);
  shape(g, l => { for (let i = 0; i < 4; i++) rect(l, 30 - i, 4 + i, 1 + i * 2, 1, 'G'); rect(l, 29, 8, 3, 6, 'G'); });
  return g; };

// Family (sheet grouping) and the picture idea in about 8 words, for manifest-rare.json.
export const FAMILIES = ['Boost', 'Repeat', 'Collect', 'Collector', 'Overfill', 'Flash', 'Pulse', 'Lift', 'Falling Lift', 'Rest & Save', 'Stored', 'Eater'];
export const META = {
  'crescendo': {family: 'Boost', idea: 'Opening hairpin: one small Spark grows into two'},
  'prism-lens-ii': {family: 'Boost', idea: 'Glass prism splits one Spark into three Sparks'},
  'closing-chord': {family: 'Boost', idea: 'Row of bells; the last, biggest bell rings'},
  'second-sun': {family: 'Boost', idea: 'Two equal suns side by side, field shines twice'},
  'ripple-glass': {family: 'Boost', idea: 'Pulse ring passes; the glass doubles the next Spark'},
  'glide-prism': {family: 'Boost', idea: 'Falling-Lift dip rises through prism, two Sparks out'},
  'kindling-bead-ii': {family: 'Boost', idea: 'Spark on cord kindles ember bead: two Sparks'},
  'kindling-bead-iii': {family: 'Boost', idea: 'Kindled bead flares big in glow, four Sparks'},
  'echo-ii': {family: 'Repeat', idea: 'Bright Spark followed by two hollow fading copies'},
  'echo-iii': {family: 'Repeat', idea: 'Bright Spark followed by three hollow fading copies'},
  'refrain': {family: 'Repeat', idea: 'Looping arrow carries the Spark round once more'},
  'chameleon': {family: 'Repeat', idea: 'Chameleon card takes on the next card\'s face'},
  'mirror-grain': {family: 'Repeat', idea: 'Hand mirror reflects a Spark as a hollow copy'},
  'dusk-wick-ii': {family: 'Collect', idea: 'Candle flame feeds on a dark Dusk Spark'},
  'dusk-wick-iii': {family: 'Collect', idea: 'Tall candle blazes on Dusk Spark, glowing, many Sparks'},
  'courier-tip-iii': {family: 'Collector', idea: 'Collector delivers a Spark, five tip Sparks fanning'},
  'cache-handling': {family: 'Collector', idea: 'Collector carries a Spark chest home on a line'},
  'twin-orbit': {family: 'Collector', idea: 'Two Collectors orbit the wisp on one ring'},
  'watchlight': {family: 'Collector', idea: 'Collector cushions the falling wisp above sharp rocks'},
  'ring-spring': {family: 'Overfill', idea: 'Spilling meter, hourglass short, spring flings the Collector'},
  'ring-spring-ii': {family: 'Overfill', idea: 'Spilling meter, hourglass, double spring flings Collector high'},
  'spillway': {family: 'Overfill', idea: 'Meter spills; second drop rings out a Pulse'},
  'spillway-ii': {family: 'Overfill', idea: 'Meter spills; every drop rings out a Pulse'},
  'flash-handling': {family: 'Flash', idea: 'Collector carries a lightning Flash, light bursting out'},
  'flash-bank': {family: 'Flash', idea: 'Flash bolt strikes a nearly empty Spark Meter'},
  'harvest-rare': {family: 'Pulse', idea: 'Golden sheaf in moonlit field, Pulse ring passing'},
  'harvest-legendary': {family: 'Pulse', idea: 'Struck sheaf in glowing field rings Sparks outward'},
  'rhythm': {family: 'Pulse', idea: 'Metronome on night hill, three even Spark beats'},
  'edge-reach': {family: 'Pulse', idea: 'Wisp skims the ground; Pulse reaches past old ring'},
  'climb': {family: 'Lift', idea: 'Wisp rides three chevrons; a Pulse at the top'},
  'downbeat-iii': {family: 'Falling Lift', idea: 'Wisp falls, Lifts at the dip, five Sparks burst'},
  'growth-seed': {family: 'Rest & Save', idea: 'Sprout by campfire outgrows the stake notch'},
  'growth-seed-legendary': {family: 'Rest & Save', idea: 'Tall sapling by campfire towers past stake, glowing'},
  'last-light': {family: 'Rest & Save', idea: 'Small flame held in the Save heart'},
  'tight-packing-ii': {family: 'Stored', idea: 'Glass jar crammed with three Sparks, lid bulging'},
  'tight-packing-iii': {family: 'Stored', idea: 'Big jar bursting with Sparks, lid strapped, glowing'},
  'devourer': {family: 'Eater', idea: 'Wine jaws clamp a Rare card; a heart rises'},
  'ember-feeder': {family: 'Eater', idea: 'Stove eats two cards; the meter grows a notch'},
};

export const RARE_IDS = Object.keys(P);
export function pictureGrid(id) { return P[id](); }
export const pictureSvg = (id, opts) => toSvg(pictureGrid(id), opts);
