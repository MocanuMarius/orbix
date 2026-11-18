// Per-second trace of one pilot on one stop. node scripts/balance/trace-stop.mjs --pilot=player-average --seed=sb1 --stop=3 --trial=1
process.argv.push('--importOnly');
const { createSim } = await import('./starter-sim.mjs');
const { SIM_START } = await import('../../dist/sim-replay.mjs');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const sim = await createSim({ style: args.pilot || 'player-average' }), stop = Number(args.stop || 3), seed = args.seed || 'sb1';
let rows = [], eng = null, lifts = [];
const m = sim.flyRun(['lift-guide'], seed, { restBelow: 88, startAt: { stop, sparks: SIM_START[stop - 1].sparks, hearts: SIM_START[stop - 1].hearts }, trial: Number(args.trial || 1), once: true,
  prepare(e) { eng = e; let nextT = 0; const st = e.step.bind(e); const fl = e.flap.bind(e); e.flap = () => { const ok = fl(); if (ok) lifts.push(e.time); return ok; };
    e.step = dt => { const r = st(dt); if (e.time >= nextT) { nextT += 1; rows.push({ t: +e.time.toFixed(1), dist: Math.round(e.distance), meter: Math.round(e.flame), y: Math.round(e.player.y), lifts: lifts.length }); } return r; }; } });
console.log(JSON.stringify({ ok: m.cleared, att: m.att[0] && { time: m.att[0].time, cause: m.att[0].cause, taken: m.att[0].taken, seen: m.att[0].seen, avail: m.att[0].avail, lifts: m.att[0].lifts } , deaths: m.deaths, overfills: m.overfills, lastHit: m.att[0]?.lastHit }));
console.log(rows.map(r => `${r.t}s d${r.dist} M${r.meter} y${r.y} L${r.lifts}`).join('\n'));
const P = await import('./real-flight-check.mjs');
const em = eng.layout.embers.filter(p => !p.generated);
const spec = x => P.P.getPickupSpec(x);
const rowsE = em.filter(p => (spec(p).fuel > 0)).map(p => ({ id: p.id, kind: p.kind, x: Math.round(p.x), y: Math.round(p.y), fuel: spec(p).fuel, taken: !!(p.collected || p.carried || p.attracted), reachedBy: p.x <= eng.distance + eng.player.x }));
console.log('sparks total', rowsE.length, 'reached', rowsE.filter(r => r.reachedBy).length, 'taken', rowsE.filter(r => r.taken).length);
console.log(rowsE.filter(r => r.reachedBy && !r.taken).map(r => `MISS ${r.kind} x${r.x} y${r.y} f${r.fuel}`).join('\n'));
console.log('height', eng.height, 'holes', (eng.blackHoles?.items || []).map(h => `x${Math.round(h.x)} y${Math.round(h.y)} g${!!h.giant}`).join(' '));
