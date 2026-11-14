function wallAt(room, side, localX) {
  const shape = side < 0 ? room.topShape : room.bottomShape;
  for (let i = 3; i < shape.length; i++) {
    const [ax, ay] = shape[i - 1], [bx, by] = shape[i];
    if (localX >= bx && localX <= ax) {
      return room.center + side * room.gap / 2 + ay + (by - ay) * (localX - ax) / (bx - ax);
    }
  }
  return room.center + side * room.gap / 2;
}

function mount(room, side, fraction, shift, scale, crossfire) {
  const localX = room.width * fraction;
  const y = wallAt(room, side, localX);
  const depth = Math.abs(wallAt(room, -side, localX) - y) + 62 * scale;
  return {
    x: room.x + localX, y, side, depth, shift, spread: 284, pocket: 55 * scale,
    obstacleId: room.id, phase: room.bossPhase, crossfire
  };
}

function beamAtHeight(lantern, y) {
  const across = (lantern.y - y) * lantern.side / lantern.depth;
  return {
    left: lantern.x + (lantern.shift - lantern.spread) * across,
    right: lantern.x + (lantern.shift + lantern.spread) * across
  };
}

// Each route follows the actual faces of the two cones as the playfield resizes.
export function lanternRoute(lanterns, route) {
  const roof = lanterns.find(s => s.side < 0);
  const floor = lanterns.find(s => s.side > 0);
  const tight = route === 'near';
  const source = tight && floor ? floor : roof;
  const y = source.y - source.side * source.depth * (tight ? .15 : floor ? .18 : .60);
  const lines = lanterns.map(s => beamAtHeight(s, y));
  const neck = beamAtHeight(source, y);
  const focusX = floor && !tight
    ? (Math.max(...lines.map(l => l.left)) + Math.min(...lines.map(l => l.right))) / 2
    : (neck.left + neck.right) / 2;
  const startX = Math.min(...lines.map(l => l.left)) - 65;
  const endX = Math.max(...lines.map(l => l.right)) + 25;
  return { startX, y, focusX, endX };
}

function encounterBounds(lanterns) {
  const top = Math.min(...lanterns.map(s => s.side < 0 ? s.y : s.y - s.depth));
  const bottom = Math.max(...lanterns.map(s => s.side > 0 ? s.y : s.y + s.depth));
  const edges = lanterns.map(s => beamAtHeight(s, s.side < 0 ? bottom : top));
  return {
    start: Math.min(...lanterns.map(s => s.x), ...edges.map(l => l.left)),
    end: Math.max(...lanterns.map(s => s.x), ...edges.map(l => l.right))
  };
}

export function installShutters(layout, height) {
  const boss = layout.boss;
  if (boss?.id !== 'hollow-sun') return;
  boss.shutters = [];
  const scale = height / 620;
  for (const phase of [2, 3]) {
    const rooms = layout.obstacles.filter(o => o.bossPhase === phase && o.cacheEligible && !o.motion && o.topShape && o.bottomShape);
    if (!rooms.length) continue;
    const room = rooms[Math.floor((rooms.length - 1) / 2)];
    const lanterns = phase === 2 ? [mount(room, -1, .64, 76, scale, false)]
      : [mount(room, -1, .39, 396, scale, true), mount(room, 1, .15, 146, scale, true)];
    const {start, end} = encounterBounds(lanterns);
    for (const lantern of lanterns) {
      lantern.warningX = start - boss.speed * 3.1;
      lantern.openX = start - boss.speed * .8;
      boss.shutters.push(lantern);
    }
    // The crossfire is a sight challenge. Wells resume after the landing.
    boss.attacks = boss.attacks.filter(a => a.x < start - 170 * scale || a.x > end + 170 * scale);
    if (phase === 3) {
      layout.embers.push({id: 'crossfire-flash', kind: 'sight', value: 0, fuel: false,
        x: start - boss.speed * .85, y: room.center - 24 * scale, phase: 0,
        feature: 'crossfire-flash', collected: false, attracted: false});
      layout.embers.sort((a,b) => a.x - b.x);
    }
  }
}
