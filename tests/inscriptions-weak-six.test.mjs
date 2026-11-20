// 2026-11-20: the six weak Inscriptions get their approved change (outputs/balance/inscriptions.md). One focused test each, plus
// one real-flight runaway check for the two where a loop is conceivable (Wellspring with an Overfill Pulse card, Sunlit with a Pulse card).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';
import { makeSkillCard, createCardExecution, resolveCardRow, CARD_ROW_EVENTS } from '../dist/skill-cards.mjs';
import { getInscription, emberBedStored } from '../dist/inscriptions.mjs';
import { inscriptionOnCard } from '../dist/inscription-on-card.mjs';

const exec = (ids, inscriptions) => createCardExecution({ cards: ids.map((id, i) => id ? makeSkillCard(id, `i${i}`) : null), inscriptions: inscriptions.map(id => id ? { id } : null) });
const sparksOf = (ex, event) => resolveCardRow(ex, { meterFraction: .5, heartsLeft: 2, pickupKind: 'light', ...event }).sparks;
const text = (ins, card) => inscriptionOnCard(ins, makeSkillCard(card, 'x'));

test('Courier: also fires on every 3rd Collect of the flight (a Pulse card pays on Collects 3 and 6), and on a Delivery', () => {
  const ex = exec(['harvest-common'], ['courier']);
  const paid = Array.from({ length: 7 }, () => sparksOf(ex, { kind: CARD_ROW_EVENTS.body }));
  assert.deepEqual(paid.map(n => n > 0), [false, false, true, false, false, true, false]);
  assert.ok(sparksOf(exec(['harvest-common'], ['courier']), { kind: CARD_ROW_EVENTS.delivery }) > 0, 'a Delivery still fires it');
  assert.equal(sparksOf(exec(['harvest-common'], ['courier']), { kind: CARD_ROW_EVENTS.body }), 0, 'a new flight starts the count over');
  assert.equal(sparksOf(exec(['harvest-common'], []), { kind: CARD_ROW_EVENTS.body }), 0);
  assert.match(text('courier', 'harvest-common'), /also fires on a Delivery and every 3rd Collect.*starts over each flight/);
  assert.match(text('courier', 'body-spark'), /also fires on a Delivery:/);
  assert.equal(getInscription('courier').text, 'Also fires on a Delivery and every 3rd Collect.');
});

test('Wellspring: the card fires 3 times on each Overfill (row card and engine card), and says so', () => {
  const one = sparksOf(exec(['body-spark'], []), { kind: CARD_ROW_EVENTS.body });
  assert.equal(sparksOf(exec(['body-spark'], ['wellspring']), { kind: CARD_ROW_EVENTS.overfill }), 3 * one);
  assert.equal(sparksOf(exec(['body-spark'], ['wellspring']), { kind: CARD_ROW_EVENTS.body }), one, 'its own Collect is unchanged');
  assert.match(text('wellspring', 'body-spark'), /^Wellspring: also fires on an Overfill, 3 times: /);
  assert.match(text('wellspring', 'ember-bell'), /^Wellspring: fires 3 times on each Overfill: /);
  assert.equal(getInscription('wellspring').text, 'Fires 3 times on each Overfill.');
});

test('Sunlit: also fires once on each Pulse of a Flare, and on a Flare Collect; a plain Flare card does not fire on the Pulse', () => {
  const one = sparksOf(exec(['body-spark'], []), { kind: CARD_ROW_EVENTS.body });
  assert.equal(sparksOf(exec(['body-spark'], ['flare']), { kind: CARD_ROW_EVENTS.flash, flarePulse: true }), one, 'one firing per Flare Pulse');
  assert.equal(sparksOf(exec(['body-spark'], ['flare']), { kind: CARD_ROW_EVENTS.flash }), one, 'the Flare Collect still fires it');
  assert.equal(sparksOf(exec(['flash-handling'], []), { kind: CARD_ROW_EVENTS.flash, flarePulse: true }), 0, 'a card with no Sunlit never hears a Flare Pulse');
  assert.ok(sparksOf(exec(['flash-handling'], ['flare']), { kind: CARD_ROW_EVENTS.flash, flarePulse: true }) > 0);
  assert.match(text('flare', 'body-spark'), /also fires on a Flare Collect and on each Pulse of a Flare/);
  assert.match(text('flare', 'flash-handling'), /^Sunlit: also fires on each Pulse of a Flare/);
});

test('Brimful: each spilled Spark becomes 2 Stored Sparks (flat), and says so', () => {
  assert.equal(getInscription('brimful').storedPerSpill, 2);
  assert.equal(getInscription('brimful').text, 'Each Spark above the Meter becomes 2 Stored Sparks.');
  assert.match(text('brimful', 'body-spark'), /each Spark above the Meter becomes 2 Stored Sparks/);
  const r = resolveCardRow(exec(['body-spark'], ['brimful']), { kind: CARD_ROW_EVENTS.body, meterFraction: 1, pickupKind: 'light' });
  assert.ok(r.brimful > 0 && r.stored === 0, 'the receipt reports the Sparks; the flight converts the spill');
});

test('Whetted: +2 uses each flight', () => {
  assert.equal(getInscription('whetted').uses, 2);
  assert.equal(getInscription('whetted').text, '+2 uses each flight.');
  assert.match(text('whetted', 'spark-cache'), /\+2 uses each flight/);
  assert.match(text('whetted', 'body-spark'), /no effect/);
});

test('Ember Bed: Finish pays 5 Stored Sparks plus 2 per empty slot, and says so', () => {
  const ex = exec(['body-spark', null, null, null], [null, 'ember-bed']);
  assert.equal(emberBedStored(ex, ex.cards), 5 + 2 * 3);
  assert.equal(resolveCardRow(ex, { kind: 'flight-clear', carriedStored: 0, cruisingSpeedRoom: 6 }).stored, 11);
  const full = exec(['body-spark', 'body-spark'], [null, 'ember-bed']);
  assert.equal(emberBedStored(full, full.cards), 5);
  assert.equal(getInscription('ember-bed').text, 'Finish: +5 Stored Sparks, +2 per empty slot.');
});

const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
const run = (ids, inscriptions) => levels.map((l, i) => fly({ ids, inscriptions, levelId: l.id, seedIndex: i, flare: true, engineOptions: { cardPilot: true } }));

test('runaway check: Wellspring on Ember Bell (Overfill Pulse card) beside a Spark Chime ends without an engine safety stop', () => {
  for (const f of run(['ember-bell', 'spark-chime'], ['wellspring'])) {
    const log = f.log.engine.cardEngine?.log || [];
    assert.equal(log.filter(x => x.k === 'halt').length, 0, 'no safety stop');
    assert.ok(log.length < 20000, `engine log stays small (${log.length})`);
  }
});

test('runaway check: Sunlit on a Pulse card with a Flare in the flight stays bounded', () => {
  for (const f of run(['harvest-common'], ['flare'])) {
    assert.ok((f.log.firings || []).length < 3000, `firings ${(f.log.firings || []).length}`);
  }
});
