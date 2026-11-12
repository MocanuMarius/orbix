import test from 'node:test';
import assert from 'node:assert/strict';
import { PhoenixMotion, deformWing, deformTail } from '../dist/phoenix-motion.mjs';

const engine = () => ({ lastFlapTime: -1000, boostTime: 0, player: { vy: 0 }, reducedMotion: false });

test('joint animation remains continuous through interrupted wingbeats, Boost and velocity changes', () => {
  const motion = new PhoenixMotion(), flight = engine(); let previous;
  for (let frame = 0; frame < 360; frame++) {
    const time = frame / 120;
    if ([12, 48, 115, 210].includes(frame)) { flight.lastFlapTime = time; flight.player.vy = -205; }
    else flight.player.vy = Math.min(200, flight.player.vy + 300 / 120);
    flight.boostTime = frame >= 150 && frame < 230 ? .5 : 0;
    const pose = motion.update(flight, time);
    if (previous) {
      assert.ok(Math.abs(pose.shoulder - previous.shoulder) < .13, 'no switched wing pose');
      assert.ok(Math.abs(pose.tail - previous.tail) < .05, 'a flap does not snap the tail');
    }
    assert.ok(Math.abs(pose.heave) < 1.2, 'visual body motion stays close to the collider');
    previous = pose;
  }
});

test('the same wingbeat sequence remains visually consistent at 30, 60 and 120 Hz', () => {
  const poses = [30, 60, 120].map(fps => {
    const motion = new PhoenixMotion(), flight = engine(); let pose;
    for (let frame = 0; frame <= fps * 2; frame++) {
      const time = frame / fps;
      if (frame === 0 || frame === fps / 2 || frame === fps * 1.5) flight.lastFlapTime = time;
      pose = motion.update(flight, time);
    }
    return pose;
  });
  for (const pose of poses) for (const joint of ['shoulder', 'farShoulder', 'elbow', 'wrist']) {
    assert.ok(Math.abs(pose[joint] - poses[2][joint]) < .065);
  }
});

test('mesh deformation pins the shoulder and tail root while feather tips move continuously', () => {
  const motion = new PhoenixMotion(), flight = engine(); flight.lastFlapTime = 0;
  const base = new Float32Array([0, 0, -20, -25, -50, -60, -65, -20]);
  const wing = new Float32Array(base.length), tail = new Float32Array(base.length);
  let initialTip;
  for (let frame = 0; frame < 180; frame++) {
    const pose = motion.update(flight, frame / 120);
    deformWing(base, wing, pose); deformTail(base, tail, pose);
    assert.equal(wing[0], 0); assert.equal(wing[1], 0);
    assert.equal(tail[0], 0); assert.equal(tail[1], 0);
    assert.ok([...wing, ...tail].every(Number.isFinite));
    if (frame === 0) initialTip = wing[5];
    if (frame === 50) assert.ok(Math.abs(wing[5] - initialTip) > 20, 'the wing bends through a real stroke');
  }
});

test('gliding has restrained feather flex and repainting at the same time does not advance animation', () => {
  const motion = new PhoenixMotion(), flight = engine(); flight.flame = 0;
  const samples = [];
  for (let frame = 0; frame < 240; frame++) samples.push(motion.update(flight, frame / 60).shoulder);
  assert.ok(Math.max(...samples) - Math.min(...samples) < .12);
  const a = motion.update(flight, 4), b = motion.update(flight, 4);
  assert.deepEqual(a, b);
});
