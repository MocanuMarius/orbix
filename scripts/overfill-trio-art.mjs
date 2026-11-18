// Draws the Brimful, Pressure Valve and Floodgate pictures (48x48, whole pixels) into the design lab, then run scripts/sync-card-art.mjs.
import {readFile, writeFile} from 'node:fs/promises';
const dir = new URL('../dist/design-lab/assets/cardart/cards/', import.meta.url);
const C = {bg: '#14241e', dirt: '#2a1d12', grass: '#536430', gold: '#f0c86a', mid: '#d39a3a', hi: '#fffdf1', teal: '#1f3a33', stone: '#5a4632', sand: '#dcc693'};
const make = draw => { const px = new Map(); const put = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px.set((y + j) * 48 + x + i, c); };
  put(0, 0, 48, 48, C.bg); draw(put);
  const byColor = {}; for (const [k, c] of px) (byColor[c] ||= []).push(k);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" shape-rendering="crispEdges">${Object.entries(byColor).map(([c, ks]) => `<path fill="${c}" d="${ks.sort((a, b) => a - b).map(k => `M${k % 48} ${Math.floor(k / 48)}h1v1h-1z`).join('')}"/>`).join('')}</svg>`; };
const ground = put => { put(0, 38, 48, 10, C.dirt); put(0, 38, 48, 2, C.grass); };
const dot = (put, x, y) => { put(x - 1, y - 1, 3, 3, C.mid); put(x, y, 1, 1, C.hi); };
const art = {
  // A full jar: gold to the brim, one Spark spilling over the right rim.
  'brimful': make(put => { ground(put); put(12, 14, 22, 24, C.stone); put(14, 16, 18, 20, C.teal); put(14, 18, 18, 18, C.mid); put(14, 18, 18, 3, C.gold); put(14, 18, 18, 1, C.hi);
    put(11, 12, 24, 3, C.stone); put(34, 20, 3, 14, C.gold); put(36, 30, 2, 8, C.gold); dot(put, 38, 14); dot(put, 31, 8); }),
  // A pipe with a valve wheel on top and a small lift arrow above it.
  'pressure-valve': make(put => { ground(put); put(2, 28, 44, 8, C.stone); put(2, 29, 44, 2, C.sand); put(2, 33, 44, 2, C.teal);
    put(22, 18, 4, 10, C.stone); put(14, 14, 20, 4, C.gold); put(14, 14, 20, 1, C.hi); put(14, 18, 4, 2, C.mid); put(30, 18, 4, 2, C.mid);
    put(23, 2, 2, 8, C.gold); put(21, 4, 6, 1, C.gold); put(19, 6, 10, 1, C.gold); put(23, 2, 2, 1, C.hi); put(8, 24, 3, 3, C.mid); put(38, 24, 3, 3, C.mid); }),
  // A stone floodgate with the slab lifted; gold Sparks pour out below it.
  'floodgate': make(put => { ground(put); put(6, 6, 6, 32, C.stone); put(36, 6, 6, 32, C.stone); put(6, 6, 36, 4, C.stone); put(6, 6, 36, 1, C.sand);
    put(12, 12, 24, 6, C.sand); put(12, 12, 24, 1, C.hi); put(12, 17, 24, 1, C.stone); put(12, 20, 24, 18, C.teal);
    for (const [x, y] of [[18, 26], [26, 24], [22, 31], [30, 33], [15, 35], [33, 28]]) dot(put, x, y); put(12, 36, 24, 2, C.gold); }),
};
const manifest = JSON.parse(await readFile(new URL('manifest.json', dir), 'utf8'));
const idea = {'brimful': 'A full jar with one Spark spilling over the rim', 'pressure-valve': 'A valve wheel on a pipe, a lift arrow above', 'floodgate': 'A stone gate lifted open, Sparks pouring out'};
const rarity = {'brimful': 'common', 'pressure-valve': 'rare', 'floodgate': 'legendary'};
const family = {'brimful': 'Overfill', 'pressure-valve': 'Overfill', 'floodgate': 'Overfill'};
for (const [id, svg] of Object.entries(art)) { await writeFile(new URL(`${id}.svg`, dir), svg); manifest[id] = {file: `${id}.svg`, rarity: rarity[id], family: family[id], idea: idea[id], line: [id]}; }
await writeFile(new URL('manifest.json', dir), JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote', Object.keys(art).length);
