import test from 'node:test';
import assert from 'node:assert/strict';
import { PhoenixFlight, obstaclePolygons, circleHitsPolygon } from '../dist/flight.mjs';
import { newState, createRun, applyStarter, getChoices, selectNode, finishFlight,
  takeCard, getSupportChoices, resolveSupport, getModifiers, saveState,
  loadState, bankRun, ROUTE_PROFILES } from '../dist/model.mjs';

globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

function canvas() {
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, {
    get: (target, key) => target[key] ?? (String(key).includes('Gradient') ? () => gradient : () => {}),
    set: (target, key, value) => (target[key] = value, true),
  });
  return { getContext: () => context, getBoundingClientRect: () => ({ width: 390, height: 620 }) };
}

function fly(options, diagnostics = {}) {
  let result;
  const flight = new PhoenixFlight({ ...options, canvas: canvas(), onFinish: value => { result = value; } });
  diagnostics.directWhileCooling = 0;
  const collect = flight.collect.bind(flight);
  flight.collect = ember => {
    if (!ember.collected && !ember.deliveredByWisp && flight.wisp.phase === 'cooldown') diagnostics.directWhileCooling++;
    return collect(ember);
  };
  if (options.ignoreFuel) flight.layout.embers = [];
  if (options.isolated) flight.layout = { obstacles: [], embers: [] };
  flight.start();
  let lastFlap = -2;
  for (let frame = 0; frame < 9000 && !flight.finished; frame++) {
    const next = flight.layout.obstacles.find(obstacle => !obstacle.destroyed &&
      obstacle.x - flight.distance + obstacle.width * 2.5 >= flight.player.x - flight.player.radius);
    const wisp = flight.getWispState();
    // A free companion can intercept fuel at its home offset. While it is
    // fetching or cooling down, the player must meet other fuel directly.
    // Reserved fuel is still pending delivery, so do not count it as income.
    const carrierReady = wisp.phase === 'ready';
    const interceptX = carrierReady ? wisp.homeX : flight.player.x;
    const fuel = flight.flame < 48 ? flight.layout.embers.find(ember => ember.fuel && !ember.generated &&
      !ember.collected && !ember.attracted && !ember.carried && ember.x - flight.distance > interceptX - (carrierReady ? 55 : 16) &&
      ember.x - flight.distance < flight.player.x + 280) : null;
    const desiredFuelY = fuel ? fuel.y - (carrierReady ? wisp.homeY - flight.player.y : 0) : 0;
    const target = fuel ? desiredFuelY : next ? flight.obstacleCenter(next) : flight.height * .5;
    const speed = flight.baseSpeed * (flight.boostTime > 0 ? 1.48 : 1);
    const intercept = fuel ? (fuel.x - flight.distance - interceptX) / speed : Infinity;
    let shouldFlap = flight.player.y > target + 8 && flight.player.vy > 0;
    if (fuel && intercept > 0 && intercept < 1.4) {
      // Time the next wingbeat to meet a visible fuel ember, including waiting
      // when a later tap would be more accurate and spend the same effort.
      const desired = desiredFuelY;
      const gravity = 300 * flight.scaleY * (flight.mod.gravity || 1);
      const coast = flight.player.y + flight.player.vy * intercept + gravity * intercept ** 2 / 2;
      let bestError = Math.abs(coast - desired), bestDelay = Infinity;
      for (let delay = 0; delay < intercept; delay += .035) {
        const waitY = flight.player.y + flight.player.vy * delay + gravity * delay ** 2 / 2;
        const remaining = intercept - delay;
        const arrival = waitY - 205 * flight.scaleY * (flight.mod.flap || 1) * remaining + gravity * remaining ** 2 / 2;
        const error = Math.abs(arrival - desired);
        if (error < bestError - 1) { bestError = error; bestDelay = delay; }
      }
      shouldFlap = coast > desired + 12 && bestDelay < .036;
    }
    // Do not chase a collectible through a visible slope. A short ballistic
    // lookahead uses the same geometry a player can see, without moving it.
    const lead = .23, gravity = 300 * flight.scaleY * (flight.mod.gravity || 1);
    const futureX = flight.distance + flight.player.x + speed * lead;
    const coastY = flight.player.y + flight.player.vy * lead + gravity * lead ** 2 / 2;
    const flapY = flight.player.y - 205 * flight.scaleY * (flight.mod.flap || 1) * lead + gravity * lead ** 2 / 2;
    const collides = y => y < 28 || y > flight.height - 29 || flight.layout.obstacles.some(obstacle =>
      !obstacle.destroyed && Math.abs(obstacle.x - futureX) < 480 &&
      obstaclePolygons(obstacle, flight.time + lead).some(polygon => circleHitsPolygon(futureX, y, 13, polygon)));
    if (collides(coastY) && !collides(flapY)) shouldFlap = true;
    if (!collides(coastY) && collides(flapY)) shouldFlap = false;
    if (options.isolated) shouldFlap = frame % 81 === 0;
    if (shouldFlap && flight.time - lastFlap > .35 && flight.flap()) lastFlap = flight.time;
    if (options.useBoost !== false && flight.cooldown === 0 && frame > 240) flight.boost();
    flight.step(1 / 60);
  }
  diagnostics.time = flight.time;
  diagnostics.distance = flight.distance;
  diagnostics.totalDistance = flight.totalDistance;
  flight.destroy();
  assert.ok(result, 'flight terminates within its bounded duration');
  return result;
}

test('baseline and three contrasting builds can clear the same authored terrain seeds', () => {
  const builds = [[], ['hungry-wisp', 'kindled-spirit', 'golden-wake'],
    ['storm-feeder', 'steady-flame', 'high-wing'], ['ash-ward', 'soft-descent', 'warm-heart']];
  for (const terrain of ['ruins', 'canopy', 'storm']) {
    for (const cards of builds) {
      const result = fly({ terrain, cards, modifiers: getModifiers(cards),
        seed: 'qa-shared-flight', duration: 35, hp: 3, challengeId: 'boosts', challengeTarget: 2 });
      assert.equal(result.success, true, `${terrain}: ${cards.join(',') || 'baseline'}`);
      assert.ok(result.hp > 0);
      assert.equal(result.challengeComplete, result.boosts >= 2);
      assert.ok(result.embers >= 0);
    }
  }
});

test('fuel collection sustains a route that cannot be cleared by spending the initial reserve alone', () => {
  const options = { terrain: 'canopy', seed: 'qa-shared-flight', duration: 38,
    node: ROUTE_PROFILES.refuge, hp: 3, flame: 35 };
  const diagnostics = {};
  const supplied = fly(options, diagnostics);
  const starved = fly({ ...options, ignoreFuel: true });
  assert.equal(supplied.success, true);
  assert.ok(supplied.stats.flameRestored > 0);
  assert.ok(supplied.stats.effortSpent > 100, 'the route actually needs gathered fuel');
  assert.ok(diagnostics.directWhileCooling > 0, 'body contact collects fuel while the companion recovers');
  assert.equal(starved.success, false);
  assert.ok(starved.flame < 7);
});

test('an entire seven-stop expedition integrates flight challenges, rewards, reloads and single banking', () => {
  let state = newState();
  state.run = createRun(state.profile, 'qa-complete-expedition');
  assert.ok(applyStarter(state.run, state.run.offers[0]));
  let flights = 0, supports = 0;
  const memory = new Map();
  const storage = { setItem: (key, value) => memory.set(key, value), getItem: key => memory.get(key) };
  for (let guard = 0; guard < 30 && state.run.phase !== 'ended'; guard++) {
    const run = state.run;
    if (run.phase === 'map') {
      const node = getChoices(run).find(choice => !choice.elite);
      assert.ok(node, 'ordinary path remains available');
      assert.ok(selectNode(run, node.id));
    } else if (run.phase === 'support') {
      const choices = getSupportChoices(run);
      assert.equal(choices.length, 2);
      assert.ok(resolveSupport(run, 0));
      supports++;
    } else if (run.phase === 'briefing') {
      const node = run.current;
      const modifiers = getModifiers(run.cards, run.skills);
      const result = fly({ seed: `${run.seed}:${node.id}`, terrain: node.terrain,
        elite: node.elite, duration: node.duration, node, cards: run.cards, modifiers,
        hp: run.hp, maxHp: run.maxHp, shield: run.shield, flame: run.flame,
        rebirthAvailable: modifiers.rebirth && !run.usedRebirth,
        challengeId: node.challengeId, challengeTarget: node.challengeTarget });
      const before = run.embers;
      assert.ok(result.success, `ordinary ${node.id}/${node.routeStyle} ${node.terrain} from ${run.flame} Flame: ${JSON.stringify(result)}`);
      assert.ok(finishFlight(run, result));
      assert.equal(run.embers, before + result.embers + node.bonusEmbers +
        (result.challengeComplete ? node.challengeBonus : 0), 'pickup and challenge rewards are paid once');
      assert.equal(finishFlight(run, result), false, 'flight result cannot be resubmitted');
      flights++;
    } else if (run.phase === 'reward') {
      assert.equal(run.offers.length, 2);
      assert.ok(takeCard(run, run.offers[0], run.cards.length === 3 ? 0 : null));
      assert.ok(run.cards.length <= 3);
    } else assert.fail(`unexpected phase ${run.phase}`);
    const beforeReload = JSON.stringify(state.run);
    assert.ok(saveState(state, storage));
    state = loadState(storage);
    assert.equal(JSON.stringify(state.run), beforeReload, 'reload preserves the checkpoint and offered choices');
  }
  assert.equal(flights, 5);
  assert.equal(supports, 2);
  assert.equal(state.run.phase, 'ended');
  assert.equal(state.run.success, true);
  assert.equal(state.run.step, 7);
  const earned = state.run.embers;
  assert.ok(bankRun(state));
  assert.equal(state.profile.embers, earned);
  assert.equal(state.profile.stats.wins, 1);
  assert.ok(saveState(state, storage));
  state = loadState(storage);
  assert.equal(bankRun(state), false);
  assert.equal(state.profile.embers, earned);
});

test('ordinary route profiles remain supplied from their advised starting reserves', () => {
  const failures = [];
  const builds = [[], ['hungry-wisp', 'kindled-spirit', 'golden-wake'],
    ['storm-feeder', 'steady-flame', 'high-wing'], ['ash-ward', 'soft-descent', 'warm-heart']];
  for (let seed = 0; seed < 12; seed++) for (const terrain of ['ruins', 'canopy', 'storm']) {
    for (const profile of [ROUTE_PROFILES.refuge, ROUTE_PROFILES.cavern]) for (const cards of builds) {
      const result = fly({ terrain, seed: `qa-reserve-${seed}`, duration: Math.round(38 * profile.durationScale),
        node: profile, hp: 3, flame: profile.routeStyle === 'refuge' ? 35 : 60, cards, modifiers: getModifiers(cards) });
      if (!result.success) failures.push({ seed, terrain, cards, route: profile.routeStyle,
        hp: result.hp, flame: result.flame, collected: result.collected, ...result.stats });
    }
  }
  assert.deepEqual(failures, [], 'ordinary profiles have feasible fuel-aware routes without permanent upgrades');
});

test('Boost and travel-speed cards cover the same passage sooner with fewer wingbeats', () => {
  const common = { terrain: 'ruins', seed: 'qa-distance-efficiency', duration: 15,
    node: ROUTE_PROFILES.refuge, hp: 3, flame: 100, isolated: true };
  const coastTime = {}, boostTime = {}, tailwindTime = {};
  const coast = fly({ ...common, useBoost: false, modifiers: getModifiers([]) }, coastTime);
  const boosted = fly({ ...common, useBoost: true, modifiers: getModifiers([]) }, boostTime);
  const tailwind = fly({ ...common, useBoost: false, cards: ['tailwind'],
    modifiers: getModifiers(['tailwind']) }, tailwindTime);
  assert.equal(coast.success, true);
  assert.equal(boosted.success, true);
  assert.equal(tailwind.success, true);
  assert.equal(coastTime.totalDistance, boostTime.totalDistance);
  assert.equal(coastTime.totalDistance, tailwindTime.totalDistance);
  assert.ok(boostTime.time < coastTime.time - .75, 'two 0.9-second bursts at +48% speed save about 0.86 seconds');
  assert.ok(tailwindTime.time < coastTime.time - 1, 'speed stats reach the same exit sooner');
  assert.ok(boosted.stats.flaps < coast.stats.flaps, 'Boost saves wingbeats over the fixed passage');
  assert.ok(tailwind.stats.flaps < coast.stats.flaps, 'speed saves wingbeats over the fixed passage');
});

test('fixed-step flight advances consistently at 30, 60 and 120 display frames per second', () => {
  const results = [];
  for (const fps of [30, 60, 120]) {
    const flight = new PhoenixFlight({ canvas: canvas(), terrain: 'storm',
      seed: 'qa-frame-rate', duration: 35, cards: ['storm-feeder', 'steady-flame'],
      modifiers: getModifiers(['storm-feeder', 'steady-flame']) });
    // Schedule input on simulation steps rather than display callbacks, so this
    // verifies the simulation rather than different frame-quantized user input.
    const originalStep = flight.step.bind(flight);
    flight.step = dt => {
      const frame = Math.round(flight.time * 60);
      if (frame % 28 === 0) flight.flap();
      if (frame % 540 === 0) flight.boost();
      flight.invincible = 100;
      originalStep(dt);
    };
    flight.start();
    flight.tick(1000);
    for (let frame = 1; frame <= fps * 20; frame++) flight.tick(1000 + frame * 1000 / fps);
    results.push({ fps, time: flight.time, distance: flight.distance,
      y: flight.player.y, boosts: flight.boosts, hp: flight.hp });
    flight.destroy();
  }
  const baseline = results[1];
  for (const result of results) {
    assert.ok(Math.abs(result.time - baseline.time) <= 1 / 60 + 1e-8,
      `${result.fps}Hz simulation time stays within one fixed step`);
    assert.ok(Math.abs(result.distance - baseline.distance) <= 5,
      `${result.fps}Hz travel does not depend on display refresh rate`);
    assert.ok(Math.abs(result.y - baseline.y) <= 12,
      `${result.fps}Hz body position stays within one step of movement`);
    assert.equal(result.boosts, baseline.boosts);
    assert.equal(result.hp, baseline.hp);
  }
});
