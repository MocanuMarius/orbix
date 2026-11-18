// Compact table of one or more heavy.mjs result files: node scripts/perf/heavy-table.mjs a.json [b.json ...]
import fs from 'node:fs';
for(const f of process.argv.slice(2)){const j=JSON.parse(fs.readFileSync(f,'utf8'));console.log(`\n${j.label} (${j.root})`);
 console.log('scenario'.padEnd(22)+'avgFPS  1%low   p50   p95   p99  >33  >50  max  tick95 rend95 style/s');
 for(const r of j.results){if(r.failed){console.log(r.id.padEnd(22)+' FAILED '+r.failed);continue}console.log(r.id.padEnd(22)+String(r.avgFps).padStart(6)+String(r.low1Fps).padStart(7)+String(r.p50).padStart(6)+String(r.p95).padStart(6)+String(r.p99).padStart(6)+String(r.over33).padStart(5)+String(r.over50).padStart(5)+String(r.longest).padStart(5)+String(r.tickP95).padStart(8)+String(r.renderP95).padStart(7)+String(r.msPerS?.style).padStart(8))}
 for(const r of j.results)if(r.categories)console.log('  '+r.id.padEnd(20)+Object.entries(r.categories).filter(([k])=>k!=='idle').slice(0,9).map(([k,v])=>`${k} ${v.pctBusy}`).join(' | '));
}
