// What the app really hands the WispFlight engine for a stop in a card run (mirror of dist/app.mjs `launchFlight`, the `new WispFlight({...})`
// call), so the simulated pilots fly the SAME flight a player gets. Used by scripts/balance/starter-sim.mjs and tests/sim-matches-app.test.mjs.
// Differences this removes (found 2026-11-19, see outputs/balance/sim-vs-app.md): the sim passed no `cardPilot`, `elite`, `lives`/`maxLives`,
// `challengeId/Target`, run companions/skills, wallet Stored Sparks or the onboarding plan of the real profile.
import { createHash } from 'node:crypto';
import { M } from './real-flight-check.mjs';
export const FIRST_STOPS = 6;
/** The profile the owner plays on: experienced (cleared flights), so the onboarding plan is disabled (`onboardingStage` 4). */
export function experiencedState() {
  const state = M.newState(); state.profile.tutorialComplete = true; state.profile.clearedFlights = 1;
  return state;
}
/** Constructor options of the app's flight for `run.current` (UI-only callbacks, canvas and audio left out). */
export function appFlightOptions(state, run, node, onboardingFlightPlan) {
  return { terrain: node.terrain, elite: node.elite, seed: `${run.seed}-${node.id}`, duration: node.duration, node, challengeId: node.challengeId, challengeTarget: node.challengeTarget,
    flame: run.flame, lives: run.lives, maxLives: run.maxLives, condensedGlow: M.getSkillWallet({ ...state, run }).condensedGlow, condensedRemainder: run.condensedRemainder || 0,
    companions: run.companions, companionRole: run.companions[0], skills: run.skills, cards: [], cardPilot: true,
    modifiers: { ...M.getRunModifiers(run), cardPilot: true, onboardingPlan: onboardingFlightPlan(state.profile, run) } };
}
/** Fixed route of the first flights ("stops"): at each step the first normal flight (else an Elite flight, else a Rest, else the first choice).
 *  Non-flight stops on the way are passed like the sim does. Returns {path: every node id in order, flights: the first `stops` flight node ids}. */
export function simRoute(runSeed, ids = ['lift-guide'], makeRun, stops = FIRST_STOPS) {
  const run = makeRun(ids, { seed: runSeed }), path = [], flights = [];
  let guard = 0;
  while (flights.length < stops && run.phase === 'map' && guard++ < 40) {
    const ch = M.getChoices(run); if (!ch.length) break;
    const pick = ch.find(n => n.type === 'flight' && !n.elite) || ch.find(n => n.type === 'flight') || ch.find(n => n.kind === 'camp') || ch[0];
    if (!M.selectNode(run, pick.id)) break;
    path.push(pick.id); if (pick.type === 'flight') flights.push(pick.id);
    if (pick.kind === 'camp') M.resolveSupport(run, 0);
    for (const k of ['pendingChest', 'pendingTemporary', 'cardDraft', 'cardReward', 'flightReward']) delete run[k];
    run.phase = 'map'; run.step = pick.row + 1; run.current = null; run.attemptActive = false;
  }
  return { path, flights };
}
const hash = v => createHash('sha256').update(JSON.stringify(v, (k, x) => typeof x === 'number' ? Math.round(x * 1000) / 1000 : x)).digest('hex').slice(0, 12);
/** Everything that decides how a flight plays, as comparable values/hashes. `e` is a constructed WispFlight. */
export function fingerprint(e) {
  const L = e.layout || {}, embers = (L.embers || []).filter(p => !p.generated);
  const fuel = embers.filter(p => p.fuel != null || ['light', 'cluster', 'cache', 'dusk'].includes(p.kind));
  return { seed: e.seed ?? e.options?.seed, terrain: e.options?.terrain, duration: e.duration, levelId: e.node?.levelId ?? e.route?.levelId, difficulty: e.node?.difficulty, row: e.node?.row, mapIndex: e.node?.mapIndex,
    elite: !!e.elite, boss: !!e.bossEncounter, obstacles: hash(L.obstacles || []), challenges: hash(L.challenges || []), terrainProfile: hash(L.terrain || L.ground || L.profile || L.landform || null),
    layoutKeys: hash(Object.keys(L)), embersCount: embers.length, embers: hash(embers.map(p => [p.id, p.kind, p.x, p.y, p.fuel])), sparkCount: fuel.length,
    flame: e.flame, maxFlame: e.maxFlame, lives: e.lives, maxLives: e.maxLives, flapCost: e.flapCost, baseSpeed: e.baseSpeed, scaleY: e.scaleY, cardPilot: !!(e.options?.cardPilot || e.mod?.cardPilot),
    companionRole: e.companionRole, companions: (e.fleet || []).map(f => f.role).join(','), attract: e.mod?.attract, wispCooldown: e.mod?.wispCooldown, fuelBonus: e.fuelBonus, packingLimit: e.mod?.packingLimit,
    condensedStart: e.condensedStart, onboarding: e.onboardingPlan ? hash(e.onboardingPlan) : null, mod: hash(Object.fromEntries(Object.entries(e.mod || {}).filter(([, v]) => typeof v !== 'function'))),
    cards: (e.cardExecution?.cards || e.cardChain || []).length };
}
