/** Seeded, DOM-free campaign model. Public commands mutate their run/profile and return booleans. */
import { FLAME_TUNING } from './vitality.mjs';
import { WISP_TUNING } from './wisp.mjs';
export const SAVE_KEY = 'emberwing.save.v1';
export const TERRAINS = Object.freeze({
  ruins: { id: 'ruins', name: 'Sunken Ruins', color: '#e8b36b', description: 'Ancient arches, sweeping gates, and golden spark trails.' },
  canopy: { id: 'canopy', name: 'Luminous Canopy', color: '#87e9b3', description: 'Living branches frame winding trails of forest light.' },
  storm: { id: 'storm', name: 'Stormglass Peaks', color: '#c0b3ff', description: 'Watch the gathering wind and ride between crystal spires.' },
});

const card = (id, name, tag, description, detail, color, icon) => ({ id, name, tag, description, detail, color, icon });
export const CARDS = Object.freeze({
  'hungry-wisp': card('hungry-wisp', 'Hungry Wisp', 'Wisp', 'Boosting sends your wisp searching farther.', 'Your companion searches 60% farther for the closest ember during a boost, then fetches it and returns. Pair with Kindled Spirit to keep the flame moving.', '#8ce5c4', '✧'),
  'kindled-spirit': card('kindled-spirit', 'Kindled Spirit', 'Wisp', 'Every three collected sparks quicken your next boost.', 'Every three base embers collected reduce the boost cooldown by one second. Bonus rewards never trigger this again.', '#f8c778', '✦'),
  'golden-wake': card('golden-wake', 'Golden Wake', 'Wisp', 'Collecting during boost doubles the pickup score.', 'Boosted spark pickups grant +100% score. This changes score, not permanent ember currency.', '#ffdc81', '◈'),
  'storm-feeder': card('storm-feeder', 'Storm Feeder', 'Flame', 'Turn the mountain wind into boost energy.', 'Boost cooldown is 4% shorter everywhere. In gusts, recover another second of cooldown once each second.', '#b3c6ff', 'ϟ'),
  'soft-descent': card('soft-descent', 'Soft Descent', 'Drift', 'Fall gently and guide smaller lift pulses.', 'Gravity is 10% lighter and lift pulses are 6% gentler. A steady choice for precise passages.', '#a5dce9', '⌄'),
  'high-wing': card('high-wing', 'Rising Spirit', 'Drift', 'Climb higher and travel faster.', 'Lift pulses are 10% stronger and travel is 5% faster. Favor deliberate taps and high spark trails.', '#e9b7ff', '⌃'),
  tailwind: card('tailwind', 'Tailwind', 'Drift', 'Fly faster for a richer ember trail.', 'Travel is 8% faster and earned ember rewards are 12% greater. The wisp needs quicker decisions.', '#facb9b', '»'),
  'ash-ward': card('ash-ward', 'Ash Ward', 'Ash', 'Begin each flight protected by a circle of ash.', 'A ward absorbs one hit each flight, while boost recharges 12% more slowly. Checkpoint wards remain separate.', '#d4c5ec', '◇'),
  'glass-phoenix': card('glass-phoenix', 'Glass Wisp', 'Ash', 'A fragile body, a brilliant reward.', 'Maximum health becomes two hearts; earned ember rewards increase by 25%. Replacing this card restores capacity, not health.', '#a9e7fa', '♢'),
  'steady-flame': card('steady-flame', 'Steady Flame', 'Drift', 'Keep your course through difficult currents.', 'Wind has less influence, and gravity is 3% lighter. A calm choice for the Stormglass Peaks.', '#d3d6f3', '≈'),
  'fire-wake': card('fire-wake', 'Shatter Wake', 'Flame', 'Shatter soft thorns into a trail of bonus sparks.', 'Boost lasts 8% longer. Each soft thorn shattered during a boost releases three collectible bonus motes.', '#ff9d77', '♨'),
  'warm-heart': card('warm-heart', 'Warm Heart', 'Ash', 'A well-timed cache route can mend a wounded heart.', 'Collect four base sparks in a flight to heal one heart, once per flight. Bonus sparks cannot retrigger it.', '#f2a6ba', '♡'),
});

const skill = (id, name, branch, cost, requires, description, maxRank = 1) => ({ id, name, branch, cost, requires, maxRank, description });
export const SKILLS = Object.freeze({
  'wisp-light': skill('wisp-light', 'Inner Glow', 'Wisp', 60, null, 'Illuminate 35 more units of terrain per rank. See paths and pickups farther ahead.', 3),
  'wisp-reach': skill('wisp-reach', 'Wisp Reach', 'Wisp', 80, null, 'Each rank expands your companion’s ember search range by 25%, up to 75% farther.', 3),
  'wisp-recovery': skill('wisp-recovery', 'Wisp Recovery', 'Wisp', 90, null, 'Each rank shortens the wait after your wisp returns by 15% of the base cooldown.', 3),
  'wisp-bounty': skill('wisp-bounty', 'Wisp Bounty', 'Wisp', 160, 'wisp-reach', 'Earn 10% more embers from flight pickups.'),
  'boost-focus': skill('boost-focus', 'Focused Flame', 'Boost', 80, null, 'Boost cooldown becomes 10% shorter.'),
  'boost-flare': skill('boost-flare', 'Lasting Flame', 'Boost', 160, 'boost-focus', 'Boost lasts 15% longer.'),
  'rebirth-spark': skill('rebirth-spark', 'Rebirth Spark', 'Rebirth', 120, null, 'Unlock one rebirth per run, returning with one heart.'),
  'rebirth-grace': skill('rebirth-grace', 'Rebirth Grace', 'Rebirth', 200, 'rebirth-spark', 'Your single rebirth returns two hearts.'),
});

const PHASES = new Set(['starter', 'map', 'briefing', 'support', 'reward', 'ended']);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const count = (n, limit = 1e9) => Math.floor(clamp(finite(n), 0, limit));
const copy = value => JSON.parse(JSON.stringify(value));
const skillRank = (skills, id) => count(skills?.[id], Object.hasOwn(SKILLS, id) ? SKILLS[id].maxRank : 0);
const freshSeed = () => globalThis.crypto?.getRandomValues
  ? Array.from(globalThis.crypto.getRandomValues(new Uint32Array(2)), n => n.toString(36)).join('-')
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
function randomFor(seed) {
  let value = 2166136261;
  for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function newState() {
  return {
    version: 1,
    profile: { embers: 0, skills: {}, stats: { completedRuns: 0, wins: 0, totalScore: 0, bestScore: 0 }, bankedRuns: [] },
    run: null,
    settings: { sound: true, reducedMotion: false, element: 'fire' },
  };
}

function cleanProfile(value) {
  const profile = newState().profile;
  profile.embers = count(value?.embers);
  for (const id of Object.keys(SKILLS)) {
    const rank = skillRank(value?.skills, id);
    if (rank) profile.skills[id] = rank;
  }
  // A damaged/edited save cannot activate the second skill without the first.
  for (const item of Object.values(SKILLS)) if (item.requires && !profile.skills[item.requires]) delete profile.skills[item.id];
  for (const key of Object.keys(profile.stats)) profile.stats[key] = count(value?.stats?.[key]);
  profile.stats.wins = Math.min(profile.stats.wins, profile.stats.completedRuns);
  profile.bankedRuns = Array.isArray(value?.bankedRuns) ? [...new Set(value.bankedRuns.filter(v => typeof v === 'string'))].slice(-128) : [];
  return profile;
}

function validRun(run) {
  if (!run || typeof run !== 'object' || typeof run.id !== 'string' || typeof run.seed !== 'string') return false;
  if (!PHASES.has(run.phase) || !Number.isInteger(run.step) || run.step < 0 || run.step > 7) return false;
  if (run.step === 7 && run.phase !== 'ended') return false;
  if (!Array.isArray(run.map) || run.map.length !== 7 || run.map.some((row, i) => !Array.isArray(row) || row.length < 1 || row.length > 3 || row.some(node => !node || node.row !== i || typeof node.id !== 'string' || !Object.hasOwn(TERRAINS, node.terrain) || !['flight', 'support', 'finale'].includes(node.type) || !Number.isFinite(node.bonusEmbers) || !Number.isFinite(node.challengeBonus)))) return false;
  const nodes = run.map.flat();
  if (new Set(nodes.map(node => node.id)).size !== nodes.length) return false;
  if (run.startNodeIds !== undefined && (!Array.isArray(run.startNodeIds) || run.startNodeIds.length !== 2 || new Set(run.startNodeIds).size !== 2 || run.startNodeIds.some(id => !run.map[0].some(node => node.id === id)))) return false;
  // Legacy saves have no adjacency. Keep those routes intact instead of rerolling an active expedition.
  for (const node of nodes) if (node.nextIds !== undefined) {
    if (!Array.isArray(node.nextIds) || node.nextIds.length > 2 || new Set(node.nextIds).size !== node.nextIds.length) return false;
    if (node.row < 6 && !node.nextIds.length) return false;
    if (node.nextIds.some(id => !run.map[node.row + 1]?.some(next => next.id === id))) return false;
  }
  if (!Array.isArray(run.path) || run.path.length > 7 || !Array.isArray(run.cards) || run.cards.length > 3 || new Set(run.cards).size !== run.cards.length || run.cards.some(id => !Object.hasOwn(CARDS, id))) return false;
  if (!Array.isArray(run.offers) || run.offers.some(id => !Object.hasOwn(CARDS, id)) || new Set(run.offers).size !== run.offers.length) return false;
  if (!Number.isFinite(run.hp) || !Number.isFinite(run.embers) || !Number.isFinite(run.score)) return false;
  if (['briefing', 'support', 'reward'].includes(run.phase) && (!run.current || !run.map[run.step]?.some(node => node.id === run.current.id))) return false;
  if (run.phase === 'support' && (!Array.isArray(run.supportChoices) || run.supportChoices.length !== 2)) return false;
  if (['starter', 'reward'].includes(run.phase) && run.offers.length !== 2) return false;
  return true;
}

/** localStorage.setItem atomically replaces the single versioned save document. */
export function saveState(state, storage) {
  try {
    storage ??= globalThis.localStorage;
    if (!storage?.setItem || state?.version !== 1) return false;
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function loadState(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage?.getItem?.(SAVE_KEY);
    if (!raw) return newState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return newState();
    const state = newState();
    state.profile = cleanProfile(parsed.profile);
    state.settings = { sound: parsed.settings?.sound !== false, reducedMotion: parsed.settings?.reducedMotion === true,
      element: parsed.settings?.element === 'ice' ? 'ice' : 'fire' };
    if (validRun(parsed.run)) {
      state.run = parsed.run;
      state.run.element = parsed.run.element === 'ice' ? 'ice' : 'fire';
      for (const node of [...state.run.map.flat(), ...(state.run.current ? [state.run.current] : [])]) {
        if (node.draftTags) node.draftTags = node.draftTags.map(tag => tag === 'Wing' ? 'Drift' : tag);
        if (node.draftTheme) node.draftTheme = node.draftTheme.replace(/Wing/g, 'Drift');
        if (node.name) node.name = node.name.replace(/Phoenix Gate/g, 'Hollow Gate');
        if (node.challenge) node.challenge = node.challenge.replace(/wisps/g, 'sparks');
        if (state.run.fuelRevision !== 2 && node.type !== 'support' && ROUTE_PROFILES[node.routeStyle]) {
          const profile = ROUTE_PROFILES[node.routeStyle];
          node.fuelBonus = node.type === 'finale' ? 1 : profile.fuelBonus;
          node.fuelPreview = profile.fuelPreview;
          node.riskPreview = profile.riskPreview;
          if (node.challengeId === 'wisps') {
            node.challengeTarget = 4 + Math.floor(node.row / 2);
            node.challenge = `Collect ${node.challengeTarget} sparks`;
          }
        }
      }
      state.run.fuelRevision = 2;
      state.run.skills = cleanProfile({ skills: parsed.run.skills }).skills;
      state.run.hp = clamp(state.run.hp, 0, getModifiers(state.run.cards, state.run.skills).maxHp);
      state.run.flame = clamp(Number.isFinite(state.run.flame) ? state.run.flame : FLAME_TUNING.maximum, 0, FLAME_TUNING.maximum);
      state.run.maxHp = getModifiers(state.run.cards, state.run.skills).maxHp;
      state.run.embers = count(state.run.embers);
      state.run.score = count(state.run.score);
      state.run.shield = count(state.run.shield, 2);
      state.run.usedRebirth = state.run.usedRebirth === true;
      state.run.stats = { collected: 0, collisions: 0, boosts: 0, flights: 0, elites: 0, challenges: 0, events: 0, ...(state.run.stats || {}) };
    }
    return state;
  } catch { return newState(); }
}

const EVENT_NAMES = ['Ash Spring', 'Cinder Bargain', 'Abandoned Lantern', 'Weathered Shrine', 'Luminous Well', 'The Ember Archive'];
export const ROUTE_PROFILES = Object.freeze({
  refuge: { routeStyle: 'refuge', passage: 'open', fuelCadence: 2, fuelBonus: 2, flameDrain: 0.92, routeReward: 1, durationScale: 1, draftTags: ['Wisp', 'Ash'], fuelPreview: 'Measured caches · +2 Glow per spark', riskPreview: 'Open passages · deliberate edge pickups' },
  cavern: { routeStyle: 'cavern', passage: 'cavern', fuelCadence: 3, fuelBonus: 0, flameDrain: 1.08, routeReward: 1.25, durationScale: 0.80, draftTags: ['Drift', 'Wisp'], fuelPreview: 'Spaced fuel · conserve your lift pulses', riskPreview: 'Short cave route · tighter roof and floor' },
  gauntlet: { routeStyle: 'gauntlet', passage: 'gauntlet', fuelCadence: 4, fuelBonus: 1, flameDrain: 1, routeReward: 1.45, durationScale: 0.90, draftTags: ['Flame', 'Drift'], fuelPreview: 'Lean caches · time Boost between sparks', riskPreview: 'Elite passages · richest ember rewards' },
});

function makeMap(seed) {
  const rng = randomFor(`${seed}|map`);
  const terrains = shuffled(Object.keys(TERRAINS), rng);
  const events = shuffled(Array.from({ length: EVENT_NAMES.length }, (_, i) => i), rng);
  const rows = Array.from({ length: 7 }, (_, row) => (row === 0 ? [0, 1] : row === 6 ? [1] : [0, 1, 2]).map(lane => {
    const terrain = terrains[(Math.floor(row / 2) + lane) % terrains.length];
    const support = row === 1 || row === 4;
    const finale = row === 6;
    const routeStyle = lane === 0 ? 'refuge' : lane === 1 ? 'cavern' : 'gauntlet';
    const profile = ROUTE_PROFILES[routeStyle];
    const elite = !support && !finale && lane === 2;
    const kind = support ? lane === 0 ? 'camp' : lane === 2 ? 'shrine' : 'event' : finale ? 'finale' : elite ? 'elite' : 'normal';
    const eventIndex = events[row === 1 ? 0 : 1];
    const draftTags = support ? [] : [...profile.draftTags];
    const draftTheme = draftTags.join(' + ');
    const challengeId = routeStyle === 'refuge' ? 'wisps' : routeStyle === 'cavern' ? 'clean' : 'boosts';
    const challengeTarget = challengeId === 'wisps' ? 4 + Math.floor(row / 2) : challengeId === 'boosts' ? 2 : 0;
    const challenge = challengeId === 'wisps' ? `Collect ${challengeTarget} sparks` : challengeId === 'boosts' ? 'Boost twice' : 'Finish without a hit';
    const routeName = { refuge: 'Ember Refuge', cavern: 'Crystal Cavern', gauntlet: 'Flame Gauntlet' }[routeStyle];
    const baseDuration = row === 0 ? 34 : 38 + row * 2;
    const bonusEmbers = support ? 0 : finale ? 35 : routeStyle === 'refuge' ? 10 : elite ? 26 : 18;
    return {
      id: `n-${row}-${['a', 'b', 'c'][lane]}`, row, lane, nextIds: [],
      type: support ? 'support' : finale ? 'finale' : 'flight', kind, terrain, elite, draftTags, draftTheme,
      routeStyle, passage: profile.passage, fuelCadence: finale ? 3 : profile.fuelCadence,
      fuelBonus: finale ? 1 : profile.fuelBonus, flameDrain: finale ? 1 : profile.flameDrain,
      routeReward: finale ? 1.25 : profile.routeReward,
      fuelPreview: support ? lane === 0 ? 'Full Flame refill available' : lane === 2 ? 'Fuel or a new card' : 'Preview the event before committing' : finale ? 'Balanced fuel · final ascent' : profile.fuelPreview,
      riskPreview: support ? lane === 0 ? 'Recover before the next fork' : lane === 2 ? 'Build strength or secure your reserve' : 'A resource trade or fresh opportunity' : finale ? 'The routes converge at the summit' : profile.riskPreview,
      name: support ? lane === 0 ? 'Emberwell Camp' : lane === 2 ? 'Flamekeeper Shrine' : EVENT_NAMES[eventIndex] : finale ? `${TERRAINS[terrain].name} · Ascension` : `${routeName} · ${TERRAINS[terrain].name}`,
      description: support ? lane === 0 ? 'Restore health and refill Flame, or gather embers. This fork keeps the refuge and cavern routes open.' : lane === 2 ? 'A Flamekeeper offers fuel or new inspiration. The next fork leads toward refuge or an elite passage.' : 'A branching encounter opens the cavern and elite routes. Preview the trade before choosing.' : finale ? `${TERRAINS[terrain].description} Conserve enough Flame for the last climb.` : `${TERRAINS[terrain].description} ${profile.riskPreview}. ${profile.fuelPreview}.`,
      duration: support ? 0 : finale ? 55 : Math.round(baseDuration * profile.durationScale),
      eventIndex: support && lane === 1 ? eventIndex : null,
      challenge: support ? '' : challenge,
      challengeId: support ? '' : challengeId,
      challengeTarget: support ? 0 : challengeTarget,
      challengeBonus: support ? 0 : 8,
      bonusEmbers,
      reward: support ? lane === 0 ? 'Full refill or 18 embers + 22 Flame' : lane === 2 ? '40 Flame + 10 embers or a card draft' : 'A choice of boons and bargains' : finale ? '35 embers · complete the journey' : `${bonusEmbers} embers · ${draftTheme} card draft · ${Math.round((profile.routeReward - 1) * 100)}% extra pickup rewards`,
    };
  }));
  for (let row = 0; row < rows.length - 1; row++) for (const node of rows[row]) {
    const next = rows[row + 1];
    const lanes = node.lane === 0 ? [0, 1] : node.lane === 1 ? [1, 2] : [0, 2];
    node.nextIds = next.length === 1 ? [next[0].id] : lanes.map(lane => next.find(item => item.lane === lane).id);
  }
  return rows;
}

function draft(run, label) {
  let available = Object.keys(CARDS).filter(id => !run.cards.includes(id));
  if (label === 'flight-reward' && run.current?.draftTags?.length) {
    const themed = available.filter(id => run.current.draftTags.includes(CARDS[id].tag));
    if (themed.length >= 2) available = themed;
  }
  return shuffled(available, randomFor(`${run.seed}|${label}|${run.step}|${run.path.join('.')}`)).slice(0, 2);
}

export function createRun(profile = newState().profile, seed = freshSeed()) {
  const normalizedSeed = String(seed).trim().slice(0, 80) || 'emberwing';
  const skills = cleanProfile({ skills: profile?.skills }).skills;
  const run = {
    id: `${normalizedSeed}-${freshSeed()}`, seed: normalizedSeed, step: 0, map: makeMap(normalizedSeed), path: [], current: null,
    cards: [], skills, element: 'fire', hp: 3, maxHp: 3, flame: FLAME_TUNING.starting, shield: 0, embers: 0, score: 0, usedRebirth: false,
    offers: [], phase: 'starter', success: false, banked: false, supportChoices: [], fuelRevision: 2,
    stats: { collected: 0, collisions: 0, boosts: 0, flights: 0, elites: 0, challenges: 0, events: 0 },
  };
  run.mapVersion = 2;
  run.startNodeIds = run.map[0].map(node => node.id);
  run.offers = draft(run, 'starter');
  return run;
}

export function getChoices(run) {
  if (!run || run.phase !== 'map' || run.step > 6) return [];
  const completed = run.path.map(id => run.map.flat().find(node => node.id === id)).filter(node => node && node.type !== 'support');
  const previousElite = completed.at(-1)?.elite === true;
  const previous = run.map.flat().find(node => node.id === run.path.at(-1));
  const reachable = run.step === 0 ? run.startNodeIds : previous?.nextIds;
  return run.map[run.step].filter(node => (!Array.isArray(reachable) || reachable.includes(node.id)) && !(previousElite && node.elite));
}

function reconcileHealth(run) {
  run.maxHp = getModifiers(run.cards, run.skills).maxHp;
  run.hp = clamp(run.hp, 0, run.maxHp);
}

export function applyStarter(run, cardId) {
  if (!run || run.phase !== 'starter' || !run.offers.includes(cardId)) return false;
  run.cards = [cardId];
  run.offers = [];
  reconcileHealth(run);
  run.phase = 'map';
  return true;
}

export function selectNode(run, nodeId) {
  const node = getChoices(run).find(item => item.id === nodeId);
  if (!node) return false;
  run.current = node;
  run.path.push(node.id);
  run.phase = node.type === 'support' ? 'support' : 'briefing';
  run.offers = [];
  if (node.type === 'support') run.supportChoices = makeSupportChoices(run);
  return true;
}

function advance(run) {
  run.step += 1;
  run.current = null;
  run.offers = [];
  run.supportChoices = [];
  run.phase = run.step >= 7 ? 'ended' : 'map';
}

/** Pass null (or 'skip') to keep a full loadout and receive eight embers. */
export function takeCard(run, cardId, replaceIndex = null) {
  if (!run || run.phase !== 'reward') return false;
  if (cardId == null || cardId === 'skip') {
    run.embers += 8;
    advance(run);
    return true;
  }
  if (!run.offers.includes(cardId) || !Object.hasOwn(CARDS, cardId) || run.cards.includes(cardId)) return false;
  if (run.cards.length < 3) run.cards.push(cardId);
  else {
    if (!Number.isInteger(replaceIndex) || replaceIndex < 0 || replaceIndex > 2) return false;
    run.cards[replaceIndex] = cardId;
  }
  reconcileHealth(run);
  advance(run);
  return true;
}

export function finishFlight(run, result) {
  if (!run || run.phase !== 'briefing' || !run.current || run.current.type === 'support' || !result || typeof result.success !== 'boolean') return false;
  const node = run.current;
  const success = result.success && finite(result.hp) > 0;
  run.hp = clamp(finite(result.hp), 0, run.maxHp);
  const remainingFlame = clamp(Number.isFinite(result.flame) ? result.flame : run.flame ?? FLAME_TUNING.maximum, 0, FLAME_TUNING.maximum);
  run.flame = success && node.type !== 'finale' ? Math.max(FLAME_TUNING.checkpointMinimum, remainingFlame) : remainingFlame;
  run.embers += count(result.embers);
  run.score += count(result.score);
  run.shield = 0;
  run.usedRebirth ||= result.rebirthUsed === true;
  run.stats.flights += 1;
  run.stats.elites += node.elite ? 1 : 0;
  run.stats.collected += count(result.collected);
  run.stats.collisions += count(result.collisions);
  run.stats.boosts += count(result.boosts);
  for (const key of ['nearMisses', 'gustSeconds', 'baseEmbers']) run.stats[key] = finite(run.stats[key]) + count(result.stats?.[key]);
  const challengeComplete = success && result.challengeComplete === true;
  if (challengeComplete) {
    run.embers += node.challengeBonus;
    run.stats.challenges += 1;
  }
  if (success) run.embers += node.bonusEmbers;
  run.lastFlight = { success, terrain: node.terrain, elite: node.elite, embers: count(result.embers), completionBonus: success ? node.bonusEmbers : 0, challengeBonus: challengeComplete ? node.challengeBonus : 0, score: count(result.score), collected: count(result.collected), flame: remainingFlame, recoveredFlame: run.flame - remainingFlame };
  if (!success || node.type === 'finale') {
    run.phase = 'ended';
    run.success = success && node.type === 'finale';
    if (run.success) run.step = 7;
    run.offers = [];
  } else {
    run.phase = 'reward';
    run.offers = draft(run, 'flight-reward');
  }
  return true;
}

const choice = (id, title, description, effect, detail = description) => ({ id, title, description, detail, effect });
function makeSupportChoices(run) {
  const canHeal = run.hp < run.maxHp;
  const healOrWard = canHeal ? { hp: 1, flame: 100 } : { shield: 1, flame: 100 };
  const healingTitle = canHeal ? 'Restore a heart' : 'Carry an ash ward';
  const healingText = (canHeal ? 'Recover 1 heart before the next flight.' : 'Absorb one extra hit during the next flight.') + ' Refill Flame to 100.';
  if (run.current.kind === 'camp') return [
    choice('rest', healingTitle, healingText, healOrWard),
    choice('gather', 'Gather the glow', 'Gain 18 embers and recover 22 Flame.', { embers: 18, flame: 22 }),
  ];
  if (run.current.kind === 'shrine') return [
    choice('shrine-fuel', 'Stoke the inner flame', 'Recover 40 Flame and gain 10 embers before the next fork.', { flame: 40, embers: 10 }),
    choice('shrine-inspiration', 'Read the rising sparks', 'Choose a temporary card and recover 8 Flame. Keep a reserve for the next passage.', { draft: true, flame: 8 }),
  ];
  switch (run.current.eventIndex) {
    case 0: return [
      choice('spring', healingTitle, `${healingText}${run.embers >= 12 ? ' Costs 12 run embers.' : ''}`, { ...healOrWard, embers: run.embers >= 12 ? -12 : 0 }),
      choice('spring-gold', 'Follow the golden stream', 'Gain 16 embers and leave the spring untouched.', { embers: 16 }),
    ];
    case 1: return [
      run.hp >= 2 ? choice('bargain', 'Give a little flame', 'Lose 1 heart and gain 35 embers.', { hp: -1, embers: 35 }) : choice('bargain-shield', 'Keep the last spark', 'Protect your last heart with an ash ward.', { shield: 1 }),
      choice('bargain-safe', 'Take the scattered embers', 'Gain 12 embers with no health cost.', { embers: 12 }),
    ];
    case 2: return [
      choice('nest-ward', 'Wear the abandoned ward', 'An ash ward absorbs one hit during the next flight.', { shield: 1 }),
      choice('nest-gold', 'Gather the nesting embers', 'Gain 22 embers.', { embers: 22 }),
    ];
    case 3: return [
      choice('shrine-draft', 'Listen to another spirit', 'Choose between two new temporary cards.', { draft: true }),
      choice('shrine-keep', 'Keep your present form', 'Keep your loadout and gain 20 embers.', { embers: 20 }),
    ];
    case 4: return [
      choice('well', canHeal ? 'Drink the luminous water' : 'Seal the light in a ward', canHeal ? 'Recover up to 2 hearts and refill Flame.' : healingText, canHeal ? { hp: 2, flame: 100 } : { shield: 1, flame: 100 }),
      choice('well-gold', 'Catch the reflected light', 'Gain 15 embers and 150 score.', { embers: 15, score: 150 }),
    ];
    default: return [
      choice('archive-draft', 'Read a forgotten flame', `Choose a new card.${run.embers >= 10 ? ' Costs 10 run embers.' : ''}`, { draft: true, embers: run.embers >= 10 ? -10 : 0 }),
      choice('archive-rest', healingTitle, healingText, healOrWard),
    ];
  }
}

export function getSupportChoices(run) {
  return run?.phase === 'support' ? copy(run.supportChoices) : [];
}

export function resolveSupport(run, index) {
  if (!run || run.phase !== 'support' || !Number.isInteger(index) || index < 0 || index > 1) return false;
  const effect = run.supportChoices[index]?.effect;
  if (!effect || run.embers + finite(effect.embers) < 0 || run.hp + finite(effect.hp) <= 0) return false;
  run.embers = count(run.embers + finite(effect.embers));
  run.score = count(run.score + finite(effect.score));
  run.hp = clamp(run.hp + finite(effect.hp), 0, run.maxHp);
  run.flame = clamp((run.flame ?? FLAME_TUNING.maximum) + finite(effect.flame), 0, FLAME_TUNING.maximum);
  run.shield = count(run.shield + finite(effect.shield), 2);
  run.stats.events += 1;
  if (effect.draft) {
    run.phase = 'reward';
    run.offers = draft(run, `event-${run.current.id}`);
    run.supportChoices = [];
  } else advance(run);
  return true;
}

export function bankRun(state) {
  const run = state?.run;
  if (!state?.profile || !run || run.phase !== 'ended' || run.banked || state.profile.bankedRuns.includes(run.id)) return false;
  state.profile.embers = count(state.profile.embers + count(run.embers));
  state.profile.stats.completedRuns += 1;
  state.profile.stats.wins += run.success ? 1 : 0;
  state.profile.stats.totalScore += count(run.score);
  state.profile.stats.bestScore = Math.max(state.profile.stats.bestScore, count(run.score));
  state.profile.bankedRuns.push(run.id);
  state.profile.bankedRuns = state.profile.bankedRuns.slice(-128);
  run.banked = true;
  return true;
}

/** Price of the next rank, or null for an unknown/fully upgraded skill. */
export function getSkillCost(profile, skillId) {
  const item = typeof skillId === 'string' && Object.hasOwn(SKILLS, skillId) ? SKILLS[skillId] : null;
  if (!item) return null;
  const rank = skillRank(profile?.skills, skillId);
  return rank >= item.maxRank ? null : Math.round(item.cost * 1.5 ** rank);
}

export function buySkill(profile, skillId) {
  const item = typeof skillId === 'string' && Object.hasOwn(SKILLS, skillId) ? SKILLS[skillId] : null;
  const cost = getSkillCost(profile, skillId);
  if (!profile || !item || cost === null || !Number.isFinite(profile.embers) || profile.embers < cost || (item.requires && !skillRank(profile.skills, item.requires))) return false;
  profile.skills ||= {};
  profile.embers -= cost;
  profile.skills[skillId] = skillRank(profile.skills, skillId) + 1;
  return true;
}

export function getModifiers(cardIds = [], skills = {}) {
  const ids = new Set(Array.isArray(cardIds) ? cardIds.filter(id => Object.hasOwn(CARDS, id)) : []);
  const result = {
    gravity: 1, flap: 1, speed: 1, attract: 1 + 0.25 * skillRank(skills, 'wisp-reach'),
    wispCooldown: Math.round((1 - 0.15 * skillRank(skills, 'wisp-recovery')) * 100) / 100,
    lightRadius: WISP_TUNING.lightRadius + 35 * skillRank(skills, 'wisp-light'),
    boostCooldown: 1, boostDuration: 1, reward: 1,
    maxHp: 3, rebirth: !!skillRank(skills, 'rebirth-spark'), rebirthHp: skillRank(skills, 'rebirth-grace') ? 2 : 1,
    ward: ids.has('ash-ward') ? 1 : 0, steady: ids.has('steady-flame'),
    hungryWisp: ids.has('hungry-wisp'), kindledSpirit: ids.has('kindled-spirit'), goldenWake: ids.has('golden-wake'),
    stormFeeder: ids.has('storm-feeder'), fireWake: ids.has('fire-wake'), warmHeart: ids.has('warm-heart'),
  };
  if (skillRank(skills, 'wisp-bounty')) result.reward *= 1.10;
  if (skillRank(skills, 'boost-focus')) result.boostCooldown *= 0.90;
  if (skillRank(skills, 'boost-flare')) result.boostDuration *= 1.15;
  if (ids.has('soft-descent')) { result.gravity *= 0.90; result.flap *= 0.94; }
  if (ids.has('high-wing')) { result.flap *= 1.10; result.speed *= 1.05; }
  if (ids.has('tailwind')) { result.speed *= 1.08; result.reward *= 1.12; }
  if (ids.has('glass-phoenix')) { result.maxHp = 2; result.reward *= 1.25; }
  if (ids.has('ash-ward')) result.boostCooldown *= 1.12;
  if (ids.has('steady-flame')) result.gravity *= 0.97;
  if (ids.has('storm-feeder')) result.boostCooldown *= 0.96;
  if (ids.has('fire-wake')) result.boostDuration *= 1.08;
  result.gravity = clamp(result.gravity, 0.82, 1.15);
  result.flap = clamp(result.flap, 0.88, 1.15);
  result.speed = clamp(result.speed, 0.90, 1.12);
  result.attract = clamp(result.attract, 1, 2);
  result.boostCooldown = clamp(result.boostCooldown, 0.65, 1.20);
  result.boostDuration = clamp(result.boostDuration, 0.80, 1.45);
  result.reward = clamp(result.reward, 0.75, 1.65);
  return result;
}
