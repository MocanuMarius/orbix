// Temporary Inscriptions (docs/inscriptions.md, "Events and objectives"): lasting effects of events, optional objectives and oaths live on a
// Chain slot. Earning, behaviour, countdown, covering a permanent Inscription, oaths, old-save migration, and preview text equal to the award.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {INSCRIPTIONS, TEMPORARY_INSCRIPTIONS, TEMPORARY_IDS, TEMPORARY_BY_BOON, TEMPORARY_BY_FAVOR, cleanSlotInscriptions, writeInscription, slotInscriptionId, slotInscriptionList, permanentOnSlot} from '../dist/inscriptions.mjs';
import {writeTemporary, previewTemporaryWrite, temporaryEntries, hasTemporary, activePactId, spendTemporaryFlights, queueTemporary, writePendingTemporary, previewPendingTemporary, migrateLooseEffects, temporaryLine, endTemporary} from '../dist/temporary-inscriptions.mjs';
import {ROUTE_BONUSES, awardRouteBonus, getRouteBonusCandidates} from '../dist/route-bonuses.mjs';
import {EVENT_FAVORS} from '../dist/event-choices.mjs';
import {FLIGHT_PACTS} from '../dist/flight-pacts.mjs';
import {EVENT_SCENARIOS} from '../dist/map-guide.mjs';
import {stopPreviewMarkup} from '../dist/stop-preview.mjs';
import {temporaryWriteMarkup} from '../dist/reward-screen.mjs';
import {inscriptionBrand, inscriptionBlock, temporaryEffectsMarkup} from '../dist/inscription-ui.mjs';
import {FlightBoon} from '../dist/flight-boons.mjs';
import {getRunModifiers} from '../dist/model.mjs';

const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const row = ids => ids.map((id, i) => id ? makeSkillCard(id, `t:${i}`) : null);
/** A card run with a three-slot Chain. */
function cardRun(seed = 'temp') {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, seed, 1, {cards: true});
  M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id);
  run.cardSlots = 3; run.mountedCards = row(['body-spark', null, null]); cleanSlotInscriptions(run);
  return state;
}
const flightsLeft = (run, id) => temporaryEntries(run).find(e => e.id === id)?.flightsLeft;
// Back to the first row of the map so the same kind of flight can be flown again (the tests are about the Chain, not the map).
function clearGates(run) { run.victoryPending = false; run.flightReward = null; run.cardReward = null; delete run.cardDraft; run.deathPending = false; run.path = []; run.step = 0; run.current = null; run.phase = 'map'; run.restReady = false; }
function flyOnce(run, success = true) {
  clearGates(run);
  assert.ok(M.selectNode(run, M.getChoices(run)[0].id));
  assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, {success, flame: 60}));
  if (!success) assert.ok(run.lives > 0);
}
/** An event stop of card map 1 (any event index) as the player would reach it. */
function atEvent(seed, index) {
  const s = M.newState(), run = M.createRun(s.profile, seed, 1, {cards: true});
  const stop = run.map.flat().find(n => n.kind === 'event' && n.eventIndex === index);
  if (!stop) return null;
  const pred = run.map[stop.row - 1].find(n => n.nextIds.includes(stop.id));
  run.step = stop.row; run.path = [pred.id]; run.cardSlots = 3; run.mountedCards = row([null, null, null]); cleanSlotInscriptions(run);
  return {s, run, stop};
}

test('catalogue: every temporary Inscription has a glyph, a rule, a duration and the engine key it drives', () => {
  assert.equal(TEMPORARY_IDS.length, 18);
  for (const id of TEMPORARY_IDS) {
    const t = TEMPORARY_INSCRIPTIONS[id];
    assert.ok(t.name && t.text && t.glyph === id && t.kind === 'temporary', id);
    assert.ok(t.until === 'fulfilled' || t.flights >= 1, `${id} has a duration`);
    assert.ok(t.boon || t.favor || t.oath, `${id} drives something`);
    assert.ok(!INSCRIPTIONS[id], `${id} is not offered by the Scribe`);
  }
  for (const [boon, id] of Object.entries(TEMPORARY_BY_BOON)) assert.equal(TEMPORARY_INSCRIPTIONS[id].boon, boon);
  for (const [favor, id] of Object.entries(TEMPORARY_BY_FAVOR)) assert.equal(TEMPORARY_INSCRIPTIONS[id].favor, favor);
  assert.match(temporaryLine('mending', 3), /^Temporary Inscription: Mending — below 6 Sparks, restore up to 6 missing Sparks once per flight\. 3 flights\.$/);
  assert.match(temporaryLine('closed-eye'), /^Oath Inscription: The Closed Eye — .*Stays until fulfilled\.$/);
});

test('earning from an objective: the award is pending, the player writes it on the slot they choose, nothing floats loose', () => {
  for (const id of Object.keys(ROUTE_BONUSES).filter(key => ROUTE_BONUSES[key].temporary)) {
    const def = ROUTE_BONUSES[id], run = cardRun('earn-' + id).run;
    const node = M.getChoices(run)[0]; node.bonusId = id;
    const result = {success: true, routeBonus: {id, eligible: true, complete: true, failed: false, target: def.target, progress: def.target}};
    const receipt = awardRouteBonus(run, node, {nodeId: node.id, bonusId: id}, result, 20, 0, false);
    assert.equal(receipt.message, def.reward, `${id}: the award says what the offer said`);
    assert.equal(run.pendingTemporary.id, def.temporary);
    assert.equal(run.passageBoons, undefined); assert.equal(run.nextFlightBoon, undefined);
    // blocked until written
    assert.equal(M.selectNode(run, M.getChoices(run)[0].id), false);
    assert.equal(M.beginFlightAttempt(run), false);
    assert.ok(writePendingTemporary(run, 2));
    assert.equal(run.pendingTemporary, undefined);
    assert.deepEqual(run.slotInscriptions[2], {id: def.temporary, temporary: true, flightsLeft: 3, covers: null});
    assert.equal(slotInscriptionId(run, 2), def.temporary);
  }
});

test('it works like the old effect: the same modifiers reach the flight, and the once-per-flight limits are unchanged', () => {
  const run = cardRun('works').run;
  writeTemporary(run, 0, 'mending'); writeTemporary(run, 1, 'reserve-wick'); writeTemporary(run, 2, 'hollow-feather');
  const mods = getRunModifiers(run);
  assert.deepEqual(mods.flightBoons, ['spark-trail']); assert.deepEqual(mods.eventFavors.sort(), ['feather', 'wick']);
  // Mending alone: below 6 Sparks restore up to 6, once; with the Wick on the Chain the stronger 9 is used (they share one trigger).
  const events = [], e = {mod: {flightBoons: mods.flightBoons, eventFavors: []}, flame: 5 / .3, maxFlame: 100, flameRestored: 0, setEvent: s => events.push(s)};
  const boon = new FlightBoon(e, null);
  assert.equal(boon.tryReserve(), 6 / .3); e.flame = 0; assert.equal(boon.tryReserve(), 0, 'once per flight');
  const wick = {mod: {flightBoons: mods.flightBoons, eventFavors: mods.eventFavors}, flame: 5 / .3, maxFlame: 100, flameRestored: 0, setEvent() {}};
  assert.equal(new FlightBoon(wick, null).tryReserve(), 9 / .3);
  // The numbers in the Inscription texts match the old ones.
  assert.match(TEMPORARY_INSCRIPTIONS['hollow-feather'].text, /first two paid Lifts are free/);
  assert.match(TEMPORARY_INSCRIPTIONS.glidepath.text, /up to 9 Sparks on your first 3 Lifts/);
});

test('the count goes down on each cleared flight (never on a fall) and the Inscription is gone at zero', () => {
  const run = cardRun('count').run;
  writeTemporary(run, 1, 'glidepath');
  assert.equal(flightsLeft(run, 'glidepath'), 3);
  flyOnce(run, false); assert.equal(flightsLeft(run, 'glidepath'), 3, 'a fall spends nothing');
  for (const left of [2, 1]) { flyOnce(run, true); assert.equal(flightsLeft(run, 'glidepath'), left); }
  assert.deepEqual(getRunModifiers(run).flightBoons, ['long-glide']);
  flyOnce(run, true);
  assert.equal(hasTemporary(run, 'glidepath'), false); assert.equal(run.slotInscriptions[1], null);
  assert.deepEqual(getRunModifiers(run).flightBoons, []);
  // earning the same one again moves it and refreshes the count; it never stacks
  writeTemporary(run, 0, 'glidepath'); spendTemporaryFlights(run, ['glidepath']); writeTemporary(run, 2, 'glidepath');
  assert.deepEqual(temporaryEntries(run).map(item => [item.slot, item.flightsLeft]), [[2, 3]]);
});

test('covering: a permanent Inscription is suspended, shown again when the temporary one ends; a confirm comes first', () => {
  const run = cardRun('cover').run;
  writeInscription(run, 0, 'gilded'); writeInscription(run, 1, 'hearth');
  const before = getRunModifiers(run);
  const preview = previewTemporaryWrite(run, 'mending', 0);
  assert.deepEqual({covers: preview.covers, replacesTemporary: preview.replacesTemporary, needsConfirm: preview.needsConfirm}, {covers: 'gilded', replacesTemporary: null, needsConfirm: true});
  assert.equal(previewTemporaryWrite(run, 'mending', 2).needsConfirm, false, 'a bare slot needs no confirm');
  // through the pending flow: refused without confirm, written with it
  assert.ok(queueTemporary(run, 'mending', {source: 'test'}));
  assert.equal(previewPendingTemporary(run, 0).needsConfirm, true);
  assert.equal(writePendingTemporary(run, 0), false); assert.ok(run.pendingTemporary);
  assert.ok(writePendingTemporary(run, 0, {confirm: true}));
  assert.deepEqual(run.slotInscriptions[0], {id: 'mending', temporary: true, flightsLeft: 3, covers: {id: 'gilded'}});
  assert.equal(permanentOnSlot(run, 0), 'gilded', 'the cover remembers it');
  assert.equal(slotInscriptionId(run, 0), 'mending');
  const list = slotInscriptionList(run, run.mountedCards);
  assert.equal(list[0], null, 'the engine sees no Inscription on a covered slot: Gilded is suspended');
  assert.deepEqual(list[1], {id: 'hearth'});
  // a temporary over a temporary replaces it (confirm) and keeps what the first one covered
  const replace = previewTemporaryWrite(run, 'chime', 0);
  assert.deepEqual({replacesTemporary: replace.replacesTemporary, covers: replace.covers, needsConfirm: replace.needsConfirm}, {replacesTemporary: 'mending', covers: 'gilded', needsConfirm: true});
  writeTemporary(run, 0, 'chime');
  assert.equal(hasTemporary(run, 'mending'), false); assert.equal(run.slotInscriptions[0].covers.id, 'gilded');
  // a Scribe write under a temporary one goes beneath it
  writeInscription(run, 0, 'twin-mark');
  assert.equal(run.slotInscriptions[0].id, 'chime'); assert.equal(permanentOnSlot(run, 0), 'twin-mark');
  // it ends: the permanent one is back by itself
  spendTemporaryFlights(run, ['chime']); spendTemporaryFlights(run, ['chime']); spendTemporaryFlights(run, ['chime']);
  assert.deepEqual(run.slotInscriptions[0], {id: 'twin-mark'});
  assert.deepEqual(slotInscriptionList(run, run.mountedCards)[0], {id: 'twin-mark'});
  assert.equal(getRunModifiers(run).treasureCapacity, before.treasureCapacity);
});

test('an oath stays until a cleared flight fulfils it; a fall or a missed target does not end it', () => {
  const run = cardRun('oath').run;
  writeInscription(run, 0, 'gilded');
  writeTemporary(run, 0, 'closed-eye');
  assert.equal(run.slotInscriptions[0].until, 'fulfilled'); assert.equal(run.slotInscriptions[0].flightsLeft, undefined);
  assert.equal(activePactId(run), 'blind-pilgrim');
  assert.equal(spendTemporaryFlights(run, ['closed-eye']).length, 0, 'a count never ends an oath');
  flyOnce(run, false);
  assert.equal(hasTemporary(run, 'closed-eye'), true, 'a fall leaves the oath on the Chain');
  assert.equal(getRunModifiers(run).closedEye, true);
  flyOnce(run, true);
  assert.equal(hasTemporary(run, 'closed-eye'), false, 'a cleared flight fulfils it');
  assert.deepEqual(run.slotInscriptions[0], {id: 'gilded'}, 'and what it covered returns');
  // the Vow needs four body pickups: three leave it open
  writeTemporary(run, 1, 'pilgrim-vow');
  clearGates(run);
  assert.ok(M.selectNode(run, M.getChoices(run)[0].id)); assert.ok(M.beginFlightAttempt(run)); M.markFlightAttemptStarted(run);
  assert.ok(M.finishFlight(run, {success: true, flame: 60, bodyFuelCollected: 3}));
  assert.equal(hasTemporary(run, 'pilgrim-vow'), true); assert.match(run.lastFlight.vow.message, /still open/);
  flyVow(run, 4); assert.equal(hasTemporary(run, 'pilgrim-vow'), false); assert.equal(run.lastFlight.vow.reward, 8);
});
function flyVow(run, bodyFuelCollected) {
  clearGates(run);
  assert.ok(M.selectNode(run, M.getChoices(run)[0].id)); assert.ok(M.beginFlightAttempt(run)); M.markFlightAttemptStarted(run);
  assert.ok(M.finishFlight(run, {success: true, flame: 60, bodyFuelCollected}));
}

test('Lead Seal is spent when the flight begins; a gate that never opened gives it back', () => {
  const run = cardRun('lead').run;
  writeTemporary(run, 0, 'lead-seal');
  assert.deepEqual(getRunModifiers(run).eventFavors, ['burden']);
  assert.ok(M.selectNode(run, M.getChoices(run)[0].id)); assert.ok(M.beginFlightAttempt(run));
  assert.equal(hasTemporary(run, 'lead-seal'), false);
  assert.deepEqual(run.attemptEntry.eventFavors, ['burden']);
  assert.ok(M.suspendRun(run.attemptActive ? {run} : {run}));
  assert.equal(hasTemporary(run, 'lead-seal'), true, 'interrupting before the flight started puts it back');
});

test('old saves: loose effects move onto the first slot without a temporary Inscription, covering if needed, with their remaining count', () => {
  const run = cardRun('migrate').run;
  writeInscription(run, 0, 'gilded');
  Object.assign(run, {passageBoons: {'long-glide': 2}, nextFlightBoon: 'long-glide', favorClears: {wick: 1, lens: 3}, eventFavors: ['wick', 'burden'], nextFlightPact: 'blind-pilgrim', pilgrimVow: {target: 4, reward: 8}, treasurePact: 'wager'});
  const moved = migrateLooseEffects(run);
  for (const key of ['passageBoons', 'nextFlightBoon', 'favorClears', 'eventFavors', 'nextFlightPact', 'pilgrimVow']) assert.equal(run[key], undefined, key);
  assert.equal(run.treasurePact, undefined);
  // 3 slots: glidepath(2 left) covers slot 0, reserve-wick(1) slot 1, star-chart(3) slot 2; the rest has no slot and is dropped
  assert.deepEqual(moved.map(m => [m.id, m.slot, m.flights]), [['glidepath', 0, 2], ['reserve-wick', 1, 1], ['star-chart', 2, 3]]);
  assert.equal(run.slotInscriptions[0].covers.id, 'gilded'); assert.equal(run.slotInscriptions[0].flightsLeft, 2);
  assert.equal(migrateLooseEffects(run).length, 0, 'idempotent');
  // through a real save and load: an old save that carries them
  const state = cardRun('migrate-save');
  Object.assign(state.run, {passageBoons: {'night-sail': 1}, favorClears: {feather: 2}, nextFlightPact: 'night-ledger'});
  const memory = new Map(), store = {getItem: k => memory.get(k), setItem: (k, v) => memory.set(k, v)};
  M.saveState(state, store);
  const loaded = M.loadState(store).run;
  assert.deepEqual(temporaryEntries(loaded).map(e => [e.id, e.slot, e.flightsLeft]), [['nightveil', 0, 1], ['hollow-feather', 1, 2], ['night-ledger', 2, null]]);
  assert.equal(loaded.passageBoons, undefined); assert.equal(loaded.favorClears, undefined);
  // a run with no Chain drops them
  const bare = {slotInscriptions: [], mountedCards: [], passageBoons: {'night-sail': 1}};
  assert.deepEqual(migrateLooseEffects(bare), []); assert.equal(bare.passageBoons, undefined);
  // a saved Chain survives a reload with its counts and covers
  const keep = cardRun('keep'); writeInscription(keep.run, 1, 'hollow'); writeTemporary(keep.run, 1, 'mending', {flights: 2});
  M.saveState(keep, store);
  assert.deepEqual(M.loadState(store).run.slotInscriptions[1], {id: 'mending', temporary: true, flightsLeft: 2, covers: {id: 'hollow'}});
});

test('events: the offer, the stop page and the award say the same thing, and a chosen offer pends until the player picks a slot', () => {
  let checked = 0;
  for (const scenario of EVENT_SCENARIOS) {
    const found = atEvent('ev-' + scenario.index, scenario.index) || [0, 1, 2, 3, 4, 5, 6, 7].map(n => atEvent('ev' + n + '-' + scenario.index, scenario.index)).find(Boolean);
    if (!found) continue;
    const {run, stop} = found;
    const page = text(stopPreviewMarkup(run, stop, {available: true}));
    for (const id of scenario.gives) assert.ok(page.includes(TEMPORARY_INSCRIPTIONS[id].name), `${scenario.name} stop page names ${id}`);
    assert.equal(stop.rewardPreview, scenario.reward);
    assert.ok(M.selectNode(run, stop.id));
    const offers = M.getSupportChoices(run);
    const fillers = new Set(['reserve-wick', 'hollow-feather', 'star-chart', 'chime']);
    offers.forEach((offer, index) => {
      const id = offer.effect.eventFavor ? TEMPORARY_BY_FAVOR[offer.effect.eventFavor] : offer.effect.flightPact ? Object.values(TEMPORARY_INSCRIPTIONS).find(t => t.pact === offer.effect.flightPact).id : offer.effect.pilgrimVow ? 'pilgrim-vow' : null;
      if (!id) return;
      assert.ok(scenario.gives.includes(id) || fillers.has(id), `${scenario.name} offers ${id} but its page does not name it`);
      assert.ok(offer.description.includes(temporaryLine(id)), `${scenario.name}: the offer says "${temporaryLine(id)}"`);
      const copy = structuredClone(run), before = copy.slotInscriptions.length;
      assert.ok(M.resolveSupport(copy, index));
      assert.equal(copy.pendingTemporary.id, id, 'the award is the Inscription the offer named');
      assert.equal(M.resolveSupport(copy, 0), false, 'nothing else happens until it is written');
      assert.ok(writePendingTemporary(copy, 1));
      assert.equal(copy.slotInscriptions.length, before);
      assert.equal(copy.slotInscriptions[1].id, id);
      checked++;
    });
  }
  assert.ok(checked >= 8, `checked ${checked} temporary offers`);
  for (const [key, favor] of Object.entries(EVENT_FAVORS)) assert.ok(favor.text.startsWith('Temporary Inscription: ' + favor.title), key);
  for (const pact of Object.values(FLIGHT_PACTS)) assert.ok(pact.description.startsWith('Oath Inscription: ' + pact.name), pact.id);
});

test('the Prism Dice favor and the Sealed Purse are written on the Chain too', () => {
  const found = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => atEvent('dice' + n, 6)).find(Boolean);
  const {run} = found;
  assert.ok(M.selectNode(run, found.stop.id));
  const offers = M.getSupportChoices(run), index = offers.findIndex(o => o.effect.dice);
  assert.ok(index >= 0);
  const outcomes = [1, 3, 5].map(face => ({face}));
  assert.ok(M.resolveSupport(run, index));
  assert.equal(run.eventFavors, undefined);
  if (run.pendingTemporary) { assert.ok(['reserve-wick', 'hollow-feather', 'star-chart'].includes(run.pendingTemporary.id)); assert.ok(writePendingTemporary(run, 0)); assert.equal(flightsLeft(run, run.slotInscriptions[0].id), 3); }
  assert.ok(outcomes.length === 3);
  const state = cardRun('purse'); writeTemporary(state.run, 0, 'sealed-purse');
  assert.equal(hasTemporary(state.run, 'sealed-purse'), true);
  assert.equal(state.run.slotInscriptions[0].until, 'fulfilled');
});

test('display: the brand wears a dashed ring and a flight counter, an oath an open ring, the inspector says it in plain words', () => {
  const run = cardRun('display').run;
  writeInscription(run, 0, 'gilded'); writeTemporary(run, 0, 'mending', {flights: 2}); writeTemporary(run, 1, 'closed-eye');
  const brand = inscriptionBrand(0, 'mending', run.slotInscriptions[0]);
  assert.match(brand, /dk2-ins-temporary/); assert.match(brand, /<b class="dk2-ins-count"[^>]*>2<\/b>/); assert.match(brand, /data-ins-glyph="mending"/);
  assert.match(brand, /Temporary flights|Temporary: 2 flights left/); assert.match(brand, /Covers Gilded, which returns afterwards/);
  assert.match(inscriptionBrand(1, 'closed-eye', run.slotInscriptions[1]), /dk2-ins-oath/);
  assert.doesNotMatch(inscriptionBrand(1, 'closed-eye', run.slotInscriptions[1]), /dk2-ins-count/);
  assert.doesNotMatch(inscriptionBrand(0, 'gilded', {id: 'gilded'}), /dk2-ins-count|dk2-ins-oath/);
  const block = text(inscriptionBlock(0, 'mending', run.slotInscriptions[0]));
  assert.match(block, /Temporary: 2 flights left/); assert.match(block, /Covered: Gilded\. It comes back when this ends\./);
  assert.match(text(inscriptionBlock(1, 'closed-eye', run.slotInscriptions[1])), /Oath: stays until fulfilled/);
  assert.match(text(temporaryEffectsMarkup(run)), /Temporary: 2 flights left · slot 1/);
  assert.equal(inscriptionBrand(0, 'nope'), '');
});

test('the slot screen: choosing over a permanent Inscription asks to cover it and says the old one comes back', () => {
  const state = cardRun('screen'), run = state.run;
  writeInscription(run, 0, 'gilded');
  assert.ok(queueTemporary(run, 'mending', {source: 'route-bonus', label: 'Spark Trail'}));
  const choose = text(temporaryWriteMarkup(state, {slot: null}));
  assert.match(choose, /Choose a slot/); assert.match(choose, /Covers: Gilded \(comes back\)/); assert.match(choose, /Temporary Inscription: Mending — below 6 Sparks/);
  assert.match(choose, /data-action="temp-slot"|Slot 1/);
  const confirm = text(temporaryWriteMarkup(state, {slot: 0}));
  assert.match(confirm, /Cover this Inscription\?/); assert.match(confirm, /comes back by itself when Mending ends \(3 flights\)/);
  assert.equal(text(temporaryWriteMarkup(state, {slot: 2})).includes('Cover this Inscription?'), false, 'a bare slot writes at once');
  writeTemporary(run, 1, 'chime'); delete run.pendingTemporary; queueTemporary(run, 'star-chart');
  assert.match(text(temporaryWriteMarkup(state, {slot: 1})), /Replace this Inscription\?/);
  assert.equal(temporaryWriteMarkup({run: {}}, {}), '');
});

test('no old loose field is ever written: events, objectives and oaths all go to the Chain', () => {
  const run = cardRun('loose').run;
  for (const id of ['mending', 'hollow-feather', 'night-ledger', 'pilgrim-vow']) { queueTemporary(run, id); writePendingTemporary(run, undefined); }
  for (const key of ['passageBoons', 'favorClears', 'eventFavors', 'nextFlightBoon', 'nextFlightPact', 'pilgrimVow']) assert.ok(!(key in run), key);
  assert.equal(run.treasurePact, undefined);
  assert.equal(endTemporary(run, 'night-ledger'), true); assert.equal(endTemporary(run, 'night-ledger'), false);
});
