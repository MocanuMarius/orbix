// v1.0-cardart-B ("Vignette"): the engine cards (v1.0-engine, docs/engine-cards.md). Design lab only.
// Same kit, same rarity rules. Family devices: makers show one thing turning into another; Timers show a
// dial or a burning wick; starters show the wisp doing the starting action; governors shape the Turn;
// Pack cards show the Spark Meter emptying into the Stored-Sparks jar at journey's end; Black Hole is a dark
// disc with a bright rim pulling the card to its right in.
import {
  PAL, S, grid, px, rect, disc, ring, inDisc, ell, line, stamp, recolor, shape, toSvg,
  SPARK11, SPARK7, GLINT, FADE_A, sparkAt, trail, wisp, collector, streaks, scene, rareScene, legScene, keyline, rays, glow,
  WARM, COOL, pulseRing, HEART, SMALL_FLAME, FLAME, bell, metronome, pendulum, dial, meterStack, spillMeter,
  openJar, jar, BOLT, BOLT_SPENT, CHEV, CARD, miniCard,
} from './kit.mjs';
export {PAL};

const common = opts => { const g = grid('N'); scene(g, opts); return g; };
const rare = opts => { const g = grid('K'); rareScene(g, opts); return g; };
const legend = opts => { const g = grid('K'); legScene(g, opts); return g; };
const EMBER_BELL = {body: 'E', hi: 'G', hi2: 'Y', shade: 'R', lip: 'R', clap: 'L'};
// Pack: the Spark Meter (left) empties through a spout into the open jar (right) at journey's end.
function pack(g, {mx = 3, my = 12, mh = 27, jx = 31, jy = 22, jw = 18, jh = 18, frac = .45} = {}) {
  meterStack(g, mx, my, 10, mh, frac);
  shape(g, l => { rect(l, mx + 10, my + mh - 6, 5, 3, 'B'); rect(l, mx + 10, my + mh - 6, 5, 1, 'P'); });
  for (let x = mx + 15, i = 0; x < jx - 6; x++, i++) { const y = my + mh - 5 + Math.round(i * i * .06); px(g, x, y, 'G'); px(g, x, y + 1, 'D'); }
  openJar(g, jx, jy, jw, jh);
}
// A bell hung from a short wooden arm.
function hungBell(g, cx, top, h, colours) {
  shape(g, l => { rect(l, cx - 10, top - 6, 20, 2, 'B'); rect(l, cx - 10, top - 6, 2, 8, 'B'); }); rect(g, cx - 10, top - 6, 20, 1, 'P');
  line(g, cx - 1, top - 4, cx - 1, top - 3, 'L');
  bell(g, cx, top, h, colours);
}

const P = {};
// ─ Makers ─
// Spark Chime (C): a Pulse ring strikes a small bell, and the bell drops a Spark.
P['spark-chime'] = () => { const g = common();
  pulseRing(g, -4, 24, 15, (x, y) => y < 39); pulseRing(g, -4, 24, 9, (x, y) => y < 39);
  hungBell(g, 23, 13, 13);
  trail(g, 29, 30, 34, 33, 3);
  sparkAt(g, 11, 39, 32);
  return g; };
// Ember Bell (C): a Spark comes in and the glowing ember bell sends a Pulse ring out.
P['ember-bell'] = () => { const g = common();
  sparkAt(g, 11, 7, 7); trail(g, 12, 10, 16, 13, 3);
  pulseRing(g, 26, 22, 17, (x, y) => y < 39 && Math.abs(x + .5 - 26) > 10);
  hungBell(g, 26, 15, 15, EMBER_BELL);
  return g; };
// Afterglow (C): a spent Flash bolt fades and leaves two Sparks behind.
P['afterglow'] = () => { const g = common();
  stamp(g, BOLT_SPENT, 7, 6);
  [[22, 10], [5, 26], [25, 25]].forEach(([x, y]) => stamp(g, GLINT, x, y));
  trail(g, 17, 22, 26, 27, 4, 'G');
  sparkAt(g, 11, 32, 30); sparkAt(g, 11, 41, 18);
  return g; };
// Flash Tinder (R): the wisp takes a Spark and a short Flash bolt bursts out of it.
P['flash-tinder'] = () => { const g = rare({ground: 43, hill: 37});
  sparkAt(g, 7, 4, 24); trail(g, 8, 26, 11, 28, 2);
  wisp(g, 17, 32, 6);
  rays(g, 34, 14, 9, 13, 'G');
  stamp(g, BOLT, 28, 5);
  trail(g, 22, 26, 26, 22, 3, 'Y');
  return g; };
// Homing Thread (R): the Collector delivers its Spark and a gold thread loops it straight back out to the next.
P['homing-thread'] = () => { const g = rare({ground: 43, hill: 37});
  wisp(g, 9, 33, 5);
  sparkAt(g, 7, 17, 31);
  for (let a = 0; a <= 180; a += 6) { const t = a * Math.PI / 180, x = Math.round(32 + 9 * Math.cos(t)), y = Math.round(25 - 9 * Math.sin(t)); px(g, x, y, 'G'); px(g, x, y + 1, 'D'); }
  shape(g, l => { for (let i = 0; i < 4; i++) rect(l, 41 - i, 25 + i, 1 + i * 2, 1, 'G'); });
  collector(g, 25, 28, 6);
  sparkAt(g, 11, 41, 12);
  return g; };
// Overflow Bell (R): the meter overfills, the spill strikes a bell that rings a Pulse; two drops are kept in a jar.
P['overflow-bell'] = () => { const g = rare({ground: 43, hill: 36});
  spillMeter(g, 36, 18, 25, {drops: 1});
  for (let i = 0; i <= 12; i++) { const x = 33 - i, y = 17 + Math.round(i * i * .05); px(g, x, y, 'G'); px(g, x, y + 1, 'D'); }
  pulseRing(g, 14, 23, 14, (x, y) => y < 43 && Math.abs(x + .5 - 14) > 9);
  bell(g, 14, 15, 14);
  sparkAt(g, 7, 27, 37);
  return g; };

// ─ Timers ─
// Slow Wick (C): a fat fuse wick in a pot burns slowly down its time marks, sending a Pulse.
P['slow-wick'] = () => { const g = common({gy: 41, tufts: [3, 44]});
  shape(g, l => { rect(l, 17, 33, 14, 8, 'B'); rect(l, 16, 32, 16, 2, 'B'); });
  rect(g, 16, 32, 16, 1, 'P'); rect(g, 17, 34, 1, 7, 'P'); rect(g, 30, 34, 1, 7, 'L');
  shape(g, l => { rect(l, 22, 14, 4, 18, 'P'); rect(l, 22, 14, 1, 18, 'Y'); rect(l, 25, 14, 1, 18, 'B'); rect(l, 22, 14, 4, 3, 'L'); });
  [20, 25, 30].forEach(y => rect(g, 22, y, 4, 1, 'O'));
  stamp(g, SMALL_FLAME, 21, 7);
  pulseRing(g, 23, 11, 11, (x, y) => y < 22 && x > 28);
  pulseRing(g, 23, 11, 11, (x, y) => y < 22 && x < 18);
  return g; };
// Metronome (R): the Rhythm metronome with a Timer dial, firing the card to its right on each tick.
P['metronome'] = () => { const g = rare({ground: 43, hill: 37});
  metronome(g, 17, 44, {lit: true});
  pendulum(g, 17, 44, 25, 16);
  dial(g, 39, 10, 6, {frac: .5});
  miniCard(g, 33, 26, 11, 15, SPARK7);
  trail(g, 27, 20, 31, 24, 3, 'G');
  return g; };
// Long Fuse (R): a long coiled fuse burns in toward a hollow copy: the Chain's last firing, again.
P['long-fuse'] = () => { const g = rare({ground: 42, hill: 35});
  const pts = []; for (let t = 0; t <= 15.5; t += .05) { const r = 5 + t * 1.15; pts.push([Math.round(22 + r * Math.cos(t)), Math.round(24 + r * .75 * Math.sin(t))]); }
  pts.forEach(([x, y], i) => { px(g, x, y + 1, 'O'); px(g, x, y, i > pts.length - 30 ? 'L' : 'B'); });
  const [ex, ey] = pts.at(-30);
  stamp(g, SMALL_FLAME, ex - 2, ey - 7);
  sparkAt(g, 11, 22, 24, FADE_A[0]);
  return g; };
// Heartbeat (L): a heart with a bright pulse line through it; the Timer dial beside it runs at half time.
P['heartbeat'] = () => { const g = legend({glowAt: [22, 26], bands: WARM, ground: 41});
  stamp(g, HEART, 11, 16);
  const ecg = [[2, 26], [9, 26], [12, 22], [15, 31], [19, 14], [23, 34], [26, 26], [45, 26]];
  for (let i = 1; i < ecg.length; i++) { line(g, ecg[i - 1][0], ecg[i - 1][1] - 1, ecg[i][0], ecg[i][1] - 1, 'O'); line(g, ecg[i - 1][0], ecg[i - 1][1], ecg[i][0], ecg[i][1], 'W'); line(g, ecg[i - 1][0], ecg[i - 1][1] + 1, ecg[i][0], ecg[i][1] + 1, 'G'); }
  dial(g, 39, 12, 6, {frac: .5});
  keyline(g);
  return g; };

// ─ Starters ─
// First Catch (C): the wisp catches the flight's first Spark and a Pulse ring goes out from it.
P['first-catch'] = () => { const g = common();
  pulseRing(g, 21, 26, 14, (x, y) => y < 39);
  wisp(g, 21, 26, 7);
  sparkAt(g, 11, 33, 15);
  return g; };
// Close Call (R): the wisp grazes a rock tip; sparks crackle, a Pulse ring goes out, a Spark is won.
P['close-call'] = () => { const g = rare({ground: 46, hill: 33});
  shape(g, l => { for (let i = 0; i < 20; i++) { const half = Math.round(i * .6); rect(l, 20 - half, 27 + i, half * 2 + 1, 1, 'L'); px(l, 20 - half, 27 + i, 'B'); } });
  pulseRing(g, 23, 20, 12, (x, y) => y < 24);
  [[1, 17, 8], [3, 21, 9], [1, 25, 6]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'P'));
  wisp(g, 23, 20, 5);
  [[17, 26], [22, 27], [26, 26]].forEach(([x, y]) => stamp(g, GLINT, x - 1, y - 1));
  sparkAt(g, 11, 40, 11);
  return g; };
// Low Ember (R): the meter is down to its last ember; the wisp Lifts on a chevron and a Pulse goes out.
P['low-ember'] = () => { const g = rare({ground: 43, hill: 36});
  meterStack(g, 5, 10, 11, 31, .16);
  for (let y = 0; y < S; y++) for (let x = 6; x < 15; x++) { const c = g[y][x]; if (y > 30 && y < 40) g[y][x] = c === 'G' ? 'E' : c === 'Y' ? 'G' : c === 'D' ? 'R' : c === 'W' ? 'G' : c; }
  pulseRing(g, 31, 17, 11, (x, y) => y < 25);
  wisp(g, 31, 17, 6);
  stamp(g, CHEV, 27, 27);
  return g; };

// ─ Governors ─
// Third Beat (R): on the Turn track, two plain beats and a third that counts twice.
P['third-beat'] = () => { const g = rare({ground: 43, hill: 37});
  ell(g, 24, 28, 20, 9, 'C', (x, y) => !((x + .5 - 24) ** 2 / 361 + (y + .5 - 28) ** 2 / 64 <= 1));
  shape(g, l => { for (let i = 0; i < 4; i++) rect(l, 4 + i, 22 - i, 1, 1 + i * 2, 'C'); });
  sparkAt(g, 7, 13, 36); sparkAt(g, 7, 24, 38);
  sparkAt(g, 11, 34, 32, FADE_A[0]); sparkAt(g, 11, 38, 36);
  trail(g, 17, 37, 20, 38, 2, 'D'); trail(g, 28, 38, 31, 37, 2, 'D');
  return g; };
// Momentum (L): a flywheel spun up to speed, its light growing brighter.
P['momentum'] = () => { const g = legend({glowAt: [24, 24], bands: [[19, 'N'], [15, 'L'], [12, 'B']], ground: 40});
  rays(g, 24, 24, 15, 19, 'G');
  ring(g, 24, 24, 12, 1, 'O'); ring(g, 24, 24, 11, 3, 'D'); ring(g, 24, 24, 11, 1, 'G', (x, y) => x + y < 47); ring(g, 24, 24, 8, 1, 'O');
  for (let k = 0; k < 5; k++) { const t = k * 2 * Math.PI / 5 - Math.PI / 2; line(g, 24, 24, Math.round(24 + Math.cos(t) * 8), Math.round(24 + Math.sin(t) * 8), 'D'); }
  disc(g, 24, 24, 3, 'O'); disc(g, 24, 24, 2, 'G'); px(g, 23, 23, 'W');
  for (let a = 200; a <= 290; a += 4) { const t = a * Math.PI / 180; px(g, Math.round(24 + Math.cos(t) * 14.5), Math.round(24 + Math.sin(t) * 14.5), 'Y'); }
  for (let a = 20; a <= 110; a += 4) { const t = a * Math.PI / 180; px(g, Math.round(24 + Math.cos(t) * 14.5), Math.round(24 + Math.sin(t) * 14.5), 'Y'); }
  keyline(g);
  return g; };

// ─ Pack ─
// Full Satchel (C): at journey's end the meter empties into the jar, and three more Sparks drop in.
P['full-satchel'] = () => { const g = common({gy: 41, tufts: [24, 44]});
  pack(g);
  sparkAt(g, 7, 26, 6); sparkAt(g, 7, 34, 4); sparkAt(g, 7, 42, 7);
  trail(g, 34, 10, 34, 14, 3);
  sparkAt(g, 11, 30, 30); sparkAt(g, 7, 35, 35);
  return g; };
// Last Round (R): the meter empties into the jar, and the jar sends one last Pulse ring.
P['last-round'] = () => { const g = rare({ground: 43, hill: 37, moon: [41, 7]});
  pulseRing(g, 32, 31, 15, (x, y) => y < 43 && x > 20);
  pack(g, {mx: 3, my: 14, mh: 27, jx: 32, jy: 25});
  sparkAt(g, 11, 31, 33);
  return g; };
// Harvest Home (L): the meter empties into the jar while every Collect card adds its Spark from all round.
P['harvest-home'] = () => { const g = legend({glowAt: [31, 30], bands: WARM, ground: 42});
  pack(g, {mx: 3, my: 14, mh: 27, jx: 31, jy: 25, jw: 20, jh: 17});
  sparkAt(g, 11, 29, 33); sparkAt(g, 7, 35, 30);
  [[20, 9], [31, 6], [42, 10], [44, 22]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  trail(g, 31, 11, 31, 17, 3); trail(g, 41, 13, 37, 19, 3); trail(g, 22, 13, 26, 18, 3);
  keyline(g);
  return g; };

// ─ Black Hole ─
// Black Hole (R): a dark disc with a bright rim pulls the card to its right in, stretching it.
P['black-hole'] = () => { const g = rare({ground: 44, hill: 38});
  ell(g, 19, 24, 17, 7, 'O'); ell(g, 19, 24, 16, 6, 'E'); ell(g, 19, 24, 16, 6, 'G', (x, y) => y === 23 || y === 24);
  disc(g, 19, 24, 11, 'O'); disc(g, 19, 24, 10, 'G'); disc(g, 19, 24, 9, 'K');
  ell(g, 19, 24, 16, 6, 'E', (x, y) => y > 24 && !inDisc(x, y, 19, 24, 10)); ell(g, 19, 24, 16, 6, 'O', (x, y) => y > 24 && inDisc(x, y, 19, 24, 10.6) && !inDisc(x, y, 19, 24, 10));
  stamp(g, recolor(CARD, {}), 32, 17);
  [[30, 19, 2], [29, 23, 3], [30, 27, 2], [29, 31, 2]].forEach(([x, y, w]) => rect(g, x, y, w, 1, 'P'));
  sparkAt(g, 7, 41, 9);
  return g; };

export const ENGINE_META = {
  'spark-chime': {family: 'Engine · maker', idea: 'Pulse ring strikes small bell; bell drops Spark'},
  'ember-bell': {family: 'Engine · maker', idea: 'Spark comes in; glowing ember bell rings Pulse'},
  'afterglow': {family: 'Engine · maker', idea: 'Spent Flash bolt fades, leaving two Sparks behind'},
  'flash-tinder': {family: 'Engine · maker', idea: 'Wisp takes a Spark; a short Flash bursts'},
  'homing-thread': {family: 'Engine · maker', idea: 'Collector delivers; gold thread loops it back out'},
  'overflow-bell': {family: 'Engine · maker', idea: 'Spill strikes a bell ringing Pulse; jar keeps two'},
  'slow-wick': {family: 'Engine · Timer', idea: 'Fat fuse wick burns slowly down time marks'},
  'metronome': {family: 'Engine · Timer', idea: 'Metronome with Timer dial fires the next card'},
  'long-fuse': {family: 'Engine · Timer', idea: 'Long coiled fuse burns toward a hollow copy'},
  'heartbeat': {family: 'Engine · Timer', idea: 'Heart with pulse line; dial at half time'},
  'first-catch': {family: 'Engine · starter', idea: 'Wisp catches the first Spark, sends a ring'},
  'close-call': {family: 'Engine · starter', idea: 'Wisp grazes a rock tip; ring and Spark'},
  'low-ember': {family: 'Engine · starter', idea: 'Last ember in meter; wisp Lifts, sends Pulse'},
  'third-beat': {family: 'Engine · governor', idea: 'Turn track: two beats, the third counts twice'},
  'momentum': {family: 'Engine · governor', idea: 'Flywheel spun up to speed, its light brightening'},
  'full-satchel': {family: 'Pack', idea: 'Meter empties into jar; three more Sparks drop'},
  'last-round': {family: 'Pack', idea: 'Meter empties into jar; jar sends a last Pulse'},
  'harvest-home': {family: 'Pack', idea: 'Meter empties into jar; Sparks fly in from everywhere'},
  'black-hole': {family: 'Black Hole', idea: 'Dark disc, bright rim, pulls the next card in'},
};
// Cards named in docs/engine-cards.md that are not in dist/card-catalog.mjs yet (drawn under the implied id).
export const DOC_ONLY = {'homing-thread': {name: 'Homing Thread', rarity: 'rare'}, 'momentum': {name: 'Momentum', rarity: 'legendary'}};
export const ENGINE_IDS = Object.keys(ENGINE_META);
export function engineGrid(id) { return P[id](); }
export const engineSvg = (id, opts) => toSvg(engineGrid(id), opts);
