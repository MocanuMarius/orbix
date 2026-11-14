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

const smooth = n => { const u=Math.max(0,Math.min(1,n)); return u*u*(3-2*u); };

// Move the actual exposed roof/floor vertices. Keep the coarse rock relief,
// plus the existing shoulders where this room meets the adjacent terrain.
function carvePassage(room, scale, throat, bend = false) {
  room.motion = 0;
  const originalGap = room.gap;
  for (const side of [-1,1]) {
    const face = side === -1 ? room.topShape : room.bottomShape;
    for (const point of face.slice(2)) {
      const fraction = point[0] / room.width;
      const weight = smooth((fraction + .70) / .72) * smooth((2.36 - fraction) / .56);
      const center = bend ? scale * (43 - 139 * smooth((fraction - .04) / 1.43)) : 0;
      const contour = center + side * (throat * scale - originalGap) / 2 + point[1] * .10;
      point[1] += weight * (contour - point[1]);
    }
  }
}

export function lanternPassageY(room, x) {
  const local = x - room.x;
  return (wallAt(room, -1, local) + wallAt(room, 1, local)) / 2;
}

function mount(room, side, fraction, shift, scale, group) {
  const localX = room.width * fraction;
  const y = wallAt(room, side, localX);
  const depth = Math.abs(wallAt(room, -side, localX) - y) + 62 * scale;
  return {
    x: room.x + localX, y, side, depth, shift, spread: 284, pocket: 55 * scale,
    obstacleId: room.id, room, phase: room.bossPhase, group, crossfire: group === 'crossfire'
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
  if (crossfire.length === 2) {
    const room = crossfire[0].room;
    const focusX = room.x + room.width * (route === 'near' ? .25 : .68);
    const y = lanternPassageY(room, focusX) + (route === 'near' ? room.gap * .04 : 0);
    const startX = room.x - room.width * 1.16;
    const startY = lanternPassageY(room, startX);
    return {startX, startY, y, focusX, endX: room.x + room.width * 2.4};
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
  if (boss.attacks) boss.attacks = boss.attacks.filter(a => a.x < start - 170 * scale || a.x > end + 170 * scale);
  return openX;
}

export function lanternField(layout) {
  return layout?.lanternEncounter ?? layout?.boss;
}

export function inLanternRoom(layout, x, radius = 0) {
  return !!layout?.lanternEncounter?.rooms.some(o =>
    x + radius > o.x - o.width - 110 && x - radius < o.x + o.width * 2.45 + 80);
}

// Build into the biome's real rock. A missing wall takes its partner's
// contour. Check the host plus adjacent rocks before committing the carve.
export function installPassageLanterns(layout, {height, speed, row, elite, hit}) {
  const {obstacles,sections,embers} = layout;
  if (obstacles.length < 3) return null;
  const scale = height / 620;
  const field = {rooms: [], shutters: [], scale, speed};
  const count = elite || row >= 5 ? 3 : row >= 2 ? 2 : 1;
  const targets = elite ? [.46,.55,.64] : count === 3 ? [.25,.54,.78] : count === 2 ? [.32,.69] : [.49];
  const first = obstacles[0].x, last = obstacles.at(-1).x;
  const authoredSections = new Set(sections.filter(s => s.authoredChallenge).map(s => s.id));
  for (const [index, fraction] of targets.entries()) {
    const target = first + (last - first) * fraction;
    const candidates = obstacles.slice(1,-1).filter(o => !o.soft && !o.reservedDraft &&
      field.rooms.every(other => Math.abs(o.x - other.x) >= (elite ? 610 : 960)));
    candidates.sort((a,b) => Number(authoredSections.has(a.sectionId)) - Number(authoredSections.has(b.sectionId))
      || Math.abs(a.x-target) - Math.abs(b.x-target));
    for (const source of candidates) {
      const room = {...source, motion: 0, sceneProps: []};
      for (const [key, other] of [['topShape','bottomShape'],['bottomShape','topShape']]) {
        room[key] = source[key]?.map(([x,y]) => [x,y]) ?? source[other].map(([x,y]) => [x,-y]);
      }
      const hardest = index === count - 1;
      const bend = hardest && (elite || row >= 3);
      const aperture = elite ? (hardest ? 160 : 184) : Math.max(176,230 - 5 * row - 8 * index);
      carvePassage(room, scale, aperture, bend);
      const nearby = obstacles.filter(o => o !== source && Math.abs(o.x-room.x)<1150);
      const clear = (x,y,r) => y>r+24 && y<height-r-24 && !hit(x,y,r,room,0) &&
        nearby.every(o => x+r<o.x-o.width || x-r>o.x+2.5*o.width || !hit(x,y,r+Math.abs(o.motion),o,0,o.center));
      let traversable = true;
      for(let x=room.x-room.width*.8;x<=room.x+room.width*2.4;x+=12){
        if (!clear(x,lanternPassageY(room,x),22)) {traversable=false; break;}
      }
      if (!traversable) continue;
      const flashX = room.x - room.width * .65, flashY = lanternPassageY(room,flashX);
      if (hardest && !clear(flashX, flashY, 25)) continue;
      Object.assign(source,room,{reservedLantern:true,hard:true});
      field.rooms.push(source);
      const pair = bend ? [mount(source,-1,.39,396,scale,'passage'), mount(source,1,.15,146,scale,'passage')]
        : [mount(source,-1,.40,148,scale,'passage'), mount(source,1,.96,-45,scale,'passage')];
      addLanterns(field,pair,scale);
      if (hardest) embers.push({id:'passage-flash',kind:'sight',value:0,fuel:false,x:flashX,y:flashY,
        phase:0,feature:'lantern-flash',collected:false,attracted:false});
      break;
    }
  }
  return field.rooms.length ? field : null;
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
      carvePassage(room, scale, 207);
      addLanterns(boss, [
        mount(room, -1, .45, 117, scale, 'single'), mount(room, 1, .90, -65, scale, 'intro-pair')
      ], scale);
      continue;
    }
    const index = phaseRooms.indexOf(room);
    const lead = phaseRooms.slice(Math.max(0, index - 2), index);
    if (lead.length === 2 && lead.every(o => !o.guardianGate && o.topShape && o.bottomShape)) {
      // Bolt the four relay lanterns to fixed rock. Their necks alternate while
      // their wider ends touch. There is time to lift clear between chambers.
      carvePassage(lead[0], scale, 182);
      carvePassage(lead[1], scale, 181);
      let previousOpen = -Infinity;
      for (const [o, side, position, shift] of [
        [lead[0], -1, .26, 150], [lead[0], 1, .96, -48],
        [lead[1], -1, .19, 168], [lead[1], 1, .96, -44]
      ]) {
        previousOpen = addLanterns(boss, [mount(o, side, position, shift, scale, 'relay')], scale, previousOpen);
      }
    }
    carvePassage(room, scale, 147, true);
    addLanterns(boss, [
      mount(room, -1, .39, 396, scale, 'crossfire'), mount(room, 1, .15, 146, scale, 'crossfire')
    ], scale);
    // The triangle sits in the break before the last pair.
    layout.embers.push({id: 'crossfire-flash', kind: 'sight', value: 0, fuel: false,
      x: room.x - .58 * room.width, y: room.center + 23 * scale, phase: 0,
      feature: 'crossfire-flash', collected: false, attracted: false});
    layout.embers.sort((a,b) => a.x - b.x);
  }
}
