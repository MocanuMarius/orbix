import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_SYSTEM, makeSkillCard} from '../dist/skill-cards.mjs';
import {getCardRowHelpExample, cardRowTermHelpMarkup, resolveCardHelpContext} from '../dist/card-row-help.mjs';

const context = (ids, slot = 0) => {
  const mountedCards = ids.map((id,i) => id ? makeSkillCard(id, `actual:${i}`) : null);
  return {run:{skillSystem:CARD_SYSTEM,cardSlots:ids.length,mountedCards}, slot, card:mountedCards[slot], instanceId:mountedCards[slot]?.instanceId};
};

test('shared-use help executes the real rank and nearly exhausted source without changing it', () => {
  const current = context(['echo-iii','spark-cache','refrain']);
  current.run.mountedCards[1].rank = 3;
  current.run.mountedCards[1].charges = 2;
  const before = structuredClone(current);
  const preview = getCardRowHelpExample('shared',current);
  assert.equal(preview.fallback,false);
  assert.equal(preview.trace.sparks,12);
  assert.equal(preview.trace.passes,2);
  assert.deepEqual(preview.trace.steps.slice(0,3).map(step => [step.chargesBefore,step.chargesAfter]),[[2,1],[1,0],[0,0]]);
  assert.deepEqual(current,before);
  const markup = cardRowTermHelpMarkup('shared',current);
  assert.match(markup,/2 → 1/);
  assert.match(markup,/1 → 0/);
  assert.match(markup,/No uses remaining/);
  assert.match(markup,/Your current row/);
});

test('pass help keeps current empty slots, order, rank, and independent pass subtotals', () => {
  const current = context(['body-spark',null,'prism-lens','refrain']);
  current.card.rank = 3;
  const preview = getCardRowHelpExample('pass',current);
  assert.equal(preview.trace.sparks,10);
  assert.equal(preview.trace.steps[1].skipReason,'empty-slot');
  assert.equal(preview.trace.steps.find(step => step.pass === 2).before,0);
  const markup = cardRowTermHelpMarkup('pass',current);
  assert.match(markup,/Body Spark \+4/);
  assert.doesNotMatch(markup,/Body Spark \+2/);
  assert.match(markup,/Slot 4/);
});

test('Uses and Repeat label a teaching row when a selected passive has no matching action', () => {
  const current = context(['deep-vessel','lift-guide',null]);
  for (const key of ['uses','repeat','shared']) {
    const preview = getCardRowHelpExample(key,current);
    assert.equal(preview.fallback,true);
    const markup = cardRowTermHelpMarkup(key,current);
    assert.match(markup,/Example row · 2 shared uses/);
    assert.match(markup,/Slot 1 · Deep Vessel/);
    assert.match(markup,/This card has no limited uses/);
  }
  assert.match(cardRowTermHelpMarkup('pass',null),/labeled example/);
});

test('selected face context preserves preview rank and supplied live meter snapshot', () => {
  const current = context(['body-spark','spark-cache',null]);
  const snapshot = {flame:51,maxFlame:110,flapCost:10,cardCharges:{'actual:1':1}};
  const before = structuredClone(current.run);
  const face = {dataset:{cardHelp:'spark-cache',cardInstance:'actual:1',cardRank:'3',cardCharges:'1'}};
  const resolved = resolveCardHelpContext({closest:() => face},current.run,{snapshot});
  assert.equal(resolved.card.rank,3);
  assert.equal(resolved.card.charges,1);
  assert.equal(resolved.run.mountedCards[1].charges,1);
  assert.equal(resolved.snapshot,snapshot);
  assert.equal(resolved.slot,1);
  assert.deepEqual(current.run,before);
});

test('a missing physical trigger cannot be presented as an available live payout', () => {
  const current = context(['toll-bell','body-spark',null]);
  const preview = getCardRowHelpExample('pass',current);
  assert.equal(preview.fallback,false);
  assert.equal(preview.trace.event.kind,'body-spark');
  assert.equal(preview.trace.steps[0].success,false);
  assert.equal(preview.trace.sparks,2);
  assert.match(cardRowTermHelpMarkup('pass',current),/Needs Rhythm/);
  const unavailable = context(['echo','toll-bell',null]);
  assert.equal(getCardRowHelpExample('repeat',unavailable).fallback,true);
});
