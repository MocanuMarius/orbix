// Batch 4: Chameleon (two) and Whetstone. Both unreleased and without pictures.
// Chameleon (two) is a separate card id so the live Chameleon stays exactly as it is until release.
import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {SKILL_CARDS, LIVE_CARDS, makeSkillCard, createCardExecution, resolveCardRow, hasCardRowEvent, isUnofferedCard,
  describeSkillCard} from '../dist/skill-cards.mjs';
import {CardEngine, createMeterHost, playerEvent} from '../dist/card-engine.mjs';

const row = list => list.map((id, i) => id ? makeSkillCard(id, `b4:${i}`) : null);
const canvas = {getContext: () => ({setTransform() {}}), getBoundingClientRect: () => ({width: 900, height: 430})};
const rig = (ids, meter = {start: 0, max: Infinity}) => {
  const runtime = createCardExecution(row(ids)), host = createMeterHost(meter); host.runtime = runtime;
  const engine = new CardEngine(runtime, host);
  return {engine, host, runtime, at: (kind, t, detail) => playerEvent(engine, host, kind, detail, t)};
};

test('the batch is in the catalog, unreleased and never offered; the live Chameleon is untouched', () => {
  for (const id of ['chameleon-two', 'whetstone']) {
    assert.equal(SKILL_CARDS[id].unreleased, true, id);
    assert.ok(isUnofferedCard(id) && !LIVE_CARDS.includes(SKILL_CARDS[id]), id);
    assert.equal(SKILL_CARDS[id].ruleBands.length, 2, id);
  }
  assert.equal(SKILL_CARDS['chameleon-two'].name, 'Chameleon');
  assert.equal(SKILL_CARDS['chameleon-two'].trigger, 'next');
  assert.equal(SKILL_CARDS['chameleon-two'].ruleBands[1].text, 'Fires the card to its right on any Trigger');
  assert.match(SKILL_CARDS['chameleon-two'].help, /replace the old Chameleon/);
  assert.equal(SKILL_CARDS.whetstone.rarity, 'rare'); assert.equal(SKILL_CARDS.whetstone.trigger, 'engine-skim');
  const old = SKILL_CARDS.chameleon;
  assert.ok(!old.unreleased && old.ruleBands[1].text === 'Acts as the next card', 'the live Chameleon keeps its rule');
});

test('Chameleon (two) fires the card to its right on any Trigger, spending its uses', () => {
  const wave = {kind: 'wave-crossing'}, lift = {kind: 'downbeat-lift'};
  const plain = createCardExecution(row(['body-spark']));
  assert.equal(resolveCardRow(plain, wave).sparks, 0, 'a Collect card ignores a Pulse on its own');
  assert.equal(hasCardRowEvent(plain, lift.kind), false);
  const runtime = createCardExecution(row(['chameleon-two', 'body-spark']));
  assert.equal(hasCardRowEvent(runtime, lift.kind), true, 'the Chain hears any Trigger for it');
  const amount = SKILL_CARDS['body-spark'].amount;
  assert.equal(resolveCardRow(runtime, wave).sparks, amount, 'fires on a Pulse');
  assert.equal(resolveCardRow(runtime, lift).sparks, amount, 'fires on a Lift');
  assert.equal(resolveCardRow(runtime, {kind: 'flight-clear'}).sparks, 0, 'never on Finish');
  const limited = createCardExecution(row(['chameleon-two', 'crate-lining'])), cap = limited.cards[1].charges;
  assert.ok(resolveCardRow(limited, {...wave, pickupKind: 'cache'}).sparks > 0); assert.equal(limited.cards[1].charges, cap - 1, 'spends the right card’s use');
});

test('Chameleon (two) cannot loop: it skips engine, copying and × cards and is walked once, left to right', () => {
  for (const next of ['slow-wick', 'metronome', 'chameleon', 'echo', 'prism-lens']) {
    const runtime = createCardExecution(row(['chameleon-two', next, 'body-spark']));
    const r = resolveCardRow(runtime, {kind: 'wave-crossing'});
    assert.equal(r.steps.filter(s => s.slot === 0 && s.success).length, 0, `${next}: nothing fired through it`);
    assert.ok(r.slotVisits <= 3 * r.passes, `${next}: one visit per slot per pass`);
  }
  const two = resolveCardRow(createCardExecution(row(['chameleon-two', 'chameleon-two', 'body-spark'])), {kind: 'wave-crossing'});
  assert.equal(two.sparks, SKILL_CARDS['body-spark'].amount, 'two Chameleons in a row do not chain: only the second one fires the Collect card, once');
  // In a flight the engine never hears it: a Timer to its right is not lit by Chameleon (two).
  const e = new WispFlight({canvas, preflight: true, seed: 'batch-4', cardPilot: true, modifiers: {cardPilot: true, cardExecution: {cards: row(['chameleon-two', 'slow-wick', 'body-spark'])}}});
  e.running = true;
  try { e.resolveCardRowEvent('wave-crossing', {}); assert.equal(e.cardEngine?.timers?.length ?? 0, 0); } finally { e.destroy(); }
});

test('Whetstone: on a Skim the card to its right regains one use, never above its starting uses', () => {
  const {engine, runtime, at} = rig(['whetstone', 'crate-lining']);
  const target = runtime.cards[1], cap = target.charges;
  target.charges = cap - 2;
  at('skim', 0); assert.equal(target.charges, cap - 1, 'one use back');
  at('skim', 1); assert.equal(target.charges, cap);
  at('skim', 2); assert.equal(target.charges, cap, 'never above the starting uses');
  assert.equal(engine.log.filter(l => l.k === 'whet').length, 2); assert.equal(engine.log.filter(l => l.k === 'whet-none').length, 1);
});

test('Whetstone does nothing for a card without uses, and nothing when it is the last card', () => {
  const none = rig(['whetstone', 'body-spark']); none.at('skim', 0);
  assert.equal(none.runtime.cards[1].charges, undefined); assert.equal(none.engine.log.filter(l => l.k === 'whet').length, 0);
  const last = rig(['crate-lining', 'whetstone']); last.runtime.cards[0].charges -= 1; const before = last.runtime.cards[0].charges;
  last.at('skim', 0); assert.equal(last.runtime.cards[0].charges, before, 'it only helps the card to its right');
  assert.match(describeSkillCard(makeSkillCard('whetstone', 'w')).effect, /regains 1 use/);
});

test('Whetstone writes a regained use into the flight use ledger', () => {
  const e = new WispFlight({canvas, preflight: true, seed: 'batch-4-ledger', cardPilot: true, modifiers: {cardPilot: true, cardExecution: {cards: row(['whetstone', 'crate-lining'])}}});
  e.running = true;
  try {
    const card = e.cardExecution.cards[1], cap = card.charges; card.charges = cap - 1; e.cardChargeLedger[card.instanceId] = card.charges;
    e.raiseEngineSkim?.();
    const host = e.cardEngine; assert.ok(host, 'engine exists for an engine card');
    host.raise('skim', {}, e.time);
    assert.equal(card.charges, cap); assert.equal(e.getCardChargeLedger()[card.instanceId], cap);
  } finally { e.destroy(); }
});

test('wording: the white triangle is a Flare everywhere a player reads it; no Flash noun is left (ids and keys keep the old word)', async () => {
  const {CARD_TERMS} = await import('../dist/card-terms.mjs');
  const {TIPS} = await import('../dist/depart-tips.mjs');
  const {TUTORIAL_TOPICS} = await import('../dist/tutorial-curriculum.mjs');
  const {INSCRIPTIONS} = await import('../dist/inscriptions.mjs').catch(() => ({}));
  const strings = [];
  for (const def of Object.values(SKILL_CARDS)) strings.push(def.name, def.help, ...(def.ruleBands || []).map(b => b.text));
  for (const value of Object.values(CARD_TERMS)) strings.push(...(Array.isArray(value) ? value : [value]).filter(v => typeof v === 'string'));
  for (const tip of TIPS) strings.push(tip.headline, tip.text);
  for (const topic of Object.values(TUTORIAL_TOPICS)) for (const step of topic.steps) strings.push(step.title, step.text);
  for (const ins of Object.values(INSCRIPTIONS || {})) strings.push(ins.name, ins.text);
  for (const text of strings.filter(Boolean)) assert.doesNotMatch(String(text), /\bFlash(es)?\b/, text);
  assert.equal(SKILL_CARDS['flash-handling'].name, 'Flare Handling');
  assert.equal(SKILL_CARDS['flash-handling'].trigger, 'flash', 'the internal trigger key is unchanged');
  assert.equal(SKILL_CARDS['flash-handling'].ruleBands[0].text, 'Collect a Flare');
});
