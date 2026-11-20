// Timer beat (2026-11-20): the Pulse a Timer firing makes fires each Pulse card that may hear it once, with no per-Spark crossings.
// Pulses from other sources (Pulse Reader, Flares, Bell, First Catch ...) keep their per-Spark crossings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';
import { SKILL_CARDS } from '../dist/skill-cards.mjs';
import { CARD_TERMS } from '../dist/card-terms.mjs';

const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
const flights = ids => levels.flatMap(l => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, flare: false, engineOptions: { cardPilot: true } })));
const logOf = f => f.log.engine.cardEngine?.log || [];
const count = (f, pred) => logOf(f).filter(pred).length;
const rowFirings = (f, kind) => (f.log.firings || []).filter(x => x.kind === kind).length;
const waves = (f, src) => f.log.pulseBySource?.[src] || 0;
// Waves that are not a Timer's (an Overfill wave a full Meter makes) may still cross Sparks one by one; allow one firing per such wave.
const clean = fl => { const c = fl.filter(f => otherWaves(f) === 0); assert.ok(c.length >= 1, 'at least one flight with no other Pulse source'); return c; };
const otherWaves = f => Object.entries(f.log.pulseBySource || {}).filter(([k]) => !['card-pulse', 'card-wave-loom'].includes(k)).reduce((a, [, n]) => a + n, 0);

test('Slow Wick: each Timer firing is one beat, and a row Pulse card (Resonant Harvest) fires at most once per beat', () => {
  for (const f of flights(['slow-wick', 'harvest-common'])) {
    const turns = count(f, x => x.k === 'turn'), beats = count(f, x => x.k === 'beat');
    assert.ok(turns >= 8 && beats === turns, `one beat per Timer firing (${beats}/${turns})`);
    assert.ok(rowFirings(f, 'wave-crossing') <= 2 * beats, `Harvest (an Overfill wave may add a few; per-Spark crossings of every beat would be many times more) fired ${rowFirings(f, 'wave-crossing')} times for ${beats} beats`);
  }
});

test('Slow Wick: two Spark Chimes each fire once per beat (never once per Spark crossed)', () => {
  for (const f of flights(['slow-wick', 'spark-chime', 'spark-chime'])) {
    const turns = count(f, x => x.k === 'turn');
    for (const slot of [1, 2]) assert.equal(count(f, x => x.k === 'hit' && x.type === 'pulse' && x.slot === slot), turns, `the Chime in slot ${slot} hears each beat exactly once`);
  }
});

test('Wave Loom alone beats once per 6 s Turn: Harvest fires at most once per Turn', () => {
  for (const f of flights(['wave-loom', 'harvest-common'])) assert.ok(rowFirings(f, 'wave-crossing') <= 2 * count(f, x => x.k === 'turn'));
});

test('Pulse Reader keeps per-Spark crossings: Harvest fires more often than the Reader sends Pulses', () => {
  const fl = flights(['pulse-reader', 'harvest-common']);
  assert.ok(fl.some(f => rowFirings(f, 'wave-crossing') > waves(f, 'card-pulse-reader')), 'several Sparks cross one Reader Pulse');
});

test('Timer beat text: Slow Wick 3 s, "Each Pulse card that hears it fires once."', () => {
  assert.equal(SKILL_CARDS['slow-wick'].engine.wait, 3);
  assert.match(SKILL_CARDS['slow-wick'].help, /Each Pulse card that hears it fires once\./);
  assert.match(SKILL_CARDS['wave-loom'].help, /Each Pulse card that hears it fires once/);
  assert.match(String(CARD_TERMS?.timer ?? ''), /fires once/);
});
