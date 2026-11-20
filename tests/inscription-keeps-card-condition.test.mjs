// "Inscription Courier doesn't seem to work with Flare Bank" (2026-11-20): it works, but only with the meter at 1/3 or less; the sentence now says so.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fly, sum, BIOME_LEVELS } from '../scripts/balance/real-flight-check.mjs';
import { inscriptionOnCard } from '../dist/inscription-on-card.mjs';
import { makeSkillCard } from '../dist/skill-cards.mjs';

test('Courier on Flare Bank says the meter condition stays', () => {
  const text = inscriptionOnCard('courier', makeSkillCard('flash-bank', 'x'));
  assert.match(text, /also fires on a Delivery and every 3rd Collect: \+8 Sparks \(only with the meter ⅓ or less\)/);
  assert.doesNotMatch(inscriptionOnCard('courier', makeSkillCard('courier-tip', 'y')), /only with/);
});

test('real flights: Flare Bank in a Courier slot pays on every Delivery made with the meter at 1/3 or less, and still on Flares', () => {
  const lowAtPickup = e => { const c = e.collect.bind(e); e.collect = p => { if (!p.collected && (p.deliveredByWisp || p.kind === 'sight' || p.kind === 'flash')) e.flame = Math.min(e.flame, e.maxFlame * .2); return c(p); }; };
  const fl = [0, 8].flatMap(i => [0, 1].map(seedIndex => fly({ ids: ['flash-bank'], inscriptions: ['courier'], levelId: BIOME_LEVELS[i].id, seedIndex, duration: 90, flare: true, hook: lowAtPickup })));
  const deliveries = sum(fl, f => Object.values(f.log.occurred.delivery).reduce((a, b) => a + b, 0));
  assert.ok(deliveries >= 3);
  assert.equal(sum(fl, f => f.log.slots[0]?.byKind['collector-delivery'] || 0), deliveries);
  assert.equal(sum(fl, f => f.log.slots[0]?.byKind['flash-pickup'] || 0), sum(fl, f => f.log.occurred.flares));
});
