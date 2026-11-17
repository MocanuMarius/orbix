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
export const CAMPFIRE = pad16([BLANK, BLANK, '.......O........', '......OEO.......', '......OEEO......', '.....OEGEO......', '.....OEGGEO.....', '....OEGWGEO.....', '....OEGWWGEO....', '....OEGGWGEO....', '...OOOEGGEOOO...', '..OBBOOOOOOBBO..', '.OBBBBBBBBBBBBO.', '..OOBBOOOOBBOO..', '....OO....OO....']);
export const CHEVRON = pad16([BLANK, BLANK, BLANK, BLANK, BLANK, '..OO........OO..', '..OBO......OBO..', '...OBO....OBO...', '....OBO..OBO....', '.....OBOOBO.....', '......OBBO......', '.......OO.......']);
const GEM_ROWS = ['...OO...', '..OHAO..', '.OHAAAO.', 'OHAAAAZO', 'OAAAAZZO', '.OAAZZO.', '..OAZO..', '...OO...'];
const GEM_PAL = {common: {A: '#d8dacd', Z: '#8d9187', H: '#ffffff'}, rare: {A: '#6fa3bd', Z: '#31546f', H: '#f0d68a'}, legendary: {A: '#b9a6d6', Z: '#5b4f73', H: '#f3d6f7'}};
export const gem = r => pixelArt(GEM_ROWS, {size: 8, pal: {O: '#2a1d12', ...GEM_PAL[r]}, cls: 'dk21-gem'});
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
export const triggerIcon = (kind, size = 16) => TRIGGER_ART[kind] ? pixelArt(TRIGGER_ART[kind], {size, cls: 'dk21-ticon'}) : '';
// The 9-slice tile frames by rarity and state (set as --fr-* on the screen root).
export const FRAME_COLOURS = {
    common: {rim: '#9a9d90', light: '#fffbe8', dark: '#d2b97f', fill: '#f1e0b0'},
    rare: {rim: '#42768f', light: '#f0d68a', dark: '#c79f52', fill: '#f1e0b0'},
    legendary: {rim: '#716a7d', light: '#f3d6f7', dark: '#cfae86', fill: '#f1e0b0'},
    rest: {outline: '#6b5335', rim: '#b9a47a', light: '#efe2bc', dark: '#cbb58a', fill: '#e6d3a3'},
    plate: {rim: '#8a6d44', light: '#fffbe8', dark: '#d2b97f', fill: '#f1e0b0'},
    idle: {outline: '#5f5a4d', rim: '#8f897a', light: '#ddd6c2', dark: '#b3ab95', fill: '#cdc6b0'},
    // Cards in the chain: moss outline and a faint moss-washed paper, so the group reads as placed.
    chainCommon: {outline: '#3d4a22', rim: '#9a9d90', light: '#fbf8e2', dark: '#c9b980', fill: '#e9e4b6'},
    chainRare: {outline: '#3d4a22', rim: '#42768f', light: '#f0d68a', dark: '#c0a058', fill: '#e9e4b6'},
    chainLegendary: {outline: '#3d4a22', rim: '#716a7d', light: '#f3d6f7', dark: '#c9ab84', fill: '#e9e4b6'},
};
export const frameVars = () => Object.entries(FRAME_COLOURS).map(([k, v]) => `--fr-${k}:${frameUrl(v)}`).join(';');
