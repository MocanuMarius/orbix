// Reads a pasted play log (Settings > Advanced > Copy play log) and prints a per-flight table, a summary, and the same
// summary numbers for the simulated pilots side by side, so the gap between real and simulated play is plain.
//   node scripts/balance/play-log.mjs <file | ->  [--sim=live|saved|off] [--runs=4] [--pilots=player-beginner,player-average,player-good,human150,human250,human350]
// `-` or no path reads stdin. Simulated pilots: `saved` (default) reads outputs/balance/play-log-pilots.json when present, else
// flies them (`live`) and saves the result there. They fly the first six stops of Map 1 with lift-guide, as pilot-diagnose does.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseLog, codeTable } from '../../dist/play-log.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PILOT_FILE = path.join(root, 'outputs/balance/play-log-pilots.json');
const DEFAULT_PILOTS = ['player-beginner', 'player-average', 'player-good', 'human150', 'human250', 'human350'];
const f = (x, d = 1) => Number.isFinite(x) ? String(Math.round(x * 10 ** d) / 10 ** d) : '-';
const pct = (a, b) => a != null && b > 0 ? f(100 * a / b, 0) + '%' : '-';
const sum = (a, k) => a.reduce((n, r) => n + (r[k] || 0), 0);

/** Summary numbers of decoded flights (pure; used by the tests). */
export function summarize(flights) {
  const n = flights.length, lifts = sum(flights, 'lifts'), secs = sum(flights, 'dur') / 10;
  const cause = k => flights.filter(r => r.resultName !== 'cleared' && r.causeName === k).length;
  // Pooled median Lift gap: the Lift-weighted median of each flight's own median (each from its fine histogram).
  const weighted = flights.filter(r => r.gapMed).map(r => [r.gapMed / 10, r.gap.reduce((x, y) => x + y, 0)]).sort((x, y) => x[0] - y[0]);
  const total = weighted.reduce((x, w) => x + w[1], 0); let acc = 0, median = null; for (const [v, w] of weighted) { acc += w; if (acc >= total / 2) { median = v; break; } }
  return { flights: n, clearRate: n ? flights.filter(r => r.resultName === 'cleared').length / n : null,
    deaths: { fuel: cause('fuel'), terrain: cause('terrain'), ceiling: cause('ceiling'), obstacle: cause('obstacle'), other: cause('other') + cause('none') },
    heartsLost: n ? sum(flights, 'heartsLost') / n : null, liftsPerSec: secs ? lifts / secs : null,
    medianGap: median,
    onCue: lifts ? sum(flights, 'liftsCue') / lifts : null, quick: lifts ? sum(flights, 'liftsQuick') / lifts : null,
    glideShare: secs ? sum(flights, 'glide') / secs : null,
    capture: sum(flights, 'sparksSeen') ? (sum(flights, 'wisp') + sum(flights, 'collector')) / sum(flights, 'sparksSeen') : null,
    refusedPerFlight: n ? sum(flights, 'liftsRefused') / n : null, secLowPerFlight: n ? sum(flights, 'secLow') / n : null,
    deliveries: n ? sum(flights, 'deliveries') / n : null, skims: n ? sum(flights, 'skims') / n : null, overfills: n ? sum(flights, 'overfills') / n : null };
}

async function pilotSummaries(styles, runs) {
  const { createSim } = await import(pathToFileURL(path.join(root, 'scripts/balance/starter-sim.mjs')));
  const out = {};
  for (const style of styles) {
    const sim = await createSim({ style }), rs = [];
    for (let i = 0; i < runs; i++) rs.push(sim.flyRun(['lift-guide'], `sb${i}`, { q: 0 }));
    const n = sum(rs, 'attempts'), lifts = sum(rs, 'lifts'), time = sum(rs, 'timeFlown'), d = k => rs.reduce((x, r) => x + r.deaths[k], 0);
    out[style] = { flights: n, clearRate: n ? (n - sum(rs, 'hearts')) / n : null, deaths: { fuel: d('fuel'), terrain: d('terrain'), ceiling: d('boundary'), obstacle: d('obstacle'), other: d('other') },
      heartsLost: n ? sum(rs, 'hearts') / n : null, liftsPerSec: time ? lifts / time : null, medianGap: (() => { const g = rs.flatMap(r => r.gaps).sort((x, y) => x - y); return g.length ? g[g.length >> 1] : null; })(), onCue: lifts ? sum(rs, 'cueLifts') / lifts : null,
      quick: lifts ? sum(rs, 'spam50') / lifts : null, glideShare: time ? rs.flatMap(r => r.gaps).filter(g => g > 2).reduce((x, g) => x + g, 0) / time : null, capture: sum(rs, 'fuelSeen') ? sum(rs, 'fuelTaken') / sum(rs, 'fuelSeen') : null,
      refusedPerFlight: n ? sum(rs, 'denied') / n : null, secLowPerFlight: n ? sum(rs, 'under20') / n : null,
      deliveries: n ? sum(rs, 'deliveries') / n : null, skims: n ? sum(rs, 'skims') / n : null, overfills: null }; // the simulation counts Overfills only for Overfill cards
    console.error('pilot', style, 'done');
  }
  return out;
}

export function summaryTable(columns) {
  const rows = [
    ['flights', s => s.flights], ['clear rate', s => pct(s.clearRate, 1)], ['deaths fuel/terrain/ceiling/obstacle/other', s => Object.values(s.deaths).join('/')],
    ['hearts lost per flight', s => f(s.heartsLost, 2)], ['Lifts per second', s => f(s.liftsPerSec, 2)], ['median Lift gap (s)', s => f(s.medianGap, 2)],
    ['Lifts on the cue', s => pct(s.onCue, 1)], ['Lifts within 0.5 s of the last', s => pct(s.quick, 1)], ['glide share (no Lift > 2 s)', s => pct(s.glideShare, 1)],
    ['capture rate (taken / on screen)', s => pct(s.capture, 1)], ['refused Lifts per flight', s => f(s.refusedPerFlight, 2)], ['seconds under 20% Meter per flight', s => f(s.secLowPerFlight, 1)],
    ['Deliveries per flight', s => f(s.deliveries, 1)], ['Skims per flight', s => f(s.skims, 1)], ['Overfills per flight', s => f(s.overfills, 1)]];
  const names = columns.map(c => c[0]), w = Math.max(...rows.map(r => r[0].length)), cw = names.map(x => Math.max(x.length, 9));
  const line = cells => cells.map((c, i) => i ? String(c).padStart(cw[i - 1]) : String(c).padEnd(w)).join('  ');
  return [line(['', ...names]), ...rows.map(([label, get]) => line([label, ...columns.map(([, s]) => s ? get(s) : '-')]))].join('\n');
}

export function flightTable(flights) {
  const head = ['#', 'result', 'cause', 'stop', 'map.row', 'course', 'time s', 'Lifts', 'cue', 'quick', 'refused', 'gap med', 'minMeter%', '<20% s', 'seen', 'wisp', 'coll', 'deliv', 'skim', 'over', 'pulse', 'flare', 'cardSp', 'stored', 'dist%', 'cards'];
  const rows = flights.map((r, i) => [i + 1, r.resultName, r.causeName === 'none' ? '' : r.causeName, r.stopName, `${r.map}.${r.row}`, r.course, f(r.dur / 10), r.lifts, r.liftsCue, r.liftsQuick, r.liftsRefused,
    f(r.gapMed / 10, 1), r.minMeter, r.secLow, r.sparksSeen, r.wisp, r.collector, r.deliveries, r.skims, r.overfills, r.pulses, r.flares, r.cardSparks, r.stored, r.dist,
    r.cards.filter(Boolean).join('+') + (r.inscriptions.some(Boolean) ? ' [' + r.inscriptions.filter(Boolean).join('+') + ']' : '')]);
  const cw = head.map((h, c) => Math.max(h.length, ...rows.map(r => String(r[c]).length)));
  const line = cells => cells.map((c, i) => i === cells.length - 1 ? String(c) : String(c).padEnd(cw[i])).join(' ');
  return [line(head), ...rows.map(line)].join('\n');
}

export async function loadCodes() {
  const ids = async (file, pick) => { try { return pick(await import(pathToFileURL(path.join(root, 'dist', file)))); } catch { return []; } };
  const cards = await ids('card-catalog.mjs', m => m.CARD_CATALOG_IDS), ins = await ids('inscriptions.mjs', m => Object.keys(m.INSCRIPTIONS || {}));
  const levels = [...await ids('level-catalog.mjs', m => (m.LEVELS || []).map(l => l.id)), ...await ids('biomes.mjs', m => (m.BIOME_LEVELS || []).map(l => l.id))];
  return { cardCodes: codeTable(cards), inscriptionCodes: codeTable(ins), courseCodes: codeTable(levels, 3) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
  const file = process.argv.slice(2).find(a => !a.startsWith('--'));
  const text = file && file !== '-' ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
  const flights = parseLog(text, await loadCodes());
  if (!flights.length) { console.error('No flights found in the log.'); process.exit(1); }
  console.log(`${flights.length} flights, versions: ${[...new Set(flights.map(r => r.version))].join(', ')}\n\n${flightTable(flights)}\n`);
  const columns = [['real', summarize(flights)]];
  const mode = String(args.sim || 'saved'), styles = String(args.pilots || DEFAULT_PILOTS.join(',')).split(',');
  let pilots = null;
  if (mode !== 'off') {
    if (mode === 'saved' && fs.existsSync(PILOT_FILE)) pilots = JSON.parse(fs.readFileSync(PILOT_FILE, 'utf8')).pilots;
    else { pilots = await pilotSummaries(styles, Number(args.runs || 4)); fs.mkdirSync(path.dirname(PILOT_FILE), { recursive: true }); fs.writeFileSync(PILOT_FILE, JSON.stringify({ made: new Date().toISOString(), runs: Number(args.runs || 4), pilots }, null, 1)); }
    for (const s of styles) if (pilots[s]) columns.push([s.replace('player-', 'p-'), pilots[s]]);
  }
  console.log(summaryTable(columns));
  console.log('\nSimulated pilots fly the first six Map 1 stops with Lift Guide; "real" is every recorded flight. Capture: real = Sparks taken / Sparks on screen (count), pilots = Spark amount taken / seen. "-" = the simulation does not measure it.');
}
