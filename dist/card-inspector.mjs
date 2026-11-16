// A disposable deck for phone inspection. Never reads or writes a player save.
import { newState, createRun, getSupportChoices } from './model.mjs?v=cards-renewal-1';
import { makeSkillCard } from './skill-cards.mjs?v=cards-renewal-1';

export function prepareCardInspectorReward(run, cardId = 'harvest-rare') {
  if (run.cardReward && !run.cardReward.uiAcknowledged) return;
  const id = `sample-reward:${run.cardHistory.length}`;
  run.cardReward = { id, source: 'flight', claimed: false, card: makeSkillCard(cardId, id) };
}

export function createCardInspectorState(params = new URLSearchParams()) {
  const state = newState();
  state.profile.tutorialComplete = true;
  state.settings.skipTutorial = true;
  state.run = createRun(state.profile, 'cards-workbench-sample', 1, { cards: true });
  const run = state.run;
  run.startingGiftId = 'card:body-spark';
  run.guideSkipped = true;
  run.mountedCards = ['echo', 'spark-cache', 'deep-vessel'].map((id, i) => makeSkillCard(id, `sample:${i}`));
  run.mountedCards[1].charges = 4;
  run.reserveCards = ['body-spark', 'spark-cache', 'harvest-rare', 'harvest-legendary', 'cache-handling', 'flash-handling'].map((id, i) => makeSkillCard(id, `sample:stored:${i}`));
  run.reserveCards[1].charges = 2;
  if (params.get('deck') === 'large') {
    for (let i = 0; i < 120; i++) run.reserveCards.push(makeSkillCard(['body-spark', 'deep-vessel', 'harvest-rare', 'harvest-legendary'][i % 4], `sample:large:${i}`));
  }
  run.condensedGlow = 90;
  if (params.get('slots') === '5') {
    run.cardSlots = 5;
    run.mountedCards.push(makeSkillCard('chameleon', 'sample:3'), makeSkillCard('harvest-legendary', 'sample:4'));
  }
  if (params.get('scenario') === 'reward') prepareCardInspectorReward(run, params.get('reward') === 'edge-reach' ? 'edge-reach' : 'harvest-rare');
  if (params.get('scenario') === 'proximity') run.reserveCards.push(makeSkillCard('edge-reach', 'sample:edge-reach'));
  if (params.get('scenario') === 'new-common') {
    run.cardSlots = 5;
    run.mountedCards = ['growth-ring', 'wind-feather', 'wick-doubler', 'fast-spool', 'body-spark'].map((id, i) => makeSkillCard(id, `sample:new-common:${i}`));
    run.reserveCards.push(makeSkillCard('echo', 'sample:new-common:echo'));
  }
  if (params.get('scenario') === 'rest') {
    if (run.cardReward) run.cardReward.uiAcknowledged = true;
    const node = run.map.flat().find(n => n.kind === 'camp');
    run.current = node;
    run.step = node.row;
    run.path = [node.id];
    run.phase = 'support';
    getSupportChoices(run, state.profile);
  }
  if (params.get('scenario') === 'starter') {
    delete run.startingGiftId;
    run.mountedCards = [null, null, null];
    run.reserveCards = [];
    delete run.cardReward;
  }
  return state;
}
