// JOB I (2026-11-18): Inscriptions never add extra growth or Stored Sparks; inscriptionOnCard names the true outcome of every pairing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly } from '../scripts/balance/real-flight-check.mjs';
import { LIVE_CARDS, makeSkillCard, createCardExecution, resolveCardRow, CARD_ROW_EVENTS } from '../dist/skill-cards.mjs';
import { INSCRIPTION_IDS } from '../dist/inscriptions.mjs';
import { inscriptionOnCard, inscriptionEffect } from '../dist/inscription-on-card.mjs';

const fire = (ids, inscriptions, kind, extra = {}) => {
  const cards = ids.map((id, i) => id ? makeSkillCard(id, `i${i}`) : null);
  const ex = createCardExecution({ cards, inscriptions: inscriptions.map(id => id ? { id } : null) });
  const receipt = resolveCardRow(ex, { kind, meterFraction: .5, heartsLeft: 2, ...extra });
  return { receipt, cards: ex.cards };
};

test('Wind Feather and Growth Ring grow once per Finish whatever the slot Inscription says', () => {
  for (const [card, key] of [['wind-feather', 'cruisingSpeed'], ['growth-ring', 'tallyCapacity']]) {
    for (const ins of INSCRIPTION_IDS) {
      const clear = fire([card], [ins], CARD_ROW_EVENTS.clear), r = clear.receipt;
      assert.equal(clear.cards[0].tally, 1, `${card} + ${ins}: +1 at Finish`);
      for (const kind of [CARD_ROW_EVENTS.lift, CARD_ROW_EVENTS.plainLift, CARD_ROW_EVENTS.wave, CARD_ROW_EVENTS.delivery, CARD_ROW_EVENTS.overfill, CARD_ROW_EVENTS.flash, CARD_ROW_EVENTS.body]) {
        const x = fire([card], [ins], kind, { firstCrossing: true });
        assert.equal(x.cards[0].tally || 0, 0, `${card} + ${ins} on ${kind}: no growth`);
        assert.equal(x.receipt.stored, 0);
      }
    }
  }
  // Mirror with a left neighbour that fires
  const m = fire(['finish-flag', 'wind-feather'], [null, 'mirror'], CARD_ROW_EVENTS.clear);
  assert.equal(m.cards[1].tally, 1);
});

test('Stored Sparks payouts are paid once: Twin Mark and "also fires" Inscriptions add none (Home Beacon, Finish Flag, Meter Mark)', () => {
  for (const [card, kind, stored] of [['home-beacon', CARD_ROW_EVENTS.clear, 6], ['finish-flag', CARD_ROW_EVENTS.clear, 2], ['meter-mark', CARD_ROW_EVENTS.overfill, 1]]) {
    const base = fire([card], [null], kind).receipt.stored;
    assert.ok(base > 0, `${card} pays`);
    for (const ins of ['twin-mark', 'kindled', 'resonant', 'courier', 'wellspring', 'flare', 'gilded', 'brimful']) assert.equal(fire([card], [ins], kind).receipt.stored, base, `${card} + ${ins}`);
    for (const ins of ['kindled', 'resonant', 'courier', 'wellspring', 'flare']) for (const other of [CARD_ROW_EVENTS.lift, CARD_ROW_EVENTS.plainLift, CARD_ROW_EVENTS.wave, CARD_ROW_EVENTS.delivery, CARD_ROW_EVENTS.body]) assert.equal(fire([card], [ins], other).receipt.stored, 0, `${card} + ${ins} on ${other}`);
  }
});

test('real flights: Kindled, Twin Mark and Gilded on Wind Feather and Growth Ring give exactly +1 per cleared flight', () => {
  for (const card of ['wind-feather', 'growth-ring']) for (const ins of ['kindled', 'twin-mark', 'gilded']) {
    const f = fly({ ids: [card], inscriptions: [ins], seedIndex: 0 }), tally = f.log.engine.cardExecution?.cards?.[0]?.tally || 0;
    assert.equal(tally, f.record.success ? 1 : 0, `${card} + ${ins}: tally ${tally}, cleared ${f.record.success}`);
  }
});

test('every released card x every Inscription returns a true sentence; "no effect" pairs change nothing in the solver', () => {
  const EVENTS = Object.values(CARD_ROW_EVENTS);
  let none = 0;
  for (const def of LIVE_CARDS) for (const id of INSCRIPTION_IDS) {
    const card = makeSkillCard(def.id, 'x'), sentence = inscriptionOnCard(id, card), eff = inscriptionEffect(id, card);
    assert.match(sentence, /^[^:]+: .{8,}/, `${def.id} + ${id}`);
    if (eff.works || def.engine || eff.text.includes('empty slot')) continue;
    // no effect: same Sparks/Stored/growth with and without the Inscription, for every event (card alone and with a left neighbour)
    for (const kind of EVENTS) for (const row of [[def.id], ['body-spark', def.id]]) {
      const slot = row.length - 1, a = fire(row, [], kind, { firstCrossing: true }), ins = row.map((_, i) => i === slot ? id : null), b = fire(row, ins, kind, { firstCrossing: true });
      const sig = r => JSON.stringify({ s: r.receipt.sparks, st: r.receipt.stored, c: r.receipt.futureCapacity, sp: r.receipt.cruisingSpeed, t: r.cards[slot]?.tally || 0, u: r.cards[slot]?.charges });
      assert.equal(sig(b), sig(a), `${def.id} + ${id} says no effect but changed ${kind}`); none++;
    }
  }
  assert.ok(none > 200);
});
