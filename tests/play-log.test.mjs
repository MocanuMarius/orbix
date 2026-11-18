// Local play recorder: pure encode/decode, the 300-line ring buffer, the off switch, and one real simulated flight.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encodeFlight, decodeFlight, parseLog, appendLine, readLines, clearLog, exportText, countFlights, shortCode, codeTable, seedCode,
  loadRecordPlay, saveRecordPlay, FlightRecorder, HEADER, INT_FIELDS, PLAY_LOG_MAX, PLAY_LOG_KEY } from '../dist/play-log.mjs';
import { fly } from '../scripts/balance/real-flight-check.mjs';

const memory = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const sample = {
  version: 'guide-clarity-1', course: 'reed-channel', stop: 1, map: 2, row: 9, seed: seedCode('run-7-node-9'), cards: ['lift-guide', null, 'body-spark', 'wind-feather', 'harvest-rare'],
  inscriptions: ['kindled', null, 'gilded', null, null], result: 1, cause: 4, dur: 523, heartsStart: 3, heartsLost: 1, meterStart: 60, meterEnd: 0,
  lifts: 88, liftsCue: 41, liftsQuick: 6, liftsRefused: 2, gapMed: 8, gap90: 17, glide: 5, minMeter: 0, secLow: 11, sparksSeen: 30, wisp: 14, collector: 6, deliveries: 6,
  skims: 3, overfills: 1, pulses: 4, flares: 1, cardSparks: 22, stored: 9, dist: 61, gap: [1, 12, 30, 20, 9, 5, 4, 2], err: [0, 1, 4, 10, 14, 8, 3, 1], meter: [3, 8, 20, 12, 9]
};

test('encode/decode round trip returns named fields', () => {
  const line = encodeFlight(sample);
  const rec = decodeFlight(line, { cardCodes: codeTable(['lift-guide', 'body-spark', 'wind-feather', 'harvest-rare']), inscriptionCodes: codeTable(['kindled', 'gilded']), courseCodes: codeTable([sample.course], 3) });
  for (const name of INT_FIELDS) assert.equal(rec[name], Math.round(sample[name]), name);
  assert.deepEqual(rec.gap, sample.gap); assert.deepEqual(rec.err, sample.err); assert.deepEqual(rec.meter, sample.meter);
  assert.deepEqual(rec.cards, sample.cards); assert.deepEqual(rec.inscriptions, ['kindled', null, 'gilded']);
  assert.equal(rec.version, 'guide-clarity-1'); assert.equal(rec.course, 'reed-channel');
  assert.equal(rec.resultName, 'fell'); assert.equal(rec.causeName, 'obstacle'); assert.equal(rec.stopName, 'elite');
  assert.ok(HEADER.startsWith('#orbix-play-log v1'));
  assert.equal(decodeFlight('nonsense'), null);
  assert.equal(parseLog(`${HEADER}\n${line}\n\n${line}`).length, 2);
});

test('a flight line stays small and card codes do not collide', () => {
  assert.ok(Buffer.byteLength(encodeFlight(sample)) <= 170, String(Buffer.byteLength(encodeFlight(sample))));
  const levels = [...fs.readFileSync(new URL('../dist/level-catalog.mjs', import.meta.url), 'utf8').matchAll(/id:\s*['"]([a-z0-9-]+)['"]/g)].map(m => m[1]);
  assert.equal(Object.keys(codeTable([...new Set(levels)], 3)).length, new Set(levels).size, 'every course has its own 3-char code');
  const ids = [...fs.readFileSync(new URL('../dist/card-catalog.mjs', import.meta.url), 'utf8').matchAll(/\bid:\s*['"]([a-z0-9-]+)['"]/g)].map(m => m[1]);
  assert.ok(ids.length > 50);
  assert.equal(Object.keys(codeTable([...new Set(ids)])).length, new Set(ids).size, 'every id has its own code');
});

test('the ring buffer keeps the last 300 lines and clear empties it', () => {
  const s = memory();
  for (let i = 0; i < PLAY_LOG_MAX + 25; i++) appendLine(`${i.toString(36)}.x/v/c//`, s);
  const lines = readLines(s);
  assert.equal(lines.length, 300); assert.equal(lines[0], `${(25).toString(36)}.x/v/c//`); assert.equal(countFlights(s), 300);
  assert.ok(exportText(s).startsWith(HEADER));
  clearLog(s); assert.equal(countFlights(s), 0); assert.equal(exportText(s), '');
});

test('the switch is off by default and stored under its own key', () => {
  const s = memory();
  assert.equal(loadRecordPlay(s), false);
  saveRecordPlay(true, s); assert.equal(loadRecordPlay(s), true);
  saveRecordPlay(false, s); assert.equal(loadRecordPlay(s), false);
  assert.ok(![...s.m.keys()].includes('wispbound-save'));
});

test('switch off: a real flight builds no recorder, touches no counters and stores nothing', () => {
  const s = memory(); let calls = 0;
  const f = fly({ ids: ['body-spark'], engineOptions: { onPlayRecord: () => { calls++; appendLine('x', s); } } });
  assert.equal(f.log.engine.rec, null); assert.equal(calls, 0); assert.equal(countFlights(s), 0);
  assert.equal(s.m.has(PLAY_LOG_KEY), false);
});

test('switch on: a real flight records Lifts, Sparks and the result that match the flight itself', () => {
  const lines = [];
  const f = fly({ ids: ['lift-guide', 'body-spark'], engineOptions: { recordPlay: true, recordVersion: 'test-1', onPlayRecord: rec => lines.push(encodeFlight(rec)) } });
  assert.equal(lines.length, 1);
  const rec = decodeFlight(lines[0]), e = f.log.engine;
  assert.equal(rec.lifts, e.flaps); assert.ok(rec.lifts > 20);
  assert.equal(rec.wisp, e.bodyPickups); assert.equal(rec.collector, e.collectorPickups);
  assert.equal(rec.resultName, f.record.success ? 'cleared' : (rec.heartsStart > 1 ? 'fell' : 'died'));
  assert.equal(rec.heartsLost, f.record.success ? 0 : 1);
  assert.equal(rec.version, 'test-1'); assert.equal(rec.map, 0);
  assert.ok(rec.sparksSeen >= rec.wisp, 'every Spark the Wisp took had come on screen');
  assert.ok(rec.liftsCue <= rec.lifts && rec.liftsQuick <= rec.lifts && rec.liftsRefused >= 0);
  assert.equal(rec.gap.reduce((a, b) => a + b, 0), rec.lifts - 1, 'one gap between each pair of Lifts');
  assert.ok(rec.err.reduce((a, b) => a + b, 0) <= rec.lifts);
  assert.ok(rec.meter.reduce((a, b) => a + b, 0) >= Math.floor(rec.dur / 10) - 2, 'Meter sampled about once a second');
  assert.ok(rec.skims === (e.edgingPulse.triggerCount || 0));
  assert.ok(rec.dist >= 0 && rec.dist <= 100);
  assert.ok(Buffer.byteLength(lines[0]) <= 170, `${Buffer.byteLength(lines[0])} bytes`);
});

test('gap median and 90th percentile come from the fixed histogram', () => {
  const r = new FlightRecorder();
  for (const t of [1, 1.6, 2.2, 2.8, 3.4, 4, 6]) r.lift(t, null);
  const end = r.finish({ result: 0, time: 8, meterEnd: 0, wisp: 0, collector: 0, skims: 0, stored: 0, distancePct: 100 });
  assert.ok(Math.abs(end.gapMed / 10 - .6) < .06, `median ${end.gapMed}`);
  assert.ok(end.gap90 / 10 >= 1.9 && end.gap90 / 10 <= 2.1, `p90 ${end.gap90}`);
  assert.equal(end.gap.reduce((a, b) => a + b, 0), 6);
});

test('the analysis script decodes and summarises a recorded flight', async () => {
  const { summarize, flightTable, summaryTable, loadCodes } = await import('../scripts/balance/play-log.mjs');
  const lines = [];
  fly({ ids: ['lift-guide', 'body-spark'], engineOptions: { recordPlay: true, recordVersion: 'test-1', onPlayRecord: rec => lines.push(encodeFlight(rec)) } });
  const flights = parseLog(`${HEADER}\n${lines.join('\n')}`, await loadCodes());
  assert.equal(flights.length, 1); assert.deepEqual(flights[0].cards.filter(Boolean), ['lift-guide', 'body-spark']);
  assert.ok(flights[0].course && !/^[0-9a-z]{3}$/.test(flights[0].course) || flights[0].course.length > 3, 'course code resolved to an id');
  const s = summarize(flights);
  assert.equal(s.flights, 1); assert.ok(s.liftsPerSec > 0);
  assert.ok(flightTable(flights).includes('lift-guide')); assert.ok(summaryTable([['real', s]]).includes('Lifts per second'));
  const { BIOME_LEVELS } = await import('../dist/biomes.mjs');
  const ids = [...new Set(BIOME_LEVELS.map(l => l.id))];
  assert.equal(Object.keys(codeTable(ids, 3)).length, ids.length, 'biome course codes do not collide');
});
