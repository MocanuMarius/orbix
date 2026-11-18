// Many trials of one stop: outcome, death time/progress/cause, Sparks taken. node scripts/balance/trace-trials.mjs --pilot=player-good --seed=sb1 --stop=3 --trials=20
process.argv.push('--importOnly');
const { createSim } = await import('./starter-sim.mjs');
const { SIM_START } = await import('../../dist/sim-replay.mjs');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const sim = await createSim({ style: args.pilot || 'player-average' }), stop = Number(args.stop || 3), seed = args.seed || 'sb1', N = Number(args.trials || 20);
let ok = 0, agg = { lifts: 0, time: 0, taken: 0, seen: 0, min: 0 };
for (let k = 1; k <= N; k++) {
  const m = sim.flyRun(['lift-guide'], seed, { restBelow: 88, startAt: { stop, sparks: SIM_START[stop - 1].sparks, hearts: SIM_START[stop - 1].hearts }, trial: k, once: true }), a = m.att[0];
  ok += m.cleared; agg.lifts += a.lifts / a.time; agg.time += a.time; agg.taken += a.taken; agg.seen += a.seen; agg.min += a.minMeter;
  if (args.v) console.log(k, a.ok ? 'CLEAR' : 'FALL', 't' + a.time.toFixed(1), 'prog' + Math.round(a.dist * 100) + '%', a.cause, 'taken', Math.round(a.taken), '/seen', Math.round(a.seen), 'min', a.minMeter.toFixed(2), 'hit', a.lastHit?.kind, 'lifts', a.lifts);
}
console.log(args.pilot, seed, stop, 'clear', ok + '/' + N, 'lifts/s', (agg.lifts / N).toFixed(2), 'avgtime', (agg.time / N).toFixed(0), 'taken/seen', (agg.taken / agg.seen).toFixed(2), 'minMeter', (agg.min / N).toFixed(2));
