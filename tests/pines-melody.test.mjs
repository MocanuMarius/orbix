// Old Pines "more melody" (owner request 2026-11-18): a singing lead, 8-bar phrase + answer, entering after bar 4, about -6 dB under the plucked lead.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PIECES, pieceById, compilePiece, scalePcs, noteName, SING_VELOCITY} from '../dist/music-score.mjs';
import {INSTRUMENTS} from '../dist/music-synth.mjs';

const pines = pieceById('pines'), compiled = compilePiece(pines), sing = compiled.events.filter(e => e.part === 'sing');
const B = compiled.barBeats;

test('the melody notes are all in the key of G major and the voice enters after the first four bars', () => {
  assert.ok(sing.length > 60);
  const scale = new Set(scalePcs(pines));
  for (const e of sing) assert.ok(scale.has(e.midi % 12), `${noteName(e.midi)} is outside G major`);
  assert.ok(Math.min(...sing.map(e => e.beat)) >= 4 * B, 'enters at bar 5 or later');
  assert.ok(Math.min(...sing.map(e => e.midi)) >= 62 && Math.max(...sing.map(e => e.midi)) <= 84, 'singable range');
  // 8-bar phrase, then its answer: the second differs from the first in its second half only.
  const bars = (from, to) => sing.filter(e => e.beat >= from * B && e.beat < to * B).map(e => [Math.round((e.beat - from * B) * 4) / 4, e.midi]);
  const first = bars(4, 12), answer = bars(12, 20);
  assert.equal(first.length > 0 && answer.length > 0, true);
  assert.deepEqual(first.filter(([b]) => b < 16).map(([, m]) => m), answer.filter(([b]) => b < 16).map(([, m]) => m));
  assert.notDeepEqual(first.map(([, m]) => m), answer.map(([, m]) => m));
});

test('the loop length is unchanged and the melody never runs past the piece', () => {
  assert.equal(compiled.totalBars, 64); assert.equal(compiled.totalBeats, 256);
  for (const e of sing) assert.ok(e.beat + e.dur <= compiled.totalBeats + 1e-9);
  const others = compiled.events.filter(e => e.part !== 'sing');
  assert.ok(others.length > 500);
  for (const p of PIECES) if (p.id !== 'pines') assert.equal(compilePiece(p).events.some(e => e.part === 'sing'), false, `${p.id} untouched`);
});

test('the singing lead sits about 6 dB under the plucked lead and the mix peak stays below 1.0', () => {
  const amp = e => e.vel * INSTRUMENTS[e.inst].gain, leadPeak = Math.max(...compiled.events.filter(e => e.part === 'lead').map(amp)), singPeak = Math.max(...sing.map(amp));
  const db = 20 * Math.log10(singPeak / leadPeak);
  assert.ok(db <= -5.5 && db >= -8, `lead is ${db.toFixed(1)} dB under the plucked lead`);
  assert.equal(SING_VELOCITY, .5);
  // Additive render of the whole loop at 4 kHz: every partial of every note with the synth's own envelope, summed before the master chain.
  const sr = 4000, sec = compiled.duration, beatSec = compiled.beatSec, n = Math.ceil((sec + 4) * sr), buf = new Float32Array(n);
  for (const e of compiled.events) {
    const spec = INSTRUMENTS[e.inst]; if (!spec) continue;
    const t0 = e.beat * beatSec, off = t0 + Math.max(spec.a * 2, spec.perc ? Math.min(e.dur * beatSec, spec.decay) : e.dur * beatSec), f = 440 * 2 ** ((e.midi - 69) / 12);
    for (const [, ratio, a, decayScale] of spec.partials) {
      const fr = f * ratio; if (fr > sr / 2.2) continue;
      const tau = spec.decay * decayScale / 3, peak = spec.gain * e.vel * a, end = off + spec.r * 1.2 + .02, i0 = Math.floor(t0 * sr), i1 = Math.min(n, Math.ceil(end * sr));
      for (let i = i0; i < i1; i++) {
        const t = i / sr - t0, since = t0 + t - off;
        let env = t < spec.a ? peak * t / spec.a : peak * Math.exp(-(t - spec.a) / tau);
        if (since > 0) env *= Math.exp(-since / (spec.r / 6));
        buf[i] += env * Math.sin(2 * Math.PI * fr * t);
      }
    }
  }
  const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(peak < 1, `peak ${peak}`);
  console.log(`Old Pines sing lead: ${db.toFixed(1)} dB under the plucked lead; summed-partials peak ${peak.toFixed(3)}`);
});
