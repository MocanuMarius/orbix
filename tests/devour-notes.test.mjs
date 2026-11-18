import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {departureDevourWarnings, flightDevoured, devouredLine} from '../dist/devour-notes.mjs';
import {flightRewardCeremonyReceipt} from '../dist/flight-reward-ceremony.mjs';
import {flightCardChangesMarkup} from '../dist/card-ui.mjs';

const card = id => makeSkillCard(id, `dn:${id}`);
function run(row) {
  const state = M.newState(); state.profile.tutorialComplete = true; state.run = M.createRun(state.profile, 'devour-notes', 1, {cards: true});
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id));
  state.run.mountedCards = row.map(id => id ? card(id) : null); state.run.reserveCards = [];
  return state;
}

test('the departure screen warns what a mounted Devour card will eat', () => {
  assert.deepEqual(departureDevourWarnings(run(['body-spark', 'spark-cache']).run), []);
  assert.deepEqual(departureDevourWarnings(run(['black-hole', 'body-spark']).run).map(w => w.text), ['Black Hole will devour Body Spark +2']);
  assert.match(departureDevourWarnings(run(['dream', 'spark-cache']).run)[0].text, /^Dream will devour /);
  assert.match(departureDevourWarnings(run(['ember-feeder', 'body-spark', 'spark-cache']).run)[0].text, /^Ember Feeder will devour .+ and .+ at the Finish$/);
  assert.deepEqual(departureDevourWarnings(run(['black-hole', 'growth-ring']).run), [], 'permanent cards are never eaten, so no warning');
});

test('a flight that devoured a card says so in the rewards notes with the card picture, and in the card changes list', () => {
  const state = run(['black-hole', 'body-spark', 'spark-cache']), r = state.run;
  assert.ok(M.selectNode(r, M.getChoices(r).find(n => n.type !== 'support').id)); assert.ok(M.beginFlightAttempt(r)); assert.ok(M.markFlightAttemptStarted(r));
  assert.ok(M.finishFlight(r, {success: true, flame: 50}));
  const eaten = flightDevoured(r.lastFlight);
  assert.deepEqual(eaten.map(e => e.cardId), ['body-spark']);
  assert.equal(devouredLine(eaten), 'Devoured: Body Spark +2');
  const entry = flightRewardCeremonyReceipt(r).effectEntries.find(e => e.detailKey === 'devoured');
  assert.equal(entry.text, 'Devoured: Body Spark +2'); assert.equal(entry.cardId, 'body-spark');
  assert.match(flightCardChangesMarkup(r), /Devoured: Body Spark/);
});
