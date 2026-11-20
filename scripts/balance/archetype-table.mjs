// Archetype table (2026-11-20): flies real flights for one 3-card Chain per trigger archetype on the course behind simrun=sb1, stops 2-4, 3 pilot trials each.
//   node scripts/balance/archetype-table.mjs [--style=player-good] [--trials=3] [--stops=2,3,4] [--seed=sb1]   -> prints markdown, writes nothing itself (pipe to a file).
// Reuses scripts/balance/starter-sim.mjs (createSim.flyRun with startAt/once/trial) and its instrument() slot log. Reads dist/, never writes it.
import { createSim } from './starter-sim.mjs';
import { SPARK_UNITS } from '../player-pilot.mjs';
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] ?? d;
const style = arg('style', 'player-good'), trials = +arg('trials', 3), stops = arg('stops', '2,3,4').split(',').map(Number), seed = arg('seed', 'sb1');
const START = [{ sparks: 30, hearts: 3 }, { sparks: 15, hearts: 3 }, { sparks: 30, hearts: 3 }, { sparks: 30, hearts: 3 }, { sparks: 15, hearts: 3 }, { sparks: 15, hearts: 2 }];
// Left to right. Collect/Skim/Timer/Finish have no Common starter or too few Commons; rarer or non-starter cards are noted in outputs/balance/archetypes.md.
export const CHAINS = {
  Collect: ['body-spark', 'spark-cache', 'cluster-heart'],
  Lift: ['lift-guide', 'toll-bell', 'pacesetter'],
  Pulse: ['pulse-reader', 'harvest-common', 'first-ripple'],
  Delivery: ['courier-cord', 'courier-tip', 'courier-glass'],
  Overfill: ['meter-mark', 'ember-bell', 'spill-jar'],
  Finish: ['home-beacon', 'clean-run', 'victory-lap'],
  Skim: ['skim-line', 'close-call', 'whetstone'],
  Timer: ['spark-chime', 'slow-wick', 'long-fuse']
};
const sim = await createSim({ style });
const HOOK = logs => (e, log) => { const eng = e.cardEngine; log.eng = {}; if (eng) { const rec = eng.record.bind(eng); eng.record = en => { if (Number.isInteger(en.slot) && en.slot >= 0) { const q = log.eng[en.slot] ||= { hits: 0, gains: 0, sparks: 0, stored: 0 }; if (en.k === 'hit') q.hits += en.times || 1; else if (en.k === 'gain') { q.gains++; q.sparks += en.real || 0; } else if (en.k === 'keep') q.stored += en.amount || 0; } return rec(en); }; } logs.push(log); };
function measure(name, ids) {
  const logs = []; let flown = 0, cleared = 0, err = 0, time = 0, stored = 0, causes = {};
  for (const stop of stops) for (let t = 1; t <= trials; t++) {
    try {
      const m = sim.flyRun(ids, seed, { startAt: { stop, ...START[stop - 1] }, once: true, trial: t, prepare: HOOK(logs) });
      flown += m.attempts; cleared += m.cleared; time += m.timeFlown; if (m.cleared) stored += m.stored; for (const k in m.deaths) causes[k] = (causes[k] || 0) + m.deaths[k];
    } catch (e) { err++; }
  }
  const per = ids.map((id, i) => { const s = logs.map(l => l.slots[i]).filter(Boolean), g = logs.map(l => l.eng?.[i]).filter(Boolean); return { id, fired: s.reduce((n, x) => n + x.fired, 0) + g.reduce((n, x) => n + Math.max(x.hits, x.gains), 0), sparks: s.reduce((n, x) => n + x.sparks, 0) + g.reduce((n, x) => n + x.sparks, 0), stored: s.reduce((n, x) => n + x.stored, 0) + g.reduce((n, x) => n + x.stored, 0) }; });
  return { name, ids, flown, cleared, err, time, stored, causes, per };
}
const rows = Object.entries(CHAINS).map(([n, ids]) => measure(n, ids));
// Deep dives (--deep): Finish cards one by one after Lift Guide (baseline: Lift Guide + Deep Vessel, a passive card that pays nothing), and Timer set-ups.
export const FINISH_TESTS = ['home-beacon', 'clean-run', 'victory-lap', 'wayfarers-purse', 'nest-egg', 'growth-ring', 'wind-feather', 'curtain-call', 'deep-vessel'];
export const TIMER_TESTS = [['slow-wick'], ['spark-chime'], ['spark-chime', 'slow-wick'], ['slow-wick', 'spark-chime'], ['metronome', 'body-spark'], ['long-fuse', 'spark-chime'], ['spark-chime', 'long-fuse'], ['pulse-reader', 'spark-chime', 'slow-wick'], ['body-spark', 'metronome', 'spark-chime']];
const f = (x, n = 1) => (+x).toFixed(n);
const out = [`| Archetype | Chain | Cleared | Avg s | Card Sparks/flight | Stored/flight | Firings/flight per card (L to R) | Dead cards |`, `|---|---|---|---|---|---|---|---|`];
for (const r of rows) {
  const n = Math.max(1, r.flown), sp = r.per.reduce((a, p) => a + p.sparks, 0) / n / SPARK_UNITS * SPARK_UNITS, st = r.per.reduce((a, p) => a + p.stored, 0) / n;
  out.push(`| ${r.name} | ${r.ids.join(', ')} | ${r.cleared}/${r.flown}${r.err ? ` (${r.err} errors)` : ''} | ${f(r.time / n, 0)} | ${f(sp / SPARK_UNITS)} | ${f(st)} | ${r.per.map(p => f(p.fired / n)).join(' / ')} | ${r.per.filter(p => p.fired === 0).map(p => p.id).join(', ') || '-'} |`);
}
console.log(out.join('\n'));

if (process.argv.includes('--deep')) {
  const base = measure('base', ['lift-guide', 'deep-vessel']);
  console.log('\nFINISH (Lift Guide + card; Stored per cleared flight minus baseline of Lift Guide + Deep Vessel; baseline total ' + f(base.stored / Math.max(1, base.cleared)) + ')');
  for (const id of FINISH_TESTS) { const r = measure(id, ['lift-guide', id]); console.log(`${id}: cleared ${r.cleared}/${r.flown}, Stored/cleared flight ${f(r.stored / Math.max(1, r.cleared))}, delta ${f(r.stored / Math.max(1, r.cleared) - base.stored / Math.max(1, base.cleared))}, firings/flight ${f(r.per[1].fired / r.flown)}`); }
  console.log('\nTIMER');
  for (const ids of TIMER_TESTS) { const r = measure(ids.join('+'), ids); console.log(`${ids.join(' + ')}: cleared ${r.cleared}/${r.flown}, card Sparks/flight ${f(r.per.reduce((a, p) => a + p.sparks, 0) / r.flown / SPARK_UNITS)}, firings/flight ${r.per.map(p => f(p.fired / r.flown)).join(' / ')}`); }
}
