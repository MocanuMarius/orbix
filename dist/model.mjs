/** Seeded, DOM-free campaign model. Public commands mutate their run/profile and return booleans. */
export const SAVE_KEY = 'emberwing.save.v1';
export const TERRAINS = Object.freeze({
  ruins: { id: 'ruins', name: 'Sunken Ruins', color: '#e8b36b', description: 'Ancient arches, sweeping gates, and golden wisp trails.' },
  canopy: { id: 'canopy', name: 'Luminous Canopy', color: '#87e9b3', description: 'Living branches frame winding trails of forest light.' },
  storm: { id: 'storm', name: 'Stormglass Peaks', color: '#c0b3ff', description: 'Watch the gathering wind and ride between crystal spires.' },
});

const card = (id, name, tag, description, detail, color, icon) => ({ id, name, tag, description, detail, color, icon });
export const CARDS = Object.freeze({
  'hungry-wisp': card('hungry-wisp', 'Hungry Wisp', 'Wisp', 'Boosting draws nearby wisps toward you.', 'Wisp attraction is 60% stronger during a boost. Pair with Kindled Spirit to keep the flame moving.', '#8ce5c4', '✧'),
  'kindled-spirit': card('kindled-spirit', 'Kindled Spirit', 'Wisp', 'Every three collected wisps quicken your next boost.', 'Every three base embers collected reduce the boost cooldown by one second. Bonus rewards never trigger this again.', '#f8c778', '✦'),
  'golden-wake': card('golden-wake', 'Golden Wake', 'Wisp', 'Collecting during boost doubles the pickup score.', 'Boosted wisp pickups grant +100% score. This changes score, not permanent ember currency.', '#ffdc81', '◈'),
  'storm-feeder': card('storm-feeder', 'Storm Feeder', 'Flame', 'Turn the mountain wind into boost energy.', 'Boost cooldown is 4% shorter everywhere. In gusts, recover another second of cooldown once each second.', '#b3c6ff', 'ϟ'),
  'soft-descent': card('soft-descent', 'Soft Descent', 'Wing', 'Fall gently and guide smaller wingbeats.', 'Gravity is 10% lighter and flaps are 6% gentler. A steady choice for precise passages.', '#a5dce9', '⌄'),
  'high-wing': card('high-wing', 'High Wing', 'Wing', 'Climb higher and travel faster.', 'Flaps are 10% stronger and travel is 5% faster. Favor deliberate taps and high wisp trails.', '#e9b7ff', '⌃'),
  tailwind: card('tailwind', 'Tailwind', 'Wing', 'Fly faster for a richer ember trail.', 'Travel is 8% faster and earned ember rewards are 12% greater. The phoenix needs quicker decisions.', '#facb9b', '»'),
  'ash-ward': card('ash-ward', 'Ash Ward', 'Ash', 'Begin each flight protected by a circle of ash.', 'A ward absorbs one hit each flight, while boost recharges 12% more slowly. Checkpoint wards remain separate.', '#d4c5ec', '◇'),
  'glass-phoenix': card('glass-phoenix', 'Glass Phoenix', 'Ash', 'A fragile body, a brilliant reward.', 'Maximum health becomes two hearts; earned ember rewards increase by 25%. Replacing this card restores capacity, not health.', '#a9e7fa', '♢'),
  'steady-flame': card('steady-flame', 'Steady Flame', 'Wing', 'Keep your course through difficult currents.', 'Wind has less influence, and gravity is 3% lighter. A calm choice for the Stormglass Peaks.', '#d3d6f3', '≈'),
  'fire-wake': card('fire-wake', 'Fire Wake', 'Flame', 'Burn soft thorns into a trail of bonus wisps.', 'Boost lasts 8% longer. Each soft thorn burned during a boost releases three collectible bonus motes.', '#ff9d77', '♨'),
  'warm-heart': card('warm-heart', 'Warm Heart', 'Ash', 'A rich wisp trail can mend a wounded heart.', 'Collect eight base embers in a flight to heal one heart, once per flight. Bonus embers cannot retrigger it.', '#f2a6ba', '♡'),
});

const skill = (id, name, branch, cost, requires, description) => ({ id, name, branch, cost, requires, maxRank: 1, description });
export const SKILLS = Object.freeze({
  'wisp-reach': skill('wisp-reach', 'Wisp Reach', 'Wisp', 80, null, 'Wisp attraction grows by 25%.'),
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
const skillRank = (skills, id) => count(skills?.[id], 1);
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
    settings: { sound: true, reducedMotion: false },
  };
}

function cleanProfile(value) {
  const profile = newState().profile;
  profile.embers = count(value?.embers);
  for (const id of Object.keys(SKILLS)) if (skillRank(value?.skills, id)) profile.skills[id] = 1;
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
  if (!Array.isArray(run.map) || run.map.length !== 7 || run.map.some((row, i) => !Array.isArray(row) || row.length !== 2 || row.some(node => !node || node.row !== i || typeof node.id !== 'string' || !Object.hasOwn(TERRAINS, node.terrain) || !['flight', 'support', 'finale'].includes(node.type) || !Number.isFinite(node.bonusEmbers) || !Number.isFinite(node.challengeBonus)))) return false;
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
    state.settings = { sound: parsed.settings?.sound !== false, reducedMotion: parsed.settings?.reducedMotion === true };
    if (validRun(parsed.run)) {
      state.run = parsed.run;
      state.run.skills = cleanProfile({ skills: parsed.run.skills }).skills;
      state.run.hp = clamp(state.run.hp, 0, getModifiers(state.run.cards, state.run.skills).maxHp);
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

const EVENT_NAMES = ['Ash Spring', 'Cinder Bargain', 'Abandoned Nest', 'Molting Shrine', 'Luminous Well', 'The Ember Archive'];
function makeMap(seed) {
  const rng = randomFor(`${seed}|map`);
  const terrains = shuffled(Object.keys(TERRAINS), rng);
  let previousEvent = null;
  const themes = [['Flame', 'Wing'], ['Wisp', 'Ash'], ['Wing', 'Ash'], ['Flame', 'Wisp']];
  return Array.from({ length: 7 }, (_, row) => [0, 1].map(lane => {
    const terrain = terrains[(Math.floor(row / 2) + lane) % terrains.length];
    const support = row === 1 || row === 4;
    const finale = row === 6;
    const elite = !support && !finale && row > 0 && lane === 1;
    const kind = support ? (lane ? 'event' : 'camp') : finale ? 'finale' : elite ? 'elite' : 'normal';
    let eventIndex = Math.floor(rng() * EVENT_NAMES.length);
    if (support && lane === 1) {
      if (eventIndex === previousEvent) eventIndex = (eventIndex + 1) % EVENT_NAMES.length;
      previousEvent = eventIndex;
    }
    const draftTags = elite ? themes[Math.floor(rng() * themes.length)] : [];
    const draftTheme = draftTags.join(' + ');
    const challengeId = ['wisps', 'clean', 'boosts'][Math.floor(rng() * 3)];
    const challengeTarget = challengeId === 'wisps' ? 6 + Math.floor(row / 2) : challengeId === 'boosts' ? 2 : 0;
    const challenge = challengeId === 'wisps' ? `Collect ${challengeTarget} wisps` : challengeId === 'boosts' ? 'Boost twice' : 'Finish without a hit';
    return {
      id: `n-${row}-${lane ? 'b' : 'a'}`, row, lane,
      type: support ? 'support' : finale ? 'finale' : 'flight', kind, terrain, elite, draftTags, draftTheme,
      name: support ? lane ? EVENT_NAMES[eventIndex] : 'Emberwell Camp' : finale ? `${TERRAINS[terrain].name} · Ascension` : `${TERRAINS[terrain].name}${elite ? ' · Trial' : ''}`,
      description: support ? lane ? 'An encounter with two clear outcomes. Choose what your current flight needs.' : 'Restore a heart or gather embers for your permanent growth.' : `${TERRAINS[terrain].description}${elite ? ' The trial adds a faster, tighter passage.' : ''}`,
      duration: support ? 0 : finale ? 55 : row === 0 ? 34 : 38 + row * 2,
      eventIndex: support && lane ? eventIndex : null,
      challenge: support ? '' : challenge,
      challengeId: support ? '' : challengeId,
      challengeTarget: support ? 0 : challengeTarget,
      challengeBonus: support ? 0 : 8,
      bonusEmbers: support ? 0 : finale ? 35 : elite ? 22 : 12,
      reward: support ? lane ? 'A choice of boons and bargains' : 'Heal 1 heart or gather 18 embers' : finale ? '35 embers · complete the journey' : elite ? `22 embers · ${draftTheme} card draft` : '12 embers · choose a card',
    };
  }));
}

function draft(run, label) {
  let available = Object.keys(CARDS).filter(id => !run.cards.includes(id));
  if (label === 'flight-reward' && run.current?.elite && run.current.draftTags?.length) {
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
    cards: [], skills, hp: 3, maxHp: 3, shield: 0, embers: 0, score: 0, usedRebirth: false,
    offers: [], phase: 'starter', success: false, banked: false, supportChoices: [],
    stats: { collected: 0, collisions: 0, boosts: 0, flights: 0, elites: 0, challenges: 0, events: 0 },
  };
  run.offers = draft(run, 'starter');
  return run;
}

export function getChoices(run) {
  if (!run || run.phase !== 'map' || run.step > 6) return [];
  const completed = run.path.map(id => run.map.flat().find(node => node.id === id)).filter(node => node && node.type !== 'support');
  const previousElite = completed.at(-1)?.elite === true;
  return run.map[run.step].filter(node => !(previousElite && node.elite));
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
  run.lastFlight = { success, terrain: node.terrain, elite: node.elite, embers: count(result.embers), completionBonus: success ? node.bonusEmbers : 0, challengeBonus: challengeComplete ? node.challengeBonus : 0, score: count(result.score), collected: count(result.collected) };
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
  const healOrWard = canHeal ? { hp: 1 } : { shield: 1 };
  const healingTitle = canHeal ? 'Restore a heart' : 'Carry an ash ward';
  const healingText = canHeal ? 'Recover 1 heart before the next flight.' : 'Absorb one extra hit during the next flight.';
  if (run.current.kind === 'camp') return [
    choice('rest', healingTitle, healingText, healOrWard),
    choice('gather', 'Gather the glow', 'Gain 18 embers for your permanent skill tree.', { embers: 18 }),
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
      choice('well', canHeal ? 'Drink the luminous water' : 'Seal the light in a ward', canHeal ? 'Recover up to 2 hearts.' : healingText, canHeal ? { hp: 2 } : { shield: 1 }),
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

export function buySkill(profile, skillId) {
  const item = typeof skillId === 'string' && Object.hasOwn(SKILLS, skillId) ? SKILLS[skillId] : null;
  if (!profile || !item || !Number.isFinite(profile.embers) || profile.embers < item.cost || skillRank(profile.skills, skillId) >= item.maxRank || (item.requires && !skillRank(profile.skills, item.requires))) return false;
  profile.skills ||= {};
  profile.embers -= item.cost;
  profile.skills[skillId] = 1;
  return true;
}

export function getModifiers(cardIds = [], skills = {}) {
  const ids = new Set(Array.isArray(cardIds) ? cardIds.filter(id => Object.hasOwn(CARDS, id)) : []);
  const result = {
    gravity: 1, flap: 1, speed: 1, attract: 1, boostCooldown: 1, boostDuration: 1, reward: 1,
    maxHp: 3, rebirth: !!skillRank(skills, 'rebirth-spark'), rebirthHp: skillRank(skills, 'rebirth-grace') ? 2 : 1,
    ward: ids.has('ash-ward') ? 1 : 0, steady: ids.has('steady-flame'),
    hungryWisp: ids.has('hungry-wisp'), kindledSpirit: ids.has('kindled-spirit'), goldenWake: ids.has('golden-wake'),
    stormFeeder: ids.has('storm-feeder'), fireWake: ids.has('fire-wake'), warmHeart: ids.has('warm-heart'),
  };
  if (skillRank(skills, 'wisp-reach')) result.attract *= 1.25;
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
