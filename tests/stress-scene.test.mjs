import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.requestAnimationFrame ??= () => 1;
globalThis.cancelAnimationFrame ??= () => {};
const writes = [];
const storage = {getItem: () => null, setItem: (k) => writes.push(k), removeItem: (k) => writes.push(k), clear: () => writes.push('*'), key: () => null, length: 0};
globalThis.localStorage = storage;

const {STRESS_SCENE, stressSceneConfig, createStressEngine, scriptStressScene, summarizeFrames, stressSummaryLine, safeBands} = await import('../dist/stress-scene.mjs');

function canvas() {
  const gradient = {addColorStop() {}};
  const context = new Proxy({globalAlpha: 1}, {get: (t, k) => t[k] ?? (String(k).includes('Gradient') ? () => gradient : () => {}), set: (t, k, v) => (t[k] = v, true)});
  return {style: {}, getContext: () => context, getBoundingClientRect: () => ({width: 924, height: 308})};
}
const fingerprint = e => JSON.stringify({obstacles: e.layout.obstacles.slice(0, 40).map(o => [Math.round(o.x), Math.round(o.center), Math.round(o.gap)]), embers: e.layout.embers.length, boss: e.layout.boss?.id, holes: e.blackHoles.items.map(h => Math.round(h.x))});

test('the stress scene builds the same course every time, with the full Chain and Inscriptions', () => {
  const a = createStressEngine(canvas()), b = createStressEngine(canvas());
  assert.equal(fingerprint(a), fingerprint(b));
  assert.deepEqual(a.cardExecution.cards.map(c => c?.cardId), STRESS_SCENE.cards);
  assert.ok(a.cardExecution.inscriptions.filter(Boolean).length >= 3, 'Inscriptions are written on the slots');
  assert.equal(a.layout.boss?.id, 'hollow-sun');
  assert.ok(a.blackHoles.items.length >= 1, 'a Black Hole is on the course');
  a.destroy(); b.destroy();
});

test('the scene flies itself through ramp, peak and tail, cannot be lost and writes no save', () => {
  writes.length = 0;
  const {run} = stressSceneConfig();
  const before = JSON.stringify(run);
  const e = createStressEngine(canvas()), script = scriptStressScene(e);
  e.start();
  const seen = new Set();
  const total = STRESS_SCENE.ramp + STRESS_SCENE.peak + STRESS_SCENE.tail;
  for (let i = 0; i < total * 60 && !e.finished; i++) { e.step(1 / 60); seen.add(script.phase()); }
  assert.ok(e.time >= total - .05 || e.finished, `reached the end (t=${e.time.toFixed(1)})`);
  assert.equal(e.dying, false);
  assert.ok(seen.has('ramp') && seen.has('peak') && seen.has('tail'));
  assert.ok(script.stats.flares >= 8, `Flares fired: ${script.stats.flares}`);
  assert.ok(script.stats.pulses >= 100, `card Pulses: ${script.stats.pulses}`);
  assert.ok(script.stats.lifts >= 50, `Lifts: ${script.stats.lifts}`);
  assert.equal(script.stats.error, undefined);
  assert.deepEqual(writes, [], 'no storage writes');
  assert.equal(JSON.stringify(stressSceneConfig().run), before);
  e.destroy();
});

test('the result object has the reported numbers and a one-line summary', () => {
  const gaps = [...Array(990).fill(16.7), ...Array(8).fill(40), 60, 120];
  const s = summarizeFrames(gaps);
  assert.equal(s.frames, 1000); assert.equal(s.over33, 10); assert.equal(s.over50, 2); assert.equal(s.longestMs, 120);
  assert.ok(s.avgFps > 55 && s.avgFps < 60); assert.ok(s.low1Fps < 25); assert.equal(s.minFps, 8.3);
  const line = stressSummaryLine({scene: 'stress-v1', ...s, phases: {peak: s}, renderer: 'WebGL lighting', dpr: 2.625, viewport: '924x308', version: 'x'});
  assert.match(line, /stress-v1 .* fps avg .* WebGL lighting .* 924x308/);
  assert.deepEqual(summarizeFrames([]).frames, 0);
});

test('safe bands leave the open passage between rock', () => {
  const floor = [[0, 300], [100, 300], [100, 620], [0, 620]], roof = [[0, 0], [100, 0], [100, 200], [0, 200]];
  const bands = safeBands([floor, roof], 50, 620, 10);
  assert.equal(bands.length, 1); assert.ok(bands[0][0] >= 210 && bands[0][1] <= 290);
});

test('Settings > Advanced offers the Stress test next to Show FPS, and ?scene=stress opens it', () => {
  const app = fs.readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  assert.match(app, /data-action="show-fps"[^`]*data-action="stress-test"/);
  assert.match(app, /openStressSceneFromUrl/);
});
