// Starter card balance with simulated pilots over the INITIAL flights of a run (rewritten 2026-11-18 for the realistic player-* pilots).
// Flies the first 6 stops of Map 1 as a sequence with the true starting state (3 hearts, starting Meter, Lift Guide + the card under test, no other
// cards or Inscriptions; a fall costs a heart and the stop is retried; the run ends at 0 hearts). Same run seed => same map and flight seeds in
// every condition (paired). Sequence code: scripts/balance/starter-sim.mjs. Pilot logic: scripts/human-flight-planner.mjs, scripts/player-pilot.mjs.
// Pilots: NEW player-beginner / player-average / player-good (follow the Lift Guide arrow through their own timing, card-aware behaviours below);
//         OLD human350 / human250 / human150 for comparison (card-blind; the arrow is emulated by converting off-cue Lifts, as in the first version).
// Conditions: none, LG (today's Lift Guide: +1 Spark on every on-cue Lift), LGc (Lift Guide with a modelled 50% coin toss on its payout),
//   LG+card (card-blind and card-aware pilot; today's cards), LGc+card (aware), and modelled boosts (LGc world; payouts injected by the script).
// Run: node scripts/balance/starter-balance.mjs [--runs=30] [--pilots=...] [--out=outputs/balance/starter-balance.md] [--reuse]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createSim } from './starter-sim.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const RUNS = Number(args.runs || 30), FLIGHTS = 6, HEART_VALUE = 15;
export const PILOTS = {
  'old-beginner': { style: 'human350', target: .40, old: true, w: .1, skim: .5 }, 'old-average': { style: 'human250', target: .65, old: true, w: .3, skim: 1 }, 'old-good': { style: 'human150', target: .85, old: true, w: .6, skim: 1.5 },
  'player-beginner': { style: 'player-beginner', w: .1, skim: .5 }, 'player-average': { style: 'player-average', w: .3, skim: 1 }, 'player-good': { style: 'player-good', w: .6, skim: 1.5 }
};
const STARTERS = ['skim-line', 'pulse-reader', 'courier-cord', 'meter-mark', 'finish-flag'];
const NAME = { 'lift-guide': 'Lift Guide', 'skim-line': 'Skim Line', 'pulse-reader': 'Pulse Reader', 'courier-cord': 'Courier Cord', 'meter-mark': 'Meter Mark', 'finish-flag': 'Finish Flag' };
// Card-aware behaviour = extra planner options (see playerLiftOptions / selectHumanFuel). Pilot skill scales how hard the skim band is hugged.
const aware = (card, pilot) => ({
  'courier-cord': { fetchScale: 2.2, fetchBonus: .25 },       // aim for Sparks inside the Collector's reach and let it fetch them (a Delivery needs a fetched Spark)
  'skim-line': { skim: pilot.skim, skimReach: 40 },           // reward flying within 40 units of terrain (the skim clearance is 48) when the margin is safe
  'meter-mark': { fullThreshold: 1.01 },                      // keep collecting at a full Meter: each natural Overfill pays
  'pulse-reader': { densityBonus: .14 }                       // prefer Spark clusters, so its Pulse crosses uncollected Sparks
})[card] || {};
// Modelled boosts for the proposals (payout hooks only, no game change). Each is evaluated with the card-aware pilot in the coin-toss world.
export const VARIANTS = {
  'courier-cord +3 Sparks/Delivery': { card: 'courier-cord', opts: { payout: { 'collector-delivery': { sparks: 3 } } } },
  'courier-cord +6 Sparks/Delivery': { card: 'courier-cord', opts: { payout: { 'collector-delivery': { sparks: 6 } } } },
  'skim-line +3 Sparks/Skim': { card: 'skim-line', opts: { skimPayout: { sparks: 3 } } },
  'skim-line +6 Sparks/Skim': { card: 'skim-line', opts: { skimPayout: { sparks: 6 } } },
  'finish-flag +4 Stored, refill 10 Sparks': { card: 'finish-flag', opts: { finishPayout: { stored: 4, sparks: 10 } } },
  'finish-flag +4 Stored, refill 20 Sparks': { card: 'finish-flag', opts: { finishPayout: { stored: 4, sparks: 20 } } }
};
// Proposal candidates that combine fuel and Stored payouts (second pass, written to <pilot>.proposals.json; `--only=proposals`).
export const PROPOSALS = {
  'courier-cord: +6 Sparks and +5 Stored per Delivery': { card: 'courier-cord', opts: { payout: { 'collector-delivery': { sparks: 6, stored: 5 } } } },
  'skim-line: +6 Sparks and +4 Stored per Skim (aware)': { card: 'skim-line', opts: { skimPayout: { sparks: 6, stored: 4 } } },
  'skim-line: +6 Sparks and +4 Stored per Skim (blind)': { card: 'skim-line', blind: true, opts: { skimPayout: { sparks: 6, stored: 4 } } },
  'finish-flag: +6 Stored and Meter refilled to full': { card: 'finish-flag', opts: { finishPayout: { stored: 6, sparks: 30 } } }
};
const rawDir = fileURLToPath(new URL('../../outputs/balance/starter-raw/', import.meta.url)), rawFile = p => path.join(rawDir, `${p}.json`);
const here = fileURLToPath(import.meta.url);
if (args.child) await child(args.child); else if (!process.argv[1] || path.resolve(process.argv[1]) === here) await parent();

async function child(name) {
  fs.mkdirSync(rawDir, { recursive: true });
  if (args.only === 'proposals') return proposals(name);
  const P = PILOTS[name], sim = await createSim({ style: P.style });
  const seeds = Array.from({ length: RUNS }, (_, i) => `sb${i}`), results = {}, meta = { pilot: name, style: P.style, runs: RUNS };
  const rest = P.old ? 60 : 88;
  const go = (key, ids, o = {}, awareCard = null) => { results[key] = seeds.map(s => sim.flyRun(ids, s, { restBelow: rest, ...o, pilotExtra: awareCard ? () => aware(awareCard, P) : undefined })); console.error(name, key, 'done'); };
  go('none', []); // an old pilot's Lift Guide share is converted to the target; new pilots follow the arrow with their own timing (q stays 0)
  go('LG-noarrow', ['lift-guide'], { q: 0 });
  const na = results['LG-noarrow'], s0 = 2 * na.reduce((a, r) => a + r.guideLifts, 0) / Math.max(1, na.reduce((a, r) => a + r.lifts, 0));
  meta.q = P.old ? (s0 >= P.target ? 0 : (P.target - s0) / (1 - s0)) : 0; meta.naturalShare = s0;
  go('LG', ['lift-guide'], { q: meta.q });
  go('LGc', ['lift-guide'], { q: meta.q, guideP: .5 });
  for (const c of STARTERS) go(`LG+${c}`, ['lift-guide', c], { q: meta.q });
  if (!P.old) {
    for (const c of STARTERS) go(`LG+${c}:aware`, ['lift-guide', c], { q: 0 }, c);
    for (const c of STARTERS) go(`LGc+${c}:aware`, ['lift-guide', c], { q: 0, guideP: .5 }, c);
    for (const [k, v] of Object.entries(VARIANTS)) go(`LGc+${k}:aware`, ['lift-guide', v.card], { q: 0, guideP: .5, ...v.opts }, v.card);
  } else for (const c of STARTERS) go(`LGc+${c}`, ['lift-guide', c], { q: meta.q, guideP: .5 });
  fs.writeFileSync(rawFile(name), JSON.stringify({ ...meta, results }));
}

async function proposals(name) {
  const P = PILOTS[name], sim = await createSim({ style: P.style }), seeds = Array.from({ length: RUNS }, (_, i) => `sb${i}`), results = {};
  for (const [k, v] of Object.entries(PROPOSALS)) { results[`LGc+${k}:aware`] = seeds.map(s => sim.flyRun(['lift-guide', v.card], s, { restBelow: 88, q: 0, guideP: .5, ...v.opts, pilotExtra: v.blind ? undefined : () => aware(v.card, P) })); console.error(name, k, 'done'); }
  fs.writeFileSync(rawFile(name + '.proposals'), JSON.stringify(results));
}

async function parent() {
  fs.mkdirSync(rawDir, { recursive: true });
  const names = String(args.pilots || Object.keys(PILOTS).join(',')).split(',');
  if (!args.reuse) await Promise.all(names.map(p => new Promise((res, rej) => { const c = spawn(process.execPath, [here, `--child=${p}`, `--runs=${RUNS}`, ...(args.only ? [`--only=${args.only}`] : [])], { stdio: ['ignore', 'inherit', 'inherit'] }); c.on('exit', code => code ? rej(new Error(p + ' exit ' + code)) : res()); })));
  const D = Object.fromEntries(names.map(p => [p, JSON.parse(fs.readFileSync(rawFile(p), 'utf8'))]));
  for (const p of names) if (fs.existsSync(rawFile(p + '.proposals'))) Object.assign(D[p].results, JSON.parse(fs.readFileSync(rawFile(p + '.proposals'), 'utf8')));
  const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length), sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const f = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString();
  const worthOf = (R, a, b) => { const d = R[a].map((r, i) => (r.stored - R[b][i].stored) + HEART_VALUE * (R[b][i].hearts - r.hearts)); return { m: mean(d), se: sd(d) / Math.sqrt(d.length) }; };
  const noisy = ({ m, se }) => se === 0 ? m === 0 : Math.abs(m) < 2 * se;
  const ws = ({ m, se }) => `${f(m, 1)} ± ${f(se, 1)}${noisy({ m, se }) ? ' (noise)' : ''}`;
  const rate = (R, k, key, den) => 100 * R[k].reduce((a, r) => a + r[key], 0) / Math.max(1, R[k].reduce((a, r) => a + r[den], 0));
  let md = `# Starter card balance (realistic pilots; generated ${new Date().toISOString().slice(0, 10)})\n\n`;
  md += `Setup: first ${FLIGHTS} stops of Map 1 flown as a sequence, true starting state (3 hearts, starting Meter, Lift Guide + the card under test, nothing else), Rests taken when offered and the Meter is under 88% (old pilots: under 60%) or a heart is lost, a fall costs a heart and the stop is retried (the pilot remembers where Sparks were), the run ends at 0 hearts. ${RUNS} seeded runs per (condition x pilot); every card run is paired with the same run seed for its baseline. Differences are paired means ± standard error; under 2 SE is marked (noise). Worth = extra Stored Sparks + ${HEART_VALUE} x hearts saved (1 heart = the Workshop's base price to restore a resource).\n\n`;
  md += `Pilots. NEW (scripts/player-pilot.mjs, scripts/human-flight-planner.mjs planPlayerLift): same human limits as the old ones (reaction 350/250/150 ms, observation-limited view, drops) but they Lift only when it pays: each Lift is scheduled near the efficient moment (fall speed back at the Lift's launch speed, which is where Lift Guide's arrow is open) with Gaussian timing error (sigma 110/70/40 ms with the arrow, x1.6-2 without), glide inside a tolerant altitude band, ride lower and spend less when the Meter is low, never climb to the top fifth of the screen, chase Sparks more greedily when low, play safer on the last heart, remember Spark positions and shrink errors on a retried stop, take a Rest whenever the Meter is under 88%. Slips (late press) 12/6/2% and insurance taps 10/4/1% on routine Lifts. Card-aware: Courier Cord = steer for Sparks inside the Collector's reach (the Collector's fetch makes a Delivery); Skim Line = reward holding within 40 units of terrain when the margin is safe (not on the last heart; strength 0.5/1/1.5 by skill); Meter Mark = keep collecting at a full Meter (each natural Overfill pays); Pulse Reader = prefer Spark clusters so its Pulse crosses uncollected Sparks; Finish Flag = nothing. OLD = human350/250/150, card-blind; the arrow is emulated by converting off-cue Lifts to paid on-cue Lifts until the share reaches 40/65/85%.\n\n`;
  const order = names;
  md += `## 1. Survival (Lift Guide alone, first ${FLIGHTS} stops)\n\n| pilot | cleared of 6 | died before stop 6 | hearts lost | refused Lifts / run | Lifts / flight | spam share (<0.75 s) | on-cue share | Sparks taken (share of seen) | s under 20% Meter |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const p of order) {
    const R = D[p].results, k = 'LG', a = R[k], lifts = a.reduce((x, r) => x + r.lifts, 0), att = a.reduce((x, r) => x + r.attempts, 0), cue = D[p].q > 0 || PILOTS[p].old ? 2 * a.reduce((x, r) => x + r.guideLifts, 0) / Math.max(1, lifts) * 100 : 100 * a.reduce((x, r) => x + r.cueLifts, 0) / Math.max(1, lifts);
    md += `| ${p} | ${f(mean(a.map(r => r.cleared)))} | ${a.filter(r => r.died).length}/${a.length} | ${f(mean(a.map(r => r.hearts)), 2)} | ${f(mean(a.map(r => r.denied)))} | ${f(lifts / att)} | ${f(100 * a.reduce((x, r) => x + r.spam75, 0) / Math.max(1, lifts), 0)}% | ${f(cue, 0)}% | ${f(rate(R, k, 'fuelTaken', 'fuelSeen'), 0)}% | ${f(mean(a.map(r => r.under20)), 1)} |\n`;
  }
  md += `\nDeaths by cause (flights failed, Lift Guide alone): ` + order.map(p => { const a = D[p].results.LG, d = k => a.reduce((x, r) => x + r.deaths[k], 0); return `${p} fuel ${d('fuel')} / terrain ${d('terrain')} / ceiling-floor ${d('boundary')} / obstacle ${d('obstacle')}`; }).join('; ') + '.\n\n';
  md += `### Survival by condition (cleared of 6 / died-runs / hearts lost / refused Lifts)\n\n| condition | ${order.join(' | ')} |\n|---|${order.map(() => '---').join('|')}|\n`;
  const keys = [...new Set(order.flatMap(p => Object.keys(D[p].results)))].filter(k => k !== 'LG-noarrow');
  for (const k of keys) md += `| ${k} | ${order.map(p => { const a = D[p].results[k]; return a ? `${f(mean(a.map(r => r.cleared)))} / ${a.filter(r => r.died).length}/${a.length} / ${f(mean(a.map(r => r.hearts)), 1)} / ${f(mean(a.map(r => r.denied)), 1)}` : '-'; }).join(' | ')} |\n`;
  // worth tables
  const sum = {};
  const weightedFor = (set, key, base) => set.reduce((a, p) => a + PILOTS[p].w * worthOf(D[p].results, key, base).m, 0);
  const sets = { new: order.filter(p => p.startsWith('player')), old: order.filter(p => p.startsWith('old')) };
  const printWorth = (setName, title, rows, base, note) => {
    const set = sets[setName]; if (!set.length) return;
    const T = weightedFor(set, rows[0][1], rows[0][2] || base);
    md += `\n## ${title}\n\n${note}\n\n| card | ${set.join(' | ')} | weighted | x T |\n|---|${set.map(() => '---').join('|')}|---|---|\n`;
    for (const [label, key, bk] of rows) {
      if (!set.every(p => D[p].results[key])) continue;
      const cells = set.map(p => worthOf(D[p].results, key, bk || base)), w = set.reduce((a, p, i) => a + PILOTS[p].w * cells[i].m, 0), se = Math.sqrt(set.reduce((a, p, i) => a + (PILOTS[p].w * cells[i].se) ** 2, 0));
      sum[`${setName}:${label}`] = { w, se };
      md += `| ${label} | ${cells.map(ws).join(' | ')} | ${f(w, 1)} ± ${f(se, 1)} | ${f(w / T, 2)} |\n`;
    }
    md += `\nT = weighted worth of the first row = ${f(T, 1)}; target band 0.8x-1.25x = ${f(T * .8, 1)}-${f(T * 1.25, 1)}.\n`;
  };
  const rowsReleased = [['Lift Guide (today: pays on every on-cue Lift) vs no card', 'LG', 'none'], ...STARTERS.map(c => [`${NAME[c]} (today), card-blind pilot`, `LG+${c}`, 'LG']), ...STARTERS.map(c => [`${NAME[c]} (today), card-aware pilot`, `LG+${c}:aware`, 'LG'])];
  printWorth('new', '2. Worth, realistic pilots, today\'s released cards (baseline: Lift Guide alone)', rowsReleased, 'LG', 'Lift Guide today pays +1 Spark on every on-cue Lift.');
  const rowsCoin = [['Lift Guide with 50% coin toss (modelled: payout halved) vs no card', 'LGc', 'none'], ...STARTERS.map(c => [`${NAME[c]} (today), aware, next to coin-toss Lift Guide`, `LGc+${c}:aware`, 'LGc']), ...Object.entries(VARIANTS).map(([k]) => [`MODEL ${k}`, `LGc+${k}:aware`, 'LGc']), ...Object.keys(PROPOSALS).map(k => [`PROPOSAL ${k}`, `LGc+${k}:aware`, 'LGc'])];
  printWorth('new', '3. Worth in the coin-toss world (baseline: coin-toss Lift Guide alone) and modelled boosts', rowsCoin, 'LGc', 'T is the coin-toss Lift Guide\'s weighted worth. Modelled rows inject the payout inside this script (the game does not have them).');
  const rowsOld = [['Lift Guide (today) vs no card', 'LG', 'none'], ...STARTERS.map(c => [`${NAME[c]} (today), card-blind`, `LG+${c}`, 'LG'])];
  printWorth('old', '4. Worth, old pilots (human350/250/150, card-blind), for comparison', rowsOld, 'LG', 'The previous measurement method with the same flights and the same table layout.');
  const rowsOldCoin = [['Lift Guide with 50% coin toss vs no card', 'LGc', 'none'], ...STARTERS.map(c => [`${NAME[c]} (today), card-blind, next to coin-toss Lift Guide`, `LGc+${c}`, 'LGc'])];
  printWorth('old', '5. Worth, old pilots, coin-toss world', rowsOldCoin, 'LGc', 'Same, with the Lift Guide payout halved.');
  md += `\n## 6. Card activity per flight (new pilots; card-blind vs card-aware)\n\n| pilot | Deliveries/flight blind -> aware (Courier Cord) | Skims/flight blind -> aware (Skim Line) | Overfills/flight blind -> aware (Meter Mark) | Pulses/flight (Pulse Reader) |\n|---|---|---|---|---|\n`;
  for (const p of sets.new) {
    const R = D[p].results, per = (k, key) => mean(R[k].map(r => r[key] / Math.max(1, r.attempts)));
    md += `| ${p} | ${f(per('LG+courier-cord', 'deliveries'), 2)} -> ${f(per('LG+courier-cord:aware', 'deliveries'), 2)} | ${f(per('LG+skim-line', 'skims'), 2)} -> ${f(per('LG+skim-line:aware', 'skims'), 2)} | ${f(per('LG+meter-mark', 'overfills'), 2)} -> ${f(per('LG+meter-mark:aware', 'overfills'), 2)} | ${f(per('LG+pulse-reader:aware', 'pulses'), 2)} |\n`;
  }
  fs.writeFileSync(args.out || 'outputs/balance/starter-balance.md', md);
  console.log(md);
}
