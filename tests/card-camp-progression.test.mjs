import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';
import { cardRestMarkup } from '../dist/card-ui.mjs';

function fresh(seed = 'camp-normal-production-repro') {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  const gift = M.getStartingGiftOffers(state.run).find(gift => gift.cardId !== 'camp-kit');
  assert.ok(M.chooseStartingGift(state, gift.id));
  return state;
}
function reload(state) {
  let data; const storage = { getItem: () => data, setItem: (_, value) => { data = value; } };
  assert.ok(M.saveState(state, storage)); return M.loadState(storage);
}
function approach(state, target = state.run.map.flat().find(node => node.kind === 'camp')) {
  const r = state.run, path = [target]; let cursor = target;
  while (cursor.row > 0) { cursor = r.map[cursor.row - 1].find(node => node.nextIds.includes(cursor.id)); assert.ok(cursor); path.unshift(cursor); }
  for (const node of path) {
    assert.ok(M.selectNode(r, node.id));
    if (node === target) break;
    if (node.type === 'support') {
      assert.ok(M.resolveSupport(r, M.getSupportChoices(r, state.profile).findIndex(offer => !offer.disabled), state.profile));
    } else {
      assert.ok(M.beginFlightAttempt(r)); assert.ok(M.markFlightAttemptStarted(r));
      assert.ok(M.finishFlight(r, { success: true, flame: 55, collected: 4 })); M.settleCheckpoint(state);
      if (r.cardReward) r.cardReward.uiAcknowledged = true;
      if (r.flightReward && !r.flightReward.claimed) assert.ok(M.chooseFlightReward(state, r.flightReward.offers[0]));
      assert.ok(M.acknowledgeVictory(state));
    }
  }
  return path;
}
const choose = (run, id) => M.resolveSupport(run, M.getSupportChoices(run).findIndex(choice => choice.id === id));

test('production connected-route Rest actions render saved completion and continue through their single exit', () => {
  for (const action of ['recover', 'slot', 'grow', 'continue']) {
    let state = fresh(`camp-production-${action}`), r = state.run;
    if (action === 'grow') { r.reserveCards.push(makeSkillCard('growth-seed', 'test:growth')); assert.ok(M.equipOwnedCard(r, 'test:growth', 2)); }
    approach(state); const node = r.current;
    assert.ok(cardRestMarkup(r, node, M.getSupportChoices(r)).length > 0);
    assert.ok(choose(r, `rest-${action}`));
    assert.equal(r.phase, 'map'); assert.equal(r.current, null); assert.equal(r.restReady, true);
    assert.equal(M.getCardCampPreview(r).completed, true);
    const html = cardRestMarkup(r, node, []);
    assert.match(html, /Rest complete/); assert.match(html, /Choose next route/);
    assert.doesNotMatch(html, /data-action="support"/);
    assert.equal(M.resolveSupport(r, 0), false, 'double tap cannot repeat the action');
    state = reload(state); r = state.run;
    assert.match(cardRestMarkup(r, node, []), /Rest complete/);
    const stale = structuredClone(r);
    Object.assign(stale, { current: stale.map.flat().find(site => site.id === node.id), step: node.row, phase: 'support' });
    assert.equal(M.resolveSupport(stale, 0), false, 'reopening a completed site cannot grant another action');
    assert.equal(M.getChoices(r).length, 1);
    assert.equal(M.getChoices(r)[0].id, node.nextIds[0]);
    assert.ok(M.selectNode(r, node.nextIds[0]));
    assert.equal(M.canUseCardCampServices(r), false);
    assert.ok(M.beginFlightAttempt(r)); assert.equal(r.restReady, false);
  }
});

test('rank, evolution and Forge spend only at a verified active or completed camp', () => {
  const state = fresh('camp-service-gates'), r = state.run;
  r.reserveCards.push(makeSkillCard('spark-cache', 'rank'), { ...makeSkillCard('harvest-common', 'evolve'), rank: 3 });
  r.condensedGlow = 200;
  for (const phase of ['map', 'briefing', 'support', 'retry', 'map-clear']) {
    r.phase = phase; const before = JSON.stringify(r);
    assert.equal(M.improveOwnedCard(state, 'rank'), false); assert.equal(M.improveOwnedCard(state, 'evolve'), false);
    assert.equal(M.forgeOwnedCard(state), false); assert.equal(JSON.stringify(r), before);
  }
  r.phase = 'map'; approach(state); r.condensedGlow = 200;
  const actions = [...r.cardRest.actions];
  assert.equal(M.getCardImprovePreview(r, 'evolve').kind, 'evolution');
  assert.ok(M.improveOwnedCard(state, 'rank')); assert.ok(M.improveOwnedCard(state, 'evolve'));
  assert.ok(M.forgeOwnedCard(state)); assert.deepEqual(r.cardRest.actions, actions);
  assert.ok(choose(r, 'rest-recover')); assert.equal(M.canUseCardCampServices(r), true);
  assert.ok(M.forgeOwnedCard(state));
  const preview = M.getCardImprovePreview(r, 'rank');
  assert.ok(M.selectNode(r, M.getChoices(r)[0].id)); const wallet = r.condensedGlow;
  assert.equal(M.improveOwnedCard(state, 'rank', undefined, preview.token), false);
  assert.equal(M.forgeOwnedCard(state), false); assert.equal(r.condensedGlow, wallet);
});

test('all three maps have three reachable optional camps and each camp has one ordinary flight exit', () => {
  const recipes = new Set(), mirrors = new Set();
  for (let seed = 0; seed < 80; seed++) {
    const r = fresh(`three-camps-${seed}`).run;
    for (let map = 0; map < 3; map++) {
      const all = r.map.flat(), camps = all.filter(node => node.kind === 'camp'), byId = new Map(all.map(node => [node.id, node]));
      recipes.add(all[0].recipeId); mirrors.add(all[0].lane === all[0].routeLane);
      assert.equal(r.map.length, 10); assert.equal(camps.length, 3);
      const seen = new Set(); const paths = [];
      function visit(node, taken = [], elite = false) {
        if (elite && node.elite) return;
        seen.add(node.id); const next = node.kind === 'camp' ? [...taken, node.id] : taken;
        if (!node.nextIds.length) paths.push(next);
        for (const id of node.nextIds) visit(byId.get(id), next, node.type === 'support' ? elite : node.elite);
      }
      r.map[0].forEach(node => visit(node)); assert.equal(seen.size, all.length);
      for (const camp of camps) {
        assert.equal(camp.nextIds.length, 1);
        assert.notEqual(byId.get(camp.nextIds[0]).type, 'support');
        assert.ok(paths.some(path => path.includes(camp.id))); assert.ok(paths.some(path => !path.includes(camp.id)));
      }
      assert.ok(paths.some(path => path.length === 0), 'an ordinary route can bypass all camps');
      if (map < 2) { Object.assign(r, { phase: 'map-clear', step: r.map.length }); assert.ok(M.advanceMap(r)); }
    }
  }
  assert.equal(recipes.size, 2); assert.equal(mirrors.size, 2);
});

test('starting preview leaves offers and ownership untouched, and confirmation tokens cannot cross runs or regrant Guide', () => {
  const state = M.newState(); state.run = M.createRun(state.profile, 'gift-confirmation', 1, { cards: true });
  const r = state.run, offers = M.getStartingGiftOffers(r), before = JSON.stringify(r), quote = M.getStartingGiftPreview(r, offers[0].id);
  assert.equal(JSON.stringify(r), before); assert.deepEqual(M.getStartingGiftOffers(r), offers);
  assert.equal(M.chooseStartingGift(state, offers[0].id, 'stale'), false); assert.equal(JSON.stringify(r), before);
  const other = M.createRun(state.profile, 'gift-confirmation-other', 1, { cards: true });
  assert.equal(M.chooseStartingGift({ run: other }, offers[0].id, quote.token), false);
  assert.ok(M.chooseStartingGift(state, offers[0].id, quote.token));
  const guide = M.getOwnedCards(r).find(card => card.cardId === 'lift-guide'); assert.ok(guide);
  assert.ok(M.meltOwnedCards(state, [guide.instanceId]));
  assert.equal(M.chooseStartingGift(state, offers[0].id, quote.token), false);
  assert.equal(M.getOwnedCards(reload(state).run).some(card => card.cardId === 'lift-guide'), false);
});
