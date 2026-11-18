import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS} from '../dist/skill-cards.mjs';
import {STRIP, STRIP_KEY, STRIP_VARIANTS, chainView, collectReceiptFires, engineFire, createChainStrip, resolveStripVariant} from '../dist/chain-strip.mjs';
import {VARIANT_GEOMETRY, variantEntries, variantWidth, sparkNumber, threadTravel} from '../dist/chain-strip-variants.mjs';

const common = Object.values(SKILL_CARDS).find(d => d.rarity === 'common' && !d.passive && d.kind !== 'capacity');
const mk = (def, i) => def ? {cardId: def.id, instanceId: `c${i}`} : null;
const rt = (list, inscriptions = []) => ({cards: list.map(mk), inscriptions});
const snap = (r, extra = {}) => ({cardChain: chainView(r), cardCharges: {}, cardFires: [], ...extra});
let seq = 0;
const mark = (slot, kind = 'fire', amount) => ({seq: ++seq, slot, kind, ...(amount ? {amount} : {})});
const ready = r => { const s = createChainStrip(); s.sync(snap(r), 0); return s; };

test('?strip= picks the variant; the hidden setting is the fallback; anything else is A', () => {
  assert.deepEqual([...STRIP_VARIANTS], ['a', 'b', 'c']);
  const store = v => ({getItem: k => k === STRIP_KEY ? v : null});
  assert.equal(resolveStripVariant('', store(null)), 'a');
  assert.equal(resolveStripVariant('?strip=b', store(null)), 'b');
  assert.equal(resolveStripVariant('?x=1&strip=c', store('b')), 'c', 'the URL beats the setting');
  assert.equal(resolveStripVariant('', store('b')), 'b');
  assert.equal(resolveStripVariant('?strip=z', store('c')), 'c', 'an unknown value falls through to the setting');
  assert.equal(resolveStripVariant('?strip=z', store('q')), 'a');
  assert.equal(resolveStripVariant('', {getItem() { throw new Error('private mode'); }}), 'a');
});

test('B draws mounted cards and Inscription-only diamonds in slot order and skips empty slots; C draws every slot', () => {
  const s = ready(rt([common, null, null, common, null], [null, null, {id: 'gilded'}, null, null]));
  const b = variantEntries('b', s), c = variantEntries('c', s);
  assert.deepEqual(b.map(e => [e.slot, e.type]), [[0, 'card'], [2, 'ghost'], [3, 'card']]);
  assert.deepEqual(c.map(e => [e.slot, e.type]), [[0, 'card'], [1, 'empty'], [2, 'ghost'], [3, 'card'], [4, 'empty']]);
  assert.equal(s.cells.length, 2, 'A still draws only the two mounted cards (same cells as before)');
});

test('widths for 1 to 5 slots stay narrow enough for the top row', () => {
  const g = VARIANT_GEOMETRY;
  for (let n = 1; n <= 5; n++) {
    const s = ready(rt(Array(n).fill(common)));
    const wb = variantWidth('b', variantEntries('b', s)), wc = variantWidth('c', variantEntries('c', s), s.slotCount);
    assert.equal(wb, n * g.b.cellW + (n - 1) * g.b.gap); assert.equal(wc, n * g.c.pitch - (g.c.pitch - g.c.pip));
    assert.ok(wb + 2 * STRIP.padX <= 160 && wc + 2 * STRIP.padX <= 100);
  }
  assert.equal(variantWidth('b', []), 0); assert.equal(variantWidth('c', []), 0);
});

test('an Inscription-only slot reacts to its bar mark (and only to a bar mark), for B and C alike', () => {
  const s = ready(rt([common, null], [null, {id: 'gilded'}]));
  assert.equal(s.ghosts.length, 1); assert.equal(s.ghosts[0].slot, 1);
  s.fire([mark(1, 'fire')], 10); assert.equal(s.ghosts[0].barSerial, 0, 'a fire mark on a slot with no card is not a bar');
  s.fire([mark(1, 'bar')], 20); assert.equal(s.ghosts[0].barSerial, 1);
  assert.equal(s.playing, null, 'it never enters the flash queue');
  const same = s.ghosts[0]; s.sync(snap(rt([common, null], [null, {id: 'gilded'}])), 30); assert.equal(s.ghosts[0], same, 'a rebuilt-identical layout keeps the record');
  s.sync(snap(rt([common, common], [null, {id: 'gilded'}])), 40); assert.equal(s.ghosts.length, 0, 'mounting a card there removes the diamond');
});

test('the queue rule is shared: sequential 0.7 s flashes, one pending per card, extras dropped, amounts kept per flash', () => {
  const s = ready(rt([common, common, common, common]));
  s.fire([mark(0, 'fire', 4), mark(1, 'fire', 2), mark(1, 'fire', 9), mark(0, 'fire', 7), mark(2)], 1000);
  assert.equal(s.playing, s.cells[0]); assert.equal(s.cells[0].amount, 4, 'the first firing of a card sets its number');
  assert.deepEqual(s.pending.map(c => c.slot), [1, 2], 'a second firing of a waiting or flashing card is dropped');
  s.advance(1700); assert.equal(s.playing, s.cells[1]); assert.equal(s.cells[1].amount, 2, 'the dropped 9 never replaces the 2');
  assert.equal(s.cells[1].startedAt, 1700);
  s.advance(2400); assert.equal(s.playing, s.cells[2]); assert.equal(s.cells[2].amount, 0);
  s.advance(3100); assert.equal(s.playing, null);
});

test('C: the spark runs forward from the left, and back along the return line when the Chain loops to an earlier or the same slot', () => {
  const s = ready(rt([common, common, common, common]));
  s.fire([mark(0), mark(2), mark(1)], 0);
  s.advance(0); const first = {...s.cells[0]}; assert.equal(threadTravel(first).back, false); assert.equal(threadTravel(first).fromX, 0);
  s.advance(700); const second = s.cells[2], t2 = threadTravel(second); assert.equal(second.from, 0); assert.equal(t2.back, false);
  assert.equal(t2.toX, 2 * VARIANT_GEOMETRY.c.pitch + VARIANT_GEOMETRY.c.pip / 2);
  s.advance(1400); const third = s.cells[1], t3 = threadTravel(third); assert.equal(third.from, 2); assert.equal(t3.back, true, 'slot 1 after slot 2 loops back');
  assert.equal(t3.fromX, 2 * VARIANT_GEOMETRY.c.pitch + VARIANT_GEOMETRY.c.pip / 2);
  assert.ok(t3.ms <= VARIANT_GEOMETRY.c.maxTravelMs && t3.ms < STRIP.flashMs, 'the travel always fits inside the 0.7 s flash window');
  s.advance(2100); s.fire([mark(1)], 2100); assert.equal(s.cells[1].from, 1); assert.equal(threadTravel(s.cells[1]).back, true, 'a Timer repeating its own slot also returns');
});

test('B: the floating number is a whole "+N", brief, and absent when the firing had no amount', () => {
  assert.equal(sparkNumber(3), '+3'); assert.equal(sparkNumber(2.6), '+3'); assert.equal(sparkNumber(0.2), ''); assert.equal(sparkNumber(undefined), '');
  assert.equal(sparkNumber(12345), '+999', 'at most three digits');
  assert.ok(VARIANT_GEOMETRY.b.numMs <= 600 && VARIANT_GEOMETRY.b.popMs <= 500);
});

test('marks carry an amount only when the receipt or engine entry has one (so older marks are unchanged)', () => {
  assert.deepEqual(engineFire({k: 'fired', slot: 2}), {slot: 2, kind: 'fire', double: false});
  assert.deepEqual(engineFire({k: 'gain', slot: 1, amount: 5}), {slot: 1, kind: 'fire', double: false, amount: 5});
  const marks = collectReceiptFires({event: {kind: 'body-spark'}, steps: [{success: true, slot: 0, operation: 'add-sparks', amount: 3}, {success: true, slot: 1, operation: 'multiply'}]}, []);
  assert.equal(marks[0].amount, 3); assert.equal('amount' in marks[1], false);
});
