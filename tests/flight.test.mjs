import test from 'node:test';
import assert from 'node:assert/strict';
import { PhoenixFlight, buildFlightLayout, FLIGHT_PATTERNS, obstaclePolygons, circleHitsPolygon, FLIGHT_TUNING, FLAME_TUNING } from '../dist/flight.mjs';

function makeFlight(options = {}) {
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get(target, property) {
    if (property in target) return target[property];
    return String(property).startsWith('create') ? () => gradient : () => {};
  } });
  const canvas = { width: 390, height: 620,
    getContext: () => context, getBoundingClientRect: () => ({ width: 390, height: 620 }) };
  return new PhoenixFlight({ canvas, seed: 'test', ...options });
}

test('wingbeats consume Flame; exhaustion preserves glide and a pickup enables flight again', () => {
  const flight = makeFlight({ flame: FLAME_TUNING.flapCost });
  flight.running = true;
  assert.equal(flight.flap(), true);
  assert.equal(flight.flame, 0);
  const velocity = flight.player.vy;
  assert.equal(flight.flap(), false);
  assert.equal(flight.player.vy, velocity, 'an exhausted tap cannot give free lift');
  flight.step(.1);
  assert.ok(flight.player.vy > velocity, 'gravity and forward movement continue while gliding');
  assert.equal(flight.hp, 3, 'exhaustion is separate from collision damage');
  const ember = { collected: false };
  flight.collect(ember);
  assert.equal(flight.flame, FLAME_TUNING.emberFuel);
  flight.collect(ember);
  assert.equal(flight.flame, FLAME_TUNING.emberFuel, 'one pickup cannot refuel twice');
  assert.equal(flight.flap(), true);
  assert.equal(flight.effortSpent, FLAME_TUNING.flapCost * 2);
  flight.paused = true;
  assert.equal(flight.flap(), false);
  assert.equal(flight.flame, FLAME_TUNING.emberFuel - FLAME_TUNING.flapCost);
  flight.destroy();
});

test('fuel values are capped, generated embers remain finite, and refuelling never heals collision hearts', () => {
  const flight = makeFlight({ hp: 1, flame: 0 });
  flight.collect({ value: 3 });
  assert.equal(flight.flame, FLAME_TUNING.heartFuel);
  flight.collect({ generated: true });
  assert.equal(flight.flame, FLAME_TUNING.heartFuel + FLAME_TUNING.generatedFuel);
  for (let i = 0; i < 10; i++) flight.collect({ value: 3 });
  assert.equal(flight.flame, FLAME_TUNING.maximum);
  assert.equal(flight.flameRestored, FLAME_TUNING.maximum);
  assert.equal(flight.hp, 1);
  flight.destroy();
});

test('each seeded terrain supplies sparse fuel before a depleted checkpoint reserve could run out', () => {
  for (const terrain of ['ruins', 'canopy', 'storm']) for (let seed = 0; seed < 24; seed++) {
    const layout = buildFlightLayout({ terrain, seed });
    const fuel = layout.embers.filter(e => e.fuel);
    assert.ok((fuel[0].x - 98) / 154 < 2.5, 'the first fuel has a forgiving approach');
    for (let i = 1; i < fuel.length; i++) {
      assert.ok((fuel[i].x - fuel[i - 1].x) / 154 < 5, 'no unannounced long fuel drought');
    }
    assert.ok(layout.embers.length < layout.obstacles.length * 1.7, 'sustenance still leaves air and scenery uncluttered');
  }
});

test('all twelve authored motifs generate deterministic, bounded playable openings', () => {
  assert.equal(Object.values(FLIGHT_PATTERNS).flat().length, 12);
  for (const terrain of ['ruins', 'canopy', 'storm']) {
    for (let seed = 0; seed < 40; seed++) {
      const input = { terrain, seed, elite: seed % 2 === 0, height: 620 };
      const first = buildFlightLayout(input), second = buildFlightLayout(input);
      assert.deepEqual(first, second);
      let previous = 310, previousX = 0;
      for (const obstacle of first.obstacles) {
        assert.ok(obstacle.center - obstacle.gap / 2 - obstacle.motion > 28);
        assert.ok(obstacle.center + obstacle.gap / 2 + obstacle.motion < 592);
        assert.ok(Math.abs(obstacle.center - previous) <= 620 * .115 + .001);
        assert.ok(obstacle.x - previousX > 175);
        previous = obstacle.center; previousX = obstacle.x;
      }
    }
  }
});

test('pickup card triggers are finite and reward multiplier applies exactly once', () => {
  const flight = makeFlight({ cards: ['kindled-spirit', 'warm-heart', 'golden-wake'],
    modifiers: { reward: 1.25 }, hp: 1 });
  flight.cooldown = 8; flight.boostTime = 1;
  for (let i = 0; i < 15; i++) flight.collect({ collected: false });
  assert.equal(flight.baseEmbers, 15);
  assert.equal(flight.cooldown, 3);
  assert.equal(flight.hp, 2);
  assert.equal(flight.score, 300);
  assert.equal(flight.embers, 18);
  for (let i = 0; i < 15; i++) flight.collect({ collected: false, generated: true });
  assert.equal(flight.baseEmbers, 15);
  assert.equal(flight.cooldown, 3);
  assert.equal(flight.hp, 2);
  assert.equal(flight.embers, 37);
  const alreadyCollected = { collected: true };
  flight.collect(alreadyCollected);
  assert.equal(flight.baseEmbers, 15);
  flight.destroy();
});

test('sparse terrain rewards stay near their scenery and clear of its full motion envelope', () => {
  for (const height of [480, 620, 844]) for (const terrain of ['ruins', 'canopy', 'storm']) {
    for (let seed = 0; seed < 12; seed++) {
      const layout = buildFlightLayout({ terrain, seed, height, elite: seed % 2 === 0 });
      assert.ok(layout.embers.length >= 12, 'enough pickups for the reduced card and challenge targets');
      assert.ok(layout.embers.length <= layout.obstacles.length * 1.2, 'at least two-thirds fewer pickups than old four-per-section trails');
      assert.ok(new Set(layout.embers.map(e => e.anchor)).size < layout.obstacles.length * .75,
        'scenery sections with no pickups create quiet stretches');
      let previousX = 0;
      for (const ember of layout.embers) {
        assert.ok(ember.x >= previousX, 'collection broad phase requires sorted pickups');
        previousX = ember.x;
        const anchor = layout.obstacles[ember.anchor];
        if (ember.feature !== 'approach') {
          assert.ok(Math.abs(ember.x - anchor.x) < anchor.width * 1.6);
          assert.ok(ember.feature.startsWith(terrain === 'ruins' ? 'arch-' : terrain === 'storm' ? 'spire-' : anchor.soft ? 'thorn-' : 'branch-'));
        }
        for (const obstacle of layout.obstacles) {
          if (Math.abs(obstacle.x - ember.x) > 300) continue;
          for (const sign of [-1, 0, 1]) {
            const extreme = { ...obstacle, motion: 0, center: obstacle.center + sign * obstacle.motion };
            for (const polygon of obstaclePolygons(extreme)) {
              assert.equal(circleHitsPolygon(ember.x, ember.y, 21, polygon), false,
                `${terrain} ${seed}: pickups leave room for the phoenix at either sway extreme`);
            }
          }
        }
      }
      const hearts = layout.embers.filter(e => e.value === 3);
      assert.ok(hearts.length >= 2);
      for (const heart of hearts) {
        const obstacle = layout.obstacles[heart.anchor];
        assert.ok(Math.abs(heart.y - obstacle.center) > (height < 620 ? 25 : 35),
          'valuable rewards sit off centre; compact passages preserve clearance');
      }
    }
  }
});

test('pickup pull-in is visible before scoring, pays once, and its effect expires', () => {
  const flight = makeFlight();
  const ember = { id: 'nearby', x: flight.player.x + 10, y: flight.player.y, value: 3, phase: 0 };
  flight.layout = { obstacles: [], embers: [ember] };
  flight.step(1 / 60);
  assert.equal(ember.attracted, true);
  assert.equal(flight.embers, 0, 'the pull-in has time to animate');
  for (let i = 0; i < 20; i++) flight.step(1 / 60);
  assert.equal(flight.embers, 3);
  assert.equal(flight.pickupEffects.length, 1);
  assert.equal(flight.pickupEffects[0].value, 3);
  for (let i = 0; i < 50; i++) flight.step(1 / 60);
  assert.equal(flight.embers, 3);
  assert.equal(flight.pickupEffects.length, 0);
  flight.destroy();
});

test('the wisp reach shrinks after collection, recovers smoothly, and matches Boost and upgrades', () => {
  const flight = makeFlight({ cards: ['hungry-wisp'], modifiers: { attract: 1.25 } });
  const full = flight.getWispState().radius;
  assert.equal(full, 43.75);
  flight.collect({ value: 1 });
  const spent = flight.getWispState().radius;
  assert.ok(spent < full * .6);
  flight.step(.2);
  assert.ok(flight.getWispState().radius > spent && flight.getWispState().radius < full);
  for (let i = 0; i < 40; i++) flight.step(1 / 60);
  assert.equal(flight.getWispState().radius, full);
  flight.boostTime = 1;
  for (let i = 0; i < 15; i++) flight.step(1 / 60);
  assert.equal(flight.getWispState().radius, full * 1.6);
  flight.destroy();
});

test('heart embers pay three but count once toward pickup cards and cannot be claimed twice', () => {
  const flight = makeFlight({ cards: ['kindled-spirit', 'warm-heart', 'golden-wake'], hp: 1 });
  flight.cooldown = 8; flight.boostTime = 1;
  for (let i = 0; i < 5; i++) {
    const heart = { value: 3, collected: false };
    flight.collect(heart); flight.collect(heart);
  }
  assert.equal(flight.embers, 15);
  assert.equal(flight.baseEmbers, 5);
  assert.equal(flight.cooldown, 7);
  assert.equal(flight.hp, 1, 'currency value does not multiply healing triggers');
  assert.equal(flight.score, 300, 'Golden Wake doubles the heart score once');
  flight.destroy();
});

test('rebirth is consumed once and final result cannot pay twice', () => {
  const payouts = [];
  const flight = makeFlight({ hp: 1, rebirthAvailable: true,
    modifiers: { rebirth: true, rebirthHp: 2 }, onFinish: result => payouts.push(result) });
  flight.hit(null);
  assert.equal(flight.rebirthUsed, true);
  assert.equal(flight.hp, 2);
  flight.invincible = 0; flight.hit(null);
  flight.invincible = 0; flight.hit(null);
  assert.equal(payouts.length, 1);
  assert.equal(payouts[0].success, false);
  flight.finish(true);
  assert.equal(payouts.length, 1);
  flight.destroy();
});

test('the map challenge is the exact challenge awarded by flight', () => {
  const clean = makeFlight({ challengeId: 'clean' });
  assert.equal(clean.challengeComplete(), true);
  clean.collisions = 1; assert.equal(clean.challengeComplete(), false);
  const wisps = makeFlight({ challengeId: 'wisps', challengeTarget: 19 });
  wisps.baseEmbers = 18; assert.equal(wisps.challengeComplete(), false);
  wisps.baseEmbers = 19; assert.equal(wisps.challengeComplete(), true);
  const boosts = makeFlight({ challengeId: 'boosts', challengeTarget: 2 });
  boosts.boosts = 1; assert.equal(boosts.challengeComplete(), false);
  boosts.boosts = 2; assert.equal(boosts.challengeComplete(), true);
  clean.destroy(); wisps.destroy(); boosts.destroy();
});

test('shield absorbs damage and protected boost exits inside the opening', () => {
  const flight = makeFlight({ shield: 1 });
  flight.hit(null);
  assert.equal(flight.hp, 3); assert.equal(flight.shield, 0);
  const obstacle = flight.layout.obstacles[0];
  flight.distance = obstacle.x + obstacle.width * .45 - flight.player.x;
  flight.player.y = obstacle.center - obstacle.gap / 2 - 45; flight.player.vy = 0;
  flight.invincible = 0; flight.boostTime = .001;
  flight.step(1 / 60);
  const center = flight.obstacleCenter(obstacle);
  assert.ok(flight.player.y >= center - obstacle.gap / 2 + 19);
  assert.ok(flight.player.y <= center + obstacle.gap / 2 - 19);
  assert.equal(flight.hp, 3);
  flight.destroy();
});

test('floating scenery uses polygon collisions rather than invisible vertical bars', () => {
  for (const terrain of ['ruins', 'canopy', 'storm']) {
    const layout = buildFlightLayout({ terrain, seed: 'scenery' });
    for (const obstacle of layout.obstacles) {
      for (const time of [0, 2, 5]) {
        const center = obstacle.center + Math.sin(time * .9 + obstacle.phase) * obstacle.motion;
        for (const polygon of obstaclePolygons(obstacle, time)) {
          assert.ok(polygon.length >= 10);
          const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1]);
          assert.ok(Math.max(...ys) - Math.min(...ys) < 145, 'terrain chunks have finite visible outer edges');
          assert.ok(Math.max(...xs) - Math.min(...xs) > 135, 'scenery is broad terrain, not a narrow pipe');
          assert.equal(circleHitsPolygon(obstacle.x + obstacle.width * .5, center, 13, polygon), false);
          const x = xs.reduce((a, b) => a + b, 0) / xs.length;
          const y = ys.reduce((a, b) => a + b, 0) / ys.length;
          assert.equal(circleHitsPolygon(x, y, 1, polygon), true);
          assert.equal(circleHitsPolygon(x, Math.min(...ys) - 20, 5, polygon), false,
            'space beyond the floating silhouette is genuinely traversable');
        }
      }
    }
  }
});

test('faster flight retains spaced approaches and a clear exit portal corridor', () => {
  const flight = makeFlight();
  assert.equal(flight.baseSpeed, 154);
  const obstacles = flight.layout.obstacles;
  for (let i = 1; i < obstacles.length; i++) {
    assert.ok((obstacles[i].x - obstacles[i - 1].x) / flight.baseSpeed > 1.8);
  }
  const latestGeometry = Math.max(...obstacles.flatMap(o => obstaclePolygons(o, 0).flatMap(p => p.map(v => v[0]))));
  assert.ok(latestGeometry < (flight.duration - 2.8) * flight.baseSpeed + flight.player.x);
  flight.time = flight.duration - 2.5;
  assert.ok(flight.getExitPortal().x > flight.width);
  flight.time = flight.duration;
  assert.equal(flight.getExitPortal().x, flight.player.x);
  assert.equal(flight.getExitPortal().y, flight.player.y);
  flight.destroy();
});

test('pause preserves ability and progression timers', () => {
  const flight = makeFlight();
  flight.running = true; flight.cooldown = 4; flight.boostTime = .6;
  flight.pause();
  assert.equal(flight.getState().paused, true);
  assert.equal(flight.cooldown, 4); assert.equal(flight.boostTime, .6); assert.equal(flight.time, 0);
  flight.destroy();
});

test('gliding requires substantially fewer taps while preserving forward pace', () => {
  const flight = makeFlight();
  flight.running = true;
  const startingY = flight.player.y;
  assert.equal(FLIGHT_TUNING.gravity, 300);
  assert.equal(flight.baseSpeed, 154);
  flight.flap();
  assert.equal(flight.player.vy, -205);
  let highestY = startingY, returnTime = 0;
  for (let frame = 0; frame < 100; frame++) {
    flight.step(1 / 60);
    highestY = Math.min(highestY, flight.player.y);
    if (frame > 5 && flight.player.y >= startingY) { returnTime = flight.time; break; }
  }
  assert.ok(startingY - highestY >= 66 && startingY - highestY <= 73);
  assert.ok(returnTime >= 1.30 && returnTime <= 1.40,
    `a glide should return to altitude about every1.37sec, got${returnTime}`);
  assert.equal(flight.collisions, 0);
  assert.ok(flight.trail.length <= 72 && flight.trail.length > 30);
  assert.ok(flight.particles.length <= 150);
  assert.ok(flight.particles.some(p => p.type === 'spark' && p.length > p.size * 3));
  flight.destroy();
});
