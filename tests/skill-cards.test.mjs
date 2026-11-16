import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../dist/model.mjs";
import {
  CARD_UNIT,
  SKILL_CARDS,
  makeSkillCard,
  createCardExecution,
  executeCardBodyPickup,
  getCardCharges,
  getCardStarterOffers,
} from "../dist/skill-cards.mjs";
import { getGlowCapacity } from "../dist/vitality.mjs";
import { collectorCanFetch } from "../dist/collector-load.mjs";

const fresh = (seed = "card-test") => {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  return state;
};
const mount = (run, ids) => {
  run.mountedCards = Array.from({ length: run.cardSlots }, (_, i) =>
    ids[i] ? makeSkillCard(ids[i], `test:${i}:${ids[i]}`) : null,
  );
};
const reload = (state) => {
  let data;
  const storage = {
    getItem: () => data,
    setItem: (_, value) => {
      data = value;
    },
  };
  assert.ok(M.saveState(state, storage));
  return M.loadState(storage);
};
const camp = (state) => {
  const run = state.run,
    node = run.map.flat().find((node) => node.kind === "camp");
  run.step = node.row;
  run.current = node;
  run.path = [node.id];
  run.phase = "support";
  M.getSupportChoices(run);
  return node;
};
const choose = (run, id) =>
  M.resolveSupport(
    run,
    M.getSupportChoices(run).findIndex((choice) => choice.id === id),
  );
const flight = (
  state,
  node = M.getChoices(state.run).find((node) => node.type !== "support"),
  result = {},
) => {
  const run = state.run;
  assert.ok(M.selectNode(run, node.id));
  assert.ok(M.beginFlightAttempt(run));
  M.markFlightAttemptStarted(run);
  assert.ok(
    M.finishFlight(run, {
      success: true,
      flame: 55,
      collected: 5,
      bodyPickups: 3,
      collectorPickups: 2,
      ...result,
    }),
  );
  M.settleCheckpoint(state);
  const draft = M.getCardDraft(run);
  if (draft) assert.ok(M.chooseCardDraft(state, draft.id, draft.offers[0].instanceId));
};
const resolveRewards = (state) => {
  const run = state.run;
  if (M.getCardReward(run) && !M.getCardReward(run).claimed)
    assert.ok(M.chooseCardReward(state, "melt"));
  if (run.flightReward && !run.flightReward.claimed)
    assert.ok(M.chooseFlightReward(state, run.flightReward.offers[0]));
  assert.ok(M.acknowledgeVictory(state));
};

test("pilot is explicit; old saves and standard tutorial keep the book", () => {
  const state = M.newState();
  state.run = M.createRun(state.profile, "legacy");
  assert.equal(M.isCardRun(state.run), false);
  assert.ok(M.canBuyCheckpointSkills(state));
  assert.equal(M.isCardRun(reload(state).run), false);
  const pilot = fresh();
  assert.ok(M.isCardRun(pilot.run));
  assert.equal(M.canBuyCheckpointSkills(pilot), false);
  assert.equal(pilot.run.cardSlots, 3);
  assert.deepEqual(pilot.run.mountedCards, [null, null, null]);
  M.startTutorial(state);
  state.run.current = state.run.map[0][0];
  assert.equal(M.getRunModifiers(state.run).cardLiftGuide, false);
  state.run.cardPilot = true;
  assert.equal(M.getRunModifiers(state.run).cardLiftGuide, true);
});

test("starter offers two other seeded Commons and equips the choice plus one guaranteed working Lift Guide", () => {
  for (let seed = 0; seed < 100; seed++) {
    const state = fresh(`starter-${seed}`),
      offers = M.getStartingGiftOffers(state.run);
    assert.equal(offers.length, 2);
    assert.notEqual(offers[0].cardId, offers[1].cardId);
    assert.ok(offers.every((gift) => gift.rarity === "common"));
    assert.ok(offers.every((gift) => gift.cardId !== "lift-guide"));
    assert.ok(
      offers.some((gift) =>
        ["body", "capacity", "guide", "field"].includes(gift.card.kind),
      ),
    );
    assert.deepEqual(M.getStartingGiftOffers(reload(state).run), offers);
    assert.ok(M.chooseStartingGift(state, offers[0].id));
    assert.equal(M.chooseStartingGift(state, offers[1].id), false);
    assert.equal(state.run.mountedCards.filter(Boolean).length, offers[0].cardId === 'camp-kit' ? 1 : 2);
    assert.equal(M.getOwnedCards(state.run).find(card => card.cardId === offers[0].cardId).mounted, offers[0].cardId !== 'camp-kit');
    assert.equal(state.run.mountedCards[1].cardId, "lift-guide");
    assert.equal(state.run.mountedCards[2], null);
    assert.equal(M.getRunModifiers(state.run).cardLiftGuide, true);
    assert.deepEqual(reload(state).run.mountedCards, state.run.mountedCards);
    assert.deepEqual(state.run.skills, {});
  }
});

test("pending legacy starter choices commit safely and completed or melted starters are never granted again", () => {
  let legacyGuide = false, legacyOther = false;
  for (let seed = 0; seed < 100; seed++) {
    const state = fresh(`legacy-starter-${seed}`);
    delete state.run.cardStarterVersion;
    for (const gift of getCardStarterOffers(state.run, { legacy: true })) {
      const draft = structuredClone(state);
      assert.ok(M.chooseStartingGift(draft, gift.id));
      const mounted = draft.run.mountedCards.filter(Boolean);
      assert.equal(mounted.length, gift.cardId === 'camp-kit' ? 1 : 2);
      assert.ok(M.getOwnedCards(draft.run).some(card => card.cardId === gift.cardId));
      assert.equal(mounted.filter(c => c.cardId === "lift-guide").length, 1);
      if (mounted.length === 2) assert.notEqual(mounted[0].cardId, mounted[1].cardId);
      assert.equal(M.chooseStartingGift(reload(draft), gift.id), false);
      legacyGuide ||= gift.cardId === "lift-guide";
      legacyOther ||= gift.cardId !== "lift-guide";
    }
  }
  assert.ok(legacyGuide && legacyOther);
  const state = fresh("no-starter-farm"), offer = M.getStartingGiftOffers(state.run)[0];
  assert.ok(M.chooseStartingGift(state, offer.id));
  assert.ok(M.meltMountedCard(state, 1));
  const wallet = state.run.condensedGlow, hand = structuredClone(state.run.mountedCards);
  const loaded = reload(state);
  assert.deepEqual(loaded.run.mountedCards, hand);
  assert.equal(M.chooseStartingGift(loaded, offer.id), false);
  assert.equal(loaded.run.condensedGlow, wallet);
  const old = fresh("old-picked");delete old.run.cardStarterVersion;
  old.run.startingGiftId = "card:body-spark";
  old.run.mountedCards[0] = makeSkillCard("body-spark", "old:starter");
  assert.deepEqual(reload(old).run.mountedCards, old.run.mountedCards);
  assert.equal(M.chooseStartingGift(old, "card:lift-guide"), false);
  const pendingWithCards = fresh("preserve-pending-hand");delete pendingWithCards.run.cardStarterVersion;
  pendingWithCards.run.mountedCards[0] = makeSkillCard("spark-cache", "old:limited");
  pendingWithCards.run.mountedCards[0].charges = 2;
  assert.equal(M.chooseStartingGift(pendingWithCards, M.getStartingGiftOffers(pendingWithCards.run)[0].id), false);
  assert.equal(pendingWithCards.run.mountedCards[0].charges, 2);
});

test("every generated node is reachable; midpoint Rest is guaranteed and the late Rest retains its fork", () => {
  for (let seed = 0; seed < 120; seed++) {
    const state = fresh(`routes-${seed}`),
      run = state.run,
      byId = new Map(run.map.flat().map((node) => [node.id, node]));
    assert.equal(run.map.length, 10);
    assert.equal(run.map.flat().filter(node => node.kind === "camp").length, 3);
    const reachable = new Set(run.map[0].map((node) => node.id));
    for (const row of run.map)
      for (const node of row) {
        assert.ok(reachable.has(node.id), `orphan ${node.id}`);
        assert.ok(node.nextIds.length <= 2);
        for (const id of node.nextIds) reachable.add(id);
      }
    for (const row of [4, 8]) {
      const rest = run.map[row].find((node) => node.kind === "camp");
      assert.ok(rest);
      assert.equal(rest.nextIds.length, 1);
      assert.notEqual(byId.get(rest.nextIds[0]).type, "support");
      for (const previous of run.map[row - 1]) {
        assert.ok(previous.nextIds.includes(rest.id));
        assert.equal(previous.nextIds.length, row === 4 ? 1 : 2);
        if (row === 8) assert.ok(previous.nextIds.some((id) => byId.get(id).kind !== "camp"));
      }
    }
    const mid = run.map[4].find((node) => node.kind === "camp"),
      late = run.map[8].find((node) => node.kind === "camp"),
      seen = new Set(),
      queue = [...mid.nextIds];
    while (queue.length) {
      const id = queue.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push(...byId.get(id).nextIds);
    }
    assert.ok(seen.has(late.id));
  }
});

test("first-clear cards enter the deck, allow onward routing and melt only when selected", () => {
  let state = fresh(),
    run = state.run;
  flight(state);
  const reward = M.getCardReward(run),
    wallet = run.condensedGlow;
  assert.ok(reward);
  assert.equal(reward.claimed, true);
  assert.equal(reward.choice, "deck");
  assert.ok(M.getRouteMapState(run).availableIds.length > 0);
  assert.equal(M.getReserveCards(run)[0].instanceId, reward.card.instanceId);
  assert.ok(run.mountedCards.every((card) => !card));
  state = reload(state);
  run = state.run;
  assert.deepEqual(M.getCardReward(run), reward);
  const payout = reward.card.meltValue;
  assert.ok(M.meltOwnedCards(state, [reward.card.instanceId]));
  assert.equal(run.condensedGlow, wallet + payout);
  assert.equal(M.meltOwnedCards(state, [reward.card.instanceId]), false);
  assert.equal(run.condensedGlow, wallet + payout);
  assert.equal(reload(state).run.condensedGlow, wallet + payout);
});

test("equipping into a full hand returns its previous card to reserve without a payout", () => {
  const state = fresh(),
    run = state.run;
  mount(run, ["body-spark", "echo", "deep-vessel"]);
  flight(state);
  assert.equal(M.chooseCardReward(state, "equip"), false);
  const before = run.condensedGlow, previous = structuredClone(run.mountedCards[1]);
  assert.ok(M.equipOwnedCard(run, run.cardReward.card.instanceId, 1));
  assert.equal(run.condensedGlow, before);
  assert.deepEqual(run.reserveCards.find((card) => card.instanceId === previous.instanceId), previous);
  assert.equal(run.mountedCards[1].instanceId, run.cardReward.card.instanceId);
  assert.equal(M.chooseCardReward(state, "equip", 0), false);
});

test("ordered copies share numeric executions and Field magnitude; modifiers cannot recurse", () => {
  const run = fresh().run;
  mount(run, ["echo", "body-spark", "field-impulse"]);
  let runtime = createCardExecution(M.getRunModifiers(run).cardExecution);
  assert.equal(executeCardBodyPickup(runtime).bonus, 4 * CARD_UNIT);
  assert.equal(M.getMountedCards(run)[0].copyPreview, "Repeats +2 Sparks");
  assert.ok(M.getRunModifiers(run).collectorFieldImpulse);
  M.moveMountedCard(run, 0, 1);
  runtime = createCardExecution(M.getRunModifiers(run).cardExecution);
  assert.equal(executeCardBodyPickup(runtime).bonus, 2 * CARD_UNIT);
  assert.match(
    M.getMountedCards(run)[1].copyPreview,
    /Adds 1 Field Impulse source.*0\.8s/,
  );
  mount(run, ["echo", "chameleon", "body-spark"]);
  runtime = createCardExecution(M.getRunModifiers(run).cardExecution);
  assert.equal(executeCardBodyPickup(runtime).bonus, 4 * CARD_UNIT);
  assert.match(
    M.getMountedCards(run)[0].copyPreview,
    /Cannot repeat Chameleon/,
  );
});

test("copyable capacity recalculates immediately without refill or lost charges", () => {
  const state = fresh(),
    run = state.run;
  run.flame = 62;
  mount(run, ["chameleon", "deep-vessel", "echo"]);
  assert.equal(getGlowCapacity(run), 120);
  assert.equal(run.flame, 62);
  assert.match(M.getMountedCards(run)[2].copyPreview, /No card to the right/);
  M.moveMountedCard(run, 0, 2);
  assert.equal(getGlowCapacity(run), 110);
  assert.equal(run.flame, 62);
  assert.ok(M.meltMountedCard(state, 1));
  assert.equal(getGlowCapacity(run), 100);
  assert.equal(run.flame, 62);
  assert.equal(M.meltMountedCard(state, 1), false);
});

test("limited repeats and borrows spend source uses per execution, including failures and interrupted reloads", () => {
  let state = fresh(),
    run = state.run;
  mount(run, ["echo", "spark-cache", "chameleon"]);
  run.mountedCards[1].charges = 1;
  let runtime = createCardExecution(M.getRunModifiers(run).cardExecution);
  const payout = executeCardBodyPickup(runtime);
  assert.equal(payout.executions, 1);
  assert.equal(payout.bonus, 4 * CARD_UNIT);
  assert.equal(executeCardBodyPickup(runtime).bonus, 0);
  flight(state, undefined, {
    success: false,
    cardCharges: getCardCharges(runtime),
    cardExecutions: 1,
  });
  assert.equal(run.mountedCards[1], null);
  assert.equal(run.cardReward, undefined);
  state = reload(state);
  assert.equal(state.run.mountedCards[1], null);
  state = fresh("interrupt");
  run = state.run;
  mount(run, ["spark-cache"]);
  const node = M.getChoices(run)[0];
  M.selectNode(run, node.id);
  M.beginFlightAttempt(run);
  M.markFlightAttemptStarted(run);
  M.commitCardCharges(run, { [run.mountedCards[0].instanceId]: 2 });
  state = reload(state);
  assert.equal(state.run.mountedCards[0].charges, 2);
});

test("rank improvement changes the printed and executed amount, costs once, never recharges or refills", () => {
  const state = fresh(),
    run = state.run;
  mount(run, ["spark-cache"]);
  run.mountedCards[0].charges = 2;
  run.flame = 61;
  run.condensedGlow = 100;
  camp(state);
  const preview = M.getCardImprovePreview(run, 0);
  assert.equal(preview.before.amount, 4);
  assert.equal(preview.after.amount, 5);
  assert.equal(preview.price, 15);
  assert.ok(M.improveMountedCard(state, 0, 1));
  assert.equal(run.condensedGlow, 85);
  assert.equal(run.mountedCards[0].charges, 2);
  assert.equal(run.flame, 61);
  assert.equal(M.improveMountedCard(state, 0, 1), false);
  const runtime = createCardExecution(M.getRunModifiers(run).cardExecution);
  assert.equal(executeCardBodyPickup(runtime).bonus, 5 * CARD_UNIT);
});

test("all three Harvest tiers stack and each Legendary contributes only a per-wave wallet award", () => {
  const run = fresh().run;
  mount(run, ["harvest-common", "harvest-rare", "harvest-legendary"]);
  const modifiers = M.getRunModifiers(run);
  assert.equal(modifiers.cardHarvestMeter, 5 * CARD_UNIT);
  assert.equal(modifiers.cardHarvestStoredPerWave, 1);
  assert.equal(modifiers.resonantHarvest, 0);
});

test("Rare Cache and Flash Handling grant all mounted capabilities without permanently learning skills", () => {
  const state = fresh("handling"),
    run = state.run;
  const cache = { kind: "cache", sparkMass: 3 },
    flash = { kind: "sight" };
  assert.equal(collectorCanFetch(cache, M.getRunModifiers(run)), false);
  assert.equal(collectorCanFetch(flash, M.getRunModifiers(run)), false);
  mount(run, ["cache-handling", "flash-handling"]);
  const modifiers = M.getRunModifiers(run);
  assert.equal(modifiers.collectorFetchMass, 3);
  assert.equal(modifiers.collectorFlashFetch, true);
  assert.equal(collectorCanFetch(cache, modifiers), true);
  assert.equal(collectorCanFetch(flash, modifiers), true);
  assert.deepEqual(run.skills, {});
  assert.equal(SKILL_CARDS["cache-handling"].rarity, "rare");
  assert.match(M.getMountedCards(run)[0].effect, /delivered Cache gives 12 Sparks/);
  assert.match(M.getMountedCards(run)[1].effect, /up to 6 missing Sparks/);
  M.meltMountedCard(state, 0);
  M.meltMountedCard(state, 1);
  assert.equal(collectorCanFetch(cache, M.getRunModifiers(run)), false);
  assert.equal(collectorCanFetch(flash, M.getRunModifiers(run)), false);
  run.skills["collector-fetch-large"] = 1;
  run.skills["collector-fetch-flash"] = 1;
  assert.equal(collectorCanFetch(cache, M.getRunModifiers(run)), true);
  assert.equal(collectorCanFetch(flash, M.getRunModifiers(run)), true);
});

test("three Common Melts fund the exact 30-Spark Rare and no refill accompanies forging", () => {
  const state = fresh("three-melts"),
    run = state.run;
  run.condensedGlow = 0;
  for (let index = 0; index < 3; index++) {
    run.cardReward = {
      id: `melt-${index}`,
      card: makeSkillCard("body-spark", `melt-${index}`),
      claimed: false,
    };
    assert.ok(M.chooseCardReward(state, "melt"));
    assert.equal(run.condensedGlow, (index + 1) * 10);
  }
  camp(state);
  run.flame = 7;
  assert.ok(M.forgeOwnedCard(state, "rare", M.getCardForgePreview(run).token));
  assert.equal(run.condensedGlow, 0);
  assert.equal(run.flame, 7);
});

test("Grow unlock never grants automatic growth and preserves its three-action cap", () => {
  const state = fresh("grow-cap"),
    run = state.run;
  mount(run, ["growth-seed-common"]);
  run.lives = 2;
  assert.equal(getGlowCapacity(run), 100);
  for (let index = 0; index < 3; index++) {
    run.mapIndex = index;
    camp(state);
    assert.ok(choose(run, "rest-grow"));
    assert.equal(getGlowCapacity(run), 100 + 10 * (index + 1));
    assert.equal(run.flame, getGlowCapacity(run));
    assert.equal(run.lives, 2);
  }
  run.mapIndex = 3;
  camp(state);
  assert.equal(
    M.getSupportChoices(run).find((c) => c.id === "rest-grow").disabled,
    true,
  );
  assert.equal(choose(run, "rest-grow"), false);
  assert.ok(choose(run, "rest-continue"));
});

test("Forge stores its card without spending either Rest action", () => {
  const state = fresh("forge-first"),
    run = state.run;
  mount(run, ["camp-kit", "growth-seed"]);
  run.condensedGlow = 100;
  run.flame = 15;
  run.lives = 2;
  camp(state);
  const quote = M.getCardForgePreview(run);
  assert.ok(M.forgeOwnedCard(state, "rare", quote.token));
  assert.equal(run.phase, "support");
  assert.equal(run.mountedCards[0].charges, 1);
  assert.equal(run.cardReward, undefined);
  assert.ok(run.reserveCards.some((card) => card.instanceId === quote.card.instanceId));
  assert.equal(run.mountedCards[0].charges, 1);
  assert.deepEqual(run.cardRest.actions, []);
  assert.ok(choose(run, "rest-recover"));
  assert.ok(choose(run, "rest-slot"));
  assert.equal(run.mountedCards[0], null);
  assert.equal(run.lives, 3);
  assert.deepEqual(run.lastRest.actions, ["recover", "slot"]);
});

test("forge previews exact seeded cards for both tiers and spends only wallet without refill", () => {
  let state = fresh(),
    run = state.run;
  mount(run, ["rhythm"]);
  run.condensedGlow = 100;
  run.flame = 33;
  run.lives = 2;
  camp(state);
  const rare = M.getCardForgePreview(run),
    legendary = M.getCardForgePreview(run, "legendary");
  assert.equal(rare.price, 30);
  assert.equal(rare.card.rarity, "rare");
  assert.equal(legendary.price, 60);
  assert.equal(legendary.card.rarity, "legendary");
  assert.ok(legendary.eligible);
  state = reload(state);
  run = state.run;
  assert.deepEqual(M.getCardForgePreview(run), rare);
  assert.ok(M.forgeOwnedCard(state, "rare", rare.token));
  assert.equal(run.condensedGlow, 70);
  assert.equal(run.flame, 33);
  assert.equal(run.lives, 2);
  assert.equal(run.cardSlots, 3);
  assert.equal(run.lastCardForged.instanceId, rare.card.instanceId);
  assert.equal(run.lastCardForged.cardId, rare.card.cardId);
  assert.equal(run.phase, "support");
  assert.equal(M.forgeOwnedCard(state, "rare", rare.token), false);
  assert.deepEqual(run.cardRest.actions, []);
  assert.equal(reload(state).run.condensedGlow, 70);
});

test("Legendary forging is locked until a Rare is mounted; insufficient wallet changes nothing", () => {
  const state = fresh(),
    run = state.run;
  run.condensedGlow = 29;
  camp(state);
  assert.match(M.getCardForgePreview(run, "legendary").reason, /Mount a Rare/);
  const before = structuredClone(run);
  assert.equal(M.forgeOwnedCard(state, "rare", M.getCardForgePreview(run).token), false);
  assert.deepEqual(run, before);
  run.condensedGlow = 30;
  assert.ok(M.forgeOwnedCard(state, "rare", M.getCardForgePreview(run).token));
  assert.equal(run.condensedGlow, 0);
});

test("second distinct camp action spends one real charge only on successful second commit", () => {
  let state = fresh(),
    run = state.run;
  mount(run, ["camp-kit", "growth-seed-common"]);
  run.condensedGlow = 60;
  run.lives = 2;
  run.flame = 20;
  camp(state);
  assert.ok(choose(run, "rest-grow"));
  assert.equal(run.phase, "support");
  assert.equal(M.getOwnedCards(run).find(card => card.cardId === 'camp-kit').charges, 1);
  assert.equal(run.lives, 2);
  assert.equal(run.flame, 110);
  assert.equal(choose(run, "rest-grow"), false);
  assert.equal(M.getOwnedCards(run).find(card => card.cardId === 'camp-kit').charges, 1);
  state = reload(state);
  run = state.run;
  assert.deepEqual(run.cardRest.actions, ["grow"]);
  assert.equal(M.getOwnedCards(run).find(card => card.cardId === 'camp-kit').charges, 1);
  assert.ok(M.forgeOwnedCard(state, "rare", M.getCardForgePreview(run).token));
  assert.equal(M.getOwnedCards(run).find(card => card.cardId === 'camp-kit').charges, 1);
  assert.deepEqual(run.lastRest.actions, ["grow"]);
  assert.ok(choose(run, "rest-slot"));
  assert.equal(run.mountedCards[0], null);
  assert.equal(run.condensedGlow, 30);
  assert.deepEqual(run.lastRest.actions, ["grow", "slot"]);
  assert.equal(run.restVisits.length, 1);
  assert.equal(run.phase, "map");
  assert.equal(choose(run, "rest-forge-legendary"), false);
});

test("leaving after one action or no possible second action preserves camp-kit charge", () => {
  const state = fresh(),
    run = state.run;
  mount(run, ["camp-kit"]);
  run.flame = 20;
  run.condensedGlow = 0;
  camp(state);
  assert.ok(choose(run, "rest-recover"));
  assert.equal(run.phase, "support");
  assert.ok(choose(run, "rest-continue"));
  assert.equal(run.mountedCards[0].charges, 1);
  const state2 = fresh("no-second"),
    run2 = state2.run;
  mount(run2, ["camp-kit"]);
  run2.cardSlots = 5;
  run2.mountedCards.push(null, null);
  run2.condensedGlow = 0;
  run2.flame = 10;
  camp(state2);
  assert.ok(choose(run2, "rest-recover"));
  assert.equal(run2.phase, "map");
  assert.equal(run2.mountedCards[0].charges, 1);
});

test("Second Ember arrival eligibility and slot limits persist while Grow uses the equipped seed", () => {
  const state = fresh(),
    run = state.run;
  run.flame = 20;
  camp(state);
  mount(run, ["camp-kit", "growth-seed"]);
  assert.equal(M.getSupportChoices(run).find((c) => c.id === "rest-grow").disabled, false);
  assert.ok(choose(run, "rest-slot"));
  assert.equal(run.cardSlots, 4);
  assert.equal(run.flame, 20);
  assert.equal(run.phase, "map");
  const late = run.map[8].find((n) => n.kind === "camp");
  run.current = late;
  run.step = 8;
  run.path.push(late.id);
  run.phase = "support";
  const choices = M.getSupportChoices(run);
  assert.equal(choices.find((c) => c.id === "rest-slot").disabled, true);
});

test("all three guardians and elites drop cards, final guardian records trophy with winning hand", () => {
  const state = fresh("campaign"),
    run = state.run;
  mount(run, ["body-spark", "rhythm"]);
  let guardians = 0,
    elites = 0;
  while (run.phase !== "ended") {
    if (run.phase === "map-clear") {
      resolveRewards(state);
      assert.ok(M.advanceMap(run));
      continue;
    }
    const choices = M.getChoices(run),
      node =
        choices.find((n) => n.elite) ||
        choices.find((n) => n.type !== "support") ||
        choices[0];
    if (node.type === "support") {
      assert.ok(M.selectNode(run, node.id));
      const offers = M.getSupportChoices(run);
      const leave = offers.findIndex(
        (c) => !c.disabled && c.effect.restContinue,
      );
      const index = leave >= 0 ? leave : offers.findIndex((c) => !c.disabled);
      assert.ok(M.resolveSupport(run, index));
      continue;
    }
    flight(state, node);
    if (node.elite) elites++;
    if (node.boss) guardians++;
    assert.ok(M.getCardReward(run));
    assert.equal(M.getOwnedCards(run).length, 2 + run.stats.flights);
    assert.ok(run.reserveCards.some((card) => card.instanceId === run.cardReward.card.instanceId));
    if (run.phase !== "ended") resolveRewards(state);
  }
  assert.equal(guardians, 3);
  assert.ok(elites >= 3);
  assert.ok(run.finalCardTrophy);
  assert.equal(run.cardReward.trophy, true);
  assert.equal(run.cardReward.claimed, true);
  assert.equal(run.winningHand.length, 2);
  assert.equal(M.chooseCardReward(state, "melt"), false);
  assert.equal(M.chooseCardReward(state, "equip", 0), false);
  assert.equal(run.cardRewardedNodes.length, run.stats.flights);
  run.cardReward.uiAcknowledged = true;
  assert.ok(M.bankRun(state));
  const restored = reload(state).run;
  assert.deepEqual(restored.finalCardTrophy, run.finalCardTrophy);
  assert.equal(M.getOwnedCards(restored).length, 2 + run.stats.flights);
  assert.equal(restored.reserveCards.filter((card) => card.instanceId === run.finalCardTrophy.instanceId).length, 1);
});
