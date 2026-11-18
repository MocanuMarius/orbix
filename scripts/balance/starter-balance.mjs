// Starter card balance (2026-11-18). Flies the SAME seeds with each starter card alone / beside Lift Guide (+LG) / with Echo on its left, and with no starter
// card, through the real path (createRun, select node, begin attempt, real flight with the human150 pilot, M.finishFlight) and compares run.condensedEarned.
// Only flights where both the card flight and its baseline cleared are paired. Baselines: none = empty Chain, LG = Lift Guide alone.
// Run: node scripts/balance/starter-balance.mjs [--n1=12] [--n2=6] ; writes outputs/balance/starter-balance.md
import fs from 'node:fs';
import { fly, makeRun, M, BIOME_LEVELS } from './real-flight-check.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const N1 = Number(args.n1 || 12), N2 = Number(args.n2 || 6);
const STARTERS = ['lift-guide', 'skim-line', 'pulse-reader', 'courier-cord', 'meter-mark', 'finish-flag'];
const NAME = { 'lift-guide': 'Lift Guide', 'skim-line': 'Skim Line', 'pulse-reader': 'Pulse Reader', 'courier-cord': 'Courier Cord', 'meter-mark': 'Meter Mark', 'finish-flag': 'Finish Flag' };
const EVENT = { 'lift-guide': 'guide-lift', 'pulse-reader': 'wave-crossing', 'courier-cord': 'collector-delivery', 'meter-mark': 'natural-overfill', 'finish-flag': 'flight-clear' };
// condition name -> [Chain, baseline name]
const CONDS = { none: [[]], LG: [['lift-guide']] };
for (const c of STARTERS) {
  if (c === 'lift-guide') { CONDS['lift-guide|echo'] = [['echo', c], 'none']; continue; }
  CONDS[`${c}|alone`] = [[c], 'none']; CONDS[`${c}|+LG`] = [['lift-guide', c], 'LG']; CONDS[`${c}|echo`] = [['echo', c], 'none']; CONDS[`${c}|echo+LG`] = [['lift-guide', 'echo', c], 'LG'];
}
const CAND = (n, off, stage, base) => Array.from({ length: n }, (_, i) => ({ stage, levelId: BIOME_LEVELS[(off + i * 5) % BIOME_LEVELS.length].id, seedIndex: base + i }));
function flyOne(ids, s) {
  const run = makeRun(ids, { seed: 'sb' });
  const node = M.getChoices(run).find(n => n.type !== 'support');
  M.selectNode(run, node.id); M.beginFlightAttempt(run); M.markFlightAttemptStarted(run);
  const before = run.condensedEarned || 0;
  let record, log; try { ({ record, log } = fly({ ids, run, levelId: s.levelId, seedIndex: s.seedIndex, stage: s.stage })); } catch (err) { return { cleared: false, err: String(err) }; }
  const res = record.result; if (!record.success || !res) return { cleared: false };
  M.finishFlight(run, res);
  const e = log.engine, idx = ids.length - 1, slot = log.slots[idx] || { fired: 0, events: 0, sparks: 0, stored: 0 };
  return { cleared: true, earned: (run.condensedEarned || 0) - before, events: log.events, slot, lifts: log.occurred.lifts, falling: log.occurred.fallingLifts,
    deliveries: Object.values(log.occurred.delivery).reduce((a, b) => a + b, 0), clearStored: run.lastFlight?.cardClearReceipt?.stored || 0,
    skims: e.edgingPulse?.triggerCount || 0, engSparks: e.cardEngine?.sparks || 0, flame: res.flame, collected: res.collected, t: record.time };
}
// Screen: keep slots where both baselines clear, so every comparison has the same footing.
const slots = [];
for (const [list, want, map] of [[CAND(40, 0, 2, 0), N1, 1], [CAND(30, 2, 4, 100), N2, 2]]) {
  let got = 0; for (const s of list) { if (got >= want) break; const a = flyOne([], s), b = flyOne(['lift-guide'], s); if (a.cleared && b.cleared) { slots.push({ ...s, map }); got++; } }
}
const R = {}; for (const [name, [ids]] of Object.entries(CONDS)) R[name] = slots.map(s => flyOne(ids, s));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, f1 = x => (Math.round(x * 100) / 100).toString();
function agg(name, filter = () => true) {
  const [ids, baseName] = CONDS[name], card = ids[ids.length - 1], rows = [];
  slots.forEach((s, i) => { if (!filter(s)) return; const r = R[name][i], b = R[baseName || 'none'][i]; if (!r.cleared || !b.cleared) return; rows.push({ r, b }); });
  const ev = EVENT[card];
  const trig = rows.map(({ r }) => card === 'skim-line' ? r.skims : card === 'finish-flag' ? 1 : card === 'courier-cord' ? r.deliveries : (r.events[ev] || 0));
  const fired = rows.map(({ r }) => card === 'skim-line' ? r.skims : card === 'finish-flag' ? (r.clearStored ? 1 : 0) : r.slot.fired);
  const sparks = rows.map(({ r }) => card === 'skim-line' ? r.engSparks : r.slot.sparks);
  const direct = rows.map(({ r }) => card === 'finish-flag' ? r.clearStored : r.slot.stored);
  const total = rows.map(({ r, b }) => r.earned - b.earned);
  return { name, card, n: rows.length, trig: mean(trig), fired: mean(fired), sparks: mean(sparks), direct: mean(direct), end: mean(total) - mean(direct), equiv: mean(total),
    lifts: mean(rows.map(({ r, b }) => r.lifts - b.lifts)), share: mean(rows.map(({ r }) => (r.events['guide-lift'] || 0) / Math.max(1, r.lifts))) };
}
const table = (names, filter) => ['| Chain | pairs | trigger/flight | fired | Sparks to Meter | direct Stored | end-of-flight diff | Stored equiv. | extra Lifts |', '|---|---|---|---|---|---|---|---|---|',
  ...names.map(n => { const a = agg(n, filter); return `| ${NAME[a.card]} ${n.split('|')[1] || ''} | ${a.n} | ${f1(a.trig)} | ${f1(a.fired)} | ${f1(a.sparks)} | ${f1(a.direct)} | ${f1(a.end)} | ${f1(a.equiv)} | ${f1(a.lifts)} |`; })].join('\n');
const names = Object.keys(CONDS).filter(n => n !== 'none' && n !== 'LG');
const lgRows = []; slots.forEach((s, i) => { const r = R.LG[i], b = R.none[i]; if (r.cleared && b.cleared) lgRows.push({ r, b }); });
const lgAlone = { n: lgRows.length, trig: mean(lgRows.map(({ r }) => r.events['guide-lift'] || 0)), fired: mean(lgRows.map(({ r }) => r.slot.fired)), sparks: mean(lgRows.map(({ r }) => r.slot.sparks)), equiv: mean(lgRows.map(({ r, b }) => r.earned - b.earned)),
  lifts: mean(lgRows.map(({ r }) => r.lifts)), share: mean(lgRows.map(({ r }) => (r.events['guide-lift'] || 0) / Math.max(1, r.lifts))), fall: mean(lgRows.map(({ r }) => r.falling / Math.max(1, r.lifts))), extraLifts: mean(lgRows.map(({ r, b }) => r.lifts - b.lifts)), baseEarned: mean(lgRows.map(({ b }) => b.earned)) };
fs.writeFileSync(new URL('./starter-balance.raw.json', import.meta.url), JSON.stringify({ slots, R }));
fs.mkdirSync('outputs/balance', { recursive: true });
fs.writeFileSync('outputs/balance/starter-balance.md', `# Starter card balance (generated ${new Date().toISOString().slice(0, 10)})\n\nFlights: ${slots.length} paired slots (${slots.filter(s => s.map === 1).length} Map 1 = stage 2, ${slots.filter(s => s.map === 2).length} Map 2 = stage 4), human150 pilot, same seeds in every condition. Pairs where the card flight or its baseline died are dropped.\n\n## Lift Guide alone vs empty Chain\n\n${JSON.stringify(lgAlone)}\n\n## All Chains (alone / echo vs empty Chain; +LG / echo+LG vs Lift Guide alone)\n\n${table(names)}\n\n### Map 1 only\n\n${table(names, s => s.map === 1)}\n\n### Map 2 only\n\n${table(names, s => s.map === 2)}\n`);
console.log(fs.readFileSync('outputs/balance/starter-balance.md', 'utf8'));
