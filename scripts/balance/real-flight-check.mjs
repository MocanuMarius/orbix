// Real-flight trigger harness. Mounts cards in a real card run (model.createRun), flies a real course with the
// repository's human pilot (scripts/balance-current-flight.mjs `simulate`, real WispFlight, real layout) and records
// what the Chain did: how often each Trigger occurred, which slot fired, what it paid.
//
//   node scripts/balance/real-flight-check.mjs [--cards=harvest-common,lift-guide] [--seeds=3] [--stage=2] [--src=dist]
//
// `--src=<dir>` points at another checkout's dist/ (for before/after comparisons, git worktree).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
process.argv.push('--importOnly');
const { simulate, buildCase } = await import(pathToFileURL(path.join(root, 'scripts/balance-current-flight.mjs')));
const src = path.resolve(root, String(args.src || 'dist'));
const M = await import(pathToFileURL(path.join(src, 'model.mjs')));
const S = await import(pathToFileURL(path.join(src, 'skill-cards.mjs')));
const { BIOME_LEVELS } = await import(pathToFileURL(path.join(src, 'biomes.mjs')));
let L = null; try { L = await import(pathToFileURL(path.join(src, 'course-landforms.mjs'))); } catch {}
const P = await import(pathToFileURL(path.join(src, 'pickups.mjs')));
const { sparkBodyRadius } = await import(pathToFileURL(path.join(src, 'spark-size.mjs')));
export { M, S, P };

/** A real card run with `ids` mounted in Slots 1..n (null = empty slot) and optional slot Inscriptions. */
export function makeRun(ids, { seed = 'rf', inscriptions = [], flame } = {}) {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = M.createRun(state.profile, seed, 1, { cards: true });
  while (run.mountedCards.length < ids.length) run.mountedCards.push(null);
  M.cleanSlotInscriptions(run);
  ids.forEach((id, i) => { run.mountedCards[i] = id ? S.makeSkillCard(id, `rf:${i}:${id}`) : null; });
  inscriptions.forEach((id, i) => { if (id) M.writeInscription(run, i, id); });
  if (flame != null) run.flame = flame;
  return run;
}

/** Steer toward the layout's Flare (the pilot only seeks one when it is dim or has nothing else to chase). */
export function seekFlare(e) {
  const step = e.step.bind(e);
  e.step = dt => {
    if (!e.flashTether) {
      const f = e.layout.embers.find(p => (p.kind === 'sight' || p.kind === 'flash') && !p.collected);
      const dx = f ? f.x - (e.distance + e.player.x) : 1e9;
      if (f && dx > -20 && dx < 420) { const d = f.y - e.player.y; e.player.y += Math.max(-3, Math.min(3, d)); if (e.player.vy * d < 0) e.player.vy *= .5; }
    }
    return step(dt);
  };
}

/** Counters. log.occurred = what really happened (independent of the cards); log.slots[i] = what slot i did. */
export function instrument(e, log = {}) {
  Object.assign(log, { pulses: 0, pulseBySource: {}, events: {}, slots: {}, firings: [], activations: [], traces: 0,
    occurred: { body: {}, delivery: {}, lifts: 0, fallingLifts: 0, flares: 0, hitsSaved: 0 }, paid: 0, pulseTargets: 0 });
  const wave = e.luminanceWaves, emit = wave.emit.bind(wave);
  wave.emit = o => { log.pulses++; const w = emit(o), reach = w.maximum; log.pulseTargets = (log.pulseTargets || 0) + e.layout.embers.filter(p => !p.collected && !p.carried && !p.generated && P.isFuelPickup(p) && Math.hypot(p.x - o.x, p.y - o.y) <= reach && p.x - e.distance > -50 - 154 * reach / 640 && p.x - e.distance < e.width + 154 * reach / 640).length; const k = o?.source || '?'; log.pulseBySource[k] = (log.pulseBySource[k] || 0) + 1; return w; };
  const res = e.resolveCardRowEvent.bind(e);
  e.resolveCardRowEvent = (kind, ctx, ...r) => {
    const a = res(kind, ctx, ...r); const rc = a?.receipt;
    if (rc) {
      log.events[kind] = (log.events[kind] || 0) + 1;
      if (e.cardRowTrace === rc) log.traces++;
      let any = false;
      for (const c of rc.cards) {
        if (!c || !(c.fired > 0)) continue; any = true;
        const s = log.slots[c.slot] ||= { id: c.cardId, fired: 0, events: 0, sparks: 0, stored: 0, recovery: 0, reel: 0, nextReel: 0, byKind: {} };
        s.fired += c.fired; s.events++; s.sparks += c.effective.sparks; s.stored += c.effective.stored; s.recovery += c.effective.recoverySeconds; s.reel += c.effective.reelSeconds; s.nextReel += c.effective.nextReelSeconds;
        s.byKind[kind] = (s.byKind[kind] || 0) + 1;
      }
      if (any) { log.firings.push({ t: +e.time.toFixed(2), kind, sparks: rc.sparks, stored: rc.stored, exec: rc.executions }); log.paid += rc.sparks; }
    }
    return a;
  };
  const act = e.activation.bind(e); e.activation = (s, d) => { log.activations.push({ t: +e.time.toFixed(2), s, d }); return act(s, d); };
  const col = e.collect.bind(e);
  e.collect = p => {
    const was = p.collected, k = p?.kind; col(p);
    if (was || !p.collected) return;
    if (k === 'sight') log.occurred.flares++;
    else if (!p.generated) { const bag = p.deliveredByWisp ? log.occurred.delivery : log.occurred.body; bag[k] = (bag[k] || 0) + 1; }
  };
  const flap = e.flap.bind(e);
  e.flap = () => { const falling = e.player.vy > 0, since = e.cardLastAcceptedLift == null ? 1e9 : e.time - e.cardLastAcceptedLift, flame = e.flame; const ok = flap();
    if (ok) { log.occurred.lifts++; if (falling && since >= .75 - 1e-9 && flame > 0) log.occurred.fallingLifts++; } return ok; };
  return log;
}

/** Fly one real flight. opts: ids, inscriptions, seedIndex, stage, levelId, duration, hook(engine, log), assist flags. */
export function fly({ ids, inscriptions = [], seedIndex = 0, stage = 2, levelId, style = 'human150', duration, run, hook, flare = false, gen = 2, flame } = {}) {
  const level = BIOME_LEVELS.find(l => l.id === levelId) || BIOME_LEVELS.find(l => L?.LANDFORM_RECIPES?.[l.id]) || BIOME_LEVELS[0];
  const config = buildCase({ terrain: level.terrain, difficulty: 1, stage, role: 'collector', style, seedIndex, profile: 'cavern', skills: {} });
  config.seed += `:${level.id}`;
  if (duration) config.duration = duration;
  Object.assign(config.node, { levelId: level.id, biomeId: level.biomeId, locationName: level.name });
  config.run = run || makeRun(ids, { seed: config.seed, inscriptions, flame });
  const log = {};
  config.prepareEngine = e => { log.engine = e; instrument(e, log); if (flare) seekFlare(e); hook?.(e, log, config); };
  L?.overrideCourseGeneration?.(gen);
  try { const record = simulate(config); return { record, log, level: level.id, run: config.run, config }; } finally { L?.overrideCourseGeneration?.(null); }
}
export const sum = (a, f = x => x) => a.reduce((n, x) => n + f(x), 0);
export { BIOME_LEVELS };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ids = String(args.cards || 'harvest-common').split(',');
  for (let i = 0; i < Number(args.seeds || 3); i++) {
    const { record, log, level } = fly({ ids, seedIndex: i, stage: Number(args.stage ?? 2), flare: true });
    console.log(JSON.stringify({ level, seed: i, ok: record.success, t: record.time, pickups: record.pickupCounts, pulses: log.pulses, bySrc: log.pulseBySource, events: log.events, slots: log.slots, paid: log.paid, occurred: log.occurred }));
  }
}

/** Assist: hand the Lift to a metronome for a moment, so a phrase of even Lifts ("on the beat") can be played.
 *  The pilot's own Lifts are muted during each phrase window; the engine, layout and Rhythm card stay real. */
export function playBeats(e, { starts = [6, 14, 22], gap = .5, taps = 3 } = {}) {
  const flap = e.flap.bind(e), step = e.step.bind(e); let muted = false; const plan = starts.flatMap(s => Array.from({ length: taps }, (_, i) => s + i * gap)); let next = 0;
  const pilotFlap = () => (muted ? false : flap());
  e.flap = pilotFlap;
  e.step = dt => {
    muted = starts.some(s => e.time >= s - .3 && e.time <= s + gap * (taps - 1) + .4);
    while (next < plan.length && e.time >= plan[next]) { next++; if (e.player.y > 90) { e.flap = flap; flap(); e.flap = pilotFlap; } }
    return step(dt);
  };
}
/** Assist: fly into the floor once (a real collision, resolved by the engine's own hit path) at `at` seconds. */
export function crashOnce(e, at = 8, flame = null) {
  const step = e.step.bind(e); let done = 0;
  e.step = dt => {
    if (done < 1 && e.time >= at && e.alive && !e.dying) { done++; if (flame != null) e.flame = flame; e.player.y = e.height - 40; e.player.vy = 700 * e.scaleY; e.hit(null); }
    return step(dt);
  };
}

/** The full real path: createRun -> select a flight node -> begin attempt -> fly it with the pilot -> M.finishFlight(run, result). */
export function flyRealNode({ ids, inscriptions = [], seed = 'rf-real', hook, style = 'human150', mutate } = {}) {
  const run = makeRun(ids, { seed, inscriptions }); mutate?.(run);
  const node = M.getChoices(run).find(n => n.type !== 'support');
  M.selectNode(run, node.id); M.beginFlightAttempt(run); M.markFlightAttemptStarted(run);
  const config = buildCase({ terrain: node.terrain, difficulty: 1, stage: 0, role: 'collector', style, seedIndex: 0, profile: 'refuge', skills: {} });
  Object.assign(config, { seed: `${run.seed}-${node.id}`, duration: node.duration, node });
  config.run = run; const log = {};
  config.prepareEngine = e => { log.engine = e; instrument(e, log); hook?.(e, log); };
  const record = simulate(config);
  const finished = record.result ? M.finishFlight(run, record.result) : false;
  return { run, record, log, node, finished };
}

/** Assist: put the Collector into recovery once (as if it had just delivered), so recovery-shortening cards have something to shorten. */
export function collectorRecovering(e, at = 4, seconds = 12) {
  const step = e.step.bind(e); let done = false;
  e.step = dt => { if (!done && e.time >= at) { done = true; e.wisp.cooldown = e.wisp.cooldownMax = seconds; } return step(dt); };
}

/** Assist: drop an ordinary pickup of `kind` just behind the wisp (a "missed" one) so the real Collector fetches and delivers it. */
export function dropMissed(e, kinds = ["cache"], at = 3, every = 6) {
  const step = e.step.bind(e); let n = 0, next = at;
  e.step = dt => {
    if (e.time >= next && n < kinds.length) {
      const p = { id: 'rf-missed:' + n, kind: kinds[n], y: e.player.y, collected: false }; n++; next += every;
      p.x = e.distance + e.player.x - 38 - sparkBodyRadius(p, e.height); e.layout.embers.push(p); e._nearbyPacketsUntil = -1;
    }
    return step(dt);
  };
}
