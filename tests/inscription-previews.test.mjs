// The Chain tab, card status and combo previews must show what a real flight pays, Inscriptions included.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSkillCard, createCardExecution, resolveCardRow} from '../dist/skill-cards.mjs';
import {slotInscriptionList} from '../dist/inscriptions.mjs';
import {resolveChain, solveTrigger, START_FLAME, METER_MAX} from '../dist/ui/chain-model.mjs';
import {deckScreenMarkup, createDeckView} from '../dist/ui/deck-screen.mjs';

const cards = ids => ids.map((id, i) => id ? makeSkillCard(id, `p${i}`) : null);
const run = (ids, inscriptions) => ({id: 'pv', cardSlots: ids.length, mountedCards: cards(ids), reserveCards: [], slotInscriptions: inscriptions.map(id => id ? {id} : null)});
const real = (r, kind) => resolveCardRow(createCardExecution({cards: r.mountedCards, inscriptions: slotInscriptionList(r)}),
  {kind, pickupKind: 'light', meterFraction: START_FLAME / METER_MAX}).sparks;

const CASES = [
  [['body-spark', null, null], ['gilded', null, null], 'body-spark'],
  [['body-spark', null, null], ['twin-mark', null, null], 'body-spark'],
  [['echo', 'body-spark', null], [null, 'twin-mark', null], 'body-spark'],
  [['rhythm', null, null], ['gilded', null, null], 'rhythm'],
  [['body-spark', null, null], [null, 'hollow', null], 'body-spark'],
  [['body-spark', 'echo', null], [null, null, 'mirror'], 'body-spark'],
];

test('Chain preview totals equal the engine result for chains with Inscriptions', () => {
  for (const [ids, ins, kind] of CASES) {
    const r = run(ids, ins), list = slotInscriptionList(r);
    assert.equal(solveTrigger(r.mountedCards, kind, list).sparks, real(r, kind), `${ids} / ${ins} on ${kind}`);
    const chain = resolveChain(r.mountedCards, kind, list);
    if (chain.trigs.some(t => t.kind === kind)) assert.equal(chain.sol.sparks, real(r, kind));
  }
});

test('a Gilded slot lifts the preview: Body Spark +2 becomes more than the bare card', () => {
  const bare = run(['body-spark', null, null], [null, null, null]), gilded = run(['body-spark', null, null], ['gilded', null, null]);
  const a = resolveChain(bare.mountedCards, 'body-spark', slotInscriptionList(bare)).sol.sparks;
  const b = resolveChain(gilded.mountedCards, 'body-spark', slotInscriptionList(gilded)).sol.sparks;
  assert.equal(b, a + 2);
  const html = deckScreenMarkup({...gilded, cardSlots: 3}, createDeckView(), {});
  assert.match(html, new RegExp(`data-result="${b}"`));
});
