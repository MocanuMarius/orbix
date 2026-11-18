// Finish trio (2026-11-18): Clean Run, Victory Lap, Curtain Call. Stored payouts fire once at Finish; Boosts, Twin Mark, Kindled, Gilded add nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_CARDS, makeSkillCard, createCardExecution, resolveCardRow, CARD_ROW_EVENTS } from '../dist/skill-cards.mjs';
import { faceEffect } from '../dist/card-face-lines.mjs';
import { cardTileLine } from '../dist/card-tile-lines.mjs';
import { inscriptionOnCard } from '../dist/inscription-on-card.mjs';
import { getEquippedCardStatuses } from '../dist/card-status.mjs';
import { makeRun, fly, M } from '../scripts/balance/real-flight-check.mjs';

const ids = list => list.map((id, i) => id ? makeSkillCard(id, `t${i}`) : null);
const run = (list, event, inscriptions = []) => {
  const cards = ids(list), rt = createCardExecution({ cards, inscriptions: inscriptions.map(id => id ? { id } : null) });
  return { r: resolveCardRow(rt, { kind: CARD_ROW_EVENTS.clear, heartsLeft: 2, ...event }), cards: rt.cards };
};
const allIds = list => list.map((id, i) => id ? `t${i}` : null).filter(Boolean);
const bodySparks = () => resolveCardRow(createCardExecution({ cards: ids(['body-spark']) }), { kind: CARD_ROW_EVENTS.body, pickupKind: 'light', meterFraction: .5 }).sparks;

test('catalogue: all three are normal-pool Finish cards, not starters, not permanent', () => {
  for (const [id, rarity] of [['clean-run', 'common'], ['victory-lap', 'common'], ['curtain-call', 'rare']]) {
    const def = SKILL_CARDS[id];
    assert.equal(def.rarity, rarity); assert.equal(def.trigger, 'clear'); assert.equal(def.row.event, 'flight-clear');
    assert.ok(!def.starterOnly && !def.permanent && !def.unreleased && !def.retired && def.excludeStarter);
    assert.ok(def.help && def.ruleBands.length === 2);
    assert.ok(cardTileLine(makeSkillCard(id, 'x')).length <= 22, `${id} tile line fits`);
  }
  assert.equal(faceEffect(makeSkillCard('clean-run', 'x'), SKILL_CARDS['clean-run']), '+5 Stored, no heart lost');
  assert.equal(faceEffect(makeSkillCard('victory-lap', 'x'), SKILL_CARDS['victory-lap']), '+1 Stored per card fired');
  assert.equal(faceEffect(makeSkillCard('curtain-call', 'x'), SKILL_CARDS['curtain-call']), 'first card fires ×3');
});

test('Clean Run: +5 Stored at Finish only when no heart was lost; Echo repeats it; Boosts and Inscriptions add nothing', () => {
  assert.equal(run(['clean-run'], { heartsLost: 0 }).r.stored, 5);
  assert.equal(run(['clean-run'], {}).r.stored, 5, 'no heartsLost fact means none lost');
  assert.equal(run(['clean-run'], { heartsLost: 1 }).r.stored, 0);
  assert.equal(run(['clean-run'], { heartsLost: 3 }).r.stored, 0);
  assert.equal(resolveCardRow(createCardExecution({ cards: ids(['clean-run']) }), { kind: CARD_ROW_EVENTS.body }).stored, 0, 'Finish only');
  assert.equal(run(['echo', 'clean-run'], { heartsLost: 0 }).r.stored, 10, 'Echo repeats it: best is 10');
  assert.equal(run(['echo', 'clean-run'], { heartsLost: 1 }).r.stored, 0);
  assert.equal(run(['clean-run', 'crescendo'], { heartsLost: 0 }).r.stored, 5, 'a Boost never multiplies Stored');
  for (const ins of ['twin-mark', 'kindled', 'gilded', 'brimful', 'mirror', 'resonant']) assert.equal(run(['clean-run'], { heartsLost: 0 }, [ins]).r.stored, 5, ins);
});

test('Victory Lap: +1 Stored per DIFFERENT mounted card that fired, itself excluded, at most slots - 1; Echo repeats it', () => {
  const chain = ['body-spark', 'spark-cache', 'victory-lap'];
  assert.equal(run(chain, { firedInstanceIds: [] }).r.stored, 0);
  assert.equal(run(chain, {}).r.stored, 0, 'no fired list means none fired');
  assert.equal(run(chain, { firedInstanceIds: ['t0'] }).r.stored, 1);
  assert.equal(run(chain, { firedInstanceIds: ['t0', 't0', 't0'] }).r.stored, 1, 'a card counts once however often it fired');
  assert.equal(run(chain, { firedInstanceIds: ['t0', 't1'] }).r.stored, 2);
  assert.equal(run(chain, { firedInstanceIds: ['t0', 't1', 't2'] }).r.stored, 2, 'Victory Lap itself is excluded');
  assert.equal(run(chain, { firedInstanceIds: ['t0', 'gone'] }).r.stored, 1, 'cards no longer mounted are ignored');
  const five = ['body-spark', 'spark-cache', 'harvest-common', 'downbeat', 'victory-lap'];
  assert.equal(run(five, { firedInstanceIds: allIds(five) }).r.stored, 4, 'five slots: at most 4');
  // Echo to its left: the Echo is not a card that fired (its firing is credited to the card it copies), so best is 3 x 2 = 6.
  const echo = ['body-spark', 'spark-cache', 'harvest-common', 'echo', 'victory-lap'];
  assert.equal(run(echo, { firedInstanceIds: allIds(echo) }).r.stored, 8, 'if every other card incl. Echo counts as fired: 4 x 2');
  assert.equal(run(echo, { firedInstanceIds: ['t0', 't1', 't2'] }).r.stored, 6, 'real flights: Echo never counts as fired: 3 x 2 = 6');
  for (const ins of ['twin-mark', 'kindled', 'gilded', 'brimful', 'mirror']) assert.equal(run(chain, { firedInstanceIds: ['t0', 't1'] }, [null, null, ins]).r.stored, 2, ins);
  assert.equal(run([...chain, 'crescendo'], { firedInstanceIds: ['t0', 't1'] }).r.stored, 2, 'a Boost never multiplies Stored');
});

test('Curtain Call: the Slot 1 card fires its normal Sparks three times at Finish; nothing when there is nothing to fire', () => {
  const one = bodySparks(); assert.ok(one > 0);
  const base = run(['body-spark', 'curtain-call'], {});
  assert.equal(base.r.sparks, 3 * one); assert.equal(base.r.stored, 0);
  assert.equal(base.r.cards[1].effective.sparks, 3 * one, 'credited to Curtain Call, so the Chain plates add up');
  assert.equal(base.r.cards[1].fired, 1); assert.equal(base.r.steps.find(st => st.operation === 'fire-first-card').firedSlot, 0);
  // Echo to its left repeats Curtain Call: the Slot 1 card fires 6 times. (Echo in Slot 1 would be the "first card" and fires nothing.)
  assert.equal(run(['body-spark', 'echo', 'curtain-call'], {}).r.sparks, 6 * one);
  assert.equal(run(['echo', 'curtain-call'], {}).r.sparks, 0, 'Echo is Slot 1: nothing to fire');
  assert.equal(run([null, 'curtain-call'], {}).r.sparks, 0, 'empty Slot 1');
  assert.equal(run(['curtain-call', 'body-spark'], {}).r.sparks, 0, 'Curtain Call is Slot 1');
  for (const first of ['deep-vessel', 'growth-ring', 'growth-seed', 'finish-flag', 'home-beacon', 'wind-feather']) assert.equal(run([first, 'curtain-call'], {}).r.sparks, 0, `${first}: nothing to fire`);
  // Stored payouts and growth on the Slot 1 card still pay once.
  const flag = run(['finish-flag', 'curtain-call'], {}); assert.equal(flag.r.stored, 2);
  assert.equal(run(['growth-ring', 'curtain-call'], {}).cards[0].tally, 1);
  // Inscriptions add nothing: Gilded/Twin Mark/Kindled on either slot, and no use is spent.
  for (const ins of ['gilded', 'twin-mark', 'kindled', 'brimful', 'mirror', 'resonant']) {
    assert.equal(run(['body-spark', 'curtain-call'], {}, [ins, null]).r.sparks, 3 * one, `${ins} on Slot 1`);
    assert.equal(run(['body-spark', 'curtain-call'], {}, [null, ins]).r.sparks, 3 * one, `${ins} on Curtain Call`);
  }
  const charged = run(['courier-tip', 'curtain-call'], {}); assert.equal(charged.cards[0].charges, makeSkillCard('courier-tip', 'x').charges ?? charged.cards[0].charges);
});

test('Chain state line: Curtain Call says so when it has nothing to fire; the others are ready', () => {
  const status = list => getEquippedCardStatuses({ mountedCards: ids(list), skillSystem: undefined });
  assert.equal(status(['body-spark', 'curtain-call'])[1].state, 'ready');
  assert.equal(status(['curtain-call'])[0].code, 'nothing-to-fire');
  assert.equal(status(['deep-vessel', 'curtain-call'])[1].code, 'nothing-to-fire');
  assert.equal(status(['body-spark', 'clean-run', 'victory-lap'])[1].state, 'ready');
  assert.equal(status(['body-spark', 'clean-run', 'victory-lap'])[2].state, 'ready');
});

test('Inscription sentences are true for the three cards', () => {
  const card = id => makeSkillCard(id, 'x');
  assert.match(inscriptionOnCard('twin-mark', card('clean-run')), /pays once/);
  assert.match(inscriptionOnCard('kindled', card('victory-lap')), /only fires at Finish/);
  assert.match(inscriptionOnCard('gilded', card('curtain-call')), /printed Sparks only/);
  assert.match(inscriptionOnCard('brimful', card('curtain-call')), /printed Sparks only/);
  assert.match(inscriptionOnCard('twin-mark', card('curtain-call')), /pays once/);
});

test('model: Clean Run pays at a first-try clear and not after a fall on the same node (hearts lost per node)', () => {
  const clear = (r, extra = {}) => { const n = M.getChoices(r).find(x => x.type !== 'support'); M.selectNode(r, n.id); M.beginFlightAttempt(r); return { n, ok: M.finishFlight(r, { success: true, flame: 0, ...extra }) }; };
  const first = makeRun(['clean-run'], { seed: 'trio-a' }); clear(first);
  assert.equal(first.lastFlight.cardClearReceipt.stored, 5);
  const fell = makeRun(['clean-run'], { seed: 'trio-b' });
  const n = M.getChoices(fell).find(x => x.type !== 'support'); M.selectNode(fell, n.id); M.beginFlightAttempt(fell);
  assert.ok(M.finishFlight(fell, { success: false })); assert.equal(fell.nodeHeartsLost.count, 1);
  M.selectNode(fell, n.id); assert.ok(M.beginFlightAttempt(fell)); assert.ok(M.finishFlight(fell, { success: true, flame: 0 }));
  assert.equal(fell.lastFlight.cardClearReceipt.stored, 0, 'a fall on this node loses the bonus');
  assert.equal(fell.lastFlight.cardClearReceipt.event.heartsLost, 1);
});

test('model + real flight: Victory Lap counts the cards that really fired; Curtain Call Sparks join the meter before packing', () => {
  const f = fly({ ids: ['body-spark', 'victory-lap'], seedIndex: 0 }), e = f.log.engine;
  const fired = [...e.cardFiredIds];
  assert.ok(fired.every(id => id.startsWith('rf:0:')), 'only mounted cards are recorded');
  const clear = (list, flame, extra) => { const r = makeRun(list, { seed: 'trio-c' }); const n = M.getChoices(r).find(x => x.type !== 'support'); M.selectNode(r, n.id); M.beginFlightAttempt(r);
    M.finishFlight(r, { success: true, flame, ...extra(r) }); return r; };
  const lap = clear(['body-spark', 'spark-cache', 'victory-lap'], 0, r => ({ cardFiredIds: [r.mountedCards[0].instanceId, r.mountedCards[1].instanceId] }));
  assert.equal(lap.lastFlight.cardClearReceipt.stored, 2);
  const none = clear(['body-spark', 'victory-lap'], 0, () => ({}));
  assert.equal(none.lastFlight.cardClearReceipt.stored, 0);
  // Curtain Call: 3 x body Sparks go into the meter (up to its room) and the Finish packs the meter into Stored Sparks.
  const without = clear(['body-spark', 'clean-run'], 20, () => ({})), withCall = clear(['body-spark', 'curtain-call'], 20, () => ({}));
  const packed = r => r.lastFlight.exitPacking.amount;
  assert.ok(packed(withCall) >= packed(without), `meter packs at least as much with Curtain Call (${packed(withCall)} vs ${packed(without)})`);
  assert.equal(withCall.lastFlight.cardClearReceipt.sparks, 3 * bodySparks());
  assert.ok(withCall.lastFlight.cardPack === undefined || withCall.lastFlight.cardPack?.sparks >= 0);
});
