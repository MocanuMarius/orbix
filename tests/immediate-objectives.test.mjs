// Optional objectives pay on the spot (no Inscription, no slot choice): the stop-page line equals the award, for every objective.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun, newState, getChoices, getRouteBonusCandidates, getRouteBonus, selectNode, beginFlightAttempt, finishFlight} from '../dist/model.mjs';
import {ROUTE_BONUSES, OBJECTIVE_SPARKS, objectiveRewardLine, bonusRewardLine} from '../dist/route-bonuses.mjs';
import {getLifeCapacity} from '../dist/vitality.mjs';

const UTILITY = ['wild-circuit', 'flash-relay', 'long-glide', 'edgeweaver', 'night-sail', 'wayfinder', 'constellation', 'spark-trail', 'reserve-finish', 'lift-windows', 'draft-rider'];
function setup(id, {mapIndex = 0, lives = 1} = {}) {
  for (let seed = 0; seed < 1000; seed++) {
    const state = newState(), run = state.run = createRun(state.profile, String(seed));
    run.testMode = true; run.mapIndex = mapIndex; run.lives = lives;
    run.mountedCards = [null, null, null]; run.skills['proximity-awakening'] = 1;
    for (const node of getChoices(run)) {
      if (!getRouteBonusCandidates(run, node).includes(id)) continue;
      node.bonusId = id;
      assert.ok(selectNode(run, node.id) && beginFlightAttempt(run));
      return {run, node};
    }
  }
  throw Error('no offer for ' + id);
}
const cleared = id => ({success: true, flame: 60, condensedGlow: 19, routeBonus: {id, packed: 19, eligible: true, complete: true, progress: ROUTE_BONUSES[id].target, target: ROUTE_BONUSES[id].target, failed: false}});

test('every utility objective pays its stop-page line on the result screen, no slot choice queued', () => {
  for (const id of UTILITY) for (const mapIndex of [0, 1, 2]) {
    const {run, node} = setup(id, {mapIndex, lives: 1});
    const preview = getRouteBonus(run, node).reward, funds = run.condensedGlow, hearts = run.lives;
    assert.equal(preview, bonusRewardLine(run, id));
    assert.match(preview, /^\+(\d+ Stored Sparks|1 heart)$/);
    assert.ok(finishFlight(run, cleared(id)));
    const paid = run.lastFlight.routeBonus;
    assert.equal(paid.message, 'Objective met: ' + preview, id);
    if (/heart/.test(preview)) { assert.equal(run.lives, hearts + 1); assert.equal(paid.amount, 0); }
    else { assert.equal(paid.amount, OBJECTIVE_SPARKS[mapIndex]); assert.equal(run.lives, hearts); assert.ok(run.condensedGlow >= funds || run.pendingCondensedGlow >= paid.amount); }
    assert.equal(run.pendingTemporary, undefined);
    assert.equal(run.slotInscriptions?.some(entry => entry?.temporary) || false, false);
  }
});

test('only the two recovery objectives pay a heart, and only while a heart is missing', () => {
  for (const id of UTILITY) {
    const {run} = setup(id, {lives: 1});
    assert.ok(run.lives < getLifeCapacity(run));
    assert.equal(/heart/.test(objectiveRewardLine(run, id)), ['spark-trail', 'reserve-finish'].includes(id), id);
    run.lives = getLifeCapacity(run);
    assert.match(objectiveRewardLine(run, id), /Stored Sparks/);
  }
});

test('an unfulfilled objective pays nothing, costs nothing and opens nothing', () => {
  for (const id of ['wayfinder', 'reserve-finish', 'draft-rider']) {
    const {run} = setup(id, {mapIndex: 1});
    const funds = run.condensedGlow, hearts = run.lives, result = cleared(id);
    result.routeBonus.complete = false; result.routeBonus.progress = 0;
    assert.ok(finishFlight(run, result));
    assert.equal(run.lastFlight.routeBonus, null);
    assert.equal(run.lives, hearts);
    assert.equal(run.pendingTemporary, undefined);
    assert.ok(run.condensedGlow >= funds);
  }
});

test('the scale is 15 / 25 / 35 Stored Sparks on maps 1, 2, 3', () => {
  assert.deepEqual([...OBJECTIVE_SPARKS], [15, 25, 35]);
});
