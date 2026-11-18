// Draws the Second Look picture (48x48, whole pixels): an eye over two overlapping cards. Then run scripts/sync-card-art.mjs.
import {readFile, writeFile} from 'node:fs/promises';
const dir = new URL('../dist/design-lab/assets/cardart/cards/', import.meta.url);
const C = {bg: '#14241e', gold: '#f0c86a', mid: '#d39a3a', hi: '#fffdf1', teal: '#1f3a33', stone: '#5a4632', sand: '#dcc693', blue: '#6fb0d8'};
const px = new Map(); const put = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px.set((y + j) * 48 + x + i, c); };
put(0, 0, 48, 48, C.bg);
// two overlapping cards, back one tilted by offset
put(8, 22, 18, 22, C.stone); put(9, 23, 16, 20, C.teal); put(12, 28, 10, 2, C.mid); put(12, 33, 10, 2, C.mid);
put(20, 18, 18, 22, C.sand); put(21, 19, 16, 20, C.stone); put(22, 20, 14, 18, C.teal); put(25, 31, 8, 2, C.gold); put(25, 35, 8, 2, C.gold);
// the eye above: almond outline, iris, pupil, glint
const rows = [[3, 14], [2, 18], [1, 22], [0, 26]];
const cx = 24, cy = 11;
for (let dy = -5; dy <= 5; dy++) { const w = Math.round(17 - Math.abs(dy) * 2.8); if (w > 0) put(cx - w, cy + dy, w * 2, 1, Math.abs(dy) >= 4 ? C.mid : C.hi); }
put(cx - 5, cy - 4, 10, 8, C.blue); put(cx - 4, cy - 5, 8, 10, C.blue); put(cx - 2, cy - 2, 4, 4, C.bg); put(cx - 4, cy - 4, 2, 2, C.hi);
put(cx - 18, cy, 2, 1, C.gold); put(cx + 16, cy, 2, 1, C.gold);
const byColor = {}; for (const [k, c] of px) (byColor[c] ||= []).push(k);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" shape-rendering="crispEdges">${Object.entries(byColor).map(([c, ks]) => `<path fill="${c}" d="${ks.sort((a, b) => a - b).map(k => `M${k % 48} ${Math.floor(k / 48)}h1v1h-1z`).join('')}"/>`).join('')}</svg>`;
await writeFile(new URL('second-look.svg', dir), svg);
const manifest = JSON.parse(await readFile(new URL('manifest.json', dir), 'utf8'));
manifest['second-look'] = {file: 'second-look.svg', rarity: 'rare', family: 'Second Look', idea: 'An eye over two overlapping cards', line: ['second-look']};
await writeFile(new URL('manifest.json', dir), JSON.stringify(manifest, null, 2) + '\n');
