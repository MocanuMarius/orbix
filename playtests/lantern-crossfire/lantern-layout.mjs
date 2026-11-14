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

function mount(room, side, fraction, shift, scale, group) {
  const localX = room.width * fraction;
  const y = wallAt(room, side, localX);
  const depth = Math.abs(wallAt(room, -side, localX) - y) + 62 * scale;
  return {
    x: room.x + localX, y, side, depth, shift, spread: 284, pocket: 55 * scale,
    obstacleId: room.id, phase: room.bossPhase, group, crossfire: group === 'crossfire'
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
  const relay = lanterns.filter(s => s.group === 'relay');
  const crossfire = lanterns.filter(s => s.crossfire);
  if (relay.length && crossfire.length) {
    const finish = lanternRoute(crossfire, route);
    const first = relay[0];
    const across = route === 'near' ? .30 : .50;
    const y = first.y - first.side * first.depth * across;
    const approach = beamAtHeight(first, y);
    return {startX: first.warningX, y,
      focusX: (approach.left + approach.right) / 2, endX: finish.endX};
  }
  const roof = lanterns.find(s => s.side < 0);
  const floor = lanterns.find(s => s.side > 0);
  const tight = route === 'near';
  const source = tight && floor ? floor : roof;
  const fraction = floor ? .18 : tight ? .15 : .60;
  const y = source.y - source.side * source.depth * fraction;
  const lines = lanterns.map(s => beamAtHeight(s, y));
  const neck = beamAtHeight(source, y);
  const focusX = floor && !tight
    ? (Math.max(...lines.map(l => l.left)) + Math.min(...lines.map(l => l.right))) / 2
    : (neck.left + neck.right) / 2;
  const startX = Math.min(...lines.map(l => l.left)) - 65;
  const endX = Math.max(...lines.map(l => l.right)) + 18;
  return { startX, y, focusX, endX };
}

function encounterBounds(lanterns) {
  const edges = lanterns.map(s => beamAtHeight(s, s.y - s.side * s.depth));
  return {
    start: Math.min(...lanterns.map(s => s.x), ...edges.map(l => l.left)),
    end: Math.max(...lanterns.map(s => s.x), ...edges.map(l => l.right))
  };
}

function addLanterns(boss, lanterns, scale, previousOpen = -Infinity) {
  const {start,end} = encounterBounds(lanterns);
  const openX = Math.max(start - boss.speed * .8, previousOpen + boss.speed * .45);
  for (const lantern of lanterns) {
    lantern.warningX = openX - boss.speed * 2.3;
    lantern.openX = openX;
    boss.shutters.push(lantern);
  }
  boss.attacks = boss.attacks.filter(a => a.x < start - 170 * scale || a.x > end + 170 * scale);
  return openX;
}

export function installShutters(layout, height) {
  const boss = layout.boss;
  if (boss?.id !== 'hollow-sun') return;
  boss.shutters = [];
  const scale = height / 620;
  for (const phase of [2, 3]) {
    const phaseRooms = layout.obstacles.filter(o => o.bossPhase === phase);
    const rooms = phaseRooms.filter(o => o.cacheEligible && !o.motion && o.topShape && o.bottomShape);
    if (!rooms.length) continue;
    const room = rooms[Math.floor((rooms.length - 1) / 2)];
    if (phase === 2) {
      addLanterns(boss, [mount(room, -1, .64, 76, scale, 'single')], scale);
      continue;
    }
    const index = phaseRooms.indexOf(room);
    const lead = phaseRooms.slice(Math.max(0, index - 2), index);
    if (lead.length === 2 && lead.every(o => !o.guardianGate && o.topShape && o.bottomShape)) {
      // Bolt the four relay lanterns to fixed rock. Their necks alternate while
      // their wider ends touch. There is time to lift clear between chambers.
      for (const o of lead) o.motion = 0;
      let previousOpen = -Infinity;
      for (const [o, side, position, shift] of [
        [lead[0], -1, .26, 68], [lead[0], 1, .96, 175],
        [lead[1], -1, .19, -64], [lead[1], 1, .96, 32]
      ]) {
        previousOpen = addLanterns(boss, [mount(o, side, position, shift, scale, 'relay')], scale, previousOpen);
      }
    }
    addLanterns(boss, [
      mount(room, -1, .39, 396, scale, 'crossfire'), mount(room, 1, .15, 146, scale, 'crossfire')
    ], scale);
    // The triangle sits in the break before the last pair.
    layout.embers.push({id: 'crossfire-flash', kind: 'sight', value: 0, fuel: false,
      x: room.x - .70 * room.width, y: room.center + 50 * scale, phase: 0,
      feature: 'crossfire-flash', collected: false, attracted: false});
    layout.embers.sort((a,b) => a.x - b.x);
  }
}
