// v1.0-cardart: hand-placed 48x48 card pictures for the design lab. Nothing in the game imports this.
// Every picture is a 48x48 letter grid painted with a tiny pixel toolkit (whole-pixel rects, discs,
// lines and hand-drawn sprites), then written out as crispEdges SVG paths: one <path> per colour,
// one 1x1 square per pixel. No gradients, filters or bitmaps.

// The pixel toolkit, the palette, the sprites and the shared objects live in ./kit.mjs (one definition each).
import {PAL, S, grid, px, rect, disc, ring, stamp, trail, sparkAt, wisp, collector, glow, keyline, rays, sheaf, metronome, pendulum,
  seedSprout, heartFlame, meter, shape, GLINT, CAMPFIRE, toSvg} from './kit.mjs';
export {PAL, toSvg};

// ── Pictures ──────────────────────────────────────────────────────────────────
const P = {};
// Body Spark +2 (Common): the wisp with two Sparks flying into it.
P['body-spark/A'] = () => { const g = grid('K');
  wisp(g, 24, 32, 9);
  trail(g, 15, 18, 19, 23, 3); trail(g, 33, 18, 29, 23, 3);
  sparkAt(g, 11, 11, 13); sparkAt(g, 11, 37, 13);
  return g; };
P['body-spark/B'] = () => { const g = grid('N');
  rect(g, 0, 0, S, 14, 'K');
  rect(g, 0, 39, S, 9, 'L'); rect(g, 0, 39, S, 2, 'M'); [3, 11, 20, 30, 41].forEach(x => px(g, x, 38, 'M'));
  wisp(g, 24, 29, 8);
  trail(g, 14, 14, 18, 21, 3); trail(g, 34, 14, 30, 21, 3);
  sparkAt(g, 11, 10, 10); sparkAt(g, 11, 38, 10);
  return g; };
// Courier Tip (Common): the Collector delivering a Spark, two small tip Sparks popping off.
P['courier-tip/A'] = () => { const g = grid('K');
  [[2, 24, 7], [4, 29, 9], [2, 34, 6]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 20, 29, 8);
  sparkAt(g, 16, 33, 25);
  sparkAt(g, 7, 39, 9); sparkAt(g, 7, 45, 16);
  return g; };
P['courier-tip/B'] = () => { const g = grid('N');
  rect(g, 0, 0, S, 14, 'K');
  rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 2, 'M'); [5, 17, 26, 38].forEach(x => px(g, x, 39, 'M'));
  [[1, 22, 6], [3, 27, 8], [1, 32, 5]].forEach(([x, y, w]) => rect(g, x, y, w, 2, 'T'));
  collector(g, 18, 27, 7);
  sparkAt(g, 16, 31, 23);
  sparkAt(g, 7, 38, 8); sparkAt(g, 7, 44, 15);
  rect(g, 12, 43, 14, 1, 'O'); // shadow on the ground
  return g; };
// Growth Seed (Rare): a sprouting seed beside a meter whose top has grown past its old notch.
P['growth-seed/A'] = () => { const g = grid('K');
  disc(g, 22, 25, 19, 'N'); ring(g, 22, 25, 19, 2, 'T', (x, y) => x + y < 40); // second layer, lit from top left
  shape(g, l => { rect(l, 7, 38, 24, 5, 'L'); rect(l, 9, 37, 20, 1, 'L'); }); rect(g, 9, 37, 20, 1, 'B'); // soil mound
  seedSprout(g, 18, 41);
  meter(g, 36, 9, 34);
  shape(g, l => { for (let i = 0; i < 4; i++) rect(l, 39 - i, 2 + i, 1 + i * 2, 1, i ? 'G' : 'W'); }); // up arrow over the meter
  return g; };
P['growth-seed/B'] = () => { const g = grid('K');
  rect(g, 0, 22, S, 26, 'N');
  // far hills (second layer)
  for (let x = 0; x < S; x++) { const h = Math.round(4 + 3 * Math.sin(x / 6) + 2 * Math.sin(x / 2.7)); rect(g, x, 30 - h, 1, h, 'T'); }
  // campfire light from the left: warm stepped pool on the ground
  rect(g, 0, 36, S, 12, 'L'); rect(g, 0, 36, S, 1, 'M');
  rect(g, 0, 37, 24, 3, 'B'); rect(g, 0, 37, 14, 1, 'D'); // firelight on the ground, stepped
  stamp(g, CAMPFIRE, -2, 26);
  // growth stake: wooden post with notches, a gold notch above the old top
  shape(g, l => rect(l, 39, 8, 4, 32, 'B')); rect(g, 39, 8, 1, 32, 'P');
  [16, 22, 28, 34].forEach(y => rect(g, 39, y, 3, 1, 'O'));
  shape(g, l => rect(l, 37, 10, 8, 2, 'G'));
  seedSprout(g, 24, 42);
  return g; };
// Rhythm (Rare): a metronome whose arm marks three even beats, shown as three gold pips on an arc.
P['rhythm/A'] = () => { const g = grid('K');
  disc(g, 24, 26, 20, 'N'); ring(g, 24, 26, 20, 2, 'T', (x, y) => x + y < 44);
  metronome(g, 24, 44, {lit: true});
  pendulum(g, 24, 44, 33, 15);
  [[10, 12], [24, 5], [38, 12]].forEach(([x, y], i) => sparkAt(g, 7, x, y));
  return g; };
P['rhythm/B'] = () => { const g = grid('K');
  rect(g, 0, 26, S, 22, 'N');
  disc(g, 6, 7, 4, 'P'); disc(g, 5, 6, 3, 'Y'); // moon: the light source
  for (let x = 0; x < S; x++) { const h = Math.round(5 + 3 * Math.sin(x / 5 + 1)); rect(g, x, 34 - h, 1, h, 'T'); }
  rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 1, 'M');
  metronome(g, 26, 44, {lit: true});
  pendulum(g, 26, 44, 35, 16);
  [[14, 11], [26, 5], [38, 11]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  return g; };
// Resonant Harvest (Legendary): a struck sheaf ringing Sparks outward.
P['harvest-legendary/A'] = () => { const g = grid('K');
  disc(g, 24, 24, 21, 'N');
  rays(g, 24, 24, 12, 21, 'T');
  glow(g, 24, 24, [[13, 'T'], [10, 'C']]);
  ring(g, 24, 24, 18, 1, 'D');
  sheaf(g, 24, 41, {tall: 29});
  [[24, 5], [41, 14], [41, 34], [7, 14], [7, 34]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  keyline(g);
  return g; };
P['harvest-legendary/B'] = () => { const g = grid('K');
  rect(g, 0, 18, S, 30, 'N');
  [[5, 4], [14, 9], [30, 3], [43, 7]].forEach(([x, y]) => stamp(g, GLINT, x, y));
  for (let x = 0; x < S; x++) { const h = Math.round(4 + 2 * Math.sin(x / 4)); rect(g, x, 27 - h, 1, h, 'T'); }
  glow(g, 24, 28, [[15, 'T'], [11, 'C']]);
  rect(g, 0, 37, S, 11, 'M'); rect(g, 0, 37, S, 1, 'm');
  for (let x = 1; x < S; x += 3) { px(g, x, 36, 'D'); px(g, x + 1, 38 + (x % 2), 'D'); }
  ring(g, 24, 28, 19, 1, 'D', (x, y) => y < 37);
  sheaf(g, 24, 43, {tall: 29});
  [[8, 18], [40, 18], [24, 3]].forEach(([x, y]) => sparkAt(g, 7, x, y));
  sparkAt(g, 11, 6, 30); sparkAt(g, 11, 42, 30);
  keyline(g);
  return g; };
// Last Light (Legendary): one small flame held safe in cupped, heart-shaped hands.
P['last-light/A'] = () => { const g = grid('K');
  glow(g, 24, 22, [[17, 'N'], [12, 'L'], [8, 'B']]);
  heartFlame(g, 24, 22);
  sparkAt(g, 7, 12, 8); sparkAt(g, 7, 37, 6); stamp(g, GLINT, 29, 3);
  keyline(g);
  return g; };
P['last-light/B'] = () => { const g = grid('K');
  for (let x = 0; x < S; x++) { const h = Math.round(6 + 4 * Math.sin(x / 7 + 2)); rect(g, x, 38 - h, 1, h, 'N'); }
  glow(g, 24, 28, [[16, 'N'], [12, 'L'], [8, 'B']]);
  rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 1, 'M');
  rect(g, 10, 41, 28, 2, 'B'); rect(g, 16, 41, 16, 1, 'D'); // the flame's light on the ground
  heartFlame(g, 24, 21);
  rect(g, 15, 40, 18, 1, 'O'); rect(g, 19, 41, 10, 1, 'O'); // its shadow
  sparkAt(g, 7, 13, 10); sparkAt(g, 7, 36, 8); stamp(g, GLINT, 26, 4);
  keyline(g);
  return g; };

export const CARD_IDS = ['body-spark', 'courier-tip', 'growth-seed', 'rhythm', 'harvest-legendary', 'last-light'];
export const DIRECTIONS = ['A', 'B'];
export function pictureGrid(id, dir) { return P[`${id}/${dir}`](); }
export const pictureSvg = (id, dir, opts) => toSvg(pictureGrid(id, dir), opts);
