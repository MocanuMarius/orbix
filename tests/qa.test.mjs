import test from 'node:test';
import assert from 'node:assert/strict';
import { PhoenixFlight } from '../dist/flight.mjs';
import { newState, createRun, applyStarter, getChoices, selectNode, finishFlight,
  takeCard, getSupportChoices, resolveSupport, getModifiers, saveState,
  loadState, bankRun } from '../dist/model.mjs';

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

function fly(options) {
  let result;
  const flight = new PhoenixFlight({ ...options, canvas: canvas(), onFinish: value => { result = value; } });
  flight.start();
  for (let frame = 0; frame < 9000 && !flight.finished; frame++) {
    const next = flight.layout.obstacles.find(obstacle => !obstacle.destroyed &&
      obstacle.x - flight.distance + obstacle.width >= flight.player.x - flight.player.radius);
    const target = next ? flight.obstacleCenter(next) : flight.height * .5;
    if (flight.player.y > target + 8 && flight.player.vy > 0) flight.flap();
    if (flight.cooldown === 0 && frame > 240) flight.boost();
    flight.step(1 / 60);
  }
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
        elite: node.elite, duration: node.duration, cards: run.cards, modifiers,
        hp: run.hp, maxHp: run.maxHp, shield: run.shield,
        rebirthAvailable: modifiers.rebirth && !run.usedRebirth,
        challengeId: node.challengeId, challengeTarget: node.challengeTarget });
      const before = run.embers;
      assert.ok(result.success, 'ordinary flight remains clearable without purchased skills');
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
