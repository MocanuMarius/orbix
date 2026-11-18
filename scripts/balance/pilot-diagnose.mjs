// Diagnose simulated pilots on the opening flights: Lift behaviour, Spark economy and causes of death. Read-only on dist/.
// Run: node scripts/balance/pilot-diagnose.mjs [--styles=human150,human250,human350] [--runs=8] [--card=lift-guide] [--out=file.md]
import fs from 'node:fs';
import { createSim } from './starter-sim.mjs';
import { liftHeight, LIFT_PHYSICS } from '../player-pilot.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const styles = String(args.styles || 'human150,human250,human350').split(','), RUNS = Number(args.runs || 8), ids = String(args.card || 'lift-guide').split(',');
const f = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d, sum = (a, k) => a.reduce((n, r) => n + r[k], 0);
let md = `| pilot | flights | Lifts/flight | spam <0.75 s | spam <0.5 s | on-cue | Sparks spent/flight | efficient min/flight | Sparks seen on screen/flight | taken | refused Lifts/flight | died in 6 | deaths: fuel/terrain/boundary/obstacle |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const style of styles) {
  const sim = await createSim({ style }), rs = [];
  for (let i = 0; i < RUNS; i++) rs.push(sim.flyRun(ids, `sb${i}`, { q: 0 }));
  const n = sum(rs, 'attempts'), L = sum(rs, 'cueLifts') ? 0 : 0, lifts = rs.reduce((x, r) => x + r.cueLifts + 0, 0);
  const tot = rs.reduce((x, r) => x + r.attempts, 0), lf = rs.reduce((x, r) => x + (r.spam75 || 0), 0);
  const allLifts = rs.reduce((x, r) => x + r.lifts, 0), time = sum(rs, 'timeFlown'), effMin = time / (LIFT_PHYSICS.windowSec * 0 + 410 / 300) * 3;
  const d = k => rs.reduce((x, r) => x + r.deaths[k], 0);
  md += `| ${style} | ${tot} | ${f(allLifts / tot)} | ${f(100 * sum(rs, 'spam75') / allLifts, 0)}% | ${f(100 * sum(rs, 'spam50') / allLifts, 0)}% | ${f(100 * sum(rs, 'cueLifts') / allLifts, 0)}% | ${f(sum(rs, 'sparksSpent') / tot)} | ${f(effMin / tot)} | ${f(sum(rs, 'fuelSeen') / tot)} | ${f(100 * sum(rs, 'fuelTaken') / Math.max(1, sum(rs, 'fuelSeen')), 0)}% | ${f(sum(rs, 'denied') / tot)} | ${rs.filter(r => r.died).length}/${rs.length} | ${d('fuel')}/${d('terrain')}/${d('boundary')}/${d('obstacle')} |\n`;
  console.error(style, 'done');
}
const phys = [.1, .2, .3, .5, .68, 1, 1.37].map(t => `tau=${t}s: ${f(liftHeight(t), 1)} units, ${f(liftHeight(t) / 3, 1)} per Spark`).join('; ');
md += `\nHeight gained by a Lift pressed tau after the previous: ${phys}\n`;
if (args.out) fs.writeFileSync(args.out, md); console.log(md);
