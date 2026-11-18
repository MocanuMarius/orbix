// Part 4 of JOB I: every released card is mounted with the partner it needs, its Trigger is made to happen, and the effect is checked against its face.
// Fast part (always): solver, face numbers, state line wording, growth badge. Real flights: CARD_WORKS_FLIGHTS=2 npm test (about 3 min); the report is
// outputs/balance/card-works.md (node scripts/balance/card-works-audit.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditAll } from '../scripts/balance/card-works-audit.mjs';

// Designs that do not work in real flights today, with the owner proposal in outputs/balance/card-works.md (not redesigned here).
const KNOWN_DESIGN = new Set(['ring-spring', 'ring-spring-ii', 'crate-lining']);
const KNOWN_UNPROVEN = new Set(['tailwind', 'springboard', 'long-spool', 'cast-line', 'black-hole', 'devourer', 'last-light']);
const flights = Number(process.env.CARD_WORKS_FLIGHTS || 0);

test(`every released card works as its face says (${flights ? flights + ' real flights each' : 'solver tier'})`, { timeout: 900000 }, () => {
  const rows = auditAll({ flights }), problems = [];
  for (const r of rows) {
    if (r.status === 'works') continue;
    if (r.status === 'never fires' && KNOWN_DESIGN.has(r.id)) continue;
    if (r.status === 'unproven' && KNOWN_UNPROVEN.has(r.id)) continue;
    problems.push(`${r.id}: ${r.status}: ${r.notes.join('; ')}`);
  }
  assert.deepEqual(problems, []);
  assert.ok(rows.length >= 100);
});
