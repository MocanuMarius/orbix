// The Chain screen's reader said "Slot 3: no effect on Collect, because it does not act on Collect" for Dusk Wick II, a card
// that works. A card with a condition on its Trigger (a Dusk Spark, a Cluster, the first Spark of a Pulse, a low meter, a
// busy Collector) waits for a Spark that meets it; that is not a mistake. This walks the whole live catalogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_CARDS, makeSkillCard, getCardRowRule } from '../dist/skill-cards.mjs';
import { resolveChain, hereLine, slotInfo, TRIGGERS, whenOf } from '../dist/ui/chain-model.mjs';
import { getEquippedCardStatuses } from '../dist/card-status.mjs';
import { makeRun } from '../scripts/balance/real-flight-check.mjs';

const live = Object.values(SKILL_CARDS).filter(d => !d.retired && !d.unreleased);
const card = (id, n = 0) => makeSkillCard(id, `cs:${n}:${id}`);
/** Boosts and Repeats have nothing to act on alone; that warning is honest. */
const isBoostOrRepeat = d => ['echo', 'chameleon', 'refrain'].includes(d.kind) || ['*'].includes(getCardRowRule(d, d)?.event);

test('Dusk Wick II in Slot 3: the reader says when it fires, with no warning', () => {
  const row = [card('body-spark', 0), card('lift-guide', 1), card('dusk-wick-ii', 2)];
  const ctx = resolveChain(row, 'body-spark');
  assert.equal(ctx.trigger, 'body-spark');
  assert.equal(ctx.infos[2].kind, 'waits');
  assert.equal(ctx.infos[2].plate, 'Waits for Dusk Spark');
  assert.equal(hereLine(ctx, row[2]), 'Slot 3: fires when you Collect a Dusk Spark: adds 30.');
  assert.ok(!/no effect/i.test(hereLine(ctx, row[2])));
});

test('Echo and a Boost next to a conditional card read as waiting for the same Spark, not as misplaced', () => {
  const echo = [card('echo'), card('dusk-wick-ii', 1)], c = resolveChain(echo, 'body-spark');
  assert.deepEqual(c.infos.map(i => i.kind), ['waits', 'waits']);
  assert.match(hereLine(c, echo[0]), /fires when you Collect a Dusk Spark: repeats Dusk Wick II/);
  const boost = [card('dusk-wick-ii'), card('crescendo', 1)], b = resolveChain(boost, 'body-spark');
  assert.deepEqual(b.infos.map(i => i.kind), ['waits', 'waits']);
  assert.match(hereLine(b, boost[1]), /multiplies the running total by ×2/);
});

test('the Trigger tabs list Collect for a chain whose only Collect card is conditional', () => {
  const ctx = resolveChain([card('dusk-wick')], null);
  assert.ok(ctx.trigs.some(t => t.kind === 'body-spark'));
  assert.equal(ctx.trigger, 'body-spark');
});

test('conditional wording: Cluster, Pulse, Delivery, Collector time', () => {
  const line = (id, kind, extra = []) => { const row = [card(id), ...extra]; const c = resolveChain(row, kind); return hereLine(c, row[0]); };
  assert.equal(line('cluster-heart', 'body-spark'), 'Slot 1: fires when you Collect a Cluster: adds 6.');
  assert.match(line('first-ripple', 'wave-crossing'), /^Slot 1: fires when a Pulse crosses the first Spark it reaches: adds 4\.$/);
  assert.match(line('crate-lining', 'collector-delivery'), /^Slot 1: fires when Collector delivers a Cache: adds 8\.$/);
  assert.match(line('fast-spool', 'body-spark'), /^Slot 1: fires when you Collect, but only while the Collector is reeling a Spark in: saves Collector time\.$/);
});

test('cards that wait for a Trigger without a tab (Flare ends, Latch) wait; they are not "no effect"', () => {
  for (const id of ['diving-bell', 'return-spring']) {
    const row = [card(id)], c = resolveChain(row, 'body-spark');
    assert.equal(c.infos[0].kind, 'waits', id);
    assert.match(hereLine(c, row[0]), /waits for (a Flare ending|Latch)/);
  }
});

test('every live card, alone in Slot 1, on every Trigger it can hear: no "no effect" unless it is a Boost or Repeat with nothing to act on', () => {
  const bad = [];
  for (const d of live) {
    const c = card(d.id), rule = getCardRowRule(d, c);
    if (isBoostOrRepeat(d) || ['multiply', 'add-last-payout'].includes(rule?.operation) || d.kind === 'chameleon') continue;
    const kinds = new Set([...TRIGGERS.map(t => t.kind)]);
    for (const k of kinds) {
      // Judge a card on the Trigger it listens to (a card on another Trigger is "waits" or the screen shows its own tab).
      const ctx = resolveChain([c], k), info = ctx.infos[0];
      if (info.kind === 'idle') bad.push(`${d.id} on ${k}: ${hereLine(ctx, c)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('every live card, alone in Slot 1: the equipped-card status never says "Can\'t fire in this chain" (Collector build)', () => {
  const bad = [];
  for (const d of live) {
    const run = makeRun([d.id]); run.companions = ['collector']; run.companionRole = 'collector';
    const st = getEquippedCardStatuses(run)[0];
    if (st?.code === 'no-effect') bad.push(`${d.id}: ${st.reason}`);
  }
  assert.deepEqual(bad, []);
});
