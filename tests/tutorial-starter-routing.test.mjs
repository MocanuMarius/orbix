import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import * as M from '../dist/model.mjs';
import { PRACTICE_STOPS } from '../dist/practice-course.mjs';
import { starterCardsMarkup, starterGiftConfirmationMarkup } from '../dist/card-ui.mjs';
import { homeMenuMarkup } from '../dist/run-menu.mjs';

// Run the production New Game / First Light / starting gift routing from
// app.mjs against the real model, with isolated in-memory storage per test.
const source = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
const lines = source.split(/\r?\n/);
const line = name => lines.find(text => text.startsWith(`function ${name}(`));
const routing = source.slice(source.indexOf('// Preview a real expedition'), source.indexOf('function skipPractice('));
const SAVE = 'wispbound.save.condensed.v7';
const keyFor = cards => cards ? `cards-pilot:${SAVE}` : SAVE;
const memory = () => { const data = new Map(); return { data, getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }; };

// Each boot is one page load: module state (pending draft, skip flag) starts empty.
function boot(storage, cards) {
  const gameStorage = { getItem: key => storage.getItem(cards ? `cards-pilot:${key}` : key), setItem: (key, value) => storage.setItem(cards ? `cards-pilot:${key}` : key, value) };
  const ui = { screen: 'home', sheet: null, rendered: [] };
  const state = M.loadState(gameStorage);
  const context = createContext({
    ...M, state, ui, cardPilot: cards, mockMode: false, selectedDifficulty: 1, engine: null,
    localStorage: storage, CSS: { escape: v => v }, document: { querySelector: () => null },
    requestAnimationFrame() {}, notify() {}, destroyFlight() {}, pauseFlight() {}, skillBookChapter: () => 'wisp',
    mainSkillSelection: '', bookChapter: '', esc: v => String(v ?? ''), skillIcon: () => '', artifactIcon: () => '', fleetMarkup: () => '',
    starterCardsMarkup, starterGiftConfirmationMarkup, homeMenuMarkup, icon: () => '<svg></svg>',
    completedGameScore: () => null, cardVictoryRecap: () => '', artifactById: () => null, formatGlow: v => String(v), condensedIconMarkup: () => '', artifactArt: () => '',
    openSheet(content, cls = '') { ui.sheet = { content, cls }; return { addEventListener() {} }; },
    closeSheet() { ui.sheet = null; },
    persist() { return M.saveState(state, gameStorage); },
    render(view) { ui.screen = view; ui.rendered.push(view); },
    goToRun() {
      const r = state.run;
      if (!r) return context.render('home');
      if (r.phase === 'ended') { M.settleCheckpoint(state); M.bankRun(state); context.persist(); return context.render('result'); }
      context.render(r.isTutorial ? 'practice' : 'map');
    },
  });
  runInContext(`${routing}\n${line('renderHome')}\n${line('renderResult')}`, context);
  const run = code => runInContext(code, context);
  const sheetIds = () => [...(ui.sheet?.content || '').matchAll(/data-action="(?:new|existing)-gift" data-id="([^"]+)"/g)].map(m => m[1]);
  return {
    state, ui, run, sheetIds, gameStorage,
    home: () => run('renderHome()'),
    result: () => run('renderResult()'),
    // Actions exactly as the click dispatcher routes them.
    newGame: () => run('requestNewGame()'),
    confirmNewGame: () => run('beginNewGame()'),
    tutorial: () => run('enterTutorial()'),
    continueRun: () => { context.closeSheet(); context.goToRun(); },
    skipOnce: () => run('exitTutorial({continueNewGame:true})'),
    rememberSkip: () => { state.settings.skipTutorial = true; run('exitTutorial({continueNewGame:true,remember:true})'); },
    leavePractice: () => run('exitTutorial({continueNewGame:true})'),
    skipToStart: () => run('skipPracticeToStart()'),
    exitMenu: () => run('exitToMenu()'),
    back: () => context.closeSheet(),
    pick(index = 0) {
      const id = sheetIds()[index]; assert.ok(id, 'a gift is offered');
      run(`requestStartingGift(${JSON.stringify(id)},false)`);
      if (!cards) return id;
      const token = /data-token="([^"]+)"/.exec(ui.sheet.content)?.[1].replaceAll('&quot;', '"');
      assert.match(ui.sheet.cls, /card-starter-confirm-sheet/);
      run(`confirmStartingGift(${JSON.stringify(id)},false,${JSON.stringify(token)})`);
      return id;
    },
    no: () => run('cancelStartingGift(false)'),
  };
}
const giftSheet = (ui, cards) => !!ui.sheet && (cards ? /card-starter-sheet/.test(ui.sheet.cls) && !/confirm/.test(ui.sheet.cls) : /starting-gift-sheet/.test(ui.sheet.cls));
const saved = (storage, cards) => JSON.parse(storage.getItem(keyFor(cards)) || 'null');

test('the click dispatcher routes practice and gift actions to the tested functions', () => {
  for (const wiring of ["case'skip-practice-once':exitTutorial({continueNewGame:true})", "case'remember-skip-practice':state.settings.skipTutorial=true;exitTutorial({continueNewGame:true,remember:true})",
    "case'leave-practice':exitTutorial({continueNewGame:true})", "case'practice-skip-to-start':skipPracticeToStart()", "case'confirm-new-game':beginNewGame()",
    "case'new-game':requestNewGame()", "case'tutorial':enterTutorial()", "case'continue-run':closeSheet();goToRun()"]) assert.ok(source.includes(wiring), wiring);
  assert.doesNotMatch(source, /finishFlight\(state\.run,result\);[^\n]*exitTutorial\(\{continueNewGame:true\}\)/, 'a finished practice flight never auto-opens the gift sheet');
});

for (const cards of [true, false]) {
  const mode = cards ? 'Cards' : 'Legacy', noun = cards ? 'card' : 'gift';

  test(`${mode}: fresh profile New Game says practice comes first, skip once reaches a working starter`, () => {
    const storage = memory(), g = boot(storage, cards);
    assert.match(g.home(), /NEW GAME<\/b><small>First Light practice first/);
    g.newGame();
    assert.equal(g.state.run.isTutorial, true); assert.deepEqual(g.state.run.tutorialContinuation, { difficulty: 1 });
    assert.equal(g.ui.sheet, null, 'no gift sheet inside practice');
    assert.equal(M.canChooseStartingGift(g.state.run), false);
    g.skipOnce();
    assert.equal(g.ui.screen, 'home'); assert.ok(giftSheet(g.ui, cards));
    assert.equal(g.state.profile.tutorialComplete, false, 'skip once is not completion');
    const id = g.pick(0);
    assert.equal(g.state.run.isTutorial, undefined); assert.equal(g.state.run.startingGiftId, id);
    if (cards) {
      // The pick plus Lift Guide; when Lift Guide itself is the pick the second card is another offered starter.
      const mounted = g.state.run.mountedCards.filter(Boolean).map(c => c.cardId);
      assert.equal(mounted.length, 2); assert.ok(mounted.includes(id.slice(5))); assert.ok(mounted.includes('lift-guide'));
    }
    assert.equal(g.state.run.practiceCards, undefined, 'loans never reach the real run');
    assert.equal(saved(storage, cards).run.startingGiftId, id);
    assert.equal(storage.getItem(keyFor(!cards)), null, 'the other mode save stays untouched');
  });

  test(`${mode}: D - New Game during a saved practice offers Continue or Skip, never a replace-run gift dialog`, () => {
    const storage = memory(); let g = boot(storage, cards);
    g.newGame(); const practiceId = g.state.run.id;
    g = boot(storage, cards); // reload during practice
    assert.equal(g.state.run.id, practiceId);
    g.newGame();
    assert.match(g.ui.sheet.content, /You're in First Light/);
    assert.doesNotMatch(g.ui.sheet.content, /replace/);
    assert.match(g.ui.sheet.content, /data-action="continue-run">Continue practice/);
    assert.match(g.ui.sheet.content, new RegExp(`data-action="practice-skip-to-start">Skip to starting ${noun}`));
    g.continueRun(); assert.equal(g.ui.screen, 'practice'); assert.equal(g.state.run.id, practiceId, 'Continue keeps the same practice');
    g.newGame(); g.skipToStart();
    assert.ok(giftSheet(g.ui, cards), `skip goes straight to the starting ${noun}`);
    assert.equal(g.state.run, null);
  });

  test(`${mode}: D with a suspended real run - the replace confirmation describes the real run`, () => {
    const storage = memory(); let g = boot(storage, cards);
    g.newGame(); g.skipOnce(); g.pick(0);
    const real = structuredClone(g.state.run);
    g = boot(storage, cards);
    g.newGame(); assert.match(g.ui.sheet.content, /replace your Ascension 1 run \(map 1 of 3\)/);
    assert.match(g.ui.sheet.content, /Start with First Light/, 'practice still comes first for this profile');
    g.confirmNewGame();
    assert.equal(g.state.run.isTutorial, true); assert.equal(g.state.suspendedRun.id, real.id);
    g = boot(storage, cards);
    g.newGame(); assert.match(g.ui.sheet.content, /You're in First Light/); assert.match(g.ui.sheet.content, /Your saved run stays safe/);
    g.skipToStart();
    assert.equal(g.state.run.id, real.id, 'leaving practice restores the real run first');
    assert.match(g.ui.sheet.content, /Start a new game\?/); assert.match(g.ui.sheet.content, /replace your Ascension 1 run/);
    assert.match(g.ui.sheet.content, new RegExp(`Choose a new ${noun}`));
    g.back(); assert.equal(g.state.run.id, real.id, 'Keep current run keeps it');
    assert.equal(saved(storage, cards).run.id, real.id);
    g.newGame(); g.confirmNewGame();
    assert.ok(giftSheet(g.ui, cards), 'the skip counts for this New Game');
    g.back(); assert.equal(g.state.run.id, real.id, 'Back on the gift sheet keeps the real run');
  });

  test(`${mode}: E - finishing practice ends on an explicit starting ${noun} step`, () => {
    const storage = memory(); let g = boot(storage, cards);
    g.newGame(); const r = g.state.run;
    const last = r.map.length - 1; assert.equal(last, PRACTICE_STOPS.length - 1, 'one row per practice stop');
    r.step = last; r.path = r.map.slice(0, last).map(row => row[0].id); r.phase = 'map';
    assert.ok(M.selectNode(r, M.getChoices(r)[0].id)); assert.ok(M.beginFlightAttempt(r));
    assert.ok(M.finishFlight(r, { success: true, flame: 80, practiceTopics: ['lift'] }));
    g.run('persist();goToRun()'); // the production flight-finish tail
    assert.equal(g.ui.screen, 'result'); assert.equal(g.ui.sheet, null, 'no gift sheet over the practice result');
    const markup = g.result();
    assert.match(markup, /Practice complete/);
    assert.match(markup, new RegExp(`data-action="leave-practice">Choose your starting ${noun}`));
    g = boot(storage, cards); // reload on the completion step keeps it resolvable
    assert.equal(g.state.run.isTutorial, true); assert.equal(g.state.run.success, true);
    g.leavePractice();
    assert.equal(g.state.profile.tutorialComplete, true);
    assert.ok(giftSheet(g.ui, cards)); g.pick(1);
    assert.equal(g.state.run.isTutorial, undefined); assert.ok(g.state.run.startingGiftId);
    g = boot(storage, cards); assert.match(g.home(), /NEW GAME<\/b><small>Choose a starting gift/);
  });

  test(`${mode}: E - Tutorial from Home without a New Game ends with Back to your game`, () => {
    const storage = memory(); const g = boot(storage, cards);
    g.tutorial(); assert.equal(g.state.run.tutorialContinuation, undefined);
    g.state.run.phase = 'ended'; g.state.run.success = true;
    assert.match(g.result(), /data-action="leave-practice">Back to your game/);
    g.leavePractice(); assert.equal(g.ui.sheet, null); assert.equal(g.ui.screen, 'home');
  });

  test(`${mode}: F - skip once then Back: New Game goes to the starter, roll kept through No and reload`, () => {
    const storage = memory(); let g = boot(storage, cards);
    g.newGame(); g.skipOnce();
    const roll = g.sheetIds(); assert.ok(roll.length >= 2);
    if (cards) { g.run(`requestStartingGift(${JSON.stringify(roll[0])},false)`); g.no(); assert.deepEqual(g.sheetIds(), roll, 'No keeps the roll'); }
    g.back(); assert.match(g.home(), /Choose a starting gift/, 'Home no longer promises practice for this New Game');
    g.newGame(); assert.ok(giftSheet(g.ui, cards), 'New Game goes to the starter, not back into practice');
    assert.deepEqual(g.sheetIds(), roll);
    g = boot(storage, cards); // a reload forgets the session skip but keeps the roll
    g.newGame(); assert.equal(g.state.run.isTutorial, true);
    g.skipOnce(); assert.deepEqual(g.sheetIds(), roll, 'reload keeps the offered roll');
    g.pick(0); assert.equal(g.state.run.startingGiftId, roll[0]);
    g.exitMenu(); g.newGame(); g.confirmNewGame();
    assert.equal(g.state.run.isTutorial, true, 'a committed gift ends the session skip');
  });

  test(`${mode}: Remember & skip and Tutorial from Home keep the suspended real run`, () => {
    const storage = memory(); let g = boot(storage, cards);
    g.newGame(); g.rememberSkip();
    assert.equal(g.state.profile.tutorialComplete, true); assert.equal(g.state.settings.skipTutorial, true);
    g.pick(0); const real = structuredClone(g.state.run);
    g.tutorial(); assert.equal(g.state.run.isTutorial, true); assert.equal(g.state.suspendedRun.id, real.id);
    assert.equal(g.ui.sheet, null);
    g = boot(storage, cards); g.continueRun(); assert.equal(g.ui.screen, 'practice');
    g.skipOnce(); assert.equal(g.ui.sheet, null, 'a Home practice has no New Game to continue');
    assert.equal(g.state.run.id, real.id); assert.equal(g.state.run.startingGiftId, real.startingGiftId);
    g.newGame(); assert.doesNotMatch(g.ui.sheet.content, /First Light/);
  });
}

test('Cards and Legacy saves stay isolated across both routing modes', () => {
  const storage = memory();
  const cards = boot(storage, true); cards.newGame(); cards.skipOnce(); cards.pick(0);
  const cardsBytes = storage.getItem(keyFor(true));
  assert.equal(storage.getItem(keyFor(false)), null);
  const legacy = boot(storage, false); legacy.newGame(); legacy.rememberSkip(); legacy.pick(0);
  assert.equal(storage.getItem(keyFor(true)), cardsBytes, 'Legacy play never writes the Cards save');
  assert.equal(saved(storage, true).profile.tutorialComplete, false);
  assert.equal(saved(storage, false).profile.tutorialComplete, true);
  assert.notEqual(storage.getItem('orbix-next-cards-expedition'), 'shared');
});

test('one-time tutorial upgrade marks only saves with banked real play, idempotently', () => {
  const store = save => { const s = memory(); s.setItem(SAVE, JSON.stringify(save)); return s; };
  const base = () => { const s = M.newState(); delete s.profile.tutorialEvidenceChecked; return JSON.parse(JSON.stringify(s)); };
  for (const evidence of [p => { p.stats.completedRuns = 2; }, p => { p.clearedFlights = 5; }, p => { p.bankedRuns = ['old-run']; }]) {
    const old = base(); evidence(old.profile);
    const loaded = M.loadState(store(old));
    assert.equal(loaded.profile.tutorialComplete, true); assert.equal(loaded.profile.tutorialEvidenceChecked, true);
    assert.equal(M.shouldStartTutorial(loaded), false);
  }
  const fresh = M.loadState(store(base()));
  assert.equal(fresh.profile.tutorialComplete, false, 'no evidence, no change'); assert.equal(fresh.profile.tutorialEvidenceChecked, true);
  // Idempotent and respects a later Reset tutorial.
  const veteran = base(); veteran.profile.stats.completedRuns = 1;
  const once = M.loadState(store(veteran)); once.profile.tutorialComplete = false;
  const s = memory(); assert.ok(M.saveState(once, { setItem: (k, v) => s.setItem(k, v) }));
  const twice = M.loadState(s);
  assert.equal(twice.profile.tutorialComplete, false, 'a reset after the upgrade is not undone');
  const again = M.loadState({ getItem: () => JSON.stringify(JSON.parse(s.getItem(SAVE))) });
  assert.deepEqual(again.profile, twice.profile);
  // Practice never creates the evidence.
  const p = M.newState(); M.startTutorial(p); M.leaveTutorial(p);
  assert.equal(p.profile.stats.completedRuns + p.profile.clearedFlights + p.profile.bankedRuns.length, 0);
  assert.equal(M.newState().profile.tutorialEvidenceChecked, true, 'fresh profiles never need the upgrade');
});

test('the upgrade applies per save key: an evidence-free Legacy save is left alone', () => {
  const storage = memory();
  const veteran = M.newState(); delete veteran.profile.tutorialEvidenceChecked; veteran.profile.clearedFlights = 9;
  const newcomer = M.newState(); delete newcomer.profile.tutorialEvidenceChecked;
  storage.setItem(keyFor(true), JSON.stringify(veteran)); storage.setItem(keyFor(false), JSON.stringify(newcomer));
  const cards = boot(storage, true), legacy = boot(storage, false);
  assert.equal(cards.state.profile.tutorialComplete, true);
  assert.equal(legacy.state.profile.tutorialComplete, false);
  assert.match(cards.home(), /Choose a starting gift/); assert.match(legacy.home(), /First Light practice first/);
});
