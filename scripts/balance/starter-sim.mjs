// Shared sequence flyer for the starter-card measurements and the pilot diagnosis (extracted from starter-balance.mjs, 2026-11-18).
// Flies the first FLIGHTS stops of Map 1 as a sequence with the true starting state. Same run seed => same map and flight seeds in every
// condition (paired). Reads game code from dist/, never writes it.
//   const sim = await createSim({ style: 'player-good' });  const m = sim.flyRun(['lift-guide','skim-line'], 'sb0', { q: 0, payout: {...} });
import { fileURLToPath } from 'node:url';
import { cueTiming, LIFT_PHYSICS, classifyLift, SPARK_UNITS } from '../player-pilot.mjs';

export const FLIGHTS = 6;
export function mulberry(seed) { let a = 0; for (const c of String(seed)) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function createSim({ style }) {
  const { makeRun, M, instrument } = await import('./real-flight-check.mjs');
  if (!process.argv.includes('--importOnly')) process.argv.push('--importOnly');
  const { simulate, buildCase } = await import('../balance-current-flight.mjs');
  const sparksOf = (card, log) => card === 'skim-line' ? (log.engine.cardEngine?.sparks || 0) : (log.slots[card === 'lift-guide' ? 0 : 1]?.sparks || 0);

  /** opts: q (old pilots: convert off-cue Lifts to paid on-cue Lifts), guideP (probability a guide Lift pays; coin toss = .5), payout (extra modelled card payouts), flights */
  function flyRun(ids, runSeed, opts = {}) {
    const q = opts.q || 0, guideP = opts.guideP ?? 1, flights = opts.flights || FLIGHTS;
    const run = makeRun(ids, { seed: runSeed }), card = ids[ids.length - 1];
    const m = { cleared: 0, attempts: 0, hearts: 0, died: false, denied: 0, under20: 0, minMeter: 1, collected: 0, cardSparks: 0, lgSparks: 0, lifts: 0, guideLifts: 0, stored: 0, cardStored: 0, meterEnd: 0,
      cueLifts: 0, spam75: 0, spam50: 0, liftsFree: 0, sparksSpent: 0, minSpent: 0, fuelSeen: 0, fuelTaken: 0, deliveries: 0, skims: 0, overfills: 0, pulses: 0,
      att: [], deaths: { fuel: 0, terrain: 0, boundary: 0, obstacle: 0, other: 0 }, extraSparks: 0, extraStored: 0, timeFlown: 0, effStart: [] };
    let guard = 0; const tries = {}, stores = {};
    while (m.cleared < flights && guard++ < 40) {
      if (run.phase !== 'map') break;
      const ch = M.getChoices(run); if (!ch.length) break;
      const camp = ch.find(n => n.kind === 'camp'), normal = ch.find(n => n.type === 'flight' && !n.elite), elite = ch.find(n => n.type === 'flight');
      const hurt = run.lives < run.maxLives || run.flame < (opts.restBelow ?? (String(style).startsWith('player-') ? 88 : 60));
      const pick = (camp && (hurt || (!normal && !elite))) ? camp : normal || elite || camp || ch[0];
      if (!M.selectNode(run, pick.id)) break;
      if (pick.type !== 'flight') {
        if (pick.kind === 'camp') M.resolveSupport(run, 0);
        for (const k of ['pendingChest', 'pendingTemporary', 'cardDraft', 'cardReward']) delete run[k];
        if (run.phase !== 'map' || run.step <= pick.row) { run.phase = 'map'; run.step = pick.row + 1; run.current = null; }
        continue;
      }
      M.beginFlightAttempt(run); M.markFlightAttemptStarted(run);
      const config = buildCase({ terrain: pick.terrain, difficulty: 1, stage: pick.row, role: 'collector', style, seedIndex: 0, profile: 'refuge', skills: {} });
      Object.assign(config, { seed: `${run.seed}-${pick.id}`, duration: pick.duration, node: pick }); config.run = run; config.controllerSeed = tries[pick.id] = (tries[pick.id] || 0) + 1; if (opts.pilotExtra) config.pilotExtra = opts.pilotExtra; config.pilotStore = (stores[pick.id] ||= { seen: new Map() });
      const log = {}, rnd = mulberry(config.seed + ':cue' + config.controllerSeed); let under = 0, lastLift = null, a = { lifts: 0, cue: 0, s75: 0, s50: 0, free: 0 }, extraS = 0, extraStored = 0;
      const coin = mulberry(config.seed + ':coin' + config.controllerSeed);
      config.prepareEngine = e => {
        log.engine = e; instrument(e, log);
        const flap = e.flap.bind(e);
        e.flap = () => {
          const beforeG = log.events['guide-lift'] || 0, vy = e.player.vy, tNow = e.time, scale = e.scaleY, costNow = e.nextLiftCost, ok = flap();
          if (ok) {
            const cls = classifyLift({ vy, scale, since: lastLift == null ? Infinity : tNow - lastLift });
            a.lifts++; if (cls.onCue) a.cue++; if (cls.spam75) a.s75++; if (cls.spam50) a.s50++; if (costNow === 0) a.free++; lastLift = tNow;
          }
          if (ok && q > 0 && (log.events['guide-lift'] || 0) === beforeG && rnd() < q && rnd() < .5) e.resolveCardRowEvent('guide-lift', { meterFraction: e.flame / e.maxFlame, guardRecovering: e.wisp?.phase === 'guard-recovery' });
          return ok;
        };
        // Modelled changes that the game code does not have yet: guideP < 1 skips a guide Lift's payout with probability 1-guideP (the coin toss).
        const res = e.resolveCardRowEvent.bind(e);
        e.resolveCardRowEvent = (kind, ctx, ...r) => {
          if (kind === 'guide-lift' && guideP < 1 && coin() >= guideP) return null;
          const out = res(kind, ctx, ...r);
          if (opts.payout?.[kind] && (out?.receipt || kind === 'collector-delivery')) { const p = opts.payout[kind]; if (p.sparks) { e.flame = Math.min(e.maxFlame, e.flame + p.sparks * SPARK_UNITS); extraS += p.sparks; } if (p.stored) extraStored += p.stored; }
          return out;
        };
        if (opts.skimPayout) { let seen = 0; const st = e.step.bind(e); e.step = dt => { const r = st(dt); const n = e.edgingPulse?.triggerCount || 0; while (seen < n) { seen++; e.flame = Math.min(e.maxFlame, e.flame + (opts.skimPayout.sparks || 0) * SPARK_UNITS); extraS += opts.skimPayout.sparks || 0; extraStored += opts.skimPayout.stored || 0; } return r; }; }
        opts.prepare?.(e, log, { extraStoredAdd: n => { extraStored += n; }, extraSparksAdd: n => { extraS += n; } });
        const step = e.step.bind(e); e.step = dt => { if (e.flame < .2 * e.maxFlame) under += dt; return step(dt); };
      };
      let rec; try { rec = simulate(config); } catch (err) { rec = { success: false, result: null, err: String(err) }; }
      m.attempts++; m.under20 += under; m.denied += rec.liftInputs?.deniedEnergy || 0; m.timeFlown += rec.time || 0;
      m.cueLifts += a.cue; m.spam75 += a.s75; m.spam50 += a.s50; m.liftsFree += a.free;
      m.sparksSpent += (rec.effortSpent || 0) / SPARK_UNITS; m.extraSparks += extraS;
      const encountered = (rec.available || []).filter(p => p.fuel > 0 && p.x <= (rec.distance || 0) + 154 * 0).reduce((n, p) => n + p.fuel, 0);
      m.fuelSeen += (rec.encounteredFuel || encountered) / SPARK_UNITS; m.fuelTaken += (rec.baseFuelCollected || 0) / SPARK_UNITS;
      if (rec.minFuel != null && log.engine) m.minMeter = Math.min(m.minMeter, rec.minFuel / log.engine.maxFlame);
      if (log.engine) {
        m.lifts += log.occurred.lifts; m.guideLifts += log.events['guide-lift'] || 0;
        const sumv = o => Object.values(o || {}).reduce((x, y) => x + (typeof y === 'number' ? y : 0), 0);
        m.deliveries += sumv(log.occurred.delivery); m.skims += log.engine.edgingPulse?.triggerCount || 0; m.overfills += log.events['natural-overfill'] || 0; m.pulses += log.pulses || 0;
      }
      m.att.push({ ok: !!rec.success, time: rec.time || 0, dist: rec.progress || 0, spent: (rec.effortSpent || 0) / SPARK_UNITS, taken: (rec.baseFuelCollected || 0) / SPARK_UNITS, seen: (rec.encounteredFuel || 0) / SPARK_UNITS, lifts: a.lifts, minMeter: rec.minFuel / 100, start: rec.startFuel / SPARK_UNITS, avail: (rec.maxAvailableFuel || 0) / SPARK_UNITS, hits: rec.collisions, cause: rec.fatalCause, lastHit: rec.hitLog?.at(-1) ? { ...rec.hitLog.at(-1), kind: (() => { const o = log.engine?.layout?.obstacles?.find?.(o => o.id === rec.hitLog.at(-1).obstacle) || log.engine?.layout?.challenges?.find?.(o => o.id === rec.hitLog.at(-1).obstacle); return o ? String(o.biomeKind || o.kind || o.type || o.family || o.art || o.sprite || o.shape || o.id).replace(/[0-9]+$/, '') + (o.fall || o.falling ? '/falling' : '') : 'unknown'; })() } : null, terrain: pick.terrain, row: pick.row });
      const ok = M.finishFlight(run, rec.success && rec.result ? rec.result : { success: false });
      if (rec.success && rec.result && ok) {
        m.cleared++; m.collected += rec.pickupCounts ? Object.values(rec.pickupCounts).reduce((x, y) => x + y, 0) : 0;
        m.cardSparks += sparksOf(card, log); m.lgSparks += log.slots[0]?.sparks || 0; m.cardStored += log.slots[ids.length - 1]?.stored || 0;
        delete run.cardDraft; delete run.cardReward; m.stored = (run.condensedEarned || 0);
        m.extraStored += extraStored; run.condensedEarned = (run.condensedEarned || 0) + extraStored + (opts.finishPayout?.stored || 0); m.stored = run.condensedEarned;
        if (opts.finishPayout?.sparks) run.flame = Math.min(100, run.flame + opts.finishPayout.sparks * SPARK_UNITS);
      } else {
        m.hearts++;
        const last = rec.hitLog?.at(-1), cause = rec.fatalCause === 'fuel' || rec.lowFuelAtDeath ? 'fuel' : !last ? 'other' : last.obstacle === 'boundary' ? 'boundary' : /rock|wall|ruin|terrain|stone|ground|floor|cliff|ledge|crag|root|bough/i.test(String(last.obstacle)) ? 'terrain' : 'obstacle';
        m.deaths[cause]++;
        if (run.lives <= 0) { m.died = true; break; }
      }
    }
    m.meterEnd = run.flame; return m;
  }
  return { flyRun, M };
}
