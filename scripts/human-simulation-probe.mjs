import assert from 'node:assert/strict';

process.argv.push('--importOnly');
const { canvas } = await import('./balance-current-flight.mjs');
const { getRunModifiers } = await import('../dist/model.mjs');
const { WispFlight } = await import('../dist/flight.mjs');
const {humanProfile, queueHumanLift, planHumanLift} = await import('./human-flight-planner.mjs');
const { observeFlight } = await import('./human-flight-perception.mjs');

// Modify the generated scene only in this probe. The player, camera, current
// light, Energy and input history are identical across both copies.
function room() {
  const e = new WispFlight({
    canvas: canvas(), seed: 'visibility-regression', companions: ['collector'],
    node: { row: 0, mapIndex: 0, difficulty: 2 }
  });
  e.layout.obstacles = [];
  e.layout.embers = [];
  e.layout.boss = null;
  e.biomeDynamics.items = [];
  e.blackHoles.items = [];
  e.drafts.zones = [];
  e.flame = e.maxFlame * 0.35;
  return e;
}

function block(e, screenX) {
  return {
    id: 'test-cliff', x: screenX + e.distance, width: 64,
    center: e.player.y, gap: 60, phase: 0, motion: 0,
    bottomShape: [[0, 0], [64, 0], [64, e.height], [0, e.height]],
    sceneProps: []
  };
}

function spark(e, screenX) {
  return {
    id: 'test-spark', x: screenX + e.distance, y: e.player.y - 18,
    kind: 'cluster', value: 2, phase: 0, fuel: true
  };
}

const empty = room();
const occupied = room();
const nearby = empty.player.x + 46;
const far = empty.width - 90;
try {
  assert.ok(far < empty.width && far - empty.player.x > 3 * empty.getLightState().radius);
  occupied.layout.obstacles.push(block(occupied, far));
  occupied.layout.embers.push(spark(occupied, far));
  const occupiedView = observeFlight(occupied);
  const emptyView = observeFlight(empty);
  assert.deepEqual(occupiedView, emptyView,
    'An on-screen Spark and cliff outside the lit region must not change the observation');

  const plannerMemory = {human: humanProfile('human250')};
  assert.deepEqual(planHumanLift(occupiedView, null, plannerMemory), planHumanLift(emptyView, null, plannerMemory),
    'Identical visual input must produce the same tap decision');

  occupied.layout.embers[0].x = nearby + occupied.distance;
  assert.notDeepEqual(observeFlight(occupied), observeFlight(empty),
    'Moving only the Spark into lit space must change the observation');
  occupied.layout.embers[0].x = far + occupied.distance;
  occupied.layout.obstacles[0].x = nearby + occupied.distance;
  assert.notDeepEqual(observeFlight(occupied), observeFlight(empty),
    'Moving only the cliff into lit space must change the observation');
  // Seeing the front of a landform must not reveal the shape of its far end.
  const frontX = nearby + occupied.distance;
  const backX = far + occupied.distance;
  for (const e of [occupied, empty]) {
    const cliff = block(e, nearby);
    const width = backX - frontX;
    cliff.width = width;
    cliff.bottomShape = [[0, 0], [width - 12, 0], [width, 0], [width,e.height], [0,e.height]];
    e.layout.obstacles = [cliff];
    e.layout.embers = [];
  }
  occupied.layout.obstacles[0].bottomShape[2][1] = -150;
  assert.deepEqual(observeFlight(occupied), observeFlight(empty),
    'A visible cliff face must not disclose a changed edge hidden in the same polygon');

  // A route is unchanged while an acquired Luminance upgrade exposes a dim
  // Spark sooner; the controller may now plan for that newly visible pickup.
  empty.layout.obstacles = [];
  empty.layout.embers = [spark(empty, empty.player.x + 290)];
  empty._nearbyPacketsUntil = -1;
  assert.equal(observeFlight(empty).sparks.length, 0);
  const upgraded = getRunModifiers({companions:['collector'], skills:{'main-sight':1, 'main-horizon':1}});
  empty.mod.lightRadius = upgraded.lightRadius;
  assert.ok(observeFlight(empty).sparks.some(s => s.id === 'test-spark'),
    'Purchased Luminance must expose the same Spark earlier');

} finally {
  empty.destroy();
  occupied.destroy();
}
console.log('Hidden cliff and Spark yield identical observations. Each becomes distinguishable under Luminance. The real Light upgrades expose a distant Spark earlier.');

for (const style of ['human150', 'human250', 'human350']) {
  const profile = humanProfile(style);
  const state = {human: profile, random: () => .5, pending: null, lastLift: -2, inputSamples: 0};
  const now = 2;
  queueHumanLift(state, now, {delay: Infinity});
  assert.equal(state.pending, null, 'Coasting must never enqueue input');
  queueHumanLift(state, now, {delay: profile.reaction});
  assert.equal(state.pending, now + profile.reaction, 'Midpoint jitter must preserve profile delay');
  const pending = state.pending;
  queueHumanLift(state, now + 1/60, {delay: profile.reaction});
  assert.equal(state.pending, pending, 'Later observations cannot accelerate a committed tap');
  assert.equal(state.inputSamples, 1);
  for (const roll of [0, 1]) {
    const jittered = {...state, random: () => roll, pending: null};
    queueHumanLift(jittered, now, {delay: profile.reaction});
    assert.ok(jittered.pending >= now + profile.reaction - profile.jitter - 1e-8);
    assert.ok(jittered.pending <= now + profile.reaction + profile.jitter + 1e-8);
  }
}
console.log('All three reaction profiles respect lag and a committed tap cannot act early.');
