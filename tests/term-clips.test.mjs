// Glossary gameplay clips (docs/term-clips.md): files exist and are small, the dialog shows the clip before the text with a
// no-video fallback, and the clips stay out of the offline (PWA) list.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARD_TERMS, TERM_CLIP_LINES, termClipFor, termClipMarkup, termSectionMarkup} from '../dist/card-terms.mjs';
import {TERM_CLIPS, MAX_BYTES} from '../scripts/term-clip-scenarios.mjs';
import {playerGraph} from '../scripts/pwa-assets.mjs';

const dist = new URL('../dist/', import.meta.url);
const keys = Object.keys(TERM_CLIP_LINES);

test('every declared clip has a file and a poster under the size limit, and a scenario', () => {
  assert.ok(keys.length >= 14);
  assert.deepEqual([...keys].sort(), TERM_CLIPS.map(c => c.term).sort(), 'declared clips and recorded scenarios match');
  for (const key of keys) {
    assert.ok(CARD_TERMS[key], `${key} is a glossary term`);
    const clip = termClipFor(key);
    const mp4 = fs.statSync(new URL(clip.src.replace('./', ''), dist)), poster = fs.statSync(new URL(clip.poster.replace('./', ''), dist));
    assert.ok(mp4.size > 1000 && mp4.size <= MAX_BYTES, `${key}.mp4 is ${mp4.size} bytes`);
    assert.ok(poster.size > 500 && poster.size < 60000, `${key} poster is ${poster.size} bytes`);
    assert.ok(TERM_CLIP_LINES[key][0].length <= 90, `${key}: one short line`);
  }
});

test('the dialog puts the clip before one short line, longer text under More details', () => {
  for (const key of keys) {
    const html = termSectionMarkup(key, {});
    const video = html.indexOf('<video'), line = html.indexOf('card-term-short'), more = html.indexOf('<details');
    assert.ok(video > 0 && video < line && line < more, `${key}: clip, line, details`);
    assert.match(html, /<video [^>]*muted loop playsinline[^>]*autoplay/);
    assert.match(html, /poster="\.\/assets\/terms\/[\w-]+\.webp"/);
    assert.ok(html.indexOf('card-term-long') > more, `${key}: the long text is inside More details`);
  }
});

test('reduced motion: no autoplay, a play button over the poster', () => {
  const reduced = termClipMarkup('flash', {reducedMotion: true}), normal = termClipMarkup('flash');
  assert.ok(!/autoplay/.test(reduced)); assert.ok(!/ hidden>/.test(reduced));
  assert.ok(/autoplay/.test(normal)); assert.match(normal, /card-term-clip-play"[^>]* hidden/);
});

test('a term without a clip keeps the text-only layout; no-video fallback code removes a broken box', () => {
  const plain = termSectionMarkup('round', {});
  assert.ok(!plain.includes('<video') && plain.includes('card-term-definition'));
  const source = fs.readFileSync(new URL('card-terms.mjs', dist), 'utf8');
  assert.match(source, /addEventListener\('error'/); assert.match(source, /figure\.remove\(\)/); assert.match(source, /replaceWith\(poster\)/);
});

test('clips and posters are not in the offline list', async () => {
  const {files} = await playerGraph(dist);
  assert.ok(files.includes('card-terms.mjs'));
  assert.deepEqual(files.filter(f => f.startsWith('assets/terms/')), []);
});
