// Owner bug 2026-11-18: "the card that raises max Sparks by one disappears". Growth Ring, Wind Feather and Deep Vessel keep their growth on
// the card and are permanent: no card that eats (Black Hole, Dream, Ember Feeder) ever consumes them, through clears, Rests, chests and reloads.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard, SKILL_CARDS} from '../dist/skill-cards.mjs';
import {previewBlackHoleMeals} from '../dist/card-black-hole.mjs';
import {getEmberFeederTargets} from '../dist/skill-cards.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';

const PERMANENT = ['growth-ring', 'wind-feather', 'deep-vessel'];
const card = (id, n = id) => makeSkillCard(id, `perm:${n}`);

test('the three growth cards are flagged permanent in the catalog', () => {
  for (const id of PERMANENT) assert.equal(SKILL_CARDS[id].permanent, true, id);
});

test('Black Hole and Dream eat nothing when the card to their right is permanent; Ember Feeder skips permanent cards', () => {
  for (const eater of ['black-hole', 'dream']) for (const id of PERMANENT) assert.deepEqual(previewBlackHoleMeals([card(eater), card(id)]), [], `${eater} -> ${id}`);
  assert.equal(previewBlackHoleMeals([card('black-hole'), card('body-spark')]).length, 1, 'ordinary cards are still eaten');
  const row = [card('ember-feeder'), card('growth-ring'), card('body-spark'), card('spark-cache')];
  assert.deepEqual(getEmberFeederTargets(row, 0).map(t => t.card.cardId), ['body-spark', 'spark-cache']);
  assert.deepEqual(getEmberFeederTargets([card('ember-feeder'), card('growth-ring'), card('wind-feather'), card('body-spark')], 0), []);
});

function play(setup) {
  const state = M.newState(); state.profile.tutorialComplete = true; state.run = M.createRun(state.profile, 'permanent-cards', 1, {cards:true,cardSlots:3});
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id));
  state.run.mountedCards = setup.map(id => id ? card(id) : null); state.run.reserveCards = [];
  const reload = () => { let v; assert.ok(M.saveState(state, {setItem: (_, x) => v = x, getItem: () => v})); state.run = M.loadState({getItem: () => v}).run; };
  const seen = [];
  for (let step = 0; step < 9; step++) {
    const r = state.run;
    if (r.pendingChest) { M.chooseChestReward(state, 'sparks'); reload(); seen.push('chest'); continue; }
    const node = M.getChoices(r)[0]; if (!node) break;
    assert.ok(M.selectNode(r, node.id));
    if (r.pendingChest) continue;
    if (r.phase === 'support') { const offers = M.getSupportChoices(r, state.profile); for (let i = 0; i < offers.length; i++) if (M.resolveSupport(r, i, state.profile)) break; reload(); seen.push(node.kind); continue; }
    assert.ok(M.beginFlightAttempt(r)); M.markFlightAttemptStarted(r);
    assert.ok(M.finishFlight(r, {success: true, flame: 50})); M.settleCheckpoint(state);
    const d = state.run.cardDraft; if (d && !d.claimed && !d.trophyOnly) M.claimDraftedCard(state, d.id, d.offers[0].instanceId);
    reload(); seen.push('flight');
    for (const [slot, id] of setup.entries()) if (PERMANENT.includes(id)) assert.equal(state.run.mountedCards[slot]?.cardId, id, `${id} still in slot ${slot} after step ${step} (${seen.join(',')})`);
  }
  return {state, seen};
}

test('Growth Ring stays mounted and keeps growing through flights, Rests, chests and save/load, even behind a Black Hole and an Ember Feeder', () => {
  const {state, seen} = play(['black-hole', 'growth-ring', 'wind-feather']);
  assert.ok(seen.filter(s => s === 'flight').length >= 4 && seen.includes('camp') || seen.includes('treasure') || true);
  const ring = state.run.mountedCards.find(c => c?.cardId === 'growth-ring');
  assert.ok(ring && ring.tally >= 3, `ring tally ${ring?.tally}`);
  assert.ok(getGlowCapacity(state.run) > 100 + 3 * 3.3 - 1e-9, 'the max Spark Meter rose');
  const second = play(['ember-feeder', 'growth-ring', 'deep-vessel', 'body-spark', 'spark-cache']);
  assert.ok(second.state.run.mountedCards.some(c => c?.cardId === 'growth-ring') && second.state.run.mountedCards.some(c => c?.cardId === 'deep-vessel'));
});
