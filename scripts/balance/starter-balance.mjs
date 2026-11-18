// Starter card balance with human pilots over the INITIAL flights of a run (rewritten 2026-11-18).
// Flies the first 6 flights of Map 1 as a sequence (hearts, Meter and Stored Sparks carry over, a fall costs a heart and the stop is retried, Rests are
// taken when the route offers one) with the true starting state: 3 hearts, starting Meter, Lift Guide + the card under test, no other cards,
// no Inscriptions. Same run seed => same map and flight seeds in every condition (paired). Pilots are the repository's observation-limited
// human profiles (scripts/human-flight-planner.mjs): beginner = human350, average = human250, good = human150.
// Lift Guide cue: the pilot's planner cannot see the arrow, so a Lift it taps off-cue is converted into a paid on-cue Lift with probability q, chosen per
// pilot so that the overall on-cue share reaches the target WITH the arrow (beginner 40%, average 65%, good 85%); the natural share (no arrow) is measured.
// Run: node scripts/balance/starter-balance.mjs [--runs=30] [--pilots=beginner,average,good] [--cards=a,b] [--out=outputs/balance/starter-balance.md]
//   (spawns one child process per pilot; children are started with --child=<pilot> and write scripts/balance/starter-balance.<pilot>.json)
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const RUNS = Number(args.runs || 30), FLIGHTS = 6, HEART_VALUE = 15;
const PILOTS = { beginner: { style: 'human350', target: .40 }, average: { style: 'human250', target: .65 }, good: { style: 'human150', target: .85 } };
const STARTERS = ['skim-line', 'pulse-reader', 'courier-cord', 'meter-mark', 'finish-flag'];
const NAME = { 'lift-guide': 'Lift Guide', 'skim-line': 'Skim Line', 'pulse-reader': 'Pulse Reader', 'courier-cord': 'Courier Cord', 'meter-mark': 'Meter Mark', 'finish-flag': 'Finish Flag' };
const CARDS = String(args.cards || STARTERS.join(',')).split(',');
const here = fileURLToPath(import.meta.url), rawFile = p => fileURLToPath(new URL(`./starter-balance.${p}.json`, import.meta.url));

if (args.child) await child(args.child);
else await parent();

function mulberry(seed) { let a = 0; for (const c of String(seed)) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

async function child(pilotName) {
  const { makeRun, M, instrument } = await import('./real-flight-check.mjs');
  process.argv.push('--importOnly');
  const { simulate, buildCase } = await import('../balance-current-flight.mjs');
  const { style, target } = PILOTS[pilotName];
  const sparksOf = (card, log) => card === 'skim-line' ? (log.engine.cardEngine?.sparks || 0) : (log.slots[card === 'lift-guide' ? 0 : 1]?.sparks || 0);
  function flyRun(ids, runSeed, q) {
    const run = makeRun(ids, { seed: runSeed }), card = ids[ids.length - 1];
    const m = { cleared: 0, attempts: 0, hearts: 0, died: false, denied: 0, under20: 0, minMeter: 1, collected: 0, cardSparks: 0, lgSparks: 0, lifts: 0, guideLifts: 0, stored: 0, cardStored: 0, meterEnd: 0 };
    let guard = 0; const tries = {};
    while (m.cleared < FLIGHTS && guard++ < 40) {
      if (run.phase !== 'map') break;
      const ch = M.getChoices(run); if (!ch.length) break;
      const camp = ch.find(n => n.kind === 'camp'), normal = ch.find(n => n.type === 'flight' && !n.elite), elite = ch.find(n => n.type === 'flight');
      const hurt = run.lives < run.maxLives || run.flame < 60;
      const pick = (camp && (hurt || (!normal && !elite))) ? camp : normal || elite || camp || ch[0];
      if (!M.selectNode(run, pick.id)) break;
      if (pick.type !== 'flight') { // Rest (Recover) or a skipped stop (treasure, event, Scribe): no card or Inscription is taken
        if (pick.kind === 'camp') M.resolveSupport(run, 0);
        for (const k of ['pendingChest', 'pendingTemporary', 'cardDraft', 'cardReward']) delete run[k];
        if (run.phase !== 'map' || run.step <= pick.row) { run.phase = 'map'; run.step = pick.row + 1; run.current = null; }
        continue;
      }
      M.beginFlightAttempt(run); M.markFlightAttemptStarted(run);
      const config = buildCase({ terrain: pick.terrain, difficulty: 1, stage: pick.row, role: 'collector', style, seedIndex: 0, profile: 'refuge', skills: {} });
      Object.assign(config, { seed: `${run.seed}-${pick.id}`, duration: pick.duration, node: pick }); config.run = run; config.controllerSeed = tries[pick.id] = (tries[pick.id] || 0) + 1;
      const log = {}, rnd = mulberry(config.seed + ':cue' + config.controllerSeed); let under = 0;
      config.prepareEngine = e => {
        log.engine = e; instrument(e, log);
        const flap = e.flap.bind(e);
        e.flap = () => {
          const before = log.events['guide-lift'] || 0, ok = flap();
          if (ok && q > 0 && (log.events['guide-lift'] || 0) === before && rnd() < q && rnd() < .5) e.resolveCardRowEvent('guide-lift', { meterFraction: e.flame / e.maxFlame, guardRecovering: e.wisp?.phase === 'guard-recovery' });
          return ok;
        };
        const step = e.step.bind(e); e.step = dt => { if (e.flame < .2 * e.maxFlame) under += dt; return step(dt); };
      };
      let rec; try { rec = simulate(config); } catch (err) { rec = { success: false, result: null, err: String(err) }; }
      m.attempts++; m.under20 += under; m.denied += rec.liftInputs?.deniedEnergy || 0;
      if (rec.minFuel != null && log.engine) m.minMeter = Math.min(m.minMeter, rec.minFuel / log.engine.maxFlame);
      if (log.engine) { m.lifts += log.occurred.lifts; m.guideLifts += log.events['guide-lift'] || 0; }
      const ok = M.finishFlight(run, rec.success && rec.result ? rec.result : { success: false });
      if (rec.success && rec.result && ok) {
        m.cleared++; m.collected += rec.pickupCounts ? Object.values(rec.pickupCounts).reduce((a, b) => a + b, 0) : 0;
        m.cardSparks += sparksOf(card, log); m.lgSparks += log.slots[0]?.sparks || 0; m.cardStored += log.slots[ids.length - 1]?.stored || 0;
        delete run.cardDraft; delete run.cardReward; m.stored = run.condensedEarned || 0;
      } else { m.hearts++; if (run.lives <= 0) { m.died = true; break; } }
    }
    m.meterEnd = run.flame; return m;
  }
  const out = { pilot: pilotName, style, target, runs: RUNS, results: {} };
  const seeds = Array.from({ length: RUNS }, (_, i) => `sb${i}`);
  const cond = (name, ids, q) => { out.results[name] = seeds.map(s => flyRun(ids, s, q)); console.error(pilotName, name, 'done'); };
  cond('none', [], 0);
  cond('LG-noarrow', ['lift-guide'], 0);
  const noArrow = out.results['LG-noarrow'], s0 = 2 * noArrow.reduce((a, r) => a + r.guideLifts, 0) / Math.max(1, noArrow.reduce((a, r) => a + r.lifts, 0)); // on-cue share BEFORE the Lift Guide coin toss (a paid Lift is a won coin)
  out.naturalShare = s0; out.q = s0 >= target ? 0 : (target - s0) / (1 - s0);
  cond('LG', ['lift-guide'], out.q);
  out.arrowShare = 2 * out.results.LG.reduce((a, r) => a + r.guideLifts, 0) / Math.max(1, out.results.LG.reduce((a, r) => a + r.lifts, 0));
  for (const c of CARDS) cond(`LG+${c}`, ['lift-guide', c], out.q);
  fs.writeFileSync(rawFile(pilotName), JSON.stringify(out));
}

async function parent() {
  const names = String(args.pilots || Object.keys(PILOTS).join(',')).split(',');
  if (!args.reuse) await Promise.all(names.map(p => new Promise((res, rej) => { const c = spawn(process.execPath, [here, `--child=${p}`, `--runs=${RUNS}`, `--cards=${CARDS.join(',')}`], { stdio: ['ignore', 'inherit', 'inherit'] }); c.on('exit', code => code ? rej(new Error(p + ' exit ' + code)) : res()); })));
  const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length), sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const f = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString();
  const diff = (R, a, b, fn) => { const d = R[a].map((r, i) => fn(r) - fn(R[b][i])); return { m: mean(d), se: sd(d) / Math.sqrt(d.length) }; };
  const pm = ({ m, se }) => { const real = se === 0 ? m !== 0 : Math.abs(m) >= 2 * se; return `${f(m, 2)} ± ${f(se, 2)}${real ? '' : ' (noise)'}`; };
  let md = `# Starter card balance (human pilots, initial flights; generated ${new Date().toISOString().slice(0, 10)})\n\n`;
  md += `Setup: first ${FLIGHTS} flights of Map 1 flown as a sequence, true starting state (3 hearts, starting Meter, Lift Guide + the card under test, nothing else), Rests taken when the route offers one, a fall costs a heart and the stop is retried, the run ends at 0 hearts. ${RUNS} seeded runs per (card x pilot); every card run is paired with the same run seed for the baseline. Pilots: beginner = human350 (350 ms reaction, jitter .10, drops .40), average = human250, good = human150 (profiles in scripts/human-flight-planner.mjs; assumptions, not fits to real players). Lift Guide cue following with the arrow: beginner 40%, average 65%, good 85% of Lifts on cue (an off-cue Lift is converted to an on-cue paid Lift with probability q so the share reaches the target; the Lift's timing is the pilot's own, so following the arrow costs no survival). Differences are paired means ± standard error; a difference under 2 SE is marked (noise) and is not real.\n\n`;
  md += `Exchange rate for the combined worth: 1 heart = ${HEART_VALUE} Stored Sparks (the Workshop's base price to restore a resource at a Rest). Worth = extra Stored Sparks + ${HEART_VALUE} x hearts saved. Both raw columns are shown; extra flights cleared and died-runs are shown but not priced.\n\n`;
  const summary = {};
  for (const p of names) {
    const D = JSON.parse(fs.readFileSync(rawFile(p), 'utf8')), R = D.results; summary[p] = {};
    md += `## ${p} pilot (${D.style})\n\nLift Guide on-cue share: without the arrow ${f(D.naturalShare * 100, 0)}%, with the arrow ${f(D.arrowShare * 100, 0)}% (target ${D.target * 100}%, q=${f(D.q, 2)}).\n\n`;
    md += `### Absolute (mean per run of ${FLIGHTS} flights)\n\n| Chain | cleared /6 | hearts lost | died before stop 6 | Lifts refused (no Sparks) | s under 20% | lowest Meter % | pickups collected | card Sparks | Stored at end |\n|---|---|---|---|---|---|---|---|---|---|\n`;
    for (const [name, label] of [['none', 'no card'], ['LG-noarrow', 'Lift Guide (arrow ignored)'], ['LG', 'Lift Guide only'], ...CARDS.map(c => [`LG+${c}`, `LG + ${NAME[c]}`])]) {
      const a = R[name]; md += `| ${label} | ${f(mean(a.map(r => r.cleared)))} | ${f(mean(a.map(r => r.hearts)), 2)} | ${a.filter(r => r.died).length}/${a.length} | ${f(mean(a.map(r => r.denied)), 1)} | ${f(mean(a.map(r => r.under20)), 1)} | ${f(mean(a.map(r => r.minMeter)) * 100, 0)} | ${f(mean(a.map(r => r.collected)), 1)} | ${f(mean(a.map(r => name === 'none' ? 0 : r.cardSparks)), 1)} | ${f(mean(a.map(r => r.stored)), 1)} |\n`;
    }
    md += `\n### Paired difference vs baseline (Lift Guide only; Lift Guide itself vs no card)\n\n| Card | extra Stored | extra flights cleared | hearts saved | died-run change | refused Lifts change | s under 20% change | card Sparks added | worth (Stored + ${HEART_VALUE}/heart) |\n|---|---|---|---|---|---|---|---|---|\n`;
    for (const c of ['lift-guide', ...CARDS]) {
      const [a, b] = c === 'lift-guide' ? ['LG', 'none'] : [`LG+${c}`, 'LG'];
      const st = diff(R, a, b, r => r.stored), cl = diff(R, a, b, r => r.cleared), hs = diff(R, b, a, r => r.hearts), dd = diff(R, a, b, r => r.died ? 1 : 0), dn = diff(R, a, b, r => r.denied), un = diff(R, a, b, r => r.under20), cs = diff(R, a, b, r => c === 'lift-guide' ? r.lgSparks : r.cardSparks);
      const wv = diff(R, a, b, r => r.stored - HEART_VALUE * r.hearts);
      const worth = st.m + HEART_VALUE * hs.m; summary[p][c] = { worth, se: wv.se };
      md += `| ${NAME[c]} | ${pm(st)} | ${pm(cl)} | ${pm(hs)} | ${pm(dd)} | ${pm(dn)} | ${pm(un)} | ${f(cs.m, 1)} | ${f(worth, 1)} ± ${f(wv.se, 1)} |\n`;
    }
    md += '\n';
  }
  const WEIGHT = { good: .6, average: .3, beginner: .1 }, wsum = c => names.reduce((a, p) => a + (WEIGHT[p] || 0) * summary[p][c].worth, 0), T = wsum('lift-guide');
  md += `## Worth summary (Stored-equivalent per 6 flights, ± standard error)\n\nWeighted worth = 0.6 good + 0.3 average + 0.1 beginner (balance for good players, weigh in worse ones). T = Lift Guide weighted worth = ${f(T, 1)}; target band for the others 0.8x-1.25x = ${f(T * .8, 1)}-${f(T * 1.25, 1)}.\n\n| Card | ${names.join(' | ')} | weighted | x T |\n|---|${names.map(() => '---').join('|')}|---|---|\n`;
  for (const c of ['lift-guide', ...CARDS]) md += `| ${NAME[c]} | ${names.map(p => `${f(summary[p][c].worth, 1)} ± ${f(summary[p][c].se, 1)}`).join(' | ')} | ${f(wsum(c), 1)} | ${f(wsum(c) / T, 2)} |\n`;
  const med = names.map(p => { const v = CARDS.map(c => summary[p][c].worth).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; });
  md += `| median of the starters tested | ${med.map(x => f(x, 1)).join(' | ')} |\n`;
  fs.writeFileSync(args.out || 'outputs/balance/starter-balance.md', md);
  console.log(md);
}
