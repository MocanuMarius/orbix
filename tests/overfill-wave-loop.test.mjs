// Overfill wave loop (2026-11-20): two Spark Chimes beside a Slow Wick made about 404 Overfill waves in one flight.
// Cycle: a Chime's engine gain spilled -> every third spill made an untagged Overfill Pulse -> its crossings fired the Chimes again -> more spills.
// Guard: an Overfill Pulse made by a card's spill is tagged with that card's Slot, so only cards to its right hear it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';

const levels = [0, 8].map(i => BIOME_LEVELS[i]).filter(Boolean);
const CHAINS = [
  ['slow-wick', 'spark-chime', 'spark-chime'],
  ['spark-chime', 'spark-chime', 'slow-wick'],
  ['spark-chime', 'slow-wick', 'spark-chime'],
];
for (const ids of CHAINS) {
  test(`Overfill waves stay bounded: ${ids.join(' + ')}`, () => {
    for (const l of levels) for (const seedIndex of [0, 1]) {
      const f = fly({ ids, levelId: l.id, seedIndex, engineOptions: { cardPilot: true } });
      const e = f.log.engine, log = e.cardEngine?.log || [];
      assert.ok(e.overfillWave.waves < 60, `${ids.join('+')} ${l.id}#${seedIndex}: ${e.overfillWave.waves} Overfill waves`);
      assert.equal(log.filter(x => x.k === 'halt').length, 0);
    }
  });
}
