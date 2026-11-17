// v1.0-depart: three looks for the paused "Ready to depart" panel, a picker proof and a layout-shift audit.
// Lab only. Pixel art is generated here from whole-pixel runs on a 48x48 grid; nothing is loaded for it, so a tip
// change can never wait on an image. Fixed-size slots (picture, headline, sentence, buttons) are set in depart.css.
import {TIPS, words, isContextual, eligibleTips, pickTip, mulberry32, describeContext, runFacts} from './depart-tips.mjs';
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';
import {BIOMES} from '../biomes.mjs?v=guide-clarity-1';
import {cardArt} from '../card-art.mjs?v=guide-clarity-1';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

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

// ── Sample runs and wording ────────────────────────────────────────────────────────────────
const biomeOf = id => BIOMES.find(b => b.id === id);
const RUNS = {
  rhythm: {label: 'Rhythm Chain, mid-run', run: {cards: ['rhythm', 'toll-bell', 'harvest-common', 'echo', 'prism-lens'], slots: 5, hearts: 3, biome: 'frost', map: 'frozen-falls', hazards: [], flight: 9, companion: 'collector', stored: 14}},
  beginner: {label: 'Beginner, flight 1', run: {cards: ['body-spark', 'lift-guide'], slots: 3, hearts: 3, biome: 'moonruins', map: 'low-aqueduct', hazards: [], flight: 1, companion: 'collector', stored: 0}},
};
const cardName = id => CARD_CATALOG[id]?.name || id;
const TRIG_NAME = {collect: 'Collect', delivery: 'Delivery', pulse: 'Pulse', flash: 'Flash', overfill: 'Overfill', rhythm: 'Rhythm', 'falling-lift': 'Falling Lift'};
// The reason a tip is on screen, in the player's words ("for your Rhythm card").
export function whyLabel(tip, run) {
  const f = runFacts(run), parts = tip.context.split('&'), first = parts.find(p => p !== 'always' && p !== 'collector') || parts[0];
  const [key, value = ''] = first.split(':');
  const b = biomeOf(run.biome);
  switch (key) {
    case 'always': return 'Good to know';
    case 'card': { const id = value.split('|').find(i => f.ids.has(i)); return `For your ${cardName(id)}`; }
    case 'trigger': return `For your ${TRIG_NAME[value]} cards`;
    case 'biome': return `In ${b?.name || value}`;
    case 'hazard': return 'Black Hole ahead';
    case 'low-hearts': return 'One heart left';
    case 'first-flights': return 'Early flights';
    case 'collector': return 'With your Collector';
    case 'empty-slot': return 'You have a free Slot';
    case 'has-stored-sparks': return 'You hold Stored Sparks';
    case 'after-death': return 'After a lost flight';
    default: return 'Good to know';
  }
}
const destination = run => { const b = biomeOf(run.biome), m = b?.maps.find(x => x[0] === run.map) || b?.maps[0];
  return {place: m?.[1] || b?.name, biome: b?.name, mood: (b?.description || '').split('. ')[0].replace(/\.?$/, '.'), biomeId: b?.id}; };
const tileCard = id => id ? {...CARD_CATALOG[id], id} : null;
const TRIGGER_LABEL = {collect: 'Collect', 'always-on': 'Always on', next: 'Next card', wave: 'Pulse', any: 'Any Trigger', rhythm: 'Rhythm', delivery: 'Delivery', flash: 'Flash', overfill: 'Overfill', 'falling-lift': 'Falling Lift', save: 'Save', rest: 'At Rest', clear: 'Clear', latch: 'Latch', 'flash-ends': 'Flash ends'};
// Which tile the tip is about: a named card first, then the first card on that Trigger.
function focusIndex(tip, run) {
  if (!tip) return -1;
  const ids = (run.cards || []);
  for (const part of tip.context.split('&')) {
    const [key, value = ''] = part.split(':');
    if (key === 'card') { const i = ids.findIndex(id => value.split('|').includes(id)); if (i >= 0) return i; }
  }
  for (const part of tip.context.split('&')) {
    const [key, value = ''] = part.split(':');
    if (key === 'trigger') { const want = value === 'pulse' ? 'wave' : value; const i = ids.findIndex(id => CARD_CATALOG[id]?.trigger === want); if (i >= 0) return i; }
  }
  return -1;
}

// ── Mock markup. The same fixed slots in every look; fill() only changes their content. ─────
const ACTIONS = `<footer class="dp-actions"><button type="button" class="wb-sign wb-sign-quiet dp-back"><span class="wb-sign-text"><b>Back</b></span></button><button type="button" class="wb-sign wb-sign-primary dp-go"><span class="wb-sign-text"><b>Tap to depart</b></span></button></footer>`;
const SHELL = (kind, body) => `<img class="dp-world" src="assets/moonwell-title.webp" alt="" draggable="false"><div class="dp-shade" aria-hidden="true"></div><section class="dp-leaf dp-leaf-${kind}"><span class="dp-sr" role="status">Ready to depart</span>${body}${ACTIONS}</section>`;
const LAYOUT = {
  A: SHELL('A', `<header class="dp-top"><span class="dp-kind">Field note</span><span class="dp-count"></span></header><div class="dp-body"><div class="dp-pic"></div><div class="dp-copy"><span class="dp-why"></span><h2 class="dp-head"></h2><p class="dp-text"></p></div></div><div class="dp-rule" aria-hidden="true"></div>`),
  B: SHELL('B', `<header class="dp-place"><h2 class="dp-title"></h2><p class="dp-mood"></p></header><div class="dp-orbrow"><span class="dp-orb" aria-hidden="true"></span></div><div class="dp-tip"><div class="dp-icon"></div><div class="dp-copy"><span class="dp-why"></span><p class="dp-text"></p></div></div>`),
  C: SHELL('C', `<header class="dp-top"><span class="dp-kind">Your Chain</span><span class="dp-count">fires left to right</span></header><div class="dp-chain"></div><div class="dp-tip"><div class="dp-icon"></div><div class="dp-copy"><span class="dp-why"></span><h2 class="dp-head"></h2><p class="dp-text"></p></div></div><div class="dp-rule" aria-hidden="true"></div>`),
};
const set = (root, sel, html) => { const el = $(sel, root); if (el) el.innerHTML = html; };
const txt = (root, sel, text) => { const el = $(sel, root); if (el) el.textContent = text; };

function fill(dev, spec) {
  const {variant, tip, run, index, total} = spec, size = dev.dataset.size;
  const place = destination(run), has = !!tip;
  dev.dataset.tip = has ? tip.id : 'none';
  if (variant === 'A') {
    txt(dev, '.dp-count', has ? `Note ${index + 1} of ${total}` : '');
    txt(dev, '.dp-why', has ? whyLabel(tip, run) : '');
    txt(dev, '.dp-head', has ? tip.headline : 'Ready when you are');
    txt(dev, '.dp-text', has ? tip.text : '');
    set(dev, '.dp-pic', art(has ? tip.icon : 'lantern', {biome: has && tip.context.startsWith('biome:') ? run.biome : null}));
  } else if (variant === 'B') {
    txt(dev, '.dp-title', `${place.place} · ${place.biome}`);
    txt(dev, '.dp-mood', place.mood);
    txt(dev, '.dp-why', has ? whyLabel(tip, run) : '');
    txt(dev, '.dp-text', has ? tip.text : '');
    set(dev, '.dp-icon', has ? art(tip.icon, {biome: tip.context.startsWith('biome:') ? run.biome : null}) : '');
  } else {
    const focus = has ? focusIndex(tip, run) : -1;
    set(dev, '.dp-chain', run.cards.concat(Array(Math.max(0, run.slots - run.cards.length)).fill(null)).map((id, i) => {
      const c = tileCard(id);
      if (!c) return `<div class="dp-tile dp-tile-empty"><span class="dp-tart"></span><b>Empty Slot</b><small>Slot ${i + 1}</small><i class="dp-mark"></i></div>`;
      return `<div class="dp-tile${i === focus ? ' dp-lit' : ''}"><span class="dp-tart">${cardArt(c, {compact: true})}</span><b>${esc(c.name)}</b><small>${esc(TRIGGER_LABEL[c.trigger] || c.trigger)}</small><i class="dp-mark">${i === focus ? 'About this' : ''}</i></div>`;
    }).join(''));
    txt(dev, '.dp-why', has ? whyLabel(tip, run) : '');
    txt(dev, '.dp-head', has ? tip.headline : 'Ready when you are');
    txt(dev, '.dp-text', has ? tip.text : '');
    set(dev, '.dp-icon', art(has ? tip.icon : 'lantern', {biome: has && tip.context.startsWith('biome:') ? run.biome : null}));
  }
}
function makeDevice(variant, size) {
  const d = document.createElement('div');
  d.className = `dp-device wb-ground wb-atlas dp-${variant.toLowerCase()}`; d.dataset.size = size; d.dataset.variant = variant;
  d.innerHTML = LAYOUT[variant]; return d;
}

// ── Sections ────────────────────────────────────────────────────────────────────────────────
const VARIANTS = [
  {v: 'A', code: 'v1.0-depart-A', name: 'Field note', blurb: 'A traveller’s notebook leaf. A framed pixel vignette on the left, headline and one sentence on the right, a plain rule, then Back and the moss plaque. The warmest and most book-like; every tip gets its own picture.', weak: 'Picture is decoration: it cannot say which card the tip is about, so the small “For your Rhythm card” line has to carry the context.'},
  {v: 'B', code: 'v1.0-depart-B', name: 'Lantern card', blurb: 'The place is the title (map and biome), one mood line from the biome, the wisp orb glowing as the ready motif, one tip line below with a small icon, and a big moss plaque at lower right. Calmest and most thematic.', weak: 'The tip is deliberately secondary and smaller, so it is the easiest to skip; no headline, so a tip must read as one sentence.'},
  {v: 'C', code: 'v1.0-depart-C', name: 'Your Chain', blurb: 'Context first. Your equipped Chain as card tiles; the tip names one card or Trigger and that tile is ringed and marked “About this”. If no card applies, a general tip with no ring. Directly answers “this only works with the Rhythm card”.', weak: 'Busiest of the three and the tallest; at 667x300 the tiles are small and names are tight. A Chain of five leaves little air.'},
];
const sections = [];
let currentRun = 'rhythm';
const runState = () => RUNS[currentRun].run;
const longestOf = list => list.reduce((a, b) => (b.headline + b.text).length > (a.headline + a.text).length ? b : a);

function specFor(sec, kind) {
  const run = runState(), list = eligibleTips(run);
  if (kind === 'none') return {variant: sec.v, tip: null, run, index: 0, total: list.length};
  if (kind === 'longest') { const t = longestOf(list); return {variant: sec.v, tip: t, run, index: list.indexOf(t), total: list.length}; }
  if (kind === 'first') return {variant: sec.v, tip: list[0], run, index: 0, total: list.length};
  const idx = ((sec.index % list.length) + list.length) % list.length;
  return {variant: sec.v, tip: sec.mode === 'none' ? null : list[idx], run, index: idx, total: list.length};
}
function refresh(sec) {
  const run = runState(), list = eligibleTips(run);
  for (const d of sec.devices) fill(d.el, specFor(sec, d.kind));
  const sp = specFor(sec, 'live');
  $('.dpv-readout', sec.root).innerHTML = sp.tip ? `<b>${sp.index + 1} of ${list.length}</b> · ${esc(sp.tip.id)} · ${esc(describeContext(sp.tip.context))} · ${words(sp.tip.headline)}+${words(sp.tip.text)} words` : '<b>No tip</b> · tips switched off; the slots stay the same size';
}
function buildSection(info) {
  const sec = {v: info.v, index: 0, mode: 'tip', devices: []};
  const root = document.createElement('section'); root.className = 'dpv'; root.id = 'v' + info.v; sec.root = root;
  root.innerHTML = `<header class="dpv-head"><h2><span class="dpv-code">${info.code}</span> ${info.name}</h2><p>${info.blurb}</p><p class="dpv-weak"><b>Weakness.</b> ${info.weak}</p></header>
  <div class="dpv-controls"><button type="button" class="dpv-btn" data-act="prev">Previous tip</button><button type="button" class="dpv-btn dpv-primary" data-act="next">Next tip</button><button type="button" class="dpv-btn" data-act="none" aria-pressed="false">No tip</button><button type="button" class="dpv-btn" data-act="longest">Longest tip</button><span class="dpv-readout" role="status"></span></div>
  <div class="dpv-stage"></div>
  <h3 class="dpv-sub">Three states at half size (the real 915 x 412 mocks, scaled): a tip, no tip, the longest tip</h3><div class="dpv-proof"></div>`;
  const stage = $('.dpv-stage', root), proof = $('.dpv-proof', root);
  const add = (host, size, kind, cap, scale = 1) => {
    const fig = document.createElement('figure'); fig.className = 'dpv-fig'; if (scale < 1) fig.classList.add('dpv-fig-half');
    const w = size === 'lg' ? 915 : 667, h = size === 'lg' ? 412 : 300;
    fig.innerHTML = `<div class="dpv-frame" style="width:${w * scale}px;height:${h * scale}px"><div class="dpv-scale" style="transform:scale(${scale});width:${w}px;height:${h}px"></div></div><figcaption>${cap}</figcaption>`;
    const dev = makeDevice(info.v, size); $('.dpv-scale', fig).append(dev); host.append(fig);
    sec.devices.push({el: dev, kind, size});
  };
  add(stage, 'lg', 'live', '915 x 412 (Pixel 10 landscape)'); add(stage, 'sm', 'live', '667 x 300 (small phone)');
  add(proof, 'lg', 'first', 'A tip', .5); add(proof, 'lg', 'none', 'No tip', .5); add(proof, 'lg', 'longest', 'Longest tip', .5);
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'next') { sec.mode = 'tip'; sec.index++; } else if (a === 'prev') { sec.mode = 'tip'; sec.index--; }
    else if (a === 'none') sec.mode = sec.mode === 'none' ? 'tip' : 'none';
    else if (a === 'longest') { const list = eligibleTips(runState()); sec.mode = 'tip'; sec.index = list.indexOf(longestOf(list)); }
    $('[data-act=none]', root).setAttribute('aria-pressed', String(sec.mode === 'none'));
    refresh(sec);
  });
  sections.push(sec); return root;
}

// ── Picker proof ────────────────────────────────────────────────────────────────────────────
function simulate(kind, seed) {
  const rand = mulberry32(seed), history = [], rows = [];
  for (let n = 1; n <= 20; n++) {
    const run = kind === 'rhythm'
      ? {...RUNS.rhythm.run, flight: n + 8, biome: ['frost', 'pinewood', 'marsh', 'basalt'][Math.floor((n - 1) / 5) % 4], map: null, hazards: n % 6 === 0 ? ['black-hole'] : [], hearts: n >= 9 && n <= 11 ? 1 : 3, lastFlightLost: n === 8 || n === 12, stored: n > 2 ? 14 : 0}
      : {cards: n < 7 ? ['body-spark', 'lift-guide'] : n < 12 ? ['body-spark', 'lift-guide', 'echo'] : ['body-spark', 'lift-guide', 'echo', 'spark-cache'], slots: n < 12 ? 3 : 4, hearts: n >= 7 && n <= 8 ? 1 : n >= 5 && n <= 6 ? 2 : 3, biome: n < 8 ? 'moonruins' : 'marsh', flight: n, companion: 'collector', stored: n >= 6 ? 6 : 0, hazards: n === 10 ? ['black-hole'] : [], lastFlightLost: n === 5 || n === 13};
    run.companion = 'collector';
    const tip = pickTip(run, history, rand);
    history.push(tip?.id ?? '-'); rows.push({n, tip, run, eligible: eligibleTips(run).length});
  }
  const ids = history.filter(h => h !== '-');
  let repeats = 0; history.forEach((h, i) => { if (h !== '-' && history.slice(Math.max(0, i - 8), i).includes(h)) repeats++; });
  return {rows, ctx: rows.filter(r => r.tip && isContextual(r.tip)).length, unique: new Set(ids).size, repeats, minEligible: Math.min(...rows.map(r => r.eligible))};
}
function buildProof() {
  const root = document.createElement('section'); root.className = 'dpv dpv-proofsec'; root.id = 'picker';
  const sims = {rhythm: simulate('rhythm', 17), beginner: simulate('beginner', 42)};
  const eligRhythm = eligibleTips(RUNS.rhythm.run).length, eligBeginner = eligibleTips(RUNS.beginner.run).length;
  const byCtx = {}; TIPS.forEach(t => { const k = t.context.split(/[:&]/)[0]; byCtx[k] = (byCtx[k] || 0) + 1; });
  const cell = r => r.tip ? `<span class="dp-chip ${isContextual(r.tip) ? 'ctx' : 'gen'}">${isContextual(r.tip) ? 'context' : 'general'}</span> ${esc(r.tip.headline)}` : '<em>no tip</em>';
  root.innerHTML = `<header class="dpv-head"><h2>Tips and the picker</h2><p>${TIPS.length} tips in <code>depart-tips.mjs</code>. <code>pickTip(run, history)</code> never shows a tip from the last 8 flights, prefers context tips two times in three, and takes the tip not seen for longest.</p></header>
  <div class="dpv-stats"><p><b>Eligible in an ordinary mid-run situation (Rhythm Chain, Frostbound Reach):</b> ${eligRhythm} of ${TIPS.length}. <b>Beginner, flight 1:</b> ${eligBeginner}.</p><p><b>By context:</b> ${Object.entries(byCtx).map(([k, v]) => `${k} ${v}`).join(' · ')}.</p></div>
  <h3 class="dpv-sub">Simulated 20 flights, two runs (seeded; the runs change biome, hearts, Chain and hazards as they go)</h3>
  <div class="dpv-tablewrap"><table class="dpv-table"><thead><tr><th scope="col">#</th><th scope="col">Rhythm Chain run</th><th scope="col">Beginner run</th></tr></thead><tbody>${sims.rhythm.rows.map((r, i) => `<tr><td>${r.n}</td><td>${cell(r)}</td><td>${cell(sims.beginner.rows[i])}</td></tr>`).join('')}</tbody></table></div>
  <p class="dpv-stats"><b>Rhythm run:</b> ${sims.rhythm.ctx} of 20 context tips, ${sims.rhythm.unique} different tips, ${sims.rhythm.repeats} repeats within 8 flights. <b>Beginner run:</b> ${sims.beginner.ctx} of 20 context tips, ${sims.beginner.unique} different tips, ${sims.beginner.repeats} repeats within 8 flights.</p>
  <h3 class="dpv-sub">All tips</h3>
  <div class="dpv-tablewrap"><table class="dpv-table dpv-all"><thead><tr><th scope="col">Id</th><th scope="col">Shown when</th><th scope="col">Headline</th><th scope="col">Sentence</th><th scope="col">Words</th></tr></thead><tbody>${TIPS.map(t => `<tr><td><code>${esc(t.id)}</code></td><td>${esc(describeContext(t.context))}</td><td>${esc(t.headline)}</td><td>${esc(t.text)}</td><td class="${words(t.headline) > 5 || words(t.text) > 16 ? 'bad' : ''}">${words(t.headline)} + ${words(t.text)}</td></tr>`).join('')}</tbody></table></div>`;
  window.__departSim = {rhythm: {ctx: sims.rhythm.ctx, unique: sims.rhythm.unique, repeats: sims.rhythm.repeats}, beginner: {ctx: sims.beginner.ctx, unique: sims.beginner.unique, repeats: sims.beginner.repeats}, eligRhythm, eligBeginner, total: TIPS.length};
  return root;
}

// ── Layout audit: every tip, plus no tip, in every mock; compare boxes with the first state ─────
function rectsOf(dev) {
  const base = dev.getBoundingClientRect(), k = base.width / dev.offsetWidth, out = {};
  for (const sel of ['.dp-back', '.dp-go', '.dp-pic', '.dp-icon', '.dp-head', '.dp-title', '.dp-mood', '.dp-text', '.dp-why', '.dp-chain', '.dp-orb', '.dp-tile']) {
    $$(sel, dev).forEach((el, i) => { const r = el.getBoundingClientRect(); out[sel + i] = [(r.left - base.left) / k, (r.top - base.top) / k, r.width / k, r.height / k]; });
  }
  return out;
}
function clipped(dev) {
  const bad = [];
  for (const sel of ['.dp-head', '.dp-title', '.dp-mood', '.dp-text', '.dp-why', '.dp-tile b', '.dp-tile small']) $$(sel, dev).forEach(el => { if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) bad.push(sel); });
  for (const el of $$('.dp-leaf > *, .dp-body > *, .dp-tip > *, .dp-copy > *, .dp-actions > *', dev)) { // nothing may spill out of the page leaf
    const l = $('.dp-leaf', dev).getBoundingClientRect(), r = el.getBoundingClientRect(); if (r.height && (r.right > l.right + 1 || r.bottom > l.bottom + 1 || r.left < l.left - 1 || r.top < l.top - 1)) bad.push('out:' + el.className);
  }
  return bad;
}
function audit() {
  const results = [], saved = sections.map(s => ({index: s.index, mode: s.mode}));
  for (const sec of sections) for (const d of sec.devices.filter(x => x.kind === 'live')) {
    const run0 = runState();
    let baseline = null, maxMove = {}, states = 0, clips = [];
    for (const runKey of Object.keys(RUNS)) {
      currentRun = runKey;
      const states_ = [null, ...TIPS];
      for (const tip of states_) {
        const run = runState();
        fill(d.el, {variant: sec.v, tip, run, index: 0, total: 1}); states++;
        const r = rectsOf(d.el); baseline ||= r;
        for (const key of Object.keys(r)) if (baseline[key] && /dp-(back|go|pic|icon|head|title|mood|text|why|chain|orb)\d/.test(key)) { const m = Math.max(...r[key].map((v, i) => Math.abs(v - baseline[key][i]))); maxMove[key.replace(/\d+$/, '')] = Math.max(maxMove[key.replace(/\d+$/, '')] || 0, m); }
        const bad = clipped(d.el); if (bad.length) clips.push(`${tip?.id ?? 'none'} (${runKey}): ${[...new Set(bad)].join(',')}`);
      }
    }
    currentRun = run0 === RUNS.rhythm.run ? 'rhythm' : 'beginner';
    results.push({variant: sec.v, size: d.size, states, maxMove, clips});
  }
  sections.forEach((s, i) => { s.index = saved[i].index; s.mode = saved[i].mode; });
  currentRun = $('[name=run]:checked').value; sections.forEach(refresh);
  return results;
}
function showAudit(results) {
  const host = $('#audit');
  const worst = Math.max(0, ...results.flatMap(r => Object.values(r.maxMove)));
  const bad = results.flatMap(r => r.clips.map(c => `${r.variant} ${r.size}: ${c}`));
  host.innerHTML = `<h2>Layout check, measured in this page</h2><p class="${worst === 0 && !bad.length ? 'ok' : 'bad'}"><b>${worst === 0 && !bad.length ? 'PASS' : 'FAIL'}.</b> Each mock was filled with no tip and with each of the ${TIPS.length} tips in both sample runs (${results[0].states} states per mock, ${results.length} mocks). After each fill the page measured the boxes of Back, Tap to depart, picture/icon, headline, title, mood line, sentence, why line, Chain tiles and orb, and compared them with the first state. Largest movement of any box: <b>${worst} px</b>. Text clipped or spilling out of its slot or the page leaf: <b>${bad.length}</b>.</p>
  <table class="dpv-table"><thead><tr><th scope="col">Look / size</th><th scope="col">States</th><th scope="col">Largest movement per box (px)</th><th scope="col">Clipped</th></tr></thead><tbody>${results.map(r => `<tr><td>${r.variant} ${r.size === 'lg' ? '915x412' : '667x300'}</td><td>${r.states}</td><td>${Object.entries(r.maxMove).map(([k, v]) => `${k.replace('.dp-', '')} ${v}`).join(' · ')}</td><td>${r.clips.length ? esc(r.clips.slice(0, 3).join('; ')) : '0'}</td></tr>`).join('')}</tbody></table>${bad.length ? `<p class="bad">${esc(bad.slice(0, 12).join(' | '))}</p>` : ''}`;
  window.__departAudit = {worst, clipped: bad, results};
}

// ── Boot ────────────────────────────────────────────────────────────────────────────────────
const main = $('#dp-main');
VARIANTS.forEach(v => main.append(buildSection(v)));
main.append(buildProof());
for (const r of $$('[name=run]')) r.addEventListener('change', () => { currentRun = r.value; sections.forEach(s => { s.index = 0; s.mode = 'tip'; $('[data-act=none]', s.root).setAttribute('aria-pressed', 'false'); refresh(s); }); });
sections.forEach(refresh);
(document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(() => { showAudit(audit()); document.documentElement.dataset.ready = 'true'; }));
window.__depart = {sections, refresh, TIPS, eligibleTips, RUNS, setRun: key => { $(`[name=run][value=${key}]`).click(); }, setState(v, index, mode = 'tip') { const s = sections.find(x => x.v === v); s.index = index; s.mode = mode; refresh(s); }};
