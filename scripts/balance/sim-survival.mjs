// Survival of the simulated pilots on the first 6 flights, Lift Guide alone, 30 seeded runs (the "survival" part of starter-balance.mjs).
//   node scripts/balance/sim-survival.mjs --pilot=player-average --mode=app|legacy [--runs=30]   -> outputs/balance/sim-survival/<mode>-<pilot>.json
//   node scripts/balance/sim-survival.mjs --table                                                   -> prints the markdown table of all files
// mode=app: the app's flight options on the fixed route (default of starter-sim). mode=legacy: flight options and Rest-when-hurt route as before 2026-11-19.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSim } from './starter-sim.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const dir = fileURLToPath(new URL('../../outputs/balance/sim-survival/', import.meta.url)), PILOTS = ['player-beginner', 'player-average', 'player-good'];
if (args.table) {
  const row = (mode, p) => { const f = `${dir}${mode}-${p}.json`; if (!fs.existsSync(f)) return null; const rs = JSON.parse(fs.readFileSync(f, 'utf8')), n = rs.length, avg = k => rs.reduce((a, r) => a + r[k], 0) / n;
    return `| ${p} | ${avg('cleared').toFixed(1)} | ${rs.filter(r => r.died).length}/${n} | ${avg('hearts').toFixed(2)} | ${(rs.reduce((a, r) => a + r.attempts, 0) / n).toFixed(1)} |`; };
  for (const mode of ['legacy', 'app']) { console.log(`\n${mode}\n| pilot | cleared of 6 | died before stop 6 | hearts lost | flights flown |\n|---|---|---|---|---|`); for (const p of PILOTS) console.log(row(mode, p) || `| ${p} | - |`); }
} else {
  const sim = await createSim({ style: args.pilot }), runs = Number(args.runs || 30), out = [];
  for (let i = 0; i < runs; i++) { const r = sim.flyRun(['lift-guide'], `sb${i}`, { restBelow: 88, legacy: args.mode === 'legacy' }); out.push({ seed: `sb${i}`, cleared: r.cleared, attempts: r.attempts, hearts: r.hearts, died: r.died, deaths: r.deaths, att: r.att }); }
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(`${dir}${args.mode}-${args.pilot}.json`, JSON.stringify(out));
  console.error(args.mode, args.pilot, 'done');
}
