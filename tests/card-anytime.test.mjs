import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { WispFlight } from '../dist/flight.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';

function fresh(seed = 'anytime-deck') {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  state.run.condensedGlow = 200;
  return state;
}
function add(run, cardId, id, mounted = null, extra = {}) {
  const card = { ...makeSkillCard(cardId, id), ...extra };
  if (mounted === null) run.reserveCards.push(card);
  else run.mountedCards[mounted] = card;
  return card;
}
function camp(run) {
  const node = run.map.flat().find(site => site.kind === 'camp');
  Object.assign(run, { step: node.row, current: node, path: [node.id], phase: 'support' });
  M.getSupportChoices(run);
}
function launch(state) {
  const run = state.run, node = M.getChoices(run).find((choice) => choice.type !== 'support');
  assert.ok(M.selectNode(run, node.id));
  assert.ok(M.beginFlightAttempt(run));
  assert.ok(M.markFlightAttemptStarted(run));
  const engine = new WispFlight({
    preflight: true, seed: `${run.seed}-${node.id}`, node,
    modifiers: M.getRunModifiers(run), flame: run.flame, condensedGlow: run.condensedGlow,
    condensedRemainder: run.condensedRemainder, cardPilot: true,
    canvas: { getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 900, height: 430 }) },
  });
  engine.running = true;
  return engine;
}
function reload(state) {
  let data;
  const storage = { getItem: () => data, setItem: (_, value) => { data = value; } };
  assert.ok(M.saveState(state, storage));
  return M.loadState(storage);
}
function finish(state, engine, success) {
  let result;
  engine.onFinish = (value) => { result = value; };
  engine.finish(success);
  if (success) {
    engine.completionAge = engine.completionDuration;
    engine.finish(true);
  }
  assert.ok(result);
  assert.ok(M.finishFlight(state.run, result));
  return result;
}

test('Forge previews anywhere but purchases only at Rest with exact offers and stale-tap rejection', () => {
  let state = fresh(), run = state.run;
  const first = M.getCardForgePreview(run);
  assert.equal(first.actionCost, 0);
  for (const phase of ['briefing', 'support', 'map-clear', 'retry', 'map']) {
    run.phase = phase;
    assert.equal(M.canManageCards(run), true);
    assert.deepEqual(M.getCardForgePreview(run), first);
    assert.equal(M.forgeOwnedCard(state, 'rare', first.token), false);
  }
  camp(run);
  assert.ok(M.forgeOwnedCard(state, 'rare', first.token));
  assert.equal(M.forgeOwnedCard(state, 'rare', first.token), false);
  const second = M.getCardForgePreview(run);
  assert.notEqual(second.card.instanceId, first.card.instanceId);
  assert.ok(M.forgeOwnedCard(state, 'rare', second.token));
  assert.equal(run.condensedGlow, 140);
  assert.equal(run.cardReward, undefined);
  assert.equal(run.reserveCards.length, 2);
  state = reload(state); run = state.run;
  assert.equal(run.reserveCards.length, 2);
  assert.equal(new Set(M.getOwnedCards(run).map((card) => card.instanceId)).size, 2);
  assert.equal(M.forgeOwnedCard(state, 'rare', second.token), false);
  assert.notEqual(M.getCardForgePreview(run).token, second.token);
  assert.match(M.getCardForgePreview(run, 'legendary').reason, /Mount a Rare/);
  assert.ok(M.equipOwnedCard(run, first.card.instanceId, 0));
  const legendary = M.getCardForgePreview(run, 'legendary');
  assert.equal(legendary.price, 60);
  assert.ok(M.forgeOwnedCard(state, 'legendary', legendary.token));
  assert.equal(run.condensedGlow, 80);
});

test('Forge previews and purchases reject invalid, unaffordable, terminal and non-card runs without mutations', () => {
  const state = fresh(), run = state.run;
  for (const configure of [
    () => { run.condensedGlow = 29; },
    () => { run.condensedGlow = 200; run.phase = 'ended'; },
    () => { run.phase = 'map'; run.banked = true; },
    () => { run.banked = false; run.lives = 0; },
    () => { run.lives = 3; run.skillSystem = null; },
  ]) {
    configure();
    const before = structuredClone(run);
    assert.equal(M.forgeOwnedCard(state, 'rare', M.getCardForgePreview(run).token), false);
    assert.deepEqual(run, before);
  }
  run.skillSystem = M.CARD_SYSTEM;
  const before = structuredClone(run);
  assert.equal(M.forgeOwnedCard(state, 'mythic'), false);
  assert.deepEqual(run, before);
});

test('a live paused Deck settles uses, edits ordering/capacity and rejects rank changes without resetting flight state', () => {
  const state = fresh(), run = state.run;
  add(run, 'echo', 'echo', 0);
  add(run, 'spark-cache', 'finite', 1, { charges: 4 });
  add(run, 'deep-vessel', 'capacity', 2);
  add(run, 'rhythm', 'rhythm');
  const engine = launch(state);
  engine.flame = 0;
  engine.collect({ kind: 'light' });
  assert.equal(engine.getState().cardCharges.finite, 2);
  assert.equal(run.mountedCards[1].charges, 4);
  assert.equal(M.syncCardFlightForEdit(run, engine), false);
  assert.equal(M.unequipMountedCard(run, 1), false);
  engine.time = 7; engine.distance = 555; engine.player.y = 177; engine.player.vy = -12;
  engine.wisp.cooldown = 3.1; engine.fleet[0].cooldown = 2.4;
  engine.fourthBeatTaps = [1, 2];
  engine.pause();
  const before = { time: engine.time, distance: engine.distance, y: engine.player.y, vy: engine.player.vy,
    fuel: engine.flame, pickups: engine.bodyPickups, flaps: engine.flaps, ring: engine.wisp.cooldown,
    cooldown: engine.fleet[0].cooldown, executions: engine.cardExecutions };
  assert.ok(M.syncCardFlightForEdit(run, engine));
  assert.ok(M.syncCardFlightForEdit(run, engine));
  assert.equal(run.mountedCards[1].charges, 2);
  assert.equal(M.improveOwnedCard(state, 'finite', 1), false);
  assert.ok(M.moveMountedCard(run, 0, 1));
  assert.ok(M.equipOwnedCard(run, 'rhythm', 2, 'capacity'));
  assert.ok(M.applyCardFlightEdits(run, engine));
  assert.equal(engine.maxFlame, 100);
  assert.ok(engine.cardRhythm);
  assert.deepEqual(engine.cardExecution.cards.map((card) => card?.instanceId || null), ['finite', 'echo', 'rhythm']);
  assert.equal(engine.cardExecution.cards[0].rank, 1);
  assert.equal(engine.cardExecution.cards[0].charges, 2);
  assert.deepEqual({ time: engine.time, distance: engine.distance, y: engine.player.y, vy: engine.player.vy,
    fuel: engine.flame, pickups: engine.bodyPickups, flaps: engine.flaps, ring: engine.wisp.cooldown,
    cooldown: engine.fleet[0].cooldown, executions: engine.cardExecutions }, before);
  assert.deepEqual(engine.fourthBeatTaps, [], 'normal pause clears the input phrase; editing adds no taps');
  assert.ok(M.closeCardFlightEdit(run, engine));
  assert.equal(M.canManageCards(run), false);
  engine.paused = false; engine.flame = 0;
  engine.collect({ kind: 'light' });
  assert.equal(engine.getState().cardCharges.finite, 1, 'new order executes only the real finite source');
  assert.equal(engine.cardExecutions, 3);
  engine.pause(); assert.ok(M.syncCardFlightForEdit(run, engine));
  assert.equal(run.mountedCards[0].charges, 1);
  assert.ok(M.unequipMountedCard(run, 2, 'rhythm'));
  assert.ok(M.applyCardFlightEdits(run, engine));
  assert.equal(engine.cardRhythm, null);
  engine.destroy();
});

test('mid-flight Melt survives failure and reload while Forge remains at Rest', () => {
  let state = fresh('live-wallet'), run = state.run;
  run.condensedGlow = 60;
  add(run, 'spark-cache', 'finite', 0, { charges: 2 });
  add(run, 'body-spark', 'melt:a'); add(run, 'body-spark', 'melt:b');
  const engine = launch(state);
  engine.flame = 0; engine.collect({ kind: 'light' });
  engine.condensedGlow = 9;
  engine.pause(); assert.ok(M.syncCardFlightForEdit(run, engine));
  const melt = M.getCardMeltPreview(run, ['melt:a', 'melt:b']);
  assert.ok(M.meltOwnedCards(state, ['melt:a', 'melt:b'], melt.token));
  assert.equal(M.meltOwnedCards(state, ['melt:a', 'melt:b'], melt.token), false);
  const first = M.getCardForgePreview(run);
  assert.equal(M.forgeOwnedCard(state, 'rare', first.token), false);
  assert.equal(run.condensedGlow, 80);
  assert.match(M.getCardForgePreview(run).reason, /at Rest/);
  assert.ok(M.applyCardFlightEdits(run, engine));
  assert.equal(engine.condensedStart, 80);
  assert.equal(engine.condensedGlow, 9);
  assert.equal(engine.condensedTotal, 89);
  assert.ok(M.closeCardFlightEdit(run, engine));
  finish(state, engine, false);
  assert.equal(run.condensedGlow, 80, 'failure does not undo the banked Melt');
  assert.equal(run.mountedCards[0].charges, 1);
  assert.equal(run.reserveCards.length, 0);
  engine.destroy();
  state = reload(state); run = state.run;
  assert.equal(run.condensedGlow, 80);
  assert.equal(run.reserveCards.length, 0);
  assert.equal(run.mountedCards[0].charges, 1);
  assert.equal(M.forgeOwnedCard(state, 'rare', first.token), false);
});

test('closing/cancelling a live Deck releases its gate and resumed, mismatched or terminal engines cannot edit', () => {
  const state = fresh('edit-gates'), run = state.run;
  add(run, 'body-spark', 'body', 0);
  const engine = launch(state);
  engine.pause(); assert.ok(M.syncCardFlightForEdit(run, engine));
  const before = structuredClone(run), flame = engine.flame;
  assert.ok(M.closeCardFlightEdit(run, engine));
  assert.deepEqual(run, before);
  assert.equal(engine.flame, flame);
  assert.equal(M.meltMountedCard(state, 0), false);
  assert.ok(M.syncCardFlightForEdit(run, engine));
  engine.paused = false;
  assert.equal(M.improveOwnedCard(state, 'body', 1), false);
  assert.equal(M.forgeOwnedCard(state, 'rare', M.getCardForgePreview(run).token), false);
  assert.equal(M.applyCardFlightEdits(run, engine), false);
  engine.paused = true; engine.seed += ':wrong';
  assert.equal(M.syncCardFlightForEdit(run, engine), false);
  assert.equal(M.unequipMountedCard(run, 0), false);
  engine.seed = `${run.seed}-${run.current.id}`; engine.finished = true;
  assert.equal(M.syncCardFlightForEdit(run, engine), false);
  engine.destroy();
});

test('interrupted reload retains paused Deck order and consumed uses without permitting Forge', () => {
  let state = fresh('interrupted-pack'), run = state.run;
  add(run, 'spark-cache', 'source', 0, { charges: 2 });
  add(run, 'deep-vessel', 'vessel');
  const engine = launch(state);
  engine.flame = 0; engine.collect({ kind: 'light' });
  engine.pause(); assert.ok(M.syncCardFlightForEdit(run, engine));
  assert.ok(M.moveMountedCard(run, 0, 2));
  assert.ok(M.equipOwnedCard(run, 'vessel', 0));
  const quote = M.getCardForgePreview(run);
  assert.equal(M.forgeOwnedCard(state, 'rare', quote.token), false);
  engine.condensedGlow = 7;
  state = reload(state); run = state.run;
  assert.equal(run.attemptActive, false);
  assert.equal(run.condensedGlow, 200);
  assert.deepEqual(run.mountedCards.map((card) => card?.instanceId || null), ['vessel', null, 'source']);
  assert.equal(run.mountedCards[2].charges, 1);
  assert.equal(run.reserveCards.filter((card) => card.instanceId === quote.card.instanceId).length, 0);
  assert.equal(M.forgeOwnedCard(state, 'rare', quote.token), false);
  engine.destroy();
});

test('Tight Packing is earned prospectively across live enter/leave edits and keeps quarters through successful finish', () => {
  const state = fresh('live-packing'), run = state.run;
  add(run, 'tight-packing', 'packing');
  const engine = launch(state);
  const pack = (amount) => { engine.flame = engine.maxFlame; for (let i = 0; i < amount; i++) engine.collect({ kind: 'light' }); };
  const edit = (change) => { engine.pause(); assert.ok(M.syncCardFlightForEdit(run, engine)); change(); assert.ok(M.closeCardFlightEdit(run, engine)); engine.paused = false; };
  pack(4);
  assert.equal(engine.cardPackingBonus, 0);
  edit(() => assert.ok(M.equipOwnedCard(run, 'packing', 0)));
  assert.equal(engine.cardPackingBonus, 0, 'mounting does not backfill earlier earnings');
  pack(3); assert.equal(engine.cardPackingRemainder, 3);
  edit(() => assert.ok(M.unequipMountedCard(run, 0, 'packing')));
  pack(4); assert.equal(engine.cardPackingBonus, 0); assert.equal(engine.cardPackingRemainder, 3);
  edit(() => assert.ok(M.equipOwnedCard(run, 'packing', 0)));
  pack(2); assert.equal(engine.cardPackingBonus, 1); assert.equal(engine.cardPackingRemainder, 1);
  edit(() => assert.ok(M.unequipMountedCard(run, 0, 'packing')));
  assert.equal(engine.cardPackingBonus, 1, 'removing a card preserves its earned bonus');
  engine.flame = 0;
  const wallet = run.condensedGlow, result = finish(state, engine, true);
  assert.equal(result.cardPackingBonus, 1);
  assert.equal(result.cardPackingRemainder, 1);
  assert.equal(run.lastFlight.cardPackingBonus, 1);
  assert.equal(run.cardPackingRemainder, 1);
  M.settleCheckpoint(state);
  const earned = wallet + 13 + 1 + run.lastFlight.completionBonus + (run.lastFlight.routeBonus?.amount || 0);
  assert.equal(run.condensedGlow, earned);
  M.settleCheckpoint(state);
  assert.equal(run.condensedGlow, earned, 'settling again never replays the live packing earnings');
  engine.destroy();
});

test('a successful purchased flight keeps pending earnings and credits its exit with the current packing loadout exactly once', () => {
  const state = fresh('live-paid-clear'), run = state.run;
  run.condensedGlow = 30; run.cardPackingRemainder = 3;
  add(run, 'tight-packing', 'packing', 0);
  camp(run);
  assert.ok(M.forgeOwnedCard(state, 'rare', M.getCardForgePreview(run).token));
  assert.ok(M.resolveSupport(run, M.getSupportChoices(run).findIndex(choice => choice.effect?.restContinue)));
  const engine = launch(state);
  engine.flame = engine.maxFlame;
  for (let i = 0; i < 3; i++) engine.collect({ kind: 'light' });
  assert.equal(engine.condensedGlow, 3);
  assert.equal(engine.cardPackingBonus, 1);
  assert.equal(engine.cardPackingRemainder, 2);
  engine.pause(); assert.ok(M.syncCardFlightForEdit(run, engine));
  assert.equal(M.forgeOwnedCard(state, 'rare', M.getCardForgePreview(run).token), false);
  assert.equal(run.condensedGlow, 0);
  assert.ok(M.closeCardFlightEdit(run, engine));
  assert.equal(engine.condensedStart, 0);
  assert.equal(engine.condensedTotal, 4, 'banked purchase preserves pending base and bonus');
  engine.flame = 40;
  const result = finish(state, engine, true);
  assert.equal(engine.exitPacking.amount, 2);
  assert.equal(result.cardPackingBonus, 2);
  assert.equal(result.cardPackingRemainder, 0);
  M.settleCheckpoint(state);
  const earned = 3 + 2 + 2 + run.lastFlight.completionBonus + (run.lastFlight.routeBonus?.amount || 0);
  assert.equal(run.condensedGlow, earned);
  assert.equal(run.cardPackingRemainder, 0);
  assert.equal(M.finishFlight(run, result), false);
  assert.equal(M.settleCheckpoint(state), 0);
  assert.equal(run.condensedGlow, earned);
  engine.destroy();
});

test('Legendary Harvest earnings survive removing their source during the same real flight', () => {
  const state = fresh('live-harvest'), run = state.run;
  add(run, 'harvest-legendary', 'harvest', 0);
  const engine = launch(state);
  const packet = { x: engine.distance + 90, y: 100, kind: 'light' };
  engine.layout.embers = [packet];
  engine.luminanceWaves.emit({ x: packet.x - 80, y: packet.y, radius: 300 });
  engine.luminanceWaves.update(.5);
  assert.equal(engine.resonanceStored, 1);
  assert.equal(packet.collected, undefined);
  engine.pause(); assert.ok(M.syncCardFlightForEdit(run, engine));
  assert.ok(M.unequipMountedCard(run, 0, 'harvest'));
  assert.ok(M.closeCardFlightEdit(run, engine));
  assert.equal(engine.mod.cardHarvestStoredPerWave, 0);
  engine.flame = 0; finish(state, engine, true);
  assert.equal(run.lastFlight.resonanceStored, 1);
  engine.destroy();
});
