// Summarise pilot-courses.mjs result files: clears per row band and per course.
//   node scripts/course-design/pilot-summary.mjs file.json [file.json ...]
// Row 0 is the row 1-2 band, row 3 is rows 3-5, row 6 is rows 6-7 (the rows the pilots fly).
import fs from 'node:fs';
const band = stage => stage <= 1 ? 'row1-2' : stage <= 5 ? 'row3-5' : 'row6-7';
for (const file of process.argv.slice(2)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const gen of [...new Set(data.rows.map(r => r.gen))]) {
    const rows = data.rows.filter(r => r.gen === gen), out = {};
    for (const b of ['row1-2', 'row3-5', 'row6-7']) { const r = rows.filter(x => band(x.stage) === b); out[b] = `${r.filter(x => x.success).length}/${r.length}`; }
    const byCourse = {};
    for (const r of rows) { const c = byCourse[r.levelId] ||= { n: 0, ok: 0, deaths: [] }; c.n++; if (r.success) c.ok++; else c.deaths.push(`${r.stage}:${r.deathAt?.where}`); }
    const total = rows.filter(r => r.success).length;
    const weakest = Object.entries(byCourse).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 8);
    console.log(`${file.split(/[\\/]/).pop()} gen${gen}: total ${total}/${rows.length}  ${JSON.stringify(out)}`);
    console.log('  weakest: ' + weakest.map(([id, c]) => `${id} ${c.ok}/${c.n}`).join(', '));
    if (process.env.DEATHS) for (const [id, c] of weakest) if (c.ok < c.n) console.log(`  ${id}: ${c.deaths.join(' | ')}`);
  }
}
