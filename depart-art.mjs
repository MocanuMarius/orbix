// The pictures on the paused "Ready to depart" field note (v1.0-depart-A). Each is generated from whole-pixel runs on a
// 48x48 grid and returned as inline SVG, so a tip change never waits on an image file.
import {BIOMES} from './biomes.mjs?v=guide-2';

// ── Pixel art ──────────────────────────────────────────────────────────────────────────────
const N = 48;
const K = {cream: '#fffdf1', pale: '#f3e6b9', gold: '#ffcf79', amber: '#e6a24a', tan: '#d8c98a', dark: '#2a1d12', brown: '#5a4632',
  moss: '#7d9a45', mossd: '#536430', green: '#8cc17a', rose: '#c9788a', red: '#b2453a', wine: '#7a2f2a', ink: '#0c0907'};
const mix = (hex, to, f) => { const a = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map(i => parseInt(to.slice(i, i + 2), 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
const WARM = {sky: ['#241810', '#33261a', '#4a3020', '#6b4129', '#8f5a33', '#b87a3e', '#dca456'], far: '#5a3a28', near: '#3a281c', ground: '#241810', ink: '#d8c98a'};
const PALETTES = {default: WARM};
for (const b of BIOMES) {
  const ink = b.ink;
  PALETTES[b.id] = {sky: [mix('#1c1612', ink, .06), mix('#2a2018', ink, .12), mix('#3e2f22', ink, .2), mix('#5e4430', ink, .26), mix('#86603a', ink, .3), mix('#b88344', ink, .3), '#dca456'],
    far: mix('#4a3626', ink, .22), near: mix('#2e2016', ink, .18), ground: '#1c130d', ink};
}
function canvas() {
  const g = new Array(N * N).fill(null), fx = new Array(N * N).fill(null);
  const o = {g, fx, put(x, y, c, d) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) (d ? fx : g)[y * N + x] = c; },
    px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = c; },
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.px(x + i, y + j, c); },
    disc(cx, cy, r, c, dither = false) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r * r + r * .4 && (!dither || (x + y) % 2 === 0)) o.put(x, y, c, dither); } },
    ring(cx, cy, r, c, dither = false, w = .62) { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const d = Math.hypot(x - cx, y - cy); if (Math.abs(d - r) <= w && (!dither || (x + y) % 2 === 0)) o.put(x, y, c, dither); } },
    tri(cx, top, base, half, c) { for (let y = top; y <= base; y++) { const hw = Math.round(half * (y - top) / Math.max(1, base - top)); o.rect(cx - hw, y, hw * 2 + 1, 1, c); } },
    where(fn, c) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fn(x, y)) o.px(x, y, c); },
  };
  return o;
}
function scene(o, pal, hills = true) {
  for (let y = 0; y < N; y++) o.rect(0, y, N, 1, pal.sky[Math.min(6, Math.floor(y / 5))]);
  [[5, 3], [13, 9], [22, 4], [31, 7], [41, 3], [44, 12], [9, 16], [37, 17]].forEach(([x, y]) => o.px(x, y, y < 8 ? K.pale : mix(K.pale, '#8f5a33', .5)));
  if (!hills) { o.rect(0, 38, N, 10, pal.near); o.rect(0, 43, N, 5, pal.ground); return; }
  for (let x = 0; x < N; x++) { const h = 29 + Math.round(2.6 * Math.sin(x / 5.5) + 1.8 * Math.sin(x / 2.1 + 1)); o.rect(x, h, 1, N - h, pal.far); }
  for (let x = 0; x < N; x++) { const h = 36 + Math.round(1.8 * Math.sin(x / 3.7 + 2) + 1.2 * Math.sin(x / 1.6)); o.rect(x, h, 1, N - h, pal.near); }
  o.rect(0, 43, N, 5, pal.ground);
}
const star = (o, cx, cy, big, c1 = K.gold, c2 = K.cream) => o.where((x, y) => { const a = Math.abs(x - cx) + 1, b = Math.abs(y - cy) + 1; return a * b <= (big ? 11 : 4) && a <= (big ? 11 : 4) && b <= (big ? 11 : 4); }, c1) || o.where((x, y) => (Math.abs(x - cx) + 1) * (Math.abs(y - cy) + 1) <= (big ? 4 : 1), c2);
const wispAt = (o, x, y, s = 1) => { o.disc(x, y, 9 * s, '#b89d62', true); o.disc(x, y, 6.2 * s, K.pale); o.disc(x, y, 4.2 * s, K.cream); };
const SUBJECTS = {
  wisp(o) { wispAt(o, 26, 21); [[8, 34], [11, 31], [14, 28], [17, 25.5], [20, 23.5]].forEach(([x, y], i) => o.rect(x, y, 2, 2, i % 2 ? K.cream : K.gold)); },
  beat(o) { [[10, 27], [24, 15], [38, 27]].forEach(([x, y]) => wispAt(o, x, y, .55)); for (let x = 4; x < 44; x += 4) o.rect(x, 35, 2, 1, K.pale); [[10, 31], [24, 19], [38, 31]].forEach(([x, y]) => o.rect(x - 1, y, 2, 2, K.gold)); },
  pulse(o) { o.ring(22, 22, 17, K.pale, true); o.ring(22, 22, 12, K.cream, true); o.ring(22, 22, 7, K.cream); wispAt(o, 22, 22, .5); star(o, 36, 12, false); },
  spark(o) { star(o, 24, 21, true); star(o, 9, 11, false); star(o, 40, 31, false); },
  chain(o) { [[3, K.tan], [18, K.gold], [33, K.rose]].forEach(([x, c], i) => { o.rect(x, 11, 12, 18, K.dark); o.rect(x + 1, 12, 10, 16, '#e8d6a4'); o.rect(x + 2, 13, 8, 8, c); o.rect(x + 2, 23, 8, 2, K.brown); o.rect(x + 2, 26, 5, 1, K.brown); if (i < 2) o.rect(x + 12, 18, 3, 2, K.amber); }); o.rect(18, 32, 12, 2, K.amber); },
  collector(o) { wispAt(o, 19, 23, .62); o.ring(19, 23, 14, K.green, true); o.disc(33, 23, 2.2, K.green); o.disc(33, 23, 1, K.cream); star(o, 40, 10, false); },
  flash(o) { [[8, 20], [8, 25], [40, 20], [40, 25]].forEach(([x, y]) => o.rect(x - 3, y, 5, 1, K.gold)); o.tri(24, 8, 31, 12, K.pale); o.tri(24, 12, 29, 7, K.cream); },
  dusk(o) { o.where((x, y) => Math.hypot(x - 24, y - 21) <= 11 && Math.hypot(x - 29, y - 18) > 10, K.rose); o.where((x, y) => Math.hypot(x - 24, y - 21) <= 8 && Math.hypot(x - 29, y - 18) > 10.5, mix(K.rose, K.cream, .35)); o.disc(24, 21, 15, mix(K.rose, '#241810', .5), true); },
  heart(o) { const f = (x, y) => { const u = (x - 24) / 11, v = -(y - 22) / 11; return Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v <= 0; }; o.where(f, K.red); o.where((x, y) => f(x, y) && x < 22 && y < 19 && !f(x + 2, y + 2) === false && (x + y) % 2 === 0 && y < 18, K.rose); o.rect(17, 15, 3, 2, K.pale); },
  blackhole(o) { o.ring(24, 21, 15, mix(K.amber, '#241810', .4), true); o.ring(24, 21, 11, K.amber, true); o.disc(24, 21, 8, K.ink); o.ring(24, 21, 9, K.gold, false, .5); [[10, 12], [38, 30], [14, 32], [36, 10]].forEach(([x, y]) => o.px(x, y, K.cream)); },
  jar(o) { o.rect(16, 11, 16, 4, K.brown); o.rect(18, 15, 12, 3, K.tan); o.rect(14, 18, 20, 20, K.tan); o.rect(16, 19, 16, 18, '#3b2d20'); o.rect(17, 20, 2, 14, mix(K.tan, '#3b2d20', .5)); [[21, 32], [25, 30], [29, 33], [23, 26], [27, 28], [25, 34], [22, 22]].forEach(([x, y], i) => o.rect(x, y, 2, 2, i % 2 ? K.gold : K.cream)); },
  camp(o) { o.where((x, y) => y >= 12 && y <= 31 && Math.abs(x - 24) <= Math.round(Math.sin(Math.PI * (y - 12) / 19 * .9 + .25) * 8 * (1 - (y < 18 ? (18 - y) / 9 : 0))), K.amber); o.where((x, y) => y >= 18 && y <= 31 && Math.abs(x - 24) <= Math.round(Math.sin(Math.PI * (y - 18) / 13 * .9 + .25) * 5.5), K.gold); o.where((x, y) => y >= 24 && y <= 31 && Math.abs(x - 24) <= 3, K.cream); o.rect(12, 33, 24, 3, K.brown); o.rect(14, 36, 20, 3, mix(K.brown, '#241810', .4)); [[16, 10], [32, 14], [28, 6]].forEach(([x, y]) => o.px(x, y, K.gold)); },
  lantern(o) { o.ring(24, 9, 5, K.tan, false, .6); o.rect(15, 12, 18, 3, K.brown); o.rect(16, 15, 16, 18, K.dark); o.rect(18, 16, 12, 16, K.gold); o.disc(24, 24, 5, K.pale); o.disc(24, 24, 3, K.cream); o.rect(15, 33, 18, 3, K.brown); o.disc(24, 24, 15, mix(K.gold, '#241810', .55), true); },
  note(o) { o.disc(14, 33, 3.4, K.gold); o.rect(16, 17, 2, 16, K.gold); o.rect(18, 17, 5, 3, K.gold); o.disc(31, 24, 3.4, K.cream); o.rect(33, 8, 2, 16, K.cream); o.rect(35, 8, 5, 3, K.cream); o.rect(8, 38, 32, 1, mix(K.tan, '#241810', .4)); },
  moon(o) { o.where((x, y) => Math.hypot(x - 24, y - 21) <= 13 && Math.hypot(x - 31, y - 17) > 11, K.pale); o.where((x, y) => Math.hypot(x - 24, y - 21) <= 10 && Math.hypot(x - 31, y - 17) > 11.5, K.cream); star(o, 38, 29, false); star(o, 9, 12, false); },
  sprout(o) { o.rect(23, 22, 2, 14, K.mossd); o.disc(17, 22, 4.6, K.moss); o.disc(31, 17, 5.6, K.green); o.disc(17, 22, 2.4, mix(K.moss, K.cream, .3)); o.rect(14, 36, 20, 3, K.brown); },
  peaks(o, pal) { const a = pal.ink; o.tri(14, 14, 36, 15, mix(a, '#241810', .3)); o.tri(14, 14, 20, 4, K.cream); o.tri(33, 20, 36, 13, a); o.tri(33, 20, 25, 3, K.cream); o.where((x, y) => y > 36 && y < 40, mix(a, '#241810', .55)); },
  pines(o, pal) { const a = pal.ink; [[12, 20], [24, 12], [36, 22]].forEach(([x, t]) => { o.rect(x - 1, t + 18, 3, 6, K.brown); [0, 6, 12].forEach((d, i) => o.tri(x, t + d, t + d + 9, 5 + i * 2, i % 2 ? mix(a, '#241810', .45) : mix(a, '#241810', .6))); }); },
  arch(o, pal) { const a = pal.ink; o.rect(8, 18, 7, 20, mix(a, '#241810', .35)); o.rect(33, 18, 7, 20, mix(a, '#241810', .35)); o.where((x, y) => y <= 18 && Math.hypot(x - 24, y - 18) <= 16.5 && Math.hypot(x - 24, y - 18) >= 9.5, mix(a, '#241810', .2)); o.rect(8, 18, 2, 20, a); o.rect(33, 18, 2, 20, a); o.where((x, y) => y <= 18 && Math.hypot(x - 24, y - 18) >= 15 && Math.hypot(x - 24, y - 18) <= 16.5, a); o.rect(6, 38, 36, 2, mix(a, '#241810', .5)); },
  dune(o, pal) { const a = pal.ink; [[20, .9, 0], [27, 1.2, 1], [34, 1.5, 2]].forEach(([base, f, k]) => { for (let x = 0; x < N; x++) { const h = base + Math.round(4 * Math.sin(x / (6 / f) + k * 1.7)); o.rect(x, h, 1, 7, mix(a, '#241810', .55 - k * .17)); } }); },
};
const artCache = new Map();
export function art(icon, {biome = null, scene: withScene = true} = {}) {
  const key = `${icon}|${biome}|${withScene}`;
  if (artCache.has(key)) return artCache.get(key);
  const pal = PALETTES[biome] || PALETTES.default, bg = canvas(), sub = canvas();
  if (withScene) scene(bg, pal, !['peaks', 'pines', 'arch', 'dune'].includes(icon));
  (SUBJECTS[icon] || SUBJECTS.spark)(sub, pal);
  const out = canvas(); out.g.splice(0, N * N, ...bg.g);
  sub.fx.forEach((c, i) => { if (c) out.g[i] = c; });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!sub.g[y * N + x]) { // dark outline around the subject
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < N && Y < N && sub.g[Y * N + X]; });
    if (n) out.g[y * N + x] = K.dark; }
  sub.g.forEach((c, i) => { if (c) out.g[i] = c; });
  const paths = new Map();
  for (let y = 0; y < N; y++) { let x = 0; while (x < N) { const c = out.g[y * N + x]; if (!c) { x++; continue; } let e = x; while (e < N && out.g[y * N + e] === c) e++; paths.set(c, (paths.get(c) || '') + `M${x} ${y}h${e - x}v1h-${e - x}z`); x = e; } }
  const svg = `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${[...paths].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')}</svg>`;
  artCache.set(key, svg); return svg;
}

