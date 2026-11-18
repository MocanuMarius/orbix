// Draws the Clean Run, Victory Lap and Curtain Call pictures (48x48, whole pixels) into the design lab, then run scripts/sync-card-art.mjs.
import {readFile, writeFile} from 'node:fs/promises';
const dir = new URL('../dist/design-lab/assets/cardart/cards/', import.meta.url);
const C = {bg: '#14241e', dirt: '#2a1d12', grass: '#536430', gold: '#f0c86a', mid: '#d39a3a', hi: '#fffdf1', teal: '#1f3a33', stone: '#5a4632', sand: '#dcc693'};
const make = draw => { const px = new Map(); const put = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px.set((y + j) * 48 + x + i, c); };
  put(0, 0, 48, 48, C.bg); draw(put);
  const byColor = {}; for (const [k, c] of px) (byColor[c] ||= []).push(k);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" shape-rendering="crispEdges">${Object.entries(byColor).map(([c, ks]) => `<path fill="${c}" d="${ks.sort((a, b) => a - b).map(k => `M${k % 48} ${Math.floor(k / 48)}h1v1h-1z`).join('')}"/>`).join('')}</svg>`; };
const ground = put => { put(0, 36, 48, 12, C.dirt); put(0, 36, 48, 2, C.grass); put(6, 34, 2, 2, C.grass); put(30, 34, 3, 2, C.grass); };
const wisp = (put, x, y) => { put(x - 3, y - 3, 6, 6, C.mid); put(x - 2, y - 2, 4, 4, C.gold); put(x - 1, y - 1, 2, 2, C.hi); };
const dot = (put, x, y) => { put(x - 1, y - 1, 3, 3, C.mid); put(x, y, 1, 1, C.hi); };
const HEART = ['.XX...XX.', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'];
const heart = (put, x, y, s) => HEART.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') put(x + i * s, y + j * s, s, s, j < 2 && i < 3 ? C.hi : C.gold); }));
const ringAt = (put, cx, cy, rx, ry, c) => { for (let a = 0; a < 360; a += 2) put(Math.round(cx + Math.cos(a * Math.PI / 180) * rx), Math.round(cy + Math.sin(a * Math.PI / 180) * ry), 1, 1, c); };
const art = {
  'clean-run': make(put => { ground(put); put(19, 8, 20, 20, C.stone); heart(put, 20, 9, 2); wisp(put, 10, 30); put(33, 29, 2, 6, C.stone); put(33, 29, 2, 2, C.gold);
    put(14, 40, 20, 2, C.stone); put(14, 40, 20, 1, C.sand); }),
  'victory-lap': make(put => { ground(put); ringAt(put, 24, 21, 17, 11, C.stone); ringAt(put, 24, 21, 16, 10, C.teal); dot(put, 24, 10); dot(put, 40, 21); dot(put, 11, 28); dot(put, 8, 17); wisp(put, 24, 32);
    put(22, 7, 2, 4, C.sand); put(24, 7, 6, 2, C.gold); }),
  'curtain-call': make(put => { put(0, 38, 48, 10, C.dirt); put(0, 38, 48, 2, C.stone); put(2, 4, 44, 4, C.gold); put(2, 4, 44, 1, C.hi);
    put(2, 8, 12, 30, C.mid); put(34, 8, 12, 30, C.mid); for (const x of [5, 9, 37, 41]) put(x, 8, 1, 30, C.stone); put(14, 8, 2, 20, C.gold); put(32, 8, 2, 20, C.gold);
    wisp(put, 24, 30); for (const [x, y] of [[24, 14], [20, 20], [28, 20]]) dot(put, x, y); }),
};
const manifest = JSON.parse(await readFile(new URL('manifest.json', dir), 'utf8'));
const idea = {'clean-run': 'A whole heart over a finish mark', 'victory-lap': 'Sparks round a lap track with a wisp inside', 'curtain-call': 'Curtains open on a wisp, three Sparks above it'};
const rarity = {'clean-run': 'common', 'victory-lap': 'common', 'curtain-call': 'rare'};
for (const [id, svg] of Object.entries(art)) { await writeFile(new URL(`${id}.svg`, dir), svg); manifest[id] = {file: `${id}.svg`, rarity: rarity[id], family: 'Finish', idea: idea[id], line: [id]}; }
await writeFile(new URL('manifest.json', dir), JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote', Object.keys(art).length);
