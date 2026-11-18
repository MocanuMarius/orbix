// Card works audit (2026-11-18): every released card is mounted with the minimum partner it needs and its Trigger is made to happen.
// Tiers: solver (resolveCardRow with the card's own event), real flight (fly(): did it fire, did it pay what the face says), Chain tab
// preview vs flight, state line wording, growth badge. Run: node scripts/balance/card-works-audit.mjs [--flights=2] [--only=id,id]
// Writes outputs/balance/card-works.md. Used by tests/card-works.test.mjs.
import fs from 'node:fs';
import { fly, playBeats, collectorRecovering, makeRun, M } from './real-flight-check.mjs';
import * as S from '../../dist/skill-cards.mjs';
import { faceEffect } from '../../dist/card-face-lines.mjs';
import { cardTileLine } from '../../dist/card-tile-lines.mjs';
import { resolveChain, hereLine } from '../../dist/ui/chain-model.mjs';
import { cardGrowthBadge } from '../../dist/card-ui.mjs';

const { SKILL_CARDS, LIVE_CARDS, makeSkillCard, getCardRowRule, createCardExecution, resolveCardRow, getCardModifiers } = S;
const PAYER = { 'body-spark': 'body-spark', 'wave-crossing': 'harvest-common', 'collector-delivery': 'courier-tip', 'downbeat-lift': 'downbeat', 'flash-pickup': 'flash-handling',
  'flash-expiry': 'diving-bell', 'rhythm-phrase': 'toll-bell', 'guide-lift': 'lift-guide', '*': 'body-spark' };
const nums = text => [...String(text).matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
const KEY = { 'add-sparks': 'sparks', 'add-last-payout': 'sparks', 'add-stored': 'stored', 'carried-interest': 'stored', 'add-stored-per-heart': 'stored', 'add-tally-capacity': 'futureCapacity',
  'add-cruising-speed': 'cruisingSpeed', 'shorten-recovery': 'recoverySeconds', 'shorten-reel': 'reelSeconds', 'bank-reel': 'nextReelSeconds', 'bank-recovery': 'nextRecoverySeconds', 'add-future-capacity': 'futureCapacity' };

/** The chain that gives this card its best chance, and the event that should fire it. */
export function setupFor(def) {
  const rule = getCardRowRule(def, makeSkillCard(def.id, 'a'));
  if (def.engine || !rule) return { tier: def.engine ? 'engine' : def.trigger === 'rest' ? 'rest' : 'passive', row: [def.id] };
  const ev = rule.event, row = [];
  if (ev === 'rhythm-phrase') row.push('rhythm');
  if (rule.operation === 'multiply' || rule.operation === 'add-last-payout' || rule.minimumEarlierPayers) row.push(PAYER[ev] || 'body-spark');
  row.push(def.id);
  const when = rule.when || {};
  const event = { kind: ev === '*' ? 'body-spark' : ev, pickupKind: when.pickupKind || 'light', meterFraction: when.meterAtMost ? .1 : .5,
    firstCrossing: when.firstCrossing !== false, heartsLeft: 3, lastHeart: false, carriedStored: 50, availableRecovery: 10, availableReel: 10, collectorReeling: true };
  return { tier: 'row', rule, row, event, slot: row.length - 1 };
}

function solverCheck(setup) {
  const cards = setup.row.map((id, i) => makeSkillCard(id, `a${i}`));
  const receipt = resolveCardRow(createCardExecution({ cards }), setup.event);
  const mine = receipt.cards[setup.slot], step = receipt.steps.find(s => s.slot === setup.slot && s.success);
  if (!step) return { ok: false, why: `never fires in the solver (${receipt.steps.filter(s => s.slot === setup.slot).map(s => s.skipReason).join(',')})` };
  const key = KEY[setup.rule.operation];
  return { ok: true, receipt, step, effective: key ? mine?.effective?.[key] : null, multiplier: step.multiplier };
}

function engineChain(def) {
  const hears = def.engine?.hears || [];
  if (def.engine.timer) return def.engine.timer === 'metronome' ? [def.id, 'body-spark'] : ['first-catch', def.id, 'spark-chime'];
  if (hears.includes('skim')) return ['edge-reach', def.id];
  if (['pulse', 'gain', 'overfill', 'flash-end', 'pack'].some(h => hears.includes(h))) return ['first-catch', def.id];
  return [def.id, 'spark-chime'];
}
function modifierDiff(id) {
  const a = M.getRunModifiers(makeRun([])), b = M.getRunModifiers(makeRun([id])), keys = Object.keys(b).filter(k => k !== 'cardExecution' && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  const needsNeighbour = ['echo', 'chameleon', 'refrain', 'use-doubler', 'ember-feeder', 'chameleon-two'].includes(SKILL_CARDS[id].kind);
  return { changed: keys.length > 0 || needsNeighbour, keys, note: needsNeighbour ? 'acts only with a neighbour (its own tests)' : 'none' };
}
/** A Finish is resolved by the model (finishFlight), not the flight: clear a real node with the card mounted and read the receipt. */
function clearCheck(setup) {
  const run = makeRun(setup.row, { seed: 'audit-clear' }); run.condensedGlow = 50; const n = M.getChoices(run).find(x => x.type !== 'support');
  M.selectNode(run, n.id); M.beginFlightAttempt(run); M.finishFlight(run, { success: true, flame: 60, collected: 3 });
  const r = run.lastFlight?.cardClearReceipt, step = r?.steps.find(x => x.slot === setup.slot && x.success), card = run.mountedCards[setup.slot];
  return { fired: !!step, stored: r?.stored || 0, futureCapacity: r?.futureCapacity || 0, cruisingSpeed: r?.cruisingSpeed || 0, tally: card?.tally || 0 };
}
const OWN_TESTS = { 'wave-loom': 'engine-real-flight', heartbeat: 'engine-real-flight', 'third-beat': 'engine-real-flight', momentum: 'engine-real-flight' };

export function auditCard(def, { flights = 2 } = {}) {
  const row = { id: def.id, name: def.name, tier: '', status: 'works', notes: [] };
  const card = makeSkillCard(def.id, 'x'), setup = setupFor(def);
  row.tier = setup.tier;
  const face = faceEffect(card, def), tile = cardTileLine(card);
  const bad = (status, note) => { if (row.status === 'works') row.status = status; row.notes.push(note); };
  if ((def.tallyEvent || def.tallied || def.kind === 'camp-grow' || def.kind === 'black-hole' || def.kind === 'dream') && !cardGrowthBadge(card)) bad('text mismatch', 'growth card without a badge');
  if (setup.tier === 'rest') { row.notes.push('Rest card: proven by tests/card-camp-progression.test.mjs, not flown'); return row; }
  if (setup.tier === 'passive') {
    const m = modifierDiff(def.id);
    if (def.id === 'last-light') { const f = lh => resolveCardRow(createCardExecution({ cards: [makeSkillCard('body-spark', 'a'), makeSkillCard('last-light', 'b')] }), { kind: 'body-spark', lastHeart: lh, heartsLeft: lh ? 1 : 3, meterFraction: .5, pickupKind: 'light' }).sparks; if (f(true) > f(false)) { row.notes.push(`solver: last heart ${f(false)} -> ${f(true)} Sparks`); return row; } }
    if (!m.changed) bad('unproven', `acts inside the flight through the Chain; mounting changes no run modifier, and this audit has no flight probe for it`); else row.notes.push(m.keys.length ? `changes ${m.keys.join(', ')}` : m.note);
    return row;
  }
  if (setup.tier === 'engine' && OWN_TESTS[def.id]) { row.notes.push(`governor/timer scale: real-flight test in tests/${OWN_TESTS[def.id]}.test.mjs`); return row; }
  if (setup.tier === 'engine' && !flights) return row;
  if (setup.tier === 'engine') {
    const ids = engineChain(def), slot = ids.indexOf(def.id); let fired = 0;
    for (let i = 0; i < flights; i++) { const f = fly({ ids, seedIndex: i, flare: true }); fired += (f.log.engine.cardEngine?.log || []).filter(x => ['hit', 'fired', 'gain', 'turn'].includes(x.k) && x.slot === slot).length; }
    row.chain = ids.join(' + ');
    if (!fired) bad('never fires', `no engine event for it in ${flights} flights of ${row.chain}`); else row.notes.push(`${(fired / flights).toFixed(1)} engine events per flight`);
    return row;
  }
  const sol = solverCheck(setup);
  row.chain = setup.row.join(' + ');
  if (!sol.ok) { bad('never fires', sol.why); return row; }
  const printed = nums(`${face} ${tile}`), expected = sol.multiplier ?? sol.effective;
  if (expected != null && printed.length && !printed.some(n => Math.abs(n - expected) < 1e-6 || Math.abs(n - setup.rule.amount) < 1e-6)) bad('wrong number', `face says ${printed.join('/')}, solver gives ${expected}`);
  const rowCards = setup.row.map((id, i) => makeSkillCard(id, `p${i}`));
  const ctx = resolveChain(rowCards, setup.event.kind), line = hereLine(ctx, rowCards[setup.slot]);
  if (/does not fire|no effect/i.test(line)) bad('text mismatch', `state line says "${line}"`);
  if (setup.rule.event === 'flight-clear') {
    const c = clearCheck(setup);
    if (!c.fired) bad('never fires', 'Finish receipt shows no firing'); else row.notes.push(`Finish: ${c.stored ? c.stored + ' Stored' : ''}${c.futureCapacity ? ' +' + c.futureCapacity + ' max Spark' : ''}${c.cruisingSpeed ? ' +' + c.cruisingSpeed + '% speed' : ''}${c.tally ? ' tally ' + c.tally : ''}`);
    return row;
  }
  if (!flights) return row;
  let fired = 0, paid = 0, heard = 0;
  for (let i = 0; i < flights; i++) {
    const f = fly({ ids: setup.row, seedIndex: i, flare: true, hook: setup.rule.event === 'rhythm-phrase' ? (e => playBeats(e)) : ['shorten-recovery', 'shorten-reel'].includes(setup.rule.operation) ? (e => collectorRecovering(e)) : undefined }), s = f.log.slots[setup.slot];
    heard += f.log.events[setup.rule.event === '*' ? 'body-spark' : setup.rule.event] || 0;
    if (s) { fired += s.fired; paid += s.sparks; }
  }
  if (!fired) bad('never fires', `0 firings in ${flights} real flights (${row.chain}); its Trigger reached the Chain ${heard} times; condition ${setup.rule.event}${setup.rule.when ? ' ' + JSON.stringify(setup.rule.when) : ''}`);
  else {
    row.notes.push(`${(fired / flights).toFixed(1)} firings per flight`);
    const pv = ctx.sol.receipt.cards[setup.slot]?.effective?.sparks;
    if (setup.rule.operation === 'add-sparks' && !setup.rule.when && setup.rule.event !== '*' && pv != null && Math.abs(paid / fired - pv) > .51) bad('wrong number', `Chain tab predicts ${pv} per firing, flights pay ${(paid / fired).toFixed(2)}`);
  }
  return row;
}

export function auditAll({ flights = 2, only = null } = {}) {
  return LIVE_CARDS.filter(d => !only || only.includes(d.id)).map(d => { try { return auditCard(d, { flights }); } catch (e) { return { id: d.id, name: d.name, tier: '?', status: 'audit error', notes: [String(e.message).slice(0, 160)] }; } });
}
export function toMarkdown(rows) {
  const by = {}; rows.forEach(r => (by[r.status] ||= []).push(r));
  return `# Card works audit\n\nGenerated by scripts/balance/card-works-audit.mjs. ${rows.length} released cards.\n\n| status | count |\n| --- | --- |\n${Object.entries(by).map(([k, v]) => `| ${k} | ${v.length} |`).join('\n')}\n\n| card | tier | status | chain | note |\n| --- | --- | --- | --- | --- |\n${rows.map(r => `| ${r.name} (${r.id}) | ${r.tier} | ${r.status} | ${r.chain || ''} | ${r.notes.join('; ').replace(/\|/g, '/')} |`).join('\n')}\n`;
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  const rows = auditAll({ flights: Number(arg('flights') || 2), only: arg('only')?.split(',') || null });
  fs.mkdirSync('outputs/balance', { recursive: true });
  fs.writeFileSync('outputs/balance/card-works.md', toMarkdown(rows));
  for (const r of rows) if (r.status !== 'works') console.log(r.status.padEnd(14), r.id.padEnd(20), r.notes.join('; ').slice(0, 170));
  console.log(rows.length, 'cards; works:', rows.filter(r => r.status === 'works').length);
}
