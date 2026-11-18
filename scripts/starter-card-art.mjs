// Draws the five starter-card pictures (48x48, whole pixels) into the design lab, then run scripts/sync-card-art.mjs.
import {readFile, writeFile} from 'node:fs/promises';
const dir = new URL('../dist/design-lab/assets/cardart/cards/', import.meta.url);
const C = {bg: '#14241e', dirt: '#2a1d12', grass: '#536430', gold: '#f0c86a', mid: '#d39a3a', hi: '#fffdf1', teal: '#1f3a33', stone: '#5a4632', sand: '#dcc693'};
const make = draw => { const px = new Map(); const put = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px.set((y + j) * 48 + x + i, c); };
  put(0, 0, 48, 48, C.bg); draw(put);
  const byColor = {}; for (const [k, c] of px) (byColor[c] ||= []).push(k);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" shape-rendering="crispEdges">${Object.entries(byColor).map(([c, ks]) => `<path fill="${c}" d="${ks.sort((a, b) => a - b).map(k => `M${k % 48} ${Math.floor(k / 48)}h1v1h-1z`).join('')}"/>`).join('')}</svg>`; };
const ground = put => { put(0, 36, 48, 12, C.dirt); put(0, 36, 48, 2, C.grass); put(6, 34, 2, 2, C.grass); put(30, 34, 3, 2, C.grass); };
const wisp = (put, x, y) => { put(x - 3, y - 3, 6, 6, C.mid); put(x - 2, y - 2, 4, 4, C.gold); put(x - 1, y - 1, 2, 2, C.hi); };
const ring = (put, cx, cy, r, c) => { for (let a = 0; a < 360; a += 3) { const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r); put(x, y, 1, 1, c); } };
const art = {
  'skim-line': make(put => { ground(put); put(4, 28, 40, 1, C.gold); put(4, 29, 40, 2, C.mid); put(8, 31, 32, 1, C.stone); wisp(put, 24, 22); put(21, 25, 1, 2, C.mid); put(26, 25, 1, 2, C.mid); }),
  'pulse-reader': make(put => { ground(put); ring(put, 24, 22, 15, C.teal); ring(put, 24, 22, 12, C.stone); ring(put, 24, 22, 8, C.gold); wisp(put, 24, 22); }),
  'courier-cord': make(put => { ground(put); wisp(put, 12, 26); put(32, 14, 8, 6, C.sand); put(33, 15, 6, 3, C.hi); put(34, 20, 2, 2, C.stone); put(37, 20, 2, 2, C.stone);
    for (let i = 0; i <= 12; i++) { const x = 16 + Math.round(i * 16 / 12), y = 24 - Math.round(i * 8 / 12) + Math.round(Math.sin(i / 12 * Math.PI) * 3); put(x, y, 2, 2, i % 3 ? C.gold : C.hi); } }),
  'meter-mark': make(put => { put(18, 6, 12, 36, C.stone); put(19, 7, 10, 34, C.teal); put(19, 22, 10, 19, C.sand); put(19, 22, 10, 2, C.hi); for (let y = 10; y < 40; y += 6) put(19, y, 10, 1, C.bg);
    put(31, 7, 8, 3, C.mid); put(31, 7, 8, 1, C.gold); put(32, 6, 6, 1, C.hi); put(14, 42, 20, 2, C.dirt); }),
  'finish-flag': make(put => { ground(put); put(28, 8, 2, 28, C.sand); put(30, 8, 12, 8, C.gold); put(30, 8, 12, 2, C.hi); put(36, 10, 2, 2, C.mid); put(26, 6, 6, 2, C.mid);
    put(5, 40, 38, 3, C.stone); put(5, 40, 24, 3, C.gold); put(5, 40, 24, 1, C.hi); put(wisp ? 6 : 6, 31, 0, 0, C.bg); wisp(put, 11, 30); }),
};
const manifest = JSON.parse(await readFile(new URL('manifest.json', dir), 'utf8'));
const idea = {'skim-line': 'A gold band hugs the terrain where a Skim counts', 'pulse-reader': 'A ring tightens round the wisp before a Pulse lands', 'courier-cord': 'A bright cord from Collector to the wisp', 'meter-mark': 'A gold notch beside a nearly full Spark Meter', 'finish-flag': 'A flag and a bar filling toward the finish'};
for (const [id, svg] of Object.entries(art)) { await writeFile(new URL(`${id}.svg`, dir), svg); manifest[id] = {file: `${id}.svg`, rarity: 'common', family: 'Starter', idea: idea[id], line: [id]}; }
await writeFile(new URL('manifest.json', dir), JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote', Object.keys(art).length);
