// The simulated pilots fly the SAME flight the app builds for a player in a card run (scripts/balance/starter-sim.mjs vs dist/app.mjs launch).
// Compares course, seed, duration, layout hashes (obstacles, challenges, terrain, Sparks), Meter, hearts, Lift cost, speed, Collector and mod hashes.
import test from 'node:test';
import assert from 'node:assert/strict';
process.argv.push('--importOnly');
const { createSim } = await import('../scripts/balance/starter-sim.mjs');
const { appFlightOptions, experiencedState, simRoute, fingerprint } = await import('../scripts/balance/app-flight.mjs');
const { makeRun, M } = await import('../scripts/balance/real-flight-check.mjs');
const { canvas } = await import('../scripts/balance-current-flight.mjs');
const { WispFlight } = await import('../dist/flight.mjs');
const { onboardingFlightPlan } = await import('../dist/onboarding.mjs');
const sim = await createSim({ style: 'player-good' });
const state = experiencedState();

function engines(run, pick, legacy = false) {
  const app = new WispFlight({ canvas: canvas(), ...appFlightOptions(state, run, pick, onboardingFlightPlan) });
  const config = sim.flightConfig(run, pick, 'player-good', { legacy }); let built = null;
  config.prepareEngine = e => { built = e; throw new Error('captured'); };
  try { sim.simulate(config); } catch (e) { if (e.message !== 'captured') throw e; }
  return { app: fingerprint(app), sim: fingerprint(built), config };
}
const diff = (a, b) => Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));

test('route: six real flights per seed, same route function the replay uses', () => {
  for (const seed of ['sb0', 'sb3', 'sb12']) {
    const { flights, path } = simRoute(seed, ['lift-guide'], makeRun);
    assert.equal(flights.length, 6, seed);
    assert.deepEqual(simRoute(seed, ['lift-guide'], makeRun).path, path);
  }
});

test('sim flight == app flight for the first stops of several run seeds (course, layout, Meter, hearts, physics)', () => {
  for (const seed of ['sb0', 'sb1', 'sb7', 'weekly-z']) {
    const { path } = simRoute(seed, ['lift-guide'], makeRun), run = makeRun(['lift-guide'], { seed }); let flown = 0;
    for (const id of path) {
      const pick = M.getChoices(run).find(n => n.id === id); assert.ok(pick, `${seed} ${id} offered`);
      M.selectNode(run, id);
      if (pick.type === 'flight' && flown < 4) {
        if (++flown === 3) { run.lives = 2; run.flame = 17 * (10 / 3); }   // a later stop after a fall: fewer hearts, a Meter of 17 Sparks
        const { app, sim: s } = engines(run, pick);
        assert.deepEqual(diff(app, s), [], `${seed} ${id}: ${diff(app, s).map(k => `${k} app=${app[k]} sim=${s[k]}`)}`);
        assert.equal(app.cardPilot, true); assert.equal(s.cardPilot, true);
        assert.equal(s.lives, run.lives); assert.equal(s.flame, run.flame);
        assert.ok(s.sparkCount > 5 && s.duration > 20);
      }
      if (pick.kind === 'camp') M.resolveSupport(run, 0);
      run.phase = 'map'; run.step = pick.row + 1; run.current = null; run.attemptActive = false;
      for (const k of ['pendingChest', 'pendingTemporary', 'cardDraft', 'cardReward', 'flightReward']) delete run[k];
    }
    assert.equal(flown, 4);
  }
});

test('the old sim config was NOT the app flight (no cardPilot): guard against regressing to it', () => {
  const run = makeRun(['lift-guide'], { seed: 'sb0' }), id = simRoute('sb0', ['lift-guide'], makeRun).flights[0], pick = M.getChoices(run).find(n => n.id === id);
  M.selectNode(run, id);
  const { app, sim: s } = engines(run, pick, true);
  assert.ok(diff(app, s).includes('cardPilot'));
  assert.equal(app.obstacles, s.obstacles); assert.equal(app.embers, s.embers); // the course itself was already identical
});

test('?simrun entry (dist/sim-replay.mjs): same route as the sim, stop state, carry-over, isolated from any save', async () => {
  const R = await import('../dist/sim-replay.mjs');
  for (const seed of ['sb0', 'sb4', 'sb12']) {
    const mine = R.simRoute(seed), theirs = simRoute(seed, ['lift-guide'], makeRun);
    assert.deepEqual(mine, theirs, seed);
    for (let stop = 1; stop <= 6; stop++) {
      const { state, nodeId, params } = R.createSimRunState(new URLSearchParams({ simrun: seed, stop: String(stop) }));
      assert.equal(nodeId, theirs.flights[stop - 1]); assert.equal(state.run.current.id, nodeId); assert.equal(state.run.phase, 'briefing');
      assert.equal(state.run.flame, Math.round(R.SIM_START[stop - 1].sparks * 10 / 3)); assert.equal(state.run.lives, R.SIM_START[stop - 1].hearts);
      assert.equal(state.run.seed + '-' + nodeId, `${makeRun(['lift-guide'], { seed }).seed}-${nodeId}`);   // the flight seed the sim uses
      assert.deepEqual(state.run.mountedCards.filter(Boolean).map(c => c.cardId), ['lift-guide']); assert.equal(params.stop, stop);
    }
  }
  const over = R.createSimRunState(new URLSearchParams('simrun=sb0&stop=2&meter=7&hearts=1&card=skim-line'));
  assert.equal(over.state.run.lives, 1); assert.equal(over.state.run.flame, Math.round(7 * 10 / 3)); assert.deepEqual(over.state.run.mountedCards.filter(Boolean).map(c => c.cardId), ['lift-guide', 'skim-line']);
  const carried = R.createSimRunState(new URLSearchParams('simrun=sb0&stop=3&carry=1&meter=12&hearts=2'));
  assert.equal(carried.state.run.lives, 2); assert.equal(carried.state.run.flame, 40);
});
