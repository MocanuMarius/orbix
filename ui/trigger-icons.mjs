// Pixel art for the Chain and Deck screens (v2.3-deck), moved from the design lab (dist/design-lab/deck.mjs).
// Every piece is drawn from a letter grid as crisp SVG rects in code, so nothing here depends on a stylesheet's
// folder: the Trigger icons, the eye, the warning mark, the rarity gem, the campfire, the scroll chevron, the
// 9-slice tile frames and the result medallion. Outline #2a1d12, light from the top left, the Spark's own golds.
export const PAL = {O: '#2a1d12', D: '#d39a3a', G: '#f0c86a', W: '#fffdf1', C: '#d8c98a', Y: '#f3e6b9', B: '#8a6d44', L: '#5a4632', M: '#536430', m: '#8a9a4a', R: '#7a2f2a', r: '#b8574a', S: '#42768f', s: '#8fb8c8', P: '#a58c57', E: '#c8642e', K: '#cdbf98', N: '#5f9f86', n: '#b4dcc0'};
export function pixelArt(rows, {size = 16, pal = PAL, cls = ''} = {}) {
  const grid = rows.length, paths = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => {if (pal[ch]) (paths[ch] ||= []).push(`M${x} ${y}h1v1h-1z`);}));
  return `<svg class="${cls}" viewBox="0 0 ${grid} ${grid}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([ch, d]) => `<path fill="${pal[ch]}" d="${d.join('')}"/>`).join('')}</svg>`;
}
const BLANK = '................';
const pad16 = rows => [...rows, ...Array(16 - rows.length).fill(BLANK)];
// The Trigger icons. Same outline (#2a1d12), same light from the top left, the Spark's own golds.
export const TRIGGER_ART = {
  // Collect: the wisp orb taking the glint (the Spark entering it from the top right).
  'body-spark': pad16([BLANK, BLANK, BLANK, '..........O.....', '.........OGO..G.', '........OGWGO...', '.....OOOGWWWGO..', '...OOCCCOGWGO...', '..OCCYYYYOGO..G.', '..OCYWWYYYOO....', '..OCYWWYYYCO....', '..OCYYYYYYCO....', '..OCCYYYYCCO....', '...OOCCCCOO.....', '.....OOOO.......']),
  // Delivery: the Collector (green orb) pushing a Spark towards you, speed lines behind it.
  'collector-delivery': pad16([BLANK, BLANK, BLANK, BLANK, BLANK, '.........OOO....', '...O....ONNNO.LL', '..OGO..ONWnNNO..', '.OGWGO.ONnnnNO.L', '..OGO..ONnnnNO..', '...O....ONNNO.LL', '.........OOO....']),
  'collector-attach': pad16(['...OOO..........', '...OBO..........', '...OBO..........', '...OBO.....O....', '...OBO....OGO...', '...OBO...OGWGO..', '...OBO....OGO...', '...OBO.....O....', '...OBO..........', '...OBO.....OOO..', '...OBO.....OBO..', '...OBO.....OBO..', '...OBBOOOOOBBO..', '....OBBBBBBBO...', '.....OOOOOOO....']),
  'wave-crossing': pad16([BLANK, BLANK, BLANK, BLANK, '.......O........', '......OGO.......', '.....OGWGO......', '......OGO.......', '..OOO..O..OOO...', '.OsssO...OsssO..', 'OsSSSsOOOsSSSsO.', 'OSSSSSSSSSSSSSSO', 'OSSSSSSSSSSSSSSO', '.OOOOOOOOOOOOOO.']),
  'flash-pickup': pad16([BLANK, '.........OOOOO..', '........OGGGGO..', '.......OGWGGO...', '......OGWGGO....', '.....OGWGGOOOO..', '....OGWGGGGGDO..', '....OOOOOGGDO...', '........OGDO....', '.......OGDO.....', '......OGDO......', '.....OGDO.......', '....OGO.........', '....OO..........']),
  'flash-expiry': pad16([BLANK, '.........OOOOO..', '........OPPPPO..', '.......OPCPPO...', '......OPCPPO....', '.....OPCPPOOOO..', '....OOOOOOOPBO..', BLANK, '........OOBO....', '.......OPBO.....', '......OPBO......', '.....OPBO.......', '....OPO.........', '....OO..........']),
  'downbeat-lift': pad16([BLANK, '.......OO.......', '......OGGO......', '.....OGWGGO.....', '....OGGOOGGO....', '...OGGO..OGGO...', '...OOO....OOO...', BLANK, '......OOOO......', '......OBBO......', '......OBBO......', '...OOOOBBOOOO...', '....OBBBBBBO....', '.....OBBBBO.....', '......OBBO......', '.......OO.......']),
  // Overfill: a full meter with the Spark bursting out of the top and drops spilling over.
  'natural-overfill': pad16(['.......O........', '......OGO.......', '.....OGWGO......', '...G..OGO..G....', '....OOOOOOO.....', '.G..OGGGGDO..G..', '....OGWGGDO.....', '....OOOOOOO.....', '....OGGGGDO.....', '....OOOOOOO.....', '....OGGGGDO.....', '....OOOOOOO.....', '....OGGGGDO.....', '....OOOOOOO.....']),
  // Rhythm: three even Lifts, with their beat ticks.
  'rhythm-phrase': pad16([BLANK, BLANK, BLANK, '..O....O....O...', '.OGO..OGO..OGO..', 'OGWGOOGWGOOGWGO.', 'OO.OOOO.OOOO.OO.', BLANK, '..L....L....L...', '..L....L....L...', '..L....L....L...']),
  'field-swipe': pad16([BLANK, BLANK, '...........OOO..', '..........OGGO..', '.........OGGO...', '........OGWO....', '.......OGWO.....', '......OGWO..LLL.', '.....OGWO.......', '....OGWO...LLL..', '...OGGO.........', '..OGGO....LLL...', '.OOOO...........']),
  'guard-rescue': pad16([BLANK, BLANK, BLANK, '...OOO....OOO...', '..OrrrO..OrrrO..', '.OrWrrrOOrrrRRO.', '.OrWrrrrrrrrRRO.', '.OrrrrrrrrrrRRO.', '..OrrrrrrrrRRO..', '...OrrrrrrRRO...', '....OrrrrRRO....', '.....OrrRRO.....', '......ORRO......', '.......OO.......']),
  'flight-clear': pad16([BLANK, '...OO...........', '...OBOOOOOO.....', '...OBOMmMMMO....', '...OBOmMMMMMO...', '...OBOMMMMMO....', '...OBOOOOOO.....', '...OBO..........', '...OBO..........', '...OBO..........', '...OBO..........', '...OBO..........', '...OBO..........', '..OBBBO.........', '..OOOOO.........']),
  'expedition-victory': pad16([BLANK, BLANK, BLANK, BLANK, '..O....O....O...', '.OGO..OGO..OGO..', '.OGGOOGWGOOGGO..', '.OGGGGGGGGGGGO..', '.OGWGGGGGGGGDO..', '.OGGGGGGGGGGDO..', '.OOOOOOOOOOOOO..']),
};
// Trigger chips that are not a single flight event (v1.0-engine Phase 2, and the badges for Always on, Any Trigger,
// Next card): same 16 grid, outline, light from the top left. The Pulse a card sends keeps the Pulse blue.
const dialRows = Array.from({length: 16}, (_, y) => Array.from({length: 16}, (_, x) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r > 7.5) return '.';
  if (r > 6.3) return 'O';
  if (r > 5.4) return (x + y) % 4 === 0 && r > 5.6 ? 'D' : 'G';
  if ((x === 7 || x === 8) && y >= 3 && y <= 8) return 'O';
  if ((y === 7 || y === 8) && x >= 8 && x <= 11) return 'O';
  return 'Y';
}).join(''));
Object.assign(TRIGGER_ART, {
  // Card Pulse: a card sending Pulse rings to its right.
  'engine-pulse': pad16([BLANK, BLANK, BLANK, '.OOOOOO.........', '.OYYYYO....SS...', '.OYGGYO......S..', '.OGWWGO..SS...S.', '.OGWWGO....S..S.', '.OYGGYO....S..S.', '.OYYYYO..SS...S.', '.OYYYYO......S..', '.OOOOOO....SS...']),
  // On gain: a Spark with a moss plus.
  'engine-gain': pad16([BLANK, '.....OO.........', '....OGGO........', '...OGWWGO.......', '..OGWWGGDO......', '.OGWGGGGDDO.....', '.OGGGGGGDDO.....', '..OGGGGDDO......', '...OGGDDO.OOOO..', '....ODDO..OMMO..', '.....OO.OOOMMOOO', '........OMMMMMMO', '........OMMMMMMO', '........OOOMMOOO', '..........OMMO..', '..........OOOO..']),
  // Any event: a card with three dots (any card event to its left).
  'engine-any': pad16([BLANK, BLANK, BLANK, '.OOOOOO.........', '.OYYYYO.........', '.OYGGYO.........', '.OGWWGO.........', '.OGWWGO.DD.DD.DD', '.OYGGYO.DD.DD.DD', '.OYYYYO.........', '.OYYYYO.........', '.OOOOOO.........']),
  // Skim: the wisp low over terrain, Proximity glints between.
  'engine-skim': pad16([BLANK, BLANK, BLANK, '.........OOOO...', '........OYWWYO..', '..LLL...OWWWYO..', '.LLL....OYWYYO..', '..LLL...OYYYCO..', '.........OOOO...', BLANK, '.......G..G..G..', BLANK, 'OOOOOOOOOOOOOOOO', 'mmmmmmmmmmmmmmmm', 'MmMMmMMMmMMMmMMm', 'MMMMMMMMMMMMMMMM']),
  // Low Lift: a Lift over a meter with only its bottom segment lit.
  'engine-lift': pad16([BLANK, '.......OO.......', '......OGGO......', '.....OGWGGO.....', '....OGGOOGGO....', '...OGGO..OGGO...', '...OOO....OOO...', BLANK, '.....OOOOOO.....', '.....OLLLLO.....', '.....OOOOOO.....', '.....OLLLLO.....', '.....OOOOOO.....', '.....OGGGDO.....', '.....OOOOOO.....']),
  // Pack: the satchel the meter's spare Sparks go into.
  pack: pad16([BLANK, BLANK, BLANK, '....OOOOOOOO....', '....OPPWGPPO....', '....OPPPPPPO....', '..OOOOOOOOOOOO..', '..OBBBBBBBBBBO..', '..OBBBBGGBBBBO..', '..OBBBBOOBBBBO..', '..OBBBBBBBBBBO..', '..OBBBBBBBBBBO..', '..OBBBBBBBBBBO..', '..OOOOOOOOOOOO..']),
  // Take-off: the wisp leaving a split ledge.
  'take-off': pad16([BLANK, '......OOOO......', '.....OYWWYO.....', '.....OWWWYO.....', '.....OYWYCO.....', '......OOOO......', BLANK, '......G..G......', BLANK, '.......GG.......', '......G..G......', BLANK, 'OOOOOO....OOOOOO', 'BBBBBO....OBBBBB', 'BBBBBO....OBBBBB', 'LLLLLO....OLLLLL']),
  // Each Turn: the closed track with a Spark on it.
  'engine-turn': pad16([BLANK, '.....O..........', '....OGO.........', '..OOGWGOOOOOOO..', '..OBOGOBBBBBBO..', '..OBOOOOOOOOBO..', '..OBO......OBO..', '..OBO......OBO..', '..OBO......OBO..', '..OBO......OBO..', '..OBOOOOOOOOBO..', '..OBBBBBBBBBBO..', '..OOOOOOOOOOOO..']),
  // Timers: a dial.
  timers: dialRows,
  // Always on: a steady lamp.
  'always-on': pad16([BLANK, '.......DD.......', '..D....DD....D..', '...D........D...', '......OOOO......', '.....OGGGGO.....', '....OGWWGGDO....', 'DD..OGWGGGDO..DD', 'DD..OGGGGGDO..DD', '....OGGGGDDO....', '.....ODDDDO.....', '......OOOO......', '...D........D...', '..D....DD....D..', '.......DD.......']),
  // Any Trigger: four Sparks round a centre.
  any: pad16(['.......O........', '......OGO.......', '.....OGWGO......', '......OGO.......', '.......O........', '..O.........O...', '.OGO.......OGO..', 'OGWGO..D..OGWGO.', '.OGO.......OGO..', '..O.........O...', '.......O........', '......OGO.......', '.....OGWGO......', '......OGO.......', '.......O........']),
  // Next card: the card to its right is the one that counts.
  next: pad16([BLANK, BLANK, BLANK, '.OOOOO...OOOOOO.', '.OKKKO...OYYYYO.', '.OKKKO...OYGGYO.', '.OKKKO...OGWWGO.', '.OKKKO.DDOGWWGO.', '.OKKKO.DDOYGGYO.', '.OKKKO...OYYYYO.', '.OKKKO...OYYYYO.', '.OOOOO...OOOOOO.']),
});
export const CAMPFIRE = pad16([BLANK, BLANK, '.......O........', '......OEO.......', '......OEEO......', '.....OEGEO......', '.....OEGGEO.....', '....OEGWGEO.....', '....OEGWWGEO....', '....OEGGWGEO....', '...OOOEGGEOOO...', '..OBBOOOOOOBBO..', '.OBBBBBBBBBBBBO.', '..OOBBOOOOBBOO..', '....OO....OO....']);
export const CHEVRON = pad16([BLANK, BLANK, BLANK, BLANK, BLANK, '..OO........OO..', '..OBO......OBO..', '...OBO....OBO...', '....OBO..OBO....', '.....OBOOBO.....', '......OBBO......', '.......OO.......']);
const GEM_ROWS = ['...OO...', '..OHAO..', '.OHAAAO.', 'OHAAAAZO', 'OAAAAZZO', '.OAAZZO.', '..OAZO..', '...OO...'];
const GEM_PAL = {common: {A: '#d8dacd', Z: '#8d9187', H: '#ffffff'}, rare: {A: '#6fa3bd', Z: '#31546f', H: '#f0d68a'}, legendary: {A: '#b9a6d6', Z: '#5b4f73', H: '#f3d6f7'}};
export const gem = r => pixelArt(GEM_ROWS, {size: 8, pal: {O: '#2a1d12', ...GEM_PAL[r]}, cls: 'dk21-gem'});
import {triggerArtKey} from '../card-rule-bands.mjs?v=finish-1';
// 9-slice frames: 12×12, stepped 2-pixel corners, outline · rim · one-pixel bevel (light top/left, dark bottom/right) · fill.
export function frameUrl({outline = '#2a1d12', rim, light, dark, fill}) {
  const paths = {};
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const a = Math.min(x, 11 - x), b = Math.min(y, 11 - y), l = Math.min(a, b, a + b - 2);
    if (l < 0) continue;
    const col = l === 0 ? outline : l === 1 ? rim : l === 2 ? ((b <= a ? y < 6 : x < 6) ? light : dark) : fill;
    (paths[col] ||= []).push(`M${x} ${y}h1v1h-1z`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges">${Object.entries(paths).map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
export const EYE = pixelArt(['................', '................', '................', '................', '....OOOOOOOO....', '..OOYYYBBYYYOO..', '.OYYYBWBBBBYYYO.', 'OYYYBBBOOBBBYYYO', 'OYYYBBBOOBBBYYYO', '.OYYYBBBBBBYYYO.', '..OOYYYBBYYYOO..', '....OOOOOOOO....', BLANK, BLANK, BLANK, BLANK], {size: 32}).replace('viewBox="0 0 16 16" width="32" height="32"', 'viewBox="0 4 16 8" width="32" height="16"');
export const WARN = pixelArt(['.....OO.....', '....OGGO....', '....OGGO....', '...OGGGGO...', '...OGOOGO...', '..OGGOOGGO..', '..OGGOOGGO..', '.OGGGGGGGGO.', '.OGGGOOGGGO.', 'OGGGGGGGGGGO', 'OOOOOOOOOOOO', '............'], {size: 12});
export const PLUS = pixelArt(['........', '...OO...', '...OO...', '.OOOOOO.', '.OOOOOO.', '...OO...', '...OO...', '........'], {size: 16});
export const NEXT = '<svg viewBox="0 0 8 10" width="8" height="10" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h2v1h1v1h1v1h1v1h1v2H6v1H5v1H4v1H3v1H1V8h1V7h1V6h1V4H3V3H2V2H1z"/></svg>';
export const FIRE = pixelArt(CAMPFIRE, {size: 16, cls: 'dk21-fire'});
const medalCache = {};
export function medalUrl(D) {
  if (medalCache[D]) return medalCache[D];
  const r = D / 2, paths = {};
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dist = Math.hypot(x + .5 - r, y + .5 - r);
    if (dist > r) continue;
    const lit = x + y < D - 1;
    const col = dist > r - 2 ? '#2a1d12' : dist > r - 3 ? (lit ? '#fff1c5' : '#b98f4a') : dist > r - 6 ? (lit ? '#f0c86a' : '#d39a3a') : dist > r - 7 ? '#8a6d44' : '#fbf1cf';
    (paths[col] ||= []).push(`M${x} ${y}h1v1h-1z`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}" viewBox="0 0 ${D} ${D}" shape-rendering="crispEdges">${Object.entries(paths).map(([c, p]) => `<path fill="${c}" d="${p.join('')}"/>`).join('')}</svg>`;
  return (medalCache[D] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}
TRIGGER_ART.rest = CAMPFIRE;
export const triggerIcon = (kind, size = 16) => (kind = kind === 'lift-sim' ? 'downbeat-lift' : kind, TRIGGER_ART[kind]) ? pixelArt(TRIGGER_ART[kind], {size, cls: 'dk21-ticon'}) : '';
/** A Trigger chip's icon (chip ids from card-rule-bands.mjs › CARD_TRIGGERS), 16 or 32 px. */
export const chipIcon = (id, size = 16) => triggerIcon(triggerArtKey(id), size);
const escB = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
/** The Trigger badge every card shows first (face, Deck tile, Chain tile): the chip's icon in a paper well and its
 * name on leather. Same place and colours everywhere; `mini` keeps the icon only (the name stays for readers). */
export function chipBadge(chip, {cls = '', mini = false} = {}) {
  const label = chip ? chip.label : 'Passive';
  if (!label) return '';
  return `<span class="tbadge${mini ? ' tbadge-mini' : ''}${cls ? ` ${cls}` : ''}" data-chip="${escB(chip?.id || 'always-on')}"${chip?.kind === 'role' ? ' data-chip-kind="role"' : ''}><i class="tbadge-i" aria-hidden="true">${chipIcon(chip?.id || 'always-on', 16)}</i><b class="tbadge-n${mini ? ' tbadge-sr' : ''}">${escB(label)}</b></span>`;
}
/** Rarity without words: 1, 2 or 3 small gems (Common, Rare, Legendary), for players who cannot rely on colour. */
export const rarityPips = r => `<span class="rpips rpips-${r}" aria-hidden="true">${Array.from({length: r === 'legendary' ? 3 : r === 'rare' ? 2 : 1}, () => gem(r)).join('')}</span>`;
// The 9-slice tile frames by rarity and state (set as --fr-* on the screen root).
export const FRAME_COLOURS = {
    // Rarity by colour (owner, 17 Nov): rim and a tinted ground per rarity; Legendary keeps a gold key-line.
    common: {rim: '#8d9187', light: '#fbf8ea', dark: '#c4bfa8', fill: '#ebe6d0'},
    rare: {rim: '#42768f', light: '#d9ebf2', dark: '#7fa6b8', fill: '#d2e1e4'},
    legendary: {rim: '#5b4f73', light: '#f0c86a', dark: '#b98f4a', fill: '#e3d6ec'},
    rest: {outline: '#6b5335', rim: '#b9a47a', light: '#efe2bc', dark: '#cbb58a', fill: '#e6d3a3'},
    plate: {rim: '#8a6d44', light: '#fffbe8', dark: '#d2b97f', fill: '#f1e0b0'},
    idle: {outline: '#5f5a4d', rim: '#8f897a', light: '#ddd6c2', dark: '#b3ab95', fill: '#cdc6b0'},
    // Cards in the chain: moss outline and a faint moss-washed paper, so the group reads as placed.
    chainCommon: {outline: '#3d4a22', rim: '#8d9187', light: '#fbf8ea', dark: '#c4bfa8', fill: '#ebe6d0'},
    chainRare: {outline: '#3d4a22', rim: '#42768f', light: '#d9ebf2', dark: '#7fa6b8', fill: '#d2e1e4'},
    chainLegendary: {outline: '#3d4a22', rim: '#5b4f73', light: '#f0c86a', dark: '#b98f4a', fill: '#e3d6ec'},
};
export const frameVars = () => Object.entries(FRAME_COLOURS).map(([k, v]) => `--fr-${k}:${frameUrl(v)}`).join(';');

/** The Timer mark beside a Chain's total: an hourglass and an infinity sign (a time-based Chain keeps returning to the first slot). 17x10 whole pixels. */
const HG = ['OOOOOOOO', 'OGGGGGGO', '.OYYYYO.', '..OYYO..', '...OO...', '...OO...', '..OYYO..', '.OYYYYO.', 'OGGGGGGO', 'OOOOOOOO'];
const INF = ['........', '........', '........', '.OO..OO.', 'O..OO..O', '.OO..OO.', '........', '........', '........', '........'];
export const TIMER_MARK = (rows => { const paths = {}; rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) (paths[ch] ||= []).push(`M${x} ${y}h1v1h-1z`); }));
  return `<svg class="dk-timer-art" viewBox="0 0 17 10" width="51" height="30" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([ch, d]) => `<path fill="${PAL[ch]}" d="${d.join('')}"/>`).join('')}</svg>`; })(HG.map((r, i) => r + '.' + INF[i]));
