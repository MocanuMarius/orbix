import assert from 'node:assert/strict';
import { WispFlight, buildFlightLayout, circleHitsObstacle } from '../dist/flight.mjs';
import { EdgingPulse, obstacleEdgeClearance, EDGING_PULSE_TUNING, EDGING_REGEN_TUNING } from '../dist/edging-pulse.mjs';
import { GLOW_DISPLAY_SCALE } from '../dist/vitality.mjs';
import { edgingPulseMarkup, updateEdgingPulse } from '../dist/edging-ui.mjs';
import { observedFlightLesson, flightEffectLesson } from '../dist/tutorial-steps.mjs';
import { attachDream } from '../dist/dream.mjs';
import { lightVisibility, sceneRevealStrength } from '../dist/light-field.mjs';
import { BIOME_LEVELS } from '../dist/level-catalog.mjs';

globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
const dt = 1 / 60;
const context = new Proxy({}, { get: (o, k) => o[k] ?? (String(k).includes('Gradient')
  ? () => ({ addColorStop() {} }) : () => {}), set: (o, k, v) => (o[k] = v, true) });
const canvas = { style: {}, getContext: () => context, getBoundingClientRect: () => ({ width: 390, height: 620 }) };
const floor = () => ({ id: 'floor', x: 0, width: 10000, center: 300, gap: 0, phase: 0, motion: 0,
  bottomShape: [[-1000, 0], [10000, 0], [10000, 1000], [-1000, 1000]] });
function make(extra = {}) {
  const engine = new WispFlight({ canvas, seed: 'edging-pulse', duration: 102, flame: 100,
    companions: [], ...extra });
  engine.render = () => {}; engine.layout.obstacles = [floor()]; engine.layout.embers = [];
  engine.drafts.zones = []; engine.biomeDynamics.items = [];
  engine.challengeDirector.update = () => ({ state: null, darkness: 0 });
  engine.start(); return engine;
}
function frame(engine, y = 270) {
  // A controlled collision-free flight, cancelling only gravity so every
  // production step, lifecycle gate and pulse update still runs normally.
  engine.player.y = y; engine.player.vy = -300 * engine.scaleY * dt;
  engine.step(dt);
}
function frames(engine, count, y = 270) { for (let i = 0; i < count; i++) frame(engine, y); }
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, `${message}: ${a} != ${b}`);
const pulse = engine => engine.getState().edgingPulse;

// Exact geometry: an ordinary wall, a sloped face, sharp corners, a solid prop,
// vertical sway and resized Y all agree with the production collision test.
const geometry = { x: 100, width: 100, center: 300, gap: 100, phase: .7, motion: 19,
  topShape: [[-60, -300], [250, -300], [250, -40], [0, 0], [-60, -40]],
  bottomShape: [[-60, 300], [250, 300], [250, 30], [100, -5], [0, 0], [-60, 40]],
  sceneProps: [{ side: 1, parts: [{ polygon: [[110, -45], [125, -60], [145, 25], [105, 25]] }] }] };
let geometrySamples = 0;
for (const time of [0, .8, 2.4]) for (let x = 20; x <= 380; x += 13) for (let y = 180; y < 440; y += 11) {
  const clearance = obstacleEdgeClearance(x, y, 9.35, geometry, time);
  assert.equal(clearance <= 0, circleHitsObstacle(x, y, 9.35, geometry, time), `Geometry at ${x},${y},${time}`);
  geometrySamples++;
}
const propOnly = { x: 0, width: 100, center: 300, gap: 0, phase: 0, motion: 0,
  sceneProps: [{ side: 1, parts: [{ polygon: [[70, 0], [130, 0], [130, 80], [70, 80]] }] }] };
close(obstacleEdgeClearance(98, 270, 10, propOnly), 20, 'Solid prop body clearance');
propOnly.motion = 20; propOnly.phase = Math.PI / 2;
close(obstacleEdgeClearance(98, 270, 10, propOnly), 40, 'Prop follows actual sway');
propOnly.motion = 0;
for (const point of propOnly.sceneProps[0].parts[0].polygon) point[1] *= .5;
close(obstacleEdgeClearance(150, 320, 10, propOnly), 10, 'Cached X bounds preserve live resized geometry');
propOnly.destroyed = true;
assert.equal(obstacleEdgeClearance(98, 310, 10, propOnly), Infinity);

const e = make({ modifiers: { litLift: 1, workFuel: 8, overflowRecharge: .1, rechargeSight: 1.5 } });
const initialEconomy = [e.flame, e.condensedTotal, e.score, e.baseEmbers, e.flameRestored];
frames(e, 60); close(pulse(e).charge, .5, 'One second near an edge');
assert.equal(pulse(e).nearEdge, true);
frames(e, 60, 200); close(pulse(e).charge, .5, 'A brief gap retains charge without earning more');
assert.equal(pulse(e).nearEdge, false); assert.equal(pulse(e).holding, true);
frames(e, 75, 200); close(pulse(e).charge, .42, 'After 1.25s grace, open air drains 8% per second');
assert.equal(pulse(e).holding, false); assert.equal(e.edgingPulse.graceRemaining, 0);
frames(e, 70); assert.equal(pulse(e).active, true); assert.equal(pulse(e).charge, 0);
assert.equal(pulse(e).triggerCount, 1); assert.equal(pulse(e).duration, 5);
assert.deepEqual([e.flame, e.condensedTotal, e.score, e.baseEmbers, e.flameRestored], initialEconomy,
  'Trigger is sight only: no currency, fuel, score or pickup reward');
assert.equal(e.artifactEffects.freeLift, false); assert.equal(e.artifactEffects.workUntil, -Infinity);
assert.deepEqual(Object.values(e.artifactEffects.procCounts), [0, 0, 0, 0]);
const reveals = [];
for (let i = 0; i < 300; i++) {
  const before = pulse(e); reveals.push(before.strength);
  assert.equal(before.charge, 0, 'Active light cannot charge itself');
  assert.ok(before.strength >= 0 && before.strength <= 1);
  frame(e);
}
assert.equal(pulse(e).active, false); assert.equal(pulse(e).recovering, true);
assert.equal(e.getLightState().edgingReveal, 0); assert.equal(e.getLightState().pickupReveal, 0);
const peakValues = [], peakIndices = [];
for (let i = 1; i < reveals.length - 1; i++) if (reveals[i] > reveals[i - 1] && reveals[i] >= reveals[i + 1]) {
  peakValues.push(reveals[i]); peakIndices.push(i);
}
const peaks = peakValues.length;
assert.equal(peaks, 3, 'Three visible waves');
assert.ok(peakValues[0] > peakValues[1] && peakValues[1] > peakValues[2], 'Wave peaks fade over time');
for (let i = 1; i < peaks; i++) assert.ok(peakValues[i] - Math.min(...reveals.slice(peakIndices[i - 1], peakIndices[i])) > .04,
  'Valleys gently rebound into the next wave');
assert.ok(Math.max(...reveals.slice(1).map((value, i) => Math.abs(value - reveals[i]))) < .065, 'No sudden full-scene flash');
frames(e, 120); assert.equal(pulse(e).recovering, false); assert.equal(pulse(e).charge, 0);
frames(e, 120); assert.equal(pulse(e).triggerCount, 2, 'Charge restarts only after active and recovery intervals');

// Pausing freezes even direct simulation calls, including an active reveal.
frame(e); e.pause(); const paused = pulse(e), pausedTime = e.time;
e.step(dt); assert.deepEqual(pulse(e), paused); assert.equal(e.time, pausedTime);
e.resume(); frame(e); assert.ok(pulse(e).remaining < paused.remaining);
e.beginDying(); assert.equal(pulse(e).active, false); assert.equal(pulse(e).charge, 0);
const complete = make(); frames(complete, 120); complete.finish(true);
assert.equal(pulse(complete).active, false); assert.equal(complete.getLightState().edgingReveal, 0);

// A ready shield and Runner remain risky flight. Separation and invulnerability
// never contribute charge; an actual shield impact discards earned charge.
const shield = make({ companions: ['protector', 'swift'] });
frames(shield, 60); close(pulse(shield).charge, .5, 'Ready Protector can charge');
frames(shield, 15, 200); assert.equal(pulse(shield).holding, true);
shield.hit(shield.layout.obstacles[0]); assert.equal(shield.dying, false); assert.equal(pulse(shield).charge, 0);
assert.equal(shield.edgingPulse.graceRemaining, 0); assert.equal(pulse(shield).holding, false);
frame(shield); assert.equal(pulse(shield).charge, 0); assert.equal(pulse(shield).nearEdge, false);
for (const protect of [engine => { engine.shield.protection = .5; }, engine => { engine.invulnerable = true; }]) {
  const guarded = make({ companions: ['swift'] }); protect(guarded); frames(guarded, 10);
  assert.equal(pulse(guarded).charge, 0); guarded.destroy();
}
for(const windGuard of [engine=>{engine.fleet.find(item=>item.role==='swift').remaining=.5;engine.syncFleetTimers();},engine=>{engine.exitProtection=.5;}]){
  const runner=make({companions:['swift']});windGuard(runner);frames(runner,10);
  assert.ok(pulse(runner).charge>0,'Wind resistance cannot remove risk-earned charge');runner.destroy();
}

const boundary = make(); boundary.layout.obstacles = [];
frames(boundary, 60, 40); close(pulse(boundary).charge, 0, 'Open top edge never charges');
boundary.edgingPulse.reset(); frames(boundary, 60, boundary.height - 40);
close(pulse(boundary).charge, 0, 'Open bottom edge never charges');
boundary.edgingPulse.reset(); boundary.player.x = 1; frames(boundary, 60, 300);
assert.equal(pulse(boundary).charge, 0, 'Screen side and decorative backdrop never charge');
const propFlight = make(); propOnly.destroyed = false; propOnly.width = 10000;
propOnly.sceneProps[0].parts[0].polygon = [[-1000, 0], [10000, 0], [10000, 80], [-1000, 80]];
propFlight.layout.obstacles = [propOnly]; frames(propFlight, 60);
close(pulse(propFlight).charge, .5, 'Solid scene props charge without terrain');

// Normal flap arcs and uneven terrain need not remain in the skim zone on
// every frame. These short, irregular gaps preserve only earned edge time.
const interrupted = make();
for (const [nearFrames, gapFrames] of [[18, 36], [27, 27], [30, 45]]) {
  frames(interrupted, nearFrames, 250);
  const earned = pulse(interrupted).charge;
  assert.equal(pulse(interrupted).nearEdge, true, '41-world clearance is inside the widened band');
  frames(interrupted, gapFrames, 200);
  close(pulse(interrupted).charge, earned, 'Sub-second gaps do not erase an imperfect skim');
  assert.equal(pulse(interrupted).holding, true);
}
frames(interrupted, 45, 250);
assert.equal(pulse(interrupted).triggerCount, 1, 'Interrupted skims trigger from two seconds of real edge time');
const outside = make(); frames(outside, 180, 240);
assert.equal(pulse(outside).charge, 0, '51-world clearance earns no charge outside the band');
assert.equal(pulse(outside).triggerCount, 0); assert.equal(pulse(outside).holding, false);

const upgrades = make({ modifiers: { edgingChargeRate: 1.25, edgingDecayRate: .5, edgingDuration: 7, edgingRecovery: 1 } });
frames(upgrades, 60); close(pulse(upgrades).charge, .625, 'Charge upgrade');
frames(upgrades, 135, 200); close(pulse(upgrades).charge, .585, 'Decay upgrade loses 4% per second after grace');
upgrades.edgingPulse.reset(); frames(upgrades, 96);
assert.equal(pulse(upgrades).duration, 7); close(pulse(upgrades).remaining, 7, 'Upgraded lifetime');
frames(upgrades, 420); assert.equal(pulse(upgrades).recovering, true);
frames(upgrades, 60); assert.equal(pulse(upgrades).recovering, false);

const reduced = make(); reduced.reducedMotion = true; frames(reduced, 120);
frames(reduced, 27); let previous = pulse(reduced).strength;
for (let i = 0; i < 273; i++) { frame(reduced); const strength = pulse(reduced).strength;
  assert.ok(strength <= previous + 1e-8, 'Reduced motion fades steadily without waves'); previous = strength; }
assert.equal(previous, 0);

const isolated = make({ modifiers: { litLift: 1 } }); frames(isolated, 150);
assert.ok(isolated.getLightState().edgingReveal > 0);
isolated.collect({ id: 'natural-fuel', kind: 'light', x: isolated.distance + isolated.player.x, y: 270 });
assert.equal(isolated.artifactEffects.freeLift, true, 'Natural fuel in an Edging reveal intentionally grants Sunspool a free Lift');
assert.equal(isolated.artifactEffects.liftGrants, 1);
const visibility = isolated.getLightState();
close(lightVisibility(isolated, visibility, 380, 30), visibility.edgingReveal, 'Entire remote visible scene is lit');
assert.equal(sceneRevealStrength({ edgingReveal: .7, pickupReveal: .9 }), .9, 'Independent light does not stack');

// Regenerative Falling deliberately trades the reveal for bounded recovery.
// It never enters the pickup/overflow pipeline, even with synergy artifacts.
const regen = make({ flame: 20, modifiers: { edgingRegen: true, litLift: 1, workFuel: 8,
  overflowRecharge: .1, rechargeSight: 1.5 } });
const regenEconomy = [regen.condensedTotal, regen.score, regen.baseEmbers];
for (let i = 0; i < EDGING_REGEN_TUNING.grants; i++) {
  const before = regen.flame; frames(regen, 120);
  close((regen.flame - before) * GLOW_DISPLAY_SCALE, 1, 'One displayed Glow per earned meter');
  assert.equal(pulse(regen).regenGrants, i + 1); assert.equal(pulse(regen).mode, 'regen');
  assert.equal(pulse(regen).active, false); assert.equal(pulse(regen).strength, 0);
  assert.equal(pulse(regen).recovering, true); assert.equal(pulse(regen).regenFeedback, true);
  close(regen.edgingPulse.recoveryRemaining, 2, 'Fuel recovery resets for two seconds');
  if (i < EDGING_REGEN_TUNING.grants - 1) frames(regen, 120);
}
assert.equal(pulse(regen).exhausted, true); assert.equal(pulse(regen).grantsRemaining, 0);
const spentFuel = regen.flame; frames(regen, 300);
close(regen.flame, spentFuel, 'Spent branch grants nothing and never falls back to reveal');
assert.equal(pulse(regen).charge, 0); assert.equal(pulse(regen).strength, 0);
assert.deepEqual([regen.condensedTotal, regen.score, regen.baseEmbers], regenEconomy);
assert.equal(regen.artifactEffects.freeLift, false); assert.equal(regen.artifactEffects.workUntil, -Infinity);
assert.deepEqual(Object.values(regen.artifactEffects.procCounts), [0, 0, 0, 0]);
assert.equal(observedFlightLesson(regen.getState(), {}), 'flight-effect:regeneration');
assert.ok(flightEffectLesson('flight-effect:regeneration'));

const fullRegen = make({ modifiers: { edgingRegen: true } }); frames(fullRegen, 120);
assert.equal(pulse(fullRegen).regenGrants, 0, 'A full tank does not consume a recovery');
assert.equal(pulse(fullRegen).regenGain, 0); assert.equal(fullRegen.condensedTotal, 0);
frames(fullRegen, 120); fullRegen.flame = fullRegen.maxFlame - .5; frames(fullRegen, 120);
close(fullRegen.flame, fullRegen.maxFlame, 'Partial recovery clamps to missing fuel');
assert.equal(pulse(fullRegen).regenGrants, 1); close(pulse(fullRegen).regenGain, .5, 'Partial grant is exact');
assert.equal(fullRegen.condensedTotal, 0, 'Recovery never generates Packed Light');

const blockedRegen = make({ flame: 20, modifiers: { edgingRegen: true, dreamDuration: 8 } });
blockedRegen.invulnerable = true; frames(blockedRegen, 180);
assert.equal(pulse(blockedRegen).regenGrants, 0); assert.equal(pulse(blockedRegen).charge, 0);
blockedRegen.invulnerable = false; frames(blockedRegen, 60); blockedRegen.pause();
const blockedState = pulse(blockedRegen); frames(blockedRegen, 180);
assert.deepEqual(pulse(blockedRegen), blockedState, 'Paused recovery stays frozen');
blockedRegen.resume(); attachDream(blockedRegen); frames(blockedRegen, 180);
assert.equal(pulse(blockedRegen).regenGrants, 0); assert.equal(pulse(blockedRegen).charge, 0);
assert.equal(blockedRegen.flame, 20, 'Dream never grants fuel');

// The compact HUD uses a snapped cell height; labels are accessible, not clutter.
const meter = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
const fill = { style: {} }, gauge = { dataset: {}, hidden: true,
  querySelector(selector) { return selector.includes('-fill') ? fill : meter; } };
assert.ok(!edgingPulseMarkup().includes('edging-pulse-caption'));
updateEdgingPulse(gauge, { edgingPulse: { ...pulse(fullRegen), regenFeedback: false, recovering: false, charge: .5 } });
assert.equal(fill.style.height, '29px'); assert.equal(fill.style.transform, 'none');
assert.equal(gauge.dataset.edgingMode, 'regen'); assert.equal(meter.attributes['aria-label'], 'Regenerative Falling');
updateEdgingPulse(gauge, regen.getState());
assert.equal(gauge.dataset.pulseState, 'spent'); assert.match(meter.attributes['aria-valuetext'], /eight recoveries spent/);

// The rehearsal and replay both start with no banked charge, and remain equal
// through waking even when all opening flight stays within the edge band.
let ready;
const dreamOptions = { modifiers: { dreamDuration: 4 } };
const dreamReset = make(dreamOptions); frames(dreamReset, 30); frames(dreamReset, 15, 200);
assert.equal(pulse(dreamReset).holding, true);
attachDream(dreamReset); frame(dreamReset);
assert.equal(dreamReset.edgingPulse.graceRemaining, 0); assert.equal(pulse(dreamReset).holding, false);
assert.equal(dreamReset.edgingPulse.charge, 0, 'Entering Dream clears both earned charge and grace');
const record = make(dreamOptions); attachDream(record, { onReady: value => { ready = value; } });
frames(record, 240); assert.ok(ready?.valid); assert.equal(pulse(record).triggerCount, 0);
const replay = make(dreamOptions); attachDream(replay, { mode: 'replay', preset: ready.preset });
frames(replay, 240); assert.equal(replay.dream.phase, 'awakening');
assert.deepEqual(pulse(record), pulse(replay)); assert.equal(pulse(replay).charge, 0);
replay.step(dt); assert.equal(pulse(replay).charge, 0); replay.dream.resume(); frame(replay);
close(pulse(replay).charge, 1 / 120, 'Waking starts fresh charge');
const deterministicA = make({ flame: 20, modifiers: { edgingRegen: true } }), deterministicB = make({ flame: 20, modifiers: { edgingRegen: true } });
for (let i = 0; i < 1100; i++) {
  const y = i % 380 < 300 ? 270 : 200; frame(deterministicA, y); frame(deterministicB, y);
  assert.deepEqual(pulse(deterministicA), pulse(deterministicB), `Fixed-step determinism at ${i}`);
  assert.equal(deterministicA.flame, deterministicB.flame, `Deterministic fuel at ${i}`);
}

// The engine should not inspect distant polygon vertices in its steady loop.
const perf = make();
for (let i = 0; i < 2000; i++) perf.layout.obstacles.push({ x: 50000 + i * 500, width: 100,
  get topShape() { throw new Error('Distant geometry was inspected'); } });
const times = [];
for (let i = 0; i < 180; i++) { const start = performance.now(); frame(perf); if (i >= 20) times.push(performance.now() - start); }
times.sort((a, b) => a - b);
// Controller-only samples across every authored biome location at landscape
// width. Layout creation and nearby-list construction are outside the timer.
const geometryTimes = []; let maxNearby = 0, realCourseEdges = 0;
for (const level of BIOME_LEVELS) {
  const layout = buildFlightLayout({ seed: 'edging-courses', terrain: level.terrain,
    levelId: level.id, duration: 102, height: 430, lengthScale: 3, difficulty: 3 });
  const fixture = { layout, mod: {}, running: true, alive: true, height: 430, width: 956,
    _obstacleCursor: 0, time: 0, distance: 0, player: { x: 155, y: 215, radius: 9.35 },
    obstacleCenter: WispFlight.prototype.obstacleCenter };
  const controller = new EdgingPulse(fixture);
  for (let i = 0; i < 80; i++) {
    const obstacle = layout.obstacles[Math.floor(i * layout.obstacles.length / 80)];
    fixture.time = i * .17; fixture.distance = obstacle.x + obstacle.width * .6 - fixture.player.x;
    fixture.player.y = fixture.obstacleCenter(obstacle) + obstacle.gap / 2 - 25;
    const nearby = WispFlight.prototype.getNearbyObstacles.call(fixture);
    maxNearby = Math.max(maxNearby, nearby.length); controller.reset();
    const start = performance.now(); controller.update(dt, nearby); geometryTimes.push(performance.now() - start);
    if (controller.nearEdge) realCourseEdges++;
  }
}
geometryTimes.sort((a, b) => a - b);
assert.ok(realCourseEdges > 0, 'Benchmark includes actual close-flight terrain');
assert.ok(maxNearby < 30, 'Only bounded nearby geometry enters each controller update');
for (const engine of [e, complete, shield, boundary, propFlight, interrupted, outside, upgrades, reduced, isolated, regen, fullRegen, blockedRegen, dreamReset, record, replay, deterministicA, deterministicB, perf]) engine.destroy();
console.log(JSON.stringify({ geometrySamples, chargeSeconds: EDGING_PULSE_TUNING.chargeSeconds,
  duration: EDGING_PULSE_TUNING.duration, recovery: EDGING_PULSE_TUNING.recovery, gentlePeaks: peaks,
  geometryAndSway: true, lifecycleAndDream: true, economyIsolationAndArtifactSynergy: true, upgrades: true,
  widenedSkimBand: true, interruptedSkim: true, graceSeconds: EDGING_PULSE_TUNING.graceSeconds,
  decayPerSecond: EDGING_PULSE_TUNING.decayPerSecond,
  reducedMotion: true, fixedStepDeterminism: true, farGeometryUntouched: true, boundedRegen: true, compactHud: true,
  wholeStepP95ms: Number(times[Math.floor(times.length * .95)].toFixed(3)),
  authoredCourses: BIOME_LEVELS.length, controllerSamples: geometryTimes.length, maxNearby,
  controllerP95ms: Number(geometryTimes[Math.floor(geometryTimes.length * .95)].toFixed(3)) }));
