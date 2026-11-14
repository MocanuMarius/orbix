import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_PREVIEWS, buildBossLayout, getGuardianForMap} from '../dist/boss.mjs';
import {circleHitsObstacle, WispFlight} from '../dist/flight.mjs';
import {getFlightLengthProfile} from '../dist/level-length.mjs';

const dt = 1/120;

function flight(id, {speed = 1, role = 'collector', difficulty = 1, duration = 90} = {}) {
  const ctx = new Proxy({}, {get(object, key) {
    return object[key] ??= String(key).includes('Gradient') ? () => ({addColorStop() {}}) : () => {};
  }});
  const canvas = {style:{}, bounds:{width:900,height:405}, getContext:()=>ctx, getBoundingClientRect() { return this.bounds; }};
  const engine = new WispFlight({canvas, boss: true, bossId: id, duration, seed: 'guardian-contact',
    difficulty, row: 6, companions: [role], modifiers: {speed}});
  engine.render = () => {};
  // Remove unrelated rewards and zone hazards. Each test keeps real guardian geometry,
  // camera, fixed-step movement, protection and collision resolution.
  engine.layout.embers = [];
  engine.biomeDynamics.items = [];
  engine.blackHoles.items = [];
  engine.drafts.zones = engine.drafts.zones.filter(zone => zone.guardian);
  return engine;
}

function place(engine, worldX, y) {
  engine.distance = engine.previousDistance = worldX - engine.player.x;
  engine.player.y = engine.previousPlayerY = y;
  engine.player.vy = 0;
}

function stepAt(engine, worldX, y) {
  place(engine, worldX - engine.baseSpeed * dt, y);
  engine.step(dt);
}

test('guardian order is seeded and spans three different encounters', () => {
  for (let seed = 1; seed < 100; seed++) {
    const ids = [0, 1, 2].map(i => getGuardianForMap(seed, i).id);
    assert.equal(new Set(ids).size, 3);
    assert.deepEqual(ids, [0, 1, 2].map(i => getGuardianForMap(seed, i).id));
  }
  assert.equal(Object.keys(BOSS_PREVIEWS).length, 6);
});

test('each guardian fits its campaign length', () => {
  const bands = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const profile = getFlightLengthProfile({seed});
    bands.add(profile.lengthBand);
    const ranges = {short:[45,70], standard:[80,110], endurance:[120,150]};
    const [low, high] = ranges[profile.lengthBand];
    assert.ok(profile.duration >= low && profile.duration <= high);
  }
  assert.equal(bands.size, 3);
  assert.deepEqual([0, 1, 2].map(mapIndex => getFlightLengthProfile({boss:true,mapIndex}).duration), [90,120,150]);
});

for (const id of ['moonweaver','hollow-warden']) {
  test(`${id} solids hit on either side, its moving opening clears`, () => {
    for (const side of [-1, 1]) {
      for (const inside of [false, true]) {
        const e = flight(id);
        const o = e.layout.obstacles.find(o => o.motion && o.topShape && o.bottomShape);
        assert.ok(o);
        const t = Math.PI / 2;
        e.time = t - dt;
        const worldX = o.x + o.width * .65;
        const center = o.center + Math.sin(t * .9 + o.phase) * o.motion;
        const y = inside ? center + side * (o.gap / 2 + 12) : center;
        stepAt(e, worldX, y);
        assert.equal(e.dying, inside);
        assert.equal(o.hit, inside);
        e.destroy();
      }
    }
  });
}

test('a Rootbound gate turns an initially legal edge into a collision and preserves its center lane', () => {
  const survey = flight('rootbound-heart');
  const first = survey.layout.boss.attacks[0], x = first.x;
  let open = {gap:0}, shut = {gap:Infinity};
  for (let frame = 0; frame < 720; frame++) {
    stepAt(survey, x, first.center);
    const gap = first.obstacle.gap, t = survey.time;
    if (gap > open.gap) open = {gap,t};
    if (gap < shut.gap) shut = {gap,t};
  }
  assert.ok(open.gap - shut.gap > 12, 'a player can read and use the change');
  const obstacle = first.obstacle;
  const collides = (y, phase) => circleHitsObstacle(x, y, survey.player.radius,
    {...obstacle, gap:phase.gap}, phase.t);
  const edge = Array.from({length:Math.ceil(first.baseGap)}, (_, i) => first.center - first.baseGap/2 + i)
    .find(y => !collides(y, open) && collides(y, shut));
  assert.ok(Number.isFinite(edge));
  for (const [y,t,hit] of [[edge,open.t,false],[edge,shut.t,true],[first.center,shut.t,false]]) {
    const e = flight('rootbound-heart');
    e.time = t - dt;
    stepAt(e, x, y);
    assert.equal(e.dying, hit);
    e.destroy();
  }
  survey.destroy();
});


test('Hollow Sun drains Energy by distance, independently of terrain damage', () => {
  function measure(lane) {
    const e = flight('hollow-sun');
    const a = e.layout.boss.attacks[0];
    e.time = 2;
    stepAt(e, a.x - 8, a.center);
    const start = e.flame;
    for (let i = 0; i < 36; i++) {
      const y = lane === 'core' ? a.wellY : lane === 'other side' ? a.center - a.side * 36 : e.height/2;
      stepAt(e, lane === 'outside' ? a.x - 290 : a.x, y);
    }
    const loss = start - e.flame;
    assert.equal(e.collisions, 0);
    e.destroy();
    return loss;
  }
  const near = measure('core'), opposite = measure('other side'), distant = measure('outside');
  assert.ok(near > opposite * 2 && opposite > 0);
  assert.equal(distant, 0);
});

test('Frost shards warn, collide from the advertised side, leave an escape, and can be shielded', () => {
  for (const speed of [.8, 1, 1.25]) {
    const base = flight('frost-matron', {speed});
    const attacks = base.layout.boss.attacks;
    const sample = [...new Set([attacks[0].index, attacks.find(a => a.side !== attacks[0].side).index, attacks.at(-1).index])];
    base.destroy();
    for (const attackIndex of sample) {
      const observe = (lane, role='collector', initialEnergy=100, aegis=false) => {
        const e = flight('frost-matron', {speed,role});
        e.flame=initialEnergy;
        e.proximityShieldRemaining=aegis?3:0;
        const a = e.layout.boss.attacks[attackIndex];
        place(e, a.x - 235, a.center);
        let firstWarning, firstActive, crossY;
        while (e.distance + e.player.x < a.x + 26 && !e.dying) {
          const worldX = e.distance + e.player.x;
          const near = Math.abs(a.x - worldX) < 26;
          const safeY = a.center - a.side * a.baseGap * .24;
          e.player.y = near && lane !== null ? lane : safeY;
          e.player.vy = 0;
          e.step(dt);
          if (!a.iceActive && a.iceProgress === 0) firstWarning ??= e.time;
          if (a.iceActive) firstActive ??= e.time;
          if (Math.abs(a.x - (e.distance + e.player.x)) < e.baseSpeed * dt && a.iceActive) crossY = a.iceY;
        }
        const result = {crossY, firstWarning, firstActive, dying:e.dying, collisions:e.collisions,
          charges:e.shield.charges, remaining:e.flame, spent:a.spent, aegis:e.proximityShieldRemaining};
        e.destroy();
        return result;
      };
      const bypass = observe(null);
      assert.equal(bypass.collisions, 0, JSON.stringify({speed,attackIndex,bypass}));
      assert.ok(Number.isFinite(bypass.crossY), 'ice occupies a visible danger lane as the orb passes, including fast approaches');
      assert.ok(bypass.firstActive - bypass.firstWarning >= .4, 'the warning precedes the active shard');
      assert.equal(bypass.remaining,100);
      assert.equal(bypass.spent,false);
      for (const start of [100,9,0]) {
        const contact = observe(bypass.crossY,'collector',start);
        assert.equal(contact.dying,false);
        assert.equal(contact.spent,true);
        assert.equal(contact.collisions,1,'shards count once toward the clean-flight challenge');
        assert.equal(contact.remaining,Math.max(0,start-20),'one shard costs six displayed Energy, capped by the amount held');
      }
      const defended = observe(bypass.crossY, 'protector');
      assert.equal(defended.dying, false);
      assert.equal(defended.collisions, 1);
      assert.equal(defended.charges, 0);
      assert.equal(defended.remaining,88,'Protector pays its usual deflection cost');
      const aegis=observe(bypass.crossY,'collector',100,true);
      assert.equal(aegis.aegis,0);
      assert.equal(aegis.remaining,100);
      assert.equal(aegis.dying,false);
    }
  }
});


test('Storm columns move the wisp in both directions with a traversable bypass', () => {
  function crossing(speed, index, bypass, suppress, dash = false) {
    const e = flight('storm-shepherd',{speed,role:dash?'swift':'collector'});
    const a = e.layout.boss.attacks[index], z = a.stormZone;
    assert.ok(e.drafts.zones.includes(z));
    if (suppress) e.drafts.zones = [];
    place(e, z.x - z.rx * .55, bypass ? z.y + z.direction * (z.ry + 22) : z.y);
    if (dash) {
      e.fleet[0].remaining = 1;
      e.syncFleetTimers();
    }
    // Compare from the same altitude and velocity over the active half of a column.
    e.player.vy = -32;
    const startY = e.player.y;
    let experienced = false;
    while (e.distance + e.player.x < z.x + z.rx * .16) {
      e.step(dt);
      experienced ||= a.stormContact;
      assert.equal(e.dying, false, JSON.stringify({speed,index,bypass,suppress,dash}));
    }
    const result = {dy:e.player.y - startY, experienced, dir:z.direction, gustSeconds:e.gustSeconds};
    e.destroy();
    return result;
  }
  for (const speed of [1,1.25]) {
    const directions = [];
    for (const index of [0,1]) {
      const control = crossing(speed,index,false,true), gust = crossing(speed,index,false,false);
      const safe = crossing(speed,index,true,false), safeControl = crossing(speed,index,true,true);
      assert.ok(gust.experienced && gust.gustSeconds > .1);
      assert.ok((gust.dy - control.dy) * gust.dir > 8, 'the active lane changes the unaided path by at least a body radius');
      assert.equal(safe.experienced, false);
      assert.equal(safe.gustSeconds, 0);
      assert.equal(safe.dy, safeControl.dy);
      directions.push(gust.dir);
      const dash = crossing(speed,index,false,false,true), dashControl = crossing(speed,index,false,true,true);
      assert.ok(Math.abs(dash.dy-dashControl.dy) < Math.abs(gust.dy-control.dy) * .5);
    }
    assert.equal(directions[0], -directions[1]);
  }
});

test('changing orientation keeps guardian threats attached to the same part of the passage', () => {
  for (const id of ['frost-matron','storm-shepherd','rootbound-heart','hollow-sun']) {
    const e = flight(id), a = e.layout.boss.attacks[0], oldHeight = e.height;
    const old = {center:a.center,gap:a.baseGap,y:a.stormZone?.y??a.wellY??a.iceY??a.center};
    e.canvas.bounds = {width:412,height:915};
    e.resize();
    const factor = e.height / oldHeight;
    assert.ok(factor > 1.4);
    assert.equal(a.center, old.center*factor);
    assert.equal(a.center, a.obstacle.center);
    assert.equal(a.baseGap, old.gap*factor);
    assert.equal(a.stormZone?.y??a.wellY??a.iceY??a.center, old.y*factor);
    e.destroy();
  }
});

test('the early Moonweaver teaches both crescent lanes before their crests', () => {
  for (const difficulty of [1,2]) {
    const layout = buildBossLayout({bossId:'moonweaver',duration:90,height:430,difficulty});
    const pair = layout.obstacles.slice(0,2);
    const loom = layout.obstacles.find(o => o.bossPhase === 2 && o.motion > 0);
    assert.ok(pair[0].bottomShape && !pair[0].topShape);
    assert.ok(pair[1].topShape && !pair[1].bottomShape);
    for (const o of [...pair,loom]) {
      const spark = layout.embers.find(p => p.feature === 'silver-thread' && p.anchor === o.id);
      assert.ok(spark);
      assert.ok((o.x + o.width*.64 - spark.x) / 154 >= .5);
      for (const other of layout.obstacles) {
        for(const sway of [-1,1])assert.ok(!circleHitsObstacle(spark.x,spark.y,18,other,0,other.center+sway*other.motion));
      }
      assert.ok(Math.abs(spark.y - 215) < Math.abs(o.center - 215));
    }
  }
});
