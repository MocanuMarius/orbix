// node scripts/lib/fit-table.mjs [outputs/menu-audit/results.json]: markdown table of how each screen behaves per size (fits / scrolls / clipped) and its issue count.
import fs from 'node:fs';
const {results, cannot} = JSON.parse(fs.readFileSync(process.argv[2] || 'outputs/menu-audit/results.json', 'utf8'));
const sizes = [...new Set(results.map(r => r.size))], screens = [...new Set(results.map(r => r.screen))];
console.log('| screen | ' + sizes.join(' | ') + ' |\n|---|' + sizes.map(() => '---').join('|') + '|');
for (const s of screens) console.log(`| ${s} | ` + sizes.map(z => { const r = results.find(x => x.screen === s && x.size === z); if (!r) return 'not captured'; const n = Object.entries(r.m).filter(([k, v]) => Array.isArray(v) && k !== 'motion').reduce((a, [, v]) => a + v.length, 0); return `${r.m.fit}${n ? ` (${n})` : ''}`; }).join(' | ') + ' |');
if (cannot.length) console.log('\nNot captured:\n' + cannot.map(c => '- ' + c).join('\n'));
