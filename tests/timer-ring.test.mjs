// Every Timer firing shows its light ring from the wisp, even with no Pulse card to hear it (found 2026-11-20: Slow Wick alone drew none).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';

const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
const flights = ids => levels.flatMap(l => [0, 1].map(seedIndex => fly({ ids, levelId: l.id, seedIndex, flare: false, engineOptions: { cardPilot: true } })));
const logOf = f => f.log.engine.cardEngine?.log || [];
const turns = f => logOf(f).filter(x => x.k === 'turn').length;
const rings = f => f.log.pulseBySource?.['card-pulse'] || 0;

test('Slow Wick alone: one light ring per firing', () => {
  for (const f of flights(['slow-wick'])) { assert.ok(turns(f) >= 3, `fired ${turns(f)} times`); assert.equal(rings(f), turns(f)); }
});

test('Slow Wick with Spark Chime to its right: one ring and one Chime hit per firing', () => {
  for (const f of flights(['slow-wick', 'spark-chime'])) {
    assert.equal(rings(f), turns(f));
    assert.equal(logOf(f).filter(x => x.k === 'hit' && x.type === 'pulse' && x.slot === 1).length, turns(f));
  }
});

test('Slow Wick with a Pulse card to its left: one ring per firing', () => {
  for (const f of flights(['spark-chime', 'slow-wick'])) assert.equal(rings(f), turns(f));
});
