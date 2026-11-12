import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARDS, SKILLS, ROUTE_PROFILES, SAVE_KEY, newState, createRun, getChoices, selectNode, applyStarter,
  takeCard, finishFlight, getSupportChoices, resolveSupport, bankRun, buySkill,
  getModifiers, getSkillCost, saveState, loadState,
} from '../dist/model.mjs';

const storage = () => {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
};
const freshRun = seed => {
  const run = createRun(newState().profile, seed);
  assert.equal(applyStarter(run, run.offers[0]), true);
  return run;
};
const win = (run, overrides = {}) => finishFlight(run, {
  success: true, hp: run.maxHp, embers: 20, score: 200, collected: 20,
  collisions: 0, boosts: 2, challengeComplete: true, ...overrides,
});
function clearCurrent(run) {
  if (run.phase === 'support') assert.equal(resolveSupport(run, 0), true);
  else if (run.phase === 'briefing') assert.equal(win(run), true);
  if (run.phase === 'reward') assert.equal(takeCard(run, run.offers[0], run.cards.length === 3 ? 0 : null), true);
}

test('seed fixes maps and starter offers while a new run has a distinct banking ID', () => {
  const a = createRun(newState().profile, 'phoenix-seed');
  const b = createRun(newState().profile, 'phoenix-seed');
  assert.deepEqual(a.map, b.map);
  assert.deepEqual(a.offers, b.offers);
  assert.notEqual(a.id, b.id);
  assert.notDeepEqual(a.map, createRun(newState().profile, 'another-seed').map);
  assert.equal(a.offers.length, 2);
  assert.equal(new Set(a.offers).size, 2);
  assert.equal(a.hp, 3);
});

test('many generated maps preserve the seven-stop structure, a safe path, and no consecutive elite flights', () => {
  for (let seed = 0; seed < 150; seed++) {
    const run = freshRun(`map-${seed}`);
    assert.notEqual(run.map[1][1].eventIndex, run.map[4][1].eventIndex);
    let lastFlightElite = false;
    let flights = 0;
    let supports = 0;
    while (run.phase !== 'ended') {
      const options = getChoices(run);
      assert.ok(options.length >= 1 && options.length <= 2);
      assert.ok(options.some(node => !node.elite));
      if (lastFlightElite) assert.ok(options.every(node => !node.elite));
      const choice = options.find(node => node.elite) || options[0];
      if (choice.type === 'support') supports++;
      else {
        assert.ok(!(lastFlightElite && choice.elite));
        lastFlightElite = choice.elite;
        flights++;
      }
      assert.equal(selectNode(run, choice.id), true);
      if (choice.elite) {
        assert.ok(choice.draftTheme);
        assert.ok(choice.draftTags.length === 2);
        assert.equal(win(run), true);
        assert.ok(run.offers.every(id => choice.draftTags.includes(CARDS[id].tag)));
        assert.equal(takeCard(run, run.offers[0], run.cards.length === 3 ? 0 : null), true);
      } else clearCurrent(run);
    }
    assert.equal(run.success, true);
    assert.equal(run.step, 7);
    assert.equal(flights, 5);
    assert.equal(supports, 2);
    assert.equal(run.path.length, 7);
    assert.equal(run.cards.length, 3);
  }
});

test('the first route commits to different reachable forks instead of offering every next node', () => {
  const refuge = freshRun('branch-commitment');
  const cave = freshRun('branch-commitment');
  assert.deepEqual(refuge.map.map(row => row.length), [2, 3, 3, 3, 3, 3, 1]);
  assert.deepEqual(getChoices(refuge).map(node => node.routeStyle), ['refuge', 'cavern']);
  selectNode(refuge, getChoices(refuge)[0].id);
  selectNode(cave, getChoices(cave)[1].id);
  clearCurrent(refuge);
  clearCurrent(cave);
  assert.deepEqual(getChoices(refuge).map(node => node.kind), ['camp', 'event']);
  assert.deepEqual(getChoices(cave).map(node => node.kind), ['event', 'shrine']);
  assert.equal(selectNode(refuge, refuge.map[1][2].id), false);
  assert.equal(selectNode(cave, cave.map[1][0].id), false);
  selectNode(refuge, refuge.map[1][0].id);
  selectNode(cave, cave.map[1][1].id);
  clearCurrent(refuge);
  clearCurrent(cave);
  assert.deepEqual(getChoices(refuge).map(node => node.routeStyle), ['refuge', 'cavern']);
  assert.deepEqual(getChoices(cave).map(node => node.routeStyle), ['cavern', 'gauntlet']);
});

test('every reachable branch finishes, offers an ordinary continuation, and merges into the final ascent', () => {
  let completedPaths = 0;
  function visit(run, lastFlightElite = false) {
    if (run.phase === 'ended') {
      assert.equal(run.success, true);
      assert.equal(run.path.length, 7);
      assert.equal(run.current.id, run.map[6][0].id);
      completedPaths++;
      return;
    }
    const choices = getChoices(run);
    assert.ok(choices.length >= 1 && choices.length <= 2, `dead end at ${run.seed}/${run.path.join('.')}`);
    assert.ok(choices.some(node => !node.elite));
    for (const node of choices) {
      const branch = structuredClone(run);
      const previous = branch.map.flat().find(item => item.id === branch.path.at(-1));
      if (previous) assert.ok(previous.nextIds.includes(node.id));
      if (node.type !== 'support') assert.equal(lastFlightElite && node.elite, false);
      assert.equal(selectNode(branch, node.id), true);
      clearCurrent(branch);
      visit(branch, node.type === 'support' ? lastFlightElite : node.elite);
    }
  }
  for (let seed = 0; seed < 12; seed++) visit(freshRun(`every-branch-${seed}`));
  assert.ok(completedPaths >= 200, `only ${completedPaths} complete branches checked`);
});

test('route profiles expose distinct real fuel, passage, timing and themed-reward tradeoffs', () => {
  const run = freshRun('route-traits');
  const [refuge, cave, elite] = run.map[2];
  assert.equal(refuge.routeStyle, 'refuge');
  assert.equal(cave.routeStyle, 'cavern');
  assert.equal(elite.routeStyle, 'gauntlet');
  assert.ok(refuge.fuelCadence < cave.fuelCadence && cave.fuelCadence < elite.fuelCadence);
  assert.ok(refuge.fuelBonus > cave.fuelBonus);
  assert.ok(refuge.flameDrain < cave.flameDrain);
  assert.ok(cave.duration < refuge.duration);
  assert.ok(refuge.routeReward < cave.routeReward && cave.routeReward < elite.routeReward);
  assert.ok(refuge.bonusEmbers < cave.bonusEmbers && cave.bonusEmbers < elite.bonusEmbers);
  assert.deepEqual([refuge.passage, cave.passage, elite.passage], ['open', 'cavern', 'gauntlet']);
  for (const profile of Object.values(ROUTE_PROFILES)) {
    // Five or more cards guarantee two unowned choices for every possible three-card loadout.
    assert.ok(Object.values(CARDS).filter(card => profile.draftTags.includes(card.tag)).length >= 5);
  }
  for (const initial of [0, 1]) {
    const branch = freshRun(`ordinary-theme-${initial}`);
    const node = getChoices(branch)[initial];
    assert.ok(node.draftTheme);
    selectNode(branch, node.id);
    win(branch);
    assert.ok(branch.offers.every(id => node.draftTags.includes(CARDS[id].tag)));
  }
});

test('fuel shrine makes a visible fuel-versus-new-card decision and persists the generated choice', () => {
  for (const pick of [0, 1]) {
    const state = newState();
    state.run = freshRun(`fuel-shrine-${pick}`);
    selectNode(state.run, getChoices(state.run)[1].id);
    clearCurrent(state.run);
    state.run.flame = 18;
    const shrine = getChoices(state.run).find(node => node.kind === 'shrine');
    assert.ok(shrine);
    selectNode(state.run, shrine.id);
    const memory = storage();
    saveState(state, memory);
    const restored = loadState(memory).run;
    assert.deepEqual(getSupportChoices(restored), getSupportChoices(state.run));
    assert.equal(resolveSupport(restored, pick), true);
    assert.equal(restored.flame, pick === 0 ? 58 : 26);
    assert.equal(restored.phase, pick === 0 ? 'map' : 'reward');
    if (pick === 1) assert.equal(takeCard(restored, restored.offers[0]), true);
    assert.equal(restored.step, 2);
  }
});

test('old seven-by-two saves without adjacency continue through their original choices', () => {
  const state = newState();
  state.profile.embers = 77;
  state.run = freshRun('legacy-map');
  const run = state.run;
  run.map = run.map.map((row, index) => {
    const pair = row.length === 1 ? [structuredClone(row[0]), structuredClone(row[0])] : row.slice(0, 2);
    return pair.map((node, lane) => {
      node.id = `legacy-${index}-${lane}`;
      node.lane = lane;
      delete node.nextIds;
      return node;
    });
  });
  delete run.startNodeIds;
  delete run.mapVersion;
  const memory = storage();
  saveState(state, memory);
  const restored = loadState(memory);
  assert.equal(restored.profile.embers, 77);
  assert.equal(restored.run.seed, 'legacy-map');
  while (restored.run.phase !== 'ended') {
    const options = getChoices(restored.run);
    assert.equal(options.length, 2);
    selectNode(restored.run, options[1].id);
    clearCurrent(restored.run);
  }
  assert.equal(restored.run.success, true);
});

test('a corrupt graph link discards only the invalid run while preserving permanent progress', () => {
  const state = newState();
  state.profile.embers = 123;
  state.run = freshRun('bad-edge');
  state.run.map[0][0].nextIds = ['does-not-exist'];
  const memory = storage();
  saveState(state, memory);
  const restored = loadState(memory);
  assert.equal(restored.profile.embers, 123);
  assert.equal(restored.run, null);
});

test('invalid or repeated progression commands leave the run unchanged', () => {
  const run = createRun(newState().profile, 'commands');
  let before = JSON.stringify(run);
  assert.equal(selectNode(run, 'n-0-a'), false);
  assert.equal(applyStarter(run, 'missing'), false);
  assert.equal(finishFlight(run, { success: true, hp: 3 }), false);
  assert.equal(takeCard(run, run.offers[0]), false);
  assert.equal(JSON.stringify(run), before);
  applyStarter(run, run.offers[0]);
  before = JSON.stringify(run);
  assert.equal(applyStarter(run, run.cards[0]), false);
  assert.equal(selectNode(run, 'n-6-a'), false);
  assert.equal(JSON.stringify(run), before);
  selectNode(run, getChoices(run)[0].id);
  win(run);
  before = JSON.stringify(run);
  assert.equal(win(run), false);
  assert.equal(takeCard(run, 'missing'), false);
  assert.equal(JSON.stringify(run), before);
});

test('rewards and seed-specific card offers survive a save and reload without rerolling', () => {
  const state = newState();
  state.run = freshRun('persist-offer');
  selectNode(state.run, getChoices(state.run)[0].id);
  win(state.run);
  const memory = storage();
  assert.equal(saveState(state, memory), true);
  const restored = loadState(memory);
  assert.deepEqual(restored.run.offers, state.run.offers);
  assert.deepEqual(restored.run.map, state.run.map);
  assert.equal(restored.run.phase, 'reward');
  assert.equal(takeCard(restored.run, restored.run.offers[0]), true);
  assert.equal(restored.run.step, 1);
  assert.equal(restored.run.cards.length, 2);
});

test('full flexible loadouts require an explicit valid replacement and never create a reserve', () => {
  const run = freshRun('slots');
  while (run.step < 3) {
    selectNode(run, getChoices(run)[0].id);
    clearCurrent(run);
  }
  assert.equal(run.cards.length, 3);
  selectNode(run, getChoices(run)[0].id);
  win(run);
  const original = [...run.cards];
  const offered = run.offers[0];
  assert.equal(takeCard(run, offered), false);
  assert.equal(takeCard(run, offered, 3), false);
  assert.deepEqual(run.cards, original);
  assert.equal(takeCard(run, offered, 1), true);
  assert.deepEqual(run.cards, [original[0], offered, original[2]]);
  assert.equal(run.step, 4);
  assert.equal(run.reserve, undefined);
});

test('keeping a loadout banks a modest reward and advances exactly once', () => {
  const run = freshRun('skip');
  selectNode(run, getChoices(run)[0].id);
  win(run);
  const amount = run.embers;
  const cards = [...run.cards];
  assert.equal(takeCard(run, null), true);
  assert.equal(run.embers, amount + 8);
  assert.deepEqual(run.cards, cards);
  assert.equal(run.step, 1);
  assert.equal(takeCard(run, null), false);
});

test('flight income is counted once, with explicit completion and optional challenge bonuses', () => {
  const run = freshRun('earned-values');
  selectNode(run, getChoices(run)[0].id);
  const bonus = run.current.bonusEmbers;
  const challenge = run.current.challengeBonus;
  assert.equal(win(run, { embers: 31, score: 243, rebirthUsed: true }), true);
  assert.equal(run.embers, 31 + bonus + challenge);
  assert.equal(run.score, 243);
  assert.equal(run.usedRebirth, true);
  assert.equal(run.stats.challenges, 1);
  assert.equal(run.stats.flights, 1);
  assert.equal(run.stats.collected, 20);
});

test('failure retains earned currency without awarding completion or challenge bonuses; banking is idempotent across reload', () => {
  const state = newState();
  state.run = freshRun('failed');
  selectNode(state.run, getChoices(state.run)[0].id);
  win(state.run, { success: false, hp: 0, embers: 17, challengeComplete: true });
  assert.equal(state.run.phase, 'ended');
  assert.equal(state.run.success, false);
  assert.equal(state.run.embers, 17);
  assert.equal(bankRun(state), true);
  assert.equal(bankRun(state), false);
  assert.equal(state.profile.embers, 17);
  assert.equal(state.profile.stats.completedRuns, 1);
  assert.equal(state.profile.stats.wins, 0);
  const memory = storage();
  saveState(state, memory);
  const restored = loadState(memory);
  assert.equal(bankRun(restored), false);
  assert.equal(restored.profile.embers, 17);
});

test('camp choices remain useful at full health and resolve only once', () => {
  const run = freshRun('camp');
  selectNode(run, getChoices(run)[0].id);
  clearCurrent(run);
  selectNode(run, getChoices(run)[0].id);
  run.hp = run.maxHp;
  const choices = getSupportChoices(run);
  assert.equal(choices.length, 2);
  assert.equal(choices[0].effect.shield, 1);
  choices[0].effect.shield = 100;
  assert.equal(getSupportChoices(run)[0].effect.shield, 1);
  assert.equal(resolveSupport(run, 0), true);
  assert.equal(run.shield, 1);
  assert.equal(run.step, 2);
  assert.equal(resolveSupport(run, 0), false);
});

test('Flame carries between flights, checkpoints provide a small reserve, and rest refills it', () => {
  const run = freshRun('camp');
  selectNode(run, getChoices(run)[0].id);
  assert.equal(win(run, { flame: 10 }), true);
  assert.equal(run.flame, 35);
  assert.equal(run.lastFlight.flame, 10);
  assert.equal(run.lastFlight.recoveredFlame, 25);
  takeCard(run, run.offers[0]);
  const state = newState(); state.run = run;
  const memory = storage(); saveState(state, memory);
  const restored = loadState(memory).run;
  assert.equal(restored.flame, 35, 'reload retains the departure resource');
  selectNode(restored, getChoices(restored)[0].id);
  assert.ok(getSupportChoices(restored)[0].description.includes('Flame'));
  resolveSupport(restored, 0);
  assert.equal(restored.flame, 100);
  assert.equal(resolveSupport(restored, 0), false);
});

test('existing saves gain a full Flame reserve without discarding the expedition', () => {
  const state = newState(); state.run = freshRun('legacy-flame');
  delete state.run.flame;
  const memory = storage(); saveState(state, memory);
  const restored = loadState(memory);
  assert.equal(restored.run.seed, 'legacy-flame');
  assert.equal(restored.run.flame, 100);
});

test('every event has two affordable nonlethal choices; draft events use normal flexible-slot rewards', () => {
  for (let index = 0; index < 6; index++) {
    for (const hp of [1, 2, 3]) {
      for (const balance of [0, 40]) {
        for (const pick of [0, 1]) {
          const run = freshRun(`event-${index}-${hp}-${balance}-${pick}`);
          selectNode(run, getChoices(run)[0].id);
          clearCurrent(run);
          run.map[1][1].eventIndex = index;
          run.hp = Math.min(hp, run.maxHp);
          run.embers = balance;
          assert.equal(selectNode(run, run.map[1][1].id), true);
          assert.equal(getSupportChoices(run).length, 2);
          assert.equal(resolveSupport(run, pick), true);
          assert.ok(run.hp > 0);
          assert.ok(run.embers >= 0);
          if (run.phase === 'reward') {
            assert.equal(run.offers.length, 2);
            assert.equal(run.step, 1);
            assert.equal(takeCard(run, run.offers[0]), true);
          }
          assert.equal(run.step, 2);
          assert.equal(run.phase, 'map');
        }
      }
    }
  }
});

test('skill purchases require currency and prerequisites; single-rank skills cannot be bought twice', () => {
  const profile = newState().profile;
  profile.embers = 1000;
  assert.equal(buySkill(profile, 'wisp-bounty'), false);
  assert.equal(buySkill(profile, 'wisp-reach'), true);
  assert.equal(profile.embers, 920);
  assert.equal(buySkill(profile, 'wisp-bounty'), true);
  assert.equal(profile.embers, 760);
  assert.equal(buySkill(profile, 'wisp-bounty'), false);
  assert.equal(getSkillCost(profile, 'wisp-bounty'), null);
  assert.equal(buySkill(profile, 'toString'), false);
  assert.equal(buySkill(profile, '__proto__'), false);
  profile.embers = 0;
  assert.equal(buySkill(profile, 'boost-focus'), false);
  assert.ok(Object.values(profile.skills).every(rank => rank === 1));
});

test('wisp reach and recovery each have three escalating ranks with independent first purchases', () => {
  const profile = newState().profile;
  profile.embers = 2000;
  const costs = {
    'wisp-reach': [80, 120, 180],
    'wisp-recovery': [90, 135, 203],
  };
  for (const [id, prices] of Object.entries(costs)) {
    for (let rank = 0; rank < 3; rank++) {
      assert.equal(getSkillCost(profile, id), prices[rank]);
      const balance = profile.embers;
      assert.equal(buySkill(profile, id), true);
      assert.equal(profile.skills[id], rank + 1);
      assert.equal(profile.embers, balance - prices[rank]);
    }
    assert.equal(getSkillCost(profile, id), null);
    const before = JSON.stringify(profile);
    assert.equal(buySkill(profile, id), false);
    assert.equal(JSON.stringify(profile), before);
  }
  const independent = newState().profile;
  independent.embers = 90;
  assert.equal(buySkill(independent, 'wisp-recovery'), true);
  assert.equal(independent.skills['wisp-reach'], undefined);
  assert.equal(independent.embers, 0);
  assert.equal(getSkillCost(independent, 'missing'), null);
  assert.equal(getSkillCost(independent, '__proto__'), null);
});

test('wisp ranks affect companion search radius and return cooldown without changing flap or boost', () => {
  const expectedRange = [1, 1.25, 1.5, 1.75];
  const expectedCooldown = [1, 0.85, 0.70, 0.55];
  for (let rank = 0; rank <= 3; rank++) {
    const modifiers = getModifiers([], { 'wisp-reach': rank, 'wisp-recovery': rank });
    assert.equal(modifiers.attract, expectedRange[rank]);
    assert.equal(modifiers.wispCooldown, expectedCooldown[rank]);
    assert.equal(modifiers.flap, 1);
    assert.equal(modifiers.boostCooldown, 1);
  }
  assert.equal(getModifiers([], { 'wisp-reach': 99 }).attract, 1.75);
  assert.equal(getModifiers([], { 'wisp-recovery': 99 }).wispCooldown, 0.55);
});

test('multi-rank saves retain old purchases, clamp invalid ranks, and keep active departure snapshots', () => {
  const state = newState();
  state.profile.embers = 1000;
  state.profile.skills = { 'wisp-reach': 1, 'wisp-bounty': 1 };
  state.run = createRun(state.profile, 'wisp-snapshot');
  assert.equal(buySkill(state.profile, 'wisp-reach'), true);
  assert.equal(buySkill(state.profile, 'wisp-recovery'), true);
  assert.equal(state.run.skills['wisp-reach'], 1);
  assert.equal(state.run.skills['wisp-recovery'], undefined);
  const memory = storage();
  saveState(state, memory);
  const restored = loadState(memory);
  assert.equal(restored.profile.skills['wisp-reach'], 2);
  assert.equal(restored.profile.skills['wisp-recovery'], 1);
  assert.equal(restored.profile.skills['wisp-bounty'], 1);
  assert.equal(restored.run.skills['wisp-reach'], 1);
  assert.equal(getModifiers([], restored.run.skills).attract, 1.25);
  assert.equal(getModifiers([], restored.run.skills).wispCooldown, 1);
  restored.profile.skills = { 'wisp-reach': 30, 'wisp-recovery': 30, 'boost-focus': 30, 'wisp-bounty': 30 };
  saveState(restored, memory);
  const clamped = loadState(memory).profile;
  assert.deepEqual(clamped.skills, { 'wisp-reach': 3, 'wisp-recovery': 3, 'wisp-bounty': 1, 'boost-focus': 1 });
  assert.equal(getSkillCost(clamped, 'wisp-reach'), null);
  const legacy = newState();
  legacy.profile.skills = { 'wisp-reach': 1, 'wisp-bounty': 1 };
  saveState(legacy, memory);
  const old = loadState(memory).profile;
  assert.equal(old.skills['wisp-reach'], 1);
  assert.equal(old.skills['wisp-bounty'], 1);
  assert.equal(old.skills['wisp-recovery'], undefined);
});

test('all three-card combinations remain bounded and repeated cards cannot stack modifiers', () => {
  const ids = Object.keys(CARDS);
  const skills = Object.fromEntries(Object.keys(SKILLS).map(id => [id, 1]));
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) {
    const m = getModifiers([ids[a], ids[b], ids[c]], skills);
    assert.ok(m.gravity >= 0.82 && m.gravity <= 1.15);
    assert.ok(m.flap >= 0.88 && m.flap <= 1.15);
    assert.ok(m.speed >= 0.90 && m.speed <= 1.12);
    assert.ok(m.reward >= 0.75 && m.reward <= 1.65);
    assert.ok(m.boostDuration <= 1.45);
    assert.ok([2, 3].includes(m.maxHp));
    assert.equal(m.rebirth, true);
    assert.equal(m.rebirthHp, 2);
  }
  assert.deepEqual(getModifiers(['tailwind', 'tailwind']), getModifiers(['tailwind']));
  assert.equal(getModifiers().rebirth, false);
  assert.equal(getModifiers().maxHp, 3);
});

test('profile skills are snapshotted at departure and do not mutate an active run', () => {
  const profile = newState().profile;
  const run = createRun(profile, 'snapshot');
  profile.embers = 1000;
  buySkill(profile, 'boost-focus');
  assert.deepEqual(run.skills, {});
  assert.equal(getModifiers([], run.skills).boostCooldown, 1);
});

test('movement and protection cards expose their explicit sidegrades', () => {
  const soft = getModifiers(['soft-descent']);
  assert.equal(soft.gravity, 0.90);
  assert.equal(soft.flap, 0.94);
  const high = getModifiers(['high-wing']);
  assert.equal(high.flap, 1.10);
  assert.equal(high.speed, 1.05);
  assert.equal(high.gravity, 1);
  const ward = getModifiers(['ash-ward']);
  assert.equal(ward.ward, 1);
  assert.equal(ward.boostCooldown, 1.12);
});

test('save handling tolerates corruption, old schemas and unavailable storage while retaining a valid profile', () => {
  const memory = storage();
  memory.setItem(SAVE_KEY, '{broken');
  assert.deepEqual(loadState(memory), newState());
  memory.setItem(SAVE_KEY, JSON.stringify({ version: 999 }));
  assert.deepEqual(loadState(memory), newState());
  const state = newState();
  state.profile.embers = 99;
  state.run = createRun(state.profile, 'damaged');
  state.run.offers = ['constructor', 'tailwind'];
  saveState(state, memory);
  const recovered = loadState(memory);
  assert.equal(recovered.profile.embers, 99);
  assert.equal(recovered.run, null);
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); } };
  assert.deepEqual(loadState(denied), newState());
  assert.equal(saveState(newState(), denied), false);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('SecurityError'); } });
    assert.deepEqual(loadState(), newState());
    assert.equal(saveState(newState()), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
