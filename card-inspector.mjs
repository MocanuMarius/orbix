// A disposable hand for phone inspection. Never reads or writes a player save.
import { newState, createRun, getSupportChoices } from './model.mjs?v=skills-cards-2';
import { makeSkillCard } from './skill-cards.mjs?v=skills-cards-2';

export function prepareCardInspectorReward(run) {
  if (run.cardReward && !run.cardReward.claimed) return;
  const id = `sample-reward:${run.cardHistory.length}`;
  run.cardReward = { id, source: 'flight', claimed: false, card: makeSkillCard('harvest-rare', id) };
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
  run.condensedGlow = 90;
  if (params.get('slots') === '5') {
    run.cardSlots = 5;
    run.mountedCards.push(makeSkillCard('chameleon', 'sample:3'), makeSkillCard('harvest-legendary', 'sample:4'));
  }
  prepareCardInspectorReward(run);
  if (params.get('scenario') === 'rest') {
    run.cardReward.claimed = true;
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
    delete run.cardReward;
  }
  return state;
}
