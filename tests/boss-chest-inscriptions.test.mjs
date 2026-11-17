// A guardian clear can owe two choices (the Scribe's permanent Inscription and an objective's temporary one): the Scribe comes first and the two
// screens are told apart. And the five chest gifts (Far Lens, Quick Lens, Mending Wick, Toll Stamp, Lamplighter's Seal) are permanent Inscriptions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {INSCRIPTIONS, INSCRIPTION_IDS, CHEST_INSCRIPTION_IDS, offerInscriptions, cleanSlotInscriptions, writeInscription, permanentOnSlot, slotEntry} from '../dist/inscriptions.mjs';
import {spendTemporaryFlights, writeTemporary, previewPendingTemporary, writePendingTemporary, queueInscriptionWrite, migrateLooseEffects} from '../dist/temporary-inscriptions.mjs';
import {ROUTE_BONUSES, getRouteBonus} from '../dist/route-bonuses.mjs';
import {treasureChoices, treasureRank, grantTreasureGift, treasureClearDividend, giftLine} from '../dist/treasure.mjs';
import {temporaryWriteMarkup, flightRewardMarkup, SCRIBE_KICKER} from '../dist/reward-screen.mjs';
import {GLYPHS} from '../scripts/build-inscription-glyphs.mjs';

const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const row = ids => ids.map((id, i) => id ? makeSkillCard(id, `t:${i}`) : null);
function cardRun(seed, cards = ['body-spark', null, null]) {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, seed, 1, {cards: true});
  M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id);
  run.cardSlots = cards.length; run.mountedCards = row(cards); cleanSlotInscriptions(run);
  return state;
}
/** Clear the guardian of map `mapIndex` (0-2), optionally with its temporary-Inscription objective fulfilled. Returns the state. */
function clearGuardian(mapIndex, withObjective) {
  const state = cardRun('boss-seed'), run = state.run;
  run.mapIndex = mapIndex;
  const boss = run.map.flat().find(n => n.boss); boss.mapIndex = mapIndex;
  run.step = boss.row; run.path = [run.map[boss.row - 1].find(n => n.nextIds.includes(boss.id)).id];
  const bonus = getRouteBonus(run, boss);
  let routeBonus;
  if (withObjective && bonus?.temporary) { boss.bonusId = bonus.id; const t = ROUTE_BONUSES[bonus.id].target; routeBonus = {id: bonus.id, eligible: true, complete: true, failed: false, target: t, progress: t}; }
  assert.ok(M.selectNode(run, boss.id)); assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, {success: true, flame: 60, routeBonus}));
  return state;
}

test('guardian clear: what is owed, and that a Scribe pick is permanent', () => {
  for (const [map, objective, owesTemp, owesScribe] of [[0, false, false, true], [0, true, true, true], [1, false, false, true], [1, true, true, true], [2, true, false, false]]) {
    const state = clearGuardian(map, objective), run = state.run;
    assert.equal(!!run.pendingTemporary, owesTemp, `map ${map + 1} objective ${objective}: temporary owed`);
    assert.equal(run.flightReward?.kind === 'inscription', owesScribe, `map ${map + 1}: Scribe owed`);
    if (!owesScribe) continue;
    const pick = run.flightReward.offers[0];
    assert.ok(INSCRIPTION_IDS.includes(pick), 'the Scribe offers only its permanent list');
    assert.ok(M.chooseFlightReward(state, pick, 1));
    assert.deepEqual(run.slotInscriptions[1], {id: pick}, 'written as a plain permanent Inscription, no temporary flag, no counter');
    if (owesTemp) {
      // The temporary one follows; written on the same slot it covers the Scribe pick, which returns when it ends.
      assert.ok(writePendingTemporary(run, 1, {confirm: true}));
      assert.equal(run.slotInscriptions[1].temporary, true); assert.deepEqual(run.slotInscriptions[1].covers, {id: pick});
      assert.equal(permanentOnSlot(run, 1), pick);
    }
  }
});

test('Scribe first, then the temporary slot screen; the two screens cannot be mistaken for each other', () => {
  const app = fs.readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  assert.match(app, /if\(r\.pendingTemporary&&!\(r\.flightReward\?\.kind==='inscription'&&!r\.flightReward\.claimed\)\)/, 'the router waits for an open Scribe');
  assert.match(app, /function writeScribe[^\n]*if\(state\.run\.pendingTemporary\)\{goToRun\(\)/, 'writing the Scribe pick moves on to the second choice');
  const state = clearGuardian(0, true), run = state.run;
  const scribe = text(flightRewardMarkup(state, {scribe: {}}));
  assert.ok(scribe.includes(SCRIBE_KICKER)); assert.match(scribe, /The Scribe — permanent Inscription/);
  assert.match(scribe, /A second choice follows: a temporary Inscription, /);
  assert.doesNotMatch(scribe, /Temporary Inscription:/);
  const temp = temporaryWriteMarkup(state, {slot: null}), t = text(temp);
  assert.match(t, /Temporary Inscription/); assert.match(t, /Objective reward: lasts 3 flights/);
  assert.match(temp, /scribe-mark scribe-mark-temp/, 'dashed ring on the chosen glyph');
  assert.doesNotMatch(t, /The Scribe/);
  // Once the Scribe is written the note is gone.
  M.chooseFlightReward(state, run.flightReward.offers[0], 0);
  assert.doesNotMatch(text(flightRewardMarkup(state, {scribe: {}})), /A second choice follows/);
});

test('chest gifts: five permanent Inscriptions with their own glyphs, never offered by the Scribe', () => {
  assert.deepEqual([...CHEST_INSCRIPTION_IDS], ['far-lens', 'quick-lens', 'mending-wick', 'toll-stamp', 'lamplighter-seal']);
  for (const id of CHEST_INSCRIPTION_IDS) {
    assert.ok(!INSCRIPTION_IDS.includes(id)); assert.ok(INSCRIPTIONS[id].text.split(/\s+/).length <= 12); assert.ok(GLYPHS[id], `${id} glyph`);
    assert.equal(INSCRIPTIONS[id].kind, 'standalone');
  }
  assert.equal(INSCRIPTION_IDS.length, 18);
  const run = cardRun('scribe-never').run;
  for (let i = 0; i < 60; i++) { let n = 0; assert.ok(offerInscriptions(run, () => ((n = (n * 7 + i + 3) % 97) / 97)).every(id => !CHEST_INSCRIPTION_IDS.includes(id))); }
});

test('taking a gift writes it on the chosen slot, with the old effects and numbers', () => {
  const state = cardRun('gift-effects', ['body-spark', null, null, null, null]), run = state.run;
  const base = M.getRunModifiers(run);
  for (const [gift, id] of [['farLens', 'far-lens'], ['quickLens', 'quick-lens'], ['wick', 'mending-wick'], ['toll', 'toll-stamp'], ['seal', 'lamplighter-seal']]) {
    assert.equal(treasureRank(run, gift), 0);
    assert.equal(grantTreasureGift(run, gift), true); assert.equal(run.pendingTemporary.id, id); assert.equal(run.pendingTemporary.permanent, true);
    assert.equal(M.selectNode(run, M.getChoices(run)[0]?.id), false, 'nothing proceeds until it is written');
    const slot = ['farLens', 'quickLens', 'wick', 'toll', 'seal'].indexOf(gift);
    assert.ok(writePendingTemporary(run, slot, {confirm: true}));
    assert.equal(permanentOnSlot(run, slot), id); assert.equal(run.pendingTemporary, undefined);
    assert.equal(treasureRank(run, gift), 1);
    assert.equal(run.treasureGifts?.[gift], undefined, 'nothing loose in the run');
  }
  const mods = M.getRunModifiers(run);
  assert.equal(mods.lightRadius, base.lightRadius * 1.15); assert.equal(mods.treasureRecoveryScale, 0.85);
  assert.equal(treasureClearDividend(run, {success: true, bodyFuelCollected: 3, flame: 40 * 3.34}).amount, 6, 'Toll Stamp +3 and Seal +3');
  assert.equal(treasureClearDividend(run, {success: true, bodyFuelCollected: 2, flame: 5}).amount, 0);
  assert.equal(grantTreasureGift(run, 'farLens'), false, 'a second copy is never queued');
});

test('a temporary Inscription on the slot suspends a gift and gets it back; writing over an inscribed slot asks first', () => {
  const run = cardRun('gift-cover', ['body-spark', null, null]).run;
  writeInscription(run, 0, 'gilded'); writeTemporary(run, 1, 'mending');
  grantTreasureGift(run, 'farLens');
  const swap = previewPendingTemporary(run, 0);
  assert.deepEqual({confirm: swap.needsConfirm, replaces: swap.replaces}, {confirm: true, replaces: 'gilded'});
  assert.equal(writePendingTemporary(run, 0), false, 'no confirm, no write');
  assert.match(text(temporaryWriteMarkup({run}, {slot: 0})), /Replace this Inscription\?.*Gilded.*Far Lens.*cannot be undone/);
  assert.equal(previewPendingTemporary(run, 2).needsConfirm, false);
  // On a slot a temporary Inscription holds it is written beneath, with no confirm when nothing permanent is there.
  const beneath = previewPendingTemporary(run, 1);
  assert.deepEqual({confirm: beneath.needsConfirm, beneath: beneath.beneath}, {confirm: false, beneath: 'mending'});
  assert.ok(writePendingTemporary(run, 1));
  assert.equal(run.slotInscriptions[1].id, 'mending'); assert.deepEqual(run.slotInscriptions[1].covers, {id: 'far-lens'});
  assert.equal(treasureRank(run, 'farLens'), 0, 'covered: suspended');
  run.slotInscriptions[1].flightsLeft = 1;
  assert.deepEqual(spendTemporaryFlights(run, ['mending']), ['mending']);
  assert.equal(treasureRank(run, 'farLens'), 1, 'back in force when the temporary one ends');
});

test('chest finds and the stop say "Inscription: <name> — <effect>"; the offer is the award', () => {
  const run = cardRun('gift-text').run, line = id => giftLine(id);
  assert.equal(line('farLens'), 'Inscription: Far Lens — luminance reaches 15% farther.');
  const lens = treasureChoices('lens', run), tithe = treasureChoices('tithe', run);
  assert.equal(lens[0].description, line('farLens')); assert.equal(lens[0].effect.treasureGift, 'farLens');
  assert.equal(lens[1].description, line('quickLens'));
  assert.ok(tithe[0].description.startsWith(line('wick'))); assert.ok(tithe[1].description.includes(line('toll')));
  assert.ok(treasureChoices('wager', run)[1].description.includes(line('seal')));
  // Taking the offer's gift queues exactly the Inscription its text names.
  grantTreasureGift(run, lens[0].effect.treasureGift);
  assert.equal(INSCRIPTIONS[run.pendingTemporary.id].name, 'Far Lens');
  assert.ok(text(temporaryWriteMarkup({run}, {})).includes('Inscription: Far Lens — luminance reaches 15% farther.'));
  // Once written, the chest offers the alternative instead.
  writePendingTemporary(run, 0);
  assert.ok(treasureChoices('lens', run).some(o => o.id === 'lens-sell'));
});

test('old saves: gifts held loose move to the first slot without a permanent Inscription', () => {
  const a = cardRun('mig-a', ['body-spark', null, null]).run;
  writeInscription(a, 0, 'gilded'); a.treasureGifts = {vessel: 1, farLens: 1, wick: 1, toll: 1};
  assert.deepEqual(migrateLooseEffects(a), []);
  assert.deepEqual(a.slotInscriptions.map(e => e?.id), ['toll-stamp', 'far-lens', 'mending-wick'], 'bare slots first; with none left the first slot is replaced');
  assert.deepEqual(a.treasureGifts, {vessel: 1}, 'only the vessel stays loose');
  // None bare: the first slot, replacing.
  const b = cardRun('mig-b', ['body-spark', 'body-spark', 'body-spark']).run;
  for (const [i, id] of ['gilded', 'hollow', 'bell'].entries()) writeInscription(b, i, id);
  b.treasureGifts = {seal: 1}; migrateLooseEffects(b);
  assert.deepEqual(b.slotInscriptions.map(e => e?.id), ['lamplighter-seal', 'hollow', 'bell']);
  // No slots: dropped.
  const c = cardRun('mig-c', []).run; c.treasureGifts = {quickLens: 1, vessel: 2}; migrateLooseEffects(c);
  assert.deepEqual(c.treasureGifts, {vessel: 2});
  // A covering temporary Inscription does not count as bare: its permanent one is below.
  const d = cardRun('mig-d', ['body-spark', null, null]).run;
  writeInscription(d, 0, 'gilded'); writeTemporary(d, 0, 'mending'); d.treasureGifts = {toll: 1}; migrateLooseEffects(d);
  assert.equal(permanentOnSlot(d, 1), 'toll-stamp');
  // Through a save and load.
  const s = cardRun('mig-e'); s.run.treasureGifts = {farLens: 1}; let json; const storage = {setItem: (k, v) => { json = v; }, getItem: () => json};
  M.saveState(s, storage); const loaded = M.loadState(storage).run;
  assert.equal(permanentOnSlot(loaded, 1) === 'far-lens' || loaded.slotInscriptions.some(e => e?.id === 'far-lens'), true);
  assert.equal(loaded.treasureGifts?.farLens, undefined);
});
