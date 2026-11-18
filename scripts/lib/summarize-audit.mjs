// node scripts/lib/summarize-audit.mjs log1.txt [log2.txt ...]: one line per distinct finding (sizes merged) from menu-audit.mjs console logs.
import fs from 'node:fs';
const map = new Map(); let cur = '';
for (const file of process.argv.slice(2)) for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
  const h = l.match(/^== (\S+) @ (\S+)/); if (h) { cur = h[1]; continue; }
  const k = l.match(/^  ([a-z<>0-9 ]+?)\s{2,}(.*)$/); if (!k || !cur) continue;
  const key = cur + '|' + k[1].trim() + '|' + k[2].replace(/\d+x\d+/g, 'N').replace(/\d+,\d+/g, 'N').slice(0, 170);
  map.set(key, (map.get(key) || 0) + 1);
}
const by = {};
for (const [key, n] of map) { const [s, kind, msg] = key.split('|'); (by[kind] ??= []).push(`${s} (${n}): ${msg}`); }
for (const [kind, rows] of Object.entries(by)) { if (kind === 'motion') continue; console.log(`\n## ${kind} (${rows.length})`); console.log(rows.join('\n')); }
