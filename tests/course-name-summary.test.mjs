import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {flightRewardCeremonyMarkup} from '../dist/flight-reward-ceremony.mjs';
import {deathScreenMarkup} from '../dist/death-screen.mjs';
import {flightEntryMarkup} from '../dist/flight-entry.mjs';

test('the course name the map stop page uses is on the success summary, the failure screen and the depart page', () => {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, 'course-name', 1, {cards: true});
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id));
  const node = M.getChoices(run).find(n => n.type !== 'support');
  assert.ok(node.name);
  const entry = flightEntryMarkup(run, node, {showTips: false});
  assert.ok(entry.includes(node.name), 'Ready to depart page');
  assert.ok(M.selectNode(run, node.id) && M.beginFlightAttempt(run) && M.markFlightAttemptStarted(run));
  run.lastAttempt = {success: false, nodeId: node.id, nodeName: node.name, livesLost: 1, livesRemaining: 2};
  assert.ok(deathScreenMarkup(run).includes(node.name), 'failure');
  run.lastAttempt = null;
  assert.ok(M.finishFlight(run, {success: true, flame: 50})); M.settleCheckpoint(state);
  assert.equal(M.lastCourseName(run), node.name);
  run.cardDraft.ceremony = {version: 1, stage: 'income', incomeStarted: true};
  assert.ok(flightRewardCeremonyMarkup(run).includes(node.name), 'success summary');
});
