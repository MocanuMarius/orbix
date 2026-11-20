// Timer loop check (2026-11-20): real flights for Chains that run on Timers; reports Timer firings per flight, the most
// firings and the most engine log entries in one simulation instant, and any engine safety stop ('halt').
//   node scripts/balance/timer-loop-check.mjs [--seeds=2]
import { fly, BIOME_LEVELS, sum } from './real-flight-check.mjs';
export const LOOP_CHAINS = [
  ['slow-wick', 'spark-chime'],
  ['slow-wick', 'wave-loom', 'harvest-common'],
  ['long-fuse', 'echo', 'body-spark'],
  ['metronome', 'slow-wick', 'third-beat', 'momentum'],
];
const arg = process.argv.find(a => a.startsWith('--seeds='));
const seeds = arg ? +arg.split('=')[1] : 2;
const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
export function loopStats(ids) {
  const fl = levels.flatMap(l => Array.from({ length: seeds }, (_, seedIndex) => fly({ ids, levelId: l.id, seedIndex, engineOptions: { cardPilot: true } })));
  let maxTurnsAtOnce = 0, maxEntriesAtOnce = 0, halts = 0, turns = 0, gains = 0;
  for (const f of fl) {
    const log = f.log.engine.cardEngine?.log || [], at = new Map(), tt = new Map();
    for (const x of log) { at.set(x.t, (at.get(x.t) || 0) + 1); if (x.k === 'turn') { tt.set(x.t, (tt.get(x.t) || 0) + 1); turns++; } if (x.k === 'halt') halts++; if (x.k === 'gain') gains++; }
    maxEntriesAtOnce = Math.max(maxEntriesAtOnce, ...at.values(), 0); maxTurnsAtOnce = Math.max(maxTurnsAtOnce, ...tt.values(), 0);
  }
  return { ids, flights: fl.length, turnsPerFlight: turns / fl.length, gainsPerFlight: gains / fl.length, maxTurnsAtOnce, maxEntriesAtOnce, halts };
}
if (process.argv[1]?.endsWith('timer-loop-check.mjs')) for (const ids of LOOP_CHAINS) { const r = loopStats(ids); console.log(`${ids.join(' + ')}: ${r.flights} flights, Timer firings/flight ${r.turnsPerFlight.toFixed(1)}, card gains/flight ${r.gainsPerFlight.toFixed(1)}, max firings in one step ${r.maxTurnsAtOnce}, max log entries in one instant ${r.maxEntriesAtOnce}, safety stops ${r.halts}`); }
