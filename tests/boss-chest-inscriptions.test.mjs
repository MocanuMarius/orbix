// A guardian clear can owe two choices (the Scribe's permanent Inscription and an objective's temporary one): the Scribe comes first and the two
// screens are told apart. And the five chest gifts (Far Lens, Quick Lens, Mending Wick, Toll Stamp, Lamplighter's Seal) are permanent Inscriptions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {INSCRIPTIONS, INSCRIPTION_IDS, CHEST_INSCRIPTION_IDS, offerInscriptions, cleanSlotInscriptions, writeInscription, permanentOnSlot, slotEntry} from '../dist/inscriptions.mjs';
import {previewPendingTemporary, writePendingTemporary, queueInscriptionWrite, dropTemporaryRemnants as migrateLooseEffects} from '../dist/temporary-inscriptions.mjs';
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
  if (withObjective && bonus) { boss.bonusId = bonus.id; const t = ROUTE_BONUSES[bonus.id].target; routeBonus = {id: bonus.id, eligible: true, complete: true, failed: false, target: t, progress: t}; }
  assert.ok(M.selectNode(run, boss.id)); assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, {success: true, flame: 60, routeBonus}));
  return state;
}

test('guardian clear: what is owed, and that a Scribe pick is permanent', () => {
  for (const [map, objective, owesTemp, owesScribe] of [[0, false, false, true], [0, true, false, true], [1, false, false, true], [1, true, false, true], [2, true, false, false]]) {
    const state = clearGuardian(map, objective), run = state.run;
    assert.equal(!!run.pendingTemporary, owesTemp, `map ${map + 1} objective ${objective}: temporary owed`);
    assert.equal(run.flightReward?.kind === 'inscription', owesScribe, `map ${map + 1}: Scribe owed`);
    if (!owesScribe) continue;
    const pick = run.flightReward.offers[0];
    assert.ok(INSCRIPTION_IDS.includes(pick), 'the Scribe offers only its permanent list');
    assert.ok(M.chooseFlightReward(state, pick, 1));
    assert.deepEqual(run.slotInscriptions[1], {id: pick}, 'written as a plain permanent Inscription, no temporary flag, no counter');
  }
});

test('a guardian clear with its objective met opens the Scribe only: the objective already paid, no second slot choice', () => {
  const state = clearGuardian(0, true), run = state.run;
  assert.equal(run.pendingTemporary, undefined);
  assert.equal(run.flightReward?.kind, 'inscription');
  const scribe = text(flightRewardMarkup(state, {scribe: {}}));
  assert.ok(scribe.includes(SCRIBE_KICKER)); assert.match(scribe, /The Scribe — permanent Inscription/);
  assert.doesNotMatch(scribe, /temporary/i);
  assert.match(String(run.lastFlight.routeBonus?.message), /^Objective met: \+(\d+ Stored Sparks|1 heart)$/);
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

test('writing a chest find over an inscribed slot asks first and shows the replacement on the slot', () => {
  const run = cardRun('gift-cover', ['body-spark', null, null]).run;
  writeInscription(run, 0, 'gilded');
  grantTreasureGift(run, 'farLens');
  const swap = previewPendingTemporary(run, 0);
  assert.deepEqual({confirm: swap.needsConfirm, replaces: swap.replaces}, {confirm: true, replaces: 'gilded'});
  assert.equal(writePendingTemporary(run, 0), false, 'no confirm, no write');
  const over = temporaryWriteMarkup({run}, {slot: 0});
  assert.match(over, /Replaces Gilded/); assert.match(over, /data-action="temp-write"[^>]*><span>Replace<\/span>/);
  assert.equal(previewPendingTemporary(run, 2).needsConfirm, false);
  assert.ok(writePendingTemporary(run, 2));
  assert.equal(treasureRank(run, 'farLens'), 1);
});

test('chest finds and the stop say "Inscription: <name> — <effect>"; the offer is the award', () => {
  const run = cardRun('gift-text').run, line = id => giftLine(id);
  assert.equal(line('farLens'), 'Inscription: Far Lens — luminance reaches 15% farther.');
  const lens = treasureChoices('lens', run), tithe = treasureChoices('tithe', run);
  assert.equal(lens[0].description, line('farLens')); assert.equal(lens[0].effect.treasureGift, 'farLens');
  assert.equal(lens[1].description, line('quickLens'));
  assert.ok(tithe[0].description.startsWith(line('wick'))); assert.ok(tithe[1].description.includes(line('toll')));
  assert.ok(treasureChoices('wager', run)[1].description.includes('Sealed Purse') || treasureChoices('wager', run)[1].description.includes('Wager'));
  // Taking the offer's gift queues exactly the Inscription its text names.
  grantTreasureGift(run, lens[0].effect.treasureGift);
  assert.equal(INSCRIPTIONS[run.pendingTemporary.id].name, 'Far Lens');
  const chest = text(temporaryWriteMarkup({run}, {}));
  assert.ok(chest.includes('Far Lens') && chest.includes('Luminance reaches 15% farther.') && chest.includes('Chest find'));
  // Once written, the chest offers the alternative instead.
  writePendingTemporary(run, 0);
  assert.ok(treasureChoices('lens', run).some(o => o.id === 'lens-sell'));
});

test('old saves: gifts held loose move to the first slot without a permanent Inscription', () => {
  const a = cardRun('mig-a', ['body-spark', null, null]).run;
  writeInscription(a, 0, 'gilded'); a.treasureGifts = {vessel: 1, farLens: 1, wick: 1, toll: 1};
  migrateLooseEffects(a);
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
  // Through a save and load.
  const s = cardRun('mig-e'); s.run.treasureGifts = {farLens: 1}; let json; const storage = {setItem: (k, v) => { json = v; }, getItem: () => json};
  M.saveState(s, storage); const loaded = M.loadState(storage).run;
  assert.equal(permanentOnSlot(loaded, 1) === 'far-lens' || loaded.slotInscriptions.some(e => e?.id === 'far-lens'), true);
  assert.equal(loaded.treasureGifts?.farLens, undefined);
});
