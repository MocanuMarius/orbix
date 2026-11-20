// Timer works by itself, Finish pays by how the flight went (2026-11-20, owner-approved fix set from outputs/balance/archetypes.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_CARDS, makeSkillCard, createCardExecution, resolveCardRow, CARD_ROW_EVENTS } from '../dist/skill-cards.mjs';
import { CardEngine, simulateEngineChain, findEngineLoop, createMeterHost } from '../dist/card-engine.mjs';
import { engineStats } from '../dist/ui/chain-model.mjs';
import { faceEffect } from '../dist/card-face-lines.mjs';
import { cardTileLine } from '../dist/card-tile-lines.mjs';
import { drawSkillCard } from '../dist/skill-cards.mjs';

const row = ids => ids.map((id, i) => id ? makeSkillCard(id, `x${i}`) : null);
const turnsAt = run => run.engine.turnLog;

test('Slow Wick relights itself 5 s after every firing, with no Pulse to feed it', () => {
  const run = simulateEngineChain(row(['slow-wick']), { horizon: 30 });
  assert.deepEqual(turnsAt(run), [5, 10, 15, 20, 25, 30]);
  assert.equal(run.running, true, 'still burning');
});

test('Long Fuse relights itself every 5 s, even with nothing to repeat', () => {
  const run = simulateEngineChain(row(['long-fuse']), { horizon: 30 });
  assert.deepEqual(turnsAt(run), [5, 10, 15, 20, 25, 30]);
});

test('a Pulse a Wick hears never makes it fire faster than its own period', () => {
  // A Pulse is delivered to the Wick every half second, the way a card-sent Pulse reaches it.
  const cards = row(['spark-chime', 'slow-wick']);
  const runtime = createCardExecution(cards), host = createMeterHost({ start: 0, max: Infinity }); host.runtime = runtime;
  const engine = new CardEngine(runtime, host); engine.takeOff(0, { flare: false });
  for (let t = 0.5; t <= 30; t += 0.5) { engine.advance(t); engine.queue.push({ type: 'pulse', to: 1, from: -1, mask: 0, turn: engine.turn }); engine.flush(); }
  assert.ok(engine.log.filter(x => x.k === 'already-waiting').length > 20, 'the Wick heard them and ignored them while burning');
  engine.advance(30);
  const t = engine.turnLog;
  for (let i = 1; i < t.length; i++) assert.ok(t[i] - t[i - 1] >= 5 - 1e-6, `gap ${t[i] - t[i - 1]}`);
  assert.equal(t.length, 6);
});

test('the Chain tab simulation shows Slow Wick, Long Fuse and Wave Loom alone as repeating, not "runs once"', () => {
  for (const id of ['slow-wick', 'long-fuse', 'wave-loom']) {
    assert.equal(findEngineLoop(row([id])).runsOnce, false, id);
    const stats = engineStats(row([id]));
    assert.equal(stats.runsOnce, false, id);
    assert.ok(stats.turnsPer10s > 0, `${id} turns per 10 s ${stats.turnsPer10s}`);
  }
  assert.equal(findEngineLoop(row(['spark-chime'])).runsOnce, true, 'a Chain with no Timer still runs once');
  assert.ok(Math.abs(engineStats(row(['slow-wick'])).turnsPer10s - 10 / 5) < 0.01);
  assert.ok(Math.abs(engineStats(row(['wave-loom'])).turnsPer10s - 10 / 6) < 0.01);
});

test('Third Beat is Common, and Timer card text says how often they fire', () => {
  assert.equal(SKILL_CARDS['third-beat'].rarity, 'common');
  assert.equal(drawSkillCard({ campaignSeed: 'x', mapIndex: 0 }, 'frequency', { id: 'n' }, 'common') !== null, true);
  assert.equal(faceEffect(makeSkillCard('slow-wick', 'a'), SKILL_CARDS['slow-wick']), 'Every 5 s: a Pulse');
  assert.equal(faceEffect(makeSkillCard('long-fuse', 'a'), SKILL_CARDS['long-fuse']), 'Every 5 s: fires again');
  assert.equal(cardTileLine(makeSkillCard('slow-wick', 'a')), 'Every 5 s: a Pulse');
  for (const id of ['slow-wick', 'long-fuse']) assert.match(SKILL_CARDS[id].help, /by itself/);
});

const clear = (ids, event) => { const rt = createCardExecution(row(ids)); const r = resolveCardRow(rt, { kind: CARD_ROW_EVENTS.clear, ...event }); return { r, rt }; };

test('Home Beacon pays +3 Stored per heart left plus +1 per full 10 Sparks in the Meter at the clear', () => {
  assert.equal(clear(['home-beacon'], { heartsLeft: 3, meterSparks: 0 }).r.stored, 9);
  assert.equal(clear(['home-beacon'], { heartsLeft: 3, meterSparks: 9 }).r.stored, 9, 'rounded down');
  assert.equal(clear(['home-beacon'], { heartsLeft: 3, meterSparks: 10 }).r.stored, 10);
  assert.equal(clear(['home-beacon'], { heartsLeft: 3, meterSparks: 25 }).r.stored, 11);
  assert.equal(clear(['home-beacon'], { heartsLeft: 1, meterSparks: 60 }).r.stored, 9);
  assert.equal(clear(['home-beacon', 'prism-lens'], { heartsLeft: 3, meterSparks: 25 }).r.stored, 11, 'a Boost never multiplies Stored Sparks');
});

test('Victory Lap: a card counts once, plus once more per full 15 firings it made; Victory Lap itself never counts', () => {
  const ids = row(['body-spark', 'toll-bell', 'victory-lap']);
  const rt = createCardExecution(ids);
  const [a, b, lap] = ids.map(c => c.instanceId);
  const pay = (firedCounts, firedInstanceIds = [a, b, lap]) => resolveCardRow(createCardExecution(ids), { kind: CARD_ROW_EVENTS.clear, firedInstanceIds, firedCounts }).stored;
  assert.equal(pay({ [a]: 1, [b]: 1, [lap]: 40 }), 2, 'one each; the Lap itself is left out whatever it fired');
  assert.equal(pay({ [a]: 9, [b]: 1 }), 2);
  assert.equal(pay({ [a]: 10, [b]: 1 }), 2, '10 firings is not yet a full 15');
  assert.equal(pay({ [a]: 14, [b]: 1 }), 2);
  assert.equal(pay({ [a]: 15, [b]: 1 }), 3, '15 firings = 2');
  assert.equal(pay({ [a]: 30, [b]: 1 }), 4, '30 firings = 3');
  assert.equal(pay({ [a]: 30, [b]: 25 }), 3 + 2);
  assert.equal(pay({}, [a]), 1, 'no count known: once');
  assert.ok(rt.cards.length);
});

test('every live Finish card says it fires once, when you clear, and Boost wording stays true', () => {
  const live = Object.values(SKILL_CARDS).filter(d => d.trigger === 'clear' && !d.retired && !d.unreleased);
  assert.ok(live.length >= 8);
  for (const d of live) {
    const c = makeSkillCard(d.id, 'z');
    assert.match(d.help, /Fires once, when you clear the flight\./, d.id);
    if (d.id !== 'curtain-call') assert.match(d.help, /Boosts do not change it\./, d.id);
    else assert.match(d.help, /Boosts to its right strengthen those Sparks/, 'Curtain Call fires Sparks, so Boosts do apply: the card says so');
    assert.match(faceEffect(c, d), /^Once: /, d.id);
    assert.ok(faceEffect(c, d).length <= 34, `${d.id} face ${faceEffect(c, d)}`);
    assert.ok(cardTileLine(c).length <= 22, `${d.id} tile "${cardTileLine(c)}"`);
    assert.doesNotMatch(`${d.help} ${faceEffect(c, d)}`, /\bTurn\b/);
  }
});

test('Timer ring: one ring per Timer card in the in-flight strip, animated by the engine wait and paused with the flight', async () => {
  const { readFile } = await import('node:fs/promises');
  const js = await readFile(new URL('../dist/card-row-feedback.mjs', import.meta.url), 'utf8'), css = await readFile(new URL('../dist/card-ui.css', import.meta.url), 'utf8');
  assert.match(js, /cardEngine\?\.timers/); assert.match(js, /anim\.pause\(\)/); assert.match(js, /snapshot\?\.paused/);
  assert.match(css, /\.chain-strip \.chain-ring\{/); assert.match(css, /@property --p/); assert.match(css, /chain-ring-flash/);
  assert.doesNotMatch(js.slice(js.indexOf('function rings')), /textContent|innerHTML/, 'no text in the ring');
});
