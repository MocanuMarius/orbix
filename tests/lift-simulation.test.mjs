// The Chain tab's simulated Lift (owner request 2026-11-18): one Lift as flight.mjs resolves it - a falling Lift (downbeat-lift) or a
// plain one (plain-lift), then guide-lift when it was on the Lift Guide cue - with its 3-Spark cost stated, so the net is honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSkillCard, createCardExecution, resolveCardRow} from '../dist/skill-cards.mjs';
import {resolveChain, solveTrigger, triggersFor, liftOptions, LIFT_KIND, LIFT_COST, hereLine} from '../dist/ui/chain-model.mjs';

const row = list => list.map((id, i) => id ? makeSkillCard(id, `lf${i}:${id}`) : null);
const ins = ids => ids.map(id => id ? {id} : null);
const METER = {meterFraction: 0.2};
/** The real flight order on one runtime: the Lift event, then the cue event. */
function realLift(list, inscriptions, {falling = true, cue = true} = {}) {
  const run = createCardExecution(inscriptions ? {cards: row(list), inscriptions: ins(inscriptions)} : row(list));
  let sparks = resolveCardRow(run, {...METER, kind: falling ? 'downbeat-lift' : 'plain-lift'}).sparks;
  if (cue) sparks += resolveCardRow(run, {...METER, kind: 'guide-lift'}).sparks;
  return sparks;
}
const sim = (list, inscriptions, opts) => solveTrigger(row(list), LIFT_KIND, inscriptions ? ins(inscriptions) : null, opts);

test('Lift joins the Chain triggers when a mounted card listens to a Lift, and replaces the falling-Lift entry', () => {
  const kinds = triggersFor(row(['lift-guide', 'downbeat'])).map(t => t.kind);
  assert.ok(kinds.includes(LIFT_KIND));
  assert.ok(!kinds.includes('downbeat-lift'), 'one Lift entry, not two');
  assert.ok(!triggersFor(row(['body-spark'])).some(t => t.kind === LIFT_KIND), 'no Lift card: no Lift entry');
  assert.deepEqual(triggersFor(row(['body-spark'])).map(t => t.kind), ['body-spark']);
});

test('the simulated Lift pays what a real-flight Lift pays: Lift Guide, a Kindled slot, Echo', () => {
  for (const [name, list, inscriptions] of [
    ['Lift Guide + Downbeat', ['lift-guide', 'downbeat'], null],
    ['Kindled Body Spark', ['body-spark', 'lift-guide'], ['kindled', null]],
    ['Echo of Downbeat', ['echo', 'downbeat'], null],
  ]) for (const falling of [true, false]) for (const cue of [true, false]) {
    const s = sim(list, inscriptions, {falling, cue});
    assert.equal(s.sparks, realLift(list, inscriptions, {falling, cue}), `${name} falling=${falling} cue=${cue}`);
    assert.equal(s.lift.cost, LIFT_COST);
    assert.equal(s.lift.net, s.sparks - LIFT_COST);
  }
  // The pieces behave as the owner described.
  assert.equal(sim(['lift-guide'], null, {cue: true}).sparks, 1, 'Lift Guide pays on the cue');
  assert.equal(sim(['lift-guide'], null, {cue: false}).sparks, 0, 'and not off the cue');
  assert.ok(sim(['body-spark'], ['kindled'], {falling: false, cue: false}).sparks > 0, 'Kindled fires on a plain Lift');
  assert.equal(sim(['body-spark'], null, {}).sparks, 0, 'a Collect card with no Kindled does not fire on a Lift');
  assert.ok(sim(['echo', 'downbeat'], null, {falling: true, cue: false}).sparks > sim(['downbeat'], null, {falling: true, cue: false}).sparks, 'Echo repeats Downbeat');
});

test('the Chain offers only the Lift choices a mounted card needs, and the net line is true', () => {
  assert.deepEqual(liftOptions(row(['lift-guide'])), {falling: false, cue: true});
  assert.deepEqual(liftOptions(row(['downbeat'])), {falling: true, cue: false});
  assert.deepEqual(liftOptions(row(['echo', 'downbeat'])), {falling: true, cue: false});
  assert.deepEqual(liftOptions(row(['body-spark'])), {falling: false, cue: false});
  const list = row(['lift-guide', 'downbeat']), ctx = resolveChain(list, LIFT_KIND);
  assert.equal(ctx.trigger, LIFT_KIND);
  assert.equal(ctx.sol.sparks, 3);
  assert.deepEqual({cost: ctx.lift.cost, net: ctx.lift.net}, {cost: 3, net: 0});
  const off = resolveChain(list, LIFT_KIND, null, {liftCue: false, liftFalling: false});
  assert.equal(off.sol.sparks, 0);
  assert.equal(off.lift.net, -3);
  assert.match(hereLine(off, list[1]), /waits for Lift while falling/i);
});
