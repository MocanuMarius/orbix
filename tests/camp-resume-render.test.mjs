import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import * as M from '../dist/model.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';
import { cardRestMarkup } from '../dist/card-ui.mjs';
import { artifactIcon } from '../dist/upgrade-icons.mjs';
import { homeMenuMarkup } from '../dist/run-menu.mjs';
import { getGlowCapacity } from '../dist/vitality.mjs';

const source = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
const line = name => source.split(/\r?\n/).find(text => text.startsWith(`function ${name}(`));
const block = (from, to) => source.slice(source.indexOf(`function ${from}(`), source.indexOf(`function ${to}(`));

// Run the production app's render/Continue/support handlers with real model,
// camp markup and relic portraits. A renderer exception must not leave Home
// below a newly rendered in-run header.
function app(state) {
  const main = { innerHTML: '' }, body = { dataset: {}, classList: { toggle() {} } };
  const calls = { notices: [], saved: [], header: [], maps: 0 };
  const runtime = createContext({
    ...M, state, screen: 'home', cardPilot: true, selectedDifficulty: 1,
    cardRewardEquipping: false, cardRewardNotice: '',
    app: main, document: { body }, music: { setScene() {} },
    roleFleet: () => ['collector'], normalizeCompanionRole: role => role,
    cardRestMarkup, artifactIcon, homeMenuMarkup,
    renderHeader: () => calls.header.push(body.dataset.screen),
    renderBriefing: () => '', renderRetry: () => '', deathScreenMarkup: () => '',
    renderMapClear: () => '', renderResult: () => '', renderVictory: () => '',
    drawMap: () => { calls.maps++; }, requestAnimationFrame() {},
    guideScreen() {}, closeSheet() {}, showMapEarnings() {},
    tutorialCheckpoint: () => '', icon: () => '<svg></svg>', mapHeight: () => 1000,
    featureAvailable: () => true, landscape: { isPortrait: () => false },
    notify: notice => calls.notices.push(notice),
    persist: () => {
      let saved;
      assert.ok(M.saveState(state, { setItem: (_, value) => { saved = value; } }));
      calls.saved.push(saved);
    },
  });
  const functions = [
    ...['render', 'renderHome', 'renderMap', 'renderRestBenefits', 'renderRestPrep',
      'artifactArt', 'artifactsRevealed', 'artifactCollectionDock'].map(line),
    block('goToRun', 'showMapEarnings'),
    block('takeSupport', 'prepareOffer'),
    block('renderSupport', 'renderRestPrep'),
  ];
  assert.ok(functions.every(Boolean));
  runInContext(functions.join('\n'), runtime);
  runtime.render('home');
  return { runtime, main, calls, body };
}

function fresh(seed) {
  const state = M.newState(); state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  const gift = M.getStartingGiftOffers(state.run).find(offer => offer.cardId !== 'camp-kit');
  assert.ok(M.chooseStartingGift(state, gift.id));
  return state;
}
function approach(state, { spendRelic = false } = {}) {
  const run = state.run, camp = run.map.flat().find(node => node.kind === 'camp'), path = [camp];
  let cursor = camp;
  while (cursor.row > 0) {
    cursor = run.map[cursor.row - 1].find(node => node.nextIds.includes(cursor.id));
    assert.ok(cursor); path.unshift(cursor);
  }
  for (const node of path) {
    assert.ok(M.selectNode(run, node.id));
    if (node === camp) break;
    if (node.type === 'support') {
      assert.ok(M.resolveSupport(run, M.getSupportChoices(run).findIndex(offer => !offer.disabled)));
    } else {
      assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
      assert.ok(M.finishFlight(run, { success: true, flame: 55, collected: 4, ...(spendRelic ? { artifactCharges: { 'glow-wick': 0 } } : {}) }));
      M.settleCheckpoint(state);
      const draft = M.getCardDraft(run);
      if (draft) assert.ok(M.chooseCardDraft(state, draft.id, draft.offers[0].instanceId));
      if (run.cardReward) run.cardReward.uiAcknowledged = true;
      if (run.flightReward && !run.flightReward.claimed) assert.ok(M.chooseFlightReward(state, run.flightReward.offers[0]));
      assert.ok(M.acknowledgeVictory(state));
    }
  }
  return camp;
}
function reload(state) {
  let data;
  assert.ok(M.saveState(state, { setItem: (_, value) => { data = value; } }));
  return M.loadState({ getItem: () => data, setItem() {} });
}
const resources = run => ({
  lives: run.lives, flame: run.flame, capacity: getGlowCapacity(run), wallet: run.condensedGlow,
  growUses: run.cardGrowUses, growCapacity: run.cardGrowCapacity, rest: run.cardRest,
  visits: run.restVisits, cards: [run.mountedCards, run.reserveCards], charges: run.artifactCharges,
  history: run.cardHistory, profileReceipts: run.cardClearReceipts,
});

test('Continue renders the map after spent relics, including a zero-charge relic restored from storage', () => {
  for (const stored of [false, true]) {
    let state = fresh(`spent-relic-continue-${stored}`);
    state.run.artifacts = stored ? ['glow-wick', 'reed-charm'] : [null, 'reed-charm', null];
    state.run.artifactCharges = { 'glow-wick': 0 };
    if (stored) state = reload(state);
    assert.ok(state.run.artifacts.includes(null), 'fixture retains the legitimate spent relic placeholder');
    const before = structuredClone(resources(state.run)), view = app(state);
    assert.match(view.main.innerHTML, /data-action="continue-run"/);
    assert.doesNotThrow(() => view.runtime.goToRun());
    assert.equal(view.body.dataset.screen, 'map'); assert.match(view.main.innerHTML, /game-map-screen/);
    assert.match(view.main.innerHTML, /Collection · 1/);
    assert.doesNotMatch(view.main.innerHTML, /data-artifact-art="null"|data-action="continue-run"/);
    assert.deepEqual(resources(state.run), before, 'rendering never changes resources or owned cards');
  }
});

test('a dock containing only spent relics stays empty and does not render a false collection count', () => {
  const state = fresh('spent-only'); state.run.artifacts = [null, null];
  const view = app(state);
  assert.equal(view.runtime.artifactCollectionDock(), '');
});

test('Grow saves once, renders Rest and its map exit, then reloads and clears the next passage with active cards', () => {
  for (const extra of [false, true]) {
    let state = fresh(`grow-app-render-${extra}`), run = state.run;
    run.mountedCards[0] = makeSkillCard('growth-seed', 'proof:seed');
    run.mountedCards[1] = makeSkillCard('spark-cache', 'proof:cache');
    if (extra) run.mountedCards[2] = makeSkillCard('camp-kit', 'proof:extra');
    run.artifacts = ['glow-wick', 'reed-charm']; run.artifactCharges['glow-wick'] = 1;
    const camp = approach(state, { spendRelic: true }), wallet = run.condensedGlow, lives = run.lives;
    assert.deepEqual(run.artifacts.slice(0, 2), [null, 'reed-charm'], 'a real preceding clear spends the last relic use');
    const relicCount = run.artifacts.filter(Boolean).length;
    run.flame = 10;
    let view = app(state); view.runtime.goToRun();
    const grow = M.getCardCampPreview(run).actions.find(offer => offer.key === 'grow');
    view.runtime.takeSupport(grow.index,grow.token);
    assert.equal(run.cardGrowUses, 1); assert.equal(run.flame, grow.after.meter);
    assert.equal(getGlowCapacity(run), grow.after.maxMeter); assert.equal(run.lives, lives);
    assert.equal(run.condensedGlow, wallet); assert.equal(run.restVisits.filter(v => v.nodeId === camp.id).length, 1);
    if (extra) {
      assert.equal(view.body.dataset.screen, 'support'); assert.match(view.main.innerHTML, /Choose one more/);
      const leave = M.getSupportChoices(run).findIndex(offer => offer.effect?.restContinue);
      view.runtime.takeSupport(leave);
      assert.equal(M.getOwnedCards(run).find(card => card.cardId === 'camp-kit').charges, 1, 'leaving keeps Second Ember');
    }
    assert.equal(view.body.dataset.screen, 'rest-prep'); assert.match(view.main.innerHTML, /Rest complete/);
    assert.match(view.main.innerHTML, /Choose next route/);
    const settled = structuredClone(resources(run));
    view.runtime.takeSupport(grow.index,grow.token);
    assert.deepEqual(resources(run), settled, 'a stale Grow cannot award capacity twice');
    view.runtime.render('map');
    assert.match(view.main.innerHTML, /game-map-screen/); assert.ok(view.main.innerHTML.includes(`Collection · ${relicCount}`));
    state = reload(state); run = state.run; view = app(state);
    view.runtime.goToRun();
    assert.match(view.main.innerHTML, /Rest complete/);
    assert.deepEqual(resources(run), settled, 'reload keeps the completed action and all saved resources');
    view.runtime.render('map');
    const onward = M.getChoices(run); assert.equal(onward.length, 1); assert.equal(onward[0].id, camp.nextIds[0]);
    assert.ok(M.selectNode(run, onward[0].id)); assert.ok(M.beginFlightAttempt(run));
    assert.ok(M.markFlightAttemptStarted(run)); assert.ok(M.finishFlight(run, { success: true, flame: 45, collected: 4 }));
    M.settleCheckpoint(state);
    const draft = M.getCardDraft(run);
    assert.ok(M.chooseCardDraft(state, draft.id, draft.offers[0].instanceId));
    if (run.cardReward) run.cardReward.uiAcknowledged = true;
    if (run.flightReward && !run.flightReward.claimed) assert.ok(M.chooseFlightReward(state, run.flightReward.offers[0]));
    assert.ok(M.acknowledgeVictory(state));
    view.runtime.goToRun(); assert.equal(view.body.dataset.screen, 'map');
    assert.match(view.main.innerHTML, /game-map-screen/); assert.equal(run.cardGrowUses, 1);
  }
});
