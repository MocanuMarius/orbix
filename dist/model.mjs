/** Seeded, DOM-free campaign model. Public commands mutate their run/profile and return booleans. */
import { FLAME_TUNING, AFTERGLOW_TUNING, LIFE_TUNING, FLIGHT_POINTS_TUNING } from './vitality.mjs';
import { WISP_TUNING } from './wisp.mjs';
import { LEVELS, getLevelIdentity } from './level-catalog.mjs';
import { COMPANION_ABILITIES, normalizeCompanionRole } from './companion-abilities.mjs';
import { getAscentInfo } from './ascent.mjs';
import { LEVEL_LENGTH, getLevelLengthScale } from './level-length.mjs';
import { EVENT_SCENARIOS } from './map-guide.mjs';
export const SAVE_KEY = 'emberwing.save.campaign.v2';
export const CAMPAIGN_MAP_NAMES = Object.freeze(['The Forgotten Verge', 'The Rootbound March', 'The Warden’s Reach']);
const MAPS_PER_TIER = 3;
export const TERRAINS = Object.freeze({
  ruins: { id: 'ruins', name: 'Sunken Ruins', color: '#e8b36b', description: 'Ancient arches, sweeping gates, and trails of light packets.' },
  canopy: { id: 'canopy', name: 'Luminous Canopy', color: '#87e9b3', description: 'Living branches frame winding trails of forest light.' },
  storm: { id: 'storm', name: 'Stormglass Peaks', color: '#c0b3ff', description: 'Fly between crystal spires and around occasional gentle draft puffs.' },
});

const card = (id, name, tag, description, detail, color, icon) => ({ id, name, tag, description, detail, color, icon });
export const CARDS = Object.freeze({
  'hungry-wisp': card('hungry-wisp', 'Hungry Wisp', 'Wisp', 'Using your companion ability sends it searching farther.', 'Your companion searches 60% farther for the closest light packet while an active ability works, or always with passive Gravity, then fetches it and returns. Pair with Kindled Spirit to keep your ability ready.', '#8ce5c4', '✧'),
  'kindled-spirit': card('kindled-spirit', 'Kindled Spirit', 'Wisp', 'Every three collected light packets quicken your next ability.', 'Every three natural light packets collected reduce ability cooldown by one second, or collector recovery with Gravity. Bonus rewards never trigger this again.', '#f8c778', '✦'),
  'golden-wake': card('golden-wake', 'Golden Wake', 'Wisp', 'Collecting while your ability is active doubles pickup score.', 'Light packets collected during an active ability, or always with Gravity, grant +100% score. Higher flight score contributes to the capped clear bonus; pickup ember currency is not directly multiplied.', '#ffdc81', '◈'),
  'storm-feeder': card('storm-feeder', 'Draft Feeder', 'Flame', 'Cross a local draft puff to quicken your ability.', 'Ability cooldown is 4% shorter everywhere; with Gravity this shortens collector recovery. Inside a visible draft puff, recover another second of cooldown or Gravity collector rest once each second.', '#b3c6ff', 'ϟ'),
  'soft-descent': card('soft-descent', 'Soft Descent', 'Drift', 'Fall gently and guide smaller lift pulses.', 'Gravity is 10% lighter and lift pulses are 6% gentler. A steady choice for precise passages.', '#a5dce9', '⌄'),
  'high-wing': card('high-wing', 'Rising Spirit', 'Drift', 'Climb higher and travel faster.', 'Lift pulses are 10% stronger and travel is 5% faster. Favor deliberate taps and high light packet trails.', '#e9b7ff', '⌃'),
  tailwind: card('tailwind', 'Tailwind', 'Drift', 'Fly faster for a richer ember trail.', 'Travel is 8% faster and earned ember rewards are 12% greater. The wisp needs quicker decisions.', '#facb9b', '»'),
  'ash-ward': card('ash-ward', 'Ash Reserve', 'Ash', 'Natural light packets carry more Glow.', 'Natural light packets restore 4 more Glow, while your ability recharges 12% more slowly, or your Gravity collector recovers 12% more slowly. Bonus motes receive no extra fuel.', '#d4c5ec', '◇'),
  'glass-phoenix': card('glass-phoenix', 'Restless Light', 'Ash', 'Richer rewards. Stronger local drift.', 'Earn 25% more pickup embers, while local draft force is 20% stronger. Puffs only push while you are inside them; you can fly around them.', '#a9e7fa', '♢'),
  'steady-flame': card('steady-flame', 'Steady Light', 'Drift', 'Cross a local draft with less drift.', 'Local draft force is 55% weaker and gravity is 3% lighter. Puffs only affect you inside their visible area.', '#d3d6f3', '≈'),
  'fire-wake': card('fire-wake', 'Shatter Wake', 'Flame', 'Shatter soft thorns into a trail of bonus light motes.', 'Active abilities last 8% longer; Gravity pull is 8% stronger. During an active ability, or always with Gravity, designated soft thorns shatter into three collectible bonus motes.', '#ff9d77', '♨'),
  'warm-heart': card('warm-heart', 'Warm Core', 'Ash', 'A steady cache route rekindles your core.', 'Collect four natural light packets to restore 12 Glow, once per flight. Bonus motes cannot retrigger it.', '#f2a6ba', '✦'),
});

const BASE_POWERS = Object.freeze(['soft-descent', 'high-wing', 'ash-ward', 'warm-heart']);
const POWER_DISCOVERY = Object.freeze([
  { at: 2, ids: ['hungry-wisp', 'kindled-spirit'] },
  { at: 4, ids: ['steady-flame', 'storm-feeder'] },
  { at: 6, ids: ['tailwind', 'golden-wake'] },
  { at: 8, ids: ['fire-wake', 'glass-phoenix'] },
]);

const skill = (id, name, branch, cost, requires, description, maxRank = 1) => ({ id, name, branch, cost, requires, maxRank, description });
export const SKILLS = Object.freeze({
  'wisp-light': skill('wisp-light', 'Inner Glow', 'Wisp', 60, null, 'Illuminate 35 more units of terrain per rank. See paths and pickups farther ahead.', 3),
  'wisp-reach': skill('wisp-reach', 'Wisp Reach', 'Wisp', 80, null, 'Each rank expands your companion’s light packet search range by 25%, up to 75% farther.', 3),
  'wisp-gravity': skill('wisp-gravity', 'Gravitic Bond', 'Wisp', 80, null, 'Gravity companion only: pull nearby good light packets 15% more strongly per rank. Packets still need to be collected.', 3),
  'wisp-recovery': skill('wisp-recovery', 'Wisp Recovery', 'Wisp', 90, null, 'Each rank shortens the wait after your wisp returns by 15% of the base cooldown.', 3),
  'wisp-bounty': skill('wisp-bounty', 'Wisp Bounty', 'Wisp', 160, 'wisp-reach', 'Earn 10% more embers from flight pickups.'),
  'boost-focus': skill('boost-focus', 'Quickening', 'Boost', 80, null, 'Active abilities recharge 10% sooner. With Gravity, collector recovery is 10% shorter.'),
  'boost-flare': skill('boost-flare', 'Lasting Bond', 'Boost', 160, 'boost-focus', 'Active abilities last 15% longer. With Gravity, pull strength is 15% greater.'),
  'afterglow-vessel': skill('afterglow-vessel', 'Ember Vessel', 'Afterglow', 70, null, 'Carry 15 more Afterglow per rank between flights and expeditions.', 3),
  'afterglow-retention': skill('afterglow-retention', 'Lasting Light', 'Afterglow', 80, 'afterglow-vessel', 'Retain 10 percentage points more surplus Glow per rank.', 2),
  'afterglow-anchor': skill('afterglow-anchor', 'Ash Anchor', 'Afterglow', 90, 'afterglow-vessel', 'Lose 10 percentage points less Afterglow when an expedition ends in failure.', 2),
});

const companionTint = (value, legacy) => ['pearl', 'amber', 'lilac'].includes(value) ? value : legacy === 'fire' ? 'amber' : 'pearl';

const PHASES = new Set(['starter', 'map', 'briefing', 'support', 'reward', 'retry', 'map-clear', 'ended']);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const count = (n, limit = 1e9) => Math.floor(clamp(finite(n), 0, limit));
const copy = value => JSON.parse(JSON.stringify(value));
const skillRank = (skills, id) => count(skills?.[id], Object.hasOwn(SKILLS, id) ? SKILLS[id].maxRank : 0);
const energy = n => Math.round(Math.max(0, finite(n)) * 1000) / 1000;
const powerIds = ids => [...new Set((Array.isArray(ids) ? ids : []).filter(id => Object.hasOwn(CARDS, id)))];
const REWARD_LEDGER_VERSION = 1;

function flightDepth(run, node) {
  return run.isTutorial ? Math.max(1, run.map.slice(0, node.row + 1).filter(row => row.some(item => item.type !== 'support')).length)
    : getAscentInfo(node).level;
}

function completionReward(node, depth) {
  return (node.type === 'finale' ? 36 : 20 + 4 * (clamp(count(depth), 1, 5) - 1) + (node.elite ? 12 : 0)) * getLevelLengthScale(node);
}

function flightRewardPreview(node) {
  const cap = 8 * getLevelLengthScale(node);
  return `${node.bonusEmbers} clear embers · up to ${cap} score bonus · ${node.boss ? 'defeat the Hollow Warden' : node.type === 'finale' ? 'clear this map' : `${node.draftTheme || 'temporary'} card draft`}`;
}

function normalizeFlightLengths(run) {
  const migration = run.lengthVersion !== LEVEL_LENGTH.version;
  const currentId = run.current?.id;
  const priorAttempt = currentId && run.lastAttempt?.nodeId === currentId && run.lastAttempt.success !== true;
  const locked = run.attemptActive || run.phase === 'retry' || priorAttempt
    || ['reward', 'ended'].includes(run.phase);
  for (const node of run.map.flat()) {
    if (run.isTutorial || node.tutorialLesson || node.type === 'support') {
      node.flightLengthScale = 1;
      continue;
    }
    const unplayed = node.row > run.step || node.row === run.step
      && ['starter', 'map', 'briefing'].includes(run.phase) && !(locked && node.id === currentId);
    if (migration && unplayed && getLevelLengthScale(node) !== LEVEL_LENGTH.multiplier) {
      node.duration = Math.min(LEVEL_LENGTH.maximumDuration,
        Math.max(15, count(node.duration) || 38) * LEVEL_LENGTH.multiplier);
      node.flightLengthScale = LEVEL_LENGTH.multiplier;
      if (node.challengeId === 'wisps' || node.challengeId === 'boosts')
        node.challengeTarget = count(node.challengeTarget) * LEVEL_LENGTH.multiplier;
    } else node.flightLengthScale = getLevelLengthScale(node);
    node.bonusEmbers = completionReward(node, getAscentInfo(node).level);
    node.challengeBonus = 8 * getLevelLengthScale(node);
    node.performanceBonusCap = 8 * getLevelLengthScale(node);
    if (node.challengeId === 'wisps') node.challenge = `Collect ${count(node.challengeTarget)} light packets`;
    else if (node.challengeId === 'boosts') node.challenge = `Use ability ${count(node.challengeTarget)} times`;
    node.reward = flightRewardPreview(node);
  }
  if (run.current) {
    const node = run.map[run.current.row]?.find(item => item.id === currentId);
    if (node) Object.assign(run.current, node);
  }
  run.lengthVersion = LEVEL_LENGTH.version;
  return migration;
}

function queueReward(run, amount, kind, nodeId = run.current?.id) {
  amount = count(amount);
  if (!amount || run.isTutorial) return;
  run.embers = count(run.embers) + amount;
  run.pendingRewards ??= [];
  run.pendingRewards.push({ kind, nodeId: nodeId || null, amount });
}

function secureBossProgress(state) {
  const run = state?.run, profile = state?.profile;
  if (!run || !profile || run.isTutorial || !run.bossDefeated || !run.success) return;
  profile.difficulty = Math.max(count(profile.difficulty) || 1, (count(run.difficulty) || 1) + 1);
  if (!profile.afterglowUnlocked) {
    profile.afterglowUnlocked = true;
    run.afterglowUnlocked = true;
    run.afterglowJustUnlocked = true;
    run.afterglowUnlockGrant = 20;
    run.afterglow = energy(Math.min(getAfterglowRules(run.skills).cap, 20));
    run.afterglowTotals = afterglowReport(run.afterglow, { ...run.afterglowTotals, granted: 20 });
    if (run.lastFlight) run.lastFlight.afterglow = afterglowReport(run.afterglow,
      { ...run.lastFlight.afterglow, granted: 20 });
    profile.afterglow = run.afterglow;
  }
}

function spendPending(run, amount) {
  run.embers = count(run.embers - amount);
  let remaining = amount;
  for (let i = (run.pendingRewards || []).length - 1; i >= 0 && remaining > 0; i--) {
    const spent = Math.min(count(run.pendingRewards[i].amount), remaining);
    run.pendingRewards[i].amount -= spent; remaining -= spent;
  }
  run.pendingRewards = (run.pendingRewards || []).filter(reward => reward.amount > 0);
}

/** Atomically persist the returned state after this command. No end-of-run cashout is needed. */
export function settleCheckpoint(state) {
  const run = state?.run, profile = state?.profile;
  if (!run || !profile || run.isTutorial || run.banked || profile.bankedRuns?.includes(run.id)) return 0;
  const legacy = run.rewardLedgerVersion !== REWARD_LEDGER_VERSION;
  if (!legacy && (run.phase === 'retry' || run.phase === 'ended' && !run.success)) return 0;
  secureBossProgress(state);
  const amount = count(run.embers);
  let remaining = amount;
  const rewards = [];
  for (const reward of run.pendingRewards || []) {
    const secured = Math.min(remaining, count(reward.amount));
    if (!secured) continue;
    remaining -= secured;
    rewards.push({ kind: reward.kind, nodeId: reward.nodeId || null, amount: secured });
    if (reward.kind === 'flight' && run.lastFlight?.nodeId === reward.nodeId)
      run.lastFlight.securedEmbers = count(run.lastFlight.securedEmbers) + secured;
  }
  if (remaining) rewards.push({ kind: legacy ? 'legacy' : 'checkpoint', nodeId: null, amount: remaining });
  profile.embers = count(profile.embers + amount);
  profile.clearedFlights = Math.max(count(profile.clearedFlights), count(run.discoveryClears));
  profile.knownPowers = powerIds([...getPowerDiscovery(profile).unlocked, ...getPowerDiscovery(run).unlocked]);
  run.securedEmbers = count(run.securedEmbers) + amount;
  run.embers = 0;
  run.pendingRewards = [];
  run.rewardLedgerVersion = REWARD_LEDGER_VERSION;
  if (amount) run.lastCheckpointReward = rewards.length === 1 ? rewards[0]
    : { kind: 'checkpoint', nodeId: null, amount, rewards };
  // Legacy entry snapshots may contain the purse just secured above. Do not
  // resurrect that purse if an interrupted attempt later restores its entry.
  if (run.attemptEntry) { run.attemptEntry.embers = 0; run.attemptEntry.pendingRewards = []; }
  return amount;
}

function tuningRows(run) {
  const supportRows = new Set((run?.map || []).flat().filter(node => node.type === 'support').map(node => node.row));
  return [...new Set((Array.isArray(run?.tuningRestRows) ? run.tuningRestRows : [])
    .filter(row => Number.isInteger(row) && supportRows.has(row)))].sort((a, b) => a - b);
}

function tuningBudget(run) {
  if (!run) return 0;
  const rests = tuningRows(run).length;
  return run.isTutorial ? rests > 0 ? FLIGHT_POINTS_TUNING.tutorialRest : FLIGHT_POINTS_TUNING.tutorialStarting
    : Math.min(FLIGHT_POINTS_TUNING.maximum, Math.max(FLIGHT_POINTS_TUNING.starting,
      count(run.tuningCarryBudget, FLIGHT_POINTS_TUNING.maximum)) + rests * FLIGHT_POINTS_TUNING.perRest);
}

function tuningAllocation(value = {}, budget = FLIGHT_POINTS_TUNING.maximum) {
  let remaining = count(budget, FLIGHT_POINTS_TUNING.maximum);
  const allocation = {};
  for (const axis of FLIGHT_POINTS_TUNING.axes) {
    allocation[axis] = Math.min(remaining, count(value?.[axis], FLIGHT_POINTS_TUNING.maxPerStat));
    remaining -= allocation[axis];
  }
  return allocation;
}

function normalizeFlightTuning(run) {
  const nodes = (run.map || []).flat();
  const visited = (run.path || []).map(id => nodes.find(node => node.id === id))
    .filter(node => node?.type === 'support').map(node => node.row);
  run.tuningRestRows = [...new Set([...tuningRows(run), ...visited])].sort((a, b) => a - b);
  const budget = tuningBudget(run);
  const fallback = run.isTutorial ? {} : FLIGHT_POINTS_TUNING.defaultAllocation;
  run.flightTuning = tuningAllocation(run.flightTuning || fallback, budget);
  if (typeof run.tuningRestReady !== 'boolean') run.tuningRestReady = !run.attemptActive
    && !['retry', 'ended'].includes(run.phase) && budget > 0;
  if (run.attemptActive || ['retry', 'ended'].includes(run.phase)) run.tuningRestReady = false;
  if (!run.tuningLastGrant && run.tuningRestRows.length) run.tuningLastGrant = {
    row: run.tuningRestRows.at(-1), points: run.isTutorial ? FLIGHT_POINTS_TUNING.tutorialRest : FLIGHT_POINTS_TUNING.perRest, budget };
}

function grantRestTuning(run, row) {
  run.tuningRestRows = tuningRows(run);
  const before = tuningBudget(run);
  if (!run.tuningRestRows.includes(row)) {
    run.tuningRestRows.push(row);
    run.tuningRestRows.sort((a, b) => a - b);
    const budget = tuningBudget(run);
    run.tuningLastGrant = { row, points: budget - before, budget };
  }
  run.flightTuning = tuningAllocation(run.flightTuning, tuningBudget(run));
  run.tuningRestReady = true;
}

export function getFlightTuningState(run) {
  const budget = tuningBudget(run), allocation = tuningAllocation(run?.flightTuning, budget);
  const spent = Object.values(allocation).reduce((sum, rank) => sum + rank, 0);
  const canEdit = !!run && budget > 0 && run.tuningRestReady === true && !run.attemptActive && !run.banked
    && ['starter', 'map', 'support', 'reward', 'briefing'].includes(run.phase);
  return { budget, spent, remaining: budget - spent, allocation, maxPerStat: FLIGHT_POINTS_TUNING.maxPerStat,
    canEdit, axisLabels: { speed: 'Speed', lift: 'Lift height', collector: normalizeCompanionRole(run?.companionRole) === 'gravity' ? 'Gravity reach' : 'Collector', boost: normalizeCompanionRole(run?.companionRole) === 'gravity' ? 'Recovery' : 'Ability' },
    axisBonuses: { collector: normalizeCompanionRole(run?.companionRole) === 'gravity' ? '+12% reach · +8% pull / point' : '+12% reach / point', boost: normalizeCompanionRole(run?.companionRole) === 'gravity' ? '+5% pull · −4% collector rest / point' : '+5% duration · −4% rest / point' },
    modifiers: getModifiers(run?.cards || [], run?.skills || {}, allocation, run?.companionRole), lastGrant: run?.tuningLastGrant || null };
}

export function adjustFlightTuning(run, axis, delta) {
  if (!FLIGHT_POINTS_TUNING.axes.includes(axis) || (delta !== 1 && delta !== -1)) return false;
  const state = getFlightTuningState(run);
  if (!state.canEdit || (delta > 0 && state.remaining === 0)) return false;
  const rank = state.allocation[axis] + delta;
  if (rank < 0 || rank > state.maxPerStat) return false;
  run.flightTuning = { ...state.allocation, [axis]: rank };
  return true;
}

export function resetFlightTuning(run) {
  if (!getFlightTuningState(run).canEdit) return false;
  run.flightTuning = tuningAllocation({}, tuningBudget(run));
  return true;
}

export function canChangeCompanion(run) {
  if (!run || run.tuningRestReady !== true || run.attemptActive || run.banked || count(run.lives) <= 0
    || !['support', 'map', 'reward', 'briefing'].includes(run.phase)
    || !tuningRows(run).some(row => row <= run.step)) return false;
  const reattempt = run.phase === 'briefing' && run.current
    && run.lastAttempt?.nodeId === run.current.id && run.lastAttempt.success !== true;
  return !reattempt;
}

/** Rest preparation changes the current ascent's role only, never its resources or defaults. */
export function changeCompanion(run, role) {
  if (!canChangeCompanion(run) || typeof role !== 'string'
    || !Object.hasOwn(COMPANION_ABILITIES, role) || run.companionRole === role) return false;
  run.companionRole = role;
  return true;
}

function liveSource(source) {
  if (source?.run && !source.run.banked) return source.run;
  return source?.profile || source || {};
}

export function getAfterglowRules(skills = {}) {
  return {
    cap: AFTERGLOW_TUNING.cap + skillRank(skills, 'afterglow-vessel') * 15,
    retention: Math.min(1, energy(AFTERGLOW_TUNING.retention + skillRank(skills, 'afterglow-retention') * .10)),
    drawLimit: AFTERGLOW_TUNING.drawLimit,
    failureLoss: energy(AFTERGLOW_TUNING.failureLoss - skillRank(skills, 'afterglow-anchor') * .10),
  };
}

export function getAfterglowState(source) {
  const value = liveSource(source), rules = getAfterglowRules(value.skills);
  const practice = value.isTutorial === true;
  const unlocked = value.afterglowUnlocked === true && !practice;
  const amount = unlocked ? energy(clamp(finite(value.afterglow), 0, rules.cap)) : 0;
  const drawUsed = Number.isInteger(value.afterglowDrawStep) && value.afterglowDrawStep === value.step;
  const drawable = unlocked && value.phase === 'briefing' && !value.attemptActive && !value.banked && !drawUsed
    ? energy(Math.min(amount, rules.drawLimit, Math.max(0, FLAME_TUNING.maximum - finite(value.flame)))) : 0;
  return { ...rules, unlocked, failureLoss: unlocked ? rules.failureLoss : 0, amount, drawable, drawUsed, practice };
}

function afterglowReport(amount, report = {}) {
  return { stored: energy(report.stored), spent: energy(report.spent), loss: energy(report.loss),
    amount: energy(amount), rawStored: energy(report.rawStored), granted: energy(report.granted) };
}

export function drawAfterglow(run) {
  const reserve = getAfterglowState(run);
  if (reserve.drawable <= 0) return 0;
  run.afterglow = energy(reserve.amount - reserve.drawable);
  run.flame = Math.min(FLAME_TUNING.maximum, energy(finite(run.flame) + reserve.drawable));
  run.afterglowDrawStep = run.step;
  run.afterglowPendingSpent = energy(finite(run.afterglowPendingSpent) + reserve.drawable);
  run.afterglowTotals = afterglowReport(run.afterglow, run.afterglowTotals);
  run.afterglowTotals.spent = energy(run.afterglowTotals.spent + reserve.drawable);
  return reserve.drawable;
}

export function getPowerDiscovery(source) {
  const value = liveSource(source);
  const cleared = count(value.discoveryClears ?? value.clearedFlights);
  const legacy = !Array.isArray(value.knownPowers) && value.clearedFlights === undefined
    && value.discoveryClears === undefined && count(value.stats?.completedRuns) > 0;
  const unlocked = new Set([...BASE_POWERS, ...powerIds(value.knownPowers)]);
  if (legacy) for (const id of Object.keys(CARDS)) unlocked.add(id);
  for (const milestone of POWER_DISCOVERY) if (cleared >= milestone.at) for (const id of milestone.ids) unlocked.add(id);
  const next = POWER_DISCOVERY.find(milestone => milestone.ids.some(id => !unlocked.has(id)));
  return { cleared, unlocked: [...unlocked], nextAt: next?.at ?? null,
    nextIds: next ? next.ids.filter(id => !unlocked.has(id)) : [] };
}

function recordPowerDiscovery(run, ids) {
  const known = new Set([...BASE_POWERS, ...powerIds(run.knownPowers)]);
  const fresh = powerIds(ids).filter(id => !known.has(id));
  run.knownPowers = powerIds([...known, ...fresh]);
  if (fresh.length && !run.isTutorial) {
    run.newlyDiscoveredPowers = powerIds([...(run.newlyDiscoveredPowers || []), ...fresh]);
    if (run.lastFlight) run.lastFlight.unlockedPowers = powerIds([...(run.lastFlight.unlockedPowers || []), ...fresh]);
  }
  return fresh;
}
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
    profile: { embers: 0, skills: {}, afterglow: 0, afterglowUnlocked: false, difficulty: 1,
      clearedFlights: 0, knownPowers: [...BASE_POWERS], tutorialComplete: false,
      rebirthRefunded: false, stats: { completedRuns: 0, wins: 0, totalScore: 0, bestScore: 0, attempts: 0, deaths: 0 }, bankedRuns: [] },
    run: null, suspendedRun: null,
    settings: { sound: true, reducedMotion: false, companionTint: 'pearl', companionRole: 'swift' },
  };
}

function cleanProfile(value) {
  const profile = newState().profile;
  profile.embers = count(value?.embers);
  profile.difficulty = Math.max(1, count(value?.difficulty));
  profile.afterglowUnlocked = value?.afterglowUnlocked === true;
  profile.rebirthRefunded = value?.rebirthRefunded === true;
  const retiredRefund = (count(value?.skills?.['rebirth-spark'], 1) ? 120 : 0)
    + (count(value?.skills?.['rebirth-grace'], 1) ? 200 : 0);
  if (retiredRefund && !profile.rebirthRefunded) {
    profile.embers += retiredRefund;
    profile.rebirthRefunded = true;
  }
  for (const id of Object.keys(SKILLS)) {
    const rank = skillRank(value?.skills, id);
    if (rank && (!id.startsWith('afterglow-') || profile.afterglowUnlocked)) profile.skills[id] = rank;
  }
  // A damaged/edited save cannot activate the second skill without the first.
  for (const item of Object.values(SKILLS)) if (item.requires && !profile.skills[item.requires]) delete profile.skills[item.id];
  for (const key of Object.keys(profile.stats)) profile.stats[key] = count(value?.stats?.[key]);
  profile.stats.wins = Math.min(profile.stats.wins, profile.stats.completedRuns);
  profile.bankedRuns = Array.isArray(value?.bankedRuns) ? [...new Set(value.bankedRuns.filter(v => typeof v === 'string'))].slice(-128) : [];
  profile.afterglow = profile.afterglowUnlocked ? energy(clamp(finite(value?.afterglow), 0, getAfterglowRules(profile.skills).cap)) : 0;
  profile.clearedFlights = count(value?.clearedFlights);
  profile.knownPowers = getPowerDiscovery(value).unlocked;
  profile.tutorialComplete = value?.tutorialComplete === true
    || (value?.tutorialComplete === undefined && profile.stats.completedRuns > 0);
  return profile;
}

function validRun(run) {
  if (!run || typeof run !== 'object' || typeof run.id !== 'string' || typeof run.seed !== 'string') return false;
  const stops = run.isTutorial === true ? 3 : 7;
  if (!PHASES.has(run.phase) || !Number.isInteger(run.step) || run.step < 0 || run.step > stops) return false;
  if (run.step === stops && !['ended', 'map-clear'].includes(run.phase)) return false;
  if (run.phase === 'map-clear' && (run.isTutorial || count(run.mapIndex) >= MAPS_PER_TIER - 1)) return false;
  if (!Array.isArray(run.map) || run.map.length !== stops || run.map.some((row, i) => !Array.isArray(row) || row.length < 1 || row.length > 3 || row.some(node => !node || node.row !== i || typeof node.id !== 'string' || !Object.hasOwn(TERRAINS, node.terrain) || !['flight', 'support', 'finale'].includes(node.type) || !Number.isFinite(node.bonusEmbers) || !Number.isFinite(node.challengeBonus)))) return false;
  const nodes = run.map.flat();
  if (new Set(nodes.map(node => node.id)).size !== nodes.length) return false;
  const starts = run.isTutorial === true ? 1 : 2;
  if (run.startNodeIds !== undefined && (!Array.isArray(run.startNodeIds) || run.startNodeIds.length !== starts || new Set(run.startNodeIds).size !== starts || run.startNodeIds.some(id => !run.map[0].some(node => node.id === id)))) return false;
  // Legacy saves have no adjacency. Keep those routes intact instead of rerolling an active expedition.
  for (const node of nodes) if (node.nextIds !== undefined) {
    if (!Array.isArray(node.nextIds) || node.nextIds.length > 2 || new Set(node.nextIds).size !== node.nextIds.length) return false;
    if (node.row < stops - 1 && !node.nextIds.length) return false;
    if (node.nextIds.some(id => !run.map[node.row + 1]?.some(next => next.id === id))) return false;
  }
  if (!Array.isArray(run.path) || run.path.length > stops || !Array.isArray(run.cards) || run.cards.length > 3 || new Set(run.cards).size !== run.cards.length || run.cards.some(id => !Object.hasOwn(CARDS, id))) return false;
  if (!Array.isArray(run.offers) || run.offers.some(id => !Object.hasOwn(CARDS, id)) || new Set(run.offers).size !== run.offers.length) return false;
  if ((!Number.isFinite(run.lives) && !Number.isFinite(run.hp)) || !Number.isFinite(run.embers) || !Number.isFinite(run.score)) return false;
  if (['briefing', 'support', 'reward', 'retry'].includes(run.phase) && (!run.current || !run.map[run.step]?.some(node => node.id === run.current.id))) return false;
  if (run.phase === 'support' && (!Array.isArray(run.supportChoices) || run.supportChoices.length !== 2)) return false;
  if (['starter', 'reward'].includes(run.phase) && run.offers.length !== 2) return false;
  return true;
}

function interruptForPractice(run) {
  if (!run.attemptActive) return;
  const restoredGlow = restoreAttemptEntry(run);
  run.lastAttempt = { success: false, interrupted: true, step: run.step,
    nodeId: run.current?.id, livesLost: 0, livesRemaining: run.lives, restoredGlow };
  run.phase = 'briefing';
}

// A suspended ascent is normalized without settling rewards or ending it.
// Practice must never turn a saved backup into a second wallet payment.
function cleanSuspendedRun(value, profile, practiceId) {
  if (!validRun(value) || value.isTutorial === true || value.phase === 'ended' || value.banked
    || value.id === practiceId || profile.bankedRuns.includes(value.id)) return null;
  const run = copy(value);
  run.companionRole = normalizeCompanionRole(run.companionRole);
  if (run.attemptEntry) run.attemptEntry.companionRole = normalizeCompanionRole(run.attemptEntry.companionRole ?? run.companionRole);
  run.companionTint = companionTint(run.companionTint, run.element);
  delete run.element;
  run.afterglowUnlocked = run.afterglowUnlocked === true;
  run.skills = cleanProfile({ skills: run.skills, afterglowUnlocked: run.afterglowUnlocked }).skills;
  run.lives = Number.isFinite(run.lives) ? count(run.lives, LIFE_TUNING.lives) : LIFE_TUNING.lives;
  run.maxLives = LIFE_TUNING.lives;
  delete run.hp; delete run.maxHp; delete run.shield; delete run.usedRebirth;
  run.flame = clamp(finite(run.flame, FLAME_TUNING.starting), 0, FLAME_TUNING.maximum);
  run.embers = count(run.embers); run.securedEmbers = count(run.securedEmbers); run.score = count(run.score);
  run.stats = { collected: 0, collisions: 0, boosts: 0, flights: 0, elites: 0, challenges: 0,
    events: 0, attempts: 0, deaths: 0, ...(run.stats || {}) };
  run.afterglow = run.afterglowUnlocked ? energy(clamp(finite(run.afterglow, profile.afterglow), 0, getAfterglowRules(run.skills).cap)) : 0;
  run.afterglowDrawStep = Number.isInteger(run.afterglowDrawStep) ? run.afterglowDrawStep : -1;
  run.afterglowPendingSpent = energy(run.afterglowPendingSpent);
  run.afterglowTotals = afterglowReport(run.afterglow, run.afterglowTotals);
  run.discoveryClears = count(run.discoveryClears ?? profile.clearedFlights);
  run.knownPowers = powerIds([...getPowerDiscovery(run).unlocked, ...run.cards, ...run.offers]);
  run.newlyDiscoveredPowers = powerIds(run.newlyDiscoveredPowers);
  normalizeFlightTuning(run);
  interruptForPractice(run);
  if (run.phase !== 'briefing') { run.attemptActive = false; run.attemptEntry = null; }
  assignLevelIdentities(run.map, run.seed);
  normalizeFlightLengths(run);
  if (run.phase === 'support') run.supportChoices = makeSupportChoices(run, profile);
  return run;
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
    let repairSave = (state.profile.rebirthRefunded && parsed.profile?.rebirthRefunded !== true)
      || Object.hasOwn(parsed.profile?.skills || {}, 'rebirth-spark') || Object.hasOwn(parsed.profile?.skills || {}, 'rebirth-grace')
      || Object.hasOwn(parsed.settings || {}, 'element') || Object.hasOwn(parsed.run || {}, 'element')
      || parsed.settings?.companionRole !== normalizeCompanionRole(parsed.settings?.companionRole);
    state.settings = { sound: parsed.settings?.sound !== false, reducedMotion: parsed.settings?.reducedMotion === true,
      companionTint: companionTint(parsed.settings?.companionTint, parsed.settings?.element),
      companionRole: normalizeCompanionRole(parsed.settings?.companionRole) };
    if (validRun(parsed.run)) {
      state.run = parsed.run;
      state.run.mapIndex = count(state.run.mapIndex, MAPS_PER_TIER - 1);
      state.run.difficulty = Math.max(1, count(state.run.difficulty));
      state.run.mapName = CAMPAIGN_MAP_NAMES[state.run.mapIndex];
      state.run.afterglowUnlocked = !state.run.isTutorial && state.run.afterglowUnlocked === true;
      state.run.companionTint = companionTint(parsed.run.companionTint, parsed.run.element);
      delete state.run.element;
      repairSave ||= state.run.companionRole !== normalizeCompanionRole(state.run.companionRole);
      state.run.companionRole = normalizeCompanionRole(state.run.companionRole);
      if (state.run.attemptEntry) state.run.attemptEntry.companionRole = normalizeCompanionRole(state.run.attemptEntry.companionRole ?? state.run.companionRole);
      for (const node of [...state.run.map.flat(), ...(state.run.current ? [state.run.current] : [])]) {
        if (node.draftTags) node.draftTags = node.draftTags.map(tag => tag === 'Wing' ? 'Drift' : tag);
        if (node.draftTheme) node.draftTheme = node.draftTheme.replace(/Wing/g, 'Drift');
        if (node.name) node.name = node.name.replace(/Phoenix Gate/g, 'Hollow Gate');
        if (node.challenge) node.challenge = node.challenge.replace(/wisps|sparks/g, 'light packets');
        if (node.challengeId === 'boosts') node.challenge = `Use ability ${count(node.challengeTarget) || 2} times`;
        if (node.description) node.description = node.description.replace(/Restore health and refill Flame/g, 'Refill Glow');
        if (!state.run.isTutorial && node.type !== 'support') {
          const bonus = completionReward(node, getAscentInfo(node).level);
          repairSave ||= node.bonusEmbers !== bonus;
          node.bonusEmbers = bonus;
          node.reward = flightRewardPreview(node);
        }
        if (state.run.fuelRevision !== 2 && node.type !== 'support' && ROUTE_PROFILES[node.routeStyle]) {
          const profile = ROUTE_PROFILES[node.routeStyle];
          node.fuelBonus = node.type === 'finale' ? 1 : profile.fuelBonus;
          node.fuelPreview = profile.fuelPreview;
          node.riskPreview = profile.riskPreview;
          if (node.challengeId === 'wisps') {
            node.challengeTarget = 4 + Math.floor(node.row / 2);
            node.challenge = `Collect ${node.challengeTarget} light packets`;
          }
        }
      }
      const locationsChanged = assignLevelIdentities(state.run.map, state.run.seed);
      if (state.run.current) {
        const locationNode = state.run.map.flat().find(node => node.id === state.run.current.id);
        if (locationNode) for (const key of ['levelId', 'locationName', 'setpiecePreview', 'name']) {
          if (locationNode[key] !== undefined) state.run.current[key] = locationNode[key];
        }
      }
      repairSave ||= locationsChanged;
      state.run.fuelRevision = 2;
      state.run.skills = cleanProfile({ skills: parsed.run.skills, afterglowUnlocked: state.run.afterglowUnlocked }).skills;
      const legacyLifeFields = state.run.hp !== undefined || state.run.maxHp !== undefined || state.run.shield !== undefined || state.run.usedRebirth !== undefined;
      state.run.lives = Number.isFinite(state.run.lives) ? count(state.run.lives, LIFE_TUNING.lives)
        : state.run.phase === 'ended' && !state.run.success ? 0 : LIFE_TUNING.lives;
      state.run.maxLives = LIFE_TUNING.lives;
      delete state.run.hp; delete state.run.maxHp; delete state.run.shield; delete state.run.usedRebirth;
      repairSave ||= legacyLifeFields;
      state.run.flame = clamp(Number.isFinite(state.run.flame) ? state.run.flame : FLAME_TUNING.maximum, 0, FLAME_TUNING.maximum);
      state.run.embers = count(state.run.embers);
      state.run.securedEmbers = count(state.run.securedEmbers);
      state.run.pendingRewards = (Array.isArray(state.run.pendingRewards) ? state.run.pendingRewards : [])
        .filter(reward => reward && typeof reward.kind === 'string' && Number.isFinite(reward.amount) && reward.amount > 0)
        .slice(-24).map(reward => ({ kind: reward.kind, nodeId: typeof reward.nodeId === 'string' ? reward.nodeId : null,
          amount: count(reward.amount) }));
      state.run.score = count(state.run.score);
      state.run.stats = { collected: 0, collisions: 0, boosts: 0, flights: 0, elites: 0, challenges: 0, events: 0, attempts: 0, deaths: 0, ...(state.run.stats || {}) };
      state.run.isTutorial = state.run.isTutorial === true;
      state.run.afterglowPractice = state.run.isTutorial;
      const reserveRules = getAfterglowRules(state.run.skills);
      state.run.afterglow = state.run.afterglowUnlocked ? energy(clamp(Number.isFinite(state.run.afterglow) ? state.run.afterglow
        : state.profile.afterglow, 0, reserveRules.cap)) : 0;
      state.run.afterglowDrawStep = Number.isInteger(state.run.afterglowDrawStep) && state.run.afterglowDrawStep >= 0
        && state.run.afterglowDrawStep < state.run.map.length ? state.run.afterglowDrawStep : -1;
      state.run.afterglowPendingSpent = energy(state.run.afterglowPendingSpent);
      state.run.afterglowTotals = afterglowReport(state.run.afterglow, state.run.afterglowTotals);
      state.run.afterglowLossApplied = state.run.afterglowLossApplied === true;
      const legacyDiscovery = !Array.isArray(state.run.knownPowers);
      const priorSuccesses = Math.max(0, count(state.run.stats.flights) - (state.run.phase === 'ended' && !state.run.success ? 1 : 0));
      state.run.discoveryClears = count(state.run.discoveryClears ?? (state.profile.clearedFlights + (state.run.isTutorial ? 0 : priorSuccesses)));
      state.run.knownPowers = powerIds([...(legacyDiscovery ? Object.keys(CARDS) : getPowerDiscovery(state.run).unlocked), ...state.run.cards, ...state.run.offers]);
      state.run.newlyDiscoveredPowers = powerIds(state.run.newlyDiscoveredPowers);
      if (state.run.lastFlight) {
        state.run.lastFlight.afterglow = afterglowReport(state.run.afterglow, state.run.lastFlight.afterglow);
        state.run.lastFlight.unlockedPowers = powerIds(state.run.lastFlight.unlockedPowers);
        state.run.lastFlight.securedEmbers = count(state.run.lastFlight.securedEmbers);
        state.run.lastFlight.pickupEmbers = count(state.run.lastFlight.pickupEmbers ?? state.run.lastFlight.embers);
      }
      const migrateTuning = !state.run.flightTuning || !Array.isArray(state.run.tuningRestRows)
        || typeof state.run.tuningRestReady !== 'boolean';
      normalizeFlightTuning(state.run);
      repairSave ||= migrateTuning;
      if (state.run.attemptActive && !state.run.banked && state.run.phase === 'briefing') {
        const restoredGlow = restoreAttemptEntry(state.run);
        state.run.lastAttempt = { success: false, interrupted: true, step: state.run.step,
          nodeId: state.run.current?.id, livesLost: 0, livesRemaining: state.run.lives, restoredGlow };
        state.run.phase = 'briefing';
        repairSave = true;
      } else if (state.run.phase !== 'briefing') {
        state.run.attemptActive = false;
        state.run.attemptEntry = null;
      }
      repairSave = normalizeFlightLengths(state.run) || repairSave;
      const legacyLedger = state.run.rewardLedgerVersion !== REWARD_LEDGER_VERSION;
      if (state.profile.bankedRuns.includes(state.run.id) || state.run.banked) {
        repairSave ||= legacyLedger || state.run.embers > 0 || state.run.banked !== true;
        if (legacyLedger) state.run.securedEmbers = count(state.run.securedEmbers || state.run.embers);
        state.run.banked = true;
        state.run.embers = 0;
        state.run.pendingRewards = [];
        state.run.rewardLedgerVersion = REWARD_LEDGER_VERSION;
      } else if (state.run.phase === 'ended') {
        // Old endings had not yet secured their purse. Resolve that document
        // once; the wallet and the banked-run marker share the same save.
        if (legacyLedger || state.run.success) settleCheckpoint(state);
        bankRun(state);
        repairSave = true;
      } else {
        const secured = settleCheckpoint(state);
        repairSave ||= legacyLedger || secured > 0;
      }
      if (state.run.phase === 'support') state.run.supportChoices = makeSupportChoices(state.run, state.profile);
    }
    if (state.run?.isTutorial === true && parsed.suspendedRun) {
      state.suspendedRun = cleanSuspendedRun(parsed.suspendedRun, state.profile, state.run.id);
      repairSave = true;
    } else if (parsed.suspendedRun) repairSave = true;
    if (repairSave) saveState(state, storage);
    return state;
  } catch { return newState(); }
}

const EVENT_NAMES = EVENT_SCENARIOS.map(event => event.name);
export const ROUTE_PROFILES = Object.freeze({
  refuge: { routeStyle: 'refuge', passage: 'open', fuelCadence: 2, fuelBonus: 2, flameDrain: 0.92, routeReward: 1, durationScale: 1, draftTags: ['Wisp', 'Ash'], fuelPreview: 'Measured light packets · +2 Glow each', riskPreview: 'Open passages · deliberate edge packets' },
  cavern: { routeStyle: 'cavern', passage: 'cavern', fuelCadence: 3, fuelBonus: 0, flameDrain: 1.08, routeReward: 1.25, durationScale: 0.80, draftTags: ['Drift', 'Wisp'], fuelPreview: 'Spaced light packets · conserve Lift', riskPreview: 'Short cave route · tighter roof and floor' },
  gauntlet: { routeStyle: 'gauntlet', passage: 'gauntlet', fuelCadence: 4, fuelBonus: 1, flameDrain: 1, routeReward: 1.45, durationScale: 0.90, draftTags: ['Flame', 'Drift'], fuelPreview: 'Lean light packets · time your ability between them', riskPreview: 'Elite passages · richest ember rewards' },
});

function assignLevelIdentities(rows, seed) {
  const visits = { ruins: 0, canopy: 0, storm: 0 };
  let changed = false;
  for (const node of rows.flat()) {
    if (node.type === 'support') continue;
    const offset = visits[node.terrain]++;
    const practice = node.tutorialLesson === 'glide' ? 'ruins-aqueduct'
      : node.tutorialLesson === 'wind' ? 'storm-ridge' : null;
    const level = LEVELS.find(item => item.id === (practice || node.levelId) && item.terrain === node.terrain)
      || getLevelIdentity(node.terrain, seed, offset);
    const practiceName = node.tutorialLesson === 'wind' ? 'Cross a Draft' : node.name;
    const fields = { levelId: level.id, locationName: practice ? practiceName : node.boss ? 'Hollow Warden' : level.name,
      setpiecePreview: node.tutorialLesson === 'wind' ? 'Practice · one gentle draft puff' : practice ? node.setpiecePreview || 'Practice · open passages' : level.signature,
      name: practice ? practiceName : node.boss ? 'Hollow Warden' : node.type === 'finale' ? `${level.name} · Map Exit` : level.name,
      ...(node.tutorialLesson === 'wind' ? { description: 'One gentle draft puff nudges only inside its visible area. Fly around it or try your companion ability in clear air.' } : {}) };
    for (const [key, value] of Object.entries(fields)) {
      if (node[key] !== value) { node[key] = value; changed = true; }
    }
  }
  return changed;
}

function makeMap(seed, mapIndex = 0, difficulty = 1, afterglowUnlocked = false) {
  const rng = randomFor(`${seed}|map`);
  const terrains = shuffled(Object.keys(TERRAINS), rng);
  const events = shuffled(Array.from({ length: EVENT_NAMES.length }, (_, i) => i), rng);
  const rows = Array.from({ length: 7 }, (_, row) => (row === 0 ? [0, 1] : row === 6 ? [1] : [0, 1, 2]).map(lane => {
    const terrain = terrains[(Math.floor(row / 2) + lane) % terrains.length];
    const support = row === 1 || row === 4;
    const finale = row === 6;
    const boss = finale && mapIndex === MAPS_PER_TIER - 1;
    const routeStyle = lane === 0 ? 'refuge' : lane === 1 ? 'cavern' : 'gauntlet';
    const profile = ROUTE_PROFILES[routeStyle];
    const elite = !support && !finale && lane === 2;
    const kind = support ? lane === 0 ? 'camp' : lane === 2 ? 'shrine' : 'event' : finale ? 'finale' : elite ? 'elite' : 'normal';
    const eventIndex = events[row === 1 ? 0 : 1];
    const draftTags = support ? [] : [...profile.draftTags];
    const draftTheme = draftTags.join(' + ');
    const challengeId = routeStyle === 'refuge' ? 'wisps' : routeStyle === 'cavern' ? 'clean' : 'boosts';
    const challengeTarget = (challengeId === 'wisps' ? 4 + Math.floor(row / 2) : challengeId === 'boosts' ? 2 : 0) * LEVEL_LENGTH.multiplier;
    const challenge = challengeId === 'wisps' ? `Collect ${challengeTarget} light packets` : challengeId === 'boosts' ? `Use ability ${challengeTarget} times` : 'Finish without a hit';
    const routeName = { refuge: 'Ember Refuge', cavern: 'Crystal Cavern', gauntlet: 'Flame Gauntlet' }[routeStyle];
    const baseDuration = row === 0 ? 34 : 38 + row * 2;
    const depth = getAscentInfo({ row, type: finale ? 'finale' : support ? 'support' : 'flight' }).level;
    const bonusEmbers = support ? 0 : completionReward({ type: finale ? 'finale' : 'flight', elite, flightLengthScale: LEVEL_LENGTH.multiplier }, depth);
    return {
      id: `m${mapIndex}-n-${row}-${['a', 'b', 'c'][lane]}`, row, lane, nextIds: [],
      mapIndex, difficulty, afterglowUnlocked, boss, bossId: boss ? 'hollow-warden' : null,
      type: support ? 'support' : finale ? 'finale' : 'flight', kind, terrain, elite, draftTags, draftTheme,
      routeStyle, passage: profile.passage, fuelCadence: finale ? 3 : profile.fuelCadence,
      fuelBonus: finale ? 1 : profile.fuelBonus, flameDrain: finale ? 1 : profile.flameDrain,
      routeReward: finale ? 1.25 : profile.routeReward,
      fuelPreview: support ? lane === 0 ? 'Full Flame refill available' : lane === 2 ? 'Fuel or a new card' : 'Preview the event before committing' : finale ? 'Balanced fuel · final ascent' : profile.fuelPreview,
      riskPreview: support ? lane === 0 ? 'Recover before the next fork' : lane === 2 ? 'Build strength before the next flight' : 'A resource trade or fresh opportunity' : boss ? 'Hollow Warden · the final confrontation' : finale ? 'Clear this map and continue the ascent' : profile.riskPreview,
      name: support ? lane === 0 ? 'Emberwell Camp' : lane === 2 ? 'Lightkeeper Shrine' : EVENT_NAMES[eventIndex] : finale ? `${TERRAINS[terrain].name} · Ascension` : `${routeName} · ${TERRAINS[terrain].name}`,
      description: support ? lane === 0 ? 'Refill Glow or gather embers. This fork keeps the refuge and cavern routes open.' : lane === 2 ? 'A Lightkeeper offers fuel or new inspiration. The next fork leads toward refuge or an elite passage.' : 'A branching encounter opens the cavern and elite routes. Preview the trade before choosing.' : finale ? `${TERRAINS[terrain].description} Conserve enough Glow for the last climb.` : `${TERRAINS[terrain].description} ${profile.riskPreview}. ${profile.fuelPreview}.`,
      duration: support ? 0 : (finale ? 55 : Math.round(baseDuration * profile.durationScale)) * LEVEL_LENGTH.multiplier,
      flightLengthScale: support ? 1 : LEVEL_LENGTH.multiplier,
      eventIndex: support && lane === 1 ? eventIndex : null,
      challenge: support ? '' : challenge,
      challengeId: support ? '' : challengeId,
      challengeTarget: support ? 0 : challengeTarget,
      challengeBonus: support ? 0 : 8 * LEVEL_LENGTH.multiplier,
      performanceBonusCap: support ? 0 : 8 * LEVEL_LENGTH.multiplier,
      bonusEmbers,
      reward: support ? lane === 0 ? 'Full refill or 18 embers + 22 Glow' : lane === 2 ? '40 Glow + 10 embers or a card draft' : 'A choice of boons and bargains' : `${bonusEmbers} clear embers · up to ${8 * LEVEL_LENGTH.multiplier} score bonus · ${boss ? 'defeat the Hollow Warden' : finale ? 'clear this map' : `${draftTheme} card draft`}`,
    };
  }));
  for (let row = 0; row < rows.length - 1; row++) for (const node of rows[row]) {
    const next = rows[row + 1];
    const lanes = node.lane === 0 ? [0, 1] : node.lane === 1 ? [1, 2] : [0, 2];
    node.nextIds = next.length === 1 ? [next[0].id] : lanes.map(lane => next.find(item => item.lane === lane).id);
  }
  assignLevelIdentities(rows, seed);
  return rows;
}

function draft(run, label) {
  if (run.isTutorial && label === 'flight-reward' && run.step === 0) return ['soft-descent', 'hungry-wisp'];
  recordPowerDiscovery(run, getPowerDiscovery(run).unlocked);
  let available = run.knownPowers.filter(id => !run.cards.includes(id));
  // A saved three-slot build or an extra support draft must still receive two
  // valid choices. Early emergency discoveries remain earned and persistent.
  for (const milestone of POWER_DISCOVERY) {
    if (available.length >= 2) break;
    recordPowerDiscovery(run, milestone.ids);
    available = run.knownPowers.filter(id => !run.cards.includes(id));
  }
  if (label === 'flight-reward' && run.current?.draftTags?.length) {
    const themed = available.filter(id => run.current.draftTags.includes(CARDS[id].tag));
    if (themed.length >= 2) available = themed;
  }
  return shuffled(available, randomFor(`${run.seed}|${label}|${run.step}|${run.path.join('.')}`)).slice(0, 2);
}

export function createRun(profile = newState().profile, seed = freshSeed()) {
  const normalizedSeed = String(seed).trim().slice(0, 80) || 'emberwing';
  const departure = cleanProfile(profile), skills = departure.skills;
  const mapIndex = 0, difficulty = departure.difficulty;
  const mapSeed = `${normalizedSeed}|tier:${difficulty}|map:0`;
  const run = {
    id: `${normalizedSeed}-${freshSeed()}`, campaignSeed: normalizedSeed, seed: mapSeed,
    mapIndex, difficulty, mapName: CAMPAIGN_MAP_NAMES[0], mapHistory: [], bossDefeated: false,
    step: 0, map: makeMap(mapSeed, mapIndex, difficulty, departure.afterglowUnlocked), path: [], current: null,
    cards: [], skills, companionTint: 'pearl', companionRole: 'swift', lives: LIFE_TUNING.lives, maxLives: LIFE_TUNING.lives,
    flame: FLAME_TUNING.starting, embers: 0, securedEmbers: 0, pendingRewards: [], rewardLedgerVersion: REWARD_LEDGER_VERSION,
    score: 0, attemptActive: false, attemptEntry: null,
    offers: [], phase: 'starter', success: false, banked: false, supportChoices: [], fuelRevision: 2, lengthVersion: LEVEL_LENGTH.version,
    afterglow: departure.afterglow, afterglowUnlocked: departure.afterglowUnlocked,
    afterglowJustUnlocked: false, afterglowDrawStep: -1, afterglowPendingSpent: 0,
    afterglowTotals: afterglowReport(departure.afterglow), afterglowLossApplied: false, afterglowPractice: false,
    discoveryClears: departure.clearedFlights, knownPowers: [...departure.knownPowers], newlyDiscoveredPowers: [],
    flightTuning: { ...FLIGHT_POINTS_TUNING.defaultAllocation }, tuningCarryBudget: FLIGHT_POINTS_TUNING.starting,
    tuningRestRows: [], tuningRestReady: true, tuningLastGrant: null,
    stats: { collected: 0, collisions: 0, boosts: 0, flights: 0, elites: 0, challenges: 0, events: 0, attempts: 0, deaths: 0 },
  };
  run.mapVersion = 2;
  run.startNodeIds = run.map[0].map(node => node.id);
  run.offers = draft(run, 'starter');
  return run;
}

export function createTutorial(profile = newState().profile, seed = freshSeed()) {
  const run = createRun(profile, seed);
  const original = run.map;
  const first = { ...copy(original[0][0]), id: 'tutorial-glide', row: 0, lane: 1,
    type: 'flight', kind: 'normal', terrain: 'ruins', name: 'First Light', duration: 22, flightLengthScale: 1, performanceBonusCap: 0,
    tutorialLesson: 'glide', levelId: 'ruins-aqueduct', locationName: 'First Light', setpiecePreview: 'Practice · open terraces',
    elite: false, routeStyle: 'refuge', passage: 'open',
    fuelCadence: 2, fuelBonus: 0, flameDrain: 1, routeReward: 1,
    description: 'Lift, glide, and collect a visible light packet. This is a practice flight.',
    reward: 'Choose a practice power', bonusEmbers: 0, challengeBonus: 0,
    challenge: '', challengeId: '', challengeTarget: 0,
    nextIds: ['tutorial-checkpoint'] };
  const checkpoint = { ...copy(original[1][0]), id: 'tutorial-checkpoint', row: 1, lane: 1,
    type: 'support', kind: 'camp', terrain: 'ruins', name: 'A Quiet Ember', duration: 0,
    tutorialLesson: 'preparation', description: 'Prepare your companion and tuning before the next practice flight.',
    reward: 'Prepare for a local draft', bonusEmbers: 0, challengeBonus: 0,
    nextIds: ['tutorial-wind'] };
  const finale = { ...copy(original[6][0]), id: 'tutorial-wind', row: 2, lane: 1,
    type: 'finale', kind: 'finale', terrain: 'storm', name: 'Cross a Draft', duration: 26, flightLengthScale: 1, performanceBonusCap: 0,
    tutorialLesson: 'wind', levelId: 'storm-ridge', locationName: 'Cross a Draft', setpiecePreview: 'Practice · one gentle draft puff',
    elite: false, routeStyle: 'refuge', passage: 'open',
    fuelCadence: 2, fuelBonus: 0, flameDrain: 1, routeReward: 1,
    description: 'One gentle draft puff nudges only inside its visible area. Fly around it or try your companion ability in clear air.',
    reward: 'Finish the practice journey', bonusEmbers: 0, challengeBonus: 0,
    challenge: '', challengeId: '', challengeTarget: 0, nextIds: [] };
  run.isTutorial = true;
  run.afterglowUnlocked = false;
  run.flightTuning = tuningAllocation({}, 0);
  run.tuningRestRows = [];
  run.tuningRestReady = false;
  run.tuningLastGrant = null;
  run.afterglowPractice = true;
  run.afterglow = 0;
  run.afterglowTotals = afterglowReport(run.afterglow);
  run.map = [[first], [checkpoint], [finale]];
  run.startNodeIds = [first.id];
  run.phase = 'map';
  run.offers = [];
  run.cards = [];
  run.lives = run.maxLives = LIFE_TUNING.lives;
  run.flame = 80;
  run.knownPowers = powerIds([...run.knownPowers, 'hungry-wisp']);
  return run;
}

/** Enter practice without abandoning or cashing out an active normal ascent. */
export function startTutorial(state) {
  if (!state?.profile) return false;
  const current = state.run;
  if (current?.isTutorial && current.phase !== 'ended') return false;
  if (current?.isTutorial) bankRun(state);
  else {
    state.suspendedRun = current && current.phase !== 'ended' && !current.banked ? copy(current) : null;
    if (state.suspendedRun) interruptForPractice(state.suspendedRun);
  }
  const tutorial = createTutorial(state.profile);
  tutorial.companionRole = normalizeCompanionRole(state.settings?.companionRole);
  tutorial.companionTint = companionTint(state.settings?.companionTint, state.settings?.element);
  state.run = tutorial;
  return true;
}

/** Leaving unfinished practice does not mark it complete or consume normal lives. */
export function leaveTutorial(state) {
  if (!state?.run?.isTutorial) return false;
  const practice = state.run;
  if (practice.phase !== 'ended') {
    if (practice.attemptActive) restoreAttemptEntry(practice);
    practice.phase = 'ended';
    practice.success = false;
  }
  bankRun(state);
  state.run = state.suspendedRun || null;
  state.suspendedRun = null;
  return true;
}

export function advanceMap(run) {
  if (!run || run.isTutorial || run.phase !== 'map-clear' || run.attemptActive || run.banked
    || count(run.lives) <= 0 || count(run.mapIndex) >= MAPS_PER_TIER - 1) return false;
  const budget = tuningBudget(run);
  run.mapHistory ??= [];
  run.mapHistory.push({ mapIndex: run.mapIndex, mapName: run.mapName, seed: run.seed,
    lives: run.lives, score: run.score, securedEmbers: run.securedEmbers });
  run.mapIndex += 1;
  run.mapName = CAMPAIGN_MAP_NAMES[run.mapIndex];
  run.seed = `${run.campaignSeed || run.seed}|tier:${run.difficulty}|map:${run.mapIndex}`;
  run.map = makeMap(run.seed, run.mapIndex, run.difficulty, run.afterglowUnlocked);
  run.startNodeIds = run.map[0].map(node => node.id);
  run.step = 0; run.path = []; run.current = null;
  run.offers = []; run.supportChoices = [];
  run.attemptActive = false; run.attemptEntry = null; run.lastAttempt = null;
  run.afterglowDrawStep = -1; run.afterglowPendingSpent = 0;
  run.tuningCarryBudget = budget; run.tuningRestRows = [];
  run.tuningRestReady = false; run.tuningLastGrant = null;
  run.flightTuning = tuningAllocation(run.flightTuning, budget);
  run.phase = 'map'; run.success = false;
  return true;
}

export function getChoices(run) {
  if (!run || run.phase !== 'map' || run.step >= run.map.length) return [];
  const prior = run.path.map(id => run.map.flat().find(node => node.id === id)).filter(node => node && node.row < run.step);
  const completed = prior.filter(node => node.type !== 'support');
  const previousElite = completed.at(-1)?.elite === true;
  const previous = prior.at(-1);
  const reachable = run.step === 0 ? run.startNodeIds : previous?.nextIds;
  return run.map[run.step].filter(node => (!Array.isArray(reachable) || reachable.includes(node.id)) && !(previousElite && node.elite));
}

export function applyStarter(run, cardId) {
  if (!run || run.phase !== 'starter' || !run.offers.includes(cardId)) return false;
  run.cards = [cardId];
  run.offers = [];
  run.phase = 'map';
  return true;
}

export function selectNode(run, nodeId) {
  const node = getChoices(run).find(item => item.id === nodeId);
  if (!node) return false;
  run.current = node;
  run.path = run.path.filter(id => run.map.flat().some(previous => previous.id === id && previous.row < run.step));
  run.path.push(node.id);
  run.phase = node.type === 'support' ? 'support' : 'briefing';
  run.offers = [];
  if (node.type === 'support') {
    grantRestTuning(run, node.row);
    run.supportChoices = makeSupportChoices(run);
  }
  return true;
}

function advance(run) {
  run.step += 1;
  run.current = null;
  run.offers = [];
  run.supportChoices = [];
  run.phase = run.step >= run.map.length ? 'ended' : 'map';
}

/** Pass null (or 'skip') to keep a full loadout and receive eight embers. */
export function takeCard(run, cardId, replaceIndex = null) {
  if (!run || run.phase !== 'reward') return false;
  if (cardId == null || cardId === 'skip') {
    queueReward(run, 8, 'draft-skip');
    advance(run);
    return true;
  }
  if (!run.offers.includes(cardId) || !Object.hasOwn(CARDS, cardId) || run.cards.includes(cardId)) return false;
  if (run.cards.length < 3) run.cards.push(cardId);
  else {
    if (!Number.isInteger(replaceIndex) || replaceIndex < 0 || replaceIndex > 2) return false;
    run.cards[replaceIndex] = cardId;
  }
  advance(run);
  return true;
}

function restoreAttemptEntry(run) {
  const entry = run.attemptEntry;
  if (entry && entry.step === run.step && entry.nodeId === run.current?.id) {
    const attempts = count(run.stats?.attempts), deaths = count(run.stats?.deaths);
    run.companionRole = normalizeCompanionRole(typeof entry.companionRole === 'string'
      && (entry.companionRole === 'scout' || Object.hasOwn(COMPANION_ABILITIES, entry.companionRole)) ? entry.companionRole : run.companionRole);
    run.flame = clamp(finite(entry.startGlow, run.flame), 0, FLAME_TUNING.maximum);
    run.afterglow = energy(entry.afterglow);
    run.afterglowDrawStep = entry.afterglowDrawStep;
    run.afterglowPendingSpent = energy(entry.pendingSpent);
    run.afterglowTotals = afterglowReport(run.afterglow, entry.totals);
    run.embers = count(entry.embers);
    run.pendingRewards = copy(entry.pendingRewards || []);
    run.score = count(entry.score);
    run.discoveryClears = count(entry.discoveryClears);
    run.knownPowers = powerIds(entry.knownPowers);
    run.newlyDiscoveredPowers = powerIds(entry.newlyDiscoveredPowers);
    run.stats = { ...(entry.stats || {}), attempts, deaths };
    if (entry.flightTuning) run.flightTuning = tuningAllocation(entry.flightTuning, tuningBudget(run));
    if (entry.lastFlight) run.lastFlight = copy(entry.lastFlight);
    else delete run.lastFlight;
  }
  run.attemptActive = false;
  run.attemptEntry = null;
  run.tuningRestReady = false;
  return run.flame;
}

export function beginFlightAttempt(run) {
  if (!run || run.phase !== 'briefing' || run.attemptActive || run.banked || count(run.lives) <= 0
    || !run.current || run.current.type === 'support') return false;
  run.flightTuning = tuningAllocation(run.flightTuning, tuningBudget(run));
  run.tuningRestReady = false;
  run.attemptEntry = { step: run.step, nodeId: run.current.id,
    companionRole: normalizeCompanionRole(run.companionRole), flightTuning: { ...run.flightTuning }, tuningRestReady: false,
    startGlow: run.flame, afterglow: run.afterglow, afterglowDrawStep: run.afterglowDrawStep,
    pendingSpent: run.afterglowPendingSpent, totals: copy(run.afterglowTotals || afterglowReport(run.afterglow)),
    embers: run.embers, pendingRewards: copy(run.pendingRewards || []), score: run.score, discoveryClears: run.discoveryClears,
    knownPowers: [...run.knownPowers], newlyDiscoveredPowers: [...(run.newlyDiscoveredPowers || [])],
    stats: copy(run.stats), lastFlight: run.lastFlight ? copy(run.lastFlight) : null };
  run.attemptActive = true;
  run.stats.attempts = count(run.stats.attempts) + 1;
  return true;
}

export function retryFlight(run) {
  if (!run || run.phase !== 'retry' || run.attemptActive || count(run.lives) <= 0 || !run.current) return false;
  run.tuningRestReady = false;
  run.phase = 'briefing';
  return true;
}

export function finishFlight(run, result) {
  if (!run || run.phase !== 'briefing' || !run.attemptActive || !run.current || run.current.type === 'support' || !result || typeof result.success !== 'boolean') return false;
  if (!result.success) {
    const restoredGlow = restoreAttemptEntry(run);
    run.lives = Math.max(0, count(run.lives, LIFE_TUNING.lives) - 1);
    run.stats.deaths = count(run.stats.deaths) + 1;
    run.success = false;
    run.offers = [];
    run.lastAttempt = { success: false, interrupted: false, step: run.step, nodeId: run.current.id,
      livesLost: 1, livesRemaining: run.lives, restoredGlow };
    run.phase = run.lives > 0 ? 'retry' : 'ended';
    return true;
  }
  const node = run.current;
  const success = true;
  run.attemptActive = false;
  run.attemptEntry = null;
  run.lastAttempt = { success: true, step: run.step, nodeId: node.id, livesLost: 0, livesRemaining: run.lives };
  const remainingFlame = clamp(Number.isFinite(result.flame) ? result.flame : run.flame ?? FLAME_TUNING.maximum, 0, FLAME_TUNING.maximum);
  const rules = getAfterglowRules(run.skills);
  const reserveEnabled = run.afterglowUnlocked === true && !run.isTutorial;
  run.afterglow = reserveEnabled ? energy(clamp(finite(run.afterglow), 0, rules.cap)) : 0;
  let stored = 0, rawStored = 0;
  if (reserveEnabled && success && remainingFlame > AFTERGLOW_TUNING.surplusThreshold && run.afterglow < rules.cap) {
    const surplus = remainingFlame - AFTERGLOW_TUNING.surplusThreshold;
    stored = Math.min(rules.cap - run.afterglow, Math.floor(surplus * rules.retention * 1000) / 1000);
    rawStored = Math.min(surplus, Math.ceil(stored / rules.retention * 1000) / 1000);
    run.afterglow = energy(run.afterglow + stored);
  }
  const postStorage = energy(remainingFlame - rawStored);
  const terminalFinale = node.type === 'finale' && (run.isTutorial || node.boss);
  run.flame = success && !terminalFinale ? Math.max(FLAME_TUNING.checkpointMinimum, postStorage) : postStorage;
  run.afterglowTotals = afterglowReport(run.afterglow, run.afterglowTotals);
  run.afterglowTotals.stored = energy(run.afterglowTotals.stored + stored);
  run.afterglowTotals.rawStored = energy(run.afterglowTotals.rawStored + rawStored);
  run.score += count(result.score);
  run.stats.flights += 1;
  run.stats.elites += node.elite ? 1 : 0;
  run.stats.collected += count(result.collected);
  run.stats.collisions += count(result.collisions);
  run.stats.boosts += count(result.boosts);
  for (const key of ['nearMisses', 'gustSeconds', 'baseEmbers']) run.stats[key] = finite(run.stats[key]) + count(result.stats?.[key]);
  const challengeComplete = success && result.challengeComplete === true;
  if (challengeComplete && !run.isTutorial) {
    run.stats.challenges += 1;
  }
  const completionBonus = run.isTutorial ? 0 : completionReward(node, flightDepth(run, node));
  const flightLengthScale = getLevelLengthScale(node);
  const performanceBonusCap = run.isTutorial ? 0 : 8 * flightLengthScale;
  const performanceBonus = run.isTutorial ? 0 : Math.min(performanceBonusCap, Math.floor(count(result.score) / 100));
  const pickupEmbers = run.isTutorial ? 0 : count(result.embers);
  const challengeBonus = challengeComplete && !run.isTutorial ? count(node.challengeBonus) : 0;
  queueReward(run, completionBonus + performanceBonus + pickupEmbers + challengeBonus, 'flight', node.id);
  let unlockedPowers = [];
  if (success && !run.isTutorial) {
    run.discoveryClears = count(run.discoveryClears) + 1;
    unlockedPowers = recordPowerDiscovery(run, getPowerDiscovery(run).unlocked);
  }
  run.lastFlight = { success, nodeId: node.id, step: run.step, depth: flightDepth(run, node), terrain: node.terrain, elite: node.elite,
    mapIndex: run.mapIndex, difficulty: run.difficulty, boss: node.boss === true,
    embers: pickupEmbers, pickupEmbers, completionBonus, performanceBonus, performanceBonusCap,
    flightLengthScale, challengeBonus, securedEmbers: 0,
    score: count(result.score), collected: count(result.collected), flame: remainingFlame,
    recoveredFlame: Math.max(0, run.flame - postStorage), unlockedPowers,
    afterglow: afterglowReport(run.afterglow, { stored, rawStored, spent: run.afterglowPendingSpent }) };
  run.afterglowPendingSpent = 0;
  if (node.type === 'finale') {
    const campaignComplete = run.isTutorial || node.boss === true;
    run.phase = campaignComplete ? 'ended' : 'map-clear';
    run.success = campaignComplete;
    if (!run.isTutorial && node.boss) run.bossDefeated = true;
    run.step = run.map.length;
    run.offers = [];
  } else {
    run.phase = 'reward';
    run.offers = draft(run, 'flight-reward');
  }
  return true;
}

const choice = (id, title, description, effect, detail = description) => ({ id, title, description, detail, effect });
function makeSupportChoices(run, profile = null) {
  const wallet = count(profile ? profile.embers : run.embers);
  const walletLabel = profile ? 'saved embers' : 'run embers';
  const reserveChoice = (id, title, amount) => {
    if (!run.afterglowUnlocked || run.isTutorial) return choice(id, 'Gather spare embers', 'Gain 12 embers.', { embers: 12 });
    const gain = energy(Math.min(amount, Math.max(0, getAfterglowRules(run.skills).cap - finite(run.afterglow))));
    return gain > 0 ? choice(id, title, `Store ${Math.round(gain * 100) / 100} Glow for later flights.`, { afterglow: gain })
      : choice(id, 'Gather the remaining embers', 'Your reserve is full. Gain 12 embers instead.', { embers: 12 });
  };
  const refill = choice('rest', 'Refill your Glow', 'Refill Glow to 100 before the next flight.', { flame: 100 });
  if (run.isTutorial) return [
    choice('practice-glow', 'Gather a little light', 'Recover 12 practice Glow before the draft flight.', { flame: 12 }),
    choice('practice-draft', 'Try another power', 'Choose a temporary practice power and recover 8 Glow.', { draft: true, flame: 8 }),
  ];
  if (run.current.kind === 'camp') return [
    finite(run.flame) < FLAME_TUNING.maximum ? refill : reserveChoice('rest', 'Seal a little Afterglow', 10),
    choice('gather', 'Gather the glow', 'Gain 18 embers and recover 22 Flame.', { embers: 18, flame: 22 }),
  ];
  if (run.current.kind === 'shrine') return [
    choice('shrine-fuel', 'Stoke the inner flame', 'Recover 40 Flame and gain 10 embers before the next fork.', { flame: 40, embers: 10 }),
    choice('shrine-inspiration', 'Read the rising light', 'Choose a temporary card and recover 8 Glow. Keep a reserve for the next passage.', { draft: true, flame: 8 }),
  ];
  switch (run.current.eventIndex) {
    case 0: return [
      choice('spring', 'Kindle the spring', `Refill Glow to 100.${wallet >= 12 ? ` Costs 12 ${walletLabel}.` : ''}`, { flame: 100, embers: wallet >= 12 ? -12 : 0 }),
      choice('spring-gold', 'Follow the golden stream', 'Gain 16 embers and leave the spring untouched.', { embers: 16 }),
    ];
    case 1: return [
      finite(run.flame) >= 20 ? choice('bargain', 'Trade a little Glow', 'Spend 15 Glow and gain 35 embers.', { flame: -15, embers: 35 })
        : run.afterglowUnlocked ? reserveChoice('bargain-reserve', 'Keep the last light', 6)
          : choice('bargain-fuel', 'Gather a little light', 'Recover 18 Glow.', { flame: 18 }),
      choice('bargain-safe', 'Take the scattered embers', 'Gain 12 embers without spending Glow.', { embers: 12 }),
    ];
    case 2: return [
      choice('nest-glow', 'Kindle the abandoned lantern', 'Recover 24 Glow before the next flight.', { flame: 24 }),
      choice('nest-gold', 'Gather the nesting embers', 'Gain 22 embers.', { embers: 22 }),
    ];
    case 3: return [
      choice('shrine-draft', 'Listen to another spirit', 'Choose between two new temporary cards.', { draft: true }),
      choice('shrine-keep', 'Keep your present form', 'Keep your loadout and gain 20 embers.', { embers: 20 }),
    ];
    case 4: return [
      choice('well', 'Gather the luminous water', 'Refill Glow to 100.', { flame: 100 }),
      reserveChoice('well-reserve', 'Seal the reflected light', 10),
    ];
    default: return [
      choice('archive-draft', 'Read a forgotten flame', `Choose a new card.${wallet >= 10 ? ` Costs 10 ${walletLabel}.` : ''}`, { draft: true, embers: wallet >= 10 ? -10 : 0 }),
      reserveChoice('archive-reserve', 'Save a forgotten light', 8),
    ];
  }
}

export function getSupportChoices(run, profile = null) {
  if (run?.phase !== 'support') return [];
  if (profile) run.supportChoices = makeSupportChoices(run, profile);
  return copy(run.supportChoices);
}

export function resolveSupport(run, index, profile = null) {
  if (!run || run.phase !== 'support' || !Number.isInteger(index) || index < 0 || index > 1) return false;
  if (profile) run.supportChoices = makeSupportChoices(run, profile);
  const effect = run.supportChoices[index]?.effect;
  if (finite(effect?.afterglow) !== 0 && (!run.afterglowUnlocked || run.isTutorial)) return false;
  const wallet = count(profile ? profile.embers : run.embers);
  if (!effect || wallet + Math.min(0, finite(effect.embers)) < 0
    || (run.flame ?? FLAME_TUNING.maximum) + finite(effect.flame) < 0
    || finite(run.afterglow) + finite(effect.afterglow) < 0) return false;
  const emberDelta = finite(effect.embers);
  if (emberDelta < 0) {
    if (profile && !run.isTutorial) profile.embers = count(wallet + emberDelta);
    else if (!run.isTutorial) spendPending(run, -emberDelta);
  } else queueReward(run, emberDelta, 'support');
  run.score = count(run.score + finite(effect.score));
  run.flame = clamp((run.flame ?? FLAME_TUNING.maximum) + finite(effect.flame), 0, FLAME_TUNING.maximum);
  const reserveGain = energy(Math.min(finite(effect.afterglow), getAfterglowRules(run.skills).cap - finite(run.afterglow)));
  run.afterglow = energy(clamp(finite(run.afterglow) + finite(effect.afterglow), 0, getAfterglowRules(run.skills).cap));
  run.afterglowTotals = afterglowReport(run.afterglow, run.afterglowTotals);
  run.afterglowTotals.stored = energy(run.afterglowTotals.stored + reserveGain);
  if (finite(effect.afterglow) < 0) run.afterglowTotals.spent = energy(run.afterglowTotals.spent - effect.afterglow);
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
  if (run.attemptActive) restoreAttemptEntry(run);
  if (run.isTutorial) {
    if (run.success) {
      state.profile.tutorialComplete = true;
      // A taught power stays available; practice never adds flight-clear XP.
      state.profile.knownPowers = powerIds([...getPowerDiscovery(state.profile).unlocked, ...run.cards]);
    }
    run.banked = true;
    state.profile.bankedRuns.push(run.id);
    state.profile.bankedRuns = state.profile.bankedRuns.slice(-128);
    return true;
  }
  secureBossProgress(state);
  if (run.rewardLedgerVersion !== REWARD_LEDGER_VERSION) settleCheckpoint(state);
  // Every modern clear was already secured at its checkpoint. Ending an
  // attempt or ascension never creates a second currency payment.
  run.embers = 0;
  run.pendingRewards = [];
  let loss = 0;
  if (!run.afterglowUnlocked) run.afterglow = 0;
  if (run.afterglowUnlocked && !run.success && !run.afterglowLossApplied) {
    loss = energy(finite(run.afterglow) * getAfterglowRules(run.skills).failureLoss);
    run.afterglow = energy(finite(run.afterglow) - loss);
    run.afterglowLossApplied = true;
  }
  run.afterglowTotals = afterglowReport(run.afterglow, run.afterglowTotals);
  run.afterglowTotals.loss = energy(run.afterglowTotals.loss + loss);
  if (run.lastFlight) {
    run.lastFlight.afterglow = afterglowReport(run.afterglow, run.lastFlight.afterglow);
    run.lastFlight.afterglow.loss = energy(run.lastFlight.afterglow.loss + loss);
  }
  state.profile.afterglow = state.profile.afterglowUnlocked
    ? energy(clamp(finite(run.afterglow), 0, getAfterglowRules(state.profile.skills).cap)) : 0;
  state.profile.clearedFlights = Math.max(count(state.profile.clearedFlights), count(run.discoveryClears));
  state.profile.knownPowers = powerIds([...getPowerDiscovery(state.profile).unlocked, ...getPowerDiscovery(run).unlocked]);
  state.profile.stats.completedRuns += 1;
  state.profile.stats.wins += run.success ? 1 : 0;
  state.profile.stats.totalScore += count(run.score);
  state.profile.stats.bestScore = Math.max(state.profile.stats.bestScore, count(run.score));
  state.profile.stats.attempts = count(state.profile.stats.attempts) + count(run.stats.attempts);
  state.profile.stats.deaths = count(state.profile.stats.deaths) + count(run.stats.deaths);
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
  if (!profile || !item || cost === null || !Number.isFinite(profile.embers) || profile.embers < cost
    || skillId.startsWith('afterglow-') && profile.afterglowUnlocked !== true
    || (item.requires && !skillRank(profile.skills, item.requires))) return false;
  profile.skills ||= {};
  profile.embers -= cost;
  profile.skills[skillId] = skillRank(profile.skills, skillId) + 1;
  return true;
}

export function canBuyCheckpointSkills(state) {
  if (!state?.profile) return false;
  const run = state.run;
  if (!run || run.phase === 'ended') return true;
  if (run.isTutorial || run.banked || run.attemptActive
    || !['starter', 'map', 'support', 'reward', 'briefing', 'map-clear'].includes(run.phase)) return false;
  const reattempt = run.phase === 'briefing' && run.current
    && run.lastAttempt?.nodeId === run.current.id && run.lastAttempt.success !== true;
  return !reattempt;
}

/** Checkpoint purchases apply to the next new flight; a retry keeps its entry build. */
export function buyCheckpointSkill(state, skillId) {
  if (!canBuyCheckpointSkills(state) || !buySkill(state.profile, skillId)) return false;
  if (state.run && state.run.phase !== 'ended') state.run.skills = { ...state.profile.skills };
  return true;
}

export function getModifiers(cardIds = [], skills = {}, flightTuning = {}, role = 'swift') {
  const ids = new Set(Array.isArray(cardIds) ? cardIds.filter(id => Object.hasOwn(CARDS, id)) : []);
  const result = {
    gravity: 1, flap: 1, speed: 1, attract: 1 + 0.25 * skillRank(skills, 'wisp-reach'),
    wispCooldown: Math.round((1 - 0.15 * skillRank(skills, 'wisp-recovery')) * 100) / 100,
    lightRadius: WISP_TUNING.lightRadius + 35 * skillRank(skills, 'wisp-light'),
    boostCooldown: 1, boostDuration: 1, reward: 1,
    cacheFuelBonus: ids.has('ash-ward') ? 4 : 0, windSensitivity: ids.has('glass-phoenix') ? 1.2 : 1,
    warmCore: ids.has('warm-heart'), steady: ids.has('steady-flame'),
    hungryWisp: ids.has('hungry-wisp'), kindledSpirit: ids.has('kindled-spirit'), goldenWake: ids.has('golden-wake'),
    stormFeeder: ids.has('storm-feeder'), fireWake: ids.has('fire-wake'),
  };
  if (skillRank(skills, 'wisp-bounty')) result.reward *= 1.10;
  if (skillRank(skills, 'boost-focus')) result.boostCooldown *= 0.90;
  if (skillRank(skills, 'boost-flare')) result.boostDuration *= 1.15;
  if (ids.has('soft-descent')) { result.gravity *= 0.90; result.flap *= 0.94; }
  if (ids.has('high-wing')) { result.flap *= 1.10; result.speed *= 1.05; }
  if (ids.has('tailwind')) { result.speed *= 1.08; result.reward *= 1.12; }
  if (ids.has('glass-phoenix')) result.reward *= 1.25;
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
  const points = tuningAllocation(flightTuning);
  result.gravityPull = clamp((1 + .15 * skillRank(skills, 'wisp-gravity')) * (1 + .08 * points.collector), 1, 2);
  result.speed = Math.min(1.23, result.speed * (1 + .03 * points.speed));
  result.flap = Math.min(1.20, result.flap * Math.sqrt(1 + .06 * points.lift));
  result.attract = Math.min(2.5, result.attract * (1 + .12 * points.collector));
  result.boostDuration = Math.min(1.45, result.boostDuration * (1 + .05 * points.boost));
  result.boostCooldown = Math.max(.65, result.boostCooldown * (1 - .04 * points.boost));
  if (normalizeCompanionRole(role) === 'gravity') {
    result.wispCooldown = clamp(result.wispCooldown * result.boostCooldown, .4, 1.5);
    result.gravityPull = clamp(result.gravityPull * result.boostDuration, 1, 2);
  }
  return result;
}
