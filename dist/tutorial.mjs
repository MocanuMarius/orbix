// Practice is an authored flight using the same controls, fuel and colliders.
// This module contains guidance and lesson scenery; it never grants rewards.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function createTutorialState(node = {}) {
  if (!['glide', 'wind'].includes(node.tutorialLesson)) return null;
  return { lesson: node.tutorialLesson, directPickups: 0, carrierDeliveries: 0,
    firstDirectAt: null, firstDeliveryAt: null, glideSeconds: 0,
    sawWind: false, finishedWind: false };
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
    embers.push({ id: `practice-spark-${embers.length}`, x, y: y * height,
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
  }
  return { obstacles, embers };
}

export function recordTutorialPickup(engine, ember) {
  const state = engine.tutorial;
  if (!state || ember.generated) return;
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
  if (gust.active) state.sawWind = true;
  if (state.sawWind && !gust.active && !gust.warning) state.finishedWind = true;
}

export function updateTutorialCompanion(engine, dt) {
  // Follow the usual orbit without searching until the player has made a
  // direct pickup. The real item list and its collection state stay untouched.
  if (engine.tutorial?.lesson === 'glide' && !engine.tutorial.directPickups) {
    const view = Object.create(engine);
    view.layout = { embers: [] };
    engine.wisp.update(view, dt);
  } else engine.wisp.update(engine, dt);
}

export function getTutorialHint(engine) {
  const state = engine?.tutorial;
  if (!state) return null;
  const hint = (id, title, text, step) => ({ id, title, text, step, total: 4,
    waitingForLift: Boolean(engine.tutorialAwaitingLift) });
  if (engine.tutorialAwaitingLift) return hint('launch', 'Tap Lift to begin',
    'One thumb, two controls. LIFT sends your wisp upward; the world waits for your first tap.', 1);
  if (engine.flame < engine.flapCost * 2) return hint('low-glow', 'Find a gold spark',
    'Gliding costs no Glow. Touch a spark yourself, or let your carrier bring one back.', 2);
  if (state.lesson === 'glide') {
    if (!state.directPickups) {
      if (state.glideSeconds < 1) return hint('glide', 'Lift, then let go',
        'Each Lift spends Glow. Release it to glide toward the gold spark on the low shelf.', 2);
      return hint('direct', 'Touch the gold spark',
        'Move through a spark to refill Glow. Your carrier is waiting so you can try it yourself.', 2);
    }
    if (!state.carrierDeliveries) return hint('carrier', 'A companion lends a hand',
      engine.wisp.phase === 'returning' ? 'It is bringing a spark home. Glow arrives when the carrier returns.'
        : 'Your opposite spirit fetches one nearby spark automatically, then brings it back to you.', 3);
    if (engine.wisp.phase === 'cooldown') return hint('rest', 'Collect while it rests',
      'The carrier needs a short rest after each fetch. You can still touch sparks yourself.', 3);
    return hint('glide-ready', 'A little Glow goes a long way',
      'Lift only when you need height. Glide between sparks and fly into the gate.', 4);
  }
  const gust = engine.gustState();
  if (!engine.boosts) return hint('boost', gust.warning ? 'A gust is coming' : 'Try a protected Boost',
    gust.warning ? 'The arrows show its push. Tap BOOST to cut through the gust with protection.'
      : 'The smaller right-hand control gives a protected speed burst and resists the wind.', 2);
  if (gust.warning || gust.active) return hint('wind', gust.warning ? 'Read the wind warning' : 'Ride the wind',
    gust.direction > 0 ? 'The gust pushes down. Keep room above the rocks; Boost can help you cross.'
      : 'The gust slows your fall. Glide and leave room above your wisp.', 3);
  if (!state.finishedWind) return hint('watch-wind', 'Watch for the arrows',
    'The next warning shows the wind direction before it arrives. Save Boost for a useful moment.', 3);
  const recharge = clamp(engine.cooldown, 0, 99);
  return hint('ready', 'You choose the rhythm', recharge > .1
    ? 'Glide, collect and give Boost time to recover. The gate completes your practice.'
    : 'Boost is ready again. Use it when the path or the wind calls for it.', 4);
}
