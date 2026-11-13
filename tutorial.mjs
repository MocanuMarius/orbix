import {getCompanionAbility} from './companion-abilities.mjs?v=balance-health-1';
// Practice is an authored flight using the same controls, fuel and colliders.
// This module contains guidance and lesson scenery; it never grants rewards.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const collects = engine => engine.hasCompanion?.('collector') ?? getCompanionAbility(engine.companionRole).collects;

export function createTutorialState(node = {}) {
  if (!['glide', 'wind'].includes(node.tutorialLesson)) return null;
  return { lesson: node.tutorialLesson, directPickups: 0, carrierDeliveries: 0,
    firstDirectAt: null, firstDeliveryAt: null, glideSeconds: 0,
    sawWind: false, sawWindWarning: false, windRevealed: false, finishedWind: false,
    avoidedWind: false, sawCooldown: false, toolObserved: false,
    darkSeen: false, darkAvoided: false, darkCollected: false, darkCleared: false };
}

function landform(width, scale, ceiling, variant) {
  const xs = [-.8, -.45, -.1, .23, .55, .9, 1.25, 1.65, 2.05, 2.45];
  const depths = ceiling
    ? [84, 62, 36, 18, 12, 19, 32, 45, 65, 88]
    : variant % 2 ? [78, 52, 30, 17, 13, 20, 28, 43, 66, 88]
      : [76, 49, 27, 14, 18, 26, 36, 52, 69, 88];
  const edge = [], sign = ceiling ? -1 : 1;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < 6; j++) {
    const t = j / 6, smooth = t * t * (3 - 2 * t);
    edge.push([(xs[i] + (xs[i + 1] - xs[i]) * t) * width,
      sign * (depths[i] + (depths[i + 1] - depths[i]) * smooth) * scale]);
  }
  edge.push([xs.at(-1) * width, sign * depths.at(-1) * scale]);
  return [[xs[0] * width, sign * 1000 * scale], [xs.at(-1) * width, sign * 1000 * scale], ...edge.reverse()];
}

export function buildTutorialLayout({ lesson, duration, height, speed = 154 }) {
  const scale = height / 620, obstacles = [], embers = [];
  const lastSolid = duration * speed - speed * 2.8;
  for (let x = 390, index = 0; x + 170 * 2.45 + 35 < lastSolid; x += 300, index++) {
    const width = 170, firstShelf = lesson === 'glide' && index === 0;
    const gap = height * (firstShelf ? .36 : lesson === 'wind' ? .64 : .58);
    obstacles.push({ id: `practice-${index}`, x, width,
      center: height * (.5 + Math.sin(index * 1.2) * .022), gap,
      phase: 0, motion: 0, pattern: 'practice-terraces', variation: index % 4,
      landmark: lesson === 'wind' ? 'wind-saddle' : 'moon-terrace',
      soft: false, destroyed: false, hit: false, passed: false,
      topShape: !firstShelf && index % 3 === 2 ? landform(width, scale, true, index) : null,
      bottomShape: landform(width, scale, false, index) });
  }
  const add = (x, y, feature) => {
    if (x > duration * speed - speed * 3.2) return;
    embers.push({ id: `practice-spark-${embers.length}`, kind: 'light', x, y: y * height,
      value: 1, fuel: true, feature, collected: false, attracted: false,
      phase: embers.length * 1.6, tutorialSpark: true });
  };
  if (lesson === 'glide') {
    // One initial Lift followed by a glide naturally approaches this low shelf.
    // The companion waits, so the first refill is visibly the player's action.
    add(370, .675, 'practice-direct');
    add(680, .53, 'practice-carrier');
    add(1110, .61, 'practice-refill');
    add(1550, .52, 'practice-refill');
    add(2010, .60, 'practice-refill');
    add(2470, .51, 'practice-refill');
  } else {
    add(440, .54, 'practice-wind');
    add(870, .58, 'practice-wind');
    add(1310, .48, 'practice-wind');
    add(1750, .60, 'practice-wind');
    add(2210, .51, 'practice-wind');
    add(2670, .59, 'practice-wind');
    add(3110, .50, 'practice-wind');
    // A single optional black packet sits high in the broad open room after
    // the puff. The central route stays clear; the following light can cleanse.
    if (2380 < duration * speed - speed * 3.2) embers.push({
      id: 'practice-dark', kind: 'dark', harmful: true, value: 0, fuel: false,
      x: 2380, y: height * .30, feature: 'practice-dark', tutorialDark: true,
      collected: false, attracted: false, phase: 3.1 });
  }
  // Extra quiet flying time has fuel along the open central route.
  const tailStart=lesson==='glide'?2910:3550;
  for(let x=tailStart,index=0;x<duration*speed-speed*3.2;x+=440,index++)
    add(x,index%2?.55:.50,'practice-refill');
  embers.sort((a, b) => a.x - b.x);
  return { obstacles, embers };
}

export function recordTutorialPickup(engine, ember) {
  const state = engine.tutorial;
  if (!state || ember.generated || ember.harmful || ember.kind === 'dark') return;
  if (ember.deliveredByWisp) {
    state.carrierDeliveries++;
    if (state.firstDeliveryAt === null) state.firstDeliveryAt = engine.time;
  } else {
    state.directPickups++;
    if (state.firstDirectAt === null) state.firstDirectAt = engine.time;
  }
}

export function updateTutorial(engine, dt, gust) {
  const state = engine.tutorial;
  if (!state) return;
  if (engine.time - engine.lastFlapTime > .2) state.glideSeconds += dt;
  if (engine.wisp.phase === 'cooldown') state.sawCooldown = true;
  const ability = getCompanionAbility(engine.companionRole || engine.options?.companionRole);
  state.toolObserved ||= engine.hasActiveCompanions ? engine.boosts > 0 : engine.isCompanionWorking?.() === true;
  const puffs = engine.getDraftPuffs?.() || [];
  if (puffs.length) state.windRevealed = true;
  if (gust.warning || puffs.some(puff => puff.phase === 'gather')) state.sawWindWarning = true;
  if (gust.active) state.sawWind = true;
  if (state.windRevealed && !puffs.length && !gust.active && !gust.warning) {
    state.finishedWind = true;
    state.avoidedWind = !state.sawWind;
  }
  const dark = engine.layout.embers.find(packet => packet.tutorialDark);
  if (dark) {
    const x = dark.x - engine.distance;
    if (x > 18 && x < engine.width - 18) state.darkSeen = true;
    if (dark.collected) state.darkCollected = true;
    else if (x < engine.player.x - 18) state.darkAvoided = true;
    if (state.darkCollected && !engine.lightPenalties?.length) state.darkCleared = true;
  }
}

export function updateTutorialCompanion(engine, dt) {
  // Follow the usual orbit without searching until the player has made a
  // direct pickup. The real item list and its collection state stay untouched.
  if (collects(engine)
    && engine.tutorial?.lesson === 'glide' && !engine.tutorial.directPickups) {
    const view = Object.create(engine);
    view.layout = { ...engine.layout, embers: [] };
    view.getNearbyPickups = () => [];
    engine.wisp.update(view, dt);
  } else engine.wisp.update(engine, dt);
}

export function getTutorialHint(engine) {
  const state=engine?.tutorial;if(!state)return null;
  const collector=collects(engine),active=engine.hasActiveCompanions;
  const hint=(id,title,text,step)=>({id,title,text,step,total:4,waitingForLift:Boolean(engine.tutorialAwaitingLift),
    worldFocus:getTutorialWorldFocus(engine),observed:{directPickups:state.directPickups,carrierDeliveries:state.carrierDeliveries,
      carrierRest:state.sawCooldown,tool:state.toolObserved,draft:state.finishedWind,darkAvoided:state.darkAvoided,darkCleared:state.darkCleared}});
  if(engine.tutorialAwaitingLift)return hint('launch','Tap Lift to begin','LIFT spends Glow. Stay clear of solid scenery and screen edges.',1);
  if(engine.dying)return hint('last-spark','The light scatters','Solid scenery and screen edges end an unprotected attempt.',2);
  if(engine.flame<engine.flapCost*2)return hint('low-glow','Find a fuel light','Without enough Glow you cannot Lift, but you can still collect fuel while falling. Collector keeps searching.',2);
  const exit=engine.getExitLandmark?.();
  if(exit&&exit.x<engine.width-18)return hint('exit','Reach the refuge light','Fly to the waylight while keeping enough Glow for your last Lift.',4);
  if(state.lesson==='glide'){
    if(!state.directPickups)return hint('direct','Lift, then glide into a packet',collector
      ?'Touch this light yourself for immediate Glow. Collector waits for your first pickup.'
      :'Touch this light yourself for immediate Glow. Only an equipped Collector fetches misses.',2);
    if(collector&&!state.carrierDeliveries)return hint('carrier','Collector rescues a miss',engine.wisp.phase==='returning'
      ?'The packet pays when Collector returns. Its boundary then shrinks and grows back.'
      :'Your body gets first chance. A missed packet must remain inside the shaped aura to be rescued.',3);
    if(collector&&engine.wisp.phase==='cooldown')return hint('rest','Collector is recovering','Its boundary grows back. Missed packets inside the smaller range can still be rescued.',3);
    return hint('glide-ready','Small lifts, long glides',active
      ?'POWER activates every ready active companion. A second tap releases an active Leveler; Lift also releases it.'
      :'Collector fetches, Protector can spend Glow on a shell, and Kindler rewards direct fuel pickups. Equipped passives work automatically.',4);
  }
  const gust=engine.gustState();
  const dark=engine.layout.embers.find(packet=>packet.tutorialDark),darkX=dark?dark.x-engine.distance:Infinity;
  if(dark&&!dark.collected&&darkX>engine.player.x-18&&darkX<engine.width-18)return hint('dark-packet','Avoid the dark seed',
    'Black seeds dim sight. Collector ignores them; only an upgraded, ready Kindler can purify one.',4);
  if(state.darkCollected&&!state.darkCleared)return hint('dark-recovery','Restore your light','A natural fuel light clears one dimming effect and refills Glow.',4);
  if(gust.warning||gust.active)return hint('wind',gust.warning?'Read the direction':'Inside the draft puff',
    'Curls point in the push direction. Fly outside their edge, or use a ready Swift. Leveler still bobs and can be nudged.',3);
  if(active&&!state.toolObserved&&engine.time<6)return hint('power','One Power control',
    'POWER starts all ready Swift, Leveler and Seer companions together. Tap again to release Leveler; Lift also releases it.',2);
  if(!state.finishedWind)return hint('watch-wind','Watch for the local draft','Only the visible puff pushes you. Its warning gives you time to choose above or below.',3);
  return hint('ready','Keep fuel for the waylight','Glide, collect deliberately, and reach the refuge. MENU pauses whenever you need it.',4);
}

/** A semantic focus over a real visible world object; reading it never pauses or advances play. */
export function getTutorialWorldFocus(engine, seenIds = null) {
  const state = engine?.tutorial;
  if (!state || engine.tutorialAwaitingLift || engine.finished || engine.dying) return null;
  const width = engine.width || 390, height = engine.height || 620;
  const sight = Math.max(60, (engine.getLightState?.().radius || 175) * .82);
  const visible = (x, y) => Number.isFinite(x) && Number.isFinite(y)
    && x >= 18 && x <= width - 18 && y >= 18 && y <= height - 18
    && Math.hypot((x-engine.player.x)*(x>engine.player.x?.5:1),y-engine.player.y) <= sight;
  const focus = (id, title, text, x, y, radius) => visible(x, y)
    ? { id, title, text, x, y, radius: Math.min(radius, x - 4, width - x - 4, y - 4, height - y - 4) } : null;
  const candidates = [];
  const hasCollector = collects(engine);
  const packets = (engine.layout?.embers || []).filter(packet => !packet.collected && !packet.carried)
    .map(packet => ({ packet, x: packet.x - engine.distance }))
    .filter(({ packet, x }) => visible(x, packet.y) && x >= engine.player.x - 18);
  const dark = packets.find(({ packet }) => packet.harmful || packet.kind === 'dark');
  if (dark) candidates.push(focus('dark-packet', 'Dark packet',
    'Avoid this black packet: it dims your light. A light packet clears one effect.', dark.x, dark.packet.y, 20));
  const light = packets.filter(({ packet }) => !packet.harmful && packet.kind !== 'dark')
    .sort((a, b) => Math.abs(a.x - engine.player.x) - Math.abs(b.x - engine.player.x))[0];
  if (light) candidates.push(focus('light-packet', 'Light packet = Glow fuel',
    hasCollector ? 'Touch this bright packet to refill Glow. Collector only rescues packets you have already passed.'
      : 'Touch this bright packet yourself to refill Glow. Your selected companion does not fetch.', light.x, light.packet.y, 20));
  for (const puff of engine.getDraftPuffs?.() || []) candidates.push(focus('draft', 'Local draft puff',
    'Only these curls push you. Fly above or below their boundary.',
    puff.x - engine.distance, puff.y, Math.min(puff.rx, puff.ry, 48)));
  const carrier = engine.getWispState?.();
  if (carrier?.phase === 'returning' && carrier.carrying) candidates.push(focus('carrier-return', 'Carrier delivery',
    'The packet refills Glow when your carrier gets home.', carrier.x, carrier.y, 21));
  if (carrier?.phase === 'cooldown' && state.carrierDeliveries > 0) candidates.push(focus('carrier-rest', 'Carrier recovery',
    'Its boundary shrinks after delivery, then grows. Nearby rescues still work; touching packets yourself is immediate.', carrier.x, carrier.y, 21));
  const exit = engine.getExitLandmark?.();
  if (exit) candidates.push(focus('exit', 'Refuge light', 'Fly to this waylight to finish the passage.', exit.x, exit.y, 25));
  const seen = id => seenIds?.has?.(id) === true || Array.isArray(seenIds) && seenIds.includes(id);
  return candidates.find(candidate => candidate && !seen(candidate.id)) || null;
}
