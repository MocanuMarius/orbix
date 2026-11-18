import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSkillCard, CARD_SYSTEM} from '../dist/skill-cards.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {cardFace, cardsBenchMarkup} from '../dist/card-ui.mjs';
import {createCardInspectorState} from '../dist/card-inspector.mjs';

const build = ids => ({skillSystem:CARD_SYSTEM, companions:['collector'], mountedCards:ids.map((id,i)=>id ? makeSkillCard(id,`status:${i}`) : null)});
const states = run => getEquippedCardStatuses(run).map(s=>s?.state || null);

test('copy readiness resolves immediate real neighbor, passive compatibility and changed order',()=>{
  assert.deepEqual(states(build(['chameleon',null,'body-spark'])),['blocked',null,'ready']);
  assert.equal(getEquippedCardStatuses(build(['chameleon','prism-lens']))[0].state,'blocked');
  assert.equal(getEquippedCardStatuses(build(['chameleon','prism-lens']))[0].label,"Can't copy the card to its right");
  assert.deepEqual(states(build(['chameleon','deep-vessel'])),['ready','ready']);
  assert.deepEqual(states(build(['echo','edge-reach'])),['blocked','ready']);
  assert.deepEqual(states(build(['echo','chameleon','body-spark'])),['blocked','ready','ready']);
  const run=build(['body-spark','chameleon']); assert.equal(states(run)[1],'blocked');
  run.mountedCards.reverse(); assert.deepEqual(states(run),['ready','ready']);
});

test('ordering quotes combine actual predicates and only same-event Spark payers',()=>{
  assert.equal(states(build(['prism-lens']))[0],'blocked');
  assert.deepEqual(states(build(['prism-lens','body-spark'])),['blocked','ready']);
  assert.deepEqual(states(build(['body-spark','prism-lens'])),['ready','ready']);
  assert.equal(states(build(['body-spark','clear-prism']))[1],'blocked');
  assert.equal(states(build(['first-ripple','ripple-glass']))[1],'blocked');
  assert.equal(states(build(['far-shore','ripple-glass']))[1],'ready');
  // Crescendo doubles whenever something is to its left (no two-payer requirement since 2026-11-17).
  assert.equal(states(build(['dusk-wick','cluster-heart','crescendo']))[2],'ready');
  assert.equal(states(build(['crescendo','body-spark']))[0],'blocked');
  assert.equal(states(build(['dusk-wick','low-wick','crescendo']))[2],'ready');
  assert.equal(states(build(['echo','harvest-common','crescendo']))[2],'ready');
  assert.equal(states(build(['body-spark','closing-chord',null]))[1],'ready');
  assert.equal(getEquippedCardStatuses(build(['body-spark','closing-chord','deep-vessel']))[1].label,'Move to the last slot');
});

test('trigger availability respects native abilities, baseline events and Collector loadout',()=>{
  for(const id of ['far-shore','harvest-common','downbeat','flash-bank','glass-spool','ring-spring','courier-tip','slip-feather','diving-bell','springboard','tailwind'])
    assert.equal(states(build([id]))[0],'ready',id);
  // Wave Loom is an engine card now (it no longer needs Field Impulse).
  assert.equal(states(build(['wave-loom']))[0],'ready');
  for(const id of ['toll-bell','pacesetter','mending-moss'])
    assert.equal(states(build([id]))[0],'blocked',id);
  assert.equal(states(build(['rhythm','toll-bell']))[1],'ready');
  assert.equal(states(build(['field-impulse','diving-bell']))[1],'ready');
  assert.equal(states(build(['watchlight','mending-moss']))[1],'ready');
  assert.equal(states(build(['crate-lining']))[0],'ready','Crate Lining also pays on a Cluster delivery, so it needs no Cache Handling');
  assert.equal(states(build(['cache-handling','crate-lining']))[1],'ready');
  const run=build(['slip-feather','mending-moss','crate-lining']);
  run.skills={'collector-field-impulse':1,'collector-last-orbit':1,'collector-fetch-large':1};
  assert.deepEqual(states(run),['ready','ready','ready']);
  run.companions=['protector'];assert.deepEqual(states(run),['ready','blocked','blocked']);
});

test('shared last uses and productive replay are accurate without mutating the build',()=>{
  const run=build(['echo-iii','spark-cache','refrain']);run.mountedCards[1].charges=1;
  const before=JSON.stringify(run),status=getEquippedCardStatuses(run);
  assert.equal(status[0].state,'ready');assert.equal(status[1].label,'Its copy may use the last use');assert.equal(status[2].state,'blocked');
  assert.equal(JSON.stringify(run),before);
  run.mountedCards[1].charges=5;assert.equal(states(run)[2],'ready');
  assert.deepEqual(states(build(['body-spark','refrain','refrain'])),['ready','ready','shared']);
  assert.deepEqual(states(build(['rhythm','rhythm'])),['ready','shared']);
});

test('cache is one-build bounded and ignores transient conditions and reserve size',()=>{
  const run=build(['body-spark','prism-lens']);const first=getEquippedCardStatuses(run);
  run.flame=0;run.cooldown=900;run.reserveCards=Array.from({length:1000},(_,i)=>makeSkillCard('body-spark','reserve:'+i));
  assert.equal(getEquippedCardStatuses(run),first);
  run.mountedCards[0].rank=2;assert.notEqual(getEquippedCardStatuses(run),first);
  const second=getEquippedCardStatuses(run);run.skills={'collector-last-orbit':1};assert.notEqual(getEquippedCardStatuses(run),second);
});

test('equipped UI exposes status and help without judging reserve or nesting compact buttons',()=>{
  const state=createCardInspectorState(new URLSearchParams('slots=5'));
  const equipped=cardsBenchMarkup(state);
  assert.equal((equipped.match(/data-card-status-help/g)||[]).length,5);
  assert.match(equipped,/4\/6/);
  const reader=cardsBenchMarkup(state,{browsing:true,inspecting:true,selectedId:'sample:0'});
  assert.match(reader,/card-read-config/);assert.match(reader,/data-card-status-help/);
  const reserve=cardsBenchMarkup(state,{browsing:true,inspecting:true,selectedId:'sample:stored:0'});
  assert.doesNotMatch(reserve,/card-read-config|data-card-status-help/);
  const compact=cardFace(state.run.mountedCards[1],{compact:true,status:getEquippedCardStatuses(state.run)[1]});
  assert.doesNotMatch(compact,/<button/);assert.match(compact,/card-config-compact/);
});
