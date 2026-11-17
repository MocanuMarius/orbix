// v1.0-cards review board. Shows every card in docs/card-proposals.md as the game would draw it (frame, rarity,
// Trigger chip, tile line), with a worked example in the Chain's own language and Approve / Deny / Change controls.
// Design lab only; nothing in the game imports this. Reads the game's modules and the card-art kit read-only.
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';
import {getCardRuleBands, cardRuleSentence} from '../card-rule-bands.mjs?v=guide-clarity-1';
import {cardTileLine} from '../card-tile-lines.mjs?v=guide-clarity-1';
import {frameVars, frameUrl, gem, pixelArt, triggerIcon, TRIGGER_ART, PAL as UIPAL, EYE, WARN, FIRE, medalUrl} from '../ui/trigger-icons.mjs?v=guide-clarity-1';
import * as K from './assets/cardart/kit.mjs';
import {FAMILIES, TRIGGERS, CARDS, OPS, TEN_FIRST, BUILDS, trigOf, setTrigger} from './cardboard-data.mjs';

const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const KEY = 'orbix.cardboard.v1';
const RWORD = {common: 'Common', rare: 'Rare', legendary: 'Legendary', oath: 'Oath', curse: 'Curse'};
const CARD_BY_ID = Object.fromEntries(CARDS.map(card => [card.id, card]));
CARDS.forEach(card => setTrigger(card.id, card.trigger));
Object.entries(CARD_CATALOG).forEach(([id, card]) => setTrigger(id, card.trigger));
// Real cards the examples use that are not in the live catalog under a played name.
const shortName = name => String(name).replace(/\s*\+\d+$/, '');

// ── New Trigger chip icons (16x16, same outline and golds as the real Trigger icons) ──────────────────
const G16 = () => Array.from({length: 16}, () => Array(16).fill('.'));
const q = (g, x, y, ch) => { if (x >= 0 && y >= 0 && x < 16 && y < 16) g[y][x] = ch; };
const d16 = (g, cx, cy, r, ch) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x + .5 - cx, y + .5 - cy) <= r) q(g, x, y, ch); };
const r16 = (g, x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) q(g, i, j, ch); };
function rim16(g) {
  const o = g.map(row => [...row]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.')) o[y][x] = 'O';
  return o.map(row => row.join(''));
}
const NEW_ICONS = {
  'new-any': () => { const g = G16(); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const dx = Math.abs(x + .5 - 8), dy = Math.abs(y + .5 - 8); if ((dx <= 1.6 && dy <= 6.4) || (dy <= 1.6 && dx <= 6.4) || dx + dy <= 4.2) q(g, x, y, dx + dy <= 1.8 ? 'W' : 'G'); } return rim16(g); },
  'new-always': () => { const g = G16(); [[7, 1], [8, 1], [7, 14], [8, 14], [1, 7], [1, 8], [14, 7], [14, 8], [3, 3], [12, 3], [3, 12], [12, 12]].forEach(([x, y]) => q(g, x, y, 'D')); d16(g, 8, 8, 4.2, 'G'); d16(g, 8, 8, 2.2, 'W'); return rim16(g); },
  'new-pack': () => { const g = G16(); r16(g, 3, 6, 10, 8, 'B'); r16(g, 3, 4, 10, 4, 'L'); r16(g, 3, 6, 1, 7, 'P'); r16(g, 7, 7, 2, 3, 'G'); q(g, 7, 7, 'W'); return rim16(g); },
  'new-prox': () => { const g = G16(); r16(g, 0, 13, 16, 3, 'L'); r16(g, 0, 12, 16, 1, 'M'); d16(g, 9, 7, 3.6, 'Y'); d16(g, 8, 6, 1.6, 'W'); [[2, 8], [3, 8], [4, 8], [5, 9]].forEach(([x, y], i) => q(g, x, y, i % 2 ? 'D' : 'G')); return rim16(g); },
  'new-oath': () => { const g = G16(); r16(g, 3, 2, 10, 11, 'P'); r16(g, 3, 2, 10, 2, 'B'); r16(g, 5, 6, 6, 1, 'L'); r16(g, 5, 8, 5, 1, 'L'); d16(g, 8, 11.5, 2.6, 'R'); q(g, 7, 10, 'r'); return rim16(g); },
  'new-curse': () => { const g = G16(); d16(g, 8, 8, 5.4, 'R'); q(g, 5, 5, 'r'); q(g, 6, 5, 'r'); q(g, 5, 6, 'r'); [[9, 3], [8, 5], [9, 7], [8, 9], [9, 11]].forEach(([x, y]) => q(g, x, y, 'O')); q(g, 12, 4, 'E'); q(g, 12, 5, 'E'); return rim16(g); },
};
const chipIcon = (key, size = 16) => NEW_ICONS[key] ? pixelArt(NEW_ICONS[key](), {size, cls: 'dk21-ticon'}) : key === 'rest' ? FIRE : TRIGGER_ART[key] ? triggerIcon(key, size) : '';
const triggerChip = id => { const t = TRIGGERS[id] || {name: id, icon: ''};
  return `<span class="cb-chip${t.isNew ? ' cb-newchip' : ''}" title="${t.isNew ? 'New chip: the game has no icon for this yet' : 'Trigger'}">${chipIcon(t.icon, 16)}<b>${esc(t.name)}</b>${t.isNew ? '<i>new</i>' : ''}</span>`; };

// ── Pictures: 48x48 placeholders drawn with the card-art kit ───────────────────────────────────
const {grid, rect, px, disc, ring, line, stamp, recolor, shape, sparkAt, trail, wisp, collector, glow, keyline, pulseRing, meterStack, spillMeter, jar, openJar, hourglass, dial, rareScene, legScene, HEART9, HEART, FLAG, GLINT, BOLT, BOLT_S, CHEV, CAMPFIRE, FLAME, FLAME_XL, HOURGLASS_S, DUSK, S} = K;
const night = (g, o = {}) => { rareScene(g, {moon: null, ...o}); return g; };
const spk = (g, x, y, s = 7) => sparkAt(g, s < 9 ? 7 : s, x, y);
function heartRow(g, y, n, total) {
  const w = total * 10 - 1, x0 = Math.round((S - w) / 2), dim = recolor(HEART9, {R: 'L', E: 'B', L: 'O'});
  for (let i = 0; i < total; i++) stamp(g, i < n ? HEART9 : dim, x0 + i * 10, y);
  return x0;
}
function cardBlock(g, x, y, col = 'P', mark = true) { shape(g, l => rect(l, x, y, 10, 14, col)); rect(g, x, y, 10, 2, col === 'G' ? 'W' : 'Y'); if (mark) spk(g, x + 5, y + 9, 5); }
const jarFill = (g, cx, top, w, h, frac) => { const x0 = cx - (w >> 1), fh = Math.round((h - 4) * frac); rect(g, x0 + 2, top + h - 2 - fh, w - 4, fh, 'G'); rect(g, x0 + 2, top + h - 2 - fh, w - 4, 1, 'W'); };

const FRAMES = {
  'spill-jar-a': () => { const g = night(grid('K')); spillMeter(g, 12, 12, 26); [[23, 19], [24, 25], [23, 31], [24, 36]].forEach(([x, y]) => rect(g, x, y, 1, 2, 'B')); rect(g, 22, 39, 6, 1, 'D'); return g; },
  'spill-jar-b': () => { const g = night(grid('K')); spillMeter(g, 8, 12, 26); openJar(g, 34, 26, 14, 14); jarFill(g, 34, 26, 14, 14, .5); trail(g, 19, 14, 31, 22, 6); spk(g, 34, 33, 7); return g; },
  'brimming-a': () => { const g = night(grid('K')); glow(g, 28, 28, [[11, 'T']]); wisp(g, 28, 28, 5); meterStack(g, 4, 8, 8, 30, .35); return g; },
  'brimming-b': () => { const g = night(grid('K')); glow(g, 28, 28, [[19, 'T']]); ring(g, 28, 28, 19, 1, 'D'); wisp(g, 28, 28, 5); meterStack(g, 4, 8, 8, 30, 1); stamp(g, GLINT, 6, 4); return g; },
  'pressure-a': () => { const g = night(grid('K')); spillMeter(g, 16, 14, 24); trail(g, 28, 14, 40, 20, 6, 'B'); rect(g, 39, 22, 1, 3, 'B'); return g; },
  'pressure-b': () => { const g = night(grid('K')); meterStack(g, 6, 10, 9, 30, .5); meterStack(g, 28, 10, 12, 30, .16); trail(g, 16, 20, 26, 30, 5); spk(g, 22, 22, 7); return g; },
  'rim-a': () => { const g = night(grid('K')); meterStack(g, 17, 8, 14, 32, 1); rect(g, 17, 8, 14, 1, 'G'); rect(g, 13, 8, 3, 1, 'O'); return g; },
  'rim-b': () => { const g = night(grid('K')); meterStack(g, 17, 4, 14, 36, 1); shape(g, l => rect(l, 15, 2, 18, 3, 'G')); rect(g, 15, 2, 18, 1, 'W'); [[11, 8], [11, 5], [11, 2]].forEach(([x, y]) => rect(g, x, y, 4, 1, 'G')); stamp(g, GLINT, 35, 2); return g; },
  'needle-a': () => { const g = grid('K'); rect(g, 0, 10, S, 28, 'N'); rect(g, 0, 0, S, 9, 'L'); rect(g, 0, 9, S, 1, 'M'); rect(g, 0, 38, S, 10, 'L'); rect(g, 0, 38, S, 1, 'M');
    wisp(g, 14, 32, 4); [[19, 37], [23, 37], [27, 37]].forEach(([x, y]) => px(g, x, y, 'G')); return g; },
  'needle-b': () => { const g = grid('K'); rect(g, 0, 10, S, 28, 'N'); rect(g, 0, 0, S, 9, 'L'); rect(g, 0, 9, S, 1, 'M'); rect(g, 0, 38, S, 10, 'L'); rect(g, 0, 38, S, 1, 'M');
    pulseRing(g, 28, 24, 14, (x, y) => y > 10 && y < 37); wisp(g, 28, 24, 4); [[10, 10], [14, 10], [18, 10]].forEach(([x, y]) => px(g, x, y, 'G')); [[10, 37], [14, 37]].forEach(([x, y]) => px(g, x, y, 'G')); return g; },
  'clean-a': () => { const g = night(grid('K')); heartRow(g, 5, 2, 3); jar(g, 24, 26, 16, 16, 10); return g; },
  'clean-b': () => { const g = night(grid('K')); heartRow(g, 5, 3, 3); jar(g, 24, 26, 16, 16, 10); jarFill(g, 24, 26, 16, 16, .7); stamp(g, GLINT, 33, 22); stamp(g, GLINT, 12, 28); return g; },
  'space-a': () => { const g = grid('K'); rect(g, 0, 8, S, 32, 'N'); shape(g, l => rect(l, 24, 12, 16, 28, 'L')); rect(g, 24, 12, 16, 1, 'M'); rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 1, 'M'); wisp(g, 10, 28, 4); trail(g, 16, 28, 22, 28, 3); return g; },
  'space-b': () => { const g = grid('K'); rect(g, 0, 8, S, 32, 'N'); shape(g, l => { rect(l, 24, 12, 4, 28, 'L'); rect(l, 28, 24, 6, 16, 'L'); rect(l, 34, 12, 6, 28, 'L'); }); rect(g, 24, 12, 4, 1, 'M'); rect(g, 34, 12, 6, 1, 'M'); rect(g, 28, 24, 6, 1, 'M');
    rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 1, 'M'); wisp(g, 14, 27, 4); [[19, 24], [22, 23], [25, 22], [29, 21], [33, 21]].forEach(([x, y]) => px(g, x, y, 'G')); return g; },
  'moth-a': () => { const g = night(grid('K')); [[8, 14], [40, 12], [9, 34], [39, 31], [24, 7]].forEach(([x, y]) => spk(g, x, y)); wisp(g, 24, 26, 4); return g; },
  'moth-b': () => { const g = night(grid('K')); [[10, 14], [38, 12], [11, 34], [37, 31], [24, 7]].forEach(([x, y]) => trail(g, x, y, 24, 26, 4, 'D')); [[16, 19], [32, 18], [17, 31], [31, 29], [24, 14]].forEach(([x, y]) => spk(g, x, y)); wisp(g, 24, 26, 4); stamp(g, BOLT_S, 38, 1); return g; },
  'candle-a': () => { const g = night(grid('K')); glow(g, 22, 30, [[9, 'T']]); wisp(g, 22, 30, 4); meterStack(g, 36, 9, 8, 30, .3); return g; },
  'candle-b': () => { const g = night(grid('K')); glow(g, 22, 30, [[18, 'T']]); ring(g, 22, 30, 18, 1, 'D'); wisp(g, 22, 30, 4); meterStack(g, 36, 9, 8, 30, .7); return g; },
  'eclipse-a': () => { const g = night(grid('K')); glow(g, 24, 28, [[15, 'T']]); pulseRing(g, 24, 28, 9); spk(g, 15, 22); spk(g, 33, 21); wisp(g, 24, 28, 4); return g; },
  'eclipse-b': () => { const g = grid('K'); rect(g, 0, 40, S, 8, 'L'); rect(g, 0, 40, S, 1, 'M'); glow(g, 24, 28, [[6, 'N']]); pulseRing(g, 24, 28, 21, (x, y) => y < 40); [[24, 7], [39, 17], [10, 17], [8, 36], [40, 36]].forEach(([x, y]) => spk(g, x, y)); wisp(g, 24, 28, 3); return g; },
  'vigil-a': () => { const g = night(grid('K')); heartRow(g, 14, 3, 3); shape(g, l => rect(l, 22, 28, 3, 12, 'B')); stamp(g, FLAG, 25, 28); return g; },
  'vigil-b': () => { const g = night(grid('K')); const x0 = heartRow(g, 14, 4, 4); stamp(g, GLINT, x0 + 31, 9); stamp(g, GLINT, x0 + 36, 28); shape(g, l => rect(l, 22, 28, 3, 12, 'B')); stamp(g, FLAG, 25, 28); return g; },
  'heirloom-a': () => { const g = night(grid('K')); [0, 1, 2, 3].forEach(i => cardBlock(g, 5 + i * 11, 20, i === 1 ? 'G' : 'P', i === 1)); shape(g, l => rect(l, 40, 14, 2, 26, 'B')); stamp(g, FLAG, 42, 14); return g; },
  'heirloom-b': () => { const g = night(grid('K')); [0, 1, 2, 3].forEach(i => cardBlock(g, 3 + i * 10, 22, i === 1 ? 'G' : 'P', i === 1)); cardBlock(g, 35, 22, 'P', false); ring(g, 40, 29, 11, 1, 'D'); stamp(g, GLINT, 38, 8); return g; },
  'tithe-a': () => { const g = night(grid('K')); jar(g, 15, 18, 18, 22, 10); jarFill(g, 15, 18, 18, 22, .8); meterStack(g, 33, 9, 10, 31, 1); return g; },
  'tithe-b': () => { const g = night(grid('K')); jar(g, 15, 18, 18, 22, 10); jarFill(g, 15, 18, 18, 22, .55); meterStack(g, 33, 6, 10, 34, 1); trail(g, 24, 24, 32, 18, 4); stamp(g, GLINT, 36, 2); return g; },
  'magpie-a': () => { const g = night(grid('K')); sparkAt(g, 11, 24, 10, DUSK); jar(g, 24, 28, 16, 14, 10); jarFill(g, 24, 28, 16, 14, .3); return g; },
  'magpie-b': () => { const g = night(grid('K')); sparkAt(g, 11, 24, 10, DUSK); jar(g, 24, 28, 16, 14, 10); jarFill(g, 24, 28, 16, 14, .7); stamp(g, GLINT, 36, 26); return g; },
  'loom-a': () => { const g = night(grid('K')); dial(g, 24, 24, 11, {frac: .33}); for (let a = 0; a < 8; a++) px(g, Math.round(24 + Math.cos(a * .785 - 1) * 17), Math.round(24 + Math.sin(a * .785 - 1) * 17), a < 6 ? 'G' : 'D'); return g; },
  'loom-b': () => { const g = night(grid('K')); pulseRing(g, 24, 24, 21, (x, y) => y < 40); dial(g, 24, 24, 11, {frac: .66}); for (let a = 0; a < 8; a++) px(g, Math.round(24 + Math.cos(a * .785 - 1) * 16), Math.round(24 + Math.sin(a * .785 - 1) * 16), 'G'); return g; },
  'devour-a': () => { const g = night(grid('K')); cardBlock(g, 8, 8, 'P'); heartRow(g, 30, 2, 3); shape(g, l => { rect(l, 6, 24, 14, 4, 'R'); }); return g; },
  'devour-b': () => { const g = night(grid('K')); stamp(g, GLINT, 12, 10); stamp(g, GLINT, 16, 16); heartRow(g, 30, 3, 3); return g; },
  'ember-a': () => { const g = night(grid('K')); stamp(g, CAMPFIRE, 4, 26); meterStack(g, 30, 8, 10, 32, 1); return g; },
  'ember-b': () => { const g = night(grid('K')); stamp(g, FLAME_XL, 5, 20); meterStack(g, 30, 4, 10, 36, 1); stamp(g, HOURGLASS_S, 41, 8); return g; },
  'hole-a': () => { const g = night(grid('K')); glow(g, 14, 26, [[11, 'T']]); disc(g, 14, 26, 7, 'O'); cardBlock(g, 30, 12, 'P'); meterStack(g, 40, 10, 5, 28, 1); return g; },
  'hole-b': () => { const g = night(grid('K')); glow(g, 16, 28, [[16, 'T']]); disc(g, 16, 28, 11, 'O'); ring(g, 16, 28, 11, 1, 'T'); meterStack(g, 36, 4, 8, 36, 1); stamp(g, GLINT, 38, 2); return g; },
  'borrow-a': () => { const g = night(grid('K')); heartRow(g, 20, 3, 3); return g; },
  'borrow-b': () => { const g = night(grid('K')); heartRow(g, 30, 2, 3); shape(g, l => rect(l, 17, 4, 14, 20, 'G')); rect(g, 17, 4, 14, 3, 'W'); spk(g, 24, 15, 7); stamp(g, GLINT, 33, 4); stamp(g, GLINT, 12, 12); return g; },
  'road-a': () => { const g = night(grid('K')); meterStack(g, 9, 8, 14, 32, 1); stamp(g, CHEV, 30, 14); stamp(g, CHEV, 30, 22); stamp(g, CHEV, 30, 30); return g; },
  'road-b': () => { const g = night(grid('K')); meterStack(g, 9, 12, 14, 28, 1); rect(g, 9, 8, 14, 3, 'L'); stamp(g, CHEV, 30, 22); stamp(g, CHEV, 30, 30); return g; },
  'purse-a': () => { const g = night(grid('K')); jar(g, 18, 18, 18, 22, 10); jarFill(g, 18, 18, 18, 22, .4); hourglass(g, 38, 20, 10, 18, {topSand: 1}); return g; },
  'purse-b': () => { const g = night(grid('K')); jar(g, 18, 18, 18, 22, 10); jarFill(g, 18, 18, 18, 22, .95); stamp(g, GLINT, 8, 12); hourglass(g, 38, 20, 10, 18, {topSand: 6}); return g; },
};
// Card pictures. Cards that have a before/after scene reuse its "with" frame; the rest are drawn here.
const FRAME_FOR = {'spill-jar': 'spill-jar-b', brimming: 'brimming-b', 'pressure-valve': 'pressure-b', 'gilded-rim': 'rim-b', 'thread-the-needle': 'needle-b', 'clean-line': 'clean-b', spacetime: 'space-b', moth: 'moth-b', 'candle-clock': 'candle-b', eclipse: 'eclipse-b', vigil: 'vigil-b', heirloom: 'heirloom-b', tithe: 'tithe-b', magpie: 'magpie-b', 'wave-loom-rework': 'loom-b', 'devourer-rework': 'devour-b', 'ember-feeder-rework': 'ember-b', 'black-hole-rework': 'hole-b', 'oath-of-the-low-road': 'road-b', 'borrowed-light': 'borrow-b', 'heavy-purse': 'purse-b'};
// Reworks keep their current picture as a placeholder (the real art file of the card they replace).
const KEEP_ART = {'chameleon-rework': 'chameleon', 'first-ripple-rework': 'first-ripple', 'wick-doubler-rework': 'wick-doubler', 'mirror-grain-rework': 'mirror-grain', 'second-sun-rework': 'second-sun', 'resonant-harvest-rework': 'harvest-common', 'prism-lens-rework': 'prism-lens', 'kindling-bead-rework': 'kindling-bead', 'ring-spring-rework': 'ring-spring'};
const ART = {
  keystone: g => { rareScene(g); shape(g, l => { rect(l, 8, 22, 7, 18, 'B'); rect(l, 33, 22, 7, 18, 'B'); rect(l, 8, 17, 32, 6, 'B'); }); rect(g, 8, 17, 32, 1, 'P'); rect(g, 8, 22, 32, 1, 'L'); shape(g, l => { rect(l, 21, 12, 6, 12, 'G'); rect(l, 19, 16, 10, 4, 'G'); }); rect(g, 21, 12, 2, 12, 'W'); spk(g, 11, 9); spk(g, 37, 9); },
  vanguard: g => { rareScene(g); [0, 1, 2].forEach(i => { shape(g, l => rect(l, 6 + i * 14, 26, 12, 12, 'L')); rect(g, 7 + i * 14, 27, 10, 10, i ? 'B' : 'G'); }); rect(g, 7, 27, 10, 2, 'W'); spk(g, 12, 33, 7); stamp(g, CHEV, 8, 15); stamp(g, CHEV, 8, 9); },
  bookends: g => { rareScene(g); shape(g, l => { rect(l, 5, 14, 8, 26, 'R'); rect(l, 35, 14, 8, 26, 'R'); }); [[5, 18], [35, 18], [5, 34], [35, 34]].forEach(([x, y]) => rect(g, x, y, 8, 2, 'G')); [16, 24, 32].forEach(x => spk(g, x, 30, 7)); rect(g, 15, 20, 18, 1, 'D'); },
  'empty-chair': g => { rareScene(g); shape(g, l => { rect(l, 16, 32, 16, 3, 'B'); rect(l, 16, 35, 3, 5, 'B'); rect(l, 29, 35, 3, 5, 'B'); rect(l, 16, 19, 3, 14, 'B'); }); rect(g, 16, 32, 16, 1, 'P'); spk(g, 26, 22, 11); spk(g, 36, 12); },
  ladder: g => { rareScene(g); shape(g, l => { rect(l, 16, 8, 3, 32, 'B'); rect(l, 29, 8, 3, 32, 'B'); [13, 20, 27, 34].forEach(y => rect(l, 19, y, 10, 2, 'G')); }); [13, 20, 27, 34].forEach(y => rect(g, 19, y, 10, 1, 'W')); spk(g, 8, 14); spk(g, 40, 26); },
  'twin-flame': g => { rareScene(g); glow(g, 24, 28, [[17, 'N'], [12, 'L']]); stamp(g, FLAME, 9, 22); stamp(g, FLAME, 29, 22); rect(g, 8, 39, 32, 1, 'O'); spk(g, 24, 10); },
  tributary: g => { rareScene(g); for (let x = 0; x < S; x++) { const y = Math.round(31 + 4 * Math.sin(x / 5)); rect(g, x, y, 1, 4, 'T'); px(g, x, y, 'C'); } collector(g, 38, 24, 5); spk(g, 8, 24, 11); trail(g, 15, 28, 31, 25, 5); },
  'storm-glass': g => { rareScene(g); disc(g, 24, 26, 13, 'O'); disc(g, 24, 26, 12, 'T'); disc(g, 24, 26, 10, 'N'); px(g, 17, 18, 'c'); px(g, 18, 17, 'c'); px(g, 17, 19, 'c'); stamp(g, BOLT_S, 20, 20); pulseRing(g, 24, 26, 18, (x, y) => y < 40); },
  undertow: g => { rareScene(g); for (let x = 0; x < S; x++) { const y = Math.round(30 + 2 * Math.sin(x / 3)); rect(g, x, y, 1, 18, 'T'); px(g, x, y, 'c'); } trail(g, 12, 38, 22, 20, 6); spk(g, 24, 14, 11); spk(g, 36, 9); },
  weathervane: g => { legScene(g, {}); shape(g, l => rect(l, 23, 18, 3, 22, 'B')); shape(g, l => { rect(l, 8, 11, 26, 3, 'G'); rect(l, 34, 8, 2, 9, 'G'); rect(l, 36, 9, 2, 7, 'G'); rect(l, 38, 11, 2, 3, 'G'); rect(l, 6, 8, 4, 9, 'D'); }); rect(g, 8, 11, 26, 1, 'W'); spk(g, 12, 28); spk(g, 36, 30); keyline(g); },
  'glide-song': g => { rareScene(g); for (let x = 2; x < 44; x += 2) px(g, x, Math.round(26 - 6 * Math.sin(x / 5)), 'D'); [[9, 20], [19, 14], [29, 21]].forEach(([x, y], i) => spk(g, x, y, [5, 7, 7][i])); wisp(g, 39, 28, 5); },
  'held-breath': g => { rareScene(g); hourglass(g, 18, 8, 16, 28, {topSand: 2}); trail(g, 38, 8, 38, 28, 6); wisp(g, 38, 32, 4); },
  daredevil: g => { legScene(g, {glowAt: [24, 30], bands: [[14, 'N']]}); wisp(g, 32, 30, 5); [[10, 30], [16, 28], [22, 31]].forEach(([x, y]) => px(g, x, y, 'G')); spk(g, 10, 20, 11); spk(g, 20, 14); spk(g, 40, 14); rect(g, 6, 37, 36, 1, 'D'); keyline(g); },
  'dark-lantern': g => { rareScene(g); shape(g, l => { rect(l, 20, 21, 9, 15, 'L'); rect(l, 22, 17, 5, 4, 'B'); }); rect(g, 22, 24, 5, 9, 'G'); rect(g, 22, 24, 1, 9, 'W'); ring(g, 24, 28, 10, 1, 'T'); spk(g, 8, 12); spk(g, 40, 14); spk(g, 8, 36); spk(g, 40, 34); },
  'long-shadow': g => { rareScene(g); stamp(g, BOLT, 8, 12); shape(g, l => rect(l, 10, 39, 30, 1, 'O')); rect(g, 12, 40, 28, 2, 'K'); rect(g, 18, 42, 18, 1, 'K'); spk(g, 36, 16); },
  'second-wind': g => { rareScene(g); [[8, 14, 22], [10, 20, 26], [6, 26, 22]].forEach(([x, y, w]) => { rect(g, x, y, w, 2, 'c'); rect(g, x + w, y - 1, 3, 2, 'c'); }); wisp(g, 36, 22, 6); stamp(g, HEART9, 4, 32); },
  'scar-tissue': g => { rareScene(g); stamp(g, HEART, 13, 12); line(g, 18, 14, 28, 26, 'P'); [[20, 14], [23, 18], [26, 22]].forEach(([x, y]) => { px(g, x, y, 'P'); px(g, x + 2, y - 2, 'P'); px(g, x + 1, y - 1, 'W'); }); },
  'glass-heart': g => { rareScene(g); ring(g, 24, 25, 17, 1, 'c'); stamp(g, HEART, 13, 14); px(g, 17, 14, 'W'); px(g, 18, 14, 'W'); line(g, 26, 14, 30, 22, 'W'); px(g, 12, 12, 'c'); px(g, 11, 13, 'c'); },
  'collectors-ledger': g => { rareScene(g); shape(g, l => { rect(l, 9, 20, 15, 17, 'P'); rect(l, 25, 20, 15, 17, 'P'); }); rect(g, 24, 20, 1, 17, 'B'); [[12, 25], [15, 25], [18, 25], [21, 25]].forEach(([x, y]) => rect(g, x, y, 1, 6, 'O')); line(g, 11, 31, 22, 25, 'O'); [[28, 25], [32, 25], [28, 30]].forEach(([x, y]) => rect(g, x, y, 8, 1, 'L')); collector(g, 24, 11, 5); },
  'old-friend': g => { rareScene(g); wisp(g, 16, 30, 7); collector(g, 33, 31, 6); spk(g, 24, 24, 7); stamp(g, HEART9, 20, 8); },
  apprentice: g => { rareScene(g); stamp(g, CAMPFIRE, 3, 26); cardBlock(g, 28, 20, 'P', false); rect(g, 31, 14, 4, 1, 'G'); rect(g, 32, 12, 2, 5, 'G'); spk(g, 33, 27, 7); stamp(g, GLINT, 38, 18); },
  'smiths-mark': g => { rareScene(g); shape(g, l => { rect(l, 10, 28, 26, 5, 'L'); rect(l, 6, 28, 5, 3, 'L'); rect(l, 16, 33, 14, 7, 'L'); }); rect(g, 10, 28, 26, 1, 'B'); stamp(g, GLINT, 22, 22); spk(g, 14, 18, 5); spk(g, 34, 16, 7); shape(g, l => rect(l, 30, 8, 4, 12, 'B')); rect(g, 27, 6, 10, 4, 'D'); },
  'oath-of-silence': g => { night(g); pulseRing(g, 24, 24, 14); pulseRing(g, 24, 24, 8); wisp(g, 24, 24, 3); line(g, 9, 9, 39, 39, 'O'); line(g, 10, 9, 40, 39, 'R'); line(g, 9, 10, 39, 40, 'R'); line(g, 10, 10, 40, 40, 'R'); },
  'oath-of-hunger': g => { rareScene(g); shape(g, l => { rect(l, 16, 22, 16, 14, 'L'); }); rect(g, 16, 22, 16, 1, 'B'); ring(g, 24, 20, 6, 2, 'D'); rect(g, 22, 28, 4, 5, 'O'); spk(g, 8, 16); spk(g, 40, 16); spk(g, 8, 32, 5); spk(g, 40, 32, 5); },
};
const GENERIC = g => { rareScene(g); spk(g, 24, 26, 16); };
function pictureGrid(card) {
  const g = grid('K');
  if (FRAME_FOR[card.id]) return FRAMES[FRAME_FOR[card.id]]();
  (ART[card.id] || GENERIC)(g);
  return g;
}
function artHtml(card, cls = '') {
  const keep = KEEP_ART[card.id];
  if (keep) return realArt(keep, cls, card.name);
  const g = pictureGrid(card);
  if (card.rarity === 'legendary') keyline(g);
  return K.toSvg(g).replace('<svg ', `<svg class="cb-px ${cls}" role="img" aria-label="${esc(card.name)} (sketch)" `);
}
function realArt(id, cls = '', alt = '') { return `<img class="cb-px ${cls}" data-art="${esc(id)}" src="assets/cardart/cards/${esc(id)}.svg" width="48" height="48" alt="${esc(alt)}" draggable="false">`; }
document.addEventListener('error', e => { const el = e.target; if (el?.dataset?.art !== undefined) { const g = grid('K'); GENERIC(g); el.replaceWith(Object.assign(document.createElement('span'), {innerHTML: K.toSvg(g).replace('<svg ', '<svg class="cb-px" ')}).firstChild); } }, true);

// ── Card facts for real cards ───────────────────────────────────────────────────────────────────
function infoOf(id) {
  const p = CARD_BY_ID[id];
  if (p) return {name: p.name, rarity: p.rarity, trigger: p.trigger, proposed: true};
  const r = CARD_CATALOG[id];
  return r ? {name: shortName(r.name), rarity: r.rarity, trigger: r.trigger} : {name: id, rarity: 'common', trigger: 'any'};
}
const realFace = id => { const card = CARD_CATALOG[id]; return {tile: cardTileLine({id}), rule: cardRuleSentence(getCardRuleBands(card, card)), name: card.name, rarity: card.rarity, trigger: card.trigger, retired: card.retired, unreleased: card.unreleased}; };

// ── The mini Chain resolver: the game's stated rules, small enough to read ───────────────────────────
// Whole Sparks, round down per firing (per pass). A Boost multiplies every Spark gain to its left in the same
// pass; Boosts multiply together. Echo and Keystone add firings. An Encore is a second pass. Boosts never touch
// Stored Sparks or permanent gains, so none of the examples multiply those.
const ANYT = new Set(['any', 'next', 'always-on']);
function resolveRow(row, trigger, vars = {}) {
  const empties = row.filter(t => t.empty).length;
  const cells = row.map((t, i) => {
    if (t.empty) return null;
    const inf = infoOf(t.id), left = row.slice(0, i).filter(u => !u.empty).length;
    let op = OPS[t.id];
    if (typeof op === 'function') op = op({i, left, empties, slots: row.length, row, t});
    op = op ? {...op} : {k: 'none', word: t.plain || ''};
    if (t.n != null && op.k === 'add') { op.n = t.n; }
    if (op.k === 'add' && vars.hunger) { op.was = op.n; op.n += 2; }
    if (t.was != null) op.was = t.was;
    if (t.when === false) op.when = false;
    return {t, inf, op, i, fires: 1, granted: false, sealed: !!t.sealed || (vars.silence && inf.trigger === 'wave')};
  });
  const live = cells.filter(Boolean);
  const nextCell = i => cells.slice(i + 1).find(Boolean);
  const counts = {};
  live.forEach(c => { if (!ANYT.has(c.inf.trigger)) counts[c.inf.trigger] = (counts[c.inf.trigger] || 0) + 1; });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  live.forEach(c => {
    const o = c.op;
    if (o.k === 'echo') { const n = nextCell(c.i); if (n) n.fires += o.n; }
    if (o.k === 'keystone') { [cells[c.i - 1], cells[c.i + 1]].forEach(n => { if (n) n.fires += 1; }); }
    if (o.grant) live.forEach(n => { if (n !== c && o.grant(n.t.id)) n.granted = true; });
    if (o.grantNext) { const n = nextCell(c.i); if (n) n.granted = true; }
    if (o.grantAll) live.forEach(n => { if (n !== c) n.granted = true; });
    if (o.grantCommon && ranked.length > 1 && ranked[ranked.length - 1][0] === trigger) live.forEach(n => { if (n.inf.trigger === ranked[0][0]) n.granted = true; });
  });
  if (vars.silence) live.forEach(c => { if (c.inf.trigger === 'collect' && !c.sealed) c.fires += 1; });
  const encore = live.some(c => c.op.k === 'encore');
  const plates = row.map(() => null), running = row.map(() => 0);
  let total = 0, passes = 1;
  for (let pass = 1; pass <= (encore ? 2 : 1); pass++) {
    const entries = []; let payers = 0, lastPayout = 0;
    cells.forEach((c, i) => {
      if (!c) { if (pass === 1) running[i] = i ? running[i - 1] : 0; return; }
      const o = c.op, t = c.t;
      const active = c.granted || o.always || ANYT.has(c.inf.trigger) || c.inf.trigger === trigger || o.k === 'none';
      let plate;
      if (c.sealed) plate = {kind: 'sealed'};
      else if (t.spent) plate = {kind: 'spent'};
      else if (!active) plate = {kind: 'waits', waits: c.inf.trigger};
      else if (o.k === 'add') {
        if (o.needsPlus && payers === 0) plate = {kind: 'idle', word: 'Needs a + card'};
        else { for (let f = 0; f < c.fires; f++) { entries.push(o.n); } payers++; lastPayout = o.n;
          plate = {kind: 'add', eff: o.n * c.fires, base: o.was ?? o.n, word: o.word}; }
      } else if (o.k === 'mul') {
        const factor = pass === 2 && o.nEnc ? o.nEnc : o.n;
        if (o.when === false || !entries.length) plate = {kind: 'idle', word: o.idleWord || 'No effect here'};
        else { entries.forEach((v, k) => { entries[k] = v * factor; }); for (let f = 1; f < c.fires; f++) entries.forEach((v, k) => { entries[k] = v * factor; });
          plate = {kind: 'mul', text: '×' + fmt(o.n) + (o.nEnc ? ' · ×' + fmt(o.nEnc) : ''), enc: o.nEnc}; }
      } else if (o.k === 'again') { const amt = lastPayout * o.n; if (amt > 0) { entries.push(amt); plate = {kind: 'add', eff: amt, base: amt}; } else plate = {kind: 'idle', word: 'No + card yet'}; }
      else if (o.k === 'echo') plate = {kind: 'word', word: 'Repeats next'};
      else if (o.k === 'encore') plate = {kind: 'word', word: 'Encore: again'};
      else if (o.k === 'keystone') plate = {kind: 'word', word: o.word};
      else if (o.when === false) plate = {kind: 'idle', word: o.idleWord || 'No effect here'};
      else plate = {kind: 'word', word: o.word || t.plain || 'No Sparks of its own'};
      if (pass === 1) { plates[i] = plate; running[i] = Math.floor(entries.reduce((a, b) => a + b, 0) + 1e-9); }
    });
    const sum = Math.floor(entries.reduce((a, b) => a + b, 0) + 1e-9);
    total += sum; if (pass === 2) passes = 2;
  }
  return {plates, running, total, passes};
}
const fmt = n => String(Number(n.toFixed(2)));
const sig = p => p ? JSON.stringify(p) : '';

// ── Gems, frames, faces and tiles ───────────────────────────────────────────────────────────────────
const GEM_ROWS = ['...OO...', '..OHAO..', '.OHAAAO.', 'OHAAAAZO', 'OAAAAZZO', '.OAAZZO.', '..OAZO..', '...OO...'];
const gemFor = r => r === 'oath' ? pixelArt(GEM_ROWS, {size: 8, pal: {O: '#2a1d12', A: '#d9b25a', Z: '#8a6d44', H: '#fff1c5'}, cls: 'dk21-gem'}) : r === 'curse' ? pixelArt(GEM_ROWS, {size: 8, pal: {O: '#2a1d12', A: '#b8574a', Z: '#7a2f2a', H: '#f5d195'}, cls: 'dk21-gem'}) : gem(r);
const CHECK = '<svg class="cb-glyph" viewBox="0 0 10 8" width="20" height="16" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M8 0h2v2H9v1H8v1H7v1H6v1H5v1H4v1H2V7H1V6H0V4h2v1h2v1h1V5h1V4h1V3h1z"/></svg>';
const CROSS = '<svg class="cb-glyph" viewBox="0 0 9 9" width="18" height="18" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 0h2v1h1v1h1v1h1V2h1V1h1V0h2v2H8v1H7v1H6v1h1v1h1v1h1v2H7V8H6V7H5V6H4v1H3v1H2v1H0V7h1V6h1V5h1V4H2V3H1V2H0z"/></svg>';
const rootStyle = frameVars() + ';--medal:' + medalUrl(60) + ';--fr-oath:' + frameUrl({rim: '#8a6d44', light: '#fff1c5', dark: '#c79f52', fill: '#efdcaa'}) + ';--fr-curse:' + frameUrl({outline: '#2a1d12', rim: '#7a2f2a', light: '#e0a090', dark: '#b8806a', fill: '#ecd0a8'}) +
  ';--fr-chainOath:' + frameUrl({outline: '#3d4a22', rim: '#8a6d44', light: '#fff1c5', dark: '#c79f52', fill: '#e9e4b6'}) + ';--fr-chainCurse:' + frameUrl({outline: '#3d4a22', rim: '#7a2f2a', light: '#e0a090', dark: '#b8806a', fill: '#e9e4b6'});
const chainFrame = r => 'var(--fr-chain' + ({common: 'Common', rare: 'Rare', legendary: 'Legendary', oath: 'Oath', curse: 'Curse'}[r] || 'Common') + ')';
const whenLine = id => { const t = TRIGGERS[id]; return t ? `<span class="ca-whenline">${chipIcon(t.icon, 16)}<span>${esc(t.name)}</span></span>` : ''; };
function faceHtml(f) {
  const t = TRIGGERS[f.trigger] || {name: f.trigger, icon: ''};
  return `<div class="ca-face cb-face dc-r-${f.rarity}" style="--fr:var(--fr-${f.rarity})"><div class="ca-fband">${gemFor(f.rarity)}<b>${RWORD[f.rarity]}</b></div>
   <div class="ca-fname">${esc(f.name)}</div><div class="ca-fart cb-fart">${f.art}${f.sketch ? '<span class="cb-sketch">sketch</span>' : ''}</div>
   <div class="ca-frule"><div class="ca-fcond">${chipIcon(t.icon, 16)}<b>${esc(t.name)}</b></div><div class="ca-feff">${esc(f.text)}</div></div></div>`;
}
function tileHtml(f) {
  return `<div class="ca-tile cb-tile dc-r-${f.rarity}" style="--fr:var(--fr-${f.rarity})"><div class="ca-tilemain"><span class="ca-top"><span class="ca-rtab">${gemFor(f.rarity)}<b>${RWORD[f.rarity]}</b></span></span>
   <span class="ca-body"><span class="ca-art ca-art-new">${f.art}</span><span class="ca-text"><b class="ca-name">${esc(f.name)}</b><b class="ca-effect">${esc(f.tile)}</b>${whenLine(f.trigger)}</span></span></div>
   <span class="ca-eye" aria-hidden="true"><span class="ca-eyebody">${EYE}</span></span></div>`;
}
const proposedFace = card => ({name: card.name, rarity: card.rarity, trigger: card.trigger, text: card.text, tile: card.tile, art: artHtml(card), sketch: true});
function currentFace(card) {
  const id = card.replaces, r = realFace(id);
  let art;
  if (id === 'wave-loom' || id === 'black-hole') art = K.toSvg(id === 'black-hole' ? FRAMES['hole-a']() : FRAMES['loom-a']()).replace('<svg ', '<svg class="cb-px" ');
  else art = realArt(id, '', r.name);
  const trig = TRIGGERS[r.trigger] ? r.trigger : (r.trigger === 'take-off' ? 'always-on' : r.trigger === 'next' ? 'any' : 'any');
  const text = r.rule.replace(/^[^:]*:\s*/, '');
  return {name: shortName(r.name), rarity: r.rarity, trigger: trig, text, tile: r.tile, art, sketch: false, retired: r.retired, unreleased: r.unreleased, ruleFull: r.rule};
}

// ── Examples ─────────────────────────────────────────────────────────────────────────────────────
const keyOf = (row, i) => row[i].id + '#' + row.slice(0, i).filter(t => t.id === row[i].id).length;
function plateHtml(p) {
  if (!p) return '';
  switch (p.kind) {
    case 'add': return (p.eff !== p.base ? `<s class="cb-old"><span class="cb-sr">was </span>+${fmt(p.base)}</s><b class="cb-new">+${fmt(p.eff)}</b>` : `<b class="cb-eff">+${fmt(p.eff)}</b>`) + (p.word ? `<small>${esc(p.word)}</small>` : '');
    case 'mul': return `<b class="cb-eff cb-mulv">${esc(p.text)}</b>${p.enc ? '<small>2nd pass: Encore</small>' : ''}`;
    case 'waits': { const t = TRIGGERS[p.waits]; return `<span class="cb-waits"><span>Waits for</span><b>${t ? chipIcon(t.icon, 16) : ''}${esc(t ? t.name : p.waits)}</b></span>`; }
    case 'idle': return `<span class="cb-idle"><i class="cb-warn">${WARN}</i><span>${esc(p.word)}</span></span>`;
    case 'sealed': return '<b class="cb-word">Sealed</b>';
    case 'spent': return '<b class="cb-word">Uses spent</b>';
    default: return `<b class="cb-word">${esc(p.word)}</b>`;
  }
}
const markFor = p => p?.kind === 'add' ? ['add', '+'] : p?.kind === 'mul' ? ['mul', '×'] : null;
function stripHtml(ex, row, res, other, label, second) {
  const trig = TRIGGERS[ex.trigger];
  const oKeys = other ? new Map(other.row.map((t, i) => [t.empty ? '' : keyOf(other.row, i), sig(other.res.plates[i])])) : null;
  const tiles = row.map((t, i) => {
    if (t.empty) return `<div class="cb-st cb-stempty"><div class="cb-mt cb-emptyslot"><span>Empty Slot</span></div><div class="cb-plate cb-plate-empty"></div></div>`;
    const inf = infoOf(t.id), p = res.plates[i], proposed = !!CARD_BY_ID[t.id];
    const art = proposed ? artHtml(CARD_BY_ID[t.id]) : realArt(t.id, '', inf.name);
    const mk = markFor(p);
    const key = keyOf(row, i), was = oKeys?.get(key);
    const chg = second && was !== undefined && was !== sig(p), star = second && t.star;
    return `<div class="cb-st${star ? ' cb-star' : ''}" data-run="${res.running[i]}"><div class="cb-mt dc-r-${inf.rarity}" style="--fr:${chainFrame(inf.rarity)}">${mk ? `<i class="cb-mark ${mk[0]}" aria-hidden="true">${mk[1]}</i>` : ''}${t.uses ? `<i class="cb-uses">${esc(t.uses)}</i>` : ''}<span class="cb-mart">${art}</span><b class="cb-mname">${esc(inf.name)}</b></div>
     <div class="cb-plate${chg ? ' cb-chg' : ''}${p && ['idle', 'waits', 'sealed', 'spent'].includes(p.kind) ? ' cb-plate-idle' : ''}">${plateHtml(p)}</div></div>`;
  }).join('');
  const chgMedal = second && other && other.res.total !== res.total;
  return `<div class="cb-chainrow"><h5 class="cb-rowlabel">${esc(label)}</h5><div class="cb-strip" data-total="${res.total}" data-passes="${res.passes}"><div class="cb-origin">${chipIcon(trig.icon, 32)}<small>${esc(trig.name)}</small></div>
   <div class="cb-slots">${tiles}</div><div class="cb-sum"><i class="cb-eq" aria-hidden="true"></i><span class="cb-medal${chgMedal ? ' cb-chg' : ''}"><b>+${res.total}</b></span></div></div></div>`;
}
function exampleHtml(card) {
  const ex = card.example;
  const play = `<button type="button" class="cb-play" data-play="${esc(card.id)}">Play</button>`;
  if (ex.kind === 'chain') {
    const A = resolveRow(ex.a, ex.trigger, ex.aVars), B = resolveRow(ex.b, ex.trigger, ex.bVars);
    const say = ex.say.replace('{a}', A.total).replace('{b}', B.total);
    ex._res = {a: A.total, b: B.total};
    return `<section class="cb-ex" data-kind="chain" aria-label="How ${esc(card.name)} works"><div class="cb-exhead"><h4>How it works</h4>${play}</div>
     ${stripHtml(ex, ex.a, A, null, ex.labels[0], false)}${stripHtml(ex, ex.b, B, {row: ex.a, res: A}, ex.labels[1], true)}<p class="cb-say">${esc(say)}</p></section>`;
  }
  const frames = ex.frames.map((key, i) => { const svg = K.toSvg(FRAMES[key]()).replace('<svg ', '<svg class="cb-px" role="img" aria-label="' + esc(ex.labels[i] + ': ' + ex.caps[i]) + '" ');
    return `<figure class="cb-fr" data-f="${i}"><div class="cb-frameimg">${svg}</div><figcaption><b>${esc(ex.labels[i])}</b><span>${esc(ex.caps[i])}</span></figcaption></figure>`; });
  const facts = ex.facts ? `<table class="cb-facts"><thead><tr><th scope="col"><span class="cb-sr">What changes</span></th><th scope="col">${esc(ex.labels[0])}</th><th scope="col">${esc(ex.labels[1])}</th></tr></thead><tbody>${ex.facts.map(f => `<tr><th scope="row">${esc(f[0])}</th><td>${esc(f[1])}</td><td class="cb-chg">${esc(f[2])}</td></tr>`).join('')}</tbody></table>` : '';
  return `<section class="cb-ex" data-kind="scene" aria-label="How ${esc(card.name)} works"><div class="cb-exhead"><h4>How it works</h4>${play}</div><div class="cb-scene">${frames[0]}<span class="cb-then">then</span>${frames[1]}</div>${facts}<p class="cb-say">${esc(ex.say)}</p></section>`;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEP = 330;
const playing = new Set();
async function playExample(id, stopAt = null) {
  const root = $(`#card-${id} .cb-ex`);
  if (!root || playing.has(id)) return;
  playing.add(id);
  const btn = $('.cb-play', root); btn.disabled = true; btn.textContent = 'Playing';
  root.classList.add('cb-playing');
  if (root.dataset.kind === 'chain') {
    const strips = $$('.cb-strip', root);
    strips.forEach(s => { s.classList.add('cb-pre'); $$('.cb-st', s).forEach(t => t.classList.remove('cb-shown', 'cb-fire')); $('.cb-medal b', s).textContent = '+0'; });
    if (reduced()) strips.forEach(s => s.classList.remove('cb-pre'));
    else for (const [si, s] of strips.entries()) {
      const tiles = $$('.cb-st', s);
      for (const [i, t] of tiles.entries()) {
        t.classList.add('cb-shown', 'cb-fire');
        if (!t.classList.contains('cb-stempty')) $('.cb-medal b', s).textContent = '+' + t.dataset.run;
        if (stopAt && si === stopAt[0] && i === stopAt[1]) { playing.delete(id); return; }
        await sleep(t.classList.contains('cb-stempty') ? 120 : STEP);
        t.classList.remove('cb-fire');
      }
      if (Number(s.dataset.passes) > 1) { $('.cb-medal', s).classList.add('cb-fire'); await sleep(STEP); }
      $('.cb-medal b', s).textContent = '+' + s.dataset.total;
      $('.cb-medal', s).classList.add('cb-fire'); await sleep(STEP * 1.4); $('.cb-medal', s).classList.remove('cb-fire');
    }
    strips.forEach(s => { s.classList.remove('cb-pre'); $$('.cb-st', s).forEach(t => t.classList.remove('cb-shown', 'cb-fire')); $('.cb-medal b', s).textContent = '+' + s.dataset.total; });
  } else {
    const frames = $$('.cb-fr', root);
    root.classList.add('cb-scenepre');
    for (const f of frames) { frames.forEach(o => o.classList.toggle('cb-on', o === f)); await sleep(reduced() ? 50 : 1100); }
    root.classList.remove('cb-scenepre'); frames.forEach(o => o.classList.remove('cb-on'));
  }
  root.classList.remove('cb-playing'); btn.disabled = false; btn.textContent = 'Play'; playing.delete(id);
}

// ── State: decisions persist in localStorage the moment they change ──────────────────────────────────
const D = {};
try { const raw = JSON.parse(localStorage.getItem(KEY) || '{}'); if (raw && typeof raw === 'object') for (const [id, e] of Object.entries(raw)) if (CARD_BY_ID[id] && e && typeof e === 'object') D[id] = {decision: ['approve', 'deny', 'change'].includes(e.decision) ? e.decision : null, note: String(e.note || ''), at: Number(e.at) || 0}; } catch {}
window.__cardboardDecisions = D;
function persist() {
  for (const id of Object.keys(D)) if (!D[id].decision && !D[id].note) delete D[id];
  try { localStorage.setItem(KEY, JSON.stringify(D)); } catch {}
}
const decisionOf = id => D[id]?.decision || null;
function setDecision(id, decision, note) {
  const e = D[id] || (D[id] = {decision: null, note: '', at: 0});
  e.decision = decision; if (note !== undefined) e.note = note; e.at = Date.now();
  persist(); refreshCard(id); refreshBar();
}
const LABEL = {approve: 'Approved', deny: 'Denied', change: 'Change'};
const counts = () => { const c = {approve: 0, deny: 0, change: 0, none: 0}; CARDS.forEach(card => { c[decisionOf(card.id) || 'none']++; }); return c; };
const famOf = id => FAMILIES.find(f => f.id === id);
const KINDWORD = {new: 'New card', rework: 'Rework', oath: 'Oath', curse: 'Curse (chosen)'};
function cardHtml(card) {
  const rework = card.kind === 'rework' && card.replaces;
  const cur = rework ? currentFace(card) : null;
  const variants = (cur ? [{label: 'Today' + (cur.retired ? ' (retired)' : cur.unreleased ? ' (not built yet)' : ''), f: cur, today: true}] : []).concat([{label: cur ? 'Proposed' : '', f: proposedFace(card)}]);
  const faces = variants.map(v => `<div class="cb-variant${v.today ? ' cb-today' : ''}">${v.label ? `<p class="cb-vlabel">${esc(v.label)}</p>` : ''}${faceHtml(v.f)}<p class="cb-cap">Opened card${v.f.sketch ? ' · sketch art, final art follows' : ''}</p>${tileHtml(v.f)}<p class="cb-cap">Deck / Chain tile</p></div>`).join('');
  const tiers = card.tiers ? `<p class="cb-tiers"><b>Line</b>${esc(card.tiers)}</p>` : '';
  return `<article class="cb-card dc-r-${card.rarity}" id="card-${card.id}" data-id="${card.id}" data-family="${card.family}" data-kind="${card.kind}" data-decision="none">
   <span class="cb-ribbon" aria-hidden="true"></span>
   <header class="cb-head"><h3>${esc(card.name)}</h3><span class="cb-kind cb-k-${card.kind}">${KINDWORD[card.kind]}</span>${triggerChip(card.trigger)}<code class="cb-id">${card.id}</code></header>
   <div class="cb-ctl" role="group" aria-label="Decision for ${esc(card.name)}">
    <button type="button" class="cb-btn cb-yes" data-act="approve" aria-pressed="false" title="Approve ${esc(card.name)}">${CHECK}<span>Approve</span></button>
    <button type="button" class="cb-btn cb-no" data-act="deny" aria-pressed="false" title="Deny ${esc(card.name)}">${CROSS}<span>Deny</span></button>
    <button type="button" class="cb-btn cb-chgbtn" data-act="change" aria-pressed="false" aria-expanded="false" title="Ask for a change to ${esc(card.name)}"><span>Change…</span></button>
    <span class="cb-state" aria-live="polite"></span></div>
   <div class="cb-note" hidden><label for="note-${card.id}">What should change?</label><textarea id="note-${card.id}" rows="2" maxlength="600" placeholder="Your note, for example: make it +3, or move it to Rare"></textarea><div class="cb-noteacts"><button type="button" class="cb-mini cb-clear">Clear decision</button><button type="button" class="cb-mini cb-done">Done</button></div></div>
   <p class="cb-notebadge" hidden></p>
   <div class="cb-body"><div class="cb-faces" role="button" tabindex="0" aria-pressed="false" aria-label="Click to approve or un-approve ${esc(card.name)}" title="Click the card to approve or un-approve it">${faces}</div>
    <div class="cb-info"><p class="cb-rule"><b>Rule</b>${esc(card.text)}</p>${cur ? `<p class="cb-rule cb-cur"><b>Today</b>${esc(cur.ruleFull)}</p>` : ''}${tiers}<p class="cb-why"><b>Why</b>${esc(card.why)}</p>${exampleHtml(card)}</div></div>
  </article>`;
}
function refreshCard(id) {
  const el = $(`#card-${id}`); if (!el) return;
  const d = decisionOf(id), e = D[id];
  el.dataset.decision = d || 'none';
  $('.cb-ribbon', el).textContent = d ? LABEL[d] : '';
  $('.cb-state', el).textContent = d ? LABEL[d] : 'Undecided';
  $$('.cb-btn', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.act === d));
  $('.cb-faces', el).setAttribute('aria-pressed', d === 'approve');
  const badge = $('.cb-notebadge', el);
  badge.hidden = d !== 'change';
  badge.textContent = d === 'change' ? 'Change asked: ' + (e?.note || '(no note yet)') : '';
  const ta = $('textarea', el); if (ta && document.activeElement !== ta) ta.value = e?.note || '';
  refreshTen(); refreshFamilyHeads(); refreshBuilds(); applyFilter();
}
function refreshAllCards() { CARDS.forEach(card => refreshCard(card.id)); refreshBar(); }

// ── Page: summary bar, filters, families, ten to build first, builds ─────────────────────────────────
const view = {status: 'all', family: null};
function barHtml() {
  const fam = FAMILIES.map(f => `<button type="button" class="cb-fchip" data-fam="${f.id}" aria-pressed="false">${esc(f.name)}</button>`).join('');
  return `<div class="cb-bar-row"><div class="cb-counts" role="status" aria-label="Decision counts"><span class="cb-cnt cb-c-approve"><b data-n="approve">0</b> approved</span><span class="cb-cnt cb-c-deny"><b data-n="deny">0</b> denied</span><span class="cb-cnt cb-c-change"><b data-n="change">0</b> change</span><span class="cb-cnt cb-c-none"><b data-n="none">0</b> undecided</span></div>
   <div class="cb-tools"><button type="button" class="cb-tool" id="cb-approvefam" disabled title="Choose a family chip first. Leaves cards you already denied or changed alone.">Approve all in this family</button><button type="button" class="cb-tool" id="cb-reset">Reset</button><button type="button" class="cb-tool cb-tool-main" id="cb-copy">Copy decisions</button></div></div>
   <div class="cb-bar-row cb-filters"><div class="cb-scroll" role="group" aria-label="Filters"><button type="button" class="cb-fchip" data-status="all" aria-pressed="true">All</button><button type="button" class="cb-fchip" data-status="none" aria-pressed="false">Undecided</button><button type="button" class="cb-fchip" data-status="approve" aria-pressed="false">Approved</button><button type="button" class="cb-fchip" data-status="deny" aria-pressed="false">Denied</button><button type="button" class="cb-fchip" data-status="change" aria-pressed="false">Change</button><i class="cb-sep" aria-hidden="true"></i>${fam}</div></div>`;
}
function refreshBar() { const c = counts(); $$('#cb-bar [data-n]').forEach(n => { n.textContent = c[n.dataset.n]; }); }
function applyFilter() {
  const famSel = view.family;
  CARDS.forEach(card => { const el = $(`#card-${card.id}`); if (!el) return; const d = decisionOf(card.id) || 'none';
    el.hidden = !((view.status === 'all' || view.status === d) && (!famSel || famSel === card.family)); });
  $$('.cb-fam').forEach(det => { det.hidden = !$$('.cb-card', det).some(el => !el.hidden); });
  $$('#cb-bar [data-status]').forEach(b => b.setAttribute('aria-pressed', b.dataset.status === view.status));
  $$('#cb-bar [data-fam]').forEach(b => b.setAttribute('aria-pressed', b.dataset.fam === famSel));
  const af = $('#cb-approvefam'); if (af) { af.disabled = !famSel; af.textContent = famSel ? 'Approve all in ' + famOf(famSel).name : 'Approve all in this family'; }
}
function refreshFamilyHeads() {
  FAMILIES.forEach(f => { const list = CARDS.filter(card => card.family === f.id); const c = {approve: 0, deny: 0, change: 0};
    list.forEach(card => { const d = decisionOf(card.id); if (d) c[d]++; });
    const el = $(`#fam-${f.id} .cb-prog`); if (el) el.innerHTML = `<span>${list.length} cards</span><span class="cb-pa">${c.approve} approved</span><span class="cb-pd">${c.deny} denied</span><span class="cb-pc">${c.change} change</span>`; });
}
function tenHtml() {
  return TEN_FIRST.map((id, n) => { const card = CARD_BY_ID[id];
    return `<div class="cb-tenc" data-ten="${id}" data-decision="none"><span class="cb-rank">${n + 1}</span><button type="button" class="cb-tenopen" data-open="${id}" aria-label="Show ${esc(card.name)} below">${tileHtml(proposedFace(card))}</button>
     <div class="cb-tenctl"><button type="button" class="cb-btn cb-yes cb-sq" data-tenact="approve" data-id="${id}" aria-label="Approve ${esc(card.name)}" aria-pressed="false">${CHECK}</button><button type="button" class="cb-btn cb-no cb-sq" data-tenact="deny" data-id="${id}" aria-label="Deny ${esc(card.name)}" aria-pressed="false">${CROSS}</button><span class="cb-tenstate"></span></div></div>`; }).join('');
}
function refreshTen() { $$('.cb-tenc').forEach(el => { const d = decisionOf(el.dataset.ten); el.dataset.decision = d || 'none'; $('.cb-tenstate', el).textContent = d ? LABEL[d] : '';
  $$('[data-tenact]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.tenact === d)); }); }
function buildsHtml() {
  return BUILDS.map(b => `<div class="cb-build"><h3>${esc(b.name)}</h3><div class="cb-bcards">${b.cards.map(c => {
    if (typeof c === 'string') { const card = CARD_BY_ID[c];
      return `<button type="button" class="cb-bt" data-open="${c}" data-decision="none" data-bid="${c}"><span class="cb-btart dc-r-${card.rarity}" style="--fr:${chainFrame(card.rarity)}">${artHtml(card)}</span><span class="cb-btname"><b>${esc(card.name)}</b><small class="cb-bstate">${RWORD[card.rarity]} · proposed</small></span></button>`; }
    const inf = infoOf(c.real);
    return `<div class="cb-bt cb-bt-real"><span class="cb-btart dc-r-${inf.rarity}" style="--fr:${chainFrame(inf.rarity)}">${realArt(c.real, '', c.name)}</span><span class="cb-btname"><b>${esc(c.name)}</b><small>${esc(c.note || 'existing card')}</small></span></div>`; }).join('')}</div></div>`).join('');
}
function refreshBuilds() { $$('.cb-bt[data-bid]').forEach(el => { const id = el.dataset.bid, d = decisionOf(id); el.dataset.decision = d || 'none'; const card = CARD_BY_ID[id]; $('.cb-bstate', el).textContent = RWORD[card.rarity] + ' · ' + (d ? LABEL[d].toLowerCase() : 'proposed'); }); }

function openCard(id) {
  const el = $(`#card-${id}`); if (!el) return;
  if (el.hidden) { view.status = 'all'; view.family = null; applyFilter(); }
  const det = el.closest('details'); if (det) det.open = true;
  el.scrollIntoView({block: 'start', behavior: 'auto'});
  el.classList.add('cb-flash'); setTimeout(() => el.classList.remove('cb-flash'), 1400);
}
let toastTimer = 0;
function toast(text) { const t = $('#cb-toast'); t.textContent = text; t.classList.add('cb-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('cb-on'), 2800); }
function decisionsText() {
  return CARDS.map(card => { const e = D[card.id]; return [card.id, card.name, e?.decision || 'undecided', String(e?.note || '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim()].join(' | '); }).join('\n');
}
async function copyDecisions() {
  const text = decisionsText();
  window.__cardboardLastCopy = text;
  try { await navigator.clipboard.writeText(text); toast(`Copied ${CARDS.length} lines to the clipboard`); }
  catch { const ta = Object.assign(document.createElement('textarea'), {value: text}); ta.style.cssText = 'position:fixed;left:-999px'; document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); toast(ok ? `Copied ${CARDS.length} lines to the clipboard` : 'Could not copy automatically'); }
}
let resetArmed = 0;
function resetAll() {
  const btn = $('#cb-reset');
  if (!resetArmed) { resetArmed = setTimeout(() => { resetArmed = 0; btn.textContent = 'Reset'; btn.classList.remove('cb-danger'); }, 4000); btn.textContent = 'Really reset?'; btn.classList.add('cb-danger'); return; }
  clearTimeout(resetArmed); resetArmed = 0; btn.textContent = 'Reset'; btn.classList.remove('cb-danger');
  Object.keys(D).forEach(k => delete D[k]); persist(); refreshAllCards(); toast('All decisions cleared');
}
function approveFamily(famId) {
  let n = 0, skipped = 0;
  CARDS.filter(card => card.family === famId).forEach(card => { if (!decisionOf(card.id)) { const e = D[card.id] || (D[card.id] = {decision: null, note: '', at: 0}); e.decision = 'approve'; e.at = Date.now(); n++; } else if (decisionOf(card.id) !== 'approve') skipped++; });
  persist(); refreshAllCards(); toast(`Approved ${n} card${n === 1 ? '' : 's'} in ${famOf(famId).name}${skipped ? ` (${skipped} already denied or changed, left alone)` : ''}`);
}
const toggle = (id, act) => setDecision(id, decisionOf(id) === act ? null : act);

function build() {
  $('#cb-root').setAttribute('style', rootStyle);
  $('#cb-bar').innerHTML = barHtml();
  $('#cb-ten').innerHTML = tenHtml();
  $('#cb-main').innerHTML = FAMILIES.map((f, n) => { const list = CARDS.filter(card => card.family === f.id);
    return `<details class="cb-fam" id="fam-${f.id}"${n === 0 ? ' open' : ''}><summary><span class="cb-chev" aria-hidden="true"></span><span class="cb-ftitle"><b>${esc(f.name)}</b><small>${esc(f.purpose)}</small></span><span class="cb-prog"></span><button type="button" class="cb-tool cb-famall" data-famall="${f.id}" title="Approves the undecided cards in ${esc(f.name)}; leaves denied and changed ones alone">Approve all in this family</button></summary>
     <div class="cb-cards">${list.map(cardHtml).join('')}</div></details>`; }).join('');
  $('#cb-builds').innerHTML = buildsHtml();
  const kinds = {}; CARDS.forEach(card => { kinds[card.kind] = (kinds[card.kind] || 0) + 1; });
  $('#cb-count').textContent = `${CARDS.length} cards: ${kinds.new} new, ${kinds.rework} reworks, ${kinds.oath} oaths, ${kinds.curse} curses. Nothing here is in the game.`;
  $('#cb-legend-new').innerHTML = Object.values(TRIGGERS).filter(t => t.isNew).map(t => `<span class="cb-chip cb-newchip">${chipIcon(t.icon, 16)}<b>${esc(t.name)}</b></span>`).join('');
  refreshAllCards();
}
function wire() {
  document.addEventListener('click', e => {
    const t = e.target;
    const btn = t.closest('.cb-btn[data-act]');
    if (btn) { const card = btn.closest('.cb-card'), id = card.dataset.id, act = btn.dataset.act;
      if (act === 'change') { const note = $('.cb-note', card), open = !note.hidden;
        if (decisionOf(id) !== 'change') setDecision(id, 'change'); note.hidden = open; btn.setAttribute('aria-expanded', String(!open)); if (!open) $('textarea', card).focus(); }
      else toggle(id, act); return; }
    const ten = t.closest('[data-tenact]'); if (ten) { toggle(ten.dataset.id, ten.dataset.tenact); return; }
    const opener = t.closest('[data-open]'); if (opener) { openCard(opener.dataset.open); return; }
    const play = t.closest('[data-play]'); if (play) { playExample(play.dataset.play); return; }
    const faces = t.closest('.cb-faces'); if (faces) { toggle(faces.closest('.cb-card').dataset.id, 'approve'); return; }
    const done = t.closest('.cb-done'); if (done) { const card = done.closest('.cb-card'); $('.cb-note', card).hidden = true; $('.cb-chgbtn', card).setAttribute('aria-expanded', 'false'); return; }
    const clear = t.closest('.cb-clear'); if (clear) { const card = clear.closest('.cb-card'); setDecision(card.dataset.id, null, ''); $('textarea', card).value = ''; $('.cb-note', card).hidden = true; $('.cb-chgbtn', card).setAttribute('aria-expanded', 'false'); return; }
    const st = t.closest('[data-status]'); if (st) { view.status = st.dataset.status; applyFilter(); if (view.status !== 'all') $$('.cb-fam').forEach(d => { if (!d.hidden) d.open = true; }); return; }
    const fm = t.closest('[data-fam]'); if (fm) { view.family = view.family === fm.dataset.fam ? null : fm.dataset.fam; applyFilter(); if (view.family) { const d = $(`#fam-${view.family}`); if (d) d.open = true; } return; }
    const fa = t.closest('[data-famall]'); if (fa) { e.preventDefault(); approveFamily(fa.dataset.famall); return; }
    if (t.closest('#cb-approvefam')) { if (view.family) approveFamily(view.family); return; }
    if (t.closest('#cb-reset')) { resetAll(); return; }
    if (t.closest('#cb-copy')) { copyDecisions(); return; }
    if (t.closest('#cb-expand')) { $$('.cb-fam').forEach(d => { d.open = true; }); return; }
    if (t.closest('#cb-collapse')) { $$('.cb-fam').forEach(d => { d.open = false; }); return; }
  });
  document.addEventListener('input', e => { const ta = e.target.closest?.('.cb-note textarea'); if (ta) setDecision(ta.closest('.cb-card').dataset.id, 'change', ta.value); });
  document.addEventListener('keydown', e => { const f = e.target.closest?.('.cb-faces'); if (f && (e.key === 'Enter' || e.key === ' ') && e.target === f) { e.preventDefault(); toggle(f.closest('.cb-card').dataset.id, 'approve'); } });
}
build(); wire();
window.__cardboard = {cards: CARDS, resolveRow, playExample, decisionsText, setDecision, openCard, key: KEY};
document.body.dataset.ready = '1';
